export class AppUIController {
    constructor(app) {
        this.app = app;
        this.modeBtn = null;
    }

    initControls() {
        const statusDiv = document.getElementById('status');
        if (!statusDiv) {
            return;
        }

        this.modeBtn = this.createButton('切换到围棋模式', '#667eea', () => this.app.toggleMode());
        statusDiv.appendChild(this.modeBtn);

        const pokerBtn = this.createButton('🎴 扑克', '#764ba2', () => this.app.togglePoker());
        pokerBtn.style.marginLeft = '10px';
        statusDiv.appendChild(pokerBtn);
    }

    updateModeUI(gameMode) {
        if (!this.modeBtn) {
            return;
        }

        if (gameMode === 'move') {
            this.modeBtn.textContent = '♟️ 下棋模式';
            this.updateStatus('下棋模式 - 移动棋子');
        } else {
            this.modeBtn.textContent = '⚫ 落子模式';
            this.updateStatus('落子模式 - 放置围棋子');
        }
    }

    updateStatus(message) {
        const statusEl = document.getElementById('status');
        if (!statusEl) {
            return;
        }

        const textNode = statusEl.childNodes[0];
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            textNode.textContent = message;
            return;
        }

        statusEl.insertBefore(document.createTextNode(message), statusEl.firstChild);
    }

    displayPlugins(plugins) {
        const pluginListEl = document.getElementById('plugin-list');
        if (!pluginListEl) {
            return;
        }

        pluginListEl.innerHTML = '';

        if (plugins.pieces.length === 0 && plugins.cards.length === 0) {
            pluginListEl.innerHTML = '<span style="color: #999;">暂无插件加载</span>';
            return;
        }

        plugins.pieces.forEach(name => {
            pluginListEl.appendChild(this.createPluginBadge(`♟️ ${name}`));
        });

        plugins.cards.forEach(name => {
            pluginListEl.appendChild(this.createPluginBadge(`🃏 ${name}`, '#764ba2'));
        });
    }

    createButton(text, background, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `margin-left: 20px; padding: 8px 16px; background: ${background}; color: white; border: none; border-radius: 5px; cursor: pointer;`;
        button.onclick = onClick;
        return button;
    }

    createPluginBadge(text, background) {
        const badge = document.createElement('div');
        badge.className = 'plugin-badge';
        if (background) {
            badge.style.background = background;
        }
        badge.textContent = text;
        return badge;
    }
}
