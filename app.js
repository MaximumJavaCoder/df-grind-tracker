const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const uid=()=>crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random());
const KEY='dfDialV13'; let view='home', beanTab='current', maintTab='grinder', selectedMethod='Espresso', recipeTab='library', recipeQuery='', recipeMethod='All', recipeRoast='All', recipeMatchPrefs=true; let pourStage='idle', pourBloom=0;
const iso=()=>new Date().toISOString(), today=()=>new Date().toISOString().slice(0,10);
const brewMethods=['Espresso','Pour Over','AeroPress','French Press','Moka Pot','Other'];
const flavourTags=['Chocolate','Fruity','Floral','Sweet','Funky'];
const models=['DF54','DF64','DF64V','DF83','DF83V'];
let timer={running:false,start:0,elapsed:0,int:null};
const h=(ms=12)=>{try{navigator.vibrate&&navigator.vibrate(ms)}catch(e){}};
const esc=(s='')=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function seed(){let g=uid(), b1=uid(), b2=uid(), p1=uid(), p2=uid(), p3=uid(), now=iso(); return {
 currentBeanId:b1,
 userProfile:{brew:['Espresso','Pour Over'],machine:{manufacturer:'ECM',model:'Synchronika II'},grinders:[{id:g,model:'DF64',name:'DF64 Gen 2',burrType:'Stainless Steel',burrOther:'',profile:'Multipurpose (espresso)'}],flavour:{roast:52,notes:['Chocolate','Sweet']},workflow:['WDT','RDT','Slow feed']},
 beans:[
  {id:b1,status:'current',name:'Brazil Fazenda Ambiental',roaster:'Archive Coffee',origin:'Brazil',process:'Natural',roastLevel:'Medium',roastDate:'2026-05-18',photo:'',brewProfiles:{Espresso:[{id:p1,name:'Current',active:true,createdAt:now,score:8.2,grinderId:g,grind:18.6,dose:18,yieldOut:36,time:29,ratio:'1:2.0',notes:'Sweet, clean, dialed in.'},{id:p2,name:'Turbo Shot',active:false,createdAt:now,score:7.9,grinderId:g,grind:20.4,dose:18,yieldOut:54,time:24,ratio:'1:3.0',notes:''}], 'Pour Over':[{id:p3,name:'Current',active:true,createdAt:now,score:8.6,grinderId:g,grind:42,dose:20,water:320,bloom:45,totalTime:195,notes:'Balanced sweetness.'}] }},
  {id:b2,status:'current',name:'Ethiopia Chelbesa',roaster:'Konga',origin:'Ethiopia',process:'Washed',roastLevel:'Light',roastDate:'2026-05-24',photo:'',brewProfiles:{Espresso:[{id:uid(),name:'Current',active:true,createdAt:now,score:8.0,grinderId:g,grind:17.8,dose:18,yieldOut:38,time:31,ratio:'1:2.1',notes:'Floral, sweet.'}]}}
 ],
 brews:[{id:uid(),beanId:b1,method:'Espresso',profileId:p1,grinderId:g,grind:18.6,dose:18,yieldOut:36.2,time:29.4,rating:8.2,flavours:['Chocolate','Sweet'],notes:'Balanced and sweet.',createdAt:now},{id:uid(),beanId:b1,method:'Pour Over',profileId:p3,grinderId:g,grind:42,dose:20,water:320,totalTime:195,bloom:45,rating:8.6,flavours:['Sweet'],notes:'Good clarity.',createdAt:now},{id:uid(),beanId:b2,method:'Espresso',grinderId:g,grind:17.8,dose:18,yieldOut:38,time:31,rating:8.0,flavours:['Floral'],notes:'Bright.',createdAt:now}],
 maintenance:[{id:uid(),group:'grinder',name:'Grinder deep clean',item:'DF grinder',intervalDays:45,lastDone:today()},{id:uid(),group:'grinder',name:'Chute cleaning',item:'DF grinder',intervalDays:7,lastDone:today()},{id:uid(),group:'espresso',name:'Backflushing',item:'Espresso machine',intervalDays:7,lastDone:today()}],
 settings:{rateReminder:true,rateDelay:7}
}}
function migrate(o){let f=seed(); if(!o)return ensureCommunity(f); o.userProfile=o.userProfile||o.profile||f.userProfile; o.settings=o.settings||f.settings; o.maintenance=o.maintenance||f.maintenance; o.beans=(o.beans||f.beans).map(b=>({...b,status:b.status==='archived'?'archived':'current',photo:b.photo||'',brewProfiles:b.brewProfiles||{Espresso:[]}})); o.brews=o.brews||o.shots||f.brews; o.currentBeanId=o.currentBeanId||o.beans[0]?.id; ['Grinder deep clean','Chute cleaning','Backflushing'].forEach((n,i)=>{if(!o.maintenance.some(m=>m.name===n))o.maintenance.push(f.maintenance[i])}); return ensureCommunity(o)}
function load(){try{let s=localStorage.getItem(KEY)||localStorage.getItem('dfDialV9')||localStorage.getItem('dfDialV8'); if(s)return migrate(JSON.parse(s))}catch(e){} return ensureCommunity(seed())} let state=ensureCommunity(load());
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
const bean=id=>state.beans.find(b=>b.id===id), currentBean=()=>bean(state.currentBeanId)||state.beans.find(b=>b.status==='current')||state.beans[0];
const grinder=id=>(state.userProfile.grinders||[]).find(g=>g.id===id)||state.userProfile.grinders?.[0]||{};
const brewsFor=(id,method)=>state.brews.filter(x=>x.beanId===id&&(!method||x.method===method)).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
const lastBrew=(id,method)=>brewsFor(id,method)[0];
function ratio(x){let d=+x.dose, y=+(x.yieldOut||x.water); return d&&y?'1:'+(y/d).toFixed(1):'—'}
function fmt(sec){sec=+(sec||0); if(sec<60)return sec.toFixed(1).padStart(4,'0'); let m=Math.floor(sec/60), r=(sec%60).toFixed(1).padStart(4,'0'); return `${m}:${r}`}
function dateShort(s){return new Date(s).toLocaleDateString(undefined,{month:'short',day:'numeric'})}
function toast(m){let t=$('#toast'); t.textContent=m; t.style.display='block'; clearTimeout(t._t); t._t=setTimeout(()=>t.style.display='none',1800)}
function dueInfo(){let x=null; state.maintenance.forEach(m=>{let d=new Date(m.lastDone); d.setDate(d.getDate()+Number(m.intervalDays)); if(!x||d<x.date)x={m,date:d}}); return {x,days:x?Math.ceil((x.date-new Date())/86400000):0}}
function logo(){return `<div class="hero"><img src="brew-library-logo.svg" class="wordmark" alt="Brew Library"></div>`}
function icon(name){const path={home:'M3 11.5 12 4l9 7.5V21h-6v-6H9v6H3z',beans:'M15.6 3.2c3.2 1.2 4.7 5.8 3.3 10.2s-5.1 7-8.3 5.8S5.9 13.4 7.3 9 12.4 2 15.6 3.2Z M8.2 18.5c2.4-2.5 4.1-5.3 5.2-8.5.7-2.1 1.1-4.1 1.2-6',shot:'M6 8h12v5.5a6 6 0 0 1-12 0z M18 10h2.2a2.3 2.3 0 0 1 0 4.6H18 M8 20h8 M10 4h4',maint:'M14.8 6.1a4.5 4.5 0 0 0-5.4 5.4l-5.9 5.9 3.1 3.1 5.9-5.9a4.5 4.5 0 0 0 5.4-5.4l-3 3-2.1-2.1z',more:'M4 7h16 M4 12h16 M4 17h16',pencil:'M4 20h4l11-11-4-4L4 16z M13 6l4 4',back:'M15 18l-6-6 6-6',camera:'M4 8h3l1.5-2h7L17 8h3v11H4z M12 11a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'}[name]; return `<svg viewBox="0 0 24 24"><path d="${path}"/></svg>`}
function brewSvg(m){
 const paths={
  Espresso:'M5 6.5h14v1.6c0 .7-.5 1.2-1.2 1.2H6.2C5.5 9.3 5 8.8 5 8.1V6.5z M9.5 9.4v1.9 M14.5 9.4v1.9 M8 15.8h8 M8.5 15.8c.2 1.7 1.8 3 3.5 3s3.3-1.3 3.5-3 M10.2 11.7h3.6',
  'Pour Over':'M8 5h8l-1.9 5.8H9.9L8 5z M9.8 10.8h4.4 M7.5 16.5c.8 1.5 8.2 1.5 9 0 M8.6 13.2h6.8l1.1 3.3h-9z',
  AeroPress:'M9 4h6v13H9z M10.5 6.6h3 M10.5 15h3 M7.5 19h9 M8.5 17h7',
  'French Press':'M8 6h8v12H8z M9 4h6 M12 3.5v5 M7 20h10 M16 9h2v6h-2 M9 14c1.6.9 4.4.9 6 0',
  'Moka Pot':'M8.3 9h7.4l1.8 9H6.5l1.8-9z M9.4 9l.8-5h3.6l.8 5 M8 13h8 M17 12h2 M18.5 12.5v4',
  Other:'M12 5v14 M5 12h14'
 };
 const d=paths[m]||paths.Other; return `<svg viewBox="0 0 24 24"><path d="${d}"/></svg>`
}
function smallIcon(n){
 const paths={
  bean:'M14.5 3.5c2.8 1.1 4.2 5.2 2.9 9.1-1.3 3.9-4.8 6.6-7.7 5.5-2.8-1.1-4.2-5.2-2.9-9.1 1.3-3.9 4.8-6.6 7.7-5.5z M8.2 17.8c2.5-2.4 4.2-5.1 5.2-8.1.6-1.9 1-3.8 1.1-5.7',
  water:'M12 4s5 5.7 5 9.4a5 5 0 0 1-10 0C7 9.7 12 4 12 4z',
  time:'M12 7v5l3 2 M9 2h6 M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z',
  ratio:'M7 8h7a3 3 0 1 1-2.4 4.8 M17 16h-7a3 3 0 1 1 2.4-4.8'
 };
 return `<svg viewBox="0 0 24 24"><path d="${paths[n]||paths.bean}"/></svg>`
}
function equipSvg(kind){
 const grinder='M10 3.5h4 M9 4.8h6v2.5l-1.1 1H10.1L9 7.3V4.8z M9.4 8.5h5.2 M8.4 9.1l1.5 10.4h7L15.2 9.1 M8.7 20.3h8.8 M9.4 12.1l3.4 1.2-2 4-3-1.3 M15.4 13.5h2.2v3.7h-2.2 M8.7 18.3h-2.4a2.1 2.1 0 0 1 0-4.2h1.4';
 const machine='M6 7h12v10H6z M8 5.2h8 M8 9h2 M12 9h2 M16 9h1 M8.5 12.2h3.2 M10.1 12.2v4 M12.4 12.1h3.5v2.5l-1.2 1.2 M17.4 12h2v3h-2 M7 19h11 M8 17.5h8';
 const d=kind==='grinder'?grinder:machine; return `<svg viewBox="0 0 24 24"><path d="${d}"/></svg>`
}
function nav(){return `<nav class="nav"><button class="${view==='home'?'active':''}" onclick="go('home')">${icon('home')}</button><button class="${view==='beans'?'active':''}" onclick="go('beans')">${icon('beans')}</button><button class="plus" onclick="go('log')">+</button><button class="${view==='maintenance'?'active':''}" onclick="go('maintenance')">${icon('maint')}</button><button class="${view==='more'?'active':''}" onclick="go('more')">${icon('more')}</button></nav>`}
function go(v){stopTimer(false); view=v; render()}
function render(){save(); $('#app').innerHTML=`<div class="wrap">${logo()}${views[view]?views[view]():views.home()}${nav()}</div>`; bind()}
const views={
 home(){let b=currentBean(), l=b&&lastBrew(b.id), g=grinder(l?.grinderId||b?.grinderId), d=dueInfo(), month=new Date().toISOString().slice(0,7); return `${profileCard()}<section class="card click" onclick="openBeanDetail('${b?.id||''}')"><h2>Current Bean</h2>${beanMini(b,true)}</section><section class="card click" onclick="openBeanDetail('${b?.id||''}')"><h2>Last Used Settings</h2><div class="settings-summary"><div><b>${esc(g.name||g.model||'—')}</b><p>${esc([g.burrType==='Other'?g.burrOther:g.burrType,g.profile].filter(Boolean).join(' • '))}</p></div><strong>${l?l.grind:'—'}</strong></div><div class="metric-grid"><p>Dose<br><b>${l?.dose||'—'}g</b></p><p>Output<br><b>${l?.yieldOut||l?.water||'—'}g</b></p><p>Ratio<br><b>${l?ratio(l):'—'}</b></p><p>Time<br><b>${l?fmt(l.time||l.totalTime):'—'}s</b></p></div></section><div class="stats"><button onclick="go('beans')"><span>Current Beans</span><b>${state.beans.filter(x=>x.status==='current').length}</b></button><button onclick="go('history')"><span>Shots This Month</span><b>${state.brews.filter(x=>x.createdAt.slice(0,7)===month).length}</b></button><button onclick="go('maintenance')"><span>Maintenance Due</span><b>${d.days<=0?'Now':d.days+'d'}</b></button></div><section class="card click" onclick="go('history')"><h2>Shot History</h2>${state.brews.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,3).map(brewRow).join('')||'<p>No brews yet.</p>'}</section>`},
 beans(){let arch=beanTab==='archive', list=state.beans.filter(b=>arch?b.status==='archived':b.status==='current'); return `<section class="card"><h2>Beans</h2><div class="tabs"><button class="${!arch?'sel':''}" onclick="beanTab='current';render()">Current <span>${state.beans.filter(x=>x.status==='current').length}</span></button><button class="${arch?'sel':''}" onclick="beanTab='archive';render()">Archive <span>${state.beans.filter(x=>x.status==='archived').length}</span></button></div><input placeholder="Search ${arch?'archive':'current'} beans" oninput="filterBeans(this.value)"><button class="btn secondary" onclick="openBeanForm()">Add Bean</button><div id="beanList">${list.map(beanCard).join('')||'<p>No beans here.</p>'}</div></section>`},
 history(){return `<section class="card"><h2>Last 20 Brews</h2>${state.brews.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,20).map(brewRow).join('')||'<p>No brews yet.</p>'}</section>`},
 log(){return logView()},
 maintenance(){return maintView()},
 more(){return `<section class="card"><h2>Settings</h2><div class="tile ${state.settings.rateReminder?'selected':''}" onclick="state.settings.rateReminder=!state.settings.rateReminder;render()"><b>Ask me to rate my brew later</b><p>${state.settings.rateReminder?'Enabled':'Disabled'}</p></div><label>Rating reminder delay</label><select onchange="state.settings.rateDelay=this.value;save()"><option value="5" ${state.settings.rateDelay==5?'selected':''}>5 minutes</option><option value="10" ${state.settings.rateDelay==10?'selected':''}>10 minutes</option></select><button class="btn full secondary" onclick="exportData()">Export Backup</button><button class="btn full secondary" onclick="localStorage.removeItem(KEY);location.reload()">Reset Demo Data</button></section>`}
};
function profileCard(){let p=state.userProfile,g=p.grinders[0]||{}; return `<section class="card profile-card"><button class="edit-icon" onclick="editProfile()">${icon('pencil')}</button><h2>Profile</h2><div class="method-row">${(p.brew||[]).map(m=>`<span>${brewSvg(m)}</span>`).join('')}</div><div class="detail compact"><div><span>Machine</span>${esc([p.machine.manufacturer,p.machine.model].filter(Boolean).join(' ')||'Not set')}</div><div><span>Grinder</span>${esc([g.model,g.burrType==='Other'?g.burrOther:g.burrType,g.profile].filter(Boolean).join(' • '))}</div><div><span>Preference</span>${p.flavour.roast<35?'Darker':p.flavour.roast>65?'Lighter':'Medium'} • ${(p.flavour.notes||[]).join(', ')}</div><div><span>Workflow</span>${(p.workflow||[]).join(', ')||'Not set'}</div></div></section>`}
function beanMini(b,big=false){if(!b)return '<p>No bean selected.</p>';return `<div class="bean-card"><div class="bag ${b.photo?'has-photo':''}">${b.photo?`<img src="${b.photo}">`:'DF'}</div><div><div class="bean-title">${esc(b.name)}</div><p>${esc(b.roaster)}<br>${esc([b.origin,b.process].filter(Boolean).join(' • '))}</p></div><span class="pill">${esc(b.roastLevel)}</span></div>`}
function beanCard(b){let l=lastBrew(b.id);return `<div class="bean-card click bean-manage" onclick="openBeanDetail('${b.id}')"><div class="bag ${b.photo?'has-photo':''}">${b.photo?`<img src="${b.photo}">`:'DF'}</div><div><div class="bean-title">${esc(b.name)}</div><p>${esc(b.roaster)}<br>${esc(b.origin)} · ${l?l.grind+' setting':'No brews yet'}</p><div class="inline-actions"><button onclick="event.stopPropagation();archiveBean('${b.id}')">${b.status==='archived'?'Restore':'Archive'}</button><button onclick="event.stopPropagation();deleteBean('${b.id}')">Delete</button></div></div><span class="pill">${esc(b.roastLevel)}</span></div>`}
function methodTabs(b,sel){let methods=[...new Set([...brewMethods,...Object.keys(b.brewProfiles||{})])].filter(m=>m==='Other'||(b.brewProfiles?.[m]?.length)||brewMethods.includes(m));return `<div class="brew-tabs">${methods.map(m=>`<button class="${sel===m?'sel':''}" onclick="selectedMethod='${m}';openBeanDetail('${b.id}',false)">${brewSvg(m)}<small>${m}</small></button>`).join('')}</div>`}
function activeProfile(b,m){let arr=b.brewProfiles?.[m]||[]; return arr.find(p=>p.active)||arr[0]}
function openBeanDetail(id,modalOpen=true){let b=bean(id); if(!b)return; if(!b.brewProfiles)b.brewProfiles={}; if(!b.brewProfiles[selectedMethod])selectedMethod=Object.keys(b.brewProfiles)[0]||'Espresso'; let p=activeProfile(b,selectedMethod), g=grinder(p?.grinderId||b.grinderId), recent=brewsFor(b.id,selectedMethod).slice(0,3); let html=`<button class="back" onclick="closeModal()">${icon('back')}</button><button class="edit-icon modal-edit" onclick="openBeanForm('${b.id}')">${icon('pencil')}</button><div class="bean-hero"><button class="bag large ${b.photo?'has-photo':''}" onclick="pickPhoto('${b.id}')">${b.photo?`<img src="${b.photo}">`:'DF'}<em>${icon('camera')}</em></button><div><h1>${esc(b.name)}</h1><p>${esc([b.process,b.origin].filter(Boolean).join(' • '))}</p><span class="pill green">${b.status==='current'?'Current Bean':'Archived'}</span></div></div><h3>Brew Profiles</h3>${methodTabs(b,selectedMethod)}${profilePanel(b,selectedMethod,p,g)}<section class="inner-card"><h3>Equipment</h3><div class="equipment"><div>${equipSvg('grinder')}<b>${esc(g.name||g.model||'—')}</b><small>${esc([g.burrType==='Other'?g.burrOther:g.burrType,g.profile].filter(Boolean).join(' • '))}</small></div><div>${equipSvg('machine')}<b>${esc([state.userProfile.machine.manufacturer,state.userProfile.machine.model].filter(Boolean).join(' ')||'Machine not set')}</b><small>Espresso Machine</small></div></div></section><section class="inner-card"><h3>Last 3 Brews <button onclick="showBeanHistory('${b.id}','${selectedMethod}')">View All (20)</button></h3><div class="mini-brews">${recent.map(x=>`<button onclick="brewDetail('${x.id}')"><small>${dateShort(x.createdAt)}</small><b>${x.rating||'—'}</b><span>${fmt(x.time||x.totalTime)}s</span></button>`).join('')||'<p>No brews yet.</p>'}</div></section><section class="inner-card"><h3>Saved Profiles (${selectedMethod}) <button onclick="manageProfiles('${b.id}','${selectedMethod}')">Manage</button></h3><div class="saved-profiles">${(b.brewProfiles[selectedMethod]||[]).map(pr=>`<button class="${pr.active?'sel':''}" onclick="profileDetail('${b.id}','${selectedMethod}','${pr.id}')"><b>${esc(pr.name)}</b><small>${dateShort(pr.createdAt)} · ${pr.score||'—'} Score</small></button>`).join('')}<button class="add" onclick="profileForm('${b.id}','${selectedMethod}')">+<small>Add New</small></button></div></section>`; if(modalOpen) modal(html); else {$('.modal').innerHTML=`<div class="modal-head"><span></span><button onclick="closeModal()">×</button></div>${html}`} }
function scoreColor(v){v=+v||0; if(v<4)return '#c97c72'; if(v<7)return '#d7caa1'; return '#8ccd71'}
function profilePanel(b,m,p,g){if(!p)return `<section class="profile-main"><h3>${m} — No Profile</h3><button class="btn full" onclick="profileForm('${b.id}','${m}')">Create ${m} Profile</button></section>`; let isEsp=m==='Espresso', score=+(p.score||0), pct=Math.max(0,Math.min(100,score*10)), c=scoreColor(score); return `<section class="profile-main"><div class="profile-title"><h3>${m} — Current Profile</h3><span>Dialed In</span></div><div class="profile-grid"><div class="gauge grind"><b>${p.grind??'—'}</b><small>Grind Setting</small><em>${esc(g.name||g.model||'—')}</em></div><div class="recipe-list">${isEsp?`<p>${smallIcon('bean')} <b>${p.dose} g</b> Dose</p><p>${smallIcon('bean')} <b>${p.yieldOut} g</b> Yield</p><p>${smallIcon('time')} <b>${p.time} sec</b> Time</p><p>⟲ <b>${p.ratio||ratio(p)}</b> Ratio</p>`:`<p>${smallIcon('bean')} <b>${p.dose} g</b> Coffee</p><p>${smallIcon('water')} <b>${p.water} g</b> Water</p><p>${smallIcon('time')} <b>${fmt(p.totalTime)}</b> Total Time</p>${m==='Pour Over'?`<p>◌ <b>${p.bloom||0} sec</b> Bloom</p>`:''}`}</div><div class="score-ring" style="--pct:${pct}%;--scoreColor:${c}"><b>${p.score||'—'}</b><small>Taste Score</small></div></div><button class="btn full" onclick="brewUsingProfile('${b.id}','${m}','${p.id}')">Brew Using This Profile</button></section>`}
function brewRow(x){let b=bean(x.beanId);return `<div class="shot-row click" onclick="brewDetail('${x.id}')"><b>${esc(b?.name||'Bean')}</b><span>${x.method}</span><strong>${x.rating||'—'}</strong><p>${esc([x.grind+' setting',fmt(x.time||x.totalTime)+'s',ratio(x)].join(' · '))}</p></div>`}
function showBeanHistory(id,m){modal(`<h2>${esc(bean(id)?.name||'')} — ${m}</h2>${brewsFor(id,m).slice(0,20).map(brewRow).join('')||'<p>No brews.</p>'}`)}
function brewDetail(id){let x=state.brews.find(b=>b.id===id), b=bean(x.beanId), g=grinder(x.grinderId); if(!x)return; modal(`<button class="edit-icon modal-edit" onclick="editBrew('${id}')">${icon('pencil')}</button><h2>${x.method} Details</h2><div class="hero-detail"><b>${x.rating||'—'}</b><span>Taste Score</span></div><div class="detail"><div><span>Bean</span>${esc(b?.name||'')}</div><div><span>Grinder</span>${esc(g.name||g.model||'—')}</div><div><span>Grind</span>${x.grind}</div><div><span>Dose</span>${x.dose}g</div><div><span>Output</span>${x.yieldOut||x.water||'—'}g</div><div><span>Ratio</span>${ratio(x)}</div><div><span>Time</span>${fmt(x.time||x.totalTime)}s</div><div><span>Flavours</span>${(x.flavours||[]).join(', ')||'—'}</div><div><span>Notes</span>${esc(x.notes||'—')}</div></div>`)}
function logView(pref={}){let b=bean(pref.beanId)||currentBean(); let m=pref.method||selectedMethod||'Espresso'; let p=pref.profileId?activeProfile(b,m):activeProfile(b,m); let g=grinder(p?.grinderId||b?.grinderId); return `<section class="card"><h2>Log Brew</h2><div class="seg"><button class="sel">Existing Bean</button><button onclick="openBeanForm()">New Bean</button></div><label>Bean</label><select id="logBean" onchange="state.currentBeanId=this.value;render()">${state.beans.filter(x=>x.status==='current').map(x=>`<option value="${x.id}" ${x.id===b?.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select><label>Brew Method</label><div class="brew-tabs compact">${brewMethods.map(x=>`<button class="${m===x?'sel':''}" onclick="selectedMethod='${x}';render()">${brewSvg(x)}<small>${x}</small></button>`).join('')}</div>${settingBlock(p?.grind||lastBrew(b?.id,m)?.grind||18.6)}<div class="metric-grid"><label>Dose<input id="dose" type="number" step="0.1" value="${p?.dose||18}"></label>${m==='Espresso'?`<label>Yield<input id="yieldOut" type="number" step="0.1" value="${p?.yieldOut||36}"></label>`:`<label>Water<input id="water" type="number" step="1" value="${p?.water||320}"></label>`}</div>${m==='Pour Over'?'<div class="metric-grid"><label>Bloom Timer<input id="bloom" type="number" value="45"></label><label>Total Brew Timer<input id="manualTime" type="number" step="0.1" placeholder="optional"></label></div>':''}${timerBlock(m)}${ratingBlock(7.5)}<label>Flavour Description</label><div class="select-grid">${['Chocolate','Fruity','Floral','Sweet','Funky'].map(x=>`<button type="button" class="tile small" data-flav="${x}" onclick="this.classList.toggle('selected')">${x}</button>`).join('')}</div><label>Flavour Notes</label><textarea id="notes" placeholder="Sweet, clean, slightly fast..."></textarea><button class="btn full" onclick="saveBrew('${b?.id||''}','${m}')">Save Brew</button><button class="btn secondary full" onclick="saveDialedProfile('${b?.id||''}','${m}')">Save Dialed-In Profile</button></section>`}
function settingBlock(v){return `<div class="setting-card"><div><label>Grinder</label><b>${esc(state.userProfile.grinders[0]?.name||state.userProfile.grinders[0]?.model||'DF Grinder')}</b></div><label class="setting-num">Setting<input id="grind" type="number" step="0.1" value="${(+v).toFixed(1)}" onchange="syncRuler(+this.value)"></label><div class="ruler" id="ruler"><div class="track" id="track"></div><div class="center-line"></div></div></div>`}
function timerBlock(m='Espresso'){let label=m==='Pour Over'?'TAP TO START BLOOM':'TAP TO START'; return `<div class="timer" id="timerCircle" onclick="toggleTimer('${m}')"><div class="timer-inner"><div><div class="timer-time" id="timeText">00.0</div><div class="timer-label" id="timeLabel">${label}</div></div></div></div><button class="reset-timer" onclick="event.stopPropagation();resetTimer()">↺ Reset</button>`}
function ratingBlock(v=7.5){return `<label>Taste / Result</label><div class="rating-wrap"><div class="rating-num" id="ratingNum">${(+v).toFixed(1)}</div><input id="rating" class="rating-slider" type="range" min="1" max="10" step="0.1" value="${v}" oninput="updateRating(this.value)"></div>`}
function updateRating(v){let n=$('#ratingNum'), r=$('#rating'); if(!n||!r)return; v=+v||0; n.textContent=v.toFixed(1); let pct=(v-1)/9*100; let c=scoreColor(v); n.style.color=c; r.style.setProperty('--pct',pct+'%'); r.style.setProperty('--ratingColor',c)}
function saveBrew(beanId,method){let elapsed=timer.elapsed/1000 || +($('#manualTime')?.value||0); let data={id:uid(),beanId:beanId||$('#logBean').value,method,grinderId:state.userProfile.grinders[0]?.id,grind:+$('#grind').value,dose:+$('#dose').value,rating:+$('#rating').value,flavours:$$('[data-flav].selected').map(x=>x.dataset.flav),notes:$('#notes').value,createdAt:iso()}; if(method==='Espresso')Object.assign(data,{yieldOut:+$('#yieldOut').value,time:elapsed||0}); else Object.assign(data,{water:+$('#water').value,totalTime:elapsed||0,bloom:+($('#bloom')?.value||pourBloom||0)}); state.brews.unshift(data); state.currentBeanId=data.beanId; stopTimer(false); toast('Brew saved'); go('home')}
function saveDialedProfile(beanId,method){let b=bean(beanId||$('#logBean').value); if(!b)return; let name=prompt('Profile name', 'Current')||'Current'; let arr=b.brewProfiles[method]=b.brewProfiles[method]||[]; if(name.toLowerCase()==='current')arr.forEach(p=>p.active=false); let p={id:uid(),name,active:name.toLowerCase()==='current',createdAt:iso(),score:+($('#rating')?.value||0),grinderId:state.userProfile.grinders[0]?.id,grind:+$('#grind').value,dose:+$('#dose').value,notes:$('#notes')?.value||''}; if(method==='Espresso')Object.assign(p,{yieldOut:+$('#yieldOut').value,time:timer.elapsed/1000||0,ratio:ratio({dose:+$('#dose').value,yieldOut:+$('#yieldOut').value})}); else Object.assign(p,{water:+$('#water').value,totalTime:timer.elapsed/1000||0,bloom:+($('#bloom')?.value||pourBloom||0)}); arr.push(p); toast('Dialed-in profile saved'); render()}
function brewUsingProfile(beanId,method,pid){closeModal(); selectedMethod=method; view='log'; setTimeout(()=>{render(); let p=(bean(beanId).brewProfiles[method]||[]).find(x=>x.id===pid); if(p){$('#logBean').value=beanId; $('#grind').value=(+p.grind).toFixed(1); syncRuler(+p.grind); $('#dose').value=p.dose||''; if(method==='Espresso')$('#yieldOut').value=p.yieldOut||''; else $('#water').value=p.water||'';}},0)}
function profileDetail(beanId,m,pid){let b=bean(beanId), p=(b.brewProfiles[m]||[]).find(x=>x.id===pid); modal(`<button class="edit-icon modal-edit" onclick="profileForm('${beanId}','${m}','${pid}')">${icon('pencil')}</button><h2>${esc(p.name)}</h2><div class="hero-detail"><b>${p.score||'—'}</b><span>Taste Score</span></div><div class="detail"><div><span>Method</span>${m}</div><div><span>Grind</span>${p.grind}</div><div><span>Dose</span>${p.dose}g</div><div><span>Output</span>${p.yieldOut||p.water||'—'}g</div><div><span>Time</span>${fmt(p.time||p.totalTime)}s</div><div><span>Notes</span>${esc(p.notes||'—')}</div></div><button class="btn full" onclick="brewUsingProfile('${beanId}','${m}','${pid}')">Brew Using This Profile</button>`)}
function profileForm(beanId,m,pid){let b=bean(beanId), p=pid?(b.brewProfiles[m]||[]).find(x=>x.id===pid):{}; modal(`<h2>${pid?'Edit':'New'} ${m} Profile</h2>${settingBlock(p.grind||18)}<label>Name</label><input id="pname" value="${esc(p.name||'Current')}"><div class="metric-grid"><label>Dose<input id="pdose" type="number" value="${p.dose||18}"></label><label>${m==='Espresso'?'Yield':'Water'}<input id="pout" type="number" value="${p.yieldOut||p.water||36}"></label></div><label>Time</label><input id="ptime" type="number" step="0.1" value="${p.time||p.totalTime||0}">${ratingBlock(p.score||7.5)}<label>Notes</label><textarea id="pnotes">${esc(p.notes||'')}</textarea><button class="btn full" onclick="saveRecipeProfile('${beanId}','${m}','${pid||''}')">Save Profile</button>`);bindRuler();updateRating(p.score||7.5)}
function saveRecipeProfile(beanId,m,pid){let b=bean(beanId), arr=b.brewProfiles[m]=b.brewProfiles[m]||[], old=arr.find(x=>x.id===pid), name=$('#pname').value||'Current'; let p={id:pid||uid(),name,active:name.toLowerCase()==='current',createdAt:old?.createdAt||iso(),score:+$('#rating').value,grinderId:state.userProfile.grinders[0]?.id,grind:+$('#grind').value,dose:+$('#pdose').value,notes:$('#pnotes').value}; if(p.active)arr.forEach(x=>x.active=false); if(m==='Espresso')Object.assign(p,{yieldOut:+$('#pout').value,time:+$('#ptime').value,ratio:ratio({dose:p.dose,yieldOut:+$('#pout').value})}); else Object.assign(p,{water:+$('#pout').value,totalTime:+$('#ptime').value}); if(old)Object.assign(old,p); else arr.push(p); closeModal(); openBeanDetail(beanId)}
function manageProfiles(id,m){modal(`<h2>Saved Profiles (${m})</h2>${(bean(id).brewProfiles[m]||[]).map(p=>`<div class="profile-list"><div class="click" onclick="profileDetail('${id}','${m}','${p.id}')"><b>${esc(p.name)}</b><span>${p.score||'—'} Score</span><p>${p.grind} · ${dateShort(p.createdAt)}</p></div><button class="delete-mini" onclick="deleteProfile('${id}','${m}','${p.id}')">Delete</button></div>`).join('')}<button class="btn full" onclick="profileForm('${id}','${m}')">Add New</button>`)}
function deleteProfile(id,m,pid){let b=bean(id), arr=b.brewProfiles[m]||[], p=arr.find(x=>x.id===pid); if(!p)return; if(confirm(`Delete profile "${p.name}"?`)){b.brewProfiles[m]=arr.filter(x=>x.id!==pid); if(!b.brewProfiles[m].some(x=>x.active)&&b.brewProfiles[m][0])b.brewProfiles[m][0].active=true; closeModal(); manageProfiles(id,m)}}
function archiveBean(id){let b=bean(id); if(!b)return; b.status=b.status==='archived'?'current':'archived'; if(b.status==='current')state.currentBeanId=id; save(); closeModal(); render();}
function deleteBean(id){let b=bean(id); if(!b)return; if(confirm(`Delete ${b.name}? This cannot be undone.`)){state.beans=state.beans.filter(x=>x.id!==id); state.brews=state.brews.filter(x=>x.beanId!==id); if(state.currentBeanId===id)state.currentBeanId=state.beans.find(x=>x.status==='current')?.id||state.beans[0]?.id; closeModal(); render();}}
function openBeanForm(id){let b=id?bean(id):{id:'',status:'current',name:'',roaster:'',origin:'',process:'',roastLevel:'Medium',roastDate:today(),photo:'',brewProfiles:{}}; modal(`<h2>${id?'Edit Bean':'New Bean'}</h2><div class="row"><button class="bag large ${b.photo?'has-photo':''}" onclick="pickPhoto('${id||'new'}')">${b.photo?`<img src="${b.photo}">`:'DF'}<em>${icon('camera')}</em></button><p>Add a photo of the bag.</p></div><label>Name</label><input id="bn" value="${esc(b.name)}"><label>Roaster</label><input id="br" value="${esc(b.roaster)}"><label>Origin</label><input id="bo" value="${esc(b.origin)}"><label>Process</label><input id="bp" value="${esc(b.process)}"><label>Roast Level</label><select id="bl"><option ${b.roastLevel==='Light'?'selected':''}>Light</option><option ${b.roastLevel==='Medium'?'selected':''}>Medium</option><option ${b.roastLevel==='Dark'?'selected':''}>Dark</option></select><label>Roast Date</label><input id="bd" type="date" value="${esc(b.roastDate)}"><label>Status</label><select id="bs"><option value="current" ${b.status==='current'?'selected':''}>Current</option><option value="archived" ${b.status==='archived'?'selected':''}>Archived</option></select><div class="action-gap"><button class="btn full" onclick="saveBean('${id||''}')">Save Bean</button></div><input type="file" id="photoInput" accept="image/*" hidden onchange="loadPhoto(event,'${id||'new'}')">`)}
function pickPhoto(id){$('#photoInput')?.click()} function loadPhoto(e,id){let f=e.target.files[0]; if(!f)return; let r=new FileReader(); r.onload=()=>{if(id==='new')window.tempPhoto=r.result; else bean(id).photo=r.result; save(); render();}; r.readAsDataURL(f)}
function saveBean(id){let b={id:id||uid(),status:$('#bs').value,name:$('#bn').value,roaster:$('#br').value,origin:$('#bo').value,process:$('#bp').value,roastLevel:$('#bl').value,roastDate:$('#bd').value,photo:id?bean(id).photo:(window.tempPhoto||''),grinderId:state.userProfile.grinders[0]?.id,brewProfiles:id?bean(id).brewProfiles:{}}; if(id)Object.assign(bean(id),b); else state.beans.push(b); if(b.status==='current')state.currentBeanId=b.id; window.tempPhoto=''; closeModal(); render()}
function maintView(){let list=state.maintenance.filter(m=>maintTab==='other'?m.group==='other':m.group===maintTab); return `<section class="card"><h2>Maintenance</h2><div class="tabs"><button class="${maintTab==='grinder'?'sel':''}" onclick="maintTab='grinder';render()">Grinder</button><button class="${maintTab==='espresso'?'sel':''}" onclick="maintTab='espresso';render()">Espresso Machine</button></div>${list.map(maintRow).join('')||'<p>No items.</p>'}<button class="btn full secondary" onclick="editMaint()">Add Other Maintenance</button><section class="inner-card guide"><h3>Guides & Tips</h3><p>Use this area for DF Grinders maintenance links, videos, and cleaning tips.</p><a href="https://dfgrinders.ca/pages/manuals-guides" target="_blank">Open Manuals & Guides</a></section></section>`}
function maintRow(m){let d=new Date(m.lastDone); d.setDate(d.getDate()+Number(m.intervalDays)); let days=Math.ceil((d-new Date())/86400000); return `<div class="maint-row click" onclick="editMaint('${m.id}')"><div class="ico">${m.group==='grinder'?icon('maint'):brewSvg('Espresso')}</div><div><b>${esc(m.name)}</b><p>${esc(m.item)}<br>${days<=0?'Due now':'Due in '+days+' days'} · ${d.toLocaleDateString()}</p></div></div>`}
function editMaint(id){let m=id?state.maintenance.find(x=>x.id===id):{id:'',group:maintTab,name:'',item:'',intervalDays:7,lastDone:today()}; modal(`<h2>${id?'Edit':'Add Other'} Maintenance</h2><label>Type</label><select id="mg"><option value="grinder" ${m.group==='grinder'?'selected':''}>Grinder</option><option value="espresso" ${m.group==='espresso'?'selected':''}>Espresso Machine</option><option value="other" ${m.group==='other'?'selected':''}>Other</option></select><label>Name</label><input id="mn" value="${esc(m.name)}"><label>Item</label><input id="mi" value="${esc(m.item)}"><label>Frequency (days)</label><input id="mf" type="number" value="${esc(m.intervalDays)}"><label>Last done</label><input id="ml" type="date" value="${esc(m.lastDone)}"><button class="btn full" onclick="saveMaint('${id||''}')">Save</button>${id?`<button class="btn secondary full" onclick="doneMaint('${id}')">Mark Done Today</button>`:''}`)}
function saveMaint(id){let m={id:id||uid(),group:$('#mg').value,name:$('#mn').value,item:$('#mi').value,intervalDays:+$('#mf').value,lastDone:$('#ml').value}; if(id)Object.assign(state.maintenance.find(x=>x.id===id),m); else state.maintenance.push(m); closeModal(); render()} function doneMaint(id){state.maintenance.find(x=>x.id===id).lastDone=today();closeModal();render()}
function editProfile(){let p=state.userProfile,g=p.grinders[0]||{}; modal(`<h2>Edit Profile</h2><label>Brew Methods</label><div class="method-grid">${brewMethods.map(x=>`<button type="button" class="tile method ${p.brew.includes(x)?'selected':''}" data-brew="${x}" onclick="this.classList.toggle('selected');let w=document.getElementById('otherBrewWrap');if(w&&this.dataset.brew==='Other')w.style.display=this.classList.contains('selected')?'block':'none'">${brewSvg(x)}<em>${x}</em></button>`).join('')}</div><div id="otherBrewWrap" style="display:${p.brew.includes('Other')?'block':'none'}"><label>Specify Brew Method</label><input id="otherBrew" value="${esc(p.otherBrew||'')}" placeholder="Siphon, Cold Brew, Clever Dripper..."></div><h3>Espresso Machine</h3><label>Manufacturer</label><input id="pmake" value="${esc(p.machine.manufacturer)}"><label>Model</label><input id="pmodel" value="${esc(p.machine.model)}"><h3>Grinder</h3><label>Model</label><select id="gmodel">${models.map(m=>`<option ${g.model===m?'selected':''}>${m}</option>`).join('')}</select><label>Burr Type</label><select id="gburr" onchange="$('#gotherWrap').style.display=this.value==='Other'?'block':'none'"><option ${g.burrType==='Red Titanium'?'selected':''}>Red Titanium</option><option ${g.burrType==='Stainless Steel'?'selected':''}>Stainless Steel</option><option ${g.burrType==='Other'?'selected':''}>Other</option></select><div id="gotherWrap" style="display:${g.burrType==='Other'?'block':'none'}"><label>Other Burr</label><input id="gother" value="${esc(g.burrOther||'')}"></div><label>Burr Profile</label><select id="gprof"><option ${g.profile==='Brew'?'selected':''}>Brew</option><option ${g.profile==='Multipurpose (espresso)'?'selected':''}>Multipurpose (espresso)</option></select><label>Roast Preference</label><div class="roast-pref"><span>Light</span><span>Dark</span></div><input id="roastpref" class="roast-slider" type="range" min="0" max="100" value="${p.flavour.roast}"><label>Flavour Preferences</label><div class="select-grid">${['Chocolate','Fruity','Floral','Sweet','Funky'].map(x=>`<button class="tile ${p.flavour.notes.includes(x)?'selected':''}" data-pref="${x}" onclick="this.classList.toggle('selected')">${x}</button>`).join('')}</div><label>Workflow</label><div class="select-grid">${['Blind shaking','WDT','RDT','Slow feed','Distributor tool','Pre-Infusion'].map(x=>`<button class="tile ${p.workflow.includes(x)?'selected':''}" data-work="${x}" onclick="this.classList.toggle('selected')">${x}</button>`).join('')}</div><div class="action-gap"><button class="btn full" onclick="saveProfile()">Save Profile</button></div>`)}
function saveProfile(){let g=state.userProfile.grinders[0]||{id:uid()}; Object.assign(g,{model:$('#gmodel').value,name:$('#gmodel').value,burrType:$('#gburr').value,burrOther:$('#gburr').value==='Other'?$('#gother').value:'',profile:$('#gprof').value}); state.userProfile={brew:$$('[data-brew].selected').map(x=>x.dataset.brew),machine:{manufacturer:$('#pmake').value,model:$('#pmodel').value},grinders:[g],flavour:{roast:+$('#roastpref').value,notes:$$('[data-pref].selected').map(x=>x.dataset.pref)},workflow:$$('[data-work].selected').map(x=>x.dataset.work),otherBrew:$('#otherBrew')?.value||''}; closeModal(); render()}
function editBrew(id){let x=state.brews.find(b=>b.id===id); if(!x)return; closeModal(); selectedMethod=x.method; view='log'; render(); setTimeout(()=>{$('#logBean').value=x.beanId; $('#grind').value=x.grind; syncRuler(+x.grind); $('#dose').value=x.dose; if(x.method==='Espresso')$('#yieldOut').value=x.yieldOut; else $('#water').value=x.water; $('#notes').value=x.notes||''; $('#rating').value=x.rating||7.5; updateRating(x.rating||7.5)},20)}
function modal(html){document.body.insertAdjacentHTML('beforeend',`<div id="modal" class="modal-bg"><div class="modal"><div class="modal-head"><span></span><button onclick="closeModal()">×</button></div>${html}</div></div>`); bind()}
function closeModal(){$('#modal')?.remove()} function filterBeans(q){q=q.toLowerCase(); let arch=beanTab==='archive'; $('#beanList').innerHTML=state.beans.filter(b=>(arch?b.status==='archived':b.status==='current')&&[b.name,b.roaster,b.origin,b.process].join(' ').toLowerCase().includes(q)).map(beanCard).join('')||'<p>No matches.</p>'}
function exportData(){let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));a.download='brew-library-backup.json';a.click()}
function toggleTimer(method='Espresso'){h(18); if(method==='Pour Over')return togglePourTimer(); if(timer.running){stopTimer(true);return} timer.running=true; timer.start=Date.now()-timer.elapsed; $('#timerCircle')?.classList.add('running'); $('#timeLabel').textContent='TAP TO STOP'; timer.int=setInterval(()=>{timer.elapsed=Date.now()-timer.start; let t=$('#timeText'); if(t)t.textContent=fmt(timer.elapsed/1000)},80)}
function togglePourTimer(){h(18); if(pourStage==='idle'){pourStage='bloom'; timer.running=true; timer.start=Date.now(); timer.elapsed=0; $('#timerCircle')?.classList.add('running'); $('#timeLabel').textContent='TAP WHEN BLOOM ENDS'; timer.int=setInterval(()=>{timer.elapsed=Date.now()-timer.start; $('#timeText').textContent=fmt(timer.elapsed/1000)},80); return} if(pourStage==='bloom'){pourBloom=timer.elapsed/1000; let b=$('#bloom'); if(b)b.value=Math.round(pourBloom); pourStage='brew'; $('#timeLabel').textContent='TAP WHEN BREW COMPLETE'; return} if(pourStage==='brew'){stopTimer(true); let mt=$('#manualTime'); if(mt)mt.value=(timer.elapsed/1000).toFixed(1); pourStage='done'; $('#timeLabel').textContent='BREW COMPLETE'}}
function resetTimer(){stopTimer(false); pourStage='idle'; pourBloom=0; if($('#timeLabel'))$('#timeLabel').textContent='TAP TO START'}
function stopTimer(keep=true){if(timer.int)clearInterval(timer.int); timer.int=null; timer.running=false; $('#timerCircle')?.classList.remove('running'); if($('#timeLabel'))$('#timeLabel').textContent='TAP TO START'; if(!keep){timer.elapsed=0;if($('#timeText'))$('#timeText').textContent='00.0'}}
function bindRuler(){let r=$('#ruler'), track=$('#track'), input=$('#grind'); if(!r||!track||!input)return; let min=0,max=100,step=.1,pxPer=2.25; track.innerHTML=''; for(let i=min;i<=max;i++){let major=i%5===0, mid=i%1===0; let m=document.createElement('div'); m.className='mark '+(major?'major':mid?'whole':''); m.style.minWidth=(pxPer*10)+'px'; if(major)m.innerHTML=`<span>${i}</span>`; track.appendChild(m)} function pos(v){track.style.transform=`translateX(${r.clientWidth/2 - (v-min)*10*pxPer}px)`} window.syncRuler=v=>{v=Math.max(min,Math.min(max,Math.round(v*10)/10)); input.value=v.toFixed(1); pos(v)}; syncRuler(+input.value||0); let dragging=false,last=0,startVal=0,lastH=0; r.onpointerdown=e=>{dragging=true;last=e.clientX;startVal=+input.value||0;r.setPointerCapture(e.pointerId)}; r.onpointermove=e=>{if(!dragging)return; let dx=e.clientX-last, v=startVal - dx/(10*pxPer); let nv=Math.max(min,Math.min(max,Math.round(v*10)/10)); if(Math.floor(nv)!==lastH){h(4);lastH=Math.floor(nv)} syncRuler(nv)}; r.onpointerup=e=>{dragging=false;h(8)} }
function bind(){bindRuler();updateRating($('#rating')?.value||7.5)}


/* ===== v14 refinements: thinner icons, more-menu brew methods, temperature, pour-over modes ===== */
function brewSvg(m){
 const paths={
  Espresso:'M5.2 6.4h13.6v1.8c0 .8-.6 1.4-1.4 1.4H6.6c-.8 0-1.4-.6-1.4-1.4V6.4z M9 9.8v2.4 M15 9.8v2.4 M8.2 15.1h7.6 M8.7 15.1c.25 1.85 1.75 3.15 3.3 3.15s3.05-1.3 3.3-3.15',
  'Pour Over':'M7.2 5.2h9.6l-2.1 6.3H9.3L7.2 5.2z M8.8 11.5h6.4 M8 17.8h8 M8.8 13.4h6.4l1.1 4.4H7.7z',
  AeroPress:'M9.2 4.2h5.6v12.4H9.2z M10.5 6.4h3 M10.5 14.4h3 M7.6 18.7h8.8 M8.6 16.6h6.8',
  'French Press':'M8.2 6.3h7.6v11.5H8.2z M9.2 4.6h5.6 M12 3.8v4.6 M7.5 19.4h9 M15.8 9.2h2.1v5.5h-2.1 M9.4 14.2c1.5.75 3.7.75 5.2 0',
  'Moka Pot':'M8.4 9.1h7.2l1.65 8.9H6.75l1.65-8.9z M9.5 9.1l.85-5h3.3l.85 5 M8.2 13.2h7.6 M17.1 12.2h1.8 M18.5 12.7v4.3',
  More:'M6.2 12h.1 M12 12h.1 M17.8 12h.1',
  Other:'M12 5v14 M5 12h14'
 };
 const d=paths[m]||paths.Other; return `<svg class="brew-icon" viewBox="0 0 24 24"><path d="${d}"/></svg>`
}
function smallIcon(n){
 const paths={
  bean:'M14.3 3.5c2.6 1 3.9 4.9 2.7 8.6-1.2 3.7-4.5 6.2-7.1 5.2-2.6-1-3.9-4.9-2.7-8.6 1.2-3.7 4.5-6.2 7.1-5.2z M8.4 17.3c2.35-2.25 3.95-4.85 4.95-7.7.58-1.8.92-3.58 1-5.3',
  water:'M12 4.3s4.5 5.2 4.5 8.6a4.5 4.5 0 0 1-9 0C7.5 9.5 12 4.3 12 4.3z',
  time:'M12 7.1v4.8l2.8 1.8 M9.5 2.8h5 M12 4.4a7.6 7.6 0 1 0 0 15.2 7.6 7.6 0 0 0 0-15.2z',
  temp:'M10 5a2 2 0 0 1 4 0v7.2a4 4 0 1 1-4 0V5z M12 14.2v-6.1',
  ratio:'M7 8h7a3 3 0 1 1-2.4 4.8 M17 16h-7a3 3 0 1 1 2.4-4.8'
 };
 return `<svg viewBox="0 0 24 24"><path d="${paths[n]||paths.bean}"/></svg>`
}
function equipSvg(kind){
 const grinder='M10 3.7h4 M9.1 5h5.8v2.1l-.95.95h-3.9L9.1 7.1V5z M9.5 8.4h5 M8.8 9.4l1.25 9.3h5.8l-1.25-9.3 M8.9 19.6h7.9 M9.7 12.1l3 1.15-1.75 3.35-2.7-1.15 M15.2 13.6h1.8v3.25h-1.8 M8.3 18.1H6.4a1.85 1.85 0 0 1 0-3.7h1.25';
 const machine='M6 7.2h12v9.6H6z M8 5.5h8 M8.2 9.2h2 M12 9.2h2 M16.1 9.2h1 M8.7 12.1h3.3 M10.3 12.1v3.85 M12.4 12.1h3.4v2.5l-1.1 1.1 M17.2 12h2.1v3h-2.1 M7.2 18.8h10.6 M8.1 16.8h7.8';
 const d=kind==='grinder'?grinder:machine; return `<svg class="equip-icon" viewBox="0 0 24 24"><path d="${d}"/></svg>`
}
function methodSelector(sel, context='bean', beanId=''){
 const primary=['Espresso','Pour Over','AeroPress'];
 const buttons=primary.map(m=>`<button class="${sel===m?'sel':''}" onclick="selectBrewMethod('${m}','${context}','${beanId}')">${brewSvg(m)}<small>${m}</small></button>`).join('');
 const moreSel=!primary.includes(sel);
 return `<div class="brew-tabs">${buttons}<button class="${moreSel?'sel':''}" onclick="showMoreMethods('${context}','${beanId}')">${brewSvg('More')}<small>${moreSel?esc(sel):'More'}</small></button></div>`
}
function selectBrewMethod(m,context='bean',beanId=''){selectedMethod=m; if(context==='bean')openBeanDetail(beanId,false); else render()}
function showMoreMethods(context='bean',beanId=''){
 const extras=['French Press','Moka Pot','Other'];
 modal(`<h2>Select Brew Method</h2><div class="method-grid more-methods">${extras.map(m=>`<button class="tile method" onclick="selectBrewMethod('${m}','${context}','${beanId}');closeModal()">${brewSvg(m)}<em>${m}</em></button>`).join('')}</div>`)
}
function methodTabs(b,sel){return methodSelector(sel,'bean',b.id)}
function scoreColor(v){v=+v||0; if(v<5)return '#c97870'; if(v<7.5)return '#d8b460'; return '#88cf73'}
function tempVal(p,m){return p?.temp ?? (m==='Espresso'?93:96)}
function profilePanel(b,m,p,g){
 if(!p)return `<section class="profile-main"><h3>${m} — No Profile</h3><button class="btn full" onclick="profileForm('${b.id}','${m}')">Create ${m} Profile</button></section>`;
 let isEsp=m==='Espresso', score=+(p.score||0), c=scoreColor(score), t=tempVal(p,m);
 const middle=isEsp?`<p>${smallIcon('bean')} <b>${p.dose} g</b> Dose</p><p>${smallIcon('bean')} <b>${p.yieldOut} g</b> Yield</p><p>${smallIcon('time')} <b>${p.time} sec</b> Time</p><p>${smallIcon('temp')} <b>${t}°</b> Temp</p><p>${smallIcon('ratio')} <b>${p.ratio||ratio(p)}</b> Ratio</p>`:`<p>${smallIcon('bean')} <b>${p.dose} g</b> Coffee</p><p>${smallIcon('water')} <b>${p.water} g</b> Water</p><p>${smallIcon('temp')} <b>${t}°</b> Temp</p><p>${smallIcon('time')} <b>${fmt(p.totalTime)}</b> Total Time</p>${m==='Pour Over'?`<p>${smallIcon('time')} <b>${p.bloom||0} sec</b> Bloom</p>`:''}`;
 return `<section class="profile-main"><div class="profile-title"><h3>${m} — Current Profile</h3><span>Dialed In</span></div><div class="profile-grid"><div class="gauge grind"><b>${p.grind??'—'}</b><small>Grind Setting</small><em>${esc(g.name||g.model||'—')}</em></div><div class="recipe-list">${middle}</div><div class="score-ring" style="--scoreColor:${c}"><b>${score||'—'}</b><small>Taste Score</small></div></div><button class="btn full" onclick="brewUsingProfile('${b.id}','${m}','${p.id}')">Brew Using This Profile</button></section>`
}
function openBeanDetail(id,modalOpen=true){
 let b=bean(id); if(!b)return; if(!b.brewProfiles)b.brewProfiles={}; if(!b.brewProfiles[selectedMethod])selectedMethod=Object.keys(b.brewProfiles)[0]||'Espresso';
 let p=activeProfile(b,selectedMethod), g=grinder(p?.grinderId||b.grinderId), recent=brewsFor(b.id,selectedMethod).slice(0,3);
 let html=`<button class="back" onclick="closeModal()">${icon('back')}</button><button class="edit-icon modal-edit" onclick="openBeanForm('${b.id}')">${icon('pencil')}</button><div class="bean-hero"><button class="bag large ${b.photo?'has-photo':''}" onclick="pickPhoto('${b.id}')">${b.photo?`<img src="${b.photo}">`:'DF'}<em>${icon('camera')}</em></button><div><h1>${esc(b.name)}</h1><p>${esc([b.process,b.origin].filter(Boolean).join(' • '))}</p><span class="pill green">${b.status==='current'?'Current Bean':'Archived'}</span></div></div><h3>Brew Profiles</h3>${methodTabs(b,selectedMethod)}${profilePanel(b,selectedMethod,p,g)}<section class="inner-card"><h3>Equipment</h3><div class="equipment"><div>${equipSvg('grinder')}<b>${esc(g.name||g.model||'—')}</b><small>${esc([g.burrType==='Other'?g.burrOther:g.burrType,g.profile].filter(Boolean).join(' • '))}</small></div><div>${equipSvg('machine')}<b>${esc([state.userProfile.machine.manufacturer,state.userProfile.machine.model].filter(Boolean).join(' ')||'Machine not set')}</b><small>Espresso Machine</small></div></div></section><section class="inner-card"><h3>Last 3 Brews <button onclick="showBeanHistory('${b.id}','${selectedMethod}')">View All (20)</button></h3><div class="mini-brews">${recent.map(x=>`<button onclick="brewDetail('${x.id}')"><small>${dateShort(x.createdAt)}</small><b>${x.rating||'—'}</b><span>${fmt(x.time||x.totalTime)}s</span></button>`).join('')||'<p>No brews yet.</p>'}</div></section><section class="inner-card"><h3>Saved Profiles (${selectedMethod}) <button onclick="manageProfiles('${b.id}','${selectedMethod}')">Manage</button></h3><div class="saved-profiles">${(b.brewProfiles[selectedMethod]||[]).map(pr=>`<button class="${pr.active?'sel':''}" onclick="profileDetail('${b.id}','${selectedMethod}','${pr.id}')"><b>${esc(pr.name)}</b><small>${dateShort(pr.createdAt)} · ${pr.score||'—'} Score</small></button>`).join('')}<button class="add" onclick="profileForm('${b.id}','${selectedMethod}')">+<small>Add New</small></button></div></section>`;
 if(modalOpen) modal(html); else {$('.modal').innerHTML=`<div class="modal-head"><span></span><button onclick="closeModal()">×</button></div>${html}`; bind();}
}
function logView(pref={}){
 let b=bean(pref.beanId)||currentBean(); let m=pref.method||selectedMethod||'Espresso'; let p=pref.profileId?activeProfile(b,m):activeProfile(b,m); let temp=tempVal(p,m);
 const isEsp=m==='Espresso', isPour=m==='Pour Over';
 const pourControls=isPour?`<div class="seg"><button class="sel" id="manualModeBtn" onclick="setPourMode('manual')">Manual Brew</button><button id="guidedModeBtn" onclick="setPourMode('guided')">Follow Recipe</button></div><div id="manualPour"><div class="metric-grid"><label>Bloom Timer<input id="bloom" type="number" value="${p?.bloom||45}"></label><label>Total Brew Timer<input id="manualTime" type="number" step="0.1" placeholder="optional" value="${p?.totalTime||''}"></label></div></div><div id="guidedPour" style="display:none"><label>Recipe Stages</label><div id="pourStages">${renderPourStages(p?.stages||[{name:'Bloom',time:45,weight:60},{name:'Pour 1',time:75,weight:160},{name:'Pour 2',time:115,weight:240},{name:'Final Pour',time:155,weight:320}])}</div><button class="btn secondary" onclick="addPourStage()" type="button">Add Pour</button></div>`:'';
 return `<section class="card"><h2>Log Brew</h2><div class="seg"><button class="sel">Existing Bean</button><button onclick="openBeanForm()">New Bean</button></div><label>Bean</label><select id="logBean" onchange="state.currentBeanId=this.value;render()">${state.beans.filter(x=>x.status==='current').map(x=>`<option value="${x.id}" ${x.id===b?.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select><label>Brew Method</label>${methodSelector(m,'log','')}${settingBlock(p?.grind||lastBrew(b?.id,m)?.grind||18.6)}<div class="metric-grid"><label>Dose<input id="dose" type="number" step="0.1" value="${p?.dose||18}"></label>${isEsp?`<label>Yield<input id="yieldOut" type="number" step="0.1" value="${p?.yieldOut||36}"></label>`:`<label>Water<input id="water" type="number" step="1" value="${p?.water||320}"></label>`}</div><label>Temperature</label><input id="temp" type="number" step="1" value="${temp}">${pourControls}${timerBlock(m)}${ratingBlock(7.5)}<label>Flavour Description</label><div class="select-grid">${['Chocolate','Fruity','Floral','Sweet','Funky'].map(x=>`<button type="button" class="tile small" data-flav="${x}" onclick="this.classList.toggle('selected')">${x}</button>`).join('')}</div><label>Flavour Notes</label><textarea id="notes" placeholder="Sweet, clean, slightly fast..."></textarea><button class="btn full" onclick="saveBrew('${b?.id||''}','${m}')">Save Brew</button><button class="btn secondary full" onclick="saveDialedProfile('${b?.id||''}','${m}')">Save Dialed-In Profile</button></section>`
}
function renderPourStages(stages){return stages.map((s,i)=>`<div class="stage-row"><input class="stage-name" value="${esc(s.name)}"><input class="stage-time" type="number" value="${s.time}"><input class="stage-weight" type="number" value="${s.weight}"><button onclick="this.closest('.stage-row').remove()">×</button></div>`).join('')}
function addPourStage(){let w=$('#pourStages'); let n=$$('.stage-row',w).length; w.insertAdjacentHTML('beforeend',renderPourStages([{name:'Pour '+n,time:(n+1)*45,weight:(n+1)*80}]))}
function setPourMode(mode){let guided=mode==='guided'; $('#manualPour').style.display=guided?'none':'block'; $('#guidedPour').style.display=guided?'block':'none'; $('#manualModeBtn').classList.toggle('sel',!guided); $('#guidedModeBtn').classList.toggle('sel',guided)}
function collectStages(){return $$('.stage-row').map(r=>({name:$('.stage-name',r).value,time:+$('.stage-time',r).value,weight:+$('.stage-weight',r).value}))}
function saveBrew(beanId,method){let elapsed=timer.elapsed/1000 || +($('#manualTime')?.value||0); let data={id:uid(),beanId:beanId||$('#logBean').value,method,grinderId:state.userProfile.grinders[0]?.id,grind:+$('#grind').value,dose:+$('#dose').value,temp:+($('#temp')?.value||0),rating:+$('#rating').value,flavours:$$('[data-flav].selected').map(x=>x.dataset.flav),notes:$('#notes').value,createdAt:iso()}; if(method==='Espresso')Object.assign(data,{yieldOut:+$('#yieldOut').value,time:elapsed||0}); else Object.assign(data,{water:+$('#water').value,totalTime:elapsed||0,bloom:+($('#bloom')?.value||pourBloom||0),stages:collectStages()}); state.brews.unshift(data); state.currentBeanId=data.beanId; stopTimer(false); toast('Brew saved'); go('home')}
function saveDialedProfile(beanId,method){let b=bean(beanId||$('#logBean').value); if(!b)return; let name=prompt('Profile name', 'Current')||'Current'; let arr=b.brewProfiles[method]=b.brewProfiles[method]||[]; if(name.toLowerCase()==='current')arr.forEach(p=>p.active=false); let p={id:uid(),name,active:name.toLowerCase()==='current',createdAt:iso(),score:+($('#rating')?.value||0),grinderId:state.userProfile.grinders[0]?.id,grind:+$('#grind').value,dose:+$('#dose').value,temp:+($('#temp')?.value||0),notes:$('#notes')?.value||''}; if(method==='Espresso')Object.assign(p,{yieldOut:+$('#yieldOut').value,time:timer.elapsed/1000||0,ratio:ratio({dose:+$('#dose').value,yieldOut:+$('#yieldOut').value})}); else Object.assign(p,{water:+$('#water').value,totalTime:timer.elapsed/1000||0,bloom:+($('#bloom')?.value||pourBloom||0),stages:collectStages()}); arr.push(p); toast('Dialed-in profile saved'); render()}
function profileForm(beanId,m,pid){let b=bean(beanId), p=pid?(b.brewProfiles[m]||[]).find(x=>x.id===pid):{}; modal(`<h2>${pid?'Edit':'New'} ${m} Profile</h2>${settingBlock(p.grind||18)}<label>Name</label><input id="pname" value="${esc(p.name||'Current')}"><div class="metric-grid"><label>Dose<input id="pdose" type="number" value="${p.dose||18}"></label><label>${m==='Espresso'?'Yield':'Water'}<input id="pout" type="number" value="${p.yieldOut||p.water||36}"></label></div><label>Temperature</label><input id="ptemp" type="number" value="${tempVal(p,m)}"><label>Time</label><input id="ptime" type="number" step="0.1" value="${p.time||p.totalTime||0}">${m==='Pour Over'?`<label>Pour Stages</label><div id="pourStages">${renderPourStages(p.stages||[{name:'Bloom',time:45,weight:60},{name:'Pour 1',time:75,weight:160},{name:'Pour 2',time:115,weight:240},{name:'Final Pour',time:155,weight:320}])}</div><button class="btn secondary" onclick="addPourStage()" type="button">Add Pour</button>`:''}${ratingBlock(p.score||7.5)}<label>Notes</label><textarea id="pnotes">${esc(p.notes||'')}</textarea><button class="btn full" onclick="saveRecipeProfile('${beanId}','${m}','${pid||''}')">Save Profile</button>`);bindRuler();updateRating(p.score||7.5)}
function saveRecipeProfile(beanId,m,pid){let b=bean(beanId), arr=b.brewProfiles[m]=b.brewProfiles[m]||[], old=arr.find(x=>x.id===pid), name=$('#pname').value||'Current'; let p={id:pid||uid(),name,active:name.toLowerCase()==='current',createdAt:old?.createdAt||iso(),score:+$('#rating').value,grinderId:state.userProfile.grinders[0]?.id,grind:+$('#grind').value,dose:+$('#pdose').value,temp:+($('#ptemp')?.value||0),notes:$('#pnotes').value}; if(p.active)arr.forEach(x=>x.active=false); if(m==='Espresso')Object.assign(p,{yieldOut:+$('#pout').value,time:+$('#ptime').value,ratio:ratio({dose:p.dose,yieldOut:+$('#pout').value})}); else Object.assign(p,{water:+$('#pout').value,totalTime:+$('#ptime').value,stages:collectStages()}); if(old)Object.assign(old,p); else arr.push(p); closeModal(); openBeanDetail(beanId)}
function profileDetail(beanId,m,pid){let b=bean(beanId), p=(b.brewProfiles[m]||[]).find(x=>x.id===pid); modal(`<button class="edit-icon modal-edit" onclick="profileForm('${beanId}','${m}','${pid}')">${icon('pencil')}</button><h2>${esc(p.name)}</h2><div class="hero-detail"><b>${p.score||'—'}</b><span>Taste Score</span></div><div class="detail"><div><span>Method</span>${m}</div><div><span>Grind</span>${p.grind}</div><div><span>Dose</span>${p.dose}g</div><div><span>Output</span>${p.yieldOut||p.water||'—'}g</div><div><span>Temperature</span>${tempVal(p,m)}°</div><div><span>Time</span>${fmt(p.time||p.totalTime)}s</div><div><span>Notes</span>${esc(p.notes||'—')}</div></div><button class="btn full" onclick="brewUsingProfile('${beanId}','${m}','${pid}')">Brew Using This Profile</button>`)}
function brewUsingProfile(beanId,method,pid){closeModal(); selectedMethod=method; view='log'; setTimeout(()=>{render(); let p=(bean(beanId).brewProfiles[method]||[]).find(x=>x.id===pid); if(p){$('#logBean').value=beanId; $('#grind').value=(+p.grind).toFixed(1); syncRuler(+p.grind); $('#dose').value=p.dose||''; if(method==='Espresso')$('#yieldOut').value=p.yieldOut||''; else $('#water').value=p.water||''; if($('#temp'))$('#temp').value=tempVal(p,method);}},0)}
function togglePourTimer(){h(18); if(pourStage==='idle'){pourStage='bloom'; timer.running=true; timer.start=Date.now(); timer.elapsed=0; $('#timerCircle')?.classList.add('running'); $('#timeLabel').textContent='TAP WHEN BLOOM ENDS'; timer.int=setInterval(()=>{timer.elapsed=Date.now()-timer.start; $('#timeText').textContent=fmt(timer.elapsed/1000)},80); return} if(pourStage==='bloom'){pourBloom=timer.elapsed/1000; let b=$('#bloom'); if(b)b.value=Math.round(pourBloom); pourStage='pour1'; $('#timeLabel').textContent='TAP FOR NEXT POUR'; return} if(pourStage.startsWith('pour')){let n=+(pourStage.replace('pour','')||1); pourStage='pour'+(n+1); $('#timeLabel').textContent='DOUBLE TAP TO STOP'; return}}
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');

/* v14 safety overrides */
function closeModal(){document.querySelectorAll('#modal,.modal-bg').forEach(m=>m.remove())}
function selectBrewMethod(m,context='bean',beanId=''){
 selectedMethod=m;
 if(context==='bean') { closeModal(); openBeanDetail(beanId,true); }
 else { closeModal(); render(); }
}
function showMoreMethods(context='bean',beanId=''){
 const extras=['French Press','Moka Pot','Other'];
 modal(`<h2>Select Brew Method</h2><div class="method-grid more-methods">${extras.map(m=>`<button class="tile method" onclick="selectBrewMethod('${m}','${context}','${beanId}')">${brewSvg(m)}<em>${m}</em></button>`).join('')}</div>`)
}
function timerBlock(m='Espresso'){
 let label=m==='Pour Over'?'TAP TO START BLOOM':'TAP TO START';
 return `<div class="timer" id="timerCircle" onclick="toggleTimer('${m}')" ondblclick="stopTimer(true);pourStage='done';let mt=document.getElementById('manualTime');if(mt)mt.value=(timer.elapsed/1000).toFixed(1);let tl=document.getElementById('timeLabel');if(tl)tl.textContent='BREW COMPLETE'"><div class="timer-inner"><div><div class="timer-time" id="timeText">00.0</div><div class="timer-label" id="timeLabel">${label}</div></div></div></div><button class="reset-timer" onclick="event.stopPropagation();resetTimer()">↺ Reset</button>`
}

/* v15 community recipe library and backend sync foundation */
function navRecipeIcon(){return `<svg viewBox="0 0 24 24"><path d="M5 5.5h10.5a2.5 2.5 0 0 1 2.5 2.5v11H7.5A2.5 2.5 0 0 1 5 16.5v-11z M8 8.5h7 M8 12h7 M8 15.5h4 M18 8h1.5a1.5 1.5 0 0 1 1.5 1.5V19"/></svg>`}
function nav(){return `<nav class="nav"><button class="${view==='home'?'active':''}" onclick="go('home')">${icon('home')}</button><button class="${view==='beans'?'active':''}" onclick="go('beans')">${icon('beans')}</button><button class="plus" onclick="go('log')">+</button><button class="${view==='recipes'?'active':''}" onclick="go('recipes')">${navRecipeIcon()}</button><button class="${view==='more'||view==='maintenance'?'active':''}" onclick="go('more')">${icon('more')}</button></nav>`}
function defaultCommunityUser(){return {id:'local-'+uid(),displayName:'Home Barista',handle:'home-barista',email:'',bio:'Building a recipe collection with Brew Library',location:{city:'',region:'',country:''},equipment:{machine:'',grinders:[]}}}
function demoCommunityRecipes(){return [
 {id:'demo-luna-espresso',ownerId:'demo-ana',ownerName:'Ana Park',ownerHandle:'ana-brews',method:'Espresso',title:'Sweet washed Ethiopia flat 9 bar',visibility:'public',beanName:'Ethiopia Chelbesa',roaster:'Konga',origin:'Ethiopia',process:'Washed',roastLevel:'Light',params:{grind:17.4,dose:18,yieldOut:40,time:31,temp:93,ratio:'1:2.2'},tags:['Fruity','Floral','Sweet','Light'],score:8.9,notes:'Longer ratio keeps the florals open without turning thin.',saves:18,createdAt:'2026-05-20T12:00:00.000Z',updatedAt:'2026-05-20T12:00:00.000Z'},
 {id:'demo-matteo-pourover',ownerId:'demo-matteo',ownerName:'Matteo Silva',ownerHandle:'matteo-cups',method:'Pour Over',title:'Chocolate-forward Brazil V60',visibility:'public',beanName:'Brazil Sitio Bonilha',roaster:'Archive Coffee',origin:'Brazil',process:'Natural',roastLevel:'Medium',params:{grind:43,dose:20,water:320,totalTime:205,bloom:45,temp:96,stages:[{name:'Bloom',time:45,weight:60},{name:'Pour 1',time:85,weight:160},{name:'Pour 2',time:135,weight:240},{name:'Final',time:175,weight:320}]},tags:['Chocolate','Sweet','Medium'],score:8.6,notes:'Slow final drawdown brings out body and sweetness.',saves:11,createdAt:'2026-05-22T12:00:00.000Z',updatedAt:'2026-05-22T12:00:00.000Z'},
 {id:'demo-nia-aeropress',ownerId:'demo-nia',ownerName:'Nia Chen',ownerHandle:'nia-recipes',method:'AeroPress',title:'Funky anaerobic inverted cup',visibility:'public',beanName:'Colombia El Paraiso',roaster:'Pilot',origin:'Colombia',process:'Anaerobic',roastLevel:'Light',params:{grind:36,dose:16,water:240,totalTime:150,temp:90},tags:['Fruity','Funky','Sweet','Light'],score:8.4,notes:'Lower temp reins in ferment while keeping tropical fruit.',saves:7,createdAt:'2026-05-24T12:00:00.000Z',updatedAt:'2026-05-24T12:00:00.000Z'}
]}
function ensureCommunity(o){
 o=o||{}; let c=o.community||{};
 c.user={...defaultCommunityUser(),...(c.user||{})};
 c.user.handle=(c.user.handle||c.user.displayName||'home-barista').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'home-barista';
 if(!Array.isArray(c.recipes))c.recipes=[];
 if(!Array.isArray(c.savedRecipeIds))c.savedRecipeIds=['demo-luna-espresso'];
 if(!Array.isArray(c.follows))c.follows=['demo-ana'];
 if(!Array.isArray(c.ratings))c.ratings=[];
 if(!Array.isArray(c.events))c.events=[];
 c.session={signedIn:false,provider:'local',providerUserId:'',sessionId:'',email:'',...(c.session||{})};
 c.sync={apiBase:'',enabled:false,lastSyncAt:'',lastError:'',...(c.sync||{})};
 c.user.location={city:'',region:'',country:'',...(c.user.location||{})};
 c.user.equipment=profileEquipment(o);
 o.community=c;
 const existing=new Map(c.recipes.map(r=>[r.id,r]));
 const profileRecipes=recipesFromProfiles(o,c).map(r=>{
  const old=existing.get(r.id)||{};
  return {...old,...r,visibility:old.visibility||r.visibility,saves:old.saves??r.saves,createdAt:old.createdAt||r.createdAt,updatedAt:old.updatedAt||r.updatedAt}
 });
 const profileIds=new Set(profileRecipes.map(r=>r.id));
 const demos=demoCommunityRecipes().map(r=>({...r,...(existing.get(r.id)||{})}));
 const demoIds=new Set(demos.map(r=>r.id));
 const remaining=c.recipes.filter(r=>!profileIds.has(r.id)&&!demoIds.has(r.id));
 c.recipes=[...profileRecipes,...remaining,...demos];
 return o;
}
function recipesFromProfiles(o,c){let out=[]; (o.beans||[]).forEach(b=>Object.entries(b.brewProfiles||{}).forEach(([m,arr])=>(arr||[]).forEach(p=>out.push(profileToRecipe(b,m,p,c))))); return out}
function profileRecipeId(b,m,p){return ['profile',b.id,m,p.id].join('-').replace(/[^a-zA-Z0-9_-]/g,'-')}
function profileToRecipe(b,m,p,c){
 const isEsp=m==='Espresso', params={grind:p.grind,dose:p.dose,temp:tempVal(p,m)};
 if(isEsp)Object.assign(params,{yieldOut:p.yieldOut,time:p.time,ratio:p.ratio||ratio(p)}); else Object.assign(params,{water:p.water,totalTime:p.totalTime,bloom:p.bloom,stages:p.stages||[]});
 const tags=recipeTags(b,p,m);
 return {id:profileRecipeId(b,m,p),ownerId:c.user.id,ownerName:c.user.displayName,ownerHandle:c.user.handle,method:m,title:p.name&&p.name!=='Current'?p.name:`${b.name} ${m}`,visibility:'private',sourceBeanId:b.id,sourceProfileId:p.id,beanName:b.name,roaster:b.roaster,origin:b.origin,process:b.process,roastLevel:b.roastLevel,params,tags,score:+(p.score||0),notes:p.notes||'',saves:0,createdAt:p.createdAt||iso(),updatedAt:p.updatedAt||p.createdAt||iso()}
}
function recipeTags(b,p,m){let text=[b.name,b.roaster,b.origin,b.process,b.roastLevel,p.notes,m].join(' ').toLowerCase(); let tags=[m,b.roastLevel].filter(Boolean); flavourTags.forEach(t=>{if(text.includes(t.toLowerCase()))tags.push(t)}); return [...new Set(tags)]}
function recipeById(id){ensureCommunity(state); return state.community.recipes.find(r=>r.id===id)}
function apiBase(){return (state.community?.sync?.apiBase||'').trim().replace(/\/+$/,'')}
function profileEquipment(sourceState=state){
 const p=sourceState?.userProfile||{}, machine=p.machine||{}, grinders=p.grinders||[];
 return {
  machine:[machine.manufacturer,machine.model].filter(Boolean).join(' '),
  grinders:grinders.map(g=>({id:g.id,model:g.model,name:g.name,burrType:g.burrType,burrOther:g.burrOther,profile:g.profile}))
 };
}
function publicUser(){
 ensureCommunity(state);
 const c=state.community;
 return {...c.user,equipment:profileEquipment(), signedIn:c.session.signedIn, authProvider:c.session.provider};
}
function userFollowObjects(){ensureCommunity(state); return state.community.follows.map(followeeId=>({followerId:state.community.user.id,followeeId}))}
function communityRating(recipeId){ensureCommunity(state); let arr=state.community.ratings.filter(r=>r.recipeId===recipeId); if(!arr.length)return {avg:0,count:0,mine:null}; let mine=arr.find(r=>r.userId===state.community.user.id); return {avg:Math.round((arr.reduce((s,r)=>s+(+r.rating||0),0)/arr.length)*10)/10,count:arr.length,mine}}
function recipeDisplayRating(r){let local=communityRating(r.id); return {avg:local.count?local.avg:(r.communityRating||0),count:local.count||r.ratingCount||0,mine:local.mine}}
async function postJson(path,body){
 const base=apiBase(); if(!base||!state.community.sync.enabled)return null;
 const res=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(!res.ok)throw new Error('Backend request failed');
 return res.json();
}
function trackEvent(type,payload={}){
 ensureCommunity(state);
 const event={id:uid(),type,payload,userId:state.community.user.id,createdAt:iso()};
 state.community.events.unshift(event);
 state.community.events=state.community.events.slice(0,200);
 save();
 sendEvent(event);
}
async function sendEvent(event){
 const base=apiBase(); if(!base||!state.community.sync.enabled)return;
 try{await fetch(base+'/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(event)})}catch(e){state.community.sync.lastError='Event sync failed'; save()}
}
async function syncCommunity(silent=false){
 ensureCommunity(state);
 const base=apiBase();
 if(!base){toast('Add a backend URL in More');return}
 const mine=state.community.recipes.filter(r=>r.ownerId===state.community.user.id&&r.visibility==='public');
 try{
  await fetch(base+'/api/recipes/bulk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user:publicUser(),recipes:mine,follows:userFollowObjects(),ratings:state.community.ratings})});
  const res=await fetch(base+'/api/recipes');
  if(!res.ok)throw new Error('Recipe sync failed');
  const remote=await res.json();
  const merged=new Map(state.community.recipes.map(r=>[r.id,r]));
  (remote.recipes||[]).forEach(r=>{if(r.ownerId!==state.community.user.id)merged.set(r.id,r)});
  state.community.recipes=[...merged.values()];
  const ratingsRes=await fetch(base+'/api/ratings').catch(()=>null);
  if(ratingsRes?.ok){
   const data=await ratingsRes.json();
   const ratings=new Map(state.community.ratings.map(r=>[r.id||`${r.recipeId}:${r.userId}`,r]));
   (data.ratings||[]).forEach(r=>ratings.set(r.id||`${r.recipeId}:${r.userId}`,r));
   state.community.ratings=[...ratings.values()];
  }
  state.community.sync.lastSyncAt=iso();
  state.community.sync.lastError='';
  save();
  if(!silent){render(); toast('Recipe library synced')}
 }catch(e){
  state.community.sync.lastError=e.message||'Sync failed';
  save();
  if(!silent)toast(state.community.sync.lastError);
 }
}
function recipesView(){
 ensureCommunity(state);
 const c=state.community, count=recipeResults().length;
 return `<section class="card recipes-head"><h2>Recipes</h2><p>Build your library from dialed-in profiles, save recipes from other users, and rank discovery by your roast and taste preferences.</p><div class="tabs recipe-tabs"><button class="${recipeTab==='library'?'sel':''}" onclick="recipeTab='library';render()">My Library</button><button class="${recipeTab==='discover'?'sel':''}" onclick="recipeTab='discover';render()">Discover</button><button class="${recipeTab==='following'?'sel':''}" onclick="recipeTab='following';render()">Following</button></div><input id="recipeSearch" placeholder="Search recipes, users, beans, or flavors" value="${esc(recipeQuery)}" oninput="recipeQuery=this.value;drawRecipeList()"><div class="filter-row"><select onchange="recipeMethod=this.value;render()"><option ${recipeMethod==='All'?'selected':''}>All</option>${brewMethods.map(m=>`<option ${recipeMethod===m?'selected':''}>${m}</option>`).join('')}</select><select onchange="recipeRoast=this.value;render()"><option ${recipeRoast==='All'?'selected':''}>All</option>${['Light','Medium','Dark'].map(r=>`<option ${recipeRoast===r?'selected':''}>${r}</option>`).join('')}</select></div><button class="btn secondary full ${recipeMatchPrefs?'selected-filter':''}" onclick="recipeMatchPrefs=!recipeMatchPrefs;render()">Taste match ${recipeMatchPrefs?'on':'off'}</button><button class="btn full" onclick="openRecipeForm()">Create Standalone Recipe</button><div class="muted count-line"><span id="recipeCount">${count}</span> recipes shown · @${esc(c.user.handle)}</div></section><section class="card recipe-list-card"><div id="recipeList">${recipeResults().map(recipeCard).join('')||'<p>No matching recipes yet.</p>'}</div></section>`
}
function recipeResults(){
 ensureCommunity(state);
 const c=state.community, q=recipeQuery.trim().toLowerCase();
 let list=c.recipes.filter(r=>{
  const mine=r.ownerId===c.user.id, saved=c.savedRecipeIds.includes(r.id), following=c.follows.includes(r.ownerId);
  if(recipeTab==='library'&&!(mine||saved))return false;
  if(recipeTab==='discover'&&(mine||r.visibility!=='public'))return false;
  if(recipeTab==='following'&&!(following&&r.visibility==='public'))return false;
  if(recipeMethod!=='All'&&r.method!==recipeMethod)return false;
  if(recipeRoast!=='All'&&r.roastLevel!==recipeRoast)return false;
  if(q&&!recipeSearchText(r).includes(q))return false;
  return true;
 });
 if(recipeMatchPrefs)list.sort((a,b)=>recipeMatchScore(b)-recipeMatchScore(a)||new Date(b.updatedAt)-new Date(a.updatedAt));
 else list.sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
 return list;
}
function recipeSearchText(r){return [r.title,r.ownerName,r.ownerHandle,r.method,r.beanName,r.roaster,r.origin,r.process,r.roastLevel,(r.tags||[]).join(' '),r.notes].join(' ').toLowerCase()}
function preferredRoast(){let v=state.userProfile?.flavour?.roast??50; return v>65?'Light':v<35?'Dark':'Medium'}
function recipeMatchScore(r){
 const prefs=state.userProfile?.flavour?.notes||[], tags=r.tags||[];
 let score=+(r.score||0);
 prefs.forEach(p=>{if(tags.includes(p))score+=2});
 if(r.roastLevel===preferredRoast())score+=2.5;
 if(state.community.follows.includes(r.ownerId))score+=1;
 if(state.community.savedRecipeIds.includes(r.id))score+=1;
 return score;
}
function drawRecipeList(){let el=$('#recipeList'); if(!el)return; let list=recipeResults(); el.innerHTML=list.map(recipeCard).join('')||'<p>No matching recipes yet.</p>'; let count=$('#recipeCount'); if(count)count.textContent=list.length}
function recipeParamLine(r){let p=r.params||{}; if(r.method==='Espresso')return `${p.dose||'—'}g in · ${p.yieldOut||'—'}g out · ${fmt(p.time||0)}s · ${p.temp||'—'}°`; return `${p.dose||'—'}g coffee · ${p.water||'—'}g water · ${fmt(p.totalTime||0)} · ${p.temp||'—'}°`}
function recipeCard(r){
 const c=state.community, mine=r.ownerId===c.user.id, saved=c.savedRecipeIds.includes(r.id), following=c.follows.includes(r.ownerId);
 const community=recipeDisplayRating(r);
 return `<article class="recipe-card click" onclick="recipeDetail('${r.id}')"><div class="recipe-top"><span class="pill">${esc(r.method)}</span><span class="match">${Math.round(recipeMatchScore(r)*10)/10} match</span></div><h3>${esc(r.title)}</h3><p>${esc([r.beanName,r.roaster,r.origin].filter(Boolean).join(' · '))}</p><div class="recipe-meta"><b>${r.score||'—'}</b><span>${esc(recipeParamLine(r))}</span></div><div class="recipe-rating-row"><span>Community ${community.count?community.avg:'—'} (${community.count})</span>${community.mine?`<span>Your rating ${community.mine.rating}</span>`:''}</div><div class="tag-row">${(r.tags||[]).slice(0,5).map(t=>`<span>${esc(t)}</span>`).join('')}</div><div class="recipe-owner"><span>@${esc(r.ownerHandle||'user')}</span><div>${mine?`<button onclick="event.stopPropagation();publishRecipe('${r.id}')">${r.visibility==='public'?'Update Public':'Publish'}</button>`:`<button onclick="event.stopPropagation();saveCommunityRecipe('${r.id}')">${saved?'Saved':'Save'}</button><button onclick="event.stopPropagation();toggleFollow('${r.ownerId}')">${following?'Following':'Follow'}</button><button onclick="event.stopPropagation();openRatingForm('${r.id}')">Rate</button>`}</div></div></article>`
}
function saveCommunityRecipe(id){ensureCommunity(state); if(!state.community.savedRecipeIds.includes(id))state.community.savedRecipeIds.push(id); trackEvent('recipe.saved',{recipeId:id}); save(); render(); toast('Recipe saved to library')}
function publishRecipe(id){let r=recipeById(id); if(!r)return; r.visibility='public'; r.ownerName=state.community.user.displayName; r.ownerHandle=state.community.user.handle; r.updatedAt=iso(); trackEvent('recipe.published',{recipeId:id}); save(); syncCommunity(true); render(); toast('Recipe published')}
async function toggleFollow(userId){ensureCommunity(state); if(userId===state.community.user.id){toast('This is your profile');return} let f=state.community.follows, i=f.indexOf(userId), following=i<0; if(i>=0)f.splice(i,1); else f.push(userId); trackEvent(following?'user.followed':'user.unfollowed',{userId}); save(); render(); try{await postJson(following?'/api/follows':'/api/unfollow',{followerId:state.community.user.id,followeeId:userId})}catch(e){state.community.sync.lastError='Follow sync failed';save()}}
function recipeDetail(id){
 const r=recipeById(id); if(!r)return;
 const mine=r.ownerId===state.community.user.id, saved=state.community.savedRecipeIds.includes(r.id), following=state.community.follows.includes(r.ownerId);
 const community=recipeDisplayRating(r);
 const stages=(r.params?.stages||[]).map(s=>`<div><span>${esc(s.name)}</span>${s.time}s · ${s.weight}g</div>`).join('');
 const editButton=mine?`<button class="edit-icon modal-edit" onclick="openRecipeForm('${r.id}')">${icon('pencil')}</button>`:'';
 modal(`${editButton}<h2>${esc(r.title)}</h2><div class="hero-detail"><b>${r.score||'—'}</b><span>Taste Score</span></div><div class="detail"><div><span>Creator</span>@${esc(r.ownerHandle||'user')}</div><div><span>Method</span>${esc(r.method)}</div><div><span>Bean</span>${esc([r.beanName,r.roaster,r.origin].filter(Boolean).join(' · ')||'Standalone')}</div><div><span>Roast</span>${esc(r.roastLevel||'—')}</div><div><span>Recipe</span>${esc(recipeParamLine(r))}</div><div><span>Community</span>${community.count?`${community.avg}/10 from ${community.count} rating${community.count===1?'':'s'}`:'No ratings yet'}</div><div><span>Your Rating</span>${community.mine?`${community.mine.rating}/10${community.mine.review?' · '+esc(community.mine.review):''}`:'Not rated yet'}</div><div><span>Tags</span>${esc((r.tags||[]).join(', ')||'—')}</div><div><span>Notes</span>${esc(r.notes||'—')}</div>${stages?`<div><span>Stages</span><section class="stage-detail">${stages}</section></div>`:''}</div>${mine?`<button class="btn full" onclick="publishRecipe('${r.id}')">${r.visibility==='public'?'Update Public Recipe':'Publish Recipe'}</button>`:`<button class="btn full" onclick="saveCommunityRecipe('${r.id}')">${saved?'Saved to Library':'Save to My Library'}</button><button class="btn secondary full" onclick="toggleFollow('${r.ownerId}')">${following?'Unfollow':'Follow'} @${esc(r.ownerHandle||'user')}</button><button class="btn secondary full" onclick="openRatingForm('${r.id}')">${community.mine?'Update Rating':'Rate Recipe'}</button>`}<button class="btn secondary full" onclick="useCommunityRecipe('${r.id}')">${mine&&r.sourceBeanId?'Brew Using This Profile':'Copy to Current Bean'}</button>`)
}
function useCommunityRecipe(id){
 const r=recipeById(id); if(!r)return;
 if(r.ownerId===state.community.user.id&&r.sourceBeanId&&r.sourceProfileId){closeModal(); brewUsingProfile(r.sourceBeanId,r.method,r.sourceProfileId); return}
 copyRecipeToCurrentBean(id);
}
function openRatingForm(recipeId){
 ensureCommunity(state);
 const r=recipeById(recipeId), existing=communityRating(recipeId).mine;
 if(!r)return;
 modal(`<h2>Rate Recipe</h2><p>${esc(r.title)} by @${esc(r.ownerHandle||'user')}</p>${ratingBlock(existing?.rating||8)}<label>Review Notes</label><textarea id="ratingReview" placeholder="What worked, what would you change?">${esc(existing?.review||'')}</textarea><button class="btn full" onclick="saveCommunityRating('${recipeId}')">Save Rating</button>`);
 updateRating(existing?.rating||8);
}
async function saveCommunityRating(recipeId){
 ensureCommunity(state);
 const rating={id:`${recipeId}:${state.community.user.id}`,recipeId,userId:state.community.user.id,userHandle:state.community.user.handle,rating:+$('#rating').value,review:$('#ratingReview').value,createdAt:communityRating(recipeId).mine?.createdAt||iso(),updatedAt:iso()};
 const i=state.community.ratings.findIndex(r=>r.recipeId===recipeId&&r.userId===state.community.user.id);
 if(i>=0)state.community.ratings[i]=rating; else state.community.ratings.unshift(rating);
 trackEvent('recipe.rated',{recipeId,rating:rating.rating});
 save();
 try{await postJson('/api/ratings',rating)}catch(e){state.community.sync.lastError='Rating sync failed';save()}
 closeModal();
 render();
 toast('Recipe rated');
}
function copyRecipeToCurrentBean(id){
 const r=recipeById(id), b=currentBean(); if(!r||!b)return;
 const p=r.params||{}, arr=b.brewProfiles[r.method]=b.brewProfiles[r.method]||[];
 const profile={id:uid(),name:r.title,active:false,createdAt:iso(),score:+(r.score||0),grinderId:state.userProfile.grinders[0]?.id,grind:+(p.grind||0),dose:+(p.dose||0),temp:+(p.temp||0),notes:`Copied from @${r.ownerHandle||'user'}: ${r.notes||''}`};
 if(r.method==='Espresso')Object.assign(profile,{yieldOut:+(p.yieldOut||0),time:+(p.time||0),ratio:p.ratio||ratio({dose:p.dose,yieldOut:p.yieldOut})}); else Object.assign(profile,{water:+(p.water||0),totalTime:+(p.totalTime||0),bloom:+(p.bloom||0),stages:p.stages||[]});
 arr.push(profile);
 trackEvent('recipe.copied',{recipeId:id,beanId:b.id});
 selectedMethod=r.method;
 save();
 closeModal();
 openBeanDetail(b.id);
 toast('Recipe copied to current bean');
}
function openRecipeForm(id=''){
 ensureCommunity(state);
 const r=id?recipeById(id):{method:selectedMethod,title:'',roastLevel:preferredRoast(),params:{grind:18,dose:18,yieldOut:36,time:30,temp:93},tags:[...state.userProfile.flavour.notes],score:7.5,notes:'',visibility:'private'};
 if(id&&r.ownerId!==state.community.user.id){toast('Save a copy before editing');return}
 const p=r.params||{}, output=r.method==='Espresso'?(p.yieldOut||36):(p.water||320), time=r.method==='Espresso'?(p.time||30):(p.totalTime||180);
 modal(`<h2>${id?'Edit':'Create'} Recipe</h2><label>Title</label><input id="recipeTitle" value="${esc(r.title||'')}"><label>Method</label><select id="recipeFormMethod">${brewMethods.map(m=>`<option ${r.method===m?'selected':''}>${m}</option>`).join('')}</select><label>Roast</label><select id="recipeFormRoast">${['Light','Medium','Dark'].map(x=>`<option ${r.roastLevel===x?'selected':''}>${x}</option>`).join('')}</select><div class="metric-grid"><label>Grind<input id="recipeGrind" type="number" step="0.1" value="${p.grind||18}"></label><label>Dose<input id="recipeDose" type="number" step="0.1" value="${p.dose||18}"></label></div><div class="metric-grid"><label>Output / Water<input id="recipeOutput" type="number" step="0.1" value="${output}"></label><label>Time<input id="recipeTime" type="number" step="0.1" value="${time}"></label></div><label>Temperature</label><input id="recipeTemp" type="number" step="1" value="${p.temp||93}">${ratingBlock(r.score||7.5)}<label>Taste Tags</label><div class="select-grid">${flavourTags.map(t=>`<button type="button" class="tile small ${(r.tags||[]).includes(t)?'selected':''}" data-recipe-tag="${t}" onclick="this.classList.toggle('selected')">${t}</button>`).join('')}</div><label>Notes</label><textarea id="recipeNotes">${esc(r.notes||'')}</textarea><button class="btn full" onclick="saveStandaloneRecipe('${id}')">Save Recipe</button>${id?`<button class="btn danger full" onclick="deleteCommunityRecipe('${id}')">Delete Recipe</button>`:''}`); updateRating(r.score||7.5)
}
function saveStandaloneRecipe(id=''){
 ensureCommunity(state);
 const method=$('#recipeFormMethod').value, isEsp=method==='Espresso', out=+$('#recipeOutput').value, time=+$('#recipeTime').value, roast=$('#recipeFormRoast').value;
 const params={grind:+$('#recipeGrind').value,dose:+$('#recipeDose').value,temp:+$('#recipeTemp').value};
 if(isEsp)Object.assign(params,{yieldOut:out,time,ratio:ratio({dose:params.dose,yieldOut:out})}); else Object.assign(params,{water:out,totalTime:time,bloom:0,stages:[]});
 const old=id?recipeById(id):null, recipe={id:id||uid(),ownerId:state.community.user.id,ownerName:state.community.user.displayName,ownerHandle:state.community.user.handle,method,title:$('#recipeTitle').value||`${method} Recipe`,visibility:old?.visibility||'private',beanName:old?.beanName||'',roaster:old?.roaster||'',origin:old?.origin||'',process:old?.process||'',roastLevel:roast,params,tags:[...new Set([method,roast,...$$('[data-recipe-tag].selected').map(x=>x.dataset.recipeTag)])],score:+$('#rating').value,notes:$('#recipeNotes').value,saves:old?.saves||0,createdAt:old?.createdAt||iso(),updatedAt:iso()};
 if(old)Object.assign(old,recipe); else state.community.recipes.unshift(recipe);
 trackEvent(id?'recipe.updated':'recipe.created',{recipeId:recipe.id});
 save();
 closeModal();
 view='recipes';
 recipeTab='library';
 render();
 toast('Recipe saved');
}
function deleteCommunityRecipe(id){let r=recipeById(id); if(!r||r.ownerId!==state.community.user.id)return; if(confirm(`Delete recipe "${r.title}"?`)){state.community.recipes=state.community.recipes.filter(x=>x.id!==id); state.community.savedRecipeIds=state.community.savedRecipeIds.filter(x=>x!==id); trackEvent('recipe.deleted',{recipeId:id}); closeModal(); render()}}
function moreView(){
 ensureCommunity(state);
 const c=state.community, last=c.sync.lastSyncAt?dateShort(c.sync.lastSyncAt):'Never';
 const loc=c.user.location||{}, equipment=profileEquipment();
 return `<section class="card"><h2>Account</h2><div class="account-state"><b>${c.session.signedIn?'Signed in':'Local profile'}</b><span>${esc(c.session.provider||'local')}</span></div><div class="auth-grid"><button onclick="socialSignIn('apple')">Continue with Apple</button><button onclick="socialSignIn('google')">Continue with Google</button><button onclick="socialSignIn('facebook')">Continue with Facebook</button></div><p>These buttons create provider-aware sessions in this prototype. Production mobile builds should exchange native Apple/Google/Facebook tokens with the same backend endpoint.</p>${c.session.signedIn?`<button class="btn secondary full" onclick="signOut()">Sign Out</button>`:''}</section><section class="card"><h2>Community Profile</h2><label>Display Name</label><input id="communityName" value="${esc(c.user.displayName)}"><label>Email</label><input id="communityEmail" type="email" value="${esc(c.user.email||c.session.email||'')}"><label>Handle</label><input id="communityHandle" value="${esc(c.user.handle)}"><label>City</label><input id="communityCity" value="${esc(loc.city||'')}" placeholder="Toronto"><div class="metric-grid"><label>Region<input id="communityRegion" value="${esc(loc.region||'')}" placeholder="ON"></label><label>Country<input id="communityCountry" value="${esc(loc.country||'')}" placeholder="Canada"></label></div><label>Bio</label><textarea id="communityBio">${esc(c.user.bio||'')}</textarea><section class="inner-card"><h3>Equipment Shared on Profile</h3><p>${esc(equipment.machine||'Machine not set')}</p><p>${esc((equipment.grinders||[]).map(g=>[g.name||g.model,g.burrType==='Other'?g.burrOther:g.burrType,g.profile].filter(Boolean).join(' / ')).join(', ')||'Grinder not set')}</p><button class="btn secondary full" onclick="editProfile()">Edit Equipment</button></section><button class="btn full" onclick="saveCommunitySettings()">Save Profile</button></section><section class="card"><h2>Backend Tracking</h2><label>Backend API URL</label><input id="apiBase" placeholder="http://localhost:8787" value="${esc(c.sync.apiBase||'')}"><div class="tile ${c.sync.enabled?'selected':''}" onclick="toggleBackendSync()"><b>User data, follow, rating, and recipe sync</b><p>${c.sync.enabled?'Enabled':'Disabled'} · Last sync: ${last}</p></div>${c.sync.lastError?`<p class="error">${esc(c.sync.lastError)}</p>`:''}<button class="btn full" onclick="syncCommunity()">Sync Now</button></section><section class="card"><h2>Settings</h2><button class="btn full secondary" onclick="go('maintenance')">Maintenance Tracker</button><div class="tile ${state.settings.rateReminder?'selected':''}" onclick="state.settings.rateReminder=!state.settings.rateReminder;render()"><b>Ask me to rate my brew later</b><p>${state.settings.rateReminder?'Enabled':'Disabled'}</p></div><label>Rating reminder delay</label><select onchange="state.settings.rateDelay=this.value;save()"><option value="5" ${state.settings.rateDelay==5?'selected':''}>5 minutes</option><option value="10" ${state.settings.rateDelay==10?'selected':''}>10 minutes</option></select></section><section class="card"><h2>Data</h2><button class="btn full secondary" onclick="exportData()">Export Backup</button><button class="btn full secondary" onclick="document.getElementById('importBackup').click()">Import Backup</button><input type="file" id="importBackup" accept="application/json" hidden onchange="importData(event)"><button class="btn full secondary" onclick="localStorage.removeItem(KEY);location.reload()">Reset Demo Data</button></section>`
}
function toggleBackendSync(){ensureCommunity(state); if($('#apiBase'))state.community.sync.apiBase=$('#apiBase').value.trim(); state.community.sync.enabled=!state.community.sync.enabled; save(); render()}
async function socialSignIn(provider){
 ensureCommunity(state);
 saveCommunitySettings(false);
 const c=state.community, providerName=provider.charAt(0).toUpperCase()+provider.slice(1);
 c.session={signedIn:true,provider,providerUserId:`${provider}:${c.user.handle}`,sessionId:'local-'+uid(),email:c.user.email||'',signedInAt:iso()};
 c.user.authProvider=provider;
 trackEvent('auth.sign_in',{provider});
 try{
  const data=await postJson('/api/auth/social',{provider,providerUserId:c.session.providerUserId,user:publicUser()});
  if(data?.user)Object.assign(c.user,data.user);
  if(data?.session)c.session.sessionId=data.session.id;
 }catch(e){c.sync.lastError='Auth sync pending until backend is reachable'}
 save();
 render();
 toast(`Signed in with ${providerName}`);
}
function signOut(){ensureCommunity(state); trackEvent('auth.sign_out',{provider:state.community.session.provider}); state.community.session={signedIn:false,provider:'local',providerUserId:'',sessionId:'',email:''}; save(); render()}
function saveCommunitySettings(renderNow=true){
 ensureCommunity(state);
 const c=state.community;
 c.user.displayName=$('#communityName').value||'Home Barista';
 c.user.email=$('#communityEmail')?.value||c.user.email||'';
 c.user.handle=($('#communityHandle').value||c.user.displayName).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'home-barista';
 c.user.bio=$('#communityBio').value;
 c.user.location={city:$('#communityCity')?.value||'',region:$('#communityRegion')?.value||'',country:$('#communityCountry')?.value||''};
 c.user.equipment=profileEquipment();
 c.session.email=c.user.email;
 c.sync.apiBase=$('#apiBase')?.value.trim()||c.sync.apiBase||'';
 c.recipes.forEach(r=>{if(r.ownerId===c.user.id){r.ownerName=c.user.displayName;r.ownerHandle=c.user.handle}});
 trackEvent('community.settings.updated',{syncEnabled:c.sync.enabled});
 save();
 postJson('/api/users',publicUser()).catch(()=>{c.sync.lastError='Profile sync failed';save()});
 if(renderNow){render();toast('Community settings saved')}
}
function importData(e){let f=e.target.files[0]; if(!f)return; let r=new FileReader(); r.onload=()=>{try{state=migrate(JSON.parse(r.result)); save(); render(); toast('Backup imported')}catch(err){toast('Import failed')}}; r.readAsText(f)}
const originalSaveBrew=saveBrew;
saveBrew=function(beanId,method){originalSaveBrew(beanId,method); trackEvent('brew.logged',{beanId,method})}
const originalSaveRecipeProfile=saveRecipeProfile;
saveRecipeProfile=function(beanId,m,pid){originalSaveRecipeProfile(beanId,m,pid); ensureCommunity(state); trackEvent(pid?'profile.updated':'profile.created',{beanId,method:m})}
const originalSaveDialedProfile=saveDialedProfile;
saveDialedProfile=function(beanId,method){originalSaveDialedProfile(beanId,method); ensureCommunity(state); trackEvent('profile.created',{beanId,method})}

/* v16 profile/equipment refinements */
function profileData(){
 const p=state.userProfile||{};
 const e=p.equipment||{};
 const machine=p.machine||{};
 const otherBrews=Array.isArray(p.otherBrews)?p.otherBrews:(p.otherBrew?[p.otherBrew]:[]);
 const flavour=p.flavour||{};
 return {
  brew:p.brew||[],
  otherBrews,
  machine:{manufacturer:machine.manufacturer||e.espresso?.manufacturer||'',model:machine.model||e.espresso?.model||''},
  grinders:(p.grinders&&p.grinders.length?p.grinders:[{id:uid(),model:'DF64',name:'DF64',burrType:'Stainless Steel',burrOther:'',profile:'Multipurpose (espresso)'}]).map(g=>({id:g.id||uid(),model:g.model||'DF64',name:g.name||g.model||'DF Grinder',burrType:g.burrType||'Stainless Steel',burrOther:g.burrOther||'',profile:g.profile||'Multipurpose (espresso)'})),
  equipment:{
   espresso:{manufacturer:e.espresso?.manufacturer||machine.manufacturer||'',model:e.espresso?.model||machine.model||''},
   pourOver:{brewerType:e.pourOver?.brewerType||'',style:e.pourOver?.style||'conical',styleOther:e.pourOver?.styleOther||''},
   aeroPress:{brewerType:e.aeroPress?.brewerType||'AeroPress'},
   frenchPress:{brewerType:e.frenchPress?.brewerType||'French press'},
   mokaPot:{brand:e.mokaPot?.brand||'',size:e.mokaPot?.size||''},
  },
  flavour:{roast:flavour.roast??52,notes:flavour.notes||[],customNotes:flavour.customNotes||[]},
  workflow:p.workflow||[],
 };
}
function methodLabel(m){return m==='Other'?(profileData().otherBrews.join(', ')||'Other'):m}
function methodSelected(m){return !!document.querySelector(`[data-brew="${m}"].selected`)}
function grinderName(g){return [g.name||g.model,g.burrType==='Other'?g.burrOther:g.burrType,g.profile].filter(Boolean).join(' • ')}
function methodEquipment(method){
 const p=profileData(), e=p.equipment;
 if(method==='Espresso')return {title:'Espresso Machine',value:[e.espresso.manufacturer,e.espresso.model].filter(Boolean).join(' ')||'Espresso machine not set'};
 if(method==='Pour Over')return {title:'Pour Over Brewer',value:[e.pourOver.brewerType,e.pourOver.style==='other'?e.pourOver.styleOther:e.pourOver.style].filter(Boolean).join(' • ')||'Pour over brewer not set'};
 if(method==='AeroPress')return {title:'AeroPress',value:e.aeroPress.brewerType||'AeroPress'};
 if(method==='French Press')return {title:'French Press',value:e.frenchPress.brewerType||'French press'};
 if(method==='Moka Pot')return {title:'Moka Pot',value:[e.mokaPot.brand,e.mokaPot.size].filter(Boolean).join(' • ')||'Moka pot not set'};
 return {title:'Other Brewer',value:p.otherBrews.join(', ')||'Other brewer not set'};
}
function profileEquipment(sourceState){
 const s=arguments.length?sourceState:state, p=s?.userProfile||{}, e=p.equipment||{}, machineProfile=p.machine||{}, grinders=p.grinders||[];
 const equipment={espresso:{manufacturer:e.espresso?.manufacturer||machineProfile.manufacturer||'',model:e.espresso?.model||machineProfile.model||''},pourOver:{brewerType:e.pourOver?.brewerType||'',style:e.pourOver?.style||'conical',styleOther:e.pourOver?.styleOther||''},aeroPress:{brewerType:e.aeroPress?.brewerType||'AeroPress'},frenchPress:{brewerType:e.frenchPress?.brewerType||'French press'},mokaPot:{brand:e.mokaPot?.brand||'',size:e.mokaPot?.size||''}};
 const machine=[equipment.espresso.manufacturer,equipment.espresso.model].filter(Boolean).join(' ');
 return {machine,brewers:equipment,otherBrews:Array.isArray(p.otherBrews)?p.otherBrews:(p.otherBrew?[p.otherBrew]:[]),grinders:grinders.map(g=>({id:g.id,model:g.model,name:g.name,burrType:g.burrType,burrOther:g.burrOther,profile:g.profile}))};
}
function profileCard(){
 const p=profileData(), g=p.grinders[0]||{}, flavours=[...(p.flavour.notes||[]),...(p.flavour.customNotes||[])];
 const equipment=(p.brew||[]).filter(m=>m!=='Other').map(m=>`${m}: ${methodEquipment(m).value}`).concat(p.brew.includes('Other')?p.otherBrews.map(x=>`Other: ${x}`):[]);
 return `<section class="card profile-card"><button class="edit-icon" onclick="editProfile()">${icon('pencil')}</button><h2>Profile</h2><div class="method-row">${(p.brew||[]).map(m=>`<span title="${esc(methodLabel(m))}">${brewSvg(m)}</span>`).join('')}</div><div class="detail compact"><div><span>Grinders</span>${esc(p.grinders.map(x=>x.name||x.model).join(', ')||'Not set')}</div><div><span>Equipment</span>${esc(equipment.join(' · ')||'Not set')}</div><div><span>Preference</span>${p.flavour.roast<35?'Darker':p.flavour.roast>65?'Lighter':'Medium'} • ${esc(flavours.join(', ')||'Not set')}</div><div><span>Workflow</span>${esc((state.userProfile.workflow||[]).join(', ')||'Not set')}</div></div></section>`;
}
function grinderEditor(g,i){return `<section class="inner-card grinder-form" data-grinder-row data-id="${esc(g.id||uid())}"><h3>Grinder ${i+1}</h3><label>Name</label><input class="g-name" value="${esc(g.name||g.model||'')}"><label>Model</label><select class="g-model">${models.map(m=>`<option ${g.model===m?'selected':''}>${m}</option>`).join('')}</select><label>Burr Type</label><select class="g-burr" onchange="this.closest('[data-grinder-row]').querySelector('.g-other-wrap').style.display=this.value==='Other'?'block':'none'"><option ${g.burrType==='Red Titanium'?'selected':''}>Red Titanium</option><option ${g.burrType==='Stainless Steel'?'selected':''}>Stainless Steel</option><option ${g.burrType==='Other'?'selected':''}>Other</option></select><div class="g-other-wrap" style="display:${g.burrType==='Other'?'block':'none'}"><label>Other Burr</label><input class="g-other" value="${esc(g.burrOther||'')}"></div><label>Burr Profile</label><select class="g-profile"><option ${g.profile==='Brew'?'selected':''}>Brew</option><option ${g.profile==='Multipurpose (espresso)'?'selected':''}>Multipurpose (espresso)</option></select>${i?`<button class="btn danger full" type="button" onclick="this.closest('[data-grinder-row]').remove()">Remove Grinder</button>`:''}</section>`}
function addGrinderField(){let g={id:uid(),model:'DF64',name:'DF64',burrType:'Stainless Steel',burrOther:'',profile:'Multipurpose (espresso)'}; $('#grinderList').insertAdjacentHTML('beforeend',grinderEditor(g,$$('[data-grinder-row]').length))}
function addOtherBrewField(value=''){let n=$$('.other-brew-input').length+1; $('#otherBrewList').insertAdjacentHTML('beforeend',`<div class="field-action"><input class="other-brew-input" value="${esc(value)}" placeholder="Custom brewer ${n}"><button type="button" onclick="this.parentElement.remove();syncProfileEquipmentVisibility()">×</button></div>`); syncProfileEquipmentVisibility()}
function addCustomFlavorField(value=''){$('#customFlavorList').insertAdjacentHTML('beforeend',`<div class="field-action"><input class="custom-flavor-input" value="${esc(value)}" placeholder="Custom flavour"><button type="button" onclick="this.parentElement.remove()">×</button></div>`)}
function toggleProfileMethod(btn){btn.classList.toggle('selected');syncProfileEquipmentVisibility()}
function syncProfileEquipmentVisibility(){
 ['Espresso','Pour Over','AeroPress','French Press','Moka Pot','Other'].forEach(m=>{let el=document.querySelector(`[data-equip-for="${m}"]`); if(el)el.style.display=methodSelected(m)?'block':'none'});
 let other=document.getElementById('otherBrewWrap'); if(other)other.style.display=methodSelected('Other')?'block':'none';
 let names=$$('.other-brew-input').map(x=>x.value.trim()).filter(Boolean);
 let preview=$('#otherBrewerPreview'); if(preview)preview.innerHTML=(names.length?names:['Select Other and name the brewer above']).map(x=>`<input readonly value="${esc(x)}">`).join('');
}
function toggleOtherFlavor(btn){btn.classList.toggle('selected');$('#customFlavorWrap').style.display=btn.classList.contains('selected')?'block':'none'}
function editProfile(){
 const p=profileData(), selected=new Set(p.brew||[]), flavourSet=new Set(p.flavour.notes||[]);
 modal(`<h2>Edit Profile</h2><h3>Brew Methods</h3><div class="method-grid">${brewMethods.map(x=>`<button type="button" class="tile method ${selected.has(x)?'selected':''}" data-brew="${x}" onclick="toggleProfileMethod(this)">${brewSvg(x)}<em>${x}</em></button>`).join('')}</div><div id="otherBrewWrap" style="display:${selected.has('Other')?'block':'none'}"><label>Other Brew Methods</label><div id="otherBrewList">${(p.otherBrews.length?p.otherBrews:['']).map(x=>`<div class="field-action"><input class="other-brew-input" value="${esc(x)}" placeholder="Siphon, Cold Brew, Clever Dripper..."><button type="button" onclick="this.parentElement.remove();syncProfileEquipmentVisibility()">×</button></div>`).join('')}</div><button class="btn secondary full" type="button" onclick="addOtherBrewField()">+ Add Other Brew Method</button></div><h3 class="section-gap">Equipment</h3><div id="grinderList">${p.grinders.map(grinderEditor).join('')}</div><button class="btn secondary full" type="button" onclick="addGrinderField()">+ Add Grinder</button><section class="inner-card equipment-fields" data-equip-for="Espresso"><h3>Espresso Machine</h3><label>Manufacturer</label><input id="pmake" value="${esc(p.equipment.espresso.manufacturer)}"><label>Model</label><input id="pmodel" value="${esc(p.equipment.espresso.model)}"></section><section class="inner-card equipment-fields" data-equip-for="Pour Over"><h3>Pour Over Brewer</h3><label>Brewer Type</label><input id="pourType" value="${esc(p.equipment.pourOver.brewerType)}" placeholder="V60, Kalita, Origami..."><label>Brewer Style</label><select id="pourStyle" onchange="$('#pourStyleOtherWrap').style.display=this.value==='other'?'block':'none'"><option value="conical" ${p.equipment.pourOver.style==='conical'?'selected':''}>Conical</option><option value="flat bottom" ${p.equipment.pourOver.style==='flat bottom'?'selected':''}>Flat bottom</option><option value="other" ${p.equipment.pourOver.style==='other'?'selected':''}>Other</option></select><div id="pourStyleOtherWrap" style="display:${p.equipment.pourOver.style==='other'?'block':'none'}"><label>Other Style</label><input id="pourStyleOther" value="${esc(p.equipment.pourOver.styleOther)}"></div></section><section class="inner-card equipment-fields" data-equip-for="AeroPress"><h3>AeroPress</h3><label>Brewer Type</label><input id="aeroType" value="${esc(p.equipment.aeroPress.brewerType||'AeroPress')}"></section><section class="inner-card equipment-fields" data-equip-for="French Press"><h3>French Press</h3><label>Brewer Type</label><input id="frenchType" value="${esc(p.equipment.frenchPress.brewerType||'French press')}"></section><section class="inner-card equipment-fields" data-equip-for="Moka Pot"><h3>Moka Pot</h3><label>Brand</label><input id="mokaBrand" value="${esc(p.equipment.mokaPot.brand)}"><label>Size</label><input id="mokaSize" value="${esc(p.equipment.mokaPot.size)}" placeholder="3 cup, 6 cup..."></section><section class="inner-card equipment-fields" data-equip-for="Other"><h3>Other Brewer</h3><label>Specified Brewer</label><div id="otherBrewerPreview"></div></section><label>Roast Preference</label><div class="roast-pref"><span>Light</span><span>Dark</span></div><input id="roastpref" class="roast-slider" type="range" min="0" max="100" value="${p.flavour.roast}"><label>Flavour Preferences</label><div class="select-grid">${flavourTags.map(x=>`<button type="button" class="tile ${flavourSet.has(x)?'selected':''}" data-pref="${x}" onclick="this.classList.toggle('selected')">${x}</button>`).join('')}<button type="button" class="tile ${p.flavour.customNotes.length?'selected':''}" id="otherFlavorBtn" onclick="toggleOtherFlavor(this)">Other</button></div><div id="customFlavorWrap" style="display:${p.flavour.customNotes.length?'block':'none'}"><label>Other Flavour Descriptions</label><div id="customFlavorList">${(p.flavour.customNotes.length?p.flavour.customNotes:['']).map(x=>`<div class="field-action"><input class="custom-flavor-input" value="${esc(x)}" placeholder="Custom flavour"><button type="button" onclick="this.parentElement.remove()">×</button></div>`).join('')}</div><button class="btn secondary full" type="button" onclick="addCustomFlavorField()">+ Add Flavour</button></div><label>Workflow</label><div class="select-grid">${['Blind shaking','WDT','RDT','Slow feed','Distributor tool','Pre-Infusion'].map(x=>`<button type="button" class="tile ${(p.workflow||[]).includes(x)?'selected':''}" data-work="${x}" onclick="this.classList.toggle('selected')">${x}</button>`).join('')}</div><div class="action-gap"><button class="btn full" onclick="saveProfile()">Save Profile</button></div>`);
 syncProfileEquipmentVisibility();
}
function saveProfile(){
 const brew=$$('[data-brew].selected').map(x=>x.dataset.brew);
 const otherBrews=$$('.other-brew-input').map(x=>x.value.trim()).filter(Boolean);
 const grinders=$$('[data-grinder-row]').map(row=>({id:row.dataset.id||uid(),name:$('.g-name',row).value||$('.g-model',row).value,model:$('.g-model',row).value,burrType:$('.g-burr',row).value,burrOther:$('.g-burr',row).value==='Other'?$('.g-other',row).value:'',profile:$('.g-profile',row).value}));
 const customNotes=$$('.custom-flavor-input').map(x=>x.value.trim()).filter(Boolean);
 const equipment={espresso:{manufacturer:$('#pmake')?.value||'',model:$('#pmodel')?.value||''},pourOver:{brewerType:$('#pourType')?.value||'',style:$('#pourStyle')?.value||'conical',styleOther:$('#pourStyleOther')?.value||''},aeroPress:{brewerType:$('#aeroType')?.value||'AeroPress'},frenchPress:{brewerType:$('#frenchType')?.value||'French press'},mokaPot:{brand:$('#mokaBrand')?.value||'',size:$('#mokaSize')?.value||''}};
 state.userProfile={...state.userProfile,brew,machine:{manufacturer:equipment.espresso.manufacturer,model:equipment.espresso.model},equipment,grinders:grinders.length?grinders:profileData().grinders,flavour:{roast:+$('#roastpref').value,notes:$$('[data-pref].selected').map(x=>x.dataset.pref),customNotes},workflow:$$('[data-work].selected').map(x=>x.dataset.work),otherBrews,otherBrew:otherBrews[0]||''};
 if(state.community?.user)state.community.user.equipment=profileEquipment();
 closeModal(); render();
}
function settingBlock(v,selectedGrinderId=''){
 const grinders=profileData().grinders, selected=selectedGrinderId||grinders[0]?.id||'';
 const options=grinders.map(g=>`<option value="${g.id}" ${g.id===selected?'selected':''}>${esc(g.name||g.model||'DF Grinder')}</option>`).join('');
 return `<div class="setting-card"><div><label>Grinder</label><select id="logGrinder">${options}</select></div><label class="setting-num">Setting<input id="grind" type="number" step="0.1" value="${(+v||0).toFixed(1)}" onchange="syncRuler(+this.value)"></label><div class="ruler" id="ruler"><div class="track" id="track"></div><div class="center-line"></div></div></div>`;
}
function flavourButtons(){return [...flavourTags,...(profileData().flavour.customNotes||[])].map(x=>`<button type="button" class="tile small" data-flav="${esc(x)}" onclick="this.classList.toggle('selected')">${esc(x)}</button>`).join('')}
function logView(pref={}){
 let b=bean(pref.beanId)||currentBean(); let m=pref.method||selectedMethod||'Espresso'; let p=pref.profileId?activeProfile(b,m):activeProfile(b,m); let temp=tempVal(p,m), gId=p?.grinderId||lastBrew(b?.id,m)?.grinderId||profileData().grinders[0]?.id;
 const isEsp=m==='Espresso', isPour=m==='Pour Over';
 const pourControls=isPour?`<div class="seg"><button class="sel" id="manualModeBtn" onclick="setPourMode('manual')">Manual Brew</button><button id="guidedModeBtn" onclick="setPourMode('guided')">Follow Recipe</button></div><div id="manualPour"><div class="metric-grid"><label>Bloom Timer<input id="bloom" type="number" value="${p?.bloom||45}"></label><label>Total Brew Timer<input id="manualTime" type="number" step="0.1" placeholder="optional" value="${p?.totalTime||''}"></label></div></div><div id="guidedPour" style="display:none"><label>Recipe Stages</label><div id="pourStages">${renderPourStages(p?.stages||[{name:'Bloom',time:45,weight:60},{name:'Pour 1',time:75,weight:160},{name:'Pour 2',time:115,weight:240},{name:'Final Pour',time:155,weight:320}])}</div><button class="btn secondary" onclick="addPourStage()" type="button">Add Pour</button></div>`:'';
 return `<section class="card"><h2>Log Brew</h2><div class="seg"><button class="sel">Existing Bean</button><button onclick="openBeanForm()">New Bean</button></div><label>Bean</label><select id="logBean" onchange="state.currentBeanId=this.value;render()">${state.beans.filter(x=>x.status==='current').map(x=>`<option value="${x.id}" ${x.id===b?.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select><label>Brew Method</label>${methodSelector(m,'log','')}${settingBlock(p?.grind||lastBrew(b?.id,m)?.grind||18.6,gId)}<div class="metric-grid"><label>Dose<input id="dose" type="number" step="0.1" value="${p?.dose||18}"></label>${isEsp?`<label>Yield<input id="yieldOut" type="number" step="0.1" value="${p?.yieldOut||36}"></label>`:`<label>Water<input id="water" type="number" step="1" value="${p?.water||320}"></label>`}</div><label>Temperature</label><input id="temp" type="number" step="1" value="${temp}">${pourControls}${timerBlock(m)}${ratingBlock(7.5)}<label>Flavour Description</label><div class="select-grid">${flavourButtons()}</div><label>Flavour Notes</label><textarea id="notes" placeholder="Sweet, clean, slightly fast..."></textarea><button class="btn full" onclick="saveBrew('${b?.id||''}','${m}')">Save Brew</button><button class="btn secondary full" onclick="saveDialedProfile('${b?.id||''}','${m}')">Save Dialed-In Profile</button></section>`;
}
function selectedLogGrinder(){return $('#logGrinder')?.value||profileData().grinders[0]?.id}
saveBrew=function(beanId,method){let elapsed=timer.elapsed/1000 || +($('#manualTime')?.value||0); let data={id:uid(),beanId:beanId||$('#logBean').value,method,grinderId:selectedLogGrinder(),grind:+$('#grind').value,dose:+$('#dose').value,temp:+($('#temp')?.value||0),rating:+$('#rating').value,flavours:$$('[data-flav].selected').map(x=>x.dataset.flav),notes:$('#notes').value,createdAt:iso()}; if(method==='Espresso')Object.assign(data,{yieldOut:+$('#yieldOut').value,time:elapsed||0}); else Object.assign(data,{water:+$('#water').value,totalTime:elapsed||0}); if(method==='Pour Over')Object.assign(data,{bloom:+($('#bloom')?.value||pourBloom||0),stages:collectStages()}); state.brews.unshift(data); state.currentBeanId=data.beanId; stopTimer(false); trackEvent('brew.logged',{beanId:data.beanId,method}); toast('Brew saved'); go('home')}
saveDialedProfile=function(beanId,method){let b=bean(beanId||$('#logBean').value); if(!b)return; let name=prompt('Profile name','Current')||'Current'; let arr=b.brewProfiles[method]=b.brewProfiles[method]||[]; if(name.toLowerCase()==='current')arr.forEach(p=>p.active=false); let p={id:uid(),name,active:name.toLowerCase()==='current',createdAt:iso(),score:+($('#rating')?.value||0),grinderId:selectedLogGrinder(),grind:+$('#grind').value,dose:+$('#dose').value,temp:+($('#temp')?.value||0),notes:$('#notes')?.value||''}; if(method==='Espresso')Object.assign(p,{yieldOut:+$('#yieldOut').value,time:timer.elapsed/1000||0,ratio:ratio({dose:+$('#dose').value,yieldOut:+$('#yieldOut').value})}); else Object.assign(p,{water:+$('#water').value,totalTime:timer.elapsed/1000||0}); if(method==='Pour Over')Object.assign(p,{bloom:+($('#bloom')?.value||pourBloom||0),stages:collectStages()}); arr.push(p); trackEvent('profile.created',{beanId:b.id,method}); toast('Dialed-in profile saved'); render()}
function saveRecipeProfile(beanId,m,pid){let b=bean(beanId), arr=b.brewProfiles[m]=b.brewProfiles[m]||[], old=arr.find(x=>x.id===pid), name=$('#pname').value||'Current'; let p={id:pid||uid(),name,active:name.toLowerCase()==='current',createdAt:old?.createdAt||iso(),score:+$('#rating').value,grinderId:selectedLogGrinder(),grind:+$('#grind').value,dose:+$('#pdose').value,temp:+($('#ptemp')?.value||0),notes:$('#pnotes').value}; if(p.active)arr.forEach(x=>x.active=false); if(m==='Espresso')Object.assign(p,{yieldOut:+$('#pout').value,time:+$('#ptime').value,ratio:ratio({dose:p.dose,yieldOut:+$('#pout').value})}); else Object.assign(p,{water:+$('#pout').value,totalTime:+$('#ptime').value}); if(m==='Pour Over')Object.assign(p,{bloom:+($('#pbloom')?.value||0),stages:collectStages()}); if(old)Object.assign(old,p); else arr.push(p); trackEvent(pid?'profile.updated':'profile.created',{beanId,method:m}); closeModal(); openBeanDetail(beanId)}
function methodEquipmentCards(method,g){
 const m=methodEquipment(method);
 return `<div>${equipSvg('grinder')}<b>${esc(g.name||g.model||'—')}</b><small>${esc(grinderName(g)||'Grinder')}</small></div><div>${equipSvg(method==='Espresso'?'machine':'grinder')}<b>${esc(m.value)}</b><small>${esc(m.title)}</small></div>`;
}
function openBeanDetail(id,modalOpen=true){
 let b=bean(id); if(!b)return; if(!b.brewProfiles)b.brewProfiles={}; if(!b.brewProfiles[selectedMethod])selectedMethod=Object.keys(b.brewProfiles)[0]||'Espresso';
 let p=activeProfile(b,selectedMethod), g=grinder(p?.grinderId||b.grinderId), recent=brewsFor(b.id,selectedMethod).slice(0,3);
 let html=`<button class="back" onclick="closeModal()">${icon('back')}</button><button class="edit-icon modal-edit" onclick="openBeanForm('${b.id}')">${icon('pencil')}</button><div class="bean-hero"><button class="bag large ${b.photo?'has-photo':''}" onclick="pickPhoto('${b.id}')">${b.photo?`<img src="${b.photo}">`:'DF'}<em>${icon('camera')}</em></button><div><h1>${esc(b.name)}</h1><p>${esc([b.process,b.origin].filter(Boolean).join(' • '))}</p><span class="pill green">${b.status==='current'?'Current Bean':'Archived'}</span></div></div><h3>Brew Profiles</h3>${methodTabs(b,selectedMethod)}${profilePanel(b,selectedMethod,p,g)}<section class="inner-card"><h3>Equipment</h3><div class="equipment">${methodEquipmentCards(selectedMethod,g)}</div></section><section class="inner-card"><h3>Last 3 Brews <button onclick="showBeanHistory('${b.id}','${selectedMethod}')">View All (20)</button></h3><div class="mini-brews">${recent.map(x=>`<button onclick="brewDetail('${x.id}')"><small>${dateShort(x.createdAt)}</small><b>${x.rating||'—'}</b><span>${fmt(x.time||x.totalTime)}s</span></button>`).join('')||'<p>No brews yet.</p>'}</div></section><section class="inner-card"><h3>Saved Profiles (${selectedMethod}) <button onclick="manageProfiles('${b.id}','${selectedMethod}')">Manage</button></h3><div class="saved-profiles">${(b.brewProfiles[selectedMethod]||[]).map(pr=>`<button class="${pr.active?'sel':''}" onclick="profileDetail('${b.id}','${selectedMethod}','${pr.id}')"><b>${esc(pr.name)}</b><small>${dateShort(pr.createdAt)} · ${pr.score||'—'} Score</small></button>`).join('')}<button class="add" onclick="profileForm('${b.id}','${selectedMethod}')">+<small>Add New</small></button></div></section>`;
 if(modalOpen)modal(html); else {$('.modal').innerHTML=`<div class="modal-head"><span></span><button onclick="closeModal()">×</button></div>${html}`;bind();}
}
function brewSvg(m){
 const paths={
  Espresso:'M18 29h25v8a12.5 12.5 0 0 1-25 0v-8z M43 31h5a4.5 4.5 0 0 1 0 9h-5 M16 47h30 M24 20v5 M31 18v7 M38 20v5 M23 15h16',
  'Pour Over':'M19 12h26l-5.5 19h-15L19 12z M23.5 20h17 M26 31h12 M22 48h20 M24.5 42h15 M27 31l-4 11h18l-4-11',
  AeroPress:'M24 12h16v30H24V12z M21 9h22 M26.5 20h11 M26.5 34h11 M19 47h26 M22 42h20 M31 12v30',
  'French Press':'M22 15h18v31H22V15z M24 10h14 M31 7v17 M19 50h24 M40 23h5v16h-5 M25 36c4 2.5 10 2.5 14 0',
  'Moka Pot':'M21 25h22l5 25H16l5-25z M24 25l2.5-15h11L40 25 M20 35h24 M45 32h6 M50 33v12 M27 10h10 M29 18h6',
  More:'M20 32h.1 M32 32h.1 M44 32h.1',
  Other:'M32 16v32 M16 32h32'
 };
 return `<svg class="brew-icon" viewBox="0 0 64 64" aria-hidden="true"><path d="${paths[m]||paths.Other}"/></svg>`;
}

/* v17 pour-over recipe creation and focused brew flow */
let pourFocus={running:false,start:0,int:null,stages:[],stageIndex:0,lastStageIndex:-1};
function defaultPourStages(){return [{name:'Bloom',time:45,weight:60},{name:'Pour 1',time:75,weight:160},{name:'Pour 2',time:115,weight:240},{name:'Final Pour',time:155,weight:320}]}
function normalizePourStages(stages){
 let source=Array.isArray(stages)&&stages.length?stages:defaultPourStages();
 let rows=source.map((s,i)=>({name:s.name||stageNameForIndex(i,source.length),time:+s.time||0,weight:+s.weight||0}));
 if(!rows.some(s=>s.name==='Bloom'))rows.unshift({name:'Bloom',time:45,weight:60});
 rows=rows.filter(s=>s.name!=='Final Pour');
 let numbered=rows.filter(s=>s.name==='Bloom'||/^Pour \d+$/.test(s.name)).map((s,i)=>({...s,name:i===0?'Bloom':`Pour ${i}`}));
 let final=source.find(s=>s.name==='Final Pour')||{time:numbered[numbered.length-1]?.time+40||155,weight:numbered[numbered.length-1]?.weight+80||320};
 return [...numbered,{name:'Final Pour',time:+final.time||155,weight:+final.weight||320}];
}
function stageNameForIndex(i,total){if(i===0)return'Bloom'; if(i===total-1)return'Final Pour'; return`Pour ${i}`}
function renderPourStages(stages){
 const rows=normalizePourStages(stages);
 return `<div class="stage-table"><div class="stage-head"><span>Recipe Stage</span><span>Time</span><span>Weight (g)</span><span></span></div>${rows.map((s,i)=>`<div class="stage-row fixed-stage" data-stage-row><span class="stage-label">${esc(s.name)}</span><input class="stage-name" type="hidden" value="${esc(s.name)}"><input class="stage-time" type="number" inputmode="numeric" min="0" step="1" value="${s.time}"><input class="stage-weight" type="number" inputmode="numeric" min="0" step="1" value="${s.weight}">${s.name!=='Bloom'&&s.name!=='Final Pour'?`<button type="button" onclick="removePourStage(this)">×</button>`:'<span></span>'}</div>`).join('')}</div>`;
}
function renumberPourStageRows(){
 const rows=$$('[data-stage-row]');
 rows.forEach((r,i)=>{let name=stageNameForIndex(i,rows.length); $('.stage-label',r).textContent=name; $('.stage-name',r).value=name});
}
function addPourStage(){
 let rows=$$('[data-stage-row]'), final=rows[rows.length-1], nextNum=Math.max(1,...rows.map(r=>+($('.stage-name',r).value.match(/^Pour (\d+)$/)?.[1]||0)))+1;
 let prev=rows[rows.length-2]||rows[0], time=(+$('.stage-time',prev)?.value||45)+40, weight=(+$('.stage-weight',prev)?.value||60)+80;
 final.insertAdjacentHTML('beforebegin',`<div class="stage-row fixed-stage" data-stage-row><span class="stage-label">Pour ${nextNum}</span><input class="stage-name" type="hidden" value="Pour ${nextNum}"><input class="stage-time" type="number" inputmode="numeric" min="0" step="1" value="${time}"><input class="stage-weight" type="number" inputmode="numeric" min="0" step="1" value="${weight}"><button type="button" onclick="removePourStage(this)">×</button></div>`);
 renumberPourStageRows();
}
function removePourStage(btn){btn.closest('[data-stage-row]').remove();renumberPourStageRows()}
function collectStages(){return normalizePourStages($$('[data-stage-row]').map(r=>({name:$('.stage-name',r).value,time:+$('.stage-time',r).value,weight:+$('.stage-weight',r).value})))}
function pourRecipeOptions(beanId){let b=bean(beanId)||currentBean(); return (b?.brewProfiles?.['Pour Over']||[]).map(p=>`<button type="button" class="recipe-option" onclick="loadPourRecipe('${b.id}','${p.id}')"><b>${esc(p.name)}</b><span>${p.dose||'—'}g / ${p.water||'—'}g · ${p.score||'—'} score</span></button>`).join('')||'<p>No saved Pour Over recipes for this bean yet. Create one first or copy a community recipe to this bean.</p>'}
function setPourFlow(mode){$('#pourRecipeCreation').style.display=mode==='create'?'block':'none';$('#pourFindRecipe').style.display=mode==='find'?'block':'none';$('#recipeCreateBtn').classList.toggle('sel',mode==='create');$('#recipeFindBtn').classList.toggle('sel',mode==='find')}
function loadPourRecipe(beanId,pid){
 const p=(bean(beanId)?.brewProfiles?.['Pour Over']||[]).find(x=>x.id===pid); if(!p)return;
 $('#grind').value=(+p.grind||0).toFixed(1); syncRuler(+p.grind||0); $('#dose').value=p.dose||''; $('#water').value=p.water||''; $('#temp').value=tempVal(p,'Pour Over'); if($('#logGrinder'))$('#logGrinder').value=p.grinderId||selectedLogGrinder();
 $('#pourStages').innerHTML=renderPourStages(p.stages||defaultPourStages());
 setPourFlow('create');
 toast('Recipe loaded');
}
function pourControls(p,b){
 const stages=normalizePourStages(p?.stages||defaultPourStages());
 return `<div class="seg"><button class="sel" id="recipeCreateBtn" onclick="setPourFlow('create')" type="button">Recipe Creation</button><button id="recipeFindBtn" onclick="setPourFlow('find')" type="button">Find Existing Recipe</button></div><div id="pourRecipeCreation"><label>Recipe Stages</label><div id="pourStages">${renderPourStages(stages)}</div><button class="btn secondary full" onclick="addPourStage()" type="button">Add Pour</button><button class="btn full" onclick="showPourInstructions()" type="button">Start Focused Brew</button></div><div id="pourFindRecipe" style="display:none"><label>Saved Pour Over Recipes</label><div class="recipe-options">${pourRecipeOptions(b?.id)}</div></div><input id="manualTime" type="hidden" value="${p?.totalTime||stages[stages.length-1]?.time||0}"><input id="bloom" type="hidden" value="${stages[0]?.time||45}">`;
}
function showPourInstructions(){
 const stages=collectStages();
 if(!stages.length){toast('Add recipe stages first');return}
 modal(`<h2>Focused Pour Over</h2><p>Place your brewer on the scale and start pouring when the timer begins. Brew Library will automatically advance through each stage using your planned times.</p><div class="stage-progress">${stages.map(s=>`<span>${esc(s.name)}</span>`).join('')}</div><button class="btn full" onclick="startFocusedPour()">Start Brew</button>`);
}
function startFocusedPour(){let stages=collectStages(); closeModal(); pourFocus={running:true,start:Date.now(),int:null,stages,stageIndex:0,lastStageIndex:-1}; h(18); renderFocusedPour(); pourFocus.int=setInterval(renderFocusedPour,250)}
function focusedStageIndex(elapsed,stages){let idx=0; for(let i=1;i<stages.length;i++){if(elapsed>=stages[i-1].time)idx=i} return Math.min(idx,stages.length-1)}
function renderFocusedPour(){
 if(!pourFocus.running)return;
 let elapsed=(Date.now()-pourFocus.start)/1000, stages=pourFocus.stages, idx=focusedStageIndex(elapsed,stages), cur=stages[idx], next=stages[idx+1], remaining=next?Math.max(0,Math.ceil(cur.time-elapsed)):0;
 if(idx!==pourFocus.lastStageIndex){pourFocus.lastStageIndex=idx; h(20)}
 let start=idx===0?0:stages[idx-1].time, end=cur.time, pct=Math.max(0,Math.min(100,(elapsed-start)/Math.max(1,end-start)*100)), total=stages[stages.length-1]?.time||elapsed, totalPct=Math.max(0,Math.min(100,elapsed/total*100));
 let html=`<div class="focused-brew"><h2>Current Stage: ${esc(cur.name)}</h2><div class="focus-timer ${remaining<=5&&next?'urgent':''}" style="--stagePct:${pct}%;--totalPct:${totalPct}%"><b>${fmt(elapsed)}</b><span>Target Weight: ${cur.weight}g</span></div><section class="next-pour ${remaining<=5&&next?'pulse':''}"><h3>${next?'Next: '+esc(next.name):'Final stage'}</h3><p>${next?'Starts in: '+remaining+' seconds':'Finish when drawdown is complete.'}</p>${next&&remaining<=5?`<strong>Next: ${esc(next.name)} in ${remaining}s</strong>`:''}</section><div class="stage-progress">${stages.map((s,i)=>`<span class="${i<idx?'done':i===idx?'active':''}">${esc(s.name)}</span>`).join('')}</div><button class="btn full" onclick="finishFocusedPour()">Finish Brew</button><button class="btn secondary full" onclick="cancelFocusedPour()">Cancel</button></div>`;
 let m=$('#modal .modal'); if(m)m.innerHTML=`<div class="modal-head"><span></span><button onclick="cancelFocusedPour()">×</button></div>${html}`; else modal(html);
 if(!next&&elapsed>=cur.time){let mt=$('#manualTime'); if(mt)mt.value=elapsed.toFixed(1)}
}
function finishFocusedPour(){if(pourFocus.int)clearInterval(pourFocus.int); timer.elapsed=Date.now()-pourFocus.start; let mt=$('#manualTime'); if(mt)mt.value=(timer.elapsed/1000).toFixed(1); pourFocus.running=false; closeModal(); toast('Focused brew complete')}
function cancelFocusedPour(){if(pourFocus.int)clearInterval(pourFocus.int); pourFocus.running=false; closeModal()}
function logView(pref={}){
 let b=bean(pref.beanId)||currentBean(); let m=pref.method||selectedMethod||'Espresso'; let p=pref.profileId?activeProfile(b,m):activeProfile(b,m); let temp=tempVal(p,m), gId=p?.grinderId||lastBrew(b?.id,m)?.grinderId||profileData().grinders[0]?.id;
 const isEsp=m==='Espresso', isPour=m==='Pour Over';
 return `<section class="card"><h2>Log Brew</h2><div class="seg"><button class="sel">Existing Bean</button><button onclick="openBeanForm()">New Bean</button></div><label>Bean</label><select id="logBean" onchange="state.currentBeanId=this.value;render()">${state.beans.filter(x=>x.status==='current').map(x=>`<option value="${x.id}" ${x.id===b?.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select><label>Brew Method</label>${methodSelector(m,'log','')}${settingBlock(p?.grind||lastBrew(b?.id,m)?.grind||18.6,gId)}<div class="metric-grid"><label>Dose<input id="dose" type="number" step="0.1" value="${p?.dose||18}"></label>${isEsp?`<label>Yield<input id="yieldOut" type="number" step="0.1" value="${p?.yieldOut||36}"></label>`:`<label>Water<input id="water" type="number" step="1" value="${p?.water||320}"></label>`}</div><label>Temperature</label><input id="temp" type="number" step="1" value="${temp}">${isPour?pourControls(p,b):timerBlock(m)}${ratingBlock(7.5)}<label>Flavour Description</label><div class="select-grid">${flavourButtons()}</div><label>Flavour Notes</label><textarea id="notes" placeholder="Sweet, clean, slightly fast..."></textarea><button class="btn full" onclick="saveBrew('${b?.id||''}','${m}')">Save Brew</button><button class="btn secondary full" onclick="saveDialedProfile('${b?.id||''}','${m}')">Save Dialed-In Profile</button></section>`;
}
views.recipes=()=>recipesView();
views.more=()=>moreView();
ensureCommunity(state);
render();
