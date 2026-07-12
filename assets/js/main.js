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

// ----- scroll reveal -----
const revealEls = document.querySelectorAll(".will-reveal");
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

// ============================================================
// INSTAGRAM FEED (home page)
// Renders posts listed in config.js as official embeds.
// With no posts configured, tries the profile grid embed and
// falls back to a follow card if Instagram blocks it.
// ============================================================
const instaSection = document.querySelector("[data-instagram]");
if (instaSection) {
  const { username = "hannahjew", posts = [] } = cfg.instagram || {};
  const grid = instaSection.querySelector(".insta-grid");
  const profileBox = instaSection.querySelector(".insta-profile");
  const fallback = instaSection.querySelector(".insta-fallback");

  const renderWhenVisible = (render) => {
    if (!("IntersectionObserver" in window)) return render();
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        render();
      }
    }, { rootMargin: "400px" });
    io.observe(instaSection);
  };

  if (posts.length) {
    profileBox.remove();
    fallback.remove();
    renderWhenVisible(() => {
      posts.slice(0, 8).forEach((url) => {
        const cell = document.createElement("div");
        cell.className = "insta-post";
        cell.innerHTML =
          '<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="' +
          url + '" data-instgrm-version="14"></blockquote>';
        grid.appendChild(cell);
      });
      const s = document.createElement("script");
      s.async = true;
      s.src = "https://www.instagram.com/embed.js";
      document.body.appendChild(s);
    });
  } else {
    grid.remove();
    fallback.hidden = true;
    renderWhenVisible(() => {
      const iframe = document.createElement("iframe");
      iframe.src = "https://www.instagram.com/" + username + "/embed";
      iframe.loading = "lazy";
      iframe.title = "Instagram feed for @" + username;
      let settled = false;
      iframe.addEventListener("load", () => { settled = true; });
      setTimeout(() => {
        if (!settled) {
          profileBox.remove();
          fallback.hidden = false;
        }
      }, 6000);
      profileBox.appendChild(iframe);
    });
  }
}

// ----- footer year -----
const yearEl = document.querySelector("[data-year]");
if (yearEl) yearEl.textContent = new Date().getFullYear();
