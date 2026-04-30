import { NetworkClient } from './Client.js';

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
            rooms: []
        };
        this.lastAppliedActionSeq = 0;
    }

    async connect(serverUrl) {
        if (this.client) {
            this.client.disconnect();
        }

        this.client = new NetworkClient(serverUrl);
        this.bindHandlers();
        await this.client.connect();
        this.onlineState.connected = true;
        this.client.listRooms();
        this.refreshUI();
    }

    bindHandlers() {
        this.client.on('connected', msg => {
            this.onlineState.clientId = msg.payload?.clientId || msg.clientId;
            this.onlineState.clientToken = msg.payload?.playerToken || null;
            this.refreshUI();
        });

        this.client.on('room_created', msg => {
            this.onlineState.roomId = msg.payload?.roomId || msg.roomId;
            this.onlineState.color = msg.payload?.color || null;
            this.client.requestSnapshot();
            this.refreshUI();
        });

        this.client.on('room_joined', msg => {
            this.onlineState.roomId = msg.payload?.roomId || msg.roomId;
            this.onlineState.color = msg.payload?.color || null;
            this.client.requestSnapshot();
            this.refreshUI();
        });

        this.client.on('room_left', () => {
            this.onlineState.roomId = null;
            this.onlineState.color = null;
            this.onlineState.roomSnapshot = null;
            this.client.listRooms();
            this.refreshUI();
        });

        this.client.on('room_list', msg => {
            this.onlineState.rooms = msg.payload?.rooms || [];
            this.refreshUI();
        });

        this.client.on('state_sync', msg => {
            this.onlineState.roomSnapshot = msg.payload || null;
            const turnColor = msg.payload?.roundState?.turnColor;
            if (turnColor === 'red' || turnColor === 'black') {
                this.app.currentPlayer = turnColor;
            }

            const sharedState = msg.payload?.sharedState;
            if (sharedState) {
                this.app.applyRemoteSharedState(sharedState);
            }

            const actionSeq = msg.payload?.lastActionSeq || 0;
            const action = msg.payload?.lastAction;
            if (action && actionSeq > this.lastAppliedActionSeq) {
                this.lastAppliedActionSeq = actionSeq;
                if (action.kind === 'CANVAS_CLICK' && !sharedState) {
                    this.app.applyRemoteCanvasClick(action);
                }
            }
            this.refreshUI();
        });

        this.client.on('error', msg => {
            const message = msg.payload?.message || msg.message || '网络错误';
            this.app.showNotification(message, 'warning');
        });

        this.client.on('connection_lost', () => {
            this.onlineState.connected = false;
            this.refreshUI();
        });
    }

    createRoom() {
        if (!this.client) return;
        if (this.onlineState.roomId) {
            this.refreshUI();
            return;
        }
        this.client.createRoom();
    }

    joinRoom(roomId) {
        if (!this.client || !roomId) return;
        this.client.joinRoom(roomId.trim().toUpperCase());
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
        if (this.app.pokerController && typeof this.app.pokerController.renderPokerHand === 'function') {
            this.app.pokerController.renderPokerHand();
        }
        if (typeof this.app.render === 'function') {
            this.app.render();
        }
    }
}
