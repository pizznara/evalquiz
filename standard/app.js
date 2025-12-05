const MANIFEST_URL = "../data/manifest.json";

const LABELS7 = [
  "先手大劣勢","先手劣勢","先手不利",
  "互角",
  "先手有利","先手優勢","先手大優勢"
];
const IDX = {
  "先手大劣勢": -3, "先手劣勢": -2, "先手不利": -1,
  "互角": 0,
  "先手有利": 1, "先手優勢": 2, "先手大優勢": 3
};

async function loadQuestions(seed=Date.now()) {
  const m = await fetch(MANIFEST_URL).then(r=>r.json());
  const arr = await fetch("../data/" + m.shards[0]).then(r=>r.json());

  // シードシャッフル
  const rnd = mulberry32(seed);
  const shuffled = [...arr];
  for (let i = shuffled.length-1; i>0; i--) {
    const j = Math.floor(rnd()*(i+1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0,8);
}

function mulberry32(a){
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a>>>15), 1 | a);
    t = (t + Math.imul(t ^ (t>>>7), 61 | t)) ^ t;
    return ((t ^ (t>>>14)) >>> 0) / 4294967296;
  }
}

function renderQuiz(questions){
  const app = document.getElementById("app");
  let idx = 0;
  const answers = {};

  const show = ()=>{
    const q = questions[idx];
    app.innerHTML = `
      <h2>${idx+1}/8</h2>
      <img src="${q.large}" style="max-width:90%;border:1px solid #ddd;border-radius:8px">
      <p>この局面の形勢は？（先手視点）</p>
      <div id="btns"></div>
      <button id="next">次へ</button>
    `;

    const btns = document.getElementById("btns");
    LABELS7.forEach(l=>{
      const b = document.createElement("button");
      b.textContent = l;
      b.style.display = "block";
      b.style.margin = "4px";
      b.onclick = ()=>{ answers[q.id] = l; };
      btns.appendChild(b);
    });

    document.getElementById("next").onclick = ()=>{
      if(!answers[q.id]){ alert("選んでください"); return; }
      if(idx===7){ return renderResult(questions,answers); }
      idx++;
      show();
    };
  };
  show();
}

function renderResult(questions, answers){
  const app = document.getElementById("app");

  // 採点（0差=1点、±1差=0.5点、±2以上=0点）
  const diffs = questions.map(q => IDX[answers[q.id]] - IDX[labelFromCp(q.aiCp)]);
  const score = diffs.reduce((s,d)=> s + (d===0?1:Math.abs(d)===1?0.5:0), 0);

  // 傾向（中央値）
  const sorted = [...diffs].sort((a,b)=>a-b);
  const m = sorted[Math.floor(sorted.length/2)];
  const type =
    m>=2  ? "超楽観派" :
    m>=1  ? "楽観派"   :
    m>-1  ? "正確派"  :
    m>-2  ? "悲観派"  : "超悲観派";

  let html = `
    <h2>結果</h2>
    <p>精度スコア：${score.toFixed(1)} / 8点</p>
    <p>傾向：${type}</p>
    <h3>各問</h3>
  `;

  questions.forEach(q=>{
    html += `
      <div style="margin-bottom:8px;border:1px solid #eee;padding:8px">
        <img src="${q.thumb}" width="80" style="vertical-align:middle">
        <b>あなた：</b>${answers[q.id]}
        ／ <b>正解：</b>${labelFromCp(q.aiCp)}
      </div>
    `;
  });

  app.innerHTML = html;
}

function labelFromCp(cp){
  if(cp <= -1600) return "先手大劣勢";
  if(cp <= -900) return "先手劣勢";
  if(cp <= -400) return "先手不利";
  if(cp < 400)   return "互角";
  if(cp < 900)   return "先手有利";
  if(cp < 1400)  return "先手優勢";
  return "先手大優勢";
}

loadQuestions().then(renderQuiz);
