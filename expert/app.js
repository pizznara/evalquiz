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
  } catch (e) { 
    console.error(e);
    throw e; 
  }
}

function renderQuiz(questions) {
  const app = document.getElementById("app");
  let idx = 0, answers = {};
  
  const show = () => {
    const q = questions[idx];
    
    // 遊び方を非表示にする（高さを詰めてスクロール先を盤面に寄せる）
    const rules = document.getElementById('rules-section');
    if (rules) rules.style.display = 'none';

    app.innerHTML = `
      <div style="height: 100px;"></div> 
      
      <div style="font-size:12px;color:#8b93a1;margin-bottom:10px;">問題 ${idx + 1} / ${questions.length}</div>
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

      <button id="submit-btn" style="width:100%; padding:18px; background:#1f2328; color:#fff; border:none; border-radius:14px; font-weight:900; font-size:18px; cursor:pointer;">決定</button>
      <button id="prevBtn"${idx===0?' disabled':''} style="margin-top:15px;background:none;border:none;color:#8b93a1;cursor:pointer;font-size:13px;font-weight:700;">← 戻る</button>
    `;

    // 親（WordPress）に「上に戻れ」と命令する
    // 親はこのiFrameの最上部を表示しようとするが、100pxの余白があるので盤面がヘッダーの下に綺麗に出る
    window.parent.postMessage({ type: 'scrollToTop' }, '*');
    
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
      } else {
        renderResult(questions, answers);
      }
    };
    document.getElementById("prevBtn").onclick = () => { idx--; show(); };
  };
  show();
}

// （renderResult以下、およびsendHeight, onloadは変更なしですが、一応含めます）
function renderResult(questions, answers) {
  const app = document.getElementById("app");
  const results = questions.map(q => {
    const user = answers[q.id];
    const ai = q.aiCp;
    return { rawDiff: user - ai, weightedAbsDiff: Math.abs(user - ai) * (1 / (1 + Math.pow(Math.abs(ai) / 1000, 2))), user, ai };
  });
  const avgWeightedAbsDiff = results.reduce((s, r) => s + r.weightedAbsDiff, 0) / questions.length;
  const score = Math.max(0, 100 - (avgWeightedAbsDiff / 20)).toFixed(1);
  const rank = getRank(score);

  app.innerHTML = `
    <div style="text-align:left; padding-top:100px;">
      <div style="font-size:35px; font-weight:900; text-align:center; margin-bottom:20px;">📊 診断結果</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:15px;">
        ${pill("🎯 精度 / 段位", `<span style="font-size:26px; font-weight:900;">${score}</span> / <span style="font-size:26px; font-weight:900; color:#e85b5b;">${rank}</span>`)}
      </div>
      <div id="details"></div>
      <button onclick="location.reload()" style="width:100%;padding:16px;border-radius:12px;border:1px solid #d9dde6;background:#fff;cursor:pointer;font-weight:700;margin-top:10px;">もう一度挑戦する</button>
    </div>
  `;
  window.parent.postMessage({ type: 'scrollToTop' }, '*');
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
    const observer = new MutationObserver(sendHeight);
    observer.observe(document.body, { childList: true, subtree: true });
};
