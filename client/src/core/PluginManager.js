import { PiecePluginInterface, CardPluginInterface } from '../../../shared/plugin-api.js';

/**
 * 插件管理器
 * 负责注册、验证和管理所有游戏插件
 */
export class PluginManager {
    constructor() {
        this.plugins = {
            pieces: new Map(),  // 棋子插件
            cards: new Map()    // 卡牌插件
        };
    }

    /**
     * 注册棋子插件
     * @param {string} name - 插件名称
     * @param {PiecePlugin} plugin - 插件实例
     */
    registerPiecePlugin(name, plugin) {
        if (!this.validatePiecePlugin(plugin)) {
            throw new Error(`Invalid piece plugin: ${name}`);
        }

        console.log(`✓ Registered piece plugin: ${name} v${plugin.version}`);
        this.plugins.pieces.set(name, plugin);
    }

    /**
     * 注册卡牌插件
     * @param {string} name - 插件名称
     * @param {CardPlugin} plugin - 插件实例
     */
    registerCardPlugin(name, plugin) {
        if (!this.validateCardPlugin(plugin)) {
            throw new Error(`Invalid card plugin: ${name}`);
        }

        console.log(`✓ Registered card plugin: ${name} v${plugin.version}`);
        this.plugins.cards.set(name, plugin);
    }

    /**
     * 验证棋子插件是否实现了必要的接口
     * @param {Object} plugin - 插件实例
     * @returns {boolean} 是否有效
     */
    validatePiecePlugin(plugin) {
        for (const method of PiecePluginInterface.required) {
            if (typeof plugin[method] !== 'function') {
                console.error(`Plugin missing required method: ${method}`);
                return false;
            }
        }
        return true;
    }

    /**
     * 验证卡牌插件是否实现了必要的接口
     * @param {Object} plugin - 插件实例
     * @returns {boolean} 是否有效
     */
    validateCardPlugin(plugin) {
        for (const method of CardPluginInterface.required) {
            if (typeof plugin[method] !== 'function') {
                console.error(`Plugin missing required method: ${method}`);
                return false;
            }
        }
        return true;
    }

    /**
     * 获取所有已注册的棋子类型
     * @returns {Array<string>} 棋子类型数组
     */
    getAllPieceTypes() {
        const types = [];
        for (const [name, plugin] of this.plugins.pieces) {
            const pluginTypes = plugin.getPieceTypes();
            types.push(...pluginTypes.map(type => ({ type, plugin: name })));
        }
        return types;
    }

    /**
     * 验证移动（委托给对应插件）
     * @param {Object} piece - 棋子对象
     * @param {Object} from - 起始位置
     * @param {Object} to - 目标位置
     * @param {Object} boardState - 棋盘状态
     * @returns {boolean} 是否合法
     */
    validateMove(piece, from, to, boardState) {
        const pluginName = piece.pluginSource;
        const plugin = this.plugins.pieces.get(pluginName);

        if (!plugin) {
            throw new Error(`Plugin not found: ${pluginName}`);
        }

        return plugin.validateMove(piece, from, to, boardState);
    }

    /**
     * 渲染棋子（委托给对应插件）
     * @param {CanvasRenderingContext2D} ctx - Canvas上下文
     * @param {Object} piece - 棋子对象
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {number} size - 格子大小
     */
    renderPiece(ctx, piece, x, y, size) {
        const pluginName = piece.pluginSource;
        const plugin = this.plugins.pieces.get(pluginName);

        if (plugin) {
            plugin.render(ctx, piece, x, y, size);
        }
    }

    /**
     * 获取插件
     * @param {string} type - 插件类型 ('pieces' 或 'cards')
     * @param {string} name - 插件名称
     * @returns {Object|null} 插件实例
     */
    getPlugin(type, name) {
        return this.plugins[type]?.get(name) || null;
    }

    /**
     * 列出所有已注册的插件
     * @returns {Object} 插件列表
     */
    listPlugins() {
        return {
            pieces: Array.from(this.plugins.pieces.keys()),
            cards: Array.from(this.plugins.cards.keys())
        };
    }
}
