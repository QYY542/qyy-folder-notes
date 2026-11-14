# Full icon catalogue recovery / 完整图标库恢复

- Source `src/icon-picker-1115-0025.js`, build map `project-1115-0025.json`; run `npm ci && npm run build && npm test`.
- Optional dependency: Iconic 1.1.11. Reads its installed main.js once per path/version per helper lifetime; extracts the known static emoji array without eval or Function. Parser validates structure, handles JavaScript Unicode/byte escapes, and limits input size.
- Existing Obsidian getIconIds supplies Lucide ids. Common ids are reordered first and all ids deduplicated. No emoji dataset or images are redistributed or downloaded.
- Empty query: full catalogue. Nonempty query: original Iconic search. Pages render at most 24 items; respect Iconic's configured maximum, preserve original ids and native save callbacks.
- Optional existing host Twemoji renderer: only show emoji with a locally supported key while renderer is enabled and loaded. If absent, retain system emoji. The public release does not bundle private Twemoji components or settings.
- On unsupported upstream format, show an explicit fallback notice and common emoji; do not execute source or silently fetch a replacement dataset. Future AI must retest metadata interface before adapting the parser.
- Settings: iconPickerCompactEnabled, Chinese label 完整图标库与紧凑选择器. Disable restores original behavior. Unload restores wrappers/CSS and releases catalogue references.
- Tests cover full catalogue, mode filtering, duplicate ids, pagination, caching, unsupported-format fallback, stale async query protection and disabled/unload lifecycle on desktop/mobile browser fixtures. Physical phone validation remains pending.

中文：只复用本地数据，不要通过下载第二份大型图标包解决列表不全。图标不足应先检查元数据解析和模式开关；空白应检查当前渲染器对新表情的覆盖。修改本模块后重新构建，并复测前后翻页及保存的原始图标 ID。
