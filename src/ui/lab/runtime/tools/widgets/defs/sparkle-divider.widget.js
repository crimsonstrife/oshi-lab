// @ts-check

import html from './sparkle-divider/sparkle-divider.html?raw';
import css from './sparkle-divider/sparkle-divider.css?raw';

export default {
    id: 'sparkle-divider',
    name: 'Sparkle Divider (native)',
    keywords: 'divider hr sparkle separator',
    description: 'A themed horizontal divider that matches the base template’s “sparkle” styling.',
    order: 4,
    html,
    css,
    fields: [
        {
            id: 'margin',
            label: 'Vertical margin (CSS)',
            defaultValue: '12px 0',
            placeholder: '12px 0',
        },
    ],
};
