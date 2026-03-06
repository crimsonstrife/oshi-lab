// @ts-check
import html from './twitch-buttons/twitch-buttons.html?raw';
import css from './twitch-buttons/twitch-buttons.css?raw';

export default {
    id: 'twitch-buttons',
    name: 'Twitch Buttons',
    keywords: 'twitch buttons schedule vods clips',
    description: 'Three CTA buttons for Twitch. Delete any you don’t want.',
    order: 6,
    html,
    css,
    fields: [
        { id: 'twitchUser', label: 'Twitch username', defaultValue: 'yourname' },
        { id: 'labelWatch', label: 'Watch label', defaultValue: 'Watch Live' },
        { id: 'labelSchedule', label: 'Schedule label', defaultValue: 'Schedule' },
        { id: 'labelVods', label: 'VODs label', defaultValue: 'VODs' },
    ],
};