---
title: "Preview may differ from live MyOshi profile behavior after platform sanitizer changes"
severity: "note"
areas:
  - "Audit"
  - "Preview"
status: "Expected behavior"
updated: "2026-02-27"
details:
  - "MyOshi sanitizes at display time (client-side) and may change behavior without requiring you to re-save. The Lab preview aims to match current behavior, but platform updates can temporarily cause differences until the Lab is updated."
workaround:
  - "If something looks off, run the Audit and check for rule warnings (fixed → absolute, z-index caps, import/url restrictions, protected selectors, etc.)."
  - "When in doubt, test on a real MyOshi profile after making minimal changes."
---
