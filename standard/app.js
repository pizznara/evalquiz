const MANIFEST_URL = "../data/manifest.json";

/**
 * 7段階ラベル情報
 */
const LABEL_INFO = [
  { key: "先手大優勢", label: "先手大優勢（+1600以上）",    side: "pos",  level: 3 },
  { key: "先手優勢",   label: "先手優勢（+900〜+1399）",    side: "pos",  level: 2 },
  { key: "先手有利",   label: "先手有利（+400〜+799）",     side: "pos",  level: 1 },
  { key: "互角",       label: "互角（±299以内）",           side: "zero", level: 0 },
  { key: "先手不利",   label: "先手不利（-400〜-799）",     side: "neg",  level: 1 },
  { key: "先手劣勢",   label: "先手劣勢（-900〜-1399）",    side: "neg",  level: 2 },
  { key: "先手大劣勢", label: "先手大劣勢（-1600以下）",   side: "neg",  level: 3 },
];

const IDX = {
  "先手大劣勢": -3, "先手劣勢": -2, "先手不利": -1,
  "互角": 0,
  "先手有利": 1, "先手優勢": 2, "先手大優勢": 3,
};

function getLabelInfo(key) {
  return LABEL_INFO.find(l => l.key === key);
}

/* ===== カラー制御 ===== */
function labelBgColor(key) {
  const info = getLabelInfo(key);
  if (!info) return "#dddddd";
  if (info.side === "zero") return "#eeeeee";
  if (info.side === "neg") {
    if (info.level === 1) return "#e8f0ff";
    if (info.level === 2) return "#c3d4ff";
    return "#7999ff";
  }
  if (info.side === "pos") {
    if (info.level === 1) return "#ffecec";
    if (info.level === 2) return "#ffb7b7";
    return "#e85b5b";
  }
}

function labelBorderColor(key) {
  const info = getLabelInfo(key);
  if (!info) return "#cccccc";
  if (info.side === "zero") return "#999999";
  if (info.side === "neg") {
    if (info.level === 1) return "#7999ff";
    if (info.level === 2) return "#4d6fe3";
    return "#2c49a8";
  }
  if (info.side === "pos") {
    if (info.level === 1) return "#ff7a7a";
    if (info.level === 2) return "#e85b5b";
    return "#b52f2f";
  }
}

function sideTextColor(key) {
  const info = getLabelInfo(key);
  if (!info) return "#222";
  if (info.side === "pos") return "#b52f2f"; 
  if (info.side === "neg") return "#2c49a8";
  return "#5b6572";
}

/* ====== util ====== */
function mulberry32(a){
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a>>>15), 1 | a);
    t = (t + Math.imul(t ^ (t>>>7), 61 | t)) ^ t;
    return ((t ^ (t>>>14)) >>> 0) / 4294967296;
  }
}

async function loadQuestions(seed = Date.now()) {
  const manifest = await fetch(MANIFEST_URL).then(r => r.json());
  const all = await fetch("../data/" + manifest.shards[0]).then(r => r.json());
  const rnd = mulberry32(seed);
  const shuffled = [...all];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 8);
}

function labelKeyFromCp(cp) {
  if (cp <= -1600) return "先手大劣勢";
  if (cp <= -900)  return "先手劣勢";
  if (cp <= -400)  return "先手不利";
  if (cp < 400)    return "互角";
  if (cp < 900)    return "先手有利";
  if (cp < 1400)   return "先手優勢";
  return "先手大優勢";
}

function formatCp(cp) {
  return cp > 0 ? `+${cp}` : `${cp}`;
}

function scoreComment(score, total){
  const s = Number(score.toFixed(1));
  if (s >= total) return "素晴らしい！形勢判断名人クラス！";
  if (s >= total - 2) return "強い！正確に形勢判断できてるね！";
  if (s >= total - 3.5) return "いい感じ！";
  if (s >= total - 5) return "がんばろう！";
  return "また挑戦してね！";
}

/* ====== UI Components ====== */
function pill(label, value){
  return `
    <div style="padding:10px 12px;border-radius:16px;background:#f7f8fb;border:1px solid #eef0f5;">
      <div style="font-size:12px;color:#5b6572;font-weight:700;">${label}</div>
      <div style="font-size:18px;font-weight:700;margin-top:4px;color:#1f2328;">${value}</div>
    </div>
  `;
}
function softCard(html){
  return `
    <div style="padding:14px;border-radius:18px;background:#ffffff;border:1px solid #e7e9ee;box-shadow: 0 10px 28px rgba(0,0,0,0.08); margin-bottom: 12px;">
      ${html}
    </div>
  `;
}

/* ====== Quiz Engine ====== */
function renderQuiz(questions) {
  const app = document.getElementById("app");
  let idx = 0;
  const answers = {};

  const show = () => {
    const q = questions[idx];
    app.innerHTML = `
      <div style="text-align:center;margin:2px 0 10px;font-size:12px;color:#5b6572;">問題 ${idx + 1} / ${questions.length}</div>
      <div style="text-align:center;margin-bottom:10px;">
        <img src="${q.large}" style="max-width:min(430px,92%);height:auto;border:1px solid #e7e9ee;border-radius:16px;box-shadow:0 10px 24px rgba(0,0,0,0.06);">
      </div>
      <div style="font-size:14px;margin:8px 2px 10px;font-weight:600;color:#1f2328;">この局面の形勢は？（先手番）</div>
      <div id="btns" style="margin-bottom:10px;"></div>
      <div style="display:flex;justify-content:flex-start;gap:8px;margin-top:10px;">
        <button id="prevBtn"${idx === 0 ? " disabled" : ""} style="padding:8px 12px;border-radius:999px;border:1px solid #d9dde6;background:#fff;cursor:pointer;font-size:13px; color:#222;">戻る</button>
      </div>
    `;

    const btns = document.getElementById("btns");
    LABEL_INFO.forEach(info => {
      const b = document.createElement("button");
      b.textContent = info.label;
      b.style.cssText = `display:block; margin:6px 0; padding:10px; border-radius:10px; border:2px solid ${labelBorderColor(info.key)}; width:100%; text-align:left; background:${labelBgColor(info.key)}; cursor:pointer; font-size:13px; transition: transform 0.1s;`;
      
      b.onclick = () => {
        answers[q.id] = info.key;
        b.style.transform = "scale(0.98)";
        setTimeout(() => {
          if (idx === questions.length - 1) renderResult(questions, answers);
          else { idx++; show(); }
        }, 100);
      };
      btns.appendChild(b);
    });

    document.getElementById("prevBtn").onclick = () => { if (idx > 0) { idx--; show(); } };
  };
  show();
}

/* ====== Result Screen ====== */
function renderResult(questions, answers) {
  const app = document.getElementById("app");
  const diffs = questions.map(q => {
    const userKey = answers[q.id];
    if (!userKey) return null;
    return IDX[userKey] - IDX[labelKeyFromCp(q.aiCp)];
  });

  const score = diffs.reduce((s, d) => (d === 0 ? s + 1 : (Math.abs(d) === 1 ? s + 0.5 : s)), 0);
  const answeredDiffs = diffs.filter(d => d !== null);
  let tendency = "判定不能", avgAbsDiffText = "—", avgSignedText = "—";

  if (answeredDiffs.length > 0) {
    const avg = answeredDiffs.reduce((s,d)=>s+d,0) / answeredDiffs.length;
    avgAbsDiffText = (answeredDiffs.reduce((s,d)=>s+Math.abs(d),0) / answeredDiffs.length).toFixed(1);
    if (avg <= -2.0) tendency = "超悲観派";
    else if (avg <= -1.0) tendency = "悲観派";
    else if (avg <= -0.3) tendency = "やや悲観派";
    else if (avg < 0.3) tendency = "正確派";
    else if (avg < 1.0) tendency = "やや楽観派";
    else if (avg < 2.0) tendency = "楽観派";
    else tendency = "超楽観派";
  }

  let html = softCard(`
    <div style="display:flex;justify-content:space-between;">
      <div style="font-size:18px;font-weight:700;">📊 結果</div>
      <div style="font-size:12px;color:#5b6572;">平均ずれ: <b>${avgAbsDiffText}</b> 段階</div>
    </div>
    <div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      ${pill("🎯 精度スコア", `${score.toFixed(1)} / ${questions.length}`)}
      ${pill("🧭 傾向", tendency)}
    </div>
    <div style="margin-top:10px;padding:10px;border-radius:12px;background:#fff7e6;border:1px solid #ffe2b4;font-weight:700;">💬 ${scoreComment(score, questions.length)}</div>
  `);

  html += `<div style="font-size:14px;font-weight:700;margin:15px 0 10px;text-align:left;">各問の結果</div>`;

  questions.forEach((q, i) => {
    const userKey = answers[q.id] || "未回答";
    const correctKey = labelKeyFromCp(q.aiCp);
    const diff = userKey !== "未回答" ? IDX[userKey] - IDX[correctKey] : null;
    const color = diff === 0 ? "#1a8f3a" : (userKey === "未回答" ? "#8b93a1" : "#d11f1f");
    const mark = diff === 0 ? "〇" : (userKey === "未回答" ? "－" : "×");

    html += `
      <div style="margin-bottom:10px; border:1px solid #eef0f5; padding:10px; border-radius:16px; background:#fff; border-left:5px solid ${color}; display:flex; gap:12px; align-items:center; text-align:left;">
        <img src="${q.thumb}" data-thumb="${q.thumb}" data-large="${q.large}" data-expanded="false" class="result-img" style="width:80px; border-radius:8px; cursor:pointer;">
        <div style="font-size:13px; flex:1;">
          <div style="font-weight:700;">第${i+1}問 <span style="color:${color}">${mark}</span></div>
          <div style="color:${sideTextColor(userKey)}">あなた: ${userKey}</div>
          <div style="color:${sideTextColor(correctKey)}">正解: ${correctKey} (${formatCp(q.aiCp)})</div>
        </div>
      </div>
    `;
  });

  html += `<button id="retryBtn" style="width:100%; padding:14px; border-radius:12px; border:none; background:#1f2328; color:#fff; font-weight:700; cursor:pointer; margin-top:10px;">もう一度挑戦する</button>`;
  
  app.innerHTML = html;

  document.querySelectorAll(".result-img").forEach(img => {
    img.onclick = () => {
      const isExpanded = img.dataset.expanded === "true";
      img.src = isExpanded ? img.dataset.thumb : img.dataset.large;
      img.style.width = isExpanded ? "80px" : "100%";
      img.dataset.expanded = !isExpanded;
    };
  });
  document.getElementById("retryBtn").onclick = () => start();
}

function start() {
  const app = document.getElementById("app");
  app.innerHTML = "読み込み中…";
  loadQuestions().then(renderQuiz).catch(err => app.innerHTML = "エラー: " + err);
}

start();
