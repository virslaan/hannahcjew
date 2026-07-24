/* ============================================================
   Refreshes the homepage Instagram wall.
   Renders Instagram's public profile-embed page (the only
   surface served without a login), pulls the six newest post
   images, and saves them over assets/img/insta/insta-N.jpg.
   Run by .github/workflows/refresh-instagram.yml on a schedule.
   If Instagram blocks the fetch, the script exits quietly and
   the existing images stay in place.
   ============================================================ */
import puppeteer from "puppeteer";
import { writeFile, mkdir } from "node:fs/promises";

const USERNAME = "hannahjew";
const OUT_DIR = "assets/img/insta";
const COUNT = 6;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  await page.goto(`https://www.instagram.com/${USERNAME}/embed/`, {
    waitUntil: "networkidle2",
    timeout: 60_000,
  });
  // give the client-side grid a moment to finish rendering
  await new Promise((r) => setTimeout(r, 4000));

  const urls = await page.evaluate(() =>
    [...document.querySelectorAll("img")].map((img) => img.src)
  );

  // post images live on the t51.82787-15 CDN path; skip the avatar
  const posts = [];
  const seen = new Set();
  for (const u of urls) {
    if (u.includes("t51.82787-15") && !u.includes("s100x100")) {
      const key = u.split("?")[0];
      if (!seen.has(key)) {
        seen.add(key);
        posts.push(u);
      }
    }
  }

  if (posts.length < COUNT) {
    console.log(`Only found ${posts.length} images (Instagram may be blocking); keeping the current set.`);
    process.exit(0);
  }

  const files = [];
  for (let i = 0; i < COUNT; i++) {
    const res = await fetch(posts[i], { headers: { "User-Agent": UA } });
    if (!res.ok) {
      console.log(`Download ${i + 1} failed (${res.status}); keeping the current set.`);
      process.exit(0);
    }
    files.push(Buffer.from(await res.arrayBuffer()));
  }

  // only write once all six downloaded, so a partial failure never mixes sets
  await mkdir(OUT_DIR, { recursive: true });
  for (let i = 0; i < COUNT; i++) {
    await writeFile(`${OUT_DIR}/insta-${i + 1}.jpg`, files[i]);
    console.log(`Saved insta-${i + 1}.jpg (${files[i].length} bytes)`);
  }
} finally {
  await browser.close();
}
