const MODULE_ID = 'PurplePhoenix-FVTT-Tools';

// Settings 
Hooks.once('init', () => {
    game.settings.register(MODULE_ID, 'enableHpInBar', {
        name: '[HP in Bar] Enable Feature',
        hint: 'Toggle the HP in Bar feature on or off. Requires a refresh.',
        scope: 'client', config: true, type: Boolean, default: true,
        requiresReload: true
    });
    game.settings.register(MODULE_ID, 'fontSize', {
        name: '[HP in Bar] Font Size',
        hint: 'Font size for the HP text inside the token health bar.',
        scope: 'client', config: true, type: Number, default: 16,
        range: { min: 8, max: 48, step: 1 }
    });
    game.settings.register(MODULE_ID, 'textColor', {
        name: '[HP in Bar] Text Color',
        hint: 'Colour of the HP text.',
        scope: 'client', config: true, type: String, default: '#FFFFFF'
    });
    game.settings.register(MODULE_ID, 'strokeColor', {
        name: '[HP in Bar] Stroke/Outline Color',
        hint: 'Outline colour for readability against the bar background.',
        scope: 'client', config: true, type: String, default: '#000000'
    });
    game.settings.register(MODULE_ID, 'strokeWidth', {
        name: '[HP in Bar] Stroke Width',
        hint: 'Thickness of the text outline in pixels.',
        scope: 'client', config: true, type: Number, default: 4,
        range: { min: 0, max: 12, step: 1 }
    });
});

// Die V13-konforme Kern-Logik
function drawBarsWrapper(wrapped, ...args) {
    // 1. Lass Foundry V13 den Balken nativ zeichnen (inklusive bar.clear() und Positionierung)
    const result = wrapped.call(this, ...args);

    try {
        // Falls Token ausgeblendet sind oder gar keine Bars haben, überspringen
        if (!this.actor || this.document.displayBars === CONST.TOKEN_DISPLAY_MODES.NONE) return result;

        // Foundry V13 iteriert intern über bar1 und bar2
        ["bar1", "bar2"].forEach((b) => {
            const bar = this.bars[b];
            const attr = this.document.getBarAttribute(b);

            // Wenn Balken ungültig, unsichtbar oder kein Bar-Typ, Text ausblenden
            if (!attr || attr.type !== "bar" || attr.max === 0 || !bar.visible) {
                if (bar._hpText) bar._hpText.visible = false;
                return;
            }

            // Prüfen, ob das Attribut Lebenspunkte trackt
            const isHP = attr.attribute && (attr.attribute.toLowerCase().includes('hp') || attr.attribute.toLowerCase().includes('health'));
            if (!isHP) {
                if (bar._hpText) bar._hpText.visible = false;
                return;
            }

            const text = `${attr.value} / ${attr.max}`;

            // 2. Text als Child des Graphics-Balkens hinzufügen
            if (!bar._hpText || bar._hpText.destroyed) {
                // Foundry V13 PIXI Syntax
                bar._hpText = new PIXI.Text(text, getStyle());
                bar._hpText.anchor.set(0.5, 0.5);
                bar.addChild(bar._hpText);
            } else {
                bar._hpText.text = text;
                bar._hpText.style = getStyle();
                bar._hpText.visible = true; // Wieder anzeigen, falls vorher ausgeblendet
            }

            // Sicherstellen, dass die Grafik nicht unseren Text überdeckt
            bar.sortableChildren = true;
            bar._hpText.zIndex = 100;

            // 3. Exakte Koordinaten der V13-Engine berechnen
            const { width, height } = this.document.getSize();
            const s = canvas.dimensions?.uiScale || 1;
            const bw = width;
            const bh = 8 * (this.document.height >= 2 ? 1.5 : 1) * s;

            // Da der Text direkt im Balken-Container liegt, ist (0,0) die obere linke Ecke des Balkens
            bar._hpText.x = bw / 2;
            bar._hpText.y = bh / 2;
        });
    } catch (err) {
        console.error(`${MODULE_ID} | Fehler beim Zeichnen der HP:`, err);
    }

    return result;
}

// Patching & cleanup 
Hooks.once('ready', () => {
    if (!game.settings.get(MODULE_ID, 'enableHpInBar')) return;

    // V13 Token Pfad für libWrapper
    const target = 'foundry.canvas.placeables.Token.prototype.drawBars';
    const TokenClass = foundry.canvas.placeables.Token;

    if (typeof libWrapper !== 'undefined') {
        libWrapper.register(MODULE_ID, target, drawBarsWrapper, 'WRAPPER');
    } else {
        const orig = TokenClass.prototype.drawBars;
        TokenClass.prototype.drawBars = function (...args) {
            return drawBarsWrapper.call(this, orig, ...args);
        };
    }

    // Token-Balken sauber neu laden (V13 RenderFlags)
    if (canvas?.ready) {
        canvas.tokens.placeables.forEach(t => t.renderFlags?.set({ refreshBars: true }));
    }
});

// Bei Änderungen der Settings die Balken frisch rendern
Hooks.on('updateSetting', setting => {
    if (!game.settings.get(MODULE_ID, 'enableHpInBar')) return;
    if (setting.key.startsWith(`${MODULE_ID}.`) && canvas?.ready) {
        canvas.tokens.placeables.forEach(t => t.renderFlags?.set({ refreshBars: true }));
    }
});

// Helpers 
function getStyle() {
    return new PIXI.TextStyle({
        fontFamily: 'Signika, Arial, sans-serif',
        fontSize: game.settings.get(MODULE_ID, 'fontSize'),
        fill: game.settings.get(MODULE_ID, 'textColor'),
        stroke: game.settings.get(MODULE_ID, 'strokeColor'),
        strokeThickness: game.settings.get(MODULE_ID, 'strokeWidth'),
        align: 'center'
    });
}