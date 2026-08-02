/* ============================================================
   RESUME · draws the published PDF onto the page itself.

   Phones and some desktop browsers refuse to display an inline
   PDF, so instead of an embed we paint each page with pdf.js.
   Whatever PDF Hannah uploads in the Studio is what gets drawn,
   so this never goes stale. The library only loads once the
   resume scrolls into view.
   ============================================================ */
(function () {
  const view = document.querySelector("[data-resume-view]");
  if (!view) return;

  const LIB = "assets/vendor/pdfjs/pdf.min.js";
  const WORKER = "assets/vendor/pdfjs/pdf.worker.min.js";

  let libPromise = null;
  function loadLib() {
    if (libPromise) return libPromise;
    libPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = LIB;
      s.onload = () => resolve(window.pdfjsLib);
      s.onerror = () => reject(new Error("pdf.js failed to load"));
      document.head.appendChild(s);
    });
    return libPromise;
  }

  function fail() {
    view.classList.add("is-unavailable");
    const note = view.querySelector(".resume-view__note");
    if (note) note.textContent = "The resume can't be shown here. Use the download button above.";
  }

  let drawing = null;

  async function draw(url) {
    if (!url) return;
    if (drawing === url) return;
    drawing = url;
    view.classList.remove("is-unavailable");
    view.classList.add("is-loading");

    try {
      const pdfjsLib = await loadLib();
      pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER;
      const doc = await pdfjsLib.getDocument(url).promise;

      // draw well above the display size: retina screens need it, and on a
      // phone it keeps the type sharp when someone pinches in to read it
      const width = Math.max(view.clientWidth, 320);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pixels = Math.min(Math.max(width * dpr, 1600), 2400);
      const frag = document.createDocumentFragment();

      for (let n = 1; n <= doc.numPages; n++) {
        const page = await doc.getPage(n);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: pixels / base.width });

        const canvas = document.createElement("canvas");
        canvas.className = "resume-page";
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.setAttribute("role", "img");
        canvas.setAttribute(
          "aria-label",
          doc.numPages > 1 ? `Resume, page ${n} of ${doc.numPages}` : "Hannah Jew resume"
        );
        await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
        frag.appendChild(canvas);
      }

      view.innerHTML = "";
      view.appendChild(frag);
      view.classList.remove("is-loading");
      view.classList.add("is-ready");
    } catch (e) {
      drawing = null;
      view.classList.remove("is-loading");
      fail();
    }
  }

  function currentPdf() {
    const link = document.querySelector("[data-resume-pdf]");
    return (link && link.getAttribute("href")) || "";
  }

  function start() {
    draw(currentPdf());
  }

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          io.disconnect();
          start();
        });
      },
      { rootMargin: "400px" }
    );
    io.observe(view);
  } else {
    start();
  }

  // the Studio can swap the PDF while the page is open
  document.addEventListener("hj:rendered", () => {
    const url = currentPdf();
    if (url && url !== drawing) {
      drawing = null;
      view.innerHTML = "";
      view.classList.remove("is-ready");
      draw(url);
    }
  });
})();
