/**
 * Payments, expenses and the Owner PIN never travel in the shared document.
 * They live in a separate column and are only copied back for a request that
 * presents the current PIN.
 */

export type MoneyEntry = { payments?: unknown[]; expenses?: unknown[] };
export type MoneyMap = Record<string, MoneyEntry>;

export type Doc = {
  version: number;
  clients: Array<{ id: string; payments?: unknown[]; expenses?: unknown[] } & Record<string, unknown>>;
  tasks: unknown[];
  requests: unknown[];
  content: unknown[];
  team: unknown[];
  settings: { ownerPin?: string; ownerPinSet?: boolean; companyName?: string; currency?: string } & Record<string, unknown>;
};

export function emptyDoc(): Doc {
  return {
    version: 3,
    clients: [],
    tasks: [],
    requests: [],
    content: [],
    team: [],
    settings: { companyName: 'Orbit Ops', currency: 'INR', ownerPinSet: false },
  };
}

export function isDoc(value: unknown): value is Doc {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<Doc>;
  return Array.isArray(v.clients) && Array.isArray(v.tasks) && Array.isArray(v.requests) && Array.isArray(v.content) && Array.isArray(v.team);
}

function withoutMoney(client: Doc['clients'][number]) {
  const next = { ...client };
  delete next.payments;
  delete next.expenses;
  return next;
}

export function extractMoney(doc: Doc): { any: boolean; money: MoneyMap } {
  const money: MoneyMap = {};
  let any = false;
  for (const c of doc.clients) {
    const payments = Array.isArray(c.payments) ? c.payments : [];
    const expenses = Array.isArray(c.expenses) ? c.expenses : [];
    if (payments.length || expenses.length) {
      money[c.id] = { payments, expenses };
      any = true;
    }
  }
  return { any, money };
}

/** Document safe to store and to send to anyone who has the team key. */
export function publicDoc(doc: Doc, pinSet: boolean): Doc {
  const settings = { ...doc.settings };
  delete settings.ownerPin;
  settings.ownerPinSet = pinSet;
  return { ...doc, clients: doc.clients.map(withoutMoney), settings };
}

export function withMoney(doc: Doc, money: MoneyMap): Doc {
  return {
    ...doc,
    clients: doc.clients.map(c => {
      const extra = money[c.id];
      return extra ? { ...c, payments: extra.payments || [], expenses: extra.expenses || [] } : { ...c, payments: [], expenses: [] };
    }),
  };
}

export type MergeResult = {
  doc: Doc;
  money: MoneyMap;
  /** Set when the caller is allowed to change the PIN. */
  nextPin: string | null;
  pinChanged: boolean;
  /** Incoming payments were dropped because no valid PIN was presented. */
  paymentsRejected: boolean;
};

/**
 * Work fields always update. Money and the PIN update only when `pinOk`
 * (the presented PIN matches) or when no PIN exists yet and the payload sets one.
 */
export function mergeDoc(stored: Doc, storedMoney: MoneyMap, hadPin: boolean, incoming: Doc, pinOk: boolean): MergeResult {
  const extracted = extractMoney(incoming);
  const proposedPin = typeof incoming.settings?.ownerPin === 'string' ? incoming.settings.ownerPin.trim() : '';
  const settingFirstPin = !hadPin && proposedPin.length >= 4;
  const canWritePrivate = pinOk || settingFirstPin;

  const doc = publicDoc(incoming, hadPin || settingFirstPin || pinOk);
  if (!canWritePrivate) {
    return {
      doc: publicDoc({ ...doc, settings: { ...doc.settings, ownerPinSet: hadPin } }, hadPin),
      money: storedMoney,
      nextPin: null,
      pinChanged: false,
      paymentsRejected: extracted.any,
    };
  }

  const clearingPin = hadPin && pinOk && !proposedPin && incoming.settings?.ownerPinSet === false;
  const money = extracted.money;
  const moneyLeft = Object.values(money).some(e => (e.payments?.length || 0) + (e.expenses?.length || 0) > 0);
  const pinChanged = (settingFirstPin || (pinOk && proposedPin.length >= 4)) && proposedPin.length >= 4;
  const keepPin = clearingPin && !moneyLeft ? false : hadPin || pinChanged;
  return {
    doc: publicDoc(incoming, keepPin),
    money: clearingPin && !moneyLeft ? {} : money,
    nextPin: pinChanged ? proposedPin : null,
    pinChanged,
    paymentsRejected: false,
  };
}
