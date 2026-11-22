// Simple Light feature — configurable Token HUD light palette on the left HUD column
import {
  MODULE_ID,
  LIGHT_CONFIG_SETTING,
  DEFAULT_LIGHT_CONFIG,
  getLightPresets,
  addLightTypeMacro,
  addLightMacro
} from './simple-light-config.js';
import { openSimpleLightSettings } from './simple-light-settings.js';

function refreshTokenHud() {
  const tokenHud = canvas?.hud?.token;
  if (!tokenHud) return;
  if (!isEnabled() && tokenHud.activePalette === 'simple-light') {
    tokenHud.togglePalette(null);
  }
  if (tokenHud.rendered) tokenHud.render();
}

function isEnabled() {
  return (
    Boolean(game.settings.get(MODULE_ID, 'enableSimpleLight')) &&
    (game.user.isGM || Boolean(game.settings.get(MODULE_ID, 'simpleLightAllowPlayers')))
  );
}

function canUpdateToken(tokenDoc) {
  return Boolean(tokenDoc?.isOwner && tokenDoc.canUserModify(game.user, 'update'));
}

function isManagedLightEffect(effect) {
  return Boolean(
    effect.getFlag(MODULE_ID, 'lightPicker') ||
      effect.getFlag('mini-tweaks', 'lightPicker') ||
      effect.getFlag('mini-tweaks', 'lightPickerTorch') === true
  );
}

async function applyDnd5eActorLight(actor, preset) {
  const ownExisting = actor.effects.filter(e => Boolean(e.getFlag(MODULE_ID, 'lightPicker')));
  const foreignExisting = actor.effects.filter(
    e => !e.getFlag(MODULE_ID, 'lightPicker') && isManagedLightEffect(e)
  );

  if (preset.action === 'none') {
    const toDelete = [...ownExisting, ...foreignExisting].map(e => e.id);
    if (toDelete.length) await actor.deleteEmbeddedDocuments('ActiveEffect', toDelete);
    return toDelete.length > 0;
  }

  const effectData = {
    name: preset.label,
    img: preset.img,
    type: 'base',
    disabled: false,
    transfer: false,
    statuses: [],
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
    start: {
      time: game.time.worldTime,
      combat: null,
      combatant: null,
      initiative: null,
      round: null,
      turn: null
    },
    duration: { value: preset.duration, units: 'seconds', expiry: null, expired: false },
    origin: actor.uuid,
    system: {
      changes: Object.entries(preset.light).map(([key, value]) => ({
        key: `token.light.${key}`,
        type: 'override',
        value: foundry.utils.deepClone(value),
        phase: 'initial',
        priority: 50
      }))
    },
    flags: { [MODULE_ID]: { lightPicker: preset.action } }
  };

  if (foreignExisting.length) {
    await actor.deleteEmbeddedDocuments('ActiveEffect', foreignExisting.map(e => e.id));
  }

  if (ownExisting.length) {
    await ownExisting[0].update(effectData);
    if (ownExisting.length > 1) {
      await actor.deleteEmbeddedDocuments('ActiveEffect', ownExisting.slice(1).map(e => e.id));
    }
  } else {
    effectData._id = foundry.utils.randomID();
    await actor.createEmbeddedDocuments('ActiveEffect', [effectData]);
  }
  return true;
}

/**
 * Apply a configured light preset (or 'none' to extinguish) to one or more TokenDocuments.
 * @param {TokenDocument[]} tokens
 * @param {string} action
 */
export async function applyLightPreset(tokens, action) {
  const normalizedAction = action === 'extinguish' ? 'none' : action;
  const presets = getLightPresets();
  const preset = presets.find(entry => entry.action === normalizedAction);
  if (!preset || !isEnabled() || !tokens.length) return false;

  const scene = tokens[0].parent;
  if (
    scene !== canvas.scene ||
    tokens.some(token => token.parent !== scene || scene.tokens.get(token.id) !== token || !canUpdateToken(token))
  ) {
    ui.notifications.warn(game.i18n.localize('SIMPLELIGHT.Errors.TokensUnavailable'));
    return false;
  }

  const useDnd5eEffects = game.system.id === 'dnd5e';
  const actorTokens = useDnd5eEffects ? tokens.filter(t => t.actor) : [];
  const directTokens = useDnd5eEffects ? tokens.filter(t => !t.actor) : tokens;

  const actors = new Map(actorTokens.map(token => [token.actor.uuid, token.actor]));
  if (Array.from(actors.values()).some(actor => !actor.isOwner || !actor.canUserModify(game.user, 'update'))) {
    ui.notifications.warn(game.i18n.localize('SIMPLELIGHT.Errors.ActorsNoPermission'));
    return false;
  }

  for (const actor of actors.values()) {
    await applyDnd5eActorLight(actor, preset);
  }

  // Extinguish also clears any legacy direct token.light overrides (e.g. from pre-2.0 Simple Light).
  const directUpdates = [];
  const clearLight = {
    bright: 0,
    dim: 0,
    angle: 360,
    color: null,
    negative: false,
    animation: { type: null }
  };

  for (const token of directTokens) {
    directUpdates.push({
      _id: token.id,
      light: foundry.utils.deepClone(preset.action === 'none' ? clearLight : preset.light)
    });
  }

  if (preset.action === 'none') {
    for (const token of actorTokens) {
      const src = token._source?.light;
      if (src && (src.bright > 0 || src.dim > 0 || src.negative)) {
        directUpdates.push({ _id: token.id, light: foundry.utils.deepClone(clearLight) });
      }
    }
  }

  if (directUpdates.length) {
    await scene.updateEmbeddedDocuments('Token', directUpdates);
  }

  return true;
}

function formatPresetMeta(preset) {
  if (preset.action === 'none') {
    return game.i18n.localize('SIMPLELIGHT.ExtinguishDesc');
  }
  const parts = [];
  if (preset.negative) {
    const range = preset.bright || preset.dim;
    parts.push(game.i18n.format('SIMPLELIGHT.MetaDarkness', { range }));
  } else {
    parts.push(`${preset.bright} / ${preset.dim} ft.`);
  }
  if (preset.angle && preset.angle < 360) {
    parts.push(`${preset.angle}°`);
  }
  if (preset.duration) {
    const durStr =
      preset.duration % 3600 === 0
        ? game.i18n.format('SIMPLELIGHT.MetaHours', { count: preset.duration / 3600 })
        : game.i18n.format('SIMPLELIGHT.MetaMinutes', { count: Math.round(preset.duration / 60) });
    parts.push(durStr);
  }
  return parts.join(' · ');
}

function detectActiveLightId(hud, presets) {
  const actorEffect = hud.actor?.effects?.find(e => !e.disabled && isManagedLightEffect(e));
  if (actorEffect) {
    return actorEffect.getFlag(MODULE_ID, 'lightPicker') || actorEffect.getFlag('mini-tweaks', 'lightPicker') || null;
  }

  const docLight = hud.document?.light;
  if (!docLight) return 'none';
  const bright = docLight.bright || 0;
  const dim = docLight.dim || 0;
  const angle = docLight.angle ?? 360;
  const negative = Boolean(docLight.negative);

  if (bright === 0 && dim === 0 && !negative) return 'none';

  const matched = presets.find(
    p => p.action !== 'none' && p.bright === bright && p.dim === dim && p.angle === angle && p.negative === negative
  );
  return matched ? matched.action : null;
}

Hooks.once('init', () => {
  game.settings.register(MODULE_ID, 'enableSimpleLight', {
    name: 'SIMPLELIGHT.Enable',
    hint: 'SIMPLELIGHT.EnableHint',
    scope: 'client',
    config: false,
    type: Boolean,
    default: true,
    onChange: refreshTokenHud
  });

  game.settings.register(MODULE_ID, 'simpleLightAllowPlayers', {
    name: 'SIMPLELIGHT.AllowPlayers',
    hint: 'SIMPLELIGHT.AllowPlayersHint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
    onChange: refreshTokenHud
  });

  game.settings.register(MODULE_ID, LIGHT_CONFIG_SETTING, {
    scope: 'world',
    config: false,
    type: Object,
    default: DEFAULT_LIGHT_CONFIG,
    onChange: refreshTokenHud
  });
});

Hooks.once('ready', () => {
  const mod = game.modules.get(MODULE_ID);
  if (mod) {
    mod.api = {
      ...(mod.api || {}),
      simpleLight: {
        applyLightPreset,
        addLightTypeMacro,
        addLightMacro,
        openSettings: openSimpleLightSettings
      },
      addLightTypeMacro,
      addLightMacro
    };
  }
});

Hooks.on('renderTokenHUD', (hud, html) => {
  const hudEl = (html instanceof HTMLElement ? html : html?.[0]) || document.getElementById('token-hud');
  if (!hudEl) return;

  hudEl.querySelectorAll('[data-pp-hud-button="simple-light"]').forEach(el => el.remove());

  if (!isEnabled() || !canUpdateToken(hud.document)) return;
  if (game.system.id === 'dnd5e' && hud.actor && !hud.actor.isOwner) return;

  const leftCol = hudEl.querySelector('.col.left') || hudEl.querySelector('.left');
  if (!leftCol) return;

  const presets = getLightPresets();
  const activeLightId = detectActiveLightId(hud, presets);
  const doc = hudEl.ownerDocument;
  const buttonTitle = game.i18n.localize('SIMPLELIGHT.ButtonTitle');

  const button = doc.createElement('button');
  button.type = 'button';
  button.className = 'control-icon pp-simple-light-button';
  if (activeLightId && activeLightId !== 'none') button.classList.add('pp-light-lit');
  button.dataset.ppHudButton = 'simple-light';
  button.dataset.action = 'togglePalette';
  button.dataset.palette = 'simple-light';
  button.dataset.tooltip = buttonTitle;
  button.setAttribute('aria-label', buttonTitle);

  const btnIcon = doc.createElement('img');
  btnIcon.src = 'icons/svg/light.svg';
  btnIcon.width = 36;
  btnIcon.height = 36;
  btnIcon.alt = '';
  button.append(btnIcon);

  const palette = doc.createElement('div');
  palette.className = 'palette pp-light-palette';
  palette.dataset.palette = 'simple-light';
  palette.dataset.ppHudButton = 'simple-light';
  palette.setAttribute('aria-label', buttonTitle);

  let busy = false;
  for (const preset of presets) {
    const option = doc.createElement('button');
    option.type = 'button';
    option.className = 'pp-light-option';
    if (preset.action === activeLightId) option.classList.add('pp-preset-active');
    option.dataset.lightPreset = preset.action;

    const meta = formatPresetMeta(preset);
    const ariaText = `${preset.label} (${meta})`;
    option.dataset.tooltipText = ariaText;
    option.setAttribute('aria-label', ariaText);

    const iconWrap = doc.createElement('div');
    iconWrap.className = 'pp-light-option-icon';
    const img = doc.createElement('img');
    img.src = preset.img;
    img.alt = '';
    iconWrap.append(img);

    const textWrap = doc.createElement('div');
    textWrap.className = 'pp-light-option-text';
    const nameSpan = doc.createElement('span');
    nameSpan.className = 'pp-light-option-name';
    nameSpan.textContent = preset.label;
    const metaSpan = doc.createElement('span');
    metaSpan.className = 'pp-light-option-meta';
    metaSpan.textContent = meta;
    textWrap.append(nameSpan, metaSpan);

    option.append(iconWrap, textWrap);
    option.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (busy) return;
      busy = true;
      try {
        const controlled = canvas.tokens.controlled.map(token => token.document);
        const targets = controlled.includes(hud.document) ? controlled : [hud.document];
        // Collapse palette before document updates trigger a HUD re-render.
        hud.togglePalette?.(null);
        if (await applyLightPreset(targets, preset.action)) {
          if (preset.action === 'none') {
            ui.notifications.info(game.i18n.localize('SIMPLELIGHT.ExtinguishedNotification'));
          } else {
            ui.notifications.info(game.i18n.format('SIMPLELIGHT.AppliedNotification', { label: preset.label }));
          }
        }
      } catch (error) {
        console.error(`${MODULE_ID} | Simple Light`, error);
        ui.notifications.error(game.i18n.localize('SIMPLELIGHT.Errors.ApplyFailed'));
      } finally {
        busy = false;
      }
    });

    palette.append(option);
  }

  const configBtn = leftCol.querySelector('.control-icon[data-action="config"]');
  if (configBtn) {
    leftCol.insertBefore(button, configBtn);
  } else {
    leftCol.append(button);
  }
  leftCol.append(palette);
});
