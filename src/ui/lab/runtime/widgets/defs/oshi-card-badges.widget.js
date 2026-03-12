// @ts-check
import html from './oshi-card-badges/oshi-card-badges.html?raw';
import css from './oshi-card-badges/oshi-card-badges.css?raw';
export default {
  id: 'oshi-card-badges',
  name: 'OshiCard badge row',
  targets: ['oshi-card'],
  keywords: 'oshi card badges chips tags',
  description: 'A simple badge/chip row for status, interests, or creator tags.',
  order: 11,
  html,
  css,
  fields: [
    { id: 'badge1', label: 'Badge 1', defaultValue: 'VTuber' },
    { id: 'badge2', label: 'Badge 2', defaultValue: 'Dev Streamer' },
    { id: 'badge3', label: 'Badge 3', defaultValue: 'Horror Game Dev' },
  ],
};
