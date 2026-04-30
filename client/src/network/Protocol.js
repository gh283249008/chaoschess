export const MessageTypes = {
    CONNECTED: 'connected',
    ERROR: 'error',
    CREATE_ROOM: 'create_room',
    ROOM_CREATED: 'room_created',
    JOIN_ROOM: 'join_room',
    ROOM_JOINED: 'room_joined',
    LEAVE_ROOM: 'leave_room',
    ROOM_LEFT: 'room_left',
    LIST_ROOMS: 'list_rooms',
    ROOM_LIST: 'room_list',
    READY: 'ready',
    START_MATCH: 'start_match',
    PLAYER_ACTION: 'player_action',
    STATE_SYNC: 'state_sync',
    STATE_SNAPSHOT: 'state_snapshot',
    RECONNECT: 'reconnect',
    RECONNECTED: 'reconnected'
};

export const ProtocolVersion = '1';

export const SyncReasons = {
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

export const ErrorCodes = {
    INVALID_JSON: 'INVALID_JSON',
    UNKNOWN_MESSAGE_TYPE: 'UNKNOWN_MESSAGE_TYPE',
    ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
    NOT_IN_ROOM: 'NOT_IN_ROOM',
    NOT_HOST: 'NOT_HOST',
    INVALID_ACTION: 'INVALID_ACTION',
    INVALID_PHASE: 'INVALID_PHASE',
    NOT_YOUR_TURN: 'NOT_YOUR_TURN',
    RECONNECT_FAILED: 'RECONNECT_FAILED',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    ROOM_EXPIRED: 'ROOM_EXPIRED'
};

export class Protocol {
    static wrap(type, payload = {}) {
        return {
            type,
            payload,
            ts: Date.now()
        };
    }

    static createRoom() {
        return Protocol.wrap(MessageTypes.CREATE_ROOM);
    }

    static joinRoom(roomId) {
        return Protocol.wrap(MessageTypes.JOIN_ROOM, { roomId });
    }

    static leaveRoom() {
        return Protocol.wrap(MessageTypes.LEAVE_ROOM);
    }

    static listRooms() {
        return Protocol.wrap(MessageTypes.LIST_ROOMS);
    }

    static ready(ready) {
        return Protocol.wrap(MessageTypes.READY, { ready: !!ready });
    }

    static startMatch(mode = 'BO3') {
        return Protocol.wrap(MessageTypes.START_MATCH, { mode });
    }

    static playerAction(action, clientActionId, sentAt = Date.now()) {
        return Protocol.wrap(MessageTypes.PLAYER_ACTION, {
            action,
            clientActionId,
            sentAt
        });
    }

    static requestSnapshot() {
        return Protocol.wrap(MessageTypes.STATE_SNAPSHOT);
    }

    static reconnect(roomId, playerToken) {
        return Protocol.wrap(MessageTypes.RECONNECT, { roomId, playerToken });
    }

    static parseError(message) {
        const payload = message?.payload || {};
        return {
            code: payload.code || ErrorCodes.INVALID_ACTION,
            message: payload.message || message?.message || '网络错误'
        };
    }

    static parseStateSync(message) {
        const payload = message?.payload || {};
        return {
            protocolVersion: payload.protocolVersion || ProtocolVersion,
            reason: payload.reason || null,
            snapshot: payload
        };
    }
}
