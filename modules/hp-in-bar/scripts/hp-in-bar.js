const MODULE_ID = 'hp-in-bar';

// Settings 
Hooks.once('init', () => {
    game.settings.register(MODULE_ID, 'fontSize', {
        name: 'HP Font Size',
        hint: 'Font size for the HP text inside the token health bar.',
        scope: 'client', config: true, type: Number, default: 16,
        range: { min: 8, max: 48, step: 1 }
    });
    game.settings.register(MODULE_ID, 'textColor', {
        name: 'HP Text Color',
        hint: 'Colour of the HP text.',
        scope: 'client', config: true, type: String, default: '#FFFFFF'
    });
    game.settings.register(MODULE_ID, 'strokeColor', {
        name: 'HP Stroke/Outline Color',
        hint: 'Outline colour for readability against the bar background.',
        scope: 'client', config: true, type: String, default: '#000000'
    });
    game.settings.register(MODULE_ID, 'strokeWidth', {
        name: 'HP Stroke Width',
        hint: 'Thickness of the text outline in pixels.',
        scope: 'client', config: true, type: Number, default: 4,
        range: { min: 0, max: 12, step: 1 }
    });
});


// Core overlay logic (called after every _drawBar)
function applyHPText(token, result, number, bar, data) {
    // 1. V13 Fix: Tolerantere Prüfung, ob es der HP-Balken ist (fängt auch system.attributes.hp ab)
    if (!bar?.attribute?.includes('hp')) return;
    if (!isPC(token)) return;
    if (!data || data.value == null || data.max == null) return;

    const text = `${data.value} / ${data.max}`;

    // 2. V13 Fix: Alten Text sauber zerstören, bevor wir neu zeichnen (verhindert Geister-Texte)
    if (token._hpText && !token._hpText.destroyed) {
        token._hpText.destroy({ children: true });
    }

    // Text neu erstellen mit PIXI v8 Syntax
    token._hpText = new PIXI.Text({ text: text, style: getStyle() });
    token._hpText.anchor.set(0.5, 0.5);

    // 3. V13 Fix: In den Balken-Container (token.bars) einfügen, nicht ins nackte Token!
    if (token.bars) {
        token.bars.addChild(token._hpText);
    } else {
        token.addChild(token._hpText); // Fallback
    }

    const idx = typeof number === 'number' ? number : (number === 'bar2' ? 1 : 0);

    // 4. V13 Fix: canvas.dimensions.size ist veraltet. Wir nutzen canvas.grid.size
    const gridSize = canvas?.grid?.size || 100;
    const barH = Math.max(gridSize / 12, 8);

    // token.h und token.w sicherheitshalber fallbacken, falls sie fehlen
    const tokenH = token.h || (token.document.height * gridSize);
    const tokenW = token.w || (token.document.width * gridSize);

    const barTop = idx === 0 ? tokenH - barH : tokenH - (2 * barH) - 2;

    // Text exakt mittig im jeweiligen Balken positionieren
    token._hpText.x = tokenW / 2;
    token._hpText.y = barTop + barH / 2;
}

async function drawBarWrapper(wrapped, ...args) {
    const result = await wrapped(...args);
    applyHPText(this, result, ...args);
    return result;
}

// Patching & cleanup 
Hooks.once('ready', () => {
    if (typeof libWrapper === 'function') {
        libWrapper.register(MODULE_ID, 'Token.prototype._drawBar', drawBarWrapper, 'WRAPPER');
    } else {
        const orig = Token.prototype._drawBar;
        Token.prototype._drawBar = function (...args) {
            return drawBarWrapper.call(this, orig.bind(this), ...args);
        };
    }
    // V13 kompatibles Neuladen der Token-Bars
    canvas?.tokens?.placeables?.forEach(t => t.renderFlags?.set({ refresh: true }));
});

Hooks.on('destroyToken', token => {
    if (token._hpText && !token._hpText.destroyed) {
        token._hpText.destroy({ children: true });
    }
    token._hpText = null;
});

// Reapply on setting changes without requiring a scene reload
Hooks.on('updateSetting', setting => {
    if (setting.key.startsWith(`${MODULE_ID}.`)) {
        // V13 kompatibles Neuladen
        canvas?.tokens?.placeables?.forEach(t => t.renderFlags?.set({ refresh: true }));
    }
});

// ---

// Helpers 
function getStyle() {
    return new PIXI.TextStyle({
        fontFamily: 'Arial, sans-serif',
        fontSize: game.settings.get(MODULE_ID, 'fontSize'),
        fill: game.settings.get(MODULE_ID, 'textColor'),
        stroke: game.settings.get(MODULE_ID, 'strokeColor'),
        strokeThickness: game.settings.get(MODULE_ID, 'strokeWidth'),
        align: 'center'
    });
}

function isPC(token) {
    // Sicherheitshalber auch überprüfen, ob actor überhaupt existiert
    return token?.document?.actor?.type === 'character';
}