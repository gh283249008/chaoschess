const PLAYER_COLORS = ['red', 'black'];

export class Room {
    constructor(id, hostPlayer) {
        this.id = id;
        this.createdAt = Date.now();
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
            winner: null
        };
        this.roundState = {
            status: 'waiting',
            currentBuyer: null,
            buyEndsAt: null,
            turnColor: 'red',
            winner: null,
            reason: null,
            economies: {
                red: { credits: 800, lossStreak: 0 },
                black: { credits: 800, lossStreak: 0 }
            },
            loadouts: {
                red: { purchasedEffects: [] },
                black: { purchasedEffects: [] }
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
            color
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
        } else {
            this.status = 'waiting';
            this.players = this.players.map((p, index) => ({ ...p, color: PLAYER_COLORS[index] }));
            this.readyByPlayer = Object.fromEntries(this.players.map(p => [p.id, false]));
        }

        return { success: true };
    }

    setReady(playerId, ready) {
        if (!(playerId in this.readyByPlayer)) {
            return { success: false, reason: '玩家不在房间中' };
        }
        this.readyByPlayer[playerId] = !!ready;
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
        this.matchState = {
            mode,
            score: { red: 0, black: 0 },
            currentRound: 1,
            targetWins,
            winner: null
        };

        this.roundState.status = 'buying';
        this.roundState.currentBuyer = null;
        this.roundState.buyEndsAt = Date.now() + 15000;
        this.roundState.turnColor = 'red';
        this.roundState.winner = null;
        this.roundState.reason = null;
        this.roundState.loadouts = {
            red: { purchasedEffects: [] },
            black: { purchasedEffects: [] }
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

        if (result.success) {
            this.lastAction = action;
            this.lastActionBy = playerId;
            this.lastActionSeq += 1;
        }

        return result;
    }

    applyCanvasClick(player, action) {
        if (this.roundState.status !== 'playing') {
            return { success: false, reason: '当前不在对局时间' };
        }
        if (!action || typeof action.x !== 'number' || typeof action.y !== 'number') {
            return { success: false, reason: '无效点击坐标' };
        }
        if (player.color !== this.roundState.turnColor) {
            return { success: false, reason: '当前不是你的行动方' };
        }
        this.roundState.turnColor = this.roundState.turnColor === 'red' ? 'black' : 'red';
        return { success: true };
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

        this.sharedState = {
            boardState: action.boardState,
            currentPlayer: action.state.currentPlayer,
            gameMode: action.state.gameMode,
            riverBlockedTurns: action.state.riverBlockedTurns || 0,
            extraTurns: action.state.extraTurns || 0
        };

        const nextTurn = action.state.currentPlayer;
        if (nextTurn === 'red' || nextTurn === 'black') {
            this.roundState.turnColor = nextTurn;
        } else {
            this.roundState.turnColor = this.roundState.turnColor === 'red' ? 'black' : 'red';
        }
        return { success: true };
    }

    applyPurchase(player, action) {
        if (this.roundState.status !== 'buying') {
            return { success: false, reason: '当前非购买阶段' };
        }

        const effectId = action.effectId;
        if (!effectId) {
            return { success: false, reason: '缺少效果ID' };
        }

        const price = effectId === 'poker_global' ? 420 : 9999;
        const loadout = this.roundState.loadouts[player.color];
        const economy = this.roundState.economies[player.color];

        if (loadout.purchasedEffects.length >= 3) {
            return { success: false, reason: '每局最多购买3项' };
        }
        if (loadout.purchasedEffects.includes(effectId)) {
            return { success: false, reason: '同类效果不可重复购买' };
        }
        if (economy.credits < price) {
            return { success: false, reason: '资金不足' };
        }

        economy.credits -= price;
        loadout.purchasedEffects.push(effectId);
        return { success: true };
    }

    applyBeginRound(player) {
        if (this.roundState.status !== 'buying') {
            return { success: false, reason: '当前不在准备阶段' };
        }

        this.roundState.status = 'playing';
        this.roundState.currentBuyer = null;
        this.roundState.buyEndsAt = null;
        return { success: true };
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
            red: { purchasedEffects: [] },
            black: { purchasedEffects: [] }
        };

        return { success: true };
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
        }
    }

    nextSeq() {
        this.seq += 1;
        return this.seq;
    }

    getSnapshot() {
        return {
            roomId: this.id,
            seq: this.seq,
            status: this.status,
            players: this.players,
            readyByPlayer: this.readyByPlayer,
            matchState: this.matchState,
            roundState: this.roundState
            ,
            lastAction: this.lastAction,
            lastActionBy: this.lastActionBy,
            lastActionSeq: this.lastActionSeq,
            sharedState: this.sharedState
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
