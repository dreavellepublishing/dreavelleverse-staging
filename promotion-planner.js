
(() => {
  const client = window.supabaseClient;
  if (!client) return;

  const $ = id => document.getElementById(id);
  const status = $('dv-planner-status');

  let userId = '';
  let myStories = [];

  const make = (tag, text) => {
    const n = document.createElement(tag);
    n.textContent = text;
    return n;
  };

  function option(select, story) {
    const opt = document.createElement('option');
    opt.value = story.id;
    opt.textContent = `${story.title} — ${story.author || 'Writer'}`;
    select.append(opt);
  }

  async function refresh() {
    const { data: { user }, error: authError } =
      await client.auth.getUser();

    if (authError || !user) {
      status.replaceChildren(
        make('span', 'Please log in to create promotions. ')
      );

      const a = make('a', 'Log in');
      a.href = 'login.html';
      status.append(a);

      $('dv-my-promos').textContent = 'Log in first.';
      $('dv-tickets').textContent = 'Log in first.';
      return;
    }

    userId = user.id;

    const { data: stories, error: storyError } =
      await client
        .from('stories')
        .select('id,title,author,user_id,status')
        .eq('status', 'Published')
        .limit(300);

    if (storyError) {
      status.textContent = 'Unable to load stories. Please try again.';
      return;
    }

    myStories = (stories || []).filter(
      s => s.user_id === userId
    );
    // Populate the story promotion dashboard selector.
const promotionStorySelect = $('promotion-story-select');
const promotionStoryProgress = $('promotion-story-progress');

if (promotionStorySelect) {
  promotionStorySelect.replaceChildren();

  if (myStories.length === 0) {
    const emptyOption = make('option', 'No published stories yet');
    emptyOption.value = '';
    promotionStorySelect.append(emptyOption);

    if (promotionStoryProgress) {
      promotionStoryProgress.textContent =
        'Publish a story to start tracking its promotion progress.';
    }
  } else {
  for (const story of myStories) {
    option(promotionStorySelect, story);
  }

  // Restore the previously selected story.
  const savedStoryId = localStorage.getItem(
    'dvPromotionSelectedStoryId'
  );

  if (myStories.some(story => story.id === savedStoryId)) {
    promotionStorySelect.value = savedStoryId;
  }

  const showSelectedStory = () => {
      const selectedStory = myStories.find(
        story => story.id === promotionStorySelect.value
      );

      if (promotionStoryProgress) {
        promotionStoryProgress.textContent = selectedStory
          ? `Selected story: ${selectedStory.title}. Story-specific progress and calendar will be added next.`
          : 'Select a story to view its progress.';
      }
    };

promotionStorySelect.addEventListener('change', () => {
  localStorage.setItem(
    'dvPromotionSelectedStoryId',
    promotionStorySelect.value
  );

  showSelectedStory();
});

    showSelectedStory();
  }
}

    status.textContent = myStories.length
      ? 'Redeem a ticket below to feature one of your published stories.'
      : 'Publish a story to redeem promotion tickets.';

    await loadLists();
    await loadTickets();
    await loadPrivateProgress();
  }

  async function loadTickets() {
    const box = $('dv-tickets');
    box.replaceChildren();

    const { data, error } = await client
      .from('dv_promotion_tickets')
      .select('id,kind,earned_at,expires_at,redeemed_at')
      .eq('writer_id', userId)
      .order('earned_at', { ascending: false })
      .limit(100);

    if (error) {
      box.textContent = 'Tickets are currently unavailable.';
      console.error(error);
      return;
    }

    const available = (data || []).filter(
      t => !t.redeemed_at &&
      new Date(t.expires_at).getTime() > Date.now()
    );

    if (!available.length) {
      box.textContent =
        'No available tickets. Write 100+ new words or publish a chapter on consecutive days to earn one.';
      return;
    }

    for (const t of available) {
      const item = document.createElement('div');
      item.className = 'dv-planner-item';

      const title = make(
        'strong',
        `${t.kind === 'large' ? 'Big' : 'Small'} Promotion Ticket`
      );

      const expiry = make(
        'p',
        `Expires: ${new Date(t.expires_at).toLocaleString()}`
      );

      const select = document.createElement('select');
      select.setAttribute('aria-label', 'Story to promote');

      myStories.forEach(s => option(select, s));

      const button = make('button', 'Redeem · 3-day banner');
      button.type = 'button';
      button.disabled = !myStories.length;

      button.onclick = async () => {
        if (!confirm(
          'Use this ticket once to promote your selected story for 3 days?'
        )) return;

        button.disabled = true;

        const { error } = await client.rpc(
          'dv_redeem_promotion_ticket',
          {
            p_ticket_id: t.id,
            p_story_id: select.value
          }
        );

        if (error) {
          status.textContent = 'Unable to redeem: ' + error.message;
          button.disabled = false;
          return;
        }

        status.textContent =
          'Ticket redeemed! Your story banner is now active for 3 days.';

        await loadTickets();
        await loadLists();
      };

      item.append(
        title,
        expiry,
        select,
        document.createTextNode(' '),
        button
      );

      box.append(item);
    }
  }

  async function loadLists() {
    const { data: promos, error } = await client
      .from('dv_promotions')
      .select('id,owner_id,story_id,kind,headline,start_date,end_date')
      .order('created_at', { ascending: false })
      .limit(200);

    const mine = $('dv-my-promos');
    mine.replaceChildren();

    if (error) {
      mine.textContent = 'Unable to load promotions.';
      console.error(error);
      return;
    }

    const my = (promos || []).filter(
      p => p.owner_id === userId && p.kind !== 'pair'
    );
    // Resolve promotion titles by story_id, not by the promotion headline.
    const ids = [...new Set(my.map(p => p.story_id).filter(Boolean))];
    let titleMap = new Map(myStories.map(s => [s.id, s.title]));
    if (ids.length) {
      const {data: promotedStories, error: lookupError} = await client
        .from('stories').select('id,title').in('id', ids);
      if (!lookupError) for (const story of promotedStories || []) {
        titleMap.set(story.id, story.title);
      }
    }
    const today = new Date().toISOString().slice(0,10);
    for (const p of my) {
      const item = document.createElement('div');
      item.className = 'dv-planner-item dv-promotion-entry';
      const body = document.createElement('div');
      const title = make('strong', titleMap.get(p.story_id) || 'Story unavailable');
      const kind = make('div', `${p.headline || 'Story promotion'} · ${p.kind === 'large' ? 'Big Banner' : 'Small Spotlight'}`);
      kind.className = 'dv-promotion-meta';
      const start = String(p.start_date || '').slice(0,10);
      const end = String(p.end_date || '').slice(0,10);
      const startTime = Date.parse(start + 'T00:00:00Z');
      const endTime = Date.parse(end + 'T00:00:00Z');
      const days = Number.isFinite(startTime) && Number.isFinite(endTime)
        ? Math.max(1, Math.round((endTime-startTime)/86400000)+1) : null;
      const period = make('div', `${start || 'Unknown'} to ${end || 'Unknown'}${days ? ` · ${days} calendar days` : ''}`);
      period.className = 'dv-promotion-meta';
      const state = !start || !end ? 'Unknown' : today < start ? 'Upcoming' : today > end ? 'Expired' : 'Active';
      const badge = make('span', state);
      badge.className = 'dv-promotion-status ' + state.toLowerCase();
      body.append(title, kind, period, badge);
      item.append(body);
      mine.append(item);
    }

    if (!my.length) {
      mine.textContent = 'No promotions yet.';
    }
  }

  // Private monthly overview: aggregate the writer's per-story activity by day.
  // The server must enforce owner-only access to dv_story_writing_days via RLS.
  let progressMonth = new Date();
  progressMonth.setDate(1);
  const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  let progressRequest = 0;
  async function loadPrivateProgress() {
    const section = $('dv-private-progress-section');
    if (!userId || !section) return;
    section.hidden = false;
    const request = ++progressRequest;
    const year = progressMonth.getFullYear();
    const month = progressMonth.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month+1, 0);
    $('dv-progress-month').textContent = first.toLocaleDateString(undefined, {month:'long',year:'numeric'});
    const calendar = $('dv-progress-calendar');
    calendar.textContent = 'Loading your private calendar…';
    const {data, error} = await client.from('dv_story_writing_days')
      .select('activity_date,story_id,words_added,chapters_published')
      .eq('writer_id', userId)
      .gte('activity_date', dateKey(first))
      .lte('activity_date', dateKey(last))
      .limit(5000);
    if (request !== progressRequest) return;
    if (error) {
      console.error(error);
      calendar.textContent = 'Unable to load writing activity. Check your private activity permissions.';
      return;
    }
    const byDay = new Map();
    for (const row of data || []) {
      const key = row.activity_date;
      if (!byDay.has(key)) byDay.set(key, {words:0,chapters:0,stories:new Set()});
      const day = byDay.get(key);
      day.words += Math.max(0, Number(row.words_added) || 0);
      day.chapters += Math.max(0, Number(row.chapters_published) || 0);
      if (row.story_id) day.stories.add(row.story_id);
    }
    const values = [...byDay.values()];
    $('dv-progress-words').textContent = values.reduce((n,d)=>n+d.words,0).toLocaleString();
    $('dv-progress-days').textContent = values.filter(d=>d.words>0||d.chapters>0).length.toLocaleString();
    $('dv-progress-chapters').textContent = values.reduce((n,d)=>n+d.chapters,0).toLocaleString();
    calendar.replaceChildren();
    for (const dayName of ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']) calendar.append(make('strong', dayName));
    const offset = (first.getDay()+6)%7;
    for (let i=0;i<offset;i++) calendar.append(document.createElement('span'));
    for (let d=1;d<=last.getDate();d++) {
      const dayDate = new Date(year,month,d);
      const key = dateKey(dayDate);
      const info = byDay.get(key);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'dv-progress-day' + (info && (info.words>0||info.chapters>0) ? ' active' : '');
      button.append(make('span', String(d)));
      if (info && (info.words>0||info.chapters>0)) button.append(make('small', `${info.words.toLocaleString()} words`));
      button.addEventListener('click', () => {
        $('dv-progress-detail').textContent = `${key}: ${info?.words.toLocaleString() || '0'} words added, ${info?.chapters || 0} chapters published, ${info?.stories.size || 0} stories with recorded activity.`;
      });
      calendar.append(button);
    }
    $('dv-progress-detail').textContent = 'Choose a day to view your combined writing progress.';
  }
  $('dv-progress-prev')?.addEventListener('click', () => {progressMonth.setMonth(progressMonth.getMonth()-1);loadPrivateProgress();});
  $('dv-progress-next')?.addEventListener('click', () => {progressMonth.setMonth(progressMonth.getMonth()+1);loadPrivateProgress();});

  refresh().catch(err => {
    console.error(err);
    status.textContent = 'Unable to open the promotion planner.';
  });
})();
