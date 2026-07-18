import { State, DOM } from './state.js';
import { getCurrentContext, saveState, addLayer } from './layer_history.js';
import { drawBresenhamLine, drawBresenhamEllipse } from './drawing_tools.js';

export function applySnap(x, y) {
    State.snapIndicator = null;
    let snappedX = x;
    let snappedY = y;
    let minDistance = 15 / State.currentZoom; 
    let hasSnapped = false;

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
    if (s.type === 'edit-free-polygon') {
        if (s.points && s.points.length > 0) {
            s.points.forEach(p => pts.push({x: p.x, y: p.y}));
            const cx = s.points.reduce((sum, p) => sum + p.x, 0) / s.points.length;
            const cy = s.points.reduce((sum, p) => sum + p.y, 0) / s.points.length;
            pts.push({x: cx, y: cy});
            
            for (let i = 0; i < s.points.length; i++) {
                const p1 = s.points[i];
                const p2 = s.points[(i + 1) % s.points.length];
                pts.push({x: (p1.x + p2.x)/2, y: (p1.y + p2.y)/2});
            }
        }
        return pts;
    }

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
    } else if (['edit-rect', 'edit-table', 'edit-text', 'edit-polygon', 'edit-round-rect'].includes(s.type)) {
        pts.push({x: minX, y: minY}, {x: maxX, y: minY}, {x: maxX, y: maxY}, {x: minX, y: maxY});
        pts.push({x: cx, y: minY}, {x: cx, y: maxY}, {x: minX, y: cy}, {x: maxX, y: cy});
        pts.push({x: cx, y: cy});
    } else if (s.type === 'edit-ellipse') {
        const rx = Math.abs(s.x2 - s.x1) / 2;
        const ry = Math.abs(s.y2 - s.y1) / 2;
        pts.push({x: cx, y: cy}); 
        pts.push({x: minX, y: cy}, {x: maxX, y: cy}, {x: cx, y: minY}, {x: cx, y: maxY});

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
            if (State.editingShape.isDrawingFree) {
                // ドラッグ中は追従するプレビュー線を一時的に消す
                State.editingShape.tempPoint = null;
            }
            return;
        } else if (hitTestBody(x, y)) {
            State.isDraggingBody = true;
            const baseX = State.editingShape.points ? State.editingShape.points[0].x : State.editingShape.x1;
            const baseY = State.editingShape.points ? State.editingShape.points[0].y : State.editingShape.y1;
            State.shapeDragOffsetX = x - baseX;
            State.shapeDragOffsetY = y - baseY;
            return;
        } else {
            if (State.editingShape.isDrawingFree) {
                // 何もヒットしなければ新しい頂点を追加
                State.editingShape.points.push({x, y});
                drawShapePreview();
                return;
            } else {
                finalizeShape();
            }
        }
    }

    if (State.currentTool === 'edit-free-polygon') {
        State.editingShape = {
            type: State.currentTool,
            points: [{x, y}],
            tempPoint: {x, y},
            isDrawingFree: true,
            color: State.currentColor,
            lineWidth: State.currentLineWidth,
            isFill: State.isShapeFill,
            isClosed: State.isPolygonClosed,
            layerId: null 
        };
        State.isDraggingHandle = false;
        State.isDraggingBody = false;
        State.hoveredHandle = -1;
        drawShapePreview();
        return;
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
        param: parseInt(document.getElementById('shape-param')?.value || 5),
        isFill: State.isShapeFill,
        isClosed: State.isPolygonClosed,
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
        const dx = x - State.shapeDragOffsetX - (State.editingShape.points ? State.editingShape.points[0].x : State.editingShape.x1);
        const dy = y - State.shapeDragOffsetY - (State.editingShape.points ? State.editingShape.points[0].y : State.editingShape.y1);
        
        if (State.editingShape.points) {
            State.editingShape.points.forEach(p => { p.x += dx; p.y += dy; });
        } else {
            State.editingShape.x1 += dx;
            State.editingShape.x2 += dx;
            State.editingShape.y1 += dy;
            State.editingShape.y2 += dy;
        }
        
        State.shapeDragOffsetX = x - (State.editingShape.points ? State.editingShape.points[0].x : State.editingShape.x1);
        State.shapeDragOffsetY = y - (State.editingShape.points ? State.editingShape.points[0].y : State.editingShape.y1);
    } else if (!State.editingShape.isDrawingFree) {
        State.editingShape.x2 = x;
        State.editingShape.y2 = y;
    }
    drawShapePreview();
}

export function endShapeEdit(x, y) {
    if (!State.editingShape) return;

    if (State.editingShape.isDrawingFree) {
        if (State.isDraggingHandle) {
            // 始点をクリック（ドラッグせず離した）場合、パスを閉じて描画完了
            if (State.hoveredHandle === 0 && !State.hasMoved && State.editingShape.points.length >= 3) {
                State.editingShape.isDrawingFree = false;
                State.editingShape.tempPoint = null;
                State.editingShape.isClosed = true;
                const closeCb = document.getElementById('shape-close-cb');
                if (closeCb) closeCb.checked = true;
            }
            State.isDraggingHandle = false;
        }
        drawShapePreview();
        return; 
    }

    State.isDraggingHandle = false;
    State.isDraggingBody = false;

    const s = State.editingShape;
    if (!s.points && s.type !== 'edit-text' && Math.abs(s.x2 - s.x1) < 2 && Math.abs(s.y2 - s.y1) < 2) {
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

    let minX, maxX, minY, maxY;

    if (s.points) {
        minX = Math.min(...s.points.map(p => p.x));
        maxX = Math.max(...s.points.map(p => p.x));
        minY = Math.min(...s.points.map(p => p.y));
        maxY = Math.max(...s.points.map(p => p.y));
    } else {
        minX = Math.min(s.x1, s.x2);
        maxX = Math.max(s.x1, s.x2);
        minY = Math.min(s.y1, s.y2);
        maxY = Math.max(s.y1, s.y2);

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
    }

    return (x >= minX && x <= maxX && y >= minY && y <= maxY);
}

function getHandles(shape) {
    if (!shape) return [];
    const { x1, y1, x2, y2, type } = shape;
    
    if (type === 'edit-free-polygon') {
        return shape.points.map(p => ({x: p.x, y: p.y}));
    } else if (type === 'edit-line') {
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
    
    if (s.type === 'edit-free-polygon') {
        if (s.points[i]) {
            s.points[i].x = x;
            s.points[i].y = y;
        }
    } else if (s.type === 'edit-line') {
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

        // 作成中・編集中を問わず常にハンドル（■）を表示
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

    if (State.editingShape.isDrawingFree) {
        State.editingShape.isDrawingFree = false;
        State.editingShape.tempPoint = null;
        if (State.editingShape.points.length < 3 && State.editingShape.isFill) {
            State.editingShape = null;
            drawShapePreview();
            return;
        }
    }

    State.isFinalizing = true;
    const s = State.editingShape;
    
    let layer = s.layerId ? State.layers.find(l => l.id === s.layerId) : null;
    
    if (!layer) {
        let name = '図形';
        if (s.type === 'edit-text') name = 'テキスト';
        if (s.type === 'edit-table') name = '表';
        if (s.type === 'edit-polygon') name = '正多角形';
        if (s.type === 'edit-free-polygon') name = '多角形';
        if (s.type === 'edit-round-rect') name = '角丸';
        if (s.type === 'edit-rect') name = '四角';
        if (s.type === 'edit-ellipse') name = '円';
        
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
    } else if (s.type === 'edit-free-polygon') {
        if (!s.points || s.points.length === 0) return;
        ctx.beginPath();
        ctx.strokeStyle = s.color;
        ctx.fillStyle = s.color;
        ctx.lineWidth = s.lineWidth;
        
        const pts = s.points;
        if (!useAA && !s.isFill) {
            for (let i = 0; i < pts.length - 1; i++) {
                drawBresenhamLine(ctx, pts[i].x, pts[i].y, pts[i+1].x, pts[i+1].y, false);
            }
            if (!s.isDrawingFree && pts.length > 2 && s.isClosed) {
                drawBresenhamLine(ctx, pts[pts.length-1].x, pts[pts.length-1].y, pts[0].x, pts[0].y, false);
            } else if (s.isDrawingFree && s.tempPoint && !State.isDraggingHandle) {
                drawBresenhamLine(ctx, pts[pts.length-1].x, pts[pts.length-1].y, s.tempPoint.x, s.tempPoint.y, false);
            }
        } else {
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
                ctx.lineTo(pts[i].x, pts[i].y);
            }
            if (s.isDrawingFree && s.tempPoint && !State.isDraggingHandle) {
                ctx.lineTo(s.tempPoint.x, s.tempPoint.y);
            } else if (!s.isDrawingFree && pts.length > 2 && s.isClosed) {
                ctx.closePath();
            }
            if (!s.isDrawingFree && s.isFill && s.isClosed) ctx.fill(); else ctx.stroke();
        }
    } else if (s.type === 'edit-rect') {
        let rx = Math.min(s.x1, s.x2);
        let ry = Math.min(s.y1, s.y2);
        let rw = Math.max(s.x1, s.x2) - rx + 1;
        let rh = Math.max(s.y1, s.y2) - ry + 1;
        let maxX = Math.max(s.x1, s.x2);
        let maxY = Math.max(s.y1, s.y2);
        
        if (!useAA) {
            if (s.isFill) {
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
            if (s.isFill) {
                ctx.fillRect(rx, ry, rw, rh);
            } else {
                ctx.strokeRect(rx, ry, rw, rh);
            }
        }
    } else if (s.type === 'edit-round-rect') {
        let rx = Math.min(s.x1, s.x2);
        let ry = Math.min(s.y1, s.y2);
        let rw = Math.max(s.x1, s.x2) - rx;
        let rh = Math.max(s.y1, s.y2) - ry;
        let radius = s.param || 10;
        radius = Math.min(radius, rw / 2, rh / 2); 
        
        ctx.beginPath();
        ctx.strokeStyle = s.color;
        ctx.fillStyle = s.color;
        ctx.lineWidth = s.lineWidth;
        
        if (ctx.roundRect) {
            ctx.roundRect(rx, ry, rw, rh, radius);
        } else {
            ctx.moveTo(rx + radius, ry);
            ctx.lineTo(rx + rw - radius, ry);
            ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
            ctx.lineTo(rx + rw, ry + rh - radius);
            ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
            ctx.lineTo(rx + radius, ry + rh);
            ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
            ctx.lineTo(rx, ry + radius);
            ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
        }
        if (s.isFill) ctx.fill(); else ctx.stroke();
    } else if (s.type === 'edit-polygon') {
        let cx = (s.x1 + s.x2) / 2;
        let cy = (s.y1 + s.y2) / 2;
        let rx = Math.abs(s.x2 - s.x1) / 2;
        let ry = Math.abs(s.y2 - s.y1) / 2;
        let sides = Math.max(3, s.param || 5);
        
        ctx.beginPath();
        ctx.strokeStyle = s.color;
        ctx.fillStyle = s.color;
        ctx.lineWidth = s.lineWidth;
        
        let pts = [];
        for (let i = 0; i < sides; i++) {
            let angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
            pts.push({x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle)});
        }
        
        if (!useAA && !s.isFill) {
            for(let i=0; i<sides; i++){
                drawBresenhamLine(ctx, pts[i].x, pts[i].y, pts[(i+1)%sides].x, pts[(i+1)%sides].y, false);
            }
        } else {
            for (let i = 0; i < sides; i++) {
                if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
                else ctx.lineTo(pts[i].x, pts[i].y);
            }
            ctx.closePath();
            if (s.isFill) ctx.fill(); else ctx.stroke();
        }
    } else if (s.type === 'edit-ellipse') {
        let rx = Math.abs(s.x2 - s.x1) / 2;
        let ry = Math.abs(s.y2 - s.y1) / 2;
        let cx = Math.min(s.x1, s.x2) + rx;
        let cy = Math.min(s.y1, s.y2) + ry;
        
        if (!useAA) {
            drawBresenhamEllipse(ctx, cx, cy, rx, ry, s.isFill, false);
        } else {
            ctx.beginPath();
            ctx.strokeStyle = s.color;
            ctx.fillStyle = s.color;
            ctx.lineWidth = s.lineWidth;
            ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
            if (s.isFill) ctx.fill(); else ctx.stroke();
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