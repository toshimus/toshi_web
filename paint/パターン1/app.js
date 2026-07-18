// --- 初期化処理 ---
function init() {
    previewCtx.imageSmoothingEnabled = isAntiAlias;
    previewCanvas.style.imageRendering = isAntiAlias ? 'auto' : 'pixelated';
    
    const paletteGrid = document.getElementById('famicom-palette');
    if (paletteGrid) {
        paletteGrid.innerHTML = '';
        famicomColors.forEach(color => {
            const div = document.createElement('div');
            div.className = 'palette-color';
            div.style.backgroundColor = color;
            div.onclick = () => setPaletteColor(color);
            paletteGrid.appendChild(div);
        });
    }

    addLayer('レイヤー 1');
    if (typeof saveState === 'function') saveState(); 
    setupPreviewCanvasEvents();
    updateStatusBar();
}

function updateStatusBar() {
    const sizeDisplay = document.getElementById('status-size');
    if (sizeDisplay) {
        sizeDisplay.innerText = `${CANVAS_WIDTH} x ${CANVAS_HEIGHT} px`;
    }
}

// --- ツール・システム制御 ---
function updateBrushPreview(clientX, clientY) {
    if (['pen', 'eraser', 'dot'].includes(currentTool)) {
        const size = currentLineWidth * currentZoom;
        brushPreview.style.width = size + 'px';
        brushPreview.style.height = size + 'px';
        brushPreview.style.left = clientX + 'px';
        brushPreview.style.top = clientY + 'px';
        brushPreview.style.display = 'block';

        if (currentTool !== 'pen' || isAntiAlias) {
            brushPreview.style.borderRadius = '50%';
        } else {
            brushPreview.style.borderRadius = '0';
        }
    } else {
        brushPreview.style.display = 'none';
    }
}

function setTool(toolName) {
    if (currentTool === 'select' && toolName !== 'select') {
        finalizeSelection();
    }

    currentTool = toolName;
    document.querySelectorAll('#toolbar .button-grid button, #toolbar .icon-grid button, #tool-pan').forEach(btn => {
        if (btn.id && btn.id.startsWith('tool-')) {
            btn.classList.remove('active');
        }
    });
    const targetBtn = document.getElementById(`tool-${toolName}`);
    if (targetBtn) targetBtn.classList.add('active');
    
    isPanning = false;
    selectionPanel.style.display = (toolName === 'select') ? 'flex' : 'none';
    
    if (!['pen', 'eraser', 'dot'].includes(currentTool)) {
        brushPreview.style.display = 'none';
    }
}

function setAntiAlias(enable) {
    isAntiAlias = enable;
    document.getElementById('aa-off').classList.toggle('active', !enable);
    document.getElementById('aa-on').classList.toggle('active', enable);
    
    layers.forEach(layer => {
        layer.ctx.imageSmoothingEnabled = enable;
        layer.canvas.style.imageRendering = enable ? 'auto' : 'pixelated';
    });
    previewCtx.imageSmoothingEnabled = enable;
    previewCanvas.style.imageRendering = enable ? 'auto' : 'pixelated';
    if(selection.active) drawSelectionPreview();
}

function toggleGrid() {
    isGridVisible = !isGridVisible;
    document.getElementById('grid-toggle').classList.toggle('active', isGridVisible);
    updateGrid();
}

function updateGrid() {
    const overlay = document.getElementById('grid-overlay');
    if (isGridVisible && currentZoom >= 4) {
        overlay.style.display = 'block';
        overlay.style.backgroundImage = `
            linear-gradient(to right, rgba(128,128,128,0.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(128,128,128,0.3) 1px, transparent 1px)
        `;
        overlay.style.backgroundSize = `${currentZoom}px ${currentZoom}px`;
    } else {
        overlay.style.display = 'none';
    }
}

function setColor(color) {
    currentColor = color;
    document.getElementById('color-picker').value = color;
}

function setPaletteColor(hex) {
    setColor(hex);
}

function setLineWidth(width) {
    currentLineWidth = parseInt(width, 10);
    document.getElementById('line-width-display').innerText = width;
}

function setZoom(level, cx, cy) {
    const oldZoom = currentZoom;
    currentZoom = level;
    
    if (cx === undefined || cy === undefined) {
        const wsRect = workspace.getBoundingClientRect();
        cx = wsRect.left + wsRect.width / 2;
        cy = wsRect.top + wsRect.height / 2;
    }

    const cwRectOld = canvasWrapper.getBoundingClientRect();
    const offsetX = cx - cwRectOld.left;
    const offsetY = cy - cwRectOld.top;
    
    canvasWrapper.style.width = (CANVAS_WIDTH * currentZoom) + 'px';
    canvasWrapper.style.height = (CANVAS_HEIGHT * currentZoom) + 'px';
    
    document.querySelectorAll('#zoom-controls button').forEach(btn => {
        btn.classList.remove('active');
    });
    const zBtn = document.getElementById(`zoom-${level}`);
    if(zBtn) zBtn.classList.add('active');

    updateGrid();

    const newOffsetX = offsetX * (currentZoom / oldZoom);
    const newOffsetY = offsetY * (currentZoom / oldZoom);
    const cwRectNew = canvasWrapper.getBoundingClientRect();
    
    workspace.scrollLeft += (cwRectNew.left + newOffsetX) - cx;
    workspace.scrollTop += (cwRectNew.top + newOffsetY) - cy;
}

function zoomStep(dir, cx, cy) {
    const levels = [1, 2, 4, 8, 16, 32];
    let idx = levels.indexOf(currentZoom);
    if (idx === -1) idx = 0;
    idx += dir;
    if (idx < 0) idx = 0;
    if (idx >= levels.length) idx = levels.length - 1;
    if (levels[idx] !== currentZoom) {
        setZoom(levels[idx], cx, cy);
    }
}

// --- パンニング（移動）制御 ---
function startPanning(e) {
    isPanning = true;
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
    panStartX = clientX;
    panStartY = clientY;
    panScrollX = workspace.scrollLeft;
    panScrollY = workspace.scrollTop;
}

function doPan(e) {
    if (!isPanning) return;
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
    const dx = clientX - panStartX;
    const dy = clientY - panStartY;
    workspace.scrollLeft = panScrollX - dx;
    workspace.scrollTop = panScrollY - dy;
}

function stopPanning() {
    isPanning = false;
}

// --- 描画イベントハンドリング ---
function getMousePos(e) {
    const rect = previewCanvas.getBoundingClientRect();
    let clientX = e.clientX;
    let clientY = e.clientY;

    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
    }

    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
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
    canvasWrapper.appendChild(overlay);

    window.addEventListener('mouseout', (e) => {
        brushPreview.style.display = 'none';
    });

    overlay.addEventListener('wheel', (e) => {
        e.preventDefault(); 
        if (e.deltaY < 0) zoomStep(1, e.clientX, e.clientY);
        else zoomStep(-1, e.clientX, e.clientY);
    }, { passive: false });

    overlay.addEventListener('mousedown', (e) => {
        if (currentTool === 'pan') {
            startPanning(e);
        } else {
            startDrawing(e);
        }
    });
    window.addEventListener('mousemove', (e) => {
        updateBrushPreview(e.clientX, e.clientY); 
        if (isPanning && currentTool === 'pan') {
            doPan(e);
        } else if (isDrawing || isDraggingSelection) {
            draw(e);
        }
    });
    window.addEventListener('mouseup', (e) => {
        if (isPanning) stopPanning();
        if (isDrawing || isDraggingSelection) stopDrawing(e);
    });

    overlay.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length > 0) {
            updateBrushPreview(e.touches[0].clientX, e.touches[0].clientY);
        }
        if (e.touches && e.touches.length >= 2) {
            e.preventDefault();
            startPanning(e);
            initialPinchDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            return;
        }
        
        if (currentTool === 'pan') {
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

            if (initialPinchDistance) {
                const ratio = currentDistance / initialPinchDistance;
                if (ratio > 1.2) {
                    zoomStep(1, pinchCenterX, pinchCenterY);
                    initialPinchDistance = currentDistance;
                } else if (ratio < 0.8) {
                    zoomStep(-1, pinchCenterX, pinchCenterY);
                    initialPinchDistance = currentDistance;
                }
            }
            if (isPanning) doPan(e);
            return;
        }

        if (isPanning) {
            e.preventDefault();
            doPan(e);
        } else if (isDrawing || isDraggingSelection) {
            e.preventDefault(); 
            draw(e);
        }
    }, { passive: false });
    
    window.addEventListener('touchend', (e) => {
        brushPreview.style.display = 'none'; 
        initialPinchDistance = null;
        if (isPanning) stopPanning();
        if (isDrawing || isDraggingSelection) stopDrawing(e);
    });
    window.addEventListener('touchcancel', (e) => {
        brushPreview.style.display = 'none'; 
        initialPinchDistance = null;
        if (isPanning) stopPanning();
        if (isDrawing || isDraggingSelection) stopDrawing(e);
    });
}

function setupContextStyle(ctx, isEraser = false) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = currentLineWidth;
    
    if (isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = currentColor;
        ctx.fillStyle = currentColor;
    }
}

function startDrawing(e) {
    if (!currentLayerId) return;
    const layer = layers.find(l => l.id === currentLayerId);
    if (!layer || !layer.visible) {
        alert("現在選択されているレイヤーは非表示か存在しません。");
        return;
    }

    const pos = getMousePos(e);
    
    if (currentTool === 'select') {
        if (selection.active &&
            pos.x >= selection.x && pos.x <= selection.x + selection.w &&
            pos.y >= selection.y && pos.y <= selection.y + selection.h) {
            
            isDraggingSelection = true;
            if (!selection.isFloating) {
                selection.canvas = document.createElement('canvas');
                selection.canvas.width = selection.w;
                selection.canvas.height = selection.h;
                selection.canvas.getContext('2d').drawImage(layer.canvas, selection.x, selection.y, selection.w, selection.h, 0, 0, selection.w, selection.h);
                layer.ctx.clearRect(selection.x, selection.y, selection.w, selection.h);
                selection.isFloating = true;
            }
            dragOffsetX = pos.x - selection.x;
            dragOffsetY = pos.y - selection.y;
        } else {
            finalizeSelection(); 
            startX = pos.x;
            startY = pos.y;
            isDrawing = true; 
        }
        return;
    }
    
    startX = pos.x;
    startY = pos.y;
    hasMoved = false; 

    if (currentTool === 'dot') {
        const ctx = getCurrentContext();
        setupContextStyle(ctx, false);
        if (!isAntiAlias) {
            drawBresenhamLine(ctx, startX, startY, startX, startY, false);
        } else {
            ctx.beginPath();
            ctx.arc(startX, startY, currentLineWidth / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        if (typeof saveState === 'function') saveState();
        return; 
    }

    isDrawing = true;

    if (currentTool === 'bucket') {
        isDrawing = false;
        executeFloodFill(Math.floor(startX), Math.floor(startY));
        if (typeof saveState === 'function') saveState();
        return;
    }

    if (currentTool === 'pen' || currentTool === 'eraser') {
        const ctx = getCurrentContext();
        setupContextStyle(ctx, currentTool === 'eraser');
        
        if (isAntiAlias) {
            ctx.beginPath();
            ctx.moveTo(startX, startY);
        }
    }
}

function draw(e) {
    const pos = getMousePos(e);
    hasMoved = true;

    if (currentTool === 'select') {
        if (isDraggingSelection) {
            selection.x = pos.x - dragOffsetX;
            selection.y = pos.y - dragOffsetY;
            if (!isAntiAlias) {
                selection.x = Math.round(selection.x);
                selection.y = Math.round(selection.y);
            }
            drawSelectionPreview();
        } else if (isDrawing) {
            previewCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            previewCtx.beginPath();
            previewCtx.setLineDash([5, 5]);
            previewCtx.strokeStyle = '#00ffff'; 
            previewCtx.lineWidth = 1;
            const w = pos.x - startX;
            const h = pos.y - startY;
            previewCtx.strokeRect(startX, startY, w, h);
            previewCtx.setLineDash([]);
        }
        return;
    }

    if (!isDrawing) return;

    if (currentTool === 'pen' || currentTool === 'eraser') {
        const ctx = getCurrentContext();
        if (!isAntiAlias) {
            drawBresenhamLine(ctx, startX, startY, pos.x, pos.y, currentTool === 'eraser');
            startX = pos.x;
            startY = pos.y;
        } else {
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        }
    } else if (['line', 'rect', 'rect-fill', 'circle', 'circle-fill', 'ellipse', 'ellipse-fill', 'crop'].includes(currentTool)) {
        previewCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        setupContextStyle(previewCtx, false); 
        
        if (currentTool === 'crop') {
            previewCtx.beginPath();
            previewCtx.setLineDash([5, 5]);
            previewCtx.strokeStyle = '#ff0000';
            previewCtx.lineWidth = 1;
            const width = pos.x - startX;
            const height = pos.y - startY;
            previewCtx.strokeRect(startX, startY, width, height);
            previewCtx.setLineDash([]); 
        } else if (currentTool === 'line') {
            if (!isAntiAlias) {
                drawBresenhamLine(previewCtx, startX, startY, pos.x, pos.y, false);
            } else {
                previewCtx.beginPath();
                previewCtx.moveTo(startX, startY);
                previewCtx.lineTo(pos.x, pos.y);
                previewCtx.stroke();
            }
        } else if (currentTool === 'rect' || currentTool === 'rect-fill') {
            if (!isAntiAlias) {
                if (currentTool === 'rect-fill') {
                    let rx = Math.floor(Math.min(startX, pos.x));
                    let ry = Math.floor(Math.min(startY, pos.y));
                    let rw = Math.floor(Math.max(startX, pos.x)) - rx + 1;
                    let rh = Math.floor(Math.max(startY, pos.y)) - ry + 1;
                    previewCtx.fillRect(rx, ry, rw, rh);
                } else {
                    drawBresenhamLine(previewCtx, startX, startY, pos.x, startY, false);
                    drawBresenhamLine(previewCtx, pos.x, startY, pos.x, pos.y, false);
                    drawBresenhamLine(previewCtx, pos.x, pos.y, startX, pos.y, false);
                    drawBresenhamLine(previewCtx, startX, pos.y, startX, startY, false);
                }
            } else {
                let rx = startX, ry = startY, rw = pos.x - startX, rh = pos.y - startY;
                previewCtx.beginPath();
                if (currentTool === 'rect-fill') {
                    previewCtx.fillRect(rx, ry, rw, rh);
                } else {
                    previewCtx.strokeRect(rx, ry, rw, rh);
                }
            }
        } else if (currentTool === 'circle' || currentTool === 'circle-fill') {
            const radius = Math.sqrt(Math.pow(pos.x - startX, 2) + Math.pow(pos.y - startY, 2));
            const isFill = (currentTool === 'circle-fill');
            if (!isAntiAlias) {
                drawBresenhamCircle(previewCtx, startX, startY, radius, isFill, false);
            } else {
                previewCtx.beginPath();
                previewCtx.arc(startX, startY, radius, 0, Math.PI * 2);
                if (isFill) previewCtx.fill(); else previewCtx.stroke();
            }
        } else if (currentTool === 'ellipse' || currentTool === 'ellipse-fill') {
            let rx = Math.abs(pos.x - startX) / 2;
            let ry = Math.abs(pos.y - startY) / 2;
            let cx = Math.min(startX, pos.x) + rx;
            let cy = Math.min(startY, pos.y) + ry;
            const isFill = (currentTool === 'ellipse-fill');
            
            if (!isAntiAlias) {
                drawBresenhamEllipse(previewCtx, cx, cy, rx, ry, isFill, false);
            } else {
                previewCtx.beginPath();
                previewCtx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
                if (isFill) previewCtx.fill(); else previewCtx.stroke();
            }
        }
    }
}

function stopDrawing(e) {
    if (currentTool === 'select') {
        if (isDraggingSelection) {
            isDraggingSelection = false;
            drawSelectionPreview();
        } else if (isDrawing) {
            isDrawing = false;
            const pos = getMousePos(e);
            const rx = Math.min(startX, pos.x);
            const ry = Math.min(startY, pos.y);
            const rw = Math.abs(pos.x - startX);
            const rh = Math.abs(pos.y - startY);
            
            if (rw > 2 && rh > 2) {
                selection.x = !isAntiAlias ? Math.round(rx) : rx;
                selection.y = !isAntiAlias ? Math.round(ry) : ry;
                selection.w = !isAntiAlias ? Math.round(rw) : rw;
                selection.h = !isAntiAlias ? Math.round(rh) : rh;
                selection.active = true;
                selection.isFloating = false;
                drawSelectionPreview();
            } else {
                selection.active = false;
                previewCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            }
        }
        return; 
    }

    if (!isDrawing) return;
    isDrawing = false;
    
    const ctx = getCurrentContext();

    if (currentTool === 'pen' || currentTool === 'eraser') {
        if (isAntiAlias) {
            ctx.closePath();
        }
        
        if (!hasMoved) {
            if (!isAntiAlias) {
                drawBresenhamLine(ctx, startX, startY, startX, startY, currentTool === 'eraser');
            } else {
                ctx.beginPath();
                ctx.arc(startX, startY, currentLineWidth / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        if (currentTool === 'eraser') ctx.globalCompositeOperation = 'source-over';
    } else if (['line', 'rect', 'rect-fill', 'circle', 'circle-fill', 'ellipse', 'ellipse-fill', 'crop'].includes(currentTool)) {
        setupContextStyle(ctx, false);
        const pos = getMousePos(e);
        
        if (currentTool === 'crop') {
            previewCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            const rectX = Math.min(startX, pos.x);
            const rectY = Math.min(startY, pos.y);
            const rectW = Math.abs(pos.x - startX);
            const rectH = Math.abs(pos.y - startY);
            
            if (rectW > 5 && rectH > 5) {
                finalizeSelection();
                executeResize(rectW, rectH, rectX, rectY);
            }
            if (typeof saveState === 'function') saveState();
            return;
        }

        if (currentTool === 'line') {
            if (!isAntiAlias) {
                drawBresenhamLine(ctx, startX, startY, pos.x, pos.y, false);
            } else {
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
            }
        } else if (currentTool === 'rect' || currentTool === 'rect-fill') {
            if (!isAntiAlias) {
                if (currentTool === 'rect-fill') {
                    let rx = Math.floor(Math.min(startX, pos.x));
                    let ry = Math.floor(Math.min(startY, pos.y));
                    let rw = Math.floor(Math.max(startX, pos.x)) - rx + 1;
                    let rh = Math.floor(Math.max(startY, pos.y)) - ry + 1;
                    ctx.fillRect(rx, ry, rw, rh);
                } else {
                    drawBresenhamLine(ctx, startX, startY, pos.x, startY, false);
                    drawBresenhamLine(ctx, pos.x, startY, pos.x, pos.y, false);
                    drawBresenhamLine(ctx, pos.x, pos.y, startX, pos.y, false);
                    drawBresenhamLine(ctx, startX, pos.y, startX, startY, false);
                }
            } else {
                let rx = startX, ry = startY, rw = pos.x - startX, rh = pos.y - startY;
                ctx.beginPath();
                if (currentTool === 'rect-fill') {
                    ctx.fillRect(rx, ry, rw, rh);
                } else {
                    ctx.strokeRect(rx, ry, rw, rh);
                }
            }
        } else if (currentTool === 'circle' || currentTool === 'circle-fill') {
            const radius = Math.sqrt(Math.pow(pos.x - startX, 2) + Math.pow(pos.y - startY, 2));
            const isFill = (currentTool === 'circle-fill');
            if (!isAntiAlias) {
                drawBresenhamCircle(ctx, startX, startY, radius, isFill, false);
            } else {
                ctx.beginPath();
                ctx.arc(startX, startY, radius, 0, Math.PI * 2);
                if (isFill) ctx.fill(); else ctx.stroke();
            }
        } else if (currentTool === 'ellipse' || currentTool === 'ellipse-fill') {
            let rx = Math.abs(pos.x - startX) / 2;
            let ry = Math.abs(pos.y - startY) / 2;
            let cx = Math.min(startX, pos.x) + rx;
            let cy = Math.min(startY, pos.y) + ry;
            const isFill = (currentTool === 'ellipse-fill');
            
            if (!isAntiAlias) {
                drawBresenhamEllipse(ctx, cx, cy, rx, ry, isFill, false);
            } else {
                ctx.beginPath();
                ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
                if (isFill) ctx.fill(); else ctx.stroke();
            }
        }
        previewCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    
    if (typeof saveState === 'function') saveState();
}

window.onload = init;