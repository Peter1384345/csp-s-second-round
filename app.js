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

/*================ 判题（Wandbox） ================*/
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

/*================ 状态计算 ================*/
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

/* 难度分布（洛谷风格） */
function levelDist(){
  const dist={1:[0,0],2:[0,0],3:[0,0],4:[0,0]}; // [ac,total]
  for(const p of PROBLEMS){ dist[p.diff][1]++; if(problemStatus(p.id)==="done") dist[p.diff][0]++; }
  return dist;
}

/*================ 渲染 ================*/
const app=document.getElementById("app");
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

function header(title,sub){return `<h2>${title}</h2><div class="sub">${sub}</div>`;}
function diffStars(d){return `<span class="diff-star">${"★".repeat(d)}${"☆".repeat(5-d)}</span>`;}

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

/* ---------- 首页 ---------- */
function leaderboardHTML(s){
  const userScore=s.full*100+s.partial*30;
  const bench=[
    {name:"算法小能手",ac:16,score:1600},
    {name:"省队预备役",ac:14,score:1420},
    {name:"DP大师",ac:12,score:1250},
    {name:"图论爱好者",ac:10,score:1080},
    {name:"暴力出奇迹",ac:7,score:760},
    {name:"刚入门的萌新",ac:3,score:320},
  ];
  const me={name:"我（当前账号）",ac:s.full,score:userScore,isMe:true};
  const all=[...bench,me].sort((a,b)=>b.score-a.score||b.ac-a.ac);
  const myRank=all.findIndex(x=>x.isMe)+1;
  return `<div class="card mb">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <h3 style="margin:0">🏆 备考排行榜</h3>
      <span class="sub" style="margin:0">你的排名：第 <b style="color:var(--brand)">${myRank}</b> / ${all.length} · AC ${s.full} 题</span>
    </div>
    ${all.map((x,i)=>`<div class="lb-row">
      <span class="lb-rank ${i===0?'r1':i===1?'r2':i===2?'r3':''}">${i+1}</span>
      <span style="width:28px;height:28px;border-radius:50%;background:${x.isMe?'linear-gradient(135deg,var(--brand),var(--brand2))':'#e2e8f0'};color:${x.isMe?'#fff':'#64748b'};display:grid;place-items:center;font-size:12px;font-weight:700">${x.name[0]}</span>
      <span class="lb-name" style="${x.isMe?'color:var(--brand);font-weight:800':''}">${x.name}${x.isMe?' 👈':''}</span>
      <span style="color:var(--muted);font-size:12px">AC ${x.ac}</span>
      <span class="lb-score">${x.score}</span>
    </div>`).join("")}
    <div class="sub" style="margin-top:8px;font-size:12px">积分 = AC题数×100 + 部分分题数×30。基准选手为模拟数据，激励你持续刷题。</div>
  </div>`;
}
function renderDashboard(){
  const s=stats();
  const cd=countdownTo()-Date.now();
  const days=Math.max(0,Math.ceil(cd/(86400000)));
  const dist=levelDist();
  const distBar=Object.keys(LEVELS).map(k=>{
    const L=LEVELS[k];const [ac,tot]=dist[k];const w=tot?ac/tot*100:0;
    return `<div style="width:${tot/PROBLEMS.length*100}%;background:${L.color};opacity:${tot?0.35+0.65*(ac/tot):0.15}" title="${L.name} ${ac}/${tot}"></div>`;
  }).join("");
  app.innerHTML=`
  ${header("CSP-S 2026 第二轮 · 高效备考","机试：现场上机编程 · 4 题 × 100 分 = 400 分 · 官方时间 2026-10-31 14:30–18:30")}
  <div class="alert warn mb"><div>📌</div><div><b>判题说明：</b>本站在浏览器中调用 <b>Wandbox</b> 公共编译服务实时运行你的 C++ 代码并按测试数据评分（GitHub Pages 无法直接编译 C++）。难度配色参考洛谷。评测结果以官方评测环境为准。</div></div>
  <div class="grid g4 mb">
    <div class="stat"><div class="k">距第二轮机试</div><div class="v">${days}<small> 天</small></div></div>
    <div class="stat"><div class="k">已 AC 题目</div><div class="v">${s.full}<small> / ${PROBLEMS.length}</small></div></div>
    <div class="stat"><div class="k">平均得分率</div><div class="v">${s.rate}<small>%</small></div></div>
    <div class="stat"><div class="k">已掌握考点</div><div class="v">${s.knowMastered}<small> / ${s.knowTotal}</small></div></div>
  </div>
  <div class="card mb">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px"><h3 style="margin:0">难度分布（洛谷配色）</h3><span class="sub" style="margin:0">色块越深 = 你在该难度 AC 越多</span></div>
    <div class="lvbar">${distBar}</div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--muted);margin-top:6px">
      ${Object.keys(LEVELS).map(k=>{const L=LEVELS[k];const [ac,tot]=dist[k];return `<span><span class="lv" style="background:${L.color}">${L.name}</span> ${ac}/${tot}</span>`;}).join("")}
    </div>
  </div>
  ${leaderboardHTML(s)}
  <div class="grid g2 mb">
    <div class="card">
      <h3>本轮怎么考</h3>
      <div class="sub">第二轮为上机编程，按测试数据给分，重点考察算法设计与代码实现能力。</div>
      <table><thead><tr><th>题型 / 位置</th><th>考察方向</th></tr></thead><tbody>
      <tr><td><b>T1</b> 基础模拟</td><td>读题、边界、实现稳定：模拟 / 前缀和 / 简单数学</td></tr>
      <tr><td><b>T2</b> 思维题</td><td>贪心、二分答案、搜索 BFS，常需观察性质</td></tr>
      <tr><td><b>T3</b> 工程模拟 / 数据结构</td><td>题面长、细节多、代码量大，常用单调栈 / 并查集 / BIT / 线段树</td></tr>
      <tr><td><b>T4</b> 高级算法</td><td>DP 优化、图论（最短路 / 树上 / 拓扑）、数论、字符串</td></tr>
      </tbody></table>
      <a class="btn btn-ghost mt" data-go="practice">进入题库开始刷题</a>
    </div>
    <div class="card">
      <h3>两轮对比</h3>
      <div class="sub">从第一轮到第二轮的备考思路切换。</div>
      <table class="compare"><thead><tr><th>维度</th><th>第一轮（笔试）</th><th>第二轮（机试）</th></tr></thead><tbody>
      ${ROUND_COMPARE.map(r=>`<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join("")}
      </tbody></table>
      <a class="btn btn-ghost mt" data-go="knowledge">查看考点全覆盖图谱</a>
    </div>
  </div>
  <div class="grid g3 mb">
    <div class="card"><h3>📚 全考点题库</h3><div class="sub">${PROBLEMS.length} 道题，支持搜索 / 难度筛选 / 标签筛选。</div><a class="btn btn-ghost" data-go="practice">刷题</a></div>
    <div class="card"><h3>📋 专题题单</h3><div class="sub">按知识点分组的刷题路径，像洛谷题单一样按专题突破。</div><a class="btn btn-ghost" data-go="playlists">看题单</a></div>
    <div class="card"><h3>⏱ 模拟赛</h3><div class="sub">3 套模拟卷，每套 4 题 400 分，限时 240 分钟。</div><a class="btn btn-ghost" data-go="mock">开赛</a></div>
  </div>
  <div class="card">
    <h3>备考建议（基于 CCF 高分选手经验）</h3>
    <div class="sub">来自 CSP 高分选手的共性与考场策略</div>
    <ul style="padding-left:20px;font-size:14px">
      <li><b>稳拿 T1/T2：</b>前两题是定海神针，务必又快又稳，先吃透基础语法、排序、模拟、前缀和、二分、贪心。</li>
      <li><b>啃下 T3：</b>题面长、细节多，边读题边在草稿上记录对象、状态与操作顺序，用模板库简化实现。</li>
      <li><b>突破 T4：</b>系统掌握 DP（线性/区间/背包/树形/状压）与图论（最短路/生成树/拓扑/树上），并学会复杂度分析。</li>
      <li><b>以题带点：</b>先按题单刷专题，遇到盲区再回头学对应算法，切忌死磕超纲内容。</li>
      <li><b>写对暴力：</b>不会正解时先写朴素算法拿部分分，O(n) 与 O(n²) 数据分档非常明显。</li>
    </ul>
  </div>`;
  afterRender();
}

/* ---------- 题库（搜索 + 筛选） ---------- */
let pfState={q:"",level:0,status:"all",fav:false};
function renderPracticeList(){
  const tiers=["T1","T2","T3","T4"];
  const tierNote={T1:"基础：模拟 / 前缀和 / 简单数学",T2:"思维：贪心 / 二分 / 搜索",T3:"数据结构与工程模拟：栈 / 并查集 / BIT",T4:"高级：DP 优化 / 图论 / 数论 / 字符串"};
  let html=header("题库 · 在线答题","点击题目进入作答，提交后实时评测并按测试数据给分。支持按关键词、难度、通过状态筛选。");
  html+=`<div class="searchbox"><span class="ic">🔍</span><input id="pfQ" placeholder="搜索题号 / 标题 / 考点…（如 背包、Dijkstra、p08）" value="${esc(pfState.q)}"></div>`;
  html+=`<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:14px">
    <span class="sub" style="margin:0">难度：</span>
    <span class="chip ${pfState.level===0?'on':''}" data-lv="0">全部</span>
    ${Object.keys(LEVELS).map(k=>`<span class="chip ${pfState.level==k?'on':''}" data-lv="${k}"><span class="lv" style="background:${LEVELS[k].color};font-size:11px">${LEVELS[k].name}</span></span>`).join("")}
    <span class="sub" style="margin:0 0 0 12px">状态：</span>
    ${[["all","全部"],["done","已 AC"],["part","部分分"],["none","未做"]].map(([v,l])=>`<span class="chip ${pfState.status===v?'on':''}" data-st="${v}">${l}</span>`).join("")}
    <span class="chip ${pfState.fav?'on':''}" id="favFilter" style="margin-left:12px">★ 我的收藏</span>
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
  for(const t of tiers){
    const list=PROBLEMS.filter(p=>p.tier===t&&match(p));
    if(!list.length)continue;
    html+=`<div class="card mb" style="padding:0;overflow:hidden"><div style="display:flex;align-items:center;padding:11px 16px;border-bottom:1px solid var(--line);background:#fafbfc"><h3 style="margin:0;font-size:14.5px">${t} <span style="font-weight:400;color:var(--muted);font-size:12.5px">${tierNote[t]}</span></h3><span class="sub" style="margin:0 0 0 auto;font-size:12.5px">${list.length} 题</span></div>
    <div class="phead" style="display:flex;align-items:center;gap:12px;padding:7px 16px;background:#fafbfc;border-bottom:1px solid var(--line);font-size:12px;color:var(--muted)">
      <span style="width:42px">编号</span><span style="flex:1">题目名称</span><span style="width:150px">知识点</span><span style="width:96px">难度</span><span style="width:64px;text-align:right">状态</span></div>
    <div>${list.map(p=>{
      const st=problemStatus(p.id); const map={done:["✔ AC","st-done"],part:["部分分","st-part"],wa:["再试","st-wa"],none:["未做","st-none"]}[st];
      const dc=(LEVELS[p.diff]||LEVELS[1]).color;
      return `<div class="problem-row" style="--dc:${dc}" data-go="problem/${p.id}">
        <span class="id">P${String(p.no).padStart(3,"0")}</span>
        <span class="nm">${p.title}</span>
        <span style="width:150px;color:#9aa7b5;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.knowledge.slice(0,2).join(" / ")}</span>
        <span style="width:96px">${lvBadge(p)}</span>
        <span class="status ${map[1]}" style="width:64px;text-align:right">${map[0]}</span></div>`;
    }).join("")}</div></div>`;
  }
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

/* ---------- 专题题单 ---------- */
function renderPlaylists(){
  let html=header("题单 · 专题训练","按知识点分组的刷题路径（参考洛谷题单）。从 T1 必拿题开始，按专题逐个突破。");
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

/* ---------- 题目详情 + 作答 ---------- */
function knowCardHTML(p){
  const know=getKnow();
  return `<div class="mb" style="margin-top:16px">
    <h3 style="margin-bottom:4px">知识点卡片</h3>
    <div class="sub" style="margin:0 0 8px">做错本题会自动把下列考点标记为「待巩固」；AC 后自动记为「已掌握」。点击卡片可手动切换。</div>
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
/* ---------- 算法可视化（同页内嵌播放器） ---------- */
let vizTimer=null, vizIdx=0, vizFrames=[], vizPlaying=false, vizSpeed=1200;
function renderInlineViz(pid){
  if(!VIZ[pid]) return "";
  return `<div class="card mb" style="margin-top:16px" id="vizWrap">
    <h3 style="margin-bottom:2px">▶ 算法可视化 <span style="font-weight:400;font-size:12.5px;color:var(--muted)">与本题同屏 · 对照正确算法逐步演示</span></h3>
    <div class="sub" style="margin-bottom:8px">用「上一步 / 下一步」或「播放」看正确算法每一步在做什么；再点下方「跑我的算法并对比」把你编辑器里的代码真实跑一遍。</div>
    <div class="viz-ctl" style="border:none;padding:0 0 8px;background:transparent">
      <button class="btn btn-ghost btn-sm" id="ivPrev">⏮ 上一步</button>
      <button class="btn btn-primary btn-sm" id="ivPlay">▶ 播放</button>
      <button class="btn btn-ghost btn-sm" id="ivNext">下一步 ⏭</button>
      <select class="tpl" id="ivSpeed"><option value="1600">慢</option><option value="1000" selected>中</option><option value="500">快</option></select>
      <span class="prog" id="ivProg" style="margin-left:auto"></span>
    </div>
    <div class="viz-stage" id="ivStage" style="min-height:200px;border:1px solid var(--line);border-radius:10px;padding:16px"></div>
    <div class="viz-desc" id="ivDesc" style="border:none;background:transparent;padding:10px 0;min-height:0"></div>
    <div class="minebox">
      <button class="btn btn-primary btn-sm" id="runMine">▶ 跑我的算法并对比</button>
      <div class="sub" style="margin:6px 0 0">用你上方编辑器里的 C++ 代码在本题小输入上真实编译运行（Wandbox），和正确算法输出逐行对比。</div>
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
  out.innerHTML='<div class="sub" style="margin-top:8px"><span class="spinner"></span> 正在用 Wandbox 编译并运行你的代码…</div>';
  const r=await execWandbox(code,tr.input);
  if(r.verdict!=="RUN"){
    out.innerHTML=`<div class="minecmp bad">⚠ 你的代码没能跑起来：<b>${r.verdict}</b> ${esc((r.detail||"").slice(0,200))}<br><span style="color:#7f1d1d">先修复编译 / 运行错误，再对比输出。</span></div>`;
    return;
  }
  const got=normOut(r.out), want=normOut(tr.expected);
  const ok=got===want;
  const pieces = tr.tokenMode==="line" ? got.split("\n").filter(x=>x.trim()!=="") : got.split(/\s+/).filter(x=>x!=="");
  const checks=(tr.checks||[]).map((c,i)=>{
    const mine = pieces[i]??"(缺)";
    const pass = mine===c.expect;
    return {...c, mine, pass};
  });
  const firstBad = checks.findIndex(c=>!c.pass);
  const chips = checks.map((c,i)=>`<span class="ck ${c.pass?'ok':'bad'}" ${c.pass?'':`onclick="vizJumpTo(${c.at})"`} title="${c.pass?'':'点我跳到正确算法这一步'}">${esc(c.label)}：${esc(c.mine)} ${c.pass?'✔':'✗ 应='+esc(c.expect)}</span>`).join("");
  out.innerHTML=`<div class="minecmp ${ok?'ok':'bad'}">
    <div><b>${ok?'✅ 你的算法结果与正确算法一致':'❌ 你的算法结果与正确算法不一致'}</b>${r.ms?' <span style="font-weight:400;font-size:12px">('+r.ms+'ms)</span>':''}</div>
    <div style="font-family:Consolas,monospace;font-size:13px;margin-top:6px;line-height:1.9">
      测试输入：<code class="kbd">${esc(tr.input.trim().replace(/\n/g,' / '))}</code><br>
      你的输出：<code class="kbd">${esc(got.slice(0,200))||'(空)'}</code><br>
      正确输出：<code class="kbd">${esc(want.slice(0,200))}</code>
    </div>
    <div class="lk-check">${chips}</div>
    ${ok?'<div class="sub" style="margin-top:8px;color:#14532d">每一步都对了；再去「提交评测」跑全部测试点。</div>':'<div class="sub" style="margin-top:8px;color:#7f1d1d">点上面红色的格子，会自动跳到正确算法对应的那一步，对照看你哪里算错了（边界？初始化？更新顺序？）。</div>'}
  </div>`;
  if(firstBad>=0){ vizJumpTo(checks[firstBad].at, true); }
}
function vizJumpTo(frameIdx, flash){
  vizIdx=Math.max(0,Math.min(vizFrames.length-1,frameIdx)); drawIv();
  const st=document.getElementById("ivStage");
  if(st){ st.classList.add("flash-bad"); setTimeout(()=>st.classList.remove("flash-bad"),2000); }
}

let editor=null, currentProblem=null, currentPre=null, submitting=false, mockCtx=null;
function initEditor(){
  if(editor) return;
  if(window.CodeMirror){
    editor=CodeMirror(document.getElementById("ed"),{value:DEFAULT_CODE,mode:"text/x-c++src",lineNumbers:true,lineWrapping:false,theme:"default",indentUnit:4,tabSize:4,styleActiveLine:true,extraKeys:{"Tab":(cm)=>{cm.replaceSelection("    ")}}});
  }else{
    const ta=document.getElementById("ed"); ta.removeAttribute("hidden"); editor={getValue:()=>ta.value,setValue:v=>{ta.value=v},replaceSelection:v=>{ta.value+=v;},focus:()=>ta.focus(),isTA:true};
  }
}
let probTab="statement";
function renderProblem(id,pre){
  const p=PROBLEMS.find(x=>x.id===id); if(!p)return renderPracticeList();
  currentProblem=p; currentPre=pre||{};
  const inMock=!!(pre&&pre.mock);
  const btn=inMock?"提交到模拟赛":"提交评测";
  const bs=bestScore(id), sc=submitCount(id);
  const hasViz=!!VIZ[id];
  const L=LEVELS[p.diff]||LEVELS[1];
  const passRate = p.judge.length? Math.round(bestScore(id)/p.points*100):0;
  const isFav=getFav().includes(id);
  const discuss=getDiscuss(id);
  const mySubs=getSubs().filter(s=>s.problem===id).reverse();
  const acCount=mySubs.filter(s=>s.score>=100).length;

  const statementHTML=`
    <h1 style="font-size:22px;font-weight:800;margin-bottom:4px">${p.title} ${lvBadge(p)}</h1>
    <div style="font-size:13px;color:var(--muted);margin-bottom:16px">${p.constraints} · ${p.tier} · ${p.tag}</div>
    <h3>题目描述</h3><p class="mb">${p.statement}</p>
    <h3>输入格式</h3><p class="mb">${p.inputFormat}</p>
    <h3>输出格式</h3><p class="mb">${p.outputFormat}</p>
    <h3>样例 #1</h3>
    <div class="sample-box"><div class="lbl">输入</div>${esc(p.sample.input)}</div>
    <div class="sample-box"><div class="lbl">输出</div>${esc(p.sample.output)}</div>
    <h3>提示 / 说明</h3>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin:8px 0">
      <button class="btn btn-ghost btn-sm" id="showSol">查看思路解析</button>
    </div>
    <div class="solbox hidden" id="solbox">${p.solution}</div>
    ${knowCardHTML(p)}
    ${hasViz?renderInlineViz(p):""}`;

  const stdCode=STD_CODE[id]||"// 暂无标准题解代码";
  const tutorialHTML=`
    <h3>思路分析</h3>
    <div style="font-size:14px;line-height:1.8;margin-bottom:14px">${p.solution}</div>
    <h3>复杂度</h3>
    <div style="font-size:14px;margin-bottom:14px">时间复杂度见上方分析，空间复杂度 O(n) 级别。</div>
    <h3>标准程序（C++17）</h3>
    <div style="display:flex;align-items:center;gap:8px;margin:6px 0">
      <span class="tag t-tag">C++17</span>
      <button class="btn btn-ghost btn-sm" id="copyStd">复制代码</button>
      <button class="btn btn-ghost btn-sm" id="loadStd">载入到编辑器</button>
    </div>
    <pre class="tut-code" id="stdCode">${esc(stdCode)}</pre>
    <div class="sub" style="margin-top:10px">题解仅供参考，建议先独立思考再查看。复制代码后可直接到右侧提交评测。</div>`;

  const discussHTML=`
    <div style="display:flex;gap:10px;align-items:center;margin-bottom:12px">
      <h3 style="margin:0">讨论区</h3>
      <span class="tag t-tag">${discuss.length} 条</span>
    </div>
    <div style="margin-bottom:14px">
      <textarea class="disc-input" id="discInput" placeholder="发表你的想法、疑问或题解分享…（支持换行）"></textarea>
      <div style="display:flex;gap:8px;margin-top:6px;align-items:center">
        <input id="discUser" style="border:1px solid var(--line);border-radius:6px;padding:6px 10px;font-size:13px;width:140px" placeholder="昵称（可选）" value="备考选手">
        <button class="btn btn-primary btn-sm" id="postDisc">发表讨论</button>
      </div>
    </div>
    <div id="discList">
    ${discuss.length?discuss.map(d=>{
      const dt=new Date(d.time);
      return `<div class="disc-item">
        <div class="disc-head">
          <div class="disc-avatar">${(d.user||"匿")[0]}</div>
          <span class="disc-user">${esc(d.user||"匿名用户")}</span>
          <span class="disc-time">${dt.getMonth()+1}-${dt.getDate()} ${normDate(dt.getHours())}:${normDate(dt.getMinutes())}</span>
        </div>
        <div class="disc-content">${esc(d.content)}</div>
      </div>`;
    }).join(""):'<div class="empty">还没有讨论，来发表第一条吧！</div>'}
    </div>`;

  const subsHTML=`
    <h3>我的提交记录</h3>
    <div class="sub" style="margin-bottom:8px">共 ${mySubs.length} 次提交，${acCount} 次通过</div>
    ${mySubs.length?`<div style="border:1px solid var(--line);border-radius:6px;overflow:hidden">
      ${mySubs.map(s=>{
        const dt=new Date(s.time);
        const cls=s.score>=100?"st-done":s.score>0?"st-part":"st-wa";
        const lbl=s.score>=100?"AC":s.score>0?"部分分":"未通过";
        return `<div class="sub-row" data-subid="${s.id}">
          <span class="sid">#${s.id.slice(-6)}</span>
          <span class="st ${cls}">${lbl}</span>
          <span style="flex:1;color:var(--muted);font-size:12px">${dt.getMonth()+1}-${dt.getDate()} ${normDate(dt.getHours())}:${normDate(dt.getMinutes())}</span>
          <span style="font-weight:700">${s.score}/100</span>
          <span style="color:var(--brand);font-size:12px">查看详情 →</span>
        </div>`;
      }).join("")}
    </div>
    <div id="subDetail" class="mt" style="display:none"></div>`:'<div class="empty">还没有提交记录，去右侧写代码提交吧！</div>'}`;

  const tabContent={statement:statementHTML,tutorial:tutorialHTML,discuss:discussHTML,submissions:subsHTML};
  const tabs=[["statement","题面"],["tutorial","题解"],["discuss","讨论",discuss.length],["submissions","我的提交",mySubs.length]];

  app.innerHTML=`
  <div class="lgbreadcrumb" style="font-size:13px;color:var(--muted);margin-bottom:10px">
    <a data-go="${inMock?`mockExam/${pre.mock}`:"practice"}" style="cursor:pointer">题库</a> <span style="margin:0 6px">/</span>
    <span class="luogu-id">P${String(p.no).padStart(3,"0")}</span> <b style="color:var(--ink)">${p.title}</b>
    <span style="float:right"><a data-go="${inMock?`mockExam/${pre.mock}`:"practice"}" style="cursor:pointer">← 返回</a></span>
  </div>
  <div class="problem-wrap" style="grid-template-columns:minmax(0,1fr) 360px">
    <div class="panel">
      <div class="lgtabs" style="display:flex;gap:0;border-bottom:2px solid var(--line)">
        ${tabs.map(([k,l,c])=>`<span class="lgtab ${probTab===k?'on':''}" data-ptab="${k}">${l}${c!==undefined?`<span style="background:var(--graybg);color:var(--gray);font-size:11px;padding:1px 7px;border-radius:99px;margin-left:5px;font-weight:700">${c}</span>`:""}</span>`).join("")}
        <span style="margin-left:auto;padding:10px 16px;cursor:pointer;font-size:18px" class="fav-btn ${isFav?'on':''}" id="favBtn" title="收藏">${isFav?'★':'☆'}</span>
      </div>
      <div style="padding:20px 22px" id="tabBody">${tabContent[probTab]||statementHTML}</div>
    </div>
    <div>
      <div class="panel mb" style="margin-bottom:14px">
        <div class="panel-hd">题目信息</div>
        <div style="padding:6px 0;font-size:13.5px">
          <div class="lginfo"><span>题目难度</span><span>${lvBadge(p)}</span></div>
          <div class="lginfo"><span>时间 / 空间</span><span>${p.constraints}</span></div>
          <div class="lginfo"><span>题目分值</span><span><b>${p.points}</b> 分</span></div>
          <div class="lginfo"><span>考点标签</span><span style="text-align:right;max-width:180px">${p.knowledge.map(k=>`<span class="tag t-know">${esc(k)}</span>`).join("")}</span></div>
          <div class="lginfo"><span>我的最佳</span><span><b class="${bs>=100?"v-AC":bs>0?"v-RE":"v-WA"}">${bs} / 100</b></span></div>
          <div class="lginfo"><span>我的提交</span><span><b>${sc}</b> 次</span></div>
          <div class="lginfo"><span>当前得分率</span><span style="text-align:right"><div class="bar" style="width:110px;display:inline-block;vertical-align:middle"><i style="width:${passRate}%"></i></div> ${passRate}%</span></div>
        </div>
      </div>
      <div class="panel">
        <div class="editor-tools">
          <b style="font-size:13px">main.cpp</b><span class="tag t-tag">C++17 · gcc</span>
          <select class="tpl" id="tplSel"><option value="">+ 插入代码模板…</option>${Object.keys(TEMPLATES).map(k=>`<option value="${esc(k)}">${esc(k)}</option>`).join("")}</select>
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
        <div id="resBody"><div class="empty">提交代码后，将按测试数据逐条实时评测。</div></div>
      </div>
    </div>
  </div>`;

  document.querySelectorAll("[data-ptab]").forEach(t=>t.onclick=()=>{probTab=t.dataset.ptab;renderProblem(id,pre);});
  document.getElementById("favBtn").onclick=()=>{toggleFav(id);renderProblem(id,pre);};

  const eh=document.getElementById("edhost"); const ta=document.getElementById("ed");
  if(window.CodeMirror){ eh.appendChild(ta); initEditor(); } else { ta.hidden=false; initEditor(); }
  const saved=LS.get("csps_code_"+id,null);
  if(saved) editor.setValue(saved);
  document.getElementById("submitBtn").onclick=()=>submit(id,pre);
  document.getElementById("resetCode").onclick=()=>{editor.setValue(DEFAULT_CODE);LS.set("csps_code_"+id,DEFAULT_CODE);};
  document.getElementById("tplSel").onchange=e=>{
    const k=e.target.value; if(!k)return;
    const tpl="\n"+TEMPLATES[k]+"\n";
    if(editor.replaceSelection) editor.replaceSelection(tpl); else editor.setValue(editor.getValue()+tpl);
    editor.focus&&editor.focus();
    e.target.value="";
  };

  if(probTab==="statement"){
    const solBtn=document.getElementById("showSol");
    if(solBtn) solBtn.onclick=e=>{document.getElementById("solbox").classList.toggle("hidden");e.currentTarget.textContent=document.getElementById("solbox").classList.contains("hidden")?"查看思路解析":"收起解析";};
    wireInlineViz(id);
    wireKnowCards();
  }
  if(probTab==="tutorial"){
    const copyBtn=document.getElementById("copyStd");
    if(copyBtn) copyBtn.onclick=()=>{navigator.clipboard.writeText(stdCode).then(()=>{copyBtn.textContent="已复制 ✓";setTimeout(()=>copyBtn.textContent="复制代码",1500);});};
    const loadBtn=document.getElementById("loadStd");
    if(loadBtn) loadBtn.onclick=()=>{editor.setValue(stdCode);LS.set("csps_code_"+id,stdCode);loadBtn.textContent="已载入 ✓";setTimeout(()=>loadBtn.textContent="载入到编辑器",1500);};
  }
  if(probTab==="discuss"){
    const postBtn=document.getElementById("postDisc");
    if(postBtn) postBtn.onclick=()=>{
      const content=document.getElementById("discInput").value.trim();
      const user=document.getElementById("discUser").value.trim()||"匿名用户";
      if(!content){alert("请输入讨论内容");return;}
      addDiscuss(id,content,user);
      probTab="discuss"; renderProblem(id,pre);
    };
  }
  if(probTab==="submissions"){
    document.querySelectorAll(".sub-row").forEach(row=>row.onclick=()=>{
      const sid=row.dataset.subid;
      const sub=getSubs().find(s=>s.id===sid);
      if(!sub)return;
      const det=document.getElementById("subDetail");
      det.style.display="block";
      det.innerHTML=`<div class="panel" style="padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <b>提交 #${sid.slice(-6)} 详情</b>
          <span class="v-${sub.score>=100?'AC':'WA'}">${sub.score}/100 分</span>
        </div>
        ${sub.details?`<div style="margin-bottom:10px">
          ${sub.details.map(d=>`<div style="display:flex;gap:10px;padding:5px 0;border-bottom:1px solid var(--line);font-size:13px">
            <span style="width:60px;color:var(--muted)">测试点 ${d.i}</span>
            <span class="v-${d.verdict}" style="width:70px">${d.verdict}</span>
            <span style="color:var(--muted);font-size:12px">${d.ms?d.ms+"ms":""}</span>
            ${d.verdict==="WA"?`<span style="font-size:12px;color:var(--muted)">你的: <code class="kbd">${esc((d.out||"").slice(0,60))}</code> 期望: <code class="kbd">${esc((d.expect||"").slice(0,60))}</code></span>`:""}
          </div>`).join("")}
        </div>`:""}
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">提交代码：</div>
        <pre class="tut-code" style="max-height:300px">${esc(sub.code)}</pre>
      </div>`;
      det.scrollIntoView({behavior:"smooth",block:"nearest"});
    });
  }
  afterRender();
}
async function submit(id,pre){
  if(submitting)return; submitting=true;
  const p=PROBLEMS.find(x=>x.id===id); const code=editor.getValue(); LS.set("csps_code_"+id,code);
  const btn=document.getElementById("submitBtn"); btn.disabled=true; btn.innerHTML='<span class="spinner"></span> 评测中…';
  const resBody=document.getElementById("resBody"); const resScore=document.getElementById("resScore");
  resScore.textContent="";
  const rows=[];
  const results=[];
  let score=0, ce=false;
  const verdictLabel={AC:"AC 正确",WA:"WA 答案错误",RE:"RE 运行错误",CE:"CE 编译错误",TLE:"TLE/无响应",ERR:"服务异常"};
  for(let i=0;i<p.judge.length;i++){
    const t=p.judge[i];
    rows.push(`<div class="result-item" data-i="${i}"><span>测试点 ${i+1} <span class="ti">${t.score} 分</span></span><span class="spinner"></span></div>`);
    resBody.innerHTML=rows.join("");
    const r=await judgeTest(code,t);
    results.push({i:i+1,score:t.score,verdict:r.verdict,ms:r.ms,out:r.out,detail:r.detail,expect:t.output});
    if(ce){}
    else if(r.verdict==="CE"){ce=true;score=0;}
    else if(r.verdict==="AC")score+=t.score;
    let detail="";
    if(r.verdict==="WA")detail=`<div class="sub" style="margin-top:6px">${esc(r.detail)}<br>你的输出：<code class="kbd">${esc((r.out||"").slice(0,120))}</code> 期望：<code class="kbd">${esc((t.output||"").slice(0,120))}</code></div>`;
    else if(r.verdict==="CE")detail=`<div class="sub" style="margin-top:6px"><pre class="detail-pre">${esc(r.detail||"")}</pre></div>`;
    else if(r.verdict==="RE")detail=`<div class="sub" style="margin-top:6px">${esc(r.detail||"")}</div>`;
    rows[i]=`<div class="result-item"><span>测试点 ${i+1} <span class="ti">${t.score} 分</span></span><span class="v-${r.verdict}">${verdictLabel[r.verdict]}${r.ms?" · "+r.ms+"ms":""}</span></div>${detail}`;
    resBody.innerHTML=rows.join("");
    await new Promise(r=>setTimeout(r,120));
  }
  if(ce){resBody.innerHTML=rows.join("");resScore.innerHTML=`<span class="v-CE">编译错误 · 0 分</span>`;}
  else{resScore.innerHTML=`<span class="v-${score>=100?"AC":"WA"}" style="font-size:18px">${score} / 100 分</span>`;}
  const verdictBest=score>=100?"AC":(ce?"CE":(score>0?"部分":"WA"));
  const rec={id:uid(),time:Date.now(),problem:id,title:p.title,tier:p.tier,score,verdict:verdictBest,code,mode:pre&&pre.mock?"mock":"practice",mockId:pre&&pre.mock?pre.mock:undefined,details:results};
  const subs=getSubs(); subs.push(rec); saveSubs(subs);
  if(score>0&&score<100){const w=getWrong(); if(!w.find(x=>x.problem===id))w.push({problem:id,title:p.title,score});saveWrong(w);}
  {
    const kk=getKnow(); let changed=false;
    for(const k of p.knowledge){
      if(score>=100){ if(kk[k]!=="1"){kk[k]="1";changed=true;} }
      else { if(kk[k]!=="1"){kk[k]="2";changed=true;} }
    }
    if(changed){saveKnow(kk);
      const box=document.querySelector(".kcard-row");
      if(box){ p.knowledge.forEach((k,i)=>{
        const st=kk[k]; const card=document.querySelectorAll("[data-know]")[i];
        if(!card)return;
        card.className="kcard "+(st==="1"?"mastered":st==="2"?"flagged":"");
        const sc=card.querySelector(".kc-state");
        sc.className="kc-state "+(st==="1"?"ks-ok":st==="2"?"ks-review":"ks-none");
        sc.textContent=st==="1"?"✔ 已掌握":st==="2"?"⚠ 待巩固":"○ 未标记";
      });}
    }
  }
  if(pre&&pre.mock){ syncMockUI(); }
  submitting=false; btn.disabled=false; btn.textContent=pre&&pre.mock?"提交到模拟赛":"提交评测";
}

/* ---------- 模拟赛 ---------- */
function renderMockList(){
  let html=header("模拟赛 · 全真上机","3 套模拟卷，每套 4 题对应 T1–T4，总分 400 分，限时 240 分钟（与官方时长一致）。");
  html+=`<div class="grid g3 mb">`;
  for(const m of MOCK_EXAMS){
    const bestScore=LS.get("csps_mockscore_"+m.id,null);
    html+=`<div class="card"><h3>${m.name}</h3><div class="sub">${m.problems.map(id=>PROBLEMS.find(p=>p.id===id).title).join(" · ")}</div>
    ${bestScore!=null?`<div class="stat" style="padding:10px 0;border:none;box-shadow:none"><span class="v" style="font-size:22px">${bestScore}</span><small> / 400 分</small></div>`:""}
    <a class="btn btn-primary" data-go="mockExam/${m.id}">${bestScore!=null?"再次挑战":"开始模拟赛"}</a></div>`;
  }
  html+=`</div><div class="card"><h3>使用说明</h3><div class="sub" style="margin:0">
  <ul style="padding-left:20px;font-size:14px;line-height:2">
    <li>开赛后倒计时开始（默认 240 分钟），可在顶部模拟赛栏内切换 4 道题作答。</li>
    <li>每道题可多次提交，以<b>最高分</b>计入该场总分；关闭页面计时仍在后台继续。</li>
    <li>时间到后自动锁定提交，页面刷新后可查看该场成绩。</li>
  </ul></div></div>`;
  app.innerHTML=html; afterRender();
}
function renderMock(mid){
  const m=MOCK_EXAMS.find(x=>x.id===mid); if(!m)return renderMockList();
  const deadline=Number(LS.get(MOCK_DEADLINE_KEY,0));
  const now=Date.now();
  if(!deadline||now>=deadline){
    LS.set(MOCK_DEADLINE_KEY,now+m.minutes*60000);
    LS.set("csps_mockset_"+mid,m.problems);
  }
  mockCtx={mid,problems:m.problems,minutes:m.minutes};
  showMockbar(mockCtx);
  renderProblem(m.problems[0],{mock:mid});
  syncMockUI(); tickMock();
}
function showMockbar(ctx){
  const bar=document.getElementById("mockbar"); bar.classList.remove("hidden");
  const probs=document.getElementById("mockprobs");
  probs.innerHTML=ctx.problems.map(id=>{
    const p=PROBLEMS.find(x=>x.id===id); const best=bestMockScore(ctx.mid,id);
    return `<span class="pb" data-go="problem/${id}" data-mock="${ctx.mid}">${p.tier}${best>=100?" ✔":""}</span>`;
  }).join("");
  document.querySelectorAll("#mockbar .pb").forEach(el=>el.onclick=()=>{nav("problem/"+el.dataset.go.split("/")[1],{mock:el.dataset.mock});syncMockUI();});
}
function bestMockScore(mid,id){
  const subs=getSubs().filter(s=>s.mode==="mock"&&s.problem===id&&(mockCtx&&s.mockId===mid));
  if(!subs.length)return 0; return Math.max(...subs.map(s=>s.score));
}
function tickMock(){
  const bar=document.getElementById("mockbar"); const el=document.getElementById("mocktime");
  const iv=setInterval(()=>{
    const deadline=Number(LS.get(MOCK_DEADLINE_KEY,0));
    const left=Math.max(0,deadline-Date.now());
    const h=Math.floor(left/3600000),m=Math.floor(left%3600000/60000),s=Math.floor(left%60000/1000);
    el.textContent=`${h}:${normDate(m)}:${normDate(s)}`;
    if(left<=0){clearInterval(iv);
      let total=0; for(const sp of (mockCtx?mockCtx.problems:[])) total+=bestMockScore(mockCtx.mid,sp);
      LS.set("csps_mockscore_"+mockCtx.mid,total);
      if(mockCtx){el.textContent="已结束"; const names=mockCtx.problems.map(id=>PROBLEMS.find(p=>p.id===id).title);
        if(!LS.get("csps_mockend_"+mockCtx.mid)){LS.set("csps_mockend_"+mockCtx.mid,1);
          alert(`⏱ 模拟赛结束！\n${names.join(" · ")}\n本场总分：${total} / 400`);} }
      }
  },1000);
}
function syncMockUI(){
  if(!mockCtx)return; const bar=document.getElementById("mockbar");
  if(bar.classList.contains("hidden"))bar.classList.remove("hidden");
  showMockbar(mockCtx);
}

/* ---------- 知识图谱 ---------- */
function renderKnowledge(){
  const know=getKnow(); let marked=0,mastered=0,total=0;
  for(const c of KNOWLEDGE){for(const it of c.items){total++; if(know[it]){marked++; if(know[it]==="1")mastered++;}}}
  const pct=Math.round(mastered/total*100);
  const byCat=cat=>{const items=KNOWLEDGE.find(c=>c.cat===cat).items;let ms=0;for(const it of items)if(know[it]==="1")ms++;return {ms,total:items.length};};
  let html=header("知识图谱 · 考点全覆盖","CSP-S 提高组第二轮机试考点自评。点击标签切换"掌握 / 待巩固"。");
  html+=`<div class="card mb" style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">
    <div class="ring" style="--p:${pct};--c:${pct>=70?"var(--green)":"var(--brand)"}"><b>${pct}%</b></div>
    <div><div class="sub" style="margin:0">整体掌握度 · 已掌握 ${mastered} / ${total} 考点</div>
    <div class="bar" style="width:260px;margin-top:8px"><i style="width:${pct}%"></i></div>
    <div class="sub mt" style="margin:0">点击下方任意考点可在"掌握"与"待巩固"间切换；结合<b>题单</b>中对应题目的 AC 情况查漏补缺。</div></div></div>`;
  for(const c of KNOWLEDGE){
    const b=byCat(c.cat); const cp=Math.round(b.ms/b.total*100);
    html+=`<div class="card mb know-block"><div class="cat"><span>${c.cat}</span><span class="tag t-tag">${b.ms}/${b.total} 掌握</span><span class="pct">${cp}%</span>
      <div class="bar" style="width:120px;margin:0 0 0 6px"><i style="width:${cp}%"></i></div></div>
      <div>${c.items.map(it=>{const st=know[it];return `<span class="chip ${st==="1"?"on":""}" data-k="${esc(it)}" ${st==="2"?"style='border-color:var(--red);color:var(--red)'":""}>${esc(it)}${st==="2"?" <b style='color:var(--red)'>(待)</b>":""}</span>`;}).join("")}</div></div>`;
  }
  app.innerHTML=html; afterRender();
  document.querySelectorAll("[data-k]").forEach(el=>el.onclick=()=>{
    const k=el.dataset.k; const cur=getKnow()[k]; const nxt=cur==="1"?"2":"1"; const kk=getKnow(); kk[k]=nxt; saveKnow(kk); renderKnowledge();
  });
}

/* ---------- 记录 ---------- */
function renderRecords(){
  const subs=getSubs().slice().reverse(); const wrong=getWrong();
  const dist=levelDist();
  let html=header("我的记录 · 提交历史与错题本","所有数据仅保存在本机浏览器，不会上传。");
  html+=`<div class="card mb">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px"><h3 style="margin:0">我的难度掌握分布</h3></div>
    <div class="lvbar">${Object.keys(LEVELS).map(k=>{const L=LEVELS[k];const [ac,tot]=dist[k];return `<div style="width:${tot/PROBLEMS.length*100}%;background:${L.color};opacity:${tot?0.35+0.65*(ac/tot):0.15}" title="${L.name} ${ac}/${tot}"></div>`;}).join("")}</div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12.5px;color:var(--muted);margin-top:6px">
      ${Object.keys(LEVELS).map(k=>{const L=LEVELS[k];const [ac,tot]=dist[k];return `<span><span class="lv" style="background:${L.color}">${L.name}</span> AC <b>${ac}</b>/${tot}</span>`;}).join("")}
    </div></div>`;
  html+=`<div class="grid g2 mb">
    <div class="card"><h3>📕 错题本（部分分 / 未通过）</h3>
      ${wrong.length?wrong.map(w=>`<div class="problem-row" data-go="problem/${w.problem}"><span class="nm">${w.title}</span><span class="status st-wa">${w.score} 分</span><span style="color:var(--brand);font-size:13px">去重做 →</span></div>`).join(""):`<div class="empty">暂无错题，继续加油 🎯</div>`}
    </div>
    <div class="card"><h3>✅ 已 AC 题目</h3>
      ${PROBLEMS.filter(p=>problemStatus(p.id)==="done").length?PROBLEMS.filter(p=>problemStatus(p.id)==="done").map(p=>`<div class="problem-row" data-go="problem/${p.id}"><span class="nm">${p.title}</span>${lvBadge(p)}<span class="status st-done">✔ AC</span></div>`).join(""):`<div class="empty">还没有 AC 的题目，去刷一道吧。</div>`}
    </div></div>`;
  html+=`<div class="grid g2 mb">
    <div class="card"><h3>🧮 统计</h3><div class="sub">累计提交 ${subs.length} 次</div>
      <div class="grid g2" style="margin-top:8px">
        <div class="stat"><div class="k">满分题目</div><div class="v">${stats().full}<small> / ${PROBLEMS.length}</small></div></div>
        <div class="stat"><div class="k">平均得分率</div><div class="v">${stats().rate}<small>%</small></div></div>
      </div>
    </div></div>`;
  html+=`<div class="card"><h3>🕘 提交记录</h3>
    ${subs.length?`<table><thead><tr><th>时间</th><th>题目</th><th>类型</th><th>分数</th><th>结果</th><th></th></tr></thead><tbody>
    ${subs.slice(0,120).map(s=>{const d=new Date(s.time);const cls={AC:"v-AC",WA:"v-WA",CE:"v-CE","部分":"v-WA"}[s.verdict]||"v-WA";
      return `<tr><td>${d.getMonth()+1}-${d.getDate()} ${normDate(d.getHours())}:${normDate(d.getMinutes())}</td><td>${esc(s.title)}</td><td>${s.mode==="mock"?"模拟赛":"练习"}</td><td><b>${s.score}/100</b></td><td class="${cls}">${s.verdict==="AC"?"AC 正确":s.verdict==="CE"?"编译错误":s.verdict==="部分"?"部分分":"未通过"}</td><td><a data-viewcode="${s.id}">查看代码</a></td></tr>`;
    }).join("")}</tbody></table>`:`<div class="empty">还没有提交记录，去题库刷一道题吧。</div>`}</div>`;
  app.innerHTML=html; afterRender();
  document.querySelectorAll("[data-viewcode]").forEach(a=>a.onclick=()=>{const s=getSubs().find(x=>x.id===a.dataset.viewcode);if(s)alert(s.code);});
}

/*================ 路由 ================*/
function nav(hash,opts){
  const seg=hash.replace(/^#\//,"").split("/");
  document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===seg[0]));
  if(seg[0]==="problem"){ VIEWS.problem(seg[1],opts); }
  else if(seg[0]==="mockExam"){ VIEWS.mockExam(seg[1]); }
  else if(VIEWS[seg[0]]){ VIEWS[seg[0]](); }
  else VIEWS.dashboard();
  window.scrollTo(0,0);
}
function afterRender(){
  document.querySelectorAll("[data-go]").forEach(a=>a.onclick=()=>{const v=a.dataset.go;nav(v,{mock:a.dataset.mock});});
  document.querySelectorAll("#nav button").forEach(b=>b.onclick=()=>nav(b.dataset.view));
}

/*================ 启动 ================*/
function boot(){
  const cd=document.getElementById("cd");
  const tick=()=>{const left=countdownTo()-Date.now();if(left<=0){cd.textContent="考试已开始 🎯";return;}
    const d=Math.floor(left/86400000),h=Math.floor(left%86400000/3600000),m=Math.floor(left%3600000/60000);
    cd.textContent=`距机试 ${d}天 ${h}时 ${m}分`;};
  tick(); setInterval(tick,60000);
  const deadline=Number(LS.get(MOCK_DEADLINE_KEY,0));
  if(deadline>Date.now()){
    const mid=LS.get("csps_mockset_last","A"); const probs=LS.get("csps_mockset_"+mid,[]);
    if(probs.length){mockCtx={mid,problems:probs}; showMockbar(mockCtx); tickMock();}
  }
  nav((location.hash||"#/dashboard"));
  window.addEventListener("hashchange",()=>nav(location.hash));
}
document.addEventListener("DOMContentLoaded",boot);
