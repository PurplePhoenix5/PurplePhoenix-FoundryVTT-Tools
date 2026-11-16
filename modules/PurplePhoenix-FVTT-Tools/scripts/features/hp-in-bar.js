const MODULE_ID = 'PurplePhoenix-FVTT-Tools';

// The dnd5e attribute the numbers belong to. Any other bar keeps Foundry's plain look.
const HP_ATTRIBUTE = 'attributes.hp';

// Badge colours
const BADGE_FILL = 0x1f2633;
const BADGE_BORDER = 0xc9ced6;

// One text style shared by every token, rebuilt only when a setting changes, and its blue twin
// for temp HP.
let style = null;
let tempStyle = null;
let styleVersion = 0;

// Settings read on every bar draw, cached so a redraw doesn't go through game.settings each time.
// Cleared by redrawAll, which every one of these settings calls on change.
let cfg = null;
function settings() {
    cfg ??= {
        enableHpInBar: game.settings.get(MODULE_ID, 'enableHpInBar'),
        visibleTo: game.settings.get(MODULE_ID, 'visibleTo'),
        acVisibleTo: game.settings.get(MODULE_ID, 'acVisibleTo'),
        tempText: game.settings.get(MODULE_ID, 'tempText'),
        tempShield: game.settings.get(MODULE_ID, 'tempShield'),
        fontSize: game.settings.get(MODULE_ID, 'fontSize')
    };
    return cfg;
}

// Settings
Hooks.once('init', () => {
    const { ColorField } = foundry.data.fields;

    game.settings.register(MODULE_ID, 'enableHpInBar', {
        name: 'HPINBAR.Enable',
        hint: 'HPINBAR.EnableHint',
        scope: 'world', config: false, onChange: redrawAll, type: Boolean, default: true
    });
    game.settings.register(MODULE_ID, 'visibleTo', {
        name: 'HPINBAR.VisibleTo',
        hint: 'HPINBAR.VisibleToHint',
        scope: 'world', config: false, onChange: redrawAll, type: String, default: 'owner',
        choices: {
            owner: 'HPINBAR.VisibleToOwner',
            everyone: 'HPINBAR.VisibleToEveryone',
            gm: 'HPINBAR.VisibleToGM'
        }
    });
    game.settings.register(MODULE_ID, 'acVisibleTo', {
        name: 'HPINBAR.AcVisibleTo',
        hint: 'HPINBAR.AcVisibleToHint',
        scope: 'world', config: false, onChange: redrawAll, type: String, default: 'combat',
        choices: {
            combat: 'HPINBAR.AcVisibleToCombat',
            owner: 'HPINBAR.VisibleToOwner',
            everyone: 'HPINBAR.VisibleToEveryone',
            gm: 'HPINBAR.VisibleToGM',
            off: 'HPINBAR.AcOff'
        }
    });
    game.settings.register(MODULE_ID, 'tempText', {
        name: 'HPINBAR.TempText',
        hint: 'HPINBAR.TempTextHint',
        scope: 'client', config: false, onChange: redrawAll, type: String, default: 'combined',
        choices: {
            combined: 'HPINBAR.TempTextCombined',
            separate: 'HPINBAR.TempTextSeparate',
            hidden: 'HPINBAR.TempTextHidden'
        }
    });
    game.settings.register(MODULE_ID, 'tempShield', {
        name: 'HPINBAR.TempShield',
        hint: 'HPINBAR.TempShieldHint',
        scope: 'client', config: false, onChange: redrawAll, type: Boolean, default: false
    });
    game.settings.register(MODULE_ID, 'fontSize', {
        name: 'HPINBAR.FontSize',
        hint: 'HPINBAR.FontSizeHint',
        scope: 'client', config: false, onChange: redrawAll, type: Number, default: 14,
        range: { min: 8, max: 48, step: 1 }
    });
    game.settings.register(MODULE_ID, 'textColor', {
        name: 'HPINBAR.TextColor',
        hint: 'HPINBAR.TextColorHint',
        scope: 'client', config: false, onChange: redrawAll,
        type: new ColorField({ nullable: false, initial: '#ffffff' }), default: '#ffffff'
    });
    game.settings.register(MODULE_ID, 'strokeColor', {
        name: 'HPINBAR.StrokeColor',
        hint: 'HPINBAR.StrokeColorHint',
        scope: 'client', config: false, onChange: redrawAll,
        type: new ColorField({ nullable: false, initial: '#000000' }), default: '#000000'
    });
    game.settings.register(MODULE_ID, 'strokeWidth', {
        name: 'HPINBAR.StrokeWidth',
        hint: 'HPINBAR.StrokeWidthHint',
        scope: 'client', config: false, onChange: redrawAll, type: Number, default: 4,
        range: { min: 0, max: 12, step: 1 }
    });
});


// V13 Core Logic
function drawBarsWrapper(wrapped, ...args) {
    // Let Foundry draw the bars natively (with bar.clear() and positioning)
    const result = wrapped.call(this, ...args);

    try {
        const { enableHpInBar, tempShield, tempText } = settings();

        // If feature is disabled in this world, or token has no actor -> hide our elements & return
        if (!enableHpInBar || !this.actor) {
            hideModuleBarElements(this);
            return result;
        }

        if (this.document.displayBars !== CONST.TOKEN_DISPLAY_MODES.NONE) {
            const allowed = canSeeNumbers(this);
            const s = canvas?.dimensions?.uiScale || 1;
            const textRes = getTextResolution(s);
            const hp = this.actor.system?.attributes?.hp ?? {};

            ["bar1", "bar2"].forEach((b) => {
                const bar = this.bars?.[b];
                if (!bar) return;
                const attr = this.document.getBarAttribute(b);
                const isHP = isHPBar(attr) && bar.visible;

                // Measured once per draw, with our own pieces left out, so everything below follows
                // whatever size core (or the system) gives its bars.
                const bounds = bar._hpBounds = isHP ? barBounds(bar) : null;

                // The temp HP layer is part of the bar, so it follows the bar, not the numbers setting.
                drawTempShield(bar, isHP && tempShield ? hp : null, bounds);

                // not HP || invisible || not for this user -> disable text
                if (!allowed || !isHP || !bounds) {
                    if (bar._hpText) bar._hpText.visible = false;
                    return;
                }

                // Use actor's base hp.value if available so temp HP is never double-counted in 'combined' mode
                const baseValue = (attr.attribute === HP_ATTRIBUTE && hp.value !== undefined)
                    ? Number(hp.value || 0)
                    : Number(attr.value || 0);
                const maxValue = Number(attr.max || 0);

                const parts = hpLabel({ value: baseValue, max: maxValue, temp: hp.temp }, tempText);
                const label = hpTextContainer(bar);
                label.visible = true;

                // Scale label container with canvas.dimensions.uiScale so font size is independent of map grid resolution
                label.scale.set(s, s);

                // Only touch what changed: assigning a style or text, even the same one, makes PIXI
                // render the text again, and Foundry redraws bars often.
                const key = `${parts.value}|${parts.temp}|${parts.max}|${styleVersion}|${textRes}`;
                if (label._key !== key) {
                    label._key = key;
                    setText(label._value, parts.value, getStyle(), textRes);
                    setText(label._temp, parts.temp ?? '', getTempStyle(), textRes);
                    setText(label._max, parts.max, getStyle(), textRes);
                    label._temp.visible = !!parts.temp;

                    // Lay the pieces out left to right in local (unscaled) coordinates, centred as a whole.
                    const pieces = [label._value, label._temp, label._max].filter(p => p.visible);
                    const total = pieces.reduce((sum, p) => sum + (p.width / (p.scale?.x || 1)), 0);
                    let x = -total / 2;
                    for (const p of pieces) {
                        p.x = x;
                        x += (p.width / (p.scale?.x || 1));
                    }
                }

                // Ensure text renders above bar graphics and temp shield
                bar.sortableChildren = true;
                label.zIndex = 100;

                const width = bounds.width || this.w;
                label.position.set(bounds.x + width / 2, bounds.y + bounds.height / 2);
            });
        } else {
            for (const b of ["bar1", "bar2"]) {
                const bar = this.bars?.[b];
                if (!bar) continue;
                if (bar._hpText) bar._hpText.visible = false;
                if (bar._tempShield) bar._tempShield.visible = false;
            }
        }
    } catch (err) {
        console.error(`${MODULE_ID} | Error drawing HP text:`, err);
    }

    try {
        drawAcBadge(this);
    } catch (err) {
        console.error(`${MODULE_ID} | Error drawing AC badge:`, err);
    }

    return result;
}

function refreshStateWrapper(wrapped, ...args) {
    const result = wrapped.call(this, ...args);
    try {
        updateAcBadgeVisibility(this);
    } catch (err) {
        console.error(`${MODULE_ID} | Error updating AC badge visibility:`, err);
    }
    return result;
}

function hideModuleBarElements(token) {
    if (token?.bars) {
        for (const b of ["bar1", "bar2"]) {
            const bar = token.bars[b];
            if (!bar) continue;
            if (bar._hpText) bar._hpText.visible = false;
            if (bar._tempShield) bar._tempShield.visible = false;
        }
        if (token.bars._acBadge) token.bars._acBadge.visible = false;
    }
    if (token?._acBadge) token._acBadge.visible = false;
}

/** A bar's drawn rectangle in its own coordinates, with everything we add left out. */
function barBounds(bar) {
    const ours = [bar._hpText, bar._tempShield].filter(c => c && !c.destroyed);
    const shown = ours.map(c => c.visible);
    ours.forEach(c => { c.visible = false; });
    const bounds = bar.getLocalBounds();
    ours.forEach((c, i) => { c.visible = shown[i]; });
    return bounds;
}

/** Compute supersampled resolution for crisp text at any map grid size or DPI. */
function getTextResolution(s = 1) {
    const dpr = window.devicePixelRatio || 1;
    return Math.min(8, Math.max(3, Math.ceil(2.5 * Math.max(1, s) * dpr)));
}

/** Sets a text's content, style, and high-DPI resolution only if they differ. */
function setText(text, content, textStyle, resolution) {
    if ('_autoResolution' in text) text._autoResolution = false;
    if (resolution && text.resolution !== resolution) text.resolution = resolution;
    if (text.text !== content) text.text = content;
    if (text.style !== textStyle) text.style = textStyle;
}

/** The HP text as three pieces, so the temp HP can have a colour of its own. */
function hpTextContainer(bar) {
    let label = bar._hpText;
    if (label && !label.destroyed && label._value) return label;
    if (label && !label.destroyed) label.destroy();
    const TextClass = foundry.canvas.containers?.PreciseText ?? PIXI.Text;
    label = new PIXI.Container();
    label.eventMode = 'none';
    for (const key of ['_value', '_temp', '_max']) {
        const t = new TextClass('', getStyle());
        if ('_autoResolution' in t) t._autoResolution = false;
        t.resolution = getTextResolution(canvas?.dimensions?.uiScale || 1);
        t.anchor.set(0, 0.5);
        label[key] = label.addChild(t);
    }
    bar._hpText = bar.addChild(label);
    return label;
}

/**
 * The HP text in pieces, so temp HP can have a colour of its own. With 100 temp HP on 243:
 * - `separate`: `243 +100 / 243`, the `+100` in blue
 * - `combined`: `343 / 243`, temp HP counted into the first number
 * - `hidden`:   `243 / 243`, temp HP left to the bar
 */
export function hpLabel({ value, max, temp }, mode = 'combined') {
    const t = Number(temp) || 0;
    if (t > 0 && mode === 'separate') return { value: `${value} `, temp: `+${t}`, max: ` / ${max}` };
    if (t > 0 && mode === 'combined') return { value: `${(Number(value) || 0) + t}`, temp: null, max: ` / ${max}` };
    return { value: `${value}`, temp: null, max: ` / ${max}` };
}

/**
 * How much of the bar the temp HP covers, the way dnd5e measures it: against the maximum plus
 * any temporary maximum, never more than the whole bar.
 */
export function tempFraction({ temp, max, tempmax }) {
    const t = Number(temp) || 0;
    const displayMax = (Number(max) || 0) + Math.max(0, Number(tempmax) || 0);
    if (t <= 0 || displayMax <= 0) return 0;
    return Math.min(t, displayMax) / displayMax;
}

/** The colour dnd5e uses for temp HP, so ours matches its stripe and any palette it swaps in. */
function tempColor() {
    return CONFIG.DND5E?.tokenHPColors?.temp ?? 0x66ccff;
}

/**
 * A see-through blue layer over the bar for temp HP, full height with a light edge, reading as a
 * shield over the green. It sits above dnd5e's thin stripe and below the numbers.
 */
function drawTempShield(bar, hp, b) {
    const fraction = hp && b ? tempFraction(hp) : 0;
    let shield = bar._tempShield;
    if (!fraction) {
        if (shield && !shield.destroyed) shield.visible = false;
        return;
    }
    if (!shield || shield.destroyed) {
        shield = bar._tempShield = bar.addChild(new PIXI.Graphics());
        bar.sortableChildren = true;
        shield.zIndex = 50;
    }
    shield.visible = true;
    const s = canvas?.dimensions?.uiScale ?? 1;
    const key = `${b.x},${b.y},${b.width},${b.height},${fraction},${s},${tempColor()}`;
    if (shield._key === key) return;
    shield._key = key;

    const inset = s;
    const w = Math.max(0, b.width * fraction - 2 * inset);
    const h = Math.max(0, b.height - 2 * inset);
    shield.clear();
    shield.lineStyle(Math.max(1, s), 0xe6f7ff, 0.9);
    shield.beginFill(tempColor(), 0.55);
    shield.drawRoundedRect(b.x + inset, b.y + inset, w, h, 2 * s);
    shield.endFill();
}


// AC badge
// Attached directly to the token container so that even when a neutral/enemy token's health bar is
// restricted to Owner/GM only, players can still see its AC shield when in the same Combat Encounter.
function drawAcBadge(token) {
    if (!token) return;
    const { enableHpInBar } = settings();
    const ac = enableHpInBar ? readAc(token.actor) : null;
    const allowed = ac && canSeeAc(token);

    if (!allowed) {
        if (token._acBadge) token._acBadge.visible = false;
        if (token.bars?._acBadge) token.bars._acBadge.visible = false;
        return;
    }

    // Clean up legacy badge on token.bars if present
    if (token.bars?._acBadge && !token.bars._acBadge.destroyed) {
        token.bars._acBadge.destroy();
        token.bars._acBadge = null;
    }

    let badge = token._acBadge;
    if (!badge || badge.destroyed) {
        badge = new PIXI.Container();
        badge.eventMode = 'none';
        badge._shape = badge.addChild(new PIXI.Graphics());
        const TextClass = foundry.canvas.containers?.PreciseText ?? PIXI.Text;
        const t = new TextClass('', getStyle());
        if ('_autoResolution' in t) t._autoResolution = false;
        t.anchor.set(0.5, 0.5);
        badge._text = badge.addChild(t);
        token._acBadge = token.addChild(badge);
        token.sortableChildren = true;
        badge.zIndex = 200;
    }

    // Sized from the HP font and scaled with canvas.dimensions.uiScale so it matches map resolution
    const s = canvas?.dimensions?.uiScale || 1;
    const textRes = getTextResolution(s);
    const size = settings().fontSize;
    const w = Math.round(size * 1.6);
    const h = Math.round(size * 1.8);

    badge.scale.set(s, s);
    badge._scaledW = w * s;
    badge._scaledH = h * s;

    // Redrawn only when something on it changed; Foundry redraws bars far more often than that.
    const key = `${ac.value}|${size}|${styleVersion}|${textRes}`;
    if (badge._key !== key) {
        badge._key = key;
        badge._shape.clear();
        badge._shape.lineStyle(Math.max(1, size / 8), BADGE_BORDER, 1);
        badge._shape.beginFill(BADGE_FILL, 0.9);
        drawShield(badge._shape, w, h);
        badge._shape.endFill();

        setText(badge._text, String(ac.value), getStyle(), textRes);
        badge._text.scale.set(0.8);
        badge._text.position.set(0, -h * 0.06);
    }

    updateAcBadgeVisibility(token);
}

function updateAcBadgeVisibility(token) {
    const badge = token?._acBadge;
    if (!badge || badge.destroyed) return;

    const { enableHpInBar } = settings();
    const ac = enableHpInBar ? readAc(token.actor) : null;
    const isSecret = (token.document.disposition === CONST.TOKEN_DISPOSITIONS.SECRET) && !token.isOwner;
    if (!ac || isSecret || !canSeeAc(token)) {
        badge.visible = false;
        return;
    }

    const scaledW = badge._scaledW || Math.round(settings().fontSize * 1.6) * (canvas?.dimensions?.uiScale || 1);
    const scaledH = badge._scaledH || Math.round(settings().fontSize * 1.8) * (canvas?.dimensions?.uiScale || 1);
    const overlap = scaledW * 0.2;
    const bars = token.bars;
    const bar1 = bars?.bar1;

    if (bars?.visible && bar1?.visible) {
        const b = bar1._hpBounds ?? barBounds(bar1);
        badge.position.set((bars.x || 0) + bar1.x + b.x - scaledW / 2 + overlap, (bars.y || 0) + bar1.y + b.y + b.height / 2);
        badge.visible = true;
        return;
    }

    // If the user cannot see the token's HP bars (e.g. displayBars is OWNER_HOVER or OWNER on an enemy),
    // still show the AC badge if canSeeAc(token) allows it (respecting hover vs always mode).
    const mode = token.document.displayBars;
    const M = CONST.TOKEN_DISPLAY_MODES;
    let showWithoutBar = false;
    if (token._canViewMode?.(mode)) {
        showWithoutBar = Boolean(bars?.visible);
    } else {
        if (mode === M.ALWAYS || mode === M.OWNER || mode === M.NONE) {
            showWithoutBar = true;
        } else if (mode === M.HOVER || mode === M.OWNER_HOVER || mode === M.CONTROL) {
            showWithoutBar = Boolean(token.hover || token.controlled);
        }
    }

    badge.position.set(-scaledW / 2 + overlap, token.h - scaledH / 2);
    badge.visible = showWithoutBar;
}

/** A heater shield centred on 0,0: flat top, sides that curve into a point at the bottom. */
function drawShield(g, w, h) {
    const x = w / 2, top = -h / 2, bottom = h / 2, shoulder = top + h * 0.45;
    g.moveTo(-x, top);
    g.lineTo(x, top);
    g.lineTo(x, shoulder);
    g.quadraticCurveTo(x, bottom - h * 0.15, 0, bottom);
    g.quadraticCurveTo(-x, bottom - h * 0.15, -x, shoulder);
    g.closePath();
}

/** The actor's derived AC, or null if it has none. */
function readAc(actor) {
    const ac = actor?.system?.attributes?.ac;
    if (!ac || !Number.isFinite(ac.value)) return null;
    return { value: ac.value };
}


// AC follows armour, items and effects, not just actor fields, so redraw on those too.
for (const hook of ['updateActor', 'createActiveEffect', 'updateActiveEffect', 'deleteActiveEffect',
    'createItem', 'updateItem', 'deleteItem']) {
    Hooks.on(hook, doc => {
        const actor = doc instanceof Actor ? doc : (doc.parent instanceof Actor ? doc.parent : doc.parent?.actor);
        actor?.getActiveTokens?.().forEach(t => t.renderFlags?.set({ refreshBars: true }));
    });
}

// Also refresh token bars/AC badges when combat state or combatants change
for (const combatHook of ['createCombat', 'updateCombat', 'deleteCombat', 'createCombatant', 'updateCombatant', 'deleteCombatant', 'combatStart', 'combatTurn', 'combatRound']) {
    Hooks.on(combatHook, () => {
        if (canvas?.ready) {
            canvas.tokens.placeables.forEach(t => t.renderFlags?.set({ refreshBars: true }));
        }
    });
}

/** Whether a bar shows hit points with a maximum worth dividing by. */
export function isHPBar(attr) {
    if (!attr || attr.type !== 'bar' || !(attr.max > 0)) return false;
    const a = String(attr.attribute || '').toLowerCase();
    return a === HP_ATTRIBUTE || a.includes('hp') || a.includes('health');
}

/** Whether this user gets the numbers on this token, per the world's setting. */
function canSeeNumbers(token) {
    return numbersVisible(settings().visibleTo, {
        isGM: game.user.isGM,
        isOwner: token.document.isOwner
    });
}

/**
 * Determine whether the current user is allowed to see the AC shield on `token`:
 * - `off`: Nobody
 * - `everyone`: Everyone
 * - `gm`: GM only
 * - `owner`: Token owners and GM
 * - `combat`: GM always; Players always see AC on Friendly tokens and Player Characters,
 *             and see AC on Neutral/Hostile tokens only when that token is in the same Combat Encounter.
 */
function canSeeAc(token) {
    const mode = settings().acVisibleTo;
    if (mode === 'off') return false;
    if (mode === 'everyone') return true;
    if (mode === 'gm') return game.user.isGM;
    if (mode === 'owner') return game.user.isGM || token.document.isOwner;

    if (mode === 'combat') {
        if (game.user.isGM || token.document.isOwner) return true;

        // Always allow seeing AC of other Player Characters and Friendly tokens
        const actor = token.actor;
        if (actor?.type === 'character' || actor?.hasPlayerOwner) return true;
        if (token.document.disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY) return true;
        if (token.document.disposition === CONST.TOKEN_DISPOSITIONS.SECRET) return false;

        // For Neutral (0) and Hostile (-1) tokens: check if the token is in the same Combat Encounter as the players
        return isTokenInPlayerCombat(token);
    }

    return game.user.isGM || token.document.isOwner;
}

function isTokenInPlayerCombat(token) {
    if (!game.combats) return false;
    const sceneId = canvas?.scene?.id;
    for (const combat of game.combats) {
        if (combat.scene && sceneId && combat.scene.id !== sceneId && combat !== game.combat) continue;
        if (!combat.combatants?.size) continue;

        // Token must be a non-hidden combatant in this encounter
        const tokenInCombat = combat.combatants.some(
            c => !c.hidden && (c.tokenId === token.id || c.token?.id === token.id)
        );
        if (!tokenInCombat) continue;

        // At least one player character or player-owned combatant must also be in this encounter
        const playerInCombat = combat.combatants.some(
            c =>
                c.actor?.isOwner ||
                c.token?.isOwner ||
                c.actor?.hasPlayerOwner ||
                c.actor?.type === 'character' ||
                (game.user.character && c.actorId === game.user.character.id)
        );
        if (playerInCombat) return true;
    }
    return false;
}

export function numbersVisible(visibleTo, { isGM, isOwner }) {
    if (visibleTo === 'off') return false;
    if (visibleTo === 'everyone') return true;
    if (visibleTo === 'gm') return isGM;
    return isGM || isOwner;
}


// Patching & Cleanup
// Wrapped at setup, after libWrapper is ready and before the canvas draws its first token.
Hooks.once('setup', () => {
    const TokenClass = foundry.canvas.placeables.Token;

    if (typeof libWrapper !== 'undefined') {
        libWrapper.register(MODULE_ID, 'foundry.canvas.placeables.Token.prototype.drawBars', drawBarsWrapper, 'WRAPPER');
        libWrapper.register(MODULE_ID, 'foundry.canvas.placeables.Token.prototype._refreshState', refreshStateWrapper, 'WRAPPER');
    } else {
        const origDrawBars = TokenClass.prototype.drawBars;
        TokenClass.prototype.drawBars = function (...args) {
            return drawBarsWrapper.call(this, origDrawBars, ...args);
        };
        const origRefreshState = TokenClass.prototype._refreshState;
        TokenClass.prototype._refreshState = function (...args) {
            return refreshStateWrapper.call(this, origRefreshState, ...args);
        };
    }
});


// Helpers
function redrawAll() {
    style = tempStyle = cfg = null;
    styleVersion++;
    if (canvas?.ready) {
        canvas.tokens.placeables.forEach(t => {
            t.drawBars();
            updateAcBadgeVisibility(t);
        });
        if (canvas.hud?.token?.rendered) canvas.hud.token.render();
    }
}

function getStyle() {
    style ??= new PIXI.TextStyle({
        fontFamily: 'Signika, Arial, sans-serif',
        fontSize: game.settings.get(MODULE_ID, 'fontSize'),
        fill: cssColor(game.settings.get(MODULE_ID, 'textColor'), '#ffffff'),
        stroke: cssColor(game.settings.get(MODULE_ID, 'strokeColor'), '#000000'),
        strokeThickness: game.settings.get(MODULE_ID, 'strokeWidth'),
        lineJoin: 'round',
        miterLimit: 2,
        padding: 4,
        align: 'center'
    });
    return style;
}

function getTempStyle() {
    if (!tempStyle) {
        tempStyle = getStyle().clone();
        tempStyle.fill = foundry.utils.Color.from(tempColor()).css;
    }
    return tempStyle;
}

/** A setting's colour as #rrggbb, whether it comes back as a string or a Color. */
function cssColor(value, fallback) {
    try {
        const color = foundry.utils.Color.from(value);
        return color.valid ? color.css : fallback;
    } catch {
        return fallback;
    }
}
