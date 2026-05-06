export class InputController {
    constructor(app) {
        this.app = app;
    }

    bindCanvasClick() {
        this.app.canvas.addEventListener('click', event => this.handleCanvasClick(event));
    }

    handleCanvasClick(event) {
        const onlineState = this.app.getOnlineState?.();
        const hasRemoteRoundState = !!onlineState?.roomSnapshot?.roundState;
        const remoteBuying = hasRemoteRoundState && onlineState.roomSnapshot.roundState.status === 'buying';
        const localBuying = this.app.matchController?.isRoundBuying();
        if ((hasRemoteRoundState && remoteBuying) || (!hasRemoteRoundState && localBuying)) {
            this.app.showNotification('当前为准备阶段，请先在商店购买并等待倒计时结束。', 'info');
            return;
        }

        const rect = this.app.canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        const { x: gridX, y: gridY } = this.app.renderer.screenToGrid(clickX, clickY);

        if (gridX < 0 || gridX > 8 || gridY < 0 || gridY > 9) {
            return;
        }

        if (this.app.waitingForTarget) {
            const success = this.app.executeTargetEffect(gridX, gridY);
            if (onlineState?.roomSnapshot && !this.app.applyingRemoteAction && success) {
                this.app.sendStateSyncAction();
            }
            if (success) {
                this.app.render();
            }
            return;
        }

        const onlineSnapshot = onlineState?.roomSnapshot;
        if (onlineSnapshot && !this.app.applyingRemoteAction) {
            const myColor = onlineState.color;
            const turnColor = onlineSnapshot.roundState?.turnColor;
            if (myColor && turnColor && myColor !== turnColor) {
                this.app.showNotification('当前不是你的行动回合', 'warning');
                return;
            }

            let changed = false;
            if (this.app.gameMode === 'place') {
                changed = this.app.handleGoClick(gridX, gridY);
            } else {
                changed = this.app.handleChessClick(gridX, gridY);
            }

            if (changed) {
                this.app.sendStateSyncAction();
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
