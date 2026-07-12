/* Hannah Jew 周健倫 · site interactions */

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

// ----- footer year -----
const yearEl = document.querySelector("[data-year]");
if (yearEl) yearEl.textContent = new Date().getFullYear();
