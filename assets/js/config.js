/* ============================================================
   SITE CONFIG · Hannah Jew 周健倫
   This is the one file to edit to control the theme and the
   Instagram feed. No other code changes needed.
   ============================================================ */

window.SITE_CONFIG = {
  /* ----------------------------------------------------------
     THEME
     Which look the site uses. Options:
       "seal"      · paper white / ink / vermillion red (original)
       "noir"      · black stage with a red spotlight
       "porcelain" · gallery white with cobalt blue
       "crimson"   · deep red curtain, warm cream text
       "jade"      · soft celadon with deep jade green
       "auto"      · let each visitor pick with the dropdown
                     (their choice is remembered on their device)

     To lock the whole site to one theme later, change "auto"
     to one of the five names above. The dropdown disappears
     automatically when a theme is locked.
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
     Friend-friendly editor for portfolio photos + credits.
     pin: passcode to unlock the panel on the live site.
     github: used only if she (or you) pastes a token in-browser
             to publish straight to the repo. Token is never
             stored in this file.
     ---------------------------------------------------------- */
  studio: {
    pin: "hannah",
    github: {
      owner: "virslaan",
      repo: "hannahcjew",
      branch: "main",
    },
  },
};
