import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

export class AssetAdvancedTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
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

    async execute(toolName: string, args: any): Promise<ToolResponse> {
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

    private async saveAssetMeta(urlOrUUID: string, content: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'save-asset-meta', urlOrUUID, content).then((result: any) => {
                resolve({
                    success: true,
                    data: {
                        uuid: result?.uuid,
                        url: result?.url,
                        message: 'Asset meta saved successfully'
                    }
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async generateAvailableUrl(url: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'generate-available-url', url).then((availableUrl: string) => {
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
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async queryAssetDbReady(): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'query-ready').then((ready: boolean) => {
                resolve({
                    success: true,
                    data: {
                        ready: ready,
                        message: ready ? 'Asset database is ready' : 'Asset database is not ready'
                    }
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async openAssetExternal(urlOrUUID: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'open-asset', urlOrUUID).then(() => {
                resolve({
                    success: true,
                    message: 'Asset opened with external program'
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async batchImportAssets(args: any): Promise<ToolResponse> {
        return new Promise(async (resolve) => {
            try {
                const fs = require('fs');
                const path = require('path');
                
                if (!fs.existsSync(args.sourceDirectory)) {
                    resolve({ success: false, error: 'Source directory does not exist' });
                    return;
                }

                const files = this.getFilesFromDirectory(
                    args.sourceDirectory, 
                    args.fileFilter || [], 
                    args.recursive || false
                );

                const importResults: any[] = [];
                let successCount = 0;
                let errorCount = 0;

                for (const filePath of files) {
                    try {
                        const fileName = path.basename(filePath);
                        const targetPath = `${args.targetDirectory}/${fileName}`;
                        
                        const result = await Editor.Message.request('asset-db', 'import-asset', 
                            filePath, targetPath, { 
                                overwrite: args.overwrite || false,
                                rename: !(args.overwrite || false)
                            });
                        
                        importResults.push({
                            source: filePath,
                            target: targetPath,
                            success: true,
                            uuid: result?.uuid
                        });
                        successCount++;
                    } catch (err: any) {
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
            } catch (err: any) {
                resolve({ success: false, error: err.message });
            }
        });
    }

    private getFilesFromDirectory(dirPath: string, fileFilter: string[], recursive: boolean): string[] {
        const fs = require('fs');
        const path = require('path');
        const files: string[] = [];

        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isFile()) {
                if (fileFilter.length === 0 || fileFilter.some(ext => item.toLowerCase().endsWith(ext.toLowerCase()))) {
                    files.push(fullPath);
                }
            } else if (stat.isDirectory() && recursive) {
                files.push(...this.getFilesFromDirectory(fullPath, fileFilter, recursive));
            }
        }
        
        return files;
    }

    private async batchDeleteAssets(urls: string[]): Promise<ToolResponse> {
        return new Promise(async (resolve) => {
            try {
                const deleteResults: any[] = [];
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
                    } catch (err: any) {
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
            } catch (err: any) {
                resolve({ success: false, error: err.message });
            }
        });
    }

    private async validateAssetReferences(directory: string = 'db://assets'): Promise<ToolResponse> {
        return new Promise(async (resolve) => {
            try {
                // Get all assets in directory
                const assets = await Editor.Message.request('asset-db', 'query-assets', { pattern: `${directory}/**/*` });
                
                const brokenReferences: any[] = [];
                const validReferences: any[] = [];

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
                    } catch (err) {
                        brokenReferences.push({
                            url: asset.url,
                            uuid: asset.uuid,
                            name: asset.name,
                            error: (err as Error).message
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
            } catch (err: any) {
                resolve({ success: false, error: err.message });
            }
        });
    }

    private async getAssetDependencies(urlOrUUID: string, direction: string = 'dependencies'): Promise<ToolResponse> {
        return new Promise(async (resolve) => {
            try {
                // 1. 解析 url/uuid → asset info (含磁盘路径)
                const targetInfo = await this._resolveAssetInfo(urlOrUUID);
                if (!targetInfo) {
                    resolve({ success: false, error: `Asset not found: ${urlOrUUID}` });
                    return;
                }
                const targetUuid: string = targetInfo.uuid;
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
                } else if (direction === 'referenced-by' || direction === 'reverse' || direction === 'refs') {
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
                } else {
                    resolve({ success: false, error: `direction 必须是 'dependencies' 或 'referenced-by', 收到: ${direction}` });
                }
            } catch (err: any) {
                resolve({ success: false, error: err.message });
            }
        });
    }

    private async getUnusedAssets(directory: string = 'db://assets', excludeDirectories: string[] = []): Promise<ToolResponse> {
        return new Promise(async (resolve) => {
            try {
                const assets = await Editor.Message.request('asset-db', 'query-assets', { pattern: `${directory}/**/*` });
                if (!assets || !Array.isArray(assets)) {
                    resolve({ success: false, error: 'query-assets 返回空' });
                    return;
                }
                const fs = require('fs');
                // 二进制后缀: 无法文本解析, 但其引用由其他文本资源承载, 故仍可被标"used"
                const binaryExts = new Set(['png','jpg','jpeg','webp','tga','pvr','astc','ktx','mp3','wav','ogg','ttf','otf','woff','woff2','bin','fbx','gltf','glb','usdz','exr','hdr','babylon','material']);
                // 入口点后缀: 视为用户直接消费, 不报 unused (代码/配置/场景为运行入口)
                const entryExts = new Set(['scene','ts','js','cjs','mjs','json','txt','md','csv','xml','yaml','yml','effect','chunk','glsl','vs','fs']);
                const metaExts = new Set(['meta']);

                // 第一遍: 收集所有非目录、非 meta、未被 exclude 排除的资源
                const all = new Map<string, any>(); // uuid -> asset
                for (const a of assets) {
                    if (!a || a.isDirectory) continue;
                    const url: string = a.url || '';
                    if (metaExts.has((url.split('.').pop() || '').toLowerCase())) continue;
                    if (excludeDirectories && excludeDirectories.some((ex: string) => url.startsWith(ex))) continue;
                    all.set(a.uuid, a);
                }

                // 第二遍: 解析文本资源, 累积被引用的 uuid 集
                const referenced = new Set<string>();
                const uuidRe = /"__uuid__"\s*:\s*"([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(?:@[0-9a-fA-F]+)?)"/g;
                for (const a of all.values()) {
                    const url: string = a.url || '';
                    if (!url) continue;
                    const path = this._urlToDisk(url);
                    const ext = (path.split('.').pop() || '').toLowerCase();
                    if (binaryExts.has(ext)) continue; // 二进制不解析
                    try {
                        const content = fs.readFileSync(path, 'utf-8');
                        let m: RegExpExecArray | null;
                        uuidRe.lastIndex = 0;
                        while ((m = uuidRe.exec(content)) !== null) {
                            referenced.add(m[1]);
                            // 也记录去 suffix 的父 uuid (引用 spriteFrame 时父 texture 算被用)
                            const base = m[1].split('@')[0];
                            if (base !== m[1]) referenced.add(base);
                        }
                    } catch { /* 二进制/无权限, 跳过 */ }
                }

                // 第三遍: 差集 = 未被引用 且 非入口点
                const unused: any[] = [];
                for (const a of all.values()) {
                    if (referenced.has(a.uuid)) continue;
                    const ext = (a.url?.split('.').pop() || '').toLowerCase();
                    if (ext && entryExts.has(ext)) continue;
                    unused.push({ uuid: a.uuid, url: a.url, name: a.name, type: a.type || (a as any).assetType });
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
            } catch (err: any) {
                resolve({ success: false, error: err.message });
            }
        });
    }

    /** 解析 url 或 uuid 为 asset info (含磁盘 path) */
    private async _resolveAssetInfo(urlOrUUID: string): Promise<any> {
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
        } catch { return null; }
    }

    /** db:// url 转磁盘绝对路径 (db://assets/foo -> <projectPath>/assets/foo) */
    private _urlToDisk(url: string): string {
        if (!url || !url.startsWith('db://')) return url || '';
        const proj = Editor.Project.path;
        return require('path').join(proj, url.replace(/^db:\/\/+/, ''));
    }

    /** 提取单个资源的前向依赖(读源文件文本正则 __uuid__) */
    private async _extractAssetDeps(assetInfo: any): Promise<{ resolved: any[]; missing: any[]; skippedBinary: boolean }> {
        const fs = require('fs');
        const path: string = assetInfo.path;
        const ext = (path?.split('.').pop() || '').toLowerCase();
        const binaryExts = new Set(['png','jpg','jpeg','webp','tga','pvr','astc','ktx','mp3','wav','ogg','ttf','otf','woff','woff2','bin','fbx','gltf','glb','exr','hdr']);
        if (!path || binaryExts.has(ext)) {
            return { resolved: [], missing: [], skippedBinary: true };
        }
        let content: string;
        try { content = fs.readFileSync(path, 'utf-8'); }
        catch { return { resolved: [], missing: [], skippedBinary: true }; }

        const uuidRe = /"__uuid__"\s*:\s*"([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(?:@[0-9a-fA-F]+)?)"/g;
        const seen = new Set<string>();
        let m: RegExpExecArray | null;
        while ((m = uuidRe.exec(content)) !== null) { seen.add(m[1]); }

        const resolved: any[] = [];
        const missing: any[] = [];
        for (const uuid of seen) {
            try {
                const info = await Editor.Message.request('asset-db', 'query-asset-info', uuid);
                if (info && info.uuid) {
                    resolved.push({ uuid, url: info.url, name: info.name, type: info.type || info.assetType });
                } else {
                    missing.push({ uuid });
                }
            } catch {
                missing.push({ uuid });
            }
        }
        return { resolved, missing, skippedBinary: false };
    }

    /** 反向: 扫 directory 下文本文件, 找引用了 targetUuid 的资源 */
    private async _findReferencingAssets(targetUuid: string, directory: string): Promise<any[]> {
        const assets = await Editor.Message.request('asset-db', 'query-assets', { pattern: `${directory}/**/*` });
        const fs = require('fs');
        const binaryExts = new Set(['png','jpg','jpeg','webp','tga','pvr','astc','ktx','mp3','wav','ogg','ttf','otf','woff','woff2','bin','fbx','gltf','glb','exr','hdr']);
        // cocos __uuid__ 引用可能是完整 uuid 或压缩 uuid; 同时匹配 targetUuid 及其可能的 @subAsset 父
        const targets = new Set<string>([targetUuid]);
        const base = targetUuid.split('@')[0];
        if (base !== targetUuid) targets.add(base);

        const result: any[] = [];
        for (const a of assets || []) {
            if (!a || a.isDirectory) continue;
            const url: string = a.url || '';
            if (!url) continue;
            const path = this._urlToDisk(url);
            const ext = (path.split('.').pop() || '').toLowerCase();
            if (binaryExts.has(ext)) continue;
            try {
                const content = fs.readFileSync(path, 'utf-8');
                // 命中任一 target 即记录
                let hit = false;
                for (const t of targets) { if (content.includes(t)) { hit = true; break; } }
                if (hit) {
                    result.push({ uuid: a.uuid, url: a.url, name: a.name, type: a.type || a.assetType });
                }
            } catch { /* skip */ }
        }
        return result;
    }

    private async compressTextures(directory: string = 'db://assets', format: string = 'auto', quality: number = 0.8): Promise<ToolResponse> {
        return new Promise((resolve) => {
            // Note: Texture compression would require image processing APIs
            resolve({
                success: false,
                error: 'Texture compression requires image processing capabilities not available in current Cocos Creator MCP implementation. Use the Editor\'s built-in texture compression settings or external tools.'
            });
        });
    }

    private async exportAssetManifest(directory: string = 'db://assets', format: string = 'json', includeMetadata: boolean = true): Promise<ToolResponse> {
        return new Promise(async (resolve) => {
            try {
                const assets = await Editor.Message.request('asset-db', 'query-assets', { pattern: `${directory}/**/*` });
                
                const manifest: any[] = [];

                for (const asset of assets) {
                    const manifestEntry: any = {
                        name: asset.name,
                        url: asset.url,
                        uuid: asset.uuid,
                        type: asset.type,
                        size: (asset as any).size || 0,
                        isDirectory: asset.isDirectory || false
                    };

                    if (includeMetadata) {
                        try {
                            const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', asset.url);
                            if (assetInfo && assetInfo.meta) {
                                manifestEntry.meta = assetInfo.meta;
                            }
                        } catch (err) {
                            // Skip metadata if not available
                        }
                    }

                    manifest.push(manifestEntry);
                }

                let exportData: string;
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
            } catch (err: any) {
                resolve({ success: false, error: err.message });
            }
        });
    }

    private convertToCSV(data: any[]): string {
        if (data.length === 0) return '';
        
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

    private convertToXML(data: any[]): string {
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