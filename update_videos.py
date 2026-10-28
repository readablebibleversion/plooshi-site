"""Adds new uploads from the Plooshi YouTube channel to data/content.json.

Run:  python update_videos.py   (then python build.py)
Video titles are expected in the channel's usual "Name 🎵 | Description | Plooshi" format.
"""
import html, json, os, re, urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, 'data', 'content.json')
FEED = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCeiTTCpxch5Yi324G5w96OA'


def category(name, desc):
    s = (name + ' ' + desc).lower()
    if 'lullaby' in s: return 'Lullabies'
    if re.search('teeth|bath|hand|germ|potty', s): return 'Everyday'
    if re.search('learn|shapes|abc|count|alphabet|number|color', s): return 'Learning'
    if re.search('dance|action|sport|construction|fruit|game', s): return 'Dance & Play'
    return 'Sing-Along'


def parse(title):
    parts = [p.strip() for p in title.split('|')]
    m = re.match(r"^(.*?)\s*([^\w\s'()\-].*)?$", parts[0])
    name, emoji = m.group(1).strip(), (m.group(2) or '').strip()
    desc = parts[1] if len(parts) > 2 else ''
    return name, emoji, desc


data = json.load(open(DATA, encoding='utf8'))
known = {v['id'] for v in data['v']}
xml = urllib.request.urlopen(urllib.request.Request(FEED, headers={'User-Agent': 'Mozilla/5.0'}), timeout=30).read().decode('utf8')
new = []
for vid, title, published in re.findall(r'<yt:videoId>([^<]+)</yt:videoId>.*?<title>([^<]+)</title>.*?<published>([^<]+)</published>', xml, re.S):
    if vid in known: continue
    name, emoji, desc = parse(html.unescape(title))
    new.append(dict(id=vid, t=name, e=emoji, d=desc, c=category(name, desc), date=published))

data['v'] = new + data['v']          # newest first; the newest one becomes the home-page feature


def watch_details(vid):
    """Description, length and upload date from the public watch page (used on each song's own page)."""
    req = urllib.request.Request(f'https://www.youtube.com/watch?v={vid}', headers={'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US,en'})
    h = urllib.request.urlopen(req, timeout=30).read().decode('utf8', 'replace')
    m = re.search(r'var ytInitialPlayerResponse = (\{.*?\});(?:var|</script>)', h, re.S)
    if not m: return {}
    vd = json.loads(m.group(1)).get('videoDetails', {})
    mf = json.loads(m.group(1)).get('microformat', {}).get('playerMicroformatRenderer', {})
    return {'desc': vd.get('shortDescription', ''), 'secs': int(vd.get('lengthSeconds') or 0),
            'date': mf.get('publishDate') or mf.get('uploadDate')}


filled = 0
for v in data['v']:
    if 'desc' in v: continue
    try:
        det = watch_details(v['id'])
    except Exception as e:
        print('  ! could not read', v['id'], e); continue
    v['desc'], v['secs'] = det.get('desc', ''), det.get('secs', 0)
    if not v.get('date') and det.get('date'): v['date'] = det['date']
    filled += 1

json.dump(data, open(DATA, 'w', encoding='utf8'), ensure_ascii=False)
print(f'Added {len(new)} new video(s), filled details for {filled}.' + ''.join(f'\n  + {v["t"]} ({v["c"]})' for v in new))
