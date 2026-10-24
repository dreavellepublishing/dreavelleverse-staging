(async()=>{
 const db=window.supabaseClient,$=id=>document.getElementById(id),status=$('dv-ann-status'),feed=$('dv-ann-feed');if(!db){status.textContent='Unable to connect to Supabase. Please refresh.';feed.textContent='Unable to load announcements.';return;}
 const {data:{user}}=await db.auth.getUser();const make=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e;};
 if(!user){$('dv-ann-editor').hidden=true;status.textContent='Log in to post announcements. You can still read recent public announcements.';}
 else {status.textContent='Announcements notify your followers. You can post up to 3 per day (UAE time).';
 const {data:stories}=await db.from('stories').select('id,title').eq('user_id',user.id).eq('status','Published').limit(100);
 for(const s of stories||[]){const o=make('option',s.title);o.value=s.id;$('dv-ann-story').append(o);}
 $('dv-ann-form').onsubmit=async e=>{e.preventDefault();const b=e.currentTarget.querySelector('button');b.disabled=true;
  const payload={writer_id:user.id,story_id:$('dv-ann-story').value||null,title:$('dv-ann-title').value.trim(),body:$('dv-ann-body').value.trim()};
  const {error}=await db.from('dv_writer_announcements').insert(payload);status.textContent=error?'Could not post: '+error.message:'Announcement posted! Followers have been notified.';if(!error){e.target.reset();await loadFeed();await loadDailyCount();}else{b.disabled=false;}};}
 let activeFilter='all', allRows=[], followingIds=new Set();
 const dubaiDay = date => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dubai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(date));
 async function loadDailyCount(){
  if(!user)return;
  const {data,error}=await db.from('dv_writer_announcements').select('created_at').eq('writer_id',user.id).order('created_at',{ascending:false}).limit(100);
  const counter=$('dv-ann-count');
  if(error){counter.textContent='Could not load daily allowance: '+error.message;return;}
  const used=(data||[]).filter(a=>dubaiDay(a.created_at)===dubaiDay(Date.now())).length;
  counter.textContent=`${used} of 3 announcements posted today · Resets at midnight UAE time`;
  $('dv-ann-form').querySelector('button[type=submit]').disabled=used>=3;
  if(used>=3)status.textContent='Daily limit reached. You can post again after midnight UAE time.';
 }
 document.querySelectorAll('.dv-ann-filter').forEach(b=>b.addEventListener('click',()=>{
  activeFilter=b.dataset.filter;
  document.querySelectorAll('.dv-ann-filter').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});
  renderFeed();
 }));
 let unreadAnnouncements = [];
 async function loadUnread() {
  unreadAnnouncements = [];
  if (!user) return;
  const {data,error} = await db.from('notifications')
    .select('id,title,message,created_at').eq('user_id',user.id)
    .eq('title','Writer Announcement').eq('is_read',false)
    .order('created_at',{ascending:false});
  if (error) console.warn('Cannot load unread announcements:',error.message);
  else unreadAnnouncements = data || [];
 }
 async function loadFeed(){
  await loadUnread();
  if(user){
   const {data:follows,error:fe}=await db.from('account_follows').select('followed_id').eq('follower_id',user.id);
   if(!fe)followingIds=new Set((follows||[]).map(f=>f.followed_id));
   else console.warn('Could not load followed writers:',fe.message);
  }
  const {data,error}=await db.from('dv_writer_announcements').select('id,writer_id,story_id,title,body,created_at').order('created_at',{ascending:false}).limit(100);
  if(error){feed.textContent='Could not load announcements: '+error.message;return;}
  allRows=data||[];
  await renderFeed();
 }
 async function renderFeed(){
  const data=allRows.filter(a=>activeFilter==='all'||(activeFilter==='mine'?(user&&a.writer_id===user.id):(user&&a.writer_id!==user.id&&followingIds.has(a.writer_id))));
  feed.replaceChildren();
 // Resolve public display names for the writers shown in this feed.
 const writerIds = [...new Set((data || []).map(a => a.writer_id).filter(Boolean))];
 const writerNames = new Map();
 if (writerIds.length) {
  const {data:profiles, error:profileError} = await db.from('profiles')
   .select('id,display_name').in('id',writerIds);
  if (profileError) console.warn('Could not load announcement writer names:',profileError.message);
  else for (const p of profiles || []) writerNames.set(p.id,(p.display_name || '').trim());
 }
 const targetId = new URLSearchParams(window.location.search).get('announcement');
  let targetItem = null;
  for(const a of data||[]){const item=make('article','');item.className='dv-ann-item';
   item.id='announcement-'+a.id;
   if(targetId===String(a.id)){targetItem=item;item.style.outline='3px solid #8050b5';item.style.outlineOffset='4px';}const h=make('h4',a.title),body=make('p',a.body),date=make('small',new Date(a.created_at).toLocaleString());
  const byline=make('p','Posted by ');
  const link=make('a',writerNames.get(a.writer_id) || 'Writer');
  link.href='public-profile.html?id='+encodeURIComponent(a.writer_id);
  byline.append(link);
  item.append(h,byline,date,body);
  // Only mark an announcement read when its specific matching card is opened.
  // Existing notifications store the announcement title in the message, not an announcement ID.
  const matches = unreadAnnouncements.filter(n =>
    (n.message || '').includes(a.title) &&
    new Date(n.created_at).getTime() >= new Date(a.created_at).getTime() - 60000
  );
  if (matches.length === 1) {
   const read = make('button','Read announcement');
   read.type='button';
   read.style.marginLeft='12px';
   read.onclick = async () => {
    read.disabled=true;
    const {error:markError}=await db.from('notifications').update({is_read:true})
      .eq('id',matches[0].id).eq('user_id',user.id);
    if(markError){read.disabled=false;status.textContent='Could not mark announcement as read: '+markError.message;return;}
    read.textContent='Read ✓';
    unreadAnnouncements=unreadAnnouncements.filter(n=>n.id!==matches[0].id);
    window.dispatchEvent(new Event('dv-announcement-read'));
   };
   item.append(read);
  }
  if(a.story_id){const s=make('a',' · Read story');s.href='read-story.html?id='+encodeURIComponent(a.story_id);item.append(s);}feed.append(item);}
  if(targetItem){requestAnimationFrame(()=>targetItem.scrollIntoView({behavior:'smooth',block:'center'}));}
  if(!data?.length)feed.textContent='No announcements yet.';}
 await loadFeed();
 if(user)await loadDailyCount();
})().catch(console.error);