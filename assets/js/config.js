/* ============================================================
   SITE CONFIG · Hannah Jew 周健倫
   This is the one file to edit to control the theme and the
   Instagram feed. No other code changes needed.
   ============================================================ */

window.SITE_CONFIG = {
  /* ----------------------------------------------------------
     THEME
     Visitors do not choose the look. Hannah picks it in the
     Studio bar ("Look"), and it is saved with the rest of the
     content in assets/data/site.json, so everyone sees the
     same site once she publishes.

     Leave this as "auto" for that. Setting it to one of
     "seal", "noir", "porcelain", "crimson" or "jade" pins the
     site to that look and ignores the Studio setting.
     ---------------------------------------------------------- */
  theme: "auto",

  /* ----------------------------------------------------------
     INSTAGRAM
     username: the handle shown in follow links and the official
               Instagram feed on the home page.
     posts:    optional list of post URLs. If you paste them, each
               one renders as Instagram's own card (carousel posts
               keep Instagram's swipe). Leave the list empty to
               show Instagram's profile embed, which is the most
               posts they will serve without a login (about 12).

     Example:
       posts: [
         "https://www.instagram.com/p/Cxyz123AbCd/",
         "https://www.instagram.com/reel/Cabc456EfGh/",
       ],
     ---------------------------------------------------------- */
  instagram: {
    username: "hannahjew",
    posts: [],
  },

  /* ----------------------------------------------------------
     STUDIO (gear button, bottom-right)
     Friend-friendly editor for the WHOLE site: Home, About,
     Resume PDF, Headshots, Portfolio (+ photographer credits),
     Upcoming shows, and Contact. Add / reorder / remove items.
     Content lives in assets/data/site.json.
     pin: passcode to unlock the panel.
     github.token is filled in when the site is deployed, so
     Hannah's edits can save themselves to the live site.
     ---------------------------------------------------------- */
  studio: {
    pin: "hannah",
    github: {
      owner: "virslaan",
      repo: "hannahcjew",
      branch: "main",
      token: "__STUDIO_TOKEN__",
    },
  },
};
