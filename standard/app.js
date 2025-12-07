const MANIFEST_URL = "../data/manifest.json";

/**
 * 7段階ラベル情報
 *  - key: 内部キー
 *  - label: 表示用テキスト（帯付き）
 *  - side: "neg" | "zero" | "pos"
 *  - level: 0,1,2,3（段階）
 *
 *  表示順（上→下）:
 *   先手大優勢 → 先手優勢 → 先手有利 → 互角 → 先手不利 → 先手劣勢 → 先手大劣勢
 */
const LABEL_INFO = [
  { key: "先手大優勢", label: "先手大優勢（+1600以上）",    side: "pos",  level: 3 },
  { key: "先手優勢",   label: "先手優勢（+900〜+1399）",   side: "pos",  level: 2 },
  { key: "先手有利",   label: "先手有利（+400〜+799）",    side: "pos",  level: 1 },
  { key: "互角",       label: "互角（±299以内）",           side: "zero", level: 0 },
  { key: "先手不利",   label: "先手不利（-799〜-400）",    side: "neg",  level: 1 },
  { key: "先手劣勢",   label: "先手劣勢（-1399〜-900）",   side: "neg",  level: 2 },
  { key: "先手大劣勢", label: "先手大劣勢（-1600以下）",  side: "neg",  level: 3 },
];

// 段階スコア（採点用）
const IDX = {
  "先手大劣勢": -3,
  "先手劣勢":   -2,
  "先手不利":   -1,
  "互角":        0,
  "先手有利":    1,
  "先手優勢":    2,
  "先手大優勢":  3,
};

function getLabelInfo(key) {
  return LABEL_INFO.find(l => l.key === key);
}

// 背景色
function labelBgColor(key) {
  const info = getLabelInfo(key);
  if (!info) return "#dddddd";

  if (info.side === "zero") {
    return "#eeeeee";
  }
  if (info.side === "neg") {
    if (info.level === 1) return "#e8f0ff"; // 不利（薄い青）
    if (info.level === 2) return "#c3d4ff"; // 劣勢
    return "#7999ff";                      // 大劣勢（濃い青）
  }
  if (info.side === "pos") {
    if (info.level === 1) return "#ffecec"; // 有利（薄い赤）
    if (info.level === 2) return "#ffb7b7"; // 優勢
    return "#e85b5b";                      // 大優勢（濃い赤）
  }
  return "#dddddd";
}

// 枠の色（視認性UP用）
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
  return "#cccccc";
}

// 文字色（背景が濃いときは白）
function labelTextColor(key) {
  const bg = labelBgColor(key);
  const r = parseInt(bg.slice(1, 3), 16);
  if (r < 150) return "#ffffff";
  return "#222222";
}

// 擬似乱数：問題シャッフル用
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

// CP値→ラベルキー
function labelKeyFromCp(cp) {
  if (cp <= -1600) return "先手大劣勢";
  if (cp <= -900)  return "先手劣勢";
  if (cp <= -400)  return "先手不利";
  if (cp < 400)    return "互角";
  if (cp < 900)    return "先手有利";
  if (cp < 1400)   return "先手優勢";
  return "先手大優勢";
}

// 評価値の表示（+をつける）
function formatCp(cp) {
  if (cp > 0) return `+${cp}`;
  return `${cp}`;
}

function renderQuiz(questions) {
  const app = document.getElementById("app");
  let idx = 0;
  const answers = {}; // { id: key }

  const show = () => {
    const q = questions[idx];
    const selectedKey = answers[q.id] || null;

    app.innerHTML = `
      <div style="text-align:center;margin-bottom:10px;font-size:13px;color:#555;">
        問題 ${idx + 1} / ${questions.length}
      </div>
      <div style="text-align:center;margin-bottom:10px;">
        <img src="${q.large}"
             style="max-width:min(420px,90%);height:auto;border:1px solid #ddd;border-radius:10px;">
      </div>
      <p style="font-size:14px;margin:8px 0 6px;">この局面の形勢は？（先手視点）</p>
      <div id="btns" style="margin-bottom:12px;"></div>
      <div style="display:flex;justify-content:flex-start;gap:8px;margin-top:8px;">
        <button id="prevBtn"${idx === 0 ? " disabled" : ""} style="padding:6px 12px;">
          戻る
        </button>
      </div>
    `;

    const btns = document.getElementById("btns");

    LABEL_INFO.forEach(info => {
      const b = document.createElement("button");
      b.textContent = info.label;
      b.style.display = "block";
      b.style.margin = "4px 0";
      b.style.padding = "6px 10px";
      b.style.borderRadius = "6px";
      b.style.borderWidth = "2px";
      b.style.borderStyle = "solid";
      b.style.borderColor = labelBorderColor(info.key);
      b.style.width = "100%";
      b.style.textAlign = "left";
      b.style.boxSizing = "border-box";
      b.style.backgroundColor = labelBgColor(info.key);
      b.style.color = labelTextColor(info.key);
      b.style.fontSize = "13px";

      if (selectedKey === info.key) {
        b.style.boxShadow = "0 0 0 3px rgba(0,0,0,0.25)";
      }

      b.onclick = () => {
        answers[q.id] = info.key;
        if (idx === questions.length - 1) {
          renderResult(questions, answers);
        } else {
          idx++;
          show();
        }
      };

      btns.appendChild(b);
    });

    // 戻るボタンのみ（スキップなし）
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

function renderResult(questions, answers) {
  const app = document.getElementById("app");

  const diffs = questions.map(q => {
    const userKey = answers[q.id] || "未回答";
    const correctKey = labelKeyFromCp(q.aiCp);
    if (userKey === "未回答") return null;
    return IDX[userKey] - IDX[correctKey];
  });

  // スコア計算（未回答は0点扱い）
  const score = diffs.reduce((s, d) => {
    if (d === null) return s;
    if (d === 0) return s + 1;
    if (Math.abs(d) === 1) return s + 0.5;
    return s;
  }, 0);

  // 傾向（平均値で7段階評価）＆平均ずれ段階
  const answeredDiffs = diffs.filter(d => d !== null);
  let tendency = "判定不能";
  let avgAbsDiffText = "—";
  if (answeredDiffs.length > 0) {
    const avg = answeredDiffs.reduce((s,d)=>s+d,0) / answeredDiffs.length;
    const avgAbs = answeredDiffs.reduce((s,d)=>s+Math.abs(d),0) / answeredDiffs.length;
    avgAbsDiffText = avgAbs.toFixed(1);

    if (avg <= -2.0)       tendency = "超悲観派";
    else if (avg <= -1.0)  tendency = "悲観派";
    else if (avg <= -0.3)  tendency = "やや悲観派";
    else if (avg < 0.3)    tendency = "正確派";
    else if (avg < 1.0)    tendency = "やや楽観派";
    else if (avg < 2.0)    tendency = "楽観派";
    else                   tendency = "超楽観派";
  }

  let html = `
    <div style="
      margin-bottom:18px;
      padding:14px 16px;
      border-radius:16px;
      background:linear-gradient(135deg,#ffe08a,#ffb3b3);
      color:#333;
    ">
      <div style="margin-bottom:8px;">
        <span style="
          display:inline-block;
          padding:4px 12px;
          border-radius:999px;
          background:#ffffffcc;
          border:1px solid #ffb36b;
          font-size:16px;
          font-weight:bold;
        ">
          結果
        </span>
      </div>
      <div style="font-size:15px;margin-bottom:6px;">
        <span style="
          display:inline-block;
          padding:4px 10px;
          border-radius:999px;
          background:#fff3c4;
          font-weight:bold;
          margin-right:4px;
        ">
          精度スコア
        </span>
        <span style="
          display:inline-block;
          padding:4px 10px;
          border-radius:999px;
          background:#ffffffcc;
          font-weight:bold;
        ">
          ${score.toFixed(1)} / ${questions.length} 点
        </span>
      </div>
      <div style="font-size:15px;">
        <span style="
          display:inline-block;
          padding:4px 10px;
          border-radius:999px;
          background:#ffd6ea;
          font-weight:bold;
          margin-right:4px;
        ">
          傾向
        </span>
        <span style="
          display:inline-block;
          padding:4px 10px;
          border-radius:999px;
          background:#ffffffcc;
          font-weight:bold;
        ">
          ${tendency}
        </span>
        <span style="
          display:inline-block;
          padding:3px 8px;
          border-radius:999px;
          background:#ffffff99;
          font-size:13px;
          margin-left:4px;
        ">
          平均ずれ：${avgAbsDiffText} 段階
        </span>
      </div>
      <div style="font-size:12px;color:#555;margin-top:8px;line-height:1.5;">
        精度スコアは「正解＝1点」「1段階ずれ＝0.5点」「2段階以上ずれ＝0点」として、全 8 問の合計点を出しています。
      </div>
    </div>
    <h3 style="font-size:15px;margin:0 0 8px;">各問の結果（クリックで盤面拡大）</h3>
  `;

  questions.forEach((q, i) => {
    const userKey = answers[q.id] || "未回答";
    const correctKey = labelKeyFromCp(q.aiCp);
    const userInfo = getLabelInfo(userKey);
    const correctInfo = getLabelInfo(correctKey);

    // ◯×色
    let mark = "×";
    let color = "#cc0000";
    if (userKey === "未回答") {
      mark = "－";
      color = "#999999";
    } else {
      const diff = IDX[userKey] - IDX[correctKey];
      if (diff === 0) {
        mark = "〇";
        color = "#008800";
      }
    }

    const userLabelText = userInfo ? userInfo.label : "未回答";
    const correctBaseLabel = correctInfo ? correctInfo.key : correctKey;

    html += `
      <div style="margin-bottom:8px;border:1px solid #eee;padding:8px 8px 8px 10px;
                  border-left:4px solid ${color};border-radius:6px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <img
            src="${q.thumb}"
            data-thumb="${q.thumb}"
            data-large="${q.large}"
            data-expanded="false"
            class="result-img"
            style="width:88px;cursor:pointer;border:1px solid #ccc;border-radius:4px;flex-shrink:0;"
          >
          <div style="font-size:14px;">
            <div><b>第${i + 1}問：</b>
              <span style="color:${color};font-weight:bold;">${mark}</span>
            </div>
            <div><b>あなた：</b>
              <span style="color:${color};">${userLabelText}</span>
            </div>
            <div>
              <b>正解：</b>${correctBaseLabel}
              &emsp;AI評価値：${formatCp(q.aiCp)}
            </div>
          </div>
        </div>
      </div>
    `;
  });

  html += `
    <div style="margin-top:16px;text-align:center;">
      <button id="retryBtn"
        style="padding:8px 16px;border-radius:999px;border:none;
               background:#4b8fff;color:#fff;font-size:13px;cursor:pointer;">
        もう一度挑戦する
      </button>
    </div>
  `;

  app.innerHTML = html;

  // クリックでサムネ ↔ 大画像 切り替え
  document.querySelectorAll(".result-img").forEach(img => {
    img.addEventListener("click", () => {
      const expanded = img.dataset.expanded === "true";
      if (!expanded) {
        img.src = img.dataset.large;
        img.style.width = "min(430px, 90%)";
        img.style.maxWidth = "100%";
        img.dataset.expanded = "true";
      } else {
        img.src = img.dataset.thumb;
        img.style.width = "88px";
        img.dataset.expanded = "false";
      }
    });
  });

  // もう一度挑戦する
  const retryBtn = document.getElementById("retryBtn");
  retryBtn.addEventListener("click", () => {
    start();
  });
}

// 起動用ラッパー
function start() {
  document.getElementById("app").textContent = "読み込み中…";
  loadQuestions()
    .then(renderQuiz)
    .catch(err => {
      document.getElementById("app").textContent = "読み込みエラー：" + err;
      console.error(err);
    });
}

// 起動
start();
