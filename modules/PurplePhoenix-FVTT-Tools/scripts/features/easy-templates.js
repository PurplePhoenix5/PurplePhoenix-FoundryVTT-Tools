// scripts/features/easy-templates.js
const MODULE_ID = 'PurplePhoenix-FVTT-Tools';

/**
 * Helper to register a wrapper using libWrapper if active, or standard monkey-patching otherwise.
 * NOTE: Every 'WRAPPER' fn MUST unconditionally call `wrapped(...)` so libWrapper never throws an error.
 */
function registerWrapper(target, fn, type = 'WRAPPER') {
  if (globalThis.libWrapper?.register) {
    globalThis.libWrapper.register(MODULE_ID, target, fn, type);
    return;
  }
  const parts = target.split('.');
  const method = parts.pop();
  let obj = globalThis;
  for (const part of parts) {
    obj = obj?.[part];
  }
  if (!obj || typeof obj[method] !== 'function') {
    console.warn(`${MODULE_ID} | Could not wrap ${target}`);
    return;
  }
  const original = obj[method];
  obj[method] = function (...args) {
    return fn.call(this, original.bind(this), ...args);
  };
}

/**
 * Check whether Easy Templates is enabled in the current world.
 * @returns {boolean}
 */
function isEasyTemplatesEnabled() {
  try {
    return Boolean(game.settings.get(MODULE_ID, 'enableEasyTemplates'));
  } catch (_e) {
    return true;
  }
}

/**
 * Get the configured distance snap interval in grid units (default: 2.5).
 * @returns {number}
 */
function getSnapStep() {
  try {
    const val = Number(game.settings.get(MODULE_ID, 'easyTemplatesSnapStep'));
    return Number.isFinite(val) && val > 0 ? val : 2.5;
  } catch (_e) {
    return 2.5;
  }
}

/**
 * Refresh all currently drawn templates on the canvas.
 */
function refreshAllTemplates() {
  if (!canvas?.ready || !canvas.templates?.placeables) return;
  for (const template of canvas.templates.placeables) {
    template.renderFlags?.set({ refreshShape: true });
  }
}

/**
 * Compute the unrotated diagonal endpoint (width, height in pixels) of a rectangle template
 * from its initial diagonal angle (`baseDir`) and diagonal length (`distance`).
 * @param {number} baseDir
 * @param {number} distance
 * @returns {{x: number, y: number}}
 */
function getUnrotatedRectEndpoint(baseDir, distance) {
  if (game.settings.get('core', 'gridTemplates')) {
    return canvas.grid.getTranslatedPoint({ x: 0, y: 0 }, baseDir, distance);
  }
  return foundry.canvas.geometry.Ray.fromAngle(
    0,
    0,
    Math.toRadians(baseDir),
    distance * canvas.dimensions.distancePixels
  ).B;
}

Hooks.once('init', () => {
  game.settings.register(MODULE_ID, 'enableEasyTemplates', {
    name: 'EASYTEMPLATES.Enable',
    hint: 'EASYTEMPLATES.EnableHint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
    onChange: () => refreshAllTemplates()
  });

  game.settings.register(MODULE_ID, 'easyTemplatesSnapStep', {
    name: 'EASYTEMPLATES.SnapStep',
    hint: 'EASYTEMPLATES.SnapStepHint',
    scope: 'world',
    config: false,
    type: Number,
    default: 2.5
  });

  // 1. Initialize preview template size to the snap step when starting a drag
  if (foundry?.canvas?.layers?.TemplateLayer?.prototype?._onDragLeftStart) {
    registerWrapper(
      'foundry.canvas.layers.TemplateLayer.prototype._onDragLeftStart',
      function (wrapped, event) {
        const result = wrapped.call(this, event);
        if (!isEasyTemplatesEnabled()) return result;

        const preview = event?.interactionData?.preview;
        const doc = preview?.document;
        if (!doc) return result;

        const step = getSnapStep();
        if (doc.t === 'rect') {
          const direction = 45;
          const distance = game.settings.get('core', 'gridTemplates') ? step : Math.hypot(step, step);
          doc.direction = direction;
          doc.distance = distance;
          preview._ppBaseDirection = direction;
          doc.updateSource({
            direction,
            distance,
            [`flags.${MODULE_ID}.baseDirection`]: direction
          });
        } else {
          doc.distance = step;
          doc.updateSource({ distance: step });
        }
        preview.renderFlags?.set({ refreshShape: true });
        return result;
      },
      'WRAPPER'
    );
  }

  // 2. Snap template distance (or width & height for rectangles) in fixed intervals while dragging
  if (foundry?.canvas?.layers?.TemplateLayer?.prototype?._onDragLeftMove) {
    registerWrapper(
      'foundry.canvas.layers.TemplateLayer.prototype._onDragLeftMove',
      function (wrapped, event) {
        // Capture raw mouse destination before Foundry's _onDragLeftMove snaps destination to grid points
        const rawDest = event?.interactionData?.destination
          ? { x: event.interactionData.destination.x, y: event.interactionData.destination.y }
          : null;

        const result = wrapped.call(this, event);
        if (!isEasyTemplatesEnabled() || !rawDest) return result;

        const interaction = event?.interactionData;
        const preview = interaction?.preview;
        const origin = interaction?.origin;
        const doc = preview?.document;
        if (!doc || !origin) return result;

        const step = getSnapStep();
        const distancePixels =
          canvas.dimensions.distancePixels || canvas.dimensions.size / canvas.dimensions.distance;

        if (doc.t === 'rect') {
          const rawDx = (rawDest.x - origin.x) / distancePixels;
          const rawDy = (rawDest.y - origin.y) / distancePixels;
          const signX = rawDx < 0 ? -1 : 1;
          const signY = rawDy < 0 ? -1 : 1;
          const snappedDx = signX * Math.max(step, Math.abs(rawDx).toNearest(step));
          const snappedDy = signY * Math.max(step, Math.abs(rawDy).toNearest(step));

          const snappedDest = {
            x: origin.x + snappedDx * distancePixels,
            y: origin.y + snappedDy * distancePixels
          };
          const ray = new foundry.canvas.geometry.Ray(origin, snappedDest);
          const direction = Math.normalizeDegrees(Math.toDegrees(ray.angle));
          const distance = game.settings.get('core', 'gridTemplates')
            ? canvas.grid.measurePath([origin, snappedDest]).distance
            : Math.hypot(snappedDx, snappedDy);

          doc.direction = direction;
          doc.distance = distance;
          preview._ppBaseDirection = direction;
          doc.updateSource({
            direction,
            distance,
            [`flags.${MODULE_ID}.baseDirection`]: direction
          });
          preview.renderFlags?.set({ refreshShape: true });
        } else {
          const ray = new foundry.canvas.geometry.Ray(origin, rawDest);
          let rawDistance;
          if (game.settings.get('core', 'gridTemplates')) {
            rawDistance = canvas.grid.measurePath([origin, rawDest]).distance;
          } else {
            rawDistance = ray.distance / distancePixels;
          }
          const snappedDistance = Math.max(step, rawDistance.toNearest(step));
          const direction = Math.normalizeDegrees(Math.toDegrees(ray.angle));

          doc.direction = direction;
          doc.distance = snappedDistance;
          doc.updateSource({
            direction,
            distance: snappedDistance
          });
          preview.renderFlags?.set({ refreshShape: true });
        }

        return result;
      },
      'WRAPPER'
    );
  }

  // 3. Snap relative rotation for rectangle templates instead of snapping the diagonal angle
  if (foundry?.canvas?.placeables?.MeasuredTemplate?.prototype?._updateRotation) {
    registerWrapper(
      'foundry.canvas.placeables.MeasuredTemplate.prototype._updateRotation',
      function (wrapped, options = {}) {
        const defaultDirection = wrapped.call(this, options);
        if (!isEasyTemplatesEnabled() || this.document?.t !== 'rect') return defaultDirection;

        const baseDir =
          this.document.getFlag(MODULE_ID, 'baseDirection') ??
          this._ppBaseDirection ??
          this.document.direction;
        this._ppBaseDirection = baseDir;

        const { angle, delta = 0, snap = 0 } = options;
        const targetAngle = Number.isNumeric(angle) ? angle : this.document.direction + delta;
        let relRot = targetAngle - baseDir;
        if (snap > 0) relRot = relRot.toNearest(snap);

        return Math.normalizeDegrees(baseDir + relRot);
      },
      'WRAPPER'
    );
  }

  // 4. Compute a truly rotated polygon shape for rectangle templates when rotated
  if (foundry?.canvas?.placeables?.MeasuredTemplate?.prototype?._computeShape) {
    registerWrapper(
      'foundry.canvas.placeables.MeasuredTemplate.prototype._computeShape',
      function (wrapped) {
        const defaultShape = wrapped.call(this);
        if (!isEasyTemplatesEnabled() || this.document?.t !== 'rect') return defaultShape;

        const { distance, direction } = this.document;
        const baseDir =
          this.document.getFlag(MODULE_ID, 'baseDirection') ??
          this._ppBaseDirection ??
          direction;
        this._ppBaseDirection = baseDir;

        const rotDeg = Math.normalizeDegrees(direction - baseDir);
        if (Math.abs(rotDeg) < 1e-4 || Math.abs(rotDeg - 360) < 1e-4) {
          return defaultShape;
        }

        const endpoint = getUnrotatedRectEndpoint(baseDir, distance);
        const rotRad = Math.toRadians(rotDeg);
        const cos = Math.cos(rotRad);
        const sin = Math.sin(rotRad);
        const wx = endpoint.x;
        const hy = endpoint.y;

        const c1x = wx * cos;
        const c1y = wx * sin;
        const c2x = wx * cos - hy * sin;
        const c2y = wx * sin + hy * cos;
        const c3x = -hy * sin;
        const c3y = hy * cos;

        // Keep this.ray pointing at the rotated opposite corner (c2x, c2y)
        this.ray = new foundry.canvas.geometry.Ray(
          { x: this.document.x, y: this.document.y },
          { x: this.document.x + c2x, y: this.document.y + c2y }
        );

        const poly = new PIXI.Polygon(0, 0, c1x, c1y, c2x, c2y, c3x, c3y);
        if (poly.isPositive === false && typeof poly.reverseOrientation === 'function') {
          poly.reverseOrientation();
        }
        return poly;
      },
      'WRAPPER'
    );
  }

  // 5. Keep rectangle ruler label showing constant unrotated width × height even when rotated
  if (foundry?.canvas?.placeables?.MeasuredTemplate?.prototype?._refreshRulerText) {
    registerWrapper(
      'foundry.canvas.placeables.MeasuredTemplate.prototype._refreshRulerText',
      function (wrapped) {
        const result = wrapped.call(this);
        if (!isEasyTemplatesEnabled() || this.document?.t !== 'rect' || !this.ruler) return result;

        const { x: x0, y: y0, distance, direction } = this.document;
        const baseDir =
          this.document.getFlag(MODULE_ID, 'baseDirection') ??
          this._ppBaseDirection ??
          direction;

        const endpoint = getUnrotatedRectEndpoint(baseDir, distance);
        const grid = canvas.grid;
        const dx = grid.measurePath([{ x: x0, y: y0 }, { x: x0 + endpoint.x, y: y0 }]).distance;
        const dy = grid.measurePath([{ x: x0, y: y0 }, { x: x0, y: y0 + endpoint.y }]).distance;

        let w = dx.toNearest(0.01).toLocaleString(game.i18n.lang);
        let h = dy.toNearest(0.01).toLocaleString(game.i18n.lang);
        if (grid.units) {
          w = `${w} ${grid.units}`;
          h = `${h} ${grid.units}`;
        }
        this.ruler.text = `${w} × ${h}`;
        this.ruler.position.set(this.ray.dx + 10, this.ray.dy + 5);
        return result;
      },
      'WRAPPER'
    );
  }
});

// Persist baseDirection on newly created rectangle templates
Hooks.on('preCreateMeasuredTemplate', (doc) => {
  if (!isEasyTemplatesEnabled() || doc.t !== 'rect') return;
  if (doc.getFlag(MODULE_ID, 'baseDirection') === undefined) {
    doc.updateSource({ [`flags.${MODULE_ID}.baseDirection`]: doc.direction });
  }
});

// Ensure baseDirection is saved before a rectangle template is rotated for the first time
Hooks.on('preUpdateMeasuredTemplate', (doc, changes) => {
  if (!isEasyTemplatesEnabled() || doc.t !== 'rect') return;
  if ('direction' in changes) {
    const existingFlag = doc.getFlag(MODULE_ID, 'baseDirection');
    const incomingFlag = foundry.utils.getProperty(changes, `flags.${MODULE_ID}.baseDirection`);
    if (existingFlag === undefined && incomingFlag === undefined) {
      foundry.utils.setProperty(changes, `flags.${MODULE_ID}.baseDirection`, doc.direction);
    }
  }
});
