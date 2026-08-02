/* ============================================================
   STUDIO · full-site editor for Hannah (gear button)
   Edit Home, About, Resume, Headshots, Portfolio, Upcoming,
   Contact. Add / keep / remove items. Draft saves on device;
   Download or Publish to GitHub Pages.
   ============================================================ */
(function () {
  const DRAFT_KEY = "hj-site-draft";
  const UNLOCK_KEY = "hj-studio-unlocked";
  const TOKEN_KEY = "hj-studio-gh-token";
  const cfg = (window.SITE_CONFIG && window.SITE_CONFIG.studio) || {};
  const PIN = String(cfg.pin || "hannah");
  const gh = cfg.github || { owner: "virslaan", repo: "hannahcjew", branch: "main" };

  const TABS = [
    ["home", "Home"],
    ["about", "About"],
    ["resume", "Resume & Headshots"],
    ["portfolio", "Portfolio"],
    ["upcoming", "Upcoming"],
    ["contact", "Contact"],
  ];

  const CAT_OPTS = [
    ["performer", "Performer"],
    ["choreographer", "Choreographer"],
    ["educator", "Educator"],
    ["photoshoots", "Photoshoots"],
  ];

  let tab = "portfolio";
  let site = null;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];

  function uid(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }

  function slugify(s) {
    return String(s || "item")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48);
  }

  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function attr(s) {
    return String(s ?? "").replace(/"/g, "&quot;");
  }

  function fileToDataUrl(file, maxEdge = 1600, quality = 0.84) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        if (!file.type.startsWith("image/") || file.type === "application/pdf") {
          resolve(reader.result);
          return;
        }
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          const scale = Math.min(1, maxEdge / Math.max(width, height));
          width = Math.round(width * scale);
          height = Math.round(height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = () => resolve(reader.result);
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function downloadDataUrl(dataUrl, filename) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }

  function saveDraft() {
    window.HJ_saveSite(site);
  }

  async function ensureSite() {
    if (site) return site;
    if (window.HJ_SITE) {
      site = JSON.parse(JSON.stringify(window.HJ_SITE));
      return site;
    }
    site = await window.HJ_loadSite();
    site = JSON.parse(JSON.stringify(site));
    return site;
  }

  // ----- GitHub publish: upload data-URLs then site.json -----
  async function putGithubFile(path, contentB64, token, message) {
    const api = `https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/${path}`;
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    let sha;
    const meta = await fetch(api + `?ref=${gh.branch || "main"}`, { headers });
    if (meta.ok) sha = (await meta.json()).sha;
    const put = await fetch(api, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message,
        content: contentB64,
        branch: gh.branch || "main",
        ...(sha ? { sha } : {}),
      }),
    });
    if (!put.ok) throw new Error(await put.text());
    return put.json();
  }

  function dataUrlToB64(dataUrl) {
    return dataUrl.split(",")[1];
  }

  async function publish(token) {
    // resume PDF
    if (site.resume && site.resume.pdf && site.resume.pdf.startsWith("data:")) {
      const path = "assets/resume/Hannah-Jew-Resume.pdf";
      await putGithubFile(path, dataUrlToB64(site.resume.pdf), token, "Update resume PDF");
      site.resume.pdf = path;
    }

    async function materialize(list, folder, nameFn) {
      for (const item of list || []) {
        if (item.src && item.src.startsWith("data:image")) {
          const name = nameFn(item);
          const path = `${folder}/${name}`;
          await putGithubFile(path, dataUrlToB64(item.src), token, `Add image ${name}`);
          item.src = path;
        }
        if (item.poster && item.poster.startsWith("data:image")) {
          const name = slugify(item.title || "poster") + "_" + today() + ".jpg";
          const path = `assets/img/shows/${name}`;
          await putGithubFile(path, dataUrlToB64(item.poster), token, `Add show poster ${name}`);
          item.poster = path;
        }
      }
    }

    await materialize(site.headshots, "assets/img/headshots", (i) => `${slugify(i.title || "headshot")}_${today()}.jpg`);
    await materialize(site.portfolio, "assets/img/portfolio", (i) => {
      const ph = slugify(i.credit || "photo");
      return `${slugify(i.title)}_${today()}_${ph}.jpg`;
    });
    await materialize(site.upcoming, "assets/img/shows", (i) => `${slugify(i.title)}_${today()}.jpg`);

    // home / about / contact images
    for (const [obj, key, folder, label] of [
      [site.home, "heroImage", "assets/img", "hero"],
      [site.home, "introImage", "assets/img", "intro"],
      [site.about, "image", "assets/img", "about"],
      [site.contact, "image", "assets/img", "contact"],
    ]) {
      if (obj && obj[key] && obj[key].startsWith("data:image")) {
        const name = `${label}_${today()}.jpg`;
        const path = `${folder}/${name}`;
        await putGithubFile(path, dataUrlToB64(obj[key]), token, `Update ${label} image`);
        obj[key] = path;
      }
    }

    const json = JSON.stringify(site, null, 2);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    await putGithubFile("assets/data/site.json", b64, token, "Update site content from Studio");
    // keep portfolio.json mirror for convenience
    await putGithubFile(
      "assets/data/portfolio.json",
      btoa(unescape(encodeURIComponent(JSON.stringify(site.portfolio || [], null, 2)))),
      token,
      "Sync portfolio.json from site content"
    );
    window.HJ_clearSiteDraft();
    window.HJ_saveSite(site);
    localStorage.removeItem(DRAFT_KEY);
  }

  function exportDownload() {
    // download new binary assets
    if (site.resume && site.resume.pdf && site.resume.pdf.startsWith("data:")) {
      downloadDataUrl(site.resume.pdf, "Hannah-Jew-Resume.pdf");
      site.resume.pdf = "assets/resume/Hannah-Jew-Resume.pdf";
    }
    const dump = (list, folder, nameFn) => {
      (list || []).forEach((item) => {
        if (item.src && item.src.startsWith("data:image")) {
          const name = nameFn(item);
          downloadDataUrl(item.src, name);
          item.src = `${folder}/${name}`;
        }
        if (item.poster && item.poster.startsWith("data:image")) {
          const name = slugify(item.title || "poster") + "_" + today() + ".jpg";
          downloadDataUrl(item.poster, name);
          item.poster = `assets/img/shows/${name}`;
        }
      });
    };
    dump(site.headshots, "assets/img/headshots", (i) => `${slugify(i.title || "headshot")}_${today()}.jpg`);
    dump(site.portfolio, "assets/img/portfolio", (i) => `${slugify(i.title)}_${today()}_${slugify(i.credit || "photo")}.jpg`);
    dump(site.upcoming, "assets/img/shows", (i) => `${slugify(i.title)}_${today()}.jpg`);
    for (const [obj, key, label] of [
      [site.home, "heroImage", "hero"],
      [site.home, "introImage", "intro"],
      [site.about, "image", "about"],
      [site.contact, "image", "contact"],
    ]) {
      if (obj && obj[key] && obj[key].startsWith("data:image")) {
        const name = `${label}_${today()}.jpg`;
        downloadDataUrl(obj[key], name);
        obj[key] = `assets/img/${name}`;
      }
    }
    downloadBlob(new Blob([JSON.stringify(site, null, 2)], { type: "application/json" }), "site.json");
  }

  // ----- field helpers -----
  function field(label, value, key, multiline) {
    if (multiline) {
      return `<label class="studio__field"><span>${label}</span><textarea data-k="${key}" rows="3">${attr(value)}</textarea></label>`;
    }
    return `<label class="studio__field"><span>${label}</span><input data-k="${key}" value="${attr(value)}" /></label>`;
  }

  function listEditor(title, items, fields, addLabel, factory) {
    const cards = (items || [])
      .map((item, i) => {
        const inputs = fields
          .map(([label, key, type]) => {
            if (type === "select") {
              const opts = CAT_OPTS.map(
                ([v, l]) => `<option value="${v}" ${item[key] === v ? "selected" : ""}>${l}</option>`
              ).join("");
              return `<label>${label}<select data-i="${i}" data-f="${key}">${opts}</select></label>`;
            }
            if (type === "check") {
              return `<label class="studio__check"><input type="checkbox" data-i="${i}" data-f="${key}" ${item[key] ? "checked" : ""}/> ${label}</label>`;
            }
            return `<label>${label}<input data-i="${i}" data-f="${key}" value="${attr(item[key] || "")}" /></label>`;
          })
          .join("");
        const thumb = item.src || item.poster || "";
        return `<article class="studio__card" data-i="${i}">
          ${thumb ? `<img src="${attr(thumb)}" alt="" />` : `<div class="studio__card-ph"></div>`}
          <div class="studio__card-fields">
            ${inputs}
            <div class="studio__row-actions">
              <button type="button" data-up="${i}">↑</button>
              <button type="button" data-down="${i}">↓</button>
              <button type="button" class="studio__remove" data-remove="${i}">Remove</button>
            </div>
          </div>
        </article>`;
      })
      .join("");
    return `
      <div class="studio__section-head">
        <h3>${title}</h3>
        <button type="button" class="btn" data-add>${addLabel}</button>
      </div>
      <div class="studio__list" data-list>${cards || '<p class="studio__hint">Nothing here yet. Add one.</p>'}</div>`;
  }

  function bindList(root, getList, setList, factory) {
    const list = getList();
    root.addEventListener("input", (e) => {
      const el = e.target;
      if (el.dataset.i == null || !el.dataset.f) return;
      const i = +el.dataset.i;
      list[i][el.dataset.f] = el.type === "checkbox" ? el.checked : el.value;
    });
    root.addEventListener("click", (e) => {
      const rem = e.target.closest("[data-remove]");
      if (rem) {
        list.splice(+rem.dataset.remove, 1);
        setList(list);
        paint();
        return;
      }
      const up = e.target.closest("[data-up]");
      if (up) {
        const i = +up.dataset.up;
        if (i > 0) {
          [list[i - 1], list[i]] = [list[i], list[i - 1]];
          setList(list);
          paint();
        }
        return;
      }
      const down = e.target.closest("[data-down]");
      if (down) {
        const i = +down.dataset.down;
        if (i < list.length - 1) {
          [list[i + 1], list[i]] = [list[i], list[i + 1]];
          setList(list);
          paint();
        }
        return;
      }
      if (e.target.closest("[data-add]")) {
        list.push(factory());
        setList(list);
        paint();
      }
    });
  }

  function paintHome(body) {
    const h = site.home;
    const ns = h.nextShow || (h.nextShow = {});
    body.innerHTML = `
      <p class="studio__help">Homepage hero, intro text, and the “next on stage” strip.</p>
      ${field("Hero image URL", h.heroImage, "heroImage")}
      <label class="btn studio__upload">Replace hero photo<input type="file" accept="image/*" hidden data-img="heroImage" /></label>
      ${field("Intro headline", h.introHeadline, "introHeadline", true)}
      ${field("Words to italicize in red", h.introHeadlineEm, "introHeadlineEm")}
      ${field("Intro paragraph", h.introBody, "introBody", true)}
      ${field("Intro image URL", h.introImage, "introImage")}
      <label class="btn studio__upload">Replace intro photo<input type="file" accept="image/*" hidden data-img="introImage" /></label>
      <h3 class="studio__h3">Next on stage</h3>
      ${field("Kicker", ns.kicker, "ns.kicker")}
      ${field("Show title", ns.title, "ns.title")}
      ${field("Role", ns.role, "ns.role")}
      ${field("Venue", ns.venue, "ns.venue")}
      ${field("Link", ns.link, "ns.link")}
      ${field("Link label", ns.linkLabel, "ns.linkLabel")}`;
    body.addEventListener("input", onFlatInput);
    body.addEventListener("change", onImgChange);
  }

  function onFlatInput(e) {
    const k = e.target.dataset.k;
    if (!k) return;
    if (k.startsWith("ns.")) {
      site.home.nextShow[k.slice(3)] = e.target.value;
    } else if (tab === "home") {
      site.home[k] = e.target.value;
    } else if (tab === "about") {
      site.about[k] = e.target.value;
    } else if (tab === "resume") {
      site.resume[k] = e.target.value;
    } else if (tab === "contact") {
      site.contact[k] = e.target.value;
    } else if (k === "upcomingNote") {
      site.upcomingNote = e.target.value;
    }
  }

  async function onImgChange(e) {
    const key = e.target.dataset.img;
    if (!key || !e.target.files || !e.target.files[0]) return;
    const data = await fileToDataUrl(e.target.files[0]);
    if (tab === "home") site.home[key] = data;
    else if (tab === "about") site.about[key] = data;
    else if (tab === "contact") site.contact[key] = data;
    paint();
  }

  function paintAbout(body) {
    const a = site.about;
    body.innerHTML = `
      <p class="studio__help">About page photo and bio. Edit the lists below. Remove a line by deleting its text, or use Remove on each chip row.</p>
      ${field("Photo URL", a.image, "image")}
      <label class="btn studio__upload">Replace about photo<input type="file" accept="image/*" hidden data-img="image" /></label>
      ${field("Photo caption", a.imageCaption, "imageCaption")}
      ${field("Photo alt text", a.imageAlt, "imageAlt")}
      <label class="studio__field"><span>Bio paragraphs (one blank line between)</span>
        <textarea data-paras rows="10">${attr((a.paragraphs || []).join("\n\n"))}</textarea>
      </label>
      <label class="studio__field"><span>Highlights (one per line)</span>
        <textarea data-highlights rows="6">${attr((a.highlights || []).join("\n"))}</textarea>
      </label>
      <label class="studio__field"><span>Movement languages (one per line)</span>
        <textarea data-skills rows="6">${attr((a.skills || []).join("\n"))}</textarea>
      </label>`;
    body.addEventListener("input", (e) => {
      onFlatInput(e);
      if (e.target.dataset.paras != null || e.target.hasAttribute("data-paras")) {
        a.paragraphs = e.target.value.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
      }
      if (e.target.hasAttribute("data-highlights")) {
        a.highlights = e.target.value.split("\n").map((x) => x.trim()).filter(Boolean);
      }
      if (e.target.hasAttribute("data-skills")) {
        a.skills = e.target.value.split("\n").map((x) => x.trim()).filter(Boolean);
      }
    });
    body.addEventListener("change", onImgChange);
  }

  function paintResume(body) {
    site.headshots = site.headshots || [];
    site.resume = site.resume || {};
    body.innerHTML = `
      <p class="studio__help">Upload a new resume PDF anytime. Manage headshots: add, reorder, or remove.</p>
      ${field("Resume blurb", site.resume.blurb, "blurb", true)}
      <p class="studio__hint">Current resume: ${site.resume.pdf && site.resume.pdf.startsWith("data:") ? "new PDF ready to publish" : site.resume.pdf || "(none)"}</p>
      <label class="btn btn--red studio__upload">Upload resume PDF<input type="file" accept="application/pdf" hidden data-resume /></label>
      ${listEditor(
        "Headshots",
        site.headshots,
        [
          ["Title", "title"],
          ["Photographer credit", "credit"],
          ["Alt text", "alt"],
        ],
        "+ Add headshot",
        () => ({ id: uid("hs"), src: "", title: "Hannah Jew", credit: "", alt: "" })
      )}
      <label class="btn studio__upload" style="margin-top:0.8rem">+ Upload headshot photo<input type="file" accept="image/*" multiple hidden data-hs-files /></label>`;
    body.addEventListener("input", onFlatInput);
    bindList(
      body,
      () => site.headshots,
      (v) => (site.headshots = v),
      () => ({ id: uid("hs"), src: "", title: "Hannah Jew", credit: "", alt: "" })
    );
    $("[data-resume]", body).onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      site.resume.pdf = await fileToDataUrl(f);
      paint();
    };
    $("[data-hs-files]", body).onchange = async (e) => {
      for (const file of e.target.files) {
        const src = await fileToDataUrl(file);
        site.headshots.unshift({
          id: uid("hs"),
          src,
          title: "Hannah Jew",
          credit: "",
          alt: "Headshot of Hannah Jew",
        });
      }
      paint();
    };
  }

  function paintPortfolio(body) {
    site.portfolio = site.portfolio || [];
    body.innerHTML = `
      <p class="studio__help">Portfolio photos with photographer credits under each. Rename files like PhotoName_date_photographer before upload when you can.</p>
      <label class="btn btn--red studio__upload">+ Add photos<input type="file" accept="image/*" multiple hidden data-files /></label>
      ${listEditor(
        "Portfolio pieces",
        site.portfolio,
        [
          ["Title", "title"],
          ["Photographer credit", "credit"],
          ["Category", "category", "select"],
          ["Alt text", "alt"],
        ],
        "+ Empty item",
        () => ({
          id: uid("p"),
          src: "",
          title: "New photo",
          credit: "",
          category: "photoshoots",
          alt: "",
        })
      )}`;
    bindList(
      body,
      () => site.portfolio,
      (v) => (site.portfolio = v),
      () => ({
        id: uid("p"),
        src: "",
        title: "New photo",
        credit: "",
        category: "photoshoots",
        alt: "",
      })
    );
    $("[data-files]", body).onchange = async (e) => {
      for (const file of e.target.files) {
        const src = await fileToDataUrl(file);
        const base = file.name.replace(/\.[^.]+$/, "");
        const parts = base.split("_");
        let title = base.replace(/[_-]+/g, " ");
        let credit = "";
        if (parts.length >= 3) {
          credit = parts[parts.length - 1].replace(/[-]+/g, " ");
          title = parts.slice(0, -2).join(" ").replace(/[-]+/g, " ") || title;
        }
        site.portfolio.unshift({
          id: uid("p"),
          src,
          title: title.trim() || "New photo",
          credit: credit.trim(),
          category: "photoshoots",
          alt: title.trim() || "Portfolio photo",
        });
      }
      paint();
    };
  }

  function paintUpcoming(body) {
    site.upcoming = site.upcoming || [];
    body.innerHTML = `
      <p class="studio__help">Add or remove shows. Featured shows get the big poster layout.</p>
      ${field("Note under the list", site.upcomingNote || "", "upcomingNote", true)}
      <label class="btn btn--red studio__upload">+ Add show with poster<input type="file" accept="image/*" hidden data-show-poster /></label>
      ${listEditor(
        "Shows",
        site.upcoming,
        [
          ["Title", "title"],
          ["Role", "role"],
          ["Venue", "venue"],
          ["Month", "month"],
          ["Year", "year"],
          ["On-sale note", "onsale"],
          ["Tickets URL", "tickets"],
          ["Featured", "featured", "check"],
        ],
        "+ Add show",
        () => ({
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
        })
      )}`;
    body.addEventListener("input", onFlatInput);
    bindList(
      body,
      () => site.upcoming,
      (v) => (site.upcoming = v),
      () => ({
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
      })
    );
    $("[data-show-poster]", body).onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const poster = await fileToDataUrl(f);
      site.upcoming.unshift({
        id: uid("show"),
        title: "New show",
        role: "",
        venue: "",
        month: "TBA",
        year: String(new Date().getFullYear()),
        onsale: "Tickets on sale soon",
        tickets: "",
        poster,
        posterAlt: "",
        featured: true,
      });
      paint();
    };
  }

  function paintContact(body) {
    const c = site.contact;
    body.innerHTML = `
      <p class="studio__help">Contact details and representation. Update anytime.</p>
      ${field("Headline", c.headline, "headline")}
      ${field("Italic word in headline", c.headlineEm, "headlineEm")}
      ${field("Subline", c.sub, "sub", true)}
      ${field("Email", c.email, "email")}
      ${field("Agency", c.agency, "agency")}
      ${field("Address", c.address, "address")}
      ${field("Phone", c.phone, "phone")}
      ${field("Fax", c.fax, "fax")}
      ${field("Instagram URL", c.instagram, "instagram")}
      ${field("Instagram handle", c.instagramHandle, "instagramHandle")}
      ${field("LinkedIn URL", c.linkedin, "linkedin")}
      ${field("LinkedIn label", c.linkedinLabel, "linkedinLabel")}
      ${field("Photo URL", c.image, "image")}
      <label class="btn studio__upload">Replace contact photo<input type="file" accept="image/*" hidden data-img="image" /></label>
      ${field("Photo caption", c.imageCaption, "imageCaption")}`;
    body.addEventListener("input", onFlatInput);
    body.addEventListener("change", onImgChange);
  }

  function paint() {
    const panel = $("#hj-studio");
    if (!panel || panel.hidden) return;
    const body = $("[data-body]", panel);
    const unlocked = sessionStorage.getItem(UNLOCK_KEY) === "1";
    if (!unlocked) {
      body.innerHTML = `
        <p class="studio__help">Edit every page of the site: photos, resume, credits, shows, and contact. Passcode keeps it private.</p>
        <label class="studio__field"><span>Passcode</span>
          <input type="password" data-pin placeholder="Enter passcode" autocomplete="current-password" />
        </label>
        <button type="button" class="btn btn--red" data-unlock>Unlock studio</button>
        <p class="studio__hint">Ask Vipul for the passcode if you need it.</p>`;
      $("[data-unlock]", body).onclick = () => {
        if (($("[data-pin]", body).value || "").trim() === PIN) {
          sessionStorage.setItem(UNLOCK_KEY, "1");
          paint();
        } else alert("That passcode isn't right.");
      };
      return;
    }

    const tabs = TABS.map(
      ([id, label]) =>
        `<button type="button" class="studio__tab ${tab === id ? "is-active" : ""}" data-tab="${id}">${label}</button>`
    ).join("");

    body.innerHTML = `
      <nav class="studio__tabs">${tabs}</nav>
      <div data-pane></div>
      <div class="studio__footer-actions">
        <button type="button" class="btn btn--red" data-save>Save &amp; preview</button>
        <button type="button" class="btn" data-download>Download site.json</button>
        <button type="button" class="btn" data-reset>Reset draft</button>
      </div>
      <details class="studio__publish">
        <summary>Publish to GitHub Pages</summary>
        <p class="studio__hint">Optional. Paste a fine-grained GitHub token with Contents access. Stored only in this browser session.</p>
        <label class="studio__field"><span>GitHub token</span>
          <input type="password" data-token placeholder="ghp_…" autocomplete="off" />
        </label>
        <button type="button" class="btn btn--red" data-publish>Publish live</button>
        <p class="studio__status" data-status></p>
      </details>`;

    const pane = $("[data-pane]", body);
    const painters = {
      home: paintHome,
      about: paintAbout,
      resume: paintResume,
      portfolio: paintPortfolio,
      upcoming: paintUpcoming,
      contact: paintContact,
    };
    painters[tab](pane);

    $$("[data-tab]", body).forEach((btn) => {
      btn.onclick = () => {
        tab = btn.dataset.tab;
        paint();
      };
    });

    $("[data-save]", body).onclick = () => {
      saveDraft();
      $("[data-status]", body).textContent = "Saved on this device. Refresh any page to see it.";
    };
    $("[data-download]", body).onclick = () => {
      exportDownload();
      $("[data-status]", body).textContent =
        "Downloaded site.json (and any new files). Send those to Vipul, or use Publish.";
    };
    $("[data-reset]", body).onclick = async () => {
      if (!confirm("Clear your draft and reload the live site content?")) return;
      window.HJ_clearSiteDraft();
      site = await window.HJ_loadSite();
      site = JSON.parse(JSON.stringify(site));
      window.HJ_hydrateSite(site);
      paint();
    };
    const tokenInput = $("[data-token]", body);
    tokenInput.value = sessionStorage.getItem(TOKEN_KEY) || "";
    $("[data-publish]", body).onclick = async () => {
      const token = tokenInput.value.trim();
      if (!token) {
        alert("Paste a GitHub token, or use Download and send files to Vipul.");
        return;
      }
      sessionStorage.setItem(TOKEN_KEY, token);
      const status = $("[data-status]", body);
      status.textContent = "Publishing…";
      try {
        await publish(token);
        status.textContent = "Published. GitHub Pages updates in a minute or two.";
        paint();
      } catch (err) {
        console.error(err);
        status.textContent = "Publish failed: " + err.message;
      }
    };
  }

  async function mount() {
    if ($("#hj-studio")) return;

    const gear = document.createElement("button");
    gear.className = "studio-gear";
    gear.type = "button";
    gear.setAttribute("aria-label", "Open site studio");
    gear.title = "Edit site content";
    gear.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7">
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
            <h2>Customize the site</h2>
          </div>
          <button type="button" class="studio__x" data-close aria-label="Close">×</button>
        </header>
        <div class="studio__body" data-body></div>
      </div>`;

    document.body.appendChild(gear);
    document.body.appendChild(panel);

    const close = () => {
      panel.hidden = true;
      document.body.classList.remove("studio-open");
    };
    const open = async () => {
      await ensureSite();
      // pick sensible default tab for current page
      const path = location.pathname;
      if (path.includes("about")) tab = "about";
      else if (path.includes("headshots")) tab = "resume";
      else if (path.includes("portfolio")) tab = "portfolio";
      else if (path.includes("upcoming")) tab = "upcoming";
      else if (path.includes("contact")) tab = "contact";
      else tab = "home";
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
