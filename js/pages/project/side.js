/* =========================================================
   Project page — right column (details, team with roles, what I did) + related projects.
   ========================================================= */
import { esc, txt, tr, t, icon, tagsHTML, markdown, projectUrl, teamUrl, CATEGORY_ICONS, teamById, projectMembers, personLink, teamLogoHTML } from '../../core/index.js';

export function sideHTML(p, cat) {
  const rows = [
    p.year ? [t('project.year'), txt(p.year)] : null,
    cat ? [t('project.category'), txt(cat.label)] : null,
  ].filter(Boolean);
  let html = `
    <div class="pp-side-card reveal">
      <h3>${esc(t('project.details'))}</h3>
      <dl>${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>
      ${(tr(p.tags) || []).length ? `<h4>${esc(t('project.tech'))}</h4>${tagsHTML(p.tags)}` : ''}
    </div>`;
  const team = p.team && teamById(p.team.id);
  const members = projectMembers(p);
  if (team || members.length) {
    html += `
    <div class="pp-side-card pp-team reveal">
      <h3>${icon('users')}${esc(t('project.team'))}</h3>
      ${team ? `<a class="pp-team-head" href="${esc(teamUrl(team.id))}">${teamLogoHTML(team, 'pp-team-logo', p.team.logo || team.logo)}<span><strong>${txt(p.team.name || team.name)}</strong><small>${esc(t('team.open'))} →</small></span></a>` : ''}
      ${members.length ? `<ul class="pp-members">${members.map(({ person, role }) => `
        <li class="${person.me ? 'me' : ''}">
          <span class="pp-member-name">${personLink(person)}${person.me ? `<span class="badge badge-featured">${esc(t('project.you'))}</span>` : ''}</span>
          ${role ? `<span class="pp-member-role">${txt(role)}</span>` : ''}
        </li>`).join('')}</ul>` : ''}
    </div>`;
  }
  const did = (p.whatIDid || p.myRole?.items || []).filter(Boolean);
  if (did.length) {
    html += `
    <div class="pp-side-card pp-role reveal">
      <h3>${esc(t('project.myRole'))}</h3>
      <ul class="pp-role-list">${did.map((it) => `<li>${markdown(tr(it)).replace(/^<p>|<\/p>$/g, '')}</li>`).join('')}</ul>
    </div>`;
  }
  return html;
}

export function relatedHTML(p, cfg) {
  const rel = (p.related || []).map((rid) => (cfg.projects || []).find((x) => x.id === rid && !x.hidden)).filter(Boolean);
  if (!rel.length) return '';
  return `
  <section class="container pp-related reveal">
    <h2 class="pp-block-title">${esc(t('project.related'))}</h2>
    <div class="pp-related-grid">${rel.map((r) => `
      <a class="pp-related-card" href="${esc(projectUrl(r.id))}" data-pid="${esc(r.id)}">
        ${r.icon ? `<img src="${esc(r.icon)}" alt="">` : `<span class="pp-related-ph">${icon(CATEGORY_ICONS[r.category] || 'cube')}</span>`}
        <span><strong>${txt(r.title)}</strong>${r.summary ? `<small>${txt(r.summary)}</small>` : ''}</span>
      </a>`).join('')}</div>
  </section>`;
}
