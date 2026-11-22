// Open the selected token's portrait (prefers high-res Actor artwork)
if (canvas.tokens.controlled.length === 0) {
    ui.notifications.warn("Please select a token first!");
} else {
    const token = canvas.tokens.controlled[0];
    const actor = token.actor;

    const src = actor ? actor.img : token.document.texture.src;
    const title = actor ? actor.name : token.document.name;
    const uuid = actor ? actor.uuid : token.document.uuid;

    const ImagePopoutApp = foundry.applications.apps.ImagePopout;
    new ImagePopoutApp({
        src,
        uuid,
        window: { title }
    }).render({ force: true });
}
