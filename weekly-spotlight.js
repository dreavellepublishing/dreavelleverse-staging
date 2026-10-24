/* Weekly podium. Existing dv_weekly_spotlight RPC remains the ranking source. */
(async () => {
  const db=window.supabaseClient,wb=document.getElementById('dv-weekly-writers'),sb=document.getElementById('dv-weekly-stories');
  if(!db||!wb||!sb)return;
  const {data,error}=await db.rpc('dv_weekly_spotlight');
  if(error){console.error(error);wb.textContent='Weekly rankings are temporarily unavailable.';sb.textContent='';return;}
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const ranking=[4,2,1,3,5];
  const render=async(box,category)=>{
    const entries=(data||[]).filter(r=>r.category===category&&Number(r.position)>=1&&Number(r.position)<=5);
    const byRank=new Map(entries.map(r=>[Number(r.position),r]));
    const ids=entries.map(r=>r.item_id);
    const table=category==='writer'?'profiles':'stories';
    let photos=new Map();
    if(ids.length){const {data:details,error:detailError}=await db.from(table).select(category==='writer'?'id,avatar_url':'id,cover_url').in('id',ids);
      if(!detailError)photos=new Map((details||[]).map(d=>[String(d.id),category==='writer'?d.avatar_url:d.cover_url]));}
    box.replaceChildren();
    if(!entries.length){box.textContent=`No qualifying ${category==='writer'?'writers':'stories'} last week yet.`;return;}
    for(const rank of ranking){const r=byRank.get(rank);const card=el('article',`dv-weekly-card dv-rank-${rank}`);
      if(!r){card.classList.add('dv-rank-empty');card.append(el('span','dv-weekly-rank',`#${rank}`));box.append(card);continue;}
      card.append(el('span','dv-weekly-rank',rank===1?'👑 #1':`#${rank}`));
      const src=photos.get(String(r.item_id));if(src&&/^https?:\/\//i.test(src)){const img=el('img','dv-weekly-image');img.src=src;img.alt='';img.loading='lazy';card.append(img);}
      card.append(el('h4','',r.display_title||'Untitled'),el('small','',`Weekly score: ${r.score}`));
      const a=el('a','start-reading-button',category==='writer'?'View Writer':'Read Story');
      a.href=category==='writer'?`public-profile.html?id=${encodeURIComponent(r.item_id)}`:`read-story.html?id=${encodeURIComponent(r.item_id)}`;card.append(a);box.append(card);
    }
  };
  await Promise.all([render(wb,'writer'),render(sb,'story')]);
})().catch(console.error);
