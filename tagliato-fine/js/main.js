// Page entry: load data, then fill the parts of the page that depend on it.

import { loadI18n, loadInfos, loadMenu, pick } from "./data.js";
import { pageLang, stringsFor } from "./i18n.js";
import {
  WEEKDAYS,
  formatRanges,
  hoursKnown,
  initHours,
  openStatus,
  parisParts,
  weekdayName,
} from "./hours.js";
import { el, formuleNotOver, formulesForDay, renderFormules, renderMenu, renderSignatures } from "./menu.js";

const SIGNATURE_IDS = ["pistacchio", "granita", "tiramisu"];
// Last resort if even i18n.json cannot load: the visitor still gets a sentence.
const MENU_ERROR_FALLBACK = "La carte ne peut pas s'afficher pour le moment. Appelez-nous : ";

const lang = pageLang();
const page = document.body.dataset.page;
const prefix = document.body.dataset.prefix ?? "";

const $ = (id) => document.getElementById(id);
const settle = (promise) => promise.then((v) => v, (err) => (console.error(err), null));

function addressKnown(infos) {
  const a = infos?.address;
  return Boolean(a && !a.todo && a.street && a.postal_code && a.city);
}

function addressLines(infos) {
  const a = infos.address;
  return [a.street, `${a.postal_code} ${a.city}`];
}

function telHref(phone) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function externalLink(href, text, className) {
  const a = el("a", className, text);
  a.href = href;
  a.rel = "noopener noreferrer";
  return a;
}

function directionLinks(infos) {
  const query = encodeURIComponent([infos.name, ...addressLines(infos)].join(", "));
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${query}`,
    apple: `https://maps.apple.com/?daddr=${query}`,
  };
}

function fillAddress(infos, t) {
  const box = $("address");
  if (!box) return;
  box.replaceChildren();
  if (addressKnown(infos)) {
    const [l1, l2] = addressLines(infos);
    box.append(el("span", "line", l1), el("span", "line", l2));
  }
  const landmark = pick(infos?.address?.landmark, lang);
  if (landmark) box.append(el("span", "line landmark", landmark));

  const actions = $("contact-actions");
  if (!actions) return;
  if (addressKnown(infos)) actions.prepend(externalLink(directionLinks(infos).google, t.directions, "btn"));
  if (infos?.phone) {
    const call = el("a", "btn btn-quiet", t.call);
    call.href = telHref(infos.phone);
    actions.append(call);
  }
}

// "Lun.–dim. 8:00–22:00" style summary, grouping consecutive identical days.
function hoursSummary(infos) {
  const groups = [];
  for (const day of WEEKDAYS) {
    const r = infos.hours[day];
    const text = Array.isArray(r) && r.length ? formatRanges(r) : null;
    const last = groups.at(-1);
    if (last && last.text === text) last.to = day;
    else groups.push({ from: day, to: day, text });
  }
  const short = (d) => new Intl.DateTimeFormat(lang, { weekday: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(2024, 0, 1 + WEEKDAYS.indexOf(d), 12)));
  return groups
    .filter((g) => g.text)
    .map((g) => `${g.from === g.to ? short(g.from) : `${short(g.from)}–${short(g.to)}`} ${g.text}`);
}

function fillFooter(infos, t) {
  const box = $("footer-hours");
  if (box && infos && hoursKnown(infos)) {
    box.replaceChildren(el("strong", null, t.hours_title));
    for (const line of hoursSummary(infos)) box.append(el("br"), line);
  }
  const ig = $("footer-instagram");
  if (ig && infos?.instagram) {
    ig.append(externalLink(infos.instagram, t.instagram));
    ig.hidden = false;
  }
}

function menuError(root, infos, t) {
  const p = el("p", "panel notice-error", t.menu_error ?? MENU_ERROR_FALLBACK);
  if (infos?.phone) {
    const a = el("a", null, infos.phone);
    a.href = telHref(infos.phone);
    p.append(" ", a);
  } else {
    const a = el("a", null, t.nav_contact ?? "Contact");
    a.href = "contact.html";
    p.append(" ", a);
  }
  root.replaceChildren(p);
}

async function homePage(infos, t) {
  const loaded = await settle(loadMenu());
  if (!loaded) return;
  const { menu } = loaded;
  const now = parisParts(new Date());
  const formules = formulesForDay(menu, now.weekday).filter((f) => formuleNotOver(f, now.minutes));
  if (formules.length) {
    renderFormules($("formules-list"), formules, lang);
    $("formules").hidden = false;
  }
  if (renderSignatures($("signatures-list"), menu, SIGNATURE_IDS, lang, t, prefix)) {
    $("signatures").hidden = false;
  }
  addJsonLd(infos);
}

async function menuPage(infos, t) {
  const root = $("menu-root");
  const nav = $("menu-nav-list");
  const loaded = await settle(loadMenu());
  if (!loaded) return menuError(root, infos, t);
  const count = renderMenu(root, nav, loaded.menu, lang, t, prefix);
  if (count === 0) root.replaceChildren(el("p", "panel", t.menu_empty));
  else $("menu-nav").hidden = false;
  $("allergens").hidden = false;
}

function contactPage(infos, t) {
  const actions = $("contact-actions");
  if (infos?.whatsapp) {
    actions.append(externalLink(`https://wa.me/${infos.whatsapp.replace(/\D/g, "")}`, t.whatsapp, "btn btn-quiet"));
  }
  if (addressKnown(infos)) {
    const links = directionLinks(infos);
    const p = $("directions");
    p.append(externalLink(links.google, t.directions_google), " · ", externalLink(links.apple, t.directions_apple));
    p.hidden = false;
  }

  const table = $("hours-table");
  if (!infos || !hoursKnown(infos)) {
    $("hours-unknown").hidden = false;
    return;
  }
  const status = openStatus(infos);
  const body = el("tbody");
  for (const day of WEEKDAYS) {
    const tr = el("tr");
    if (status?.weekday === day) tr.className = "today";
    const th = el("th", null, weekdayName(day, lang));
    th.scope = "row";
    const r = infos.hours[day];
    tr.append(th, el("td", null, Array.isArray(r) && r.length ? formatRanges(r) : t.closed));
    body.append(tr);
  }
  table.append(body);
  table.hidden = false;

  const today = parisParts(new Date()).date;
  const upcoming = (infos.special_hours ?? []).filter((s) => s.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  if (upcoming.length) {
    const list = $("special-list");
    const fmt = new Intl.DateTimeFormat(lang, { dateStyle: "full", timeZone: "UTC" });
    for (const s of upcoming) {
      const when = fmt.format(new Date(`${s.date}T12:00:00Z`));
      const what = Array.isArray(s.ranges) && s.ranges.length ? formatRanges(s.ranges) : t.closed;
      const li = el("li", null, `${when} : ${what}`);
      const note = pick(s.note, lang);
      if (note) li.append(el("span", "row-desc", note));
      list.append(li);
    }
    $("special").hidden = false;
  }
}

function legalPage(infos, t) {
  const legal = infos?.legal ?? {};
  const missing = [];
  for (const dd of document.querySelectorAll("[data-legal]")) {
    const key = dd.dataset.legal;
    const value = legal[key];
    dd.replaceChildren();
    if (value === null || value === undefined || value === "") {
      dd.append(el("mark", "to-complete", t.to_complete));
      missing.push(key);
    } else if (key === "email") {
      const a = el("a", null, value);
      a.href = `mailto:${value}`;
      dd.append(a);
    } else {
      dd.textContent = value;
    }
  }
  if (missing.length) console.warn(`[legal] missing: ${missing.join(", ")}`);
}

// schema.org data only from confirmed fields: no address or hours todo.
function addJsonLd(infos) {
  if (!addressKnown(infos) || !hoursKnown(infos)) return;
  const dayMap = { monday: "Mo", tuesday: "Tu", wednesday: "We", thursday: "Th", friday: "Fr", saturday: "Sa", sunday: "Su" };
  const openingHours = WEEKDAYS.flatMap((d) =>
    (Array.isArray(infos.hours[d]) ? infos.hours[d] : []).map((r) => `${dayMap[d]} ${r.from}-${r.to}`));
  const data = {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name: infos.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: infos.address.street,
      postalCode: infos.address.postal_code,
      addressLocality: infos.address.city,
      addressCountry: infos.address.country,
    },
    openingHours,
    hasMenu: new URL("carte.html", location.href).href,
    url: new URL("./", location.href).href,
  };
  if (infos.phone) data.telephone = infos.phone;
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(data);
  document.head.append(script);
}

async function main() {
  const [all, infos] = await Promise.all([settle(loadI18n()), settle(loadInfos())]);
  const t = stringsFor(all, lang);
  initHours(infos, t, lang);
  if (infos) {
    fillAddress(infos, t);
    fillFooter(infos, t);
  }
  if (page === "home") await homePage(infos, t);
  else if (page === "menu") await menuPage(infos, t);
  else if (page === "contact") contactPage(infos, t);
  else if (page === "legal") legalPage(infos, t);
}

main().catch((err) => console.error(err));
