/**
 * UI控制器
 * 管理UI状态和用户界面更新
 */
export class UIController {
    constructor(store) {
        this.store = store;
        this.elements = this.initializeElements();
    }

    /**
     * 初始化DOM元素引用
     */
    initializeElements() {
        return {
            status: document.getElementById('status'),
            pluginList: document.getElementById('plugin-list'),
            pokerHandContainer: document.getElementById('poker-hand-container'),
            handCards: document.getElementById('hand-cards'),
            playerName: document.getElementById('poker-player-name'),
            playHandBtn: document.getElementById('play-hand-btn'),
            selectedHandType: document.getElementById('selected-hand-type'),
            duelModal: document.getElementById('duel-modal'),
            hint: document.getElementById('hint')
        };
    }

    /**
     * 更新状态栏
     */
    updateStatus(message) {
        if (this.elements.status) {
            const textNode = this.elements.status.childNodes[0];
            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                textNode.textContent = message;
            } else {
                this.elements.status.insertBefore(
                    document.createTextNode(message),
                    this.elements.status.firstChild
                );
            }
        }
    }

    /**
     * 显示提示信息
     */
    updateHint(message) {
        if (this.elements.hint) {
            this.elements.hint.textContent = message;
            this.elements.hint.style.display = message ? 'block' : 'none';
        }
    }

    /**
     * 显示消息框
     */
    showMessage(message, icon = '💬', title = '提示') {
        // 简单的alert实现，可以后续改为更美观的模态框
        alert(`${icon} ${title}\n\n${message}`);
    }

    /**
     * 显示已加载的插件
     */
    displayPlugins(plugins) {
        if (!this.elements.pluginList) return;

        this.elements.pluginList.innerHTML = '';

        if (plugins.pieces.length === 0 && plugins.cards.length === 0) {
            this.elements.pluginList.innerHTML = '<span style="color: #999;">暂无插件加载</span>';
            return;
        }

        plugins.pieces.forEach(name => {
            const badge = document.createElement('div');
            badge.className = 'plugin-badge';
            badge.textContent = `♟️ ${name}`;
            this.elements.pluginList.appendChild(badge);
        });

        plugins.cards.forEach(name => {
            const badge = document.createElement('div');
            badge.className = 'plugin-badge';
            badge.style.background = '#764ba2';
            badge.textContent = `🃏 ${name}`;
            this.elements.pluginList.appendChild(badge);
        });
    }

    /**
     * 渲染扑克手牌
     */
    renderPokerHand(hand, currentPlayer, selectedCards, pokerPlugin) {
        if (!this.elements.handCards) return;

        this.elements.handCards.innerHTML = '';

        if (this.elements.playerName) {
            this.elements.playerName.textContent = currentPlayer === 'red' ? '红方' : '黑方';
            this.elements.playerName.className = currentPlayer === 'red' ? 'text-red-500' : 'text-gray-400';
        }

        // 排序手牌
        const sortedHand = [...hand].sort((a, b) => b.value - a.value);

        sortedHand.forEach(card => {
            const div = document.createElement('div');
            const isSelected = selectedCards.some(c => c.id === card.id);
            div.className = `poker-card ${['♥', '♦'].includes(card.suit) ? 'red' : 'black'} ${isSelected ? 'selected' : ''}`;
            div.innerHTML = `
        <div class="card-top">${card.suit}${card.rank}</div>
        <div class="card-center">${card.suit}</div>
        <div class="card-bottom">${card.suit}${card.rank}</div>
      `;
            this.elements.handCards.appendChild(div);
        });

        // 更新选中牌型
        if (selectedCards.length === 5 && this.elements.selectedHandType && pokerPlugin) {
            const evalResult = pokerPlugin.evaluateHand(selectedCards);
            this.elements.selectedHandType.textContent = evalResult.name;
        } else if (this.elements.selectedHandType) {
            this.elements.selectedHandType.textContent = '请选择5张牌';
        }
    }

    /**
     * 切换扑克手牌面板
     */
    togglePokerPanel() {
        if (this.elements.pokerHandContainer) {
            this.elements.pokerHandContainer.classList.toggle('translate-y-full');
        }
    }

    /**
     * 显示对决模态框
     */
    showDuelModal(opponentHand, effectDescription) {
        if (!this.elements.duelModal) return;

        const oppHandText = document.getElementById('duel-opponent-hand');
        const effectText = document.getElementById('duel-effect-desc');

        if (oppHandText) oppHandText.textContent = opponentHand;
        if (effectText) effectText.textContent = effectDescription;

        this.elements.duelModal.classList.add('show');
    }

    /**
     * 隐藏对决模态框
     */
    hideDuelModal() {
        if (this.elements.duelModal) {
            this.elements.duelModal.classList.remove('show');
        }
    }

    /**
     * 添加模式切换按钮
     */
    addModeToggleButton(onToggle) {
        if (!this.elements.status) return;

        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = '切换到围棋模式';
        toggleBtn.style.cssText = 'margin-left: 20px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;';
        toggleBtn.onclick = onToggle;
        this.elements.status.appendChild(toggleBtn);

        return toggleBtn;
    }
}
