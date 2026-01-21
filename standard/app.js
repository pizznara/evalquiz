// 一つ外側の階層にある data フォルダを指定
const DATA_DIR = "../data/";
const MANIFEST_URL = DATA_DIR + "manifest.json";

const LABEL_INFO = [
  { key: "先手大優勢", label: "先手大優勢（+1600以上）",    side: "pos",  level: 3 },
  { key: "先手優勢",   label: "先手優勢（+900〜+1399）",    side: "pos",  level: 2 },
  { key: "先手有利",   label: "先手有利（+400〜+799）",     side: "pos",  level: 1 },
  { key: "互角",       label: "互角（±299以内）",           side: "zero", level: 0 },
  { key: "先手不利",   label: "先手不利（-400〜-799）",     side: "neg",  level: 1 },
  { key: "先手劣勢",   label: "先手劣勢（-900〜-1399）",    side: "neg",  level: 2 },
  { key: "先手大劣勢", label: "先手大劣勢（-1600以下）",   side: "neg",  level: 3 },
];

const IDX = { "先手大劣勢": -3, "先手劣勢": -2, "先手不利": -1, "互角": 0, "先手有利": 1, "先手優勢": 2, "先手大優勢": 3 };

function getLabelInfo(key) { return LABEL_INFO.find(l => l.key === key); }

function labelBgColor(key) {
  const info = getLabelInfo(key);
  if (!info) return "#dddddd";
  if (info.side === "zero") return "#eeeeee";
  return info.side === "neg" ? ["#e8f0ff", "#c3d4ff", "#7999ff"][info.level - 1] : ["#ffecec", "#ffb7b7", "#e85b5b"][info.level - 1];
}

function labelBorderColor(key) {
  const info = getLabelInfo(key);
  if (!info) return "#cccccc";
  if (info.side === "zero") return "#999999";
  return info.side === "neg" ? ["#7999ff", "#4d6fe3", "#2c49a8"][info.level - 1] : ["#ff7a7a", "#e85b5b", "#b52f2f"][info.level - 1];
}

function sideTextColor(key) {
  const info = getLabelInfo(key);
  if (!info || info.side === "zero") return "#5b6572";
  return info.side === "pos" ? "#b52f2f" : "#2c49a8";
}

function getDiffBadge(diff) {
  if (diff === null) return "";
  if (diff === 0) return `<div style="background:#fff200; border:1px solid #e6b800; padding:2px 8px; border-radius:6px; font-weight:bold; color:#5c4d00; font-size:11px; display:inline-block;">✨ ピタリ！</div>`;
  const abs = Math.abs(diff), isRakkan = diff > 0;
  return `<div style="background:${isRakkan?'#ffecec':'#e6edff'}; border:1px solid ${isRakkan?'#ffb7b7':'#c3d4ff'}; padding:2px 8px; border-radius:6px; font-weight:bold; color:${isRakkan?'#e85b5b':'#2c49a8'}; font-size:11px; display:inline-block;">${isRakkan?'↑':'↓'} ${isRakkan ? (abs>=2?'超楽観的！':'楽観的') : (abs>=2?'超悲観的！':'悲観的')} (${isRakkan?'+':''}${diff})</div>`;
}

function mulberry32(a){
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a>>>15), 1 | a);
    t = (t + Math.imul(t ^ (t>>>7), 61 | t)) ^ t;
    return ((t ^ (t>>>14)) >>> 0) / 4294967296;
  }
}

async function loadQuestions(seed = Date.now()) {
  try {
    const manifest = await fetch(MANIFEST_URL).then(r => {
      if (!r.ok) throw new Error("manifest.jsonが見つかりません");
      return r.json();
    });
    // データの読み込み先を DATA_DIR + ファイル名 に修正
    const all = await fetch(DATA_DIR + manifest.shards[0]).then(r => {
      if (!r.ok) throw new Error("問題データが見つかりません");
      return r.json();
    });
    const rnd = mulberry32(seed);
    const shuffled = [...all];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 8);
  } catch (e) {
    throw e;
  }
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

function formatCp(cp) { return cp > 0 ? `+${cp}` : `${cp}`; }

function scoreComment(score, total){
  const s = Number(score.toFixed(1));
  if (s >= total) return "素晴らしい！形勢判断名人クラス！";
  if (s >= total - 2) return "強い！正確に形勢判断できてるね！";
  if (s >= total - 3.5) return "いい感じ！";
  if (s >= total - 5) return "がんばろう！";
  return "また挑戦してね！";
}

function pill(label, value){
  return `<div style="padding:10px;border-radius:16px;background:#f7f8fb;border:1px solid #eef0f5;text-align:center;"><div style="font-size:12px;color:#5b6572;font-weight:700;">${label}</div><div style="font-size:18px;font-weight:700;margin-top:4px;">${value}</div></div>`;
}

function renderQuiz(questions) {
  const app = document.getElementById("app");
  let idx = 0, answers = {};
  const show = () => {
    const q = questions[idx];
    // 画像パスの修正 (data/ フォルダの下にあるため)
    const largeImgPath = DATA_DIR + q.large;
    app.innerHTML = `
      <div style="font-size:12px;color:#8b93a1;margin-bottom:10px;">問題 ${idx + 1} / ${questions.length}</div>
      <img src="${largeImgPath}" style="max-width:100%;border-radius:16px;box-shadow:0 8px 20px rgba(0,0,0,0.1);margin-bottom:15px;">
      <div style="font-size:15px;font-weight:700;margin-bottom:15px;">この局面の形勢は？（先手番）</div>
      <div id="btns"></div>
      <button id="prevBtn"${idx===0?' disabled':''} style="margin-top:15px;background:none;border:none;color:#8b93a1;cursor:pointer;font-size:13px;font-weight:700;">← 戻る</button>
    `;
    LABEL_INFO.forEach(info => {
      const b = document.createElement("button");
      b.textContent = info.label;
      b.style.cssText = `display:block;width:100%;margin:8px 0;padding:12px;border-radius:12px;border:2px solid ${labelBorderColor(info.key)};background:${labelBgColor(info.key)};font-family:inherit;font-weight:700;cursor:pointer;text-align:left;transition:0.1s;`;
      b.onclick = () => { answers[q.id] = info.key; if(++idx < questions.length) show(); else renderResult(questions, answers); };
      document.getElementById("btns").appendChild(b);
    });
    document.getElementById("prevBtn").onclick = () => { idx--; show(); };
  };
  show();
}

function renderResult(questions, answers) {
  const app = document.getElementById("app");
  const diffs = questions.map(q => IDX[answers[q.id]] - IDX[labelKeyFromCp(q.aiCp)]);
  const score = diffs.reduce((s, d) => s + (d === 0 ? 1 : (Math.abs(d) === 1 ? 0.5 : 0)), 0);
  const avgDiff = diffs.reduce((s, d) => s + d, 0) / questions.length;
  const diffDisplay = avgDiff > 0 ? `+${avgDiff.toFixed(1)}` : avgDiff.toFixed(1);

  let tendency = "正確派";
  if (avgDiff <= -1.0) tendency = "悲観派"; else if (avgDiff <= -0.3) tendency = "やや悲観派";
  else if (avgDiff >= 1.0) tendency = "楽観派"; else if (avgDiff >= 0.3) tendency = "やや楽観派";

  let barHtml = diffs.map((d, i) => {
    const h = Math.min(Math.abs(d)*14, 45), isR = d > 0;
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;height:100px;position:relative;">
      <div style="position:absolute;${isR?'bottom:50%':'top:50%'};width:60%;height:${h}px;background:${d===0?'#ffd700':(isR?'#e85b5b':'#2c49a8')};border-radius:2px;"></div>
      <div style="position:absolute;bottom:-15px;font-size:9px;color:#8b93a1;">Q${i+1}</div>
    </div>`;
  }).join("");

  const shareText = encodeURIComponent(`【形勢判断診断】\n精度: ${score.toFixed(1)} / 8.0点\n傾向: ${tendency} (${diffDisplay})\n#将棋 #評価値クイズ`);
  
  app.innerHTML = `
    <div style="text-align:left;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;">
        ${pill("精度スコア", score.toFixed(1))}
        ${pill("平均のズレ", `${tendency}(${diffDisplay})`)}
      </div>
      <div style="background:#fff7e6;padding:12px;border-radius:12px;border:1px solid #ffe2b4;font-weight:700;text-align:center;margin-bottom:20px;">💬 ${scoreComment(score, 8)}</div>
      <div style="margin-bottom:30px;padding:15px 5px;background:#f8f9fa;border:3px solid #e9ecef;border-radius:12px;">
        <div style="display:flex;align-items:flex-end;height:100px;background:linear-gradient(to bottom, transparent 49.5%, #dee2e6 49.5%, #dee2e6 50.5%, transparent 50.5%);">${barHtml}</div>
      </div>
      <a href="https://twitter.com/intent/tweet?text=${shareText}" target="_blank" style="display:block;background:#000;color:#fff;text-decoration:none;padding:14px;border-radius:12px;text-align:center;font-weight:700;margin-bottom:20px;">Xでポストする</a>
      <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;margin-bottom:10px;"><span>各問の詳細</span><span style="color:#8b93a1;font-size:11px;">📸 クリックで拡大</span></div>
      <div id="details"></div>
      <button onclick="location.reload()" style="width:100%;padding:14px;border-radius:12px;border:1px solid #d9dde6;background:#fff;cursor:pointer;font-weight:700;margin-top:10px;">もう一度挑戦</button>
    </div>
  `;

  questions.forEach((q, i) => {
    const correct = labelKeyFromCp(q.aiCp), diff = IDX[answers[q.id]] - IDX[correct];
    const thumbImgPath = DATA_DIR + q.thumb;
    const largeImgPath = DATA_DIR + q.large;
    const item = document.createElement("div");
    item.style.cssText = `margin-bottom:10px;padding:10px;border-radius:16px;background:#fff;border:1px solid #eee;border-left:5px solid ${diff===0?'#1a8f3a':'#d11f1f'};display:flex;gap:12px;align-items:center;`;
    item.innerHTML = `
      <img src="${thumbImgPath}" onclick="this.src=this.src==='${thumbImgPath}'?'${largeImgPath}':'${thumbImgPath}';this.style.width=this.style.width==='80px'?'100%':'80px';" style="width:80px;border-radius:8px;cursor:pointer;transition:0.2s;">
      <div style="font-size:13px;">
        <div style="font-weight:700;margin-bottom:4px;">Q${i+1} ${getDiffBadge(diff)}</div>
        <div style="color:${sideTextColor(answers[q.id])}">あなた: ${answers[q.id]}</div>
        <div style="color:${sideTextColor(correct)}">正解: <b>${correct}</b></div>
      </div>`;
    document.getElementById("details").appendChild(item);
  });
}

// 読み込み開始
window.onload = () => {
    loadQuestions().then(renderQuiz).catch(err => {
        document.getElementById("app").innerHTML = `<div style="padding:20px; color:red;">エラー: ${err.message}<br>フォルダ構成を確認してください。</div>`;
    });
};
