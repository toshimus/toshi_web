import { State, CONSTANTS, DOM } from './state.js';
import { drawBresenhamLine, drawBresenhamCircle, drawBresenhamEllipse, executeFloodFill, executeWandSelection, applyColorAdjustment } from './drawing_tools.js';
import { addLayer, saveState, restoreState, undo, redo, getCurrentContext, selectLayer, toggleLayerVisibility, deleteLayer, duplicateLayer, mergeVisibleLayers } from './layer_history.js';
import { duplicateSelection, deleteSelection, finalizeSelection, floatSelection, invertSelection, deselect, createNewCanvas, resizeCanvasPrompt, scaleImagePrompt, copyToClipboard, pasteFromClipboard, loadImageAsLayer, exportImage, saveProject, saveProjectAs, loadProject, loadProjectSystem, drawSelectionPreview, rotateCanvasOrSelection, selectSaveFolder } from './canvas_io.js';
import { startShapeEdit, moveShapeEdit, endShapeEdit, finalizeShape, drawShapePreview, applySnap } from './shape_editor.js';

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
    if (State.currentTool.startsWith('select') && !toolName.startsWith('select')) {
        finalizeSelection();
    }
    
    if (State.currentTool.startsWith('edit-') && !toolName.startsWith('edit-')) {
        finalizeShape();
    }

    State.currentTool = toolName;
    document.querySelectorAll('.tool-btn, .dropdown-item').forEach(btn => {
        if (btn.id && btn.id.startsWith('tool-')) {
            btn.classList.remove('active');
        }
    });
    const targetBtn = document.getElementById(`tool-${toolName}`);
    if (targetBtn) targetBtn.classList.add('active');
    
    State.isPanning = false;
    if (DOM.selectionPanel) DOM.selectionPanel.style.display = (toolName.startsWith('select')) ? 'flex' : 'none';
    
    const textProps = document.getElementById('text-properties');
    if (textProps) {
        textProps.style.display = (toolName === 'edit-text') ? 'block' : 'none';
    }
    
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
    drawShapePreview(); 
}

export function toggleGrid() {
    State.isGridVisible = !State.isGridVisible;
    document.getElementById('grid-toggle').classList.toggle('active', State.isGridVisible);
    updateGrid();
}

function updateGrid() {
    const overlay = document.getElementById('grid-overlay');
    if (State.isGridVisible && State.currentZoom >= (16 / State.gridSize)) {
        overlay.style.display = 'block';
        overlay.style.backgroundImage = `
            linear-gradient(to right, rgba(128,128,128,0.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(128,128,128,0.3) 1px, transparent 1px)
        `;
        const size = State.gridSize * State.currentZoom;
        overlay.style.backgroundSize = `${size}px ${size}px`;
    } else {
        overlay.style.display = 'none';
    }
}

export function setColor(color) {
    State.currentColor = color;
    document.getElementById('color-picker').value = color;
    if (typeof window.updateShapeProperties === 'function') window.updateShapeProperties();
}

export function setPaletteColor(hex) {
    setColor(hex);
}

export function setLineWidth(width) {
    State.currentLineWidth = parseInt(width, 10);
    document.getElementById('line-width-display').innerText = width;
    if (typeof window.updateShapeProperties === 'function') window.updateShapeProperties();
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
    drawShapePreview(); 

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
        State.snapIndicator = null;
        if (State.selection.active) {
            drawSelectionPreview();
        } else {
            drawShapePreview();
        }
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
        
        let pos = getMousePos(e);

        if (State.isPanning && State.currentTool === 'pan') {
            doPan(e);
        } else if (State.isDrawing || State.isDraggingSelection || State.isDraggingHandle || State.isDraggingBody) {
            draw(e);
        } else {
            if (State.currentTool.startsWith('edit-')) {
                let snappedPos = applySnap(pos.x, pos.y);
                if (State.editingShape && State.editingShape.isDrawingFree) {
                    State.editingShape.tempPoint = snappedPos;
                }
                drawShapePreview();
            }
        }
    });
    
    window.addEventListener('mouseup', (e) => {
        if (State.isPanning) stopPanning();
        if (State.isDrawing || State.isDraggingSelection || State.isDraggingHandle || State.isDraggingBody) stopDrawing(e);
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
        } else if (State.isDrawing || State.isDraggingSelection || State.isDraggingHandle || State.isDraggingBody) {
            e.preventDefault(); 
            draw(e);
        }
    }, { passive: false });
    
    window.addEventListener('touchend', (e) => {
        DOM.brushPreview.style.display = 'none'; 
        State.initialPinchDistance = null;
        if (State.isPanning) stopPanning();
        if (State.isDrawing || State.isDraggingSelection || State.isDraggingHandle || State.isDraggingBody) stopDrawing(e);
    });
    window.addEventListener('touchcancel', (e) => {
        DOM.brushPreview.style.display = 'none'; 
        State.initialPinchDistance = null;
        if (State.isPanning) stopPanning();
        if (State.isDrawing || State.isDraggingSelection || State.isDraggingHandle || State.isDraggingBody) stopDrawing(e);
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

    if (!State.currentTool.startsWith('edit-') && !State.currentTool.startsWith('select') && layer.type === 'vector') {
        alert("ベクターレイヤーには直接ペン等で描画できません。レイヤーパネルの「R」でラスタライズするか、新しいレイヤーを追加してください。");
        return;
    }

    let pos = getMousePos(e);
    
    if (State.currentTool.startsWith('edit-')) {
        pos = applySnap(pos.x, pos.y); 
        startShapeEdit(pos.x, pos.y);
        State.isDrawing = true; 
        return;
    }

    if (State.currentTool.startsWith('select')) {
        let inSelection = false;
        if (State.selection.active) {
            inSelection = (pos.x >= State.selection.x && pos.x <= State.selection.x + State.selection.w &&
                           pos.y >= State.selection.y && pos.y <= State.selection.y + State.selection.h);
        }
        
        if (inSelection) {
            State.isDraggingSelection = true;
            if (!State.selection.isFloating) {
                floatSelection(layer);
            }
            State.dragOffsetX = pos.x - State.selection.x;
            State.dragOffsetY = pos.y - State.selection.y;
        } else {
            finalizeSelection(); 
            State.startX = pos.x;
            State.startY = pos.y;
            
            if (State.currentTool === 'select-wand') {
                const wandRes = executeWandSelection(pos.x, pos.y);
                if (wandRes) {
                    State.selection.x = wandRes.x;
                    State.selection.y = wandRes.y;
                    State.selection.w = wandRes.w;
                    State.selection.h = wandRes.h;
                    State.selection.type = 'wand';
                    State.selection.maskCanvas = wandRes.maskCanvas;
                    State.selection.active = true;
                    State.selection.isFloating = false;
                    drawSelectionPreview();
                }
            } else if (State.currentTool === 'select-lasso') {
                State.selection.path = [{x: pos.x, y: pos.y}];
                State.isDrawing = true;
            } else {
                State.isDrawing = true; 
            }
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
    let pos = getMousePos(e);
    State.hasMoved = true;

    if (State.currentTool.startsWith('edit-')) {
        pos = applySnap(pos.x, pos.y); 
        moveShapeEdit(pos.x, pos.y);
        return;
    }

    if (State.currentTool.startsWith('select')) {
        if (State.isDraggingSelection) {
            State.selection.x = pos.x - State.dragOffsetX;
            State.selection.y = pos.y - State.dragOffsetY;
            if (!State.isAntiAlias) {
                State.selection.x = Math.round(State.selection.x);
                State.selection.y = Math.round(State.selection.y);
            }
            drawSelectionPreview();
        } else if (State.isDrawing) {
            if (State.currentTool === 'select-lasso') {
                State.selection.path.push({x: pos.x, y: pos.y});
                drawSelectionPreview();
            } else {
                DOM.previewCtx.clearRect(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
                drawShapePreview(); 
                DOM.previewCtx.beginPath();
                DOM.previewCtx.setLineDash([5, 5]);
                DOM.previewCtx.strokeStyle = '#00ffff'; 
                DOM.previewCtx.lineWidth = 1;
                
                if (State.currentTool === 'select-ellipse') {
                    let rx = Math.abs(pos.x - State.startX) / 2;
                    let ry = Math.abs(pos.y - State.startY) / 2;
                    let cx = Math.min(State.startX, pos.x) + rx;
                    let cy = Math.min(State.startY, pos.y) + ry;
                    DOM.previewCtx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
                    DOM.previewCtx.stroke();
                } else {
                    const w = pos.x - State.startX;
                    const h = pos.y - State.startY;
                    DOM.previewCtx.strokeRect(State.startX, State.startY, w, h);
                }
                DOM.previewCtx.setLineDash([]);
            }
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
        drawShapePreview(); 
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
    let pos = getMousePos(e);

    if (State.currentTool.startsWith('edit-')) {
        if (State.isDrawing) {
            pos = applySnap(pos.x, pos.y); 
            endShapeEdit(pos.x, pos.y);
            State.isDrawing = false;
        }
        State.snapIndicator = null;
        drawShapePreview();
        return;
    }

    if (State.currentTool.startsWith('select')) {
        if (State.isDraggingSelection) {
            State.isDraggingSelection = false;
            drawSelectionPreview();
            saveState(); 
        } else if (State.isDrawing) {
            State.isDrawing = false;
            if (State.currentTool === 'select-lasso') {
                if (State.selection.path.length > 2) {
                    let minX = State.CANVAS_WIDTH, minY = State.CANVAS_HEIGHT, maxX = 0, maxY = 0;
                    State.selection.path.forEach(p => {
                        if(p.x < minX) minX = p.x;
                        if(p.x > maxX) maxX = p.x;
                        if(p.y < minY) minY = p.y;
                        if(p.y > maxY) maxY = p.y;
                    });
                    State.selection.x = minX;
                    State.selection.y = minY;
                    State.selection.w = maxX - minX;
                    State.selection.h = maxY - minY;
                    State.selection.type = 'lasso';
                    State.selection.active = true;
                    State.selection.isFloating = false;
                    drawSelectionPreview();
                } else {
                    finalizeSelection();
                }
            } else {
                const rx = Math.min(State.startX, pos.x);
                const ry = Math.min(State.startY, pos.y);
                const rw = Math.abs(pos.x - State.startX);
                const rh = Math.abs(pos.y - State.startY);
                
                if (rw > 2 && rh > 2) {
                    State.selection.x = !State.isAntiAlias ? Math.round(rx) : rx;
                    State.selection.y = !State.isAntiAlias ? Math.round(ry) : ry;
                    State.selection.w = !State.isAntiAlias ? Math.round(rw) : rw;
                    State.selection.h = !State.isAntiAlias ? Math.round(rh) : rh;
                    State.selection.type = State.currentTool === 'select-ellipse' ? 'ellipse' : 'rect';
                    State.selection.active = true;
                    State.selection.isFloating = false;
                    drawSelectionPreview();
                } else {
                    finalizeSelection(); 
                }
            }
        }
        return; 
    }

    if (!State.isDrawing) return;
    State.isDrawing = false;
    
    const ctx = getCurrentContext();

    if (State.currentTool === 'pen' || State.currentTool === 'eraser') {
        if (State.isAntiAlias) ctx.closePath();
        
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
    } 
    else if (['line', 'rect', 'rect-fill', 'circle', 'circle-fill', 'ellipse', 'ellipse-fill', 'crop'].includes(State.currentTool)) {
        setupContextStyle(ctx, false);
        
        if (State.currentTool === 'crop') {
            DOM.previewCtx.clearRect(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
            drawShapePreview();
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
        drawShapePreview();
    }
    
    saveState(); 
}

function setupModalDrag() {
    const modal = document.getElementById('color-adjust-modal');
    const header = document.getElementById('color-adjust-header');
    let isDragging = false;
    let offsetX, offsetY;

    const startDrag = (x, y) => {
        isDragging = true;
        const rect = modal.getBoundingClientRect();
        
        modal.style.transform = 'none'; 
        modal.style.left = rect.left + 'px';
        modal.style.top = rect.top + 'px';
        
        offsetX = x - rect.left;
        offsetY = y - rect.top;
    };

    const doDrag = (x, y) => {
        if (!isDragging) return;
        modal.style.left = (x - offsetX) + 'px';
        modal.style.top = (y - offsetY) + 'px';
    };

    const stopDrag = () => {
        isDragging = false;
    };

    header.addEventListener('mousedown', (e) => {
        startDrag(e.clientX, e.clientY);
    });
    window.addEventListener('mousemove', (e) => {
        doDrag(e.clientX, e.clientY);
    });
    window.addEventListener('mouseup', stopDrag);

    header.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
            startDrag(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: false });
    
    window.addEventListener('touchmove', (e) => {
        if (isDragging && e.touches.length > 0) {
            e.preventDefault(); 
            doDrag(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: false });
    
    window.addEventListener('touchend', stopDrag);
    window.addEventListener('touchcancel', stopDrag);
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

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            if (State.editingShape && State.editingShape.isDrawingFree) {
                State.editingShape.isDrawingFree = false;
                State.editingShape.tempPoint = null;
                drawShapePreview();
            } else if (State.editingShape) {
                finalizeShape();
            }
        }
    });

    setupModalDrag();
}

export function updateShapeProperties() {
    if (State.editingShape) {
        if (State.editingShape.type === 'edit-text') {
            State.editingShape.text = document.getElementById('shape-text-input')?.value || 'テキスト';
            State.editingShape.font = document.getElementById('text-font-select')?.value || 'sans-serif';
            State.editingShape.hasBorder = document.getElementById('text-border-cb')?.checked || false;
            State.editingShape.borderType = document.getElementById('text-border-type')?.value || 'outer';
            State.editingShape.borderColor = document.getElementById('text-border-color')?.value || '#ffffff';
            State.editingShape.borderWidth = parseInt(document.getElementById('text-border-width')?.value || 2);
            State.editingShape.hasShadow = document.getElementById('text-shadow-cb')?.checked || false;
            State.editingShape.shadowColor = document.getElementById('text-shadow-color')?.value || '#000000';
            State.editingShape.shadowBlur = parseInt(document.getElementById('text-shadow-blur')?.value || 5);
        }
        if (State.editingShape.type === 'edit-table') {
            State.editingShape.rows = parseInt(document.getElementById('table-rows').value) || 1;
            State.editingShape.cols = parseInt(document.getElementById('table-cols').value) || 1;
        }
        if (['edit-polygon', 'edit-round-rect'].includes(State.editingShape.type)) {
            State.editingShape.param = parseInt(document.getElementById('shape-param').value) || 5;
        }
        
        State.editingShape.color = State.currentColor;
        State.editingShape.lineWidth = State.currentLineWidth;
        
        const fillCb = document.getElementById('shape-fill-cb');
        if (fillCb) State.editingShape.isFill = fillCb.checked;
        
        const closeCb = document.getElementById('shape-close-cb');
        if (closeCb) State.editingShape.isClosed = closeCb.checked;

        drawShapePreview();
    }
}

window.onLayerSelected = (layerId) => {
    if (State.isFinalizing) return;
    const layer = State.layers.find(l => l.id === layerId);
    if (layer && layer.type === 'vector' && layer.shape) {
        setTool(layer.shape.type);
        State.editingShape = JSON.parse(JSON.stringify(layer.shape));
        State.editingShape.layerId = layer.id;
        
        State.currentColor = layer.shape.color;
        document.getElementById('color-picker').value = layer.shape.color;
        State.currentLineWidth = layer.shape.lineWidth;
        document.getElementById('line-width').value = layer.shape.lineWidth;
        document.getElementById('line-width-display').innerText = layer.shape.lineWidth;

        State.isShapeFill = !!layer.shape.isFill;
        const fillCb = document.getElementById('shape-fill-cb');
        if (fillCb) fillCb.checked = State.isShapeFill;
        
        State.isPolygonClosed = layer.shape.isClosed !== false;
        const closeCb = document.getElementById('shape-close-cb');
        if (closeCb) closeCb.checked = State.isPolygonClosed;

        layer.ctx.clearRect(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
        drawShapePreview();
        
        if (layer.shape.type === 'edit-text') {
            const ti = document.getElementById('shape-text-input');
            if (ti) ti.value = layer.shape.text || '';

            const tf = document.getElementById('text-font-select');
            if (tf) tf.value = layer.shape.font || 'sans-serif';

            const tbc = document.getElementById('text-border-cb');
            if (tbc) tbc.checked = !!layer.shape.hasBorder;
            const tbt = document.getElementById('text-border-type');
            if (tbt) tbt.value = layer.shape.borderType || 'outer';
            const tbcol = document.getElementById('text-border-color');
            if (tbcol) tbcol.value = layer.shape.borderColor || '#ffffff';
            const tbw = document.getElementById('text-border-width');
            if (tbw) tbw.value = layer.shape.borderWidth || 2;
            const tsc = document.getElementById('text-shadow-cb');
            if (tsc) tsc.checked = !!layer.shape.hasShadow;
            const tscol = document.getElementById('text-shadow-color');
            if (tscol) tscol.value = layer.shape.shadowColor || '#000000';
            const tsb = document.getElementById('text-shadow-blur');
            if (tsb) tsb.value = layer.shape.shadowBlur || 5;
            
            const tp = document.getElementById('text-properties');
            if (tp) tp.style.display = 'block';
        } else {
            const tp = document.getElementById('text-properties');
            if (tp) tp.style.display = 'none';
        }

        if (layer.shape.type === 'edit-table') {
            const tr = document.getElementById('table-rows');
            const tc = document.getElementById('table-cols');
            if (tr) tr.value = layer.shape.rows || 3;
            if (tc) tc.value = layer.shape.cols || 3;
        }
        if (['edit-polygon', 'edit-round-rect'].includes(layer.shape.type)) {
            const sp = document.getElementById('shape-param');
            if (sp) sp.value = layer.shape.param || 5;
        }
    }
};

window.toggleShapeFill = (checked) => {
    State.isShapeFill = checked;
    if (typeof window.updateShapeProperties === 'function') window.updateShapeProperties();
};
window.togglePolygonClose = (checked) => {
    State.isPolygonClosed = checked;
    if (typeof window.updateShapeProperties === 'function') window.updateShapeProperties();
};

window.setGridSize = (val) => {
    State.gridSize = Math.max(2, parseInt(val) || 16);
    updateGrid();
};
window.toggleSnapToGrid = () => {
    State.isSnapToGrid = !State.isSnapToGrid;
    document.getElementById('snap-grid-btn').classList.toggle('active', State.isSnapToGrid);
};
window.toggleSnapToObject = () => {
    State.isSnapToObject = !State.isSnapToObject;
    document.getElementById('snap-obj-btn').classList.toggle('active', State.isSnapToObject);
};

let colorAdjustOriginalData = null;
let colorAdjustTargetCtx = null;
let colorAdjustTargetCanvas = null;

window.openColorAdjust = () => {
    const targetLayer = State.layers.find(l => l.id === State.currentLayerId);
    if (!targetLayer) return;

    if (targetLayer.type === 'vector') {
        alert("ベクターレイヤーには色調補正を適用できません。レイヤーパネルの「R」でラスタライズしてください。");
        return;
    }

    if (State.selection.active && !State.selection.isFloating) {
        floatSelection(targetLayer);
        drawSelectionPreview(); 
    }

    if (State.selection.active && State.selection.isFloating && State.selection.canvas) {
        colorAdjustTargetCanvas = State.selection.canvas;
        colorAdjustTargetCtx = State.selection.canvas.getContext('2d');
    } else {
        colorAdjustTargetCanvas = targetLayer.canvas;
        colorAdjustTargetCtx = targetLayer.ctx;
    }

    colorAdjustOriginalData = colorAdjustTargetCtx.getImageData(0, 0, colorAdjustTargetCanvas.width, colorAdjustTargetCanvas.height);

    document.getElementById('adj-brightness').value = 0;
    document.getElementById('adj-contrast').value = 0;
    document.getElementById('adj-hue').value = 0;
    document.getElementById('adj-saturation').value = 0;
    document.getElementById('adj-grayscale').checked = false;
    document.getElementById('adj-invert').checked = false;
    document.getElementById('adj-sepia').checked = false;
    document.getElementById('adj-edge').checked = false;
    document.getElementById('adj-anime').value = 0;
    document.getElementById('adj-mosaic').value = 1;
    
    document.getElementById('bright-val').innerText = '0';
    document.getElementById('contrast-val').innerText = '0';
    document.getElementById('hue-val').innerText = '0';
    document.getElementById('saturation-val').innerText = '0';
    document.getElementById('anime-val').innerText = 'OFF';
    document.getElementById('mosaic-val').innerText = 'OFF';

    document.getElementById('color-adjust-modal').style.display = 'block';
};

window.previewColorAdjust = () => {
    if (!colorAdjustOriginalData) return;
    
    const b = parseInt(document.getElementById('adj-brightness').value);
    const c = parseInt(document.getElementById('adj-contrast').value);
    const h = parseInt(document.getElementById('adj-hue').value);
    const s = parseInt(document.getElementById('adj-saturation').value);
    const gray = document.getElementById('adj-grayscale').checked;
    const inv = document.getElementById('adj-invert').checked;
    const sepia = document.getElementById('adj-sepia').checked;
    const edge = document.getElementById('adj-edge').checked;
    const anime = parseInt(document.getElementById('adj-anime').value);
    const mosaic = parseInt(document.getElementById('adj-mosaic').value);

    document.getElementById('bright-val').innerText = b;
    document.getElementById('contrast-val').innerText = c;
    document.getElementById('hue-val').innerText = h;
    document.getElementById('saturation-val').innerText = s;
    document.getElementById('anime-val').innerText = anime > 0 ? anime + '階調' : 'OFF';
    document.getElementById('mosaic-val').innerText = mosaic > 1 ? mosaic + 'px' : 'OFF';

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = colorAdjustTargetCanvas.width;
    tempCanvas.height = colorAdjustTargetCanvas.height;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.putImageData(colorAdjustOriginalData, 0, 0);

    applyColorAdjustment(tCtx, tempCanvas.width, tempCanvas.height, b, c, h, s, gray, inv, sepia, edge, anime, mosaic);

    colorAdjustTargetCtx.clearRect(0, 0, colorAdjustTargetCanvas.width, colorAdjustTargetCanvas.height);
    colorAdjustTargetCtx.drawImage(tempCanvas, 0, 0);
    
    if (State.selection.active && State.selection.isFloating) {
        drawSelectionPreview();
    }
};

window.executeColorAdjust = () => {
    if (colorAdjustOriginalData && colorAdjustTargetCtx) {
        if (State.selection.active && State.selection.isFloating) {
             drawSelectionPreview();
        }
    }
    saveState();
    window.closeColorAdjust();
};

window.cancelColorAdjust = () => {
    if (colorAdjustOriginalData && colorAdjustTargetCtx) {
        colorAdjustTargetCtx.putImageData(colorAdjustOriginalData, 0, 0);
        if (State.selection.active && State.selection.isFloating) {
            drawSelectionPreview();
        }
    }
    window.closeColorAdjust();
};

window.closeColorAdjust = () => {
    document.getElementById('color-adjust-modal').style.display = 'none';
    colorAdjustOriginalData = null;
    colorAdjustTargetCtx = null;
    colorAdjustTargetCanvas = null;
};

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
window.saveProjectAs = saveProjectAs;
window.loadProject = loadProject;
window.loadProjectSystem = loadProjectSystem;
window.createNewCanvas = createNewCanvas;
window.resizeCanvasPrompt = resizeCanvasPrompt;
window.scaleImagePrompt = scaleImagePrompt;
window.duplicateSelection = duplicateSelection;
window.deleteSelection = deleteSelection;
window.invertSelection = invertSelection;
window.deselect = deselect;
window.finalizeSelection = finalizeSelection;
window.addLayer = addLayer;
window.undo = undo;
window.redo = redo;
window.duplicateCurrentLayer = () => { if (State.currentLayerId) import('./layer_history.js').then(l => l.duplicateLayer(State.currentLayerId)); };
window.mergeVisibleLayers = () => { import('./layer_history.js').then(l => l.mergeVisibleLayers()); };
window.rotateCanvasOrSelection = (angle) => { import('./canvas_io.js').then(c => c.rotateCanvasOrSelection(angle)); };
window.selectSaveFolder = selectSaveFolder;
window.finalizeShape = finalizeShape; 
window.updateShapeProperties = updateShapeProperties;

window.onload = init;