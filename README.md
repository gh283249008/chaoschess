# 混乱棋局 - Chaos Chess

一个创新的多规则融合棋类游戏，采用插件化架构，支持中国象棋、围棋、扑克等多种游戏规则的混合对战。

## ✨ 特性

- 🎮 **插件化架构** - 轻松添加新棋类和卡牌系统
- 🌐 **在线对战** - WebSocket实时多人游戏
- 🎨 **现代UI** - Canvas渲染，流畅动画
- 📦 **模块化设计** - Redux-like状态管理
- 🔧 **易于扩展** - 完善的插件API

## 🚀 快速开始

### 安装依赖

```bash
# 安装客户端依赖
cd client
npm install

# 安装服务端依赖
cd ../server
npm install
```

### 启动开发服务器

```bash
# 启动客户端（终端1）
cd client
npm run dev

# 启动服务端（终端2）
cd server
npm run dev
```

访问 http://localhost:9001 开始游戏！

## 📚 项目结构

```
checkmate/
├── client/                 # 前端代码
│   ├── src/
│   │   ├── core/          # 核心框架
│   │   ├── plugins/       # 插件系统
│   │   ├── state/         # 状态管理
│   │   ├── ui/            # UI层
│   │   └── network/       # 网络层
│   └── index.html
│
├── server/                 # 服务端代码
│   └── src/
│       ├── GameServer.js  # WebSocket服务器
│       ├── Room.js        # 房间管理
│       └── PluginValidator.js
│
└── docs/                   # 文档
    └── PLUGIN_DEVELOPMENT.md
```

## 🎯 已实现的插件

### 棋子插件

- **中国象棋** - 7种棋子，完整规则
- **围棋** - UnionFind算法优化
- **国际象棋** - 示例插件

### 卡牌插件

- **扑克** - 10种牌型效果

## 🔌 开发插件

查看[插件开发指南](docs/PLUGIN_DEVELOPMENT.md)了解如何创建自己的插件。

### 创建棋子插件示例

```javascript
import { PiecePlugin } from './plugins/base/PiecePlugin.js';

export class MyGamePlugin extends PiecePlugin {
  getPieceTypes() {
    return ['King', 'Queen'];
  }
  
  validateMove(piece, from, to, gameState) {
    // 实现移动规则
    return true;
  }
  
  render(ctx, piece, x, y, gridSize) {
    // 实现渲染逻辑
  }
}
```

## 🏗️ 架构亮点

### 插件管理器

```javascript
const pluginManager = new PluginManager();
pluginManager.registerPiecePlugin('ChineseChess', new ChineseChessPlugin());
pluginManager.registerCardPlugin('Poker', new PokerPlugin());
```

### 状态管理

```javascript
const store = createStore(
  gameReducer,
  initialState,
  applyMiddleware(loggerMiddleware, networkMiddleware)
);

store.dispatch(Actions.movePiece(piece, from, to));
```

### 网络通信

```javascript
const client = new NetworkClient('ws://localhost:8080');
await client.connect();
client.createRoom();
```

## 📖 API文档

### 核心模块

- [PluginManager](client/src/core/PluginManager.js) - 插件注册和管理
- [EventBus](client/src/core/EventBus.js) - 事件系统
- [Store](client/src/state/Store.js) - 状态管理

### 插件基类

- [PiecePlugin](client/src/plugins/base/PiecePlugin.js) - 棋子插件基类
- [CardPlugin](client/src/plugins/base/CardPlugin.js) - 卡牌插件基类

## 🧪 测试

```bash
# 运行测试
npm test

# 代码覆盖率
npm run test:coverage
```

## 📝 开发路线图

- [x] 核心框架
- [x] 插件系统
- [x] 状态管理
- [x] UI层
- [x] 网络层
- [ ] 单元测试
- [ ] AI对手
- [ ] 移动端适配

## 🤝 贡献

欢迎提交 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

感谢所有贡献者和开源社区的支持！


## 项目状态

✅ **阶段1-3已完成** - 核心插件架构已搭建完成

## 项目结构

```
checkmate/
├── client/                          # 前端代码
│   ├── src/
│   │   ├── core/                    # 核心框架 ✅
│   │   │   ├── PluginManager.js     # 插件管理器
│   │   │   ├── EventBus.js          # 事件总线
│   │   │   └── Board.js             # 通用棋盘
│   │   ├── plugins/                 # 插件系统
│   │   │   ├── base/                # 基类 ✅
│   │   │   │   ├── PiecePlugin.js   # 棋子插件基类
│   │   │   │   └── CardPlugin.js    # 卡牌插件基类
│   │   │   ├── pieces/              # 棋子插件（待实现）
│   │   │   └── cards/               # 卡牌插件（待实现）
│   │   ├── main.js                  # 应用入口 ✅
│   │   └── ...
│   ├── public/
│   │   └── index.html               # HTML入口 ✅
│   ├── package.json                 # ✅
│   └── vite.config.js               # ✅
│
├── server/                          # 服务端（待实现）
│   ├── src/
│   └── package.json                 # ✅
│
├── shared/                          # 共享代码 ✅
│   └── plugin-api.js                # 插件API定义
│
└── 核心玩法代码.html                # 原始代码备份 ✅
```

## 快速开始

### 安装依赖

```bash
cd client
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:9001

## 核心概念

### 插件系统

所有游戏逻辑都通过插件实现，核心框架不依赖具体游戏规则。

#### 棋子插件

继承 `PiecePlugin` 基类：

```javascript
import { PiecePlugin } from './plugins/base/PiecePlugin.js';

class MyChessPlugin extends PiecePlugin {
  getPieceTypes() {
    return ['King', 'Queen', 'Rook'];
  }
  
  validateMove(piece, from, to, boardState) {
    // 实现移动验证逻辑
    return true;
  }
  
  render(ctx, piece, x, y, size) {
    // 实现渲染逻辑
  }
}
```

#### 卡牌插件

继承 `CardPlugin` 基类：

```javascript
import { CardPlugin } from './plugins/base/CardPlugin.js';

class MyCardPlugin extends CardPlugin {
  createDeck() {
    return [/* 卡牌数组 */];
  }
  
  evaluateHand(cards) {
    // 评估手牌
  }
  
  executeEffect(effect, context) {
    // 执行效果
  }
  
  renderCard(ctx, card, x, y, width, height) {
    // 渲染卡牌
  }
}
```

### 注册插件

```javascript
import { PluginManager } from './core/PluginManager.js';

const pluginManager = new PluginManager();

// 注册棋子插件
pluginManager.registerPiecePlugin('MyChess', new MyChessPlugin());

// 注册卡牌插件
pluginManager.registerCardPlugin('MyCards', new MyCardPlugin());
```

## 下一步

- [ ] 实现中国象棋插件
- [ ] 实现围棋插件
- [ ] 实现扑克插件
- [ ] 实现状态管理系统
- [ ] 实现UI渲染层
- [ ] 实现服务端

## 技术栈

- **构建工具**: Vite 5.0
- **模块系统**: ES6 Modules
- **代码规范**: ESLint
- **网络通信**: WebSocket (ws)
