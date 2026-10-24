/* Homepage promotions: same active dv_promotions source and eligibility rules as Discover. */
(() => {
  'use strict';
  const db = window.supabaseClient;
  const bannerBox = document.getElementById('home-banner-content');
  const smallBox = document.getElementById('home-small-content');
  if (!db || !bannerBox || !smallBox) return;
  const bannerPrev = document.getElementById('home-banner-prev');
  const bannerNext = document.getElementById('home-banner-next');
  const smallPrev = document.getElementById('home-small-prev');
  const smallNext = document.getElementById('home-small-next');
  const bannerStatus = document.getElementById('home-banner-status');
  const smallStatus = document.getElementById('home-small-status');
  const make = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text !== undefined) node.textContent = text; return node; };
  const storyUrl = id => `read-story.html?id=${encodeURIComponent(id)}`;
  const button = (text, href, cls) => { const a = make('a', cls, text); a.href = href; return a; };
  const cover = (story, cls) => {
    if (!/^https?:\/\//i.test(story.cover_url || '')) return make('div', cls + '-placeholder', 'Story Cover');
    const img = make('img', cls); img.src = story.cover_url; img.alt = `${story.title || 'Story'} cover`; img.loading = 'lazy'; return img;
  };
  const fallbackMarkup = bannerBox.innerHTML;
  function renderFallback() { bannerBox.innerHTML = fallbackMarkup; bannerPrev.hidden = bannerNext.hidden = true; bannerStatus.textContent = ''; }
  function firstBannerIndex(count) {
    if (count < 2) return 0;
    // Each page visit advances to the next eligible promotion on this browser.
    // Random initial offset prevents every new browser from always seeing the first item.
    try {
      const key = 'dv-home-banner-turn-v1';
      const stored = Number(sessionStorage.getItem(key));
      const next = Number.isSafeInteger(stored) && stored >= 0 ? stored + 1 : Math.floor(Math.random() * count);
      sessionStorage.setItem(key, String(next));
      return next % count;
    } catch (_) { return Math.floor(Math.random() * count); }
  }
  function renderBanner(promo) {
    const card = make('article', 'home-featured-banner');
    card.append(cover(promo.story, 'home-banner-cover'));
    const copy = make('div', 'home-banner-copy');
    copy.append(make('p', 'home-eyebrow', promo.kind === 'pair' ? 'PAIR PROMOTION' : 'FEATURED BANNER PROMOTION'));
    copy.append(make('h3', '', promo.headline || promo.story.title || 'Featured Story'));
    copy.append(make('p', 'home-author', `By ${promo.story.author || 'Unknown Author'}`));
    const actions = make('div', 'home-banner-actions');
    actions.append(button('Read Story', storyUrl(promo.story.id), 'home-primary-button'));
    if (promo.partner) actions.append(button('Read Partner Story', storyUrl(promo.partner.id), 'home-secondary-button'));
    copy.append(actions); card.append(copy); bannerBox.replaceChildren(card);
  }
  function renderSmall(promo) {
    const card = make('article', 'home-small-card');
    card.append(cover(promo.story, 'home-small-cover'));
    card.append(make('h3', '', promo.headline || promo.story.title || 'Featured Story'));
    card.append(make('p', '', `By ${promo.story.author || 'Unknown Author'}`));
    card.append(button('Read Story', storyUrl(promo.story.id), ''));
    return card;
  }
  async function loadPromotions() {
    const today = new Date().toISOString().slice(0, 10);
    const { data: promotions, error } = await db.from('dv_promotions')
      .select('id,owner_id,story_id,partner_story_id,kind,headline,description,start_date,end_date,partner_approved')
      .lte('start_date', today).gte('end_date', today).limit(300);
    if (error) throw error;
    const ids = [...new Set((promotions || []).flatMap(p => [p.story_id, p.partner_story_id].filter(Boolean)))];
    const stories = [];
    for (let i = 0; i < ids.length; i += 80) {
      const { data, error: storyError } = await db.from('stories')
        .select('id,title,author,cover_url,status').in('id', ids.slice(i, i + 80)).eq('status', 'Published');
      if (storyError) throw storyError;
      stories.push(...(data || []));
    }
    const byId = new Map(stories.map(s => [String(s.id), s]));
    const small = [], big = [];
    for (const promo of promotions || []) {
      if (promo.kind === 'pair' && !promo.partner_approved) continue;
      const story = byId.get(String(promo.story_id));
      if (!story) continue;
      const partner = promo.partner_story_id ? byId.get(String(promo.partner_story_id)) : null;
      if (promo.kind === 'pair' && !partner) continue;
      const record = { ...promo, story, partner };
      if (promo.kind === 'large' || promo.kind === 'pair') big.push(record);
      else small.push(record);
    }
    // Stable ordering makes rotation predictable, without changing promotion eligibility.
    big.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    small.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    let activeBanner = firstBannerIndex(big.length);
    function showBanner() {
      if (!big.length) { renderFallback(); return; }
      renderBanner(big[activeBanner]);
      bannerPrev.hidden = bannerNext.hidden = big.length <= 1;
      bannerStatus.textContent = big.length > 1 ? `Banner ${activeBanner + 1} of ${big.length}` : '';
    }
    bannerPrev.addEventListener('click', () => { activeBanner = (activeBanner - 1 + big.length) % big.length; showBanner(); });
    bannerNext.addEventListener('click', () => { activeBanner = (activeBanner + 1) % big.length; showBanner(); });
    showBanner();
    let smallPage = 0;
    const pageSize = 5;
    const pages = Math.ceil(small.length / pageSize);
    function showSmall() {
      smallBox.replaceChildren();
      if (!small.length) smallBox.append(make('p', 'home-small-empty', 'No active small spotlight promotions yet. Discover more stories while new promotions are being prepared.'));
      else small.slice(smallPage * pageSize, (smallPage + 1) * pageSize).forEach(p => smallBox.append(renderSmall(p)));
      smallPrev.hidden = smallNext.hidden = pages <= 1;
      smallStatus.textContent = pages > 1 ? `Page ${smallPage + 1} of ${pages}` : '';
    }
    smallPrev.addEventListener('click', () => { smallPage = (smallPage - 1 + pages) % pages; showSmall(); });
    smallNext.addEventListener('click', () => { smallPage = (smallPage + 1) % pages; showSmall(); });
    showSmall();
  }
  loadPromotions().catch(error => {
    console.error('Homepage promotion loading failed:', error);
    renderFallback();
    smallBox.replaceChildren(make('p', 'home-small-empty', 'Promotions are temporarily unavailable. Please try again later.'));
  });
})();
