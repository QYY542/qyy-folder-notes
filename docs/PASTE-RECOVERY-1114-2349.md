# Paste repair: recovery and maintenance

Install the three release assets for QYY Folder Notes 0.1.5 or newer. Preserve existing data.json and folder-settings.json. Reload the plugin after replacement on each device. The plugin does not install Power Editor or update any plugin automatically.

The settings “粘贴时修复公式与 Markdown” and “稳定表格与引用的编辑显示” default to on, under the master helper switch. They are stored as preferences.pasteRepairEnabled and preferences.stableEditingEnabled. Turning them off restores the previous paste/presentation behavior. Existing note content is never migrated or rewritten by this feature.

Power Editor 1.62.3 was the integration target. The adapter wraps pastedMarkdown and plannedPaste at runtime, retains original methods and restores them on unload. It uses the editor-paste event when Power Editor is absent. Do not modify Power Editor's distributed JavaScript, CSS or localization to maintain these fixes. Recheck these method signatures after upstream updates.

Source: src/paste-repair-1114-2349.js. The project-1114-2349.json build appends this source after the helper's original modules. Run npm ci, npm run build, npm test, and the version verification script. Tests include a real headless browser, desktop/mobile layout states, pasted code protection, and unloading. The two scoped !important declarations are necessary to override CodeMirror's inline hanging indents; do not make them global or hide quote markers in source mode.

The repair reads only data already supplied by a paste event or by Power Editor's user-invoked paste command. There is no clipboard polling, network transport or vault enumeration in this module. Normalized content can later be saved and synchronized as part of the note by separately configured tools.

Unmatched delimiters, unknown formula images and missing LaTeX are retained rather than guessed. Code and existing math are protected. Very large clipboard payloads are not normalized by the text repair. Keep a source-mode escape hatch for inspecting literals. Mobile simulation is not physical-phone verification.

中文：升级后在每台设备重载插件；两个新开关默认打开，可单独关闭。仅修复本次粘贴，不扫描旧笔记，不复制私人目录或账号设置。既有错误请从原来源重新复制后粘贴。未来维护请修改上述源文件并重新构建，保留代码保护、卸载还原和手机浏览器测试；不要直接修改 Power Editor。
