const MATCH_TARGET_WINS = {
    BO3: 2,
    BO5: 3
};

const DEFAULT_ECONOMY_CONFIG = {
    baseCredits: 800,
    winCredits: 500,
    loseCredits: 300,
    captureCredits: {
        Pawn: 80,
        stone: 70,
        翻: 120,
        wall: 60,
        default: 120
    },
    effectPrices: {
        poker_global: 420,
        intl_chess_global: 360,
        flip_chess_pair: 280,
        gomoku_mode: 300,
        skeleton_revival: 260,
        ethereal_step: 240,
        smoke_bomb: 220,
        0: 150,
        1: 220,
        2: 260,
        3: 300,
        4: 320,
        5: 380,
        6: 420,
        7: 520,
        8: 620,
        9: 760
    }
};

export class MatchController {
    constructor(app) {
        this.app = app;
        this.config = DEFAULT_ECONOMY_CONFIG;
        this.matchState = null;
        this.roundState = null;
    }

    initMatch(mode = 'BO3') {
        const targetWins = MATCH_TARGET_WINS[mode] || MATCH_TARGET_WINS.BO3;
        this.matchState = {
            mode,
            score: { red: 0, black: 0 },
            targetWins,
            currentRound: 0,
            winner: null
        };

        this.roundState = {
            status: 'ended',
            winner: null,
            reason: null,
            economies: {
                red: { credits: this.config.baseCredits, lossStreak: 0, graveyard: 0 },
                black: { credits: this.config.baseCredits, lossStreak: 0, graveyard: 0 }
            },
            loadouts: {
                red: this.createEmptyLoadout(),
                black: this.createEmptyLoadout()
            }
        };

        this.startNextRound();
    }

    startNextRound() {
        if (this.matchState.winner) {
            return;
        }

        this.matchState.currentRound += 1;
        this.roundState.status = 'buying';
        this.roundState.winner = null;
        this.roundState.reason = null;
        this.roundState.loadouts.red = this.createEmptyLoadout();
        this.roundState.loadouts.black = this.createEmptyLoadout();

        this.app.board.clear();
        this.app.board.riverBlocked = false;
        this.app.board.smokeEffects = [];
        this.app.selectedPiece = null;
        this.app.waitingForTarget = null;
        this.app.riverBlockedTurns = 0;
        this.app.currentPlayer = 'red';
        this.app.gameMode = 'move';
        this.app.placeModePieceType = 'go';
        this.app.resetTurnBudget('red', 1);
        this.app.resetTurnBudget('black', 1);

        const chineseChess = this.app.pluginManager.getPlugin('pieces', 'ChineseChess');
        if (chineseChess) {
            const initialPieces = chineseChess.getInitialSetup();
            initialPieces.forEach(piece => this.app.board.addPiece(piece));
        }

        if (this.app.pokerPlugin) {
            this.app.pokerHands.red = this.app.pokerPlugin.dealHand(7);
            this.app.pokerHands.black = this.app.pokerPlugin.dealHand(7);
        }

        this.app.updateStatus(this.getRoundShopStatusText());
        if (this.app.ui && typeof this.app.ui.renderRoundShop === 'function') {
            this.app.ui.renderRoundShop();
        }
        this.app.render();
    }

    beginRound() {
        if (!this.roundState || this.roundState.status !== 'buying') {
            return false;
        }

        this.applyRoundLoadoutEffects();
        this.roundState.status = 'playing';
        this.app.updateStatus(this.getRoundStatusText());
        if (this.app.ui && typeof this.app.ui.renderRoundShop === 'function') {
            this.app.ui.renderRoundShop();
        }
        return true;
    }

    createEmptyLoadout() {
        return { purchasedEffects: [], flipChessStock: 0, gomokuMode: false, skeletonRevival: false, etherealStep: false, smokeBomb: false };
    }

    applyRoundLoadoutEffects() {
        this.applyInternationalChessLoadoutForPlayer('red');
        this.applyInternationalChessLoadoutForPlayer('black');
    }

    applyInternationalChessLoadoutForPlayer(player) {
        if (!this.canUsePurchasedEffect('intl_chess_global', player)) {
            return;
        }

        const intlPlugin = this.app.pluginManager.getPlugin('pieces', 'InternationalChess');
        if (!intlPlugin || typeof intlPlugin.getInitialSetup !== 'function') {
            this.app.showNotification('国际象棋插件未加载，效果未生效', 'warning');
            return;
        }

        const pieces = this.app.board.pieces;
        this.app.board.pieces = pieces.filter(p => {
            if (p.player !== player) return true;
            return p.pluginSource === 'Go';
        });

        const targetSetup = intlPlugin.getInitialSetup().filter(p => p.player === player);
        targetSetup.forEach(piece => {
            this.app.board.addPiece({ ...piece, hasMoved: false });
        });

        this.consumePurchasedEffect('intl_chess_global', player);
        this.app.showNotification(`${player === 'red' ? '红方' : '黑方'}已启用国际象棋体系`, 'info');
    }

    getRoundStatusText() {
        const round = this.matchState.currentRound;
        return `第 ${round} 局 - 当前玩家: ${this.app.currentPlayer === 'red' ? '红方' : '黑方'} | 剩余走棋 ${this.app.getCurrentTurnMovesLeft()}`;
    }

    isRoundActive() {
        return this.roundState?.status === 'playing';
    }

    isRoundBuying() {
        return this.roundState?.status === 'buying';
    }

    purchaseEffect(effectId, player = this.app.currentPlayer) {
        if (!this.isRoundBuying()) {
            return { success: false, message: '仅可在局前准备阶段购买，开局后无法购买。' };
        }

        const loadout = this.roundState.loadouts[player];
        const slotCost = this.getEffectSlotCost(effectId);
        if (this.getPurchasedEffectSlotUsage(loadout) + slotCost > 3) {
            return { success: false, message: '本局最多购买 3 个效果。' };
        }

        if (effectId !== 'flip_chess_pair' && loadout.purchasedEffects.some(item => item.effectId === effectId)) {
            return { success: false, message: '同名效果每局只能购买 1 次。' };
        }

        const price = this.getEffectPrice(effectId);
        const economy = this.roundState.economies[player];
        if (economy.credits < price) {
            return { success: false, message: `余额不足，当前 ${economy.credits}，需要 ${price}。` };
        }

        economy.credits -= price;
        loadout.purchasedEffects.push({ effectId, used: false, slotCost });
        if (effectId === 'flip_chess_pair') {
            loadout.flipChessStock += 2;
        }
        if (effectId === 'gomoku_mode') {
            loadout.gomokuMode = true;
        }
        if (effectId === 'skeleton_revival') {
            loadout.skeletonRevival = true;
        }
        if (effectId === 'ethereal_step') {
            loadout.etherealStep = true;
        }
        if (effectId === 'smoke_bomb') {
            loadout.smokeBomb = true;
        }
        if (this.app.ui && typeof this.app.ui.renderRoundShop === 'function') {
            this.app.ui.renderRoundShop();
        }
        return { success: true, message: `购买成功：效果 ${effectId}，花费 ${price}` };
    }

    getEffectSlotCost(effectId) {
        return effectId === 'flip_chess_pair' ? 1 : 1;
    }

    getPurchasedEffectSlotUsage(loadout) {
        return loadout.purchasedEffects.reduce((total, item) => total + (item.slotCost || 1), 0);
    }

    getEffectPrice(effectId) {
        return this.config.effectPrices[effectId] ?? 300;
    }

    canUsePurchasedEffect(effectId, player = this.app.currentPlayer) {
        const loadout = this.roundState.loadouts[player];
        return loadout.purchasedEffects.some(item => item.effectId === effectId && !item.used);
    }

    consumePurchasedEffect(effectId, player = this.app.currentPlayer) {
        const loadout = this.roundState.loadouts[player];
        const item = loadout.purchasedEffects.find(entry => entry.effectId === effectId && !entry.used);
        if (item) {
            item.used = true;
            return true;
        }
        return false;
    }

    onPieceCaptured(capturedPiece, killerPlayer = this.app.currentPlayer) {
        const credits = this.getCaptureCredits(capturedPiece);
        this.roundState.economies[killerPlayer].credits += credits;
        if (this.isGraveyardEligible(capturedPiece, killerPlayer)) {
            this.roundState.economies[killerPlayer].graveyard += 1;
        }
    }

    isGraveyardEligible(capturedPiece, killerPlayer) {
        if (!capturedPiece || !killerPlayer) return false;
        if (capturedPiece.player !== 'red' && capturedPiece.player !== 'black') return false;
        if (capturedPiece.player === killerPlayer) return false;
        if (capturedPiece.pluginSource === 'Go') return false;
        if (capturedPiece.pluginSource === 'Obstacle') return false;
        return true;
    }

    getCaptureCredits(piece) {
        if (!piece) return 0;
        const key = piece.type;
        return this.config.captureCredits[key] ?? this.config.captureCredits.default;
    }

    endRound(winner, reason = '将军') {
        if (!this.isRoundActive()) {
            return;
        }

        this.roundState.status = 'ended';
        this.roundState.winner = winner;
        this.roundState.reason = reason;

        const loser = winner === 'red' ? 'black' : 'red';
        this.roundState.economies[winner].credits += this.config.winCredits;
        this.roundState.economies[loser].credits += this.config.loseCredits;

        this.roundState.economies[winner].lossStreak = 0;
        this.roundState.economies[loser].lossStreak += 1;

        this.matchState.score[winner] += 1;
        this.clearRoundLoadouts();

        const winnerScore = this.matchState.score[winner];
        if (winnerScore >= this.matchState.targetWins) {
            this.matchState.winner = winner;
            this.app.showNotification(`${winner === 'red' ? '红方' : '黑方'} 赢下比赛！`, 'success');
            this.app.updateStatus(`比赛结束：${winner === 'red' ? '红方' : '黑方'} 胜利`);
            if (this.app.ui && typeof this.app.ui.renderRoundShop === 'function') {
                this.app.ui.renderRoundShop();
            }
            return;
        }

        this.app.showNotification(`${winner === 'red' ? '红方' : '黑方'} 赢下本局（${reason}）`, 'success');
        this.app.updateStatus(this.getMatchScoreText());
        if (this.app.ui && typeof this.app.ui.renderRoundShop === 'function') {
            this.app.ui.renderRoundShop();
        }
    }

    getRoundShopStatusText() {
        return `第 ${this.matchState.currentRound} 局准备阶段：请先购买效果，然后开始本局`;
    }

    getMatchScoreText() {
        return `比分 ${this.matchState.score.red}:${this.matchState.score.black}，点击 startNextRound() 开启下一局`;
    }

    clearRoundLoadouts() {
        this.roundState.loadouts.red = this.createEmptyLoadout();
        this.roundState.loadouts.black = this.createEmptyLoadout();
    }

    getEconomy(player) {
        return this.roundState.economies[player];
    }

    getLoadout(player) {
        return this.roundState.loadouts[player];
    }

    getFlipChessStock(player) {
        return this.roundState.loadouts[player]?.flipChessStock || 0;
    }

    consumeFlipChessStock(player = this.app.currentPlayer) {
        const loadout = this.roundState.loadouts[player];
        if (!loadout || loadout.flipChessStock <= 0) {
            return false;
        }

        loadout.flipChessStock -= 1;
        return true;
    }

    hasGomokuMode(player) {
        return Boolean(this.roundState.loadouts[player]?.gomokuMode);
    }

    hasSkeletonRevival(player) {
        return Boolean(this.roundState.loadouts[player]?.skeletonRevival);
    }

    hasEtherealStep(player) {
        return Boolean(this.roundState.loadouts[player]?.etherealStep);
    }

    hasSmokeBomb(player) {
        return Boolean(this.roundState.loadouts[player]?.smokeBomb);
    }

    spendGraveyard(player = this.app.currentPlayer, amount = 1) {
        const economy = this.roundState.economies[player];
        const cost = Math.max(0, amount);
        if (!economy || economy.graveyard < cost) {
            return false;
        }
        economy.graveyard -= cost;
        return true;
    }

    isGoCaptureDisabledFor(player) {
        const opponent = player === 'red' ? 'black' : 'red';
        return this.hasGomokuMode(player) && !this.hasGomokuMode(opponent);
    }
}
