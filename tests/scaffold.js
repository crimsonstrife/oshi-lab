/**
 * Test scaffold helpers for the lab runtime.
 * These tests intentionally avoid Bootstrap/CodeMirror.
 */

export async function mountLabScaffold() {
  document.body.innerHTML = `
    <div id="lab-root" data-version="test"></div>
    <div id="bundleInfo"></div>
    <div id="statusText"></div>
    <div id="workspaceSubtitle"></div>
    <div id="customHtmlHelpText"></div>
    <div id="mockDataSummary"></div>

    <button id="btnTargetProfile" type="button"></button>
    <button id="btnTargetOshiCard" type="button"></button>
    <button id="btnToggleMobile" type="button"></button>

    <textarea id="customCss"></textarea>
    <textarea id="customHtml"></textarea>
    <textarea id="templateInput"></textarea>
    <textarea id="basePeek"></textarea>

    <input id="autoUpdate" type="checkbox" />
    <input id="appendInstead" type="checkbox" />

    <input id="enableMock" type="checkbox" />
    <input id="mockDisplayName" type="text" />
    <input id="mockUsername" type="text" />
    <input id="mockTagline" type="text" />
    <input id="mockAvatar" type="text" />
    <input id="mockBg" type="text" />

    <select id="snapshotSelect"></select>
    <select id="templateSelect"></select>

    <input id="themeImportInput" type="file" />
    <input id="includeExtractedBase" type="checkbox" />

    <div id="frameShell"></div>
    <iframe id="previewFrame"></iframe>
  `;

  const { refreshEls, els } = await import('../src/ui/lab/runtime/dom.js');
  refreshEls();
  return els;
}

export async function resetLabState() {
  const { state } = await import('../src/ui/lab/runtime/state.js');
  state.target = 'profile';
  state.baseCss = '';
  state.baseBody = '';
  state.baseMode = 'template';
  state.extractedBase = null;
  state.lastBuildSrcdoc = '';
  state.mobileMode = false;
  state.previewScale = 1;
  state.previewMinHeightPx = 1080;
  state.templatesIndex = [];
  state.templatesById = new Map();
  state.activeTemplateId = null;
  state.toolsModal = null;
  state.toolsApi = null;
  state.onboardingModal = null;
  state.debounceTimer = null;
  state.lastAuditReport = null;
  try {
    window.__OSHI_LAB_TARGET__ = 'profile';
  } catch {
    // ignore in tests
  }
}

export function setFileInput(inputEl, file) {
    const fileList = {
        0: file,
        length: 1,
        item: (i) => (i === 0 ? file : null),
        *[Symbol.iterator]() {
            yield file;
        },
    };

    Object.defineProperty(inputEl, 'files', {
        value: fileList,
        configurable: true,
    });
}
