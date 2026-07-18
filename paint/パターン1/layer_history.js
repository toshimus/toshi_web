// --- レイヤー管理ロジック ---
function addLayer(name = null) {
    const id = `layer_${layerCounter++}`;
    const zIndex = layers.length;
    
    const canvas = document.createElement('canvas');
    canvas.id = id;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    canvas.style.zIndex = zIndex;
    canvas.style.imageRendering = isAntiAlias ? 'auto' : 'pixelated';
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = isAntiAlias;

    canvasWrapper.insertBefore(canvas, previewCanvas);

    const layerObj = {
        id: id,
        name: name || `レイヤー ${layerCounter}`,
        canvas: canvas,
        ctx: ctx,
        visible: true
    };

    layers.push(layerObj);
    selectLayer(id);
    renderLayerPanel();
    
    if(layers.length > 1) { 
        saveState();
    }
    return layerObj;
}

function selectLayer(id) {
    currentLayerId = id;
    renderLayerPanel();
}

function toggleLayerVisibility(id, event) {
    event.stopPropagation();
    const layer = layers.find(l => l.id === id);
    if (layer) {
        layer.visible = !layer.visible;
        layer.canvas.style.display = layer.visible ? 'block' : 'none';
        renderLayerPanel();
    }
}

function deleteLayer(id, event) {
    event.stopPropagation();
    if (layers.length <= 1) {
        alert("最後のレイヤーは削除できません。");
        return;
    }
    const layerIndex = layers.findIndex(l => l.id === id);
    if (layerIndex !== -1) {
        const layer = layers[layerIndex];
        canvasWrapper.removeChild(layer.canvas);
        layers.splice(layerIndex, 1);
        
        if (currentLayerId === id) {
            selectLayer(layers[layers.length - 1].id);
        }
        renderLayerPanel();
        saveState();
    }
}

function renderLayerPanel() {
    layerListEl.innerHTML = '';
    for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        layer.canvas.style.zIndex = i; 

        const item = document.createElement('div');
        item.className = `layer-item ${layer.id === currentLayerId ? 'active' : ''}`;
        item.onclick = () => selectLayer(layer.id);

        const visibilityBtn = document.createElement('button');
        visibilityBtn.innerText = layer.visible ? '👁️' : 'ー';
        visibilityBtn.onclick = (e) => toggleLayerVisibility(layer.id, e);

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = layer.name;
        nameInput.onclick = (e) => e.stopPropagation();
        nameInput.onchange = (e) => { layer.name = e.target.value; };

        const deleteBtn = document.createElement('button');
        deleteBtn.innerText = '✖';
        deleteBtn.onclick = (e) => deleteLayer(layer.id, e);

        const controls = document.createElement('div');
        controls.className = 'layer-controls';
        controls.appendChild(visibilityBtn);
        controls.appendChild(deleteBtn);

        item.appendChild(nameInput);
        item.appendChild(controls);
        layerListEl.appendChild(item);
    }
}

function getCurrentContext() {
    const layer = layers.find(l => l.id === currentLayerId);
    return layer ? layer.ctx : null;
}

// --- Undo / Redo 機能 ---
function getSnapshot() {
    return layers.map(layer => ({
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        dataURL: layer.canvas.toDataURL()
    }));
}

function saveState() {
    const state = {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        layers: getSnapshot()
    };
    historyStack.push(state);
    if (historyStack.length > MAX_HISTORY) {
        historyStack.shift();
    }
    redoStack = []; 
    if (typeof updateStatusBar === 'function') updateStatusBar();
}

function restoreState(state) {
    CANVAS_WIDTH = state.width;
    CANVAS_HEIGHT = state.height;
    canvasWrapper.style.width = (CANVAS_WIDTH * currentZoom) + 'px';
    canvasWrapper.style.height = (CANVAS_HEIGHT * currentZoom) + 'px';
    previewCanvas.width = CANVAS_WIDTH;
    previewCanvas.height = CANVAS_HEIGHT;
    previewCanvas.style.imageRendering = isAntiAlias ? 'auto' : 'pixelated';
    previewCtx.imageSmoothingEnabled = isAntiAlias;

    layers.forEach(l => canvasWrapper.removeChild(l.canvas));
    layers = [];
    
    let loadedCount = 0;
    const totalLayers = state.layers.length;

    state.layers.forEach((layerData, index) => {
        const canvas = document.createElement('canvas');
        canvas.id = layerData.id;
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
        canvas.style.zIndex = index;
        canvas.style.display = layerData.visible ? 'block' : 'none';
        canvas.style.imageRendering = isAntiAlias ? 'auto' : 'pixelated';
        
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingEnabled = isAntiAlias;
        
        canvasWrapper.insertBefore(canvas, previewCanvas);

        const layerObj = {
            id: layerData.id,
            name: layerData.name,
            canvas: canvas,
            ctx: ctx,
            visible: layerData.visible
        };
        layers.push(layerObj);

        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            loadedCount++;
            if (loadedCount === totalLayers) {
                const prevSelectedExists = layers.some(l => l.id === currentLayerId);
                if (!prevSelectedExists) {
                    currentLayerId = layers[layers.length - 1].id;
                }
                renderLayerPanel();
            }
        };
        img.src = layerData.dataURL;
    });

    layerCounter = Math.max(layerCounter, ...state.layers.map(s => parseInt(s.id.split('_')[1] || 0))) + 1;
    if (typeof updateStatusBar === 'function') updateStatusBar();
}

function undo() {
    finalizeSelection();
    if (historyStack.length > 1) {
        const currentState = historyStack.pop();
        redoStack.push(currentState);
        const previousState = historyStack[historyStack.length - 1];
        restoreState(previousState);
    }
}

function redo() {
    finalizeSelection();
    if (redoStack.length > 0) {
        const nextState = redoStack.pop();
        historyStack.push(nextState);
        restoreState(nextState);
    }
}