// scripts/sync-templates.mjs
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

// Source-of-truth (edit here)
const SRC_DIR = path.join(root, 'src', 'ui/lab/data');

// Public output (served at /data/... and copied to dist/)
const OUT_DIR = path.join(root, 'public', 'data');

async function exists(p) {
    try { await fs.access(p); return true; } catch { return false; }
}

async function main() {
    if (!(await exists(SRC_DIR))) {
        console.warn(`[sync-templates] Missing source dir: ${SRC_DIR}`);
        process.exit(0);
    }

    await fs.mkdir(OUT_DIR, { recursive: true });

    // Copy templates.json
    await fs.copyFile(
        path.join(SRC_DIR, 'templates.json'),
        path.join(OUT_DIR, 'templates.json'),
    );

    // Copy templates folder
    const srcTemplates = path.join(SRC_DIR, 'templates');
    const outTemplates = path.join(OUT_DIR, 'templates');

    // wipe output templates to avoid stale files
    await fs.rm(outTemplates, { recursive: true, force: true });
    await fs.cp(srcTemplates, outTemplates, { recursive: true });

    console.log('[sync-templates] Synced templates to public/data/');
}

main().catch((err) => {
    console.error('[sync-templates] Failed:', err);
    process.exit(1);
});