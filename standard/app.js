const MANIFEST_URL = "../data/manifest.json";

const LABELS7 = [
  "先手大劣勢","先手劣勢","先手不利",
  "互角",
  "先手有利","先手優勢","先手大優勢"
];

// ラベルを数値に対応（採点用）
const IDX = {
  "先手大劣勢": -3,
  "先手劣勢": -2,
  "先手不利": -1,
  "互角": 0,
  "先手有利": 1,
  "先手優勢": 2,
  "先手大優勢": 3
};

// ラベルごとの色（大劣勢側=青、優勢側=赤）
function labelColor(label) {
  if (label === "互角") return "#888888";
  if (label === "先手大劣勢" || label === "先手劣勢" || label === "先手不利") {
    return "#4a6fe3"; // 青系
  }
  // 有利〜大優勢
  return "#e35a5a"; // 赤系
}

// 擬似乱数（問題シャッフル用）
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
  // とりあえず 8問
  return shuffled.slice(0, 8);
}

function labelFromCp(cp){
  // あなたが決めた帯に合わせた分類
  if (cp <= -1600) return "先手大劣勢";
  if (cp <= -900)  return "先手劣勢";
  if (cp <= -400)  return "先手不利";
  if (cp < 400)    return "互角";
  if (cp < 900)    return "先手有利";
  if (cp < 1400)   return "先手優勢";
  return "先手大優勢";
}

function renderQuiz(questions){
  const app = document.getElementById("app");
  let idx = 0;
  const answers = {};  // { id: ラベル }

  const show = () => {
    const q = questions[idx];
    const selected = answers[q.id] || null;

    app.innerHTML = `
      <h2>${idx + 1} / ${questions.length}</h2>
      <div style="margin-bottom:8px;">
        <img src="${q.large}"
             style="max-width:min(480px,80%);border:1px solid #ddd;border-radius:8px;display:block;">
      </div>
      <p>この局面の形勢は？（先手視点）</p>
      <div id="btns" style="margin-bottom:12px;"></div>
      <div>
        <button id="prevBtn"${idx === 0 ? " disabled" : ""}>戻る</button>
      </div>
    `;

    const btns = document.getElementById("btns");

    LABELS7.forEach(label => {
      const b = document.createElement("button");
      b.textContent = label;
      b.style.display = "block";
      b.style.margin = "4px 0";
      b.style.padding = "6px 10px";
      b.style.borderRadius = "6px";
      b.style.border = "1px solid #ccc";
      b.style.width = "220px";
      b.style.textAlign = "left";
      b.style.backgroundColor = labelColor(label);
      b.style.color = (label === "互角") ? "#ffffff" : "#ffffff";

      // 既に選択済みなら強調
      if (selected === label) {
        b.style.outline = "3px solid #333";
      }

      b.onclick = () => {
        // 選択を保存
        answers[q.id] = label;
        // 最後の問題なら結果へ、それ以外は自動で次へ
        if (idx === questions.length - 1) {
          renderResult(questions, answers);
        } else {
          idx++;
          show();
        }
      };

      btns.appendChild(b);
    });

    // 戻るボタン
    const prevBtn = document.getElementById("prevBtn");
    prevBtn.onclick = () => {
      if (idx > 0) {
        idx--;
        show();
      }
    };
  };

  show();
}

function renderResult(questions, answers){
  const app = document.getElementById("app");

  // diffs = 回答段階 - 正解段階
  const diffs = questions.map(q => {
    const userLabel = answers[q.id];
    const correctLabel = labelFromCp(q.aiCp);
    return IDX[userLabel] - IDX[correctLabel];
  });

  // スコア：0差=1点、±1差=0.5点、±2以上=0点
  const score = diffs.reduce((s, d) => {
    if (d === 0) return s + 1;
    if (Math.abs(d) === 1) return s + 0.5;
    return s;
  }, 0);

  // 傾向：中央値で判定
  const sorted = [...diffs].sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)];
  const tendency =
    med >= 2  ? "超楽観派" :
    med >= 1  ? "楽観派"   :
    med > -1  ? "正確派"  :
    med > -2  ? "悲観派"  : "超悲観派";

  let html = `
    <h2>結果</h2>
    <p>精度スコア：${score.toFixed(1)} / ${questions.length} 点</p>
    <p>傾向：${tendency}</p>
    <h3>各問の結果（クリックで盤面拡大）</h3>
  `;

  questions.forEach((q, i) => {
    const userLabel = answers[q.id];
    const correctLabel = labelFromCp(q.aiCp);
    const diff = IDX[userLabel] - IDX[correctLabel];

    const isPerfect = (diff === 0);
    const mark = isPerfect ? "〇" : "×";
    const color = isPerfect ? "#008800" : "#cc0000";

    html += `
      <div style="margin-bottom:8px;border:1px solid #eee;padding:8px;border-left:4px solid ${color}">
        <div style="display:flex;align-items:center;gap:8px;">
          <img
            src="${q.thumb}"
            data-thumb="${q.thumb}"
            data-large="${q.large}"
            data-expanded="false"
            class="result-img"
            style="width:80px;cursor:pointer;border:1px solid #ccc;border-radius:4px;"
          >
          <div>
            <div><b>第${i+1}問：</b> <span style="color:${color};font-weight:bold;">${mark}</span></div>
            <div><b>あなた：</b><span style="color:${color};">${userLabel}</span></div>
            <div><b>正解：</b>${correctLabel}（AI評価値：${q.aiCp}）</div>
          </div>
        </div>
      </div>
    `;
  });

  app.innerHTML = html;

  // 結果一覧の画像クリックで拡大／縮小
  document.querySelectorAll(".result-img").forEach(img => {
    img.addEventListener("click", () => {
      const expanded = img.dataset.expanded === "true";
      if (!expanded) {
        // 拡大表示
        img.src = img.dataset.large;
        img.style.width = "min(480px, 80%)";
        img.style.maxWidth = "100%";
        img.dataset.expanded = "true";
      } else {
        // 縮小表示（サムネに戻す）
        img.src = img.dataset.thumb;
        img.style.width = "80px";
        img.dataset.expanded = "false";
      }
    });
  });
}

// 起動
loadQuestions().then(renderQuiz).catch(err => {
  document.getElementById("app").textContent = "読み込みエラー：" + err;
  console.error(err);
});
