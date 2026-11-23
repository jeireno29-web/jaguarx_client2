let settings;
const $ = id => document.getElementById(id);
const toast = message => { const el=$('toast'); el.textContent=message; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2600); };
const activeProfile = () => settings.profiles.find(p=>p.id===settings.selectedProfile) || settings.profiles[0];

async function refresh() {
  settings = await window.jaguarx.getSettings();
  document.documentElement.style.setProperty('--accent', settings.cosmetics.accent || '#168cff');
  const p=activeProfile();
  $('home-profile').textContent=p.name;
  $('home-version').textContent=`Minecraft ${p.version} · ${p.loader}`;
  $('home-ram').textContent=`${p.ram} GB`;
  $('mods-for').textContent=`Perfil: ${p.name}`;
  $('profile-list').innerHTML=settings.profiles.map(x=>`
    <div class="panel profile-card ${x.id===p.id?'current':''}">
      <div class="profile-icon">▣</div><div class="profile-info"><strong>${escapeHtml(x.name)}</strong><small>Minecraft ${escapeHtml(x.version)} · ${escapeHtml(x.loader)} · ${x.ram} GB RAM</small></div>
      ${x.id===p.id?'<span class="pill">ACTIVO</span>':`<button class="secondary" data-select="${x.id}">Seleccionar</button>`}
      ${settings.profiles.length>1?`<button class="secondary" data-delete="${x.id}">Eliminar</button>`:''}
    </div>`).join('');
  document.querySelectorAll('[data-select]').forEach(b=>b.onclick=async()=>{settings=await window.jaguarx.selectProfile(b.dataset.select);refresh();});
  document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{try{settings=await window.jaguarx.deleteProfile(b.dataset.delete);refresh();toast('Perfil eliminado');}catch(e){toast(e.message);}});
  await refreshMods();
  document.querySelectorAll('[data-performance]').forEach(b=>b.classList.toggle('selected',b.dataset.performance===settings.performance));
  $('accent').value=settings.cosmetics.accent||'#168cff'; $('cape').value=settings.cosmetics.cape||'none';
  if ($('ms-client-id')) $('ms-client-id').value=settings.microsoftClientId||'';
  $('hud-fps').checked=!!settings.hud.showFps; $('hud-coords').checked=!!settings.hud.showCoords;
  $('hud-cps').checked=!!settings.hud.showCps; $('hud-scale').value=settings.hud.scale||100; updateHud();
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function refreshMods(){
  const p=activeProfile(), mods=await window.jaguarx.listMods(p.id);
  $('home-mods').textContent=mods.length;
  $('mods-list').innerHTML=mods.length?mods.map(m=>`<div class="mod-row"><span>▦ &nbsp;${escapeHtml(m)}</span><button class="secondary" data-remove="${encodeURIComponent(m)}">Quitar</button></div>`).join(''):'<div class="empty">Todavía no hay mods en este perfil.</div>';
  document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=async()=>{await window.jaguarx.removeMod(p.id,decodeURIComponent(b.dataset.remove));refreshMods();toast('Mod quitado del perfil');});
}
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));b.classList.add('active');
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('show'));$(b.dataset.page).classList.add('show');
  $('page-title').textContent=b.querySelector('span').textContent;
});
$('login-microsoft').onclick=async()=>{try{const id=$('ms-client-id').value.trim();const r=await window.jaguarx.loginMicrosoft(id);$('launch-note').textContent=`Sesión iniciada: ${r.name}`;toast('Cuenta Microsoft conectada');}catch(e){$('launch-note').textContent=e.message;toast(e.message);}};
$('play').onclick=async()=>{try{const r=await window.jaguarx.launchGame();$('launch-note').textContent=r.message;toast(r.message);}catch(e){$('launch-note').textContent=e.message;toast(e.message);}};
window.jaguarx.onGameProgress(value=>{$('launch-note').textContent=`Descargando archivos de Minecraft: ${Math.round(value)}%`;});
window.jaguarx.onGameLog(value=>{$('launch-note').textContent=String(value).slice(0,180);});
window.jaguarx.onGameError(value=>{$('launch-note').textContent=`Error: ${value}`;toast('Error al iniciar Minecraft');});
$('new-profile').onclick=()=>$('profile-form').hidden=false;
$('cancel-profile').onclick=()=>$('profile-form').hidden=true;
$('save-profile').onclick=async()=>{
  const name=$('p-name').value.trim(); if(!name){toast('Escribe un nombre para el perfil');return;}
  settings=await window.jaguarx.createProfile({name,version:$('p-version').value.trim()||'1.20.6',loader:$('p-loader').value,ram:$('p-ram').value});
  settings=await window.jaguarx.selectProfile(settings.profiles[settings.profiles.length-1].id);
  $('profile-form').hidden=true;$('p-name').value='';refresh();toast('Perfil creado');
};
$('add-mods').onclick=async()=>{const files=await window.jaguarx.addMods(activeProfile().id);if(files.length)toast(`${files.length} mod(s) añadido(s)`);refreshMods();};
$('open-mod-folder').onclick=()=>window.jaguarx.openFolder('mods',activeProfile().id);
document.querySelectorAll('[data-performance]').forEach(b=>b.onclick=async()=>{settings.performance=b.dataset.performance;await window.jaguarx.saveSettings(settings);refresh();toast('Preferencia guardada');});
function updateHud(){
  const bits=[];if($('hud-fps').checked)bits.push('FPS: 144');if($('hud-coords').checked)bits.push('XYZ: 120 / 64 / -35');if($('hud-cps').checked)bits.push('CPS: 8');
  $('hud-preview-details').textContent=bits.join('  ·  ')||'Sin indicadores';
  $('hud-preview').style.transform=`scale(${$('hud-scale').value/100})`;
}
['hud-fps','hud-coords','hud-cps','hud-scale'].forEach(id=>$(id).addEventListener('input',updateHud));
$('save-custom').onclick=async()=>{
  settings.cosmetics={accent:$('accent').value,cape:$('cape').value};
  settings.hud={showFps:$('hud-fps').checked,showCoords:$('hud-coords').checked,showCps:$('hud-cps').checked,scale:Number($('hud-scale').value)};
  await window.jaguarx.saveSettings(settings);refresh();toast('Personalización guardada');
};
refresh();
