import { PiecePlugin } from '../../base/PiecePlugin.js';

// 配置直接嵌入，避免JSON import问题
const config = {
    "name": "ChineseChess",
    "version": "1.0.0",
    "author": "Chaos Chess Team",
    "description": "中国象棋插件 - 包含车马炮相仕将兵的完整规则",
    "apiVersion": "1.0.0",
    "pieceTypes": [
        { "type": "车", "name": "Rook", "player": "both" },
        { "type": "马", "name": "Knight", "player": "both" },
        { "type": "炮", "name": "Cannon", "player": "both" },
        { "type": "相", "name": "Elephant", "player": "red" },
        { "type": "象", "name": "Elephant", "player": "black" },
        { "type": "仕", "name": "Advisor", "player": "red" },
        { "type": "士", "name": "Advisor", "player": "black" },
        { "type": "帅", "name": "General", "player": "red" },
        { "type": "将", "name": "General", "player": "black" },
        { "type": "兵", "name": "Pawn", "player": "red" },
        { "type": "卒", "name": "Pawn", "player": "black" }
    ],
    "initialSetup": {
        "red": [
            { "type": "车", "x": 0, "y": 9 },
            { "type": "马", "x": 1, "y": 9 },
            { "type": "相", "x": 2, "y": 9 },
            { "type": "仕", "x": 3, "y": 9 },
            { "type": "帅", "x": 4, "y": 9 },
            { "type": "仕", "x": 5, "y": 9 },
            { "type": "相", "x": 6, "y": 9 },
            { "type": "马", "x": 7, "y": 9 },
            { "type": "车", "x": 8, "y": 9 },
            { "type": "炮", "x": 1, "y": 7 },
            { "type": "炮", "x": 7, "y": 7 },
            { "type": "兵", "x": 0, "y": 6 },
            { "type": "兵", "x": 2, "y": 6 },
            { "type": "兵", "x": 4, "y": 6 },
            { "type": "兵", "x": 6, "y": 6 },
            { "type": "兵", "x": 8, "y": 6 }
        ],
        "black": [
            { "type": "车", "x": 0, "y": 0 },
            { "type": "马", "x": 1, "y": 0 },
            { "type": "象", "x": 2, "y": 0 },
            { "type": "士", "x": 3, "y": 0 },
            { "type": "将", "x": 4, "y": 0 },
            { "type": "士", "x": 5, "y": 0 },
            { "type": "象", "x": 6, "y": 0 },
            { "type": "马", "x": 7, "y": 0 },
            { "type": "车", "x": 8, "y": 0 },
            { "type": "炮", "x": 1, "y": 2 },
            { "type": "炮", "x": 7, "y": 2 },
            { "type": "卒", "x": 0, "y": 3 },
            { "type": "卒", "x": 2, "y": 3 },
            { "type": "卒", "x": 4, "y": 3 },
            { "type": "卒", "x": 6, "y": 3 },
            { "type": "卒", "x": 8, "y": 3 }
        ]
    }
};

/**
 * 中国象棋插件
 * 实现完整的象棋规则
 */
export class ChineseChessPlugin extends PiecePlugin {
    constructor() {
        super(config);
        this.config = config;
    }

    /**
     * 获取所有棋子类型
     */
    getPieceTypes() {
        return this.config.pieceTypes.map(p => p.type);
    }

    /**
     * 获取初始棋盘布局
     */
    getInitialSetup() {
        const pieces = [];

        // 红方棋子
        this.config.initialSetup.red.forEach(p => {
            pieces.push({
                ...p,
                player: 'red',
                pluginSource: 'ChineseChess'
            });
        });

        // 黑方棋子
        this.config.initialSetup.black.forEach(p => {
            pieces.push({
                ...p,
                player: 'black',
                pluginSource: 'ChineseChess'
            });
        });

        return pieces;
    }

    /**
     * 验证移动是否合法
     * @param {Object} piece - 棋子对象
     * @param {Object} from - 起始位置 {x, y}
     * @param {Object} to - 目标位置 {x, y}
     * @param {Object} boardState - 棋盘状态
     * @returns {boolean} 是否合法
     */
    validateMove(piece, from, to, boardState) {
        console.log(`ChineseChess Validate: ${piece.type} (${from.x},${from.y})->(${to.x},${to.y})`);

        // 基础验证
        if (to.x < 0 || to.x > 8 || to.y < 0 || to.y > 9) {
            console.log('Out of bounds');
            return false;
        }

        // 检查目标位置是否有己方棋子
        const target = this.getPieceAt(to.x, to.y, boardState);
        if (target && target.player === piece.player) {
            console.log('Target blocked by friendly piece');
            return false;
        }

        // 检查河道封锁
        if (boardState.riverBlocked) {
            const crossRiver = (from.y <= 4 && to.y >= 5) || (from.y >= 5 && to.y <= 4);
            if (crossRiver) {
                console.log('River is blocked!');
                return false;
            }
        }

        // 检查烟雾弹保护：如果目标在敌方烟雾中，且己方不在该烟雾中（即从外部攻击），则无效
        // 规则简化：任何从外部对敌方烟雾内部的攻击都无效。
        if (boardState.smokeEffects && boardState.smokeEffects.length > 0) {
            for (const smoke of boardState.smokeEffects) {
                // 如果是敌方烟雾
                if (smoke.player !== piece.player) {
                    const inSmoke = Math.abs(to.x - smoke.x) <= 1 && Math.abs(to.y - smoke.y) <= 1;
                    if (inSmoke) {
                        const fromSmoke = Math.abs(from.x - smoke.x) <= 1 && Math.abs(from.y - smoke.y) <= 1;
                        if (!fromSmoke) {
                            console.log('Cannot capture into smoke!');
                            return false;
                        }
                    }
                }
            }
        }

        const dx = to.x - from.x;
        const dy = to.y - from.y;

        // 根据棋子类型验证移动
        let isValid = false;
        switch (piece.type) {
            case '车': // Rook - 直线移动
                isValid = this.validateRookMove(piece, from, to, dx, dy, boardState);
                break;

            case '马': // Knight - 日字移动
                isValid = this.validateKnightMove(piece, from, to, dx, dy, boardState);
                break;

            case '炮': // Cannon - 需要炮架吃子
                isValid = this.validateCannonMove(piece, from, to, dx, dy, boardState);
                break;

            case '兵':
            case '卒': // Pawn - 向前，过河可横移
                isValid = this.validatePawnMove(piece, from, to, dx, dy);
                break;

            case '将':
            case '帅': // General - 九宫格内一步
                isValid = this.validateGeneralMove(piece, from, to, dx, dy);
                break;

            case '士':
            case '仕': // Advisor - 九宫格内斜走
                isValid = this.validateAdvisorMove(piece, from, to, dx, dy);
                break;

            case '象':
            case '相': // Elephant - 田字走，不过河
                isValid = this.validateElephantMove(piece, from, to, dx, dy, boardState);
                break;

            default:
                console.log('Unknown piece type');
                return false;
        }

        console.log(`Validation result for ${piece.type}: ${isValid}`);
        return isValid;
    }

    /**
     * 车的移动规则
     */
    validateRookMove(piece, from, to, dx, dy, boardState) {
        // 必须直线移动
        const isStraight = (dx === 0 || dy === 0);
        if (!isStraight) return false;

        // 路径检查（支持截停）
        return this.checkPathInterception(from.x, from.y, to.x, to.y, boardState, piece.player);
    }

    /**
     * 马的移动规则
     */
    validateKnightMove(piece, from, to, dx, dy, boardState) {
        // ... (unchanged)
        // 日字移动
        if (!((Math.abs(dx) === 2 && Math.abs(dy) === 1) ||
            (Math.abs(dx) === 1 && Math.abs(dy) === 2))) {
            return false;
        }

        // 检查马腿
        const legX = from.x + (Math.abs(dx) === 2 ? Math.sign(dx) : 0);
        const legY = from.y + (Math.abs(dy) === 2 ? Math.sign(dy) : 0);
        const legObstructed = this.getPieceAt(legX, legY, boardState);

        return !legObstructed;
    }

    /**
     * 炮的移动规则
     */
    validateCannonMove(piece, from, to, dx, dy, boardState) {
        // 必须直线移动
        if (dx !== 0 && dy !== 0) return false;

        const target = this.getPieceAt(to.x, to.y, boardState);

        if (!target) {
            // 空炮移动，路径必须清空 (类似车，但可能被截停)
            return this.checkPathInterception(from.x, from.y, to.x, to.y, boardState, piece.player);
        } else {
            // 打炮吃子，中间必须有恰好一个棋子作为炮架
            // 规则：炮不可以把敌方烟雾弹中的棋子当成炮架
            const screenCount = this.countPiecesBetween(from.x, from.y, to.x, to.y, boardState, piece.player);
            return screenCount === 1;
        }
    }

    // 辅助方法：检查路径截停
    checkPathInterception(x1, y1, x2, y2, boardState, player) {
        const dx = Math.sign(x2 - x1);
        const dy = Math.sign(y2 - y1);

        // 只有直线
        if (dx !== 0 && dy !== 0) return false;

        let x = x1 + dx;
        let y = y1 + dy;

        while (x !== x2 || y !== y2) {
            const p = this.getPieceAt(x, y, boardState);
            if (p) {
                // 如果遇到障碍
                // 1. 检查是否是烟雾中的截停
                if (this.isPieceInOpponentSmoke(p, boardState, player)) {
                    console.log('Intercepted by hidden piece');
                    return { action: 'intercept', x: x, y: y, target: p };
                }
                // 2. 否则是普通障碍 -> 阻挡
                return false;
            }
            x += dx;
            y += dy;
        }
        return true;
    }

    // 重写 countPiecesBetween 以支持忽略烟雾中的炮架
    countPiecesBetween(x1, y1, x2, y2, boardState, player) {
        let count = 0;
        const dx = Math.sign(x2 - x1);
        const dy = Math.sign(y2 - y1);

        let x = x1 + dx;
        let y = y1 + dy;

        while (x !== x2 || y !== y2) {
            const p = this.getPieceAt(x, y, boardState);
            if (p) {
                // 如果在敌方烟雾中，不能作为炮架 -> 视为不存在(透过去)？
                // 不，"不可当成炮架" 意味着它不能提供跳板功能。
                // 如果把它当空气，炮就不能跳过它吃后面的子。
                // 如果把它当障碍，且不能跳，那就是死路。
                // 这里理解为：不能作为有效炮架。
                // 如果它是唯一棋子 -> count=0 -> 不能吃。
                if (this.isPieceInOpponentSmoke(p, boardState, player)) {
                    // 忽略它? 
                    // 如果忽略它，炮会认为中间没棋子，不能隔山打牛。
                    // 结果：无法跳过烟雾中的棋子吃子。符合"不可以把...当成炮架"。
                } else {
                    count++;
                }
            }
            x += dx;
            y += dy;
        }
        return count;
    }

    /**
     * 兵/卒的移动规则
     */
    validatePawnMove(piece, from, to, dx, dy) {
        const forward = piece.player === 'red' ? -1 : 1;
        const crossedRiver = piece.player === 'red' ? from.y < 5 : from.y > 4;

        console.log(`ChinesePawn: player=${piece.player} forward=${forward} crossed=${crossedRiver} dy=${dy} dx=${dx}`);

        // 向前一步
        if (dy === forward && dx === 0) return true;

        // 过河后可以横移
        if (crossedRiver && dy === 0 && Math.abs(dx) === 1) return true;

        return false;
    }

    /**
     * 将/帅的移动规则
     */
    validateGeneralMove(piece, from, to, dx, dy) {
        // 只能走一步
        if (Math.abs(dx) + Math.abs(dy) !== 1) return false;

        // 必须在九宫格内
        const inPalace = to.x >= 3 && to.x <= 5 &&
            ((piece.player === 'red' && to.y >= 7) ||
                (piece.player === 'black' && to.y <= 2));

        return inPalace;
    }

    /**
     * 士/仕的移动规则
     */
    validateAdvisorMove(piece, from, to, dx, dy) {
        // 斜走一步
        if (Math.abs(dx) !== 1 || Math.abs(dy) !== 1) return false;

        // 必须在九宫格内
        const inPalace = to.x >= 3 && to.x <= 5 &&
            ((piece.player === 'red' && to.y >= 7) ||
                (piece.player === 'black' && to.y <= 2));

        return inPalace;
    }

    /**
     * 象/相的移动规则
     */
    validateElephantMove(piece, from, to, dx, dy, boardState) {
        // 田字走
        if (Math.abs(dx) !== 2 || Math.abs(dy) !== 2) return false;

        // 不能过河
        const ownSide = piece.player === 'red' ? to.y >= 5 : to.y <= 4;
        if (!ownSide) return false;

        // 检查象眼
        const eyeX = from.x + dx / 2;
        const eyeY = from.y + dy / 2;
        const eyeBlocked = this.getPieceAt(eyeX, eyeY, boardState);

        return !eyeBlocked;
    }

    /**
     * 检查路径是否畅通
     */
    isPathClear(x1, y1, x2, y2, boardState) {
        const dx = Math.sign(x2 - x1);
        const dy = Math.sign(y2 - y1);
        let x = x1 + dx;
        let y = y1 + dy;

        while (x !== x2 || y !== y2) {
            if (this.getPieceAt(x, y, boardState)) return false;
            x += dx;
            y += dy;
        }

        return true;
    }

    /**
     * 计算两点之间的棋子数量（用于炮）
     */
    countPiecesBetween(x1, y1, x2, y2, boardState) {
        const dx = Math.sign(x2 - x1);
        const dy = Math.sign(y2 - y1);
        let x = x1 + dx;
        let y = y1 + dy;
        let count = 0;

        while (x !== x2 || y !== y2) {
            if (this.getPieceAt(x, y, boardState)) count++;
            x += dx;
            y += dy;
        }

        return count;
    }

    /**
     * 获取指定位置的棋子
     */
    getPieceAt(x, y, boardState) {
        return boardState.pieces.find(p => p.x === x && p.y === y);
    }

    /**
     * 渲染棋子
     */
    render(ctx, piece, x, y, size) {
        // 绘制圆形背景
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fillStyle = piece.player === 'red' ? '#FFE4E1' : '#F0F0F0';
        ctx.fill();
        ctx.strokeStyle = piece.player === 'red' ? '#C8102E' : '#1a1a1a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 绘制文字
        ctx.fillStyle = piece.player === 'red' ? '#C8102E' : '#1a1a1a';
        ctx.font = 'bold 18px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(piece.type, x, y);

        // 如果被冻结，绘制冰冻效果
        if (piece.frozen) {
            ctx.fillStyle = 'rgba(135, 206, 235, 0.6)';
            ctx.beginPath();
            ctx.arc(x, y, 28, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#00BFFF';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = "#00BFFF";
            ctx.font = "20px Arial";
            ctx.fillText("❄️", x + 15, y - 15);
        }
    }

    /**
     * 检查棋子是否在敌方烟雾中
     */
    isPieceInOpponentSmoke(piece, boardState, currentPlayer) {
        if (!boardState.smokeEffects) return false;

        for (const smoke of boardState.smokeEffects) {
            // 是敌方烟雾
            if (smoke.player !== currentPlayer) {
                // 棋子在烟雾范围内
                if (Math.abs(piece.x - smoke.x) <= 1 && Math.abs(piece.y - smoke.y) <= 1) {
                    return true;
                }
            }
        }
        return false;
    }
}
