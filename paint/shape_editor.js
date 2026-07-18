import { State, DOM } from './state.js';
import { getCurrentContext, saveState } from './layer_history.js';
import { drawBresenhamLine, drawBresenhamEllipse } from './drawing_tools.js';

export function startShapeEdit(x, y) {
    if (!State.currentLayerId) return;

    // 既存の編集中の図形がある場合、ハンドル操作か、新規開始かを判定
    if (State.editingShape) {
        const handleIdx = hitTestHandle(x, y);
        if (handleIdx !== -1) {
            State.isDraggingHandle = true;
            State.hoveredHandle = handleIdx;
            return;
        } else {
            finalizeShape();
        }
    }

    // 新規図形の生成
    State.editingShape = {
        type: State.currentTool,
        x1: x,
        y1: y,
        x2: x,
        y2: y,
        color: State.currentColor,
        lineWidth: State.currentLineWidth
    };
    State.isDraggingHandle = false;
    State.hoveredHandle = 1; // 初期状態では終点（右下）を操作対象とする
    
    // 描画プレビューを更新
    drawShapePreview();
}

export function moveShapeEdit(x, y) {
    if (!State.editingShape) return;

    if (State.isDraggingHandle) {
        // ハンドル操作によるサイズ・位置の変更
        updateHandlePosition(x, y);
    } else {
        // ドラッグによる新規作成時のサイズ決定
        State.editingShape.x2 = x;
        State.editingShape.y2 = y;
    }
    drawShapePreview();
}

export function endShapeEdit(x, y) {
    if (!State.editingShape) return;
    State.isDraggingHandle = false;

    // 極端に小さい図形はキャンセル扱い
    const s = State.editingShape;
    if (Math.abs(s.x2 - s.x1) < 2 && Math.abs(s.y2 - s.y1) < 2) {
        State.editingShape = null;
        DOM.previewCtx.clearRect(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
    } else {
        drawShapePreview();
    }
}

function hitTestHandle(x, y) {
    const handles = getHandles(State.editingShape);
    for (let i = 0; i < handles.length; i++) {
        const h = handles[i];
        if (Math.abs(x - h.x) <= 6 && Math.abs(y - h.y) <= 6) {
            return i;
        }
    }
    return -1;
}

function getHandles(shape) {
    if (!shape) return [];
    const { x1, y1, x2, y2, type } = shape;
    // 直線の場合は両端、それ以外（矩形・楕円）は四隅をハンドルとする
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
        // 矩形・楕円の四隅ハンドル操作
        if (i === 0) { s.x1 = x; s.y1 = y; }
        else if (i === 1) { s.x2 = x; s.y1 = y; }
        else if (i === 2) { s.x2 = x; s.y2 = y; }
        else if (i === 3) { s.x1 = x; s.y2 = y; }
    }
}

export function drawShapePreview() {
    DOM.previewCtx.clearRect(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
    if (!State.editingShape) return;

    const s = State.editingShape;
    const oldColor = State.currentColor;
    const oldWidth = State.currentLineWidth;
    State.currentColor = s.color;
    State.currentLineWidth = s.lineWidth;

    renderShapeToContext(DOM.previewCtx, s, State.isAntiAlias);

    State.currentColor = oldColor;
    State.currentLineWidth = oldWidth;

    // ハンドルの描画（■）
    const handles = getHandles(s);
    DOM.previewCtx.fillStyle = '#00ff00';
    DOM.previewCtx.strokeStyle = '#000000';
    DOM.previewCtx.lineWidth = 1;
    handles.forEach((h) => {
        DOM.previewCtx.fillRect(h.x - 4, h.y - 4, 8, 8);
        DOM.previewCtx.strokeRect(h.x - 4, h.y - 4, 8, 8);
    });
}

export function finalizeShape() {
    if (!State.editingShape) return;
    const ctx = getCurrentContext();
    if (!ctx) return;

    const s = State.editingShape;
    const oldColor = State.currentColor;
    const oldWidth = State.currentLineWidth;
    State.currentColor = s.color;
    State.currentLineWidth = s.lineWidth;

    renderShapeToContext(ctx, s, State.isAntiAlias);

    State.currentColor = oldColor;
    State.currentLineWidth = oldWidth;

    State.editingShape = null;
    DOM.previewCtx.clearRect(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
    saveState();
}

function renderShapeToContext(ctx, s, useAA) {
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
    }
}