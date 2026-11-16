const MODULE_ID = 'PurplePhoenix-FVTT-Tools';

let cfg = null;
function settings() {
    cfg ??= {
        enableBetterMeasure: game.settings.get(MODULE_ID, 'enableBetterMeasure'),
        betterMeasureSize: game.settings.get(MODULE_ID, 'betterMeasureSize'),
        betterMeasureIncludeTokenRuler: game.settings.get(MODULE_ID, 'betterMeasureIncludeTokenRuler')
    };
    return cfg;
}

/**
 * Compute the canvas-space scale factor that cancels out the camera zoom (`canvas.stage.scale.x`)
 * so the measurement UI always renders at a constant screen size (`betterMeasureSize` %).
 */
function getMeasureScale() {
    const zoom = canvas?.stage?.scale?.x || 1;
    const userScale = (Number(settings().betterMeasureSize) || 100) / 100;
    return userScale / zoom;
}

function refreshAllRulers() {
    cfg = null;
    if (!canvas?.ready) return;

    // Immediately update any currently rendered waypoint labels in the DOM
    updateDomLabelsScale();

    // Refresh active distance rulers
    if (canvas.controls && game.users) {
        for (const user of game.users) {
            const ruler = canvas.controls.getRulerForUser?.(user.id);
            if (ruler?.active) ruler.refresh();
        }
    }

    // Refresh active token movement rulers
    if (canvas.tokens?.placeables) {
        for (const token of canvas.tokens.placeables) {
            if (token.ruler?.visible) {
                token.renderFlags?.set({ refreshRuler: true });
            }
        }
    }
}

function updateDomLabelsScale() {
    const { enableBetterMeasure, betterMeasureIncludeTokenRuler } = settings();
    const measurementEl = document.querySelector('#hud #measurement');
    if (!measurementEl) return;

    const s = enableBetterMeasure ? getMeasureScale() : (canvas?.dimensions?.uiScale || 1);
    const defaultScale = canvas?.dimensions?.uiScale || 1;

    measurementEl.querySelectorAll('.distance-ruler-labels .waypoint-label').forEach(el => {
        el.style.setProperty('--ui-scale', String(enableBetterMeasure ? s : defaultScale));
    });

    measurementEl.querySelectorAll('.token-ruler-labels .waypoint-label').forEach(el => {
        const useFixed = enableBetterMeasure && betterMeasureIncludeTokenRuler;
        el.style.setProperty('--ui-scale', String(useFixed ? s : defaultScale));
    });
}

Hooks.once('init', () => {
    game.settings.register(MODULE_ID, 'enableBetterMeasure', {
        name: 'BETTERMEASURE.Enable',
        hint: 'BETTERMEASURE.EnableHint',
        scope: 'client',
        config: false,
        type: Boolean,
        default: true,
        onChange: refreshAllRulers
    });

    game.settings.register(MODULE_ID, 'betterMeasureSize', {
        name: 'BETTERMEASURE.Size',
        hint: 'BETTERMEASURE.SizeHint',
        scope: 'client',
        config: false,
        type: Number,
        default: 100,
        range: { min: 50, max: 250, step: 5 },
        onChange: refreshAllRulers
    });

    game.settings.register(MODULE_ID, 'betterMeasureIncludeTokenRuler', {
        name: 'BETTERMEASURE.IncludeTokenRuler',
        hint: 'BETTERMEASURE.IncludeTokenRulerHint',
        scope: 'client',
        config: false,
        type: Boolean,
        default: true,
        onChange: refreshAllRulers
    });
});

// Distance Ruler Wrappers (always call wrapped first for libWrapper WRAPPER compatibility)
function rulerWaypointLabelContextWrapper(wrapped, waypoint, state) {
    const context = wrapped.call(this, waypoint, state);
    if (!context || !settings().enableBetterMeasure) return context;

    const s = getMeasureScale();
    context.uiScale = s;
    if (waypoint?.ray?.B) {
        context.position = {
            x: waypoint.ray.B.x,
            y: waypoint.ray.B.y - (16 * s)
        };
    }
    return context;
}

function rulerWaypointStyleWrapper(wrapped, waypoint) {
    const style = wrapped.call(this, waypoint);
    if (!style || !settings().enableBetterMeasure) return style;

    const uiScale = canvas?.dimensions?.uiScale || 1;
    const s = getMeasureScale();
    if (typeof style.radius === 'number' && style.radius > 0) {
        style.radius = (style.radius / uiScale) * s;
    }
    return style;
}

function rulerSegmentStyleWrapper(wrapped, waypoint) {
    const style = wrapped.call(this, waypoint);
    if (!style || !settings().enableBetterMeasure) return style;

    const uiScale = canvas?.dimensions?.uiScale || 1;
    const s = getMeasureScale();
    if (typeof style.width === 'number' && style.width > 0) {
        style.width = (style.width / uiScale) * s;
    }
    return style;
}

// Token Ruler Wrappers
function tokenRulerWaypointLabelContextWrapper(wrapped, waypoint, state) {
    const context = wrapped.call(this, waypoint, state);
    const { enableBetterMeasure, betterMeasureIncludeTokenRuler } = settings();
    if (!context || !enableBetterMeasure || !betterMeasureIncludeTokenRuler) return context;

    const s = getMeasureScale();
    context.uiScale = s;
    if (waypoint?.ray?.B) {
        context.position = {
            x: waypoint.ray.B.x,
            y: waypoint.ray.B.y + (waypoint.next ? 0 : 0.5 * (this.token?.h || 0)) + (16 * s)
        };
    }
    return context;
}

function tokenRulerWaypointStyleWrapper(wrapped, waypoint) {
    const style = wrapped.call(this, waypoint);
    const { enableBetterMeasure, betterMeasureIncludeTokenRuler } = settings();
    if (!style || !enableBetterMeasure || !betterMeasureIncludeTokenRuler) return style;

    const uiScale = canvas?.dimensions?.uiScale || 1;
    const s = getMeasureScale();
    if (typeof style.radius === 'number' && style.radius > 0) {
        style.radius = (style.radius / uiScale) * s;
    }
    return style;
}

function tokenRulerSegmentStyleWrapper(wrapped, waypoint) {
    const style = wrapped.call(this, waypoint);
    const { enableBetterMeasure, betterMeasureIncludeTokenRuler } = settings();
    if (!style || !enableBetterMeasure || !betterMeasureIncludeTokenRuler) return style;

    const uiScale = canvas?.dimensions?.uiScale || 1;
    const s = getMeasureScale();
    if (typeof style.width === 'number' && style.width > 0) {
        style.width = (style.width / uiScale) * s;
    }
    return style;
}

function wrapMethod(cls, targetPath, methodName, wrapperFn) {
    if (!cls?.prototype?.[methodName]) return;
    if (typeof libWrapper !== 'undefined') {
        libWrapper.register(MODULE_ID, targetPath, wrapperFn, 'WRAPPER');
    } else {
        const orig = cls.prototype[methodName];
        cls.prototype[methodName] = function (...args) {
            return wrapperFn.call(this, orig, ...args);
        };
    }
}

Hooks.once('setup', () => {
    const RulerClass = CONFIG.Canvas?.rulerClass ?? foundry.canvas?.interaction?.Ruler;
    wrapMethod(RulerClass, 'CONFIG.Canvas.rulerClass.prototype._getWaypointLabelContext', '_getWaypointLabelContext', rulerWaypointLabelContextWrapper);
    wrapMethod(RulerClass, 'CONFIG.Canvas.rulerClass.prototype._getWaypointStyle', '_getWaypointStyle', rulerWaypointStyleWrapper);
    wrapMethod(RulerClass, 'CONFIG.Canvas.rulerClass.prototype._getSegmentStyle', '_getSegmentStyle', rulerSegmentStyleWrapper);

    const TokenRulerClass = CONFIG.Token?.rulerClass ?? foundry.canvas?.placeables?.tokens?.TokenRuler;
    wrapMethod(TokenRulerClass, 'CONFIG.Token.rulerClass.prototype._getWaypointLabelContext', '_getWaypointLabelContext', tokenRulerWaypointLabelContextWrapper);
    wrapMethod(TokenRulerClass, 'CONFIG.Token.rulerClass.prototype._getWaypointStyle', '_getWaypointStyle', tokenRulerWaypointStyleWrapper);
    wrapMethod(TokenRulerClass, 'CONFIG.Token.rulerClass.prototype._getSegmentStyle', '_getSegmentStyle', tokenRulerSegmentStyleWrapper);
});

// Keep measurement size constant even when zooming with the mouse wheel while measuring
let lastZoom = null;
Hooks.on('canvasPan', (canvasInstance, position) => {
    if (!settings().enableBetterMeasure) return;
    const currentZoom = position?.scale ?? canvasInstance?.stage?.scale?.x ?? 1;
    if (lastZoom !== null && Math.abs(currentZoom - lastZoom) < 1e-4) return;
    lastZoom = currentZoom;
    refreshAllRulers();
});
