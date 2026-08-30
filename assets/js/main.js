/* Hannah Jew 周健倫 · site interactions */

// ============================================================
// THEMES
// The look is Hannah's choice, not the visitor's: it lives in
// assets/data/site.json and is set from the Studio bar. Visitors
// just see whatever she published. Switching animates as a
// circular sweep (View Transitions API, with a fade fallback).
// ============================================================
const THEMES = ["seal", "noir", "porcelain", "crimson", "jade"];
const cfg = window.SITE_CONFIG || {};
const lockedTheme = THEMES.includes(cfg.theme) ? cfg.theme : null;
const THEME_CACHE = "hj-theme";

function setTheme(name) {
  if (!THEMES.includes(name)) name = "seal";
  if (name === "seal") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", name);
  }
}

function currentTheme() {
  if (lockedTheme) return lockedTheme;
  const fromUrl = new URLSearchParams(location.search).get("theme");
  if (THEMES.includes(fromUrl)) return fromUrl;
  // site.json is still in flight on first paint, so repaint from the last
  // published theme we saw and let content.js correct it if it changed
  const cached = localStorage.getItem(THEME_CACHE);
  return THEMES.includes(cached) ? cached : "seal";
}

setTheme(currentTheme());

// content.js and the Studio bar both apply the published theme through here
window.HJ_applyTheme = (name, originEl) => {
  if (!THEMES.includes(name)) name = "seal";
  try { localStorage.setItem(THEME_CACHE, name); } catch (e) {}
  if (lockedTheme) return;
  const now = document.documentElement.getAttribute("data-theme") || "seal";
  if (now === name) return;
  switchTheme(name, originEl);
};

function switchTheme(name, originEl) {
  const apply = () => setTheme(name);

  if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const rect = originEl ? originEl.getBoundingClientRect() : null;
    const x = rect ? rect.left + rect.width / 2 : innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : 0;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = document.startViewTransition(apply);
    vt.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 750, easing: "cubic-bezier(0.16, 1, 0.3, 1)", pseudoElement: "::view-transition-new(root)" }
      );
    });
  } else {
    document.documentElement.classList.add("theme-fading");
    apply();
    setTimeout(() => document.documentElement.classList.remove("theme-fading"), 650);
  }
}

// ----- sticky nav background on scroll -----
const nav = document.querySelector(".nav");
const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 24);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// ----- mobile menu -----
const toggle = document.querySelector(".nav__toggle");
const links = document.querySelector(".nav__links");
if (toggle && links) {
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("nav-open", open);
  });
  links.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      links.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("nav-open");
    })
  );
}

// ----- display names: letter-stagger reveal -----
document.querySelectorAll(".hero__name .split").forEach((el) => {
  const text = el.textContent;
  el.textContent = "";
  [...text].forEach((ch, i) => {
    const span = document.createElement("span");
    span.className = "char";
    span.style.setProperty("--i", i);
    span.textContent = ch;
    el.appendChild(span);
  });
});

// ----- hero scroll choreography -----
// The photo sinks slower than the page (parallax), while the name
// and seal drift up and dissolve, handing the scene off to the intro.
const heroImg = document.querySelector(".hero__img img");
const heroContent = document.querySelector(".hero__content");
if (heroImg && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      heroImg.style.translate = "0 " + y * 0.22 + "px";
      if (heroContent) {
        const p = Math.min(y / (innerHeight * 0.75), 1);
        heroContent.style.opacity = String(1 - p * p);
        heroContent.style.translate = "0 " + y * -0.06 + "px";
      }
      ticking = false;
    });
  }, { passive: true });
}

// ----- noir spotlight: cursor-tracked, smoothed -----
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const root = document.documentElement.style;
  let tx = innerWidth / 2, ty = innerHeight * 0.3;
  let cx = tx, cy = ty, raf = null;
  const step = () => {
    cx += (tx - cx) * 0.07;
    cy += (ty - cy) * 0.07;
    root.setProperty("--mx", cx.toFixed(1) + "px");
    root.setProperty("--my", cy.toFixed(1) + "px");
    if (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.5) {
      raf = requestAnimationFrame(step);
    } else {
      raf = null;
    }
  };
  window.addEventListener("pointermove", (e) => {
    tx = e.clientX;
    ty = e.clientY;
    if (!raf) raf = requestAnimationFrame(step);
  }, { passive: true });
})();

// ----- scroll reveal -----
// [data-stagger] containers cascade their children in one by one;
// the per-child delay is set here as a CSS variable.
document.querySelectorAll("[data-stagger]").forEach((group) => {
  [...group.children].forEach((child, i) => child.style.setProperty("--d", i));
});

const REVEAL_SELECTOR = ".will-reveal, [data-stagger]";
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  // content.js calls this again after it draws a page from site.json
  window.HJ_observeReveals = (root) => {
    (root || document).querySelectorAll(REVEAL_SELECTOR).forEach((el) => {
      if (el.classList.contains("is-visible")) return;
      io.observe(el);
    });
  };
} else {
  window.HJ_observeReveals = (root) => {
    (root || document).querySelectorAll(REVEAL_SELECTOR).forEach((el) => el.classList.add("is-visible"));
  };
}
window.HJ_observeReveals();

// ----- portfolio filters -----
function applyPortfolioFilter(filter) {
  const bar = document.querySelector("[data-portfolio-filters]");
  if (!bar) return;
  const active = bar.querySelector(".is-active");
  const f = filter || (active && active.dataset.filter);
  if (!f) return;
  document.querySelectorAll(".work").forEach((w) => {
    w.classList.toggle("is-hidden", w.dataset.category !== f);
  });
}

function bindPortfolioFilters() {
  const bar = document.querySelector("[data-portfolio-filters]");
  if (!bar) return;
  bar.querySelectorAll("button[data-filter]").forEach((btn) => {
    btn.onclick = () => {
      bar.querySelectorAll("button[data-filter]").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      applyPortfolioFilter(btn.dataset.filter);
    };
  });
  const hashFilter = window.location.hash.replace("#", "");
  const hashed = hashFilter && bar.querySelector(`[data-filter="${hashFilter}"]`);
  if (hashed) hashed.click();
  else applyPortfolioFilter();
}

window.HJ_bindPortfolioFilters = bindPortfolioFilters;
window.HJ_applyPortfolioFilter = applyPortfolioFilter;
bindPortfolioFilters();

// ----- lightbox (still images only; videos play inline in the card) -----
const lightbox = document.querySelector(".lightbox");
if (lightbox) {
  const lbImg = lightbox.querySelector("img");
  const lbTitle = lightbox.querySelector(".lightbox__caption .title");
  const lbCredit = lightbox.querySelector(".lightbox__caption .credit");
  const lbDownload = lightbox.querySelector(".lightbox__download");

  const close = () => {
    lightbox.classList.remove("is-open");
    document.body.style.overflow = "";
  };
  lightbox.querySelector(".lightbox__close").addEventListener("click", close);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) close();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  window.bindLightbox = function bindLightbox() {
    document.querySelectorAll("[data-lightbox]").forEach((fig) => {
      if (fig.dataset.lbBound) return;
      fig.dataset.lbBound = "1";
      fig.addEventListener("click", (e) => {
        if (document.body.classList.contains("hj-edit")) return;
        // ignore clicks on interactive children (play buttons, edit inputs, etc.)
        if (e.target.closest("a, button, select, input, textarea")) return;
        // if a video is currently playing in this card, don't hijack it
        if (fig.classList.contains("is-playing")) return;
        const img = fig.querySelector("img");
        lbImg.src = img.dataset.full || img.src;
        lbImg.alt = img.alt;
        lbTitle.textContent = fig.dataset.title || "";
        lbCredit.textContent = fig.dataset.credit || "";
        if (lbDownload) lbDownload.href = img.dataset.full || img.src;
        lightbox.classList.add("is-open");
        document.body.style.overflow = "hidden";
      });
    });
  };
  window.bindLightbox();
}

// ----- inline video player on portfolio cards ---------------------------
// Turns any YouTube or Vimeo URL into an embeddable src. Returns null for
// links we don't recognise (we'll just open those in a new tab as a fallback).
function hjToEmbed(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return "https://www.youtube.com/embed/" + u.pathname.slice(1);
    if (host.endsWith("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) return url;
      if (u.pathname === "/watch" && u.searchParams.get("v")) return "https://www.youtube.com/embed/" + u.searchParams.get("v");
      if (u.pathname.startsWith("/shorts/")) return "https://www.youtube.com/embed/" + u.pathname.split("/")[2];
    }
    if (host.endsWith("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id) return "https://player.vimeo.com/video/" + id;
    }
  } catch (_) {}
  return null;
}

function hjClosePlayer(fig) {
  if (!fig) return;
  const media = fig.querySelector(".work-media");
  if (!media) return;
  const existing = media.querySelector(".work-player");
  if (existing) existing.remove();
  fig.classList.remove("is-playing");
}

function hjPlayInline(fig, url) {
  if (!fig || !url) return;
  const media = fig.querySelector(".work-media");
  if (!media) return;
  const embed = hjToEmbed(url);
  if (!embed) {
    // Not a YouTube/Vimeo link — open in a new tab so it still works.
    window.open(url, "_blank", "noopener");
    return;
  }
  const old = media.querySelector(".work-player");
  if (old) old.remove();
  const wrap = document.createElement("div");
  wrap.className = "work-player";
  const separator = embed.includes("?") ? "&" : "?";
  wrap.innerHTML =
    '<iframe src="' + embed + separator + 'autoplay=1&rel=0"' +
    ' allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"' +
    ' allowfullscreen loading="lazy" title="Video"></iframe>' +
    '<button type="button" class="work-player__close" aria-label="Close video">' +
    (window.HJ_icon ? window.HJ_icon("close", 16) : "Close") +
    "</button>";
  media.appendChild(wrap);
  fig.classList.add("is-playing");
}

document.addEventListener("click", (e) => {
  const play = e.target.closest("[data-play-video]");
  if (play) {
    // In Studio edit mode, the ▶ badge should not swallow the underlying
    // image click (Hannah is probably trying to swap the photo). Video pill
    // buttons under the caption still play normally in either mode.
    if (document.body.classList.contains("hj-edit") && play.classList.contains("work-play")) return;
    e.preventDefault();
    e.stopPropagation();
    const fig = play.closest(".work");
    hjPlayInline(fig, play.dataset.playVideo);
    return;
  }
  const closeBtn = e.target.closest(".work-player__close");
  if (closeBtn) {
    e.preventDefault();
    e.stopPropagation();
    hjClosePlayer(closeBtn.closest(".work"));
  }
});

// ----- footer year -----
const yearEl = document.querySelector("[data-year]");
if (yearEl) yearEl.textContent = new Date().getFullYear();
