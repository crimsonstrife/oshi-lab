// @ts-check

import html from './callout-widget/callout.html?raw';
import css from './callout-widget/callout.css?raw';

export default {
    id: 'callout',
    name: 'Callout Box',
    keywords: 'callout alert note box',
    description: 'A title + body callout with an optional link. Fully scoped to .labw-callout.',
    order: 10,
    html,
    css,
    fields: [
        { id: 'title', label: 'Title', defaultValue: 'Heads up!' },
        { id: 'body', label: 'Body', type: 'textarea', defaultValue: 'This is a callout you can customize.', allowHtml: true },
        { id: 'linkUrl', label: 'Link URL', defaultValue: '#', placeholder: 'https://…' },
        { id: 'linkText', label: 'Link Text', defaultValue: 'Learn more' },
    ],
};