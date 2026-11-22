// Expanded Status Effects HUD feature — displays condition labels next to icons in Token HUD
const MODULE_ID = 'PurplePhoenix-FVTT-Tools';

function refreshTokenHud() {
  if (canvas?.hud?.token?.rendered) canvas.hud.token.render();
}

Hooks.once('init', () => {
  game.settings.register(MODULE_ID, 'enableStatusEffects', {
    name: 'STATUSEFFECTS.Enable',
    hint: 'STATUSEFFECTS.EnableHint',
    scope: 'client',
    config: false,
    type: Boolean,
    default: true,
    onChange: refreshTokenHud
  });

  game.settings.register(MODULE_ID, 'statusEffectsColumns', {
    name: 'STATUSEFFECTS.Columns',
    hint: 'STATUSEFFECTS.ColumnsHint',
    scope: 'client',
    config: false,
    type: Number,
    range: { min: 2, max: 5, step: 1 },
    default: 4,
    onChange: refreshTokenHud
  });
});

Hooks.on('renderTokenHUD', (_hud, html) => {
  const hudEl = (html instanceof HTMLElement ? html : html?.[0]) || document.getElementById('token-hud');
  if (!hudEl) return;

  const enabled = Boolean(game.settings.get(MODULE_ID, 'enableStatusEffects'));
  hudEl.classList.toggle('pp-status-effects', enabled);
  if (!enabled) return;

  const effectsGrid = hudEl.querySelector('.status-effects');
  if (!effectsGrid) return;

  const colsRaw = Number(game.settings.get(MODULE_ID, 'statusEffectsColumns'));
  const columns = Number.isFinite(colsRaw) ? Math.clamp(Math.round(colsRaw), 2, 5) : 4;
  effectsGrid.style.setProperty('--pp-effect-columns', String(columns));

  const doc = hudEl.ownerDocument;
  const images = effectsGrid.querySelectorAll(':scope > img.effect-control, :scope > .effect-control > img');

  for (const img of images) {
    if (img.parentElement?.classList.contains('pp-effect-container')) continue;

    const statusId = img.dataset.statusId || '';
    const action = img.dataset.action || 'effect';
    const title =
      img.dataset.tooltipText ||
      img.dataset.tooltip ||
      img.getAttribute('title') ||
      img.parentElement?.dataset.tooltipText ||
      img.parentElement?.getAttribute('aria-label') ||
      statusId;

    const container = doc.createElement('div');
    container.className = 'pp-effect-container';
    const isActive = img.classList.contains('active');
    const isOverlay = img.classList.contains('overlay');
    if (isActive) container.classList.add('active');
    if (isOverlay) container.classList.add('overlay');

    img.replaceWith(container);
    container.append(img);

    const label = doc.createElement('div');
    label.className = 'pp-effect-name';
    if (isActive) label.classList.add('active');
    if (isOverlay) label.classList.add('overlay');
    label.dataset.statusId = statusId;
    label.dataset.action = action;
    if (title) label.dataset.tooltipText = title;
    label.textContent = title;
    container.append(label);
  }
});
