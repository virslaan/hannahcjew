/* Hannah Jew 周健倫 · site interactions */

// ============================================================
// THEMES
// Reads assets/js/config.js. If config theme is "auto", the
// visitor picks from the dropdown and the choice is saved to
// their device. Switching animates as a circular sweep from
// the dropdown (View Transitions API, with a fade fallback).
// ============================================================
const THEMES = ["seal", "noir", "porcelain", "crimson", "jade"];
const cfg = window.SITE_CONFIG || {};
const lockedTheme = THEMES.includes(cfg.theme) ? cfg.theme : null;

function setTheme(name) {
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
  const saved = localStorage.getItem("hj-theme");
  return THEMES.includes(saved) ? saved : "seal";
}

setTheme(currentTheme());

function switchTheme(name, originEl) {
  const apply = () => {
    setTheme(name);
    localStorage.setItem("hj-theme", name);
  };

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

document.querySelectorAll(".theme-picker").forEach((picker) => {
  if (lockedTheme) {
    picker.remove();
    return;
  }
  const select = picker.querySelector("select");
  select.value = currentTheme();
  select.addEventListener("change", () => switchTheme(select.value, picker));
});

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
document.querySelectorAll(".hero__name .split, .nfx-title .split").forEach((el) => {
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

const revealEls = document.querySelectorAll(".will-reveal, [data-stagger]");
if ("IntersectionObserver" in window && revealEls.length) {
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
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("is-visible"));
}

// ----- portfolio filters -----
const filterBtns = document.querySelectorAll(".filters button");
const works = document.querySelectorAll(".work");
filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterBtns.forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    const f = btn.dataset.filter;
    works.forEach((w) => {
      const show = f === "all" || w.dataset.category === f;
      w.classList.toggle("is-hidden", !show);
    });
  });
});

// If the URL has a hash like #performer, pre-select that filter
const hashFilter = window.location.hash.replace("#", "");
if (hashFilter) {
  const btn = document.querySelector(`.filters button[data-filter="${hashFilter}"]`);
  if (btn) btn.click();
}

// ----- shelf row arrows (headshots page) -----
document.querySelectorAll(".nfx-row").forEach((row) => {
  const track = row.querySelector(".nfx-row__track");
  const prev = row.querySelector(".nfx-row__nav .prev");
  const next = row.querySelector(".nfx-row__nav .next");
  if (!track || !prev || !next) return;

  const page = () => Math.max(track.clientWidth * 0.8, 300);
  prev.addEventListener("click", () => track.scrollBy({ left: -page(), behavior: "smooth" }));
  next.addEventListener("click", () => track.scrollBy({ left: page(), behavior: "smooth" }));

  const update = () => {
    prev.disabled = track.scrollLeft <= 4;
    next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 4;
  };
  track.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
});

// ----- lightbox -----
const lightbox = document.querySelector(".lightbox");
if (lightbox) {
  const lbImg = lightbox.querySelector("img");
  const lbTitle = lightbox.querySelector(".lightbox__caption .title");
  const lbCredit = lightbox.querySelector(".lightbox__caption .credit");
  const lbDownload = lightbox.querySelector(".lightbox__download");

  document.querySelectorAll("[data-lightbox]").forEach((fig) => {
    fig.addEventListener("click", () => {
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
}

// ----- footer year -----
const yearEl = document.querySelector("[data-year]");
if (yearEl) yearEl.textContent = new Date().getFullYear();
