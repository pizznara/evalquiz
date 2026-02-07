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
    // ★ ここがポイント：タイトルカードと遊び方の両方を隠す
    const header = document.querySelector('.quiz-header');
    const rules = document.getElementById('rules-section');
    if (header) header.style.display = 'none';
    if (rules) rules.style.display = 'none';

    const q = questions[idx];
    app.innerHTML = `
      <div style="height: 120px;"></div>
      <div style="font-size:12px;color:#8b93a1;margin-bottom:10px;">問題 ${idx + 1} / ${questions.length}</div>
      <img src="${DATA_DIR + q.large}" style="max-width:100%; max-height:450px; width:auto; display:block; margin: 0 auto 15px; border-radius:8px; box-shadow:0 8px 20px rgba(0,0,0,0.1);">
      
      <div style="text-align:center; margin-bottom:20px; background:#fcfcfd; padding:20px; border-radius:16px; border:1px solid #f0f0f5;">
        <div style="font-size:14px;color:#5b6572;font-weight:700;margin-bottom:10px;">あなたの形勢判断（先手番）</div>
        <div id="val-display" style="font-size:40px; font-weight:900; color:#5b6572; margin-bottom:15px; font-variant-numeric: tabular-nums;">±0</div>
        <input type="range" id="score-slider" min="-3000" max="3000" step="50" value="0" style="width: 100%; height: 12px; cursor: pointer;">
        <div style="display:flex; justify-content:space-between; font-size:12px; color:#8b93a1; font-weight:700; margin-top:10px;">
          <span style="color:#2c49a8;">後手有利 (-3000)</span>
          <span style="color:#e85b5b;">先手有利 (+3000)</span>
        </div>
      </div>
      <button id="submit-btn" style="width:100%; padding:18px; background:#1f2328; color:#fff; border:none; border-radius:14px; font-weight:900; font-size:18px; cursor:pointer;">決定</button>
      <button id="prevBtn"${idx===0?' disabled':''} style="margin-top:15px;background:none;border:none;color:#8b93a1;cursor:pointer;font-size:13px;font-weight:700;">← 戻る</button>
    `;

    // 親画面へスクロールと高さ調整を依頼（少し遅延させて確実に行う）
    setTimeout(() => {
        window.parent.postMessage({ type: 'resize', height: document.documentElement.scrollHeight }, '*');
        window.parent.postMessage({ type: 'scrollToTop' }, '*');
    }, 50);

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

function renderResult(questions, answers) {
  // 結果表示のコード（前回までのものをベースに、必要に応じて調整してください）
  const app = document.getElementById("app");
  app.innerHTML = `<div style="padding-top:120px; text-align:center;"><h2>診断終了</h2><button onclick="location.reload()" style="padding:15px 30px; border-radius:12px; cursor:pointer;">もう一度</button></div>`;
  window.parent.postMessage({ type: 'scrollToTop' }, '*');
}

window.onload = () => {
    loadQuestions().then(renderQuiz).catch(err => {
        document.getElementById("app").innerHTML = `<div style="padding:20px; color:red;">エラー: ${err.message}</div>`;
    });
};
