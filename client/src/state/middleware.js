/**
 * 日志中间件
 * 记录每个action和状态变化
 */
export const loggerMiddleware = (store) => (next) => (action) => {
    console.group(`Action: ${action.type}`);
    console.log('Payload:', action.payload);
    console.log('Previous State:', store.getState());

    const result = next(action);

    console.log('Next State:', store.getState());
    console.groupEnd();

    return result;
};

/**
 * 历史记录中间件
 * 在每次状态变化前保存历史记录
 */
export const historyMiddleware = (store) => (next) => (action) => {
    // 不记录UNDO和RESET_GAME的历史
    if (action.type !== 'UNDO' && action.type !== 'RESET_GAME') {
        const currentState = store.getState();
        // 保存当前状态到历史记录
        const stateWithHistory = {
            ...currentState,
            history: [...(currentState.history || []), { ...currentState }]
        };

        // 限制历史记录数量（最多保留10步）
        if (stateWithHistory.history.length > 10) {
            stateWithHistory.history = stateWithHistory.history.slice(-10);
        }
    }

    return next(action);
};

/**
 * 网络同步中间件
 * 将action发送到服务器（用于多人游戏）
 */
export const networkMiddleware = (socket) => (store) => (next) => (action) => {
    // 执行本地action
    const result = next(action);

    // 如果有socket连接，发送action到服务器
    if (socket && socket.connected) {
        socket.emit('game_action', {
            action,
            timestamp: Date.now()
        });
    }

    return result;
};

/**
 * 效果过期中间件
 * 自动处理有时效性的效果（如冻结）
 */
export const effectExpirationMiddleware = (store) => (next) => (action) => {
    const result = next(action);

    // 在每次回合切换时，减少效果持续时间
    if (action.type === 'SWITCH_TURN') {
        const state = store.getState();

        // 处理冻结效果
        state.frozenPieces.forEach(frozen => {
            frozen.duration--;
            if (frozen.duration <= 0) {
                store.dispatch({
                    type: 'REMOVE_FROZEN_PIECE',
                    payload: { piece: frozen.piece }
                });
            }
        });
    }

    return result;
};

/**
 * 组合多个中间件
 */
export function applyMiddleware(...middlewares) {
    return (createStore) => (reducer, initialState) => {
        const store = createStore(reducer, initialState);

        let dispatch = store.dispatch;

        const middlewareAPI = {
            getState: store.getState,
            dispatch: (action) => dispatch(action)
        };

        const chain = middlewares.map(middleware => middleware(middlewareAPI));
        dispatch = chain.reduceRight((next, middleware) => middleware(next), store.dispatch);

        return {
            ...store,
            dispatch
        };
    };
}
