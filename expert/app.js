const DATA_DIR = "../data/";
const MANIFEST_URL = DATA_DIR + "manifest.json";

// 精度スコアに応じた特別なコメント（90点以上のみ）
function getSpecialComment(score) {
  const s = parseFloat(score);
  if (s >= 99) return "将棋の神";
  if (s >= 95) return "正確無比！人間離れした形勢判断力！";
  if (s >= 90) return "すごい！形勢判断のプロ！";
  return "";
}

function pill(label, value){
  return `<div style="padding:12px 10px;border-radius:18px;background:#f7f8fb;border:1px solid #eef0f5;text-align:center;"><div style="font-size:14px;color:#5b6572;font-weight:700;">${label}</div><div style="margin-top:4px;color:#1f2328;line-height:1.2;">${value}</div></div>`;
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

function renderQuiz(questions) {
  const app = document.getElementById("app");
  let idx = 0, answers = {};
  
  const show = () => {
    const q = questions[idx];
    app.innerHTML = `
      <div style="font-size:12px;color:#8b93a1;margin-bottom:10px;">エキスパート問題 ${idx + 1} / ${questions.length}</div>
      <img src="${DATA_DIR + q.large}" style="max-width:100%; max-height:450px; width:auto; display:block; margin: 0 auto 15px; border-radius:8px; box-shadow:0 8px 20px rgba(0,0,0,0.1);">
      
      <div style="text-align:center; margin-bottom:20px; background:#fcfcfd; padding:20px; border-radius:16px; border:1px solid #f0f0f5;">
        <div style="font-size:14px;color:#5b6572;font-weight:700;margin-bottom:10px;">あなたの形勢判断（先手番）</div>
        <div id="val-display" style="font-size:40px; font-weight:900; color:#5b6572; margin-bottom:15px; font-variant-numeric: tabular-nums;">±0</div>
        
        <input type="range" id="score-slider" min="-3000" max="3000" step="50" value="0" 
          style="width: 100%; height: 12px; cursor: pointer; touch-action: none; margin: 10px 0;">
        
        <div style="display:flex; justify-content:space-between; font-size:12px; color:#8b93a1; font-weight:700;">
          <span style="color:#2c49a8;">後手有利 (-3000)</span>
          <span style="color:#e85b5b;">先手有利 (+3000)</span>
        </div>
      </div>

      <button id="submit-btn" style="width:100%; padding:18px; background:#1f2328; color:#fff; border:none; border-radius:14px; font-weight:900; font-size:18px; cursor:pointer; transition:0.2s;">決定</button>
      <button id="prevBtn"${idx===0?' disabled':''} style="margin-top:15px;background:none;border:none;color:#8b93a1;cursor:pointer;font-size:13px;font-weight:700;">← 戻る</button>
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

    document.getElementById("prevBtn").onclick = () => { idx--; show(); };
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
    const weightedAbsDiff = Math.abs(rawDiff) * weight;
    return { rawDiff, weightedAbsDiff, user, ai };
  });

  const avgDiff = results.reduce((s, r) => s + r.rawDiff, 0) / questions.length;
  const avgWeightedAbsDiff = results.reduce((s, r) => s + r.weightedAbsDiff, 0) / questions.length;
  const score = Math.max(0, 100 - (avgWeightedAbsDiff / 20)).toFixed(1);
  
  const diffSign = avgDiff >= 0 ? "+" : "";
  const diffDisplay = `(平均${diffSign}${avgDiff.toFixed(0)})`;

  let tendency = "";
  if (Math.abs(avgDiff) <= 300) tendency = "フラット";
  else if (avgDiff > 300) tendency = avgDiff > 1000 ? "超楽観派" : "楽観派";
  else tendency = avgDiff < -1000 ? "超悲観派" : "悲観派";

  const specialMsg = getSpecialComment(score);
  const commentHtml = specialMsg ? `<div style="background:#fff7e6;padding:12px;border-radius:12px;border:1px solid #ffe2b4;font-weight:700;text-align:center;margin-bottom:20px;">💬 ${specialMsg}</div>` : "";

  const shareContent = `【形勢判断診断：エキスパート】\n判定: ${tendency} ${diffDisplay}\n精度スコア: ${score}点\n#将棋 #形勢判断診断`;
  const shareText = encodeURIComponent(shareContent);

  app.innerHTML = `
    <div style="text-align:left;">
      <div style="font-size:35px; font-weight:900; text-align:center; margin-bottom:20px; color:#1f2328;">📊 診断結果</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:15px;">
        ${pill("🎯 精度スコア", `<span style="font-size:32px; font-weight:900;">${score}</span> <span style="font-size:14px; font-weight:700;">点</span>`)}
        ${pill("🧭 判定", `<div style="margin-top:8px;"><span style="font-size:20px; font-weight:900;">${tendency}</span><br><span style="font-size:12px; font-weight:700; color:#5b6572;">${diffDisplay}</span></div>`)}
      </div>
      ${commentHtml}
      
      <a href="https://twitter.com/intent/tweet?text=${shareText}%0Ahttps://shogicobin.com/evaluation-quiz" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:8px;background:#000;color:#fff;text-decoration:none;padding:14px;border-radius:12px;text-align:center;font-weight:700;margin-bottom:20px;">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z"/></svg>
        結果をXでポストする
      </a>

      <div style="font-size:14px;font-weight:700;margin-bottom:10px;display:flex;justify-content:space-between;">
        <span>各問の分析</span>
        <span style="color:#8b93a1;font-size:11px;">※赤丸：正解 / 黒太線：予想</span>
      </div>
      <div id="details"></div>
      <button onclick="location.reload()" style="width:100%;padding:14px;border-radius:12px;border:1px solid #d9dde6;background:#fff;cursor:pointer;font-weight:700;margin-top:10px;color:#1f2328;">もう一度挑戦する</button>
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

    // 誤差に応じたテキスト
    let feedback = "";
    const absDiff = Math.abs(r.rawDiff);
    if (absDiff === 0) feedback = '<span style="color:#f39c12; margin-left:8px;">★ピタリ！</span>';
    else if (absDiff <= 100) feedback = '<span style="color:#27ae60; margin-left:8px;">👍いいね！</span>';

    // 1000ごとのメモリと数値（見やすく調整）
    const tickValues = [-2000, -1000, 0, 1000, 2000];
    const ticks = tickValues.map(v => {
      const pos = ((v + 3000) / 6000) * 100;
      const label = (v === 0) ? "0" : (v > 0 ? `+${v}` : v);
      return `
        <div style="position:absolute; left:${pos}%; width:1px; height:6px; top:1px; background:#9ca3af; z-index:1;"></div>
        <div style="position:absolute; left:${pos}%; top:8px; transform:translateX(-50%); font-size:10px; color:#4b5563; font-weight:800; z-index:1;">${label}</div>
      `;
    }).join("");

    const item = document.createElement("div");
    item.style.cssText = `margin-bottom:12px;padding:12px;border-radius:16px;background:#fff;border:1px solid #eee;display:flex;gap:12px;align-items:center;`;
    item.innerHTML = `
      <img src="${thumbImgPath}" onclick="this.src=this.src==='${thumbImgPath}'?'${largeImgPath}':'${thumbImgPath}';this.style.width=this.style.width==='80px'?'100%':'80px';" style="width:80px;border-radius:8px;cursor:pointer;transition:0.2s;">
      <div style="flex:1;">
        <div style="font-size:12px; font-weight:700; margin-bottom:8px;">第${i+1}問 <span style="color:#1f2328; font-weight:900;">(正解: ${r.ai > 0 ? '+':''}${r.ai})</span>${feedback}</div>
        
        <div style="height:8px; background:#f0f0f5; border-radius:4px; position:relative; margin:15px 0 20px 0;">
          ${ticks}
          <div style="position:absolute; left:${barStart}%; width:${barWidth}%; height:100%; background:${zoneColor}; opacity:0.3; border-radius:4px;"></div>
          <div style="position:absolute; left:${aiPos}%; width:12px; height:12px; top:-2px; background:#e85b5b; border-radius:50%; transform:translateX(-50%); z-index:4; box-shadow:0 0 4px rgba(232,91,91,0.5);"></div>
          <div style="position:absolute; left:${userPos}%; width:5px; height:16px; top:-4px; background:#1f2328; border-radius:2px; transform:translateX(-50%); z-index:3;"></div>
        </div>

        <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:700;">
          <span>
            <span style="color:#5b6572;">予想: ${r.user > 0 ? '+':''}${r.user}</span>
            <span style="margin-left:8px; color:${zoneColor};">誤差: ${r.rawDiff > 0 ? '+':''}${r.rawDiff}</span>
          </span>
        </div>
      </div>`;
    document.getElementById("details").appendChild(item);
  });
}

const sendHeight = () => {
    const height = document.documentElement.scrollHeight;
    window.parent.postMessage({ type: 'resize', height: height }, '*');
};

window.onload = () => {
    loadQuestions().then(renderQuiz).catch(err => {
        document.getElementById("app").innerHTML = `<div style="padding:20px; color:red;">エラー: ${err.message}</div>`;
    });
    sendHeight();
    const observer = new MutationObserver(() => {
        sendHeight();
        document.querySelectorAll('#app img').forEach(img => {
            if (!img.complete) img.onload = sendHeight;
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', sendHeight);
};
