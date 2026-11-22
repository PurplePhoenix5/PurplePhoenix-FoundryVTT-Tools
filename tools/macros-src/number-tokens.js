// Number identically-named selected tokens top-to-bottom, left-to-right
const controlled = [...canvas.tokens.controlled];

if (controlled.length === 0) {
    ui.notifications.warn("Please select at least one token.");
    return;
}

const baseName = controlled[0].document.name;

const allSame = controlled.every(t => t.document.name === baseName);
if (!allSame) {
    ui.notifications.warn("Cancelled: All selected tokens must have the exact same name!");
    return;
}

controlled.sort((a, b) => {
    if (Math.abs(a.y - b.y) < 30) return a.x - b.x;
    return a.y - b.y;
});

const updates = controlled.map((token, index) => ({
    _id: token.id,
    name: `${baseName} ${index + 1}`
}));

await canvas.scene.updateEmbeddedDocuments("Token", updates);
ui.notifications.info(`Numbered ${controlled.length} token(s) starting from "${baseName}".`);
