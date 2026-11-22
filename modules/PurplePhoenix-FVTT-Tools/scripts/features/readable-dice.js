// Readable Discarded Dice feature — improves contrast and visibility of discarded/rerolled dice in chat tooltips
const MODULE_ID = 'PurplePhoenix-FVTT-Tools';
const DEFAULT_OPACITY = 70;

function applyToDocument(doc) {
  if (!doc?.body) return;

  const enabled = Boolean(game.settings.get(MODULE_ID, 'enableReadableDice'));
  const rawOpacity = Number(game.settings.get(MODULE_ID, 'readableDiceOpacity'));
  const opacity = Number.isFinite(rawOpacity) ? Math.clamp(rawOpacity, 40, 100) : DEFAULT_OPACITY;

  doc.documentElement?.style.setProperty('--pp-discarded-dice-opacity', String(opacity / 100));
  doc.body.classList.toggle('pp-readable-dice', enabled);
}

function applyReadableDiceState() {
  applyToDocument(document);

  const instances = foundry?.applications?.instances;
  if (!instances?.values) return;
  for (const app of instances.values()) {
    const appDoc = app?.element?.ownerDocument;
    if (appDoc && appDoc !== document) {
      applyToDocument(appDoc);
    }
  }
}

Hooks.once('init', () => {
  game.settings.register(MODULE_ID, 'enableReadableDice', {
    name: 'READABLEDICE.Enable',
    hint: 'READABLEDICE.EnableHint',
    scope: 'client',
    config: false,
    type: Boolean,
    default: true,
    onChange: applyReadableDiceState
  });

  game.settings.register(MODULE_ID, 'readableDiceOpacity', {
    name: 'READABLEDICE.Opacity',
    hint: 'READABLEDICE.OpacityHint',
    scope: 'client',
    config: false,
    type: Number,
    range: { min: 40, max: 100, step: 5 },
    default: DEFAULT_OPACITY,
    onChange: applyReadableDiceState
  });
});

Hooks.once('ready', applyReadableDiceState);

Hooks.on('renderChatLog', app => {
  if (app?.element?.ownerDocument) applyToDocument(app.element.ownerDocument);
});
