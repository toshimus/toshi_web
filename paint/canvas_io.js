import { State, DOM } from './state.js';
import { addLayer, saveState, renderLayerPanel, restoreState, getSnapshot } from './layer_history.js';
import { setZoom, updateStatusBar } from './app.js';
import { drawShapePreview, finalizeShape } from './shape_editor.js';

export function updateSelectionMask() {
    if (!State.selection.active) {
        State.selectionMask = null;
        if (State.selection.type !== 'mask' && State.selection.type !== 'wand') {
            State.selection.maskCanvas = null;
        }
        return;
    }
    
    if (State.selection.type !== 'mask' && State.selection.type !== 'wand') {
        const mCanvas = document.createElement('canvas');
        mCanvas.width = Math.max(1, State.selection.w);
        mCanvas.height = Math.max(1, State.selection.h);
        const mCtx = mCanvas.getContext('2d');
        mCtx.fillStyle = '#FFFFFF';
        
        if (State.selection.type === 'rect') {
            mCtx.fillRect(0, 0, State.selection.w, State.selection.h);
        } else if (State.selection.type === 'ellipse') {
            mCtx.beginPath();
            mCtx.ellipse(State.selection.w/2, State.selection.h/2, Math.max(0.1, State.selection.w/2), Math.max(0.1, State.selection.h/2), 0, 0, Math.PI*2);
            mCtx.fill();
        } else if (State.selection.type === 'lasso') {
            if (State.selection.path && State.selection.path.length > 0) {
                mCtx.beginPath();
                mCtx.moveTo(State.selection.path[0].x - State.selection.x, State.selection.path[0].y - State.selection.y);
                for(let i=1; i<State.selection.path.length; i++) {
                    mCtx.lineTo(State.selection.path[i].x - State.selection.x, State.selection.path[i].y - State.selection.y);
                }
                mCtx.fill();
            }
        }
        State.selection.maskCanvas = mCanvas;
    }

    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = State.CANVAS_WIDTH;
    fullCanvas.height = State.CANVAS_HEIGHT;
    const fCtx = fullCanvas.getContext('2d');
    
    fCtx.fillStyle = '#000000';
    fCtx.fillRect(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
    if (State.selection.maskCanvas) {
        fCtx.drawImage(State.selection.maskCanvas, State.selection.x, State.selection.y);
    }
    
    const imgData = fCtx.getImageData(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
    const data32 = new Uint32Array(imgData.data.buffer);
    State.selectionMask = new Uint8Array(State.CANVAS_WIDTH * State.CANVAS_HEIGHT);
    for (let i = 0; i < data32.length; i++) {
        State.selectionMask[i] = (data32[i] & 0x00FFFFFF) !== 0 ? 1 : 0;
    }
}

export function applySelectionMask(ctx, offsetX, offsetY) {
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#FFFFFF';
    
    if (State.selection.type === 'rect') {
        ctx.fillRect(offsetX, offsetY, State.selection.w, State.selection.h);
    } else if (State.selection.type === 'ellipse') {
        ctx.beginPath();
        ctx.ellipse(offsetX + State.selection.w/2, offsetY + State.selection.h/2, Math.max(0.1, State.selection.w/2), Math.max(0.1, State.selection.h/2), 0, 0, Math.PI*2);
        ctx.fill();
    } else if (State.selection.type === 'lasso') {
        ctx.beginPath();
        ctx.moveTo(State.selection.path[0].x - State.selection.x + offsetX, State.selection.path[0].y - State.selection.y + offsetY);
        for(let i=1; i<State.selection.path.length; i++) {
            ctx.lineTo(State.selection.path[i].x - State.selection.x + offsetX, State.selection.path[i].y - State.selection.y + offsetY);
        }
        ctx.fill();
    } else if (State.selection.type === 'wand' || State.selection.type === 'mask') {
        ctx.drawImage(State.selection.maskCanvas, offsetX, offsetY);
    }
    
    ctx.restore();
}

export function floatSelection(layer) {
    if (!State.selection.maskCanvas) updateSelectionMask();
    
    State.selection.canvas = document.createElement('canvas');
    State.selection.canvas.width = Math.max(1, State.selection.w);
    State.selection.canvas.height = Math.max(1, State.selection.h);
    const sCtx = State.selection.canvas.getContext('2d');

    sCtx.drawImage(layer.canvas, State.selection.x, State.selection.y, State.selection.w, State.selection.h, 0, 0, State.selection.w, State.selection.h);

    sCtx.globalCompositeOperation = 'destination-in';
    sCtx.drawImage(State.selection.maskCanvas, 0, 0);
    sCtx.globalCompositeOperation = 'source-over';

    layer.ctx.save();
    layer.ctx.globalCompositeOperation = 'destination-out';
    layer.ctx.drawImage(State.selection.maskCanvas, State.selection.x, State.selection.y);
    layer.ctx.restore();

    State.selection.isFloating = true;
    
    State.selection.originalW = State.selection.w;
    State.selection.originalH = State.selection.h;
    State.selection.accumulatedAngle = 0;
    
    State.selection.originalCanvas = document.createElement('canvas');
    State.selection.originalCanvas.width = State.selection.w;
    State.selection.originalCanvas.height = State.selection.h;
    State.selection.originalCanvas.getContext('2d').drawImage(State.selection.canvas, 0, 0);

    State.selection.originalMaskCanvas = document.createElement('canvas');
    State.selection.originalMaskCanvas.width = State.selection.w;
    State.selection.originalMaskCanvas.height = State.selection.h;
    State.selection.originalMaskCanvas.getContext('2d').drawImage(State.selection.maskCanvas, 0, 0);
}

export function drawSelectionPreview(clearAndShape = true) {
    if (clearAndShape) {
        DOM.previewCtx.clearRect(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
        drawShapePreview();
    }

    if (State.selection.isFloating && State.selection.canvas) {
        DOM.previewCtx.imageSmoothingEnabled = State.isAntiAlias;
        DOM.previewCtx.drawImage(State.selection.canvas, State.selection.x, State.selection.y);
    }
    
    if (State.selection.active && State.selection.maskCanvas) {
        const ctx = DOM.previewCtx;
        ctx.save();
        const z = State.currentZoom || 1;

        if ((State.selection.type === 'wand' || State.selection.type === 'mask') && State.selection.maskCanvas) {
            const edgeCanvas = document.createElement('canvas');
            edgeCanvas.width = State.CANVAS_WIDTH;
            edgeCanvas.height = State.CANVAS_HEIGHT;
            const eCtx = edgeCanvas.getContext('2d');
            
            eCtx.drawImage(State.selection.maskCanvas, State.selection.x - 1/z, State.selection.y);
            eCtx.drawImage(State.selection.maskCanvas, State.selection.x + 1/z, State.selection.y);
            eCtx.drawImage(State.selection.maskCanvas, State.selection.x, State.selection.y - 1/z);
            eCtx.drawImage(State.selection.maskCanvas, State.selection.x, State.selection.y + 1/z);
            
            eCtx.globalCompositeOperation = 'destination-out';
            eCtx.drawImage(State.selection.maskCanvas, State.selection.x, State.selection.y);
            
            eCtx.globalCompositeOperation = 'source-in';
            const patCanvas = document.createElement('canvas');
            patCanvas.width = 4; patCanvas.height = 4;
            const pCtx = patCanvas.getContext('2d');
            pCtx.fillStyle = '#000000'; pCtx.fillRect(0,0,4,4);
            pCtx.fillStyle = '#ffffff'; pCtx.fillRect(0,0,2,2); pCtx.fillRect(2,2,2,2);
            eCtx.fillStyle = eCtx.createPattern(patCanvas, 'repeat');
            eCtx.fillRect(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
            
            ctx.drawImage(edgeCanvas, 0, 0);
        } else {
            ctx.beginPath();
            ctx.lineWidth = 1 / z;
            
            if (State.selection.type === 'ellipse') {
                ctx.ellipse(State.selection.x + State.selection.w/2, State.selection.y + State.selection.h/2, Math.max(0.1, State.selection.w/2), Math.max(0.1, State.selection.h/2), 0, 0, Math.PI*2);
            } else if (State.selection.type === 'lasso') {
                if (State.selection.path && State.selection.path.length > 0) {
                    ctx.moveTo(State.selection.path[0].x, State.selection.path[0].y);
                    for (let i = 1; i < State.selection.path.length; i++) {
                        ctx.lineTo(State.selection.path[i].x, State.selection.path[i].y);
                    }
                    ctx.closePath();
                }
            } else {
                ctx.rect(State.selection.x, State.selection.y, State.selection.w, State.selection.h);
            }
            
            ctx.setLineDash([2 / z, 2 / z]);
            ctx.lineDashOffset = 0;
            ctx.strokeStyle = '#000000';
            ctx.stroke();
            ctx.lineDashOffset = 2 / z;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
        }
        
        ctx.restore();
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
        floatSelection(layer);
        
        layer.ctx.save();
        layer.ctx.globalCompositeOperation = 'source-over';
        layer.ctx.drawImage(State.selection.canvas, State.selection.x, State.selection.y);
        layer.ctx.restore();
    }
    
    State.selection.x += 10;
    State.selection.y += 10;
    if(!State.isAntiAlias){
        State.selection.x = Math.round(State.selection.x);
        State.selection.y = Math.round(State.selection.y);
    }
    updateSelectionMask();
    drawSelectionPreview();
}

export function deleteSelection() {
    if (!State.selection.active) return;
    if (!State.selection.isFloating) {
        const layer = State.layers.find(l => l.id === State.currentLayerId);
        if (layer) {
            if (!State.selection.maskCanvas) updateSelectionMask();
            layer.ctx.save();
            layer.ctx.globalCompositeOperation = 'destination-out';
            layer.ctx.drawImage(State.selection.maskCanvas, State.selection.x, State.selection.y);
            layer.ctx.restore();
        }
    }
    State.selection.active = false;
    State.selection.isFloating = false;
    updateSelectionMask();
    DOM.previewCtx.clearRect(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
    drawShapePreview();
    saveState();
}

export function clearCanvasContent() {
    if (State.selection.active) {
        deleteSelection();
    } else {
        const layer = State.layers.find(l => l.id === State.currentLayerId);
        if (layer) {
            if (layer.type === 'vector') {
                layer.shape = null;
                layer.type = 'pixel';
                import('./layer_history.js').then(lh => lh.renderLayerPanel());
            }
            layer.ctx.clearRect(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
            saveState();
            DOM.previewCtx.clearRect(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
            import('./shape_editor.js').then(se => se.drawShapePreview());
        }
    }
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
    updateSelectionMask();
    DOM.previewCtx.clearRect(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
    drawShapePreview();
    saveState();
}

export function invertSelection() {
    if (!State.selection.active) return;
    
    if (State.selection.isFloating) {
        finalizeSelection();
        State.selection.active = true; 
    }

    if (!State.selection.maskCanvas) {
        updateSelectionMask();
    }

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = State.CANVAS_WIDTH;
    maskCanvas.height = State.CANVAS_HEIGHT;
    const mCtx = maskCanvas.getContext('2d');
    
    mCtx.fillStyle = '#FFFFFF';
    mCtx.fillRect(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
    
    mCtx.globalCompositeOperation = 'destination-out';
    mCtx.drawImage(State.selection.maskCanvas, State.selection.x, State.selection.y);

    State.selection.x = 0;
    State.selection.y = 0;
    State.selection.w = State.CANVAS_WIDTH;
    State.selection.h = State.CANVAS_HEIGHT;
    State.selection.type = 'mask';
    State.selection.maskCanvas = maskCanvas;
    
    updateSelectionMask();
    drawSelectionPreview();
}

export function deselect() {
    finalizeSelection();
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
    State.currentProjectHandle = null; 
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
        let targetCanvas;
        
        if (State.selection.active) {
            if (!State.selection.isFloating) {
                const layer = State.layers.find(l => l.id === State.currentLayerId);
                if (layer) {
                    floatSelection(layer);
                }
            }
            
            targetCanvas = document.createElement('canvas');
            targetCanvas.width = Math.max(1, State.selection.w);
            targetCanvas.height = Math.max(1, State.selection.h);
            const tCtx = targetCanvas.getContext('2d');
            tCtx.imageSmoothingEnabled = State.isAntiAlias;
            if (State.selection.canvas) {
                tCtx.drawImage(State.selection.canvas, 0, 0);
            }
        } else {
            targetCanvas = document.createElement('canvas');
            targetCanvas.width = State.CANVAS_WIDTH;
            targetCanvas.height = State.CANVAS_HEIGHT;
            const tCtx = targetCanvas.getContext('2d');
            tCtx.imageSmoothingEnabled = State.isAntiAlias;
            
            State.layers.forEach(layer => {
                if (layer.visible) tCtx.drawImage(layer.canvas, 0, 0);
            });
        }
        
        targetCanvas.toBlob(async (blob) => {
            if (blob) {
                const item = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([item]);
                console.log("システム: 画像をクリップボードにコピーしました。");
            }
        }, 'image/png');
    } catch (err) {
        console.error("システム・エラー: コピーに失敗しました。", err);
    }
}

export async function cutToClipboard() {
    copyToClipboard();
    if (State.selection.active) {
        deleteSelection();
    } else {
        const layer = State.layers.find(l => l.id === State.currentLayerId);
        if (layer) {
            layer.ctx.clearRect(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
            saveState();
        }
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

export async function selectSaveFolder() {
    if (window.showDirectoryPicker) {
        try {
            State.currentDirectoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            alert(`保存先フォルダを「${State.currentDirectoryHandle.name}」に設定しました。\n以降のエクスポートや保存はダイアログなしで直接出力されます。`);
        } catch (err) {
            console.error("フォルダ選択がキャンセルされました", err);
        }
    } else {
        alert("お使いのブラウザはフォルダ選択機能に対応していません。");
    }
}

export async function exportImage(format) {
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

    const ext = format === 'jpeg' ? 'jpg' : format;
    const mimeType = `image/${format}`;
    const defaultFileName = `KITT_Export_${new Date().getTime()}.${ext}`;

    if (State.currentDirectoryHandle) {
        try {
            const fileHandle = await State.currentDirectoryHandle.getFileHandle(defaultFileName, { create: true });
            const writable = await fileHandle.createWritable();
            const blob = await new Promise(res => tempCanvas.toBlob(res, mimeType));
            await writable.write(blob);
            await writable.close();
            alert(`${defaultFileName} を指定フォルダに出力しました。`);
            return;
        } catch (err) {
            console.error("フォルダへの保存に失敗しました", err);
        }
    }

    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: defaultFileName,
                types: [{ description: `${format.toUpperCase()} Image`, accept: { [mimeType]: [`.${ext}`] } }]
            });
            const writable = await handle.createWritable();
            const blob = await new Promise(res => tempCanvas.toBlob(res, mimeType));
            await writable.write(blob);
            await writable.close();
        } catch (err) {
            console.error("エクスポートがキャンセルされました", err);
        }
    } else {
        const dataUrl = tempCanvas.toDataURL(mimeType);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = defaultFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

export async function saveProject() {
    finalizeSelection();
    if (window.finalizeShape) window.finalizeShape(true);

    const projectData = {
        version: '7.0',
        width: State.CANVAS_WIDTH,
        height: State.CANVAS_HEIGHT,
        layers: getSnapshot()
    };
    const jsonStr = JSON.stringify(projectData);
    const defaultFileName = `KITT_PixelProject_${new Date().getTime()}.json`;

    if (window.showSaveFilePicker) {
        try {
            if (!State.currentProjectHandle) {
                if (State.currentDirectoryHandle) {
                    State.currentProjectHandle = await State.currentDirectoryHandle.getFileHandle(defaultFileName, { create: true });
                } else {
                    State.currentProjectHandle = await window.showSaveFilePicker({
                        suggestedName: defaultFileName,
                        types: [{ description: 'KITT Project JSON', accept: {'application/json': ['.json']} }]
                    });
                }
            }
            const writable = await State.currentProjectHandle.createWritable();
            await writable.write(jsonStr);
            await writable.close();
            console.log("プロジェクトを保存しました。");
        } catch (err) {
            console.error("保存がキャンセルされました", err);
        }
    } else {
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

export async function saveProjectAs() {
    State.currentProjectHandle = null; 
    const tempDir = State.currentDirectoryHandle;
    State.currentDirectoryHandle = null; 
    await saveProject();
    State.currentDirectoryHandle = tempDir; 
}

export async function loadProjectSystem() {
    finalizeSelection();
    if (window.showOpenFilePicker) {
        try {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{ description: 'KITT Project JSON', accept: {'application/json': ['.json']} }]
            });
            State.currentProjectHandle = fileHandle; 
            const file = await fileHandle.getFile();
            const jsonString = await file.text();
            processProjectData(jsonString);
        } catch (err) {
            console.error("読み込みがキャンセルされました", err);
        }
    } else {
        document.getElementById('load-input').click();
    }
}

export function loadProject(event) {
    finalizeSelection();
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        processProjectData(e.target.result);
    };
    reader.readAsText(file);
    event.target.value = '';
}

function processProjectData(jsonString) {
    try {
        const projectData = JSON.parse(jsonString);
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
}

export function rotateCanvasOrSelection(angleDeg) {
    if (window.finalizeShape) window.finalizeShape(true);

    if (State.selection.active) {
        if (!State.selection.isFloating) {
            const currentLayer = State.layers.find(l => l.id === State.currentLayerId);
            if (currentLayer && currentLayer.type === 'vector') {
                currentLayer.type = 'pixel';
                currentLayer.shape = null;
                import('./layer_history.js').then(lh => lh.renderLayerPanel());
            }
            floatSelection(currentLayer);
        }

        const cx = State.selection.x + State.selection.w / 2;
        const cy = State.selection.y + State.selection.h / 2;
        
        State.selection.accumulatedAngle = (State.selection.accumulatedAngle + angleDeg) % 360;
        if (State.selection.accumulatedAngle < 0) State.selection.accumulatedAngle += 360;

        const totalAngleRad = State.selection.accumulatedAngle * Math.PI / 180;
        const cos = Math.abs(Math.cos(totalAngleRad));
        const sin = Math.abs(Math.sin(totalAngleRad));
        
        const baseW = State.selection.originalW;
        const baseH = State.selection.originalH;
        
        const newW = Math.max(1, Math.round(baseW * cos + baseH * sin));
        const newH = Math.max(1, Math.round(baseW * sin + baseH * cos));
        
        State.selection.canvas.width = newW;
        State.selection.canvas.height = newH;
        const sCtx = State.selection.canvas.getContext('2d');
        sCtx.imageSmoothingEnabled = State.isAntiAlias;
        sCtx.translate(newW / 2, newH / 2);
        sCtx.rotate(totalAngleRad);
        sCtx.translate(-baseW / 2, -baseH / 2);
        sCtx.drawImage(State.selection.originalCanvas, 0, 0);

        State.selection.maskCanvas = document.createElement('canvas');
        State.selection.maskCanvas.width = newW;
        State.selection.maskCanvas.height = newH;
        const mCtx = State.selection.maskCanvas.getContext('2d');
        mCtx.imageSmoothingEnabled = State.isAntiAlias; 
        mCtx.translate(newW / 2, newH / 2);
        mCtx.rotate(totalAngleRad);
        mCtx.translate(-baseW / 2, -baseH / 2);
        mCtx.drawImage(State.selection.originalMaskCanvas, 0, 0);
        
        State.selection.type = 'mask';
        
        State.selection.x = cx - newW / 2;
        State.selection.y = cy - newH / 2;
        State.selection.w = newW;
        State.selection.h = newH;
        
        updateSelectionMask();
        drawSelectionPreview();
    } else {
        const angleRad = angleDeg * Math.PI / 180;
        const cos = Math.abs(Math.cos(angleRad));
        const sin = Math.abs(Math.sin(angleRad));
        
        const oldW = State.CANVAS_WIDTH;
        const oldH = State.CANVAS_HEIGHT;
        const newW = Math.max(1, Math.round(oldW * cos + oldH * sin));
        const newH = Math.max(1, Math.round(oldW * sin + oldH * cos));

        State.layers.forEach(layer => {
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