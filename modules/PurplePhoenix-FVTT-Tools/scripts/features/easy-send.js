// scripts/features/easy-send.js
const MODULE_ID = 'PurplePhoenix-FVTT-Tools';
const SOCKET_NAME = `module.${MODULE_ID}`;

const PHYSICAL_ITEM_TYPES = new Set([
  'weapon',
  'equipment',
  'consumable',
  'tool',
  'loot',
  'container',
  'backpack'
]);

function isEasySendEnabled() {
  try {
    return Boolean(game.settings.get(MODULE_ID, 'enableEasySend'));
  } catch (_e) {
    return true;
  }
}

function shouldPostChat() {
  try {
    return Boolean(game.settings.get(MODULE_ID, 'easySendPostChat'));
  } catch (_e) {
    return true;
  }
}

/**
 * Check whether an item is a physical inventory item that can be transferred between characters.
 * @param {Item} item
 * @returns {boolean}
 */
function isSendableItem(item) {
  if (!item || !item.actor || !item.isOwner) return false;
  if (item.pack || item.actor.pack) return false;
  if (PHYSICAL_ITEM_TYPES.has(item.type)) return true;
  return 'quantity' in (item.system ?? {});
}

/**
 * Get all eligible recipient actors for transferring items/currency from `sourceActor`.
 * Includes all player characters and party members (excluding `sourceActor`).
 * @param {Actor} sourceActor
 * @returns {Array<{actor: Actor, owners: string, isOnline: boolean}>}
 */
function getRecipientActors(sourceActor) {
  if (!game.actors) return [];

  const partyMemberIds = new Set();
  const partyMembers = game.actors.party?.system?.members;
  if (partyMembers) {
    for (const m of partyMembers) {
      const id = m.actor?.id ?? m.actor;
      if (id) partyMemberIds.add(id);
    }
  }

  // Also include friendly player-owned/character actors on the current canvas scene
  if (canvas?.ready && canvas.tokens?.placeables) {
    for (const token of canvas.tokens.placeables) {
      const a = token.actor;
      if (!a) continue;
      if (a.type === 'character' || a.hasPlayerOwner) {
        partyMemberIds.add(a.id);
      }
    }
  }

  const recipients = [];
  for (const actor of game.actors) {
    if (actor.id === sourceActor?.id) continue;
    const isPC = actor.type === 'character' && (actor.hasPlayerOwner || partyMemberIds.has(actor.id) || game.user.isGM);
    const isPartyMember = partyMemberIds.has(actor.id);
    if (!isPC && !isPartyMember) continue;

    const ownerUsers = game.users.filter(
      u => !u.isGM && actor.testUserPermission(u, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)
    );
    const owners = ownerUsers.map(u => u.name).join(', ') || (actor.hasPlayerOwner ? '' : 'NPC / Party');
    const isOnline = ownerUsers.some(u => u.active) || Boolean(game.users.activeGM);

    recipients.push({
      actor,
      owners,
      isOnline
    });
  }

  recipients.sort((a, b) => a.actor.name.localeCompare(b.actor.name, game.i18n.lang));
  return recipients;
}

/**
 * Inject Easy Send CSS styles once.
 */
function ensureEasySendStyles() {
  if (document.getElementById('pp-easy-send-styles')) return;
  const style = document.createElement('style');
  style.id = 'pp-easy-send-styles';
  style.textContent = `
    .pp-easy-send-dialog .pp-item-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 10px;
      margin-bottom: 12px;
      border-radius: 6px;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--color-border-dark-tertiary, rgba(255, 255, 255, 0.12));
    }
    .pp-easy-send-dialog .pp-item-header img {
      width: 42px;
      height: 42px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.25);
      object-fit: cover;
      flex: 0 0 42px;
    }
    .pp-easy-send-dialog .pp-item-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .pp-easy-send-dialog .pp-item-title {
      font-weight: 700;
      font-size: 1.05em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .pp-easy-send-dialog .pp-item-sub {
      font-size: 0.85em;
      opacity: 0.8;
    }
    .pp-easy-send-dialog .pp-section-label {
      font-weight: 600;
      font-size: 0.9em;
      margin-bottom: 6px;
      display: block;
    }
    .pp-easy-send-dialog .pp-recipient-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 240px;
      overflow-y: auto;
      margin-bottom: 12px;
      padding-right: 2px;
    }
    .pp-easy-send-dialog .pp-recipient-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: rgba(255, 255, 255, 0.03);
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    .pp-easy-send-dialog .pp-recipient-card:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    .pp-easy-send-dialog .pp-recipient-card:has(input[type="radio"]:checked) {
      border-color: var(--color-warm-1, #ff6400);
      background: rgba(255, 100, 0, 0.14);
    }
    .pp-easy-send-dialog .pp-recipient-card input[type="radio"] {
      margin: 0;
    }
    .pp-easy-send-dialog .pp-recipient-card img {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      object-fit: cover;
      border: 1px solid rgba(255, 255, 255, 0.25);
      flex: 0 0 34px;
    }
    .pp-easy-send-dialog .pp-recipient-info {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
      flex: 1;
      min-width: 0;
    }
    .pp-easy-send-dialog .pp-recipient-name {
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .pp-easy-send-dialog .pp-recipient-owner {
      font-size: 0.8em;
      opacity: 0.75;
    }
    .pp-easy-send-dialog .pp-qty-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }
    .pp-easy-send-dialog .pp-qty-row input[type="range"] {
      flex: 1;
    }
    .pp-easy-send-dialog .pp-qty-row input[type="number"] {
      width: 68px;
      text-align: center;
    }
    .pp-easy-send-dialog .pp-qty-quick {
      display: flex;
      gap: 4px;
    }
    .pp-easy-send-dialog .pp-qty-quick button {
      padding: 2px 8px;
      font-size: 0.8em;
      line-height: 1.4;
      min-height: 26px;
    }
    .pp-easy-send-dialog .pp-currency-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 6px;
    }
    .pp-easy-send-dialog .pp-currency-field {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 5px;
      background: rgba(0, 0, 0, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .pp-easy-send-dialog .pp-currency-field label {
      font-weight: 600;
      font-size: 0.88em;
    }
    .pp-easy-send-dialog .pp-currency-field input[type="number"] {
      width: 72px;
      text-align: right;
    }
    .pp-easy-send-chat {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 8px;
      border-radius: 5px;
      background: rgba(0, 0, 0, 0.08);
      border: 1px solid rgba(0, 0, 0, 0.2);
    }
    .pp-easy-send-chat img {
      width: 36px;
      height: 36px;
      border-radius: 4px;
      border: 1px solid rgba(0, 0, 0, 0.3);
      object-fit: cover;
      flex: 0 0 36px;
    }
    .pp-easy-send-chat-details {
      display: flex;
      flex-direction: column;
      line-height: 1.3;
      font-size: 0.92em;
    }
    .footer-content-right .pp-send-currency-btn,
    .currency-header .pp-send-currency-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Open the Easy Send dialog for transferring a specific Item to another player character.
 * @param {Item} item
 * @param {string|null} [preselectedActorId=null]
 */
export async function openEasySendItemDialog(item, preselectedActorId = null) {
  if (!isEasySendEnabled() || !isSendableItem(item)) return;
  ensureEasySendStyles();

  const sourceActor = item.actor;
  const recipients = getRecipientActors(sourceActor);
  if (recipients.length === 0) {
    ui.notifications.warn(game.i18n.localize('EASYSEND.NoRecipients'));
    return;
  }

  const maxQty = Math.max(1, Number(item.system?.quantity ?? 1));
  const defaultTargetId =
    preselectedActorId && recipients.some(r => r.actor.id === preselectedActorId)
      ? preselectedActorId
      : recipients[0].actor.id;

  const recipientItemsHtml = recipients
    .map(({ actor, owners }) => {
      const checked = actor.id === defaultTargetId ? 'checked' : '';
      const ownerText = owners
        ? `<span class="pp-recipient-owner">${foundry.utils.escapeHTML(owners)}</span>`
        : '';
      return `
        <label class="pp-recipient-card">
          <input type="radio" name="targetActorId" value="${actor.id}" ${checked}>
          <img src="${foundry.utils.escapeHTML(actor.img || 'icons/svg/mystery-man.svg')}" alt="">
          <div class="pp-recipient-info">
            <span class="pp-recipient-name">${foundry.utils.escapeHTML(actor.name)}</span>
            ${ownerText}
          </div>
        </label>
      `;
    })
    .join('');

  const qtySectionHtml =
    maxQty > 1
      ? `
        <div>
          <span class="pp-section-label">${game.i18n.localize('EASYSEND.Quantity')} (1 – ${maxQty})</span>
          <div class="pp-qty-row">
            <input type="range" name="quantityRange" min="1" max="${maxQty}" step="1" value="1">
            <input type="number" name="quantity" min="1" max="${maxQty}" step="1" value="1">
            <div class="pp-qty-quick">
              <button type="button" data-qty="1">1</button>
              <button type="button" data-qty="${Math.max(1, Math.floor(maxQty / 2))}">½</button>
              <button type="button" data-qty="${maxQty}">${game.i18n.localize('EASYSEND.Max')}</button>
            </div>
          </div>
        </div>
      `
      : `<input type="hidden" name="quantity" value="1">`;

  const content = `
    <div class="pp-easy-send-dialog">
      <div class="pp-item-header">
        <img src="${foundry.utils.escapeHTML(item.img || 'icons/svg/item-bag.svg')}" alt="">
        <div class="pp-item-meta">
          <span class="pp-item-title">${foundry.utils.escapeHTML(item.name)}</span>
          <span class="pp-item-sub">${game.i18n.format('EASYSEND.AvailableQty', { qty: maxQty, actor: foundry.utils.escapeHTML(sourceActor.name) })}</span>
        </div>
      </div>
      <span class="pp-section-label">${game.i18n.localize('EASYSEND.SelectRecipient')}</span>
      <div class="pp-recipient-list">
        ${recipientItemsHtml}
      </div>
      ${qtySectionHtml}
    </div>
  `;

  const DialogV2 = foundry.applications.api.DialogV2;
  await DialogV2.wait({
    window: {
      title: `${game.i18n.localize('EASYSEND.DialogTitle')}: ${item.name}`,
      icon: 'fa-solid fa-hand-holding-hand'
    },
    position: { width: 420 },
    content,
    render: (_event, dialog) => {
      const root = dialog.element ?? _event?.target?.element;
      if (!root) return;
      const rangeInput = root.querySelector('input[name="quantityRange"]');
      const numInput = root.querySelector('input[name="quantity"]');
      if (rangeInput && numInput) {
        rangeInput.addEventListener('input', () => {
          numInput.value = rangeInput.value;
        });
        numInput.addEventListener('input', () => {
          const v = Math.clamp(Math.floor(Number(numInput.value) || 1), 1, maxQty);
          rangeInput.value = String(v);
        });
        root.querySelectorAll('.pp-qty-quick button[data-qty]').forEach(btn => {
          btn.addEventListener('click', ev => {
            ev.preventDefault();
            const q = Math.clamp(Number(btn.dataset.qty) || 1, 1, maxQty);
            numInput.value = String(q);
            rangeInput.value = String(q);
          });
        });
      }
    },
    buttons: [
      {
        action: 'send',
        label: game.i18n.localize('EASYSEND.SendButton'),
        icon: 'fa-solid fa-paper-plane',
        default: true,
        callback: async (_event, button, dialog) => {
          const form = button.form ?? dialog.element?.querySelector('form') ?? dialog.element;
          const targetId = form?.querySelector('input[name="targetActorId"]:checked')?.value;
          const rawQty = Number(form?.querySelector('input[name="quantity"]')?.value ?? 1);
          const qty = Math.clamp(Math.floor(rawQty || 1), 1, maxQty);
          if (!targetId) return;
          await requestItemTransfer({
            sourceActorId: sourceActor.id,
            targetActorId: targetId,
            itemId: item.id,
            quantity: qty,
            senderUserId: game.user.id
          });
        }
      },
      {
        action: 'cancel',
        label: game.i18n.localize('Cancel'),
        icon: 'fa-solid fa-xmark'
      }
    ]
  });
}

/**
 * Open the Easy Send Currency dialog for transferring coins to another player character.
 * @param {Actor} sourceActor
 */
export async function openEasySendCurrencyDialog(sourceActor) {
  if (!isEasySendEnabled() || !sourceActor?.isOwner) return;
  ensureEasySendStyles();

  const recipients = getRecipientActors(sourceActor);
  if (recipients.length === 0) {
    ui.notifications.warn(game.i18n.localize('EASYSEND.NoRecipients'));
    return;
  }

  const currency = sourceActor.system?.currency ?? {};
  const currenciesConfig = CONFIG.DND5E?.currencies ?? {
    pp: { label: 'PP', abbreviation: 'pp' },
    gp: { label: 'GP', abbreviation: 'gp' },
    ep: { label: 'EP', abbreviation: 'ep' },
    sp: { label: 'SP', abbreviation: 'sp' },
    cp: { label: 'CP', abbreviation: 'cp' }
  };

  const hasAnyCoins = Object.keys(currenciesConfig).some(k => Number(currency[k] || 0) > 0);
  if (!hasAnyCoins) {
    ui.notifications.warn(game.i18n.localize('EASYSEND.NoCurrencyToSend'));
    return;
  }

  const defaultTargetId = recipients[0].actor.id;
  const recipientItemsHtml = recipients
    .map(({ actor, owners }) => {
      const checked = actor.id === defaultTargetId ? 'checked' : '';
      const ownerText = owners
        ? `<span class="pp-recipient-owner">${foundry.utils.escapeHTML(owners)}</span>`
        : '';
      return `
        <label class="pp-recipient-card">
          <input type="radio" name="targetActorId" value="${actor.id}" ${checked}>
          <img src="${foundry.utils.escapeHTML(actor.img || 'icons/svg/mystery-man.svg')}" alt="">
          <div class="pp-recipient-info">
            <span class="pp-recipient-name">${foundry.utils.escapeHTML(actor.name)}</span>
            ${ownerText}
          </div>
        </label>
      `;
    })
    .join('');

  const currencyInputsHtml = Object.entries(currenciesConfig)
    .map(([denom, cfg]) => {
      const available = Math.max(0, Math.floor(Number(currency[denom] || 0)));
      const label = cfg.abbreviation?.toUpperCase() || cfg.label || denom.toUpperCase();
      return `
        <div class="pp-currency-field">
          <label>${foundry.utils.escapeHTML(label)} <span style="opacity:0.65;font-weight:400;">(${available})</span></label>
          <input type="number" name="currency.${denom}" min="0" max="${available}" step="1" value="0" ${available === 0 ? 'disabled' : ''}>
        </div>
      `;
    })
    .join('');

  const content = `
    <div class="pp-easy-send-dialog">
      <span class="pp-section-label">${game.i18n.localize('EASYSEND.SelectRecipient')}</span>
      <div class="pp-recipient-list">
        ${recipientItemsHtml}
      </div>
      <span class="pp-section-label">${game.i18n.localize('EASYSEND.CurrencyAmounts')}</span>
      <div class="pp-currency-grid">
        ${currencyInputsHtml}
      </div>
    </div>
  `;

  const DialogV2 = foundry.applications.api.DialogV2;
  await DialogV2.wait({
    window: {
      title: `${game.i18n.localize('EASYSEND.SendCurrencyTitle')} (${sourceActor.name})`,
      icon: 'fa-solid fa-coins'
    },
    position: { width: 420 },
    content,
    buttons: [
      {
        action: 'send',
        label: game.i18n.localize('EASYSEND.SendButton'),
        icon: 'fa-solid fa-paper-plane',
        default: true,
        callback: async (_event, button, dialog) => {
          const form = button.form ?? dialog.element?.querySelector('form') ?? dialog.element;
          const targetId = form?.querySelector('input[name="targetActorId"]:checked')?.value;
          if (!targetId) return;

          const amounts = {};
          let totalSent = 0;
          for (const denom of Object.keys(currenciesConfig)) {
            const avail = Math.max(0, Math.floor(Number(currency[denom] || 0)));
            const inputVal = Number(form?.querySelector(`input[name="currency.${denom}"]`)?.value ?? 0);
            const clamped = Math.clamp(Math.floor(inputVal || 0), 0, avail);
            if (clamped > 0) {
              amounts[denom] = clamped;
              totalSent += clamped;
            }
          }
          if (totalSent <= 0) return;

          await requestCurrencyTransfer({
            sourceActorId: sourceActor.id,
            targetActorId: targetId,
            amounts,
            senderUserId: game.user.id
          });
        }
      },
      {
        action: 'cancel',
        label: game.i18n.localize('Cancel'),
        icon: 'fa-solid fa-xmark'
      }
    ]
  });
}

/**
 * Route an item transfer request either locally (if user owns both actors),
 * via the active GM socket, or via the online recipient player's socket.
 */
async function requestItemTransfer(payload) {
  const sourceActor = game.actors.get(payload.sourceActorId);
  const targetActor = game.actors.get(payload.targetActorId);
  if (!sourceActor || !targetActor) return;

  // Case 1: Current user owns both source and target actors (e.g. GM or player owning two actors)
  if (sourceActor.isOwner && targetActor.isOwner) {
    await executeItemTransferOnAuthorizedClient(payload);
    ui.notifications.info(
      game.i18n.format('EASYSEND.TransferSuccess', {
        qty: payload.quantity,
        item: sourceActor.items.get(payload.itemId)?.name ?? '',
        target: targetActor.name
      })
    );
    return;
  }

  // Case 2: Active GM is online -> delegate full atomic transfer to active GM
  const activeGM = game.users.activeGM;
  if (activeGM) {
    const itemName = sourceActor.items.get(payload.itemId)?.name ?? '';
    game.socket.emit(SOCKET_NAME, {
      action: 'transferItem',
      processorUserId: activeGM.id,
      payload
    });
    ui.notifications.info(
      game.i18n.format('EASYSEND.TransferSuccess', {
        qty: payload.quantity,
        item: itemName,
        target: targetActor.name
      })
    );
    return;
  }

  // Case 3: No GM online, check if an owner of targetActor is online
  const targetOwner = game.users.find(
    u => u.active && targetActor.testUserPermission(u, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)
  );
  if (targetOwner && sourceActor.isOwner) {
    const extracted = await deductItemFromSource(sourceActor, payload.itemId, payload.quantity);
    if (!extracted) return;
    game.socket.emit(SOCKET_NAME, {
      action: 'receiveItemOnTarget',
      processorUserId: targetOwner.id,
      payload: {
        ...payload,
        itemData: extracted.itemData,
        containedItemsData: extracted.containedItemsData
      }
    });
    ui.notifications.info(
      game.i18n.format('EASYSEND.TransferSuccess', {
        qty: payload.quantity,
        item: extracted.itemData.name,
        target: targetActor.name
      })
    );
    return;
  }

  ui.notifications.warn(game.i18n.localize('EASYSEND.NoOnlineRecipientOrGM'));
}

/**
 * Route a currency transfer request either locally or via socket.
 */
async function requestCurrencyTransfer(payload) {
  const sourceActor = game.actors.get(payload.sourceActorId);
  const targetActor = game.actors.get(payload.targetActorId);
  if (!sourceActor || !targetActor) return;

  if (sourceActor.isOwner && targetActor.isOwner) {
    await executeCurrencyTransferOnAuthorizedClient(payload);
    return;
  }

  const activeGM = game.users.activeGM;
  if (activeGM) {
    game.socket.emit(SOCKET_NAME, {
      action: 'transferCurrency',
      processorUserId: activeGM.id,
      payload
    });
    return;
  }

  const targetOwner = game.users.find(
    u => u.active && targetActor.testUserPermission(u, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)
  );
  if (targetOwner && sourceActor.isOwner) {
    const deducted = await deductCurrencyFromSource(sourceActor, payload.amounts);
    if (!deducted) return;
    game.socket.emit(SOCKET_NAME, {
      action: 'receiveCurrencyOnTarget',
      processorUserId: targetOwner.id,
      payload
    });
    return;
  }

  ui.notifications.warn(game.i18n.localize('EASYSEND.NoOnlineRecipientOrGM'));
}

/**
 * Deduct `quantity` of `itemId` from `sourceActor` and return the prepared item data.
 */
async function deductItemFromSource(sourceActor, itemId, quantity) {
  const item = sourceActor?.items?.get(itemId);
  if (!item) return null;

  const availableQty = Math.max(1, Number(item.system?.quantity ?? 1));
  const transferQty = Math.clamp(Math.floor(Number(quantity) || 1), 1, availableQty);

  const itemData = item.toObject();
  delete itemData._id;
  if (itemData.system) {
    itemData.system.quantity = transferQty;
    itemData.system.container = null;
    if ('equipped' in itemData.system) itemData.system.equipped = false;
    if ('attuned' in itemData.system) itemData.system.attuned = false;
  }

  // If transferring a container, also collect its contained items
  let containedItemsData = [];
  if (item.type === 'container') {
    const contents = sourceActor.items.filter(i => i.system?.container === item.id);
    containedItemsData = contents.map(c => {
      const obj = c.toObject();
      delete obj._id;
      return obj;
    });
    await item.delete({ deleteContents: true });
  } else if (transferQty >= availableQty) {
    await item.delete();
  } else {
    await item.update({ 'system.quantity': availableQty - transferQty });
  }

  return { itemData, containedItemsData, transferQty };
}

/**
 * Add transferred `itemData` (and any `containedItemsData`) to `targetActor`, stacking when appropriate.
 */
async function addItemToTarget(targetActor, itemData, containedItemsData = []) {
  if (!targetActor || !itemData) return;
  const transferQty = Math.max(1, Number(itemData.system?.quantity ?? 1));

  // Try stacking onto an existing uncontained item if not a container
  if (itemData.type !== 'container' && containedItemsData.length === 0 && 'quantity' in (itemData.system ?? {})) {
    const sourceId = itemData._stats?.compendiumSource ?? itemData.flags?.core?.sourceId;
    const existing = targetActor.items.find(i => {
      if (i.type !== itemData.type || i.name !== itemData.name) return false;
      if (i.system?.container) return false;
      const iSourceId = i._stats?.compendiumSource ?? i.flags?.core?.sourceId;
      if (sourceId && iSourceId) return sourceId === iSourceId;
      return ['consumable', 'loot'].includes(itemData.type);
    });

    if (existing) {
      const currentQty = Math.max(0, Number(existing.system?.quantity ?? 0));
      await existing.update({ 'system.quantity': currentQty + transferQty });
      return;
    }
  }

  const created = await targetActor.createEmbeddedDocuments('Item', [itemData]);
  const createdItem = created?.[0];
  if (createdItem && containedItemsData.length > 0) {
    const childrenToCreate = containedItemsData.map(c => {
      if (c.system) c.system.container = createdItem.id;
      return c;
    });
    await targetActor.createEmbeddedDocuments('Item', childrenToCreate);
  }
}

/**
 * Execute full item transfer on a client authorized for both sourceActor and targetActor (e.g. GM).
 */
async function executeItemTransferOnAuthorizedClient(payload) {
  const sourceActor = game.actors.get(payload.sourceActorId);
  const targetActor = game.actors.get(payload.targetActorId);
  if (!sourceActor || !targetActor) return;

  const extracted = await deductItemFromSource(sourceActor, payload.itemId, payload.quantity);
  if (!extracted) return;

  await addItemToTarget(targetActor, extracted.itemData, extracted.containedItemsData);

  if (shouldPostChat()) {
    await postItemTransferChatMessage({
      sourceActor,
      targetActor,
      itemData: extracted.itemData,
      quantity: extracted.transferQty,
      senderUserId: payload.senderUserId
    });
  }
}

async function deductCurrencyFromSource(sourceActor, amounts) {
  const current = foundry.utils.deepClone(sourceActor.system?.currency ?? {});
  const updates = {};
  for (const [denom, val] of Object.entries(amounts)) {
    const qty = Math.max(0, Math.floor(Number(val) || 0));
    if (qty <= 0) continue;
    const avail = Math.max(0, Math.floor(Number(current[denom] || 0)));
    if (avail < qty) return false;
    updates[`system.currency.${denom}`] = avail - qty;
  }
  if (Object.keys(updates).length === 0) return false;
  await sourceActor.update(updates);
  return true;
}

async function addCurrencyToTarget(targetActor, amounts) {
  const current = foundry.utils.deepClone(targetActor.system?.currency ?? {});
  const updates = {};
  for (const [denom, val] of Object.entries(amounts)) {
    const qty = Math.max(0, Math.floor(Number(val) || 0));
    if (qty <= 0) continue;
    const avail = Math.max(0, Math.floor(Number(current[denom] || 0)));
    updates[`system.currency.${denom}`] = avail + qty;
  }
  if (Object.keys(updates).length > 0) {
    await targetActor.update(updates);
  }
}

async function executeCurrencyTransferOnAuthorizedClient(payload) {
  const sourceActor = game.actors.get(payload.sourceActorId);
  const targetActor = game.actors.get(payload.targetActorId);
  if (!sourceActor || !targetActor) return;

  const deducted = await deductCurrencyFromSource(sourceActor, payload.amounts);
  if (!deducted) return;
  await addCurrencyToTarget(targetActor, payload.amounts);

  if (shouldPostChat()) {
    await postCurrencyTransferChatMessage({
      sourceActor,
      targetActor,
      amounts: payload.amounts,
      senderUserId: payload.senderUserId
    });
  }
}

async function postItemTransferChatMessage({ sourceActor, targetActor, itemData, quantity, senderUserId }) {
  ensureEasySendStyles();
  const qtyBadge = quantity > 1 ? ` ×${quantity}` : '';
  const content = `
    <div class="pp-easy-send-chat">
      <img src="${foundry.utils.escapeHTML(itemData.img || 'icons/svg/item-bag.svg')}" alt="">
      <div class="pp-easy-send-chat-details">
        <div><strong>${foundry.utils.escapeHTML(itemData.name)}${qtyBadge}</strong></div>
        <div>${foundry.utils.escapeHTML(sourceActor.name)} <i class="fa-solid fa-arrow-right" style="margin:0 4px;"></i> ${foundry.utils.escapeHTML(targetActor.name)}</div>
      </div>
    </div>
  `;
  await ChatMessage.create({
    author: senderUserId || game.user.id,
    speaker: ChatMessage.getSpeaker({ actor: sourceActor }),
    content
  });
}

async function postCurrencyTransferChatMessage({ sourceActor, targetActor, amounts, senderUserId }) {
  ensureEasySendStyles();
  const parts = Object.entries(amounts)
    .filter(([, v]) => Number(v) > 0)
    .map(([denom, v]) => `${v} ${denom.toUpperCase()}`);
  if (!parts.length) return;

  const content = `
    <div class="pp-easy-send-chat">
      <img src="icons/commodities/currency/coins-assorted-mix-copper-silver-gold.webp" alt="">
      <div class="pp-easy-send-chat-details">
        <div><strong>${foundry.utils.escapeHTML(parts.join(', '))}</strong></div>
        <div>${foundry.utils.escapeHTML(sourceActor.name)} <i class="fa-solid fa-arrow-right" style="margin:0 4px;"></i> ${foundry.utils.escapeHTML(targetActor.name)}</div>
      </div>
    </div>
  `;
  await ChatMessage.create({
    author: senderUserId || game.user.id,
    speaker: ChatMessage.getSpeaker({ actor: sourceActor }),
    content
  });
}

Hooks.once('init', () => {
  game.settings.register(MODULE_ID, 'enableEasySend', {
    name: 'EASYSEND.Enable',
    hint: 'EASYSEND.EnableHint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, 'easySendPostChat', {
    name: 'EASYSEND.PostChat',
    hint: 'EASYSEND.PostChatHint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true
  });
});

Hooks.once('ready', () => {
  ensureEasySendStyles();

  game.socket.on(SOCKET_NAME, async message => {
    try {
      if (!message || message.processorUserId !== game.user.id) return;

      if (message.action === 'transferItem') {
        await executeItemTransferOnAuthorizedClient(message.payload);
      } else if (message.action === 'receiveItemOnTarget') {
        const targetActor = game.actors.get(message.payload.targetActorId);
        const sourceActor = game.actors.get(message.payload.sourceActorId);
        if (!targetActor?.isOwner) return;
        await addItemToTarget(targetActor, message.payload.itemData, message.payload.containedItemsData);
        if (shouldPostChat() && sourceActor) {
          await postItemTransferChatMessage({
            sourceActor,
            targetActor,
            itemData: message.payload.itemData,
            quantity: message.payload.quantity,
            senderUserId: message.payload.senderUserId
          });
        }
      } else if (message.action === 'transferCurrency') {
        await executeCurrencyTransferOnAuthorizedClient(message.payload);
      } else if (message.action === 'receiveCurrencyOnTarget') {
        const targetActor = game.actors.get(message.payload.targetActorId);
        const sourceActor = game.actors.get(message.payload.sourceActorId);
        if (!targetActor?.isOwner) return;
        await addCurrencyToTarget(targetActor, message.payload.amounts);
        if (shouldPostChat() && sourceActor) {
          await postCurrencyTransferChatMessage({
            sourceActor,
            targetActor,
            amounts: message.payload.amounts,
            senderUserId: message.payload.senderUserId
          });
        }
      }
    } catch (err) {
      console.error(`${MODULE_ID} | Easy Send socket error:`, err);
    }
  });
});

// 1. Add "Send Item" to the D&D 5e Item Context Menu (right-click or '...' button in inventory)
Hooks.on('dnd5e.getItemContextOptions', (item, options) => {
  if (!isEasySendEnabled() || !isSendableItem(item)) return;
  if (!Array.isArray(options)) return;

  options.unshift({
    name: game.i18n.localize('EASYSEND.ContextMenuSend'),
    icon: '<i class="fa-solid fa-hand-holding-hand fa-fw"></i>',
    condition: () => isEasySendEnabled() && isSendableItem(item),
    callback: () => openEasySendItemDialog(item),
    group: 'action'
  });
});

// 2. Allow dragging & dropping an owned Item from a Character Sheet directly onto another player's Token on the Canvas
Hooks.on('dropCanvasData', (canvasInstance, data) => {
  if (!isEasySendEnabled() || data?.type !== 'Item' || !data?.uuid) return;
  if (!canvasInstance?.ready || !canvasInstance.tokens?.placeables) return;

  const dropX = Number(data.x);
  const dropY = Number(data.y);
  if (!Number.isFinite(dropX) || !Number.isFinite(dropY)) return;

  // Find a visible token under the drop location
  const targetToken = canvasInstance.tokens.placeables.find(t => {
    if (!t.visible || !t.actor) return false;
    return dropX >= t.x && dropX <= t.x + t.w && dropY >= t.y && dropY <= t.y + t.h;
  });
  if (!targetToken?.actor) return;

  const resolveUuid = foundry.utils?.fromUuid ?? fromUuid;
  resolveUuid(data.uuid).then(item => {
    if (!item || !isSendableItem(item)) return;
    if (item.actor.id === targetToken.actor.id) return;
    openEasySendItemDialog(item, targetToken.actor.id);
  });
});

function createSendCurrencyControl(actor, tagName = 'button', className = 'item-action unbutton always-interactive pp-send-currency-btn') {
  const tooltip = game.i18n.localize('EASYSEND.SendCurrencyTooltip');
  const el = document.createElement(tagName);
  if (tagName === 'button') {
    el.type = 'button';
  } else {
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
  }
  el.className = className;
  el.dataset.tooltip = tooltip;
  el.setAttribute('aria-label', tooltip);
  el.innerHTML = '<i class="fa-solid fa-hand-holding-dollar" inert></i>';
  const trigger = ev => {
    ev.preventDefault();
    ev.stopPropagation();
    openEasySendCurrencyDialog(actor);
  };
  el.addEventListener('click', trigger);
  if (tagName !== 'button') {
    el.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' || ev.key === ' ') trigger(ev);
    });
  }
  return el;
}

function injectSendCurrencyButton(app, element) {
  try {
    if (!isEasySendEnabled()) return;
    const actor = app?.actor ?? app?.document;
    if (!actor || !actor.isOwner || actor.type !== 'character') return;

    const root = element instanceof HTMLElement ? element : element?.[0];
    if (!root) return;

    ensureEasySendStyles();

    // 1. Standard D&D 5e Character Sheet currency bar
    const currencyContainer = root.querySelector('.inventory-element .currency, section.currency');
    if (currencyContainer && !currencyContainer.querySelector('.pp-send-currency-btn')) {
      const btn = createSendCurrencyControl(
        actor,
        'button',
        'item-action unbutton always-interactive pp-send-currency-btn'
      );
      const existingBtn = currencyContainer.querySelector('[data-action="currency"]');
      if (existingBtn) {
        existingBtn.insertAdjacentElement('afterend', btn);
      } else {
        currencyContainer.prepend(btn);
      }
    }

    // 2. Tidy 5e Sheets (inventory footer / currency header)
    const currencyActions = root.querySelectorAll('[data-action="currency"]');
    for (const existingBtn of currencyActions) {
      if (existingBtn.closest('.inventory-element .currency, section.currency')) continue;
      const parent = existingBtn.parentElement;
      if (!parent || parent.querySelector('.pp-send-currency-btn')) continue;

      const isAnchor = existingBtn.tagName === 'A';
      const control = createSendCurrencyControl(
        actor,
        isAnchor ? 'a' : 'button',
        'button button-icon-only flexshrink pp-send-currency-btn'
      );
      existingBtn.insertAdjacentElement('afterend', control);
    }
  } catch (err) {
    console.error(`${MODULE_ID} | Error adding Send Currency button:`, err);
  }
}

// 3. Add a quick "Send Currency" button next to the Currency Manager button on D&D 5e & Tidy 5e Character Sheets
Hooks.on('renderActorSheetV2', (app, element) => {
  injectSendCurrencyButton(app, element);
  requestAnimationFrame(() => injectSendCurrencyButton(app, app?.element ?? element));
});

Hooks.on('tidy5e-sheet.selectTab', (app, element) => {
  injectSendCurrencyButton(app, element ?? app?.element);
  requestAnimationFrame(() => injectSendCurrencyButton(app, app?.element ?? element));
});
