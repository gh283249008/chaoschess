export class GoController {
    constructor(app) {
        this.app = app;
    }

    handleGoClick(gridX, gridY) {
        if (this.app.getCurrentTurnMovesLeft() <= 0) {
            this.app.showNotification('当前走棋次数已耗尽，立即切换下一回合', 'warning');
            this.app.switchPlayer();
            return false;
        }

        const occupied = this.app.board.getPieceAt(gridX, gridY);
        if (occupied) {
            console.log(`Position (${gridX}, ${gridY}) is occupied`);
            return false;
        }

        if (this.isBlockedByEnemySmoke(gridX, gridY)) {
            console.log('Cannot place in opponent smoke (silently blocked)');
            return false;
        }

        const wantsFlip = this.app.placeModePieceType === 'flip';
        const wantsSkeleton = this.app.placeModePieceType === 'skeleton';
        const flipStock = this.app.matchController?.getFlipChessStock(this.app.currentPlayer) || 0;
        if (wantsFlip) {
            if (flipStock <= 0) {
                this.app.showNotification('翻转棋库存不足，请切换为围棋子或先购买翻转棋', 'warning');
                return false;
            }

            const flipPiece = this.app.createFlipPiece(gridX, gridY, this.app.currentPlayer);
            this.app.board.addPiece(flipPiece);
            this.app.matchController.consumeFlipChessStock(this.app.currentPlayer);
            if (this.checkGomokuStateAfterPlacement(flipPiece)) {
                return true;
            }
            const flipped = this.app.resolveFlipCapture(flipPiece);
            const flippedCount = flipped.length;
            this.app.showNotification(`放置翻转棋（视为一步走棋）${flippedCount > 0 ? `，翻转 ${flippedCount} 枚敌子` : ''}`, 'success');
            this.app.consumeMoveStep(1);
            this.app.render();
            if (this.app.ui?.renderRoundShop) {
                this.app.ui.renderRoundShop();
            }
            return true;
        }

        if (wantsSkeleton) {
            if (!this.app.matchController?.hasSkeletonRevival(this.app.currentPlayer)) {
                this.app.showNotification('未购买骷髅复苏，本局不可部署骷髅', 'warning');
                return false;
            }
            if (!this.isOwnHalf(gridY, this.app.currentPlayer)) {
                this.app.showNotification('骷髅只能部署在己方半场', 'warning');
                return false;
            }
            if (!this.app.matchController.spendGraveyard(this.app.currentPlayer, 1)) {
                this.app.showNotification('墓地不足，至少需要 1 点', 'warning');
                return false;
            }

            const skeleton = this.createSkeletonPiece(gridX, gridY, this.app.currentPlayer);
            this.app.board.addPiece(skeleton);
            this.app.showNotification('部署骷髅（消耗 1 墓地，视为一步走棋）', 'success');
            this.app.consumeMoveStep(1);
            this.app.render();
            if (this.app.ui?.renderRoundShop) {
                this.app.ui.renderRoundShop();
            }
            return true;
        }

        console.log(`Placing ${this.app.currentPlayer} stone at (${gridX}, ${gridY})`);

        const stone = this.app.goPlugin.placeStone(gridX, gridY, this.app.currentPlayer, this.app.board.getState());
        this.app.board.addPiece(stone);
        if (this.checkGomokuStateAfterPlacement(stone)) {
            return true;
        }
        this.app.showNotification('放置围棋子（视为一步走棋）', 'info');

        this.app.consumeMoveStep(1);
        this.app.render();
        return true;
    }

    isOwnHalf(y, player) {
        return (player === 'red' && y >= 5) || (player === 'black' && y <= 4);
    }

    createSkeletonPiece(x, y, player) {
        return {
            type: '骷',
            x,
            y,
            player,
            pluginSource: 'ChineseChess',
            hasMoved: false,
            isSkeleton: true
        };
    }

    checkGomokuStateAfterPlacement(placedPiece) {
        const player = this.app.currentPlayer;
        if (!this.app.matchController?.hasGomokuMode(player)) {
            return false;
        }

        if (!placedPiece || placedPiece.pluginSource !== 'Go') {
            return false;
        }

        const forbiddenType = this.getForbiddenGomokuType(placedPiece);
        if (forbiddenType) {
            const loser = player;
            const winner = loser === 'red' ? 'black' : 'red';
            this.app.showKillFeed('⚠️禁手', `${loser === 'red' ? '🔴' : '⚫'}${forbiddenType}`, 'kill');
            this.app.showNotification(`触发五子棋禁手（${forbiddenType}），本方立即判负`, 'warning');
            this.app.endCurrentRound(winner, `五子棋禁手判负（${forbiddenType}）`);
            this.app.render();
            return true;
        }

        if (this.hasFiveInRow(placedPiece)) {
            this.app.showKillFeed('🏁五连珠', `${player === 'red' ? '🔴' : '⚫'}达成五连`, 'capture');
            this.app.showNotification('五子连珠，直接获胜', 'success');
            this.app.endCurrentRound(player, '五子连珠');
            this.app.render();
            return true;
        }

        return false;
    }

    hasFiveInRow(piece) {
        const dirs = [
            [1, 0],
            [0, 1],
            [1, 1],
            [1, -1]
        ];
        return dirs.some(([dx, dy]) => this.countInLine(piece, dx, dy) >= 5);
    }

    getForbiddenGomokuType(piece) {
        const dirs = [
            [1, 0],
            [0, 1],
            [1, 1],
            [1, -1]
        ];

        let openThreeCount = 0;
        let openFourCount = 0;

        for (const [dx, dy] of dirs) {
            const lineCount = this.countInLine(piece, dx, dy);
            if (lineCount >= 6) {
                return '长连禁手';
            }

            const openEnds = this.countOpenEnds(piece, dx, dy);
            if (lineCount === 3 && openEnds === 2) {
                openThreeCount++;
            }
            if (lineCount === 4 && openEnds === 2) {
                openFourCount++;
            }
        }

        if (openThreeCount >= 2) {
            return '三三禁手';
        }
        if (openFourCount >= 2) {
            return '四四禁手';
        }
        return null;
    }

    countInLine(piece, dx, dy) {
        let total = 1;
        total += this.countOneDirection(piece, dx, dy);
        total += this.countOneDirection(piece, -dx, -dy);
        return total;
    }

    countOneDirection(piece, dx, dy) {
        let x = piece.x + dx;
        let y = piece.y + dy;
        let count = 0;
        while (this.app.board.isValidPosition(x, y)) {
            const target = this.app.board.getPieceAt(x, y);
            if (!target || target.player !== piece.player || target.pluginSource !== 'Go') {
                break;
            }
            count++;
            x += dx;
            y += dy;
        }
        return count;
    }

    countOpenEnds(piece, dx, dy) {
        const posCount = this.countOneDirection(piece, dx, dy);
        const negCount = this.countOneDirection(piece, -dx, -dy);

        let open = 0;
        const posEnd = { x: piece.x + dx * (posCount + 1), y: piece.y + dy * (posCount + 1) };
        const negEnd = { x: piece.x - dx * (negCount + 1), y: piece.y - dy * (negCount + 1) };

        if (this.app.board.isValidPosition(posEnd.x, posEnd.y) && !this.app.board.getPieceAt(posEnd.x, posEnd.y)) {
            open++;
        }
        if (this.app.board.isValidPosition(negEnd.x, negEnd.y) && !this.app.board.getPieceAt(negEnd.x, negEnd.y)) {
            open++;
        }

        return open;
    }

    isBlockedByEnemySmoke(gridX, gridY) {
        if (!this.app.board.smokeEffects || this.app.board.smokeEffects.length === 0) {
            return false;
        }

        return this.app.board.smokeEffects.some(smoke => {
            if (smoke.player === this.app.currentPlayer) {
                return false;
            }

            return Math.abs(gridX - smoke.x) <= 1 && Math.abs(gridY - smoke.y) <= 1;
        });
    }
}
