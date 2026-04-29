import { PluginManager } from './core/PluginManager.js';
import { EventBus } from './core/EventBus.js';
import { Board } from './core/Board.js';
import { ChineseChessPlugin } from './plugins/pieces/ChineseChess/ChineseChessPlugin.js';
import { GoPlugin } from './plugins/pieces/Go/GoPlugin.js';
import { PokerPlugin } from './plugins/cards/Poker/PokerPlugin.js';
import { InternationalChessPlugin } from './plugins/pieces/InternationalChess/InternationalChessPlugin.js';
import { StatusEffectManager } from './core/StatusEffectManager.js';
import { Renderer } from './ui/Renderer.js';
import { FeedbackController } from './ui/FeedbackController.js';
import { AppUIController } from './ui/AppUIController.js';
import { PokerController } from './game/PokerController.js';
import { TurnController } from './game/TurnController.js';
import { GoController } from './game/GoController.js';
import { ChessController } from './game/ChessController.js';
import { InputController } from './game/InputController.js';

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
        this.renderer = new Renderer(this.canvas, this.pluginManager);
        this.feedback = new FeedbackController();
        this.ui = new AppUIController(this);
        this.pokerController = new PokerController(this);
        this.turnController = new TurnController(this);
        this.goController = new GoController(this);
        this.chessController = new ChessController(this);
        this.inputController = new InputController(this);

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
        this.waitingForTarget = null;
        this.extraTurns = 0;

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

        this.inputController.bindCanvasClick();

        // 添加模式切换按钮
        this.addModeToggle();

        console.log('✓ Application initialized');
    }

    addModeToggle() {
        this.ui.initControls();
    }

    toggleMode() {
        this.gameMode = this.gameMode === 'move' ? 'place' : 'move';
        this.selectedPiece = null;

        this.ui.updateModeUI(this.gameMode);

        this.render();
    }

    // 开发者测试方法
    testEffect(handType) {
        this.pokerController.testEffect(handType);
    }

    // 游戏内通知系统
    showNotification(message, type = 'info') {
        this.feedback.showNotification(message, type);
    }

    handleGoClick(gridX, gridY) {
        this.goController.handleGoClick(gridX, gridY);
    }

    // 切换玩家并处理状态效果
    switchPlayer() {
        this.turnController.switchPlayer();
    }

    handleChessClick(gridX, gridY) {
        this.chessController.handleChessClick(gridX, gridY);
    }

    handlePromotion(type) {
        this.chessController.handlePromotion(type);
    }

    updateStatus(message) {
        this.ui.updateStatus(message);
    }

    displayPlugins() {
        const plugins = this.pluginManager.listPlugins();
        this.ui.displayPlugins(plugins);
    }

    togglePoker() {
        this.pokerController.togglePoker();
    }

    playPokerHand() {
        this.pokerController.playPokerHand();
    }

    executeTargetEffect(x, y) {
        return this.pokerController.executeTargetEffect(x, y);
    }

    showKillFeed(killerName, victimName, type = 'eat') {
        this.feedback.showKillFeed(killerName, victimName, type);
    }

    render() {
        this.renderer.renderLocalGame({
            board: this.board,
            gameMode: this.gameMode,
            selectedPiece: this.selectedPiece,
            currentPlayer: this.currentPlayer,
            effectManager: this.effectManager
        });
    }
}

// 启动应用
window.addEventListener('DOMContentLoaded', () => {
    window.app = new ChaosChessApp();
});
