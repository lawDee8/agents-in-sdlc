// Render the menu from data/menu.json. Text only via textContent / createElement.

import { formatPrice, isVisible, pick } from "./data.js";
import { formatTime, toMinutes } from "./hours.js";

const ALCOHOL_NOTICE = "L'abus d'alcool est dangereux pour la santé, à consommer avec modération.";

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function priceText(entry, lang) {
  if ("price" in entry) return formatPrice(entry.price, lang);
  if (Array.isArray(entry.prices)) return entry.prices.map((c) => formatPrice(c, lang)).join(" / ");
  if (entry.prices) {
    return Object.entries(entry.prices)
      .map(([size, cents]) => `${size} ${formatPrice(cents, lang)}`)
      .join(" · ");
  }
  return pick(entry.price_note, lang);
}

function tagBadges(item, t) {
  const tags = (item.tags ?? []).filter((tag) => t[`tag_${tag}`]);
  if (!tags.length) return null;
  const wrap = el("p", "tags");
  for (const tag of tags) wrap.append(el("span", "tag", t[`tag_${tag}`]));
  return wrap;
}

function card(item, lang, t, prefix) {
  const li = el("li", "card");
  if (item.photo === true) {
    const img = el("img");
    img.src = `${prefix}img/produits/${item.id}.webp`;
    img.alt = item.name;
    img.width = 600;
    img.height = 400;
    img.loading = "lazy";
    img.decoding = "async";
    li.append(img);
  }
  li.append(el("h3", "card-name", item.name));
  const ingredients = Array.isArray(item.ingredients) ? item.ingredients.join(", ") : item.ingredients;
  if (ingredients) li.append(el("p", "card-ingredients", ingredients));
  li.append(el("p", "card-price", priceText(item, lang)));
  const badges = tagBadges(item, t);
  if (badges) li.append(badges);
  return li;
}

function row(name, price, extra) {
  const li = el("li", "row");
  const label = el("span", "row-name", name);
  if (extra) label.append(el("span", "row-extra", ` ${extra}`));
  li.append(label, el("span", "row-leader"), el("span", "row-price", price));
  return li;
}

function formuleHours(f) {
  if (!f.hours?.from || !f.hours?.to) return "";
  return `${formatTime(f.hours.from)}–${formatTime(f.hours.to)}`;
}

export function visibleFormules(menu) {
  return (menu.formules ?? []).filter(isVisible);
}

// A formule with `days` is offered only on those weekdays; without, every day.
export function formulesForDay(menu, weekday) {
  return visibleFormules(menu).filter((f) => !Array.isArray(f.days) || f.days.includes(weekday));
}

// Still worth showing today: not finished yet (Paris minutes).
export function formuleNotOver(f, minutes) {
  if (!f.hours?.to) return true;
  return minutes < toMinutes(f.hours.to);
}

export function renderFormules(list, formules, lang) {
  list.replaceChildren();
  for (const f of formules) {
    const li = row(pick(f.name, lang), priceText(f, lang));
    const desc = [formuleHours(f), pick(f.description, lang)].filter(Boolean).join(" · ");
    if (desc) li.append(el("span", "row-desc", desc));
    list.append(li);
  }
}

export function renderSignatures(list, menu, ids, lang, t, prefix) {
  list.replaceChildren();
  const items = new Map(menu.categories.flatMap((c) => c.items).map((i) => [i.id, i]));
  for (const id of ids) {
    const item = items.get(id);
    if (item && isVisible(item)) list.append(card(item, lang, t, prefix));
  }
  return list.childElementCount;
}

// Full menu page. Returns the categories that were rendered, for the nav.
export function renderMenu(root, nav, menu, lang, t, prefix) {
  root.replaceChildren();
  nav.replaceChildren();
  const addNav = (id, label) => {
    const li = el("li");
    const a = el("a", null, label);
    a.href = `#${id}`;
    li.append(a);
    nav.append(li);
  };
  const sectionTitle = (id, name) => {
    const h = el("h2");
    h.id = `${id}-titre`;
    if (t.menu_nos) h.append(el("span", "script", t.menu_nos), " ");
    h.append(el("span", "heading-name", name));
    return h;
  };

  const formules = visibleFormules(menu);
  if (formules.length) {
    const s = el("section", "panel menu-section");
    s.id = "formules";
    s.setAttribute("aria-labelledby", "formules-titre");
    const list = el("ul", "rows");
    renderFormules(list, formules, lang);
    s.append(sectionTitle("formules", t.menu_formules), list);
    root.append(s);
    addNav("formules", t.menu_formules_nav ?? t.menu_formules);
  }

  for (const cat of menu.categories) {
    const items = cat.items.filter(isVisible);
    const extras = (cat.extras ?? []).filter((x) => Number.isInteger(x.price));
    if (!items.length && !extras.length) continue;
    const name = pick(cat.name, lang);
    const s = el("section", "panel menu-section");
    s.id = cat.id;
    s.setAttribute("aria-labelledby", `${cat.id}-titre`);
    s.append(sectionTitle(cat.id, name));

    if (items.length) {
      if (cat.layout === "cards") {
        const list = el("ul", "cards");
        for (const item of items) list.append(card(item, lang, t, prefix));
        s.append(list);
      } else {
        const list = el("ul", "rows");
        for (const item of items) {
          const li = row(item.name, priceText(item, lang));
          const desc = pick(item.description, lang);
          if (desc) li.append(el("span", "row-desc", desc));
          const badges = tagBadges(item, t);
          if (badges) li.append(badges);
          list.append(li);
        }
        s.append(list);
      }
    }
    if (extras.length) {
      const line = extras.map((x) => `${pick(x.name, lang)} +${formatPrice(x.price, lang)}`).join(" · ");
      const p = el("p", "extras");
      p.append(el("span", "extras-label", `${t.menu_extras} `), line);
      s.append(p);
    }
    if (cat.legal_notice) s.append(el("p", "notice", ALCOHOL_NOTICE));
    root.append(s);
    addNav(cat.id, name);
  }
  return nav.childElementCount;
}
