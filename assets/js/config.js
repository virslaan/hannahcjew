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
};
