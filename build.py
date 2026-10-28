"""Builds the static Plooshi site into ./site from ./data.

Run:  python build.py
Run update_videos.py first to pull in new YouTube uploads.
"""
import json, math, html, os, datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(ROOT, 'site')
DOMAIN = 'https://plooshi.com'
UP = '/wp-content/uploads/'          # media is self-hosted inside ./site
UP_ABS = DOMAIN + UP

# Where forms post. None = Netlify Forms (works automatically on Netlify).
# On Cloudflare Pages or GitHub Pages, set this to a form service URL, e.g. 'https://formspree.io/f/xxxxxxx'.
FORM_ENDPOINT = None

# Folder the site is served from. Empty for a real domain (plooshi.com, Netlify, Cloudflare).
# For a GitHub Pages test address like username.github.io/plooshi-site, build with BASE_PATH=/plooshi-site.
BASE = os.environ.get('BASE_PATH', '').rstrip('/')
SPOTIFY = 'https://open.spotify.com/artist/7im2jVMioz2l4PWG37YbFV'
YOUTUBE = 'https://www.youtube.com/@plooshimusic'
YT_SUB = 'https://www.youtube.com/@plooshimusic?sub_confirmation=1'
TODAY = datetime.date.today().isoformat()

data = json.load(open(os.path.join(ROOT, 'data', 'content.json'), encoding='utf8'))
PRINTS, VIDEOS = data['p'], data['v']
esc = html.escape


def asset(path):
    """Versioned URL (/css/style.css?v=ab12cd34) so browsers fetch CSS/JS again whenever it changes."""
    import hashlib
    return f"{path}?v={hashlib.md5(open(os.path.join(SITE, path.lstrip('/')), 'rb').read()).hexdigest()[:8]}"


def exists(p):
    """os.path.exists that also works past Windows' 260-character path limit."""
    p = os.path.abspath(p)
    return os.path.exists('\\\\?\\' + p if os.name == 'nt' else p)


# ---------------------------------------------------------------- mascot svg
def fur_path(cx, cy, r, n, bump):
    pts = []
    for i in range(n + 1):
        a = -math.pi / 2 + i * 2 * math.pi / n
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    # shaggy, slightly uneven tufts that curl clockwise
    jitter = [1, .75, 1.2, .9, 1.1, .8, 1.25, .95]
    step = 2 * math.pi / n
    d = f'M{pts[0][0]:.1f},{pts[0][1]:.1f}'
    for i in range(1, n + 1):
        a0 = -math.pi / 2 + (i - 1) * step
        rr = r + bump * jitter[i % len(jitter)]
        rr += 0
        tip = a0 + step * .72
        c1 = (cx + (r + bump * .55) * math.cos(a0 + step * .25), cy + (r + bump * .55) * math.sin(a0 + step * .25))
        t = (cx + rr * math.cos(tip), cy + rr * math.sin(tip))
        d += (f' Q{c1[0]:.1f},{c1[1]:.1f} {t[0]:.1f},{t[1]:.1f}'
              f' Q{cx + (r + bump * .25) * math.cos(a0 + step * .9):.1f},{cy + (r + bump * .25) * math.sin(a0 + step * .9):.1f} {pts[i][0]:.1f},{pts[i][1]:.1f}')
    return d + 'Z'


def mascot(cls='mascot', coloring=False, label='Plooshi the fluffy blue friend. Tap me!'):
    fur, face, cheek, nose = ('#ffffff',) * 4 if coloring else ('#7fd0f3', '#d6f2fd', '#ff9aa8', '#3b2a40')
    stroke = 'stroke="#1d3260" stroke-width="5" stroke-linejoin="round"'
    def F(name, color):
        return f'data-fill="{name}" data-orig="{color}" fill="{color}"' if coloring else f'fill="{color}"'
    tuft = ''.join(
        f'<path {F("tuft", fur)} {stroke} d="M{x - 20},96 Q{x - 14 + dx * .4},{50 + h * .4} {x + dx},{h} Q{x + 8 + dx * .2},{56 + h * .3} {x + 20},96Z"/>'
        for x, dx, h in [(172, -22, 52), (200, 4, 38), (228, 24, 54)])
    extra_attrs = '' if coloring else 'role="img" tabindex="0"'
    bg = f'<circle {F("bg", "#fff8e1")} cx="200" cy="215" r="196" stroke="#1d3260" stroke-width="4"/>' if coloring else ''
    return f'''<svg class="{cls}" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" {extra_attrs} aria-label="{esc(label)}">
<title>{esc(label)}</title>{bg}
<g class="body">
{tuft}
<path {F("fur", fur)} {stroke} d="{fur_path(200, 225, 150, 30, 13)}"/>
<path {F("fur2", '#a6e0f7' if not coloring else '#ffffff')} opacity="{1 if coloring else .55}" d="{fur_path(200, 232, 118, 20, 10)}" {'stroke="#1d3260" stroke-width="3"' if coloring else ''}/>
<ellipse {F("face", face)} {stroke} cx="200" cy="245" rx="104" ry="86"/>
<ellipse {F("cheeks", cheek)} cx="128" cy="268" rx="22" ry="14" {'stroke="#1d3260" stroke-width="3"' if coloring else 'opacity=".8"'}/>
<ellipse {F("cheeks", cheek)} cx="272" cy="268" rx="22" ry="14" {'stroke="#1d3260" stroke-width="3"' if coloring else 'opacity=".8"'}/>
<g><circle cx="158" cy="225" r="27" fill="#fff" {stroke}/><g class="pupil"><circle cx="158" cy="227" r="16" fill="#1d3260"/><circle cx="152" cy="220" r="6" fill="#fff"/></g>
<ellipse class="lid" cx="158" cy="225" rx="29" ry="29" fill="{face}"/></g>
<g><circle cx="242" cy="225" r="27" fill="#fff" {stroke}/><g class="pupil"><circle cx="242" cy="227" r="16" fill="#1d3260"/><circle cx="236" cy="220" r="6" fill="#fff"/></g>
<ellipse class="lid" cx="242" cy="225" rx="29" ry="29" fill="{face}"/></g>
<path {F("nose", nose)} d="M188,252 Q200,246 212,252 Q206,264 200,265 Q194,264 188,252Z" stroke="#1d3260" stroke-width="3"/>
<g class="mouth-o"><path d="M176,276 Q200,312 224,276 Q200,286 176,276Z" fill="#c2185b" stroke="#1d3260" stroke-width="4" stroke-linejoin="round"/><path d="M190,292 Q200,302 210,292 Q200,286 190,292Z" fill="#ff7aa2"/></g>
<g class="mouth-big"><path d="M166,272 Q200,336 234,272 Q200,284 166,272Z" fill="#c2185b" stroke="#1d3260" stroke-width="4" stroke-linejoin="round"/><path d="M184,300 Q200,318 216,300 Q200,292 184,300Z" fill="#ff7aa2"/></g>
</g></svg>'''


# ---------------------------------------------------------------- shared chrome
ICON_YT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>'
ICON_SP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm5.5 17.3a.75.75 0 0 1-1 .25c-2.8-1.7-6.4-2.1-10.6-1.2a.75.75 0 1 1-.3-1.5c4.6-1 8.6-.6 11.7 1.3.4.2.5.7.2 1.1zm1.5-3.3a.94.94 0 0 1-1.3.3c-3.2-2-8.1-2.5-11.9-1.4a.94.94 0 1 1-.5-1.8c4.3-1.3 9.7-.7 13.4 1.6.4.3.6.9.3 1.3zm.1-3.4C15.3 8.3 8.9 8.1 5.2 9.2a1.1 1.1 0 1 1-.7-2.1c4.3-1.3 11.3-1 15.7 1.6a1.1 1.1 0 0 1-1.1 1.9z"/></svg>'

NAV = [('/', 'Home'), ('/songs/', 'Songs'), ('/printable/', 'Printables'), ('/play/', 'Play'), ('/learn/', 'Learn')]


def header(active):
    cur = ' aria-current="page"'
    links = ''.join(f'<a href="{h}"{cur if h == active else ""}>{t}</a>' for h, t in NAV)
    return f'''<a class="skip" href="#main">Skip to content</a>
<header class="top"><div class="wrap">
<a class="logo" href="/" aria-label="Plooshi home"><img src="/assets/plooshi-avatar.jpg" alt="" width="50" height="50"><span>Ploo<b>shi</b></span></a>
<nav class="nav" id="nav" aria-label="Main">{links}<a class="cta" href="{YT_SUB}" target="_blank" rel="noopener">▶ Subscribe</a></nav>
<button class="sound-btn" aria-pressed="true" aria-label="Turn sounds off">🔊</button>
<button class="menu-btn" aria-expanded="false" aria-controls="nav" aria-label="Menu">☰</button>
</div></header>'''


FOOTER = f'''<footer><div class="wrap">
<div class="cols">
<div><a class="logo" href="/" style="color:#fff"><img src="/assets/plooshi-avatar.jpg" alt="" width="50" height="50" loading="lazy"><span>Ploo<b>shi</b></span></a>
<p>Sing-along songs, nursery rhymes, lullabies and free printables that help little ones learn through song &amp; play.</p>
<div class="socials"><a href="{YOUTUBE}" target="_blank" rel="noopener" aria-label="Plooshi on YouTube">{ICON_YT}</a><a href="{SPOTIFY}" target="_blank" rel="noopener" aria-label="Plooshi on Spotify">{ICON_SP}</a></div></div>
<div><h3>Explore</h3><a href="/songs/">Songs &amp; Videos</a><a href="/printable/">Free Coloring Pages</a><a href="/play/">Games</a><a href="/learn/">Fun Facts &amp; Activities</a><a href="/animal-facts-for-kids/">Animal Facts</a></div>
<div><h3>Listen</h3><a href="{SPOTIFY}" target="_blank" rel="noopener">Spotify</a><a href="{YOUTUBE}" target="_blank" rel="noopener">YouTube</a><a href="/songs/#lyrics">Song Lyrics</a><a href="/licensing/">Licensing</a></div>
<div><h3>Grown-ups</h3><a href="/about/">About Plooshi</a><a href="/faqs/">FAQs</a><a href="/contact/">Contact</a><a href="/privacy-policy-2/">Privacy</a><a href="/terms-of-service/">Terms</a></div>
</div>
<div class="legal">© {datetime.date.today().year} Plooshi. All rights reserved. Made with 💙 for little listeners.</div>
</div></footer>'''


PAGES = []  # (path, image) for the sitemap


def page(path, title, desc, body, active, jsonld, extra_js='', og_img=UP_ABS + '2024/01/Plooshi-1.jpg', noindex=False, og_type='website'):
    url = DOMAIN + path
    if not noindex:
        PAGES.append((path, og_img))
    ld = json.dumps(jsonld, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    doc = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{url}">
<meta name="robots" content="{'noindex,follow' if noindex else 'index,follow,max-image-preview:large'}">
<meta name="theme-color" content="#5ec8f2">
<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="Plooshi">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{og_img}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@plooshimusic">
<link rel="icon" href="{UP}2024/01/cropped-19fcebfc-ca65-498c-a9bf-1fc67c1f8320-32x32.webp" sizes="32x32">
<link rel="apple-touch-icon" href="{UP}2024/01/cropped-19fcebfc-ca65-498c-a9bf-1fc67c1f8320-180x180.webp">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://i.ytimg.com">
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@400;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{asset('/css/style.css')}">
<script type="application/ld+json">{ld}</script>
</head>
<body>
{header(active)}
<main id="main">
{body}
</main>
{FOOTER}
<script src="{asset('/js/main.js')}" defer></script>{extra_js}
</body>
</html>
'''
    out = os.path.join(SITE, path.strip('/'), 'index.html') if path != '/' else os.path.join(SITE, 'index.html')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w', encoding='utf8').write(doc)


def form_open(name, cls=''):
    """Form tag that works with Netlify Forms by default, or any POST endpoint via FORM_ENDPOINT."""
    c = f' class="{cls}"' if cls else ''
    if FORM_ENDPOINT:
        return f'<form{c} name="{name}" method="POST" action="{FORM_ENDPOINT}"><input type="hidden" name="_next" value="{DOMAIN}/thanks/">'
    return (f'<form{c} name="{name}" method="POST" action="/thanks/" data-netlify="true" netlify-honeypot="bot-field">'
            f'<input type="hidden" name="form-name" value="{name}"><p class="sr"><label>Leave empty <input name="bot-field"></label></p>')


# ---------------------------------------------------------------- pieces
ORG = {'@type': 'MusicGroup', '@id': DOMAIN + '/#plooshi', 'name': 'Plooshi', 'url': DOMAIN + '/',
       'genre': ["Children's Music", 'Nursery Rhymes', 'Lullabies'],
       'logo': UP_ABS + '2024/01/cropped-19fcebfc-ca65-498c-a9bf-1fc67c1f8320-270x270.webp',
       'image': UP_ABS + '2024/01/Plooshi-1.jpg', 'sameAs': [SPOTIFY, YOUTUBE]}
SITE_LD = {'@type': 'WebSite', '@id': DOMAIN + '/#website', 'url': DOMAIN + '/', 'name': 'Plooshi',
           'publisher': {'@id': DOMAIN + '/#plooshi'},
           'potentialAction': {'@type': 'SearchAction', 'target': DOMAIN + '/printable/?q={search_term_string}', 'query-input': 'required name=search_term_string'}}


def crumbs(*items):
    return {'@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': DOMAIN + u} for i, (n, u) in enumerate(items)]}


def vcard(v, lazy=True):
    name = f"{v['t']} {v['e']}".strip()
    return f'''<article class="card" data-cats="{esc(v['c'])}" data-name="{esc((v['t'] + ' ' + v['d'] + ' ' + v['c']).lower())}">
<button class="vthumb" data-id="{v['id']}" aria-label="Play {esc(v['t'])}"><img src="https://i.ytimg.com/vi/{v['id']}/hqdefault.jpg" alt="{esc(v['t'])} – Plooshi kids song video" width="480" height="360" {'loading="lazy"' if lazy else ''} decoding="async"><span class="play"></span></button>
<div class="body"><span class="badge">{esc(v['c'])}</span><h3>{esc(name)}</h3><p>{esc(v['d'])}</p></div></article>'''


def pcard(p, lazy=True):
    return f'''<article class="pcard" data-slug="{p['s']}" data-cats="{','.join(p['c'])}" data-name="{esc((p['t'] + ' ' + ' '.join(p['c'])).lower())}">
<button class="fav" aria-pressed="false" aria-label="Save {esc(p['t'])} to my faves">💖</button>
<a class="img" href="/printable/{p['s']}/"><img src="{UP}{p['img']}" alt="Free printable {esc(p['t'])} coloring page for kids" width="768" height="593" {'loading="lazy"' if lazy else ''} decoding="async"></a>
<h3>{esc(p['t'])}</h3>
<div class="row"><a class="btn sm" data-dl href="{UP}{p['pdf']}" target="_blank" rel="noopener" aria-label="Print {esc(p['t'])} coloring page (PDF)">🖨️ Print</a><a class="btn sm white" href="/printable/{p['s']}/" aria-label="More about the {esc(p['t'])} coloring page">Look</a></div>
</article>'''


def chips(cats, extra=''):
    return '<button class="chip" aria-pressed="true" data-cat="All">⭐ All</button>' + ''.join(
        f'<button class="chip" aria-pressed="false" data-cat="{esc(c)}">{e} {esc(c)}</button>' for c, e in cats) + extra


VCATS = [('Sing-Along', '🎤'), ('Learning', '🔤'), ('Dance & Play', '💃'), ('Lullabies', '🌙'), ('Everyday', '🪥')]
PCATS = [('Animals', '🐶'), ('Dinosaurs', '🦖'), ('Vehicles', '🚒'), ('Holidays', '🎄'), ('Food', '🍕'), ('Fantasy', '🦄'), ('Sports', '⚽'), ('Nature', '🌈')]

XYLO_COLORS = ['#ff5a5a', '#ff8a3d', '#ffc93c', '#6fdcae', '#5ec8f2', '#2a9fd6', '#8b6cf0', '#ec3d8f']
XYLO_NOTES = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']


def xylophone():
    bars = ''.join(
        f'<button class="bar" data-note="{n}" style="background:{c};height:{260 - i * 18}px" aria-label="Play note {n[0]}">{n[0]}</button>'
        for i, (n, c) in enumerate(zip(XYLO_NOTES, XYLO_COLORS)))
    return f'''<div><div class="xylo" role="group" aria-label="Rainbow xylophone">{bars}</div>
<p class="xylo-status" style="text-align:center;font-weight:800;margin:6px 0 0">Tap the bars (or press A S D F G H J K) to make music!</p>
<div class="xylo-songs"><button class="btn sm sun" data-song="twinkle">⭐ Twinkle Twinkle</button><button class="btn sm sun" data-song="mary">🐑 Mary Had a Little Lamb</button><button class="btn sm sun" data-song="buns">🍞 Hot Cross Buns</button><button class="btn sm sun" data-song="row">🚣 Row Your Boat</button></div></div>'''


WAVE = '<div class="wave" aria-hidden="true"><svg viewBox="0 0 1440 90" preserveAspectRatio="none"><path fill="#fffaf0" d="M0,40 C240,100 480,0 720,40 C960,80 1200,10 1440,50 L1440,90 L0,90Z"/></svg></div>'
CLOUDS = '<div class="sky-deco" aria-hidden="true">' + ''.join(
    f'<span class="cloud" style="top:{t}%;width:{w}px;height:{w // 3}px;animation-duration:{d}s;animation-delay:-{dl}s"></span>'
    for t, w, d, dl in [(8, 160, 70, 10), (22, 110, 55, 30), (60, 140, 80, 50), (40, 90, 60, 5)]) + '</div>'

FAQ = [
    ('Is Plooshi free to watch and listen to?', 'Yes! All Plooshi songs and videos are free on YouTube and Spotify, and every coloring page here is a free printable PDF.'),
    ('What ages are Plooshi songs for?', 'Plooshi is made for toddlers, preschoolers and early learners (about ages 1–6). Older siblings love singing along too.'),
    ('Are the games safe for kids?', 'Yes. The games run right in your browser, need no sign-up, and do not collect any personal information. Videos load in YouTube privacy-enhanced mode only when you tap play.'),
    ('How do I print a coloring page?', 'Tap the Print button on any coloring page to open the PDF, then print it at home on regular letter or A4 paper.'),
    ('Can teachers use Plooshi in the classroom?', 'Absolutely! Our songs and printables are perfect for circle time, music class and quiet-time activities. For other uses, see our licensing page.'),
]


# ---------------------------------------------------------------- HOME
def build_home():
    feat = VIDEOS[0]
    fav_prints = [p for p in PRINTS if p['s'] in {'unicorn-coloring-page', 't-rex-coloring-page', 'fire-truck-coloring-page', 'mermaid-coloring-page', 'puppy-coloring-page', 'astronaut-coloring-page', 'rainbow-coloring-page', 'monster-truck-coloring-page'}] or PRINTS[:8]
    # home has no filter group, so strip filter attrs-free cards are fine
    body = f'''
<section class="hero" aria-labelledby="hero-title">{CLOUDS}
<div class="wrap">
<div>
<span class="eyebrow">🎵 Learning Through Song &amp; Play</span>
<h1 id="hero-title"><span class="w">Sing,</span> <span class="w">play</span> <span class="w">&amp;</span> <span class="w">color</span> with Plooshi!</h1>
<p class="lead">Silly sing-alongs, sweet lullabies, nursery rhymes and {len(PRINTS)} free printable coloring pages for little learners.</p>
<div class="actions"><a class="btn" href="/songs/">▶ Watch Songs</a><a class="btn sun" href="/printable/">🖍️ Free Coloring Pages</a><a class="btn blue" href="/play/">🎮 Play Games</a></div>
<div class="stats"><div class="stat"><b>{len(VIDEOS)}+</b><small>Videos</small></div><div class="stat"><b>{len(PRINTS)}</b><small>Printables</small></div><div class="stat"><b>4</b><small>Games</small></div></div>
</div>
<div class="mascot-stage">
<div class="bubble" aria-live="polite"></div>
{mascot()}
<span class="tap-hint" aria-hidden="true">👆 Tap Plooshi!</span>
</div>
</div>{WAVE}
</section>

<section id="songs" aria-labelledby="songs-title">
<div class="wrap">
<div class="sec-head reveal"><span class="tag">New on YouTube</span><h2 id="songs-title">Sing along with Plooshi 🎤</h2><p>Counting songs, ABCs, shapes, silly dances and cozy bedtime lullabies — new videos every week.</p></div>
<div class="feature reveal">
<button class="vthumb" data-id="{feat['id']}" aria-label="Play {esc(feat['t'])}"><img src="https://i.ytimg.com/vi/{feat['id']}/maxresdefault.jpg" alt="{esc(feat['t'])} – Plooshi song for kids" width="1280" height="720" fetchpriority="high"><span class="play"></span></button>
<div class="listen"><h3>🎧 Listen on Spotify</h3>
<iframe title="Plooshi on Spotify" src="https://open.spotify.com/embed/artist/7im2jVMioz2l4PWG37YbFV?utm_source=generator&amp;theme=0" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>
<div class="platforms"><a class="btn sm" href="{YT_SUB}" target="_blank" rel="noopener">▶ YouTube</a><a class="btn sm blue" href="{SPOTIFY}" target="_blank" rel="noopener">Spotify</a></div></div>
</div>
<div class="grid reveal">{''.join(vcard(v) for v in VIDEOS[1:7])}</div>
<p style="text-align:center;margin-top:36px"><a class="btn blue" href="/songs/">See all songs →</a></p>
</div></section>

<section class="bg-sun" aria-labelledby="xylo-title">
<div class="wrap">
<div class="sec-head reveal"><span class="tag">Try it!</span><h2 id="xylo-title">Plooshi's Rainbow Xylophone 🌈</h2><p>Tap the colorful bars to make your own music — or pick a song and follow the ring!</p></div>
<div class="reveal">{xylophone()}</div>
</div></section>

<section id="printables" aria-labelledby="print-title">
<div class="wrap">
<div class="sec-head reveal"><span class="tag">100% Free</span><h2 id="print-title">Free printable coloring pages 🖍️</h2><p>Unicorns, dinosaurs, monster trucks, mermaids and more — just tap Print!</p></div>
<div class="pgrid reveal">{''.join(pcard(p) for p in fav_prints)}</div>
<p style="text-align:center;margin-top:36px"><a class="btn" href="/printable/">Browse all {len(PRINTS)} coloring pages →</a></p>
</div></section>

<section class="bg-sky" aria-labelledby="games-title">
<div class="wrap">
<div class="sec-head reveal"><span class="tag">Play time</span><h2 id="games-title">Games for little hands 🎮</h2><p>No sign-up, no ads, no downloads. Just tap and play!</p></div>
<div class="games reveal">
<a class="game g1" href="/play/#color"><span class="emo" aria-hidden="true">🎨</span><h3>Color Plooshi</h3><p>Pick colors and paint Plooshi any way you like.</p></a>
<a class="game g2" href="/play/#memory-panel"><span class="emo" aria-hidden="true">🐸</span><h3>Memory Match</h3><p>Flip the cards and find the animal pairs.</p></a>
<a class="game g3" href="/play/#bubbles-panel"><span class="emo" aria-hidden="true">🫧</span><h3>Bubble Count</h3><p>Pop the bubbles in order and learn to count!</p></a>
<a class="game g4" href="/play/#xylophone"><span class="emo" aria-hidden="true">🎹</span><h3>Xylophone</h3><p>Play Twinkle Twinkle and other songs.</p></a>
</div></div></section>

<section id="parents" class="bg-ink" aria-labelledby="parents-title">
<div class="wrap">
<div class="sec-head reveal"><span class="tag">For grown-ups</span><h2 id="parents-title" style="color:#fff">Why parents &amp; teachers love Plooshi</h2><p>Every song is made to build early skills while keeping screen time joyful and gentle.</p></div>
<div class="parents reveal">
<div class="pbox"><div class="i">🔤</div><h3>Early learning</h3><p>ABCs, counting, shapes and colors set to catchy, repeatable melodies.</p></div>
<div class="pbox"><div class="i">🪥</div><h3>Everyday routines</h3><p>Brushing teeth, bath time and hand washing songs turn chores into fun.</p></div>
<div class="pbox"><div class="i">🌙</div><h3>Calm bedtimes</h3><p>Soothing lullabies and instrumental versions for naps and sleep.</p></div>
<div class="pbox"><div class="i">🛡️</div><h3>Kid-safe</h3><p>No sign-ups or tracking in our games; videos use privacy-enhanced mode.</p></div>
</div>
<div class="faq reveal"><h2 style="text-align:center;color:#fff;font-size:2rem">Questions</h2>
{''.join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q, a in FAQ)}
</div></div></section>

<section aria-labelledby="news-title"><div class="wrap">
<div class="news reveal"><h2 id="news-title">Join the Plooshi Family 💙</h2><p>Get new songs and printables in your inbox. For grown-ups only!</p>
{form_open('newsletter')}<label class="sr" for="em">Grown-up's email</label><input id="em" type="email" name="email" placeholder="grown-up@email.com" required autocomplete="email"><button class="btn sun" type="submit">Join</button></form>
<small>We never share your email. Unsubscribe anytime.</small></div>
</div></section>'''
    ld = {'@context': 'https://schema.org', '@graph': [ORG, SITE_LD,
          {'@type': 'WebPage', '@id': DOMAIN + '/#webpage', 'url': DOMAIN + '/', 'name': 'Plooshi – Kids Songs, Nursery Rhymes & Free Coloring Pages', 'isPartOf': {'@id': DOMAIN + '/#website'}, 'about': {'@id': DOMAIN + '/#plooshi'}},
          {'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in FAQ]}]}
    page('/', 'Plooshi – Kids Songs, Nursery Rhymes & Free Coloring Pages',
         f'Sing, play and color with Plooshi! Fun sing-along songs, nursery rhymes and lullabies for toddlers and preschoolers, plus {len(PRINTS)} free printable coloring pages and kid-safe games.',
         body, '/', ld)


# ---------------------------------------------------------------- SONGS
def build_songs():
    body = f'''
<section class="phero">{CLOUDS}<div class="wrap" style="position:relative;z-index:2">
<p class="crumbs"><a href="/">Home</a> › Songs</p>
<h1>Plooshi Songs &amp; Videos 🎵</h1>
<p>Nursery rhymes, counting songs, ABCs, dance songs and lullabies for kids. Tap any video to watch!</p>
<p style="margin-top:20px"><a class="btn" href="{YT_SUB}" target="_blank" rel="noopener">▶ Subscribe on YouTube</a> <a class="btn blue" href="{SPOTIFY}" target="_blank" rel="noopener">🎧 Spotify</a></p>
</div></section>
<section style="padding-top:30px"><div class="wrap">
<div class="chips" data-filter-group="#vgrid" data-search="#vsearch" data-counter="#vcount" data-empty="#vempty">{chips(VCATS)}</div>
<div class="searchbar"><label class="sr" for="vsearch">Search songs</label><input id="vsearch" type="search" placeholder="🔍 Find a song… (frogs, ABC, bath)"></div>
<p class="count-line" id="vcount" aria-live="polite"></p>
<div class="grid" id="vgrid">{''.join(vcard(v, i > 5) for i, v in enumerate(VIDEOS))}</div>
<p class="empty" id="vempty" hidden>No songs found — try another word! 🙈</p>
</div></section>
<section class="bg-sun"><div class="wrap"><div class="sec-head"><h2>Bedtime? Try our lullabies on Spotify 🌙</h2><p>Instrumental lullaby versions of Twinkle Twinkle, Frère Jacques, Hush Little Baby and more.</p></div>
<div class="listen" style="max-width:760px;margin:0 auto"><iframe title="Plooshi on Spotify" src="https://open.spotify.com/embed/artist/7im2jVMioz2l4PWG37YbFV?utm_source=generator&amp;theme=0" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe></div></div></section>'''
    items = [{'@type': 'ListItem', 'position': i + 1, 'item': {
        '@type': 'VideoObject', 'name': f"{v['t']} | {v['d']}", 'description': f"{v['t']} – {v['d']} by Plooshi.",
        'thumbnailUrl': f"https://i.ytimg.com/vi/{v['id']}/hqdefault.jpg", 'embedUrl': f"https://www.youtube.com/embed/{v['id']}",
        'contentUrl': f"https://www.youtube.com/watch?v={v['id']}", 'uploadDate': v.get('date') or TODAY}} for i, v in enumerate(VIDEOS)]
    ld = {'@context': 'https://schema.org', '@graph': [ORG,
          {'@type': 'CollectionPage', 'url': DOMAIN + '/songs/', 'name': 'Plooshi Songs & Videos for Kids', 'mainEntity': {'@type': 'ItemList', 'itemListElement': items}},
          crumbs(('Home', '/'), ('Songs', '/songs/'))]}
    page('/songs/', 'Kids Songs & Nursery Rhyme Videos | Plooshi',
         'Watch Plooshi sing-along songs for kids: nursery rhymes, counting songs, ABCs, shapes, dance songs, bath and tooth-brushing songs, and soothing lullabies.',
         body, '/songs/', ld, og_img=f"https://i.ytimg.com/vi/{VIDEOS[0]['id']}/maxresdefault.jpg")


# ---------------------------------------------------------------- PRINTABLES
def build_printables():
    body = f'''
<section class="phero">{CLOUDS}<div class="wrap" style="position:relative;z-index:2">
<p class="crumbs"><a href="/">Home</a> › Printables</p>
<h1>Free Printable Coloring Pages 🖍️</h1>
<p>{len(PRINTS)} free coloring pages for kids — animals, dinosaurs, trucks, holidays, unicorns and more. Tap <b>Print</b> to open the PDF, tap 💖 to save your faves!</p>
</div></section>
<section style="padding-top:30px"><div class="wrap">
<div class="searchbar"><label class="sr" for="psearch">Search coloring pages</label><input id="psearch" type="search" placeholder="🔍 What do you want to color? (unicorn, truck…)"></div>
<div class="chips" data-filter-group="#pgrid" data-search="#psearch" data-counter="#pcount" data-empty="#pempty">{chips(PCATS, '<button class="chip" aria-pressed="false" data-cat="Faves">💖 My Faves</button><button class="chip" data-surprise style="background:var(--sun);border-color:var(--sun-d)">🎲 Surprise me!</button>')}</div>
<p class="count-line" id="pcount" aria-live="polite"></p>
<div class="pgrid" id="pgrid">{''.join(pcard(p, i > 7) for i, p in enumerate(PRINTS))}</div>
<p class="empty" id="pempty" hidden>Nothing here yet! Try another word or tap 💖 on a page to save it. 🙈</p>
</div></section>
<section class="bg-pink"><div class="wrap"><div class="sec-head"><h2>Color while you sing! 🎶</h2><p>Put on a Plooshi playlist while your little artist colors — it makes quiet time extra fun.</p><p><a class="btn" href="/songs/">▶ Open the songs</a> <a class="btn blue" href="/play/#color">🎨 Color Plooshi online</a></p></div></div></section>'''
    items = [{'@type': 'ListItem', 'position': i + 1, 'url': f"{DOMAIN}/printable/{p['s']}/", 'name': f"{p['t']} Coloring Page",
              'image': UP_ABS + p['img']} for i, p in enumerate(PRINTS)]
    ld = {'@context': 'https://schema.org', '@graph': [ORG,
          {'@type': 'CollectionPage', 'url': DOMAIN + '/printable/', 'name': 'Free Printable Coloring Pages for Kids', 'isAccessibleForFree': True,
           'mainEntity': {'@type': 'ItemList', 'numberOfItems': len(PRINTS), 'itemListElement': items}},
          crumbs(('Home', '/'), ('Printables', '/printable/'))]}
    page('/printable/', f'{len(PRINTS)} Free Printable Coloring Pages for Kids | Plooshi',
         f'Download {len(PRINTS)} free printable coloring pages for kids: animals, dinosaurs, unicorns, mermaids, trucks, holidays, food and sports. Print-ready PDFs for home and classroom.',
         body, '/printable/', ld)


# ---------------------------------------------------------------- PLAY
def build_play():
    body = f'''
<section class="phero">{CLOUDS}<div class="wrap" style="position:relative;z-index:2">
<p class="crumbs"><a href="/">Home</a> › Play</p>
<h1>Plooshi Play Time 🎮</h1>
<p>Free, kid-safe learning games. No sign-ups, no downloads — just tap and play!</p>
<p style="margin-top:18px"><a class="btn sm" href="#color">🎨 Color</a> <a class="btn sm blue" href="#memory-panel">🐸 Memory</a> <a class="btn sm sun" href="#bubbles-panel">🫧 Count</a> <a class="btn sm white" href="#xylophone">🎹 Music</a></p>
</div></section>
<section style="padding-top:20px"><div class="wrap">

<div class="game-panel" id="color"><h2>🎨 Color Plooshi</h2><p class="sub">Pick a color, then tap a part of Plooshi to paint it!</p>
<div class="colorer" id="colorer">{mascot('coloring', coloring=True, label='Plooshi coloring picture')}
<div><div class="palette" role="group" aria-label="Colors"></div>
<p style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px"><button class="btn sm sun" id="color-random">🎲 Magic colors</button><button class="btn sm white" id="color-reset">🧽 Start over</button></p></div></div></div>

<div class="game-panel" id="memory-panel"><h2>🐸 Animal Memory Match</h2><p class="sub">Flip two cards. Can you find all the animal friends from Plooshi songs?</p>
<div class="scorebar"><span>Moves: <span class="pill" id="mem-moves">0</span></span><span>Best: <span class="pill" id="mem-best">—</span></span><button class="btn sm blue" id="mem-new">🔀 New game</button></div>
<div class="memory" id="memory"></div></div>

<div class="game-panel" id="bubbles-panel"><h2>🫧 Bubble Count</h2><p class="sub">Pop the bubbles in order: 1, 2, 3… Listen as Plooshi counts with you!</p>
<div class="scorebar"><label for="bub-level">Count to</label><select id="bub-level" style="font:inherit;padding:6px 12px;border-radius:12px;border:3px solid var(--ink)"><option>5</option><option selected>10</option></select>
<span>Find: <span class="pill" id="bub-next">1</span></span><button class="btn sm" id="bub-start">▶ Start</button></div>
<p id="bub-msg" style="text-align:center;font-weight:800" aria-live="polite">Press Start!</p>
<div class="bubbles" id="bubbles"></div></div>

<div class="game-panel" id="xylophone"><h2>🎹 Rainbow Xylophone</h2><p class="sub">Make music! Pick a song to play along with the dark ring.</p>{xylophone()}</div>

</div></section>'''
    ld = {'@context': 'https://schema.org', '@graph': [ORG,
          {'@type': 'WebPage', 'url': DOMAIN + '/play/', 'name': 'Free Learning Games for Kids', 'audience': {'@type': 'PeopleAudience', 'suggestedMinAge': 2, 'suggestedMaxAge': 7},
           'hasPart': [{'@type': 'VideoGame', 'name': n, 'description': d, 'genre': 'Educational', 'applicationCategory': 'Game', 'operatingSystem': 'Web browser', 'isAccessibleForFree': True,
                        'offers': {'@type': 'Offer', 'price': 0, 'priceCurrency': 'USD'}}
                       for n, d in [('Color Plooshi', 'Online coloring game for toddlers'), ('Animal Memory Match', 'Memory card game with animals'), ('Bubble Count', 'Pop bubbles to learn counting 1–10'), ('Rainbow Xylophone', 'Play nursery rhyme melodies on a virtual xylophone')]]},
          crumbs(('Home', '/'), ('Play', '/play/'))]}
    page('/play/', 'Free Learning Games for Toddlers & Preschoolers | Plooshi',
         'Play free kid-safe learning games with Plooshi: online coloring, animal memory match, bubble counting 1–10 and a rainbow xylophone with nursery rhyme songs.',
         body,
         '/play/', ld, extra_js=f'\n<script src="{asset("/js/games.js")}" defer></script>')


# ---------------------------------------------------------------- migrated WordPress content
import re, difflib

WP = json.load(open(os.path.join(ROOT, 'data', 'wordpress.json'), encoding='utf8'))
PRINT_PARENT = 4609
# pages rebuilt by hand below, or replaced by a redirect
SKIP = {'home-01', 'printable', 'discography', 'my-account', 'our-channels', 'gallery', 'contact', 'faqs', 'licensing', 'about'}
REDIRECTS = {'/discography/': '/songs/', '/our-channels/': '/songs/', '/printables/': '/printable/', '/my-account/': '/',
             '/gallery/': '/', '/song/': '/songs/#lyrics', '/category/song/': '/songs/#lyrics', '/category/nursery-rhyme/': '/songs/#lyrics',
             '/blog/': '/learn/', '/freebies/': '/printable/'}


def U(s):
    return html.unescape(s or '').replace('’', "'")


def clean(c):
    """Turn WordPress-rendered HTML into tidy, self-hosted HTML."""
    c = re.sub(r'<svg.*?</svg>', '', c, flags=re.S)
    c = re.sub(r'<style.*?</style>', '', c, flags=re.S)
    c = re.sub(r'<!--.*?-->', '', c, flags=re.S)
    c = re.sub(r'<img[^>]+wordpress\.vecurosoft\.com[^>]*>', '', c)          # theme demo leftovers
    c = re.sub(r'<iframe[^>]*2BxE0h73JLc[^>]*>.*?</iframe>', '', c, flags=re.S)
    c = re.sub(r'\[/?[a-z0-9_-]+[^\]]*\]', '', c)                              # shortcodes
    c = re.sub(r'\s(?:srcset|sizes|data-wpil-keyword-link)="[^"]*"', '', c)
    c = c.replace(' class="wpil_keyword_link"', '')
    c = c.replace('https://plooshi.com/', '/').replace('http://plooshi.com/', '/')
    c = re.sub(r'<img(?![^>]*loading=)', '<img loading="lazy"', c)
    c = re.sub(r'<p>\s*(?:<br\s*/?>\s*)*</p>', '', c)
    return c.strip()


def feat(x, size='medium_large'):
    m = (x.get('_embedded', {}).get('wp:featuredmedia') or [{}])[0]
    s = m.get('media_details', {}).get('sizes', {})
    u = (s.get(size) or s.get('large') or {}).get('source_url') or m.get('source_url')
    return u.replace('https://plooshi.com', '') if u else None


def meta(x):
    y = x.get('yoast_head_json') or {}
    return U(y.get('title')) or U(x['title']['rendered']) + ' • Plooshi', U(y.get('description'))


def related_prints(text, n=4):
    t = text.lower().replace('-', ' ')
    hits = [p for p in PRINTS if re.search(r'\b' + re.escape(p['t'].lower()) + r's?\b', t)]
    for p in PRINTS:
        if len(hits) >= n: break
        if p not in hits and any(c in p['c'] for c in (hits[0]['c'] if hits else ['Animals'])): hits.append(p)
    return hits[:n]


def related_block(text, title='Color it in! 🖍️'):
    ps = related_prints(text)
    return f'''<section class="bg-sun"><div class="wrap"><div class="sec-head"><h2>{title}</h2><p>Free printable coloring pages to go with this.</p></div>
<div class="pgrid">{''.join(pcard(p) for p in ps)}</div><p style="text-align:center;margin-top:30px"><a class="btn" href="/printable/">All {len(PRINTS)} coloring pages →</a></p></div></section>'''


def article_shell(crumb, h1, content, after=''):
    return f'''<section class="phero">{CLOUDS}<div class="wrap" style="position:relative;z-index:2">
<p class="crumbs"><a href="/">Home</a> › {crumb}</p><h1>{h1}</h1></div></section>
<section style="padding-top:20px"><div class="wrap"><article class="prose">{content}</article></div></section>{after}'''


def article_ld(path, x, title, desc, img, kind='Article'):
    node = {'@type': kind, 'headline': title[:110], 'description': desc, 'url': DOMAIN + path, 'mainEntityOfPage': DOMAIN + path,
            'datePublished': x['date'], 'dateModified': x['modified'], 'inLanguage': 'en',
            'author': {'@id': DOMAIN + '/#plooshi'}, 'publisher': {'@id': DOMAIN + '/#plooshi'}}
    if img: node['image'] = DOMAIN + img
    return {'@context': 'https://schema.org', '@graph': [ORG, node]}


# ---- printable detail pages (/printable/<slug>/)
def build_printable_pages():
    by = {x['slug']: x for t, x in WP if t == 'pages' and x.get('parent') == PRINT_PARENT}
    for i, p in enumerate(PRINTS):
        x = by.get(p['s'])
        body_html = clean(x['content']['rendered']) if x else ''
        body_html = re.sub(r'<div class="wp-block-buttons.*?</div>\s*</div>', '', body_html, count=1, flags=re.S)
        title, desc = meta(x) if x else (f"{p['t']} Coloring Page • Plooshi", '')
        desc = desc or f"Free printable {p['t']} coloring page for kids. Download the PDF and print at home or in the classroom."
        others = [q for q in PRINTS if q is not p and set(q['c']) & set(p['c'])][:4]
        nxt, prv = PRINTS[(i + 1) % len(PRINTS)], PRINTS[i - 1]
        big = p['img'].replace('-768x593', '-1024x791')
        big = big if exists(os.path.join(SITE, 'wp-content', 'uploads', big)) else p['img']
        content = f'''<div class="print-hero"><img src="{UP}{big}" alt="Free printable {esc(p['t'])} coloring page for kids" width="1024" height="791" fetchpriority="high">
<div><p class="badges">{''.join(f'<span class="badge">{c}</span> ' for c in p['c'])}</p>
<a class="btn" data-dl href="{UP}{p['pdf']}" target="_blank" rel="noopener">🖨️ Print the PDF</a>
<p class="small">Free for home &amp; classroom use. Prints on letter or A4 paper.</p>
<p class="pn"><a href="/printable/{prv['s']}/">← {esc(prv['t'])}</a> · <a href="/printable/{nxt['s']}/">{esc(nxt['t'])} →</a></p></div></div>
{body_html}'''
        after = f'''<section class="bg-sun"><div class="wrap"><div class="sec-head"><h2>More like this 🖍️</h2></div><div class="pgrid">{''.join(pcard(q) for q in others)}</div></div></section>'''
        ld = article_ld(f"/printable/{p['s']}/", x or {'date': TODAY, 'modified': TODAY}, f"{p['t']} Coloring Page", desc, UP + big, 'CreativeWork')
        ld['@graph'][1].update({'isAccessibleForFree': True, 'learningResourceType': 'Coloring page',
                                'encoding': {'@type': 'MediaObject', 'contentUrl': UP_ABS + p['pdf'], 'encodingFormat': 'application/pdf'}})
        ld['@graph'].append(crumbs(('Home', '/'), ('Printables', '/printable/'), (p['t'], f"/printable/{p['s']}/")))
        page(f"/printable/{p['s']}/", title, desc,
             article_shell('<a href="/printable/">Printables</a> › ' + esc(p['t']), f"Free {esc(p['t'])} Coloring Page", content, after),
             '/printable/', ld, og_img=UP_ABS + big, og_type='article')


# ---- song lyric pages (/song/<slug>/)
def norm(t):
    t = re.sub(r'[^a-z0-9 ]', '', U(t).lower().replace('rosy', 'rosie'))
    return re.sub(r'\b(the|song|a)\b', '', t).split()


def match_video(title):
    best, score = None, 0
    for v in VIDEOS:
        r = difflib.SequenceMatcher(None, ' '.join(norm(title)), ' '.join(norm(v['t']))).ratio()
        if r > score: best, score = v, r
    return best if score >= .8 else None


SONGS = []


def build_song_pages():
    seen = set()
    for t, x in WP:
        if t != 'posts': continue
        name = U(x['title']['rendered'])
        c = x['content']['rendered']
        m = re.search(r'<h2>\s*Lyrics\s*</h2>(.*)$', c, re.S)
        lyrics = clean(m.group(1)) if m else ''
        v = match_video(name)
        SONGS.append(dict(s=x['slug'], t=name, v=v, dup=name in seen)); seen.add(name)
        title, desc = meta(x)
        desc = desc or f'Sing along to {name} with Plooshi! Full lyrics for kids.'
        player = ''
        if v:
            player = (f'<button class="vthumb song-player" data-id="{v["id"]}" aria-label="Play {esc(name)}">'
                      f'<img src="https://i.ytimg.com/vi/{v["id"]}/hqdefault.jpg" alt="{esc(name)} – Plooshi video" width="480" height="360"><span class="play"></span></button>')
        yt = 'https://www.youtube.com/watch?v=' + v['id'] if v else YOUTUBE
        listen = (f'<p class="platforms" style="margin:18px 0 28px"><a class="btn sm" href="{yt}" target="_blank" rel="noopener">▶ Watch on YouTube</a> '
                  f'<a class="btn sm blue" href="{SPOTIFY}" target="_blank" rel="noopener">🎧 Listen on Spotify</a></p>')
        content = f'{player}{listen}<h2>🎤 {esc(name)} Lyrics</h2><div class="lyrics">{lyrics or "<p>Lyrics coming soon!</p>"}</div>'
        ld = {'@context': 'https://schema.org', '@graph': [ORG,
              {'@type': 'MusicComposition', 'name': name, 'url': f'{DOMAIN}/song/{x["slug"]}/', 'description': desc,
               'lyrics': {'@type': 'CreativeWork', 'text': re.sub(r'\n+', '\n', re.sub(r'<[^>]+>', '\n', lyrics)).strip()[:5000]},
               'recordedAs': {'@type': 'MusicRecording', 'name': name, 'byArtist': {'@id': DOMAIN + '/#plooshi'}}},
              crumbs(('Home', '/'), ('Songs', '/songs/'), (name, f'/song/{x["slug"]}/'))]}
        if v:
            ld['@graph'].append({'@type': 'VideoObject', 'name': f"{v['t']} | {v['d']}", 'description': desc,
                                 'thumbnailUrl': f"https://i.ytimg.com/vi/{v['id']}/hqdefault.jpg",
                                 'embedUrl': f"https://www.youtube.com/embed/{v['id']}", 'uploadDate': v.get('date') or x['date']})
        og = f"https://i.ytimg.com/vi/{v['id']}/hqdefault.jpg" if v else UP_ABS + '2024/01/Plooshi-1.jpg'
        page(f'/song/{x["slug"]}/', title, desc,
             article_shell('<a href="/songs/">Songs</a> › ' + esc(name), f'{esc(name)} 🎵', content, related_block(name + ' ' + x['slug'])),
             '/songs/', ld, og_img=og, og_type='article')


# ---- articles: fact pages, how-tos, legal (/<slug>/)
LEARN_CATS = [('Animal Facts', '🦁', r'alligator|fox|bat|bee|cat|cheetah|dog|dolphin|frog|giraffe|shark|jaguar|jellyfish|kangaroo|koala|ladybug|lion|monkey|owl|panda|polar|sloth|tiger|turkey|turtle|whale|wolf|zebra|dinosaur|animal'),
              ('Space', '🚀', r'moon|mars|neptune|saturn|space|earth'),
              ('Weather & Nature', '🌋', r'ocean|rainforest|hurricane|tornado|volcano-facts|antarctica'),
              ('Places', '🗺️', r'australia|florida|grand-canyon|hawaii|mexico|statue|texas'),
              ('Make & Do', '✂️', r'how-to|superhero|skidamarink'),
              ('More Fun Facts', '⭐', r'.')]
LEGAL = {'privacy-policy-2', 'terms-of-service'}
ARTICLES = []


def build_articles():
    for t, x in WP:
        if t != 'pages' or x.get('parent') == PRINT_PARENT or x['slug'] in SKIP: continue
        path = '/' + x['slug'] + '/'
        name = U(x['title']['rendered'])
        title, desc = meta(x)
        img = feat(x)
        content = clean(x['content']['rendered'])
        legal = x['slug'] in LEGAL
        if not legal:
            cat = next(c for c in LEARN_CATS if re.search(c[2], x['slug']))
            ARTICLES.append(dict(p=path, t=name, img=img, c=cat[0], d=desc))
            if img: content = f'<img class="lead-img" src="{img}" alt="{esc(name)}" width="768" height="432">' + content
        crumb = esc(name) if legal else '<a href="/learn/">Learn</a> › ' + esc(name)
        page(path, title, desc or name, article_shell(crumb, esc(name), content, '' if legal else related_block(x['slug'])),
             '/learn/', article_ld(path, x, name, desc, img), og_img=DOMAIN + img if img else UP_ABS + '2024/01/Plooshi-1.jpg', og_type='article')


def learn_thumb(a, i):
    if a['img']:
        return f'<img src="{a["img"]}" alt="" width="768" height="432" loading="lazy">'
    words = a['p'].strip('/').replace('-', ' ')
    hit = next((p for p in PRINTS if re.search(r'\b' + re.escape(p['t'].lower()) + r's?\b', words)), None)
    if hit:  # no featured image on WordPress, so borrow the matching coloring page
        return f'<img src="{UP}{hit["img"]}" alt="" width="768" height="593" loading="lazy" style="object-fit:contain;background:#fff">'
    emoji = next(e for c, e, _ in LEARN_CATS if c == a['c'])
    return f'<span class="tile t{i % 4}" aria-hidden="true">{emoji}</span>'


def build_learn():
    cards = ''.join(f'''<article class="card" data-cats="{esc(a['c'])}" data-name="{esc(a['t'].lower())}"><a class="card-link" href="{a['p']}">
<div class="vthumb">{learn_thumb(a, i)}</div>
<div class="body"><span class="badge">{esc(a['c'])}</span><h3>{esc(a['t'])}</h3></div></a></article>''' for i, a in enumerate(ARTICLES))
    body = f'''<section class="phero">{CLOUDS}<div class="wrap" style="position:relative;z-index:2"><p class="crumbs"><a href="/">Home</a> › Learn</p>
<h1>Fun Facts &amp; Activities 🔭</h1><p>Animal facts, space facts, amazing places and easy at-home crafts — written for curious kids.</p></div></section>
<section style="padding-top:30px"><div class="wrap">
<div class="chips" data-filter-group="#agrid" data-search="#asearch" data-counter="#acount" data-empty="#aempty">{chips([(c, e) for c, e, _ in LEARN_CATS])}</div>
<div class="searchbar"><label class="sr" for="asearch">Search articles</label><input id="asearch" type="search" placeholder="🔍 Search facts… (shark, moon, volcano)"></div>
<p class="count-line" id="acount" aria-live="polite"></p>
<div class="grid" id="agrid">{cards}</div><p class="empty" id="aempty" hidden>Nothing found — try another word! 🙈</p></div></section>'''
    ld = {'@context': 'https://schema.org', '@graph': [ORG, {'@type': 'CollectionPage', 'url': DOMAIN + '/learn/', 'name': 'Fun Facts & Activities for Kids',
          'mainEntity': {'@type': 'ItemList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'url': DOMAIN + a['p'], 'name': a['t']} for i, a in enumerate(ARTICLES)]}},
          crumbs(('Home', '/'), ('Learn', '/learn/'))]}
    page('/learn/', 'Fun Facts for Kids: Animals, Space, Places & Crafts | Plooshi',
         f'{len(ARTICLES)} kid-friendly articles from Plooshi: animal facts, space facts, weather, amazing places and easy crafts to make at home.', body, '/learn/', ld)


def songs_lyrics_index():
    """Inject the lyrics list into /songs/ (built earlier)."""
    items = ''.join(f'<li><a href="/song/{s["s"]}/">{esc(s["t"])}</a>{" 🎬" if s["v"] else ""}</li>'
                    for s in sorted(SONGS, key=lambda s: s['t']) if not s['dup'])
    block = f'''<section id="lyrics"><div class="wrap"><div class="sec-head"><span class="tag">Sing along</span><h2>Song lyrics 📝</h2><p>Words to all our favorite songs and nursery rhymes. 🎬 = has a video.</p></div>
<ul class="lyric-list">{items}</ul></div></section>'''
    f = os.path.join(SITE, 'songs', 'index.html')
    h = open(f, encoding='utf8').read().replace('</main>', block + '\n</main>', 1)
    open(f, 'w', encoding='utf8').write(h)


# ---- hand-built grown-up pages
def contact_form(name, subject):
    return f'''{form_open(name, 'cform')}<input type="hidden" name="subject" value="{subject}">
<label>Your name<input name="name" required autocomplete="name"></label>
<label>Email<input type="email" name="email" required autocomplete="email"></label>
<label>Message<textarea name="message" rows="6" required></textarea></label>
<button class="btn" type="submit">Send message 💌</button></form>'''


def simple_page(path, title, desc, h1, content):
    page(path, title, desc, article_shell(esc(h1), esc(h1), content), '',
         {'@context': 'https://schema.org', '@graph': [ORG, crumbs(('Home', '/'), (h1, path))]})


def build_info_pages():
    wp = {x['slug']: x for t, x in WP}
    mail = '<a href="mailto:info@plooshi.com">info@plooshi.com</a>'
    about = clean(wp['about']['content']['rendered']).replace('info @ plooshi.com', mail)
    simple_page('/about/', 'About Plooshi • Kids Music That Makes Learning Fun', meta(wp['about'])[1], 'About Plooshi',
                f'<div class="about-mascot">{mascot(label="Plooshi")}</div>{about}<p><a class="btn" href="/songs/">▶ Meet us in our songs</a></p>')
    simple_page('/contact/', 'Contact Plooshi', 'Get in touch with Plooshi — questions, feedback, song requests and collaborations.', 'Contact Us',
                f"<p>Have a question, a song request or just want to say hi? We'd love to hear from you! You can also email {mail}.</p>{contact_form('contact', 'Contact')}")
    lic = clean(wp['licensing']['content']['rendered'])
    simple_page('/licensing/', 'Music Licensing & Partnerships • Plooshi', meta(wp['licensing'])[1] or 'Licensing, brand and advertising opportunities with Plooshi.',
                'Licensing & Partnerships', f'{lic}{contact_form("licensing", "Licensing")}')
    faqs = FAQ + [('Where can I stream Plooshi?', 'Plooshi is on all major platforms including Spotify, Apple Music, YouTube, Deezer, Tidal and more.')]
    body = ''.join(f'<details class="qa"><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q, a in faqs)
    page('/faqs/', 'FAQs • Plooshi', 'Answers to common questions about Plooshi songs, printables and games.', article_shell('FAQs', 'Questions &amp; Answers', body), '',
         {'@context': 'https://schema.org', '@graph': [ORG, {'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in faqs]},
                                                       crumbs(('Home', '/'), ('FAQs', '/faqs/'))]})
    page('/thanks/', 'Thank you! • Plooshi', 'Thanks for getting in touch with Plooshi.', article_shell('Thanks', 'Thank you! 💙',
         f'<div class="about-mascot mascot-stage"><div class="bubble" aria-live="polite"></div>{mascot(label="Plooshi says thanks. Tap me!")}</div>'
         '<p style="text-align:center">We got your message. Tap Plooshi for a happy dance, then <a href="/">head home</a>!</p>'), '', {}, noindex=True)


def build_404():
    page('/404/', 'Oops! Page not found • Plooshi', 'This page wandered off.', f'''<section class="phero" style="padding:40px 0 80px">{CLOUDS}<div class="wrap" style="position:relative;z-index:2">
<div class="mascot-stage" style="min-height:300px"><div class="bubble" aria-live="polite"></div>{mascot(label="Plooshi is lost too. Tap me!")}</div>
<h1>Uh-oh! This page is playing hide &amp; seek 🙈</h1><p>Let's find something fun instead:</p>
<p style="margin-top:20px"><a class="btn" href="/">🏠 Home</a> <a class="btn sun" href="/printable/">🖍️ Coloring</a> <a class="btn blue" href="/songs/">▶ Songs</a></p></div></section>''', '', {}, noindex=True)
    os.replace(os.path.join(SITE, '404', 'index.html'), os.path.join(SITE, '404.html'))
    os.rmdir(os.path.join(SITE, '404'))


# ---------------------------------------------------------------- hosting files
def build_hosting():
    # Netlify + Cloudflare Pages read _redirects; GitHub Pages ignores it, so each old URL also gets a tiny redirect page.
    lines = ['# Old WordPress URLs -> new pages (Netlify & Cloudflare Pages)']
    for old, new in REDIRECTS.items():
        lines.append(f'{old}  {new}  301')
        d = os.path.join(SITE, old.strip('/'))
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'index.html'), 'w', encoding='utf8').write(
            f'<!doctype html><meta charset="utf-8"><title>Moved</title><link rel="canonical" href="{DOMAIN}{new}">'
            f'<meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url={new}"><a href="{new}">Continue</a>\n')
    open(os.path.join(SITE, '_redirects'), 'w').write('\n'.join(lines) + '\n')
    open(os.path.join(SITE, '_headers'), 'w').write('''/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/css/*
  Cache-Control: public, max-age=604800
/js/*
  Cache-Control: public, max-age=604800
/assets/*
  Cache-Control: public, max-age=604800
/wp-content/*
  Cache-Control: public, max-age=31536000, immutable
''')
    open(os.path.join(SITE, 'CNAME'), 'w').write('plooshi.com\n')      # GitHub Pages custom domain
    open(os.path.join(SITE, '.nojekyll'), 'w').write('')                # serve files as-is on GitHub Pages
    top = ('/', '/songs/', '/printable/', '/play/', '/learn/')
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
    for u, img in PAGES:
        pr = '1.0' if u == '/' else '0.9' if u in top else '0.6'
        im = f'<image:image><image:loc>{esc(img)}</image:loc></image:image>' if img and 'Plooshi-1.jpg' not in img else ''
        sm += f'<url><loc>{DOMAIN}{u}</loc><lastmod>{TODAY}</lastmod><priority>{pr}</priority>{im}</url>\n'
    open(os.path.join(SITE, 'sitemap.xml'), 'w', encoding='utf8').write(sm + '</urlset>\n')
    open(os.path.join(SITE, 'robots.txt'), 'w').write(f'User-agent: *\nAllow: /\n\nSitemap: {DOMAIN}/sitemap.xml\n')
    json.dump({'name': 'Plooshi', 'short_name': 'Plooshi', 'start_url': '/', 'display': 'standalone', 'background_color': '#fffaf0', 'theme_color': '#5ec8f2',
               'icons': [{'src': UP + '2024/01/cropped-19fcebfc-ca65-498c-a9bf-1fc67c1f8320-192x192.webp', 'sizes': '192x192', 'type': 'image/webp'}]},
              open(os.path.join(SITE, 'site.webmanifest'), 'w'), indent=1)


def apply_base():
    """When serving from a sub-folder, prefix every root link with BASE and keep the test copy out of search results."""
    if not BASE: return
    # Git Bash on Windows can silently turn "/plooshi-site" into "C:/Program Files/Git/plooshi-site"
    if not re.fullmatch(r'(/[A-Za-z0-9._-]+)+', BASE):
        raise SystemExit(f'BASE_PATH must look like /plooshi-site, got {BASE!r}')
    import glob
    for f in glob.glob(os.path.join(SITE, '**', '*.html'), recursive=True):
        h = open(f, encoding='utf8').read()
        h = re.sub(r'((?:href|src|action)=")/(?!/)', r'\g<1>' + BASE + '/', h)
        h = h.replace('url=/', 'url=' + BASE + '/')
        h = re.sub(r'<meta name="robots" content="[^"]*">', '<meta name="robots" content="noindex,nofollow">', h)
        open(f, 'w', encoding='utf8').write(h)
    open(os.path.join(SITE, 'robots.txt'), 'w').write('User-agent: *\nDisallow: /\n')


if __name__ == '__main__':
    build_home(); build_songs(); build_printables(); build_play()
    build_printable_pages(); build_song_pages(); songs_lyrics_index()
    build_articles(); build_learn(); build_info_pages(); build_404(); build_hosting()
    apply_base()
    print('Built', len(PAGES), 'pages into', SITE)
