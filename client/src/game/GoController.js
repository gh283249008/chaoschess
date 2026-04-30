export class GoController {
    constructor(app) {
        this.app = app;
    }

    handleGoClick(gridX, gridY) {
        const occupied = this.app.board.getPieceAt(gridX, gridY);
        if (occupied) {
            console.log(`Position (${gridX}, ${gridY}) is occupied`);
            return false;
        }

        if (this.isBlockedByEnemySmoke(gridX, gridY)) {
            console.log('Cannot place in opponent smoke (silently blocked)');
            return false;
        }

        console.log(`Placing ${this.app.currentPlayer} stone at (${gridX}, ${gridY})`);

        const stone = this.app.goPlugin.placeStone(gridX, gridY, this.app.currentPlayer, this.app.board.getState());
        this.app.board.addPiece(stone);

        const allPieces = this.app.board.pieces;
        console.log(`Total pieces on board: ${allPieces.length}`);

        const { captured, suicided } = this.app.goPlugin.checkCaptures(allPieces, this.app.currentPlayer);
        console.log(`Captured: ${captured.length}, Suicided: ${suicided.length}`);

        [...captured, ...suicided].forEach(piece => {
            console.log(`Removing ${piece.pluginSource} piece at (${piece.x}, ${piece.y}), player: ${piece.player}`);
            this.app.board.removePiece(piece);

            if (captured.includes(piece)) {
                this.app.onPieceCaptured(piece, this.app.currentPlayer);
                const killerName = `${this.app.currentPlayer === 'red' ? '🔴' : '⚫'}围棋`;
                const victimName = `${piece.player === 'red' ? '🔴' : '⚫'}${piece.type}`;
                this.app.showKillFeed(killerName, victimName, 'capture');
            }
        });

        if (captured.length > 0) {
            console.log(`✓ Captured ${captured.length} pieces`);
        }
        if (suicided.length > 0) {
            console.log(`✗ Suicided ${suicided.length} pieces`);
        }

        this.app.switchPlayer();
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
