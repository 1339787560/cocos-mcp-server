"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolManager = void 0;
const uuid_1 = require("uuid");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ToolManager {
    constructor() {
        this.availableTools = [];
        this.settings = this.readToolManagerSettings();
        this.initializeAvailableTools();
        // 如果没有配置，自动创建一个默认配置
        if (this.settings.configurations.length === 0) {
            console.log('[ToolManager] No configurations found, creating default configuration...');
            this.createConfiguration('默认配置', '自动创建的默认工具配置');
        }
        // 把代码中新增的工具(availableTools 有、但各配置 tools 里没有的)合并进每个配置。
        // 解决:扩展升级新增工具后,saved 配置仍是旧集 → 新工具永不启用(getEnabledTools 只看配置)。
        this.mergeNewToolsIntoConfigs();
    }
    /**
     * 把 availableTools 中、但配置 tools 中缺失的工具补进每个配置(默认 enabled)。
     * 这样扩展新增工具后无需用户手动到面板开启,立即可用。
     */
    mergeNewToolsIntoConfigs() {
        let addedTotal = 0;
        for (const config of this.settings.configurations) {
            const existingKeys = new Set(config.tools.map(t => `${t.category}/${t.name}`));
            const toAdd = this.availableTools.filter(at => !existingKeys.has(`${at.category}/${at.name}`));
            for (const at of toAdd) {
                config.tools.push({
                    category: at.category,
                    name: at.name,
                    enabled: true,
                    description: at.description,
                    versionRequirement: at.versionRequirement
                });
            }
            addedTotal += toAdd.length;
        }
        if (addedTotal > 0) {
            console.log(`[ToolManager] Merged ${addedTotal} new tool(s) into configurations`);
            this.saveSettings();
        }
    }
    getToolManagerSettingsPath() {
        return path.join(Editor.Project.path, 'settings', 'tool-manager.json');
    }
    ensureSettingsDir() {
        const settingsDir = path.dirname(this.getToolManagerSettingsPath());
        if (!fs.existsSync(settingsDir)) {
            fs.mkdirSync(settingsDir, { recursive: true });
        }
    }
    readToolManagerSettings() {
        const DEFAULT_TOOL_MANAGER_SETTINGS = {
            configurations: [],
            currentConfigId: '',
            maxConfigSlots: 5
        };
        try {
            this.ensureSettingsDir();
            const settingsFile = this.getToolManagerSettingsPath();
            if (fs.existsSync(settingsFile)) {
                const content = fs.readFileSync(settingsFile, 'utf8');
                return Object.assign(Object.assign({}, DEFAULT_TOOL_MANAGER_SETTINGS), JSON.parse(content));
            }
        }
        catch (e) {
            console.error('Failed to read tool manager settings:', e);
        }
        return DEFAULT_TOOL_MANAGER_SETTINGS;
    }
    saveToolManagerSettings(settings) {
        try {
            this.ensureSettingsDir();
            const settingsFile = this.getToolManagerSettingsPath();
            fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
        }
        catch (e) {
            console.error('Failed to save tool manager settings:', e);
            throw e;
        }
    }
    exportToolConfiguration(config) {
        return JSON.stringify(config, null, 2);
    }
    importToolConfiguration(configJson) {
        try {
            const config = JSON.parse(configJson);
            // 验证配置格式
            if (!config.id || !config.name || !Array.isArray(config.tools)) {
                throw new Error('Invalid configuration format');
            }
            return config;
        }
        catch (e) {
            console.error('Failed to parse tool configuration:', e);
            throw new Error('Invalid JSON format or configuration structure');
        }
    }
    initializeAvailableTools() {
        // 从MCP服务器获取真实的工具列表
        try {
            // 导入所有工具类
            const { SceneTools } = require('./scene-tools');
            const { NodeTools } = require('./node-tools');
            const { ComponentTools } = require('./component-tools');
            const { PrefabTools } = require('./prefab-tools');
            const { ProjectTools } = require('./project-tools');
            const { DebugTools } = require('./debug-tools');
            const { PreferencesTools } = require('./preferences-tools');
            const { ServerTools } = require('./server-tools');
            const { BroadcastTools } = require('./broadcast-tools');
            const { SceneAdvancedTools } = require('./scene-advanced-tools');
            const { SceneViewTools } = require('./scene-view-tools');
            const { ReferenceImageTools } = require('./reference-image-tools');
            const { AssetAdvancedTools } = require('./asset-advanced-tools');
            const { ValidationTools } = require('./validation-tools');
            // 初始化工具实例
            const tools = {
                scene: new SceneTools(),
                node: new NodeTools(),
                component: new ComponentTools(),
                prefab: new PrefabTools(),
                project: new ProjectTools(),
                debug: new DebugTools(),
                preferences: new PreferencesTools(),
                server: new ServerTools(),
                broadcast: new BroadcastTools(),
                sceneAdvanced: new SceneAdvancedTools(),
                sceneView: new SceneViewTools(),
                referenceImage: new ReferenceImageTools(),
                assetAdvanced: new AssetAdvancedTools(),
                validation: new ValidationTools()
            };
            // 从每个工具类获取工具列表
            this.availableTools = [];
            for (const [category, toolSet] of Object.entries(tools)) {
                const toolDefinitions = toolSet.getTools();
                toolDefinitions.forEach((tool) => {
                    // 根据工具类别设置版本要求
                    let versionRequirement;
                    if (category === 'referenceImage') {
                        versionRequirement = '3.8.2';
                    }
                    else if (category === 'sceneAdvanced') {
                        // 部分高级场景工具需要 3.8.6+
                        const advancedTools386 = [
                            'reset_node_property', 'move_array_element', 'remove_array_element',
                            'restore_prefab', 'execute_component_method',
                            'query_scene_classes', 'query_scene_components',
                            'query_component_has_script', 'query_nodes_by_asset_uuid'
                        ];
                        if (advancedTools386.includes(tool.name)) {
                            versionRequirement = '3.8.6';
                        }
                    }
                    this.availableTools.push({
                        category: category,
                        name: tool.name,
                        enabled: true, // 默认启用
                        description: tool.description,
                        versionRequirement: versionRequirement
                    });
                });
            }
            console.log(`[ToolManager] Initialized ${this.availableTools.length} tools from MCP server`);
        }
        catch (error) {
            console.error('[ToolManager] Failed to initialize tools from MCP server:', error);
            // 如果获取失败，使用默认工具列表作为后备
            this.initializeDefaultTools();
        }
    }
    initializeDefaultTools() {
        // 默认工具列表作为后备方案
        const toolCategories = [
            { category: 'scene', name: '场景工具', tools: [
                    { name: 'getCurrentSceneInfo', description: '获取当前场景信息' },
                    { name: 'getSceneHierarchy', description: '获取场景层级结构' },
                    { name: 'createNewScene', description: '创建新场景' },
                    { name: 'saveScene', description: '保存场景' },
                    { name: 'loadScene', description: '加载场景' }
                ] },
            { category: 'node', name: '节点工具', tools: [
                    { name: 'getAllNodes', description: '获取所有节点' },
                    { name: 'findNodeByName', description: '根据名称查找节点' },
                    { name: 'createNode', description: '创建节点' },
                    { name: 'deleteNode', description: '删除节点' },
                    { name: 'setNodeProperty', description: '设置节点属性' },
                    { name: 'getNodeInfo', description: '获取节点信息' }
                ] },
            { category: 'component', name: '组件工具', tools: [
                    { name: 'addComponentToNode', description: '添加组件到节点' },
                    { name: 'removeComponentFromNode', description: '从节点移除组件' },
                    { name: 'setComponentProperty', description: '设置组件属性' },
                    { name: 'getComponentInfo', description: '获取组件信息' }
                ] },
            { category: 'prefab', name: '预制体工具', tools: [
                    { name: 'createPrefabFromNode', description: '从节点创建预制体' },
                    { name: 'instantiatePrefab', description: '实例化预制体' },
                    { name: 'getPrefabInfo', description: '获取预制体信息' },
                    { name: 'savePrefab', description: '保存预制体' }
                ] },
            { category: 'project', name: '项目工具', tools: [
                    { name: 'getProjectInfo', description: '获取项目信息' },
                    { name: 'getAssetList', description: '获取资源列表' },
                    { name: 'createAsset', description: '创建资源' },
                    { name: 'deleteAsset', description: '删除资源' }
                ] },
            { category: 'debug', name: '调试工具', tools: [
                    { name: 'getConsoleLogs', description: '获取控制台日志' },
                    { name: 'getPerformanceStats', description: '获取性能统计' },
                    { name: 'validateScene', description: '验证场景' },
                    { name: 'getErrorLogs', description: '获取错误日志' }
                ] },
            { category: 'preferences', name: '偏好设置工具', tools: [
                    { name: 'getPreferences', description: '获取偏好设置' },
                    { name: 'setPreferences', description: '设置偏好设置' },
                    { name: 'resetPreferences', description: '重置偏好设置' }
                ] },
            { category: 'server', name: '服务器工具', tools: [
                    { name: 'getServerStatus', description: '获取服务器状态' },
                    { name: 'getConnectedClients', description: '获取连接的客户端' },
                    { name: 'getServerLogs', description: '获取服务器日志' }
                ] },
            { category: 'broadcast', name: '广播工具', tools: [
                    { name: 'broadcastMessage', description: '广播消息' },
                    { name: 'getBroadcastHistory', description: '获取广播历史' }
                ] },
            { category: 'sceneAdvanced', name: '高级场景工具', tools: [
                    { name: 'optimizeScene', description: '优化场景' },
                    { name: 'analyzeScene', description: '分析场景' },
                    { name: 'batchOperation', description: '批量操作' }
                ] },
            { category: 'sceneView', name: '场景视图工具', tools: [
                    { name: 'getViewportInfo', description: '获取视口信息' },
                    { name: 'setViewportCamera', description: '设置视口相机' },
                    { name: 'focusOnNode', description: '聚焦到节点' }
                ] },
            { category: 'referenceImage', name: '参考图片工具', tools: [
                    { name: 'addReferenceImage', description: '添加参考图片' },
                    { name: 'removeReferenceImage', description: '移除参考图片' },
                    { name: 'getReferenceImages', description: '获取参考图片列表' }
                ] },
            { category: 'assetAdvanced', name: '高级资源工具', tools: [
                    { name: 'importAsset', description: '导入资源' },
                    { name: 'exportAsset', description: '导出资源' },
                    { name: 'processAsset', description: '处理资源' }
                ] },
            { category: 'validation', name: '验证工具', tools: [
                    { name: 'validateProject', description: '验证项目' },
                    { name: 'validateAssets', description: '验证资源' },
                    { name: 'generateReport', description: '生成报告' }
                ] }
        ];
        this.availableTools = [];
        toolCategories.forEach(category => {
            category.tools.forEach(tool => {
                this.availableTools.push({
                    category: category.category,
                    name: tool.name,
                    enabled: true, // 默认启用
                    description: tool.description
                });
            });
        });
        console.log(`[ToolManager] Initialized ${this.availableTools.length} default tools`);
    }
    getAvailableTools() {
        return [...this.availableTools];
    }
    getConfigurations() {
        return [...this.settings.configurations];
    }
    getCurrentConfiguration() {
        if (!this.settings.currentConfigId) {
            return null;
        }
        return this.settings.configurations.find(config => config.id === this.settings.currentConfigId) || null;
    }
    createConfiguration(name, description) {
        if (this.settings.configurations.length >= this.settings.maxConfigSlots) {
            throw new Error(`已达到最大配置槽位数量 (${this.settings.maxConfigSlots})`);
        }
        const config = {
            id: (0, uuid_1.v4)(),
            name,
            description,
            tools: this.availableTools.map(tool => (Object.assign({}, tool))),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.settings.configurations.push(config);
        this.settings.currentConfigId = config.id;
        this.saveSettings();
        return config;
    }
    updateConfiguration(configId, updates) {
        const configIndex = this.settings.configurations.findIndex(config => config.id === configId);
        if (configIndex === -1) {
            throw new Error('配置不存在');
        }
        const config = this.settings.configurations[configIndex];
        const updatedConfig = Object.assign(Object.assign(Object.assign({}, config), updates), { updatedAt: new Date().toISOString() });
        this.settings.configurations[configIndex] = updatedConfig;
        this.saveSettings();
        return updatedConfig;
    }
    deleteConfiguration(configId) {
        const configIndex = this.settings.configurations.findIndex(config => config.id === configId);
        if (configIndex === -1) {
            throw new Error('配置不存在');
        }
        this.settings.configurations.splice(configIndex, 1);
        // 如果删除的是当前配置，清空当前配置ID
        if (this.settings.currentConfigId === configId) {
            this.settings.currentConfigId = this.settings.configurations.length > 0
                ? this.settings.configurations[0].id
                : '';
        }
        this.saveSettings();
    }
    setCurrentConfiguration(configId) {
        const config = this.settings.configurations.find(config => config.id === configId);
        if (!config) {
            throw new Error('配置不存在');
        }
        this.settings.currentConfigId = configId;
        this.saveSettings();
    }
    updateToolStatus(configId, category, toolName, enabled) {
        console.log(`Backend: Updating tool status - configId: ${configId}, category: ${category}, toolName: ${toolName}, enabled: ${enabled}`);
        const config = this.settings.configurations.find(config => config.id === configId);
        if (!config) {
            console.error(`Backend: Config not found with ID: ${configId}`);
            throw new Error('配置不存在');
        }
        console.log(`Backend: Found config: ${config.name}`);
        const tool = config.tools.find(t => t.category === category && t.name === toolName);
        if (!tool) {
            console.error(`Backend: Tool not found - category: ${category}, name: ${toolName}`);
            throw new Error('工具不存在');
        }
        console.log(`Backend: Found tool: ${tool.name}, current enabled: ${tool.enabled}, new enabled: ${enabled}`);
        tool.enabled = enabled;
        config.updatedAt = new Date().toISOString();
        console.log(`Backend: Tool updated, saving settings...`);
        this.saveSettings();
        console.log(`Backend: Settings saved successfully`);
    }
    updateToolStatusBatch(configId, updates) {
        console.log(`Backend: updateToolStatusBatch called with configId: ${configId}`);
        console.log(`Backend: Current configurations count: ${this.settings.configurations.length}`);
        console.log(`Backend: Current config IDs:`, this.settings.configurations.map(c => c.id));
        const config = this.settings.configurations.find(config => config.id === configId);
        if (!config) {
            console.error(`Backend: Config not found with ID: ${configId}`);
            console.error(`Backend: Available config IDs:`, this.settings.configurations.map(c => c.id));
            throw new Error('配置不存在');
        }
        console.log(`Backend: Found config: ${config.name}, updating ${updates.length} tools`);
        updates.forEach(update => {
            const tool = config.tools.find(t => t.category === update.category && t.name === update.name);
            if (tool) {
                tool.enabled = update.enabled;
            }
        });
        config.updatedAt = new Date().toISOString();
        this.saveSettings();
        console.log(`Backend: Batch update completed successfully`);
    }
    exportConfiguration(configId) {
        const config = this.settings.configurations.find(config => config.id === configId);
        if (!config) {
            throw new Error('配置不存在');
        }
        return this.exportToolConfiguration(config);
    }
    importConfiguration(configJson) {
        const config = this.importToolConfiguration(configJson);
        // 生成新的ID和时间戳
        config.id = (0, uuid_1.v4)();
        config.createdAt = new Date().toISOString();
        config.updatedAt = new Date().toISOString();
        if (this.settings.configurations.length >= this.settings.maxConfigSlots) {
            throw new Error(`已达到最大配置槽位数量 (${this.settings.maxConfigSlots})`);
        }
        this.settings.configurations.push(config);
        this.saveSettings();
        return config;
    }
    getEnabledTools() {
        const currentConfig = this.getCurrentConfiguration();
        if (!currentConfig) {
            return this.availableTools.filter(tool => tool.enabled);
        }
        return currentConfig.tools.filter(tool => tool.enabled);
    }
    getToolManagerState() {
        const currentConfig = this.getCurrentConfiguration();
        return {
            success: true,
            availableTools: currentConfig ? currentConfig.tools : this.getAvailableTools(),
            selectedConfigId: this.settings.currentConfigId,
            configurations: this.getConfigurations(),
            maxConfigSlots: this.settings.maxConfigSlots
        };
    }
    saveSettings() {
        console.log(`Backend: Saving settings, current configs count: ${this.settings.configurations.length}`);
        this.saveToolManagerSettings(this.settings);
        console.log(`Backend: Settings saved to file`);
    }
}
exports.ToolManager = ToolManager;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbC1tYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL3Rvb2wtbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQUFvQztBQUVwQyx1Q0FBeUI7QUFDekIsMkNBQTZCO0FBRTdCLE1BQWEsV0FBVztJQUlwQjtRQUZRLG1CQUFjLEdBQWlCLEVBQUUsQ0FBQztRQUd0QyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1FBQy9DLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1FBRWhDLG9CQUFvQjtRQUNwQixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM1QyxPQUFPLENBQUMsR0FBRyxDQUFDLDBFQUEwRSxDQUFDLENBQUM7WUFDeEYsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxhQUFhLENBQUMsQ0FBQztRQUNwRCxDQUFDO1FBRUQsc0RBQXNEO1FBQ3RELDZEQUE2RDtRQUM3RCxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztJQUNwQyxDQUFDO0lBRUQ7OztPQUdHO0lBQ0ssd0JBQXdCO1FBQzVCLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQztRQUNuQixLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDaEQsTUFBTSxZQUFZLEdBQUcsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMvRSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENB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bWRDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdjQgYXMgdXVpZHY0IH0gZnJvbSAndXVpZCc7XHJcbmltcG9ydCB7IFRvb2xDb25maWcsIFRvb2xDb25maWd1cmF0aW9uLCBUb29sTWFuYWdlclNldHRpbmdzLCBUb29sRGVmaW5pdGlvbiB9IGZyb20gJy4uL3R5cGVzJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFRvb2xNYW5hZ2VyIHtcclxuICAgIHByaXZhdGUgc2V0dGluZ3M6IFRvb2xNYW5hZ2VyU2V0dGluZ3M7XHJcbiAgICBwcml2YXRlIGF2YWlsYWJsZVRvb2xzOiBUb29sQ29uZmlnW10gPSBbXTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLnNldHRpbmdzID0gdGhpcy5yZWFkVG9vbE1hbmFnZXJTZXR0aW5ncygpO1xyXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUF2YWlsYWJsZVRvb2xzKCk7XHJcblxyXG4gICAgICAgIC8vIOWmguaenOayoeaciemFjee9ru+8jOiHquWKqOWIm+W7uuS4gOS4qum7mOiupOmFjee9rlxyXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmNvbmZpZ3VyYXRpb25zLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW1Rvb2xNYW5hZ2VyXSBObyBjb25maWd1cmF0aW9ucyBmb3VuZCwgY3JlYXRpbmcgZGVmYXVsdCBjb25maWd1cmF0aW9uLi4uJyk7XHJcbiAgICAgICAgICAgIHRoaXMuY3JlYXRlQ29uZmlndXJhdGlvbign6buY6K6k6YWN572uJywgJ+iHquWKqOWIm+W7uueahOm7mOiupOW3peWFt+mFjee9ricpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8g5oqK5Luj56CB5Lit5paw5aKe55qE5bel5YW3KGF2YWlsYWJsZVRvb2xzIOacieOAgeS9huWQhOmFjee9riB0b29scyDph4zmsqHmnInnmoQp5ZCI5bm26L+b5q+P5Liq6YWN572u44CCXHJcbiAgICAgICAgLy8g6Kej5YazOuaJqeWxleWNh+e6p+aWsOWinuW3peWFt+WQjixzYXZlZCDphY3nva7ku43mmK/ml6fpm4Yg4oaSIOaWsOW3peWFt+awuOS4jeWQr+eUqChnZXRFbmFibGVkVG9vbHMg5Y+q55yL6YWN572uKeOAglxyXG4gICAgICAgIHRoaXMubWVyZ2VOZXdUb29sc0ludG9Db25maWdzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDmioogYXZhaWxhYmxlVG9vbHMg5Lit44CB5L2G6YWN572uIHRvb2xzIOS4ree8uuWkseeahOW3peWFt+ihpei/m+avj+S4qumFjee9rijpu5jorqQgZW5hYmxlZCnjgIJcclxuICAgICAqIOi/meagt+aJqeWxleaWsOWinuW3peWFt+WQjuaXoOmcgOeUqOaIt+aJi+WKqOWIsOmdouadv+W8gOWQryznq4vljbPlj6/nlKjjgIJcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBtZXJnZU5ld1Rvb2xzSW50b0NvbmZpZ3MoKTogdm9pZCB7XHJcbiAgICAgICAgbGV0IGFkZGVkVG90YWwgPSAwO1xyXG4gICAgICAgIGZvciAoY29uc3QgY29uZmlnIG9mIHRoaXMuc2V0dGluZ3MuY29uZmlndXJhdGlvbnMpIHtcclxuICAgICAgICAgICAgY29uc3QgZXhpc3RpbmdLZXlzID0gbmV3IFNldChjb25maWcudG9vbHMubWFwKHQgPT4gYCR7dC5jYXRlZ29yeX0vJHt0Lm5hbWV9YCkpO1xyXG4gICAgICAgICAgICBjb25zdCB0b0FkZCA9IHRoaXMuYXZhaWxhYmxlVG9vbHMuZmlsdGVyKGF0ID0+ICFleGlzdGluZ0tleXMuaGFzKGAke2F0LmNhdGVnb3J5fS8ke2F0Lm5hbWV9YCkpO1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGF0IG9mIHRvQWRkKSB7XHJcbiAgICAgICAgICAgICAgICBjb25maWcudG9vbHMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IGF0LmNhdGVnb3J5LFxyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGF0Lm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogYXQuZGVzY3JpcHRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgdmVyc2lvblJlcXVpcmVtZW50OiBhdC52ZXJzaW9uUmVxdWlyZW1lbnRcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGFkZGVkVG90YWwgKz0gdG9BZGQubGVuZ3RoO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoYWRkZWRUb3RhbCA+IDApIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYFtUb29sTWFuYWdlcl0gTWVyZ2VkICR7YWRkZWRUb3RhbH0gbmV3IHRvb2wocykgaW50byBjb25maWd1cmF0aW9uc2ApO1xyXG4gICAgICAgICAgICB0aGlzLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldFRvb2xNYW5hZ2VyU2V0dGluZ3NQYXRoKCk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIHBhdGguam9pbihFZGl0b3IuUHJvamVjdC5wYXRoLCAnc2V0dGluZ3MnLCAndG9vbC1tYW5hZ2VyLmpzb24nKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGVuc3VyZVNldHRpbmdzRGlyKCk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IHNldHRpbmdzRGlyID0gcGF0aC5kaXJuYW1lKHRoaXMuZ2V0VG9vbE1hbmFnZXJTZXR0aW5nc1BhdGgoKSk7XHJcbiAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHNldHRpbmdzRGlyKSkge1xyXG4gICAgICAgICAgICBmcy5ta2RpclN5bmMoc2V0dGluZ3NEaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlYWRUb29sTWFuYWdlclNldHRpbmdzKCk6IFRvb2xNYW5hZ2VyU2V0dGluZ3Mge1xyXG4gICAgICAgIGNvbnN0IERFRkFVTFRfVE9PTF9NQU5BR0VSX1NFVFRJTkdTOiBUb29sTWFuYWdlclNldHRpbmdzID0ge1xyXG4gICAgICAgICAgICBjb25maWd1cmF0aW9uczogW10sXHJcbiAgICAgICAgICAgIGN1cnJlbnRDb25maWdJZDogJycsXHJcbiAgICAgICAgICAgIG1heENvbmZpZ1Nsb3RzOiA1XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgdGhpcy5lbnN1cmVTZXR0aW5nc0RpcigpO1xyXG4gICAgICAgICAgICBjb25zdCBzZXR0aW5nc0ZpbGUgPSB0aGlzLmdldFRvb2xNYW5hZ2VyU2V0dGluZ3NQYXRoKCk7XHJcbiAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHNldHRpbmdzRmlsZSkpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoc2V0dGluZ3NGaWxlLCAndXRmOCcpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgLi4uREVGQVVMVF9UT09MX01BTkFHRVJfU0VUVElOR1MsIC4uLkpTT04ucGFyc2UoY29udGVudCkgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHJlYWQgdG9vbCBtYW5hZ2VyIHNldHRpbmdzOicsIGUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gREVGQVVMVF9UT09MX01BTkFHRVJfU0VUVElOR1M7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzYXZlVG9vbE1hbmFnZXJTZXR0aW5ncyhzZXR0aW5nczogVG9vbE1hbmFnZXJTZXR0aW5ncyk6IHZvaWQge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHRoaXMuZW5zdXJlU2V0dGluZ3NEaXIoKTtcclxuICAgICAgICAgICAgY29uc3Qgc2V0dGluZ3NGaWxlID0gdGhpcy5nZXRUb29sTWFuYWdlclNldHRpbmdzUGF0aCgpO1xyXG4gICAgICAgICAgICBmcy53cml0ZUZpbGVTeW5jKHNldHRpbmdzRmlsZSwgSlNPTi5zdHJpbmdpZnkoc2V0dGluZ3MsIG51bGwsIDIpKTtcclxuICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBzYXZlIHRvb2wgbWFuYWdlciBzZXR0aW5nczonLCBlKTtcclxuICAgICAgICAgICAgdGhyb3cgZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBleHBvcnRUb29sQ29uZmlndXJhdGlvbihjb25maWc6IFRvb2xDb25maWd1cmF0aW9uKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoY29uZmlnLCBudWxsLCAyKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGltcG9ydFRvb2xDb25maWd1cmF0aW9uKGNvbmZpZ0pzb246IHN0cmluZyk6IFRvb2xDb25maWd1cmF0aW9uIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBjb25maWcgPSBKU09OLnBhcnNlKGNvbmZpZ0pzb24pO1xyXG4gICAgICAgICAgICAvLyDpqozor4HphY3nva7moLzlvI9cclxuICAgICAgICAgICAgaWYgKCFjb25maWcuaWQgfHwgIWNvbmZpZy5uYW1lIHx8ICFBcnJheS5pc0FycmF5KGNvbmZpZy50b29scykpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb25maWd1cmF0aW9uIGZvcm1hdCcpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBjb25maWc7XHJcbiAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gcGFyc2UgdG9vbCBjb25maWd1cmF0aW9uOicsIGUpO1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgSlNPTiBmb3JtYXQgb3IgY29uZmlndXJhdGlvbiBzdHJ1Y3R1cmUnKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBpbml0aWFsaXplQXZhaWxhYmxlVG9vbHMoKTogdm9pZCB7XHJcbiAgICAgICAgLy8g5LuOTUNQ5pyN5Yqh5Zmo6I635Y+W55yf5a6e55qE5bel5YW35YiX6KGoXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8g5a+85YWl5omA5pyJ5bel5YW357G7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgU2NlbmVUb29scyB9ID0gcmVxdWlyZSgnLi9zY2VuZS10b29scycpO1xyXG4gICAgICAgICAgICBjb25zdCB7IE5vZGVUb29scyB9ID0gcmVxdWlyZSgnLi9ub2RlLXRvb2xzJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgQ29tcG9uZW50VG9vbHMgfSA9IHJlcXVpcmUoJy4vY29tcG9uZW50LXRvb2xzJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgUHJlZmFiVG9vbHMgfSA9IHJlcXVpcmUoJy4vcHJlZmFiLXRvb2xzJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgUHJvamVjdFRvb2xzIH0gPSByZXF1aXJlKCcuL3Byb2plY3QtdG9vbHMnKTtcclxuICAgICAgICAgICAgY29uc3QgeyBEZWJ1Z1Rvb2xzIH0gPSByZXF1aXJlKCcuL2RlYnVnLXRvb2xzJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgUHJlZmVyZW5jZXNUb29scyB9ID0gcmVxdWlyZSgnLi9wcmVmZXJlbmNlcy10b29scycpO1xyXG4gICAgICAgICAgICBjb25zdCB7IFNlcnZlclRvb2xzIH0gPSByZXF1aXJlKCcuL3NlcnZlci10b29scycpO1xyXG4gICAgICAgICAgICBjb25zdCB7IEJyb2FkY2FzdFRvb2xzIH0gPSByZXF1aXJlKCcuL2Jyb2FkY2FzdC10b29scycpO1xyXG4gICAgICAgICAgICBjb25zdCB7IFNjZW5lQWR2YW5jZWRUb29scyB9ID0gcmVxdWlyZSgnLi9zY2VuZS1hZHZhbmNlZC10b29scycpO1xyXG4gICAgICAgICAgICBjb25zdCB7IFNjZW5lVmlld1Rvb2xzIH0gPSByZXF1aXJlKCcuL3NjZW5lLXZpZXctdG9vbHMnKTtcclxuICAgICAgICAgICAgY29uc3QgeyBSZWZlcmVuY2VJbWFnZVRvb2xzIH0gPSByZXF1aXJlKCcuL3JlZmVyZW5jZS1pbWFnZS10b29scycpO1xyXG4gICAgICAgICAgICBjb25zdCB7IEFzc2V0QWR2YW5jZWRUb29scyB9ID0gcmVxdWlyZSgnLi9hc3NldC1hZHZhbmNlZC10b29scycpO1xyXG4gICAgICAgICAgICBjb25zdCB7IFZhbGlkYXRpb25Ub29scyB9ID0gcmVxdWlyZSgnLi92YWxpZGF0aW9uLXRvb2xzJyk7XHJcblxyXG4gICAgICAgICAgICAvLyDliJ3lp4vljJblt6Xlhbflrp7kvotcclxuICAgICAgICAgICAgY29uc3QgdG9vbHMgPSB7XHJcbiAgICAgICAgICAgICAgICBzY2VuZTogbmV3IFNjZW5lVG9vbHMoKSxcclxuICAgICAgICAgICAgICAgIG5vZGU6IG5ldyBOb2RlVG9vbHMoKSxcclxuICAgICAgICAgICAgICAgIGNvbXBvbmVudDogbmV3IENvbXBvbmVudFRvb2xzKCksXHJcbiAgICAgICAgICAgICAgICBwcmVmYWI6IG5ldyBQcmVmYWJUb29scygpLFxyXG4gICAgICAgICAgICAgICAgcHJvamVjdDogbmV3IFByb2plY3RUb29scygpLFxyXG4gICAgICAgICAgICAgICAgZGVidWc6IG5ldyBEZWJ1Z1Rvb2xzKCksXHJcbiAgICAgICAgICAgICAgICBwcmVmZXJlbmNlczogbmV3IFByZWZlcmVuY2VzVG9vbHMoKSxcclxuICAgICAgICAgICAgICAgIHNlcnZlcjogbmV3IFNlcnZlclRvb2xzKCksXHJcbiAgICAgICAgICAgICAgICBicm9hZGNhc3Q6IG5ldyBCcm9hZGNhc3RUb29scygpLFxyXG4gICAgICAgICAgICAgICAgc2NlbmVBZHZhbmNlZDogbmV3IFNjZW5lQWR2YW5jZWRUb29scygpLFxyXG4gICAgICAgICAgICAgICAgc2NlbmVWaWV3OiBuZXcgU2NlbmVWaWV3VG9vbHMoKSxcclxuICAgICAgICAgICAgICAgIHJlZmVyZW5jZUltYWdlOiBuZXcgUmVmZXJlbmNlSW1hZ2VUb29scygpLFxyXG4gICAgICAgICAgICAgICAgYXNzZXRBZHZhbmNlZDogbmV3IEFzc2V0QWR2YW5jZWRUb29scygpLFxyXG4gICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogbmV3IFZhbGlkYXRpb25Ub29scygpXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAvLyDku47mr4/kuKrlt6Xlhbfnsbvojrflj5blt6XlhbfliJfooahcclxuICAgICAgICAgICAgdGhpcy5hdmFpbGFibGVUb29scyA9IFtdO1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtjYXRlZ29yeSwgdG9vbFNldF0gb2YgT2JqZWN0LmVudHJpZXModG9vbHMpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0b29sRGVmaW5pdGlvbnMgPSB0b29sU2V0LmdldFRvb2xzKCk7XHJcbiAgICAgICAgICAgICAgICB0b29sRGVmaW5pdGlvbnMuZm9yRWFjaCgodG9vbDogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5qC55o2u5bel5YW357G75Yir6K6+572u54mI5pys6KaB5rGCXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHZlcnNpb25SZXF1aXJlbWVudDogc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjYXRlZ29yeSA9PT0gJ3JlZmVyZW5jZUltYWdlJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uUmVxdWlyZW1lbnQgPSAnMy44LjInO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2F0ZWdvcnkgPT09ICdzY2VuZUFkdmFuY2VkJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDpg6jliIbpq5jnuqflnLrmma/lt6XlhbfpnIDopoEgMy44LjYrXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGFkdmFuY2VkVG9vbHMzODYgPSBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAncmVzZXRfbm9kZV9wcm9wZXJ0eScsICdtb3ZlX2FycmF5X2VsZW1lbnQnLCAncmVtb3ZlX2FycmF5X2VsZW1lbnQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3Jlc3RvcmVfcHJlZmFiJywgJ2V4ZWN1dGVfY29tcG9uZW50X21ldGhvZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAncXVlcnlfc2NlbmVfY2xhc3NlcycsICdxdWVyeV9zY2VuZV9jb21wb25lbnRzJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdxdWVyeV9jb21wb25lbnRfaGFzX3NjcmlwdCcsICdxdWVyeV9ub2Rlc19ieV9hc3NldF91dWlkJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWR2YW5jZWRUb29sczM4Ni5pbmNsdWRlcyh0b29sLm5hbWUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uUmVxdWlyZW1lbnQgPSAnMy44LjYnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmF2YWlsYWJsZVRvb2xzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHRvb2wubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSwgLy8g6buY6K6k5ZCv55SoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB0b29sLmRlc2NyaXB0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uUmVxdWlyZW1lbnQ6IHZlcnNpb25SZXF1aXJlbWVudFxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbVG9vbE1hbmFnZXJdIEluaXRpYWxpemVkICR7dGhpcy5hdmFpbGFibGVUb29scy5sZW5ndGh9IHRvb2xzIGZyb20gTUNQIHNlcnZlcmApO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tUb29sTWFuYWdlcl0gRmFpbGVkIHRvIGluaXRpYWxpemUgdG9vbHMgZnJvbSBNQ1Agc2VydmVyOicsIGVycm9yKTtcclxuICAgICAgICAgICAgLy8g5aaC5p6c6I635Y+W5aSx6LSl77yM5L2/55So6buY6K6k5bel5YW35YiX6KGo5L2c5Li65ZCO5aSHXHJcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZURlZmF1bHRUb29scygpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGluaXRpYWxpemVEZWZhdWx0VG9vbHMoKTogdm9pZCB7XHJcbiAgICAgICAgLy8g6buY6K6k5bel5YW35YiX6KGo5L2c5Li65ZCO5aSH5pa55qGIXHJcbiAgICAgICAgY29uc3QgdG9vbENhdGVnb3JpZXMgPSBbXHJcbiAgICAgICAgICAgIHsgY2F0ZWdvcnk6ICdzY2VuZScsIG5hbWU6ICflnLrmma/lt6XlhbcnLCB0b29sczogW1xyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZ2V0Q3VycmVudFNjZW5lSW5mbycsIGRlc2NyaXB0aW9uOiAn6I635Y+W5b2T5YmN5Zy65pmv5L+h5oGvJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZ2V0U2NlbmVIaWVyYXJjaHknLCBkZXNjcmlwdGlvbjogJ+iOt+WPluWcuuaZr+Wxgue6p+e7k+aehCcgfSxcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2NyZWF0ZU5ld1NjZW5lJywgZGVzY3JpcHRpb246ICfliJvlu7rmlrDlnLrmma8nIH0sXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdzYXZlU2NlbmUnLCBkZXNjcmlwdGlvbjogJ+S/neWtmOWcuuaZrycgfSxcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2xvYWRTY2VuZScsIGRlc2NyaXB0aW9uOiAn5Yqg6L295Zy65pmvJyB9XHJcbiAgICAgICAgICAgIF19LFxyXG4gICAgICAgICAgICB7IGNhdGVnb3J5OiAnbm9kZScsIG5hbWU6ICfoioLngrnlt6XlhbcnLCB0b29sczogW1xyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZ2V0QWxsTm9kZXMnLCBkZXNjcmlwdGlvbjogJ+iOt+WPluaJgOacieiKgueCuScgfSxcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2ZpbmROb2RlQnlOYW1lJywgZGVzY3JpcHRpb246ICfmoLnmja7lkI3np7Dmn6Xmib7oioLngrknIH0sXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdjcmVhdGVOb2RlJywgZGVzY3JpcHRpb246ICfliJvlu7roioLngrknIH0sXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdkZWxldGVOb2RlJywgZGVzY3JpcHRpb246ICfliKDpmaToioLngrknIH0sXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdzZXROb2RlUHJvcGVydHknLCBkZXNjcmlwdGlvbjogJ+iuvue9ruiKgueCueWxnuaApycgfSxcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2dldE5vZGVJbmZvJywgZGVzY3JpcHRpb246ICfojrflj5boioLngrnkv6Hmga8nIH1cclxuICAgICAgICAgICAgXX0sXHJcbiAgICAgICAgICAgIHsgY2F0ZWdvcnk6ICdjb21wb25lbnQnLCBuYW1lOiAn57uE5Lu25bel5YW3JywgdG9vbHM6IFtcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2FkZENvbXBvbmVudFRvTm9kZScsIGRlc2NyaXB0aW9uOiAn5re75Yqg57uE5Lu25Yiw6IqC54K5JyB9LFxyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAncmVtb3ZlQ29tcG9uZW50RnJvbU5vZGUnLCBkZXNjcmlwdGlvbjogJ+S7juiKgueCueenu+mZpOe7hOS7ticgfSxcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ3NldENvbXBvbmVudFByb3BlcnR5JywgZGVzY3JpcHRpb246ICforr7nva7nu4Tku7blsZ7mgKcnIH0sXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdnZXRDb21wb25lbnRJbmZvJywgZGVzY3JpcHRpb246ICfojrflj5bnu4Tku7bkv6Hmga8nIH1cclxuICAgICAgICAgICAgXX0sXHJcbiAgICAgICAgICAgIHsgY2F0ZWdvcnk6ICdwcmVmYWInLCBuYW1lOiAn6aKE5Yi25L2T5bel5YW3JywgdG9vbHM6IFtcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2NyZWF0ZVByZWZhYkZyb21Ob2RlJywgZGVzY3JpcHRpb246ICfku47oioLngrnliJvlu7rpooTliLbkvZMnIH0sXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdpbnN0YW50aWF0ZVByZWZhYicsIGRlc2NyaXB0aW9uOiAn5a6e5L6L5YyW6aKE5Yi25L2TJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZ2V0UHJlZmFiSW5mbycsIGRlc2NyaXB0aW9uOiAn6I635Y+W6aKE5Yi25L2T5L+h5oGvJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnc2F2ZVByZWZhYicsIGRlc2NyaXB0aW9uOiAn5L+d5a2Y6aKE5Yi25L2TJyB9XHJcbiAgICAgICAgICAgIF19LFxyXG4gICAgICAgICAgICB7IGNhdGVnb3J5OiAncHJvamVjdCcsIG5hbWU6ICfpobnnm67lt6XlhbcnLCB0b29sczogW1xyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZ2V0UHJvamVjdEluZm8nLCBkZXNjcmlwdGlvbjogJ+iOt+WPlumhueebruS/oeaBrycgfSxcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2dldEFzc2V0TGlzdCcsIGRlc2NyaXB0aW9uOiAn6I635Y+W6LWE5rqQ5YiX6KGoJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnY3JlYXRlQXNzZXQnLCBkZXNjcmlwdGlvbjogJ+WIm+W7uui1hOa6kCcgfSxcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2RlbGV0ZUFzc2V0JywgZGVzY3JpcHRpb246ICfliKDpmaTotYTmupAnIH1cclxuICAgICAgICAgICAgXX0sXHJcbiAgICAgICAgICAgIHsgY2F0ZWdvcnk6ICdkZWJ1ZycsIG5hbWU6ICfosIPor5Xlt6XlhbcnLCB0b29sczogW1xyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZ2V0Q29uc29sZUxvZ3MnLCBkZXNjcmlwdGlvbjogJ+iOt+WPluaOp+WItuWPsOaXpeW/lycgfSxcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2dldFBlcmZvcm1hbmNlU3RhdHMnLCBkZXNjcmlwdGlvbjogJ+iOt+WPluaAp+iDvee7n+iuoScgfSxcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ3ZhbGlkYXRlU2NlbmUnLCBkZXNjcmlwdGlvbjogJ+mqjOivgeWcuuaZrycgfSxcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2dldEVycm9yTG9ncycsIGRlc2NyaXB0aW9uOiAn6I635Y+W6ZSZ6K+v5pel5b+XJyB9XHJcbiAgICAgICAgICAgIF19LFxyXG4gICAgICAgICAgICB7IGNhdGVnb3J5OiAncHJlZmVyZW5jZXMnLCBuYW1lOiAn5YGP5aW96K6+572u5bel5YW3JywgdG9vbHM6IFtcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2dldFByZWZlcmVuY2VzJywgZGVzY3JpcHRpb246ICfojrflj5blgY/lpb3orr7nva4nIH0sXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdzZXRQcmVmZXJlbmNlcycsIGRlc2NyaXB0aW9uOiAn6K6+572u5YGP5aW96K6+572uJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAncmVzZXRQcmVmZXJlbmNlcycsIGRlc2NyaXB0aW9uOiAn6YeN572u5YGP5aW96K6+572uJyB9XHJcbiAgICAgICAgICAgIF19LFxyXG4gICAgICAgICAgICB7IGNhdGVnb3J5OiAnc2VydmVyJywgbmFtZTogJ+acjeWKoeWZqOW3peWFtycsIHRvb2xzOiBbXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdnZXRTZXJ2ZXJTdGF0dXMnLCBkZXNjcmlwdGlvbjogJ+iOt+WPluacjeWKoeWZqOeKtuaAgScgfSxcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2dldENvbm5lY3RlZENsaWVudHMnLCBkZXNjcmlwdGlvbjogJ+iOt+WPlui/nuaOpeeahOWuouaIt+errycgfSxcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2dldFNlcnZlckxvZ3MnLCBkZXNjcmlwdGlvbjogJ+iOt+WPluacjeWKoeWZqOaXpeW/lycgfVxyXG4gICAgICAgICAgICBdfSxcclxuICAgICAgICAgICAgeyBjYXRlZ29yeTogJ2Jyb2FkY2FzdCcsIG5hbWU6ICflub/mkq3lt6XlhbcnLCB0b29sczogW1xyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnYnJvYWRjYXN0TWVzc2FnZScsIGRlc2NyaXB0aW9uOiAn5bm/5pKt5raI5oGvJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZ2V0QnJvYWRjYXN0SGlzdG9yeScsIGRlc2NyaXB0aW9uOiAn6I635Y+W5bm/5pKt5Y6G5Y+yJyB9XHJcbiAgICAgICAgICAgIF19LFxyXG4gICAgICAgICAgICB7IGNhdGVnb3J5OiAnc2NlbmVBZHZhbmNlZCcsIG5hbWU6ICfpq5jnuqflnLrmma/lt6XlhbcnLCB0b29sczogW1xyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnb3B0aW1pemVTY2VuZScsIGRlc2NyaXB0aW9uOiAn5LyY5YyW5Zy65pmvJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnYW5hbHl6ZVNjZW5lJywgZGVzY3JpcHRpb246ICfliIbmnpDlnLrmma8nIH0sXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdiYXRjaE9wZXJhdGlvbicsIGRlc2NyaXB0aW9uOiAn5om56YeP5pON5L2cJyB9XHJcbiAgICAgICAgICAgIF19LFxyXG4gICAgICAgICAgICB7IGNhdGVnb3J5OiAnc2NlbmVWaWV3JywgbmFtZTogJ+WcuuaZr+inhuWbvuW3peWFtycsIHRvb2xzOiBbXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdnZXRWaWV3cG9ydEluZm8nLCBkZXNjcmlwdGlvbjogJ+iOt+WPluinhuWPo+S/oeaBrycgfSxcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ3NldFZpZXdwb3J0Q2FtZXJhJywgZGVzY3JpcHRpb246ICforr7nva7op4blj6Pnm7jmnLonIH0sXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdmb2N1c09uTm9kZScsIGRlc2NyaXB0aW9uOiAn6IGa54Sm5Yiw6IqC54K5JyB9XHJcbiAgICAgICAgICAgIF19LFxyXG4gICAgICAgICAgICB7IGNhdGVnb3J5OiAncmVmZXJlbmNlSW1hZ2UnLCBuYW1lOiAn5Y+C6ICD5Zu+54mH5bel5YW3JywgdG9vbHM6IFtcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2FkZFJlZmVyZW5jZUltYWdlJywgZGVzY3JpcHRpb246ICfmt7vliqDlj4LogIPlm77niYcnIH0sXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdyZW1vdmVSZWZlcmVuY2VJbWFnZScsIGRlc2NyaXB0aW9uOiAn56e76Zmk5Y+C6ICD5Zu+54mHJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZ2V0UmVmZXJlbmNlSW1hZ2VzJywgZGVzY3JpcHRpb246ICfojrflj5blj4LogIPlm77niYfliJfooagnIH1cclxuICAgICAgICAgICAgXX0sXHJcbiAgICAgICAgICAgIHsgY2F0ZWdvcnk6ICdhc3NldEFkdmFuY2VkJywgbmFtZTogJ+mrmOe6p+i1hOa6kOW3peWFtycsIHRvb2xzOiBbXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdpbXBvcnRBc3NldCcsIGRlc2NyaXB0aW9uOiAn5a+85YWl6LWE5rqQJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZXhwb3J0QXNzZXQnLCBkZXNjcmlwdGlvbjogJ+WvvOWHuui1hOa6kCcgfSxcclxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ3Byb2Nlc3NBc3NldCcsIGRlc2NyaXB0aW9uOiAn5aSE55CG6LWE5rqQJyB9XHJcbiAgICAgICAgICAgIF19LFxyXG4gICAgICAgICAgICB7IGNhdGVnb3J5OiAndmFsaWRhdGlvbicsIG5hbWU6ICfpqozor4Hlt6XlhbcnLCB0b29sczogW1xyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAndmFsaWRhdGVQcm9qZWN0JywgZGVzY3JpcHRpb246ICfpqozor4Hpobnnm64nIH0sXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICd2YWxpZGF0ZUFzc2V0cycsIGRlc2NyaXB0aW9uOiAn6aqM6K+B6LWE5rqQJyB9LFxyXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZ2VuZXJhdGVSZXBvcnQnLCBkZXNjcmlwdGlvbjogJ+eUn+aIkOaKpeWRiicgfVxyXG4gICAgICAgICAgICBdfVxyXG4gICAgICAgIF07XHJcblxyXG4gICAgICAgIHRoaXMuYXZhaWxhYmxlVG9vbHMgPSBbXTtcclxuICAgICAgICB0b29sQ2F0ZWdvcmllcy5mb3JFYWNoKGNhdGVnb3J5ID0+IHtcclxuICAgICAgICAgICAgY2F0ZWdvcnkudG9vbHMuZm9yRWFjaCh0b29sID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYXZhaWxhYmxlVG9vbHMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5LmNhdGVnb3J5LFxyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHRvb2wubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLCAvLyDpu5jorqTlkK/nlKhcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogdG9vbC5kZXNjcmlwdGlvblxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjb25zb2xlLmxvZyhgW1Rvb2xNYW5hZ2VyXSBJbml0aWFsaXplZCAke3RoaXMuYXZhaWxhYmxlVG9vbHMubGVuZ3RofSBkZWZhdWx0IHRvb2xzYCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldEF2YWlsYWJsZVRvb2xzKCk6IFRvb2xDb25maWdbXSB7XHJcbiAgICAgICAgcmV0dXJuIFsuLi50aGlzLmF2YWlsYWJsZVRvb2xzXTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0Q29uZmlndXJhdGlvbnMoKTogVG9vbENvbmZpZ3VyYXRpb25bXSB7XHJcbiAgICAgICAgcmV0dXJuIFsuLi50aGlzLnNldHRpbmdzLmNvbmZpZ3VyYXRpb25zXTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0Q3VycmVudENvbmZpZ3VyYXRpb24oKTogVG9vbENvbmZpZ3VyYXRpb24gfCBudWxsIHtcclxuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MuY3VycmVudENvbmZpZ0lkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpcy5zZXR0aW5ncy5jb25maWd1cmF0aW9ucy5maW5kKGNvbmZpZyA9PiBjb25maWcuaWQgPT09IHRoaXMuc2V0dGluZ3MuY3VycmVudENvbmZpZ0lkKSB8fCBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBjcmVhdGVDb25maWd1cmF0aW9uKG5hbWU6IHN0cmluZywgZGVzY3JpcHRpb24/OiBzdHJpbmcpOiBUb29sQ29uZmlndXJhdGlvbiB7XHJcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuY29uZmlndXJhdGlvbnMubGVuZ3RoID49IHRoaXMuc2V0dGluZ3MubWF4Q29uZmlnU2xvdHMpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGDlt7Lovr7liLDmnIDlpKfphY3nva7mp73kvY3mlbDph48gKCR7dGhpcy5zZXR0aW5ncy5tYXhDb25maWdTbG90c30pYCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjb25maWc6IFRvb2xDb25maWd1cmF0aW9uID0ge1xyXG4gICAgICAgICAgICBpZDogdXVpZHY0KCksXHJcbiAgICAgICAgICAgIG5hbWUsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uLFxyXG4gICAgICAgICAgICB0b29sczogdGhpcy5hdmFpbGFibGVUb29scy5tYXAodG9vbCA9PiAoeyAuLi50b29sIH0pKSxcclxuICAgICAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICAgIHVwZGF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5jb25maWd1cmF0aW9ucy5wdXNoKGNvbmZpZyk7XHJcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5jdXJyZW50Q29uZmlnSWQgPSBjb25maWcuaWQ7XHJcbiAgICAgICAgdGhpcy5zYXZlU2V0dGluZ3MoKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGNvbmZpZztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgdXBkYXRlQ29uZmlndXJhdGlvbihjb25maWdJZDogc3RyaW5nLCB1cGRhdGVzOiBQYXJ0aWFsPFRvb2xDb25maWd1cmF0aW9uPik6IFRvb2xDb25maWd1cmF0aW9uIHtcclxuICAgICAgICBjb25zdCBjb25maWdJbmRleCA9IHRoaXMuc2V0dGluZ3MuY29uZmlndXJhdGlvbnMuZmluZEluZGV4KGNvbmZpZyA9PiBjb25maWcuaWQgPT09IGNvbmZpZ0lkKTtcclxuICAgICAgICBpZiAoY29uZmlnSW5kZXggPT09IC0xKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcign6YWN572u5LiN5a2Y5ZyoJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjb25maWcgPSB0aGlzLnNldHRpbmdzLmNvbmZpZ3VyYXRpb25zW2NvbmZpZ0luZGV4XTtcclxuICAgICAgICBjb25zdCB1cGRhdGVkQ29uZmlnOiBUb29sQ29uZmlndXJhdGlvbiA9IHtcclxuICAgICAgICAgICAgLi4uY29uZmlnLFxyXG4gICAgICAgICAgICAuLi51cGRhdGVzLFxyXG4gICAgICAgICAgICB1cGRhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuY29uZmlndXJhdGlvbnNbY29uZmlnSW5kZXhdID0gdXBkYXRlZENvbmZpZztcclxuICAgICAgICB0aGlzLnNhdmVTZXR0aW5ncygpO1xyXG5cclxuICAgICAgICByZXR1cm4gdXBkYXRlZENvbmZpZztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZGVsZXRlQ29uZmlndXJhdGlvbihjb25maWdJZDogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAgICAgY29uc3QgY29uZmlnSW5kZXggPSB0aGlzLnNldHRpbmdzLmNvbmZpZ3VyYXRpb25zLmZpbmRJbmRleChjb25maWcgPT4gY29uZmlnLmlkID09PSBjb25maWdJZCk7XHJcbiAgICAgICAgaWYgKGNvbmZpZ0luZGV4ID09PSAtMSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ+mFjee9ruS4jeWtmOWcqCcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5jb25maWd1cmF0aW9ucy5zcGxpY2UoY29uZmlnSW5kZXgsIDEpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOWmguaenOWIoOmZpOeahOaYr+W9k+WJjemFjee9ru+8jOa4heepuuW9k+WJjemFjee9rklEXHJcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuY3VycmVudENvbmZpZ0lkID09PSBjb25maWdJZCkge1xyXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmN1cnJlbnRDb25maWdJZCA9IHRoaXMuc2V0dGluZ3MuY29uZmlndXJhdGlvbnMubGVuZ3RoID4gMCBcclxuICAgICAgICAgICAgICAgID8gdGhpcy5zZXR0aW5ncy5jb25maWd1cmF0aW9uc1swXS5pZCBcclxuICAgICAgICAgICAgICAgIDogJyc7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzZXRDdXJyZW50Q29uZmlndXJhdGlvbihjb25maWdJZDogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAgICAgY29uc3QgY29uZmlnID0gdGhpcy5zZXR0aW5ncy5jb25maWd1cmF0aW9ucy5maW5kKGNvbmZpZyA9PiBjb25maWcuaWQgPT09IGNvbmZpZ0lkKTtcclxuICAgICAgICBpZiAoIWNvbmZpZykge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ+mFjee9ruS4jeWtmOWcqCcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5jdXJyZW50Q29uZmlnSWQgPSBjb25maWdJZDtcclxuICAgICAgICB0aGlzLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyB1cGRhdGVUb29sU3RhdHVzKGNvbmZpZ0lkOiBzdHJpbmcsIGNhdGVnb3J5OiBzdHJpbmcsIHRvb2xOYW1lOiBzdHJpbmcsIGVuYWJsZWQ6IGJvb2xlYW4pOiB2b2lkIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgQmFja2VuZDogVXBkYXRpbmcgdG9vbCBzdGF0dXMgLSBjb25maWdJZDogJHtjb25maWdJZH0sIGNhdGVnb3J5OiAke2NhdGVnb3J5fSwgdG9vbE5hbWU6ICR7dG9vbE5hbWV9LCBlbmFibGVkOiAke2VuYWJsZWR9YCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgY29uZmlnID0gdGhpcy5zZXR0aW5ncy5jb25maWd1cmF0aW9ucy5maW5kKGNvbmZpZyA9PiBjb25maWcuaWQgPT09IGNvbmZpZ0lkKTtcclxuICAgICAgICBpZiAoIWNvbmZpZykge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBCYWNrZW5kOiBDb25maWcgbm90IGZvdW5kIHdpdGggSUQ6ICR7Y29uZmlnSWR9YCk7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcign6YWN572u5LiN5a2Y5ZyoJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zb2xlLmxvZyhgQmFja2VuZDogRm91bmQgY29uZmlnOiAke2NvbmZpZy5uYW1lfWApO1xyXG5cclxuICAgICAgICBjb25zdCB0b29sID0gY29uZmlnLnRvb2xzLmZpbmQodCA9PiB0LmNhdGVnb3J5ID09PSBjYXRlZ29yeSAmJiB0Lm5hbWUgPT09IHRvb2xOYW1lKTtcclxuICAgICAgICBpZiAoIXRvb2wpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihgQmFja2VuZDogVG9vbCBub3QgZm91bmQgLSBjYXRlZ29yeTogJHtjYXRlZ29yeX0sIG5hbWU6ICR7dG9vbE5hbWV9YCk7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcign5bel5YW35LiN5a2Y5ZyoJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zb2xlLmxvZyhgQmFja2VuZDogRm91bmQgdG9vbDogJHt0b29sLm5hbWV9LCBjdXJyZW50IGVuYWJsZWQ6ICR7dG9vbC5lbmFibGVkfSwgbmV3IGVuYWJsZWQ6ICR7ZW5hYmxlZH1gKTtcclxuICAgICAgICBcclxuICAgICAgICB0b29sLmVuYWJsZWQgPSBlbmFibGVkO1xyXG4gICAgICAgIGNvbmZpZy51cGRhdGVkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc29sZS5sb2coYEJhY2tlbmQ6IFRvb2wgdXBkYXRlZCwgc2F2aW5nIHNldHRpbmdzLi4uYCk7XHJcbiAgICAgICAgdGhpcy5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhgQmFja2VuZDogU2V0dGluZ3Mgc2F2ZWQgc3VjY2Vzc2Z1bGx5YCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHVwZGF0ZVRvb2xTdGF0dXNCYXRjaChjb25maWdJZDogc3RyaW5nLCB1cGRhdGVzOiB7IGNhdGVnb3J5OiBzdHJpbmc7IG5hbWU6IHN0cmluZzsgZW5hYmxlZDogYm9vbGVhbiB9W10pOiB2b2lkIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgQmFja2VuZDogdXBkYXRlVG9vbFN0YXR1c0JhdGNoIGNhbGxlZCB3aXRoIGNvbmZpZ0lkOiAke2NvbmZpZ0lkfWApO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBCYWNrZW5kOiBDdXJyZW50IGNvbmZpZ3VyYXRpb25zIGNvdW50OiAke3RoaXMuc2V0dGluZ3MuY29uZmlndXJhdGlvbnMubGVuZ3RofWApO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBCYWNrZW5kOiBDdXJyZW50IGNvbmZpZyBJRHM6YCwgdGhpcy5zZXR0aW5ncy5jb25maWd1cmF0aW9ucy5tYXAoYyA9PiBjLmlkKSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgY29uZmlnID0gdGhpcy5zZXR0aW5ncy5jb25maWd1cmF0aW9ucy5maW5kKGNvbmZpZyA9PiBjb25maWcuaWQgPT09IGNvbmZpZ0lkKTtcclxuICAgICAgICBpZiAoIWNvbmZpZykge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBCYWNrZW5kOiBDb25maWcgbm90IGZvdW5kIHdpdGggSUQ6ICR7Y29uZmlnSWR9YCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEJhY2tlbmQ6IEF2YWlsYWJsZSBjb25maWcgSURzOmAsIHRoaXMuc2V0dGluZ3MuY29uZmlndXJhdGlvbnMubWFwKGMgPT4gYy5pZCkpO1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ+mFjee9ruS4jeWtmOWcqCcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc29sZS5sb2coYEJhY2tlbmQ6IEZvdW5kIGNvbmZpZzogJHtjb25maWcubmFtZX0sIHVwZGF0aW5nICR7dXBkYXRlcy5sZW5ndGh9IHRvb2xzYCk7XHJcblxyXG4gICAgICAgIHVwZGF0ZXMuZm9yRWFjaCh1cGRhdGUgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCB0b29sID0gY29uZmlnLnRvb2xzLmZpbmQodCA9PiB0LmNhdGVnb3J5ID09PSB1cGRhdGUuY2F0ZWdvcnkgJiYgdC5uYW1lID09PSB1cGRhdGUubmFtZSk7XHJcbiAgICAgICAgICAgIGlmICh0b29sKSB7XHJcbiAgICAgICAgICAgICAgICB0b29sLmVuYWJsZWQgPSB1cGRhdGUuZW5hYmxlZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjb25maWcudXBkYXRlZEF0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xyXG4gICAgICAgIHRoaXMuc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coYEJhY2tlbmQ6IEJhdGNoIHVwZGF0ZSBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5YCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGV4cG9ydENvbmZpZ3VyYXRpb24oY29uZmlnSWQ6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICAgICAgY29uc3QgY29uZmlnID0gdGhpcy5zZXR0aW5ncy5jb25maWd1cmF0aW9ucy5maW5kKGNvbmZpZyA9PiBjb25maWcuaWQgPT09IGNvbmZpZ0lkKTtcclxuICAgICAgICBpZiAoIWNvbmZpZykge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ+mFjee9ruS4jeWtmOWcqCcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZXhwb3J0VG9vbENvbmZpZ3VyYXRpb24oY29uZmlnKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgaW1wb3J0Q29uZmlndXJhdGlvbihjb25maWdKc29uOiBzdHJpbmcpOiBUb29sQ29uZmlndXJhdGlvbiB7XHJcbiAgICAgICAgY29uc3QgY29uZmlnID0gdGhpcy5pbXBvcnRUb29sQ29uZmlndXJhdGlvbihjb25maWdKc29uKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDnlJ/miJDmlrDnmoRJROWSjOaXtumXtOaIs1xyXG4gICAgICAgIGNvbmZpZy5pZCA9IHV1aWR2NCgpO1xyXG4gICAgICAgIGNvbmZpZy5jcmVhdGVkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcbiAgICAgICAgY29uZmlnLnVwZGF0ZWRBdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuY29uZmlndXJhdGlvbnMubGVuZ3RoID49IHRoaXMuc2V0dGluZ3MubWF4Q29uZmlnU2xvdHMpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGDlt7Lovr7liLDmnIDlpKfphY3nva7mp73kvY3mlbDph48gKCR7dGhpcy5zZXR0aW5ncy5tYXhDb25maWdTbG90c30pYCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnNldHRpbmdzLmNvbmZpZ3VyYXRpb25zLnB1c2goY29uZmlnKTtcclxuICAgICAgICB0aGlzLnNhdmVTZXR0aW5ncygpO1xyXG5cclxuICAgICAgICByZXR1cm4gY29uZmlnO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXRFbmFibGVkVG9vbHMoKTogVG9vbENvbmZpZ1tdIHtcclxuICAgICAgICBjb25zdCBjdXJyZW50Q29uZmlnID0gdGhpcy5nZXRDdXJyZW50Q29uZmlndXJhdGlvbigpO1xyXG4gICAgICAgIGlmICghY3VycmVudENvbmZpZykge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hdmFpbGFibGVUb29scy5maWx0ZXIodG9vbCA9PiB0b29sLmVuYWJsZWQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gY3VycmVudENvbmZpZy50b29scy5maWx0ZXIodG9vbCA9PiB0b29sLmVuYWJsZWQpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXRUb29sTWFuYWdlclN0YXRlKCkge1xyXG4gICAgICAgIGNvbnN0IGN1cnJlbnRDb25maWcgPSB0aGlzLmdldEN1cnJlbnRDb25maWd1cmF0aW9uKCk7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgYXZhaWxhYmxlVG9vbHM6IGN1cnJlbnRDb25maWcgPyBjdXJyZW50Q29uZmlnLnRvb2xzIDogdGhpcy5nZXRBdmFpbGFibGVUb29scygpLFxyXG4gICAgICAgICAgICBzZWxlY3RlZENvbmZpZ0lkOiB0aGlzLnNldHRpbmdzLmN1cnJlbnRDb25maWdJZCxcclxuICAgICAgICAgICAgY29uZmlndXJhdGlvbnM6IHRoaXMuZ2V0Q29uZmlndXJhdGlvbnMoKSxcclxuICAgICAgICAgICAgbWF4Q29uZmlnU2xvdHM6IHRoaXMuc2V0dGluZ3MubWF4Q29uZmlnU2xvdHNcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc2F2ZVNldHRpbmdzKCk6IHZvaWQge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBCYWNrZW5kOiBTYXZpbmcgc2V0dGluZ3MsIGN1cnJlbnQgY29uZmlncyBjb3VudDogJHt0aGlzLnNldHRpbmdzLmNvbmZpZ3VyYXRpb25zLmxlbmd0aH1gKTtcclxuICAgICAgICB0aGlzLnNhdmVUb29sTWFuYWdlclNldHRpbmdzKHRoaXMuc2V0dGluZ3MpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBCYWNrZW5kOiBTZXR0aW5ncyBzYXZlZCB0byBmaWxlYCk7XHJcbiAgICB9XHJcbn0gIl19