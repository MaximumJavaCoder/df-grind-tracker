const STORAGE_KEY = 'df_dial_v1';
const $ = (sel, root=document) => root.querySelector(sel);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,8);
const today = () => new Date().toISOString().slice(0,10);
const fmtDate = (iso) => iso ? new Date(iso + 'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}) : '—';

let state = load();
let view = 'beans';
let selectedBeanId = state.beans[0]?.id || null;

function load(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || seed(); }
  catch { return seed(); }
}
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function seed(){ return { grinders: [], beans: [], shots: [] }; }
function toast(msg){
  const el = document.createElement('div'); el.className='toast'; el.textContent=msg; document.body.appendChild(el);
  setTimeout(()=>el.remove(), 1800);
}
function bestShot(beanId){
  const shots = state.shots.filter(s=>s.beanId===beanId);
  return shots.find(s=>s.isBest) || shots[0] || null;
}
function beanShots(beanId){ return state.shots.filter(s=>s.beanId===beanId).sort((a,b)=> b.createdAt.localeCompare(a.createdAt)); }
function grinderName(id){ return state.grinders.find(g=>g.id===id)?.name || 'No grinder'; }
function suggestion(s){
  const time = Number(s.time), ratio = Number(s.yieldOut) / Math.max(Number(s.doseIn), .01);
  const taste = (s.taste || '').toLowerCase();
  if (taste.includes('balanced') || taste.includes('good')) return 'Save this as a strong reference setting.';
  if (taste.includes('sour') && time < 28) return 'Likely under-extracted: go finer by 0.2–0.5.';
  if (taste.includes('bitter') && time > 32) return 'Likely over-extracted: go coarser by 0.2–0.5.';
  if (time && time < 25) return 'Shot ran fast: go finer by 0.2–0.5.';
  if (time && time > 35) return 'Shot ran slow: go coarser by 0.2–0.5.';
  if (ratio > 2.5) return 'Long ratio. Consider stopping earlier or grinding slightly finer.';
  return 'Looks close. Adjust by taste rather than time alone.';
}

function render(){
  const app = $('#app');
  app.innerHTML = `<main class="app">
    <div class="header">
      <div class="brand"><div><div class="logo">DF Dial</div><div class="subtitle">Grind memory for DF Grinders</div></div><button class="pill" id="exportBtn">Export</button></div>
    </div>
    ${view==='beans'?beansView():''}
    ${view==='detail'?detailView():''}
    ${view==='addBean'?beanForm():''}
    ${view==='shot'?shotForm():''}
    ${view==='grinders'?grindersView():''}
  </main>
  <nav class="tabs">
    <button class="tab ${view==='beans'||view==='detail'?'active':''}" data-nav="beans">Beans</button>
    <button class="tab ${view==='addBean'?'active':''}" data-nav="addBean">Add Bean</button>
    <button class="tab ${view==='grinders'?'active':''}" data-nav="grinders">Grinders</button>
  </nav>`;
  bind();
}

function beansView(){
  if(!state.beans.length) return `<div class="card empty"><div class="title">No beans yet</div><p>Add your first coffee, then log shots against it.</p><button class="btn" data-nav="addBean">Add first bean</button></div>${installCard()}`;
  return `${installCard()}<div class="section-title">Bean profiles</div>` + state.beans.map(b=>{
    const best = bestShot(b.id);
    return `<div class="card bean-card" data-open="${b.id}">
      <div class="row between"><div><h2 class="title">${esc(b.name)}</h2><div class="muted small">${esc(b.roaster||'Unknown roaster')} · ${esc(b.process||'')}</div></div><div class="right"><div class="big-number">${best?.grindSetting || '—'}</div><div class="tiny muted">setting</div></div></div>
      <div class="tag">${esc(grinderName(b.grinderId))}</div><div class="tag">${esc(b.useType||'Espresso')}</div><div class="tag">Roasted ${fmtDate(b.roastDate)}</div>
      ${best ? `<div class="status small" style="margin-top:12px">Best: ${best.doseIn}g in / ${best.yieldOut}g out / ${best.time}s</div>` : ''}
    </div>`
  }).join('');
}
function installCard(){ return `<div class="card install show"><b>Install on iPhone:</b><div class="small muted" style="margin-top:6px">Open this in Safari, tap Share, then “Add to Home Screen.”</div></div>`; }
function detailView(){
  const b = state.beans.find(x=>x.id===selectedBeanId); if(!b){ view='beans'; return beansView(); }
  const shots = beanShots(b.id); const best=bestShot(b.id);
  return `<button class="btn secondary inline" data-nav="beans">← Back</button>
  <div class="card">
    <div class="row between"><div><h1 class="title">${esc(b.name)}</h1><div class="muted">${esc(b.roaster||'Unknown roaster')}</div></div><button class="btn inline" data-nav="shot">Log Shot</button></div>
    <div class="divider"></div><div class="grid2"><div><div class="label">Grinder</div>${esc(grinderName(b.grinderId))}</div><div><div class="label">Roast date</div>${fmtDate(b.roastDate)}</div></div>
    <div class="tag">${esc(b.origin||'Origin not set')}</div><div class="tag">${esc(b.process||'Process not set')}</div><div class="tag">${esc(b.useType||'Espresso')}</div>
    ${best ? `<div class="card compact" style="background:var(--card2)"><div class="label">Reference setting</div><div class="big-number accent">${best.grindSetting}</div><div class="small">${best.doseIn}g in / ${best.yieldOut}g out / ${best.time}s</div><div class="small muted" style="margin-top:6px">${esc(best.notes||'')}</div></div>`:''}
  </div>
  <div class="section-title">Shot history</div>
  ${shots.length?shots.map(s=>`<div class="card shot"><div class="row between"><div><b>${s.grindSetting}</b> setting ${s.isBest?'<span class="accent">★ Best</span>':''}<div class="small muted">${fmtDate(s.date)}</div></div><button class="btn secondary inline" data-best="${s.id}">Make Best</button></div><div class="grid3" style="margin-top:10px"><div><div class="label">Dose</div>${s.doseIn}g</div><div><div class="label">Yield</div>${s.yieldOut}g</div><div><div class="label">Time</div>${s.time}s</div></div><div class="status small" style="margin-top:12px">${suggestion(s)}</div>${s.notes?`<p class="small muted">${esc(s.notes)}</p>`:''}</div>`).join(''):`<div class="card empty">No shots logged yet.</div>`}
  <button class="btn danger" data-delete-bean="${b.id}">Delete bean</button>`;
}
function beanForm(){
  return `<div class="card"><h1 class="title">Add bean</h1><form id="beanForm">
    <div class="field"><label class="label">Bean / coffee name</label><input name="name" required placeholder="Brazil Natural"></div>
    <div class="field"><label class="label">Roaster</label><input name="roaster" placeholder="ARCHIVE Coffee"></div>
    <div class="grid2"><div class="field"><label class="label">Origin</label><input name="origin" placeholder="Brazil"></div><div class="field"><label class="label">Process</label><input name="process" placeholder="Natural"></div></div>
    <div class="grid2"><div class="field"><label class="label">Roast date</label><input name="roastDate" type="date"></div><div class="field"><label class="label">Use</label><select name="useType"><option>Espresso</option><option>Filter</option><option>Both</option></select></div></div>
    <div class="field"><label class="label">Grinder</label><select name="grinderId">${state.grinders.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('')}<option value="">Not set</option></select></div>
    <button class="btn">Save Bean</button></form></div>`;
}
function shotForm(){
  const b = state.beans.find(x=>x.id===selectedBeanId); if(!b){view='beans'; return beansView();}
  return `<button class="btn secondary inline" data-nav="detail">← Back</button><div class="card"><h1 class="title">Log shot</h1><div class="muted">${esc(b.name)}</div><form id="shotForm">
    <div class="grid2"><div class="field"><label class="label">Grind setting</label><input name="grindSetting" inputmode="decimal" required placeholder="16.8"></div><div class="field"><label class="label">Date</label><input name="date" type="date" value="${today()}"></div></div>
    <div class="grid3"><div class="field"><label class="label">Dose in</label><input name="doseIn" inputmode="decimal" placeholder="18"></div><div class="field"><label class="label">Yield out</label><input name="yieldOut" inputmode="decimal" placeholder="40"></div><div class="field"><label class="label">Time</label><input name="time" inputmode="decimal" placeholder="30"></div></div>
    <div class="field"><label class="label">Taste</label><select name="taste"><option>Balanced / good</option><option>Sour</option><option>Bitter</option><option>Thin</option><option>Harsh</option><option>Other</option></select></div>
    <div class="field"><label class="label">Notes</label><textarea name="notes" placeholder="Slightly bitter, try 0.3 coarser next time"></textarea></div>
    <div class="field row"><input style="width:auto" type="checkbox" name="isBest" checked><label>Save as reference setting</label></div>
    <button class="btn">Save Shot</button></form></div>`;
}
function grindersView(){
  return `<div class="card"><h1 class="title">Grinders</h1><form id="grinderForm">
    <div class="field"><label class="label">Grinder name</label><input name="name" required placeholder="DF54 V4 - stock burrs"></div>
    <div class="grid2"><div class="field"><label class="label">Model</label><select name="model"><option>DF54</option><option>DF64</option><option>DF64V</option><option>DF83</option><option>DF83V</option><option>Other</option></select></div><div class="field"><label class="label">Zero / chirp point</label><input name="zeroPoint" placeholder="0 or -3"></div></div>
    <div class="field"><label class="label">Burrs / notes</label><input name="notes" placeholder="Stock stainless, SSP MP, Red Titanium..."></div><button class="btn">Add Grinder</button></form></div>
    <div class="section-title">Saved grinders</div>${state.grinders.length?state.grinders.map(g=>`<div class="card compact"><div class="row between"><div><b>${esc(g.name)}</b><div class="small muted">${esc(g.model)} · zero ${esc(g.zeroPoint||'not set')}</div><div class="small muted">${esc(g.notes||'')}</div></div><button class="btn danger inline" data-delete-grinder="${g.id}">Delete</button></div></div>`).join(''):`<div class="card empty">No grinders yet. Add your DF54, DF64, or DF83 first.</div>`}`;
}

function bind(){
  document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{view=b.dataset.nav; render();});
  document.querySelectorAll('[data-open]').forEach(c=>c.onclick=()=>{selectedBeanId=c.dataset.open; view='detail'; render();});
  $('#exportBtn')?.addEventListener('click',()=>{ const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='df-dial-backup.json'; a.click(); });
  $('#beanForm')?.addEventListener('submit', e=>{e.preventDefault(); const d=Object.fromEntries(new FormData(e.target)); const b={id:uid(),...d,createdAt:new Date().toISOString()}; state.beans.unshift(b); selectedBeanId=b.id; save(); view='detail'; render(); toast('Bean saved');});
  $('#shotForm')?.addEventListener('submit', e=>{e.preventDefault(); const d=Object.fromEntries(new FormData(e.target)); if(d.isBest){state.shots.forEach(s=>{if(s.beanId===selectedBeanId)s.isBest=false})} const s={id:uid(),beanId:selectedBeanId,...d,isBest:!!d.isBest,createdAt:new Date().toISOString()}; state.shots.unshift(s); save(); view='detail'; render(); toast('Shot saved');});
  $('#grinderForm')?.addEventListener('submit', e=>{e.preventDefault(); const d=Object.fromEntries(new FormData(e.target)); state.grinders.unshift({id:uid(),...d,createdAt:new Date().toISOString()}); save(); render(); toast('Grinder saved');});
  document.querySelectorAll('[data-best]').forEach(b=>b.onclick=()=>{ const id=b.dataset.best; const shot=state.shots.find(s=>s.id===id); state.shots.forEach(s=>{if(s.beanId===shot.beanId)s.isBest=false}); shot.isBest=true; save(); render(); toast('Reference setting updated');});
  document.querySelectorAll('[data-delete-bean]').forEach(b=>b.onclick=()=>{ if(confirm('Delete this bean and its shots?')){state.beans=state.beans.filter(x=>x.id!==b.dataset.deleteBean); state.shots=state.shots.filter(x=>x.beanId!==b.dataset.deleteBean); selectedBeanId=state.beans[0]?.id||null; save(); view='beans'; render();}});
  document.querySelectorAll('[data-delete-grinder]').forEach(b=>b.onclick=()=>{state.grinders=state.grinders.filter(x=>x.id!==b.dataset.deleteGrinder); save(); render();});
}
function esc(v){ return String(v ?? '').replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js').catch(()=>{}); }
render();
