# 插件开发指南

## 概述

混乱棋局采用插件化架构，允许开发者轻松添加新的棋类和卡牌系统，无需修改核心代码。

## 插件类型

### 1. 棋子插件 (PiecePlugin)

用于添加新的棋类游戏（如国际象棋、日本将棋等）。

### 2. 卡牌插件 (CardPlugin)

用于添加新的卡牌系统（如三国杀、游戏王等）。

---

## 创建棋子插件

### 步骤1: 创建插件目录

```bash
mkdir -p client/src/plugins/pieces/YourGame
cd client/src/plugins/pieces/YourGame
```

### 步骤2: 创建插件类

创建 `YourGamePlugin.js`：

```javascript
import { PiecePlugin } from '../../base/PiecePlugin.js';

export class YourGamePlugin extends PiecePlugin {
  constructor() {
    const config = {
      name: 'YourGame',
      version: '1.0.0',
      author: 'Your Name',
      description: '游戏描述',
      apiVersion: '1.0.0'
    };
    
    super(config);
    this.config = config;
  }
  
  // 必须实现的方法
  getPieceTypes() {
    return ['King', 'Queen', 'Rook', 'Bishop', 'Knight', 'Pawn'];
  }
  
  validateMove(piece, from, to, gameState) {
    // 实现移动验证逻辑
    switch (piece.type) {
      case 'King':
        return this.validateKingMove(piece, from, to);
      case 'Queen':
        return this.validateQueenMove(piece, from, to, gameState);
      // ... 其他棋子
    }
    return false;
  }
  
  render(ctx, piece, x, y, gridSize) {
    // 实现渲染逻辑
    ctx.fillStyle = piece.player === 'red' ? '#ff0000' : '#000000';
    ctx.font = `${gridSize * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(piece.type[0], x, y);
  }
  
  // 可选：生命周期回调
  onPiecePlaced(piece, position, gameState) {
    console.log(`${piece.type} placed at (${position.x}, ${position.y})`);
  }
  
  onPieceCaptured(piece, gameState) {
    console.log(`${piece.type} captured`);
  }
}
```

### 步骤3: 注册插件

在 `main.js` 中注册：

```javascript
import { YourGamePlugin } from './plugins/pieces/YourGame/YourGamePlugin.js';

const yourGamePlugin = new YourGamePlugin();
pluginManager.registerPiecePlugin('YourGame', yourGamePlugin);
```

---

## 创建卡牌插件

### 步骤1: 创建插件目录

```bash
mkdir -p client/src/plugins/cards/YourCardGame
cd client/src/plugins/cards/YourCardGame
```

### 步骤2: 创建插件类

创建 `YourCardGamePlugin.js`：

```javascript
import { CardPlugin } from '../../base/CardPlugin.js';

export class YourCardGamePlugin extends CardPlugin {
  constructor() {
    const config = {
      name: 'YourCardGame',
      version: '1.0.0',
      author: 'Your Name',
      description: '卡牌游戏描述',
      apiVersion: '1.0.0'
    };
    
    super(config);
  }
  
  // 必须实现的方法
  createDeck() {
    const deck = [];
    // 创建牌堆
    return deck;
  }
  
  evaluateHand(cards) {
    // 评估手牌
    return { type: 0, name: 'Hand Name' };
  }
  
  executeEffect(effectType, context, callback) {
    // 执行效果
    return { type: 'immediate', action: 'some_action' };
  }
  
  renderCard(ctx, card, x, y, width, height, selected) {
    // 渲染卡牌
  }
}
```

---

## API 参考

### PiecePlugin 基类

#### 必须实现的方法

**`getPieceTypes()`**
- 返回: `Array<string>` - 棋子类型列表
- 示例: `['King', 'Queen', 'Rook']`

**`validateMove(piece, from, to, gameState)`**
- 参数:
  - `piece`: 棋子对象 `{ type, x, y, player, pluginSource }`
  - `from`: 起始位置 `{ x, y }`
  - `to`: 目标位置 `{ x, y }`
  - `gameState`: 游戏状态对象
- 返回: `boolean` - 移动是否合法

**`render(ctx, piece, x, y, gridSize)`**
- 参数:
  - `ctx`: Canvas 2D渲染上下文
  - `piece`: 棋子对象
  - `x, y`: 屏幕坐标
  - `gridSize`: 网格大小（像素）

#### 可选方法

**`onPiecePlaced(piece, position, gameState)`**
- 棋子放置时的回调

**`onPieceCaptured(piece, gameState)`**
- 棋子被吃时的回调

**`getInitialSetup()`**
- 返回初始棋盘布局

---

### CardPlugin 基类

#### 必须实现的方法

**`createDeck()`**
- 返回: `Array<Card>` - 牌堆

**`evaluateHand(cards)`**
- 参数: `cards` - 手牌数组
- 返回: 牌型评估结果

**`executeEffect(effectType, context, callback)`**
- 执行卡牌效果

**`renderCard(ctx, card, x, y, width, height, selected)`**
- 渲染卡牌

---

## 游戏状态对象

插件可以访问以下游戏状态：

```javascript
{
  gameMode: 'chess' | 'go',
  currentPlayer: 'red' | 'black',
  pieces: Array<Piece>,
  pokerHands: {
    red: Array<Card>,
    black: Array<Card>
  },
  frozenPieces: Array<FrozenPiece>,
  smokeZones: Array<Zone>,
  walls: Array<Position>,
  riverBlocked: boolean,
  goBanned: boolean
}
```

---

## 辅助方法

### 获取指定位置的棋子

```javascript
gameState.pieces.find(p => p.x === x && p.y === y)
```

### 检查路径是否畅通

```javascript
isPathClear(fromX, fromY, toX, toY, gameState) {
  const dx = Math.sign(toX - fromX);
  const dy = Math.sign(toY - fromY);
  let x = fromX + dx;
  let y = fromY + dy;
  
  while (x !== toX || y !== toY) {
    if (gameState.pieces.find(p => p.x === x && p.y === y)) {
      return false;
    }
    x += dx;
    y += dy;
  }
  
  return true;
}
```

---

## 最佳实践

### 1. 命名规范

- 插件类名: `YourGamePlugin`
- 文件名: `YourGamePlugin.js`
- 目录名: `YourGame`

### 2. 错误处理

```javascript
validateMove(piece, from, to, gameState) {
  try {
    // 验证逻辑
  } catch (error) {
    console.error('Move validation error:', error);
    return false;
  }
}
```

### 3. 性能优化

- 缓存计算结果
- 避免在 `render()` 中进行复杂计算
- 使用高效的数据结构

### 4. 模块化

将复杂逻辑拆分为多个文件：

```
YourGame/
├── YourGamePlugin.js  # 主插件
├── pieces.js          # 棋子定义
├── rules.js           # 规则逻辑
└── renderer.js        # 渲染逻辑
```

---

## 调试技巧

### 1. 使用日志

```javascript
validateMove(piece, from, to, gameState) {
  console.log(`Validating ${piece.type} move from (${from.x},${from.y}) to (${to.x},${to.y})`);
  // ...
}
```

### 2. 使用浏览器开发者工具

- 在 Chrome DevTools 中设置断点
- 使用 `debugger;` 语句
- 查看 Network 标签页监控 WebSocket 消息

### 3. 单元测试

```javascript
// test/YourGamePlugin.test.js
import { YourGamePlugin } from '../YourGamePlugin.js';

describe('YourGamePlugin', () => {
  it('should validate king move', () => {
    const plugin = new YourGamePlugin();
    const piece = { type: 'King', x: 4, y: 4 };
    const result = plugin.validateMove(piece, {x:4,y:4}, {x:5,y:4}, {});
    expect(result).toBe(true);
  });
});
```

---

## 示例插件

查看以下示例插件了解完整实现：

- [ChineseChessPlugin](file:///Users/dreemurr/Desktop/checkmate/client/src/plugins/pieces/ChineseChess/ChineseChessPlugin.js) - 中国象棋
- [GoPlugin](file:///Users/dreemurr/Desktop/checkmate/client/src/plugins/pieces/Go/GoPlugin.js) - 围棋
- [PokerPlugin](file:///Users/dreemurr/Desktop/checkmate/client/src/plugins/cards/Poker/PokerPlugin.js) - 扑克
- [InternationalChessPlugin](file:///Users/dreemurr/Desktop/checkmate/client/src/plugins/pieces/InternationalChess/InternationalChessPlugin.js) - 国际象棋（示例）

---

## 常见问题

**Q: 如何访问其他插件的数据？**

A: 通过 `gameState` 对象访问全局状态，避免直接依赖其他插件。

**Q: 如何添加自定义效果？**

A: 在插件中定义效果，通过事件总线通知核心框架。

**Q: 插件可以修改核心代码吗？**

A: 不可以。插件应该是独立的，不应修改核心框架。

---

## 发布插件

1. 确保插件通过所有测试
2. 编写 README.md 文档
3. 添加示例和截图
4. 发布到 npm 或 GitHub

---

## 获取帮助

- 查看[实现计划](file:///Users/dreemurr/.gemini/antigravity/brain/aa8bc4b0-6c3e-4f8a-b3dc-5cbf84803961/implementation_plan.md)
- 参考[核心框架文档](file:///Users/dreemurr/Desktop/checkmate/client/src/core/README.md)
- 提交 Issue 到 GitHub
