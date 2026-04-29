/**
 * 卡牌插件基类
 * 所有卡牌系统插件都必须继承此类并实现必要的方法
 */
export class CardPlugin {
    constructor(config) {
        this.name = config.name;
        this.version = config.version;
        this.author = config.author || 'Unknown';
        this.description = config.description || '';
    }

    /**
     * 创建牌堆
     * @returns {Array<Object>} 卡牌数组
     */
    createDeck() {
        throw new Error(`${this.name}: Must implement createDeck()`);
    }

    /**
     * 评估手牌
     * @param {Array<Object>} cards - 手牌数组
     * @returns {Object} 评估结果
     */
    evaluateHand(cards) {
        throw new Error(`${this.name}: Must implement evaluateHand()`);
    }

    /**
     * 执行卡牌效果
     * @param {Object} effect - 效果对象
     * @param {Object} context - 游戏上下文
     * @returns {Object} 执行结果
     */
    executeEffect(effect, context) {
        throw new Error(`${this.name}: Must implement executeEffect()`);
    }

    /**
     * 渲染卡牌
     * @param {CanvasRenderingContext2D} ctx - Canvas上下文
     * @param {Object} card - 卡牌对象
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {number} width - 宽度
     * @param {number} height - 高度
     */
    renderCard(ctx, card, x, y, width, height) {
        throw new Error(`${this.name}: Must implement renderCard()`);
    }

    /**
     * 抽牌时的回调（可选）
     * @param {Object} card - 抽到的卡牌
     * @param {string} player - 玩家
     */
    onCardDrawn(card, player) {
        // 可选实现
    }

    /**
     * 出牌时的回调（可选）
     * @param {Array<Object>} cards - 打出的卡牌
     * @param {string} player - 玩家
     */
    onCardPlayed(cards, player) {
        // 可选实现
    }

    /**
     * 验证出牌是否合法（可选）
     * @param {Array<Object>} cards - 要打出的卡牌
     * @param {Object} gameState - 游戏状态
     * @returns {boolean} 是否合法
     */
    validatePlay(cards, gameState) {
        return true; // 默认允许
    }

    /**
     * 效果执行后的回调（可选）
     * @param {Object} effect - 执行的效果
     * @param {Object} result - 执行结果
     */
    onEffectExecuted(effect, result) {
        // 可选实现
    }
}
