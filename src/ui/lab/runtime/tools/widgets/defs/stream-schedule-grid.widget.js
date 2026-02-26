// @ts-check
import html from './stream-schedule-grid/stream-schedule-grid.html?raw';
import css from './stream-schedule-grid/stream-schedule-grid.css?raw';

export default {
    id: 'stream-schedule-grid',
    name: 'Streaming Schedule (Grid)',
    keywords: 'schedule stream twitch vtuber weekly grid',
    description: 'Responsive 7-day schedule grid. Fill each day with slots using the provided markup.',
    order: 5,
    html,
    css,
    fields: [
        { id: 'title', label: 'Title', defaultValue: 'Stream Schedule' },
        { id: 'tz', label: 'Timezone label', defaultValue: 'ET' },
        { id: 'twitchUser', label: 'Twitch username', defaultValue: 'yourname', placeholder: 'crimsonstrife' },

        // paste multiple <div class="labw-slot">…</div>
        { id: 'mon', label: 'Monday slots', type: 'textarea', allowHtml: true, defaultValue: `<div class="labw-slot"><span class="labw-time">7:00 PM</span><span class="labw-what">Just Chatting</span></div>` },
        { id: 'tue', label: 'Tuesday slots', type: 'textarea', allowHtml: true, defaultValue: `<div class="labw-slot"><span class="labw-time">8:00 PM</span><span class="labw-what">Variety</span></div>` },
        { id: 'wed', label: 'Wednesday slots', type: 'textarea', allowHtml: true, defaultValue: `<div class="labw-slot"><span class="labw-time">OFF</span><span class="labw-what">Rest / Prep</span></div>` },
        { id: 'thu', label: 'Thursday slots', type: 'textarea', allowHtml: true, defaultValue: `<div class="labw-slot"><span class="labw-time">7:30 PM</span><span class="labw-what">Collab Night</span></div>` },
        { id: 'fri', label: 'Friday slots', type: 'textarea', allowHtml: true, defaultValue: `<div class="labw-slot"><span class="labw-time">9:00 PM</span><span class="labw-what">Horror / Game Night</span></div>` },
        { id: 'sat', label: 'Saturday slots', type: 'textarea', allowHtml: true, defaultValue: `<div class="labw-slot"><span class="labw-time">2:00 PM</span><span class="labw-what">Long Stream</span></div>` },
        { id: 'sun', label: 'Sunday slots', type: 'textarea', allowHtml: true, defaultValue: `<div class="labw-slot"><span class="labw-time">OFF</span><span class="labw-what">Community / Admin</span></div>` },
    ],
};