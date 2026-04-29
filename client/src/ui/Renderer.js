/**
 * Canvas渲染引擎
 * 负责所有的绘制操作
 */
export class Renderer {
    constructor(canvas, pluginManager) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.pluginManager = pluginManager;

        // 渲染配置
        this.config = {
            padding: 40,
            gridSize: 50,
            boardWidth: 9,
            boardHeight: 10
        };
    }

    /**
     * 清空画布
     */
    clear() {
        this.ctx.fillStyle = '#f5f5dc';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * 渲染整个游戏场景
     */
    render(gameState) {
        this.clear();
        this.drawGrid();
        this.drawRiverLabels();
        this.drawWalls(gameState.walls);
        this.drawSmokeZones(gameState.smokeZones);
        this.drawPieces(gameState.pieces, gameState.selectedPiece);
        this.drawFrozenIndicators(gameState.frozenPieces);
    }

    /**
     * 渲染当前本地游戏流程使用的棋盘状态。
     */
    renderLocalGame({ board, gameMode, selectedPiece, currentPlayer, effectManager }) {
        this.clear();
        this.drawGrid();
        this.drawRiverLabels();
        this.drawRiverBlock(board.riverBlocked);

        board.pieces.forEach(piece => {
            const { x, y } = this.gridToScreen(piece.x, piece.y);
            const hidden = this.isHiddenBySmoke(piece, board.smokeEffects, currentPlayer);

            if (!hidden) {
                this.drawPiece(piece, x, y, gameMode, selectedPiece, effectManager);
            }
        });

        this.drawLocalSmokeEffects(board.smokeEffects, currentPlayer);
    }

    /**
     * 绘制棋盘网格
     */
    drawGrid() {
        const { padding, gridSize, boardWidth, boardHeight } = this.config;

        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;

        // 绘制竖线
        for (let i = 0; i <= boardWidth - 1; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(padding + i * gridSize, padding);
            this.ctx.lineTo(padding + i * gridSize, padding + (boardHeight - 1) * gridSize);
            this.ctx.stroke();
        }

        // 绘制横线
        for (let i = 0; i <= boardHeight - 1; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(padding, padding + i * gridSize);
            this.ctx.lineTo(padding + (boardWidth - 1) * gridSize, padding + i * gridSize);
            this.ctx.stroke();
        }
    }

    /**
     * 绘制楚河汉界
     */
    drawRiverLabels() {
        const { padding, gridSize } = this.config;

        this.ctx.fillStyle = '#666';
        this.ctx.font = '14px serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('楚河', padding + gridSize * 2, padding + gridSize * 4.5 + 5);
        this.ctx.fillText('汉界', padding + gridSize * 6, padding + gridSize * 4.5 + 5);
    }

    drawRiverBlock(blocked) {
        if (!blocked) return;

        const { padding, gridSize } = this.config;
        const riverY = padding + 4 * gridSize;
        const riverHeight = gridSize;
        const boardWidth = 8 * gridSize;

        this.ctx.save();
        this.ctx.fillStyle = 'rgba(100, 149, 237, 0.5)';
        this.ctx.fillRect(padding, riverY, boardWidth, riverHeight);
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 10]);
        this.ctx.beginPath();
        this.ctx.moveTo(padding, riverY + riverHeight / 2);
        this.ctx.lineTo(padding + boardWidth, riverY + riverHeight / 2);
        this.ctx.stroke();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.shadowColor = 'black';
        this.ctx.shadowBlur = 4;
        this.ctx.fillText('河道封锁', padding + boardWidth / 2, riverY + riverHeight / 2 + 8);
        this.ctx.restore();
    }

    /**
     * 绘制墙壁
     */
    drawWalls(walls) {
        const { padding, gridSize } = this.config;

        this.ctx.fillStyle = '#8B4513';
        walls.forEach(wall => {
            const x = padding + wall.x * gridSize;
            const y = padding + wall.y * gridSize;
            this.ctx.fillRect(x - 15, y - 15, 30, 30);
        });
    }

    /**
     * 绘制烟雾区域
     */
    drawSmokeZones(smokeZones) {
        const { padding, gridSize } = this.config;

        smokeZones.forEach(zone => {
            const x = padding + zone.x * gridSize;
            const y = padding + zone.y * gridSize;
            const width = zone.w * gridSize;
            const height = zone.h * gridSize;

            this.ctx.fillStyle = 'rgba(128, 128, 128, 0.3)';
            this.ctx.fillRect(x, y, width, height);

            this.ctx.strokeStyle = 'rgba(128, 128, 128, 0.6)';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y, width, height);
        });
    }

    /**
     * 绘制棋子
     */
    drawPieces(pieces, selectedPiece) {
        const { padding, gridSize } = this.config;

        pieces.forEach(piece => {
            const x = padding + piece.x * gridSize;
            const y = padding + piece.y * gridSize;

            // 委托给插件渲染
            this.pluginManager.renderPiece(this.ctx, piece, x, y, gridSize);

            // 绘制选中高亮
            if (piece === selectedPiece) {
                this.ctx.strokeStyle = '#FFD700';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(x, y, 25, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        });
    }

    drawPiece(piece, x, y, gameMode, selectedPiece, effectManager) {
        if (piece.pluginSource === 'Obstacle') {
            this.drawObstacle(x, y);
            return;
        }

        this.pluginManager.renderPiece(this.ctx, piece, x, y, this.config.gridSize);

        if (gameMode === 'move' && selectedPiece === piece) {
            this.ctx.strokeStyle = '#FFD700';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 25, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        effectManager?.renderEffects(this.ctx, piece, x, y);
    }

    drawObstacle(x, y) {
        this.ctx.save();
        this.ctx.fillStyle = '#8B4513';
        this.ctx.strokeStyle = '#3d1f0f';
        this.ctx.lineWidth = 2;
        this.ctx.fillRect(x - 18, y - 18, 36, 36);
        this.ctx.strokeRect(x - 18, y - 18, 36, 36);
        this.ctx.restore();
    }

    isHiddenBySmoke(piece, smokeEffects = [], currentPlayer) {
        return smokeEffects.some(smoke => {
            const inSmoke = Math.abs(piece.x - smoke.x) <= 1 && Math.abs(piece.y - smoke.y) <= 1;
            return inSmoke && currentPlayer !== smoke.player;
        });
    }

    drawLocalSmokeEffects(smokeEffects = [], currentPlayer) {
        smokeEffects.forEach(smoke => {
            const { x, y } = this.gridToScreen(smoke.x, smoke.y);
            const radius = 75;

            this.ctx.save();

            if (currentPlayer === smoke.player) {
                this.ctx.beginPath();
                this.ctx.arc(x, y, radius, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(128, 128, 128, 0.2)';
                this.ctx.fill();
                this.ctx.strokeStyle = 'rgba(128, 128, 128, 0.5)';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]);
                this.ctx.stroke();
            } else {
                const gradient = this.ctx.createRadialGradient(x, y, 10, x, y, radius);
                gradient.addColorStop(0, 'rgba(60, 60, 60, 0.95)');
                gradient.addColorStop(0.7, 'rgba(80, 80, 80, 0.85)');
                gradient.addColorStop(1, 'rgba(100, 100, 100, 0)');
                this.ctx.beginPath();
                this.ctx.arc(x, y, radius + 10, 0, Math.PI * 2);
                this.ctx.fillStyle = gradient;
                this.ctx.fill();
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                this.ctx.font = 'bold 50px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('?', x, y);
            }

            this.ctx.restore();
        });
    }

    /**
     * 绘制冻结指示器
     */
    drawFrozenIndicators(frozenPieces) {
        const { padding, gridSize } = this.config;

        frozenPieces.forEach(frozen => {
            const piece = frozen.piece;
            const x = padding + piece.x * gridSize;
            const y = padding + piece.y * gridSize;

            // 绘制冰冻效果
            this.ctx.strokeStyle = '#00BFFF';
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.arc(x, y, 28, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]);

            // 绘制剩余回合数
            this.ctx.fillStyle = '#00BFFF';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${frozen.duration}`, x + 20, y - 20);
        });
    }

    /**
     * 将屏幕坐标转换为棋盘坐标
     */
    screenToGrid(screenX, screenY) {
        const { padding, gridSize } = this.config;
        const gridX = Math.round((screenX - padding) / gridSize);
        const gridY = Math.round((screenY - padding) / gridSize);
        return { x: gridX, y: gridY };
    }

    /**
     * 将棋盘坐标转换为屏幕坐标
     */
    gridToScreen(gridX, gridY) {
        const { padding, gridSize } = this.config;
        return {
            x: padding + gridX * gridSize,
            y: padding + gridY * gridSize
        };
    }
}
