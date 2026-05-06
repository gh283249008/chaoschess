export class EffectPipeline {
    constructor(app) {
        this.app = app;
    }

    execute(effectResult, runner) {
        if (!effectResult || typeof runner !== 'function') {
            return false;
        }

        runner(effectResult);

        const turnDelta = Number(effectResult.turnDelta || 0);
        if (turnDelta !== 0) {
            this.app.addTurnMoves(this.app.currentPlayer, turnDelta);
        }

        if (effectResult.endTurn === true) {
            this.app.setCurrentTurnMovesLeft(0);
            this.app.switchPlayer();
            return true;
        }

        if (effectResult.consumesMove === true) {
            this.app.consumeMoveStep(1);
            return true;
        }

        return true;
    }
}
