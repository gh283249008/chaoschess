export class ChessController {
    constructor(app) {
        this.app = app;
    }

    handleChessClick(gridX, gridY) {
        const clickedPiece = this.app.board.getPieceAt(gridX, gridY);

        if (this.trySelectPiece(clickedPiece)) {
            return false;
        }

        if (!this.app.selectedPiece) {
            return false;
        }

        const valid = this.validateSelectedPieceMove(gridX, gridY);
        if (!valid) {
            this.handleInvalidMove(gridX, gridY);
            return false;
        }

        return this.applyMove(gridX, gridY);
    }

    trySelectPiece(clickedPiece) {
        if (!clickedPiece || clickedPiece.player !== this.app.currentPlayer || clickedPiece.pluginSource === 'Go') {
            return false;
        }

        const result = this.app.effectManager.canPieceMove(clickedPiece);
        if (!result.canMove) {
            this.app.showNotification(result.reason, 'warning');
            return true;
        }

        this.app.selectedPiece = clickedPiece;
        this.app.render();
        return true;
    }

    validateSelectedPieceMove(gridX, gridY) {
        const piece = this.app.selectedPiece;
        if (!piece) return false;

        const from = { x: piece.x, y: piece.y };
        const to = { x: gridX, y: gridY };
        const boardState = this.app.board.getState();

        if (piece.pluginSource === 'ChineseChess' || !piece.pluginSource) {
            const plugin = this.app.pluginManager.getPlugin('pieces', 'ChineseChess');
            return plugin ? plugin.validateMove(piece, from, to, boardState) : false;
        }

        if (piece.pluginSource === 'InternationalChess') {
            const plugin = this.app.pluginManager.getPlugin('pieces', 'InternationalChess');
            return plugin ? plugin.validateMove(piece, from, to, boardState) : false;
        }

        return false;
    }

    handleInvalidMove(gridX, gridY) {
        const piece = this.app.selectedPiece;
        if (!piece) return;

        console.log(`Invalid move: ${piece.type} from (${piece.x},${piece.y}) to (${gridX},${gridY})`);
        if (piece.pluginSource === 'ChineseChess' || !piece.pluginSource) {
            console.log('Using ChineseChess logic');
        } else {
            console.log('Using InternationalChess logic');
        }
        this.app.showNotification('移动无效！请检查移动规则', 'warning');
    }

    applyMove(gridX, gridY) {
        const piece = this.app.selectedPiece;
        const target = this.app.board.getPieceAt(gridX, gridY);
        const roundWinByCapture = target ? this.isRoundWinningCapture(target) : false;

        if (target) {
            this.app.board.removePiece(target);
            console.log(`${piece.type} captured ${target.type}`);
            this.app.onPieceCaptured(target, this.app.currentPlayer);

            const killerName = `${this.app.currentPlayer === 'red' ? '🔴' : '⚫'}${piece.type}`;
            const victimName = `${target.player === 'red' ? '🔴' : '⚫'}${target.type}`;
            this.app.showKillFeed(killerName, victimName);

        }

        const from = { x: piece.x, y: piece.y };
        const to = { x: gridX, y: gridY };

        piece.x = gridX;
        piece.y = gridY;

        const promotionPending = this.handlePieceMovedCallback(piece, from, to);
        this.app.selectedPiece = null;

        if (roundWinByCapture) {
            this.app.endCurrentRound(this.app.currentPlayer, '击杀主将');
            this.app.render();
            return true;
        }

        if (!promotionPending) {
            this.app.switchPlayer();
        }
        this.app.render();
        return true;
    }

    isRoundWinningCapture(target) {
        if (!target) return false;
        const type = String(target.type || '');
        return type === '将' || type === '帅' || type === 'King' || type === 'king';
    }

    handlePieceMovedCallback(piece, from, to) {
        const pluginName = piece.pluginSource;
        if (!pluginName) return false;

        const plugin = this.app.pluginManager.getPlugin('pieces', pluginName);
        if (!plugin || typeof plugin.onPieceMoved !== 'function') {
            return false;
        }

        const result = plugin.onPieceMoved(piece, from, to, this.app.board.getState());
        if (!result || result.action !== 'promotion') {
            return false;
        }

        this.app.pendingPromotionPiece = result.piece;
        this.showPromotionModal();
        return true;
    }

    showPromotionModal() {
        const modal = document.getElementById('promotion-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    handlePromotion(type) {
        if (!this.app.pendingPromotionPiece) {
            return;
        }

        console.log(`Promoting piece to ${type}`);
        this.app.pendingPromotionPiece.type = type;
        this.app.pendingPromotionPiece = null;

        const modal = document.getElementById('promotion-modal');
        if (modal) {
            modal.style.display = 'none';
        }

        this.app.showNotification(`成功升变为 ${type}`, 'success');
        this.app.switchPlayer();
        this.app.render();
    }
}
