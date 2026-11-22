// Starting path to your audio folder
const baseFolderPath = "assets/audio";

const channelMap = {
    Ambiance: "environment",
    Music: "music",
    Combat: "music"
};

// 1. Dialog to choose the target playlist and audio channel
const DialogV2 = foundry.applications.api.DialogV2;
const playlistType = await DialogV2.wait({
    rejectClose: false,
    window: {
        title: "Select Target Playlist",
        icon: "fa-solid fa-music"
    },
    content: "<p>Which playlist do you want to overwrite with the new folder?</p>",
    buttons: [
        {
            action: "Ambiance",
            label: "Ambiance",
            icon: "fa-solid fa-cloud-moon"
        },
        {
            action: "Music",
            label: "Music",
            icon: "fa-solid fa-music",
            default: true
        },
        {
            action: "Combat",
            label: "Combat",
            icon: "fa-solid fa-swords"
        }
    ]
});

if (!playlistType || !channelMap[playlistType]) return;

startFilePicker(playlistType, channelMap[playlistType]);

// 2. Main folder browser & playlist builder
function startFilePicker(playlistTyp, audioChannel) {
    const FilePickerClass = foundry.applications.apps.FilePicker.implementation;

    new FilePickerClass({
        type: "audio",
        current: baseFolderPath,
        callback: async (selectedFilePath, fp) => {
            // 1. Extract the folder path of the selected audio file
            const lastSlash = selectedFilePath.lastIndexOf("/");
            const folderPath = lastSlash !== -1 ? selectedFilePath.substring(0, lastSlash) : "";
            const source = fp?.activeSource || "data";

            // 2. Browse all files inside that folder
            const browseResult = await FilePickerClass.browse(source, folderPath);

            // Filter audio files only
            const audioExt = /\.(ogg|mp3|opus|wav|m4a|flac|webm)$/i;
            const allAudioFiles = browseResult.files.filter(f => audioExt.test(f));

            if (allAudioFiles.length === 0) {
                ui.notifications.warn("No audio files found in this folder.");
                return;
            }

            // Deduplicate files with different extensions by priority
            const extPriority = { ".ogg": 1, ".mp3": 2, ".opus": 3, ".webm": 4, ".flac": 5, ".wav": 6, ".m4a": 7 };
            const uniqueFiles = new Map();

            for (const filePath of allAudioFiles) {
                const decodedPath = decodeURIComponent(filePath);
                const fileNameWithExt = decodedPath.split("/").pop();

                const lastDotIndex = fileNameWithExt.lastIndexOf(".");
                const baseName = lastDotIndex !== -1 ? fileNameWithExt.substring(0, lastDotIndex) : fileNameWithExt;
                const ext = lastDotIndex !== -1 ? fileNameWithExt.substring(lastDotIndex).toLowerCase() : "";

                const currentPriority = extPriority[ext] ?? 99;

                if (!uniqueFiles.has(baseName) || currentPriority < uniqueFiles.get(baseName).priority) {
                    uniqueFiles.set(baseName, {
                        path: filePath,
                        priority: currentPriority,
                        name: baseName
                    });
                }
            }

            // 3. Build playlist name (decoding %20 spaces)
            let subPath = folderPath.replace(baseFolderPath, "").replace(/^\//, "");
            subPath = decodeURIComponent(subPath);

            const playlistIcons = {
                Ambiance: "☁️",
                Music: "🎵",
                Combat: "⚔️"
            };
            const icon = playlistIcons[playlistTyp] || "🎵";
            const playlistName = subPath ? `${icon} ${playlistTyp}: ${subPath}` : `${icon} ${playlistTyp}`;

            // 4. Find existing playlist matching icon and type
            let playlist = game.playlists.contents.find(p => p.name.includes(icon) && p.name.includes(playlistTyp));

            const sortValues = {
                Ambiance: -100000,
                Music: -99999,
                Combat: -99998
            };
            const sortVal = sortValues[playlistTyp] ?? -90000;

            if (playlist) {
                await playlist.update({ name: playlistName, channel: audioChannel, sort: sortVal });
            } else {
                playlist = await Playlist.create({ name: playlistName, playing: false, channel: audioChannel, sort: sortVal });
            }

            // 5. Remove all existing tracks from the playlist
            const oldSounds = playlist.sounds.map(s => s.id);
            if (oldSounds.length > 0) {
                await playlist.deleteEmbeddedDocuments("PlaylistSound", oldSounds);
            }

            // 6. Prepare filtered tracks with the selected audio channel
            const newSounds = Array.from(uniqueFiles.values()).map(fileData => ({
                name: fileData.name,
                path: fileData.path,
                playing: false,
                volume: 0.5,
                channel: audioChannel
            }));

            // 7. Create new tracks in the playlist
            await playlist.createEmbeddedDocuments("PlaylistSound", newSounds);

            ui.notifications.info(`Loaded ${newSounds.length} track(s) (${playlistTyp}, channel: ${audioChannel})!`);

            // 8. Switch sidebar to the Playlists tab
            ui.sidebar.changeTab("playlists", "primary");
            if (!ui.sidebar.expanded) ui.sidebar.expand();
        }
    }).render({ force: true });
}
