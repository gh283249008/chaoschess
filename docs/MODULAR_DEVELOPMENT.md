# 模块化开发指南

## 核心设计理念

混乱棋局采用**插件化架构**，所有游戏规则通过插件实现。最重要的是：**所有插件自动遵循围棋的"气"规则**，无需修改核心代码。

---

## 关键机制：跨插件气系统

### 设计原则

> **所有同阵营的棋子（不管来自哪个插件）都共享"气"**

这意味着：
- ✅ 中国象棋的"车"可以被围棋子提掉
- ✅ 国际象棋的"兵"可以被围棋子提掉
- ✅ 任何未来添加的棋类都会自动遵循这个规则

### 实现原理

#### 1. 统一的棋子接口

所有棋子必须包含以下属性：

```javascript
{
    x: number,           // X坐标 (0-8)
    y: number,           // Y坐标 (0-9)
    player: 'red' | 'black',  // 阵营
    pluginSource: string,     // 插件名称
    type: string              // 棋子类型
}
```

#### 2. UnionFind算法连接同色棋子

**核心代码** - `GoPlugin.analyzeBoard()`:

```javascript
/**
 * 分析棋盘，构建UnionFind并计算气
 * 关键：所有同阵营的棋子（象棋+围棋）都共享气
 */
analyzeBoard(allPieces) {
    this.dsu.reset(90);
    const boardMap = new Map(); // "x,y" -> piece

    // 1. 映射所有棋子（不区分插件来源）
    allPieces.forEach(p => boardMap.set(`${p.x},${p.y}`, p));

    // 2. 构建UnionFind组（连接相邻的同色棋子）
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 9; x++) {
            const current = boardMap.get(`${x},${y}`);
            if (!current) continue;

            const currentIndex = this.getIndex(x, y);

            // 检查右侧 - 只看阵营，不看插件
            if (x + 1 < 9) {
                const right = boardMap.get(`${x + 1},${y}`);
                if (right && right.player === current.player) {
                    this.dsu.union(currentIndex, this.getIndex(x + 1, y));
                }
            }

            // 检查下方 - 只看阵营，不看插件
            if (y + 1 < 10) {
                const down = boardMap.get(`${x},${y + 1}`);
                if (down && down.player === current.player) {
                    this.dsu.union(currentIndex, this.getIndex(x, y + 1));
                }
            }
        }
    }

    // 3. 计算每个组的气
    // ... (计算逻辑)
}
```

**关键点**：
- `right.player === current.player` - **只比较阵营，不比较插件来源**
- 这使得象棋的"车"和围棋子如果相邻且同色，会被视为一个整体

#### 3. 提子检查适用于所有棋子

**核心代码** - `GoPlugin.checkCaptures()`:

```javascript
/**
 * 检查并提掉没有气的棋子（包括所有插件的棋子）
 */
checkCaptures(allPieces, currentPlayer) {
    const enemyPlayer = currentPlayer === 'red' ? 'black' : 'red';
    const captured = [];

    // 更新棋盘分析（包含所有棋子）
    this.analyzeBoard(allPieces);

    // 提掉敌方没有气的棋子（不区分插件）
    allPieces.forEach(piece => {
        if (piece.player === enemyPlayer) {
            const liberties = this.countLiberties(piece);
            if (liberties === 0) {
                captured.push(piece);  // 可能是任何插件的棋子
            }
        }
    });

    return { captured, suicided };
}
```

**关键点**：
- `allPieces.forEach(piece => ...)` - 遍历所有棋子，不区分来源
- `this.countLiberties(piece)` - 计算任何棋子的气数
- 被提掉的可能是象棋、围棋、或任何其他插件的棋子

---

## 添加新插件的步骤

### 示例：添加国际象棋插件

#### 1. 创建插件类

```javascript
import { PiecePlugin } from '../../base/PiecePlugin.js';

export class InternationalChessPlugin extends PiecePlugin {
    constructor() {
        const config = {
            name: 'InternationalChess',
            version: '1.0.0',
            author: 'Your Name',
            description: '国际象棋插件',
            apiVersion: '1.0.0'
        };
        super(config);
    }

    getPieceTypes() {
        return ['King', 'Queen', 'Rook', 'Bishop', 'Knight', 'Pawn'];
    }

    validateMove(piece, from, to, gameState) {
        // 实现移动规则
    }

    render(ctx, piece, x, y, gridSize) {
        // 实现渲染逻辑
    }

    getInitialSetup() {
        // 返回初始布局
        return [
            { type: 'Pawn', x: 0, y: 6, player: 'red', pluginSource: 'InternationalChess' },
            // ... 更多棋子
        ];
    }
}
```

#### 2. 注册插件

```javascript
// main.js
import { InternationalChessPlugin } from './plugins/pieces/InternationalChess/InternationalChessPlugin.js';

const intlChess = new InternationalChessPlugin();
pluginManager.registerPiecePlugin('InternationalChess', intlChess);
```

#### 3. 自动获得围棋规则

**无需任何额外代码**，国际象棋的棋子会：
- ✅ 自动与同色的其他棋子共享气
- ✅ 被围住时会被提掉
- ✅ 可以保护同色的围棋子

---

## 实战示例

### 场景：围棋子提掉象棋车

```
初始状态：
  0 1 2 3 4
0 . . . . .
1 . ⚫ ⚫ ⚫ .    ⚫ = 黑方围棋子
2 . ⚫ 🔴車 ⚫ .    🔴車 = 红方象棋车
3 . ⚫ ⚫ ⚫ .
4 . . . . .

黑方在(2,2)下围棋子后：
  0 1 2 3 4
0 . . . . .
1 . ⚫ ⚫ ⚫ .
2 . ⚫ ⚫ ⚫ .    红方车被完全包围
3 . ⚫ ⚫ ⚫ .
4 . . . . .

结果：红方车没有气，被提掉！
```

**发生了什么**：
1. `analyzeBoard()` 分析所有棋子
2. 发现红方车在(2,2)，检查四个方向：
   - 上(2,1): 黑方围棋子 ❌
   - 下(2,3): 黑方围棋子 ❌
   - 左(1,2): 黑方围棋子 ❌
   - 右(3,2): 黑方围棋子 ❌
3. 红方车的气数 = 0
4. `checkCaptures()` 将红方车加入 `captured` 数组
5. 红方车被移除，显示击杀提示

---

## 高级特性：棋子联合体

### 同色棋子形成整体

```
场景：红方象棋车和围棋子相邻
  0 1 2 3 4
0 . . . . .
1 . ⚫ ⚫ ⚫ .
2 . ⚫ 🔴車 🔴● .    🔴車 = 红方车, 🔴● = 红方围棋子
3 . ⚫ ⚫ ⚫ .
4 . . . . .

红方车和红方围棋子共享气！
- 车的气 = 右侧空位
- 围棋子的气 = 右侧空位
- 它们形成一个整体，共享这个气
```

**UnionFind的作用**：
```javascript
// 车在(2,2)，围棋子在(3,2)
// 它们相邻且同色，会被union
this.dsu.union(getIndex(2,2), getIndex(3,2));

// 查询气数时，它们共享同一个气集合
const root = this.dsu.find(getIndex(2,2));
const liberties = this.libertiesMap.get(root);  // 共享的气
```

---

## 性能优化

### UnionFind的优势

- **时间复杂度**: O(α(n)) ≈ O(1) 均摊
- **空间复杂度**: O(n) = O(90) 对于9x10棋盘

**对比暴力搜索**：
- 暴力DFS/BFS: O(n²) 每次落子
- UnionFind: O(1) 查询气数

---

## 注意事项

### 1. 棋子必须有正确的属性

❌ **错误示例**：
```javascript
{
    x: 2,
    y: 3,
    // 缺少 player 属性！
    pluginSource: 'MyGame',
    type: 'Piece'
}
```

✅ **正确示例**：
```javascript
{
    x: 2,
    y: 3,
    player: 'red',  // 必须有！
    pluginSource: 'MyGame',
    type: 'Piece'
}
```

### 2. 坐标范围

- X: 0-8 (9列)
- Y: 0-9 (10行)
- 超出范围的棋子会被忽略

### 3. 插件独立性

每个插件只需关注：
- ✅ 自己的移动规则 (`validateMove`)
- ✅ 自己的渲染逻辑 (`render`)
- ❌ **不需要**关心围棋的气规则

---

## 扩展性

### 未来可以添加的插件

所有这些都会**自动**遵循围棋规则：

1. **日本将棋** - 40个棋子
2. **五子棋** - 连珠规则
3. **跳棋** - 跳跃移动
4. **军棋** - 隐藏信息
5. **自定义棋类** - 任何你想象的规则

**只需实现**：
- `getPieceTypes()`
- `validateMove()`
- `render()`
- `getInitialSetup()`

**自动获得**：
- 围棋的气系统
- 提子机制
- 与其他插件的互动

---

## 总结

### 核心优势

1. **插件即插即用** - 无需修改核心代码
2. **规则自动融合** - 所有插件遵循围棋气规则
3. **高性能** - UnionFind优化，O(1)查询
4. **易于扩展** - 添加新插件只需4个方法

### 关键代码位置

- **气系统核心**: `client/src/plugins/pieces/Go/GoPlugin.js`
- **UnionFind实现**: `client/src/plugins/pieces/Go/UnionFind.js`
- **提子逻辑**: `client/src/main.js` - `handleGoClick()`

### 设计哲学

> "让插件专注于自己的规则，让核心系统处理跨插件的交互"

这就是混乱棋局的模块化设计精髓！🎯
