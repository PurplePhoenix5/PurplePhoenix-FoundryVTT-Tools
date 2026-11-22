// Active Effects Manager feature — quick Token HUD toggle dialog for Actor Active Effects
const MODULE_ID = 'PurplePhoenix-FVTT-Tools';
const TEMPLATE = `modules/${MODULE_ID}/templates/effects-manager.hbs`;
const openActors = new Set();

function refreshTokenHud() {
  if (canvas?.hud?.token?.rendered) canvas.hud.token.render();
}

function isEnabled() {
  return (
    Boolean(game.settings.get(MODULE_ID, 'enableEffectsManager')) &&
    (game.user.isGM || Boolean(game.settings.get(MODULE_ID, 'effectsManagerPlayers')))
  );
}

Hooks.once('init', () => {
  game.settings.register(MODULE_ID, 'enableEffectsManager', {
    name: 'EFFECTSMANAGER.Enable',
    hint: 'EFFECTSMANAGER.EnableHint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
    onChange: refreshTokenHud
  });

  game.settings.register(MODULE_ID, 'effectsManagerPlayers', {
    name: 'EFFECTSMANAGER.AllowPlayers',
    hint: 'EFFECTSMANAGER.AllowPlayersHint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
    onChange: refreshTokenHud
  });
});

Hooks.once('ready', () => {
  const mod = game.modules.get(MODULE_ID);
  if (mod) {
    mod.api = {
      ...(mod.api || {}),
      effectsManager: { open: openEffectsManager }
    };
  }
});

Hooks.on('renderTokenHUD', (hud, html) => {
  const hudEl = (html instanceof HTMLElement ? html : html?.[0]) || document.getElementById('token-hud');
  if (!hudEl) return;

  hudEl.querySelectorAll('[data-pp-hud-button="effects-manager"]').forEach(el => el.remove());

  if (!isEnabled() || !hud.actor?.isOwner) return;

  const rightCol = hudEl.querySelector('.col.right');
  if (!rightCol) return;

  const label = game.i18n.localize('EFFECTSMANAGER.ButtonTitle');
  const button = hudEl.ownerDocument.createElement('button');
  button.type = 'button';
  button.className = 'control-icon pp-effects-manager-button';
  button.dataset.ppHudButton = 'effects-manager';
  button.dataset.tooltip = label;
  button.setAttribute('aria-label', label);

  const icon = hudEl.ownerDocument.createElement('i');
  icon.className = 'fa-solid fa-wand-magic-sparkles';
  icon.inert = true;
  button.append(icon);

  button.addEventListener('click', async event => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await openEffectsManager(hud.actor);
    } catch (error) {
      console.error(`${MODULE_ID} | Effects Manager`, error);
      ui.notifications.error(game.i18n.localize('EFFECTSMANAGER.UpdateError'));
    }
  });

  rightCol.append(button);
});

/**
 * Open the Active Effects Manager dialog for the given actor.
 * @param {Actor} actor
 */
export async function openEffectsManager(actor) {
  if (!isEnabled() || !actor?.isOwner || openActors.has(actor.uuid)) return;
  openActors.add(actor.uuid);

  try {
    const all = Array.from(actor.allApplicableEffects());
    if (!all.length) {
      return ui.notifications.info(game.i18n.format('EFFECTSMANAGER.NoEffects', { name: actor.name }));
    }

    const isPassive = effect => effect.parent?.documentName === 'Item';
    const byName = (a, b) => a.name.localeCompare(b.name);
    const lookup = new Map();

    const sections = [
      {
        label: game.i18n.localize('EFFECTSMANAGER.SectionActive'),
        icon: 'fa-bolt',
        effects: all.filter(e => !isPassive(e) && !e.disabled)
      },
      {
        label: game.i18n.localize('EFFECTSMANAGER.SectionPassive'),
        icon: 'fa-shield-halved',
        effects: all.filter(isPassive)
      },
      {
        label: game.i18n.localize('EFFECTSMANAGER.SectionDisabled'),
        icon: 'fa-ban',
        effects: all.filter(e => !isPassive(e) && e.disabled)
      }
    ].map(section => ({
      ...section,
      effects: section.effects.sort(byName).map(effect => {
        const key = `fx-${lookup.size}`;
        lookup.set(key, effect);
        const meta = [];
        if (isPassive(effect)) {
          meta.push(game.i18n.format('EFFECTSMANAGER.ItemMeta', { item: effect.parent.name }));
        }
        if (effect.isTemporary && effect.duration?.label) {
          meta.push(effect.duration.label);
        }
        if (effect.statuses?.size) {
          meta.push(Array.from(effect.statuses).join(', '));
        }
        if (effect.isSuppressed) {
          meta.push(game.i18n.localize('EFFECTSMANAGER.Suppressed'));
        }
        return {
          key,
          name: effect.name,
          img: effect.img,
          enabled: !effect.disabled,
          readOnly: !effect.canUserModify(game.user, 'update'),
          toggleAriaLabel: game.i18n.format('EFFECTSMANAGER.ToggleAria', { name: effect.name }),
          meta: meta.join(' · ')
        };
      })
    }));

    const content = await foundry.applications.handlebars.renderTemplate(TEMPLATE, { sections });
    const changes = await foundry.applications.api.DialogV2.wait({
      window: {
        title: game.i18n.format('EFFECTSMANAGER.DialogTitle', { name: actor.name }),
        icon: 'fa-solid fa-wand-magic-sparkles'
      },
      position: { width: 480 },
      content,
      rejectClose: false,
      buttons: [
        {
          action: 'ok',
          label: game.i18n.localize('EFFECTSMANAGER.Confirm'),
          icon: 'fa-solid fa-check',
          default: true,
          callback: (_event, _button, dialog) => {
            const pending = [];
            for (const input of dialog.element.querySelectorAll('.pp-effects-manager input[data-key]')) {
              const effect = lookup.get(input.dataset.key);
              if (!input.disabled && effect && input.checked === effect.disabled) {
                pending.push({ effect, disabled: !input.checked });
              }
            }
            return pending;
          }
        },
        {
          action: 'cancel',
          label: game.i18n.localize('Cancel'),
          icon: 'fa-solid fa-xmark'
        }
      ]
    });

    if (!Array.isArray(changes)) return;
    if (!changes.length) {
      return ui.notifications.info(game.i18n.localize('EFFECTSMANAGER.NoChanges'));
    }
    if (!actor.isOwner || changes.some(({ effect }) => !effect.canUserModify(game.user, 'update'))) {
      return ui.notifications.warn(game.i18n.localize('EFFECTSMANAGER.NoPermission'));
    }

    // Apply sequentially so effects sharing an actor or item do not race updates.
    for (const { effect, disabled } of changes) {
      await effect.update({ disabled });
    }

    const msgKey = changes.length === 1 ? 'EFFECTSMANAGER.UpdatedOne' : 'EFFECTSMANAGER.UpdatedMany';
    ui.notifications.info(game.i18n.format(msgKey, { count: changes.length, name: actor.name }));
  } finally {
    openActors.delete(actor.uuid);
  }
}
