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
  const slug = (s) =>
    String(s || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48);
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // ----- image handling -------------------------------------------------
  function pickFile(accept, multiple) {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.multiple = !!multiple;
      input.onchange = () => resolve([...(input.files || [])]);
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

  // shrink photos in the browser so the site stays fast
  async function toWebImage(file, maxEdge = 1600, quality = 0.84) {
    const raw = await readAsDataUrl(file);
    if (!/^image\//.test(file.type)) return raw;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, maxEdge / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const c = document.createElement("canvas");
        c.width = width;
        c.height = height;
        c.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(raw);
      img.src = raw;
    });
  }

  // ----- model helpers --------------------------------------------------
  const get = (path) => window.HJ_getPath(site, path);
  const set = (path, value) => window.HJ_setPath(site, path, value);

  function touch() {
    dirty = true;
    localStorage.setItem("hj-site-draft", JSON.stringify(site));
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
      el.setAttribute("contenteditable", "plaintext-only");
      el.setAttribute("spellcheck", "true");

      el.addEventListener("input", () => {
        set(el.dataset.edit, el.textContent.trim());
        touch();
      });
      el.addEventListener("blur", () => {
        set(el.dataset.edit, el.textContent.trim());
        touch();
      });
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
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

    // 3. category chips cycle through the four sections
    $$("[data-edit-choice]").forEach((el) => {
      if (el.dataset.armedChoice === "1") return;
      el.dataset.armedChoice = "1";
      el.removeAttribute("contenteditable");
      el.title = "Click to change section";
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const path = el.dataset.edit;
        const current = get(path);
        const next = CATEGORIES[(CATEGORIES.indexOf(current) + 1) % CATEGORIES.length];
        set(path, next);
        el.textContent = CAT_LABEL[next];
        const fig = el.closest("[data-category]");
        if (fig) fig.dataset.category = next;
        touch();
      });
    });

    // 4. ticket links
    $$("[data-edit-href]").forEach((el) => {
      if (el.dataset.armedHref === "1") return;
      el.dataset.armedHref = "1";
      el.addEventListener("click", (e) => {
        if (!isEditing()) return;
        e.preventDefault();
        const path = el.dataset.editHref;
        const next = prompt("Paste the ticket webpage link. Leave it blank if tickets are not up yet.", get(path) || "");
        if (next == null) return;
        set(path, next.trim());
        rerender();
      });
    });

    // 5. per-item controls, list add buttons, resume swap
    decorateItems();
    decorateLists();
    decorateResume();
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
      toast("New resume loaded. It will go live in about a minute.");
    });
    anchor.insertAdjacentElement("afterend", btn);
  }

  function disarmEditing() {
    document.body.classList.remove("hj-edit");
    $$("[data-edit]").forEach((el) => el.removeAttribute("contenteditable"));
    $$(".hj-item-tools, .hj-add").forEach((el) => el.remove());
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

  function decorateItems() {
    $$("[data-edit-item]").forEach((el) => {
      if ($(".hj-item-tools", el)) return;
      const { list, index } = itemInfo(el);
      if (list == null || index == null) return;

      const tools = document.createElement("div");
      tools.className = "hj-item-tools";
      tools.contentEditable = "false";
      tools.innerHTML = `
        <button type="button" data-move="-1" title="Move up">↑</button>
        <button type="button" data-move="1" title="Move down">↓</button>
        <button type="button" data-del title="Remove">✕</button>`;

      tools.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        const arr = get(list) || [];
        if (btn.hasAttribute("data-del")) {
          const label = typeof arr[index] === "string" ? arr[index] : arr[index] && arr[index].title;
          if (!confirm(`Remove “${label || "this item"}”?`)) return;
          arr.splice(index, 1);
        } else {
          const to = index + +btn.dataset.move;
          if (to < 0 || to >= arr.length) return;
          [arr[to], arr[index]] = [arr[index], arr[to]];
        }
        set(list, arr);
        rerender();
      });

      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      el.appendChild(tools);
    });
  }

  const LIST_ADD = {
    "about.paragraphs": { label: "+ Add paragraph", make: () => "New paragraph. Click to write." },
    portfolio: {
      label: "+ Add photos",
      photo: true,
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
          category: "photoshoots",
          alt: title.trim() || "Portfolio photo",
        };
      },
    },
    headshots: {
      label: "+ Add headshot",
      photo: true,
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
        tickets: "",
        poster: "",
        posterAlt: "",
        featured: false,
      }),
    },
  };

  function decorateLists() {
    $$("[data-edit-list]").forEach((listEl) => {
      const path = listEl.dataset.editList;
      const conf = LIST_ADD[path];
      if (!conf) return;
      if (listEl.nextElementSibling && listEl.nextElementSibling.classList.contains("hj-add")) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hj-add";
      btn.contentEditable = "false";
      btn.textContent = conf.label;
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        const arr = get(path) || [];
        if (conf.photo) {
          const files = await pickFile("image/*", true);
          if (!files.length) return;
          for (const f of files) {
            arr.unshift(conf.make(await toWebImage(f), f.name));
          }
        } else {
          arr.push(conf.make());
        }
        set(path, arr);
        rerender();
      });
      listEl.insertAdjacentElement("afterend", btn);
      if (path === "upcoming") {
        const hint = document.createElement("p");
        hint.className = "hj-edit-hint";
        hint.textContent =
          "That button adds a new show. Click any words to type. Click Add ticket link to paste a URL. Use the arrows to reorder, the X to remove.";
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
    let sha;
    const meta = await fetch(`${api}?ref=${gh.branch || "main"}`, { headers });
    if (meta.ok) sha = (await meta.json()).sha;
    const res = await fetch(api, {
      method: "PUT",
      headers,
      body: JSON.stringify({ message, content: b64, branch: gh.branch || "main", ...(sha ? { sha } : {}) }),
    });
    if (!res.ok) {
      const text = await res.text();
      if (res.status === 409) {
        const again = await fetch(`${api}?ref=${gh.branch || "main"}`, { headers });
        if (again.ok) sha = (await again.json()).sha;
        const retry = await fetch(api, {
          method: "PUT",
          headers,
          body: JSON.stringify({ message, content: b64, branch: gh.branch || "main", ...(sha ? { sha } : {}) }),
        });
        if (!retry.ok) throw new Error(await retry.text());
        return;
      }
      throw new Error(text);
    }
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

  function scheduleLive() {
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
      say("Live");
      toast("Saved. The live site updates in about a minute.");
      setTimeout(() => {
        const state = $(".studio-bar [data-state]");
        if (state && state.textContent === "Live") state.textContent = "";
      }, 4000);
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
  const b64of = (dataUrl) => dataUrl.split(",")[1];
  const jsonB64 = (obj) => btoa(unescape(encodeURIComponent(JSON.stringify(obj, null, 2))));

  async function publish(token, say) {
    if (site.resume && String(site.resume.pdf || "").startsWith("data:")) {
      say("Uploading resume…");
      await ghPut("assets/resume/Hannah-Jew-Resume.pdf", b64of(site.resume.pdf), token, "Update resume PDF");
      site.resume.pdf = "assets/resume/Hannah-Jew-Resume.pdf";
    }

    const uploads = [
      ["portfolio", "assets/img/portfolio", (i) => `${slug(i.title)}_${today()}_${slug(i.credit || "photo")}.jpg`, "src"],
      ["headshots", "assets/img/headshots", (i) => `${slug(i.title || "headshot")}_${today()}.jpg`, "src"],
      ["upcoming", "assets/img/shows", (i) => `${slug(i.title)}_${today()}.jpg`, "poster"],
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
        const p = `assets/img/${label}_${today()}.jpg`;
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
      ["portfolio", "assets/img/portfolio", (i) => `${slug(i.title)}_${today()}_${slug(i.credit || "photo")}.jpg`, "src"],
      ["headshots", "assets/img/headshots", (i) => `${slug(i.title || "headshot")}_${today()}.jpg`, "src"],
      ["upcoming", "assets/img/shows", (i) => `${slug(i.title)}_${today()}.jpg`, "poster"],
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
        const name = `${label}_${today()}.jpg`;
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
        <p class="studio-lock__help">Enter your passcode, then click anything on the page to change it. It saves by itself and goes live in about a minute.</p>
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
        toast("Saving. The live site updates in about a minute.");
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
