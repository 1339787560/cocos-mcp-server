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
exports.MCPServer = void 0;
const http = __importStar(require("http"));
const url = __importStar(require("url"));
const scene_tools_1 = require("./tools/scene-tools");
const node_tools_1 = require("./tools/node-tools");
const component_tools_1 = require("./tools/component-tools");
const prefab_tools_1 = require("./tools/prefab-tools");
const project_tools_1 = require("./tools/project-tools");
const debug_tools_1 = require("./tools/debug-tools");
const preferences_tools_1 = require("./tools/preferences-tools");
const server_tools_1 = require("./tools/server-tools");
const broadcast_tools_1 = require("./tools/broadcast-tools");
const scene_advanced_tools_1 = require("./tools/scene-advanced-tools");
const scene_view_tools_1 = require("./tools/scene-view-tools");
const reference_image_tools_1 = require("./tools/reference-image-tools");
const asset_advanced_tools_1 = require("./tools/asset-advanced-tools");
const validation_tools_1 = require("./tools/validation-tools");
class MCPServer {
    constructor(settings) {
        this.httpServer = null;
        this.clients = new Map();
        this.tools = {};
        this.toolsList = [];
        this.enabledTools = []; // 存储启用的工具列表
        this.settings = settings;
        this.initializeTools();
    }
    initializeTools() {
        try {
            console.log('[MCPServer] Initializing tools...');
            this.tools.scene = new scene_tools_1.SceneTools();
            this.tools.node = new node_tools_1.NodeTools();
            this.tools.component = new component_tools_1.ComponentTools();
            this.tools.prefab = new prefab_tools_1.PrefabTools();
            this.tools.project = new project_tools_1.ProjectTools();
            this.tools.debug = new debug_tools_1.DebugTools();
            this.tools.preferences = new preferences_tools_1.PreferencesTools();
            this.tools.server = new server_tools_1.ServerTools();
            this.tools.broadcast = new broadcast_tools_1.BroadcastTools();
            this.tools.sceneAdvanced = new scene_advanced_tools_1.SceneAdvancedTools();
            this.tools.sceneView = new scene_view_tools_1.SceneViewTools();
            this.tools.referenceImage = new reference_image_tools_1.ReferenceImageTools();
            this.tools.assetAdvanced = new asset_advanced_tools_1.AssetAdvancedTools();
            this.tools.validation = new validation_tools_1.ValidationTools();
            console.log('[MCPServer] Tools initialized successfully');
        }
        catch (error) {
            console.error('[MCPServer] Error initializing tools:', error);
            throw error;
        }
    }
    async start() {
        if (this.httpServer) {
            console.log('[MCPServer] Server is already running');
            return;
        }
        try {
            console.log(`[MCPServer] Starting HTTP server on port ${this.settings.port}...`);
            this.httpServer = http.createServer(this.handleHttpRequest.bind(this));
            await new Promise((resolve, reject) => {
                this.httpServer.listen(this.settings.port, '127.0.0.1', () => {
                    console.log(`[MCPServer] ✅ HTTP server started successfully on http://127.0.0.1:${this.settings.port}`);
                    console.log(`[MCPServer] Health check: http://127.0.0.1:${this.settings.port}/health`);
                    console.log(`[MCPServer] MCP endpoint: http://127.0.0.1:${this.settings.port}/mcp`);
                    resolve();
                });
                this.httpServer.on('error', (err) => {
                    console.error('[MCPServer] ❌ Failed to start server:', err);
                    if (err.code === 'EADDRINUSE') {
                        console.error(`[MCPServer] Port ${this.settings.port} is already in use. Please change the port in settings.`);
                    }
                    reject(err);
                });
            });
            this.setupTools();
            console.log('[MCPServer] 🚀 MCP Server is ready for connections');
        }
        catch (error) {
            console.error('[MCPServer] ❌ Failed to start server:', error);
            throw error;
        }
    }
    setupTools() {
        this.toolsList = [];
        // 如果没有启用工具配置，返回所有工具
        if (!this.enabledTools || this.enabledTools.length === 0) {
            for (const [category, toolSet] of Object.entries(this.tools)) {
                const tools = toolSet.getTools();
                for (const tool of tools) {
                    this.toolsList.push({
                        name: `${category}_${tool.name}`,
                        description: tool.description,
                        inputSchema: tool.inputSchema
                    });
                }
            }
        }
        else {
            // 根据启用的工具配置过滤
            const enabledToolNames = new Set(this.enabledTools.map(tool => `${tool.category}_${tool.name}`));
            for (const [category, toolSet] of Object.entries(this.tools)) {
                const tools = toolSet.getTools();
                for (const tool of tools) {
                    const toolName = `${category}_${tool.name}`;
                    if (enabledToolNames.has(toolName)) {
                        this.toolsList.push({
                            name: toolName,
                            description: tool.description,
                            inputSchema: tool.inputSchema
                        });
                    }
                }
            }
        }
        console.log(`[MCPServer] Setup tools: ${this.toolsList.length} tools available`);
    }
    getFilteredTools(enabledTools) {
        if (!enabledTools || enabledTools.length === 0) {
            return this.toolsList; // 如果没有过滤配置，返回所有工具
        }
        const enabledToolNames = new Set(enabledTools.map(tool => `${tool.category}_${tool.name}`));
        return this.toolsList.filter(tool => enabledToolNames.has(tool.name));
    }
    async executeToolCall(toolName, args) {
        const parts = toolName.split('_');
        const category = parts[0];
        const toolMethodName = parts.slice(1).join('_');
        if (this.tools[category]) {
            return await this.tools[category].execute(toolMethodName, args);
        }
        throw new Error(`Tool ${toolName} not found`);
    }
    getClients() {
        return Array.from(this.clients.values());
    }
    getAvailableTools() {
        return this.toolsList;
    }
    updateEnabledTools(enabledTools) {
        console.log(`[MCPServer] Updating enabled tools: ${enabledTools.length} tools`);
        this.enabledTools = enabledTools;
        this.setupTools(); // 重新设置工具列表
    }
    getSettings() {
        return this.settings;
    }
    async handleHttpRequest(req, res) {
        const parsedUrl = url.parse(req.url || '', true);
        const pathname = parsedUrl.pathname;
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Content-Type', 'application/json');
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        try {
            if (pathname === '/mcp' && req.method === 'POST') {
                await this.handleMCPRequest(req, res);
            }
            else if (pathname === '/health' && req.method === 'GET') {
                res.writeHead(200);
                res.end(JSON.stringify({ status: 'ok', tools: this.toolsList.length }));
            }
            else if ((pathname === null || pathname === void 0 ? void 0 : pathname.startsWith('/api/')) && req.method === 'POST') {
                await this.handleSimpleAPIRequest(req, res, pathname);
            }
            else if (pathname === '/api/tools' && req.method === 'GET') {
                res.writeHead(200);
                res.end(JSON.stringify({ tools: this.getSimplifiedToolsList() }));
            }
            else {
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'Not found' }));
            }
        }
        catch (error) {
            console.error('HTTP request error:', error);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    }
    async handleMCPRequest(req, res) {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                // Enhanced JSON parsing with better error handling
                let message;
                try {
                    message = JSON.parse(body);
                }
                catch (parseError) {
                    // Try to fix common JSON issues
                    const fixedBody = this.fixCommonJsonIssues(body);
                    try {
                        message = JSON.parse(fixedBody);
                        console.log('[MCPServer] Fixed JSON parsing issue');
                    }
                    catch (secondError) {
                        throw new Error(`JSON parsing failed: ${parseError.message}. Original body: ${body.substring(0, 500)}...`);
                    }
                }
                const response = await this.handleMessage(message);
                res.writeHead(200);
                res.end(JSON.stringify(response));
            }
            catch (error) {
                console.error('Error handling MCP request:', error);
                res.writeHead(400);
                res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    id: null,
                    error: {
                        code: -32700,
                        message: `Parse error: ${error.message}`
                    }
                }));
            }
        });
    }
    async handleMessage(message) {
        const { id, method, params } = message;
        try {
            let result;
            switch (method) {
                case 'tools/list':
                    result = { tools: this.getAvailableTools() };
                    break;
                case 'tools/call':
                    const { name, arguments: args } = params;
                    const toolResult = await this.executeToolCall(name, args);
                    result = { content: [{ type: 'text', text: JSON.stringify(toolResult) }] };
                    break;
                case 'initialize':
                    // MCP initialization
                    result = {
                        protocolVersion: '2024-11-05',
                        capabilities: {
                            tools: {}
                        },
                        serverInfo: {
                            name: 'cocos-mcp-server',
                            version: '1.0.0'
                        }
                    };
                    break;
                default:
                    throw new Error(`Unknown method: ${method}`);
            }
            return {
                jsonrpc: '2.0',
                id,
                result
            };
        }
        catch (error) {
            return {
                jsonrpc: '2.0',
                id,
                error: {
                    code: -32603,
                    message: error.message
                }
            };
        }
    }
    fixCommonJsonIssues(jsonStr) {
        let fixed = jsonStr;
        // Fix common escape character issues
        fixed = fixed
            // Fix unescaped quotes in strings
            .replace(/([^\\])"([^"]*[^\\])"([^,}\]:])/g, '$1\\"$2\\"$3')
            // Fix unescaped backslashes
            .replace(/([^\\])\\([^"\\\/bfnrt])/g, '$1\\\\$2')
            // Fix trailing commas
            .replace(/,(\s*[}\]])/g, '$1')
            // Fix single quotes (should be double quotes)
            .replace(/'/g, '"')
            // Fix common control characters
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
        return fixed;
    }
    stop() {
        if (this.httpServer) {
            this.httpServer.close();
            this.httpServer = null;
            console.log('[MCPServer] HTTP server stopped');
        }
        this.clients.clear();
    }
    getStatus() {
        return {
            running: !!this.httpServer,
            port: this.settings.port,
            clients: 0 // HTTP is stateless, no persistent clients
        };
    }
    async handleSimpleAPIRequest(req, res, pathname) {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                // Extract tool name from path like /api/node/set_position
                const pathParts = pathname.split('/').filter(p => p);
                if (pathParts.length < 3) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid API path. Use /api/{category}/{tool_name}' }));
                    return;
                }
                const category = pathParts[1];
                const toolName = pathParts[2];
                const fullToolName = `${category}_${toolName}`;
                // Parse parameters with enhanced error handling
                let params;
                try {
                    params = body ? JSON.parse(body) : {};
                }
                catch (parseError) {
                    // Try to fix JSON issues
                    const fixedBody = this.fixCommonJsonIssues(body);
                    try {
                        params = JSON.parse(fixedBody);
                        console.log('[MCPServer] Fixed API JSON parsing issue');
                    }
                    catch (secondError) {
                        res.writeHead(400);
                        res.end(JSON.stringify({
                            error: 'Invalid JSON in request body',
                            details: parseError.message,
                            receivedBody: body.substring(0, 200)
                        }));
                        return;
                    }
                }
                // Execute tool
                const result = await this.executeToolCall(fullToolName, params);
                res.writeHead(200);
                res.end(JSON.stringify({
                    success: true,
                    tool: fullToolName,
                    result: result
                }));
            }
            catch (error) {
                console.error('Simple API error:', error);
                res.writeHead(500);
                res.end(JSON.stringify({
                    success: false,
                    error: error.message,
                    tool: pathname
                }));
            }
        });
    }
    getSimplifiedToolsList() {
        return this.toolsList.map(tool => {
            const parts = tool.name.split('_');
            const category = parts[0];
            const toolName = parts.slice(1).join('_');
            return {
                name: tool.name,
                category: category,
                toolName: toolName,
                description: tool.description,
                apiPath: `/api/${category}/${toolName}`,
                curlExample: this.generateCurlExample(category, toolName, tool.inputSchema)
            };
        });
    }
    generateCurlExample(category, toolName, schema) {
        // Generate sample parameters based on schema
        const sampleParams = this.generateSampleParams(schema);
        const jsonString = JSON.stringify(sampleParams, null, 2);
        return `curl -X POST http://127.0.0.1:8585/api/${category}/${toolName} \\
  -H "Content-Type: application/json" \\
  -d '${jsonString}'`;
    }
    generateSampleParams(schema) {
        if (!schema || !schema.properties)
            return {};
        const sample = {};
        for (const [key, prop] of Object.entries(schema.properties)) {
            const propSchema = prop;
            switch (propSchema.type) {
                case 'string':
                    sample[key] = propSchema.default || 'example_string';
                    break;
                case 'number':
                    sample[key] = propSchema.default || 42;
                    break;
                case 'boolean':
                    sample[key] = propSchema.default || true;
                    break;
                case 'object':
                    sample[key] = propSchema.default || { x: 0, y: 0, z: 0 };
                    break;
                default:
                    sample[key] = 'example_value';
            }
        }
        return sample;
    }
    updateSettings(settings) {
        this.settings = settings;
        if (this.httpServer) {
            this.stop();
            this.start();
        }
    }
}
exports.MCPServer = MCPServer;
// HTTP transport doesn't need persistent connections
// MCP over HTTP uses request-response pattern
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tY3Atc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBQTZCO0FBQzdCLHlDQUEyQjtBQUczQixxREFBaUQ7QUFDakQsbURBQStDO0FBQy9DLDZEQUF5RDtBQUN6RCx1REFBbUQ7QUFDbkQseURBQXFEO0FBQ3JELHFEQUFpRDtBQUNqRCxpRUFBNkQ7QUFDN0QsdURBQW1EO0FBQ25ELDZEQUF5RDtBQUN6RCx1RUFBa0U7QUFDbEUsK0RBQTBEO0FBQzFELHlFQUFvRTtBQUNwRSx1RUFBa0U7QUFDbEUsK0RBQTJEO0FBRTNELE1BQWEsU0FBUztJQVFsQixZQUFZLFFBQTJCO1FBTi9CLGVBQVUsR0FBdUIsSUFBSSxDQUFDO1FBQ3RDLFlBQU8sR0FBMkIsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUM1QyxVQUFLLEdBQXdCLEVBQUUsQ0FBQztRQUNoQyxjQUFTLEdBQXFCLEVBQUUsQ0FBQztRQUNqQyxpQkFBWSxHQUFVLEVBQUUsQ0FBQyxDQUFDLFlBQVk7UUFHMUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO0lBQzNCLENBQUM7SUFFTyxlQUFlO1FBQ25CLElBQUksQ0FBQztZQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsbUNBQW1DLENBQUMsQ0FBQztZQUNqRCxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxJQUFJLHdCQUFVLEVBQUUsQ0FBQztZQUNwQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLHNCQUFTLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxJQUFJLGdDQUFjLEVBQUUsQ0FBQztZQUM1QyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLDBCQUFXLEVB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SyxTQUFTO29CQUNWLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxVQUFVLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQztvQkFDekMsTUFBTTtnQkFDVixLQUFLLFFBQVE7b0JBQ1QsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO29CQUN6RCxNQUFNO2dCQUNWO29CQUNJLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxlQUFlLENBQUM7WUFDdEMsQ0FBQztRQUNMLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNsQixDQUFDO0lBRU0sY0FBYyxDQUFDLFFBQTJCO1FBQzdDLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNaLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNqQixDQUFDO0lBQ0wsQ0FBQztDQUNKO0FBdGJELDhCQXNiQztBQUVELHFEQUFxRDtBQUNyRCw4Q0FBOEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBodHRwIGZyb20gJ2h0dHAnO1xyXG5pbXBvcnQgKiBhcyB1cmwgZnJvbSAndXJsJztcclxuaW1wb3J0IHsgdjQgYXMgdXVpZHY0IH0gZnJvbSAndXVpZCc7XHJcbmltcG9ydCB7IE1DUFNlcnZlclNldHRpbmdzLCBTZXJ2ZXJTdGF0dXMsIE1DUENsaWVudCwgVG9vbERlZmluaXRpb24gfSBmcm9tICcuL3R5cGVzJztcclxuaW1wb3J0IHsgU2NlbmVUb29scyB9IGZyb20gJy4vdG9vbHMvc2NlbmUtdG9vbHMnO1xyXG5pbXBvcnQgeyBOb2RlVG9vbHMgfSBmcm9tICcuL3Rvb2xzL25vZGUtdG9vbHMnO1xyXG5pbXBvcnQgeyBDb21wb25lbnRUb29scyB9IGZyb20gJy4vdG9vbHMvY29tcG9uZW50LXRvb2xzJztcclxuaW1wb3J0IHsgUHJlZmFiVG9vbHMgfSBmcm9tICcuL3Rvb2xzL3ByZWZhYi10b29scyc7XHJcbmltcG9ydCB7IFByb2plY3RUb29scyB9IGZyb20gJy4vdG9vbHMvcHJvamVjdC10b29scyc7XHJcbmltcG9ydCB7IERlYnVnVG9vbHMgfSBmcm9tICcuL3Rvb2xzL2RlYnVnLXRvb2xzJztcclxuaW1wb3J0IHsgUHJlZmVyZW5jZXNUb29scyB9IGZyb20gJy4vdG9vbHMvcHJlZmVyZW5jZXMtdG9vbHMnO1xyXG5pbXBvcnQgeyBTZXJ2ZXJUb29scyB9IGZyb20gJy4vdG9vbHMvc2VydmVyLXRvb2xzJztcclxuaW1wb3J0IHsgQnJvYWRjYXN0VG9vbHMgfSBmcm9tICcuL3Rvb2xzL2Jyb2FkY2FzdC10b29scyc7XHJcbmltcG9ydCB7IFNjZW5lQWR2YW5jZWRUb29scyB9IGZyb20gJy4vdG9vbHMvc2NlbmUtYWR2YW5jZWQtdG9vbHMnO1xyXG5pbXBvcnQgeyBTY2VuZVZpZXdUb29scyB9IGZyb20gJy4vdG9vbHMvc2NlbmUtdmlldy10b29scyc7XHJcbmltcG9ydCB7IFJlZmVyZW5jZUltYWdlVG9vbHMgfSBmcm9tICcuL3Rvb2xzL3JlZmVyZW5jZS1pbWFnZS10b29scyc7XHJcbmltcG9ydCB7IEFzc2V0QWR2YW5jZWRUb29scyB9IGZyb20gJy4vdG9vbHMvYXNzZXQtYWR2YW5jZWQtdG9vbHMnO1xyXG5pbXBvcnQgeyBWYWxpZGF0aW9uVG9vbHMgfSBmcm9tICcuL3Rvb2xzL3ZhbGlkYXRpb24tdG9vbHMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIE1DUFNlcnZlciB7XHJcbiAgICBwcml2YXRlIHNldHRpbmdzOiBNQ1BTZXJ2ZXJTZXR0aW5ncztcclxuICAgIHByaXZhdGUgaHR0cFNlcnZlcjogaHR0cC5TZXJ2ZXIgfCBudWxsID0gbnVsbDtcclxuICAgIHByaXZhdGUgY2xpZW50czogTWFwPHN0cmluZywgTUNQQ2xpZW50PiA9IG5ldyBNYXAoKTtcclxuICAgIHByaXZhdGUgdG9vbHM6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcclxuICAgIHByaXZhdGUgdG9vbHNMaXN0OiBUb29sRGVmaW5pdGlvbltdID0gW107XHJcbiAgICBwcml2YXRlIGVuYWJsZWRUb29sczogYW55W10gPSBbXTsgLy8g5a2Y5YKo5ZCv55So55qE5bel5YW35YiX6KGoXHJcblxyXG4gICAgY29uc3RydWN0b3Ioc2V0dGluZ3M6IE1DUFNlcnZlclNldHRpbmdzKSB7XHJcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xyXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVRvb2xzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBpbml0aWFsaXplVG9vbHMoKTogdm9pZCB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tNQ1BTZXJ2ZXJdIEluaXRpYWxpemluZyB0b29scy4uLicpO1xyXG4gICAgICAgICAgICB0aGlzLnRvb2xzLnNjZW5lID0gbmV3IFNjZW5lVG9vbHMoKTtcclxuICAgICAgICAgICAgdGhpcy50b29scy5ub2RlID0gbmV3IE5vZGVUb29scygpO1xyXG4gICAgICAgICAgICB0aGlzLnRvb2xzLmNvbXBvbmVudCA9IG5ldyBDb21wb25lbnRUb29scygpO1xyXG4gICAgICAgICAgICB0aGlzLnRvb2xzLnByZWZhYiA9IG5ldyBQcmVmYWJUb29scygpO1xyXG4gICAgICAgICAgICB0aGlzLnRvb2xzLnByb2plY3QgPSBuZXcgUHJvamVjdFRvb2xzKCk7XHJcbiAgICAgICAgICAgIHRoaXMudG9vbHMuZGVidWcgPSBuZXcgRGVidWdUb29scygpO1xyXG4gICAgICAgICAgICB0aGlzLnRvb2xzLnByZWZlcmVuY2VzID0gbmV3IFByZWZlcmVuY2VzVG9vbHMoKTtcclxuICAgICAgICAgICAgdGhpcy50b29scy5zZXJ2ZXIgPSBuZXcgU2VydmVyVG9vbHMoKTtcclxuICAgICAgICAgICAgdGhpcy50b29scy5icm9hZGNhc3QgPSBuZXcgQnJvYWRjYXN0VG9vbHMoKTtcclxuICAgICAgICAgICAgdGhpcy50b29scy5zY2VuZUFkdmFuY2VkID0gbmV3IFNjZW5lQWR2YW5jZWRUb29scygpO1xyXG4gICAgICAgICAgICB0aGlzLnRvb2xzLnNjZW5lVmlldyA9IG5ldyBTY2VuZVZpZXdUb29scygpO1xyXG4gICAgICAgICAgICB0aGlzLnRvb2xzLnJlZmVyZW5jZUltYWdlID0gbmV3IFJlZmVyZW5jZUltYWdlVG9vbHMoKTtcclxuICAgICAgICAgICAgdGhpcy50b29scy5hc3NldEFkdmFuY2VkID0gbmV3IEFzc2V0QWR2YW5jZWRUb29scygpO1xyXG4gICAgICAgICAgICB0aGlzLnRvb2xzLnZhbGlkYXRpb24gPSBuZXcgVmFsaWRhdGlvblRvb2xzKCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTUNQU2VydmVyXSBUb29scyBpbml0aWFsaXplZCBzdWNjZXNzZnVsbHknKTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbTUNQU2VydmVyXSBFcnJvciBpbml0aWFsaXppbmcgdG9vbHM6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGFzeW5jIHN0YXJ0KCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgIGlmICh0aGlzLmh0dHBTZXJ2ZXIpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tNQ1BTZXJ2ZXJdIFNlcnZlciBpcyBhbHJlYWR5IHJ1bm5pbmcnKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYFtNQ1BTZXJ2ZXJdIFN0YXJ0aW5nIEhUVFAgc2VydmVyIG9uIHBvcnQgJHt0aGlzLnNldHRpbmdzLnBvcnR9Li4uYCk7XHJcbiAgICAgICAgICAgIHRoaXMuaHR0cFNlcnZlciA9IGh0dHAuY3JlYXRlU2VydmVyKHRoaXMuaGFuZGxlSHR0cFJlcXVlc3QuYmluZCh0aGlzKSk7XHJcblxyXG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmh0dHBTZXJ2ZXIhLmxpc3Rlbih0aGlzLnNldHRpbmdzLnBvcnQsICcxMjcuMC4wLjEnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtNQ1BTZXJ2ZXJdIOKchSBIVFRQIHNlcnZlciBzdGFydGVkIHN1Y2Nlc3NmdWxseSBvbiBodHRwOi8vMTI3LjAuMC4xOiR7dGhpcy5zZXR0aW5ncy5wb3J0fWApO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbTUNQU2VydmVyXSBIZWFsdGggY2hlY2s6IGh0dHA6Ly8xMjcuMC4wLjE6JHt0aGlzLnNldHRpbmdzLnBvcnR9L2hlYWx0aGApO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbTUNQU2VydmVyXSBNQ1AgZW5kcG9pbnQ6IGh0dHA6Ly8xMjcuMC4wLjE6JHt0aGlzLnNldHRpbmdzLnBvcnR9L21jcGApO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyIS5vbignZXJyb3InLCAoZXJyOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbTUNQU2VydmVyXSDinYwgRmFpbGVkIHRvIHN0YXJ0IHNlcnZlcjonLCBlcnIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIuY29kZSA9PT0gJ0VBRERSSU5VU0UnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYFtNQ1BTZXJ2ZXJdIFBvcnQgJHt0aGlzLnNldHRpbmdzLnBvcnR9IGlzIGFscmVhZHkgaW4gdXNlLiBQbGVhc2UgY2hhbmdlIHRoZSBwb3J0IGluIHNldHRpbmdzLmApO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2V0dXBUb29scygpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW01DUFNlcnZlcl0g8J+agCBNQ1AgU2VydmVyIGlzIHJlYWR5IGZvciBjb25uZWN0aW9ucycpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tNQ1BTZXJ2ZXJdIOKdjCBGYWlsZWQgdG8gc3RhcnQgc2VydmVyOicsIGVycm9yKTtcclxuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc2V0dXBUb29scygpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLnRvb2xzTGlzdCA9IFtdO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOWmguaenOayoeacieWQr+eUqOW3peWFt+mFjee9ru+8jOi/lOWbnuaJgOacieW3peWFt1xyXG4gICAgICAgIGlmICghdGhpcy5lbmFibGVkVG9vbHMgfHwgdGhpcy5lbmFibGVkVG9vbHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgW2NhdGVnb3J5LCB0b29sU2V0XSBvZiBPYmplY3QuZW50cmllcyh0aGlzLnRvb2xzKSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdG9vbHMgPSB0b29sU2V0LmdldFRvb2xzKCk7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHRvb2wgb2YgdG9vbHMpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRvb2xzTGlzdC5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogYCR7Y2F0ZWdvcnl9XyR7dG9vbC5uYW1lfWAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB0b29sLmRlc2NyaXB0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogdG9vbC5pbnB1dFNjaGVtYVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8g5qC55o2u5ZCv55So55qE5bel5YW36YWN572u6L+H5rukXHJcbiAgICAgICAgICAgIGNvbnN0IGVuYWJsZWRUb29sTmFtZXMgPSBuZXcgU2V0KHRoaXMuZW5hYmxlZFRvb2xzLm1hcCh0b29sID0+IGAke3Rvb2wuY2F0ZWdvcnl9XyR7dG9vbC5uYW1lfWApKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgW2NhdGVnb3J5LCB0b29sU2V0XSBvZiBPYmplY3QuZW50cmllcyh0aGlzLnRvb2xzKSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdG9vbHMgPSB0b29sU2V0LmdldFRvb2xzKCk7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHRvb2wgb2YgdG9vbHMpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0b29sTmFtZSA9IGAke2NhdGVnb3J5fV8ke3Rvb2wubmFtZX1gO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlbmFibGVkVG9vbE5hbWVzLmhhcyh0b29sTmFtZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50b29sc0xpc3QucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiB0b29sTmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB0b29sLmRlc2NyaXB0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHRvb2wuaW5wdXRTY2hlbWFcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnNvbGUubG9nKGBbTUNQU2VydmVyXSBTZXR1cCB0b29sczogJHt0aGlzLnRvb2xzTGlzdC5sZW5ndGh9IHRvb2xzIGF2YWlsYWJsZWApO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXRGaWx0ZXJlZFRvb2xzKGVuYWJsZWRUb29sczogYW55W10pOiBUb29sRGVmaW5pdGlvbltdIHtcclxuICAgICAgICBpZiAoIWVuYWJsZWRUb29scyB8fCBlbmFibGVkVG9vbHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRvb2xzTGlzdDsgLy8g5aaC5p6c5rKh5pyJ6L+H5ruk6YWN572u77yM6L+U5Zue5omA5pyJ5bel5YW3XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBlbmFibGVkVG9vbE5hbWVzID0gbmV3IFNldChlbmFibGVkVG9vbHMubWFwKHRvb2wgPT4gYCR7dG9vbC5jYXRlZ29yeX1fJHt0b29sLm5hbWV9YCkpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLnRvb2xzTGlzdC5maWx0ZXIodG9vbCA9PiBlbmFibGVkVG9vbE5hbWVzLmhhcyh0b29sLm5hbWUpKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgYXN5bmMgZXhlY3V0ZVRvb2xDYWxsKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8YW55PiB7XHJcbiAgICAgICAgY29uc3QgcGFydHMgPSB0b29sTmFtZS5zcGxpdCgnXycpO1xyXG4gICAgICAgIGNvbnN0IGNhdGVnb3J5ID0gcGFydHNbMF07XHJcbiAgICAgICAgY29uc3QgdG9vbE1ldGhvZE5hbWUgPSBwYXJ0cy5zbGljZSgxKS5qb2luKCdfJyk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKHRoaXMudG9vbHNbY2F0ZWdvcnldKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnRvb2xzW2NhdGVnb3J5XS5leGVjdXRlKHRvb2xNZXRob2ROYW1lLCBhcmdzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUb29sICR7dG9vbE5hbWV9IG5vdCBmb3VuZGApO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXRDbGllbnRzKCk6IE1DUENsaWVudFtdIHtcclxuICAgICAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLmNsaWVudHMudmFsdWVzKCkpO1xyXG4gICAgfVxyXG4gICAgcHVibGljIGdldEF2YWlsYWJsZVRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnRvb2xzTGlzdDtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgdXBkYXRlRW5hYmxlZFRvb2xzKGVuYWJsZWRUb29sczogYW55W10pOiB2b2lkIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgW01DUFNlcnZlcl0gVXBkYXRpbmcgZW5hYmxlZCB0b29sczogJHtlbmFibGVkVG9vbHMubGVuZ3RofSB0b29sc2ApO1xyXG4gICAgICAgIHRoaXMuZW5hYmxlZFRvb2xzID0gZW5hYmxlZFRvb2xzO1xyXG4gICAgICAgIHRoaXMuc2V0dXBUb29scygpOyAvLyDph43mlrDorr7nva7lt6XlhbfliJfooahcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0U2V0dGluZ3MoKTogTUNQU2VydmVyU2V0dGluZ3Mge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlSHR0cFJlcXVlc3QocmVxOiBodHRwLkluY29taW5nTWVzc2FnZSwgcmVzOiBodHRwLlNlcnZlclJlc3BvbnNlKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgY29uc3QgcGFyc2VkVXJsID0gdXJsLnBhcnNlKHJlcS51cmwgfHwgJycsIHRydWUpO1xyXG4gICAgICAgIGNvbnN0IHBhdGhuYW1lID0gcGFyc2VkVXJsLnBhdGhuYW1lO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFNldCBDT1JTIGhlYWRlcnNcclxuICAgICAgICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nLCAnKicpO1xyXG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnLCAnR0VULCBQT1NULCBPUFRJT05TJyk7XHJcbiAgICAgICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycycsICdDb250ZW50LVR5cGUsIEF1dGhvcml6YXRpb24nKTtcclxuICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnT1BUSU9OUycpIHtcclxuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xyXG4gICAgICAgICAgICByZXMuZW5kKCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKHBhdGhuYW1lID09PSAnL21jcCcgJiYgcmVxLm1ldGhvZCA9PT0gJ1BPU1QnKSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmhhbmRsZU1DUFJlcXVlc3QocmVxLCByZXMpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhdGhuYW1lID09PSAnL2hlYWx0aCcgJiYgcmVxLm1ldGhvZCA9PT0gJ0dFVCcpIHtcclxuICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwKTtcclxuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdGF0dXM6ICdvaycsIHRvb2xzOiB0aGlzLnRvb2xzTGlzdC5sZW5ndGggfSkpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhdGhuYW1lPy5zdGFydHNXaXRoKCcvYXBpLycpICYmIHJlcS5tZXRob2QgPT09ICdQT1NUJykge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5oYW5kbGVTaW1wbGVBUElSZXF1ZXN0KHJlcSwgcmVzLCBwYXRobmFtZSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGF0aG5hbWUgPT09ICcvYXBpL3Rvb2xzJyAmJiByZXEubWV0aG9kID09PSAnR0VUJykge1xyXG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHRvb2xzOiB0aGlzLmdldFNpbXBsaWZpZWRUb29sc0xpc3QoKSB9KSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwNCk7XHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdOb3QgZm91bmQnIH0pKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0hUVFAgcmVxdWVzdCBlcnJvcjonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNTAwKTtcclxuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnSW50ZXJuYWwgc2VydmVyIGVycm9yJyB9KSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICBwcml2YXRlIGFzeW5jIGhhbmRsZU1DUFJlcXVlc3QocmVxOiBodHRwLkluY29taW5nTWVzc2FnZSwgcmVzOiBodHRwLlNlcnZlclJlc3BvbnNlKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgbGV0IGJvZHkgPSAnJztcclxuICAgICAgICBcclxuICAgICAgICByZXEub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcclxuICAgICAgICAgICAgYm9keSArPSBjaHVuay50b1N0cmluZygpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJlcS5vbignZW5kJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgLy8gRW5oYW5jZWQgSlNPTiBwYXJzaW5nIHdpdGggYmV0dGVyIGVycm9yIGhhbmRsaW5nXHJcbiAgICAgICAgICAgICAgICBsZXQgbWVzc2FnZTtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IEpTT04ucGFyc2UoYm9keSk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChwYXJzZUVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBUcnkgdG8gZml4IGNvbW1vbiBKU09OIGlzc3Vlc1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpeGVkQm9keSA9IHRoaXMuZml4Q29tbW9uSnNvbklzc3Vlcyhib2R5KTtcclxuICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gSlNPTi5wYXJzZShmaXhlZEJvZHkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW01DUFNlcnZlcl0gRml4ZWQgSlNPTiBwYXJzaW5nIGlzc3VlJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoc2Vjb25kRXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBKU09OIHBhcnNpbmcgZmFpbGVkOiAke3BhcnNlRXJyb3IubWVzc2FnZX0uIE9yaWdpbmFsIGJvZHk6ICR7Ym9keS5zdWJzdHJpbmcoMCwgNTAwKX0uLi5gKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5oYW5kbGVNZXNzYWdlKG1lc3NhZ2UpO1xyXG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeShyZXNwb25zZSkpO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBoYW5kbGluZyBNQ1AgcmVxdWVzdDonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCk7XHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcclxuICAgICAgICAgICAgICAgICAgICBpZDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiAtMzI3MDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBQYXJzZSBlcnJvcjogJHtlcnJvci5tZXNzYWdlfWBcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGhhbmRsZU1lc3NhZ2UobWVzc2FnZTogYW55KTogUHJvbWlzZTxhbnk+IHtcclxuICAgICAgICBjb25zdCB7IGlkLCBtZXRob2QsIHBhcmFtcyB9ID0gbWVzc2FnZTtcclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgbGV0IHJlc3VsdDogYW55O1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoIChtZXRob2QpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgJ3Rvb2xzL2xpc3QnOlxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHsgdG9vbHM6IHRoaXMuZ2V0QXZhaWxhYmxlVG9vbHMoKSB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAndG9vbHMvY2FsbCc6XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBuYW1lLCBhcmd1bWVudHM6IGFyZ3MgfSA9IHBhcmFtcztcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0b29sUmVzdWx0ID0gYXdhaXQgdGhpcy5leGVjdXRlVG9vbENhbGwobmFtZSwgYXJncyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0geyBjb250ZW50OiBbeyB0eXBlOiAndGV4dCcsIHRleHQ6IEpTT04uc3RyaW5naWZ5KHRvb2xSZXN1bHQpIH1dIH07XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdpbml0aWFsaXplJzpcclxuICAgICAgICAgICAgICAgICAgICAvLyBNQ1AgaW5pdGlhbGl6YXRpb25cclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3RvY29sVmVyc2lvbjogJzIwMjQtMTEtMDUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXBhYmlsaXRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xzOiB7fVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXJ2ZXJJbmZvOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiAnY29jb3MtbWNwLXNlcnZlcicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uOiAnMS4wLjAnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gbWV0aG9kOiAke21ldGhvZH1gKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxyXG4gICAgICAgICAgICAgICAgaWQsXHJcbiAgICAgICAgICAgICAgICByZXN1bHRcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcclxuICAgICAgICAgICAgICAgIGlkLFxyXG4gICAgICAgICAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb2RlOiAtMzI2MDMsXHJcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGZpeENvbW1vbkpzb25Jc3N1ZXMoanNvblN0cjogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgICAgICBsZXQgZml4ZWQgPSBqc29uU3RyO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEZpeCBjb21tb24gZXNjYXBlIGNoYXJhY3RlciBpc3N1ZXNcclxuICAgICAgICBmaXhlZCA9IGZpeGVkXHJcbiAgICAgICAgICAgIC8vIEZpeCB1bmVzY2FwZWQgcXVvdGVzIGluIHN0cmluZ3NcclxuICAgICAgICAgICAgLnJlcGxhY2UoLyhbXlxcXFxdKVwiKFteXCJdKlteXFxcXF0pXCIoW14sfVxcXTpdKS9nLCAnJDFcXFxcXCIkMlxcXFxcIiQzJylcclxuICAgICAgICAgICAgLy8gRml4IHVuZXNjYXBlZCBiYWNrc2xhc2hlc1xyXG4gICAgICAgICAgICAucmVwbGFjZSgvKFteXFxcXF0pXFxcXChbXlwiXFxcXFxcL2JmbnJ0XSkvZywgJyQxXFxcXFxcXFwkMicpXHJcbiAgICAgICAgICAgIC8vIEZpeCB0cmFpbGluZyBjb21tYXNcclxuICAgICAgICAgICAgLnJlcGxhY2UoLywoXFxzKlt9XFxdXSkvZywgJyQxJylcclxuICAgICAgICAgICAgLy8gRml4IHNpbmdsZSBxdW90ZXMgKHNob3VsZCBiZSBkb3VibGUgcXVvdGVzKVxyXG4gICAgICAgICAgICAucmVwbGFjZSgvJy9nLCAnXCInKVxyXG4gICAgICAgICAgICAvLyBGaXggY29tbW9uIGNvbnRyb2wgY2hhcmFjdGVyc1xyXG4gICAgICAgICAgICAucmVwbGFjZSgvXFxuL2csICdcXFxcbicpXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cXHIvZywgJ1xcXFxyJylcclxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcdC9nLCAnXFxcXHQnKTtcclxuICAgICAgICBcclxuICAgICAgICByZXR1cm4gZml4ZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHN0b3AoKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKHRoaXMuaHR0cFNlcnZlcikge1xyXG4gICAgICAgICAgICB0aGlzLmh0dHBTZXJ2ZXIuY2xvc2UoKTtcclxuICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyID0gbnVsbDtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tNQ1BTZXJ2ZXJdIEhUVFAgc2VydmVyIHN0b3BwZWQnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY2xpZW50cy5jbGVhcigpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXRTdGF0dXMoKTogU2VydmVyU3RhdHVzIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBydW5uaW5nOiAhIXRoaXMuaHR0cFNlcnZlcixcclxuICAgICAgICAgICAgcG9ydDogdGhpcy5zZXR0aW5ncy5wb3J0LFxyXG4gICAgICAgICAgICBjbGllbnRzOiAwIC8vIEhUVFAgaXMgc3RhdGVsZXNzLCBubyBwZXJzaXN0ZW50IGNsaWVudHNcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlU2ltcGxlQVBJUmVxdWVzdChyZXE6IGh0dHAuSW5jb21pbmdNZXNzYWdlLCByZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UsIHBhdGhuYW1lOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICBsZXQgYm9keSA9ICcnO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJlcS5vbignZGF0YScsIChjaHVuaykgPT4ge1xyXG4gICAgICAgICAgICBib2R5ICs9IGNodW5rLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmVxLm9uKCdlbmQnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IHRvb2wgbmFtZSBmcm9tIHBhdGggbGlrZSAvYXBpL25vZGUvc2V0X3Bvc2l0aW9uXHJcbiAgICAgICAgICAgICAgICBjb25zdCBwYXRoUGFydHMgPSBwYXRobmFtZS5zcGxpdCgnLycpLmZpbHRlcihwID0+IHApO1xyXG4gICAgICAgICAgICAgICAgaWYgKHBhdGhQYXJ0cy5sZW5ndGggPCAzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDApO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0ludmFsaWQgQVBJIHBhdGguIFVzZSAvYXBpL3tjYXRlZ29yeX0ve3Rvb2xfbmFtZX0nIH0pKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNhdGVnb3J5ID0gcGF0aFBhcnRzWzFdO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdG9vbE5hbWUgPSBwYXRoUGFydHNbMl07XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmdWxsVG9vbE5hbWUgPSBgJHtjYXRlZ29yeX1fJHt0b29sTmFtZX1gO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyBQYXJzZSBwYXJhbWV0ZXJzIHdpdGggZW5oYW5jZWQgZXJyb3IgaGFuZGxpbmdcclxuICAgICAgICAgICAgICAgIGxldCBwYXJhbXM7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcyA9IGJvZHkgPyBKU09OLnBhcnNlKGJvZHkpIDoge307XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChwYXJzZUVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBUcnkgdG8gZml4IEpTT04gaXNzdWVzXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZml4ZWRCb2R5ID0gdGhpcy5maXhDb21tb25Kc29uSXNzdWVzKGJvZHkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcyA9IEpTT04ucGFyc2UoZml4ZWRCb2R5KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tNQ1BTZXJ2ZXJdIEZpeGVkIEFQSSBKU09OIHBhcnNpbmcgaXNzdWUnKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChzZWNvbmRFcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogJ0ludmFsaWQgSlNPTiBpbiByZXF1ZXN0IGJvZHknLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlsczogcGFyc2VFcnJvci5tZXNzYWdlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjZWl2ZWRCb2R5OiBib2R5LnN1YnN0cmluZygwLCAyMDApXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8gRXhlY3V0ZSB0b29sXHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmV4ZWN1dGVUb29sQ2FsbChmdWxsVG9vbE5hbWUsIHBhcmFtcyk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwKTtcclxuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgdG9vbDogZnVsbFRvb2xOYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDogcmVzdWx0XHJcbiAgICAgICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignU2ltcGxlIEFQSSBlcnJvcjonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDUwMCk7XHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogZXJyb3IubWVzc2FnZSxcclxuICAgICAgICAgICAgICAgICAgICB0b29sOiBwYXRobmFtZVxyXG4gICAgICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRTaW1wbGlmaWVkVG9vbHNMaXN0KCk6IGFueVtdIHtcclxuICAgICAgICByZXR1cm4gdGhpcy50b29sc0xpc3QubWFwKHRvb2wgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBwYXJ0cyA9IHRvb2wubmFtZS5zcGxpdCgnXycpO1xyXG4gICAgICAgICAgICBjb25zdCBjYXRlZ29yeSA9IHBhcnRzWzBdO1xyXG4gICAgICAgICAgICBjb25zdCB0b29sTmFtZSA9IHBhcnRzLnNsaWNlKDEpLmpvaW4oJ18nKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiB0b29sLm5hbWUsXHJcbiAgICAgICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXHJcbiAgICAgICAgICAgICAgICB0b29sTmFtZTogdG9vbE5hbWUsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogdG9vbC5kZXNjcmlwdGlvbixcclxuICAgICAgICAgICAgICAgIGFwaVBhdGg6IGAvYXBpLyR7Y2F0ZWdvcnl9LyR7dG9vbE5hbWV9YCxcclxuICAgICAgICAgICAgICAgIGN1cmxFeGFtcGxlOiB0aGlzLmdlbmVyYXRlQ3VybEV4YW1wbGUoY2F0ZWdvcnksIHRvb2xOYW1lLCB0b29sLmlucHV0U2NoZW1hKVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2VuZXJhdGVDdXJsRXhhbXBsZShjYXRlZ29yeTogc3RyaW5nLCB0b29sTmFtZTogc3RyaW5nLCBzY2hlbWE6IGFueSk6IHN0cmluZyB7XHJcbiAgICAgICAgLy8gR2VuZXJhdGUgc2FtcGxlIHBhcmFtZXRlcnMgYmFzZWQgb24gc2NoZW1hXHJcbiAgICAgICAgY29uc3Qgc2FtcGxlUGFyYW1zID0gdGhpcy5nZW5lcmF0ZVNhbXBsZVBhcmFtcyhzY2hlbWEpO1xyXG4gICAgICAgIGNvbnN0IGpzb25TdHJpbmcgPSBKU09OLnN0cmluZ2lmeShzYW1wbGVQYXJhbXMsIG51bGwsIDIpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiBgY3VybCAtWCBQT1NUIGh0dHA6Ly8xMjcuMC4wLjE6ODU4NS9hcGkvJHtjYXRlZ29yeX0vJHt0b29sTmFtZX0gXFxcXFxyXG4gIC1IIFwiQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi9qc29uXCIgXFxcXFxyXG4gIC1kICcke2pzb25TdHJpbmd9J2A7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZW5lcmF0ZVNhbXBsZVBhcmFtcyhzY2hlbWE6IGFueSk6IGFueSB7XHJcbiAgICAgICAgaWYgKCFzY2hlbWEgfHwgIXNjaGVtYS5wcm9wZXJ0aWVzKSByZXR1cm4ge307XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3Qgc2FtcGxlOiBhbnkgPSB7fTtcclxuICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHByb3BdIG9mIE9iamVjdC5lbnRyaWVzKHNjaGVtYS5wcm9wZXJ0aWVzIGFzIGFueSkpIHtcclxuICAgICAgICAgICAgY29uc3QgcHJvcFNjaGVtYSA9IHByb3AgYXMgYW55O1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHByb3BTY2hlbWEudHlwZSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcclxuICAgICAgICAgICAgICAgICAgICBzYW1wbGVba2V5XSA9IHByb3BTY2hlbWEuZGVmYXVsdCB8fCAnZXhhbXBsZV9zdHJpbmcnO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAnbnVtYmVyJzpcclxuICAgICAgICAgICAgICAgICAgICBzYW1wbGVba2V5XSA9IHByb3BTY2hlbWEuZGVmYXVsdCB8fCA0MjtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxyXG4gICAgICAgICAgICAgICAgICAgIHNhbXBsZVtrZXldID0gcHJvcFNjaGVtYS5kZWZhdWx0IHx8IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdvYmplY3QnOlxyXG4gICAgICAgICAgICAgICAgICAgIHNhbXBsZVtrZXldID0gcHJvcFNjaGVtYS5kZWZhdWx0IHx8IHsgeDogMCwgeTogMCwgejogMCB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBzYW1wbGVba2V5XSA9ICdleGFtcGxlX3ZhbHVlJztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gc2FtcGxlO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyB1cGRhdGVTZXR0aW5ncyhzZXR0aW5nczogTUNQU2VydmVyU2V0dGluZ3MpIHtcclxuICAgICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XHJcbiAgICAgICAgaWYgKHRoaXMuaHR0cFNlcnZlcikge1xyXG4gICAgICAgICAgICB0aGlzLnN0b3AoKTtcclxuICAgICAgICAgICAgdGhpcy5zdGFydCgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuLy8gSFRUUCB0cmFuc3BvcnQgZG9lc24ndCBuZWVkIHBlcnNpc3RlbnQgY29ubmVjdGlvbnNcclxuLy8gTUNQIG92ZXIgSFRUUCB1c2VzIHJlcXVlc3QtcmVzcG9uc2UgcGF0dGVybiJdfQ==