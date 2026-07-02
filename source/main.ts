import { MCPServer } from './mcp-server';
import { readSettings, saveSettings } from './settings';
import { MCPServerSettings } from './types';
import { ToolManager } from './tools/tool-manager';

let mcpServer: MCPServer | null = null;
let toolManager: ToolManager;

/**
 * @en Registration method for the main process of Extension
 * @zh 为扩展的主进程的注册方法
 */
export const methods: { [key: string]: (...any: any) => any } = {
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
        } else {
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
        } else {
            console.warn('[MCP插件] mcpServer 未初始化');
        }
    },

    /**
     * @en Get server status
     * @zh 获取服务器状态
     */
    getServerStatus() {
        const status = mcpServer ? mcpServer.getStatus() : { running: false, port: 0, clients: 0 };
        const settings = mcpServer ? mcpServer.getSettings() : readSettings();
        return {
            ...status,
            settings: settings
        };
    },

    /**
     * @en Update server settings
     * @zh 更新服务器设置
     */
    updateSettings(settings: MCPServerSettings) {
        saveSettings(settings);
        if (mcpServer) {
            mcpServer.stop();
            mcpServer = new MCPServer(settings);
            mcpServer.start();
        } else {
            mcpServer = new MCPServer(settings);
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
        if (!mcpServer) return [];
        
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
        return mcpServer ? mcpServer.getSettings() : readSettings();
    },

    /**
     * @en Get server settings (alternative method)
     * @zh 获取服务器设置（替代方法）
     */
    async getSettings() {
        return mcpServer ? mcpServer.getSettings() : readSettings();
    },

    // 工具管理器相关方法
    async getToolManagerState() {
        return toolManager.getToolManagerState();
    },

    async createToolConfiguration(name: string, description?: string) {
        try {
            const config = toolManager.createConfiguration(name, description);
            return { success: true, id: config.id, config };
        } catch (error: any) {
            throw new Error(`创建配置失败: ${error.message}`);
        }
    },

    async updateToolConfiguration(configId: string, updates: any) {
        try {
            return toolManager.updateConfiguration(configId, updates);
        } catch (error: any) {
            throw new Error(`更新配置失败: ${error.message}`);
        }
    },

    async deleteToolConfiguration(configId: string) {
        try {
            toolManager.deleteConfiguration(configId);
            return { success: true };
        } catch (error: any) {
            throw new Error(`删除配置失败: ${error.message}`);
        }
    },

    async setCurrentToolConfiguration(configId: string) {
        try {
            toolManager.setCurrentConfiguration(configId);
            return { success: true };
        } catch (error: any) {
            throw new Error(`设置当前配置失败: ${error.message}`);
        }
    },

    async updateToolStatus(category: string, toolName: string, enabled: boolean) {
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
        } catch (error: any) {
            throw new Error(`更新工具状态失败: ${error.message}`);
        }
    },

    async updateToolStatusBatch(updates: any[]) {
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
        } catch (error: any) {
            throw new Error(`批量更新工具状态失败: ${error.message}`);
        }
    },

    async exportToolConfiguration(configId: string) {
        try {
            return { configJson: toolManager.exportConfiguration(configId) };
        } catch (error: any) {
            throw new Error(`导出配置失败: ${error.message}`);
        }
    },

    async importToolConfiguration(configJson: string) {
        try {
            return toolManager.importConfiguration(configJson);
        } catch (error: any) {
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
                try { mcpServer.stop(); } catch { /* ignore */ }
                mcpServer = null;
            }
            // 2. 清 dist 子模块 cache(不含 main.js 自身)
            const distDir = __dirname;
            for (const k of Object.keys(require.cache)) {
                if (k.startsWith(distDir) && !k.endsWith('main.js')) {
                    try { delete require.cache[k]; } catch { /* ignore */ }
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
        } catch (e: any) {
            return { success: false, error: e?.message || String(e), stack: e?.stack };
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
export function load() {
    console.log('Cocos MCP Server extension loaded');

    const distDir = __dirname;
    // 清 dist 下所有子模块 cache(含 mcp-server.ts、tools/*、utils/*、settings.ts),
    // 不含 main.js 自身(避免 load() 执行中自删引起异常)
    try {
        for (const k of Object.keys(require.cache)) {
            if (k.startsWith(distDir) && !k.endsWith('main.js')) {
                try { delete require.cache[k]; } catch { /* ignore */ }
            }
        }
    } catch { /* ignore */ }

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
        server.start().catch((err: any) => {
            console.error('Failed to auto-start MCP server:', err);
        });
    }
}

/**
 * @en Method triggered when uninstalling the extension
 * @zh 卸载扩展时触发的方法
 */
export function unload() {
    if (mcpServer) {
        mcpServer.stop();
        mcpServer = null;
    }
}