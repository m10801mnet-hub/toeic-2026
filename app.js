
const LS_KEY = 'toeic_vocab_ready_records_v2';
const LS_META = 'toeic_vocab_ready_meta_v2';
let records = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
let meta = JSON.parse(localStorage.getItem(LS_META) || '{"mode":"today","day":1,"session":0,"correctSession":0,"streak":0,"lastLetters":[]}');
if(!meta.day) meta.day = meta.today || 1;
let current = null, currentOptions = [], answered = false, started = Date.now(), timerId = null;
const $ = s => document.querySelector(s);
const PLAN = [
 ['★重要語スタート','重複語・最重要語を中心に覚える。80問。間違えてOK、まず反応速度。'],
 ['Part5/7基礎','submit / provide / ensure 系のビジネス語彙。80問。'],
 ['ビジネス語彙','求人・会社・会議・請求系。90問。'],
 ['前置詞・熟語','due to / prior to / on behalf of 系。90問。'],
 ['Part1写真①','人の動作・物の位置。90問。'],
 ['Part1写真②','屋外・建物・道具。90問。'],
 ['730追加語①','Readingを300点台へ押し上げる追加語。100問。'],
 ['730追加語②','文脈で差がつく語。100問。'],
 ['全体接続','Day1〜8の弱点も混ぜる。100問。'],
 ['新規語の最終日','新しく覚える最後の日。100問。'],
 ['復習1','ここから新規なし。間違い語だけ。80問。'],
 ['復習2','★重要語＋間違い語。80問。'],
 ['復習3','Part5/7の間違い語だけ。70問。'],
 ['復習4','Part1写真描写の間違い語だけ。70問。'],
 ['本番前チェック','最後は弱点だけ。新しい語は増やさない。50問。']
];
function save(){localStorage.setItem(LS_KEY, JSON.stringify(records));localStorage.setItem(LS_META, JSON.stringify(meta));}
function rec(term){ if(!records[term]) records[term]={attempts:0,correct:0,wrong:0,streak:0,mastered:false,last:null,lastAt:0,note:''}; return records[term]; }
function catLabel(c){return c==='part1'?'Part 1 写真':'Part 5/7';}
function masteryNeed(item){return item.star ? 4 : 3;}
function filtered(){
  let arr = VOCAB.slice();
  if(meta.mode==='today'){
    if(meta.day<=10) arr = arr.filter(v=>(v.day===meta.day || v.star) && !rec(v.term).mastered);
    else if(meta.day===11) arr = arr.filter(v=>rec(v.term).wrong>0 && !rec(v.term).mastered);
    else if(meta.day===12) arr = arr.filter(v=>(v.star || rec(v.term).wrong>0) && !rec(v.term).mastered);
    else if(meta.day===13) arr = arr.filter(v=>v.category==='part5_7' && rec(v.term).wrong>0 && !rec(v.term).mastered);
    else if(meta.day===14) arr = arr.filter(v=>v.category==='part1' && rec(v.term).wrong>0 && !rec(v.term).mastered);
    else arr = arr.filter(v=>(rec(v.term).wrong>0 || v.star) && !rec(v.term).mastered);
  }
  if(meta.mode==='star') arr = arr.filter(v=>v.star && !rec(v.term).mastered);
  if(meta.mode==='wrong') arr = arr.filter(v=>rec(v.term).wrong>0 && !rec(v.term).mastered);
  if(meta.mode==='mastered') arr = arr.filter(v=>rec(v.term).mastered);
  if(meta.mode==='part1') arr = arr.filter(v=>v.category==='part1' && !rec(v.term).mastered);
  if(meta.mode==='part57') arr = arr.filter(v=>v.category==='part5_7' && !rec(v.term).mastered);
  if(meta.mode==='adaptive') arr = arr.filter(v=>!rec(v.term).mastered);
  if(arr.length===0) arr = VOCAB.filter(v=>!rec(v.term).mastered);
  if(arr.length===0) arr = VOCAB.slice();
  return arr;
}
function weight(v){
  const r=rec(v.term); let w = 8 + (v.priority||3)*7 + (v.star?25:0) + r.wrong*18 - r.streak*8;
  if(r.attempts===0) w += 10; if(r.last===false) w += 24; if(meta.mode==='today' && v.day===meta.day) w+=18;
  if(r.mastered && meta.mode!=='mastered') w = 0.1;
  return Math.max(1,w);
}
function pick(){ const arr=filtered(); let total=arr.reduce((s,v)=>s+weight(v),0); let x=Math.random()*total; for(const v of arr){x-=weight(v); if(x<=0) return v;} return arr[0]; }
function makeOptions(item){
  const same = VOCAB.filter(v=>v.term!==item.term && v.category===item.category);
  const all = VOCAB.filter(v=>v.term!==item.term);
  const pool = (same.length>=3?same:all).slice().sort(()=>Math.random()-0.5);
  const opts = [{text:item.meaningJa, correct:true}];
  for(const d of pool){ if(opts.length>=4) break; if(!opts.some(o=>o.text===d.meaningJa)) opts.push({text:d.meaningJa, correct:false}); }
  while(opts.length<4) opts.push({text:'関連する意味', correct:false});
  const letters=['A','B','C','D']; let shuffled, correctLetter;
  for(let tries=0; tries<30; tries++){ shuffled=opts.slice().sort(()=>Math.random()-0.5); correctLetter=letters[shuffled.findIndex(o=>o.correct)]; const last=meta.lastLetters||[]; if(!(last.length>=2 && last[last.length-1]===correctLetter && last[last.length-2]===correctLetter)) break; }
  return shuffled.map((o,i)=>({...o, letter:letters[i]}));
}
function next(){ current=pick(); currentOptions=makeOptions(current); answered=false; started=Date.now(); $('#floatingNext').classList.add('hidden'); clearInterval(timerId); timerId=setInterval(updateTimer,250); render(); }
function updateTimer(){ const sec=Math.floor((Date.now()-started)/1000); $('#timeText').textContent=sec+'s'; $('#timerBar').style.width=Math.min(100,sec/20*100)+'%'; }
function choose(i){
  if(answered) return; answered=true; clearInterval(timerId); const opt=currentOptions[i]; const r=rec(current.term); const sec=Math.floor((Date.now()-started)/1000);
  r.attempts++; r.lastAt=Date.now(); meta.session++;
  if(opt.correct){ r.correct++; r.streak++; r.last=true; meta.correctSession++; meta.streak++; if(r.streak>=masteryNeed(current)) r.mastered=true; }
  else{ r.wrong++; r.streak=0; r.mastered=false; r.last=false; meta.streak=0; }
  const correctLetter=currentOptions.find(o=>o.correct).letter; meta.lastLetters=(meta.lastLetters||[]).concat([correctLetter]).slice(-5);
  save(); renderFeedback(opt.correct, sec); renderStats(); renderChoices(); $('#floatingNext').classList.remove('hidden');
}
function render(){
  $('#dayNow').textContent=meta.day; $('#dayNum').textContent=meta.day; $('#dayTitle').textContent=PLAN[meta.day-1][0]; $('#dayMsg').textContent=PLAN[meta.day-1][1];
  $('#term').textContent=current.term; $('#phrase').textContent=current.phrase; $('#starBadge').classList.toggle('hidden',!current.star); $('#catBadge').textContent=catLabel(current.category); $('#priorityBadge').textContent='重要度 '+current.priority+' / Day '+current.day; $('#masterBadge').classList.toggle('hidden',!rec(current.term).mastered);
  $('#memo').value=rec(current.term).note||''; renderChoices(); renderStats(); updateTimer(); $('#feedback').className='feedback'; $('#feedback').innerHTML='';
}
function renderChoices(){ const box=$('#choices'); box.innerHTML=''; currentOptions.forEach((o,i)=>{ const b=document.createElement('button'); b.className='choice'; if(answered){ if(o.correct)b.classList.add('correct'); else if(i===currentOptions.findIndex(x=>x===o && false)) b.classList.add(''); } b.innerHTML=`<span class="letter">${o.letter}</span><span>${o.text}</span>`; b.onclick=()=>choose(i); box.appendChild(b); }); }
function renderFeedback(ok, sec){
  const fb=$('#feedback'); fb.className='feedback '+(ok?'ok':'ng'); const r=rec(current.term);
  fb.innerHTML=`<h3>${ok?'正解！':'不正解'}　正解：${current.meaningJa}</h3><button class="nextInside" onclick="next()">次の問題へ</button>
  <div class="infoGrid"><div class="smallBox"><b>例文</b>${current.example}<br><span>${current.exampleJa}</span></div><div class="smallBox"><b>覚えるポイント</b>${current.point}</div><div class="smallBox"><b>重要フレーズ</b>${current.phrase}</div><div class="smallBox"><b>記録</b>連続正解 ${r.streak}/${masteryNeed(current)}　${r.mastered?'卒業済み':'練習中'}　${sec<=20?'20秒以内OK':'20秒超え'}</div></div>`;
}
function renderStats(){ const vals=Object.values(records); const attempts=vals.reduce((s,r)=>s+r.attempts,0), correct=vals.reduce((s,r)=>s+r.correct,0), wrongWords=vals.filter(r=>r.wrong>0&&!r.mastered).length, mastered=vals.filter(r=>r.mastered).length; const rate=attempts?Math.round(correct/attempts*100):0; $('#session').textContent=meta.session||0; $('#correct').textContent=correct; $('#rate').textContent=rate+'%'; $('#streak') && ($('#streak').textContent=meta.streak||0); $('#wrongWords').textContent=wrongWords; $('#mastered').textContent=mastered; $('#titleRank').textContent=rate>=85?'730突破圏':rate>=75?'700点接近':rate>=65?'600点突破圏':'基礎固め中'; }
function setMode(m){meta.mode=m; document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===m)); save(); next();}
function changeDay(d){meta.day=Math.max(1,Math.min(15,meta.day+d)); meta.mode='today'; save(); setMode('today');}
function saveMemo(){ const r=rec(current.term); r.note=$('#memo').value; save(); }
function resetData(){ if(confirm('学習記録をリセットしますか？')){records={}; meta={mode:'today',day:1,session:0,correctSession:0,streak:0,lastLetters:[]}; save(); location.reload();}}
function exportData(){ const blob=new Blob([JSON.stringify({records,meta},null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='toeic-vocab-progress-v2.json'; a.click(); URL.revokeObjectURL(a.href);}
function importData(file){ if(!file)return; const fr=new FileReader(); fr.onload=()=>{try{const data=JSON.parse(fr.result); records=data.records||{}; meta=data.meta||meta; if(!meta.day)meta.day=1; save(); alert('復元しました'); location.reload();}catch(e){alert('読み込み失敗');}}; fr.readAsText(file);}
function showPlan(){ $('#plan').classList.toggle('show'); }
function renderPlan(){ const plan=$('#plan'); plan.innerHTML=PLAN.map((p,i)=>`<div class="planDay"><b>Day ${i+1}：${p[0]}</b><br>${p[1]}</div>`).join(''); }
document.addEventListener('keydown',e=>{ if(['1','2','3','4'].includes(e.key)) choose(Number(e.key)-1); if(e.key==='Enter') next(); });
window.addEventListener('load',()=>{renderPlan(); setMode(meta.mode||'today'); if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(()=>{});});
