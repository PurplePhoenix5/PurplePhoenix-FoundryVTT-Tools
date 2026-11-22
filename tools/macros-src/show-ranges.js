// Toggle crisp 5 / 10 / 30 / 60 ft range rings on the selected token(s)
const showRanges = game.modules.get("PurplePhoenix-FVTT-Tools")?.api?.showRanges;
if (!showRanges) {
    ui.notifications.error("The 'PurplePhoenix FVTT Tools' module must be enabled!");
    return;
}
await showRanges.trigger();
