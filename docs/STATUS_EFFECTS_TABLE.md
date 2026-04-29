# 状态效果表

## 当前状态效果

| 效果ID | 名称 | 图标 | 颜色 | 持续时间 | 效果 | 移动限制 | 来源 |
|--------|------|------|------|---------|------|---------|------|
| `freeze` | 冻结 | ❄️ | `#00BFFF` | 2回合 | 棋子无法移动 | 禁止 | 扑克-一对 |

---

## 回合计算

**1回合** = 红方行动 → 黑方行动

### 冻结2回合示例
```
T0: 红方使用"一对"冻结黑方棋子
T1: 黑方回合 - 被冻结 (剩余2回合)
T2: 红方回合
T3: 黑方回合 - 被冻结 (剩余1回合)
T4: 红方回合
T5: 黑方回合 - 解冻
```

---

## API使用

```javascript
// 应用冻结
effectManager.applyEffect(piece, 'freeze', 2);

// 检查是否可移动
const result = effectManager.canPieceMove(piece);

// 更新效果（每回合）
effectManager.tickEffects(pieces, currentPlayer);

// 渲染效果
effectManager.renderEffects(ctx, piece, x, y);
```
