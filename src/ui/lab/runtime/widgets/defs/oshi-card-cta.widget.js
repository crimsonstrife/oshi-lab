// @ts-check
import html from './oshi-card-cta/oshi-card-cta.html?raw';
import css from './oshi-card-cta/oshi-card-cta.css?raw';
export default {
  id: 'oshi-card-cta',
  name: 'OshiCard CTA panel',
  targets: ['oshi-card'],
  keywords: 'oshi card cta links panel buttons',
  description: 'A compact CTA panel that fits well above or below your main OshiCard links.',
  order: 10,
  html,
  css,
  fields: [
    { id: 'title', label: 'Title', defaultValue: 'Start here' },
    { id: 'body', label: 'Body', type: 'textarea', allowHtml: true, defaultValue: 'Point visitors to your most important action first.' },
    { id: 'primaryUrl', label: 'Primary URL', defaultValue: '#' },
    { id: 'primaryText', label: 'Primary text', defaultValue: 'Watch Live' },
    { id: 'secondaryUrl', label: 'Secondary URL', defaultValue: '#' },
    { id: 'secondaryText', label: 'Secondary text', defaultValue: 'Join Discord' },
  ],
};
