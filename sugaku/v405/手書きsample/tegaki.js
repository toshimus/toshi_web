// ==========================================
// 数学補助関数 (GCD / LCM)
// ==========================================
function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); } //[cite: 4]
function lcm(a, b) { return (a * b) / gcd(a, b); } //[cite: 4]

// ==========================================
// 学習データ管理 (Storage / Export / Import)
// ==========================================
const RAW_PATTERNS = [ //[cite: 4]
  ["00000000", "00111100", "01100110", "01100110", "01100110", "01100110", "00111100", "00000000"], // 0
  ["00000000", "00011000", "00111000", "00011000", "00011000", "00011000", "00111100", "00000000"], // 1
  ["00000000", "00111100", "01100110", "00000110", "00011100", "01110000", "01111110", "00000000"], // 2
  ["00000000", "00111100", "01100110", "00011100", "00000110", "01100110", "00111100", "00000000"], // 3
  ["00000000", "00001100", "00011100", "00110100", "01100100", "01111111", "00000100", "00000000"], // 4
  ["00000000", "01111110", "01100000", "01111100", "00000110", "01100110", "00111100", "00000000"], // 5
  ["00000000", "00111100", "01100000", "01111100", "01100110", "01100110", "00111100", "00000000"], // 6
  ["00000000", "01111110", "00000110", "00001100", "00011000", "00110000", "01100000", "00000000"], // 7
  ["00000000", "00111100", "01100110", "00111100", "01100110", "01100110", "00111100", "00000000"], // 8
  ["00000000", "00111100", "01100110", "01100110", "00111110", "00000110", "00111100", "00000000"]  // 9
];

let KNOWN_PATTERNS = []; //[cite: 4]
for (let d = 0; d < 10; d++) { //[cite: 4]
  KNOWN_PATTERNS.push({ digit: d, pattern: RAW_PATTERNS[d].join('').split('').map(Number) }); //[cite: 4]
}

const STORAGE_KEY = 'tegaki_patterns_v3'; //[cite: 4]
const HISTORY_STORAGE_KEY = 'math_app_history'; //[cite: 4]

function loadFromLocalStorage() { //[cite: 4]
  const saved = localStorage.getItem(STORAGE_KEY); //[cite: 4]
  if (saved) { //[cite: 4]
    try { //[cite: 4]
      const parsed = JSON.parse(saved); //[cite: 4]
      if (Array.isArray(parsed) && parsed.length > 0) KNOWN_PATTERNS = parsed; //[cite: 4]
    } catch (e) { console.error("Data load failed", e); } //[cite: 4]
  }
}

function saveToLocalStorage(showAlert = false) { //[cite: 4]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(KNOWN_PATTERNS)); //[cite: 4]
  if(showAlert) alert("学習データをブラウザに保存しました！"); //[cite: 4]
}

function exportData() { //[cite: 4]
  const dataStr = JSON.stringify(KNOWN_PATTERNS); //[cite: 4]
  const blob = new Blob([dataStr], { type: "application/json" }); //[cite: 4]
  const url = URL.createObjectURL(blob); //[cite: 4]
  const a = document.createElement("a"); a.href = url; a.download = "tegaki_data.json"; //[cite: 4]
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); //[cite: 4]
}

function importData(event) { //[cite: 4]
  const file = event.target.files[0]; //[cite: 4]
  if (!file) return; //[cite: 4]
  const reader = new FileReader(); //[cite: 4]
  reader.onload = function(e) { //[cite: 4]
    try { //[cite: 4]
      const parsed = JSON.parse(e.target.result); //[cite: 4]
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].pattern) { //[cite: 4]
        KNOWN_PATTERNS = parsed; saveToLocalStorage(true); alert("読み込み成功！"); //[cite: 4]
      }
    } catch (err) { alert("読み込み失敗"); } //[cite: 4]
  };
  reader.readAsText(file); //[cite: 4]
  event.target.value = ""; //[cite: 4]
}

// ==========================================
// 解答履歴・CSV機能
// ==========================================
function formatTime(date) { //[cite: 4]
  return date.getHours().toString().padStart(2, '0') + ':' + //[cite: 4]
         date.getMinutes().toString().padStart(2, '0') + ':' + //[cite: 4]
         date.getSeconds().toString().padStart(2, '0'); //[cite: 4]
}

function recordCSVLine(targetQ, userAnswerStr, isCorrect) { //[cite: 4]
  const startTime = problemStartTime || new Date(); //[cite: 4]
  const endTime = new Date(); //[cite: 4]
  const yyyy = startTime.getFullYear(); //[cite: 4]
  const mm = String(startTime.getMonth() + 1).padStart(2, '0'); //[cite: 4]
  const dd = String(startTime.getDate()).padStart(2, '0'); //[cite: 4]
  const dateStr = `${yyyy}/${mm}/${dd}`; //[cite: 4]

  const problemType = targetQ.categoryName || "計算問題"; //[cite: 4]
  const problemContent = targetQ.rawFormula; //[cite: 4]
  const inputMethod = "手書き認識"; //[cite: 4]
  const resultStr = isCorrect ? "正解" : "不正解"; //[cite: 4]

  const csvLine = `"${dateStr}","${problemType}","${problemContent}","${userAnswerStr}",${formatTime(startTime)},${formatTime(endTime)},${inputMethod},${resultStr}\n`; //[cite: 4]

  let history = localStorage.getItem(HISTORY_STORAGE_KEY) || ""; //[cite: 4]
  history += csvLine; //[cite: 4]
  localStorage.setItem(HISTORY_STORAGE_KEY, history); //[cite: 4]
}

async function exportHistoryCSV() { //[cite: 4]
  const historyData = localStorage.getItem(HISTORY_STORAGE_KEY); //[cite: 4]
  if (!historyData) { alert("保存された学習履歴がありません。"); return; } //[cite: 4]
  const header = '"日付","カテゴリ","問題内容","解答","開始時間","終了時間","入力方法","結果"\n'; //[cite: 4]
  const fullCSV = header + historyData; //[cite: 4]
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), fullCSV], { type: "text/csv;charset=utf-8;" }); //[cite: 4]

  if (navigator.canShare && navigator.share) { //[cite: 4]
    const file = new File([blob], "math_history.csv", { type: "text/csv" }); //[cite: 4]
    if (navigator.canShare({ files: [file] })) { //[cite: 4]
      try { await navigator.share({ title: '学習履歴CSVデータ', files: [file] }); return; } //[cite: 4]
      catch (err) { if (err.name !== 'AbortError') console.error("Share failed", err); } //[cite: 4]
    }
  }
  const url = URL.createObjectURL(blob); //[cite: 4]
  const a = document.createElement("a"); a.href = url; a.download = "math_history.csv"; //[cite: 4]
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); //[cite: 4]
}

// ==========================================
// アプリケーションと画面遷移
// ==========================================
let currentQuestions = []; //[cite: 4]
let currentQuestionIndex = 0; //[cite: 4]
let quizCanvas, quizCtx, trainCanvas, trainCtx; //[cite: 4]
let drawnStrokes = []; //[cite: 4]
let currentDigitBlocks = []; //[cite: 4]
let problemStartTime = null; //[cite: 4]

// 起動時にどの画面にいるか判定して初期化
window.onload = () => { //[cite: 4]
  loadFromLocalStorage(); //[cite: 4]
  
  // クイズ画面(601など)にいる場合
  quizCanvas = document.getElementById('quiz-canvas'); //[cite: 4]
  if (quizCanvas) { //[cite: 4]
    quizCtx = quizCanvas.getContext('2d'); //[cite: 4]
    initCanvasEvents(quizCanvas, quizCtx, 22, true); //[cite: 4]
    if (typeof window.APP_MODE !== 'undefined') { //[cite: 4]
      startCategory(window.APP_MODE); //[cite: 4]
    }
  }
  
  // 学習画面(train.html)にいる場合
  trainCanvas = document.getElementById('train-canvas'); //[cite: 4]
  if (trainCanvas) { //[cite: 4]
    trainCtx = trainCanvas.getContext('2d'); //[cite: 4]
    initCanvasEvents(trainCanvas, trainCtx, 24, false); //[cite: 4]
  }
};

function showScreen(id) { //[cite: 4]
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); //[cite: 4]
  document.getElementById(id).classList.add('active'); //[cite: 4]
}

function startCategory(cat) { //[cite: 4]
  currentQuestions = generateQuestions(cat); //[cite: 4]
  currentQuestionIndex = 0; //[cite: 4]
  loadQuestion(); //[cite: 4]
}

function generateQuestions(cat) { //[cite: 4]
  let list = []; //[cite: 4]
  const titles = { //[cite: 4]
    kazu: "かず", add: "たし算", sub: "ひき算", mul: "かけ算", div: "わり算", //[cite: 4]
    frac1: "分数１ (同じ分母)", frac2: "分数２ (ちがう分母)" //[cite: 4]
  };
  document.getElementById('category-title').innerText = titles[cat]; //[cite: 4]

  for (let i = 0; i < 5; i++) { //[cite: 4]
    if (cat === 'kazu') { //[cite: 4]
      let ans = Math.floor(Math.random() * 9) + 1; //[cite: 4]
      const emojis = ["🍎", "⭐️", "🚗", "🐶", "⚽️", "🍓", "🌼"]; //[cite: 4]
      let emoji = emojis[Math.floor(Math.random() * emojis.length)]; //[cite: 4]
      
      let items = ""; //[cite: 4]
      for (let j = 0; j < ans; j++) { //[cite: 4]
        items += emoji; //[cite: 4]
        if ((j + 1) % 5 === 0 && j !== ans - 1) { //[cite: 4]
          items += "<br>"; //[cite: 4]
        }
      }
      
      list.push({ //[cite: 4]
        type: 'number', val: ans, categoryName: titles[cat], rawFormula: `count ${ans}`, //[cite: 4]
        html: `<div style="font-size: 3.5rem; letter-spacing: 5px; line-height: 1.4; word-break: break-all;">${items}</div>` //[cite: 4]
      });
    }
    else if (cat === 'add') { //[cite: 4]
      let a = Math.floor(Math.random()*9)+1, b = Math.floor(Math.random()*9)+1; //[cite: 4]
      list.push({ type: 'number', val: a+b, categoryName: titles[cat], rawFormula: `${a} + ${b}`, html: `${a} ＋ ${b} ＝ ?` }); //[cite: 4]
    }
    else if (cat === 'sub') { //[cite: 4]
      let a = Math.floor(Math.random()*15)+5, b = Math.floor(Math.random()*(a-1))+1; //[cite: 4]
      list.push({ type: 'number', val: a-b, categoryName: titles[cat], rawFormula: `${a} - ${b}`, html: `${a} ➖ ${b} ＝ ?` }); //[cite: 4]
    }
    else if (cat === 'mul') { //[cite: 4]
      let a = Math.floor(Math.random()*9)+1, b = Math.floor(Math.random()*9)+1; //[cite: 4]
      list.push({ type: 'number', val: a*b, categoryName: titles[cat], rawFormula: `${a} * ${b}`, html: `${a} ✖️ ${b} ＝ ?` }); //[cite: 4]
    }
    else if (cat === 'div') { //[cite: 4]
      let b = Math.floor(Math.random()*9)+1, ans = Math.floor(Math.random()*9)+1; //[cite: 4]
      list.push({ type: 'number', val: ans, categoryName: titles[cat], rawFormula: `${b*ans} / ${b}`, html: `${b*ans} ➗ ${b} ＝ ?` }); //[cite: 4]
    }
    // 同分母のたし算
    else if (cat === 'frac1') {
      let den = Math.floor(Math.random() * 7) + 3; // 分母(3〜9)
      let num1 = Math.floor(Math.random() * (den - 1)) + 1;
      let num2 = Math.floor(Math.random() * (den - num1)) + 1; // 答えが1以下になるよう調整
      
      list.push({ 
        type: 'fraction', 
        valNum: num1 + num2, // 💡分子の正解
        valDen: den,         // 💡分母の正解
        categoryName: titles[cat], 
        rawFormula: `${num1}/${den} + ${num2}/${den}`, 
        html: `<div class="fraction"><span class="num">${num1}</span><span class="den">${den}</span></div> + <div class="fraction"><span class="num">${num2}</span><span class="den">${den}</span></div> = ?` 
      }); 
    }
    // 異分母のたし算（通分して分子を求める）
    else if (cat === 'frac2') {
      let den1 = Math.floor(Math.random() * 4) + 2; // 2〜5
      let den2 = Math.floor(Math.random() * 4) + 2;
      if (den1 === den2) den2++;
      let num1 = Math.floor(Math.random() * 3) + 1; 
      let num2 = Math.floor(Math.random() * 3) + 1; 
      
      let commonDen = lcm(den1, den2); 
      let ansNum = (num1 * (commonDen / den1)) + (num2 * (commonDen / den2));
      
      list.push({ 
        type: 'fraction', 
        valNum: ansNum,      // 💡分子の正解
        valDen: commonDen,   // 💡分母の正解
        categoryName: titles[cat], 
        rawFormula: `${num1}/${den1} + ${num2}/${den2}`, 
        html: `<div class="fraction"><span class="num">${num1}</span><span class="den">${den1}</span></div> + <div class="fraction"><span class="num">${num2}</span><span class="den">${den2}</span></div> = ?` 
      }); 
    }
  }
  return list; //[cite: 4]
}

function loadQuestion() { //[cite: 4]
  const q = currentQuestions[currentQuestionIndex]; //[cite: 4]
  document.getElementById('question-num').innerText = `だい ${currentQuestionIndex+1} / ${currentQuestions.length} もん`; //[cite: 4]
  document.getElementById('question-text').innerHTML = q.html; //[cite: 4]
  document.getElementById('progress-fill').style.width = `${((currentQuestionIndex+1)/currentQuestions.length)*100}%`; //[cite: 4]
  
  if (q.type === 'fraction') quizCtx.lineWidth = 18; //[cite: 4]
  else quizCtx.lineWidth = 22; //[cite: 4]

  clearCanvas(quizCtx, quizCanvas); closeFeedback(); //[cite: 4]
  problemStartTime = new Date(); //[cite: 4]
}

// ==========================================
// キャンバス描画
// ==========================================
function initCanvasEvents(cvs, ctx, lineWidth, trackStrokes) { //[cite: 4]
  ctx.lineWidth = lineWidth; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#2d3748'; //[cite: 4]
  let isDrawing = false, currentStroke = []; //[cite: 4]

  const getPos = (e) => { //[cite: 4]
    const rect = cvs.getBoundingClientRect(); //[cite: 4]
    const touch = (e.touches && e.touches.length > 0) ? e.touches[0] : ((e.changedTouches && e.changedTouches.length > 0) ? e.changedTouches[0] : null); //[cite: 4]
    const clientX = touch ? touch.clientX : e.clientX; //[cite: 4]
    const clientY = touch ? touch.clientY : e.clientY; //[cite: 4]
    const scaleX = cvs.width / (rect.width || cvs.width); //[cite: 4]
    const scaleY = cvs.height / (rect.height || cvs.height); //[cite: 4]
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY }; //[cite: 4]
  };

  const startDraw = (e) => { //[cite: 4]
    e.preventDefault(); isDrawing = true; //[cite: 4]
    const pos = getPos(e); //[cite: 4]
    if (trackStrokes) currentStroke = [pos]; //[cite: 4]
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y); //[cite: 4]
  };

  const draw = (e) => { //[cite: 4]
    if (!isDrawing) return; //[cite: 4]
    e.preventDefault(); //[cite: 4]
    const pos = getPos(e); //[cite: 4]
    if (trackStrokes) currentStroke.push(pos); //[cite: 4]
    ctx.lineTo(pos.x, pos.y); ctx.stroke(); //[cite: 4]
  };

  const stopDraw = (e) => { //[cite: 4]
    if (isDrawing) { //[cite: 4]
      if (trackStrokes && currentStroke.length > 1) drawnStrokes.push(currentStroke); //[cite: 4]
      isDrawing = false; //[cite: 4]
    }
  };

  cvs.addEventListener('mousedown', startDraw); cvs.addEventListener('mousemove', draw); //[cite: 4]
  cvs.addEventListener('mouseup', stopDraw); cvs.addEventListener('mouseleave', stopDraw); //[cite: 4]
  cvs.addEventListener('touchstart', startDraw, { passive: false }); cvs.addEventListener('touchmove', draw, { passive: false }); //[cite: 4]
  cvs.addEventListener('touchend', stopDraw, { passive: false }); //[cite: 4]
}

function clearCanvas(context, cvs) { //[cite: 4]
  context.clearRect(0, 0, cvs.width, cvs.height); //[cite: 4]
  if (cvs.id === 'quiz-canvas') drawnStrokes = []; //[cite: 4]
}

// ==========================================
// 解析・認識ロジック
// ==========================================
function deskewCanvas(sourceCvs) { //[cite: 4]
  const ctx = sourceCvs.getContext('2d'); //[cite: 4]
  const imgData = ctx.getImageData(0, 0, sourceCvs.width, sourceCvs.height); //[cite: 4]
  const data = imgData.data; //[cite: 4]
  const w = sourceCvs.width, h = sourceCvs.height; //[cite: 4]

  let m00 = 0, m10 = 0, m01 = 0; //[cite: 4]
  for (let y = 0; y < h; y++) { //[cite: 4]
    for (let x = 0; x < w; x++) { //[cite: 4]
      const alpha = data[(y * w + x) * 4 + 3]; //[cite: 4]
      if (alpha > 30) { m00 += alpha; m10 += x * alpha; m01 += y * alpha; } //[cite: 4]
    }
  }
  if (m00 === 0) return sourceCvs; //[cite: 4]

  const cx = m10 / m00; //[cite: 4]
  const cy = m01 / m00; //[cite: 4]
  let mu11 = 0, mu02 = 0; //[cite: 4]

  for (let y = 0; y < h; y++) { //[cite: 4]
    for (let x = 0; x < w; x++) { //[cite: 4]
      const alpha = data[(y * w + x) * 4 + 3]; //[cite: 4]
      if (alpha > 30) { //[cite: 4]
        mu11 += (x - cx) * (y - cy) * alpha; //[cite: 4]
        mu02 += Math.pow(y - cy, 2) * alpha; //[cite: 4]
      }
    }
  }

  const k = mu02 !== 0 ? mu11 / mu02 : 0; //[cite: 4]
  const outCvs = document.createElement('canvas'); //[cite: 4]
  outCvs.width = w; outCvs.height = h; //[cite: 4]
  const outCtx = outCvs.getContext('2d'); //[cite: 4]

  outCtx.translate(cx, cy); //[cite: 4]
  outCtx.transform(1, 0, -k, 1, 0, 0);  //[cite: 4]
  outCtx.translate(-cx, -cy); //[cite: 4]
  outCtx.drawImage(sourceCvs, 0, 0); //[cite: 4]

  return outCvs; //[cite: 4]
}

function extractFeatures(context, cvs) { //[cite: 4]
  const deskewedCvs = deskewCanvas(cvs); //[cite: 4]
  const dCtx = deskewedCvs.getContext('2d'); //[cite: 4]
  const imgData = dCtx.getImageData(0, 0, cvs.width, cvs.height); //[cite: 4]
  const data = imgData.data; //[cite: 4]

  let minX = cvs.width, minY = cvs.height, maxX = 0, maxY = 0; //[cite: 4]
  let totalAlpha = 0, sumX = 0, sumY = 0; //[cite: 4]

  for (let y = 0; y < cvs.height; y++) { //[cite: 4]
    for (let x = 0; x < cvs.width; x++) { //[cite: 4]
      const a = data[(y * cvs.width + x) * 4 + 3]; //[cite: 4]
      if (a > 30) { //[cite: 4]
        if (x < minX) minX = x; if (x > maxX) maxX = x; //[cite: 4]
        if (y < minY) minY = y; if (y > maxY) maxY = y; //[cite: 4]
        totalAlpha += a; sumX += x * a; sumY += y * a; //[cite: 4]
      }
    }
  }

  if (totalAlpha === 0) return null; //[cite: 4]

  const cx = sumX / totalAlpha; //[cite: 4]
  const cy = sumY / totalAlpha; //[cite: 4]
  const boxW = maxX - minX + 1; //[cite: 4]
  const boxH = maxY - minY + 1; //[cite: 4]
  const maxDim = Math.max(boxW, boxH); //[cite: 4]

  const normCvs = document.createElement('canvas'); //[cite: 4]
  normCvs.width = maxDim * 1.2;  //[cite: 4]
  normCvs.height = maxDim * 1.2; //[cite: 4]
  const normCtx = normCvs.getContext('2d'); //[cite: 4]

  const destX = (normCvs.width / 2) - (cx - minX) - minX; //[cite: 4]
  const destY = (normCvs.height / 2) - (cy - minY) - minY; //[cite: 4]

  normCtx.drawImage(deskewedCvs, minX, minY, boxW, boxH, destX + minX, destY + minY, boxW, boxH); //[cite: 4]

  const gridCvs = document.createElement('canvas'); //[cite: 4]
  gridCvs.width = 8; gridCvs.height = 8; //[cite: 4]
  const gridCtx = gridCvs.getContext('2d'); //[cite: 4]
  gridCtx.drawImage(normCvs, 0, 0, normCvs.width, normCvs.height, 0, 0, 8, 8); //[cite: 4]

  const gridData = gridCtx.getImageData(0, 0, 8, 8).data; //[cite: 4]
  const X = []; //[cite: 4]
  for (let i = 0; i < 64; i++) X.push(gridData[i * 4 + 3] / 255.0); //[cite: 4]
  return X; //[cite: 4]
}

function savePattern() { //[cite: 4]
  const X = extractFeatures(trainCtx, trainCanvas); //[cite: 4]
  if (!X) { alert("すうじが かかれていません！"); return; } //[cite: 4]
  const digitToTrain = parseInt(document.getElementById('train-digit-select').value, 10); //[cite: 4]
  KNOWN_PATTERNS.push({ digit: digitToTrain, pattern: X }); //[cite: 4]
  alert(`「${digitToTrain}」の形を登録しました！\n残すには「ブラウザに保存」を押してください。`); //[cite: 4]
  clearCanvas(trainCtx, trainCanvas); //[cite: 4]
}

function doBoxesIntersect(a, b) { //[cite: 4]
  return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY); //[cite: 4]
}

function recalculateGroupBounds(strokes) { //[cite: 4]
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity; //[cite: 4]
  for (let st of strokes) { //[cite: 4]
    for (let p of st) { //[cite: 4]
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x; //[cite: 4]
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y; //[cite: 4]
    }
  }
  return { minX, maxX, minY, maxY, strokes }; //[cite: 4]
}

function forceSplitWideGroups(groups) { //[cite: 4]
  let finalGroups = []; //[cite: 4]

  for (let g of groups) { //[cite: 4]
    let w = g.maxX - g.minX; //[cite: 4]
    let h = (g.maxY - g.minY) || 1; //[cite: 4]
    let aspectRatio = w / h; //[cite: 4]

    if (aspectRatio > 1.2 && g.strokes.length > 1) { //[cite: 4]
      let strokeInfos = g.strokes.map(st => { //[cite: 4]
        let xs = st.map(p => p.x), ys = st.map(p => p.y); //[cite: 4]
        return { //[cite: 4]
          stroke: st, //[cite: 4]
          minX: Math.min(...xs), maxX: Math.max(...xs), //[cite: 4]
          minY: Math.min(...ys), maxY: Math.max(...ys) //[cite: 4]
        };
      });

      strokeInfos.sort((a, b) => a.minX - b.minX); //[cite: 4]

      let bestSplitIndex = -1; //[cite: 4]
      let maxGap = -1; //[cite: 4]

      for (let i = 1; i < strokeInfos.length; i++) { //[cite: 4]
        let leftStrokes = strokeInfos.slice(0, i); //[cite: 4]
        let rightStrokes = strokeInfos.slice(i); //[cite: 4]

        let leftMaxX = Math.max(...leftStrokes.map(s => s.maxX)); //[cite: 4]
        let rightMinX = Math.min(...rightStrokes.map(s => s.minX)); //[cite: 4]

        if (rightMinX >= leftMaxX - 5) { //[cite: 4]
          let gap = rightMinX - leftMaxX; //[cite: 4]
          if (gap > maxGap) { //[cite: 4]
            maxGap = gap; //[cite: 4]
            bestSplitIndex = i; //[cite: 4]
          }
        }
      }

      if (bestSplitIndex !== -1) { //[cite: 4]
        let leftStrokes = strokeInfos.slice(0, bestSplitIndex).map(s => s.stroke); //[cite: 4]
        let rightStrokes = strokeInfos.slice(bestSplitIndex).map(s => s.stroke); //[cite: 4]

        if (leftStrokes.length > 0) finalGroups.push(recalculateGroupBounds(leftStrokes)); //[cite: 4]
        if (rightStrokes.length > 0) finalGroups.push(recalculateGroupBounds(rightStrokes)); //[cite: 4]
      } else {
        finalGroups.push(g); //[cite: 4]
      }
    } else {
      finalGroups.push(g); //[cite: 4]
    }
  }

  return finalGroups.sort((a, b) => a.minX - b.minX); //[cite: 4]
}

function processBoxesIntoBlocks(boxes, role) { //[cite: 4]
  if (boxes.length === 0) return []; //[cite: 4]
  boxes.sort((a, b) => a.minX - b.minX); //[cite: 4]
  let groups = []; //[cite: 4]

  for (let b of boxes) { //[cite: 4]
    let merged = false; //[cite: 4]
    let bHeight = b.maxY - b.minY; //[cite: 4]
    let dynamicGap = Math.max(12, bHeight * 0.3); //[cite: 4]

    for (let g of groups) { //[cite: 4]
      let intersects = doBoxesIntersect(b, g); //[cite: 4]
      let overlapX = Math.max(0, Math.min(b.maxX, g.maxX) - Math.max(b.minX, g.minX)); //[cite: 4]
      let minW = Math.min(b.maxX - b.minX, g.maxX - g.minX); //[cite: 4]
      let xOverlapRatio = minW > 0 ? (overlapX / minW) : 0; //[cite: 4]
      let gapY = Math.max(0, Math.max(b.minY - g.maxY, g.minY - b.maxY)); //[cite: 4]
      let avgH = ((b.maxY - b.minY) + (g.maxY - g.minY)) / 2; //[cite: 4]

      let verticalCloseAndAligned = (xOverlapRatio > 0.35) && (gapY < avgH * 0.8); //[cite: 4]
      let horizontalClose = !(b.minX > g.maxX + dynamicGap || b.maxX < g.minX - dynamicGap); //[cite: 4]
      let verticalOverlap = !(b.maxY < g.minY || b.minY > g.maxY); //[cite: 4]

      if (intersects || (horizontalClose && verticalOverlap) || verticalCloseAndAligned) { //[cite: 4]
        g.minX = Math.min(g.minX, b.minX); g.maxX = Math.max(g.maxX, b.maxX); //[cite: 4]
        g.minY = Math.min(g.minY, b.minY); g.maxY = Math.max(g.maxY, b.maxY); //[cite: 4]
        if (b.strokes) g.strokes.push(...b.strokes); //[cite: 4]
        else g.strokes.push(b.stroke); //[cite: 4]
        merged = true;  //[cite: 4]
        break; //[cite: 4]
      }
    }
    if (!merged) { //[cite: 4]
      groups.push({  //[cite: 4]
        minX: b.minX, maxX: b.maxX, minY: b.minY, maxY: b.maxY,  //[cite: 4]
        strokes: b.strokes ? [...b.strokes] : [b.stroke]  //[cite: 4]
      });
    }
  }

  groups = forceSplitWideGroups(groups); //[cite: 4]

  let results = []; //[cite: 4]
  for (let g of groups) { //[cite: 4]
    let res = predictSingleCharacter(g.strokes); //[cite: 4]
    if (res && res.candidates.length > 0) { //[cite: 4]
      results.push({ //[cite: 4]
        role: role, //[cite: 4]
        strokes: g.strokes, //[cite: 4]
        X: res.X, //[cite: 4]
        candidates: res.candidates, //[cite: 4]
        currentSelected: res.candidates[0].digit //[cite: 4]
      });
    }
  }
  return results; //[cite: 4]
}

function extractDigitBlocks(qType) {
  if (drawnStrokes.length === 0) return null;
  let strokeBoxes = drawnStrokes.map(st => {
    let xs = st.map(p => p.x), ys = st.map(p => p.y);
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys), stroke: st };
  });

  // 💡 分数モードの場合：横線を探し、上下で分子・分母に分割する
  if (qType === 'fraction') {
    let fracLine = null;
    let maxScore = -1;
    let fracLineIndex = -1;

    // 一番横長で幅が広いストロークを「分数の横線」と特定する
    for (let i = 0; i < strokeBoxes.length; i++) {
      let b = strokeBoxes[i];
      let w = b.maxX - b.minX;
      let h = (b.maxY - b.minY) || 1;
      if (w / h > 1.8 && w > 20) { 
        if (w > maxScore) {
          maxScore = w;
          fracLine = b;
          fracLineIndex = i;
        }
      }
    }

    if (!fracLine) return null; // 横線が見つからない場合は認識失敗

    let numBoxes = [];
    let denBoxes = [];
    let lineCenterY = (fracLine.minY + fracLine.maxY) / 2;

    // 横線のY座標を基準に、上なら分子、下なら分母に振り分ける
    for (let i = 0; i < strokeBoxes.length; i++) {
      if (i === fracLineIndex) continue;
      let b = strokeBoxes[i];
      let bCenterY = (b.minY + b.maxY) / 2;
      if (bCenterY < lineCenterY) {
        numBoxes.push(b);
      } else {
        denBoxes.push(b);
      }
    }

    let numBlocks = processBoxesIntoBlocks(numBoxes, 'num'); // 分子
    let denBlocks = processBoxesIntoBlocks(denBoxes, 'den'); // 分母

    if (numBlocks.length === 0 || denBlocks.length === 0) return null;
    return [...numBlocks, ...denBlocks]; // 結合して返す
  }

  // 通常の計算問題
  let blocks = processBoxesIntoBlocks(strokeBoxes, 'number');
  return blocks.length > 0 ? blocks : null;
}

function predictSingleCharacter(strokesGroup) { //[cite: 4]
  let offCvs = document.createElement('canvas'); offCvs.width = quizCanvas.width; offCvs.height = quizCanvas.height; //[cite: 4]
  let offCtx = offCvs.getContext('2d');  //[cite: 4]
  offCtx.lineWidth = 22;  //[cite: 4]
  offCtx.lineCap = 'round'; offCtx.lineJoin = 'round'; offCtx.strokeStyle = '#2d3748'; //[cite: 4]
  for (let st of strokesGroup) { //[cite: 4]
    if(!st || st.length < 2) continue; //[cite: 4]
    offCtx.beginPath(); offCtx.moveTo(st[0].x, st[0].y); //[cite: 4]
    for (let i = 1; i < st.length; i++) offCtx.lineTo(st[i].x, st[i].y); //[cite: 4]
    offCtx.stroke(); //[cite: 4]
  }
  let X = extractFeatures(offCtx, offCvs); //[cite: 4]
  if (!X) return null; //[cite: 4]
  let distances = []; //[cite: 4]
  for (let i = 0; i < KNOWN_PATTERNS.length; i++) { //[cite: 4]
    let dist = 0, p = KNOWN_PATTERNS[i].pattern; //[cite: 4]
    for (let j = 0; j < 64; j++) { let diff = X[j] - p[j]; dist += diff * diff; } //[cite: 4]
    distances.push({ digit: KNOWN_PATTERNS[i].digit, distance: dist }); //[cite: 4]
  }
  distances.sort((a, b) => a.distance - b.distance); //[cite: 4]
  let uniqueCandidates = []; let seen = new Set(); //[cite: 4]
  for(let c of distances) { //[cite: 4]
    if(!seen.has(c.digit)) { seen.add(c.digit); uniqueCandidates.push({ digit: c.digit, distance: c.distance }); if(uniqueCandidates.length >= 4) break; } //[cite: 4]
  }
  return { X: X, candidates: uniqueCandidates }; //[cite: 4]
}

// ==========================================
// 回答チェックとフィードバック UI
// ==========================================
function getUserAnswerString(targetQ) {
  if (targetQ.type === 'fraction') {
    let n = currentDigitBlocks.filter(b => b.role === 'num').map(b => b.currentSelected).join('');
    let d = currentDigitBlocks.filter(b => b.role === 'den').map(b => b.currentSelected).join('');
    return `${n}/${d}`;
  }
  return currentDigitBlocks.map(b => b.currentSelected).join('');
}

function checkAnswer() { //[cite: 4]
  const targetQ = currentQuestions[currentQuestionIndex]; //[cite: 4]
  const blocks = extractDigitBlocks(targetQ.type); //[cite: 4]
  if (!blocks || blocks.length === 0) { alert("すうじが かかれていないか、うまく よみとれませんでした！"); return; } //[cite: 4]
  currentDigitBlocks = blocks; //[cite: 4]
  const isCorrect = checkCurrentBlocksCorrect(targetQ); //[cite: 4]
  const userAnswerStr = getUserAnswerString(targetQ); //[cite: 4]
  recordCSVLine(targetQ, userAnswerStr, isCorrect); //[cite: 4]
  evaluateAndRenderUI(targetQ); //[cite: 4]
}

function checkCurrentBlocksCorrect(targetQ) {
  if (targetQ.type === 'fraction') {
    let numStr = currentDigitBlocks.filter(b => b.role === 'num').map(b => b.currentSelected).join('');
    let denStr = currentDigitBlocks.filter(b => b.role === 'den').map(b => b.currentSelected).join('');
    // 💡 分子と分母が両方とも合っているか判定
    return parseInt(numStr, 10) === targetQ.valNum && parseInt(denStr, 10) === targetQ.valDen;
  } else {
    let numStr = currentDigitBlocks.map(b => b.currentSelected).join('');
    return parseInt(numStr, 10) === targetQ.val;
  }
}

function updateAnswerDisplay(targetQ) {
  const info = document.getElementById('recognized-info');
  if (targetQ.type === 'fraction') {
    let n = currentDigitBlocks.filter(b => b.role === 'num').map(b => b.currentSelected).join('');
    let d = currentDigitBlocks.filter(b => b.role === 'den').map(b => b.currentSelected).join('');
    // 💡 認識した「あなたのこたえ」も分数の縦並びで表示する
    info.innerHTML = `<div style="font-size: 1.2rem; color: #718096; margin-bottom: 5px;">あなたのこたえ</div>
                      <div class="fraction" style="font-size: 2rem;"><span class="num">${n}</span><span class="den">${d}</span></div>`;
  } else {
    let nStr = currentDigitBlocks.map(b => b.currentSelected).join('');
    info.innerHTML = `<div style="font-size: 1.2rem; color: #718096; margin-bottom: 5px;">あなたのこたえ</div><div>${nStr}</div>`;
  }
}

function evaluateAndRenderUI(targetQ) { //[cite: 4]
  const overlay = document.getElementById('feedback-overlay'); //[cite: 4]
  const msg = document.getElementById('feedback-msg'); //[cite: 4]
  const nextBtn = document.getElementById('next-btn'); //[cite: 4]
  const retryBtn = document.getElementById('retry-btn'); //[cite: 4]
  const correctionArea = document.getElementById('correction-area'); //[cite: 4]
  
  overlay.classList.add('active'); //[cite: 4]
  updateAnswerDisplay(targetQ); //[cite: 4]

  if (checkCurrentBlocksCorrect(targetQ)) { //[cite: 4]
    msg.innerHTML = "せいかい！ 🎉"; msg.className = "feedback-msg correct"; //[cite: 4]
    nextBtn.style.display = "inline-block"; retryBtn.style.display = "none"; correctionArea.style.display = "none"; //[cite: 4]
  } else {
    msg.innerHTML = "ざんねん！ 💡"; msg.className = "feedback-msg wrong"; //[cite: 4]
    nextBtn.style.display = "none"; retryBtn.style.display = "inline-block"; //[cite: 4]
    renderCorrectionUI(); //[cite: 4]
  }
}

function renderCorrectionUI() { //[cite: 4]
  const list = document.getElementById('correction-list'); //[cite: 4]
  const correctionArea = document.getElementById('correction-area'); //[cite: 4]
  list.innerHTML = ''; //[cite: 4]
  
  currentDigitBlocks.forEach((block, index) => { //[cite: 4]
    const div = document.createElement('div'); //[cite: 4]
    div.className = 'digit-correction-block'; //[cite: 4]
    
    const cvs = document.createElement('canvas'); //[cite: 4]
    cvs.width = 64; cvs.height = 64; //[cite: 4]
    drawStrokesToCanvas(block.strokes, cvs); //[cite: 4]
    
    const btnGrid = document.createElement('div'); //[cite: 4]
    btnGrid.className = 'cand-grid'; //[cite: 4]
    
    block.candidates.forEach(cand => { //[cite: 4]
      const btn = document.createElement('button'); //[cite: 4]
      btn.className = `btn-cand ${cand.digit === block.currentSelected ? 'active' : ''}`; //[cite: 4]
      btn.innerText = cand.digit; //[cite: 4]
      btn.onclick = () => updateBlockSelection(index, cand.digit); //[cite: 4]
      btnGrid.appendChild(btn); //[cite: 4]
    });
    
    const otherSelect = document.createElement('select'); //[cite: 4]
    otherSelect.className = 'other-select'; //[cite: 4]
    const isSelectedInCands = block.candidates.some(c => c.digit === block.currentSelected); //[cite: 4]
    otherSelect.innerHTML = `<option value="" disabled ${isSelectedInCands ? 'selected' : ''}>ほか ▼</option>`; //[cite: 4]
    
    for (let i = 0; i <= 9; i++) { //[cite: 4]
      if (!block.candidates.some(c => c.digit === i)) { //[cite: 4]
        const isSelected = (!isSelectedInCands && block.currentSelected === i) ? 'selected' : ''; //[cite: 4]
        otherSelect.innerHTML += `<option value="${i}" ${isSelected}>${i}</option>`; //[cite: 4]
      }
    }
    otherSelect.onchange = (e) => updateBlockSelection(index, parseInt(e.target.value, 10)); //[cite: 4]

    div.appendChild(cvs); div.appendChild(btnGrid); div.appendChild(otherSelect); //[cite: 4]
    list.appendChild(div); //[cite: 4]
  });
  
  correctionArea.style.display = "block"; //[cite: 4]
}

function drawStrokesToCanvas(strokes, cvs) { //[cite: 4]
  const ctx = cvs.getContext('2d'); ctx.clearRect(0, 0, cvs.width, cvs.height); //[cite: 4]
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity; //[cite: 4]
  strokes.forEach(st => st.forEach(p => { if(p.x < minX) minX = p.x; if(p.x > maxX) maxX = p.x; if(p.y < minY) minY = p.y; if(p.y > maxY) maxY = p.y; })); //[cite: 4]
  let w = maxX - minX, h = maxY - minY; //[cite: 4]
  let scale = Math.min((cvs.width - 16) / (w || 1), (cvs.height - 16) / (h || 1)); //[cite: 4]
  ctx.save(); ctx.translate(cvs.width/2, cvs.height/2); ctx.scale(scale, scale); ctx.translate(-(minX + w/2), -(minY + h/2)); //[cite: 4]
  ctx.lineWidth = 4 / (scale || 1); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#2d3748'; //[cite: 4]
  strokes.forEach(st => { //[cite: 4]
    if(st.length < 2) return; //[cite: 4]
    ctx.beginPath(); ctx.moveTo(st[0].x, st[0].y); //[cite: 4]
    for(let i=1; i<st.length; i++) ctx.lineTo(st[i].x, st[i].y); //[cite: 4]
    ctx.stroke(); //[cite: 4]
  });
  ctx.restore(); //[cite: 4]
}

function updateBlockSelection(blockIndex, newDigit) { //[cite: 4]
  currentDigitBlocks[blockIndex].currentSelected = newDigit; //[cite: 4]
  const targetQ = currentQuestions[currentQuestionIndex]; //[cite: 4]
  updateAnswerDisplay(targetQ); //[cite: 4]
  renderCorrectionUI(); //[cite: 4]
  
  if (checkCurrentBlocksCorrect(targetQ)) { //[cite: 4]
    currentDigitBlocks.forEach(b => { KNOWN_PATTERNS.push({ digit: b.currentSelected, pattern: b.X }); }); //[cite: 4]
    saveToLocalStorage(false); //[cite: 4]
    recordCSVLine(targetQ, getUserAnswerString(targetQ), true); //[cite: 4]
    
    const msg = document.getElementById('feedback-msg'); //[cite: 4]
    msg.innerHTML = "せいかい！ 🎉<br><span style='font-size:1.5rem; color:#4a5568;'>えらんだ数字の形を、アプリが覚えたよ！</span>"; //[cite: 4]
    msg.className = "feedback-msg correct"; //[cite: 4]
    document.getElementById('correction-area').style.display = "none"; //[cite: 4]
    document.getElementById('next-btn').style.display = "inline-block"; //[cite: 4]
    document.getElementById('retry-btn').style.display = "none"; //[cite: 4]
  }
}

function closeFeedback() { document.getElementById('feedback-overlay').classList.remove('active'); } //[cite: 4]
function nextQuestion() { //[cite: 4]
  currentQuestionIndex++; //[cite: 4]
  if (currentQuestionIndex < currentQuestions.length) loadQuestion(); //[cite: 4]
  else showScreen('result-screen'); //[cite: 4]
}

// --- プレビュー関連 ---
function openPreviewModal() { renderPreviewGrid(); document.getElementById('preview-modal').classList.add('active'); } //[cite: 4]
function closePreviewModal() { document.getElementById('preview-modal').classList.remove('active'); } //[cite: 4]
function renderPreviewGrid() { //[cite: 4]
  const grid = document.getElementById('preview-grid'); grid.innerHTML = ''; //[cite: 4]
  KNOWN_PATTERNS.forEach((item, index) => { //[cite: 4]
    const div = document.createElement('div'); div.className = 'preview-item'; //[cite: 4]
    const cvs = document.createElement('canvas'); cvs.width = 64; cvs.height = 64; //[cite: 4]
    const ctx = cvs.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 64, 64); //[cite: 4]
    for (let i = 0; i < 64; i++) { //[cite: 4]
      const val = item.pattern[i]; //[cite: 4]
      if (val > 0) { ctx.fillStyle = `rgba(45,55,72,${val})`; ctx.fillRect((i%8)*8, Math.floor(i/8)*8, 8, 8); } //[cite: 4]
    }
    const title = document.createElement('div'); title.className = 'preview-item-title'; title.innerText = `数字: ${item.digit}`; //[cite: 4]
    const delBtn = document.createElement('button'); delBtn.className = 'btn-delete-item'; delBtn.innerText = '🗑️'; //[cite: 4]
    delBtn.onclick = () => { if(confirm(`削除しますか？`)) { KNOWN_PATTERNS.splice(index, 1); saveToLocalStorage(); renderPreviewGrid(); } }; //[cite: 4]
    div.appendChild(cvs); div.appendChild(title); div.appendChild(delBtn); grid.appendChild(div); //[cite: 4]
  });
}