
(() => {
  const client = window.supabaseClient;
  const calendar = document.getElementById('dv-writing-calendar');
  if (!client || !calendar) return;

  const summary = document.getElementById('dv-writing-summary');
  const heading = document.getElementById('dv-writing-month');
  const storySelect = document.getElementById('dv-writing-story-select');
  const storyNote = document.getElementById('dv-writing-story-note');
  const statWords = document.getElementById('dv-stat-words');
const statChapters = document.getElementById('dv-stat-chapters');
const statDays = document.getElementById('dv-stat-days');

  let month = new Date();
  month.setDate(1);

  let stories = [];
  let userId = '';
  let renderVersion = 0;

  const key = d =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const storageKey = userId =>
    `dvWritingSelectedStory:${userId}`;

  async function loadStories() {
    const { data: { user }, error: authError } =
      await client.auth.getUser();

    if (authError || !user) {
      summary.textContent =
        'Log in to see your private writing progress.';
      return false;
    }

    userId = user.id;

    const { data, error } = await client
      .from('stories')
      .select('id,title')
      .eq('user_id', userId)
      .order('title');

    if (error) {
      console.error(error);
      summary.textContent = 'Unable to load your stories.';
      return false;
    }

    stories = data || [];
    storySelect.replaceChildren();

    if (!stories.length) {
      storySelect.add(new Option('No stories available', ''));
      storySelect.disabled = true;
      summary.textContent =
        'Create a story to begin tracking writing progress.';
      return false;
    }

    for (const story of stories) {
      storySelect.add(new Option(story.title, story.id));
    }

    const savedId = localStorage.getItem(storageKey(userId));

    if (stories.some(story => story.id === savedId)) {
      storySelect.value = savedId;
    }

    storySelect.addEventListener('change', () => {
      localStorage.setItem(storageKey(userId), storySelect.value);
      render();
    });

    return true;
  }

  async function render() {
    const version = ++renderVersion;
    const selectedStoryId = storySelect.value;

    if (!selectedStoryId) return;

    const selectedStory = stories.find(
      story => story.id === selectedStoryId
    );

    const start = new Date(
      month.getFullYear(), month.getMonth(), 1
    );
    const end = new Date(
      month.getFullYear(), month.getMonth() + 1, 0
    );

    heading.textContent = start.toLocaleDateString(
      undefined, { month: 'long', year: 'numeric' }
    );

    summary.textContent = 'Loading story writing progress...';

    const { data, error } = await client
      .from('dv_story_writing_days')
      .select('activity_date,words_added,chapters_published')
      .eq('writer_id', userId)
      .eq('story_id', selectedStoryId)
      .gte('activity_date', key(start))
      .lte('activity_date', key(end));

    if (version !== renderVersion) return;

    if (error) {
      console.error(error);
      summary.textContent =
        'Unable to load story writing progress.';
      return;
    }

    const days = data || [];
    const byDate = new Map(
      days.map(day => [day.activity_date, day])
    );

    const totalWords = days.reduce(
      (sum, day) => sum + day.words_added, 0
    );

    const published = days.reduce(
      (sum, day) => sum + day.chapters_published, 0
    );

    const qualified = days.filter(
      day => day.words_added >= 100 ||
             day.chapters_published > 0
    ).length;
    // Update the writing statistics cards.
if (statWords) {
  statWords.textContent = totalWords.toLocaleString();
}

if (statChapters) {
  statChapters.textContent = published.toLocaleString();
}

if (statDays) {
  statDays.textContent = qualified.toLocaleString();
}

    summary.textContent =
      `${selectedStory.title}: ` +
      `${totalWords.toLocaleString()} new words · ` +
      `${published} chapters published · ` +
      `${qualified} qualifying days this month.`;

    if (storyNote) {
      storyNote.textContent =
        'Story-specific tracking began when the new system was installed. ' +
        'Earlier account-wide writing records are preserved separately. ' +
        'Promotion tickets still use the original account-wide rules.';
    }

    calendar.replaceChildren();

    for (const label of [
      'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'
    ]) {
      const el = document.createElement('strong');
      el.textContent = label;
      calendar.append(el);
    }

    for (let i = 0; i < start.getDay(); i++) {
      calendar.append(document.createElement('span'));
    }

    for (let day = 1; day <= end.getDate(); day++) {
      const date = key(new Date(
        start.getFullYear(), start.getMonth(), day
      ));

      const activity = byDate.get(date);
      const cell = document.createElement('div');
      cell.className = 'dv-writing-day';

      if (
        activity &&
        (activity.words_added >= 100 ||
         activity.chapters_published > 0)
      ) {
        cell.classList.add('dv-writing-qualified');
      }

      const number = document.createElement('strong');
      number.textContent = day;
      cell.append(number);

      if (activity) {
        const detail = document.createElement('small');
        detail.textContent =
          `${activity.words_added} words · ` +
          `${activity.chapters_published} published`;
        cell.append(detail);
      }

      calendar.append(cell);
    }
  }

  async function initialize() {
    if (!storySelect) {
      summary.textContent = 'Story selector unavailable.';
      return;
    }

    if (await loadStories()) {
      await render();
    }
  }

  document.getElementById('dv-writing-prev').onclick = () => {
    month.setMonth(month.getMonth() - 1);
    render();
  };

  document.getElementById('dv-writing-next').onclick = () => {
    month.setMonth(month.getMonth() + 1);
    render();
  };

  initialize().catch(error => {
    console.error(error);
    summary.textContent = 'Unable to load writing progress.';
  });
})();
