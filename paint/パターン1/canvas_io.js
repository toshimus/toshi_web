// --- 選択ツールモジュール ---
function drawSelectionPreview() {
    previewCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (selection.isFloating && selection.canvas) {
        previewCtx.imageSmoothingEnabled = isAntiAlias;
        previewCtx.drawImage(selection.canvas, selection.x, selection.y);
    }
    if (selection.active) {
        previewCtx.beginPath();
        previewCtx.setLineDash([5, 5]);
        previewCtx.strokeStyle = '#00ffff';
        previewCtx.lineWidth = 1;
        previewCtx.strokeRect(selection.x, selection.y, selection.w, selection.h);
        previewCtx.setLineDash([]);
    }
}

function duplicateSelection() {
    if (!selection.active) return;
    const layer = layers.find(l => l.id === currentLayerId);
    if (!layer) return;
    
    if (selection.isFloating) {
        layer.ctx.imageSmoothingEnabled = isAntiAlias;
        layer.ctx.drawImage(selection.canvas, selection.x, selection.y);
    } else {
        selection.canvas = document.createElement('canvas');
        selection.canvas.width = selection.w;
        selection.canvas.height = selection.h;
        selection.canvas.getContext('2d').drawImage(layer.canvas, selection.x, selection.y, selection.w, selection.h, 0, 0, selection.w, selection.h);
        selection.isFloating = true;
    }
    
    selection.x += 10;
    selection.y += 10;
    if(!isAntiAlias){
        selection.x = Math.round(selection.x);
        selection.y = Math.round(selection.y);
    }
    drawSelectionPreview();
}

function deleteSelection() {
    if (!selection.active) return;
    if (!selection.isFloating) {
        const layer = layers.find(l => l.id === currentLayerId);
        if (layer) layer.ctx.clearRect(selection.x, selection.y, selection.w, selection.h);
    }
    selection.active = false;
    selection.isFloating = false;
    previewCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (typeof saveState === 'function') saveState();
}

function finalizeSelection() {
    if (!selection.active) return;
    if (selection.isFloating && selection.canvas) {
        const layer = layers.find(l => l.id === currentLayerId);
        if (layer) {
            layer.ctx.imageSmoothingEnabled = isAntiAlias;
            layer.ctx.drawImage(selection.canvas, selection.x, selection.y);
        }
    }
    selection.active = false;
    selection.isFloating = false;
    previewCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (typeof saveState === 'function') saveState();
}

// --- 新規作成・キャンバス変形・解像度変更モジュール ---
function createNewCanvas() {
    if (!confirm("現在のデータは破棄されます。よろしいですか？")) return;
    const w = prompt("新規キャンバスの幅（ピクセル）を入力してください:", CANVAS_WIDTH);
    if (!w || isNaN(w) || w <= 0) return;
    const h = prompt("新規キャンバスの高さ（ピクセル）を入力してください:", CANVAS_HEIGHT);
    if (!h || isNaN(h) || h <= 0) return;

    finalizeSelection();
    CANVAS_WIDTH = Math.floor(Number(w));
    CANVAS_HEIGHT = Math.floor(Number(h));

    historyStack = [];
    redoStack = [];
    layers.forEach(l => canvasWrapper.removeChild(l.canvas));
    layers = [];
    layerCounter = 0;

    previewCanvas.width = CANVAS_WIDTH;
    previewCanvas.height = CANVAS_HEIGHT;
    previewCanvas.style.imageRendering = isAntiAlias ? 'auto' : 'pixelated';
    previewCtx.imageSmoothingEnabled = isAntiAlias;

    addLayer('レイヤー 1');
    if (typeof setZoom === 'function') setZoom(currentZoom);
    if (typeof saveState === 'function') saveState();
}

function executeResize(newW, newH, offsetX = 0, offsetY = 0) {
    newW = Math.floor(newW);
    newH = Math.floor(newH);
    
    layers.forEach(layer => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = layer.canvas.width;
        tempCanvas.height = layer.canvas.height;
        tempCanvas.getContext('2d').drawImage(layer.canvas, 0, 0);
        
        layer.canvas.width = newW;
        layer.canvas.height = newH;
        layer.canvas.style.imageRendering = isAntiAlias ? 'auto' : 'pixelated';
        layer.ctx.imageSmoothingEnabled = isAntiAlias;
        
        layer.ctx.drawImage(tempCanvas, -offsetX, -offsetY);
    });
    
    CANVAS_WIDTH = newW;
    CANVAS_HEIGHT = newH;
    
    previewCanvas.width = newW;
    previewCanvas.height = newH;
    previewCanvas.style.imageRendering = isAntiAlias ? 'auto' : 'pixelated';
    previewCtx.imageSmoothingEnabled = isAntiAlias;
    
    if (typeof updateStatusBar === 'function') updateStatusBar();
    if (typeof setZoom === 'function') setZoom(currentZoom); 
}

function resizeCanvasPrompt() {
    const w = prompt("新しい幅（ピクセル）を入力してください:", CANVAS_WIDTH);
    if (!w || isNaN(w)) return;
    const h = prompt("新しい高さ（ピクセル）を入力してください:", CANVAS_HEIGHT);
    if (!h || isNaN(h)) return;
    
    finalizeSelection();
    executeResize(Number(w), Number(h), 0, 0);
    if (typeof saveState === 'function') saveState();
}

function scaleImagePrompt() {
    const input = prompt("変更後の長辺サイズ（ピクセル）、または倍率（例: *2, /2, x4）を入力してください:");
    if (!input) return;

    let maxSide = Math.max(CANVAS_WIDTH, CANVAS_HEIGHT);
    let newMaxSide = maxSide;
    const val = input.trim();

    if (val.startsWith('*') || val.startsWith('x') || val.startsWith('X')) {
        const multi = parseFloat(val.substring(1));
        if (isNaN(multi) || multi <= 0) return;
        newMaxSide = maxSide * multi;
    } else if (val.startsWith('/')) {
        const div = parseFloat(val.substring(1));
        if (isNaN(div) || div <= 0) return;
        newMaxSide = maxSide / div;
    } else {
        const num = parseFloat(val);
        if (isNaN(num) || num <= 0) return;
        newMaxSide = num;
    }

    const ratioW = CANVAS_WIDTH / maxSide;
    const ratioH = CANVAS_HEIGHT / maxSide;
    const newW = Math.round(newMaxSide * ratioW);
    const newH = Math.round(newMaxSide * ratioH);

    finalizeSelection();
    executeScaleImage(newW, newH);
    if (typeof saveState === 'function') saveState();
}

function executeScaleImage(newW, newH) {
    const oldW = CANVAS_WIDTH;
    const oldH = CANVAS_HEIGHT;

    layers.forEach(layer => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = oldW;
        tempCanvas.height = oldH;
        tempCanvas.getContext('2d').drawImage(layer.canvas, 0, 0);

        layer.canvas.width = newW;
        layer.canvas.height = newH;
        layer.canvas.style.imageRendering = isAntiAlias ? 'auto' : 'pixelated';
        
        layer.ctx.imageSmoothingEnabled = isAntiAlias;
        layer.ctx.drawImage(tempCanvas, 0, 0, oldW, oldH, 0, 0, newW, newH);
    });

    CANVAS_WIDTH = newW;
    CANVAS_HEIGHT = newH;

    previewCanvas.width = newW;
    previewCanvas.height = newH;
    previewCanvas.style.imageRendering = isAntiAlias ? 'auto' : 'pixelated';
    previewCtx.imageSmoothingEnabled = isAntiAlias;

    if (typeof updateStatusBar === 'function') updateStatusBar();
    if (typeof setZoom === 'function') setZoom(currentZoom);
}

// --- 画像インポート共通処理 ---
function handleImageImport(img, fileName) {
    finalizeSelection();
    
    if (historyStack.length <= 1) {
        executeResize(img.width, img.height);
    }
    
    const newLayer = addLayer(fileName || 'Imported Image');
    newLayer.ctx.drawImage(img, 0, 0);
    if (typeof saveState === 'function') saveState();
}

// --- クリップボード モジュール ---
async function copyToClipboard() {
    try {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = CANVAS_WIDTH;
        tempCanvas.height = CANVAS_HEIGHT;
        const tCtx = tempCanvas.getContext('2d');
        tCtx.imageSmoothingEnabled = isAntiAlias;
        
        layers.forEach(layer => {
            if (layer.visible) tCtx.drawImage(layer.canvas, 0, 0);
        });
        
        tempCanvas.toBlob(async (blob) => {
            if (blob) {
                const item = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([item]);
                alert("システム: 画像をクリップボードにコピーしました。");
            }
        }, 'image/png');
    } catch (err) {
        alert("システム・エラー: コピーに失敗しました。Safari等の環境設定をご確認ください。");
        console.error(err);
    }
}

async function pasteFromClipboard() {
    try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
            if (item.types.includes('image/png') || item.types.includes('image/jpeg')) {
                const type = item.types.includes('image/png') ? 'image/png' : 'image/jpeg';
                const blob = await item.getType(type);
                const img = new Image();
                img.onload = () => handleImageImport(img, 'Pasted Image');
                img.src = URL.createObjectURL(blob);
                return;
            }
        }
        alert("システム: クリップボードに有効な画像データがありません。");
    } catch (err) {
        alert("システム・エラー: 貼り付けに失敗しました。iPadの設定でクリップボード許可をご確認ください。");
        console.error(err);
    }
}

// --- 画像読み込みモジュール ---
function loadImageAsLayer(event) {
    const file = event.target.files[0];
    if (!file) return;

    event.target.value = '';

    if (!file.type.match('image.*')) {
        alert("システム: 画像ファイルを選択してください。");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = () => handleImageImport(img, file.name);
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// --- エクスポート モジュール ---
function exportImage(format) {
    finalizeSelection();
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = CANVAS_WIDTH;
    tempCanvas.height = CANVAS_HEIGHT;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.imageSmoothingEnabled = isAntiAlias;
    
    if (format === 'jpeg' || format === 'bmp') {
        tCtx.fillStyle = '#ffffff'; 
        tCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    
    layers.forEach(layer => {
        if (layer.visible) tCtx.drawImage(layer.canvas, 0, 0);
    });
    
    const mimeType = `image/${format}`;
    const dataUrl = tempCanvas.toDataURL(mimeType);
    
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `KITT_Export_${new Date().getTime()}.${format === 'jpeg' ? 'jpg' : format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// --- Save / Load 機能 ---
function saveProject() {
    finalizeSelection();
    const projectData = {
        version: '4.1',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        layers: getSnapshot()
    };
    
    const jsonStr = JSON.stringify(projectData);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `KITT_PixelProject_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function loadProject(event) {
    finalizeSelection();
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const projectData = JSON.parse(e.target.result);
            if (projectData.layers && Array.isArray(projectData.layers)) {
                historyStack = [];
                redoStack = [];
                
                const stateToRestore = {
                    width: projectData.width || 800,
                    height: projectData.height || 600,
                    layers: projectData.layers
                };
                restoreState(stateToRestore);
                
                setTimeout(() => { if (typeof saveState === 'function') saveState(); }, 500); 
            } else {
                alert("データ形式が正しくありません。");
            }
        } catch (err) {
            alert("ファイルの読み込み中にエラーが発生しました。");
            console.error(err);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}