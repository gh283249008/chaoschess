/**
 * WebSocket客户端
 * 处理与服务器的网络通信
 */
export class NetworkClient {
    constructor(serverUrl = 'ws://localhost:8080') {
        this.serverUrl = serverUrl;
        this.ws = null;
        this.clientId = null;
        this.roomId = null;
        this.connected = false;
        this.messageHandlers = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    /**
     * 连接到服务器
     */
    connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.serverUrl);

                this.ws.onopen = () => {
                    console.log('Connected to game server');
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };

                this.ws.onclose = () => {
                    console.log('Disconnected from game server');
                    this.connected = false;
                    this.handleDisconnect();
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    reject(error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 处理接收到的消息
     */
    handleMessage(data) {
        try {
            const message = JSON.parse(data);

            console.log('Received message:', message.type);

            // 处理特殊消息类型
            switch (message.type) {
                case 'connected':
                    this.clientId = message.clientId;
                    break;

                case 'room_created':
                case 'room_joined':
                    this.roomId = message.roomId;
                    break;

                case 'room_left':
                    this.roomId = null;
                    break;
            }

            // 调用注册的处理器
            const handlers = this.messageHandlers.get(message.type) || [];
            handlers.forEach(handler => handler(message));

            // 调用通用处理器
            const globalHandlers = this.messageHandlers.get('*') || [];
            globalHandlers.forEach(handler => handler(message));

        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    /**
     * 处理断开连接
     */
    handleDisconnect() {
        this.connected = false;

        // 尝试重连
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

            setTimeout(() => {
                this.connect().catch(err => {
                    console.error('Reconnection failed:', err);
                });
            }, 2000 * this.reconnectAttempts);
        } else {
            console.error('Max reconnection attempts reached');
            const handlers = this.messageHandlers.get('connection_lost') || [];
            handlers.forEach(handler => handler());
        }
    }

    /**
     * 发送消息到服务器
     */
    send(message) {
        if (!this.connected || !this.ws) {
            console.error('Not connected to server');
            return false;
        }

        try {
            this.ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error('Error sending message:', error);
            return false;
        }
    }

    /**
     * 注册消息处理器
     */
    on(messageType, handler) {
        if (!this.messageHandlers.has(messageType)) {
            this.messageHandlers.set(messageType, []);
        }
        this.messageHandlers.get(messageType).push(handler);
    }

    /**
     * 移除消息处理器
     */
    off(messageType, handler) {
        const handlers = this.messageHandlers.get(messageType);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * 创建房间
     */
    createRoom() {
        return this.send({ type: 'create_room' });
    }

    /**
     * 加入房间
     */
    joinRoom(roomId) {
        return this.send({ type: 'join_room', roomId });
    }

    /**
     * 离开房间
     */
    leaveRoom() {
        return this.send({ type: 'leave_room' });
    }

    /**
     * 发送游戏操作
     */
    sendGameAction(action) {
        return this.send({ type: 'game_action', action });
    }

    /**
     * 请求房间列表
     */
    listRooms() {
        return this.send({ type: 'list_rooms' });
    }

    /**
     * 断开连接
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.connected = false;
        }
    }
}
