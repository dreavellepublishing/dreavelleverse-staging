/* Reader-facing warning and self-declared age check; NOT verified age assurance. */
(async () => {
 const db=window.supabaseClient, content=document.getElementById('chapter-content'), gate=document.getElementById('dv-mature-gate');
 if(!db||!content||!gate)return;
 const params=new URLSearchParams(location.search),storyId=params.get('id'),chapter=Number(params.get('chapter'));
 const show=()=>{content.hidden=false;gate.hidden=true;};
 if(!storyId||!Number.isInteger(chapter)||chapter<1){show();return;}
 const {data,error}=await db.from('dv_chapter_warnings').select('warning_level,warning_topics').eq('story_id',storyId).eq('chapter_number',chapter).maybeSingle();
 if(error){console.warn('Mature warning lookup:',error);gate.hidden=false;gate.textContent='Content warning status is unavailable. Please try again later.';return;}
 if(!data||data.warning_level==='none'){show();return;}
 const topics=(data.warning_topics||[]).map(t=>({sexual:'sexual content',violence:'graphic violence',disturbing:'disturbing themes'})[t]||t).join(', ');
 const isR18=data.warning_level==='r18';
 const heading=document.createElement('h3');heading.textContent=isR18?'18+ Mature Content Warning':'Mature Content Advisory';
 const summary=document.createElement('p');summary.textContent='This chapter may include '+(topics||'mature themes')+'. Reader discretion is advised.';
 gate.append(heading,summary);gate.hidden=false;
 const back=document.createElement('button');back.type='button';back.textContent='Go back to story';back.onclick=()=>location.href='read-story.html?id='+encodeURIComponent(storyId);
 gate.append(back);
 if(!isR18){const proceed=document.createElement('button');proceed.type='button';proceed.textContent='Continue reading';proceed.onclick=show;gate.append(proceed);return;}
 const info=document.createElement('p');info.textContent='This chapter is intended for adults 18 and older. Enter your date of birth to confirm your age. This is self-declared and is not identity verification.';
 const label=document.createElement('label');label.textContent='Date of birth: ';
 const date=document.createElement('input');date.type='date';date.required=true;date.max=new Date().toISOString().slice(0,10);label.append(date);
 const proceed=document.createElement('button');proceed.type='button';proceed.textContent='Confirm 18+ and continue';
 const message=document.createElement('p');message.setAttribute('role','status');
 proceed.addEventListener('click',()=>{
   if(!date.value){message.textContent='Please enter your date of birth.';return;}
   const birth=new Date(date.value+'T12:00:00');if(!Number.isFinite(birth.getTime())||birth>new Date()){message.textContent='Please enter a valid date.';return;}
   const today=new Date();let age=today.getFullYear()-birth.getFullYear();
   if(today.getMonth()<birth.getMonth()||(today.getMonth()===birth.getMonth()&&today.getDate()<birth.getDate()))age--;
   if(age<18){message.textContent='This chapter is restricted to readers aged 18 and older.';date.value='';return;}
   date.value='';show();
 });
 gate.append(info,label,proceed,message);
})();
