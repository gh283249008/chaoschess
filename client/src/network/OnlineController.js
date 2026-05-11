import { NetworkClient } from './Client.js';
import { ErrorCodes, Protocol, ProtocolVersion } from './Protocol.js';

export class OnlineController {
    constructor(app) {
        this.app = app;
        this.client = null;
        this.onlineState = {
            connected: false,
            clientId: null,
            clientToken: null,
            roomId: null,
            color: null,
            roomSnapshot: null,
            rooms: [],
            connectionPhase: 'connected',
            pendingAction: null
        };
        this.lastAppliedActionSeq = 0;
        this.lastAppliedRoomSeq = 0;
    }

    async connect(serverUrl) {
        if (this.client) {
            this.client.disconnect();
        }

        this.client = new NetworkClient(serverUrl);
        this.bindHandlers();
        await this.client.connect();
        this.onlineState.connected = true;
        this.onlineState.connectionPhase = 'connected';
        this.client.listRooms();
        this.refreshUI();
    }

    bindHandlers() {
        this.client.on('connected', msg => {
            this.onlineState.clientId = msg.payload?.clientId || msg.clientId;
            this.onlineState.clientToken = this.client?.session?.playerToken || msg.payload?.playerToken || null;
            this.onlineState.connected = true;
            this.refreshUI();
        });

        this.client.on('socket_open', () => {
            if (this.onlineState.roomId && this.onlineState.clientToken) {
                this.onlineState.connectionPhase = 'reconnecting';
                const ok = this.client.reconnectToSession();
                if (!ok) {
                    this.onlineState.connectionPhase = 'connected';
                }
            }
            this.refreshUI();
        });

        this.client.on('reconnecting', () => {
            this.onlineState.connected = false;
            this.onlineState.connectionPhase = 'reconnecting';
            this.refreshUI();
        });

        this.client.on('room_created', msg => {
            this.onlineState.roomId = msg.payload?.roomId || msg.roomId;
            this.onlineState.color = msg.payload?.color || null;
            this.onlineState.connectionPhase = 'connected';
            this.onlineState.pendingAction = null;
            this.client.requestSnapshot();
            this.refreshUI();
        });

        this.client.on('room_joined', msg => {
            this.onlineState.roomId = msg.payload?.roomId || msg.roomId;
            this.onlineState.color = msg.payload?.color || null;
            this.onlineState.connectionPhase = 'connected';
            this.onlineState.pendingAction = null;
            this.client.requestSnapshot();
            this.refreshUI();
        });

        this.client.on('reconnected', msg => {
            this.onlineState.roomId = msg.payload?.roomId || this.onlineState.roomId;
            this.onlineState.color = msg.payload?.color || this.onlineState.color;
            this.onlineState.connectionPhase = 'recovered';
            this.onlineState.connected = true;
            this.client.requestSnapshot();
            this.app.showNotification('已恢复房间会话', 'success');
            this.refreshUI();
        });

        this.client.on('room_left', () => {
            this.onlineState.roomId = null;
            this.onlineState.color = null;
            this.onlineState.roomSnapshot = null;
            this.onlineState.connectionPhase = 'connected';
            this.onlineState.pendingAction = null;
            this.lastAppliedRoomSeq = 0;
            this.client.clearSession();
            this.client.listRooms();
            this.refreshUI();
        });

        this.client.on('room_list', msg => {
            this.onlineState.rooms = msg.payload?.rooms || [];
            this.refreshUI();
        });

        this.client.on('state_sync', msg => {
            const parsed = Protocol.parseStateSync(msg);
            if (parsed.protocolVersion !== ProtocolVersion) {
                this.app.showNotification('联机协议版本不一致，可能存在同步问题', 'warning');
            }

            const nextSeq = parsed.snapshot?.seq || 0;
            const hasSnapshot = !!this.onlineState.roomSnapshot;
            if (hasSnapshot && nextSeq <= this.lastAppliedRoomSeq) {
                return;
            }

            const prevSnapshot = this.onlineState.roomSnapshot;
            this.lastAppliedRoomSeq = nextSeq;
            this.onlineState.roomSnapshot = parsed.snapshot || null;
            this.onlineState.pendingAction = null;
            const turnColor = parsed.snapshot?.roundState?.turnColor;
            if (turnColor === 'red' || turnColor === 'black') {
                this.app.currentPlayer = turnColor;
            }

            const sharedState = parsed.snapshot?.sharedState;
            if (sharedState) {
                this.app.applyRemoteSharedState(sharedState);
            }

            const actionSeq = parsed.snapshot?.lastActionSeq || 0;
            const action = parsed.snapshot?.lastAction;
            if (action && actionSeq > this.lastAppliedActionSeq) {
                this.lastAppliedActionSeq = actionSeq;
                if (action.kind === 'CANVAS_CLICK' && !sharedState) {
                    this.app.applyRemoteCanvasClick(action);
                }
            }

            const prevPhase = prevSnapshot?.roundState?.status || null;
            const nextPhase = parsed.snapshot?.roundState?.status || null;
            if (prevPhase && nextPhase && prevPhase !== nextPhase) {
                const text = nextPhase === 'buying' ? '进入购物阶段' : (nextPhase === 'playing' ? '进入对局阶段' : '当前局已结束');
                this.app.showNotification(text, 'info');
            }

            const prevTurn = prevSnapshot?.roundState?.turnColor || null;
            const nextTurn = parsed.snapshot?.roundState?.turnColor || null;
            if (prevTurn && nextTurn && prevTurn !== nextTurn) {
                this.app.showNotification(`轮到${nextTurn === 'red' ? '红方' : '黑方'}行动`, 'info');
            }

            if (this.onlineState.connectionPhase === 'recovered') {
                this.onlineState.connectionPhase = 'connected';
            }
            this.refreshUI();
        });

        this.client.on('error', msg => {
            const parsed = Protocol.parseError(msg);
            this.onlineState.pendingAction = null;
            if (parsed.code === ErrorCodes.SESSION_EXPIRED || parsed.code === ErrorCodes.ROOM_EXPIRED) {
                this.onlineState.connectionPhase = 'expired';
                this.onlineState.roomId = null;
                this.onlineState.color = null;
                this.onlineState.roomSnapshot = null;
                this.lastAppliedRoomSeq = 0;
                this.client.clearSession();
                this.client.listRooms();
            }
            const message = this.app.ui?.resolveOnlineErrorMessage(parsed.code, parsed.message) || parsed.message;
            this.app.showNotification(message, 'warning');
            this.refreshUI();
        });

        this.client.on('connection_lost', () => {
            this.onlineState.connected = false;
            this.onlineState.connectionPhase = 'reconnecting';
            this.refreshUI();
        });
    }

    createRoom() {
        if (!this.client) {
            this.app.showNotification('联机客户端未初始化', 'warning');
            return;
        }
        if (!this.onlineState.connected) {
            this.app.showNotification('联机未连接，请稍后重试', 'warning');
            return;
        }
        if (this.onlineState.roomId) {
            this.refreshUI();
            return;
        }
        this.onlineState.pendingAction = 'create_room';
        const sent = this.client.createRoom();
        if (!sent) {
            this.onlineState.pendingAction = null;
            this.app.showNotification('创建房间失败：网络未就绪', 'warning');
        }
        this.refreshUI();
    }

    joinRoom(roomId) {
        if (!this.client) {
            this.app.showNotification('联机客户端未初始化', 'warning');
            return;
        }
        const normalized = (roomId || '').trim().toUpperCase();
        if (!normalized) {
            this.app.showNotification('请输入有效房间号', 'warning');
            return;
        }
        if (!this.onlineState.connected) {
            this.app.showNotification('联机未连接，请稍后重试', 'warning');
            return;
        }
        this.onlineState.pendingAction = `join_room:${normalized}`;
        const sent = this.client.joinRoom(normalized);
        if (!sent) {
            this.onlineState.pendingAction = null;
            this.app.showNotification('加入房间失败：网络未就绪', 'warning');
        }
        this.refreshUI();
    }

    leaveRoom() {
        if (!this.client) return;
        this.client.leaveRoom();
    }

    setReady(ready) {
        if (!this.client) return;
        this.client.setReady(ready);
    }

    startMatch(mode = 'BO3') {
        if (!this.client) return;
        this.client.startMatch(mode);
    }

    switchColor() {
        if (!this.client) return;
        this.client.switchColor();
    }

    sendPlayerAction(action) {
        if (!this.client) return;
        this.client.sendGameAction(action);
    }

    refreshRooms() {
        if (!this.client) return;
        this.client.listRooms();
    }

    getState() {
        return this.onlineState;
    }

    refreshUI() {
        if (this.app.ui && typeof this.app.ui.renderOnlinePanel === 'function') {
            this.app.ui.renderOnlinePanel(this.onlineState);
        }
        if (this.app.ui && typeof this.app.ui.renderRoundShop === 'function') {
            this.app.ui.renderRoundShop();
        }
        if (this.app.ui && typeof this.app.ui.renderItemSlots === 'function') {
            this.app.ui.renderItemSlots();
        }
        if (typeof this.app.render === 'function') {
            this.app.render();
        }
    }
}
