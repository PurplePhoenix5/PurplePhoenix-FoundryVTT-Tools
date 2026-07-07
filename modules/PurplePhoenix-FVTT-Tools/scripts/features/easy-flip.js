const MODULE_ID = 'PurplePhoenix-FVTT-Tools';

Hooks.once('init', () => {
    game.settings.register(MODULE_ID, 'enableEasyFlip', {
        name: '[Easy Flip] Enable Feature',
        hint: 'Toggle the Easy Flip feature on or off. Requires a refresh.',
        scope: 'client', config: true, type: Boolean, default: true,
        requiresReload: true
    });

    game.keybindings.register(MODULE_ID, 'easyFlip', {
        name: 'Easy Flip Token',
        hint: 'Flips the selected tokens horizontally.',
        editable: [
            { key: 'KeyF' }
        ],
        onDown: () => {
            flipSelectedTokens();
            return true;
        },
        restricted: false,
        precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
    });
});

async function flipSelectedTokens() {
    if (!canvas?.ready) return;
    if (game.settings.get(MODULE_ID, 'enableEasyFlip') === false) return;
    
    const tokens = canvas.tokens.controlled;
    if (tokens.length === 0) return;

    const updates = [];
    for (const token of tokens) {
        // Player must own the token to flip it, unless they are GM
        if (!game.user.isGM && !token.document.isOwner) {
            continue;
        }

        // Use _source to avoid reading mid-animation interpolated values that cause shrinking when spammed
        const baseScale = Math.abs(token.document._source.texture.scaleX || 1);
        const currentSign = Math.sign(token.document.texture.scaleX || 1);
        
        updates.push({
            _id: token.id,
            "texture.scaleX": baseScale * (currentSign === 1 ? -1 : 1)
        });
    }

    if (updates.length > 0) {
        await canvas.scene.updateEmbeddedDocuments("Token", updates, { animation: { duration: 150 } });
    }
}
