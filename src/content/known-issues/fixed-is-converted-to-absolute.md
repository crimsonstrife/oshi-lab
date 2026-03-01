---
title: "position: fixed is converted to position: absolute in Custom CSS on MyOshi"
severity: "impacting"
areas:
  - "Custom CSS"
  - "Audit"
status: "MyOshi behavior"
updated: "2026-02-27"
details:
  - "MyOshi converts position: fixed to absolute to prevent overlays that cover navigation."
workaround:
  - "Use position: absolute inside a relatively positioned container."
  - "Use position: sticky for in-container sticky effects."
---
