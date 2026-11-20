/* =========================================================
   Shared state of the current page + loading of data/*.json.
   ========================================================= */

/** Everything loaded from data/*.json lives in site.data (also window.__portfolio for debugging). */
export const site = { data: null, page: 'home', game: null, gameLoading: null, revealIO: null };

/** Data files loaded on every page. */
export const DATA = {
  profile: 'data/profile.json',
  socials: 'data/socials.json',
  projects: 'data/projects.json',
  teams: 'data/teams.json',
  people: 'data/people.json',
  characters: 'data/characters.json',
  game: 'data/game.json',
};

/** fetch() + JSON, always fresh (no-cache) so edits in data/ show up immediately. */
export async function loadJSON(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}
