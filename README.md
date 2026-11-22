# PurplePhoenix FVTT Tools

A collection of quality-of-life enhancements and utility macros for **Foundry VTT v14** (specifically designed for the **D&D 5e** system).

World-level rules (such as enabling *HP in Bar*, *Who Sees HP/AC*, and *Easy Send*) are restricted to the **GM (`scope: "world"`)** so they apply consistently across all players in that campaign without bleeding into other worlds, while personal visual preferences remain customizable per player (`scope: "client"`).

---

## Features

### 1. HP & AC in Bar
Displays crisp, resolution-independent HP numbers, Temporary HP indicators, and an Armor Class (AC) shield directly on token health bars:
- **Map-Resolution Independent & Razor-Sharp Text**: Uses Foundry's `PreciseText` with high-DPI supersampling and automatically scales with `canvas.dimensions.uiScale` (grid size), so HP numbers and the AC shield look identical in proportion whether your map uses 70px, 100px, or 200px per square.
- **Smart Visibility Controls (GM-Only)**:
  - **HP Numbers**: *Token Owners & GM*, *Everyone*, or *GM Only*.
  - **AC Shield Badge**:
    - **Friendly & Player Characters always; Neutrals & Enemies in same Combat (Default)**: Players always see the AC shield on friendly tokens and other player characters, and see the AC shield on neutral/hostile tokens only when that token is in the same active Combat Encounter! (Works even if monster HP bars are hidden from players.)
    - Also supports *Token Owners & GM*, *Everyone*, *GM Only*, or *Off*.
- **Temp HP Display Modes**:
  - **Added to HP (Default)**: `30 / 25`
  - **Separately in blue**: `20 +10 / 25` (with `+10` highlighted in D&D 5e Temp HP blue)
  - **Hidden in text**: `20 / 25`
- **Temp HP Shield Overlay**: Optional translucent blue shield overlay across the full height of the health bar.

### 2. Better Measure
Keeps the distance measurement tool (Ruler & optionally Token Drag Ruler) at a **constant, customizable screen size** regardless of camera zoom level or map grid size:
- Perfect for huge world maps or regional maps where zooming out normally shrinks the distance label and line into tiny, unreadable text.
- **Adjustable Size (`50%` – `250%`)**: Each player can set their preferred measurement size in the module settings.
- **Live Zoom Compensation**: Smoothly maintains constant screen size even while zooming in or out with the mouse wheel during an active measurement.

### 3. Easy Send
Lightweight player-to-player item and currency transfer without the overhead of heavy trading modules:
- **Send from Inventory Context Menu (`...` or Right-Click)**: Click **Send Item / Item senden** on any physical item in your character sheet to open the recipient & quantity picker.
- **Drag & Drop onto Tokens**: Drag an item directly from your character sheet onto another player's token on the canvas to open the send dialog with that character pre-selected.
- **Send Currency**: Click the **Send Currency** button in the inventory currency bar (supports both the standard D&D 5e sheet and **Tidy 5e Sheets**) to send coins (`PP`, `GP`, `EP`, `SP`, `CP`) to any party member.
- **Automatic Stacking & Chat Log**: Stacks consumables/loot automatically on the recipient and posts a clean transfer summary card in the chat log.

### 4. Simple Light
Adds a **Light Sources** button to the left column of the Token HUD to apply configurable D&D 5e light sources with a single click:
- **Built-in Presets**: **Extinguish** (*0 / 0 ft.*), **Torch** (*20 / 40 ft., flickering*), **Light Spell** (*20 / 40 ft.*), **Daylight** (*60 / 120 ft.*), **Candle** (*5 / 10 ft., flickering*), **Lamp** (*15 / 45 ft.*), **Hooded Lantern** (*30 / 60 ft.*), **Hooded (Dimmed)** (*0 / 5 ft.*), **Bullseye Lantern** (*60 / 120 ft., 60° cone*), and **Darkness Spell** (*15 ft. darkness*).
- **D&D 5e Active Effects & Durations**: Applies lights as timed Active Effects on actors (with fallback to direct `token.light` updates for actorless tokens), automatically preserving custom **Game-Icons.net** vector icons and left-column HUD placement.
- **Full Light Configurator**: GMs can customize presets, durations, colors, shaders/animations, icons, add new light types, and toggle per-player visibility via **Configure Lights** in the Settings Center. Also exposes `game.modules.get("PurplePhoenix-FVTT-Tools").api.simpleLight`.

### 5. Easy Flip Token
Press `F` (configurable in *Configure Controls*) to horizontally flip/mirror all currently selected tokens on the canvas with a smooth 150ms animation. Players can flip tokens they own; the GM can flip any token.

### 6. Show Ranges
Draws crisp `5 ft`, `10 ft`, `30 ft`, and `60 ft` range rings directly onto selected tokens without needing any external modules (no *Token Attacher* or *Tagger* required):
- Triggered via the **Show Ranges** macro in the **PurplePhoenix Macros** compendium.
- **Toggleable & Choice of Visibility**: Choosing *Only Me (Private)* (default) keeps rings visible only on your screen, while *Everyone (Shared)* syncs them for all players; running the macro again turns them right back off. You can also set a default mode in Settings to skip the 2-button prompt.

### 7. Active Effects Manager
Adds a wand button to the Token HUD (right column) that opens a clean dialog listing an actor's **Active**, **Passive** (item-granted), and **Disabled** effects with one-click toggle switches for GMs and token owners.

### 8. Status Effects HUD
Expands the Token HUD conditions menu into a multi-column list (2–5 columns configurable) showing the full localized name of every status effect right next to its icon.

### 9. Pause Border
Surrounds the screen with a glowing purple (`#a855f7`, customizable) border aura whenever the game is paused and optionally replaces the D&D 5e pause banner graphic with a glowing pause icon.

### 10. Readable Discarded Dice
Improves the contrast and legibility of discarded and rerolled dice in expanded Advantage/Disadvantage chat roll tooltips (especially in Dark Mode), with adjustable opacity (`40%`–`100%`, default `70%`) per player.

---

## Compendium: PurplePhoenix Macros

Includes the **PurplePhoenix Macros** compendium pack (`Macro`), upgraded for Foundry VTT v14 and ready to drag onto your hotbar:
- **Audio to Playlist**: Pick a target playlist (*Ambiance*, *Music*, or *Combat*), browse any audio folder (starting at `assets/audio`), deduplicate extensions (`.ogg` > `.mp3` > `.opus` ...), and replace its tracks cleanly.
- **Display Name: Always for Everyone**: Sets all selected tokens' nameplate visibility to *Always for Everyone*.
- **Display Name: Always for Owner**: Sets all selected tokens' nameplate visibility to *Always for Owner*.
- **Number Tokens**: Appends `1`, `2`, `3`, ... to selected identically-named tokens sorted top-to-bottom, left-to-right.
- **Open Party Inventory**: Opens the sheet of a `"Party"` token on the scene, a `"Party"` actor, or D&D 5e's Primary Party (`game.actors.party`).
- **Open Token Portrait**: Opens the high-resolution actor portrait (or token image) of the selected token in an `ImagePopout`.
- **Show Ranges**: Toggles the `5 / 10 / 30 / 60 ft` range ring overlay on the selected token(s).

---

## Installation

### Manual / Local Installation
Copy the `modules/PurplePhoenix-FVTT-Tools` folder into your Foundry VTT `Data/modules/PurplePhoenix-FVTT-Tools` directory.

### Manifest URL
```text
https://github.com/PurplePhoenix5/PurplePhoenix-FoundryVTT-Tools/releases/latest/download/module.json
```

---

## Credits & Acknowledgments
- HP & AC in Bar features inspired by and adapted from [Zeralius's Zeras-vtt-forge-tools](https://github.com/Zeralius/Zeras-vtt-forge-tools).
- Active Effects Manager, Expanded Status Effects HUD, Pause Border, and configurable Light Picker features inspired by and adapted from Stephen Garrett's (`wgtngm`) [Mini Tweaks](https://foundryvtt.com/packages/mini-tweaks).
- Light source icons by Lorc & Delapouite from [Game-Icons.net](https://game-icons.net/) (CC BY 3.0).
