---
title: "blur() is capped to 50px on MyOshi (filter and backdrop-filter)"
severity: "annoying"
areas:
  - "Custom CSS"
  - "Audit"
status: "MyOshi restriction"
updated: "2026-02-27"
details:
  - "Extremely large blur values can cause GPU issues; MyOshi caps blur() to 50px."
workaround:
  - "Reduce blur() to ≤ 50px."
  - "Consider layered translucent panels or gradients instead of huge blur radii."
---
