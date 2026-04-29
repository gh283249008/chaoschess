# 状态效果系统使用指南

## 概述

`StatusEffectManager` 是一个通用的状态效果管理系统，用于管理棋子的各种状态效果（冻结、中毒、护盾等）。

## 核心特性

- ✅ **可扩展** - 轻松添加新的状态效果
- ✅ **可复用** - 任何插件都可以使用
- ✅ **自动管理** - 自动处理回合倒计时
- ✅ **视觉反馈** - 内置渲染支持

---

## 快速开始

### 1. 初始化

```javascript
import { StatusEffectManager } from './core/StatusEffectManager.js';

const effectManager = new StatusEffectManager();
```

### 2. 应用效果

```javascript
// 冻结棋子2回合
const message = effectManager.applyEffect(piece, 'freeze', 2);
console.log(message); // "车 被冻结了！"
```

### 3. 每回合更新

```javascript
// 在switchPlayer()中调用
const messages = effectManager.tickEffects(this.board.pieces, this.currentPlayer);
messages.forEach(msg => this.showNotification(msg, 'info'));
```

### 4. 检查移动限制

```javascript
const result = effectManager.canPieceMove(piece);
if (!result.canMove) {
    this.showNotification(result.reason, 'warning');
    return;
}
```

### 5. 渲染效果

```javascript
// 在render()中调用
effectManager.renderEffects(this.ctx, piece, x, y);
```

---

## 内置效果

### 冻结 (freeze)
- **效果**: 棋子无法移动
- **持续时间**: 可配置
- **视觉**: 蓝色边框 + ❄️图标

### 中毒 (poison)
- **效果**: 每回合扣血（如果有血量系统）
- **持续时间**: 可配置
- **视觉**: 紫色边框 + ☠️图标

### 护盾 (shield)
- **效果**: 免疫伤害（需配合战斗系统）
- **持续时间**: 可配置
- **视觉**: 金色边框 + 🛡️图标

---

## 添加自定义效果

### 示例：眩晕效果

```javascript
effectManager.registerEffect('stun', {
    name: '眩晕',
    icon: '💫',
    color: '#FFA500',
    
    // 应用效果时调用
    onApply: (piece, duration) => {
        piece.stunned = duration;
        return `${piece.type} 被眩晕了！`;
    },
    
    // 每回合调用
    onTick: (piece, currentPlayer) => {
        if (piece.player === currentPlayer && piece.stunned > 0) {
            piece.stunned--;
            if (piece.stunned === 0) {
                delete piece.stunned;
                return { removed: true, message: `${piece.type} 恢复清醒！` };
            }
        }
        return { removed: false };
    },
    
    // 检查是否可以移动
    canMove: (piece) => {
        return !piece.stunned || piece.stunned === 0;
    },
    
    // 渲染效果
    render: (ctx, piece, x, y) => {
        if (piece.stunned && piece.stunned > 0) {
            ctx.strokeStyle = '#FFA500';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, y, 28, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#FFA500';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`💫${piece.stunned}`, x, y + 35);
        }
    }
});
```

---

## 在插件中使用

### 扑克插件示例

```javascript
// 在PokerEffects.js中
case 1: // Pair: Freeze Enemy Piece
    const piece = gameState.getPieceAt(x, y);
    if (piece && piece.player !== currentPlayer) {
        // 使用状态效果管理器
        const message = context.effectManager.applyEffect(piece, 'freeze', 2);
        return {
            success: true,
            action: 'freeze_piece',
            target: piece,
            message
        };
    }
    return { success: false };
```

### 新卡牌效果示例

```javascript
// 假设有一张"毒药"卡牌
case 'poison_card':
    const target = gameState.getPieceAt(x, y);
    if (target && target.player !== currentPlayer) {
        const message = context.effectManager.applyEffect(target, 'poison', 3);
        return {
            success: true,
            message
        };
    }
    return { success: false };
```

---

## 集成到主游戏

### main.js修改

```javascript
import { StatusEffectManager } from './core/StatusEffectManager.js';

class ChaosChessApp {
    constructor() {
        // ...
        this.effectManager = new StatusEffectManager();
    }

    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'red' ? 'black' : 'red';
        
        // 更新所有状态效果
        const messages = this.effectManager.tickEffects(
            this.board.pieces, 
            this.currentPlayer
        );
        messages.forEach(msg => this.showNotification(msg, 'info'));
        
        this.updateStatus(`当前玩家: ${this.currentPlayer === 'red' ? '红方' : '黑方'}`);
    }

    handleChessClick(gridX, gridY) {
        const clickedPiece = this.board.getPieceAt(gridX, gridY);

        if (clickedPiece && clickedPiece.player === this.currentPlayer) {
            // 检查是否可以移动
            const result = this.effectManager.canPieceMove(clickedPiece);
            if (!result.canMove) {
                this.showNotification(result.reason, 'warning');
                return;
            }
            this.selectedPiece = clickedPiece;
            this.render();
            return;
        }
        // ...
    }

    render() {
        // ...
        this.board.pieces.forEach(piece => {
            const x = 40 + piece.x * 50;
            const y = 40 + piece.y * 50;
            this.pluginManager.renderPiece(this.ctx, piece, x, y, 50);

            // 渲染所有状态效果
            this.effectManager.renderEffects(this.ctx, piece, x, y);
        });
    }
}
```

---

## API参考

### `registerEffect(effectId, config)`
注册新的状态效果

**参数**:
- `effectId` (string): 效果唯一标识
- `config` (Object): 效果配置对象
  - `name` (string): 效果名称
  - `icon` (string): 效果图标
  - `color` (string): 效果颜色
  - `onApply(piece, duration)`: 应用效果时调用
  - `onTick(piece, currentPlayer)`: 每回合调用
  - `canMove(piece)`: 检查是否可移动
  - `render(ctx, piece, x, y)`: 渲染效果

### `applyEffect(piece, effectId, duration)`
应用效果到棋子

**返回**: 提示消息字符串

### `tickEffects(pieces, currentPlayer)`
更新所有棋子的效果

**返回**: 提示消息数组

### `canPieceMove(piece)`
检查棋子是否可以移动

**返回**: `{ canMove: boolean, reason: string }`

### `renderEffects(ctx, piece, x, y)`
渲染棋子的所有效果

### `clearEffects(piece)`
移除棋子的所有效果

### `getActiveEffects(piece)`
获取棋子的所有活跃效果

**返回**: 效果数组

---

## 优势

### 1. 代码复用
```javascript
// 任何地方都可以使用
effectManager.applyEffect(piece, 'freeze', 2);
```

### 2. 易于扩展
```javascript
// 添加新效果只需注册
effectManager.registerEffect('burn', { /* config */ });
```

### 3. 统一管理
```javascript
// 一个地方处理所有效果
effectManager.tickEffects(pieces, currentPlayer);
```

### 4. 插件友好
```javascript
// 插件可以直接使用
context.effectManager.applyEffect(target, 'poison', 3);
```

---

## 最佳实践

1. **效果命名**: 使用小写英文，如 `freeze`, `poison`, `shield`
2. **持续时间**: 使用回合数，而非秒数
3. **视觉反馈**: 每个效果都应该有独特的视觉表现
4. **消息提示**: 应用和移除效果时都应该有提示
5. **性能考虑**: 避免在render中做复杂计算

---

## 总结

`StatusEffectManager` 提供了一个**通用、可扩展、易用**的状态效果系统。任何插件或卡牌都可以轻松使用和扩展这个系统，无需重复编写状态管理代码。

这就是**模块化设计的威力**！🎯
