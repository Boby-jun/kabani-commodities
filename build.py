"""Generates every page of the site from commodities.json.

    python3 build.py            -> writes the pages into this folder
    python3 build.py --inline OUT_DIR
                                -> writes self-contained pages (CSS and JS inlined) into OUT_DIR
"""
import json, os, sys, html, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = json.load(open(os.path.join(HERE, "commodities.json"), encoding="utf-8"))
ITEMS, CATS = DATA["items"], DATA["categories"]
E = html.escape
# The main topics shown on the home page and used to filter the supply & demand page and map.
TOPICS = [("agro", "Agro products", ["coffee", "tea", "avocado", "macadamia", "flowers"]),
          ("livestock", "Livestock", ["poultry"]),
          ("fertilisers", "Fertilisers", ["urea", "biochar"]),
          ("energy", "Oil & energy", ["oil"]),
          ("metals", "Metals & minerals", ["copper", "iron", "sulphur"])]
TOPIC_OF = {s: name for _, name, slugs in TOPICS for s in slugs}

EMAIL, PHONE, BASE = "rb@kabaniconsulting.com", "+41 78 611 23 30", "Geneva, Switzerland"
PHONE_DIGITS = "".join(ch for ch in PHONE if ch.isdigit())

SCALE_WC = '<div class="edge" style="--above:var(--white);--below:var(--cream-soft)" aria-hidden="true"><svg viewBox="0 0 1440 44" preserveAspectRatio="none" focusable="false"><path d="M0 44C360 2 1080 2 1440 44Z"/></svg></div>'
SCALE_CW = '<div class="edge" style="--above:var(--cream-soft);--below:var(--white)" aria-hidden="true"><svg viewBox="0 0 1440 44" preserveAspectRatio="none" focusable="false"><path d="M0 44C360 2 1080 2 1440 44Z"/></svg></div>'


def head(title, desc, robots=""):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{E(title)}</title>
  <meta name="description" content="{E(desc)}" />
  {robots}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="icon" href="favicon.ico" sizes="48x48" />
  <link rel="icon" href="favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="apple-touch-icon.png" />
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
"""

def nav(active=""):
    def a(href, label, key):
        cls = ' class="active"' if key == active else ""
        return f'<a href="{href}"{cls}>{label}</a>'
    return f"""
  <nav>
    <a class="nav-logo" href="index.html" aria-label="Kabani Commodities, home"><svg viewBox="0 0 240 64" class="nav-lockup" aria-hidden="true"><circle cx="32" cy="32" r="29.6" fill="none" stroke="#F4F3EE" stroke-width="3.6"/><g fill="none" stroke="#F4F3EE" stroke-width="6.00" stroke-linecap="butt" stroke-linejoin="miter"><path d="M24.20 17.00L24.20 47.00"/><path d="M25.40 33.20L42.20 17.90"/><path d="M27.50 31.10L43.10 46.10"/></g><text x="82" y="31" font-family="Montserrat, 'Helvetica Neue', Arial, sans-serif" font-size="26" font-weight="800" letter-spacing="3.6" fill="#F4F3EE">KABANI</text><text x="82" y="51" font-family="Montserrat, 'Helvetica Neue', Arial, sans-serif" font-size="12.5" font-weight="700" letter-spacing="5.2" fill="#C9A75E">COMMODITIES</text></svg></a>
    <div class="nav-links">
      {a("index.html", "Home", "home")}
      {a("market.html", "Commodities", "market")}
      {a("index.html#process", "How it works", "process")}
      {a("about.html", "About us", "about")}
    </div>
    <div class="nav-right">
      <a href="admin.html" class="nav-login" data-login>Log in</a>
      <a href="contact.html" class="nav-cta">Contact us</a>
    </div>
    <button class="hamburger" id="hamburger" onclick="toggleMenu()" aria-label="Menu">
      <span></span><span></span><span></span>
    </button>
  </nav>
  <div class="mobile-menu" id="mobile-menu">
    <a href="index.html" onclick="closeMenu()">Home</a>
    <a href="market.html" onclick="closeMenu()">Commodities</a>
    <a href="index.html#process" onclick="closeMenu()">How it works</a>
    <a href="about.html" onclick="closeMenu()">About us</a>
    <a href="admin.html" data-login onclick="closeMenu()">Log in</a>
    <a href="contact.html" class="mobile-cta" onclick="closeMenu()">Contact us</a>
  </div>
"""

_topic_links = "".join(f'<li><a href="market.html?topic={tid}">{E(name)}</a></li>' for tid, name, _ in TOPICS)
FOOT = SCALE_CW + f"""
  <footer class="site-footer">
    <div class="foot-grid">
      <div class="foot-brand">
        <div class="footer-logo">Kabani <span>Commodities</span></div>
        <p>An introductory commodity brokerage connecting verified buyers and suppliers, with discretion and care on every deal.</p>
      </div>
      <div class="foot-col" role="navigation" aria-label="Company">
        <h2>Company</h2>
        <ul><li><a href="index.html">Home</a></li><li><a href="about.html">About us</a></li><li><a href="index.html#process">How it works</a></li><li><a href="contact.html">Contact us</a></li></ul>
      </div>
      <div class="foot-col" role="navigation" aria-label="Commodities">
        <h2>Commodities</h2>
        <ul><li><a href="market.html">Supply &amp; demand</a></li><li><a href="market.html#map">Sourcing map</a></li>{_topic_links}</ul>
      </div>
      <div class="foot-col">
        <h2>Get in touch</h2>
        <ul><li><a href="mailto:{EMAIL}">{EMAIL}</a></li><li><a href="https://wa.me/{PHONE_DIGITS}" target="_blank" rel="noopener">{PHONE}</a></li><li>{BASE}</li></ul>
      </div>
    </div>
    <div class="foot-bottom">
      <p>&copy; 2026 Kabani Commodities, a brand of Kabani Consulting, Geneva, Switzerland. All rights reserved.</p>
      <a href="admin.html" data-login>Log in</a>
    </div>
  </footer>
  <dialog class="login-dialog" id="login-dialog" aria-labelledby="login-title">
    <button type="button" class="login-close" id="login-close" aria-label="Close">&times;</button>
    <h2 id="login-title">Log in</h2>
    <p class="login-lead">Log in to your Kabani account.</p>
    <a class="btn-primary" href="admin.html">Log in</a>
    <p class="login-alt">No account yet? <button type="button" class="slicer-link" id="login-create">Create an account</button></p>
    <p class="login-note" id="login-note" role="status" hidden>This functionality is under construction. Please contact us if you have any questions. <a href="contact.html">Contact us</a></p>
  </dialog>
  <script src="firebase-config.js"></script>
  <script src="site.js"></script>
</body>
</html>
"""


MAPDATA = json.load(open(os.path.join(HERE, "map_paths.json")))
SRC_DATA = json.load(open(os.path.join(HERE, "sources.json")))
SOURCES = SRC_DATA["countries"]
ON_REQUEST = SRC_DATA.get("onRequest", [])
BY_SLUG = {c["slug"]: c for c in ITEMS}

def sourcing_map():
    land = MAPDATA["countries"]
    src = {}
    for s in SOURCES:
        if s["country"] not in land:
            raise SystemExit(f"sources.json: country '{s['country']}' not on the map. Check spelling (e.g. 'United States of America').")
        for slug in s["commodities"]:
            if slug not in BY_SLUG:
                raise SystemExit(f"sources.json: unknown commodity slug '{slug}' for {s['country']}.")
        src[s["country"]] = s["commodities"]
    paths = "".join(f'<path class="land" d="{v["d"]}"/>' for n, v in land.items() if n not in src)
    pins = ""
    for n, slugs in src.items():
        v = land[n]
        names = ", ".join(BY_SLUG[x]["name"] for x in slugs)
        paths += (f'<path class="land is-source" data-country="{E(n)}" tabindex="0" role="button" aria-pressed="false" '
                  f'aria-label="{E(n)}: {E(names)}" data-bbox="{" ".join(str(x) for x in v["bbox"])}" d="{v["d"]}"><title>{E(n)}</title></path>')
        bx = v["bbox"]
        pins += f'<circle class="pin" data-country="{E(n)}" cx="{(bx[0]+bx[2])/2:g}" cy="{(bx[1]+bx[3])/2:g}" r="4"/>'
    for slug in ON_REQUEST:
        if slug not in BY_SLUG:
            raise SystemExit(f"sources.json: unknown commodity slug '{slug}' in onRequest.")
    names_on_req = [BY_SLUG[x]["name"].lower() for x in ON_REQUEST]
    on_request_names = (", ".join(names_on_req[:-1]) + " and " + names_on_req[-1]) if len(names_on_req) > 1 else "".join(names_on_req)
    sources_json = json.dumps({n: [{"slug": x, "name": BY_SLUG[x]["name"]} for x in slugs] for n, slugs in src.items()})
    W, H = MAPDATA["width"], MAPDATA["height"]
    PAD = 34  # breathing room between the map edge and the countries
    VBW = W + 2 * PAD
    VBH = VBW * H / W
    VBY = -(VBH - H) / 2
    return f"""
  <section id="sourcing">
    <div class="section-inner">
      <h2 class="section-title">Where we <span class="accent">source</span></h2>
      <p class="section-body">Select a highlighted country to see what we can source there.</p>
      <div class="section-actions"><a class="row-go row-go-solid" href="market.html">View commodities</a><a class="row-go" href="market.html#map">Open the full map</a></div>
      <div class="map-layout">
        <div class="map-stage" id="map-stage" tabindex="0" aria-label="Interactive world map. Use plus and minus to zoom, arrow keys to move.">
          <svg id="world-map" viewBox="{-PAD:g} {VBY:.2f} {VBW:g} {VBH:.2f}" data-w="{W:g}" data-h="{H:g}" data-pad="{PAD:g}" preserveAspectRatio="xMidYMid meet" aria-hidden="false" focusable="false">
            <g class="lands">{paths}</g>
            <g class="pins">{pins}</g>
          </svg>
          <div class="map-controls" role="group" aria-label="Map zoom">
            <button type="button" class="mz-in" id="map-zoom-in" aria-label="Zoom in">+</button>
            <button type="button" class="mz-out" id="map-zoom-out" aria-label="Zoom out">&minus;</button>
            <button type="button" class="mz-reset" id="map-reset" aria-label="Reset map">&#8634;</button>
          </div>
          <p class="map-hint">Drag to move. Ctrl or &#8984; + scroll to zoom.</p>
        </div>
        <script type="application/json" id="map-sources">{sources_json}</script>
        <div class="map-detail" id="map-detail" aria-live="polite" hidden>
          <div class="panel-head"><h3 class="md-title" id="md-title"></h3><button type="button" class="panel-showall" id="map-showall">Show whole map</button></div>
          <p class="md-text">We can source here:</p>
          <div class="source-body" id="md-items"></div>
          <div class="md-actions"><a class="row-go" id="md-market" href="market.html#map">View supply &amp; demand</a><a class="row-go row-go-quiet" href="market.html">View commodities</a></div>
        </div>
        <p class="panel-note">Origin for {on_request_names} is shared on request. <a href="contact.html">Contact us</a>.</p>
      </div>
    </div>
  </section>
"""

def card(c):
    return (f'<a class="commodity-card" href="{c["slug"]}.html">'
            f'<div class="commodity-icon">{c["icon"]}</div><div class="commodity-name">{E(c["name"])}</div>'
            f'<span class="commodity-go">View details &rarr;</span></a>')

def index():
    def names(slugs):
        return ", ".join(f'<a href="{s}.html">{E(BY_SLUG[s]["name"])}</a>' for s in slugs)
    groups = "".join(
        f'\n        <li class="topic-row"><div class="topic-main"><h3 class="topic-title">{E(n)}</h3><p class="topic-items">{names(s)}</p></div>'
        f'<a class="row-go" href="market.html?topic={i}">View supply &amp; demand</a></li>'
        for i, n, s in TOPICS)
    groups = f'<ul class="topic-list">{groups}\n      </ul>\n'
    steps = [("01", "Share your requirement", "Tell us what you're buying or selling: commodity, volume, specification, and timeline."),
             ("02", "We match verified partners", "We tap our network to shortlist credible counterparties who genuinely fit your requirement."),
             ("03", "Negotiate &amp; structure", "We help align terms, contracts, and logistics between both sides of the transaction."),
             ("04", "Facilitate &amp; follow through", "We stay engaged through execution, remaining the trusted link between origin and market.")]
    steps_html = "\n".join(f'        <div class="process-step"><div class="process-number">{n}</div><h3 class="process-title">{t}</h3><p class="process-body">{b}</p></div>' for n, t, b in steps)
    return head("Kabani Commodities — Introductory Commodity Brokerage",
                "Kabani Commodities is an introductory commodity brokerage in Geneva connecting verified buyers and suppliers.") + nav("home") + f"""
  <section id="hero">
    <div class="hero-inner">
      <p class="hero-eyebrow">Geneva, Switzerland — Introductory Commodity Brokerage</p>
      <h1 class="hero-title">We facilitate your access to <span class="accent">global commodities</span></h1>
      <p class="hero-sub">A trusted intermediary connecting verified buyers and suppliers, with discretion and care on every deal.</p>
      <div class="hero-actions">
        <a href="market.html" class="btn-primary">View commodities</a>
        <a href="contact.html" class="btn-outline">Start a conversation</a>
      </div>
    </div>
  </section>

  <section id="commodities">
    <div class="section-inner">
      <p class="section-tag">What we trade</p>
      <h2 class="section-title">A wide range of <span class="accent">commodities</span></h2>
      <p class="section-body">Choose a topic to see what is on supply and what is in demand.</p>
{groups}    </div>
  </section>

  {SCALE_WC}
{sourcing_map()}
  {SCALE_CW}
  <section id="process">
    <div class="section-inner">
      <p class="section-tag">Our process</p>
      <h2 class="section-title">Four steps from origin to <span class="accent">deal</span></h2>
      <div class="process-grid">
{steps_html}
      </div>
    </div>
  </section>

  {SCALE_WC}
  <section class="cta-band">
    <div class="section-inner">
      <h2 class="section-title">Have a requirement? <span class="accent">Let's talk.</span></h2>
      <a href="contact.html" class="btn-primary">Get in touch</a>
    </div>
  </section>
""" + FOOT

# About-page pillar icons: drawn for Kabani, one 24px grid, one stroke. Verified = a hallmark rosette with a check;
# reach = one grounded origin node fanning out to buyers; confidential = two sides with the private middle held between them.
_PILLAR_VERIFIED = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9.5" r="6"/><path d="m9.2 9.6 2 2 3.6-3.9"/><path d="M8.6 14.6 7.2 21l4.8-2.5 4.8 2.5-1.4-6.4"/></svg>'
_PILLAR_REACH = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="17" r="2.3"/><circle cx="12" cy="5.4" r="1.9"/><circle cx="4.6" cy="6.4" r="1.9"/><circle cx="19.4" cy="6.4" r="1.9"/><path d="M12 14.5V7.5M10.6 15 5.8 8.1M13.4 15l4.8-6.9M6.5 21.2h11"/></svg>'
_PILLAR_PRIVATE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fill" d="M12 6.57A6.2 6.2 0 0 1 12 17.43A6.2 6.2 0 0 1 12 6.57Z"/><circle cx="9" cy="12" r="6.2"/><circle cx="15" cy="12" r="6.2"/><circle cx="12" cy="11" r="1.1"/><path d="M12 12.2v2"/></svg>'

def about():
    pillars = [(_PILLAR_VERIFIED, "Verified Counterparties", "We vet buyers and suppliers before making an introduction, protecting both sides from wasted time and bad-faith actors."),
               (_PILLAR_REACH, "Global Reach, Local Roots", "Deep relationships with cooperatives, processors, and producers at origin, paired with an international network of buyers across sectors."),
               (_PILLAR_PRIVATE, "Confidential &amp; Independent", "We represent the transaction, not one side of it — structuring every introduction with discretion, impartiality, and care.")]
    ph = "\n".join(f'        <div class="pillar"><div class="pillar-icon">{i}</div><h3 class="pillar-title">{t}</h3><p class="pillar-body">{b}</p></div>' for i, t, b in pillars)
    return head("About us — Kabani Commodities", "The principles behind every introduction Kabani Commodities makes.") + nav("about") + f"""
  <header class="page-header">
    <div class="section-inner">
      <p class="breadcrumb"><a href="index.html">Home</a> / About us</p>
      <p class="section-tag">About us</p>
      <h1 class="section-title">Three principles that guide every <span class="accent">introduction</span></h1>
    </div>
  </header>
  {SCALE_CW}
  <section class="about-page">
    <div class="section-inner">
      <div class="pillars">
{ph}
      </div>
    </div>
  </section>
  {SCALE_WC}
  <section class="cta-band">
    <div class="section-inner">
      <h2 class="section-title">Ready to start a <span class="accent">conversation?</span></h2>
      <a href="contact.html" class="btn-primary">Get in touch</a>
    </div>
  </section>
""" + FOOT

_ICON_PIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.4"/></svg>'
_ICON_MAIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7.5 8 6 8-6"/></svg>'
_ICON_PHONE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h3.4l1.6 4-2 1.3a11 11 0 0 0 6.7 6.7l1.3-2 4 1.6V19a1.8 1.8 0 0 1-2 1.8A15.6 15.6 0 0 1 3.2 6 1.8 1.8 0 0 1 5 4Z"/></svg>'

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import phone_codes

def contact():
    chips = "".join(f'<label class="ms-opt"><input type="checkbox" name="commodity" value="{E(c["name"])}" /><span>{E(c["name"])}</span></label>' for c in ITEMS)
    chips += '<label class="ms-opt"><input type="checkbox" name="commodity" value="Other" id="ms-other" /><span>Other</span></label>'
    roles = "".join(f'<label class="chip"><input type="radio" name="role" value="{r}" required /><span>{r}</span></label>' for r in ("Buyer", "Supplier", "Both"))
    return head("Get in touch — Kabani Commodities", "Contact Kabani Commodities about buying or selling a commodity.") + nav("contact") + f"""
  <header class="contact-banner">
    <div class="section-inner">
      <h1>Let's start a <span>conversation</span></h1>
      <p>Whether you're sourcing origin commodities or looking for reliable buyers, tell us what you need and we'll connect you with the right counterparties in our network.</p>
    </div>
  </header>
  <main class="contact-page">
    <div class="section-inner contact-layout">
      <form class="contact-form" onsubmit="handleContactForm(event)">
        <h2 class="form-title">Send us a message</h2>
        <div class="form-section">
          <div class="form-row">
            <div class="form-group"><label for="fn">First name</label><input id="fn" name="first_name" type="text" placeholder="e.g. Maria" autocomplete="given-name" required /></div>
            <div class="form-group"><label for="ln">Last name</label><input id="ln" name="last_name" type="text" placeholder="e.g. Keller" autocomplete="family-name" required /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label for="em">Email</label><input id="em" name="email" type="email" inputmode="email" placeholder="name@company.com" autocomplete="email" required /></div>
            <div class="form-group"><label for="co">Company</label><input id="co" name="company" type="text" placeholder="Your company" autocomplete="organization" required /></div>
          </div>
          <div class="form-group">
            <label for="ph">Phone number</label>
            <div class="phone">
              <div class="cc" id="cc">
                <button type="button" class="cc-btn" id="cc-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="Country code"><span class="cc-flag" id="cc-flag" aria-hidden="true"></span><span class="cc-dial" id="cc-dial">+41</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
                <div class="cc-panel" id="cc-panel" hidden>
                  <input type="search" id="cc-search" class="cc-search" placeholder="Search country or code" aria-label="Search country or code" autocomplete="off" />
                  <ul class="cc-list" id="cc-list" role="listbox" aria-label="Country codes"></ul>
                </div>
              </div>
              <input id="ph" name="phone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="79 123 45 67" required />
              <input type="hidden" name="phone_code" id="cc-value" value="+41" />
            </div>
            <script type="application/json" id="cc-data">{json.dumps(phone_codes.rows(), ensure_ascii=False)}</script>
          </div>
        </div>
        <div class="form-section">
          <div class="form-row form-row-top">
          <fieldset class="form-group"><legend>I am a</legend><div class="chip-row">{roles}</div></fieldset>
          <div class="form-group">
            <span class="ms-label" id="ms-label">Commodities of interest</span>
            <div class="ms" id="ms">
              <button type="button" class="ms-btn" id="ms-btn" aria-haspopup="true" aria-expanded="false" aria-labelledby="ms-label ms-value"><span class="ms-value" id="ms-value">Select commodities</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
              <input class="ms-proxy" id="ms-proxy" tabindex="-1" aria-hidden="true" required />
              <div class="ms-panel" id="ms-panel" role="group" aria-label="Commodities of interest" hidden>{chips}</div>
            </div>
            <div class="ms-other" id="ms-other-wrap" hidden><label for="ms-other-text">Which commodity?</label><input id="ms-other-text" name="other_commodity" type="text" maxlength="120" placeholder="e.g. Cocoa, cashew, maize" autocomplete="off" /></div>
          </div>
          </div>
          <div class="form-group"><label for="msg">Your requirement</label><textarea id="msg" name="requirement" rows="5" required placeholder="Volume, specification, timeline, origin or destination…"></textarea></div>
        </div>
        <button type="submit" class="form-submit">Send message</button>
        <div id="form-success" role="status" tabindex="-1" style="display:none">Thank you. We'll be in touch within 24 hours.</div>
      </form>
      <aside class="contact-aside">
        <h2>Geneva, Switzerland</h2>
        <div class="aside-block"><div class="aside-label">Email</div><a href="mailto:{EMAIL}">{EMAIL}</a><a class="aside-go" href="mailto:{EMAIL}">Write to us</a></div>
        <div class="aside-block"><div class="aside-label">Phone &amp; WhatsApp</div><a href="https://wa.me/{PHONE_DIGITS}" target="_blank" rel="noopener">{PHONE}</a><a class="aside-go" href="https://wa.me/{PHONE_DIGITS}" target="_blank" rel="noopener">Open WhatsApp</a></div>
        <p class="aside-note">We reply within 24 hours.</p>
      </aside>
    </div>
  </main>
""" + FOOT


MARKET = json.load(open(os.path.join(HERE, "market.json"), encoding="utf-8"))

def _go(href, label):
    return f'<a class="row-go" href="{href}">{label}</a>'


def market_map_svg():
    PAD = 34
    W, H = MAPDATA["width"], MAPDATA["height"]
    VBW = W + 2 * PAD
    VBH = VBW * H / W
    VBY = -(VBH - H) / 2
    paths = "".join(
        f'<path class="land" data-country="{E(n)}" data-bbox="{" ".join(str(x) for x in v["bbox"])}" d="{v["d"]}"/>'
        for n, v in MAPDATA["countries"].items())
    return (f'<svg id="mm-svg" class="world-map" viewBox="{-PAD:g} {VBY:.2f} {VBW:g} {VBH:.2f}" data-w="{W:g}" data-h="{H:g}" data-pad="{PAD:g}" '
            f'preserveAspectRatio="xMidYMid meet" focusable="false">'
            f'<defs><linearGradient id="gBoth" x1="0" y1="0" x2="1" y2="1"><stop offset="50%" stop-color="#C9A75E"/><stop offset="50%" stop-color="#58A67F"/></linearGradient>'
            f'<pattern id="pBoth" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="8" fill="#C9A75E"/><rect x="4" width="4" height="8" fill="#58A67F"/></pattern></defs>'
            f'<g class="lands">{paths}</g></svg>')

def group_options():
    out = '<option value="">All commodities</option>'
    for _, g, slugs in TOPICS:
        out += f'<optgroup label="{E(g)}"><option value="group:{E(g)}">All {E(g).lower()}</option>' + "".join(f'<option value="{s}">{E(BY_SLUG[s]["name"])}</option>' for s in slugs) + "</optgroup>"
    return out


def slicer_html():
    groups = ""
    for tid, tname, slugs in TOPICS:
        opts = "".join(f'<label class="slicer-opt"><input type="checkbox" value="{s}" /><span>{E(BY_SLUG[s]["name"])}</span></label>' for s in slugs)
        groups += (f'<fieldset class="slicer-group"><legend><label class="slicer-opt slicer-topic"><input type="checkbox" data-topic="{tid}" /><span>{E(tname)}</span></label></legend>{opts}</fieldset>')
    return (f'<div class="slicer"><button type="button" class="slicer-btn" id="slicer-btn" aria-haspopup="true" aria-expanded="false" aria-controls="slicer-panel">'
            f'<span class="slicer-label">Commodity</span><svg viewBox="0 0 12 8" aria-hidden="true" width="12" height="8"><path d="M1 1.5 6 6.5 11 1.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'
            f'<div class="slicer-panel" id="slicer-panel" role="group" aria-label="Choose commodities" hidden>'
            f'<p class="slicer-hint">Tick the commodities to show. Nothing ticked shows all.</p>{groups}</div></div>')

BUILTIN_LISTINGS = False  # True shows the placeholder supply rows and sample demand again; real listings come from the admin page

def market():
    order = {c["slug"]: i for i, c in enumerate(ITEMS)}
    supply = supply_rows() if BUILTIN_LISTINGS else []
    demand = MARKET.get("demand", []) if BUILTIN_LISTINGS else []
    for r in demand:
        if r["commodity"] not in BY_SLUG:
            raise SystemExit(f"market.json: unknown commodity slug '{r['commodity']}'.")
    has_sample = any(r.get("sample") for r in demand)

    def link(slug):
        return f'<a class="row-name" href="{slug}.html">{E(BY_SLUG[slug]["name"])}</a>'

    def fmt_added(v):
        try:
            import datetime
            return datetime.date.fromisoformat(v).strftime("%-d %b %Y")
        except Exception:
            return "—"

    def cells(r, kind):
        name = f'<td class="cell-name" data-label="Commodity">{link(r["commodity"])}' + (f'<span class="row-note">{E(r["details"])}</span>' if r.get("details") else "") + "</td>"
        origin = E(r.get("origin") or ("Shared on request" if kind == "supply" else "Any"))
        out = (name + f'<td data-label="Origin">{origin}</td><td data-label="Volume">{E(r.get("volume") or "On request")}</td>'
               f'<td data-label="Quality">{E(r.get("quality") or "On request")}</td><td data-label="Shipment">{E(r.get("when") or "Flexible")}</td>')
        if kind == "demand":
            out += f'<td data-label="Destination">{E(r.get("port") or r.get("country") or "")}</td>'
        out += f'<td class="cell-date" data-label="Date added">{fmt_added(r.get("added", ""))}</td>'
        label, role = ("Enquire", "Buyer") if kind == "supply" else ("Offer supply", "Supplier")
        return out + f'<td class="col-go">{_go("contact.html?commodity=" + E(BY_SLUG[r["commodity"]]["name"]) + "&amp;role=" + role, label)}</td>'

    sup_rows = "".join(f'<tr data-commodity="{r["commodity"]}">{cells(r, "supply")}</tr>' for r in supply)
    dem_rows = "".join(f'<tr data-commodity="{r["commodity"]}">{cells(r, "demand")}</tr>' for r in demand)
    updated = MARKET.get("updated", "")
    try:
        import datetime
        updated = datetime.date.fromisoformat(updated).strftime("%-d %B %Y")
    except Exception:
        pass
    listings = ([{"type": "supply", "commodity": r["commodity"], "volume": r["volume"], "origin": r["origin"], "quality": r["quality"], "when": r["when"]} for r in supply]
                + [{"type": "demand", "commodity": r["commodity"], "volume": r["volume"], "origin": r.get("origin", ""), "quality": r.get("quality", ""), "when": r.get("when", ""), "port": r.get("port", ""), "country": r.get("country", ""), "sample": bool(r.get("sample"))} for r in demand])
    market_json = json.dumps({"commodities": [{"slug": c["slug"], "name": c["name"], "group": TOPIC_OF[c["slug"]]} for c in ITEMS], "topics": [{"id": i, "name": n, "slugs": s} for i, n, s in TOPICS], "listings": listings})
    sample_note = ('<p class="market-sample">Example demand listings are shown for preview. Replace them in market.json before going live.</p>' if has_sample else "")
    empty = '<p class="market-empty" data-none="Nothing is listed here yet. <a href=&quot;contact.html&quot;>Tell us what you need</a> and we will look for the match." hidden>Nothing listed for this selection right now. <button type="button" class="slicer-link" data-clear>Show all commodities</button> or <a href="contact.html">tell us what you need</a>.</p>'
    return head("Commodities — Supply & Demand — Kabani Commodities", "Current supply and demand across the commodities Kabani Commodities brokers.") + nav("market") + f"""
  <main class="market-page" id="market-page">
    <div class="market-bar">
      <div class="section-inner market-bar-inner">
        <h1 class="market-title">Commodities</h1>
        <div class="seg" role="tablist" aria-label="Supply, demand or map">
          <button type="button" role="tab" id="tab-supply" aria-controls="panel-supply" aria-selected="true">Supply <span>{len(supply)}</span></button>
          <button type="button" role="tab" id="tab-demand" aria-controls="panel-demand" aria-selected="false" tabindex="-1">Demand <span>{len(demand)}</span></button>
          <button type="button" role="tab" id="tab-map" aria-controls="panel-map" aria-selected="false" tabindex="-1">Map</button>
        </div>
        <div class="market-tools">{slicer_html()}<button type="button" class="slicer-clear" id="slicer-clear" hidden>Clear</button></div>
      </div>
    </div>
    <div class="section-inner market-body">
      <section class="market-panel" id="panel-supply" data-type="supply" role="tabpanel" aria-labelledby="tab-supply">
        <div class="market-card"><table class="market-table">
          <thead><tr><th data-dim="commodity">Commodity</th><th data-dim="origin">Origin</th><th data-dim="volume">Volume</th><th data-dim="quality">Quality</th><th data-dim="when">Shipment</th><th data-dim="added">Date added</th><th><span class="sr-only">Action</span></th></tr></thead>
          <tbody>{sup_rows}</tbody></table></div>
        {empty}
      </section>
      <section class="market-panel" id="panel-demand" data-type="demand" role="tabpanel" aria-labelledby="tab-demand" hidden>
        {sample_note}
        <div class="market-card"><table class="market-table">
          <thead><tr><th data-dim="commodity">Commodity</th><th data-dim="origin">Origin</th><th data-dim="volume">Volume</th><th data-dim="quality">Quality</th><th data-dim="when">Shipment</th><th>Destination</th><th data-dim="added">Date added</th><th><span class="sr-only">Action</span></th></tr></thead>
          <tbody>{dem_rows}</tbody></table></div>
        {empty}
      </section>
      <section class="market-panel" id="panel-map" data-type="map" role="tabpanel" aria-labelledby="tab-map" hidden>
        <div class="mm-controls">
          <div class="seg seg-sm" id="mm-modes" role="group" aria-label="Show on the map">
            <button type="button" data-mode="supply" aria-pressed="false">Supply</button>
            <button type="button" data-mode="demand" aria-pressed="false">Demand</button>
            <button type="button" data-mode="both" aria-pressed="true">Both</button>
          </div>
          <div class="mm-slicers" id="mm-slicers"></div>
          <ul class="mm-legend" aria-label="Map colours"><li><i class="sw sw-sup"></i>Supply</li><li><i class="sw sw-dem"></i>Demand</li><li><i class="sw sw-both"></i>Both</li></ul>
        </div>
        <p class="market-sample" id="mm-sample" hidden>Example demand listings are shown for preview. Replace them in market.json before going live.</p>
        <div class="map-stage" id="mm-stage" tabindex="0" aria-label="World map of supply and demand. Use plus and minus to zoom, arrow keys to move.">
          {market_map_svg()}
          <div class="map-controls" role="group" aria-label="Map zoom">
            <button type="button" class="mz-in" aria-label="Zoom in">+</button>
            <button type="button" class="mz-out" aria-label="Zoom out">&minus;</button>
            <button type="button" class="mz-reset" aria-label="Reset map">&#8634;</button>
          </div>
        </div>
        <div class="mm-results" id="mm-results" aria-live="polite"></div>
      </section>
      <script type="application/json" id="market-data">{market_json}</script>
      <p class="market-foot">Looking for something that is not listed? <a href="contact.html">Contact us</a>. Origin for some commodities is shared on request. <span id="market-updated">Updated {updated}</span></p>
    </div>
  </main>
""" + FOOT


def supply_rows():
    order = {c["slug"]: i for i, c in enumerate(ITEMS)}
    rows = []
    for s in sorted(SOURCES, key=lambda s: s["country"]):
        for slug in s["commodities"]:
            d = MARKET.get("supplyDetails", {}).get(f"{slug}|{s['country']}", {})
            rows.append({"commodity": slug, "volume": d.get("volume", "On request"), "origin": s["country"],
                         "quality": d.get("quality", ""), "when": d.get("when", ""), "details": d.get("details", "")})
    for slug in ON_REQUEST:
        d = MARKET.get("supplyDetails", {}).get(f"{slug}|", {})
        rows.append({"commodity": slug, "volume": d.get("volume", "On request"), "origin": "",
                     "quality": d.get("quality", ""), "when": d.get("when", ""), "details": d.get("details", "")})
    rows.sort(key=lambda r: (order[r["commodity"]], r["origin"]))
    return rows

QUALITY_HINTS = {
    "coffee": "For example Arabica AA, screen 17+", "tea": "For example BP1 black tea, CTC", "avocado": "For example Hass, size 18 to 22",
    "macadamia": "For example kernel style 1, or in shell", "flowers": "For example roses, 50 cm stems, grade A", "poultry": "For example whole frozen chicken, halal",
    "urea": "For example 46% nitrogen, granular", "biochar": "For example fixed carbon %, particle size", "sulphur": "For example 99.9% purity, granular",
    "oil": "For example grade, API gravity, sulphur content", "copper": "For example cathode grade A, 99.99%", "iron": "For example ore 62% Fe, fines",
}

def admin():
    cm = json.dumps([{"slug": c["slug"], "name": c["name"], "hint": QUALITY_HINTS.get(c["slug"], "")} for c in ITEMS])
    countries = json.dumps(sorted(MAPDATA["countries"].keys()))
    seed = json.dumps({"supply": supply_rows(), "demand": [r for r in MARKET.get("demand", []) if not r.get("sample")]} if BUILTIN_LISTINGS else {"supply": [], "demand": []})
    topics = json.dumps([{"id": i, "name": n, "slugs": sl} for i, n, sl in TOPICS])
    return head("Admin — Kabani Commodities", "Listings admin.", '<meta name="robots" content="noindex, nofollow" />') + f"""
  <header class="admin-bar">
    <a class="nav-logo" href="index.html">Kabani <span>Commodities</span></a>
    <div class="admin-user" id="admin-user" hidden><span id="admin-email"></span><button type="button" class="panel-showall" id="admin-signout">Sign out</button></div>
  </header>
  <main class="admin-page">
    <div class="section-inner">
      <p class="admin-preview" id="admin-preview" hidden><strong>Preview mode.</strong> Try the form freely. Nothing here is published and it is forgotten when you close the tab.</p>
      <h1 class="section-title">Listings <span class="accent">admin</span></h1>
      <p class="section-body admin-lead">Add what you can supply and what buyers are looking for. Each listing appears on the Commodities page and on the map as soon as you save it.</p>

      <section class="admin-card" id="admin-setup" hidden>
        <h2>Setup needed</h2>
        <p>The admin needs a free Firebase project. Follow <strong>ADMIN-SETUP.md</strong>, paste the four values into <strong>firebase-config.js</strong>, then rebuild the site.</p>
      </section>

      <section class="admin-card" id="admin-signin" hidden>
        <h2>Sign in</h2>
        <p>Use your Kabani Google account to add, edit or remove supply and demand listings.</p>
        <p class="admin-timeout" id="admin-timeout" role="status" hidden>You were signed out after 30 minutes of inactivity. Sign in again to continue.</p>
        <button type="button" class="btn-primary" id="admin-signin-btn">Sign in with Google</button>
        <p class="admin-error" id="admin-error" role="alert" hidden></p>
        <p class="admin-try">Just looking? <a href="admin.html?demo=1">Try the form in preview mode</a>.</p>
      </section>

      <section class="admin-card" id="admin-denied" hidden>
        <h2>This area is for the Kabani team</h2>
        <p>Client accounts are under construction. Please <a href="contact.html">contact us</a> if you have any questions, or sign out and try again with a different account.</p>
      </section>

      <div id="admin-app" hidden>
        <div class="seg" role="tablist" aria-label="Supply or demand">
          <button type="button" role="tab" id="atab-supply" aria-selected="true">Supply <span id="count-supply">0</span></button>
          <button type="button" role="tab" id="atab-demand" aria-selected="false" tabindex="-1">Demand <span id="count-demand">0</span></button>
        </div>
        <div class="admin-import" id="admin-import" hidden>
          <p>No live listings yet. Start from the supply list on the map?</p>
          <button type="button" class="row-go" id="admin-import-btn">Import current listings</button>
        </div>
        <form class="admin-form" id="admin-form" autocomplete="off">
          <div class="admin-form-head">
            <h2 id="admin-form-title">Add a supply listing</h2>
            <p id="admin-form-sub">Something we can source and offer to buyers.</p>
          </div>
          <div class="form-grid">
            <div class="form-group"><label for="f-commodity">Commodity</label><select id="f-commodity" required></select></div>
            <div class="form-group"><label for="f-origin" id="l-origin">Country of origin</label><input id="f-origin" type="text" maxlength="160" list="country-list" placeholder="Start typing, e.g. Kenya" /></div>
            <div class="form-group"><label for="f-volume">Volume</label><input id="f-volume" type="text" maxlength="160" placeholder="For example 40 t per month, or 2 containers" required /></div>
            <div class="form-group"><label for="f-quality">Quality / grade</label><input id="f-quality" type="text" maxlength="160" placeholder="" /></div>
            <div class="form-group"><label for="f-when" id="l-when">Date of export / shipment</label><input id="f-when" type="text" maxlength="160" list="when-list" placeholder="Pick a suggestion or type, e.g. March 2027" /><datalist id="when-list"></datalist></div>
            <div class="form-group" data-demand><label for="f-port">Destination port</label><input id="f-port" type="text" maxlength="160" placeholder="For example Rotterdam" /></div>
            <div class="form-group" data-demand><label for="f-country">Destination country</label><input id="f-country" type="text" maxlength="160" list="country-list" placeholder="Start typing, e.g. Netherlands" /></div>
          </div>
          <datalist id="country-list"></datalist>
          <div class="form-group"><label for="f-details">More details <em id="details-count">0 / 600</em></label><textarea id="f-details" maxlength="600" rows="3" placeholder="Packaging, certifications, payment terms, samples, anything a buyer or supplier should know."></textarea></div>
          <div class="admin-actions">
            <button type="submit" class="row-go row-go-solid" id="admin-save">Add listing</button>
            <button type="button" class="panel-showall" id="admin-cancel" hidden>Cancel</button>
          </div>
          <p class="admin-error" id="admin-form-error" role="alert" hidden></p>
        </form>
        <p class="admin-notice" id="admin-notice" role="status" hidden></p>
        <div class="admin-list-bar">
          <h2 id="admin-list-title">Supply listings</h2>
          <div class="market-tools">{slicer_html()}<button type="button" class="slicer-clear" id="slicer-clear" hidden>Clear</button></div>
        </div>
        <div class="market-card"><table class="market-table admin-table">
          <thead id="admin-thead"></thead>
          <tbody id="admin-tbody"></tbody>
        </table></div>
        <p class="market-empty" id="admin-empty" hidden></p>
        <p class="admin-wipe" id="admin-wipe-row" hidden><button type="button" class="panel-showall admin-del" id="admin-wipe">Delete all listings</button> <span>Removes every supply and demand listing at once. This cannot be undone.</span></p>
      </div>
    </div>
  </main>
  <script type="application/json" id="admin-data">{{"commodities": {cm}, "countries": {countries}, "seed": {seed}, "topics": {topics}}}</script>
  <script src="firebase-config.js"></script>
  <script type="module" src="admin.js"></script>
</body>
</html>
"""

def detail(c):
    name = E(c["name"])
    summary = E(c["summary"]) if c["summary"] else (
        f"We connect verified buyers and suppliers of {name.lower()}. Send us your requirement and we will come back with current availability and options.")
    cards = ""
    if c["producers"]:
        cards += '<div class="detail-card"><h2>Where we source</h2><ul>' + "".join(f"<li>{E(x)}</li>" for x in c["producers"]) + "</ul></div>"
    if c["specs"]:
        cards += '<div class="detail-card"><h2>Grades &amp; specifications</h2><ul>' + "".join(f"<li>{E(x)}</li>" for x in c["specs"]) + "</ul></div>"
    if c["seasonality"]:
        cards += f'<div class="detail-card"><h2>Seasonality &amp; volumes</h2><p>{E(c["seasonality"])}</p></div>'
    if c["packaging"]:
        cards += f'<div class="detail-card"><h2>Packaging &amp; shipping</h2><p>{E(c["packaging"])}</p></div>'
    grid = f'\n      <div class="detail-grid">{cards}</div>' if cards else ""
    others = "".join(f'<a href="{o["slug"]}.html">{o["icon"]} {E(o["name"])}</a>' for o in ITEMS if o["slug"] != c["slug"])
    return head(f"{c['name']} — Kabani Commodities", f"{c['name']} sourcing and brokerage through Kabani Commodities.") + nav("market") + f"""
  <header class="page-header">
    <div class="section-inner">
      <p class="breadcrumb"><a href="index.html">Home</a> / <a href="market.html">Commodities</a> / {name}</p>
      <div class="detail-head">
        <div class="detail-icon">{c["icon"]}</div>
        <div><p class="detail-cat">{E(c["category"])}</p><h1 class="section-title">{name}</h1></div>
      </div>
      <p class="section-body">{summary}</p>
    </div>
  </header>
  {SCALE_CW}
  <section class="page-section">
    <div class="section-inner">{grid}
      <div class="detail-cta"{' style="margin-top:0"' if not cards else ''}>
        <a href="contact.html?commodity={c['name']}" class="btn-primary">Enquire about {name}</a>
        <p>Tell us your volume, specification and timeline and we will respond with options.</p>
      </div>
      <p class="commodity-section-label" style="margin-top:64px">Other commodities</p>
      <div class="other-list">{others}</div>
    </div>
  </section>
""" + FOOT

pages = {"index.html": index(), "about.html": about(), "contact.html": contact(), "market.html": market()}
if "--inline" not in sys.argv:
    pages["admin.html"] = admin()
for c in ITEMS:
    pages[f"{c['slug']}.html"] = detail(c)

out = HERE
inline = "--inline" in sys.argv
if inline:
    out = sys.argv[sys.argv.index("--inline") + 1]
    os.makedirs(os.path.join(out, "images"), exist_ok=True)
    shutil.copy(os.path.join(HERE, "images", "hero-connection.jpg"), os.path.join(out, "images", "hero-connection.jpg"))
    css = open(os.path.join(HERE, "styles.css"), encoding="utf-8").read()
    js = open(os.path.join(HERE, "site.js"), encoding="utf-8").read()
    cfgjs = open(os.path.join(HERE, "firebase-config.js"), encoding="utf-8").read()
    for k in pages:
        pages[k] = pages[k].replace('<link rel="stylesheet" href="styles.css" />', f"<style>\n{css}</style>").replace('<script src="site.js"></script>', f"<script>\n{js}</script>").replace('<script src="firebase-config.js"></script>', f"<script>\n{cfgjs}</script>")
if not inline:
    # Fingerprint the assets so browsers fetch the new CSS/JS after every deploy instead of a cached copy.
    import hashlib
    def _v(fn):
        return hashlib.md5(open(os.path.join(HERE, fn), "rb").read()).hexdigest()[:8]
    for k in pages:
        for fn in ("styles.css", "site.js", "admin.js", "firebase-config.js"):
            pages[k] = pages[k].replace(f'"{fn}"', f'"{fn}?v={_v(fn)}"')
for name, content in pages.items():
    open(os.path.join(out, name), "w", encoding="utf-8").write(content)
print(f"wrote {len(pages)} pages to {out}")
