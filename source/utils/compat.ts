/**
 * 版本兼容工具模块
 * 用于检测 Cocos Creator 版本并提供 API 兼容层
 */

// 缓存版本信息
let cachedVersion: string | null = null;

/**
 * 获取当前 Cocos Creator 版本
 */
export function getCocosVersion(): string {
    if (cachedVersion) return cachedVersion;

    try {
        // Editor.versions.cocos 在 3.8.0+ 都存在
        cachedVersion = (Editor as any).versions?.cocos || '3.8.0';
    } catch {
        cachedVersion = '3.8.0';
    }
    return cachedVersion;
}

/**
 * 比较版本号
 * @returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 < p2) return -1;
        if (p1 > p2) return 1;
    }
    return 0;
}

/**
 * 检查当前版本是否满足最低要求
 */
export function isVersionAtLeast(minVersion: string): boolean {
    const current = getCocosVersion();
    return compareVersions(current, minVersion) >= 0;
}

/**
 * 安全调用 Editor.Message.request
 * 如果 API 不存在，返回 null 而不是抛出异常
 */
export async function safeMessageRequest(
    channel: string,
    method: string,
    ...args: any[]
): Promise<any> {
    try {
        return await Editor.Message.request(channel, method, ...args);
    } catch (err: any) {
        console.warn(`[MCP Compat] Editor.Message.request('${channel}', '${method}') failed:`, err.message);
        return null;
    }
}

/**
 * 使用 execute-scene-script 作为回退方案添加组件
 */
export async function addComponentFallback(
    nodeUuid: string,
    componentType: string
): Promise<any> {
    const options = {
        name: 'cocos-mcp-server',
        method: 'addComponentToNode',
        args: [nodeUuid, componentType]
    };
    return await Editor.Message.request('scene', 'execute-scene-script', options);
}

/**
 * 使用 execute-scene-script 作为回退方案移除组件
 */
export async function removeComponentFallback(
    nodeUuid: string,
    componentType: string
): Promise<any> {
    const options = {
        name: 'cocos-mcp-server',
        method: 'removeComponentFromNode',
        args: [nodeUuid, componentType]
    };
    return await Editor.Message.request('scene', 'execute-scene-script', options);
}

/**
 * 使用 execute-scene-script 作为回退方案查询节点信息
 */
export async function queryNodeFallback(nodeUuid: string): Promise<any> {
    const options = {
        name: 'cocos-mcp-server',
        method: 'getNodeInfo',
        args: [nodeUuid]
    };
    return await Editor.Message.request('scene', 'execute-scene-script', options);
}

/**
 * 使用 execute-scene-script 作为回退方案查询场景节点树
 */
export async function queryNodeTreeFallback(): Promise<any> {
    const options = {
        name: 'cocos-mcp-server',
        method: 'getAllNodes',
        args: []
    };
    return await Editor.Message.request('scene', 'execute-scene-script', options);
}

/**
 * 带回退的创建组件
 * 先尝试直接 API，失败后使用 execute-scene-script
 */
export async function createComponentWithFallback(
    nodeUuid: string,
    componentType: string
): Promise<any> {
    // 先尝试直接 API（3.8.6+）
    const result = await safeMessageRequest('scene', 'create-component', {
        uuid: nodeUuid,
        component: componentType
    });

    if (result !== null) {
        return result;
    }

    // 回退到 execute-scene-script
    console.log(`[MCP Compat] create-component API not available, falling back to execute-scene-script`);
    return await addComponentFallback(nodeUuid, componentType);
}

/**
 * 带回退的移除组件
 * 先尝试直接 API，失败后使用 execute-scene-script
 */
export async function removeComponentWithFallback(
    nodeUuid: string,
    componentType: string
): Promise<any> {
    // 先尝试直接 API（3.8.6+）
    const result = await safeMessageRequest('scene', 'remove-component', {
        uuid: nodeUuid,
        component: componentType
    });

    if (result !== null) {
        return result;
    }

    // 回退到 execute-scene-script
    console.log(`[MCP Compat] remove-component API not available, falling back to execute-scene-script`);
    return await removeComponentFallback(nodeUuid, componentType);
}

/**
 * 带回退的查询节点
 * 先尝试直接 API，失败后使用 execute-scene-script
 */
export async function queryNodeWithFallback(nodeUuid: string): Promise<any> {
    // 先尝试直接 API（3.8.6+）
    const result = await safeMessageRequest('scene', 'query-node', nodeUuid);

    if (result !== null) {
        return result;
    }

    // 回退到 execute-scene-script
    console.log(`[MCP Compat] query-node API not available, falling back to execute-scene-script`);
    return await queryNodeFallback(nodeUuid);
}

/**
 * 带回退的查询节点树
 * 先尝试直接 API，失败后使用 execute-scene-script
 */
export async function queryNodeTreeWithFallback(): Promise<any> {
    // 先尝试直接 API（3.8.6+）
    const result = await safeMessageRequest('scene', 'query-node-tree');

    if (result !== null) {
        return result;
    }

    // 回退到 execute-scene-script
    console.log(`[MCP Compat] query-node-tree API not available, falling back to execute-scene-script`);
    return await queryNodeTreeFallback();
}

/**
 * 检查 reference-image 通道是否可用
 */
export async function isReferenceImageAvailable(): Promise<boolean> {
    if (!isVersionAtLeast('3.8.2')) {
        return false;
    }
    // 尝试调用一个轻量级方法来检测
    const result = await safeMessageRequest('reference-image', 'query-config');
    return result !== null;
}

/**
 * 获取版本兼容性信息
 */
export function getCompatibilityInfo(): {
    version: string;
    isLegacy: boolean;
    limitations: string[];
} {
    const version = getCocosVersion();
    const isLegacy = compareVersions(version, '3.8.6') < 0;

    const limitations: string[] = [];
    if (compareVersions(version, '3.8.2') < 0) {
        limitations.push('参考图功能 (reference-image) 不可用');
    }
    if (isLegacy) {
        limitations.push('部分高级场景操作可能受限');
    }

    return { version, isLegacy, limitations };
}

/**
 * 使用 execute-scene-script 作为回退方案设置属性
 */
export async function setPropertyFallback(
    uuid: string,
    path: string,
    dump: any
): Promise<any> {
    // 使用 execute-scene-script 通过场景脚本设置属性
    const options = {
        name: 'cocos-mcp-server',
        method: 'setNodeProperty',
        args: [uuid, path, dump.value, dump.type]
    };
    return await Editor.Message.request('scene', 'execute-scene-script', options);
}

/**
 * 带回退的设置属性
 * 先尝试直接 API，失败后使用 execute-scene-script
 */
export async function setPropertyWithFallback(
    uuid: string,
    path: string,
    dump: any
): Promise<any> {
    // 先尝试直接 API（3.8.6+）
    const result = await safeMessageRequest('scene', 'set-property', {
        uuid,
        path,
        dump
    });

    if (result !== null) {
        return result;
    }

    // 回退到 execute-scene-script
    console.log(`[MCP Compat] set-property API not available, falling back to execute-scene-script`);
    return await setPropertyFallback(uuid, path, dump);
}
