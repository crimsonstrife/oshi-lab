// @ts-check
import html from './info-card/info-card.html?raw';
import css from './info-card/info-card.css?raw';

export default {
    id: 'info-card',
    name: 'Info Card',
    keywords: 'card about rules info panel',
    description: 'Simple heading & content card. Great for “About”, “Rules”, “Credits”, etc.',
    order: 20,
    html,
    css,
    fields: [
        { id: 'title', label: 'Title', defaultValue: 'About Me' },
        { id: 'body', label: 'Body', type: 'textarea', allowHtml: true, defaultValue: `Hi! I’m a VTuber who streams variety + cozy games.<br/>Catch me live and check the schedule below.` },
    ],
};