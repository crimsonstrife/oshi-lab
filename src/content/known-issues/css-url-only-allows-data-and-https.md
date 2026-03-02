---
title: "CSS url() onl allows https: and data: protocols"
severity: "impacting"
areas:
  - "Custom CSS"
  - "Audit"
status: "MyOshi restriction"
updated: "2026-02-27"
details:
  - "Any protocol other than https: and data: is blocked (including percent-encoded evasion attempts)."
workaround:
  - "Host assets over https:// or embed small assets as data: URIs."
---
