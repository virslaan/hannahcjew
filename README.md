# hannahcjew.com · Hannah Jew 周健倫

Portfolio website for Hannah Jew 周健倫, a dancer, choreographer, and educator based in New York City.

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

- `assets/img/` contains all photos (compressed for web, max 2200px)
- `assets/resume/Hannah-Jew-Resume.pdf` is the downloadable resume
- `assets/css/style.css` is the whole design system, including all five themes
- `assets/js/config.js` is the control panel: default theme + Instagram feed settings
- `assets/js/main.js` handles the menu, gallery filters, lightbox, scroll animations, theme switching, and the Instagram feed
- `favicon-512.png`, `favicon-32.png`, and `apple-touch-icon.png` are the dancer site icon

## Themes

The site ships with five looks, switchable from the dropdown in the navigation:

| Theme | Feel |
|---|---|
| Seal | Paper white, ink black, vermillion red (the original) |
| Noir | Black stage with a red spotlight |
| Porcelain | Gallery white with cobalt blue |
| Crimson | Deep red curtain with warm cream text |
| Jade | Soft celadon with deep jade green |

Switching themes plays a circular sweep animation out of the dropdown (modern browsers) or a smooth crossfade (older ones). Visitor choices are remembered per device.

To lock the whole site to one theme, open `assets/js/config.js` and change `theme: "auto"` to e.g. `theme: "noir"`. The dropdown hides itself automatically. You can also preview any theme by adding `?theme=jade` (or any theme name) to a page URL.

## Instagram feed

The home page has a "Latest from Instagram" section controlled by `assets/js/config.js`:

- Paste up to 8 post URLs into `instagram.posts` and they render as official Instagram embeds.
- With no posts listed, the site tries the profile grid embed and otherwise shows a follow card.
- Update `instagram.username` if the handle changes.

## Hosting

The site is deployed with GitHub Pages from the `main` branch (root folder). Every push to `main` redeploys the site automatically within a minute or so.

### Connecting the custom domain later

When ready to point `hannahcjew.com` at the site:

1. On GitHub: **Settings > Pages > Custom domain**, enter `hannahcjew.com`. GitHub will create a `CNAME` file in the repo.
2. At the domain registrar, add these DNS records:
   - `A` records for `hannahcjew.com` pointing to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` record for `www` pointing to `YOUR_USERNAME.github.io`
3. Back on GitHub Pages settings, check **Enforce HTTPS** once the DNS propagates.

## Common edits (no coding experience needed)

All of these can be done in the GitHub web UI (press `.` in the repo to open the web editor) or with the GitHub CLI.

### Add a portfolio photo

1. Upload the image to `assets/img/` (GitHub > Add file > Upload files).
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
gh repo clone YOUR_USERNAME/hannahcjew
cd hannahcjew

# ...edit files / drop new photos into assets/img/ ...

git add -A
git commit -m "Add new show / photos"
git push
```

## Sending large photo files

Email attachments cap out quickly. Good options for sending originals: a shared Google Drive or Dropbox folder, or [WeTransfer](https://wetransfer.com) (free, up to 2GB per send, no account needed).

## Design notes

- **Palette**: warm paper white `#f6f4f0`, ink black `#0d0d0d`, and a single accent: vermillion `#d7281c`, the red of a Chinese seal stamp (印泥). The 周健倫 seal in the corner of the site is a nod toward a future logo.
- **Type**: Bodoni Moda (high-contrast fashion serif, the Vogue look) for display, Space Grotesk for UI, Noto Serif TC for Chinese characters.
- **Motion**: letter-by-letter hero reveal, scroll parallax on the hero photo, circular theme-switch sweep, and a living background per theme (noir has a cursor-tracked stage spotlight; porcelain and jade drift; crimson has a curtain sheen).
- **Local preview**: from this folder run `python3 -m http.server 8080` and open `http://localhost:8080`.
