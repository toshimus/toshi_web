import { State, DOM } from './state.js';
import { addLayer, saveState, renderLayerPanel, restoreState, getSnapshot } from './layer_history.js';
import { setZoom, updateStatusBar } from './app.js';
import { drawShapePreview, finalizeShape } from './shape_editor.js';

export function drawSelectionPreview() {
    DOM.previewCtx.clearRect(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
    drawShapePreview();

    if (State.selection.isFloating && State.selection.canvas) {
        DOM.previewCtx.imageSmoothingEnabled = State.isAntiAlias;
        DOM.previewCtx.drawImage(State.selection.canvas, State.selection.x, State.selection.y);
    }
    if (State.selection.active) {
        DOM.previewCtx.beginPath();
        DOM.previewCtx.setLineDash([5, 5]);
        DOM.previewCtx.strokeStyle = '#00ffff';
        DOM.previewCtx.lineWidth = 1;
        DOM.previewCtx.strokeRect(State.selection.x, State.selection.y, State.selection.w, State.selection.h);
        DOM.previewCtx.setLineDash([]);
    }
}

export function duplicateSelection() {
    if (!State.selection.active) return;
    const layer = State.layers.find(l => l.id === State.currentLayerId);
    if (!layer) return;
    
    if (State.selection.isFloating) {
        layer.ctx.imageSmoothingEnabled = State.isAntiAlias;
        layer.ctx.drawImage(State.selection.canvas, State.selection.x, State.selection.y);
    } else {
        State.selection.canvas = document.createElement('canvas');
        State.selection.canvas.width = State.selection.w;
        State.selection.canvas.height = State.selection.h;
        State.selection.canvas.getContext('2d').drawImage(layer.canvas, State.selection.x, State.selection.y, State.selection.w, State.selection.h, 0, 0, State.selection.w, State.selection.h);
        State.selection.isFloating = true;
    }
    
    State.selection.x += 10;
    State.selection.y += 10;
    if(!State.isAntiAlias){
        State.selection.x = Math.round(State.selection.x);
        State.selection.y = Math.round(State.selection.y);
    }
    drawSelectionPreview();
}

export function deleteSelection() {
    if (!State.selection.active) return;
    if (!State.selection.isFloating) {
        const layer = State.layers.find(l => l.id === State.currentLayerId);
        if (layer) layer.ctx.clearRect(State.selection.x, State.selection.y, State.selection.w, State.selection.h);
    }
    State.selection.active = false;
    State.selection.isFloating = false;
    DOM.previewCtx.clearRect(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
    drawShapePreview();
    saveState();
}

export function finalizeSelection() {
    if (!State.selection.active) return;
    if (State.selection.isFloating && State.selection.canvas) {
        const layer = State.layers.find(l => l.id === State.currentLayerId);
        if (layer) {
            layer.ctx.imageSmoothingEnabled = State.isAntiAlias;
            layer.ctx.drawImage(State.selection.canvas, State.selection.x, State.selection.y);
        }
    }
    State.selection.active = false;
    State.selection.isFloating = false;
    DOM.previewCtx.clearRect(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
    drawShapePreview();
    saveState();
}

export function createNewCanvas() {
    if (!confirm("現在のデータは破棄されます。よろしいですか？")) return;
    const w = prompt("新規キャンバスの幅（ピクセル）を入力してください:", State.CANVAS_WIDTH);
    if (!w || isNaN(w) || w <= 0) return;
    const h = prompt("新規キャンバスの高さ（ピクセル）を入力してください:", State.CANVAS_HEIGHT);
    if (!h || isNaN(h) || h <= 0) return;

    finalizeSelection();
    State.CANVAS_WIDTH = Math.floor(Number(w));
    State.CANVAS_HEIGHT = Math.floor(Number(h));

    State.historyStack = [];
    State.redoStack = [];
    State.layers.forEach(l => DOM.canvasWrapper.removeChild(l.canvas));
    State.layers = [];
    State.layerCounter = 0;

    DOM.previewCanvas.width = State.CANVAS_WIDTH;
    DOM.previewCanvas.height = State.CANVAS_HEIGHT;
    DOM.previewCanvas.style.imageRendering = State.isAntiAlias ? 'auto' : 'pixelated';
    DOM.previewCtx.imageSmoothingEnabled = State.isAntiAlias;

    addLayer('レイヤー 1');
    setZoom(State.currentZoom);
    saveState();
}

export function executeResize(newW, newH, offsetX = 0, offsetY = 0) {
    newW = Math.floor(newW);
    newH = Math.floor(newH);
    
    State.layers.forEach(layer => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = layer.canvas.width;
        tempCanvas.height = layer.canvas.height;
        tempCanvas.getContext('2d').drawImage(layer.canvas, 0, 0);
        
        layer.canvas.width = newW;
        layer.canvas.height = newH;
        layer.canvas.style.imageRendering = State.isAntiAlias ? 'auto' : 'pixelated';
        layer.ctx.imageSmoothingEnabled = State.isAntiAlias;
        
        layer.ctx.drawImage(tempCanvas, -offsetX, -offsetY);
    });
    
    State.CANVAS_WIDTH = newW;
    State.CANVAS_HEIGHT = newH;
    
    DOM.previewCanvas.width = newW;
    DOM.previewCanvas.height = newH;
    DOM.previewCanvas.style.imageRendering = State.isAntiAlias ? 'auto' : 'pixelated';
    DOM.previewCtx.imageSmoothingEnabled = State.isAntiAlias;
    
    updateStatusBar();
    setZoom(State.currentZoom); 
}

export function resizeCanvasPrompt() {
    const w = prompt("新しい幅（ピクセル）を入力してください:", State.CANVAS_WIDTH);
    if (!w || isNaN(w)) return;
    const h = prompt("新しい高さ（ピクセル）を入力してください:", State.CANVAS_HEIGHT);
    if (!h || isNaN(h)) return;
    
    finalizeSelection();
    executeResize(Number(w), Number(h), 0, 0);
    saveState();
}

export function scaleImagePrompt() {
    const input = prompt("変更後の長辺サイズ（ピクセル）、または倍率（例: *2, /2, x4）を入力してください:");
    if (!input) return;

    let maxSide = Math.max(State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
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

    const ratioW = State.CANVAS_WIDTH / maxSide;
    const ratioH = State.CANVAS_HEIGHT / maxSide;
    const newW = Math.round(newMaxSide * ratioW);
    const newH = Math.round(newMaxSide * ratioH);

    finalizeSelection();
    executeScaleImage(newW, newH);
    saveState();
}

export function executeScaleImage(newW, newH) {
    const oldW = State.CANVAS_WIDTH;
    const oldH = State.CANVAS_HEIGHT;

    State.layers.forEach(layer => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = oldW;
        tempCanvas.height = oldH;
        tempCanvas.getContext('2d').drawImage(layer.canvas, 0, 0);

        layer.canvas.width = newW;
        layer.canvas.height = newH;
        layer.canvas.style.imageRendering = State.isAntiAlias ? 'auto' : 'pixelated';
        
        layer.ctx.imageSmoothingEnabled = State.isAntiAlias;
        layer.ctx.drawImage(tempCanvas, 0, 0, oldW, oldH, 0, 0, newW, newH);
    });

    State.CANVAS_WIDTH = newW;
    State.CANVAS_HEIGHT = newH;

    DOM.previewCanvas.width = newW;
    DOM.previewCanvas.height = newH;
    DOM.previewCanvas.style.imageRendering = State.isAntiAlias ? 'auto' : 'pixelated';
    DOM.previewCtx.imageSmoothingEnabled = State.isAntiAlias;

    updateStatusBar();
    setZoom(State.currentZoom);
}

export function handleImageImport(img, fileName) {
    finalizeSelection();
    
    if (State.historyStack.length <= 1) {
        executeResize(img.width, img.height);
    }
    
    const newLayer = addLayer(fileName || 'Imported Image');
    newLayer.ctx.drawImage(img, 0, 0);
    saveState();
}

export async function copyToClipboard() {
    if (window.finalizeShape) window.finalizeShape(true);
    try {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = State.CANVAS_WIDTH;
        tempCanvas.height = State.CANVAS_HEIGHT;
        const tCtx = tempCanvas.getContext('2d');
        tCtx.imageSmoothingEnabled = State.isAntiAlias;
        
        State.layers.forEach(layer => {
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
        alert("システム・エラー: コピーに失敗しました。環境設定をご確認ください。");
        console.error(err);
    }
}

export async function pasteFromClipboard() {
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
        alert("システム・エラー: 貼り付けに失敗しました。クリップボード許可をご確認ください。");
        console.error(err);
    }
}

export function loadImageAsLayer(event) {
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

export function exportImage(format) {
    finalizeSelection();
    if (window.finalizeShape) window.finalizeShape(true);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = State.CANVAS_WIDTH;
    tempCanvas.height = State.CANVAS_HEIGHT;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.imageSmoothingEnabled = State.isAntiAlias;
    
    if (format === 'jpeg' || format === 'bmp') {
        tCtx.fillStyle = '#ffffff'; 
        tCtx.fillRect(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
    }
    
    State.layers.forEach(layer => {
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

export function saveProject() {
    finalizeSelection();
    if (window.finalizeShape) window.finalizeShape(true);

    const projectData = {
        version: '6.0',
        width: State.CANVAS_WIDTH,
        height: State.CANVAS_HEIGHT,
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

export function loadProject(event) {
    finalizeSelection();
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const projectData = JSON.parse(e.target.result);
            if (projectData.layers && Array.isArray(projectData.layers)) {
                State.historyStack = [];
                State.redoStack = [];
                
                const stateToRestore = {
                    width: projectData.width || 800,
                    height: projectData.height || 600,
                    layers: projectData.layers
                };
                restoreState(stateToRestore);
                
                setTimeout(() => { saveState(); }, 500); 
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

export function rotateCanvasOrSelection(angleDeg) {
    if (window.finalizeShape) window.finalizeShape(true);

    const angleRad = angleDeg * Math.PI / 180;
    const cos = Math.abs(Math.cos(angleRad));
    const sin = Math.abs(Math.sin(angleRad));

    if (State.selection.active) {
        if (!State.selection.isFloating) {
            // ベクターレイヤーをピクセルに変換して保護する
            const currentLayer = State.layers.find(l => l.id === State.currentLayerId);
            if (currentLayer && currentLayer.type === 'vector') {
                currentLayer.type = 'pixel';
                currentLayer.shape = null;
                import('./layer_history.js').then(lh => lh.renderLayerPanel());
            }

            State.selection.canvas = document.createElement('canvas');
            State.selection.canvas.width = State.selection.w;
            State.selection.canvas.height = State.selection.h;
            const sCtx = State.selection.canvas.getContext('2d');
            sCtx.imageSmoothingEnabled = State.isAntiAlias;
            
            State.layers.forEach(layer => {
                if (layer.visible) {
                    sCtx.drawImage(layer.canvas, State.selection.x, State.selection.y, State.selection.w, State.selection.h, 0, 0, State.selection.w, State.selection.h);
                    layer.ctx.clearRect(State.selection.x, State.selection.y, State.selection.w, State.selection.h);
                }
            });
            State.selection.isFloating = true;
        }

        const oldW = State.selection.w;
        const oldH = State.selection.h;
        const newW = Math.max(1, Math.round(oldW * cos + oldH * sin));
        const newH = Math.max(1, Math.round(oldW * sin + oldH * cos));

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = oldW;
        tempCanvas.height = oldH;
        tempCanvas.getContext('2d').drawImage(State.selection.canvas, 0, 0);

        State.selection.canvas.width = newW;
        State.selection.canvas.height = newH;
        const sCtx = State.selection.canvas.getContext('2d');
        sCtx.imageSmoothingEnabled = State.isAntiAlias;
        
        sCtx.save();
        sCtx.translate(newW / 2, newH / 2);
        sCtx.rotate(angleRad);
        sCtx.translate(-oldW / 2, -oldH / 2);
        sCtx.drawImage(tempCanvas, 0, 0);
        sCtx.restore();

        State.selection.x -= Math.round((newW - oldW) / 2);
        State.selection.y -= Math.round((newH - oldH) / 2);
        State.selection.w = newW;
        State.selection.h = newH;

        drawSelectionPreview();
    } else {
        const oldW = State.CANVAS_WIDTH;
        const oldH = State.CANVAS_HEIGHT;
        const newW = Math.max(1, Math.round(oldW * cos + oldH * sin));
        const newH = Math.max(1, Math.round(oldW * sin + oldH * cos));

        State.layers.forEach(layer => {
            // 全体を回転する前に、すべてのベクターレイヤーをラスタライズして消失を防ぐ
            if (layer.type === 'vector') {
                layer.type = 'pixel';
                layer.shape = null;
            }

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = oldW;
            tempCanvas.height = oldH;
            tempCanvas.getContext('2d').drawImage(layer.canvas, 0, 0);
            
            layer.canvas.width = newW;
            layer.canvas.height = newH;
            layer.canvas.style.imageRendering = State.isAntiAlias ? 'auto' : 'pixelated';
            layer.ctx.imageSmoothingEnabled = State.isAntiAlias;
            
            layer.ctx.save();
            layer.ctx.clearRect(0, 0, newW, newH);
            layer.ctx.translate(newW / 2, newH / 2);
            layer.ctx.rotate(angleRad);
            layer.ctx.translate(-oldW / 2, -oldH / 2);
            layer.ctx.drawImage(tempCanvas, 0, 0);
            layer.ctx.restore();
        });

        State.CANVAS_WIDTH = newW;
        State.CANVAS_HEIGHT = newH;
        
        DOM.previewCanvas.width = newW;
        DOM.previewCanvas.height = newH;
        DOM.previewCanvas.style.imageRendering = State.isAntiAlias ? 'auto' : 'pixelated';
        DOM.previewCtx.imageSmoothingEnabled = State.isAntiAlias;
        
        import('./app.js').then(app => {
            app.updateStatusBar();
            app.setZoom(State.currentZoom);
        });
        import('./layer_history.js').then(lh => lh.renderLayerPanel());
    }
    saveState();
}