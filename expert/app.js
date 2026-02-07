const DATA_DIR = "../data/";
const MANIFEST_URL = DATA_DIR + "manifest.json";

function getRank(score) {
  const s = parseFloat(score);
  if (s >= 99) return "神";
  if (s >= 97) return "名人";
  if (s >= 95) return "九段";
  if (s >= 93) return "八段";
  if (s >= 91) return "七段";
  if (s >= 89) return "六段";
  if (s >= 86) return "五段";
  if (s >= 83) return "四段";
  if (s >= 80) return "三段";
  if (s >= 75) return "二段";
  if (s >= 70) return "初段";
  if (s >= 65) return "1級";
  if (s >= 60) return "2級";
  if (s >= 55) return "3級";
  if (s >= 50) return "4級";
  return "5級";
}

function getSpecialComment(score) {
  const s = parseFloat(score);
  if (s >= 99) return "全知全能の大局観。あなたは神です。";
  if (s >= 97) return "名人クラスの大局観。恐れ入りました。";
  if (s >= 90) return "プロ級の形勢判断力！素晴らしい精度です。";
  if (s >= 70) return "強い！安定した実力を持っています。";
  if (s < 50) return "まずは盤面全体を広く見る練習から始めましょう！";
  return "";
}

function pill(label, value){
  return `<div style="padding:10px 5px;border-radius:18px;background:#f7f8fb;border:1px solid #eef0f5;text-align:center;"><div style="font-size:12px;color:#5b6572;font-weight:700;">${label}</div><div style="margin-top:4px;color:#1f2328;line-height:1.2;">${value}</div></div>`;
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
  } catch (e) { console.error(e); throw e; }
}

function renderQuiz(questions) {
  const app = document.getElementById("app");
  let idx = 0, answers = {};
  const show = () => {
    const q = questions[idx];
    app.innerHTML = `
      <div style="font-size:12px;color:#8b93a1;margin-bottom:10px;">問題 ${idx + 1} / ${questions.length}</div>
      <img src="${DATA_DIR + q.large}" style="max-width:100%; max-height:450px; width:auto; display:block; margin: 0 auto 15px; border-radius:8px; box-shadow:0 8px 20px rgba(0,0,0,0.1);">
      <div style="text-align:center; margin-bottom:20px; background:#fcfcfd; padding:20px; border-radius:16px; border:1px solid #f0f0f5;">
        <div style="font-size:14px;color:#5b6572;font-weight:700;margin-bottom:10px;">あなたの形勢判断（先手番）</div>
        <div id="val-display" style="font-size:40px; font-weight:900; color:#5b6572; margin-bottom:15px; font-variant-numeric: tabular-nums;">±0</div>
        <input type="range" id="score-slider" min="-3000" max="3000" step="50" value="0">
        <div style="display:flex; justify-content:space-between; font-size:11px; color:#8b93a1; font-weight:700; margin-top:5px;">
          <span style="color:#2c49a8;">後手有利</span>
          <span style="color:#e85b5b;">先手有利</span>
        </div>
      </div>
      <button id="submit-btn" style="width:100%; padding:18px; background:#1f2328; color:#fff; border:none; border-radius:14px; font-weight:900; font-size:18px; cursor:pointer;">決定</button>
      <button id="prevBtn"${idx===0?' disabled':''} style="margin-top:15px;background:none;border:none;color:#8b93a1;cursor:pointer;font-size:13px;font-weight:700;width:100%;">← 戻る</button>
    `;
    const slider = document.getElementById("score-slider");
    const display = document.getElementById("val-display");
    slider.oninput = () => {
      const val = parseInt(slider.value);
      display.innerText = (val > 0 ? "+" : "") + val;
      display.style.color = val === 0 ? "#5b6572" : (val > 0 ? "#e85b5b" : "#2c49a8");
    };
    document.getElementById("submit-btn").onclick = () => {
      answers[q.id] = parseInt(slider.value);
      if(++idx < questions.length) {
        show();
        window.parent.postMessage({ type: 'scrollToTop' }, '*');
      } else {
        renderResult(questions, answers);
      }
    };
    document.getElementById("prevBtn").onclick = () => { if(idx>0){idx--; show();} };
  };
  show();
}

function renderResult(questions, answers) {
  window.parent.postMessage({ type: 'scrollToTop' }, '*');
  const rules = document.getElementById('rules-section');
  if (rules) rules.style.display = 'none';
  const app = document.getElementById("app");
  
  const results = questions.map(q => {
    const user = answers[q.id];
    const ai = q.aiCp;
    const rawDiff = user - ai;
    const weight = 1 / (1 + Math.pow(Math.abs(ai) / 1000, 2));
    return { rawDiff, weightedAbsDiff: Math.abs(rawDiff) * weight, user, ai };
  });

  const avgDiff = results.reduce((s, r) => s + r.rawDiff, 0) / questions.length;
  const avgWeightedAbsDiff = results.reduce((s, r) => s + r.weightedAbsDiff, 0) / questions.length;
  const score = Math.max(0, 100 - (avgWeightedAbsDiff / 20)).toFixed(1);
  const rank = getRank(score);
  const diffSign = avgDiff >= 0 ? "+" : "";
  const diffDisplay = `(平均${diffSign}${avgDiff.toFixed(0)})`;

  let tendency = "";
  const ad = avgDiff;
  if (ad > 1000) tendency = "超楽観派";
  else if (ad > 400) tendency = "楽観派";
  else if (ad > 200) tendency = "やや楽観派";
  else if (ad >= -200) tendency = "フラット";
  else if (ad >= -400) tendency = "やや悲観派";
  else if (ad >= -1000) tendency = "悲観派";
  else tendency = "超悲観派";

  const specialMsg = getSpecialComment(score);
  const commentHtml = specialMsg ? `<div style="background:#fff7e6;padding:12px;border-radius:12px;border:1px solid #ffe2b4;font-weight:700;text-align:center;margin-bottom:20px;font-size:14px;">💬 ${specialMsg}</div>` : "";

  // スマホで崩れないようにサイズを微調整 (35px -> 24px)
  app.innerHTML = `
    <div style="text-align:left;">
      <div style="font-size:24px; font-weight:900; text-align:center; margin-bottom:20px; color:#1f2328;">📊 診断結果</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:15px;">
        ${pill("🎯 精度 / 段位", `<div style="margin:2px 0;"><span style="font-size:20px; font-weight:900;">${score}</span><span style="font-size:14px; font-weight:700; color:#8b93a1; margin:0 2px;">/</span><span style="font-size:20px; font-weight:900; color:#e85b5b;">${rank}</span></div>`)}
        ${pill("🧭 判定", `<div style="margin:2px 0;"><span style="font-size:20px; font-weight:900;">${tendency}</span><br><span style="font-size:12px; font-weight:700; color:#5b6572;">${diffDisplay}</span></div>`)}
      </div>
      ${commentHtml}
      <a href="https://x.com/intent/tweet?text=${encodeURIComponent(`【形勢判断診断：エキスパート】\n判定: ${tendency} ${diffDisplay}\n精度: ${score}点 (${rank})\n #形勢判断診断\nhttps://shogicobin.com/evaluation-quiz`)}" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:8px;background:#000;color:#fff;text-decoration:none;padding:14px;border-radius:12px;text-align:center;font-weight:700;margin-bottom:20px;font-size:15px;">結果をXでポストする</a>
      <div id="details"></div>
      <button onclick="location.reload()" style="width:100%;padding:16px;border-radius:12px;border:1px solid #d9dde6;background:#fff;cursor:pointer;font-weight:700;margin-top:10px;color:#1f2328;font-size:15px;">もう一度挑戦する</button>
    </div>
  `;

  results.forEach((r, i) => {
    const q = questions[i];
    const thumbImgPath = DATA_DIR + q.thumb;
    const largeImgPath = DATA_DIR + q.large;
    const aiPos = ((r.ai + 3000) / 6000) * 100;
    const userPos = ((r.user + 3000) / 6000) * 100;
    const barStart = Math.min(aiPos, userPos);
    const barWidth = Math.abs(aiPos - userPos);
    const zoneColor = r.rawDiff > 0 ? "#e85b5b" : "#2c49a8";
    
    let feedback = "";
    if (Math.abs(r.rawDiff) === 0) feedback = '<span style="color:#f39c12; font-size:10px;">★ピタリ</span>';
    else if (Math.abs(r.rawDiff) <= 100) feedback = '<span style="color:#27ae60; font-size:10px;">👍良</span>';
    
    const tickValues = [-2000, 0, 2000]; //  ticksを減らしてスッキリさせる
    const ticks = tickValues.map(v => {
      const pos = ((v + 3000) / 6000) * 100;
      return `<div style="position:absolute; left:${pos}%; width:1px; height:5px; top:1px; background:#9ca3af;"></div>`;
    }).join("");

    const item = document.createElement("div");
    item.style.cssText = `margin-bottom:10px;padding:10px;border-radius:12px;background:#fff;border:1px solid #eee;display:flex;gap:10px;align-items:center;`;
    item.innerHTML = `
      <img src="${thumbImgPath}" style="width:60px;border-radius:6px;">
      <div style="flex:1;">
        <div style="font-size:11px; font-weight:700; margin-bottom:5px;">問${i+1} <span style="font-weight:900;">(正解:${r.ai > 0 ? '+':''}${r.ai})</span> ${feedback}</div>
        <div style="height:6px; background:#f0f0f5; border-radius:3px; position:relative; margin-bottom:5px;">
          ${ticks}
          <div style="position:absolute; left:${barStart}%; width:${barWidth}%; height:100%; background:${zoneColor}; opacity:0.3;"></div>
          <div style="position:absolute; left:${userPos}%; width:10px; height:10px; top:-2px; background:#e85b5b; border-radius:50%; transform:translateX(-50%); z-index:2;"></div>
          <div style="position:absolute; left:${aiPos}%; width:3px; height:12px; top:-3px; background:#1f2328; border-radius:1px; transform:translateX(-50%); z-index:1;"></div>
        </div>
      </div>`;
    document.getElementById("details").appendChild(item);
  });
  setTimeout(sendHeight, 100);
}

const sendHeight = () => {
    const height = document.documentElement.scrollHeight;
    window.parent.postMessage({ type: 'resize', height: height }, '*');
};

window.onload = () => {
    loadQuestions().then(renderQuiz).catch(err => {
        document.getElementById("app").innerHTML = `<div style="padding:20px; color:red;">エラー: ${err.message}</div>`;
    });
    const observer = new MutationObserver(sendHeight);
    observer.observe(document.body, { childList: true, subtree: true });
};
