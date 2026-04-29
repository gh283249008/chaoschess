/**
 * 游戏房间
 * 管理单个游戏会话
 */
export class Room {
    constructor(id, hostPlayer) {
        this.id = id;
        this.players = [hostPlayer];
        this.gameState = this.createInitialState();
        this.createdAt = Date.now();
        this.status = 'waiting'; // 'waiting', 'playing', 'finished'
    }

    /**
     * 创建初始游戏状态
     */
    createInitialState() {
        return {
            gameMode: 'chess',
            currentPlayer: 'red',
            pieces: [],
            pokerHands: {
                red: [],
                black: []
            },
            frozenPieces: [],
            smokeZones: [],
            walls: [],
            riverBlocked: false,
            goBanned: false,
            history: []
        };
    }

    /**
     * 添加玩家
     */
    addPlayer(player) {
        if (this.players.length >= 2) {
            return { success: false, reason: 'Room is full' };
        }

        this.players.push(player);

        // 分配玩家颜色
        player.color = this.players.length === 1 ? 'red' : 'black';

        // 如果房间满了，开始游戏
        if (this.players.length === 2) {
            this.status = 'playing';
        }

        return { success: true, color: player.color };
    }

    /**
     * 移除玩家
     */
    removePlayer(playerId) {
        const index = this.players.findIndex(p => p.id === playerId);
        if (index !== -1) {
            this.players.splice(index, 1);

            // 如果房间空了，标记为结束
            if (this.players.length === 0) {
                this.status = 'finished';
            } else {
                this.status = 'waiting';
            }

            return { success: true };
        }

        return { success: false, reason: 'Player not found' };
    }

    /**
     * 更新游戏状态
     */
    updateGameState(action) {
        // 这里可以应用reducer逻辑
        // 简化版本：直接更新状态
        this.gameState = {
            ...this.gameState,
            lastAction: action,
            lastUpdate: Date.now()
        };

        return this.gameState;
    }

    /**
     * 获取玩家
     */
    getPlayer(playerId) {
        return this.players.find(p => p.id === playerId);
    }

    /**
     * 获取对手
     */
    getOpponent(playerId) {
        return this.players.find(p => p.id !== playerId);
    }

    /**
     * 检查是否是玩家的回合
     */
    isPlayerTurn(playerId) {
        const player = this.getPlayer(playerId);
        return player && player.color === this.gameState.currentPlayer;
    }

    /**
     * 获取房间信息
     */
    getInfo() {
        return {
            id: this.id,
            status: this.status,
            playerCount: this.players.length,
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                color: p.color
            })),
            createdAt: this.createdAt
        };
    }
}
