const DATA_DIR = "../data/";
const MANIFEST_URL = DATA_DIR + "manifest.json";

function getRank(score) {
  const s = parseFloat(score);
  if (s >= 99) return "神"; if (s >= 97) return "名人"; if (s >= 95) return "九段";
  if (s >= 93) return "八段"; if (s >= 91) return "七段"; if (s >= 89) return "六段";
  if (s >= 86) return "五段"; if (s >= 83) return "四段"; if (s >= 80) return "三段";
  if (s >= 75) return "二段"; if (s >= 70) return "初段"; if (s >= 65) return "1級";
  if (s >= 60) return "2級"; if (s >= 55) return "3級"; if (s >= 50) return "4級";
  return "5級";
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
    
    // 遊び方は隠すだけ（消さない）
    const rules = document.getElementById('rules-section');
    if (rules) rules.style.display = 'none';

    // HTMLを構築。盤面の上の「ヘッダーよけ余白」を多め（120px）に確保
    app.innerHTML = `
      <div id="top-margin" style="height: 120px;"></div>
      <div style="font-size:12px;color:#8b93a1;margin-bottom:10px;">問題 ${idx + 1} / ${questions.length}</div>
      <img src="${DATA_DIR + q.large}" style="max-width:100%; max-height:450px; width:auto; display:block; margin: 0 auto 15px; border-radius:8px; box-shadow:0 8px 20px rgba(0,0,0,0.1);">
      <div style="text-align:center; margin-bottom:20px; background:#fcfcfd; padding:20px; border-radius:16px; border:1px solid #f0f0f5;">
        <div style="font-size:14px;color:#5b6572;font-weight:700;margin-bottom:10px;">あなたの形勢判断（先手番）</div>
        <div id="val-display" style="font-size:40px; font-weight:900; color:#5b6572; margin-bottom:15px;">±0</div>
        <input type="range" id="score-slider" min="-3000" max="3000" step="50" value="0" style="width: 100%; cursor: pointer;">
      </div>
      <button id="submit-btn" style="width:100%; padding:18px; background:#1f2328; color:#fff; border:none; border-radius:14px; font-weight:900; font-size:18px;">決定</button>
    `;

    // ★ 描画直後と、少し遅れてからの2回、親に「戻れ」と「今の高さを守れ」を伝える
    const triggerScroll = () => {
        window.parent.postMessage({ type: 'resize', height: document.documentElement.scrollHeight }, '*');
        window.parent.postMessage({ type: 'scrollToTop' }, '*');
    };
    
    triggerScroll();
    setTimeout(triggerScroll, 100); // 描画遅延対策

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
  };
  show();
}

function renderResult(questions, answers) {
  const app = document.getElementById("app");
  const results = questions.map(q => ({ user: answers[q.id], ai: q.aiCp }));
  const score = 80; // 省略
  const rank = getRank(score);

  app.innerHTML = `
    <div style="padding-top:120px; text-align:center;">
      <div style="font-size:35px; font-weight:900;">診断完了</div>
      <button onclick="location.reload()" style="margin-top:20px; padding:15px; width:100%; border-radius:12px;">最初から</button>
    </div>
  `;
  window.parent.postMessage({ type: 'scrollToTop' }, '*');
}

window.onload = () => {
    loadQuestions().then(renderQuiz);
};
