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
import { MatchController } from './game/MatchController.js';
import { OnlineController } from './network/OnlineController.js';

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
        this.matchController = new MatchController(this);
        this.onlineController = new OnlineController(this);

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
        this.applyingRemoteAction = false;

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

            this.matchController.initMatch('BO3');
            console.log('✓ Match initialized in BO3 mode');
        } catch (error) {
            console.error('Failed to load plugins:', error);
        }

        // 更新状态
        this.updateStatus('插件系统已初始化 - 已进入 BO3 比赛');

        // 显示已加载的插件
        this.displayPlugins();

        // 绘制棋盘
        this.render();

        this.inputController.bindCanvasClick();

        // 添加模式切换按钮
        this.addModeToggle();

        this.connectOnline();

        console.log('✓ Application initialized');
    }

    async connectOnline() {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const wsUrl = `${protocol}://${window.location.host}/ws`;
        try {
            await this.onlineController.connect(wsUrl);
            this.showNotification('联机服务已连接', 'success');
        } catch (error) {
            console.error('Failed to connect online server:', error);
            this.showNotification('联机服务连接失败，请确认 server 已启动', 'warning');
        }
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
        return this.goController.handleGoClick(gridX, gridY);
    }

    // 切换玩家并处理状态效果
    switchPlayer() {
        this.turnController.switchPlayer();
    }

    handleChessClick(gridX, gridY) {
        return this.chessController.handleChessClick(gridX, gridY);
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

    purchaseSelectedHandEffect() {
        return this.pokerController.purchaseSelectedHandEffect();
    }

    executeTargetEffect(x, y) {
        return this.pokerController.executeTargetEffect(x, y);
    }

    purchaseEffect(effectId) {
        if (this.onlineController.getState().roomSnapshot && this.onlineController.getState().roomSnapshot.status !== 'waiting') {
            this.onlineController.sendPlayerAction({ kind: 'PURCHASE_EFFECT', effectId });
            return { success: true, message: '购买请求已发送到服务器' };
        }
        return this.matchController.purchaseEffect(effectId);
    }

    startNextRound() {
        if (this.onlineController.getState().roomSnapshot) {
            this.onlineController.sendPlayerAction({ kind: 'NEXT_ROUND' });
            return;
        }
        this.matchController.startNextRound();
    }

    beginRound() {
        if (this.onlineController.getState().roomSnapshot) {
            this.onlineController.sendPlayerAction({ kind: 'BEGIN_ROUND' });
            return true;
        }
        return this.matchController.beginRound();
    }

    endCurrentRound(winner, reason) {
        this.matchController.endRound(winner, reason);
    }

    onPieceCaptured(capturedPiece, killerPlayer) {
        this.matchController.onPieceCaptured(capturedPiece, killerPlayer);
    }

    getRoundState() {
        return this.matchController.roundState;
    }

    getMatchState() {
        return this.matchController.matchState;
    }

    getOnlineState() {
        return this.onlineController.getState();
    }

    sendCanvasClickAction(x, y) {
        this.onlineController.sendPlayerAction({
            kind: 'CANVAS_CLICK',
            x,
            y,
            mode: this.gameMode,
            currentPlayer: this.currentPlayer
        });
    }

    sendStateSyncAction() {
        this.onlineController.sendPlayerAction({
            kind: 'SYNC_STATE',
            boardState: this.board.getState(),
            state: {
                currentPlayer: this.currentPlayer,
                gameMode: this.gameMode,
                riverBlockedTurns: this.riverBlockedTurns || 0,
                extraTurns: this.extraTurns || 0
            }
        });
    }

    applyRemoteSharedState(sharedState) {
        if (!sharedState || !sharedState.boardState) return;
        this.applyingRemoteAction = true;
        try {
            this.board.setState(sharedState.boardState);
            this.currentPlayer = sharedState.currentPlayer || this.currentPlayer;
            this.gameMode = sharedState.gameMode || this.gameMode;
            this.riverBlockedTurns = sharedState.riverBlockedTurns || 0;
            this.extraTurns = sharedState.extraTurns || 0;
            this.selectedPiece = null;
            this.waitingForTarget = null;
        } finally {
            this.applyingRemoteAction = false;
        }
    }

    applyRemoteCanvasClick(action) {
        if (!action) return;
        this.applyingRemoteAction = true;
        try {
            if (this.gameMode !== action.mode) {
                this.gameMode = action.mode;
            }
            if (this.gameMode === 'place') {
                this.handleGoClick(action.x, action.y);
            } else {
                this.handleChessClick(action.x, action.y);
            }
        } finally {
            this.applyingRemoteAction = false;
        }
    }

    createOnlineRoom() {
        this.onlineController.createRoom();
    }

    joinOnlineRoom(roomId) {
        this.onlineController.joinRoom(roomId);
    }

    leaveOnlineRoom() {
        this.onlineController.leaveRoom();
    }

    setOnlineReady(ready) {
        this.onlineController.setReady(ready);
    }

    startOnlineMatch(mode) {
        this.onlineController.startMatch(mode);
    }

    refreshOnlineRooms() {
        this.onlineController.refreshRooms();
    }

    showKillFeed(killerName, victimName, type = 'eat') {
        this.feedback.showKillFeed(killerName, victimName, type);
    }

    render() {
        const onlineState = this.getOnlineState();
        const perspective = onlineState?.roomSnapshot ? (onlineState.color || 'red') : 'red';
        this.renderer.setPerspective(perspective);
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
