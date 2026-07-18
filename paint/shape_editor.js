import { State, DOM } from './state.js';
import { getCurrentContext, saveState, addLayer } from './layer_history.js';
import { drawBresenhamLine, drawBresenhamEllipse } from './drawing_tools.js';

export function applySnap(x, y) {
    State.snapIndicator = null;
    let snappedX = x;
    let snappedY = y;
    let minDistance = 15 / State.currentZoom; 
    let hasSnapped = false;

    // 1. オブジェクトスナップ（スマートガイド）
    if (State.isSnapToObject) {
        const points = getSnapPoints();
        for (const pt of points) {
            const dist = Math.hypot(pt.x - x, pt.y - y);
            if (dist < minDistance) {
                minDistance = dist;
                snappedX = pt.x;
                snappedY = pt.y;
                hasSnapped = true;
            }
        }
    }

    // 2. グリッドスナップ
    if (!hasSnapped && State.isSnapToGrid && State.isGridVisible) {
        const gx = Math.round(x / State.gridSize) * State.gridSize;
        const gy = Math.round(y / State.gridSize) * State.gridSize;
        const dist = Math.hypot(gx - x, gy - y);
        if (dist < minDistance || true) { 
            snappedX = gx;
            snappedY = gy;
            hasSnapped = true;
        }
    }

    if (hasSnapped) {
        State.snapIndicator = { x: snappedX, y: snappedY };
    }

    return { x: snappedX, y: snappedY };
}

function getSnapPoints() {
    const points = [];
    State.layers.forEach(layer => {
        if (layer.type === 'vector' && layer.shape && layer.id !== State.editingShape?.layerId) {
            points.push(...getShapeSnapPoints(layer.shape));
        }
    });
    return points;
}

function getShapeSnapPoints(s) {
    const pts = [];
    const minX = Math.min(s.x1, s.x2);
    const maxX = Math.max(s.x1, s.x2);
    const minY = Math.min(s.y1, s.y2);
    const maxY = Math.max(s.y1, s.y2);
    const cx = (s.x1 + s.x2) / 2;
    const cy = (s.y1 + s.y2) / 2;

    if (s.type === 'edit-line') {
        pts.push({x: s.x1, y: s.y1}); 
        pts.push({x: s.x2, y: s.y2});
        pts.push({x: cx, y: cy}); 
    } else if (s.type === 'edit-rect' || s.type === 'edit-rect-fill' || s.type === 'edit-table' || s.type === 'edit-text') {
        pts.push({x: minX, y: minY}, {x: maxX, y: minY}, {x: maxX, y: maxY}, {x: minX, y: maxY});
        pts.push({x: cx, y: minY}, {x: cx, y: maxY}, {x: minX, y: cy}, {x: maxX, y: cy});
        pts.push({x: cx, y: cy});
    } else if (s.type === 'edit-ellipse' || s.type === 'edit-ellipse-fill') {
        const rx = Math.abs(s.x2 - s.x1) / 2;
        const ry = Math.abs(s.y2 - s.y1) / 2;
        pts.push({x: cx, y: cy}); 
        pts.push({x: minX, y: cy}, {x: maxX, y: cy}, {x: cx, y: minY}, {x: cx, y: maxY});

        // 円周上の15度単位のポイント
        for (let i = 0; i < 360; i += 15) {
            const rad = i * Math.PI / 180;
            pts.push({
                x: cx + rx * Math.cos(rad),
                y: cy + ry * Math.sin(rad)
            });
        }
    }
    return pts;
}

export function startShapeEdit(x, y) {
    if (State.editingShape) {
        const handleIdx = hitTestHandle(x, y);
        if (handleIdx !== -1) {
            State.isDraggingHandle = true;
            State.hoveredHandle = handleIdx;
            return;
        } else if (hitTestBody(x, y)) {
            State.isDraggingBody = true;
            State.shapeDragOffsetX = x - State.editingShape.x1;
            State.shapeDragOffsetY = y - State.editingShape.y1;
            return;
        } else {
            finalizeShape();
        }
    }

    State.editingShape = {
        type: State.currentTool,
        x1: x,
        y1: y,
        x2: x,
        y2: y,
        color: State.currentColor,
        lineWidth: State.currentLineWidth,
        text: document.getElementById('shape-text-input')?.value || 'テキスト',
        rows: parseInt(document.getElementById('table-rows')?.value || 3),
        cols: parseInt(document.getElementById('table-cols')?.value || 3),
        layerId: null 
    };
    State.isDraggingHandle = false;
    State.isDraggingBody = false;
    State.hoveredHandle = 1; 
    
    drawShapePreview();
}

export function moveShapeEdit(x, y) {
    if (!State.editingShape) return;

    if (State.isDraggingHandle) {
        updateHandlePosition(x, y);
    } else if (State.isDraggingBody) {
        const dx = x - State.shapeDragOffsetX - State.editingShape.x1;
        const dy = y - State.shapeDragOffsetY - State.editingShape.y1;
        State.editingShape.x1 += dx;
        State.editingShape.x2 += dx;
        State.editingShape.y1 += dy;
        State.editingShape.y2 += dy;
        
        State.shapeDragOffsetX = x - State.editingShape.x1;
        State.shapeDragOffsetY = y - State.editingShape.y1;
    } else {
        State.editingShape.x2 = x;
        State.editingShape.y2 = y;
    }
    drawShapePreview();
}

export function endShapeEdit(x, y) {
    if (!State.editingShape) return;
    State.isDraggingHandle = false;
    State.isDraggingBody = false;

    const s = State.editingShape;
    if (s.type !== 'edit-text' && Math.abs(s.x2 - s.x1) < 2 && Math.abs(s.y2 - s.y1) < 2) {
        State.editingShape = null;
        DOM.previewCtx.clearRect(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
    } else {
        drawShapePreview();
    }
}

function hitTestHandle(x, y) {
    const handles = getHandles(State.editingShape);
    const threshold = Math.max(2, 6 / State.currentZoom);
    for (let i = 0; i < handles.length; i++) {
        const h = handles[i];
        if (Math.abs(x - h.x) <= threshold && Math.abs(y - h.y) <= threshold) {
            return i;
        }
    }
    return -1;
}

function hitTestBody(x, y) {
    const s = State.editingShape;
    if (!s) return false;

    let minX = Math.min(s.x1, s.x2);
    let maxX = Math.max(s.x1, s.x2);
    let minY = Math.min(s.y1, s.y2);
    let maxY = Math.max(s.y1, s.y2);

    if (s.type === 'edit-text') {
        const ctx = DOM.previewCtx;
        let h = Math.abs(s.y2 - s.y1);
        if (h < 10) h = 10;
        ctx.font = `${h}px sans-serif`;
        const metrics = ctx.measureText(s.text || "テキスト");
        maxX = minX + metrics.width;
        maxY = minY + h;
    } else if (s.type === 'edit-line') {
        minX -= 10; maxX += 10;
        minY -= 10; maxY += 10;
    }

    return (x >= minX && x <= maxX && y >= minY && y <= maxY);
}

function getHandles(shape) {
    if (!shape) return [];
    const { x1, y1, x2, y2, type } = shape;
    if (type === 'edit-line') {
        return [ {x: x1, y: y1}, {x: x2, y: y2} ];
    } else {
        return [
            {x: x1, y: y1}, 
            {x: x2, y: y1}, 
            {x: x2, y: y2}, 
            {x: x1, y: y2}  
        ];
    }
}

function updateHandlePosition(x, y) {
    const s = State.editingShape;
    const i = State.hoveredHandle;
    
    if (s.type === 'edit-line') {
        if (i === 0) { s.x1 = x; s.y1 = y; }
        else if (i === 1) { s.x2 = x; s.y2 = y; }
    } else {
        if (i === 0) { s.x1 = x; s.y1 = y; }
        else if (i === 1) { s.x2 = x; s.y1 = y; }
        else if (i === 2) { s.x2 = x; s.y2 = y; }
        else if (i === 3) { s.x1 = x; s.y2 = y; }
    }
}

export function drawShapePreview() {
    DOM.previewCtx.clearRect(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
    
    if (State.editingShape) {
        const s = State.editingShape;
        const oldColor = State.currentColor;
        const oldWidth = State.currentLineWidth;
        State.currentColor = s.color;
        State.currentLineWidth = s.lineWidth;

        renderShapeToContext(DOM.previewCtx, s, State.isAntiAlias);

        State.currentColor = oldColor;
        State.currentLineWidth = oldWidth;

        const handles = getHandles(s);
        const z = State.currentZoom;
        const size = Math.max(1, 8 / z);
        const offset = size / 2;

        DOM.previewCtx.fillStyle = '#00ff00';
        DOM.previewCtx.strokeStyle = '#000000';
        DOM.previewCtx.lineWidth = Math.max(0.1, 1 / z);
        handles.forEach((h) => {
            DOM.previewCtx.fillRect(h.x - offset, h.y - offset, size, size);
            DOM.previewCtx.strokeRect(h.x - offset, h.y - offset, size, size);
        });
    }

    // スナップインジケーターの描画
    if (State.snapIndicator) {
        const z = State.currentZoom;
        const ctx = DOM.previewCtx;
        const {x, y} = State.snapIndicator;
        
        ctx.beginPath();
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = Math.max(0.5, 1 / z);
        const r = Math.max(3, 10 / z);
        
        ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r);
        ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI*2);
        ctx.stroke();
    }
}

export function finalizeShape(keepSelected = false) {
    if (!State.editingShape || State.isFinalizing) return;
    State.isFinalizing = true;

    const s = State.editingShape;
    
    let layer = s.layerId ? State.layers.find(l => l.id === s.layerId) : null;
    
    if (!layer) {
        let name = '図形';
        if (s.type === 'edit-text') name = 'テキスト';
        if (s.type === 'edit-table') name = '表';
        
        layer = addLayer(name);
        layer.type = 'vector';
        s.layerId = layer.id;
    }
    
    layer.shape = JSON.parse(JSON.stringify(s));
    layer.ctx.clearRect(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
    
    const oldColor = State.currentColor;
    const oldWidth = State.currentLineWidth;
    State.currentColor = s.color;
    State.currentLineWidth = s.lineWidth;
    renderShapeToContext(layer.ctx, s, State.isAntiAlias);
    State.currentColor = oldColor;
    State.currentLineWidth = oldWidth;

    if (!keepSelected) {
        State.editingShape = null;
        State.snapIndicator = null;
        DOM.previewCtx.clearRect(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
    }
    saveState();

    State.isFinalizing = false;
}

export function renderShapeToContext(ctx, s, useAA) {
    if (s.type === 'edit-line') {
        if (!useAA) {
            drawBresenhamLine(ctx, s.x1, s.y1, s.x2, s.y2, false);
        } else {
            ctx.beginPath();
            ctx.strokeStyle = s.color;
            ctx.lineWidth = s.lineWidth;
            ctx.moveTo(s.x1, s.y1);
            ctx.lineTo(s.x2, s.y2);
            ctx.stroke();
        }
    } else if (s.type === 'edit-rect' || s.type === 'edit-rect-fill') {
        let rx = Math.min(s.x1, s.x2);
        let ry = Math.min(s.y1, s.y2);
        let rw = Math.max(s.x1, s.x2) - rx + 1;
        let rh = Math.max(s.y1, s.y2) - ry + 1;
        let maxX = Math.max(s.x1, s.x2);
        let maxY = Math.max(s.y1, s.y2);
        
        if (!useAA) {
            if (s.type === 'edit-rect-fill') {
                ctx.fillStyle = s.color;
                ctx.fillRect(rx, ry, rw, rh);
            } else {
                drawBresenhamLine(ctx, rx, ry, maxX, ry, false);
                drawBresenhamLine(ctx, maxX, ry, maxX, maxY, false);
                drawBresenhamLine(ctx, maxX, maxY, rx, maxY, false);
                drawBresenhamLine(ctx, rx, maxY, rx, ry, false);
            }
        } else {
            ctx.beginPath();
            ctx.strokeStyle = s.color;
            ctx.fillStyle = s.color;
            ctx.lineWidth = s.lineWidth;
            if (s.type === 'edit-rect-fill') {
                ctx.fillRect(rx, ry, rw, rh);
            } else {
                ctx.strokeRect(rx, ry, rw, rh);
            }
        }
    } else if (s.type === 'edit-ellipse' || s.type === 'edit-ellipse-fill') {
        let rx = Math.abs(s.x2 - s.x1) / 2;
        let ry = Math.abs(s.y2 - s.y1) / 2;
        let cx = Math.min(s.x1, s.x2) + rx;
        let cy = Math.min(s.y1, s.y2) + ry;
        const isFill = s.type === 'edit-ellipse-fill';
        
        if (!useAA) {
            drawBresenhamEllipse(ctx, cx, cy, rx, ry, isFill, false);
        } else {
            ctx.beginPath();
            ctx.strokeStyle = s.color;
            ctx.fillStyle = s.color;
            ctx.lineWidth = s.lineWidth;
            ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
            if (isFill) ctx.fill(); else ctx.stroke();
        }
    } else if (s.type === 'edit-text') {
        ctx.textBaseline = 'top';
        let minX = Math.min(s.x1, s.x2);
        let minY = Math.min(s.y1, s.y2);
        let h = Math.abs(s.y2 - s.y1);
        if (h < 10) h = 10;
        
        ctx.font = `${h}px sans-serif`;
        ctx.fillStyle = s.color;
        ctx.fillText(s.text || "テキスト", minX, minY);
    } else if (s.type === 'edit-table') {
        let rx = Math.min(s.x1, s.x2);
        let ry = Math.min(s.y1, s.y2);
        let rw = Math.abs(s.x2 - s.x1);
        let rh = Math.abs(s.y2 - s.y1);
        
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.lineWidth;
        ctx.strokeRect(rx, ry, rw, rh);
        
        let rows = Math.max(1, s.rows || 3);
        let cols = Math.max(1, s.cols || 3);
        ctx.beginPath();
        for(let r = 1; r < rows; r++) {
            let y = ry + (rh / rows) * r;
            ctx.moveTo(rx, y); ctx.lineTo(rx + rw, y);
        }
        for(let c = 1; c < cols; c++) {
            let x = rx + (rw / cols) * c;
            ctx.moveTo(x, ry); ctx.lineTo(x, ry + rh);
        }
        ctx.stroke();
    }
}