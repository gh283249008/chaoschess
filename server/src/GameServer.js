import { WebSocketServer } from 'ws';
import { Room } from './Room.js';

export class GameServer {
    constructor(port = 8080) {
        this.port = port;
        this.wss = null;
        this.rooms = new Map();
        this.clients = new Map();
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
            this.sendError(clientId, '消息格式错误：无法解析JSON');
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
                this.handlePlayerAction(clientId, payload.action);
                return;
            case 'state_snapshot':
                this.handleStateSnapshot(clientId);
                return;
            default:
                this.sendError(clientId, `未知消息类型: ${type}`);
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
                this.pushRoomState(existingRoom.id, 'room_reuse');
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

        this.pushRoomState(roomId, 'room_created');
    }

    handleJoinRoom(clientId, roomId) {
        const client = this.clients.get(clientId);
        const room = this.rooms.get(roomId);
        if (!client) return;
        if (!room) {
            this.sendError(clientId, '房间不存在');
            return;
        }

        const result = room.addPlayer(client);
        if (!result.success) {
            this.sendError(clientId, result.reason);
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

        this.pushRoomState(roomId, 'room_joined');
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
                this.pushRoomState(roomId, 'player_left');
            }
        }

        client.roomId = null;
        client.color = null;
        this.sendToClient(clientId, { type: 'room_left', payload: {} });
    }

    handleReady(clientId, ready) {
        const room = this.getClientRoom(clientId);
        if (!room) {
            this.sendError(clientId, '你不在房间内');
            return;
        }

        const result = room.setReady(clientId, ready);
        if (!result.success) {
            this.sendError(clientId, result.reason);
            return;
        }

        room.nextSeq();
        this.pushRoomState(room.id, 'ready_changed');
    }

    handleStartMatch(clientId, mode) {
        const room = this.getClientRoom(clientId);
        if (!room) {
            this.sendError(clientId, '你不在房间内');
            return;
        }

        const host = room.players[0];
        if (!host || host.id !== clientId) {
            this.sendError(clientId, '仅房主可开始比赛');
            return;
        }

        const result = room.startMatch(mode);
        if (!result.success) {
            this.sendError(clientId, result.reason);
            return;
        }

        room.nextSeq();
        this.pushRoomState(room.id, 'match_started');
    }

    handlePlayerAction(clientId, action) {
        const room = this.getClientRoom(clientId);
        if (!room) {
            this.sendError(clientId, '你不在房间内');
            return;
        }

        const result = room.applyAction(clientId, action);
        if (!result.success) {
            this.sendError(clientId, result.reason);
            return;
        }

        room.nextSeq();
        this.pushRoomState(room.id, 'player_action_applied');
    }

    handleStateSnapshot(clientId) {
        const room = this.getClientRoom(clientId);
        if (!room) {
            this.sendError(clientId, '你不在房间内');
            return;
        }

        this.sendToClient(clientId, {
            type: 'state_sync',
            payload: room.getSnapshot()
        });
    }

    handleListRooms(clientId) {
        const roomList = [...this.rooms.values()]
            .filter(room => room.status !== 'finished')
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
                reason
            }
        });
    }

    tickBuyingPhase() {
        const now = Date.now();
        for (const room of this.rooms.values()) {
            if (room.status !== 'playing') continue;
            if (room.roundState?.status !== 'buying') continue;
            const buyEndsAt = room.roundState?.buyEndsAt;
            if (!buyEndsAt || now < buyEndsAt) continue;

            room.roundState.status = 'playing';
            room.roundState.buyEndsAt = null;
            room.nextSeq();
            this.pushRoomState(room.id, 'buy_phase_auto_started');
        }
    }

    handleDisconnect(clientId) {
        this.handleLeaveRoom(clientId);
        this.clients.delete(clientId);
        console.log(`Client disconnected: ${clientId}`);
    }

    sendError(clientId, message) {
        this.sendToClient(clientId, {
            type: 'error',
            payload: { message }
        });
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
