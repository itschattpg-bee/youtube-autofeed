const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
let channels=JSON.parse(localStorage.getItem("channels")||"[]"), videos=[], selected="all";
const api="";
function save(){localStorage.setItem("channels",JSON.stringify(channels));$("#count").textContent=`${channels.length} channel${channels.length===1?"":"s"}`}
function toast(t){let x=$("#toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2200)}
function esc(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function renderChannels(){
 const box=$("#channelList");box.innerHTML=channels.length?"":"<div class='empty'>No channels saved yet.</div>";
 channels.forEach((c,i)=>box.insertAdjacentHTML("beforeend",`<div class="channel"><img class="avatar" src="${esc(c.thumbnail||"")}" onerror="this.style.visibility='hidden'"><div><div class="cname">${esc(c.title||c.input)}</div><div class="curl">${esc(c.input)}</div></div><button class="remove" onclick="removeChannel(${i})">Remove</button></div>`));
}
function renderChips(){
 const box=$("#chips");box.innerHTML=`<button class="chip ${selected==="all"?"active":""}" data-c="all">All</button>`+channels.map(c=>`<button class="chip ${selected===c.id?"active":""}" data-c="${esc(c.id)}">${esc(c.title)}</button>`).join("");
 $$(".chip").forEach(b=>b.onclick=()=>{selected=b.dataset.c;renderChips();renderFeed()});
}
function renderFeed(){
 const q=$("#search").value.toLowerCase(); const now=Date.now(), month=30*86400000;
 let a=videos.filter(v=>now-new Date(v.publishedAt).getTime()<=month);
 if(selected!=="all")a=a.filter(v=>v.channelId===selected);
 if(q)a=a.filter(v=>(v.title+" "+v.channelTitle).toLowerCase().includes(q));
 a.sort((x,y)=>new Date(y.publishedAt)-new Date(x.publishedAt));
 $("#feed").innerHTML=a.map(v=>`<article class="card" onclick='play(${JSON.stringify(v).replace(/'/g,"&#39;")})'><div class="thumb"><img loading="lazy" src="${esc(v.thumbnail)}"><div class="play">▶</div></div><div class="info"><div class="title">${esc(v.title)}</div><div class="meta"><span>${esc(v.channelTitle)}</span><span>•</span><span>${new Date(v.publishedAt).toLocaleDateString()}</span></div></div></article>`).join("");
 $("#empty").hidden=a.length>0;
 if(!a.length)$("#empty").textContent=channels.length?"No videos found in the last 30 days.":"Add channels to start your feed.";
}
async function loadAll(){
 if(!channels.length){videos=[];renderFeed();return}
 $("#refresh").textContent="…";
 try{
  const r=await fetch(api+"/api/videos?channels="+encodeURIComponent(channels.map(c=>c.id).join(",")));
  const d=await r.json(); if(!r.ok)throw Error(d.error||"Refresh failed");
  videos=d.videos||[];renderFeed();toast("Feed updated");
 }catch(e){toast(e.message)}
 $("#refresh").textContent="↻";
}
async function addChannels(){
 const lines=$("#urls").value.split(/\n+/).map(x=>x.trim()).filter(Boolean);
 if(!lines.length)return toast("Paste at least one channel");
 let added=0;
 for(const input of lines){
  if(channels.some(c=>c.input===input))continue;
  try{
   const r=await fetch(api+"/api/channel?input="+encodeURIComponent(input));const c=await r.json();
   if(!r.ok)throw Error(c.error||"Invalid channel");
   channels.push(c);added++;
  }catch(e){toast(e.message)}
 }
 save();$("#urls").value="";renderChannels();renderChips();await loadAll();toast(added?`${added} channel${added>1?"s":""} added`:"Already added");
}
window.removeChannel=i=>{channels.splice(i,1);save();renderChannels();renderChips();loadAll()};
$("#add").onclick=addChannels;$("#refresh").onclick=loadAll;$("#search").oninput=renderFeed;
$("#clear").onclick=()=>{if(confirm("Remove all saved channels?")){channels=[];save();renderChannels();renderChips();videos=[];renderFeed()}};
$$(".nav").forEach(n=>n.onclick=()=>{$$(".nav").forEach(x=>x.classList.remove("active"));n.classList.add("active");$$(".page").forEach(p=>p.classList.remove("active"));$("#"+n.dataset.page).classList.add("active")});
$("#auto").checked=localStorage.getItem("auto")!=="0";$("#auto").onchange=e=>localStorage.setItem("auto",e.target.checked?"1":"0");
function play(v){$("#frame").src=`https://www.youtube.com/embed/${encodeURIComponent(v.id)}?autoplay=1&rel=0`;$("#pt").textContent=v.title;$("#player").classList.add("show")}
$("#close").onclick=()=>{$("#frame").src="";$("#player").classList.remove("show")};
save();renderChannels();renderChips();if($("#auto").checked)loadAll();else renderFeed();
