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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUtaW1wbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9zY2VuZS1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBOzs7O0dBSUc7QUFDSCwrQkFBNEI7QUFDNUIsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBQSxXQUFJLEVBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztBQUV6RCxtQ0FBbUM7QUFFbkMsd0RBQXdEO0FBQ3hELFNBQVMsa0JBQWtCLENBQUMsSUFBUyxFQUFFLFFBQWdCO0lBQ25ELElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRO1FBQUUsT0FBTyxJQUFJLENBQUM7SUFDcEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFFBQVE7UUFBRSxPQUFPLElBQUksQ0FBQztJQUN4QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBQztJQUNyQyxLQUFLLE1BQU0sS0FBSyxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQzNCLE1BQU0sS0FBSyxHQUFHLGtCQUFrQixDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNsRCxJQUFJLEtBQUs7WUFBRSxPQUFPLEtBQUssQ0FBQztJQUM1QixDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDaEIsQ0FBQztBQUVELHVDQUF1QztBQUN2QyxTQUFTLGFBQWEsQ0FBQyxJQUFTLEVBQUUsRUFBTztJQUNyQyxNQUFNLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBUyxFQUFFLEtBQWEsRUFBRSxFQUFFO1FBQ25FLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7UUFDOUIsSUFBSSxHQUFXLENBQUM7UUFDaEIsSUFBSSxDQUFDO1lBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxV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QUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDckIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFDOUMsT0FBTyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1FBQy9DLENBQUM7UUFDRCx5REFBeUQ7UUFDekQsbURBQW1EO1FBQ25ELElBQUksR0FBRyxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUM7WUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUM1RSxTQUFTO1FBQ1QsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDO1lBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDL0UsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUM7WUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNoRSxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO1lBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFF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LEVBQUUsQ0FBQztZQUNYLElBQUksRUFBRSxDQUFDO1NBQ1Y7UUFDRDtZQUNJLFFBQVEsRUFBRSx3QkFBd0I7WUFDbEMsTUFBTSxFQUFFO2dCQUNKLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFHLGdCQUFnQjtnQkFDaEMsYUFBYSxDQUFJLFdBQVc7YUFDL0I7U0FDSjtRQUNEO1lBQ0ksUUFBUSxFQUFFLHNCQUFzQjtZQUNoQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO1lBQ3JCLE1BQU0sRUFBRSxJQUFJO1NBQ2Y7UUFDRDtZQUNJLFFBQVEsRUFBRSw0QkFBNEI7WUFDdEMsU0FBUyxFQUFFLFdBQVc7U0FDekI7UUFDRDtZQUNJLFFBQVEsRUFBRSxrQ0FBa0M7WUFDNUMsYUFBYSxFQUFFLENBQUM7WUFDaEIsYUFBYSxFQUFFLElBQUk7U0FDdEI7UUFDRDtZQUNJLFFBQVEsRUFBRSxnQkFBZ0I7WUFDMUIsTUFBTSxFQUFFLEtBQUs7WUFDYixPQUFPLEVBQUUsTUFBTTtZQUNmLGNBQWMsRUFBRSxJQUFJO1lBQ3BCLGlCQUFpQixFQUFFLENBQUM7WUFDcEIsa0JBQWtCLEVBQUUsQ0FBQztTQUN4QjtLQUNKLENBQUM7SUFDRixPQUFPLEdBQUcsQ0FBQztBQUNmLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIOWcuuaZr+iEmuacrOWunueOsOWxgijnlLEgc2NlbmUudHMg5Luj55CG5Yqg6L29LOaUr+aMgeeDremHjei9vSnjgIJcbiAqXG4gKiDmraTmlofku7bmlLnliqjlkI4sdHNjIOe8luivkSArIGNwIOWIsCBkaXN0LyzkuIvkuIDmrKEgbWV0aG9kIOiwg+eUqOWNs+eUn+aViCjml6DpnIDph43lkK/nvJbovpHlmagp44CCXG4gKi9cbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcbm1vZHVsZS5wYXRocy5wdXNoKGpvaW4oRWRpdG9yLkFwcC5wYXRoLCAnbm9kZV9tb2R1bGVzJykpO1xuXG4vLyA9PT09PT09PT09PT0g5YWx5Lqr6L6F5Yqp5Ye95pWwID09PT09PT09PT09PVxuXG4vKiog5rex5bqm6YCS5b2S5p+l5om+6IqC54K5KOWOnyBzY2VuZS5nZXRDaGlsZEJ5VXVpZCDku4XmkJznm7TmjqXlrZDoioLngrks5a2Z6IqC54K55rC46L+c5om+5LiN5YiwKSAqL1xuZnVuY3Rpb24gZmluZE5vZGVCeVV1aWREZWVwKHJvb3Q6IGFueSwgbm9kZVV1aWQ6IHN0cmluZyk6IGFueSB7XG4gICAgaWYgKCFyb290IHx8ICFub2RlVXVpZCkgcmV0dXJuIG51bGw7XG4gICAgaWYgKHJvb3QudXVpZCA9PT0gbm9kZVV1aWQpIHJldHVybiByb290O1xuICAgIGNvbnN0IGNoaWxkcmVuID0gcm9vdC5jaGlsZHJlbiB8fCBbXTtcbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGNoaWxkcmVuKSB7XG4gICAgICAgIGNvbnN0IGZvdW5kID0gZmluZE5vZGVCeVV1aWREZWVwKGNoaWxkLCBub2RlVXVpZCk7XG4gICAgICAgIGlmIChmb3VuZCkgcmV0dXJuIGZvdW5kO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cblxuLyoqIOaKiui/kOihjOaXtuiKgueCueW9kuS4gOWMluS4uueos+Wumue7k+aehCzkvpsgd3JhcHBlciDkuI7pqozor4Hnu5/kuIDmtojotLkgKi9cbmZ1bmN0aW9uIGJ1aWxkTm9kZUluZm8obm9kZTogYW55LCBqczogYW55KTogYW55IHtcbiAgICBjb25zdCBjb21wcyA9IChub2RlLmNvbXBvbmVudHMgfHwgW10pLm1hcCgoY29tcDogYW55LCBpbmRleDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGNvbnN0IGN0b3IgPSBjb21wLmNvbnN0cnVjdG9yO1xuICAgICAgICBsZXQgY2lkOiBzdHJpbmc7XG4gICAgICAgIHRyeSB7IGNpZCA9IGpzLmdldENsYXNzSWQoY3Rvcik7IH0gY2F0Y2ggeyBjaWQgPSBjdG9yLm5hbWU7IH1cbiAgICAgICAgbGV0IGNvbXBVdWlkOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgICAgICAgdHJ5IHsgY29tcFV1aWQgPSBjb21wLnV1aWQgfHwgbnVsbDsgfSBjYXRjaCB7IC8qIGlnbm9yZSAqLyB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjaWQ6IGNpZCB8fCBjdG9yLm5hbWUsXG4gICAgICAgICAgICBuYW1lOiBjdG9yLm5hbWUsXG4gICAgICAgICAgICBpbmRleCxcbiAgICAgICAgICAgIHV1aWQ6IGNvbXBVdWlkLFxuICAgICAgICAgICAgZW5hYmxlZDogY29tcC5lbmFibGVkXG4gICAgICAgIH07XG4gICAgfSk7XG4gICAgY29uc3Qgd3AgPSBub2RlLndvcmxkUG9zaXRpb24gPyB7IHg6IG5vZGUud29ybGRQb3NpdGlvbi54LCB5OiBub2RlLndvcmxkUG9zaXRpb24ueSwgejogbm9kZS53b3JsZFBvc2l0aW9uLnogfSA6IG51bGw7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdXVpZDogbm9kZS51dWlkLFxuICAgICAgICBuYW1lOiBub2RlLm5hbWUsXG4gICAgICAgIGFjdGl2ZTogbm9kZS5hY3RpdmUsXG4gICAgICAgIGxheWVyOiBub2RlLmxheWVyLFxuICAgICAgICBwb3NpdGlvbjogeyB4OiBub2RlLnBvc2l0aW9uLngsIHk6IG5vZGUucG9zaXRpb24ueSwgejogbm9kZS5wb3NpdGlvbi56IH0sXG4gICAgICAgIHJvdGF0aW9uOiB7IHg6IG5vZGUucm90YXRpb24ueCwgeTogbm9kZS5yb3RhdGlvbi55LCB6OiBub2RlLnJvdGF0aW9uLnosIHc6IG5vZGUucm90YXRpb24udyB9LFxuICAgICAgICBzY2FsZTogeyB4OiBub2RlLnNjYWxlLngsIHk6IG5vZGUuc2NhbGUueSwgejogbm9kZS5zY2FsZS56IH0sXG4gICAgICAgIHdvcmxkUG9zaXRpb246IHdwLFxuICAgICAgICBwYXJlbnQ6IG5vZGUucGFyZW50ID8gbm9kZS5wYXJlbnQudXVpZCA6IG51bGwsXG4gICAgICAgIGNoaWxkcmVuOiAobm9kZS5jaGlsZHJlbiB8fCBbXSkubWFwKChjaGlsZDogYW55KSA9PiBjaGlsZC51dWlkKSxcbiAgICAgICAgY29tcG9uZW50czogY29tcHNcbiAgICB9O1xufVxuXG4vKiog5oyJ57uE5Lu257G75Z6L5p+l5om+6IqC54K55LiK55qE57uE5Lu25a6e5L6LKOaUr+aMgSBGUU4gJ2NjLlNwcml0ZScg5LiO55+t5ZCNICdTcHJpdGUnKSAqL1xuZnVuY3Rpb24gZmluZENvbXBvbmVudE9uTm9kZShub2RlOiBhbnksIGNvbXBvbmVudFR5cGU6IHN0cmluZywganM6IGFueSk6IGFueSB7XG4gICAgY29uc3Qgbm9ybWFsaXplID0gKHM6IHN0cmluZykgPT4gKHMgfHwgJycpLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvXmNjXFwuLywgJycpO1xuICAgIGNvbnN0IHRhcmdldCA9IG5vcm1hbGl6ZShjb21wb25lbnRUeXBlKTtcbiAgICBjb25zdCBjb21wcyA9IG5vZGUuY29tcG9uZW50cyB8fCBbXTtcbiAgICBmb3IgKGNvbnN0IGNvbXAgb2YgY29tcHMpIHtcbiAgICAgICAgbGV0IGNpZCA9ICcnO1xuICAgICAgICB0cnkgeyBjaWQgPSBqcy5nZXRDbGFzc0lkKGNvbXAuY29uc3RydWN0b3IpIHx8ICcnOyB9IGNhdGNoIHsgLyogaWdub3JlICovIH1cbiAgICAgICAgaWYgKG5vcm1hbGl6ZShjaWQpID09PSB0YXJnZXQgfHwgbm9ybWFsaXplKGNvbXAuY29uc3RydWN0b3IubmFtZSkgPT09IHRhcmdldCkge1xuICAgICAgICAgICAgcmV0dXJuIGNvbXA7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59XG5cbi8qKiDmj5Dlj5bnu4Tku7blrp7kvovnmoTlj6/mnprkuL7lsZ7mgKflgLws6Lez6L+H5byV5pOO5YaF6YOoIGBfYCDliY3nvIDlrZfmrrUgKi9cbmZ1bmN0aW9uIGV4dHJhY3RDb21wb25lbnRQcm9wcyhjb21wOiBhbnkpOiBSZWNvcmQ8c3RyaW5nLCBhbnk+IHtcbiAgICBjb25zdCByZXN1bHQ6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcbiAgICBsZXQgcHJvdG8gPSBjb21wO1xuICAgIGNvbnN0IHNlZW4gPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICB3aGlsZSAocHJvdG8gJiYgcHJvdG8gIT09IE9iamVjdC5wcm90b3R5cGUpIHtcbiAgICAgICAgY29uc3QgbmFtZXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhwcm90byk7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIG5hbWVzKSB7XG4gICAgICAgICAgICBpZiAoc2Vlbi5oYXMoa2V5KSkgY29udGludWU7XG4gICAgICAgICAgICBzZWVuLmFkZChrZXkpO1xuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdfJykpIGNvbnRpbnVlO1xuICAgICAgICAgICAgaWYgKGtleSA9PT0gJ25vZGUnIHx8IGtleSA9PT0gJ2VuYWJsZWQnIHx8IGtleSA9PT0gJ2VuYWJsZWRJbkhpZXJhcmNoeScpIGNvbnRpbnVlO1xuICAgICAgICAgICAgbGV0IHZhbDogYW55O1xuICAgICAgICAgICAgdHJ5IHsgdmFsID0gY29tcFtrZXldOyB9IGNhdGNoIHsgY29udGludWU7IH1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsID09PSAnZnVuY3Rpb24nKSBjb250aW51ZTtcbiAgICAgICAgICAgIHJlc3VsdFtrZXldID0gbm9ybWFsaXplVmFsdWUodmFsKTtcbiAgICAgICAgfVxuICAgICAgICBwcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihwcm90byk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKiDmiorov5DooYzml7blgLzlvZLkuIDljJbkuLrlj68gSlNPTiDljJbnmoTnroDljZXnu5PmnoQgKi9cbmZ1bmN0aW9uIG5vcm1hbGl6ZVZhbHVlKHZhbDogYW55KTogYW55IHtcbiAgICBpZiAodmFsID09PSBudWxsIHx8IHZhbCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdmFsO1xuICAgIGlmICh0eXBlb2YgdmFsICE9PSAnb2JqZWN0JykgcmV0dXJuIHZhbDtcblxuICAgIC8vIDEuIOi1hOS6p+W8leeUqOS8mOWFiChTcHJpdGVGcmFtZS9UZXh0dXJlL01hdGVyaWFsL0F1ZGlvQ2xpcCDnrYnpg73mnIkgdXVpZCxcbiAgICAvLyAgICDkuJQgU3ByaXRlRnJhbWUg6L+Y5pq06ZyyIHdpZHRoL2hlaWdodCBnZXR0ZXIs5Lya6KKr5LiL6Z2i55qEIFNpemUg5YiG5pSv6K+v5ZCeKVxuICAgIGlmICh2YWwuX3V1aWQgfHwgKHZhbC51dWlkICYmIHR5cGVvZiB2YWwudXVpZCA9PT0gJ3N0cmluZycpKSB7XG4gICAgICAgIHJldHVybiB7IHV1aWQ6IHZhbC5fdXVpZCB8fCB2YWwudXVpZCwgdHlwZTogdmFsLmNvbnN0cnVjdG9yID8gdmFsLmNvbnN0cnVjdG9yLm5hbWUgOiAnQXNzZXQnIH07XG4gICAgfVxuXG4gICAgY29uc3QgaGFzID0gKC4uLmtzOiBzdHJpbmdbXSkgPT4ga3MuZXZlcnkoayA9PiBrIGluIHZhbCk7XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gMi4gQ29sb3IgKHJnYmEpXG4gICAgICAgIGlmIChoYXMoJ3InLCAnZycsICdiJykpIHtcbiAgICAgICAgICAgIGNvbnN0IGEgPSAodmFsLmEgIT09IHVuZGVmaW5lZCkgPyB2YWwuYSA6IDI1NTtcbiAgICAgICAgICAgIHJldHVybiB7IHI6IHZhbC5yLCBnOiB2YWwuZywgYjogdmFsLmIsIGEgfTtcbiAgICAgICAgfVxuICAgICAgICAvLyAzLiBTaXplIOW/hemhu+WcqCBWZWMyIOS5i+WJjTpDb2NvcyBTaXplIOaciSB4L3kg5Yir5ZCNKFNpemUueD13aWR0aCksXG4gICAgICAgIC8vICAgIOiLpeWFiOafpSB4L3kg5Lya5oqKIFNpemUg6K+v5Yik5Li6IFZlYzIoY29udGVudFNpemUg6aqM6K+B5YGH6Zi05oCn5qC55ZugKVxuICAgICAgICBpZiAoaGFzKCd3aWR0aCcsICdoZWlnaHQnKSkgcmV0dXJuIHsgd2lkdGg6IHZhbC53aWR0aCwgaGVpZ2h0OiB2YWwuaGVpZ2h0IH07XG4gICAgICAgIC8vIDQuIFZlY1xuICAgICAgICBpZiAoaGFzKCd4JywgJ3knLCAneicsICd3JykpIHJldHVybiB7IHg6IHZhbC54LCB5OiB2YWwueSwgejogdmFsLnosIHc6IHZhbC53IH07XG4gICAgICAgIGlmIChoYXMoJ3gnLCAneScsICd6JykpIHJldHVybiB7IHg6IHZhbC54LCB5OiB2YWwueSwgejogdmFsLnogfTtcbiAgICAgICAgaWYgKGhhcygneCcsICd5JykpIHJldHVybiB7IHg6IHZhbC54LCB5OiB2YWwueSB9O1xuICAgIH0gY2F0Y2ggeyAvKiBmYWxsdGhyb3VnaCAqLyB9XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgICByZXR1cm4gdmFsLnNsaWNlKDAsIDY0KS5tYXAobm9ybWFsaXplVmFsdWUpO1xuICAgIH1cbiAgICBjb25zdCBvdXQ6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcbiAgICBjb25zdCBzZWVuID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgbGV0IHByb3RvID0gdmFsO1xuICAgIGxldCBjb3VudCA9IDA7XG4gICAgd2hpbGUgKHByb3RvICYmIHByb3RvICE9PSBPYmplY3QucHJvdG90eXBlICYmIGNvdW50IDwgMzIpIHtcbiAgICAgICAgZm9yIChjb25zdCBrIG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHByb3RvKSkge1xuICAgICAgICAgICAgaWYgKHNlZW4uaGFzKGspIHx8IGsuc3RhcnRzV2l0aCgnXycpKSBjb250aW51ZTtcbiAgICAgICAgICAgIHNlZW4uYWRkKGspO1xuICAgICAgICAgICAgaWYgKFsnbm9kZScsICdlbmFibGVkJywgJ2VuYWJsZWRJbkhpZXJhcmNoeScsICdjb25zdHJ1Y3RvciddLmluY2x1ZGVzKGspKSBjb250aW51ZTtcbiAgICAgICAgICAgIGxldCB2OiBhbnk7XG4gICAgICAgICAgICB0cnkgeyB2ID0gdmFsW2tdOyB9IGNhdGNoIHsgY29udGludWU7IH1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgdiA9PT0gJ2Z1bmN0aW9uJykgY29udGludWU7XG4gICAgICAgICAgICBvdXRba10gPSAodiAhPT0gbnVsbCAmJiB0eXBlb2YgdiA9PT0gJ29iamVjdCcpID8gJ1tvYmplY3RdJyA6IHY7XG4gICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgaWYgKGNvdW50ID49IDMyKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBwcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihwcm90byk7XG4gICAgfVxuICAgIHJldHVybiBvdXQ7XG59XG5cbmV4cG9ydCBjb25zdCBtZXRob2RzOiB7IFtrZXk6IHN0cmluZ106ICguLi5hbnk6IGFueSkgPT4gYW55IH0gPSB7XG4gICAgLyoqXG4gICAgICog6K+K5patOmFzeW5jIOaWueazleaYr+WQpuiiqyBleGVjdXRlLXNjZW5lLXNjcmlwdCDmlK/mjIEo5Lmf55So5LqO6aqM6K+B5Luj55CG54Ot6YeN6L296ZO+6LevKVxuICAgICAqL1xuICAgIGFzeW5jIHRlc3RBc3luY01ldGhvZChkZWxheU1zOiBudW1iZXIpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHIgPT4gc2V0VGltZW91dChyLCBkZWxheU1zIHx8IDEwMCkpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyBtc2c6ICdhc3luYyBtZXRob2QgZXhlY3V0ZWQgdjInLCBkZWxheTogZGVsYXlNcyB8fCAxMDAgfSB9O1xuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZS5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgY3JlYXRlTmV3U2NlbmUoKSB7ICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciwgU2NlbmUgfSA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IG5ldyBTY2VuZSgpO1xuICAgICAgICAgICAgc2NlbmUubmFtZSA9ICdOZXcgU2NlbmUnO1xuICAgICAgICAgICAgZGlyZWN0b3IucnVuU2NlbmUoc2NlbmUpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogJ05ldyBzY2VuZSBjcmVhdGVkIHN1Y2Nlc3NmdWxseScgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgYWRkQ29tcG9uZW50VG9Ob2RlKG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciwganMgfSA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IGRpcmVjdG9yLmdldFNjZW5lKCk7XG4gICAgICAgICAgICBpZiAoIXNjZW5lKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICBjb25zdCBub2RlID0gZmluZE5vZGVCeVV1aWREZWVwKHNjZW5lLCBub2RlVXVpZCk7XG4gICAgICAgICAgICBpZiAoIW5vZGUpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vZGUgd2l0aCBVVUlEICR7bm9kZVV1aWR9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIGNvbnN0IENvbXBvbmVudENsYXNzID0ganMuZ2V0Q2xhc3NCeU5hbWUoY29tcG9uZW50VHlwZSk7XG4gICAgICAgICAgICBpZiAoIUNvbXBvbmVudENsYXNzKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgdHlwZSAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudCA9IG5vZGUuYWRkQ29tcG9uZW50KENvbXBvbmVudENsYXNzKTtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBDb21wb25lbnQgJHtjb21wb25lbnRUeXBlfSBhZGRlZGAsIGRhdGE6IHsgY29tcG9uZW50SWQ6IGNvbXBvbmVudC51dWlkIH0gfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgcmVtb3ZlQ29tcG9uZW50RnJvbU5vZGUobm9kZVV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yLCBqcyB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBmaW5kTm9kZUJ5VXVpZERlZXAoc2NlbmUsIG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGlmICghbm9kZSkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSB3aXRoIFVVSUQgJHtub2RlVXVpZH0gbm90IGZvdW5kYCB9O1xuICAgICAgICAgICAgY29uc3QgQ29tcG9uZW50Q2xhc3MgPSBqcy5nZXRDbGFzc0J5TmFtZShjb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgIGlmICghQ29tcG9uZW50Q2xhc3MpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCB0eXBlICR7Y29tcG9uZW50VHlwZX0gbm90IGZvdW5kYCB9O1xuICAgICAgICAgICAgY29uc3QgY29tcG9uZW50ID0gbm9kZS5nZXRDb21wb25lbnQoQ29tcG9uZW50Q2xhc3MpO1xuICAgICAgICAgICAgaWYgKCFjb21wb25lbnQpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZCBvbiBub2RlYCB9O1xuICAgICAgICAgICAgbm9kZS5yZW1vdmVDb21wb25lbnQoY29tcG9uZW50KTtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBDb21wb25lbnQgJHtjb21wb25lbnRUeXBlfSByZW1vdmVkYCB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBjcmVhdGVOb2RlKG5hbWU6IHN0cmluZywgcGFyZW50VXVpZD86IHN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciwgTm9kZSB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBuZXcgTm9kZShuYW1lKTtcbiAgICAgICAgICAgIGlmIChwYXJlbnRVdWlkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyZW50ID0gZmluZE5vZGVCeVV1aWREZWVwKHNjZW5lLCBwYXJlbnRVdWlkKTtcbiAgICAgICAgICAgICAgICBpZiAocGFyZW50KSBwYXJlbnQuYWRkQ2hpbGQobm9kZSk7IGVsc2Ugc2NlbmUuYWRkQ2hpbGQobm9kZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNjZW5lLmFkZENoaWxkKG5vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYE5vZGUgJHtuYW1lfSBjcmVhdGVkYCwgZGF0YTogeyB1dWlkOiBub2RlLnV1aWQsIG5hbWU6IG5vZGUubmFtZSB9IH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIOiOt+WPluiKgueCueS/oeaBryjlvZLkuIDljJYp44CCY29tcG9uZW50cyDlkKsgY2lkKEZRTikrIG5hbWUo55+t5ZCNKSsgaW5kZXjjgIJcbiAgICAgKi9cbiAgICBnZXROb2RlSW5mbyhub2RlVXVpZDogc3RyaW5nKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yLCBqcyB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBmaW5kTm9kZUJ5VXVpZERlZXAoc2NlbmUsIG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGlmICghbm9kZSkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSB3aXRoIFVVSUQgJHtub2RlVXVpZH0gbm90IGZvdW5kYCB9O1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogYnVpbGROb2RlSW5mbyhub2RlLCBqcykgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICog6I635Y+W5Y2V5Liq57uE5Lu26K+m5oOFOuaJgOacieWPr+aemuS4vuWunuS+i+WxnuaAp+eahOWAvCznlKjkuo4gc2V0LXByb3BlcnR5IOWGmeWQjuecn+WunumqjOivgeivu+WbnuOAglxuICAgICAqL1xuICAgIGdldENvbXBvbmVudERldGFpbChub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IsIGpzIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IGZpbmROb2RlQnlVdWlkRGVlcChzY2VuZSwgbm9kZVV1aWQpO1xuICAgICAgICAgICAgaWYgKCFub2RlKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIHdpdGggVVVJRCAke25vZGVVdWlkfSBub3QgZm91bmRgIH07XG4gICAgICAgICAgICBjb25zdCBjb21wID0gZmluZENvbXBvbmVudE9uTm9kZShub2RlLCBjb21wb25lbnRUeXBlLCBqcyk7XG4gICAgICAgICAgICBpZiAoIWNvbXApIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZCBvbiBub2RlICR7bm9kZS5uYW1lfWAgfTtcbiAgICAgICAgICAgIGNvbnN0IHByb3BzID0gZXh0cmFjdENvbXBvbmVudFByb3BzKGNvbXApO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHsgY2lkOiBqcy5nZXRDbGFzc0lkKGNvbXAuY29uc3RydWN0b3IpLCBuYW1lOiBjb21wLmNvbnN0cnVjdG9yLm5hbWUsIGVuYWJsZWQ6IGNvbXAuZW5hYmxlZCwgcHJvcGVydGllczogcHJvcHMgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICog6I635Y+W6IqC54K55qCRKOW9kuS4gOWMluW1jOWllyzlkKsgY29tcG9uZW50cyBjaWQp44CCXG4gICAgICovXG4gICAgZ2V0QWxsTm9kZXMoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yLCBqcyB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIGNvbnN0IGJ1aWxkVHJlZSA9IChub2RlOiBhbnkpOiBhbnkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBzID0gKG5vZGUuY29tcG9uZW50cyB8fCBbXSkubWFwKChjb21wOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGNpZCA9ICcnO1xuICAgICAgICAgICAgICAgICAgICB0cnkgeyBjaWQgPSBqcy5nZXRDbGFzc0lkKGNvbXAuY29uc3RydWN0b3IpIHx8ICcnOyB9IGNhdGNoIHsgLyogaWdub3JlICovIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNpZCB8fCBjb21wLmNvbnN0cnVjdG9yLm5hbWU7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogbm9kZS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlLnV1aWQsXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZTogbm9kZS5hY3RpdmUsXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudDogbm9kZS5wYXJlbnQgPyBub2RlLnBhcmVudC51dWlkIDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50czogY29tcHMsXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiAobm9kZS5jaGlsZHJlbiB8fCBbXSkubWFwKChjaGlsZDogYW55KSA9PiBidWlsZFRyZWUoY2hpbGQpKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogYnVpbGRUcmVlKHNjZW5lKSB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBmaW5kTm9kZUJ5TmFtZShuYW1lOiBzdHJpbmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IgfSA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IGRpcmVjdG9yLmdldFNjZW5lKCk7XG4gICAgICAgICAgICBpZiAoIXNjZW5lKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICBjb25zdCBub2RlID0gc2NlbmUuZ2V0Q2hpbGRCeU5hbWUobmFtZSk7XG4gICAgICAgICAgICBpZiAoIW5vZGUpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vZGUgd2l0aCBuYW1lICR7bmFtZX0gbm90IGZvdW5kYCB9O1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyB1dWlkOiBub2RlLnV1aWQsIG5hbWU6IG5vZGUubmFtZSwgYWN0aXZlOiBub2RlLmFjdGl2ZSwgcG9zaXRpb246IG5vZGUucG9zaXRpb24gfSB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBnZXRDdXJyZW50U2NlbmVJbmZvKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgbmFtZTogc2NlbmUubmFtZSwgdXVpZDogc2NlbmUudXVpZCwgbm9kZUNvdW50OiBzY2VuZS5jaGlsZHJlbi5sZW5ndGggfSB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBzZXROb2RlUHJvcGVydHkobm9kZVV1aWQ6IHN0cmluZywgcHJvcGVydHk6IHN0cmluZywgdmFsdWU6IGFueSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBmaW5kTm9kZUJ5VXVpZERlZXAoc2NlbmUsIG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGlmICghbm9kZSkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSB3aXRoIFVVSUQgJHtub2RlVXVpZH0gbm90IGZvdW5kYCB9O1xuICAgICAgICAgICAgaWYgKHByb3BlcnR5ID09PSAncG9zaXRpb24nKSBub2RlLnNldFBvc2l0aW9uKHZhbHVlLnggfHwgMCwgdmFsdWUueSB8fCAwLCB2YWx1ZS56IHx8IDApO1xuICAgICAgICAgICAgZWxzZSBpZiAocHJvcGVydHkgPT09ICdyb3RhdGlvbicpIG5vZGUuc2V0Um90YXRpb25Gcm9tRXVsZXIodmFsdWUueCB8fCAwLCB2YWx1ZS55IHx8IDAsIHZhbHVlLnogfHwgMCk7XG4gICAgICAgICAgICBlbHNlIGlmIChwcm9wZXJ0eSA9PT0gJ3NjYWxlJykgbm9kZS5zZXRTY2FsZSh2YWx1ZS54IHx8IDEsIHZhbHVlLnkgfHwgMSwgdmFsdWUueiB8fCAxKTtcbiAgICAgICAgICAgIGVsc2UgaWYgKHByb3BlcnR5ID09PSAnYWN0aXZlJykgbm9kZS5hY3RpdmUgPSB2YWx1ZTtcbiAgICAgICAgICAgIGVsc2UgaWYgKHByb3BlcnR5ID09PSAnbmFtZScpIG5vZGUubmFtZSA9IHZhbHVlO1xuICAgICAgICAgICAgZWxzZSAobm9kZSBhcyBhbnkpW3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYFByb3BlcnR5ICcke3Byb3BlcnR5fScgdXBkYXRlZGAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgZ2V0U2NlbmVIaWVyYXJjaHkoaW5jbHVkZUNvbXBvbmVudHM6IGJvb2xlYW4gPSBmYWxzZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NOb2RlID0gKG5vZGU6IGFueSk6IGFueSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSB7IG5hbWU6IG5vZGUubmFtZSwgdXVpZDogbm9kZS51dWlkLCBhY3RpdmU6IG5vZGUuYWN0aXZlLCBjaGlsZHJlbjogW10gfTtcbiAgICAgICAgICAgICAgICBpZiAoaW5jbHVkZUNvbXBvbmVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmNvbXBvbmVudHMgPSBub2RlLmNvbXBvbmVudHMubWFwKChjb21wOiBhbnkpID0+ICh7IHR5cGU6IGNvbXAuY29uc3RydWN0b3IubmFtZSwgZW5hYmxlZDogY29tcC5lbmFibGVkIH0pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG5vZGUuY2hpbGRyZW4gJiYgbm9kZS5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5jaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4ubWFwKChjaGlsZDogYW55KSA9PiBwcm9jZXNzTm9kZShjaGlsZCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHNjZW5lLmNoaWxkcmVuLm1hcCgoY2hpbGQ6IGFueSkgPT4gcHJvY2Vzc05vZGUoY2hpbGQpKSB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBjcmVhdGVQcmVmYWJGcm9tTm9kZShub2RlVXVpZDogc3RyaW5nLCBwcmVmYWJQYXRoOiBzdHJpbmcpIHtcbiAgICAgICAgLy8g55yf5q2j55qEIHByZWZhYiDliJvlu7rnlKggcHJlZmFiX2NyZWF0ZV9wcmVmYWIg5bel5YW3KHByZWZhYi10b29scyks6L+Z6YeM5LuF5L+d55WZ5o6l5Y+j5YW85a65XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ+S9v+eUqCBwcmVmYWJfY3JlYXRlX3ByZWZhYiDlt6Xlhbfmm7/ku6PlnLrmma/ohJrmnKwgY3JlYXRlUHJlZmFiRnJvbU5vZGUnIH07XG4gICAgfSxcblxuICAgIHNldENvbXBvbmVudFByb3BlcnR5KG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZywgcHJvcGVydHk6IHN0cmluZywgdmFsdWU6IGFueSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciwganMgfSA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IGRpcmVjdG9yLmdldFNjZW5lKCk7XG4gICAgICAgICAgICBpZiAoIXNjZW5lKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICBjb25zdCBub2RlID0gZmluZE5vZGVCeVV1aWREZWVwKHNjZW5lLCBub2RlVXVpZCk7XG4gICAgICAgICAgICBpZiAoIW5vZGUpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vZGUgd2l0aCBVVUlEICR7bm9kZVV1aWR9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIGNvbnN0IENvbXBvbmVudENsYXNzID0ganMuZ2V0Q2xhc3NCeU5hbWUoY29tcG9uZW50VHlwZSk7XG4gICAgICAgICAgICBpZiAoIUNvbXBvbmVudENsYXNzKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgdHlwZSAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudCA9IG5vZGUuZ2V0Q29tcG9uZW50KENvbXBvbmVudENsYXNzKTtcbiAgICAgICAgICAgIGlmICghY29tcG9uZW50KSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgJHtjb21wb25lbnRUeXBlfSBub3QgZm91bmQgb24gbm9kZWAgfTtcbiAgICAgICAgICAgIC8vIOi1hOS6p+exu+WxnuaApyhzcHJpdGVGcmFtZS9tYXRlcmlhbCnmjIkgdXVpZCDliqDovb1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnICYmIChwcm9wZXJ0eSA9PT0gJ3Nwcml0ZUZyYW1lJyB8fCBwcm9wZXJ0eSA9PT0gJ21hdGVyaWFsJykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBhc3NldE1hbmFnZXIgPSByZXF1aXJlKCdjYycpLmFzc2V0TWFuYWdlcjtcbiAgICAgICAgICAgICAgICBjb25zdCBBc3NldFR5cGUgPSBwcm9wZXJ0eSA9PT0gJ3Nwcml0ZUZyYW1lJyA/IHJlcXVpcmUoJ2NjJykuU3ByaXRlRnJhbWUgOiByZXF1aXJlKCdjYycpLk1hdGVyaWFsO1xuICAgICAgICAgICAgICAgIGFzc2V0TWFuYWdlci5sb2FkQW55KHsgdXVpZDogdmFsdWUsIHR5cGU6IEFzc2V0VHlwZSB9LCAoZXJyOiBhbnksIGFzc2V0OiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFlcnIgJiYgYXNzZXQpIChjb21wb25lbnQgYXMgYW55KVtwcm9wZXJ0eV0gPSBhc3NldDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgKGNvbXBvbmVudCBhcyBhbnkpW3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYENvbXBvbmVudCBwcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nIHVwZGF0ZWRgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIOWIm+W7uuW6j+WIl+W4p+WKqOeUu+OAglxuICAgICAqIC0g5Li76Lev5b6EOuWKoOi9vSBTcHJpdGVGcmFtZSDihpIgQW5pbWF0aW9uQ2xpcC5jcmVhdGVXaXRoU3ByaXRlRnJhbWVzIOKGkiBFZGl0b3JFeHRlbmRzLnNlcmlhbGl6ZVxuICAgICAqIC0g5YWc5bqV6Lev5b6EKHV1aWQtb25seSk66IulIFNwcml0ZUZyYW1lIOWKoOi9veWksei0pSznm7TmjqXmjIkgdXVpZCDmiYvlu7ogLmFuaW0gSlNPTlxuICAgICAqICAgKOi/kOihjOaXti9wcmV2aWV3IOS8muaMiSB1dWlkIOino+aekCzml6DpnIDnvJbovpHlmajmgIHliqDovb3lrp7pmYXotYTkuqcpXG4gICAgICogLSBjcmVhdGUtYXNzZXQg55qEIGNvbnRlbnQg5b+F6aG7IEpTT04uc3RyaW5naWZ5IOaIkOWtl+espuS4sijkv67lpI3ml6fniYjkvKAgb2JqZWN0IOWvvOiHtOepuumUmeivrylcbiAgICAgKiAtIOWFqOeoi+iusOW9lSBzdGFnZXMs5aSx6LSl5pe26L+U5Zue6YOo5YiG6L+b5bqm5L6/5LqO5a6a5L2NXG4gICAgICovXG4gICAgYXN5bmMgY3JlYXRlU3ByaXRlRnJhbWVBbmltYXRpb24obm9kZVV1aWQ6IHN0cmluZywgc3ByaXRlRnJhbWVVdWlkczogc3RyaW5nW10sIHNhbXBsZVJhdGU6IG51bWJlciwgY2xpcE5hbWU6IHN0cmluZywgc2F2ZVBhdGg6IHN0cmluZywgbG9vcDogYm9vbGVhbikge1xuICAgICAgICBjb25zdCBzdGFnZXM6IGFueVtdID0gW107XG4gICAgICAgIGNvbnN0IHB1c2ggPSAobmFtZTogc3RyaW5nLCBvazogYm9vbGVhbiwgZXh0cmE/OiBhbnkpID0+IHN0YWdlcy5wdXNoKHsgbmFtZSwgb2ssIC4uLihleHRyYSB8fCB7fSkgfSk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBjYyA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yLCBqcywgYXNzZXRNYW5hZ2VyLCBBbmltYXRpb25DbGlwLCBTcHJpdGVGcmFtZSB9ID0gY2M7XG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IGRpcmVjdG9yLmdldFNjZW5lKCk7XG4gICAgICAgICAgICBpZiAoIXNjZW5lKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnLCBzdGFnZXMgfTtcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBmaW5kTm9kZUJ5VXVpZERlZXAoc2NlbmUsIG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGlmICghbm9kZSkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSAke25vZGVVdWlkfSBub3QgZm91bmRgLCBzdGFnZXMgfTtcbiAgICAgICAgICAgIGlmICghc3ByaXRlRnJhbWVVdWlkcyB8fCAhc3ByaXRlRnJhbWVVdWlkcy5sZW5ndGgpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ3Nwcml0ZUZyYW1lVXVpZHMgaXMgZW1wdHknLCBzdGFnZXMgfTtcbiAgICAgICAgICAgIHNhbXBsZVJhdGUgPSBzYW1wbGVSYXRlIHx8IDEwO1xuICAgICAgICAgICAgY2xpcE5hbWUgPSBjbGlwTmFtZSB8fCAnU3ByaXRlQW5pbSc7XG4gICAgICAgICAgICBzYXZlUGF0aCA9IHNhdmVQYXRoIHx8IGBkYjovL2Fzc2V0cy8ke2NsaXBOYW1lfS5hbmltYDtcbiAgICAgICAgICAgIGxvb3AgPSBsb29wICE9PSBmYWxzZTtcbiAgICAgICAgICAgIHB1c2goJ3ZhbGlkYXRlJywgdHJ1ZSk7XG5cbiAgICAgICAgICAgIC8vIOKUgOKUgCAxLiDliqDovb0gU3ByaXRlRnJhbWUo5Y+v6YCJO+Wksei0pei1sCB1dWlkLW9ubHkg5YWc5bqVKSDilIDilIBcbiAgICAgICAgICAgIGxldCBmcmFtZXM6IGFueVtdID0gW107XG4gICAgICAgICAgICBsZXQgZnJhbWVzTG9hZGVkID0gZmFsc2U7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGZyYW1lcyA9IGF3YWl0IG5ldyBQcm9taXNlPGFueVtdPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG9wdHMgPSBTcHJpdGVGcmFtZSA/IHsgdHlwZTogU3ByaXRlRnJhbWUgfSA6IHt9O1xuICAgICAgICAgICAgICAgICAgICBhc3NldE1hbmFnZXIubG9hZEFueShzcHJpdGVGcmFtZVV1aWRzLCBvcHRzLCAoZXJyOiBhbnksIGFzc2V0czogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSByZWplY3QobmV3IEVycm9yKGBsb2FkQW55IOWksei0pTogJHtlcnIubWVzc2FnZSB8fCBlcnJ9YCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSByZXNvbHZlKEFycmF5LmlzQXJyYXkoYXNzZXRzKSA/IGFzc2V0cyA6IFthc3NldHNdKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgLy8g5oyJ5Lyg5YWl6aG65bqP5a+56b2QXG4gICAgICAgICAgICAgICAgY29uc3QgbWFwID0gbmV3IE1hcDxzdHJpbmcsIGFueT4oKTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGYgb2YgZnJhbWVzKSBtYXAuc2V0KGYuX3V1aWQgfHwgZi51dWlkLCBmKTtcbiAgICAgICAgICAgICAgICBjb25zdCBvcmRlcmVkID0gc3ByaXRlRnJhbWVVdWlkcy5tYXAodSA9PiBtYXAuZ2V0KHUpKS5maWx0ZXIoQm9vbGVhbik7XG4gICAgICAgICAgICAgICAgZnJhbWVzTG9hZGVkID0gb3JkZXJlZC5sZW5ndGggPT09IHNwcml0ZUZyYW1lVXVpZHMubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGlmIChmcmFtZXNMb2FkZWQpIGZyYW1lcyA9IG9yZGVyZWQ7XG4gICAgICAgICAgICAgICAgcHVzaCgnbG9hZEZyYW1lcycsIGZyYW1lc0xvYWRlZCwgeyBsb2FkZWQ6IG9yZGVyZWQubGVuZ3RoLCBleHBlY3RlZDogc3ByaXRlRnJhbWVVdWlkcy5sZW5ndGggfSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICAgICAgICBwdXNoKCdsb2FkRnJhbWVzJywgZmFsc2UsIHsgZXJyb3I6IGUubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8g4pSA4pSAIDIuIOeUn+aIkCAuYW5pbSBKU09OIOKUgOKUgFxuICAgICAgICAgICAgbGV0IGFuaW1Kc29uOiBhbnk7XG4gICAgICAgICAgICBpZiAoZnJhbWVzTG9hZGVkICYmIEFuaW1hdGlvbkNsaXAgJiYgQW5pbWF0aW9uQ2xpcC5jcmVhdGVXaXRoU3ByaXRlRnJhbWVzKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2xpcCA9IEFuaW1hdGlvbkNsaXAuY3JlYXRlV2l0aFNwcml0ZUZyYW1lcyhmcmFtZXMsIHNhbXBsZVJhdGUpO1xuICAgICAgICAgICAgICAgICAgICBjbGlwLm5hbWUgPSBjbGlwTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgY2xpcC53cmFwTW9kZSA9IGxvb3AgPyAyIDogMTsgLy8gMj1Mb29wLCAxPU5vcm1hbFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZXJpYWxpemVkID0gc2VyaWFsaXplQ2xpcFZpYUVkaXRvckV4dGVuZHMoY2xpcCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzZXJpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbmltSnNvbiA9IHNlcmlhbGl6ZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBwdXNoKCdidWlsZENsaXAoc2VyaWFsaXplKScsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5pbUpzb24gPSBidWlsZFV1aWRPbmx5QW5pbUpzb24oY2xpcE5hbWUsIHNwcml0ZUZyYW1lVXVpZHMsIHNhbXBsZVJhdGUsIGxvb3ApO1xuICAgICAgICAgICAgICAgICAgICAgICAgcHVzaCgnYnVpbGRDbGlwKHV1aWQtb25seSknLCAhIWFuaW1Kc29uLCB7IHJlYXNvbjogJ3NlcmlhbGl6ZSDov5Tlm57nqbos6ZmN57qnIHV1aWQtb25seScgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICAgICAgICAgICAgYW5pbUpzb24gPSBidWlsZFV1aWRPbmx5QW5pbUpzb24oY2xpcE5hbWUsIHNwcml0ZUZyYW1lVXVpZHMsIHNhbXBsZVJhdGUsIGxvb3ApO1xuICAgICAgICAgICAgICAgICAgICBwdXNoKCdidWlsZENsaXAodXVpZC1vbmx5KScsICEhYW5pbUpzb24sIHsgcmVhc29uOiBgc2VyaWFsaXplIOaKm+mUmTogJHtlLm1lc3NhZ2V9YCwgc3RhY2s6IGUuc3RhY2sgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhbmltSnNvbiA9IGJ1aWxkVXVpZE9ubHlBbmltSnNvbihjbGlwTmFtZSwgc3ByaXRlRnJhbWVVdWlkcywgc2FtcGxlUmF0ZSwgbG9vcCk7XG4gICAgICAgICAgICAgICAgcHVzaCgnYnVpbGRDbGlwKHV1aWQtb25seSknLCAhIWFuaW1Kc29uLCB7IHJlYXNvbjogZnJhbWVzTG9hZGVkID8gJ2NyZWF0ZVdpdGhTcHJpdGVGcmFtZXMg5LiN5Y+v55SoJyA6ICdmcmFtZXMg5pyq5Yqg6L29JyB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghYW5pbUpzb24pIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ2NsaXAgSlNPTiDmnoTlu7rlpLHotKUnLCBzdGFnZXMgfTtcblxuICAgICAgICAgICAgLy8g4pSA4pSAIDMuIOWGmSAuYW5pbSDotYTkuqcoY29udGVudCDlv4Xpobsgc3RyaW5nKSDilIDilIBcbiAgICAgICAgICAgIGxldCBjbGlwVXVpZDogc3RyaW5nID0gJyc7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ2RlbGV0ZS1hc3NldCcsIHNhdmVQYXRoKS5jYXRjaCgoKSA9PiB7fSk7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGVudFN0ciA9IHR5cGVvZiBhbmltSnNvbiA9PT0gJ3N0cmluZycgPyBhbmltSnNvbiA6IEpTT04uc3RyaW5naWZ5KGFuaW1Kc29uKTtcbiAgICAgICAgICAgICAgICBjb25zdCBjcmVhdGVSZXM6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ2NyZWF0ZS1hc3NldCcsIHNhdmVQYXRoLCBjb250ZW50U3RyKTtcbiAgICAgICAgICAgICAgICBjbGlwVXVpZCA9IGNyZWF0ZVJlcz8udXVpZDtcbiAgICAgICAgICAgICAgICBwdXNoKCdjcmVhdGVBc3NldCcsICEhY2xpcFV1aWQsIHsgdXVpZDogY2xpcFV1aWQsIGNyZWF0ZVJlc1R5cGU6IHR5cGVvZiBjcmVhdGVSZXMgfSk7XG4gICAgICAgICAgICAgICAgaWYgKCFjbGlwVXVpZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBjcmVhdGUtYXNzZXQg5pyq6L+U5ZueIHV1aWQ6ICR7SlNPTi5zdHJpbmdpZnkoY3JlYXRlUmVzKX1gLCBzdGFnZXMgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICAgICAgICBwdXNoKCdjcmVhdGVBc3NldCcsIGZhbHNlLCB7IGVycm9yOiBlLm1lc3NhZ2UsIHN0YWNrOiBlLnN0YWNrIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYGNyZWF0ZS1hc3NldCDlpLHotKU6ICR7ZS5tZXNzYWdlfWAsIHN0YWdlcyB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyDilIDilIAgNC4g5oyB5LmF5YyW5oyC6L29IGNjLkFuaW1hdGlvbiArIGRlZmF1bHRDbGlwIOKUgOKUgFxuICAgICAgICAgICAgbGV0IGF0dGFjaGVkID0gZmFsc2U7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVEYXRhID0gYnVpbGROb2RlSW5mbyhub2RlLCBqcyk7XG4gICAgICAgICAgICAgICAgY29uc3QgaGFzQW5pbSA9IG5vZGVEYXRhLmNvbXBvbmVudHMuc29tZSgoYzogYW55KSA9PiBjLmNpZCA9PT0gJ2NjLkFuaW1hdGlvbicpO1xuICAgICAgICAgICAgICAgIGlmICghaGFzQW5pbSkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdjcmVhdGUtY29tcG9uZW50JywgeyB1dWlkOiBub2RlVXVpZCwgY29tcG9uZW50OiAnY2MuQW5pbWF0aW9uJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIDI1MCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCByZWZyZXNoZWQgPSBidWlsZE5vZGVJbmZvKG5vZGUsIGpzKTtcbiAgICAgICAgICAgICAgICBjb25zdCBpZHggPSByZWZyZXNoZWQuY29tcG9uZW50cy5maW5kSW5kZXgoKGM6IGFueSkgPT4gYy5jaWQgPT09ICdjYy5BbmltYXRpb24nKTtcbiAgICAgICAgICAgICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBgX19jb21wc19fLiR7aWR4fS5kZWZhdWx0Q2xpcGAsXG4gICAgICAgICAgICAgICAgICAgICAgICBkdW1wOiB7IHZhbHVlOiB7IHV1aWQ6IGNsaXBVdWlkIH0sIHR5cGU6ICdjYy5BbmltYXRpb25DbGlwJyB9XG4gICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKCgpID0+IHt9KTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBgX19jb21wc19fLiR7aWR4fS5wbGF5T25Mb2FkYCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1bXA6IHsgdmFsdWU6IHRydWUgfVxuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoKSA9PiB7fSk7XG4gICAgICAgICAgICAgICAgICAgIGF0dGFjaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcHVzaCgnYXR0YWNoQW5pbScsIGF0dGFjaGVkLCB7IGNvbXBJZHg6IGlkeCB9KTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgICAgICAgIHB1c2goJ2F0dGFjaEFuaW0nLCBmYWxzZSwgeyBlcnJvcjogZS5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBjbGlwVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgc2F2ZVBhdGgsXG4gICAgICAgICAgICAgICAgICAgIGNsaXBOYW1lLFxuICAgICAgICAgICAgICAgICAgICBmcmFtZUNvdW50OiBzcHJpdGVGcmFtZVV1aWRzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgc2FtcGxlUmF0ZSxcbiAgICAgICAgICAgICAgICAgICAgbG9vcCxcbiAgICAgICAgICAgICAgICAgICAgZnJhbWVzTG9hZGVkLFxuICAgICAgICAgICAgICAgICAgICBhdHRhY2hlZCxcbiAgICAgICAgICAgICAgICAgICAgc3RhZ2VzXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6IChlcnIgJiYgKGVyci5tZXNzYWdlIHx8IFN0cmluZyhlcnIpKSkgfHwgJ3Vua25vd24gZXJyb3IgaW4gY3JlYXRlU3ByaXRlRnJhbWVBbmltYXRpb24nLFxuICAgICAgICAgICAgICAgIHN0YWNrOiBlcnI/LnN0YWNrLFxuICAgICAgICAgICAgICAgIHN0YWdlc1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8qKiDnlKggRWRpdG9yRXh0ZW5kcy5zZXJpYWxpemUg5bqP5YiX5YyWIGNsaXAs6L+U5Zue6Kej5p6Q5ZCO55qE5a+56LGh44CC5aSx6LSl6L+U5ZueIG51bGzjgIIgKi9cbmZ1bmN0aW9uIHNlcmlhbGl6ZUNsaXBWaWFFZGl0b3JFeHRlbmRzKGNsaXA6IGFueSk6IGFueSB8IG51bGwge1xuICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IEVFeHQ6IGFueSA9IChnbG9iYWxUaGlzIGFzIGFueSkuRWRpdG9yRXh0ZW5kcyB8fCAoZ2xvYmFsVGhpcyBhcyBhbnkpLkVkaXRvcj8uRXh0ZW5kcztcbiAgICAgICAgY29uc3Qgc2VyID0gRUV4dD8uc2VyaWFsaXplO1xuICAgICAgICBpZiAoIXNlcikgcmV0dXJuIG51bGw7XG4gICAgICAgIGxldCBzdHI6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXIuc2VyaWFsaXplQXNzZXQgPT09ICdmdW5jdGlvbicpIHN0ciA9IHNlci5zZXJpYWxpemVBc3NldChjbGlwKTtcbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIHNlci5zZXJpYWxpemUgPT09ICdmdW5jdGlvbicpIHN0ciA9IHNlci5zZXJpYWxpemUoY2xpcCwgeyBhc3NldDogdHJ1ZSB9KTtcbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIHNlciA9PT0gJ2Z1bmN0aW9uJykgc3RyID0gc2VyKGNsaXAsIHsgYXNzZXQ6IHRydWUgfSk7XG4gICAgICAgIGlmICh0eXBlb2Ygc3RyID09PSAnc3RyaW5nJyAmJiBzdHIubGVuZ3RoKSByZXR1cm4gSlNPTi5wYXJzZShzdHIpO1xuICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHNlcmlhbGl6ZSDlpLHotKU6ICR7ZS5tZXNzYWdlfWApO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiDmjIkgdXVpZCDmiYvlu7ogLmFuaW0gSlNPTih1dWlkLW9ubHkg5YWc5bqV6Lev5b6EKeOAglxuICog55Sf5oiQIENvY29zIDMuOCDluo/liJfljJbmoLzlvI86YXJyYXktb2Ytb2JqZWN0LOmAmui/hyBfX2lkX18g5LqS55u45byV55So44CCXG4gKiB0cmFjayA9IGNjLmFuaW1hdGlvbi5PYmplY3RUcmFjayxjdXJ2ZSA9IGNjLk9iamVjdEN1cnZlLGtleXMvdmFsdWVzIOWtmCBbdGltZSwge3V1aWR9XeOAglxuICpcbiAqIOazqOaEjzrmraTmoLzlvI/lj4LnhaflvJXmk44gY29jb3MvY29yZS9hbmltYXRpb24vdHJhY2tzL29iamVjdC10cmFjay50cyArXG4gKiBjb2Nvcy9jb3JlL2N1cnZlcy9vYmplY3QtY3VydmUudHMg55qE5Y+v5bqP5YiX5YyW5a2X5q61LOW5tuWvueeFp+mhueebruWGheaXouaciSAuYW5pbSDlvJXnlKjnu5PmnoTjgIJcbiAqL1xuZnVuY3Rpb24gYnVpbGRVdWlkT25seUFuaW1Kc29uKGNsaXBOYW1lOiBzdHJpbmcsIHNwcml0ZUZyYW1lVXVpZHM6IHN0cmluZ1tdLCBzYW1wbGVSYXRlOiBudW1iZXIsIGxvb3A6IGJvb2xlYW4pOiBhbnkge1xuICAgIGNvbnN0IHN0ZXAgPSAxIC8gc2FtcGxlUmF0ZTtcbiAgICBjb25zdCBkdXJhdGlvbiA9IHNwcml0ZUZyYW1lVXVpZHMubGVuZ3RoIC8gc2FtcGxlUmF0ZTtcbiAgICBjb25zdCB0aW1lcyA9IHNwcml0ZUZyYW1lVXVpZHMubWFwKChfLCBpKSA9PiArKHN0ZXAgKiBpKS50b0ZpeGVkKDYpKTtcbiAgICBjb25zdCB2YWx1ZXMgPSBzcHJpdGVGcmFtZVV1aWRzLm1hcCh1ID0+ICh7IHV1aWQ6IHUgfSkpO1xuXG4gICAgLy8gYXJyYXktb2Ytb2JqZWN0IOW8leeUqOe7k+aehCjntKLlvJXljbMgX19pZF9fKVxuICAgIGNvbnN0IGFycjogYW55W10gPSBbXG4gICAgICAgIHsgLy8gWzBdIGNsaXBcbiAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuQW5pbWF0aW9uQ2xpcCcsXG4gICAgICAgICAgICBfbmFtZTogY2xpcE5hbWUsXG4gICAgICAgICAgICBfb2JqRmxhZ3M6IDAsXG4gICAgICAgICAgICBfX2VkaXRvckV4dHJhc19fOiB7IGVtYmVkZGVkUGxheWVyR3JvdXBzOiBbXSB9LFxuICAgICAgICAgICAgX25hdGl2ZTogJycsXG4gICAgICAgICAgICBzYW1wbGU6IHNhbXBsZVJhdGUsXG4gICAgICAgICAgICBzcGVlZDogMSxcbiAgICAgICAgICAgIHdyYXBNb2RlOiBsb29wID8gMiA6IDEsXG4gICAgICAgICAgICBlbmFibGVUcnNCbGVuZGluZzogZmFsc2UsXG4gICAgICAgICAgICBfZHVyYXRpb246IGR1cmF0aW9uLFxuICAgICAgICAgICAgX2hhc2g6IDAsXG4gICAgICAgICAgICBfdHJhY2tzOiBbeyBfX2lkX186IDEgfV0sXG4gICAgICAgICAgICBfZXhvdGljQW5pbWF0aW9uOiBudWxsLFxuICAgICAgICAgICAgX2V2ZW50czogW10sXG4gICAgICAgICAgICBfZW1iZWRkZWRQbGF5ZXJzOiBbXSxcbiAgICAgICAgICAgIF9hZGRpdGl2ZVNldHRpbmdzOiB7IF9faWRfXzogNSB9LFxuICAgICAgICAgICAgX2F1eGlsaWFyeUN1cnZlRW50cmllczogW11cbiAgICAgICAgfSxcbiAgICAgICAgeyAvLyBbMV0gT2JqZWN0VHJhY2tcbiAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuYW5pbWF0aW9uLk9iamVjdFRyYWNrJyxcbiAgICAgICAgICAgIF9kYXRhOiBudWxsLFxuICAgICAgICAgICAgX3BhdGg6IHsgX19pZF9fOiAyIH0sXG4gICAgICAgICAgICBfY2hhbm5lbHM6IFt7IF9faWRfXzogMyB9XSxcbiAgICAgICAgICAgIF9uR3JvdXBzOiAwLFxuICAgICAgICAgICAgX29wdDogMFxuICAgICAgICB9LFxuICAgICAgICB7IC8vIFsyXSBUcmFja1BhdGggKGNvbXBvbmVudD1jYy5TcHJpdGUgKyBwcm9wZXJ0eT1zcHJpdGVGcmFtZSlcbiAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuYW5pbWF0aW9uLlRyYWNrUGF0aCcsXG4gICAgICAgICAgICBfcGF0aHM6IFtcbiAgICAgICAgICAgICAgICB7IF9faWRfXzogNCB9LCAgLy8gQ29tcG9uZW50UGF0aFxuICAgICAgICAgICAgICAgICdzcHJpdGVGcmFtZScgICAgLy8gcHJvcGVydHlcbiAgICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgeyAvLyBbM10gQ2hhbm5lbFxuICAgICAgICAgICAgX190eXBlX186ICdjYy5hbmltYXRpb24uQ2hhbm5lbCcsXG4gICAgICAgICAgICBfY3VydmU6IHsgX19pZF9fOiA2IH0sXG4gICAgICAgICAgICBfcHJveHk6IG51bGxcbiAgICAgICAgfSxcbiAgICAgICAgeyAvLyBbNF0gQ29tcG9uZW50UGF0aFxuICAgICAgICAgICAgX190eXBlX186ICdjYy5hbmltYXRpb24uQ29tcG9uZW50UGF0aCcsXG4gICAgICAgICAgICBjb21wb25lbnQ6ICdjYy5TcHJpdGUnXG4gICAgICAgIH0sXG4gICAgICAgIHsgLy8gWzVdIEFuaW1hdGlvbkNsaXBBZGRpdGl2ZVNldHRpbmdzXG4gICAgICAgICAgICBfX3R5cGVfXzogJ2NjLkFuaW1hdGlvbkNsaXBBZGRpdGl2ZVNldHRpbmdzJyxcbiAgICAgICAgICAgIGFkZGl0aXZlRmxhZ3M6IDAsXG4gICAgICAgICAgICByZWZlcmVuY2VDbGlwOiBudWxsXG4gICAgICAgIH0sXG4gICAgICAgIHsgLy8gWzZdIE9iamVjdEN1cnZlXG4gICAgICAgICAgICBfX3R5cGVfXzogJ2NjLk9iamVjdEN1cnZlJyxcbiAgICAgICAgICAgIF90aW1lczogdGltZXMsXG4gICAgICAgICAgICBfdmFsdWVzOiB2YWx1ZXMsXG4gICAgICAgICAgICBfaW5kZXhlZFZhbHVlczogbnVsbCxcbiAgICAgICAgICAgIF9wcmVFeHRyYXBvbGF0aW9uOiAxLFxuICAgICAgICAgICAgX3Bvc3RFeHRyYXBvbGF0aW9uOiAxXG4gICAgICAgIH1cbiAgICBdO1xuICAgIHJldHVybiBhcnI7XG59XG4iXX0=