/* Discover recommendations and redeemed-ticket promotions. No calendar on Discover. */
(() => {
  const db = window.supabaseClient;
  const peopleBox = document.getElementById('dv-suggest-people');
  const storiesBox = document.getElementById('dv-suggest-stories');
  const smallBox = document.getElementById('dv-small-promos');
  const bigBox = document.getElementById('dv-big-promos');
  if (!db || !peopleBox || !storiesBox || !smallBox || !bigBox) return;
  const el = (tag, cls, value) => { const e = document.createElement(tag); if(cls)e.className=cls; if(value!==undefined)e.textContent=value; return e; };
  const url = id => `read-story.html?id=${encodeURIComponent(id)}`;
  const link = (label, href) => { const a=el('a','start-reading-button',label);a.href=href;return a; };
  const image = (src, alt, cls='') => { if(!/^https?:\/\//i.test(src||''))return null;const img=el('img',cls);img.src=src;img.alt=alt;img.loading='lazy';return img; };
  const rotate = (items, count) => { if(!items.length)return [];const start=Math.floor(Date.now()/86400000)%items.length;return Array.from({length:Math.min(count,items.length)},(_,i)=>items[(start+i)%items.length]); };
  const storyCard = s => {const card=el('article','dv-suggestion-card');const img=image(s.cover_url,`${s.title||'Story'} cover`,'dv-story-thumb');if(img)card.append(img);card.append(el('h4','',s.title||'Untitled Story'),el('p','',`By ${s.author||'Unknown Author'}`),link('Start Reading',url(s.id)));return card;};
  async function recommendations(){
    const {data:{user}}=await db.auth.getUser();
    const [{data:people,error:pe},{data:stories,error:se}]=await Promise.all([
      db.from('profiles').select('id,display_name,bio,avatar_url').order('display_name',{ascending:true}).limit(100),
      db.from('stories').select('id,title,author,genre,cover_url,status,user_id').eq('status','Published').order('id',{ascending:true}).limit(500)
    ]);
    peopleBox.replaceChildren();
    if(pe)peopleBox.textContent='Recommendations are temporarily unavailable.';
    else {for(const person of rotate((people||[]).filter(p=>p.id!==user?.id),6)){
      const card=el('article','dv-suggestion-card dv-person-card');const avatar=image(person.avatar_url,'','dv-person-avatar');if(avatar)card.append(avatar);
      const details=el('div','dv-person-details');details.append(el('h4','',person.display_name||'DreavelleVerse member'));
      card.append(details,link('View / Follow',`public-profile.html?id=${encodeURIComponent(person.id)}`));peopleBox.append(card);
    }if(!peopleBox.children.length)peopleBox.textContent='More readers and writers will appear here soon.';}
    storiesBox.replaceChildren();
    if(se){storiesBox.textContent='Story suggestions are temporarily unavailable.';return;}
    const pool=stories||[], published=new Set();
    for(let i=0;i<pool.length;i+=80){const batch=pool.slice(i,i+80);const {data:chapters,error}=await db.from('chapters').select('story_id').in('story_id',batch.map(s=>s.id)).eq('status','Published');if(error){console.error(error);storiesBox.textContent='Story suggestions are temporarily unavailable.';return;}for(const c of chapters||[])published.add(String(c.story_id));}
    for(const story of rotate(pool.filter(s=>published.has(String(s.id))),5))storiesBox.append(storyCard(story));
    if(!storiesBox.children.length)storiesBox.textContent='No published stories yet.';
  }
  function carousel(box,items,prevId,nextId,statusId,pageSize){
    let page=0;const prev=document.getElementById(prevId),next=document.getElementById(nextId),status=document.getElementById(statusId);
    const draw=()=>{box.replaceChildren();const pages=Math.ceil(items.length/pageSize);
      if(!items.length){box.textContent=box===bigBox?'No active big banner promotions yet.':'No active small spotlight promotions yet.';}
      else items.slice(page*pageSize,(page+1)*pageSize).forEach(card=>box.append(card));
      prev.disabled=page===0;next.disabled=page>=pages-1;prev.hidden=next.hidden=pages<=1;
      status.textContent=pages>1?`Page ${page+1} of ${pages}`:'';
    };
    prev.addEventListener('click',()=>{if(page>0){page--;draw();}});next.addEventListener('click',()=>{if((page+1)*pageSize<items.length){page++;draw();}});draw();
  }
  async function promotions(){
    const today=new Date().toISOString().slice(0,10);
    const {data:promos,error}=await db.from('dv_promotions')
      .select('id,owner_id,story_id,partner_story_id,kind,headline,description,start_date,end_date,partner_approved')
      .lte('start_date',today).gte('end_date',today).limit(300);
    if(error){console.error(error);smallBox.textContent='Promotions are temporarily unavailable.';bigBox.textContent='Banners are temporarily unavailable.';return;}
    const ids=[...new Set((promos||[]).flatMap(p=>[p.story_id,p.partner_story_id].filter(Boolean)))];
    const stories=[];for(let i=0;i<ids.length;i+=80){const {data,error:storyError}=await db.from('stories').select('id,title,author,cover_url,status').in('id',ids.slice(i,i+80)).eq('status','Published');if(storyError){console.error(storyError);continue;}stories.push(...(data||[]));}
    const byId=new Map(stories.map(s=>[String(s.id),s]));const small=[],big=[];
    for(const promo of promos||[]){if(promo.kind==='pair'&&!promo.partner_approved)continue;
      const story=byId.get(String(promo.story_id));if(!story)continue;
      const partner=promo.partner_story_id?byId.get(String(promo.partner_story_id)):null;
      if(promo.kind==='pair'&&!partner)continue;
      const large=promo.kind==='large'||promo.kind==='pair';
      const card=el('article',`dv-promo-card ${large?'dv-large':''}`);
      card.append(el('span','dv-promo-tag',promo.kind==='pair'?'Pair Promotion':large?'Banner Promotion':'Ticket Promotion'));
      const cover=image(story.cover_url,`${story.title} cover`);if(cover)card.append(cover);
      card.append(el('h4','',promo.headline||story.title),el('p','dv-promo-author',`By ${story.author||'Unknown Author'}`),link('Read Story',url(story.id)));
      if(partner)card.append(link('Partner Story',url(partner.id)));
      (large?big:small).push(card);
    }
    carousel(smallBox,small,'dv-small-prev','dv-small-next','dv-small-page',10);
    carousel(bigBox,big,'dv-big-prev','dv-big-next','dv-big-page',2);
  }
  recommendations().catch(e=>{console.error(e);peopleBox.textContent='Recommendations unavailable.';storiesBox.textContent='Suggestions unavailable.';});
  promotions().catch(e=>{console.error(e);smallBox.textContent='Promotions unavailable.';bigBox.textContent='Banners unavailable.';});
})();
