"""Checks that every internal link and image in ./site points at a real file.

Run:  python check_links.py
"""
import collections, glob, os, re

SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'site')


def exists(p):
    p = os.path.normpath(p)
    return os.path.isfile('\\\\?\\' + p if os.name == 'nt' else p)


bad = collections.Counter()
pages = glob.glob(os.path.join(SITE, '**', '*.html'), recursive=True)
for f in pages:
    for u in re.findall(r'(?:href|src)="(/[^"#?]*)', open(f, encoding='utf8').read()):
        if not (exists(SITE + u) or exists(os.path.join(SITE + u, 'index.html'))):
            bad[u] += 1
print(f'{len(pages)} pages checked, {len(bad)} broken targets')
for u, n in bad.most_common(20):
    print(f'  {n:4}  {u}')
raise SystemExit(1 if bad else 0)
