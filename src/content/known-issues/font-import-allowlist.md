---
title: "@import is restricted to whitelisted font hosts (non-font CSS imports will not work)"
severity: "impacting"
areas:
  - "Custom CSS"
  - "Audit"
status: "MyOshi restriction"
updated: "2026-02-27"
details:
  - "MyOshi only allows @import from specific font CDNs (Google Fonts, Bunny Fonts, Typekit, cdnjs). Other stylesheet imports are blocked."
  - "data: URIs inside @import are blocked as well."
workaround:
  - "Paste non-font CSS directly into Custom CSS (up to 50,000 characters)."
  - "For fonts, use an allowed host (Google/Bunny/Typekit/cdnjs)."
---
