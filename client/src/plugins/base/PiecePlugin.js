/**
 * 棋子插件基类
 * 所有棋类插件都必须继承此类并实现必要的方法
 */
export class PiecePlugin {
    constructor(config) {
        this.name = config.name;
        this.version = config.version;
        this.author = config.author || 'Unknown';
        this.description = config.description || '';
    }

    /**
     * 获取该插件支持的所有棋子类型
     * @returns {Array<string>} 棋子类型数组
     */
    getPieceTypes() {
        throw new Error(`${this.name}: Must implement getPieceTypes()`);
    }

    /**
     * 验证移动是否合法
     * @param {Object} piece - 棋子对象
     * @param {Object} from - 起始位置 {x, y}
     * @param {Object} to - 目标位置 {x, y}
     * @param {Object} boardState - 当前棋盘状态
     * @returns {boolean} 是否合法
     */
    validateMove(piece, from, to, boardState) {
        throw new Error(`${this.name}: Must implement validateMove()`);
    }

    /**
     * 渲染棋子
     * @param {CanvasRenderingContext2D} ctx - Canvas上下文
     * @param {Object} piece - 棋子对象
     * @param {number} x - 屏幕X坐标
     * @param {number} y - 屏幕Y坐标
     * @param {number} size - 格子大小
     */
    render(ctx, piece, x, y, size) {
        throw new Error(`${this.name}: Must implement render()`);
    }

    /**
     * 获取初始棋盘布局（可选）
     * @returns {Array<Object>} 棋子数组
     */
    getInitialSetup() {
        return [];
    }

    /**
     * 棋子放置时的回调（可选）
     * @param {Object} piece - 棋子对象
     * @param {Object} position - 位置 {x, y}
     * @param {Object} boardState - 棋盘状态
     */
    onPiecePlaced(piece, position, boardState) {
        // 可选实现
    }

    /**
     * 棋子被吃时的回调（可选）
     * @param {Object} piece - 被吃的棋子
     * @param {Object} boardState - 棋盘状态
     */
    onPieceCaptured(piece, boardState) {
        // 可选实现
    }

    /**
     * 棋子移动后的回调（可选）
     * @param {Object} piece - 棋子对象
     * @param {Object} from - 起始位置
     * @param {Object} to - 目标位置
     * @param {Object} boardState - 棋盘状态
     */
    onPieceMoved(piece, from, to, boardState) {
        // 可选实现
    }
}
