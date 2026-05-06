export class TurnController {
    constructor(app) {
        this.app = app;
    }

    switchPlayer() {
        this.resolveGoCaptures();

        if (this.app.getCurrentTurnMovesLeft() > 0) {
            this.app.showNotification(`本回合剩余走棋次数：${this.app.getCurrentTurnMovesLeft()}`, 'success');
            this.app.updateStatus(this.getTurnStatusText());
            return;
        }

        this.tickRiverBlock();
        this.tickSmokeEffects();

        this.app.currentPlayer = this.app.currentPlayer === 'red' ? 'black' : 'red';
        this.app.ensureTurnBudgetReady();

        const messages = this.app.effectManager.tickEffects(this.app.board.pieces, this.app.currentPlayer);
        messages.forEach(msg => this.app.showNotification(msg, 'info'));
        this.app.updateStatus(this.getTurnStatusText());
    }

    getTurnStatusText() {
        if (this.app.matchController?.matchState) {
            const score = this.app.matchController.matchState.score;
            return `第 ${this.app.matchController.matchState.currentRound} 局 | 比分 ${score.red}:${score.black} | 当前玩家: ${this.app.currentPlayer === 'red' ? '红方' : '黑方'} | 剩余走棋 ${this.app.getCurrentTurnMovesLeft()}`;
        }

        return `当前玩家: ${this.app.currentPlayer === 'red' ? '红方' : '黑方'} | 剩余走棋 ${this.app.getCurrentTurnMovesLeft()}`;
    }

    resolveGoCaptures() {
        if (!this.app.goPlugin || typeof this.app.goPlugin.checkCaptures !== 'function') {
            return;
        }

        const allPieces = this.app.board.pieces;
        const { captured, suicided } = this.app.goPlugin.checkCaptures(allPieces, this.app.currentPlayer);
        if (captured.length === 0 && suicided.length === 0) {
            return;
        }

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
    }

    tickRiverBlock() {
        if (!this.app.board.riverBlocked || this.app.riverBlockedTurns <= 0) {
            return;
        }

        this.app.riverBlockedTurns--;
        if (this.app.riverBlockedTurns === 0) {
            this.app.board.riverBlocked = false;
            this.app.showNotification('河道封锁已解除', 'info');
        }
    }

    tickSmokeEffects() {
        for (let i = this.app.board.smokeEffects.length - 1; i >= 0; i--) {
            const smoke = this.app.board.smokeEffects[i];
            smoke.turns--;
            if (smoke.turns <= 0) {
                this.app.board.smokeEffects.splice(i, 1);
                this.app.showNotification('烟雾已消散', 'info');
            }
        }
    }
}
