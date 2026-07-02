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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2Uvc2NlbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBQ0gsK0JBQTRCO0FBQzVCLHVDQUF5QjtBQUN6QixNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFBLFdBQUksRUFBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO0FBRXpELE1BQU0sU0FBUyxHQUFXLE9BQU8sQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDMUQsSUFBSSxLQUFLLEdBQVEsSUFBSSxDQUFDO0FBQ3RCLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ2hCLElBQUksVUFBVSxHQUFrQixJQUFJLENBQUM7QUFFckMsU0FBUyxRQUFRO0lBQ2IsSUFBSSxDQUFDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFDN0MsSUFBSSxLQUFLLEtBQUssTUFBTSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDN0IsNEJBQTRCO1lBQzVCLElBQUksQ0FBQztnQkFBQyxPQUFPLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7WUFBQyxDQUFDO1lBQUMsUUFBUSxZQUFZLElBQWQsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQy9ELG1EQUFtRDtZQUNuRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3pDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUMxQyxJQUFJLENBQUM7d0JBQUMsT0FBTyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUFDLENBQUM7b0JBQUMsUUFBUSxZQUFZLElBQWQsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUMzRCxDQUFDO1lBQ0wsQ0FBQztZQUNELEtBQUssR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDaEMsTUFBTSxHQUFHLEtBQUssQ0FBQztZQUNmLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFDdEIsQ0FBQztJQUNMLENBQUM7SUFBQyxPQUFPLENBQU0sRUFBRSxDQUFDO1FBQ2QsVUFBVSxHQUFHLENBQUEsQ0FBQyxhQUFELENBQUMsdUJBQUQsQ0FBQyxDQUFFLE9BQU8sS0FBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckMsK0JBQStCO1FBQy9CLElBQUksQ0FBQyxLQUFLO1lBQUUsS0FBSyxHQUFHLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUFDO0lBQ3hDLENBQUM7SUFDRCxPQUFPLEtBQUssQ0FBQztBQUNqQixDQUFDO0FBRUQsa0NBQWtDO0FBQ2xDLE1BQU0sT0FBTyxHQUFHLFFBQVEsRUFBRSxDQUFDO0FBQzNCLE1BQU0sY0FBYyxHQUFhLE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBRWhHLGlEQUFpRDtBQUNwQyxRQUFBLE9BQU8sR0FBOEMsRUFBRSxDQUFDO0FBRXJFLEtBQUssTUFBTSxJQUFJLElBQUksY0FBYyxFQUFFLENBQUM7SUFDaEMsZUFBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFXLEVBQUUsRUFBRTs7UUFDL0IsTUFBTSxJQUFJLEdBQUcsUUFBUSxFQUFFLENBQUM7UUFDeEIsTUFBTSxFQUFFLEdBQUcsTUFBQSxJQUFJLGFBQUosSUFBSSx1QkFBSixJQUFJLENBQUUsT0FBTywwQ0FBRyxJQUFJLENBQUMsQ0FBQztRQUNqQyxJQUFJLE9BQU8sRUFBRSxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQzNCLE1BQU0sSUFBSSxHQUFHLFVBQVU7Z0JBQ25CLENBQUMsQ0FBQyxvQkFBb0IsVUFBVSxFQUFFO2dCQUNsQyxDQUFDLENBQUMsT0FBTyxJQUFJLHlCQUF5QixNQUFNLENBQUMsSUFBSSxDQUFDLENBQUEsSUFBSSxhQUFKLElBQUksdUJBQUosSUFBSSxDQUFFLE9BQU8sS0FBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztZQUN6RixNQUFNLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFCLENBQUM7UUFDRCxPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN4QyxDQUFDLENBQUM7QUFDTixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiDlnLrmma/ohJrmnKzlhaXlj6Mo5Luj55CG5bGCKeOAglxuICpcbiAqIOiuvuiuoTrmraTmlofku7blj6rlgZogcmVxdWlyZSDovazlj5Es55yf5q2j55qE6YC76L6R5ZyoIC4vc2NlbmUtaW1wbOOAglxuICog5q+P5qyhIG1ldGhvZCDooqvosIPnlKjliY0s5qOA5rWLIHNjZW5lLWltcGwg55qEIG10aW1lO210aW1lIOWPmOWMluaXtua4hSByZXF1aXJlLmNhY2hlIOmHjeaWsCByZXF1aXJlLFxuICog5LuO6ICM5a6e546wIHNjZW5lLWltcGwg5pS55YqoKirng63nlJ/mlYgqKijml6DpnIDph43lkK/nvJbovpHlmags5peg6ZyAIHNvZnQtcmVsb2FkKeOAglxuICpcbiAqIOino+WGs+eahOeXm+eCuTpDb2NvcyDmianlsZXmnLrliLbkuIsgc2NlbmUtc2NyaXB0IOaooeWdl+iiq+WcuuaZr+i/m+eoi+S4gOasoeaApyByZXF1aXJlLFxuICogZXh0ZW5zaW9uOnJlbG9hZCAvIHNvZnQtcmVsb2FkLXNjZW5lIOmDveS4jeS8mumHjeaWsOWKoOi9veWcuuaZr+iEmuacrOaooeWdlyxcbiAqIOaUuSBzY2VuZS50cyDljobmnaXpnIDopoHph43lkK/nvJbovpHlmajjgILlvJXlhaXmraTku6PnkIblkI46XG4gKiAgIC0gc2NlbmUtaW1wbC50cyDmlLnliqgg4oaSIHRzYyDihpIgY3AgZGlzdCDihpIg5LiL5LiA5qyhIG1ldGhvZCDosIPnlKjljbPnlJ/mlYhcbiAqICAgLSDku4XlvZPmlrDlop4gc2NlbmUgbWV0aG9kKOmcgOaUuSBwYWNrYWdlLmpzb24gY29udHJpYnV0aW9ucynml7bmiY3pnIDph43lkK/nvJbovpHlmahcbiAqXG4gKiDms6jmhI86bWV0aG9kIOWIl+ihqOWcqOatpOaWh+S7tuWKoOi9veaXtuS4gOasoeaAp+S7jiBpbXBsIOivu+WPluW5tuWGu+e7k+OAglxuICog6IulIGltcGwg5paw5aKeIG1ldGhvZCzlv4XpobvlkIzmraUgcGFja2FnZS5qc29uIGNvbnRyaWJ1dGlvbnMuc2NlbmUubWV0aG9kcyDlubbph43lkK/nvJbovpHlmajjgIJcbiAqL1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xubW9kdWxlLnBhdGhzLnB1c2goam9pbihFZGl0b3IuQXBwLnBhdGgsICdub2RlX21vZHVsZXMnKSk7XG5cbmNvbnN0IElNUExfUEFUSDogc3RyaW5nID0gcmVxdWlyZS5yZXNvbHZlKCcuL3NjZW5lLWltcGwnKTtcbmxldCBfaW1wbDogYW55ID0gbnVsbDtcbmxldCBfbXRpbWUgPSAtMTtcbmxldCBfbG9hZEVycm9yOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcblxuZnVuY3Rpb24gbG9hZEltcGwoKTogYW55IHtcbiAgICB0cnkge1xuICAgICAgICBjb25zdCBtdGltZSA9IGZzLnN0YXRTeW5jKElNUExfUEFUSCkubXRpbWVNcztcbiAgICAgICAgaWYgKG10aW1lICE9PSBfbXRpbWUgfHwgIV9pbXBsKSB7XG4gICAgICAgICAgICAvLyDmlofku7blj5jkuoYo5oiW6aaW5qyh5Yqg6L29KTrmuIXnvJPlrZjph43mlrAgcmVxdWlyZVxuICAgICAgICAgICAgdHJ5IHsgZGVsZXRlIHJlcXVpcmUuY2FjaGVbSU1QTF9QQVRIXTsgfSBjYXRjaCB7IC8qIGlnbm9yZSAqLyB9XG4gICAgICAgICAgICAvLyDlkIzml7bmuIXnkIYgaW1wbCDlj6/og70gcmVxdWlyZSDnmoTlkIznm67lvZXovoXliqnmqKHlnZfnvJPlrZgo5aaCIHNjZW5lLWhlbHBlcnMpXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGsgb2YgT2JqZWN0LmtleXMocmVxdWlyZS5jYWNoZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAoay5zdGFydHNXaXRoKGpvaW4oX19kaXJuYW1lLCAnc2NlbmUtJykpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7IGRlbGV0ZSByZXF1aXJlLmNhY2hlW2tdOyB9IGNhdGNoIHsgLyogaWdub3JlICovIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBfaW1wbCA9IHJlcXVpcmUoJy4vc2NlbmUtaW1wbCcpO1xuICAgICAgICAgICAgX210aW1lID0gbXRpbWU7XG4gICAgICAgICAgICBfbG9hZEVycm9yID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICBfbG9hZEVycm9yID0gZT8ubWVzc2FnZSB8fCBTdHJpbmcoZSk7XG4gICAgICAgIC8vIOWKoOi9veWksei0peS/neeVmeaXpyBpbXBsKOiLpeaciSks5ZCm5YiZ5ZCO57ut6LCD55So5Lya5piO56Gu5oql6ZSZXG4gICAgICAgIGlmICghX2ltcGwpIF9pbXBsID0geyBtZXRob2RzOiB7fSB9O1xuICAgIH1cbiAgICByZXR1cm4gX2ltcGw7XG59XG5cbi8vIOWKoOi9veaXtuWFiCByZXF1aXJlIOS4gOasoSzmi7/liLAgbWV0aG9kIOWQjeihqOW5tuWGu+e7k1xuY29uc3QgaW5pdGlhbCA9IGxvYWRJbXBsKCk7XG5jb25zdCBGUk9aRU5fTUVUSE9EUzogc3RyaW5nW10gPSBpbml0aWFsICYmIGluaXRpYWwubWV0aG9kcyA/IE9iamVjdC5rZXlzKGluaXRpYWwubWV0aG9kcykgOiBbXTtcblxuLyoqIOS7o+eQhuaWueazleihqOOAguavj+S4quaWueazleWcqOiwg+eUqOaXtumHjeaWsOi1sCBsb2FkSW1wbCgpLOS9vyBpbXBsIOaUueWKqOeDreeUn+aViOOAgiAqL1xuZXhwb3J0IGNvbnN0IG1ldGhvZHM6IHsgW2tleTogc3RyaW5nXTogKC4uLmFueTogYW55W10pID0+IGFueSB9ID0ge307XG5cbmZvciAoY29uc3QgbmFtZSBvZiBGUk9aRU5fTUVUSE9EUykge1xuICAgIG1ldGhvZHNbbmFtZV0gPSAoLi4uYXJnczogYW55W10pID0+IHtcbiAgICAgICAgY29uc3QgaW1wbCA9IGxvYWRJbXBsKCk7XG4gICAgICAgIGNvbnN0IGZuID0gaW1wbD8ubWV0aG9kcz8uW25hbWVdO1xuICAgICAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjb25zdCBoaW50ID0gX2xvYWRFcnJvclxuICAgICAgICAgICAgICAgID8gYHNjZW5lLWltcGwg5Yqg6L295aSx6LSlOiAke19sb2FkRXJyb3J9YFxuICAgICAgICAgICAgICAgIDogYOaWueazlSAnJHtuYW1lfScg5LiN5ZyoIHNjZW5lLWltcGwg5LitKOWPr+eUqDogJHtPYmplY3Qua2V5cyhpbXBsPy5tZXRob2RzIHx8IHt9KS5qb2luKCcsICcpfSlgO1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGhpbnQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmbi5hcHBseShpbXBsLm1ldGhvZHMsIGFyZ3MpO1xuICAgIH07XG59XG4iXX0=