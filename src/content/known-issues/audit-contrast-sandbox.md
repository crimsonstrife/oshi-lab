---
title: "Contrast checks may be unavailable depending on preview iframe sandboxing"
severity: "annoying"
areas:
  - "Audit"
  - "Preview"
status: "Known limitation"
updated: "2026-02-27"
details:
  - "The optional contrast audit uses computed styles from the live preview. If the preview iframe is sandboxed without same-origin access, the app cannot read computed styles, so contrast checks may be skipped."
workaround:
  - "Run the audit without contrast checks enabled."
  - "If you control the preview iframe attributes, allow same-origin access (but keep scripts disabled)."
snippet: |
  <iframe id=\"previewFrame\" sandbox=\"allow-same-origin\" ...></iframe>
---
