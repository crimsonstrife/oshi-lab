// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

import markdoc from '@astrojs/markdoc';

// https://astro.build/config
export default defineConfig({
    site: 'https://oshi-lab.app',
    integrations: [mdx(), sitemap({
            filter: (page) =>
                page !== 'https://oshi-lab.app/lab/preview' &&
                page !== 'https://oshi-lab.app/error',
        lastmod: new Date(),
    }), markdoc()],
});