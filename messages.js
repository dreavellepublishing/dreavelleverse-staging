(async()=>{
 const db=window.supabaseClient,$=id=>document.getElementById(id),status=$('dv-message-status'),list=$('dv-conversations'),history=$('dv-chat-history');
 if(!db)return;const {data:{user}}=await db.auth.getUser();if(!user){status.textContent='Log in to use private messages.';return;}
 const storageKey='dv-last-message-peer-'+user.id;
 const params=new URLSearchParams(location.search);
 let peer=params.get('to')||sessionStorage.getItem(storageKey), blocked=false;
 const validId=id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||'');
 if(!validId(peer))peer=null;
 function selectPeer(id){
  if(!validId(id))return;
  peer=id;sessionStorage.setItem(storageKey,id);
  const url=new URL(location.href);url.searchParams.set('to',id);
  window.history.replaceState(null,'',url.pathname+url.search+url.hash);
  history.replaceChildren();loadChat();
 }
 const node=(tag,txt)=>{const e=document.createElement(tag);e.textContent=txt;return e;};
 async function getProfile(id){const {data}=await db.from('profiles').select('id,display_name').eq('id',id).maybeSingle();return data;}
 async function loadList(){
  const {data,error}=await db.from('dv_private_messages').select('id,sender_id,recipient_id,body,created_at').or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).order('created_at',{ascending:false}).limit(200);
  if(error){status.textContent='Messages unavailable. Install the accompanying Supabase SQL.';return;}
  const ids=[...new Set((data||[]).map(m=>m.sender_id===user.id?m.recipient_id:m.sender_id))];if(peer&&!ids.includes(peer))ids.unshift(peer);
  list.replaceChildren();for(const id of ids){const profile=await getProfile(id);if(!profile)continue;const b=node('button',profile.display_name||'Member');b.type='button';b.className='dv-person-option';b.onclick=()=>selectPeer(id);list.append(b);}if(!ids.length)list.textContent='No conversations yet. Visit a member profile to send a message.';
 }
 async function loadChat(){if(!peer)return;const profile=await getProfile(peer);if(!profile){status.textContent='Member not found.';return;}
  $('dv-chat-title').textContent='Chat with '+(profile.display_name||'Member');
  const {data:blocks}=await db.from('dv_message_blocks').select('blocker_id').or(`and(blocker_id.eq.${user.id},blocked_id.eq.${peer}),and(blocker_id.eq.${peer},blocked_id.eq.${user.id})`);
  blocked=(blocks||[]).length>0;$('dv-message-form').hidden=blocked;status.textContent=blocked?'Messaging is blocked between these accounts.':'Private conversation with '+(profile.display_name||'member');
  const {data,error}=await db.from('dv_private_messages').select('id,sender_id,body,created_at').or(`and(sender_id.eq.${user.id},recipient_id.eq.${peer}),and(sender_id.eq.${peer},recipient_id.eq.${user.id})`).order('created_at',{ascending:true}).limit(200);
  history.replaceChildren();if(error){history.textContent='Unable to load this conversation.';return;}
  for(const m of data||[]){const row=node('div',`${m.sender_id===user.id?'You':profile.display_name||'Member'} · ${new Date(m.created_at).toLocaleString()}\n${m.body}`);row.className='dv-chat-line'+(m.sender_id===user.id?' mine':'');history.append(row);}history.scrollTop=history.scrollHeight;
 }
 $('dv-message-form').onsubmit=async e=>{e.preventDefault();if(!peer||blocked)return;const body=$('dv-message-text').value.trim();if(!body)return;
  const {error}=await db.from('dv_private_messages').insert({sender_id:user.id,recipient_id:peer,body});if(error){status.textContent='Message not sent: '+error.message;return;}$('dv-message-text').value='';await loadChat();await loadList();};
 $('dv-block-user').onclick=async()=>{if(!peer)return;if(!confirm('Block this member? This prevents messages in either direction.'))return;const {error}=await db.from('dv_message_blocks').insert({blocker_id:user.id,blocked_id:peer});status.textContent=error?error.message:'Member blocked.';await loadChat();};
 $('dv-report-chat').onclick=async()=>{if(!peer)return;const reason=prompt('Describe the issue (do not include sensitive information):');if(!reason?.trim())return;const {error}=await db.from('dv_message_reports').insert({reporter_id:user.id,reported_id:peer,reason:reason.trim().slice(0,1000)});status.textContent=error?'Unable to submit report: '+error.message:'Report submitted for administrator review.';};
 if(peer){sessionStorage.setItem(storageKey,peer);const url=new URL(location.href);url.searchParams.set('to',peer);window.history.replaceState(null,'',url.pathname+url.search+url.hash);}
 await loadList();if(peer)await loadChat();else status.textContent='Select a conversation, or visit a member profile to start one.';
})().catch(console.error);