// @ts-check

import html from './notice-glow/notice-glow.html?raw';
import css from './notice-glow/notice-glow.css?raw';

export default {
    id: 'notice-glow',
    name: 'Notice Glow (native)',
    keywords: 'notice glow banner alert',
    description: 'A native-looking “notice” strip that reuses the base template’s .notice-glow style.',
    order: 3,
    html,
    css,
    fields: [
        { id: 'title', label: 'Title', defaultValue: 'Announcement' },
        {
            id: 'body',
            label: 'Body (HTML allowed)',
            type: 'textarea',
            allowHtml: true,
            defaultValue: 'New schedule starting next week — check the details below! ✨',
        },
    ],
};
