# QYY Folder Notes

把文件夹变成可打开的笔记入口：创建空白父页，设置点击行为，整理同步冲突，并提供可同步的库内废纸篓。

Open folders as notes, automatically create blank folder notes, preserve conflicting versions, and manage an optional vault-local trash folder. The interface is currently in Chinese. See the [English guide](#english-guide) for installation, usage and privacy.

## 安装 / Installation

需要 Obsidian 1.15.0 或更新版本。先备份知识库，并在独立测试库验证。本插件已内置文件夹组件，**请手动停用原 Folder notes 或旧版文件夹笔记助手**，避免同时接管同一文件夹；插件不会替你删除或停用它们。

### 从 GitHub 安装

1. 从 [最新 Release](https://github.com/QYY542/qyy-folder-notes/releases/latest) 的 **Assets** 下载 `main.js`、`manifest.json`、`styles.css`。
2. 将三个文件放入 `<知识库>/.obsidian/plugins/qyy-folder-notes/`。如果修改过 Obsidian 配置目录，以实际目录为准。自动生成的源码压缩包不是安装包。
3. 重新加载 Obsidian，在「设置 → 第三方插件」中允许第三方插件并启用 **QYY Folder Notes**。
4. 更新时先停用插件并备份设置，再替换这三个程序文件、重新启用；保留本机 `data.json` 和 `folder-settings.json`。

手机不方便管理插件目录时，可在已独立安装的 BRAT 中添加 `QYY542/qyy-folder-notes`，选择发布版本。本项目不安装或更新自己及其他插件。iOS / Android 真机验证仍待完成。

### 从社区目录安装

打开 [社区页面](https://community.obsidian.md/plugins/qyy-folder-notes)，确认安装入口已启用后，在 Obsidian「第三方插件 → 浏览」中搜索 **QYY Folder Notes**。页面公开、旧版审核完成与新版可安装是不同状态；以目录显示的版本及审核结果为准。

## 基本使用 / Usage

1. 打开「设置 → QYY Folder Notes」，保持「启用助手」「启用文件夹操作」打开。
2. 默认打开「新建文件夹时创建父页」。新建文件夹「测试」，插件创建空白的「测试/测试.md」。已有正文不会被清空；不要设置模板即可保持新笔记空白。附件目录默认不自动创建父页。
3. 点击文件夹名称打开父页。通过「展开目录的方式」选择单击、双击或只用箭头展开；箭头仍可直接展开／收起。手机使用点按／连续双点。
4. 「显示文件夹下划线」默认关闭，可以单独开启。设置页的「文件夹笔记完整设置」提供命名、路径、概览与排除规则。
5. 需要给已有目录补建父页时，在完整设置里使用批量创建功能并先备份；它会遍历库内目录，跳过已有父页和排除项。不会自动给每个普通笔记添加正文。

### 可同步废纸篓

默认关闭。首次启用前选择一个尚不存在的库内目录，默认 `QYY废纸篓`；多设备使用相同路径。已建立的废纸篓不能直接改路径，需要先处理历史记录迁移。

启用后可在文件菜单选择「移入同步废纸篓」，或使用被助手接管的 Obsidian 删除流程。运行「打开同步废纸篓」查看和恢复；同名文件存在时保留副本，不直接覆盖。自动清理默认关闭，开启后只有成功完成全量核对的同步轮次才清理达到 30 天且校验完整的回收项目；并非每天固定时刻或离线也强制清理。

废纸篓是普通库内文件夹，是否跨设备同步取决于你配置的同步工具。回收项目也会占用本地和云端空间，保留独立备份。

### 保存并同步与冲突

基础文件夹和本地废纸篓功能不需要百度账号。需要百度同步时，另外安装并授权 [QYY Baidu Sync](https://github.com/QYY542/qyy-baidu-sync)。助手的「保存并同步百度网盘」命令先保存再调用该插件；等待预算可选 5 / 10 / 15 秒，手机恢复前台同步可关闭。

双边修改发生冲突时，较新且时间可信的版本作为文件夹主笔记，旧版作为子笔记。时间不可信或无法可靠区分时，运行「处理待确认的同步冲突」选择主版本；先保护双方原始内容，再执行后续操作。

```text
研究笔记/
  研究笔记.md
  旧版-日期-摘要.md
```

已有文件夹笔记不会重复套文件夹。目标被占用时不会覆盖。附件链接会随位置调整，但不提供图片二进制合并。手机后台挂起或系统退出可能打断网络，15 秒不是全部文件上传完成的保证。

## 文件访问、网络与隐私

助手的文件夹功能在本地运行，不直接上传路径、正文或遥测，没有项目中转服务器。启用同步辅助会调用你单独安装、授权的 QYY Baidu Sync，后者将选中同步的库内数据传给百度网盘。

**为什么需要枚举文件？** 内置组件需要识别已有文件夹笔记、提供文件／路径建议、更新目录显示，以及执行用户选择的批量创建、改名或移动。可选的「无需打开概览也自动更新链接」会枚举 Markdown 文件并检查概览标记，建立本地索引；该选项默认关闭。根目录概览使用目录的直接子项，不为这一步扫描整个知识库。

枚举意味着插件能看到库内路径；不代表所有正文都会被读取，也不代表路径被上传。真正读取内容用于已打开概览、恢复、冲突和用户请求的修改等功能。插件不需要访问库外文件；关闭可选索引或同步功能不改变 Obsidian 社区插件本身的权限模型。

助手偏好保存在本机插件目录，冲突事务和原件放在库内私有恢复目录。同步废纸篓参与同步时，其中的回收内容也会上传。详见 [PRIVACY.md](PRIVACY.md)。提交问题前移除私人笔记、路径、日志和其他插件凭据。

## English guide

### Installation and basic usage

1. Requires Obsidian 1.15.0+. Back up the vault and start in a separate test vault. Disable the original Folder notes plugin and the older personal helper manually before enabling this integrated plugin.
2. Download `main.js`, `manifest.json` and `styles.css` from the [latest release](https://github.com/QYY542/qyy-folder-notes/releases/latest). Put them in `<vault>/.obsidian/plugins/qyy-folder-notes/`, reload Obsidian, and enable **QYY Folder Notes** under Community plugins. Use your actual configuration folder if customized. An independently installed BRAT can install this repository on mobile.
3. Open the plugin settings. With automatic folder-note creation enabled, creating `Example` creates a blank `Example/Example.md`. Existing note content is retained. Keep template settings empty if you want blank notes.
4. Click a folder name to open its note; choose single-click, double-click or arrow-only expansion. Folder underlining is off by default. Advanced settings include exclusions, naming and folder overviews.
5. Trash is optional and off by default. Choose a new vault-relative trash location before enabling it; use the same location across devices. Use the file menu to move a note to trash, then the trash command to restore it. Automatic 30-day cleanup is separately opt-in and requires a successful full synchronization check.
6. Sync assistance requires the separately installed and authorized QYY Baidu Sync. Use the Save and Sync command before switching devices. Folder conflict handling preserves the older version and asks for a choice when version timing is uncertain.
7. To update manually, disable the plugin, back up settings, replace only the three release files, and re-enable it. Keep `data.json` and `folder-settings.json`. The plugin does not install or update other plugins.

### Privacy and compatibility

File and folder enumeration supports folder-note discovery, path suggestions, explorer styling and explicitly requested bulk operations. Optional background overview indexing enumerates Markdown files and checks overview markers; it is off by default. Root overviews use direct children rather than enumerating the whole vault for that query. File enumeration exposes local paths to the plugin, not necessarily note contents, and does not itself upload data.

There is no direct network transfer or telemetry in the helper. Optional sync assistance invokes your separately authorized Baidu sync plugin; selected vault data, including any synced trash, may then reach your Baidu account. Settings and private recovery copies remain in the vault. No out-of-vault access is required. Keep independent backups.

Mobile module and logic tests do not replace iOS / Android device testing, which remains outstanding. Mobile suspension and app exit can interrupt transfers. The wait budget is not a promise that any amount of data finishes uploading within 15 seconds.

## 构建与来源验证 / Build and provenance

发布环境使用 Node.js 24.13.0、npm 11.6.2。无外部 npm 构建依赖，锁文件记录实际依赖树，运行时 API 由 Obsidian 提供。执行测试还需要 Chrome / Chromium；GitHub 托管 runner 使用其预装浏览器，本机可通过 `CHROME_BIN` 指定路径。

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm test
```

`project-1114-1738.json` 声明源码和文档源稿。GitHub Actions 对提交构建和测试，版本 tag 验证通过后生成三个安装文件的 Artifact Attestations，再发布同一批文件。下载附件后验证 / Verify downloaded artifacts:

```sh
gh attestation verify main.js --repo QYY542/qyy-folder-notes
gh attestation verify styles.css --repo QYY542/qyy-folder-notes
gh attestation verify manifest.json --repo QYY542/qyy-folder-notes
```

证明说明构建来源，不代表官方审核或安全审计通过；旧版不会自动得到证明。

## 来源与许可证 / Attribution and license

维护者 QYY。内置 Folder notes 来源于 Lost Paul / LostPaul，保留 GNU AGPL v3 许可及原作者贡献；其他嵌入组件见 [THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES)。当前维护可读的上游发行 JavaScript 衍生快照与新增模块，不是从零原创。源码来源见 `source-provenance-1113-1100.json`。

Maintained by QYY, derived from Lost Paul's Folder notes under the included AGPL license. Upstream credit is retained. See [LICENSE](LICENSE) and [THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES). Community fork permission, review and actual device validation are tracked separately in [RELEASE-CHECKLIST.md](RELEASE-CHECKLIST.md).

## Quiet automatic sync / 自动同步静默

Automatic startup, periodic, edit-triggered and mobile foreground sync do not show popup notifications. Failures and pending work remain recorded; check the sync log and use a manual sync before switching devices. Manual sync keeps its notifications. Update both QYY Baidu Sync (1.3.3+) and QYY Folder Notes (0.1.3+) when using them together.

启动、定时、保存后及手机返回前台的自动同步不弹窗。失败、待同步和冲突记录仍保留；切换设备前可查看同步日志并手动确认同步成功。手动同步继续显示提示。搭配使用时请同时更新百度同步至 1.3.3 或以上、文件夹助手至 0.1.3 或以上。

The public mobile-compatible helper supports Save and sync, but does not intercept application exit. Mobile operating systems may suspend background work; unfinished work resumes on a later sync. Mobile module loading and lifecycle behavior are tested with mocks; this release has not been tested on a physical phone.

公开助手支持“保存并同步”，不拦截退出。手机系统可能暂停后台运行，未完成任务留待后续同步重试。本次验证包含手机模块加载与生命周期模拟，尚未进行手机实机测试。
