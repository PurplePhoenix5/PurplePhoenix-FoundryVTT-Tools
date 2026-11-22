// 1. Search for a token named "Party" on the current scene
const partyToken = canvas.tokens?.placeables.find(t => t.name === "Party");

if (partyToken?.actor) {
    partyToken.actor.sheet.render({ force: true });
} else {
    // 2. Fallback: Actor named "Party" or D&D 5e's native Primary Party
    const partyActor = game.actors.getName("Party") ?? game.actors.party;

    if (partyActor) {
        partyActor.sheet.render({ force: true });
    } else {
        ui.notifications.warn("No 'Party' token, 'Party' actor, or Primary Party found!");
    }
}
