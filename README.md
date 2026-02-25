# Oshi-Lab (MyOshi Theme Lab)

A browser-based sandbox for authoring **MyOshi Custom CSS** and **Custom HTML** safely; with realistic demo templates, a sandboxed preview, snapshots, and clean export of *only* the content you paste into MyOshi.

**Live:** https://oshi-lab.app  
**Repo:** https://github.com/crimsonstrife/oshi-lab

---

## Overview

MyOshi Theme Lab makes it easy to iterate on profile themes without constantly round-tripping between tools:

- Start from a **demo profile template** so you can style immediately.
- Preview changes in a **sandboxed iframe** (scripts blocked).
- Export **only** your **Custom CSS** + **Custom HTML** (not the entire page).
- Save **Snapshots** locally in your browser (LocalStorage) so you can come back later.

> MyOshi is currently private, so this tool does **not** fetch live profiles.  
> Instead, it ships with maintainable templates + documentation.

---

## Core concepts

The editor is intentionally split into three pieces:

1. **Base Template**  
   A demo profile shell that resembles MyOshi’s structure and baseline styling.  
   Templates include a `.profile-custom-html` mount point where Custom HTML is injected.

2. **Custom CSS**  
   Appended after the base template CSS so it can override defaults.  
   Recommended pattern: keep your theme scoped and variable-driven:

   ```css
   .profile-page.profile-custom-css {
     --theme-bg: #0b0f17;
     --theme-panel: rgba(18, 24, 36, 0.85);
     --theme-border: rgba(40, 60, 90, 0.55);
     --theme-text: #e7eefc;
     --theme-muted: rgba(231, 238, 252, 0.75);
     --theme-accent: #6df;
   }
   ```

3. **Custom HTML**  
   Inserted into the first `.profile-custom-html` element found in the base template.  
   Use it for layout wrappers, badges, custom headers, etc.  
   Avoid anything that requires JavaScript (scripts are blocked in preview).

---

## Features

- **Sandboxed Preview** rendered in an `<iframe>` with restrictive sandboxing (no scripts execute).
- **Embedded preview** and **Pop-out preview** (useful for a second monitor / full-height inspection).  
  Note: pop-out preview does **not** auto-update; reopen it to refresh.
- **Preview scaling** (zoom) and responsive testing.
- **Snapshots** saved in your browser (LocalStorage): stores Custom CSS, Custom HTML, and editor toggles.  
  Intentionally does *not* store full templates / huge imports.
- **Export tools**: copy **Custom CSS** and **Custom HTML** only — never includes base template content.

---

## Quickstart

### Requirements

- Node.js 18+
- npm

### Install

```bash
npm ci
```

### Run locally

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

> After `npm run build`, the project runs a post-build search indexing step:  
> `pagefind --site dist`

---

## Import your real MyOshi preview HTML (best accuracy)

If you want your preview to match your real profile as closely as possible:

1. Open MyOshi → **Edit Profile** → **Preview Profile**
2. Right-click the preview → **Inspect**
3. In DevTools, find the preview `<iframe title="Profile Preview">`
4. **Edit as HTML**, copy the entire iframe HTML
5. Paste into the Lab’s **Template** field, then click **Extract Base**

Notes:

- If you paste the full iframe HTML, the Lab can usually extract existing **CSS** and **Custom HTML** automatically.
- Always back up your existing MyOshi Custom CSS/HTML before overwriting.

---

## Templates

Templates exist to give your CSS/HTML something realistic to target even when MyOshi profiles can’t be fetched.

Templates are stored as a single registry file:

- `ui/lab/data/templates.json`

Example format:

```json
{
  "templates": [
    {
      "id": "demo-default",
      "name": "Demo: Default-ish MyOshi Shell",
      "css": "",
      "body": ""
    }
  ]
}
```

---

## Environment variables

### `PUBLIC_APP_VERSION`

This is a build-time value (baked into the Astro build) used for displaying a version string in the UI/footer.

If you deploy with GitHub Actions, set it before `npm run build`, for example:

```yaml
- name: Compute PUBLIC_APP_VERSION
  run: echo "PUBLIC_APP_VERSION=$(git describe --tags --always --dirty)" >> $GITHUB_ENV
```

---

## Tech stack

- Astro + MDX
- Bootstrap 5
- Font Awesome
- Pagefind (static search indexing)
- Sharp (image processing)

---

## Contributing

- Issues/bugs: https://github.com/crimsonstrife/oshi-lab/issues
- Discussions/ideas: https://github.com/crimsonstrife/oshi-lab/discussions

Security issues: please follow [`SECURITY.md`](./SECURITY.md).

---

## Support Me & This Project
- [Ko-fi](https://ko-fi.com/crimsonstrife)
- [GitHub Sponsors](https://github.com/sponsors/crimsonstrife)
- [Patreon](https://www.patreon.com/crimsonstrifegaming)

---

## License

See the `LICENSE` file in the repository.

---

## Socials
- Join my Discord: [Crimson's Corner](https://discord.gg/TcTMauzNgR)
- Follow me on X/Twitter: [@imcrimsonstrife](https://x.com/imcrimsonstrife)
- Follow me on GitHub: [@crimsonstrife](https://github.com/crimsonstrife)
- Follow me on Reddit: [/u/crimsonstrife](https://www.reddit.com/user/crimsonstrife)
- Follow me on YouTube: [@crimsonstrife](https://www.youtube.com/@crimsonstrife)
- Follow me on Twitch: [@crimsonstrife](https://www.twitch.tv/crimsonstrife)
- Follow me on Instagram: [@crimsonstrife](https://www.instagram.com/crimsonstrife)
- Follow me on TikTok: [@crimsonstrife](https://www.tiktok.com/@crimsonstrife)

