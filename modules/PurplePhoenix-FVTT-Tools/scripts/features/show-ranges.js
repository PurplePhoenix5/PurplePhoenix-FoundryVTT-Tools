// scripts/features/show-ranges.js
const MODULE_ID = 'PurplePhoenix-FVTT-Tools';
const FLAG_KEY = 'showRanges';

const RANGES = [
    { distance: 5, color: 0xe61919, css: '#e61919' },
    { distance: 10, color: 0xe67e19, css: '#e67e19' },
    { distance: 30, color: 0x19e653, css: '#19e653' },
    { distance: 60, color: 0x1974e6, css: '#1974e6' }
];

// Token IDs showing range rings privately for the local user only
const privateRangeTokenIds = new Set();

function isShowRangesEnabled() {
    try {
        return Boolean(game.settings.get(MODULE_ID, 'enableShowRanges'));
    } catch (_e) {
        return true;
    }
}

function getDefaultMode() {
    try {
        return game.settings.get(MODULE_ID, 'showRangesMode') || 'prompt';
    } catch (_e) {
        return 'prompt';
    }
}

function getTextResolution(s = 1) {
    const dpr = window.devicePixelRatio || 1;
    return Math.min(8, Math.max(3, Math.ceil(2.5 * Math.max(1, s) * dpr)));
}

function getRangeState(token) {
    if (!token) return null;
    if (token.document?.getFlag(MODULE_ID, FLAG_KEY)) return 'shared';
    if (privateRangeTokenIds.has(token.id)) return 'private';
    return null;
}

function syncTokenRanges(token) {
    if (!token || token.destroyed) return;

    const enabled = isShowRangesEnabled();
    const state = enabled ? getRangeState(token) : null;
    const isSecret = Boolean(token.document?.isSecret);

    if (!state || isSecret) {
        if (token._ppRanges && !token._ppRanges.destroyed) {
            token._ppRanges.visible = false;
        }
        return;
    }

    const gridSize = canvas?.dimensions?.size || 100;
    const distancePerGrid = canvas?.scene?.grid?.distance || 5;
    const gridUnits = canvas?.scene?.grid?.units ?? 'ft';
    const s = canvas?.dimensions?.uiScale || 1;
    const textRes = getTextResolution(s);
    const w = token.w || (token.document?.width || 1) * gridSize;
    const h = token.h || (token.document?.height || 1) * gridSize;

    let container = token._ppRanges;
    if (!container || container.destroyed) {
        container = new PIXI.Container();
        container.eventMode = 'none';
        container.interactiveChildren = false;
        container._graphics = container.addChild(new PIXI.Graphics());
        container._labels = container.addChild(new PIXI.Container());

        const TextClass = foundry.canvas.containers?.PreciseText ?? PIXI.Text;
        container._labelTexts = RANGES.map(r => {
            const style = new PIXI.TextStyle({
                fontFamily: 'Signika, Arial, sans-serif',
                fontSize: 20,
                fontWeight: 'bold',
                fill: r.css,
                stroke: '#000000',
                strokeThickness: 4,
                lineJoin: 'round',
                miterLimit: 2,
                padding: 4,
                align: 'center'
            });
            const t = new TextClass('', style);
            if ('_autoResolution' in t) t._autoResolution = false;
            t.anchor.set(0.5, 1);
            return container._labels.addChild(t);
        });

        token.sortableChildren = true;
        container.zIndex = -100;
        token._ppRanges = token.addChild(container);
    }

    container.visible = true;

    const key = `${w}|${h}|${gridSize}|${distancePerGrid}|${gridUnits}|${s}|${textRes}`;
    if (container._key === key) return;
    container._key = key;

    const g = container._graphics;
    g.clear();

    const cx = w / 2;
    const cy = h / 2;
    const safeDistPerGrid = distancePerGrid > 0 ? distancePerGrid : 5;
    const outlineWidth = Math.max(4, 6 * s);
    const strokeWidth = Math.max(2, 4 * s);

    RANGES.forEach((r, idx) => {
        const extraPx = (r.distance / safeDistPerGrid) * gridSize;
        const rx = (w / 2) + extraPx;
        const ry = (h / 2) + extraPx;

        // Subtle dark halo for crisp contrast on bright maps
        g.lineStyle(outlineWidth, 0x000000, 0.45);
        g.drawEllipse(cx, cy, rx, ry);

        // Main colored range ring
        g.lineStyle(strokeWidth, r.color, 0.85);
        g.drawEllipse(cx, cy, rx, ry);

        const labelText = container._labelTexts[idx];
        if (labelText) {
            const textStr = gridUnits ? `${r.distance} ${gridUnits}` : `${r.distance}`;
            if ('_autoResolution' in labelText) labelText._autoResolution = false;
            if (labelText.resolution !== textRes) labelText.resolution = textRes;
            if (labelText.text !== textStr) labelText.text = textStr;
            labelText.scale.set(s, s);
            labelText.position.set(cx, cy - ry - (4 * s));
        }
    });
}

function refreshAllRangeOverlays() {
    if (!canvas?.ready) return;
    for (const token of canvas.tokens.placeables) {
        syncTokenRanges(token);
    }
}

async function setTokenRanges(tokens, mode = 'private') {
    const list = (Array.isArray(tokens) ? tokens : [tokens]).filter(t => t && !t.destroyed);
    if (list.length === 0) return;

    if (mode === 'shared') {
        const updates = [];
        const fallbackPrivate = [];

        for (const t of list) {
            privateRangeTokenIds.delete(t.id);
            if (game.user.isGM || t.document?.isOwner) {
                if (!t.document.getFlag(MODULE_ID, FLAG_KEY)) {
                    updates.push({ _id: t.id, [`flags.${MODULE_ID}.${FLAG_KEY}`]: true });
                }
            } else {
                fallbackPrivate.push(t);
            }
        }

        if (updates.length > 0 && canvas?.scene) {
            await canvas.scene.updateEmbeddedDocuments('Token', updates);
        }
        if (fallbackPrivate.length > 0) {
            for (const t of fallbackPrivate) {
                privateRangeTokenIds.add(t.id);
                syncTokenRanges(t);
            }
            ui.notifications.warn(game.i18n.localize('SHOWRANGES.SharedPermissionWarn'));
        }
        for (const t of list) syncTokenRanges(t);
        return;
    }

    // Private mode: local client overlay only; clear any owned shared flag so state matches 'private'
    const sharedClearPromises = [];
    for (const t of list) {
        privateRangeTokenIds.add(t.id);
        if (t.document?.getFlag(MODULE_ID, FLAG_KEY) && (game.user.isGM || t.document.isOwner)) {
            sharedClearPromises.push(t.document.unsetFlag(MODULE_ID, FLAG_KEY));
        }
        syncTokenRanges(t);
    }
    if (sharedClearPromises.length > 0) {
        await Promise.all(sharedClearPromises);
        for (const t of list) syncTokenRanges(t);
    }
}

async function clearTokenRanges(tokens) {
    const list = (Array.isArray(tokens) ? tokens : [tokens]).filter(t => t && !t.destroyed);
    if (list.length === 0) return;

    const unsetPromises = [];
    let deniedShared = false;

    for (const t of list) {
        privateRangeTokenIds.delete(t.id);
        if (t.document?.getFlag(MODULE_ID, FLAG_KEY)) {
            if (game.user.isGM || t.document.isOwner) {
                unsetPromises.push(t.document.unsetFlag(MODULE_ID, FLAG_KEY));
            } else {
                deniedShared = true;
            }
        }
        syncTokenRanges(t);
    }

    if (unsetPromises.length > 0) {
        await Promise.all(unsetPromises);
        for (const t of list) syncTokenRanges(t);
    }
    if (deniedShared) {
        ui.notifications.warn(game.i18n.localize('SHOWRANGES.SharedPermissionWarn'));
    }
}

async function clearAllRanges() {
    privateRangeTokenIds.clear();
    if (!canvas?.ready) return;

    const unsetPromises = [];
    for (const t of canvas.tokens.placeables) {
        if (t.document?.getFlag(MODULE_ID, FLAG_KEY) && (game.user.isGM || t.document.isOwner)) {
            unsetPromises.push(t.document.unsetFlag(MODULE_ID, FLAG_KEY));
        }
        syncTokenRanges(t);
    }
    if (unsetPromises.length > 0) {
        await Promise.all(unsetPromises);
        refreshAllRangeOverlays();
    }
}

async function triggerShowRanges(tokens = canvas?.ready ? canvas.tokens.controlled : []) {
    if (!isShowRangesEnabled()) {
        ui.notifications.warn(game.i18n.localize('SHOWRANGES.DisabledWarn'));
        return;
    }

    const list = (Array.isArray(tokens) ? tokens : [tokens]).filter(t => t && !t.destroyed);
    if (list.length === 0) {
        ui.notifications.warn(game.i18n.localize('SHOWRANGES.SelectTokenWarn'));
        return;
    }

    // Toggle OFF immediately if any selected token already shows range rings
    const hasActive = list.some(t => getRangeState(t) !== null);
    if (hasActive) {
        await clearTokenRanges(list);
        return;
    }

    const mode = getDefaultMode();
    if (mode === 'private' || mode === 'shared') {
        await setTokenRanges(list, mode);
        return;
    }

    const DialogV2 = foundry.applications.api.DialogV2;
    const choice = await DialogV2.wait({
        rejectClose: false,
        window: {
            title: game.i18n.localize('SHOWRANGES.DialogTitle'),
            icon: 'fa-solid fa-bullseye'
        },
        position: { width: 340 },
        content: `<p style="margin: 0 0 8px 0;">${foundry.utils.escapeHTML(game.i18n.localize('SHOWRANGES.DialogContent'))}</p>`,
        buttons: [
            {
                action: 'private',
                label: game.i18n.localize('SHOWRANGES.PrivateBtn'),
                icon: 'fa-solid fa-eye-slash',
                default: true
            },
            {
                action: 'shared',
                label: game.i18n.localize('SHOWRANGES.SharedBtn'),
                icon: 'fa-solid fa-users'
            }
        ]
    });

    if (choice === 'private' || choice === 'shared') {
        await setTokenRanges(list, choice);
    }
}

function registerApi() {
    const mod = game.modules?.get(MODULE_ID);
    if (!mod) return;
    mod.api ??= {};
    mod.api.showRanges = {
        trigger: triggerShowRanges,
        set: setTokenRanges,
        clear: clearTokenRanges,
        clearAll: clearAllRanges,
        getState: getRangeState
    };
}

Hooks.once('init', () => {
    game.settings.register(MODULE_ID, 'enableShowRanges', {
        name: 'SHOWRANGES.Enable',
        hint: 'SHOWRANGES.EnableHint',
        scope: 'client',
        config: false,
        type: Boolean,
        default: true,
        onChange: refreshAllRangeOverlays
    });

    game.settings.register(MODULE_ID, 'showRangesMode', {
        name: 'SHOWRANGES.Mode',
        hint: 'SHOWRANGES.ModeHint',
        scope: 'client',
        config: false,
        type: String,
        default: 'prompt',
        choices: {
            prompt: 'SHOWRANGES.ModePrompt',
            private: 'SHOWRANGES.ModePrivate',
            shared: 'SHOWRANGES.ModeShared'
        }
    });

    registerApi();
});

Hooks.once('ready', registerApi);
Hooks.on('canvasReady', refreshAllRangeOverlays);
Hooks.on('drawToken', token => syncTokenRanges(token));
Hooks.on('refreshToken', token => syncTokenRanges(token));
Hooks.on('updateToken', (tokenDoc, changes) => {
    const flagChanged = Boolean(changes?.flags && (MODULE_ID in changes.flags));
    if (flagChanged || 'width' in changes || 'height' in changes || 'disposition' in changes) {
        if (tokenDoc.object) syncTokenRanges(tokenDoc.object);
        const previews = canvas?.tokens?.preview?.children;
        if (previews) {
            for (const p of previews) {
                if (p.id === tokenDoc.id) syncTokenRanges(p);
            }
        }
    }
});
Hooks.on('deleteToken', tokenDoc => {
    privateRangeTokenIds.delete(tokenDoc.id);
});
Hooks.on('canvasTearDown', () => {
    privateRangeTokenIds.clear();
});
