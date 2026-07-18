import { State, DOM, CONSTANTS } from './state.js';
import { setZoom, updateStatusBar } from './app.js';

export function addLayer(name = null) {
    const id = `layer_${State.layerCounter++}`;
    const zIndex = State.layers.length;
    
    const canvas = document.createElement('canvas');
    canvas.id = id;
    canvas.width = State.CANVAS_WIDTH;
    canvas.height = State.CANVAS_HEIGHT;
    canvas.style.zIndex = zIndex;
    canvas.style.imageRendering = State.isAntiAlias ? 'auto' : 'pixelated';
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = State.isAntiAlias;

    DOM.canvasWrapper.insertBefore(canvas, DOM.previewCanvas);

    const layerObj = {
        id: id,
        name: name || `レイヤー ${State.layerCounter}`,
        canvas: canvas,
        ctx: ctx,
        visible: true,
        type: 'pixel',
        shape: null
    };

    State.layers.push(layerObj);
    selectLayer(id);
    renderLayerPanel();
    
    if(State.layers.length > 1) { 
        saveState();
    }
    return layerObj;
}

export function selectLayer(id) {
    if (State.currentLayerId !== id && State.editingShape && !State.isFinalizing) {
        if (window.finalizeShape) window.finalizeShape();
    }
    State.currentLayerId = id;
    renderLayerPanel();
    if (typeof window.onLayerSelected === 'function') {
        window.onLayerSelected(id);
    }
}

export function toggleLayerVisibility(id, event) {
    event.stopPropagation();
    const layer = State.layers.find(l => l.id === id);
    if (layer) {
        layer.visible = !layer.visible;
        layer.canvas.style.display = layer.visible ? 'block' : 'none';
        renderLayerPanel();
    }
}

export function moveLayerUp(id, event) {
    event.stopPropagation();
    const index = State.layers.findIndex(l => l.id === id);
    if (index < State.layers.length - 1) {
        const temp = State.layers[index];
        State.layers[index] = State.layers[index + 1];
        State.layers[index + 1] = temp;
        renderLayerPanel();
        saveState();
    }
}

export function moveLayerDown(id, event) {
    event.stopPropagation();
    const index = State.layers.findIndex(l => l.id === id);
    if (index > 0) {
        const temp = State.layers[index];
        State.layers[index] = State.layers[index - 1];
        State.layers[index - 1] = temp;
        renderLayerPanel();
        saveState();
    }
}

export function deleteLayer(id, event) {
    event.stopPropagation();
    if (State.layers.length <= 1) {
        alert("最後のレイヤーは削除できません。");
        return;
    }
    const layerIndex = State.layers.findIndex(l => l.id === id);
    if (layerIndex !== -1) {
        const layer = State.layers[layerIndex];
        DOM.canvasWrapper.removeChild(layer.canvas);
        State.layers.splice(layerIndex, 1);
        
        if (State.currentLayerId === id) {
            selectLayer(State.layers[State.layers.length - 1].id);
        }
        renderLayerPanel();
        saveState();
    }
}

export function renderLayerPanel() {
    DOM.layerListEl.innerHTML = '';
    for (let i = State.layers.length - 1; i >= 0; i--) {
        const layer = State.layers[i];
        layer.canvas.style.zIndex = i; 

        const item = document.createElement('div');
        item.className = `layer-item ${layer.id === State.currentLayerId ? 'active' : ''}`;
        item.onclick = () => selectLayer(layer.id);

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = layer.name;
        nameInput.title = layer.type === 'vector' ? 'ベクターレイヤー' : 'ピクセルレイヤー';
        if (layer.type === 'vector') nameInput.style.color = '#00ffff'; 
        nameInput.onclick = (e) => e.stopPropagation();
        nameInput.onchange = (e) => { layer.name = e.target.value; };

        const controls = document.createElement('div');
        controls.className = 'layer-controls';

        if (layer.type === 'vector') {
            const rasterizeBtn = document.createElement('button');
            rasterizeBtn.innerText = 'R';
            rasterizeBtn.title = 'ラスタライズ (ピクセル化して通常の描画を可能にする)';
            rasterizeBtn.onclick = (e) => {
                e.stopPropagation();
                if (State.editingShape && State.editingShape.layerId === layer.id) {
                    if (window.finalizeShape) window.finalizeShape();
                }
                layer.type = 'pixel';
                layer.shape = null;
                renderLayerPanel();
                saveState();
            };
            controls.appendChild(rasterizeBtn);
        }

        const visibilityBtn = document.createElement('button');
        visibilityBtn.innerText = layer.visible ? '👁️' : 'ー';
        visibilityBtn.onclick = (e) => toggleLayerVisibility(layer.id, e);

        const downBtn = document.createElement('button');
        downBtn.innerText = '↓';
        downBtn.onclick = (e) => moveLayerDown(layer.id, e);
        
        const upBtn = document.createElement('button');
        upBtn.innerText = '↑';
        upBtn.onclick = (e) => moveLayerUp(layer.id, e);

        const deleteBtn = document.createElement('button');
        deleteBtn.innerText = '✖';
        deleteBtn.onclick = (e) => deleteLayer(layer.id, e);

        controls.appendChild(visibilityBtn);
        controls.appendChild(downBtn);
        controls.appendChild(upBtn);
        controls.appendChild(deleteBtn);

        item.appendChild(nameInput);
        item.appendChild(controls);
        DOM.layerListEl.appendChild(item);
    }
}

export function getCurrentContext() {
    const layer = State.layers.find(l => l.id === State.currentLayerId);
    return layer ? layer.ctx : null;
}

export function getSnapshot() {
    return State.layers.map(layer => ({
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        type: layer.type || 'pixel',
        shape: layer.shape ? JSON.parse(JSON.stringify(layer.shape)) : null,
        dataURL: layer.canvas.toDataURL()
    }));
}

export function saveState() {
    const s = {
        width: State.CANVAS_WIDTH,
        height: State.CANVAS_HEIGHT,
        layers: getSnapshot()
    };
    State.historyStack.push(s);
    if (State.historyStack.length > CONSTANTS.MAX_HISTORY) {
        State.historyStack.shift();
    }
    State.redoStack = []; 
    updateStatusBar();
}

export function restoreState(s) {
    State.CANVAS_WIDTH = s.width;
    State.CANVAS_HEIGHT = s.height;
    DOM.canvasWrapper.style.width = (State.CANVAS_WIDTH * State.currentZoom) + 'px';
    DOM.canvasWrapper.style.height = (State.CANVAS_HEIGHT * State.currentZoom) + 'px';
    DOM.previewCanvas.width = State.CANVAS_WIDTH;
    DOM.previewCanvas.height = State.CANVAS_HEIGHT;
    DOM.previewCanvas.style.imageRendering = State.isAntiAlias ? 'auto' : 'pixelated';
    DOM.previewCtx.imageSmoothingEnabled = State.isAntiAlias;

    State.layers.forEach(l => DOM.canvasWrapper.removeChild(l.canvas));
    State.layers = [];
    
    let loadedCount = 0;
    const totalLayers = s.layers.length;

    s.layers.forEach((layerData, index) => {
        const canvas = document.createElement('canvas');
        canvas.id = layerData.id;
        canvas.width = State.CANVAS_WIDTH;
        canvas.height = State.CANVAS_HEIGHT;
        canvas.style.zIndex = index;
        canvas.style.display = layerData.visible ? 'block' : 'none';
        canvas.style.imageRendering = State.isAntiAlias ? 'auto' : 'pixelated';
        
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingEnabled = State.isAntiAlias;
        
        DOM.canvasWrapper.insertBefore(canvas, DOM.previewCanvas);

        const layerObj = {
            id: layerData.id,
            name: layerData.name,
            canvas: canvas,
            ctx: ctx,
            visible: layerData.visible,
            type: layerData.type || 'pixel',
            shape: layerData.shape || null
        };
        State.layers.push(layerObj);

        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            loadedCount++;
            if (loadedCount === totalLayers) {
                const prevSelectedExists = State.layers.some(l => l.id === State.currentLayerId);
                if (!prevSelectedExists) {
                    State.currentLayerId = State.layers[State.layers.length - 1].id;
                }
                renderLayerPanel();
            }
        };
        img.src = layerData.dataURL;
    });

    State.layerCounter = Math.max(State.layerCounter, ...s.layers.map(ls => parseInt(ls.id.split('_')[1] || 0))) + 1;
    updateStatusBar();
}

export function undo() {
    import('./canvas_io.js').then(io => io.finalizeSelection());
    if (State.historyStack.length > 1) {
        const currentState = State.historyStack.pop();
        State.redoStack.push(currentState);
        const previousState = State.historyStack[State.historyStack.length - 1];
        restoreState(previousState);
    }
}

export function redo() {
    import('./canvas_io.js').then(io => io.finalizeSelection());
    if (State.redoStack.length > 0) {
        const nextState = State.redoStack.pop();
        State.historyStack.push(nextState);
        restoreState(nextState);
    }
}