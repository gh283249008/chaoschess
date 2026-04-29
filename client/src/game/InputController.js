export class InputController {
    constructor(app) {
        this.app = app;
    }

    bindCanvasClick() {
        this.app.canvas.addEventListener('click', event => this.handleCanvasClick(event));
    }

    handleCanvasClick(event) {
        const rect = this.app.canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        const { x: gridX, y: gridY } = this.app.renderer.screenToGrid(clickX, clickY);

        if (gridX < 0 || gridX > 8 || gridY < 0 || gridY > 9) {
            return;
        }

        if (this.app.waitingForTarget) {
            const success = this.app.executeTargetEffect(gridX, gridY);
            if (success) {
                this.app.render();
            }
            return;
        }

        if (this.app.gameMode === 'place') {
            this.app.handleGoClick(gridX, gridY);
            return;
        }

        this.app.handleChessClick(gridX, gridY);
    }
}
