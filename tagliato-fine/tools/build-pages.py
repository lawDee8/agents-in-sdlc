"""Regenerate the static HTML pages (fr, en, it) from data/i18n.json.

Developer tool only: run `python3 tools/build-pages.py` after editing i18n.json.
The site itself needs no build; never upload the tools/ folder.
"""
import json, sys, html
from pathlib import Path

SITE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent
SITE_URL = None  # e.g. "https://www.example.fr" once the domain is known
T = json.loads((SITE / "data/i18n.json").read_text())
LANGS = ["fr", "en", "it"]
PAGES = ["index.html", "carte.html", "contact.html", "mentions-legales.html", "confidentialite.html"]
CSP = ("default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; "
       "font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'none'")
e = html.escape

def s(lang, key):
    return T[lang].get(key, T["fr"][key])

def path_for(lang, page):
    return ("" if lang == "fr" else f"{lang}/") + ("" if page == "index.html" else page)

def rel(prefix, target):
    out = prefix + target
    return out or "./"

def head(lang, page, prefix, title, meta):
    alts = ""
    if page:
        base = SITE_URL.rstrip("/") + "/" if SITE_URL else "/"
        for l in LANGS:
            alts += f'  <link rel="alternate" hreflang="{l}" href="{base}{path_for(l, page)}">\n'
        alts += f'  <link rel="alternate" hreflang="x-default" href="{base}{path_for("fr", page)}">\n'
    return f"""<!doctype html>
<html lang="{lang}" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="{CSP}">
  <title>{e(title)}</title>
  <meta name="description" content="{e(meta)}">
{alts}  <link rel="icon" href="{prefix}img/logo.svg" type="image/svg+xml">
  <link rel="preload" href="{prefix}fonts/cormorant-garamond-latin-500-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="{prefix}css/style.css">
  <script type="module" src="{prefix}js/main.js"></script>
</head>
"""

SUN = '<path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/><circle cx="12" cy="12" r="4.5"/>'
MOON = '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'

def header(lang, page, prefix):
    langs = ""
    for l in LANGS:
        # Language links are built from the site root.
        root = "" if lang == "fr" else "../"
        href = rel(root, path_for(l, page))
        cur = ' aria-current="page"' if l == lang else f' hreflang="{l}"'
        langs += f'            <li><a href="{href}" lang="{l}"{cur}>{l.upper()}</a></li>\n'
    def nav_link(target, key):
        cur = ' aria-current="page"' if target == page else ""
        return f'<li><a href="{rel("", target if target != "index.html" else "")}"{cur}>{e(s(lang, key))}</a></li>'
    return f"""<body data-page="{{page_id}}" data-prefix="{prefix}">
  <a class="skip-link" href="#contenu">{e(s(lang, "skip"))}</a>

  <header class="site-header">
    <div class="wrap header-row">
      <a class="logo" href="./">
        <img src="{prefix}img/logo.svg" alt="" width="40" height="40">
        <span>Tagliato Fine</span>
      </a>
      <div class="header-tools">
        <nav aria-label="{e(s(lang, "lang_nav"))}">
          <ul class="lang-switch">
{langs}          </ul>
        </nav>
        <button class="theme-toggle" type="button" id="theme-toggle" hidden>
          <svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5">{SUN}</svg>
          <svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5">{MOON}</svg>
        </button>
      </div>
    </div>
    <nav class="wrap main-nav" aria-label="{e(s(lang, "main_nav"))}">
      <ul>
        {nav_link("carte.html", "nav_menu")}
        {nav_link("contact.html", "nav_contact")}
      </ul>
    </nav>
    <p class="status wrap" id="status" aria-live="polite" hidden></p>
  </header>
"""

def footer(lang, prefix):
    return f"""
  <footer class="site-footer">
    <div class="wrap">
      <p id="footer-hours"></p>
      <p id="footer-instagram" hidden></p>
      <ul>
        <li><a href="carte.html">{e(s(lang, "nav_menu_short"))}</a></li>
        <li><a href="contact.html">{e(s(lang, "nav_contact"))}</a></li>
        <li><a href="mentions-legales.html">{e(s(lang, "nav_legal"))}</a></li>
        <li><a href="confidentialite.html">{e(s(lang, "nav_privacy"))}</a></li>
      </ul>
    </div>
  </footer>
</body>
</html>
"""

def noscript(lang):
    return f'    <noscript><p class="wrap"><span class="panel noscript">{e(s(lang, "noscript"))}</span></p></noscript>\n'

def find_us(lang):
    return f"""    <section class="wrap" aria-labelledby="acces-title">
      <div class="panel">
        <h2 id="acces-title">{e(s(lang, "find_us"))}</h2>
        <address id="address"></address>
        <p class="actions" id="contact-actions">
          <a class="btn btn-quiet" href="contact.html">{e(s(lang, "address_hours"))}</a>
        </p>
      </div>
    </section>
"""

def main_home(lang, prefix):
    return f"""  <main id="contenu">
{noscript(lang)}    <section class="wrap" aria-labelledby="hero-title">
      <div class="panel frame hero">
        <h1 class="hero-name" id="hero-title">Tagliato Fine</h1>
        <p class="hero-sub">{e(s(lang, "subtitle"))}</p>
        <p>{e(s(lang, "tagline"))}</p>
        <p class="actions"><a class="btn" href="carte.html">{e(s(lang, "nav_menu"))}</a></p>
      </div>
    </section>

    <section class="wrap" id="formules" aria-labelledby="formules-title" hidden>
      <div class="panel">
        <h2 id="formules-title"><span class="script">{e(s(lang, "home_nos_formules"))}</span> {e(s(lang, "home_formules"))}</h2>
        <ul class="rows" id="formules-list"></ul>
      </div>
    </section>

    <section class="wrap" id="signatures" aria-labelledby="signatures-title" hidden>
      <div class="panel">
        <h2 id="signatures-title"><span class="script">{e(s(lang, "home_nos_signatures"))}</span> {e(s(lang, "home_signatures"))}</h2>
        <ul class="cards" id="signatures-list"></ul>
      </div>
    </section>

{find_us(lang)}  </main>
"""

def main_menu(lang, prefix):
    return f"""  <main id="contenu">
    <h1 class="wrap page-title">{e(s(lang, "menu_title"))}</h1>
    <nav class="menu-nav" id="menu-nav" aria-label="{e(s(lang, "menu_categories"))}" hidden>
      <ul class="wrap" id="menu-nav-list"></ul>
    </nav>
{noscript(lang)}    <div class="wrap menu-root" id="menu-root"></div>
    <p class="wrap allergens" id="allergens" hidden>{e(s(lang, "menu_allergens"))}</p>
  </main>
"""

def main_contact(lang, prefix):
    return f"""  <main id="contenu">
    <h1 class="wrap page-title">{e(s(lang, "contact_title"))}</h1>
{noscript(lang)}{find_us(lang).replace(f'\n          <a class="btn btn-quiet" href="contact.html">{e(s(lang, "address_hours"))}</a>\n        ', "")}
    <section class="wrap" id="horaires" aria-labelledby="hours-title">
      <div class="panel">
        <h2 id="hours-title">{e(s(lang, "hours_title"))}</h2>
        <table class="hours" id="hours-table" hidden></table>
        <p id="hours-unknown" hidden>{e(s(lang, "hours_unknown"))}</p>
        <p id="directions" hidden></p>
      </div>
    </section>

    <section class="wrap" id="special" aria-labelledby="special-title" hidden>
      <div class="panel">
        <h2 id="special-title">{e(s(lang, "special_title"))}</h2>
        <ul class="special" id="special-list"></ul>
      </div>
    </section>
  </main>
"""

EDITOR = ["company_name", "legal_form", "share_capital", "address", "siret", "rcs", "vat_number", "publication_director", "email", "phone"]
HOST = ["host_name", "host_address", "host_phone"]

def dl(lang, keys):
    rows = "".join(f'          <dt>{e(s(lang, "legal_" + k))}</dt>\n          <dd data-legal="{k}"></dd>\n' for k in keys)
    return f'        <dl class="legal">\n{rows}        </dl>\n'

def main_legal(lang, prefix):
    return f"""  <main id="contenu">
    <h1 class="wrap page-title">{e(s(lang, "legal_title"))}</h1>
{noscript(lang)}    <section class="wrap" aria-labelledby="editor-title">
      <div class="panel">
        <h2 id="editor-title">{e(s(lang, "legal_editor"))}</h2>
{dl(lang, EDITOR)}      </div>
    </section>
    <section class="wrap" aria-labelledby="host-title">
      <div class="panel">
        <h2 id="host-title">{e(s(lang, "legal_host"))}</h2>
{dl(lang, HOST)}      </div>
    </section>
  </main>
"""

def main_privacy(lang, prefix):
    paras = "".join(f"        <p>{e(p)}</p>\n" for p in s(lang, "privacy_body"))
    return f"""  <main id="contenu">
    <h1 class="wrap page-title">{e(s(lang, "privacy_title"))}</h1>
    <section class="wrap">
      <div class="panel prose">
{paras}      </div>
    </section>
  </main>
"""

SPEC = {
    "index.html": ("home", main_home, None, "meta_home"),
    "carte.html": ("menu", main_menu, "menu_title", "meta_menu"),
    "contact.html": ("contact", main_contact, "contact_title", "meta_contact"),
    "mentions-legales.html": ("legal", main_legal, "legal_title", "meta_legal"),
    "confidentialite.html": ("privacy", main_privacy, "privacy_title", "meta_privacy"),
}

for lang in LANGS:
    prefix = "" if lang == "fr" else "../"
    for page in PAGES:
        pid, body, title_key, meta_key = SPEC[page]
        title = f"Tagliato Fine · {s(lang, 'subtitle')} · Cannes" if not title_key else f"{s(lang, title_key)} · Tagliato Fine, Cannes"
        out = head(lang, page, prefix, title, s(lang, meta_key)) + header(lang, page, prefix).replace("{page_id}", pid) + body(lang, prefix) + footer(lang, prefix)
        target = SITE / ("" if lang == "fr" else lang) / page
        target.parent.mkdir(exist_ok=True)
        target.write_text(out)

# 404: served at any depth, so root-absolute paths.
lang, prefix = "fr", "/"
nf = head(lang, None, prefix, f"{s(lang, 'notfound_title')} · Tagliato Fine", s(lang, "notfound_text"))
nf = nf.replace('<meta name="description"', '<meta name="robots" content="noindex">\n  <meta name="description"')
hdr = header(lang, "index.html", prefix).replace("{page_id}", "404")
hdr = hdr.replace('href="./"', 'href="/"').replace('href="carte.html"', 'href="/carte.html"').replace('href="contact.html"', 'href="/contact.html"')
hdr = hdr.replace('href="en/"', 'href="/en/"').replace('href="it/"', 'href="/it/"')
body = f"""  <main id="contenu">
    <section class="wrap">
      <div class="panel frame hero">
        <h1>{e(s("fr", "notfound_title"))}</h1>
        <p>{e(s("fr", "notfound_text"))}</p>
        <p lang="en">{e(s("en", "notfound_text"))}</p>
        <p lang="it">{e(s("it", "notfound_text"))}</p>
        <p class="actions"><a class="btn" href="/">{e(s("fr", "notfound_back"))}</a></p>
      </div>
    </section>
  </main>
"""
ft = footer(lang, prefix)
for f in ["carte.html", "contact.html", "mentions-legales.html", "confidentialite.html"]:
    ft = ft.replace(f'href="{f}"', f'href="/{f}"')
(SITE / "404.html").write_text(nf + hdr + body + ft)
print("ok")
