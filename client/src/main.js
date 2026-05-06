import { PluginManager } from './core/PluginManager.js';
import { EventBus } from './core/EventBus.js';
import { Board } from './core/Board.js';
import { ChineseChessPlugin } from './plugins/pieces/ChineseChess/ChineseChessPlugin.js';
import { GoPlugin } from './plugins/pieces/Go/GoPlugin.js';
import { PokerPlugin } from './plugins/cards/Poker/PokerPlugin.js';
import { InternationalChessPlugin } from './plugins/pieces/InternationalChess/InternationalChessPlugin.js';
import { FlipChessPlugin } from './plugins/pieces/FlipChess/FlipChessPlugin.js';
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
import { EffectPipeline } from './game/EffectPipeline.js';

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
        this.effectPipeline = new EffectPipeline(this);

        // Game state
        this.currentPlayer = 'red';
        this.selectedPiece = null;
        this.gameMode = 'move'; // 'move' (下棋模式) or 'place' (落子模式)
        this.placeModePieceType = 'go';

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
        this.turnBudget = {
            red: 1,
            black: 1
        };
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

            const flipChess = new FlipChessPlugin();
            this.pluginManager.registerPiecePlugin('FlipChess', flipChess);

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

    setPlaceModePieceType(pieceType) {
        if (pieceType === 'flip' || pieceType === 'skeleton') {
            this.placeModePieceType = pieceType;
        } else {
            this.placeModePieceType = 'go';
        }
        this.ui.updateModeUI(this.gameMode);
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

    getCurrentTurnMovesLeft() {
        return this.turnBudget[this.currentPlayer] || 0;
    }

    setCurrentTurnMovesLeft(value) {
        this.turnBudget[this.currentPlayer] = Math.max(0, value);
    }

    addTurnMoves(player, delta) {
        const next = (this.turnBudget[player] || 0) + delta;
        this.turnBudget[player] = Math.max(0, next);
    }

    consumeMoveStep(stepCount = 1) {
        const cost = Math.max(0, stepCount);
        this.setCurrentTurnMovesLeft(this.getCurrentTurnMovesLeft() - cost);
        this.switchPlayer();
    }

    resetTurnBudget(player, value = 1) {
        this.turnBudget[player] = Math.max(0, value);
    }

    ensureTurnBudgetReady() {
        if ((this.turnBudget.red || 0) <= 0) {
            this.turnBudget.red = 1;
        }
        if ((this.turnBudget.black || 0) <= 0) {
            this.turnBudget.black = 1;
        }
    }

    handleChessClick(gridX, gridY) {
        return this.chessController.handleChessClick(gridX, gridY);
    }

    handlePromotion(type) {
        this.chessController.handlePromotion(type);
    }

    createFlipPiece(x, y, player = this.currentPlayer) {
        return {
            type: '翻',
            x,
            y,
            player,
            pluginSource: 'FlipChess',
            hasMoved: false
        };
    }

    isFlipPiece(piece) {
        return piece?.pluginSource === 'FlipChess' && piece?.type === '翻';
    }

    resolveFlipCapture(originPiece) {
        if (!this.isFlipPiece(originPiece)) {
            return [];
        }

        const directions = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 },
            { x: 1, y: 1 },
            { x: 1, y: -1 },
            { x: -1, y: 1 },
            { x: -1, y: -1 }
        ];
        const flipped = [];

        directions.forEach(direction => {
            const candidates = [];
            let x = originPiece.x + direction.x;
            let y = originPiece.y + direction.y;

            while (this.board.isValidPosition(x, y)) {
                const piece = this.board.getPieceAt(x, y);
                if (!piece) {
                    return;
                }

                if (piece.player !== originPiece.player) {
                    candidates.push(piece);
                    x += direction.x;
                    y += direction.y;
                    continue;
                }

                if (candidates.length > 0 && this.isFlipPiece(piece)) {
                    candidates.forEach(enemy => {
                        enemy.player = originPiece.player;
                        enemy.flippedBy = originPiece.player;
                        flipped.push(enemy);
                    });
                }
                return;
            }
        });

        return flipped;
    }

    removeFlipPieceByAbnormalStatus(piece, effectName = '异常状态') {
        if (!this.isFlipPiece(piece)) {
            return false;
        }

        this.board.removePiece(piece);
        this.showKillFeed(effectName, `${piece.player === 'red' ? '🔴' : '⚫'}翻`, 'capture');
        this.showNotification(`翻转棋受到${effectName}后立即被提走`, 'warning');
        this.render();
        return true;
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
        if (this.waitingForTarget?.type === 'ethereal_step') {
            return this.executeEtherealStepTarget(x, y);
        }
        if (this.waitingForTarget?.type === 'smoke_bomb') {
            return this.executeSmokeBombTarget(x, y);
        }
        return this.pokerController.executeTargetEffect(x, y);
    }

    startSmokeBomb() {
        if (!this.matchController?.isRoundActive()) {
            this.showNotification('当前局未开始，无法使用烟雾弹', 'warning');
            return false;
        }
        if (!this.matchController?.hasSmokeBomb(this.currentPlayer)) {
            this.showNotification('未购买烟雾弹，本局不可使用', 'warning');
            return false;
        }
        if ((this.matchController.getSmokeBombCharges(this.currentPlayer) || 0) <= 0) {
            this.showNotification('烟雾弹本局次数已用尽', 'warning');
            return false;
        }
        if (this.getCurrentTurnMovesLeft() <= 0) {
            this.showNotification('当前走棋次数已耗尽', 'warning');
            return false;
        }

        this.waitingForTarget = {
            type: 'smoke_bomb'
        };
        this.showNotification('烟雾弹：请选择棋盘目标点', 'info');
        return true;
    }

    executeSmokeBombTarget(x, y) {
        if (!this.waitingForTarget || this.waitingForTarget.type !== 'smoke_bomb') {
            return false;
        }

        if (!this.matchController.consumeSmokeBombCharge(this.currentPlayer)) {
            this.showNotification('烟雾弹次数不足', 'warning');
            return false;
        }
        this.board.smokeEffects.push({
            x,
            y,
            player: this.currentPlayer,
            turns: 3
        });
        this.waitingForTarget = null;
        this.showNotification('烟雾弹已部署（3x3）', 'success');
        this.consumeMoveStep(1);
        this.render();
        this.ui?.renderRoundShop?.();
        return true;
    }

    startEtherealStep() {
        if (!this.matchController?.isRoundActive()) {
            this.showNotification('当前局未开始，无法使用以太步', 'warning');
            return false;
        }
        if (!this.matchController?.hasEtherealStep(this.currentPlayer)) {
            this.showNotification('未购买以太步，本局不可使用', 'warning');
            return false;
        }
        if ((this.matchController.getEtherealStepCharges(this.currentPlayer) || 0) <= 0) {
            this.showNotification('以太步本局次数已用尽', 'warning');
            return false;
        }
        if (this.getCurrentTurnMovesLeft() <= 0) {
            this.showNotification('当前走棋次数已耗尽', 'warning');
            return false;
        }

        this.waitingForTarget = {
            type: 'ethereal_step',
            stage: 'source'
        };
        this.showNotification('以太步：先选择一个己方棋子', 'info');
        return true;
    }

    executeEtherealStepTarget(x, y) {
        const session = this.waitingForTarget;
        if (!session || session.type !== 'ethereal_step') {
            return false;
        }

        const piece = this.board.getPieceAt(x, y);
        if (session.stage === 'source') {
            if (!piece || piece.player !== this.currentPlayer) {
                this.showNotification('请先选择己方棋子作为移动目标', 'warning');
                return false;
            }
            session.source = piece;
            session.stage = 'anchor';
            this.showNotification('以太步：再选择一个己方棋子作为锚点', 'info');
            return false;
        }

        if (session.stage === 'anchor') {
            if (!piece || piece.player !== this.currentPlayer) {
                this.showNotification('请选择己方棋子作为锚点', 'warning');
                return false;
            }
            if (piece === session.source) {
                this.showNotification('锚点不能与被移动棋子相同', 'warning');
                return false;
            }
            session.anchor = piece;
            session.stage = 'destination';
            this.showNotification('以太步：选择锚点周围8格中的空位', 'info');
            return false;
        }

        if (session.stage === 'destination') {
            if (!this.isEtherealStepValidDestination(session.anchor, x, y)) {
                this.showNotification('目标必须是锚点周围8格内的空位', 'warning');
                return false;
            }
            if (!this.matchController.consumeEtherealStepCharge(this.currentPlayer)) {
                this.showNotification('以太步次数不足', 'warning');
                return false;
            }

            session.source.x = x;
            session.source.y = y;
            session.source.hasMoved = true;
            this.waitingForTarget = null;
            this.selectedPiece = null;
            this.showNotification('以太步生效（视为一步走棋）', 'success');
            this.consumeMoveStep(1);
            this.render();
            this.ui?.renderRoundShop?.();
            return true;
        }

        return false;
    }

    isEtherealStepValidDestination(anchor, x, y) {
        if (!anchor) return false;
        if (!this.board.isValidPosition(x, y)) return false;
        if (this.board.getPieceAt(x, y)) return false;
        const dx = Math.abs(x - anchor.x);
        const dy = Math.abs(y - anchor.y);
        return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);
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
            placeModePieceType: this.placeModePieceType,
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
                placeModePieceType: this.placeModePieceType,
                riverBlockedTurns: this.riverBlockedTurns || 0,
                turnBudget: { ...this.turnBudget },
                waitingForTarget: this.waitingForTarget
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
            this.placeModePieceType = sharedState.placeModePieceType || this.placeModePieceType;
            this.riverBlockedTurns = sharedState.riverBlockedTurns || 0;
            this.turnBudget = {
                red: sharedState.turnBudget?.red ?? this.turnBudget.red,
                black: sharedState.turnBudget?.black ?? this.turnBudget.black
            };
            this.selectedPiece = null;
            this.waitingForTarget = sharedState.waitingForTarget || null;
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
            this.placeModePieceType = action.placeModePieceType || this.placeModePieceType;
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
            effectManager: this.effectManager,
            placeModePieceType: this.placeModePieceType,
            waitingForTarget: this.waitingForTarget
        });
    }
}

// 启动应用
window.addEventListener('DOMContentLoaded', () => {
    new ChaosChessApp();
});
