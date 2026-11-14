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
