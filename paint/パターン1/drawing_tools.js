// --- ブレゼンハム アルゴリズム (ピクセルパーフェクト描画用) ---
function drawBresenhamLine(ctx, x0, y0, x1, y1, isEraser) {
    x0 = Math.floor(x0); y0 = Math.floor(y0);
    x1 = Math.floor(x1); y1 = Math.floor(y1);
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let sx = (x0 < x1) ? 1 : -1;
    let sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;

    if (isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,1)';
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = currentColor;
    }

    let offset = Math.floor(currentLineWidth / 2);
    let drawSize = currentLineWidth;

    while (true) {
        ctx.fillRect(x0 - offset, y0 - offset, drawSize, drawSize);
        if (x0 === x1 && y0 === y1) break;
        let e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
    }
}

function drawBresenhamCircle(ctx, xc, yc, r, fill, isEraser) {
    xc = Math.floor(xc); yc = Math.floor(yc); r = Math.floor(r);
    if (isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,1)';
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = currentColor;
    }

    let offset = Math.floor(currentLineWidth / 2);
    let drawSize = currentLineWidth;

    const getCirclePoints = (cx, cy, r) => {
        let points = [];
        let x = 0;
        let y = r;
        let p = 3 - 2 * r;
        const addSymmetric = (px, py) => {
            points.push([cx + px, cy + py], [cx - px, cy + py],
                        [cx + px, cy - py], [cx - px, cy - py],
                        [cx + py, cy + px], [cx - py, cy + px],
                        [cx + py, cy - px], [cx - py, cy - px]);
        };
        while (y >= x) {
            addSymmetric(x, y);
            x++;
            if (p > 0) { y--; p += 4 * (x - y) + 10; }
            else { p += 4 * x + 6; }
        }
        return points;
    };

    if (fill) {
        for (let y = yc - r; y <= yc + r; y++) {
            let minX = xc + r, maxX = xc - r;
            for (let x = xc - r; x <= xc + r; x++) {
                if ((x - xc) ** 2 + (y - yc) ** 2 <= r ** 2) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                }
            }
            ctx.fillRect(minX - offset, y - offset, (maxX - minX + 1) * drawSize, drawSize);
        }
    } else {
        const points = getCirclePoints(xc, yc, r);
        points.forEach(pt => {
            ctx.fillRect(pt[0] - offset, pt[1] - offset, drawSize, drawSize);
        });
    }
}

function drawBresenhamEllipse(ctx, xc, yc, rx, ry, fill, isEraser) {
    xc = Math.floor(xc); yc = Math.floor(yc);
    rx = Math.floor(Math.max(1, Math.abs(rx))); ry = Math.floor(Math.max(1, Math.abs(ry)));
    
    if (isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,1)';
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = currentColor;
    }

    let offset = Math.floor(currentLineWidth / 2);
    let drawSize = currentLineWidth;

    if (fill) {
        for (let y = -ry; y <= ry; y++) {
            let maxX = Math.floor(rx * Math.sqrt(1 - (y * y) / (ry * ry)));
            ctx.fillRect(xc - maxX - offset, yc + y - offset, (maxX * 2 + 1) * drawSize, drawSize);
        }
    } else {
        let x = 0;
        let y = ry;
        let a2 = rx * rx;
        let b2 = ry * ry;
        let d = Math.round(b2 - a2 * ry + 0.25 * a2);

        const plot = (px, py) => {
            ctx.fillRect(xc + px - offset, yc + py - offset, drawSize, drawSize);
            ctx.fillRect(xc - px - offset, yc + py - offset, drawSize, drawSize);
            ctx.fillRect(xc + px - offset, yc - py - offset, drawSize, drawSize);
            ctx.fillRect(xc - px - offset, yc - py - offset, drawSize, drawSize);
        };

        while (a2 * y > b2 * x) {
            plot(x, y);
            if (d < 0) {
                d += b2 * (2 * x + 3);
            } else {
                d += b2 * (2 * x + 3) + a2 * (-2 * y + 2);
                y--;
            }
            x++;
        }
        let d2 = Math.round(b2 * (x + 0.5)**2 + a2 * (y - 1)**2 - a2 * b2);
        while (y >= 0) {
            plot(x, y);
            if (d2 > 0) {
                d2 += a2 * (-2 * y + 3);
            } else {
                d2 += b2 * (2 * x + 2) + a2 * (-2 * y + 3);
                x++;
            }
            y--;
        }
    }
}

// --- バケツツール (表示レイヤー対象・色差許容値対応) ---
function hexToRgba(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
        255
    ] : [0, 0, 0, 255];
}

function executeFloodFill(startX, startY) {
    const ctx = getCurrentContext();
    if (!ctx) return;

    startX = Math.floor(startX);
    startY = Math.floor(startY);

    if (startX < 0 || startY < 0 || startX >= CANVAS_WIDTH || startY >= CANVAS_HEIGHT) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = CANVAS_WIDTH;
    tempCanvas.height = CANVAS_HEIGHT;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    
    layers.forEach(layer => {
        if (layer.visible) {
            tempCtx.drawImage(layer.canvas, 0, 0);
        }
    });

    const compImageData = tempCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const compData32 = new Uint32Array(compImageData.data.buffer);
    const compData8 = new Uint8ClampedArray(compImageData.data.buffer);
    
    const startIdx = startY * CANVAS_WIDTH + startX;
    const startColor32 = compData32[startIdx];
    
    const sr = compData8[startIdx * 4];
    const sg = compData8[startIdx * 4 + 1];
    const sb = compData8[startIdx * 4 + 2];
    const sa = compData8[startIdx * 4 + 3];
    
    const fillRgba = hexToRgba(currentColor);
    const fillColor32 = (fillRgba[3] << 24) | (fillRgba[2] << 16) | (fillRgba[1] << 8) | fillRgba[0];

    const activeImageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const activeData32 = new Uint32Array(activeImageData.data.buffer);

    if (startColor32 === fillColor32 && activeData32[startIdx] === fillColor32) return; 

    const tolerance = isAntiAlias ? 120 : 0;

    function matchStartColor(idx) {
        if (tolerance === 0) {
            return compData32[idx] === startColor32;
        }
        const r = compData8[idx * 4];
        const g = compData8[idx * 4 + 1];
        const b = compData8[idx * 4 + 2];
        const a = compData8[idx * 4 + 3];
        const diff = Math.abs(r - sr) + Math.abs(g - sg) + Math.abs(b - sb) + Math.abs(a - sa);
        return diff <= tolerance;
    }

    const stack = [startIdx];
    const visited = new Uint8Array(CANVAS_WIDTH * CANVAS_HEIGHT);

    while (stack.length > 0) {
        let idx = stack.pop();
        if (visited[idx]) continue;

        let y = Math.floor(idx / CANVAS_WIDTH);
        let x = idx % CANVAS_WIDTH;

        let left = x;
        while (left > 0 && !visited[y * CANVAS_WIDTH + (left - 1)] && matchStartColor(y * CANVAS_WIDTH + (left - 1))) {
            left--;
        }

        let right = x;
        while (right < CANVAS_WIDTH - 1 && !visited[y * CANVAS_WIDTH + (right + 1)] && matchStartColor(y * CANVAS_WIDTH + (right + 1))) {
            right++;
        }

        for (let i = left; i <= right; i++) {
            let currentIdx = y * CANVAS_WIDTH + i;
            activeData32[currentIdx] = fillColor32; 
            visited[currentIdx] = 1;

            if (y > 0) {
                let upIdx = (y - 1) * CANVAS_WIDTH + i;
                if (!visited[upIdx] && matchStartColor(upIdx)) {
                    stack.push(upIdx);
                }
            }

            if (y < CANVAS_HEIGHT - 1) {
                let downIdx = (y + 1) * CANVAS_WIDTH + i;
                if (!visited[downIdx] && matchStartColor(downIdx)) {
                    stack.push(downIdx);
                }
            }
        }
    }

    ctx.putImageData(activeImageData, 0, 0);
}