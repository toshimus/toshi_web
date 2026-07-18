import { State, CONSTANTS, DOM } from './state.js';
import { drawBresenhamLine, drawBresenhamCircle, drawBresenhamEllipse, executeFloodFill } from './drawing_tools.js';
import { addLayer, saveState, restoreState, undo, redo, getCurrentContext, selectLayer, toggleLayerVisibility, deleteLayer } from './layer_history.js';
import { duplicateSelection, deleteSelection, finalizeSelection, createNewCanvas, resizeCanvasPrompt, scaleImagePrompt, copyToClipboard, pasteFromClipboard, loadImageAsLayer, exportImage, saveProject, loadProject, drawSelectionPreview } from './canvas_io.js';

export function updateStatusBar() {
    const sizeDisplay = document.getElementById('status-size');
    if (sizeDisplay) {
        sizeDisplay.innerText = `${State.CANVAS_WIDTH} x ${State.CANVAS_HEIGHT} px`;
    }
}

function updateBrushPreview(clientX, clientY) {
    if (['pen', 'eraser', 'dot'].includes(State.currentTool)) {
        const size = State.currentLineWidth * State.currentZoom;
        DOM.brushPreview.style.width = size + 'px';
        DOM.brushPreview.style.height = size + 'px';
        DOM.brushPreview.style.left = clientX + 'px';
        DOM.brushPreview.style.top = clientY + 'px';
        DOM.brushPreview.style.display = 'block';

        if (State.currentTool !== 'pen' || State.isAntiAlias) {
            DOM.brushPreview.style.borderRadius = '50%';
        } else {
            DOM.brushPreview.style.borderRadius = '0';
        }
    } else {
        DOM.brushPreview.style.display = 'none';
    }
}

export function setTool(toolName) {
    if (State.currentTool === 'select' && toolName !== 'select') {
        finalizeSelection();
    }

    State.currentTool = toolName;
    document.querySelectorAll('#tool-grid button, #tool-pan').forEach(btn => {
        if (btn.id && btn.id.startsWith('tool-')) {
            btn.classList.remove('active');
        }
    });
    const targetBtn = document.getElementById(`tool-${toolName}`);
    if (targetBtn) targetBtn.classList.add('active');
    
    State.isPanning = false;
    DOM.selectionPanel.style.display = (toolName === 'select') ? 'flex' : 'none';
    
    if (!['pen', 'eraser', 'dot'].includes(State.currentTool)) {
        DOM.brushPreview.style.display = 'none';
    }
}

export function setAntiAlias(enable) {
    State.isAntiAlias = enable;
    document.getElementById('aa-off').classList.toggle('active', !enable);
    document.getElementById('aa-on').classList.toggle('active', enable);
    
    State.layers.forEach(layer => {
        layer.ctx.imageSmoothingEnabled = enable;
        layer.canvas.style.imageRendering = enable ? 'auto' : 'pixelated';
    });
    DOM.previewCtx.imageSmoothingEnabled = enable;
    DOM.previewCanvas.style.imageRendering = enable ? 'auto' : 'pixelated';
    if(State.selection.active) drawSelectionPreview();
}

export function toggleGrid() {
    State.isGridVisible = !State.isGridVisible;
    document.getElementById('grid-toggle').classList.toggle('active', State.isGridVisible);
    updateGrid();
}

function updateGrid() {
    const overlay = document.getElementById('grid-overlay');
    if (State.isGridVisible && State.currentZoom >= 4) {
        overlay.style.display = 'block';
        overlay.style.backgroundImage = `
            linear-gradient(to right, rgba(128,128,128,0.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(128,128,128,0.3) 1px, transparent 1px)
        `;
        overlay.style.backgroundSize = `${State.currentZoom}px ${State.currentZoom}px`;
    } else {
        overlay.style.display = 'none';
    }
}

export function setColor(color) {
    State.currentColor = color;
    document.getElementById('color-picker').value = color;
}

export function setPaletteColor(hex) {
    setColor(hex);
}

export function setLineWidth(width) {
    State.currentLineWidth = parseInt(width, 10);
    document.getElementById('line-width-display').innerText = width;
}

export function setZoom(level, cx, cy) {
    const oldZoom = State.currentZoom;
    State.currentZoom = level;
    
    if (cx === undefined || cy === undefined) {
        const wsRect = DOM.workspace.getBoundingClientRect();
        cx = wsRect.left + wsRect.width / 2;
        cy = wsRect.top + wsRect.height / 2;
    }

    const cwRectOld = DOM.canvasWrapper.getBoundingClientRect();
    const offsetX = cx - cwRectOld.left;
    const offsetY = cy - cwRectOld.top;
    
    DOM.canvasWrapper.style.width = (State.CANVAS_WIDTH * State.currentZoom) + 'px';
    DOM.canvasWrapper.style.height = (State.CANVAS_HEIGHT * State.currentZoom) + 'px';
    
    document.querySelectorAll('#zoom-controls button').forEach(btn => {
        btn.classList.remove('active');
    });
    const zBtn = document.getElementById(`zoom-${level}`);
    if(zBtn) zBtn.classList.add('active');

    updateGrid();

    const newOffsetX = offsetX * (State.currentZoom / oldZoom);
    const newOffsetY = offsetY * (State.currentZoom / oldZoom);
    const cwRectNew = DOM.canvasWrapper.getBoundingClientRect();
    
    DOM.workspace.scrollLeft += (cwRectNew.left + newOffsetX) - cx;
    DOM.workspace.scrollTop += (cwRectNew.top + newOffsetY) - cy;
}

function zoomStep(dir, cx, cy) {
    const levels = [1, 2, 4, 8, 16, 32];
    let idx = levels.indexOf(State.currentZoom);
    if (idx === -1) idx = 0;
    idx += dir;
    if (idx < 0) idx = 0;
    if (idx >= levels.length) idx = levels.length - 1;
    if (levels[idx] !== State.currentZoom) {
        setZoom(levels[idx], cx, cy);
    }
}

function startPanning(e) {
    State.isPanning = true;
    let clientX, clientY;
    if (e.touches) {
        if (e.touches.length >= 2) {
            clientX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            clientY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        } else {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    State.panStartX = clientX;
    State.panStartY = clientY;
    State.panScrollX = DOM.workspace.scrollLeft;
    State.panScrollY = DOM.workspace.scrollTop;
}

function doPan(e) {
    if (!State.isPanning) return;
    let clientX, clientY;
    if (e.touches) {
        if (e.touches.length >= 2) {
            clientX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            clientY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        } else {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    const dx = clientX - State.panStartX;
    const dy = clientY - State.panStartY;
    DOM.workspace.scrollLeft = State.panScrollX - dx;
    DOM.workspace.scrollTop = State.panScrollY - dy;
}

function stopPanning() {
    State.isPanning = false;
}

function getMousePos(e) {
    const rect = DOM.previewCanvas.getBoundingClientRect();
    let clientX = e.clientX;
    let clientY = e.clientY;

    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
    }

    const scaleX = State.CANVAS_WIDTH / rect.width;
    const scaleY = State.CANVAS_HEIGHT / rect.height;
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

function setupPreviewCanvasEvents() {
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.zIndex = '10000';
    overlay.style.cursor = 'crosshair';
    DOM.canvasWrapper.appendChild(overlay);

    window.addEventListener('mouseout', (e) => {
        DOM.brushPreview.style.display = 'none';
    });

    overlay.addEventListener('wheel', (e) => {
        e.preventDefault(); 
        if (e.deltaY < 0) zoomStep(1, e.clientX, e.clientY);
        else zoomStep(-1, e.clientX, e.clientY);
    }, { passive: false });

    overlay.addEventListener('mousedown', (e) => {
        if (State.currentTool === 'pan') {
            startPanning(e);
        } else {
            startDrawing(e);
        }
    });
    window.addEventListener('mousemove', (e) => {
        updateBrushPreview(e.clientX, e.clientY); 
        if (State.isPanning && State.currentTool === 'pan') {
            doPan(e);
        } else if (State.isDrawing || State.isDraggingSelection) {
            draw(e);
        }
    });
    window.addEventListener('mouseup', (e) => {
        if (State.isPanning) stopPanning();
        if (State.isDrawing || State.isDraggingSelection) stopDrawing(e);
    });

    overlay.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length > 0) {
            updateBrushPreview(e.touches[0].clientX, e.touches[0].clientY);
        }
        if (e.touches && e.touches.length >= 2) {
            e.preventDefault();
            startPanning(e);
            State.initialPinchDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            return;
        }
        
        if (State.currentTool === 'pan') {
            e.preventDefault();
            startPanning(e);
        } else {
            e.preventDefault(); 
            startDrawing(e);
        }
    }, { passive: false });
    
    window.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches.length > 0) {
            updateBrushPreview(e.touches[0].clientX, e.touches[0].clientY);
        }
        if (e.touches && e.touches.length >= 2) {
            e.preventDefault();
            const currentDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const pinchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const pinchCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

            if (State.initialPinchDistance) {
                const ratio = currentDistance / State.initialPinchDistance;
                if (ratio > 1.2) {
                    zoomStep(1, pinchCenterX, pinchCenterY);
                    State.initialPinchDistance = currentDistance;
                } else if (ratio < 0.8) {
                    zoomStep(-1, pinchCenterX, pinchCenterY);
                    State.initialPinchDistance = currentDistance;
                }
            }
            if (State.isPanning) doPan(e);
            return;
        }

        if (State.isPanning) {
            e.preventDefault();
            doPan(e);
        } else if (State.isDrawing || State.isDraggingSelection) {
            e.preventDefault(); 
            draw(e);
        }
    }, { passive: false });
    
    window.addEventListener('touchend', (e) => {
        DOM.brushPreview.style.display = 'none'; 
        State.initialPinchDistance = null;
        if (State.isPanning) stopPanning();
        if (State.isDrawing || State.isDraggingSelection) stopDrawing(e);
    });
    window.addEventListener('touchcancel', (e) => {
        DOM.brushPreview.style.display = 'none'; 
        State.initialPinchDistance = null;
        if (State.isPanning) stopPanning();
        if (State.isDrawing || State.isDraggingSelection) stopDrawing(e);
    });
}

function setupContextStyle(ctx, isEraser = false) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = State.currentLineWidth;
    
    if (isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = State.currentColor;
        ctx.fillStyle = State.currentColor;
    }
}

function startDrawing(e) {
    if (!State.currentLayerId) return;
    const layer = State.layers.find(l => l.id === State.currentLayerId);
    if (!layer || !layer.visible) {
        alert("現在選択されているレイヤーは非表示か存在しません。");
        return;
    }

    const pos = getMousePos(e);
    
    if (State.currentTool === 'select') {
        if (State.selection.active &&
            pos.x >= State.selection.x && pos.x <= State.selection.x + State.selection.w &&
            pos.y >= State.selection.y && pos.y <= State.selection.y + State.selection.h) {
            
            State.isDraggingSelection = true;
            if (!State.selection.isFloating) {
                State.selection.canvas = document.createElement('canvas');
                State.selection.canvas.width = State.selection.w;
                State.selection.canvas.height = State.selection.h;
                State.selection.canvas.getContext('2d').drawImage(layer.canvas, State.selection.x, State.selection.y, State.selection.w, State.selection.h, 0, 0, State.selection.w, State.selection.h);
                layer.ctx.clearRect(State.selection.x, State.selection.y, State.selection.w, State.selection.h);
                State.selection.isFloating = true;
            }
            State.dragOffsetX = pos.x - State.selection.x;
            State.dragOffsetY = pos.y - State.selection.y;
        } else {
            finalizeSelection(); 
            State.startX = pos.x;
            State.startY = pos.y;
            State.isDrawing = true; 
        }
        return;
    }
    
    State.startX = pos.x;
    State.startY = pos.y;
    State.hasMoved = false; 

    if (State.currentTool === 'dot') {
        const ctx = getCurrentContext();
        setupContextStyle(ctx, false);
        if (!State.isAntiAlias) {
            drawBresenhamLine(ctx, State.startX, State.startY, State.startX, State.startY, false);
        } else {
            ctx.beginPath();
            ctx.arc(State.startX, State.startY, State.currentLineWidth / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        saveState();
        return; 
    }

    State.isDrawing = true;

    if (State.currentTool === 'bucket') {
        State.isDrawing = false;
        executeFloodFill(Math.floor(State.startX), Math.floor(State.startY));
        saveState();
        return;
    }

    if (State.currentTool === 'pen' || State.currentTool === 'eraser') {
        const ctx = getCurrentContext();
        setupContextStyle(ctx, State.currentTool === 'eraser');
        
        if (State.isAntiAlias) {
            ctx.beginPath();
            ctx.moveTo(State.startX, State.startY);
        }
    }
}

function draw(e) {
    const pos = getMousePos(e);
    State.hasMoved = true;

    if (State.currentTool === 'select') {
        if (State.isDraggingSelection) {
            State.selection.x = pos.x - State.dragOffsetX;
            State.selection.y = pos.y - State.dragOffsetY;
            if (!State.isAntiAlias) {
                State.selection.x = Math.round(State.selection.x);
                State.selection.y = Math.round(State.selection.y);
            }
            drawSelectionPreview();
        } else if (State.isDrawing) {
            DOM.previewCtx.clearRect(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
            DOM.previewCtx.beginPath();
            DOM.previewCtx.setLineDash([5, 5]);
            DOM.previewCtx.strokeStyle = '#00ffff'; 
            DOM.previewCtx.lineWidth = 1;
            const w = pos.x - State.startX;
            const h = pos.y - State.startY;
            DOM.previewCtx.strokeRect(State.startX, State.startY, w, h);
            DOM.previewCtx.setLineDash([]);
        }
        return;
    }

    if (!State.isDrawing) return;

    if (State.currentTool === 'pen' || State.currentTool === 'eraser') {
        const ctx = getCurrentContext();
        if (!State.isAntiAlias) {
            drawBresenhamLine(ctx, State.startX, State.startY, pos.x, pos.y, State.currentTool === 'eraser');
            State.startX = pos.x;
            State.startY = pos.y;
        } else {
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        }
    } else if (['line', 'rect', 'rect-fill', 'circle', 'circle-fill', 'ellipse', 'ellipse-fill', 'crop'].includes(State.currentTool)) {
        DOM.previewCtx.clearRect(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
        setupContextStyle(DOM.previewCtx, false); 
        
        if (State.currentTool === 'crop') {
            DOM.previewCtx.beginPath();
            DOM.previewCtx.setLineDash([5, 5]);
            DOM.previewCtx.strokeStyle = '#ff0000';
            DOM.previewCtx.lineWidth = 1;
            const width = pos.x - State.startX;
            const height = pos.y - State.startY;
            DOM.previewCtx.strokeRect(State.startX, State.startY, width, height);
            DOM.previewCtx.setLineDash([]); 
        } else if (State.currentTool === 'line') {
            if (!State.isAntiAlias) {
                drawBresenhamLine(DOM.previewCtx, State.startX, State.startY, pos.x, pos.y, false);
            } else {
                DOM.previewCtx.beginPath();
                DOM.previewCtx.moveTo(State.startX, State.startY);
                DOM.previewCtx.lineTo(pos.x, pos.y);
                DOM.previewCtx.stroke();
            }
        } else if (State.currentTool === 'rect' || State.currentTool === 'rect-fill') {
            if (!State.isAntiAlias) {
                if (State.currentTool === 'rect-fill') {
                    let rx = Math.floor(Math.min(State.startX, pos.x));
                    let ry = Math.floor(Math.min(State.startY, pos.y));
                    let rw = Math.floor(Math.max(State.startX, pos.x)) - rx + 1;
                    let rh = Math.floor(Math.max(State.startY, pos.y)) - ry + 1;
                    DOM.previewCtx.fillRect(rx, ry, rw, rh);
                } else {
                    drawBresenhamLine(DOM.previewCtx, State.startX, State.startY, pos.x, State.startY, false);
                    drawBresenhamLine(DOM.previewCtx, pos.x, State.startY, pos.x, pos.y, false);
                    drawBresenhamLine(DOM.previewCtx, pos.x, pos.y, State.startX, pos.y, false);
                    drawBresenhamLine(DOM.previewCtx, State.startX, pos.y, State.startX, State.startY, false);
                }
            } else {
                let rx = State.startX, ry = State.startY, rw = pos.x - State.startX, rh = pos.y - State.startY;
                DOM.previewCtx.beginPath();
                if (State.currentTool === 'rect-fill') {
                    DOM.previewCtx.fillRect(rx, ry, rw, rh);
                } else {
                    DOM.previewCtx.strokeRect(rx, ry, rw, rh);
                }
            }
        } else if (State.currentTool === 'circle' || State.currentTool === 'circle-fill') {
            const radius = Math.sqrt(Math.pow(pos.x - State.startX, 2) + Math.pow(pos.y - State.startY, 2));
            const isFill = (State.currentTool === 'circle-fill');
            if (!State.isAntiAlias) {
                drawBresenhamCircle(DOM.previewCtx, State.startX, State.startY, radius, isFill, false);
            } else {
                DOM.previewCtx.beginPath();
                DOM.previewCtx.arc(State.startX, State.startY, radius, 0, Math.PI * 2);
                if (isFill) DOM.previewCtx.fill(); else DOM.previewCtx.stroke();
            }
        } else if (State.currentTool === 'ellipse' || State.currentTool === 'ellipse-fill') {
            let rx = Math.abs(pos.x - State.startX) / 2;
            let ry = Math.abs(pos.y - State.startY) / 2;
            let cx = Math.min(State.startX, pos.x) + rx;
            let cy = Math.min(State.startY, pos.y) + ry;
            const isFill = (State.currentTool === 'ellipse-fill');
            
            if (!State.isAntiAlias) {
                drawBresenhamEllipse(DOM.previewCtx, cx, cy, rx, ry, isFill, false);
            } else {
                DOM.previewCtx.beginPath();
                DOM.previewCtx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
                if (isFill) DOM.previewCtx.fill(); else DOM.previewCtx.stroke();
            }
        }
    }
}

function stopDrawing(e) {
    if (State.currentTool === 'select') {
        if (State.isDraggingSelection) {
            State.isDraggingSelection = false;
            drawSelectionPreview();
        } else if (State.isDrawing) {
            State.isDrawing = false;
            const pos = getMousePos(e);
            const rx = Math.min(State.startX, pos.x);
            const ry = Math.min(State.startY, pos.y);
            const rw = Math.abs(pos.x - State.startX);
            const rh = Math.abs(pos.y - State.startY);
            
            if (rw > 2 && rh > 2) {
                State.selection.x = !State.isAntiAlias ? Math.round(rx) : rx;
                State.selection.y = !State.isAntiAlias ? Math.round(ry) : ry;
                State.selection.w = !State.isAntiAlias ? Math.round(rw) : rw;
                State.selection.h = !State.isAntiAlias ? Math.round(rh) : rh;
                State.selection.active = true;
                State.selection.isFloating = false;
                drawSelectionPreview();
            } else {
                State.selection.active = false;
                DOM.previewCtx.clearRect(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
            }
        }
        return; 
    }

    if (!State.isDrawing) return;
    State.isDrawing = false;
    
    const ctx = getCurrentContext();

    if (State.currentTool === 'pen' || State.currentTool === 'eraser') {
        if (State.isAntiAlias) {
            ctx.closePath();
        }
        
        if (!State.hasMoved) {
            if (!State.isAntiAlias) {
                drawBresenhamLine(ctx, State.startX, State.startY, State.startX, State.startY, State.currentTool === 'eraser');
            } else {
                ctx.beginPath();
                ctx.arc(State.startX, State.startY, State.currentLineWidth / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        if (State.currentTool === 'eraser') ctx.globalCompositeOperation = 'source-over';
    } else if (['line', 'rect', 'rect-fill', 'circle', 'circle-fill', 'ellipse', 'ellipse-fill', 'crop'].includes(State.currentTool)) {
        setupContextStyle(ctx, false);
        const pos = getMousePos(e);
        
        if (State.currentTool === 'crop') {
            DOM.previewCtx.clearRect(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
            const rectX = Math.min(State.startX, pos.x);
            const rectY = Math.min(State.startY, pos.y);
            const rectW = Math.abs(pos.x - State.startX);
            const rectH = Math.abs(pos.y - State.startY);
            
            if (rectW > 5 && rectH > 5) {
                finalizeSelection();
                import('./canvas_io.js').then(io => io.executeResize(rectW, rectH, rectX, rectY));
            }
            saveState();
            return;
        }

        if (State.currentTool === 'line') {
            if (!State.isAntiAlias) {
                drawBresenhamLine(ctx, State.startX, State.startY, pos.x, pos.y, false);
            } else {
                ctx.beginPath();
                ctx.moveTo(State.startX, State.startY);
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
            }
        } else if (State.currentTool === 'rect' || State.currentTool === 'rect-fill') {
            if (!State.isAntiAlias) {
                if (State.currentTool === 'rect-fill') {
                    let rx = Math.floor(Math.min(State.startX, pos.x));
                    let ry = Math.floor(Math.min(State.startY, pos.y));
                    let rw = Math.floor(Math.max(State.startX, pos.x)) - rx + 1;
                    let rh = Math.floor(Math.max(State.startY, pos.y)) - ry + 1;
                    ctx.fillRect(rx, ry, rw, rh);
                } else {
                    drawBresenhamLine(ctx, State.startX, State.startY, pos.x, State.startY, false);
                    drawBresenhamLine(ctx, pos.x, State.startY, pos.x, pos.y, false);
                    drawBresenhamLine(ctx, pos.x, pos.y, State.startX, pos.y, false);
                    drawBresenhamLine(ctx, State.startX, pos.y, State.startX, State.startY, false);
                }
            } else {
                let rx = State.startX, ry = State.startY, rw = pos.x - State.startX, rh = pos.y - State.startY;
                ctx.beginPath();
                if (State.currentTool === 'rect-fill') {
                    ctx.fillRect(rx, ry, rw, rh);
                } else {
                    ctx.strokeRect(rx, ry, rw, rh);
                }
            }
        } else if (State.currentTool === 'circle' || State.currentTool === 'circle-fill') {
            const radius = Math.sqrt(Math.pow(pos.x - State.startX, 2) + Math.pow(pos.y - State.startY, 2));
            const isFill = (State.currentTool === 'circle-fill');
            if (!State.isAntiAlias) {
                drawBresenhamCircle(ctx, State.startX, State.startY, radius, isFill, false);
            } else {
                ctx.beginPath();
                ctx.arc(State.startX, State.startY, radius, 0, Math.PI * 2);
                if (isFill) ctx.fill(); else ctx.stroke();
            }
        } else if (State.currentTool === 'ellipse' || State.currentTool === 'ellipse-fill') {
            let rx = Math.abs(pos.x - State.startX) / 2;
            let ry = Math.abs(pos.y - State.startY) / 2;
            let cx = Math.min(State.startX, pos.x) + rx;
            let cy = Math.min(State.startY, pos.y) + ry;
            const isFill = (State.currentTool === 'ellipse-fill');
            
            if (!State.isAntiAlias) {
                drawBresenhamEllipse(ctx, cx, cy, rx, ry, isFill, false);
            } else {
                ctx.beginPath();
                ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
                if (isFill) ctx.fill(); else ctx.stroke();
            }
        }
        DOM.previewCtx.clearRect(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
    }
    
    saveState();
}

function init() {
    DOM.previewCtx.imageSmoothingEnabled = State.isAntiAlias;
    DOM.previewCanvas.style.imageRendering = State.isAntiAlias ? 'auto' : 'pixelated';
    
    const paletteGrid = document.getElementById('famicom-palette');
    if (paletteGrid) {
        paletteGrid.innerHTML = '';
        CONSTANTS.famicomColors.forEach(color => {
            const div = document.createElement('div');
            div.className = 'palette-color';
            div.style.backgroundColor = color;
            div.onclick = () => setPaletteColor(color);
            paletteGrid.appendChild(div);
        });
    }

    addLayer('レイヤー 1');
    saveState(); 
    setupPreviewCanvasEvents();
    updateStatusBar();
}

// UIイベントのバインディング（HTML側から参照できるようにWindowオブジェクトに登録）
window.setTool = setTool;
window.setAntiAlias = setAntiAlias;
window.toggleGrid = toggleGrid;
window.setColor = setColor;
window.setPaletteColor = setPaletteColor;
window.setLineWidth = setLineWidth;
window.setZoom = setZoom;
window.copyToClipboard = copyToClipboard;
window.pasteFromClipboard = pasteFromClipboard;
window.loadImageAsLayer = loadImageAsLayer;
window.exportImage = exportImage;
window.saveProject = saveProject;
window.loadProject = loadProject;
window.createNewCanvas = createNewCanvas;
window.resizeCanvasPrompt = resizeCanvasPrompt;
window.scaleImagePrompt = scaleImagePrompt;
window.duplicateSelection = duplicateSelection;
window.deleteSelection = deleteSelection;
window.finalizeSelection = finalizeSelection;
window.addLayer = addLayer;
window.undo = undo;
window.redo = redo;

window.onload = init;