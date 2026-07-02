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
    const has = (...ks) => ks.every(k => k in val);
    try {
        if (has('r', 'g', 'b')) {
            const a = (val.a !== undefined) ? val.a : 255;
            return { r: val.r, g: val.g, b: val.b, a };
        }
        if (has('x', 'y', 'z', 'w'))
            return { x: val.x, y: val.y, z: val.z, w: val.w };
        if (has('x', 'y', 'z'))
            return { x: val.x, y: val.y, z: val.z };
        if (has('x', 'y'))
            return { x: val.x, y: val.y };
        if (has('width', 'height'))
            return { width: val.width, height: val.height };
    }
    catch ( /* fallthrough */_a) { /* fallthrough */ }
    if (val._uuid || (val.uuid && typeof val.uuid === 'string')) {
        return { uuid: val._uuid || val.uuid, type: val.constructor ? val.constructor.name : 'Asset' };
    }
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
            const node = scene.getChildByUuid(nodeUuid);
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
            const node = scene.getChildByUuid(nodeUuid);
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
                const parent = scene.getChildByUuid(parentUuid);
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
            const node = scene.getChildByUuid(nodeUuid);
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
            const node = scene.getChildByUuid(nodeUuid);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUtaW1wbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9zY2VuZS1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBOzs7O0dBSUc7QUFDSCwrQkFBNEI7QUFDNUIsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBQSxXQUFJLEVBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztBQUV6RCxtQ0FBbUM7QUFFbkMsd0RBQXdEO0FBQ3hELFNBQVMsa0JBQWtCLENBQUMsSUFBUyxFQUFFLFFBQWdCO0lBQ25ELElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRO1FBQUUsT0FBTyxJQUFJLENBQUM7SUFDcEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFFBQVE7UUFBRSxPQUFPLElBQUksQ0FBQztJQUN4QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBQztJQUNyQyxLQUFLLE1BQU0sS0FBSyxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQzNCLE1BQU0sS0FBSyxHQUFHLGtCQUFrQixDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNsRCxJQUFJLEtBQUs7WUFBRSxPQUFPLEtBQUssQ0FBQztJQUM1QixDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDaEIsQ0FBQztBQUVELHVDQUF1QztBQUN2QyxTQUFTLGFBQWEsQ0FBQyxJQUFTLEVBQUUsRUFBTztJQUNyQyxNQUFNLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBUyxFQUFFLEtBQWEsRUFBRSxFQUFFO1FBQ25FLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7UUFDOUIsSUFBSSxHQUFXLENBQUM7UUFDaEIsSUFBSSxDQUFDO1lBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxV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RUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUcsZ0JBQWdCO2dCQUNoQyxhQUFhLENBQUksV0FBVzthQUMvQjtTQUNKO1FBQ0Q7WUFDSSxRQUFRLEVBQUUsc0JBQXNCO1lBQ2hDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7WUFDckIsTUFBTSxFQUFFLElBQUk7U0FDZjtRQUNEO1lBQ0ksUUFBUSxFQUFFLDRCQUE0QjtZQUN0QyxTQUFTLEVBQUUsV0FBVztTQUN6QjtRQUNEO1lBQ0ksUUFBUSxFQUFFLGtDQUFrQztZQUM1QyxhQUFhLEVBQUUsQ0FBQztZQUNoQixhQUFhLEVBQUUsSUFBSTtTQUN0QjtRQUNEO1lBQ0ksUUFBUSxFQUFFLGdCQUFnQjtZQUMxQixNQUFNLEVBQUUsS0FBSztZQUNiLE9BQU8sRUFBRSxNQUFNO1lBQ2YsY0FBYyxFQUFFLElBQUk7WUFDcEIsaUJBQWlCLEVBQUUsQ0FBQztZQUNwQixrQkFBa0IsRUFBRSxDQUFDO1NBQ3hCO0tBQ0osQ0FBQztJQUNGLE9BQU8sR0FBRyxDQUFDO0FBQ2YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICog5Zy65pmv6ISa5pys5a6e546w5bGCKOeUsSBzY2VuZS50cyDku6PnkIbliqDovb0s5pSv5oyB54Ot6YeN6L29KeOAglxuICpcbiAqIOatpOaWh+S7tuaUueWKqOWQjix0c2Mg57yW6K+RICsgY3Ag5YiwIGRpc3QvLOS4i+S4gOasoSBtZXRob2Qg6LCD55So5Y2z55Sf5pWIKOaXoOmcgOmHjeWQr+e8lui+keWZqCnjgIJcbiAqL1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xubW9kdWxlLnBhdGhzLnB1c2goam9pbihFZGl0b3IuQXBwLnBhdGgsICdub2RlX21vZHVsZXMnKSk7XG5cbi8vID09PT09PT09PT09PSDlhbHkuqvovoXliqnlh73mlbAgPT09PT09PT09PT09XG5cbi8qKiDmt7HluqbpgJLlvZLmn6Xmib7oioLngrko5Y6fIHNjZW5lLmdldENoaWxkQnlVdWlkIOS7heaQnOebtOaOpeWtkOiKgueCuSzlrZnoioLngrnmsLjov5zmib7kuI3liLApICovXG5mdW5jdGlvbiBmaW5kTm9kZUJ5VXVpZERlZXAocm9vdDogYW55LCBub2RlVXVpZDogc3RyaW5nKTogYW55IHtcbiAgICBpZiAoIXJvb3QgfHwgIW5vZGVVdWlkKSByZXR1cm4gbnVsbDtcbiAgICBpZiAocm9vdC51dWlkID09PSBub2RlVXVpZCkgcmV0dXJuIHJvb3Q7XG4gICAgY29uc3QgY2hpbGRyZW4gPSByb290LmNoaWxkcmVuIHx8IFtdO1xuICAgIGZvciAoY29uc3QgY2hpbGQgb2YgY2hpbGRyZW4pIHtcbiAgICAgICAgY29uc3QgZm91bmQgPSBmaW5kTm9kZUJ5VXVpZERlZXAoY2hpbGQsIG5vZGVVdWlkKTtcbiAgICAgICAgaWYgKGZvdW5kKSByZXR1cm4gZm91bmQ7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuXG4vKiog5oqK6L+Q6KGM5pe26IqC54K55b2S5LiA5YyW5Li656iz5a6a57uT5p6ELOS+myB3cmFwcGVyIOS4jumqjOivgee7n+S4gOa2iOi0uSAqL1xuZnVuY3Rpb24gYnVpbGROb2RlSW5mbyhub2RlOiBhbnksIGpzOiBhbnkpOiBhbnkge1xuICAgIGNvbnN0IGNvbXBzID0gKG5vZGUuY29tcG9uZW50cyB8fCBbXSkubWFwKChjb21wOiBhbnksIGluZGV4OiBudW1iZXIpID0+IHtcbiAgICAgICAgY29uc3QgY3RvciA9IGNvbXAuY29uc3RydWN0b3I7XG4gICAgICAgIGxldCBjaWQ6IHN0cmluZztcbiAgICAgICAgdHJ5IHsgY2lkID0ganMuZ2V0Q2xhc3NJZChjdG9yKTsgfSBjYXRjaCB7IGNpZCA9IGN0b3IubmFtZTsgfVxuICAgICAgICBsZXQgY29tcFV1aWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgICAgICB0cnkgeyBjb21wVXVpZCA9IGNvbXAudXVpZCB8fCBudWxsOyB9IGNhdGNoIHsgLyogaWdub3JlICovIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNpZDogY2lkIHx8IGN0b3IubmFtZSxcbiAgICAgICAgICAgIG5hbWU6IGN0b3IubmFtZSxcbiAgICAgICAgICAgIGluZGV4LFxuICAgICAgICAgICAgdXVpZDogY29tcFV1aWQsXG4gICAgICAgICAgICBlbmFibGVkOiBjb21wLmVuYWJsZWRcbiAgICAgICAgfTtcbiAgICB9KTtcbiAgICBjb25zdCB3cCA9IG5vZGUud29ybGRQb3NpdGlvbiA/IHsgeDogbm9kZS53b3JsZFBvc2l0aW9uLngsIHk6IG5vZGUud29ybGRQb3NpdGlvbi55LCB6OiBub2RlLndvcmxkUG9zaXRpb24ueiB9IDogbnVsbDtcbiAgICByZXR1cm4ge1xuICAgICAgICB1dWlkOiBub2RlLnV1aWQsXG4gICAgICAgIG5hbWU6IG5vZGUubmFtZSxcbiAgICAgICAgYWN0aXZlOiBub2RlLmFjdGl2ZSxcbiAgICAgICAgbGF5ZXI6IG5vZGUubGF5ZXIsXG4gICAgICAgIHBvc2l0aW9uOiB7IHg6IG5vZGUucG9zaXRpb24ueCwgeTogbm9kZS5wb3NpdGlvbi55LCB6OiBub2RlLnBvc2l0aW9uLnogfSxcbiAgICAgICAgcm90YXRpb246IHsgeDogbm9kZS5yb3RhdGlvbi54LCB5OiBub2RlLnJvdGF0aW9uLnksIHo6IG5vZGUucm90YXRpb24ueiwgdzogbm9kZS5yb3RhdGlvbi53IH0sXG4gICAgICAgIHNjYWxlOiB7IHg6IG5vZGUuc2NhbGUueCwgeTogbm9kZS5zY2FsZS55LCB6OiBub2RlLnNjYWxlLnogfSxcbiAgICAgICAgd29ybGRQb3NpdGlvbjogd3AsXG4gICAgICAgIHBhcmVudDogbm9kZS5wYXJlbnQgPyBub2RlLnBhcmVudC51dWlkIDogbnVsbCxcbiAgICAgICAgY2hpbGRyZW46IChub2RlLmNoaWxkcmVuIHx8IFtdKS5tYXAoKGNoaWxkOiBhbnkpID0+IGNoaWxkLnV1aWQpLFxuICAgICAgICBjb21wb25lbnRzOiBjb21wc1xuICAgIH07XG59XG5cbi8qKiDmjInnu4Tku7bnsbvlnovmn6Xmib7oioLngrnkuIrnmoTnu4Tku7blrp7kvoso5pSv5oyBIEZRTiAnY2MuU3ByaXRlJyDkuI7nn63lkI0gJ1Nwcml0ZScpICovXG5mdW5jdGlvbiBmaW5kQ29tcG9uZW50T25Ob2RlKG5vZGU6IGFueSwgY29tcG9uZW50VHlwZTogc3RyaW5nLCBqczogYW55KTogYW55IHtcbiAgICBjb25zdCBub3JtYWxpemUgPSAoczogc3RyaW5nKSA9PiAocyB8fCAnJykudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9eY2NcXC4vLCAnJyk7XG4gICAgY29uc3QgdGFyZ2V0ID0gbm9ybWFsaXplKGNvbXBvbmVudFR5cGUpO1xuICAgIGNvbnN0IGNvbXBzID0gbm9kZS5jb21wb25lbnRzIHx8IFtdO1xuICAgIGZvciAoY29uc3QgY29tcCBvZiBjb21wcykge1xuICAgICAgICBsZXQgY2lkID0gJyc7XG4gICAgICAgIHRyeSB7IGNpZCA9IGpzLmdldENsYXNzSWQoY29tcC5jb25zdHJ1Y3RvcikgfHwgJyc7IH0gY2F0Y2ggeyAvKiBpZ25vcmUgKi8gfVxuICAgICAgICBpZiAobm9ybWFsaXplKGNpZCkgPT09IHRhcmdldCB8fCBub3JtYWxpemUoY29tcC5jb25zdHJ1Y3Rvci5uYW1lKSA9PT0gdGFyZ2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gY29tcDtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cblxuLyoqIOaPkOWPlue7hOS7tuWunuS+i+eahOWPr+aemuS4vuWxnuaAp+WAvCzot7Pov4flvJXmk47lhoXpg6ggYF9gIOWJjee8gOWtl+autSAqL1xuZnVuY3Rpb24gZXh0cmFjdENvbXBvbmVudFByb3BzKGNvbXA6IGFueSk6IFJlY29yZDxzdHJpbmcsIGFueT4ge1xuICAgIGNvbnN0IHJlc3VsdDogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xuICAgIGxldCBwcm90byA9IGNvbXA7XG4gICAgY29uc3Qgc2VlbiA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIHdoaWxlIChwcm90byAmJiBwcm90byAhPT0gT2JqZWN0LnByb3RvdHlwZSkge1xuICAgICAgICBjb25zdCBuYW1lcyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHByb3RvKTtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgbmFtZXMpIHtcbiAgICAgICAgICAgIGlmIChzZWVuLmhhcyhrZXkpKSBjb250aW51ZTtcbiAgICAgICAgICAgIHNlZW4uYWRkKGtleSk7XG4gICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ18nKSkgY29udGludWU7XG4gICAgICAgICAgICBpZiAoa2V5ID09PSAnbm9kZScgfHwga2V5ID09PSAnZW5hYmxlZCcgfHwga2V5ID09PSAnZW5hYmxlZEluSGllcmFyY2h5JykgY29udGludWU7XG4gICAgICAgICAgICBsZXQgdmFsOiBhbnk7XG4gICAgICAgICAgICB0cnkgeyB2YWwgPSBjb21wW2tleV07IH0gY2F0Y2ggeyBjb250aW51ZTsgfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWwgPT09ICdmdW5jdGlvbicpIGNvbnRpbnVlO1xuICAgICAgICAgICAgcmVzdWx0W2tleV0gPSBub3JtYWxpemVWYWx1ZSh2YWwpO1xuICAgICAgICB9XG4gICAgICAgIHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHByb3RvKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqIOaKiui/kOihjOaXtuWAvOW9kuS4gOWMluS4uuWPryBKU09OIOWMlueahOeugOWNlee7k+aehCAqL1xuZnVuY3Rpb24gbm9ybWFsaXplVmFsdWUodmFsOiBhbnkpOiBhbnkge1xuICAgIGlmICh2YWwgPT09IG51bGwgfHwgdmFsID09PSB1bmRlZmluZWQpIHJldHVybiB2YWw7XG4gICAgaWYgKHR5cGVvZiB2YWwgIT09ICdvYmplY3QnKSByZXR1cm4gdmFsO1xuICAgIGNvbnN0IGhhcyA9ICguLi5rczogc3RyaW5nW10pID0+IGtzLmV2ZXJ5KGsgPT4gayBpbiB2YWwpO1xuICAgIHRyeSB7XG4gICAgICAgIGlmIChoYXMoJ3InLCAnZycsICdiJykpIHtcbiAgICAgICAgICAgIGNvbnN0IGEgPSAodmFsLmEgIT09IHVuZGVmaW5lZCkgPyB2YWwuYSA6IDI1NTtcbiAgICAgICAgICAgIHJldHVybiB7IHI6IHZhbC5yLCBnOiB2YWwuZywgYjogdmFsLmIsIGEgfTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGFzKCd4JywgJ3knLCAneicsICd3JykpIHJldHVybiB7IHg6IHZhbC54LCB5OiB2YWwueSwgejogdmFsLnosIHc6IHZhbC53IH07XG4gICAgICAgIGlmIChoYXMoJ3gnLCAneScsICd6JykpIHJldHVybiB7IHg6IHZhbC54LCB5OiB2YWwueSwgejogdmFsLnogfTtcbiAgICAgICAgaWYgKGhhcygneCcsICd5JykpIHJldHVybiB7IHg6IHZhbC54LCB5OiB2YWwueSB9O1xuICAgICAgICBpZiAoaGFzKCd3aWR0aCcsICdoZWlnaHQnKSkgcmV0dXJuIHsgd2lkdGg6IHZhbC53aWR0aCwgaGVpZ2h0OiB2YWwuaGVpZ2h0IH07XG4gICAgfSBjYXRjaCB7IC8qIGZhbGx0aHJvdWdoICovIH1cbiAgICBpZiAodmFsLl91dWlkIHx8ICh2YWwudXVpZCAmJiB0eXBlb2YgdmFsLnV1aWQgPT09ICdzdHJpbmcnKSkge1xuICAgICAgICByZXR1cm4geyB1dWlkOiB2YWwuX3V1aWQgfHwgdmFsLnV1aWQsIHR5cGU6IHZhbC5jb25zdHJ1Y3RvciA/IHZhbC5jb25zdHJ1Y3Rvci5uYW1lIDogJ0Fzc2V0JyB9O1xuICAgIH1cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgICAgIHJldHVybiB2YWwuc2xpY2UoMCwgNjQpLm1hcChub3JtYWxpemVWYWx1ZSk7XG4gICAgfVxuICAgIGNvbnN0IG91dDogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xuICAgIGNvbnN0IHNlZW4gPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBsZXQgcHJvdG8gPSB2YWw7XG4gICAgbGV0IGNvdW50ID0gMDtcbiAgICB3aGlsZSAocHJvdG8gJiYgcHJvdG8gIT09IE9iamVjdC5wcm90b3R5cGUgJiYgY291bnQgPCAzMikge1xuICAgICAgICBmb3IgKGNvbnN0IGsgb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMocHJvdG8pKSB7XG4gICAgICAgICAgICBpZiAoc2Vlbi5oYXMoaykgfHwgay5zdGFydHNXaXRoKCdfJykpIGNvbnRpbnVlO1xuICAgICAgICAgICAgc2Vlbi5hZGQoayk7XG4gICAgICAgICAgICBpZiAoWydub2RlJywgJ2VuYWJsZWQnLCAnZW5hYmxlZEluSGllcmFyY2h5JywgJ2NvbnN0cnVjdG9yJ10uaW5jbHVkZXMoaykpIGNvbnRpbnVlO1xuICAgICAgICAgICAgbGV0IHY6IGFueTtcbiAgICAgICAgICAgIHRyeSB7IHYgPSB2YWxba107IH0gY2F0Y2ggeyBjb250aW51ZTsgfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiB2ID09PSAnZnVuY3Rpb24nKSBjb250aW51ZTtcbiAgICAgICAgICAgIG91dFtrXSA9ICh2ICE9PSBudWxsICYmIHR5cGVvZiB2ID09PSAnb2JqZWN0JykgPyAnW29iamVjdF0nIDogdjtcbiAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgICBpZiAoY291bnQgPj0gMzIpIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHByb3RvKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dDtcbn1cblxuZXhwb3J0IGNvbnN0IG1ldGhvZHM6IHsgW2tleTogc3RyaW5nXTogKC4uLmFueTogYW55KSA9PiBhbnkgfSA9IHtcbiAgICAvKipcbiAgICAgKiDor4rmlq06YXN5bmMg5pa55rOV5piv5ZCm6KKrIGV4ZWN1dGUtc2NlbmUtc2NyaXB0IOaUr+aMgSjkuZ/nlKjkuo7pqozor4Hku6PnkIbng63ph43ovb3pk77ot68pXG4gICAgICovXG4gICAgYXN5bmMgdGVzdEFzeW5jTWV0aG9kKGRlbGF5TXM6IG51bWJlcikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIGRlbGF5TXMgfHwgMTAwKSk7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IG1zZzogJ2FzeW5jIG1ldGhvZCBleGVjdXRlZCB2MicsIGRlbGF5OiBkZWxheU1zIHx8IDEwMCB9IH07XG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBjcmVhdGVOZXdTY2VuZSgpIHsgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yLCBTY2VuZSB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gbmV3IFNjZW5lKCk7XG4gICAgICAgICAgICBzY2VuZS5uYW1lID0gJ05ldyBTY2VuZSc7XG4gICAgICAgICAgICBkaXJlY3Rvci5ydW5TY2VuZShzY2VuZSk7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiAnTmV3IHNjZW5lIGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5JyB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBhZGRDb21wb25lbnRUb05vZGUobm9kZVV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yLCBqcyB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBzY2VuZS5nZXRDaGlsZEJ5VXVpZChub2RlVXVpZCk7XG4gICAgICAgICAgICBpZiAoIW5vZGUpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vZGUgd2l0aCBVVUlEICR7bm9kZVV1aWR9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIGNvbnN0IENvbXBvbmVudENsYXNzID0ganMuZ2V0Q2xhc3NCeU5hbWUoY29tcG9uZW50VHlwZSk7XG4gICAgICAgICAgICBpZiAoIUNvbXBvbmVudENsYXNzKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgdHlwZSAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudCA9IG5vZGUuYWRkQ29tcG9uZW50KENvbXBvbmVudENsYXNzKTtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBDb21wb25lbnQgJHtjb21wb25lbnRUeXBlfSBhZGRlZGAsIGRhdGE6IHsgY29tcG9uZW50SWQ6IGNvbXBvbmVudC51dWlkIH0gfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgcmVtb3ZlQ29tcG9uZW50RnJvbU5vZGUobm9kZVV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yLCBqcyB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBzY2VuZS5nZXRDaGlsZEJ5VXVpZChub2RlVXVpZCk7XG4gICAgICAgICAgICBpZiAoIW5vZGUpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vZGUgd2l0aCBVVUlEICR7bm9kZVV1aWR9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIGNvbnN0IENvbXBvbmVudENsYXNzID0ganMuZ2V0Q2xhc3NCeU5hbWUoY29tcG9uZW50VHlwZSk7XG4gICAgICAgICAgICBpZiAoIUNvbXBvbmVudENsYXNzKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgdHlwZSAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudCA9IG5vZGUuZ2V0Q29tcG9uZW50KENvbXBvbmVudENsYXNzKTtcbiAgICAgICAgICAgIGlmICghY29tcG9uZW50KSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgJHtjb21wb25lbnRUeXBlfSBub3QgZm91bmQgb24gbm9kZWAgfTtcbiAgICAgICAgICAgIG5vZGUucmVtb3ZlQ29tcG9uZW50KGNvbXBvbmVudCk7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgQ29tcG9uZW50ICR7Y29tcG9uZW50VHlwZX0gcmVtb3ZlZGAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgY3JlYXRlTm9kZShuYW1lOiBzdHJpbmcsIHBhcmVudFV1aWQ/OiBzdHJpbmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IsIE5vZGUgfSA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IGRpcmVjdG9yLmdldFNjZW5lKCk7XG4gICAgICAgICAgICBpZiAoIXNjZW5lKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICBjb25zdCBub2RlID0gbmV3IE5vZGUobmFtZSk7XG4gICAgICAgICAgICBpZiAocGFyZW50VXVpZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcmVudCA9IHNjZW5lLmdldENoaWxkQnlVdWlkKHBhcmVudFV1aWQpO1xuICAgICAgICAgICAgICAgIGlmIChwYXJlbnQpIHBhcmVudC5hZGRDaGlsZChub2RlKTsgZWxzZSBzY2VuZS5hZGRDaGlsZChub2RlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2NlbmUuYWRkQ2hpbGQobm9kZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgTm9kZSAke25hbWV9IGNyZWF0ZWRgLCBkYXRhOiB7IHV1aWQ6IG5vZGUudXVpZCwgbmFtZTogbm9kZS5uYW1lIH0gfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICog6I635Y+W6IqC54K55L+h5oGvKOW9kuS4gOWMlinjgIJjb21wb25lbnRzIOWQqyBjaWQoRlFOKSsgbmFtZSjnn63lkI0pKyBpbmRleOOAglxuICAgICAqL1xuICAgIGdldE5vZGVJbmZvKG5vZGVVdWlkOiBzdHJpbmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IsIGpzIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IGZpbmROb2RlQnlVdWlkRGVlcChzY2VuZSwgbm9kZVV1aWQpO1xuICAgICAgICAgICAgaWYgKCFub2RlKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIHdpdGggVVVJRCAke25vZGVVdWlkfSBub3QgZm91bmRgIH07XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBidWlsZE5vZGVJbmZvKG5vZGUsIGpzKSB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiDojrflj5bljZXkuKrnu4Tku7bor6bmg4U65omA5pyJ5Y+v5p6a5Li+5a6e5L6L5bGe5oCn55qE5YC8LOeUqOS6jiBzZXQtcHJvcGVydHkg5YaZ5ZCO55yf5a6e6aqM6K+B6K+75Zue44CCXG4gICAgICovXG4gICAgZ2V0Q29tcG9uZW50RGV0YWlsKG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciwganMgfSA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IGRpcmVjdG9yLmdldFNjZW5lKCk7XG4gICAgICAgICAgICBpZiAoIXNjZW5lKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICBjb25zdCBub2RlID0gZmluZE5vZGVCeVV1aWREZWVwKHNjZW5lLCBub2RlVXVpZCk7XG4gICAgICAgICAgICBpZiAoIW5vZGUpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vZGUgd2l0aCBVVUlEICR7bm9kZVV1aWR9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIGNvbnN0IGNvbXAgPSBmaW5kQ29tcG9uZW50T25Ob2RlKG5vZGUsIGNvbXBvbmVudFR5cGUsIGpzKTtcbiAgICAgICAgICAgIGlmICghY29tcCkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50ICR7Y29tcG9uZW50VHlwZX0gbm90IGZvdW5kIG9uIG5vZGUgJHtub2RlLm5hbWV9YCB9O1xuICAgICAgICAgICAgY29uc3QgcHJvcHMgPSBleHRyYWN0Q29tcG9uZW50UHJvcHMoY29tcCk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YTogeyBjaWQ6IGpzLmdldENsYXNzSWQoY29tcC5jb25zdHJ1Y3RvciksIG5hbWU6IGNvbXAuY29uc3RydWN0b3IubmFtZSwgZW5hYmxlZDogY29tcC5lbmFibGVkLCBwcm9wZXJ0aWVzOiBwcm9wcyB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiDojrflj5boioLngrnmoJEo5b2S5LiA5YyW5bWM5aWXLOWQqyBjb21wb25lbnRzIGNpZCnjgIJcbiAgICAgKi9cbiAgICBnZXRBbGxOb2RlcygpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IsIGpzIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xuICAgICAgICAgICAgY29uc3QgYnVpbGRUcmVlID0gKG5vZGU6IGFueSk6IGFueSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29tcHMgPSAobm9kZS5jb21wb25lbnRzIHx8IFtdKS5tYXAoKGNvbXA6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsZXQgY2lkID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7IGNpZCA9IGpzLmdldENsYXNzSWQoY29tcC5jb25zdHJ1Y3RvcikgfHwgJyc7IH0gY2F0Y2ggeyAvKiBpZ25vcmUgKi8gfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2lkIHx8IGNvbXAuY29uc3RydWN0b3IubmFtZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBub2RlLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGUudXVpZCxcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlOiBub2RlLmFjdGl2ZSxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBub2RlLnBhcmVudCA/IG5vZGUucGFyZW50LnV1aWQgOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRzOiBjb21wcyxcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IChub2RlLmNoaWxkcmVuIHx8IFtdKS5tYXAoKGNoaWxkOiBhbnkpID0+IGJ1aWxkVHJlZShjaGlsZCkpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBidWlsZFRyZWUoc2NlbmUpIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGZpbmROb2RlQnlOYW1lKG5hbWU6IHN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBzY2VuZS5nZXRDaGlsZEJ5TmFtZShuYW1lKTtcbiAgICAgICAgICAgIGlmICghbm9kZSkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSB3aXRoIG5hbWUgJHtuYW1lfSBub3QgZm91bmRgIH07XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IHV1aWQ6IG5vZGUudXVpZCwgbmFtZTogbm9kZS5uYW1lLCBhY3RpdmU6IG5vZGUuYWN0aXZlLCBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbiB9IH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGdldEN1cnJlbnRTY2VuZUluZm8oKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyBuYW1lOiBzY2VuZS5uYW1lLCB1dWlkOiBzY2VuZS51dWlkLCBub2RlQ291bnQ6IHNjZW5lLmNoaWxkcmVuLmxlbmd0aCB9IH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHNldE5vZGVQcm9wZXJ0eShub2RlVXVpZDogc3RyaW5nLCBwcm9wZXJ0eTogc3RyaW5nLCB2YWx1ZTogYW55KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHNjZW5lLmdldENoaWxkQnlVdWlkKG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGlmICghbm9kZSkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSB3aXRoIFVVSUQgJHtub2RlVXVpZH0gbm90IGZvdW5kYCB9O1xuICAgICAgICAgICAgaWYgKHByb3BlcnR5ID09PSAncG9zaXRpb24nKSBub2RlLnNldFBvc2l0aW9uKHZhbHVlLnggfHwgMCwgdmFsdWUueSB8fCAwLCB2YWx1ZS56IHx8IDApO1xuICAgICAgICAgICAgZWxzZSBpZiAocHJvcGVydHkgPT09ICdyb3RhdGlvbicpIG5vZGUuc2V0Um90YXRpb25Gcm9tRXVsZXIodmFsdWUueCB8fCAwLCB2YWx1ZS55IHx8IDAsIHZhbHVlLnogfHwgMCk7XG4gICAgICAgICAgICBlbHNlIGlmIChwcm9wZXJ0eSA9PT0gJ3NjYWxlJykgbm9kZS5zZXRTY2FsZSh2YWx1ZS54IHx8IDEsIHZhbHVlLnkgfHwgMSwgdmFsdWUueiB8fCAxKTtcbiAgICAgICAgICAgIGVsc2UgaWYgKHByb3BlcnR5ID09PSAnYWN0aXZlJykgbm9kZS5hY3RpdmUgPSB2YWx1ZTtcbiAgICAgICAgICAgIGVsc2UgaWYgKHByb3BlcnR5ID09PSAnbmFtZScpIG5vZGUubmFtZSA9IHZhbHVlO1xuICAgICAgICAgICAgZWxzZSAobm9kZSBhcyBhbnkpW3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYFByb3BlcnR5ICcke3Byb3BlcnR5fScgdXBkYXRlZGAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgZ2V0U2NlbmVIaWVyYXJjaHkoaW5jbHVkZUNvbXBvbmVudHM6IGJvb2xlYW4gPSBmYWxzZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NOb2RlID0gKG5vZGU6IGFueSk6IGFueSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSB7IG5hbWU6IG5vZGUubmFtZSwgdXVpZDogbm9kZS51dWlkLCBhY3RpdmU6IG5vZGUuYWN0aXZlLCBjaGlsZHJlbjogW10gfTtcbiAgICAgICAgICAgICAgICBpZiAoaW5jbHVkZUNvbXBvbmVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmNvbXBvbmVudHMgPSBub2RlLmNvbXBvbmVudHMubWFwKChjb21wOiBhbnkpID0+ICh7IHR5cGU6IGNvbXAuY29uc3RydWN0b3IubmFtZSwgZW5hYmxlZDogY29tcC5lbmFibGVkIH0pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG5vZGUuY2hpbGRyZW4gJiYgbm9kZS5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5jaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4ubWFwKChjaGlsZDogYW55KSA9PiBwcm9jZXNzTm9kZShjaGlsZCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHNjZW5lLmNoaWxkcmVuLm1hcCgoY2hpbGQ6IGFueSkgPT4gcHJvY2Vzc05vZGUoY2hpbGQpKSB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBjcmVhdGVQcmVmYWJGcm9tTm9kZShub2RlVXVpZDogc3RyaW5nLCBwcmVmYWJQYXRoOiBzdHJpbmcpIHtcbiAgICAgICAgLy8g55yf5q2j55qEIHByZWZhYiDliJvlu7rnlKggcHJlZmFiX2NyZWF0ZV9wcmVmYWIg5bel5YW3KHByZWZhYi10b29scyks6L+Z6YeM5LuF5L+d55WZ5o6l5Y+j5YW85a65XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ+S9v+eUqCBwcmVmYWJfY3JlYXRlX3ByZWZhYiDlt6Xlhbfmm7/ku6PlnLrmma/ohJrmnKwgY3JlYXRlUHJlZmFiRnJvbU5vZGUnIH07XG4gICAgfSxcblxuICAgIHNldENvbXBvbmVudFByb3BlcnR5KG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZywgcHJvcGVydHk6IHN0cmluZywgdmFsdWU6IGFueSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciwganMgfSA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IGRpcmVjdG9yLmdldFNjZW5lKCk7XG4gICAgICAgICAgICBpZiAoIXNjZW5lKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICBjb25zdCBub2RlID0gc2NlbmUuZ2V0Q2hpbGRCeVV1aWQobm9kZVV1aWQpO1xuICAgICAgICAgICAgaWYgKCFub2RlKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIHdpdGggVVVJRCAke25vZGVVdWlkfSBub3QgZm91bmRgIH07XG4gICAgICAgICAgICBjb25zdCBDb21wb25lbnRDbGFzcyA9IGpzLmdldENsYXNzQnlOYW1lKGNvbXBvbmVudFR5cGUpO1xuICAgICAgICAgICAgaWYgKCFDb21wb25lbnRDbGFzcykgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50IHR5cGUgJHtjb21wb25lbnRUeXBlfSBub3QgZm91bmRgIH07XG4gICAgICAgICAgICBjb25zdCBjb21wb25lbnQgPSBub2RlLmdldENvbXBvbmVudChDb21wb25lbnRDbGFzcyk7XG4gICAgICAgICAgICBpZiAoIWNvbXBvbmVudCkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50ICR7Y29tcG9uZW50VHlwZX0gbm90IGZvdW5kIG9uIG5vZGVgIH07XG4gICAgICAgICAgICAvLyDotYTkuqfnsbvlsZ7mgKcoc3ByaXRlRnJhbWUvbWF0ZXJpYWwp5oyJIHV1aWQg5Yqg6L29XG4gICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyAmJiAocHJvcGVydHkgPT09ICdzcHJpdGVGcmFtZScgfHwgcHJvcGVydHkgPT09ICdtYXRlcmlhbCcpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYXNzZXRNYW5hZ2VyID0gcmVxdWlyZSgnY2MnKS5hc3NldE1hbmFnZXI7XG4gICAgICAgICAgICAgICAgY29uc3QgQXNzZXRUeXBlID0gcHJvcGVydHkgPT09ICdzcHJpdGVGcmFtZScgPyByZXF1aXJlKCdjYycpLlNwcml0ZUZyYW1lIDogcmVxdWlyZSgnY2MnKS5NYXRlcmlhbDtcbiAgICAgICAgICAgICAgICBhc3NldE1hbmFnZXIubG9hZEFueSh7IHV1aWQ6IHZhbHVlLCB0eXBlOiBBc3NldFR5cGUgfSwgKGVycjogYW55LCBhc3NldDogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghZXJyICYmIGFzc2V0KSAoY29tcG9uZW50IGFzIGFueSlbcHJvcGVydHldID0gYXNzZXQ7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIChjb21wb25lbnQgYXMgYW55KVtwcm9wZXJ0eV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBDb21wb25lbnQgcHJvcGVydHkgJyR7cHJvcGVydHl9JyB1cGRhdGVkYCB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiDliJvlu7rluo/liJfluKfliqjnlLvjgIJcbiAgICAgKiAtIOS4u+i3r+W+hDrliqDovb0gU3ByaXRlRnJhbWUg4oaSIEFuaW1hdGlvbkNsaXAuY3JlYXRlV2l0aFNwcml0ZUZyYW1lcyDihpIgRWRpdG9yRXh0ZW5kcy5zZXJpYWxpemVcbiAgICAgKiAtIOWFnOW6lei3r+W+hCh1dWlkLW9ubHkpOuiLpSBTcHJpdGVGcmFtZSDliqDovb3lpLHotKUs55u05o6l5oyJIHV1aWQg5omL5bu6IC5hbmltIEpTT05cbiAgICAgKiAgICjov5DooYzml7YvcHJldmlldyDkvJrmjIkgdXVpZCDop6PmnpAs5peg6ZyA57yW6L6R5Zmo5oCB5Yqg6L295a6e6ZmF6LWE5LqnKVxuICAgICAqIC0gY3JlYXRlLWFzc2V0IOeahCBjb250ZW50IOW/hemhuyBKU09OLnN0cmluZ2lmeSDmiJDlrZfnrKbkuLIo5L+u5aSN5pen54mI5LygIG9iamVjdCDlr7zoh7TnqbrplJnor68pXG4gICAgICogLSDlhajnqIvorrDlvZUgc3RhZ2VzLOWksei0peaXtui/lOWbnumDqOWIhui/m+W6puS+v+S6juWumuS9jVxuICAgICAqL1xuICAgIGFzeW5jIGNyZWF0ZVNwcml0ZUZyYW1lQW5pbWF0aW9uKG5vZGVVdWlkOiBzdHJpbmcsIHNwcml0ZUZyYW1lVXVpZHM6IHN0cmluZ1tdLCBzYW1wbGVSYXRlOiBudW1iZXIsIGNsaXBOYW1lOiBzdHJpbmcsIHNhdmVQYXRoOiBzdHJpbmcsIGxvb3A6IGJvb2xlYW4pIHtcbiAgICAgICAgY29uc3Qgc3RhZ2VzOiBhbnlbXSA9IFtdO1xuICAgICAgICBjb25zdCBwdXNoID0gKG5hbWU6IHN0cmluZywgb2s6IGJvb2xlYW4sIGV4dHJhPzogYW55KSA9PiBzdGFnZXMucHVzaCh7IG5hbWUsIG9rLCAuLi4oZXh0cmEgfHwge30pIH0pO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgY2MgPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciwganMsIGFzc2V0TWFuYWdlciwgQW5pbWF0aW9uQ2xpcCwgU3ByaXRlRnJhbWUgfSA9IGNjO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJywgc3RhZ2VzIH07XG4gICAgICAgICAgICBjb25zdCBub2RlID0gZmluZE5vZGVCeVV1aWREZWVwKHNjZW5lLCBub2RlVXVpZCk7XG4gICAgICAgICAgICBpZiAoIW5vZGUpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vZGUgJHtub2RlVXVpZH0gbm90IGZvdW5kYCwgc3RhZ2VzIH07XG4gICAgICAgICAgICBpZiAoIXNwcml0ZUZyYW1lVXVpZHMgfHwgIXNwcml0ZUZyYW1lVXVpZHMubGVuZ3RoKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdzcHJpdGVGcmFtZVV1aWRzIGlzIGVtcHR5Jywgc3RhZ2VzIH07XG4gICAgICAgICAgICBzYW1wbGVSYXRlID0gc2FtcGxlUmF0ZSB8fCAxMDtcbiAgICAgICAgICAgIGNsaXBOYW1lID0gY2xpcE5hbWUgfHwgJ1Nwcml0ZUFuaW0nO1xuICAgICAgICAgICAgc2F2ZVBhdGggPSBzYXZlUGF0aCB8fCBgZGI6Ly9hc3NldHMvJHtjbGlwTmFtZX0uYW5pbWA7XG4gICAgICAgICAgICBsb29wID0gbG9vcCAhPT0gZmFsc2U7XG4gICAgICAgICAgICBwdXNoKCd2YWxpZGF0ZScsIHRydWUpO1xuXG4gICAgICAgICAgICAvLyDilIDilIAgMS4g5Yqg6L29IFNwcml0ZUZyYW1lKOWPr+mAiTvlpLHotKXotbAgdXVpZC1vbmx5IOWFnOW6lSkg4pSA4pSAXG4gICAgICAgICAgICBsZXQgZnJhbWVzOiBhbnlbXSA9IFtdO1xuICAgICAgICAgICAgbGV0IGZyYW1lc0xvYWRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBmcmFtZXMgPSBhd2FpdCBuZXcgUHJvbWlzZTxhbnlbXT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBvcHRzID0gU3ByaXRlRnJhbWUgPyB7IHR5cGU6IFNwcml0ZUZyYW1lIH0gOiB7fTtcbiAgICAgICAgICAgICAgICAgICAgYXNzZXRNYW5hZ2VyLmxvYWRBbnkoc3ByaXRlRnJhbWVVdWlkcywgb3B0cywgKGVycjogYW55LCBhc3NldHM6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikgcmVqZWN0KG5ldyBFcnJvcihgbG9hZEFueSDlpLHotKU6ICR7ZXJyLm1lc3NhZ2UgfHwgZXJyfWApKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgcmVzb2x2ZShBcnJheS5pc0FycmF5KGFzc2V0cykgPyBhc3NldHMgOiBbYXNzZXRzXSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIOaMieS8oOWFpemhuuW6j+Wvuem9kFxuICAgICAgICAgICAgICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBhbnk+KCk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBmIG9mIGZyYW1lcykgbWFwLnNldChmLl91dWlkIHx8IGYudXVpZCwgZik7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3JkZXJlZCA9IHNwcml0ZUZyYW1lVXVpZHMubWFwKHUgPT4gbWFwLmdldCh1KSkuZmlsdGVyKEJvb2xlYW4pO1xuICAgICAgICAgICAgICAgIGZyYW1lc0xvYWRlZCA9IG9yZGVyZWQubGVuZ3RoID09PSBzcHJpdGVGcmFtZVV1aWRzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBpZiAoZnJhbWVzTG9hZGVkKSBmcmFtZXMgPSBvcmRlcmVkO1xuICAgICAgICAgICAgICAgIHB1c2goJ2xvYWRGcmFtZXMnLCBmcmFtZXNMb2FkZWQsIHsgbG9hZGVkOiBvcmRlcmVkLmxlbmd0aCwgZXhwZWN0ZWQ6IHNwcml0ZUZyYW1lVXVpZHMubGVuZ3RoIH0pO1xuICAgICAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgICAgICAgcHVzaCgnbG9hZEZyYW1lcycsIGZhbHNlLCB7IGVycm9yOiBlLm1lc3NhZ2UgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIOKUgOKUgCAyLiDnlJ/miJAgLmFuaW0gSlNPTiDilIDilIBcbiAgICAgICAgICAgIGxldCBhbmltSnNvbjogYW55O1xuICAgICAgICAgICAgaWYgKGZyYW1lc0xvYWRlZCAmJiBBbmltYXRpb25DbGlwICYmIEFuaW1hdGlvbkNsaXAuY3JlYXRlV2l0aFNwcml0ZUZyYW1lcykge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNsaXAgPSBBbmltYXRpb25DbGlwLmNyZWF0ZVdpdGhTcHJpdGVGcmFtZXMoZnJhbWVzLCBzYW1wbGVSYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgY2xpcC5uYW1lID0gY2xpcE5hbWU7XG4gICAgICAgICAgICAgICAgICAgIGNsaXAud3JhcE1vZGUgPSBsb29wID8gMiA6IDE7IC8vIDI9TG9vcCwgMT1Ob3JtYWxcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VyaWFsaXplZCA9IHNlcmlhbGl6ZUNsaXBWaWFFZGl0b3JFeHRlbmRzKGNsaXApO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2VyaWFsaXplZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5pbUpzb24gPSBzZXJpYWxpemVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgcHVzaCgnYnVpbGRDbGlwKHNlcmlhbGl6ZSknLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuaW1Kc29uID0gYnVpbGRVdWlkT25seUFuaW1Kc29uKGNsaXBOYW1lLCBzcHJpdGVGcmFtZVV1aWRzLCBzYW1wbGVSYXRlLCBsb29wKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHB1c2goJ2J1aWxkQ2xpcCh1dWlkLW9ubHkpJywgISFhbmltSnNvbiwgeyByZWFzb246ICdzZXJpYWxpemUg6L+U5Zue56m6LOmZjee6pyB1dWlkLW9ubHknIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgICAgICAgICAgIGFuaW1Kc29uID0gYnVpbGRVdWlkT25seUFuaW1Kc29uKGNsaXBOYW1lLCBzcHJpdGVGcmFtZVV1aWRzLCBzYW1wbGVSYXRlLCBsb29wKTtcbiAgICAgICAgICAgICAgICAgICAgcHVzaCgnYnVpbGRDbGlwKHV1aWQtb25seSknLCAhIWFuaW1Kc29uLCB7IHJlYXNvbjogYHNlcmlhbGl6ZSDmipvplJk6ICR7ZS5tZXNzYWdlfWAsIHN0YWNrOiBlLnN0YWNrIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYW5pbUpzb24gPSBidWlsZFV1aWRPbmx5QW5pbUpzb24oY2xpcE5hbWUsIHNwcml0ZUZyYW1lVXVpZHMsIHNhbXBsZVJhdGUsIGxvb3ApO1xuICAgICAgICAgICAgICAgIHB1c2goJ2J1aWxkQ2xpcCh1dWlkLW9ubHkpJywgISFhbmltSnNvbiwgeyByZWFzb246IGZyYW1lc0xvYWRlZCA/ICdjcmVhdGVXaXRoU3ByaXRlRnJhbWVzIOS4jeWPr+eUqCcgOiAnZnJhbWVzIOacquWKoOi9vScgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWFuaW1Kc29uKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdjbGlwIEpTT04g5p6E5bu65aSx6LSlJywgc3RhZ2VzIH07XG5cbiAgICAgICAgICAgIC8vIOKUgOKUgCAzLiDlhpkgLmFuaW0g6LWE5LqnKGNvbnRlbnQg5b+F6aG7IHN0cmluZykg4pSA4pSAXG4gICAgICAgICAgICBsZXQgY2xpcFV1aWQ6IHN0cmluZyA9ICcnO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdkZWxldGUtYXNzZXQnLCBzYXZlUGF0aCkuY2F0Y2goKCkgPT4ge30pO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnRTdHIgPSB0eXBlb2YgYW5pbUpzb24gPT09ICdzdHJpbmcnID8gYW5pbUpzb24gOiBKU09OLnN0cmluZ2lmeShhbmltSnNvbik7XG4gICAgICAgICAgICAgICAgY29uc3QgY3JlYXRlUmVzOiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdjcmVhdGUtYXNzZXQnLCBzYXZlUGF0aCwgY29udGVudFN0cik7XG4gICAgICAgICAgICAgICAgY2xpcFV1aWQgPSBjcmVhdGVSZXM/LnV1aWQ7XG4gICAgICAgICAgICAgICAgcHVzaCgnY3JlYXRlQXNzZXQnLCAhIWNsaXBVdWlkLCB7IHV1aWQ6IGNsaXBVdWlkLCBjcmVhdGVSZXNUeXBlOiB0eXBlb2YgY3JlYXRlUmVzIH0pO1xuICAgICAgICAgICAgICAgIGlmICghY2xpcFV1aWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgY3JlYXRlLWFzc2V0IOacqui/lOWbniB1dWlkOiAke0pTT04uc3RyaW5naWZ5KGNyZWF0ZVJlcyl9YCwgc3RhZ2VzIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgICAgICAgcHVzaCgnY3JlYXRlQXNzZXQnLCBmYWxzZSwgeyBlcnJvcjogZS5tZXNzYWdlLCBzdGFjazogZS5zdGFjayB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBjcmVhdGUtYXNzZXQg5aSx6LSlOiAke2UubWVzc2FnZX1gLCBzdGFnZXMgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8g4pSA4pSAIDQuIOaMgeS5heWMluaMgui9vSBjYy5BbmltYXRpb24gKyBkZWZhdWx0Q2xpcCDilIDilIBcbiAgICAgICAgICAgIGxldCBhdHRhY2hlZCA9IGZhbHNlO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBub2RlRGF0YSA9IGJ1aWxkTm9kZUluZm8obm9kZSwganMpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhhc0FuaW0gPSBub2RlRGF0YS5jb21wb25lbnRzLnNvbWUoKGM6IGFueSkgPT4gYy5jaWQgPT09ICdjYy5BbmltYXRpb24nKTtcbiAgICAgICAgICAgICAgICBpZiAoIWhhc0FuaW0pIHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnY3JlYXRlLWNvbXBvbmVudCcsIHsgdXVpZDogbm9kZVV1aWQsIGNvbXBvbmVudDogJ2NjLkFuaW1hdGlvbicgfSk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHIgPT4gc2V0VGltZW91dChyLCAyNTApKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgcmVmcmVzaGVkID0gYnVpbGROb2RlSW5mbyhub2RlLCBqcyk7XG4gICAgICAgICAgICAgICAgY29uc3QgaWR4ID0gcmVmcmVzaGVkLmNvbXBvbmVudHMuZmluZEluZGV4KChjOiBhbnkpID0+IGMuY2lkID09PSAnY2MuQW5pbWF0aW9uJyk7XG4gICAgICAgICAgICAgICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogYF9fY29tcHNfXy4ke2lkeH0uZGVmYXVsdENsaXBgLFxuICAgICAgICAgICAgICAgICAgICAgICAgZHVtcDogeyB2YWx1ZTogeyB1dWlkOiBjbGlwVXVpZCB9LCB0eXBlOiAnY2MuQW5pbWF0aW9uQ2xpcCcgfVxuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoKSA9PiB7fSk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogYF9fY29tcHNfXy4ke2lkeH0ucGxheU9uTG9hZGAsXG4gICAgICAgICAgICAgICAgICAgICAgICBkdW1wOiB7IHZhbHVlOiB0cnVlIH1cbiAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goKCkgPT4ge30pO1xuICAgICAgICAgICAgICAgICAgICBhdHRhY2hlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHB1c2goJ2F0dGFjaEFuaW0nLCBhdHRhY2hlZCwgeyBjb21wSWR4OiBpZHggfSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICAgICAgICBwdXNoKCdhdHRhY2hBbmltJywgZmFsc2UsIHsgZXJyb3I6IGUubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgY2xpcFV1aWQsXG4gICAgICAgICAgICAgICAgICAgIHNhdmVQYXRoLFxuICAgICAgICAgICAgICAgICAgICBjbGlwTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgZnJhbWVDb3VudDogc3ByaXRlRnJhbWVVdWlkcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIHNhbXBsZVJhdGUsXG4gICAgICAgICAgICAgICAgICAgIGxvb3AsXG4gICAgICAgICAgICAgICAgICAgIGZyYW1lc0xvYWRlZCxcbiAgICAgICAgICAgICAgICAgICAgYXR0YWNoZWQsXG4gICAgICAgICAgICAgICAgICAgIHN0YWdlc1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGVycm9yOiAoZXJyICYmIChlcnIubWVzc2FnZSB8fCBTdHJpbmcoZXJyKSkpIHx8ICd1bmtub3duIGVycm9yIGluIGNyZWF0ZVNwcml0ZUZyYW1lQW5pbWF0aW9uJyxcbiAgICAgICAgICAgICAgICBzdGFjazogZXJyPy5zdGFjayxcbiAgICAgICAgICAgICAgICBzdGFnZXNcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKiog55SoIEVkaXRvckV4dGVuZHMuc2VyaWFsaXplIOW6j+WIl+WMliBjbGlwLOi/lOWbnuino+aekOWQjueahOWvueixoeOAguWksei0pei/lOWbniBudWxs44CCICovXG5mdW5jdGlvbiBzZXJpYWxpemVDbGlwVmlhRWRpdG9yRXh0ZW5kcyhjbGlwOiBhbnkpOiBhbnkgfCBudWxsIHtcbiAgICB0cnkge1xuICAgICAgICBjb25zdCBFRXh0OiBhbnkgPSAoZ2xvYmFsVGhpcyBhcyBhbnkpLkVkaXRvckV4dGVuZHMgfHwgKGdsb2JhbFRoaXMgYXMgYW55KS5FZGl0b3I/LkV4dGVuZHM7XG4gICAgICAgIGNvbnN0IHNlciA9IEVFeHQ/LnNlcmlhbGl6ZTtcbiAgICAgICAgaWYgKCFzZXIpIHJldHVybiBudWxsO1xuICAgICAgICBsZXQgc3RyOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGlmICh0eXBlb2Ygc2VyLnNlcmlhbGl6ZUFzc2V0ID09PSAnZnVuY3Rpb24nKSBzdHIgPSBzZXIuc2VyaWFsaXplQXNzZXQoY2xpcCk7XG4gICAgICAgIGVsc2UgaWYgKHR5cGVvZiBzZXIuc2VyaWFsaXplID09PSAnZnVuY3Rpb24nKSBzdHIgPSBzZXIuc2VyaWFsaXplKGNsaXAsIHsgYXNzZXQ6IHRydWUgfSk7XG4gICAgICAgIGVsc2UgaWYgKHR5cGVvZiBzZXIgPT09ICdmdW5jdGlvbicpIHN0ciA9IHNlcihjbGlwLCB7IGFzc2V0OiB0cnVlIH0pO1xuICAgICAgICBpZiAodHlwZW9mIHN0ciA9PT0gJ3N0cmluZycgJiYgc3RyLmxlbmd0aCkgcmV0dXJuIEpTT04ucGFyc2Uoc3RyKTtcbiAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBzZXJpYWxpemUg5aSx6LSlOiAke2UubWVzc2FnZX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICog5oyJIHV1aWQg5omL5bu6IC5hbmltIEpTT04odXVpZC1vbmx5IOWFnOW6lei3r+W+hCnjgIJcbiAqIOeUn+aIkCBDb2NvcyAzLjgg5bqP5YiX5YyW5qC85byPOmFycmF5LW9mLW9iamVjdCzpgJrov4cgX19pZF9fIOS6kuebuOW8leeUqOOAglxuICogdHJhY2sgPSBjYy5hbmltYXRpb24uT2JqZWN0VHJhY2ssY3VydmUgPSBjYy5PYmplY3RDdXJ2ZSxrZXlzL3ZhbHVlcyDlrZggW3RpbWUsIHt1dWlkfV3jgIJcbiAqXG4gKiDms6jmhI865q2k5qC85byP5Y+C54Wn5byV5pOOIGNvY29zL2NvcmUvYW5pbWF0aW9uL3RyYWNrcy9vYmplY3QtdHJhY2sudHMgK1xuICogY29jb3MvY29yZS9jdXJ2ZXMvb2JqZWN0LWN1cnZlLnRzIOeahOWPr+W6j+WIl+WMluWtl+autSzlubblr7nnhafpobnnm67lhoXml6LmnIkgLmFuaW0g5byV55So57uT5p6E44CCXG4gKi9cbmZ1bmN0aW9uIGJ1aWxkVXVpZE9ubHlBbmltSnNvbihjbGlwTmFtZTogc3RyaW5nLCBzcHJpdGVGcmFtZVV1aWRzOiBzdHJpbmdbXSwgc2FtcGxlUmF0ZTogbnVtYmVyLCBsb29wOiBib29sZWFuKTogYW55IHtcbiAgICBjb25zdCBzdGVwID0gMSAvIHNhbXBsZVJhdGU7XG4gICAgY29uc3QgZHVyYXRpb24gPSBzcHJpdGVGcmFtZVV1aWRzLmxlbmd0aCAvIHNhbXBsZVJhdGU7XG4gICAgY29uc3QgdGltZXMgPSBzcHJpdGVGcmFtZVV1aWRzLm1hcCgoXywgaSkgPT4gKyhzdGVwICogaSkudG9GaXhlZCg2KSk7XG4gICAgY29uc3QgdmFsdWVzID0gc3ByaXRlRnJhbWVVdWlkcy5tYXAodSA9PiAoeyB1dWlkOiB1IH0pKTtcblxuICAgIC8vIGFycmF5LW9mLW9iamVjdCDlvJXnlKjnu5PmnoQo57Si5byV5Y2zIF9faWRfXylcbiAgICBjb25zdCBhcnI6IGFueVtdID0gW1xuICAgICAgICB7IC8vIFswXSBjbGlwXG4gICAgICAgICAgICBfX3R5cGVfXzogJ2NjLkFuaW1hdGlvbkNsaXAnLFxuICAgICAgICAgICAgX25hbWU6IGNsaXBOYW1lLFxuICAgICAgICAgICAgX29iakZsYWdzOiAwLFxuICAgICAgICAgICAgX19lZGl0b3JFeHRyYXNfXzogeyBlbWJlZGRlZFBsYXllckdyb3VwczogW10gfSxcbiAgICAgICAgICAgIF9uYXRpdmU6ICcnLFxuICAgICAgICAgICAgc2FtcGxlOiBzYW1wbGVSYXRlLFxuICAgICAgICAgICAgc3BlZWQ6IDEsXG4gICAgICAgICAgICB3cmFwTW9kZTogbG9vcCA/IDIgOiAxLFxuICAgICAgICAgICAgZW5hYmxlVHJzQmxlbmRpbmc6IGZhbHNlLFxuICAgICAgICAgICAgX2R1cmF0aW9uOiBkdXJhdGlvbixcbiAgICAgICAgICAgIF9oYXNoOiAwLFxuICAgICAgICAgICAgX3RyYWNrczogW3sgX19pZF9fOiAxIH1dLFxuICAgICAgICAgICAgX2V4b3RpY0FuaW1hdGlvbjogbnVsbCxcbiAgICAgICAgICAgIF9ldmVudHM6IFtdLFxuICAgICAgICAgICAgX2VtYmVkZGVkUGxheWVyczogW10sXG4gICAgICAgICAgICBfYWRkaXRpdmVTZXR0aW5nczogeyBfX2lkX186IDUgfSxcbiAgICAgICAgICAgIF9hdXhpbGlhcnlDdXJ2ZUVudHJpZXM6IFtdXG4gICAgICAgIH0sXG4gICAgICAgIHsgLy8gWzFdIE9iamVjdFRyYWNrXG4gICAgICAgICAgICBfX3R5cGVfXzogJ2NjLmFuaW1hdGlvbi5PYmplY3RUcmFjaycsXG4gICAgICAgICAgICBfZGF0YTogbnVsbCxcbiAgICAgICAgICAgIF9wYXRoOiB7IF9faWRfXzogMiB9LFxuICAgICAgICAgICAgX2NoYW5uZWxzOiBbeyBfX2lkX186IDMgfV0sXG4gICAgICAgICAgICBfbkdyb3VwczogMCxcbiAgICAgICAgICAgIF9vcHQ6IDBcbiAgICAgICAgfSxcbiAgICAgICAgeyAvLyBbMl0gVHJhY2tQYXRoIChjb21wb25lbnQ9Y2MuU3ByaXRlICsgcHJvcGVydHk9c3ByaXRlRnJhbWUpXG4gICAgICAgICAgICBfX3R5cGVfXzogJ2NjLmFuaW1hdGlvbi5UcmFja1BhdGgnLFxuICAgICAgICAgICAgX3BhdGhzOiBbXG4gICAgICAgICAgICAgICAgeyBfX2lkX186IDQgfSwgIC8vIENvbXBvbmVudFBhdGhcbiAgICAgICAgICAgICAgICAnc3ByaXRlRnJhbWUnICAgIC8vIHByb3BlcnR5XG4gICAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIHsgLy8gWzNdIENoYW5uZWxcbiAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuYW5pbWF0aW9uLkNoYW5uZWwnLFxuICAgICAgICAgICAgX2N1cnZlOiB7IF9faWRfXzogNiB9LFxuICAgICAgICAgICAgX3Byb3h5OiBudWxsXG4gICAgICAgIH0sXG4gICAgICAgIHsgLy8gWzRdIENvbXBvbmVudFBhdGhcbiAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuYW5pbWF0aW9uLkNvbXBvbmVudFBhdGgnLFxuICAgICAgICAgICAgY29tcG9uZW50OiAnY2MuU3ByaXRlJ1xuICAgICAgICB9LFxuICAgICAgICB7IC8vIFs1XSBBbmltYXRpb25DbGlwQWRkaXRpdmVTZXR0aW5nc1xuICAgICAgICAgICAgX190eXBlX186ICdjYy5BbmltYXRpb25DbGlwQWRkaXRpdmVTZXR0aW5ncycsXG4gICAgICAgICAgICBhZGRpdGl2ZUZsYWdzOiAwLFxuICAgICAgICAgICAgcmVmZXJlbmNlQ2xpcDogbnVsbFxuICAgICAgICB9LFxuICAgICAgICB7IC8vIFs2XSBPYmplY3RDdXJ2ZVxuICAgICAgICAgICAgX190eXBlX186ICdjYy5PYmplY3RDdXJ2ZScsXG4gICAgICAgICAgICBfdGltZXM6IHRpbWVzLFxuICAgICAgICAgICAgX3ZhbHVlczogdmFsdWVzLFxuICAgICAgICAgICAgX2luZGV4ZWRWYWx1ZXM6IG51bGwsXG4gICAgICAgICAgICBfcHJlRXh0cmFwb2xhdGlvbjogMSxcbiAgICAgICAgICAgIF9wb3N0RXh0cmFwb2xhdGlvbjogMVxuICAgICAgICB9XG4gICAgXTtcbiAgICByZXR1cm4gYXJyO1xufVxuIl19