/*================ 存储 ================*/
const LS={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}},set(k,v){localStorage.setItem(k,JSON.stringify(v))}};
const getSubs=()=>LS.get("csps_subs",[]);
const saveSubs=s=>LS.set("csps_subs",s);
const getKnow=()=>LS.get("csps_know",{});
const saveKnow=k=>LS.set("csps_know",k);
const getWrong=()=>LS.get("csps_wrong",[]);
const saveWrong=w=>LS.set("csps_wrong",w);
const getFav=()=>LS.get("csps_fav",[]);
const saveFav=f=>LS.set("csps_fav",f);
const toggleFav=id=>{const f=getFav();const i=f.indexOf(id);if(i>=0)f.splice(i,1);else f.push(id);saveFav(f);return f.includes(id);};
const getDiscuss=id=>LS.get("csps_discuss_"+id,[]);
const saveDiscuss=(id,d)=>LS.set("csps_discuss_"+id,d);
const addDiscuss=(id,content,user)=>{const d=getDiscuss(id);d.push({id:uid(),user:user||"匿名用户",time:Date.now(),content});saveDiscuss(id,d);return d;};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const getUser=()=>LS.get("csps_user",null);
const setUser=u=>LS.set("csps_user",u);
function logout(){localStorage.removeItem("csps_user");renderLoginArea();nav((location.hash||"#/dashboard").replace(/^#\//,""));}
function renderLoginArea(){
  const el=document.getElementById("loginArea"); if(!el)return;
  const u=getUser();
  if(u){el.innerHTML=`<div class="user-chip" onclick="if(confirm('退出登录 '+esc(u)+'？'))logout()"><div class="avatar">${esc(u[0].toUpperCase())}</div><span style="color:#333;font-weight:600">${esc(u)}</span></div>`;}
  else{el.innerHTML=`<button class="login-btn" id="openLogin">登录</button>`;
    document.getElementById("openLogin").onclick=()=>{document.getElementById("loginModal").classList.remove("hidden");document.getElementById("loginUser").focus();};}
}
function wireLogin(){
  const m=document.getElementById("loginModal");
  document.getElementById("loginCancel").onclick=()=>m.classList.add("hidden");
  m.onclick=e=>{if(e.target===m)m.classList.add("hidden");};
  document.getElementById("loginOk").onclick=doLogin;
  document.getElementById("loginPass").onkeydown=e=>{if(e.key==="Enter")doLogin();};
  document.getElementById("loginUser").onkeydown=e=>{if(e.key==="Enter")document.getElementById("loginPass").focus();};
}
function doLogin(){
  const u=document.getElementById("loginUser").value.trim();
  if(!u){alert("请输入用户名");return;}
  setUser(u);
  document.getElementById("loginModal").classList.add("hidden");
  document.getElementById("loginUser").value="";document.getElementById("loginPass").value="";
  renderLoginArea();
  nav((location.hash||"#/dashboard").replace(/^#\//,""));
}
const WANDBOX="https://wandbox.org/api/compile.json";
const COMPILER="gcc-13.2.0";
const DEFAULT_CODE=`#include <bits/stdc++.h>
using namespace std;
int main(){
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    return 0;
}
`;
function normOut(s){return (s||"").replace(/\r\n/g,"\n").replace(/[ \t]+$/gm,"").replace(/\s+$/,"");}
async function execWandbox(code,stdin){
  const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),26000);
  const t0=Date.now();
  try{
    const res=await fetch(WANDBOX,{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({code:code,compiler:COMPILER,stdin:stdin||""}),signal:ctrl.signal});
    clearTimeout(timer);
    if(!res.ok) return {verdict:"ERR",detail:"服务返回状态 "+res.status};
    const j=await res.json(); const ms=Date.now()-t0;
    if(j.status==="1" || (j.compiler_message&&j.compiler_message.trim()))
      return {verdict:"CE",detail:(j.compiler_error||j.compiler_message||"").slice(0,600)};
    if(j.signal&&j.signal.trim())
      return {verdict:"RE",detail:j.signal+"  "+(j.program_error||"").trim().slice(0,200)};
    return {verdict:"RUN",out:j.program_output||"",err:(j.program_error||""),ms};
  }catch(e){
    clearTimeout(timer);
    return {verdict:"TLE",detail:"运行超时或服务无响应（约 26s）"};
  }
}
async function judgeTest(code,t){
  const r=await execWandbox(code,t.input);
  if(r.verdict!=="RUN"){
    const isCE=r.verdict==="CE";
    return {verdict:isCE?"CE":"RE",score:0,out:r.out,detail:r.detail,ce:isCE};
  }
  const got=normOut(r.out), want=normOut(t.output);
  if(got===want) return {verdict:"AC",score:t.score,ms:r.ms};
  return {verdict:"WA",score:0,out:got,detail:"期望输出与你的输出不一致",ms:r.ms};
}
function problemStatus(id){
  const subs=getSubs().filter(s=>s.problem===id&&s.mode!=="mock");
  if(!subs.length) return "none";
  const best=Math.max(...subs.map(s=>s.score));
  if(best>=100) return "done";
  if(best>0) return "part";
  const last=subs[subs.length-1];
  return last&&last.verdictBest==="WA"?"wa":"part";
}
function bestScore(id){
  const subs=getSubs().filter(s=>s.problem===id&&s.mode!=="mock");
  if(!subs.length)return 0; return Math.max(...subs.map(s=>s.score));
}
function submitCount(id){return getSubs().filter(s=>s.problem===id&&s.mode!=="mock").length;}
function stats(){
  const subs=getSubs(); const solved=new Set(); const full=new Set(); let totalScore=0,totalMax=0,wa=0;
  for(const s of subs){ totalScore+=s.score; totalMax+=100; if(s.score>=100)full.add(s.problem); if(s.score>0)solved.add(s.problem); if(s.verdictBest==="WA")wa++; }
  const know=getKnow(); let marked=0, mastered=0;
  for(const c of KNOWLEDGE) for(const it of c.items){ if(know[it]){marked++; if(know[it]==="1")mastered++; } }
  const knowTotal=KNOWLEDGE.reduce((a,c)=>a+c.items.length,0);
  return {subs:solved.size,full:full.size,totalScore,totalMax,rate:totalMax?Math.round(totalScore/totalMax*100):0,wa,
          knowMarked:marked,knowMastered:mastered,knowTotal,solvedSet:solved};
}
function normDate(d){return d<10?"0"+d:d;}
function countdownTo(){ return new Date(2026,9,31,14,30,0).getTime(); }
function levelDist(){
  const dist={1:[0,0],2:[0,0],3:[0,0],4:[0,0]};
  for(const p of PROBLEMS){ dist[p.diff][1]++; if(problemStatus(p.id)==="done") dist[p.diff][0]++; }
  return dist;
}
const app=document.getElementById("app");
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function header(title,sub){return `<h2>${title}</h2><div class="sub">${sub}</div>`;}
const VIEWS={
dashboard(){renderDashboard();},
practice(){renderPracticeList();},
playlists(){renderPlaylists();},
problem(id){renderProblem(id);},
mock(){renderMockList();},
mockExam(mid){renderMock(mid);},
knowledge(){renderKnowledge();},
records(){renderRecords();}
};
function renderDashboard(){
  const s=stats();
  const u=getUser();
  const days=Math.max(0,Math.ceil((countdownTo()-Date.now())/86400000));
  const dist=levelDist();
  const distBar=Object.keys(LEVELS).map(k=>{
    const L=LEVELS[k];const [ac,tot]=dist[k];
    return `<div style="width:${tot/PROBLEMS.length*100}%;background:${L.color};opacity:${tot?0.3+0.7*(ac/tot):0.12}" title="${L.name} ${ac}/${tot}"></div>`;
  }).join("");
  const plHTML=PLAYLISTS.slice(0,4).map(pl=>{
    const list=pl.probs.map(id=>PROBLEMS.find(p=>p.id===id));
    const ac=list.filter(p=>problemStatus(p.id)==="done").length;
    return `<div class="playlist-mini" data-go="playlists">
      <div class="pm-icon">📋</div>
      <div class="pm-name">${pl.name}</div>
      <div class="pm-meta"><b>${ac}</b>/${list.length} AC</div>
    </div>`;
  }).join("");
  const unsolved=PROBLEMS.filter(p=>problemStatus(p.id)!=="done").sort((a,b)=>a.diff-b.diff).slice(0,6);
  const probHTML=unsolved.length?unsolved.map(p=>`
    <div class="home-prob-row" data-go="problem/${p.id}">
      <span class="hpr-id">P${String(p.no).padStart(3,"0")}</span>
      <span class="hpr-name">${p.title}</span>
      <span class="hpr-diff">${lvBadge(p)}</span>
    </div>`).join(""):'<div class="empty">全部题目已 AC，太强了！</div>';
  const userCardHTML=u?`
    <div class="user-card">
      <div class="big-avatar">${esc(u[0].toUpperCase())}</div>
      <div class="uname">${esc(u)}</div>
      <div class="udesc">CSP-S 备考选手</div>
      <div class="uc-stats">
        <div class="uc-stat"><div class="n">${s.full}</div><div class="l">已 AC</div></div>
        <div class="uc-stat"><div class="n">${s.rate}%</div><div class="l">得分率</div></div>
        <div class="uc-stat"><div class="n">${days}</div><div class="l">距考试</div></div>
      </div>
      <div style="margin-top:12px;display:flex;gap:6px;justify-content:center">
        <button class="btn btn-primary btn-sm" data-go="practice">开始刷题</button>
        <button class="btn btn-ghost btn-sm" data-go="records">我的记录</button>
      </div>
    </div>`:`
    <div class="user-card">
      <div class="big-avatar" style="background:#ccc">?</div>
      <div class="uname">未登录</div>
      <div class="udesc">登录后同步刷题进度</div>
      <button class="btn btn-primary btn-sm" onclick="document.getElementById('loginModal').classList.remove('hidden');document.getElementById('loginUser').focus()">立即登录</button>
    </div>`;
  app.innerHTML=`
  <div class="main-layout">
    <div>
      <div class="card mb" style="background:linear-gradient(135deg,#00a65a,#00c870);color:#fff;border:none;padding:18px 20px">
        <div style="font-size:18px;font-weight:700;margin-bottom:4px">CSP-S 2026 第二轮备考</div>
        <div style="font-size:13px;opacity:.9">机试 4 题 × 100 分 = 400 分 · 2026-10-31 14:30–18:30 · 距考试还有 <b>${days}</b> 天</div>
      </div>
      <div class="card mb">
        <div class="card-hd">📋 推荐题单 <span class="more"><a data-go="playlists">查看全部 →</a></span></div>
        <div class="card-bd">${plHTML}</div>
      </div>
      <div class="card">
        <div class="card-hd">🔥 推荐练习 <span class="more">按难度排序，挑你没 AC 的</span></div>
        <div class="card-bd">${probHTML}</div>
      </div>
    </div>
    <div>
      <div class="card mb">${userCardHTML}</div>
      <div class="card mb">
        <div class="card-hd">📊 难度分布</div>
        <div class="card-bd">
          <div class="lvbar">${distBar}</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:12px;color:var(--muted);margin-top:8px">
            ${Object.keys(LEVELS).map(k=>{const L=LEVELS[k];const [ac,tot]=dist[k];return `<span><span class="diff diff-${k}">${L.name}</span> ${ac}/${tot}</span>`;}).join("")}
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-hd">⚡ 快捷入口</div>
        <div class="card-bd" style="display:flex;flex-direction:column;gap:6px">
          <a class="btn btn-ghost btn-sm" data-go="practice" style="display:block;text-align:center">题库（${PROBLEMS.length} 题）</a>
          <a class="btn btn-ghost btn-sm" data-go="mock" style="display:block;text-align:center">模拟赛（3 套）</a>
          <a class="btn btn-ghost btn-sm" data-go="knowledge" style="display:block;text-align:center">知识图谱</a>
        </div>
      </div>
    </div>
  </div>`;
  afterRender();
}
let pfState={q:"",level:0,status:"all",fav:false};
function renderPracticeList(){
  let html=`<h2 style="margin-bottom:10px">题库</h2>`;
  html+=`<div class="searchbox"><span style="opacity:.5">🔍</span><input id="pfQ" placeholder="搜索题号 / 标题 / 考点…（如 背包、Dijkstra、p08）" value="${esc(pfState.q)}"></div>`;
  html+=`<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
    <span class="sub" style="margin:0">难度：</span>
    <span class="chip ${pfState.level===0?'on':''}" data-lv="0">全部</span>
    ${Object.keys(LEVELS).map(k=>`<span class="chip ${pfState.level==k?'on':''}" data-lv="${k}"><span class="diff diff-${k}" style="font-size:11px">${LEVELS[k].name}</span></span>`).join("")}
    <span class="sub" style="margin:0 0 0 12px">状态：</span>
    ${[["all","全部"],["done","已 AC"],["part","部分分"],["none","未做"]].map(([v,l])=>`<span class="chip ${pfState.status===v?'on':''}" data-st="${v}">${l}</span>`).join("")}
    <span class="chip ${pfState.fav?'on':''}" id="favFilter" style="margin-left:12px">★ 收藏</span>
    <button class="rand-btn" id="randBtn" style="margin-left:auto">🎲 随机一题</button>
  </div>`;
  const q=pfState.q.trim().toLowerCase();
  const favSet=new Set(getFav());
  const match=p=>{
    if(pfState.level&&p.diff!=pfState.level)return false;
    if(pfState.status!=="all"&&problemStatus(p.id)!==pfState.status)return false;
    if(pfState.fav&&!favSet.has(p.id))return false;
    if(q){const hay=(p.id+" "+p.title+" "+p.tag+" "+p.knowledge.join(" ")+" "+p.tier).toLowerCase();if(!hay.includes(q))return false;}
    return true;
  };
  const list=PROBLEMS.filter(match);
  const stMap={done:["✔ AC","st-done"],part:["部分分","st-part"],wa:["再试","st-wa"],none:["未做","st-none"]};
  html+=`<div class="card" style="padding:0;overflow:hidden"><table>
    <thead><tr><th style="width:70px">题号</th><th>题目名称</th><th style="width:200px">算法标签</th><th style="width:90px">难度</th><th style="width:80px;text-align:right">状态</th></tr></thead>
    <tbody>${list.map(p=>{
      const st=problemStatus(p.id); const m=stMap[st];
      return `<tr data-go="problem/${p.id}" style="cursor:pointer">
        <td style="font-family:Consolas,monospace;color:var(--muted);font-size:12.5px">P${String(p.no).padStart(3,"0")}</td>
        <td>${p.title}</td>
        <td style="font-size:12.5px;color:#999">${p.knowledge.slice(0,2).map(k=>`<span class="tag t-know">${esc(k)}</span>`).join(" ")}</td>
        <td>${lvBadge(p)}</td>
        <td style="text-align:right"><span class="st ${m[1]}">${m[0]}</span></td>
      </tr>`;
    }).join("")}</tbody></table>
    ${list.length?'':`<div class="empty">没有匹配的题目</div>`}
  </div>`;
  app.innerHTML=html; afterRender();
  const qi=document.getElementById("pfQ");
  qi.oninput=e=>{pfState.q=e.target.value; renderPracticeList(); const nq=document.getElementById("pfQ"); nq.focus(); nq.setSelectionRange(nq.value.length,nq.value.length);};
  document.querySelectorAll("[data-lv]").forEach(c=>c.onclick=()=>{pfState.level=Number(c.dataset.lv);renderPracticeList();});
  document.querySelectorAll("[data-st]").forEach(c=>c.onclick=()=>{pfState.status=c.dataset.st;renderPracticeList();});
  document.getElementById("favFilter").onclick=()=>{pfState.fav=!pfState.fav;renderPracticeList();};
  document.getElementById("randBtn").onclick=()=>{
    const pool=PROBLEMS.filter(match);
    if(!pool.length){alert("当前筛选下没有题目");return;}
    const p=pool[Math.floor(Math.random()*pool.length)];
    location.hash="#/problem/"+p.id;
  };
}
function renderPlaylists(){
  let html=header("题单 · 专题训练","按知识点分组的刷题路径（参考洛谷题单）。");
  html+=`<div class="grid g3">`;
  for(const pl of PLAYLISTS){
    const list=pl.probs.map(id=>PROBLEMS.find(p=>p.id===id));
    const ac=list.filter(p=>problemStatus(p.id)==="done").length;
    html+=`<div class="card pl-card"><h3>${pl.name}</h3><div class="sub">${pl.desc}</div>
      <div class="sub" style="margin:0">进度 <b>${ac}/${list.length}</b> 已 AC</div>
      <div class="bar" style="margin:6px 0 4px"><i style="width:${list.length?ac/list.length*100:0}%"></i></div>
      <div class="plist">${list.map(p=>`<span class="pl-chip" data-go="problem/${p.id}">${lvBadge(p)} ${p.title}${problemStatus(p.id)==="done"?" ✔":""}</span>`).join("")}</div>
    </div>`;
  }
  html+=`</div>`;
  app.innerHTML=html; afterRender();
}
function knowCardHTML(p){
  const know=getKnow();
  return `<div class="mb" style="margin-top:16px">
    <h3 style="margin-bottom:4px">知识点卡片</h3>
    <div class="sub" style="margin:0 0 8px">做错本题会自动标记为「待巩固」；AC 后记为「已掌握」。</div>
    <div class="kcard-row">
    ${p.knowledge.map(k=>{
      const st=know[k];
      const cls=st==="1"?"mastered":st==="2"?"flagged":"";
      const stCls=st==="1"?"ks-ok":st==="2"?"ks-review":"ks-none";
      const stTxt=st==="1"?"✔ 已掌握":st==="2"?"⚠ 待巩固":"○ 未标记";
      return `<div class="kcard ${cls}" data-know="${esc(k)}"><div class="kc-name">${esc(k)}</div><span class="kc-state ${stCls}">${stTxt}</span></div>`;
    }).join("")}
    </div></div>`;
}
function wireKnowCards(){
  document.querySelectorAll("[data-know]").forEach(c=>c.onclick=()=>{
    const k=c.dataset.know; const kk=getKnow();
    const cur=kk[k]; kk[k]=(cur==="1")?"2":(cur==="2"?undefined:"1");
    if(kk[k]===undefined)delete kk[k];
    saveKnow(kk); renderProblem(currentProblem.id, currentPre||{});
  });
}
let vizTimer=null, vizIdx=0, vizFrames=[], vizPlaying=false, vizSpeed=1200;
function renderInlineViz(pid){
  if(!VIZ[pid]) return "";
  return `<div class="card mb" style="margin-top:16px" id="vizWrap">
    <h3 style="margin-bottom:2px">▶ 算法可视化 <span style="font-weight:400;font-size:12.5px;color:var(--muted)">同屏对照正确算法</span></h3>
    <div class="sub" style="margin-bottom:8px">逐步演示正确算法，再点「跑我的算法并对比」把你的代码真实跑一遍。</div>
    <div class="viz-ctl">
      <button class="btn btn-ghost btn-sm" id="ivPrev">⏮ 上一步</button>
      <button class="btn btn-primary btn-sm" id="ivPlay">▶ 播放</button>
      <button class="btn btn-ghost btn-sm" id="ivNext">下一步 ⏭</button>
      <select class="tpl" id="ivSpeed"><option value="1600">慢</option><option value="1000" selected>中</option><option value="500">快</option></select>
      <span class="prog" id="ivProg"></span>
    </div>
    <div class="viz-stage" id="ivStage" style="min-height:200px"></div>
    <div class="viz-desc" id="ivDesc"></div>
    <div class="minebox">
      <button class="btn btn-primary btn-sm" id="runMine">▶ 跑我的算法并对比</button>
      <div class="sub" style="margin:6px 0 0">用你编辑器里的 C++ 代码在本题小输入上真实运行，和正确算法逐行对比。</div>
      <div id="mineResult"></div>
    </div>
  </div>`;
}
function wireInlineViz(pid){
  if(!VIZ[pid]) return;
  stopViz(); vizPlaying=false; vizFrames=VIZ[pid](); vizIdx=0; vizSpeed=1200;
  document.getElementById("ivPrev").onclick=()=>{vizPlaying=false;stopViz();vizIdx=Math.max(0,vizIdx-1);drawIv();};
  document.getElementById("ivNext").onclick=()=>{vizPlaying=false;stopViz();vizIdx=Math.min(vizFrames.length-1,vizIdx+1);drawIv();};
  const pl=document.getElementById("ivPlay");
  pl.onclick=()=>{vizPlaying=!vizPlaying;pl.textContent=vizPlaying?"⏸ 暂停":"▶ 播放";if(vizPlaying)startIv();};
  document.getElementById("ivSpeed").onchange=e=>{vizSpeed=Number(e.target.value);if(vizPlaying){stopViz();startIv();}};
  document.getElementById("runMine").onclick=()=>runMineCompare(pid);
  drawIv();
}
function drawIv(){
  const f=vizFrames[vizIdx];
  document.getElementById("ivStage").innerHTML=f.body;
  document.getElementById("ivDesc").textContent="步骤 "+(vizIdx+1)+" / "+vizFrames.length+"："+f.t;
  document.getElementById("ivProg").textContent=vizIdx+1+" / "+vizFrames.length;
}
function startIv(){vizTimer=setInterval(()=>{if(vizIdx>=vizFrames.length-1){vizPlaying=false;stopViz();document.getElementById("ivPlay").textContent="▶ 播放";return;}vizIdx++;drawIv();},vizSpeed);}
function stopViz(){if(vizTimer){clearInterval(vizTimer);vizTimer=null;}}
async function runMineCompare(pid){
  const tr=VIZ_TRACE[pid];
  const out=document.getElementById("mineResult");
  if(!tr){out.innerHTML="<div class='sub'>本题暂未提供对比输入。</div>";return;}
  const code=editor?editor.getValue():DEFAULT_CODE;
  out.innerHTML='<div class="sub" style="margin-top:8px"><span class="spinner"></span> 正在编译运行你的代码…</div>';
  const r=await execWandbox(code,tr.input);
  if(r.verdict!=="RUN"){
    out.innerHTML=`<div class="minecmp bad">⚠ 你的代码没能跑起来：<b>${r.verdict}</b> ${esc((r.detail||"").slice(0,200))}</div>`;
    return;
  }
  const got=normOut(r.out), want=normOut(tr.expected);
  const ok=got===want;
  const pieces = tr.tokenMode==="line" ? got.split("\n").filter(x=>x.trim()!=="") : got.split(/\s+/).filter(x=>x!=="");
  const checks=(tr.checks||[]).map((c,i)=>{const mine=pieces[i]??"(缺)";return{...c,mine,pass:mine===c.expect};});
  const firstBad=checks.findIndex(c=>!c.pass);
  const chips=checks.map(c=>`<span class="ck ${c.pass?'ok':'bad'}" ${c.pass?'':`onclick="vizJumpTo(${c.at})"`}>${esc(c.label)}：${esc(c.mine)} ${c.pass?'✔':'✗ 应='+esc(c.expect)}</span>`).join("");
  out.innerHTML=`<div class="minecmp ${ok?'ok':'bad'}">
    <div><b>${ok?'✅ 结果一致':'❌ 结果不一致'}</b>${r.ms?' <small>('+r.ms+'ms)</small>':''}</div>
    <div style="font-family:Consolas,monospace;font-size:13px;margin-top:6px;line-height:1.9">
      输入：<code class="kbd">${esc(tr.input.trim().replace(/\n/g,' / '))}</code><br>
      你的：<code class="kbd">${esc(got.slice(0,200))||'(空)'}</code><br>
      正确：<code class="kbd">${esc(want.slice(0,200))}</code>
    </div>
    <div class="lk-check">${chips}</div>
    ${ok?'<div class="sub" style="margin-top:8px;color:#14532d">全部正确，去提交评测跑全部测试点。</div>':'<div class="sub" style="margin-top:8px;color:#7f1d1d">点红色格子跳到正确算法对应步骤对照。</div>'}
  </div>`;
  if(firstBad>=0)vizJumpTo(checks[firstBad].at,true);
}
function vizJumpTo(frameIdx,flash){
  vizIdx=Math.max(0,Math.min(vizFrames.length-1,frameIdx));drawIv();
  const st=document.getElementById("ivStage");
  if(st){st.classList.add("flash-bad");setTimeout(()=>st.classList.remove("flash-bad"),2000);}
}
let editor=null,currentProblem=null,currentPre=null,submitting=false,mockCtx=null;
function initEditor(){
  if(editor)return;
  if(window.CodeMirror){
    editor=CodeMirror(document.getElementById("ed"),{value:DEFAULT_CODE,mode:"text/x-c++src",lineNumbers:true,lineWrapping:false,theme:"default",indentUnit:4,tabSize:4,styleActiveLine:true,extraKeys:{"Tab":cm=>cm.replaceSelection("    ")}});
  }else{
    const ta=document.getElementById("ed");ta.removeAttribute("hidden");editor={getValue:()=>ta.value,setValue:v=>{ta.value=v},replaceSelection:v=>{ta.value+=v;},focus:()=>ta.focus(),isTA:true};
  }
}
let probTab="statement";
function renderProblem(id,pre){
  const p=PROBLEMS.find(x=>x.id===id);if(!p)return renderPracticeList();
  currentProblem=p;currentPre=pre||{};
  const inMock=!!(pre&&pre.mock);
  const btn=inMock?"提交到模拟赛":"提交评测";
  const bs=bestScore(id),sc=submitCount(id);
  const hasViz=!!VIZ[id];
  const passRate=p.judge.length?Math.round(bestScore(id)/p.points*100):0;
  const isFav=getFav().includes(id);
  const discuss=getDiscuss(id);
  const mySubs=getSubs().filter(s=>s.problem===id).reverse();
  const acCount=mySubs.filter(s=>s.score>=100).length;
  const statementHTML=`
    <h1 style="font-size:20px;font-weight:700;margin-bottom:6px">${p.title} ${lvBadge(p)}</h1>
    <div class="meta" style="font-size:12.5px;color:var(--muted);margin-bottom:14px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">${p.constraints} · ${p.tier} · ${p.tag}</div>
    <h3 style="font-size:14.5px;font-weight:700;margin:14px 0 6px;padding-left:8px;border-left:3px solid var(--brand)">题目描述</h3><p class="mb" style="font-size:14px;line-height:1.8;margin-bottom:8px">${p.statement}</p>
    <h3 style="font-size:14.5px;font-weight:700;margin:14px 0 6px;padding-left:8px;border-left:3px solid var(--brand)">输入格式</h3><p class="mb" style="font-size:14px;line-height:1.8;margin-bottom:8px">${p.inputFormat}</p>
    <h3 style="font-size:14.5px;font-weight:700;margin:14px 0 6px;padding-left:8px;border-left:3px solid var(--brand)">输出格式</h3><p class="mb" style="font-size:14px;line-height:1.8;margin-bottom:8px">${p.outputFormat}</p>
    <h3 style="font-size:14.5px;font-weight:700;margin:14px 0 6px;padding-left:8px;border-left:3px solid var(--brand)">样例 #1</h3>
    <div class="sample-box"><div class="lbl">输入</div>${esc(p.sample.input)}</div>
    <div class="sample-box"><div class="lbl">输出</div>${esc(p.sample.output)}</div>
    <h3 style="font-size:14.5px;font-weight:700;margin:14px 0 6px;padding-left:8px;border-left:3px solid var(--brand)">提示 / 说明</h3>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin:8px 0">
      <button class="btn btn-ghost btn-sm" id="showSol">查看思路解析</button>
    </div>
    <div class="solbox hidden" id="solbox">${p.solution}</div>
    ${knowCardHTML(p)}
    ${hasViz?renderInlineViz(p):""}`;
  const stdCode=STD_CODE[id]||"// 暂无";
  const tutorialHTML=`
    <h3 style="font-size:14.5px;font-weight:700;margin:14px 0 6px;padding-left:8px;border-left:3px solid var(--brand)">思路分析</h3>
    <div style="font-size:14px;line-height:1.8;margin-bottom:14px">${p.solution}</div>
    <h3 style="font-size:14.5px;font-weight:700;margin:14px 0 6px;padding-left:8px;border-left:3px solid var(--brand)">标准程序（C++17）</h3>
    <div style="display:flex;align-items:center;gap:8px;margin:6px 0">
      <span class="tag t-tag">C++17</span>
      <button class="btn btn-ghost btn-sm" id="copyStd">复制代码</button>
      <button class="btn btn-ghost btn-sm" id="loadStd">载入到编辑器</button>
    </div>
    <pre class="tut-code" id="stdCode">${esc(stdCode)}</pre>`;
  const discussHTML=`
    <div style="display:flex;gap:10px;align-items:center;margin-bottom:12px">
      <h3 style="margin:0">讨论区</h3><span class="tag t-tag">${discuss.length} 条</span>
    </div>
    <div style="margin-bottom:14px">
      <textarea class="disc-input" id="discInput" placeholder="发表你的想法…"></textarea>
      <div style="display:flex;gap:8px;margin-top:6px;align-items:center">
        <input id="discUser" style="border:1px solid var(--line);border-radius:3px;padding:6px 10px;font-size:13px;width:140px" placeholder="昵称" value="备考选手">
        <button class="btn btn-primary btn-sm" id="postDisc">发表讨论</button>
      </div>
    </div>
    <div id="discList">
    ${discuss.length?discuss.map(d=>{const dt=new Date(d.time);return `<div class="disc-item"><div class="disc-head"><div class="disc-avatar">${(d.user||"匿")[0]}</div><span class="disc-user">${esc(d.user||"匿名用户")}</span><span class="disc-time">${dt.getMonth()+1}-${dt.getDate()} ${normDate(dt.getHours())}:${normDate(dt.getMinutes())}</span></div><div class="disc-content">${esc(d.content)}</div></div>`;}).join(""):'<div class="empty">还没有讨论，来发表第一条吧！</div>'}
    </div>`;
  const subsHTML=`
    <h3>我的提交记录</h3>
    <div class="sub" style="margin-bottom:8px">共 ${mySubs.length} 次提交，${acCount} 次通过</div>
    ${mySubs.length?`<div style="border:1px solid var(--line);border-radius:3px;overflow:hidden">
      ${mySubs.map(s=>{const dt=new Date(s.time);const cls=s.score>=100?"st-done":s.score>0?"st-part":"st-wa";const lbl=s.score>=100?"AC":s.score>0?"部分分":"未通过";return `<div class="sub-row" data-subid="${s.id}"><span class="sid">#${s.id.slice(-6)}</span><span class="st ${cls}">${lbl}</span><span style="flex:1;color:var(--muted);font-size:12px">${dt.getMonth()+1}-${dt.getDate()} ${normDate(dt.getHours())}:${normDate(dt.getMinutes())}</span><span style="font-weight:700">${s.score}/100</span><span style="color:var(--brand);font-size:12px">详情 →</span></div>`;}).join("")}
    </div><div id="subDetail" class="mt" style="display:none"></div>`:'<div class="empty">还没有提交记录</div>'}`;
  const tabContent={statement:statementHTML,tutorial:tutorialHTML,discuss:discussHTML,submissions:subsHTML};
  const tabs=[["statement","题面"],["tutorial","题解"],["discuss","讨论",discuss.length],["submissions","我的提交",mySubs.length]];
  app.innerHTML=`
  <div class="breadcrumb" style="font-size:13px;color:var(--muted);margin-bottom:10px">
    <a data-go="${inMock?`mockExam/${pre.mock}`:"practice"}" style="cursor:pointer">题库</a> /
    <span style="font-family:Consolas,monospace;color:var(--brand);font-weight:700">P${String(p.no).padStart(3,"0")}</span> <b>${p.title}</b>
    <span style="float:right"><a data-go="${inMock?`mockExam/${pre.mock}`:"practice"}" style="cursor:pointer">← 返回</a></span>
  </div>
  <div class="problem-layout">
    <div class="panel">
      <div class="lgtabs">
        ${tabs.map(([k,l,c])=>`<span class="lgtab ${probTab===k?'on':''}" data-ptab="${k}">${l}${c!==undefined?`<span class="cnt">${c}</span>`:""}</span>`).join("")}
        <span style="margin-left:auto;padding:10px 16px;cursor:pointer;font-size:18px" class="fav-btn ${isFav?'on':''}" id="favBtn">${isFav?'★':'☆'}</span>
      </div>
      <div style="padding:16px 18px" id="tabBody">${tabContent[probTab]||statementHTML}</div>
    </div>
    <div>
      <div class="panel mb">
        <div class="panel-hd">题目信息</div>
        <div style="padding:6px 0;font-size:13.5px">
          <div class="info-row"><span>难度</span><span>${lvBadge(p)}</span></div>
          <div class="info-row"><span>时间/空间</span><span>${p.constraints}</span></div>
          <div class="info-row"><span>分值</span><span><b>${p.points}</b> 分</span></div>
          <div class="info-row"><span>考点</span><span style="text-align:right;max-width:180px">${p.knowledge.map(k=>`<span class="tag t-know">${esc(k)}</span>`).join("")}</span></div>
          <div class="info-row"><span>我的最佳</span><span><b class="${bs>=100?"v-AC":bs>0?"v-RE":"v-WA"}">${bs}/100</b></span></div>
          <div class="info-row"><span>提交次数</span><span><b>${sc}</b></span></div>
          <div class="info-row"><span>得分率</span><span style="text-align:right"><div class="bar" style="width:100px;display:inline-block;vertical-align:middle"><i style="width:${passRate}%"></i></div> ${passRate}%</span></div>
        </div>
      </div>
      <div class="panel">
        <div class="editor-tools">
          <b style="font-size:13px">main.cpp</b><span class="tag t-tag">C++17</span>
          <select class="tpl" id="tplSel"><option value="">+ 代码模板</option>${Object.keys(TEMPLATES).map(k=>`<option value="${esc(k)}">${esc(k)}</option>`).join("")}</select>
          <span class="btns">
            <button class="btn btn-ghost btn-sm" id="resetCode">重置</button>
            <button class="btn btn-primary" id="submitBtn">${btn}</button>
          </span>
        </div>
        <textarea id="ed" spellcheck="false" style="width:100%;height:380px;background:var(--editor);color:#e2e8f0;border:none;padding:12px;font-family:ui-monospace,Consolas,monospace;font-size:13px" hidden>${DEFAULT_CODE}</textarea>
        <div id="edhost"></div>
      </div>
      <div class="panel mt" id="resultPanel">
        <div class="panel-hd">评测结果 <span style="margin-left:auto;font-weight:600" id="resScore"></span></div>
        <div id="resBody"><div class="empty">提交代码后实时评测。</div></div>
      </div>
    </div>
  </div>`;
  document.querySelectorAll("[data-ptab]").forEach(t=>t.onclick=()=>{probTab=t.dataset.ptab;renderProblem(id,pre);});
  document.getElementById("favBtn").onclick=()=>{toggleFav(id);renderProblem(id,pre);};
  const eh=document.getElementById("edhost"),ta=document.getElementById("ed");
  if(window.CodeMirror){eh.appendChild(ta);initEditor();}else{ta.hidden=false;initEditor();}
  const saved=LS.get("csps_code_"+id,null);
  if(saved)editor.setValue(saved);
  document.getElementById("submitBtn").onclick=()=>submit(id,pre);
  document.getElementById("resetCode").onclick=()=>{editor.setValue(DEFAULT_CODE);LS.set("csps_code_"+id,DEFAULT_CODE);};
  document.getElementById("tplSel").onchange=e=>{const k=e.target.value;if(!k)return;const tpl="\n"+TEMPLATES[k]+"\n";if(editor.replaceSelection)editor.replaceSelection(tpl);else editor.setValue(editor.getValue()+tpl);editor.focus&&editor.focus();e.target.value="";};
  if(probTab==="statement"){
    const solBtn=document.getElementById("showSol");
    if(solBtn)solBtn.onclick=e=>{document.getElementById("solbox").classList.toggle("hidden");e.currentTarget.textContent=document.getElementById("solbox").classList.contains("hidden")?"查看思路解析":"收起解析";};
    wireInlineViz(id);wireKnowCards();
  }
  if(probTab==="tutorial"){
    const cb=document.getElementById("copyStd");if(cb)cb.onclick=()=>navigator.clipboard.writeText(stdCode).then(()=>{cb.textContent="已复制✓";setTimeout(()=>cb.textContent="复制代码",1500);});
    const lb=document.getElementById("loadStd");if(lb)lb.onclick=()=>{editor.setValue(stdCode);LS.set("csps_code_"+id,stdCode);lb.textContent="已载入✓";setTimeout(()=>lb.textContent="载入到编辑器",1500);};
  }
  if(probTab==="discuss"){
    const pb=document.getElementById("postDisc");if(pb)pb.onclick=()=>{const c=document.getElementById("discInput").value.trim();const u=document.getElementById("discUser").value.trim()||"匿名用户";if(!c){alert("请输入内容");return;}addDiscuss(id,c,u);probTab="discuss";renderProblem(id,pre);};
  }
  if(probTab==="submissions"){
    document.querySelectorAll(".sub-row").forEach(row=>row.onclick=()=>{
      const sid=row.dataset.subid;const sub=getSubs().find(s=>s.id===sid);if(!sub)return;
      const det=document.getElementById("subDetail");det.style.display="block";
      det.innerHTML=`<div class="panel" style="padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <b>提交 #${sid.slice(-6)}</b><span class="v-${sub.score>=100?'AC':'WA'}">${sub.score}/100</span>
        </div>
        ${sub.details?`<div style="margin-bottom:10px">${sub.details.map(d=>`<div style="display:flex;gap:10px;padding:5px 0;border-bottom:1px solid var(--line);font-size:13px"><span style="width:60px;color:var(--muted)">点${d.i}</span><span class="v-${d.verdict}" style="width:70px">${d.verdict}</span>${d.verdict==="WA"?`<span style="font-size:12px;color:var(--muted)">你的:<code class="kbd">${esc((d.out||"").slice(0,60))}</code> 期望:<code class="kbd">${esc((d.expect||"").slice(0,60))}</code></span>`:""}</div>`).join("")}</div>`:""}
        <pre class="tut-code" style="max-height:300px">${esc(sub.code)}</pre></div>`;
      det.scrollIntoView({behavior:"smooth",block:"nearest"});
    });
  }
  afterRender();
}
async function submit(id,pre){
  if(submitting)return;submitting=true;
  const p=PROBLEMS.find(x=>x.id===id);const code=editor.getValue();LS.set("csps_code_"+id,code);
  const btn=document.getElementById("submitBtn");btn.disabled=true;btn.innerHTML='<span class="spinner"></span> 评测中…';
  const resBody=document.getElementById("resBody"),resScore=document.getElementById("resScore");
  resScore.textContent="";
  const rows=[],results=[];let score=0,ce=false;
  const vl={AC:"AC 正确",WA:"WA 答案错误",RE:"RE 运行错误",CE:"CE 编译错误",TLE:"TLE/无响应",ERR:"服务异常"};
  for(let i=0;i<p.judge.length;i++){
    const t=p.judge[i];
    rows.push(`<div class="result-item"><span>测试点 ${i+1} <span class="ti">${t.score}分</span></span><span class="spinner"></span></div>`);
    resBody.innerHTML=rows.join("");
    const r=await judgeTest(code,t);
    results.push({i:i+1,score:t.score,verdict:r.verdict,ms:r.ms,out:r.out,detail:r.detail,expect:t.output});
    if(ce){}else if(r.verdict==="CE"){ce=true;score=0;}else if(r.verdict==="AC")score+=t.score;
    let d="";
    if(r.verdict==="WA")d=`<div class="sub" style="margin-top:6px">${esc(r.detail)}<br>你的：<code class="kbd">${esc((r.out||"").slice(0,120))}</code> 期望：<code class="kbd">${esc((t.output||"").slice(0,120))}</code></div>`;
    else if(r.verdict==="CE")d=`<div class="sub" style="margin-top:6px"><pre class="detail-pre">${esc(r.detail||"")}</pre></div>`;
    else if(r.verdict==="RE")d=`<div class="sub" style="margin-top:6px">${esc(r.detail||"")}</div>`;
    rows[i]=`<div class="result-item"><span>测试点 ${i+1} <span class="ti">${t.score}分</span></span><span class="v-${r.verdict}">${vl[r.verdict]}${r.ms?" · "+r.ms+"ms":""}</span></div>${d}`;
    resBody.innerHTML=rows.join("");
    await new Promise(r=>setTimeout(r,120));
  }
  if(ce){resBody.innerHTML=rows.join("");resScore.innerHTML='<span class="v-CE">编译错误 · 0 分</span>';}
  else resScore.innerHTML=`<span class="v-${score>=100?"AC":"WA"}" style="font-size:18px">${score} / 100</span>`;
  const vb=score>=100?"AC":(ce?"CE":(score>0?"部分":"WA"));
  const rec={id:uid(),time:Date.now(),problem:id,title:p.title,tier:p.tier,score,verdict:vb,code,mode:pre&&pre.mock?"mock":"practice",mockId:pre&&pre.mock?pre.mock:undefined,details:results};
  const subs=getSubs();subs.push(rec);saveSubs(subs);
  if(score>0&&score<100){const w=getWrong();if(!w.find(x=>x.problem===id))w.push({problem:id,title:p.title,score});saveWrong(w);}
  {const kk=getKnow();let ch=false;for(const k of p.knowledge){if(score>=100){if(kk[k]!=="1"){kk[k]="1";ch=true;}}else{if(kk[k]!=="1"){kk[k]="2";ch=true;}}}
  if(ch){saveKnow(kk);const box=document.querySelector(".kcard-row");if(box){p.knowledge.forEach((k,i)=>{const st=kk[k];const card=document.querySelectorAll("[data-know]")[i];if(!card)return;card.className="kcard "+(st==="1"?"mastered":st==="2"?"flagged":"");const sc=card.querySelector(".kc-state");sc.className="kc-state "+(st==="1"?"ks-ok":st==="2"?"ks-review":"ks-none");sc.textContent=st==="1"?"✔ 已掌握":st==="2"?"⚠ 待巩固":"○ 未标记";});}}}
  if(pre&&pre.mock)syncMockUI();
  submitting=false;btn.disabled=false;btn.textContent=pre&&pre.mock?"提交到模拟赛":"提交评测";
}
function renderMockList(){
  let html=header("模拟赛 · 全真上机","3 套模拟卷，每套 4 题 400 分，限时 240 分钟。");
  html+=`<div class="grid g3 mb">`;
  for(const m of MOCK_EXAMS){
    const bs=LS.get("csps_mockscore_"+m.id,null);
    html+=`<div class="card"><h3>${m.name}</h3><div class="sub">${m.problems.map(id=>PROBLEMS.find(p=>p.id===id).title).join(" · ")}</div>${bs!=null?`<div class="stat" style="padding:10px 0;border:none;box-shadow:none"><span class="v" style="font-size:22px">${bs}</span><small>/400</small></div>`:""}<a class="btn btn-primary" data-go="mockExam/${m.id}">${bs!=null?"再次挑战":"开始模拟赛"}</a></div>`;
  }
  html+=`</div><div class="card"><h3>使用说明</h3><div class="sub" style="margin:0"><ul style="padding-left:20px;line-height:2"><li>开赛后倒计时 240 分钟，可在顶部栏切换题目。</li><li>每题可多次提交，以最高分计入总分。</li><li>时间到自动锁定，刷新后可查看成绩。</li></ul></div></div>`;
  app.innerHTML=html;afterRender();
}
function renderMock(mid){
  const m=MOCK_EXAMS.find(x=>x.id===mid);if(!m)return renderMockList();
  const dl=Number(LS.get(MOCK_DEADLINE_KEY,0)),now=Date.now();
  if(!dl||now>=dl){LS.set(MOCK_DEADLINE_KEY,now+m.minutes*60000);LS.set("csps_mockset_"+mid,m.problems);}
  mockCtx={mid,problems:m.problems,minutes:m.minutes};showMockbar(mockCtx);renderProblem(m.problems[0],{mock:mid});syncMockUI();tickMock();
}
function showMockbar(ctx){
  const bar=document.getElementById("mockbar");bar.classList.remove("hidden");
  document.getElementById("mockprobs").innerHTML=ctx.problems.map(id=>{const p=PROBLEMS.find(x=>x.id===id);const b=bestMockScore(ctx.mid,id);return `<span class="pb" data-go="problem/${id}" data-mock="${ctx.mid}">${p.tier}${b>=100?" ✔":""}</span>`;}).join("");
  document.querySelectorAll("#mockbar .pb").forEach(el=>el.onclick=()=>{nav("problem/"+el.dataset.go.split("/")[1],{mock:el.dataset.mock});syncMockUI();});
}
function bestMockScore(mid,id){const s=getSubs().filter(x=>x.mode==="mock"&&x.problem===id&&mockCtx&&x.mockId===mid);if(!s.length)return 0;return Math.max(...s.map(x=>x.score));}
function tickMock(){
  const el=document.getElementById("mocktime");
  const iv=setInterval(()=>{
    const dl=Number(LS.get(MOCK_DEADLINE_KEY,0)),left=Math.max(0,dl-Date.now());
    const h=Math.floor(left/3600000),m=Math.floor(left%3600000/60000),s=Math.floor(left%60000/1000);
    el.textContent=`${h}:${normDate(m)}:${normDate(s)}`;
    if(left<=0){clearInterval(iv);let t=0;for(const sp of(mockCtx?mockCtx.problems:[]))t+=bestMockScore(mockCtx.mid,sp);LS.set("csps_mockscore_"+mockCtx.mid,t);if(mockCtx){el.textContent="已结束";if(!LS.get("csps_mockend_"+mockCtx.mid)){LS.set("csps_mockend_"+mockCtx.mid,1);alert(`模拟赛结束！总分 ${t}/400`);}}}
  },1000);
}
function syncMockUI(){if(!mockCtx)return;const b=document.getElementById("mockbar");if(b.classList.contains("hidden"))b.classList.remove("hidden");showMockbar(mockCtx);}
function renderKnowledge(){
  const know=getKnow();let marked=0,mastered=0,total=0;
  for(const c of KNOWLEDGE)for(const it of c.items){total++;if(know[it]){marked++;if(know[it]==="1")mastered++;}}
  const pct=Math.round(mastered/total*100);
  let html=header("知识图谱 · 考点全覆盖","点击标签切换掌握/待巩固。");
  html+=`<div class="card mb" style="display:flex;align-items:center;gap:24px">
    <div class="ring" style="--p:${pct};--c:${pct>=70?"var(--d3)":"var(--brand)"}"><b>${pct}%</b></div>
    <div><div class="sub" style="margin:0">已掌握 ${mastered}/${total} 考点</div><div class="bar" style="width:260px;margin-top:8px"><i style="width:${pct}%"></i></div></div></div>`;
  for(const c of KNOWLEDGE){
    let ms=0;for(const it of c.items)if(know[it]==="1")ms++;
    const cp=Math.round(ms/c.items.length*100);
    html+=`<div class="card mb know-block"><div class="cat" style="font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:8px;font-size:14px"><span>${c.cat}</span><span class="tag t-tag">${ms}/${c.items.length}</span><span class="pct" style="margin-left:auto;font-size:12px;color:var(--muted);font-weight:400">${cp}%</span><div class="bar" style="width:120px;margin-left:6px"><i style="width:${cp}%"></i></div></div><div>${c.items.map(it=>{const st=know[it];return `<span class="chip ${st==="1"?"on":""}" data-k="${esc(it)}" ${st==="2"?"style='border-color:var(--red);color:var(--red)'":""}>${esc(it)}${st==="2"?"(待)":""}</span>`;}).join("")}</div></div>`;
  }
  app.innerHTML=html;afterRender();
  document.querySelectorAll("[data-k]").forEach(el=>el.onclick=()=>{const k=el.dataset.k;const cur=getKnow()[k];const nxt=cur==="1"?"2":"1";const kk=getKnow();kk[k]=nxt;saveKnow(kk);renderKnowledge();});
}
function renderRecords(){
  const subs=getSubs().slice().reverse(),wrong=getWrong(),dist=levelDist();
  let html=header("我的记录 · 提交历史与错题本","数据保存在本机浏览器。");
  html+=`<div class="card mb"><h3 style="font-size:14px;margin-bottom:6px">难度分布</h3><div class="lvbar">${Object.keys(LEVELS).map(k=>{const L=LEVELS[k];const[ac,tot]=dist[k];return `<div style="width:${tot/PROBLEMS.length*100}%;background:${L.color};opacity:${tot?0.35+0.65*(ac/tot):0.15}"></div>`;}).join("")}</div></div>`;
  html+=`<div class="grid g2 mb">
    <div class="card"><h3>错题本</h3>${wrong.length?wrong.map(w=>`<div class="home-prob-row" data-go="problem/${w.problem}"><span class="hpr-id" style="width:auto">${w.title}</span><span class="st st-wa">${w.score}分</span><span style="color:var(--brand);font-size:13px">去重做→</span></div>`).join(""):'<div class="empty">暂无错题</div>'}</div>
    <div class="card"><h3>已 AC</h3>${PROBLEMS.filter(p=>problemStatus(p.id)==="done").length?PROBLEMS.filter(p=>problemStatus(p.id)==="done").map(p=>`<div class="home-prob-row" data-go="problem/${p.id}"><span class="hpr-id" style="width:auto">${p.title}</span>${lvBadge(p)}<span class="st st-done">✔</span></div>`).join(""):'<div class="empty">还没有 AC</div>'}</div></div>`;
  html+=`<div class="card"><h3>提交记录</h3>${subs.length?`<table><thead><tr><th>时间</th><th>题目</th><th>类型</th><th>分数</th><th>结果</th></tr></thead><tbody>${subs.slice(0,120).map(s=>{const d=new Date(s.time);const cls={AC:"v-AC",WA:"v-WA",CE:"v-CE","部分":"v-WA"}[s.verdict]||"v-WA";return `<tr><td>${d.getMonth()+1}-${d.getDate()} ${normDate(d.getHours())}:${normDate(d.getMinutes())}</td><td>${esc(s.title)}</td><td>${s.mode==="mock"?"模拟赛":"练习"}</td><td><b>${s.score}</b></td><td class="${cls}">${s.verdict}</td></tr>`;}).join("")}</tbody></table>`:'<div class="empty">还没有提交记录</div>'}</div>`;
  app.innerHTML=html;afterRender();
}
function nav(hash,opts){
  const seg=hash.replace(/^#\//,"").split("/");
  document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===seg[0]));
  if(seg[0]==="problem")VIEWS.problem(seg[1],opts);
  else if(seg[0]==="mockExam")VIEWS.mockExam(seg[1]);
  else if(VIEWS[seg[0]])VIEWS[seg[0]]();
  else VIEWS.dashboard();
  window.scrollTo(0,0);
}
function afterRender(){
  document.querySelectorAll("[data-go]").forEach(a=>a.onclick=()=>nav(a.dataset.go,{mock:a.dataset.mock}));
  document.querySelectorAll("#nav button").forEach(b=>b.onclick=()=>nav(b.dataset.view));
}
function boot(){
  renderLoginArea();wireLogin();
  const ts=document.getElementById("topSearch");
  if(ts){ts.onkeydown=e=>{if(e.key==="Enter"){const v=ts.value.trim();if(!v)return;
    const m=v.match(/^[pP]?(\d+)$/); if(m){const pid="p"+String(m[1]).padStart(2,"0");const p=PROBLEMS.find(x=>x.id===pid);if(p){location.hash="#/problem/"+p.id;return;}}
    pfState={q:v,level:0,status:"all",fav:false}; location.hash="#/practice";
  }};}
  const cd=document.getElementById("cd");
  const tick=()=>{const left=countdownTo()-Date.now();if(left<=0){cd.textContent="考试已开始";return;}const d=Math.floor(left/86400000),h=Math.floor(left%86400000/3600000),m=Math.floor(left%3600000/60000);cd.textContent=`${d}天${h}时${m}分`;};
  tick();setInterval(tick,60000);
  const dl=Number(LS.get(MOCK_DEADLINE_KEY,0));
  if(dl>Date.now()){const mid=LS.get("csps_mockset_last","A");const ps=LS.get("csps_mockset_"+mid,[]);if(ps.length){mockCtx={mid,problems:ps};showMockbar(mockCtx);tickMock();}}
  nav(location.hash||"#/dashboard");
  window.addEventListener("hashchange",()=>nav(location.hash));
}
document.addEventListener("DOMContentLoaded",boot);
