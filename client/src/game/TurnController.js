export class TurnController {
    constructor(app) {
        this.app = app;
    }

    switchPlayer() {
        if (this.app.extraTurns > 0) {
            this.app.extraTurns--;
            console.log(`Extra turn! Remaining: ${this.app.extraTurns}`);
            this.app.showNotification(`额外行动机会！剩余 ${this.app.extraTurns} 次`, 'success');
            return;
        }

        this.tickRiverBlock();
        this.tickSmokeEffects();

        this.app.currentPlayer = this.app.currentPlayer === 'red' ? 'black' : 'red';

        const messages = this.app.effectManager.tickEffects(this.app.board.pieces, this.app.currentPlayer);
        messages.forEach(msg => this.app.showNotification(msg, 'info'));

        this.app.updateStatus(`当前玩家: ${this.app.currentPlayer === 'red' ? '红方' : '黑方'}`);
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
