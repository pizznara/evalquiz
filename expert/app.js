const DATA_DIR = "../../data/";
const MANIFEST_URL = DATA_DIR + "manifest.json";

// エキスパート用：AIの評価値と予想値の差からスコアを計算（誤差が小さいほど高得点）
function calculateExpertScore(diffs) {
    // 1問あたり最大100点とし、誤差0で100点、誤差1000以上で0点とする計算例
    return diffs.reduce((total, d) => {
        const error = Math.abs(d);
        const s = Math.max(0, 100 - (error / 10)); 
        return total + s;
    }, 0);
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
        const largeImgPath = DATA_DIR + q.large;
        
        app.innerHTML = `
            <div style="font-size:12px;color:#8b93a1;margin-bottom:10px;">EXPERT 問題 ${idx + 1} / ${questions.length}</div>
            <img src="${largeImgPath}" style="max-width:100%;border-radius:16px;box-shadow:0 8px 20px rgba(0,0,0,0.1);margin-bottom:15px;">
            <div style="font-size:16px;font-weight:900;margin-bottom:10px;">評価値を予想せよ</div>
            
            <div id="val-display" style="font-size:32px; font-weight:900; color:#e67e22; margin-bottom:10px;">0</div>
            
            <input type="range" id="score-slider" min="-3000" max="3000" step="50" value="0" 
                style="width:100%; margin-bottom:20px; accent-color:#e67e22;">
            
            <div style="display:flex; justify-content:space-between; font-size:12px; color:#8b93a1; margin-bottom:20px;">
                <span>先手大劣勢 (-3000)</span>
                <span>先手大優勢 (+3000)</span>
            </div>

            <button id="submit-val" style="width:100%; padding:15px; background:#e67e22; color:#fff; border:none; border-radius:12px; font-size:18px; font-weight:900; cursor:pointer; box-shadow:0 4px 0 #b35900;">決定</button>
            
            <button id="prevBtn"${idx===0?' disabled':''} style="margin-top:20px;background:none;border:none;color:#8b93a1;cursor:pointer;font-size:13px;font-weight:700;">← 前の問題へ戻る</button>
        `;

        const slider = document.getElementById("score-slider");
        const display = document.getElementById("val-display");
        const submit = document.getElementById("submit-val");

        // スライダーを動かした時に数値を更新
        slider.oninput = () => {
            const val = parseInt(slider.value);
            display.textContent = val > 0 ? `+${val}` : val;
            // 評価値に応じて色を変える演出
            if (val > 500) display.style.color = "#e85b5b";
            else if (val < -500) display.style.color = "#2c49a8";
            else display.style.color = "#e67e22";
        };

        submit.onclick = () => {
            // 決定時のエフェクト
            submit.style.pointerEvents = "none";
            submit.style.transform = "scale(0.95)";
            
            setTimeout(() => {
                answers[q.id] = parseInt(slider.value);
                if(++idx < questions.length) show(); else renderResult(questions, answers);
            }, 200);
        };

        document.getElementById("prevBtn").onclick = () => { idx--; show(); };
    };
    show();
}

function renderResult(questions, answers) {
    const rules = document.getElementById('rules-section');
    if (rules) rules.style.display = 'none';
    const app = document.getElementById("app");
    
    // 誤差の計算
    const diffs = questions.map(q => answers[q.id] - q.aiCp);
    const totalScore = calculateExpertScore(diffs);
    const avgError = diffs.reduce((s, d) => s + Math.abs(d), 0) / questions.length;

    app.innerHTML = `
        <div style="text-align:left;">
            <div style="font-size:20px; font-weight:900; text-align:center; margin-bottom:20px;">🏆 エキスパート診断結果</div>
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
                <div style="padding:12px;background:#f7f8fb;border-radius:18px;text-align:center;border:1px solid #eef0f5;">
                    <div style="font-size:12px;color:#8b93a1;">総合精度</div>
                    <div style="font-size:24px;font-weight:900;">${(totalScore / 8).toFixed(1)}点</div>
                </div>
                <div style="padding:12px;background:#f7f8fb;border-radius:18px;text-align:center;border:1px solid #eef0f5;">
                    <div style="font-size:12px;color:#8b93a1;">平均誤差</div>
                    <div style="font-size:24px;font-weight:900;">${Math.round(avgError)}</div>
                </div>
            </div>

            <div style="font-weight:700;margin-bottom:10px;">各問の分析（誤差）</div>
            <div id="details"></div>
            
            <button onclick="location.reload()" style="width:100%;padding:14px;border-radius:12px;border:1px solid #d9dde6;background:#fff;cursor:pointer;font-weight:700;margin-top:20px;">再挑戦</button>
        </div>
    `;

    questions.forEach((q, i) => {
        const userVal = answers[q.id];
        const aiVal = q.aiCp;
        const error = userVal - aiVal;
        const item = document.createElement("div");
        item.style.cssText = `margin-bottom:8px;padding:12px;border-radius:12px;background:#f8f9fa;font-size:13px;border-left:5px solid ${Math.abs(error)<200?'#ffd700':'#8b93a1'};`;
        item.innerHTML = `
            <div style="font-weight:900;">第${i+1}問: 誤差 ${error > 0 ? '+'+error : error}</div>
            <div style="display:flex; justify-content:space-between; margin-top:4px;">
                <span>予想: ${userVal > 0 ? '+'+userVal : userVal}</span>
                <span>正解: ${aiVal > 0 ? '+'+aiVal : aiVal}</span>
            </div>
        `;
        document.getElementById("details").appendChild(item);
    });
}

window.onload = () => {
    loadQuestions().then(renderQuiz).catch(err => {
        document.getElementById("app").innerHTML = `エラー: ${err.message}`;
    });
};
