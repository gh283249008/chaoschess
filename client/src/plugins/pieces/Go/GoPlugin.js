import { PiecePlugin } from '../../base/PiecePlugin.js';
import { UnionFind } from './UnionFind.js';

/**
 * 围棋插件
 * 实现围棋规则：落子、提子、气的计算
 */
export class GoPlugin extends PiecePlugin {
    constructor() {
        const config = {
            name: 'Go',
            version: '1.0.0',
            author: 'Chaos Chess Team',
            description: '围棋插件 - 实现完整的围棋规则',
            apiVersion: '1.0.0'
        };

        super(config);
        this.config = config;

        // UnionFind for efficient liberty calculation
        this.dsu = new UnionFind(90); // 9x10 board
        this.libertiesMap = new Map();
    }

    /**
     * 围棋没有预定义的棋子类型
     */
    getPieceTypes() {
        return ['stone']; // 通用棋子
    }

    /**
     * 围棋没有初始布局
     */
    getInitialSetup() {
        return [];
    }

    /**
     * 验证落子位置
     * @param {Object} stone - 棋子对象
     * @param {Object} from - 起始位置（围棋不使用）
     * @param {Object} to - 目标位置
     * @param {Object} boardState - 棋盘状态
     * @returns {boolean} 是否可以落子
     */
    validateMove(stone, from, to, boardState) {
        // 围棋只能在空位落子
        const occupied = boardState.pieces.some(p => p.x === to.x && p.y === to.y);
        if (occupied) return false;

        // 边界检查
        if (to.x < 0 || to.x > 8 || to.y < 0 || to.y > 9) return false;

        return true;
    }

    /**
     * 放置围棋子
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {string} player - 玩家
     * @param {Object} boardState - 棋盘状态
     * @returns {Object} 新的棋子对象
     */
    placeStone(x, y, player, boardState) {
        return {
            x,
            y,
            player,
            pluginSource: 'Go',
            type: 'stone'
        };
    }

    /**
     * 分析棋盘，构建UnionFind并计算气
     * 关键：所有同阵营的棋子（象棋+围棋）都共享气
     * @param {Array} allPieces - 所有棋子
     */
    analyzeBoard(allPieces) {
        this.dsu.reset(90);
        const boardMap = new Map(); // "x,y" -> piece

        // 1. 映射所有棋子
        allPieces.forEach(p => boardMap.set(`${p.x},${p.y}`, p));

        // 2. 构建UnionFind组（连接相邻的同色棋子，不管是象棋还是围棋）
        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 9; x++) {
                const current = boardMap.get(`${x},${y}`);
                if (!current) continue;

                const currentIndex = this.getIndex(x, y);

                // 检查右侧
                if (x + 1 < 9) {
                    const right = boardMap.get(`${x + 1},${y}`);
                    if (right && right.player === current.player) {
                        this.dsu.union(currentIndex, this.getIndex(x + 1, y));
                    }
                }

                // 检查下方
                if (y + 1 < 10) {
                    const down = boardMap.get(`${x},${y + 1}`);
                    if (down && down.player === current.player) {
                        this.dsu.union(currentIndex, this.getIndex(x, y + 1));
                    }
                }
            }
        }

        // 3. 计算每个组的气
        const libertiesMap = new Map(); // rootId -> Set<"x,y">

        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 9; x++) {
                const current = boardMap.get(`${x},${y}`);
                if (!current) continue;

                const root = this.dsu.find(this.getIndex(x, y));
                if (!libertiesMap.has(root)) {
                    libertiesMap.set(root, new Set());
                }
                const groupLiberties = libertiesMap.get(root);

                // 检查四个方向的空位（气）
                const neighbors = [
                    { x: x - 1, y }, { x: x + 1, y },
                    { x, y: y - 1 }, { x, y: y + 1 }
                ];

                neighbors.forEach(n => {
                    if (n.x >= 0 && n.x < 9 && n.y >= 0 && n.y < 10) {
                        // 空位才算气
                        if (!boardMap.has(`${n.x},${n.y}`)) {
                            groupLiberties.add(`${n.x},${n.y}`);
                        }
                    }
                });
            }
        }

        this.libertiesMap = libertiesMap;
    }

    /**
     * O(1) 查询棋子的气数
     * @param {Object} stone - 棋子
     * @returns {number} 气数
     */
    countLiberties(stone) {
        if (!this.libertiesMap) return 0;
        const idx = this.getIndex(stone.x, stone.y);
        const root = this.dsu.find(idx);
        return this.libertiesMap.get(root)?.size || 0;
    }

    /**
     * 检查并提掉没有气的棋子（包括象棋和围棋）
     * @param {Array} allPieces - 所有棋子（象棋+围棋）
     * @param {string} currentPlayer - 当前玩家
     * @returns {Object} { captured: Array, suicided: Array }
     */
    checkCaptures(allPieces, currentPlayer) {
        const enemyPlayer = currentPlayer === 'red' ? 'black' : 'red';
        const captured = [];
        const suicided = [];

        // 更新棋盘分析（包含所有棋子）
        this.analyzeBoard(allPieces, []);

        // 1. 先提掉敌方没有气的棋子（包括象棋和围棋）
        allPieces.forEach(piece => {
            if (piece.player === enemyPlayer) {
                const liberties = this.countLiberties(piece);
                if (liberties === 0) {
                    captured.push(piece);
                }
            }
        });

        // 移除被提掉的敌方棋子后重新分析
        if (captured.length > 0) {
            const remainingPieces = allPieces.filter(p => !captured.includes(p));
            this.analyzeBoard(remainingPieces, []);
        }

        // 2. 检查己方是否自杀（没有气）
        const currentPieces = allPieces.filter(p => !captured.includes(p));
        currentPieces.forEach(piece => {
            if (piece.player === currentPlayer) {
                const liberties = this.countLiberties(piece);
                if (liberties === 0) {
                    suicided.push(piece);
                }
            }
        });

        return { captured, suicided };
    }

    /**
     * 将坐标转换为索引
     */
    getIndex(x, y) {
        return y * 9 + x;
    }

    /**
     * 渲染围棋子
     */
    render(ctx, stone, x, y, size) {
        // 绘制圆形棋子
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);

        if (stone.player === 'red') {
            // 红方 - 红色棋子
            ctx.fillStyle = '#C8102E';
            ctx.fill();
            ctx.strokeStyle = '#8B0000';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            // 黑方 - 黑色棋子
            ctx.fillStyle = '#1a1a1a';
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // 添加高光效果
        const gradient = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, 18);
        if (stone.player === 'red') {
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
            gradient.addColorStop(1, 'rgba(200, 16, 46, 0)');
        } else {
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
            gradient.addColorStop(1, 'rgba(26, 26, 26, 0)');
        }
        ctx.fillStyle = gradient;
        ctx.fill();
    }
}
