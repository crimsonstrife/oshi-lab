// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
    site: 'https://oshi-lab.app',
    integrations: [
		starlight({
            title: 'MyOshi Theme Lab - by CrimsonStrife',
            disable404Route: true,
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/crimsonstrife/oshi-lab' }],
            sidebar: [
                { label: 'Theme Lab', link: '/lab/' },
                { label: 'Docs', items: [{ slug: 'getting-started' }, { slug: 'theme-lab' }, { slug: 'templates'}] },
            ],
		}),
	],
});
