"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unload = exports.load = exports.methods = void 0;
const mcp_server_1 = require("./mcp-server");
const settings_1 = require("./settings");
let mcpServer = null;
let toolManager;
/**
 * @en Registration method for the main process of Extension
 * @zh 为扩展的主进程的注册方法
 */
exports.methods = {
    /**
     * @en Open the MCP server panel
     * @zh 打开 MCP 服务器面板
     */
    openPanel() {
        Editor.Panel.open('cocos-mcp-server');
    },
    /**
     * @en Start the MCP server
     * @zh 启动 MCP 服务器
     */
    async startServer() {
        if (mcpServer) {
            // 确保使用最新的工具配置
            const enabledTools = toolManager.getEnabledTools();
            mcpServer.updateEnabledTools(enabledTools);
            await mcpServer.start();
        }
        else {
            console.warn('[MCP插件] mcpServer 未初始化');
        }
    },
    /**
     * @en Stop the MCP server
     * @zh 停止 MCP 服务器
     */
    async stopServer() {
        if (mcpServer) {
            mcpServer.stop();
        }
        else {
            console.warn('[MCP插件] mcpServer 未初始化');
        }
    },
    /**
     * @en Get server status
     * @zh 获取服务器状态
     */
    getServerStatus() {
        const status = mcpServer ? mcpServer.getStatus() : { running: false, port: 0, clients: 0 };
        const settings = mcpServer ? mcpServer.getSettings() : (0, settings_1.readSettings)();
        return Object.assign(Object.assign({}, status), { settings: settings });
    },
    /**
     * @en Update server settings
     * @zh 更新服务器设置
     */
    updateSettings(settings) {
        (0, settings_1.saveSettings)(settings);
        if (mcpServer) {
            mcpServer.stop();
            mcpServer = new mcp_server_1.MCPServer(settings);
            mcpServer.start();
        }
        else {
            mcpServer = new mcp_server_1.MCPServer(settings);
            mcpServer.start();
        }
    },
    /**
     * @en Get tools list
     * @zh 获取工具列表
     */
    getToolsList() {
        return mcpServer ? mcpServer.getAvailableTools() : [];
    },
    getFilteredToolsList() {
        if (!mcpServer)
            return [];
        // 获取当前启用的工具
        const enabledTools = toolManager.getEnabledTools();
        // 更新MCP服务器的启用工具列表
        mcpServer.updateEnabledTools(enabledTools);
        return mcpServer.getFilteredTools(enabledTools);
    },
    /**
     * @en Get server settings
     * @zh 获取服务器设置
     */
    async getServerSettings() {
        return mcpServer ? mcpServer.getSettings() : (0, settings_1.readSettings)();
    },
    /**
     * @en Get server settings (alternative method)
     * @zh 获取服务器设置（替代方法）
     */
    async getSettings() {
        return mcpServer ? mcpServer.getSettings() : (0, settings_1.readSettings)();
    },
    // 工具管理器相关方法
    async getToolManagerState() {
        return toolManager.getToolManagerState();
    },
    async createToolConfiguration(name, description) {
        try {
            const config = toolManager.createConfiguration(name, description);
            return { success: true, id: config.id, config };
        }
        catch (error) {
            throw new Error(`创建配置失败: ${error.message}`);
        }
    },
    async updateToolConfiguration(configId, updates) {
        try {
            return toolManager.updateConfiguration(configId, updates);
        }
        catch (error) {
            throw new Error(`更新配置失败: ${error.message}`);
        }
    },
    async deleteToolConfiguration(configId) {
        try {
            toolManager.deleteConfiguration(configId);
            return { success: true };
        }
        catch (error) {
            throw new Error(`删除配置失败: ${error.message}`);
        }
    },
    async setCurrentToolConfiguration(configId) {
        try {
            toolManager.setCurrentConfiguration(configId);
            return { success: true };
        }
        catch (error) {
            throw new Error(`设置当前配置失败: ${error.message}`);
        }
    },
    async updateToolStatus(category, toolName, enabled) {
        try {
            const currentConfig = toolManager.getCurrentConfiguration();
            if (!currentConfig) {
                throw new Error('没有当前配置');
            }
            toolManager.updateToolStatus(currentConfig.id, category, toolName, enabled);
            // 更新MCP服务器的工具列表
            if (mcpServer) {
                const enabledTools = toolManager.getEnabledTools();
                mcpServer.updateEnabledTools(enabledTools);
            }
            return { success: true };
        }
        catch (error) {
            throw new Error(`更新工具状态失败: ${error.message}`);
        }
    },
    async updateToolStatusBatch(updates) {
        try {
            console.log(`[Main] updateToolStatusBatch called with updates count:`, updates ? updates.length : 0);
            const currentConfig = toolManager.getCurrentConfiguration();
            if (!currentConfig) {
                throw new Error('没有当前配置');
            }
            toolManager.updateToolStatusBatch(currentConfig.id, updates);
            // 更新MCP服务器的工具列表
            if (mcpServer) {
                const enabledTools = toolManager.getEnabledTools();
                mcpServer.updateEnabledTools(enabledTools);
            }
            return { success: true };
        }
        catch (error) {
            throw new Error(`批量更新工具状态失败: ${error.message}`);
        }
    },
    async exportToolConfiguration(configId) {
        try {
            return { configJson: toolManager.exportConfiguration(configId) };
        }
        catch (error) {
            throw new Error(`导出配置失败: ${error.message}`);
        }
    },
    async importToolConfiguration(configJson) {
        try {
            return toolManager.importConfiguration(configJson);
        }
        catch (error) {
            throw new Error(`导入配置失败: ${error.message}`);
        }
    },
    async getEnabledTools() {
        return toolManager.getEnabledTools();
    },
    /**
     * 热重载 MCP 服务器主进程代码。
     * 流程:stop 旧 :3000 → 清 dist 子模块 require.cache → 动态 require 新实例 → start。
     * 使 tools/*、compat、mcp-server.ts、settings.ts 改动免重启编辑器生效。
     * 限制:main.ts 自身改动需重启编辑器(此方法在 main.ts 内)。
     * 经 Editor.Message.request('cocos-mcp-server', 'reload-mcp-server') 调用。
     */
    async reloadMcpServer() {
        try {
            // 1. 停旧
            if (mcpServer) {
                try {
                    mcpServer.stop();
                }
                catch ( /* ignore */_a) { /* ignore */ }
                mcpServer = null;
            }
            // 2. 清 dist 子模块 cache(不含 main.js 自身)
            const distDir = __dirname;
            for (const k of Object.keys(require.cache)) {
                if (k.startsWith(distDir) && !k.endsWith('main.js')) {
                    try {
                        delete require.cache[k];
                    }
                    catch ( /* ignore */_b) { /* ignore */ }
                }
            }
            // 3. 动态 require 新实例
            const { ToolManager } = require('./tools/tool-manager');
            const { MCPServer } = require('./mcp-server');
            const { readSettings } = require('./settings');
            toolManager = new ToolManager();
            const settings = readSettings();
            const server = new MCPServer(settings);
            mcpServer = server;
            server.updateEnabledTools(toolManager.getEnabledTools());
            // 4. 始终启动(不受 autoStart 限制,热重载场景必须重启 :3000)
            await server.start();
            return { success: true, message: 'MCP server hot-reloaded with fresh code', toolCount: toolManager.getEnabledTools().length };
        }
        catch (e) {
            return { success: false, error: (e === null || e === void 0 ? void 0 : e.message) || String(e), stack: e === null || e === void 0 ? void 0 : e.stack };
        }
    }
};
/**
 * @en Method Triggered on Extension Startup
 * @zh 扩展启动时触发的方法
 *
 * 主进程热重载策略:每次 load() 清 dist 下子模块 require.cache(不含 main.js 自身),
 * 再用动态 require 取 ToolManager/MCPServer/readSettings 的新实例。
 * 这样 extension:reload 后,主进程代码(tools/*、mcp-server、compat、settings)真替换。
 * 限制:main.ts 自身改动仍需重启编辑器(它由 Cocos 顶层 require,不走 load() 内动态路径)。
 */
function load() {
    console.log('Cocos MCP Server extension loaded');
    const distDir = __dirname;
    // 清 dist 下所有子模块 cache(含 mcp-server.ts、tools/*、utils/*、settings.ts),
    // 不含 main.js 自身(避免 load() 执行中自删引起异常)
    try {
        for (const k of Object.keys(require.cache)) {
            if (k.startsWith(distDir) && !k.endsWith('main.js')) {
                try {
                    delete require.cache[k];
                }
                catch ( /* ignore */_a) { /* ignore */ }
            }
        }
    }
    catch ( /* ignore */_b) { /* ignore */ }
    // 动态 require 取新实例(clear 后必为最新代码)
    const { ToolManager } = require('./tools/tool-manager');
    const { MCPServer } = require('./mcp-server');
    const { readSettings } = require('./settings');
    // 初始化工具管理器
    toolManager = new ToolManager();
    // 读取设置
    const settings = readSettings();
    const server = new MCPServer(settings);
    mcpServer = server;
    // 初始化MCP服务器的工具列表
    const enabledTools = toolManager.getEnabledTools();
    server.updateEnabledTools(enabledTools);
    // 如果设置了自动启动，则启动服务器
    if (settings.autoStart) {
        server.start().catch((err) => {
            console.error('Failed to auto-start MCP server:', err);
        });
    }
}
exports.load = load;
/**
 * @en Method triggered when uninstalling the extension
 * @zh 卸载扩展时触发的方法
 */
function unload() {
    if (mcpServer) {
        mcpServer.stop();
        mcpServer = null;
    }
}
exports.unload = unload;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQUF5QztBQUN6Qyx5Q0FBd0Q7QUFJeEQsSUFBSSxTQUFTLEdBQXFCLElBQUksQ0FBQztBQUN2QyxJQUFJLFdBQXdCLENBQUM7QUFFN0I7OztHQUdHO0FBQ1UsUUFBQSxPQUFPLEdBQTRDO0lBQzVEOzs7T0FHRztJQUNILFNBQVM7UUFDTCxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFJRDs7O09BR0c7SUFDSCxLQUFLLENBQUMsV0FBVztRQUNiLElBQUksU0FBUyxFQUFFLENBQUM7WUFDWixjQUFjO1lBQ2QsTUFBTSxZQUFZLEdBQUcsV0FBVyxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ25ELFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUMzQyxNQUFNLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUM1QixDQUFDO2FBQU0sQ0FBQztZQUNKLE9BQU8sQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUMzQyxDQUFDO0lBQ0wsQ0FBQztJQUVEOzs7T0FHRztJQUNILEtBQUssQ0FBQyxVQUFVO1FBQ1osSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNaLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNyQixDQUFDO2FBQU0sQ0FBQztZQUNKLE9BQU8sQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUMzQyxDQUFDO0lBQ0wsQ0FBQztJQUVEOzs7T0FHRztJQUNILGVBQWU7UUFDWCxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFF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bUJBQW1CO0lBQ25CLElBQUksUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ3JCLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFRLEVBQUUsRUFBRTtZQUM5QixPQUFPLENBQUMsS0FBSyxDQUFDLGtDQUFrQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzNELENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztBQUNMLENBQUM7QUFyQ0Qsb0JBcUNDO0FBRUQ7OztHQUdHO0FBQ0gsU0FBZ0IsTUFBTTtJQUNsQixJQUFJLFNBQVMsRUFBRSxDQUFDO1FBQ1osU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2pCLFNBQVMsR0FBRyxJQUFJLENBQUM7SUFDckIsQ0FBQztBQUNMLENBQUM7QUFMRCx3QkFLQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1DUFNlcnZlciB9IGZyb20gJy4vbWNwLXNlcnZlcic7XHJcbmltcG9ydCB7IHJlYWRTZXR0aW5ncywgc2F2ZVNldHRpbmdzIH0gZnJvbSAnLi9zZXR0aW5ncyc7XHJcbmltcG9ydCB7IE1DUFNlcnZlclNldHRpbmdzIH0gZnJvbSAnLi90eXBlcyc7XHJcbmltcG9ydCB7IFRvb2xNYW5hZ2VyIH0gZnJvbSAnLi90b29scy90b29sLW1hbmFnZXInO1xyXG5cclxubGV0IG1jcFNlcnZlcjogTUNQU2VydmVyIHwgbnVsbCA9IG51bGw7XHJcbmxldCB0b29sTWFuYWdlcjogVG9vbE1hbmFnZXI7XHJcblxyXG4vKipcclxuICogQGVuIFJlZ2lzdHJhdGlvbiBtZXRob2QgZm9yIHRoZSBtYWluIHByb2Nlc3Mgb2YgRXh0ZW5zaW9uXHJcbiAqIEB6aCDkuLrmianlsZXnmoTkuLvov5vnqIvnmoTms6jlhozmlrnms5VcclxuICovXHJcbmV4cG9ydCBjb25zdCBtZXRob2RzOiB7IFtrZXk6IHN0cmluZ106ICguLi5hbnk6IGFueSkgPT4gYW55IH0gPSB7XHJcbiAgICAvKipcclxuICAgICAqIEBlbiBPcGVuIHRoZSBNQ1Agc2VydmVyIHBhbmVsXHJcbiAgICAgKiBAemgg5omT5byAIE1DUCDmnI3liqHlmajpnaLmnb9cclxuICAgICAqL1xyXG4gICAgb3BlblBhbmVsKCkge1xyXG4gICAgICAgIEVkaXRvci5QYW5lbC5vcGVuKCdjb2Nvcy1tY3Atc2VydmVyJyk7XHJcbiAgICB9LFxyXG5cclxuXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAZW4gU3RhcnQgdGhlIE1DUCBzZXJ2ZXJcclxuICAgICAqIEB6aCDlkK/liqggTUNQIOacjeWKoeWZqFxyXG4gICAgICovXHJcbiAgICBhc3luYyBzdGFydFNlcnZlcigpIHtcclxuICAgICAgICBpZiAobWNwU2VydmVyKSB7XHJcbiAgICAgICAgICAgIC8vIOehruS/neS9v+eUqOacgOaWsOeahOW3peWFt+mFjee9rlxyXG4gICAgICAgICAgICBjb25zdCBlbmFibGVkVG9vbHMgPSB0b29sTWFuYWdlci5nZXRFbmFibGVkVG9vbHMoKTtcclxuICAgICAgICAgICAgbWNwU2VydmVyLnVwZGF0ZUVuYWJsZWRUb29scyhlbmFibGVkVG9vbHMpO1xyXG4gICAgICAgICAgICBhd2FpdCBtY3BTZXJ2ZXIuc3RhcnQoKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1tNQ1Dmj5Lku7ZdIG1jcFNlcnZlciDmnKrliJ3lp4vljJYnKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQGVuIFN0b3AgdGhlIE1DUCBzZXJ2ZXJcclxuICAgICAqIEB6aCDlgZzmraIgTUNQIOacjeWKoeWZqFxyXG4gICAgICovXHJcbiAgICBhc3luYyBzdG9wU2VydmVyKCkge1xyXG4gICAgICAgIGlmIChtY3BTZXJ2ZXIpIHtcclxuICAgICAgICAgICAgbWNwU2VydmVyLnN0b3AoKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1tNQ1Dmj5Lku7ZdIG1jcFNlcnZlciDmnKrliJ3lp4vljJYnKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQGVuIEdldCBzZXJ2ZXIgc3RhdHVzXHJcbiAgICAgKiBAemgg6I635Y+W5pyN5Yqh5Zmo54q25oCBXHJcbiAgICAgKi9cclxuICAgIGdldFNlcnZlclN0YXR1cygpIHtcclxuICAgICAgICBjb25zdCBzdGF0dXMgPSBtY3BTZXJ2ZXIgPyBtY3BTZXJ2ZXIuZ2V0U3RhdHVzKCkgOiB7IHJ1bm5pbmc6IGZhbHNlLCBwb3J0OiAwLCBjbGllbnRzOiAwIH07XHJcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBtY3BTZXJ2ZXIgPyBtY3BTZXJ2ZXIuZ2V0U2V0dGluZ3MoKSA6IHJlYWRTZXR0aW5ncygpO1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIC4uLnN0YXR1cyxcclxuICAgICAgICAgICAgc2V0dGluZ3M6IHNldHRpbmdzXHJcbiAgICAgICAgfTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAZW4gVXBkYXRlIHNlcnZlciBzZXR0aW5nc1xyXG4gICAgICogQHpoIOabtOaWsOacjeWKoeWZqOiuvue9rlxyXG4gICAgICovXHJcbiAgICB1cGRhdGVTZXR0aW5ncyhzZXR0aW5nczogTUNQU2VydmVyU2V0dGluZ3MpIHtcclxuICAgICAgICBzYXZlU2V0dGluZ3Moc2V0dGluZ3MpO1xyXG4gICAgICAgIGlmIChtY3BTZXJ2ZXIpIHtcclxuICAgICAgICAgICAgbWNwU2VydmVyLnN0b3AoKTtcclxuICAgICAgICAgICAgbWNwU2VydmVyID0gbmV3IE1DUFNlcnZlcihzZXR0aW5ncyk7XHJcbiAgICAgICAgICAgIG1jcFNlcnZlci5zdGFydCgpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIG1jcFNlcnZlciA9IG5ldyBNQ1BTZXJ2ZXIoc2V0dGluZ3MpO1xyXG4gICAgICAgICAgICBtY3BTZXJ2ZXIuc3RhcnQoKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQGVuIEdldCB0b29scyBsaXN0XHJcbiAgICAgKiBAemgg6I635Y+W5bel5YW35YiX6KGoXHJcbiAgICAgKi9cclxuICAgIGdldFRvb2xzTGlzdCgpIHtcclxuICAgICAgICByZXR1cm4gbWNwU2VydmVyID8gbWNwU2VydmVyLmdldEF2YWlsYWJsZVRvb2xzKCkgOiBbXTtcclxuICAgIH0sXHJcblxyXG4gICAgZ2V0RmlsdGVyZWRUb29sc0xpc3QoKSB7XHJcbiAgICAgICAgaWYgKCFtY3BTZXJ2ZXIpIHJldHVybiBbXTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDojrflj5blvZPliY3lkK/nlKjnmoTlt6XlhbdcclxuICAgICAgICBjb25zdCBlbmFibGVkVG9vbHMgPSB0b29sTWFuYWdlci5nZXRFbmFibGVkVG9vbHMoKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDmm7TmlrBNQ1DmnI3liqHlmajnmoTlkK/nlKjlt6XlhbfliJfooahcclxuICAgICAgICBtY3BTZXJ2ZXIudXBkYXRlRW5hYmxlZFRvb2xzKGVuYWJsZWRUb29scyk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmV0dXJuIG1jcFNlcnZlci5nZXRGaWx0ZXJlZFRvb2xzKGVuYWJsZWRUb29scyk7XHJcbiAgICB9LFxyXG4gICAgLyoqXHJcbiAgICAgKiBAZW4gR2V0IHNlcnZlciBzZXR0aW5nc1xyXG4gICAgICogQHpoIOiOt+WPluacjeWKoeWZqOiuvue9rlxyXG4gICAgICovXHJcbiAgICBhc3luYyBnZXRTZXJ2ZXJTZXR0aW5ncygpIHtcclxuICAgICAgICByZXR1cm4gbWNwU2VydmVyID8gbWNwU2VydmVyLmdldFNldHRpbmdzKCkgOiByZWFkU2V0dGluZ3MoKTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAZW4gR2V0IHNlcnZlciBzZXR0aW5ncyAoYWx0ZXJuYXRpdmUgbWV0aG9kKVxyXG4gICAgICogQHpoIOiOt+WPluacjeWKoeWZqOiuvue9ru+8iOabv+S7o+aWueazle+8iVxyXG4gICAgICovXHJcbiAgICBhc3luYyBnZXRTZXR0aW5ncygpIHtcclxuICAgICAgICByZXR1cm4gbWNwU2VydmVyID8gbWNwU2VydmVyLmdldFNldHRpbmdzKCkgOiByZWFkU2V0dGluZ3MoKTtcclxuICAgIH0sXHJcblxyXG4gICAgLy8g5bel5YW3566h55CG5Zmo55u45YWz5pa55rOVXHJcbiAgICBhc3luYyBnZXRUb29sTWFuYWdlclN0YXRlKCkge1xyXG4gICAgICAgIHJldHVybiB0b29sTWFuYWdlci5nZXRUb29sTWFuYWdlclN0YXRlKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIGFzeW5jIGNyZWF0ZVRvb2xDb25maWd1cmF0aW9uKG5hbWU6IHN0cmluZywgZGVzY3JpcHRpb24/OiBzdHJpbmcpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBjb25maWcgPSB0b29sTWFuYWdlci5jcmVhdGVDb25maWd1cmF0aW9uKG5hbWUsIGRlc2NyaXB0aW9uKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgaWQ6IGNvbmZpZy5pZCwgY29uZmlnIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYOWIm+W7uumFjee9ruWksei0pTogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgYXN5bmMgdXBkYXRlVG9vbENvbmZpZ3VyYXRpb24oY29uZmlnSWQ6IHN0cmluZywgdXBkYXRlczogYW55KSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgcmV0dXJuIHRvb2xNYW5hZ2VyLnVwZGF0ZUNvbmZpZ3VyYXRpb24oY29uZmlnSWQsIHVwZGF0ZXMpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGDmm7TmlrDphY3nva7lpLHotKU6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGFzeW5jIGRlbGV0ZVRvb2xDb25maWd1cmF0aW9uKGNvbmZpZ0lkOiBzdHJpbmcpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICB0b29sTWFuYWdlci5kZWxldGVDb25maWd1cmF0aW9uKGNvbmZpZ0lkKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGDliKDpmaTphY3nva7lpLHotKU6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGFzeW5jIHNldEN1cnJlbnRUb29sQ29uZmlndXJhdGlvbihjb25maWdJZDogc3RyaW5nKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgdG9vbE1hbmFnZXIuc2V0Q3VycmVudENvbmZpZ3VyYXRpb24oY29uZmlnSWQpO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYOiuvue9ruW9k+WJjemFjee9ruWksei0pTogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgYXN5bmMgdXBkYXRlVG9vbFN0YXR1cyhjYXRlZ29yeTogc3RyaW5nLCB0b29sTmFtZTogc3RyaW5nLCBlbmFibGVkOiBib29sZWFuKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgY3VycmVudENvbmZpZyA9IHRvb2xNYW5hZ2VyLmdldEN1cnJlbnRDb25maWd1cmF0aW9uKCk7XHJcbiAgICAgICAgICAgIGlmICghY3VycmVudENvbmZpZykge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCfmsqHmnInlvZPliY3phY3nva4nKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgdG9vbE1hbmFnZXIudXBkYXRlVG9vbFN0YXR1cyhjdXJyZW50Q29uZmlnLmlkLCBjYXRlZ29yeSwgdG9vbE5hbWUsIGVuYWJsZWQpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g5pu05pawTUNQ5pyN5Yqh5Zmo55qE5bel5YW35YiX6KGoXHJcbiAgICAgICAgICAgIGlmIChtY3BTZXJ2ZXIpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGVuYWJsZWRUb29scyA9IHRvb2xNYW5hZ2VyLmdldEVuYWJsZWRUb29scygpO1xyXG4gICAgICAgICAgICAgICAgbWNwU2VydmVyLnVwZGF0ZUVuYWJsZWRUb29scyhlbmFibGVkVG9vbHMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYOabtOaWsOW3peWFt+eKtuaAgeWksei0pTogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgYXN5bmMgdXBkYXRlVG9vbFN0YXR1c0JhdGNoKHVwZGF0ZXM6IGFueVtdKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYFtNYWluXSB1cGRhdGVUb29sU3RhdHVzQmF0Y2ggY2FsbGVkIHdpdGggdXBkYXRlcyBjb3VudDpgLCB1cGRhdGVzID8gdXBkYXRlcy5sZW5ndGggOiAwKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRDb25maWcgPSB0b29sTWFuYWdlci5nZXRDdXJyZW50Q29uZmlndXJhdGlvbigpO1xyXG4gICAgICAgICAgICBpZiAoIWN1cnJlbnRDb25maWcpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcign5rKh5pyJ5b2T5YmN6YWN572uJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHRvb2xNYW5hZ2VyLnVwZGF0ZVRvb2xTdGF0dXNCYXRjaChjdXJyZW50Q29uZmlnLmlkLCB1cGRhdGVzKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOabtOaWsE1DUOacjeWKoeWZqOeahOW3peWFt+WIl+ihqFxyXG4gICAgICAgICAgICBpZiAobWNwU2VydmVyKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBlbmFibGVkVG9vbHMgPSB0b29sTWFuYWdlci5nZXRFbmFibGVkVG9vbHMoKTtcclxuICAgICAgICAgICAgICAgIG1jcFNlcnZlci51cGRhdGVFbmFibGVkVG9vbHMoZW5hYmxlZFRvb2xzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGDmibnph4/mm7TmlrDlt6XlhbfnirbmgIHlpLHotKU6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGFzeW5jIGV4cG9ydFRvb2xDb25maWd1cmF0aW9uKGNvbmZpZ0lkOiBzdHJpbmcpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBjb25maWdKc29uOiB0b29sTWFuYWdlci5leHBvcnRDb25maWd1cmF0aW9uKGNvbmZpZ0lkKSB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGDlr7zlh7rphY3nva7lpLHotKU6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGFzeW5jIGltcG9ydFRvb2xDb25maWd1cmF0aW9uKGNvbmZpZ0pzb246IHN0cmluZykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0b29sTWFuYWdlci5pbXBvcnRDb25maWd1cmF0aW9uKGNvbmZpZ0pzb24pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGDlr7zlhaXphY3nva7lpLHotKU6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGFzeW5jIGdldEVuYWJsZWRUb29scygpIHtcclxuICAgICAgICByZXR1cm4gdG9vbE1hbmFnZXIuZ2V0RW5hYmxlZFRvb2xzKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICog54Ot6YeN6L29IE1DUCDmnI3liqHlmajkuLvov5vnqIvku6PnoIHjgIJcclxuICAgICAqIOa1geeoizpzdG9wIOaXpyA6MzAwMCDihpIg5riFIGRpc3Qg5a2Q5qih5Z2XIHJlcXVpcmUuY2FjaGUg4oaSIOWKqOaAgSByZXF1aXJlIOaWsOWunuS+iyDihpIgc3RhcnTjgIJcclxuICAgICAqIOS9vyB0b29scy8q44CBY29tcGF044CBbWNwLXNlcnZlci50c+OAgXNldHRpbmdzLnRzIOaUueWKqOWFjemHjeWQr+e8lui+keWZqOeUn+aViOOAglxyXG4gICAgICog6ZmQ5Yi2Om1haW4udHMg6Ieq6Lqr5pS55Yqo6ZyA6YeN5ZCv57yW6L6R5ZmoKOatpOaWueazleWcqCBtYWluLnRzIOWGhSnjgIJcclxuICAgICAqIOe7jyBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdjb2Nvcy1tY3Atc2VydmVyJywgJ3JlbG9hZC1tY3Atc2VydmVyJykg6LCD55So44CCXHJcbiAgICAgKi9cclxuICAgIGFzeW5jIHJlbG9hZE1jcFNlcnZlcigpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAvLyAxLiDlgZzml6dcclxuICAgICAgICAgICAgaWYgKG1jcFNlcnZlcikge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHsgbWNwU2VydmVyLnN0b3AoKTsgfSBjYXRjaCB7IC8qIGlnbm9yZSAqLyB9XHJcbiAgICAgICAgICAgICAgICBtY3BTZXJ2ZXIgPSBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIDIuIOa4hSBkaXN0IOWtkOaooeWdlyBjYWNoZSjkuI3lkKsgbWFpbi5qcyDoh6rouqspXHJcbiAgICAgICAgICAgIGNvbnN0IGRpc3REaXIgPSBfX2Rpcm5hbWU7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgayBvZiBPYmplY3Qua2V5cyhyZXF1aXJlLmNhY2hlKSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGsuc3RhcnRzV2l0aChkaXN0RGlyKSAmJiAhay5lbmRzV2l0aCgnbWFpbi5qcycpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHsgZGVsZXRlIHJlcXVpcmUuY2FjaGVba107IH0gY2F0Y2ggeyAvKiBpZ25vcmUgKi8gfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIDMuIOWKqOaAgSByZXF1aXJlIOaWsOWunuS+i1xyXG4gICAgICAgICAgICBjb25zdCB7IFRvb2xNYW5hZ2VyIH0gPSByZXF1aXJlKCcuL3Rvb2xzL3Rvb2wtbWFuYWdlcicpO1xyXG4gICAgICAgICAgICBjb25zdCB7IE1DUFNlcnZlciB9ID0gcmVxdWlyZSgnLi9tY3Atc2VydmVyJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgcmVhZFNldHRpbmdzIH0gPSByZXF1aXJlKCcuL3NldHRpbmdzJyk7XHJcbiAgICAgICAgICAgIHRvb2xNYW5hZ2VyID0gbmV3IFRvb2xNYW5hZ2VyKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHNldHRpbmdzID0gcmVhZFNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHNlcnZlciA9IG5ldyBNQ1BTZXJ2ZXIoc2V0dGluZ3MpO1xyXG4gICAgICAgICAgICBtY3BTZXJ2ZXIgPSBzZXJ2ZXI7XHJcbiAgICAgICAgICAgIHNlcnZlci51cGRhdGVFbmFibGVkVG9vbHModG9vbE1hbmFnZXIuZ2V0RW5hYmxlZFRvb2xzKCkpO1xyXG4gICAgICAgICAgICAvLyA0LiDlp4vnu4jlkK/liqgo5LiN5Y+XIGF1dG9TdGFydCDpmZDliLYs54Ot6YeN6L295Zy65pmv5b+F6aG76YeN5ZCvIDozMDAwKVxyXG4gICAgICAgICAgICBhd2FpdCBzZXJ2ZXIuc3RhcnQoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogJ01DUCBzZXJ2ZXIgaG90LXJlbG9hZGVkIHdpdGggZnJlc2ggY29kZScsIHRvb2xDb3VudDogdG9vbE1hbmFnZXIuZ2V0RW5hYmxlZFRvb2xzKCkubGVuZ3RoIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZT8ubWVzc2FnZSB8fCBTdHJpbmcoZSksIHN0YWNrOiBlPy5zdGFjayB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBAZW4gTWV0aG9kIFRyaWdnZXJlZCBvbiBFeHRlbnNpb24gU3RhcnR1cFxyXG4gKiBAemgg5omp5bGV5ZCv5Yqo5pe26Kem5Y+R55qE5pa55rOVXHJcbiAqXHJcbiAqIOS4u+i/m+eoi+eDremHjei9veetlueVpTrmr4/mrKEgbG9hZCgpIOa4hSBkaXN0IOS4i+WtkOaooeWdlyByZXF1aXJlLmNhY2hlKOS4jeWQqyBtYWluLmpzIOiHqui6qyksXHJcbiAqIOWGjeeUqOWKqOaAgSByZXF1aXJlIOWPliBUb29sTWFuYWdlci9NQ1BTZXJ2ZXIvcmVhZFNldHRpbmdzIOeahOaWsOWunuS+i+OAglxyXG4gKiDov5nmoLcgZXh0ZW5zaW9uOnJlbG9hZCDlkI4s5Li76L+b56iL5Luj56CBKHRvb2xzLyrjgIFtY3Atc2VydmVy44CBY29tcGF044CBc2V0dGluZ3Mp55yf5pu/5o2i44CCXHJcbiAqIOmZkOWItjptYWluLnRzIOiHqui6q+aUueWKqOS7jemcgOmHjeWQr+e8lui+keWZqCjlroPnlLEgQ29jb3Mg6aG25bGCIHJlcXVpcmUs5LiN6LWwIGxvYWQoKSDlhoXliqjmgIHot6/lvoQp44CCXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbG9hZCgpIHtcclxuICAgIGNvbnNvbGUubG9nKCdDb2NvcyBNQ1AgU2VydmVyIGV4dGVuc2lvbiBsb2FkZWQnKTtcclxuXHJcbiAgICBjb25zdCBkaXN0RGlyID0gX19kaXJuYW1lO1xyXG4gICAgLy8g5riFIGRpc3Qg5LiL5omA5pyJ5a2Q5qih5Z2XIGNhY2hlKOWQqyBtY3Atc2VydmVyLnRz44CBdG9vbHMvKuOAgXV0aWxzLyrjgIFzZXR0aW5ncy50cyksXHJcbiAgICAvLyDkuI3lkKsgbWFpbi5qcyDoh6rouqso6YG/5YWNIGxvYWQoKSDmiafooYzkuK3oh6rliKDlvJXotbflvILluLgpXHJcbiAgICB0cnkge1xyXG4gICAgICAgIGZvciAoY29uc3QgayBvZiBPYmplY3Qua2V5cyhyZXF1aXJlLmNhY2hlKSkge1xyXG4gICAgICAgICAgICBpZiAoay5zdGFydHNXaXRoKGRpc3REaXIpICYmICFrLmVuZHNXaXRoKCdtYWluLmpzJykpIHtcclxuICAgICAgICAgICAgICAgIHRyeSB7IGRlbGV0ZSByZXF1aXJlLmNhY2hlW2tdOyB9IGNhdGNoIHsgLyogaWdub3JlICovIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0gY2F0Y2ggeyAvKiBpZ25vcmUgKi8gfVxyXG5cclxuICAgIC8vIOWKqOaAgSByZXF1aXJlIOWPluaWsOWunuS+iyhjbGVhciDlkI7lv4XkuLrmnIDmlrDku6PnoIEpXHJcbiAgICBjb25zdCB7IFRvb2xNYW5hZ2VyIH0gPSByZXF1aXJlKCcuL3Rvb2xzL3Rvb2wtbWFuYWdlcicpO1xyXG4gICAgY29uc3QgeyBNQ1BTZXJ2ZXIgfSA9IHJlcXVpcmUoJy4vbWNwLXNlcnZlcicpO1xyXG4gICAgY29uc3QgeyByZWFkU2V0dGluZ3MgfSA9IHJlcXVpcmUoJy4vc2V0dGluZ3MnKTtcclxuXHJcbiAgICAvLyDliJ3lp4vljJblt6XlhbfnrqHnkIblmahcclxuICAgIHRvb2xNYW5hZ2VyID0gbmV3IFRvb2xNYW5hZ2VyKCk7XHJcblxyXG4gICAgLy8g6K+75Y+W6K6+572uXHJcbiAgICBjb25zdCBzZXR0aW5ncyA9IHJlYWRTZXR0aW5ncygpO1xyXG4gICAgY29uc3Qgc2VydmVyID0gbmV3IE1DUFNlcnZlcihzZXR0aW5ncyk7XHJcbiAgICBtY3BTZXJ2ZXIgPSBzZXJ2ZXI7XHJcblxyXG4gICAgLy8g5Yid5aeL5YyWTUNQ5pyN5Yqh5Zmo55qE5bel5YW35YiX6KGoXHJcbiAgICBjb25zdCBlbmFibGVkVG9vbHMgPSB0b29sTWFuYWdlci5nZXRFbmFibGVkVG9vbHMoKTtcclxuICAgIHNlcnZlci51cGRhdGVFbmFibGVkVG9vbHMoZW5hYmxlZFRvb2xzKTtcclxuXHJcbiAgICAvLyDlpoLmnpzorr7nva7kuoboh6rliqjlkK/liqjvvIzliJnlkK/liqjmnI3liqHlmahcclxuICAgIGlmIChzZXR0aW5ncy5hdXRvU3RhcnQpIHtcclxuICAgICAgICBzZXJ2ZXIuc3RhcnQoKS5jYXRjaCgoZXJyOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGF1dG8tc3RhcnQgTUNQIHNlcnZlcjonLCBlcnIpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogQGVuIE1ldGhvZCB0cmlnZ2VyZWQgd2hlbiB1bmluc3RhbGxpbmcgdGhlIGV4dGVuc2lvblxyXG4gKiBAemgg5Y246L295omp5bGV5pe26Kem5Y+R55qE5pa55rOVXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gdW5sb2FkKCkge1xyXG4gICAgaWYgKG1jcFNlcnZlcikge1xyXG4gICAgICAgIG1jcFNlcnZlci5zdG9wKCk7XHJcbiAgICAgICAgbWNwU2VydmVyID0gbnVsbDtcclxuICAgIH1cclxufSJdfQ==