// @ts-check
import * as entities from 'entities';

/**
 * Decodes a string containing HTML entities into its corresponding characters.
 *
 * @param {string} str - The string containing HTML entities to be decoded.
 * @return {string} The decoded string with HTML entities replaced by their corresponding characters.
 */
export function decodeHtmlEntities(str) {
    return entities.decodeHTML(str || '');
}

/**
 * Attempts to extract the value of the `srcdoc` attribute from an HTML string if it exists.
 *
 * The function parses the input string for an `<iframe>` tag and attempts to identify
 * its `srcdoc` attribute. It validates and extracts the value if present. If the
 * attribute or `<iframe>` tag is not found, it returns `null`. Errors during parsing
 * also result in a return value of `null`.
 *
 * @param {string} input The input HTML string to be scanned for an iframe's `srcdoc` attribute.
 * @return {string|null} The value of the `srcdoc` attribute if found, or `null` otherwise.
 */
export function maybeExtractSrcdoc(input) {
    try {
        if (!input) return null;

        const start = input.search(/<iframe\b/i);
        if (start === -1) return null;

        // Scan forward through the opening <iframe ...> tag, respecting quotes.
        let i = start + 7; // after "<iframe"
        const len = input.length;

        // @ts-ignore
        const isWs = (c) => c === ' ' || c === '\n' || c === '\r' || c === '\t' || c === '\f';

        while (i < len) {
            // Skip whitespace
            while (i < len && isWs(input[i])) i++;

            // End of tag?
            const ch = input[i];
            if (!ch) break;
            if (ch === '>') break;
            if (ch === '/' && input[i + 1] === '>') break;

            // Read the attribute name
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