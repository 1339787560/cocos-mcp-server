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
exports.DEFAULT_TOOL_MANAGER_SETTINGS = exports.DEFAULT_SETTINGS = exports.importToolConfiguration = exports.exportToolConfiguration = exports.saveToolManagerSettings = exports.readToolManagerSettings = exports.saveSettings = exports.readSettings = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const DEFAULT_SETTINGS = {
    port: 3000,
    autoStart: false,
    enableDebugLog: false,
    allowedOrigins: ['*'],
    maxConnections: 10
};
exports.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
const DEFAULT_TOOL_MANAGER_SETTINGS = {
    configurations: [],
    currentConfigId: '',
    maxConfigSlots: 5
};
exports.DEFAULT_TOOL_MANAGER_SETTINGS = DEFAULT_TOOL_MANAGER_SETTINGS;
function getSettingsPath() {
    return path.join(Editor.Project.path, 'settings', 'mcp-server.json');
}
function getToolManagerSettingsPath() {
    return path.join(Editor.Project.path, 'settings', 'tool-manager.json');
}
function ensureSettingsDir() {
    const settingsDir = path.dirname(getSettingsPath());
    if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir, { recursive: true });
    }
}
function readSettings() {
    try {
        ensureSettingsDir();
        const settingsFile = getSettingsPath();
        if (fs.existsSync(settingsFile)) {
            const content = fs.readFileSync(settingsFile, 'utf8');
            return Object.assign(Object.assign({}, DEFAULT_SETTINGS), JSON.parse(content));
        }
    }
    catch (e) {
        console.error('Failed to read settings:', e);
    }
    return DEFAULT_SETTINGS;
}
exports.readSettings = readSettings;
function saveSettings(settings) {
    try {
        ensureSettingsDir();
        const settingsFile = getSettingsPath();
        fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
    }
    catch (e) {
        console.error('Failed to save settings:', e);
        throw e;
    }
}
exports.saveSettings = saveSettings;
// 工具管理器设置相关函数
function readToolManagerSettings() {
    try {
        ensureSettingsDir();
        const settingsFile = getToolManagerSettingsPath();
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
exports.readToolManagerSettings = readToolManagerSettings;
function saveToolManagerSettings(settings) {
    try {
        ensureSettingsDir();
        const settingsFile = getToolManagerSettingsPath();
        fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
    }
    catch (e) {
        console.error('Failed to save tool manager settings:', e);
        throw e;
    }
}
exports.saveToolManagerSettings = saveToolManagerSettings;
function exportToolConfiguration(config) {
    return JSON.stringify(config, null, 2);
}
exports.exportToolConfiguration = exportToolConfiguration;
function importToolConfiguration(configJson) {
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
exports.importToolConfiguration = importToolConfiguration;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2Uvc2V0dGluZ3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBeUI7QUFDekIsMkNBQTZCO0FBRzdCLE1BQU0sZ0JBQWdCLEdBQXNCO0lBQ3hDLElBQUksRUFBRSxJQUFJO0lBQ1YsU0FBUyxFQUFFLEtBQUs7SUFDaEIsY0FBYyxFQUFFLEtBQUs7SUFDckIsY0FBYyxFQUFFLENBQUMsR0FBRyxDQUFDO0lBQ3JCLGNBQWMsRUFBRSxFQUFFO0NBQ3JCLENBQUM7QUE0Rk8sNENBQWdCO0FBMUZ6QixNQUFNLDZCQUE2QixHQUF3QjtJQUN2RCxjQUFjLEVBQUUsRUFBRTtJQUNsQixlQUFlLEVBQUUsRUFBRTtJQUNuQixjQUFjLEVBQUUsQ0FBQztDQUNwQixDQUFDO0FBc0Z5QixzRUFBNkI7QUFwRnhELFNBQVMsZUFBZTtJQUNwQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixDQUFDLENBQUM7QUFDekUsQ0FBQztBQUVELFNBQVMsMEJBQTBCO0lBQy9CLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztBQUMzRSxDQUFDO0FBRUQsU0FBUyxpQkFBaUI7SUFDdEIsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDO0lBQ3BELElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7UUFDOUIsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUNuRCxDQUFDO0FBQ0wsQ0FBQztBQUVELFNB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LElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDN0QsTUFBTSxJQUFJLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1FBQ3BELENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNsQixDQUFDO0lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUNULE9BQU8sQ0FBQyxLQUFLLENBQUMscUNBQXFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDeEQsTUFBTSxJQUFJLEtBQUssQ0FBQyxnREFBZ0QsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7QUFDTCxDQUFDO0FBWkQsMERBWUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IE1DUFNlcnZlclNldHRpbmdzLCBUb29sTWFuYWdlclNldHRpbmdzLCBUb29sQ29uZmlndXJhdGlvbiwgVG9vbENvbmZpZyB9IGZyb20gJy4vdHlwZXMnO1xyXG5cclxuY29uc3QgREVGQVVMVF9TRVRUSU5HUzogTUNQU2VydmVyU2V0dGluZ3MgPSB7XHJcbiAgICBwb3J0OiAzMDAwLFxyXG4gICAgYXV0b1N0YXJ0OiBmYWxzZSxcclxuICAgIGVuYWJsZURlYnVnTG9nOiBmYWxzZSxcclxuICAgIGFsbG93ZWRPcmlnaW5zOiBbJyonXSxcclxuICAgIG1heENvbm5lY3Rpb25zOiAxMFxyXG59O1xyXG5cclxuY29uc3QgREVGQVVMVF9UT09MX01BTkFHRVJfU0VUVElOR1M6IFRvb2xNYW5hZ2VyU2V0dGluZ3MgPSB7XHJcbiAgICBjb25maWd1cmF0aW9uczogW10sXHJcbiAgICBjdXJyZW50Q29uZmlnSWQ6ICcnLFxyXG4gICAgbWF4Q29uZmlnU2xvdHM6IDVcclxufTtcclxuXHJcbmZ1bmN0aW9uIGdldFNldHRpbmdzUGF0aCgpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIHBhdGguam9pbihFZGl0b3IuUHJvamVjdC5wYXRoLCAnc2V0dGluZ3MnLCAnbWNwLXNlcnZlci5qc29uJyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFRvb2xNYW5hZ2VyU2V0dGluZ3NQYXRoKCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gcGF0aC5qb2luKEVkaXRvci5Qcm9qZWN0LnBhdGgsICdzZXR0aW5ncycsICd0b29sLW1hbmFnZXIuanNvbicpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBlbnN1cmVTZXR0aW5nc0RpcigpOiB2b2lkIHtcclxuICAgIGNvbnN0IHNldHRpbmdzRGlyID0gcGF0aC5kaXJuYW1lKGdldFNldHRpbmdzUGF0aCgpKTtcclxuICAgIGlmICghZnMuZXhpc3RzU3luYyhzZXR0aW5nc0RpcikpIHtcclxuICAgICAgICBmcy5ta2RpclN5bmMoc2V0dGluZ3NEaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVhZFNldHRpbmdzKCk6IE1DUFNlcnZlclNldHRpbmdzIHtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgZW5zdXJlU2V0dGluZ3NEaXIoKTtcclxuICAgICAgICBjb25zdCBzZXR0aW5nc0ZpbGUgPSBnZXRTZXR0aW5nc1BhdGgoKTtcclxuICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhzZXR0aW5nc0ZpbGUpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoc2V0dGluZ3NGaWxlLCAndXRmOCcpO1xyXG4gICAgICAgICAgICByZXR1cm4geyAuLi5ERUZBVUxUX1NFVFRJTkdTLCAuLi5KU09OLnBhcnNlKGNvbnRlbnQpIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byByZWFkIHNldHRpbmdzOicsIGUpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIERFRkFVTFRfU0VUVElOR1M7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzYXZlU2V0dGluZ3Moc2V0dGluZ3M6IE1DUFNlcnZlclNldHRpbmdzKTogdm9pZCB7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIGVuc3VyZVNldHRpbmdzRGlyKCk7XHJcbiAgICAgICAgY29uc3Qgc2V0dGluZ3NGaWxlID0gZ2V0U2V0dGluZ3NQYXRoKCk7XHJcbiAgICAgICAgZnMud3JpdGVGaWxlU3luYyhzZXR0aW5nc0ZpbGUsIEpTT04uc3RyaW5naWZ5KHNldHRpbmdzLCBudWxsLCAyKSk7XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHNhdmUgc2V0dGluZ3M6JywgZSk7XHJcbiAgICAgICAgdGhyb3cgZTtcclxuICAgIH1cclxufVxyXG5cclxuLy8g5bel5YW3566h55CG5Zmo6K6+572u55u45YWz5Ye95pWwXHJcbmV4cG9ydCBmdW5jdGlvbiByZWFkVG9vbE1hbmFnZXJTZXR0aW5ncygpOiBUb29sTWFuYWdlclNldHRpbmdzIHtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgZW5zdXJlU2V0dGluZ3NEaXIoKTtcclxuICAgICAgICBjb25zdCBzZXR0aW5nc0ZpbGUgPSBnZXRUb29sTWFuYWdlclNldHRpbmdzUGF0aCgpO1xyXG4gICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHNldHRpbmdzRmlsZSkpIHtcclxuICAgICAgICAgICAgY29uc3QgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhzZXR0aW5nc0ZpbGUsICd1dGY4Jyk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IC4uLkRFRkFVTFRfVE9PTF9NQU5BR0VSX1NFVFRJTkdTLCAuLi5KU09OLnBhcnNlKGNvbnRlbnQpIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byByZWFkIHRvb2wgbWFuYWdlciBzZXR0aW5nczonLCBlKTtcclxuICAgIH1cclxuICAgIHJldHVybiBERUZBVUxUX1RPT0xfTUFOQUdFUl9TRVRUSU5HUztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNhdmVUb29sTWFuYWdlclNldHRpbmdzKHNldHRpbmdzOiBUb29sTWFuYWdlclNldHRpbmdzKTogdm9pZCB7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIGVuc3VyZVNldHRpbmdzRGlyKCk7XHJcbiAgICAgICAgY29uc3Qgc2V0dGluZ3NGaWxlID0gZ2V0VG9vbE1hbmFnZXJTZXR0aW5nc1BhdGgoKTtcclxuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKHNldHRpbmdzRmlsZSwgSlNPTi5zdHJpbmdpZnkoc2V0dGluZ3MsIG51bGwsIDIpKTtcclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gc2F2ZSB0b29sIG1hbmFnZXIgc2V0dGluZ3M6JywgZSk7XHJcbiAgICAgICAgdGhyb3cgZTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGV4cG9ydFRvb2xDb25maWd1cmF0aW9uKGNvbmZpZzogVG9vbENvbmZpZ3VyYXRpb24pOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGNvbmZpZywgbnVsbCwgMik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBpbXBvcnRUb29sQ29uZmlndXJhdGlvbihjb25maWdKc29uOiBzdHJpbmcpOiBUb29sQ29uZmlndXJhdGlvbiB7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIGNvbnN0IGNvbmZpZyA9IEpTT04ucGFyc2UoY29uZmlnSnNvbik7XHJcbiAgICAgICAgLy8g6aqM6K+B6YWN572u5qC85byPXHJcbiAgICAgICAgaWYgKCFjb25maWcuaWQgfHwgIWNvbmZpZy5uYW1lIHx8ICFBcnJheS5pc0FycmF5KGNvbmZpZy50b29scykpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNvbmZpZ3VyYXRpb24gZm9ybWF0Jyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBjb25maWc7XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHBhcnNlIHRvb2wgY29uZmlndXJhdGlvbjonLCBlKTtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgSlNPTiBmb3JtYXQgb3IgY29uZmlndXJhdGlvbiBzdHJ1Y3R1cmUnKTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IHsgREVGQVVMVF9TRVRUSU5HUywgREVGQVVMVF9UT09MX01BTkFHRVJfU0VUVElOR1MgfTsiXX0=