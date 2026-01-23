const DATA_DIR = "../data/";
const MANIFEST_URL = DATA_DIR + "manifest.json";

const LABEL_INFO = [
  { key: "先手大優勢", label: "先手大優勢（+1600以上）",    side: "pos",  level: 3 },
  { key: "先手優勢",   label: "先手優勢（+900〜+1399）",    side: "pos",  level: 2 },
  { key: "先手有利",   label: "先手有利（+400〜+799）",      side: "pos",  level: 1 },
  { key: "互角",       label: "互角（±299以内）",            side: "zero", level: 0 },
  { key: "先手不利",   label: "先手不利（-400〜-799）",      side: "neg",  level: 1 },
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
  if (diff === 0) return `<div style="background:#fff200; border:1px solid #e6b800; padding:2px 8px; border-radius:6px; font-weight:bold; color:#5c4d00; font-size:11px; display:inline-block;">✨ ピタリ</div>`;
  const abs = Math.abs(diff), isRakkan = diff > 0;
  let text = isRakkan ? (abs>=2?'超楽観的':'楽観的') : (abs>=2?'超悲観的':'悲観的');
  return `<div style="background:${isRakkan?'#ffecec':'#e6edff'}; border:1px solid ${isRakkan?'#ffb7b7':'#c3d4ff'}; padding:2px 8px; border-radius:6px; font-weight:bold; color:${isRakkan?'#e85b5b':'#2c49a8'}; font-size:11px; display:inline-block;">${isRakkan?'↑':'↓'} ${text} (${isRakkan?'+':''}${diff})</div>`;
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
    const manifest = await fetch(MANIFEST_URL).then(r => r.json());
    const all = await fetch(DATA_DIR + manifest.shards[0]).then(r => r.json());
    const rnd = mulberry32(seed);
    const shuffled = [...all];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 8);
  } catch (e) { throw e; }
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
  if (s >= total) return "人間を辞めていますね。全知全能の判断力です。";
  if (s >= total - 2) return "強い！正確に形勢判断できてます！";
  if (s >= total - 3.5) return "いい感じ！";
  if (s >= total - 5) return "がんばろう！";
  return "また挑戦してね！";
}

function pill(label, value){
  return `<div style="padding:12px 10px;border-radius:18px;background:#f7f8fb;border:1px solid #eef0f5;text-align:center;"><div style="font-size:14px;color:#5b6572;font-weight:700;">${label}</div><div style="font-size:22px;font-weight:900;margin-top:6px;color:#1f2328;line-height:1.2;">${value}</div></div>`;
}

function renderQuiz(questions) {
  const app = document.getElementById("app");
  let idx = 0, answers = {};
  const show = () => {
    const q = questions[idx];
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
      b.style.cssText = `display:block;width:100%;margin:8px 0;padding:12px;border-radius:12px;border:2px solid ${labelBorderColor(info.key)};background:${labelBgColor(info.key)};font-family:inherit;font-weight:700;text-align:left;transition:0.1s;`;
      b.onclick = () => { 
        answers[q.id] = info.key; 
        if(++idx < questions.length) show(); else renderResult(questions, answers); 
      };
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
  const absAvg = Math.abs(avgDiff);
  const diffDisplay = avgDiff > 0 ? `+${avgDiff.toFixed(1)}` : avgDiff.toFixed(1);

  let tendency = "";
  if (score >= 7.9) {
    tendency = "神";
  } else if (absAvg <= 0.3) {
    if (score >= 6.0)      tendency = "精密機械";
    else if (score >= 3.0) tendency = "バランス型";
    else                   tendency = "なんだかんだバランス型";
  } else if (avgDiff > 0.3) {
    if (avgDiff >= 1.5)      tendency = "超楽観派";
    else if (avgDiff >= 1.0) tendency = "楽観派";
    else                     tendency = "やや楽観派";
  } else {
    if (avgDiff <= -1.5)      tendency = "超悲観派";
    else if (avgDiff <= -1.0) tendency = "悲観派";
    else                      tendency = "やや悲観派";
  }

  let specialMessage = "";
  if (score >= 7.9) {
    specialMessage = "\n全知全能の神";
  } else if (tendency === "精密機械") {
    specialMessage = "\n人間離れした正確さ"; 
  }

  const shareContent = `【形勢判断診断】\n傾向: ${tendency}\n精度: ${score.toFixed(1)} / 8.0点${specialMessage}\n#将棋 #形勢判断診断`;
  const shareText = encodeURIComponent(shareContent);

  let barHtml = diffs.map((d, i) => {
    const h = Math.abs(d) * 15, isR = d > 0;
    const color = d === 0 ? "#ffd700" : (isR ? "#e85b5b" : "#2c49a8");
    const content = d === 0 ? '<span style="position:absolute; bottom:calc(50% - 11px); font-size:16px; z-index:2;">★</span>' : '';
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;height:100px;position:relative;">
      <div style="position:absolute;${isR?'bottom:50%':'top:50%'};width:60%;height:${h}px;background:${color};border-radius:2px;z-index:1;"></div>
      ${content}
      <div style="position:absolute;bottom:-15px;font-size:9px;color:#8b93a1;">Q${i+1}</div>
    </div>`;
  }).join("");

  app.innerHTML = `
    <div style="text-align:left;">
      <div style="font-size:20px; font-weight:900; text-align:center; margin-bottom:20px; color:#1f2328;">📊 診断結果</div>
      <div style="display:grid;grid-template-columns:1fr 1.3fr;gap:12px;margin-bottom:15px;">
        ${pill("🎯 精度スコア", `${score.toFixed(1)} <span style="font-size:14px; font-weight:700;">/ 8.0</span>`)}
        ${pill("🧭 判定", `${tendency} <span style="font-size:14px; font-weight:700;">(平均${diffDisplay})</span>`)}
      </div>
      <div style="background:#fff7e6;padding:12px;border-radius:12px;border:1px solid #ffe2b4;font-weight:700;text-align:center;margin-bottom:20px;">💬 ${scoreComment(score, 8)}</div>
      <div style="margin:10px 0 35px;padding:15px 5px;background:#f8f9fa;border:3px solid #e9ecef;border-radius:12px;">
        <div style="display:flex;align-items:flex-end;height:100px;background:linear-gradient(to bottom, transparent 49.5%, #dee2e6 49.5%, #dee2e6 50.5%, transparent 50.5%);">${barHtml}</div>
      </div>
      <a href="https://twitter.com/intent/tweet?text=${shareText}" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:8px;background:#000;color:#fff;text-decoration:none;padding:14px;border-radius:12px;text-align:center;font-weight:700;margin-bottom:20px;">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z"/></svg>
        結果をXでポストする
      </a>
      <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;margin-bottom:10px;"><span>各問の詳細</span><span style="color:#8b93a1;font-size:11px;">📸 画像クリックで拡大</span></div>
      <div id="details"></div>
      <button onclick="location.reload()" style="width:100%;padding:14px;border-radius:12px;border:1px solid #d9dde6;background:#fff;cursor:pointer;font-weight:700;margin-top:10px;color:#1f2328;">もう一度挑戦する</button>
    </div>
  `;

  questions.forEach((q, i) => {
    const correct = labelKeyFromCp(q.aiCp), diff = IDX[answers[q.id]] - IDX[correct];
    const thumbImgPath = DATA_DIR + q.thumb, largeImgPath = DATA_DIR + q.large;
    const item = document.createElement("div");
    item.style.cssText = `margin-bottom:10px;padding:10px;border-radius:16px;background:#fff;border:1px solid #eee;border-left:5px solid ${diff===0?'#1a8f3a':'#d11f1f'};display:flex;gap:12px;align-items:center;`;
    item.innerHTML = `
      <img src="${thumbImgPath}" onclick="this.src=this.src==='${thumbImgPath}'?'${largeImgPath}':'${thumbImgPath}';this.style.width=this.style.width==='80px'?'100%':'80px';" style="width:80px;border-radius:8px;cursor:pointer;transition:0.2s;">
      <div style="font-size:13px;">
        <div style="font-weight:700;margin-bottom:4px;">第${i+1}問 ${getDiffBadge(diff)}</div>
        <div style="color:${sideTextColor(answers[q.id])}">あなた: ${answers[q.id]}</div>
        <div style="color:${sideTextColor(correct)}">正解: <b>${correct}</b> (${formatCp(q.aiCp)})</div>
      </div>`;
    document.getElementById("details").appendChild(item);
  });
}

// 起動時の処理
window.onload = () => {
    loadQuestions().then(renderQuiz).catch(err => {
        document.getElementById("app").innerHTML = `<div style="padding:20px; color:red;">エラー: ${err.message}</div>`;
    });
  // --- ここを追加 ---
    // 最初の描画
    drawHeaderBackground();
    // 画面サイズが変わった時も赤い線がズレないように再描画
    window.addEventListener('resize', drawHeaderBackground);
};

// --- 背景の赤いグラフを描画するシステム（線のみ版） ---
function drawHeaderBackground() {
    const canvas = document.getElementById('quiz-bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const parent = canvas.parentElement;
    
    // サイズを親要素に合わせる
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 評価値グラフ（赤色の線）の設定
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(232, 91, 91, 0.5)'; // 透明度50%の赤色
    ctx.lineWidth = 2.5; // 少しだけ線を太くして存在感を出しました
    ctx.lineJoin = 'round'; // 角を丸くして滑らかに
    ctx.lineCap = 'round';
    
    // グラフのデータ点（局面の起伏をイメージ）
    const data = [0.6, 0.55, 0.75, 0.35, 0.85, 0.2, 0.6, 0.5];
    const step = w / (data.length - 1);
    
    data.forEach((val, i) => {
        const x = i * step;
        const y = h - (val * h); 
        if(i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    
    // 線を描画する
    ctx.stroke();
}
