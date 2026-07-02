/**
 * 场景脚本实现层(由 scene.ts 代理加载,支持热重载)。
 *
 * 此文件改动后,tsc 编译 + cp 到 dist/,下一次 method 调用即生效(无需重启编辑器)。
 */
import { join } from 'path';
module.paths.push(join(Editor.App.path, 'node_modules'));

// ============ 共享辅助函数 ============

/** 深度递归查找节点(原 scene.getChildByUuid 仅搜直接子节点,孙节点永远找不到) */
function findNodeByUuidDeep(root: any, nodeUuid: string): any {
    if (!root || !nodeUuid) return null;
    if (root.uuid === nodeUuid) return root;
    const children = root.children || [];
    for (const child of children) {
        const found = findNodeByUuidDeep(child, nodeUuid);
        if (found) return found;
    }
    return null;
}

/** 把运行时节点归一化为稳定结构,供 wrapper 与验证统一消费 */
function buildNodeInfo(node: any, js: any): any {
    const comps = (node.components || []).map((comp: any, index: number) => {
        const ctor = comp.constructor;
        let cid: string;
        try { cid = js.getClassId(ctor); } catch { cid = ctor.name; }
        let compUuid: string | null = null;
        try { compUuid = comp.uuid || null; } catch { /* ignore */ }
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
        children: (node.children || []).map((child: any) => child.uuid),
        components: comps
    };
}

/** 按组件类型查找节点上的组件实例(支持 FQN 'cc.Sprite' 与短名 'Sprite') */
function findComponentOnNode(node: any, componentType: string, js: any): any {
    const normalize = (s: string) => (s || '').toLowerCase().replace(/^cc\./, '');
    const target = normalize(componentType);
    const comps = node.components || [];
    for (const comp of comps) {
        let cid = '';
        try { cid = js.getClassId(comp.constructor) || ''; } catch { /* ignore */ }
        if (normalize(cid) === target || normalize(comp.constructor.name) === target) {
            return comp;
        }
    }
    return null;
}

/** 提取组件实例的可枚举属性值,跳过引擎内部 `_` 前缀字段 */
function extractComponentProps(comp: any): Record<string, any> {
    const result: Record<string, any> = {};
    let proto = comp;
    const seen = new Set<string>();
    while (proto && proto !== Object.prototype) {
        const names = Object.getOwnPropertyNames(proto);
        for (const key of names) {
            if (seen.has(key)) continue;
            seen.add(key);
            if (key.startsWith('_')) continue;
            if (key === 'node' || key === 'enabled' || key === 'enabledInHierarchy') continue;
            let val: any;
            try { val = comp[key]; } catch { continue; }
            if (typeof val === 'function') continue;
            result[key] = normalizeValue(val);
        }
        proto = Object.getPrototypeOf(proto);
    }
    return result;
}

/** 把运行时值归一化为可 JSON 化的简单结构 */
function normalizeValue(val: any): any {
    if (val === null || val === undefined) return val;
    if (typeof val !== 'object') return val;
    const has = (...ks: string[]) => ks.every(k => k in val);
    try {
        if (has('r', 'g', 'b')) {
            const a = (val.a !== undefined) ? val.a : 255;
            return { r: val.r, g: val.g, b: val.b, a };
        }
        if (has('x', 'y', 'z', 'w')) return { x: val.x, y: val.y, z: val.z, w: val.w };
        if (has('x', 'y', 'z')) return { x: val.x, y: val.y, z: val.z };
        if (has('x', 'y')) return { x: val.x, y: val.y };
        if (has('width', 'height')) return { width: val.width, height: val.height };
    } catch { /* fallthrough */ }
    if (val._uuid || (val.uuid && typeof val.uuid === 'string')) {
        return { uuid: val._uuid || val.uuid, type: val.constructor ? val.constructor.name : 'Asset' };
    }
    if (Array.isArray(val)) {
        return val.slice(0, 64).map(normalizeValue);
    }
    const out: Record<string, any> = {};
    const seen = new Set<string>();
    let proto = val;
    let count = 0;
    while (proto && proto !== Object.prototype && count < 32) {
        for (const k of Object.getOwnPropertyNames(proto)) {
            if (seen.has(k) || k.startsWith('_')) continue;
            seen.add(k);
            if (['node', 'enabled', 'enabledInHierarchy', 'constructor'].includes(k)) continue;
            let v: any;
            try { v = val[k]; } catch { continue; }
            if (typeof v === 'function') continue;
            out[k] = (v !== null && typeof v === 'object') ? '[object]' : v;
            count++;
            if (count >= 32) break;
        }
        proto = Object.getPrototypeOf(proto);
    }
    return out;
}

export const methods: { [key: string]: (...any: any) => any } = {
    /**
     * 诊断:async 方法是否被 execute-scene-script 支持(也用于验证代理热重载链路)
     */
    async testAsyncMethod(delayMs: number) {
        try {
            await new Promise(r => setTimeout(r, delayMs || 100));
            return { success: true, data: { msg: 'async method executed v2', delay: delayMs || 100 } };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    },

    createNewScene() {        try {
            const { director, Scene } = require('cc');
            const scene = new Scene();
            scene.name = 'New Scene';
            director.runScene(scene);
            return { success: true, message: 'New scene created successfully' };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    addComponentToNode(nodeUuid: string, componentType: string) {
        try {
            const { director, js } = require('cc');
            const scene = director.getScene();
            if (!scene) return { success: false, error: 'No active scene' };
            const node = scene.getChildByUuid(nodeUuid);
            if (!node) return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            const ComponentClass = js.getClassByName(componentType);
            if (!ComponentClass) return { success: false, error: `Component type ${componentType} not found` };
            const component = node.addComponent(ComponentClass);
            return { success: true, message: `Component ${componentType} added`, data: { componentId: component.uuid } };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    removeComponentFromNode(nodeUuid: string, componentType: string) {
        try {
            const { director, js } = require('cc');
            const scene = director.getScene();
            if (!scene) return { success: false, error: 'No active scene' };
            const node = scene.getChildByUuid(nodeUuid);
            if (!node) return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            const ComponentClass = js.getClassByName(componentType);
            if (!ComponentClass) return { success: false, error: `Component type ${componentType} not found` };
            const component = node.getComponent(ComponentClass);
            if (!component) return { success: false, error: `Component ${componentType} not found on node` };
            node.removeComponent(component);
            return { success: true, message: `Component ${componentType} removed` };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    createNode(name: string, parentUuid?: string) {
        try {
            const { director, Node } = require('cc');
            const scene = director.getScene();
            if (!scene) return { success: false, error: 'No active scene' };
            const node = new Node(name);
            if (parentUuid) {
                const parent = scene.getChildByUuid(parentUuid);
                if (parent) parent.addChild(node); else scene.addChild(node);
            } else {
                scene.addChild(node);
            }
            return { success: true, message: `Node ${name} created`, data: { uuid: node.uuid, name: node.name } };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * 获取节点信息(归一化)。components 含 cid(FQN)+ name(短名)+ index。
     */
    getNodeInfo(nodeUuid: string) {
        try {
            const { director, js } = require('cc');
            const scene = director.getScene();
            if (!scene) return { success: false, error: 'No active scene' };
            const node = findNodeByUuidDeep(scene, nodeUuid);
            if (!node) return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            return { success: true, data: buildNodeInfo(node, js) };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * 获取单个组件详情:所有可枚举实例属性的值,用于 set-property 写后真实验证读回。
     */
    getComponentDetail(nodeUuid: string, componentType: string) {
        try {
            const { director, js } = require('cc');
            const scene = director.getScene();
            if (!scene) return { success: false, error: 'No active scene' };
            const node = findNodeByUuidDeep(scene, nodeUuid);
            if (!node) return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            const comp = findComponentOnNode(node, componentType, js);
            if (!comp) return { success: false, error: `Component ${componentType} not found on node ${node.name}` };
            const props = extractComponentProps(comp);
            return {
                success: true,
                data: { cid: js.getClassId(comp.constructor), name: comp.constructor.name, enabled: comp.enabled, properties: props }
            };
        } catch (error: any) {
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
            if (!scene) return { success: false, error: 'No active scene' };
            const buildTree = (node: any): any => {
                const comps = (node.components || []).map((comp: any) => {
                    let cid = '';
                    try { cid = js.getClassId(comp.constructor) || ''; } catch { /* ignore */ }
                    return cid || comp.constructor.name;
                });
                return {
                    name: node.name,
                    uuid: node.uuid,
                    active: node.active,
                    parent: node.parent ? node.parent.uuid : null,
                    components: comps,
                    children: (node.children || []).map((child: any) => buildTree(child))
                };
            };
            return { success: true, data: buildTree(scene) };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    findNodeByName(name: string) {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene) return { success: false, error: 'No active scene' };
            const node = scene.getChildByName(name);
            if (!node) return { success: false, error: `Node with name ${name} not found` };
            return { success: true, data: { uuid: node.uuid, name: node.name, active: node.active, position: node.position } };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    getCurrentSceneInfo() {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene) return { success: false, error: 'No active scene' };
            return { success: true, data: { name: scene.name, uuid: scene.uuid, nodeCount: scene.children.length } };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    setNodeProperty(nodeUuid: string, property: string, value: any) {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene) return { success: false, error: 'No active scene' };
            const node = scene.getChildByUuid(nodeUuid);
            if (!node) return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            if (property === 'position') node.setPosition(value.x || 0, value.y || 0, value.z || 0);
            else if (property === 'rotation') node.setRotationFromEuler(value.x || 0, value.y || 0, value.z || 0);
            else if (property === 'scale') node.setScale(value.x || 1, value.y || 1, value.z || 1);
            else if (property === 'active') node.active = value;
            else if (property === 'name') node.name = value;
            else (node as any)[property] = value;
            return { success: true, message: `Property '${property}' updated` };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    getSceneHierarchy(includeComponents: boolean = false) {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene) return { success: false, error: 'No active scene' };
            const processNode = (node: any): any => {
                const result: any = { name: node.name, uuid: node.uuid, active: node.active, children: [] };
                if (includeComponents) {
                    result.components = node.components.map((comp: any) => ({ type: comp.constructor.name, enabled: comp.enabled }));
                }
                if (node.children && node.children.length > 0) {
                    result.children = node.children.map((child: any) => processNode(child));
                }
                return result;
            };
            return { success: true, data: scene.children.map((child: any) => processNode(child)) };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    createPrefabFromNode(nodeUuid: string, prefabPath: string) {
        // 真正的 prefab 创建用 prefab_create_prefab 工具(prefab-tools),这里仅保留接口兼容
        return { success: false, error: '使用 prefab_create_prefab 工具替代场景脚本 createPrefabFromNode' };
    },

    setComponentProperty(nodeUuid: string, componentType: string, property: string, value: any) {
        try {
            const { director, js } = require('cc');
            const scene = director.getScene();
            if (!scene) return { success: false, error: 'No active scene' };
            const node = scene.getChildByUuid(nodeUuid);
            if (!node) return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            const ComponentClass = js.getClassByName(componentType);
            if (!ComponentClass) return { success: false, error: `Component type ${componentType} not found` };
            const component = node.getComponent(ComponentClass);
            if (!component) return { success: false, error: `Component ${componentType} not found on node` };
            // 资产类属性(spriteFrame/material)按 uuid 加载
            if (typeof value === 'string' && (property === 'spriteFrame' || property === 'material')) {
                const assetManager = require('cc').assetManager;
                const AssetType = property === 'spriteFrame' ? require('cc').SpriteFrame : require('cc').Material;
                assetManager.loadAny({ uuid: value, type: AssetType }, (err: any, asset: any) => {
                    if (!err && asset) (component as any)[property] = asset;
                });
            } else {
                (component as any)[property] = value;
            }
            return { success: true, message: `Component property '${property}' updated` };
        } catch (error: any) {
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
    async createSpriteFrameAnimation(nodeUuid: string, spriteFrameUuids: string[], sampleRate: number, clipName: string, savePath: string, loop: boolean) {
        const stages: any[] = [];
        const push = (name: string, ok: boolean, extra?: any) => stages.push({ name, ok, ...(extra || {}) });
        try {
            const cc = require('cc');
            const { director, js, assetManager, AnimationClip, SpriteFrame } = cc;
            const scene = director.getScene();
            if (!scene) return { success: false, error: 'No active scene', stages };
            const node = findNodeByUuidDeep(scene, nodeUuid);
            if (!node) return { success: false, error: `Node ${nodeUuid} not found`, stages };
            if (!spriteFrameUuids || !spriteFrameUuids.length) return { success: false, error: 'spriteFrameUuids is empty', stages };
            sampleRate = sampleRate || 10;
            clipName = clipName || 'SpriteAnim';
            savePath = savePath || `db://assets/${clipName}.anim`;
            loop = loop !== false;
            push('validate', true);

            // ── 1. 加载 SpriteFrame(可选;失败走 uuid-only 兜底) ──
            let frames: any[] = [];
            let framesLoaded = false;
            try {
                frames = await new Promise<any[]>((resolve, reject) => {
                    const opts = SpriteFrame ? { type: SpriteFrame } : {};
                    assetManager.loadAny(spriteFrameUuids, opts, (err: any, assets: any) => {
                        if (err) reject(new Error(`loadAny 失败: ${err.message || err}`));
                        else resolve(Array.isArray(assets) ? assets : [assets]);
                    });
                });
                // 按传入顺序对齐
                const map = new Map<string, any>();
                for (const f of frames) map.set(f._uuid || f.uuid, f);
                const ordered = spriteFrameUuids.map(u => map.get(u)).filter(Boolean);
                framesLoaded = ordered.length === spriteFrameUuids.length;
                if (framesLoaded) frames = ordered;
                push('loadFrames', framesLoaded, { loaded: ordered.length, expected: spriteFrameUuids.length });
            } catch (e: any) {
                push('loadFrames', false, { error: e.message });
            }

            // ── 2. 生成 .anim JSON ──
            let animJson: any;
            if (framesLoaded && AnimationClip && AnimationClip.createWithSpriteFrames) {
                try {
                    const clip = AnimationClip.createWithSpriteFrames(frames, sampleRate);
                    clip.name = clipName;
                    clip.wrapMode = loop ? 2 : 1; // 2=Loop, 1=Normal
                    const serialized = serializeClipViaEditorExtends(clip);
                    if (serialized) {
                        animJson = serialized;
                        push('buildClip(serialize)', true);
                    } else {
                        animJson = buildUuidOnlyAnimJson(clipName, spriteFrameUuids, sampleRate, loop);
                        push('buildClip(uuid-only)', !!animJson, { reason: 'serialize 返回空,降级 uuid-only' });
                    }
                } catch (e: any) {
                    animJson = buildUuidOnlyAnimJson(clipName, spriteFrameUuids, sampleRate, loop);
                    push('buildClip(uuid-only)', !!animJson, { reason: `serialize 抛错: ${e.message}`, stack: e.stack });
                }
            } else {
                animJson = buildUuidOnlyAnimJson(clipName, spriteFrameUuids, sampleRate, loop);
                push('buildClip(uuid-only)', !!animJson, { reason: framesLoaded ? 'createWithSpriteFrames 不可用' : 'frames 未加载' });
            }
            if (!animJson) return { success: false, error: 'clip JSON 构建失败', stages };

            // ── 3. 写 .anim 资产(content 必须 string) ──
            let clipUuid: string = '';
            try {
                await Editor.Message.request('asset-db', 'delete-asset', savePath).catch(() => {});
                const contentStr = typeof animJson === 'string' ? animJson : JSON.stringify(animJson);
                const createRes: any = await Editor.Message.request('asset-db', 'create-asset', savePath, contentStr);
                clipUuid = createRes?.uuid;
                push('createAsset', !!clipUuid, { uuid: clipUuid, createResType: typeof createRes });
                if (!clipUuid) {
                    return { success: false, error: `create-asset 未返回 uuid: ${JSON.stringify(createRes)}`, stages };
                }
            } catch (e: any) {
                push('createAsset', false, { error: e.message, stack: e.stack });
                return { success: false, error: `create-asset 失败: ${e.message}`, stages };
            }

            // ── 4. 持久化挂载 cc.Animation + defaultClip ──
            let attached = false;
            try {
                const nodeData = buildNodeInfo(node, js);
                const hasAnim = nodeData.components.some((c: any) => c.cid === 'cc.Animation');
                if (!hasAnim) {
                    await Editor.Message.request('scene', 'create-component', { uuid: nodeUuid, component: 'cc.Animation' });
                    await new Promise(r => setTimeout(r, 250));
                }
                const refreshed = buildNodeInfo(node, js);
                const idx = refreshed.components.findIndex((c: any) => c.cid === 'cc.Animation');
                if (idx >= 0) {
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: `__comps__.${idx}.defaultClip`,
                        dump: { value: { uuid: clipUuid }, type: 'cc.AnimationClip' }
                    }).catch(() => {});
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: `__comps__.${idx}.playOnLoad`,
                        dump: { value: true }
                    }).catch(() => {});
                    attached = true;
                }
                push('attachAnim', attached, { compIdx: idx });
            } catch (e: any) {
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
        } catch (err: any) {
            return {
                success: false,
                error: (err && (err.message || String(err))) || 'unknown error in createSpriteFrameAnimation',
                stack: err?.stack,
                stages
            };
        }
    }
};

/** 用 EditorExtends.serialize 序列化 clip,返回解析后的对象。失败返回 null。 */
function serializeClipViaEditorExtends(clip: any): any | null {
    try {
        const EExt: any = (globalThis as any).EditorExtends || (globalThis as any).Editor?.Extends;
        const ser = EExt?.serialize;
        if (!ser) return null;
        let str: string | undefined;
        if (typeof ser.serializeAsset === 'function') str = ser.serializeAsset(clip);
        else if (typeof ser.serialize === 'function') str = ser.serialize(clip, { asset: true });
        else if (typeof ser === 'function') str = ser(clip, { asset: true });
        if (typeof str === 'string' && str.length) return JSON.parse(str);
    } catch (e: any) {
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
function buildUuidOnlyAnimJson(clipName: string, spriteFrameUuids: string[], sampleRate: number, loop: boolean): any {
    const step = 1 / sampleRate;
    const duration = spriteFrameUuids.length / sampleRate;
    const times = spriteFrameUuids.map((_, i) => +(step * i).toFixed(6));
    const values = spriteFrameUuids.map(u => ({ uuid: u }));

    // array-of-object 引用结构(索引即 __id__)
    const arr: any[] = [
        { // [0] clip
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
        { // [1] ObjectTrack
            __type__: 'cc.animation.ObjectTrack',
            _data: null,
            _path: { __id__: 2 },
            _channels: [{ __id__: 3 }],
            _nGroups: 0,
            _opt: 0
        },
        { // [2] TrackPath (component=cc.Sprite + property=spriteFrame)
            __type__: 'cc.animation.TrackPath',
            _paths: [
                { __id__: 4 },  // ComponentPath
                'spriteFrame'    // property
            ]
        },
        { // [3] Channel
            __type__: 'cc.animation.Channel',
            _curve: { __id__: 6 },
            _proxy: null
        },
        { // [4] ComponentPath
            __type__: 'cc.animation.ComponentPath',
            component: 'cc.Sprite'
        },
        { // [5] AnimationClipAdditiveSettings
            __type__: 'cc.AnimationClipAdditiveSettings',
            additiveFlags: 0,
            referenceClip: null
        },
        { // [6] ObjectCurve
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
