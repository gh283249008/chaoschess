/**
 * 事件处理器
 * 处理所有用户交互事件
 */
export class EventHandler {
    constructor(canvas, renderer, store, pluginManager) {
        this.canvas = canvas;
        this.renderer = renderer;
        this.store = store;
        this.pluginManager = pluginManager;

        this.setupEventListeners();
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasHover(e));

        // 键盘事件
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    /**
     * 处理画布点击事件
     */
    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // 转换为棋盘坐标
        const { x: gridX, y: gridY } = this.renderer.screenToGrid(clickX, clickY);

        // 边界检查
        if (gridX < 0 || gridX > 8 || gridY < 0 || gridY > 9) return;

        const state = this.store.getState();

        // 根据游戏模式处理点击
        if (state.gameMode === 'go') {
            this.handleGoClick(gridX, gridY);
        } else {
            this.handleChessClick(gridX, gridY);
        }
    }

    /**
     * 处理围棋模式点击
     */
    handleGoClick(gridX, gridY) {
        const state = this.store.getState();

        // 检查位置是否已占用
        const occupied = state.pieces.find(p => p.x === gridX && p.y === gridY);
        if (occupied) {
            console.log(`Position (${gridX}, ${gridY}) is occupied`);
            return;
        }

        console.log(`Placing ${state.currentPlayer} stone at (${gridX}, ${gridY})`);

        // 派发放置围棋子的action
        this.store.dispatch({
            type: 'PLACE_GO_STONE',
            payload: {
                stone: {
                    x: gridX,
                    y: gridY,
                    player: state.currentPlayer,
                    pluginSource: 'Go',
                    type: 'stone'
                }
            }
        });

        // TODO: 检查提子逻辑

        // 切换回合
        this.store.dispatch({ type: 'SWITCH_TURN' });
    }

    /**
     * 处理象棋模式点击
     */
    handleChessClick(gridX, gridY) {
        const state = this.store.getState();
        const piece = state.pieces.find(p => p.x === gridX && p.y === gridY);

        if (state.selectedPiece) {
            // 尝试移动
            const from = { x: state.selectedPiece.x, y: state.selectedPiece.y };
            const to = { x: gridX, y: gridY };

            if (this.pluginManager.validateMove(state.selectedPiece, from, to, state)) {
                // 吃子
                const target = state.pieces.find(p => p.x === gridX && p.y === gridY);
                if (target) {
                    this.store.dispatch({
                        type: 'REMOVE_PIECE',
                        payload: { piece: target }
                    });
                    console.log(`${state.selectedPiece.type} captured ${target.type}`);
                }

                // 移动
                this.store.dispatch({
                    type: 'MOVE_PIECE',
                    payload: {
                        piece: state.selectedPiece,
                        from,
                        to
                    }
                });

                // 切换回合
                this.store.dispatch({ type: 'SWITCH_TURN' });
            } else {
                // 取消选择
                this.store.dispatch({
                    type: 'SELECT_PIECE',
                    payload: { piece: null }
                });
            }
        } else if (piece && piece.player === state.currentPlayer && piece.pluginSource === 'ChineseChess') {
            // 选择棋子
            this.store.dispatch({
                type: 'SELECT_PIECE',
                payload: { piece }
            });
        }
    }

    /**
     * 处理画布悬停事件
     */
    handleCanvasHover(e) {
        const rect = this.canvas.getBoundingClientRect();
        const hoverX = e.clientX - rect.left;
        const hoverY = e.clientY - rect.top;

        const { x: gridX, y: gridY } = this.renderer.screenToGrid(hoverX, hoverY);

        // 可以在这里添加悬停效果，比如高亮可移动位置
        // TODO: 实现悬停高亮
    }

    /**
     * 处理键盘事件
     */
    handleKeyPress(e) {
        const state = this.store.getState();

        switch (e.key) {
            case 'p':
            case 'P':
                // 切换扑克面板
                // TODO: 派发action
                break;

            case 'z':
            case 'Z':
                if (e.ctrlKey || e.metaKey) {
                    // 悔棋
                    this.store.dispatch({ type: 'UNDO' });
                    e.preventDefault();
                }
                break;

            case 'Escape':
                // 取消选择
                this.store.dispatch({
                    type: 'SELECT_PIECE',
                    payload: { piece: null }
                });
                break;
        }
    }

    /**
     * 处理扑克牌点击
     */
    handleCardClick(card) {
        const state = this.store.getState();

        // 切换卡牌选中状态
        const isSelected = state.selectedCards.some(c => c.id === card.id);

        if (isSelected) {
            this.store.dispatch({
                type: 'DESELECT_CARD',
                payload: { card }
            });
        } else if (state.selectedCards.length < 5) {
            this.store.dispatch({
                type: 'SELECT_CARD',
                payload: { card }
            });
        }
    }

    /**
     * 移除所有事件监听器
     */
    destroy() {
        // 清理事件监听器
        this.canvas.removeEventListener('click', this.handleCanvasClick);
        this.canvas.removeEventListener('mousemove', this.handleCanvasHover);
        document.removeEventListener('keydown', this.handleKeyPress);
    }
}
