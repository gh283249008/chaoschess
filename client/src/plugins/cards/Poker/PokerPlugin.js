import { CardPlugin } from '../../base/CardPlugin.js';
import { PokerDeck } from './Deck.js';
import { PokerHandEvaluator } from './Evaluator.js';
import { PokerEffects, HAND_EFFECTS } from './Effects.js';

/**
 * 扑克插件
 * 实现完整的扑克系统：牌堆、牌型评估、效果执行、对决系统
 */
export class PokerPlugin extends CardPlugin {
    constructor() {
        const config = {
            name: 'Poker',
            version: '1.0.0',
            author: 'Chaos Chess Team',
            description: '扑克插件 - 实现完整的扑克规则和效果系统',
            apiVersion: '1.0.0'
        };

        super(config);
        this.config = config;
        this.deck = new PokerDeck();
        this.evaluator = PokerHandEvaluator;
        this.effects = PokerEffects;
    }

    /**
     * 创建新牌堆
     */
    createDeck() {
        this.deck.reset();
        return this.deck;
    }

    /**
     * 发牌
     */
    dealCards(count) {
        return this.deck.deal(count);
    }

    /**
     * 发手牌（别名方法）
     */
    dealHand(count) {
        return this.dealCards(count);
    }

    /**
     * 评估手牌
     */
    evaluateHand(cards) {
        return this.evaluator.evaluate(cards);
    }

    /**
     * 比较两手牌
     */
    compareHands(handA, handB) {
        return this.evaluator.compare(handA, handB);
    }

    /**
     * 获取最佳手牌组合
     */
    getBestHand(cards) {
        return this.evaluator.getBestHand(cards);
    }

    /**
     * 执行效果
     */
    executeEffect(handType, context, callback) {
        return this.effects.execute(handType, context, callback);
    }

    /**
     * 执行目标选择效果
     */
    executeTargetEffect(handType, target, context) {
        return this.effects.executeTargetEffect(handType, target, context);
    }

    /**
     * 获取效果描述
     */
    getEffectDescription(handType) {
        return HAND_EFFECTS[handType] || '未知效果';
    }

    /**
     * 渲染扑克牌
     */
    renderCard(ctx, card, x, y, width, height, selected = false) {
        // 绘制卡牌背景
        ctx.fillStyle = 'white';
        ctx.strokeStyle = selected ? '#FFD700' : '#333';
        ctx.lineWidth = selected ? 3 : 2;

        // 圆角矩形
        const radius = 10;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 设置颜色（红心和方块为红色）
        const isRed = ['♥', '♦'].includes(card.suit);
        ctx.fillStyle = isRed ? '#C8102E' : '#1a1a1a';

        // 绘制左上角
        ctx.font = `${height * 0.15}px Arial`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`${card.suit}${card.rank}`, x + width * 0.1, y + height * 0.05);

        // 绘制中央花色
        ctx.font = `${height * 0.4}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(card.suit, x + width / 2, y + height / 2);

        // 绘制右下角（旋转180度）
        ctx.save();
        ctx.translate(x + width * 0.9, y + height * 0.95);
        ctx.rotate(Math.PI);
        ctx.font = `${height * 0.15}px Arial`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`${card.suit}${card.rank}`, 0, 0);
        ctx.restore();
    }

    /**
     * 渲染手牌
     */
    renderHand(ctx, cards, x, y, cardWidth, cardHeight, selectedCards = []) {
        const spacing = cardWidth * 1.1;

        cards.forEach((card, index) => {
            const cardX = x + index * spacing;
            const cardY = y;
            const isSelected = selectedCards.some(c => c.id === card.id);

            // 选中的牌向上移动
            const offsetY = isSelected ? -20 : 0;

            this.renderCard(ctx, card, cardX, cardY + offsetY, cardWidth, cardHeight, isSelected);
        });
    }
}
