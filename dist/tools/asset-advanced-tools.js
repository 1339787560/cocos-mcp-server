"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetAdvancedTools = void 0;
class AssetAdvancedTools {
    getTools() {
        return [
            {
                name: 'save_asset_meta',
                description: 'Save asset meta information',
                inputSchema: {
                    type: 'object',
                    properties: {
                        urlOrUUID: {
                            type: 'string',
                            description: 'Asset URL or UUID'
                        },
                        content: {
                            type: 'string',
                            description: 'Asset meta serialized content string'
                        }
                    },
                    required: ['urlOrUUID', 'content']
                }
            },
            {
                name: 'generate_available_url',
                description: 'Generate an available URL based on input URL',
                inputSchema: {
                    type: 'object',
                    properties: {
                        url: {
                            type: 'string',
                            description: 'Asset URL to generate available URL for'
                        }
                    },
                    required: ['url']
                }
            },
            {
                name: 'query_asset_db_ready',
                description: 'Check if asset database is ready',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'open_asset_external',
                description: 'Open asset with external program',
                inputSchema: {
                    type: 'object',
                    properties: {
                        urlOrUUID: {
                            type: 'string',
                            description: 'Asset URL or UUID to open'
                        }
                    },
                    required: ['urlOrUUID']
                }
            },
            {
                name: 'batch_import_assets',
                description: 'Import multiple assets in batch',
                inputSchema: {
                    type: 'object',
                    properties: {
                        sourceDirectory: {
                            type: 'string',
                            description: 'Source directory path'
                        },
                        targetDirectory: {
                            type: 'string',
                            description: 'Target directory URL'
                        },
                        fileFilter: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'File extensions to include (e.g., [".png", ".jpg"])',
                            default: []
                        },
                        recursive: {
                            type: 'boolean',
                            description: 'Include subdirectories',
                            default: false
                        },
                        overwrite: {
                            type: 'boolean',
                            description: 'Overwrite existing files',
                            default: false
                        }
                    },
                    required: ['sourceDirectory', 'targetDirectory']
                }
            },
            {
                name: 'batch_delete_assets',
                description: 'Delete multiple assets in batch',
                inputSchema: {
                    type: 'object',
                    properties: {
                        urls: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Array of asset URLs to delete'
                        }
                    },
                    required: ['urls']
                }
            },
            {
                name: 'validate_asset_references',
                description: 'Validate asset references and find broken links',
                inputSchema: {
                    type: 'object',
                    properties: {
                        directory: {
                            type: 'string',
                            description: 'Directory to validate (default: entire project)',
                            default: 'db://assets'
                        }
                    }
                }
            },
            {
                name: 'get_asset_dependencies',
                description: 'Get asset dependency tree',
                inputSchema: {
                    type: 'object',
                    properties: {
                        urlOrUUID: {
                            type: 'string',
                            description: 'Asset URL or UUID'
                        },
                        direction: {
                            type: 'string',
                            description: 'Dependency direction',
                            enum: ['dependents', 'dependencies', 'both'],
                            default: 'dependencies'
                        }
                    },
                    required: ['urlOrUUID']
                }
            },
            {
                name: 'get_unused_assets',
                description: 'Find unused assets in project',
                inputSchema: {
                    type: 'object',
                    properties: {
                        directory: {
                            type: 'string',
                            description: 'Directory to scan (default: entire project)',
                            default: 'db://assets'
                        },
                        excludeDirectories: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Directories to exclude from scan',
                            default: []
                        }
                    }
                }
            },
            {
                name: 'compress_textures',
                description: 'Batch compress texture assets',
                inputSchema: {
                    type: 'object',
                    properties: {
                        directory: {
                            type: 'string',
                            description: 'Directory containing textures',
                            default: 'db://assets'
                        },
                        format: {
                            type: 'string',
                            description: 'Compression format',
                            enum: ['auto', 'jpg', 'png', 'webp'],
                            default: 'auto'
                        },
                        quality: {
                            type: 'number',
                            description: 'Compression quality (0.1-1.0)',
                            minimum: 0.1,
                            maximum: 1.0,
                            default: 0.8
                        }
                    }
                }
            },
            {
                name: 'export_asset_manifest',
                description: 'Export asset manifest/inventory',
                inputSchema: {
                    type: 'object',
                    properties: {
                        directory: {
                            type: 'string',
                            description: 'Directory to export manifest for',
                            default: 'db://assets'
                        },
                        format: {
                            type: 'string',
                            description: 'Export format',
                            enum: ['json', 'csv', 'xml'],
                            default: 'json'
                        },
                        includeMetadata: {
                            type: 'boolean',
                            description: 'Include asset metadata',
                            default: true
                        }
                    }
                }
            }
        ];
    }
    async execute(toolName, args) {
        switch (toolName) {
            case 'save_asset_meta':
                return await this.saveAssetMeta(args.urlOrUUID, args.content);
            case 'generate_available_url':
                return await this.generateAvailableUrl(args.url);
            case 'query_asset_db_ready':
                return await this.queryAssetDbReady();
            case 'open_asset_external':
                return await this.openAssetExternal(args.urlOrUUID);
            case 'batch_import_assets':
                return await this.batchImportAssets(args);
            case 'batch_delete_assets':
                return await this.batchDeleteAssets(args.urls);
            case 'validate_asset_references':
                return await this.validateAssetReferences(args.directory);
            case 'get_asset_dependencies':
                return await this.getAssetDependencies(args.urlOrUUID, args.direction);
            case 'get_unused_assets':
                return await this.getUnusedAssets(args.directory, args.excludeDirectories);
            case 'compress_textures':
                return await this.compressTextures(args.directory, args.format, args.quality);
            case 'export_asset_manifest':
                return await this.exportAssetManifest(args.directory, args.format, args.includeMetadata);
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }
    async saveAssetMeta(urlOrUUID, content) {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'save-asset-meta', urlOrUUID, content).then((result) => {
                resolve({
                    success: true,
                    data: {
                        uuid: result === null || result === void 0 ? void 0 : result.uuid,
                        url: result === null || result === void 0 ? void 0 : result.url,
                        message: 'Asset meta saved successfully'
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async generateAvailableUrl(url) {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'generate-available-url', url).then((availableUrl) => {
                resolve({
                    success: true,
                    data: {
                        originalUrl: url,
                        availableUrl: availableUrl,
                        message: availableUrl === url ?
                            'URL is available' :
                            'Generated new available URL'
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async queryAssetDbReady() {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'query-ready').then((ready) => {
                resolve({
                    success: true,
                    data: {
                        ready: ready,
                        message: ready ? 'Asset database is ready' : 'Asset database is not ready'
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async openAssetExternal(urlOrUUID) {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'open-asset', urlOrUUID).then(() => {
                resolve({
                    success: true,
                    message: 'Asset opened with external program'
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async batchImportAssets(args) {
        return new Promise(async (resolve) => {
            try {
                const fs = require('fs');
                const path = require('path');
                if (!fs.existsSync(args.sourceDirectory)) {
                    resolve({ success: false, error: 'Source directory does not exist' });
                    return;
                }
                const files = this.getFilesFromDirectory(args.sourceDirectory, args.fileFilter || [], args.recursive || false);
                const importResults = [];
                let successCount = 0;
                let errorCount = 0;
                for (const filePath of files) {
                    try {
                        const fileName = path.basename(filePath);
                        const targetPath = `${args.targetDirectory}/${fileName}`;
                        const result = await Editor.Message.request('asset-db', 'import-asset', filePath, targetPath, {
                            overwrite: args.overwrite || false,
                            rename: !(args.overwrite || false)
                        });
                        importResults.push({
                            source: filePath,
                            target: targetPath,
                            success: true,
                            uuid: result === null || result === void 0 ? void 0 : result.uuid
                        });
                        successCount++;
                    }
                    catch (err) {
                        importResults.push({
                            source: filePath,
                            success: false,
                            error: err.message
                        });
                        errorCount++;
                    }
                }
                resolve({
                    success: true,
                    data: {
                        totalFiles: files.length,
                        successCount: successCount,
                        errorCount: errorCount,
                        results: importResults,
                        message: `Batch import completed: ${successCount} success, ${errorCount} errors`
                    }
                });
            }
            catch (err) {
                resolve({ success: false, error: err.message });
            }
        });
    }
    getFilesFromDirectory(dirPath, fileFilter, recursive) {
        const fs = require('fs');
        const path = require('path');
        const files = [];
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const stat = fs.statSync(fullPath);
            if (stat.isFile()) {
                if (fileFilter.length === 0 || fileFilter.some(ext => item.toLowerCase().endsWith(ext.toLowerCase()))) {
                    files.push(fullPath);
                }
            }
            else if (stat.isDirectory() && recursive) {
                files.push(...this.getFilesFromDirectory(fullPath, fileFilter, recursive));
            }
        }
        return files;
    }
    async batchDeleteAssets(urls) {
        return new Promise(async (resolve) => {
            try {
                const deleteResults = [];
                let successCount = 0;
                let errorCount = 0;
                for (const url of urls) {
                    try {
                        await Editor.Message.request('asset-db', 'delete-asset', url);
                        deleteResults.push({
                            url: url,
                            success: true
                        });
                        successCount++;
                    }
                    catch (err) {
                        deleteResults.push({
                            url: url,
                            success: false,
                            error: err.message
                        });
                        errorCount++;
                    }
                }
                resolve({
                    success: true,
                    data: {
                        totalAssets: urls.length,
                        successCount: successCount,
                        errorCount: errorCount,
                        results: deleteResults,
                        message: `Batch delete completed: ${successCount} success, ${errorCount} errors`
                    }
                });
            }
            catch (err) {
                resolve({ success: false, error: err.message });
            }
        });
    }
    async validateAssetReferences(directory = 'db://assets') {
        return new Promise(async (resolve) => {
            try {
                // Get all assets in directory
                const assets = await Editor.Message.request('asset-db', 'query-assets', { pattern: `${directory}/**/*` });
                const brokenReferences = [];
                const validReferences = [];
                for (const asset of assets) {
                    try {
                        const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', asset.url);
                        if (assetInfo) {
                            validReferences.push({
                                url: asset.url,
                                uuid: asset.uuid,
                                name: asset.name
                            });
                        }
                    }
                    catch (err) {
                        brokenReferences.push({
                            url: asset.url,
                            uuid: asset.uuid,
                            name: asset.name,
                            error: err.message
                        });
                    }
                }
                resolve({
                    success: true,
                    data: {
                        directory: directory,
                        totalAssets: assets.length,
                        validReferences: validReferences.length,
                        brokenReferences: brokenReferences.length,
                        brokenAssets: brokenReferences,
                        message: `Validation completed: ${brokenReferences.length} broken references found`
                    }
                });
            }
            catch (err) {
                resolve({ success: false, error: err.message });
            }
        });
    }
    async getAssetDependencies(urlOrUUID, direction = 'dependencies') {
        return new Promise(async (resolve) => {
            try {
                // 1. 解析 url/uuid → asset info (含磁盘路径)
                const targetInfo = await this._resolveAssetInfo(urlOrUUID);
                if (!targetInfo) {
                    resolve({ success: false, error: `Asset not found: ${urlOrUUID}` });
                    return;
                }
                const targetUuid = targetInfo.uuid;
                const fs = require('fs');
                if (direction === 'dependencies' || direction === 'forward' || direction === 'deps') {
                    // 前向: 此资源引用了哪些其他资源(读源文件文本提取 __uuid__)
                    const deps = await this._extractAssetDeps(targetInfo);
                    resolve({
                        success: true,
                        data: {
                            url: targetInfo.url, uuid: targetUuid,
                            direction: 'dependencies',
                            dependencies: deps.resolved,
                            missing: deps.missing,
                            count: deps.resolved.length,
                            missingCount: deps.missing.length,
                            note: deps.skippedBinary
                                ? `二进制资源(.png/.fbx 等)无文本可解析, 仅文本资源(.scene/.prefab/.mat/.anim/.ts)的依赖被列出`
                                : undefined
                        }
                    });
                }
                else if (direction === 'referenced-by' || direction === 'reverse' || direction === 'refs') {
                    // 反向: 谁引用了此资源(扫 db://assets 下文本文件)
                    const refBy = await this._findReferencingAssets(targetUuid, 'db://assets');
                    resolve({
                        success: true,
                        data: {
                            url: targetInfo.url, uuid: targetUuid,
                            direction: 'referenced-by',
                            referencedBy: refBy,
                            count: refBy.length
                        }
                    });
                }
                else {
                    resolve({ success: false, error: `direction 必须是 'dependencies' 或 'referenced-by', 收到: ${direction}` });
                }
            }
            catch (err) {
                resolve({ success: false, error: err.message });
            }
        });
    }
    async getUnusedAssets(directory = 'db://assets', excludeDirectories = []) {
        return new Promise(async (resolve) => {
            var _a;
            try {
                const assets = await Editor.Message.request('asset-db', 'query-assets', { pattern: `${directory}/**/*` });
                if (!assets || !Array.isArray(assets)) {
                    resolve({ success: false, error: 'query-assets 返回空' });
                    return;
                }
                const fs = require('fs');
                // 二进制后缀: 无法文本解析, 但其引用由其他文本资源承载, 故仍可被标"used"
                const binaryExts = new Set(['png', 'jpg', 'jpeg', 'webp', 'tga', 'pvr', 'astc', 'ktx', 'mp3', 'wav', 'ogg', 'ttf', 'otf', 'woff', 'woff2', 'bin', 'fbx', 'gltf', 'glb', 'usdz', 'exr', 'hdr', 'babylon', 'material']);
                // 入口点后缀: 视为用户直接消费, 不报 unused (代码/配置/场景为运行入口)
                const entryExts = new Set(['scene', 'ts', 'js', 'cjs', 'mjs', 'json', 'txt', 'md', 'csv', 'xml', 'yaml', 'yml', 'effect', 'chunk', 'glsl', 'vs', 'fs']);
                const metaExts = new Set(['meta']);
                // 第一遍: 收集所有非目录、非 meta、未被 exclude 排除的资源
                const all = new Map(); // uuid -> asset
                for (const a of assets) {
                    if (!a || a.isDirectory)
                        continue;
                    const url = a.url || '';
                    if (metaExts.has((url.split('.').pop() || '').toLowerCase()))
                        continue;
                    if (excludeDirectories && excludeDirectories.some((ex) => url.startsWith(ex)))
                        continue;
                    all.set(a.uuid, a);
                }
                // 第二遍: 解析文本资源, 累积被引用的 uuid 集
                const referenced = new Set();
                const uuidRe = /"__uuid__"\s*:\s*"([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(?:@[0-9a-fA-F]+)?)"/g;
                for (const a of all.values()) {
                    const url = a.url || '';
                    if (!url)
                        continue;
                    const path = this._urlToDisk(url);
                    const ext = (path.split('.').pop() || '').toLowerCase();
                    if (binaryExts.has(ext))
                        continue; // 二进制不解析
                    try {
                        const content = fs.readFileSync(path, 'utf-8');
                        let m;
                        uuidRe.lastIndex = 0;
                        while ((m = uuidRe.exec(content)) !== null) {
                            referenced.add(m[1]);
                            // 也记录去 suffix 的父 uuid (引用 spriteFrame 时父 texture 算被用)
                            const base = m[1].split('@')[0];
                            if (base !== m[1])
                                referenced.add(base);
                        }
                    }
                    catch ( /* 二进制/无权限, 跳过 */_b) { /* 二进制/无权限, 跳过 */ }
                }
                // 第三遍: 差集 = 未被引用 且 非入口点
                const unused = [];
                for (const a of all.values()) {
                    if (referenced.has(a.uuid))
                        continue;
                    const ext = (((_a = a.url) === null || _a === void 0 ? void 0 : _a.split('.').pop()) || '').toLowerCase();
                    if (ext && entryExts.has(ext))
                        continue;
                    unused.push({ uuid: a.uuid, url: a.url, name: a.name, type: a.type || a.assetType });
                }
                resolve({
                    success: true,
                    data: {
                        directory,
                        excludeDirectories: excludeDirectories || [],
                        totalScanned: all.size,
                        referencedUnique: referenced.size,
                        unusedCount: unused.length,
                        unusedAssets: unused,
                        note: '仅基于文本资源(.scene/.prefab/.mat/.anim/.ts 等)的 __uuid__ 引用推断; 入口点(.ts/.scene/.json)不算 unused; 二进制资源(.png 等)靠被文本资源引用判定'
                    }
                });
            }
            catch (err) {
                resolve({ success: false, error: err.message });
            }
        });
    }
    /** 解析 url 或 uuid 为 asset info (含磁盘 path) */
    async _resolveAssetInfo(urlOrUUID) {
        try {
            const info = await Editor.Message.request('asset-db', 'query-asset-info', urlOrUUID);
            if (info && info.uuid) {
                return {
                    uuid: info.uuid,
                    url: info.url,
                    name: info.name,
                    type: info.type || info.assetType,
                    path: this._urlToDisk(info.url),
                };
            }
            return null;
        }
        catch (_a) {
            return null;
        }
    }
    /** db:// url 转磁盘绝对路径 (db://assets/foo -> <projectPath>/assets/foo) */
    _urlToDisk(url) {
        if (!url || !url.startsWith('db://'))
            return url || '';
        const proj = Editor.Project.path;
        return require('path').join(proj, url.replace(/^db:\/\/+/, ''));
    }
    /** 提取单个资源的前向依赖(读源文件文本正则 __uuid__) */
    async _extractAssetDeps(assetInfo) {
        const fs = require('fs');
        const path = assetInfo.path;
        const ext = ((path === null || path === void 0 ? void 0 : path.split('.').pop()) || '').toLowerCase();
        const binaryExts = new Set(['png', 'jpg', 'jpeg', 'webp', 'tga', 'pvr', 'astc', 'ktx', 'mp3', 'wav', 'ogg', 'ttf', 'otf', 'woff', 'woff2', 'bin', 'fbx', 'gltf', 'glb', 'exr', 'hdr']);
        if (!path || binaryExts.has(ext)) {
            return { resolved: [], missing: [], skippedBinary: true };
        }
        let content;
        try {
            content = fs.readFileSync(path, 'utf-8');
        }
        catch (_a) {
            return { resolved: [], missing: [], skippedBinary: true };
        }
        const uuidRe = /"__uuid__"\s*:\s*"([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(?:@[0-9a-fA-F]+)?)"/g;
        const seen = new Set();
        let m;
        while ((m = uuidRe.exec(content)) !== null) {
            seen.add(m[1]);
        }
        const resolved = [];
        const missing = [];
        for (const uuid of seen) {
            try {
                const info = await Editor.Message.request('asset-db', 'query-asset-info', uuid);
                if (info && info.uuid) {
                    resolved.push({ uuid, url: info.url, name: info.name, type: info.type || info.assetType });
                }
                else {
                    missing.push({ uuid });
                }
            }
            catch (_b) {
                missing.push({ uuid });
            }
        }
        return { resolved, missing, skippedBinary: false };
    }
    /** 反向: 扫 directory 下文本文件, 找引用了 targetUuid 的资源 */
    async _findReferencingAssets(targetUuid, directory) {
        const assets = await Editor.Message.request('asset-db', 'query-assets', { pattern: `${directory}/**/*` });
        const fs = require('fs');
        const binaryExts = new Set(['png', 'jpg', 'jpeg', 'webp', 'tga', 'pvr', 'astc', 'ktx', 'mp3', 'wav', 'ogg', 'ttf', 'otf', 'woff', 'woff2', 'bin', 'fbx', 'gltf', 'glb', 'exr', 'hdr']);
        // cocos __uuid__ 引用可能是完整 uuid 或压缩 uuid; 同时匹配 targetUuid 及其可能的 @subAsset 父
        const targets = new Set([targetUuid]);
        const base = targetUuid.split('@')[0];
        if (base !== targetUuid)
            targets.add(base);
        const result = [];
        for (const a of assets || []) {
            if (!a || a.isDirectory)
                continue;
            const url = a.url || '';
            if (!url)
                continue;
            const path = this._urlToDisk(url);
            const ext = (path.split('.').pop() || '').toLowerCase();
            if (binaryExts.has(ext))
                continue;
            try {
                const content = fs.readFileSync(path, 'utf-8');
                // 命中任一 target 即记录
                let hit = false;
                for (const t of targets) {
                    if (content.includes(t)) {
                        hit = true;
                        break;
                    }
                }
                if (hit) {
                    result.push({ uuid: a.uuid, url: a.url, name: a.name, type: a.type || a.assetType });
                }
            }
            catch ( /* skip */_a) { /* skip */ }
        }
        return result;
    }
    async compressTextures(directory = 'db://assets', format = 'auto', quality = 0.8) {
        return new Promise((resolve) => {
            // Note: Texture compression would require image processing APIs
            resolve({
                success: false,
                error: 'Texture compression requires image processing capabilities not available in current Cocos Creator MCP implementation. Use the Editor\'s built-in texture compression settings or external tools.'
            });
        });
    }
    async exportAssetManifest(directory = 'db://assets', format = 'json', includeMetadata = true) {
        return new Promise(async (resolve) => {
            try {
                const assets = await Editor.Message.request('asset-db', 'query-assets', { pattern: `${directory}/**/*` });
                const manifest = [];
                for (const asset of assets) {
                    const manifestEntry = {
                        name: asset.name,
                        url: asset.url,
                        uuid: asset.uuid,
                        type: asset.type,
                        size: asset.size || 0,
                        isDirectory: asset.isDirectory || false
                    };
                    if (includeMetadata) {
                        try {
                            const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', asset.url);
                            if (assetInfo && assetInfo.meta) {
                                manifestEntry.meta = assetInfo.meta;
                            }
                        }
                        catch (err) {
                            // Skip metadata if not available
                        }
                    }
                    manifest.push(manifestEntry);
                }
                let exportData;
                switch (format) {
                    case 'json':
                        exportData = JSON.stringify(manifest, null, 2);
                        break;
                    case 'csv':
                        exportData = this.convertToCSV(manifest);
                        break;
                    case 'xml':
                        exportData = this.convertToXML(manifest);
                        break;
                    default:
                        exportData = JSON.stringify(manifest, null, 2);
                }
                resolve({
                    success: true,
                    data: {
                        directory: directory,
                        format: format,
                        assetCount: manifest.length,
                        includeMetadata: includeMetadata,
                        manifest: exportData,
                        message: `Asset manifest exported with ${manifest.length} assets`
                    }
                });
            }
            catch (err) {
                resolve({ success: false, error: err.message });
            }
        });
    }
    convertToCSV(data) {
        if (data.length === 0)
            return '';
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header];
                return typeof value === 'object' ? JSON.stringify(value) : String(value);
            });
            csvRows.push(values.join(','));
        }
        return csvRows.join('\n');
    }
    convertToXML(data) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<assets>\n';
        for (const item of data) {
            xml += '  <asset>\n';
            for (const [key, value] of Object.entries(item)) {
                const xmlValue = typeof value === 'object' ?
                    JSON.stringify(value) :
                    String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                xml += `    <${key}>${xmlValue}</${key}>\n`;
            }
            xml += '  </asset>\n';
        }
        xml += '</assets>';
        return xml;
    }
}
exports.AssetAdvancedTools = AssetAdvancedTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXQtYWR2YW5jZWQtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvYXNzZXQtYWR2YW5jZWQtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsTUFBYSxrQkFBa0I7SUFDM0IsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsaUJBQWlCO2dCQUN2QixXQUFXLEVBQUUsNkJBQTZCO2dCQUMxQyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLFNBQVMsRUFBRTs0QkFDUCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsbUJBQW1CO3lCQUNuQzt3QkFDRCxPQUFPLEVBQUU7NEJBQ0wsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLHNDQUFzQzt5QkFDdEQ7cUJBQ0o7b0JBQ0QsUUFBUSxFQUFFLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQztpQkFDckM7YUFDSjtZQUNEO2dCQUNJLElBQUksRUFBRSx3QkFBd0I7Z0JBQzlCLFdBQVcsRUFBRSw4Q0FBOEM7Z0JBQzNELFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsR0FBRyxFQUFFOzRCQUNELElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSx5Q0FBeUM7eUJBQ3pEO3FCQUNKO29CQUNELFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQztpQkFDcEI7YUFDSjtZQUNEO2dCQUNJLElBQUksRUFBRSxzQkFBc0I7Z0JBQzVCLFdBQVcsRUFBRSxrQ0FBa0M7Z0JBQy9DLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUUsRUFBRTtpQkFDakI7YUFDSjtZQUNEO2dCQUNJLElBQUksRUFBRSxxQkFBcUI7Z0JBQzNCLFdBQVcsRUFBRSxrQ0FBa0M7Z0JBQy9DLFdBQVcsRUFBRTtvQkFD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S0FBSyxRQUFRLENBQUMsQ0FBQztvQkFDeEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO29CQUN2QixNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQ3JGLEdBQUcsSUFBSSxRQUFRLEdBQUcsSUFBSSxRQUFRLEtBQUssR0FBRyxLQUFLLENBQUM7WUFDaEQsQ0FBQztZQUNELEdBQUcsSUFBSSxjQUFjLENBQUM7UUFDMUIsQ0FBQztRQUVELEdBQUcsSUFBSSxXQUFXLENBQUM7UUFDbkIsT0FBTyxHQUFHLENBQUM7SUFDZixDQUFDO0NBQ0o7QUFweUJELGdEQW95QkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IgfSBmcm9tICcuLi90eXBlcyc7XHJcblxyXG5leHBvcnQgY2xhc3MgQXNzZXRBZHZhbmNlZFRvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcclxuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdzYXZlX2Fzc2V0X21ldGEnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTYXZlIGFzc2V0IG1ldGEgaW5mb3JtYXRpb24nLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybE9yVVVJRDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Fzc2V0IFVSTCBvciBVVUlEJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQXNzZXQgbWV0YSBzZXJpYWxpemVkIGNvbnRlbnQgc3RyaW5nJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWyd1cmxPclVVSUQnLCAnY29udGVudCddXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdnZW5lcmF0ZV9hdmFpbGFibGVfdXJsJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnR2VuZXJhdGUgYW4gYXZhaWxhYmxlIFVSTCBiYXNlZCBvbiBpbnB1dCBVUkwnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Fzc2V0IFVSTCB0byBnZW5lcmF0ZSBhdmFpbGFibGUgVVJMIGZvcidcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXJsJ11cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3F1ZXJ5X2Fzc2V0X2RiX3JlYWR5JyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ2hlY2sgaWYgYXNzZXQgZGF0YWJhc2UgaXMgcmVhZHknLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7fVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnb3Blbl9hc3NldF9leHRlcm5hbCcsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ09wZW4gYXNzZXQgd2l0aCBleHRlcm5hbCBwcm9ncmFtJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmxPclVVSUQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBc3NldCBVUkwgb3IgVVVJRCB0byBvcGVuJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWyd1cmxPclVVSUQnXVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnYmF0Y2hfaW1wb3J0X2Fzc2V0cycsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ltcG9ydCBtdWx0aXBsZSBhc3NldHMgaW4gYmF0Y2gnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZURpcmVjdG9yeToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NvdXJjZSBkaXJlY3RvcnkgcGF0aCdcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0RGlyZWN0b3J5OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGFyZ2V0IGRpcmVjdG9yeSBVUkwnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVGaWx0ZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtczogeyB0eXBlOiAnc3RyaW5nJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdGaWxlIGV4dGVuc2lvbnMgdG8gaW5jbHVkZSAoZS5nLiwgW1wiLnBuZ1wiLCBcIi5qcGdcIl0pJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IFtdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlY3Vyc2l2ZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdJbmNsdWRlIHN1YmRpcmVjdG9yaWVzJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG92ZXJ3cml0ZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdPdmVyd3JpdGUgZXhpc3RpbmcgZmlsZXMnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnc291cmNlRGlyZWN0b3J5JywgJ3RhcmdldERpcmVjdG9yeSddXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdiYXRjaF9kZWxldGVfYXNzZXRzJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRGVsZXRlIG11bHRpcGxlIGFzc2V0cyBpbiBiYXRjaCcsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2FycmF5JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiB7IHR5cGU6ICdzdHJpbmcnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FycmF5IG9mIGFzc2V0IFVSTHMgdG8gZGVsZXRlJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWyd1cmxzJ11cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3ZhbGlkYXRlX2Fzc2V0X3JlZmVyZW5jZXMnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdWYWxpZGF0ZSBhc3NldCByZWZlcmVuY2VzIGFuZCBmaW5kIGJyb2tlbiBsaW5rcycsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlyZWN0b3J5OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRGlyZWN0b3J5IHRvIHZhbGlkYXRlIChkZWZhdWx0OiBlbnRpcmUgcHJvamVjdCknLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogJ2RiOi8vYXNzZXRzJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnZ2V0X2Fzc2V0X2RlcGVuZGVuY2llcycsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0dldCBhc3NldCBkZXBlbmRlbmN5IHRyZWUnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybE9yVVVJRDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Fzc2V0IFVSTCBvciBVVUlEJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb246IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdEZXBlbmRlbmN5IGRpcmVjdGlvbicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2RlcGVuZGVudHMnLCAnZGVwZW5kZW5jaWVzJywgJ2JvdGgnXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICdkZXBlbmRlbmNpZXMnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3VybE9yVVVJRCddXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdnZXRfdW51c2VkX2Fzc2V0cycsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZpbmQgdW51c2VkIGFzc2V0cyBpbiBwcm9qZWN0JyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rvcnk6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdEaXJlY3RvcnkgdG8gc2NhbiAoZGVmYXVsdDogZW50aXJlIHByb2plY3QpJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICdkYjovL2Fzc2V0cydcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXhjbHVkZURpcmVjdG9yaWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYXJyYXknLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXM6IHsgdHlwZTogJ3N0cmluZycgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRGlyZWN0b3JpZXMgdG8gZXhjbHVkZSBmcm9tIHNjYW4nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogW11cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2NvbXByZXNzX3RleHR1cmVzJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQmF0Y2ggY29tcHJlc3MgdGV4dHVyZSBhc3NldHMnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpcmVjdG9yeToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0RpcmVjdG9yeSBjb250YWluaW5nIHRleHR1cmVzJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICdkYjovL2Fzc2V0cydcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ29tcHJlc3Npb24gZm9ybWF0JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnYXV0bycsICdqcGcnLCAncG5nJywgJ3dlYnAnXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICdhdXRvJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWFsaXR5OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ29tcHJlc3Npb24gcXVhbGl0eSAoMC4xLTEuMCknLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWluaW11bTogMC4xLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF4aW11bTogMS4wLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogMC44XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdleHBvcnRfYXNzZXRfbWFuaWZlc3QnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdFeHBvcnQgYXNzZXQgbWFuaWZlc3QvaW52ZW50b3J5JyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rvcnk6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdEaXJlY3RvcnkgdG8gZXhwb3J0IG1hbmlmZXN0IGZvcicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAnZGI6Ly9hc3NldHMnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0V4cG9ydCBmb3JtYXQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydqc29uJywgJ2NzdicsICd4bWwnXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICdqc29uJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNsdWRlTWV0YWRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnSW5jbHVkZSBhc3NldCBtZXRhZGF0YScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICBdO1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICBzd2l0Y2ggKHRvb2xOYW1lKSB7XHJcbiAgICAgICAgICAgIGNhc2UgJ3NhdmVfYXNzZXRfbWV0YSc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zYXZlQXNzZXRNZXRhKGFyZ3MudXJsT3JVVUlELCBhcmdzLmNvbnRlbnQpO1xyXG4gICAgICAgICAgICBjYXNlICdnZW5lcmF0ZV9hdmFpbGFibGVfdXJsJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdlbmVyYXRlQXZhaWxhYmxlVXJsKGFyZ3MudXJsKTtcclxuICAgICAgICAgICAgY2FzZSAncXVlcnlfYXNzZXRfZGJfcmVhZHknOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucXVlcnlBc3NldERiUmVhZHkoKTtcclxuICAgICAgICAgICAgY2FzZSAnb3Blbl9hc3NldF9leHRlcm5hbCc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5vcGVuQXNzZXRFeHRlcm5hbChhcmdzLnVybE9yVVVJRCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2JhdGNoX2ltcG9ydF9hc3NldHMnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuYmF0Y2hJbXBvcnRBc3NldHMoYXJncyk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2JhdGNoX2RlbGV0ZV9hc3NldHMnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuYmF0Y2hEZWxldGVBc3NldHMoYXJncy51cmxzKTtcclxuICAgICAgICAgICAgY2FzZSAndmFsaWRhdGVfYXNzZXRfcmVmZXJlbmNlcyc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy52YWxpZGF0ZUFzc2V0UmVmZXJlbmNlcyhhcmdzLmRpcmVjdG9yeSk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2dldF9hc3NldF9kZXBlbmRlbmNpZXMnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0QXNzZXREZXBlbmRlbmNpZXMoYXJncy51cmxPclVVSUQsIGFyZ3MuZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgY2FzZSAnZ2V0X3VudXNlZF9hc3NldHMnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0VW51c2VkQXNzZXRzKGFyZ3MuZGlyZWN0b3J5LCBhcmdzLmV4Y2x1ZGVEaXJlY3Rvcmllcyk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2NvbXByZXNzX3RleHR1cmVzJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNvbXByZXNzVGV4dHVyZXMoYXJncy5kaXJlY3RvcnksIGFyZ3MuZm9ybWF0LCBhcmdzLnF1YWxpdHkpO1xyXG4gICAgICAgICAgICBjYXNlICdleHBvcnRfYXNzZXRfbWFuaWZlc3QnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZXhwb3J0QXNzZXRNYW5pZmVzdChhcmdzLmRpcmVjdG9yeSwgYXJncy5mb3JtYXQsIGFyZ3MuaW5jbHVkZU1ldGFkYXRhKTtcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0b29sOiAke3Rvb2xOYW1lfWApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHNhdmVBc3NldE1ldGEodXJsT3JVVUlEOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3NhdmUtYXNzZXQtbWV0YScsIHVybE9yVVVJRCwgY29udGVudCkudGhlbigocmVzdWx0OiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiByZXN1bHQ/LnV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDogcmVzdWx0Py51cmwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdBc3NldCBtZXRhIHNhdmVkIHN1Y2Nlc3NmdWxseSdcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGdlbmVyYXRlQXZhaWxhYmxlVXJsKHVybDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAnZ2VuZXJhdGUtYXZhaWxhYmxlLXVybCcsIHVybCkudGhlbigoYXZhaWxhYmxlVXJsOiBzdHJpbmcpID0+IHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbFVybDogdXJsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVVcmw6IGF2YWlsYWJsZVVybCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYXZhaWxhYmxlVXJsID09PSB1cmwgPyBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdVUkwgaXMgYXZhaWxhYmxlJyA6IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0dlbmVyYXRlZCBuZXcgYXZhaWxhYmxlIFVSTCdcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5QXNzZXREYlJlYWR5KCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXJlYWR5JykudGhlbigocmVhZHk6IGJvb2xlYW4pID0+IHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWFkeTogcmVhZHksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IHJlYWR5ID8gJ0Fzc2V0IGRhdGFiYXNlIGlzIHJlYWR5JyA6ICdBc3NldCBkYXRhYmFzZSBpcyBub3QgcmVhZHknXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBvcGVuQXNzZXRFeHRlcm5hbCh1cmxPclVVSUQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ29wZW4tYXNzZXQnLCB1cmxPclVVSUQpLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnQXNzZXQgb3BlbmVkIHdpdGggZXh0ZXJuYWwgcHJvZ3JhbSdcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgYmF0Y2hJbXBvcnRBc3NldHMoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoYXN5bmMgKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhhcmdzLnNvdXJjZURpcmVjdG9yeSkpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnU291cmNlIGRpcmVjdG9yeSBkb2VzIG5vdCBleGlzdCcgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVzID0gdGhpcy5nZXRGaWxlc0Zyb21EaXJlY3RvcnkoXHJcbiAgICAgICAgICAgICAgICAgICAgYXJncy5zb3VyY2VEaXJlY3RvcnksIFxyXG4gICAgICAgICAgICAgICAgICAgIGFyZ3MuZmlsZUZpbHRlciB8fCBbXSwgXHJcbiAgICAgICAgICAgICAgICAgICAgYXJncy5yZWN1cnNpdmUgfHwgZmFsc2VcclxuICAgICAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgaW1wb3J0UmVzdWx0czogYW55W10gPSBbXTtcclxuICAgICAgICAgICAgICAgIGxldCBzdWNjZXNzQ291bnQgPSAwO1xyXG4gICAgICAgICAgICAgICAgbGV0IGVycm9yQ291bnQgPSAwO1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZmlsZVBhdGggb2YgZmlsZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHBhdGguYmFzZW5hbWUoZmlsZVBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRQYXRoID0gYCR7YXJncy50YXJnZXREaXJlY3Rvcnl9LyR7ZmlsZU5hbWV9YDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ2ltcG9ydC1hc3NldCcsIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZVBhdGgsIHRhcmdldFBhdGgsIHsgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcndyaXRlOiBhcmdzLm92ZXJ3cml0ZSB8fCBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5hbWU6ICEoYXJncy5vdmVyd3JpdGUgfHwgZmFsc2UpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGltcG9ydFJlc3VsdHMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IGZpbGVQYXRoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0OiB0YXJnZXRQYXRoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHJlc3VsdD8udXVpZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc0NvdW50Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW1wb3J0UmVzdWx0cy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZTogZmlsZVBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBlcnIubWVzc2FnZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JDb3VudCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdG90YWxGaWxlczogZmlsZXMubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzQ291bnQ6IHN1Y2Nlc3NDb3VudCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JDb3VudDogZXJyb3JDb3VudCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0czogaW1wb3J0UmVzdWx0cyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYEJhdGNoIGltcG9ydCBjb21wbGV0ZWQ6ICR7c3VjY2Vzc0NvdW50fSBzdWNjZXNzLCAke2Vycm9yQ291bnR9IGVycm9yc2BcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRGaWxlc0Zyb21EaXJlY3RvcnkoZGlyUGF0aDogc3RyaW5nLCBmaWxlRmlsdGVyOiBzdHJpbmdbXSwgcmVjdXJzaXZlOiBib29sZWFuKTogc3RyaW5nW10ge1xyXG4gICAgICAgIGNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcclxuICAgICAgICBjb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xyXG4gICAgICAgIGNvbnN0IGZpbGVzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuICAgICAgICBjb25zdCBpdGVtcyA9IGZzLnJlYWRkaXJTeW5jKGRpclBhdGgpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xyXG4gICAgICAgICAgICBjb25zdCBmdWxsUGF0aCA9IHBhdGguam9pbihkaXJQYXRoLCBpdGVtKTtcclxuICAgICAgICAgICAgY29uc3Qgc3RhdCA9IGZzLnN0YXRTeW5jKGZ1bGxQYXRoKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmIChzdGF0LmlzRmlsZSgpKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZmlsZUZpbHRlci5sZW5ndGggPT09IDAgfHwgZmlsZUZpbHRlci5zb21lKGV4dCA9PiBpdGVtLnRvTG93ZXJDYXNlKCkuZW5kc1dpdGgoZXh0LnRvTG93ZXJDYXNlKCkpKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbGVzLnB1c2goZnVsbFBhdGgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHN0YXQuaXNEaXJlY3RvcnkoKSAmJiByZWN1cnNpdmUpIHtcclxuICAgICAgICAgICAgICAgIGZpbGVzLnB1c2goLi4udGhpcy5nZXRGaWxlc0Zyb21EaXJlY3RvcnkoZnVsbFBhdGgsIGZpbGVGaWx0ZXIsIHJlY3Vyc2l2ZSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiBmaWxlcztcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGJhdGNoRGVsZXRlQXNzZXRzKHVybHM6IHN0cmluZ1tdKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoYXN5bmMgKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRlbGV0ZVJlc3VsdHM6IGFueVtdID0gW107XHJcbiAgICAgICAgICAgICAgICBsZXQgc3VjY2Vzc0NvdW50ID0gMDtcclxuICAgICAgICAgICAgICAgIGxldCBlcnJvckNvdW50ID0gMDtcclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHVybCBvZiB1cmxzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAnZGVsZXRlLWFzc2V0JywgdXJsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlUmVzdWx0cy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogdXJsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc0NvdW50Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlUmVzdWx0cy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogdXJsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogZXJyLm1lc3NhZ2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yQ291bnQrKztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsQXNzZXRzOiB1cmxzLmxlbmd0aCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc0NvdW50OiBzdWNjZXNzQ291bnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yQ291bnQ6IGVycm9yQ291bnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdHM6IGRlbGV0ZVJlc3VsdHMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBCYXRjaCBkZWxldGUgY29tcGxldGVkOiAke3N1Y2Nlc3NDb3VudH0gc3VjY2VzcywgJHtlcnJvckNvdW50fSBlcnJvcnNgXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgdmFsaWRhdGVBc3NldFJlZmVyZW5jZXMoZGlyZWN0b3J5OiBzdHJpbmcgPSAnZGI6Ly9hc3NldHMnKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoYXN5bmMgKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIC8vIEdldCBhbGwgYXNzZXRzIGluIGRpcmVjdG9yeVxyXG4gICAgICAgICAgICAgICAgY29uc3QgYXNzZXRzID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXRzJywgeyBwYXR0ZXJuOiBgJHtkaXJlY3Rvcnl9LyoqLypgIH0pO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBjb25zdCBicm9rZW5SZWZlcmVuY2VzOiBhbnlbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdmFsaWRSZWZlcmVuY2VzOiBhbnlbXSA9IFtdO1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYXNzZXQgb2YgYXNzZXRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYXNzZXRJbmZvID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIGFzc2V0LnVybCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhc3NldEluZm8pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkUmVmZXJlbmNlcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6IGFzc2V0LnVybCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBhc3NldC51dWlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGFzc2V0Lm5hbWVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyb2tlblJlZmVyZW5jZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6IGFzc2V0LnVybCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IGFzc2V0LnV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBhc3NldC5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IChlcnIgYXMgRXJyb3IpLm1lc3NhZ2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rvcnk6IGRpcmVjdG9yeSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdG90YWxBc3NldHM6IGFzc2V0cy5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkUmVmZXJlbmNlczogdmFsaWRSZWZlcmVuY2VzLmxlbmd0aCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJva2VuUmVmZXJlbmNlczogYnJva2VuUmVmZXJlbmNlcy5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyb2tlbkFzc2V0czogYnJva2VuUmVmZXJlbmNlcyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFZhbGlkYXRpb24gY29tcGxldGVkOiAke2Jyb2tlblJlZmVyZW5jZXMubGVuZ3RofSBicm9rZW4gcmVmZXJlbmNlcyBmb3VuZGBcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRBc3NldERlcGVuZGVuY2llcyh1cmxPclVVSUQ6IHN0cmluZywgZGlyZWN0aW9uOiBzdHJpbmcgPSAnZGVwZW5kZW5jaWVzJyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGFzeW5jIChyZXNvbHZlKSA9PiB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAvLyAxLiDop6PmnpAgdXJsL3V1aWQg4oaSIGFzc2V0IGluZm8gKOWQq+ejgeebmOi3r+W+hClcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldEluZm8gPSBhd2FpdCB0aGlzLl9yZXNvbHZlQXNzZXRJbmZvKHVybE9yVVVJRCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRhcmdldEluZm8pIHtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQXNzZXQgbm90IGZvdW5kOiAke3VybE9yVVVJRH1gIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldFV1aWQ6IHN0cmluZyA9IHRhcmdldEluZm8udXVpZDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoZGlyZWN0aW9uID09PSAnZGVwZW5kZW5jaWVzJyB8fCBkaXJlY3Rpb24gPT09ICdmb3J3YXJkJyB8fCBkaXJlY3Rpb24gPT09ICdkZXBzJykge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOWJjeWQkTog5q2k6LWE5rqQ5byV55So5LqG5ZOq5Lqb5YW25LuW6LWE5rqQKOivu+a6kOaWh+S7tuaWh+acrOaPkOWPliBfX3V1aWRfXylcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkZXBzID0gYXdhaXQgdGhpcy5fZXh0cmFjdEFzc2V0RGVwcyh0YXJnZXRJbmZvKTtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiB0YXJnZXRJbmZvLnVybCwgdXVpZDogdGFyZ2V0VXVpZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbjogJ2RlcGVuZGVuY2llcycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXBlbmRlbmNpZXM6IGRlcHMucmVzb2x2ZWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaXNzaW5nOiBkZXBzLm1pc3NpbmcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3VudDogZGVwcy5yZXNvbHZlZC5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaXNzaW5nQ291bnQ6IGRlcHMubWlzc2luZy5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub3RlOiBkZXBzLnNraXBwZWRCaW5hcnlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IGDkuozov5vliLbotYTmupAoLnBuZy8uZmJ4IOetiSnml6DmlofmnKzlj6/op6PmnpAsIOS7heaWh+acrOi1hOa6kCguc2NlbmUvLnByZWZhYi8ubWF0Ly5hbmltLy50cynnmoTkvp3otZbooqvliJflh7pgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiB1bmRlZmluZWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChkaXJlY3Rpb24gPT09ICdyZWZlcmVuY2VkLWJ5JyB8fCBkaXJlY3Rpb24gPT09ICdyZXZlcnNlJyB8fCBkaXJlY3Rpb24gPT09ICdyZWZzJykge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOWPjeWQkTog6LCB5byV55So5LqG5q2k6LWE5rqQKOaJqyBkYjovL2Fzc2V0cyDkuIvmlofmnKzmlofku7YpXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVmQnkgPSBhd2FpdCB0aGlzLl9maW5kUmVmZXJlbmNpbmdBc3NldHModGFyZ2V0VXVpZCwgJ2RiOi8vYXNzZXRzJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogdGFyZ2V0SW5mby51cmwsIHV1aWQ6IHRhcmdldFV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb246ICdyZWZlcmVuY2VkLWJ5JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlZmVyZW5jZWRCeTogcmVmQnksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3VudDogcmVmQnkubGVuZ3RoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYGRpcmVjdGlvbiDlv4XpobvmmK8gJ2RlcGVuZGVuY2llcycg5oiWICdyZWZlcmVuY2VkLWJ5Jywg5pS25YiwOiAke2RpcmVjdGlvbn1gIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGdldFVudXNlZEFzc2V0cyhkaXJlY3Rvcnk6IHN0cmluZyA9ICdkYjovL2Fzc2V0cycsIGV4Y2x1ZGVEaXJlY3Rvcmllczogc3RyaW5nW10gPSBbXSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGFzeW5jIChyZXNvbHZlKSA9PiB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBhc3NldHMgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldHMnLCB7IHBhdHRlcm46IGAke2RpcmVjdG9yeX0vKiovKmAgfSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWFzc2V0cyB8fCAhQXJyYXkuaXNBcnJheShhc3NldHMpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ3F1ZXJ5LWFzc2V0cyDov5Tlm57nqbonIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcclxuICAgICAgICAgICAgICAgIC8vIOS6jOi/m+WItuWQjue8gDog5peg5rOV5paH5pys6Kej5p6QLCDkvYblhbblvJXnlKjnlLHlhbbku5bmlofmnKzotYTmupDmib/ovb0sIOaVheS7jeWPr+iiq+agh1widXNlZFwiXHJcbiAgICAgICAgICAgICAgICBjb25zdCBiaW5hcnlFeHRzID0gbmV3IFNldChbJ3BuZycsJ2pwZycsJ2pwZWcnLCd3ZWJwJywndGdhJywncHZyJywnYXN0YycsJ2t0eCcsJ21wMycsJ3dhdicsJ29nZycsJ3R0ZicsJ290ZicsJ3dvZmYnLCd3b2ZmMicsJ2JpbicsJ2ZieCcsJ2dsdGYnLCdnbGInLCd1c2R6JywnZXhyJywnaGRyJywnYmFieWxvbicsJ21hdGVyaWFsJ10pO1xyXG4gICAgICAgICAgICAgICAgLy8g5YWl5Y+j54K55ZCO57yAOiDop4bkuLrnlKjmiLfnm7TmjqXmtojotLksIOS4jeaKpSB1bnVzZWQgKOS7o+eggS/phY3nva4v5Zy65pmv5Li66L+Q6KGM5YWl5Y+jKVxyXG4gICAgICAgICAgICAgICAgY29uc3QgZW50cnlFeHRzID0gbmV3IFNldChbJ3NjZW5lJywndHMnLCdqcycsJ2NqcycsJ21qcycsJ2pzb24nLCd0eHQnLCdtZCcsJ2NzdicsJ3htbCcsJ3lhbWwnLCd5bWwnLCdlZmZlY3QnLCdjaHVuaycsJ2dsc2wnLCd2cycsJ2ZzJ10pO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbWV0YUV4dHMgPSBuZXcgU2V0KFsnbWV0YSddKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyDnrKzkuIDpgY06IOaUtumbhuaJgOaciemdnuebruW9leOAgemdniBtZXRh44CB5pyq6KKrIGV4Y2x1ZGUg5o6S6Zmk55qE6LWE5rqQXHJcbiAgICAgICAgICAgICAgICBjb25zdCBhbGwgPSBuZXcgTWFwPHN0cmluZywgYW55PigpOyAvLyB1dWlkIC0+IGFzc2V0XHJcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGEgb2YgYXNzZXRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFhIHx8IGEuaXNEaXJlY3RvcnkpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHVybDogc3RyaW5nID0gYS51cmwgfHwgJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1ldGFFeHRzLmhhcygodXJsLnNwbGl0KCcuJykucG9wKCkgfHwgJycpLnRvTG93ZXJDYXNlKCkpKSBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXhjbHVkZURpcmVjdG9yaWVzICYmIGV4Y2x1ZGVEaXJlY3Rvcmllcy5zb21lKChleDogc3RyaW5nKSA9PiB1cmwuc3RhcnRzV2l0aChleCkpKSBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICBhbGwuc2V0KGEudXVpZCwgYSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8g56ys5LqM6YGNOiDop6PmnpDmlofmnKzotYTmupAsIOe0r+enr+iiq+W8leeUqOeahCB1dWlkIOmbhlxyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVmZXJlbmNlZCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdXVpZFJlID0gL1wiX191dWlkX19cIlxccyo6XFxzKlwiKFswLTlhLWZBLUZdezh9LVswLTlhLWZBLUZdezR9LVswLTlhLWZBLUZdezR9LVswLTlhLWZBLUZdezR9LVswLTlhLWZBLUZdezEyfSg/OkBbMC05YS1mQS1GXSspPylcIi9nO1xyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBhIG9mIGFsbC52YWx1ZXMoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHVybDogc3RyaW5nID0gYS51cmwgfHwgJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF1cmwpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhdGggPSB0aGlzLl91cmxUb0Rpc2sodXJsKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBleHQgPSAocGF0aC5zcGxpdCgnLicpLnBvcCgpIHx8ICcnKS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChiaW5hcnlFeHRzLmhhcyhleHQpKSBjb250aW51ZTsgLy8g5LqM6L+b5Yi25LiN6Kej5p6QXHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhwYXRoLCAndXRmLTgnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG06IFJlZ0V4cEV4ZWNBcnJheSB8IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWRSZS5sYXN0SW5kZXggPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAoKG0gPSB1dWlkUmUuZXhlYyhjb250ZW50KSkgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlZmVyZW5jZWQuYWRkKG1bMV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5Lmf6K6w5b2V5Y67IHN1ZmZpeCDnmoTniLYgdXVpZCAo5byV55SoIHNwcml0ZUZyYW1lIOaXtueItiB0ZXh0dXJlIOeul+iiq+eUqClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGJhc2UgPSBtWzFdLnNwbGl0KCdAJylbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYmFzZSAhPT0gbVsxXSkgcmVmZXJlbmNlZC5hZGQoYmFzZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIHsgLyog5LqM6L+b5Yi2L+aXoOadg+mZkCwg6Lez6L+HICovIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyDnrKzkuInpgY06IOW3rumbhiA9IOacquiiq+W8leeUqCDkuJQg6Z2e5YWl5Y+j54K5XHJcbiAgICAgICAgICAgICAgICBjb25zdCB1bnVzZWQ6IGFueVtdID0gW107XHJcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGEgb2YgYWxsLnZhbHVlcygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlZmVyZW5jZWQuaGFzKGEudXVpZCkpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4dCA9IChhLnVybD8uc3BsaXQoJy4nKS5wb3AoKSB8fCAnJykudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXh0ICYmIGVudHJ5RXh0cy5oYXMoZXh0KSkgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgdW51c2VkLnB1c2goeyB1dWlkOiBhLnV1aWQsIHVybDogYS51cmwsIG5hbWU6IGEubmFtZSwgdHlwZTogYS50eXBlIHx8IChhIGFzIGFueSkuYXNzZXRUeXBlIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpcmVjdG9yeSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXhjbHVkZURpcmVjdG9yaWVzOiBleGNsdWRlRGlyZWN0b3JpZXMgfHwgW10sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsU2Nhbm5lZDogYWxsLnNpemUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZmVyZW5jZWRVbmlxdWU6IHJlZmVyZW5jZWQuc2l6ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdW51c2VkQ291bnQ6IHVudXNlZC5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVudXNlZEFzc2V0czogdW51c2VkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBub3RlOiAn5LuF5Z+65LqO5paH5pys6LWE5rqQKC5zY2VuZS8ucHJlZmFiLy5tYXQvLmFuaW0vLnRzIOetiSnnmoQgX191dWlkX18g5byV55So5o6o5patOyDlhaXlj6PngrkoLnRzLy5zY2VuZS8uanNvbinkuI3nrpcgdW51c2VkOyDkuozov5vliLbotYTmupAoLnBuZyDnrYkp6Z2g6KKr5paH5pys6LWE5rqQ5byV55So5Yik5a6aJ1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvKiog6Kej5p6QIHVybCDmiJYgdXVpZCDkuLogYXNzZXQgaW5mbyAo5ZCr56OB55uYIHBhdGgpICovXHJcbiAgICBwcml2YXRlIGFzeW5jIF9yZXNvbHZlQXNzZXRJbmZvKHVybE9yVVVJRDogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBpbmZvID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIHVybE9yVVVJRCk7XHJcbiAgICAgICAgICAgIGlmIChpbmZvICYmIGluZm8udXVpZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICB1dWlkOiBpbmZvLnV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBpbmZvLnVybCxcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBpbmZvLm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogaW5mby50eXBlIHx8IGluZm8uYXNzZXRUeXBlLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IHRoaXMuX3VybFRvRGlzayhpbmZvLnVybCksXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH0gY2F0Y2ggeyByZXR1cm4gbnVsbDsgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKiBkYjovLyB1cmwg6L2s56OB55uY57ud5a+56Lev5b6EIChkYjovL2Fzc2V0cy9mb28gLT4gPHByb2plY3RQYXRoPi9hc3NldHMvZm9vKSAqL1xyXG4gICAgcHJpdmF0ZSBfdXJsVG9EaXNrKHVybDogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgICAgICBpZiAoIXVybCB8fCAhdXJsLnN0YXJ0c1dpdGgoJ2RiOi8vJykpIHJldHVybiB1cmwgfHwgJyc7XHJcbiAgICAgICAgY29uc3QgcHJvaiA9IEVkaXRvci5Qcm9qZWN0LnBhdGg7XHJcbiAgICAgICAgcmV0dXJuIHJlcXVpcmUoJ3BhdGgnKS5qb2luKHByb2osIHVybC5yZXBsYWNlKC9eZGI6XFwvXFwvKy8sICcnKSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqIOaPkOWPluWNleS4qui1hOa6kOeahOWJjeWQkeS+nei1lijor7vmupDmlofku7bmlofmnKzmraPliJkgX191dWlkX18pICovXHJcbiAgICBwcml2YXRlIGFzeW5jIF9leHRyYWN0QXNzZXREZXBzKGFzc2V0SW5mbzogYW55KTogUHJvbWlzZTx7IHJlc29sdmVkOiBhbnlbXTsgbWlzc2luZzogYW55W107IHNraXBwZWRCaW5hcnk6IGJvb2xlYW4gfT4ge1xyXG4gICAgICAgIGNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcclxuICAgICAgICBjb25zdCBwYXRoOiBzdHJpbmcgPSBhc3NldEluZm8ucGF0aDtcclxuICAgICAgICBjb25zdCBleHQgPSAocGF0aD8uc3BsaXQoJy4nKS5wb3AoKSB8fCAnJykudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICBjb25zdCBiaW5hcnlFeHRzID0gbmV3IFNldChbJ3BuZycsJ2pwZycsJ2pwZWcnLCd3ZWJwJywndGdhJywncHZyJywnYXN0YycsJ2t0eCcsJ21wMycsJ3dhdicsJ29nZycsJ3R0ZicsJ290ZicsJ3dvZmYnLCd3b2ZmMicsJ2JpbicsJ2ZieCcsJ2dsdGYnLCdnbGInLCdleHInLCdoZHInXSk7XHJcbiAgICAgICAgaWYgKCFwYXRoIHx8IGJpbmFyeUV4dHMuaGFzKGV4dCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgcmVzb2x2ZWQ6IFtdLCBtaXNzaW5nOiBbXSwgc2tpcHBlZEJpbmFyeTogdHJ1ZSB9O1xyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgY29udGVudDogc3RyaW5nO1xyXG4gICAgICAgIHRyeSB7IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMocGF0aCwgJ3V0Zi04Jyk7IH1cclxuICAgICAgICBjYXRjaCB7IHJldHVybiB7IHJlc29sdmVkOiBbXSwgbWlzc2luZzogW10sIHNraXBwZWRCaW5hcnk6IHRydWUgfTsgfVxyXG5cclxuICAgICAgICBjb25zdCB1dWlkUmUgPSAvXCJfX3V1aWRfX1wiXFxzKjpcXHMqXCIoWzAtOWEtZkEtRl17OH0tWzAtOWEtZkEtRl17NH0tWzAtOWEtZkEtRl17NH0tWzAtOWEtZkEtRl17NH0tWzAtOWEtZkEtRl17MTJ9KD86QFswLTlhLWZBLUZdKyk/KVwiL2c7XHJcbiAgICAgICAgY29uc3Qgc2VlbiA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG4gICAgICAgIGxldCBtOiBSZWdFeHBFeGVjQXJyYXkgfCBudWxsO1xyXG4gICAgICAgIHdoaWxlICgobSA9IHV1aWRSZS5leGVjKGNvbnRlbnQpKSAhPT0gbnVsbCkgeyBzZWVuLmFkZChtWzFdKTsgfVxyXG5cclxuICAgICAgICBjb25zdCByZXNvbHZlZDogYW55W10gPSBbXTtcclxuICAgICAgICBjb25zdCBtaXNzaW5nOiBhbnlbXSA9IFtdO1xyXG4gICAgICAgIGZvciAoY29uc3QgdXVpZCBvZiBzZWVuKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpbmZvID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIHV1aWQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGluZm8gJiYgaW5mby51dWlkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZWQucHVzaCh7IHV1aWQsIHVybDogaW5mby51cmwsIG5hbWU6IGluZm8ubmFtZSwgdHlwZTogaW5mby50eXBlIHx8IGluZm8uYXNzZXRUeXBlIH0pO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBtaXNzaW5nLnB1c2goeyB1dWlkIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgICAgIG1pc3NpbmcucHVzaCh7IHV1aWQgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHsgcmVzb2x2ZWQsIG1pc3NpbmcsIHNraXBwZWRCaW5hcnk6IGZhbHNlIH07XHJcbiAgICB9XHJcblxyXG4gICAgLyoqIOWPjeWQkTog5omrIGRpcmVjdG9yeSDkuIvmlofmnKzmlofku7YsIOaJvuW8leeUqOS6hiB0YXJnZXRVdWlkIOeahOi1hOa6kCAqL1xyXG4gICAgcHJpdmF0ZSBhc3luYyBfZmluZFJlZmVyZW5jaW5nQXNzZXRzKHRhcmdldFV1aWQ6IHN0cmluZywgZGlyZWN0b3J5OiBzdHJpbmcpOiBQcm9taXNlPGFueVtdPiB7XHJcbiAgICAgICAgY29uc3QgYXNzZXRzID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXRzJywgeyBwYXR0ZXJuOiBgJHtkaXJlY3Rvcnl9LyoqLypgIH0pO1xyXG4gICAgICAgIGNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcclxuICAgICAgICBjb25zdCBiaW5hcnlFeHRzID0gbmV3IFNldChbJ3BuZycsJ2pwZycsJ2pwZWcnLCd3ZWJwJywndGdhJywncHZyJywnYXN0YycsJ2t0eCcsJ21wMycsJ3dhdicsJ29nZycsJ3R0ZicsJ290ZicsJ3dvZmYnLCd3b2ZmMicsJ2JpbicsJ2ZieCcsJ2dsdGYnLCdnbGInLCdleHInLCdoZHInXSk7XHJcbiAgICAgICAgLy8gY29jb3MgX191dWlkX18g5byV55So5Y+v6IO95piv5a6M5pW0IHV1aWQg5oiW5Y6L57ypIHV1aWQ7IOWQjOaXtuWMuemFjSB0YXJnZXRVdWlkIOWPiuWFtuWPr+iDveeahCBAc3ViQXNzZXQg54i2XHJcbiAgICAgICAgY29uc3QgdGFyZ2V0cyA9IG5ldyBTZXQ8c3RyaW5nPihbdGFyZ2V0VXVpZF0pO1xyXG4gICAgICAgIGNvbnN0IGJhc2UgPSB0YXJnZXRVdWlkLnNwbGl0KCdAJylbMF07XHJcbiAgICAgICAgaWYgKGJhc2UgIT09IHRhcmdldFV1aWQpIHRhcmdldHMuYWRkKGJhc2UpO1xyXG5cclxuICAgICAgICBjb25zdCByZXN1bHQ6IGFueVtdID0gW107XHJcbiAgICAgICAgZm9yIChjb25zdCBhIG9mIGFzc2V0cyB8fCBbXSkge1xyXG4gICAgICAgICAgICBpZiAoIWEgfHwgYS5pc0RpcmVjdG9yeSkgY29udGludWU7XHJcbiAgICAgICAgICAgIGNvbnN0IHVybDogc3RyaW5nID0gYS51cmwgfHwgJyc7XHJcbiAgICAgICAgICAgIGlmICghdXJsKSBjb250aW51ZTtcclxuICAgICAgICAgICAgY29uc3QgcGF0aCA9IHRoaXMuX3VybFRvRGlzayh1cmwpO1xyXG4gICAgICAgICAgICBjb25zdCBleHQgPSAocGF0aC5zcGxpdCgnLicpLnBvcCgpIHx8ICcnKS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgICAgICBpZiAoYmluYXJ5RXh0cy5oYXMoZXh0KSkgY29udGludWU7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKHBhdGgsICd1dGYtOCcpO1xyXG4gICAgICAgICAgICAgICAgLy8g5ZG95Lit5Lu75LiAIHRhcmdldCDljbPorrDlvZVcclxuICAgICAgICAgICAgICAgIGxldCBoaXQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdCBvZiB0YXJnZXRzKSB7IGlmIChjb250ZW50LmluY2x1ZGVzKHQpKSB7IGhpdCA9IHRydWU7IGJyZWFrOyB9IH1cclxuICAgICAgICAgICAgICAgIGlmIChoaXQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaCh7IHV1aWQ6IGEudXVpZCwgdXJsOiBhLnVybCwgbmFtZTogYS5uYW1lLCB0eXBlOiBhLnR5cGUgfHwgYS5hc3NldFR5cGUgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggeyAvKiBza2lwICovIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGNvbXByZXNzVGV4dHVyZXMoZGlyZWN0b3J5OiBzdHJpbmcgPSAnZGI6Ly9hc3NldHMnLCBmb3JtYXQ6IHN0cmluZyA9ICdhdXRvJywgcXVhbGl0eTogbnVtYmVyID0gMC44KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgLy8gTm90ZTogVGV4dHVyZSBjb21wcmVzc2lvbiB3b3VsZCByZXF1aXJlIGltYWdlIHByb2Nlc3NpbmcgQVBJc1xyXG4gICAgICAgICAgICByZXNvbHZlKHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgZXJyb3I6ICdUZXh0dXJlIGNvbXByZXNzaW9uIHJlcXVpcmVzIGltYWdlIHByb2Nlc3NpbmcgY2FwYWJpbGl0aWVzIG5vdCBhdmFpbGFibGUgaW4gY3VycmVudCBDb2NvcyBDcmVhdG9yIE1DUCBpbXBsZW1lbnRhdGlvbi4gVXNlIHRoZSBFZGl0b3JcXCdzIGJ1aWx0LWluIHRleHR1cmUgY29tcHJlc3Npb24gc2V0dGluZ3Mgb3IgZXh0ZXJuYWwgdG9vbHMuJ1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGV4cG9ydEFzc2V0TWFuaWZlc3QoZGlyZWN0b3J5OiBzdHJpbmcgPSAnZGI6Ly9hc3NldHMnLCBmb3JtYXQ6IHN0cmluZyA9ICdqc29uJywgaW5jbHVkZU1ldGFkYXRhOiBib29sZWFuID0gdHJ1ZSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGFzeW5jIChyZXNvbHZlKSA9PiB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBhc3NldHMgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldHMnLCB7IHBhdHRlcm46IGAke2RpcmVjdG9yeX0vKiovKmAgfSk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGNvbnN0IG1hbmlmZXN0OiBhbnlbXSA9IFtdO1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYXNzZXQgb2YgYXNzZXRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWFuaWZlc3RFbnRyeTogYW55ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBhc3NldC5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IGFzc2V0LnVybCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogYXNzZXQudXVpZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogYXNzZXQudHlwZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZTogKGFzc2V0IGFzIGFueSkuc2l6ZSB8fCAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpc0RpcmVjdG9yeTogYXNzZXQuaXNEaXJlY3RvcnkgfHwgZmFsc2VcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5jbHVkZU1ldGFkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhc3NldEluZm8gPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgYXNzZXQudXJsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhc3NldEluZm8gJiYgYXNzZXRJbmZvLm1ldGEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdEVudHJ5Lm1ldGEgPSBhc3NldEluZm8ubWV0YTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTa2lwIG1ldGFkYXRhIGlmIG5vdCBhdmFpbGFibGVcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3QucHVzaChtYW5pZmVzdEVudHJ5KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgZXhwb3J0RGF0YTogc3RyaW5nO1xyXG4gICAgICAgICAgICAgICAgc3dpdGNoIChmb3JtYXQpIHtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlICdqc29uJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0RGF0YSA9IEpTT04uc3RyaW5naWZ5KG1hbmlmZXN0LCBudWxsLCAyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnY3N2JzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0RGF0YSA9IHRoaXMuY29udmVydFRvQ1NWKG1hbmlmZXN0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAneG1sJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0RGF0YSA9IHRoaXMuY29udmVydFRvWE1MKG1hbmlmZXN0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0RGF0YSA9IEpTT04uc3RyaW5naWZ5KG1hbmlmZXN0LCBudWxsLCAyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlyZWN0b3J5OiBkaXJlY3RvcnksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdDogZm9ybWF0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NldENvdW50OiBtYW5pZmVzdC5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1ZGVNZXRhZGF0YTogaW5jbHVkZU1ldGFkYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdDogZXhwb3J0RGF0YSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYEFzc2V0IG1hbmlmZXN0IGV4cG9ydGVkIHdpdGggJHttYW5pZmVzdC5sZW5ndGh9IGFzc2V0c2BcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjb252ZXJ0VG9DU1YoZGF0YTogYW55W10pOiBzdHJpbmcge1xyXG4gICAgICAgIGlmIChkYXRhLmxlbmd0aCA9PT0gMCkgcmV0dXJuICcnO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IGhlYWRlcnMgPSBPYmplY3Qua2V5cyhkYXRhWzBdKTtcclxuICAgICAgICBjb25zdCBjc3ZSb3dzID0gW2hlYWRlcnMuam9pbignLCcpXTtcclxuICAgICAgICBcclxuICAgICAgICBmb3IgKGNvbnN0IHJvdyBvZiBkYXRhKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlcyA9IGhlYWRlcnMubWFwKGhlYWRlciA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IHJvd1toZWFkZXJdO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgPyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkgOiBTdHJpbmcodmFsdWUpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgY3N2Um93cy5wdXNoKHZhbHVlcy5qb2luKCcsJykpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICByZXR1cm4gY3N2Um93cy5qb2luKCdcXG4nKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNvbnZlcnRUb1hNTChkYXRhOiBhbnlbXSk6IHN0cmluZyB7XHJcbiAgICAgICAgbGV0IHhtbCA9ICc8P3htbCB2ZXJzaW9uPVwiMS4wXCIgZW5jb2Rpbmc9XCJVVEYtOFwiPz5cXG48YXNzZXRzPlxcbic7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGRhdGEpIHtcclxuICAgICAgICAgICAgeG1sICs9ICcgIDxhc3NldD5cXG4nO1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhpdGVtKSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgeG1sVmFsdWUgPSB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnID8gXHJcbiAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkodmFsdWUpIDogXHJcbiAgICAgICAgICAgICAgICAgICAgU3RyaW5nKHZhbHVlKS5yZXBsYWNlKC8mL2csICcmYW1wOycpLnJlcGxhY2UoLzwvZywgJyZsdDsnKS5yZXBsYWNlKC8+L2csICcmZ3Q7Jyk7XHJcbiAgICAgICAgICAgICAgICB4bWwgKz0gYCAgICA8JHtrZXl9PiR7eG1sVmFsdWV9PC8ke2tleX0+XFxuYDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB4bWwgKz0gJyAgPC9hc3NldD5cXG4nO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICB4bWwgKz0gJzwvYXNzZXRzPic7XHJcbiAgICAgICAgcmV0dXJuIHhtbDtcclxuICAgIH1cclxufSJdfQ==