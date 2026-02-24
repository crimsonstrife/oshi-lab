// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
    //site: 'https://crimsonstrife.github.io',
    //base: '/oshi-lab',
    integrations: [
		starlight({
            title: 'MyOshi Theme Lab',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/crimsonstrife/oshi-lab' }],
            sidebar: [
                { label: 'Theme Lab', link: '/lab/' },
                { label: 'Docs', items: [{ slug: 'getting-started' }, { slug: 'theme-lab' }, { slug: 'templates'}] },
            ],
		}),
	],
});
