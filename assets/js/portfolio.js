/* Renders the portfolio grid from assets/data/portfolio.json,
   with optional local drafts saved by the Studio gear. */
(function () {
  const grid = document.querySelector(".work-grid[data-portfolio]");
  if (!grid) return;

  const DRAFT_KEY = "hj-portfolio-draft";
  const CAT_LABEL = {
    performer: "Performer",
    choreographer: "Choreographer",
    educator: "Educator",
    photoshoots: "Photoshoots",
  };

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function creditLine(credit) {
    if (!credit) return "";
    const t = credit.trim();
    if (!t) return "";
    return t.toLowerCase().startsWith("photo") ? t : "Photo: " + t;
  }

  function render(items) {
    grid.innerHTML = items
      .map((item) => {
        const credit = creditLine(item.credit);
        return `
        <figure class="work will-reveal is-visible" data-category="${esc(item.category)}" data-lightbox
                data-title="${esc(item.title)}" data-credit="${esc(credit)}" data-id="${esc(item.id)}">
          <span class="tag">${esc(CAT_LABEL[item.category] || item.category)}</span>
          <img src="${esc(item.src)}" alt="${esc(item.alt || item.title)}" loading="lazy" />
          <figcaption>
            <span class="title">${esc(item.title)}</span>
            <span class="credit">${esc(credit)}</span>
          </figcaption>
        </figure>`;
      })
      .join("");

    // rebind lightbox for newly rendered figures
    if (typeof window.bindLightbox === "function") window.bindLightbox();

    // re-apply active filter
    const active = document.querySelector(".filters button.is-active");
    if (active) active.click();
  }

  async function load() {
    let items = [];
    try {
      const res = await fetch("assets/data/portfolio.json", { cache: "no-store" });
      items = await res.json();
    } catch (e) {
      console.warn("Could not load portfolio.json", e);
    }

    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      if (Array.isArray(draft) && draft.length) items = draft;
    } catch (_) {}

    window.HJ_PORTFOLIO = items;
    render(items);
    document.dispatchEvent(new CustomEvent("hj:portfolio-ready", { detail: items }));
  }

  window.HJ_renderPortfolio = render;
  load();
})();
