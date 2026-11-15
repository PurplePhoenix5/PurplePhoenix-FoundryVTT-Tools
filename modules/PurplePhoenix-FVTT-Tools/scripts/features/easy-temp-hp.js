const MODULE_ID = 'PurplePhoenix-FVTT-Tools';
const TEMP_HP_ATTR = 'attributes.hp.temp';
const HP_ATTR = 'attributes.hp';

let cfg = null;
function settings() {
    cfg ??= {
        enableEasyTempHp: game.settings.get(MODULE_ID, 'enableEasyTempHp'),
        autoSetBar2TempHp: game.settings.get(MODULE_ID, 'autoSetBar2TempHp')
    };
    return cfg;
}

function refreshTokensAndHud() {
    cfg = null;
    registerTempHpTrackableAttribute();
    if (canvas?.ready) {
        canvas.tokens.placeables.forEach(t => t.renderFlags?.set({ refreshBars: true }));
        if (canvas.hud?.token?.rendered) canvas.hud.token.render();
    }
}

Hooks.once('init', () => {
    game.settings.register(MODULE_ID, 'enableEasyTempHp', {
        name: 'EASYTEMPHP.Enable',
        hint: 'EASYTEMPHP.EnableHint',
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
        onChange: refreshTokensAndHud
    });

    game.settings.register(MODULE_ID, 'autoSetBar2TempHp', {
        name: 'EASYTEMPHP.AutoSetBar2',
        hint: 'EASYTEMPHP.AutoSetBar2Hint',
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
        onChange: refreshTokensAndHud
    });
});

function hasHp(actor) {
    return !!actor?.system?.attributes?.hp;
}

/**
 * Inject `attributes.hp.temp` into CONFIG.Actor.trackableAttributes so it is selectable in
 * TokenConfig and PrototypeTokenConfig under Values ("Hit Points (Temp)" / "Trefferpunkte (Temp)").
 */
function registerTempHpTrackableAttribute() {
    const trackable = CONFIG.Actor?.trackableAttributes;
    if (trackable) {
        for (const [type, group] of Object.entries(trackable)) {
            if (type === 'group') continue;
            if (Array.isArray(group?.value) && !group.value.includes(TEMP_HP_ATTR)) {
                group.value.unshift(TEMP_HP_ATTR);
            }
        }
    }
    if (Array.isArray(CONFIG.DND5E?.trackableAttributes) && !CONFIG.DND5E.trackableAttributes.includes(TEMP_HP_ATTR)) {
        CONFIG.DND5E.trackableAttributes.push(TEMP_HP_ATTR);
    } else if (CONFIG.DND5E?.trackableAttributes instanceof Set) {
        CONFIG.DND5E.trackableAttributes.add(TEMP_HP_ATTR);
    }
}

/**
 * Wrapper for TokenDocument#getBarAttribute:
 * 1. Automatically uses `attributes.hp.temp` for `bar2` when `bar2.attribute` is empty and `autoSetBar2TempHp` is enabled.
 * 2. Always returns `{ type: "value", attribute: "attributes.hp.temp", value: Number(hp.temp || 0), editable: true }`
 *    even when `hp.temp` is `null` or `0` in dnd5e, so the blue Bar 2 box in the Token HUD stays visible and editable.
 * 3. Returns regular `hp.value` (without `hp.temp` added) for `attributes.hp` so the green Bar 1 box in the Token HUD
 *    shows regular HP while the blue Bar 2 box shows Temp HP.
 */
function getBarAttributeWrapper(wrapped, barName, options = {}) {
    // Always call wrapped first so libWrapper 'WRAPPER' requirement is always satisfied
    const data = wrapped.call(this, barName, options);

    const { enableEasyTempHp, autoSetBar2TempHp } = settings();
    if (!enableEasyTempHp) {
        return data;
    }

    let attribute = options?.alternative || this[barName]?.attribute;
    if (!attribute && barName === 'bar2' && !options?.alternative && autoSetBar2TempHp && hasHp(this.actor)) {
        attribute = TEMP_HP_ATTR;
    }

    if (attribute === TEMP_HP_ATTR) {
        if (!hasHp(this.actor)) return null;
        const tempVal = Number(this.actor.system.attributes.hp.temp || 0);
        return {
            type: 'value',
            attribute: TEMP_HP_ATTR,
            value: tempVal,
            editable: true,
            valueOf() { return this.value; }
        };
    }

    if (data?.attribute === HP_ATTR && hasHp(this.actor)) {
        data.value = Number(this.actor.system.attributes.hp.value ?? data.value ?? 0);
    }
    return data;
}

/**
 * Wrapper for Actor#modifyTokenAttribute:
 * 1. Editing `attributes.hp.temp` (Bar 2) sets or adjusts `system.attributes.hp.temp` directly (clamped to >= 0).
 * 2. Editing `attributes.hp` (Bar 1):
 *    - Relative input (`-number` damage or `+number` healing, `isDelta === true`): delegates to dnd5e's native
 *      `modifyTokenAttribute` / `applyDamage`, which deducts damage from Temp HP first and carries any remainder to regular HP.
 *    - Absolute input (`number` or `=number`, `isDelta === false`): sets regular HP (`system.attributes.hp.value`)
 *      directly without wiping out Temp HP.
 */
async function modifyTokenAttributeWrapper(wrapped, attribute, value, isDelta = false, isBar = true) {
    const { enableEasyTempHp } = settings();
    if (!enableEasyTempHp) {
        return wrapped.call(this, attribute, value, isDelta, isBar);
    }

    if (attribute === TEMP_HP_ATTR) {
        if (!hasHp(this)) return this;
        const current = Number(this.system.attributes.hp.temp || 0);
        const raw = Number(value) || 0;
        const next = Math.max(0, Math.floor(isDelta ? current + raw : raw));
        const updates = { 'system.attributes.hp.temp': next };
        const allowed = Hooks.call('modifyTokenAttribute', { attribute, value: next, isDelta, isBar: false }, updates, this);
        return allowed !== false ? this.update(updates) : this;
    }

    if (attribute === HP_ATTR && !isDelta && hasHp(this)) {
        const hp = this.system.attributes.hp;
        const max = Math.max(0, Number(hp.effectiveMax ?? hp.max ?? 0));
        const next = Math.clamp(Math.floor(Number(value) || 0), 0, max);
        const updates = { 'system.attributes.hp.value': next };
        const allowed = Hooks.call('modifyTokenAttribute', { attribute, value: next, isDelta: false, isBar: true }, updates, this);
        return allowed !== false ? this.update(updates) : this;
    }

    return wrapped.call(this, attribute, value, isDelta, isBar);
}

Hooks.once('setup', () => {
    registerTempHpTrackableAttribute();

    const TokenDocClass = CONFIG.Token?.documentClass ?? foundry.documents?.TokenDocument ?? TokenDocument;
    if (TokenDocClass?.prototype?.getBarAttribute) {
        if (typeof libWrapper !== 'undefined') {
            libWrapper.register(MODULE_ID, 'CONFIG.Token.documentClass.prototype.getBarAttribute', getBarAttributeWrapper, 'WRAPPER');
        } else {
            const origGetBarAttr = TokenDocClass.prototype.getBarAttribute;
            TokenDocClass.prototype.getBarAttribute = function (barName, options) {
                return getBarAttributeWrapper.call(this, origGetBarAttr, barName, options);
            };
        }
    }

    // Ensure getTrackedAttributes always includes attributes.hp.temp under value
    if (typeof TokenDocClass?.getTrackedAttributes === 'function') {
        const origGetTracked = TokenDocClass.getTrackedAttributes.bind(TokenDocClass);
        TokenDocClass.getTrackedAttributes = function (data, _path = []) {
            const result = origGetTracked(data, _path);
            if (_path.length === 0 && result?.value && Array.isArray(result.value)) {
                const exists = result.value.some(p => Array.isArray(p) && p.join('.') === TEMP_HP_ATTR);
                if (!exists) result.value.unshift(['attributes', 'hp', 'temp']);
            }
            return result;
        };
    }

    const ActorDocClass = CONFIG.Actor?.documentClass ?? foundry.documents?.Actor ?? Actor;
    if (ActorDocClass?.prototype?.modifyTokenAttribute) {
        if (typeof libWrapper !== 'undefined') {
            libWrapper.register(MODULE_ID, 'CONFIG.Actor.documentClass.prototype.modifyTokenAttribute', modifyTokenAttributeWrapper, 'MIXED');
        } else {
            const origModifyAttr = ActorDocClass.prototype.modifyTokenAttribute;
            ActorDocClass.prototype.modifyTokenAttribute = function (attribute, value, isDelta, isBar) {
                return modifyTokenAttributeWrapper.call(this, origModifyAttr, attribute, value, isDelta, isBar);
            };
        }
    }
});

// Run again at ready to ensure dnd5e's own setup hook has finished configuring trackableAttributes
Hooks.once('ready', () => {
    registerTempHpTrackableAttribute();
});

// Add helpful tooltips and select-on-focus behavior to the Token HUD Bar 1 & Bar 2 inputs
Hooks.on('renderTokenHUD', (hud, html) => {
    try {
        const { enableEasyTempHp } = settings();
        if (!enableEasyTempHp) return;

        const root = html instanceof HTMLElement ? html : html?.[0];
        const tokenDoc = hud.document ?? hud.object?.document;
        if (!root || !tokenDoc) return;

        const bar1 = tokenDoc.getBarAttribute?.('bar1');
        if (bar1?.attribute === HP_ATTR) {
            const bar1Input = root.querySelector('input[name="bar1"], input[name="bar1.value"]');
            if (bar1Input) {
                if (hasHp(tokenDoc.actor)) {
                    bar1Input.value = String(Number(tokenDoc.actor.system.attributes.hp.value ?? bar1.value ?? 0));
                }
                bar1Input.dataset.tooltip = game.i18n.localize('EASYTEMPHP.Bar1Tooltip');
            }
        }

        const bar2 = tokenDoc.getBarAttribute?.('bar2');
        if (bar2?.attribute === TEMP_HP_ATTR) {
            const bar2Input = root.querySelector('input[name="bar2"], input[name="bar2.value"]');
            if (bar2Input) {
                bar2Input.dataset.tooltip = game.i18n.localize('EASYTEMPHP.HudTooltip');
                bar2Input.addEventListener('focus', () => bar2Input.select());
            }
        }
    } catch (err) {
        console.error(`${MODULE_ID} | Easy Temp HP HUD enhancement failed:`, err);
    }
});

// Reflect auto-assigned Bar 2 Temp HP in TokenConfig & PrototypeTokenConfig
for (const hookName of ['renderTokenConfig', 'renderPrototypeTokenConfig']) {
    Hooks.on(hookName, (app, element) => {
        try {
            const { enableEasyTempHp, autoSetBar2TempHp } = settings();
            if (!enableEasyTempHp || !autoSetBar2TempHp) return;

            const actor = app.actor ?? app.token?.actor ?? app.document?.actor;
            if (!hasHp(actor)) return;

            const root = element instanceof HTMLElement ? element : element?.[0] ?? app.element;
            if (!root) return;

            const select = root.querySelector('select[name="bar2.attribute"]');
            const sourceAttr = app.token?._source?.bar2?.attribute ?? app.document?._source?.bar2?.attribute;
            if (select && !sourceAttr && !select.value) {
                select.value = TEMP_HP_ATTR;
                const bar2ValInput = root.querySelector('input[data-bar2-value]');
                if (bar2ValInput) {
                    bar2ValInput.value = String(Number(actor.system?.attributes?.hp?.temp || 0));
                }
            }
        } catch (err) {
            console.error(`${MODULE_ID} | Error updating ${hookName} Bar 2 select:`, err);
        }
    });
}

// Default bar2.attribute to attributes.hp.temp on newly created tokens and actors when empty
Hooks.on('preCreateToken', (tokenDoc, data) => {
    const { enableEasyTempHp, autoSetBar2TempHp } = settings();
    if (!enableEasyTempHp || !autoSetBar2TempHp) return;
    if (!tokenDoc.bar2?.attribute && !data?.bar2?.attribute && hasHp(tokenDoc.actor)) {
        tokenDoc.updateSource({ 'bar2.attribute': TEMP_HP_ATTR });
    }
});

Hooks.on('preCreateActor', (actorDoc, data) => {
    const { enableEasyTempHp, autoSetBar2TempHp } = settings();
    if (!enableEasyTempHp || !autoSetBar2TempHp) return;
    if (!actorDoc.prototypeToken?.bar2?.attribute && !data?.prototypeToken?.bar2?.attribute && hasHp(actorDoc)) {
        actorDoc.updateSource({ 'prototypeToken.bar2.attribute': TEMP_HP_ATTR });
    }
});
