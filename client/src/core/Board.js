/**
 * 通用棋盘类
 * 不依赖于具体的游戏规则
 */
export class Board {
    constructor(width = 8, height = 9) {
        this.width = width;
        this.height = height;
        this.pieces = [];  // 所有棋子（来自不同插件）
        this.riverBlocked = false; // 河道封锁状态
        this.smokeEffects = []; // 烟雾弹效果列表 [{x, y, player, turns}]
    }

    /**
     * 添加棋子到棋盘
     * @param {Object} piece - 棋子对象
     */
    addPiece(piece) {
        this.pieces.push(piece);
    }

    /**
     * 移除棋子
     * @param {Object} piece - 要移除的棋子
     */
    removePiece(piece) {
        const index = this.pieces.indexOf(piece);
        if (index > -1) {
            this.pieces.splice(index, 1);
        }
    }

    /**
     * 获取指定位置的棋子
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {string} pluginSource - 可选：指定插件来源
     * @returns {Object|null} 棋子对象或null
     */
    getPieceAt(x, y, pluginSource = null) {
        return this.pieces.find(p => {
            const matchesPosition = p.x === x && p.y === y;
            const matchesPlugin = pluginSource ? p.pluginSource === pluginSource : true;
            return matchesPosition && matchesPlugin;
        }) || null;
    }

    /**
     * 获取所有指定插件的棋子
     * @param {string} pluginSource - 插件名称
     * @returns {Array<Object>} 棋子数组
     */
    getPiecesByPlugin(pluginSource) {
        return this.pieces.filter(p => p.pluginSource === pluginSource);
    }

    /**
     * 获取指定玩家的所有棋子
     * @param {string} player - 玩家标识
     * @returns {Array<Object>} 棋子数组
     */
    getPiecesByPlayer(player) {
        return this.pieces.filter(p => p.player === player);
    }

    /**
     * 移动棋子
     * @param {Object} piece - 棋子对象
     * @param {number} toX - 目标X坐标
     * @param {number} toY - 目标Y坐标
     */
    movePiece(piece, toX, toY) {
        piece.x = toX;
        piece.y = toY;
    }

    /**
     * 检查位置是否在棋盘范围内
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @returns {boolean} 是否有效
     */
    isValidPosition(x, y) {
        return x >= 0 && x <= this.width && y >= 0 && y <= this.height;
    }

    /**
     * 清空棋盘
     */
    clear() {
        this.pieces = [];
    }

    /**
     * 获取棋盘状态快照
     * @returns {Object} 状态对象
     */
    getState() {
        return {
            width: this.width,
            height: this.height,
            pieces: JSON.parse(JSON.stringify(this.pieces)),
            riverBlocked: this.riverBlocked,
            smokeEffects: JSON.parse(JSON.stringify(this.smokeEffects))
        };
    }

    /**
     * 从状态恢复棋盘
     * @param {Object} state - 状态对象
     */
    setState(state) {
        this.width = state.width;
        this.height = state.height;
        this.pieces = JSON.parse(JSON.stringify(state.pieces));
    }
}
