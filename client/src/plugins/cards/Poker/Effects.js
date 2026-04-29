/**
 * 扑克效果系统
 * 定义10种牌型对应的效果
 */
export const HAND_EFFECTS = {
    0: "高牌：悔棋一次",
    1: "一对：冻结敌方棋子",
    2: "两对：禁敌方一回合",
    3: "三条：空地生兵",
    4: "顺子：封锁河道",
    5: "同花：烟雾弹 3x3",
    6: "葫芦：建造墙壁",
    7: "四条：清空围棋并禁手",
    8: "同花顺：处决任意棋子",
    9: "皇家同花顺：3x3 区域毁灭"
};

/**
 * 扑克效果执行器
 */
export class PokerEffects {
    /**
     * 执行牌型效果
     * @param {number} handType - 牌型类型 (0-9)
     * @param {Object} context - 游戏上下文
     * @param {Function} callback - 效果执行完成后的回调
     * @returns {Object} 效果执行结果
     */
    static execute(handType, context, callback) {
        const { gameState, currentPlayer } = context;

        switch (handType) {
            case 0: // High Card: Undo
                return {
                    type: 'immediate',
                    action: 'undo',
                    message: '悔棋一次'
                };

            case 2: // Two Pair: Extra Turns
                return {
                    type: 'immediate',
                    action: 'extra_turns',
                    message: '获得额外行动机会！您可以连续行动2回合。',
                    effect: { extraTurns: 1 }  // 只需要1次额外回合，因为当前回合已经算1次了
                };

            case 4: // Straight: River Block
                return {
                    type: 'immediate',
                    action: 'block_river',
                    message: '河道已封锁！下回合双方棋子不可过河。',
                    effect: { riverBlocked: true }
                };

            case 7: // Four: Ban Go
                return {
                    type: 'immediate',
                    action: 'ban_go',
                    message: '场上围棋已清空，且禁止再下围棋！',
                    effect: { goBanned: true, clearGoStones: true }
                };

            // 需要选择目标的效果
            case 1: // Pair: Freeze Piece
            case 3: // Three: Spawn Soldier
            case 5: // Flush: Smoke
            case 6: // Full House: Wall
            case 8: // SF: Kill Piece
            case 9: // Royal: Nuke
                return {
                    type: 'target_selection',
                    handType,
                    message: `🔥 ${this.getEffectName(handType)}生效！请在棋盘上选择目标！`
                };

            default:
                return {
                    type: 'none',
                    message: '未知效果'
                };
        }
    }

    /**
     * 处理目标选择效果
     * @param {number} handType - 牌型类型
     * @param {Object} target - 目标位置 {x, y}
     * @param {Object} context - 游戏上下文
     * @returns {Object} 效果执行结果
     */
    static executeTargetEffect(handType, target, context) {
        const { x, y } = target;
        const { gameState, currentPlayer } = context;

        switch (handType) {
            case 1: // Pair: Freeze Enemy Piece
                const piece = gameState.getPieceAt(x, y);
                if (piece && piece.player !== currentPlayer) {
                    return {
                        success: true,
                        action: 'freeze_piece',
                        target: piece,
                        duration: 2,
                        message: `${piece.type} 被冻结了！`
                    };
                }
                return { success: false };

            case 3: // Three: Spawn Pawn
                if (!gameState.getPieceAt(x, y)) {
                    const isMyHalf = (currentPlayer === 'red' && y >= 5) || (currentPlayer === 'black' && y <= 4);
                    if (isMyHalf) {
                        return {
                            success: true,
                            action: 'spawn_piece',
                            piece: {
                                type: 'Pawn',  // 国际象棋小兵
                                x,
                                y,
                                player: currentPlayer,
                                pluginSource: 'InternationalChess'
                            },
                            message: `成功部署国际象棋小兵！`
                        };
                    }
                }
                return { success: false };

            case 5: // Flush: Smoke Bomb
                return {
                    success: true,
                    action: 'create_smoke',
                    zone: { x: x - 1, y: y - 1, w: 3, h: 3, player: currentPlayer },
                    message: '烟雾弹已部署！'
                };

            case 6: // Full House: Wall
                if (!gameState.getPieceAt(x, y) && !gameState.getGoStoneAt(x, y)) {
                    return {
                        success: true,
                        action: 'create_wall',
                        position: { x, y },
                        message: '墙壁已建造！'
                    };
                }
                return { success: false };

            case 8: // Straight Flush: Kill Piece
                const targetPiece = gameState.getPieceAt(x, y);
                if (targetPiece && !['将', '帅'].includes(targetPiece.type)) {
                    return {
                        success: true,
                        action: 'kill_piece',
                        target: targetPiece,
                        message: `${targetPiece.type} 被处决了！`
                    };
                }
                return { success: false };

            case 9: // Royal Flush: Nuke 3x3
                const toRemove = [];
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        const p = gameState.getPieceAt(nx, ny);
                        if (p && !['将', '帅'].includes(p.type)) {
                            toRemove.push(p);
                        }
                        const stone = gameState.getGoStoneAt(nx, ny);
                        if (stone) toRemove.push(stone);
                    }
                }
                return {
                    success: true,
                    action: 'nuke_area',
                    targets: toRemove,
                    message: `区域毁灭！移除了 ${toRemove.length} 个目标！`
                };

            default:
                return { success: false };
        }
    }

    static getEffectName(handType) {
        const names = {
            1: '一对',
            3: '三条',
            5: '同花',
            6: '葫芦',
            8: '同花顺',
            9: '皇家同花顺'
        };
        return names[handType] || '未知';
    }
}
