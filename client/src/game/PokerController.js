export class PokerController {
    constructor(app) {
        this.app = app;
    }

    testEffect(handType) {
        console.log(`Testing effect: ${handType}`);
        const context = this.createContext();
        const effectResult = this.app.pokerPlugin.executeEffect(handType, context);

        if (effectResult.type === 'immediate') {
            this.executeImmediateEffect(effectResult);
        } else if (effectResult.type === 'target_selection') {
            this.app.showNotification(`${effectResult.message}${this.getMoveDeclarationText(effectResult)}`, 'info');
            this.app.waitingForTarget = {
                handType: effectResult.handType,
                context
            };
        }
    }

    togglePoker() {
        const container = document.getElementById('poker-hand-container');
        container.classList.toggle('translate-y-full');
        this.renderPokerHand();
    }

    renderPokerHand() {
        const container = document.getElementById('hand-cards');
        const playerNameEl = document.getElementById('poker-player-name');
        const handTypeEl = document.getElementById('selected-hand-type');
        const playBtn = document.getElementById('play-poker-btn');
        const unlockTip = document.getElementById('poker-unlock-tip');

        container.innerHTML = '';
        const hand = this.app.pokerHands[this.app.currentPlayer] || [];

        if (playerNameEl) {
            playerNameEl.textContent = this.app.currentPlayer === 'red' ? '红方' : '黑方';
            playerNameEl.style.color = this.app.currentPlayer === 'red' ? '#ff4444' : '#999';
        }

        const sortedHand = [...hand].sort((a, b) => b.value - a.value);

        sortedHand.forEach(card => {
            const div = document.createElement('div');
            const isSelected = this.app.selectedCards.some(c => c.id === card.id);
            const isRed = ['♥', '♦'].includes(card.suit);
            div.className = `poker-card ${isRed ? 'red' : 'black'} ${isSelected ? 'selected' : ''}`;
            div.innerHTML = `
                <div style="position: absolute; top: 5px; left: 5px; font-size: 12px;">${card.suit}${card.rank}</div>
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 24px;">${card.suit}</div>
                <div style="position: absolute; bottom: 5px; right: 5px; font-size: 12px; transform: rotate(180deg);">${card.suit}${card.rank}</div>
            `;
            div.onclick = () => this.handleCardClick(card);
            container.appendChild(div);
        });

        if (this.app.selectedCards.length === 5 && handTypeEl) {
            const evalResult = this.app.pokerPlugin.evaluateHand(this.app.selectedCards);
            handTypeEl.textContent = evalResult.name;
        } else if (handTypeEl) {
            handTypeEl.textContent = '请选择5张牌';
        }

        this.updatePlayButtonState(playBtn, unlockTip);
    }

    handleCardClick(card) {
        const isSelected = this.app.selectedCards.some(c => c.id === card.id);

        if (isSelected) {
            this.app.selectedCards = this.app.selectedCards.filter(c => c.id !== card.id);
        } else if (this.app.selectedCards.length < 5) {
            this.app.selectedCards.push(card);
        }

        this.renderPokerHand();
    }

    purchaseSelectedHandEffect() {
        const effectId = 'poker_global';
        const result = this.app.matchController.purchaseEffect(effectId, this.app.currentPlayer);
        this.app.showNotification(result.message, result.success ? 'success' : 'warning');
        return result;
    }

    playPokerHand() {
        if (this.app.selectedCards.length !== 5) {
            this.app.showNotification('请选择5张牌！', 'warning');
            return;
        }

        if (!this.app.matchController?.isRoundActive()) {
            this.app.showNotification('当前局未开始，无法出牌。', 'warning');
            return;
        }

        const evalResult = this.app.pokerPlugin.evaluateHand(this.app.selectedCards);
        if (!this.hasPurchasedPokerAccess(this.app.currentPlayer)) {
            const price = this.app.matchController.getEffectPrice('poker_global');
            this.app.showNotification(`未购买德州扑克效果（本局价格 ${price}）`, 'warning');
            return;
        }

        console.log(`Playing hand: ${evalResult.name} (rank: ${evalResult.rank})`);

        this.app.pokerHands[this.app.currentPlayer] = this.app.pokerHands[this.app.currentPlayer].filter(
            card => !this.app.selectedCards.some(sc => sc.id === card.id)
        );

        this.app.selectedCards = [];
        this.renderPokerHand();

        const effectResult = this.app.pokerPlugin.executeEffect(evalResult.type, this.createContext());

        if (effectResult.type === 'immediate') {
            this.executeImmediateEffect(effectResult);
            this.togglePoker();
        } else if (effectResult.type === 'target_selection') {
            this.app.showNotification(`${effectResult.message}${this.getMoveDeclarationText(effectResult)}`, 'info');
            this.app.waitingForTarget = {
                handType: effectResult.handType,
                context: this.createContext()
            };
            this.togglePoker();
        }
    }

    executeImmediateEffect(effectResult) {
        this.app.effectPipeline.execute(effectResult, result => {
            switch (result.action) {
                case 'undo':
                    this.app.showNotification('悔棋功能暂未实现', 'info');
                    break;

                case 'extra_turns':
                    this.app.showNotification(`${result.message}${this.getMoveDeclarationText(result)}`, 'success');
                    break;

                case 'block_river':
                    this.app.showNotification(`${result.message}${this.getMoveDeclarationText(result)}`, 'success');
                    this.app.board.riverBlocked = true;
                    this.app.riverBlockedTurns = 2;
                    this.app.render();
                    break;

                case 'ban_go':
                    this.app.board.pieces = this.app.board.pieces.filter(p => p.pluginSource !== 'Go');
                    this.app.showNotification(`${result.message}${this.getMoveDeclarationText(result)}`, 'success');
                    this.app.render();
                    break;

                default:
                    this.app.showNotification(`${result.message || '效果已执行'}${this.getMoveDeclarationText(result)}`, 'success');
            }
        });
    }

    getMoveDeclarationText(effectResult) {
        return effectResult?.consumesMove ? ' 该特效视为一步走棋。' : ' 该特效不视为一步走棋。';
    }

    executeTargetEffect(x, y) {
        if (!this.app.waitingForTarget) return false;

        const { handType, context } = this.app.waitingForTarget;
        const result = this.app.pokerPlugin.executeTargetEffect(handType, { x, y }, context);

        if (!result.success) {
            this.app.showNotification('无效目标，请重新选择！', 'warning');
            return false;
        }

        this.applyTargetEffect(result);
        this.app.waitingForTarget = null;
        return true;
    }

    applyTargetEffect(result) {
        switch (result.action) {
            case 'freeze_piece': {
                if (this.app.removeFlipPieceByAbnormalStatus(result.target, '冻结')) {
                    break;
                }
                const message = this.app.effectManager.applyEffect(result.target, 'freeze', result.duration);
                this.app.showKillFeed(`${this.playerMarker()}扑克`, `${this.pieceMarker(result.target)}${result.target.type}`, 'freeze');
                this.app.showNotification(message, 'success');
                break;
            }

            case 'spawn_piece':
                this.app.board.addPiece(result.piece);
                this.app.showNotification(result.message, 'success');
                this.app.render();
                break;

            case 'create_smoke':
                this.app.board.smokeEffects.push({
                    x: result.zone.x + 1,
                    y: result.zone.y + 1,
                    player: this.app.currentPlayer,
                    turns: 3
                });
                this.app.showNotification(result.message, 'success');
                this.app.render();
                break;

            case 'create_wall':
                this.app.board.addPiece({
                    type: 'wall',
                    x: result.position.x,
                    y: result.position.y,
                    player: 'neutral',
                    pluginSource: 'Obstacle'
                });
                this.app.showNotification(result.message, 'success');
                this.app.render();
                break;

            case 'kill_piece':
                this.app.board.removePiece(result.target);
                this.app.onPieceCaptured(result.target, this.app.currentPlayer);
                this.app.showKillFeed(`${this.playerMarker()}扑克`, `${this.pieceMarker(result.target)}${result.target.type}`, 'kill');
                this.app.showNotification(result.message, 'success');
                this.app.render();
                break;

            case 'nuke_area':
                result.targets.forEach(target => {
                    this.app.board.removePiece(target);
                    this.app.onPieceCaptured(target, this.app.currentPlayer);
                });
                this.app.showNotification(result.message, 'success');
                this.app.render();
                break;
        }
    }

    createContext() {
        return {
            gameState: this.app.board,
            currentPlayer: this.app.currentPlayer
        };
    }

    hasPurchasedPokerAccess(player) {
        const onlineState = this.app.getOnlineState?.();
        const remoteLoadout = onlineState?.roomSnapshot?.roundState?.loadouts?.[player];
        if (remoteLoadout) {
            return (remoteLoadout.purchasedEffects || []).includes('poker_global');
        }

        const loadout = this.app.matchController.getLoadout(player);
        return loadout.purchasedEffects.some(item => item.effectId === 'poker_global');
    }

    updatePlayButtonState(playBtn, unlockTip) {
        if (!playBtn) return;

        const hasAccess = this.hasPurchasedPokerAccess(this.app.currentPlayer);
        playBtn.style.display = hasAccess ? 'inline-block' : 'none';

        if (unlockTip) {
            unlockTip.style.display = hasAccess ? 'none' : 'inline';
        }
    }

    playerMarker() {
        return this.app.currentPlayer === 'red' ? '🔴' : '⚫';
    }

    pieceMarker(piece) {
        return piece.player === 'red' ? '🔴' : '⚫';
    }
}
