// Set Display Name to "Always for Owner" on all selected tokens
if (canvas.tokens.controlled.length === 0) {
    ui.notifications.warn("Please select at least one token!");
} else {
    const updates = canvas.tokens.controlled.map(token => ({
        _id: token.id,
        displayName: CONST.TOKEN_DISPLAY_MODES.OWNER
    }));

    await canvas.scene.updateEmbeddedDocuments("Token", updates);
    ui.notifications.info(`Set ${updates.length} token(s) to "Always for Owner".`);
}
