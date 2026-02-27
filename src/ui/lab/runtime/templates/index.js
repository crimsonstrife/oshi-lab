// @ts-nocheck

import { state } from '../state.js';
import { els } from '../dom.js';
import { setStatus } from '../status.js';
import { summarizeBase } from '../utils/format.js';
import { renderPreview } from '../preview/render.js';

/**
 * Represents the base URL pointing to the data directory.
 * The value is defined dynamically using the `BASE_URL` environment variable.
 *
 * This path is typically used to construct full URLs to fetch or interact with resources in the `data` directory of the application.
 *
 * @constant {string} DATA_BASE
 */
const DATA_BASE = `${import.meta.env.BASE_URL}data/`;
/**
 * Represents the URL for fetching the templates JSON file.
 * It constructs the URL dynamically based on the base URL provided in the environment.
 *
 * The value is derived using the `BASE_URL` environment variable available
 * through `import.meta.env` and appends `data/templates.json` to it.
 */
const TEMPLATES_URL = `${import.meta.env.BASE_URL}data/templates.json`;

// Cache in-flight fetches / resolved code per template id
/**
 * A cache for storing template codes.
 * This variable utilizes a Map to associate keys with their respective template code values.
 *
 * The purpose of this cache is to improve efficiency by avoiding repeated generation
 * or retrieval of template codes that are used frequently.
 *
 * Keys in the Map typically represent identifiers or unique markers for specific
 * template codes, while values hold the corresponding template code data.
 */
const templateCodeCache = new Map(); // id -> Promise<{ css: string, body: string }>

/**
 * Provides a fallback template configuration to be used when the primary templates cannot be fetched.
 *
 * @return {Array<Object>} An array containing a single object that describes the fallback template, including its ID, name, description, CSS, base HTML structure, and mock default values for placeholders.
 */
function templateFallbackIndex() {
    return [{
        id: 'fallback',
        name: 'Fallback (offline)',
        description: 'Minimal template embedded as a fallback when templates.json can’t be fetched.',
        baseCss: ":root{--vs-border:#2a3d5e;--vs-bg-white:#0f1622;--vs-text:#e7eefc} .profile-page{min-height:100vh;padding:18px;color:var(--vs-text);background:#0b0f17} .card{border:1px solid var(--vs-border);border-radius:12px;padding:12px;background:var(--vs-bg-white)}",
        baseBody: "<div class='profile-page profile-custom-css'><div class='card'><div class='profile-custom-html'></div></div></div>",
        mockDefaults: { displayName: 'Demo User', username: '@demo', tagline: '', avatar: '', background: '' },
    }];
}

/**
 * Retrieves the preloaded templates from the global window object.
 *
 * This method attempts to access the `__MYOSHI_LAB_TEMPLATES__` property
 * from the `window` object. If it exists and is an array, it returns the array.
 * Otherwise, it returns null.
 *
 * @return {Array|null} The array of preloaded templates if available and valid, or null if not found or an error occurs.
 */
function getPreloadedTemplates() {
    try {
        // provided by initLab.ts
        // @ts-ignore
        const preloaded = window.__MYOSHI_LAB_TEMPLATES__;
        return Array.isArray(preloaded) ? preloaded : null;
    } catch {
        return null;
    }
}

/**
 * Populates the 'templateSelect' dropdown with template options based on the templatesIndex array from the state object.
 * Each option includes the template name or ID, along with a description if available.
 * If no templates or value is available, a fallback value will be used.
 *
 * @return {void} Does not return a value.
 */
function populateTemplateSelect() {
    const sel = /** @type {HTMLSelectElement|null} */ (document.getElementById('templateSelect'));
    if (!sel) return;

    sel.innerHTML = state.templatesIndex.map((t) => {
        const label = t.name || t.id;
        const desc = t.description ? ` — ${t.description}` : '';
        return `<option value="${encodeURIComponent(t.id)}">${label}${desc}</option>`;
    }).join('');

    sel.value = encodeURIComponent(state.activeTemplateId || state.templatesIndex[0]?.id || 'fallback');
}

// @ts-ignore
/**
 * Updates the template information displayed in the application.
 * This function checks if the `templateInfo` element exists, and
 * updates its text content based on the provided `template` object.
 * If `template.description` is not available, it falls back to a
 * default message 'Built-in template'.
 *
 * @param {Object} template - The template object containing information to be displayed.
 * @param {string} [template.description] - A description of the template.
 * @return {void} This function does not return a value.
 */
function updateTemplateInfo(template) {
    if (!els.templateInfo) return;
    els.templateInfo.textContent = template?.description || 'Built-in template';
}

// @ts-ignore
/**
 * Applies mock default values from the provided template object to designated elements,
 * if the specific elements do not already have values set.
 *
 * @param {Object} template - The template object containing mock default values.
 * @param {Object} [template.mockDefaults] - The mock defaults to apply.
 * @param {string} [template.mockDefaults.displayName] - Default value for the display name.
 * @param {string} [template.mockDefaults.username] - Default value for the username.
 * @param {string} [template.mockDefaults.tagline] - Default value for the tagline.
 * @param {string} [template.mockDefaults.avatar] - Default value for the avatar URL.
 * @param {string} [template.mockDefaults.background] - Default value for the background URL.
 * @return {void} This function does not return a value.
 */
function applyMockDefaults(template) {
    if (!template?.mockDefaults) return;
    const d = template.mockDefaults;

    if (els.mockDisplayName && !els.mockDisplayName.value) els.mockDisplayName.value = d.displayName || '';
    if (els.mockUsername && !els.mockUsername.value) els.mockUsername.value = d.username || '';
    if (els.mockTagline && !els.mockTagline.value) els.mockTagline.value = d.tagline || '';
    if (els.mockAvatar && !els.mockAvatar.value) els.mockAvatar.value = d.avatar || '';
    if (els.mockBg && !els.mockBg.value) els.mockBg.value = d.background || '';
}

/**
 * Resolves a given path to a full data URL based on the predefined `DATA_BASE`.
 * Leading slashes in the path are treated as relative to the `DATA_BASE`, not the site root.
 * This handling is particularly useful for environments like GitHub Pages subpaths.
 *
 * @param {string} path - The relative path to be resolved. If the path is null or undefined, it defaults to an empty string.
 * @return {string} The resolved full data URL as a string.
 */
function resolveDataUrl(path) {
    // Treat leading "/" as relative to BASE_URL (not site root) so GitHub Pages subpaths work.
    const cleaned = String(path || '').trim().replace(/^\/+/, '');
    return `${DATA_BASE}${cleaned}`;
}

/**
 * Ensures the inline CSS and HTML code for a given template is loaded. If the code is not already cached,
 * it fetches the CSS and HTML content from the provided URLs and stores them in the template object for future use.
 *
 * @param {Object} template - The template object containing properties for base CSS, body content, and their respective file URLs.
 * @param {string} [template.id] - The unique identifier for the template, used as a key for caching.
 * @param {string} [template.baseCss] - Existing inline CSS content for the template, if available.
 * @param {string} [template.baseBody] - Existing inline HTML body content for the template, if available.
 * @param {string} [template.baseCssFile] - URL or path to the external CSS file for the template.
 * @param {string} [template.baseBodyFile] - URL or path to the external HTML body file for the template.
 * @return {Promise<void>} A promise that resolves when the template code is ensured to be loaded and stored in the template object.
 */
async function ensureTemplateCodeLoaded(template) {
    // Back-compat: if inline strings exist, we’re done.
    if ((template.baseCss && template.baseBody) || (!template.baseCssFile && !template.baseBodyFile)) return;

    if (!templateCodeCache.has(template.id)) {
        const p = (async () => {
            const cssUrl = template.baseCssFile ? resolveDataUrl(template.baseCssFile) : null;
            const bodyUrl = template.baseBodyFile ? resolveDataUrl(template.baseBodyFile) : null;

            const [css, body] = await Promise.all([
                cssUrl
                    ? fetch(cssUrl, { cache: 'no-store' }).then(r => {
                        if (!r.ok) throw new Error(`CSS HTTP ${r.status} for ${cssUrl}`);
                        return r.text();
                    })
                    : Promise.resolve(''),
                bodyUrl
                    ? fetch(bodyUrl, { cache: 'no-store' }).then(r => {
                        if (!r.ok) throw new Error(`HTML HTTP ${r.status} for ${bodyUrl}`);
                        return r.text();
                    })
                    : Promise.resolve(''),
            ]);

            return { css, body };
        })();

        templateCodeCache.set(template.id, p);
    }

    const { css, body } = await templateCodeCache.get(template.id);

    // Store onto the template object so the rest of your code doesn’t need to change.
    template.baseCss = (template.baseCss || css || '').trim();
    template.baseBody = (template.baseBody || body || '').trim();
}

/**
 * Loads a template by its unique identifier and updates the application state accordingly.
 *
 * @param {string} id The unique identifier of the template to be loaded.
 * @return {Promise<void>} A promise that resolves once the template is loaded and the necessary updates are applied.
 */
export async function loadTemplateById(id) {
    const template = state.templatesById.get(id);
    if (!template) {
        setStatus('warn', 'Template not found: ' + id);
        return;
    }

    setStatus('ok', `Loading template: ${template.name || template.id}…`);

    // Load external CSS/HTML if needed
    try {
        await ensureTemplateCodeLoaded(template);
    } catch (e) {
        setStatus('warn', `Failed to load template files for ${template.id}. Using what’s available.`);
    }

    state.activeTemplateId = id;
    localStorage.setItem('myoshi_theme_lab_template_id', id);

    state.baseCss = (template.baseCss || '').trim();
    state.baseBody = (template.baseBody || '').trim();

    applyMockDefaults(template);
    if (els.basePeek) els.basePeek.value = summarizeBase(state.baseCss, state.baseBody);
    updateTemplateInfo(template);

    setStatus('ok', `Template loaded: ${template.name || template.id}. Start editing Custom CSS/HTML. Import a real MyOshi preview via Template Input → Extract Base.`);
    if (els.autoUpdate?.checked) renderPreview();

    const sel = /** @type {HTMLSelectElement|null} */ (document.getElementById('templateSelect'));
    if (sel) sel.value = encodeURIComponent(id);
}

/**
 * Loads the template index, either from preloaded data, a fetch request, or a fallback mechanism.
 * Populates the state with the templates and initializes the template selection interface.
 * Attempts to load a specific template based on the last selected template ID stored in local storage.
 *
 * @return {Promise<void>} A promise that resolves when the template index is loaded and the initial template is processed.
 */
export async function loadTemplatesIndex() {
    const preloaded = getPreloadedTemplates();

    if (preloaded && preloaded.length) {
        state.templatesIndex = preloaded;
    } else {
        try {
            const res = await fetch(TEMPLATES_URL, { cache: 'no-store' });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            state.templatesIndex = Array.isArray(data?.templates) ? data.templates : [];
            if (!state.templatesIndex.length) state.templatesIndex = templateFallbackIndex();
        } catch {
            state.templatesIndex = templateFallbackIndex();
        }
    }

    state.templatesById = new Map(state.templatesIndex.map((t) => [t.id, t]));
    populateTemplateSelect();

    const last = localStorage.getItem('myoshi_theme_lab_template_id');
    const initial = (last && state.templatesById.has(last)) ? last : (state.templatesIndex[0]?.id || 'fallback');
    await loadTemplateById(initial);
}