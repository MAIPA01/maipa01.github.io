/* =========================================================
   Public API for the pages (js/pages/*.js): import everything from here.

   core/
     dom.js        $, $$, esc, txt, visible, URLs
     storage.js    localStorage / sessionStorage helpers
     i18n.js       translations (data/i18n/*.json, {"en","pl"} fields)
     icons.js      SVG icons
     site.js       shared page state + loading data/*.json
     boot.js       bootPage() — every page starts here
     chrome.js     header, footer, day/night theme, language switch, reveal animation
     content.js    tags, link buttons, project cards, teams & people
     markdown.js   Markdown → HTML (also .md files)
     media.js      lightbox, video player, video covers
     viewer3d.js   3D viewer (.glb/.gltf, .vrm, obfuscated .obf)
     vrm.js        VRM characters (three-vrm) — loaded on demand
     levels.js     project page layouts, game levels, progress, console dev tools
     play.js       play mode bootstrap (loads js/game/ on demand)
   ========================================================= */
export { icon } from './icons.js';
export { t, tf, tObj, tr, onLanguageChange, currentLanguage } from './i18n.js';
export { $, $$, esc, txt, visible, isExternal, projectUrl, teamUrl } from './dom.js';
export { store, session } from './storage.js';
export { site, loadJSON } from './site.js';
export { bootPage } from './boot.js';
export { initReveal, currentTheme } from './chrome.js';
export {
  LINK_ICONS, CATEGORY_ICONS, tagsHTML, linksHTML, personById, teamById, projectMembers, projectsOfTeam,
  personLink, teamLogoHTML, categoryOf, projectCardHTML, homeProjectOrder,
} from './content.js';
export { markdown, loadMarkdownFiles } from './markdown.js';
export { openLightbox, parseVideo, openVideo, hydrateVideoCovers } from './media.js';
export { loadModelViewer, resolveModelUrl, mountModel } from './viewer3d.js';
export { PROJECT_LAYOUTS, projectVideos, projectBlocks, levelList, readProgress, isPortfolioComplete } from './levels.js';
export { playableCharacters, togglePlay, currentPageKey } from './play.js';
