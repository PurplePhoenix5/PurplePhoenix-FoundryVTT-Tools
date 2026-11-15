# PurplePhoenix FVTT Tools

A collection of quality-of-life enhancements for **Foundry VTT v13** (specifically designed for the **D&D 5e** system).

All feature toggles are stored **per World** (`scope: "world"`), so enabling or disabling a feature in one campaign (e.g. *Phandelver*) will never overwrite or activate it in another campaign (e.g. *Curse of Strahd*).

---

## Features

### 1. HP & AC in Bar
Displays crisp, resolution-independent HP numbers, Temporary HP indicators, and an Armor Class (AC) shield directly on token health bars:
- **Map-Resolution Independent & Razor-Sharp Text**: Uses Foundry v13's `PreciseText` with high-DPI supersampling and automatically scales with `canvas.dimensions.uiScale` (grid size), so HP numbers and the AC shield look identical in proportion whether your map uses 70px, 100px, or 200px per square.
- **Visibility Controls**: Configure separately who can see the HP numbers and who can see the AC shield (*Token Owners & GM*, *Everyone*, *GM Only*, or *Off* for AC).
- **Temp HP Display Modes**:
  - **Separately in blue**: `20 +10 / 25` (with `+10` highlighted in D&D 5e Temp HP blue)
  - **Added to HP**: `30 / 25`
  - **Hidden in text**: `20 / 25`
- **Temp HP Shield Overlay**: Optional translucent blue shield overlay across the full height of the health bar.
- **AC Shield Badge**: Displays a heater shield badge with the token's current Armor Class (AC) pinned to the left side of Bar 1 (automatically updates when armor, items, or active effects change AC).

### 2. Easy Temp HP
Manage Temporary Hit Points directly from the right-click **Token HUD** without opening character sheets:
- **Selectable in Bar 2**: Adds `attributes.hp.temp` (*Hit Points (Temp)* / *Trefferpunkte (Temp)*) to the trackable Token Bar attributes in Token Configuration & Prototype Token Configuration.
- **Auto-Assign to Bar 2**: Automatically uses `attributes.hp.temp` for Bar 2 whenever a token's Bar 2 attribute is empty (can be toggled in World Settings).
- **Always Visible in Token HUD**: Keeps the blue **Bar 2** input box visible in the Token HUD even when Temp HP is `0`, while the green **Bar 1** input box displays regular HP (`hp.value` without Temp HP added):
  - **Blue Box (Bar 2 — Temp HP)**: Type `15` to set/overwrite Temp HP, `+5` / `-3` to adjust, or `0` to clear.
  - **Green Box (Bar 1 — Regular HP)**:
    - Type `-8` (damage) to deal 8 damage using standard D&D 5e rules (**Temp HP are deducted first**, and any remainder is subtracted from regular HP!).
    - Type `+6` (healing) to heal regular HP.
    - Type `18` (absolute number) to set regular HP directly to 18 without wiping out active Temp HP.

### 3. Better Measure
Keeps the distance measurement tool (Ruler & optionally Token Drag Ruler) at a **constant, customizable screen size** regardless of camera zoom level or map grid size:
- Perfect for huge world maps or regional maps where zooming out normally shrinks the distance label and line into tiny, unreadable text.
- **Adjustable Size (`50%` – `250%`)**: Each player can set their preferred measurement size in the module settings.
- **Live Zoom Compensation**: Smoothly maintains constant screen size even while zooming in or out with the mouse wheel during an active measurement.

### 4. Easy Templates
Enhances Foundry VTT's Measurement Templates (*Circle*, *Cone*, *Rectangle*, *Ray*):
- **Snappy Distance Intervals**: Instead of changing length in `0.01` increments when dragging, templates snap cleanly to a configurable step interval (default: **`2.5 ft`**) while allowing smooth directional aiming.
- **Snappy Rectangle Dimensions**: Rectangle templates snap both their **width** and **height** directly to the configured step interval (e.g. `10 ft × 15 ft` instead of snapping the diagonal hypotenuse).
- **True Rectangle Rotation**: Rotating a rectangle template with `Ctrl + Mouse Wheel` (`5°` steps) or `Ctrl + Shift + Mouse Wheel` (`15°` steps) **truly rotates the rectangle** (and its grid highlighting) instead of distorting its width/height aspect ratio.

### 5. Simple Light
Adds a **Light Sources** button to the left column of the Token HUD to apply common D&D 5e light sources with a single click:
- **Extinguish** (*0 / 0 ft.*)
- **Light Spell** (*20 / 40 ft.*)
- **Candle** (*5 / 10 ft., flickering*)
- **Lamp** (*15 / 45 ft.*)
- **Lantern** (*30 / 60 ft., flickering*)
- **Bullseye Lantern** (*60 / 120 ft. 60° cone*)
- **Hooded Lantern (Dimmed)** (*0 / 5 ft.*)
- **Torch** (*20 / 40 ft., flickering*)

Uses authentic **Game-Icons.net** vector icons matching Foundry VTT's native UI icon style.

### 6. Easy Flip Token
Press `F` (configurable in *Configure Controls*) to horizontally flip/mirror all currently selected tokens on the canvas with a smooth 150ms animation. Players can flip tokens they own; the GM can flip any token.

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
- Light source icons by Lorc & Delapouite from [Game-Icons.net](https://game-icons.net/) (CC BY 3.0).
