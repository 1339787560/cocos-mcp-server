/**
 * 场景脚本入口(代理层)。
 *
 * 设计:此文件只做 require 转发,真正的逻辑在 ./scene-impl。
 * 每次 method 被调用前,检测 scene-impl 的 mtime;mtime 变化时清 require.cache 重新 require,
 * 从而实现 scene-impl 改动**热生效**(无需重启编辑器,无需 soft-reload)。
 *
 * 解决的痛点:Cocos 扩展机制下 scene-script 模块被场景进程一次性 require,
 * extension:reload / soft-reload-scene 都不会重新加载场景脚本模块,
 * 改 scene.ts 历来需要重启编辑器。引入此代理后:
 *   - scene-impl.ts 改动 → tsc → cp dist → 下一次 method 调用即生效
 *   - 仅当新增 scene method(需改 package.json contributions)时才需重启编辑器
 *
 * 注意:method 列表在此文件加载时一次性从 impl 读取并冻结。
 * 若 impl 新增 method,必须同步 package.json contributions.scene.methods 并重启编辑器。
 */
import { join } from 'path';
import * as fs from 'fs';
module.paths.push(join(Editor.App.path, 'node_modules'));

const IMPL_PATH: string = require.resolve('./scene-impl');
let _impl: any = null;
let _mtime = -1;
let _loadError: string | null = null;

function loadImpl(): any {
    try {
        const mtime = fs.statSync(IMPL_PATH).mtimeMs;
        if (mtime !== _mtime || !_impl) {
            // 文件变了(或首次加载):清缓存重新 require
            try { delete require.cache[IMPL_PATH]; } catch { /* ignore */ }
            // 同时清理 impl 可能 require 的同目录辅助模块缓存(如 scene-helpers)
            for (const k of Object.keys(require.cache)) {
                if (k.startsWith(join(__dirname, 'scene-'))) {
                    try { delete require.cache[k]; } catch { /* ignore */ }
                }
            }
            _impl = require('./scene-impl');
            _mtime = mtime;
            _loadError = null;
        }
    } catch (e: any) {
        _loadError = e?.message || String(e);
        // 加载失败保留旧 impl(若有),否则后续调用会明确报错
        if (!_impl) _impl = { methods: {} };
    }
    return _impl;
}

// 加载时先 require 一次,拿到 method 名表并冻结
const initial = loadImpl();
const FROZEN_METHODS: string[] = initial && initial.methods ? Object.keys(initial.methods) : [];

/** 代理方法表。每个方法在调用时重新走 loadImpl(),使 impl 改动热生效。 */
export const methods: { [key: string]: (...any: any[]) => any } = {};

for (const name of FROZEN_METHODS) {
    methods[name] = (...args: any[]) => {
        const impl = loadImpl();
        const fn = impl?.methods?.[name];
        if (typeof fn !== 'function') {
            const hint = _loadError
                ? `scene-impl 加载失败: ${_loadError}`
                : `方法 '${name}' 不在 scene-impl 中(可用: ${Object.keys(impl?.methods || {}).join(', ')})`;
            throw new Error(hint);
        }
        return fn.apply(impl.methods, args);
    };
}
