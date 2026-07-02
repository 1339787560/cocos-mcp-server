"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentTools = void 0;
exports.inferPropertyTypeFromValue = inferPropertyTypeFromValue;
const compat_1 = require("../utils/compat");
/**
 * 从 value 形态推断 propertyType。与 mcp_adapter.py 的推断规则对齐,
 * 让调用方(含 adapter 透传)免显式声明 propertyType。
 * 规则:
 *  - hex 字符串 #RRGGBB/#RRGGBBAA → color
 *  - 普通字符串 → string
 *  - bool → boolean;number → number
 *  - dict {width,height} → size;{x,y,z} → vec3;{x,y} → vec2;{r,g} → color
 *  - 其余 → string(兜底)
 */
function inferPropertyTypeFromValue(value, propertyName) {
    if (typeof value === 'boolean')
        return 'boolean';
    if (typeof value === 'number')
        return 'number';
    if (typeof value === 'string') {
        if (value.startsWith('#') && (value.length === 7 || value.length === 9) &&
            /^[0-9a-fA-F]+$/.test(value.slice(1))) {
            return 'color';
        }
        return 'string';
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        if ('width' in value && 'height' in value)
            return 'size';
        if ('x' in value && 'y' in value && 'z' in value)
            return 'vec3';
        if ('x' in value && 'y' in value)
            return 'vec2';
        if ('r' in value && 'g' in value)
            return 'color';
    }
    return 'string';
}
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
                            description: 'Property type - 可选,缺省时自动从 value 推断。显式指定可覆盖推断,适配歧义场景(如 hex 字符串可能是 color 也可能是 string)',
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
                    required: ['nodeUuid', 'componentType', 'property', 'value']
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
            // 使用 create-component 消息(主路径);失败则回退场景脚本 node.addComponent
            try {
                try {
                    await (0, compat_1.createComponentWithFallback)(nodeUuid, componentType);
                }
                catch (primaryErr) {
                    // create-component 消息对部分组件(如 cc.Label)在已存在节点上会失败。
                    // 回退:场景脚本 addComponentToNode 走 node.addComponent,在场景进程内修改场景图。
                    // 场景进程 = 编辑器态,改动会被编辑器序列化保存(与 preview 运行时不同)。
                    try {
                        const fb = await Editor.Message.request('scene', 'execute-scene-script', {
                            name: 'cocos-mcp-server',
                            method: 'addComponentToNode',
                            args: [nodeUuid, componentType]
                        });
                        if (!fb || fb.success === false) {
                            throw new Error(`主路径: ${primaryErr.message}; 场景脚本回退: ${(fb === null || fb === void 0 ? void 0 : fb.error) || '失败'}`);
                        }
                    }
                    catch (fbErr) {
                        throw new Error(`create-component 失败(${primaryErr.message}),场景脚本回退也失败(${fbErr.message})`);
                    }
                }
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
                    // 验证失败:调场景脚本 addComponentToNode 拿真实原因(如组件冲突)
                    // create-component 消息对某些失败静默成功,场景脚本会抛具体错误。
                    let diagError = '';
                    try {
                        const diag = await Editor.Message.request('scene', 'execute-scene-script', {
                            name: 'cocos-mcp-server',
                            method: 'addComponentToNode',
                            args: [nodeUuid, componentType]
                        });
                        if (diag && diag.success === false) {
                            diagError = diag.error || '';
                        }
                    }
                    catch (e) {
                        diagError = e.message;
                    }
                    resolve({
                        success: false,
                        error: `Component '${componentType}' was not found on node after addition. Available components: ${availableList}` +
                            (diagError ? `\n真实原因: ${diagError}` : ''),
                        instruction: diagError && /conflict/i.test(diagError)
                            ? `[v4-hotreload-marker] cc.Label/cc.RichText/cc.Sprite 等渲染组件互斥,不能共存于同一节点。先把已有渲染组件 remove_component 再加,或换一个节点。`
                            : undefined
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
        // propertyType 缺省时从 value 自动推断(让调用方免声明类型,适配器也可纯透传)
        let { nodeUuid, componentType, property, propertyType, value } = args;
        if (!propertyType) {
            propertyType = inferPropertyTypeFromValue(value, property);
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL2NvbXBvbmVudC10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFhQSxnRUFpQkM7QUE3QkQsNENBQTBMO0FBRTFMOzs7Ozs7Ozs7R0FTRztBQUNILFNBQWdCLDBCQUEwQixDQUFDLEtBQVUsRUFBRSxZQUFxQjtJQUN4RSxJQUFJLE9BQU8sS0FBSyxLQUFLLFNBQVM7UUFBRSxPQUFPLFNBQVMsQ0FBQztJQUNqRCxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVE7UUFBRSxPQUFPLFFBQVEsQ0FBQztJQUMvQyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQzVCLElBQUksS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDO1lBQ25FLGdCQUFnQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUN4QyxPQUFPLE9BQU8sQ0FBQztRQUNuQixDQUFDO1FBQ0QsT0FBTyxRQUFRLENBQUM7SUFDcEIsQ0FBQztJQUNELElBQUksS0FBSyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUM5RCxJQUFJLE9BQU8sSUFBSSxLQUFLLElBQUksUUFBUSxJQUFJLEtBQUs7WUFBRSxPQUFPLE1BQU0sQ0FBQztRQUN6RCxJQUFJLEdBQUcsSUFBSSxLQUFLLElBQUksR0FBRyxJQUFJLEtBQUssSUFBSSxHQUFHLElBQUksS0FBSztZQUFFLE9BQU8sTUFBTSxDQUFDO1FBQ2hFLElBQUksR0FBRyxJQUFJLEtBQUssSUFBSSxHQUFHLElBQUksS0FBSztZQUFF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SSxFQUFFLENBQUM7UUFFNUIsZ0NBQWdDO1FBQ2hDLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3RCLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVU7Z0JBQzlCLE1BQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsTUFBTSxDQUFDLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM1QyxNQUFNLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzVDLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7WUFDL0IsQ0FBQztpQkFBTSxJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxZQUFZO2dCQUN2QyxNQUFNLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzVDLE1BQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsTUFBTSxDQUFDLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM1QyxNQUFNLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUs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bEQsT0FBTyxJQUFJLENBQUM7UUFDaEIsQ0FBQztJQUNMLENBQUM7Q0FDSjtBQTltREQsd0NBOG1EQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xEZWZpbml0aW9uLCBUb29sUmVzcG9uc2UsIFRvb2xFeGVjdXRvciwgQ29tcG9uZW50SW5mbyB9IGZyb20gJy4uL3R5cGVzJztcclxuaW1wb3J0IHsgY3JlYXRlQ29tcG9uZW50V2l0aEZhbGxiYWNrLCByZW1vdmVDb21wb25lbnRXaXRoRmFsbGJhY2ssIHF1ZXJ5Tm9kZVdpdGhGYWxsYmFjaywgcXVlcnlOb2RlVHJlZVdpdGhGYWxsYmFjaywgc2V0UHJvcGVydHlXaXRoRmFsbGJhY2ssIHNhZmVNZXNzYWdlUmVxdWVzdCB9IGZyb20gJy4uL3V0aWxzL2NvbXBhdCc7XHJcblxyXG4vKipcclxuICog5LuOIHZhbHVlIOW9ouaAgeaOqOaWrSBwcm9wZXJ0eVR5cGXjgILkuI4gbWNwX2FkYXB0ZXIucHkg55qE5o6o5pat6KeE5YiZ5a+56b2QLFxyXG4gKiDorqnosIPnlKjmlrko5ZCrIGFkYXB0ZXIg6YCP5LygKeWFjeaYvuW8j+WjsOaYjiBwcm9wZXJ0eVR5cGXjgIJcclxuICog6KeE5YiZOlxyXG4gKiAgLSBoZXgg5a2X56ym5LiyICNSUkdHQkIvI1JSR0dCQkFBIOKGkiBjb2xvclxyXG4gKiAgLSDmma7pgJrlrZfnrKbkuLIg4oaSIHN0cmluZ1xyXG4gKiAgLSBib29sIOKGkiBib29sZWFuO251bWJlciDihpIgbnVtYmVyXHJcbiAqICAtIGRpY3Qge3dpZHRoLGhlaWdodH0g4oaSIHNpemU7e3gseSx6fSDihpIgdmVjMzt7eCx5fSDihpIgdmVjMjt7cixnfSDihpIgY29sb3JcclxuICogIC0g5YW25L2ZIOKGkiBzdHJpbmco5YWc5bqVKVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGluZmVyUHJvcGVydHlUeXBlRnJvbVZhbHVlKHZhbHVlOiBhbnksIHByb3BlcnR5TmFtZT86IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnYm9vbGVhbicpIHJldHVybiAnYm9vbGVhbic7XHJcbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykgcmV0dXJuICdudW1iZXInO1xyXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICBpZiAodmFsdWUuc3RhcnRzV2l0aCgnIycpICYmICh2YWx1ZS5sZW5ndGggPT09IDcgfHwgdmFsdWUubGVuZ3RoID09PSA5KSAmJlxyXG4gICAgICAgICAgICAvXlswLTlhLWZBLUZdKyQvLnRlc3QodmFsdWUuc2xpY2UoMSkpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAnY29sb3InO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gJ3N0cmluZyc7XHJcbiAgICB9XHJcbiAgICBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcclxuICAgICAgICBpZiAoJ3dpZHRoJyBpbiB2YWx1ZSAmJiAnaGVpZ2h0JyBpbiB2YWx1ZSkgcmV0dXJuICdzaXplJztcclxuICAgICAgICBpZiAoJ3gnIGluIHZhbHVlICYmICd5JyBpbiB2YWx1ZSAmJiAneicgaW4gdmFsdWUpIHJldHVybiAndmVjMyc7XHJcbiAgICAgICAgaWYgKCd4JyBpbiB2YWx1ZSAmJiAneScgaW4gdmFsdWUpIHJldHVybiAndmVjMic7XHJcbiAgICAgICAgaWYgKCdyJyBpbiB2YWx1ZSAmJiAnZycgaW4gdmFsdWUpIHJldHVybiAnY29sb3InO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuICdzdHJpbmcnO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQ29tcG9uZW50VG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xyXG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XHJcbiAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2FkZF9jb21wb25lbnQnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBZGQgYSBjb21wb25lbnQgdG8gYSBzcGVjaWZpYyBub2RlLiBJTVBPUlRBTlQ6IFlvdSBtdXN0IHByb3ZpZGUgdGhlIG5vZGVVdWlkIHBhcmFtZXRlciB0byBzcGVjaWZ5IHdoaWNoIG5vZGUgdG8gYWRkIHRoZSBjb21wb25lbnQgdG8uJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RhcmdldCBub2RlIFVVSUQuIFJFUVVJUkVEOiBZb3UgbXVzdCBzcGVjaWZ5IHRoZSBleGFjdCBub2RlIHRvIGFkZCB0aGUgY29tcG9uZW50IHRvLiBVc2UgZ2V0X2FsbF9ub2RlcyBvciBmaW5kX25vZGVfYnlfbmFtZSB0byBnZXQgdGhlIFVVSUQgb2YgdGhlIGRlc2lyZWQgbm9kZS4nXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb21wb25lbnQgdHlwZSAoZS5nLiwgY2MuU3ByaXRlLCBjYy5MYWJlbCwgY2MuQnV0dG9uKSdcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnbm9kZVV1aWQnLCAnY29tcG9uZW50VHlwZSddXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdyZW1vdmVfY29tcG9uZW50JyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUmVtb3ZlIGEgY29tcG9uZW50IGZyb20gYSBub2RlLiBjb21wb25lbnRUeXBlIG11c3QgYmUgdGhlIGNvbXBvbmVudFxcJ3MgY2xhc3NJZCAoY2lkLCBpLmUuIHRoZSB0eXBlIGZpZWxkIGZyb20gZ2V0Q29tcG9uZW50cyksIG5vdCB0aGUgc2NyaXB0IG5hbWUgb3IgY2xhc3MgbmFtZS4gVXNlIGdldENvbXBvbmVudHMgdG8gZ2V0IHRoZSBjb3JyZWN0IGNpZC4nLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTm9kZSBVVUlEJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ29tcG9uZW50IGNpZCAodHlwZSBmaWVsZCBmcm9tIGdldENvbXBvbmVudHMpLiBEbyBOT1QgdXNlIHNjcmlwdCBuYW1lIG9yIGNsYXNzIG5hbWUuIEV4YW1wbGU6IFwiY2MuU3ByaXRlXCIgb3IgXCI5YjRhN3VlVDl4RDZhUkUrQWxPdXN5MVwiJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydub2RlVXVpZCcsICdjb21wb25lbnRUeXBlJ11cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2dldF9jb21wb25lbnRzJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnR2V0IGFsbCBjb21wb25lbnRzIG9mIGEgbm9kZScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdOb2RlIFVVSUQnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25vZGVVdWlkJ11cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2dldF9jb21wb25lbnRfaW5mbycsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0dldCBzcGVjaWZpYyBjb21wb25lbnQgaW5mb3JtYXRpb24nLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTm9kZSBVVUlEJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ29tcG9uZW50IHR5cGUgdG8gZ2V0IGluZm8gZm9yJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydub2RlVXVpZCcsICdjb21wb25lbnRUeXBlJ11cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3NldF9jb21wb25lbnRfcHJvcGVydHknLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTZXQgY29tcG9uZW50IHByb3BlcnR5IHZhbHVlcyBmb3IgVUkgY29tcG9uZW50cyBvciBjdXN0b20gc2NyaXB0IGNvbXBvbmVudHMuIFN1cHBvcnRzIHNldHRpbmcgcHJvcGVydGllcyBvZiBidWlsdC1pbiBVSSBjb21wb25lbnRzIChlLmcuLCBjYy5MYWJlbCwgY2MuU3ByaXRlKSBhbmQgY3VzdG9tIHNjcmlwdCBjb21wb25lbnRzLiBOb3RlOiBGb3Igbm9kZSBiYXNpYyBwcm9wZXJ0aWVzIChuYW1lLCBhY3RpdmUsIGxheWVyLCBldGMuKSwgdXNlIHNldF9ub2RlX3Byb3BlcnR5LiBGb3Igbm9kZSB0cmFuc2Zvcm0gcHJvcGVydGllcyAocG9zaXRpb24sIHJvdGF0aW9uLCBzY2FsZSwgZXRjLiksIHVzZSBzZXRfbm9kZV90cmFuc2Zvcm0uJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RhcmdldCBub2RlIFVVSUQgLSBNdXN0IHNwZWNpZnkgdGhlIG5vZGUgdG8gb3BlcmF0ZSBvbidcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NvbXBvbmVudCB0eXBlIC0gQ2FuIGJlIGJ1aWx0LWluIGNvbXBvbmVudHMgKGUuZy4sIGNjLkxhYmVsKSBvciBjdXN0b20gc2NyaXB0IGNvbXBvbmVudHMgKGUuZy4sIE15U2NyaXB0KS4gSWYgdW5zdXJlIGFib3V0IGNvbXBvbmVudCB0eXBlLCB1c2UgZ2V0X2NvbXBvbmVudHMgZmlyc3QgdG8gcmV0cmlldmUgYWxsIGNvbXBvbmVudHMgb24gdGhlIG5vZGUuJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOenu+mZpGVudW3pmZDliLbvvIzlhYHorrjku7vmhI/nu4Tku7bnsbvlnovljIXmi6zoh6rlrprkuYnohJrmnKxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQcm9wZXJ0eSBuYW1lIC0gVGhlIHByb3BlcnR5IHRvIHNldC4gQ29tbW9uIHByb3BlcnRpZXMgaW5jbHVkZTpcXG4nICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIGNjLkxhYmVsOiBzdHJpbmcgKHRleHQgY29udGVudCksIGZvbnRTaXplIChmb250IHNpemUpLCBjb2xvciAodGV4dCBjb2xvcilcXG4nICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIGNjLlNwcml0ZTogc3ByaXRlRnJhbWUgKHNwcml0ZSBmcmFtZSksIGNvbG9yICh0aW50IGNvbG9yKSwgc2l6ZU1vZGUgKHNpemUgbW9kZSlcXG4nICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIGNjLkJ1dHRvbjogbm9ybWFsQ29sb3IgKG5vcm1hbCBjb2xvciksIHByZXNzZWRDb2xvciAocHJlc3NlZCBjb2xvciksIHRhcmdldCAodGFyZ2V0IG5vZGUpXFxuJyArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBjYy5VSVRyYW5zZm9ybTogY29udGVudFNpemUgKGNvbnRlbnQgc2l6ZSksIGFuY2hvclBvaW50IChhbmNob3IgcG9pbnQpXFxuJyArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBDdXN0b20gU2NyaXB0czogQmFzZWQgb24gcHJvcGVydGllcyBkZWZpbmVkIGluIHRoZSBzY3JpcHQnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5VHlwZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1Byb3BlcnR5IHR5cGUgLSDlj6/pgIks57y655yB5pe26Ieq5Yqo5LuOIHZhbHVlIOaOqOaWreOAguaYvuW8j+aMh+WumuWPr+imhuebluaOqOaWrSzpgILphY3mrafkuYnlnLrmma8o5aaCIGhleCDlrZfnrKbkuLLlj6/og73mmK8gY29sb3Ig5Lmf5Y+v6IO95pivIHN0cmluZyknLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdzdHJpbmcnLCAnbnVtYmVyJywgJ2Jvb2xlYW4nLCAnaW50ZWdlcicsICdmbG9hdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbG9yJywgJ3ZlYzInLCAndmVjMycsICdzaXplJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnbm9kZScsICdjb21wb25lbnQnLCAnc3ByaXRlRnJhbWUnLCAncHJlZmFiJywgJ2Fzc2V0JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnbm9kZUFycmF5JywgJ2NvbG9yQXJyYXknLCAnbnVtYmVyQXJyYXknLCAnc3RyaW5nQXJyYXknXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQcm9wZXJ0eSB2YWx1ZSAtIFVzZSB0aGUgY29ycmVzcG9uZGluZyBkYXRhIGZvcm1hdCBiYXNlZCBvbiBwcm9wZXJ0eVR5cGU6XFxuXFxuJyArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ/Cfk50gQmFzaWMgRGF0YSBUeXBlczpcXG4nICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIHN0cmluZzogXCJIZWxsbyBXb3JsZFwiICh0ZXh0IHN0cmluZylcXG4nICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIG51bWJlci9pbnRlZ2VyL2Zsb2F0OiA0MiBvciAzLjE0IChudW1lcmljIHZhbHVlKVxcbicgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgYm9vbGVhbjogdHJ1ZSBvciBmYWxzZSAoYm9vbGVhbiB2YWx1ZSlcXG5cXG4nICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn8J+OqCBDb2xvciBUeXBlOlxcbicgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgY29sb3I6IHtcInJcIjoyNTUsXCJnXCI6MCxcImJcIjowLFwiYVwiOjI1NX0gKFJHQkEgdmFsdWVzLCByYW5nZSAwLTI1NSlcXG4nICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnICAtIEFsdGVybmF0aXZlOiBcIiNGRjAwMDBcIiAoaGV4YWRlY2ltYWwgZm9ybWF0KVxcbicgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgIC0gVHJhbnNwYXJlbmN5OiBhIHZhbHVlIGNvbnRyb2xzIG9wYWNpdHksIDI1NSA9IGZ1bGx5IG9wYXF1ZSwgMCA9IGZ1bGx5IHRyYW5zcGFyZW50XFxuXFxuJyArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ/Cfk5AgVmVjdG9yIGFuZCBTaXplIFR5cGVzOlxcbicgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgdmVjMjoge1wieFwiOjEwMCxcInlcIjo1MH0gKDJEIHZlY3RvcilcXG4nICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIHZlYzM6IHtcInhcIjoxLFwieVwiOjIsXCJ6XCI6M30gKDNEIHZlY3RvcilcXG4nICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIHNpemU6IHtcIndpZHRoXCI6MTAwLFwiaGVpZ2h0XCI6NTB9IChzaXplIGRpbWVuc2lvbnMpXFxuXFxuJyArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ/CflJcgUmVmZXJlbmNlIFR5cGVzICh1c2luZyBVVUlEIHN0cmluZ3MpOlxcbicgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgbm9kZTogXCJ0YXJnZXQtbm9kZS11dWlkXCIgKG5vZGUgcmVmZXJlbmNlKVxcbicgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgIEhvdyB0byBnZXQ6IFVzZSBnZXRfYWxsX25vZGVzIG9yIGZpbmRfbm9kZV9ieV9uYW1lIHRvIGdldCBub2RlIFVVSURzXFxuJyArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBjb21wb25lbnQ6IFwidGFyZ2V0LW5vZGUtdXVpZFwiIChjb21wb25lbnQgcmVmZXJlbmNlKVxcbicgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgIEhvdyBpdCB3b3JrczogXFxuJyArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyAgICAxLiBQcm92aWRlIHRoZSBVVUlEIG9mIHRoZSBOT0RFIHRoYXQgY29udGFpbnMgdGhlIHRhcmdldCBjb21wb25lbnRcXG4nICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnICAgIDIuIFN5c3RlbSBhdXRvLWRldGVjdHMgcmVxdWlyZWQgY29tcG9uZW50IHR5cGUgZnJvbSBwcm9wZXJ0eSBtZXRhZGF0YVxcbicgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgICAgMy4gRmluZHMgdGhlIGNvbXBvbmVudCBvbiB0YXJnZXQgbm9kZSBhbmQgZ2V0cyBpdHMgc2NlbmUgX19pZF9fXFxuJyArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyAgICA0LiBTZXRzIHJlZmVyZW5jZSB1c2luZyB0aGUgc2NlbmUgX19pZF9fIChub3Qgbm9kZSBVVUlEKVxcbicgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgIEV4YW1wbGU6IHZhbHVlPVwibGFiZWwtbm9kZS11dWlkXCIgd2lsbCBmaW5kIGNjLkxhYmVsIGFuZCB1c2UgaXRzIHNjZW5lIElEXFxuJyArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBzcHJpdGVGcmFtZTogXCJzcHJpdGVmcmFtZS11dWlkXCIgKHNwcml0ZSBmcmFtZSBhc3NldClcXG4nICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnICBIb3cgdG8gZ2V0OiBDaGVjayBhc3NldCBkYXRhYmFzZSBvciB1c2UgYXNzZXQgYnJvd3NlclxcbicgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgcHJlZmFiOiBcInByZWZhYi11dWlkXCIgKHByZWZhYiBhc3NldClcXG4nICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnICBIb3cgdG8gZ2V0OiBDaGVjayBhc3NldCBkYXRhYmFzZSBvciB1c2UgYXNzZXQgYnJvd3NlclxcbicgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgYXNzZXQ6IFwiYXNzZXQtdXVpZFwiIChnZW5lcmljIGFzc2V0IHJlZmVyZW5jZSlcXG4nICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnICBIb3cgdG8gZ2V0OiBDaGVjayBhc3NldCBkYXRhYmFzZSBvciB1c2UgYXNzZXQgYnJvd3NlclxcblxcbicgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfwn5OLIEFycmF5IFR5cGVzOlxcbicgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgbm9kZUFycmF5OiBbXCJ1dWlkMVwiLFwidXVpZDJcIl0gKGFycmF5IG9mIG5vZGUgVVVJRHMpXFxuJyArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBjb2xvckFycmF5OiBbe1wiclwiOjI1NSxcImdcIjowLFwiYlwiOjAsXCJhXCI6MjU1fV0gKGFycmF5IG9mIGNvbG9ycylcXG4nICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIG51bWJlckFycmF5OiBbMSwyLDMsNCw1XSAoYXJyYXkgb2YgbnVtYmVycylcXG4nICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIHN0cmluZ0FycmF5OiBbXCJpdGVtMVwiLFwiaXRlbTJcIl0gKGFycmF5IG9mIHN0cmluZ3MpJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydub2RlVXVpZCcsICdjb21wb25lbnRUeXBlJywgJ3Byb3BlcnR5JywgJ3ZhbHVlJ11cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2F0dGFjaF9zY3JpcHQnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBdHRhY2ggYSBzY3JpcHQgY29tcG9uZW50IHRvIGEgbm9kZScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdOb2RlIFVVSUQnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcmlwdFBhdGg6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTY3JpcHQgYXNzZXQgcGF0aCAoZS5nLiwgZGI6Ly9hc3NldHMvc2NyaXB0cy9NeVNjcmlwdC50cyknXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25vZGVVdWlkJywgJ3NjcmlwdFBhdGgnXVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnZ2V0X2F2YWlsYWJsZV9jb21wb25lbnRzJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnR2V0IGxpc3Qgb2YgYXZhaWxhYmxlIGNvbXBvbmVudCB0eXBlcycsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb21wb25lbnQgY2F0ZWdvcnkgZmlsdGVyJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnYWxsJywgJ3JlbmRlcmVyJywgJ3VpJywgJ3BoeXNpY3MnLCAnYW5pbWF0aW9uJywgJ2F1ZGlvJ10sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAnYWxsJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgXTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xyXG4gICAgICAgICAgICBjYXNlICdhZGRfY29tcG9uZW50JzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmFkZENvbXBvbmVudChhcmdzLm5vZGVVdWlkLCBhcmdzLmNvbXBvbmVudFR5cGUpO1xyXG4gICAgICAgICAgICBjYXNlICdyZW1vdmVfY29tcG9uZW50JzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJlbW92ZUNvbXBvbmVudChhcmdzLm5vZGVVdWlkLCBhcmdzLmNvbXBvbmVudFR5cGUpO1xyXG4gICAgICAgICAgICBjYXNlICdnZXRfY29tcG9uZW50cyc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRzKGFyZ3Mubm9kZVV1aWQpO1xyXG4gICAgICAgICAgICBjYXNlICdnZXRfY29tcG9uZW50X2luZm8nOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0Q29tcG9uZW50SW5mbyhhcmdzLm5vZGVVdWlkLCBhcmdzLmNvbXBvbmVudFR5cGUpO1xyXG4gICAgICAgICAgICBjYXNlICdzZXRfY29tcG9uZW50X3Byb3BlcnR5JzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNldENvbXBvbmVudFByb3BlcnR5KGFyZ3MpO1xyXG4gICAgICAgICAgICBjYXNlICdhdHRhY2hfc2NyaXB0JzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmF0dGFjaFNjcmlwdChhcmdzLm5vZGVVdWlkLCBhcmdzLnNjcmlwdFBhdGgpO1xyXG4gICAgICAgICAgICBjYXNlICdnZXRfYXZhaWxhYmxlX2NvbXBvbmVudHMnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0QXZhaWxhYmxlQ29tcG9uZW50cyhhcmdzLmNhdGVnb3J5KTtcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0b29sOiAke3Rvb2xOYW1lfWApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGFkZENvbXBvbmVudChub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShhc3luYyAocmVzb2x2ZSkgPT4ge1xyXG4gICAgICAgICAgICAvLyDlhYjmn6Xmib7oioLngrnkuIrmmK/lkKblt7LlrZjlnKjor6Xnu4Tku7ZcclxuICAgICAgICAgICAgY29uc3QgYWxsQ29tcG9uZW50c0luZm8gPSBhd2FpdCB0aGlzLmdldENvbXBvbmVudHMobm9kZVV1aWQpO1xyXG4gICAgICAgICAgICBpZiAoYWxsQ29tcG9uZW50c0luZm8uc3VjY2VzcyAmJiBhbGxDb21wb25lbnRzSW5mby5kYXRhPy5jb21wb25lbnRzKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBleGlzdGluZ0NvbXBvbmVudCA9IGFsbENvbXBvbmVudHNJbmZvLmRhdGEuY29tcG9uZW50cy5maW5kKChjb21wOiBhbnkpID0+IGNvbXAudHlwZSA9PT0gY29tcG9uZW50VHlwZSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXhpc3RpbmdDb21wb25lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYENvbXBvbmVudCAnJHtjb21wb25lbnRUeXBlfScgYWxyZWFkeSBleGlzdHMgb24gbm9kZWAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlVXVpZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IGNvbXBvbmVudFR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRWZXJpZmllZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4aXN0aW5nOiB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8g5L2/55SoIGNyZWF0ZS1jb21wb25lbnQg5raI5oGvKOS4u+i3r+W+hCk75aSx6LSl5YiZ5Zue6YCA5Zy65pmv6ISa5pysIG5vZGUuYWRkQ29tcG9uZW50XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGNyZWF0ZUNvbXBvbmVudFdpdGhGYWxsYmFjayhub2RlVXVpZCwgY29tcG9uZW50VHlwZSk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChwcmltYXJ5RXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjcmVhdGUtY29tcG9uZW50IOa2iOaBr+WvuemDqOWIhue7hOS7tijlpoIgY2MuTGFiZWwp5Zyo5bey5a2Y5Zyo6IqC54K55LiK5Lya5aSx6LSl44CCXHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5Zue6YCAOuWcuuaZr+iEmuacrCBhZGRDb21wb25lbnRUb05vZGUg6LWwIG5vZGUuYWRkQ29tcG9uZW50LOWcqOWcuuaZr+i/m+eoi+WGheS/ruaUueWcuuaZr+WbvuOAglxyXG4gICAgICAgICAgICAgICAgICAgIC8vIOWcuuaZr+i/m+eoiyA9IOe8lui+keWZqOaAgSzmlLnliqjkvJrooqvnvJbovpHlmajluo/liJfljJbkv53lrZgo5LiOIHByZXZpZXcg6L+Q6KGM5pe25LiN5ZCMKeOAglxyXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZiOiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ2FkZENvbXBvbmVudFRvTm9kZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmdzOiBbbm9kZVV1aWQsIGNvbXBvbmVudFR5cGVdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZiIHx8IGZiLnN1Y2Nlc3MgPT09IGZhbHNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYOS4u+i3r+W+hDogJHtwcmltYXJ5RXJyLm1lc3NhZ2V9OyDlnLrmma/ohJrmnKzlm57pgIA6ICR7ZmI/LmVycm9yIHx8ICflpLHotKUnfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZmJFcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGNyZWF0ZS1jb21wb25lbnQg5aSx6LSlKCR7cHJpbWFyeUVyci5tZXNzYWdlfSks5Zy65pmv6ISa5pys5Zue6YCA5Lmf5aSx6LSlKCR7ZmJFcnIubWVzc2FnZX0pYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8g6YeN6K+V6aqM6K+BOue7hOS7tua3u+WKoOWIsCBxdWVyeS1ub2RlIOWPr+ingeacieW7tui/nyzmnIDlpJogMyDmrKEgw5cgMjUwbXNcclxuICAgICAgICAgICAgICAgIGxldCB2ZXJpZmllZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGF2YWlsYWJsZUxpc3QgPSAnJztcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGF0dGVtcHQgPSAwOyBhdHRlbXB0IDwgMzsgYXR0ZW1wdCsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIDI1MCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGluZm8gPSBhd2FpdCB0aGlzLmdldENvbXBvbmVudHMobm9kZVV1aWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmZvLnN1Y2Nlc3MgJiYgaW5mby5kYXRhPy5jb21wb25lbnRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvdW5kID0gaW5mby5kYXRhLmNvbXBvbmVudHMuZmluZCgoY29tcDogYW55KSA9PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcC50eXBlID09PSBjb21wb25lbnRUeXBlIHx8IGNvbXAubmFtZSA9PT0gY29tcG9uZW50VHlwZSB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcC50eXBlID09PSBjb21wb25lbnRUeXBlLnJlcGxhY2UoL15jY1xcLi8sICcnKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmb3VuZCkgeyB2ZXJpZmllZCA9IHRydWU7IGJyZWFrOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZUxpc3QgPSBpbmZvLmRhdGEuY29tcG9uZW50cy5tYXAoKGM6IGFueSkgPT4gYy50eXBlKS5qb2luKCcsICcpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh2ZXJpZmllZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQ29tcG9uZW50ICcke2NvbXBvbmVudFR5cGV9JyBhZGRlZCBzdWNjZXNzZnVsbHlgLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogbm9kZVV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiBjb21wb25lbnRUeXBlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VmVyaWZpZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleGlzdGluZzogZmFsc2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyDpqozor4HlpLHotKU66LCD5Zy65pmv6ISa5pysIGFkZENvbXBvbmVudFRvTm9kZSDmi7/nnJ/lrp7ljp/lm6Ao5aaC57uE5Lu25Yay56qBKVxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNyZWF0ZS1jb21wb25lbnQg5raI5oGv5a+55p+Q5Lqb5aSx6LSl6Z2Z6buY5oiQ5YqfLOWcuuaZr+iEmuacrOS8muaKm+WFt+S9k+mUmeivr+OAglxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBkaWFnRXJyb3IgPSAnJztcclxuICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkaWFnOiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ2FkZENvbXBvbmVudFRvTm9kZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmdzOiBbbm9kZVV1aWQsIGNvbXBvbmVudFR5cGVdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGlhZyAmJiBkaWFnLnN1Y2Nlc3MgPT09IGZhbHNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaWFnRXJyb3IgPSBkaWFnLmVycm9yIHx8ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7IGRpYWdFcnJvciA9IGUubWVzc2FnZTsgfVxyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBDb21wb25lbnQgJyR7Y29tcG9uZW50VHlwZX0nIHdhcyBub3QgZm91bmQgb24gbm9kZSBhZnRlciBhZGRpdGlvbi4gQXZhaWxhYmxlIGNvbXBvbmVudHM6ICR7YXZhaWxhYmxlTGlzdH1gICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChkaWFnRXJyb3IgPyBgXFxu55yf5a6e5Y6f5ZugOiAke2RpYWdFcnJvcn1gIDogJycpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbjogZGlhZ0Vycm9yICYmIC9jb25mbGljdC9pLnRlc3QoZGlhZ0Vycm9yKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBgW3Y0LWhvdHJlbG9hZC1tYXJrZXJdIGNjLkxhYmVsL2NjLlJpY2hUZXh0L2NjLlNwcml0ZSDnrYnmuLLmn5Pnu4Tku7bkupLmlqUs5LiN6IO95YWx5a2Y5LqO5ZCM5LiA6IqC54K544CC5YWI5oqK5bey5pyJ5riy5p+T57uE5Lu2IHJlbW92ZV9jb21wb25lbnQg5YaN5YqgLOaIluaNouS4gOS4quiKgueCueOAgmBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogdW5kZWZpbmVkXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgRmFpbGVkIHRvIGFkZCBjb21wb25lbnQ6ICR7ZXJyLm1lc3NhZ2V9YCB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcmVtb3ZlQ29tcG9uZW50KG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGFzeW5jIChyZXNvbHZlKSA9PiB7XHJcbiAgICAgICAgICAgIC8vIDEuIOafpeaJvuiKgueCueS4iueahOaJgOaciee7hOS7tlxyXG4gICAgICAgICAgICBjb25zdCBhbGxDb21wb25lbnRzSW5mbyA9IGF3YWl0IHRoaXMuZ2V0Q29tcG9uZW50cyhub2RlVXVpZCk7XHJcbiAgICAgICAgICAgIGlmICghYWxsQ29tcG9uZW50c0luZm8uc3VjY2VzcyB8fCAhYWxsQ29tcG9uZW50c0luZm8uZGF0YT8uY29tcG9uZW50cykge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEZhaWxlZCB0byBnZXQgY29tcG9uZW50cyBmb3Igbm9kZSAnJHtub2RlVXVpZH0nOiAke2FsbENvbXBvbmVudHNJbmZvLmVycm9yfWAgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gMi4g5Y+q5p+l5om+dHlwZeWtl+auteetieS6jmNvbXBvbmVudFR5cGXnmoTnu4Tku7bvvIjljbNjaWTvvIlcclxuICAgICAgICAgICAgY29uc3QgZXhpc3RzID0gYWxsQ29tcG9uZW50c0luZm8uZGF0YS5jb21wb25lbnRzLnNvbWUoKGNvbXA6IGFueSkgPT4gY29tcC50eXBlID09PSBjb21wb25lbnRUeXBlKTtcclxuICAgICAgICAgICAgaWYgKCFleGlzdHMpIHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgY2lkICcke2NvbXBvbmVudFR5cGV9JyBub3QgZm91bmQgb24gbm9kZSAnJHtub2RlVXVpZH0nLiDor7fnlKhnZXRDb21wb25lbnRz6I635Y+WdHlwZeWtl+aute+8iGNpZO+8ieS9nOS4umNvbXBvbmVudFR5cGXjgIJgIH0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIDMuIOS9v+eUqOWFvOWuueWxguenu+mZpOe7hOS7tu+8iOiHquWKqOWbnumAgOWIsCBleGVjdXRlLXNjZW5lLXNjcmlwdO+8iVxyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgcmVtb3ZlQ29tcG9uZW50V2l0aEZhbGxiYWNrKG5vZGVVdWlkLCBjb21wb25lbnRUeXBlKTtcclxuICAgICAgICAgICAgICAgIC8vIDQuIOWGjeafpeS4gOasoeehruiupOaYr+WQpuenu+mZpFxyXG4gICAgICAgICAgICAgICAgY29uc3QgYWZ0ZXJSZW1vdmVJbmZvID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRzKG5vZGVVdWlkKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHN0aWxsRXhpc3RzID0gYWZ0ZXJSZW1vdmVJbmZvLnN1Y2Nlc3MgJiYgYWZ0ZXJSZW1vdmVJbmZvLmRhdGE/LmNvbXBvbmVudHM/LnNvbWUoKGNvbXA6IGFueSkgPT4gY29tcC50eXBlID09PSBjb21wb25lbnRUeXBlKTtcclxuICAgICAgICAgICAgICAgIGlmIChzdGlsbEV4aXN0cykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgY2lkICcke2NvbXBvbmVudFR5cGV9JyB3YXMgbm90IHJlbW92ZWQgZnJvbSBub2RlICcke25vZGVVdWlkfScuYCB9KTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBDb21wb25lbnQgY2lkICcke2NvbXBvbmVudFR5cGV9JyByZW1vdmVkIHN1Y2Nlc3NmdWxseSBmcm9tIG5vZGUgJyR7bm9kZVV1aWR9J2AsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHsgbm9kZVV1aWQsIGNvbXBvbmVudFR5cGUgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEZhaWxlZCB0byByZW1vdmUgY29tcG9uZW50OiAke2Vyci5tZXNzYWdlfWAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGdldENvbXBvbmVudHMobm9kZVV1aWQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgLy8g5raI6LS55b2S5LiA5YyW57uT5p6cKGNvbXBhdC50cyDnu5/kuIDlnLrmma/ohJrmnKzkuI4gcXVlcnktbm9kZSlcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBub2RlRGF0YSA9IGF3YWl0IHF1ZXJ5Tm9kZVdpdGhGYWxsYmFjayhub2RlVXVpZCk7XHJcbiAgICAgICAgICAgIGlmIChub2RlRGF0YSAmJiBub2RlRGF0YS5jb21wb25lbnRzKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjb21wb25lbnRzID0gbm9kZURhdGEuY29tcG9uZW50cy5tYXAoKGNvbXA6IGFueSkgPT4gKHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBjb21wLmNpZCB8fCBjb21wLm5hbWUgfHwgJ1Vua25vd24nLFxyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGNvbXAubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICBpbmRleDogY29tcC5pbmRleCxcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBjb21wLmVuYWJsZWQgIT09IHVuZGVmaW5lZCA/IGNvbXAuZW5hYmxlZCA6IHRydWVcclxuICAgICAgICAgICAgICAgIH0pKTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogbm9kZVV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudHM6IGNvbXBvbmVudHNcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm9kZSBub3QgZm91bmQgb3Igbm8gY29tcG9uZW50cyBkYXRhJyB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgUXVlcnkgZmFpbGVkOiAke2Vyci5tZXNzYWdlfWAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRDb21wb25lbnRJbmZvKG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgLy8g5YWI55So5b2S5LiA5YyW6IqC54K55L+h5oGv56Gu6K6k57uE5Lu25a2Y5Zyo5bm25ou/5YiwIGluZGV4LOWGjeeUqOWcuuaZr+iEmuacrCBnZXRDb21wb25lbnREZXRhaWwg5Y+W5bGe5oCnXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZURhdGEgPSBhd2FpdCBxdWVyeU5vZGVXaXRoRmFsbGJhY2sobm9kZVV1aWQpO1xyXG4gICAgICAgICAgICBpZiAoIW5vZGVEYXRhIHx8ICFub2RlRGF0YS5jb21wb25lbnRzKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdOb2RlIG5vdCBmb3VuZCBvciBubyBjb21wb25lbnRzIGRhdGEnIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSBub2RlRGF0YS5jb21wb25lbnRzLmZpbmQoKGNvbXA6IGFueSkgPT5cclxuICAgICAgICAgICAgICAgIGNvbXAuY2lkID09PSBjb21wb25lbnRUeXBlIHx8IGNvbXAubmFtZSA9PT0gY29tcG9uZW50VHlwZSB8fFxyXG4gICAgICAgICAgICAgICAgY29tcC5jaWQgPT09IGBjYy4ke2NvbXBvbmVudFR5cGV9YCB8fCBjb21wLm5hbWUgPT09IGNvbXBvbmVudFR5cGUucmVwbGFjZSgvXmNjXFwuLywgJycpKTtcclxuICAgICAgICAgICAgaWYgKCFtYXRjaCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50ICcke2NvbXBvbmVudFR5cGV9JyBub3QgZm91bmQgb24gbm9kZWAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyDlj5bor6bnu4blsZ7mgKdcclxuICAgICAgICAgICAgbGV0IHByb3BlcnRpZXM6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRldGFpbCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdnZXRDb21wb25lbnREZXRhaWwnLFxyXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6IFtub2RlVXVpZCwgY29tcG9uZW50VHlwZV1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgaWYgKGRldGFpbCAmJiBkZXRhaWwuc3VjY2VzcyAmJiBkZXRhaWwuZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXMgPSBkZXRhaWwuZGF0YS5wcm9wZXJ0aWVzIHx8IHt9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGNhdGNoIChkZXRhaWxFcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgLy8g5bGe5oCn6K+75Y+W5aSx6LSl5LiN6Zi75patLOS7hee9ruepulxyXG4gICAgICAgICAgICAgICAgcHJvcGVydGllcyA9IHt9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlVXVpZCxcclxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiBtYXRjaC5jaWQgfHwgY29tcG9uZW50VHlwZSxcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBtYXRjaC5lbmFibGVkICE9PSB1bmRlZmluZWQgPyBtYXRjaC5lbmFibGVkIDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgUXVlcnkgZmFpbGVkOiAke2Vyci5tZXNzYWdlfWAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBleHRyYWN0Q29tcG9uZW50UHJvcGVydGllcyhjb21wb25lbnQ6IGFueSk6IFJlY29yZDxzdHJpbmcsIGFueT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBbZXh0cmFjdENvbXBvbmVudFByb3BlcnRpZXNdIFByb2Nlc3NpbmcgY29tcG9uZW50OmAsIE9iamVjdC5rZXlzKGNvbXBvbmVudCkpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOajgOafpee7hOS7tuaYr+WQpuaciSB2YWx1ZSDlsZ7mgKfvvIzov5npgJrluLjljIXlkKvlrp7pmYXnmoTnu4Tku7blsZ7mgKdcclxuICAgICAgICBpZiAoY29tcG9uZW50LnZhbHVlICYmIHR5cGVvZiBjb21wb25lbnQudmFsdWUgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbZXh0cmFjdENvbXBvbmVudFByb3BlcnRpZXNdIEZvdW5kIGNvbXBvbmVudC52YWx1ZSB3aXRoIHByb3BlcnRpZXM6YCwgT2JqZWN0LmtleXMoY29tcG9uZW50LnZhbHVlKSk7XHJcbiAgICAgICAgICAgIHJldHVybiBjb21wb25lbnQudmFsdWU7IC8vIOebtOaOpei/lOWbniB2YWx1ZSDlr7nosaHvvIzlroPljIXlkKvmiYDmnInnu4Tku7blsZ7mgKdcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5aSH55So5pa55qGI77ya5LuO57uE5Lu25a+56LGh5Lit55u05o6l5o+Q5Y+W5bGe5oCnXHJcbiAgICAgICAgY29uc3QgcHJvcGVydGllczogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xyXG4gICAgICAgIGNvbnN0IGV4Y2x1ZGVLZXlzID0gWydfX3R5cGVfXycsICdlbmFibGVkJywgJ25vZGUnLCAnX2lkJywgJ19fc2NyaXB0QXNzZXQnLCAndXVpZCcsICduYW1lJywgJ19uYW1lJywgJ19vYmpGbGFncycsICdfZW5hYmxlZCcsICd0eXBlJywgJ3JlYWRvbmx5JywgJ3Zpc2libGUnLCAnY2lkJywgJ2VkaXRvcicsICdleHRlbmRzJ107XHJcbiAgICAgICAgXHJcbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gY29tcG9uZW50KSB7XHJcbiAgICAgICAgICAgIGlmICghZXhjbHVkZUtleXMuaW5jbHVkZXMoa2V5KSAmJiAha2V5LnN0YXJ0c1dpdGgoJ18nKSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtleHRyYWN0Q29tcG9uZW50UHJvcGVydGllc10gRm91bmQgZGlyZWN0IHByb3BlcnR5ICcke2tleX0nOmAsIHR5cGVvZiBjb21wb25lbnRba2V5XSk7XHJcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzW2tleV0gPSBjb21wb25lbnRba2V5XTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBjb25zb2xlLmxvZyhgW2V4dHJhY3RDb21wb25lbnRQcm9wZXJ0aWVzXSBGaW5hbCBleHRyYWN0ZWQgcHJvcGVydGllczpgLCBPYmplY3Qua2V5cyhwcm9wZXJ0aWVzKSk7XHJcbiAgICAgICAgcmV0dXJuIHByb3BlcnRpZXM7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBmaW5kQ29tcG9uZW50VHlwZUJ5VXVpZChjb21wb25lbnRVdWlkOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgW2ZpbmRDb21wb25lbnRUeXBlQnlVdWlkXSBTZWFyY2hpbmcgZm9yIGNvbXBvbmVudCB0eXBlIHdpdGggVVVJRDogJHtjb21wb25lbnRVdWlkfWApO1xyXG4gICAgICAgIGlmICghY29tcG9uZW50VXVpZCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8g5L2/55So5YW85a655bGC5p+l6K+i6IqC54K55qCRXHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGVUcmVlID0gYXdhaXQgcXVlcnlOb2RlVHJlZVdpdGhGYWxsYmFjaygpO1xyXG4gICAgICAgICAgICBpZiAoIW5vZGVUcmVlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1tmaW5kQ29tcG9uZW50VHlwZUJ5VXVpZF0gRmFpbGVkIHRvIHF1ZXJ5IG5vZGUgdHJlZS4nKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBxdWV1ZTogYW55W10gPSBbbm9kZVRyZWVdO1xyXG5cclxuICAgICAgICAgICAgd2hpbGUgKHF1ZXVlLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnROb2RlSW5mbyA9IHF1ZXVlLnNoaWZ0KCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWN1cnJlbnROb2RlSW5mbyB8fCAhY3VycmVudE5vZGVJbmZvLnV1aWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOS9v+eUqOWFvOWuueWxguafpeivouiKgueCuVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZ1bGxOb2RlRGF0YSA9IGF3YWl0IHF1ZXJ5Tm9kZVdpdGhGYWxsYmFjayhjdXJyZW50Tm9kZUluZm8udXVpZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZ1bGxOb2RlRGF0YSAmJiBmdWxsTm9kZURhdGEuX19jb21wc19fKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY29tcCBvZiBmdWxsTm9kZURhdGEuX19jb21wc19fKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wQW55ID0gY29tcCBhcyBhbnk7IC8vIENhc3QgdG8gYW55IHRvIGFjY2VzcyBkeW5hbWljIHByb3BlcnRpZXNcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZSBjb21wb25lbnQgVVVJRCBpcyBuZXN0ZWQgaW4gdGhlICd2YWx1ZScgcHJvcGVydHlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb21wQW55LnV1aWQgJiYgY29tcEFueS51dWlkLnZhbHVlID09PSBjb21wb25lbnRVdWlkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcG9uZW50VHlwZSA9IGNvbXBBbnkuX190eXBlX187XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtmaW5kQ29tcG9uZW50VHlwZUJ5VXVpZF0gRm91bmQgY29tcG9uZW50IHR5cGUgJyR7Y29tcG9uZW50VHlwZX0nIGZvciBVVUlEICR7Y29tcG9uZW50VXVpZH0gb24gbm9kZSAke2Z1bGxOb2RlRGF0YS5uYW1lPy52YWx1ZX1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29tcG9uZW50VHlwZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYFtmaW5kQ29tcG9uZW50VHlwZUJ5VXVpZF0gQ291bGQgbm90IHF1ZXJ5IG5vZGUgJHtjdXJyZW50Tm9kZUluZm8udXVpZH06YCwgZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnROb2RlSW5mby5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgY3VycmVudE5vZGVJbmZvLmNoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXVlLnB1c2goY2hpbGQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc29sZS53YXJuKGBbZmluZENvbXBvbmVudFR5cGVCeVV1aWRdIENvbXBvbmVudCB3aXRoIFVVSUQgJHtjb21wb25lbnRVdWlkfSBub3QgZm91bmQgaW4gc2NlbmUgdHJlZS5gKTtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihgW2ZpbmRDb21wb25lbnRUeXBlQnlVdWlkXSBFcnJvciB3aGlsZSBzZWFyY2hpbmcgZm9yIGNvbXBvbmVudCB0eXBlOmAsIGVycm9yKTtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgc2V0Q29tcG9uZW50UHJvcGVydHkoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcHJvcGVydHlUeXBlIOe8uuecgeaXtuS7jiB2YWx1ZSDoh6rliqjmjqjmlq0o6K6p6LCD55So5pa55YWN5aOw5piO57G75Z6LLOmAgumFjeWZqOS5n+WPr+e6r+mAj+S8oClcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHsgbm9kZVV1aWQsIGNvbXBvbmVudFR5cGUsIHByb3BlcnR5LCBwcm9wZXJ0eVR5cGUsIHZhbHVlIH0gPSBhcmdzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXByb3BlcnR5VHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlUeXBlID0gaW5mZXJQcm9wZXJ0eVR5cGVGcm9tVmFsdWUodmFsdWUsIHByb3BlcnR5KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShhc3luYyAocmVzb2x2ZSkgPT4ge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gU2V0dGluZyAke2NvbXBvbmVudFR5cGV9LiR7cHJvcGVydHl9ICh0eXBlOiAke3Byb3BlcnR5VHlwZX0pID0gJHtKU09OLnN0cmluZ2lmeSh2YWx1ZSl9IG9uIG5vZGUgJHtub2RlVXVpZH1gKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8gU3RlcCAwOiDmo4DmtYvmmK/lkKbkuLroioLngrnlsZ7mgKfvvIzlpoLmnpzmmK/liJnph43lrprlkJHliLDlr7nlupTnmoToioLngrnmlrnms5VcclxuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVSZWRpcmVjdFJlc3VsdCA9IGF3YWl0IHRoaXMuY2hlY2tBbmRSZWRpcmVjdE5vZGVQcm9wZXJ0aWVzKGFyZ3MpO1xyXG4gICAgICAgICAgICAgICAgaWYgKG5vZGVSZWRpcmVjdFJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUobm9kZVJlZGlyZWN0UmVzdWx0KTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIFN0ZXAgMTog6I635Y+W57uE5Lu25YiX6KGoLOehruiupOebruagh+e7hOS7tuWtmOWcqOW5tuaLv+WIsCBpbmRleFxyXG4gICAgICAgICAgICAgICAgY29uc3QgY29tcG9uZW50c1Jlc3BvbnNlID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRzKG5vZGVVdWlkKTtcclxuICAgICAgICAgICAgICAgIGlmICghY29tcG9uZW50c1Jlc3BvbnNlLnN1Y2Nlc3MgfHwgIWNvbXBvbmVudHNSZXNwb25zZS5kYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogYEZhaWxlZCB0byBnZXQgY29tcG9uZW50cyBmb3Igbm9kZSAnJHtub2RlVXVpZH0nOiAke2NvbXBvbmVudHNSZXNwb25zZS5lcnJvcn1gLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbjogYFBsZWFzZSB2ZXJpZnkgdGhhdCBub2RlIFVVSUQgJyR7bm9kZVV1aWR9JyBpcyBjb3JyZWN0LiBVc2UgZ2V0X2FsbF9ub2RlcyBvciBmaW5kX25vZGVfYnlfbmFtZSB0byBnZXQgdGhlIGNvcnJlY3Qgbm9kZSBVVUlELmBcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgYWxsQ29tcG9uZW50cyA9IGNvbXBvbmVudHNSZXNwb25zZS5kYXRhLmNvbXBvbmVudHM7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBhdmFpbGFibGVUeXBlczogc3RyaW5nW10gPSBhbGxDb21wb25lbnRzLm1hcCgoYzogYW55KSA9PiBjLnR5cGUpO1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgbm9ybSA9IChzOiBzdHJpbmcpID0+IChzIHx8ICcnKS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL15jY1xcLi8sICcnKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldENvbXBvbmVudCA9IGFsbENvbXBvbmVudHMuZmluZCgoY29tcDogYW55KSA9PlxyXG4gICAgICAgICAgICAgICAgICAgIGNvbXAudHlwZSA9PT0gY29tcG9uZW50VHlwZSB8fCBjb21wLm5hbWUgPT09IGNvbXBvbmVudFR5cGUgfHxcclxuICAgICAgICAgICAgICAgICAgICBub3JtKGNvbXAudHlwZSkgPT09IG5vcm0oY29tcG9uZW50VHlwZSkpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0Q29tcG9uZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5zdHJ1Y3Rpb24gPSB0aGlzLmdlbmVyYXRlQ29tcG9uZW50U3VnZ2VzdGlvbihjb21wb25lbnRUeXBlLCBhdmFpbGFibGVUeXBlcywgcHJvcGVydHkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBDb21wb25lbnQgJyR7Y29tcG9uZW50VHlwZX0nIG5vdCBmb3VuZCBvbiBub2RlLiBBdmFpbGFibGUgY29tcG9uZW50czogJHthdmFpbGFibGVUeXBlcy5qb2luKCcsICcpfWAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RydWN0aW9uOiBpbnN0cnVjdGlvblxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBTdGVwIDI6IOWPluebruagh+e7hOS7tuW9kuS4gOWMluWxnuaApyjlnLrmma/ohJrmnKwgZ2V0Q29tcG9uZW50RGV0YWlsKSzmnoTpgKAgcHJvcGVydHlJbmZv44CCXHJcbiAgICAgICAgICAgICAgICAvLyDkuI3lho3nlKggYW5hbHl6ZVByb3BlcnR5IOino+aekCBkdW1w4oCU4oCU5b2S5LiA5YyW5ZCOIHByb3BlcnRpZXMg5bey5piv566A5Y2V6ZSu5YC844CCXHJcbiAgICAgICAgICAgICAgICBsZXQgY29tcG9uZW50UHJvcGVydGllczogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkZXRhaWwgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogJ2NvY29zLW1jcC1zZXJ2ZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdnZXRDb21wb25lbnREZXRhaWwnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzOiBbbm9kZVV1aWQsIGNvbXBvbmVudFR5cGVdXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRldGFpbCAmJiBkZXRhaWwuc3VjY2VzcyAmJiBkZXRhaWwuZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRQcm9wZXJ0aWVzID0gZGV0YWlsLmRhdGEucHJvcGVydGllcyB8fCB7fTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChkZXRhaWxFcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOWxnuaAp+ivu+WPluWksei0peS4jemYu+aWrSjpg6jliIbnu4Tku7blsZ7mgKfml6Dms5XmnprkuL4pLOWQjue7reaMiSBwcm9wZXJ0eVR5cGUg55u06K6+XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgYXZhaWxhYmxlUHJvcGVydGllcyA9IE9iamVjdC5rZXlzKGNvbXBvbmVudFByb3BlcnRpZXMpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcHJvcGVydHlFeGlzdHMgPSBhdmFpbGFibGVQcm9wZXJ0aWVzLmluY2x1ZGVzKHByb3BlcnR5KSB8fCBwcm9wZXJ0eVR5cGUgPT09ICdhc3NldCcgfHwgcHJvcGVydHlUeXBlID09PSAnc3ByaXRlRnJhbWUnIHx8IHByb3BlcnR5VHlwZSA9PT0gJ3ByZWZhYic7XHJcbiAgICAgICAgICAgICAgICAvLyDms6g66LWE5rqQ5byV55So57G75bGe5oCn5Zyo5b2S5LiA5YyW5pe25Y+v6IO95ZGI546w5Li6IHt1dWlkfSDmiJbooqvot7Pov4cs5pS+5a695a2Y5Zyo5oCn5Yik5patLOS6pOe7mSBzZXQtcHJvcGVydHkg6aqM6K+BXHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgcHJvcGVydHlJbmZvID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGV4aXN0czogcHJvcGVydHlFeGlzdHMsXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogdGhpcy5pbmZlclByb3BlcnR5VHlwZShjb21wb25lbnRQcm9wZXJ0aWVzW3Byb3BlcnR5XSwgcHJvcGVydHksIHByb3BlcnR5VHlwZSksXHJcbiAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlUHJvcGVydGllcyxcclxuICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbFZhbHVlOiBjb21wb25lbnRQcm9wZXJ0aWVzW3Byb3BlcnR5XVxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIXByb3BlcnR5SW5mby5leGlzdHMpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgUHJvcGVydHkgJyR7cHJvcGVydHl9JyBub3QgZm91bmQgb24gY29tcG9uZW50ICcke2NvbXBvbmVudFR5cGV9Jy4gQXZhaWxhYmxlIHByb3BlcnRpZXM6ICR7YXZhaWxhYmxlUHJvcGVydGllcy5qb2luKCcsICcpfWBcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIFN0ZXAgNDog5aSE55CG5bGe5oCn5YC85ZKM6K6+572uXHJcbiAgICAgICAgICAgICAgICBjb25zdCBvcmlnaW5hbFZhbHVlID0gcHJvcGVydHlJbmZvLm9yaWdpbmFsVmFsdWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgcHJvY2Vzc2VkVmFsdWU6IGFueTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8g5qC55o2u5piO56Gu55qEcHJvcGVydHlUeXBl5aSE55CG5bGe5oCn5YC8XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHByb3BlcnR5VHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0gU3RyaW5nKHZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbnVtYmVyJzpcclxuICAgICAgICAgICAgICAgICAgICBjYXNlICdpbnRlZ2VyJzpcclxuICAgICAgICAgICAgICAgICAgICBjYXNlICdmbG9hdCc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0gTnVtYmVyKHZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnYm9vbGVhbic6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0gQm9vbGVhbih2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2NvbG9yJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWtl+espuS4suagvOW8j++8muaUr+aMgeWNgeWFrei/m+WItuOAgeminOiJsuWQjeensOOAgXJnYigpL3JnYmEoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB0aGlzLnBhcnNlQ29sb3JTdHJpbmcodmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWvueixoeagvOW8j++8mumqjOivgeW5tui9rOaNolJHQkHlgLxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHI6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKHZhbHVlLnIpIHx8IDApKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcih2YWx1ZS5nKSB8fCAwKSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYjogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIodmFsdWUuYikgfHwgMCkpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGE6IHZhbHVlLmEgIT09IHVuZGVmaW5lZCA/IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKHZhbHVlLmEpKSkgOiAyNTVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbG9yIHZhbHVlIG11c3QgYmUgYW4gb2JqZWN0IHdpdGggciwgZywgYiBwcm9wZXJ0aWVzIG9yIGEgaGV4YWRlY2ltYWwgc3RyaW5nIChlLmcuLCBcIiNGRjAwMDBcIiknKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlICd2ZWMyJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IE51bWJlcih2YWx1ZS54KSB8fCAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IE51bWJlcih2YWx1ZS55KSB8fCAwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdWZWMyIHZhbHVlIG11c3QgYmUgYW4gb2JqZWN0IHdpdGggeCwgeSBwcm9wZXJ0aWVzJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndmVjMyc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiBOdW1iZXIodmFsdWUueCkgfHwgMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OiBOdW1iZXIodmFsdWUueSkgfHwgMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB6OiBOdW1iZXIodmFsdWUueikgfHwgMFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVmVjMyB2YWx1ZSBtdXN0IGJlIGFuIG9iamVjdCB3aXRoIHgsIHksIHogcHJvcGVydGllcycpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3NpemUnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IE51bWJlcih2YWx1ZS53aWR0aCkgfHwgMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IE51bWJlcih2YWx1ZS5oZWlnaHQpIHx8IDBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NpemUgdmFsdWUgbXVzdCBiZSBhbiBvYmplY3Qgd2l0aCB3aWR0aCwgaGVpZ2h0IHByb3BlcnRpZXMnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlICdub2RlJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0geyB1dWlkOiB2YWx1ZSB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOb2RlIHJlZmVyZW5jZSB2YWx1ZSBtdXN0IGJlIGEgc3RyaW5nIFVVSUQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlICdjb21wb25lbnQnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g57uE5Lu25byV55So6ZyA6KaB54m55q6K5aSE55CG77ya6YCa6L+H6IqC54K5VVVJROaJvuWIsOe7hOS7tueahF9faWRfX1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB2YWx1ZTsgLy8g5YWI5L+d5a2Y6IqC54K5VVVJRO+8jOWQjue7reS8mui9rOaNouS4ul9faWRfX1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb21wb25lbnQgcmVmZXJlbmNlIHZhbHVlIG11c3QgYmUgYSBzdHJpbmcgKG5vZGUgVVVJRCBjb250YWluaW5nIHRoZSB0YXJnZXQgY29tcG9uZW50KScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3Nwcml0ZUZyYW1lJzpcclxuICAgICAgICAgICAgICAgICAgICBjYXNlICdwcmVmYWInOlxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2Fzc2V0JzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0geyB1dWlkOiB2YWx1ZSB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke3Byb3BlcnR5VHlwZX0gdmFsdWUgbXVzdCBiZSBhIHN0cmluZyBVVUlEYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbm9kZUFycmF5JzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHZhbHVlLm1hcCgoaXRlbTogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyB1dWlkOiBpdGVtIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOb2RlQXJyYXkgaXRlbXMgbXVzdCBiZSBzdHJpbmcgVVVJRHMnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm9kZUFycmF5IHZhbHVlIG11c3QgYmUgYW4gYXJyYXknKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlICdjb2xvckFycmF5JzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHZhbHVlLm1hcCgoaXRlbTogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnb2JqZWN0JyAmJiBpdGVtICE9PSBudWxsICYmICdyJyBpbiBpdGVtKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpdGVtLnIpIHx8IDApKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGc6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGl0ZW0uZykgfHwgMCkpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYjogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIoaXRlbS5iKSB8fCAwKSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhOiBpdGVtLmEgIT09IHVuZGVmaW5lZCA/IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGl0ZW0uYSkpKSA6IDI1NVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHI6IDI1NSwgZzogMjU1LCBiOiAyNTUsIGE6IDI1NSB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb2xvckFycmF5IHZhbHVlIG11c3QgYmUgYW4gYXJyYXknKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlICdudW1iZXJBcnJheSc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB2YWx1ZS5tYXAoKGl0ZW06IGFueSkgPT4gTnVtYmVyKGl0ZW0pKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTnVtYmVyQXJyYXkgdmFsdWUgbXVzdCBiZSBhbiBhcnJheScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3N0cmluZ0FycmF5JzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHZhbHVlLm1hcCgoaXRlbTogYW55KSA9PiBTdHJpbmcoaXRlbSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdTdHJpbmdBcnJheSB2YWx1ZSBtdXN0IGJlIGFuIGFycmF5Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnN1cHBvcnRlZCBwcm9wZXJ0eSB0eXBlOiAke3Byb3BlcnR5VHlwZX1gKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gQ29udmVydGluZyB2YWx1ZTogJHtKU09OLnN0cmluZ2lmeSh2YWx1ZSl9IC0+ICR7SlNPTi5zdHJpbmdpZnkocHJvY2Vzc2VkVmFsdWUpfSAodHlwZTogJHtwcm9wZXJ0eVR5cGV9KWApO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gUHJvcGVydHkgYW5hbHlzaXMgcmVzdWx0OiBwcm9wZXJ0eUluZm8udHlwZT1cIiR7cHJvcGVydHlJbmZvLnR5cGV9XCIsIHByb3BlcnR5VHlwZT1cIiR7cHJvcGVydHlUeXBlfVwiYCk7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW0NvbXBvbmVudFRvb2xzXSBXaWxsIHVzZSBjb2xvciBzcGVjaWFsIGhhbmRsaW5nOiAke3Byb3BlcnR5VHlwZSA9PT0gJ2NvbG9yJyAmJiBwcm9jZXNzZWRWYWx1ZSAmJiB0eXBlb2YgcHJvY2Vzc2VkVmFsdWUgPT09ICdvYmplY3QnfWApO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyDnlKjkuo7pqozor4HnmoTlrp7pmYXmnJ/mnJvlgLzvvIjlr7nkuo7nu4Tku7blvJXnlKjpnIDopoHnibnmrorlpITnkIbvvIlcclxuICAgICAgICAgICAgICAgIGxldCBhY3R1YWxFeHBlY3RlZFZhbHVlID0gcHJvY2Vzc2VkVmFsdWU7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIFN0ZXAgNTog55So5b2S5LiA5YyW57uE5Lu257Si5byV5p6E5bu6IHNldC1wcm9wZXJ0eSDot6/lvoRcclxuICAgICAgICAgICAgICAgIC8vIHRhcmdldENvbXBvbmVudC5pbmRleCDmnaXoh6rlnLrmma/ohJrmnKwgYnVpbGROb2RlSW5mbyzkuI4gc2V0LXByb3BlcnR5IOacn+acm+eahCBfX2NvbXBzX18g57Si5byV5LiA6Ie0XHJcbiAgICAgICAgICAgICAgICBjb25zdCByYXdDb21wb25lbnRJbmRleCA9IHRhcmdldENvbXBvbmVudC5pbmRleDtcclxuICAgICAgICAgICAgICAgIGlmIChyYXdDb21wb25lbnRJbmRleCA9PT0gdW5kZWZpbmVkIHx8IHJhd0NvbXBvbmVudEluZGV4IDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBDb3VsZCBub3QgZmluZCBjb21wb25lbnQgaW5kZXggZm9yIHNldHRpbmcgcHJvcGVydHlgXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIOaehOW7uuato+ehrueahOWxnuaAp+i3r+W+hFxyXG4gICAgICAgICAgICAgICAgbGV0IHByb3BlcnR5UGF0aCA9IGBfX2NvbXBzX18uJHtyYXdDb21wb25lbnRJbmRleH0uJHtwcm9wZXJ0eX1gO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyDnibnmrorlpITnkIbotYTmupDnsbvlsZ7mgKdcclxuICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0eVR5cGUgPT09ICdhc3NldCcgfHwgcHJvcGVydHlUeXBlID09PSAnc3ByaXRlRnJhbWUnIHx8IHByb3BlcnR5VHlwZSA9PT0gJ3ByZWZhYicgfHwgXHJcbiAgICAgICAgICAgICAgICAgICAgKHByb3BlcnR5SW5mby50eXBlID09PSAnYXNzZXQnICYmIHByb3BlcnR5VHlwZSA9PT0gJ3N0cmluZycpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gU2V0dGluZyBhc3NldCByZWZlcmVuY2U6YCwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcHJvY2Vzc2VkVmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBwcm9wZXJ0eSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlUeXBlOiBwcm9wZXJ0eVR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHByb3BlcnR5UGF0aFxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIERldGVybWluZSBhc3NldCB0eXBlIGJhc2VkIG9uIHByb3BlcnR5IG5hbWVcclxuICAgICAgICAgICAgICAgICAgICBsZXQgYXNzZXRUeXBlID0gJ2NjLlNwcml0ZUZyYW1lJzsgLy8gZGVmYXVsdFxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0eS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCd0ZXh0dXJlJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRUeXBlID0gJ2NjLlRleHR1cmUyRCc7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdtYXRlcmlhbCcpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2V0VHlwZSA9ICdjYy5NYXRlcmlhbCc7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdmb250JykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRUeXBlID0gJ2NjLkZvbnQnO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHkudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnY2xpcCcpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2V0VHlwZSA9ICdjYy5BdWRpb0NsaXAnO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlUeXBlID09PSAncHJlZmFiJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NldFR5cGUgPSAnY2MuUHJlZmFiJztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgc2V0UHJvcGVydHlXaXRoRmFsbGJhY2soXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eVBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBwcm9jZXNzZWRWYWx1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGFzc2V0VHlwZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY29tcG9uZW50VHlwZSA9PT0gJ2NjLlVJVHJhbnNmb3JtJyAmJiAocHJvcGVydHkgPT09ICdfY29udGVudFNpemUnIHx8IHByb3BlcnR5ID09PSAnY29udGVudFNpemUnKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIFVJVHJhbnNmb3JtIGNvbnRlbnRTaXplIC0gc2V0IHdpZHRoIGFuZCBoZWlnaHQgc2VwYXJhdGVseVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gTnVtYmVyKHZhbHVlLndpZHRoKSB8fCAxMDA7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaGVpZ2h0ID0gTnVtYmVyKHZhbHVlLmhlaWdodCkgfHwgMTAwO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCB3aWR0aCBmaXJzdFxyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHNldFByb3BlcnR5V2l0aEZhbGxiYWNrKG5vZGVVdWlkLCBgX19jb21wc19fLiR7cmF3Q29tcG9uZW50SW5kZXh9LndpZHRoYCwgeyB2YWx1ZTogd2lkdGggfSApO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRoZW4gc2V0IGhlaWdodFxyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHNldFByb3BlcnR5V2l0aEZhbGxiYWNrKG5vZGVVdWlkLCBgX19jb21wc19fLiR7cmF3Q29tcG9uZW50SW5kZXh9LmhlaWdodGAsIHsgdmFsdWU6IGhlaWdodCB9ICk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNvbXBvbmVudFR5cGUgPT09ICdjYy5VSVRyYW5zZm9ybScgJiYgKHByb3BlcnR5ID09PSAnX2FuY2hvclBvaW50JyB8fCBwcm9wZXJ0eSA9PT0gJ2FuY2hvclBvaW50JykpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciBVSVRyYW5zZm9ybSBhbmNob3JQb2ludCAtIHNldCBhbmNob3JYIGFuZCBhbmNob3JZIHNlcGFyYXRlbHlcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhbmNob3JYID0gTnVtYmVyKHZhbHVlLngpIHx8IDAuNTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhbmNob3JZID0gTnVtYmVyKHZhbHVlLnkpIHx8IDAuNTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgYW5jaG9yWCBmaXJzdFxyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHNldFByb3BlcnR5V2l0aEZhbGxiYWNrKG5vZGVVdWlkLCBgX19jb21wc19fLiR7cmF3Q29tcG9uZW50SW5kZXh9LmFuY2hvclhgLCB7IHZhbHVlOiBhbmNob3JYIH0gKTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAvLyBUaGVuIHNldCBhbmNob3JZICBcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBzZXRQcm9wZXJ0eVdpdGhGYWxsYmFjayhub2RlVXVpZCwgYF9fY29tcHNfXy4ke3Jhd0NvbXBvbmVudEluZGV4fS5hbmNob3JZYCwgeyB2YWx1ZTogYW5jaG9yWSB9ICk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ2NvbG9yJyAmJiBwcm9jZXNzZWRWYWx1ZSAmJiB0eXBlb2YgcHJvY2Vzc2VkVmFsdWUgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g54m55q6K5aSE55CG6aKc6Imy5bGe5oCn77yM56Gu5L+dUkdCQeWAvOato+ehrlxyXG4gICAgICAgICAgICAgICAgICAgIC8vIENvY29zIENyZWF0b3LpopzoibLlgLzojIPlm7TmmK8wLTI1NVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbG9yVmFsdWUgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHI6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKHByb2Nlc3NlZFZhbHVlLnIpIHx8IDApKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZzogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIocHJvY2Vzc2VkVmFsdWUuZykgfHwgMCkpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBiOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihwcm9jZXNzZWRWYWx1ZS5iKSB8fCAwKSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGE6IHByb2Nlc3NlZFZhbHVlLmEgIT09IHVuZGVmaW5lZCA/IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKHByb2Nlc3NlZFZhbHVlLmEpKSkgOiAyNTVcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbQ29tcG9uZW50VG9vbHNdIFNldHRpbmcgY29sb3IgdmFsdWU6YCwgY29sb3JWYWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgc2V0UHJvcGVydHlXaXRoRmFsbGJhY2sobm9kZVV1aWQsIHByb3BlcnR5UGF0aCwgeyB2YWx1ZTogY29sb3JWYWx1ZSwgdHlwZTogJ2NjLkNvbG9yJyB9ICk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ3ZlYzMnICYmIHByb2Nlc3NlZFZhbHVlICYmIHR5cGVvZiBwcm9jZXNzZWRWYWx1ZSA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyDnibnmrorlpITnkIZWZWMz5bGe5oCnXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmVjM1ZhbHVlID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB4OiBOdW1iZXIocHJvY2Vzc2VkVmFsdWUueCkgfHwgMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgeTogTnVtYmVyKHByb2Nlc3NlZFZhbHVlLnkpIHx8IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHo6IE51bWJlcihwcm9jZXNzZWRWYWx1ZS56KSB8fCAwXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBzZXRQcm9wZXJ0eVdpdGhGYWxsYmFjayhub2RlVXVpZCwgcHJvcGVydHlQYXRoLCB7IHZhbHVlOiB2ZWMzVmFsdWUsIHR5cGU6ICdjYy5WZWMzJyB9ICk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ3ZlYzInICYmIHByb2Nlc3NlZFZhbHVlICYmIHR5cGVvZiBwcm9jZXNzZWRWYWx1ZSA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyDnibnmrorlpITnkIZWZWMy5bGe5oCnXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmVjMlZhbHVlID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB4OiBOdW1iZXIocHJvY2Vzc2VkVmFsdWUueCkgfHwgMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgeTogTnVtYmVyKHByb2Nlc3NlZFZhbHVlLnkpIHx8IDBcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHNldFByb3BlcnR5V2l0aEZhbGxiYWNrKG5vZGVVdWlkLCBwcm9wZXJ0eVBhdGgsIHsgdmFsdWU6IHZlYzJWYWx1ZSwgdHlwZTogJ2NjLlZlYzInIH0gKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlUeXBlID09PSAnc2l6ZScgJiYgcHJvY2Vzc2VkVmFsdWUgJiYgdHlwZW9mIHByb2Nlc3NlZFZhbHVlID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOeJueauiuWkhOeQhlNpemXlsZ7mgKdcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzaXplVmFsdWUgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiBOdW1iZXIocHJvY2Vzc2VkVmFsdWUud2lkdGgpIHx8IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogTnVtYmVyKHByb2Nlc3NlZFZhbHVlLmhlaWdodCkgfHwgMFxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgc2V0UHJvcGVydHlXaXRoRmFsbGJhY2sobm9kZVV1aWQsIHByb3BlcnR5UGF0aCwgeyB2YWx1ZTogc2l6ZVZhbHVlLCB0eXBlOiAnY2MuU2l6ZScgfSApO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVR5cGUgPT09ICdub2RlJyAmJiBwcm9jZXNzZWRWYWx1ZSAmJiB0eXBlb2YgcHJvY2Vzc2VkVmFsdWUgPT09ICdvYmplY3QnICYmICd1dWlkJyBpbiBwcm9jZXNzZWRWYWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOeJueauiuWkhOeQhuiKgueCueW8leeUqFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbQ29tcG9uZW50VG9vbHNdIFNldHRpbmcgbm9kZSByZWZlcmVuY2Ugd2l0aCBVVUlEOiAke3Byb2Nlc3NlZFZhbHVlLnV1aWR9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgc2V0UHJvcGVydHlXaXRoRmFsbGJhY2sobm9kZVV1aWQsIHByb3BlcnR5UGF0aCwgeyB2YWx1ZTogcHJvY2Vzc2VkVmFsdWUsIHR5cGU6ICdjYy5Ob2RlJyB9ICk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ2NvbXBvbmVudCcgJiYgdHlwZW9mIHByb2Nlc3NlZFZhbHVlID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOeJueauiuWkhOeQhue7hOS7tuW8leeUqO+8mumAmui/h+iKgueCuVVVSUTmib7liLDnu4Tku7bnmoRfX2lkX19cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXROb2RlVXVpZCA9IHByb2Nlc3NlZFZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbQ29tcG9uZW50VG9vbHNdIFNldHRpbmcgY29tcG9uZW50IHJlZmVyZW5jZSAtIGZpbmRpbmcgY29tcG9uZW50IG9uIG5vZGU6ICR7dGFyZ2V0Tm9kZVV1aWR9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5LuO5b2T5YmN57uE5Lu255qE5bGe5oCn5YWD5pWw5o2u5Lit6I635Y+W5pyf5pyb55qE57uE5Lu257G75Z6LXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGV4cGVjdGVkQ29tcG9uZW50VHlwZSA9ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIOiOt+WPluW9k+WJjee7hOS7tueahOivpue7huS/oeaBr++8jOWMheaLrOWxnuaAp+WFg+aVsOaNrlxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRDb21wb25lbnRJbmZvID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRJbmZvKG5vZGVVdWlkLCBjb21wb25lbnRUeXBlKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoY3VycmVudENvbXBvbmVudEluZm8uc3VjY2VzcyAmJiBjdXJyZW50Q29tcG9uZW50SW5mby5kYXRhPy5wcm9wZXJ0aWVzPy5bcHJvcGVydHldKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3BlcnR5TWV0YSA9IGN1cnJlbnRDb21wb25lbnRJbmZvLmRhdGEucHJvcGVydGllc1twcm9wZXJ0eV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDku47lsZ7mgKflhYPmlbDmja7kuK3mj5Dlj5bnu4Tku7bnsbvlnovkv6Hmga9cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnR5TWV0YSAmJiB0eXBlb2YgcHJvcGVydHlNZXRhID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5qOA5p+l5piv5ZCm5pyJdHlwZeWtl+auteaMh+ekuue7hOS7tuexu+Wei1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnR5TWV0YS50eXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWRDb21wb25lbnRUeXBlID0gcHJvcGVydHlNZXRhLnR5cGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5TWV0YS5jdG9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5pyJ5Lqb5bGe5oCn5Y+v6IO95L2/55SoY3RvcuWtl+autVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkQ29tcG9uZW50VHlwZSA9IHByb3BlcnR5TWV0YS5jdG9yO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eU1ldGEuZXh0ZW5kcyAmJiBBcnJheS5pc0FycmF5KHByb3BlcnR5TWV0YS5leHRlbmRzKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOajgOafpWV4dGVuZHPmlbDnu4TvvIzpgJrluLjnrKzkuIDkuKrmmK/mnIDlhbfkvZPnmoTnsbvlnotcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGV4dGVuZFR5cGUgb2YgcHJvcGVydHlNZXRhLmV4dGVuZHMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV4dGVuZFR5cGUuc3RhcnRzV2l0aCgnY2MuJykgJiYgZXh0ZW5kVHlwZSAhPT0gJ2NjLkNvbXBvbmVudCcgJiYgZXh0ZW5kVHlwZSAhPT0gJ2NjLk9iamVjdCcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkQ29tcG9uZW50VHlwZSA9IGV4dGVuZFR5cGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWV4cGVjdGVkQ29tcG9uZW50VHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuYWJsZSB0byBkZXRlcm1pbmUgcmVxdWlyZWQgY29tcG9uZW50IHR5cGUgZm9yIHByb3BlcnR5ICcke3Byb3BlcnR5fScgb24gY29tcG9uZW50ICcke2NvbXBvbmVudFR5cGV9Jy4gUHJvcGVydHkgbWV0YWRhdGEgbWF5IG5vdCBjb250YWluIHR5cGUgaW5mb3JtYXRpb24uYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbQ29tcG9uZW50VG9vbHNdIERldGVjdGVkIHJlcXVpcmVkIGNvbXBvbmVudCB0eXBlOiAke2V4cGVjdGVkQ29tcG9uZW50VHlwZX0gZm9yIHByb3BlcnR5OiAke3Byb3BlcnR5fWApO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOiOt+WPluebruagh+iKgueCueeahOe7hOS7tuS/oeaBryjlvZLkuIDljJYpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldE5vZGVEYXRhID0gYXdhaXQgcXVlcnlOb2RlV2l0aEZhbGxiYWNrKHRhcmdldE5vZGVVdWlkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0YXJnZXROb2RlRGF0YSB8fCAhdGFyZ2V0Tm9kZURhdGEuY29tcG9uZW50cykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUYXJnZXQgbm9kZSAke3RhcmdldE5vZGVVdWlkfSBub3QgZm91bmQgb3IgaGFzIG5vIGNvbXBvbmVudHNgKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5Zyo55uu5qCH6IqC54K557uE5Lu25YiX6KGo5Lit5p+l5om+5oyH5a6a57G75Z6LKOaUr+aMgSBGUU4g5LiO55+t5ZCNKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBub3JtID0gKHM6IHN0cmluZykgPT4gKHMgfHwgJycpLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvXmNjXFwuLywgJycpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRDb21wID0gdGFyZ2V0Tm9kZURhdGEuY29tcG9uZW50cy5maW5kKChjb21wOiBhbnkpID0+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub3JtKGNvbXAuY2lkKSA9PT0gbm9ybShleHBlY3RlZENvbXBvbmVudFR5cGUpIHx8IG5vcm0oY29tcC5uYW1lKSA9PT0gbm9ybShleHBlY3RlZENvbXBvbmVudFR5cGUpKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0Q29tcCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYXZhaWxhYmxlID0gdGFyZ2V0Tm9kZURhdGEuY29tcG9uZW50cy5tYXAoKGNvbXA6IGFueSkgPT4gY29tcC5jaWQgfHwgY29tcC5uYW1lKS5qb2luKCcsICcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb21wb25lbnQgdHlwZSAnJHtleHBlY3RlZENvbXBvbmVudFR5cGV9JyBub3QgZm91bmQgb24gbm9kZSAke3RhcmdldE5vZGVVdWlkfS4gQXZhaWxhYmxlIGNvbXBvbmVudHM6ICR7YXZhaWxhYmxlfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wb25lbnRJZCA9IHRhcmdldENvbXAudXVpZDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFjb21wb25lbnRJZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmFibGUgdG8gZXh0cmFjdCBjb21wb25lbnQgSUQgZm9yICR7ZXhwZWN0ZWRDb21wb25lbnRUeXBlfSBvbiAke3RhcmdldE5vZGVVdWlkfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDmm7TmlrDmnJ/mnJvlgLzkuLrnu4Tku7YgSUQg5a+56LGh5qC85byPLOeUqOS6juWQjue7remqjOivgVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3R1YWxFeHBlY3RlZFZhbHVlID0geyB1dWlkOiBjb21wb25lbnRJZCB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgc2V0UHJvcGVydHlXaXRoRmFsbGJhY2sobm9kZVV1aWQsIHByb3BlcnR5UGF0aCwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHsgdXVpZDogY29tcG9uZW50SWQgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGV4cGVjdGVkQ29tcG9uZW50VHlwZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgW0NvbXBvbmVudFRvb2xzXSBFcnJvciBzZXR0aW5nIGNvbXBvbmVudCByZWZlcmVuY2U6YCwgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ25vZGVBcnJheScgJiYgQXJyYXkuaXNBcnJheShwcm9jZXNzZWRWYWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyDnibnmrorlpITnkIboioLngrnmlbDnu4QgLSDkv53mjIHpooTlpITnkIbnmoTmoLzlvI9cclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW0NvbXBvbmVudFRvb2xzXSBTZXR0aW5nIG5vZGUgYXJyYXk6YCwgcHJvY2Vzc2VkVmFsdWUpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBzZXRQcm9wZXJ0eVdpdGhGYWxsYmFjayhub2RlVXVpZCwgcHJvcGVydHlQYXRoLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBwcm9jZXNzZWRWYWx1ZVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVR5cGUgPT09ICdjb2xvckFycmF5JyAmJiBBcnJheS5pc0FycmF5KHByb2Nlc3NlZFZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOeJueauiuWkhOeQhuminOiJsuaVsOe7hFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbG9yQXJyYXlWYWx1ZSA9IHByb2Nlc3NlZFZhbHVlLm1hcCgoaXRlbTogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtICYmIHR5cGVvZiBpdGVtID09PSAnb2JqZWN0JyAmJiAncicgaW4gaXRlbSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpdGVtLnIpIHx8IDApKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpdGVtLmcpIHx8IDApKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpdGVtLmIpIHx8IDApKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhOiBpdGVtLmEgIT09IHVuZGVmaW5lZCA/IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGl0ZW0uYSkpKSA6IDI1NVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHI6IDI1NSwgZzogMjU1LCBiOiAyNTUsIGE6IDI1NSB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgc2V0UHJvcGVydHlXaXRoRmFsbGJhY2sobm9kZVV1aWQsIHByb3BlcnR5UGF0aCwgeyB2YWx1ZTogY29sb3JBcnJheVZhbHVlLCB0eXBlOiAnY2MuQ29sb3InIH0gKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gTm9ybWFsIHByb3BlcnR5IHNldHRpbmcgZm9yIG5vbi1hc3NldCBwcm9wZXJ0aWVzXHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgc2V0UHJvcGVydHlXaXRoRmFsbGJhY2sobm9kZVV1aWQsIHByb3BlcnR5UGF0aCwgeyB2YWx1ZTogcHJvY2Vzc2VkVmFsdWUgfSApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyBTdGVwIDU6IOetieW+hUVkaXRvcuWujOaIkOabtOaWsO+8jOeEtuWQjumqjOivgeiuvue9rue7k+aenCjluKbkuIDmrKHph43or5XlhYvmnI3luo/liJfljJbml7bluo8pXHJcbiAgICAgICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMjAwKSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgdmVyaWZpY2F0aW9uID0gYXdhaXQgdGhpcy52ZXJpZnlQcm9wZXJ0eUNoYW5nZShub2RlVXVpZCwgY29tcG9uZW50VHlwZSwgcHJvcGVydHksIG9yaWdpbmFsVmFsdWUsIGFjdHVhbEV4cGVjdGVkVmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCF2ZXJpZmljYXRpb24udmVyaWZpZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMjAwKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdmVyaWZpY2F0aW9uID0gYXdhaXQgdGhpcy52ZXJpZnlQcm9wZXJ0eUNoYW5nZShub2RlVXVpZCwgY29tcG9uZW50VHlwZSwgcHJvcGVydHksIG9yaWdpbmFsVmFsdWUsIGFjdHVhbEV4cGVjdGVkVmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmICh2ZXJpZmljYXRpb24udmVyaWZpZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFN1Y2Nlc3NmdWxseSBzZXQgJHtjb21wb25lbnRUeXBlfS4ke3Byb3BlcnR5fWAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0dWFsVmFsdWU6IHZlcmlmaWNhdGlvbi5hY3R1YWxWYWx1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYW5nZVZlcmlmaWVkOiB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g55yf5a6e5aSx6LSlOuS4jeWGjeWBh+aIkOWKn+OAguaKpeWRiuacn+acm+WAvOS4juWunumZheivu+WbnuWAvCzkvr/kuo7lrprkvY3jgIJcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgUHJvcGVydHkgJyR7cHJvcGVydHl9JyBzZXQgb24gJHtjb21wb25lbnRUeXBlfSB3YXMgbm90IHZlcmlmaWVkLiBFeHBlY3RlZDogJHtKU09OLnN0cmluZ2lmeShhY3R1YWxFeHBlY3RlZFZhbHVlKX0sIGFjdHVhbDogJHtKU09OLnN0cmluZ2lmeSh2ZXJpZmljYXRpb24uYWN0dWFsVmFsdWUpfWAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWRWYWx1ZTogYWN0dWFsRXhwZWN0ZWRWYWx1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdHVhbFZhbHVlOiB2ZXJpZmljYXRpb24uYWN0dWFsVmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFuZ2VWZXJpZmllZDogZmFsc2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgW0NvbXBvbmVudFRvb2xzXSBFcnJvciBzZXR0aW5nIHByb3BlcnR5OmAsIGVycm9yKTtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIHNldCBwcm9wZXJ0eTogJHtlcnJvci5tZXNzYWdlfWBcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgYXR0YWNoU2NyaXB0KG5vZGVVdWlkOiBzdHJpbmcsIHNjcmlwdFBhdGg6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGFzeW5jIChyZXNvbHZlKSA9PiB7XHJcbiAgICAgICAgICAgIC8vIOS7juiEmuacrOi3r+W+hOaPkOWPlue7hOS7tuexu+WQjVxyXG4gICAgICAgICAgICBjb25zdCBzY3JpcHROYW1lID0gc2NyaXB0UGF0aC5zcGxpdCgnLycpLnBvcCgpPy5yZXBsYWNlKCcudHMnLCAnJykucmVwbGFjZSgnLmpzJywgJycpO1xyXG4gICAgICAgICAgICBpZiAoIXNjcmlwdE5hbWUpIHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdJbnZhbGlkIHNjcmlwdCBwYXRoJyB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyDlhYjmn6Xmib7oioLngrnkuIrmmK/lkKblt7LlrZjlnKjor6XohJrmnKznu4Tku7ZcclxuICAgICAgICAgICAgY29uc3QgYWxsQ29tcG9uZW50c0luZm8gPSBhd2FpdCB0aGlzLmdldENvbXBvbmVudHMobm9kZVV1aWQpO1xyXG4gICAgICAgICAgICBpZiAoYWxsQ29tcG9uZW50c0luZm8uc3VjY2VzcyAmJiBhbGxDb21wb25lbnRzSW5mby5kYXRhPy5jb21wb25lbnRzKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBleGlzdGluZ1NjcmlwdCA9IGFsbENvbXBvbmVudHNJbmZvLmRhdGEuY29tcG9uZW50cy5maW5kKChjb21wOiBhbnkpID0+IGNvbXAudHlwZSA9PT0gc2NyaXB0TmFtZSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXhpc3RpbmdTY3JpcHQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFNjcmlwdCAnJHtzY3JpcHROYW1lfScgYWxyZWFkeSBleGlzdHMgb24gbm9kZWAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlVXVpZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudE5hbWU6IHNjcmlwdE5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleGlzdGluZzogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIOeUqCBjcmVhdGUtY29tcG9uZW50IOa2iOaBr+aMgui9veiEmuacrOe7hOS7tijohJrmnKznsbsgY2lkID0gQGNjY2xhc3Mg5ZCNKTtcclxuICAgICAgICAgICAgLy8g6aqM6K+B5bim6YeN6K+V44CC5LiN5YaN5Zue6YCA5Yiw5LiN5a2Y5Zyo55qE5Zy65pmv6ISa5pysIGF0dGFjaFNjcmlwdCDmlrnms5XjgIJcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IGNyZWF0ZUNvbXBvbmVudFdpdGhGYWxsYmFjayhub2RlVXVpZCwgc2NyaXB0TmFtZSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgdmVyaWZpZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGxldCBhdmFpbGFibGVMaXN0ID0gJyc7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBhdHRlbXB0ID0gMDsgYXR0ZW1wdCA8IDM7IGF0dGVtcHQrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHIgPT4gc2V0VGltZW91dChyLCAyNTApKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbmZvID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRzKG5vZGVVdWlkKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5mby5zdWNjZXNzICYmIGluZm8uZGF0YT8uY29tcG9uZW50cykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmb3VuZCA9IGluZm8uZGF0YS5jb21wb25lbnRzLmZpbmQoKGNvbXA6IGFueSkgPT5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXAudHlwZSA9PT0gc2NyaXB0TmFtZSB8fCBjb21wLm5hbWUgPT09IHNjcmlwdE5hbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZm91bmQpIHsgdmVyaWZpZWQgPSB0cnVlOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVMaXN0ID0gaW5mby5kYXRhLmNvbXBvbmVudHMubWFwKChjOiBhbnkpID0+IGMudHlwZSkuam9pbignLCAnKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAodmVyaWZpZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFNjcmlwdCAnJHtzY3JpcHROYW1lfScgYXR0YWNoZWQgc3VjY2Vzc2Z1bGx5YCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogeyBub2RlVXVpZCwgY29tcG9uZW50TmFtZTogc2NyaXB0TmFtZSwgZXhpc3Rpbmc6IGZhbHNlIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogYFNjcmlwdCAnJHtzY3JpcHROYW1lfScgd2FzIG5vdCBmb3VuZCBvbiBub2RlIGFmdGVyIGFkZGl0aW9uLiBBdmFpbGFibGUgY29tcG9uZW50czogJHthdmFpbGFibGVMaXN0fWAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RydWN0aW9uOiBg6ISa5pys57G75ZCN6ZyA5LiOIEBjY2NsYXNzKCdYeHgnKSDoo4XppbDlmajlkI3kuIDoh7Qs5LiU6ISa5pys5bey57yW6K+R44CC5b2T5YmN5LuO5paH5Lu25ZCN5o6o5pat57G75ZCN5Li6ICcke3NjcmlwdE5hbWV9Jyzoi6XohJrmnKzlhoUgQGNjY2xhc3Mg5ZCN5LiN5ZCMLOivt+aUueeUqOivpeWQjeWtl+OAguWPr+eUqCBnZXRfY29tcG9uZW50cyDmn6XnnIvoioLngrnlt7LmnInnu4Tku7bjgIJgXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogYEZhaWxlZCB0byBhdHRhY2ggc2NyaXB0ICcke3NjcmlwdE5hbWV9JzogJHtlcnIubWVzc2FnZX1gLFxyXG4gICAgICAgICAgICAgICAgICAgIGluc3RydWN0aW9uOiAn6K+356Gu6K6k6ISa5pys5bey57yW6K+R44CB57G757un5om/IENvbXBvbmVudOOAgUBjY2NsYXNzIOWQjeS4juaWh+S7tuWQjeS4gOiHtOOAgidcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRBdmFpbGFibGVDb21wb25lbnRzKGNhdGVnb3J5OiBzdHJpbmcgPSAnYWxsJyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgY29uc3QgY29tcG9uZW50Q2F0ZWdvcmllczogUmVjb3JkPHN0cmluZywgc3RyaW5nW10+ID0ge1xyXG4gICAgICAgICAgICByZW5kZXJlcjogWydjYy5TcHJpdGUnLCAnY2MuTGFiZWwnLCAnY2MuUmljaFRleHQnLCAnY2MuTWFzaycsICdjYy5HcmFwaGljcyddLFxyXG4gICAgICAgICAgICB1aTogWydjYy5CdXR0b24nLCAnY2MuVG9nZ2xlJywgJ2NjLlNsaWRlcicsICdjYy5TY3JvbGxWaWV3JywgJ2NjLkVkaXRCb3gnLCAnY2MuUHJvZ3Jlc3NCYXInXSxcclxuICAgICAgICAgICAgcGh5c2ljczogWydjYy5SaWdpZEJvZHkyRCcsICdjYy5Cb3hDb2xsaWRlcjJEJywgJ2NjLkNpcmNsZUNvbGxpZGVyMkQnLCAnY2MuUG9seWdvbkNvbGxpZGVyMkQnXSxcclxuICAgICAgICAgICAgYW5pbWF0aW9uOiBbJ2NjLkFuaW1hdGlvbicsICdjYy5BbmltYXRpb25DbGlwJywgJ2NjLlNrZWxldGFsQW5pbWF0aW9uJ10sXHJcbiAgICAgICAgICAgIGF1ZGlvOiBbJ2NjLkF1ZGlvU291cmNlJ10sXHJcbiAgICAgICAgICAgIGxheW91dDogWydjYy5MYXlvdXQnLCAnY2MuV2lkZ2V0JywgJ2NjLlBhZ2VWaWV3JywgJ2NjLlBhZ2VWaWV3SW5kaWNhdG9yJ10sXHJcbiAgICAgICAgICAgIGVmZmVjdHM6IFsnY2MuTW90aW9uU3RyZWFrJywgJ2NjLlBhcnRpY2xlU3lzdGVtMkQnXSxcclxuICAgICAgICAgICAgY2FtZXJhOiBbJ2NjLkNhbWVyYSddLFxyXG4gICAgICAgICAgICBsaWdodDogWydjYy5MaWdodCcsICdjYy5EaXJlY3Rpb25hbExpZ2h0JywgJ2NjLlBvaW50TGlnaHQnLCAnY2MuU3BvdExpZ2h0J11cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBsZXQgY29tcG9uZW50czogc3RyaW5nW10gPSBbXTtcclxuICAgICAgICBcclxuICAgICAgICBpZiAoY2F0ZWdvcnkgPT09ICdhbGwnKSB7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgY2F0IGluIGNvbXBvbmVudENhdGVnb3JpZXMpIHtcclxuICAgICAgICAgICAgICAgIGNvbXBvbmVudHMgPSBjb21wb25lbnRzLmNvbmNhdChjb21wb25lbnRDYXRlZ29yaWVzW2NhdF0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIGlmIChjb21wb25lbnRDYXRlZ29yaWVzW2NhdGVnb3J5XSkge1xyXG4gICAgICAgICAgICBjb21wb25lbnRzID0gY29tcG9uZW50Q2F0ZWdvcmllc1tjYXRlZ29yeV07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXHJcbiAgICAgICAgICAgICAgICBjb21wb25lbnRzOiBjb21wb25lbnRzXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaXNWYWxpZFByb3BlcnR5RGVzY3JpcHRvcihwcm9wRGF0YTogYW55KTogYm9vbGVhbiB7XHJcbiAgICAgICAgLy8g5qOA5p+l5piv5ZCm5piv5pyJ5pWI55qE5bGe5oCn5o+P6L+w5a+56LGhXHJcbiAgICAgICAgaWYgKHR5cGVvZiBwcm9wRGF0YSAhPT0gJ29iamVjdCcgfHwgcHJvcERhdGEgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMocHJvcERhdGEpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g6YG/5YWN6YGN5Y6G566A5Y2V55qE5pWw5YC85a+56LGh77yI5aaCIHt3aWR0aDogMjAwLCBoZWlnaHQ6IDE1MH3vvIlcclxuICAgICAgICAgICAgY29uc3QgaXNTaW1wbGVWYWx1ZU9iamVjdCA9IGtleXMuZXZlcnkoa2V5ID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gcHJvcERhdGFba2V5XTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIHZhbHVlID09PSAnYm9vbGVhbic7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKGlzU2ltcGxlVmFsdWVPYmplY3QpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g5qOA5p+l5piv5ZCm5YyF5ZCr5bGe5oCn5o+P6L+w56ym55qE54m55b6B5a2X5q6177yM5LiN5L2/55SoJ2luJ+aTjeS9nOesplxyXG4gICAgICAgICAgICBjb25zdCBoYXNOYW1lID0ga2V5cy5pbmNsdWRlcygnbmFtZScpO1xyXG4gICAgICAgICAgICBjb25zdCBoYXNWYWx1ZSA9IGtleXMuaW5jbHVkZXMoJ3ZhbHVlJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IGhhc1R5cGUgPSBrZXlzLmluY2x1ZGVzKCd0eXBlJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IGhhc0Rpc3BsYXlOYW1lID0ga2V5cy5pbmNsdWRlcygnZGlzcGxheU5hbWUnKTtcclxuICAgICAgICAgICAgY29uc3QgaGFzUmVhZG9ubHkgPSBrZXlzLmluY2x1ZGVzKCdyZWFkb25seScpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g5b+F6aG75YyF5ZCrbmFtZeaIlnZhbHVl5a2X5q6177yM5LiU6YCa5bi46L+Y5pyJdHlwZeWtl+autVxyXG4gICAgICAgICAgICBjb25zdCBoYXNWYWxpZFN0cnVjdHVyZSA9IChoYXNOYW1lIHx8IGhhc1ZhbHVlKSAmJiAoaGFzVHlwZSB8fCBoYXNEaXNwbGF5TmFtZSB8fCBoYXNSZWFkb25seSk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyDpop3lpJbmo4Dmn6XvvJrlpoLmnpzmnIlkZWZhdWx05a2X5q615LiU57uT5p6E5aSN5p2C77yM6YG/5YWN5rex5bqm6YGN5Y6GXHJcbiAgICAgICAgICAgIGlmIChrZXlzLmluY2x1ZGVzKCdkZWZhdWx0JykgJiYgcHJvcERhdGEuZGVmYXVsdCAmJiB0eXBlb2YgcHJvcERhdGEuZGVmYXVsdCA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRlZmF1bHRLZXlzID0gT2JqZWN0LmtleXMocHJvcERhdGEuZGVmYXVsdCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZGVmYXVsdEtleXMuaW5jbHVkZXMoJ3ZhbHVlJykgJiYgdHlwZW9mIHByb3BEYXRhLmRlZmF1bHQudmFsdWUgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g6L+Z56eN5oOF5Ya15LiL77yM5oiR5Lus5Y+q6L+U5Zue6aG25bGC5bGe5oCn77yM5LiN5rex5YWl6YGN5Y6GZGVmYXVsdC52YWx1ZVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBoYXNWYWxpZFN0cnVjdHVyZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgcmV0dXJuIGhhc1ZhbGlkU3RydWN0dXJlO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgW2lzVmFsaWRQcm9wZXJ0eURlc2NyaXB0b3JdIEVycm9yIGNoZWNraW5nIHByb3BlcnR5IGRlc2NyaXB0b3I6YCwgZXJyb3IpO1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKiDmoLnmja7lvZLkuIDljJblsZ7mgKflgLzmjqjmlq3nsbvlnoss55So5LqOIHNldC1wcm9wZXJ0eSDnmoTotYTmupDnsbvliIbmlK/liKTmlq0gKi9cclxuICAgIHByaXZhdGUgaW5mZXJQcm9wZXJ0eVR5cGUodmFsdWU6IGFueSwgcHJvcGVydHlOYW1lOiBzdHJpbmcsIGRlY2xhcmVkVHlwZTogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgICAgICAvLyDnlKjmiLfmmL7lvI/lo7DmmI7nmoQgcHJvcGVydHlUeXBlIOS8mOWFiOeUqOS6juWAvOWkhOeQhizkvYbmraTlpITov5Tlm57nmoQgdHlwZSDku4XnlKjkuo5cclxuICAgICAgICAvLyDliKTmlq3mmK/lkKbotbAgYXNzZXQg5YiG5pSvKGxpbmUgNzAxIOmZhOi/kSBwcm9wZXJ0eUluZm8udHlwZSA9PT0gJ2Fzc2V0JynjgIJcclxuICAgICAgICBpZiAoZGVjbGFyZWRUeXBlID09PSAnYXNzZXQnIHx8IGRlY2xhcmVkVHlwZSA9PT0gJ3Nwcml0ZUZyYW1lJyB8fCBkZWNsYXJlZFR5cGUgPT09ICdwcmVmYWInKSByZXR1cm4gJ2Fzc2V0JztcclxuICAgICAgICBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcclxuICAgICAgICAgICAgaWYgKCd1dWlkJyBpbiB2YWx1ZSkgcmV0dXJuICdhc3NldCc7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBkZWNsYXJlZFR5cGUgfHwgJ3Vua25vd24nO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBwcml2YXRlIGFuYWx5emVQcm9wZXJ0eShjb21wb25lbnQ6IGFueSwgcHJvcGVydHlOYW1lOiBzdHJpbmcpOiB7IGV4aXN0czogYm9vbGVhbjsgdHlwZTogc3RyaW5nOyBhdmFpbGFibGVQcm9wZXJ0aWVzOiBzdHJpbmdbXTsgb3JpZ2luYWxWYWx1ZTogYW55IH0ge1xyXG4gICAgICAgIC8vIOS7juWkjeadgueahOe7hOS7tue7k+aehOS4reaPkOWPluWPr+eUqOWxnuaAp1xyXG4gICAgICAgIGNvbnN0IGF2YWlsYWJsZVByb3BlcnRpZXM6IHN0cmluZ1tdID0gW107XHJcbiAgICAgICAgbGV0IHByb3BlcnR5VmFsdWU6IGFueSA9IHVuZGVmaW5lZDtcclxuICAgICAgICBsZXQgcHJvcGVydHlFeGlzdHMgPSBmYWxzZTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDlsJ3or5XlpJrnp43mlrnlvI/mn6Xmib7lsZ7mgKfvvJpcclxuICAgICAgICAvLyAxLiDnm7TmjqXlsZ7mgKforr/pl65cclxuICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGNvbXBvbmVudCwgcHJvcGVydHlOYW1lKSkge1xyXG4gICAgICAgICAgICBwcm9wZXJ0eVZhbHVlID0gY29tcG9uZW50W3Byb3BlcnR5TmFtZV07XHJcbiAgICAgICAgICAgIHByb3BlcnR5RXhpc3RzID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gMi4g5LuO5bWM5aWX57uT5p6E5Lit5p+l5om+ICjlpoLku47mtYvor5XmlbDmja7nnIvliLDnmoTlpI3mnYLnu5PmnoQpXHJcbiAgICAgICAgaWYgKCFwcm9wZXJ0eUV4aXN0cyAmJiBjb21wb25lbnQucHJvcGVydGllcyAmJiB0eXBlb2YgY29tcG9uZW50LnByb3BlcnRpZXMgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgICAgIC8vIOmmluWFiOajgOafpXByb3BlcnRpZXMudmFsdWXmmK/lkKblrZjlnKjvvIjov5nmmK/miJHku6zlnKhnZXRDb21wb25lbnRz5Lit55yL5Yiw55qE57uT5p6E77yJXHJcbiAgICAgICAgICAgIGlmIChjb21wb25lbnQucHJvcGVydGllcy52YWx1ZSAmJiB0eXBlb2YgY29tcG9uZW50LnByb3BlcnRpZXMudmFsdWUgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZU9iaiA9IGNvbXBvbmVudC5wcm9wZXJ0aWVzLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBba2V5LCBwcm9wRGF0YV0gb2YgT2JqZWN0LmVudHJpZXModmFsdWVPYmopKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5qOA5p+lcHJvcERhdGHmmK/lkKbmmK/kuIDkuKrmnInmlYjnmoTlsZ7mgKfmj4/ov7Dlr7nosaFcclxuICAgICAgICAgICAgICAgICAgICAvLyDnoa7kv51wcm9wRGF0YeaYr+WvueixoeS4lOWMheWQq+mihOacn+eahOWxnuaAp+e7k+aehFxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzVmFsaWRQcm9wZXJ0eURlc2NyaXB0b3IocHJvcERhdGEpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3BJbmZvID0gcHJvcERhdGEgYXMgYW55O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVQcm9wZXJ0aWVzLnB1c2goa2V5KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGtleSA9PT0gcHJvcGVydHlOYW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDkvJjlhYjkvb/nlKh2YWx1ZeWxnuaAp++8jOWmguaenOayoeacieWImeS9v+eUqHByb3BEYXRh5pys6LqrXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3BLZXlzID0gT2JqZWN0LmtleXMocHJvcEluZm8pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5VmFsdWUgPSBwcm9wS2V5cy5pbmNsdWRlcygndmFsdWUnKSA/IHByb3BJbmZvLnZhbHVlIDogcHJvcEluZm87XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWmguaenOajgOafpeWksei0pe+8jOebtOaOpeS9v+eUqHByb3BJbmZvXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlWYWx1ZSA9IHByb3BJbmZvO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlFeGlzdHMgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8g5aSH55So5pa55qGI77ya55u05o6l5LuOcHJvcGVydGllc+afpeaJvlxyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBba2V5LCBwcm9wRGF0YV0gb2YgT2JqZWN0LmVudHJpZXMoY29tcG9uZW50LnByb3BlcnRpZXMpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNWYWxpZFByb3BlcnR5RGVzY3JpcHRvcihwcm9wRGF0YSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvcEluZm8gPSBwcm9wRGF0YSBhcyBhbnk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZVByb3BlcnRpZXMucHVzaChrZXkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoa2V5ID09PSBwcm9wZXJ0eU5hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOS8mOWFiOS9v+eUqHZhbHVl5bGe5oCn77yM5aaC5p6c5rKh5pyJ5YiZ5L2/55SocHJvcERhdGHmnKzouqtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvcEtleXMgPSBPYmplY3Qua2V5cyhwcm9wSW5mbyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlWYWx1ZSA9IHByb3BLZXlzLmluY2x1ZGVzKCd2YWx1ZScpID8gcHJvcEluZm8udmFsdWUgOiBwcm9wSW5mbztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c5qOA5p+l5aSx6LSl77yM55u05o6l5L2/55SocHJvcEluZm9cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eVZhbHVlID0gcHJvcEluZm87XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eUV4aXN0cyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gMy4g5LuO55u05o6l5bGe5oCn5Lit5o+Q5Y+W566A5Y2V5bGe5oCn5ZCNXHJcbiAgICAgICAgaWYgKGF2YWlsYWJsZVByb3BlcnRpZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGNvbXBvbmVudCkpIHtcclxuICAgICAgICAgICAgICAgIGlmICgha2V5LnN0YXJ0c1dpdGgoJ18nKSAmJiAhWydfX3R5cGVfXycsICdjaWQnLCAnbm9kZScsICd1dWlkJywgJ25hbWUnLCAnZW5hYmxlZCcsICd0eXBlJywgJ3JlYWRvbmx5JywgJ3Zpc2libGUnXS5pbmNsdWRlcyhrZXkpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlUHJvcGVydGllcy5wdXNoKGtleSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKCFwcm9wZXJ0eUV4aXN0cykge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgZXhpc3RzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHR5cGU6ICd1bmtub3duJyxcclxuICAgICAgICAgICAgICAgIGF2YWlsYWJsZVByb3BlcnRpZXMsXHJcbiAgICAgICAgICAgICAgICBvcmlnaW5hbFZhbHVlOiB1bmRlZmluZWRcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgbGV0IHR5cGUgPSAndW5rbm93bic7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5pm66IO957G75Z6L5qOA5rWLXHJcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkocHJvcGVydHlWYWx1ZSkpIHtcclxuICAgICAgICAgICAgLy8g5pWw57uE57G75Z6L5qOA5rWLXHJcbiAgICAgICAgICAgIGlmIChwcm9wZXJ0eU5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnbm9kZScpKSB7XHJcbiAgICAgICAgICAgICAgICB0eXBlID0gJ25vZGVBcnJheSc7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlOYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ2NvbG9yJykpIHtcclxuICAgICAgICAgICAgICAgIHR5cGUgPSAnY29sb3JBcnJheSc7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0eXBlID0gJ2FycmF5JztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHByb3BlcnR5VmFsdWUgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHByb3BlcnR5IG5hbWUgc3VnZ2VzdHMgaXQncyBhbiBhc3NldFxyXG4gICAgICAgICAgICBpZiAoWydzcHJpdGVGcmFtZScsICd0ZXh0dXJlJywgJ21hdGVyaWFsJywgJ2ZvbnQnLCAnY2xpcCcsICdwcmVmYWInXS5pbmNsdWRlcyhwcm9wZXJ0eU5hbWUudG9Mb3dlckNhc2UoKSkpIHtcclxuICAgICAgICAgICAgICAgIHR5cGUgPSAnYXNzZXQnO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdHlwZSA9ICdzdHJpbmcnO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcHJvcGVydHlWYWx1ZSA9PT0gJ251bWJlcicpIHtcclxuICAgICAgICAgICAgdHlwZSA9ICdudW1iZXInO1xyXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHByb3BlcnR5VmFsdWUgPT09ICdib29sZWFuJykge1xyXG4gICAgICAgICAgICB0eXBlID0gJ2Jvb2xlYW4nO1xyXG4gICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlWYWx1ZSAmJiB0eXBlb2YgcHJvcGVydHlWYWx1ZSA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhwcm9wZXJ0eVZhbHVlKTtcclxuICAgICAgICAgICAgICAgIGlmIChrZXlzLmluY2x1ZGVzKCdyJykgJiYga2V5cy5pbmNsdWRlcygnZycpICYmIGtleXMuaW5jbHVkZXMoJ2InKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPSAnY29sb3InO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrZXlzLmluY2x1ZGVzKCd4JykgJiYga2V5cy5pbmNsdWRlcygneScpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9IHByb3BlcnR5VmFsdWUueiAhPT0gdW5kZWZpbmVkID8gJ3ZlYzMnIDogJ3ZlYzInO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrZXlzLmluY2x1ZGVzKCd3aWR0aCcpICYmIGtleXMuaW5jbHVkZXMoJ2hlaWdodCcpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9ICdzaXplJztcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5cy5pbmNsdWRlcygndXVpZCcpIHx8IGtleXMuaW5jbHVkZXMoJ19fdXVpZF9fJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyDmo4Dmn6XmmK/lkKbmmK/oioLngrnlvJXnlKjvvIjpgJrov4flsZ7mgKflkI3miJZfX2lkX1/lsZ7mgKfliKTmlq3vvIlcclxuICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydHlOYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ25vZGUnKSB8fCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlOYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ3RhcmdldCcpIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleXMuaW5jbHVkZXMoJ19faWRfXycpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGUgPSAnbm9kZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZSA9ICdhc3NldCc7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrZXlzLmluY2x1ZGVzKCdfX2lkX18nKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOiKgueCueW8leeUqOeJueW+gVxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPSAnbm9kZSc7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPSAnb2JqZWN0JztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgW2FuYWx5emVQcm9wZXJ0eV0gRXJyb3IgY2hlY2tpbmcgcHJvcGVydHkgdHlwZSBmb3I6ICR7SlNPTi5zdHJpbmdpZnkocHJvcGVydHlWYWx1ZSl9YCk7XHJcbiAgICAgICAgICAgICAgICB0eXBlID0gJ29iamVjdCc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VmFsdWUgPT09IG51bGwgfHwgcHJvcGVydHlWYWx1ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIC8vIEZvciBudWxsL3VuZGVmaW5lZCB2YWx1ZXMsIGNoZWNrIHByb3BlcnR5IG5hbWUgdG8gZGV0ZXJtaW5lIHR5cGVcclxuICAgICAgICAgICAgaWYgKFsnc3ByaXRlRnJhbWUnLCAndGV4dHVyZScsICdtYXRlcmlhbCcsICdmb250JywgJ2NsaXAnLCAncHJlZmFiJ10uaW5jbHVkZXMocHJvcGVydHlOYW1lLnRvTG93ZXJDYXNlKCkpKSB7XHJcbiAgICAgICAgICAgICAgICB0eXBlID0gJ2Fzc2V0JztcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eU5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnbm9kZScpIHx8IFxyXG4gICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlOYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ3RhcmdldCcpKSB7XHJcbiAgICAgICAgICAgICAgICB0eXBlID0gJ25vZGUnO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5TmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdjb21wb25lbnQnKSkge1xyXG4gICAgICAgICAgICAgICAgdHlwZSA9ICdjb21wb25lbnQnO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdHlwZSA9ICd1bmtub3duJztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBleGlzdHM6IHRydWUsXHJcbiAgICAgICAgICAgIHR5cGUsXHJcbiAgICAgICAgICAgIGF2YWlsYWJsZVByb3BlcnRpZXMsXHJcbiAgICAgICAgICAgIG9yaWdpbmFsVmFsdWU6IHByb3BlcnR5VmFsdWVcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc21hcnRDb252ZXJ0VmFsdWUoaW5wdXRWYWx1ZTogYW55LCBwcm9wZXJ0eUluZm86IGFueSk6IGFueSB7XHJcbiAgICAgICAgY29uc3QgeyB0eXBlLCBvcmlnaW5hbFZhbHVlIH0gPSBwcm9wZXJ0eUluZm87XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc29sZS5sb2coYFtzbWFydENvbnZlcnRWYWx1ZV0gQ29udmVydGluZyAke0pTT04uc3RyaW5naWZ5KGlucHV0VmFsdWUpfSB0byB0eXBlOiAke3R5cGV9YCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gU3RyaW5nKGlucHV0VmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGNhc2UgJ251bWJlcic6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gTnVtYmVyKGlucHV0VmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpbnB1dFZhbHVlID09PSAnYm9vbGVhbicpIHJldHVybiBpbnB1dFZhbHVlO1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpbnB1dFZhbHVlID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpbnB1dFZhbHVlLnRvTG93ZXJDYXNlKCkgPT09ICd0cnVlJyB8fCBpbnB1dFZhbHVlID09PSAnMSc7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gQm9vbGVhbihpbnB1dFZhbHVlKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjYXNlICdjb2xvcic6XHJcbiAgICAgICAgICAgICAgICAvLyDkvJjljJbnmoTpopzoibLlpITnkIbvvIzmlK/mjIHlpJrnp43ovpPlhaXmoLzlvI9cclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaW5wdXRWYWx1ZSA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyDlrZfnrKbkuLLmoLzlvI/vvJrljYHlha3ov5vliLbjgIHpopzoibLlkI3np7DjgIFyZ2IoKS9yZ2JhKClcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJzZUNvbG9yU3RyaW5nKGlucHV0VmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgaW5wdXRWYWx1ZSA9PT0gJ29iamVjdCcgJiYgaW5wdXRWYWx1ZSAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlucHV0S2V5cyA9IE9iamVjdC5rZXlzKGlucHV0VmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDlpoLmnpzovpPlhaXmmK/popzoibLlr7nosaHvvIzpqozor4HlubbovazmjaJcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0S2V5cy5pbmNsdWRlcygncicpIHx8IGlucHV0S2V5cy5pbmNsdWRlcygnZycpIHx8IGlucHV0S2V5cy5pbmNsdWRlcygnYicpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHI6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGlucHV0VmFsdWUucikgfHwgMCkpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGc6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGlucHV0VmFsdWUuZykgfHwgMCkpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGI6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGlucHV0VmFsdWUuYikgfHwgMCkpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGE6IGlucHV0VmFsdWUuYSAhPT0gdW5kZWZpbmVkID8gTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIoaW5wdXRWYWx1ZS5hKSkpIDogMjU1XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBbc21hcnRDb252ZXJ0VmFsdWVdIEludmFsaWQgY29sb3Igb2JqZWN0OiAke0pTT04uc3RyaW5naWZ5KGlucHV0VmFsdWUpfWApO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIOWmguaenOacieWOn+WAvO+8jOS/neaMgeWOn+WAvOe7k+aehOW5tuabtOaWsOaPkOS+m+eahOWAvFxyXG4gICAgICAgICAgICAgICAgaWYgKG9yaWdpbmFsVmFsdWUgJiYgdHlwZW9mIG9yaWdpbmFsVmFsdWUgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5wdXRLZXlzID0gdHlwZW9mIGlucHV0VmFsdWUgPT09ICdvYmplY3QnICYmIGlucHV0VmFsdWUgPyBPYmplY3Qua2V5cyhpbnB1dFZhbHVlKSA6IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcjogaW5wdXRLZXlzLmluY2x1ZGVzKCdyJykgPyBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpbnB1dFZhbHVlLnIpKSkgOiAob3JpZ2luYWxWYWx1ZS5yIHx8IDI1NSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnOiBpbnB1dEtleXMuaW5jbHVkZXMoJ2cnKSA/IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGlucHV0VmFsdWUuZykpKSA6IChvcmlnaW5hbFZhbHVlLmcgfHwgMjU1KSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGI6IGlucHV0S2V5cy5pbmNsdWRlcygnYicpID8gTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIoaW5wdXRWYWx1ZS5iKSkpIDogKG9yaWdpbmFsVmFsdWUuYiB8fCAyNTUpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYTogaW5wdXRLZXlzLmluY2x1ZGVzKCdhJykgPyBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpbnB1dFZhbHVlLmEpKSkgOiAob3JpZ2luYWxWYWx1ZS5hIHx8IDI1NSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYFtzbWFydENvbnZlcnRWYWx1ZV0gRXJyb3IgcHJvY2Vzc2luZyBjb2xvciB3aXRoIG9yaWdpbmFsIHZhbHVlOiAke2Vycm9yfWApO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIOm7mOiupOi/lOWbnueZveiJslxyXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBbc21hcnRDb252ZXJ0VmFsdWVdIFVzaW5nIGRlZmF1bHQgd2hpdGUgY29sb3IgZm9yIGludmFsaWQgaW5wdXQ6ICR7SlNPTi5zdHJpbmdpZnkoaW5wdXRWYWx1ZSl9YCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyByOiAyNTUsIGc6IDI1NSwgYjogMjU1LCBhOiAyNTUgfTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjYXNlICd2ZWMyJzpcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaW5wdXRWYWx1ZSA9PT0gJ29iamVjdCcgJiYgaW5wdXRWYWx1ZSAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHg6IE51bWJlcihpbnB1dFZhbHVlLngpIHx8IG9yaWdpbmFsVmFsdWUueCB8fCAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB5OiBOdW1iZXIoaW5wdXRWYWx1ZS55KSB8fCBvcmlnaW5hbFZhbHVlLnkgfHwgMFxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb3JpZ2luYWxWYWx1ZTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjYXNlICd2ZWMzJzpcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaW5wdXRWYWx1ZSA9PT0gJ29iamVjdCcgJiYgaW5wdXRWYWx1ZSAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHg6IE51bWJlcihpbnB1dFZhbHVlLngpIHx8IG9yaWdpbmFsVmFsdWUueCB8fCAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB5OiBOdW1iZXIoaW5wdXRWYWx1ZS55KSB8fCBvcmlnaW5hbFZhbHVlLnkgfHwgMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgejogTnVtYmVyKGlucHV0VmFsdWUueikgfHwgb3JpZ2luYWxWYWx1ZS56IHx8IDBcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsVmFsdWU7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgY2FzZSAnc2l6ZSc6XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGlucHV0VmFsdWUgPT09ICdvYmplY3QnICYmIGlucHV0VmFsdWUgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogTnVtYmVyKGlucHV0VmFsdWUud2lkdGgpIHx8IG9yaWdpbmFsVmFsdWUud2lkdGggfHwgMTAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IE51bWJlcihpbnB1dFZhbHVlLmhlaWdodCkgfHwgb3JpZ2luYWxWYWx1ZS5oZWlnaHQgfHwgMTAwXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbFZhbHVlO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGNhc2UgJ25vZGUnOlxyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpbnB1dFZhbHVlID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOiKgueCueW8leeUqOmcgOimgeeJueauiuWkhOeQhlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpbnB1dFZhbHVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgaW5wdXRWYWx1ZSA9PT0gJ29iamVjdCcgJiYgaW5wdXRWYWx1ZSAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOWmguaenOW3sue7j+aYr+WvueixoeW9ouW8j++8jOi/lOWbnlVVSUTmiJblrozmlbTlr7nosaFcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaW5wdXRWYWx1ZS51dWlkIHx8IGlucHV0VmFsdWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb3JpZ2luYWxWYWx1ZTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjYXNlICdhc3NldCc6XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGlucHV0VmFsdWUgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c6L6T5YWl5piv5a2X56ym5Liy6Lev5b6E77yM6L2s5o2i5Li6YXNzZXTlr7nosaFcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyB1dWlkOiBpbnB1dFZhbHVlIH07XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBpbnB1dFZhbHVlID09PSAnb2JqZWN0JyAmJiBpbnB1dFZhbHVlICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGlucHV0VmFsdWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb3JpZ2luYWxWYWx1ZTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgLy8g5a+55LqO5pyq55+l57G75Z6L77yM5bC96YeP5L+d5oyB5Y6f5pyJ57uT5p6EXHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGlucHV0VmFsdWUgPT09IHR5cGVvZiBvcmlnaW5hbFZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGlucHV0VmFsdWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb3JpZ2luYWxWYWx1ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgcGFyc2VDb2xvclN0cmluZyhjb2xvclN0cjogc3RyaW5nKTogeyByOiBudW1iZXI7IGc6IG51bWJlcjsgYjogbnVtYmVyOyBhOiBudW1iZXIgfSB7XHJcbiAgICAgICAgY29uc3Qgc3RyID0gY29sb3JTdHIudHJpbSgpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOWPquaUr+aMgeWNgeWFrei/m+WItuagvOW8jyAjUlJHR0JCIOaIliAjUlJHR0JCQUFcclxuICAgICAgICBpZiAoc3RyLnN0YXJ0c1dpdGgoJyMnKSkge1xyXG4gICAgICAgICAgICBpZiAoc3RyLmxlbmd0aCA9PT0gNykgeyAvLyAjUlJHR0JCXHJcbiAgICAgICAgICAgICAgICBjb25zdCByID0gcGFyc2VJbnQoc3RyLnN1YnN0cmluZygxLCAzKSwgMTYpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZyA9IHBhcnNlSW50KHN0ci5zdWJzdHJpbmcoMywgNSksIDE2KTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGIgPSBwYXJzZUludChzdHIuc3Vic3RyaW5nKDUsIDcpLCAxNik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyByLCBnLCBiLCBhOiAyNTUgfTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChzdHIubGVuZ3RoID09PSA5KSB7IC8vICNSUkdHQkJBQVxyXG4gICAgICAgICAgICAgICAgY29uc3QgciA9IHBhcnNlSW50KHN0ci5zdWJzdHJpbmcoMSwgMyksIDE2KTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGcgPSBwYXJzZUludChzdHIuc3Vic3RyaW5nKDMsIDUpLCAxNik7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBiID0gcGFyc2VJbnQoc3RyLnN1YnN0cmluZyg1LCA3KSwgMTYpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYSA9IHBhcnNlSW50KHN0ci5zdWJzdHJpbmcoNywgOSksIDE2KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHIsIGcsIGIsIGEgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyDlpoLmnpzkuI3mmK/mnInmlYjnmoTljYHlha3ov5vliLbmoLzlvI/vvIzov5Tlm57plJnor6/mj5DnpLpcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgY29sb3IgZm9ybWF0OiBcIiR7Y29sb3JTdHJ9XCIuIE9ubHkgaGV4YWRlY2ltYWwgZm9ybWF0IGlzIHN1cHBvcnRlZCAoZS5nLiwgXCIjRkYwMDAwXCIgb3IgXCIjRkYwMDAwRkZcIilgKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHZlcmlmeVByb3BlcnR5Q2hhbmdlKG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZywgcHJvcGVydHk6IHN0cmluZywgb3JpZ2luYWxWYWx1ZTogYW55LCBleHBlY3RlZFZhbHVlOiBhbnkpOiBQcm9taXNlPHsgdmVyaWZpZWQ6IGJvb2xlYW47IGFjdHVhbFZhbHVlOiBhbnk7IGZ1bGxEYXRhOiBhbnkgfT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIFN0YXJ0aW5nIHZlcmlmaWNhdGlvbiBmb3IgJHtjb21wb25lbnRUeXBlfS4ke3Byb3BlcnR5fWApO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIEV4cGVjdGVkIHZhbHVlOmAsIEpTT04uc3RyaW5naWZ5KGV4cGVjdGVkVmFsdWUpKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBPcmlnaW5hbCB2YWx1ZTpgLCBKU09OLnN0cmluZ2lmeShvcmlnaW5hbFZhbHVlKSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8g6YeN5paw6I635Y+W57uE5Lu25L+h5oGv6L+b6KGM6aqM6K+BXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIENhbGxpbmcgZ2V0Q29tcG9uZW50SW5mby4uLmApO1xyXG4gICAgICAgICAgICBjb25zdCBjb21wb25lbnRJbmZvID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRJbmZvKG5vZGVVdWlkLCBjb21wb25lbnRUeXBlKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gZ2V0Q29tcG9uZW50SW5mbyBzdWNjZXNzOmAsIGNvbXBvbmVudEluZm8uc3VjY2Vzcyk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjb25zdCBhbGxDb21wb25lbnRzID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRzKG5vZGVVdWlkKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gZ2V0Q29tcG9uZW50cyBzdWNjZXNzOmAsIGFsbENvbXBvbmVudHMuc3VjY2Vzcyk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiAoY29tcG9uZW50SW5mby5zdWNjZXNzICYmIGNvbXBvbmVudEluZm8uZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gQ29tcG9uZW50IGRhdGEgYXZhaWxhYmxlLCBleHRyYWN0aW5nIHByb3BlcnR5ICcke3Byb3BlcnR5fSdgKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGFsbFByb3BlcnR5TmFtZXMgPSBPYmplY3Qua2V5cyhjb21wb25lbnRJbmZvLmRhdGEucHJvcGVydGllcyB8fCB7fSk7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBBdmFpbGFibGUgcHJvcGVydGllczpgLCBhbGxQcm9wZXJ0eU5hbWVzKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHByb3BlcnR5RGF0YSA9IGNvbXBvbmVudEluZm8uZGF0YS5wcm9wZXJ0aWVzPy5bcHJvcGVydHldO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gUmF3IHByb3BlcnR5IGRhdGEgZm9yICcke3Byb3BlcnR5fSc6YCwgSlNPTi5zdHJpbmdpZnkocHJvcGVydHlEYXRhKSk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIOS7juWxnuaAp+aVsOaNruS4reaPkOWPluWunumZheWAvFxyXG4gICAgICAgICAgICAgICAgbGV0IGFjdHVhbFZhbHVlID0gcHJvcGVydHlEYXRhO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gSW5pdGlhbCBhY3R1YWxWYWx1ZTpgLCBKU09OLnN0cmluZ2lmeShhY3R1YWxWYWx1ZSkpO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBpZiAocHJvcGVydHlEYXRhICYmIHR5cGVvZiBwcm9wZXJ0eURhdGEgPT09ICdvYmplY3QnICYmICd2YWx1ZScgaW4gcHJvcGVydHlEYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYWN0dWFsVmFsdWUgPSBwcm9wZXJ0eURhdGEudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gRXh0cmFjdGVkIGFjdHVhbFZhbHVlIGZyb20gLnZhbHVlOmAsIEpTT04uc3RyaW5naWZ5KGFjdHVhbFZhbHVlKSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIE5vIC52YWx1ZSBwcm9wZXJ0eSBmb3VuZCwgdXNpbmcgcmF3IGRhdGFgKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8g5L+u5aSN6aqM6K+B6YC76L6R77ya5qOA5p+l5a6e6ZmF5YC85piv5ZCm5Yy56YWN5pyf5pyb5YC8XHJcbiAgICAgICAgICAgICAgICBsZXQgdmVyaWZpZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBleHBlY3RlZFZhbHVlID09PSAnb2JqZWN0JyAmJiBleHBlY3RlZFZhbHVlICE9PSBudWxsICYmICd1dWlkJyBpbiBleHBlY3RlZFZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5a+55LqO5byV55So57G75Z6L77yI6IqC54K5L+e7hOS7ti/otYTmupDvvInvvIzmr5TovoNVVUlEXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYWN0dWFsVXVpZCA9IGFjdHVhbFZhbHVlICYmIHR5cGVvZiBhY3R1YWxWYWx1ZSA9PT0gJ29iamVjdCcgJiYgJ3V1aWQnIGluIGFjdHVhbFZhbHVlID8gYWN0dWFsVmFsdWUudXVpZCA6ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4cGVjdGVkVXVpZCA9IGV4cGVjdGVkVmFsdWUudXVpZCB8fCAnJztcclxuICAgICAgICAgICAgICAgICAgICB2ZXJpZmllZCA9IGFjdHVhbFV1aWQgPT09IGV4cGVjdGVkVXVpZCAmJiBleHBlY3RlZFV1aWQgIT09ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIFJlZmVyZW5jZSBjb21wYXJpc29uOmApO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgIC0gRXhwZWN0ZWQgVVVJRDogXCIke2V4cGVjdGVkVXVpZH1cImApO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgIC0gQWN0dWFsIFVVSUQ6IFwiJHthY3R1YWxVdWlkfVwiYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgLSBVVUlEIG1hdGNoOiAke2FjdHVhbFV1aWQgPT09IGV4cGVjdGVkVXVpZH1gKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICAtIFVVSUQgbm90IGVtcHR5OiAke2V4cGVjdGVkVXVpZCAhPT0gJyd9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgLSBGaW5hbCB2ZXJpZmllZDogJHt2ZXJpZmllZH1gKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5a+55LqO5YW25LuW57G75Z6L77yM55u05o6l5q+U6L6D5YC8XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gVmFsdWUgY29tcGFyaXNvbjpgKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICAtIEV4cGVjdGVkIHR5cGU6ICR7dHlwZW9mIGV4cGVjdGVkVmFsdWV9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgLSBBY3R1YWwgdHlwZTogJHt0eXBlb2YgYWN0dWFsVmFsdWV9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBhY3R1YWxWYWx1ZSA9PT0gdHlwZW9mIGV4cGVjdGVkVmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBhY3R1YWxWYWx1ZSA9PT0gJ29iamVjdCcgJiYgYWN0dWFsVmFsdWUgIT09IG51bGwgJiYgZXhwZWN0ZWRWYWx1ZSAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5a+56LGh57G75Z6L55qE5rex5bqm5q+U6L6DXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJpZmllZCA9IEpTT04uc3RyaW5naWZ5KGFjdHVhbFZhbHVlKSA9PT0gSlNPTi5zdHJpbmdpZnkoZXhwZWN0ZWRWYWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICAtIE9iamVjdCBjb21wYXJpc29uIChKU09OKTogJHt2ZXJpZmllZH1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWfuuacrOexu+Wei+eahOebtOaOpeavlOi+g1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyaWZpZWQgPSBhY3R1YWxWYWx1ZSA9PT0gZXhwZWN0ZWRWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgIC0gRGlyZWN0IGNvbXBhcmlzb246ICR7dmVyaWZpZWR9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDnsbvlnovkuI3ljLnphY3ml7bnmoTnibnmrorlpITnkIbvvIjlpoLmlbDlrZflkozlrZfnrKbkuLLvvIlcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RyaW5nTWF0Y2ggPSBTdHJpbmcoYWN0dWFsVmFsdWUpID09PSBTdHJpbmcoZXhwZWN0ZWRWYWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG51bWJlck1hdGNoID0gTnVtYmVyKGFjdHVhbFZhbHVlKSA9PT0gTnVtYmVyKGV4cGVjdGVkVmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2ZXJpZmllZCA9IHN0cmluZ01hdGNoIHx8IG51bWJlck1hdGNoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICAtIFN0cmluZyBtYXRjaDogJHtzdHJpbmdNYXRjaH1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgLSBOdW1iZXIgbWF0Y2g6ICR7bnVtYmVyTWF0Y2h9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgIC0gVHlwZSBtaXNtYXRjaCB2ZXJpZmllZDogJHt2ZXJpZmllZH1gKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIEZpbmFsIHZlcmlmaWNhdGlvbiByZXN1bHQ6ICR7dmVyaWZpZWR9YCk7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBGaW5hbCBhY3R1YWxWYWx1ZTpgLCBKU09OLnN0cmluZ2lmeShhY3R1YWxWYWx1ZSkpO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmVyaWZpZWQsXHJcbiAgICAgICAgICAgICAgICAgICAgYWN0dWFsVmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZnVsbERhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5Y+q6L+U5Zue5L+u5pS555qE5bGe5oCn5L+h5oGv77yM5LiN6L+U5Zue5a6M5pW057uE5Lu25pWw5o2uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vZGlmaWVkUHJvcGVydHk6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHByb3BlcnR5LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmVmb3JlOiBvcmlnaW5hbFZhbHVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IGV4cGVjdGVkVmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3R1YWw6IGFjdHVhbFZhbHVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyaWZpZWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eU1ldGFkYXRhOiBwcm9wZXJ0eURhdGEgLy8g5Y+q5YyF5ZCr6L+Z5Liq5bGe5oCn55qE5YWD5pWw5o2uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOeugOWMlueahOe7hOS7tuS/oeaBr1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRTdW1tYXJ5OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b3RhbFByb3BlcnRpZXM6IE9iamVjdC5rZXlzKGNvbXBvbmVudEluZm8uZGF0YT8ucHJvcGVydGllcyB8fCB7fSkubGVuZ3RoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBSZXR1cm5pbmcgcmVzdWx0OmAsIEpTT04uc3RyaW5naWZ5KHJlc3VsdCwgbnVsbCwgMikpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIENvbXBvbmVudEluZm8gZmFpbGVkIG9yIG5vIGRhdGE6YCwgY29tcG9uZW50SW5mbyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIFZlcmlmaWNhdGlvbiBmYWlsZWQgd2l0aCBlcnJvcjonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1t2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gRXJyb3Igc3RhY2s6JywgZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLnN0YWNrIDogJ05vIHN0YWNrIHRyYWNlJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIFJldHVybmluZyBmYWxsYmFjayByZXN1bHRgKTtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB2ZXJpZmllZDogZmFsc2UsXHJcbiAgICAgICAgICAgIGFjdHVhbFZhbHVlOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIGZ1bGxEYXRhOiBudWxsXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIOajgOa1i+aYr+WQpuS4uuiKgueCueWxnuaAp++8jOWmguaenOaYr+WImemHjeWumuWQkeWIsOWvueW6lOeahOiKgueCueaWueazlVxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGFzeW5jIGNoZWNrQW5kUmVkaXJlY3ROb2RlUHJvcGVydGllcyhhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZSB8IG51bGw+IHtcclxuICAgICAgICBjb25zdCB7IG5vZGVVdWlkLCBjb21wb25lbnRUeXBlLCBwcm9wZXJ0eSwgcHJvcGVydHlUeXBlLCB2YWx1ZSB9ID0gYXJncztcclxuICAgICAgICBcclxuICAgICAgICAvLyDmo4DmtYvmmK/lkKbkuLroioLngrnln7rnoYDlsZ7mgKfvvIjlupTor6Xkvb/nlKggc2V0X25vZGVfcHJvcGVydHnvvIlcclxuICAgICAgICBjb25zdCBub2RlQmFzaWNQcm9wZXJ0aWVzID0gW1xyXG4gICAgICAgICAgICAnbmFtZScsICdhY3RpdmUnLCAnbGF5ZXInLCAnbW9iaWxpdHknLCAncGFyZW50JywgJ2NoaWxkcmVuJywgJ2hpZGVGbGFncydcclxuICAgICAgICBdO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOajgOa1i+aYr+WQpuS4uuiKgueCueWPmOaNouWxnuaAp++8iOW6lOivpeS9v+eUqCBzZXRfbm9kZV90cmFuc2Zvcm3vvIlcclxuICAgICAgICBjb25zdCBub2RlVHJhbnNmb3JtUHJvcGVydGllcyA9IFtcclxuICAgICAgICAgICAgJ3Bvc2l0aW9uJywgJ3JvdGF0aW9uJywgJ3NjYWxlJywgJ2V1bGVyQW5nbGVzJywgJ2FuZ2xlJ1xyXG4gICAgICAgIF07XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gRGV0ZWN0IGF0dGVtcHRzIHRvIHNldCBjYy5Ob2RlIHByb3BlcnRpZXMgKGNvbW1vbiBtaXN0YWtlKVxyXG4gICAgICAgIGlmIChjb21wb25lbnRUeXBlID09PSAnY2MuTm9kZScgfHwgY29tcG9uZW50VHlwZSA9PT0gJ05vZGUnKSB7XHJcbiAgICAgICAgICAgIGlmIChub2RlQmFzaWNQcm9wZXJ0aWVzLmluY2x1ZGVzKHByb3BlcnR5KSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBQcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nIGlzIGEgbm9kZSBiYXNpYyBwcm9wZXJ0eSwgbm90IGEgY29tcG9uZW50IHByb3BlcnR5YCxcclxuICAgICAgICAgICAgICAgICAgICAgIGluc3RydWN0aW9uOiBgUGxlYXNlIHVzZSBzZXRfbm9kZV9wcm9wZXJ0eSBtZXRob2QgdG8gc2V0IG5vZGUgcHJvcGVydGllczogc2V0X25vZGVfcHJvcGVydHkodXVpZD1cIiR7bm9kZVV1aWR9XCIsIHByb3BlcnR5PVwiJHtwcm9wZXJ0eX1cIiwgdmFsdWU9JHtKU09OLnN0cmluZ2lmeSh2YWx1ZSl9KWBcclxuICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5vZGVUcmFuc2Zvcm1Qcm9wZXJ0aWVzLmluY2x1ZGVzKHByb3BlcnR5KSkge1xyXG4gICAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogYFByb3BlcnR5ICcke3Byb3BlcnR5fScgaXMgYSBub2RlIHRyYW5zZm9ybSBwcm9wZXJ0eSwgbm90IGEgY29tcG9uZW50IHByb3BlcnR5YCxcclxuICAgICAgICAgICAgICAgICAgICAgIGluc3RydWN0aW9uOiBgUGxlYXNlIHVzZSBzZXRfbm9kZV90cmFuc2Zvcm0gbWV0aG9kIHRvIHNldCB0cmFuc2Zvcm0gcHJvcGVydGllczogc2V0X25vZGVfdHJhbnNmb3JtKHV1aWQ9XCIke25vZGVVdWlkfVwiLCAke3Byb3BlcnR5fT0ke0pTT04uc3RyaW5naWZ5KHZhbHVlKX0pYFxyXG4gICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gRGV0ZWN0IGNvbW1vbiBpbmNvcnJlY3QgdXNhZ2VcclxuICAgICAgICAgIGlmIChub2RlQmFzaWNQcm9wZXJ0aWVzLmluY2x1ZGVzKHByb3BlcnR5KSB8fCBub2RlVHJhbnNmb3JtUHJvcGVydGllcy5pbmNsdWRlcyhwcm9wZXJ0eSkpIHtcclxuICAgICAgICAgICAgICBjb25zdCBtZXRob2ROYW1lID0gbm9kZVRyYW5zZm9ybVByb3BlcnRpZXMuaW5jbHVkZXMocHJvcGVydHkpID8gJ3NldF9ub2RlX3RyYW5zZm9ybScgOiAnc2V0X25vZGVfcHJvcGVydHknO1xyXG4gICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICBlcnJvcjogYFByb3BlcnR5ICcke3Byb3BlcnR5fScgaXMgYSBub2RlIHByb3BlcnR5LCBub3QgYSBjb21wb25lbnQgcHJvcGVydHlgLFxyXG4gICAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbjogYFByb3BlcnR5ICcke3Byb3BlcnR5fScgc2hvdWxkIGJlIHNldCB1c2luZyAke21ldGhvZE5hbWV9IG1ldGhvZCwgbm90IHNldF9jb21wb25lbnRfcHJvcGVydHkuIFBsZWFzZSB1c2U6ICR7bWV0aG9kTmFtZX0odXVpZD1cIiR7bm9kZVV1aWR9XCIsICR7bm9kZVRyYW5zZm9ybVByb3BlcnRpZXMuaW5jbHVkZXMocHJvcGVydHkpID8gcHJvcGVydHkgOiBgcHJvcGVydHk9XCIke3Byb3BlcnR5fVwiYH09JHtKU09OLnN0cmluZ2lmeSh2YWx1ZSl9KWBcclxuICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICByZXR1cm4gbnVsbDsgLy8g5LiN5piv6IqC54K55bGe5oCn77yM57un57ut5q2j5bi45aSE55CGXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8qKlxyXG4gICAgICAgKiDnlJ/miJDnu4Tku7blu7rorq7kv6Hmga9cclxuICAgICAgICovXHJcbiAgICAgIHByaXZhdGUgZ2VuZXJhdGVDb21wb25lbnRTdWdnZXN0aW9uKHJlcXVlc3RlZFR5cGU6IHN0cmluZywgYXZhaWxhYmxlVHlwZXM6IHN0cmluZ1tdLCBwcm9wZXJ0eTogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgICAgICAgIC8vIOajgOafpeaYr+WQpuWtmOWcqOebuOS8vOeahOe7hOS7tuexu+Wei1xyXG4gICAgICAgICAgY29uc3Qgc2ltaWxhclR5cGVzID0gYXZhaWxhYmxlVHlwZXMuZmlsdGVyKHR5cGUgPT4gXHJcbiAgICAgICAgICAgICAgdHlwZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHJlcXVlc3RlZFR5cGUudG9Mb3dlckNhc2UoKSkgfHwgXHJcbiAgICAgICAgICAgICAgcmVxdWVzdGVkVHlwZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHR5cGUudG9Mb3dlckNhc2UoKSlcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGxldCBpbnN0cnVjdGlvbiA9ICcnO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZiAoc2ltaWxhclR5cGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICBpbnN0cnVjdGlvbiArPSBgXFxuXFxu8J+UjSBGb3VuZCBzaW1pbGFyIGNvbXBvbmVudHM6ICR7c2ltaWxhclR5cGVzLmpvaW4oJywgJyl9YDtcclxuICAgICAgICAgICAgICBpbnN0cnVjdGlvbiArPSBgXFxu8J+SoSBTdWdnZXN0aW9uOiBQZXJoYXBzIHlvdSBtZWFudCB0byBzZXQgdGhlICcke3NpbWlsYXJUeXBlc1swXX0nIGNvbXBvbmVudD9gO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyBSZWNvbW1lbmQgcG9zc2libGUgY29tcG9uZW50cyBiYXNlZCBvbiBwcm9wZXJ0eSBuYW1lXHJcbiAgICAgICAgICBjb25zdCBwcm9wZXJ0eVRvQ29tcG9uZW50TWFwOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmdbXT4gPSB7XHJcbiAgICAgICAgICAgICAgJ3N0cmluZyc6IFsnY2MuTGFiZWwnLCAnY2MuUmljaFRleHQnLCAnY2MuRWRpdEJveCddLFxyXG4gICAgICAgICAgICAgICd0ZXh0JzogWydjYy5MYWJlbCcsICdjYy5SaWNoVGV4dCddLFxyXG4gICAgICAgICAgICAgICdmb250U2l6ZSc6IFsnY2MuTGFiZWwnLCAnY2MuUmljaFRleHQnXSxcclxuICAgICAgICAgICAgICAnc3ByaXRlRnJhbWUnOiBbJ2NjLlNwcml0ZSddLFxyXG4gICAgICAgICAgICAgICdjb2xvcic6IFsnY2MuTGFiZWwnLCAnY2MuU3ByaXRlJywgJ2NjLkdyYXBoaWNzJ10sXHJcbiAgICAgICAgICAgICAgJ25vcm1hbENvbG9yJzogWydjYy5CdXR0b24nXSxcclxuICAgICAgICAgICAgICAncHJlc3NlZENvbG9yJzogWydjYy5CdXR0b24nXSxcclxuICAgICAgICAgICAgICAndGFyZ2V0JzogWydjYy5CdXR0b24nXSxcclxuICAgICAgICAgICAgICAnY29udGVudFNpemUnOiBbJ2NjLlVJVHJhbnNmb3JtJ10sXHJcbiAgICAgICAgICAgICAgJ2FuY2hvclBvaW50JzogWydjYy5VSVRyYW5zZm9ybSddXHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBjb25zdCByZWNvbW1lbmRlZENvbXBvbmVudHMgPSBwcm9wZXJ0eVRvQ29tcG9uZW50TWFwW3Byb3BlcnR5XSB8fCBbXTtcclxuICAgICAgICAgIGNvbnN0IGF2YWlsYWJsZVJlY29tbWVuZGVkID0gcmVjb21tZW5kZWRDb21wb25lbnRzLmZpbHRlcihjb21wID0+IGF2YWlsYWJsZVR5cGVzLmluY2x1ZGVzKGNvbXApKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgaWYgKGF2YWlsYWJsZVJlY29tbWVuZGVkLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICBpbnN0cnVjdGlvbiArPSBgXFxuXFxu8J+OryBCYXNlZCBvbiBwcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nLCByZWNvbW1lbmRlZCBjb21wb25lbnRzOiAke2F2YWlsYWJsZVJlY29tbWVuZGVkLmpvaW4oJywgJyl9YDtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gUHJvdmlkZSBvcGVyYXRpb24gc3VnZ2VzdGlvbnNcclxuICAgICAgICAgIGluc3RydWN0aW9uICs9IGBcXG5cXG7wn5OLIFN1Z2dlc3RlZCBBY3Rpb25zOmA7XHJcbiAgICAgICAgICBpbnN0cnVjdGlvbiArPSBgXFxuMS4gVXNlIGdldF9jb21wb25lbnRzKG5vZGVVdWlkPVwiJHtyZXF1ZXN0ZWRUeXBlLmluY2x1ZGVzKCd1dWlkJykgPyAnWU9VUl9OT0RFX1VVSUQnIDogJ25vZGVVdWlkJ31cIikgdG8gdmlldyBhbGwgY29tcG9uZW50cyBvbiB0aGUgbm9kZWA7XHJcbiAgICAgICAgICBpbnN0cnVjdGlvbiArPSBgXFxuMi4gSWYgeW91IG5lZWQgdG8gYWRkIGEgY29tcG9uZW50LCB1c2UgYWRkX2NvbXBvbmVudChub2RlVXVpZD1cIi4uLlwiLCBjb21wb25lbnRUeXBlPVwiJHtyZXF1ZXN0ZWRUeXBlfVwiKWA7XHJcbiAgICAgICAgICBpbnN0cnVjdGlvbiArPSBgXFxuMy4gVmVyaWZ5IHRoYXQgdGhlIGNvbXBvbmVudCB0eXBlIG5hbWUgaXMgY29ycmVjdCAoY2FzZS1zZW5zaXRpdmUpYDtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICByZXR1cm4gaW5zdHJ1Y3Rpb247XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDlv6vpgJ/pqozor4HotYTmupDorr7nva7nu5PmnpxcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBhc3luYyBxdWlja1ZlcmlmeUFzc2V0KG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZywgcHJvcGVydHk6IHN0cmluZyk6IFByb21pc2U8YW55PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmF3Tm9kZURhdGEgPSBhd2FpdCBxdWVyeU5vZGVXaXRoRmFsbGJhY2sobm9kZVV1aWQpO1xyXG4gICAgICAgICAgICBpZiAoIXJhd05vZGVEYXRhIHx8ICFyYXdOb2RlRGF0YS5fX2NvbXBzX18pIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyDmib7liLDnu4Tku7ZcclxuICAgICAgICAgICAgY29uc3QgY29tcG9uZW50ID0gcmF3Tm9kZURhdGEuX19jb21wc19fLmZpbmQoKGNvbXA6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY29tcFR5cGUgPSBjb21wLl9fdHlwZV9fIHx8IGNvbXAuY2lkIHx8IGNvbXAudHlwZTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBjb21wVHlwZSA9PT0gY29tcG9uZW50VHlwZTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiAoIWNvbXBvbmVudCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOaPkOWPluWxnuaAp+WAvFxyXG4gICAgICAgICAgICBjb25zdCBwcm9wZXJ0aWVzID0gdGhpcy5leHRyYWN0Q29tcG9uZW50UHJvcGVydGllcyhjb21wb25lbnQpO1xyXG4gICAgICAgICAgICBjb25zdCBwcm9wZXJ0eURhdGEgPSBwcm9wZXJ0aWVzW3Byb3BlcnR5XTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmIChwcm9wZXJ0eURhdGEgJiYgdHlwZW9mIHByb3BlcnR5RGF0YSA9PT0gJ29iamVjdCcgJiYgJ3ZhbHVlJyBpbiBwcm9wZXJ0eURhdGEpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBwcm9wZXJ0eURhdGEudmFsdWU7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvcGVydHlEYXRhO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihgW3F1aWNrVmVyaWZ5QXNzZXRdIEVycm9yOmAsIGVycm9yKTtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59Il19