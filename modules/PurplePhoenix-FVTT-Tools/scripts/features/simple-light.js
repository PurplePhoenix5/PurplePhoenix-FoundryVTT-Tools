const MODULE_ID = 'PurplePhoenix-FVTT-Tools';

Hooks.once('init', () => {
    game.settings.register(MODULE_ID, 'enableSimpleLight', {
        name: '[Simple Light] Enable Feature',
        hint: 'Adds a button to the Token HUD to quickly configure light sources.',
        scope: 'client', config: true, type: Boolean, default: true,
        requiresReload: true
    });
});

Hooks.on('renderTokenHUD', (hud, html, data) => {
    if (game.settings.get(MODULE_ID, 'enableSimpleLight') === false) return;
    
    // Bypass html parameter issues
    setTimeout(() => {
        const hudElement = document.getElementById('token-hud');
        if (!hudElement) return;
        
        const leftCol = hudElement.querySelector('.col.left') || hudElement.querySelector('.left');
        if (!leftCol) return;
        
        if (leftCol.querySelector('.control-icon[data-action="toggleSimpleLight"]')) return;
        
        const lightColor = "#422d11";
        const colorAlpha = 0.5;

        const lights = [
            { id: "extinguish", name: "Extinguish", desc: "Bright: 0 ft. Dim: 0 ft.", icon: "icons/svg/light-off.svg", update: { light: { bright: 0, dim: 0, angle: 360, color: null, alpha: 0.25, luminosity: 0.5, attenuation: 0.5, coloration: 10, animation: { type: "none" } } } },
            { id: "lightCantrip", name: "Light Spell", desc: "Bright: 20 ft. Dim: 40 ft.", icon: "modules/PurplePhoenix-FVTT-Tools/icons/light-spell.svg", update: { light: { bright: 20, dim: 40, angle: 360, color: "#000000", alpha: 0, luminosity: 0.5, coloration: 10, animation: { type: 'none' } } } },
            { id: "candle", name: "Candle", desc: "Bright: 5 ft. Dim: 10 ft.", icon: "modules/PurplePhoenix-FVTT-Tools/icons/candle.svg", update: { light: { bright: 5, dim: 10, angle: 360, color: lightColor, alpha: colorAlpha, luminosity: 0, coloration: 1, animation: { type: 'torch', speed: 5, intensity: 10 } } } },
            { id: "lamp", name: "Lamp", desc: "Bright: 15 ft. Dim: 45 ft.", icon: "modules/PurplePhoenix-FVTT-Tools/icons/lamp.svg", update: { light: { bright: 15, dim: 45, angle: 360, color: lightColor, alpha: colorAlpha, luminosity: 0, coloration: 1, animation: { type: 'none' } } } },
            { id: "lantern", name: "Lantern", desc: "Bright: 30 ft. Dim: 60 ft.", icon: "modules/PurplePhoenix-FVTT-Tools/icons/lantern.svg", update: { light: { bright: 30, dim: 60, angle: 360, color: lightColor, alpha: colorAlpha, luminosity: 0, coloration: 1, animation: { type: 'torch', speed: 3, intensity: 3 } } } },
            { id: "bullseye", name: "Bullseye", desc: "Bright: 60 ft. Dim: 120 ft. (Cone)", icon: "modules/PurplePhoenix-FVTT-Tools/icons/bullseye.svg", update: { light: { bright: 60, dim: 120, angle: 60, color: lightColor, alpha: colorAlpha, luminosity: 0, coloration: 1, animation: { type: 'none' } } } },
            { id: "hooded", name: "Hooded", desc: "Bright: 0 ft. Dim: 5 ft.", icon: "modules/PurplePhoenix-FVTT-Tools/icons/hooded.svg", update: { light: { bright: 0, dim: 5, angle: 360, color: lightColor, alpha: colorAlpha, luminosity: 0, coloration: 1, animation: { type: 'none' } } } },
            { id: "torch", name: "Torch", desc: "Bright: 20 ft. Dim: 40 ft.", icon: "modules/PurplePhoenix-FVTT-Tools/icons/torch.svg", update: { light: { bright: 20, dim: 40, angle: 360, color: lightColor, alpha: colorAlpha, luminosity: 0, coloration: 1, animation: { type: 'torch', speed: 5, intensity: 10 } } } }
        ];
        
        const docLight = hud.object?.document?.light;
        let activeLightId = "extinguish";
        if (docLight) {
            const b = docLight.bright || 0;
            const d = docLight.dim || 0;
            const a = docLight.angle || 360;
            const animType = docLight.animation?.type || "none";
            
            if (b === 20 && d === 40) {
                // Use animation type to differentiate Light Spell (none) from Torch (torch)
                // Color values can be tricky (Color objects vs Hex strings)
                activeLightId = animType === "none" ? "lightCantrip" : "torch";
            } else if (b === 5 && d === 10) {
                activeLightId = "candle";
            } else if (b === 15 && d === 45) {
                activeLightId = "lamp";
            } else if (b === 30 && d === 60) {
                activeLightId = "lantern";
            } else if (b === 60 && d === 120 && a === 60) {
                activeLightId = "bullseye";
            } else if (b === 0 && d === 5) {
                activeLightId = "hooded";
            }
        }

        let paletteItems = "";
        for (let l of lights) {
            const isActive = l.id === activeLightId;
            const activeClass = isActive ? "active" : "";
            paletteItems += `
                <a class="simple-light-control ${activeClass}" data-light="${l.id}" style="display: flex; align-items: center; padding: 6px; border-bottom: 1px solid #111; color: #f0f0e0; text-decoration: none;">
                    <div style="flex: 0 0 32px; display: flex; justify-content: center; align-items: center; margin-right: 8px;">
                        <img src="${l.icon}" style="width: 28px; height: 28px; border: none; filter: drop-shadow(1px 1px 2px black);" />
                    </div>
                    <div style="display: flex; flex-direction: column; line-height: 1.2; text-align: left;">
                        <span style="font-weight: bold; font-size: 0.95em;">${l.name}</span>
                        <span style="font-size: 0.75em; color: #b0b0b0;">${l.desc}</span>
                    </div>
                </a>
            `;
        }
        
        // Inject styles for the palette so we don't rely on inline display: none
        if (!document.getElementById('simple-light-style')) {
            const style = document.createElement('style');
            style.id = 'simple-light-style';
            style.innerHTML = `
                .simple-light-palette { display: none; position: absolute; right: 100%; top: 50%; transform: translateY(-50%); width: 200px; background: rgba(30, 30, 30, 0.85); border: 1px solid var(--color-border-dark-1, #191813); border-radius: 5px; margin-right: 10px; flex-direction: column; z-index: 100; box-shadow: 0 0 10px #000; backdrop-filter: blur(4px); }
                .simple-light-palette.active { display: flex !important; }
                .simple-light-control:hover { background: rgba(255, 255, 255, 0.1); }
                .simple-light-control.active { box-shadow: inset 0 0 0 1px var(--color-border-highlight, #ff6400); background: rgba(255, 100, 0, 0.1); }
            `;
            document.head.appendChild(style);
        }
        
        // Use a <button> just like Foundry V13 expects for control icons
        const buttonHtml = `
            <button type="button" class="control-icon" data-action="toggleSimpleLight" title="Light Sources">
                <img src="icons/svg/light.svg" width="36" height="36" style="pointer-events: none;">
            </button>
            <div class="palette simple-light-palette" data-palette="simpleLight">
                <div style="display: flex; flex-direction: column; max-height: 400px; overflow-y: auto;">
                    ${paletteItems}
                </div>
            </div>
        `;
        
        const configBtn = leftCol.querySelector('.control-icon[data-action="config"]');
        
        if (configBtn) {
            configBtn.insertAdjacentHTML('beforebegin', buttonHtml);
        } else {
            leftCol.insertAdjacentHTML('beforeend', buttonHtml);
        }
        
        const lightBtn = leftCol.querySelector('.control-icon[data-action="toggleSimpleLight"]');
        const palette = leftCol.querySelector('.simple-light-palette');

        if (lightBtn && palette) {
            // In Foundry V13 TokenHUD, pointerdown is often intercepted before click. Use pointerdown!
            lightBtn.addEventListener('pointerdown', (ev) => {
                ev.preventDefault();
                ev.stopPropagation(); // prevent TokenHUD clickout from instantly closing it
                
                const isActive = lightBtn.classList.contains('active');
                
                // Close other palettes in HUD
                hudElement.querySelectorAll('.control-icon.active').forEach(icon => {
                    icon.classList.remove('active');
                });
                hudElement.querySelectorAll('.palette').forEach(pal => {
                    pal.classList.remove('active');
                });
                
                if (!isActive) {
                    lightBtn.classList.add('active');
                    palette.classList.add('active');
                }
            });
            
            // Handle item clicks
            palette.querySelectorAll('.simple-light-control').forEach(btn => {
                btn.addEventListener('pointerdown', async (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    const lightId = ev.currentTarget.dataset.light;
                    const lightDef = lights.find(l => l.id === lightId);
                    if (lightDef && hud.object?.document) {
                        await hud.object.document.update(lightDef.update);
                        palette.classList.remove('active');
                        lightBtn.classList.remove('active');
                    }
                });
            });
        }
    }, 10);
});
