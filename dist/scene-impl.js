"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = void 0;
/**
 * 场景脚本实现层(由 scene.ts 代理加载,支持热重载)。
 *
 * 此文件改动后,tsc 编译 + cp 到 dist/,下一次 method 调用即生效(无需重启编辑器)。
 */
const path_1 = require("path");
module.paths.push((0, path_1.join)(Editor.App.path, 'node_modules'));
// ============ 共享辅助函数 ============
/** 深度递归查找节点(原 scene.getChildByUuid 仅搜直接子节点,孙节点永远找不到) */
function findNodeByUuidDeep(root, nodeUuid) {
    if (!root || !nodeUuid)
        return null;
    if (root.uuid === nodeUuid)
        return root;
    const children = root.children || [];
    for (const child of children) {
        const found = findNodeByUuidDeep(child, nodeUuid);
        if (found)
            return found;
    }
    return null;
}
/** 把运行时节点归一化为稳定结构,供 wrapper 与验证统一消费 */
function buildNodeInfo(node, js) {
    const comps = (node.components || []).map((comp, index) => {
        const ctor = comp.constructor;
        let cid;
        try {
            cid = js.getClassId(ctor);
        }
        catch (_a) {
            cid = ctor.name;
        }
        let compUuid = null;
        try {
            compUuid = comp.uuid || null;
        }
        catch ( /* ignore */_b) { /* ignore */ }
        return {
            cid: cid || ctor.name,
            name: ctor.name,
            index,
            uuid: compUuid,
            enabled: comp.enabled
        };
    });
    const wp = node.worldPosition ? { x: node.worldPosition.x, y: node.worldPosition.y, z: node.worldPosition.z } : null;
    return {
        uuid: node.uuid,
        name: node.name,
        active: node.active,
        layer: node.layer,
        position: { x: node.position.x, y: node.position.y, z: node.position.z },
        rotation: { x: node.rotation.x, y: node.rotation.y, z: node.rotation.z, w: node.rotation.w },
        scale: { x: node.scale.x, y: node.scale.y, z: node.scale.z },
        worldPosition: wp,
        parent: node.parent ? node.parent.uuid : null,
        children: (node.children || []).map((child) => child.uuid),
        components: comps
    };
}
/** 按组件类型查找节点上的组件实例(支持 FQN 'cc.Sprite' 与短名 'Sprite') */
function findComponentOnNode(node, componentType, js) {
    const normalize = (s) => (s || '').toLowerCase().replace(/^cc\./, '');
    const target = normalize(componentType);
    const comps = node.components || [];
    for (const comp of comps) {
        let cid = '';
        try {
            cid = js.getClassId(comp.constructor) || '';
        }
        catch ( /* ignore */_a) { /* ignore */ }
        if (normalize(cid) === target || normalize(comp.constructor.name) === target) {
            return comp;
        }
    }
    return null;
}
/** 提取组件实例的可枚举属性值,跳过引擎内部 `_` 前缀字段 */
function extractComponentProps(comp) {
    const result = {};
    let proto = comp;
    const seen = new Set();
    while (proto && proto !== Object.prototype) {
        const names = Object.getOwnPropertyNames(proto);
        for (const key of names) {
            if (seen.has(key))
                continue;
            seen.add(key);
            if (key.startsWith('_'))
                continue;
            if (key === 'node' || key === 'enabled' || key === 'enabledInHierarchy')
                continue;
            let val;
            try {
                val = comp[key];
            }
            catch (_a) {
                continue;
            }
            if (typeof val === 'function')
                continue;
            result[key] = normalizeValue(val);
        }
        proto = Object.getPrototypeOf(proto);
    }
    return result;
}
/** 把运行时值归一化为可 JSON 化的简单结构 */
function normalizeValue(val) {
    if (val === null || val === undefined)
        return val;
    if (typeof val !== 'object')
        return val;
    // 1. 资产引用优先(SpriteFrame/Texture/Material/AudioClip 等都有 uuid,
    //    且 SpriteFrame 还暴露 width/height getter,会被下面的 Size 分支误吞)
    if (val._uuid || (val.uuid && typeof val.uuid === 'string')) {
        return { uuid: val._uuid || val.uuid, type: val.constructor ? val.constructor.name : 'Asset' };
    }
    const has = (...ks) => ks.every(k => k in val);
    try {
        // 2. Color (rgba)
        if (has('r', 'g', 'b')) {
            const a = (val.a !== undefined) ? val.a : 255;
            return { r: val.r, g: val.g, b: val.b, a };
        }
        // 3. Size 必须在 Vec2 之前:Cocos Size 有 x/y 别名(Size.x=width),
        //    若先查 x/y 会把 Size 误判为 Vec2(contentSize 验证假阴性根因)
        if (has('width', 'height'))
            return { width: val.width, height: val.height };
        // 4. Vec
        if (has('x', 'y', 'z', 'w'))
            return { x: val.x, y: val.y, z: val.z, w: val.w };
        if (has('x', 'y', 'z'))
            return { x: val.x, y: val.y, z: val.z };
        if (has('x', 'y'))
            return { x: val.x, y: val.y };
    }
    catch ( /* fallthrough */_a) { /* fallthrough */ }
    if (Array.isArray(val)) {
        return val.slice(0, 64).map(normalizeValue);
    }
    const out = {};
    const seen = new Set();
    let proto = val;
    let count = 0;
    while (proto && proto !== Object.prototype && count < 32) {
        for (const k of Object.getOwnPropertyNames(proto)) {
            if (seen.has(k) || k.startsWith('_'))
                continue;
            seen.add(k);
            if (['node', 'enabled', 'enabledInHierarchy', 'constructor'].includes(k))
                continue;
            let v;
            try {
                v = val[k];
            }
            catch (_b) {
                continue;
            }
            if (typeof v === 'function')
                continue;
            out[k] = (v !== null && typeof v === 'object') ? '[object]' : v;
            count++;
            if (count >= 32)
                break;
        }
        proto = Object.getPrototypeOf(proto);
    }
    return out;
}
exports.methods = {
    /**
     * 诊断:async 方法是否被 execute-scene-script 支持(也用于验证代理热重载链路)
     */
    async testAsyncMethod(delayMs) {
        try {
            await new Promise(r => setTimeout(r, delayMs || 100));
            return { success: true, data: { msg: 'async method executed v2', delay: delayMs || 100 } };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    },
    createNewScene() {
        try {
            const { director, Scene } = require('cc');
            const scene = new Scene();
            scene.name = 'New Scene';
            director.runScene(scene);
            return { success: true, message: 'New scene created successfully' };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    addComponentToNode(nodeUuid, componentType) {
        try {
            const { director, js } = require('cc');
            const scene = director.getScene();
            if (!scene)
                return { success: false, error: 'No active scene' };
            const node = findNodeByUuidDeep(scene, nodeUuid);
            if (!node)
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            const ComponentClass = js.getClassByName(componentType);
            if (!ComponentClass)
                return { success: false, error: `Component type ${componentType} not found` };
            const component = node.addComponent(ComponentClass);
            return { success: true, message: `Component ${componentType} added`, data: { componentId: component.uuid } };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    removeComponentFromNode(nodeUuid, componentType) {
        try {
            const { director, js } = require('cc');
            const scene = director.getScene();
            if (!scene)
                return { success: false, error: 'No active scene' };
            const node = findNodeByUuidDeep(scene, nodeUuid);
            if (!node)
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            const ComponentClass = js.getClassByName(componentType);
            if (!ComponentClass)
                return { success: false, error: `Component type ${componentType} not found` };
            const component = node.getComponent(ComponentClass);
            if (!component)
                return { success: false, error: `Component ${componentType} not found on node` };
            node.removeComponent(component);
            return { success: true, message: `Component ${componentType} removed` };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    createNode(name, parentUuid) {
        try {
            const { director, Node } = require('cc');
            const scene = director.getScene();
            if (!scene)
                return { success: false, error: 'No active scene' };
            const node = new Node(name);
            if (parentUuid) {
                const parent = findNodeByUuidDeep(scene, parentUuid);
                if (parent)
                    parent.addChild(node);
                else
                    scene.addChild(node);
            }
            else {
                scene.addChild(node);
            }
            return { success: true, message: `Node ${name} created`, data: { uuid: node.uuid, name: node.name } };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * 获取节点信息(归一化)。components 含 cid(FQN)+ name(短名)+ index。
     */
    getNodeInfo(nodeUuid) {
        try {
            const { director, js } = require('cc');
            const scene = director.getScene();
            if (!scene)
                return { success: false, error: 'No active scene' };
            const node = findNodeByUuidDeep(scene, nodeUuid);
            if (!node)
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            return { success: true, data: buildNodeInfo(node, js) };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * 获取单个组件详情:所有可枚举实例属性的值,用于 set-property 写后真实验证读回。
     */
    getComponentDetail(nodeUuid, componentType) {
        try {
            const { director, js } = require('cc');
            const scene = director.getScene();
            if (!scene)
                return { success: false, error: 'No active scene' };
            const node = findNodeByUuidDeep(scene, nodeUuid);
            if (!node)
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            const comp = findComponentOnNode(node, componentType, js);
            if (!comp)
                return { success: false, error: `Component ${componentType} not found on node ${node.name}` };
            const props = extractComponentProps(comp);
            return {
                success: true,
                data: { cid: js.getClassId(comp.constructor), name: comp.constructor.name, enabled: comp.enabled, properties: props }
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * 获取节点树(归一化嵌套,含 components cid)。
     */
    getAllNodes() {
        try {
            const { director, js } = require('cc');
            const scene = director.getScene();
            if (!scene)
                return { success: false, error: 'No active scene' };
            const buildTree = (node) => {
                const comps = (node.components || []).map((comp) => {
                    let cid = '';
                    try {
                        cid = js.getClassId(comp.constructor) || '';
                    }
                    catch ( /* ignore */_a) { /* ignore */ }
                    return cid || comp.constructor.name;
                });
                return {
                    name: node.name,
                    uuid: node.uuid,
                    active: node.active,
                    parent: node.parent ? node.parent.uuid : null,
                    components: comps,
                    children: (node.children || []).map((child) => buildTree(child))
                };
            };
            return { success: true, data: buildTree(scene) };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    findNodeByName(name) {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene)
                return { success: false, error: 'No active scene' };
            const node = scene.getChildByName(name);
            if (!node)
                return { success: false, error: `Node with name ${name} not found` };
            return { success: true, data: { uuid: node.uuid, name: node.name, active: node.active, position: node.position } };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    getCurrentSceneInfo() {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene)
                return { success: false, error: 'No active scene' };
            return { success: true, data: { name: scene.name, uuid: scene.uuid, nodeCount: scene.children.length } };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    setNodeProperty(nodeUuid, property, value) {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene)
                return { success: false, error: 'No active scene' };
            const node = findNodeByUuidDeep(scene, nodeUuid);
            if (!node)
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            if (property === 'position')
                node.setPosition(value.x || 0, value.y || 0, value.z || 0);
            else if (property === 'rotation')
                node.setRotationFromEuler(value.x || 0, value.y || 0, value.z || 0);
            else if (property === 'scale')
                node.setScale(value.x || 1, value.y || 1, value.z || 1);
            else if (property === 'active')
                node.active = value;
            else if (property === 'name')
                node.name = value;
            else
                node[property] = value;
            return { success: true, message: `Property '${property}' updated` };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    getSceneHierarchy(includeComponents = false) {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene)
                return { success: false, error: 'No active scene' };
            const processNode = (node) => {
                const result = { name: node.name, uuid: node.uuid, active: node.active, children: [] };
                if (includeComponents) {
                    result.components = node.components.map((comp) => ({ type: comp.constructor.name, enabled: comp.enabled }));
                }
                if (node.children && node.children.length > 0) {
                    result.children = node.children.map((child) => processNode(child));
                }
                return result;
            };
            return { success: true, data: scene.children.map((child) => processNode(child)) };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    createPrefabFromNode(nodeUuid, prefabPath) {
        // 真正的 prefab 创建用 prefab_create_prefab 工具(prefab-tools),这里仅保留接口兼容
        return { success: false, error: '使用 prefab_create_prefab 工具替代场景脚本 createPrefabFromNode' };
    },
    setComponentProperty(nodeUuid, componentType, property, value) {
        try {
            const { director, js } = require('cc');
            const scene = director.getScene();
            if (!scene)
                return { success: false, error: 'No active scene' };
            const node = findNodeByUuidDeep(scene, nodeUuid);
            if (!node)
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            const ComponentClass = js.getClassByName(componentType);
            if (!ComponentClass)
                return { success: false, error: `Component type ${componentType} not found` };
            const component = node.getComponent(ComponentClass);
            if (!component)
                return { success: false, error: `Component ${componentType} not found on node` };
            // 资产类属性(spriteFrame/material)按 uuid 加载
            if (typeof value === 'string' && (property === 'spriteFrame' || property === 'material')) {
                const assetManager = require('cc').assetManager;
                const AssetType = property === 'spriteFrame' ? require('cc').SpriteFrame : require('cc').Material;
                assetManager.loadAny({ uuid: value, type: AssetType }, (err, asset) => {
                    if (!err && asset)
                        component[property] = asset;
                });
            }
            else {
                component[property] = value;
            }
            return { success: true, message: `Component property '${property}' updated` };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * 在场景进程上下文求值 JS(调试用)。可访问 require('cc')、scene、node 等。
     * 表达式可为: 字符串表达式 / 多语句代码块 / async 函数体(自动 await Promise)。
     * 安全提示: 无沙箱,等同 DevTools console, 仅调试用。
     */
    async eval(script) {
        try {
            if (!script || typeof script !== 'string') {
                return { success: false, error: 'script 必须是非空字符串' };
            }
            // 用 new Function 包装, 自动 await Promise 返回值
            const fn = new Function('return (async () => { return (' + script + '); })();');
            const result = await fn();
            // 结果归一化为可序列化(JSON); 无法序列化的转描述
            let safe;
            try {
                JSON.stringify(result);
                safe = result;
            }
            catch (_a) {
                safe = { __nonSerializable: true, description: String(result), type: typeof result };
            }
            return { success: true, data: { result: safe } };
        }
        catch (error) {
            return { success: false, error: error.message, stack: error.stack };
        }
    },
    /**
     * 创建序列帧动画。
     * - 主路径:加载 SpriteFrame → AnimationClip.createWithSpriteFrames → EditorExtends.serialize
     * - 兜底路径(uuid-only):若 SpriteFrame 加载失败,直接按 uuid 手建 .anim JSON
     *   (运行时/preview 会按 uuid 解析,无需编辑器态加载实际资产)
     * - create-asset 的 content 必须 JSON.stringify 成字符串(修复旧版传 object 导致空错误)
     * - 全程记录 stages,失败时返回部分进度便于定位
     */
    async createSpriteFrameAnimation(nodeUuid, spriteFrameUuids, sampleRate, clipName, savePath, loop) {
        const stages = [];
        const push = (name, ok, extra) => stages.push(Object.assign({ name, ok }, (extra || {})));
        try {
            const cc = require('cc');
            const { director, js, assetManager, AnimationClip, SpriteFrame } = cc;
            const scene = director.getScene();
            if (!scene)
                return { success: false, error: 'No active scene', stages };
            const node = findNodeByUuidDeep(scene, nodeUuid);
            if (!node)
                return { success: false, error: `Node ${nodeUuid} not found`, stages };
            if (!spriteFrameUuids || !spriteFrameUuids.length)
                return { success: false, error: 'spriteFrameUuids is empty', stages };
            sampleRate = sampleRate || 10;
            clipName = clipName || 'SpriteAnim';
            savePath = savePath || `db://assets/${clipName}.anim`;
            loop = loop !== false;
            push('validate', true);
            // ── 1. 加载 SpriteFrame(可选;失败走 uuid-only 兜底) ──
            let frames = [];
            let framesLoaded = false;
            try {
                frames = await new Promise((resolve, reject) => {
                    const opts = SpriteFrame ? { type: SpriteFrame } : {};
                    assetManager.loadAny(spriteFrameUuids, opts, (err, assets) => {
                        if (err)
                            reject(new Error(`loadAny 失败: ${err.message || err}`));
                        else
                            resolve(Array.isArray(assets) ? assets : [assets]);
                    });
                });
                // 按传入顺序对齐
                const map = new Map();
                for (const f of frames)
                    map.set(f._uuid || f.uuid, f);
                const ordered = spriteFrameUuids.map(u => map.get(u)).filter(Boolean);
                framesLoaded = ordered.length === spriteFrameUuids.length;
                if (framesLoaded)
                    frames = ordered;
                push('loadFrames', framesLoaded, { loaded: ordered.length, expected: spriteFrameUuids.length });
            }
            catch (e) {
                push('loadFrames', false, { error: e.message });
            }
            // ── 2. 生成 .anim JSON ──
            let animJson;
            if (framesLoaded && AnimationClip && AnimationClip.createWithSpriteFrames) {
                try {
                    const clip = AnimationClip.createWithSpriteFrames(frames, sampleRate);
                    clip.name = clipName;
                    clip.wrapMode = loop ? 2 : 1; // 2=Loop, 1=Normal
                    const serialized = serializeClipViaEditorExtends(clip);
                    if (serialized) {
                        animJson = serialized;
                        push('buildClip(serialize)', true);
                    }
                    else {
                        animJson = buildUuidOnlyAnimJson(clipName, spriteFrameUuids, sampleRate, loop);
                        push('buildClip(uuid-only)', !!animJson, { reason: 'serialize 返回空,降级 uuid-only' });
                    }
                }
                catch (e) {
                    animJson = buildUuidOnlyAnimJson(clipName, spriteFrameUuids, sampleRate, loop);
                    push('buildClip(uuid-only)', !!animJson, { reason: `serialize 抛错: ${e.message}`, stack: e.stack });
                }
            }
            else {
                animJson = buildUuidOnlyAnimJson(clipName, spriteFrameUuids, sampleRate, loop);
                push('buildClip(uuid-only)', !!animJson, { reason: framesLoaded ? 'createWithSpriteFrames 不可用' : 'frames 未加载' });
            }
            if (!animJson)
                return { success: false, error: 'clip JSON 构建失败', stages };
            // ── 3. 写 .anim 资产(content 必须 string) ──
            let clipUuid = '';
            try {
                await Editor.Message.request('asset-db', 'delete-asset', savePath).catch(() => { });
                const contentStr = typeof animJson === 'string' ? animJson : JSON.stringify(animJson);
                const createRes = await Editor.Message.request('asset-db', 'create-asset', savePath, contentStr);
                clipUuid = createRes === null || createRes === void 0 ? void 0 : createRes.uuid;
                push('createAsset', !!clipUuid, { uuid: clipUuid, createResType: typeof createRes });
                if (!clipUuid) {
                    return { success: false, error: `create-asset 未返回 uuid: ${JSON.stringify(createRes)}`, stages };
                }
            }
            catch (e) {
                push('createAsset', false, { error: e.message, stack: e.stack });
                return { success: false, error: `create-asset 失败: ${e.message}`, stages };
            }
            // ── 4. 持久化挂载 cc.Animation + defaultClip ──
            let attached = false;
            try {
                const nodeData = buildNodeInfo(node, js);
                const hasAnim = nodeData.components.some((c) => c.cid === 'cc.Animation');
                if (!hasAnim) {
                    await Editor.Message.request('scene', 'create-component', { uuid: nodeUuid, component: 'cc.Animation' });
                    await new Promise(r => setTimeout(r, 250));
                }
                const refreshed = buildNodeInfo(node, js);
                const idx = refreshed.components.findIndex((c) => c.cid === 'cc.Animation');
                if (idx >= 0) {
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: `__comps__.${idx}.defaultClip`,
                        dump: { value: { uuid: clipUuid }, type: 'cc.AnimationClip' }
                    }).catch(() => { });
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: `__comps__.${idx}.playOnLoad`,
                        dump: { value: true }
                    }).catch(() => { });
                    attached = true;
                }
                push('attachAnim', attached, { compIdx: idx });
            }
            catch (e) {
                push('attachAnim', false, { error: e.message });
            }
            return {
                success: true,
                data: {
                    clipUuid,
                    savePath,
                    clipName,
                    frameCount: spriteFrameUuids.length,
                    sampleRate,
                    loop,
                    framesLoaded,
                    attached,
                    stages
                }
            };
        }
        catch (err) {
            return {
                success: false,
                error: (err && (err.message || String(err))) || 'unknown error in createSpriteFrameAnimation',
                stack: err === null || err === void 0 ? void 0 : err.stack,
                stages
            };
        }
    }
};
/** 用 EditorExtends.serialize 序列化 clip,返回解析后的对象。失败返回 null。 */
function serializeClipViaEditorExtends(clip) {
    var _a;
    try {
        const EExt = globalThis.EditorExtends || ((_a = globalThis.Editor) === null || _a === void 0 ? void 0 : _a.Extends);
        const ser = EExt === null || EExt === void 0 ? void 0 : EExt.serialize;
        if (!ser)
            return null;
        let str;
        if (typeof ser.serializeAsset === 'function')
            str = ser.serializeAsset(clip);
        else if (typeof ser.serialize === 'function')
            str = ser.serialize(clip, { asset: true });
        else if (typeof ser === 'function')
            str = ser(clip, { asset: true });
        if (typeof str === 'string' && str.length)
            return JSON.parse(str);
    }
    catch (e) {
        throw new Error(`serialize 失败: ${e.message}`);
    }
    return null;
}
/**
 * 按 uuid 手建 .anim JSON(uuid-only 兜底路径)。
 * 生成 Cocos 3.8 序列化格式:array-of-object,通过 __id__ 互相引用。
 * track = cc.animation.ObjectTrack,curve = cc.ObjectCurve,keys/values 存 [time, {uuid}]。
 *
 * 注意:此格式参照引擎 cocos/core/animation/tracks/object-track.ts +
 * cocos/core/curves/object-curve.ts 的可序列化字段,并对照项目内既有 .anim 引用结构。
 */
function buildUuidOnlyAnimJson(clipName, spriteFrameUuids, sampleRate, loop) {
    const step = 1 / sampleRate;
    const duration = spriteFrameUuids.length / sampleRate;
    const times = spriteFrameUuids.map((_, i) => +(step * i).toFixed(6));
    const values = spriteFrameUuids.map(u => ({ uuid: u }));
    // array-of-object 引用结构(索引即 __id__)
    const arr = [
        {
            __type__: 'cc.AnimationClip',
            _name: clipName,
            _objFlags: 0,
            __editorExtras__: { embeddedPlayerGroups: [] },
            _native: '',
            sample: sampleRate,
            speed: 1,
            wrapMode: loop ? 2 : 1,
            enableTrsBlending: false,
            _duration: duration,
            _hash: 0,
            _tracks: [{ __id__: 1 }],
            _exoticAnimation: null,
            _events: [],
            _embeddedPlayers: [],
            _additiveSettings: { __id__: 5 },
            _auxiliaryCurveEntries: []
        },
        {
            __type__: 'cc.animation.ObjectTrack',
            _data: null,
            _path: { __id__: 2 },
            _channels: [{ __id__: 3 }],
            _nGroups: 0,
            _opt: 0
        },
        {
            __type__: 'cc.animation.TrackPath',
            _paths: [
                { __id__: 4 }, // ComponentPath
                'spriteFrame' // property
            ]
        },
        {
            __type__: 'cc.animation.Channel',
            _curve: { __id__: 6 },
            _proxy: null
        },
        {
            __type__: 'cc.animation.ComponentPath',
            component: 'cc.Sprite'
        },
        {
            __type__: 'cc.AnimationClipAdditiveSettings',
            additiveFlags: 0,
            referenceClip: null
        },
        {
            __type__: 'cc.ObjectCurve',
            _times: times,
            _values: values,
            _indexedValues: null,
            _preExtrapolation: 1,
            _postExtrapolation: 1
        }
    ];
    return arr;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUtaW1wbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9zY2VuZS1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBOzs7O0dBSUc7QUFDSCwrQkFBNEI7QUFDNUIsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBQSxXQUFJLEVBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztBQUV6RCxtQ0FBbUM7QUFFbkMsd0RBQXdEO0FBQ3hELFNBQVMsa0JBQWtCLENBQUMsSUFBUyxFQUFFLFFBQWdCO0lBQ25ELElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRO1FBQUUsT0FBTyxJQUFJLENBQUM7SUFDcEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFFBQVE7UUFBRSxPQUFPLElBQUksQ0FBQztJQUN4QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBQztJQUNyQyxLQUFLLE1BQU0sS0FBSyxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQzNCLE1BQU0sS0FBSyxHQUFHLGtCQUFrQixDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNsRCxJQUFJLEtBQUs7WUFBRSxPQUFPLEtBQUssQ0FBQztJQUM1QixDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDaEIsQ0FBQztBQUVELHVDQUF1QztBQUN2QyxTQUFTLGFBQWEsQ0FBQyxJQUFTLEVBQUUsRUFBTztJQUNyQyxNQUFNLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBUyxFQUFFLEtBQWEsRUFBRSxFQUFFO1FBQ25FLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7UUFDOUIsSUFBSSxHQUFXLENBQUM7UUFDaEIsSUFBSSxDQUFDO1lBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxV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QUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDckIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFDOUMsT0FBTyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1FBQy9DLENBQUM7UUFDRCx5REFBeUQ7UUFDekQsbURBQW1EO1FBQ25ELElBQUksR0FBRyxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUM7WUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUM1RSxTQUFTO1FBQ1QsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDO1lBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDL0UsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUM7WUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNoRSxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO1lBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFF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RUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUcsZ0JBQWdCO2dCQUNoQyxhQUFhLENBQUksV0FBVzthQUMvQjtTQUNKO1FBQ0Q7WUFDSSxRQUFRLEVBQUUsc0JBQXNCO1lBQ2hDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7WUFDckIsTUFBTSxFQUFFLElBQUk7U0FDZjtRQUNEO1lBQ0ksUUFBUSxFQUFFLDRCQUE0QjtZQUN0QyxTQUFTLEVBQUUsV0FBVztTQUN6QjtRQUNEO1lBQ0ksUUFBUSxFQUFFLGtDQUFrQztZQUM1QyxhQUFhLEVBQUUsQ0FBQztZQUNoQixhQUFhLEVBQUUsSUFBSTtTQUN0QjtRQUNEO1lBQ0ksUUFBUSxFQUFFLGdCQUFnQjtZQUMxQixNQUFNLEVBQUUsS0FBSztZQUNiLE9BQU8sRUFBRSxNQUFNO1lBQ2YsY0FBYyxFQUFFLElBQUk7WUFDcEIsaUJBQWlCLEVBQUUsQ0FBQztZQUNwQixrQkFBa0IsRUFBRSxDQUFDO1NBQ3hCO0tBQ0osQ0FBQztJQUNGLE9BQU8sR0FBRyxDQUFDO0FBQ2YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICog5Zy65pmv6ISa5pys5a6e546w5bGCKOeUsSBzY2VuZS50cyDku6PnkIbliqDovb0s5pSv5oyB54Ot6YeN6L29KeOAglxuICpcbiAqIOatpOaWh+S7tuaUueWKqOWQjix0c2Mg57yW6K+RICsgY3Ag5YiwIGRpc3QvLOS4i+S4gOasoSBtZXRob2Qg6LCD55So5Y2z55Sf5pWIKOaXoOmcgOmHjeWQr+e8lui+keWZqCnjgIJcbiAqL1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xubW9kdWxlLnBhdGhzLnB1c2goam9pbihFZGl0b3IuQXBwLnBhdGgsICdub2RlX21vZHVsZXMnKSk7XG5cbi8vID09PT09PT09PT09PSDlhbHkuqvovoXliqnlh73mlbAgPT09PT09PT09PT09XG5cbi8qKiDmt7HluqbpgJLlvZLmn6Xmib7oioLngrko5Y6fIHNjZW5lLmdldENoaWxkQnlVdWlkIOS7heaQnOebtOaOpeWtkOiKgueCuSzlrZnoioLngrnmsLjov5zmib7kuI3liLApICovXG5mdW5jdGlvbiBmaW5kTm9kZUJ5VXVpZERlZXAocm9vdDogYW55LCBub2RlVXVpZDogc3RyaW5nKTogYW55IHtcbiAgICBpZiAoIXJvb3QgfHwgIW5vZGVVdWlkKSByZXR1cm4gbnVsbDtcbiAgICBpZiAocm9vdC51dWlkID09PSBub2RlVXVpZCkgcmV0dXJuIHJvb3Q7XG4gICAgY29uc3QgY2hpbGRyZW4gPSByb290LmNoaWxkcmVuIHx8IFtdO1xuICAgIGZvciAoY29uc3QgY2hpbGQgb2YgY2hpbGRyZW4pIHtcbiAgICAgICAgY29uc3QgZm91bmQgPSBmaW5kTm9kZUJ5VXVpZERlZXAoY2hpbGQsIG5vZGVVdWlkKTtcbiAgICAgICAgaWYgKGZvdW5kKSByZXR1cm4gZm91bmQ7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuXG4vKiog5oqK6L+Q6KGM5pe26IqC54K55b2S5LiA5YyW5Li656iz5a6a57uT5p6ELOS+myB3cmFwcGVyIOS4jumqjOivgee7n+S4gOa2iOi0uSAqL1xuZnVuY3Rpb24gYnVpbGROb2RlSW5mbyhub2RlOiBhbnksIGpzOiBhbnkpOiBhbnkge1xuICAgIGNvbnN0IGNvbXBzID0gKG5vZGUuY29tcG9uZW50cyB8fCBbXSkubWFwKChjb21wOiBhbnksIGluZGV4OiBudW1iZXIpID0+IHtcbiAgICAgICAgY29uc3QgY3RvciA9IGNvbXAuY29uc3RydWN0b3I7XG4gICAgICAgIGxldCBjaWQ6IHN0cmluZztcbiAgICAgICAgdHJ5IHsgY2lkID0ganMuZ2V0Q2xhc3NJZChjdG9yKTsgfSBjYXRjaCB7IGNpZCA9IGN0b3IubmFtZTsgfVxuICAgICAgICBsZXQgY29tcFV1aWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgICAgICB0cnkgeyBjb21wVXVpZCA9IGNvbXAudXVpZCB8fCBudWxsOyB9IGNhdGNoIHsgLyogaWdub3JlICovIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNpZDogY2lkIHx8IGN0b3IubmFtZSxcbiAgICAgICAgICAgIG5hbWU6IGN0b3IubmFtZSxcbiAgICAgICAgICAgIGluZGV4LFxuICAgICAgICAgICAgdXVpZDogY29tcFV1aWQsXG4gICAgICAgICAgICBlbmFibGVkOiBjb21wLmVuYWJsZWRcbiAgICAgICAgfTtcbiAgICB9KTtcbiAgICBjb25zdCB3cCA9IG5vZGUud29ybGRQb3NpdGlvbiA/IHsgeDogbm9kZS53b3JsZFBvc2l0aW9uLngsIHk6IG5vZGUud29ybGRQb3NpdGlvbi55LCB6OiBub2RlLndvcmxkUG9zaXRpb24ueiB9IDogbnVsbDtcbiAgICByZXR1cm4ge1xuICAgICAgICB1dWlkOiBub2RlLnV1aWQsXG4gICAgICAgIG5hbWU6IG5vZGUubmFtZSxcbiAgICAgICAgYWN0aXZlOiBub2RlLmFjdGl2ZSxcbiAgICAgICAgbGF5ZXI6IG5vZGUubGF5ZXIsXG4gICAgICAgIHBvc2l0aW9uOiB7IHg6IG5vZGUucG9zaXRpb24ueCwgeTogbm9kZS5wb3NpdGlvbi55LCB6OiBub2RlLnBvc2l0aW9uLnogfSxcbiAgICAgICAgcm90YXRpb246IHsgeDogbm9kZS5yb3RhdGlvbi54LCB5OiBub2RlLnJvdGF0aW9uLnksIHo6IG5vZGUucm90YXRpb24ueiwgdzogbm9kZS5yb3RhdGlvbi53IH0sXG4gICAgICAgIHNjYWxlOiB7IHg6IG5vZGUuc2NhbGUueCwgeTogbm9kZS5zY2FsZS55LCB6OiBub2RlLnNjYWxlLnogfSxcbiAgICAgICAgd29ybGRQb3NpdGlvbjogd3AsXG4gICAgICAgIHBhcmVudDogbm9kZS5wYXJlbnQgPyBub2RlLnBhcmVudC51dWlkIDogbnVsbCxcbiAgICAgICAgY2hpbGRyZW46IChub2RlLmNoaWxkcmVuIHx8IFtdKS5tYXAoKGNoaWxkOiBhbnkpID0+IGNoaWxkLnV1aWQpLFxuICAgICAgICBjb21wb25lbnRzOiBjb21wc1xuICAgIH07XG59XG5cbi8qKiDmjInnu4Tku7bnsbvlnovmn6Xmib7oioLngrnkuIrnmoTnu4Tku7blrp7kvoso5pSv5oyBIEZRTiAnY2MuU3ByaXRlJyDkuI7nn63lkI0gJ1Nwcml0ZScpICovXG5mdW5jdGlvbiBmaW5kQ29tcG9uZW50T25Ob2RlKG5vZGU6IGFueSwgY29tcG9uZW50VHlwZTogc3RyaW5nLCBqczogYW55KTogYW55IHtcbiAgICBjb25zdCBub3JtYWxpemUgPSAoczogc3RyaW5nKSA9PiAocyB8fCAnJykudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9eY2NcXC4vLCAnJyk7XG4gICAgY29uc3QgdGFyZ2V0ID0gbm9ybWFsaXplKGNvbXBvbmVudFR5cGUpO1xuICAgIGNvbnN0IGNvbXBzID0gbm9kZS5jb21wb25lbnRzIHx8IFtdO1xuICAgIGZvciAoY29uc3QgY29tcCBvZiBjb21wcykge1xuICAgICAgICBsZXQgY2lkID0gJyc7XG4gICAgICAgIHRyeSB7IGNpZCA9IGpzLmdldENsYXNzSWQoY29tcC5jb25zdHJ1Y3RvcikgfHwgJyc7IH0gY2F0Y2ggeyAvKiBpZ25vcmUgKi8gfVxuICAgICAgICBpZiAobm9ybWFsaXplKGNpZCkgPT09IHRhcmdldCB8fCBub3JtYWxpemUoY29tcC5jb25zdHJ1Y3Rvci5uYW1lKSA9PT0gdGFyZ2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gY29tcDtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cblxuLyoqIOaPkOWPlue7hOS7tuWunuS+i+eahOWPr+aemuS4vuWxnuaAp+WAvCzot7Pov4flvJXmk47lhoXpg6ggYF9gIOWJjee8gOWtl+autSAqL1xuZnVuY3Rpb24gZXh0cmFjdENvbXBvbmVudFByb3BzKGNvbXA6IGFueSk6IFJlY29yZDxzdHJpbmcsIGFueT4ge1xuICAgIGNvbnN0IHJlc3VsdDogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xuICAgIGxldCBwcm90byA9IGNvbXA7XG4gICAgY29uc3Qgc2VlbiA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIHdoaWxlIChwcm90byAmJiBwcm90byAhPT0gT2JqZWN0LnByb3RvdHlwZSkge1xuICAgICAgICBjb25zdCBuYW1lcyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHByb3RvKTtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgbmFtZXMpIHtcbiAgICAgICAgICAgIGlmIChzZWVuLmhhcyhrZXkpKSBjb250aW51ZTtcbiAgICAgICAgICAgIHNlZW4uYWRkKGtleSk7XG4gICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ18nKSkgY29udGludWU7XG4gICAgICAgICAgICBpZiAoa2V5ID09PSAnbm9kZScgfHwga2V5ID09PSAnZW5hYmxlZCcgfHwga2V5ID09PSAnZW5hYmxlZEluSGllcmFyY2h5JykgY29udGludWU7XG4gICAgICAgICAgICBsZXQgdmFsOiBhbnk7XG4gICAgICAgICAgICB0cnkgeyB2YWwgPSBjb21wW2tleV07IH0gY2F0Y2ggeyBjb250aW51ZTsgfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWwgPT09ICdmdW5jdGlvbicpIGNvbnRpbnVlO1xuICAgICAgICAgICAgcmVzdWx0W2tleV0gPSBub3JtYWxpemVWYWx1ZSh2YWwpO1xuICAgICAgICB9XG4gICAgICAgIHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHByb3RvKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqIOaKiui/kOihjOaXtuWAvOW9kuS4gOWMluS4uuWPryBKU09OIOWMlueahOeugOWNlee7k+aehCAqL1xuZnVuY3Rpb24gbm9ybWFsaXplVmFsdWUodmFsOiBhbnkpOiBhbnkge1xuICAgIGlmICh2YWwgPT09IG51bGwgfHwgdmFsID09PSB1bmRlZmluZWQpIHJldHVybiB2YWw7XG4gICAgaWYgKHR5cGVvZiB2YWwgIT09ICdvYmplY3QnKSByZXR1cm4gdmFsO1xuXG4gICAgLy8gMS4g6LWE5Lqn5byV55So5LyY5YWIKFNwcml0ZUZyYW1lL1RleHR1cmUvTWF0ZXJpYWwvQXVkaW9DbGlwIOetiemDveaciSB1dWlkLFxuICAgIC8vICAgIOS4lCBTcHJpdGVGcmFtZSDov5jmmrTpnLIgd2lkdGgvaGVpZ2h0IGdldHRlcizkvJrooqvkuIvpnaLnmoQgU2l6ZSDliIbmlK/or6/lkJ4pXG4gICAgaWYgKHZhbC5fdXVpZCB8fCAodmFsLnV1aWQgJiYgdHlwZW9mIHZhbC51dWlkID09PSAnc3RyaW5nJykpIHtcbiAgICAgICAgcmV0dXJuIHsgdXVpZDogdmFsLl91dWlkIHx8IHZhbC51dWlkLCB0eXBlOiB2YWwuY29uc3RydWN0b3IgPyB2YWwuY29uc3RydWN0b3IubmFtZSA6ICdBc3NldCcgfTtcbiAgICB9XG5cbiAgICBjb25zdCBoYXMgPSAoLi4ua3M6IHN0cmluZ1tdKSA9PiBrcy5ldmVyeShrID0+IGsgaW4gdmFsKTtcbiAgICB0cnkge1xuICAgICAgICAvLyAyLiBDb2xvciAocmdiYSlcbiAgICAgICAgaWYgKGhhcygncicsICdnJywgJ2InKSkge1xuICAgICAgICAgICAgY29uc3QgYSA9ICh2YWwuYSAhPT0gdW5kZWZpbmVkKSA/IHZhbC5hIDogMjU1O1xuICAgICAgICAgICAgcmV0dXJuIHsgcjogdmFsLnIsIGc6IHZhbC5nLCBiOiB2YWwuYiwgYSB9O1xuICAgICAgICB9XG4gICAgICAgIC8vIDMuIFNpemUg5b+F6aG75ZyoIFZlYzIg5LmL5YmNOkNvY29zIFNpemUg5pyJIHgveSDliKvlkI0oU2l6ZS54PXdpZHRoKSxcbiAgICAgICAgLy8gICAg6Iul5YWI5p+lIHgveSDkvJrmioogU2l6ZSDor6/liKTkuLogVmVjMihjb250ZW50U2l6ZSDpqozor4HlgYfpmLTmgKfmoLnlm6ApXG4gICAgICAgIGlmIChoYXMoJ3dpZHRoJywgJ2hlaWdodCcpKSByZXR1cm4geyB3aWR0aDogdmFsLndpZHRoLCBoZWlnaHQ6IHZhbC5oZWlnaHQgfTtcbiAgICAgICAgLy8gNC4gVmVjXG4gICAgICAgIGlmIChoYXMoJ3gnLCAneScsICd6JywgJ3cnKSkgcmV0dXJuIHsgeDogdmFsLngsIHk6IHZhbC55LCB6OiB2YWwueiwgdzogdmFsLncgfTtcbiAgICAgICAgaWYgKGhhcygneCcsICd5JywgJ3onKSkgcmV0dXJuIHsgeDogdmFsLngsIHk6IHZhbC55LCB6OiB2YWwueiB9O1xuICAgICAgICBpZiAoaGFzKCd4JywgJ3knKSkgcmV0dXJuIHsgeDogdmFsLngsIHk6IHZhbC55IH07XG4gICAgfSBjYXRjaCB7IC8qIGZhbGx0aHJvdWdoICovIH1cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgICAgIHJldHVybiB2YWwuc2xpY2UoMCwgNjQpLm1hcChub3JtYWxpemVWYWx1ZSk7XG4gICAgfVxuICAgIGNvbnN0IG91dDogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xuICAgIGNvbnN0IHNlZW4gPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBsZXQgcHJvdG8gPSB2YWw7XG4gICAgbGV0IGNvdW50ID0gMDtcbiAgICB3aGlsZSAocHJvdG8gJiYgcHJvdG8gIT09IE9iamVjdC5wcm90b3R5cGUgJiYgY291bnQgPCAzMikge1xuICAgICAgICBmb3IgKGNvbnN0IGsgb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMocHJvdG8pKSB7XG4gICAgICAgICAgICBpZiAoc2Vlbi5oYXMoaykgfHwgay5zdGFydHNXaXRoKCdfJykpIGNvbnRpbnVlO1xuICAgICAgICAgICAgc2Vlbi5hZGQoayk7XG4gICAgICAgICAgICBpZiAoWydub2RlJywgJ2VuYWJsZWQnLCAnZW5hYmxlZEluSGllcmFyY2h5JywgJ2NvbnN0cnVjdG9yJ10uaW5jbHVkZXMoaykpIGNvbnRpbnVlO1xuICAgICAgICAgICAgbGV0IHY6IGFueTtcbiAgICAgICAgICAgIHRyeSB7IHYgPSB2YWxba107IH0gY2F0Y2ggeyBjb250aW51ZTsgfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiB2ID09PSAnZnVuY3Rpb24nKSBjb250aW51ZTtcbiAgICAgICAgICAgIG91dFtrXSA9ICh2ICE9PSBudWxsICYmIHR5cGVvZiB2ID09PSAnb2JqZWN0JykgPyAnW29iamVjdF0nIDogdjtcbiAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgICBpZiAoY291bnQgPj0gMzIpIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHByb3RvKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dDtcbn1cblxuZXhwb3J0IGNvbnN0IG1ldGhvZHM6IHsgW2tleTogc3RyaW5nXTogKC4uLmFueTogYW55KSA9PiBhbnkgfSA9IHtcbiAgICAvKipcbiAgICAgKiDor4rmlq06YXN5bmMg5pa55rOV5piv5ZCm6KKrIGV4ZWN1dGUtc2NlbmUtc2NyaXB0IOaUr+aMgSjkuZ/nlKjkuo7pqozor4Hku6PnkIbng63ph43ovb3pk77ot68pXG4gICAgICovXG4gICAgYXN5bmMgdGVzdEFzeW5jTWV0aG9kKGRlbGF5TXM6IG51bWJlcikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIGRlbGF5TXMgfHwgMTAwKSk7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IG1zZzogJ2FzeW5jIG1ldGhvZCBleGVjdXRlZCB2MicsIGRlbGF5OiBkZWxheU1zIHx8IDEwMCB9IH07XG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBjcmVhdGVOZXdTY2VuZSgpIHsgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yLCBTY2VuZSB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gbmV3IFNjZW5lKCk7XG4gICAgICAgICAgICBzY2VuZS5uYW1lID0gJ05ldyBTY2VuZSc7XG4gICAgICAgICAgICBkaXJlY3Rvci5ydW5TY2VuZShzY2VuZSk7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiAnTmV3IHNjZW5lIGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5JyB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBhZGRDb21wb25lbnRUb05vZGUobm9kZVV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yLCBqcyB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBmaW5kTm9kZUJ5VXVpZERlZXAoc2NlbmUsIG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGlmICghbm9kZSkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSB3aXRoIFVVSUQgJHtub2RlVXVpZH0gbm90IGZvdW5kYCB9O1xuICAgICAgICAgICAgY29uc3QgQ29tcG9uZW50Q2xhc3MgPSBqcy5nZXRDbGFzc0J5TmFtZShjb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgIGlmICghQ29tcG9uZW50Q2xhc3MpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCB0eXBlICR7Y29tcG9uZW50VHlwZX0gbm90IGZvdW5kYCB9O1xuICAgICAgICAgICAgY29uc3QgY29tcG9uZW50ID0gbm9kZS5hZGRDb21wb25lbnQoQ29tcG9uZW50Q2xhc3MpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IGFkZGVkYCwgZGF0YTogeyBjb21wb25lbnRJZDogY29tcG9uZW50LnV1aWQgfSB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICByZW1vdmVDb21wb25lbnRGcm9tTm9kZShub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IsIGpzIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IGZpbmROb2RlQnlVdWlkRGVlcChzY2VuZSwgbm9kZVV1aWQpO1xuICAgICAgICAgICAgaWYgKCFub2RlKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIHdpdGggVVVJRCAke25vZGVVdWlkfSBub3QgZm91bmRgIH07XG4gICAgICAgICAgICBjb25zdCBDb21wb25lbnRDbGFzcyA9IGpzLmdldENsYXNzQnlOYW1lKGNvbXBvbmVudFR5cGUpO1xuICAgICAgICAgICAgaWYgKCFDb21wb25lbnRDbGFzcykgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50IHR5cGUgJHtjb21wb25lbnRUeXBlfSBub3QgZm91bmRgIH07XG4gICAgICAgICAgICBjb25zdCBjb21wb25lbnQgPSBub2RlLmdldENvbXBvbmVudChDb21wb25lbnRDbGFzcyk7XG4gICAgICAgICAgICBpZiAoIWNvbXBvbmVudCkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50ICR7Y29tcG9uZW50VHlwZX0gbm90IGZvdW5kIG9uIG5vZGVgIH07XG4gICAgICAgICAgICBub2RlLnJlbW92ZUNvbXBvbmVudChjb21wb25lbnQpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IHJlbW92ZWRgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGNyZWF0ZU5vZGUobmFtZTogc3RyaW5nLCBwYXJlbnRVdWlkPzogc3RyaW5nKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yLCBOb2RlIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IG5ldyBOb2RlKG5hbWUpO1xuICAgICAgICAgICAgaWYgKHBhcmVudFV1aWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnQgPSBmaW5kTm9kZUJ5VXVpZERlZXAoc2NlbmUsIHBhcmVudFV1aWQpO1xuICAgICAgICAgICAgICAgIGlmIChwYXJlbnQpIHBhcmVudC5hZGRDaGlsZChub2RlKTsgZWxzZSBzY2VuZS5hZGRDaGlsZChub2RlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2NlbmUuYWRkQ2hpbGQobm9kZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgTm9kZSAke25hbWV9IGNyZWF0ZWRgLCBkYXRhOiB7IHV1aWQ6IG5vZGUudXVpZCwgbmFtZTogbm9kZS5uYW1lIH0gfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICog6I635Y+W6IqC54K55L+h5oGvKOW9kuS4gOWMlinjgIJjb21wb25lbnRzIOWQqyBjaWQoRlFOKSsgbmFtZSjnn63lkI0pKyBpbmRleOOAglxuICAgICAqL1xuICAgIGdldE5vZGVJbmZvKG5vZGVVdWlkOiBzdHJpbmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IsIGpzIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IGZpbmROb2RlQnlVdWlkRGVlcChzY2VuZSwgbm9kZVV1aWQpO1xuICAgICAgICAgICAgaWYgKCFub2RlKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIHdpdGggVVVJRCAke25vZGVVdWlkfSBub3QgZm91bmRgIH07XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBidWlsZE5vZGVJbmZvKG5vZGUsIGpzKSB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiDojrflj5bljZXkuKrnu4Tku7bor6bmg4U65omA5pyJ5Y+v5p6a5Li+5a6e5L6L5bGe5oCn55qE5YC8LOeUqOS6jiBzZXQtcHJvcGVydHkg5YaZ5ZCO55yf5a6e6aqM6K+B6K+75Zue44CCXG4gICAgICovXG4gICAgZ2V0Q29tcG9uZW50RGV0YWlsKG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciwganMgfSA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IGRpcmVjdG9yLmdldFNjZW5lKCk7XG4gICAgICAgICAgICBpZiAoIXNjZW5lKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICBjb25zdCBub2RlID0gZmluZE5vZGVCeVV1aWREZWVwKHNjZW5lLCBub2RlVXVpZCk7XG4gICAgICAgICAgICBpZiAoIW5vZGUpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vZGUgd2l0aCBVVUlEICR7bm9kZVV1aWR9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIGNvbnN0IGNvbXAgPSBmaW5kQ29tcG9uZW50T25Ob2RlKG5vZGUsIGNvbXBvbmVudFR5cGUsIGpzKTtcbiAgICAgICAgICAgIGlmICghY29tcCkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50ICR7Y29tcG9uZW50VHlwZX0gbm90IGZvdW5kIG9uIG5vZGUgJHtub2RlLm5hbWV9YCB9O1xuICAgICAgICAgICAgY29uc3QgcHJvcHMgPSBleHRyYWN0Q29tcG9uZW50UHJvcHMoY29tcCk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YTogeyBjaWQ6IGpzLmdldENsYXNzSWQoY29tcC5jb25zdHJ1Y3RvciksIG5hbWU6IGNvbXAuY29uc3RydWN0b3IubmFtZSwgZW5hYmxlZDogY29tcC5lbmFibGVkLCBwcm9wZXJ0aWVzOiBwcm9wcyB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiDojrflj5boioLngrnmoJEo5b2S5LiA5YyW5bWM5aWXLOWQqyBjb21wb25lbnRzIGNpZCnjgIJcbiAgICAgKi9cbiAgICBnZXRBbGxOb2RlcygpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IsIGpzIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xuICAgICAgICAgICAgY29uc3QgYnVpbGRUcmVlID0gKG5vZGU6IGFueSk6IGFueSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29tcHMgPSAobm9kZS5jb21wb25lbnRzIHx8IFtdKS5tYXAoKGNvbXA6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsZXQgY2lkID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7IGNpZCA9IGpzLmdldENsYXNzSWQoY29tcC5jb25zdHJ1Y3RvcikgfHwgJyc7IH0gY2F0Y2ggeyAvKiBpZ25vcmUgKi8gfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2lkIHx8IGNvbXAuY29uc3RydWN0b3IubmFtZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBub2RlLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGUudXVpZCxcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlOiBub2RlLmFjdGl2ZSxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBub2RlLnBhcmVudCA/IG5vZGUucGFyZW50LnV1aWQgOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRzOiBjb21wcyxcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IChub2RlLmNoaWxkcmVuIHx8IFtdKS5tYXAoKGNoaWxkOiBhbnkpID0+IGJ1aWxkVHJlZShjaGlsZCkpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBidWlsZFRyZWUoc2NlbmUpIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGZpbmROb2RlQnlOYW1lKG5hbWU6IHN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBzY2VuZS5nZXRDaGlsZEJ5TmFtZShuYW1lKTtcbiAgICAgICAgICAgIGlmICghbm9kZSkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSB3aXRoIG5hbWUgJHtuYW1lfSBub3QgZm91bmRgIH07XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IHV1aWQ6IG5vZGUudXVpZCwgbmFtZTogbm9kZS5uYW1lLCBhY3RpdmU6IG5vZGUuYWN0aXZlLCBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbiB9IH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGdldEN1cnJlbnRTY2VuZUluZm8oKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyBuYW1lOiBzY2VuZS5uYW1lLCB1dWlkOiBzY2VuZS51dWlkLCBub2RlQ291bnQ6IHNjZW5lLmNoaWxkcmVuLmxlbmd0aCB9IH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHNldE5vZGVQcm9wZXJ0eShub2RlVXVpZDogc3RyaW5nLCBwcm9wZXJ0eTogc3RyaW5nLCB2YWx1ZTogYW55KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IGZpbmROb2RlQnlVdWlkRGVlcChzY2VuZSwgbm9kZVV1aWQpO1xuICAgICAgICAgICAgaWYgKCFub2RlKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIHdpdGggVVVJRCAke25vZGVVdWlkfSBub3QgZm91bmRgIH07XG4gICAgICAgICAgICBpZiAocHJvcGVydHkgPT09ICdwb3NpdGlvbicpIG5vZGUuc2V0UG9zaXRpb24odmFsdWUueCB8fCAwLCB2YWx1ZS55IHx8IDAsIHZhbHVlLnogfHwgMCk7XG4gICAgICAgICAgICBlbHNlIGlmIChwcm9wZXJ0eSA9PT0gJ3JvdGF0aW9uJykgbm9kZS5zZXRSb3RhdGlvbkZyb21FdWxlcih2YWx1ZS54IHx8IDAsIHZhbHVlLnkgfHwgMCwgdmFsdWUueiB8fCAwKTtcbiAgICAgICAgICAgIGVsc2UgaWYgKHByb3BlcnR5ID09PSAnc2NhbGUnKSBub2RlLnNldFNjYWxlKHZhbHVlLnggfHwgMSwgdmFsdWUueSB8fCAxLCB2YWx1ZS56IHx8IDEpO1xuICAgICAgICAgICAgZWxzZSBpZiAocHJvcGVydHkgPT09ICdhY3RpdmUnKSBub2RlLmFjdGl2ZSA9IHZhbHVlO1xuICAgICAgICAgICAgZWxzZSBpZiAocHJvcGVydHkgPT09ICduYW1lJykgbm9kZS5uYW1lID0gdmFsdWU7XG4gICAgICAgICAgICBlbHNlIChub2RlIGFzIGFueSlbcHJvcGVydHldID0gdmFsdWU7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgUHJvcGVydHkgJyR7cHJvcGVydHl9JyB1cGRhdGVkYCB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBnZXRTY2VuZUhpZXJhcmNoeShpbmNsdWRlQ29tcG9uZW50czogYm9vbGVhbiA9IGZhbHNlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xuICAgICAgICAgICAgY29uc3QgcHJvY2Vzc05vZGUgPSAobm9kZTogYW55KTogYW55ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IHsgbmFtZTogbm9kZS5uYW1lLCB1dWlkOiBub2RlLnV1aWQsIGFjdGl2ZTogbm9kZS5hY3RpdmUsIGNoaWxkcmVuOiBbXSB9O1xuICAgICAgICAgICAgICAgIGlmIChpbmNsdWRlQ29tcG9uZW50cykge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQuY29tcG9uZW50cyA9IG5vZGUuY29tcG9uZW50cy5tYXAoKGNvbXA6IGFueSkgPT4gKHsgdHlwZTogY29tcC5jb25zdHJ1Y3Rvci5uYW1lLCBlbmFibGVkOiBjb21wLmVuYWJsZWQgfSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobm9kZS5jaGlsZHJlbiAmJiBub2RlLmNoaWxkcmVuLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbi5tYXAoKGNoaWxkOiBhbnkpID0+IHByb2Nlc3NOb2RlKGNoaWxkKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogc2NlbmUuY2hpbGRyZW4ubWFwKChjaGlsZDogYW55KSA9PiBwcm9jZXNzTm9kZShjaGlsZCkpIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGNyZWF0ZVByZWZhYkZyb21Ob2RlKG5vZGVVdWlkOiBzdHJpbmcsIHByZWZhYlBhdGg6IHN0cmluZykge1xuICAgICAgICAvLyDnnJ/mraPnmoQgcHJlZmFiIOWIm+W7uueUqCBwcmVmYWJfY3JlYXRlX3ByZWZhYiDlt6XlhbcocHJlZmFiLXRvb2xzKSzov5nph4zku4Xkv53nlZnmjqXlj6PlhbzlrrlcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAn5L2/55SoIHByZWZhYl9jcmVhdGVfcHJlZmFiIOW3peWFt+abv+S7o+WcuuaZr+iEmuacrCBjcmVhdGVQcmVmYWJGcm9tTm9kZScgfTtcbiAgICB9LFxuXG4gICAgc2V0Q29tcG9uZW50UHJvcGVydHkobm9kZVV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nLCBwcm9wZXJ0eTogc3RyaW5nLCB2YWx1ZTogYW55KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yLCBqcyB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBmaW5kTm9kZUJ5VXVpZERlZXAoc2NlbmUsIG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGlmICghbm9kZSkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSB3aXRoIFVVSUQgJHtub2RlVXVpZH0gbm90IGZvdW5kYCB9O1xuICAgICAgICAgICAgY29uc3QgQ29tcG9uZW50Q2xhc3MgPSBqcy5nZXRDbGFzc0J5TmFtZShjb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgIGlmICghQ29tcG9uZW50Q2xhc3MpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCB0eXBlICR7Y29tcG9uZW50VHlwZX0gbm90IGZvdW5kYCB9O1xuICAgICAgICAgICAgY29uc3QgY29tcG9uZW50ID0gbm9kZS5nZXRDb21wb25lbnQoQ29tcG9uZW50Q2xhc3MpO1xuICAgICAgICAgICAgaWYgKCFjb21wb25lbnQpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZCBvbiBub2RlYCB9O1xuICAgICAgICAgICAgLy8g6LWE5Lqn57G75bGe5oCnKHNwcml0ZUZyYW1lL21hdGVyaWFsKeaMiSB1dWlkIOWKoOi9vVxuICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgJiYgKHByb3BlcnR5ID09PSAnc3ByaXRlRnJhbWUnIHx8IHByb3BlcnR5ID09PSAnbWF0ZXJpYWwnKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0TWFuYWdlciA9IHJlcXVpcmUoJ2NjJykuYXNzZXRNYW5hZ2VyO1xuICAgICAgICAgICAgICAgIGNvbnN0IEFzc2V0VHlwZSA9IHByb3BlcnR5ID09PSAnc3ByaXRlRnJhbWUnID8gcmVxdWlyZSgnY2MnKS5TcHJpdGVGcmFtZSA6IHJlcXVpcmUoJ2NjJykuTWF0ZXJpYWw7XG4gICAgICAgICAgICAgICAgYXNzZXRNYW5hZ2VyLmxvYWRBbnkoeyB1dWlkOiB2YWx1ZSwgdHlwZTogQXNzZXRUeXBlIH0sIChlcnI6IGFueSwgYXNzZXQ6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWVyciAmJiBhc3NldCkgKGNvbXBvbmVudCBhcyBhbnkpW3Byb3BlcnR5XSA9IGFzc2V0O1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAoY29tcG9uZW50IGFzIGFueSlbcHJvcGVydHldID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgQ29tcG9uZW50IHByb3BlcnR5ICcke3Byb3BlcnR5fScgdXBkYXRlZGAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICog5Zyo5Zy65pmv6L+b56iL5LiK5LiL5paH5rGC5YC8IEpTKOiwg+ivleeUqCnjgILlj6/orr/pl64gcmVxdWlyZSgnY2MnKeOAgXNjZW5l44CBbm9kZSDnrYnjgIJcbiAgICAgKiDooajovr7lvI/lj6/kuLo6IOWtl+espuS4suihqOi+vuW8jyAvIOWkmuivreWPpeS7o+eggeWdlyAvIGFzeW5jIOWHveaVsOS9kyjoh6rliqggYXdhaXQgUHJvbWlzZSnjgIJcbiAgICAgKiDlronlhajmj5DnpLo6IOaXoOaymeeusSznrYnlkIwgRGV2VG9vbHMgY29uc29sZSwg5LuF6LCD6K+V55So44CCXG4gICAgICovXG4gICAgYXN5bmMgZXZhbChzY3JpcHQ6IHN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKCFzY3JpcHQgfHwgdHlwZW9mIHNjcmlwdCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdzY3JpcHQg5b+F6aG75piv6Z2e56m65a2X56ym5LiyJyB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8g55SoIG5ldyBGdW5jdGlvbiDljIXoo4UsIOiHquWKqCBhd2FpdCBQcm9taXNlIOi/lOWbnuWAvFxuICAgICAgICAgICAgY29uc3QgZm4gPSBuZXcgRnVuY3Rpb24oJ3JldHVybiAoYXN5bmMgKCkgPT4geyByZXR1cm4gKCcgKyBzY3JpcHQgKyAnKTsgfSkoKTsnKTtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGZuKCk7XG4gICAgICAgICAgICAvLyDnu5PmnpzlvZLkuIDljJbkuLrlj6/luo/liJfljJYoSlNPTik7IOaXoOazleW6j+WIl+WMlueahOi9rOaPj+i/sFxuICAgICAgICAgICAgbGV0IHNhZmU6IGFueTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkocmVzdWx0KTtcbiAgICAgICAgICAgICAgICBzYWZlID0gcmVzdWx0O1xuICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgICAgc2FmZSA9IHsgX19ub25TZXJpYWxpemFibGU6IHRydWUsIGRlc2NyaXB0aW9uOiBTdHJpbmcocmVzdWx0KSwgdHlwZTogdHlwZW9mIHJlc3VsdCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyByZXN1bHQ6IHNhZmUgfSB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UsIHN0YWNrOiBlcnJvci5zdGFjayB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIOWIm+W7uuW6j+WIl+W4p+WKqOeUu+OAglxuICAgICAqIC0g5Li76Lev5b6EOuWKoOi9vSBTcHJpdGVGcmFtZSDihpIgQW5pbWF0aW9uQ2xpcC5jcmVhdGVXaXRoU3ByaXRlRnJhbWVzIOKGkiBFZGl0b3JFeHRlbmRzLnNlcmlhbGl6ZVxuICAgICAqIC0g5YWc5bqV6Lev5b6EKHV1aWQtb25seSk66IulIFNwcml0ZUZyYW1lIOWKoOi9veWksei0pSznm7TmjqXmjIkgdXVpZCDmiYvlu7ogLmFuaW0gSlNPTlxuICAgICAqICAgKOi/kOihjOaXti9wcmV2aWV3IOS8muaMiSB1dWlkIOino+aekCzml6DpnIDnvJbovpHlmajmgIHliqDovb3lrp7pmYXotYTkuqcpXG4gICAgICogLSBjcmVhdGUtYXNzZXQg55qEIGNvbnRlbnQg5b+F6aG7IEpTT04uc3RyaW5naWZ5IOaIkOWtl+espuS4sijkv67lpI3ml6fniYjkvKAgb2JqZWN0IOWvvOiHtOepuumUmeivrylcbiAgICAgKiAtIOWFqOeoi+iusOW9lSBzdGFnZXMs5aSx6LSl5pe26L+U5Zue6YOo5YiG6L+b5bqm5L6/5LqO5a6a5L2NXG4gICAgICovXG4gICAgYXN5bmMgY3JlYXRlU3ByaXRlRnJhbWVBbmltYXRpb24obm9kZVV1aWQ6IHN0cmluZywgc3ByaXRlRnJhbWVVdWlkczogc3RyaW5nW10sIHNhbXBsZVJhdGU6IG51bWJlciwgY2xpcE5hbWU6IHN0cmluZywgc2F2ZVBhdGg6IHN0cmluZywgbG9vcDogYm9vbGVhbikge1xuICAgICAgICBjb25zdCBzdGFnZXM6IGFueVtdID0gW107XG4gICAgICAgIGNvbnN0IHB1c2ggPSAobmFtZTogc3RyaW5nLCBvazogYm9vbGVhbiwgZXh0cmE/OiBhbnkpID0+IHN0YWdlcy5wdXNoKHsgbmFtZSwgb2ssIC4uLihleHRyYSB8fCB7fSkgfSk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBjYyA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yLCBqcywgYXNzZXRNYW5hZ2VyLCBBbmltYXRpb25DbGlwLCBTcHJpdGVGcmFtZSB9ID0gY2M7XG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IGRpcmVjdG9yLmdldFNjZW5lKCk7XG4gICAgICAgICAgICBpZiAoIXNjZW5lKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnLCBzdGFnZXMgfTtcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBmaW5kTm9kZUJ5VXVpZERlZXAoc2NlbmUsIG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGlmICghbm9kZSkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSAke25vZGVVdWlkfSBub3QgZm91bmRgLCBzdGFnZXMgfTtcbiAgICAgICAgICAgIGlmICghc3ByaXRlRnJhbWVVdWlkcyB8fCAhc3ByaXRlRnJhbWVVdWlkcy5sZW5ndGgpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ3Nwcml0ZUZyYW1lVXVpZHMgaXMgZW1wdHknLCBzdGFnZXMgfTtcbiAgICAgICAgICAgIHNhbXBsZVJhdGUgPSBzYW1wbGVSYXRlIHx8IDEwO1xuICAgICAgICAgICAgY2xpcE5hbWUgPSBjbGlwTmFtZSB8fCAnU3ByaXRlQW5pbSc7XG4gICAgICAgICAgICBzYXZlUGF0aCA9IHNhdmVQYXRoIHx8IGBkYjovL2Fzc2V0cy8ke2NsaXBOYW1lfS5hbmltYDtcbiAgICAgICAgICAgIGxvb3AgPSBsb29wICE9PSBmYWxzZTtcbiAgICAgICAgICAgIHB1c2goJ3ZhbGlkYXRlJywgdHJ1ZSk7XG5cbiAgICAgICAgICAgIC8vIOKUgOKUgCAxLiDliqDovb0gU3ByaXRlRnJhbWUo5Y+v6YCJO+Wksei0pei1sCB1dWlkLW9ubHkg5YWc5bqVKSDilIDilIBcbiAgICAgICAgICAgIGxldCBmcmFtZXM6IGFueVtdID0gW107XG4gICAgICAgICAgICBsZXQgZnJhbWVzTG9hZGVkID0gZmFsc2U7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGZyYW1lcyA9IGF3YWl0IG5ldyBQcm9taXNlPGFueVtdPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG9wdHMgPSBTcHJpdGVGcmFtZSA/IHsgdHlwZTogU3ByaXRlRnJhbWUgfSA6IHt9O1xuICAgICAgICAgICAgICAgICAgICBhc3NldE1hbmFnZXIubG9hZEFueShzcHJpdGVGcmFtZVV1aWRzLCBvcHRzLCAoZXJyOiBhbnksIGFzc2V0czogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSByZWplY3QobmV3IEVycm9yKGBsb2FkQW55IOWksei0pTogJHtlcnIubWVzc2FnZSB8fCBlcnJ9YCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSByZXNvbHZlKEFycmF5LmlzQXJyYXkoYXNzZXRzKSA/IGFzc2V0cyA6IFthc3NldHNdKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgLy8g5oyJ5Lyg5YWl6aG65bqP5a+56b2QXG4gICAgICAgICAgICAgICAgY29uc3QgbWFwID0gbmV3IE1hcDxzdHJpbmcsIGFueT4oKTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGYgb2YgZnJhbWVzKSBtYXAuc2V0KGYuX3V1aWQgfHwgZi51dWlkLCBmKTtcbiAgICAgICAgICAgICAgICBjb25zdCBvcmRlcmVkID0gc3ByaXRlRnJhbWVVdWlkcy5tYXAodSA9PiBtYXAuZ2V0KHUpKS5maWx0ZXIoQm9vbGVhbik7XG4gICAgICAgICAgICAgICAgZnJhbWVzTG9hZGVkID0gb3JkZXJlZC5sZW5ndGggPT09IHNwcml0ZUZyYW1lVXVpZHMubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGlmIChmcmFtZXNMb2FkZWQpIGZyYW1lcyA9IG9yZGVyZWQ7XG4gICAgICAgICAgICAgICAgcHVzaCgnbG9hZEZyYW1lcycsIGZyYW1lc0xvYWRlZCwgeyBsb2FkZWQ6IG9yZGVyZWQubGVuZ3RoLCBleHBlY3RlZDogc3ByaXRlRnJhbWVVdWlkcy5sZW5ndGggfSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICAgICAgICBwdXNoKCdsb2FkRnJhbWVzJywgZmFsc2UsIHsgZXJyb3I6IGUubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8g4pSA4pSAIDIuIOeUn+aIkCAuYW5pbSBKU09OIOKUgOKUgFxuICAgICAgICAgICAgbGV0IGFuaW1Kc29uOiBhbnk7XG4gICAgICAgICAgICBpZiAoZnJhbWVzTG9hZGVkICYmIEFuaW1hdGlvbkNsaXAgJiYgQW5pbWF0aW9uQ2xpcC5jcmVhdGVXaXRoU3ByaXRlRnJhbWVzKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2xpcCA9IEFuaW1hdGlvbkNsaXAuY3JlYXRlV2l0aFNwcml0ZUZyYW1lcyhmcmFtZXMsIHNhbXBsZVJhdGUpO1xuICAgICAgICAgICAgICAgICAgICBjbGlwLm5hbWUgPSBjbGlwTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgY2xpcC53cmFwTW9kZSA9IGxvb3AgPyAyIDogMTsgLy8gMj1Mb29wLCAxPU5vcm1hbFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZXJpYWxpemVkID0gc2VyaWFsaXplQ2xpcFZpYUVkaXRvckV4dGVuZHMoY2xpcCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzZXJpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbmltSnNvbiA9IHNlcmlhbGl6ZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBwdXNoKCdidWlsZENsaXAoc2VyaWFsaXplKScsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5pbUpzb24gPSBidWlsZFV1aWRPbmx5QW5pbUpzb24oY2xpcE5hbWUsIHNwcml0ZUZyYW1lVXVpZHMsIHNhbXBsZVJhdGUsIGxvb3ApO1xuICAgICAgICAgICAgICAgICAgICAgICAgcHVzaCgnYnVpbGRDbGlwKHV1aWQtb25seSknLCAhIWFuaW1Kc29uLCB7IHJlYXNvbjogJ3NlcmlhbGl6ZSDov5Tlm57nqbos6ZmN57qnIHV1aWQtb25seScgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICAgICAgICAgICAgYW5pbUpzb24gPSBidWlsZFV1aWRPbmx5QW5pbUpzb24oY2xpcE5hbWUsIHNwcml0ZUZyYW1lVXVpZHMsIHNhbXBsZVJhdGUsIGxvb3ApO1xuICAgICAgICAgICAgICAgICAgICBwdXNoKCdidWlsZENsaXAodXVpZC1vbmx5KScsICEhYW5pbUpzb24sIHsgcmVhc29uOiBgc2VyaWFsaXplIOaKm+mUmTogJHtlLm1lc3NhZ2V9YCwgc3RhY2s6IGUuc3RhY2sgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhbmltSnNvbiA9IGJ1aWxkVXVpZE9ubHlBbmltSnNvbihjbGlwTmFtZSwgc3ByaXRlRnJhbWVVdWlkcywgc2FtcGxlUmF0ZSwgbG9vcCk7XG4gICAgICAgICAgICAgICAgcHVzaCgnYnVpbGRDbGlwKHV1aWQtb25seSknLCAhIWFuaW1Kc29uLCB7IHJlYXNvbjogZnJhbWVzTG9hZGVkID8gJ2NyZWF0ZVdpdGhTcHJpdGVGcmFtZXMg5LiN5Y+v55SoJyA6ICdmcmFtZXMg5pyq5Yqg6L29JyB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghYW5pbUpzb24pIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ2NsaXAgSlNPTiDmnoTlu7rlpLHotKUnLCBzdGFnZXMgfTtcblxuICAgICAgICAgICAgLy8g4pSA4pSAIDMuIOWGmSAuYW5pbSDotYTkuqcoY29udGVudCDlv4Xpobsgc3RyaW5nKSDilIDilIBcbiAgICAgICAgICAgIGxldCBjbGlwVXVpZDogc3RyaW5nID0gJyc7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ2RlbGV0ZS1hc3NldCcsIHNhdmVQYXRoKS5jYXRjaCgoKSA9PiB7fSk7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGVudFN0ciA9IHR5cGVvZiBhbmltSnNvbiA9PT0gJ3N0cmluZycgPyBhbmltSnNvbiA6IEpTT04uc3RyaW5naWZ5KGFuaW1Kc29uKTtcbiAgICAgICAgICAgICAgICBjb25zdCBjcmVhdGVSZXM6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ2NyZWF0ZS1hc3NldCcsIHNhdmVQYXRoLCBjb250ZW50U3RyKTtcbiAgICAgICAgICAgICAgICBjbGlwVXVpZCA9IGNyZWF0ZVJlcz8udXVpZDtcbiAgICAgICAgICAgICAgICBwdXNoKCdjcmVhdGVBc3NldCcsICEhY2xpcFV1aWQsIHsgdXVpZDogY2xpcFV1aWQsIGNyZWF0ZVJlc1R5cGU6IHR5cGVvZiBjcmVhdGVSZXMgfSk7XG4gICAgICAgICAgICAgICAgaWYgKCFjbGlwVXVpZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBjcmVhdGUtYXNzZXQg5pyq6L+U5ZueIHV1aWQ6ICR7SlNPTi5zdHJpbmdpZnkoY3JlYXRlUmVzKX1gLCBzdGFnZXMgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICAgICAgICBwdXNoKCdjcmVhdGVBc3NldCcsIGZhbHNlLCB7IGVycm9yOiBlLm1lc3NhZ2UsIHN0YWNrOiBlLnN0YWNrIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYGNyZWF0ZS1hc3NldCDlpLHotKU6ICR7ZS5tZXNzYWdlfWAsIHN0YWdlcyB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyDilIDilIAgNC4g5oyB5LmF5YyW5oyC6L29IGNjLkFuaW1hdGlvbiArIGRlZmF1bHRDbGlwIOKUgOKUgFxuICAgICAgICAgICAgbGV0IGF0dGFjaGVkID0gZmFsc2U7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVEYXRhID0gYnVpbGROb2RlSW5mbyhub2RlLCBqcyk7XG4gICAgICAgICAgICAgICAgY29uc3QgaGFzQW5pbSA9IG5vZGVEYXRhLmNvbXBvbmVudHMuc29tZSgoYzogYW55KSA9PiBjLmNpZCA9PT0gJ2NjLkFuaW1hdGlvbicpO1xuICAgICAgICAgICAgICAgIGlmICghaGFzQW5pbSkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdjcmVhdGUtY29tcG9uZW50JywgeyB1dWlkOiBub2RlVXVpZCwgY29tcG9uZW50OiAnY2MuQW5pbWF0aW9uJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIDI1MCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCByZWZyZXNoZWQgPSBidWlsZE5vZGVJbmZvKG5vZGUsIGpzKTtcbiAgICAgICAgICAgICAgICBjb25zdCBpZHggPSByZWZyZXNoZWQuY29tcG9uZW50cy5maW5kSW5kZXgoKGM6IGFueSkgPT4gYy5jaWQgPT09ICdjYy5BbmltYXRpb24nKTtcbiAgICAgICAgICAgICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBgX19jb21wc19fLiR7aWR4fS5kZWZhdWx0Q2xpcGAsXG4gICAgICAgICAgICAgICAgICAgICAgICBkdW1wOiB7IHZhbHVlOiB7IHV1aWQ6IGNsaXBVdWlkIH0sIHR5cGU6ICdjYy5BbmltYXRpb25DbGlwJyB9XG4gICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKCgpID0+IHt9KTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBgX19jb21wc19fLiR7aWR4fS5wbGF5T25Mb2FkYCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1bXA6IHsgdmFsdWU6IHRydWUgfVxuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoKSA9PiB7fSk7XG4gICAgICAgICAgICAgICAgICAgIGF0dGFjaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcHVzaCgnYXR0YWNoQW5pbScsIGF0dGFjaGVkLCB7IGNvbXBJZHg6IGlkeCB9KTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgICAgICAgIHB1c2goJ2F0dGFjaEFuaW0nLCBmYWxzZSwgeyBlcnJvcjogZS5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBjbGlwVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgc2F2ZVBhdGgsXG4gICAgICAgICAgICAgICAgICAgIGNsaXBOYW1lLFxuICAgICAgICAgICAgICAgICAgICBmcmFtZUNvdW50OiBzcHJpdGVGcmFtZVV1aWRzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgc2FtcGxlUmF0ZSxcbiAgICAgICAgICAgICAgICAgICAgbG9vcCxcbiAgICAgICAgICAgICAgICAgICAgZnJhbWVzTG9hZGVkLFxuICAgICAgICAgICAgICAgICAgICBhdHRhY2hlZCxcbiAgICAgICAgICAgICAgICAgICAgc3RhZ2VzXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6IChlcnIgJiYgKGVyci5tZXNzYWdlIHx8IFN0cmluZyhlcnIpKSkgfHwgJ3Vua25vd24gZXJyb3IgaW4gY3JlYXRlU3ByaXRlRnJhbWVBbmltYXRpb24nLFxuICAgICAgICAgICAgICAgIHN0YWNrOiBlcnI/LnN0YWNrLFxuICAgICAgICAgICAgICAgIHN0YWdlc1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8qKiDnlKggRWRpdG9yRXh0ZW5kcy5zZXJpYWxpemUg5bqP5YiX5YyWIGNsaXAs6L+U5Zue6Kej5p6Q5ZCO55qE5a+56LGh44CC5aSx6LSl6L+U5ZueIG51bGzjgIIgKi9cbmZ1bmN0aW9uIHNlcmlhbGl6ZUNsaXBWaWFFZGl0b3JFeHRlbmRzKGNsaXA6IGFueSk6IGFueSB8IG51bGwge1xuICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IEVFeHQ6IGFueSA9IChnbG9iYWxUaGlzIGFzIGFueSkuRWRpdG9yRXh0ZW5kcyB8fCAoZ2xvYmFsVGhpcyBhcyBhbnkpLkVkaXRvcj8uRXh0ZW5kcztcbiAgICAgICAgY29uc3Qgc2VyID0gRUV4dD8uc2VyaWFsaXplO1xuICAgICAgICBpZiAoIXNlcikgcmV0dXJuIG51bGw7XG4gICAgICAgIGxldCBzdHI6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXIuc2VyaWFsaXplQXNzZXQgPT09ICdmdW5jdGlvbicpIHN0ciA9IHNlci5zZXJpYWxpemVBc3NldChjbGlwKTtcbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIHNlci5zZXJpYWxpemUgPT09ICdmdW5jdGlvbicpIHN0ciA9IHNlci5zZXJpYWxpemUoY2xpcCwgeyBhc3NldDogdHJ1ZSB9KTtcbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIHNlciA9PT0gJ2Z1bmN0aW9uJykgc3RyID0gc2VyKGNsaXAsIHsgYXNzZXQ6IHRydWUgfSk7XG4gICAgICAgIGlmICh0eXBlb2Ygc3RyID09PSAnc3RyaW5nJyAmJiBzdHIubGVuZ3RoKSByZXR1cm4gSlNPTi5wYXJzZShzdHIpO1xuICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHNlcmlhbGl6ZSDlpLHotKU6ICR7ZS5tZXNzYWdlfWApO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiDmjIkgdXVpZCDmiYvlu7ogLmFuaW0gSlNPTih1dWlkLW9ubHkg5YWc5bqV6Lev5b6EKeOAglxuICog55Sf5oiQIENvY29zIDMuOCDluo/liJfljJbmoLzlvI86YXJyYXktb2Ytb2JqZWN0LOmAmui/hyBfX2lkX18g5LqS55u45byV55So44CCXG4gKiB0cmFjayA9IGNjLmFuaW1hdGlvbi5PYmplY3RUcmFjayxjdXJ2ZSA9IGNjLk9iamVjdEN1cnZlLGtleXMvdmFsdWVzIOWtmCBbdGltZSwge3V1aWR9XeOAglxuICpcbiAqIOazqOaEjzrmraTmoLzlvI/lj4LnhaflvJXmk44gY29jb3MvY29yZS9hbmltYXRpb24vdHJhY2tzL29iamVjdC10cmFjay50cyArXG4gKiBjb2Nvcy9jb3JlL2N1cnZlcy9vYmplY3QtY3VydmUudHMg55qE5Y+v5bqP5YiX5YyW5a2X5q61LOW5tuWvueeFp+mhueebruWGheaXouaciSAuYW5pbSDlvJXnlKjnu5PmnoTjgIJcbiAqL1xuZnVuY3Rpb24gYnVpbGRVdWlkT25seUFuaW1Kc29uKGNsaXBOYW1lOiBzdHJpbmcsIHNwcml0ZUZyYW1lVXVpZHM6IHN0cmluZ1tdLCBzYW1wbGVSYXRlOiBudW1iZXIsIGxvb3A6IGJvb2xlYW4pOiBhbnkge1xuICAgIGNvbnN0IHN0ZXAgPSAxIC8gc2FtcGxlUmF0ZTtcbiAgICBjb25zdCBkdXJhdGlvbiA9IHNwcml0ZUZyYW1lVXVpZHMubGVuZ3RoIC8gc2FtcGxlUmF0ZTtcbiAgICBjb25zdCB0aW1lcyA9IHNwcml0ZUZyYW1lVXVpZHMubWFwKChfLCBpKSA9PiArKHN0ZXAgKiBpKS50b0ZpeGVkKDYpKTtcbiAgICBjb25zdCB2YWx1ZXMgPSBzcHJpdGVGcmFtZVV1aWRzLm1hcCh1ID0+ICh7IHV1aWQ6IHUgfSkpO1xuXG4gICAgLy8gYXJyYXktb2Ytb2JqZWN0IOW8leeUqOe7k+aehCjntKLlvJXljbMgX19pZF9fKVxuICAgIGNvbnN0IGFycjogYW55W10gPSBbXG4gICAgICAgIHsgLy8gWzBdIGNsaXBcbiAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuQW5pbWF0aW9uQ2xpcCcsXG4gICAgICAgICAgICBfbmFtZTogY2xpcE5hbWUsXG4gICAgICAgICAgICBfb2JqRmxhZ3M6IDAsXG4gICAgICAgICAgICBfX2VkaXRvckV4dHJhc19fOiB7IGVtYmVkZGVkUGxheWVyR3JvdXBzOiBbXSB9LFxuICAgICAgICAgICAgX25hdGl2ZTogJycsXG4gICAgICAgICAgICBzYW1wbGU6IHNhbXBsZVJhdGUsXG4gICAgICAgICAgICBzcGVlZDogMSxcbiAgICAgICAgICAgIHdyYXBNb2RlOiBsb29wID8gMiA6IDEsXG4gICAgICAgICAgICBlbmFibGVUcnNCbGVuZGluZzogZmFsc2UsXG4gICAgICAgICAgICBfZHVyYXRpb246IGR1cmF0aW9uLFxuICAgICAgICAgICAgX2hhc2g6IDAsXG4gICAgICAgICAgICBfdHJhY2tzOiBbeyBfX2lkX186IDEgfV0sXG4gICAgICAgICAgICBfZXhvdGljQW5pbWF0aW9uOiBudWxsLFxuICAgICAgICAgICAgX2V2ZW50czogW10sXG4gICAgICAgICAgICBfZW1iZWRkZWRQbGF5ZXJzOiBbXSxcbiAgICAgICAgICAgIF9hZGRpdGl2ZVNldHRpbmdzOiB7IF9faWRfXzogNSB9LFxuICAgICAgICAgICAgX2F1eGlsaWFyeUN1cnZlRW50cmllczogW11cbiAgICAgICAgfSxcbiAgICAgICAgeyAvLyBbMV0gT2JqZWN0VHJhY2tcbiAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuYW5pbWF0aW9uLk9iamVjdFRyYWNrJyxcbiAgICAgICAgICAgIF9kYXRhOiBudWxsLFxuICAgICAgICAgICAgX3BhdGg6IHsgX19pZF9fOiAyIH0sXG4gICAgICAgICAgICBfY2hhbm5lbHM6IFt7IF9faWRfXzogMyB9XSxcbiAgICAgICAgICAgIF9uR3JvdXBzOiAwLFxuICAgICAgICAgICAgX29wdDogMFxuICAgICAgICB9LFxuICAgICAgICB7IC8vIFsyXSBUcmFja1BhdGggKGNvbXBvbmVudD1jYy5TcHJpdGUgKyBwcm9wZXJ0eT1zcHJpdGVGcmFtZSlcbiAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuYW5pbWF0aW9uLlRyYWNrUGF0aCcsXG4gICAgICAgICAgICBfcGF0aHM6IFtcbiAgICAgICAgICAgICAgICB7IF9faWRfXzogNCB9LCAgLy8gQ29tcG9uZW50UGF0aFxuICAgICAgICAgICAgICAgICdzcHJpdGVGcmFtZScgICAgLy8gcHJvcGVydHlcbiAgICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgeyAvLyBbM10gQ2hhbm5lbFxuICAgICAgICAgICAgX190eXBlX186ICdjYy5hbmltYXRpb24uQ2hhbm5lbCcsXG4gICAgICAgICAgICBfY3VydmU6IHsgX19pZF9fOiA2IH0sXG4gICAgICAgICAgICBfcHJveHk6IG51bGxcbiAgICAgICAgfSxcbiAgICAgICAgeyAvLyBbNF0gQ29tcG9uZW50UGF0aFxuICAgICAgICAgICAgX190eXBlX186ICdjYy5hbmltYXRpb24uQ29tcG9uZW50UGF0aCcsXG4gICAgICAgICAgICBjb21wb25lbnQ6ICdjYy5TcHJpdGUnXG4gICAgICAgIH0sXG4gICAgICAgIHsgLy8gWzVdIEFuaW1hdGlvbkNsaXBBZGRpdGl2ZVNldHRpbmdzXG4gICAgICAgICAgICBfX3R5cGVfXzogJ2NjLkFuaW1hdGlvbkNsaXBBZGRpdGl2ZVNldHRpbmdzJyxcbiAgICAgICAgICAgIGFkZGl0aXZlRmxhZ3M6IDAsXG4gICAgICAgICAgICByZWZlcmVuY2VDbGlwOiBudWxsXG4gICAgICAgIH0sXG4gICAgICAgIHsgLy8gWzZdIE9iamVjdEN1cnZlXG4gICAgICAgICAgICBfX3R5cGVfXzogJ2NjLk9iamVjdEN1cnZlJyxcbiAgICAgICAgICAgIF90aW1lczogdGltZXMsXG4gICAgICAgICAgICBfdmFsdWVzOiB2YWx1ZXMsXG4gICAgICAgICAgICBfaW5kZXhlZFZhbHVlczogbnVsbCxcbiAgICAgICAgICAgIF9wcmVFeHRyYXBvbGF0aW9uOiAxLFxuICAgICAgICAgICAgX3Bvc3RFeHRyYXBvbGF0aW9uOiAxXG4gICAgICAgIH1cbiAgICBdO1xuICAgIHJldHVybiBhcnI7XG59XG4iXX0=