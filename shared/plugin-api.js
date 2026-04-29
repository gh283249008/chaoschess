/**
 * 插件API定义
 * 定义了所有插件必须遵循的接口规范
 */

export const PLUGIN_API_VERSION = '1.0.0';

/**
 * 棋子插件接口
 */
export const PiecePluginInterface = {
    // 必须实现的方法
    required: [
        'getPieceTypes',    // 返回该插件支持的棋子类型数组
        'validateMove',     // 验证移动是否合法
        'render'            // 渲染棋子
    ],

    // 可选实现的方法
    optional: [
        'getInitialSetup',  // 返回初始棋盘布局
        'onPiecePlaced',    // 棋子放置时的回调
        'onPieceCaptured',  // 棋子被吃时的回调
        'onPieceMoved'      // 棋子移动后的回调
    ]
};

/**
 * 卡牌插件接口
 */
export const CardPluginInterface = {
    // 必须实现的方法
    required: [
        'createDeck',       // 创建牌堆
        'evaluateHand',     // 评估手牌
        'executeEffect',    // 执行卡牌效果
        'renderCard'        // 渲染卡牌
    ],

    // 可选实现的方法
    optional: [
        'onCardDrawn',      // 抽牌时的回调
        'onCardPlayed',     // 出牌时的回调
        'validatePlay',     // 验证出牌是否合法
        'onEffectExecuted'  // 效果执行后的回调
    ]
};

/**
 * 插件配置结构
 */
export const PluginConfigSchema = {
    name: 'string',           // 插件名称
    version: 'string',        // 插件版本
    author: 'string',         // 作者
    description: 'string',    // 描述
    apiVersion: 'string'      // 兼容的API版本
};
