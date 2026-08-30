/* ============================================================
   STUDIO · Hannah edits the real website, in place.

   Tap the gear at the very bottom, enter the passcode, and the
   site itself becomes editable: click any words to type, click
   any photo to swap it, add a photographer name under a photo,
   add or remove photos and shows, and pick the accent colour.
   No forms, no code. Edit mode follows her page to page.
   ============================================================ */
(function () {
  const UNLOCK_KEY = "hj-studio-unlocked";
  const EDITING_KEY = "hj-studio-editing";
  const TOKEN_KEY = "hj-studio-gh-token";

  const cfg = (window.SITE_CONFIG && window.SITE_CONFIG.studio) || {};
  const PIN = String(cfg.pin || "hannah");
  const gh = cfg.github || { owner: "virslaan", repo: "hannahcjew", branch: "main" };

  const PAGES = [
    ["index.html", "Home"],
    ["about.html", "About"],
    ["headshots.html", "Headshots"],
    ["portfolio.html", "Portfolio"],
    ["upcoming.html", "Upcoming"],
    ["contact.html", "Contact"],
  ];

  const LOOKS = [
    ["seal", "Seal"],
    ["noir", "Noir"],
    ["porcelain", "Porcelain"],
    ["crimson", "Crimson"],
    ["jade", "Jade"],
  ];

  const ACCENTS = [
    ["#d7281c", "Seal red"],
    ["#111111", "Ink"],
    ["#1e4fd8", "Cobalt"],
    ["#0f7b6c", "Jade"],
    ["#b8860b", "Gold"],
    ["#c2185b", "Rose"],
  ];

  const CATEGORIES = ["performer", "choreographer", "educator", "photoshoots"];
  const CAT_LABEL = {
    performer: "Performer",
    choreographer: "Choreographer",
    educator: "Educator",
    photoshoots: "Photoshoots",
  };

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];

  let site = null;
  let dirty = false;

  const uid = (p) => p + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  const currentPortfolioCat = () => {
    const btn = document.querySelector("[data-portfolio-filters] .is-active");
    const cats = site.portfolioCategories || [];
    return (btn && btn.dataset.filter) || (cats[0] && cats[0].id) || "performer";
  };
  const slug = (s) =>
    String(s || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48);
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const imageFileName = (item, fallback) => {
    if (!item.id) item.id = uid("img");
    return `${slug(item.title || fallback)}_${item.id}.jpg`;
  };
  const b64of = (dataUrl) => String(dataUrl).split(",")[1] || "";
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let holdLive = false;

  // ----- image handling -------------------------------------------------
  function pickFile(accept, multiple) {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept || "image/*,.heic,.heif";
      if (multiple) input.multiple = true;
      input.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;";
      document.body.appendChild(input);
      const done = (files) => {
        input.remove();
        resolve(files);
      };
      input.addEventListener("change", () => done([...(input.files || [])]), { once: true });
      input.addEventListener("cancel", () => done([]), { once: true });
      input.click();
    });
  }

  function readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = reject;
      r.onload = () => resolve(r.result);
      r.readAsDataURL(file);
    });
  }

  function canvasJpeg(source, sw, sh, maxEdge, quality) {
    const scale = Math.min(1, maxEdge / Math.max(sw, sh));
    const width = Math.max(1, Math.round(sw * scale));
    const height = Math.max(1, Math.round(sh * scale));
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    c.getContext("2d").drawImage(source, 0, 0, width, height);
    return c.toDataURL("image/jpeg", quality);
  }

  async function toWebImage(file, maxEdge = 1400, quality = 0.8) {
    try {
      if (typeof createImageBitmap === "function") {
        const bmp = await createImageBitmap(file);
        const out = canvasJpeg(bmp, bmp.width, bmp.height, maxEdge, quality);
        if (bmp.close) bmp.close();
        return out;
      }
    } catch (_) {}
    const raw = await readAsDataUrl(file);
    if (!/^image\//.test(file.type || "")) return raw;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(canvasJpeg(img, img.naturalWidth || img.width, img.naturalHeight || img.height, maxEdge, quality));
      img.onerror = () => resolve(raw);
      img.src = raw;
    });
  }

  // ----- model helpers --------------------------------------------------
  const get = (path) => window.HJ_getPath(site, path);
  const set = (path, value) => window.HJ_setPath(site, path, value);

  function persistDraft() {
    try {
      localStorage.setItem("hj-site-draft", JSON.stringify(site));
    } catch (_) {
      try {
        const slim = JSON.parse(
          JSON.stringify(site, (k, v) => (typeof v === "string" && v.startsWith("data:") ? "" : v))
        );
        localStorage.setItem("hj-site-draft", JSON.stringify(slim));
      } catch (e) {
        toast("Photos still save to the live site. This phone is too full for a local copy.");
      }
    }
  }

  function touch() {
    dirty = true;
    persistDraft();
    updateBar();
    scheduleLive();
  }

  function rerender() {
    window.HJ_SITE = site;
    window.HJ_hydrateSite(site);
    touch();
    requestAnimationFrame(() => {
      if (isEditing()) armEditing();
    });
  }

  // ----- edit mode ------------------------------------------------------
  const isUnlocked = () => sessionStorage.getItem(UNLOCK_KEY) === "1";
  const isEditing = () => sessionStorage.getItem(EDITING_KEY) === "1";

  function armEditing() {
    document.body.classList.add("hj-edit");

    // 1. text you can click and type
    $$("[data-edit]").forEach((el) => {
      if (el.dataset.armed === "1") return;
      el.dataset.armed = "1";
      el.setAttribute("contenteditable", "true");
      el.setAttribute("spellcheck", "true");

      const readText = () => {
        // innerText keeps Return as a real line break in multiline boxes;
        // textContent would flatten them into one sentence.
        const raw = el.dataset.editMultiline === "1" ? el.innerText : el.textContent;
        return String(raw || "").replace(/\r\n?/g, "\n");
      };

      el.addEventListener("input", () => {
        const value = el.dataset.editMultiline === "1" ? readText() : readText().trim();
        set(el.dataset.edit, value);
        touch();
      });
      el.addEventListener("blur", () => {
        const value = readText().trim();
        set(el.dataset.edit, value);
        if (el.dataset.editMultiline === "1") el.innerText = value;
        touch();
      });
      el.addEventListener("paste", (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData("text/plain");
        document.execCommand("insertText", false, text);
      });
      el.addEventListener("keydown", (e) => {
        // Titles and one-line fields still save on Enter. Credit notes
        // (Composer / Choreographer / Place) keep Return as a new line.
        if (e.key === "Enter" && !e.shiftKey && el.dataset.editMultiline !== "1") {
          e.preventDefault();
          el.blur();
        }
        e.stopPropagation();
      });
      el.addEventListener("click", (e) => e.stopPropagation());
    });

    // 2. photos you can click to replace
    $$("[data-edit-img]").forEach((el) => {
      if (el.dataset.armedImg === "1") return;
      el.dataset.armedImg = "1";
      el.addEventListener("click", async (e) => {
        if (!isEditing()) return;
        e.preventDefault();
        e.stopPropagation();
        const files = await pickFile("image/*");
        if (!files.length) return;
        set(el.dataset.editImg, await toWebImage(files[0]));
        rerender();
      });
    });

    // empty poster slots
    $$("[data-edit-empty-img]").forEach((el) => {
      if (el.dataset.armedImg === "1") return;
      el.dataset.armedImg = "1";
      el.addEventListener("click", async () => {
        const files = await pickFile("image/*");
        if (!files.length) return;
        set(el.dataset.editEmptyImg, await toWebImage(files[0]));
        rerender();
      });
    });

    // 3. category dropdown on each portfolio photo
    $$("[data-edit-cat]").forEach((sel) => {
      if (sel.dataset.armedCat === "1") return;
      sel.dataset.armedCat = "1";
      sel.addEventListener("change", () => {
        set(sel.dataset.editCat, sel.value);
        const fig = sel.closest("[data-category]");
        if (fig) fig.dataset.category = sel.value;
        const tag = fig && fig.querySelector(".tag");
        const opt = sel.selectedOptions[0];
        if (tag && opt) tag.textContent = opt.textContent;
        touch();
        if (typeof window.HJ_applyPortfolioFilter === "function") window.HJ_applyPortfolioFilter();
      });
    });

    // 4. link fields (ticket links, video links, anything else)
    $$("[data-edit-href]").forEach((el) => {
      if (el.dataset.armedHref === "1") return;
      el.dataset.armedHref = "1";
      el.addEventListener("click", (e) => {
        if (!isEditing()) return;
        e.preventDefault();
        e.stopPropagation();
        const path = el.dataset.editHref;
        const promptText =
          el.dataset.prompt ||
          "Paste the link. Leave it blank to remove it.";
        const next = prompt(promptText, get(path) || "");
        if (next == null) return;
        set(path, next.trim());
        rerender();
      });
    });

    // 5. per-item controls, list add buttons, resume swap
    decorateItems();
    decorateLists();
    decorateResume();
    decorateCategoryBar();
    decorateNav();
    decoratePortfolioLayout();
    decorateWorkShape();
    decorateRemove();
  }

  function decorateNav() {
    const header = $(".nav__links");
    if (!header) return;
    site.nav = Array.isArray(site.nav) && site.nav.length ? site.nav : [
      { href: "about.html", label: "About" },
      { href: "headshots.html", label: "Headshots & Resume" },
      { href: "portfolio.html", label: "Portfolio" },
      { href: "upcoming.html", label: "Upcoming" },
      { href: "contact.html", label: "Contact" },
    ];

    header.querySelectorAll("[data-nav-href]").forEach((a) => {
      if (a.dataset.armedNav === "1") return;
      a.dataset.armedNav = "1";
      a.addEventListener("click", (e) => {
        if (!isEditing()) return;
        e.preventDefault();
        e.stopPropagation();
        const href = a.dataset.navHref;
        const item = site.nav.find((n) => n.href === href);
        if (!item) return;
        const next = prompt("Rename this tab. The page stays the same — this only changes the label.", item.label || "");
        if (next == null) return;
        const label = next.trim();
        if (!label) return;
        item.label = label;
        rerender();
      });
    });

    header.querySelectorAll("[data-nav-hide]").forEach((btn) => {
      if (btn.dataset.armedNavHide === "1") return;
      btn.dataset.armedNavHide = "1";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isEditing()) return;
        const href = btn.dataset.navHide;
        const item = site.nav.find((n) => n.href === href);
        if (!item) return;
        const visible = site.nav.filter((n) => !n.hidden);
        if (!item.hidden && visible.length <= 1) {
          toast("Keep at least one tab in the menu.");
          return;
        }
        item.hidden = !item.hidden;
        rerender();
      });
    });
  }

  // the resume PDF gets its own button beside the download link
  function decorateResume() {
    const anchor = $("main [data-resume-pdf]");
    if (!anchor || $(".hj-add[data-resume]")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "hj-add";
    btn.dataset.resume = "1";
    btn.textContent = "↻ Replace resume PDF";
    btn.addEventListener("click", async () => {
      const files = await pickFile("application/pdf");
      if (!files.length) return;
      site.resume = site.resume || {};
      site.resume.pdf = await readAsDataUrl(files[0]);
      rerender();
      toast("New resume loaded. It shows up on the live site in 1–2 minutes.");
    });
    anchor.insertAdjacentElement("afterend", btn);
  }

  function decorateCategoryBar() {
    const bar = $("[data-portfolio-filters]");
    if (!bar) return;

    $$("[data-remove-cat]", bar).forEach((btn) => {
      if (btn.dataset.armedRmCat === "1") return;
      btn.dataset.armedRmCat = "1";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.dataset.removeCat;
        const cats = site.portfolioCategories || [];
        if (cats.length <= 1) {
          toast("Keep at least one tab.");
          return;
        }
        const cat = cats.find((c) => c.id === id);
        if (!cat) return;
        const n = (site.portfolio || []).filter((p) => (p.category || "") === id).length;
        const extra = n
          ? ` ${n} item${n === 1 ? "" : "s"} stay saved and will show again if you add this tab later.`
          : " You can add it again later.";
        if (!confirm(`Remove the “${cat.label}” tab?` + extra)) return;
        site.portfolioCategories = cats.filter((c) => c.id !== id);
        rerender();
      });
    });

    if ($(".hj-add[data-add-cat]")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "hj-add hj-add--copy";
    btn.dataset.addCat = "1";
    btn.textContent = "+ Add tab";
    btn.addEventListener("click", () => {
      const label = (prompt("New tab name", "") || "").trim();
      if (!label) return;
      const id = slug(label);
      site.portfolioCategories = site.portfolioCategories || [];
      if (site.portfolioCategories.some((c) => c.id === id)) {
        toast("That tab is already there.");
        return;
      }
      site.portfolioCategories.push({ id, label });
      rerender();
    });
    bar.insertAdjacentElement("afterend", btn);
  }

  function decoratePortfolioLayout() {
    const grid = $(".work-grid[data-portfolio]");
    if (!grid || $(".hj-layout")) return;
    site.portfolioLayout = site.portfolioLayout || { columns: 3 };
    const cols = String(site.portfolioLayout.columns || 3);
    const wrap = document.createElement("div");
    wrap.className = "hj-layout";
    wrap.innerHTML = `
      <span>Columns</span>
      ${[2, 3, 4].map((n) => `<button type="button" data-cols="${n}" class="${String(n) === cols ? "is-on" : ""}">${n}</button>`).join("")}
      <span class="hj-layout__hint">Use the arrows to reorder, or drag the grip on a photo. Tall / wide / square and 1–3 on each photo.</span>`;
    wrap.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cols]");
      if (!btn) return;
      site.portfolioLayout = site.portfolioLayout || {};
      site.portfolioLayout.columns = +btn.dataset.cols;
      rerender();
    });
    const addCat = $("[data-add-cat]");
    (addCat || grid).insertAdjacentElement(addCat ? "afterend" : "beforebegin", wrap);
  }

  function removeListItem(el) {
    const host = el.closest("[data-edit-item]");
    if (!host) return;
    const { list, index } = itemInfo(host);
    if (list == null || index == null) return;
    const arr = get(list);
    if (!Array.isArray(arr) || index < 0 || index >= arr.length) return;
    arr.splice(index, 1);
    set(list, arr);
    rerender();
  }

  function decorateRemove() {
    $$("[data-remove]").forEach((btn) => {
      if (btn.dataset.armedRemove === "1") return;
      btn.dataset.armedRemove = "1";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        removeListItem(btn);
      });
    });
  }

  function decorateWorkShape() {
    $$(".work-shape").forEach((row) => {
      if (row.dataset.armedShape === "1") return;
      row.dataset.armedShape = "1";
      row.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn || (!btn.dataset.orient && !btn.dataset.span)) return;
        e.preventDefault();
        e.stopPropagation();
        const fig = row.closest("[data-edit-item]");
        const { index } = itemInfo(fig);
        const item = (site.portfolio || [])[index];
        if (!item) return;
        if (btn.dataset.orient) item.orient = btn.dataset.orient;
        if (btn.dataset.span) item.span = +btn.dataset.span;
        rerender();
      });
    });
  }

  function disarmEditing() {
    document.body.classList.remove("hj-edit");
    $$("[data-edit]").forEach((el) => el.removeAttribute("contenteditable"));
    $$(".hj-item-tools, .hj-add, .hj-layout, .hj-edit-hint").forEach((el) => el.remove());
  }

  function itemInfo(el) {
    const list = el.dataset.editItem;
    let index = el.dataset.index;
    if (index == null) {
      const path = el.dataset.edit || "";
      const last = path.split(".").pop();
      index = /^\d+$/.test(last) ? last : null;
    }
    return { list, index: index == null ? null : +index };
  }

  function itemCategory(item) {
    const cats = site.portfolioCategories || [];
    return (item && item.category) || (cats[0] && cats[0].id) || "performer";
  }

  function indexesInCategory(arr, cat) {
    return arr.map((_, i) => i).filter((i) => itemCategory(arr[i]) === cat);
  }

  function reorderInCategory(arr, fromIndex, toIndex) {
    const cat = itemCategory(arr[fromIndex]);
    if (itemCategory(arr[toIndex]) !== cat) return false;
    const idxs = indexesInCategory(arr, cat);
    const fromP = idxs.indexOf(fromIndex);
    const toP = idxs.indexOf(toIndex);
    if (fromP < 0 || toP < 0 || fromP === toP) return false;
    const slice = idxs.map((i) => arr[i]);
    const [moved] = slice.splice(fromP, 1);
    slice.splice(toP, 0, moved);
    idxs.forEach((i, k) => {
      arr[i] = slice[k];
    });
    return true;
  }

  function nudgeInCategory(arr, index, dir) {
    const idxs = indexesInCategory(arr, itemCategory(arr[index]));
    const pos = idxs.indexOf(index);
    const next = idxs[pos + dir];
    if (next == null) return false;
    return reorderInCategory(arr, index, next);
  }

  function decorateItems() {
    $$("[data-edit-item]").forEach((el) => {
      if ($(".hj-item-tools", el)) return;
      const { list, index } = itemInfo(el);
      if (list == null || index == null) return;

      const isCopy = list === "about.paragraphs" || list === "home.paragraphs";
      const tools = document.createElement("div");
      tools.className = isCopy ? "hj-item-tools hj-item-tools--row" : "hj-item-tools";
      tools.contentEditable = "false";
      const ic = (name) => (window.HJ_icon ? window.HJ_icon(name, 15) : name);
      const drag = list === "portfolio" ? `<button type="button" data-grip title="Drag to reorder">${ic("grip")}</button>` : "";
      tools.innerHTML = `
        ${drag}
        <button type="button" data-move="-1" title="Move earlier">${ic("up")}</button>
        <button type="button" data-move="1" title="Move later">${ic("down")}</button>
        <button type="button" data-del title="Remove">${ic("close")}</button>`;

      tools.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn || btn.hasAttribute("data-grip")) return;
        e.preventDefault();
        e.stopPropagation();
        const live = itemInfo(el);
        const arr = get(live.list) || [];
        const idx = live.index;
        if (btn.hasAttribute("data-del")) {
          removeListItem(el);
          return;
        }
        const dir = +btn.dataset.move;
        const ok = live.list === "portfolio" ? nudgeInCategory(arr, idx, dir) : (() => {
          const to = idx + dir;
          if (to < 0 || to >= arr.length) return false;
          [arr[to], arr[idx]] = [arr[idx], arr[to]];
          return true;
        })();
        if (!ok) return;
        set(live.list, arr);
        rerender();
      });

      if (list === "portfolio") {
        const grip = $("[data-grip]", tools);
        grip.draggable = true;
        grip.addEventListener("dragstart", (e) => {
          e.stopPropagation();
          e.dataTransfer.setData("text/plain", String(index));
          e.dataTransfer.effectAllowed = "move";
          el.classList.add("is-dragging");
        });
        grip.addEventListener("dragend", () => el.classList.remove("is-dragging"));
        el.addEventListener("dragover", (e) => {
          e.preventDefault();
          el.classList.add("is-drop");
        });
        el.addEventListener("dragleave", () => el.classList.remove("is-drop"));
        el.addEventListener("drop", (e) => {
          e.preventDefault();
          e.stopPropagation();
          el.classList.remove("is-drop");
          const from = +e.dataTransfer.getData("text/plain");
          const to = +el.dataset.index;
          const arr = get("portfolio") || [];
          if (!reorderInCategory(arr, from, to)) {
            toast("Drop it on a photo in the same tab.");
            return;
          }
          set("portfolio", arr);
          rerender();
        });
      }

      // Paragraphs keep tools under the text so arrows never cover what she is typing.
      if (!isCopy && getComputedStyle(el).position === "static") el.style.position = "relative";
      el.appendChild(tools);
    });
  }

  const LIST_ADD = {
    "about.paragraphs": { label: "+ Add paragraph", make: () => "New paragraph. Click to write." },
    "home.paragraphs": { label: "+ Add paragraph", make: () => "New paragraph. Click to write." },
    portfolio: {
      label: "+ Add photos",
      photo: true,
      folder: "assets/img/portfolio",
      make: (src, name) => {
        const parts = String(name || "").replace(/\.[^.]+$/, "").split("_");
        const credit = parts.length >= 3 ? parts[parts.length - 1].replace(/-+/g, " ") : "";
        const title =
          parts.length >= 3
            ? parts.slice(0, -2).join(" ").replace(/-+/g, " ")
            : String(name || "New photo").replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
        return {
          id: uid("p"),
          src,
          title: title.trim() || "New photo",
          credit: credit.trim(),
          category: currentPortfolioCat(),
          orient: "portrait",
          span: 1,
          alt: title.trim() || "Portfolio photo",
        };
      },
    },
    headshots: {
      label: "+ Add headshots",
      photo: true,
      folder: "assets/img/headshots",
      make: (src) => ({ id: uid("hs"), src, title: "Hannah Jew", credit: "", alt: "Headshot of Hannah Jew" }),
    },
    upcoming: {
      label: "+ Add another show",
      make: () => ({
        id: uid("show"),
        title: "New show",
        role: "",
        venue: "",
        month: "TBA",
        year: String(new Date().getFullYear()),
        onsale: "",
        info: "",
        tickets: "",
        poster: "",
        posterAlt: "",
        featured: false,
      }),
    },
  };

  // Add a video the same way a photo is added: it becomes its own tile in
  // the portfolio grid, with a YouTube thumbnail baked in when possible.
  async function addPortfolioVideo() {
    const url = prompt("Paste a YouTube or Vimeo link for this video:", "");
    if (url == null) return;
    const clean = String(url).trim();
    if (!clean) return;
    const title = prompt(
      "Title for this video? (shown under the thumbnail — e.g. the piece name)",
      ""
    );
    if (title == null) return;
    const notes = prompt(
      "Notes? (optional — credits, cast, description. Leave blank to skip.)",
      ""
    );
    if (notes == null) return;
    const cover =
      (typeof window.HJ_youtubeThumb === "function" ? window.HJ_youtubeThumb(clean) : "") ||
      window.HJ_VIDEO_PLACEHOLDER ||
      "";
    const item = {
      id: uid("v"),
      video: clean,
      src: cover,
      title: String(title).trim() || "Video",
      credit: "",
      notes: String(notes).trim(),
      category: currentPortfolioCat(),
      orient: "portrait",
      span: 1,
      alt: (String(title).trim() || "Video") + " (video)",
    };
    const arr = (get("portfolio") || []).slice();
    arr.unshift(item);
    set("portfolio", arr);
    window.HJ_SITE = site;
    window.HJ_hydrateSite(site);
    if (isEditing()) armEditing();
    persistDraft();
    updateBar();
    toast("Video added. Click the play button on the tile to watch it. To swap the cover image, click the thumbnail in edit mode.");

    const token = liveToken();
    if (!token) {
      dirty = true;
      updateBar();
      return;
    }
    try {
      await ghPut("assets/data/site.json", jsonB64(site), token, "Add portfolio video");
      await ghPut(
        "assets/data/portfolio.json",
        jsonB64(site.portfolio || []),
        token,
        "Sync portfolio.json"
      );
      window.HJ_clearSiteDraft();
      dirty = false;
    } catch (err) {
      console.error("save video failed", err);
      dirty = true;
      scheduleLive();
    }
    updateBar();
  }

  async function addPhotos(path, conf, files) {
    holdLive = true;
    const arr = (get(path) || []).slice();
    if (!Array.isArray(site[path])) site[path] = arr;
    const token = liveToken();
    const folder = conf.folder || "assets/img";
    const total = files.length;
    const state = $(".studio-bar [data-state]");
    const say = (m) => { if (state) state.textContent = m; };
    toast(total === 1 ? "Adding photo…" : "Adding " + total + " photos…");

    let ok = 0;
    let failed = 0;
    for (let i = 0; i < total; i++) {
      const f = files[i];
      say(`Photo ${i + 1} of ${total}…`);
      try {
        const dataUrl = await toWebImage(f);
        const item = conf.make(dataUrl, f.name);
        if (!item.id) item.id = uid(path === "headshots" ? "hs" : "p");
        if (token && String(item.src || "").startsWith("data:")) {
          const p = folder + "/" + imageFileName(item, path === "headshots" ? "headshot" : "photo");
          say(`Uploading ${i + 1} of ${total}…`);
          await ghPut(p, b64of(item.src), token, "Add image " + p);
          item.src = p;
        }
        arr.unshift(item);
        set(path, arr);
        window.HJ_SITE = site;
        window.HJ_hydrateSite(site);
        if (isEditing()) armEditing();
        ok += 1;
      } catch (err) {
        console.error("upload photo failed", err);
        failed += 1;
        toast("Could not upload " + (f.name || "one photo") + ".");
      }
    }

    holdLive = false;
    persistDraft();
    updateBar();

    if (!ok) return;

    if (!token) {
      toast(ok + " added locally. Sign in to publish to the live site.");
      dirty = true;
      updateBar();
      return;
    }

    say("Saving list…");
    try {
      await ghPut("assets/data/site.json", jsonB64(site), token, "Update site content from Studio");
      if (path === "portfolio") {
        await ghPut("assets/data/portfolio.json", jsonB64(site.portfolio || []), token, "Sync portfolio.json");
      }
      window.HJ_clearSiteDraft();
      dirty = false;
      savedThisSession = true;
      say(SAVED_LABEL);
      toast(
        (ok === 1 ? "Photo added." : ok + " photos added.") +
          (failed ? " " + failed + " could not upload." : "") +
          " They show up on the live site in 1–2 minutes."
      );
      setTimeout(() => { if (state && state.textContent === SAVED_LABEL) state.textContent = ""; }, 8000);
    } catch (err) {
      console.error("save list failed", err);
      say("Not saved");
      toast("Photos uploaded but the list did not save. It will retry.");
      dirty = true;
      scheduleLive();
    }
  }

  function decorateLists() {
    $$("[data-edit-list]").forEach((listEl) => {
      const path = listEl.dataset.editList;
      const conf = LIST_ADD[path];
      if (!conf) return;
      if ($(`.hj-add[data-add-list="${path}"]`)) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = conf.photo ? "hj-add" : "hj-add hj-add--copy";
      btn.dataset.addList = path;
      btn.contentEditable = "false";
      btn.textContent = conf.label;
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        if (conf.photo) {
          const files = await pickFile("image/*,.heic,.heif", true);
          if (!files.length) return;
          await addPhotos(path, conf, files);
          return;
        }
        const arr = get(path) || [];
        arr.push(conf.make());
        set(path, arr);
        rerender();
      });
      listEl.insertAdjacentElement("afterend", btn);
      if (path === "portfolio") {
        const vbtn = document.createElement("button");
        vbtn.type = "button";
        vbtn.className = "hj-add hj-add--video";
        vbtn.contentEditable = "false";
        vbtn.textContent = "+ Add video";
        vbtn.addEventListener("click", (e) => {
          e.preventDefault();
          addPortfolioVideo();
        });
        btn.insertAdjacentElement("afterend", vbtn);
      }
      if (conf.photo) {
        const hint = document.createElement("p");
        hint.className = "hj-edit-hint";
        hint.textContent =
          path === "portfolio"
            ? "Tap + Add photos to upload any number of images at once. Tap + Add video to paste a YouTube or Vimeo link — it becomes its own tile with a thumbnail. Click any thumbnail to swap the cover, or click the ▶ to play."
            : "Tap to add. In the photo picker, select as many pictures as you want at once.";
        btn.insertAdjacentElement("afterend", hint);
      }
      if (path === "upcoming") {
        const hint = document.createElement("p");
        hint.className = "hj-edit-hint";
        hint.textContent =
          "Tap + Add another show for a new row. Click any words to type extra info. Tap Add ticket link to paste a URL.";
        btn.insertAdjacentElement("afterend", hint);
      }
    });
  }

  // ----- publishing -----------------------------------------------------
  async function ghPut(path, b64, token, message) {
    const api = `https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/${path}`;
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    let lastErr = "upload failed";
    for (let attempt = 0; attempt < 4; attempt++) {
      if (attempt) await sleep(350 * attempt);
      let sha;
      const meta = await fetch(`${api}?ref=${gh.branch || "main"}`, { headers });
      if (meta.ok) sha = (await meta.json()).sha;
      const res = await fetch(api, {
        method: "PUT",
        headers,
        body: JSON.stringify({ message, content: b64, branch: gh.branch || "main", ...(sha ? { sha } : {}) }),
      });
      if (res.ok) return;
      lastErr = await res.text();
      const retryable = res.status === 409 || res.status === 422 || res.status === 429 || res.status >= 500;
      if (!retryable) break;
    }
    throw new Error(lastErr);
  }

  function liveToken() {
    const t = (gh.token || "").trim();
    if (t && t !== "__STUDIO_TOKEN__") return t;
    try {
      const saved = localStorage.getItem(TOKEN_KEY) || "";
      if (saved) return saved;
    } catch (e) {}
    return (sessionStorage.getItem(TOKEN_KEY) || "").trim();
  }

  let liveTimer = null;
  let liveBusy = false;
  let liveAgain = false;
  // GitHub Pages needs a moment to rebuild, so the bar says "saved" rather than
  // "live" until the rebuild has realistically finished.
  const SAVED_LABEL = "Saved · live in 1–2 min";
  let savedThisSession = false;

  function scheduleLive() {
    if (holdLive) return;
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => pushLive(), 1600);
    updateBar();
  }

  async function pushLive() {
    const token = liveToken();
    if (!token) {
      updateBar();
      return;
    }
    if (liveBusy) {
      liveAgain = true;
      return;
    }
    liveBusy = true;
    const say = (m) => {
      const state = $(".studio-bar [data-state]");
      if (state) state.textContent = m;
    };
    try {
      say("Saving…");
      await publish(token, say);
      savedThisSession = true;
      say(SAVED_LABEL);
      toast("Saved. Your changes show up on the live site in 1–2 minutes.");
      setTimeout(() => {
        const state = $(".studio-bar [data-state]");
        if (state && state.textContent === SAVED_LABEL) state.textContent = "";
      }, 8000);
    } catch (err) {
      console.error(err);
      say("Could not save");
      toast("Could not save to the live site. Try once more.");
    } finally {
      liveBusy = false;
      updateBar();
      if (liveAgain) {
        liveAgain = false;
        scheduleLive();
      }
    }
  }
  const jsonB64 = (obj) => btoa(unescape(encodeURIComponent(JSON.stringify(obj, null, 2))));

  async function publish(token, say) {
    if (site.resume && String(site.resume.pdf || "").startsWith("data:")) {
      say("Uploading resume…");
      await ghPut("assets/resume/Hannah-Jew-Resume.pdf", b64of(site.resume.pdf), token, "Update resume PDF");
      site.resume.pdf = "assets/resume/Hannah-Jew-Resume.pdf";
    }

    const uploads = [
      ["portfolio", "assets/img/portfolio", (i) => imageFileName(i, "photo"), "src"],
      ["headshots", "assets/img/headshots", (i) => imageFileName(i, "headshot"), "src"],
      ["upcoming", "assets/img/shows", (i) => imageFileName(i, "show"), "poster"],
    ];
    for (const [listKey, folder, nameFn, field] of uploads) {
      for (const item of site[listKey] || []) {
        if (String(item[field] || "").startsWith("data:image")) {
          const p = `${folder}/${nameFn(item)}`;
          say(`Uploading ${item.title || "photo"}…`);
          await ghPut(p, b64of(item[field]), token, `Add image ${p}`);
          item[field] = p;
        }
      }
    }

    const singles = [
      [site.home, "heroImage", "hero"],
      [site.home, "introImage", "intro"],
      [site.about, "cover", "about-cover"],
      [site.about, "image", "about"],
      [site.resume, "cover", "headshots-cover"],
      [site.contact, "image", "contact"],
    ];
    for (const [obj, key, label] of singles) {
      if (obj && String(obj[key] || "").startsWith("data:image")) {
        const p = `assets/img/${label}_${uid("img")}.jpg`;
        say(`Uploading ${label} photo…`);
        await ghPut(p, b64of(obj[key]), token, `Update ${label} image`);
        obj[key] = p;
      }
    }

    say("Saving content…");
    await ghPut("assets/data/site.json", jsonB64(site), token, "Update site content from Studio");
    await ghPut("assets/data/portfolio.json", jsonB64(site.portfolio || []), token, "Sync portfolio.json");

    window.HJ_clearSiteDraft();
    dirty = false;
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function exportEverything() {
    const copy = JSON.parse(JSON.stringify(site));
    const dl = (dataUrl, filename) => {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      a.click();
    };
    if (String(copy.resume?.pdf || "").startsWith("data:")) {
      dl(copy.resume.pdf, "Hannah-Jew-Resume.pdf");
      copy.resume.pdf = "assets/resume/Hannah-Jew-Resume.pdf";
    }
    const lists = [
      ["portfolio", "assets/img/portfolio", (i) => imageFileName(i, "photo"), "src"],
      ["headshots", "assets/img/headshots", (i) => imageFileName(i, "headshot"), "src"],
      ["upcoming", "assets/img/shows", (i) => imageFileName(i, "show"), "poster"],
    ];
    lists.forEach(([key, folder, nameFn, field]) => {
      (copy[key] || []).forEach((item) => {
        if (String(item[field] || "").startsWith("data:image")) {
          const name = nameFn(item);
          dl(item[field], name);
          item[field] = `${folder}/${name}`;
        }
      });
    });
    [
      [copy.home, "heroImage", "hero"],
      [copy.home, "introImage", "intro"],
      [copy.about, "cover", "about-cover"],
      [copy.about, "image", "about"],
      [copy.resume, "cover", "headshots-cover"],
      [copy.contact, "image", "contact"],
    ].forEach(([obj, key, label]) => {
      if (obj && String(obj[key] || "").startsWith("data:image")) {
        const name = `${label}_${uid("img")}.jpg`;
        dl(obj[key], name);
        obj[key] = `assets/img/${name}`;
      }
    });
    downloadBlob(new Blob([JSON.stringify(copy, null, 2)], { type: "application/json" }), "site.json");
  }

  // ----- chrome: gear, passcode, edit bar --------------------------------
  function gearSvg() {
    return `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/>
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.86l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.08V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.86.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.08-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.86l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8.5 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.08V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 .4 1.08 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.86-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 8.5a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.08.4H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.08.4 1.7 1.7 0 0 0-.43 1.1Z"/>
    </svg>`;
  }

  // the gear tucks into the footer bar, quiet enough that visitors slide past it
  function buildGear() {
    if ($(".studio-gear")) return;
    const gear = document.createElement("button");
    gear.type = "button";
    gear.className = "studio-gear";
    gear.title = "Edit this site";
    gear.setAttribute("aria-label", "Edit this site");
    gear.innerHTML = gearSvg();
    gear.addEventListener("click", () => {
      if (!isUnlocked()) return askPin();
      startEditing();
    });
    ($(".footer__bottom") || $(".footer") || document.body).appendChild(gear);
  }

  function askPin() {
    const wrap = document.createElement("div");
    wrap.className = "studio-lock";
    wrap.innerHTML = `
      <div class="studio-lock__card" role="dialog" aria-modal="true" aria-label="Passcode">
        <p class="studio-lock__kicker">Site studio</p>
        <h2>Edit your website</h2>
        <p class="studio-lock__help">Enter your passcode, then click anything on the page to change it. It saves by itself, and your changes show up on the live site in 1–2 minutes.</p>
        <input type="password" placeholder="Passcode" autocomplete="current-password" />
        <div class="studio-lock__actions">
          <button type="button" data-go class="btn btn--red">Start editing</button>
          <button type="button" data-cancel class="btn">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    const input = $("input", wrap);
    input.focus();
    const close = () => wrap.remove();
    const go = () => {
      if (input.value.trim() === PIN) {
        sessionStorage.setItem(UNLOCK_KEY, "1");
        close();
        startEditing();
      } else {
        wrap.classList.add("is-wrong");
        input.select();
        setTimeout(() => wrap.classList.remove("is-wrong"), 600);
      }
    };
    $("[data-go]", wrap).onclick = go;
    $("[data-cancel]", wrap).onclick = close;
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") go();
      if (e.key === "Escape") close();
    });
  }

  function startEditing() {
    sessionStorage.setItem(EDITING_KEY, "1");
    savedThisSession = false;
    buildBar();
    armEditing();
    toast("Edit mode on. Click any words or photo to change it. It saves by itself.");
  }

  function stopEditing() {
    sessionStorage.removeItem(EDITING_KEY);
    disarmEditing();
    const bar = $(".studio-bar");
    if (bar) bar.remove();
  }

  function toast(msg) {
    let t = $(".studio-toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "studio-toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("is-on");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("is-on"), 3200);
  }

  function currentPage() {
    const f = location.pathname.split("/").pop() || "index.html";
    return f === "" ? "index.html" : f;
  }

  function buildBar() {
    if ($(".studio-bar")) return;
    const here = currentPage();
    const bar = document.createElement("div");
    bar.className = "studio-bar";
    bar.innerHTML = `
      <div class="studio-bar__pages">
        ${PAGES.map(
          ([href, label]) =>
            `<a href="${href}" class="${href === here ? "is-here" : ""}">${label}</a>`
        ).join("")}
      </div>
      <div class="studio-bar__look">
        <span>Look</span>
        <select data-look aria-label="Site look">
          ${LOOKS.map(([id, label]) => `<option value="${id}">${label}</option>`).join("")}
        </select>
      </div>
      <div class="studio-bar__accent">
        <span>Accent</span>
        ${ACCENTS.map(
          ([hex, name]) => `<button type="button" class="studio-swatch" data-accent="${hex}" title="${name}" style="background:${hex}"></button>`
        ).join("")}
        <label class="studio-swatch studio-swatch--custom" title="Custom colour">
          <input type="color" data-accent-custom />
        </label>
      </div>
      <div class="studio-bar__actions">
        <span class="studio-bar__state" data-state></span>
        <button type="button" class="btn" data-undo>Undo all</button>
        <button type="button" class="btn" data-done>Done</button>
      </div>`;
    document.body.appendChild(bar);

    const look = $("[data-look]", bar);
    look.value = (site.theme && site.theme.name) || "seal";
    look.onchange = () => {
      site.theme = site.theme || {};
      site.theme.name = look.value;
      if (typeof window.HJ_applyTheme === "function") window.HJ_applyTheme(look.value, look);
      touch();
    };

    $$("[data-accent]", bar).forEach((btn) => {
      btn.onclick = () => {
        site.theme = site.theme || {};
        site.theme.accent = btn.dataset.accent;
        window.HJ_applyAccent(site);
        touch();
      };
    });
    const custom = $("[data-accent-custom]", bar);
    custom.value = (site.theme && site.theme.accent) || "#d7281c";
    custom.oninput = () => {
      site.theme = site.theme || {};
      site.theme.accent = custom.value;
      window.HJ_applyAccent(site);
      touch();
    };

    $("[data-done]", bar).onclick = () => {
      stopEditing();
      if (dirty) {
        clearTimeout(liveTimer);
        pushLive();
        toast("Saving. Your changes show up on the live site in 1–2 minutes.");
      } else if (savedThisSession) {
        toast("All saved. Your changes show up on the live site in 1–2 minutes.");
      } else {
        toast("Edit mode off.");
      }
    };

    $("[data-undo]", bar).onclick = async () => {
      if (!confirm("Undo every change since the last save to the live site?")) return;
      window.HJ_clearSiteDraft();
      site = await window.HJ_loadSite();
      window.HJ_hydrateSite(site);
      dirty = false;
      requestAnimationFrame(armEditing);
      toast("Back to the live version.");
    };

    updateBar();
  }

  function updateBar() {
    const state = $(".studio-bar [data-state]");
    if (!state) return;
    if (liveBusy) {
      if (!state.textContent || state.textContent === "Saving…") state.textContent = "Saving…";
      return;
    }
    if (liveTimer) {
      state.textContent = "Saving…";
      return;
    }
    if (dirty) state.textContent = "Saving…";
    else if (state.textContent === "Saving…") state.textContent = "";
  }

  // ----- boot -----------------------------------------------------------
  async function boot() {
    site = window.HJ_SITE || (await window.HJ_loadSite());
    dirty = window.HJ_hasDraft();
    buildGear();
    if (isUnlocked() && isEditing()) {
      buildBar();
      armEditing();
    }
  }

  document.addEventListener("hj:site-ready", () => {
    site = window.HJ_SITE;
    if (isEditing()) requestAnimationFrame(armEditing);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
