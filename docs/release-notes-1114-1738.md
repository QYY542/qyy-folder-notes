## QYY Folder Notes 0.1.2

- 增加中英文安装、使用、废纸篓、冲突与隐私说明，解释必要文件枚举的用途。
- 加入 package-lock.json、npm ci，以及 GitHub Actions 构建并证明来源后发布的流程。
- 移除 CSS 中的 !important 和 :has()；概览隐藏使用局限于已打开 Markdown 视图的标记类，关闭／卸载时清理。
- 下划线开关使用兼容的 inset box-shadow，避免 text-decoration 扩展属性；修复概览列表无单位的 padding 值。
- 根目录概览直接读取子项，不再为该操作枚举全库。保留发现父页、批量操作与可选索引所需的枚举行为。

English: Adds installation, usage and privacy documentation, locked CI builds, and attested release assets. Replaces relational CSS and forced priority with scoped styling and view-local overview markers. Root overviews now use direct children. Necessary local enumeration remains documented.

Attestations establish build provenance, not official approval or a security audit. Mobile hardware and actual cross-device cloud validation remain separate. Existing personal vaults are not migrated by this release.
