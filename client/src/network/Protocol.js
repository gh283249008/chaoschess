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
    STATE_SNAPSHOT: 'state_snapshot'
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

    static playerAction(action) {
        return Protocol.wrap(MessageTypes.PLAYER_ACTION, { action });
    }

    static requestSnapshot() {
        return Protocol.wrap(MessageTypes.STATE_SNAPSHOT);
    }
}
