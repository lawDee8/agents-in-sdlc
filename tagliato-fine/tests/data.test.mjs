import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatPrice, hiddenForMissingPrice, isVisible, loadMenu, validateMenu } from "../js/data.js";

const good = {
  categories: [{
    id: "focaccias", name: { fr: "Focaccias" }, items: [
      { id: "pistacchio", name: "Pistacchio", prices: { M: 890, L: 1190 } },
      { id: "mortadella", name: "Mortadella", prices: { M: null, L: 1190 } },
      { id: "off", name: "Off", price: 500, available: false },
    ],
  }],
};

const silent = { warn() {}, error() {} };
const fakeFetch = (files) => async (url) => {
  const name = url.split("/").pop();
  if (!(name in files)) return { ok: false, status: 404 };
  return { ok: true, json: async () => JSON.parse(files[name]) };
};

test("valid menu passes, missing prices only hide", () => {
  assert.deepEqual(validateMenu(good), { ok: true, errors: [] });
  const [a, b, c] = good.categories[0].items;
  assert.equal(isVisible(a), true);
  assert.equal(isVisible(b), false);
  assert.equal(isVisible(c), false);
  assert.deepEqual(hiddenForMissingPrice(good), ["mortadella"]);
});

test("shape errors name the item id", () => {
  const bad = structuredClone(good);
  bad.categories[0].items[0].prices.M = "8,90";
  delete bad.categories[0].items[1].prices;
  const { ok, errors } = validateMenu(bad);
  assert.equal(ok, false);
  assert.ok(errors.some((e) => e.includes("pistacchio")));
  assert.ok(errors.some((e) => e.includes("mortadella") && e.includes("missing price")));
});

test("broken menu.json falls back to menu-sauvegarde.json", async () => {
  const broken = JSON.stringify(good).replace(",", "");
  const { source } = await loadMenu(fakeFetch({ "menu.json": broken, "menu-sauvegarde.json": JSON.stringify(good) }), silent);
  assert.equal(source, "menu-sauvegarde.json");
});

test("both files broken throws (page shows the call-us message)", async () => {
  await assert.rejects(loadMenu(fakeFetch({ "menu.json": "{", "menu-sauvegarde.json": "{" }), silent));
});

test("shipped data files are valid", () => {
  for (const f of ["menu.json", "menu-sauvegarde.json"]) {
    const menu = JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url)));
    assert.equal(validateMenu(menu).ok, true, f);
  }
  JSON.parse(readFileSync(new URL("../data/infos.json", import.meta.url)));
  JSON.parse(readFileSync(new URL("../data/i18n.json", import.meta.url)));
});

test("prices format per language", () => {
  const nb = (s) => s.replace(/\s/g, " ");
  assert.equal(nb(formatPrice(1190, "fr")), "11,90 €");
  assert.equal(formatPrice(1190, "en"), "€11.90");
});

test("unlabelled prices and price notes", () => {
  const menu = {
    formules: [{ id: "midi", name: { fr: "Midi" }, price_note: { fr: "Boisson offerte" } }],
    categories: [{ id: "d", name: { fr: "Desserts" }, items: [
      { id: "granita", name: "Granita", prices: [350, 550] },
      { id: "half", name: "Half", prices: [350, null] },
    ] }],
  };
  assert.deepEqual(validateMenu(menu), { ok: true, errors: [] });
  assert.equal(isVisible(menu.formules[0]), true);
  assert.equal(isVisible(menu.categories[0].items[0]), true);
  assert.equal(isVisible(menu.categories[0].items[1]), false);
  const bad = { categories: [{ id: "d", name: { fr: "D" }, items: [{ id: "x", name: "X", prices: ["3,50"] }] }] };
  assert.equal(validateMenu(bad).ok, false);
  const noNote = { formules: [{ id: "f", name: { fr: "F" }, price_note: "" }], categories: menu.categories };
  assert.equal(validateMenu(noNote).ok, false);
});
