// scripts/settings-ui.js
import { openSimpleLightSettings } from './features/simple-light-settings.js';

const MODULE_ID = 'PurplePhoenix-FVTT-Tools';

const FEATURE_GROUPS = [
  {
    id: 'hp-in-bar',
    icon: 'fa-solid fa-heart-pulse',
    titleKey: 'SETTINGSUI.GroupHpInBarTitle',
    descKey: 'SETTINGSUI.GroupHpInBarDesc',
    enableKey: 'enableHpInBar',
    restricted: false,
    keys: [
      'enableHpInBar',
      'visibleTo',
      'acVisibleTo',
      'tempText',
      'tempShield',
      'fontSize',
      'textColor',
      'strokeColor',
      'strokeWidth'
    ]
  },
  {
    id: 'better-measure',
    icon: 'fa-solid fa-ruler-combined',
    titleKey: 'SETTINGSUI.GroupBetterMeasureTitle',
    descKey: 'SETTINGSUI.GroupBetterMeasureDesc',
    enableKey: 'enableBetterMeasure',
    restricted: false,
    keys: ['enableBetterMeasure', 'betterMeasureSize', 'betterMeasureIncludeTokenRuler']
  },
  {
    id: 'easy-send',
    icon: 'fa-solid fa-hand-holding-hand',
    titleKey: 'SETTINGSUI.GroupEasySendTitle',
    descKey: 'SETTINGSUI.GroupEasySendDesc',
    enableKey: 'enableEasySend',
    restricted: true,
    keys: ['enableEasySend', 'easySendPostChat']
  },
  {
    id: 'simple-light',
    icon: 'fa-solid fa-fire-flame-curved',
    titleKey: 'SETTINGSUI.GroupSimpleLightTitle',
    descKey: 'SETTINGSUI.GroupSimpleLightDesc',
    enableKey: 'enableSimpleLight',
    restricted: false,
    keys: ['enableSimpleLight', 'simpleLightAllowPlayers']
  },
  {
    id: 'effects-manager',
    icon: 'fa-solid fa-wand-magic-sparkles',
    titleKey: 'SETTINGSUI.GroupEffectsManagerTitle',
    descKey: 'SETTINGSUI.GroupEffectsManagerDesc',
    enableKey: 'enableEffectsManager',
    restricted: true,
    keys: ['enableEffectsManager', 'effectsManagerPlayers']
  },
  {
    id: 'status-effects',
    icon: 'fa-solid fa-table-list',
    titleKey: 'SETTINGSUI.GroupStatusEffectsTitle',
    descKey: 'SETTINGSUI.GroupStatusEffectsDesc',
    enableKey: 'enableStatusEffects',
    restricted: false,
    keys: ['enableStatusEffects', 'statusEffectsColumns']
  },
  {
    id: 'pause-border',
    icon: 'fa-solid fa-circle-pause',
    titleKey: 'SETTINGSUI.GroupPauseBorderTitle',
    descKey: 'SETTINGSUI.GroupPauseBorderDesc',
    enableKey: 'enablePauseBorder',
    restricted: true,
    keys: ['enablePauseBorder', 'pauseBorderColor', 'pauseBorderReplaceIcon']
  },
  {
    id: 'easy-flip',
    icon: 'fa-solid fa-arrows-left-right',
    titleKey: 'SETTINGSUI.GroupEasyFlipTitle',
    descKey: 'SETTINGSUI.GroupEasyFlipDesc',
    enableKey: 'enableEasyFlip',
    restricted: false,
    keys: ['enableEasyFlip']
  },
  {
    id: 'show-ranges',
    icon: 'fa-solid fa-bullseye',
    titleKey: 'SETTINGSUI.GroupShowRangesTitle',
    descKey: 'SETTINGSUI.GroupShowRangesDesc',
    enableKey: 'enableShowRanges',
    restricted: false,
    keys: ['enableShowRanges', 'showRangesMode']
  },
  {
    id: 'readable-dice',
    icon: 'fa-solid fa-dice-d20',
    titleKey: 'SETTINGSUI.GroupReadableDiceTitle',
    descKey: 'SETTINGSUI.GroupReadableDiceDesc',
    enableKey: 'enableReadableDice',
    restricted: false,
    keys: ['enableReadableDice', 'readableDiceOpacity']
  }
];

function ensureSettingsCenterStyles() {
  if (document.getElementById('pp-settings-center-styles')) return;
  const style = document.createElement('style');
  style.id = 'pp-settings-center-styles';
  style.textContent = `
    .pp-settings-app .window-content {
      padding: 0 !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
    }
    .pp-settings-shell {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      min-height: 0;
      overflow: hidden;
      font-family: var(--font-primary, Signika, sans-serif);
    }
    .pp-settings-body {
      display: grid;
      grid-template-columns: 235px 1fr;
      flex: 1 1 auto;
      min-height: 0;
      overflow: hidden;
    }
    .pp-settings-sidebar {
      display: flex;
      flex-direction: column;
      gap: 5px;
      padding: 12px 10px;
      background: rgba(0, 0, 0, 0.28);
      border-right: 1px solid rgba(255, 255, 255, 0.12);
      overflow-y: auto;
    }
    .pp-sidebar-header {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      opacity: 0.6;
      padding: 2px 8px 6px 8px;
    }
    .pp-sidebar-tab {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 9px 11px;
      border-radius: 7px;
      border: 1px solid transparent;
      background: transparent;
      color: inherit;
      text-align: left;
      font-size: 0.92rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
      flex-shrink: 0;
    }
    .pp-sidebar-tab:hover {
      background: rgba(255, 255, 255, 0.07);
    }
    .pp-sidebar-tab.active {
      background: linear-gradient(90deg, rgba(155, 89, 182, 0.34) 0%, rgba(155, 89, 182, 0.14) 100%);
      border-color: rgba(186, 120, 214, 0.75);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    }
    .pp-sidebar-tab i {
      width: 20px;
      text-align: center;
      font-size: 1rem;
      opacity: 0.9;
      flex: 0 0 20px;
    }
    .pp-sidebar-tab-label {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .pp-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #2ecc71;
      box-shadow: 0 0 6px rgba(46, 204, 113, 0.7);
      flex: 0 0 8px;
    }
    .pp-status-dot.off {
      background: #7f8c8d;
      box-shadow: none;
      opacity: 0.5;
    }
    .pp-settings-content {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      padding: 16px 20px;
    }
    .pp-feature-pane {
      display: none;
      flex-direction: column;
      gap: 14px;
    }
    .pp-feature-pane.active {
      display: flex;
    }
    .pp-pane-banner {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 14px 16px;
      border-radius: 8px;
      background: linear-gradient(135deg, rgba(142, 68, 173, 0.26) 0%, rgba(0, 0, 0, 0.28) 100%);
      border: 1px solid rgba(186, 120, 214, 0.35);
      flex-shrink: 0;
    }
    .pp-pane-banner-icon {
      width: 42px;
      height: 42px;
      border-radius: 9px;
      background: rgba(155, 89, 182, 0.32);
      border: 1px solid rgba(186, 120, 214, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      flex: 0 0 42px;
    }
    .pp-pane-banner-text {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }
    .pp-pane-banner-title {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
    }
    .pp-pane-banner-desc {
      margin: 0;
      font-size: 0.9rem;
      line-height: 1.4;
      opacity: 0.88;
    }
    .pp-setting-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      padding: 12px 15px;
      border-radius: 7px;
      background: rgba(255, 255, 255, 0.035);
      border: 1px solid rgba(255, 255, 255, 0.1);
      flex-shrink: 0;
      transition: opacity 0.15s ease, border-color 0.15s ease;
    }
    .pp-setting-card.pp-enable-card {
      background: rgba(46, 204, 113, 0.07);
      border-color: rgba(46, 204, 113, 0.3);
    }
    .pp-feature-pane.pp-pane-disabled .pp-setting-card:not(.pp-enable-card) {
      opacity: 0.5;
    }
    .pp-setting-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      min-width: 0;
    }
    .pp-setting-title-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    .pp-setting-title {
      font-weight: 700;
      font-size: 0.96rem;
    }
    .pp-setting-hint {
      margin: 0;
      font-size: 0.84rem;
      line-height: 1.38;
      opacity: 0.78;
    }
    .pp-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 2px 7px;
      border-radius: 4px;
    }
    .pp-badge-world {
      background: rgba(230, 126, 34, 0.22);
      border: 1px solid rgba(230, 126, 34, 0.65);
      color: #f5b041;
    }
    .pp-badge-client {
      background: rgba(52, 152, 219, 0.2);
      border: 1px solid rgba(52, 152, 219, 0.6);
      color: #85c1e9;
    }
    .pp-setting-control {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 0 0 auto;
    }
    .pp-setting-control select {
      min-width: 240px;
      max-width: 300px;
    }
    .pp-setting-control input[type="checkbox"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }
    .pp-setting-control input[type="range"] {
      width: 130px;
    }
    .pp-setting-control input[type="number"] {
      width: 70px;
      text-align: center;
    }
    .pp-setting-control input[type="color"] {
      width: 38px;
      height: 30px;
      padding: 1px;
      border-radius: 4px;
      cursor: pointer;
    }
    .pp-setting-control input.pp-color-text {
      width: 86px;
      font-family: monospace;
      text-align: center;
    }
    .pp-settings-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 10px 16px;
      background: rgba(0, 0, 0, 0.32);
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      flex-shrink: 0;
    }
    .pp-settings-footer-left,
    .pp-settings-footer-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Strip any leading "[Feature Name]" prefix from a localized setting title.
 */
function cleanLabel(rawLabel) {
  return String(rawLabel || '').replace(/^\[[^\]]+\]\s*/, '');
}

/**
 * Normalize a color value (string or Foundry Color) into a 7-char `#rrggbb` hex string.
 */
function normalizeHexColor(val, fallback = '#ffffff') {
  try {
    if (!val) return fallback;
    const c = foundry.utils.Color.from(val);
    return c.valid ? c.css : fallback;
  } catch (_e) {
    const str = String(val || '').trim();
    return /^#[0-9a-fA-F]{6}$/.test(str) ? str : fallback;
  }
}

let activeSettingsAppInstance = null;

export class PurplePhoenixSettingsApp extends foundry.applications.api.ApplicationV2 {
  static initialFeature = 'hp-in-bar';

  static DEFAULT_OPTIONS = {
    id: 'pp-fvtt-tools-settings-center',
    classes: ['pp-settings-app'],
    tag: 'div',
    window: {
      title: 'PurplePhoenix FVTT Tools — Settings',
      icon: 'fa-solid fa-sliders',
      resizable: true
    },
    position: {
      width: 850,
      height: 640
    }
  };

  constructor(options = {}) {
    super(options);
    this.activeFeatureId = options.initialFeature || this.constructor.initialFeature || 'hp-in-bar';
  }

  getVisibleGroups() {
    const canModifyWorld = game.user.isGM || game.user.can('SETTINGS_MODIFY');
    const result = [];

    for (const group of FEATURE_GROUPS) {
      const visibleSettings = [];
      for (const key of group.keys) {
        const setting = game.settings.settings.get(`${MODULE_ID}.${key}`);
        if (!setting) continue;
        if (setting.scope === 'world' && !canModifyWorld) continue;
        visibleSettings.push({ key, setting });
      }
      if (visibleSettings.length > 0) {
        result.push({
          ...group,
          visibleSettings
        });
      }
    }
    return result;
  }

  async _renderHTML(_context, _options) {
    ensureSettingsCenterStyles();
    const canModifyWorld = game.user.isGM || game.user.can('SETTINGS_MODIFY');
    const groups = this.getVisibleGroups();
    if (!groups.some(g => g.id === this.activeFeatureId) && groups.length > 0) {
      this.activeFeatureId = groups[0].id;
    }

    const sidebarButtonsHtml = groups
      .map(g => {
        const isActive = g.id === this.activeFeatureId ? 'active' : '';
        const title = game.i18n.localize(g.titleKey);
        let isEnabled = true;
        try {
          isEnabled = Boolean(game.settings.get(MODULE_ID, g.enableKey));
        } catch (_e) {
          isEnabled = true;
        }
        return `
          <button type="button" class="pp-sidebar-tab ${isActive}" data-feature-tab="${g.id}">
            <i class="${g.icon}" inert></i>
            <span class="pp-sidebar-tab-label">${foundry.utils.escapeHTML(title)}</span>
            <span class="pp-status-dot ${isEnabled ? '' : 'off'}" data-status-dot="${g.id}"></span>
          </button>
        `;
      })
      .join('');

    const panesHtml = groups
      .map(g => {
        const isActive = g.id === this.activeFeatureId ? 'active' : '';
        const title = game.i18n.localize(g.titleKey);
        const desc = game.i18n.localize(g.descKey);
        let isEnabled = true;
        try {
          isEnabled = Boolean(game.settings.get(MODULE_ID, g.enableKey));
        } catch (_e) {
          isEnabled = true;
        }

        const cardsHtml = g.visibleSettings.map(({ key, setting }) => this.#renderSettingCard(key, setting, g.enableKey)).join('');

        let extraInfoHtml = '';
        if (g.id === 'easy-flip') {
          extraInfoHtml = `
            <div class="pp-setting-card">
              <div class="pp-setting-info">
                <div class="pp-setting-title-row">
                  <span class="pp-setting-title">${foundry.utils.escapeHTML(game.i18n.localize('EASYFLIP.KeybindName'))}</span>
                </div>
                <p class="pp-setting-hint">${foundry.utils.escapeHTML(game.i18n.localize('SETTINGSUI.KeybindInfoHint'))}</p>
              </div>
              <div class="pp-setting-control">
                <button type="button" data-action="openControlsConfig">
                  <i class="fa-solid fa-keyboard" inert></i>
                  <span>${foundry.utils.escapeHTML(game.i18n.localize('SETTINGSUI.OpenControlsBtn'))}</span>
                </button>
              </div>
            </div>
          `;
        } else if (g.id === 'simple-light' && canModifyWorld) {
          extraInfoHtml = `
            <div class="pp-setting-card">
              <div class="pp-setting-info">
                <div class="pp-setting-title-row">
                  <span class="pp-setting-title">${foundry.utils.escapeHTML(game.i18n.localize('SIMPLELIGHT.ConfigMenuName'))}</span>
                  <span class="pp-badge pp-badge-world" data-tooltip="${foundry.utils.escapeHTML(game.i18n.localize('SETTINGSUI.BadgeGMTooltip'))}">
                    ${foundry.utils.escapeHTML(game.i18n.localize('SETTINGSUI.BadgeGM'))}
                  </span>
                </div>
                <p class="pp-setting-hint">${foundry.utils.escapeHTML(game.i18n.localize('SIMPLELIGHT.ConfigMenuHint'))}</p>
              </div>
              <div class="pp-setting-control">
                <button type="button" data-action="openLightSettings">
                  <i class="fa-solid fa-lightbulb" inert></i>
                  <span>${foundry.utils.escapeHTML(game.i18n.localize('SIMPLELIGHT.ConfigMenuButton'))}</span>
                </button>
              </div>
            </div>
          `;
        }

        return `
          <section class="pp-feature-pane ${isActive} ${isEnabled ? '' : 'pp-pane-disabled'}" data-feature-pane="${g.id}">
            <div class="pp-pane-banner">
              <div class="pp-pane-banner-icon"><i class="${g.icon}" inert></i></div>
              <div class="pp-pane-banner-text">
                <h3 class="pp-pane-banner-title">${foundry.utils.escapeHTML(title)}</h3>
                <p class="pp-pane-banner-desc">${foundry.utils.escapeHTML(desc)}</p>
              </div>
            </div>
            ${cardsHtml}
            ${extraInfoHtml}
          </section>
        `;
      })
      .join('');

    return `
      <div class="pp-settings-shell">
        <div class="pp-settings-body">
          <aside class="pp-settings-sidebar">
            <div class="pp-sidebar-header">Features</div>
            ${sidebarButtonsHtml}
          </aside>
          <main class="pp-settings-content">
            ${panesHtml}
          </main>
        </div>
        <footer class="pp-settings-footer">
          <div class="pp-settings-footer-left">
            <button type="button" data-action="resetFeature">
              <i class="fa-solid fa-rotate-left" inert></i>
              <span>${foundry.utils.escapeHTML(game.i18n.localize('SETTINGSUI.ResetFeatureBtn'))}</span>
            </button>
          </div>
          <div class="pp-settings-footer-right">
            <button type="button" data-action="cancelSettings">
              <i class="fa-solid fa-xmark" inert></i>
              <span>${foundry.utils.escapeHTML(game.i18n.localize('Cancel'))}</span>
            </button>
            <button type="button" data-action="saveSettings" class="default">
              <i class="fa-solid fa-floppy-disk" inert></i>
              <span>${foundry.utils.escapeHTML(game.i18n.localize('SETTINGS.Save'))}</span>
            </button>
          </div>
        </footer>
      </div>
    `;
  }

  _replaceHTML(result, content, _options) {
    content.innerHTML = result;
  }

  #renderSettingCard(key, setting, enableKey) {
    const isEnableRow = key === enableKey;
    const isWorld = setting.scope === 'world';
    const label = cleanLabel(game.i18n.localize(setting.name || key));
    const hint = game.i18n.localize(setting.hint || '');
    const currentValue = game.settings.get(MODULE_ID, key);

    const badgeText = isWorld
      ? game.i18n.localize('SETTINGSUI.BadgeGM')
      : game.i18n.localize('SETTINGSUI.BadgeClient');
    const badgeTip = isWorld
      ? game.i18n.localize('SETTINGSUI.BadgeGMTooltip')
      : game.i18n.localize('SETTINGSUI.BadgeClientTooltip');

    let controlHtml = '';
    const isColorField = setting.type instanceof foundry.data.fields.ColorField || key.toLowerCase().includes('color');

    if (setting.type === Boolean) {
      const checked = currentValue ? 'checked' : '';
      controlHtml = `<input type="checkbox" data-setting-key="${key}" data-setting-type="boolean" ${checked}>`;
    } else if (setting.choices) {
      const optionsHtml = Object.entries(setting.choices)
        .map(([val, locKey]) => {
          const selected = String(currentValue) === String(val) ? 'selected' : '';
          return `<option value="${foundry.utils.escapeHTML(val)}" ${selected}>${foundry.utils.escapeHTML(game.i18n.localize(locKey))}</option>`;
        })
        .join('');
      controlHtml = `<select data-setting-key="${key}" data-setting-type="string">${optionsHtml}</select>`;
    } else if (isColorField) {
      const hex = normalizeHexColor(currentValue, normalizeHexColor(setting.default, '#ffffff'));
      controlHtml = `
        <input type="color" data-color-picker-for="${key}" value="${hex}">
        <input type="text" class="pp-color-text" data-setting-key="${key}" data-setting-type="color" value="${hex}">
      `;
    } else if (setting.type === Number && setting.range) {
      const { min = 0, max = 100, step = 1 } = setting.range;
      const val = Number.isFinite(Number(currentValue)) ? Number(currentValue) : Number(setting.default ?? min);
      controlHtml = `
        <input type="range" data-range-for="${key}" min="${min}" max="${max}" step="${step}" value="${val}">
        <input type="number" data-setting-key="${key}" data-setting-type="number" min="${min}" max="${max}" step="${step}" value="${val}">
      `;
    } else if (setting.type === Number) {
      const val = Number.isFinite(Number(currentValue)) ? Number(currentValue) : Number(setting.default ?? 1);
      controlHtml = `
        <input type="number" data-setting-key="${key}" data-setting-type="number" min="0.5" max="100" step="0.5" value="${val}">
      `;
    } else {
      controlHtml = `<input type="text" data-setting-key="${key}" data-setting-type="string" value="${foundry.utils.escapeHTML(String(currentValue ?? ''))}">`;
    }

    return `
      <div class="pp-setting-card ${isEnableRow ? 'pp-enable-card' : ''}">
        <div class="pp-setting-info">
          <div class="pp-setting-title-row">
            <span class="pp-setting-title">${foundry.utils.escapeHTML(label)}</span>
            <span class="pp-badge ${isWorld ? 'pp-badge-world' : 'pp-badge-client'}" data-tooltip="${foundry.utils.escapeHTML(badgeTip)}">
              ${foundry.utils.escapeHTML(badgeText)}
            </span>
          </div>
          <p class="pp-setting-hint">${foundry.utils.escapeHTML(hint)}</p>
        </div>
        <div class="pp-setting-control">
          ${controlHtml}
        </div>
      </div>
    `;
  }

  async _onRender(_context, _options) {
    activeSettingsAppInstance = this;
    const root = this.element;
    if (!root) return;

    // 1. Sidebar tab switching
    root.querySelectorAll('.pp-sidebar-tab[data-feature-tab]').forEach(btn => {
      btn.addEventListener('click', ev => {
        ev.preventDefault();
        const featureId = btn.dataset.featureTab;
        this.switchToFeature(featureId);
      });
    });

    // 2. Sync range sliders and number inputs
    root.querySelectorAll('input[type="range"][data-range-for]').forEach(rangeInput => {
      const key = rangeInput.dataset.rangeFor;
      const numInput = root.querySelector(`input[data-setting-key="${key}"]`);
      if (!numInput) return;
      rangeInput.addEventListener('input', () => {
        numInput.value = rangeInput.value;
      });
      numInput.addEventListener('input', () => {
        rangeInput.value = numInput.value;
      });
    });

    // 3. Sync color pickers and hex text inputs
    root.querySelectorAll('input[type="color"][data-color-picker-for]').forEach(colorInput => {
      const key = colorInput.dataset.colorPickerFor;
      const textInput = root.querySelector(`input[data-setting-key="${key}"]`);
      if (!textInput) return;
      colorInput.addEventListener('input', () => {
        textInput.value = colorInput.value;
      });
      textInput.addEventListener('change', () => {
        const hex = normalizeHexColor(textInput.value, colorInput.value);
        textInput.value = hex;
        colorInput.value = hex;
      });
    });

    // 4. Live enable/disable dimming & sidebar status dot update
    for (const group of FEATURE_GROUPS) {
      const enableInput = root.querySelector(`input[data-setting-key="${group.enableKey}"]`);
      if (!enableInput) continue;
      enableInput.addEventListener('change', () => {
        const pane = root.querySelector(`.pp-feature-pane[data-feature-pane="${group.id}"]`);
        const dot = root.querySelector(`.pp-status-dot[data-status-dot="${group.id}"]`);
        pane?.classList.toggle('pp-pane-disabled', !enableInput.checked);
        dot?.classList.toggle('off', !enableInput.checked);
      });
    }

    // 5. Open Configure Controls button (for Easy Flip Token)
    root.querySelector('[data-action="openControlsConfig"]')?.addEventListener('click', ev => {
      ev.preventDefault();
      const ControlsApp = foundry.applications?.sidebar?.apps?.ControlsConfig;
      if (ControlsApp) new ControlsApp().render({ force: true });
    });

    // 5b. Open Simple Light Configuration window
    root.querySelector('[data-action="openLightSettings"]')?.addEventListener('click', ev => {
      ev.preventDefault();
      openSimpleLightSettings();
    });

    // 6. Reset current feature defaults
    root.querySelector('[data-action="resetFeature"]')?.addEventListener('click', ev => {
      ev.preventDefault();
      this.#resetCurrentFeatureDefaults();
    });

    // 7. Cancel button
    root.querySelector('[data-action="cancelSettings"]')?.addEventListener('click', ev => {
      ev.preventDefault();
      this.close();
    });

    // 8. Save button
    root.querySelector('[data-action="saveSettings"]')?.addEventListener('click', async ev => {
      ev.preventDefault();
      await this.#saveAllSettings();
      await this.close();
    });
  }

  switchToFeature(featureId) {
    this.activeFeatureId = featureId;
    const root = this.element;
    if (!root) return;
    root.querySelectorAll('.pp-sidebar-tab[data-feature-tab]').forEach(b => {
      b.classList.toggle('active', b.dataset.featureTab === featureId);
    });
    root.querySelectorAll('.pp-feature-pane[data-feature-pane]').forEach(p => {
      p.classList.toggle('active', p.dataset.featurePane === featureId);
    });
  }

  #resetCurrentFeatureDefaults() {
    const root = this.element;
    if (!root) return;
    const group = FEATURE_GROUPS.find(g => g.id === this.activeFeatureId);
    if (!group) return;

    for (const key of group.keys) {
      const setting = game.settings.settings.get(`${MODULE_ID}.${key}`);
      const input = root.querySelector(`[data-setting-key="${key}"]`);
      if (!setting || !input) continue;

      const def = setting.default;
      if (input.type === 'checkbox') {
        input.checked = Boolean(def);
        input.dispatchEvent(new Event('change'));
      } else {
        const strVal = input.dataset.settingType === 'color' ? normalizeHexColor(def, '#ffffff') : String(def);
        input.value = strVal;
        const range = root.querySelector(`input[type="range"][data-range-for="${key}"]`);
        if (range) range.value = strVal;
        const color = root.querySelector(`input[type="color"][data-color-picker-for="${key}"]`);
        if (color) color.value = strVal;
      }
    }
    ui.notifications.info(game.i18n.localize('SETTINGS.ResetInfo'));
  }

  async #saveAllSettings() {
    const root = this.element;
    if (!root) return;

    for (const input of Array.from(root.querySelectorAll('[data-setting-key]'))) {
      const key = input.dataset.settingKey;
      const type = input.dataset.settingType;
      const setting = game.settings.settings.get(`${MODULE_ID}.${key}`);
      if (!setting) continue;

      let value;
      if (type === 'boolean') {
        value = Boolean(input.checked);
      } else if (type === 'number') {
        const raw = Number(input.value);
        value = Number.isFinite(raw) ? raw : Number(setting.default ?? 0);
        if (setting.range) {
          value = Math.clamp(value, setting.range.min, setting.range.max);
        }
      } else if (type === 'color') {
        value = normalizeHexColor(input.value, normalizeHexColor(setting.default, '#ffffff'));
      } else {
        value = input.value;
      }

      const current = game.settings.get(MODULE_ID, key);
      if (String(current) !== String(value)) {
        await game.settings.set(MODULE_ID, key, value);
      }
    }

    ui.notifications.info(game.i18n.localize('SETTINGSUI.SavedNotification'));
  }
}

/**
 * Helper to open the single Settings Center window and switch it to `featureId`.
 */
function createFeatureMenuClass(featureId) {
  return class extends PurplePhoenixSettingsApp {
    static initialFeature = featureId;

    async render(options = {}, _options = {}) {
      if (activeSettingsAppInstance && activeSettingsAppInstance.rendered) {
        activeSettingsAppInstance.switchToFeature(featureId);
        activeSettingsAppInstance.bringToFront?.();
        return activeSettingsAppInstance;
      }
      this.activeFeatureId = featureId;
      return super.render(options, _options);
    }
  };
}

Hooks.once('init', () => {
  // Register a clean submenu button for each feature in Foundry's standard Settings window
  for (const group of FEATURE_GROUPS) {
    game.settings.registerMenu(MODULE_ID, `menu_${group.id}`, {
      name: group.titleKey,
      label: 'SETTINGSUI.ConfigureButton',
      hint: group.descKey,
      icon: group.icon,
      type: createFeatureMenuClass(group.id),
      restricted: Boolean(group.restricted)
    });
  }
});
