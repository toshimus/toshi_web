import { State, DOM } from './state.js';
import { getCurrentContext, saveState, addLayer } from './layer_history.js';
import { drawBresenhamLine, drawBresenhamEllipse, drawBresenhamCircle } from './drawing_tools.js';

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
    } else if (s.type === 'edit-circle-cr') {
        const r = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
        pts.push({x: s.x1, y: s.y1});
        pts.push({x: s.x1 - r, y: s.y1}, {x: s.x1 + r, y: s.y1}, {x: s.x1, y: s.y1 - r}, {x: s.x1, y: s.y1 + r});
    }
    return pts;
}

export function startShapeEdit(x, y) {
    if (State.editingShape && State.editingShape.isDrawingFree) {
        const pts = State.editingShape.points;
        const firstPt = pts[0];
        const dist = Math.hypot(firstPt.x - x, firstPt.y - y);
        if (pts.length >= 2 && dist < 15 / State.currentZoom) {
            State.editingShape.isDrawingFree = false;
            State.editingShape.tempPoint = null;
        } else {
            pts.push({x, y});
        }
        drawShapePreview();
        return;
    }

    if (State.editingShape) {
        const handleIdx = hitTestHandle(x, y);
        if (handleIdx !== -1) {
            State.isDraggingHandle = true;
            State.hoveredHandle = handleIdx;
            return;
        } else if (hitTestBody(x, y)) {
            State.isDraggingBody = true;
            const baseX = State.editingShape.points ? State.editingShape.points[0].x : State.editingShape.x1;
            const baseY = State.editingShape.points ? State.editingShape.points[0].y : State.editingShape.y1;
            State.shapeDragOffsetX = x - baseX;
            State.shapeDragOffsetY = y - baseY;
            return;
        } else {
            finalizeShape();
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
        hasBorder: document.getElementById('text-border-cb')?.checked || false,
        borderType: document.getElementById('text-border-type')?.value || 'outer',
        borderColor: document.getElementById('text-border-color')?.value || '#ffffff',
        borderWidth: parseInt(document.getElementById('text-border-width')?.value || 2),
        hasShadow: document.getElementById('text-shadow-cb')?.checked || false,
        shadowColor: document.getElementById('text-shadow-color')?.value || '#000000',
        shadowBlur: parseInt(document.getElementById('text-shadow-blur')?.value || 5),
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

    if (State.editingShape.isDrawingFree) {
        State.editingShape.tempPoint = {x, y};
        drawShapePreview();
        return;
    }

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
    } else {
        State.editingShape.x2 = x;
        State.editingShape.y2 = y;
    }
    drawShapePreview();
}

export function endShapeEdit(x, y) {
    if (!State.editingShape) return;

    if (State.editingShape.isDrawingFree) {
        if (State.isDraggingHandle) {
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
    if (!s.points && s.type !== 'edit-text' && s.x1 === s.x2 && s.y1 === s.y2) {
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

function pointToLineDistance(px, py, x1, y1, x2, y2) {
    const l2 = (x1 - x2) ** 2 + (y1 - y2) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

function hitTestBody(x, y) {
    const s = State.editingShape;
    if (!s) return false;

    const threshold = Math.max(4, 8 / State.currentZoom); 

    if (s.type === 'edit-circle-cr') {
        const r = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
        const dist = Math.hypot(x - s.x1, y - s.y1);
        if (s.isFill) return dist <= r;
        return dist >= r - threshold && dist <= r + threshold;
    }

    if (s.type === 'edit-text') {
        let minX = Math.min(s.x1, s.x2);
        let minY = Math.min(s.y1, s.y2);
        const ctx = DOM.previewCtx;
        let h = Math.abs(s.y2 - s.y1);
        if (h < 10) h = 10;
        ctx.font = `${h}px sans-serif`;
        const metrics = ctx.measureText(s.text || "テキスト");
        return (x >= minX && x <= minX + metrics.width && y >= minY && y <= minY + h);
    }

    if (s.type === 'edit-line') {
        return pointToLineDistance(x, y, s.x1, s.y1, s.x2, s.y2) <= threshold;
    }

    if (s.type === 'edit-free-polygon') {
        const pts = s.points;
        if (!pts || pts.length === 0) return false;
        
        if (s.isFill) {
            const minX = Math.min(...pts.map(p => p.x));
            const maxX = Math.max(...pts.map(p => p.x));
            const minY = Math.min(...pts.map(p => p.y));
            const maxY = Math.max(...pts.map(p => p.y));
            return (x >= minX && x <= maxX && y >= minY && y <= maxY);
        } else {
            for (let i = 0; i < pts.length - 1; i++) {
                if (pointToLineDistance(x, y, pts[i].x, pts[i].y, pts[i+1].x, pts[i+1].y) <= threshold) return true;
            }
            if (s.isClosed && pts.length > 2) {
                if (pointToLineDistance(x, y, pts[pts.length-1].x, pts[pts.length-1].y, pts[0].x, pts[0].y) <= threshold) return true;
            }
            return false;
        }
    }

    const minX = Math.min(s.x1, s.x2);
    const maxX = Math.max(s.x1, s.x2);
    const minY = Math.min(s.y1, s.y2);
    const maxY = Math.max(s.y1, s.y2);

    if (s.isFill) {
        if (s.type.includes('ellipse')) {
            const cx = (s.x1 + s.x2) / 2;
            const cy = (s.y1 + s.y2) / 2;
            const rx = Math.abs(s.x2 - s.x1) / 2;
            const ry = Math.abs(s.y2 - s.y1) / 2;
            if (rx === 0 || ry === 0) return false;
            return ((x - cx)**2 / rx**2 + (y - cy)**2 / ry**2) <= 1;
        }
        return (x >= minX && x <= maxX && y >= minY && y <= maxY);
    } else {
        if (s.type.includes('ellipse')) {
            const cx = (s.x1 + s.x2) / 2;
            const cy = (s.y1 + s.y2) / 2;
            const rx = Math.abs(s.x2 - s.x1) / 2;
            const ry = Math.abs(s.y2 - s.y1) / 2;
            if (rx === 0 || ry === 0) return false;
            const val = ((x - cx)**2 / rx**2 + (y - cy)**2 / ry**2);
            return val >= 0.8 && val <= 1.2;
        } else {
            const d1 = pointToLineDistance(x, y, minX, minY, maxX, minY);
            const d2 = pointToLineDistance(x, y, maxX, minY, maxX, maxY);
            const d3 = pointToLineDistance(x, y, maxX, maxY, minX, maxY);
            const d4 = pointToLineDistance(x, y, minX, maxY, minX, minY);
            return (d1 <= threshold || d2 <= threshold || d3 <= threshold || d4 <= threshold);
        }
    }
}

function getHandles(shape) {
    if (!shape) return [];
    const { x1, y1, x2, y2, type } = shape;
    
    if (type === 'edit-free-polygon') {
        return shape.points.map(p => ({x: p.x, y: p.y}));
    } else if (type === 'edit-line' || type === 'edit-circle-cr') {
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
    } else if (s.type === 'edit-line' || s.type === 'edit-circle-cr') {
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

        if (!s.isDrawingFree) {
            const handles = getHandles(s);
            const z = State.currentZoom;
            const size = Math.max(3, Math.floor(10 / z) | 1); 
            const offset = Math.floor(size / 2);

            handles.forEach((h) => {
                const cx = Math.round(h.x);
                const cy = Math.round(h.y);
                
                DOM.previewCtx.fillStyle = '#000000';
                DOM.previewCtx.fillRect(cx - offset - 1, cy - offset - 1, size + 2, size + 2);
                DOM.previewCtx.fillStyle = '#00ff00';
                DOM.previewCtx.fillRect(cx - offset, cy - offset, size, size);
            });
        }
    }

    if (State.snapIndicator) {
        const z = State.currentZoom;
        const ctx = DOM.previewCtx;
        const {x, y} = State.snapIndicator;
        
        const cx = Math.round(x);
        const cy = Math.round(y);
        const r = Math.max(3, Math.floor(8 / z));
        
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(cx - r, cy, r * 2 + 1, 1);
        ctx.fillRect(cx, cy - r, 1, r * 2 + 1);
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
        if (s.type === 'edit-circle-cr') name = '中心円';
        
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
    } else if (s.type === 'edit-circle-cr') {
        let r = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
        if (!useAA) {
            drawBresenhamCircle(ctx, s.x1, s.y1, r, s.isFill, false);
        } else {
            ctx.beginPath();
            ctx.strokeStyle = s.color;
            ctx.fillStyle = s.color;
            ctx.lineWidth = s.lineWidth;
            ctx.arc(s.x1, s.y1, r, 0, Math.PI * 2);
            if (s.isFill) ctx.fill(); else ctx.stroke();
        }
    } else if (s.type === 'edit-text') {
        ctx.textBaseline = 'top';
        let minX = Math.min(s.x1, s.x2);
        let minY = Math.min(s.y1, s.y2);
        let h = Math.abs(s.y2 - s.y1);
        if (h < 10) h = 10;

        const fontFamily = s.font || 'sans-serif';
        ctx.font = `${h}px ${fontFamily}`;

        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;

        if (s.hasShadow) {
            ctx.shadowColor = s.shadowColor || '#000000';
            ctx.shadowBlur = s.shadowBlur || 5;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        } else {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }

        if (s.hasBorder) {
            ctx.strokeStyle = s.borderColor || '#ffffff';
            if (s.borderType === 'outer') {
                ctx.lineWidth = (s.borderWidth || 2) * 2;
                ctx.strokeText(s.text || "テキスト", minX, minY);
                
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                
                ctx.fillStyle = s.color;
                ctx.fillText(s.text || "テキスト", minX, minY);
            } else {
                ctx.fillStyle = s.color;
                ctx.fillText(s.text || "テキスト", minX, minY);
                
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                
                ctx.lineWidth = s.borderWidth || 2;
                ctx.strokeText(s.text || "テキスト", minX, minY);
            }
        } else {
            ctx.fillStyle = s.color;
            ctx.fillText(s.text || "テキスト", minX, minY);
        }
        
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

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