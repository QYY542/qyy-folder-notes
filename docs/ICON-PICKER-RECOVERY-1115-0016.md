# Icon picker recovery / 图标选择器恢复

- Source: `src/icon-picker-1115-0016.js`, included through `project-1115-0016.json`. Build with `npm ci && npm run build`; run `npm test`.
- Optional dependency: Iconic 1.1.11. Public package contains no private vault configuration, credentials or Twemoji assets.
- Setting: `iconPickerCompactEnabled`, default true. 中文开关：常用图标与紧凑选择器。
- Empty search supplies 24 emoji / 12 line icons through native result callbacks. Text queries use native fuzzy search; no clipboard reads or file scans are added.
- Wrapper is restricted to Iconic picker components. Closing the modal releases references; disabling restores native results; unloading restores the original methods and CSS.
- Future AI: verify Iconic SearchComponent `dispatchResults`, `setModes`, `searchCallback` contracts after upstream updates. Preserve original ids, mode filtering, input text, selection callbacks and mobile touch behavior. Do not patch Iconic files or rewrite notes.
- Validation: browser tests cover desktop/mobile defaults, search, native ids, mode changes, toggle/unload cleanup; actual desktop dialog verified 36 visible candidates. Physical phone validation remains pending.

- Pagination: native search callbacks are wrapped per picker and restored on unload. Cache only current matches; never scan vault files. Clamp pages, keep original icon ids, respect Iconic's maximum-results setting, and reset when the query/modes change. Native selection callbacks still perform saves.
- 中文恢复：每页最多 24 项，翻页不改搜索文字或图标映射；关闭选项移除分页栏。桌面实测空搜索前后翻页、702 条搜索匹配的下一页无空白；手机浏览器模拟通过，未做真实手机测试。
