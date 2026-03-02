---
title: "z-index values are capped between -10000, 10000 on MyOshi"
severity: "annoying"
areas:
  - "Custom CSS"
  - "Audit"
status: "MyOshi restriction"
updated: "2026-02-27"
details:
  - "Very large z-index values are capped to prevent stacking abuse outside your profile container."
  - "MyOshi also applies isolation: isolate on your profile, so z-index cannot escape into site chrome."
workaround:
  - "Keep z-index values reasonable and within [-10000, 10000]."
---
