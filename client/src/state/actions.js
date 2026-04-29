/**
 * Action类型定义
 */
export const ActionTypes = {
    // 棋盘操作
    PLACE_PIECE: 'PLACE_PIECE',
    MOVE_PIECE: 'MOVE_PIECE',
    REMOVE_PIECE: 'REMOVE_PIECE',

    // 围棋操作
    PLACE_GO_STONE: 'PLACE_GO_STONE',
    CAPTURE_GO_STONES: 'CAPTURE_GO_STONES',

    // 扑克操作
    DEAL_CARDS: 'DEAL_CARDS',
    PLAY_HAND: 'PLAY_HAND',
    EXECUTE_EFFECT: 'EXECUTE_EFFECT',

    // 游戏状态
    SWITCH_TURN: 'SWITCH_TURN',
    UNDO: 'UNDO',
    RESET_GAME: 'RESET_GAME',

    // 效果状态
    ADD_FROZEN_PIECE: 'ADD_FROZEN_PIECE',
    REMOVE_FROZEN_PIECE: 'REMOVE_FROZEN_PIECE',
    ADD_SMOKE_ZONE: 'ADD_SMOKE_ZONE',
    ADD_WALL: 'ADD_WALL',
    BLOCK_RIVER: 'BLOCK_RIVER',
    BAN_GO: 'BAN_GO',

    // 模式切换
    SWITCH_MODE: 'SWITCH_MODE'
};

/**
 * Action创建器
 */
export const Actions = {
    // 棋盘操作
    placePiece: (piece) => ({
        type: ActionTypes.PLACE_PIECE,
        payload: { piece }
    }),

    movePiece: (piece, from, to) => ({
        type: ActionTypes.MOVE_PIECE,
        payload: { piece, from, to }
    }),

    removePiece: (piece) => ({
        type: ActionTypes.REMOVE_PIECE,
        payload: { piece }
    }),

    // 围棋操作
    placeGoStone: (stone) => ({
        type: ActionTypes.PLACE_GO_STONE,
        payload: { stone }
    }),

    captureGoStones: (stones) => ({
        type: ActionTypes.CAPTURE_GO_STONES,
        payload: { stones }
    }),

    // 扑克操作
    dealCards: (player, cards) => ({
        type: ActionTypes.DEAL_CARDS,
        payload: { player, cards }
    }),

    playHand: (player, cards, handEval) => ({
        type: ActionTypes.PLAY_HAND,
        payload: { player, cards, handEval }
    }),

    executeEffect: (effectType, target, result) => ({
        type: ActionTypes.EXECUTE_EFFECT,
        payload: { effectType, target, result }
    }),

    // 游戏状态
    switchTurn: () => ({
        type: ActionTypes.SWITCH_TURN
    }),

    undo: () => ({
        type: ActionTypes.UNDO
    }),

    resetGame: () => ({
        type: ActionTypes.RESET_GAME
    }),

    // 效果状态
    addFrozenPiece: (piece, duration) => ({
        type: ActionTypes.ADD_FROZEN_PIECE,
        payload: { piece, duration }
    }),

    removeFrozenPiece: (piece) => ({
        type: ActionTypes.REMOVE_FROZEN_PIECE,
        payload: { piece }
    }),

    addSmokeZone: (zone) => ({
        type: ActionTypes.ADD_SMOKE_ZONE,
        payload: { zone }
    }),

    addWall: (position) => ({
        type: ActionTypes.ADD_WALL,
        payload: { position }
    }),

    blockRiver: () => ({
        type: ActionTypes.BLOCK_RIVER
    }),

    banGo: () => ({
        type: ActionTypes.BAN_GO
    }),

    // 模式切换
    switchMode: (mode) => ({
        type: ActionTypes.SWITCH_MODE,
        payload: { mode }
    })
};
