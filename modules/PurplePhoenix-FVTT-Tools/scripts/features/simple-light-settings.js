// Simple Light Configuration Application (ApplicationV2)
import {
  MODULE_ID,
  LIGHT_CONFIG_SETTING,
  DEFAULT_LIGHT_ICON,
  DEFAULT_LIGHT_CONFIG,
  getLightConfig,
  getAnimations,
  getColorationTechniques,
  getPlayerLightVisibility,
  validateLightConfig
} from './simple-light-config.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

let activeLightSettingsApp = null;

export default class SimpleLightSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  #draft = getLightConfig();

  static DEFAULT_OPTIONS = {
    id: 'pp-light-settings',
    classes: ['pp-light-settings'],
    tag: 'form',
    window: {
      title: 'SIMPLELIGHT.Settings.WindowTitle',
      icon: 'fa-solid fa-lightbulb',
      contentClasses: ['standard-form'],
      resizable: true
    },
    position: { width: 920 },
    form: { closeOnSubmit: false, handler: SimpleLightSettings.#save },
    actions: {
      addLight: SimpleLightSettings.#addLight,
      addType: SimpleLightSettings.#addType,
      toggleLight: SimpleLightSettings.#toggleLight,
      removeLight: SimpleLightSettings.#removeLight,
      removeType: SimpleLightSettings.#removeType,
      resetLight: SimpleLightSettings.#resetLight,
      resetType: SimpleLightSettings.#resetType,
      togglePlayerLight: SimpleLightSettings.#togglePlayerLight,
      resetPlayerLight: SimpleLightSettings.#resetPlayerLight
    }
  };

  static PARTS = {
    tabs: { template: 'templates/generic/tab-navigation.hbs' },
    body: { template: `modules/${MODULE_ID}/templates/light-settings.hbs` },
    footer: { template: 'templates/generic/form-footer.hbs' }
  };

  static TABS = {
    sheet: {
      tabs: [
        { id: 'lights', label: 'SIMPLELIGHT.Settings.TabLights', icon: 'fa-solid fa-lightbulb' },
        { id: 'types', label: 'SIMPLELIGHT.Settings.TabTypes', icon: 'fa-solid fa-palette' }
      ],
      initial: 'lights'
    }
  };

  _getTabsConfig(group) {
    const config = super._getTabsConfig(group);
    if (group !== 'sheet') return config;
    return {
      ...config,
      tabs: [
        ...config.tabs,
        { id: 'players', label: 'SIMPLELIGHT.Settings.TabPlayers', icon: 'fa-solid fa-users' },
        ...(game.users ?? [])
          .filter(user => !user.isGM)
          .map(user => ({
            id: `user-${user.id}`,
            label: user.name,
            icon: 'fa-solid fa-user',
            userId: user.id
          }))
      ]
    };
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return Object.assign(context, {
      tabClasses: 'pp-light-tabs',
      verticalTabs: true,
      visibilityTabs: Object.values(context.tabs)
        .filter(tab => tab.id === 'players' || tab.userId)
        .map(tab => ({
          ...tab,
          lights: this.#draft.lights.map(light => ({
            id: light.id,
            name: light.name,
            img: light.img || DEFAULT_LIGHT_ICON,
            globallyHidden: !light.visible,
            visible: getPlayerLightVisibility(this.#draft, light.id, tab.userId),
            overridden: typeof this.#draft.userVisibility[tab.userId]?.[light.id] === 'boolean'
          }))
        })),
      lights: this.#draft.lights.map(light => ({
        ...light,
        img: light.img || DEFAULT_LIGHT_ICON,
        custom: !DEFAULT_LIGHT_CONFIG.lights.some(row => row.id === light.id),
        types: this.#draft.types.map(type => ({
          id: type.id,
          name: type.name,
          selected: type.id === light.type
        }))
      })),
      types: this.#draft.types.map(type => {
        const animations = Object.entries(getAnimations(type.negative)).map(([id, animation]) => ({
          id,
          name: game.i18n.localize(animation.label),
          selected: id === type.animation
        }));
        if (type.animation && !animations.some(animation => animation.id === type.animation)) {
          animations.push({
            id: type.animation,
            name: `${type.animation} (${game.i18n.localize('SIMPLELIGHT.Settings.Unavailable')})`,
            selected: true
          });
        }
        const colorationTechniques = getColorationTechniques().map(technique => ({
          id: technique.id,
          name: game.i18n.localize(technique.label),
          selected: technique.id === type.coloration
        }));
        return {
          ...type,
          animations,
          colorationTechniques,
          custom: !DEFAULT_LIGHT_CONFIG.types.some(row => row.id === type.id)
        };
      }),
      buttons: [
        { type: 'button', action: 'close', icon: 'fa-solid fa-xmark', label: 'Cancel' },
        { type: 'submit', icon: 'fa-solid fa-floppy-disk', label: 'SETTINGS.Save' }
      ]
    });
  }

  #read() {
    for (const section of ['lights', 'types']) {
      for (const row of this.element.querySelectorAll(`[data-section="${section}"] [data-row]`)) {
        const data = this.#draft[section].find(entry => entry.id === row.dataset.row);
        if (!data) continue;
        for (const input of row.querySelectorAll('[data-field]')) {
          const field = input.dataset.field;
          const isCheckbox = input.localName === 'input' && input.type === 'checkbox';
          const isNumber =
            (input.localName === 'input' && input.type === 'number') ||
            input.localName === 'range-picker' ||
            field === 'coloration';

          if (isCheckbox) {
            data[field] = Boolean(input.checked);
          } else if (isNumber) {
            data[field] = input.value === '' ? NaN : Number(input.value);
          } else {
            data[field] = String(input.value ?? '').trim();
          }
        }
      }
    }
  }

  _onRender(context, options) {
    super._onRender(context, options);
    activeLightSettingsApp = this;

    // Preserve the draft before updating choices or expanding advanced controls.
    for (const input of this.element.querySelectorAll(
      '[data-section="types"] [data-field="name"], [data-field="negative"], [data-field="advanced"]'
    )) {
      input.addEventListener('change', () => {
        this.#read();
        if (input.dataset.field === 'negative') {
          const type = this.#draft.types.find(row => row.id === input.closest('[data-row]').dataset.row);
          if (type && !Object.hasOwn(getAnimations(type.negative), type.animation)) type.animation = '';
        }
        this.render();
      });
    }

    // Live update icon preview when changing a light's image path or file picker.
    for (const picker of this.element.querySelectorAll('[data-section="lights"] [data-field="img"]')) {
      const updatePreview = () => {
        const row = picker.closest('[data-row]');
        const preview = row?.querySelector('.pp-light-icon-preview');
        if (preview) preview.src = String(picker.value || '').trim() || DEFAULT_LIGHT_ICON;
      };
      picker.addEventListener('change', updatePreview);
      picker.addEventListener('input', updatePreview);
    }
  }

  _onClose(options) {
    if (activeLightSettingsApp === this) activeLightSettingsApp = null;
    return super._onClose?.(options);
  }

  static #addLight() {
    this.#read();
    this.#draft.lights.push({
      id: `custom-${foundry.utils.randomID()}`,
      name: game.i18n.localize('SIMPLELIGHT.Settings.NewLightName'),
      type: this.#draft.types[0]?.id || DEFAULT_LIGHT_CONFIG.types[0].id,
      bright: 20,
      dim: 40,
      angle: 360,
      minutes: 60,
      img: DEFAULT_LIGHT_ICON,
      visible: true
    });
    this.render();
  }

  static #addType() {
    this.#read();
    this.#draft.types.push({
      ...foundry.utils.deepClone(DEFAULT_LIGHT_CONFIG.types[1]),
      id: `custom-${foundry.utils.randomID()}`,
      name: game.i18n.localize('SIMPLELIGHT.Settings.NewTypeName')
    });
    this.render();
  }

  static #toggleLight(_event, target) {
    this.#read();
    const light = this.#draft.lights.find(row => row.id === target.closest('[data-row]').dataset.row);
    if (!light) return;
    light.visible = !light.visible;
    this.render();
  }

  static #removeLight(_event, target) {
    this.#read();
    const id = target.closest('[data-row]').dataset.row;
    this.#draft.lights = this.#draft.lights.filter(row => row.id !== id);
    delete this.#draft.playerVisibility[id];
    for (const visibility of Object.values(this.#draft.userVisibility)) delete visibility[id];
    this.render();
  }

  static #resetLight(_event, target) {
    this.#read();
    const id = target.closest('[data-row]').dataset.row;
    const defaults = DEFAULT_LIGHT_CONFIG.lights.find(row => row.id === id);
    if (!defaults) return;
    const index = this.#draft.lights.findIndex(row => row.id === id);
    if (index !== -1) this.#draft.lights[index] = foundry.utils.deepClone(defaults);
    this.render();
  }

  static #resetType(_event, target) {
    this.#read();
    const id = target.closest('[data-row]').dataset.row;
    const defaults = DEFAULT_LIGHT_CONFIG.types.find(row => row.id === id);
    if (!defaults) return;
    const index = this.#draft.types.findIndex(row => row.id === id);
    if (index !== -1) this.#draft.types[index] = foundry.utils.deepClone(defaults);
    this.render();
  }

  static #togglePlayerLight(_event, target) {
    this.#read();
    const id = target.closest('[data-row]').dataset.row;
    const userId = target.closest('[data-visibility]').dataset.userId;
    const visible = getPlayerLightVisibility(this.#draft, id, userId);
    const visibility = userId ? (this.#draft.userVisibility[userId] ??= {}) : this.#draft.playerVisibility;
    visibility[id] = !visible;
    this.render();
  }

  static #resetPlayerLight(_event, target) {
    this.#read();
    const id = target.closest('[data-row]').dataset.row;
    const userId = target.closest('[data-visibility]').dataset.userId;
    if (this.#draft.userVisibility[userId]) delete this.#draft.userVisibility[userId][id];
    this.render();
  }

  static #removeType(_event, target) {
    this.#read();
    const id = target.closest('[data-row]').dataset.row;
    if (this.#draft.lights.some(light => light.type === id)) {
      return ui.notifications.warn(game.i18n.localize('SIMPLELIGHT.Errors.TypeInUse'));
    }
    this.#draft.types = this.#draft.types.filter(row => row.id !== id);
    this.render();
  }

  static async #save() {
    this.#read();
    try {
      validateLightConfig(this.#draft);
      await game.settings.set(MODULE_ID, LIGHT_CONFIG_SETTING, this.#draft);
      if (canvas?.hud?.token?.rendered) canvas.hud.token.render();
      ui.notifications.info(game.i18n.localize('SIMPLELIGHT.Settings.SavedNotification'));
      await this.close();
    } catch (error) {
      ui.notifications.error(error.message);
    }
  }
}

export function openSimpleLightSettings() {
  if (activeLightSettingsApp?.rendered) {
    activeLightSettingsApp.bringToFront?.();
    return activeLightSettingsApp;
  }
  const app = new SimpleLightSettings();
  app.render({ force: true });
  return app;
}
