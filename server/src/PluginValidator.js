/**
 * 插件验证器
 * 服务端验证客户端发送的游戏操作
 */
export class PluginValidator {
    constructor(pluginManager) {
        this.pluginManager = pluginManager;
    }

    /**
     * 验证移动是否合法
     */
    validateMove(piece, from, to, gameState) {
        // 基础验证
        if (!piece || !from || !to) {
            return { valid: false, reason: 'Invalid parameters' };
        }

        // 边界检查
        if (to.x < 0 || to.x > 8 || to.y < 0 || to.y > 9) {
            return { valid: false, reason: 'Out of bounds' };
        }

        // 委托给插件验证
        try {
            const isValid = this.pluginManager.validateMove(piece, from, to, gameState);
            return { valid: isValid, reason: isValid ? 'Valid move' : 'Invalid move per plugin rules' };
        } catch (error) {
            return { valid: false, reason: `Validation error: ${error.message}` };
        }
    }

    /**
     * 验证围棋落子
     */
    validateGoPlacement(position, gameState) {
        const { x, y } = position;

        // 边界检查
        if (x < 0 || x > 8 || y < 0 || y > 9) {
            return { valid: false, reason: 'Out of bounds' };
        }

        // 检查位置是否已占用
        const occupied = gameState.pieces.find(p => p.x === x && p.y === y);
        if (occupied) {
            return { valid: false, reason: 'Position occupied' };
        }

        // 检查是否被禁止
        if (gameState.goBanned) {
            return { valid: false, reason: 'Go is banned' };
        }

        return { valid: true, reason: 'Valid placement' };
    }

    /**
     * 验证扑克出牌
     */
    validatePokerPlay(cards, playerHand) {
        // 检查是否有5张牌
        if (cards.length !== 5) {
            return { valid: false, reason: 'Must play exactly 5 cards' };
        }

        // 检查牌是否都在玩家手中
        const allInHand = cards.every(card =>
            playerHand.some(c => c.id === card.id)
        );

        if (!allInHand) {
            return { valid: false, reason: 'Cards not in player hand' };
        }

        return { valid: true, reason: 'Valid poker play' };
    }

    /**
     * 验证游戏状态一致性
     */
    validateGameState(clientState, serverState) {
        // 检查关键状态是否一致
        if (clientState.currentPlayer !== serverState.currentPlayer) {
            return { valid: false, reason: 'Current player mismatch' };
        }

        if (clientState.pieces.length !== serverState.pieces.length) {
            return { valid: false, reason: 'Piece count mismatch' };
        }

        return { valid: true, reason: 'State is consistent' };
    }
}
