/* ============================================================
   STUDIO · friend-friendly site editor (gear button)
   Lets Hannah add portfolio photos and photographer credits
   without editing code. Drafts save on this device; Publish
   can push to GitHub if a token is pasted, or Download a
   backup JSON for Vipul to drop into the repo.
   ============================================================ */
(function () {
  const DRAFT_KEY = "hj-portfolio-draft";
  const UNLOCK_KEY = "hj-studio-unlocked";
  const TOKEN_KEY = "hj-studio-gh-token";
  const cfg = (window.SITE_CONFIG && window.SITE_CONFIG.studio) || {};
  const PIN = String(cfg.pin || "hannah");
  const gh = cfg.github || { owner: "virslaan", repo: "hannahcjew", branch: "main" };

  const CAT_OPTS = [
    ["performer", "Performer"],
    ["choreographer", "Choreographer"],
    ["educator", "Educator"],
    ["photoshoots", "Photoshoots"],
  ];

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function slugify(s) {
    return String(s || "photo")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48);
  }

  function today() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  }

  async function loadBase() {
    if (Array.isArray(window.HJ_PORTFOLIO) && window.HJ_PORTFOLIO.length) {
      return JSON.parse(JSON.stringify(window.HJ_PORTFOLIO));
    }
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      if (Array.isArray(draft)) return draft;
    } catch (_) {}
    const res = await fetch("assets/data/portfolio.json", { cache: "no-store" });
    return await res.json();
  }

  function saveDraft(items) {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(items));
    window.HJ_PORTFOLIO = items;
    if (typeof window.HJ_renderPortfolio === "function") {
      window.HJ_renderPortfolio(items);
    }
  }

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
  }

  // ----- compress uploaded image to a web JPEG data URL -----
  function fileToJpegDataUrl(file, maxEdge = 1600, quality = 0.84) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          const scale = Math.min(1, maxEdge / Math.max(width, height));
          width = Math.round(width * scale);
          height = Math.round(height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function downloadJson(items) {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "portfolio.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function downloadDataUrl(dataUrl, filename) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }

  async function publishToGithub(items, token) {
    const path = "assets/data/portfolio.json";
    const api = `https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/${path}`;
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // upload any new data-URL images first
    const prepared = [];
    for (const item of items) {
      const copy = { ...item };
      if (copy.src && copy.src.startsWith("data:image")) {
        const photographer = slugify(copy.credit || "photo");
        const name = `${slugify(copy.title)}_${today()}_${photographer}.jpg`;
        const imgPath = `assets/img/portfolio/${name}`;
        const b64 = copy.src.split(",")[1];
        let sha;
        try {
          const existing = await fetch(`https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/${imgPath}`, { headers });
          if (existing.ok) sha = (await existing.json()).sha;
        } catch (_) {}
        const putImg = await fetch(`https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/${imgPath}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            message: `Add portfolio photo: ${copy.title}`,
            content: b64,
            branch: gh.branch || "main",
            ...(sha ? { sha } : {}),
          }),
        });
        if (!putImg.ok) throw new Error("Image upload failed: " + (await putImg.text()));
        copy.src = imgPath;
      }
      // strip heavy fields
      delete copy._local;
      prepared.push(copy);
    }

    let sha;
    const meta = await fetch(api + `?ref=${gh.branch || "main"}`, { headers });
    if (meta.ok) sha = (await meta.json()).sha;

    const body = {
      message: "Update portfolio photos and photographer credits",
      content: btoa(unescape(encodeURIComponent(JSON.stringify(prepared, null, 2)))),
      branch: gh.branch || "main",
      ...(sha ? { sha } : {}),
    };
    const put = await fetch(api, { method: "PUT", headers, body: JSON.stringify(body) });
    if (!put.ok) throw new Error("JSON publish failed: " + (await put.text()));
    clearDraft();
    return prepared;
  }

  // ----- UI -----
  function mount() {
    if ($("#hj-studio")) return;

    const gear = document.createElement("button");
    gear.className = "studio-gear";
    gear.type = "button";
    gear.setAttribute("aria-label", "Open site studio");
    gear.title = "Edit photos & credits";
    gear.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7">
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/>
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.86l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.08V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.86.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.08-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.86l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8.5 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.08V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 .4 1.08 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.86-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 8.5a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.08.4H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.08.4 1.7 1.7 0 0 0-.43 1.1Z"/>
      </svg>`;

    const panel = document.createElement("div");
    panel.id = "hj-studio";
    panel.className = "studio";
    panel.hidden = true;
    panel.innerHTML = `
      <div class="studio__backdrop" data-close></div>
      <div class="studio__sheet" role="dialog" aria-modal="true" aria-label="Site studio">
        <header class="studio__head">
          <div>
            <p class="studio__kicker">Site studio</p>
            <h2>Photos &amp; credits</h2>
          </div>
          <button type="button" class="studio__x" data-close aria-label="Close">×</button>
        </header>
        <div class="studio__body" data-body></div>
      </div>`;

    document.body.appendChild(gear);
    document.body.appendChild(panel);

    const body = $("[data-body]", panel);
    const close = () => {
      panel.hidden = true;
      document.body.classList.remove("studio-open");
    };
    const open = () => {
      panel.hidden = false;
      document.body.classList.add("studio-open");
      paint();
    };

    panel.addEventListener("click", (e) => {
      if (e.target.closest("[data-close]")) close();
    });
    gear.addEventListener("click", open);
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !panel.hidden) close();
    });

    let items = [];

    async function paint() {
      const unlocked = sessionStorage.getItem(UNLOCK_KEY) === "1";
      if (!unlocked) {
        body.innerHTML = `
          <p class="studio__help">This editor is for updating Hannah's portfolio photos and photographer credits. Visitors won't use this.</p>
          <label class="studio__field">
            <span>Passcode</span>
            <input type="password" data-pin placeholder="Enter passcode" autocomplete="current-password" />
          </label>
          <button type="button" class="btn btn--red" data-unlock>Unlock studio</button>
          <p class="studio__hint">Ask Vipul for the passcode if you don't have it.</p>`;
        $("[data-unlock]", body).onclick = () => {
          const val = ($("[data-pin]", body).value || "").trim();
          if (val === PIN) {
            sessionStorage.setItem(UNLOCK_KEY, "1");
            paint();
          } else {
            alert("That passcode isn't right.");
          }
        };
        return;
      }

      items = await loadBase();
      body.innerHTML = `
        <p class="studio__help">Edit titles and photographer credits below. Credits show under each photo. Add new pictures with the button. Changes preview on this device right away.</p>
        <div class="studio__actions">
          <label class="btn btn--red studio__upload">
            + Add photo
            <input type="file" accept="image/*" multiple hidden data-files />
          </label>
          <button type="button" class="btn" data-save>Save draft</button>
          <button type="button" class="btn" data-download>Download JSON</button>
          <button type="button" class="btn" data-reset>Reset draft</button>
        </div>
        <div class="studio__list" data-list></div>
        <details class="studio__publish">
          <summary>Publish to GitHub Pages</summary>
          <p class="studio__hint">Optional. Paste a fine-grained GitHub token with Contents access to this repo. It stays in this browser session only and is never sent anywhere except GitHub.</p>
          <label class="studio__field">
            <span>GitHub token</span>
            <input type="password" data-token placeholder="ghp_…" autocomplete="off" />
          </label>
          <button type="button" class="btn btn--red" data-publish>Publish live</button>
          <p class="studio__status" data-status></p>
        </details>`;

      const list = $("[data-list]", body);
      list.innerHTML = items
        .map((item, i) => {
          const opts = CAT_OPTS.map(
            ([v, label]) => `<option value="${v}" ${item.category === v ? "selected" : ""}>${label}</option>`
          ).join("");
          return `
          <article class="studio__card" data-i="${i}">
            <img src="${item.src}" alt="" />
            <div class="studio__card-fields">
              <label>Title<input data-f="title" value="${(item.title || "").replace(/"/g, "&quot;")}" /></label>
              <label>Photographer credit<input data-f="credit" value="${(item.credit || "").replace(/"/g, "&quot;")}" placeholder="Jane Smith" /></label>
              <label>Category<select data-f="category">${opts}</select></label>
              <button type="button" class="studio__remove" data-remove>Remove</button>
            </div>
          </article>`;
        })
        .join("");

      list.addEventListener("input", (e) => {
        const card = e.target.closest(".studio__card");
        if (!card) return;
        const i = +card.dataset.i;
        const field = e.target.dataset.f;
        if (!field) return;
        items[i][field] = e.target.value;
      });

      list.addEventListener("click", (e) => {
        if (!e.target.closest("[data-remove]")) return;
        const card = e.target.closest(".studio__card");
        items.splice(+card.dataset.i, 1);
        saveDraft(items);
        paint();
      });

      $("[data-files]", body).onchange = async (e) => {
        const files = [...e.target.files];
        for (const file of files) {
          const dataUrl = await fileToJpegDataUrl(file);
          const base = file.name.replace(/\.[^.]+$/, "");
          // prefer name_date_photographer if already renamed
          const parts = base.split("_");
          let title = base.replace(/[_-]+/g, " ");
          let credit = "";
          if (parts.length >= 3) {
            credit = parts[parts.length - 1].replace(/[-]+/g, " ");
            title = parts.slice(0, -2).join(" ").replace(/[-]+/g, " ") || title;
          }
          items.unshift({
            id: "local-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
            src: dataUrl,
            title: title.trim() || "New photo",
            credit: credit.trim(),
            category: "photoshoots",
            alt: title.trim() || "Portfolio photo",
            _local: true,
          });
        }
        saveDraft(items);
        paint();
      };

      $("[data-save]", body).onclick = () => {
        saveDraft(items);
        $("[data-status]", body).textContent = "Draft saved on this device. Open Portfolio to preview.";
      };

      $("[data-download]", body).onclick = () => {
        // also download any local data-url images as files for Vipul
        items.forEach((item) => {
          if (item.src && item.src.startsWith("data:image")) {
            const photographer = slugify(item.credit || "photo");
            const name = `${slugify(item.title)}_${today()}_${photographer}.jpg`;
            downloadDataUrl(item.src, name);
          }
        });
        const exportItems = items.map((item) => {
          const copy = { ...item };
          if (copy.src && copy.src.startsWith("data:image")) {
            const photographer = slugify(copy.credit || "photo");
            copy.src = `assets/img/portfolio/${slugify(copy.title)}_${today()}_${photographer}.jpg`;
          }
          delete copy._local;
          return copy;
        });
        downloadJson(exportItems);
        $("[data-status]", body).textContent =
          "Downloaded portfolio.json" +
          (items.some((i) => i.src.startsWith("data:")) ? " and new photo files. Send those to Vipul, or use Publish." : ".");
      };

      $("[data-reset]", body).onclick = async () => {
        if (!confirm("Clear the draft on this device and reload the live portfolio?")) return;
        clearDraft();
        const res = await fetch("assets/data/portfolio.json", { cache: "no-store" });
        items = await res.json();
        window.HJ_PORTFOLIO = items;
        if (typeof window.HJ_renderPortfolio === "function") window.HJ_renderPortfolio(items);
        paint();
      };

      const tokenInput = $("[data-token]", body);
      tokenInput.value = sessionStorage.getItem(TOKEN_KEY) || "";
      $("[data-publish]", body).onclick = async () => {
        const token = tokenInput.value.trim();
        if (!token) {
          alert("Paste a GitHub token first, or use Download JSON and send the files to Vipul.");
          return;
        }
        sessionStorage.setItem(TOKEN_KEY, token);
        const status = $("[data-status]", body);
        status.textContent = "Publishing…";
        try {
          const prepared = await publishToGithub(items, token);
          items = prepared;
          window.HJ_PORTFOLIO = prepared;
          if (typeof window.HJ_renderPortfolio === "function") window.HJ_renderPortfolio(prepared);
          status.textContent = "Published. GitHub Pages will update in a minute or two.";
          paint();
        } catch (err) {
          console.error(err);
          status.textContent = "Publish failed: " + err.message;
        }
      };
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
