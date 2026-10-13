# Tagliato Fine — website

Static site for Tagliato Fine, Italian café in Cannes. Plain HTML, CSS and ES modules. No framework, no npm, no build step, no third-party request at runtime. The full spec is in `CLAUDE.md`.

## Run locally

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

Opening the files directly (`file://`) does not work: browsers block `fetch` of the JSON files.

## How it works

| File | Role |
|---|---|
| `js/main.js` | Page entry. Loads JSON, fills address, footer, and the page body (`<body data-page="…">`). |
| `js/data.js` | Fetch + validate `menu.json`. On any error, falls back to `menu-sauvegarde.json`. If both fail, the page shows "call us". Validation errors are logged with the item id. |
| `js/hours.js` | Open/closed in Europe/Paris time, reopening time, living theme (`<html data-theme>`), manual override (`localStorage["theme-override"]`), recomputed every 60 s. |
| `js/menu.js` | Renders formules, cards, list rows, extras, alcohol notice. Text only via `textContent`. |
| `js/i18n.js` | Picks strings by `<html lang>`, French fallback. |
| `data/*.json` | All prices, hours, texts. See the data contract in `CLAUDE.md` §4. |
| `tools/build-pages.py` | Dev-only. Regenerates the 15 static pages + `404.html` from `data/i18n.json`. Run it after editing static texts. Do not upload `tools/` or `tests/`. |

Rules the code relies on:
- Prices are integer cents. An item with any `null` price, or `available: false`, is hidden (and listed in the console).
- `hours` with a `todo` key = unconfirmed: no badge, no hours table, light theme. Same for `address` with a `todo`.
- `special_hours` override the weekday: `ranges: [...]` or `"closed"`.
- A formule with `days: ["monday", …]` shows on those days only; `hours: {from, to}` hides it on the home page once over.
- Photos: set `"photo": true` on an item and upload `img/produits/<id>.webp` (600×400). Without the flag no image is requested, so no broken icon and no 404 in the console.
- JSON-LD (`CafeOrCoffeeShop`) is added on the home page only when address and hours are confirmed.

## Tests

```sh
node --test tests/*.test.mjs
TZ=America/New_York node --test tests/*.test.mjs   # visitor in another zone
```

Covers: open/closed at 07:59, 08:00, 21:59, 22:00 (summer and winter time), theme, reopening time, closed days, special hours, midnight closing, unconfirmed hours, menu validation, fallback to the backup file, price format.

## Deploy (alwaysdata)

Upload everything except `tests/`, `tools/`, `CLAUDE.md`, `README.md`, `GUIDE-PROPRIETAIRE.md`.

Before going live:
1. Replace `DOMAINE-A-COMPLETER.fr` in `robots.txt` and `sitemap.xml`; set `SITE_URL` in `tools/build-pages.py` and rerun it (absolute `hreflang`).
2. Set the custom 404 page to `/404.html`.
3. HTTP headers: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and the CSP below **with** `frame-ancestors 'none'` (ignored in a `<meta>` tag, so it is only in the header).
   ⚠️ Not verified how alwaysdata sets custom headers (their help site was unreachable while building). Check their documentation or support before writing any `.htaccess`.

```
default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'
```

## Design notes

- Fonts: Cormorant Garamond (500, 500 italic, 600) and Pinyon Script, OFL, from Fontsource 5.3.0. Licenses in `fonts/`.
- Gold `#C9A44C` fails AA as text on the light panel (2.1:1). Light theme uses bronze `#7A5E1F` (5.5:1) for accent text; gold stays for rules and buttons (dark text on gold: 7.8:1).
- Marble: SVG `feTurbulence` data URI per theme (~1 KB), same seeds everywhere.
- `img/logo.svg` is a placeholder monogram until the real logo file is supplied.

## Known gaps

- No static text-only menu for visitors without JavaScript (spec §8): they see a message instead. Add once real menu data exists.
- Lighthouse, W3C validator and real-device tests (iPhone Safari, Android Chrome) still to run on the live domain.
