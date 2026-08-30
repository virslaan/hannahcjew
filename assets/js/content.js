/* ============================================================
   CONTENT · every page is drawn from assets/data/site.json
   (plus any unsaved edits Hannah has made on her device).

   Each editable thing carries a data-edit path like
   "about.paragraphs.2" so the Studio can let her click it on
   the real page and type. Empty values simply render nothing,
   so the live site never shows a placeholder.
   ============================================================ */
(function () {
  const DRAFT_KEY = "hj-site-draft";
  const LEGACY_PORTFOLIO_KEY = "hj-portfolio-draft";

  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  // ----- rich text ------------------------------------------------------
  // Studio lets Hannah bold, italicise, underline, recolour and restyle her
  // words, so the saved copy can carry a little markup. Only this short list
  // of tags and style properties survives; everything else is flattened back
  // to plain text, which keeps a stray paste from breaking the page.
  const RICH_TAGS = { B: 1, STRONG: 1, I: 1, EM: 1, U: 1, BR: 1, SPAN: 1 };
  const RICH_STYLE = ["color", "font-family", "font-weight", "font-style", "text-decoration"];
  // Browsers wrap new lines in DIV/P inside a contenteditable box; those turn
  // back into the line breaks Hannah actually typed.
  const BLOCK_TAGS = { DIV: 1, P: 1 };
  const SAFE_STYLE_VALUE = /^[\w\s,'"#().%-]+$/;

  function richNode(node) {
    let out = "";
    node.childNodes.forEach((n) => {
      if (n.nodeType === 3) {
        out += esc(n.nodeValue);
        return;
      }
      if (n.nodeType !== 1) return;
      const tag = n.tagName;
      if (tag === "BR") {
        out += "<br>";
        return;
      }
      if (BLOCK_TAGS[tag]) {
        const inner = richNode(n);
        out += (out && !/<br>$/.test(out) ? "<br>" : "") + inner;
        return;
      }
      // Anything not on the list keeps its words but loses its markup.
      if (!RICH_TAGS[tag]) {
        out += richNode(n);
        return;
      }
      let attr = "";
      if (tag === "SPAN") {
        const styles = [];
        RICH_STYLE.forEach((prop) => {
          const v = n.style.getPropertyValue(prop);
          if (v && SAFE_STYLE_VALUE.test(v)) styles.push(prop + ":" + v);
        });
        if (!styles.length) {
          out += richNode(n);
          return;
        }
        attr = ` style="${esc(styles.join(";"))}"`;
      }
      const lower = tag.toLowerCase();
      out += `<${lower}${attr}>${richNode(n)}</${lower}>`;
    });
    return out;
  }

  function parseFragment(html) {
    const doc = new DOMParser().parseFromString(`<body><div id="r">${html}</div></body>`, "text/html");
    return doc.getElementById("r");
  }

  // Sanitise a chunk of editor HTML down to the formatting we allow.
  function cleanRich(html) {
    const str = String(html ?? "");
    try {
      return richNode(parseFragment(str));
    } catch (_) {
      return esc(str);
    }
  }

  // Render a saved string as HTML. Text with no markup characters can skip
  // the parser entirely, which keeps re-rendering cheap while she types.
  function rich(s) {
    const str = String(s ?? "");
    if (!/[<&]/.test(str)) return esc(str);
    return cleanRich(str);
  }

  // Strip formatting back to words, for alt text and other attributes.
  function plain(s) {
    const str = String(s ?? "");
    if (!/[<&]/.test(str)) return str;
    try {
      return parseFragment(str.replace(/<br\s*\/?>/gi, " ")).textContent || "";
    } catch (_) {
      return str;
    }
  }

  window.HJ_rich = rich;
  window.HJ_plain = plain;
  window.HJ_cleanRich = cleanRich;

  function icon(name, size) {
    const s = size || 16;
    const box = `class="i" viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"`;
    const line = `fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;
    const map = {
      up: `<svg ${box} ${line}><path d="M12 19V5M5 12l7-7 7 7"/></svg>`,
      down: `<svg ${box} ${line}><path d="M12 5v14M19 12l-7 7-7-7"/></svg>`,
      close: `<svg ${box} ${line}><path d="M6 6l12 12M18 6L6 18"/></svg>`,
      plus: `<svg ${box} ${line}><path d="M12 5v14M5 12h14"/></svg>`,
      grip: `<svg ${box} fill="currentColor"><circle cx="9" cy="7" r="1.5"/><circle cx="15" cy="7" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="17" r="1.5"/><circle cx="15" cy="17" r="1.5"/></svg>`,
      play: `<svg ${box} fill="currentColor"><path d="M8 5.2v13.6L19.5 12 8 5.2z"/></svg>`,
      arrow: `<svg ${box} ${line}><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
      download: `<svg ${box} ${line}><path d="M12 4v12M7 12l5 5 5-5M5 20h14"/></svg>`,
      edit: `<svg ${box} ${line}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>`,
    };
    return map[name] || "";
  }
  window.HJ_icon = icon;

  // Credits are shown exactly as typed — no automatic "Photo:" prefix.
  function creditLine(credit) {
    return (credit || "").trim();
  }

  // Grab a still frame URL from a YouTube link so a fresh video tile has
  // something to show without any extra work. Returns "" for Vimeo etc.
  function youtubeThumb(url) {
    if (!url) return "";
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, "");
      let id = "";
      if (host === "youtu.be") id = u.pathname.slice(1);
      else if (host.endsWith("youtube.com")) {
        if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2];
        else if (u.pathname === "/watch") id = u.searchParams.get("v") || "";
        else if (u.pathname.startsWith("/shorts/")) id = u.pathname.split("/")[2];
      }
      if (id) return "https://img.youtube.com/vi/" + id + "/hqdefault.jpg";
    } catch (_) {}
    return "";
  }
  window.HJ_youtubeThumb = youtubeThumb;

  // A neutral placeholder for a video tile that doesn't have a cover yet.
  const VIDEO_PLACEHOLDER =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 5' preserveAspectRatio='xMidYMid slice'>" +
        "<rect width='4' height='5' fill='%23161616'/>" +
        "<text x='2' y='2.75' font-size='0.55' fill='%23888' text-anchor='middle' font-family='Helvetica,Arial,sans-serif' letter-spacing='0.06'>VIDEO</text>" +
        "</svg>"
    );
  window.HJ_VIDEO_PLACEHOLDER = VIDEO_PLACEHOLDER;

  // Older data may still carry a `videos: [...]` array attached to a photo
  // item (the previous multi-video-per-card design). Split those out into
  // their own tiles in the grid so photos and videos live side by side.
  function splitLegacyVideos(items) {
    let changed = false;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it || !Array.isArray(it.videos) || !it.videos.length) continue;
      const extras = [];
      for (const v of it.videos) {
        const url = typeof v === "string" ? v : v && v.url;
        if (!url) continue;
        const label = typeof v === "object" && v ? v.label || "" : "";
        extras.push({
          id: "v-" + Math.random().toString(36).slice(2, 8),
          video: String(url),
          src: youtubeThumb(url) || it.src || VIDEO_PLACEHOLDER,
          title: label || it.title || "Video",
          credit: "",
          notes: "",
          category: it.category,
          orient: it.orient || "portrait",
          span: it.span || 1,
          alt: (label || it.title || "Video") + " (video)",
        });
      }
      delete it.videos;
      items.splice(i + 1, 0, ...extras);
      i += extras.length;
      changed = true;
    }
    return changed;
  }
  window.HJ_splitLegacyVideos = splitLegacyVideos;

  // ----- read/write values by dotted path, e.g. "home.nextShow.title" -----
  function getPath(obj, path) {
    return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
  }

  function setPath(obj, path, value) {
    const keys = path.split(".");
    const last = keys.pop();
    let node = obj;
    keys.forEach((k) => {
      if (node[k] == null) node[k] = /^\d+$/.test(k) ? [] : {};
      node = node[k];
    });
    node[last] = value;
  }

  window.HJ_getPath = getPath;
  window.HJ_setPath = setPath;

  // text that can be clicked and typed on the page itself
  function ed(path, extra) {
    return ` data-edit="${path}"${extra ? " " + extra : ""}`;
  }

  // ----- accent colour -----
  function applyAccent(site) {
    const accent = (site.theme && site.theme.accent) || "";
    let tag = document.getElementById("hj-accent");
    if (!accent) {
      if (tag) tag.remove();
      return;
    }
    if (!tag) {
      tag = document.createElement("style");
      tag.id = "hj-accent";
      document.head.appendChild(tag);
    }
    tag.textContent = `:root, [data-theme] { --red: ${accent}; --red-deep: ${accent}; }`;
  }
  window.HJ_applyAccent = applyAccent;

  // ----- published theme -----
  function applyTheme(site) {
    const name = (site.theme && site.theme.name) || "seal";
    if (typeof window.HJ_applyTheme === "function") window.HJ_applyTheme(name);
  }

  // ----- load -----
  async function fetchSite() {
    const res = await fetch("assets/data/site.json", { cache: "no-store" });
    if (!res.ok) throw new Error("site.json missing");
    return res.json();
  }

  function readDraft() {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      if (d && typeof d === "object") return d;
    } catch (_) {}
    return null;
  }

  window.HJ_loadSite = async function () {
    const base = await fetchSite();
    const draft = readDraft();
    const site = draft ? Object.assign({}, base, draft) : base;
    if (draft) {
      site.home = Object.assign({}, base.home, draft.home || {});
      site.home.nextShow = Object.assign({}, (base.home || {}).nextShow, (draft.home || {}).nextShow || {});
      site.about = Object.assign({}, base.about, draft.about || {});
      site.resume = Object.assign({}, base.resume, draft.resume || {});
      site.contact = Object.assign({}, base.contact, draft.contact || {});
      site.theme = Object.assign({}, base.theme, draft.theme || {});
      site.headshots = draft.headshots || base.headshots;
      site.upcoming = draft.upcoming || base.upcoming;
      site.portfolio = draft.portfolio || base.portfolio;
      site.portfolioCategories = draft.portfolioCategories || base.portfolioCategories;
      site.portfolioLayout = draft.portfolioLayout || base.portfolioLayout;
      site.nav = draft.nav || base.nav;
      site.upcomingNote = draft.upcomingNote ?? base.upcomingNote;
    }
    // one-time migration from the older portfolio-only draft
    if (!draft) {
      try {
        const legacy = JSON.parse(localStorage.getItem(LEGACY_PORTFOLIO_KEY) || "null");
        if (Array.isArray(legacy) && legacy.length) site.portfolio = legacy;
      } catch (_) {}
    }
    window.HJ_SITE = site;
    return site;
  };

  window.HJ_saveSite = function (site) {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(site));
    window.HJ_SITE = site;
    hydrate(site);
  };

  window.HJ_clearSiteDraft = function () {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(LEGACY_PORTFOLIO_KEY);
  };

  window.HJ_hasDraft = function () {
    return !!localStorage.getItem(DRAFT_KEY);
  };

  // ============================================================
  //  PAGE HYDRATORS
  // ============================================================
  function hydrateHome(site) {
    const h = site.home || {};
    const ns = h.nextShow || {};

    const hero = document.querySelector("[data-home-hero]");
    if (hero) {
      if (h.heroImage) hero.src = h.heroImage;
      hero.setAttribute("data-edit-img", "home.heroImage");
    }

    const headline = document.querySelector("[data-home-headline]");
    if (headline) {
      const full = h.introHeadline || "";
      const em = (h.introHeadlineEm || "").trim();
      headline.innerHTML =
        em && full.includes(em)
          ? esc(full.split(em)[0]) + "<em>" + esc(em) + "</em>" + esc(full.split(em).slice(1).join(em))
          : esc(full);
      headline.setAttribute("data-edit", "home.introHeadline");
      headline.setAttribute("data-edit-plain", "1");
    }

    const body = document.querySelector("[data-home-body]");
    if (body) {
      // Migrate the old single-string bio into a paragraphs list so Hannah
      // can add / split / remove paragraphs from Studio.
      if (!Array.isArray(h.paragraphs)) {
        h.paragraphs = h.introBody ? [h.introBody] : [];
      }
      body.setAttribute("data-edit-list", "home.paragraphs");
      body.innerHTML = h.paragraphs
        .map(
          (p, i) =>
            `<p data-edit-item="home.paragraphs" data-index="${i}"><span${ed("home.paragraphs." + i)}>${rich(p)}</span></p>`
        )
        .join("");
    }

    const introImg = document.querySelector("[data-home-intro-img]");
    if (introImg) {
      if (h.introImage) introImg.src = h.introImage;
      introImg.alt = h.introImageAlt || "";
      introImg.setAttribute("data-edit-img", "home.introImage");
    }

    const k = document.querySelector("[data-home-next-kicker]");
    if (k) {
      k.innerHTML = rich(ns.kicker || "");
      k.setAttribute("data-edit", "home.nextShow.kicker");
    }
    const t = document.querySelector("[data-home-next-title]");
    if (t) {
      const role = (ns.role || "").trim();
      t.innerHTML =
        `<em${ed("home.nextShow.title")}>${rich(ns.title || "")}</em>` +
        (role ? ` · <span${ed("home.nextShow.role")}>${rich(role)}</span>` : "");
    }
    const v = document.querySelector("[data-home-next-venue]");
    if (v) {
      v.innerHTML = rich(ns.venue || "");
      v.setAttribute("data-edit", "home.nextShow.venue");
    }
    const a = document.querySelector("[data-home-next-link]");
    if (a) {
      a.href = ns.link || "upcoming.html";
      a.innerHTML = `<span${ed("home.nextShow.linkLabel")}>${rich(ns.linkLabel || "All upcoming")}</span> ${icon("arrow", 14)}`;
    }
  }

  function hydrateAbout(site) {
    const a = site.about || {};

    const cover = document.querySelector("[data-about-cover]");
    if (cover) {
      if (a.cover) cover.src = a.cover;
      cover.alt = a.coverAlt || "";
      cover.setAttribute("data-edit-img", "about.cover");
    }
    const coverCredit = document.querySelector("[data-about-cover-credit]");
    if (coverCredit) {
      coverCredit.innerHTML = rich(creditLine(a.coverCredit));
      coverCredit.setAttribute("data-edit", "about.coverCredit");
      coverCredit.setAttribute("data-edit-label", "Photographer");
    }

    const lead = document.querySelector("[data-about-lead]");
    if (lead) {
      lead.innerHTML = rich(a.lead || "");
      lead.setAttribute("data-edit", "about.lead");
    }

    const img = document.querySelector("[data-about-img]");
    if (img) {
      if (a.image) img.src = a.image;
      img.alt = a.imageAlt || "";
      img.setAttribute("data-edit-img", "about.image");
    }
    const cap = document.querySelector("[data-about-caption]");
    if (cap) {
      cap.innerHTML = rich(a.imageCaption || "");
      cap.setAttribute("data-edit", "about.imageCaption");
    }
    const credit = document.querySelector("[data-about-credit]");
    if (credit) {
      credit.innerHTML = rich(creditLine(a.imageCredit));
      credit.setAttribute("data-edit", "about.imageCredit");
      credit.setAttribute("data-edit-label", "Photographer");
    }

    const copy = document.querySelector("[data-about-copy]");
    if (!copy) return;

    // the item wrapper stays outside the editable span so the move/remove
    // controls can never end up inside the text she is typing
    copy.setAttribute("data-edit-list", "about.paragraphs");
    copy.innerHTML = (a.paragraphs || [])
      .map(
        (p, i) =>
          `<p data-edit-item="about.paragraphs" data-index="${i}"><span${ed("about.paragraphs." + i)}>${rich(p)}</span></p>`
      )
      .join("");
  }

  function hydrateHeadshots(site) {
    const resume = site.resume || {};
    const pdf = resume.pdf || "assets/resume/Hannah-Jew-Resume.pdf";

    const title = document.querySelector("[data-resume-title]");
    if (title) {
      title.innerHTML = rich(resume.title || "Resume");
      title.setAttribute("data-edit", "resume.title");
    }
    const blurb = document.querySelector("[data-resume-blurb]");
    if (blurb) {
      blurb.innerHTML = rich(resume.blurb || "");
      blurb.setAttribute("data-edit", "resume.blurb");
    }
    document.querySelectorAll("[data-resume-pdf], [data-resume-open]").forEach((el) => {
      el.href = pdf;
    });

    const shots = site.headshots || [];
    const hero = document.querySelector("[data-headshots-hero]");
    if (hero) {
      const src = resume.cover || (shots[0] && shots[0].src);
      if (src) hero.src = src;
      hero.setAttribute("data-edit-img", "resume.cover");
    }
    const heroCredit = document.querySelector("[data-headshots-cover-credit]");
    if (heroCredit) {
      heroCredit.innerHTML = rich(creditLine(resume.coverCredit));
      heroCredit.setAttribute("data-edit", "resume.coverCredit");
      heroCredit.setAttribute("data-edit-label", "Photographer");
    }

    const track = document.querySelector("[data-headshots-track]");
    if (!track) return;
    track.setAttribute("data-edit-list", "headshots");
    track.innerHTML = shots
      .map((s, i) => {
        const credit = creditLine(s.credit);
        return `<figure class="shot will-reveal" data-lightbox data-edit-item="headshots" data-index="${i}"
                 data-title="${esc(plain(s.title || "Hannah Jew"))}" data-credit="${esc(plain(credit))}">
          <img src="${esc(s.src)}" alt="${esc(plain(s.alt || s.title || ""))}" loading="lazy" data-edit-img="headshots.${i}.src" />
          <figcaption class="shot-credit"${ed("headshots." + i + ".credit", 'data-edit-label="Photographer"')}>${rich(credit)}</figcaption>
          <button type="button" class="hj-remove" data-remove>Remove</button>
        </figure>`;
      })
      .join("");
    if (typeof window.bindLightbox === "function") window.bindLightbox();
  }

  function defaultCategories() {
    return [
      { id: "performer", label: "Performer" },
      { id: "choreographer", label: "Choreographer" },
      { id: "educator", label: "Educator" },
      { id: "photoshoots", label: "Photoshoots" },
    ];
  }

  function catList(site) {
    const list = site.portfolioCategories;
    if (Array.isArray(list) && list.length) return list;
    return defaultCategories();
  }

  function catLabel(site, id) {
    const hit = catList(site).find((c) => c.id === id);
    return (hit && hit.label) || id || "";
  }

  function hydratePortfolio(site) {
    const grid = document.querySelector(".work-grid[data-portfolio]");
    if (!grid) return;
    const cats = catList(site);
    site.portfolioCategories = cats;
    const items = site.portfolio || [];
    if (splitLegacyVideos(items)) site.portfolio = items;
    window.HJ_PORTFOLIO = items;
    grid.setAttribute("data-edit-list", "portfolio");
    grid.dataset.cols = String((site.portfolioLayout && site.portfolioLayout.columns) || 3);

    const bar = document.querySelector("[data-portfolio-filters]");
    if (bar) {
      // If the selected tab was just removed, fall back to the first one so
      // the grid never ends up with nothing selected and everything hidden.
      const picked = (bar.querySelector(".is-active") || {}).dataset?.filter;
      const current = cats.some((c) => c.id === picked) ? picked : cats[0].id;
      bar.innerHTML = cats
        .map(
          (c) =>
            `<span class="filter-chip"><button type="button" data-filter="${esc(c.id)}" class="${c.id === current ? "is-active" : ""}">${esc(c.label)}</button><button type="button" class="filter-chip__x" data-remove-cat="${esc(c.id)}" title="Remove tab" aria-label="Remove ${esc(c.label)} tab">${icon("close", 12)}</button></span>`
        )
        .join("");
      if (typeof window.HJ_bindPortfolioFilters === "function") window.HJ_bindPortfolioFilters();
    }

    grid.innerHTML = items
      .map((item, i) => {
        const credit = creditLine(item.credit);
        const cat = item.category || cats[0].id;
        const orient = item.orient || "portrait";
        const span = item.span || 1;
        const notes = (item.notes || "").trim();
        const video = (item.video || "").trim();
        // A tile is a video either because it links out to YouTube/Vimeo or
        // because Hannah uploaded the file itself.
        const videoFile = (item.videoFile || "").trim();
        const isVideo = !!video || !!videoFile;
        const playSrc = videoFile || video;
        // Videos fall back to the YouTube thumbnail, then a neutral placeholder,
        // so a fresh tile always shows something the moment it's added.
        const thumb = item.src || (isVideo ? youtubeThumb(video) || VIDEO_PLACEHOLDER : "");
        const options = cats
          .map((c) => `<option value="${esc(c.id)}" ${c.id === cat ? "selected" : ""}>${esc(c.label)}</option>`)
          .join("");
        const shapeBtn = (key, val, label) =>
          `<button type="button" data-${key}="${val}" class="${(key === "orient" ? orient : String(span)) === String(val) ? "is-on" : ""}">${label}</button>`;
        const p = "portfolio." + i;
        const kindClass = isVideo ? " work--video" : "";
        // Uploaded files have no link to retype, so only linked videos get the
        // "change the link" row.
        const videoEditRow = videoFile
          ? `<div class="work-video-meta hj-edit-only"><span class="work-video-edit">${icon("play", 12)} Uploaded video</span></div>`
          : isVideo
            ? `<div class="work-video-meta hj-edit-only"><a class="work-video-edit" href="${esc(video)}" data-edit-href="${p}.video" data-prompt="Paste the YouTube or Vimeo link for this tile. Leave blank to remove.">${icon("edit", 12)} Change video link</a></div>`
            : "";
        return `<figure class="work will-reveal${kindClass}" data-category="${esc(cat)}" data-orient="${esc(orient)}" data-span="${span}"
                 ${isVideo ? 'data-kind="video"' : ""} data-lightbox
                 data-edit-item="portfolio" data-index="${i}"
                 data-title="${esc(plain(item.title))}" data-credit="${esc(plain(credit))}">
          <span class="tag">${esc(catLabel(site, cat))}</span>
          <label class="tag-pick">
            <select data-edit-cat="portfolio.${i}.category" aria-label="Category">${options}</select>
          </label>
          <span class="work-media">
            <img src="${esc(thumb)}" alt="${esc(plain(item.alt || item.title))}" loading="lazy" data-edit-img="portfolio.${i}.src" />
            ${isVideo ? `<button type="button" class="work-play" data-play-video="${esc(playSrc)}"${videoFile ? ' data-play-kind="file"' : ""} aria-label="Play video"><span class="work-play__icon">${icon("play", 22)}</span></button>` : ""}
          </span>
          <figcaption>
            <span class="title"${ed(p + ".title")}>${rich(item.title)}</span>
            <span class="credit"${ed(p + ".credit", 'data-edit-label="Photographer"')}>${rich(credit)}</span>
            <p class="work-notes"${ed(p + ".notes", 'data-edit-label="Notes: credits, cast, and details" data-edit-multiline="1"')}>${rich(notes)}</p>
            ${videoEditRow}
            <div class="work-shape">
              ${shapeBtn("orient", "portrait", "Tall")}
              ${shapeBtn("orient", "landscape", "Wide")}
              ${shapeBtn("orient", "square", "Square")}
              <span></span>
              ${shapeBtn("span", "1", "1")}
              ${shapeBtn("span", "2", "2")}
              ${shapeBtn("span", "3", "3")}
              <button type="button" data-remove>Remove</button>
            </div>
          </figcaption>
        </figure>`;
      })
      .join("");
    if (typeof window.bindLightbox === "function") window.bindLightbox();
    if (typeof window.HJ_applyPortfolioFilter === "function") window.HJ_applyPortfolioFilter();
  }

  function hydrateUpcoming(site) {
    const list = document.querySelector("[data-upcoming-list]");
    if (!list) return;
    const shows = site.upcoming || [];
    list.setAttribute("data-edit-list", "upcoming");
    list.innerHTML = shows
      .map((s, i) => {
        const p = "upcoming." + i + ".";
        const poster = s.poster
          ? `<figure class="show__poster" data-lightbox data-title="${esc(plain(s.title))}" data-credit="">
              <img src="${esc(s.poster)}" alt="${esc(plain(s.posterAlt || s.title))}" loading="lazy" data-edit-img="${p}poster" />
              <span class="shine" aria-hidden="true"></span>
            </figure>`
          : `<figure class="show__poster show__poster--empty" data-edit-empty-img="${p}poster"></figure>`;
        const onsale = `<p class="onsale"${ed(p + "onsale")}>${rich(s.onsale || "")}</p>`;
        const tickets = s.tickets
          ? `<a class="btn btn--red" href="${esc(s.tickets)}" target="_blank" rel="noopener" data-edit-href="${p}tickets">Tickets ${icon("arrow", 14)}</a>`
          : `<button type="button" class="btn hj-ticket-placeholder" data-edit-href="${p}tickets">Add ticket link</button>`;
        return `<article class="show${s.featured ? " show--featured" : ""} will-reveal" data-edit-item="upcoming" data-index="${i}">
          ${poster}
          <div class="show__body">
            <div class="show__date">
              <span class="month"${ed(p + "month")}>${rich(s.month || "")}</span>
              <span class="year"${ed(p + "year")}>${rich(s.year || "")}</span>
            </div>
            <h2><em${ed(p + "title")}>${rich(s.title || "")}</em></h2>
            <p class="role"${ed(p + "role")}>${rich(s.role || "")}</p>
            <p class="venue"${ed(p + "venue")}>${rich(s.venue || "")}</p>
            <p class="show__info"${ed(p + "info")}>${rich(s.info || "")}</p>
            ${onsale}
            ${tickets}
            <button type="button" class="hj-remove" data-remove>Remove show</button>
          </div>
        </article>`;
      })
      .join("");

    const note = document.querySelector("[data-upcoming-note]");
    if (note) {
      note.innerHTML = rich(site.upcomingNote || "");
      note.setAttribute("data-edit", "upcomingNote");
    }
    if (typeof window.bindLightbox === "function") window.bindLightbox();
  }

  function hydrateContact(site) {
    const c = site.contact || {};

    const h1 = document.querySelector("[data-contact-headline]");
    if (h1) {
      const full = c.headline || "";
      const em = (c.headlineEm || "").trim();
      h1.innerHTML =
        em && full.includes(em)
          ? esc(full.split(em)[0]) + "<em>" + esc(em) + "</em>" + esc(full.split(em).slice(1).join(em))
          : esc(full);
      h1.setAttribute("data-edit", "contact.headline");
      h1.setAttribute("data-edit-plain", "1");
    }

    const sub = document.querySelector("[data-contact-sub]");
    if (sub) {
      sub.innerHTML = rich(c.sub || "");
      sub.setAttribute("data-edit", "contact.sub");
    }

    const email = document.querySelector("[data-contact-email]");
    if (email) {
      email.href = "mailto:" + (c.email || "");
      email.textContent = c.email || "";
      email.setAttribute("data-edit", "contact.email");
      // The address doubles as the mailto link, so it stays unformatted.
      email.setAttribute("data-edit-plain", "1");
    }

    const rep = document.querySelector("[data-contact-rep]");
    if (rep) {
      const phone = (c.phone || "").trim();
      const fax = (c.fax || "").trim();
      rep.innerHTML =
        `<span${ed("contact.agency")}>${rich(c.agency || "")}</span><br />` +
        `<span${ed("contact.address")}>${rich(c.address || "")}</span>` +
        (phone
          ? `<br /><a href="tel:+1${phone.replace(/\D/g, "")}"${ed("contact.phone", 'data-edit-plain="1"')}>${esc(phone)}</a> (o)`
          : "") +
        (fax ? ` · <span${ed("contact.fax", 'data-edit-plain="1"')}>${esc(fax)}</span> (f)` : "");
    }

    const agent = document.querySelector("[data-contact-agent]");
    if (agent) {
      const name = (c.agentName || "").trim();
      const mail = (c.agentEmail || "").trim();
      agent.innerHTML =
        `<span${ed("contact.agentName", 'data-edit-label="Agent name"')}>${rich(name)}</span><br />` +
        (mail
          ? `<a href="mailto:${esc(mail)}"${ed("contact.agentEmail", 'data-edit-plain="1"')}>${esc(mail)}</a>`
          : `<span${ed("contact.agentEmail", 'data-edit-label="Agent email"')}></span>`);
      const block = agent.closest(".contact-block");
      if (block) block.classList.toggle("is-empty", !name && !mail);
    }

    const social = document.querySelector("[data-contact-social]");
    if (social) {
      const bits = [];
      if (c.instagram)
        bits.push(
          `<a href="${esc(c.instagram)}" target="_blank" rel="noopener" style="border-bottom:1.5px solid var(--red);">Instagram · <span${ed(
            "contact.instagramHandle"
          )}>${esc(c.instagramHandle || "")}</span></a>`
        );
      if (c.linkedin)
        bits.push(
          `<a href="${esc(c.linkedin)}" target="_blank" rel="noopener" style="border-bottom:1.5px solid var(--red);">LinkedIn · <span${ed(
            "contact.linkedinLabel"
          )}>${esc(c.linkedinLabel || "")}</span></a>`
        );
      social.innerHTML = bits.join("<br /><br />");
    }

    const materials = document.querySelector("[data-contact-materials]");
    if (materials) {
      const pdf = (site.resume && site.resume.pdf) || "assets/resume/Hannah-Jew-Resume.pdf";
      materials.innerHTML = `<a href="${esc(pdf)}" download style="border-bottom:1.5px solid var(--red);">Download resume (PDF)</a>`;
    }

    const img = document.querySelector("[data-contact-img]");
    if (img) {
      if (c.image) img.src = c.image;
      img.alt = c.imageAlt || "";
      img.setAttribute("data-edit-img", "contact.image");
    }
    const cap = document.querySelector("[data-contact-caption]");
    if (cap) {
      cap.innerHTML = rich(c.imageCaption || "");
      cap.setAttribute("data-edit", "contact.imageCaption");
    }
  }

  function defaultNav() {
    return [
      { href: "about.html", label: "About" },
      { href: "headshots.html", label: "Headshots & Resume" },
      { href: "portfolio.html", label: "Portfolio" },
      { href: "upcoming.html", label: "Upcoming" },
      { href: "contact.html", label: "Contact" },
    ];
  }

  function navList(site) {
    if (Array.isArray(site.nav) && site.nav.length) return site.nav;
    return defaultNav();
  }

  function currentPage() {
    const file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    return file || "index.html";
  }

  function hydrateNav(site) {
    const items = navList(site);
    site.nav = items;
    const page = currentPage();

    const header = document.querySelector(".nav__links");
    if (header) {
      header.innerHTML = items
        .map((item) => {
          const href = item.href || "";
          const label = item.label || href;
          const active = href.toLowerCase() === page ? " is-active" : "";
          const hidden = item.hidden ? " is-nav-hidden" : "";
          return `<span class="nav-chip${hidden}"><a href="${esc(href)}" class="${active.trim()}" data-nav-href="${esc(href)}">${esc(label)}</a><button type="button" class="nav-chip__x" data-nav-hide="${esc(href)}" title="${item.hidden ? "Show this tab" : "Hide this tab"}" aria-label="${item.hidden ? "Show" : "Hide"} ${esc(label)}">${item.hidden ? icon("plus", 11) : icon("close", 11)}</button></span>`;
        })
        .join("");
      const toggle = document.querySelector(".nav__toggle");
      header.querySelectorAll("a").forEach((a) => {
        a.addEventListener("click", () => {
          if (document.body.classList.contains("hj-edit")) return;
          header.classList.remove("is-open");
          if (toggle) toggle.setAttribute("aria-expanded", "false");
          document.body.classList.remove("nav-open");
        });
      });
    }

    const footer = document.querySelector(".footer__links");
    if (footer) {
      const insta = footer.querySelector('a[href*="instagram"]');
      const instaHtml = insta ? insta.outerHTML : "";
      footer.innerHTML =
        items
          .filter((item) => !item.hidden)
          .map((item) => `<a href="${esc(item.href)}">${esc(item.label)}</a>`)
          .join("") + instaHtml;
    }
  }

  // Per-image framing saved from Studio: which part of the photo shows,
  // how far in it is cropped, and how bright it sits.
  function applyImageTune(site) {
    const tune = site.imageTune || {};
    document.querySelectorAll("[data-edit-img]").forEach((img) => {
      const t = tune[img.dataset.editImg];
      if (!t) return;
      if (t.x != null || t.y != null) {
        img.style.objectPosition = `${t.x == null ? 50 : t.x}% ${t.y == null ? 50 : t.y}%`;
      }
      img.style.scale = t.zoom && Number(t.zoom) !== 100 ? String(Number(t.zoom) / 100) : "";
      const filters = [];
      if (t.bright != null && Number(t.bright) !== 100) filters.push(`brightness(${Number(t.bright)}%)`);
      if (t.contrast != null && Number(t.contrast) !== 100) filters.push(`contrast(${Number(t.contrast)}%)`);
      img.style.filter = filters.join(" ");
    });
  }
  window.HJ_applyImageTune = applyImageTune;

  function hydrate(site) {
    applyTheme(site);
    applyAccent(site);
    hydrateHome(site);
    hydrateAbout(site);
    hydrateHeadshots(site);
    hydratePortfolio(site);
    hydrateUpcoming(site);
    hydrateContact(site);
    hydrateNav(site);
    applyImageTune(site);
    if (typeof window.HJ_observeReveals === "function") window.HJ_observeReveals();
    document.dispatchEvent(new CustomEvent("hj:rendered", { detail: site }));
  }

  window.HJ_hydrateSite = hydrate;

  async function boot() {
    try {
      const site = await window.HJ_loadSite();
      hydrate(site);
      document.dispatchEvent(new CustomEvent("hj:site-ready", { detail: site }));
    } catch (e) {
      console.warn("Content load failed", e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
