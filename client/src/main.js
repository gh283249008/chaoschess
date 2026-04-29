import { PluginManager } from './core/PluginManager.js';
import { EventBus } from './core/EventBus.js';
import { Board } from './core/Board.js';
import { ChineseChessPlugin } from './plugins/pieces/ChineseChess/ChineseChessPlugin.js';
import { GoPlugin } from './plugins/pieces/Go/GoPlugin.js';
import { PokerPlugin } from './plugins/cards/Poker/PokerPlugin.js';
import { InternationalChessPlugin } from './plugins/pieces/InternationalChess/InternationalChessPlugin.js';
import { StatusEffectManager } from './core/StatusEffectManager.js';

/**
 * 主应用入口
 */
class ChaosChessApp {
    constructor() {
        this.pluginManager = new PluginManager();
        this.eventBus = new EventBus();
        this.board = new Board();
        this.effectManager = new StatusEffectManager();

        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');

        // Game state
        this.currentPlayer = 'red';
        this.selectedPiece = null;
        this.gameMode = 'move'; // 'move' (下棋模式) or 'place' (落子模式)

        // Game state
        this.currentPlayer = 'red';
        this.selectedPiece = null;
        this.gameMode = 'move'; // 'move' (下棋模式) or 'place' (落子模式)

        // Go plugin reference
        this.goPlugin = null;
        this.pokerPlugin = null;

        // Poker state
        this.pokerHands = {
            red: [],
            black: []
        };
        this.selectedCards = [];
        this.waitingForTarget = null; // Added this property
        this.extraTurns = 0; // 额外回合计数器

        this.init();
    }

    async init() {
        console.log('🎮 Chaos Chess - Plugin Architecture Demo');
        console.log('========================================');

        // 注册插件
        try {
            const chineseChess = new ChineseChessPlugin();
            this.pluginManager.registerPiecePlugin('ChineseChess', chineseChess);

            this.goPlugin = new GoPlugin();
            this.pluginManager.registerPiecePlugin('Go', this.goPlugin);

            const intlChess = new InternationalChessPlugin();
            this.pluginManager.registerPiecePlugin('InternationalChess', intlChess);

            this.pokerPlugin = new PokerPlugin();
            this.pluginManager.registerCardPlugin('Poker', this.pokerPlugin);

            // 初始化扑克牌（每人7张）
            this.pokerHands.red = this.pokerPlugin.dealHand(7);
            this.pokerHands.black = this.pokerPlugin.dealHand(7);

            // 加载初始棋盘（象棋）
            const initialPieces = chineseChess.getInitialSetup();
            initialPieces.forEach(piece => this.board.addPiece(piece));

            console.log(`✓ Loaded ${initialPieces.length} pieces`);
        } catch (error) {
            console.error('Failed to load plugins:', error);
        }

        // 更新状态
        this.updateStatus('插件系统已初始化 - 中国象棋已加载');

        // 显示已加载的插件
        this.displayPlugins();

        // 绘制棋盘
        this.render();

        // 添加点击事件
        this.canvas.addEventListener('click', (e) => this.handleClick(e));

        // 添加模式切换按钮
        this.addModeToggle();

        console.log('✓ Application initialized');
    }

    addModeToggle() {
        const statusDiv = document.getElementById('status');
        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = '切换到围棋模式';
        toggleBtn.style.cssText = 'margin-left: 20px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;';
        toggleBtn.onclick = () => this.toggleMode();
        statusDiv.appendChild(toggleBtn);
        this.toggleBtn = toggleBtn;

        // 添加扑克按钮
        const pokerBtn = document.createElement('button');
        pokerBtn.textContent = '🎴 扑克';
        pokerBtn.style.cssText = 'margin-left: 10px; padding: 8px 16px; background: #764ba2; color: white; border: none; border-radius: 5px; cursor: pointer;';
        pokerBtn.onclick = () => this.togglePoker();
        statusDiv.appendChild(pokerBtn);
    }

    toggleMode() {
        this.gameMode = this.gameMode === 'move' ? 'place' : 'move';
        this.selectedPiece = null;

        // The original code used `this.toggleBtn`. The new code expects an element with id 'mode-btn'.
        // To maintain functionality based on the original structure, we'll use `this.toggleBtn`.
        // If 'mode-btn' is intended to be a new element, it should be added in `addModeToggle`.
        const modeBtn = this.toggleBtn; // Assuming this.toggleBtn is the mode toggle button
        if (this.gameMode === 'move') {
            modeBtn.textContent = '♟️ 下棋模式';
            this.updateStatus('下棋模式 - 移动棋子');
        } else {
            modeBtn.textContent = '⚫ 落子模式';
            this.updateStatus('落子模式 - 放置围棋子');
        }

        this.render();
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // 转换为棋盘坐标
        const gridX = Math.round((clickX - 40) / 50);
        const gridY = Math.round((clickY - 40) / 50);

        if (gridX < 0 || gridX > 8 || gridY < 0 || gridY > 9) return;

        // 检查是否在等待扑克效果目标选择
        if (this.waitingForTarget) {
            const success = this.executeTargetEffect(gridX, gridY);
            if (success) {
                this.render();
            }
            return;
        }

        if (this.gameMode === 'place') {
            this.handleGoClick(gridX, gridY);
        } else {
            this.handleChessClick(gridX, gridY);
        }
    }

    // 开发者测试方法
    testEffect(handType) {
        console.log(`Testing effect: ${handType}`);
        const context = {
            gameState: this.board,
            currentPlayer: this.currentPlayer
        };

        const effectResult = this.pokerPlugin.executeEffect(handType, context);

        if (effectResult.type === 'immediate') {
            this.executeImmediateEffect(effectResult);
        } else if (effectResult.type === 'target_selection') {
            this.showNotification(effectResult.message, 'info');
            this.waitingForTarget = {
                handType: effectResult.handType,
                context
            };
        }
    }

    // 游戏内通知系统
    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        container.textContent = message;
        container.className = 'show';

        // 根据类型设置颜色
        const colors = {
            success: '#4CAF50',
            warning: '#FF9800',
            error: '#F44336',
            info: '#2196F3'
        };
        container.style.borderColor = colors[type] || colors.info;

        // 2秒后自动隐藏
        setTimeout(() => {
            container.classList.remove('show');
        }, 2000);
    }

    handleGoClick(gridX, gridY) {
        // 检查位置是否已占用
        const occupied = this.board.getPieceAt(gridX, gridY);
        if (occupied) {
            console.log(`Position (${gridX}, ${gridY}) is occupied`);
            return;
        }

        // 检查烟雾弹禁止落子
        if (this.board.smokeEffects && this.board.smokeEffects.length > 0) {
            for (const smoke of this.board.smokeEffects) {
                // 如果是敌方烟雾，禁止落子
                if (smoke.player !== this.currentPlayer) {
                    if (Math.abs(gridX - smoke.x) <= 1 && Math.abs(gridY - smoke.y) <= 1) {
                        // 不显示提示，避免暴露烟雾位置
                        console.log('Cannot place in opponent smoke (silently blocked)');
                        return;
                    }
                }
            }
        }

        console.log(`Placing ${this.currentPlayer} stone at (${gridX}, ${gridY})`);

        // 放置围棋子
        const stone = this.goPlugin.placeStone(gridX, gridY, this.currentPlayer, this.board.getState());
        this.board.addPiece(stone);

        // 检查提子（包括象棋和围棋）
        const allPieces = this.board.pieces;

        console.log(`Total pieces on board: ${allPieces.length}`);

        const { captured, suicided } = this.goPlugin.checkCaptures(allPieces, this.currentPlayer);

        console.log(`Captured: ${captured.length}, Suicided: ${suicided.length}`);

        // 移除被提掉的棋子（可能是象棋或围棋）
        [...captured, ...suicided].forEach(p => {
            console.log(`Removing ${p.pluginSource} piece at (${p.x}, ${p.y}), player: ${p.player}`);
            this.board.removePiece(p);

            // 显示击杀提示
            if (captured.includes(p)) {
                const killerName = `${this.currentPlayer === 'red' ? '🔴' : '⚫'}围棋`;
                const victimName = `${p.player === 'red' ? '🔴' : '⚫'}${p.type}`;
                this.showKillFeed(killerName, victimName, 'capture');
            }
        });

        if (captured.length > 0) {
            console.log(`✓ Captured ${captured.length} pieces`);
        }
        if (suicided.length > 0) {
            console.log(`✗ Suicided ${suicided.length} pieces`);
        }

        // 切换玩家并更新冻结状态
        this.switchPlayer();
        this.render();
    }

    // 切换玩家并处理状态效果
    switchPlayer() {
        // 检查是否有额外回合
        if (this.extraTurns > 0) {
            this.extraTurns--;
            console.log(`Extra turn! Remaining: ${this.extraTurns}`);
            this.showNotification(`额外行动机会！剩余 ${this.extraTurns} 次`, 'success');
            // 不切换玩家，继续当前玩家
            return;
        }

        // 处理河道封锁倒计时
        if (this.board.riverBlocked && this.riverBlockedTurns > 0) {
            this.riverBlockedTurns--;
            if (this.riverBlockedTurns === 0) {
                this.board.riverBlocked = false;
                this.showNotification('河道封锁已解除', 'info');
            }
        }

        // 处理烟雾弹倒计时
        for (let i = this.board.smokeEffects.length - 1; i >= 0; i--) {
            const smoke = this.board.smokeEffects[i];
            smoke.turns--;
            if (smoke.turns <= 0) {
                this.board.smokeEffects.splice(i, 1);
                this.showNotification('烟雾已消散', 'info');
            }
        }

        // 切换玩家
        this.currentPlayer = this.currentPlayer === 'red' ? 'black' : 'red';

        // 使用StatusEffectManager更新所有效果
        const messages = this.effectManager.tickEffects(this.board.pieces, this.currentPlayer);
        messages.forEach(msg => this.showNotification(msg, 'info'));

        this.updateStatus(`当前玩家: ${this.currentPlayer === 'red' ? '红方' : '黑方'}`);
    }

    handleChessClick(gridX, gridY) {
        const clickedPiece = this.board.getPieceAt(gridX, gridY);

        // 选择棋子
        if (clickedPiece && clickedPiece.player === this.currentPlayer && clickedPiece.pluginSource !== 'Go') {
            // 使用StatusEffectManager检查是否可以移动
            const result = this.effectManager.canPieceMove(clickedPiece);
            if (!result.canMove) {
                this.showNotification(result.reason, 'warning');
                return;
            }
            this.selectedPiece = clickedPiece;
            this.render();
            return;
        }

        // 移动棋子
        if (this.selectedPiece) {
            let isValid = false;

            // 根据棋子来源选择对应的插件验证
            if (this.selectedPiece.pluginSource === 'ChineseChess' || !this.selectedPiece.pluginSource) {
                // 默认使用中国象棋插件（向后兼容）
                const chessPlugin = this.pluginManager.getPlugin('pieces', 'ChineseChess');
                if (chessPlugin) {
                    isValid = chessPlugin.validateMove(
                        this.selectedPiece,
                        { x: this.selectedPiece.x, y: this.selectedPiece.y },
                        { x: gridX, y: gridY },
                        this.board.getState()
                    );
                }
            } else if (this.selectedPiece.pluginSource === 'InternationalChess') {
                const intlChessPlugin = this.pluginManager.getPlugin('pieces', 'InternationalChess');
                if (intlChessPlugin) {
                    isValid = intlChessPlugin.validateMove(
                        this.selectedPiece,
                        { x: this.selectedPiece.x, y: this.selectedPiece.y },
                        { x: gridX, y: gridY },
                        this.board.getState()
                    );
                }
            }

            if (isValid) {
                // 吃子
                const target = this.board.getPieceAt(gridX, gridY);
                if (target) {
                    this.board.removePiece(target);
                    console.log(`${this.selectedPiece.type} captured ${target.type}`);

                    // 显示击杀提示
                    const killerName = `${this.currentPlayer === 'red' ? '🔴' : '⚫'}${this.selectedPiece.type}`;
                    const victimName = `${target.player === 'red' ? '🔴' : '⚫'}${target.type}`;
                    this.showKillFeed(killerName, victimName);
                }

                // 移动
                const from = { x: this.selectedPiece.x, y: this.selectedPiece.y };
                const to = { x: gridX, y: gridY };

                this.selectedPiece.x = gridX;
                this.selectedPiece.y = gridY;

                // 触发移动后回调 (用于处理升变等)
                const pluginName = this.selectedPiece.pluginSource;
                let promotionPending = false;

                if (pluginName) {
                    const plugin = this.pluginManager.getPlugin('pieces', pluginName);
                    if (plugin && typeof plugin.onPieceMoved === 'function') {
                        const result = plugin.onPieceMoved(this.selectedPiece, from, to, this.board.getState());

                        if (result && result.action === 'promotion') {
                            promotionPending = true;
                            this.pendingPromotionPiece = result.piece;
                            this.showPromotionModal();
                        }
                    }
                }

                this.selectedPiece = null;

                if (!promotionPending) {
                    // 切换玩家并更新冻结状态
                    this.switchPlayer();
                }
                this.render();
            } else {
                console.log(`Invalid move: ${this.selectedPiece.type} from (${this.selectedPiece.x},${this.selectedPiece.y}) to (${gridX},${gridY})`);
                if (this.selectedPiece.pluginSource === 'ChineseChess' || !this.selectedPiece.pluginSource) {
                    console.log('Using ChineseChess logic');
                } else {
                    console.log('Using InternationalChess logic');
                }
                this.showNotification('移动无效！请检查移动规则', 'warning');
            }
        }
    }

    showPromotionModal() {
        const modal = document.getElementById('promotion-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    handlePromotion(type) {
        if (this.pendingPromotionPiece) {
            console.log(`Promoting piece to ${type}`);
            this.pendingPromotionPiece.type = type;
            this.pendingPromotionPiece = null;

            // 隐藏模态框
            document.getElementById('promotion-modal').style.display = 'none';

            this.showNotification(`成功升变为 ${type}`, 'success');

            // 继续游戏流程
            this.switchPlayer();
            this.render();
        }
    }

    updateStatus(message) {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            // 只更新文本节点，保留按钮
            const textNode = statusEl.childNodes[0];
            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                textNode.textContent = message;
            } else {
                statusEl.insertBefore(document.createTextNode(message), statusEl.firstChild);
            }
        }
    }

    displayPlugins() {
        const plugins = this.pluginManager.listPlugins();
        const pluginListEl = document.getElementById('plugin-list');

        if (!pluginListEl) return;

        pluginListEl.innerHTML = '';

        if (plugins.pieces.length === 0 && plugins.cards.length === 0) {
            pluginListEl.innerHTML = '<span style="color: #999;">暂无插件加载</span>';
            return;
        }

        plugins.pieces.forEach(name => {
            const badge = document.createElement('div');
            badge.className = 'plugin-badge';
            badge.textContent = `♟️ ${name}`;
            pluginListEl.appendChild(badge);
        });

        plugins.cards.forEach(name => {
            const badge = document.createElement('div');
            badge.className = 'plugin-badge';
            badge.style.background = '#764ba2';
            badge.textContent = `🃏 ${name}`;
            pluginListEl.appendChild(badge);
        });
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

        container.innerHTML = '';
        const hand = this.pokerHands[this.currentPlayer] || [];

        if (playerNameEl) {
            playerNameEl.textContent = this.currentPlayer === 'red' ? '红方' : '黑方';
            playerNameEl.style.color = this.currentPlayer === 'red' ? '#ff4444' : '#999';
        }

        // 排序手牌
        const sortedHand = [...hand].sort((a, b) => b.value - a.value);

        sortedHand.forEach((card, index) => {
            const div = document.createElement('div');
            const isSelected = this.selectedCards.some(c => c.id === card.id);
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

        // 更新选中牌型
        if (this.selectedCards.length === 5 && handTypeEl) {
            const evalResult = this.pokerPlugin.evaluateHand(this.selectedCards);
            handTypeEl.textContent = evalResult.name;
        } else if (handTypeEl) {
            handTypeEl.textContent = '请选择5张牌';
        }
    }

    handleCardClick(card) {
        const isSelected = this.selectedCards.some(c => c.id === card.id);

        if (isSelected) {
            this.selectedCards = this.selectedCards.filter(c => c.id !== card.id);
        } else if (this.selectedCards.length < 5) {
            this.selectedCards.push(card);
        }

        this.renderPokerHand();
    }

    playPokerHand() {
        // 检查是否选择了5张牌
        if (this.selectedCards.length !== 5) {
            this.showNotification('请选择5张牌！', 'warning');
            return;
        }

        // 评估牌型
        const evalResult = this.pokerPlugin.evaluateHand(this.selectedCards);
        console.log(`Playing hand: ${evalResult.name} (rank: ${evalResult.rank})`);

        // 从手牌中移除已出的牌
        this.pokerHands[this.currentPlayer] = this.pokerHands[this.currentPlayer].filter(
            card => !this.selectedCards.some(sc => sc.id === card.id)
        );

        // 清空选择
        this.selectedCards = [];
        this.renderPokerHand();

        // 执行效果
        const context = {
            gameState: this.board,
            currentPlayer: this.currentPlayer
        };

        const effectResult = this.pokerPlugin.executeEffect(evalResult.type, context);

        if (effectResult.type === 'immediate') {
            // 立即执行的效果
            this.executeImmediateEffect(effectResult);
            this.togglePoker();
        } else if (effectResult.type === 'target_selection') {
            // 需要选择目标的效果
            this.showNotification(effectResult.message, 'info');
            this.waitingForTarget = {
                handType: effectResult.handType,
                context
            };
            this.togglePoker();
        }
    }

    executeImmediateEffect(effectResult) {
        switch (effectResult.action) {
            case 'undo':
                this.showNotification('悔棋功能暂未实现', 'info');
                break;

            case 'extra_turns':
                this.extraTurns = effectResult.effect.extraTurns;
                this.showNotification(effectResult.message, 'success');
                break;

            case 'block_river':
                this.showNotification(effectResult.message, 'success');
                this.board.riverBlocked = true;
                this.riverBlockedTurns = 2; // 持续2个"switchPlayer"（即红+黑各一次，或者直到再次轮到自己前）
                this.render();
                break;

            case 'ban_go':
                // 清空围棋子
                this.board.pieces = this.board.pieces.filter(p => p.pluginSource !== 'Go');
                this.showNotification(effectResult.message, 'success');
                this.render();
                break;

            default:
                this.showNotification(effectResult.message || '效果已执行', 'success');
        }
    }

    executeTargetEffect(x, y) {
        if (!this.waitingForTarget) return false;

        const { handType, context } = this.waitingForTarget;
        const result = this.pokerPlugin.executeTargetEffect(handType, { x, y }, context);

        if (result.success) {
            switch (result.action) {
                case 'freeze_piece':
                    // 使用StatusEffectManager应用冻结效果
                    const message = this.effectManager.applyEffect(result.target, 'freeze', result.duration);
                    this.showKillFeed(`${this.currentPlayer === 'red' ? '🔴' : '⚫'}扑克`, `${result.target.player === 'red' ? '🔴' : '⚫'}${result.target.type}`, 'freeze');
                    this.showNotification(message, 'success');
                    break;

                case 'spawn_piece':
                    this.board.addPiece(result.piece);
                    this.showNotification(result.message, 'success');
                    this.render();
                    break;

                case 'create_smoke':
                    // 烟雾弹：3x3区域，持续3回合
                    this.board.smokeEffects.push({
                        x: result.zone.x + 1, // 中心点X
                        y: result.zone.y + 1, // 中心点Y
                        player: this.currentPlayer,
                        turns: 3
                    });
                    this.showNotification(result.message, 'success');
                    this.render();
                    break;

                case 'create_wall':
                    this.board.addPiece({
                        type: 'wall',
                        x: result.position.x,
                        y: result.position.y,
                        player: 'neutral',
                        pluginSource: 'Obstacle'
                    });
                    this.showNotification(result.message, 'success');
                    this.render();
                    break;

                case 'kill_piece':
                    this.board.removePiece(result.target);
                    this.showKillFeed(`${this.currentPlayer === 'red' ? '🔴' : '⚫'}扑克`, `${result.target.player === 'red' ? '🔴' : '⚫'}${result.target.type}`, 'kill');
                    this.showNotification(result.message, 'success');
                    this.render();
                    break;

                case 'nuke_area':
                    result.targets.forEach(t => this.board.removePiece(t));
                    this.showNotification(result.message, 'success');
                    this.render();
                    break;
            }

            this.waitingForTarget = null;
            return true;
        } else {
            this.showNotification('无效目标，请重新选择！', 'warning');
            return false;
        }
    }

    showKillFeed(killerName, victimName, type = 'eat') {
        const feedContainer = document.getElementById('kill-feed');
        const item = document.createElement('div');
        item.className = 'kill-feed-item';

        const killerColor = killerName.includes('🔴') ? 'color: #ff4444;' : 'color: #999;';
        const victimColor = victimName.includes('🔴') ? 'color: #ff4444;' : 'color: #999;';
        const icon = type === 'capture' ? '☠️' : '⚔️';

        item.innerHTML = `
            <span style="${killerColor}">${killerName}</span>
            <span style="color: #FFD700; margin: 0 8px; font-size: 16px;">${icon}</span>
            <span style="${victimColor}">${victimName}</span>
        `;

        feedContainer.appendChild(item);

        // 3秒后淡出
        setTimeout(() => {
            item.classList.add('fading');
            setTimeout(() => item.remove(), 500);
        }, 3000);
    }

    render() {
        // 清空画布
        this.ctx.fillStyle = '#f5f5dc';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制棋盘网格
        this.drawGrid();

        // 绘制所有棋子（象棋和围棋同时显示）
        this.board.pieces.forEach(piece => {
            const x = 40 + piece.x * 50;
            const y = 40 + piece.y * 50;
            // 检查棋子是否在烟雾中
            let isHidden = false;
            for (const smoke of this.board.smokeEffects) {
                if (Math.abs(piece.x - smoke.x) <= 1 && Math.abs(piece.y - smoke.y) <= 1) {
                    // 如果是敌方烟雾，且不是当前回合玩家放的，则隐藏
                    // 规则修正：只有放置烟雾的玩家可以看到其中内容。
                    // 当前渲染视角如果是放置者，则可见；否则不可见。
                    // 这里简化逻辑：当前操作玩家 === 烟雾放置者 ? 可见 : 隐形
                    if (this.currentPlayer !== smoke.player) {
                        isHidden = true;
                    }
                }
            }

            if (!isHidden) {
                this.pluginManager.renderPiece(this.ctx, piece, x, y, 50);

                // 绘制选中高亮（下棋模式）
                if (this.gameMode === 'move' && this.selectedPiece === piece) {
                    this.ctx.strokeStyle = '#FFD700';
                    this.ctx.lineWidth = 3;
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, 25, 0, Math.PI * 2);
                    this.ctx.stroke();
                }

                // 使用StatusEffectManager渲染所有效果
                this.effectManager.renderEffects(this.ctx, piece, x, y);
            }
        });

        // 绘制烟雾效果（在棋子之上，但如果是己方烟雾半透明，敌方全黑）
        // 绘制烟雾效果（圆形/云雾状）
        this.board.smokeEffects.forEach(smoke => {
            // 计算3x3区域的中心点像素坐标
            // smoke.x, smoke.y 是中心格子坐标
            const updatedCenterX = 40 + smoke.x * 50;
            const updatedCenterY = 40 + smoke.y * 50;
            const radius = 75; // 1.5个格子宽度，覆盖3x3

            this.ctx.save();

            if (this.currentPlayer === smoke.player) {
                // 己方视角：半透明圆形烟雾
                this.ctx.beginPath();
                this.ctx.arc(updatedCenterX, updatedCenterY, radius, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(128, 128, 128, 0.2)'; // 更淡一点
                this.ctx.fill();

                this.ctx.strokeStyle = 'rgba(128, 128, 128, 0.5)';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]); // 虚线边缘
                this.ctx.stroke();
            } else {
                // 敌方视角：浓厚迷雾（圆形）
                const gradient = this.ctx.createRadialGradient(
                    updatedCenterX, updatedCenterY, 10,
                    updatedCenterX, updatedCenterY, radius
                );
                // 中心浓，边缘淡
                gradient.addColorStop(0, 'rgba(60, 60, 60, 0.95)');
                gradient.addColorStop(0.7, 'rgba(80, 80, 80, 0.85)');
                gradient.addColorStop(1, 'rgba(100, 100, 100, 0)'); // 边缘羽化

                this.ctx.beginPath();
                this.ctx.arc(updatedCenterX, updatedCenterY, radius + 10, 0, Math.PI * 2); // 稍微大一点以覆盖边缘
                this.ctx.fillStyle = gradient;
                this.ctx.fill();

                // 绘制问号
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                this.ctx.font = 'bold 50px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('?', updatedCenterX, updatedCenterY);
            }

            this.ctx.restore();
        });
    }

    drawGrid() {
        const padding = 40;
        const gridSize = 50;

        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;

        // 绘制竖线
        for (let i = 0; i <= 8; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(padding + i * gridSize, padding);
            this.ctx.lineTo(padding + i * gridSize, padding + 9 * gridSize);
            this.ctx.stroke();
        }

        // 绘制横线
        for (let i = 0; i <= 9; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(padding, padding + i * gridSize);
            this.ctx.lineTo(padding + 8 * gridSize, padding + i * gridSize);
            this.ctx.stroke();
        }

        // 绘制楚河汉界
        this.ctx.fillStyle = '#666';
        this.ctx.font = '14px serif';
        this.ctx.textAlign = 'center';
        // 绘制楚河汉界
        this.ctx.fillStyle = '#666';
        this.ctx.font = '14px serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('楚河', padding + gridSize * 2, padding + gridSize * 4.5 + 5);
        this.ctx.fillText('汉界', padding + gridSize * 6, padding + gridSize * 4.5 + 5);

        // 绘制河道封锁效果
        if (this.board.riverBlocked) {
            const riverY = padding + 4 * gridSize;
            const riverHeight = gridSize;
            const boardWidth = 8 * gridSize;

            this.ctx.save();
            this.ctx.fillStyle = 'rgba(100, 149, 237, 0.5)'; // 半透明蓝色
            this.ctx.fillRect(padding, riverY, boardWidth, riverHeight);

            // 绘制波浪线或封锁标记
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([10, 10]);
            this.ctx.beginPath();
            this.ctx.moveTo(padding, riverY + riverHeight / 2);
            this.ctx.lineTo(padding + boardWidth, riverY + riverHeight / 2);
            this.ctx.stroke();

            // 绘制文字
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.shadowColor = 'black';
            this.ctx.shadowBlur = 4;
            this.ctx.fillText('🚫 河道封锁 🚫', padding + boardWidth / 2, riverY + riverHeight / 2 + 8);

            this.ctx.restore();
        }
    }
}

// 启动应用
window.addEventListener('DOMContentLoaded', () => {
    window.app = new ChaosChessApp();
});
