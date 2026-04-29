import { ActionTypes } from './actions.js';

/**
 * 初始状态
 */
export const initialState = {
    // 游戏模式
    gameMode: 'chess', // 'chess' or 'go'

    // 当前玩家
    currentPlayer: 'red',

    // 棋盘状态
    pieces: [],

    // 扑克状态
    pokerHands: {
        red: [],
        black: []
    },

    // 效果状态
    frozenPieces: [],
    smokeZones: [],
    walls: [],
    riverBlocked: false,
    goBanned: false,

    // 选择状态
    selectedPiece: null,
    selectedCards: [],

    // 历史记录（用于悔棋）
    history: []
};

/**
 * Reducer函数
 */
export function gameReducer(state = initialState, action) {
    switch (action.type) {
        case ActionTypes.PLACE_PIECE: {
            const { piece } = action.payload;
            return {
                ...state,
                pieces: [...state.pieces, piece]
            };
        }

        case ActionTypes.MOVE_PIECE: {
            const { piece, to } = action.payload;
            return {
                ...state,
                pieces: state.pieces.map(p =>
                    p === piece ? { ...p, x: to.x, y: to.y } : p
                )
            };
        }

        case ActionTypes.REMOVE_PIECE: {
            const { piece } = action.payload;
            return {
                ...state,
                pieces: state.pieces.filter(p => p !== piece)
            };
        }

        case ActionTypes.PLACE_GO_STONE: {
            const { stone } = action.payload;
            return {
                ...state,
                pieces: [...state.pieces, stone]
            };
        }

        case ActionTypes.CAPTURE_GO_STONES: {
            const { stones } = action.payload;
            return {
                ...state,
                pieces: state.pieces.filter(p => !stones.includes(p))
            };
        }

        case ActionTypes.DEAL_CARDS: {
            const { player, cards } = action.payload;
            return {
                ...state,
                pokerHands: {
                    ...state.pokerHands,
                    [player]: cards
                }
            };
        }

        case ActionTypes.PLAY_HAND: {
            const { player, cards } = action.payload;
            return {
                ...state,
                pokerHands: {
                    ...state.pokerHands,
                    [player]: state.pokerHands[player].filter(c =>
                        !cards.some(pc => pc.id === c.id)
                    )
                }
            };
        }

        case ActionTypes.SWITCH_TURN: {
            return {
                ...state,
                currentPlayer: state.currentPlayer === 'red' ? 'black' : 'red',
                selectedPiece: null,
                selectedCards: []
            };
        }

        case ActionTypes.UNDO: {
            if (state.history.length === 0) return state;
            const previousState = state.history[state.history.length - 1];
            return {
                ...previousState,
                history: state.history.slice(0, -1)
            };
        }

        case ActionTypes.RESET_GAME: {
            return {
                ...initialState,
                gameMode: state.gameMode
            };
        }

        case ActionTypes.ADD_FROZEN_PIECE: {
            const { piece, duration } = action.payload;
            return {
                ...state,
                frozenPieces: [...state.frozenPieces, { piece, duration }],
                pieces: state.pieces.map(p =>
                    p === piece ? { ...p, frozen: true } : p
                )
            };
        }

        case ActionTypes.REMOVE_FROZEN_PIECE: {
            const { piece } = action.payload;
            return {
                ...state,
                frozenPieces: state.frozenPieces.filter(f => f.piece !== piece),
                pieces: state.pieces.map(p =>
                    p === piece ? { ...p, frozen: false } : p
                )
            };
        }

        case ActionTypes.ADD_SMOKE_ZONE: {
            const { zone } = action.payload;
            return {
                ...state,
                smokeZones: [...state.smokeZones, zone]
            };
        }

        case ActionTypes.ADD_WALL: {
            const { position } = action.payload;
            return {
                ...state,
                walls: [...state.walls, position]
            };
        }

        case ActionTypes.BLOCK_RIVER: {
            return {
                ...state,
                riverBlocked: true
            };
        }

        case ActionTypes.BAN_GO: {
            return {
                ...state,
                goBanned: true,
                pieces: state.pieces.filter(p => p.pluginSource !== 'Go')
            };
        }

        case ActionTypes.SWITCH_MODE: {
            const { mode } = action.payload;
            return {
                ...initialState,
                gameMode: mode,
                currentPlayer: 'red'
            };
        }

        default:
            return state;
    }
}

/**
 * 组合多个reducer
 */
export function combineReducers(reducers) {
    return (state = {}, action) => {
        const nextState = {};
        for (const key in reducers) {
            nextState[key] = reducers[key](state[key], action);
        }
        return nextState;
    };
}
