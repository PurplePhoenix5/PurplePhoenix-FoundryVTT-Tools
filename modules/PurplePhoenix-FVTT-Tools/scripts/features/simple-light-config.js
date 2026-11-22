// Simple Light preset configuration, defaults, validation, and macro API
export const MODULE_ID = 'PurplePhoenix-FVTT-Tools';
export const LIGHT_CONFIG_SETTING = 'simpleLightConfig';
export const DEFAULT_LIGHT_ICON = 'icons/svg/light.svg';
export const EXTINGUISH_ICON = 'icons/svg/light-off.svg';

export const DEFAULT_LIGHT_ADVANCED = {
  advanced: false,
  coloration: 1,
  luminosity: 0.5,
  attenuation: 0.5,
  saturation: 0,
  contrast: 0,
  shadows: 0
};

export const DEFAULT_LIGHT_CONFIG = {
  playerVisibility: {},
  userVisibility: {},
  types: [
    {
      ...DEFAULT_LIGHT_ADVANCED,
      id: 'mundane',
      name: 'Mundane',
      color: '#d98e26',
      alpha: 0.25,
      luminosity: 0.5,
      attenuation: 0.5,
      negative: false,
      animation: 'torch',
      speed: 2,
      intensity: 2
    },
    {
      ...DEFAULT_LIGHT_ADVANCED,
      id: 'magic',
      name: 'Magic',
      color: '#a6bbdd',
      alpha: 0.2,
      luminosity: 0.5,
      attenuation: 0.5,
      negative: false,
      animation: '',
      speed: 1,
      intensity: 1
    },
    {
      ...DEFAULT_LIGHT_ADVANCED,
      id: 'darkness',
      name: 'Darkness',
      color: '#a6bbdd',
      alpha: 0.2,
      luminosity: 0.5,
      attenuation: 0.5,
      negative: true,
      animation: '',
      speed: 1,
      intensity: 1
    }
  ],
  lights: [
    {
      id: 'torch',
      name: 'Torch',
      type: 'mundane',
      bright: 20,
      dim: 40,
      angle: 360,
      minutes: 60,
      img: `modules/${MODULE_ID}/icons/torch.svg`,
      visible: true
    },
    {
      id: 'light',
      name: 'Light Spell',
      type: 'magic',
      bright: 20,
      dim: 40,
      angle: 360,
      minutes: 60,
      img: `modules/${MODULE_ID}/icons/light-spell.svg`,
      visible: true
    },
    {
      id: 'dayLight',
      name: 'Daylight',
      type: 'magic',
      bright: 60,
      dim: 120,
      angle: 360,
      minutes: 60,
      img: 'icons/svg/sun.svg',
      visible: true
    },
    {
      id: 'candle',
      name: 'Candle',
      type: 'mundane',
      bright: 5,
      dim: 10,
      angle: 360,
      minutes: 60,
      img: `modules/${MODULE_ID}/icons/candle.svg`,
      visible: true
    },
    {
      id: 'lamp',
      name: 'Lamp',
      type: 'mundane',
      bright: 15,
      dim: 45,
      angle: 360,
      minutes: 360,
      img: `modules/${MODULE_ID}/icons/lamp.svg`,
      visible: true
    },
    {
      id: 'lantern',
      name: 'Hooded Lantern',
      type: 'mundane',
      bright: 30,
      dim: 60,
      angle: 360,
      minutes: 360,
      img: `modules/${MODULE_ID}/icons/lantern.svg`,
      visible: true
    },
    {
      id: 'hooded',
      name: 'Hooded (Dimmed)',
      type: 'mundane',
      bright: 0,
      dim: 5,
      angle: 360,
      minutes: 360,
      img: `modules/${MODULE_ID}/icons/hooded.svg`,
      visible: true
    },
    {
      id: 'bullseye',
      name: 'Bullseye Lantern',
      type: 'mundane',
      bright: 60,
      dim: 120,
      angle: 60,
      minutes: 360,
      img: `modules/${MODULE_ID}/icons/bullseye.svg`,
      visible: true
    },
    {
      id: 'darkness',
      name: 'Darkness Spell',
      type: 'darkness',
      bright: 15,
      dim: 0,
      angle: 360,
      minutes: 10,
      img: 'icons/svg/blind.svg',
      visible: true
    }
  ]
};

export function getLightConfig() {
  let stored = null;
  try {
    stored = game.settings.get(MODULE_ID, LIGHT_CONFIG_SETTING);
  } catch (_e) {
    stored = null;
  }
  const config = foundry.utils.deepClone(stored ?? DEFAULT_LIGHT_CONFIG);
  config.playerVisibility ??= {};
  config.userVisibility ??= {};
  config.types = (Array.isArray(config.types) && config.types.length ? config.types : DEFAULT_LIGHT_CONFIG.types).map(
    type => ({ ...DEFAULT_LIGHT_ADVANCED, ...type })
  );

  const savedLights = Array.isArray(config.lights) ? config.lights : [];
  // Fill missing built-in fields while preserving saved edits and custom icons.
  config.lights = [
    ...DEFAULT_LIGHT_CONFIG.lights.map(light => ({
      ...light,
      ...(savedLights.find(saved => saved.id === light.id) || {})
    })),
    ...savedLights.filter(light => !DEFAULT_LIGHT_CONFIG.lights.some(row => row.id === light.id))
  ];
  return config;
}

export function getAnimations(negative) {
  return (negative ? CONFIG.Canvas?.darknessAnimations : CONFIG.Canvas?.lightAnimations) || {};
}

export function getColorationTechniques() {
  return Object.values(foundry.canvas?.rendering?.shaders?.AdaptiveLightingShader?.SHADER_TECHNIQUES || {});
}

export function getPlayerLightVisibility(config, lightId, userId) {
  return config.userVisibility?.[userId]?.[lightId] ?? config.playerVisibility?.[lightId] ?? true;
}

export function getLightPresets(config = getLightConfig(), user = game.user) {
  const types = new Map(config.types.map(type => [type.id, type]));
  const fallbackType = config.types[0] || DEFAULT_LIGHT_CONFIG.types[0];
  const extinguishLabel = game.i18n.has?.('SIMPLELIGHT.Extinguish')
    ? game.i18n.localize('SIMPLELIGHT.Extinguish')
    : 'Extinguish';

  return [
    {
      action: 'none',
      label: extinguishLabel,
      img: EXTINGUISH_ICON,
      bright: 0,
      dim: 0,
      angle: 360,
      negative: false,
      duration: null
    },
    ...config.lights
      .filter(light => light.visible && (!user || user.isGM || getPlayerLightVisibility(config, light.id, user.id)))
      .map(light => {
        const type = types.get(light.type) ?? fallbackType;
        const defaultRow = DEFAULT_LIGHT_CONFIG.lights.find(row => row.id === light.id);
        return {
          action: light.id,
          label: light.name,
          img: light.img || defaultRow?.img || DEFAULT_LIGHT_ICON,
          bright: light.bright,
          dim: light.dim,
          angle: light.angle,
          negative: Boolean(type.negative),
          duration: light.minutes ? light.minutes * 60 : null,
          light: {
            bright: light.bright,
            dim: light.dim,
            angle: light.angle,
            color: type.color || null,
            alpha: type.alpha,
            luminosity: type.luminosity,
            attenuation: type.attenuation,
            coloration: type.coloration ?? DEFAULT_LIGHT_ADVANCED.coloration,
            saturation: type.saturation ?? DEFAULT_LIGHT_ADVANCED.saturation,
            contrast: type.contrast ?? DEFAULT_LIGHT_ADVANCED.contrast,
            shadows: type.shadows ?? DEFAULT_LIGHT_ADVANCED.shadows,
            negative: Boolean(type.negative),
            animation: {
              type: type.animation || null,
              speed: type.speed,
              intensity: type.intensity
            }
          }
        };
      })
  ];
}

export function validateLightConfig(config) {
  const checkRange = (value, min, max, label) => {
    if (!Number.isFinite(value) || value < min || value > max) {
      throw new Error(game.i18n.format('SIMPLELIGHT.Errors.Range', { label, min, max }));
    }
  };

  for (const type of config.types) {
    if (!type.name?.trim()) {
      throw new Error(game.i18n.localize('SIMPLELIGHT.Errors.TypeNameRequired'));
    }
    if (type.color && !/^#[0-9a-f]{6}$/i.test(type.color)) {
      throw new Error(game.i18n.format('SIMPLELIGHT.Errors.InvalidHexColor', { name: type.name }));
    }
    for (const key of ['alpha', 'luminosity', 'attenuation']) {
      checkRange(type[key], 0, 1, `${type.name}: ${key}`);
    }
    for (const key of ['saturation', 'contrast']) {
      checkRange(type[key] ?? DEFAULT_LIGHT_ADVANCED[key], -1, 1, `${type.name}: ${key}`);
    }
    checkRange(type.shadows ?? DEFAULT_LIGHT_ADVANCED.shadows, 0, 1, `${type.name}: shadows`);

    const coloration = type.coloration ?? DEFAULT_LIGHT_ADVANCED.coloration;
    const techniques = getColorationTechniques();
    if (!Number.isInteger(coloration) || (techniques.length && !techniques.some(t => t.id === coloration))) {
      throw new Error(game.i18n.format('SIMPLELIGHT.Errors.InvalidColoration', { name: type.name }));
    }

    checkRange(type.speed, 0, 10, `${type.name}: animation speed`);
    checkRange(type.intensity, 1, 10, `${type.name}: animation intensity`);
    if (!Number.isInteger(type.speed) || !Number.isInteger(type.intensity)) {
      throw new Error(game.i18n.localize('SIMPLELIGHT.Errors.AnimationWholeNumbers'));
    }

    const anims = getAnimations(type.negative);
    if (type.animation && Object.keys(anims).length && !Object.hasOwn(anims, type.animation)) {
      throw new Error(game.i18n.format('SIMPLELIGHT.Errors.InvalidAnimation', { name: type.name }));
    }
  }

  for (const light of config.lights) {
    if (!light.name?.trim()) {
      throw new Error(game.i18n.localize('SIMPLELIGHT.Errors.LightNameRequired'));
    }
    if (!config.types.some(type => type.id === light.type)) {
      throw new Error(game.i18n.format('SIMPLELIGHT.Errors.InvalidLightType', { name: light.name }));
    }
    for (const key of ['bright', 'dim', 'minutes']) {
      checkRange(light[key], 0, 1000000, `${light.name}: ${key}`);
    }
    if (!Number.isInteger(light.minutes * 60)) {
      throw new Error(game.i18n.format('SIMPLELIGHT.Errors.DurationWholeSeconds', { name: light.name }));
    }
    checkRange(light.angle, 0, 360, `${light.name}: angle`);
  }
}

// Serialize writes so macro calls made together cannot overwrite one another's settings.
let pendingApiWrite = Promise.resolve();

function addEntries(section, entries) {
  const operation = pendingApiWrite.then(async () => {
    try {
      if (!game.user.isGM) {
        throw new Error(game.i18n.localize('SIMPLELIGHT.Errors.GmOnlyMacro'));
      }
      const additions = Array.isArray(entries) ? entries : [entries];
      if (!additions.length) return [];

      const config = getLightConfig();
      const ids = new Set();
      for (const entry of additions) {
        if (!entry || typeof entry.id !== 'string' || !entry.id.trim() || entry.id !== entry.id.trim()) {
          throw new Error(game.i18n.localize('SIMPLELIGHT.Errors.InvalidEntryId'));
        }
        if (section === 'lights' && (entry.id === 'none' || entry.id === 'extinguish')) {
          throw new Error(game.i18n.format('SIMPLELIGHT.Errors.ReservedLightId', { id: entry.id }));
        }
        if (ids.has(entry.id)) {
          throw new Error(game.i18n.format('SIMPLELIGHT.Errors.DuplicateId', { id: entry.id }));
        }
        ids.add(entry.id);

        const index = config[section].findIndex(row => row.id === entry.id);
        const defaults =
          section === 'types'
            ? DEFAULT_LIGHT_CONFIG.types[1]
            : { ...DEFAULT_LIGHT_CONFIG.lights[0], img: DEFAULT_LIGHT_ICON };
        const data = {
          ...foundry.utils.deepClone(index === -1 ? defaults : config[section][index]),
          ...foundry.utils.deepClone(entry)
        };
        if (index === -1) config[section].push(data);
        else config[section][index] = data;
      }

      validateLightConfig(config);
      await game.settings.set(MODULE_ID, LIGHT_CONFIG_SETTING, config);

      const hud = canvas.tokens?.hud;
      if (hud?.rendered) await hud.render();

      const msgKey = section === 'types' ? 'SIMPLELIGHT.SavedTypesMacro' : 'SIMPLELIGHT.SavedLightsMacro';
      ui.notifications.info(game.i18n.format(msgKey, { count: additions.length }));
      return foundry.utils.deepClone(config[section].filter(row => ids.has(row.id)));
    } catch (error) {
      ui.notifications.error(error.message);
      throw error;
    }
  });

  pendingApiWrite = operation.catch(() => {});
  return operation;
}

/** Add or update light types by ID. Accepts one object or an array; await before adding their lights. */
export function addLightTypeMacro(lightTypes) {
  return addEntries('types', lightTypes);
}

/** Add or update light presets by ID. Accepts one object or an array; omitted fields keep existing values. */
export function addLightMacro(lights) {
  return addEntries('lights', lights);
}
