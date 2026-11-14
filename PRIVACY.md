# 隐私与文件访问 / Privacy and file access

## 本地路径与正文

组件枚举库内文件／文件夹，用于识别已有父页、更新文件列表样式、路径建议和用户主动执行的批量创建、命名与存放位置变更。它可以看到全库路径；不要将目录排除设置理解为操作系统级访问隔离。

概览的「无需打开概览也自动更新链接」默认关闭，启用后枚举 Markdown 并检查概览标记，建立本地 IndexedDB 索引。目录根概览仅使用直接子项。读取正文用于概览、恢复、冲突与用户请求的改写；枚举不等于读取所有正文。库外文件无需访问。

Enumeration supports folder-note discovery, styling, path suggestions and user-requested bulk actions. The plugin can see vault paths. Optional background overview indexing checks Markdown overview markers and stores a local index; it is off by default. Reading content serves overview, recovery, conflict and requested editing features. No out-of-vault access is needed.

## 网络与同步

助手本身没有直接网络请求、遥测、广告或项目方服务器。同步辅助调用单独安装并授权的 QYY Baidu Sync，由它向用户的百度账号传输所选文件。此时废纸篓若参与同步，其中回收内容也会传输；是否加密取决于同步插件配置。

The helper itself makes no direct network transfers and has no telemetry or relay. Optional assistance calls a separately installed, authorized sync plugin. That plugin may upload selected vault data, including trash contents, to Baidu. Encryption is controlled by that plugin.

## 保存与删除

设置文件保存在插件目录；冲突事务与原件在库内私有备份目录。公开百度同步版排除插件目录及对应私有恢复目录，但不能阻止其他备份工具读取它们。废纸篓与自动清理分别默认关闭，恢复会保护同名文件；卸载不会自动清除已有笔记或云端数据。请保留独立备份，提交问题时不要附上私人笔记、配置和未经检查的日志。

Settings and recovery originals are stored locally in the vault. Other backup tools may copy them independently. Trash and cleanup are separate opt-ins. Uninstalling does not erase existing notes or remote data. Keep backups and do not publish private notes, settings or unreviewed logs.


## Paste data / 粘贴数据

The paste-repair module processes text/HTML supplied by a user paste event, or by Power Editor's explicitly invoked paste command. It does not poll or proactively read the system clipboard. It keeps only a bounded temporary in-memory conversion cache, does not log clipboard contents, and makes no network requests or vault scans. Disabling or unloading the helper removes its handlers, styles and runtime method wrappers.

Converted text is inserted into the note. Saving or syncing that note through separately configured services can transmit its contents. HTML image and link destinations remain part of the pasted Markdown; normal Obsidian rendering can load remote images. “Local conversion” does not mean pasted content can never leave the device.

粘贴修复只处理用户这次粘贴或明确执行粘贴命令所提供的数据，不主动读取或轮询系统剪贴板，不记录剪贴板内容，不发送网络请求，不扫描知识库。转换后的内容成为普通笔记；之后保存、同步笔记或显示远程图片时，其他已配置功能可能传输这些内容。关闭插件会还原适配方法和样式。


## Existing icon metadata / 本地图标元数据

The optional picker reads the installed Iconic plugin's `main.js` through the vault adapter to extract its static emoji name/id data array. It never evaluates that source, reads Iconic credentials/settings, scans notes, or makes a network request for this feature. Parsed names/ids are cached in memory and released when the helper unloads. Obsidian's existing icon registry supplies line icons. No downloaded image cache or duplicate catalogue file is written.

图标选择器只读取已安装 Iconic 的程序文件中的静态表情数据，不执行源码，不读取该插件设置或凭据，不扫描笔记，不下载图标包。名称和 ID 只缓存在内存，卸载时释放；复用已有图形资源。
