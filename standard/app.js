const MANIFEST_URL = "../data/manifest.json";

/**
 * 7段階ラベル情報（表示順：大優勢→大劣勢）
 */
const LABEL_INFO = [
  { key: "先手大優勢", label: "先手大優勢（+1600以上）",     side: "pos",  level: 3 },
  { key: "先手優勢",   label: "先手優勢（+900〜+1399）",    side: "pos",  level: 2 },
  { key: "先手有利",   label: "先手有利（+400〜+799）",     side: "pos",  level: 1 },
  { key: "互角",       label: "互角（±299以内）",            side: "zero", level: 0 },
  { key: "先手不利",   label: "先手不利（-400〜-799）",     side: "neg",  level: 1 },
  { key: "先手劣勢",   label: "先手劣勢（-900〜-1399）",    side: "neg",  level: 2 },
  { key: "先手大劣勢", label: "先手大劣勢（-1600以下）",   side: "neg",  level: 3 },
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

/* ===== ボタン色（あなたが指定した“前の色味”） ===== */
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
  return "#dddddd";
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
  return "#cccccc";
}

function labelTextColor(key) {
  const bg = labelBgColor(key);
  const r = parseInt(bg.slice(1, 3), 16);
  if (r < 150) return "#ffffff";
  return "#222222";
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
  if (cp > 0) return `+${cp}`;
  return `${cp}`;
}

function scoreComment(score, total){
  // totalは8想定だけど将来拡張に備えて比率でもOK
  const s = Number(score.toFixed(1));
  if (s >= total) return "素晴らしい！形勢判断完璧！";
  if (s >= total - 2) return "強い！正確に形勢判断できてるね。";
  if (s >= total - 3.5) return "いい感じ！たまにズレるけど全体は安定。";
  if (s >= total - 5) return "伸びしろあり！まずは“互角付近”を丁寧に。";
  return "挑戦心ナイス！感想戦で精度が一気に上がるタイプ。";
}

/* ====== UI（スタイリッシュ寄せ） ====== */
function renderQuiz(questions) {
  const app = document.getElementById("app");
  let idx = 0;
  const answers = {};

  const show = () => {
    const q = questions[idx];
    const selectedKey = answers[q.id] || null;

    app.innerHTML = `
      <div style="text-align:center;margin:2px 0 10px;font-size:12px;color:#5b6572;">
        問題 ${idx + 1} / ${questions.length}
      </div>

      <div style="text-align:center;margin-bottom:10px;">
        <img src="${q.large}" style="max-width:min(430px,92%);height:auto;border:1px solid #e7e9ee;border-radius:16px;box-shadow:0 10px 24px rgba(0,0,0,0.06);">
      </div>

      <div style="font-size:14px;margin:8px 2px 10px;font-weight:700;">
        この局面の形勢は？（先手番）
      </div>

      <div id="btns" style="margin-bottom:10px;"></div>

      <div style="display:flex;justify-content:flex-start;gap:8px;margin-top:10px;">
        <button id="prevBtn"${idx === 0 ? " disabled" : ""} style="
          padding:8px 12px;border-radius:999px;border:1px solid #d9dde6;background:#fff;cursor:pointer;
          font-size:13px; color:#222;
        ">戻る</button>
      </div>
    `;

    const btns = document.getElementById("btns");

    LABEL_INFO.forEach(info => {
      const b = document.createElement("button");
      b.textContent = info.label;
      b.style.display = "block";
      b.style.margin = "6px 0";
      b.style.padding = "10px 12px";
      b.style.borderRadius = "14px";
      b.style.borderWidth = "2px";
      b.style.borderStyle = "solid";
      b.style.borderColor = labelBorderColor(info.key);
      b.style.width = "100%";
      b.style.textAlign = "left";
      b.style.boxSizing = "border-box";
      b.style.backgroundColor = labelBgColor(info.key);
      b.style.color = labelTextColor(info.key);
      b.style.fontSize = "13px";
      b.style.fontWeight = "400";
      b.style.cursor = "pointer";
      b.style.transition = "transform .06s ease";

      b.onmousedown = () => { b.style.transform = "scale(0.99)"; };
      b.onmouseup = () => { b.style.transform = "scale(1)"; };

      if (selectedKey === info.key) {
        b.style.boxShadow = "0 0 0 4px rgba(0,0,0,0.14)";
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

    const prevBtn = document.getElementById("prevBtn");
    prevBtn.onclick = () => { if (idx > 0) { idx--; show(); } };
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

  const score = diffs.reduce((s, d) => {
    if (d === null) return s;
    if (d === 0) return s + 1;
    if (Math.abs(d) === 1) return s + 0.5;
    return s;
  }, 0);

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

  const comment = scoreComment(score, questions.length);

  // スマート＆見やすい結果ヘッダー
  let html = `
    <div style="
      padding:14px 14px 12px;
      border-radius:18px;
      background:#ffffff;
      border:1px solid #e7e9ee;
      box-shadow: 0 10px 28px rgba(0,0,0,0.08);
      margin-bottom: 12px;
    ">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
        <div style="font-size:18px;font-weight:900;">📊 結果</div>
        <div style="font-size:12px;color:#5b6572;">平均ずれ：<b style="color:#222;">${avgAbsDiffText}</b> 段階</div>
      </div>

      <div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div style="padding:10px 12px;border-radius:16px;background:#f7f8fb;border:1px solid #eef0f5;">
          <div style="font-size:12px;color:#5b6572;font-weight:800;">🎯 精度スコア</div>
          <div style="font-size:20px;font-weight:900;margin-top:2px;">
            ${score.toFixed(1)} <span style="font-size:13px;color:#5b6572;font-weight:800;">/ ${questions.length} 点</span>
          </div>
        </div>
        <div style="padding:10px 12px;border-radius:16px;background:#f7f8fb;border:1px solid #eef0f5;">
          <div style="font-size:12px;color:#5b6572;font-weight:800;">🧭 傾向</div>
          <div style="font-size:18px;font-weight:900;margin-top:4px;">${tendency}</div>
        </div>
      </div>

      <div style="margin-top:10px;padding:10px 12px;border-radius:16px;background:#fff7e6;border:1px solid #ffe2b4;">
        <div style="font-weight:900;">💬 ${comment}</div>
      </div>
    </div>

    <div style="font-size:14px;font-weight:900;margin:6px 0 8px;">各問の結果</div>
  `;

  // 各問（少しだけ大きめ）
  questions.forEach((q, i) => {
    const userKey = answers[q.id] || "未回答";
    const correctKey = labelKeyFromCp(q.aiCp);
    const userInfo = getLabelInfo(userKey);
    const correctInfo = getLabelInfo(correctKey);

    let mark = "×";
    let color = "#d11f1f";
    if (userKey === "未回答") {
      mark = "－";
      color = "#8b93a1";
    } else {
      const diff = IDX[userKey] - IDX[correctKey];
      if (diff === 0) { mark = "〇"; color = "#1a8f3a"; }
    }

    const userLabelText = userInfo ? userInfo.label : "未回答";
    const correctBaseLabel = correctInfo ? correctInfo.key : correctKey;

    html += `
      <div style="
        margin-bottom:10px;
        border:1px solid #eef0f5;
        padding:10px;
        border-radius:16px;
        background:#ffffff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.03);
        border-left:5px solid ${color};
      ">
        <div style="display:flex;align-items:center;gap:12px;">
          <img
            src="${q.thumb}"
            data-thumb="${q.thumb}"
            data-large="${q.large}"
            data-expanded="false"
            class="result-img"
            style="width:92px;cursor:pointer;border:1px solid #dfe3ea;border-radius:10px;flex-shrink:0;"
          >
          <div style="font-size:14px;line-height:1.55;">
            <div style="font-weight:900;">
              第${i + 1}問 <span style="color:${color};margin-left:6px;">${mark}</span>
            </div>
            <div style="margin-top:2px;">
              <span style="color:#5b6572;font-weight:800;">あなた：</span>
              <span style="font-weight:800;">${userLabelText}</span>
            </div>
            <div style="margin-top:2px;">
              <span style="color:#5b6572;font-weight:800;">正解：</span>
              <span style="font-weight:900;">${correctBaseLabel}</span>
              <span style="margin-left:8px;color:#5b6572;">AI評価値：</span><b>${formatCp(q.aiCp)}</b>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  html += `
    <div style="margin-top:12px;text-align:center;">
      <button id="retryBtn" style="
        padding:10px 16px;border-radius:999px;border:none;
        background:#4b8fff;color:#fff;font-size:14px;font-weight:900;cursor:pointer;
        box-shadow:0 10px 22px rgba(75,143,255,0.22);
      ">もう一度挑戦する</button>
    </div>
  `;

  app.innerHTML = html;

  // クリックでサムネ ↔ 大画像 切り替え（その場で拡大）
  document.querySelectorAll(".result-img").forEach(img => {
    img.addEventListener("click", () => {
      const expanded = img.dataset.expanded === "true";
      if (!expanded) {
        img.src = img.dataset.large;
        img.style.width = "min(440px, 92%)";
        img.style.maxWidth = "100%";
        img.dataset.expanded = "true";
      } else {
        img.src = img.dataset.thumb;
        img.style.width = "92px";
        img.dataset.expanded = "false";
      }
    });
  });

  document.getElementById("retryBtn").addEventListener("click", () => start());
}

function start() {
  const app = document.getElementById("app");
  app.textContent = "読み込み中…";
  loadQuestions()
    .then(renderQuiz)
    .catch(err => {
      app.textContent = "読み込みエラー：" + err;
      console.error(err);
    });
}

start();
