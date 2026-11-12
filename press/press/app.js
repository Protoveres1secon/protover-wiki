(() => {
  const $ = (id) => document.getElementById(id);
  const safe = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date = new Date();
  $('todayDate').textContent = date.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  $('year').textContent = date.getFullYear();
  const savedTheme = localStorage.getItem('protoveres-press-public-theme') || 'light';
  document.documentElement.dataset.theme = savedTheme;
  $('themeToggle').textContent = savedTheme === 'dark' ? 'Light mode' : 'Dark mode';
  $('themeToggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('protoveres-press-public-theme', next);
    $('themeToggle').textContent = next === 'dark' ? 'Light mode' : 'Dark mode';
  });
  const savedLayout = localStorage.getItem('protoveres-press-reader-layout') || 'mosaic';
  $('layoutSelect').value = savedLayout;
  $('storyGrid').dataset.layout = savedLayout;
  $('layoutSelect').addEventListener('change', () => {
    $('storyGrid').dataset.layout = $('layoutSelect').value;
    localStorage.setItem('protoveres-press-reader-layout', $('layoutSelect').value);
  });
  let allStories = [];
  function storyCard(s) {
    const href = safe(s.url || '#');
    const image = s.image ? `<img class="story-image" src="${safe(s.image)}" alt="${safe(s.imageAlt || s.title || 'Story image')}" loading="lazy">` : `<div class="story-no-image">PROTOVERES PRESS</div>`;
    return `<a class="story-card" href="${href}">${image}<div class="story-copy"><div class="story-category">${safe(s.category || 'News')}</div><h3>${safe(s.title || 'Untitled story')}</h3><p>${safe(s.excerpt || '')}</p><div class="story-meta">${safe(s.date || '')}</div></div></a>`;
  }
  function renderStories() {
    const q = $('storySearch').value.trim().toLowerCase();
    const stories = allStories.filter(s => s && s.status === 'published' && [s.title,s.excerpt,s.category].join(' ').toLowerCase().includes(q));
    $('storyCount').textContent = `${stories.length} ${stories.length === 1 ? 'story' : 'stories'}`;
    if (!stories.length) {
      $('storyGrid').innerHTML = `<div class="empty-state"><div class="empty-state-mark">P</div><h3>${q ? 'No matching stories' : 'The first edition is being prepared'}</h3><p>${q ? 'Try another search term.' : 'No stories have been published yet. Please check back soon.'}</p></div>`;
      $('breakingText').textContent = q ? 'No matching stories found.' : 'The newsroom is preparing its first stories. New reports will appear here after publication.';
      $('researchList').innerHTML = `<div class="empty-state"><h3>Research updates will appear here</h3><p>Published research stories will be listed in this section.</p></div>`;
      return;
    }
    $('storyGrid').innerHTML = stories.map(storyCard).join('');
    $('breakingText').textContent = stories.slice(0,4).map(s => s.title).join('  •  ');
    const research = stories.filter(s => /research|science|study|discovery/i.test(`${s.category||''} ${s.title||''}`));
    $('researchList').innerHTML = research.length ? research.slice(0,5).map(s => `<p style="margin:0;padding:10px 0;border-bottom:1px solid var(--line)"><a href="${safe(s.url||'#')}" style="color:var(--ink);font-weight:bold;text-decoration:none">${safe(s.title)}</a><br><span style="font:11px Arial,sans-serif;color:var(--muted)">${safe(s.date||'')}</span></p>`).join('') : `<div class="empty-state"><h3>No research stories yet</h3><p>Research and discovery articles will appear here.</p></div>`;
  }
  $('storySearch').addEventListener('input',renderStories);
  fetch('articles.json',{cache:'no-store'}).then(r => r.ok ? r.json() : []).then(data => { allStories = Array.isArray(data) ? data : []; renderStories(); }).catch(() => { allStories = []; renderStories(); });
})();
