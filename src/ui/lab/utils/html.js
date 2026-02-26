// @ts-check

/**
 * Decode a *single pass* of common HTML entities.
 * This avoids DOM sinks like innerHTML/DOMParser, which SAST tools flag.
 * Note: This intentionally decodes &amp; LAST to avoid double-decoding
 * cases like "&amp;lt;" -> "&lt;" (matching typical HTML parser behavior).
 *
 * @param {string} str
 * @returns {string}
 */
export function decodeHtmlEntities(str) {
    if (typeof str !== 'string' || str.length === 0) return '';

    // Decode named entities except &amp; first (single-pass behavior).
    const named = {
        quot: '"',
        apos: "'",
        lt: '<',
        gt: '>',
        nbsp: '\u00A0',
    };

    let out = str.replace(/&(quot|apos|lt|gt|nbsp);/gi, (m, name) => {
        const key = String(name).toLowerCase();
        return named[key] ?? m;
    });

    // Decode numeric entities (single pass), before &amp;
    out = out.replace(/&#(\d+);/g, (m, dec) => {
        const cp = Number(dec);
        if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) return m;
        try {
            return String.fromCodePoint(cp);
        } catch {
            return m;
        }
    });

    out = out.replace(/&#x([0-9a-fA-F]+);/g, (m, hex) => {
        const cp = parseInt(hex, 16);
        if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) return m;
        try {
            return String.fromCodePoint(cp);
        } catch {
            return m;
        }
    });

    // Decode &amp; last to avoid recursively decoding sequences created above.
    out = out.replace(/&amp;/gi, '&');

    return out;
}

/**
 * Attempt to extract srcdoc content from an iframe wrapper HTML.
 * Supports srcdoc/srcDoc (case-insensitive), quoted or unquoted values.
 * Avoids DOMParser/innerHTML to reduce XSS scanner findings.
 *
 * @param {string} input
 * @returns {string|null}
 */
export function maybeExtractSrcdoc(input) {
    try {
        if (!input) return null;

        const start = input.search(/<iframe\b/i);
        if (start === -1) return null;

        // Scan forward through the opening <iframe ...> tag, respecting quotes.
        let i = start + 7; // after "<iframe"
        const len = input.length;

        const isWs = (c) => c === ' ' || c === '\n' || c === '\r' || c === '\t' || c === '\f';

        while (i < len) {
            // Skip whitespace
            while (i < len && isWs(input[i])) i++;

            // End of tag?
            const ch = input[i];
            if (!ch) break;
            if (ch === '>') break;
            if (ch === '/' && input[i + 1] === '>') break;

            // Read attribute name
            const nameStart = i;
            while (
                i < len &&
                !isWs(input[i]) &&
                input[i] !== '=' &&
                input[i] !== '>' &&
                input[i] !== '/'
                ) {
                i++;
            }
            const rawName = input.slice(nameStart, i);
            const name = rawName.toLowerCase();

            // Skip whitespace
            while (i < len && isWs(input[i])) i++;

            // Boolean attribute (no '=') => continue
            if (input[i] !== '=') {
                continue;
            }

            // Consume '=' and whitespace
            i++;
            while (i < len && isWs(input[i])) i++;

            // Read attribute value (quoted or unquoted)
            let value = '';
            const q = input[i];
            if (q === '"' || q === "'") {
                i++; // consume opening quote
                const vStart = i;
                while (i < len && input[i] !== q) i++;
                value = input.slice(vStart, i);
                if (input[i] === q) i++; // consume closing quote
            } else {
                const vStart = i;
                while (i < len && !isWs(input[i]) && input[i] !== '>') i++;
                value = input.slice(vStart, i);
            }

            if (name === 'srcdoc') {
                return value || null;
            }
        }

        return null;
    } catch {
        return null;
    }
}