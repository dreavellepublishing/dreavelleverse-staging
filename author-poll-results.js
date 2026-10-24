/* Author-only results panel. Does not change voting or existing chapter editing. */
(() => {
  const db = window.supabaseClient;
  const panel = document.getElementById('dv-author-poll-results-panel');
  if (!db || !panel) return;
  const question = document.getElementById('dv-author-results-question');
  const totalEl = document.getElementById('dv-author-results-total');
  const bars = document.getElementById('dv-author-results-bars');
  const message = document.getElementById('dv-author-results-message');
  const refresh = document.getElementById('dv-author-refresh-results');
  const context = () => ({
    storyId: localStorage.getItem('dreavelleVerseStoryId'),
    chapter: Number(localStorage.getItem('dreavelleVerseCurrentChapter') || 1)
  });
  let lastKey = '';
  let seq = 0;
  function clear() { panel.hidden = true; question.textContent = ''; totalEl.textContent = ''; bars.replaceChildren(); message.textContent = ''; }
  async function load() {
    const ctx = context();
    const key = `${ctx.storyId}:${ctx.chapter}`;
    const current = ++seq;
    clear();
    if (!ctx.storyId || !Number.isInteger(ctx.chapter) || ctx.chapter < 0) return;
    try {
      const {data: userInfo} = await db.auth.getUser();
      if (!userInfo?.user || current !== seq) return;
      const {data: chapter, error: chapterError} = await db.from('chapters').select('user_id').eq('story_id', ctx.storyId).eq('chapter_number', ctx.chapter).maybeSingle();
      if (chapterError || !chapter || chapter.user_id !== userInfo.user.id || current !== seq) return;
      const {data: poll, error: pollError} = await db.from('dv_chapter_engagement').select('poll_question,poll_options').eq('story_id',ctx.storyId).eq('chapter_number',ctx.chapter).maybeSingle();
      if (pollError) throw pollError;
      const choices = Array.isArray(poll?.poll_options) ? poll.poll_options : [];
      if (!poll?.poll_question || choices.length < 2 || current !== seq) return;
      panel.hidden = false;
      question.textContent = poll.poll_question;
      const {data: votes, error: votesError} = await db.from('dv_chapter_poll_votes').select('option_index').eq('story_id',ctx.storyId).eq('chapter_number',ctx.chapter);
      if (votesError) throw votesError;
      if (current !== seq) return;
      const count = votes.length;
      totalEl.textContent = `${count} vote${count === 1 ? '' : 's'}`;
      bars.replaceChildren();
      choices.forEach((choice, i) => {
        const n = votes.filter(v => v.option_index === i).length;
        const pct = count ? Math.round(n / count * 100) : 0;
        const row = document.createElement('div'); row.style.marginBottom = '14px';
        const label = document.createElement('div'); label.style.cssText = 'display:flex;justify-content:space-between;gap:10px;margin-bottom:5px;flex-wrap:wrap;';
        const name = document.createElement('span'); name.textContent = choice;
        const value = document.createElement('span'); value.textContent = `${pct}% (${n})`;
        label.append(name,value);
        const track = document.createElement('div'); track.style.cssText = 'height:10px;border-radius:20px;background:#ede2f0;overflow:hidden;';
        const fill = document.createElement('div'); fill.style.cssText = `height:100%;width:${pct}%;background:#914cb0;border-radius:20px;`;
        track.append(fill);row.append(label,track);bars.append(row);
      });
      message.textContent = count ? '' : 'No votes yet. Results will appear here when readers vote.';
    } catch(e) {
      if (current !== seq) return;
      panel.hidden = false;
      message.textContent = `Could not load poll results: ${e.message}`;
    }
  }
  refresh.addEventListener('click', load);
  document.getElementById('dv-save-author-tools')?.addEventListener('click', () => setTimeout(load, 800));
  setInterval(() => {
    const ctx = context(); const key = `${ctx.storyId}:${ctx.chapter}`;
    if (key !== lastKey) {lastKey = key;load();}
  }, 1000);
  lastKey = `${context().storyId}:${context().chapter}`;
  load();
})();
