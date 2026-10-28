# Plooshi.com — static site

The finished website is in **`site/`**. It's plain HTML, CSS and JavaScript with no build step and no server, so it runs on any static host. All media (coloring pages, PDFs, article images) is in `site/wp-content/uploads/`, so the site doesn't need WordPress anymore. Every old WordPress URL still works.

```
site/               ← deploy this folder
data/content.json   ← printables + YouTube videos (edit to add things)
data/wordpress.json ← archive of the articles, lyrics and printable text from WordPress
build.py            ← regenerates site/ from data/
update_videos.py    ← pulls new YouTube uploads into data/content.json
check_links.py      ← checks that no links or images are broken
```

---

## Deploy — pick one

All three are free for a site this size (~100 MB, ~220 pages).

### Option A: Netlify

**Fastest:** go to <https://app.netlify.com/drop> and drag the `site` folder onto the page. Done.

**With Git (auto-deploys on every push):** push this folder to a GitHub repo → Netlify → *Add new site → Import from Git* → pick the repo. `netlify.toml` already tells Netlify to publish `site/` with no build command.

Then: *Domain management → Add domain → plooshi.com*, and follow the DNS instructions.

### Option B: Cloudflare Pages

Cloudflare dashboard → *Workers & Pages → Create → Pages*:
- **Upload assets:** drag in the `site` folder, **or**
- **Connect to Git:** pick the repo, set **Framework preset: None**, **Build command:** *(leave empty)*, **Build output directory:** `site`.

Then *Custom domains → Set up a domain → plooshi.com*. This is easy if your DNS is already on Cloudflare.

Redirects (`site/_redirects`) and security/caching headers (`site/_headers`) work automatically.

### Option C: GitHub Pages

1. Push this folder to a GitHub repo (branch `main`).
2. Repo → *Settings → Pages → Build and deployment → Source: **GitHub Actions***.
3. Publish with the included workflow: *Actions → Deploy to GitHub Pages → Run workflow*. It only runs when started by hand. To deploy on every push instead, see the comment at the top of `.github/workflows/pages.yml`.
   - **plooshi.com** (default, `base_path` empty): the live site.
   - **Test address** (`base_path` = `/plooshi-site`, only without a custom domain): the site appears at `https://<username>.github.io/plooshi-site/` and is hidden from search engines.
   - To build the subfolder version yourself: `BASE_PATH=/plooshi-site python build.py`. Run plain `python build.py` again before committing, so `site/` stays the plooshi.com version.
   Pages on a private repo needs GitHub Pro or Team; on a free plan, make the repo public or use Netlify / Cloudflare instead.
4. *Settings → Pages → Custom domain:* `plooshi.com` (the `site/CNAME` file is already set), then tick **Enforce HTTPS** once the certificate is ready.

Notes for GitHub Pages:
- It ignores `_redirects` and `_headers`. That's fine: every old URL (e.g. `/discography/`) also has a small redirect page, so links still land in the right place.
- Repos are limited to 1 GB and files to 100 MB, well above what this site needs.
- The site has no forms; the contact and licensing pages link to info@plooshi.com.

### Pointing plooshi.com at the new host

- **Before switching,** test the new site on its free preview URL (`*.netlify.app`, `*.pages.dev` or `*.github.io`).
- Your current WordPress site looks like it's hosted on SiteGround. Change DNS at your domain registrar the way your new host tells you to. Keep the WordPress site running until the new one is live and checked.
- After switching, submit `https://plooshi.com/sitemap.xml` in [Google Search Console](https://search.google.com/search-console).

---

## Updating the site

Requires Python 3 (`python --version`).

**New YouTube video:**
```
python update_videos.py
python build.py
```
The newest video becomes the featured one on the home page. Redeploy afterwards (with Git, just commit and push).

**New printable:**
1. Put the image (`Name-768x593.jpg`) and PDF into `site/wp-content/uploads/2024/01/` (or any folder under `uploads/`).
2. Add an entry to the `"p"` list in `data/content.json`:
   ```json
   {"s": "robot-coloring-page", "t": "Robot", "img": "2024/01/Robot-768x593.jpg", "pdf": "2024/01/Robot.pdf", "c": ["Fantasy"]}
   ```
   Categories: Animals, Dinosaurs, Vehicles, Holidays, Food, Fantasy, Sports, Nature.
3. Run `python build.py`, then `python check_links.py`.

**Text on the home, songs, printables and play pages:** edit `build.py` (search for the wording), rebuild.

**Look and feel:** `site/css/style.css` (colors are at the top). **Interactivity:** `site/js/main.js` and `site/js/games.js`. These are edited directly, not generated.

> ⚠️ `build.py` regenerates every `.html` file in `site/`. Make page changes in `build.py`, not in the generated HTML, or they'll be overwritten on the next build.

## Preview locally
```
python -m http.server 8765 -d site
```
Then open <http://localhost:8765>. If this project lives in a very deeply nested Windows folder, some images may not show locally (Windows' 260-character path limit). This doesn't affect the live site.
