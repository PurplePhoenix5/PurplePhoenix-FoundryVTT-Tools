// Pause Border feature — displays a colored screen glow border (and optional pause icon) when the game is paused
const MODULE_ID = 'PurplePhoenix-FVTT-Tools';
const DEFAULT_PAUSE_COLOR = '#a855f7';

function applyPauseBorderState(paused = game.paused) {
  if (!document?.body) return;
  const enabled = Boolean(game.settings.get(MODULE_ID, 'enablePauseBorder'));
  const replaceIcon = Boolean(game.settings.get(MODULE_ID, 'pauseBorderReplaceIcon'));
  const rawColor = game.settings.get(MODULE_ID, 'pauseBorderColor');
  const color = rawColor?.css || String(rawColor || DEFAULT_PAUSE_COLOR);

  document.documentElement.style.setProperty('--pp-pause-color', color);
  document.body.classList.toggle('pp-paused', enabled && Boolean(paused));
  document.body.classList.toggle('pp-pause-replace-icon', enabled && replaceIcon);
}

Hooks.once('init', () => {
  const ColorField = foundry?.data?.fields?.ColorField;
  const colorSettingType = ColorField ? new ColorField({ nullable: false, initial: DEFAULT_PAUSE_COLOR }) : String;

  game.settings.register(MODULE_ID, 'enablePauseBorder', {
    name: 'PAUSEBORDER.Enable',
    hint: 'PAUSEBORDER.EnableHint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
    onChange: () => applyPauseBorderState()
  });

  game.settings.register(MODULE_ID, 'pauseBorderColor', {
    name: 'PAUSEBORDER.Color',
    hint: 'PAUSEBORDER.ColorHint',
    scope: 'world',
    config: false,
    type: colorSettingType,
    default: DEFAULT_PAUSE_COLOR,
    onChange: () => applyPauseBorderState()
  });

  game.settings.register(MODULE_ID, 'pauseBorderReplaceIcon', {
    name: 'PAUSEBORDER.ReplaceIcon',
    hint: 'PAUSEBORDER.ReplaceIconHint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
    onChange: () => applyPauseBorderState()
  });
});

Hooks.once('ready', () => {
  applyPauseBorderState(game.paused);
});

Hooks.on('pauseGame', paused => {
  applyPauseBorderState(paused);
});
