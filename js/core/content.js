/* =========================================================
   HTML building blocks for content: tags, link buttons, project cards,
   teams & people (data/teams.json, data/people.json).
   ========================================================= */
import { icon } from './icons.js';
import { t, tr } from './i18n.js';
import { esc, txt, visible, isExternal, projectUrl } from './dom.js';
import { site } from './site.js';
import { parseVideo } from './media.js';

/* ---------- Tags & link buttons ---------- */
export const LINK_ICONS = { github: 'github', itch: 'itch', playstore: 'playstore', youtube: 'youtube', vimeo: 'vimeo', web: 'web', download: 'download', docs: 'docs', vroid: 'vroid', play: 'play' };

export function tagsHTML(tags, cls = 'tags') {
  const list = tr(tags);
  if (!list || !list.length) return '';
  return `<div class="${cls}">${list.map((tag) => `<span class="tag">${txt(tag)}</span>`).join('')}</div>`;
}

/** Link buttons. YouTube / Vimeo links open in the built-in player instead of leaving the page. */
export function linksHTML(links, { cls = 'project-links', primaryFirst = true } = {}) {
  const list = (links || []).filter((l) => l && l.url && !l.hidden);
  if (!list.length) return '';
  return `<div class="${cls}">${list.map((l, i) => {
    const ext = isExternal(l.url);
    const video = parseVideo(l.url);
    const attrs = ext ? (l.url.startsWith('mailto:') ? '' : 'target="_blank" rel="noopener"') : (l.type === 'download' ? 'download' : '');
    const label = tr(l.label) || t(`links.${l.type}`, t('links.link'));
    const href = ext ? l.url : encodeURI(l.url);
    return `<a class="project-link${primaryFirst && i === 0 ? ' primary' : ''}" href="${esc(href)}" ${attrs}${video ? ` data-video="${esc(l.url)}" data-video-title="${esc(label)}"` : ''}${l.cover ? ` data-video-cover="${esc(l.cover)}"` : ''}>${icon(l.icon || LINK_ICONS[l.type] || 'link')}${esc(label)}</a>`;
  }).join('')}</div>`;
}

/* =========================================================
   Teams & people (data/teams.json, data/people.json)
   ========================================================= */
export const personById = (id) => (site.data?.people?.people || []).find((x) => x.id === id);
export const teamById = (id) => (site.data?.teams?.teams || []).find((x) => x.id === id && !x.hidden);
/** Members of a project's team with their role in THIS project: [{ person, role }] */
export function projectMembers(p) {
  return (p.team?.members || []).map((m) => ({ person: personById(m.person) || { id: m.person, name: m.person }, role: m.role })).filter((m) => m.person);
}
export const projectsOfTeam = (teamId) => (site.data?.projects?.projects || []).filter((p) => visible(p) && p.team?.id === teamId);
export function personLink(person, cls = '') {
  const url = (person.links || []).find((l) => l.url)?.url || person.url;
  return url ? `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener">${txt(person.name)}</a>` : `<span class="${cls}">${txt(person.name)}</span>`;
}
/**
 * Team logo, or a pixel badge with the initials when the team has none.
 * A project can show a different logo for its team: project.team.logo (e.g. a sub-team).
 */
export function teamLogoHTML(team, cls = 'team-logo', logo = team.logo) {
  if (logo) return `<img class="${cls}" src="${esc(logo)}" alt="">`;
  const initials = String(tr(team.name) || '?').replace(/[^\p{L}\p{N} ]/gu, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  return `<span class="${cls} team-logo-ph" aria-hidden="true">${esc(initials)}</span>`;
}

/* =========================================================
   Project cards (home page + team pages)
   ========================================================= */
export const CATEGORY_ICONS = { game: 'gamepad', engine: 'engine', renderer: 'render', library: 'docs', app: 'app', tool: 'app', model: 'cube' };
export const categoryOf = (p) => (site.data?.projects?.categories || []).find((c) => c.id === p.category);

function cardMediaHTML(p, cat) {
  const img = p.banner && p.cardImage !== 'icon' ? p.banner : (p.icon || p.image);
  if (!img) return `<div class="project-placeholder">${icon((cat && cat.icon) || CATEGORY_ICONS[p.category] || 'cube')}</div>`;
  const contain = img === (p.icon || p.image) && (p.iconFit || p.imageFit) === 'contain';
  return `<div class="project-media-inner${contain ? ' contain' : ''}"${contain ? ` style="--img:url('${esc(new URL(img, location.href).href)}')"` : ''}>
    <img src="${esc(img)}" alt="" loading="lazy"></div>`;
}
export function projectCardHTML(p, { reveal = true } = {}) {
  const cat = categoryOf(p);
  const hasPlay = (p.links || []).some((l) => l.type === 'playstore' && l.url);
  const title = tr(p.title);
  const href = p.id ? projectUrl(p.id) : '';
  const badges = [
    p.featured ? `<span class="badge badge-featured">${esc(t('projects.featured'))}</span>` : '',
    cat ? `<span class="badge">${txt(cat.label)}</span>` : '',
    p.webBuild?.url ? `<span class="badge badge-play">${icon('play')}${esc(t('links.play'))}</span>` : '',
  ].join('');
  const summary = p.summary || p.description;
  return `
  <article class="project-card${reveal ? ' reveal' : ''}" data-id="${esc(p.id || '')}" data-category="${esc(p.category)}" data-play="${hasPlay ? 1 : 0}" data-title="${esc(title)}">
    ${href ? `<a class="card-link" href="${esc(href)}" aria-label="${esc(title)} — ${esc(t('projects.open'))}"></a>` : ''}
    <div class="project-media">${cardMediaHTML(p, cat)}<div class="project-badges">${badges}</div></div>
    <div class="project-body">
      <div class="project-meta"><h3>${esc(title)}</h3>${p.year ? `<span class="project-year">${txt(p.year)}</span>` : ''}</div>
      ${summary && typeof tr(summary) === 'string' ? `<p class="project-desc">${txt(summary)}</p>` : ''}
      ${tagsHTML(p.tags)}
      <div class="card-actions">
        ${linksHTML(p.links)}
        ${href ? `<a class="details-link" href="${esc(href)}">${esc(t('projects.open'))} →</a>` : ''}
      </div>
    </div>
  </article>`;
}

/** Order of projects on the home page (featured first, then JSON order). */
export function homeProjectOrder(data = site.data) {
  const cats = data.projects.categories || [];
  const shown = (p) => visible(p) && cats.find((c) => c.id === p.category)?.showInProjects !== false;
  const list = (data.projects.projects || []).map((p, i) => ({ p, i }));
  const grid = list.filter(({ p }) => shown(p)).sort((a, b) => (!!b.p.featured - !!a.p.featured) || a.i - b.i).map(({ p }) => p);
  const models = list.filter(({ p }) => visible(p) && p.category === 'model').map(({ p }) => p);
  return { grid, models };
}

