import { WebSocketServer } from 'ws';
import { Room } from './Room.js';
import { PluginValidator } from './PluginValidator.js';

/**
 * 游戏服务器
 * 管理WebSocket连接和游戏房间
 */
export class GameServer {
    constructor(port = 8080) {
        this.port = port;
        this.wss = null;
        this.rooms = new Map();
        this.clients = new Map();
        this.validator = null; // 需要插件管理器初始化
    }

    /**
     * 启动服务器
     */
    start() {
        this.wss = new WebSocketServer({ port: this.port });

        this.wss.on('connection', (ws, req) => {
            const clientId = this.generateClientId();

            console.log(`Client connected: ${clientId}`);

            // 存储客户端连接
            this.clients.set(clientId, {
                id: clientId,
                ws,
                roomId: null,
                color: null,
                name: `Player_${clientId.substring(0, 6)}`
            });

            // 发送欢迎消息
            this.sendToClient(clientId, {
                type: 'connected',
                clientId,
                message: 'Connected to Chaos Chess Server'
            });

            // 设置消息处理
            ws.on('message', (data) => {
                this.handleMessage(clientId, data);
            });

            // 设置断开连接处理
            ws.on('close', () => {
                this.handleDisconnect(clientId);
            });

            // 错误处理
            ws.on('error', (error) => {
                console.error(`WebSocket error for client ${clientId}:`, error);
            });
        });

        console.log(`🚀 Game Server started on port ${this.port}`);
    }

    /**
     * 处理客户端消息
     */
    handleMessage(clientId, data) {
        try {
            const message = JSON.parse(data.toString());

            console.log(`Message from ${clientId}:`, message.type);

            switch (message.type) {
                case 'create_room':
                    this.handleCreateRoom(clientId);
                    break;

                case 'join_room':
                    this.handleJoinRoom(clientId, message.roomId);
                    break;

                case 'leave_room':
                    this.handleLeaveRoom(clientId);
                    break;

                case 'game_action':
                    this.handleGameAction(clientId, message.action);
                    break;

                case 'list_rooms':
                    this.handleListRooms(clientId);
                    break;

                default:
                    console.warn(`Unknown message type: ${message.type}`);
            }
        } catch (error) {
            console.error(`Error handling message from ${clientId}:`, error);
            this.sendToClient(clientId, {
                type: 'error',
                message: error.message
            });
        }
    }

    /**
     * 创建房间
     */
    handleCreateRoom(clientId) {
        const client = this.clients.get(clientId);
        if (!client) return;

        const roomId = this.generateRoomId();
        const room = new Room(roomId, client);

        this.rooms.set(roomId, room);
        client.roomId = roomId;

        this.sendToClient(clientId, {
            type: 'room_created',
            roomId,
            roomInfo: room.getInfo()
        });

        console.log(`Room created: ${roomId}`);
    }

    /**
     * 加入房间
     */
    handleJoinRoom(clientId, roomId) {
        const client = this.clients.get(clientId);
        const room = this.rooms.get(roomId);

        if (!client) {
            return;
        }

        if (!room) {
            this.sendToClient(clientId, {
                type: 'error',
                message: 'Room not found'
            });
            return;
        }

        const result = room.addPlayer(client);

        if (result.success) {
            client.roomId = roomId;
            client.color = result.color;

            // 通知加入者
            this.sendToClient(clientId, {
                type: 'room_joined',
                roomId,
                color: result.color,
                roomInfo: room.getInfo()
            });

            // 通知房间内所有玩家
            this.broadcastToRoom(roomId, {
                type: 'player_joined',
                player: {
                    id: clientId,
                    name: client.name,
                    color: result.color
                },
                roomInfo: room.getInfo()
            });

            // 如果游戏开始，同步初始状态
            if (room.status === 'playing') {
                this.broadcastToRoom(roomId, {
                    type: 'game_start',
                    gameState: room.gameState
                });
            }

            console.log(`Client ${clientId} joined room ${roomId} as ${result.color}`);
        } else {
            this.sendToClient(clientId, {
                type: 'error',
                message: result.reason
            });
        }
    }

    /**
     * 离开房间
     */
    handleLeaveRoom(clientId) {
        const client = this.clients.get(clientId);
        if (!client || !client.roomId) return;

        const room = this.rooms.get(client.roomId);
        if (room) {
            room.removePlayer(clientId);

            // 通知房间内其他玩家
            this.broadcastToRoom(client.roomId, {
                type: 'player_left',
                playerId: clientId
            }, clientId);

            // 如果房间空了，删除房间
            if (room.status === 'finished') {
                this.rooms.delete(client.roomId);
                console.log(`Room ${client.roomId} deleted`);
            }
        }

        client.roomId = null;
        client.color = null;

        this.sendToClient(clientId, {
            type: 'room_left'
        });
    }

    /**
     * 处理游戏操作
     */
    handleGameAction(clientId, action) {
        const client = this.clients.get(clientId);
        if (!client || !client.roomId) {
            this.sendToClient(clientId, {
                type: 'error',
                message: 'Not in a room'
            });
            return;
        }

        const room = this.rooms.get(client.roomId);
        if (!room) return;

        // 验证是否是玩家的回合
        if (!room.isPlayerTurn(clientId)) {
            this.sendToClient(clientId, {
                type: 'error',
                message: 'Not your turn'
            });
            return;
        }

        // TODO: 使用PluginValidator验证操作

        // 更新游戏状态
        const newState = room.updateGameState(action);

        // 广播给房间内所有玩家
        this.broadcastToRoom(client.roomId, {
            type: 'game_state_update',
            action,
            gameState: newState
        });
    }

    /**
     * 列出所有房间
     */
    handleListRooms(clientId) {
        const roomList = Array.from(this.rooms.values())
            .filter(room => room.status === 'waiting')
            .map(room => room.getInfo());

        this.sendToClient(clientId, {
            type: 'room_list',
            rooms: roomList
        });
    }

    /**
     * 处理断开连接
     */
    handleDisconnect(clientId) {
        console.log(`Client disconnected: ${clientId}`);

        // 离开房间
        this.handleLeaveRoom(clientId);

        // 删除客户端
        this.clients.delete(clientId);
    }

    /**
     * 发送消息给指定客户端
     */
    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === 1) { // OPEN
            client.ws.send(JSON.stringify(message));
        }
    }

    /**
     * 广播消息给房间内所有玩家
     */
    broadcastToRoom(roomId, message, excludeClientId = null) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        room.players.forEach(player => {
            if (player.id !== excludeClientId) {
                this.sendToClient(player.id, message);
            }
        });
    }

    /**
     * 生成客户端ID
     */
    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 生成房间ID
     */
    generateRoomId() {
        return `room_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    /**
     * 停止服务器
     */
    stop() {
        if (this.wss) {
            this.wss.close();
            console.log('Game Server stopped');
        }
    }
}
