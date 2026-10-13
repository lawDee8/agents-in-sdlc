// Fetch + validate JSON, with fallback to the last known good menu.
// No DOM access at import time, so Node tests can import this module.

const DATA_BASE = new URL("../data/", import.meta.url);

export class DataError extends Error {}

export async function fetchJson(name, fetchImpl = globalThis.fetch) {
  const res = await fetchImpl(new URL(name, DATA_BASE).href, { cache: "no-cache" });
  if (!res.ok) throw new DataError(`${name}: HTTP ${res.status}`);
  try {
    return await res.json();
  } catch (err) {
    throw new DataError(`${name}: invalid JSON (${err.message})`);
  }
}

export function isPrice(value) {
  return Number.isInteger(value) && value >= 0;
}

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isNonEmptyString = (v) => typeof v === "string" && v.trim() !== "";
const isName = (v) => isNonEmptyString(v) || (isObject(v) && isNonEmptyString(v.fr));

function checkPriceField(entry, where, errors) {
  if ("price" in entry) {
    if (entry.price !== null && !isPrice(entry.price)) {
      errors.push(`${where}: price must be integer cents or null`);
    }
  } else if ("prices" in entry) {
    if (!isObject(entry.prices) || Object.keys(entry.prices).length === 0) {
      errors.push(`${where}: prices must be an object like {"M": 890}`);
    } else {
      for (const [size, value] of Object.entries(entry.prices)) {
        if (value !== null && !isPrice(value)) {
          errors.push(`${where}: prices.${size} must be integer cents or null`);
        }
      }
    }
  } else {
    errors.push(`${where}: missing price or prices`);
  }
}

// Shape errors make the file unusable. Missing prices only hide an item.
export function validateMenu(menu) {
  const errors = [];
  if (!isObject(menu)) return { ok: false, errors: ["menu: not an object"] };
  if (!Array.isArray(menu.categories) || menu.categories.length === 0) {
    errors.push("menu.categories: must be a non-empty array");
    return { ok: false, errors };
  }
  const seen = new Set();
  const checkId = (id, where) => {
    if (!isNonEmptyString(id)) errors.push(`${where}: missing id`);
    else if (seen.has(id)) errors.push(`${where}: duplicate id "${id}"`);
    else seen.add(id);
  };

  if (menu.formules !== undefined) {
    if (!Array.isArray(menu.formules)) errors.push("menu.formules: must be an array");
    else menu.formules.forEach((f, i) => {
      const where = `formule ${f?.id ?? "#" + i}`;
      if (!isObject(f)) return errors.push(`${where}: not an object`);
      checkId(f.id, where);
      if (!isName(f.name)) errors.push(`${where}: missing name`);
      checkPriceField(f, where, errors);
    });
  }

  menu.categories.forEach((cat, ci) => {
    const where = `category ${cat?.id ?? "#" + ci}`;
    if (!isObject(cat)) return errors.push(`${where}: not an object`);
    if (!isNonEmptyString(cat.id)) errors.push(`${where}: missing id`);
    if (!isName(cat.name)) errors.push(`${where}: missing name`);
    if (!Array.isArray(cat.items)) return errors.push(`${where}: items must be an array`);
    cat.items.forEach((item, ii) => {
      const iw = `item ${item?.id ?? cat.id + "#" + ii}`;
      if (!isObject(item)) return errors.push(`${iw}: not an object`);
      checkId(item.id, iw);
      if (!isNonEmptyString(item.name)) errors.push(`${iw}: missing name`);
      checkPriceField(item, iw, errors);
    });
    if (cat.extras !== undefined && !Array.isArray(cat.extras)) {
      errors.push(`${where}: extras must be an array`);
    }
  });
  return { ok: errors.length === 0, errors };
}

// An entry is shown only when available and every price is known.
export function hasAllPrices(entry) {
  if ("price" in entry) return isPrice(entry.price);
  if (isObject(entry.prices)) {
    const values = Object.values(entry.prices);
    return values.length > 0 && values.every(isPrice);
  }
  return false;
}

export function isVisible(entry) {
  return entry.available !== false && hasAllPrices(entry);
}

// Ids of entries hidden because a price is missing (for the console and the report).
export function hiddenForMissingPrice(menu) {
  const ids = [];
  for (const f of menu.formules ?? []) if (!hasAllPrices(f)) ids.push(f.id);
  for (const cat of menu.categories) {
    for (const item of cat.items) if (item.available !== false && !hasAllPrices(item)) ids.push(item.id);
  }
  return ids;
}

export async function loadMenu(fetchImpl = globalThis.fetch, log = console) {
  for (const name of ["menu.json", "menu-sauvegarde.json"]) {
    try {
      const menu = await fetchJson(name, fetchImpl);
      const { ok, errors } = validateMenu(menu);
      if (ok) {
        const hidden = hiddenForMissingPrice(menu);
        if (hidden.length) log.warn(`[menu] hidden, price missing: ${hidden.join(", ")}`);
        return { menu, source: name };
      }
      for (const e of errors) log.error(`[menu] ${name}: ${e}`);
    } catch (err) {
      log.error(`[menu] ${err.message}`);
    }
  }
  throw new DataError("menu: both menu.json and menu-sauvegarde.json failed");
}

export const loadInfos = (fetchImpl) => fetchJson("infos.json", fetchImpl);
export const loadI18n = (fetchImpl) => fetchJson("i18n.json", fetchImpl);

// Localized field: {fr, en, it} object or plain string.
export function pick(value, lang) {
  if (isObject(value)) return value[lang] ?? value.fr ?? "";
  return value ?? "";
}

export function formatPrice(cents, lang) {
  return new Intl.NumberFormat(lang, { style: "currency", currency: "EUR" }).format(cents / 100);
}
