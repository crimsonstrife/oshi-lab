// @ts-check

/** @typedef {'profile'|'oshi-card'} LabTarget */

/** @type {Record<LabTarget, any>} */
export const TARGET_CONFIGS = {
  profile: {
    id: 'profile',
    label: 'Profile Lab',
    subtitle: 'Edit Custom CSS/HTML against a built-in demo profile. Import a real MyOshi preview for more accurate representation.',
    templateInputPlaceholder: "Paste MyOshi profile preview HTML (outer iframe or raw srcdoc indicated by class='profile-page profile-custom-css'), then click Extract Base.",
    customHtmlMount: '.profile-custom-html',
    customCssScope: '.profile-page.profile-custom-css',
    bgTargetSelector: '.profile-page',
    displayNameSelector: '.profile-display-name',
    usernameSelector: '.profile-username',
    taglineSelector: '.profile-tagline',
    avatarSelector: 'img.profile-avatar, .profile-avatar img',
    mockTitle: 'Mock Profile Data',
    mobileButtonLabel: 'Mobile Width',
    previewTitle: 'MyOshi Profile Preview',
    customHtmlHelpText: 'injected into .profile-custom-html',
    templateInfoFallback: 'Built-in profile template',
  },
  'oshi-card': {
    id: 'oshi-card',
    label: 'OshiCard Lab',
    subtitle: 'Edit Custom CSS/HTML against a built-in OshiCard preview. Use this workspace for link-card style pages, not full profiles.',
    templateInputPlaceholder: "Paste OshiCard preview HTML (outer iframe or raw srcdoc indicated by class='oshi-card-root'), then click Extract Base.",
    customHtmlMount: '.oshi-card-custom-html',
    customCssScope: '.oshi-card-custom-css',
    bgTargetSelector: '.oshi-card-root',
    displayNameSelector: '.oshi-card-name',
    usernameSelector: '.oshi-card-username',
    taglineSelector: '.oshi-card-headline',
    avatarSelector: '.oshi-card-avatar img',
    mockTitle: 'Mock OshiCard Data',
    mobileButtonLabel: 'Card Width',
    previewTitle: 'OshiCard Preview',
    customHtmlHelpText: 'injected into .oshi-card-custom-html',
    templateInfoFallback: 'Built-in OshiCard template',
  },
};

/** @param {LabTarget | string | null | undefined} target */
export function getTargetConfig(target) {
  return TARGET_CONFIGS[target === 'oshi-card' ? 'oshi-card' : 'profile'];
}

export function getCurrentTargetConfig() {
  // late import avoids eager cycles in some bundlers
  try {
    // @ts-ignore
    const t = window?.__OSHI_LAB_TARGET__;
    return getTargetConfig(t || 'profile');
  } catch {
    return TARGET_CONFIGS.profile;
  }
}

/** @param {LabTarget} target */
export function targetStorageKey(target) {
  return `myoshi_theme_lab_template_id:${target}`;
}
