import { PiecePlugin } from '../../base/PiecePlugin.js';

/**
 * 国际象棋插件（示例）
 * 演示如何创建一个完整的棋子插件
 */
export class InternationalChessPlugin extends PiecePlugin {
    constructor() {
        const config = {
            name: 'InternationalChess',
            version: '1.0.0',
            author: 'Chaos Chess Team',
            description: '国际象棋插件 - 标准规则实现',
            apiVersion: '1.0.0'
        };

        super(config);
        this.config = config;
    }

    /**
     * 返回所有棋子类型
     */
    getPieceTypes() {
        return ['King', 'Queen', 'Rook', 'Bishop', 'Knight', 'Pawn'];
    }

    /**
     * 验证移动是否合法
     */
    validateMove(piece, from, to, boardState) {
        // 获取棋盘边界（默认为中国棋盘大小 9x10，国际象棋是 8x8，这里为了兼容性使用更大的默认值）
        const maxX = (boardState.width !== undefined && boardState.width !== null) ? boardState.width - 1 : 7; // 0-7 for 8 columns
        const maxY = (boardState.height !== undefined && boardState.height !== null) ? boardState.height - 1 : 7; // 0-7 for 8 rows

        // 基础验证：目标位置是否在棋盘内
        if (to.x < 0 || to.x > maxX || to.y < 0 || to.y > maxY) {
            console.log(`IntlChess: Move out of bounds. To:(${to.x},${to.y}) Max:(${maxX},${maxY})`);
            return false;
        }

        const dx = Math.abs(to.x - from.x);
        const dy = Math.abs(to.y - from.y);

        // 检查目标位置是否有己方棋子
        const target = this.getPieceAt(to.x, to.y, boardState);
        if (target && target.player === piece.player) {
            return false;
        }

        // 检查河道封锁
        if (boardState.riverBlocked) {
            const crossRiver = (from.y <= 4 && to.y >= 5) || (from.y >= 5 && to.y <= 4);
            if (crossRiver) {
                console.log('IntlChess: River is blocked!');
                return false;
            }
        }

        // 检查烟雾弹保护
        if (boardState.smokeEffects && boardState.smokeEffects.length > 0) {
            for (const smoke of boardState.smokeEffects) {
                // 如果是敌方烟雾
                if (smoke.player !== piece.player) {
                    const inSmoke = Math.abs(to.x - smoke.x) <= 1 && Math.abs(to.y - smoke.y) <= 1;
                    if (inSmoke) {
                        const fromSmoke = Math.abs(from.x - smoke.x) <= 1 && Math.abs(from.y - smoke.y) <= 1;
                        if (!fromSmoke) {
                            console.log('IntlChess: Cannot capture into smoke!');
                            return false;
                        }
                    }
                }
            }
        }

        switch (piece.type) {
            case 'King':
                return this.validateKingMove(dx, dy);

            case 'Queen':
                return this.validateQueenMove(from, to, boardState);

            case 'Rook':
                return this.validateRookMove(from, to, boardState);

            case 'Bishop':
                return this.validateBishopMove(from, to, boardState);

            case 'Knight':
                return this.validateKnightMove(dx, dy);

            case 'Pawn':
                return this.validatePawnMove(piece, from, to, boardState, target);

            default:
                return false;
        }
    }

    /**
     * 王的移动：任意方向一格
     */
    validateKingMove(dx, dy) {
        return dx <= 1 && dy <= 1 && (dx + dy > 0);
    }

    /**
     * 后的移动：直线或斜线，路径畅通
     */
    validateQueenMove(from, to, gameState) {
        return this.validateRookMove(from, to, gameState) ||
            this.validateBishopMove(from, to, gameState);
    }

    /**
     * 车的移动：直线，路径畅通
     */
    validateRookMove(from, to, boardState) {
        const dx = Math.sign(to.x - from.x);
        const dy = Math.sign(to.y - from.y);

        if (to.x !== from.x && to.y !== from.y) return false;

        return this.checkPathInterception(from.x, from.y, to.x, to.y, boardState);
    }

    validateBishopMove(from, to, boardState) {
        if (Math.abs(to.x - from.x) !== Math.abs(to.y - from.y)) return false;
        return this.checkPathInterception(from.x, from.y, to.x, to.y, boardState);
    }

    validateQueenMove(from, to, boardState) {
        const dx = Math.abs(to.x - from.x);
        const dy = Math.abs(to.y - from.y);

        if (dx === 0 || dy === 0 || dx === dy) {
            return this.checkPathInterception(from.x, from.y, to.x, to.y, boardState);
        }
        return false;
    }

    checkPathInterception(x1, y1, x2, y2, boardState) {
        const dx = Math.sign(x2 - x1);
        const dy = Math.sign(y2 - y1);

        let x = x1 + dx;
        let y = y1 + dy;
        let prevX = x1;
        let prevY = y1;

        while (x !== x2 || y !== y2) {
            const p = this.getPieceAt(x, y, boardState);
            if (p) {
                // 如果遇到障碍
                // 1. 检查是否是烟雾中的截停
                // 注意：这里需要获取移动棋子的所有者，但validateXXX没有传player
                // 假设InternationalChessPlugin.js中有办法获取？
                // 临时方案：通过from位置的棋子判断player
                const mover = this.getPieceAt(x1, y1, boardState);
                const player = mover ? mover.player : null;

                if (player && this.isPieceInOpponentSmoke(p, boardState, player)) {
                    console.log('Intercepted by hidden piece');
                    // 停在障碍物之前
                    return { action: 'intercept', x: prevX, y: prevY };
                }
                // 2. 否则是普通障碍 -> 阻挡
                return false;
            }
            prevX = x;
            prevY = y;
            x += dx;
            y += dy;
        }
        return true;
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

    /**
     * 马的移动：L型
     */
    validateKnightMove(dx, dy) {
        return (dx === 2 && dy === 1) || (dx === 1 && dy === 2);
    }

    /**
     * 兵的移动：向前1格，首次可2格，斜吃
     */
    validatePawnMove(piece, from, to, gameState, target) {
        const direction = piece.player === 'red' ? -1 : 1;
        const dy = to.y - from.y;
        const dx = Math.abs(to.x - from.x);

        console.log(`Pawn Check: player=${piece.player} dir=${direction} dy=${dy} dx=${dx} target=${!!target}`);

        // 向前移动
        if (dx === 0 && !target) {
            if (dy === direction) return true;

            // 首次移动可以走两格
            const startRow = piece.player === 'red' ? 6 : 1;
            if (from.y === startRow && dy === 2 * direction) {
                const midY = from.y + direction;
                const blocked = gameState.pieces.find(p => p.x === from.x && p.y === midY);
                return !blocked;
            }
        }

        // 斜吃
        if (dx === 1 && dy === direction && target) {
            return true;
        }

        return false;
    }

    /**
     * 检查路径是否畅通
     */
    isPathClear(from, to, gameState) {
        const dx = Math.sign(to.x - from.x);
        const dy = Math.sign(to.y - from.y);
        let x = from.x + dx;
        let y = from.y + dy;

        while (x !== to.x || y !== to.y) {
            if (gameState.pieces.find(p => p.x === x && p.y === y)) {
                return false;
            }
            x += dx;
            y += dy;
        }

        return true;
    }

    /**
     * 渲染棋子
     */
    render(ctx, piece, x, y, size) {
        // 绘制圆形背景
        ctx.beginPath();
        ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);

        // 样式调整：红方使用中国象棋的红底红字风格，黑方保持白底黑字
        if (piece.player === 'red') {
            ctx.fillStyle = '#FFE4E1'; // 浅粉色背景
            ctx.strokeStyle = '#C8102E'; // 红色边框
        } else {
            ctx.fillStyle = '#ffffff'; // 白色背景
            ctx.strokeStyle = '#000000'; // 黑色边框
        }

        ctx.fill();
        ctx.lineWidth = 2;
        ctx.stroke();

        // 绘制棋子符号
        const symbols = {
            'King': '♔',
            'Queen': '♕',
            'Rook': '♖',
            'Bishop': '♗',
            'Knight': '♘',
            'Pawn': '♙'
        };

        // 文字颜色
        if (piece.player === 'red') {
            ctx.fillStyle = '#C8102E'; // 红色文字
        } else {
            ctx.fillStyle = '#000000'; // 黑色文字
        }

        ctx.font = `${size * 0.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbols[piece.type] || piece.type[0], x, y);
    }

    /**
     * 获取初始棋盘布局
     */
    getInitialSetup() {
        const setup = [];

        // 黑方（上方）
        const blackPieces = ['Rook', 'Knight', 'Bishop', 'Queen', 'King', 'Bishop', 'Knight', 'Rook'];
        blackPieces.forEach((type, i) => {
            setup.push({ type, x: i, y: 0, player: 'black', pluginSource: 'InternationalChess' });
        });
        for (let i = 0; i < 8; i++) {
            setup.push({ type: 'Pawn', x: i, y: 1, player: 'black', pluginSource: 'InternationalChess' });
        }

        // 红方（下方）
        const redPieces = ['Rook', 'Knight', 'Bishop', 'Queen', 'King', 'Bishop', 'Knight', 'Rook'];
        redPieces.forEach((type, i) => {
            setup.push({ type, x: i, y: 7, player: 'red', pluginSource: 'InternationalChess' });
        });
        for (let i = 0; i < 8; i++) {
            setup.push({ type: 'Pawn', x: i, y: 6, player: 'red', pluginSource: 'InternationalChess' });
        }

        return setup;
    }

    /**
     * 棋子移动后的回调
     */
    onPieceMoved(piece, from, to, boardState) {
        if (piece.type === 'Pawn') {
            // 检查是否到达底线
            const isRed = piece.player === 'red';
            const endY = isRed ? 0 : (boardState.height !== undefined ? boardState.height - 1 : 9); // Chinese board height is 10 (0-9)

            // 如果是在国际象棋棋盘(8x8)，底线可能是7。这里根据棋盘实际高度判断。
            // 简单起见，红方到达0，黑方到达最大Y。

            // 注意：boardState.height 可能未定义，默认为中国象棋 10
            const maxY = boardState.height || 10;

            if ((isRed && to.y === 0) || (!isRed && to.y === maxY - 1)) {
                console.log(`Pawn promotion triggered for ${piece.player}`);
                return {
                    action: 'promotion',
                    piece: piece
                };
            }
        }
    }

    /**
     * 获取指定位置的棋子
     */
    getPieceAt(x, y, boardState) {
        return boardState.pieces.find(p => p.x === x && p.y === y);
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
