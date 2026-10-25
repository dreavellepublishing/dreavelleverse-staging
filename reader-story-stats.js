/* DreavelleVerse: public story popularity counts. Read-only; existing like/follow logic stays untouched. */
(() => {
  const id = new URLSearchParams(location.search).get('id');
  const db = window.supabaseClient;
  if (!id || !db || !document.getElementById('dv-public-reads')) return;
  const set = (name, value) => {
    const node = document.getElementById('dv-public-' + name);
    if (node) node.textContent = value == null ? '—' : Number(value).toLocaleString();
  };
  let requestId = 0;
  async function refresh() {
    const request = ++requestId;
    const [reads, likes, follows, stars] = await Promise.all([
      db.from('stories').select('total_reads').eq('id', id).maybeSingle(),
      db.from('story_likes').select('id', {count:'exact',head:true}).eq('story_id',id),
      db.from('story_follows').select('id', {count:'exact',head:true}).eq('story_id',id),
      db.rpc('dv_story_star_total', {p_story_id:id})
    ]);
    if (request !== requestId) return;
    if (reads.error) console.warn('Public story reads:', reads.error);
    if (likes.error) console.warn('Public story likes:', likes.error);
    if (follows.error) console.warn('Public story follows:', follows.error);
    set('reads', reads.error || !reads.data ? null : (reads.data.total_reads ?? 0));
    set('likes', likes.error ? null : (likes.count ?? 0));
    set('follows', follows.error ? null : (follows.count ?? 0));
    set('stars', stars.error ? null : (stars.data ?? 0));
  }
  refresh();
  ['like-story-button','follow-story-button'].forEach(buttonId => {
    const button = document.getElementById(buttonId);
    if (!button) return;
    button.addEventListener('click', () => {
      // Wait for the existing asynchronous like/follow handler to finish.
      let attempts = 0;
      const check = () => {
        if (!button.disabled || ++attempts > 30) refresh();
        else setTimeout(check, 150);
      };
      setTimeout(check, 100);
    });
  });
  document.addEventListener('visibilitychange', () => {if (!document.hidden) refresh();});
})();
