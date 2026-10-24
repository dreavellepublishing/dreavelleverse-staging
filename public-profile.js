
/* DreavelleVerse member follow lists — read-only, no changes to existing follow actions. */
(function () {
  if (window.dvFollowLists) return;
  const css = `.dv-social-root{margin:14px 0;text-align:left}.dv-social-tabs{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}.dv-social-tabs button{border:1px solid #c84277;border-radius:999px;padding:9px 15px;background:#fff;color:#9b306c;cursor:pointer;font:inherit}.dv-social-tabs button[aria-pressed="true"]{background:#a43caa;color:#fff;border-color:#a43caa}.dv-social-list{display:grid;gap:9px;max-height:330px;overflow-y:auto}.dv-social-person{display:flex;gap:12px;align-items:center;padding:10px;border:1px solid #ecd5e7;border-radius:12px;background:#fff;text-decoration:none;color:#063b54}.dv-social-person:hover{background:#fff5fc}.dv-social-avatar{width:42px;height:42px;flex:none;object-fit:cover;border-radius:50%;background:#eee}.dv-social-initial{display:grid;place-items:center;font-weight:bold;color:#fff;background:#a43caa}.dv-social-empty{color:#666;padding:12px 2px}`;
  const style=document.createElement('style');style.textContent=css;document.head.append(style);
  async function mount(root, accountId) {
    if (!root || !accountId) return;
    root.replaceChildren();
    const tabs=document.createElement('div');tabs.className='dv-social-tabs';
    const list=document.createElement('div');list.className='dv-social-list';list.setAttribute('aria-live','polite');
    root.append(tabs,list);
    let active='followers', seq=0;
    const buttons={};
    for(const key of ['followers','following']){
      const btn=document.createElement('button');btn.type='button';btn.textContent=key==='followers'?'Followers':'Following';
      btn.onclick=()=>load(key);buttons[key]=btn;tabs.append(btn);
    }
    async function load(key){
      active=key;const current=++seq;
      for(const k of Object.keys(buttons))buttons[k].setAttribute('aria-pressed',String(k===key));
      list.textContent='Loading '+key+'…';
      const col=key==='followers'?'followed_id':'follower_id';
      const memberCol=key==='followers'?'follower_id':'followed_id';
      const {data,error}=await supabaseClient.from('account_follows').select('follower_id,followed_id').eq(col,accountId).limit(500);
      if(current!==seq)return;
      if(error){list.textContent='Unable to load '+key+'. Please check account_follows read permissions.';console.error(error);return;}
      const ids=[...new Set((data||[]).map(r=>r[memberCol]).filter(Boolean))];
      buttons[key].textContent=(key==='followers'?'Followers':'Following')+' ('+ids.length+(data?.length===500?'+':'')+')';
      if(!ids.length){list.textContent=key==='followers'?'No followers yet.':'Not following anyone yet.';return;}
      const {data:people,error:peopleError}=await supabaseClient.from('profiles').select('id,display_name,avatar_url').in('id',ids);
      if(current!==seq)return;
      if(peopleError){list.textContent='Unable to load member names.';console.error(peopleError);return;}
      const byId=new Map((people||[]).map(p=>[p.id,p]));list.replaceChildren();
      for(const id of ids){
        const person=byId.get(id);if(!person)continue;
        const a=document.createElement('a');a.className='dv-social-person';a.href='public-profile.html?id='+encodeURIComponent(id);
        const name=person.display_name||'DreavelleVerse Member';
        if(person.avatar_url && /^https:\/\//i.test(person.avatar_url)){
          const img=document.createElement('img');img.className='dv-social-avatar';img.alt='';img.src=person.avatar_url;a.append(img);
        }else{const avatar=document.createElement('span');avatar.className='dv-social-avatar dv-social-initial';avatar.textContent=name.charAt(0).toUpperCase();a.append(avatar);}
        const label=document.createElement('strong');label.textContent=name;a.append(label);list.append(a);
      }
      if(!list.childElementCount)list.textContent='No visible member profiles.';
    }
    await load('followers');
  }
  window.dvFollowLists={mount};
})();

/* Public profiles: view and follow readers or writers. */
(async function () {
    const card = document.getElementById("public-profile-card");
    const status = document.getElementById("public-profile-status");
    const id = new URLSearchParams(location.search).get("id");
    if (!id || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id)) {
        status.textContent = "Invalid profile link.";
        return;
    }
    const { data: person, error } = await supabaseClient.from("profiles")
        .select("id, display_name, bio, avatar_url, cover_url")
        .eq("id", id).maybeSingle();
    if (error || !person) {
        status.textContent = "Profile unavailable. The profiles table may need a public read policy.";
        if (error) console.error("Public profile load error:", error);
        return;
    }
    card.replaceChildren();
    const cover = document.createElement("div");
    if (person.cover_url && /^https:\/\//i.test(person.cover_url)) {
        const img = document.createElement("img"); img.className = "public-cover"; img.src = person.cover_url; img.alt = "Profile cover"; cover.append(img);
    } else { cover.className = "public-cover"; }
    const avatar = document.createElement("img"); avatar.className = "public-avatar"; avatar.alt = "Profile picture";
    if (person.avatar_url && /^https:\/\//i.test(person.avatar_url)) avatar.src = person.avatar_url;
    else avatar.style.visibility = "hidden";
    const heading = document.createElement("h2"); heading.textContent = person.display_name || "Reader";
    const bio = document.createElement("p"); bio.textContent = person.bio || "DreavelleVerse member";
    const count = document.createElement("p"); count.textContent = "Loading followers...";
    const follow = document.createElement("button"); follow.type = "button"; follow.textContent = "Follow";
    const feedback = document.createElement("p"); feedback.setAttribute("role", "status");
    card.append(cover, avatar, heading, bio, count, follow, feedback);
    const social=document.createElement('div');social.className='dv-social-root';card.append(social);
    await window.dvFollowLists.mount(social,id);
    const messageLink=document.createElement("a"); messageLink.href="messages.html?to="+encodeURIComponent(id); messageLink.textContent="Send Private Message"; messageLink.className="start-reading-button"; card.append(messageLink);
    const { data: { session } } = await supabaseClient.auth.getSession();
    const myId = session?.user?.id;
    if (!myId) { follow.textContent = "Log in to Follow"; follow.onclick = () => location.href = "login.html"; }
    else if (myId === id) { follow.textContent = "My Profile"; follow.onclick = () => location.href = "profile.html"; }
    async function refreshCount() {
        const { count: total, error: countError } = await supabaseClient.from("account_follows")
            .select("follower_id", { count: "exact", head: true }).eq("followed_id", id);
        count.textContent = countError ? "Followers unavailable" : `${total ?? 0} follower${total === 1 ? "" : "s"}`;
    }
    await refreshCount();
    if (!myId || myId === id) return;
    const { data: existing, error: existingError } = await supabaseClient.from("account_follows")
        .select("follower_id").eq("follower_id", myId).eq("followed_id", id).maybeSingle();
    if (existingError) { feedback.textContent = "Following is currently unavailable."; console.error(existingError); return; }
    let isFollowing = !!existing;
    follow.textContent = isFollowing ? "Unfollow" : "Follow";
    follow.addEventListener("click", async () => {
        follow.disabled = true; feedback.textContent = "";
        const result = isFollowing
            ? await supabaseClient.from("account_follows").delete().eq("follower_id", myId).eq("followed_id", id)
            : await supabaseClient.from("account_follows").insert({ follower_id: myId, followed_id: id });
        if (result.error) { feedback.textContent = "Unable to update follow: " + result.error.message; console.error(result.error); }
        else { isFollowing = !isFollowing; follow.textContent = isFollowing ? "Unfollow" : "Follow"; await refreshCount(); await window.dvFollowLists.mount(social,id); }
        follow.disabled = false;
    });
})();
