/* =========================================================
   MAIPA portfolio — team page: team.html?id=<id from data/teams.json>
   Logo, description, members (with their roles across the team's projects) and projects.
   ========================================================= */
import {
  bootPage, $, esc, txt, tr, t, tf, icon, visible, linksHTML, markdown, loadMarkdownFiles,
  teamById, projectsOfTeam, personById, personLink, teamLogoHTML, projectCardHTML,
} from './core.js';

const id = new URLSearchParams(location.search).get('id');
bootPage({ page: 'team', render });

function render() {
  const team = teamById(id);
  const main = $('#main');
  if (!team) {
    document.title = `${t('team.notFound')} — MAIPA`;
    main.innerHTML = `
      <section class="pp-missing container"><div class="nf-card reveal">
        <p class="pixel-label nf-label">404</p>
        <h1 class="title">${esc(t('team.notFound'))}</h1>
        <p>${esc(t('team.notFoundText'))}</p>
        <a class="btn-pixel btn-pixel-lg pp-back" href="index.html#projects">${esc(t('project.back'))}</a>
      </div></section>`;
    return;
  }
  loadMarkdownFiles([team.description]).then((loaded) => { if (loaded) render(); });
  const name = tr(team.name);
  document.title = tf('meta.projectTitle', { title: name });
  const projects = projectsOfTeam(team.id);

  // members: team list first, then anyone who appears only in a project
  const ids = [...(team.members || [])];
  projects.forEach((p) => (p.team.members || []).forEach((m) => { if (!ids.includes(m.person)) ids.push(m.person); }));
  const members = ids.map((pid) => {
    const person = personById(pid) || { id: pid, name: pid };
    const roles = projects.map((p) => {
      const m = (p.team.members || []).find((x) => x.person === pid);
      return m && m.role ? { project: p, role: m.role } : null;
    }).filter(Boolean);
    return { person, roles };
  });

  main.innerHTML = `
    <header class="pp-hero tp-hero${team.banner ? ' has-banner' : ''}" ${team.banner ? `style="--banner:url('${esc(new URL(team.banner, location.href).href)}')"` : ''}>
      <div class="container pp-hero-inner">
        <a class="pp-back" href="index.html#projects">${icon('back')}<span>${esc(t('project.back'))}</span></a>
        <div class="pp-head">
          ${teamLogoHTML(team, 'pp-icon tp-logo')}
          <div class="pp-titles">
            <div class="pp-badges"><span class="badge">${icon('users')}${esc(t('team.label'))}</span>
              <span class="badge badge-ghost">${esc(tf('team.counts', { members: members.length, projects: projects.length }))}</span></div>
            <h1 class="pp-title">${esc(name)}</h1>
            ${team.summary ? `<p class="pp-summary">${txt(team.summary)}</p>` : ''}
          </div>
        </div>
        ${linksHTML(team.links, { cls: 'project-links pp-links' })}
      </div>
    </header>
    <div class="container tp-layout">
      ${team.description ? `<section class="pp-block reveal"><h2 class="pp-block-title">${esc(t('team.about'))}</h2><div class="md">${markdown(tr(team.description))}</div></section>` : ''}
      <section class="pp-block reveal">
        <h2 class="pp-block-title">${esc(t('team.members'))}</h2>
        <div class="tp-members">${members.map(({ person, roles }) => `
          <article class="tp-member${person.me ? ' me' : ''}">
            <div class="tp-member-head">
              ${person.avatar ? `<img class="tp-avatar" src="${esc(person.avatar)}" alt="">` : `<span class="tp-avatar tp-avatar-ph">${esc(String(tr(person.name)).split(/\s+/).map((w) => w[0]).join('').slice(0, 2))}</span>`}
              <div><h3>${personLink(person)}${person.me ? ` <span class="badge badge-featured">${esc(t('project.you'))}</span>` : ''}</h3>
                ${person.title ? `<p class="tp-member-title">${txt(person.title)}</p>` : ''}</div>
            </div>
            ${roles.length ? `<ul class="tp-roles">${roles.map((r) => `<li><a href="project.html?id=${esc(r.project.id)}">${txt(r.project.title)}</a><span>${txt(r.role)}</span></li>`).join('')}</ul>` : ''}
          </article>`).join('')}</div>
      </section>
      <section class="tp-projects reveal">
        <h2 class="pp-block-title">${esc(t('team.projects'))}</h2>
        <div class="projects-grid">${projects.map((p) => projectCardHTML(p, { reveal: false })).join('')}</div>
      </section>
    </div>`;
}
