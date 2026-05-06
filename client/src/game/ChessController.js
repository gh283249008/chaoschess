export class ChessController {
    constructor(app) {
        this.app = app;
        this.lastInvalidMoveReason = '';
    }

    handleChessClick(gridX, gridY) {
        if (this.app.getCurrentTurnMovesLeft() <= 0) {
            this.app.showNotification('当前走棋次数已耗尽，立即切换下一回合', 'warning');
            this.app.switchPlayer();
            return false;
        }

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
        this.lastInvalidMoveReason = '';
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
            if (!plugin) return false;
            const valid = plugin.validateMove(piece, from, to, boardState);
            if (!valid && typeof plugin.explainInvalidMove === 'function') {
                this.lastInvalidMoveReason = plugin.explainInvalidMove(piece, from, to, boardState) || '';
            }
            return valid;
        }

        if (piece.pluginSource === 'FlipChess') {
            const plugin = this.app.pluginManager.getPlugin('pieces', 'FlipChess');
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
        this.app.showNotification(this.lastInvalidMoveReason || '移动无效！请检查移动规则', 'warning');
    }

    applyMove(gridX, gridY) {
        const piece = this.app.selectedPiece;
        const from = { x: piece.x, y: piece.y };
        const to = { x: gridX, y: gridY };
        const target = this.app.board.getPieceAt(gridX, gridY);
        const roundWinByCapture = target ? this.isRoundWinningCapture(target) : false;

        if (target && piece.pluginSource !== 'FlipChess') {
            this.app.board.removePiece(target);
            console.log(`${piece.type} captured ${target.type}`);
            this.app.onPieceCaptured(target, this.app.currentPlayer);

            const killerName = `${this.app.currentPlayer === 'red' ? '🔴' : '⚫'}${piece.type}`;
            const victimName = `${target.player === 'red' ? '🔴' : '⚫'}${target.type}`;
            this.app.showKillFeed(killerName, victimName);

        }

        if (target && piece.pluginSource === 'FlipChess') {
            this.app.showNotification('翻转棋不能直接吃子，只能通过夹击翻转夺取占有权', 'warning');
            return false;
        }

        piece.x = gridX;
        piece.y = gridY;
        piece.hasMoved = true;

        const flipped = this.app.resolveFlipCapture(piece);
        if (piece.pluginSource === 'FlipChess') {
            this.app.showNotification(`移动翻转棋（视为一步走棋）${flipped.length > 0 ? `，翻转 ${flipped.length} 枚敌子` : ''}`, 'success');
        }

        this.applyCastlingIfNeeded(piece, from, to);

        const promotionPending = this.handlePieceMovedCallback(piece, from, to);
        this.app.selectedPiece = null;

        if (roundWinByCapture) {
            this.app.endCurrentRound(this.app.currentPlayer, '击杀主将');
            this.app.render();
            return true;
        }

        if (!promotionPending) {
            this.app.consumeMoveStep(1);
        }
        this.app.render();
        return true;
    }

    applyCastlingIfNeeded(piece, from, to) {
        if (!piece || piece.pluginSource !== 'InternationalChess' || piece.type !== 'King') {
            return;
        }
        if (from.y !== to.y || Math.abs(to.x - from.x) !== 2) {
            return;
        }

        const isKingSide = to.x > from.x;
        const rookFromX = isKingSide ? 7 : 0;
        const rookToX = isKingSide ? to.x - 1 : to.x + 1;
        const rook = this.app.board.getPieceAt(rookFromX, from.y);
        if (!rook || rook.pluginSource !== 'InternationalChess' || rook.type !== 'Rook' || rook.player !== piece.player) {
            return;
        }

        rook.x = rookToX;
        rook.y = from.y;
        rook.hasMoved = true;
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
        this.app.consumeMoveStep(1);
        this.app.render();
    }
}
