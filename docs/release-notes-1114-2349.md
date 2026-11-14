Paste-only math and Markdown repair is now included in QYY Folder Notes.

- Recover LaTeX from supported KaTeX/MathJax clipboard HTML, and convert complete LaTeX delimiters into Markdown math. Preserve formula line breaks and use inline formulas in table cells.
- Fix strong-emphasis whitespace and punctuation boundaries, and avoid converting Markdown clipboard text twice. Preserve rich-text images, links and tables.
- Keep fenced/inline code and existing standard math unchanged. Existing notes are not scanned or rewritten.
- Stabilize table editing line height and quote indentation with Power Editor. Both new features have independent switches and clean up when disabled or unloaded. Power Editor is optional; its files and settings are not modified.

新增粘贴时公式和 Markdown 修复，处理重复转义、加粗空格和中文标点边界；保留图片、链接和表格。修复 Power Editor 下表格点击后行距变大、引用符号与缩进跳动。仅处理本次粘贴，不改写已有笔记，代码和标准公式受保护。

Desktop and mobile browser behavior, module loading, code preservation, settings and unload cleanup are tested. Android/iOS hardware testing remains pending. Missing LaTeX source cannot be reconstructed from formula images or visual glyphs alone. Original local testing exercised Obsidian's editor-paste event; automated system-clipboard delivery was not verified.

Update main.js, manifest.json and styles.css together; preserve data.json and folder-settings.json. Re-enable the plugin or restart Obsidian after updating on each device. QYY Baidu Sync does not need an update for these editing fixes. Release assets are built and attested by GitHub Actions.

Optional Iconic integration now uses a compact result area, an explicit no-results hint, and 44-pixel minimum touch targets on mobile. This public release does not bundle Twemoji graphics; emoji rendering follows the installed renderer or system font.
