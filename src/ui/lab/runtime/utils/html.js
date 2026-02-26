// @ts-check
import * as entities from 'entities';

/** @param {string} str */
export function decodeHtmlEntities(str) {
    return entities.decodeHTML(str || '');
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