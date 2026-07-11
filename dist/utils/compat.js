"use strict";
/**
 * 版本兼容工具模块
 * 用于检测 Cocos Creator 版本并提供 API 兼容层
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCocosVersion = getCocosVersion;
exports.compareVersions = compareVersions;
exports.isVersionAtLeast = isVersionAtLeast;
exports.safeMessageRequest = safeMessageRequest;
exports.addComponentFallback = addComponentFallback;
exports.removeComponentFallback = removeComponentFallback;
exports.queryNodeFallback = queryNodeFallback;
exports.queryNodeTreeFallback = queryNodeTreeFallback;
exports.createComponentWithFallback = createComponentWithFallback;
exports.removeComponentWithFallback = removeComponentWithFallback;
exports.queryNodeWithFallback = queryNodeWithFallback;
exports.queryNodeTreeWithFallback = queryNodeTreeWithFallback;
exports.isReferenceImageAvailable = isReferenceImageAvailable;
exports.getCompatibilityInfo = getCompatibilityInfo;
exports.setPropertyFallback = setPropertyFallback;
exports.setPropertyWithFallback = setPropertyWithFallback;
// 缓存版本信息
let cachedVersion = null;
/**
 * 获取当前 Cocos Creator 版本
 */
function getCocosVersion() {
    var _a;
    if (cachedVersion)
        return cachedVersion;
    try {
        // Editor.versions.cocos 在 3.8.0+ 都存在
        cachedVersion = ((_a = Editor.versions) === null || _a === void 0 ? void 0 : _a.cocos) || '3.8.0';
    }
    catch (_b) {
        cachedVersion = '3.8.0';
    }
    return cachedVersion;
}
/**
 * 比较版本号
 * @returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 < p2)
            return -1;
        if (p1 > p2)
            return 1;
    }
    return 0;
}
/**
 * 检查当前版本是否满足最低要求
 */
function isVersionAtLeast(minVersion) {
    const current = getCocosVersion();
    return compareVersions(current, minVersion) >= 0;
}
/**
 * 安全调用 Editor.Message.request
 * 如果 API 不存在，返回 null 而不是抛出异常
 */
async function safeMessageRequest(channel, method, ...args) {
    try {
        return await Editor.Message.request(channel, method, ...args);
    }
    catch (err) {
        console.warn(`[MCP Compat] Editor.Message.request('${channel}', '${method}') failed:`, err.message);
        return null;
    }
}
/**
 * 使用 execute-scene-script 作为回退方案添加组件
 */
async function addComponentFallback(nodeUuid, componentType) {
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
async function removeComponentFallback(nodeUuid, componentType) {
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
async function queryNodeFallback(nodeUuid) {
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
async function queryNodeTreeFallback() {
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
async function createComponentWithFallback(nodeUuid, componentType) {
    return await Editor.Message.request('scene', 'create-component', {
        uuid: nodeUuid,
        component: componentType
    });
}
/**
 * 带回退的移除组件
 * 先尝试直接 API，失败后使用 execute-scene-script
 */
async function removeComponentWithFallback(nodeUuid, componentType) {
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
async function queryNodeWithFallback(nodeUuid) {
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
    }
    catch (err) {
        console.warn(`[MCP Compat] scene-script getNodeInfo failed: ${err === null || err === void 0 ? void 0 : err.message}`);
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
async function queryNodeTreeWithFallback() {
    try {
        const result = await Editor.Message.request('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'getAllNodes',
            args: []
        });
        if (result && result.success && result.data) {
            return result.data;
        }
    }
    catch (err) {
        console.warn(`[MCP Compat] scene-script getAllNodes failed: ${err === null || err === void 0 ? void 0 : err.message}`);
    }
    // 兜底:官方 query-node-tree
    const tree = await safeMessageRequest('scene', 'query-node-tree');
    return tree || null;
}
/** 把 query-node 的 dump 格式归一化为与场景脚本 getNodeInfo 一致的形态 */
function normalizeQueryNodeDump(dump) {
    var _a;
    if (!dump)
        return null;
    const val = (v, fallback) => (v && typeof v === 'object' && 'value' in v) ? v.value : (v !== undefined ? v : fallback);
    const comps = (dump.__comps__ || []).map((comp, index) => {
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
        parent: val(((_a = dump.parent) === null || _a === void 0 ? void 0 : _a.uuid) || dump.parent),
        children: dump.children || [],
        components: comps
    };
}
/**
 * 检查 reference-image 通道是否可用
 */
async function isReferenceImageAvailable() {
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
function getCompatibilityInfo() {
    const version = getCocosVersion();
    const isLegacy = compareVersions(version, '3.8.6') < 0;
    const limitations = [];
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
async function setPropertyFallback(uuid, path, dump) {
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
async function setPropertyWithFallback(uuid, path, dump) {
    // 直接调用,不吞错误——失败让调用方感知并报告
    return await Editor.Message.request('scene', 'set-property', {
        uuid,
        path,
        dump
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGF0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3V0aWxzL2NvbXBhdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOztBQVFILDBDQVVDO0FBTUQsMENBV0M7QUFLRCw0Q0FHQztBQU1ELGdEQVdDO0FBS0Qsb0RBVUM7QUFLRCwwREFVQztBQUtELDhDQU9DO0FBS0Qsc0RBT0M7QUFTRCxrRUFRQztBQU1ELGtFQWlCQztBQVFELHNEQXdCQztBQU1ELDhEQWdCQztBQTJCRCw4REFPQztBQUtELG9EQWlCQztBQUtELGtEQVlDO0FBUUQsMERBV0M7QUExU0QsU0FBUztBQUNULElBQUksYUFBYSxHQUFrQixJQUFJLENBQUM7QUFFeEM7O0dBRUc7QUFDSCxTQUFnQixlQUFlOztJQUMzQixJQUFJLGFBQWE7UUFBRSxPQUFPLGFBQWEsQ0FBQztJQUV4QyxJQUFJLENBQUM7UUFDRCxxQ0FBcUM7UUFDckMsYUFBYSxHQUFHLENBQUEsTUFBQyxNQUFjLENBQUMsUUFBUSwwQ0FBRSxLQUFLLEtBQUksT0FBTyxDQUFDO0lBQy9ELENBQUM7SUFBQyxXQUFNLENBQUM7UUFDTCxhQUFhLEdBQUcsT0FBTyxDQUFDO0lBQzVCLENBQUM7SUFDRCxPQUFPLGFBQWMsQ0FBQztBQUMxQixDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsU0FBZ0IsZUFBZSxDQUFDLEVBQVUsRUFBRSxFQUFVO0lBQ2xELE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3pDLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBRXpDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUs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QUFDUCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiDniYjmnKzlhbzlrrnlt6XlhbfmqKHlnZdcbiAqIOeUqOS6juajgOa1iyBDb2NvcyBDcmVhdG9yIOeJiOacrOW5tuaPkOS+myBBUEkg5YW85a655bGCXG4gKi9cblxuLy8g57yT5a2Y54mI5pys5L+h5oGvXG5sZXQgY2FjaGVkVmVyc2lvbjogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG5cbi8qKlxuICog6I635Y+W5b2T5YmNIENvY29zIENyZWF0b3Ig54mI5pysXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb2Nvc1ZlcnNpb24oKTogc3RyaW5nIHtcbiAgICBpZiAoY2FjaGVkVmVyc2lvbikgcmV0dXJuIGNhY2hlZFZlcnNpb247XG5cbiAgICB0cnkge1xuICAgICAgICAvLyBFZGl0b3IudmVyc2lvbnMuY29jb3Mg5ZyoIDMuOC4wKyDpg73lrZjlnKhcbiAgICAgICAgY2FjaGVkVmVyc2lvbiA9IChFZGl0b3IgYXMgYW55KS52ZXJzaW9ucz8uY29jb3MgfHwgJzMuOC4wJztcbiAgICB9IGNhdGNoIHtcbiAgICAgICAgY2FjaGVkVmVyc2lvbiA9ICczLjguMCc7XG4gICAgfVxuICAgIHJldHVybiBjYWNoZWRWZXJzaW9uITtcbn1cblxuLyoqXG4gKiDmr5TovoPniYjmnKzlj7dcbiAqIEByZXR1cm5zIC0xIGlmIHYxIDwgdjIsIDAgaWYgZXF1YWwsIDEgaWYgdjEgPiB2MlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcGFyZVZlcnNpb25zKHYxOiBzdHJpbmcsIHYyOiBzdHJpbmcpOiBudW1iZXIge1xuICAgIGNvbnN0IHBhcnRzMSA9IHYxLnNwbGl0KCcuJykubWFwKE51bWJlcik7XG4gICAgY29uc3QgcGFydHMyID0gdjIuc3BsaXQoJy4nKS5tYXAoTnVtYmVyKTtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgTWF0aC5tYXgocGFydHMxLmxlbmd0aCwgcGFydHMyLmxlbmd0aCk7IGkrKykge1xuICAgICAgICBjb25zdCBwMSA9IHBhcnRzMVtpXSB8fCAwO1xuICAgICAgICBjb25zdCBwMiA9IHBhcnRzMltpXSB8fCAwO1xuICAgICAgICBpZiAocDEgPCBwMikgcmV0dXJuIC0xO1xuICAgICAgICBpZiAocDEgPiBwMikgcmV0dXJuIDE7XG4gICAgfVxuICAgIHJldHVybiAwO1xufVxuXG4vKipcbiAqIOajgOafpeW9k+WJjeeJiOacrOaYr+WQpua7oei2s+acgOS9juimgeaxglxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNWZXJzaW9uQXRMZWFzdChtaW5WZXJzaW9uOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCBjdXJyZW50ID0gZ2V0Q29jb3NWZXJzaW9uKCk7XG4gICAgcmV0dXJuIGNvbXBhcmVWZXJzaW9ucyhjdXJyZW50LCBtaW5WZXJzaW9uKSA+PSAwO1xufVxuXG4vKipcbiAqIOWuieWFqOiwg+eUqCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0XG4gKiDlpoLmnpwgQVBJIOS4jeWtmOWcqO+8jOi/lOWbniBudWxsIOiAjOS4jeaYr+aKm+WHuuW8guW4uFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2FmZU1lc3NhZ2VSZXF1ZXN0KFxuICAgIGNoYW5uZWw6IHN0cmluZyxcbiAgICBtZXRob2Q6IHN0cmluZyxcbiAgICAuLi5hcmdzOiBhbnlbXVxuKTogUHJvbWlzZTxhbnk+IHtcbiAgICB0cnkge1xuICAgICAgICByZXR1cm4gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChjaGFubmVsLCBtZXRob2QsIC4uLmFyZ3MpO1xuICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgIGNvbnNvbGUud2FybihgW01DUCBDb21wYXRdIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJyR7Y2hhbm5lbH0nLCAnJHttZXRob2R9JykgZmFpbGVkOmAsIGVyci5tZXNzYWdlKTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufVxuXG4vKipcbiAqIOS9v+eUqCBleGVjdXRlLXNjZW5lLXNjcmlwdCDkvZzkuLrlm57pgIDmlrnmoYjmt7vliqDnu4Tku7ZcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFkZENvbXBvbmVudEZhbGxiYWNrKFxuICAgIG5vZGVVdWlkOiBzdHJpbmcsXG4gICAgY29tcG9uZW50VHlwZTogc3RyaW5nXG4pOiBQcm9taXNlPGFueT4ge1xuICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcbiAgICAgICAgbWV0aG9kOiAnYWRkQ29tcG9uZW50VG9Ob2RlJyxcbiAgICAgICAgYXJnczogW25vZGVVdWlkLCBjb21wb25lbnRUeXBlXVxuICAgIH07XG4gICAgcmV0dXJuIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywgb3B0aW9ucyk7XG59XG5cbi8qKlxuICog5L2/55SoIGV4ZWN1dGUtc2NlbmUtc2NyaXB0IOS9nOS4uuWbnumAgOaWueahiOenu+mZpOe7hOS7tlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVtb3ZlQ29tcG9uZW50RmFsbGJhY2soXG4gICAgbm9kZVV1aWQ6IHN0cmluZyxcbiAgICBjb21wb25lbnRUeXBlOiBzdHJpbmdcbik6IFByb21pc2U8YW55PiB7XG4gICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgICAgbmFtZTogJ2NvY29zLW1jcC1zZXJ2ZXInLFxuICAgICAgICBtZXRob2Q6ICdyZW1vdmVDb21wb25lbnRGcm9tTm9kZScsXG4gICAgICAgIGFyZ3M6IFtub2RlVXVpZCwgY29tcG9uZW50VHlwZV1cbiAgICB9O1xuICAgIHJldHVybiBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIOS9v+eUqCBleGVjdXRlLXNjZW5lLXNjcmlwdCDkvZzkuLrlm57pgIDmlrnmoYjmn6Xor6LoioLngrnkv6Hmga9cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHF1ZXJ5Tm9kZUZhbGxiYWNrKG5vZGVVdWlkOiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xuICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcbiAgICAgICAgbWV0aG9kOiAnZ2V0Tm9kZUluZm8nLFxuICAgICAgICBhcmdzOiBbbm9kZVV1aWRdXG4gICAgfTtcbiAgICByZXR1cm4gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCBvcHRpb25zKTtcbn1cblxuLyoqXG4gKiDkvb/nlKggZXhlY3V0ZS1zY2VuZS1zY3JpcHQg5L2c5Li65Zue6YCA5pa55qGI5p+l6K+i5Zy65pmv6IqC54K55qCRXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBxdWVyeU5vZGVUcmVlRmFsbGJhY2soKTogUHJvbWlzZTxhbnk+IHtcbiAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICBuYW1lOiAnY29jb3MtbWNwLXNlcnZlcicsXG4gICAgICAgIG1ldGhvZDogJ2dldEFsbE5vZGVzJyxcbiAgICAgICAgYXJnczogW11cbiAgICB9O1xuICAgIHJldHVybiBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIOa3u+WKoOe7hOS7tijml6Dov5DooYzml7blm57pgIAp44CCXG4gKiDlj6rnlKjlrpjmlrkgY3JlYXRlLWNvbXBvbmVudCDmtojmga/igJTigJTlroPotbDnvJbovpHlmajnrqHnur8s57uE5Lu25oyB5LmF5YyW5Yiw5Zy65pmv5qCR44CCXG4gKiDml6fniYjlm57pgIDliLDlnLrmma/ohJrmnKwgbm9kZS5hZGRDb21wb25lbnQg6LWw6L+Q6KGM5pe2LOS4jeaMgeS5heWMlixxdWVyeS1ub2RlIOmqjOivgeeci+S4jeWIsCxcbiAqIOmAoOaIkFwi5re75Yqg5aSx6LSl5L2G55yL5Ly85oiQ5YqfXCLnmoTmt7fkubHjgILnjrDmlLnkuLo6Y3JlYXRlLWNvbXBvbmVudCDlpLHotKXnm7TmjqXmipvnnJ/lrp7plJnor6/jgIJcbiAqIOazqDpjcmVhdGUtY29tcG9uZW50IOWcqCAzLjguMSDljbPlj6/nlKgo5bey56Gu6K6kIGFwcC5hc2FyIOazqOWGjCks5pen5rOo6YeKXCIzLjguNitcIuacieivr+OAglxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlQ29tcG9uZW50V2l0aEZhbGxiYWNrKFxuICAgIG5vZGVVdWlkOiBzdHJpbmcsXG4gICAgY29tcG9uZW50VHlwZTogc3RyaW5nXG4pOiBQcm9taXNlPGFueT4ge1xuICAgIHJldHVybiBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdjcmVhdGUtY29tcG9uZW50Jywge1xuICAgICAgICB1dWlkOiBub2RlVXVpZCxcbiAgICAgICAgY29tcG9uZW50OiBjb21wb25lbnRUeXBlXG4gICAgfSk7XG59XG5cbi8qKlxuICog5bim5Zue6YCA55qE56e76Zmk57uE5Lu2XG4gKiDlhYjlsJ3or5Xnm7TmjqUgQVBJ77yM5aSx6LSl5ZCO5L2/55SoIGV4ZWN1dGUtc2NlbmUtc2NyaXB0XG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW1vdmVDb21wb25lbnRXaXRoRmFsbGJhY2soXG4gICAgbm9kZVV1aWQ6IHN0cmluZyxcbiAgICBjb21wb25lbnRUeXBlOiBzdHJpbmdcbik6IFByb21pc2U8YW55PiB7XG4gICAgLy8g5YWI5bCd6K+V55u05o6lIEFQSe+8iDMuOC42K++8iVxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNhZmVNZXNzYWdlUmVxdWVzdCgnc2NlbmUnLCAncmVtb3ZlLWNvbXBvbmVudCcsIHtcbiAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgIGNvbXBvbmVudDogY29tcG9uZW50VHlwZVxuICAgIH0pO1xuXG4gICAgaWYgKHJlc3VsdCAhPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8vIOWbnumAgOWIsCBleGVjdXRlLXNjZW5lLXNjcmlwdFxuICAgIGNvbnNvbGUubG9nKGBbTUNQIENvbXBhdF0gcmVtb3ZlLWNvbXBvbmVudCBBUEkgbm90IGF2YWlsYWJsZSwgZmFsbGluZyBiYWNrIHRvIGV4ZWN1dGUtc2NlbmUtc2NyaXB0YCk7XG4gICAgcmV0dXJuIGF3YWl0IHJlbW92ZUNvbXBvbmVudEZhbGxiYWNrKG5vZGVVdWlkLCBjb21wb25lbnRUeXBlKTtcbn1cblxuLyoqXG4gKiDmn6Xor6LljZXkuKroioLngrnkv6Hmga8o5b2S5LiA5YyWKeOAglxuICog5Lul5Zy65pmv6ISa5pysIGdldE5vZGVJbmZvIOS4uuS4u+i3r+W+hOKAlOKAlOW3suivgeWunuWPr+mdoDrnu4Tku7bnsbvlnovlkI3mraPnoa7jgIHog73mib7liLDlrZnoioLngrnjgIFcbiAqIOaWsOW7uuiKgueCueeri+WNs+WPr+ingeOAgnF1ZXJ5LW5vZGUg5raI5oGv55qEIGR1bXAg5qC85byPIGZyYWdpbGUoX190eXBlX18g5a2X5q615bi457y65aSx5a+86Ie0IFwiVW5rbm93blwiKSxcbiAqIOS7heS9nOWFnOW6leOAguS4pOadoei3r+W+hOe7k+aenOe7n+S4gOS4uiB7dXVpZCxuYW1lLGFjdGl2ZSxwb3NpdGlvbixyb3RhdGlvbixzY2FsZSxwYXJlbnQsY2hpbGRyZW4sY29tcG9uZW50czpbe2NpZCxuYW1lLGluZGV4LGVuYWJsZWR9XX3jgIJcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHF1ZXJ5Tm9kZVdpdGhGYWxsYmFjayhub2RlVXVpZDogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcbiAgICAvLyDkuLvot6/lvoQ65Zy65pmv6ISa5pysKOW9kuS4gOWMlui+k+WHuilcbiAgICB0cnkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIHtcbiAgICAgICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcbiAgICAgICAgICAgIG1ldGhvZDogJ2dldE5vZGVJbmZvJyxcbiAgICAgICAgICAgIGFyZ3M6IFtub2RlVXVpZF1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChyZXN1bHQgJiYgcmVzdWx0LnN1Y2Nlc3MgJiYgcmVzdWx0LmRhdGEpIHtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQuZGF0YTtcbiAgICAgICAgfVxuICAgICAgICAvLyDlnLrmma/ohJrmnKzmmI7noa7ov5Tlm57lpLHotKUo6IqC54K55LiN5a2Y5Zyo562JKeKAlOKAlOebtOaOpemAj+S8oCzkuI3lho3lsJ3or5Xmm7TohIblvLHnmoQgcXVlcnktbm9kZVxuICAgICAgICBpZiAocmVzdWx0ICYmIHJlc3VsdC5zdWNjZXNzID09PSBmYWxzZSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICBjb25zb2xlLndhcm4oYFtNQ1AgQ29tcGF0XSBzY2VuZS1zY3JpcHQgZ2V0Tm9kZUluZm8gZmFpbGVkOiAke2Vycj8ubWVzc2FnZX1gKTtcbiAgICB9XG4gICAgLy8g5YWc5bqVOnF1ZXJ5LW5vZGUg5raI5oGvKOW9kuS4gOWMliBxdWVyeS1ub2RlIGR1bXApXG4gICAgY29uc3QgZHVtcCA9IGF3YWl0IHNhZmVNZXNzYWdlUmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIG5vZGVVdWlkKTtcbiAgICBpZiAoZHVtcCkge1xuICAgICAgICByZXR1cm4gbm9ybWFsaXplUXVlcnlOb2RlRHVtcChkdW1wKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICog5p+l6K+i6IqC54K55qCRKOW9kuS4gOWMlinjgILkvJjlhYjlnLrmma/ohJrmnKwgZ2V0QWxsTm9kZXMo5b2S5LiA5YyW5qCRLOWQqyBjb21wb25lbnRzIGNpZCksXG4gKiDlhZzlupXlrpjmlrkgcXVlcnktbm9kZS10cmVl44CCXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBxdWVyeU5vZGVUcmVlV2l0aEZhbGxiYWNrKCk6IFByb21pc2U8YW55PiB7XG4gICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7XG4gICAgICAgICAgICBuYW1lOiAnY29jb3MtbWNwLXNlcnZlcicsXG4gICAgICAgICAgICBtZXRob2Q6ICdnZXRBbGxOb2RlcycsXG4gICAgICAgICAgICBhcmdzOiBbXVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHJlc3VsdCAmJiByZXN1bHQuc3VjY2VzcyAmJiByZXN1bHQuZGF0YSkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdC5kYXRhO1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBbTUNQIENvbXBhdF0gc2NlbmUtc2NyaXB0IGdldEFsbE5vZGVzIGZhaWxlZDogJHtlcnI/Lm1lc3NhZ2V9YCk7XG4gICAgfVxuICAgIC8vIOWFnOW6lTrlrpjmlrkgcXVlcnktbm9kZS10cmVlXG4gICAgY29uc3QgdHJlZSA9IGF3YWl0IHNhZmVNZXNzYWdlUmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZS10cmVlJyk7XG4gICAgcmV0dXJuIHRyZWUgfHwgbnVsbDtcbn1cblxuLyoqIOaKiiBxdWVyeS1ub2RlIOeahCBkdW1wIOagvOW8j+W9kuS4gOWMluS4uuS4juWcuuaZr+iEmuacrCBnZXROb2RlSW5mbyDkuIDoh7TnmoTlvaLmgIEgKi9cbmZ1bmN0aW9uIG5vcm1hbGl6ZVF1ZXJ5Tm9kZUR1bXAoZHVtcDogYW55KTogYW55IHtcbiAgICBpZiAoIWR1bXApIHJldHVybiBudWxsO1xuICAgIGNvbnN0IHZhbCA9ICh2OiBhbnksIGZhbGxiYWNrPzogYW55KSA9PiAodiAmJiB0eXBlb2YgdiA9PT0gJ29iamVjdCcgJiYgJ3ZhbHVlJyBpbiB2KSA/IHYudmFsdWUgOiAodiAhPT0gdW5kZWZpbmVkID8gdiA6IGZhbGxiYWNrKTtcbiAgICBjb25zdCBjb21wcyA9IChkdW1wLl9fY29tcHNfXyB8fCBbXSkubWFwKChjb21wOiBhbnksIGluZGV4OiBudW1iZXIpID0+IHtcbiAgICAgICAgY29uc3QgY2lkID0gY29tcC5fX3R5cGVfXyB8fCBjb21wLmNpZCB8fCBjb21wLnR5cGUgfHwgJ1Vua25vd24nO1xuICAgICAgICByZXR1cm4geyBjaWQsIG5hbWU6IGNpZC5yZXBsYWNlKC9eY2NcXC4vLCAnJyksIGluZGV4LCBlbmFibGVkOiBjb21wLmVuYWJsZWQgIT09IHVuZGVmaW5lZCA/IGNvbXAuZW5hYmxlZCA6IHRydWUgfTtcbiAgICB9KTtcbiAgICByZXR1cm4ge1xuICAgICAgICB1dWlkOiB2YWwoZHVtcC51dWlkKSxcbiAgICAgICAgbmFtZTogdmFsKGR1bXAubmFtZSwgJ1Vua25vd24nKSxcbiAgICAgICAgYWN0aXZlOiB2YWwoZHVtcC5hY3RpdmUsIHRydWUpLFxuICAgICAgICBsYXllcjogdmFsKGR1bXAubGF5ZXIpLFxuICAgICAgICBwb3NpdGlvbjogdmFsKGR1bXAucG9zaXRpb24sIHsgeDogMCwgeTogMCwgejogMCB9KSxcbiAgICAgICAgcm90YXRpb246IHZhbChkdW1wLnJvdGF0aW9uLCB7IHg6IDAsIHk6IDAsIHo6IDAsIHc6IDEgfSksXG4gICAgICAgIHNjYWxlOiB2YWwoZHVtcC5zY2FsZSwgeyB4OiAxLCB5OiAxLCB6OiAxIH0pLFxuICAgICAgICBwYXJlbnQ6IHZhbChkdW1wLnBhcmVudD8udXVpZCB8fCBkdW1wLnBhcmVudCksXG4gICAgICAgIGNoaWxkcmVuOiBkdW1wLmNoaWxkcmVuIHx8IFtdLFxuICAgICAgICBjb21wb25lbnRzOiBjb21wc1xuICAgIH07XG59XG5cbi8qKlxuICog5qOA5p+lIHJlZmVyZW5jZS1pbWFnZSDpgJrpgZPmmK/lkKblj6/nlKhcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGlzUmVmZXJlbmNlSW1hZ2VBdmFpbGFibGUoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgaWYgKCFpc1ZlcnNpb25BdExlYXN0KCczLjguMicpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8g5bCd6K+V6LCD55So5LiA5Liq6L276YeP57qn5pa55rOV5p2l5qOA5rWLXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2FmZU1lc3NhZ2VSZXF1ZXN0KCdyZWZlcmVuY2UtaW1hZ2UnLCAncXVlcnktY29uZmlnJyk7XG4gICAgcmV0dXJuIHJlc3VsdCAhPT0gbnVsbDtcbn1cblxuLyoqXG4gKiDojrflj5bniYjmnKzlhbzlrrnmgKfkv6Hmga9cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvbXBhdGliaWxpdHlJbmZvKCk6IHtcbiAgICB2ZXJzaW9uOiBzdHJpbmc7XG4gICAgaXNMZWdhY3k6IGJvb2xlYW47XG4gICAgbGltaXRhdGlvbnM6IHN0cmluZ1tdO1xufSB7XG4gICAgY29uc3QgdmVyc2lvbiA9IGdldENvY29zVmVyc2lvbigpO1xuICAgIGNvbnN0IGlzTGVnYWN5ID0gY29tcGFyZVZlcnNpb25zKHZlcnNpb24sICczLjguNicpIDwgMDtcblxuICAgIGNvbnN0IGxpbWl0YXRpb25zOiBzdHJpbmdbXSA9IFtdO1xuICAgIGlmIChjb21wYXJlVmVyc2lvbnModmVyc2lvbiwgJzMuOC4yJykgPCAwKSB7XG4gICAgICAgIGxpbWl0YXRpb25zLnB1c2goJ+WPguiAg+WbvuWKn+iDvSAocmVmZXJlbmNlLWltYWdlKSDkuI3lj6/nlKgnKTtcbiAgICB9XG4gICAgaWYgKGlzTGVnYWN5KSB7XG4gICAgICAgIGxpbWl0YXRpb25zLnB1c2goJ+mDqOWIhumrmOe6p+WcuuaZr+aTjeS9nOWPr+iDveWPl+mZkCcpO1xuICAgIH1cblxuICAgIHJldHVybiB7IHZlcnNpb24sIGlzTGVnYWN5LCBsaW1pdGF0aW9ucyB9O1xufVxuXG4vKipcbiAqIOS9v+eUqCBleGVjdXRlLXNjZW5lLXNjcmlwdCDkvZzkuLrlm57pgIDmlrnmoYjorr7nva7lsZ7mgKdcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNldFByb3BlcnR5RmFsbGJhY2soXG4gICAgdXVpZDogc3RyaW5nLFxuICAgIHBhdGg6IHN0cmluZyxcbiAgICBkdW1wOiBhbnlcbik6IFByb21pc2U8YW55PiB7XG4gICAgLy8g5L2/55SoIGV4ZWN1dGUtc2NlbmUtc2NyaXB0IOmAmui/h+WcuuaZr+iEmuacrOiuvue9ruWxnuaAp1xuICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcbiAgICAgICAgbWV0aG9kOiAnc2V0Tm9kZVByb3BlcnR5JyxcbiAgICAgICAgYXJnczogW3V1aWQsIHBhdGgsIGR1bXAudmFsdWUsIGR1bXAudHlwZV1cbiAgICB9O1xuICAgIHJldHVybiBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIOiuvue9ruWxnuaApyjml6Dov5DooYzml7blm57pgIAp44CCXG4gKiDlj6rnlKjlrpjmlrkgc2V0LXByb3BlcnR5IOa2iOaBr+KAlOKAlOWug+i1sOe8lui+keWZqOW6j+WIl+WMlueuoee6vyzmlLnliqjmjIHkuYXljJYgKyDop6blj5EgSW5zcGVjdG9yL+aSpOmUgOOAglxuICog5pen54mI5Zue6YCA5Yiw5Zy65pmv6ISa5pysIHNldE5vZGVQcm9wZXJ0eSDnmoQgYG5vZGVbcGF0aF09dmFsdWVgIOWvuSBgX19jb21wc19fLk4ucHJvcGAg54K56Lev5b6E5pivXG4gKiDml6DmlYjotYvlgLzkuJTpnZnpu5jmiJDlip8s6YCg5oiQ5YGH6Ziz5oCn44CC546w5pS55Li6OnNldC1wcm9wZXJ0eSDlpLHotKXnm7TmjqXmipvnnJ/lrp7plJnor68s55Sx6LCD55So5pa56aqM6K+B6K+75Zue44CCXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZXRQcm9wZXJ0eVdpdGhGYWxsYmFjayhcbiAgICB1dWlkOiBzdHJpbmcsXG4gICAgcGF0aDogc3RyaW5nLFxuICAgIGR1bXA6IGFueVxuKTogUHJvbWlzZTxhbnk+IHtcbiAgICAvLyDnm7TmjqXosIPnlKgs5LiN5ZCe6ZSZ6K+v4oCU4oCU5aSx6LSl6K6p6LCD55So5pa55oSf55+l5bm25oql5ZGKXG4gICAgcmV0dXJuIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgdXVpZCxcbiAgICAgICAgcGF0aCxcbiAgICAgICAgZHVtcFxuICAgIH0pO1xufVxuIl19