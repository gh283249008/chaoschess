import { PiecePlugin } from '../../base/PiecePlugin.js';

const config = {
    name: 'FlipChess',
    version: '1.0.0',
    author: 'Chaos Chess Team',
    description: '翻转棋插件 - 负责翻转棋移动与渲染',
    apiVersion: '1.0.0',
    pieceTypes: [
        { type: '翻', name: 'FlipChess', player: 'both' }
    ]
};

export class FlipChessPlugin extends PiecePlugin {
    constructor() {
        super(config);
        this.config = config;
    }

    getPieceTypes() {
        return this.config.pieceTypes.map(piece => piece.type);
    }

    validateMove(piece, from, to, boardState) {
        return false;
    }

    render(ctx, piece, x, y) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, Math.PI * 2);
        ctx.fillStyle = piece.player === 'red' ? '#ffe5e5' : '#2f2f2f';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = piece.player === 'red' ? '#c53030' : '#f7fafc';
        ctx.stroke();

        ctx.fillStyle = piece.player === 'red' ? '#c53030' : '#f7fafc';
        ctx.font = 'bold 22px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('翻', x, y + 1);
        ctx.restore();
    }
}
