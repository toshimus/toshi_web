// ==========================================
// 学習データ管理 (Storage / Export / Import)
// グリッドシステムの script_tegaki.js と完全に同期します
// ==========================================
const RAW_PATTERNS = [
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

let KNOWN_PATTERNS = [];
for (let d = 0; d < 10; d++) {
  KNOWN_PATTERNS.push({ digit: d, pattern: RAW_PATTERNS[d].join('').split('').map(Number) });
}

// ★ 現在の自作グリッドシステムと同じキーに変更
const STORAGE_KEY = 'tegaki_patterns_grid_v1';

window.loadFromLocalStorage = function() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) KNOWN_PATTERNS = parsed;
    } catch (e) { console.error("Data load failed", e); }
  }
};

window.saveToLocalStorage = function(showAlert = false) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(KNOWN_PATTERNS));
  if(showAlert) alert("学習データをブラウザに保存しました！\n（自作グリッド問題でもこのデータが使われます）");
};

window.exportData = function() {
  const dataStr = JSON.stringify(KNOWN_PATTERNS);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "tegaki_patterns_grid.json";
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
};

window.importData = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].pattern) {
        KNOWN_PATTERNS = parsed; 
        window.saveToLocalStorage(false); 
        alert("学習データの読み込みに成功しました！\nグリッドシステムにも反映されます。"); 
        if(document.getElementById('preview-modal').classList.contains('active')) {
            window.renderPreviewGrid();
        }
      } else {
         alert("正しい学習データファイルではありません。");
      }
    } catch (err) { alert("読み込み失敗"); }
  };
  reader.readAsText(file);
  event.target.value = "";
};

// ==========================================
// アプリケーション初期化とキャンバス描画
// ==========================================
window.trainCanvas = null;
window.trainCtx = null;
window.drawnStrokes = [];

window.onload = () => {
  window.loadFromLocalStorage();
  
  window.trainCanvas = document.getElementById('train-canvas');
  if (window.trainCanvas) {
    window.trainCtx = window.trainCanvas.getContext('2d');
    
    // キャンバスの解像度バグを防ぐため、実際の表示サイズに合わせる
    const resizeCanvas = () => {
        if (window.trainCanvas.clientWidth > 0 && window.trainCanvas.clientHeight > 0) {
            window.trainCanvas.width = window.trainCanvas.clientWidth;
            window.trainCanvas.height = window.trainCanvas.clientHeight;
        }
    };
    resizeCanvas();
    // ウィンドウサイズが変わった際にも再計算
    window.addEventListener('resize', resizeCanvas);

    initCanvasEvents(window.trainCanvas, window.trainCtx, 24);
  }
};

function initCanvasEvents(cvs, ctx, lineWidth) {
  let isDrawing = false;
  let currentStroke = [];

  const getPos = (e) => {
    const rect = cvs.getBoundingClientRect();
    const touch = (e.touches && e.touches.length > 0) ? e.touches[0] : ((e.changedTouches && e.changedTouches.length > 0) ? e.changedTouches[0] : null);
    const clientX = touch ? touch.clientX : e.clientX;
    const clientY = touch ? touch.clientY : e.clientY;
    const scaleX = cvs.width / (rect.width || cvs.width || 1);
    const scaleY = cvs.height / (rect.height || cvs.height || 1);
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDraw = (e) => {
    e.preventDefault(); e.stopPropagation();
    
    // 描画のたびにプロパティを再設定（リサイズ等で飛ぶのを防ぐ）
    ctx.lineWidth = lineWidth; 
    ctx.lineCap = 'round'; 
    ctx.lineJoin = 'round'; 
    ctx.strokeStyle = '#2d3748';

    isDrawing = true;
    const pos = getPos(e);
    currentStroke = [pos];
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault(); e.stopPropagation();
    const pos = getPos(e);
    currentStroke.push(pos);
    ctx.lineTo(pos.x, pos.y); ctx.stroke();
  };

  const stopDraw = (e) => {
    if (isDrawing) {
      if (currentStroke.length > 1) window.drawnStrokes.push(currentStroke);
      isDrawing = false;
    }
  };

  cvs.addEventListener('mousedown', startDraw); 
  cvs.addEventListener('mousemove', draw);
  window.addEventListener('mouseup', stopDraw); 
  cvs.addEventListener('touchstart', startDraw, { passive: false }); 
  cvs.addEventListener('touchmove', draw, { passive: false });
  window.addEventListener('touchend', stopDraw, { passive: false });
}

window.clearCanvas = function(context, cvs) {
  context.clearRect(0, 0, cvs.width, cvs.height);
  window.drawnStrokes = [];
};

// ==========================================
// 解析・特徴量抽出ロジック
// ==========================================
function deskewCanvas(sourceCvs) {
  const ctx = sourceCvs.getContext('2d');
  const imgData = ctx.getImageData(0, 0, sourceCvs.width, sourceCvs.height);
  const data = imgData.data;
  const w = sourceCvs.width, h = sourceCvs.height;

  let m00 = 0, m10 = 0, m01 = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha > 30) { m00 += alpha; m10 += x * alpha; m01 += y * alpha; }
    }
  }
  if (m00 === 0) return sourceCvs;

  const cx = m10 / m00;
  const cy = m01 / m00;
  let mu11 = 0, mu02 = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha > 30) {
        mu11 += (x - cx) * (y - cy) * alpha;
        mu02 += Math.pow(y - cy, 2) * alpha;
      }
    }
  }

  const k = mu02 !== 0 ? mu11 / mu02 : 0;
  const outCvs = document.createElement('canvas');
  outCvs.width = w; outCvs.height = h;
  const outCtx = outCvs.getContext('2d');

  outCtx.translate(cx, cy);
  outCtx.transform(1, 0, -k, 1, 0, 0); 
  outCtx.translate(-cx, -cy);
  outCtx.drawImage(sourceCvs, 0, 0);

  return outCvs;
}

function extractFeatures(context, cvs) {
  const deskewedCvs = deskewCanvas(cvs);
  const dCtx = deskewedCvs.getContext('2d');
  const imgData = dCtx.getImageData(0, 0, cvs.width, cvs.height);
  const data = imgData.data;

  let minX = cvs.width, minY = cvs.height, maxX = 0, maxY = 0;
  let totalAlpha = 0, sumX = 0, sumY = 0;

  for (let y = 0; y < cvs.height; y++) {
    for (let x = 0; x < cvs.width; x++) {
      const a = data[(y * cvs.width + x) * 4 + 3];
      if (a > 30) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        totalAlpha += a; sumX += x * a; sumY += y * a;
      }
    }
  }

  if (totalAlpha === 0) return null;

  const cx = sumX / totalAlpha;
  const cy = sumY / totalAlpha;
  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;
  const maxDim = Math.max(boxW, boxH);

  const normCvs = document.createElement('canvas');
  normCvs.width = maxDim * 1.2; 
  normCvs.height = maxDim * 1.2;
  const normCtx = normCvs.getContext('2d');

  const destX = (normCvs.width / 2) - (cx - minX) - minX;
  const destY = (normCvs.height / 2) - (cy - minY) - minY;

  normCtx.drawImage(deskewedCvs, minX, minY, boxW, boxH, destX + minX, destY + minY, boxW, boxH);

  const gridCvs = document.createElement('canvas');
  gridCvs.width = 8; gridCvs.height = 8;
  const gridCtx = gridCvs.getContext('2d');
  gridCtx.drawImage(normCvs, 0, 0, normCvs.width, normCvs.height, 0, 0, 8, 8);

  const gridData = gridCtx.getImageData(0, 0, 8, 8).data;
  const X = [];
  for (let i = 0; i < 64; i++) X.push(gridData[i * 4 + 3] / 255.0);
  return X;
}

window.savePattern = function() {
  if (window.drawnStrokes.length === 0) { alert("すうじが かかれていません！"); return; }
  
  const X = extractFeatures(window.trainCtx, window.trainCanvas);
  if (!X || X.every(v => v === 0)) { alert("うまく よみとれませんでした。もういちど かいてね！"); return; }
  
  const digitToTrain = parseInt(document.getElementById('train-digit-select').value, 10);
  KNOWN_PATTERNS.push({ digit: digitToTrain, pattern: X });
  
  window.saveToLocalStorage(false); // サイレント保存
  
  alert(`「${digitToTrain}」の形を登録しました！\nグリッド問題ですぐに使えるようになりました。`);
  window.clearCanvas(window.trainCtx, window.trainCanvas);
};

// ==========================================
// プレビュー・管理 UI
// ==========================================
window.openPreviewModal = function() { window.renderPreviewGrid(); document.getElementById('preview-modal').classList.add('active'); };
window.closePreviewModal = function() { document.getElementById('preview-modal').classList.remove('active'); };

window.renderPreviewGrid = function() {
  const grid = document.getElementById('preview-grid'); grid.innerHTML = '';
  
  // 新しいものが上に来るように逆順で表示する
  const reversed = [...KNOWN_PATTERNS].reverse();

  reversed.forEach((item, revIndex) => {
    // 元の配列におけるインデックスを計算
    const index = KNOWN_PATTERNS.length - 1 - revIndex;

    const div = document.createElement('div'); div.className = 'preview-item';
    
    const cvs = document.createElement('canvas'); cvs.width = 64; cvs.height = 64;
    const ctx = cvs.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 64; i++) {
      const val = item.pattern[i];
      if (val > 0) { ctx.fillStyle = `rgba(45,55,72,${val})`; ctx.fillRect((i%8)*8, Math.floor(i/8)*8, 8, 8); }
    }
    
    const title = document.createElement('div'); title.className = 'preview-item-title'; 
    title.innerText = `数字: ${item.digit}`;
    
    // 最初の10個（標準パターン）は消せないようにし、ラベルを付ける
    if (index < 10) {
        title.innerText += ' (標準)';
        title.style.color = '#718096';
        title.style.fontSize = '0.8rem';
    }

    const delBtn = document.createElement('button'); 
    delBtn.className = 'btn-delete-item'; 
    delBtn.innerText = '🗑️ 消す';
    delBtn.onclick = () => { 
        if(confirm(`この形を削除しますか？`)) { 
            KNOWN_PATTERNS.splice(index, 1); 
            window.saveToLocalStorage(false); 
            window.renderPreviewGrid(); 
        } 
    };

    div.appendChild(cvs); 
    div.appendChild(title); 
    if (index >= 10) {
        div.appendChild(delBtn);
    } else {
        // レイアウトを揃えるためのダミー
        const dummy = document.createElement('div');
        dummy.style.height = '28px';
        div.appendChild(dummy);
    }
    
    grid.appendChild(div);
  });
};