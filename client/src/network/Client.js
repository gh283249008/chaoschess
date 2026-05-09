import { Protocol } from './Protocol.js';

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
        this.actionSeq = 0;
        this.playerToken = null;
        this.shouldReconnect = true;
        this.backoffBaseMs = 1000;
        this.backoffMaxMs = 8000;
        this.session = {
            roomId: null,
            playerToken: null
        };
        this.loadSession();
    }

    loadSession() {
        try {
            const raw = localStorage.getItem('chaoschess:session');
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                this.session.roomId = parsed.roomId || null;
                this.session.playerToken = parsed.playerToken || null;
                if (this.session.playerToken) {
                    this.playerToken = this.session.playerToken;
                }
            }
        } catch {
            // ignore invalid cache
        }
    }

    persistSession() {
        try {
            localStorage.setItem('chaoschess:session', JSON.stringify(this.session));
        } catch {
            // ignore storage errors
        }
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
                    const handlers = this.messageHandlers.get('socket_open') || [];
                    handlers.forEach(handler => handler());
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };

                this.ws.onclose = () => {
                    console.log('Disconnected from game server');
                    this.connected = false;
                    if (this.shouldReconnect) {
                        this.handleDisconnect();
                    }
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
                    this.clientId = message.payload?.clientId || null;
                    if (!this.session.playerToken) {
                        this.playerToken = message.payload?.playerToken || this.playerToken;
                        this.session.playerToken = this.playerToken;
                        this.persistSession();
                    }
                    break;

                case 'room_created':
                case 'room_joined':
                    this.roomId = message.payload?.roomId || null;
                    this.session.roomId = this.roomId;
                    this.persistSession();
                    break;

                case 'reconnected':
                    this.roomId = message.payload?.roomId || this.roomId;
                    this.session.roomId = this.roomId;
                    this.playerToken = message.payload?.playerToken || this.playerToken;
                    this.session.playerToken = this.playerToken;
                    this.persistSession();
                    break;

                case 'room_left':
                    this.roomId = null;
                    this.session.roomId = null;
                    this.persistSession();
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
            const handlers = this.messageHandlers.get('reconnecting') || [];
            handlers.forEach(handler => handler(this.reconnectAttempts));

            setTimeout(() => {
                this.connect().catch(err => {
                    console.error('Reconnection failed:', err);
                });
            }, this.getReconnectDelay(this.reconnectAttempts));
        } else {
            console.error('Max reconnection attempts reached');
            const handlers = this.messageHandlers.get('connection_lost') || [];
            handlers.forEach(handler => handler());
        }
    }

    getReconnectDelay(attempt) {
        const delay = this.backoffBaseMs * Math.pow(2, Math.max(0, attempt - 1));
        return Math.min(delay, this.backoffMaxMs);
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
        return this.send(Protocol.createRoom());
    }

    /**
     * 加入房间
     */
    joinRoom(roomId) {
        return this.send(Protocol.joinRoom(roomId));
    }

    /**
     * 离开房间
     */
    leaveRoom() {
        return this.send(Protocol.leaveRoom());
    }

    /**
     * 发送游戏操作
     */
    sendGameAction(action) {
        const clientActionId = this.nextActionId();
        return this.send(Protocol.playerAction(action, clientActionId, Date.now()));
    }

    nextActionId() {
        this.actionSeq += 1;
        return `${Date.now()}-${this.actionSeq}`;
    }

    /**
     * 请求房间列表
     */
    listRooms() {
        return this.send(Protocol.listRooms());
    }

    setReady(ready) {
        return this.send(Protocol.ready(ready));
    }

    startMatch(mode = 'BO3') {
        return this.send(Protocol.startMatch(mode));
    }

    requestSnapshot() {
        return this.send(Protocol.requestSnapshot());
    }

    reconnectToSession() {
        if (!this.session.roomId || !this.session.playerToken) {
            return false;
        }
        return this.send(Protocol.reconnect(this.session.roomId, this.session.playerToken));
    }

    /**
     * 断开连接
     */
    disconnect() {
        this.shouldReconnect = false;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.connected = false;
        }
    }

    clearSession() {
        this.session.roomId = null;
        this.session.playerToken = this.playerToken;
        this.persistSession();
    }
}
