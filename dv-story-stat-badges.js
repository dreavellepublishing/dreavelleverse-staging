/* Read-only story statistics for story cards. No voting or follow actions are modified. */
(() => {
  const db = window.supabaseClient;
  if (!db) return;
  const fmt = value => Number(value ?? 0).toLocaleString();
  const makeBadge = (icon, label) => {
    const node = document.createElement('span');
    node.className = 'dv-story-stat-badge';
    node.textContent = `${icon} — ${label}`;
    return node;
  };
  window.dvLoadStoryStats = async (id, targets = {}) => {
    if (!id) return;
    const {container, stars, follows} = targets;
    const fields = container ? {
      reads:makeBadge('👁','Reads'), likes:makeBadge('❤️','Likes'),
      stars:makeBadge('⭐','Stars'), follows:makeBadge('👥','Follows')
    } : {stars, follows};
    if (container) container.append(fields.reads,fields.likes,fields.stars,fields.follows);
    const queries = [
      db.from('stories').select('total_reads').eq('id',id).maybeSingle(),
      db.from('story_likes').select('id',{count:'exact',head:true}).eq('story_id',id),
      db.rpc('dv_story_star_total',{p_story_id:id}),
      db.from('story_follows').select('id',{count:'exact',head:true}).eq('story_id',id)
    ];
    const results = await Promise.allSettled(queries);
    const value = (index, get) => {
      const result=results[index];
      if (result.status!=='fulfilled' || result.value.error) {
        console.warn('Story statistic unavailable:',index,result.status==='fulfilled'?result.value.error:result.reason);
        return null;
      }
      return get(result.value);
    };
    const values = {
      reads:value(0,r=>r.data?.total_reads ?? 0),
      likes:value(1,r=>r.count ?? 0),
      stars:value(2,r=>r.data ?? 0),
      follows:value(3,r=>r.count ?? 0)
    };
    const config={reads:['👁','Reads'],likes:['❤️','Likes'],stars:['⭐','Stars'],follows:['👥','Follows']};
    for (const [key,node] of Object.entries(fields)) {
      if (!node) continue;
      const [icon,label]=config[key];
      node.textContent=`${icon} ${values[key]===null?'—':fmt(values[key])} ${label}`;
    }
  };
})();
