# Tagliato Fine — website spec for Claude Code

Read this file fully before writing any code. It is the single source of truth.

## 1. Project

Website for **Tagliato Fine**, an Italian café, charcuterie and focaccia counter in Cannes (Côte d'Azur, France). Breakfast, focaccia sandwiches, salads, Sicilian granita, coffee, Italian drinks, aperitivo.

The site has one job: a person on a phone, often a tourist, finds out **what they can eat, what it costs, whether it is open now, and how to get there**, in under 10 seconds.

The site is a gift to the owners, who are close friends of the developer. It must be reliable, correct and need no maintenance except price/photo updates.

## 2. Hard constraints

1. **Static site only.** Plain HTML, CSS, vanilla JavaScript (ES modules allowed). No framework, no build step, no npm, no server code, no database.
2. **No third-party requests at runtime.** No CDN, no Google Fonts link, no Google Maps embed, no analytics, no tracking pixels, no cookies. Fonts are self-hosted in `/fonts`. Reason: RGPD (visitor IPs must not leave to third parties) and reliability.
3. **No forms.** Contact is `tel:`, WhatsApp link, and a plain link to Google Maps / Apple Maps directions.
4. **All prices, hours and texts come from `data/*.json`.** Never hard-code a price or an opening hour in HTML or JS.
5. **Never invent data.** If a value is `null` or has a `todo`, render nothing for it (or hide the item) and list it in the final report. Do not guess prices, hours, phone numbers.
6. **Mobile first.** Designed for a 375 px wide phone, then scaled up.
7. **Languages:** French (default, `/`), English (`/en/`), Italian (`/it/`). Product names stay as written in `menu.json`. UI strings live in `data/i18n.json`. EN and IT translations must be marked `"review": true` until a human checks them.
8. **Code language:** English for code, comments, file names, commit messages. Player-facing (visitor-facing) text in FR/EN/IT.
9. **Hosting:** alwaysdata (France), upload by SFTP. Owners update prices by replacing `data/menu.json` only.

## 3. File structure

```
/
├── index.html                 Home
├── carte.html                 Full menu (rendered from data/menu.json)
├── contact.html               Address, hours, phone, directions
├── mentions-legales.html      Legal notice (required in France)
├── confidentialite.html       Privacy page
├── 404.html
├── en/  (same pages, English)
├── it/  (same pages, Italian)
├── css/
│   └── style.css              One stylesheet, mobile first
├── js/
│   ├── data.js                Fetch + validate JSON, fallback logic
│   ├── menu.js                Render the menu
│   ├── hours.js               "Open now" badge, today's hours
│   └── i18n.js                Pick strings by <html lang>
├── data/
│   ├── menu.json              Products and prices (owner edits this)
│   ├── menu-sauvegarde.json   Last known good copy (fallback)
│   ├── infos.json             Hours, address, contact, legal
│   └── i18n.json              UI strings fr/en/it
├── img/
│   ├── logo.svg
│   ├── hero/
│   └── produits/              <item-id>.webp, e.g. pistacchio.webp
├── fonts/                     Self-hosted woff2 files + license files
├── robots.txt
├── sitemap.xml
├── README.md                  Handover doc for any future developer
└── GUIDE-PROPRIETAIRE.md      Owner guide in French (written last)
```

## 4. Data contract

### menu.json
- Prices are **integer cents** (`1190` = 11,90 €). Format with `Intl.NumberFormat(lang, { style: "currency", currency: "EUR" })`.
- An item has either `price` (single) or `prices` (map of size → cents, e.g. `{ "M": 890, "L": 1190 }`).
- `available: false` → item is hidden.
- Any item whose price is `null` → hidden, and reported.
- `tags` drive small badges: `vegetarien`, `poisson`, `poulet`.
- `formules` are rendered in a dedicated block at the top of the menu, with their hours.
- `legal_notice: true` on the alcohol category → show the mandatory French notice under it: "L'abus d'alcool est dangereux pour la santé, à consommer avec modération."

### infos.json
- `hours`: per weekday, list of `{from, to}` ranges, 24 h `HH:MM`, timezone `Europe/Paris`.
- `special_hours`: list of `{ date: "YYYY-MM-DD", ranges: [...] | "closed", note: {fr,en,it} }`. Overrides the weekday.
- "Open now" must be computed in `Europe/Paris` time with `Intl.DateTimeFormat`, not the visitor's local time.

### Robustness (critical)
`js/data.js` must:
1. `fetch("data/menu.json", { cache: "no-cache" })`.
2. Parse and validate the shape (categories array, each item has id, name, a price or prices). On any error → load `menu-sauvegarde.json` instead.
3. If both fail → show a clear message: "La carte ne peut pas s'afficher pour le moment. Appelez-nous : …" with the phone link. Never a blank page.
4. Log validation errors to the console with the item id, so the developer can find the typo fast.

## 5. Security

- Render all data with `textContent` / `createElement`. **Never `innerHTML` with JSON data.**
- No inline `<script>` and no inline event handlers (`onclick=`).
- Content Security Policy, as a header if the host allows, otherwise as a `<meta http-equiv>`:
  `default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'`
- HTTPS only. HSTS and other headers (`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`) configured on alwaysdata. **Verify how alwaysdata sets custom headers before writing any `.htaccess`; do not assume.**
- External links: `rel="noopener noreferrer"`.
- No secrets, keys or tokens anywhere in the repo.

## 6. Pages

### Home (`index.html`)
1. Header: logo, language switch (FR · EN · IT as plain links), "Voir la carte" link.
2. Status line: open/closed now + today's hours, from `infos.json`.
3. Hero: real photo of the counter or a focaccia (placeholder until owner provides one). Name, subtitle "Charcuterie · Pizzicheria", one-line description.
4. Current formules (breakfast, croissant + espresso, lunch) with hours and prices — only the ones active today.
5. Three signature items: Pistacchio focaccia, Granita, Tiramisu fait maison (from data, by id).
6. Address block with "Itinéraire" button and `tel:` button.
7. Footer: hours summary, Instagram link, links to legal pages.

### Menu (`carte.html`)
- Sticky category nav (horizontal scroll on mobile): Formules, Focaccias, Salades, Viennoiseries, Desserts, Cafés, Softs italiens, Softs, Apéritif et vins.
- Focaccia card: photo (if `img/produits/<id>.webp` exists, else no image, no broken icon), name, ingredients as one comma-separated line, M / L prices, tag badge.
- Simple list rows (dotted leader like the in-store screens) for drinks and pastries.
- Coffee extras line: Lait végétal +1 €, Décaféiné +1 €, Sirop +0,50 €.
- Allergen line at the bottom: "Informations sur les allergènes disponibles au comptoir." (until per-item allergen data is supplied).

### Contact (`contact.html`)
Address, landmark ("face au restaurant Pitaya"), full weekly hours table, special hours, `tel:` + WhatsApp buttons, directions links (Google Maps and Apple Maps URLs built from the address — plain links, no embed).

### Legal pages
Fill from `infos.json.legal`. If any field is `null`, render a visible `[À COMPLÉTER]` marker in the page and list it in the report. These pages must not go live with markers.

## 7. Design

The brand already exists. Follow it, do not reinvent it.

- **Source:** in-store screens and table cards: black background, gold Art-Nouveau frames, "TF" monogram, gold display serif, script accent ("Nos …"), cream parchment table cards.
### 7.1 Living theme: the site follows the café

The whole site switches between two marble themes depending on whether the café is **open right now** (Paris time, from `infos.json`):

| State | Theme | Marble | Feeling |
|---|---|---|---|
| Open | Light | Calacatta: warm white with soft gold and grey veins | Daytime counter, terrace |
| Closed (early morning, night, closing days) | Dark | Nero Marquina: deep black with fine gold and white veins | The gold screens above the counter |

With hours 8:00–22:00 this gives: dark before 8:00, light during the day, dark after 22:00. If the hours change in `infos.json`, the theme follows automatically. No separate time rules.

Rules:
1. Theme is computed by `js/hours.js` (same function as the "Open now" badge) and set as `<html data-theme="light|dark">`. Recompute every 60 s, so the page switches at 8:00 or 22:00 without reload.
2. Switch transition: 1.5 s cross-fade of colors only. With `prefers-reduced-motion: reduce` → instant switch.
3. **Manual override:** a small sun/moon toggle in the header. Choice saved in `localStorage` (`theme-override`, value `light`, `dark` or absent = automatic). Wrap storage in try/catch. A visitor who prefers dark keeps dark all day.
4. JavaScript off → light theme (CSS default), no badge.
5. If `hours` has an unresolved `todo` → keep the light theme and do not show the "Open now" badge. A wrong badge is worse than none.
6. While closed, the status line says when it reopens ("Ouvre à 8:00"), so the dark theme reads as "we are resting", not "we are gone".

### 7.2 Marble surface (matte, soft)

- Marble is a **background texture only**, never under body text at full strength. Text sits on a calm surface panel (solid color, slight transparency over marble ≤ 0.92 opacity of the panel).
- Generated in CSS with an SVG `feTurbulence` filter as a `data:` URI (allowed by CSP `img-src data:`), not a photo. Target < 3 KB, no extra request, sharp on every screen.
- Matte finish: veins low contrast (opacity 4–8 %), blurred slightly (`feGaussianBlur` ~0.6), no gloss highlights, no shine animation.
- Same texture seed on all pages so the stone feels like one continuous slab.
- Must still pass WCAG AA for all text in both themes. Test both themes with the contrast checker.

### 7.3 Palette (starting point, adjust to the logo file)

Light (Calacatta, open):
- Stone `#EDE8DF` — base surface
- Vein grey `#B8B1A5`
- Vein gold `#C9A44C`
- Ink `#2B2418` — text
- Panel `#F7F3EC`

Dark (Nero Marquina, closed):
- Stone `#0F0E0D` — base surface
- Vein white `#D9D4CA`
- Vein gold `#C9A44C`
- Text `#EFE6CF`
- Panel `#16140F`

Gold `#C9A44C` / light gold `#E6CF8A` stay identical in both themes: they are the brand constant. Define everything as CSS custom properties on `:root[data-theme="light"]` and `:root[data-theme="dark"]`; components use only the variables.
- **Type:** one high-contrast serif for display and body (self-hosted, OFL license), plus one script face used only for the "Nos …" category words, as on the screens. Check licenses and keep license files in `/fonts`.
- **Do not:** all-caps eyebrow labels above every section, identical rounded cards with grey shadows, gradient washes, fade-in animation on every section, "→" on every link.
- **Motion:** none by default. Respect `prefers-reduced-motion`.
- Contrast: gold on black and ink on parchment must pass WCAG AA for body text. If gold fails at small sizes, use light gold.

## 8. Quality bar (definition of done)

- [ ] validator.w3.org: 0 errors on every page.
- [ ] Lighthouse mobile: Performance ≥ 95, Accessibility 100, Best Practices 100, SEO 100.
- [ ] Total home page weight < 500 KB; images WebP, explicit `width`/`height`, `loading="lazy"` below the fold.
- [ ] Works with JavaScript off: header, address, phone and a link to a static fallback text menu are still visible.
- [ ] Keyboard navigation, visible focus, `alt` on every image, `lang` on every page, `hreflang` links between FR/EN/IT.
- [ ] Tested on a real iPhone (Safari) and a real Android (Chrome), on mobile data.
- [ ] Breaking `menu.json` on purpose (delete a comma) → menu falls back to `menu-sauvegarde.json`, no blank page.
- [ ] "Open now" correct at 07:59, 08:00, 21:59, 22:00 Paris time (unit tests with a fixed date).
- [ ] Theme: dark at 07:59, light at 08:00, dark at 22:00 (same tests). Manual override survives reload. Visitor in another time zone still gets Paris-based theme.
- [ ] Both themes pass WCAG AA contrast on every page, text over marble included.
- [ ] No request to any domain other than the site's own (check Network tab).
- [ ] `schema.org/CafeOrCoffeeShop` JSON-LD with address, hours, menu URL — generated only from confirmed data.
- [ ] No `todo` from `data/*.json` left unresolved.

## 9. Workflow rules for Claude Code

1. One change at a time. After each step, report as a short list: **what I saw → what I did**.
2. Implement what is asked. If something here seems wrong, say so once with a reason, then follow the developer's decision.
3. Ask before adding any file not listed in section 3.
4. Never edit `data/menu.json` prices on your own.
5. Commit messages in English, imperative, small.
6. Final report lists: every `todo` still open, every `null` field, every translation marked `review`.

## 10. Build order

1. `css/style.css` tokens (colors, type scale, spacing) + `index.html` static skeleton.
2. `js/data.js` with validation and fallback + tests.
3. `js/hours.js` + tests.
4. `carte.html` + `js/menu.js`.
5. `contact.html`.
6. i18n: `data/i18n.json`, `/en/`, `/it/`.
7. Legal pages, `robots.txt`, `sitemap.xml`, JSON-LD.
8. Quality pass (section 8).
9. `README.md` (handover) and `GUIDE-PROPRIETAIRE.md` (French, step by step: edit `menu.json`, check it on jsonlint.com, compress photos on squoosh.app to WebP, upload by SFTP with FileZilla, verify on phone).
