/* Writer-controlled mature content labels. Keyword hints are advisory, not a classifier. */
(() => {
 const db=window.supabaseClient, area=document.querySelector('.chapter-writing-area');
 if(!db||!area)return;
 const panel=document.createElement('section');panel.className='dv-mature-editor';
 panel.innerHTML='<h3>Chapter Content Warning</h3><p>Choose the appropriate reader warning before publishing. This is not automatic approval or moderation.</p><label for="dv-warning-level">Warning level</label><select id="dv-warning-level"><option value="none">General / no mature warning</option><option value="mature">Mature themes — content advisory</option><option value="r18">18+ — explicit or graphic content</option></select><label><input type="checkbox" value="sexual" class="dv-warning-topic"> Sexual content</label><label><input type="checkbox" value="violence" class="dv-warning-topic"> Graphic violence</label><label><input type="checkbox" value="disturbing" class="dv-warning-topic"> Disturbing themes</label><button type="button" id="dv-save-warning">Save chapter warning</button><p id="dv-warning-hint" role="status"></p>';
 area.parentElement.insertBefore(panel,area);
 const level=panel.querySelector('#dv-warning-level'), hint=panel.querySelector('#dv-warning-hint');
 const storyId=()=>localStorage.getItem('dreavelleVerseStoryId');
 const chapterNumber=()=>Number(localStorage.getItem('dreavelleVerseCurrentChapter')||'1');
 async function load(){
  if(!storyId())return;
  const {data,error}=await db.from('dv_chapter_warnings').select('warning_level,warning_topics').eq('story_id',storyId()).eq('chapter_number',chapterNumber()).maybeSingle();
  if(error){hint.textContent='Warning setup unavailable. Install the SQL setup first.';return;}
  if(data){level.value=data.warning_level;panel.querySelectorAll('.dv-warning-topic').forEach(c=>c.checked=(data.warning_topics||[]).includes(c.value));}
 }
 async function save(){
  const {data:{user}}=await db.auth.getUser();if(!user||!storyId()){hint.textContent='Sign in and save the story first.';return false;}
  const warning_topics=[...panel.querySelectorAll('.dv-warning-topic:checked')].map(c=>c.value);
  const {error}=await db.from('dv_chapter_warnings').upsert({story_id:storyId(),chapter_number:chapterNumber(),warning_level:level.value,warning_topics,updated_at:new Date().toISOString()},{onConflict:'story_id,chapter_number'});
  if(error){console.warn(error);hint.textContent='Could not save warning. Please retry.';return false;}
  hint.textContent='Chapter warning saved.';return true;
 }
 panel.querySelector('#dv-save-warning').addEventListener('click',save);
 const publish=document.querySelector('.publish-chapter-button');
 if(publish)publish.addEventListener('click',async e=>{
   const ok=await save();
   if(!ok)alert('Chapter warning could not be saved. Please check its warning settings before publishing.');
 },{capture:true});
 // A limited prompt only; writers must review and label their own content.
 area.addEventListener('input',()=>{
  if(/\b(?:graphic violence|sexual assault|explicit sex|torture|dismemberment)\b/i.test(area.value) && level.value==='none')
    hint.textContent='Potential mature subject detected. Please review and select an appropriate warning.';
 });
 load();
})();
