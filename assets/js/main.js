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

// ----- hero parallax -----
const heroImg = document.querySelector(".hero__img img");
if (heroImg && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      heroImg.style.translate = "0 " + window.scrollY * 0.22 + "px";
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

// ============================================================
// INSTAGRAM (home page)
// Posts listed in config.js render as a one-at-a-time carousel
// with arrows, dots, and gentle auto-advance. With no posts
// configured, a phone-style profile embed shows instead, and a
// follow card appears if Instagram blocks the embed.
// ============================================================
const instaSection = document.querySelector("[data-instagram]");
if (instaSection) {
  const { username = "hannahjew", posts = [] } = cfg.instagram || {};
  const carousel = instaSection.querySelector(".insta-carousel");
  const wall = instaSection.querySelector(".insta-wall");
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
    wall.remove();
    fallback.remove();
    carousel.hidden = false;
    renderWhenVisible(() => {
      const track = carousel.querySelector(".insta-track");
      const dotsBox = carousel.querySelector(".insta-dots");
      const items = posts.slice(0, 10);
      let index = 0;
      let timer = null;

      items.forEach((url, i) => {
        const slide = document.createElement("div");
        slide.className = "insta-slide";
        slide.innerHTML =
          '<blockquote class="instagram-media" data-instgrm-permalink="' +
          url + '" data-instgrm-version="14"></blockquote>';
        track.appendChild(slide);

        const dot = document.createElement("button");
        dot.setAttribute("aria-label", "Post " + (i + 1));
        dot.addEventListener("click", () => go(i, true));
        dotsBox.appendChild(dot);
      });

      const dots = [...dotsBox.children];
      const go = (i, manual) => {
        index = (i + items.length) % items.length;
        track.style.transform = "translateX(-" + index * 100 + "%)";
        dots.forEach((d, j) => d.classList.toggle("is-active", j === index));
        if (manual) restart();
      };
      const restart = () => {
        clearInterval(timer);
        timer = setInterval(() => go(index + 1), 7000);
      };

      carousel.querySelector(".prev").addEventListener("click", () => go(index - 1, true));
      carousel.querySelector(".next").addEventListener("click", () => go(index + 1, true));
      carousel.addEventListener("pointerenter", () => clearInterval(timer));
      carousel.addEventListener("pointerleave", restart);

      go(0);
      restart();

      const s = document.createElement("script");
      s.async = true;
      s.src = "https://www.instagram.com/embed.js";
      document.body.appendChild(s);
    });
  } else {
    carousel.remove();
    renderWhenVisible(() => {
      const iframe = document.createElement("iframe");
      iframe.src = "https://www.instagram.com/" + username + "/embed";
      iframe.loading = "lazy";
      iframe.title = "Instagram feed for @" + username;
      let settled = false;
      iframe.addEventListener("load", () => { settled = true; });
      setTimeout(() => {
        if (!settled) {
          wall.remove();
          fallback.hidden = false;
        }
      }, 6000);
      profileBox.appendChild(iframe);
    });
  }
}

// ============================================================
// MUSIC
// Erik Satie, Gymnopedie No. 1 (public domain recording by
// Michael Laucke, via Wikimedia Commons). Off by default;
// the visitor's choice is remembered for the session.
// ============================================================
const musicBtn = document.querySelector(".music-toggle");
if (musicBtn) {
  let audio = null;
  const ensureAudio = () => {
    if (!audio) {
      audio = new Audio("assets/audio/gymnopedie-no1.mp3");
      audio.loop = true;
      audio.volume = 0.35;
      // pick up where the previous page left off instead of restarting
      const t = parseFloat(sessionStorage.getItem("hj-music-t") || "0");
      if (t > 0) {
        audio.addEventListener("loadedmetadata", () => {
          if (t < audio.duration) audio.currentTime = t;
        }, { once: true });
      }
      // keep the position fresh so navigation never loses more than a second
      setInterval(() => {
        if (!audio.paused) sessionStorage.setItem("hj-music-t", String(audio.currentTime));
      }, 1000);
      window.addEventListener("pagehide", () => {
        if (!audio.paused) sessionStorage.setItem("hj-music-t", String(audio.currentTime));
      });
    }
    return audio;
  };
  const setState = (playing) => {
    musicBtn.classList.toggle("is-playing", playing);
    musicBtn.setAttribute("aria-pressed", String(playing));
    musicBtn.querySelector(".music-label").textContent = playing ? "Sound on" : "Sound";
    sessionStorage.setItem("hj-music", playing ? "on" : "off");
  };
  musicBtn.addEventListener("click", () => {
    const a = ensureAudio();
    if (a.paused) {
      a.play().then(() => setState(true)).catch(() => setState(false));
    } else {
      a.pause();
      setState(false);
    }
  });
  // resume across pages within the same visit
  if (sessionStorage.getItem("hj-music") === "on") {
    const a = ensureAudio();
    a.play().then(() => setState(true)).catch(() => setState(false));
  }
}

// ----- footer year -----
const yearEl = document.querySelector("[data-year]");
if (yearEl) yearEl.textContent = new Date().getFullYear();
