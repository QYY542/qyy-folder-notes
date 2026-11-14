## Changes

- Fix the mostly blank Iconic picker when the search field is empty: offer 24 common emoji and 12 line icons, filtered by the enabled modes.
- Keep typed searches, selection, colors and saving in Iconic; shrink sparse results and preserve 44 px mobile touch targets.
- Include the 0.1.5 paste-only math/Markdown repairs and stable table/quote editing.
- Add reversible lifecycle tests and recovery instructions. Iconic is optional; this package does not bundle Twemoji.

## 中文说明

搜索为空时不再只显示当前图标，常用表情与线条图标可直接选择。保留原生搜索与保存；关闭助手开关即可还原。包含上一版的公式粘贴、表格与引用修复，不批量修改已有笔记。

## Verification

Desktop/mobile browser checks and reproducible build verification pass; the actual desktop picker displays all 36 candidates. No physical phone test was performed. Installation assets are built by GitHub Actions and have artifact attestations.
