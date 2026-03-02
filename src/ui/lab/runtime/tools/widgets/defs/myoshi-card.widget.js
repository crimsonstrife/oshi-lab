// @ts-check

import html from './myoshi-card/myoshi-card.html?raw';
import css from './myoshi-card/myoshi-card.css?raw';

export default {
    id: 'myoshi-card',
    name: 'MyOshi Card (native-looking)',
    keywords: 'card header body myoshi native',
    description: 'A native-looking card that reuses MyOshi’s built-in .card / .card-header / .card-body styles.',
    order: 2,
    html,
    css,
    fields: [
        { id: 'title', label: 'Title', defaultValue: 'My Card Title' },
        {
            id: 'headerClass',
            label: 'Header style class',
            defaultValue: 'starred',
            placeholder: 'starred | hearted | (blank)',
        },
        {
            id: 'headerRight',
            label: 'Header right (optional HTML)',
            type: 'textarea',
            allowHtml: true,
            defaultValue: '<a href="#">View All</a>',
        },
        {
            id: 'body',
            label: 'Body (HTML allowed)',
            type: 'textarea',
            allowHtml: true,
            defaultValue: 'Drop your content here. You can use <b>bold</b>, <i>italics</i>, and links.',
        },
    ],
};
