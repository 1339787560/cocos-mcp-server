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
    return cachedVersion!;
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
 * 添加组件(无运行时回退)。
 * 只用官方 create-component 消息——它走编辑器管线,组件持久化到场景树。
 * 旧版回退到场景脚本 node.addComponent 走运行时,不持久化,query-node 验证看不到,
 * 造成"添加失败但看似成功"的混乱。现改为:create-component 失败直接抛真实错误。
 * 注:create-component 在 3.8.1 即可用(已确认 app.asar 注册),旧注释"3.8.6+"有误。
 */
export async function createComponentWithFallback(
    nodeUuid: string,
    componentType: string
): Promise<any> {
    return await Editor.Message.request('scene', 'create-component', {
        uuid: nodeUuid,
        component: componentType
    });
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
 * 查询单个节点信息(归一化)。
 * 以场景脚本 getNodeInfo 为主路径——已证实可靠:组件类型名正确、能找到孙节点、
 * 新建节点立即可见。query-node 消息的 dump 格式 fragile(__type__ 字段常缺失导致 "Unknown"),
 * 仅作兜底。两条路径结果统一为 {uuid,name,active,position,rotation,scale,parent,children,components:[{cid,name,index,enabled}]}。
 */
export async function queryNodeWithFallback(nodeUuid: string): Promise<any> {
    // 主路径:场景脚本(归一化输出)
    try {
        const result = await Editor.Message.request('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'getNodeInfo',
            args: [nodeUuid]
        });
        if (result && result.success && result.data) {
            return result.data;
        }
        // 场景脚本明确返回失败(节点不存在等)——直接透传,不再尝试更脆弱的 query-node
        if (result && result.success === false) {
            return null;
        }
    } catch (err: any) {
        console.warn(`[MCP Compat] scene-script getNodeInfo failed: ${err?.message}`);
    }
    // 兜底:query-node 消息(归一化 query-node dump)
    const dump = await safeMessageRequest('scene', 'query-node', nodeUuid);
    if (dump) {
        return normalizeQueryNodeDump(dump);
    }
    return null;
}

/**
 * 查询节点树(归一化)。优先场景脚本 getAllNodes(归一化树,含 components cid),
 * 兜底官方 query-node-tree。
 */
export async function queryNodeTreeWithFallback(): Promise<any> {
    try {
        const result = await Editor.Message.request('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'getAllNodes',
            args: []
        });
        if (result && result.success && result.data) {
            return result.data;
        }
    } catch (err: any) {
        console.warn(`[MCP Compat] scene-script getAllNodes failed: ${err?.message}`);
    }
    // 兜底:官方 query-node-tree
    const tree = await safeMessageRequest('scene', 'query-node-tree');
    return tree || null;
}

/** 把 query-node 的 dump 格式归一化为与场景脚本 getNodeInfo 一致的形态 */
function normalizeQueryNodeDump(dump: any): any {
    if (!dump) return null;
    const val = (v: any, fallback?: any) => (v && typeof v === 'object' && 'value' in v) ? v.value : (v !== undefined ? v : fallback);
    const comps = (dump.__comps__ || []).map((comp: any, index: number) => {
        const cid = comp.__type__ || comp.cid || comp.type || 'Unknown';
        return { cid, name: cid.replace(/^cc\./, ''), index, enabled: comp.enabled !== undefined ? comp.enabled : true };
    });
    return {
        uuid: val(dump.uuid),
        name: val(dump.name, 'Unknown'),
        active: val(dump.active, true),
        layer: val(dump.layer),
        position: val(dump.position, { x: 0, y: 0, z: 0 }),
        rotation: val(dump.rotation, { x: 0, y: 0, z: 0, w: 1 }),
        scale: val(dump.scale, { x: 1, y: 1, z: 1 }),
        parent: val(dump.parent?.uuid || dump.parent),
        children: dump.children || [],
        components: comps
    };
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
 * 设置属性(无运行时回退)。
 * 只用官方 set-property 消息——它走编辑器序列化管线,改动持久化 + 触发 Inspector/撤销。
 * 旧版回退到场景脚本 setNodeProperty 的 `node[path]=value` 对 `__comps__.N.prop` 点路径是
 * 无效赋值且静默成功,造成假阳性。现改为:set-property 失败直接抛真实错误,由调用方验证读回。
 */
export async function setPropertyWithFallback(
    uuid: string,
    path: string,
    dump: any
): Promise<any> {
    // 直接调用,不吞错误——失败让调用方感知并报告
    return await Editor.Message.request('scene', 'set-property', {
        uuid,
        path,
        dump
    });
}
