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
     username: the handle shown in follow links.
     posts:    paste full post URLs here (up to 8 look best).
               When this list has links, the home page renders
               each post as a real Instagram embed.
               When it is empty, the site shows the profile
               grid embed instead, with a follow-button fallback.

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
     canPublish: leave false so Hannah downloads a file and
                 emails it to Vipul. He puts it live. Set true
                 only if a GitHub token will be used in-browser.
     github: used only when canPublish is true.
     ---------------------------------------------------------- */
  studio: {
    pin: "hannah",
    canPublish: false,
    github: {
      owner: "virslaan",
      repo: "hannahcjew",
      branch: "main",
    },
  },
};
