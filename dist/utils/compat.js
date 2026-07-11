"use strict";
/**
 * 版本兼容工具模块
 * 用于检测 Cocos Creator 版本并提供 API 兼容层
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setPropertyWithFallback = exports.setPropertyFallback = exports.getCompatibilityInfo = exports.isReferenceImageAvailable = exports.queryNodeTreeWithFallback = exports.queryNodeWithFallback = exports.removeComponentWithFallback = exports.createComponentWithFallback = exports.queryNodeTreeFallback = exports.queryNodeFallback = exports.removeComponentFallback = exports.addComponentFallback = exports.safeMessageRequest = exports.isVersionAtLeast = exports.compareVersions = exports.getCocosVersion = void 0;
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
exports.getCocosVersion = getCocosVersion;
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
exports.compareVersions = compareVersions;
/**
 * 检查当前版本是否满足最低要求
 */
function isVersionAtLeast(minVersion) {
    const current = getCocosVersion();
    return compareVersions(current, minVersion) >= 0;
}
exports.isVersionAtLeast = isVersionAtLeast;
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
exports.safeMessageRequest = safeMessageRequest;
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
exports.addComponentFallback = addComponentFallback;
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
exports.removeComponentFallback = removeComponentFallback;
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
exports.queryNodeFallback = queryNodeFallback;
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
exports.queryNodeTreeFallback = queryNodeTreeFallback;
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
exports.createComponentWithFallback = createComponentWithFallback;
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
exports.removeComponentWithFallback = removeComponentWithFallback;
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
exports.queryNodeWithFallback = queryNodeWithFallback;
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
exports.queryNodeTreeWithFallback = queryNodeTreeWithFallback;
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
exports.isReferenceImageAvailable = isReferenceImageAvailable;
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
exports.getCompatibilityInfo = getCompatibilityInfo;
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
exports.setPropertyFallback = setPropertyFallback;
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
exports.setPropertyWithFallback = setPropertyWithFallback;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGF0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3V0aWxzL2NvbXBhdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7QUFFSCxTQUFTO0FBQ1QsSUFBSSxhQUFhLEdBQWtCLElBQUksQ0FBQztBQUV4Qzs7R0FFRztBQUNILFNBQWdCLGVBQWU7O0lBQzNCLElBQUksYUFBYTtRQUFFLE9BQU8sYUFBYSxDQUFDO0lBRXhDLElBQUksQ0FBQztRQUNELHFDQUFxQztRQUNyQyxhQUFhLEdBQUcsQ0FBQSxNQUFDLE1BQWMsQ0FBQyxRQUFRLDBDQUFFLEtBQUssS0FBSSxPQUFPLENBQUM7SUFDL0QsQ0FBQztJQUFDLFdBQU0sQ0FBQztRQUNMLGFBQWEsR0FBRyxPQUFPLENBQUM7SUFDNUIsQ0FBQztJQUNELE9BQU8sYUFBYyxDQUFDO0FBQzFCLENBQUM7QUFWRCwwQ0FVQztBQUVEOzs7R0FHRztBQUNILFNBQWdCLGVBQWUsQ0FBQyxFQUFVLEVBQUUsRUFBVTtJQUNsRCxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN6QyxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUV6QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQzlELE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDMUIsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxQixJQUFJLEVB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QztBQVhELDBEQVdDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIOeJiOacrOWFvOWuueW3peWFt+aooeWdl1xyXG4gKiDnlKjkuo7mo4DmtYsgQ29jb3MgQ3JlYXRvciDniYjmnKzlubbmj5DkvpsgQVBJIOWFvOWuueWxglxyXG4gKi9cclxuXHJcbi8vIOe8k+WtmOeJiOacrOS/oeaBr1xyXG5sZXQgY2FjaGVkVmVyc2lvbjogc3RyaW5nIHwgbnVsbCA9IG51bGw7XHJcblxyXG4vKipcclxuICog6I635Y+W5b2T5YmNIENvY29zIENyZWF0b3Ig54mI5pysXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29jb3NWZXJzaW9uKCk6IHN0cmluZyB7XHJcbiAgICBpZiAoY2FjaGVkVmVyc2lvbikgcmV0dXJuIGNhY2hlZFZlcnNpb247XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgICAvLyBFZGl0b3IudmVyc2lvbnMuY29jb3Mg5ZyoIDMuOC4wKyDpg73lrZjlnKhcclxuICAgICAgICBjYWNoZWRWZXJzaW9uID0gKEVkaXRvciBhcyBhbnkpLnZlcnNpb25zPy5jb2NvcyB8fCAnMy44LjAnO1xyXG4gICAgfSBjYXRjaCB7XHJcbiAgICAgICAgY2FjaGVkVmVyc2lvbiA9ICczLjguMCc7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gY2FjaGVkVmVyc2lvbiE7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiDmr5TovoPniYjmnKzlj7dcclxuICogQHJldHVybnMgLTEgaWYgdjEgPCB2MiwgMCBpZiBlcXVhbCwgMSBpZiB2MSA+IHYyXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY29tcGFyZVZlcnNpb25zKHYxOiBzdHJpbmcsIHYyOiBzdHJpbmcpOiBudW1iZXIge1xyXG4gICAgY29uc3QgcGFydHMxID0gdjEuc3BsaXQoJy4nKS5tYXAoTnVtYmVyKTtcclxuICAgIGNvbnN0IHBhcnRzMiA9IHYyLnNwbGl0KCcuJykubWFwKE51bWJlcik7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBNYXRoLm1heChwYXJ0czEubGVuZ3RoLCBwYXJ0czIubGVuZ3RoKTsgaSsrKSB7XHJcbiAgICAgICAgY29uc3QgcDEgPSBwYXJ0czFbaV0gfHwgMDtcclxuICAgICAgICBjb25zdCBwMiA9IHBhcnRzMltpXSB8fCAwO1xyXG4gICAgICAgIGlmIChwMSA8IHAyKSByZXR1cm4gLTE7XHJcbiAgICAgICAgaWYgKHAxID4gcDIpIHJldHVybiAxO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIDA7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiDmo4Dmn6XlvZPliY3niYjmnKzmmK/lkKbmu6HotrPmnIDkvY7opoHmsYJcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBpc1ZlcnNpb25BdExlYXN0KG1pblZlcnNpb246IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgY29uc3QgY3VycmVudCA9IGdldENvY29zVmVyc2lvbigpO1xyXG4gICAgcmV0dXJuIGNvbXBhcmVWZXJzaW9ucyhjdXJyZW50LCBtaW5WZXJzaW9uKSA+PSAwO1xyXG59XHJcblxyXG4vKipcclxuICog5a6J5YWo6LCD55SoIEVkaXRvci5NZXNzYWdlLnJlcXVlc3RcclxuICog5aaC5p6cIEFQSSDkuI3lrZjlnKjvvIzov5Tlm54gbnVsbCDogIzkuI3mmK/mipvlh7rlvILluLhcclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzYWZlTWVzc2FnZVJlcXVlc3QoXHJcbiAgICBjaGFubmVsOiBzdHJpbmcsXHJcbiAgICBtZXRob2Q6IHN0cmluZyxcclxuICAgIC4uLmFyZ3M6IGFueVtdXHJcbik6IFByb21pc2U8YW55PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHJldHVybiBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KGNoYW5uZWwsIG1ldGhvZCwgLi4uYXJncyk7XHJcbiAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgIGNvbnNvbGUud2FybihgW01DUCBDb21wYXRdIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJyR7Y2hhbm5lbH0nLCAnJHttZXRob2R9JykgZmFpbGVkOmAsIGVyci5tZXNzYWdlKTtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIOS9v+eUqCBleGVjdXRlLXNjZW5lLXNjcmlwdCDkvZzkuLrlm57pgIDmlrnmoYjmt7vliqDnu4Tku7ZcclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhZGRDb21wb25lbnRGYWxsYmFjayhcclxuICAgIG5vZGVVdWlkOiBzdHJpbmcsXHJcbiAgICBjb21wb25lbnRUeXBlOiBzdHJpbmdcclxuKTogUHJvbWlzZTxhbnk+IHtcclxuICAgIGNvbnN0IG9wdGlvbnMgPSB7XHJcbiAgICAgICAgbmFtZTogJ2NvY29zLW1jcC1zZXJ2ZXInLFxyXG4gICAgICAgIG1ldGhvZDogJ2FkZENvbXBvbmVudFRvTm9kZScsXHJcbiAgICAgICAgYXJnczogW25vZGVVdWlkLCBjb21wb25lbnRUeXBlXVxyXG4gICAgfTtcclxuICAgIHJldHVybiBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIG9wdGlvbnMpO1xyXG59XHJcblxyXG4vKipcclxuICog5L2/55SoIGV4ZWN1dGUtc2NlbmUtc2NyaXB0IOS9nOS4uuWbnumAgOaWueahiOenu+mZpOe7hOS7tlxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlbW92ZUNvbXBvbmVudEZhbGxiYWNrKFxyXG4gICAgbm9kZVV1aWQ6IHN0cmluZyxcclxuICAgIGNvbXBvbmVudFR5cGU6IHN0cmluZ1xyXG4pOiBQcm9taXNlPGFueT4ge1xyXG4gICAgY29uc3Qgb3B0aW9ucyA9IHtcclxuICAgICAgICBuYW1lOiAnY29jb3MtbWNwLXNlcnZlcicsXHJcbiAgICAgICAgbWV0aG9kOiAncmVtb3ZlQ29tcG9uZW50RnJvbU5vZGUnLFxyXG4gICAgICAgIGFyZ3M6IFtub2RlVXVpZCwgY29tcG9uZW50VHlwZV1cclxuICAgIH07XHJcbiAgICByZXR1cm4gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCBvcHRpb25zKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIOS9v+eUqCBleGVjdXRlLXNjZW5lLXNjcmlwdCDkvZzkuLrlm57pgIDmlrnmoYjmn6Xor6LoioLngrnkv6Hmga9cclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBxdWVyeU5vZGVGYWxsYmFjayhub2RlVXVpZDogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcclxuICAgIGNvbnN0IG9wdGlvbnMgPSB7XHJcbiAgICAgICAgbmFtZTogJ2NvY29zLW1jcC1zZXJ2ZXInLFxyXG4gICAgICAgIG1ldGhvZDogJ2dldE5vZGVJbmZvJyxcclxuICAgICAgICBhcmdzOiBbbm9kZVV1aWRdXHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywgb3B0aW9ucyk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiDkvb/nlKggZXhlY3V0ZS1zY2VuZS1zY3JpcHQg5L2c5Li65Zue6YCA5pa55qGI5p+l6K+i5Zy65pmv6IqC54K55qCRXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcXVlcnlOb2RlVHJlZUZhbGxiYWNrKCk6IFByb21pc2U8YW55PiB7XHJcbiAgICBjb25zdCBvcHRpb25zID0ge1xyXG4gICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcclxuICAgICAgICBtZXRob2Q6ICdnZXRBbGxOb2RlcycsXHJcbiAgICAgICAgYXJnczogW11cclxuICAgIH07XHJcbiAgICByZXR1cm4gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCBvcHRpb25zKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIOa3u+WKoOe7hOS7tijml6Dov5DooYzml7blm57pgIAp44CCXHJcbiAqIOWPqueUqOWumOaWuSBjcmVhdGUtY29tcG9uZW50IOa2iOaBr+KAlOKAlOWug+i1sOe8lui+keWZqOeuoee6vyznu4Tku7bmjIHkuYXljJbliLDlnLrmma/moJHjgIJcclxuICog5pen54mI5Zue6YCA5Yiw5Zy65pmv6ISa5pysIG5vZGUuYWRkQ29tcG9uZW50IOi1sOi/kOihjOaXtizkuI3mjIHkuYXljJYscXVlcnktbm9kZSDpqozor4HnnIvkuI3liLAsXHJcbiAqIOmAoOaIkFwi5re75Yqg5aSx6LSl5L2G55yL5Ly85oiQ5YqfXCLnmoTmt7fkubHjgILnjrDmlLnkuLo6Y3JlYXRlLWNvbXBvbmVudCDlpLHotKXnm7TmjqXmipvnnJ/lrp7plJnor6/jgIJcclxuICog5rOoOmNyZWF0ZS1jb21wb25lbnQg5ZyoIDMuOC4xIOWNs+WPr+eUqCjlt7Lnoa7orqQgYXBwLmFzYXIg5rOo5YaMKSzml6fms6jph4pcIjMuOC42K1wi5pyJ6K+v44CCXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlQ29tcG9uZW50V2l0aEZhbGxiYWNrKFxyXG4gICAgbm9kZVV1aWQ6IHN0cmluZyxcclxuICAgIGNvbXBvbmVudFR5cGU6IHN0cmluZ1xyXG4pOiBQcm9taXNlPGFueT4ge1xyXG4gICAgcmV0dXJuIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2NyZWF0ZS1jb21wb25lbnQnLCB7XHJcbiAgICAgICAgdXVpZDogbm9kZVV1aWQsXHJcbiAgICAgICAgY29tcG9uZW50OiBjb21wb25lbnRUeXBlXHJcbiAgICB9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIOW4puWbnumAgOeahOenu+mZpOe7hOS7tlxyXG4gKiDlhYjlsJ3or5Xnm7TmjqUgQVBJ77yM5aSx6LSl5ZCO5L2/55SoIGV4ZWN1dGUtc2NlbmUtc2NyaXB0XHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVtb3ZlQ29tcG9uZW50V2l0aEZhbGxiYWNrKFxyXG4gICAgbm9kZVV1aWQ6IHN0cmluZyxcclxuICAgIGNvbXBvbmVudFR5cGU6IHN0cmluZ1xyXG4pOiBQcm9taXNlPGFueT4ge1xyXG4gICAgLy8g5YWI5bCd6K+V55u05o6lIEFQSe+8iDMuOC42K++8iVxyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2FmZU1lc3NhZ2VSZXF1ZXN0KCdzY2VuZScsICdyZW1vdmUtY29tcG9uZW50Jywge1xyXG4gICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxyXG4gICAgICAgIGNvbXBvbmVudDogY29tcG9uZW50VHlwZVxyXG4gICAgfSk7XHJcblxyXG4gICAgaWYgKHJlc3VsdCAhPT0gbnVsbCkge1xyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcblxyXG4gICAgLy8g5Zue6YCA5YiwIGV4ZWN1dGUtc2NlbmUtc2NyaXB0XHJcbiAgICBjb25zb2xlLmxvZyhgW01DUCBDb21wYXRdIHJlbW92ZS1jb21wb25lbnQgQVBJIG5vdCBhdmFpbGFibGUsIGZhbGxpbmcgYmFjayB0byBleGVjdXRlLXNjZW5lLXNjcmlwdGApO1xyXG4gICAgcmV0dXJuIGF3YWl0IHJlbW92ZUNvbXBvbmVudEZhbGxiYWNrKG5vZGVVdWlkLCBjb21wb25lbnRUeXBlKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIOafpeivouWNleS4quiKgueCueS/oeaBryjlvZLkuIDljJYp44CCXHJcbiAqIOS7peWcuuaZr+iEmuacrCBnZXROb2RlSW5mbyDkuLrkuLvot6/lvoTigJTigJTlt7Lor4Hlrp7lj6/pnaA657uE5Lu257G75Z6L5ZCN5q2j56Gu44CB6IO95om+5Yiw5a2Z6IqC54K544CBXHJcbiAqIOaWsOW7uuiKgueCueeri+WNs+WPr+ingeOAgnF1ZXJ5LW5vZGUg5raI5oGv55qEIGR1bXAg5qC85byPIGZyYWdpbGUoX190eXBlX18g5a2X5q615bi457y65aSx5a+86Ie0IFwiVW5rbm93blwiKSxcclxuICog5LuF5L2c5YWc5bqV44CC5Lik5p2h6Lev5b6E57uT5p6c57uf5LiA5Li6IHt1dWlkLG5hbWUsYWN0aXZlLHBvc2l0aW9uLHJvdGF0aW9uLHNjYWxlLHBhcmVudCxjaGlsZHJlbixjb21wb25lbnRzOlt7Y2lkLG5hbWUsaW5kZXgsZW5hYmxlZH1dfeOAglxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHF1ZXJ5Tm9kZVdpdGhGYWxsYmFjayhub2RlVXVpZDogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcclxuICAgIC8vIOS4u+i3r+W+hDrlnLrmma/ohJrmnKwo5b2S5LiA5YyW6L6T5Ye6KVxyXG4gICAgdHJ5IHtcclxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIHtcclxuICAgICAgICAgICAgbmFtZTogJ2NvY29zLW1jcC1zZXJ2ZXInLFxyXG4gICAgICAgICAgICBtZXRob2Q6ICdnZXROb2RlSW5mbycsXHJcbiAgICAgICAgICAgIGFyZ3M6IFtub2RlVXVpZF1cclxuICAgICAgICB9KTtcclxuICAgICAgICBpZiAocmVzdWx0ICYmIHJlc3VsdC5zdWNjZXNzICYmIHJlc3VsdC5kYXRhKSB7XHJcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQuZGF0YTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8g5Zy65pmv6ISa5pys5piO56Gu6L+U5Zue5aSx6LSlKOiKgueCueS4jeWtmOWcqOetiSnigJTigJTnm7TmjqXpgI/kvKAs5LiN5YaN5bCd6K+V5pu06ISG5byx55qEIHF1ZXJ5LW5vZGVcclxuICAgICAgICBpZiAocmVzdWx0ICYmIHJlc3VsdC5zdWNjZXNzID09PSBmYWxzZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcbiAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgIGNvbnNvbGUud2FybihgW01DUCBDb21wYXRdIHNjZW5lLXNjcmlwdCBnZXROb2RlSW5mbyBmYWlsZWQ6ICR7ZXJyPy5tZXNzYWdlfWApO1xyXG4gICAgfVxyXG4gICAgLy8g5YWc5bqVOnF1ZXJ5LW5vZGUg5raI5oGvKOW9kuS4gOWMliBxdWVyeS1ub2RlIGR1bXApXHJcbiAgICBjb25zdCBkdW1wID0gYXdhaXQgc2FmZU1lc3NhZ2VSZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgbm9kZVV1aWQpO1xyXG4gICAgaWYgKGR1bXApIHtcclxuICAgICAgICByZXR1cm4gbm9ybWFsaXplUXVlcnlOb2RlRHVtcChkdW1wKTtcclxuICAgIH1cclxuICAgIHJldHVybiBudWxsO1xyXG59XHJcblxyXG4vKipcclxuICog5p+l6K+i6IqC54K55qCRKOW9kuS4gOWMlinjgILkvJjlhYjlnLrmma/ohJrmnKwgZ2V0QWxsTm9kZXMo5b2S5LiA5YyW5qCRLOWQqyBjb21wb25lbnRzIGNpZCksXHJcbiAqIOWFnOW6leWumOaWuSBxdWVyeS1ub2RlLXRyZWXjgIJcclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBxdWVyeU5vZGVUcmVlV2l0aEZhbGxiYWNrKCk6IFByb21pc2U8YW55PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywge1xyXG4gICAgICAgICAgICBuYW1lOiAnY29jb3MtbWNwLXNlcnZlcicsXHJcbiAgICAgICAgICAgIG1ldGhvZDogJ2dldEFsbE5vZGVzJyxcclxuICAgICAgICAgICAgYXJnczogW11cclxuICAgICAgICB9KTtcclxuICAgICAgICBpZiAocmVzdWx0ICYmIHJlc3VsdC5zdWNjZXNzICYmIHJlc3VsdC5kYXRhKSB7XHJcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQuZGF0YTtcclxuICAgICAgICB9XHJcbiAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgIGNvbnNvbGUud2FybihgW01DUCBDb21wYXRdIHNjZW5lLXNjcmlwdCBnZXRBbGxOb2RlcyBmYWlsZWQ6ICR7ZXJyPy5tZXNzYWdlfWApO1xyXG4gICAgfVxyXG4gICAgLy8g5YWc5bqVOuWumOaWuSBxdWVyeS1ub2RlLXRyZWVcclxuICAgIGNvbnN0IHRyZWUgPSBhd2FpdCBzYWZlTWVzc2FnZVJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUtdHJlZScpO1xyXG4gICAgcmV0dXJuIHRyZWUgfHwgbnVsbDtcclxufVxyXG5cclxuLyoqIOaKiiBxdWVyeS1ub2RlIOeahCBkdW1wIOagvOW8j+W9kuS4gOWMluS4uuS4juWcuuaZr+iEmuacrCBnZXROb2RlSW5mbyDkuIDoh7TnmoTlvaLmgIEgKi9cclxuZnVuY3Rpb24gbm9ybWFsaXplUXVlcnlOb2RlRHVtcChkdW1wOiBhbnkpOiBhbnkge1xyXG4gICAgaWYgKCFkdW1wKSByZXR1cm4gbnVsbDtcclxuICAgIGNvbnN0IHZhbCA9ICh2OiBhbnksIGZhbGxiYWNrPzogYW55KSA9PiAodiAmJiB0eXBlb2YgdiA9PT0gJ29iamVjdCcgJiYgJ3ZhbHVlJyBpbiB2KSA/IHYudmFsdWUgOiAodiAhPT0gdW5kZWZpbmVkID8gdiA6IGZhbGxiYWNrKTtcclxuICAgIGNvbnN0IGNvbXBzID0gKGR1bXAuX19jb21wc19fIHx8IFtdKS5tYXAoKGNvbXA6IGFueSwgaW5kZXg6IG51bWJlcikgPT4ge1xyXG4gICAgICAgIGNvbnN0IGNpZCA9IGNvbXAuX190eXBlX18gfHwgY29tcC5jaWQgfHwgY29tcC50eXBlIHx8ICdVbmtub3duJztcclxuICAgICAgICByZXR1cm4geyBjaWQsIG5hbWU6IGNpZC5yZXBsYWNlKC9eY2NcXC4vLCAnJyksIGluZGV4LCBlbmFibGVkOiBjb21wLmVuYWJsZWQgIT09IHVuZGVmaW5lZCA/IGNvbXAuZW5hYmxlZCA6IHRydWUgfTtcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICB1dWlkOiB2YWwoZHVtcC51dWlkKSxcclxuICAgICAgICBuYW1lOiB2YWwoZHVtcC5uYW1lLCAnVW5rbm93bicpLFxyXG4gICAgICAgIGFjdGl2ZTogdmFsKGR1bXAuYWN0aXZlLCB0cnVlKSxcclxuICAgICAgICBsYXllcjogdmFsKGR1bXAubGF5ZXIpLFxyXG4gICAgICAgIHBvc2l0aW9uOiB2YWwoZHVtcC5wb3NpdGlvbiwgeyB4OiAwLCB5OiAwLCB6OiAwIH0pLFxyXG4gICAgICAgIHJvdGF0aW9uOiB2YWwoZHVtcC5yb3RhdGlvbiwgeyB4OiAwLCB5OiAwLCB6OiAwLCB3OiAxIH0pLFxyXG4gICAgICAgIHNjYWxlOiB2YWwoZHVtcC5zY2FsZSwgeyB4OiAxLCB5OiAxLCB6OiAxIH0pLFxyXG4gICAgICAgIHBhcmVudDogdmFsKGR1bXAucGFyZW50Py51dWlkIHx8IGR1bXAucGFyZW50KSxcclxuICAgICAgICBjaGlsZHJlbjogZHVtcC5jaGlsZHJlbiB8fCBbXSxcclxuICAgICAgICBjb21wb25lbnRzOiBjb21wc1xyXG4gICAgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIOajgOafpSByZWZlcmVuY2UtaW1hZ2Ug6YCa6YGT5piv5ZCm5Y+v55SoXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaXNSZWZlcmVuY2VJbWFnZUF2YWlsYWJsZSgpOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuICAgIGlmICghaXNWZXJzaW9uQXRMZWFzdCgnMy44LjInKSkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIC8vIOWwneivleiwg+eUqOS4gOS4qui9u+mHj+e6p+aWueazleadpeajgOa1i1xyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2FmZU1lc3NhZ2VSZXF1ZXN0KCdyZWZlcmVuY2UtaW1hZ2UnLCAncXVlcnktY29uZmlnJyk7XHJcbiAgICByZXR1cm4gcmVzdWx0ICE9PSBudWxsO1xyXG59XHJcblxyXG4vKipcclxuICog6I635Y+W54mI5pys5YW85a655oCn5L+h5oGvXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29tcGF0aWJpbGl0eUluZm8oKToge1xyXG4gICAgdmVyc2lvbjogc3RyaW5nO1xyXG4gICAgaXNMZWdhY3k6IGJvb2xlYW47XHJcbiAgICBsaW1pdGF0aW9uczogc3RyaW5nW107XHJcbn0ge1xyXG4gICAgY29uc3QgdmVyc2lvbiA9IGdldENvY29zVmVyc2lvbigpO1xyXG4gICAgY29uc3QgaXNMZWdhY3kgPSBjb21wYXJlVmVyc2lvbnModmVyc2lvbiwgJzMuOC42JykgPCAwO1xyXG5cclxuICAgIGNvbnN0IGxpbWl0YXRpb25zOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgaWYgKGNvbXBhcmVWZXJzaW9ucyh2ZXJzaW9uLCAnMy44LjInKSA8IDApIHtcclxuICAgICAgICBsaW1pdGF0aW9ucy5wdXNoKCflj4LogIPlm77lip/og70gKHJlZmVyZW5jZS1pbWFnZSkg5LiN5Y+v55SoJyk7XHJcbiAgICB9XHJcbiAgICBpZiAoaXNMZWdhY3kpIHtcclxuICAgICAgICBsaW1pdGF0aW9ucy5wdXNoKCfpg6jliIbpq5jnuqflnLrmma/mk43kvZzlj6/og73lj5fpmZAnKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4geyB2ZXJzaW9uLCBpc0xlZ2FjeSwgbGltaXRhdGlvbnMgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIOS9v+eUqCBleGVjdXRlLXNjZW5lLXNjcmlwdCDkvZzkuLrlm57pgIDmlrnmoYjorr7nva7lsZ7mgKdcclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZXRQcm9wZXJ0eUZhbGxiYWNrKFxyXG4gICAgdXVpZDogc3RyaW5nLFxyXG4gICAgcGF0aDogc3RyaW5nLFxyXG4gICAgZHVtcDogYW55XHJcbik6IFByb21pc2U8YW55PiB7XHJcbiAgICAvLyDkvb/nlKggZXhlY3V0ZS1zY2VuZS1zY3JpcHQg6YCa6L+H5Zy65pmv6ISa5pys6K6+572u5bGe5oCnXHJcbiAgICBjb25zdCBvcHRpb25zID0ge1xyXG4gICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcclxuICAgICAgICBtZXRob2Q6ICdzZXROb2RlUHJvcGVydHknLFxyXG4gICAgICAgIGFyZ3M6IFt1dWlkLCBwYXRoLCBkdW1wLnZhbHVlLCBkdW1wLnR5cGVdXHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywgb3B0aW9ucyk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiDorr7nva7lsZ7mgKco5peg6L+Q6KGM5pe25Zue6YCAKeOAglxyXG4gKiDlj6rnlKjlrpjmlrkgc2V0LXByb3BlcnR5IOa2iOaBr+KAlOKAlOWug+i1sOe8lui+keWZqOW6j+WIl+WMlueuoee6vyzmlLnliqjmjIHkuYXljJYgKyDop6blj5EgSW5zcGVjdG9yL+aSpOmUgOOAglxyXG4gKiDml6fniYjlm57pgIDliLDlnLrmma/ohJrmnKwgc2V0Tm9kZVByb3BlcnR5IOeahCBgbm9kZVtwYXRoXT12YWx1ZWAg5a+5IGBfX2NvbXBzX18uTi5wcm9wYCDngrnot6/lvoTmmK9cclxuICog5peg5pWI6LWL5YC85LiU6Z2Z6buY5oiQ5YqfLOmAoOaIkOWBh+mYs+aAp+OAgueOsOaUueS4ujpzZXQtcHJvcGVydHkg5aSx6LSl55u05o6l5oqb55yf5a6e6ZSZ6K+vLOeUseiwg+eUqOaWuemqjOivgeivu+WbnuOAglxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNldFByb3BlcnR5V2l0aEZhbGxiYWNrKFxyXG4gICAgdXVpZDogc3RyaW5nLFxyXG4gICAgcGF0aDogc3RyaW5nLFxyXG4gICAgZHVtcDogYW55XHJcbik6IFByb21pc2U8YW55PiB7XHJcbiAgICAvLyDnm7TmjqXosIPnlKgs5LiN5ZCe6ZSZ6K+v4oCU4oCU5aSx6LSl6K6p6LCD55So5pa55oSf55+l5bm25oql5ZGKXHJcbiAgICByZXR1cm4gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xyXG4gICAgICAgIHV1aWQsXHJcbiAgICAgICAgcGF0aCxcclxuICAgICAgICBkdW1wXHJcbiAgICB9KTtcclxufVxyXG4iXX0=