/**
 * 状态效果系统
 * 管理所有棋子的状态效果（冻结、中毒、护盾等）
 */
export class StatusEffectManager {
    constructor() {
        // 注册的效果类型
        this.effectTypes = new Map();

        // 初始化内置效果
        this.registerBuiltInEffects();
    }

    /**
     * 注册内置效果
     */
    registerBuiltInEffects() {
        // 冻结效果
        this.registerEffect('freeze', {
            name: '冻结',
            icon: '❄️',
            color: '#00BFFF',
            onApply: (piece, duration) => {
                piece.frozen = duration;
                return `${piece.type} 被冻结了！`;
            },
            onTick: (piece, currentPlayer) => {
                // 只有当前玩家的冻结状态才减少
                if (piece.player === currentPlayer && piece.frozen > 0) {
                    piece.frozen--;
                    if (piece.frozen === 0) {
                        delete piece.frozen;
                        return { removed: true, message: `${piece.type} 已解冻！` };
                    }
                }
                return { removed: false };
            },
            canMove: (piece) => {
                return !piece.frozen || piece.frozen === 0;
            },
            render: (ctx, piece, x, y) => {
                if (piece.frozen && piece.frozen > 0) {
                    // 蓝色冰冻边框
                    ctx.strokeStyle = '#00BFFF';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(x, y, 28, 0, Math.PI * 2);
                    ctx.stroke();

                    // 显示剩余回合数
                    ctx.fillStyle = '#00BFFF';
                    ctx.font = 'bold 14px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`❄${piece.frozen}`, x, y + 35);
                }
            }
        });
    }

    /**
     * 注册自定义效果
     * @param {string} effectId - 效果ID
     * @param {Object} effectConfig - 效果配置
     */
    registerEffect(effectId, effectConfig) {
        this.effectTypes.set(effectId, effectConfig);
    }

    /**
     * 应用效果到棋子
     * @param {Object} piece - 棋子对象
     * @param {string} effectId - 效果ID
     * @param {number} duration - 持续回合数
     * @returns {string} 提示消息
     */
    applyEffect(piece, effectId, duration) {
        const effect = this.effectTypes.get(effectId);
        if (!effect) {
            console.error(`Unknown effect: ${effectId}`);
            return '';
        }
        return effect.onApply(piece, duration);
    }

    /**
     * 更新所有棋子的效果（每回合调用）
     * @param {Array} pieces - 所有棋子
     * @param {string} currentPlayer - 当前玩家
     * @returns {Array} 提示消息列表
     */
    tickEffects(pieces, currentPlayer) {
        const messages = [];

        pieces.forEach(piece => {
            this.effectTypes.forEach((effect, effectId) => {
                const result = effect.onTick(piece, currentPlayer);
                if (result.removed && result.message) {
                    messages.push(result.message);
                }
            });
        });

        return messages;
    }

    /**
     * 检查棋子是否可以移动
     * @param {Object} piece - 棋子对象
     * @returns {Object} { canMove: boolean, reason: string }
     */
    canPieceMove(piece) {
        for (const [effectId, effect] of this.effectTypes) {
            if (!effect.canMove(piece)) {
                // 找出阻止移动的效果
                const effectName = effect.name;
                let duration = 0;

                if (piece.frozen) duration = piece.frozen;
                else if (piece.stunned) duration = piece.stunned;

                return {
                    canMove: false,
                    reason: `该棋子被${effectName}，还剩${duration}回合！`
                };
            }
        }
        return { canMove: true };
    }

    /**
     * 渲染棋子的所有效果
     * @param {CanvasRenderingContext2D} ctx - Canvas上下文
     * @param {Object} piece - 棋子对象
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     */
    renderEffects(ctx, piece, x, y) {
        this.effectTypes.forEach(effect => {
            effect.render(ctx, piece, x, y);
        });
    }

    /**
     * 移除棋子的所有效果
     * @param {Object} piece - 棋子对象
     */
    clearEffects(piece) {
        delete piece.frozen;
    }

    /**
     * 获取棋子的所有活跃效果
     * @param {Object} piece - 棋子对象
     * @returns {Array} 效果列表
     */
    getActiveEffects(piece) {
        const active = [];

        this.effectTypes.forEach((effect, effectId) => {
            if (piece[effectId] && piece[effectId] > 0) {
                active.push({
                    id: effectId,
                    name: effect.name,
                    icon: effect.icon,
                    duration: piece[effectId]
                });
            }
        });

        return active;
    }
}
