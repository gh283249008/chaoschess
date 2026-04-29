/**
 * Redux-like Store
 * 集中式状态管理
 */
export class Store {
    constructor(reducer, initialState = {}, enhancer) {
        if (typeof enhancer !== 'undefined') {
            return enhancer(this.createStore.bind(this))(reducer, initialState);
        }

        this.reducer = reducer;
        this.state = initialState;
        this.listeners = [];
    }

    createStore(reducer, initialState) {
        return new Store(reducer, initialState);
    }

    /**
     * 获取当前状态
     */
    getState() {
        return this.state;
    }

    /**
     * 派发action
     */
    dispatch(action) {
        if (!action || typeof action.type !== 'string') {
            throw new Error('Actions must have a type property');
        }

        // 执行reducer更新状态
        this.state = this.reducer(this.state, action);

        // 通知所有订阅者
        this.listeners.forEach(listener => listener(this.state));

        return action;
    }

    /**
     * 订阅状态变化
     */
    subscribe(listener) {
        if (typeof listener !== 'function') {
            throw new Error('Listener must be a function');
        }

        this.listeners.push(listener);

        // 返回取消订阅函数
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * 替换reducer（用于热重载）
     */
    replaceReducer(nextReducer) {
        this.reducer = nextReducer;
        this.dispatch({ type: '@@INIT' });
    }
}

/**
 * 创建store的辅助函数
 */
export function createStore(reducer, initialState, enhancer) {
    return new Store(reducer, initialState, enhancer);
}
