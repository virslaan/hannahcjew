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

  // "Photo: Jane Smith" — but only once she has actually typed a name
  function creditLine(credit) {
    const t = (credit || "").trim();
    if (!t) return "";
    return /^photo\b/i.test(t) ? t : "Photo: " + t;
  }

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
      body.textContent = h.introBody || "";
      body.setAttribute("data-edit", "home.introBody");
    }

    const introImg = document.querySelector("[data-home-intro-img]");
    if (introImg) {
      if (h.introImage) introImg.src = h.introImage;
      introImg.alt = h.introImageAlt || "";
      introImg.setAttribute("data-edit-img", "home.introImage");
    }

    const k = document.querySelector("[data-home-next-kicker]");
    if (k) {
      k.textContent = ns.kicker || "";
      k.setAttribute("data-edit", "home.nextShow.kicker");
    }
    const t = document.querySelector("[data-home-next-title]");
    if (t) {
      const role = (ns.role || "").trim();
      t.innerHTML =
        `<em${ed("home.nextShow.title")}>${esc(ns.title || "")}</em>` +
        (role ? ` · <span${ed("home.nextShow.role")}>${esc(role)}</span>` : "");
    }
    const v = document.querySelector("[data-home-next-venue]");
    if (v) {
      v.textContent = ns.venue || "";
      v.setAttribute("data-edit", "home.nextShow.venue");
    }
    const a = document.querySelector("[data-home-next-link]");
    if (a) {
      a.href = ns.link || "upcoming.html";
      a.innerHTML = `<span${ed("home.nextShow.linkLabel")}>${esc(ns.linkLabel || "All upcoming")}</span> <span aria-hidden="true">→</span>`;
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
      coverCredit.textContent = creditLine(a.coverCredit);
      coverCredit.setAttribute("data-edit", "about.coverCredit");
      coverCredit.setAttribute("data-edit-label", "Photographer");
    }

    const lead = document.querySelector("[data-about-lead]");
    if (lead) {
      lead.textContent = a.lead || "";
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
      cap.textContent = a.imageCaption || "";
      cap.setAttribute("data-edit", "about.imageCaption");
    }
    const credit = document.querySelector("[data-about-credit]");
    if (credit) {
      credit.textContent = creditLine(a.imageCredit);
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
          `<p data-edit-item="about.paragraphs" data-index="${i}"><span${ed("about.paragraphs." + i)}>${esc(p)}</span></p>`
      )
      .join("");
  }

  function hydrateHeadshots(site) {
    const resume = site.resume || {};
    const pdf = resume.pdf || "assets/resume/Hannah-Jew-Resume.pdf";

    const blurb = document.querySelector("[data-resume-blurb]");
    if (blurb) {
      blurb.textContent = resume.blurb || "";
      blurb.setAttribute("data-edit", "resume.blurb");
    }
    document.querySelectorAll("[data-resume-pdf]").forEach((el) => {
      el.href = pdf;
    });

    const shots = site.headshots || [];
    const hero = document.querySelector("[data-headshots-hero]");
    if (hero && shots[0] && shots[0].src) hero.src = shots[0].src;

    const track = document.querySelector("[data-headshots-track]");
    if (!track) return;
    track.setAttribute("data-edit-list", "headshots");
    track.innerHTML = shots
      .map((s, i) => {
        const credit = creditLine(s.credit);
        return `<figure class="nfx-card" data-lightbox data-edit-item="headshots" data-index="${i}"
                 data-title="${esc(s.title || "Hannah Jew")}" data-credit="${esc(credit)}">
          <img src="${esc(s.src)}" alt="${esc(s.alt || s.title || "")}" loading="lazy" data-edit-img="headshots.${i}.src" />
          <figcaption class="shot-credit"${ed("headshots." + i + ".credit", 'data-edit-label="Photographer"')}>${esc(credit)}</figcaption>
        </figure>`;
      })
      .join("");
    if (typeof window.bindLightbox === "function") window.bindLightbox();
  }

  function hydratePortfolio(site) {
    const grid = document.querySelector(".work-grid[data-portfolio]");
    if (!grid) return;
    const CAT = {
      performer: "Performer",
      choreographer: "Choreographer",
      educator: "Educator",
      photoshoots: "Photoshoots",
    };
    const items = site.portfolio || [];
    window.HJ_PORTFOLIO = items;
    grid.setAttribute("data-edit-list", "portfolio");
    grid.innerHTML = items
      .map((item, i) => {
        const credit = creditLine(item.credit);
        return `<figure class="work will-reveal is-visible" data-category="${esc(item.category)}" data-lightbox
                 data-edit-item="portfolio" data-index="${i}"
                 data-title="${esc(item.title)}" data-credit="${esc(credit)}">
          <span class="tag"${ed("portfolio." + i + ".category", 'data-edit-choice="performer|choreographer|educator|photoshoots"')}>${esc(
          CAT[item.category] || item.category
        )}</span>
          <img src="${esc(item.src)}" alt="${esc(item.alt || item.title)}" loading="lazy" data-edit-img="portfolio.${i}.src" />
          <figcaption>
            <span class="title"${ed("portfolio." + i + ".title")}>${esc(item.title)}</span>
            <span class="credit"${ed("portfolio." + i + ".credit", 'data-edit-label="Photographer"')}>${esc(credit)}</span>
          </figcaption>
        </figure>`;
      })
      .join("");
    if (typeof window.bindLightbox === "function") window.bindLightbox();
    const active = document.querySelector(".filters button.is-active");
    if (active) active.click();
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
          ? `<figure class="show__poster" data-lightbox data-title="${esc(s.title)}" data-credit="">
              <img src="${esc(s.poster)}" alt="${esc(s.posterAlt || s.title)}" loading="lazy" data-edit-img="${p}poster" />
              <span class="shine" aria-hidden="true"></span>
            </figure>`
          : `<figure class="show__poster show__poster--empty" data-edit-empty-img="${p}poster"></figure>`;
        const onsale = s.onsale ? `<p class="onsale"${ed(p + "onsale")}>${esc(s.onsale)}</p>` : "";
        const tickets = s.tickets
          ? `<a class="btn btn--red" href="${esc(s.tickets)}" target="_blank" rel="noopener" data-edit-href="${p}tickets">Tickets <span aria-hidden="true">→</span></a>`
          : "";
        return `<article class="show${s.featured ? " show--featured" : ""} will-reveal is-visible" data-edit-item="upcoming" data-index="${i}">
          ${poster}
          <div class="show__body">
            <div class="show__date">
              <span class="month"${ed(p + "month")}>${esc(s.month || "")}</span>
              <span class="year"${ed(p + "year")}>${esc(s.year || "")}</span>
            </div>
            <h2><em${ed(p + "title")}>${esc(s.title || "")}</em></h2>
            <p class="role"${ed(p + "role")}>${esc(s.role || "")}</p>
            <p class="venue"${ed(p + "venue")}>${esc(s.venue || "")}</p>
            ${onsale}
            ${tickets}
          </div>
        </article>`;
      })
      .join("");

    const note = document.querySelector("[data-upcoming-note]");
    if (note) {
      note.textContent = site.upcomingNote || "";
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
      sub.textContent = c.sub || "";
      sub.setAttribute("data-edit", "contact.sub");
    }

    const email = document.querySelector("[data-contact-email]");
    if (email) {
      email.href = "mailto:" + (c.email || "");
      email.textContent = c.email || "";
      email.setAttribute("data-edit", "contact.email");
    }

    const rep = document.querySelector("[data-contact-rep]");
    if (rep) {
      const phone = (c.phone || "").trim();
      const fax = (c.fax || "").trim();
      rep.innerHTML =
        `<span${ed("contact.agency")}>${esc(c.agency || "")}</span><br />` +
        `<span${ed("contact.address")}>${esc(c.address || "")}</span>` +
        (phone
          ? `<br /><a href="tel:+1${phone.replace(/\D/g, "")}"${ed("contact.phone")}>${esc(phone)}</a> (o)`
          : "") +
        (fax ? ` · <span${ed("contact.fax")}>${esc(fax)}</span> (f)` : "");
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
      cap.textContent = c.imageCaption || "";
      cap.setAttribute("data-edit", "contact.imageCaption");
    }
  }

  function hydrate(site) {
    applyAccent(site);
    hydrateHome(site);
    hydrateAbout(site);
    hydrateHeadshots(site);
    hydratePortfolio(site);
    hydrateUpcoming(site);
    hydrateContact(site);
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
