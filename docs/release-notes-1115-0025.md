## Changes

- Browse the full existing Iconic emoji catalogue and Obsidian Lucide icons when search is empty, with common choices first and no duplicate ids.
- Reuse installed metadata and icon resources: no additional image download or duplicate catalogue file. Parse static data without executing plugin source; cache only names/ids in memory.
- Keep pagination and native search/save behavior. If an existing QYY Twemoji renderer is active, omit unsupported local emoji to avoid blank glyphs. This public release does not bundle Twemoji.
- Safely fall back with a visible notice if a future Iconic metadata format is unsupported.

## 中文说明

不再只显示少量常用图标：可翻页浏览现有完整目录。实测原始目录 1932 个表情＋1935 个线条图标；已有 Twemoji 17 图形包覆盖 1923 个表情，对应显示 3858 项。复用本地资源，无新图片包下载。

## Validation

275 automated checks pass, including 92 desktop/mobile picker checks. Desktop shows 3858 available choices over 161 pages with the existing Twemoji renderer; page-two images decode correctly. No physical phone test was performed. Release assets are reproducibly built with GitHub artifact attestations.
