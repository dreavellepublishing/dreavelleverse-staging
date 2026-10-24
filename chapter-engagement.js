/* DreavelleVerse per-chapter Author's Corner. Requires chapter-engagement-setup.sql. */
(() => {
  const db = window.supabaseClient;
  if (!db) return;
  const params = new URLSearchParams(location.search);
  const editor = document.getElementById('dv-save-author-tools');
  const reader = document.getElementById('dv-reader-author-corner');
  const words = text => (text.trim().match(/\S+/g) || []).length;
  const msg = (id, text) => { const node = document.getElementById(id); if(node) node.textContent = text; };
  const context = () => editor ? {
    storyId: localStorage.getItem('dreavelleVerseStoryId'),
    chapter: Number(localStorage.getItem('dreavelleVerseCurrentChapter') || 1)
  } : { storyId: params.get('id'), chapter: Number(params.get('chapter')) };
  const valid = ({storyId,chapter}) => Boolean(storyId && Number.isInteger(chapter) && chapter >= 0);
  const auth = async () => (await db.auth.getUser()).data.user;

  if (editor) {
    const note = document.getElementById('dv-author-note');
    const toggle = document.getElementById('dv-poll-enabled');
    const fields = [...document.querySelectorAll('#dv-poll-options input')];
    const question = document.getElementById('dv-poll-question');
    const pollPanel = document.getElementById('dv-poll-editor');
    let savedContext = '';
    let hasVotes = false;
    const setLock = locked => {
      hasVotes = locked;
      toggle.disabled = locked;
      question.disabled = locked;
      fields.forEach(field => field.disabled = locked);
      if (locked) msg('dv-author-tools-status','This poll already has votes. Its question and choices are locked; the author note can still be edited.');
    };
    toggle.addEventListener('change', () => pollPanel.hidden = !toggle.checked);
    note.addEventListener('input', () => msg('dv-author-note-count', `${words(note.value)} / 300 words`));
    async function load() {
      const ctx = context();
      const key = `${ctx.storyId}:${ctx.chapter}`;
      if (!valid(ctx) || key === savedContext) return;
      savedContext = key;
      note.value = ''; question.value = ''; fields.forEach(f => f.value = '');
      toggle.checked = false; pollPanel.hidden = true; setLock(false);
      msg('dv-author-note-count','0 / 300 words'); msg('dv-author-tools-status','');
      const user = await auth(); if (!user) return;
      const {data,error} = await db.from('dv_chapter_engagement').select('*').eq('story_id',ctx.storyId).eq('chapter_number',ctx.chapter).maybeSingle();
      if (error) {msg('dv-author-tools-status','Could not load Author’s Corner. Run the included Supabase setup if it is not installed.');return;}
      if (!data) return;
      note.value = data.author_note || '';
      msg('dv-author-note-count',`${words(note.value)} / 300 words`);
      toggle.checked = Boolean(data.poll_question);
      pollPanel.hidden = !toggle.checked;
      question.value = data.poll_question || '';
      fields.forEach((f,i)=>f.value=(data.poll_options||[])[i]||'');
      const {count} = await db.from('dv_chapter_poll_votes').select('id',{count:'exact',head:true}).eq('story_id',ctx.storyId).eq('chapter_number',ctx.chapter);
      setLock(Boolean(count));
    }
    editor.addEventListener('click',async()=>{
      const ctx = context();
      if (!valid(ctx)) {msg('dv-author-tools-status','Choose a story and chapter first.');return;}
      if (words(note.value)>300) {msg('dv-author-tools-status','The author note must be 300 words or fewer.');return;}
      const opts = fields.map(f=>f.value.trim()).filter(Boolean);
      if (toggle.checked && (!question.value.trim() || opts.length<2 || new Set(opts.map(x=>x.toLowerCase())).size!==opts.length)) {
        msg('dv-author-tools-status','Enter a poll question and at least two different choices.');return;
      }
      editor.disabled=true;
      try {
        const user = await auth();if(!user) throw Error('Log in as the writer to save.');
        const {data:chapter,error:ce} = await db.from('chapters').select('user_id').eq('story_id',ctx.storyId).eq('chapter_number',ctx.chapter).maybeSingle();
        if (ce || !chapter) throw Error('Save this chapter first, then save Author’s Corner.');
        if (chapter.user_id!==user.id) throw Error('Only the chapter author can edit this section.');
        const payload = {story_id:ctx.storyId,chapter_number:ctx.chapter,author_note:note.value.trim() || null};
        if(!hasVotes){payload.poll_question=toggle.checked?question.value.trim():null;payload.poll_options=toggle.checked?opts:[];}
        const {error} = await db.from('dv_chapter_engagement').upsert(payload,{onConflict:'story_id,chapter_number'});
        if(error) throw error;
        msg('dv-author-tools-status','Author’s Corner saved successfully.');
      }catch(e){msg('dv-author-tools-status',`Could not save: ${e.message}`);}finally{editor.disabled=false;}
    });
    // The existing editor switches chapters without necessarily reloading the page.
    setInterval(load,900);
    load();
  }

  if(reader){
    const ctx=context();if(!valid(ctx)) return;
    (async()=>{
      const {data:chapter,error:chapterError}=await db.from('chapters').select('status').eq('story_id',ctx.storyId).eq('chapter_number',ctx.chapter).maybeSingle();
      if(chapterError || chapter?.status!=='Published') return;
      const {data,error}=await db.from('dv_chapter_engagement').select('*').eq('story_id',ctx.storyId).eq('chapter_number',ctx.chapter).maybeSingle();
      if(error || !data) return;
      const noteSection=document.getElementById('dv-reader-author-note');
      const pollSection=document.getElementById('dv-reader-poll');
      if(data.author_note){noteSection.hidden=false;msg('dv-reader-author-note-text',data.author_note);}
      const choices=Array.isArray(data.poll_options)?data.poll_options:[];
      if(data.poll_question && choices.length>=2){
        pollSection.hidden=false;msg('dv-reader-poll-question',data.poll_question);
        const holder=document.getElementById('dv-reader-poll-options');
        const voteBtn=document.getElementById('dv-reader-vote');
        choices.forEach((choice,i)=>{
          const label=document.createElement('label');
          const radio=document.createElement('input');radio.type='radio';radio.name='dv-poll-choice';radio.value=String(i);
          label.append(radio,document.createTextNode(choice));holder.append(label);
        });
        const user=await auth();
        const {data:prior}=user?await db.from('dv_chapter_poll_votes').select('option_index').eq('story_id',ctx.storyId).eq('chapter_number',ctx.chapter).eq('user_id',user.id).maybeSingle():{data:null};
        const showResults=async()=>{
          const {data:votes,error:ve}=await db.from('dv_chapter_poll_votes').select('option_index').eq('story_id',ctx.storyId).eq('chapter_number',ctx.chapter);
          if(ve) return;
          const total=votes.length;
          const results=document.getElementById('dv-reader-poll-results');results.replaceChildren();results.hidden=false;
          choices.forEach((choice,i)=>{
            const count=votes.filter(v=>v.option_index===i).length;
            const pct=total?Math.round(count/total*100):0;
            const wrap=document.createElement('div');wrap.className='dv-poll-result';
            const label=document.createElement('div');label.textContent=`${choice}: ${pct}% (${count})`;
            const bar=document.createElement('div');bar.className='dv-poll-bar';
            const fill=document.createElement('span');fill.style.width=`${pct}%`;bar.append(fill);wrap.append(label,bar);results.append(wrap);
          });
          msg('dv-reader-poll-message',`${total} vote${total===1?'':'s'}`);
        };
        if(prior){voteBtn.hidden=true;holder.hidden=true;await showResults();}
        else if(!user){voteBtn.textContent='Log in to vote';voteBtn.addEventListener('click',()=>{location.href='login.html';});}
        else voteBtn.addEventListener('click',async()=>{
          const selected=holder.querySelector('input:checked');
          if(!selected){msg('dv-reader-poll-message','Choose an answer first.');return;}
          voteBtn.disabled=true;
          const {error:voteError}=await db.from('dv_chapter_poll_votes').insert({story_id:ctx.storyId,chapter_number:ctx.chapter,user_id:user.id,option_index:Number(selected.value)});
          if(voteError){msg('dv-reader-poll-message',`Could not vote: ${voteError.message}`);voteBtn.disabled=false;return;}
          voteBtn.hidden=true;holder.hidden=true;await showResults();
        });
      }
      reader.hidden=noteSection.hidden&&pollSection.hidden;
    })();
  }
})();
