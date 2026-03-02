---
title: "Manual .profile-page / .profile-custom-css selector prefixes can break with new scoping"
severity: "impacting"
areas:
  - "Custom CSS"
  - "Audit"
status: "MyOshi behavior"
updated: "2026-02-27"
details:
  - "MyOshi now scopes selectors automatically. Themes that double-scope with .profile-page/.profile-custom-css may behave incorrectly."
workaround:
  - "Remove manual scoping prefixes and target elements inside your profile directly (e.g. .my-box, h2)."
  - "Re-run the Audit after simplifying selectors."
---
