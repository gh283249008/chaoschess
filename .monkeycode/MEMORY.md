# 用户指令记忆

本文件记录了用户的指令、偏好和教导，用于在未来的交互中提供参考。

## 格式

### 用户指令条目
用户指令条目应遵循以下格式：

[用户指令摘要]
- Date: [YYYY-MM-DD]
- Context: [提及的场景或时间]
- Instructions:
  - [用户教导或指示的内容，逐行描述]

### 项目知识条目
Agent 在任务执行过程中发现的条目应遵循以下格式：

[项目知识摘要]
- Date: [YYYY-MM-DD]
- Context: Agent 在执行 [具体任务描述] 时发现
- Category: [代码结构|代码模式|代码生成|构建方法|测试方法|依赖关系|环境配置]
- Instructions:
  - [具体的知识点，逐行描述]

## 去重策略
- 添加新条目前，检查是否存在相似或相同的指令
- 若发现重复，跳过新条目或与已有条目合并
- 合并时，更新上下文或日期信息
- 这有助于避免冗余条目，保持记忆文件整洁

## 条目

[连续执行偏好]
- Date: 2026-04-29
- Context: 用户在拆分架构任务中明确说明
- Instructions:
  - 当用户要求连续拆分或连续实施时，中途不需要反复确认；应持续执行到结构清晰、无需继续拆分再统一汇报。

[术语定义-回合]
- Date: 2026-04-29
- Context: 用户在玩法规则讨论中明确纠正
- Instructions:
  - 在该项目中，“一场对局”定义为一个回合（round）。
  - 术语表达时应区分“对局/回合（round）”与“局内行动轮次（turn）”，避免混用。

[混乱棋局项目架构与运行方式]
- Date: 2026-04-29
- Context: Agent 在执行项目理解与代码浏览时发现
- Category: 代码结构|构建方法|代码模式
- Instructions:
  - 项目是“混乱棋局 / Chaos Chess”，核心玩法是将中国象棋、围棋、国际象棋与扑克效果融合到同一 9x10 棋盘中。
  - 根目录是当前可运行的 Vite 前端入口，`package.json` 提供 `npm run dev`、`npm run build`、`npm run preview`，默认端口由 `FRONTEND_PORT` 控制，`Makefile` 默认使用 Bun 启动。
  - 前端核心代码位于 `client/src/`，其中 `main.js` 当前承载主要游戏流程，`core/` 提供插件管理、棋盘、状态效果，`plugins/` 提供棋子和扑克插件。
  - Canvas 渲染职责已开始收敛到 `client/src/ui/Renderer.js`，`main.js` 应优先保留应用编排、输入处理和玩法流程。
  - 扑克手牌、出牌和扑克技能效果流程已拆到 `client/src/game/PokerController.js`，通知和击杀提示已拆到 `client/src/ui/FeedbackController.js`。
  - 回合推进、围棋落子提子、象棋选子移动与升变分别拆到 `client/src/game/TurnController.js`、`client/src/game/GoController.js`、`client/src/game/ChessController.js`。
  - 状态栏按钮、模式文案和插件列表展示已拆到 `client/src/ui/AppUIController.js`，`main.js` 继续收敛为应用编排层。
  - 棋盘点击输入与模式分发已拆到 `client/src/game/InputController.js`，减少 `main.js` 对坐标与事件细节的耦合。
  - 服务端代码位于 `server/src/`，使用 `ws` 提供 WebSocket 房间与回合广播能力，但当前客户端主流程仍以本地单机 Canvas 交互为主。
  - 围棋插件的关键设计是跨插件“气”系统：所有同阵营棋子不区分 `pluginSource`，相邻时共享气，并可被围棋提子机制移除。

[扑克效果售卖粒度]
- Date: 2026-04-29
- Context: 用户在经济系统规则澄清中明确说明
- Instructions:
  - 德州扑克应整体作为一个可购买效果，不要按牌型拆分成多个单独售卖项。

[德州扑克出牌按钮规则]
- Date: 2026-04-29
- Context: 用户在商店与出牌流程规则澄清中明确说明
- Instructions:
  - 只有购买“德州扑克”后，才显示或启用出牌按钮。
  - 购买德州扑克仅代表获得出牌权限，具体触发效果仍由实际打出的牌型决定。

[联机玩家凭证规则]
- Date: 2026-04-29
- Context: 用户在联机房间流程定义中新增约束
- Instructions:
  - 当前阶段玩家身份先仅以 IP 地址作为区分不同玩家的凭证。
