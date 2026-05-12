const PLAYER_COLORS = ['red', 'black'];
const PROTOCOL_VERSION = '1';

const EFFECT_PRICES = {
    intl_chess_global: 360,
    flip_chess_pair: 280,
    gomoku_mode: 300,
    skeleton_revival: 260,
    ethereal_step: 240,
    smoke_bomb: 220,
    dragon_wrath: 400,
    determination: 460
};

function createEconomy() {
    return { credits: 800, lossStreak: 0, graveyard: 0 };
}

function createEmptyLoadout() {
    return {
        purchasedEffects: [],
        flipChessStock: 0,
        gomokuMode: false,
        skeletonRevival: false,
        etherealStep: false,
        smokeBomb: false,
        dragonWrathUsed: false,
        determinationAvailable: false,
        determinationSavedState: null,
        etherealStepCharges: 0,
        smokeBombCharges: 0
    };
}

export class Room {
    constructor(id, hostPlayer) {
        this.id = id;
        this.createdAt = Date.now();
        this.lastActiveAt = Date.now();
        this.finishedAt = null;
        this.status = 'waiting';
        this.seq = 0;
        this.lastAction = null;
        this.lastActionBy = null;
        this.lastActionSeq = 0;
        this.sharedState = null;
        this.players = [];
        this.readyByPlayer = {};
        this.matchState = {
            mode: 'BO3',
            score: { red: 0, black: 0 },
            currentRound: 0,
            targetWins: 2,
            winner: null,
            roundsDragonWrathUsed: { red: false, black: false },
            determinationPurchased: { red: false, black: false }
        };
        this.roundState = {
            status: 'waiting',
            currentBuyer: null,
            buyEndsAt: null,
            turnColor: 'red',
            winner: null,
            reason: null,
            economies: {
                red: createEconomy(),
                black: createEconomy()
            },
            loadouts: {
                red: createEmptyLoadout(),
                black: createEmptyLoadout()
            }
        };

        this.addPlayer(hostPlayer);
    }

    addPlayer(player) {
        if (this.players.length >= 2) {
            return { success: false, reason: '房间已满' };
        }

        const color = PLAYER_COLORS[this.players.length];
        const entry = {
            id: player.id,
            name: player.name,
            token: player.token,
            color,
            online: true,
            disconnectedAt: null
        };
        this.players.push(entry);
        this.readyByPlayer[player.id] = false;
        player.color = color;

        if (this.players.length === 2) {
            this.status = 'ready_check';
        }

        return { success: true, color };
    }

    removePlayer(playerId) {
        const idx = this.players.findIndex(p => p.id === playerId);
        if (idx === -1) {
            return { success: false, reason: '玩家不存在' };
        }

        this.players.splice(idx, 1);
        delete this.readyByPlayer[playerId];

        if (this.players.length === 0) {
            this.status = 'finished';
            this.finishedAt = Date.now();
        } else {
            this.status = 'waiting';
            this.players = this.players.map((p, index) => ({ ...p, color: PLAYER_COLORS[index] }));
            this.readyByPlayer = Object.fromEntries(this.players.map(p => [p.id, false]));
            this.lastActiveAt = Date.now();
        }

        return { success: true };
    }

    setReady(playerId, ready) {
        if (!(playerId in this.readyByPlayer)) {
            return { success: false, reason: '玩家不在房间中' };
        }
        this.readyByPlayer[playerId] = !!ready;
        this.lastActiveAt = Date.now();
        return { success: true };
    }

    canStartMatch() {
        if (this.players.length !== 2) {
            return { success: false, reason: '需要2名玩家才能开始' };
        }
        const allReady = this.players.every(p => this.readyByPlayer[p.id]);
        if (!allReady) {
            return { success: false, reason: '有玩家未准备' };
        }
        return { success: true };
    }

    startMatch(mode = 'BO3') {
        const check = this.canStartMatch();
        if (!check.success) {
            return check;
        }

        const targetWins = mode === 'BO5' ? 3 : 2;
        this.status = 'playing';
        this.lastActiveAt = Date.now();
        this.finishedAt = null;
        this.matchState = {
            mode,
            score: { red: 0, black: 0 },
            currentRound: 1,
            targetWins,
            winner: null,
            roundsDragonWrathUsed: { red: false, black: false },
            determinationPurchased: { red: false, black: false }
        };

        this.roundState.status = 'buying';
        this.roundState.currentBuyer = null;
        this.roundState.buyEndsAt = Date.now() + 15000;
        this.roundState.turnColor = 'red';
        this.roundState.winner = null;
        this.roundState.reason = null;
        this.roundState.loadouts = {
            red: createEmptyLoadout(),
            black: createEmptyLoadout()
        };

        return { success: true };
    }

    getPlayerById(playerId) {
        return this.players.find(p => p.id === playerId);
    }

    applyAction(playerId, action) {
        if (!action || typeof action !== 'object') {
            return { success: false, reason: '无效操作' };
        }

        const player = this.getPlayerById(playerId);
        if (!player) {
            return { success: false, reason: '玩家不在房间中' };
        }

        let result;
        switch (action.kind) {
            case 'PURCHASE_EFFECT':
                result = this.applyPurchase(player, action);
                break;
            case 'BEGIN_ROUND':
                result = this.applyBeginRound(player);
                break;
            case 'NEXT_ROUND':
                result = this.applyNextRound(player);
                break;
            case 'CANVAS_CLICK':
                result = this.applyCanvasClick(player, action);
                break;
            case 'SYNC_STATE':
                result = this.applySyncState(player, action);
                break;
            default:
                result = { success: false, reason: `不支持的操作类型: ${action.kind}` };
                break;
        }

        if (result.success && result.changed !== false) {
            this.lastAction = action;
            this.lastActionBy = playerId;
            this.lastActionSeq += 1;
            this.lastActiveAt = Date.now();
        }

        return result;
    }

    applyCanvasClick(player, action) {
        return { success: true, changed: false, reason: 'CANVAS_CLICK 已废弃，请使用 SYNC_STATE' };
    }

    applySyncState(player, action) {
        if (this.roundState.status !== 'playing') {
            return { success: false, reason: '当前不在对局时间' };
        }
        if (player.color !== this.roundState.turnColor) {
            return { success: false, reason: '当前不是你的行动方' };
        }
        if (!action || !action.state || !action.boardState) {
            return { success: false, reason: '缺少同步状态数据' };
        }

        const nextSharedState = {
            boardState: action.boardState,
            currentPlayer: action.state.currentPlayer,
            gameMode: action.state.gameMode,
            placeModePieceType: action.state.placeModePieceType,
            riverBlockedTurns: action.state.riverBlockedTurns || 0,
            turnBudget: action.state.turnBudget || { red: 1, black: 1 },
            waitingForTarget: action.state.waitingForTarget || null,
            itemSlotOwner: action.state.itemSlotOwner || action.state.currentPlayer
        };

        const prevSerialized = JSON.stringify(this.sharedState || {});
        const nextSerialized = JSON.stringify(nextSharedState);
        const prevTurn = this.roundState.turnColor;

        this.sharedState = nextSharedState;

        if (action.roundState?.economies) {
            this.roundState.economies = JSON.parse(JSON.stringify(action.roundState.economies));
        }
        if (action.roundState?.loadouts) {
            this.roundState.loadouts = JSON.parse(JSON.stringify(action.roundState.loadouts));
        }
        if (action.matchState) {
            this.matchState = {
                ...this.matchState,
                ...JSON.parse(JSON.stringify(action.matchState)),
                currentRound: this.matchState.currentRound,
                winner: this.matchState.winner
            };
        }

        const nextTurn = action.state.currentPlayer;
        if (nextTurn === 'red' || nextTurn === 'black') {
            this.roundState.turnColor = nextTurn;
        } else {
            this.roundState.turnColor = this.roundState.turnColor === 'red' ? 'black' : 'red';
        }

        const changed = prevSerialized !== nextSerialized || prevTurn !== this.roundState.turnColor;
        return { success: true, changed };
    }

    applyPurchase(player, action) {
        if (this.roundState.status !== 'buying') {
            return { success: false, reason: '当前非购买阶段' };
        }

        const effectId = action.effectId;
        if (!effectId) {
            return { success: false, reason: '缺少效果ID' };
        }

        const price = EFFECT_PRICES[effectId] ?? 300;
        const loadout = this.roundState.loadouts[player.color];
        const economy = this.roundState.economies[player.color];
        const boughtMatchLimitedDragonWrath = this.matchState.roundsDragonWrathUsed?.[player.color];
        const boughtMatchLimitedDetermination = this.matchState.determinationPurchased?.[player.color];

        if (loadout.purchasedEffects.length >= 3) {
            return { success: false, reason: '每局最多购买3项' };
        }
        if (effectId !== 'flip_chess_pair' && loadout.purchasedEffects.includes(effectId)) {
            return { success: false, reason: '同类效果不可重复购买' };
        }
        if (effectId === 'dragon_wrath' && boughtMatchLimitedDragonWrath) {
            return { success: false, reason: '守护巨龙之怒整场比赛每方仅可购买 1 次。' };
        }
        if (effectId === 'determination' && boughtMatchLimitedDetermination) {
            return { success: false, reason: '决心整场比赛每方仅可购买 1 次。' };
        }
        if (economy.credits < price) {
            return { success: false, reason: '资金不足' };
        }

        economy.credits -= price;
        loadout.purchasedEffects.push(effectId);
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
            loadout.etherealStepCharges = 1;
        }
        if (effectId === 'smoke_bomb') {
            loadout.smokeBomb = true;
            loadout.smokeBombCharges = 1;
        }
        if (effectId === 'dragon_wrath') {
            loadout.dragonWrathUsed = true;
            this.matchState.roundsDragonWrathUsed[player.color] = true;
        }
        if (effectId === 'determination') {
            loadout.determinationAvailable = true;
            loadout.determinationSavedState = null;
            this.matchState.determinationPurchased[player.color] = true;
        }
        return { success: true, changed: true };
    }

    applyBeginRound(player) {
        if (this.roundState.status !== 'buying') {
            return { success: false, reason: '当前不在准备阶段' };
        }

        this.roundState.status = 'playing';
        this.roundState.currentBuyer = null;
        this.roundState.buyEndsAt = null;
        return { success: true, changed: true };
    }

    applyNextRound(player) {
        if (this.roundState.status !== 'ended') {
            return { success: false, reason: '当前局未结束，不能开始下一局' };
        }
        if (player.color !== 'red') {
            return { success: false, reason: '仅红方可开始下一局' };
        }

        this.matchState.currentRound += 1;
        this.roundState.status = 'buying';
        this.roundState.currentBuyer = null;
        this.roundState.buyEndsAt = Date.now() + 15000;
        this.roundState.turnColor = 'red';
        this.roundState.winner = null;
        this.roundState.reason = null;
        this.roundState.loadouts = {
            red: createEmptyLoadout(),
            black: createEmptyLoadout()
        };
        this.lastActiveAt = Date.now();

        return { success: true, changed: true };
    }

    markRoundEnded(winnerColor, reason) {
        this.roundState.status = 'ended';
        this.roundState.buyEndsAt = null;
        this.roundState.winner = winnerColor;
        this.roundState.reason = reason;

        this.matchState.score[winnerColor] += 1;
        if (this.matchState.score[winnerColor] >= this.matchState.targetWins) {
            this.matchState.winner = winnerColor;
            this.status = 'match_end';
            this.finishedAt = Date.now();
        }
        this.lastActiveAt = Date.now();
    }

    markPlayerOffline(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) {
            return { success: false, reason: '玩家不存在' };
        }

        player.online = false;
        player.disconnectedAt = Date.now();
        this.lastActiveAt = Date.now();
        return { success: true };
    }

    restorePlayerByToken(playerToken, nextClientId) {
        const player = this.players.find(p => p.token === playerToken);
        if (!player) {
            return { success: false, reason: '未找到玩家席位' };
        }

        const prevClientId = player.id;
        if (prevClientId !== nextClientId) {
            const prevReady = !!this.readyByPlayer[prevClientId];
            delete this.readyByPlayer[prevClientId];
            this.readyByPlayer[nextClientId] = prevReady;
        }

        player.id = nextClientId;
        player.online = true;
        player.disconnectedAt = null;
        this.lastActiveAt = Date.now();
        return { success: true, color: player.color, prevClientId };
    }

    switchHostColor(hostId) {
        if (this.players.length < 2) {
            return { success: false, reason: '需要两名玩家才能切换颜色' };
        }
        if (!this.players[0] || this.players[0].id !== hostId) {
            return { success: false, reason: '仅房主可切换颜色' };
        }
        if (this.status !== 'ready_check' && this.status !== 'waiting') {
            return { success: false, reason: '仅准备阶段可切换颜色' };
        }

        const [first, second] = this.players;
        const swapped = [
            { ...second, color: 'red' },
            { ...first, color: 'black' }
        ];
        this.players = swapped;
        this.readyByPlayer = Object.fromEntries(this.players.map(p => [p.id, false]));
        this.lastActiveAt = Date.now();
        return { success: true };
    }

    hasOnlinePlayers() {
        return this.players.some(p => p.online);
    }

    nextSeq() {
        this.seq += 1;
        return this.seq;
    }

    getSnapshot() {
        return {
            protocolVersion: PROTOCOL_VERSION,
            roomId: this.id,
            seq: this.seq,
            status: this.status,
            players: this.players,
            readyByPlayer: this.readyByPlayer,
            matchState: this.matchState,
            roundState: this.roundState,
            sharedState: this.sharedState,
            lastAction: this.lastAction,
            lastActionBy: this.lastActionBy,
            lastActionSeq: this.lastActionSeq,
            createdAt: this.createdAt,
            lastActiveAt: this.lastActiveAt,
            finishedAt: this.finishedAt
        };
    }

    getInfo() {
        return {
            id: this.id,
            status: this.status,
            playerCount: this.players.length,
            players: this.players,
            createdAt: this.createdAt
        };
    }
}
