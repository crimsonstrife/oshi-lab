// @ts-check

import { els } from '../dom.js';
import { setStatus } from '../status.js';
import { safeUUID } from '../utils/uuid.js';
import { renderPreview } from '../preview/render.js';
import { syncEditorsFromTextareas } from '../scripts/editors/index.js';

const SNAP_KEY = 'myoshi_theme_lab_snapshots_v1';

export function loadSnapshots() {
    /** @type {any[]} */
    let list = [];
    try {
        list = JSON.parse(localStorage.getItem(SNAP_KEY) || '[]');
    } catch {
        list = [];
    }

    // localStorage is untrusted, so we need to normalize shape
    if (!Array.isArray(list)) list = [];
    list = list.filter((s) => s && typeof s.id === 'string' && typeof s.name === 'string');

    const select = els.snapshotSelect;
    if (select) {
        const frag = document.createDocumentFragment();

        // Placeholder option
        frag.appendChild(new Option('Load snapshot…', ''));

        // Snapshot options (text is NOT interpreted as HTML)
        for (const s of list) {
            frag.appendChild(new Option(s.name, s.id));
        }

        // Clear + insert
        select.replaceChildren(frag);
    }

    return list;
}

/** @param {any[]} list */
function saveSnapshots(list) {
  localStorage.setItem(SNAP_KEY, JSON.stringify(list));
}

export function saveSnapshot() {
  const name = prompt('Snapshot name:', 'My Theme Draft');
  if (!name) return;

  const list = loadSnapshots();
  const snap = {
    id: safeUUID(),
    name,
    createdAt: new Date().toISOString(),
    customCss: els.customCss?.value || '',
    customHtml: els.customHtml?.value || '',
    appendInstead: !!els.appendInstead?.checked,
    enableMock: !!els.enableMock?.checked,
    mock: {
      displayName: els.mockDisplayName?.value || '',
      username: els.mockUsername?.value || '',
      tagline: els.mockTagline?.value || '',
      avatar: els.mockAvatar?.value || '',
      bg: els.mockBg?.value || '',
    },
  };

  list.unshift(snap);
  saveSnapshots(list);
  loadSnapshots();
  setStatus('ok', `Saved snapshot: ${name}`);
}

/** @param {string} id */
export function loadSnapshotById(id) {
  const list = loadSnapshots();
  const snap = list.find((s) => s.id === id);
  if (!snap) {
    setStatus('warn', 'Snapshot not found.');
    return;
  }

  if (els.customCss) els.customCss.value = snap.customCss || '';
  if (els.customHtml) els.customHtml.value = snap.customHtml || '';
  if (els.appendInstead) els.appendInstead.checked = !!snap.appendInstead;
  if (els.enableMock) els.enableMock.checked = !!snap.enableMock;
  if (els.mockDisplayName) els.mockDisplayName.value = snap.mock?.displayName || '';
  if (els.mockUsername) els.mockUsername.value = snap.mock?.username || '';
  if (els.mockTagline) els.mockTagline.value = snap.mock?.tagline || '';
  if (els.mockAvatar) els.mockAvatar.value = snap.mock?.avatar || '';
  if (els.mockBg) els.mockBg.value = snap.mock?.bg || '';

  // keep CodeMirror in sync if mounted
  syncEditorsFromTextareas();

  setStatus('ok', `Loaded snapshot: ${snap.name}`);
  if (els.autoUpdate?.checked) renderPreview();
}

export function deleteSelectedSnapshot() {
    const id = els.snapshotSelect?.value;
    if (!id) return;

    const list = loadSnapshots();
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) return;

    if (!confirm(`Delete snapshot "${list[idx].name}"?`)) return;

    list.splice(idx, 1);
    saveSnapshots(list);
    loadSnapshots();
    if (els.snapshotSelect) els.snapshotSelect.value = '';
    setStatus('ok', 'Snapshot deleted.');
}

export function autoBackupBeforeExtract() {
  const hasWork =
    (els.customCss?.value || '').trim() ||
    (els.customHtml?.value || '').trim();

  if (!hasWork) return false;

  try {
    const list = loadSnapshots();
    list.unshift({
      id: safeUUID(),
      name: `Auto-backup before Extract (${new Date().toLocaleString()})`,
      createdAt: new Date().toISOString(),
      customCss: els.customCss?.value || '',
      customHtml: els.customHtml?.value || '',
      appendInstead: !!els.appendInstead?.checked,
      enableMock: !!els.enableMock?.checked,
      mock: {
        displayName: els.mockDisplayName?.value || '',
        username: els.mockUsername?.value || '',
        tagline: els.mockTagline?.value || '',
        avatar: els.mockAvatar?.value || '',
        bg: els.mockBg?.value || '',
      },
    });
    saveSnapshots(list);
    loadSnapshots();
    return true;
  } catch {
    return false;
  }
}
