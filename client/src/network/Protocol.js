/**
 * 通信协议定义
 * 定义客户端和服务器之间的消息格式
 */

/**
 * 消息类型
 */
export const MessageTypes = {
    // 连接相关
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',

    // 房间管理
    CREATE_ROOM: 'create_room',
    ROOM_CREATED: 'room_created',
    JOIN_ROOM: 'join_room',
    ROOM_JOINED: 'room_joined',
    LEAVE_ROOM: 'leave_room',
    ROOM_LEFT: 'room_left',
    LIST_ROOMS: 'list_rooms',
    ROOM_LIST: 'room_list',

    // 玩家事件
    PLAYER_JOINED: 'player_joined',
    PLAYER_LEFT: 'player_left',

    // 游戏状态
    GAME_START: 'game_start',
    GAME_ACTION: 'game_action',
    GAME_STATE_UPDATE: 'game_state_update',
    GAME_END: 'game_end',

    // 错误
    ERROR: 'error'
};

/**
 * 创建标准消息格式
 */
export class Protocol {
    /**
     * 创建房间消息
     */
    static createRoom() {
        return {
            type: MessageTypes.CREATE_ROOM,
            timestamp: Date.now()
        };
    }

    /**
     * 加入房间消息
     */
    static joinRoom(roomId) {
        return {
            type: MessageTypes.JOIN_ROOM,
            roomId,
            timestamp: Date.now()
        };
    }

    /**
     * 离开房间消息
     */
    static leaveRoom() {
        return {
            type: MessageTypes.LEAVE_ROOM,
            timestamp: Date.now()
        };
    }

    /**
     * 游戏操作消息
     */
    static gameAction(action) {
        return {
            type: MessageTypes.GAME_ACTION,
            action,
            timestamp: Date.now()
        };
    }

    /**
     * 列出房间消息
     */
    static listRooms() {
        return {
            type: MessageTypes.LIST_ROOMS,
            timestamp: Date.now()
        };
    }

    /**
     * 验证消息格式
     */
    static validate(message) {
        if (!message || typeof message !== 'object') {
            return { valid: false, reason: 'Invalid message format' };
        }

        if (!message.type || typeof message.type !== 'string') {
            return { valid: false, reason: 'Missing or invalid message type' };
        }

        return { valid: true };
    }
}
