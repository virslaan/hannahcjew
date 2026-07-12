# hannahcjew.com — Hannah Jew 周健倫

Portfolio website for Hannah Jew 周健倫 — dancer, choreographer, and educator based in New York City.

Built as a plain static site (HTML + CSS + vanilla JS, no build step) so it's free to host on GitHub Pages and easy to edit directly on GitHub.

## Site map

| Page | File | What's on it |
|---|---|---|
| Home | `index.html` | Full-screen hero photo, bilingual name, category cards, next-show banner |
| About | `about.html` | Bio, highlights, movement languages |
| Headshots & Resume | `headshots.html` | Resume PDF (view + download), headshot gallery |
| Portfolio | `portfolio.html` | Filterable gallery: Performer / Choreographer / Educator / Photoshoots |
| Upcoming | `upcoming.html` | Performance announcements with ticket links |
| Contact | `contact.html` | Email, agency, socials |

Shared assets live in `assets/`:

- `assets/img/` — all photos (compressed for web, max 2200px)
- `assets/resume/Hannah-Jew-Resume.pdf` — the downloadable resume
- `assets/css/style.css` — the whole design system
- `assets/js/main.js` — menu, gallery filters, lightbox, scroll animations

## How to publish on GitHub Pages

1. Create a repo (e.g. `hannahcjew.com`) and push this folder:

   ```bash
   git remote add origin git@github.com:YOUR_USERNAME/hannahcjew.com.git
   git push -u origin main
   ```

2. On GitHub: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`**.
3. Point the domain: in **Settings → Pages → Custom domain**, enter `hannahcjew.com` (the `CNAME` file in this repo already handles the repo side).
4. At the domain registrar, add these DNS records:
   - `A` records for `hannahcjew.com` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` record for `www` → `YOUR_USERNAME.github.io`
5. Back on GitHub Pages settings, check **Enforce HTTPS** once the DNS propagates.

## Common edits (no coding experience needed)

All of these can be done in the GitHub web UI (press `.` in the repo to open the web editor) or with the GitHub CLI.

### Add a portfolio photo

1. Upload the image to `assets/img/` (GitHub → Add file → Upload files).
2. Open `portfolio.html`, find the `HOW TO ADD A NEW PORTFOLIO IMAGE` comment, copy one `<figure>` block, and update the category, title, photographer credit, and file name.

### Add or update a show

Open `upcoming.html`, find the `HOW TO ADD A SHOW` comment, copy the `<article class="show">` block, and edit the date, title, role, venue, and ticket link.

### Replace the resume

Upload the new PDF to `assets/resume/` with the exact name `Hannah-Jew-Resume.pdf` (overwriting the old one). Every download link on the site updates automatically.

### Swap the home page hero photo

Replace `assets/img/hero-tutu-bw.jpg` with a new image using the same file name, or change the `src` in the `hero__img` section of `index.html`.

### Using the GitHub CLI

```bash
# grab the repo
gh repo clone YOUR_USERNAME/hannahcjew.com
cd hannahcjew.com

# ...edit files / drop new photos into assets/img/ ...

git add -A
git commit -m "Add new show / photos"
git push
```

The site redeploys automatically within a minute of pushing.

## Sending large photo files

Email attachments cap out quickly. Good options for sending originals: a shared Google Drive or Dropbox folder, or [WeTransfer](https://wetransfer.com) (free, up to 2GB per send, no account needed).

## Design notes

- **Palette** — warm paper white `#f6f4f0`, ink black `#0d0d0d`, and a single accent: vermillion `#d7281c`, the red of a Chinese seal stamp (印泥). The 周健倫 seal in the corner of the site is a nod toward a future logo.
- **Type** — Fraunces (editorial serif) for display, Space Grotesk for UI, Noto Serif TC for Chinese characters.
- **Local preview** — from this folder run `python3 -m http.server 8080` and open `http://localhost:8080`.
