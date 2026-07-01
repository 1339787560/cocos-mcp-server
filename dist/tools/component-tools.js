"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentTools = void 0;
const compat_1 = require("../utils/compat");
class ComponentTools {
    getTools() {
        return [
            {
                name: 'add_component',
                description: 'Add a component to a specific node. IMPORTANT: You must provide the nodeUuid parameter to specify which node to add the component to.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Target node UUID. REQUIRED: You must specify the exact node to add the component to. Use get_all_nodes or find_node_by_name to get the UUID of the desired node.'
                        },
                        componentType: {
                            type: 'string',
                            description: 'Component type (e.g., cc.Sprite, cc.Label, cc.Button)'
                        }
                    },
                    required: ['nodeUuid', 'componentType']
                }
            },
            {
                name: 'remove_component',
                description: 'Remove a component from a node. componentType must be the component\'s classId (cid, i.e. the type field from getComponents), not the script name or class name. Use getComponents to get the correct cid.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Node UUID'
                        },
                        componentType: {
                            type: 'string',
                            description: 'Component cid (type field from getComponents). Do NOT use script name or class name. Example: "cc.Sprite" or "9b4a7ueT9xD6aRE+AlOusy1"'
                        }
                    },
                    required: ['nodeUuid', 'componentType']
                }
            },
            {
                name: 'get_components',
                description: 'Get all components of a node',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Node UUID'
                        }
                    },
                    required: ['nodeUuid']
                }
            },
            {
                name: 'get_component_info',
                description: 'Get specific component information',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Node UUID'
                        },
                        componentType: {
                            type: 'string',
                            description: 'Component type to get info for'
                        }
                    },
                    required: ['nodeUuid', 'componentType']
                }
            },
            {
                name: 'set_component_property',
                description: 'Set component property values for UI components or custom script components. Supports setting properties of built-in UI components (e.g., cc.Label, cc.Sprite) and custom script components. Note: For node basic properties (name, active, layer, etc.), use set_node_property. For node transform properties (position, rotation, scale, etc.), use set_node_transform.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Target node UUID - Must specify the node to operate on'
                        },
                        componentType: {
                            type: 'string',
                            description: 'Component type - Can be built-in components (e.g., cc.Label) or custom script components (e.g., MyScript). If unsure about component type, use get_components first to retrieve all components on the node.',
                            // 移除enum限制，允许任意组件类型包括自定义脚本
                        },
                        property: {
                            type: 'string',
                            description: 'Property name - The property to set. Common properties include:\n' +
                                '• cc.Label: string (text content), fontSize (font size), color (text color)\n' +
                                '• cc.Sprite: spriteFrame (sprite frame), color (tint color), sizeMode (size mode)\n' +
                                '• cc.Button: normalColor (normal color), pressedColor (pressed color), target (target node)\n' +
                                '• cc.UITransform: contentSize (content size), anchorPoint (anchor point)\n' +
                                '• Custom Scripts: Based on properties defined in the script'
                        },
                        propertyType: {
                            type: 'string',
                            description: 'Property type - Must explicitly specify the property data type for correct value conversion and validation',
                            enum: [
                                'string', 'number', 'boolean', 'integer', 'float',
                                'color', 'vec2', 'vec3', 'size',
                                'node', 'component', 'spriteFrame', 'prefab', 'asset',
                                'nodeArray', 'colorArray', 'numberArray', 'stringArray'
                            ]
                        },
                        value: {
                            description: 'Property value - Use the corresponding data format based on propertyType:\n\n' +
                                '📝 Basic Data Types:\n' +
                                '• string: "Hello World" (text string)\n' +
                                '• number/integer/float: 42 or 3.14 (numeric value)\n' +
                                '• boolean: true or false (boolean value)\n\n' +
                                '🎨 Color Type:\n' +
                                '• color: {"r":255,"g":0,"b":0,"a":255} (RGBA values, range 0-255)\n' +
                                '  - Alternative: "#FF0000" (hexadecimal format)\n' +
                                '  - Transparency: a value controls opacity, 255 = fully opaque, 0 = fully transparent\n\n' +
                                '📐 Vector and Size Types:\n' +
                                '• vec2: {"x":100,"y":50} (2D vector)\n' +
                                '• vec3: {"x":1,"y":2,"z":3} (3D vector)\n' +
                                '• size: {"width":100,"height":50} (size dimensions)\n\n' +
                                '🔗 Reference Types (using UUID strings):\n' +
                                '• node: "target-node-uuid" (node reference)\n' +
                                '  How to get: Use get_all_nodes or find_node_by_name to get node UUIDs\n' +
                                '• component: "target-node-uuid" (component reference)\n' +
                                '  How it works: \n' +
                                '    1. Provide the UUID of the NODE that contains the target component\n' +
                                '    2. System auto-detects required component type from property metadata\n' +
                                '    3. Finds the component on target node and gets its scene __id__\n' +
                                '    4. Sets reference using the scene __id__ (not node UUID)\n' +
                                '  Example: value="label-node-uuid" will find cc.Label and use its scene ID\n' +
                                '• spriteFrame: "spriteframe-uuid" (sprite frame asset)\n' +
                                '  How to get: Check asset database or use asset browser\n' +
                                '• prefab: "prefab-uuid" (prefab asset)\n' +
                                '  How to get: Check asset database or use asset browser\n' +
                                '• asset: "asset-uuid" (generic asset reference)\n' +
                                '  How to get: Check asset database or use asset browser\n\n' +
                                '📋 Array Types:\n' +
                                '• nodeArray: ["uuid1","uuid2"] (array of node UUIDs)\n' +
                                '• colorArray: [{"r":255,"g":0,"b":0,"a":255}] (array of colors)\n' +
                                '• numberArray: [1,2,3,4,5] (array of numbers)\n' +
                                '• stringArray: ["item1","item2"] (array of strings)'
                        }
                    },
                    required: ['nodeUuid', 'componentType', 'property', 'propertyType', 'value']
                }
            },
            {
                name: 'attach_script',
                description: 'Attach a script component to a node',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Node UUID'
                        },
                        scriptPath: {
                            type: 'string',
                            description: 'Script asset path (e.g., db://assets/scripts/MyScript.ts)'
                        }
                    },
                    required: ['nodeUuid', 'scriptPath']
                }
            },
            {
                name: 'get_available_components',
                description: 'Get list of available component types',
                inputSchema: {
                    type: 'object',
                    properties: {
                        category: {
                            type: 'string',
                            description: 'Component category filter',
                            enum: ['all', 'renderer', 'ui', 'physics', 'animation', 'audio'],
                            default: 'all'
                        }
                    }
                }
            }
        ];
    }
    async execute(toolName, args) {
        switch (toolName) {
            case 'add_component':
                return await this.addComponent(args.nodeUuid, args.componentType);
            case 'remove_component':
                return await this.removeComponent(args.nodeUuid, args.componentType);
            case 'get_components':
                return await this.getComponents(args.nodeUuid);
            case 'get_component_info':
                return await this.getComponentInfo(args.nodeUuid, args.componentType);
            case 'set_component_property':
                return await this.setComponentProperty(args);
            case 'attach_script':
                return await this.attachScript(args.nodeUuid, args.scriptPath);
            case 'get_available_components':
                return await this.getAvailableComponents(args.category);
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }
    async addComponent(nodeUuid, componentType) {
        return new Promise(async (resolve) => {
            var _a, _b;
            // 先查找节点上是否已存在该组件
            const allComponentsInfo = await this.getComponents(nodeUuid);
            if (allComponentsInfo.success && ((_a = allComponentsInfo.data) === null || _a === void 0 ? void 0 : _a.components)) {
                const existingComponent = allComponentsInfo.data.components.find((comp) => comp.type === componentType);
                if (existingComponent) {
                    resolve({
                        success: true,
                        message: `Component '${componentType}' already exists on node`,
                        data: {
                            nodeUuid: nodeUuid,
                            componentType: componentType,
                            componentVerified: true,
                            existing: true
                        }
                    });
                    return;
                }
            }
            // 使用 create-component 消息(无运行时回退);验证带重试克服序列化时序
            try {
                await (0, compat_1.createComponentWithFallback)(nodeUuid, componentType);
                // 重试验证:组件添加到 query-node 可见有延迟,最多 3 次 × 250ms
                let verified = false;
                let availableList = '';
                for (let attempt = 0; attempt < 3; attempt++) {
                    await new Promise(r => setTimeout(r, 250));
                    const info = await this.getComponents(nodeUuid);
                    if (info.success && ((_b = info.data) === null || _b === void 0 ? void 0 : _b.components)) {
                        const found = info.data.components.find((comp) => comp.type === componentType || comp.name === componentType ||
                            comp.type === componentType.replace(/^cc\./, ''));
                        if (found) {
                            verified = true;
                            break;
                        }
                        availableList = info.data.components.map((c) => c.type).join(', ');
                    }
                }
                if (verified) {
                    resolve({
                        success: true,
                        message: `Component '${componentType}' added successfully`,
                        data: {
                            nodeUuid: nodeUuid,
                            componentType: componentType,
                            componentVerified: true,
                            existing: false
                        }
                    });
                }
                else {
                    resolve({
                        success: false,
                        error: `Component '${componentType}' was not found on node after addition. Available components: ${availableList}`
                    });
                }
            }
            catch (err) {
                resolve({ success: false, error: `Failed to add component: ${err.message}` });
            }
        });
    }
    async removeComponent(nodeUuid, componentType) {
        return new Promise(async (resolve) => {
            var _a, _b, _c;
            // 1. 查找节点上的所有组件
            const allComponentsInfo = await this.getComponents(nodeUuid);
            if (!allComponentsInfo.success || !((_a = allComponentsInfo.data) === null || _a === void 0 ? void 0 : _a.components)) {
                resolve({ success: false, error: `Failed to get components for node '${nodeUuid}': ${allComponentsInfo.error}` });
                return;
            }
            // 2. 只查找type字段等于componentType的组件（即cid）
            const exists = allComponentsInfo.data.components.some((comp) => comp.type === componentType);
            if (!exists) {
                resolve({ success: false, error: `Component cid '${componentType}' not found on node '${nodeUuid}'. 请用getComponents获取type字段（cid）作为componentType。` });
                return;
            }
            // 3. 使用兼容层移除组件（自动回退到 execute-scene-script）
            try {
                await (0, compat_1.removeComponentWithFallback)(nodeUuid, componentType);
                // 4. 再查一次确认是否移除
                const afterRemoveInfo = await this.getComponents(nodeUuid);
                const stillExists = afterRemoveInfo.success && ((_c = (_b = afterRemoveInfo.data) === null || _b === void 0 ? void 0 : _b.components) === null || _c === void 0 ? void 0 : _c.some((comp) => comp.type === componentType));
                if (stillExists) {
                    resolve({ success: false, error: `Component cid '${componentType}' was not removed from node '${nodeUuid}'.` });
                }
                else {
                    resolve({
                        success: true,
                        message: `Component cid '${componentType}' removed successfully from node '${nodeUuid}'`,
                        data: { nodeUuid, componentType }
                    });
                }
            }
            catch (err) {
                resolve({ success: false, error: `Failed to remove component: ${err.message}` });
            }
        });
    }
    async getComponents(nodeUuid) {
        // 消费归一化结果(compat.ts 统一场景脚本与 query-node)
        try {
            const nodeData = await (0, compat_1.queryNodeWithFallback)(nodeUuid);
            if (nodeData && nodeData.components) {
                const components = nodeData.components.map((comp) => ({
                    type: comp.cid || comp.name || 'Unknown',
                    name: comp.name,
                    index: comp.index,
                    enabled: comp.enabled !== undefined ? comp.enabled : true
                }));
                return {
                    success: true,
                    data: {
                        nodeUuid: nodeUuid,
                        components: components
                    }
                };
            }
            else {
                return { success: false, error: 'Node not found or no components data' };
            }
        }
        catch (err) {
            return { success: false, error: `Query failed: ${err.message}` };
        }
    }
    async getComponentInfo(nodeUuid, componentType) {
        // 先用归一化节点信息确认组件存在并拿到 index,再用场景脚本 getComponentDetail 取属性
        try {
            const nodeData = await (0, compat_1.queryNodeWithFallback)(nodeUuid);
            if (!nodeData || !nodeData.components) {
                return { success: false, error: 'Node not found or no components data' };
            }
            const match = nodeData.components.find((comp) => comp.cid === componentType || comp.name === componentType ||
                comp.cid === `cc.${componentType}` || comp.name === componentType.replace(/^cc\./, ''));
            if (!match) {
                return { success: false, error: `Component '${componentType}' not found on node` };
            }
            // 取详细属性
            let properties = {};
            try {
                const detail = await Editor.Message.request('scene', 'execute-scene-script', {
                    name: 'cocos-mcp-server',
                    method: 'getComponentDetail',
                    args: [nodeUuid, componentType]
                });
                if (detail && detail.success && detail.data) {
                    properties = detail.data.properties || {};
                }
            }
            catch (detailErr) {
                // 属性读取失败不阻断,仅置空
                properties = {};
            }
            return {
                success: true,
                data: {
                    nodeUuid: nodeUuid,
                    componentType: match.cid || componentType,
                    enabled: match.enabled !== undefined ? match.enabled : true,
                    properties
                }
            };
        }
        catch (err) {
            return { success: false, error: `Query failed: ${err.message}` };
        }
    }
    extractComponentProperties(component) {
        console.log(`[extractComponentProperties] Processing component:`, Object.keys(component));
        // 检查组件是否有 value 属性，这通常包含实际的组件属性
        if (component.value && typeof component.value === 'object') {
            console.log(`[extractComponentProperties] Found component.value with properties:`, Object.keys(component.value));
            return component.value; // 直接返回 value 对象，它包含所有组件属性
        }
        // 备用方案：从组件对象中直接提取属性
        const properties = {};
        const excludeKeys = ['__type__', 'enabled', 'node', '_id', '__scriptAsset', 'uuid', 'name', '_name', '_objFlags', '_enabled', 'type', 'readonly', 'visible', 'cid', 'editor', 'extends'];
        for (const key in component) {
            if (!excludeKeys.includes(key) && !key.startsWith('_')) {
                console.log(`[extractComponentProperties] Found direct property '${key}':`, typeof component[key]);
                properties[key] = component[key];
            }
        }
        console.log(`[extractComponentProperties] Final extracted properties:`, Object.keys(properties));
        return properties;
    }
    async findComponentTypeByUuid(componentUuid) {
        var _a;
        console.log(`[findComponentTypeByUuid] Searching for component type with UUID: ${componentUuid}`);
        if (!componentUuid) {
            return null;
        }
        try {
            // 使用兼容层查询节点树
            const nodeTree = await (0, compat_1.queryNodeTreeWithFallback)();
            if (!nodeTree) {
                console.warn('[findComponentTypeByUuid] Failed to query node tree.');
                return null;
            }
            const queue = [nodeTree];
            while (queue.length > 0) {
                const currentNodeInfo = queue.shift();
                if (!currentNodeInfo || !currentNodeInfo.uuid) {
                    continue;
                }
                try {
                    // 使用兼容层查询节点
                    const fullNodeData = await (0, compat_1.queryNodeWithFallback)(currentNodeInfo.uuid);
                    if (fullNodeData && fullNodeData.__comps__) {
                        for (const comp of fullNodeData.__comps__) {
                            const compAny = comp; // Cast to any to access dynamic properties
                            // The component UUID is nested in the 'value' property
                            if (compAny.uuid && compAny.uuid.value === componentUuid) {
                                const componentType = compAny.__type__;
                                console.log(`[findComponentTypeByUuid] Found component type '${componentType}' for UUID ${componentUuid} on node ${(_a = fullNodeData.name) === null || _a === void 0 ? void 0 : _a.value}`);
                                return componentType;
                            }
                        }
                    }
                }
                catch (e) {
                    console.warn(`[findComponentTypeByUuid] Could not query node ${currentNodeInfo.uuid}:`, e);
                }
                if (currentNodeInfo.children) {
                    for (const child of currentNodeInfo.children) {
                        queue.push(child);
                    }
                }
            }
            console.warn(`[findComponentTypeByUuid] Component with UUID ${componentUuid} not found in scene tree.`);
            return null;
        }
        catch (error) {
            console.error(`[findComponentTypeByUuid] Error while searching for component type:`, error);
            return null;
        }
    }
    async setComponentProperty(args) {
        const { nodeUuid, componentType, property, propertyType, value } = args;
        return new Promise(async (resolve) => {
            var _a, _b;
            try {
                console.log(`[ComponentTools] Setting ${componentType}.${property} (type: ${propertyType}) = ${JSON.stringify(value)} on node ${nodeUuid}`);
                // Step 0: 检测是否为节点属性，如果是则重定向到对应的节点方法
                const nodeRedirectResult = await this.checkAndRedirectNodeProperties(args);
                if (nodeRedirectResult) {
                    resolve(nodeRedirectResult);
                    return;
                }
                // Step 1: 获取组件列表,确认目标组件存在并拿到 index
                const componentsResponse = await this.getComponents(nodeUuid);
                if (!componentsResponse.success || !componentsResponse.data) {
                    resolve({
                        success: false,
                        error: `Failed to get components for node '${nodeUuid}': ${componentsResponse.error}`,
                        instruction: `Please verify that node UUID '${nodeUuid}' is correct. Use get_all_nodes or find_node_by_name to get the correct node UUID.`
                    });
                    return;
                }
                const allComponents = componentsResponse.data.components;
                const availableTypes = allComponents.map((c) => c.type);
                const norm = (s) => (s || '').toLowerCase().replace(/^cc\./, '');
                const targetComponent = allComponents.find((comp) => comp.type === componentType || comp.name === componentType ||
                    norm(comp.type) === norm(componentType));
                if (!targetComponent) {
                    const instruction = this.generateComponentSuggestion(componentType, availableTypes, property);
                    resolve({
                        success: false,
                        error: `Component '${componentType}' not found on node. Available components: ${availableTypes.join(', ')}`,
                        instruction: instruction
                    });
                    return;
                }
                // Step 2: 取目标组件归一化属性(场景脚本 getComponentDetail),构造 propertyInfo。
                // 不再用 analyzeProperty 解析 dump——归一化后 properties 已是简单键值。
                let componentProperties = {};
                try {
                    const detail = await Editor.Message.request('scene', 'execute-scene-script', {
                        name: 'cocos-mcp-server',
                        method: 'getComponentDetail',
                        args: [nodeUuid, componentType]
                    });
                    if (detail && detail.success && detail.data) {
                        componentProperties = detail.data.properties || {};
                    }
                }
                catch (detailErr) {
                    // 属性读取失败不阻断(部分组件属性无法枚举),后续按 propertyType 直设
                }
                const availableProperties = Object.keys(componentProperties);
                const propertyExists = availableProperties.includes(property) || propertyType === 'asset' || propertyType === 'spriteFrame' || propertyType === 'prefab';
                // 注:资源引用类属性在归一化时可能呈现为 {uuid} 或被跳过,放宽存在性判断,交给 set-property 验证
                const propertyInfo = {
                    exists: propertyExists,
                    type: this.inferPropertyType(componentProperties[property], property, propertyType),
                    availableProperties,
                    originalValue: componentProperties[property]
                };
                if (!propertyInfo.exists) {
                    resolve({
                        success: false,
                        error: `Property '${property}' not found on component '${componentType}'. Available properties: ${availableProperties.join(', ')}`
                    });
                    return;
                }
                // Step 4: 处理属性值和设置
                const originalValue = propertyInfo.originalValue;
                let processedValue;
                // 根据明确的propertyType处理属性值
                switch (propertyType) {
                    case 'string':
                        processedValue = String(value);
                        break;
                    case 'number':
                    case 'integer':
                    case 'float':
                        processedValue = Number(value);
                        break;
                    case 'boolean':
                        processedValue = Boolean(value);
                        break;
                    case 'color':
                        if (typeof value === 'string') {
                            // 字符串格式：支持十六进制、颜色名称、rgb()/rgba()
                            processedValue = this.parseColorString(value);
                        }
                        else if (typeof value === 'object' && value !== null) {
                            // 对象格式：验证并转换RGBA值
                            processedValue = {
                                r: Math.min(255, Math.max(0, Number(value.r) || 0)),
                                g: Math.min(255, Math.max(0, Number(value.g) || 0)),
                                b: Math.min(255, Math.max(0, Number(value.b) || 0)),
                                a: value.a !== undefined ? Math.min(255, Math.max(0, Number(value.a))) : 255
                            };
                        }
                        else {
                            throw new Error('Color value must be an object with r, g, b properties or a hexadecimal string (e.g., "#FF0000")');
                        }
                        break;
                    case 'vec2':
                        if (typeof value === 'object' && value !== null) {
                            processedValue = {
                                x: Number(value.x) || 0,
                                y: Number(value.y) || 0
                            };
                        }
                        else {
                            throw new Error('Vec2 value must be an object with x, y properties');
                        }
                        break;
                    case 'vec3':
                        if (typeof value === 'object' && value !== null) {
                            processedValue = {
                                x: Number(value.x) || 0,
                                y: Number(value.y) || 0,
                                z: Number(value.z) || 0
                            };
                        }
                        else {
                            throw new Error('Vec3 value must be an object with x, y, z properties');
                        }
                        break;
                    case 'size':
                        if (typeof value === 'object' && value !== null) {
                            processedValue = {
                                width: Number(value.width) || 0,
                                height: Number(value.height) || 0
                            };
                        }
                        else {
                            throw new Error('Size value must be an object with width, height properties');
                        }
                        break;
                    case 'node':
                        if (typeof value === 'string') {
                            processedValue = { uuid: value };
                        }
                        else {
                            throw new Error('Node reference value must be a string UUID');
                        }
                        break;
                    case 'component':
                        if (typeof value === 'string') {
                            // 组件引用需要特殊处理：通过节点UUID找到组件的__id__
                            processedValue = value; // 先保存节点UUID，后续会转换为__id__
                        }
                        else {
                            throw new Error('Component reference value must be a string (node UUID containing the target component)');
                        }
                        break;
                    case 'spriteFrame':
                    case 'prefab':
                    case 'asset':
                        if (typeof value === 'string') {
                            processedValue = { uuid: value };
                        }
                        else {
                            throw new Error(`${propertyType} value must be a string UUID`);
                        }
                        break;
                    case 'nodeArray':
                        if (Array.isArray(value)) {
                            processedValue = value.map((item) => {
                                if (typeof item === 'string') {
                                    return { uuid: item };
                                }
                                else {
                                    throw new Error('NodeArray items must be string UUIDs');
                                }
                            });
                        }
                        else {
                            throw new Error('NodeArray value must be an array');
                        }
                        break;
                    case 'colorArray':
                        if (Array.isArray(value)) {
                            processedValue = value.map((item) => {
                                if (typeof item === 'object' && item !== null && 'r' in item) {
                                    return {
                                        r: Math.min(255, Math.max(0, Number(item.r) || 0)),
                                        g: Math.min(255, Math.max(0, Number(item.g) || 0)),
                                        b: Math.min(255, Math.max(0, Number(item.b) || 0)),
                                        a: item.a !== undefined ? Math.min(255, Math.max(0, Number(item.a))) : 255
                                    };
                                }
                                else {
                                    return { r: 255, g: 255, b: 255, a: 255 };
                                }
                            });
                        }
                        else {
                            throw new Error('ColorArray value must be an array');
                        }
                        break;
                    case 'numberArray':
                        if (Array.isArray(value)) {
                            processedValue = value.map((item) => Number(item));
                        }
                        else {
                            throw new Error('NumberArray value must be an array');
                        }
                        break;
                    case 'stringArray':
                        if (Array.isArray(value)) {
                            processedValue = value.map((item) => String(item));
                        }
                        else {
                            throw new Error('StringArray value must be an array');
                        }
                        break;
                    default:
                        throw new Error(`Unsupported property type: ${propertyType}`);
                }
                console.log(`[ComponentTools] Converting value: ${JSON.stringify(value)} -> ${JSON.stringify(processedValue)} (type: ${propertyType})`);
                console.log(`[ComponentTools] Property analysis result: propertyInfo.type="${propertyInfo.type}", propertyType="${propertyType}"`);
                console.log(`[ComponentTools] Will use color special handling: ${propertyType === 'color' && processedValue && typeof processedValue === 'object'}`);
                // 用于验证的实际期望值（对于组件引用需要特殊处理）
                let actualExpectedValue = processedValue;
                // Step 5: 用归一化组件索引构建 set-property 路径
                // targetComponent.index 来自场景脚本 buildNodeInfo,与 set-property 期望的 __comps__ 索引一致
                const rawComponentIndex = targetComponent.index;
                if (rawComponentIndex === undefined || rawComponentIndex < 0) {
                    resolve({
                        success: false,
                        error: `Could not find component index for setting property`
                    });
                    return;
                }
                // 构建正确的属性路径
                let propertyPath = `__comps__.${rawComponentIndex}.${property}`;
                // 特殊处理资源类属性
                if (propertyType === 'asset' || propertyType === 'spriteFrame' || propertyType === 'prefab' ||
                    (propertyInfo.type === 'asset' && propertyType === 'string')) {
                    console.log(`[ComponentTools] Setting asset reference:`, {
                        value: processedValue,
                        property: property,
                        propertyType: propertyType,
                        path: propertyPath
                    });
                    // Determine asset type based on property name
                    let assetType = 'cc.SpriteFrame'; // default
                    if (property.toLowerCase().includes('texture')) {
                        assetType = 'cc.Texture2D';
                    }
                    else if (property.toLowerCase().includes('material')) {
                        assetType = 'cc.Material';
                    }
                    else if (property.toLowerCase().includes('font')) {
                        assetType = 'cc.Font';
                    }
                    else if (property.toLowerCase().includes('clip')) {
                        assetType = 'cc.AudioClip';
                    }
                    else if (propertyType === 'prefab') {
                        assetType = 'cc.Prefab';
                    }
                    await (0, compat_1.setPropertyWithFallback)(nodeUuid, propertyPath, {
                        value: processedValue,
                        type: assetType
                    });
                }
                else if (componentType === 'cc.UITransform' && (property === '_contentSize' || property === 'contentSize')) {
                    // Special handling for UITransform contentSize - set width and height separately
                    const width = Number(value.width) || 100;
                    const height = Number(value.height) || 100;
                    // Set width first
                    await (0, compat_1.setPropertyWithFallback)(nodeUuid, `__comps__.${rawComponentIndex}.width`, { value: width });
                    // Then set height
                    await (0, compat_1.setPropertyWithFallback)(nodeUuid, `__comps__.${rawComponentIndex}.height`, { value: height });
                }
                else if (componentType === 'cc.UITransform' && (property === '_anchorPoint' || property === 'anchorPoint')) {
                    // Special handling for UITransform anchorPoint - set anchorX and anchorY separately
                    const anchorX = Number(value.x) || 0.5;
                    const anchorY = Number(value.y) || 0.5;
                    // Set anchorX first
                    await (0, compat_1.setPropertyWithFallback)(nodeUuid, `__comps__.${rawComponentIndex}.anchorX`, { value: anchorX });
                    // Then set anchorY  
                    await (0, compat_1.setPropertyWithFallback)(nodeUuid, `__comps__.${rawComponentIndex}.anchorY`, { value: anchorY });
                }
                else if (propertyType === 'color' && processedValue && typeof processedValue === 'object') {
                    // 特殊处理颜色属性，确保RGBA值正确
                    // Cocos Creator颜色值范围是0-255
                    const colorValue = {
                        r: Math.min(255, Math.max(0, Number(processedValue.r) || 0)),
                        g: Math.min(255, Math.max(0, Number(processedValue.g) || 0)),
                        b: Math.min(255, Math.max(0, Number(processedValue.b) || 0)),
                        a: processedValue.a !== undefined ? Math.min(255, Math.max(0, Number(processedValue.a))) : 255
                    };
                    console.log(`[ComponentTools] Setting color value:`, colorValue);
                    await (0, compat_1.setPropertyWithFallback)(nodeUuid, propertyPath, { value: colorValue, type: 'cc.Color' });
                }
                else if (propertyType === 'vec3' && processedValue && typeof processedValue === 'object') {
                    // 特殊处理Vec3属性
                    const vec3Value = {
                        x: Number(processedValue.x) || 0,
                        y: Number(processedValue.y) || 0,
                        z: Number(processedValue.z) || 0
                    };
                    await (0, compat_1.setPropertyWithFallback)(nodeUuid, propertyPath, { value: vec3Value, type: 'cc.Vec3' });
                }
                else if (propertyType === 'vec2' && processedValue && typeof processedValue === 'object') {
                    // 特殊处理Vec2属性
                    const vec2Value = {
                        x: Number(processedValue.x) || 0,
                        y: Number(processedValue.y) || 0
                    };
                    await (0, compat_1.setPropertyWithFallback)(nodeUuid, propertyPath, { value: vec2Value, type: 'cc.Vec2' });
                }
                else if (propertyType === 'size' && processedValue && typeof processedValue === 'object') {
                    // 特殊处理Size属性
                    const sizeValue = {
                        width: Number(processedValue.width) || 0,
                        height: Number(processedValue.height) || 0
                    };
                    await (0, compat_1.setPropertyWithFallback)(nodeUuid, propertyPath, { value: sizeValue, type: 'cc.Size' });
                }
                else if (propertyType === 'node' && processedValue && typeof processedValue === 'object' && 'uuid' in processedValue) {
                    // 特殊处理节点引用
                    console.log(`[ComponentTools] Setting node reference with UUID: ${processedValue.uuid}`);
                    await (0, compat_1.setPropertyWithFallback)(nodeUuid, propertyPath, { value: processedValue, type: 'cc.Node' });
                }
                else if (propertyType === 'component' && typeof processedValue === 'string') {
                    // 特殊处理组件引用：通过节点UUID找到组件的__id__
                    const targetNodeUuid = processedValue;
                    console.log(`[ComponentTools] Setting component reference - finding component on node: ${targetNodeUuid}`);
                    // 从当前组件的属性元数据中获取期望的组件类型
                    let expectedComponentType = '';
                    // 获取当前组件的详细信息，包括属性元数据
                    const currentComponentInfo = await this.getComponentInfo(nodeUuid, componentType);
                    if (currentComponentInfo.success && ((_b = (_a = currentComponentInfo.data) === null || _a === void 0 ? void 0 : _a.properties) === null || _b === void 0 ? void 0 : _b[property])) {
                        const propertyMeta = currentComponentInfo.data.properties[property];
                        // 从属性元数据中提取组件类型信息
                        if (propertyMeta && typeof propertyMeta === 'object') {
                            // 检查是否有type字段指示组件类型
                            if (propertyMeta.type) {
                                expectedComponentType = propertyMeta.type;
                            }
                            else if (propertyMeta.ctor) {
                                // 有些属性可能使用ctor字段
                                expectedComponentType = propertyMeta.ctor;
                            }
                            else if (propertyMeta.extends && Array.isArray(propertyMeta.extends)) {
                                // 检查extends数组，通常第一个是最具体的类型
                                for (const extendType of propertyMeta.extends) {
                                    if (extendType.startsWith('cc.') && extendType !== 'cc.Component' && extendType !== 'cc.Object') {
                                        expectedComponentType = extendType;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    if (!expectedComponentType) {
                        throw new Error(`Unable to determine required component type for property '${property}' on component '${componentType}'. Property metadata may not contain type information.`);
                    }
                    console.log(`[ComponentTools] Detected required component type: ${expectedComponentType} for property: ${property}`);
                    try {
                        // 获取目标节点的组件信息(归一化)
                        const targetNodeData = await (0, compat_1.queryNodeWithFallback)(targetNodeUuid);
                        if (!targetNodeData || !targetNodeData.components) {
                            throw new Error(`Target node ${targetNodeUuid} not found or has no components`);
                        }
                        // 在目标节点组件列表中查找指定类型(支持 FQN 与短名)
                        const norm = (s) => (s || '').toLowerCase().replace(/^cc\./, '');
                        const targetComp = targetNodeData.components.find((comp) => norm(comp.cid) === norm(expectedComponentType) || norm(comp.name) === norm(expectedComponentType));
                        if (!targetComp) {
                            const available = targetNodeData.components.map((comp) => comp.cid || comp.name).join(', ');
                            throw new Error(`Component type '${expectedComponentType}' not found on node ${targetNodeUuid}. Available components: ${available}`);
                        }
                        const componentId = targetComp.uuid;
                        if (!componentId) {
                            throw new Error(`Unable to extract component ID for ${expectedComponentType} on ${targetNodeUuid}`);
                        }
                        // 更新期望值为组件 ID 对象格式,用于后续验证
                        actualExpectedValue = { uuid: componentId };
                        await (0, compat_1.setPropertyWithFallback)(nodeUuid, propertyPath, {
                            value: { uuid: componentId },
                            type: expectedComponentType
                        });
                    }
                    catch (error) {
                        console.error(`[ComponentTools] Error setting component reference:`, error);
                        throw error;
                    }
                }
                else if (propertyType === 'nodeArray' && Array.isArray(processedValue)) {
                    // 特殊处理节点数组 - 保持预处理的格式
                    console.log(`[ComponentTools] Setting node array:`, processedValue);
                    await (0, compat_1.setPropertyWithFallback)(nodeUuid, propertyPath, {
                        value: processedValue
                    });
                }
                else if (propertyType === 'colorArray' && Array.isArray(processedValue)) {
                    // 特殊处理颜色数组
                    const colorArrayValue = processedValue.map((item) => {
                        if (item && typeof item === 'object' && 'r' in item) {
                            return {
                                r: Math.min(255, Math.max(0, Number(item.r) || 0)),
                                g: Math.min(255, Math.max(0, Number(item.g) || 0)),
                                b: Math.min(255, Math.max(0, Number(item.b) || 0)),
                                a: item.a !== undefined ? Math.min(255, Math.max(0, Number(item.a))) : 255
                            };
                        }
                        else {
                            return { r: 255, g: 255, b: 255, a: 255 };
                        }
                    });
                    await (0, compat_1.setPropertyWithFallback)(nodeUuid, propertyPath, { value: colorArrayValue, type: 'cc.Color' });
                }
                else {
                    // Normal property setting for non-asset properties
                    await (0, compat_1.setPropertyWithFallback)(nodeUuid, propertyPath, { value: processedValue });
                }
                // Step 5: 等待Editor完成更新，然后验证设置结果(带一次重试克服序列化时序)
                await new Promise(resolve => setTimeout(resolve, 200));
                let verification = await this.verifyPropertyChange(nodeUuid, componentType, property, originalValue, actualExpectedValue);
                if (!verification.verified) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                    verification = await this.verifyPropertyChange(nodeUuid, componentType, property, originalValue, actualExpectedValue);
                }
                if (verification.verified) {
                    resolve({
                        success: true,
                        message: `Successfully set ${componentType}.${property}`,
                        data: {
                            nodeUuid,
                            componentType,
                            property,
                            actualValue: verification.actualValue,
                            changeVerified: true
                        }
                    });
                }
                else {
                    // 真实失败:不再假成功。报告期望值与实际读回值,便于定位。
                    resolve({
                        success: false,
                        error: `Property '${property}' set on ${componentType} was not verified. Expected: ${JSON.stringify(actualExpectedValue)}, actual: ${JSON.stringify(verification.actualValue)}`,
                        data: {
                            nodeUuid,
                            componentType,
                            property,
                            expectedValue: actualExpectedValue,
                            actualValue: verification.actualValue,
                            changeVerified: false
                        }
                    });
                }
            }
            catch (error) {
                console.error(`[ComponentTools] Error setting property:`, error);
                resolve({
                    success: false,
                    error: `Failed to set property: ${error.message}`
                });
            }
        });
    }
    async attachScript(nodeUuid, scriptPath) {
        return new Promise(async (resolve) => {
            var _a, _b, _c;
            // 从脚本路径提取组件类名
            const scriptName = (_a = scriptPath.split('/').pop()) === null || _a === void 0 ? void 0 : _a.replace('.ts', '').replace('.js', '');
            if (!scriptName) {
                resolve({ success: false, error: 'Invalid script path' });
                return;
            }
            // 先查找节点上是否已存在该脚本组件
            const allComponentsInfo = await this.getComponents(nodeUuid);
            if (allComponentsInfo.success && ((_b = allComponentsInfo.data) === null || _b === void 0 ? void 0 : _b.components)) {
                const existingScript = allComponentsInfo.data.components.find((comp) => comp.type === scriptName);
                if (existingScript) {
                    resolve({
                        success: true,
                        message: `Script '${scriptName}' already exists on node`,
                        data: {
                            nodeUuid: nodeUuid,
                            componentName: scriptName,
                            existing: true
                        }
                    });
                    return;
                }
            }
            // 用 create-component 消息挂载脚本组件(脚本类 cid = @ccclass 名);
            // 验证带重试。不再回退到不存在的场景脚本 attachScript 方法。
            try {
                await (0, compat_1.createComponentWithFallback)(nodeUuid, scriptName);
                let verified = false;
                let availableList = '';
                for (let attempt = 0; attempt < 3; attempt++) {
                    await new Promise(r => setTimeout(r, 250));
                    const info = await this.getComponents(nodeUuid);
                    if (info.success && ((_c = info.data) === null || _c === void 0 ? void 0 : _c.components)) {
                        const found = info.data.components.find((comp) => comp.type === scriptName || comp.name === scriptName);
                        if (found) {
                            verified = true;
                            break;
                        }
                        availableList = info.data.components.map((c) => c.type).join(', ');
                    }
                }
                if (verified) {
                    resolve({
                        success: true,
                        message: `Script '${scriptName}' attached successfully`,
                        data: { nodeUuid, componentName: scriptName, existing: false }
                    });
                }
                else {
                    resolve({
                        success: false,
                        error: `Script '${scriptName}' was not found on node after addition. Available components: ${availableList}`,
                        instruction: `脚本类名需与 @ccclass('Xxx') 装饰器名一致,且脚本已编译。当前从文件名推断类名为 '${scriptName}',若脚本内 @ccclass 名不同,请改用该名字。可用 get_components 查看节点已有组件。`
                    });
                }
            }
            catch (err) {
                resolve({
                    success: false,
                    error: `Failed to attach script '${scriptName}': ${err.message}`,
                    instruction: '请确认脚本已编译、类继承 Component、@ccclass 名与文件名一致。'
                });
            }
        });
    }
    async getAvailableComponents(category = 'all') {
        const componentCategories = {
            renderer: ['cc.Sprite', 'cc.Label', 'cc.RichText', 'cc.Mask', 'cc.Graphics'],
            ui: ['cc.Button', 'cc.Toggle', 'cc.Slider', 'cc.ScrollView', 'cc.EditBox', 'cc.ProgressBar'],
            physics: ['cc.RigidBody2D', 'cc.BoxCollider2D', 'cc.CircleCollider2D', 'cc.PolygonCollider2D'],
            animation: ['cc.Animation', 'cc.AnimationClip', 'cc.SkeletalAnimation'],
            audio: ['cc.AudioSource'],
            layout: ['cc.Layout', 'cc.Widget', 'cc.PageView', 'cc.PageViewIndicator'],
            effects: ['cc.MotionStreak', 'cc.ParticleSystem2D'],
            camera: ['cc.Camera'],
            light: ['cc.Light', 'cc.DirectionalLight', 'cc.PointLight', 'cc.SpotLight']
        };
        let components = [];
        if (category === 'all') {
            for (const cat in componentCategories) {
                components = components.concat(componentCategories[cat]);
            }
        }
        else if (componentCategories[category]) {
            components = componentCategories[category];
        }
        return {
            success: true,
            data: {
                category: category,
                components: components
            }
        };
    }
    isValidPropertyDescriptor(propData) {
        // 检查是否是有效的属性描述对象
        if (typeof propData !== 'object' || propData === null) {
            return false;
        }
        try {
            const keys = Object.keys(propData);
            // 避免遍历简单的数值对象（如 {width: 200, height: 150}）
            const isSimpleValueObject = keys.every(key => {
                const value = propData[key];
                return typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean';
            });
            if (isSimpleValueObject) {
                return false;
            }
            // 检查是否包含属性描述符的特征字段，不使用'in'操作符
            const hasName = keys.includes('name');
            const hasValue = keys.includes('value');
            const hasType = keys.includes('type');
            const hasDisplayName = keys.includes('displayName');
            const hasReadonly = keys.includes('readonly');
            // 必须包含name或value字段，且通常还有type字段
            const hasValidStructure = (hasName || hasValue) && (hasType || hasDisplayName || hasReadonly);
            // 额外检查：如果有default字段且结构复杂，避免深度遍历
            if (keys.includes('default') && propData.default && typeof propData.default === 'object') {
                const defaultKeys = Object.keys(propData.default);
                if (defaultKeys.includes('value') && typeof propData.default.value === 'object') {
                    // 这种情况下，我们只返回顶层属性，不深入遍历default.value
                    return hasValidStructure;
                }
            }
            return hasValidStructure;
        }
        catch (error) {
            console.warn(`[isValidPropertyDescriptor] Error checking property descriptor:`, error);
            return false;
        }
    }
    /** 根据归一化属性值推断类型,用于 set-property 的资源类分支判断 */
    inferPropertyType(value, propertyName, declaredType) {
        // 用户显式声明的 propertyType 优先用于值处理,但此处返回的 type 仅用于
        // 判断是否走 asset 分支(line 701 附近 propertyInfo.type === 'asset')。
        if (declaredType === 'asset' || declaredType === 'spriteFrame' || declaredType === 'prefab')
            return 'asset';
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            if ('uuid' in value)
                return 'asset';
        }
        return declaredType || 'unknown';
    }
    analyzeProperty(component, propertyName) {
        // 从复杂的组件结构中提取可用属性
        const availableProperties = [];
        let propertyValue = undefined;
        let propertyExists = false;
        // 尝试多种方式查找属性：
        // 1. 直接属性访问
        if (Object.prototype.hasOwnProperty.call(component, propertyName)) {
            propertyValue = component[propertyName];
            propertyExists = true;
        }
        // 2. 从嵌套结构中查找 (如从测试数据看到的复杂结构)
        if (!propertyExists && component.properties && typeof component.properties === 'object') {
            // 首先检查properties.value是否存在（这是我们在getComponents中看到的结构）
            if (component.properties.value && typeof component.properties.value === 'object') {
                const valueObj = component.properties.value;
                for (const [key, propData] of Object.entries(valueObj)) {
                    // 检查propData是否是一个有效的属性描述对象
                    // 确保propData是对象且包含预期的属性结构
                    if (this.isValidPropertyDescriptor(propData)) {
                        const propInfo = propData;
                        availableProperties.push(key);
                        if (key === propertyName) {
                            // 优先使用value属性，如果没有则使用propData本身
                            try {
                                const propKeys = Object.keys(propInfo);
                                propertyValue = propKeys.includes('value') ? propInfo.value : propInfo;
                            }
                            catch (error) {
                                // 如果检查失败，直接使用propInfo
                                propertyValue = propInfo;
                            }
                            propertyExists = true;
                        }
                    }
                }
            }
            else {
                // 备用方案：直接从properties查找
                for (const [key, propData] of Object.entries(component.properties)) {
                    if (this.isValidPropertyDescriptor(propData)) {
                        const propInfo = propData;
                        availableProperties.push(key);
                        if (key === propertyName) {
                            // 优先使用value属性，如果没有则使用propData本身
                            try {
                                const propKeys = Object.keys(propInfo);
                                propertyValue = propKeys.includes('value') ? propInfo.value : propInfo;
                            }
                            catch (error) {
                                // 如果检查失败，直接使用propInfo
                                propertyValue = propInfo;
                            }
                            propertyExists = true;
                        }
                    }
                }
            }
        }
        // 3. 从直接属性中提取简单属性名
        if (availableProperties.length === 0) {
            for (const key of Object.keys(component)) {
                if (!key.startsWith('_') && !['__type__', 'cid', 'node', 'uuid', 'name', 'enabled', 'type', 'readonly', 'visible'].includes(key)) {
                    availableProperties.push(key);
                }
            }
        }
        if (!propertyExists) {
            return {
                exists: false,
                type: 'unknown',
                availableProperties,
                originalValue: undefined
            };
        }
        let type = 'unknown';
        // 智能类型检测
        if (Array.isArray(propertyValue)) {
            // 数组类型检测
            if (propertyName.toLowerCase().includes('node')) {
                type = 'nodeArray';
            }
            else if (propertyName.toLowerCase().includes('color')) {
                type = 'colorArray';
            }
            else {
                type = 'array';
            }
        }
        else if (typeof propertyValue === 'string') {
            // Check if property name suggests it's an asset
            if (['spriteFrame', 'texture', 'material', 'font', 'clip', 'prefab'].includes(propertyName.toLowerCase())) {
                type = 'asset';
            }
            else {
                type = 'string';
            }
        }
        else if (typeof propertyValue === 'number') {
            type = 'number';
        }
        else if (typeof propertyValue === 'boolean') {
            type = 'boolean';
        }
        else if (propertyValue && typeof propertyValue === 'object') {
            try {
                const keys = Object.keys(propertyValue);
                if (keys.includes('r') && keys.includes('g') && keys.includes('b')) {
                    type = 'color';
                }
                else if (keys.includes('x') && keys.includes('y')) {
                    type = propertyValue.z !== undefined ? 'vec3' : 'vec2';
                }
                else if (keys.includes('width') && keys.includes('height')) {
                    type = 'size';
                }
                else if (keys.includes('uuid') || keys.includes('__uuid__')) {
                    // 检查是否是节点引用（通过属性名或__id__属性判断）
                    if (propertyName.toLowerCase().includes('node') ||
                        propertyName.toLowerCase().includes('target') ||
                        keys.includes('__id__')) {
                        type = 'node';
                    }
                    else {
                        type = 'asset';
                    }
                }
                else if (keys.includes('__id__')) {
                    // 节点引用特征
                    type = 'node';
                }
                else {
                    type = 'object';
                }
            }
            catch (error) {
                console.warn(`[analyzeProperty] Error checking property type for: ${JSON.stringify(propertyValue)}`);
                type = 'object';
            }
        }
        else if (propertyValue === null || propertyValue === undefined) {
            // For null/undefined values, check property name to determine type
            if (['spriteFrame', 'texture', 'material', 'font', 'clip', 'prefab'].includes(propertyName.toLowerCase())) {
                type = 'asset';
            }
            else if (propertyName.toLowerCase().includes('node') ||
                propertyName.toLowerCase().includes('target')) {
                type = 'node';
            }
            else if (propertyName.toLowerCase().includes('component')) {
                type = 'component';
            }
            else {
                type = 'unknown';
            }
        }
        return {
            exists: true,
            type,
            availableProperties,
            originalValue: propertyValue
        };
    }
    smartConvertValue(inputValue, propertyInfo) {
        const { type, originalValue } = propertyInfo;
        console.log(`[smartConvertValue] Converting ${JSON.stringify(inputValue)} to type: ${type}`);
        switch (type) {
            case 'string':
                return String(inputValue);
            case 'number':
                return Number(inputValue);
            case 'boolean':
                if (typeof inputValue === 'boolean')
                    return inputValue;
                if (typeof inputValue === 'string') {
                    return inputValue.toLowerCase() === 'true' || inputValue === '1';
                }
                return Boolean(inputValue);
            case 'color':
                // 优化的颜色处理，支持多种输入格式
                if (typeof inputValue === 'string') {
                    // 字符串格式：十六进制、颜色名称、rgb()/rgba()
                    return this.parseColorString(inputValue);
                }
                else if (typeof inputValue === 'object' && inputValue !== null) {
                    try {
                        const inputKeys = Object.keys(inputValue);
                        // 如果输入是颜色对象，验证并转换
                        if (inputKeys.includes('r') || inputKeys.includes('g') || inputKeys.includes('b')) {
                            return {
                                r: Math.min(255, Math.max(0, Number(inputValue.r) || 0)),
                                g: Math.min(255, Math.max(0, Number(inputValue.g) || 0)),
                                b: Math.min(255, Math.max(0, Number(inputValue.b) || 0)),
                                a: inputValue.a !== undefined ? Math.min(255, Math.max(0, Number(inputValue.a))) : 255
                            };
                        }
                    }
                    catch (error) {
                        console.warn(`[smartConvertValue] Invalid color object: ${JSON.stringify(inputValue)}`);
                    }
                }
                // 如果有原值，保持原值结构并更新提供的值
                if (originalValue && typeof originalValue === 'object') {
                    try {
                        const inputKeys = typeof inputValue === 'object' && inputValue ? Object.keys(inputValue) : [];
                        return {
                            r: inputKeys.includes('r') ? Math.min(255, Math.max(0, Number(inputValue.r))) : (originalValue.r || 255),
                            g: inputKeys.includes('g') ? Math.min(255, Math.max(0, Number(inputValue.g))) : (originalValue.g || 255),
                            b: inputKeys.includes('b') ? Math.min(255, Math.max(0, Number(inputValue.b))) : (originalValue.b || 255),
                            a: inputKeys.includes('a') ? Math.min(255, Math.max(0, Number(inputValue.a))) : (originalValue.a || 255)
                        };
                    }
                    catch (error) {
                        console.warn(`[smartConvertValue] Error processing color with original value: ${error}`);
                    }
                }
                // 默认返回白色
                console.warn(`[smartConvertValue] Using default white color for invalid input: ${JSON.stringify(inputValue)}`);
                return { r: 255, g: 255, b: 255, a: 255 };
            case 'vec2':
                if (typeof inputValue === 'object' && inputValue !== null) {
                    return {
                        x: Number(inputValue.x) || originalValue.x || 0,
                        y: Number(inputValue.y) || originalValue.y || 0
                    };
                }
                return originalValue;
            case 'vec3':
                if (typeof inputValue === 'object' && inputValue !== null) {
                    return {
                        x: Number(inputValue.x) || originalValue.x || 0,
                        y: Number(inputValue.y) || originalValue.y || 0,
                        z: Number(inputValue.z) || originalValue.z || 0
                    };
                }
                return originalValue;
            case 'size':
                if (typeof inputValue === 'object' && inputValue !== null) {
                    return {
                        width: Number(inputValue.width) || originalValue.width || 100,
                        height: Number(inputValue.height) || originalValue.height || 100
                    };
                }
                return originalValue;
            case 'node':
                if (typeof inputValue === 'string') {
                    // 节点引用需要特殊处理
                    return inputValue;
                }
                else if (typeof inputValue === 'object' && inputValue !== null) {
                    // 如果已经是对象形式，返回UUID或完整对象
                    return inputValue.uuid || inputValue;
                }
                return originalValue;
            case 'asset':
                if (typeof inputValue === 'string') {
                    // 如果输入是字符串路径，转换为asset对象
                    return { uuid: inputValue };
                }
                else if (typeof inputValue === 'object' && inputValue !== null) {
                    return inputValue;
                }
                return originalValue;
            default:
                // 对于未知类型，尽量保持原有结构
                if (typeof inputValue === typeof originalValue) {
                    return inputValue;
                }
                return originalValue;
        }
    }
    parseColorString(colorStr) {
        const str = colorStr.trim();
        // 只支持十六进制格式 #RRGGBB 或 #RRGGBBAA
        if (str.startsWith('#')) {
            if (str.length === 7) { // #RRGGBB
                const r = parseInt(str.substring(1, 3), 16);
                const g = parseInt(str.substring(3, 5), 16);
                const b = parseInt(str.substring(5, 7), 16);
                return { r, g, b, a: 255 };
            }
            else if (str.length === 9) { // #RRGGBBAA
                const r = parseInt(str.substring(1, 3), 16);
                const g = parseInt(str.substring(3, 5), 16);
                const b = parseInt(str.substring(5, 7), 16);
                const a = parseInt(str.substring(7, 9), 16);
                return { r, g, b, a };
            }
        }
        // 如果不是有效的十六进制格式，返回错误提示
        throw new Error(`Invalid color format: "${colorStr}". Only hexadecimal format is supported (e.g., "#FF0000" or "#FF0000FF")`);
    }
    async verifyPropertyChange(nodeUuid, componentType, property, originalValue, expectedValue) {
        var _a, _b;
        console.log(`[verifyPropertyChange] Starting verification for ${componentType}.${property}`);
        console.log(`[verifyPropertyChange] Expected value:`, JSON.stringify(expectedValue));
        console.log(`[verifyPropertyChange] Original value:`, JSON.stringify(originalValue));
        try {
            // 重新获取组件信息进行验证
            console.log(`[verifyPropertyChange] Calling getComponentInfo...`);
            const componentInfo = await this.getComponentInfo(nodeUuid, componentType);
            console.log(`[verifyPropertyChange] getComponentInfo success:`, componentInfo.success);
            const allComponents = await this.getComponents(nodeUuid);
            console.log(`[verifyPropertyChange] getComponents success:`, allComponents.success);
            if (componentInfo.success && componentInfo.data) {
                console.log(`[verifyPropertyChange] Component data available, extracting property '${property}'`);
                const allPropertyNames = Object.keys(componentInfo.data.properties || {});
                console.log(`[verifyPropertyChange] Available properties:`, allPropertyNames);
                const propertyData = (_a = componentInfo.data.properties) === null || _a === void 0 ? void 0 : _a[property];
                console.log(`[verifyPropertyChange] Raw property data for '${property}':`, JSON.stringify(propertyData));
                // 从属性数据中提取实际值
                let actualValue = propertyData;
                console.log(`[verifyPropertyChange] Initial actualValue:`, JSON.stringify(actualValue));
                if (propertyData && typeof propertyData === 'object' && 'value' in propertyData) {
                    actualValue = propertyData.value;
                    console.log(`[verifyPropertyChange] Extracted actualValue from .value:`, JSON.stringify(actualValue));
                }
                else {
                    console.log(`[verifyPropertyChange] No .value property found, using raw data`);
                }
                // 修复验证逻辑：检查实际值是否匹配期望值
                let verified = false;
                if (typeof expectedValue === 'object' && expectedValue !== null && 'uuid' in expectedValue) {
                    // 对于引用类型（节点/组件/资源），比较UUID
                    const actualUuid = actualValue && typeof actualValue === 'object' && 'uuid' in actualValue ? actualValue.uuid : '';
                    const expectedUuid = expectedValue.uuid || '';
                    verified = actualUuid === expectedUuid && expectedUuid !== '';
                    console.log(`[verifyPropertyChange] Reference comparison:`);
                    console.log(`  - Expected UUID: "${expectedUuid}"`);
                    console.log(`  - Actual UUID: "${actualUuid}"`);
                    console.log(`  - UUID match: ${actualUuid === expectedUuid}`);
                    console.log(`  - UUID not empty: ${expectedUuid !== ''}`);
                    console.log(`  - Final verified: ${verified}`);
                }
                else {
                    // 对于其他类型，直接比较值
                    console.log(`[verifyPropertyChange] Value comparison:`);
                    console.log(`  - Expected type: ${typeof expectedValue}`);
                    console.log(`  - Actual type: ${typeof actualValue}`);
                    if (typeof actualValue === typeof expectedValue) {
                        if (typeof actualValue === 'object' && actualValue !== null && expectedValue !== null) {
                            // 对象类型的深度比较
                            verified = JSON.stringify(actualValue) === JSON.stringify(expectedValue);
                            console.log(`  - Object comparison (JSON): ${verified}`);
                        }
                        else {
                            // 基本类型的直接比较
                            verified = actualValue === expectedValue;
                            console.log(`  - Direct comparison: ${verified}`);
                        }
                    }
                    else {
                        // 类型不匹配时的特殊处理（如数字和字符串）
                        const stringMatch = String(actualValue) === String(expectedValue);
                        const numberMatch = Number(actualValue) === Number(expectedValue);
                        verified = stringMatch || numberMatch;
                        console.log(`  - String match: ${stringMatch}`);
                        console.log(`  - Number match: ${numberMatch}`);
                        console.log(`  - Type mismatch verified: ${verified}`);
                    }
                }
                console.log(`[verifyPropertyChange] Final verification result: ${verified}`);
                console.log(`[verifyPropertyChange] Final actualValue:`, JSON.stringify(actualValue));
                const result = {
                    verified,
                    actualValue,
                    fullData: {
                        // 只返回修改的属性信息，不返回完整组件数据
                        modifiedProperty: {
                            name: property,
                            before: originalValue,
                            expected: expectedValue,
                            actual: actualValue,
                            verified,
                            propertyMetadata: propertyData // 只包含这个属性的元数据
                        },
                        // 简化的组件信息
                        componentSummary: {
                            nodeUuid,
                            componentType,
                            totalProperties: Object.keys(((_b = componentInfo.data) === null || _b === void 0 ? void 0 : _b.properties) || {}).length
                        }
                    }
                };
                console.log(`[verifyPropertyChange] Returning result:`, JSON.stringify(result, null, 2));
                return result;
            }
            else {
                console.log(`[verifyPropertyChange] ComponentInfo failed or no data:`, componentInfo);
            }
        }
        catch (error) {
            console.error('[verifyPropertyChange] Verification failed with error:', error);
            console.error('[verifyPropertyChange] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        }
        console.log(`[verifyPropertyChange] Returning fallback result`);
        return {
            verified: false,
            actualValue: undefined,
            fullData: null
        };
    }
    /**
     * 检测是否为节点属性，如果是则重定向到对应的节点方法
     */
    async checkAndRedirectNodeProperties(args) {
        const { nodeUuid, componentType, property, propertyType, value } = args;
        // 检测是否为节点基础属性（应该使用 set_node_property）
        const nodeBasicProperties = [
            'name', 'active', 'layer', 'mobility', 'parent', 'children', 'hideFlags'
        ];
        // 检测是否为节点变换属性（应该使用 set_node_transform）
        const nodeTransformProperties = [
            'position', 'rotation', 'scale', 'eulerAngles', 'angle'
        ];
        // Detect attempts to set cc.Node properties (common mistake)
        if (componentType === 'cc.Node' || componentType === 'Node') {
            if (nodeBasicProperties.includes(property)) {
                return {
                    success: false,
                    error: `Property '${property}' is a node basic property, not a component property`,
                    instruction: `Please use set_node_property method to set node properties: set_node_property(uuid="${nodeUuid}", property="${property}", value=${JSON.stringify(value)})`
                };
            }
            else if (nodeTransformProperties.includes(property)) {
                return {
                    success: false,
                    error: `Property '${property}' is a node transform property, not a component property`,
                    instruction: `Please use set_node_transform method to set transform properties: set_node_transform(uuid="${nodeUuid}", ${property}=${JSON.stringify(value)})`
                };
            }
        }
        // Detect common incorrect usage
        if (nodeBasicProperties.includes(property) || nodeTransformProperties.includes(property)) {
            const methodName = nodeTransformProperties.includes(property) ? 'set_node_transform' : 'set_node_property';
            return {
                success: false,
                error: `Property '${property}' is a node property, not a component property`,
                instruction: `Property '${property}' should be set using ${methodName} method, not set_component_property. Please use: ${methodName}(uuid="${nodeUuid}", ${nodeTransformProperties.includes(property) ? property : `property="${property}"`}=${JSON.stringify(value)})`
            };
        }
        return null; // 不是节点属性，继续正常处理
    }
    /**
     * 生成组件建议信息
     */
    generateComponentSuggestion(requestedType, availableTypes, property) {
        // 检查是否存在相似的组件类型
        const similarTypes = availableTypes.filter(type => type.toLowerCase().includes(requestedType.toLowerCase()) ||
            requestedType.toLowerCase().includes(type.toLowerCase()));
        let instruction = '';
        if (similarTypes.length > 0) {
            instruction += `\n\n🔍 Found similar components: ${similarTypes.join(', ')}`;
            instruction += `\n💡 Suggestion: Perhaps you meant to set the '${similarTypes[0]}' component?`;
        }
        // Recommend possible components based on property name
        const propertyToComponentMap = {
            'string': ['cc.Label', 'cc.RichText', 'cc.EditBox'],
            'text': ['cc.Label', 'cc.RichText'],
            'fontSize': ['cc.Label', 'cc.RichText'],
            'spriteFrame': ['cc.Sprite'],
            'color': ['cc.Label', 'cc.Sprite', 'cc.Graphics'],
            'normalColor': ['cc.Button'],
            'pressedColor': ['cc.Button'],
            'target': ['cc.Button'],
            'contentSize': ['cc.UITransform'],
            'anchorPoint': ['cc.UITransform']
        };
        const recommendedComponents = propertyToComponentMap[property] || [];
        const availableRecommended = recommendedComponents.filter(comp => availableTypes.includes(comp));
        if (availableRecommended.length > 0) {
            instruction += `\n\n🎯 Based on property '${property}', recommended components: ${availableRecommended.join(', ')}`;
        }
        // Provide operation suggestions
        instruction += `\n\n📋 Suggested Actions:`;
        instruction += `\n1. Use get_components(nodeUuid="${requestedType.includes('uuid') ? 'YOUR_NODE_UUID' : 'nodeUuid'}") to view all components on the node`;
        instruction += `\n2. If you need to add a component, use add_component(nodeUuid="...", componentType="${requestedType}")`;
        instruction += `\n3. Verify that the component type name is correct (case-sensitive)`;
        return instruction;
    }
    /**
     * 快速验证资源设置结果
     */
    async quickVerifyAsset(nodeUuid, componentType, property) {
        try {
            const rawNodeData = await (0, compat_1.queryNodeWithFallback)(nodeUuid);
            if (!rawNodeData || !rawNodeData.__comps__) {
                return null;
            }
            // 找到组件
            const component = rawNodeData.__comps__.find((comp) => {
                const compType = comp.__type__ || comp.cid || comp.type;
                return compType === componentType;
            });
            if (!component) {
                return null;
            }
            // 提取属性值
            const properties = this.extractComponentProperties(component);
            const propertyData = properties[property];
            if (propertyData && typeof propertyData === 'object' && 'value' in propertyData) {
                return propertyData.value;
            }
            else {
                return propertyData;
            }
        }
        catch (error) {
            console.error(`[quickVerifyAsset] Error:`, error);
            return null;
        }
    }
}
exports.ComponentTools = ComponentTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL2NvbXBvbmVudC10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSw0Q0FBMEw7QUFFMUwsTUFBYSxjQUFjO0lBQ3ZCLFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLGVBQWU7Z0JBQ3JCLFdBQVcsRUFBRSx1SUFBdUk7Z0JBQ3BKLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsUUFBUSxFQUFFOzRCQUNOLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxrS0FBa0s7eUJBQ2xMO3dCQUNELGFBQWEsRUFBRTs0QkFDWCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsdURBQXVEO3lCQUN2RTtxQkFDSjtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDO2lCQUMxQzthQUNKO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLGtCQUFrQjtnQkFDeEIsV0FBVyxFQUFFLDRNQUE0TTtnQkFDek4sV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixRQUFRLEVBQUU7NEJBQ04sSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLFdBQVc7eUJBQzNCO3dCQUNELGFBQWEsRUFBRTs0QkFDWCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsd0lBQXdJO3lCQUN4SjtxQkFDSjtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDO2lCQUMxQzthQUNKO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLGdCQUFnQjtnQkFDdEIsV0FBVyxFQUFFLDhCQUE4QjtnQkFDM0MsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixRQUFRLEVBQUU7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S0FBSyxhQUFhLENBQUM7WUFDdEMsQ0FBQyxDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ2IsT0FBTyxJQUFJLENBQUM7WUFDaEIsQ0FBQztZQUVELFFBQVE7WUFDUixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDOUQsTUFBTSxZQUFZLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRTFDLElBQUksWUFBWSxJQUFJLE9BQU8sWUFBWSxLQUFLLFFBQVEsSUFBSSxPQUFPLElBQUksWUFBWSxFQUFFLENBQUM7Z0JBQzlFLE9BQU8sWUFBWSxDQUFDLEtBQUssQ0FBQztZQUM5QixDQUFDO2lCQUFNLENBQUM7Z0JBQ0osT0FBTyxZQUFZLENBQUM7WUFDeEIsQ0FBQztRQUNMLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2IsT0FBTyxDQUFDLEtBQUssQ0FBQywyQkFBMkIsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNsRCxPQUFPLElBQUksQ0FBQztRQUNoQixDQUFDO0lBQ0wsQ0FBQztDQUNKO0FBdmtERCx3Q0F1a0RDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yLCBDb21wb25lbnRJbmZvIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgY3JlYXRlQ29tcG9uZW50V2l0aEZhbGxiYWNrLCByZW1vdmVDb21wb25lbnRXaXRoRmFsbGJhY2ssIHF1ZXJ5Tm9kZVdpdGhGYWxsYmFjaywgcXVlcnlOb2RlVHJlZVdpdGhGYWxsYmFjaywgc2V0UHJvcGVydHlXaXRoRmFsbGJhY2ssIHNhZmVNZXNzYWdlUmVxdWVzdCB9IGZyb20gJy4uL3V0aWxzL2NvbXBhdCc7XG5cbmV4cG9ydCBjbGFzcyBDb21wb25lbnRUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2FkZF9jb21wb25lbnQnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQWRkIGEgY29tcG9uZW50IHRvIGEgc3BlY2lmaWMgbm9kZS4gSU1QT1JUQU5UOiBZb3UgbXVzdCBwcm92aWRlIHRoZSBub2RlVXVpZCBwYXJhbWV0ZXIgdG8gc3BlY2lmeSB3aGljaCBub2RlIHRvIGFkZCB0aGUgY29tcG9uZW50IHRvLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUYXJnZXQgbm9kZSBVVUlELiBSRVFVSVJFRDogWW91IG11c3Qgc3BlY2lmeSB0aGUgZXhhY3Qgbm9kZSB0byBhZGQgdGhlIGNvbXBvbmVudCB0by4gVXNlIGdldF9hbGxfbm9kZXMgb3IgZmluZF9ub2RlX2J5X25hbWUgdG8gZ2V0IHRoZSBVVUlEIG9mIHRoZSBkZXNpcmVkIG5vZGUuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NvbXBvbmVudCB0eXBlIChlLmcuLCBjYy5TcHJpdGUsIGNjLkxhYmVsLCBjYy5CdXR0b24pJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydub2RlVXVpZCcsICdjb21wb25lbnRUeXBlJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdyZW1vdmVfY29tcG9uZW50JyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1JlbW92ZSBhIGNvbXBvbmVudCBmcm9tIGEgbm9kZS4gY29tcG9uZW50VHlwZSBtdXN0IGJlIHRoZSBjb21wb25lbnRcXCdzIGNsYXNzSWQgKGNpZCwgaS5lLiB0aGUgdHlwZSBmaWVsZCBmcm9tIGdldENvbXBvbmVudHMpLCBub3QgdGhlIHNjcmlwdCBuYW1lIG9yIGNsYXNzIG5hbWUuIFVzZSBnZXRDb21wb25lbnRzIHRvIGdldCB0aGUgY29ycmVjdCBjaWQuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ05vZGUgVVVJRCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb21wb25lbnQgY2lkICh0eXBlIGZpZWxkIGZyb20gZ2V0Q29tcG9uZW50cykuIERvIE5PVCB1c2Ugc2NyaXB0IG5hbWUgb3IgY2xhc3MgbmFtZS4gRXhhbXBsZTogXCJjYy5TcHJpdGVcIiBvciBcIjliNGE3dWVUOXhENmFSRStBbE91c3kxXCInXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25vZGVVdWlkJywgJ2NvbXBvbmVudFR5cGUnXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2dldF9jb21wb25lbnRzJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0dldCBhbGwgY29tcG9uZW50cyBvZiBhIG5vZGUnLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTm9kZSBVVUlEJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydub2RlVXVpZCddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnZ2V0X2NvbXBvbmVudF9pbmZvJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0dldCBzcGVjaWZpYyBjb21wb25lbnQgaW5mb3JtYXRpb24nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTm9kZSBVVUlEJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NvbXBvbmVudCB0eXBlIHRvIGdldCBpbmZvIGZvcidcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnbm9kZVV1aWQnLCAnY29tcG9uZW50VHlwZSddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnc2V0X2NvbXBvbmVudF9wcm9wZXJ0eScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTZXQgY29tcG9uZW50IHByb3BlcnR5IHZhbHVlcyBmb3IgVUkgY29tcG9uZW50cyBvciBjdXN0b20gc2NyaXB0IGNvbXBvbmVudHMuIFN1cHBvcnRzIHNldHRpbmcgcHJvcGVydGllcyBvZiBidWlsdC1pbiBVSSBjb21wb25lbnRzIChlLmcuLCBjYy5MYWJlbCwgY2MuU3ByaXRlKSBhbmQgY3VzdG9tIHNjcmlwdCBjb21wb25lbnRzLiBOb3RlOiBGb3Igbm9kZSBiYXNpYyBwcm9wZXJ0aWVzIChuYW1lLCBhY3RpdmUsIGxheWVyLCBldGMuKSwgdXNlIHNldF9ub2RlX3Byb3BlcnR5LiBGb3Igbm9kZSB0cmFuc2Zvcm0gcHJvcGVydGllcyAocG9zaXRpb24sIHJvdGF0aW9uLCBzY2FsZSwgZXRjLiksIHVzZSBzZXRfbm9kZV90cmFuc2Zvcm0uJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RhcmdldCBub2RlIFVVSUQgLSBNdXN0IHNwZWNpZnkgdGhlIG5vZGUgdG8gb3BlcmF0ZSBvbidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb21wb25lbnQgdHlwZSAtIENhbiBiZSBidWlsdC1pbiBjb21wb25lbnRzIChlLmcuLCBjYy5MYWJlbCkgb3IgY3VzdG9tIHNjcmlwdCBjb21wb25lbnRzIChlLmcuLCBNeVNjcmlwdCkuIElmIHVuc3VyZSBhYm91dCBjb21wb25lbnQgdHlwZSwgdXNlIGdldF9jb21wb25lbnRzIGZpcnN0IHRvIHJldHJpZXZlIGFsbCBjb21wb25lbnRzIG9uIHRoZSBub2RlLicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g56e76ZmkZW51bemZkOWItu+8jOWFgeiuuOS7u+aEj+e7hOS7tuexu+Wei+WMheaLrOiHquWumuS5ieiEmuacrFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQcm9wZXJ0eSBuYW1lIC0gVGhlIHByb3BlcnR5IHRvIHNldC4gQ29tbW9uIHByb3BlcnRpZXMgaW5jbHVkZTpcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBjYy5MYWJlbDogc3RyaW5nICh0ZXh0IGNvbnRlbnQpLCBmb250U2l6ZSAoZm9udCBzaXplKSwgY29sb3IgKHRleHQgY29sb3IpXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgY2MuU3ByaXRlOiBzcHJpdGVGcmFtZSAoc3ByaXRlIGZyYW1lKSwgY29sb3IgKHRpbnQgY29sb3IpLCBzaXplTW9kZSAoc2l6ZSBtb2RlKVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIGNjLkJ1dHRvbjogbm9ybWFsQ29sb3IgKG5vcm1hbCBjb2xvciksIHByZXNzZWRDb2xvciAocHJlc3NlZCBjb2xvciksIHRhcmdldCAodGFyZ2V0IG5vZGUpXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgY2MuVUlUcmFuc2Zvcm06IGNvbnRlbnRTaXplIChjb250ZW50IHNpemUpLCBhbmNob3JQb2ludCAoYW5jaG9yIHBvaW50KVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIEN1c3RvbSBTY3JpcHRzOiBCYXNlZCBvbiBwcm9wZXJ0aWVzIGRlZmluZWQgaW4gdGhlIHNjcmlwdCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eVR5cGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1Byb3BlcnR5IHR5cGUgLSBNdXN0IGV4cGxpY2l0bHkgc3BlY2lmeSB0aGUgcHJvcGVydHkgZGF0YSB0eXBlIGZvciBjb3JyZWN0IHZhbHVlIGNvbnZlcnNpb24gYW5kIHZhbGlkYXRpb24nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3N0cmluZycsICdudW1iZXInLCAnYm9vbGVhbicsICdpbnRlZ2VyJywgJ2Zsb2F0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbG9yJywgJ3ZlYzInLCAndmVjMycsICdzaXplJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ25vZGUnLCAnY29tcG9uZW50JywgJ3Nwcml0ZUZyYW1lJywgJ3ByZWZhYicsICdhc3NldCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdub2RlQXJyYXknLCAnY29sb3JBcnJheScsICdudW1iZXJBcnJheScsICdzdHJpbmdBcnJheSdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUHJvcGVydHkgdmFsdWUgLSBVc2UgdGhlIGNvcnJlc3BvbmRpbmcgZGF0YSBmb3JtYXQgYmFzZWQgb24gcHJvcGVydHlUeXBlOlxcblxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn8J+TnSBCYXNpYyBEYXRhIFR5cGVzOlxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIHN0cmluZzogXCJIZWxsbyBXb3JsZFwiICh0ZXh0IHN0cmluZylcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBudW1iZXIvaW50ZWdlci9mbG9hdDogNDIgb3IgMy4xNCAobnVtZXJpYyB2YWx1ZSlcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBib29sZWFuOiB0cnVlIG9yIGZhbHNlIChib29sZWFuIHZhbHVlKVxcblxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn8J+OqCBDb2xvciBUeXBlOlxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIGNvbG9yOiB7XCJyXCI6MjU1LFwiZ1wiOjAsXCJiXCI6MCxcImFcIjoyNTV9IChSR0JBIHZhbHVlcywgcmFuZ2UgMC0yNTUpXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgIC0gQWx0ZXJuYXRpdmU6IFwiI0ZGMDAwMFwiIChoZXhhZGVjaW1hbCBmb3JtYXQpXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgIC0gVHJhbnNwYXJlbmN5OiBhIHZhbHVlIGNvbnRyb2xzIG9wYWNpdHksIDI1NSA9IGZ1bGx5IG9wYXF1ZSwgMCA9IGZ1bGx5IHRyYW5zcGFyZW50XFxuXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfwn5OQIFZlY3RvciBhbmQgU2l6ZSBUeXBlczpcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiB2ZWMyOiB7XCJ4XCI6MTAwLFwieVwiOjUwfSAoMkQgdmVjdG9yKVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIHZlYzM6IHtcInhcIjoxLFwieVwiOjIsXCJ6XCI6M30gKDNEIHZlY3RvcilcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBzaXplOiB7XCJ3aWR0aFwiOjEwMCxcImhlaWdodFwiOjUwfSAoc2l6ZSBkaW1lbnNpb25zKVxcblxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn8J+UlyBSZWZlcmVuY2UgVHlwZXMgKHVzaW5nIFVVSUQgc3RyaW5ncyk6XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgbm9kZTogXCJ0YXJnZXQtbm9kZS11dWlkXCIgKG5vZGUgcmVmZXJlbmNlKVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnICBIb3cgdG8gZ2V0OiBVc2UgZ2V0X2FsbF9ub2RlcyBvciBmaW5kX25vZGVfYnlfbmFtZSB0byBnZXQgbm9kZSBVVUlEc1xcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIGNvbXBvbmVudDogXCJ0YXJnZXQtbm9kZS11dWlkXCIgKGNvbXBvbmVudCByZWZlcmVuY2UpXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgIEhvdyBpdCB3b3JrczogXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgICAgMS4gUHJvdmlkZSB0aGUgVVVJRCBvZiB0aGUgTk9ERSB0aGF0IGNvbnRhaW5zIHRoZSB0YXJnZXQgY29tcG9uZW50XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgICAgMi4gU3lzdGVtIGF1dG8tZGV0ZWN0cyByZXF1aXJlZCBjb21wb25lbnQgdHlwZSBmcm9tIHByb3BlcnR5IG1ldGFkYXRhXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgICAgMy4gRmluZHMgdGhlIGNvbXBvbmVudCBvbiB0YXJnZXQgbm9kZSBhbmQgZ2V0cyBpdHMgc2NlbmUgX19pZF9fXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgICAgNC4gU2V0cyByZWZlcmVuY2UgdXNpbmcgdGhlIHNjZW5lIF9faWRfXyAobm90IG5vZGUgVVVJRClcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyAgRXhhbXBsZTogdmFsdWU9XCJsYWJlbC1ub2RlLXV1aWRcIiB3aWxsIGZpbmQgY2MuTGFiZWwgYW5kIHVzZSBpdHMgc2NlbmUgSURcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBzcHJpdGVGcmFtZTogXCJzcHJpdGVmcmFtZS11dWlkXCIgKHNwcml0ZSBmcmFtZSBhc3NldClcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyAgSG93IHRvIGdldDogQ2hlY2sgYXNzZXQgZGF0YWJhc2Ugb3IgdXNlIGFzc2V0IGJyb3dzZXJcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBwcmVmYWI6IFwicHJlZmFiLXV1aWRcIiAocHJlZmFiIGFzc2V0KVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnICBIb3cgdG8gZ2V0OiBDaGVjayBhc3NldCBkYXRhYmFzZSBvciB1c2UgYXNzZXQgYnJvd3NlclxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIGFzc2V0OiBcImFzc2V0LXV1aWRcIiAoZ2VuZXJpYyBhc3NldCByZWZlcmVuY2UpXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgIEhvdyB0byBnZXQ6IENoZWNrIGFzc2V0IGRhdGFiYXNlIG9yIHVzZSBhc3NldCBicm93c2VyXFxuXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfwn5OLIEFycmF5IFR5cGVzOlxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIG5vZGVBcnJheTogW1widXVpZDFcIixcInV1aWQyXCJdIChhcnJheSBvZiBub2RlIFVVSURzKVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIGNvbG9yQXJyYXk6IFt7XCJyXCI6MjU1LFwiZ1wiOjAsXCJiXCI6MCxcImFcIjoyNTV9XSAoYXJyYXkgb2YgY29sb3JzKVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIG51bWJlckFycmF5OiBbMSwyLDMsNCw1XSAoYXJyYXkgb2YgbnVtYmVycylcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBzdHJpbmdBcnJheTogW1wiaXRlbTFcIixcIml0ZW0yXCJdIChhcnJheSBvZiBzdHJpbmdzKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnbm9kZVV1aWQnLCAnY29tcG9uZW50VHlwZScsICdwcm9wZXJ0eScsICdwcm9wZXJ0eVR5cGUnLCAndmFsdWUnXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2F0dGFjaF9zY3JpcHQnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQXR0YWNoIGEgc2NyaXB0IGNvbXBvbmVudCB0byBhIG5vZGUnLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTm9kZSBVVUlEJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcmlwdFBhdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NjcmlwdCBhc3NldCBwYXRoIChlLmcuLCBkYjovL2Fzc2V0cy9zY3JpcHRzL015U2NyaXB0LnRzKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnbm9kZVV1aWQnLCAnc2NyaXB0UGF0aCddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnZ2V0X2F2YWlsYWJsZV9jb21wb25lbnRzJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0dldCBsaXN0IG9mIGF2YWlsYWJsZSBjb21wb25lbnQgdHlwZXMnLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ29tcG9uZW50IGNhdGVnb3J5IGZpbHRlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydhbGwnLCAncmVuZGVyZXInLCAndWknLCAncGh5c2ljcycsICdhbmltYXRpb24nLCAnYXVkaW8nXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAnYWxsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xuICAgICAgICAgICAgY2FzZSAnYWRkX2NvbXBvbmVudCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuYWRkQ29tcG9uZW50KGFyZ3Mubm9kZVV1aWQsIGFyZ3MuY29tcG9uZW50VHlwZSk7XG4gICAgICAgICAgICBjYXNlICdyZW1vdmVfY29tcG9uZW50JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZW1vdmVDb21wb25lbnQoYXJncy5ub2RlVXVpZCwgYXJncy5jb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgIGNhc2UgJ2dldF9jb21wb25lbnRzJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRzKGFyZ3Mubm9kZVV1aWQpO1xuICAgICAgICAgICAgY2FzZSAnZ2V0X2NvbXBvbmVudF9pbmZvJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRJbmZvKGFyZ3Mubm9kZVV1aWQsIGFyZ3MuY29tcG9uZW50VHlwZSk7XG4gICAgICAgICAgICBjYXNlICdzZXRfY29tcG9uZW50X3Byb3BlcnR5JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zZXRDb21wb25lbnRQcm9wZXJ0eShhcmdzKTtcbiAgICAgICAgICAgIGNhc2UgJ2F0dGFjaF9zY3JpcHQnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmF0dGFjaFNjcmlwdChhcmdzLm5vZGVVdWlkLCBhcmdzLnNjcmlwdFBhdGgpO1xuICAgICAgICAgICAgY2FzZSAnZ2V0X2F2YWlsYWJsZV9jb21wb25lbnRzJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRBdmFpbGFibGVDb21wb25lbnRzKGFyZ3MuY2F0ZWdvcnkpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdG9vbDogJHt0b29sTmFtZX1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYWRkQ29tcG9uZW50KG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShhc3luYyAocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgLy8g5YWI5p+l5om+6IqC54K55LiK5piv5ZCm5bey5a2Y5Zyo6K+l57uE5Lu2XG4gICAgICAgICAgICBjb25zdCBhbGxDb21wb25lbnRzSW5mbyA9IGF3YWl0IHRoaXMuZ2V0Q29tcG9uZW50cyhub2RlVXVpZCk7XG4gICAgICAgICAgICBpZiAoYWxsQ29tcG9uZW50c0luZm8uc3VjY2VzcyAmJiBhbGxDb21wb25lbnRzSW5mby5kYXRhPy5jb21wb25lbnRzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZXhpc3RpbmdDb21wb25lbnQgPSBhbGxDb21wb25lbnRzSW5mby5kYXRhLmNvbXBvbmVudHMuZmluZCgoY29tcDogYW55KSA9PiBjb21wLnR5cGUgPT09IGNvbXBvbmVudFR5cGUpO1xuICAgICAgICAgICAgICAgIGlmIChleGlzdGluZ0NvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQ29tcG9uZW50ICcke2NvbXBvbmVudFR5cGV9JyBhbHJlYWR5IGV4aXN0cyBvbiBub2RlYCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogY29tcG9uZW50VHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRWZXJpZmllZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleGlzdGluZzogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIOS9v+eUqCBjcmVhdGUtY29tcG9uZW50IOa2iOaBryjml6Dov5DooYzml7blm57pgIApO+mqjOivgeW4pumHjeivleWFi+acjeW6j+WIl+WMluaXtuW6j1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBhd2FpdCBjcmVhdGVDb21wb25lbnRXaXRoRmFsbGJhY2sobm9kZVV1aWQsIGNvbXBvbmVudFR5cGUpO1xuICAgICAgICAgICAgICAgIC8vIOmHjeivlemqjOivgTrnu4Tku7bmt7vliqDliLAgcXVlcnktbm9kZSDlj6/op4HmnInlu7bov58s5pyA5aSaIDMg5qyhIMOXIDI1MG1zXG4gICAgICAgICAgICAgICAgbGV0IHZlcmlmaWVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgbGV0IGF2YWlsYWJsZUxpc3QgPSAnJztcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBhdHRlbXB0ID0gMDsgYXR0ZW1wdCA8IDM7IGF0dGVtcHQrKykge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgMjUwKSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGluZm8gPSBhd2FpdCB0aGlzLmdldENvbXBvbmVudHMobm9kZVV1aWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5mby5zdWNjZXNzICYmIGluZm8uZGF0YT8uY29tcG9uZW50cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZm91bmQgPSBpbmZvLmRhdGEuY29tcG9uZW50cy5maW5kKChjb21wOiBhbnkpID0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcC50eXBlID09PSBjb21wb25lbnRUeXBlIHx8IGNvbXAubmFtZSA9PT0gY29tcG9uZW50VHlwZSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXAudHlwZSA9PT0gY29tcG9uZW50VHlwZS5yZXBsYWNlKC9eY2NcXC4vLCAnJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZvdW5kKSB7IHZlcmlmaWVkID0gdHJ1ZTsgYnJlYWs7IH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZUxpc3QgPSBpbmZvLmRhdGEuY29tcG9uZW50cy5tYXAoKGM6IGFueSkgPT4gYy50eXBlKS5qb2luKCcsICcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh2ZXJpZmllZCkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQ29tcG9uZW50ICcke2NvbXBvbmVudFR5cGV9JyBhZGRlZCBzdWNjZXNzZnVsbHlgLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiBjb21wb25lbnRUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFZlcmlmaWVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4aXN0aW5nOiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBDb21wb25lbnQgJyR7Y29tcG9uZW50VHlwZX0nIHdhcyBub3QgZm91bmQgb24gbm9kZSBhZnRlciBhZGRpdGlvbi4gQXZhaWxhYmxlIGNvbXBvbmVudHM6ICR7YXZhaWxhYmxlTGlzdH1gXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEZhaWxlZCB0byBhZGQgY29tcG9uZW50OiAke2Vyci5tZXNzYWdlfWAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcmVtb3ZlQ29tcG9uZW50KG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShhc3luYyAocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgLy8gMS4g5p+l5om+6IqC54K55LiK55qE5omA5pyJ57uE5Lu2XG4gICAgICAgICAgICBjb25zdCBhbGxDb21wb25lbnRzSW5mbyA9IGF3YWl0IHRoaXMuZ2V0Q29tcG9uZW50cyhub2RlVXVpZCk7XG4gICAgICAgICAgICBpZiAoIWFsbENvbXBvbmVudHNJbmZvLnN1Y2Nlc3MgfHwgIWFsbENvbXBvbmVudHNJbmZvLmRhdGE/LmNvbXBvbmVudHMpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgRmFpbGVkIHRvIGdldCBjb21wb25lbnRzIGZvciBub2RlICcke25vZGVVdWlkfSc6ICR7YWxsQ29tcG9uZW50c0luZm8uZXJyb3J9YCB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyAyLiDlj6rmn6Xmib50eXBl5a2X5q61562J5LqOY29tcG9uZW50VHlwZeeahOe7hOS7tu+8iOWNs2NpZO+8iVxuICAgICAgICAgICAgY29uc3QgZXhpc3RzID0gYWxsQ29tcG9uZW50c0luZm8uZGF0YS5jb21wb25lbnRzLnNvbWUoKGNvbXA6IGFueSkgPT4gY29tcC50eXBlID09PSBjb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgIGlmICghZXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCBjaWQgJyR7Y29tcG9uZW50VHlwZX0nIG5vdCBmb3VuZCBvbiBub2RlICcke25vZGVVdWlkfScuIOivt+eUqGdldENvbXBvbmVudHPojrflj5Z0eXBl5a2X5q6177yIY2lk77yJ5L2c5Li6Y29tcG9uZW50VHlwZeOAgmAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gMy4g5L2/55So5YW85a655bGC56e76Zmk57uE5Lu277yI6Ieq5Yqo5Zue6YCA5YiwIGV4ZWN1dGUtc2NlbmUtc2NyaXB077yJXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHJlbW92ZUNvbXBvbmVudFdpdGhGYWxsYmFjayhub2RlVXVpZCwgY29tcG9uZW50VHlwZSk7XG4gICAgICAgICAgICAgICAgLy8gNC4g5YaN5p+l5LiA5qyh56Gu6K6k5piv5ZCm56e76ZmkXG4gICAgICAgICAgICAgICAgY29uc3QgYWZ0ZXJSZW1vdmVJbmZvID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRzKG5vZGVVdWlkKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGlsbEV4aXN0cyA9IGFmdGVyUmVtb3ZlSW5mby5zdWNjZXNzICYmIGFmdGVyUmVtb3ZlSW5mby5kYXRhPy5jb21wb25lbnRzPy5zb21lKChjb21wOiBhbnkpID0+IGNvbXAudHlwZSA9PT0gY29tcG9uZW50VHlwZSk7XG4gICAgICAgICAgICAgICAgaWYgKHN0aWxsRXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgY2lkICcke2NvbXBvbmVudFR5cGV9JyB3YXMgbm90IHJlbW92ZWQgZnJvbSBub2RlICcke25vZGVVdWlkfScuYCB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQ29tcG9uZW50IGNpZCAnJHtjb21wb25lbnRUeXBlfScgcmVtb3ZlZCBzdWNjZXNzZnVsbHkgZnJvbSBub2RlICcke25vZGVVdWlkfSdgLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogeyBub2RlVXVpZCwgY29tcG9uZW50VHlwZSB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEZhaWxlZCB0byByZW1vdmUgY29tcG9uZW50OiAke2Vyci5tZXNzYWdlfWAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0Q29tcG9uZW50cyhub2RlVXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgLy8g5raI6LS55b2S5LiA5YyW57uT5p6cKGNvbXBhdC50cyDnu5/kuIDlnLrmma/ohJrmnKzkuI4gcXVlcnktbm9kZSlcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IG5vZGVEYXRhID0gYXdhaXQgcXVlcnlOb2RlV2l0aEZhbGxiYWNrKG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGlmIChub2RlRGF0YSAmJiBub2RlRGF0YS5jb21wb25lbnRzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29tcG9uZW50cyA9IG5vZGVEYXRhLmNvbXBvbmVudHMubWFwKChjb21wOiBhbnkpID0+ICh7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGNvbXAuY2lkIHx8IGNvbXAubmFtZSB8fCAnVW5rbm93bicsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGNvbXAubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgaW5kZXg6IGNvbXAuaW5kZXgsXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGNvbXAuZW5hYmxlZCAhPT0gdW5kZWZpbmVkID8gY29tcC5lbmFibGVkIDogdHJ1ZVxuICAgICAgICAgICAgICAgIH0pKTtcblxuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudHM6IGNvbXBvbmVudHNcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vZGUgbm90IGZvdW5kIG9yIG5vIGNvbXBvbmVudHMgZGF0YScgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFF1ZXJ5IGZhaWxlZDogJHtlcnIubWVzc2FnZX1gIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldENvbXBvbmVudEluZm8obm9kZVV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgLy8g5YWI55So5b2S5LiA5YyW6IqC54K55L+h5oGv56Gu6K6k57uE5Lu25a2Y5Zyo5bm25ou/5YiwIGluZGV4LOWGjeeUqOWcuuaZr+iEmuacrCBnZXRDb21wb25lbnREZXRhaWwg5Y+W5bGe5oCnXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBub2RlRGF0YSA9IGF3YWl0IHF1ZXJ5Tm9kZVdpdGhGYWxsYmFjayhub2RlVXVpZCk7XG4gICAgICAgICAgICBpZiAoIW5vZGVEYXRhIHx8ICFub2RlRGF0YS5jb21wb25lbnRzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm9kZSBub3QgZm91bmQgb3Igbm8gY29tcG9uZW50cyBkYXRhJyB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSBub2RlRGF0YS5jb21wb25lbnRzLmZpbmQoKGNvbXA6IGFueSkgPT5cbiAgICAgICAgICAgICAgICBjb21wLmNpZCA9PT0gY29tcG9uZW50VHlwZSB8fCBjb21wLm5hbWUgPT09IGNvbXBvbmVudFR5cGUgfHxcbiAgICAgICAgICAgICAgICBjb21wLmNpZCA9PT0gYGNjLiR7Y29tcG9uZW50VHlwZX1gIHx8IGNvbXAubmFtZSA9PT0gY29tcG9uZW50VHlwZS5yZXBsYWNlKC9eY2NcXC4vLCAnJykpO1xuICAgICAgICAgICAgaWYgKCFtYXRjaCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCAnJHtjb21wb25lbnRUeXBlfScgbm90IGZvdW5kIG9uIG5vZGVgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyDlj5bor6bnu4blsZ7mgKdcbiAgICAgICAgICAgIGxldCBwcm9wZXJ0aWVzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge307XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRldGFpbCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnY29jb3MtbWNwLXNlcnZlcicsXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ2dldENvbXBvbmVudERldGFpbCcsXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6IFtub2RlVXVpZCwgY29tcG9uZW50VHlwZV1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZiAoZGV0YWlsICYmIGRldGFpbC5zdWNjZXNzICYmIGRldGFpbC5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXMgPSBkZXRhaWwuZGF0YS5wcm9wZXJ0aWVzIHx8IHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGRldGFpbEVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgLy8g5bGe5oCn6K+75Y+W5aSx6LSl5LiN6Zi75patLOS7hee9ruepulxuICAgICAgICAgICAgICAgIHByb3BlcnRpZXMgPSB7fTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogbWF0Y2guY2lkIHx8IGNvbXBvbmVudFR5cGUsXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IG1hdGNoLmVuYWJsZWQgIT09IHVuZGVmaW5lZCA/IG1hdGNoLmVuYWJsZWQgOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFF1ZXJ5IGZhaWxlZDogJHtlcnIubWVzc2FnZX1gIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGV4dHJhY3RDb21wb25lbnRQcm9wZXJ0aWVzKGNvbXBvbmVudDogYW55KTogUmVjb3JkPHN0cmluZywgYW55PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKGBbZXh0cmFjdENvbXBvbmVudFByb3BlcnRpZXNdIFByb2Nlc3NpbmcgY29tcG9uZW50OmAsIE9iamVjdC5rZXlzKGNvbXBvbmVudCkpO1xuICAgICAgICBcbiAgICAgICAgLy8g5qOA5p+l57uE5Lu25piv5ZCm5pyJIHZhbHVlIOWxnuaAp++8jOi/memAmuW4uOWMheWQq+WunumZheeahOe7hOS7tuWxnuaAp1xuICAgICAgICBpZiAoY29tcG9uZW50LnZhbHVlICYmIHR5cGVvZiBjb21wb25lbnQudmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgW2V4dHJhY3RDb21wb25lbnRQcm9wZXJ0aWVzXSBGb3VuZCBjb21wb25lbnQudmFsdWUgd2l0aCBwcm9wZXJ0aWVzOmAsIE9iamVjdC5rZXlzKGNvbXBvbmVudC52YWx1ZSkpO1xuICAgICAgICAgICAgcmV0dXJuIGNvbXBvbmVudC52YWx1ZTsgLy8g55u05o6l6L+U5ZueIHZhbHVlIOWvueixoe+8jOWug+WMheWQq+aJgOaciee7hOS7tuWxnuaAp1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyDlpIfnlKjmlrnmoYjvvJrku47nu4Tku7blr7nosaHkuK3nm7TmjqXmj5Dlj5blsZ7mgKdcbiAgICAgICAgY29uc3QgcHJvcGVydGllczogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xuICAgICAgICBjb25zdCBleGNsdWRlS2V5cyA9IFsnX190eXBlX18nLCAnZW5hYmxlZCcsICdub2RlJywgJ19pZCcsICdfX3NjcmlwdEFzc2V0JywgJ3V1aWQnLCAnbmFtZScsICdfbmFtZScsICdfb2JqRmxhZ3MnLCAnX2VuYWJsZWQnLCAndHlwZScsICdyZWFkb25seScsICd2aXNpYmxlJywgJ2NpZCcsICdlZGl0b3InLCAnZXh0ZW5kcyddO1xuICAgICAgICBcbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gY29tcG9uZW50KSB7XG4gICAgICAgICAgICBpZiAoIWV4Y2x1ZGVLZXlzLmluY2x1ZGVzKGtleSkgJiYgIWtleS5zdGFydHNXaXRoKCdfJykpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW2V4dHJhY3RDb21wb25lbnRQcm9wZXJ0aWVzXSBGb3VuZCBkaXJlY3QgcHJvcGVydHkgJyR7a2V5fSc6YCwgdHlwZW9mIGNvbXBvbmVudFtrZXldKTtcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzW2tleV0gPSBjb21wb25lbnRba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc29sZS5sb2coYFtleHRyYWN0Q29tcG9uZW50UHJvcGVydGllc10gRmluYWwgZXh0cmFjdGVkIHByb3BlcnRpZXM6YCwgT2JqZWN0LmtleXMocHJvcGVydGllcykpO1xuICAgICAgICByZXR1cm4gcHJvcGVydGllcztcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGZpbmRDb21wb25lbnRUeXBlQnlVdWlkKGNvbXBvbmVudFV1aWQ6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuICAgICAgICBjb25zb2xlLmxvZyhgW2ZpbmRDb21wb25lbnRUeXBlQnlVdWlkXSBTZWFyY2hpbmcgZm9yIGNvbXBvbmVudCB0eXBlIHdpdGggVVVJRDogJHtjb21wb25lbnRVdWlkfWApO1xuICAgICAgICBpZiAoIWNvbXBvbmVudFV1aWQpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyDkvb/nlKjlhbzlrrnlsYLmn6Xor6LoioLngrnmoJFcbiAgICAgICAgICAgIGNvbnN0IG5vZGVUcmVlID0gYXdhaXQgcXVlcnlOb2RlVHJlZVdpdGhGYWxsYmFjaygpO1xuICAgICAgICAgICAgaWYgKCFub2RlVHJlZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignW2ZpbmRDb21wb25lbnRUeXBlQnlVdWlkXSBGYWlsZWQgdG8gcXVlcnkgbm9kZSB0cmVlLicpO1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBxdWV1ZTogYW55W10gPSBbbm9kZVRyZWVdO1xuXG4gICAgICAgICAgICB3aGlsZSAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnROb2RlSW5mbyA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgaWYgKCFjdXJyZW50Tm9kZUluZm8gfHwgIWN1cnJlbnROb2RlSW5mby51dWlkKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOS9v+eUqOWFvOWuueWxguafpeivouiKgueCuVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmdWxsTm9kZURhdGEgPSBhd2FpdCBxdWVyeU5vZGVXaXRoRmFsbGJhY2soY3VycmVudE5vZGVJbmZvLnV1aWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZnVsbE5vZGVEYXRhICYmIGZ1bGxOb2RlRGF0YS5fX2NvbXBzX18pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY29tcCBvZiBmdWxsTm9kZURhdGEuX19jb21wc19fKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcEFueSA9IGNvbXAgYXMgYW55OyAvLyBDYXN0IHRvIGFueSB0byBhY2Nlc3MgZHluYW1pYyBwcm9wZXJ0aWVzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIGNvbXBvbmVudCBVVUlEIGlzIG5lc3RlZCBpbiB0aGUgJ3ZhbHVlJyBwcm9wZXJ0eVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb21wQW55LnV1aWQgJiYgY29tcEFueS51dWlkLnZhbHVlID09PSBjb21wb25lbnRVdWlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudFR5cGUgPSBjb21wQW55Ll9fdHlwZV9fO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW2ZpbmRDb21wb25lbnRUeXBlQnlVdWlkXSBGb3VuZCBjb21wb25lbnQgdHlwZSAnJHtjb21wb25lbnRUeXBlfScgZm9yIFVVSUQgJHtjb21wb25lbnRVdWlkfSBvbiBub2RlICR7ZnVsbE5vZGVEYXRhLm5hbWU/LnZhbHVlfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29tcG9uZW50VHlwZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgW2ZpbmRDb21wb25lbnRUeXBlQnlVdWlkXSBDb3VsZCBub3QgcXVlcnkgbm9kZSAke2N1cnJlbnROb2RlSW5mby51dWlkfTpgLCBlKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudE5vZGVJbmZvLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgY3VycmVudE5vZGVJbmZvLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBxdWV1ZS5wdXNoKGNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc29sZS53YXJuKGBbZmluZENvbXBvbmVudFR5cGVCeVV1aWRdIENvbXBvbmVudCB3aXRoIFVVSUQgJHtjb21wb25lbnRVdWlkfSBub3QgZm91bmQgaW4gc2NlbmUgdHJlZS5gKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihgW2ZpbmRDb21wb25lbnRUeXBlQnlVdWlkXSBFcnJvciB3aGlsZSBzZWFyY2hpbmcgZm9yIGNvbXBvbmVudCB0eXBlOmAsIGVycm9yKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBzZXRDb21wb25lbnRQcm9wZXJ0eShhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBub2RlVXVpZCwgY29tcG9uZW50VHlwZSwgcHJvcGVydHksIHByb3BlcnR5VHlwZSwgdmFsdWUgfSA9IGFyZ3M7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoYXN5bmMgKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gU2V0dGluZyAke2NvbXBvbmVudFR5cGV9LiR7cHJvcGVydHl9ICh0eXBlOiAke3Byb3BlcnR5VHlwZX0pID0gJHtKU09OLnN0cmluZ2lmeSh2YWx1ZSl9IG9uIG5vZGUgJHtub2RlVXVpZH1gKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTdGVwIDA6IOajgOa1i+aYr+WQpuS4uuiKgueCueWxnuaAp++8jOWmguaenOaYr+WImemHjeWumuWQkeWIsOWvueW6lOeahOiKgueCueaWueazlVxuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVSZWRpcmVjdFJlc3VsdCA9IGF3YWl0IHRoaXMuY2hlY2tBbmRSZWRpcmVjdE5vZGVQcm9wZXJ0aWVzKGFyZ3MpO1xuICAgICAgICAgICAgICAgIGlmIChub2RlUmVkaXJlY3RSZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShub2RlUmVkaXJlY3RSZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFN0ZXAgMTog6I635Y+W57uE5Lu25YiX6KGoLOehruiupOebruagh+e7hOS7tuWtmOWcqOW5tuaLv+WIsCBpbmRleFxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudHNSZXNwb25zZSA9IGF3YWl0IHRoaXMuZ2V0Q29tcG9uZW50cyhub2RlVXVpZCk7XG4gICAgICAgICAgICAgICAgaWYgKCFjb21wb25lbnRzUmVzcG9uc2Uuc3VjY2VzcyB8fCAhY29tcG9uZW50c1Jlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIGdldCBjb21wb25lbnRzIGZvciBub2RlICcke25vZGVVdWlkfSc6ICR7Y29tcG9uZW50c1Jlc3BvbnNlLmVycm9yfWAsXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbjogYFBsZWFzZSB2ZXJpZnkgdGhhdCBub2RlIFVVSUQgJyR7bm9kZVV1aWR9JyBpcyBjb3JyZWN0LiBVc2UgZ2V0X2FsbF9ub2RlcyBvciBmaW5kX25vZGVfYnlfbmFtZSB0byBnZXQgdGhlIGNvcnJlY3Qgbm9kZSBVVUlELmBcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBhbGxDb21wb25lbnRzID0gY29tcG9uZW50c1Jlc3BvbnNlLmRhdGEuY29tcG9uZW50cztcbiAgICAgICAgICAgICAgICBjb25zdCBhdmFpbGFibGVUeXBlczogc3RyaW5nW10gPSBhbGxDb21wb25lbnRzLm1hcCgoYzogYW55KSA9PiBjLnR5cGUpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5vcm0gPSAoczogc3RyaW5nKSA9PiAocyB8fCAnJykudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9eY2NcXC4vLCAnJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0Q29tcG9uZW50ID0gYWxsQ29tcG9uZW50cy5maW5kKChjb21wOiBhbnkpID0+XG4gICAgICAgICAgICAgICAgICAgIGNvbXAudHlwZSA9PT0gY29tcG9uZW50VHlwZSB8fCBjb21wLm5hbWUgPT09IGNvbXBvbmVudFR5cGUgfHxcbiAgICAgICAgICAgICAgICAgICAgbm9ybShjb21wLnR5cGUpID09PSBub3JtKGNvbXBvbmVudFR5cGUpKTtcblxuICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0Q29tcG9uZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGluc3RydWN0aW9uID0gdGhpcy5nZW5lcmF0ZUNvbXBvbmVudFN1Z2dlc3Rpb24oY29tcG9uZW50VHlwZSwgYXZhaWxhYmxlVHlwZXMsIHByb3BlcnR5KTtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgQ29tcG9uZW50ICcke2NvbXBvbmVudFR5cGV9JyBub3QgZm91bmQgb24gbm9kZS4gQXZhaWxhYmxlIGNvbXBvbmVudHM6ICR7YXZhaWxhYmxlVHlwZXMuam9pbignLCAnKX1gLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb246IGluc3RydWN0aW9uXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU3RlcCAyOiDlj5bnm67moIfnu4Tku7blvZLkuIDljJblsZ7mgKco5Zy65pmv6ISa5pysIGdldENvbXBvbmVudERldGFpbCks5p6E6YCgIHByb3BlcnR5SW5mb+OAglxuICAgICAgICAgICAgICAgIC8vIOS4jeWGjeeUqCBhbmFseXplUHJvcGVydHkg6Kej5p6QIGR1bXDigJTigJTlvZLkuIDljJblkI4gcHJvcGVydGllcyDlt7LmmK/nroDljZXplK7lgLzjgIJcbiAgICAgICAgICAgICAgICBsZXQgY29tcG9uZW50UHJvcGVydGllczogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRldGFpbCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogJ2NvY29zLW1jcC1zZXJ2ZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnZ2V0Q29tcG9uZW50RGV0YWlsJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3M6IFtub2RlVXVpZCwgY29tcG9uZW50VHlwZV1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkZXRhaWwgJiYgZGV0YWlsLnN1Y2Nlc3MgJiYgZGV0YWlsLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFByb3BlcnRpZXMgPSBkZXRhaWwuZGF0YS5wcm9wZXJ0aWVzIHx8IHt9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZGV0YWlsRXJyOiBhbnkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g5bGe5oCn6K+75Y+W5aSx6LSl5LiN6Zi75patKOmDqOWIhue7hOS7tuWxnuaAp+aXoOazleaemuS4viks5ZCO57ut5oyJIHByb3BlcnR5VHlwZSDnm7Torr5cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBhdmFpbGFibGVQcm9wZXJ0aWVzID0gT2JqZWN0LmtleXMoY29tcG9uZW50UHJvcGVydGllcyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvcGVydHlFeGlzdHMgPSBhdmFpbGFibGVQcm9wZXJ0aWVzLmluY2x1ZGVzKHByb3BlcnR5KSB8fCBwcm9wZXJ0eVR5cGUgPT09ICdhc3NldCcgfHwgcHJvcGVydHlUeXBlID09PSAnc3ByaXRlRnJhbWUnIHx8IHByb3BlcnR5VHlwZSA9PT0gJ3ByZWZhYic7XG4gICAgICAgICAgICAgICAgLy8g5rOoOui1hOa6kOW8leeUqOexu+WxnuaAp+WcqOW9kuS4gOWMluaXtuWPr+iDveWRiOeOsOS4uiB7dXVpZH0g5oiW6KKr6Lez6L+HLOaUvuWuveWtmOWcqOaAp+WIpOaWrSzkuqTnu5kgc2V0LXByb3BlcnR5IOmqjOivgVxuXG4gICAgICAgICAgICAgICAgY29uc3QgcHJvcGVydHlJbmZvID0ge1xuICAgICAgICAgICAgICAgICAgICBleGlzdHM6IHByb3BlcnR5RXhpc3RzLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiB0aGlzLmluZmVyUHJvcGVydHlUeXBlKGNvbXBvbmVudFByb3BlcnRpZXNbcHJvcGVydHldLCBwcm9wZXJ0eSwgcHJvcGVydHlUeXBlKSxcbiAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlUHJvcGVydGllcyxcbiAgICAgICAgICAgICAgICAgICAgb3JpZ2luYWxWYWx1ZTogY29tcG9uZW50UHJvcGVydGllc1twcm9wZXJ0eV1cbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgaWYgKCFwcm9wZXJ0eUluZm8uZXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogYFByb3BlcnR5ICcke3Byb3BlcnR5fScgbm90IGZvdW5kIG9uIGNvbXBvbmVudCAnJHtjb21wb25lbnRUeXBlfScuIEF2YWlsYWJsZSBwcm9wZXJ0aWVzOiAke2F2YWlsYWJsZVByb3BlcnRpZXMuam9pbignLCAnKX1gXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFN0ZXAgNDog5aSE55CG5bGe5oCn5YC85ZKM6K6+572uXG4gICAgICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxWYWx1ZSA9IHByb3BlcnR5SW5mby5vcmlnaW5hbFZhbHVlO1xuICAgICAgICAgICAgICAgIGxldCBwcm9jZXNzZWRWYWx1ZTogYW55O1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIOagueaNruaYjuehrueahHByb3BlcnR5VHlwZeWkhOeQhuWxnuaAp+WAvFxuICAgICAgICAgICAgICAgIHN3aXRjaCAocHJvcGVydHlUeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IFN0cmluZyh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnaW50ZWdlcic6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2Zsb2F0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0gQm9vbGVhbih2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnY29sb3InOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlrZfnrKbkuLLmoLzlvI/vvJrmlK/mjIHljYHlha3ov5vliLbjgIHpopzoibLlkI3np7DjgIFyZ2IoKS9yZ2JhKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHRoaXMucGFyc2VDb2xvclN0cmluZyh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlr7nosaHmoLzlvI/vvJrpqozor4HlubbovazmjaJSR0JB5YC8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHI6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKHZhbHVlLnIpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZzogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIodmFsdWUuZykgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcih2YWx1ZS5iKSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGE6IHZhbHVlLmEgIT09IHVuZGVmaW5lZCA/IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKHZhbHVlLmEpKSkgOiAyNTVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbG9yIHZhbHVlIG11c3QgYmUgYW4gb2JqZWN0IHdpdGggciwgZywgYiBwcm9wZXJ0aWVzIG9yIGEgaGV4YWRlY2ltYWwgc3RyaW5nIChlLmcuLCBcIiNGRjAwMDBcIiknKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICd2ZWMyJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IE51bWJlcih2YWx1ZS54KSB8fCAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OiBOdW1iZXIodmFsdWUueSkgfHwgMFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVmVjMiB2YWx1ZSBtdXN0IGJlIGFuIG9iamVjdCB3aXRoIHgsIHkgcHJvcGVydGllcycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3ZlYzMnOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogTnVtYmVyKHZhbHVlLngpIHx8IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IE51bWJlcih2YWx1ZS55KSB8fCAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB6OiBOdW1iZXIodmFsdWUueikgfHwgMFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVmVjMyB2YWx1ZSBtdXN0IGJlIGFuIG9iamVjdCB3aXRoIHgsIHksIHogcHJvcGVydGllcycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3NpemUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IE51bWJlcih2YWx1ZS53aWR0aCkgfHwgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBOdW1iZXIodmFsdWUuaGVpZ2h0KSB8fCAwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdTaXplIHZhbHVlIG11c3QgYmUgYW4gb2JqZWN0IHdpdGggd2lkdGgsIGhlaWdodCBwcm9wZXJ0aWVzJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbm9kZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0geyB1dWlkOiB2YWx1ZSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vZGUgcmVmZXJlbmNlIHZhbHVlIG11c3QgYmUgYSBzdHJpbmcgVVVJRCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2NvbXBvbmVudCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOe7hOS7tuW8leeUqOmcgOimgeeJueauiuWkhOeQhu+8mumAmui/h+iKgueCuVVVSUTmib7liLDnu4Tku7bnmoRfX2lkX19cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHZhbHVlOyAvLyDlhYjkv53lrZjoioLngrlVVUlE77yM5ZCO57ut5Lya6L2s5o2i5Li6X19pZF9fXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ29tcG9uZW50IHJlZmVyZW5jZSB2YWx1ZSBtdXN0IGJlIGEgc3RyaW5nIChub2RlIFVVSUQgY29udGFpbmluZyB0aGUgdGFyZ2V0IGNvbXBvbmVudCknKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdzcHJpdGVGcmFtZSc6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3ByZWZhYic6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2Fzc2V0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB7IHV1aWQ6IHZhbHVlIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgJHtwcm9wZXJ0eVR5cGV9IHZhbHVlIG11c3QgYmUgYSBzdHJpbmcgVVVJRGApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ25vZGVBcnJheSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHZhbHVlLm1hcCgoaXRlbTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHV1aWQ6IGl0ZW0gfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm9kZUFycmF5IGl0ZW1zIG11c3QgYmUgc3RyaW5nIFVVSURzJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOb2RlQXJyYXkgdmFsdWUgbXVzdCBiZSBhbiBhcnJheScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2NvbG9yQXJyYXknOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB2YWx1ZS5tYXAoKGl0ZW06IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdvYmplY3QnICYmIGl0ZW0gIT09IG51bGwgJiYgJ3InIGluIGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcjogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIoaXRlbS5yKSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZzogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIoaXRlbS5nKSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYjogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIoaXRlbS5iKSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYTogaXRlbS5hICE9PSB1bmRlZmluZWQgPyBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpdGVtLmEpKSkgOiAyNTVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyByOiAyNTUsIGc6IDI1NSwgYjogMjU1LCBhOiAyNTUgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbG9yQXJyYXkgdmFsdWUgbXVzdCBiZSBhbiBhcnJheScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ251bWJlckFycmF5JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0gdmFsdWUubWFwKChpdGVtOiBhbnkpID0+IE51bWJlcihpdGVtKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTnVtYmVyQXJyYXkgdmFsdWUgbXVzdCBiZSBhbiBhcnJheScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3N0cmluZ0FycmF5JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0gdmFsdWUubWFwKChpdGVtOiBhbnkpID0+IFN0cmluZyhpdGVtKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignU3RyaW5nQXJyYXkgdmFsdWUgbXVzdCBiZSBhbiBhcnJheScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIHByb3BlcnR5IHR5cGU6ICR7cHJvcGVydHlUeXBlfWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW0NvbXBvbmVudFRvb2xzXSBDb252ZXJ0aW5nIHZhbHVlOiAke0pTT04uc3RyaW5naWZ5KHZhbHVlKX0gLT4gJHtKU09OLnN0cmluZ2lmeShwcm9jZXNzZWRWYWx1ZSl9ICh0eXBlOiAke3Byb3BlcnR5VHlwZX0pYCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gUHJvcGVydHkgYW5hbHlzaXMgcmVzdWx0OiBwcm9wZXJ0eUluZm8udHlwZT1cIiR7cHJvcGVydHlJbmZvLnR5cGV9XCIsIHByb3BlcnR5VHlwZT1cIiR7cHJvcGVydHlUeXBlfVwiYCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gV2lsbCB1c2UgY29sb3Igc3BlY2lhbCBoYW5kbGluZzogJHtwcm9wZXJ0eVR5cGUgPT09ICdjb2xvcicgJiYgcHJvY2Vzc2VkVmFsdWUgJiYgdHlwZW9mIHByb2Nlc3NlZFZhbHVlID09PSAnb2JqZWN0J31gKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyDnlKjkuo7pqozor4HnmoTlrp7pmYXmnJ/mnJvlgLzvvIjlr7nkuo7nu4Tku7blvJXnlKjpnIDopoHnibnmrorlpITnkIbvvIlcbiAgICAgICAgICAgICAgICBsZXQgYWN0dWFsRXhwZWN0ZWRWYWx1ZSA9IHByb2Nlc3NlZFZhbHVlO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFN0ZXAgNTog55So5b2S5LiA5YyW57uE5Lu257Si5byV5p6E5bu6IHNldC1wcm9wZXJ0eSDot6/lvoRcbiAgICAgICAgICAgICAgICAvLyB0YXJnZXRDb21wb25lbnQuaW5kZXgg5p2l6Ieq5Zy65pmv6ISa5pysIGJ1aWxkTm9kZUluZm8s5LiOIHNldC1wcm9wZXJ0eSDmnJ/mnJvnmoQgX19jb21wc19fIOe0ouW8leS4gOiHtFxuICAgICAgICAgICAgICAgIGNvbnN0IHJhd0NvbXBvbmVudEluZGV4ID0gdGFyZ2V0Q29tcG9uZW50LmluZGV4O1xuICAgICAgICAgICAgICAgIGlmIChyYXdDb21wb25lbnRJbmRleCA9PT0gdW5kZWZpbmVkIHx8IHJhd0NvbXBvbmVudEluZGV4IDwgMCkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBDb3VsZCBub3QgZmluZCBjb21wb25lbnQgaW5kZXggZm9yIHNldHRpbmcgcHJvcGVydHlgXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8g5p6E5bu65q2j56Gu55qE5bGe5oCn6Lev5b6EXG4gICAgICAgICAgICAgICAgbGV0IHByb3BlcnR5UGF0aCA9IGBfX2NvbXBzX18uJHtyYXdDb21wb25lbnRJbmRleH0uJHtwcm9wZXJ0eX1gO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIOeJueauiuWkhOeQhui1hOa6kOexu+WxnuaAp1xuICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0eVR5cGUgPT09ICdhc3NldCcgfHwgcHJvcGVydHlUeXBlID09PSAnc3ByaXRlRnJhbWUnIHx8IHByb3BlcnR5VHlwZSA9PT0gJ3ByZWZhYicgfHwgXG4gICAgICAgICAgICAgICAgICAgIChwcm9wZXJ0eUluZm8udHlwZSA9PT0gJ2Fzc2V0JyAmJiBwcm9wZXJ0eVR5cGUgPT09ICdzdHJpbmcnKSkge1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gU2V0dGluZyBhc3NldCByZWZlcmVuY2U6YCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHByb2Nlc3NlZFZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHByb3BlcnR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlUeXBlOiBwcm9wZXJ0eVR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBwcm9wZXJ0eVBhdGhcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBEZXRlcm1pbmUgYXNzZXQgdHlwZSBiYXNlZCBvbiBwcm9wZXJ0eSBuYW1lXG4gICAgICAgICAgICAgICAgICAgIGxldCBhc3NldFR5cGUgPSAnY2MuU3ByaXRlRnJhbWUnOyAvLyBkZWZhdWx0XG4gICAgICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0eS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCd0ZXh0dXJlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2V0VHlwZSA9ICdjYy5UZXh0dXJlMkQnO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ21hdGVyaWFsJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2V0VHlwZSA9ICdjYy5NYXRlcmlhbCc7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHkudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnZm9udCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NldFR5cGUgPSAnY2MuRm9udCc7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHkudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnY2xpcCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NldFR5cGUgPSAnY2MuQXVkaW9DbGlwJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVR5cGUgPT09ICdwcmVmYWInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NldFR5cGUgPSAnY2MuUHJlZmFiJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgc2V0UHJvcGVydHlXaXRoRmFsbGJhY2soXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5UGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcHJvY2Vzc2VkVmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogYXNzZXRUeXBlXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjb21wb25lbnRUeXBlID09PSAnY2MuVUlUcmFuc2Zvcm0nICYmIChwcm9wZXJ0eSA9PT0gJ19jb250ZW50U2l6ZScgfHwgcHJvcGVydHkgPT09ICdjb250ZW50U2l6ZScpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIFVJVHJhbnNmb3JtIGNvbnRlbnRTaXplIC0gc2V0IHdpZHRoIGFuZCBoZWlnaHQgc2VwYXJhdGVseVxuICAgICAgICAgICAgICAgICAgICBjb25zdCB3aWR0aCA9IE51bWJlcih2YWx1ZS53aWR0aCkgfHwgMTAwO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBoZWlnaHQgPSBOdW1iZXIodmFsdWUuaGVpZ2h0KSB8fCAxMDA7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgd2lkdGggZmlyc3RcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgc2V0UHJvcGVydHlXaXRoRmFsbGJhY2sobm9kZVV1aWQsIGBfX2NvbXBzX18uJHtyYXdDb21wb25lbnRJbmRleH0ud2lkdGhgLCB7IHZhbHVlOiB3aWR0aCB9ICk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBUaGVuIHNldCBoZWlnaHRcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgc2V0UHJvcGVydHlXaXRoRmFsbGJhY2sobm9kZVV1aWQsIGBfX2NvbXBzX18uJHtyYXdDb21wb25lbnRJbmRleH0uaGVpZ2h0YCwgeyB2YWx1ZTogaGVpZ2h0IH0gKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNvbXBvbmVudFR5cGUgPT09ICdjYy5VSVRyYW5zZm9ybScgJiYgKHByb3BlcnR5ID09PSAnX2FuY2hvclBvaW50JyB8fCBwcm9wZXJ0eSA9PT0gJ2FuY2hvclBvaW50JykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3BlY2lhbCBoYW5kbGluZyBmb3IgVUlUcmFuc2Zvcm0gYW5jaG9yUG9pbnQgLSBzZXQgYW5jaG9yWCBhbmQgYW5jaG9yWSBzZXBhcmF0ZWx5XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFuY2hvclggPSBOdW1iZXIodmFsdWUueCkgfHwgMC41O1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhbmNob3JZID0gTnVtYmVyKHZhbHVlLnkpIHx8IDAuNTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBhbmNob3JYIGZpcnN0XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHNldFByb3BlcnR5V2l0aEZhbGxiYWNrKG5vZGVVdWlkLCBgX19jb21wc19fLiR7cmF3Q29tcG9uZW50SW5kZXh9LmFuY2hvclhgLCB7IHZhbHVlOiBhbmNob3JYIH0gKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFRoZW4gc2V0IGFuY2hvclkgIFxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBzZXRQcm9wZXJ0eVdpdGhGYWxsYmFjayhub2RlVXVpZCwgYF9fY29tcHNfXy4ke3Jhd0NvbXBvbmVudEluZGV4fS5hbmNob3JZYCwgeyB2YWx1ZTogYW5jaG9yWSB9ICk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVR5cGUgPT09ICdjb2xvcicgJiYgcHJvY2Vzc2VkVmFsdWUgJiYgdHlwZW9mIHByb2Nlc3NlZFZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICAvLyDnibnmrorlpITnkIbpopzoibLlsZ7mgKfvvIznoa7kv51SR0JB5YC85q2j56GuXG4gICAgICAgICAgICAgICAgICAgIC8vIENvY29zIENyZWF0b3LpopzoibLlgLzojIPlm7TmmK8wLTI1NVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb2xvclZhbHVlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcjogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIocHJvY2Vzc2VkVmFsdWUucikgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgZzogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIocHJvY2Vzc2VkVmFsdWUuZykgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgYjogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIocHJvY2Vzc2VkVmFsdWUuYikgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgYTogcHJvY2Vzc2VkVmFsdWUuYSAhPT0gdW5kZWZpbmVkID8gTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIocHJvY2Vzc2VkVmFsdWUuYSkpKSA6IDI1NVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gU2V0dGluZyBjb2xvciB2YWx1ZTpgLCBjb2xvclZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHNldFByb3BlcnR5V2l0aEZhbGxiYWNrKG5vZGVVdWlkLCBwcm9wZXJ0eVBhdGgsIHsgdmFsdWU6IGNvbG9yVmFsdWUsIHR5cGU6ICdjYy5Db2xvcicgfSApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlUeXBlID09PSAndmVjMycgJiYgcHJvY2Vzc2VkVmFsdWUgJiYgdHlwZW9mIHByb2Nlc3NlZFZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICAvLyDnibnmrorlpITnkIZWZWMz5bGe5oCnXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZlYzNWYWx1ZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHg6IE51bWJlcihwcm9jZXNzZWRWYWx1ZS54KSB8fCAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgeTogTnVtYmVyKHByb2Nlc3NlZFZhbHVlLnkpIHx8IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICB6OiBOdW1iZXIocHJvY2Vzc2VkVmFsdWUueikgfHwgMFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgc2V0UHJvcGVydHlXaXRoRmFsbGJhY2sobm9kZVV1aWQsIHByb3BlcnR5UGF0aCwgeyB2YWx1ZTogdmVjM1ZhbHVlLCB0eXBlOiAnY2MuVmVjMycgfSApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlUeXBlID09PSAndmVjMicgJiYgcHJvY2Vzc2VkVmFsdWUgJiYgdHlwZW9mIHByb2Nlc3NlZFZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICAvLyDnibnmrorlpITnkIZWZWMy5bGe5oCnXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZlYzJWYWx1ZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHg6IE51bWJlcihwcm9jZXNzZWRWYWx1ZS54KSB8fCAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgeTogTnVtYmVyKHByb2Nlc3NlZFZhbHVlLnkpIHx8IDBcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHNldFByb3BlcnR5V2l0aEZhbGxiYWNrKG5vZGVVdWlkLCBwcm9wZXJ0eVBhdGgsIHsgdmFsdWU6IHZlYzJWYWx1ZSwgdHlwZTogJ2NjLlZlYzInIH0gKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ3NpemUnICYmIHByb2Nlc3NlZFZhbHVlICYmIHR5cGVvZiBwcm9jZXNzZWRWYWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g54m55q6K5aSE55CGU2l6ZeWxnuaAp1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzaXplVmFsdWUgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogTnVtYmVyKHByb2Nlc3NlZFZhbHVlLndpZHRoKSB8fCAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBOdW1iZXIocHJvY2Vzc2VkVmFsdWUuaGVpZ2h0KSB8fCAwXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBzZXRQcm9wZXJ0eVdpdGhGYWxsYmFjayhub2RlVXVpZCwgcHJvcGVydHlQYXRoLCB7IHZhbHVlOiBzaXplVmFsdWUsIHR5cGU6ICdjYy5TaXplJyB9ICk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVR5cGUgPT09ICdub2RlJyAmJiBwcm9jZXNzZWRWYWx1ZSAmJiB0eXBlb2YgcHJvY2Vzc2VkVmFsdWUgPT09ICdvYmplY3QnICYmICd1dWlkJyBpbiBwcm9jZXNzZWRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyDnibnmrorlpITnkIboioLngrnlvJXnlKhcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gU2V0dGluZyBub2RlIHJlZmVyZW5jZSB3aXRoIFVVSUQ6ICR7cHJvY2Vzc2VkVmFsdWUudXVpZH1gKTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgc2V0UHJvcGVydHlXaXRoRmFsbGJhY2sobm9kZVV1aWQsIHByb3BlcnR5UGF0aCwgeyB2YWx1ZTogcHJvY2Vzc2VkVmFsdWUsIHR5cGU6ICdjYy5Ob2RlJyB9ICk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVR5cGUgPT09ICdjb21wb25lbnQnICYmIHR5cGVvZiBwcm9jZXNzZWRWYWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g54m55q6K5aSE55CG57uE5Lu25byV55So77ya6YCa6L+H6IqC54K5VVVJROaJvuWIsOe7hOS7tueahF9faWRfX1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXROb2RlVXVpZCA9IHByb2Nlc3NlZFZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW0NvbXBvbmVudFRvb2xzXSBTZXR0aW5nIGNvbXBvbmVudCByZWZlcmVuY2UgLSBmaW5kaW5nIGNvbXBvbmVudCBvbiBub2RlOiAke3RhcmdldE5vZGVVdWlkfWApO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8g5LuO5b2T5YmN57uE5Lu255qE5bGe5oCn5YWD5pWw5o2u5Lit6I635Y+W5pyf5pyb55qE57uE5Lu257G75Z6LXG4gICAgICAgICAgICAgICAgICAgIGxldCBleHBlY3RlZENvbXBvbmVudFR5cGUgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIOiOt+WPluW9k+WJjee7hOS7tueahOivpue7huS/oeaBr++8jOWMheaLrOWxnuaAp+WFg+aVsOaNrlxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50Q29tcG9uZW50SW5mbyA9IGF3YWl0IHRoaXMuZ2V0Q29tcG9uZW50SW5mbyhub2RlVXVpZCwgY29tcG9uZW50VHlwZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjdXJyZW50Q29tcG9uZW50SW5mby5zdWNjZXNzICYmIGN1cnJlbnRDb21wb25lbnRJbmZvLmRhdGE/LnByb3BlcnRpZXM/Lltwcm9wZXJ0eV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3BlcnR5TWV0YSA9IGN1cnJlbnRDb21wb25lbnRJbmZvLmRhdGEucHJvcGVydGllc1twcm9wZXJ0eV07XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOS7juWxnuaAp+WFg+aVsOaNruS4reaPkOWPlue7hOS7tuexu+Wei+S/oeaBr1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnR5TWV0YSAmJiB0eXBlb2YgcHJvcGVydHlNZXRhID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOajgOafpeaYr+WQpuaciXR5cGXlrZfmrrXmjIfnpLrnu4Tku7bnsbvlnotcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydHlNZXRhLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWRDb21wb25lbnRUeXBlID0gcHJvcGVydHlNZXRhLnR5cGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eU1ldGEuY3Rvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmnInkupvlsZ7mgKflj6/og73kvb/nlKhjdG9y5a2X5q61XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkQ29tcG9uZW50VHlwZSA9IHByb3BlcnR5TWV0YS5jdG9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlNZXRhLmV4dGVuZHMgJiYgQXJyYXkuaXNBcnJheShwcm9wZXJ0eU1ldGEuZXh0ZW5kcykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5qOA5p+lZXh0ZW5kc+aVsOe7hO+8jOmAmuW4uOesrOS4gOS4quaYr+acgOWFt+S9k+eahOexu+Wei1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGV4dGVuZFR5cGUgb2YgcHJvcGVydHlNZXRhLmV4dGVuZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChleHRlbmRUeXBlLnN0YXJ0c1dpdGgoJ2NjLicpICYmIGV4dGVuZFR5cGUgIT09ICdjYy5Db21wb25lbnQnICYmIGV4dGVuZFR5cGUgIT09ICdjYy5PYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWRDb21wb25lbnRUeXBlID0gZXh0ZW5kVHlwZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFleHBlY3RlZENvbXBvbmVudFR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5hYmxlIHRvIGRldGVybWluZSByZXF1aXJlZCBjb21wb25lbnQgdHlwZSBmb3IgcHJvcGVydHkgJyR7cHJvcGVydHl9JyBvbiBjb21wb25lbnQgJyR7Y29tcG9uZW50VHlwZX0nLiBQcm9wZXJ0eSBtZXRhZGF0YSBtYXkgbm90IGNvbnRhaW4gdHlwZSBpbmZvcm1hdGlvbi5gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gRGV0ZWN0ZWQgcmVxdWlyZWQgY29tcG9uZW50IHR5cGU6ICR7ZXhwZWN0ZWRDb21wb25lbnRUeXBlfSBmb3IgcHJvcGVydHk6ICR7cHJvcGVydHl9YCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8g6I635Y+W55uu5qCH6IqC54K555qE57uE5Lu25L+h5oGvKOW9kuS4gOWMlilcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldE5vZGVEYXRhID0gYXdhaXQgcXVlcnlOb2RlV2l0aEZhbGxiYWNrKHRhcmdldE5vZGVVdWlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0Tm9kZURhdGEgfHwgIXRhcmdldE5vZGVEYXRhLmNvbXBvbmVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFRhcmdldCBub2RlICR7dGFyZ2V0Tm9kZVV1aWR9IG5vdCBmb3VuZCBvciBoYXMgbm8gY29tcG9uZW50c2ApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDlnKjnm67moIfoioLngrnnu4Tku7bliJfooajkuK3mn6Xmib7mjIflrprnsbvlnoso5pSv5oyBIEZRTiDkuI7nn63lkI0pXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBub3JtID0gKHM6IHN0cmluZykgPT4gKHMgfHwgJycpLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvXmNjXFwuLywgJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0Q29tcCA9IHRhcmdldE5vZGVEYXRhLmNvbXBvbmVudHMuZmluZCgoY29tcDogYW55KSA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vcm0oY29tcC5jaWQpID09PSBub3JtKGV4cGVjdGVkQ29tcG9uZW50VHlwZSkgfHwgbm9ybShjb21wLm5hbWUpID09PSBub3JtKGV4cGVjdGVkQ29tcG9uZW50VHlwZSkpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRhcmdldENvbXApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhdmFpbGFibGUgPSB0YXJnZXROb2RlRGF0YS5jb21wb25lbnRzLm1hcCgoY29tcDogYW55KSA9PiBjb21wLmNpZCB8fCBjb21wLm5hbWUpLmpvaW4oJywgJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb21wb25lbnQgdHlwZSAnJHtleHBlY3RlZENvbXBvbmVudFR5cGV9JyBub3QgZm91bmQgb24gbm9kZSAke3RhcmdldE5vZGVVdWlkfS4gQXZhaWxhYmxlIGNvbXBvbmVudHM6ICR7YXZhaWxhYmxlfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wb25lbnRJZCA9IHRhcmdldENvbXAudXVpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghY29tcG9uZW50SWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuYWJsZSB0byBleHRyYWN0IGNvbXBvbmVudCBJRCBmb3IgJHtleHBlY3RlZENvbXBvbmVudFR5cGV9IG9uICR7dGFyZ2V0Tm9kZVV1aWR9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOabtOaWsOacn+acm+WAvOS4uue7hOS7tiBJRCDlr7nosaHmoLzlvI8s55So5LqO5ZCO57ut6aqM6K+BXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3R1YWxFeHBlY3RlZFZhbHVlID0geyB1dWlkOiBjb21wb25lbnRJZCB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBzZXRQcm9wZXJ0eVdpdGhGYWxsYmFjayhub2RlVXVpZCwgcHJvcGVydHlQYXRoLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHsgdXVpZDogY29tcG9uZW50SWQgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBleHBlY3RlZENvbXBvbmVudFR5cGVcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBbQ29tcG9uZW50VG9vbHNdIEVycm9yIHNldHRpbmcgY29tcG9uZW50IHJlZmVyZW5jZTpgLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlUeXBlID09PSAnbm9kZUFycmF5JyAmJiBBcnJheS5pc0FycmF5KHByb2Nlc3NlZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyDnibnmrorlpITnkIboioLngrnmlbDnu4QgLSDkv53mjIHpooTlpITnkIbnmoTmoLzlvI9cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gU2V0dGluZyBub2RlIGFycmF5OmAsIHByb2Nlc3NlZFZhbHVlKTtcblxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBzZXRQcm9wZXJ0eVdpdGhGYWxsYmFjayhub2RlVXVpZCwgcHJvcGVydHlQYXRoLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcHJvY2Vzc2VkVmFsdWVcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVR5cGUgPT09ICdjb2xvckFycmF5JyAmJiBBcnJheS5pc0FycmF5KHByb2Nlc3NlZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyDnibnmrorlpITnkIbpopzoibLmlbDnu4RcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29sb3JBcnJheVZhbHVlID0gcHJvY2Vzc2VkVmFsdWUubWFwKChpdGVtOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtICYmIHR5cGVvZiBpdGVtID09PSAnb2JqZWN0JyAmJiAncicgaW4gaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHI6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGl0ZW0ucikgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpdGVtLmcpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYjogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIoaXRlbS5iKSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGE6IGl0ZW0uYSAhPT0gdW5kZWZpbmVkID8gTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIoaXRlbS5hKSkpIDogMjU1XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgcjogMjU1LCBnOiAyNTUsIGI6IDI1NSwgYTogMjU1IH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgc2V0UHJvcGVydHlXaXRoRmFsbGJhY2sobm9kZVV1aWQsIHByb3BlcnR5UGF0aCwgeyB2YWx1ZTogY29sb3JBcnJheVZhbHVlLCB0eXBlOiAnY2MuQ29sb3InIH0gKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBOb3JtYWwgcHJvcGVydHkgc2V0dGluZyBmb3Igbm9uLWFzc2V0IHByb3BlcnRpZXNcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgc2V0UHJvcGVydHlXaXRoRmFsbGJhY2sobm9kZVV1aWQsIHByb3BlcnR5UGF0aCwgeyB2YWx1ZTogcHJvY2Vzc2VkVmFsdWUgfSApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTdGVwIDU6IOetieW+hUVkaXRvcuWujOaIkOabtOaWsO+8jOeEtuWQjumqjOivgeiuvue9rue7k+aenCjluKbkuIDmrKHph43or5XlhYvmnI3luo/liJfljJbml7bluo8pXG4gICAgICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDIwMCkpO1xuICAgICAgICAgICAgICAgIGxldCB2ZXJpZmljYXRpb24gPSBhd2FpdCB0aGlzLnZlcmlmeVByb3BlcnR5Q2hhbmdlKG5vZGVVdWlkLCBjb21wb25lbnRUeXBlLCBwcm9wZXJ0eSwgb3JpZ2luYWxWYWx1ZSwgYWN0dWFsRXhwZWN0ZWRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKCF2ZXJpZmljYXRpb24udmVyaWZpZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDIwMCkpO1xuICAgICAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb24gPSBhd2FpdCB0aGlzLnZlcmlmeVByb3BlcnR5Q2hhbmdlKG5vZGVVdWlkLCBjb21wb25lbnRUeXBlLCBwcm9wZXJ0eSwgb3JpZ2luYWxWYWx1ZSwgYWN0dWFsRXhwZWN0ZWRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHZlcmlmaWNhdGlvbi52ZXJpZmllZCkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgU3VjY2Vzc2Z1bGx5IHNldCAke2NvbXBvbmVudFR5cGV9LiR7cHJvcGVydHl9YCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdHVhbFZhbHVlOiB2ZXJpZmljYXRpb24uYWN0dWFsVmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlVmVyaWZpZWQ6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g55yf5a6e5aSx6LSlOuS4jeWGjeWBh+aIkOWKn+OAguaKpeWRiuacn+acm+WAvOS4juWunumZheivu+WbnuWAvCzkvr/kuo7lrprkvY3jgIJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgUHJvcGVydHkgJyR7cHJvcGVydHl9JyBzZXQgb24gJHtjb21wb25lbnRUeXBlfSB3YXMgbm90IHZlcmlmaWVkLiBFeHBlY3RlZDogJHtKU09OLnN0cmluZ2lmeShhY3R1YWxFeHBlY3RlZFZhbHVlKX0sIGFjdHVhbDogJHtKU09OLnN0cmluZ2lmeSh2ZXJpZmljYXRpb24uYWN0dWFsVmFsdWUpfWAsXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RlZFZhbHVlOiBhY3R1YWxFeHBlY3RlZFZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdHVhbFZhbHVlOiB2ZXJpZmljYXRpb24uYWN0dWFsVmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlVmVyaWZpZWQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYFtDb21wb25lbnRUb29sc10gRXJyb3Igc2V0dGluZyBwcm9wZXJ0eTpgLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogYEZhaWxlZCB0byBzZXQgcHJvcGVydHk6ICR7ZXJyb3IubWVzc2FnZX1gXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuXG4gICAgcHJpdmF0ZSBhc3luYyBhdHRhY2hTY3JpcHQobm9kZVV1aWQ6IHN0cmluZywgc2NyaXB0UGF0aDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGFzeW5jIChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICAvLyDku47ohJrmnKzot6/lvoTmj5Dlj5bnu4Tku7bnsbvlkI1cbiAgICAgICAgICAgIGNvbnN0IHNjcmlwdE5hbWUgPSBzY3JpcHRQYXRoLnNwbGl0KCcvJykucG9wKCk/LnJlcGxhY2UoJy50cycsICcnKS5yZXBsYWNlKCcuanMnLCAnJyk7XG4gICAgICAgICAgICBpZiAoIXNjcmlwdE5hbWUpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnSW52YWxpZCBzY3JpcHQgcGF0aCcgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8g5YWI5p+l5om+6IqC54K55LiK5piv5ZCm5bey5a2Y5Zyo6K+l6ISa5pys57uE5Lu2XG4gICAgICAgICAgICBjb25zdCBhbGxDb21wb25lbnRzSW5mbyA9IGF3YWl0IHRoaXMuZ2V0Q29tcG9uZW50cyhub2RlVXVpZCk7XG4gICAgICAgICAgICBpZiAoYWxsQ29tcG9uZW50c0luZm8uc3VjY2VzcyAmJiBhbGxDb21wb25lbnRzSW5mby5kYXRhPy5jb21wb25lbnRzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZXhpc3RpbmdTY3JpcHQgPSBhbGxDb21wb25lbnRzSW5mby5kYXRhLmNvbXBvbmVudHMuZmluZCgoY29tcDogYW55KSA9PiBjb21wLnR5cGUgPT09IHNjcmlwdE5hbWUpO1xuICAgICAgICAgICAgICAgIGlmIChleGlzdGluZ1NjcmlwdCkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgU2NyaXB0ICcke3NjcmlwdE5hbWV9JyBhbHJlYWR5IGV4aXN0cyBvbiBub2RlYCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50TmFtZTogc2NyaXB0TmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleGlzdGluZzogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIOeUqCBjcmVhdGUtY29tcG9uZW50IOa2iOaBr+aMgui9veiEmuacrOe7hOS7tijohJrmnKznsbsgY2lkID0gQGNjY2xhc3Mg5ZCNKTtcbiAgICAgICAgICAgIC8vIOmqjOivgeW4pumHjeivleOAguS4jeWGjeWbnumAgOWIsOS4jeWtmOWcqOeahOWcuuaZr+iEmuacrCBhdHRhY2hTY3JpcHQg5pa55rOV44CCXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGF3YWl0IGNyZWF0ZUNvbXBvbmVudFdpdGhGYWxsYmFjayhub2RlVXVpZCwgc2NyaXB0TmFtZSk7XG4gICAgICAgICAgICAgICAgbGV0IHZlcmlmaWVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgbGV0IGF2YWlsYWJsZUxpc3QgPSAnJztcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBhdHRlbXB0ID0gMDsgYXR0ZW1wdCA8IDM7IGF0dGVtcHQrKykge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgMjUwKSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGluZm8gPSBhd2FpdCB0aGlzLmdldENvbXBvbmVudHMobm9kZVV1aWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5mby5zdWNjZXNzICYmIGluZm8uZGF0YT8uY29tcG9uZW50cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZm91bmQgPSBpbmZvLmRhdGEuY29tcG9uZW50cy5maW5kKChjb21wOiBhbnkpID0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcC50eXBlID09PSBzY3JpcHROYW1lIHx8IGNvbXAubmFtZSA9PT0gc2NyaXB0TmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZm91bmQpIHsgdmVyaWZpZWQgPSB0cnVlOyBicmVhazsgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlTGlzdCA9IGluZm8uZGF0YS5jb21wb25lbnRzLm1hcCgoYzogYW55KSA9PiBjLnR5cGUpLmpvaW4oJywgJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHZlcmlmaWVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBTY3JpcHQgJyR7c2NyaXB0TmFtZX0nIGF0dGFjaGVkIHN1Y2Nlc3NmdWxseWAsXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7IG5vZGVVdWlkLCBjb21wb25lbnROYW1lOiBzY3JpcHROYW1lLCBleGlzdGluZzogZmFsc2UgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBTY3JpcHQgJyR7c2NyaXB0TmFtZX0nIHdhcyBub3QgZm91bmQgb24gbm9kZSBhZnRlciBhZGRpdGlvbi4gQXZhaWxhYmxlIGNvbXBvbmVudHM6ICR7YXZhaWxhYmxlTGlzdH1gLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb246IGDohJrmnKznsbvlkI3pnIDkuI4gQGNjY2xhc3MoJ1h4eCcpIOijhemlsOWZqOWQjeS4gOiHtCzkuJTohJrmnKzlt7LnvJbor5HjgILlvZPliY3ku47mlofku7blkI3mjqjmlq3nsbvlkI3kuLogJyR7c2NyaXB0TmFtZX0nLOiLpeiEmuacrOWGhSBAY2NjbGFzcyDlkI3kuI3lkIws6K+35pS555So6K+l5ZCN5a2X44CC5Y+v55SoIGdldF9jb21wb25lbnRzIOafpeeci+iKgueCueW3suaciee7hOS7tuOAgmBcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIGF0dGFjaCBzY3JpcHQgJyR7c2NyaXB0TmFtZX0nOiAke2Vyci5tZXNzYWdlfWAsXG4gICAgICAgICAgICAgICAgICAgIGluc3RydWN0aW9uOiAn6K+356Gu6K6k6ISa5pys5bey57yW6K+R44CB57G757un5om/IENvbXBvbmVudOOAgUBjY2NsYXNzIOWQjeS4juaWh+S7tuWQjeS4gOiHtOOAgidcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRBdmFpbGFibGVDb21wb25lbnRzKGNhdGVnb3J5OiBzdHJpbmcgPSAnYWxsJyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IGNvbXBvbmVudENhdGVnb3JpZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZ1tdPiA9IHtcbiAgICAgICAgICAgIHJlbmRlcmVyOiBbJ2NjLlNwcml0ZScsICdjYy5MYWJlbCcsICdjYy5SaWNoVGV4dCcsICdjYy5NYXNrJywgJ2NjLkdyYXBoaWNzJ10sXG4gICAgICAgICAgICB1aTogWydjYy5CdXR0b24nLCAnY2MuVG9nZ2xlJywgJ2NjLlNsaWRlcicsICdjYy5TY3JvbGxWaWV3JywgJ2NjLkVkaXRCb3gnLCAnY2MuUHJvZ3Jlc3NCYXInXSxcbiAgICAgICAgICAgIHBoeXNpY3M6IFsnY2MuUmlnaWRCb2R5MkQnLCAnY2MuQm94Q29sbGlkZXIyRCcsICdjYy5DaXJjbGVDb2xsaWRlcjJEJywgJ2NjLlBvbHlnb25Db2xsaWRlcjJEJ10sXG4gICAgICAgICAgICBhbmltYXRpb246IFsnY2MuQW5pbWF0aW9uJywgJ2NjLkFuaW1hdGlvbkNsaXAnLCAnY2MuU2tlbGV0YWxBbmltYXRpb24nXSxcbiAgICAgICAgICAgIGF1ZGlvOiBbJ2NjLkF1ZGlvU291cmNlJ10sXG4gICAgICAgICAgICBsYXlvdXQ6IFsnY2MuTGF5b3V0JywgJ2NjLldpZGdldCcsICdjYy5QYWdlVmlldycsICdjYy5QYWdlVmlld0luZGljYXRvciddLFxuICAgICAgICAgICAgZWZmZWN0czogWydjYy5Nb3Rpb25TdHJlYWsnLCAnY2MuUGFydGljbGVTeXN0ZW0yRCddLFxuICAgICAgICAgICAgY2FtZXJhOiBbJ2NjLkNhbWVyYSddLFxuICAgICAgICAgICAgbGlnaHQ6IFsnY2MuTGlnaHQnLCAnY2MuRGlyZWN0aW9uYWxMaWdodCcsICdjYy5Qb2ludExpZ2h0JywgJ2NjLlNwb3RMaWdodCddXG4gICAgICAgIH07XG5cbiAgICAgICAgbGV0IGNvbXBvbmVudHM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIFxuICAgICAgICBpZiAoY2F0ZWdvcnkgPT09ICdhbGwnKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNhdCBpbiBjb21wb25lbnRDYXRlZ29yaWVzKSB7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50cyA9IGNvbXBvbmVudHMuY29uY2F0KGNvbXBvbmVudENhdGVnb3JpZXNbY2F0XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoY29tcG9uZW50Q2F0ZWdvcmllc1tjYXRlZ29yeV0pIHtcbiAgICAgICAgICAgIGNvbXBvbmVudHMgPSBjb21wb25lbnRDYXRlZ29yaWVzW2NhdGVnb3J5XTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcbiAgICAgICAgICAgICAgICBjb21wb25lbnRzOiBjb21wb25lbnRzXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBpc1ZhbGlkUHJvcGVydHlEZXNjcmlwdG9yKHByb3BEYXRhOiBhbnkpOiBib29sZWFuIHtcbiAgICAgICAgLy8g5qOA5p+l5piv5ZCm5piv5pyJ5pWI55qE5bGe5oCn5o+P6L+w5a+56LGhXG4gICAgICAgIGlmICh0eXBlb2YgcHJvcERhdGEgIT09ICdvYmplY3QnIHx8IHByb3BEYXRhID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMocHJvcERhdGEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyDpgb/lhY3pgY3ljobnroDljZXnmoTmlbDlgLzlr7nosaHvvIjlpoIge3dpZHRoOiAyMDAsIGhlaWdodDogMTUwfe+8iVxuICAgICAgICAgICAgY29uc3QgaXNTaW1wbGVWYWx1ZU9iamVjdCA9IGtleXMuZXZlcnkoa2V5ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IHByb3BEYXRhW2tleV07XG4gICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgfHwgdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdib29sZWFuJztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoaXNTaW1wbGVWYWx1ZU9iamVjdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8g5qOA5p+l5piv5ZCm5YyF5ZCr5bGe5oCn5o+P6L+w56ym55qE54m55b6B5a2X5q6177yM5LiN5L2/55SoJ2luJ+aTjeS9nOesplxuICAgICAgICAgICAgY29uc3QgaGFzTmFtZSA9IGtleXMuaW5jbHVkZXMoJ25hbWUnKTtcbiAgICAgICAgICAgIGNvbnN0IGhhc1ZhbHVlID0ga2V5cy5pbmNsdWRlcygndmFsdWUnKTtcbiAgICAgICAgICAgIGNvbnN0IGhhc1R5cGUgPSBrZXlzLmluY2x1ZGVzKCd0eXBlJyk7XG4gICAgICAgICAgICBjb25zdCBoYXNEaXNwbGF5TmFtZSA9IGtleXMuaW5jbHVkZXMoJ2Rpc3BsYXlOYW1lJyk7XG4gICAgICAgICAgICBjb25zdCBoYXNSZWFkb25seSA9IGtleXMuaW5jbHVkZXMoJ3JlYWRvbmx5Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIOW/hemhu+WMheWQq25hbWXmiJZ2YWx1ZeWtl+aute+8jOS4lOmAmuW4uOi/mOaciXR5cGXlrZfmrrVcbiAgICAgICAgICAgIGNvbnN0IGhhc1ZhbGlkU3RydWN0dXJlID0gKGhhc05hbWUgfHwgaGFzVmFsdWUpICYmIChoYXNUeXBlIHx8IGhhc0Rpc3BsYXlOYW1lIHx8IGhhc1JlYWRvbmx5KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8g6aKd5aSW5qOA5p+l77ya5aaC5p6c5pyJZGVmYXVsdOWtl+auteS4lOe7k+aehOWkjeadgu+8jOmBv+WFjea3seW6pumBjeWOhlxuICAgICAgICAgICAgaWYgKGtleXMuaW5jbHVkZXMoJ2RlZmF1bHQnKSAmJiBwcm9wRGF0YS5kZWZhdWx0ICYmIHR5cGVvZiBwcm9wRGF0YS5kZWZhdWx0ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRlZmF1bHRLZXlzID0gT2JqZWN0LmtleXMocHJvcERhdGEuZGVmYXVsdCk7XG4gICAgICAgICAgICAgICAgaWYgKGRlZmF1bHRLZXlzLmluY2x1ZGVzKCd2YWx1ZScpICYmIHR5cGVvZiBwcm9wRGF0YS5kZWZhdWx0LnZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICAvLyDov5nnp43mg4XlhrXkuIvvvIzmiJHku6zlj6rov5Tlm57pobblsYLlsZ7mgKfvvIzkuI3mt7HlhaXpgY3ljoZkZWZhdWx0LnZhbHVlXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBoYXNWYWxpZFN0cnVjdHVyZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBoYXNWYWxpZFN0cnVjdHVyZTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgW2lzVmFsaWRQcm9wZXJ0eURlc2NyaXB0b3JdIEVycm9yIGNoZWNraW5nIHByb3BlcnR5IGRlc2NyaXB0b3I6YCwgZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIOagueaNruW9kuS4gOWMluWxnuaAp+WAvOaOqOaWreexu+WeiyznlKjkuo4gc2V0LXByb3BlcnR5IOeahOi1hOa6kOexu+WIhuaUr+WIpOaWrSAqL1xuICAgIHByaXZhdGUgaW5mZXJQcm9wZXJ0eVR5cGUodmFsdWU6IGFueSwgcHJvcGVydHlOYW1lOiBzdHJpbmcsIGRlY2xhcmVkVHlwZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgLy8g55So5oi35pi+5byP5aOw5piO55qEIHByb3BlcnR5VHlwZSDkvJjlhYjnlKjkuo7lgLzlpITnkIYs5L2G5q2k5aSE6L+U5Zue55qEIHR5cGUg5LuF55So5LqOXG4gICAgICAgIC8vIOWIpOaWreaYr+WQpui1sCBhc3NldCDliIbmlK8obGluZSA3MDEg6ZmE6L+RIHByb3BlcnR5SW5mby50eXBlID09PSAnYXNzZXQnKeOAglxuICAgICAgICBpZiAoZGVjbGFyZWRUeXBlID09PSAnYXNzZXQnIHx8IGRlY2xhcmVkVHlwZSA9PT0gJ3Nwcml0ZUZyYW1lJyB8fCBkZWNsYXJlZFR5cGUgPT09ICdwcmVmYWInKSByZXR1cm4gJ2Fzc2V0JztcbiAgICAgICAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICBpZiAoJ3V1aWQnIGluIHZhbHVlKSByZXR1cm4gJ2Fzc2V0JztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGVjbGFyZWRUeXBlIHx8ICd1bmtub3duJztcbiAgICB9XG5cblxuICAgIHByaXZhdGUgYW5hbHl6ZVByb3BlcnR5KGNvbXBvbmVudDogYW55LCBwcm9wZXJ0eU5hbWU6IHN0cmluZyk6IHsgZXhpc3RzOiBib29sZWFuOyB0eXBlOiBzdHJpbmc7IGF2YWlsYWJsZVByb3BlcnRpZXM6IHN0cmluZ1tdOyBvcmlnaW5hbFZhbHVlOiBhbnkgfSB7XG4gICAgICAgIC8vIOS7juWkjeadgueahOe7hOS7tue7k+aehOS4reaPkOWPluWPr+eUqOWxnuaAp1xuICAgICAgICBjb25zdCBhdmFpbGFibGVQcm9wZXJ0aWVzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBsZXQgcHJvcGVydHlWYWx1ZTogYW55ID0gdW5kZWZpbmVkO1xuICAgICAgICBsZXQgcHJvcGVydHlFeGlzdHMgPSBmYWxzZTtcbiAgICAgICAgXG4gICAgICAgIC8vIOWwneivleWkmuenjeaWueW8j+afpeaJvuWxnuaAp++8mlxuICAgICAgICAvLyAxLiDnm7TmjqXlsZ7mgKforr/pl65cbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjb21wb25lbnQsIHByb3BlcnR5TmFtZSkpIHtcbiAgICAgICAgICAgIHByb3BlcnR5VmFsdWUgPSBjb21wb25lbnRbcHJvcGVydHlOYW1lXTtcbiAgICAgICAgICAgIHByb3BlcnR5RXhpc3RzID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gMi4g5LuO5bWM5aWX57uT5p6E5Lit5p+l5om+ICjlpoLku47mtYvor5XmlbDmja7nnIvliLDnmoTlpI3mnYLnu5PmnoQpXG4gICAgICAgIGlmICghcHJvcGVydHlFeGlzdHMgJiYgY29tcG9uZW50LnByb3BlcnRpZXMgJiYgdHlwZW9mIGNvbXBvbmVudC5wcm9wZXJ0aWVzID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgLy8g6aaW5YWI5qOA5p+lcHJvcGVydGllcy52YWx1ZeaYr+WQpuWtmOWcqO+8iOi/meaYr+aIkeS7rOWcqGdldENvbXBvbmVudHPkuK3nnIvliLDnmoTnu5PmnoTvvIlcbiAgICAgICAgICAgIGlmIChjb21wb25lbnQucHJvcGVydGllcy52YWx1ZSAmJiB0eXBlb2YgY29tcG9uZW50LnByb3BlcnRpZXMudmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWVPYmogPSBjb21wb25lbnQucHJvcGVydGllcy52YWx1ZTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHByb3BEYXRhXSBvZiBPYmplY3QuZW50cmllcyh2YWx1ZU9iaikpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g5qOA5p+lcHJvcERhdGHmmK/lkKbmmK/kuIDkuKrmnInmlYjnmoTlsZ7mgKfmj4/ov7Dlr7nosaFcbiAgICAgICAgICAgICAgICAgICAgLy8g56Gu5L+dcHJvcERhdGHmmK/lr7nosaHkuJTljIXlkKvpooTmnJ/nmoTlsZ7mgKfnu5PmnoRcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNWYWxpZFByb3BlcnR5RGVzY3JpcHRvcihwcm9wRGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3BJbmZvID0gcHJvcERhdGEgYXMgYW55O1xuICAgICAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlUHJvcGVydGllcy5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoa2V5ID09PSBwcm9wZXJ0eU5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDkvJjlhYjkvb/nlKh2YWx1ZeWxnuaAp++8jOWmguaenOayoeacieWImeS9v+eUqHByb3BEYXRh5pys6LqrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvcEtleXMgPSBPYmplY3Qua2V5cyhwcm9wSW5mbyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5VmFsdWUgPSBwcm9wS2V5cy5pbmNsdWRlcygndmFsdWUnKSA/IHByb3BJbmZvLnZhbHVlIDogcHJvcEluZm87XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c5qOA5p+l5aSx6LSl77yM55u05o6l5L2/55SocHJvcEluZm9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlWYWx1ZSA9IHByb3BJbmZvO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eUV4aXN0cyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIOWkh+eUqOaWueahiO+8muebtOaOpeS7jnByb3BlcnRpZXPmn6Xmib5cbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHByb3BEYXRhXSBvZiBPYmplY3QuZW50cmllcyhjb21wb25lbnQucHJvcGVydGllcykpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNWYWxpZFByb3BlcnR5RGVzY3JpcHRvcihwcm9wRGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3BJbmZvID0gcHJvcERhdGEgYXMgYW55O1xuICAgICAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlUHJvcGVydGllcy5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoa2V5ID09PSBwcm9wZXJ0eU5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDkvJjlhYjkvb/nlKh2YWx1ZeWxnuaAp++8jOWmguaenOayoeacieWImeS9v+eUqHByb3BEYXRh5pys6LqrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvcEtleXMgPSBPYmplY3Qua2V5cyhwcm9wSW5mbyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5VmFsdWUgPSBwcm9wS2V5cy5pbmNsdWRlcygndmFsdWUnKSA/IHByb3BJbmZvLnZhbHVlIDogcHJvcEluZm87XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c5qOA5p+l5aSx6LSl77yM55u05o6l5L2/55SocHJvcEluZm9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlWYWx1ZSA9IHByb3BJbmZvO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eUV4aXN0cyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIDMuIOS7juebtOaOpeWxnuaAp+S4reaPkOWPlueugOWNleWxnuaAp+WQjVxuICAgICAgICBpZiAoYXZhaWxhYmxlUHJvcGVydGllcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGNvbXBvbmVudCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWtleS5zdGFydHNXaXRoKCdfJykgJiYgIVsnX190eXBlX18nLCAnY2lkJywgJ25vZGUnLCAndXVpZCcsICduYW1lJywgJ2VuYWJsZWQnLCAndHlwZScsICdyZWFkb25seScsICd2aXNpYmxlJ10uaW5jbHVkZXMoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVQcm9wZXJ0aWVzLnB1c2goa2V5KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICghcHJvcGVydHlFeGlzdHMpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgZXhpc3RzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB0eXBlOiAndW5rbm93bicsXG4gICAgICAgICAgICAgICAgYXZhaWxhYmxlUHJvcGVydGllcyxcbiAgICAgICAgICAgICAgICBvcmlnaW5hbFZhbHVlOiB1bmRlZmluZWRcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGxldCB0eXBlID0gJ3Vua25vd24nO1xuICAgICAgICBcbiAgICAgICAgLy8g5pm66IO957G75Z6L5qOA5rWLXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHByb3BlcnR5VmFsdWUpKSB7XG4gICAgICAgICAgICAvLyDmlbDnu4Tnsbvlnovmo4DmtYtcbiAgICAgICAgICAgIGlmIChwcm9wZXJ0eU5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnbm9kZScpKSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICdub2RlQXJyYXknO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eU5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnY29sb3InKSkge1xuICAgICAgICAgICAgICAgIHR5cGUgPSAnY29sb3JBcnJheSc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHR5cGUgPSAnYXJyYXknO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwcm9wZXJ0eVZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgcHJvcGVydHkgbmFtZSBzdWdnZXN0cyBpdCdzIGFuIGFzc2V0XG4gICAgICAgICAgICBpZiAoWydzcHJpdGVGcmFtZScsICd0ZXh0dXJlJywgJ21hdGVyaWFsJywgJ2ZvbnQnLCAnY2xpcCcsICdwcmVmYWInXS5pbmNsdWRlcyhwcm9wZXJ0eU5hbWUudG9Mb3dlckNhc2UoKSkpIHtcbiAgICAgICAgICAgICAgICB0eXBlID0gJ2Fzc2V0JztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICdzdHJpbmcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwcm9wZXJ0eVZhbHVlID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgdHlwZSA9ICdudW1iZXInO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwcm9wZXJ0eVZhbHVlID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIHR5cGUgPSAnYm9vbGVhbic7XG4gICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlWYWx1ZSAmJiB0eXBlb2YgcHJvcGVydHlWYWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKHByb3BlcnR5VmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmIChrZXlzLmluY2x1ZGVzKCdyJykgJiYga2V5cy5pbmNsdWRlcygnZycpICYmIGtleXMuaW5jbHVkZXMoJ2InKSkge1xuICAgICAgICAgICAgICAgICAgICB0eXBlID0gJ2NvbG9yJztcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtleXMuaW5jbHVkZXMoJ3gnKSAmJiBrZXlzLmluY2x1ZGVzKCd5JykpIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9IHByb3BlcnR5VmFsdWUueiAhPT0gdW5kZWZpbmVkID8gJ3ZlYzMnIDogJ3ZlYzInO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5cy5pbmNsdWRlcygnd2lkdGgnKSAmJiBrZXlzLmluY2x1ZGVzKCdoZWlnaHQnKSkge1xuICAgICAgICAgICAgICAgICAgICB0eXBlID0gJ3NpemUnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5cy5pbmNsdWRlcygndXVpZCcpIHx8IGtleXMuaW5jbHVkZXMoJ19fdXVpZF9fJykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g5qOA5p+l5piv5ZCm5piv6IqC54K55byV55So77yI6YCa6L+H5bGe5oCn5ZCN5oiWX19pZF9f5bGe5oCn5Yik5pat77yJXG4gICAgICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0eU5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnbm9kZScpIHx8IFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlOYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ3RhcmdldCcpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlzLmluY2x1ZGVzKCdfX2lkX18nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZSA9ICdub2RlJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGUgPSAnYXNzZXQnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrZXlzLmluY2x1ZGVzKCdfX2lkX18nKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyDoioLngrnlvJXnlKjnibnlvoFcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9ICdub2RlJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0eXBlID0gJ29iamVjdCc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYFthbmFseXplUHJvcGVydHldIEVycm9yIGNoZWNraW5nIHByb3BlcnR5IHR5cGUgZm9yOiAke0pTT04uc3RyaW5naWZ5KHByb3BlcnR5VmFsdWUpfWApO1xuICAgICAgICAgICAgICAgIHR5cGUgPSAnb2JqZWN0JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVZhbHVlID09PSBudWxsIHx8IHByb3BlcnR5VmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gRm9yIG51bGwvdW5kZWZpbmVkIHZhbHVlcywgY2hlY2sgcHJvcGVydHkgbmFtZSB0byBkZXRlcm1pbmUgdHlwZVxuICAgICAgICAgICAgaWYgKFsnc3ByaXRlRnJhbWUnLCAndGV4dHVyZScsICdtYXRlcmlhbCcsICdmb250JywgJ2NsaXAnLCAncHJlZmFiJ10uaW5jbHVkZXMocHJvcGVydHlOYW1lLnRvTG93ZXJDYXNlKCkpKSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICdhc3NldCc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5TmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdub2RlJykgfHwgXG4gICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlOYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ3RhcmdldCcpKSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICdub2RlJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlOYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ2NvbXBvbmVudCcpKSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICdjb21wb25lbnQnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0eXBlID0gJ3Vua25vd24nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZXhpc3RzOiB0cnVlLFxuICAgICAgICAgICAgdHlwZSxcbiAgICAgICAgICAgIGF2YWlsYWJsZVByb3BlcnRpZXMsXG4gICAgICAgICAgICBvcmlnaW5hbFZhbHVlOiBwcm9wZXJ0eVZhbHVlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBzbWFydENvbnZlcnRWYWx1ZShpbnB1dFZhbHVlOiBhbnksIHByb3BlcnR5SW5mbzogYW55KTogYW55IHtcbiAgICAgICAgY29uc3QgeyB0eXBlLCBvcmlnaW5hbFZhbHVlIH0gPSBwcm9wZXJ0eUluZm87XG4gICAgICAgIFxuICAgICAgICBjb25zb2xlLmxvZyhgW3NtYXJ0Q29udmVydFZhbHVlXSBDb252ZXJ0aW5nICR7SlNPTi5zdHJpbmdpZnkoaW5wdXRWYWx1ZSl9IHRvIHR5cGU6ICR7dHlwZX1gKTtcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gU3RyaW5nKGlucHV0VmFsdWUpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gTnVtYmVyKGlucHV0VmFsdWUpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpbnB1dFZhbHVlID09PSAnYm9vbGVhbicpIHJldHVybiBpbnB1dFZhbHVlO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaW5wdXRWYWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGlucHV0VmFsdWUudG9Mb3dlckNhc2UoKSA9PT0gJ3RydWUnIHx8IGlucHV0VmFsdWUgPT09ICcxJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIEJvb2xlYW4oaW5wdXRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdjb2xvcic6XG4gICAgICAgICAgICAgICAgLy8g5LyY5YyW55qE6aKc6Imy5aSE55CG77yM5pSv5oyB5aSa56eN6L6T5YWl5qC85byPXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpbnB1dFZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAvLyDlrZfnrKbkuLLmoLzlvI/vvJrljYHlha3ov5vliLbjgIHpopzoibLlkI3np7DjgIFyZ2IoKS9yZ2JhKClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyc2VDb2xvclN0cmluZyhpbnB1dFZhbHVlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBpbnB1dFZhbHVlID09PSAnb2JqZWN0JyAmJiBpbnB1dFZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpbnB1dEtleXMgPSBPYmplY3Qua2V5cyhpbnB1dFZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWmguaenOi+k+WFpeaYr+minOiJsuWvueixoe+8jOmqjOivgeW5tui9rOaNolxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0S2V5cy5pbmNsdWRlcygncicpIHx8IGlucHV0S2V5cy5pbmNsdWRlcygnZycpIHx8IGlucHV0S2V5cy5pbmNsdWRlcygnYicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcjogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIoaW5wdXRWYWx1ZS5yKSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGc6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGlucHV0VmFsdWUuZykgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpbnB1dFZhbHVlLmIpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYTogaW5wdXRWYWx1ZS5hICE9PSB1bmRlZmluZWQgPyBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpbnB1dFZhbHVlLmEpKSkgOiAyNTVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBbc21hcnRDb252ZXJ0VmFsdWVdIEludmFsaWQgY29sb3Igb2JqZWN0OiAke0pTT04uc3RyaW5naWZ5KGlucHV0VmFsdWUpfWApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIOWmguaenOacieWOn+WAvO+8jOS/neaMgeWOn+WAvOe7k+aehOW5tuabtOaWsOaPkOS+m+eahOWAvFxuICAgICAgICAgICAgICAgIGlmIChvcmlnaW5hbFZhbHVlICYmIHR5cGVvZiBvcmlnaW5hbFZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5wdXRLZXlzID0gdHlwZW9mIGlucHV0VmFsdWUgPT09ICdvYmplY3QnICYmIGlucHV0VmFsdWUgPyBPYmplY3Qua2V5cyhpbnB1dFZhbHVlKSA6IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByOiBpbnB1dEtleXMuaW5jbHVkZXMoJ3InKSA/IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGlucHV0VmFsdWUucikpKSA6IChvcmlnaW5hbFZhbHVlLnIgfHwgMjU1KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnOiBpbnB1dEtleXMuaW5jbHVkZXMoJ2cnKSA/IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGlucHV0VmFsdWUuZykpKSA6IChvcmlnaW5hbFZhbHVlLmcgfHwgMjU1KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBiOiBpbnB1dEtleXMuaW5jbHVkZXMoJ2InKSA/IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGlucHV0VmFsdWUuYikpKSA6IChvcmlnaW5hbFZhbHVlLmIgfHwgMjU1KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhOiBpbnB1dEtleXMuaW5jbHVkZXMoJ2EnKSA/IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGlucHV0VmFsdWUuYSkpKSA6IChvcmlnaW5hbFZhbHVlLmEgfHwgMjU1KVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgW3NtYXJ0Q29udmVydFZhbHVlXSBFcnJvciBwcm9jZXNzaW5nIGNvbG9yIHdpdGggb3JpZ2luYWwgdmFsdWU6ICR7ZXJyb3J9YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8g6buY6K6k6L+U5Zue55m96ImyXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBbc21hcnRDb252ZXJ0VmFsdWVdIFVzaW5nIGRlZmF1bHQgd2hpdGUgY29sb3IgZm9yIGludmFsaWQgaW5wdXQ6ICR7SlNPTi5zdHJpbmdpZnkoaW5wdXRWYWx1ZSl9YCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgcjogMjU1LCBnOiAyNTUsIGI6IDI1NSwgYTogMjU1IH07XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICd2ZWMyJzpcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGlucHV0VmFsdWUgPT09ICdvYmplY3QnICYmIGlucHV0VmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHg6IE51bWJlcihpbnB1dFZhbHVlLngpIHx8IG9yaWdpbmFsVmFsdWUueCB8fCAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgeTogTnVtYmVyKGlucHV0VmFsdWUueSkgfHwgb3JpZ2luYWxWYWx1ZS55IHx8IDBcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsVmFsdWU7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICd2ZWMzJzpcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGlucHV0VmFsdWUgPT09ICdvYmplY3QnICYmIGlucHV0VmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHg6IE51bWJlcihpbnB1dFZhbHVlLngpIHx8IG9yaWdpbmFsVmFsdWUueCB8fCAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgeTogTnVtYmVyKGlucHV0VmFsdWUueSkgfHwgb3JpZ2luYWxWYWx1ZS55IHx8IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICB6OiBOdW1iZXIoaW5wdXRWYWx1ZS56KSB8fCBvcmlnaW5hbFZhbHVlLnogfHwgMFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gb3JpZ2luYWxWYWx1ZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ3NpemUnOlxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaW5wdXRWYWx1ZSA9PT0gJ29iamVjdCcgJiYgaW5wdXRWYWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IE51bWJlcihpbnB1dFZhbHVlLndpZHRoKSB8fCBvcmlnaW5hbFZhbHVlLndpZHRoIHx8IDEwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogTnVtYmVyKGlucHV0VmFsdWUuaGVpZ2h0KSB8fCBvcmlnaW5hbFZhbHVlLmhlaWdodCB8fCAxMDBcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsVmFsdWU7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdub2RlJzpcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGlucHV0VmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOiKgueCueW8leeUqOmcgOimgeeJueauiuWkhOeQhlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaW5wdXRWYWx1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBpbnB1dFZhbHVlID09PSAnb2JqZWN0JyAmJiBpbnB1dFZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOWmguaenOW3sue7j+aYr+WvueixoeW9ouW8j++8jOi/lOWbnlVVSUTmiJblrozmlbTlr7nosaFcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGlucHV0VmFsdWUudXVpZCB8fCBpbnB1dFZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gb3JpZ2luYWxWYWx1ZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ2Fzc2V0JzpcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGlucHV0VmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOWmguaenOi+k+WFpeaYr+Wtl+espuS4sui3r+W+hO+8jOi9rOaNouS4umFzc2V05a+56LGhXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHV1aWQ6IGlucHV0VmFsdWUgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBpbnB1dFZhbHVlID09PSAnb2JqZWN0JyAmJiBpbnB1dFZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpbnB1dFZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gb3JpZ2luYWxWYWx1ZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8g5a+55LqO5pyq55+l57G75Z6L77yM5bC96YeP5L+d5oyB5Y6f5pyJ57uT5p6EXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpbnB1dFZhbHVlID09PSB0eXBlb2Ygb3JpZ2luYWxWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaW5wdXRWYWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsVmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAgICAgcHJpdmF0ZSBwYXJzZUNvbG9yU3RyaW5nKGNvbG9yU3RyOiBzdHJpbmcpOiB7IHI6IG51bWJlcjsgZzogbnVtYmVyOyBiOiBudW1iZXI7IGE6IG51bWJlciB9IHtcbiAgICAgICAgY29uc3Qgc3RyID0gY29sb3JTdHIudHJpbSgpO1xuICAgICAgICBcbiAgICAgICAgLy8g5Y+q5pSv5oyB5Y2B5YWt6L+b5Yi25qC85byPICNSUkdHQkIg5oiWICNSUkdHQkJBQVxuICAgICAgICBpZiAoc3RyLnN0YXJ0c1dpdGgoJyMnKSkge1xuICAgICAgICAgICAgaWYgKHN0ci5sZW5ndGggPT09IDcpIHsgLy8gI1JSR0dCQlxuICAgICAgICAgICAgICAgIGNvbnN0IHIgPSBwYXJzZUludChzdHIuc3Vic3RyaW5nKDEsIDMpLCAxNik7XG4gICAgICAgICAgICAgICAgY29uc3QgZyA9IHBhcnNlSW50KHN0ci5zdWJzdHJpbmcoMywgNSksIDE2KTtcbiAgICAgICAgICAgICAgICBjb25zdCBiID0gcGFyc2VJbnQoc3RyLnN1YnN0cmluZyg1LCA3KSwgMTYpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHIsIGcsIGIsIGE6IDI1NSB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzdHIubGVuZ3RoID09PSA5KSB7IC8vICNSUkdHQkJBQVxuICAgICAgICAgICAgICAgIGNvbnN0IHIgPSBwYXJzZUludChzdHIuc3Vic3RyaW5nKDEsIDMpLCAxNik7XG4gICAgICAgICAgICAgICAgY29uc3QgZyA9IHBhcnNlSW50KHN0ci5zdWJzdHJpbmcoMywgNSksIDE2KTtcbiAgICAgICAgICAgICAgICBjb25zdCBiID0gcGFyc2VJbnQoc3RyLnN1YnN0cmluZyg1LCA3KSwgMTYpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGEgPSBwYXJzZUludChzdHIuc3Vic3RyaW5nKDcsIDkpLCAxNik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgciwgZywgYiwgYSB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyDlpoLmnpzkuI3mmK/mnInmlYjnmoTljYHlha3ov5vliLbmoLzlvI/vvIzov5Tlm57plJnor6/mj5DnpLpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGNvbG9yIGZvcm1hdDogXCIke2NvbG9yU3RyfVwiLiBPbmx5IGhleGFkZWNpbWFsIGZvcm1hdCBpcyBzdXBwb3J0ZWQgKGUuZy4sIFwiI0ZGMDAwMFwiIG9yIFwiI0ZGMDAwMEZGXCIpYCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyB2ZXJpZnlQcm9wZXJ0eUNoYW5nZShub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcsIHByb3BlcnR5OiBzdHJpbmcsIG9yaWdpbmFsVmFsdWU6IGFueSwgZXhwZWN0ZWRWYWx1ZTogYW55KTogUHJvbWlzZTx7IHZlcmlmaWVkOiBib29sZWFuOyBhY3R1YWxWYWx1ZTogYW55OyBmdWxsRGF0YTogYW55IH0+IHtcbiAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gU3RhcnRpbmcgdmVyaWZpY2F0aW9uIGZvciAke2NvbXBvbmVudFR5cGV9LiR7cHJvcGVydHl9YCk7XG4gICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIEV4cGVjdGVkIHZhbHVlOmAsIEpTT04uc3RyaW5naWZ5KGV4cGVjdGVkVmFsdWUpKTtcbiAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gT3JpZ2luYWwgdmFsdWU6YCwgSlNPTi5zdHJpbmdpZnkob3JpZ2luYWxWYWx1ZSkpO1xuICAgICAgICBcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIOmHjeaWsOiOt+WPlue7hOS7tuS/oeaBr+i/m+ihjOmqjOivgVxuICAgICAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gQ2FsbGluZyBnZXRDb21wb25lbnRJbmZvLi4uYCk7XG4gICAgICAgICAgICBjb25zdCBjb21wb25lbnRJbmZvID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRJbmZvKG5vZGVVdWlkLCBjb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIGdldENvbXBvbmVudEluZm8gc3VjY2VzczpgLCBjb21wb25lbnRJbmZvLnN1Y2Nlc3MpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBhbGxDb21wb25lbnRzID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRzKG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIGdldENvbXBvbmVudHMgc3VjY2VzczpgLCBhbGxDb21wb25lbnRzLnN1Y2Nlc3MpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoY29tcG9uZW50SW5mby5zdWNjZXNzICYmIGNvbXBvbmVudEluZm8uZGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIENvbXBvbmVudCBkYXRhIGF2YWlsYWJsZSwgZXh0cmFjdGluZyBwcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nYCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYWxsUHJvcGVydHlOYW1lcyA9IE9iamVjdC5rZXlzKGNvbXBvbmVudEluZm8uZGF0YS5wcm9wZXJ0aWVzIHx8IHt9KTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBBdmFpbGFibGUgcHJvcGVydGllczpgLCBhbGxQcm9wZXJ0eU5hbWVzKTtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9wZXJ0eURhdGEgPSBjb21wb25lbnRJbmZvLmRhdGEucHJvcGVydGllcz8uW3Byb3BlcnR5XTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBSYXcgcHJvcGVydHkgZGF0YSBmb3IgJyR7cHJvcGVydHl9JzpgLCBKU09OLnN0cmluZ2lmeShwcm9wZXJ0eURhdGEpKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyDku47lsZ7mgKfmlbDmja7kuK3mj5Dlj5blrp7pmYXlgLxcbiAgICAgICAgICAgICAgICBsZXQgYWN0dWFsVmFsdWUgPSBwcm9wZXJ0eURhdGE7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gSW5pdGlhbCBhY3R1YWxWYWx1ZTpgLCBKU09OLnN0cmluZ2lmeShhY3R1YWxWYWx1ZSkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0eURhdGEgJiYgdHlwZW9mIHByb3BlcnR5RGF0YSA9PT0gJ29iamVjdCcgJiYgJ3ZhbHVlJyBpbiBwcm9wZXJ0eURhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgYWN0dWFsVmFsdWUgPSBwcm9wZXJ0eURhdGEudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIEV4dHJhY3RlZCBhY3R1YWxWYWx1ZSBmcm9tIC52YWx1ZTpgLCBKU09OLnN0cmluZ2lmeShhY3R1YWxWYWx1ZSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIE5vIC52YWx1ZSBwcm9wZXJ0eSBmb3VuZCwgdXNpbmcgcmF3IGRhdGFgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8g5L+u5aSN6aqM6K+B6YC76L6R77ya5qOA5p+l5a6e6ZmF5YC85piv5ZCm5Yy56YWN5pyf5pyb5YC8XG4gICAgICAgICAgICAgICAgbGV0IHZlcmlmaWVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBleHBlY3RlZFZhbHVlID09PSAnb2JqZWN0JyAmJiBleHBlY3RlZFZhbHVlICE9PSBudWxsICYmICd1dWlkJyBpbiBleHBlY3RlZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOWvueS6juW8leeUqOexu+Wei++8iOiKgueCuS/nu4Tku7Yv6LWE5rqQ77yJ77yM5q+U6L6DVVVJRFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhY3R1YWxVdWlkID0gYWN0dWFsVmFsdWUgJiYgdHlwZW9mIGFjdHVhbFZhbHVlID09PSAnb2JqZWN0JyAmJiAndXVpZCcgaW4gYWN0dWFsVmFsdWUgPyBhY3R1YWxWYWx1ZS51dWlkIDogJyc7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4cGVjdGVkVXVpZCA9IGV4cGVjdGVkVmFsdWUudXVpZCB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgdmVyaWZpZWQgPSBhY3R1YWxVdWlkID09PSBleHBlY3RlZFV1aWQgJiYgZXhwZWN0ZWRVdWlkICE9PSAnJztcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIFJlZmVyZW5jZSBjb21wYXJpc29uOmApO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICAtIEV4cGVjdGVkIFVVSUQ6IFwiJHtleHBlY3RlZFV1aWR9XCJgKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgLSBBY3R1YWwgVVVJRDogXCIke2FjdHVhbFV1aWR9XCJgKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgLSBVVUlEIG1hdGNoOiAke2FjdHVhbFV1aWQgPT09IGV4cGVjdGVkVXVpZH1gKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgLSBVVUlEIG5vdCBlbXB0eTogJHtleHBlY3RlZFV1aWQgIT09ICcnfWApO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICAtIEZpbmFsIHZlcmlmaWVkOiAke3ZlcmlmaWVkfWApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOWvueS6juWFtuS7luexu+Wei++8jOebtOaOpeavlOi+g+WAvFxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBWYWx1ZSBjb21wYXJpc29uOmApO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICAtIEV4cGVjdGVkIHR5cGU6ICR7dHlwZW9mIGV4cGVjdGVkVmFsdWV9YCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgIC0gQWN0dWFsIHR5cGU6ICR7dHlwZW9mIGFjdHVhbFZhbHVlfWApO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBhY3R1YWxWYWx1ZSA9PT0gdHlwZW9mIGV4cGVjdGVkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgYWN0dWFsVmFsdWUgPT09ICdvYmplY3QnICYmIGFjdHVhbFZhbHVlICE9PSBudWxsICYmIGV4cGVjdGVkVmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlr7nosaHnsbvlnovnmoTmt7Hluqbmr5TovoNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJpZmllZCA9IEpTT04uc3RyaW5naWZ5KGFjdHVhbFZhbHVlKSA9PT0gSlNPTi5zdHJpbmdpZnkoZXhwZWN0ZWRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgLSBPYmplY3QgY29tcGFyaXNvbiAoSlNPTik6ICR7dmVyaWZpZWR9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWfuuacrOexu+Wei+eahOebtOaOpeavlOi+g1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmlmaWVkID0gYWN0dWFsVmFsdWUgPT09IGV4cGVjdGVkVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgLSBEaXJlY3QgY29tcGFyaXNvbjogJHt2ZXJpZmllZH1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOexu+Wei+S4jeWMuemFjeaXtueahOeJueauiuWkhOeQhu+8iOWmguaVsOWtl+WSjOWtl+espuS4su+8iVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RyaW5nTWF0Y2ggPSBTdHJpbmcoYWN0dWFsVmFsdWUpID09PSBTdHJpbmcoZXhwZWN0ZWRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBudW1iZXJNYXRjaCA9IE51bWJlcihhY3R1YWxWYWx1ZSkgPT09IE51bWJlcihleHBlY3RlZFZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcmlmaWVkID0gc3RyaW5nTWF0Y2ggfHwgbnVtYmVyTWF0Y2g7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICAtIFN0cmluZyBtYXRjaDogJHtzdHJpbmdNYXRjaH1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgIC0gTnVtYmVyIG1hdGNoOiAke251bWJlck1hdGNofWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgLSBUeXBlIG1pc21hdGNoIHZlcmlmaWVkOiAke3ZlcmlmaWVkfWApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIEZpbmFsIHZlcmlmaWNhdGlvbiByZXN1bHQ6ICR7dmVyaWZpZWR9YCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gRmluYWwgYWN0dWFsVmFsdWU6YCwgSlNPTi5zdHJpbmdpZnkoYWN0dWFsVmFsdWUpKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSB7XG4gICAgICAgICAgICAgICAgICAgIHZlcmlmaWVkLFxuICAgICAgICAgICAgICAgICAgICBhY3R1YWxWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgZnVsbERhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWPqui/lOWbnuS/ruaUueeahOWxnuaAp+S/oeaBr++8jOS4jei/lOWbnuWujOaVtOe7hOS7tuaVsOaNrlxuICAgICAgICAgICAgICAgICAgICAgICAgbW9kaWZpZWRQcm9wZXJ0eToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHByb3BlcnR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJlZm9yZTogb3JpZ2luYWxWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RlZDogZXhwZWN0ZWRWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3R1YWw6IGFjdHVhbFZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmlmaWVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5TWV0YWRhdGE6IHByb3BlcnR5RGF0YSAvLyDlj6rljIXlkKvov5nkuKrlsZ7mgKfnmoTlhYPmlbDmja5cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDnroDljJbnmoTnu4Tku7bkv6Hmga9cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFN1bW1hcnk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsUHJvcGVydGllczogT2JqZWN0LmtleXMoY29tcG9uZW50SW5mby5kYXRhPy5wcm9wZXJ0aWVzIHx8IHt9KS5sZW5ndGhcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gUmV0dXJuaW5nIHJlc3VsdDpgLCBKU09OLnN0cmluZ2lmeShyZXN1bHQsIG51bGwsIDIpKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBDb21wb25lbnRJbmZvIGZhaWxlZCBvciBubyBkYXRhOmAsIGNvbXBvbmVudEluZm8pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBWZXJpZmljYXRpb24gZmFpbGVkIHdpdGggZXJyb3I6JywgZXJyb3IpO1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBFcnJvciBzdGFjazonLCBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3Iuc3RhY2sgOiAnTm8gc3RhY2sgdHJhY2UnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gUmV0dXJuaW5nIGZhbGxiYWNrIHJlc3VsdGApO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdmVyaWZpZWQ6IGZhbHNlLFxuICAgICAgICAgICAgYWN0dWFsVmFsdWU6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGZ1bGxEYXRhOiBudWxsXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5qOA5rWL5piv5ZCm5Li66IqC54K55bGe5oCn77yM5aaC5p6c5piv5YiZ6YeN5a6a5ZCR5Yiw5a+55bqU55qE6IqC54K55pa55rOVXG4gICAgICovXG4gICAgcHJpdmF0ZSBhc3luYyBjaGVja0FuZFJlZGlyZWN0Tm9kZVByb3BlcnRpZXMoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2UgfCBudWxsPiB7XG4gICAgICAgIGNvbnN0IHsgbm9kZVV1aWQsIGNvbXBvbmVudFR5cGUsIHByb3BlcnR5LCBwcm9wZXJ0eVR5cGUsIHZhbHVlIH0gPSBhcmdzO1xuICAgICAgICBcbiAgICAgICAgLy8g5qOA5rWL5piv5ZCm5Li66IqC54K55Z+656GA5bGe5oCn77yI5bqU6K+l5L2/55SoIHNldF9ub2RlX3Byb3BlcnR577yJXG4gICAgICAgIGNvbnN0IG5vZGVCYXNpY1Byb3BlcnRpZXMgPSBbXG4gICAgICAgICAgICAnbmFtZScsICdhY3RpdmUnLCAnbGF5ZXInLCAnbW9iaWxpdHknLCAncGFyZW50JywgJ2NoaWxkcmVuJywgJ2hpZGVGbGFncydcbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIC8vIOajgOa1i+aYr+WQpuS4uuiKgueCueWPmOaNouWxnuaAp++8iOW6lOivpeS9v+eUqCBzZXRfbm9kZV90cmFuc2Zvcm3vvIlcbiAgICAgICAgY29uc3Qgbm9kZVRyYW5zZm9ybVByb3BlcnRpZXMgPSBbXG4gICAgICAgICAgICAncG9zaXRpb24nLCAncm90YXRpb24nLCAnc2NhbGUnLCAnZXVsZXJBbmdsZXMnLCAnYW5nbGUnXG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICAvLyBEZXRlY3QgYXR0ZW1wdHMgdG8gc2V0IGNjLk5vZGUgcHJvcGVydGllcyAoY29tbW9uIG1pc3Rha2UpXG4gICAgICAgIGlmIChjb21wb25lbnRUeXBlID09PSAnY2MuTm9kZScgfHwgY29tcG9uZW50VHlwZSA9PT0gJ05vZGUnKSB7XG4gICAgICAgICAgICBpZiAobm9kZUJhc2ljUHJvcGVydGllcy5pbmNsdWRlcyhwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgUHJvcGVydHkgJyR7cHJvcGVydHl9JyBpcyBhIG5vZGUgYmFzaWMgcHJvcGVydHksIG5vdCBhIGNvbXBvbmVudCBwcm9wZXJ0eWAsXG4gICAgICAgICAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb246IGBQbGVhc2UgdXNlIHNldF9ub2RlX3Byb3BlcnR5IG1ldGhvZCB0byBzZXQgbm9kZSBwcm9wZXJ0aWVzOiBzZXRfbm9kZV9wcm9wZXJ0eSh1dWlkPVwiJHtub2RlVXVpZH1cIiwgcHJvcGVydHk9XCIke3Byb3BlcnR5fVwiLCB2YWx1ZT0ke0pTT04uc3RyaW5naWZ5KHZhbHVlKX0pYFxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChub2RlVHJhbnNmb3JtUHJvcGVydGllcy5pbmNsdWRlcyhwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBQcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nIGlzIGEgbm9kZSB0cmFuc2Zvcm0gcHJvcGVydHksIG5vdCBhIGNvbXBvbmVudCBwcm9wZXJ0eWAsXG4gICAgICAgICAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb246IGBQbGVhc2UgdXNlIHNldF9ub2RlX3RyYW5zZm9ybSBtZXRob2QgdG8gc2V0IHRyYW5zZm9ybSBwcm9wZXJ0aWVzOiBzZXRfbm9kZV90cmFuc2Zvcm0odXVpZD1cIiR7bm9kZVV1aWR9XCIsICR7cHJvcGVydHl9PSR7SlNPTi5zdHJpbmdpZnkodmFsdWUpfSlgXG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIC8vIERldGVjdCBjb21tb24gaW5jb3JyZWN0IHVzYWdlXG4gICAgICAgICAgaWYgKG5vZGVCYXNpY1Byb3BlcnRpZXMuaW5jbHVkZXMocHJvcGVydHkpIHx8IG5vZGVUcmFuc2Zvcm1Qcm9wZXJ0aWVzLmluY2x1ZGVzKHByb3BlcnR5KSkge1xuICAgICAgICAgICAgICBjb25zdCBtZXRob2ROYW1lID0gbm9kZVRyYW5zZm9ybVByb3BlcnRpZXMuaW5jbHVkZXMocHJvcGVydHkpID8gJ3NldF9ub2RlX3RyYW5zZm9ybScgOiAnc2V0X25vZGVfcHJvcGVydHknO1xuICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICBlcnJvcjogYFByb3BlcnR5ICcke3Byb3BlcnR5fScgaXMgYSBub2RlIHByb3BlcnR5LCBub3QgYSBjb21wb25lbnQgcHJvcGVydHlgLFxuICAgICAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb246IGBQcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nIHNob3VsZCBiZSBzZXQgdXNpbmcgJHttZXRob2ROYW1lfSBtZXRob2QsIG5vdCBzZXRfY29tcG9uZW50X3Byb3BlcnR5LiBQbGVhc2UgdXNlOiAke21ldGhvZE5hbWV9KHV1aWQ9XCIke25vZGVVdWlkfVwiLCAke25vZGVUcmFuc2Zvcm1Qcm9wZXJ0aWVzLmluY2x1ZGVzKHByb3BlcnR5KSA/IHByb3BlcnR5IDogYHByb3BlcnR5PVwiJHtwcm9wZXJ0eX1cImB9PSR7SlNPTi5zdHJpbmdpZnkodmFsdWUpfSlgXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIHJldHVybiBudWxsOyAvLyDkuI3mmK/oioLngrnlsZ7mgKfvvIznu6fnu63mraPluLjlpITnkIZcbiAgICAgIH1cblxuICAgICAgLyoqXG4gICAgICAgKiDnlJ/miJDnu4Tku7blu7rorq7kv6Hmga9cbiAgICAgICAqL1xuICAgICAgcHJpdmF0ZSBnZW5lcmF0ZUNvbXBvbmVudFN1Z2dlc3Rpb24ocmVxdWVzdGVkVHlwZTogc3RyaW5nLCBhdmFpbGFibGVUeXBlczogc3RyaW5nW10sIHByb3BlcnR5OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICAgIC8vIOajgOafpeaYr+WQpuWtmOWcqOebuOS8vOeahOe7hOS7tuexu+Wei1xuICAgICAgICAgIGNvbnN0IHNpbWlsYXJUeXBlcyA9IGF2YWlsYWJsZVR5cGVzLmZpbHRlcih0eXBlID0+IFxuICAgICAgICAgICAgICB0eXBlLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMocmVxdWVzdGVkVHlwZS50b0xvd2VyQ2FzZSgpKSB8fCBcbiAgICAgICAgICAgICAgcmVxdWVzdGVkVHlwZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHR5cGUudG9Mb3dlckNhc2UoKSlcbiAgICAgICAgICApO1xuICAgICAgICAgIFxuICAgICAgICAgIGxldCBpbnN0cnVjdGlvbiA9ICcnO1xuICAgICAgICAgIFxuICAgICAgICAgIGlmIChzaW1pbGFyVHlwZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICBpbnN0cnVjdGlvbiArPSBgXFxuXFxu8J+UjSBGb3VuZCBzaW1pbGFyIGNvbXBvbmVudHM6ICR7c2ltaWxhclR5cGVzLmpvaW4oJywgJyl9YDtcbiAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb24gKz0gYFxcbvCfkqEgU3VnZ2VzdGlvbjogUGVyaGFwcyB5b3UgbWVhbnQgdG8gc2V0IHRoZSAnJHtzaW1pbGFyVHlwZXNbMF19JyBjb21wb25lbnQ/YDtcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gUmVjb21tZW5kIHBvc3NpYmxlIGNvbXBvbmVudHMgYmFzZWQgb24gcHJvcGVydHkgbmFtZVxuICAgICAgICAgIGNvbnN0IHByb3BlcnR5VG9Db21wb25lbnRNYXA6IFJlY29yZDxzdHJpbmcsIHN0cmluZ1tdPiA9IHtcbiAgICAgICAgICAgICAgJ3N0cmluZyc6IFsnY2MuTGFiZWwnLCAnY2MuUmljaFRleHQnLCAnY2MuRWRpdEJveCddLFxuICAgICAgICAgICAgICAndGV4dCc6IFsnY2MuTGFiZWwnLCAnY2MuUmljaFRleHQnXSxcbiAgICAgICAgICAgICAgJ2ZvbnRTaXplJzogWydjYy5MYWJlbCcsICdjYy5SaWNoVGV4dCddLFxuICAgICAgICAgICAgICAnc3ByaXRlRnJhbWUnOiBbJ2NjLlNwcml0ZSddLFxuICAgICAgICAgICAgICAnY29sb3InOiBbJ2NjLkxhYmVsJywgJ2NjLlNwcml0ZScsICdjYy5HcmFwaGljcyddLFxuICAgICAgICAgICAgICAnbm9ybWFsQ29sb3InOiBbJ2NjLkJ1dHRvbiddLFxuICAgICAgICAgICAgICAncHJlc3NlZENvbG9yJzogWydjYy5CdXR0b24nXSxcbiAgICAgICAgICAgICAgJ3RhcmdldCc6IFsnY2MuQnV0dG9uJ10sXG4gICAgICAgICAgICAgICdjb250ZW50U2l6ZSc6IFsnY2MuVUlUcmFuc2Zvcm0nXSxcbiAgICAgICAgICAgICAgJ2FuY2hvclBvaW50JzogWydjYy5VSVRyYW5zZm9ybSddXG4gICAgICAgICAgfTtcbiAgICAgICAgICBcbiAgICAgICAgICBjb25zdCByZWNvbW1lbmRlZENvbXBvbmVudHMgPSBwcm9wZXJ0eVRvQ29tcG9uZW50TWFwW3Byb3BlcnR5XSB8fCBbXTtcbiAgICAgICAgICBjb25zdCBhdmFpbGFibGVSZWNvbW1lbmRlZCA9IHJlY29tbWVuZGVkQ29tcG9uZW50cy5maWx0ZXIoY29tcCA9PiBhdmFpbGFibGVUeXBlcy5pbmNsdWRlcyhjb21wKSk7XG4gICAgICAgICAgXG4gICAgICAgICAgaWYgKGF2YWlsYWJsZVJlY29tbWVuZGVkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb24gKz0gYFxcblxcbvCfjq8gQmFzZWQgb24gcHJvcGVydHkgJyR7cHJvcGVydHl9JywgcmVjb21tZW5kZWQgY29tcG9uZW50czogJHthdmFpbGFibGVSZWNvbW1lbmRlZC5qb2luKCcsICcpfWA7XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIC8vIFByb3ZpZGUgb3BlcmF0aW9uIHN1Z2dlc3Rpb25zXG4gICAgICAgICAgaW5zdHJ1Y3Rpb24gKz0gYFxcblxcbvCfk4sgU3VnZ2VzdGVkIEFjdGlvbnM6YDtcbiAgICAgICAgICBpbnN0cnVjdGlvbiArPSBgXFxuMS4gVXNlIGdldF9jb21wb25lbnRzKG5vZGVVdWlkPVwiJHtyZXF1ZXN0ZWRUeXBlLmluY2x1ZGVzKCd1dWlkJykgPyAnWU9VUl9OT0RFX1VVSUQnIDogJ25vZGVVdWlkJ31cIikgdG8gdmlldyBhbGwgY29tcG9uZW50cyBvbiB0aGUgbm9kZWA7XG4gICAgICAgICAgaW5zdHJ1Y3Rpb24gKz0gYFxcbjIuIElmIHlvdSBuZWVkIHRvIGFkZCBhIGNvbXBvbmVudCwgdXNlIGFkZF9jb21wb25lbnQobm9kZVV1aWQ9XCIuLi5cIiwgY29tcG9uZW50VHlwZT1cIiR7cmVxdWVzdGVkVHlwZX1cIilgO1xuICAgICAgICAgIGluc3RydWN0aW9uICs9IGBcXG4zLiBWZXJpZnkgdGhhdCB0aGUgY29tcG9uZW50IHR5cGUgbmFtZSBpcyBjb3JyZWN0IChjYXNlLXNlbnNpdGl2ZSlgO1xuICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgcmV0dXJuIGluc3RydWN0aW9uO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOW/q+mAn+mqjOivgei1hOa6kOiuvue9rue7k+aenFxuICAgICAqL1xuICAgIHByaXZhdGUgYXN5bmMgcXVpY2tWZXJpZnlBc3NldChub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcsIHByb3BlcnR5OiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmF3Tm9kZURhdGEgPSBhd2FpdCBxdWVyeU5vZGVXaXRoRmFsbGJhY2sobm9kZVV1aWQpO1xuICAgICAgICAgICAgaWYgKCFyYXdOb2RlRGF0YSB8fCAhcmF3Tm9kZURhdGEuX19jb21wc19fKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIOaJvuWIsOe7hOS7tlxuICAgICAgICAgICAgY29uc3QgY29tcG9uZW50ID0gcmF3Tm9kZURhdGEuX19jb21wc19fLmZpbmQoKGNvbXA6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBUeXBlID0gY29tcC5fX3R5cGVfXyB8fCBjb21wLmNpZCB8fCBjb21wLnR5cGU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbXBUeXBlID09PSBjb21wb25lbnRUeXBlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghY29tcG9uZW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIOaPkOWPluWxnuaAp+WAvFxuICAgICAgICAgICAgY29uc3QgcHJvcGVydGllcyA9IHRoaXMuZXh0cmFjdENvbXBvbmVudFByb3BlcnRpZXMoY29tcG9uZW50KTtcbiAgICAgICAgICAgIGNvbnN0IHByb3BlcnR5RGF0YSA9IHByb3BlcnRpZXNbcHJvcGVydHldO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocHJvcGVydHlEYXRhICYmIHR5cGVvZiBwcm9wZXJ0eURhdGEgPT09ICdvYmplY3QnICYmICd2YWx1ZScgaW4gcHJvcGVydHlEYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb3BlcnR5RGF0YS52YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb3BlcnR5RGF0YTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYFtxdWlja1ZlcmlmeUFzc2V0XSBFcnJvcjpgLCBlcnJvcik7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbn0iXX0=