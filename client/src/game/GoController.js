export class GoController {
    constructor(app) {
        this.app = app;
    }

    handleGoClick(gridX, gridY) {
        if (this.app.getCurrentTurnMovesLeft() <= 0) {
            this.app.showNotification('当前走棋次数已耗尽，立即切换下一回合', 'warning');
            this.app.switchPlayer();
            return false;
        }

        const occupied = this.app.board.getPieceAt(gridX, gridY);
        if (occupied) {
            console.log(`Position (${gridX}, ${gridY}) is occupied`);
            return false;
        }

        if (this.isBlockedByEnemySmoke(gridX, gridY)) {
            console.log('Cannot place in opponent smoke (silently blocked)');
            return false;
        }

        const wantsFlip = this.app.placeModePieceType === 'flip';
        const flipStock = this.app.matchController?.getFlipChessStock(this.app.currentPlayer) || 0;
        if (wantsFlip) {
            if (flipStock <= 0) {
                this.app.showNotification('翻转棋库存不足，请切换为围棋子或先购买翻转棋', 'warning');
                return false;
            }

            const flipPiece = this.app.createFlipPiece(gridX, gridY, this.app.currentPlayer);
            this.app.board.addPiece(flipPiece);
            this.app.matchController.consumeFlipChessStock(this.app.currentPlayer);
            const flipped = this.app.resolveFlipCapture(flipPiece);
            const flippedCount = flipped.length;
            this.app.showNotification(`放置翻转棋（视为一步走棋）${flippedCount > 0 ? `，翻转 ${flippedCount} 枚敌子` : ''}`, 'success');
            this.app.consumeMoveStep(1);
            this.app.render();
            if (this.app.ui?.renderRoundShop) {
                this.app.ui.renderRoundShop();
            }
            return true;
        }

        console.log(`Placing ${this.app.currentPlayer} stone at (${gridX}, ${gridY})`);

        const stone = this.app.goPlugin.placeStone(gridX, gridY, this.app.currentPlayer, this.app.board.getState());
        this.app.board.addPiece(stone);
        this.app.showNotification('放置围棋子（视为一步走棋）', 'info');

        this.app.consumeMoveStep(1);
        this.app.render();
        return true;
    }

    isBlockedByEnemySmoke(gridX, gridY) {
        if (!this.app.board.smokeEffects || this.app.board.smokeEffects.length === 0) {
            return false;
        }

        return this.app.board.smokeEffects.some(smoke => {
            if (smoke.player === this.app.currentPlayer) {
                return false;
            }

            return Math.abs(gridX - smoke.x) <= 1 && Math.abs(gridY - smoke.y) <= 1;
        });
    }
}
