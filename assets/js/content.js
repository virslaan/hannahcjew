/* ============================================================
   CONTENT · loads assets/data/site.json (+ local Studio draft)
   and fills every page. Hannah edits via the gear Studio.
   ============================================================ */
(function () {
  const DRAFT_KEY = "hj-site-draft";
  const OLD_PORTFOLIO_KEY = "hj-portfolio-draft";

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function creditLine(credit) {
    const t = (credit || "").trim();
    if (!t) return "";
    return /^photo\b/i.test(t) ? t : "Photo: " + t;
  }

  function emTitle(title, em) {
    const t = title || "";
    const e = (em || "").trim();
    if (!e || !t.includes(e)) return esc(t);
    return esc(t).replace(esc(e), "<em>" + esc(e) + "</em>");
  }

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
    // migrate older portfolio-only drafts
    try {
      const old = JSON.parse(localStorage.getItem(OLD_PORTFOLIO_KEY) || "null");
      if (Array.isArray(old) && window.HJ_SITE) {
        return { ...window.HJ_SITE, portfolio: old };
      }
    } catch (_) {}
    return null;
  }

  window.HJ_saveSite = function (site) {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(site));
    window.HJ_SITE = site;
    window.HJ_PORTFOLIO = site.portfolio || [];
    hydrate(site);
    document.dispatchEvent(new CustomEvent("hj:site-updated", { detail: site }));
  };

  window.HJ_clearSiteDraft = function () {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(OLD_PORTFOLIO_KEY);
  };

  window.HJ_loadSite = async function () {
    const base = await fetchSite();
    const draft = readDraft();
    const site = draft ? { ...base, ...draft, portfolio: draft.portfolio || base.portfolio } : base;
    // deep-enough merge for nested objects we care about
    if (draft) {
      site.home = { ...base.home, ...(draft.home || {}) };
      if (draft.home && draft.home.nextShow) {
        site.home.nextShow = { ...base.home.nextShow, ...draft.home.nextShow };
      }
      site.about = { ...base.about, ...(draft.about || {}) };
      site.resume = { ...base.resume, ...(draft.resume || {}) };
      site.contact = { ...base.contact, ...(draft.contact || {}) };
      site.headshots = draft.headshots || base.headshots;
      site.upcoming = draft.upcoming || base.upcoming;
      site.upcomingNote = draft.upcomingNote ?? base.upcomingNote;
    }
    window.HJ_SITE = site;
    window.HJ_PORTFOLIO = site.portfolio || [];
    return site;
  };

  // ----- page hydrators -----
  function hydrateHome(site) {
    const h = site.home || {};
    const hero = document.querySelector("[data-home-hero]");
    if (hero && h.heroImage) {
      hero.src = h.heroImage;
    }
    const headline = document.querySelector("[data-home-headline]");
    if (headline) {
      const full = h.introHeadline || "";
      const em = h.introHeadlineEm || "";
      if (em && full.includes(em)) {
        const parts = full.split(em);
        headline.innerHTML =
          esc(parts[0]) + "<em>" + esc(em) + "</em>" + esc(parts.slice(1).join(em));
      } else {
        headline.textContent = full;
      }
    }
    const body = document.querySelector("[data-home-body]");
    if (body) body.textContent = h.introBody || "";
    const introImg = document.querySelector("[data-home-intro-img]");
    if (introImg && h.introImage) {
      introImg.src = h.introImage;
      introImg.alt = h.introImageAlt || "";
    }
    const ns = h.nextShow || {};
    const k = document.querySelector("[data-home-next-kicker]");
    if (k) k.textContent = ns.kicker || "Next on stage";
    const t = document.querySelector("[data-home-next-title]");
    if (t) t.innerHTML = "<em>" + esc(ns.title || "") + "</em> · " + esc(ns.role || "");
    const v = document.querySelector("[data-home-next-venue]");
    if (v) v.textContent = ns.venue || "";
    const a = document.querySelector("[data-home-next-link]");
    if (a) {
      a.href = ns.link || "upcoming.html";
      a.innerHTML = esc(ns.linkLabel || "All upcoming") + ' <span aria-hidden="true">→</span>';
    }
  }

  function hydrateAbout(site) {
    const a = site.about || {};
    const img = document.querySelector("[data-about-img]");
    if (img) {
      img.src = a.image || img.src;
      img.alt = a.imageAlt || "";
    }
    const cap = document.querySelector("[data-about-caption]");
    if (cap) cap.textContent = a.imageCaption || "";
    const copy = document.querySelector("[data-about-copy]");
    if (!copy) return;
    const paras = (a.paragraphs || []).map((p) => "<p>" + esc(p) + "</p>").join("");
    const highs = (a.highlights || [])
      .map((x) => "<li>" + esc(x) + "</li>")
      .join("");
    const skills = (a.skills || []).map((x) => "<li>" + esc(x) + "</li>").join("");
    copy.innerHTML =
      paras +
      "<h3>Selected highlights</h3><ul class=\"skill-tags\" data-stagger>" +
      highs +
      "</ul><h3>Movement languages</h3><ul class=\"skill-tags\" data-stagger>" +
      skills +
      "</ul>" +
      '<a class="btn btn--red" href="headshots.html" style="margin-top:2.2rem;">Headshots &amp; resume <span aria-hidden="true">→</span></a>';
  }

  function hydrateHeadshots(site) {
    const resume = site.resume || {};
    const pdf = resume.pdf || "assets/resume/Hannah-Jew-Resume.pdf";
    const blurb = document.querySelector("[data-resume-blurb]");
    if (blurb) blurb.textContent = resume.blurb || "";
    document.querySelectorAll("[data-resume-pdf]").forEach((el) => {
      el.href = pdf;
    });

    const shots = site.headshots || [];
    const hero = document.querySelector("[data-headshots-hero]");
    if (hero && shots[0]) {
      hero.src = shots[0].src;
    }
    const track = document.querySelector("[data-headshots-track]");
    if (track) {
      track.innerHTML = shots
        .map((s) => {
          const credit = creditLine(s.credit);
          return `<figure class="nfx-card" data-lightbox data-title="${esc(s.title || "Hannah Jew")}" data-credit="${esc(credit)}">
            <img src="${esc(s.src)}" alt="${esc(s.alt || s.title || "")}" loading="lazy" />
          </figure>`;
        })
        .join("");
      if (typeof window.bindLightbox === "function") window.bindLightbox();
    }
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
    grid.innerHTML = items
      .map((item) => {
        const credit = creditLine(item.credit);
        return `<figure class="work will-reveal is-visible" data-category="${esc(item.category)}" data-lightbox
                data-title="${esc(item.title)}" data-credit="${esc(credit)}" data-id="${esc(item.id)}">
          <span class="tag">${esc(CAT[item.category] || item.category)}</span>
          <img src="${esc(item.src)}" alt="${esc(item.alt || item.title)}" loading="lazy" />
          <figcaption>
            <span class="title">${esc(item.title)}</span>
            <span class="credit">${esc(credit)}</span>
          </figcaption>
        </figure>`;
      })
      .join("");
    if (typeof window.bindLightbox === "function") window.bindLightbox();
    const active = document.querySelector(".filters button.is-active");
    if (active) active.click();
    if (typeof window.HJ_renderPortfolio === "function") {
      // keep legacy hook in sync
    }
  }

  function hydrateUpcoming(site) {
    const list = document.querySelector("[data-upcoming-list]");
    if (!list) return;
    const shows = site.upcoming || [];
    list.innerHTML = shows
      .map((s) => {
        const featured = s.featured ? " show--featured" : "";
        const poster = s.poster
          ? `<figure class="show__poster" data-lightbox data-title="${esc(s.title)}" data-credit="">
              <img src="${esc(s.poster)}" alt="${esc(s.posterAlt || s.title)}" loading="lazy" />
              <span class="shine" aria-hidden="true"></span>
            </figure>`
          : "";
        const tickets = s.tickets
          ? `<a class="btn btn--red" href="${esc(s.tickets)}" target="_blank" rel="noopener">Tickets <span aria-hidden="true">→</span></a>`
          : "";
        const onsale = s.onsale ? `<p class="onsale">${esc(s.onsale)}</p>` : "";
        return `<article class="show${featured} will-reveal is-visible">
          ${poster}
          <div class="show__body">
            <div class="show__date">
              <span class="month">${esc(s.month || "")}</span>
              <span class="year">${esc(s.year || "")}</span>
            </div>
            <h2><em>${esc(s.title || "")}</em></h2>
            <p class="role">${esc(s.role || "")}</p>
            <p class="venue">${esc(s.venue || "")}</p>
            ${onsale}
            ${tickets}
          </div>
        </article>`;
      })
      .join("");
    const note = document.querySelector("[data-upcoming-note]");
    if (note) note.textContent = site.upcomingNote || "";
    if (typeof window.bindLightbox === "function") window.bindLightbox();
  }

  function hydrateContact(site) {
    const c = site.contact || {};
    const h1 = document.querySelector("[data-contact-headline]");
    if (h1) h1.innerHTML = emTitle(c.headline || "Let's make something", c.headlineEm || "something");
    const sub = document.querySelector("[data-contact-sub]");
    if (sub) sub.textContent = c.sub || "";
    const email = document.querySelector("[data-contact-email]");
    if (email) {
      email.href = "mailto:" + (c.email || "");
      email.textContent = c.email || "";
    }
    const rep = document.querySelector("[data-contact-rep]");
    if (rep) {
      rep.innerHTML =
        esc(c.agency || "") +
        "<br />" +
        esc(c.address || "") +
        "<br />" +
        (c.phone
          ? `<a href="tel:+1${String(c.phone).replace(/\D/g, "")}">${esc(c.phone)}</a> (o)`
          : "") +
        (c.fax ? " · " + esc(c.fax) + " (f)" : "");
    }
    const social = document.querySelector("[data-contact-social]");
    if (social) {
      social.innerHTML =
        `<a href="${esc(c.instagram || "#")}" target="_blank" rel="noopener" style="border-bottom:1.5px solid var(--red);">Instagram · ${esc(c.instagramHandle || "")}</a><br /><br />` +
        `<a href="${esc(c.linkedin || "#")}" target="_blank" rel="noopener" style="border-bottom:1.5px solid var(--red);">LinkedIn · ${esc(c.linkedinLabel || "")}</a>`;
    }
    const materials = document.querySelector("[data-contact-materials]");
    if (materials) {
      const pdf = (site.resume && site.resume.pdf) || "assets/resume/Hannah-Jew-Resume.pdf";
      materials.innerHTML = `<a href="${esc(pdf)}" download style="border-bottom:1.5px solid var(--red);">Download resume (PDF)</a>`;
    }
    const img = document.querySelector("[data-contact-img]");
    if (img) {
      img.src = c.image || img.src;
      img.alt = c.imageAlt || "";
    }
    const cap = document.querySelector("[data-contact-caption]");
    if (cap) cap.textContent = c.imageCaption || "";
  }

  function hydrate(site) {
    hydrateHome(site);
    hydrateAbout(site);
    hydrateHeadshots(site);
    hydratePortfolio(site);
    hydrateUpcoming(site);
    hydrateContact(site);
  }

  window.HJ_hydrateSite = hydrate;
  window.HJ_renderPortfolio = function (items) {
    if (!window.HJ_SITE) return;
    window.HJ_SITE.portfolio = items;
    hydratePortfolio(window.HJ_SITE);
  };

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
