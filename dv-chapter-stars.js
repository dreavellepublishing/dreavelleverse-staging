/* Chapter star voting: one star per signed-in reader per published chapter. */
(() => {
  const db = window.supabaseClient;
  if (!db) return;
  const params = new URLSearchParams(location.search);
  const storyId = params.get('id');
  const chapter = Number(params.get('chapter'));
  const button = document.getElementById('dv-star-button');
  const countNode = document.getElementById('dv-chapter-star-count');
  const message = document.getElementById('dv-star-message');
  const managerNode = document.getElementById('dv-manager-total-stars');
  const format = n => Number(n ?? 0).toLocaleString();
  async function getCount(id, n) {
    const r = await db.rpc('dv_chapter_star_count', {p_story_id:id,p_chapter_number:n});
    if (r.error) throw r.error;
    return r.data;
  }
  async function loadReader() {
    if (!button || !storyId || !Number.isInteger(chapter) || chapter < 1) return;
    try {
      countNode.textContent = format(await getCount(storyId,chapter));
      const {data:{user}} = await db.auth.getUser();
      if (!user) {message.textContent = ' Sign in to star chapters.';return;}
      const {data:chapterRow,error:chapterError} = await db.from('chapters').select('user_id,status').eq('story_id',storyId).eq('chapter_number',chapter).maybeSingle();
      if (chapterError) throw chapterError;
      if (!chapterRow || chapterRow.status !== 'Published') return;
      if (chapterRow.user_id === user.id) {message.textContent=' Writers cannot star their own chapters.';return;}
      const {data:myVote,error:voteError} = await db.from('dv_chapter_stars').select('user_id').eq('story_id',storyId).eq('chapter_number',chapter).eq('user_id',user.id).maybeSingle();
      if (voteError) throw voteError;
      let selected = Boolean(myVote);
      const render = () => {button.disabled=false;button.setAttribute('aria-pressed',String(selected));button.textContent=selected?'★ Starred':'☆ Star this chapter';};
      render();
      button.addEventListener('click',async()=>{
        button.disabled=true;message.textContent='';
        const result = selected
          ? await db.from('dv_chapter_stars').delete().eq('story_id',storyId).eq('chapter_number',chapter).eq('user_id',user.id)
          : await db.from('dv_chapter_stars').insert({story_id:storyId,chapter_number:chapter,user_id:user.id});
        if (result.error) {console.warn('Star vote:',result.error);message.textContent='Could not update your star. Please try again.';}
        else selected=!selected;
        try {countNode.textContent=format(await getCount(storyId,chapter));} catch(e) {console.warn(e);}
        render();
      });
    } catch(e) {console.warn('Chapter stars:',e);message.textContent='Stars unavailable until database setup is installed.';}
  }
  async function loadManager() {
    if (!managerNode) return;
    const {data:{user}} = await db.auth.getUser();
    const id = localStorage.getItem('dreavelleVerseStoryId');
    if (!user || !id) return;
    try {
      const {data,error} = await db.rpc('dv_story_star_total',{p_story_id:id});
      if (error) throw error;
      managerNode.textContent=format(data);
      const {data:rows,error:rowsError} = await db.from('dv_chapter_stars').select('chapter_number').eq('story_id',id);
      if (rowsError) throw rowsError;
      const counts = new Map();
      (rows||[]).forEach(r=>counts.set(r.chapter_number,(counts.get(r.chapter_number)||0)+1));
      const list = document.getElementById('chapter-list');
      if (!list) return;
      const observer = new MutationObserver(()=>{
        const cards = list.querySelectorAll('.chapter-item');
        cards.forEach(card=>{
          const chapterLabel = card.querySelector('.chapter-number');
          const n = Number(chapterLabel?.textContent.match(/\d+/)?.[0]);
          if (!n) return;
          let node=card.querySelector('.dv-manager-chapter-stars');
          if (!node) {node=document.createElement('p');node.className='dv-manager-chapter-stars';chapterLabel.after(node);}
          node.textContent='⭐ '+format(counts.get(n)||0)+' chapter stars';
        });
      });
      observer.observe(list,{childList:true});
      // Render any cards already present.
      list.querySelectorAll('.chapter-item').forEach(card=>{
        const label=card.querySelector('.chapter-number');const n=Number(label?.textContent.match(/\d+/)?.[0]);
        if(n && !card.querySelector('.dv-manager-chapter-stars')){const node=document.createElement('p');node.className='dv-manager-chapter-stars';node.textContent='⭐ '+format(counts.get(n)||0)+' chapter stars';label.after(node);}
      });
    } catch(e) {console.warn('Manager chapter stars:',e);managerNode.textContent='—';}
  }
  loadReader();loadManager();
})();
