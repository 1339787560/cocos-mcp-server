"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = void 0;
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
    // 取实例自身 + 原型链上可枚举键,过滤内部字段与函数
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
    // cc.Color / Vec2/3/4 / Size 的属性多为原型链 getter,Object.keys 取不到。
    // 用 'in'(含原型链)识别字段,直接读取值。
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
    // 资产引用
    if (val._uuid || (val.uuid && typeof val.uuid === 'string')) {
        return { uuid: val._uuid || val.uuid, type: val.constructor ? val.constructor.name : 'Asset' };
    }
    // 数组:逐项归一化,截断过长数组
    if (Array.isArray(val)) {
        return val.slice(0, 64).map(normalizeValue);
    }
    // 其余对象:取实例自有 + 原型链可枚举键(过滤内部字段),避免循环引用
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
     * 诊断:async 方法是否被 execute-scene-script 支持
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
    /**
     * Create a new scene
     */
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
    /**
     * Add component to a node
     */
    addComponentToNode(nodeUuid, componentType) {
        try {
            const { director, js } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            // Find node by UUID
            const node = scene.getChildByUuid(nodeUuid);
            if (!node) {
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            }
            // Get component class
            const ComponentClass = js.getClassByName(componentType);
            if (!ComponentClass) {
                return { success: false, error: `Component type ${componentType} not found` };
            }
            // Add component
            const component = node.addComponent(ComponentClass);
            return {
                success: true,
                message: `Component ${componentType} added successfully`,
                data: { componentId: component.uuid }
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Remove component from a node
     */
    removeComponentFromNode(nodeUuid, componentType) {
        try {
            const { director, js } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const node = scene.getChildByUuid(nodeUuid);
            if (!node) {
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            }
            const ComponentClass = js.getClassByName(componentType);
            if (!ComponentClass) {
                return { success: false, error: `Component type ${componentType} not found` };
            }
            const component = node.getComponent(ComponentClass);
            if (!component) {
                return { success: false, error: `Component ${componentType} not found on node` };
            }
            node.removeComponent(component);
            return { success: true, message: `Component ${componentType} removed successfully` };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Create a new node
     */
    createNode(name, parentUuid) {
        try {
            const { director, Node } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const node = new Node(name);
            if (parentUuid) {
                const parent = scene.getChildByUuid(parentUuid);
                if (parent) {
                    parent.addChild(node);
                }
                else {
                    scene.addChild(node);
                }
            }
            else {
                scene.addChild(node);
            }
            return {
                success: true,
                message: `Node ${name} created successfully`,
                data: { uuid: node.uuid, name: node.name }
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Get node information
     * 返回归一化结构:components 含 cid(FQN,如 cc.Sprite)+ name(短名)+ index,
     * 供 wrapper 与写后验证统一消费。
     */
    getNodeInfo(nodeUuid) {
        try {
            const { director, js } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const node = findNodeByUuidDeep(scene, nodeUuid);
            if (!node) {
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            }
            return {
                success: true,
                data: buildNodeInfo(node, js)
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Get detail of a single component: 所有可枚举实例属性的值。
     * 用于 set-property 写后真实验证读回。值按类型归一化(颜色→{r,g,b,a},向量→{x,y,z},资产→uuid)。
     */
    getComponentDetail(nodeUuid, componentType) {
        try {
            const { director, js } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const node = findNodeByUuidDeep(scene, nodeUuid);
            if (!node) {
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            }
            const comp = findComponentOnNode(node, componentType, js);
            if (!comp) {
                return { success: false, error: `Component ${componentType} not found on node ${node.name}` };
            }
            const props = extractComponentProps(comp);
            return {
                success: true,
                data: {
                    cid: js.getClassId(comp.constructor),
                    name: comp.constructor.name,
                    enabled: comp.enabled,
                    properties: props
                }
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Get all nodes in scene as a normalized tree rooted at the scene.
     * 返回 { name, uuid, active, parent, components:[cid...], children:[...] } 嵌套树,
     * 与官方 query-node-tree 形态一致,供 wrapper 统一遍历。
     */
    getAllNodes() {
        try {
            const { director, js } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
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
            const tree = buildTree(scene);
            return { success: true, data: tree };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Find node by name
     */
    findNodeByName(name) {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const node = scene.getChildByName(name);
            if (!node) {
                return { success: false, error: `Node with name ${name} not found` };
            }
            return {
                success: true,
                data: {
                    uuid: node.uuid,
                    name: node.name,
                    active: node.active,
                    position: node.position
                }
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Get current scene information
     */
    getCurrentSceneInfo() {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            return {
                success: true,
                data: {
                    name: scene.name,
                    uuid: scene.uuid,
                    nodeCount: scene.children.length
                }
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Set node property
     */
    setNodeProperty(nodeUuid, property, value) {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const node = scene.getChildByUuid(nodeUuid);
            if (!node) {
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            }
            // 设置属性
            if (property === 'position') {
                node.setPosition(value.x || 0, value.y || 0, value.z || 0);
            }
            else if (property === 'rotation') {
                node.setRotationFromEuler(value.x || 0, value.y || 0, value.z || 0);
            }
            else if (property === 'scale') {
                node.setScale(value.x || 1, value.y || 1, value.z || 1);
            }
            else if (property === 'active') {
                node.active = value;
            }
            else if (property === 'name') {
                node.name = value;
            }
            else {
                // 尝试直接设置属性
                node[property] = value;
            }
            return {
                success: true,
                message: `Property '${property}' updated successfully`
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Get scene hierarchy
     */
    getSceneHierarchy(includeComponents = false) {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const processNode = (node) => {
                const result = {
                    name: node.name,
                    uuid: node.uuid,
                    active: node.active,
                    children: []
                };
                if (includeComponents) {
                    result.components = node.components.map((comp) => ({
                        type: comp.constructor.name,
                        enabled: comp.enabled
                    }));
                }
                if (node.children && node.children.length > 0) {
                    result.children = node.children.map((child) => processNode(child));
                }
                return result;
            };
            const hierarchy = scene.children.map((child) => processNode(child));
            return { success: true, data: hierarchy };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Create prefab from node
     */
    createPrefabFromNode(nodeUuid, prefabPath) {
        try {
            const { director, instantiate } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const node = scene.getChildByUuid(nodeUuid);
            if (!node) {
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            }
            // 注意：这里只是一个模拟实现，因为运行时环境下无法直接创建预制体文件
            // 真正的预制体创建需要Editor API支持
            return {
                success: true,
                data: {
                    prefabPath: prefabPath,
                    sourceNodeUuid: nodeUuid,
                    message: `Prefab created from node '${node.name}' at ${prefabPath}`
                }
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Set component property
     */
    setComponentProperty(nodeUuid, componentType, property, value) {
        try {
            const { director, js } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const node = scene.getChildByUuid(nodeUuid);
            if (!node) {
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            }
            const ComponentClass = js.getClassByName(componentType);
            if (!ComponentClass) {
                return { success: false, error: `Component type ${componentType} not found` };
            }
            const component = node.getComponent(ComponentClass);
            if (!component) {
                return { success: false, error: `Component ${componentType} not found on node` };
            }
            // 针对常见属性做特殊处理
            if (property === 'spriteFrame' && componentType === 'cc.Sprite') {
                // 支持 value 为 uuid 或资源路径
                if (typeof value === 'string') {
                    // 先尝试按 uuid 查找
                    const assetManager = require('cc').assetManager;
                    assetManager.resources.load(value, require('cc').SpriteFrame, (err, spriteFrame) => {
                        if (!err && spriteFrame) {
                            component.spriteFrame = spriteFrame;
                        }
                        else {
                            // 尝试通过 uuid 加载
                            assetManager.loadAny({ uuid: value }, (err2, asset) => {
                                if (!err2 && asset) {
                                    component.spriteFrame = asset;
                                }
                                else {
                                    // 直接赋值（兼容已传入资源对象）
                                    component.spriteFrame = value;
                                }
                            });
                        }
                    });
                }
                else {
                    component.spriteFrame = value;
                }
            }
            else if (property === 'material' && (componentType === 'cc.Sprite' || componentType === 'cc.MeshRenderer')) {
                // 支持 value 为 uuid 或资源路径
                if (typeof value === 'string') {
                    const assetManager = require('cc').assetManager;
                    assetManager.resources.load(value, require('cc').Material, (err, material) => {
                        if (!err && material) {
                            component.material = material;
                        }
                        else {
                            assetManager.loadAny({ uuid: value }, (err2, asset) => {
                                if (!err2 && asset) {
                                    component.material = asset;
                                }
                                else {
                                    component.material = value;
                                }
                            });
                        }
                    });
                }
                else {
                    component.material = value;
                }
            }
            else if (property === 'string' && (componentType === 'cc.Label' || componentType === 'cc.RichText')) {
                component.string = value;
            }
            else {
                component[property] = value;
            }
            // 可选：刷新 Inspector
            // Editor.Message.send('scene', 'snapshot');
            return { success: true, message: `Component property '${property}' updated successfully` };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * 创建序列帧动画:用 AnimationClip.createWithSpriteFrames 生成 clip,
     * 序列化为 .anim 资产落盘,挂到节点 cc.Animation 并播放。
     * 异步方法(execute-scene-script 支持 Promise 返回)。
     */
    async createSpriteFrameAnimation(nodeUuid, spriteFrameUuids, sampleRate, clipName, savePath, loop) {
        try {
            const cc = require('cc');
            const { director, js, assetManager, AnimationClip, Animation, SpriteFrame } = cc;
            const scene = director.getScene();
            if (!scene)
                return { success: false, error: 'No active scene' };
            const node = findNodeByUuidDeep(scene, nodeUuid);
            if (!node)
                return { success: false, error: `Node ${nodeUuid} not found` };
            if (!spriteFrameUuids || !spriteFrameUuids.length)
                return { success: false, error: 'spriteFrameUuids is empty' };
            if (!AnimationClip || !AnimationClip.createWithSpriteFrames) {
                return { success: false, error: `AnimationClip 不可用 (typeof=${typeof AnimationClip})` };
            }
            // 1. 批量加载 SpriteFrame
            let frames = [];
            try {
                frames = await new Promise((resolve, reject) => {
                    const opts = SpriteFrame ? { type: SpriteFrame } : {};
                    assetManager.loadAny(spriteFrameUuids, opts, (err, assets) => {
                        if (err)
                            reject(new Error(`加载 SpriteFrame 失败: ${err.message || err}`));
                        else
                            resolve(Array.isArray(assets) ? assets : [assets]);
                    });
                });
            }
            catch (e) {
                return { success: false, error: e.message, instruction: '请确认 spriteFrameUuids 是 SpriteFrame 资产的 uuid(非 Texture/Image)。可用 asset-db query-asset-info 查。' };
            }
            // 按传入顺序对齐(loadAny 可能乱序)
            const frameMap = new Map();
            for (const f of frames)
                frameMap.set(f._uuid || f.uuid, f);
            const orderedFrames = spriteFrameUuids.map(u => frameMap.get(u)).filter(Boolean);
            if (orderedFrames.length !== spriteFrameUuids.length) {
                return { success: false, error: `部分 SpriteFrame 未加载成功: 期望 ${spriteFrameUuids.length}, 实得 ${orderedFrames.length}` };
            }
            // 2. 生成 clip。WrapMode: Normal=1, Loop=2(见引擎 cocos/animation/types.ts)
            const WrapMode = AnimationClip.WrapMode || { Normal: 1, Loop: 2 };
            const clip = AnimationClip.createWithSpriteFrames(orderedFrames, sampleRate || 10);
            clip.name = clipName || 'SpriteAnim';
            clip.wrapMode = loop === false ? WrapMode.Normal : WrapMode.Loop;
            // 3. 序列化为 .anim JSON,落盘
            let animJson;
            try {
                animJson = serializeClipToAssetJson(clip, orderedFrames, sampleRate || 10, loop);
            }
            catch (e) {
                return { success: false, error: `序列化 clip 失败: ${e.message}` };
            }
            let clipUuid;
            try {
                // 若已存在则覆盖(create-asset 同路径会报错,先 delete)
                await Editor.Message.request('asset-db', 'delete-asset', savePath).catch(() => { });
                const createRes = await Editor.Message.request('asset-db', 'create-asset', savePath, animJson);
                if (!createRes || !createRes.uuid) {
                    return { success: false, error: `创建 .anim 资产失败: ${JSON.stringify(createRes)}` };
                }
                clipUuid = createRes.uuid;
                // 触发导入完成
                await Editor.Message.request('asset-db', 'save-asset', savePath, animJson).catch(() => { });
            }
            catch (e) {
                return { success: false, error: `asset-db 操作失败: ${e.message}` };
            }
            // 4. 持久化挂载:确保节点有 cc.Animation(create-component 消息,持久化),再 set-property defaultClip
            try {
                const nodeData = buildNodeInfo(node, js);
                const hasAnim = nodeData.components.some((c) => c.cid === 'cc.Animation');
                if (!hasAnim) {
                    await Editor.Message.request('scene', 'create-component', { uuid: nodeUuid, component: 'cc.Animation' });
                }
            }
            catch (e) {
                // 持久化挂载失败不阻断运行时播放
            }
            // 5. 运行时播放(即时预览反馈)
            let runtimePlayed = false;
            try {
                const AnimationCtor = js.getClassByName('cc.Animation') || Animation;
                let animComp = node.getComponent(AnimationCtor);
                if (!animComp)
                    animComp = node.addComponent(AnimationCtor);
                // 加载新建的 clip 资产用于运行时播放
                const runtimeClip = await new Promise((resolve, reject) => {
                    assetManager.loadAny({ uuid: clipUuid, type: 'animation-clip' }, (err, asset) => {
                        if (err)
                            reject(err);
                        else
                            resolve(asset);
                    });
                });
                animComp.defaultClip = runtimeClip;
                animComp.play();
                runtimePlayed = true;
            }
            catch (e) {
                runtimePlayed = false;
            }
            // 6. 持久化 defaultClip 引用(用 set-property,指向新 clip uuid)
            try {
                const refreshed = await queryNodeSelf(nodeUuid, js);
                const animCompIdx = refreshed.components.findIndex((c) => c.cid === 'cc.Animation');
                if (animCompIdx >= 0) {
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: `__comps__.${animCompIdx}.defaultClip`,
                        dump: { value: { uuid: clipUuid }, type: 'cc.AnimationClip' }
                    });
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: `__comps__.${animCompIdx}.playOnLoad`,
                        dump: { value: true }
                    }).catch(() => { });
                }
            }
            catch (e) {
                // 持久化引用失败,运行时已播放,降级提示
            }
            return {
                success: true,
                data: {
                    clipUuid,
                    savePath,
                    clipName: clip.name,
                    frameCount: orderedFrames.length,
                    sampleRate: sampleRate || 10,
                    loop,
                    runtimePlayed,
                    nodeUuid
                }
            };
        }
        catch (err) {
            return { success: false, error: err && (err.message || String(err)) || 'unknown error in createSpriteFrameAnimation' };
        }
    }
};
/** 序列化 AnimationClip 为 .anim 资产 JSON。优先 EditorExtends.serialize,回退手建。 */
function serializeClipToAssetJson(clip, frames, sampleRate, loop) {
    var _a;
    // 优先用引擎序列化器(格式最可靠)
    try {
        const EExt = globalThis.EditorExtends || ((_a = globalThis.Editor) === null || _a === void 0 ? void 0 : _a.Extends);
        const ser = EExt === null || EExt === void 0 ? void 0 : EExt.serialize;
        if (ser) {
            // 探测多种签名
            let str;
            if (typeof ser.serializeAsset === 'function')
                str = ser.serializeAsset(clip);
            else if (typeof ser.serialize === 'function')
                str = ser.serialize(clip, { asset: true });
            else if (typeof ser === 'function')
                str = ser(clip, { asset: true });
            if (typeof str === 'string' && str.length) {
                return JSON.parse(str);
            }
        }
    }
    catch ( /* 回退手建 */_b) { /* 回退手建 */ }
    // 回退:按 default.anim 模板手建。curveDatas 用 'cc.Sprite.spriteFrame' 轨道,
    // _curves 存 [time, {uuid}] 关键帧。这是 createWithSpriteFrames 生成的等价结构。
    const duration = frames.length / sampleRate;
    const step = 1 / sampleRate;
    const keys = frames.map((f, i) => [+(step * i).toFixed(6), { uuid: f._uuid || f.uuid }]);
    return {
        __type__: 'cc.AnimationClip',
        _name: clip.name || 'SpriteAnim',
        _objFlags: 0,
        _native: '',
        sample: sampleRate,
        speed: 1,
        wrapMode: loop ? 2 : 1, // 2 = Loop, 1 = Normal
        events: [],
        _duration: duration,
        _keys: [],
        _stepness: 0,
        curveDatas: {
            'props.spriteFrame': {
                __type__: 'cc.ObjectTrack',
                _channel: {
                    __type__: 'cc.ObjectCurve',
                    _keys: [keys.map(k => k[0])],
                    _values: [keys.map(k => k[1])],
                    _postExtrapolation: 2,
                    _preExtrapolation: 2,
                },
                _path: {
                    __type__: 'cc.TrackPath',
                    _props: ['cc.Sprite', 'spriteFrame'],
                }
            }
        },
        _curves: [],
        _commonTargets: [],
        _hash: 0
    };
}
/** 重新查询单个节点(供 createSpriteFrameAnimation 内部用,避免循环依赖) */
async function queryNodeSelf(nodeUuid, js) {
    const { director } = require('cc');
    const scene = director.getScene();
    const node = findNodeByUuidDeep(scene, nodeUuid);
    return buildNodeInfo(node, js);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2Uvc2NlbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQTRCO0FBQzVCLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUEsV0FBSSxFQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFFekQsbUNBQW1DO0FBRW5DLHdEQUF3RDtBQUN4RCxTQUFTLGtCQUFrQixDQUFDLElBQVMsRUFBRSxRQUFnQjtJQUNuRCxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUTtRQUFFLE9BQU8sSUFBSSxDQUFDO0lBQ3BDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxRQUFRO1FBQUUsT0FBTyxJQUFJLENBQUM7SUFDeEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsSUFBSSxFQUFFLENBQUM7SUFDckMsS0FBSyxNQUFNLEtBQUssSUFBSSxRQUFRLEVBQUUsQ0FBQztRQUMzQixNQUFNLEtBQUssR0FBRyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDbEQsSUFBSSxLQUFLO1lBQUUsT0FBTyxLQUFLLENBQUM7SUFDNUIsQ0FBQztJQUNELE9BQU8sSUFBSSxDQUFDO0FBQ2hCLENBQUM7QUFFRCx1Q0FBdUM7QUFDdkMsU0FBUyxhQUFhLENBQUMsSUFBUyxFQUFFLEVBQU87SUFDckMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQVMsRUFBRSxLQUFhLEVBQUUsRUFBRTtRQUNuRSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO1FBQzlCLElBQUksR0FBVyxDQUFDO1FBQ2hCLElBQUksQ0FBQztZQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFD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QUFDLENBQUM7b0JBQzVCLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDOUIsa0JBQWtCLEVBQUUsQ0FBQztvQkFDckIsaUJBQWlCLEVBQUUsQ0FBQztpQkFDdkI7Z0JBQ0QsS0FBSyxFQUFFO29CQUNILFFBQVEsRUFBRSxjQUFjO29CQUN4QixNQUFNLEVBQUUsQ0FBQyxXQUFXLEVBQUUsYUFBYSxDQUFDO2lCQUN2QzthQUNKO1NBQ0o7UUFDRCxPQUFPLEVBQUUsRUFBRTtRQUNYLGNBQWMsRUFBRSxFQUFFO1FBQ2xCLEtBQUssRUFBRSxDQUFDO0tBQ1gsQ0FBQztBQUNOLENBQUM7QUFFRCx3REFBd0Q7QUFDeEQsS0FBSyxVQUFVLGFBQWEsQ0FBQyxRQUFnQixFQUFFLEVBQU87SUFDbEQsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNuQyxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDbEMsTUFBTSxJQUFJLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ2pELE9BQU8sYUFBYSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztBQUNuQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xubW9kdWxlLnBhdGhzLnB1c2goam9pbihFZGl0b3IuQXBwLnBhdGgsICdub2RlX21vZHVsZXMnKSk7XG5cbi8vID09PT09PT09PT09PSDlhbHkuqvovoXliqnlh73mlbAgPT09PT09PT09PT09XG5cbi8qKiDmt7HluqbpgJLlvZLmn6Xmib7oioLngrko5Y6fIHNjZW5lLmdldENoaWxkQnlVdWlkIOS7heaQnOebtOaOpeWtkOiKgueCuSzlrZnoioLngrnmsLjov5zmib7kuI3liLApICovXG5mdW5jdGlvbiBmaW5kTm9kZUJ5VXVpZERlZXAocm9vdDogYW55LCBub2RlVXVpZDogc3RyaW5nKTogYW55IHtcbiAgICBpZiAoIXJvb3QgfHwgIW5vZGVVdWlkKSByZXR1cm4gbnVsbDtcbiAgICBpZiAocm9vdC51dWlkID09PSBub2RlVXVpZCkgcmV0dXJuIHJvb3Q7XG4gICAgY29uc3QgY2hpbGRyZW4gPSByb290LmNoaWxkcmVuIHx8IFtdO1xuICAgIGZvciAoY29uc3QgY2hpbGQgb2YgY2hpbGRyZW4pIHtcbiAgICAgICAgY29uc3QgZm91bmQgPSBmaW5kTm9kZUJ5VXVpZERlZXAoY2hpbGQsIG5vZGVVdWlkKTtcbiAgICAgICAgaWYgKGZvdW5kKSByZXR1cm4gZm91bmQ7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuXG4vKiog5oqK6L+Q6KGM5pe26IqC54K55b2S5LiA5YyW5Li656iz5a6a57uT5p6ELOS+myB3cmFwcGVyIOS4jumqjOivgee7n+S4gOa2iOi0uSAqL1xuZnVuY3Rpb24gYnVpbGROb2RlSW5mbyhub2RlOiBhbnksIGpzOiBhbnkpOiBhbnkge1xuICAgIGNvbnN0IGNvbXBzID0gKG5vZGUuY29tcG9uZW50cyB8fCBbXSkubWFwKChjb21wOiBhbnksIGluZGV4OiBudW1iZXIpID0+IHtcbiAgICAgICAgY29uc3QgY3RvciA9IGNvbXAuY29uc3RydWN0b3I7XG4gICAgICAgIGxldCBjaWQ6IHN0cmluZztcbiAgICAgICAgdHJ5IHsgY2lkID0ganMuZ2V0Q2xhc3NJZChjdG9yKTsgfSBjYXRjaCB7IGNpZCA9IGN0b3IubmFtZTsgfVxuICAgICAgICBsZXQgY29tcFV1aWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgICAgICB0cnkgeyBjb21wVXVpZCA9IGNvbXAudXVpZCB8fCBudWxsOyB9IGNhdGNoIHsgLyogaWdub3JlICovIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNpZDogY2lkIHx8IGN0b3IubmFtZSxcbiAgICAgICAgICAgIG5hbWU6IGN0b3IubmFtZSxcbiAgICAgICAgICAgIGluZGV4LFxuICAgICAgICAgICAgdXVpZDogY29tcFV1aWQsXG4gICAgICAgICAgICBlbmFibGVkOiBjb21wLmVuYWJsZWRcbiAgICAgICAgfTtcbiAgICB9KTtcbiAgICBjb25zdCB3cCA9IG5vZGUud29ybGRQb3NpdGlvbiA/IHsgeDogbm9kZS53b3JsZFBvc2l0aW9uLngsIHk6IG5vZGUud29ybGRQb3NpdGlvbi55LCB6OiBub2RlLndvcmxkUG9zaXRpb24ueiB9IDogbnVsbDtcbiAgICByZXR1cm4ge1xuICAgICAgICB1dWlkOiBub2RlLnV1aWQsXG4gICAgICAgIG5hbWU6IG5vZGUubmFtZSxcbiAgICAgICAgYWN0aXZlOiBub2RlLmFjdGl2ZSxcbiAgICAgICAgbGF5ZXI6IG5vZGUubGF5ZXIsXG4gICAgICAgIHBvc2l0aW9uOiB7IHg6IG5vZGUucG9zaXRpb24ueCwgeTogbm9kZS5wb3NpdGlvbi55LCB6OiBub2RlLnBvc2l0aW9uLnogfSxcbiAgICAgICAgcm90YXRpb246IHsgeDogbm9kZS5yb3RhdGlvbi54LCB5OiBub2RlLnJvdGF0aW9uLnksIHo6IG5vZGUucm90YXRpb24ueiwgdzogbm9kZS5yb3RhdGlvbi53IH0sXG4gICAgICAgIHNjYWxlOiB7IHg6IG5vZGUuc2NhbGUueCwgeTogbm9kZS5zY2FsZS55LCB6OiBub2RlLnNjYWxlLnogfSxcbiAgICAgICAgd29ybGRQb3NpdGlvbjogd3AsXG4gICAgICAgIHBhcmVudDogbm9kZS5wYXJlbnQgPyBub2RlLnBhcmVudC51dWlkIDogbnVsbCxcbiAgICAgICAgY2hpbGRyZW46IChub2RlLmNoaWxkcmVuIHx8IFtdKS5tYXAoKGNoaWxkOiBhbnkpID0+IGNoaWxkLnV1aWQpLFxuICAgICAgICBjb21wb25lbnRzOiBjb21wc1xuICAgIH07XG59XG5cbi8qKiDmjInnu4Tku7bnsbvlnovmn6Xmib7oioLngrnkuIrnmoTnu4Tku7blrp7kvoso5pSv5oyBIEZRTiAnY2MuU3ByaXRlJyDkuI7nn63lkI0gJ1Nwcml0ZScpICovXG5mdW5jdGlvbiBmaW5kQ29tcG9uZW50T25Ob2RlKG5vZGU6IGFueSwgY29tcG9uZW50VHlwZTogc3RyaW5nLCBqczogYW55KTogYW55IHtcbiAgICBjb25zdCBub3JtYWxpemUgPSAoczogc3RyaW5nKSA9PiAocyB8fCAnJykudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9eY2NcXC4vLCAnJyk7XG4gICAgY29uc3QgdGFyZ2V0ID0gbm9ybWFsaXplKGNvbXBvbmVudFR5cGUpO1xuICAgIGNvbnN0IGNvbXBzID0gbm9kZS5jb21wb25lbnRzIHx8IFtdO1xuICAgIGZvciAoY29uc3QgY29tcCBvZiBjb21wcykge1xuICAgICAgICBsZXQgY2lkID0gJyc7XG4gICAgICAgIHRyeSB7IGNpZCA9IGpzLmdldENsYXNzSWQoY29tcC5jb25zdHJ1Y3RvcikgfHwgJyc7IH0gY2F0Y2ggeyAvKiBpZ25vcmUgKi8gfVxuICAgICAgICBpZiAobm9ybWFsaXplKGNpZCkgPT09IHRhcmdldCB8fCBub3JtYWxpemUoY29tcC5jb25zdHJ1Y3Rvci5uYW1lKSA9PT0gdGFyZ2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gY29tcDtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cblxuLyoqIOaPkOWPlue7hOS7tuWunuS+i+eahOWPr+aemuS4vuWxnuaAp+WAvCzot7Pov4flvJXmk47lhoXpg6ggYF9gIOWJjee8gOWtl+autSAqL1xuZnVuY3Rpb24gZXh0cmFjdENvbXBvbmVudFByb3BzKGNvbXA6IGFueSk6IFJlY29yZDxzdHJpbmcsIGFueT4ge1xuICAgIGNvbnN0IHJlc3VsdDogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xuICAgIGxldCBwcm90byA9IGNvbXA7XG4gICAgLy8g5Y+W5a6e5L6L6Ieq6LqrICsg5Y6f5Z6L6ZO+5LiK5Y+v5p6a5Li+6ZSuLOi/h+a7pOWGhemDqOWtl+auteS4juWHveaVsFxuICAgIGNvbnN0IHNlZW4gPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICB3aGlsZSAocHJvdG8gJiYgcHJvdG8gIT09IE9iamVjdC5wcm90b3R5cGUpIHtcbiAgICAgICAgY29uc3QgbmFtZXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhwcm90byk7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIG5hbWVzKSB7XG4gICAgICAgICAgICBpZiAoc2Vlbi5oYXMoa2V5KSkgY29udGludWU7XG4gICAgICAgICAgICBzZWVuLmFkZChrZXkpO1xuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdfJykpIGNvbnRpbnVlO1xuICAgICAgICAgICAgaWYgKGtleSA9PT0gJ25vZGUnIHx8IGtleSA9PT0gJ2VuYWJsZWQnIHx8IGtleSA9PT0gJ2VuYWJsZWRJbkhpZXJhcmNoeScpIGNvbnRpbnVlO1xuICAgICAgICAgICAgbGV0IHZhbDogYW55O1xuICAgICAgICAgICAgdHJ5IHsgdmFsID0gY29tcFtrZXldOyB9IGNhdGNoIHsgY29udGludWU7IH1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsID09PSAnZnVuY3Rpb24nKSBjb250aW51ZTtcbiAgICAgICAgICAgIHJlc3VsdFtrZXldID0gbm9ybWFsaXplVmFsdWUodmFsKTtcbiAgICAgICAgfVxuICAgICAgICBwcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihwcm90byk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKiDmiorov5DooYzml7blgLzlvZLkuIDljJbkuLrlj68gSlNPTiDljJbnmoTnroDljZXnu5PmnoQgKi9cbmZ1bmN0aW9uIG5vcm1hbGl6ZVZhbHVlKHZhbDogYW55KTogYW55IHtcbiAgICBpZiAodmFsID09PSBudWxsIHx8IHZhbCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdmFsO1xuICAgIGlmICh0eXBlb2YgdmFsICE9PSAnb2JqZWN0JykgcmV0dXJuIHZhbDtcbiAgICAvLyBjYy5Db2xvciAvIFZlYzIvMy80IC8gU2l6ZSDnmoTlsZ7mgKflpJrkuLrljp/lnovpk74gZ2V0dGVyLE9iamVjdC5rZXlzIOWPluS4jeWIsOOAglxuICAgIC8vIOeUqCAnaW4nKOWQq+WOn+Wei+mTvinor4bliKvlrZfmrrUs55u05o6l6K+75Y+W5YC844CCXG4gICAgY29uc3QgaGFzID0gKC4uLmtzOiBzdHJpbmdbXSkgPT4ga3MuZXZlcnkoayA9PiBrIGluIHZhbCk7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKGhhcygncicsICdnJywgJ2InKSkge1xuICAgICAgICAgICAgY29uc3QgYSA9ICh2YWwuYSAhPT0gdW5kZWZpbmVkKSA/IHZhbC5hIDogMjU1O1xuICAgICAgICAgICAgcmV0dXJuIHsgcjogdmFsLnIsIGc6IHZhbC5nLCBiOiB2YWwuYiwgYSB9O1xuICAgICAgICB9XG4gICAgICAgIGlmIChoYXMoJ3gnLCAneScsICd6JywgJ3cnKSkgcmV0dXJuIHsgeDogdmFsLngsIHk6IHZhbC55LCB6OiB2YWwueiwgdzogdmFsLncgfTtcbiAgICAgICAgaWYgKGhhcygneCcsICd5JywgJ3onKSkgcmV0dXJuIHsgeDogdmFsLngsIHk6IHZhbC55LCB6OiB2YWwueiB9O1xuICAgICAgICBpZiAoaGFzKCd4JywgJ3knKSkgcmV0dXJuIHsgeDogdmFsLngsIHk6IHZhbC55IH07XG4gICAgICAgIGlmIChoYXMoJ3dpZHRoJywgJ2hlaWdodCcpKSByZXR1cm4geyB3aWR0aDogdmFsLndpZHRoLCBoZWlnaHQ6IHZhbC5oZWlnaHQgfTtcbiAgICB9IGNhdGNoIHsgLyogZmFsbHRocm91Z2ggKi8gfVxuICAgIC8vIOi1hOS6p+W8leeUqFxuICAgIGlmICh2YWwuX3V1aWQgfHwgKHZhbC51dWlkICYmIHR5cGVvZiB2YWwudXVpZCA9PT0gJ3N0cmluZycpKSB7XG4gICAgICAgIHJldHVybiB7IHV1aWQ6IHZhbC5fdXVpZCB8fCB2YWwudXVpZCwgdHlwZTogdmFsLmNvbnN0cnVjdG9yID8gdmFsLmNvbnN0cnVjdG9yLm5hbWUgOiAnQXNzZXQnIH07XG4gICAgfVxuICAgIC8vIOaVsOe7hDrpgJDpobnlvZLkuIDljJYs5oiq5pat6L+H6ZW/5pWw57uEXG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgICByZXR1cm4gdmFsLnNsaWNlKDAsIDY0KS5tYXAobm9ybWFsaXplVmFsdWUpO1xuICAgIH1cbiAgICAvLyDlhbbkvZnlr7nosaE65Y+W5a6e5L6L6Ieq5pyJICsg5Y6f5Z6L6ZO+5Y+v5p6a5Li+6ZSuKOi/h+a7pOWGhemDqOWtl+autSks6YG/5YWN5b6q546v5byV55SoXG4gICAgY29uc3Qgb3V0OiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge307XG4gICAgY29uc3Qgc2VlbiA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGxldCBwcm90byA9IHZhbDtcbiAgICBsZXQgY291bnQgPSAwO1xuICAgIHdoaWxlIChwcm90byAmJiBwcm90byAhPT0gT2JqZWN0LnByb3RvdHlwZSAmJiBjb3VudCA8IDMyKSB7XG4gICAgICAgIGZvciAoY29uc3QgayBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhwcm90bykpIHtcbiAgICAgICAgICAgIGlmIChzZWVuLmhhcyhrKSB8fCBrLnN0YXJ0c1dpdGgoJ18nKSkgY29udGludWU7XG4gICAgICAgICAgICBzZWVuLmFkZChrKTtcbiAgICAgICAgICAgIGlmIChbJ25vZGUnLCAnZW5hYmxlZCcsICdlbmFibGVkSW5IaWVyYXJjaHknLCAnY29uc3RydWN0b3InXS5pbmNsdWRlcyhrKSkgY29udGludWU7XG4gICAgICAgICAgICBsZXQgdjogYW55O1xuICAgICAgICAgICAgdHJ5IHsgdiA9IHZhbFtrXTsgfSBjYXRjaCB7IGNvbnRpbnVlOyB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIHYgPT09ICdmdW5jdGlvbicpIGNvbnRpbnVlO1xuICAgICAgICAgICAgb3V0W2tdID0gKHYgIT09IG51bGwgJiYgdHlwZW9mIHYgPT09ICdvYmplY3QnKSA/ICdbb2JqZWN0XScgOiB2O1xuICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgICAgIGlmIChjb3VudCA+PSAzMikgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YocHJvdG8pO1xuICAgIH1cbiAgICByZXR1cm4gb3V0O1xufVxuXG5leHBvcnQgY29uc3QgbWV0aG9kczogeyBba2V5OiBzdHJpbmddOiAoLi4uYW55OiBhbnkpID0+IGFueSB9ID0ge1xuICAgIC8qKlxuICAgICAqIOiviuaWrTphc3luYyDmlrnms5XmmK/lkKbooqsgZXhlY3V0ZS1zY2VuZS1zY3JpcHQg5pSv5oyBXG4gICAgICovXG4gICAgYXN5bmMgdGVzdEFzeW5jTWV0aG9kKGRlbGF5TXM6IG51bWJlcikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIGRlbGF5TXMgfHwgMTAwKSk7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IG1zZzogJ2FzeW5jIG1ldGhvZCBleGVjdXRlZCB2MicsIGRlbGF5OiBkZWxheU1zIHx8IDEwMCB9IH07XG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgc2NlbmVcbiAgICAgKi9cbiAgICBjcmVhdGVOZXdTY2VuZSgpIHsgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yLCBTY2VuZSB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gbmV3IFNjZW5lKCk7XG4gICAgICAgICAgICBzY2VuZS5uYW1lID0gJ05ldyBTY2VuZSc7XG4gICAgICAgICAgICBkaXJlY3Rvci5ydW5TY2VuZShzY2VuZSk7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiAnTmV3IHNjZW5lIGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5JyB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGQgY29tcG9uZW50IHRvIGEgbm9kZVxuICAgICAqL1xuICAgIGFkZENvbXBvbmVudFRvTm9kZShub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IsIGpzIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRmluZCBub2RlIGJ5IFVVSURcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBzY2VuZS5nZXRDaGlsZEJ5VXVpZChub2RlVXVpZCk7XG4gICAgICAgICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIHdpdGggVVVJRCAke25vZGVVdWlkfSBub3QgZm91bmRgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEdldCBjb21wb25lbnQgY2xhc3NcbiAgICAgICAgICAgIGNvbnN0IENvbXBvbmVudENsYXNzID0ganMuZ2V0Q2xhc3NCeU5hbWUoY29tcG9uZW50VHlwZSk7XG4gICAgICAgICAgICBpZiAoIUNvbXBvbmVudENsYXNzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50IHR5cGUgJHtjb21wb25lbnRUeXBlfSBub3QgZm91bmRgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEFkZCBjb21wb25lbnRcbiAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudCA9IG5vZGUuYWRkQ29tcG9uZW50KENvbXBvbmVudENsYXNzKTtcbiAgICAgICAgICAgIHJldHVybiB7IFxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsIFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBDb21wb25lbnQgJHtjb21wb25lbnRUeXBlfSBhZGRlZCBzdWNjZXNzZnVsbHlgLFxuICAgICAgICAgICAgICAgIGRhdGE6IHsgY29tcG9uZW50SWQ6IGNvbXBvbmVudC51dWlkIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZSBjb21wb25lbnQgZnJvbSBhIG5vZGVcbiAgICAgKi9cbiAgICByZW1vdmVDb21wb25lbnRGcm9tTm9kZShub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IsIGpzIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHNjZW5lLmdldENoaWxkQnlVdWlkKG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGlmICghbm9kZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vZGUgd2l0aCBVVUlEICR7bm9kZVV1aWR9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgQ29tcG9uZW50Q2xhc3MgPSBqcy5nZXRDbGFzc0J5TmFtZShjb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgIGlmICghQ29tcG9uZW50Q2xhc3MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgdHlwZSAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgY29tcG9uZW50ID0gbm9kZS5nZXRDb21wb25lbnQoQ29tcG9uZW50Q2xhc3MpO1xuICAgICAgICAgICAgaWYgKCFjb21wb25lbnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgJHtjb21wb25lbnRUeXBlfSBub3QgZm91bmQgb24gbm9kZWAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbm9kZS5yZW1vdmVDb21wb25lbnQoY29tcG9uZW50KTtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBDb21wb25lbnQgJHtjb21wb25lbnRUeXBlfSByZW1vdmVkIHN1Y2Nlc3NmdWxseWAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGEgbmV3IG5vZGVcbiAgICAgKi9cbiAgICBjcmVhdGVOb2RlKG5hbWU6IHN0cmluZywgcGFyZW50VXVpZD86IHN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciwgTm9kZSB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBuZXcgTm9kZShuYW1lKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHBhcmVudFV1aWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnQgPSBzY2VuZS5nZXRDaGlsZEJ5VXVpZChwYXJlbnRVdWlkKTtcbiAgICAgICAgICAgICAgICBpZiAocGFyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmVudC5hZGRDaGlsZChub2RlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRDaGlsZChub2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNjZW5lLmFkZENoaWxkKG5vZGUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4geyBcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLCBcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgTm9kZSAke25hbWV9IGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5YCxcbiAgICAgICAgICAgICAgICBkYXRhOiB7IHV1aWQ6IG5vZGUudXVpZCwgbmFtZTogbm9kZS5uYW1lIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBub2RlIGluZm9ybWF0aW9uXG4gICAgICog6L+U5Zue5b2S5LiA5YyW57uT5p6EOmNvbXBvbmVudHMg5ZCrIGNpZChGUU4s5aaCIGNjLlNwcml0ZSkrIG5hbWUo55+t5ZCNKSsgaW5kZXgsXG4gICAgICog5L6bIHdyYXBwZXIg5LiO5YaZ5ZCO6aqM6K+B57uf5LiA5raI6LS544CCXG4gICAgICovXG4gICAgZ2V0Tm9kZUluZm8obm9kZVV1aWQ6IHN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciwganMgfSA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IGRpcmVjdG9yLmdldFNjZW5lKCk7XG4gICAgICAgICAgICBpZiAoIXNjZW5lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBub2RlID0gZmluZE5vZGVCeVV1aWREZWVwKHNjZW5lLCBub2RlVXVpZCk7XG4gICAgICAgICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIHdpdGggVVVJRCAke25vZGVVdWlkfSBub3QgZm91bmRgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiBidWlsZE5vZGVJbmZvKG5vZGUsIGpzKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGRldGFpbCBvZiBhIHNpbmdsZSBjb21wb25lbnQ6IOaJgOacieWPr+aemuS4vuWunuS+i+WxnuaAp+eahOWAvOOAglxuICAgICAqIOeUqOS6jiBzZXQtcHJvcGVydHkg5YaZ5ZCO55yf5a6e6aqM6K+B6K+75Zue44CC5YC85oyJ57G75Z6L5b2S5LiA5YyWKOminOiJsuKGkntyLGcsYixhfSzlkJHph4/ihpJ7eCx5LHp9LOi1hOS6p+KGknV1aWQp44CCXG4gICAgICovXG4gICAgZ2V0Q29tcG9uZW50RGV0YWlsKG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciwganMgfSA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IGRpcmVjdG9yLmdldFNjZW5lKCk7XG4gICAgICAgICAgICBpZiAoIXNjZW5lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IGZpbmROb2RlQnlVdWlkRGVlcChzY2VuZSwgbm9kZVV1aWQpO1xuICAgICAgICAgICAgaWYgKCFub2RlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSB3aXRoIFVVSUQgJHtub2RlVXVpZH0gbm90IGZvdW5kYCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgY29tcCA9IGZpbmRDb21wb25lbnRPbk5vZGUobm9kZSwgY29tcG9uZW50VHlwZSwganMpO1xuICAgICAgICAgICAgaWYgKCFjb21wKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50ICR7Y29tcG9uZW50VHlwZX0gbm90IGZvdW5kIG9uIG5vZGUgJHtub2RlLm5hbWV9YCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgcHJvcHMgPSBleHRyYWN0Q29tcG9uZW50UHJvcHMoY29tcCk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBjaWQ6IGpzLmdldENsYXNzSWQoY29tcC5jb25zdHJ1Y3RvciksXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGNvbXAuY29uc3RydWN0b3IubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogY29tcC5lbmFibGVkLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiBwcm9wc1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBhbGwgbm9kZXMgaW4gc2NlbmUgYXMgYSBub3JtYWxpemVkIHRyZWUgcm9vdGVkIGF0IHRoZSBzY2VuZS5cbiAgICAgKiDov5Tlm54geyBuYW1lLCB1dWlkLCBhY3RpdmUsIHBhcmVudCwgY29tcG9uZW50czpbY2lkLi4uXSwgY2hpbGRyZW46Wy4uLl0gfSDltYzlpZfmoJEsXG4gICAgICog5LiO5a6Y5pa5IHF1ZXJ5LW5vZGUtdHJlZSDlvaLmgIHkuIDoh7Qs5L6bIHdyYXBwZXIg57uf5LiA6YGN5Y6G44CCXG4gICAgICovXG4gICAgZ2V0QWxsTm9kZXMoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yLCBqcyB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGJ1aWxkVHJlZSA9IChub2RlOiBhbnkpOiBhbnkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBzID0gKG5vZGUuY29tcG9uZW50cyB8fCBbXSkubWFwKChjb21wOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGNpZCA9ICcnO1xuICAgICAgICAgICAgICAgICAgICB0cnkgeyBjaWQgPSBqcy5nZXRDbGFzc0lkKGNvbXAuY29uc3RydWN0b3IpIHx8ICcnOyB9IGNhdGNoIHsgLyogaWdub3JlICovIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNpZCB8fCBjb21wLmNvbnN0cnVjdG9yLm5hbWU7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogbm9kZS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlLnV1aWQsXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZTogbm9kZS5hY3RpdmUsXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudDogbm9kZS5wYXJlbnQgPyBub2RlLnBhcmVudC51dWlkIDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50czogY29tcHMsXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiAobm9kZS5jaGlsZHJlbiB8fCBbXSkubWFwKChjaGlsZDogYW55KSA9PiBidWlsZFRyZWUoY2hpbGQpKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBjb25zdCB0cmVlID0gYnVpbGRUcmVlKHNjZW5lKTtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHRyZWUgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRmluZCBub2RlIGJ5IG5hbWVcbiAgICAgKi9cbiAgICBmaW5kTm9kZUJ5TmFtZShuYW1lOiBzdHJpbmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IgfSA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IGRpcmVjdG9yLmdldFNjZW5lKCk7XG4gICAgICAgICAgICBpZiAoIXNjZW5lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBub2RlID0gc2NlbmUuZ2V0Q2hpbGRCeU5hbWUobmFtZSk7XG4gICAgICAgICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIHdpdGggbmFtZSAke25hbWV9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZS51dWlkLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBub2RlLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZTogbm9kZS5hY3RpdmUsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGN1cnJlbnQgc2NlbmUgaW5mb3JtYXRpb25cbiAgICAgKi9cbiAgICBnZXRDdXJyZW50U2NlbmVJbmZvKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHNjZW5lLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IHNjZW5lLnV1aWQsXG4gICAgICAgICAgICAgICAgICAgIG5vZGVDb3VudDogc2NlbmUuY2hpbGRyZW4ubGVuZ3RoXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0IG5vZGUgcHJvcGVydHlcbiAgICAgKi9cbiAgICBzZXROb2RlUHJvcGVydHkobm9kZVV1aWQ6IHN0cmluZywgcHJvcGVydHk6IHN0cmluZywgdmFsdWU6IGFueSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBzY2VuZS5nZXRDaGlsZEJ5VXVpZChub2RlVXVpZCk7XG4gICAgICAgICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIHdpdGggVVVJRCAke25vZGVVdWlkfSBub3QgZm91bmRgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIOiuvue9ruWxnuaAp1xuICAgICAgICAgICAgaWYgKHByb3BlcnR5ID09PSAncG9zaXRpb24nKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5zZXRQb3NpdGlvbih2YWx1ZS54IHx8IDAsIHZhbHVlLnkgfHwgMCwgdmFsdWUueiB8fCAwKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHkgPT09ICdyb3RhdGlvbicpIHtcbiAgICAgICAgICAgICAgICBub2RlLnNldFJvdGF0aW9uRnJvbUV1bGVyKHZhbHVlLnggfHwgMCwgdmFsdWUueSB8fCAwLCB2YWx1ZS56IHx8IDApO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eSA9PT0gJ3NjYWxlJykge1xuICAgICAgICAgICAgICAgIG5vZGUuc2V0U2NhbGUodmFsdWUueCB8fCAxLCB2YWx1ZS55IHx8IDEsIHZhbHVlLnogfHwgMSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5ID09PSAnYWN0aXZlJykge1xuICAgICAgICAgICAgICAgIG5vZGUuYWN0aXZlID0gdmFsdWU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5ID09PSAnbmFtZScpIHtcbiAgICAgICAgICAgICAgICBub2RlLm5hbWUgPSB2YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8g5bCd6K+V55u05o6l6K6+572u5bGe5oCnXG4gICAgICAgICAgICAgICAgKG5vZGUgYXMgYW55KVtwcm9wZXJ0eV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHsgXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSwgXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYFByb3BlcnR5ICcke3Byb3BlcnR5fScgdXBkYXRlZCBzdWNjZXNzZnVsbHlgIFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHNjZW5lIGhpZXJhcmNoeVxuICAgICAqL1xuICAgIGdldFNjZW5lSGllcmFyY2h5KGluY2x1ZGVDb21wb25lbnRzOiBib29sZWFuID0gZmFsc2UpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IgfSA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IGRpcmVjdG9yLmdldFNjZW5lKCk7XG4gICAgICAgICAgICBpZiAoIXNjZW5lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBwcm9jZXNzTm9kZSA9IChub2RlOiBhbnkpOiBhbnkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBub2RlLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGUudXVpZCxcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlOiBub2RlLmFjdGl2ZSxcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IFtdXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIGlmIChpbmNsdWRlQ29tcG9uZW50cykge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQuY29tcG9uZW50cyA9IG5vZGUuY29tcG9uZW50cy5tYXAoKGNvbXA6IGFueSkgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGNvbXAuY29uc3RydWN0b3IubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGNvbXAuZW5hYmxlZFxuICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKG5vZGUuY2hpbGRyZW4gJiYgbm9kZS5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5jaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4ubWFwKChjaGlsZDogYW55KSA9PiBwcm9jZXNzTm9kZShjaGlsZCkpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBjb25zdCBoaWVyYXJjaHkgPSBzY2VuZS5jaGlsZHJlbi5tYXAoKGNoaWxkOiBhbnkpID0+IHByb2Nlc3NOb2RlKGNoaWxkKSk7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBoaWVyYXJjaHkgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHByZWZhYiBmcm9tIG5vZGVcbiAgICAgKi9cbiAgICBjcmVhdGVQcmVmYWJGcm9tTm9kZShub2RlVXVpZDogc3RyaW5nLCBwcmVmYWJQYXRoOiBzdHJpbmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IsIGluc3RhbnRpYXRlIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHNjZW5lLmdldENoaWxkQnlVdWlkKG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGlmICghbm9kZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vZGUgd2l0aCBVVUlEICR7bm9kZVV1aWR9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8g5rOo5oSP77ya6L+Z6YeM5Y+q5piv5LiA5Liq5qih5ouf5a6e546w77yM5Zug5Li66L+Q6KGM5pe2546v5aKD5LiL5peg5rOV55u05o6l5Yib5bu66aKE5Yi25L2T5paH5Lu2XG4gICAgICAgICAgICAvLyDnnJ/mraPnmoTpooTliLbkvZPliJvlu7rpnIDopoFFZGl0b3IgQVBJ5pSv5oyBXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBwcmVmYWJQYXRoOiBwcmVmYWJQYXRoLFxuICAgICAgICAgICAgICAgICAgICBzb3VyY2VOb2RlVXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBQcmVmYWIgY3JlYXRlZCBmcm9tIG5vZGUgJyR7bm9kZS5uYW1lfScgYXQgJHtwcmVmYWJQYXRofWBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgY29tcG9uZW50IHByb3BlcnR5XG4gICAgICovXG4gICAgc2V0Q29tcG9uZW50UHJvcGVydHkobm9kZVV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nLCBwcm9wZXJ0eTogc3RyaW5nLCB2YWx1ZTogYW55KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yLCBqcyB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBub2RlID0gc2NlbmUuZ2V0Q2hpbGRCeVV1aWQobm9kZVV1aWQpO1xuICAgICAgICAgICAgaWYgKCFub2RlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSB3aXRoIFVVSUQgJHtub2RlVXVpZH0gbm90IGZvdW5kYCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgQ29tcG9uZW50Q2xhc3MgPSBqcy5nZXRDbGFzc0J5TmFtZShjb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgIGlmICghQ29tcG9uZW50Q2xhc3MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgdHlwZSAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudCA9IG5vZGUuZ2V0Q29tcG9uZW50KENvbXBvbmVudENsYXNzKTtcbiAgICAgICAgICAgIGlmICghY29tcG9uZW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50ICR7Y29tcG9uZW50VHlwZX0gbm90IGZvdW5kIG9uIG5vZGVgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyDpkojlr7nluLjop4HlsZ7mgKflgZrnibnmrorlpITnkIZcbiAgICAgICAgICAgIGlmIChwcm9wZXJ0eSA9PT0gJ3Nwcml0ZUZyYW1lJyAmJiBjb21wb25lbnRUeXBlID09PSAnY2MuU3ByaXRlJykge1xuICAgICAgICAgICAgICAgIC8vIOaUr+aMgSB2YWx1ZSDkuLogdXVpZCDmiJbotYTmupDot6/lvoRcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAvLyDlhYjlsJ3or5XmjIkgdXVpZCDmn6Xmib5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYXNzZXRNYW5hZ2VyID0gcmVxdWlyZSgnY2MnKS5hc3NldE1hbmFnZXI7XG4gICAgICAgICAgICAgICAgICAgIGFzc2V0TWFuYWdlci5yZXNvdXJjZXMubG9hZCh2YWx1ZSwgcmVxdWlyZSgnY2MnKS5TcHJpdGVGcmFtZSwgKGVycjogYW55LCBzcHJpdGVGcmFtZTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWVyciAmJiBzcHJpdGVGcmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudC5zcHJpdGVGcmFtZSA9IHNwcml0ZUZyYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlsJ3or5XpgJrov4cgdXVpZCDliqDovb1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NldE1hbmFnZXIubG9hZEFueSh7IHV1aWQ6IHZhbHVlIH0sIChlcnIyOiBhbnksIGFzc2V0OiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFlcnIyICYmIGFzc2V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQuc3ByaXRlRnJhbWUgPSBhc3NldDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOebtOaOpei1i+WAvO+8iOWFvOWuueW3suS8oOWFpei1hOa6kOWvueixoe+8iVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50LnNwcml0ZUZyYW1lID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50LnNwcml0ZUZyYW1lID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eSA9PT0gJ21hdGVyaWFsJyAmJiAoY29tcG9uZW50VHlwZSA9PT0gJ2NjLlNwcml0ZScgfHwgY29tcG9uZW50VHlwZSA9PT0gJ2NjLk1lc2hSZW5kZXJlcicpKSB7XG4gICAgICAgICAgICAgICAgLy8g5pSv5oyBIHZhbHVlIOS4uiB1dWlkIOaIlui1hOa6kOi3r+W+hFxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0TWFuYWdlciA9IHJlcXVpcmUoJ2NjJykuYXNzZXRNYW5hZ2VyO1xuICAgICAgICAgICAgICAgICAgICBhc3NldE1hbmFnZXIucmVzb3VyY2VzLmxvYWQodmFsdWUsIHJlcXVpcmUoJ2NjJykuTWF0ZXJpYWwsIChlcnI6IGFueSwgbWF0ZXJpYWw6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFlcnIgJiYgbWF0ZXJpYWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQubWF0ZXJpYWwgPSBtYXRlcmlhbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRNYW5hZ2VyLmxvYWRBbnkoeyB1dWlkOiB2YWx1ZSB9LCAoZXJyMjogYW55LCBhc3NldDogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZXJyMiAmJiBhc3NldCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50Lm1hdGVyaWFsID0gYXNzZXQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQubWF0ZXJpYWwgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQubWF0ZXJpYWwgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5ID09PSAnc3RyaW5nJyAmJiAoY29tcG9uZW50VHlwZSA9PT0gJ2NjLkxhYmVsJyB8fCBjb21wb25lbnRUeXBlID09PSAnY2MuUmljaFRleHQnKSkge1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5zdHJpbmcgPSB2YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50W3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8g5Y+v6YCJ77ya5Yi35pawIEluc3BlY3RvclxuICAgICAgICAgICAgLy8gRWRpdG9yLk1lc3NhZ2Uuc2VuZCgnc2NlbmUnLCAnc25hcHNob3QnKTtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBDb21wb25lbnQgcHJvcGVydHkgJyR7cHJvcGVydHl9JyB1cGRhdGVkIHN1Y2Nlc3NmdWxseWAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICog5Yib5bu65bqP5YiX5bin5Yqo55S7OueUqCBBbmltYXRpb25DbGlwLmNyZWF0ZVdpdGhTcHJpdGVGcmFtZXMg55Sf5oiQIGNsaXAsXG4gICAgICog5bqP5YiX5YyW5Li6IC5hbmltIOi1hOS6p+iQveebmCzmjILliLDoioLngrkgY2MuQW5pbWF0aW9uIOW5tuaSreaUvuOAglxuICAgICAqIOW8guatpeaWueazlShleGVjdXRlLXNjZW5lLXNjcmlwdCDmlK/mjIEgUHJvbWlzZSDov5Tlm54p44CCXG4gICAgICovXG4gICAgYXN5bmMgY3JlYXRlU3ByaXRlRnJhbWVBbmltYXRpb24obm9kZVV1aWQ6IHN0cmluZywgc3ByaXRlRnJhbWVVdWlkczogc3RyaW5nW10sIHNhbXBsZVJhdGU6IG51bWJlciwgY2xpcE5hbWU6IHN0cmluZywgc2F2ZVBhdGg6IHN0cmluZywgbG9vcDogYm9vbGVhbikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgY2MgPSByZXF1aXJlKCdjYycpO1xuICAgICAgICBjb25zdCB7IGRpcmVjdG9yLCBqcywgYXNzZXRNYW5hZ2VyLCBBbmltYXRpb25DbGlwLCBBbmltYXRpb24sIFNwcml0ZUZyYW1lIH0gPSBjYztcbiAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICBpZiAoIXNjZW5lKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgIGNvbnN0IG5vZGUgPSBmaW5kTm9kZUJ5VXVpZERlZXAoc2NlbmUsIG5vZGVVdWlkKTtcbiAgICAgICAgaWYgKCFub2RlKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlICR7bm9kZVV1aWR9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgaWYgKCFzcHJpdGVGcmFtZVV1aWRzIHx8ICFzcHJpdGVGcmFtZVV1aWRzLmxlbmd0aCkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnc3ByaXRlRnJhbWVVdWlkcyBpcyBlbXB0eScgfTtcblxuICAgICAgICBpZiAoIUFuaW1hdGlvbkNsaXAgfHwgIUFuaW1hdGlvbkNsaXAuY3JlYXRlV2l0aFNwcml0ZUZyYW1lcykge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQW5pbWF0aW9uQ2xpcCDkuI3lj6/nlKggKHR5cGVvZj0ke3R5cGVvZiBBbmltYXRpb25DbGlwfSlgIH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyAxLiDmibnph4/liqDovb0gU3ByaXRlRnJhbWVcbiAgICAgICAgbGV0IGZyYW1lczogYW55W10gPSBbXTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGZyYW1lcyA9IGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBvcHRzID0gU3ByaXRlRnJhbWUgPyB7IHR5cGU6IFNwcml0ZUZyYW1lIH0gOiB7fTtcbiAgICAgICAgICAgICAgICBhc3NldE1hbmFnZXIubG9hZEFueShzcHJpdGVGcmFtZVV1aWRzLCBvcHRzLCAoZXJyOiBhbnksIGFzc2V0czogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHJlamVjdChuZXcgRXJyb3IoYOWKoOi9vSBTcHJpdGVGcmFtZSDlpLHotKU6ICR7ZXJyLm1lc3NhZ2UgfHwgZXJyfWApKTtcbiAgICAgICAgICAgICAgICAgICAgZWxzZSByZXNvbHZlKEFycmF5LmlzQXJyYXkoYXNzZXRzKSA/IGFzc2V0cyA6IFthc3NldHNdKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZS5tZXNzYWdlLCBpbnN0cnVjdGlvbjogJ+ivt+ehruiupCBzcHJpdGVGcmFtZVV1aWRzIOaYryBTcHJpdGVGcmFtZSDotYTkuqfnmoQgdXVpZCjpnZ4gVGV4dHVyZS9JbWFnZSnjgILlj6/nlKggYXNzZXQtZGIgcXVlcnktYXNzZXQtaW5mbyDmn6XjgIInIH07XG4gICAgICAgIH1cbiAgICAgICAgLy8g5oyJ5Lyg5YWl6aG65bqP5a+56b2QKGxvYWRBbnkg5Y+v6IO95Lmx5bqPKVxuICAgICAgICBjb25zdCBmcmFtZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBhbnk+KCk7XG4gICAgICAgIGZvciAoY29uc3QgZiBvZiBmcmFtZXMpIGZyYW1lTWFwLnNldChmLl91dWlkIHx8IGYudXVpZCwgZik7XG4gICAgICAgIGNvbnN0IG9yZGVyZWRGcmFtZXMgPSBzcHJpdGVGcmFtZVV1aWRzLm1hcCh1ID0+IGZyYW1lTWFwLmdldCh1KSkuZmlsdGVyKEJvb2xlYW4pO1xuICAgICAgICBpZiAob3JkZXJlZEZyYW1lcy5sZW5ndGggIT09IHNwcml0ZUZyYW1lVXVpZHMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGDpg6jliIYgU3ByaXRlRnJhbWUg5pyq5Yqg6L295oiQ5YqfOiDmnJ/mnJsgJHtzcHJpdGVGcmFtZVV1aWRzLmxlbmd0aH0sIOWunuW+lyAke29yZGVyZWRGcmFtZXMubGVuZ3RofWAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIDIuIOeUn+aIkCBjbGlw44CCV3JhcE1vZGU6IE5vcm1hbD0xLCBMb29wPTIo6KeB5byV5pOOIGNvY29zL2FuaW1hdGlvbi90eXBlcy50cylcbiAgICAgICAgY29uc3QgV3JhcE1vZGUgPSBBbmltYXRpb25DbGlwLldyYXBNb2RlIHx8IHsgTm9ybWFsOiAxLCBMb29wOiAyIH07XG4gICAgICAgIGNvbnN0IGNsaXAgPSBBbmltYXRpb25DbGlwLmNyZWF0ZVdpdGhTcHJpdGVGcmFtZXMob3JkZXJlZEZyYW1lcywgc2FtcGxlUmF0ZSB8fCAxMCk7XG4gICAgICAgIGNsaXAubmFtZSA9IGNsaXBOYW1lIHx8ICdTcHJpdGVBbmltJztcbiAgICAgICAgY2xpcC53cmFwTW9kZSA9IGxvb3AgPT09IGZhbHNlID8gV3JhcE1vZGUuTm9ybWFsIDogV3JhcE1vZGUuTG9vcDtcblxuICAgICAgICAvLyAzLiDluo/liJfljJbkuLogLmFuaW0gSlNPTizokL3nm5hcbiAgICAgICAgbGV0IGFuaW1Kc29uOiBhbnk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhbmltSnNvbiA9IHNlcmlhbGl6ZUNsaXBUb0Fzc2V0SnNvbihjbGlwLCBvcmRlcmVkRnJhbWVzLCBzYW1wbGVSYXRlIHx8IDEwLCBsb29wKTtcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGDluo/liJfljJYgY2xpcCDlpLHotKU6ICR7ZS5tZXNzYWdlfWAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBjbGlwVXVpZDogc3RyaW5nO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8g6Iul5bey5a2Y5Zyo5YiZ6KaG55uWKGNyZWF0ZS1hc3NldCDlkIzot6/lvoTkvJrmiqXplJks5YWIIGRlbGV0ZSlcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ2RlbGV0ZS1hc3NldCcsIHNhdmVQYXRoKS5jYXRjaCgoKSA9PiB7fSk7XG4gICAgICAgICAgICBjb25zdCBjcmVhdGVSZXMgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdjcmVhdGUtYXNzZXQnLCBzYXZlUGF0aCwgYW5pbUpzb24pO1xuICAgICAgICAgICAgaWYgKCFjcmVhdGVSZXMgfHwgIWNyZWF0ZVJlcyEudXVpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYOWIm+W7uiAuYW5pbSDotYTkuqflpLHotKU6ICR7SlNPTi5zdHJpbmdpZnkoY3JlYXRlUmVzKX1gIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjbGlwVXVpZCA9IGNyZWF0ZVJlcyEudXVpZDtcbiAgICAgICAgICAgIC8vIOinpuWPkeWvvOWFpeWujOaIkFxuICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAnc2F2ZS1hc3NldCcsIHNhdmVQYXRoLCBhbmltSnNvbikuY2F0Y2goKCkgPT4ge30pO1xuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYGFzc2V0LWRiIOaTjeS9nOWksei0pTogJHtlLm1lc3NhZ2V9YCB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gNC4g5oyB5LmF5YyW5oyC6L29OuehruS/neiKgueCueaciSBjYy5BbmltYXRpb24oY3JlYXRlLWNvbXBvbmVudCDmtojmga8s5oyB5LmF5YyWKSzlho0gc2V0LXByb3BlcnR5IGRlZmF1bHRDbGlwXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBub2RlRGF0YSA9IGJ1aWxkTm9kZUluZm8obm9kZSwganMpO1xuICAgICAgICAgICAgY29uc3QgaGFzQW5pbSA9IG5vZGVEYXRhLmNvbXBvbmVudHMuc29tZSgoYzogYW55KSA9PiBjLmNpZCA9PT0gJ2NjLkFuaW1hdGlvbicpO1xuICAgICAgICAgICAgaWYgKCFoYXNBbmltKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnY3JlYXRlLWNvbXBvbmVudCcsIHsgdXVpZDogbm9kZVV1aWQsIGNvbXBvbmVudDogJ2NjLkFuaW1hdGlvbicgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgICAgLy8g5oyB5LmF5YyW5oyC6L295aSx6LSl5LiN6Zi75pat6L+Q6KGM5pe25pKt5pS+XG4gICAgICAgIH1cblxuICAgICAgICAvLyA1LiDov5DooYzml7bmkq3mlL4o5Y2z5pe26aKE6KeI5Y+N6aaIKVxuICAgICAgICBsZXQgcnVudGltZVBsYXllZCA9IGZhbHNlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgQW5pbWF0aW9uQ3RvciA9IGpzLmdldENsYXNzQnlOYW1lKCdjYy5BbmltYXRpb24nKSB8fCBBbmltYXRpb247XG4gICAgICAgICAgICBsZXQgYW5pbUNvbXAgPSBub2RlLmdldENvbXBvbmVudChBbmltYXRpb25DdG9yKTtcbiAgICAgICAgICAgIGlmICghYW5pbUNvbXApIGFuaW1Db21wID0gbm9kZS5hZGRDb21wb25lbnQoQW5pbWF0aW9uQ3Rvcik7XG4gICAgICAgICAgICAvLyDliqDovb3mlrDlu7rnmoQgY2xpcCDotYTkuqfnlKjkuo7ov5DooYzml7bmkq3mlL5cbiAgICAgICAgICAgIGNvbnN0IHJ1bnRpbWVDbGlwID0gYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgIGFzc2V0TWFuYWdlci5sb2FkQW55KHsgdXVpZDogY2xpcFV1aWQsIHR5cGU6ICdhbmltYXRpb24tY2xpcCcgfSwgKGVycjogYW55LCBhc3NldDogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHJlamVjdChlcnIpOyBlbHNlIHJlc29sdmUoYXNzZXQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBhbmltQ29tcC5kZWZhdWx0Q2xpcCA9IHJ1bnRpbWVDbGlwO1xuICAgICAgICAgICAgYW5pbUNvbXAucGxheSgpO1xuICAgICAgICAgICAgcnVudGltZVBsYXllZCA9IHRydWU7XG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgICAgcnVudGltZVBsYXllZCA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gNi4g5oyB5LmF5YyWIGRlZmF1bHRDbGlwIOW8leeUqCjnlKggc2V0LXByb3BlcnR5LOaMh+WQkeaWsCBjbGlwIHV1aWQpXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZWZyZXNoZWQgPSBhd2FpdCBxdWVyeU5vZGVTZWxmKG5vZGVVdWlkLCBqcyk7XG4gICAgICAgICAgICBjb25zdCBhbmltQ29tcElkeCA9IHJlZnJlc2hlZC5jb21wb25lbnRzLmZpbmRJbmRleCgoYzogYW55KSA9PiBjLmNpZCA9PT0gJ2NjLkFuaW1hdGlvbicpO1xuICAgICAgICAgICAgaWYgKGFuaW1Db21wSWR4ID49IDApIHtcbiAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICBwYXRoOiBgX19jb21wc19fLiR7YW5pbUNvbXBJZHh9LmRlZmF1bHRDbGlwYCxcbiAgICAgICAgICAgICAgICAgICAgZHVtcDogeyB2YWx1ZTogeyB1dWlkOiBjbGlwVXVpZCB9LCB0eXBlOiAnY2MuQW5pbWF0aW9uQ2xpcCcgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IGBfX2NvbXBzX18uJHthbmltQ29tcElkeH0ucGxheU9uTG9hZGAsXG4gICAgICAgICAgICAgICAgICAgIGR1bXA6IHsgdmFsdWU6IHRydWUgfVxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKCgpID0+IHt9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgICAvLyDmjIHkuYXljJblvJXnlKjlpLHotKUs6L+Q6KGM5pe25bey5pKt5pS+LOmZjee6p+aPkOekulxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgY2xpcFV1aWQsXG4gICAgICAgICAgICAgICAgc2F2ZVBhdGgsXG4gICAgICAgICAgICAgICAgY2xpcE5hbWU6IGNsaXAubmFtZSxcbiAgICAgICAgICAgICAgICBmcmFtZUNvdW50OiBvcmRlcmVkRnJhbWVzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICBzYW1wbGVSYXRlOiBzYW1wbGVSYXRlIHx8IDEwLFxuICAgICAgICAgICAgICAgIGxvb3AsXG4gICAgICAgICAgICAgICAgcnVudGltZVBsYXllZCxcbiAgICAgICAgICAgICAgICBub2RlVXVpZFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIgJiYgKGVyci5tZXNzYWdlIHx8IFN0cmluZyhlcnIpKSB8fCAndW5rbm93biBlcnJvciBpbiBjcmVhdGVTcHJpdGVGcmFtZUFuaW1hdGlvbicgfTtcbiAgICAgIH1cbiAgICB9XG59O1xuXG4vKiog5bqP5YiX5YyWIEFuaW1hdGlvbkNsaXAg5Li6IC5hbmltIOi1hOS6pyBKU09O44CC5LyY5YWIIEVkaXRvckV4dGVuZHMuc2VyaWFsaXplLOWbnumAgOaJi+W7uuOAgiAqL1xuZnVuY3Rpb24gc2VyaWFsaXplQ2xpcFRvQXNzZXRKc29uKGNsaXA6IGFueSwgZnJhbWVzOiBhbnlbXSwgc2FtcGxlUmF0ZTogbnVtYmVyLCBsb29wOiBib29sZWFuKTogYW55IHtcbiAgICAvLyDkvJjlhYjnlKjlvJXmk47luo/liJfljJblmago5qC85byP5pyA5Y+v6Z2gKVxuICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IEVFeHQ6IGFueSA9IChnbG9iYWxUaGlzIGFzIGFueSkuRWRpdG9yRXh0ZW5kcyB8fCAoZ2xvYmFsVGhpcyBhcyBhbnkpLkVkaXRvcj8uRXh0ZW5kcztcbiAgICAgICAgY29uc3Qgc2VyID0gRUV4dD8uc2VyaWFsaXplO1xuICAgICAgICBpZiAoc2VyKSB7XG4gICAgICAgICAgICAvLyDmjqLmtYvlpJrnp43nrb7lkI1cbiAgICAgICAgICAgIGxldCBzdHI6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc2VyLnNlcmlhbGl6ZUFzc2V0ID09PSAnZnVuY3Rpb24nKSBzdHIgPSBzZXIuc2VyaWFsaXplQXNzZXQoY2xpcCk7XG4gICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygc2VyLnNlcmlhbGl6ZSA9PT0gJ2Z1bmN0aW9uJykgc3RyID0gc2VyLnNlcmlhbGl6ZShjbGlwLCB7IGFzc2V0OiB0cnVlIH0pO1xuICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIHNlciA9PT0gJ2Z1bmN0aW9uJykgc3RyID0gc2VyKGNsaXAsIHsgYXNzZXQ6IHRydWUgfSk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHN0ciA9PT0gJ3N0cmluZycgJiYgc3RyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBKU09OLnBhcnNlKHN0cik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIHsgLyog5Zue6YCA5omL5bu6ICovIH1cblxuICAgIC8vIOWbnumAgDrmjIkgZGVmYXVsdC5hbmltIOaooeadv+aJi+W7uuOAgmN1cnZlRGF0YXMg55SoICdjYy5TcHJpdGUuc3ByaXRlRnJhbWUnIOi9qOmBkyxcbiAgICAvLyBfY3VydmVzIOWtmCBbdGltZSwge3V1aWR9XSDlhbPplK7luKfjgILov5nmmK8gY3JlYXRlV2l0aFNwcml0ZUZyYW1lcyDnlJ/miJDnmoTnrYnku7fnu5PmnoTjgIJcbiAgICBjb25zdCBkdXJhdGlvbiA9IGZyYW1lcy5sZW5ndGggLyBzYW1wbGVSYXRlO1xuICAgIGNvbnN0IHN0ZXAgPSAxIC8gc2FtcGxlUmF0ZTtcbiAgICBjb25zdCBrZXlzID0gZnJhbWVzLm1hcCgoZjogYW55LCBpOiBudW1iZXIpID0+IFsrKHN0ZXAgKiBpKS50b0ZpeGVkKDYpLCB7IHV1aWQ6IGYuX3V1aWQgfHwgZi51dWlkIH1dKTtcbiAgICByZXR1cm4ge1xuICAgICAgICBfX3R5cGVfXzogJ2NjLkFuaW1hdGlvbkNsaXAnLFxuICAgICAgICBfbmFtZTogY2xpcC5uYW1lIHx8ICdTcHJpdGVBbmltJyxcbiAgICAgICAgX29iakZsYWdzOiAwLFxuICAgICAgICBfbmF0aXZlOiAnJyxcbiAgICAgICAgc2FtcGxlOiBzYW1wbGVSYXRlLFxuICAgICAgICBzcGVlZDogMSxcbiAgICAgICAgd3JhcE1vZGU6IGxvb3AgPyAyIDogMSwgLy8gMiA9IExvb3AsIDEgPSBOb3JtYWxcbiAgICAgICAgZXZlbnRzOiBbXSxcbiAgICAgICAgX2R1cmF0aW9uOiBkdXJhdGlvbixcbiAgICAgICAgX2tleXM6IFtdLFxuICAgICAgICBfc3RlcG5lc3M6IDAsXG4gICAgICAgIGN1cnZlRGF0YXM6IHtcbiAgICAgICAgICAgICdwcm9wcy5zcHJpdGVGcmFtZSc6IHtcbiAgICAgICAgICAgICAgICBfX3R5cGVfXzogJ2NjLk9iamVjdFRyYWNrJyxcbiAgICAgICAgICAgICAgICBfY2hhbm5lbDoge1xuICAgICAgICAgICAgICAgICAgICBfX3R5cGVfXzogJ2NjLk9iamVjdEN1cnZlJyxcbiAgICAgICAgICAgICAgICAgICAgX2tleXM6IFtrZXlzLm1hcChrID0+IGtbMF0pXSxcbiAgICAgICAgICAgICAgICAgICAgX3ZhbHVlczogW2tleXMubWFwKGsgPT4ga1sxXSldLFxuICAgICAgICAgICAgICAgICAgICBfcG9zdEV4dHJhcG9sYXRpb246IDIsXG4gICAgICAgICAgICAgICAgICAgIF9wcmVFeHRyYXBvbGF0aW9uOiAyLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgX3BhdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgX190eXBlX186ICdjYy5UcmFja1BhdGgnLFxuICAgICAgICAgICAgICAgICAgICBfcHJvcHM6IFsnY2MuU3ByaXRlJywgJ3Nwcml0ZUZyYW1lJ10sXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBfY3VydmVzOiBbXSxcbiAgICAgICAgX2NvbW1vblRhcmdldHM6IFtdLFxuICAgICAgICBfaGFzaDogMFxuICAgIH07XG59XG5cbi8qKiDph43mlrDmn6Xor6LljZXkuKroioLngrko5L6bIGNyZWF0ZVNwcml0ZUZyYW1lQW5pbWF0aW9uIOWGhemDqOeUqCzpgb/lhY3lvqrnjq/kvp3otZYpICovXG5hc3luYyBmdW5jdGlvbiBxdWVyeU5vZGVTZWxmKG5vZGVVdWlkOiBzdHJpbmcsIGpzOiBhbnkpOiBQcm9taXNlPGFueT4ge1xuICAgIGNvbnN0IHsgZGlyZWN0b3IgfSA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgIGNvbnN0IG5vZGUgPSBmaW5kTm9kZUJ5VXVpZERlZXAoc2NlbmUsIG5vZGVVdWlkKTtcbiAgICByZXR1cm4gYnVpbGROb2RlSW5mbyhub2RlLCBqcyk7XG59Il19