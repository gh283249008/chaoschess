import { WebSocketServer } from 'ws';
import { Room } from './Room.js';

const PROTOCOL_VERSION = '1';

const SYNC_REASONS = {
    ROOM_CREATED: 'ROOM_CREATED',
    ROOM_REUSED: 'ROOM_REUSED',
    ROOM_JOINED: 'ROOM_JOINED',
    PLAYER_LEFT: 'PLAYER_LEFT',
    READY_CHANGED: 'READY_CHANGED',
    MATCH_STARTED: 'MATCH_STARTED',
    PLAYER_ACTION_APPLIED: 'PLAYER_ACTION_APPLIED',
    BUY_PHASE_AUTO_STARTED: 'BUY_PHASE_AUTO_STARTED',
    SNAPSHOT_SYNC: 'SNAPSHOT_SYNC'
};

const ERROR_CODES = {
    INVALID_JSON: 'INVALID_JSON',
    UNKNOWN_MESSAGE_TYPE: 'UNKNOWN_MESSAGE_TYPE',
    ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
    NOT_IN_ROOM: 'NOT_IN_ROOM',
    NOT_HOST: 'NOT_HOST',
    INVALID_ACTION: 'INVALID_ACTION',
    RECONNECT_FAILED: 'RECONNECT_FAILED',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    ROOM_EXPIRED: 'ROOM_EXPIRED',
    INVALID_PHASE: 'INVALID_PHASE',
    NOT_YOUR_TURN: 'NOT_YOUR_TURN'
};

const ACTION_MATRIX = {
    buying: new Set(['PURCHASE_EFFECT', 'BEGIN_ROUND']),
    playing: new Set(['SYNC_STATE', 'CANVAS_CLICK']),
    ended: new Set(['NEXT_ROUND'])
};

const DISCONNECT_GRACE_MS = 30000;
const EMPTY_ROOM_EXPIRE_MS = 30 * 1000;
const MATCH_END_EXPIRE_MS = 5 * 60 * 1000;

export class GameServer {
    constructor(port = 8080) {
        this.port = port;
        this.wss = null;
        this.rooms = new Map();
        this.clients = new Map();
        this.processedActionKeys = new Map();
        this.maxProcessedActionKeys = 200;
        this.debugActionFlow = process.env.DEBUG_ACTION_FLOW === '1';
    }

    start() {
        this.wss = new WebSocketServer({ port: this.port });

        this.roundTicker = setInterval(() => {
            this.tickBuyingPhase();
        }, 500);

        this.wss.on('connection', (ws, req) => {
            const clientId = this.generateClientId();
            const playerToken = this.generatePlayerToken();
            const client = {
                id: clientId,
                ws,
                roomId: null,
                color: null,
                token: playerToken,
                name: playerToken
            };

            this.clients.set(clientId, client);
            this.sendToClient(clientId, {
                type: 'connected',
                payload: {
                    clientId,
                    playerToken,
                    message: 'Connected to Chaos Chess server'
                }
            });

            ws.on('message', data => this.handleMessage(clientId, data));
            ws.on('close', () => this.handleDisconnect(clientId));
            ws.on('error', err => {
                console.error(`WebSocket error (${clientId}):`, err.message);
            });
        });

        console.log(`Game server listening on :${this.port}`);
    }

    stop() {
        if (!this.wss) {
            return;
        }
        if (this.roundTicker) {
            clearInterval(this.roundTicker);
            this.roundTicker = null;
        }
        this.wss.close();
        this.wss = null;
        this.rooms.clear();
        this.clients.clear();
    }

    handleMessage(clientId, data) {
        let message;
        try {
            message = JSON.parse(data.toString());
        } catch {
            this.sendError(clientId, ERROR_CODES.INVALID_JSON, '消息格式错误：无法解析JSON');
            return;
        }

        const type = message.type;
        const payload = message.payload || {};

        switch (type) {
            case 'create_room':
                this.handleCreateRoom(clientId);
                return;
            case 'join_room':
                this.handleJoinRoom(clientId, payload.roomId);
                return;
            case 'leave_room':
                this.handleLeaveRoom(clientId);
                return;
            case 'list_rooms':
                this.handleListRooms(clientId);
                return;
            case 'ready':
                this.handleReady(clientId, !!payload.ready);
                return;
            case 'start_match':
                this.handleStartMatch(clientId, payload.mode || 'BO3');
                return;
            case 'player_action':
                this.handlePlayerAction(clientId, payload.action, payload.clientActionId);
                return;
            case 'state_snapshot':
                this.handleStateSnapshot(clientId);
                return;
            case 'reconnect':
                this.handleReconnect(clientId, payload.roomId, payload.playerToken);
                return;
            default:
                this.sendError(clientId, ERROR_CODES.UNKNOWN_MESSAGE_TYPE, `未知消息类型: ${type}`);
        }
    }

    handleCreateRoom(clientId) {
        const client = this.clients.get(clientId);
        if (!client) return;

        if (client.roomId) {
            const existingRoom = this.rooms.get(client.roomId);
            if (existingRoom) {
                this.sendToClient(clientId, {
                    type: 'room_created',
                    payload: {
                        roomId: existingRoom.id,
                        color: client.color || 'red'
                    }
                });
                this.pushRoomState(existingRoom.id, SYNC_REASONS.ROOM_REUSED);
                return;
            }

            client.roomId = null;
            client.color = null;
        }

        const roomId = this.generateRoomId();
        const room = new Room(roomId, client);

        this.rooms.set(roomId, room);
        client.roomId = roomId;
        client.color = 'red';

        this.sendToClient(clientId, {
            type: 'room_created',
            payload: {
                roomId,
                color: 'red'
            }
        });

        this.pushRoomState(roomId, SYNC_REASONS.ROOM_CREATED);
    }

    handleJoinRoom(clientId, roomId) {
        const client = this.clients.get(clientId);
        const room = this.rooms.get(roomId);
        if (!client) return;
        if (!room) {
            this.sendError(clientId, ERROR_CODES.ROOM_NOT_FOUND, '房间不存在');
            return;
        }

        const result = room.addPlayer(client);
        if (!result.success) {
            this.sendError(clientId, ERROR_CODES.INVALID_ACTION, result.reason);
            return;
        }

        client.roomId = roomId;
        client.color = result.color;

        this.sendToClient(clientId, {
            type: 'room_joined',
            payload: {
                roomId,
                color: result.color
            }
        });

        this.pushRoomState(roomId, SYNC_REASONS.ROOM_JOINED);
    }

    handleLeaveRoom(clientId) {
        const client = this.clients.get(clientId);
        if (!client || !client.roomId) {
            return;
        }
        const roomId = client.roomId;
        const room = this.rooms.get(roomId);

        if (room) {
            room.removePlayer(clientId);
            if (room.status === 'finished') {
                this.rooms.delete(roomId);
            } else {
                this.pushRoomState(roomId, SYNC_REASONS.PLAYER_LEFT);
            }
        }

        client.roomId = null;
        client.color = null;
        this.sendToClient(clientId, { type: 'room_left', payload: {} });
    }

    handleReconnect(clientId, roomId, playerToken) {
        const client = this.clients.get(clientId);
        if (!client) {
            return;
        }
        if (!roomId || !playerToken) {
            this.sendError(clientId, ERROR_CODES.RECONNECT_FAILED, '缺少重连参数');
            return;
        }

        const room = this.rooms.get(roomId);
        if (!room) {
            this.sendError(clientId, ERROR_CODES.ROOM_EXPIRED, '房间不存在或已过期');
            return;
        }

        const result = room.restorePlayerByToken(playerToken, clientId);
        if (!result.success) {
            this.sendError(clientId, ERROR_CODES.SESSION_EXPIRED, result.reason || '会话已过期');
            return;
        }

        const prevClient = this.clients.get(result.prevClientId);
        if (prevClient) {
            prevClient.roomId = null;
            prevClient.color = null;
        }

        client.roomId = roomId;
        client.color = result.color;
        client.token = playerToken;
        client.name = playerToken;

        room.nextSeq();
        this.sendToClient(clientId, {
            type: 'reconnected',
            payload: {
                roomId,
                color: result.color,
                playerToken
            }
        });
        this.pushRoomState(roomId, SYNC_REASONS.SNAPSHOT_SYNC);
    }

    handleReady(clientId, ready) {
        const room = this.getClientRoom(clientId);
        if (!room) {
            this.sendError(clientId, ERROR_CODES.NOT_IN_ROOM, '你不在房间内');
            return;
        }

        const result = room.setReady(clientId, ready);
        if (!result.success) {
            this.sendError(clientId, ERROR_CODES.INVALID_ACTION, result.reason);
            return;
        }

        room.nextSeq();
        this.pushRoomState(room.id, SYNC_REASONS.READY_CHANGED);
    }

    handleStartMatch(clientId, mode) {
        const room = this.getClientRoom(clientId);
        if (!room) {
            this.sendError(clientId, ERROR_CODES.NOT_IN_ROOM, '你不在房间内');
            return;
        }

        const host = room.players[0];
        if (!host || host.id !== clientId) {
            this.sendError(clientId, ERROR_CODES.NOT_HOST, '仅房主可开始比赛');
            return;
        }

        const result = room.startMatch(mode);
        if (!result.success) {
            this.sendError(clientId, ERROR_CODES.INVALID_ACTION, result.reason);
            return;
        }

        room.nextSeq();
        this.pushRoomState(room.id, SYNC_REASONS.MATCH_STARTED);
    }

    handlePlayerAction(clientId, action, clientActionId) {
        const room = this.getClientRoom(clientId);
        if (!room) {
            this.sendError(clientId, ERROR_CODES.NOT_IN_ROOM, '你不在房间内');
            return;
        }

        const preCheck = this.validatePlayerAction(room, clientId, action);
        if (!preCheck.success) {
            this.logActionEvent('action_rejected', {
                roomId: room.id,
                seq: room.seq,
                clientId,
                playerToken: preCheck.player?.token || null,
                actionKind: action?.kind || null,
                actionId: clientActionId || null,
                result: 'rejected',
                code: preCheck.code,
                reason: preCheck.reason
            });
            this.sendError(clientId, preCheck.code, preCheck.reason);
            return;
        }

        this.logActionEvent('action_received', {
            roomId: room.id,
            seq: room.seq,
            clientId,
            playerToken: preCheck.player?.token || null,
            actionKind: action.kind,
            actionId: clientActionId || null,
            result: 'received',
            code: null,
            reason: null
        });

        if (clientActionId && this.isDuplicateAction(room.id, clientId, clientActionId)) {
            this.sendStateSync(clientId, room.getSnapshot(), SYNC_REASONS.PLAYER_ACTION_APPLIED);
            return;
        }

        const result = room.applyAction(clientId, action);
        if (!result.success) {
            this.logActionEvent('action_rejected', {
                roomId: room.id,
                seq: room.seq,
                clientId,
                playerToken: preCheck.player?.token || null,
                actionKind: action.kind,
                actionId: clientActionId || null,
                result: 'rejected',
                code: ERROR_CODES.INVALID_ACTION,
                reason: result.reason
            });
            this.sendError(clientId, ERROR_CODES.INVALID_ACTION, result.reason);
            return;
        }

        if (result.changed === false) {
            this.logActionEvent('action_rejected', {
                roomId: room.id,
                seq: room.seq,
                clientId,
                playerToken: preCheck.player?.token || null,
                actionKind: action.kind,
                actionId: clientActionId || null,
                result: 'rejected',
                code: ERROR_CODES.INVALID_ACTION,
                reason: '状态未发生变化'
            });
            this.sendError(clientId, ERROR_CODES.INVALID_ACTION, '状态未发生变化');
            return;
        }

        if (clientActionId) {
            this.rememberAction(room.id, clientId, clientActionId);
        }

        room.nextSeq();
        this.logActionEvent('action_applied', {
            roomId: room.id,
            seq: room.seq,
            clientId,
            playerToken: preCheck.player?.token || null,
            actionKind: action.kind,
            actionId: clientActionId || null,
            result: 'applied',
            code: null,
            reason: null
        });
        this.pushRoomState(room.id, SYNC_REASONS.PLAYER_ACTION_APPLIED);
    }

    validatePlayerAction(room, clientId, action) {
        if (!action || typeof action !== 'object' || !action.kind) {
            return { success: false, code: ERROR_CODES.INVALID_ACTION, reason: '无效操作参数', player: null };
        }

        if (room.status !== 'playing') {
            return { success: false, code: ERROR_CODES.INVALID_PHASE, reason: '当前不在比赛中', player: null };
        }

        const player = room.getPlayerById(clientId);
        if (!player) {
            return { success: false, code: ERROR_CODES.NOT_IN_ROOM, reason: '玩家不在房间中', player: null };
        }

        const phase = room.roundState?.status || 'waiting';
        const allowedActions = ACTION_MATRIX[phase];
        if (!allowedActions || !allowedActions.has(action.kind)) {
            return { success: false, code: ERROR_CODES.INVALID_PHASE, reason: `当前阶段不允许执行 ${action.kind}`, player };
        }

        if (phase === 'playing' && (action.kind === 'SYNC_STATE' || action.kind === 'CANVAS_CLICK')) {
            if (player.color !== room.roundState.turnColor) {
                return { success: false, code: ERROR_CODES.NOT_YOUR_TURN, reason: '当前不是你的行动方', player };
            }
        }

        if (action.kind === 'SYNC_STATE') {
            if (!action.boardState || !action.state || !action.state.currentPlayer) {
                return { success: false, code: ERROR_CODES.INVALID_ACTION, reason: '缺少同步状态数据', player };
            }
        }

        if (action.kind === 'PURCHASE_EFFECT' && !action.effectId) {
            return { success: false, code: ERROR_CODES.INVALID_ACTION, reason: '缺少效果ID', player };
        }

        return { success: true, code: null, reason: null, player };
    }

    handleStateSnapshot(clientId) {
        const room = this.getClientRoom(clientId);
        if (!room) {
            this.sendError(clientId, ERROR_CODES.NOT_IN_ROOM, '你不在房间内');
            return;
        }

        this.sendStateSync(clientId, room.getSnapshot(), SYNC_REASONS.SNAPSHOT_SYNC);
    }

    handleListRooms(clientId) {
        const roomList = [...this.rooms.values()]
            .filter(room => room.status !== 'finished' && room.hasOnlinePlayers())
            .map(room => room.getInfo());

        this.sendToClient(clientId, {
            type: 'room_list',
            payload: { rooms: roomList }
        });
    }

    getClientRoom(clientId) {
        const client = this.clients.get(clientId);
        if (!client || !client.roomId) return null;
        return this.rooms.get(client.roomId) || null;
    }

    pushRoomState(roomId, reason) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        this.broadcastToRoom(roomId, {
            type: 'state_sync',
            payload: {
                ...room.getSnapshot(),
                protocolVersion: PROTOCOL_VERSION,
                reason
            }
        });
        this.logActionEvent('state_broadcasted', {
            roomId,
            seq: room.seq,
            clientId: null,
            playerToken: null,
            actionKind: null,
            actionId: null,
            result: 'broadcasted',
            code: null,
            reason
        });
    }

    sendStateSync(clientId, snapshot, reason = null) {
        this.sendToClient(clientId, {
            type: 'state_sync',
            payload: {
                ...snapshot,
                protocolVersion: PROTOCOL_VERSION,
                reason
            }
        });
    }

    tickBuyingPhase() {
        const now = Date.now();
        for (const [roomId, room] of this.rooms.entries()) {
            if (this.shouldExpireRoom(room, now)) {
                this.rooms.delete(roomId);
                continue;
            }

            if (room.status !== 'playing') continue;
            if (room.roundState?.status !== 'buying') continue;
            const buyEndsAt = room.roundState?.buyEndsAt;
            if (!buyEndsAt || now < buyEndsAt) continue;

            room.roundState.status = 'playing';
            room.roundState.buyEndsAt = null;
            room.nextSeq();
            this.pushRoomState(room.id, SYNC_REASONS.BUY_PHASE_AUTO_STARTED);
        }

        this.cleanupDisconnectedClients(now);
    }

    shouldExpireRoom(room, now) {
        if (!room.hasOnlinePlayers()) {
            const idleSince = room.lastActiveAt || room.createdAt;
            const elapsed = now - idleSince;
            const threshold = Math.min(EMPTY_ROOM_EXPIRE_MS, DISCONNECT_GRACE_MS);
            if (elapsed >= threshold) {
                return true;
            }
        }

        if (room.status === 'match_end') {
            const finishedAt = room.finishedAt || room.lastActiveAt || room.createdAt;
            if (now - finishedAt >= MATCH_END_EXPIRE_MS) {
                return true;
            }
        }

        return false;
    }

    cleanupDisconnectedClients(now) {
        for (const [clientId, client] of this.clients.entries()) {
            if (!client.roomId) {
                continue;
            }
            const room = this.rooms.get(client.roomId);
            if (!room) {
                client.roomId = null;
                client.color = null;
                continue;
            }

            const player = room.getPlayerById(clientId);
            if (!player || player.online) {
                continue;
            }

            const disconnectedAt = player.disconnectedAt || now;
            if (now - disconnectedAt < DISCONNECT_GRACE_MS) {
                continue;
            }

            room.removePlayer(clientId);
            client.roomId = null;
            client.color = null;
            if (room.status === 'finished') {
                this.rooms.delete(room.id);
            } else {
                room.nextSeq();
                this.pushRoomState(room.id, SYNC_REASONS.PLAYER_LEFT);
            }
        }
    }

    handleDisconnect(clientId) {
        const client = this.clients.get(clientId);
        if (!client) {
            return;
        }

        if (client.roomId) {
            const room = this.rooms.get(client.roomId);
            if (room) {
                room.markPlayerOffline(clientId);
                room.nextSeq();
                this.pushRoomState(room.id, SYNC_REASONS.SNAPSHOT_SYNC);
            }
        }

        console.log(`Client disconnected: ${clientId}`);
    }

    sendError(clientId, code, message) {
        const client = this.clients.get(clientId);
        this.logActionEvent('action_rejected', {
            roomId: client?.roomId || null,
            seq: client?.roomId ? (this.rooms.get(client.roomId)?.seq || 0) : 0,
            clientId,
            playerToken: client?.token || null,
            actionKind: null,
            actionId: null,
            result: 'rejected',
            code,
            reason: message
        });
        this.sendToClient(clientId, {
            type: 'error',
            payload: { code, message }
        });
    }

    logActionEvent(event, payload) {
        if (!this.debugActionFlow) {
            return;
        }

        const row = {
            ts: new Date().toISOString(),
            event,
            ...payload
        };
        console.log(JSON.stringify(row));
    }

    isDuplicateAction(roomId, clientId, clientActionId) {
        const key = `${roomId}:${clientId}:${clientActionId}`;
        return this.processedActionKeys.has(key);
    }

    rememberAction(roomId, clientId, clientActionId) {
        const key = `${roomId}:${clientId}:${clientActionId}`;
        this.processedActionKeys.set(key, Date.now());
        if (this.processedActionKeys.size <= this.maxProcessedActionKeys) {
            return;
        }

        const oldestKey = this.processedActionKeys.keys().next().value;
        if (oldestKey) {
            this.processedActionKeys.delete(oldestKey);
        }
    }

    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client || !client.ws || client.ws.readyState !== 1) {
            return;
        }
        client.ws.send(JSON.stringify(message));
    }

    broadcastToRoom(roomId, message) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        room.players.forEach(player => this.sendToClient(player.id, message));
    }

    generateClientId() {
        return `c_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
    }

    generateRoomId() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    generatePlayerToken() {
        return `P${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    }
}
