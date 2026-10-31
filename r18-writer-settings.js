/* DreavelleVerse R18 Phase 2 — writer settings only. No reader gating. */
(() => {
  'use strict';
  const root = document.getElementById('dv-r18-editor');
  if (!root) return;
  const manual = document.getElementById('dv-r18-manual');
  const level = document.getElementById('dv-r18-level');
  const save = document.getElementById('dv-r18-save');
  const status = document.getElementById('dv-r18-save-status');
  const review = document.getElementById('dv-r18-review-status');
  const categories = [...root.querySelectorAll('input[name="dv-r18-category"]')];
  const client = window.supabaseClient;
  if (!client) { status.textContent = 'Database connection unavailable.'; save.disabled = true; return; }
  const storyId = localStorage.getItem('dreavelleVerseStoryId');
  const chapterNumber = Number(localStorage.getItem('dreavelleVerseCurrentChapter') || 1);
  let ownerId = null;
  let storedAdult = false;
  let storedLevel = 'general';
  let initialized = false;
  function reconcile() {
    if (manual.checked) level.value = 'adult';
    if (level.value === 'adult') manual.checked = true;
    else manual.checked = false;
  }
  manual.addEventListener('change', () => {
    if (manual.checked) level.value = 'adult';
    else if (level.value === 'adult') level.value = 'advisory';
  });
  level.addEventListener('change', () => { manual.checked = level.value === 'adult'; });
  async function load() {
    if (!storyId || !Number.isInteger(chapterNumber) || chapterNumber < 1) {
      status.textContent = 'Story or chapter not selected.'; save.disabled = true; return;
    }
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth?.user) { status.textContent = 'Log in to manage content warnings.'; save.disabled = true; return; }
    ownerId = auth.user.id;
    const { data, error } = await client.from('chapters')
      .select('id,is_r18,content_warning_level,content_warning_categories,moderation_status')
      .eq('story_id', storyId).eq('chapter_number', chapterNumber).eq('user_id', ownerId).maybeSingle();
    if (error) { status.textContent = 'Could not load warning settings: ' + error.message; save.disabled = true; return; }
    if (!data) { status.textContent = 'Save the chapter as a draft first, then save warnings.'; save.disabled = true; return; }
    storedAdult = Boolean(data.is_r18);
    storedLevel = data.content_warning_level || 'general';
    manual.checked = storedAdult || storedLevel === 'adult';
    level.value = manual.checked ? 'adult' : (['general','advisory'].includes(storedLevel) ? storedLevel : 'general');
    const selected = new Set(Array.isArray(data.content_warning_categories) ? data.content_warning_categories : []);
    categories.forEach(c => { c.checked = selected.has(c.value); });
    review.textContent = 'Automatic scan: ' + (data.moderation_status || 'not_scanned').replaceAll('_',' ');
    initialized = true;
    save.disabled = false;
    status.textContent = 'Existing warning settings loaded.';
  }
  save.addEventListener('click', async () => {
    if (!initialized || !ownerId) return;
    reconcile();
    save.disabled = true;
    status.textContent = 'Saving warning settings…';
    const adult = level.value === 'adult';
    const selected = categories.filter(c => c.checked).map(c => c.value);
    // Do not change moderation_status: only a trusted backend may set scan results.
    const { data, error } = await client.from('chapters').update({
      is_r18: adult,
      content_warning_level: level.value,
      content_warning_categories: selected
    }).eq('story_id', storyId).eq('chapter_number', chapterNumber)
      .eq('user_id', ownerId).select('id');
    save.disabled = false;
    if (error) { status.textContent = 'Save failed: ' + error.message; return; }
    if (!data?.length) { status.textContent = 'No chapter updated. Check chapter ownership and database permissions.'; return; }
    status.textContent = 'Content warnings saved to Supabase. Reader restrictions are NOT active yet.';
  });
  load().catch(err => { status.textContent = 'Could not load settings: ' + err.message; save.disabled = true; });
})();
