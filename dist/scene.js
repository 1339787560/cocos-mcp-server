"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = void 0;
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
const path_1 = require("path");
const fs = __importStar(require("fs"));
module.paths.push((0, path_1.join)(Editor.App.path, 'node_modules'));
const IMPL_PATH = require.resolve('./scene-impl');
let _impl = null;
let _mtime = -1;
let _loadError = null;
function loadImpl() {
    try {
        const mtime = fs.statSync(IMPL_PATH).mtimeMs;
        if (mtime !== _mtime || !_impl) {
            // 文件变了(或首次加载):清缓存重新 require
            try {
                delete require.cache[IMPL_PATH];
            }
            catch ( /* ignore */_a) { /* ignore */ }
            // 同时清理 impl 可能 require 的同目录辅助模块缓存(如 scene-helpers)
            for (const k of Object.keys(require.cache)) {
                if (k.startsWith((0, path_1.join)(__dirname, 'scene-'))) {
                    try {
                        delete require.cache[k];
                    }
                    catch ( /* ignore */_b) { /* ignore */ }
                }
            }
            _impl = require('./scene-impl');
            _mtime = mtime;
            _loadError = null;
        }
    }
    catch (e) {
        _loadError = (e === null || e === void 0 ? void 0 : e.message) || String(e);
        // 加载失败保留旧 impl(若有),否则后续调用会明确报错
        if (!_impl)
            _impl = { methods: {} };
    }
    return _impl;
}
// 加载时先 require 一次,拿到 method 名表并冻结
const initial = loadImpl();
const FROZEN_METHODS = initial && initial.methods ? Object.keys(initial.methods) : [];
/** 代理方法表。每个方法在调用时重新走 loadImpl(),使 impl 改动热生效。 */
exports.methods = {};
for (const name of FROZEN_METHODS) {
    exports.methods[name] = (...args) => {
        var _a;
        const impl = loadImpl();
        const fn = (_a = impl === null || impl === void 0 ? void 0 : impl.methods) === null || _a === void 0 ? void 0 : _a[name];
        if (typeof fn !== 'function') {
            const hint = _loadError
                ? `scene-impl 加载失败: ${_loadError}`
                : `方法 '${name}' 不在 scene-impl 中(可用: ${Object.keys((impl === null || impl === void 0 ? void 0 : impl.methods) || {}).join(', ')})`;
            throw new Error(hint);
        }
        return fn.apply(impl.methods, args);
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2Uvc2NlbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFDSCwrQkFBNEI7QUFDNUIsdUNBQXlCO0FBQ3pCLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUEsV0FBSSxFQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFFekQsTUFBTSxTQUFTLEdBQVcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUMxRCxJQUFJLEtBQUssR0FBUSxJQUFJLENBQUM7QUFDdEIsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDaEIsSUFBSSxVQUFVLEdBQWtCLElBQUksQ0FBQztBQUVyQyxTQUFTLFFBQVE7SUFDYixJQUFJLENBQUM7UUFDRCxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUM3QyxJQUFJLEtBQUssS0FBSyxNQUFNLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUM3Qiw0QkFBNEI7WUFDNUIsSUFBSSxDQUFDO2dCQUFDLE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUFDLENBQUM7WUFBQyxRQUFRLFlBQVksSUFBZCxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDL0QsbURBQW1EO1lBQ25ELEtBQUssTUFBTSxDQUFDLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDekMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQzFDLElBQUksQ0FBQzt3QkFBQyxPQUFPLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQUMsQ0FBQztvQkFBQyxRQUFRLFlBQVksSUFBZCxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQzNELENBQUM7WUFDTCxDQUFDO1lBQ0QsS0FBSyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUNoQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1lBQ2YsVUFBVSxHQUFHLElBQUksQ0FBQztRQUN0QixDQUFDO0lBQ0wsQ0FBQztJQUFDLE9BQU8sQ0FBTSxFQUFFLENBQUM7UUFDZCxVQUFVLEdBQUcsQ0FBQSxDQUFDLGFBQUQsQ0FBQyx1QkFBRCxDQUFDLENBQUUsT0FBTyxLQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyQywrQkFBK0I7UUFDL0IsSUFBSSxDQUFDLEtBQUs7WUFBRSxLQUFLLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQUM7SUFDeEMsQ0FBQztJQUNELE9BQU8sS0FBSyxDQUFDO0FBQ2pCLENBQUM7QUFFRCxrQ0FBa0M7QUFDbEMsTUFBTSxPQUFPLEdBQUcsUUFBUSxFQUFFLENBQUM7QUFDM0IsTUFBTSxjQUFjLEdBQWEsT0FBTyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFFaEcsaURBQWlEO0FBQ3BDLFFBQUEsT0FBTyxHQUE4QyxFQUFFLENBQUM7QUFFckUsS0FBSyxNQUFNLElBQUksSUFBSSxjQUFjLEVBQUUsQ0FBQztJQUNoQyxlQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQVcsRUFBRSxFQUFFOztRQUMvQixNQUFNLElBQUksR0FBRyxRQUFRLEVBQUUsQ0FBQztRQUN4QixNQUFNLEVBQUUsR0FBRyxNQUFBLElBQUksYUFBSixJQUFJLHVCQUFKLElBQUksQ0FBRSxPQUFPLDBDQUFHLElBQUksQ0FBQyxDQUFDO1FBQ2pDLElBQUksT0FBTyxFQUFFLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDM0IsTUFBTSxJQUFJLEdBQUcsVUFBVTtnQkFDbkIsQ0FBQyxDQUFDLG9CQUFvQixVQUFVLEVBQUU7Z0JBQ2xDLENBQUMsQ0FBQyxPQUFPLElBQUkseUJBQXlCLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQSxJQUFJLGFBQUosSUFBSSx1QkFBSixJQUFJLENBQUUsT0FBTyxLQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO1lBQ3pGLE1BQU0sSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDMUIsQ0FBQztRQUNELE9BQU8sRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3hDLENBQUMsQ0FBQztBQUNOLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIOWcuuaZr+iEmuacrOWFpeWPoyjku6PnkIblsYIp44CCXG4gKlxuICog6K6+6K6hOuatpOaWh+S7tuWPquWBmiByZXF1aXJlIOi9rOWPkSznnJ/mraPnmoTpgLvovpHlnKggLi9zY2VuZS1pbXBs44CCXG4gKiDmr4/mrKEgbWV0aG9kIOiiq+iwg+eUqOWJjSzmo4DmtYsgc2NlbmUtaW1wbCDnmoQgbXRpbWU7bXRpbWUg5Y+Y5YyW5pe25riFIHJlcXVpcmUuY2FjaGUg6YeN5pawIHJlcXVpcmUsXG4gKiDku47ogIzlrp7njrAgc2NlbmUtaW1wbCDmlLnliqgqKueDreeUn+aViCoqKOaXoOmcgOmHjeWQr+e8lui+keWZqCzml6DpnIAgc29mdC1yZWxvYWQp44CCXG4gKlxuICog6Kej5Yaz55qE55eb54K5OkNvY29zIOaJqeWxleacuuWItuS4iyBzY2VuZS1zY3JpcHQg5qih5Z2X6KKr5Zy65pmv6L+b56iL5LiA5qyh5oCnIHJlcXVpcmUsXG4gKiBleHRlbnNpb246cmVsb2FkIC8gc29mdC1yZWxvYWQtc2NlbmUg6YO95LiN5Lya6YeN5paw5Yqg6L295Zy65pmv6ISa5pys5qih5Z2XLFxuICog5pS5IHNjZW5lLnRzIOWOhuadpemcgOimgemHjeWQr+e8lui+keWZqOOAguW8leWFpeatpOS7o+eQhuWQjjpcbiAqICAgLSBzY2VuZS1pbXBsLnRzIOaUueWKqCDihpIgdHNjIOKGkiBjcCBkaXN0IOKGkiDkuIvkuIDmrKEgbWV0aG9kIOiwg+eUqOWNs+eUn+aViFxuICogICAtIOS7heW9k+aWsOWiniBzY2VuZSBtZXRob2Qo6ZyA5pS5IHBhY2thZ2UuanNvbiBjb250cmlidXRpb25zKeaXtuaJjemcgOmHjeWQr+e8lui+keWZqFxuICpcbiAqIOazqOaEjzptZXRob2Qg5YiX6KGo5Zyo5q2k5paH5Lu25Yqg6L295pe25LiA5qyh5oCn5LuOIGltcGwg6K+75Y+W5bm25Ya757uT44CCXG4gKiDoi6UgaW1wbCDmlrDlop4gbWV0aG9kLOW/hemhu+WQjOatpSBwYWNrYWdlLmpzb24gY29udHJpYnV0aW9ucy5zY2VuZS5tZXRob2RzIOW5tumHjeWQr+e8lui+keWZqOOAglxuICovXG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5tb2R1bGUucGF0aHMucHVzaChqb2luKEVkaXRvci5BcHAucGF0aCwgJ25vZGVfbW9kdWxlcycpKTtcblxuY29uc3QgSU1QTF9QQVRIOiBzdHJpbmcgPSByZXF1aXJlLnJlc29sdmUoJy4vc2NlbmUtaW1wbCcpO1xubGV0IF9pbXBsOiBhbnkgPSBudWxsO1xubGV0IF9tdGltZSA9IC0xO1xubGV0IF9sb2FkRXJyb3I6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuXG5mdW5jdGlvbiBsb2FkSW1wbCgpOiBhbnkge1xuICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IG10aW1lID0gZnMuc3RhdFN5bmMoSU1QTF9QQVRIKS5tdGltZU1zO1xuICAgICAgICBpZiAobXRpbWUgIT09IF9tdGltZSB8fCAhX2ltcGwpIHtcbiAgICAgICAgICAgIC8vIOaWh+S7tuWPmOS6hijmiJbpppbmrKHliqDovb0pOua4hee8k+WtmOmHjeaWsCByZXF1aXJlXG4gICAgICAgICAgICB0cnkgeyBkZWxldGUgcmVxdWlyZS5jYWNoZVtJTVBMX1BBVEhdOyB9IGNhdGNoIHsgLyogaWdub3JlICovIH1cbiAgICAgICAgICAgIC8vIOWQjOaXtua4heeQhiBpbXBsIOWPr+iDvSByZXF1aXJlIOeahOWQjOebruW9lei+heWKqeaooeWdl+e8k+WtmCjlpoIgc2NlbmUtaGVscGVycylcbiAgICAgICAgICAgIGZvciAoY29uc3QgayBvZiBPYmplY3Qua2V5cyhyZXF1aXJlLmNhY2hlKSkge1xuICAgICAgICAgICAgICAgIGlmIChrLnN0YXJ0c1dpdGgoam9pbihfX2Rpcm5hbWUsICdzY2VuZS0nKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHsgZGVsZXRlIHJlcXVpcmUuY2FjaGVba107IH0gY2F0Y2ggeyAvKiBpZ25vcmUgKi8gfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF9pbXBsID0gcmVxdWlyZSgnLi9zY2VuZS1pbXBsJyk7XG4gICAgICAgICAgICBfbXRpbWUgPSBtdGltZTtcbiAgICAgICAgICAgIF9sb2FkRXJyb3IgPSBudWxsO1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgIF9sb2FkRXJyb3IgPSBlPy5tZXNzYWdlIHx8IFN0cmluZyhlKTtcbiAgICAgICAgLy8g5Yqg6L295aSx6LSl5L+d55WZ5penIGltcGwo6Iul5pyJKSzlkKbliJnlkI7nu63osIPnlKjkvJrmmI7noa7miqXplJlcbiAgICAgICAgaWYgKCFfaW1wbCkgX2ltcGwgPSB7IG1ldGhvZHM6IHt9IH07XG4gICAgfVxuICAgIHJldHVybiBfaW1wbDtcbn1cblxuLy8g5Yqg6L295pe25YWIIHJlcXVpcmUg5LiA5qyhLOaLv+WIsCBtZXRob2Qg5ZCN6KGo5bm25Ya757uTXG5jb25zdCBpbml0aWFsID0gbG9hZEltcGwoKTtcbmNvbnN0IEZST1pFTl9NRVRIT0RTOiBzdHJpbmdbXSA9IGluaXRpYWwgJiYgaW5pdGlhbC5tZXRob2RzID8gT2JqZWN0LmtleXMoaW5pdGlhbC5tZXRob2RzKSA6IFtdO1xuXG4vKiog5Luj55CG5pa55rOV6KGo44CC5q+P5Liq5pa55rOV5Zyo6LCD55So5pe26YeN5paw6LWwIGxvYWRJbXBsKCks5L2/IGltcGwg5pS55Yqo54Ot55Sf5pWI44CCICovXG5leHBvcnQgY29uc3QgbWV0aG9kczogeyBba2V5OiBzdHJpbmddOiAoLi4uYW55OiBhbnlbXSkgPT4gYW55IH0gPSB7fTtcblxuZm9yIChjb25zdCBuYW1lIG9mIEZST1pFTl9NRVRIT0RTKSB7XG4gICAgbWV0aG9kc1tuYW1lXSA9ICguLi5hcmdzOiBhbnlbXSkgPT4ge1xuICAgICAgICBjb25zdCBpbXBsID0gbG9hZEltcGwoKTtcbiAgICAgICAgY29uc3QgZm4gPSBpbXBsPy5tZXRob2RzPy5bbmFtZV07XG4gICAgICAgIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNvbnN0IGhpbnQgPSBfbG9hZEVycm9yXG4gICAgICAgICAgICAgICAgPyBgc2NlbmUtaW1wbCDliqDovb3lpLHotKU6ICR7X2xvYWRFcnJvcn1gXG4gICAgICAgICAgICAgICAgOiBg5pa55rOVICcke25hbWV9JyDkuI3lnKggc2NlbmUtaW1wbCDkuK0o5Y+v55SoOiAke09iamVjdC5rZXlzKGltcGw/Lm1ldGhvZHMgfHwge30pLmpvaW4oJywgJyl9KWA7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoaGludCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZuLmFwcGx5KGltcGwubWV0aG9kcywgYXJncyk7XG4gICAgfTtcbn1cbiJdfQ==