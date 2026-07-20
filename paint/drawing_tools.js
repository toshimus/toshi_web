import { State, DOM } from './state.js';
import { getCurrentContext } from './layer_history.js';

function isSelected(x, y) {
    if (!State.selection.active) return true;
    if (!State.selectionMask) return true;
    if (x < 0 || x >= State.CANVAS_WIDTH || y < 0 || y >= State.CANVAS_HEIGHT) return false;
    return State.selectionMask[y * State.CANVAS_WIDTH + x] === 1;
}

export function drawBresenhamLine(ctx, x0, y0, x1, y1, isEraser) {
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
        ctx.fillStyle = State.currentColor;
    }

    let offset = Math.floor(State.currentLineWidth / 2);
    let drawSize = State.currentLineWidth;

    while (true) {
        if (isSelected(x0, y0)) {
            ctx.fillRect(x0 - offset, y0 - offset, drawSize, drawSize);
        }
        if (x0 === x1 && y0 === y1) break;
        let e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
    }
}

export function drawBresenhamCircle(ctx, xc, yc, r, fill, isEraser) {
    xc = Math.floor(xc); yc = Math.floor(yc); r = Math.floor(r);
    if (isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,1)';
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = State.currentColor;
    }

    let offset = Math.floor(State.currentLineWidth / 2);
    let drawSize = State.currentLineWidth;

    if (fill) {
        let lines = {};
        let x = 0;
        let y = r;
        let p = 3 - 2 * r;
        const addSymmetric = (px, py) => {
            const updateLine = (yy, xx) => {
                if (!lines[yy]) lines[yy] = [xx, xx];
                else {
                    lines[yy][0] = Math.min(lines[yy][0], xx);
                    lines[yy][1] = Math.max(lines[yy][1], xx);
                }
            };
            updateLine(yc + py, xc - px); updateLine(yc + py, xc + px);
            updateLine(yc - py, xc - px); updateLine(yc - py, xc + px);
            updateLine(yc + px, xc - py); updateLine(yc + px, xc + py);
            updateLine(yc - px, xc - py); updateLine(yc - px, xc + py);
        };
        while (y >= x) {
            addSymmetric(x, y);
            x++;
            if (p > 0) { y--; p += 4 * (x - y) + 10; }
            else { p += 4 * x + 6; }
        }
        for (let yy in lines) {
            let y_val = parseInt(yy);
            let [minX, maxX] = lines[yy];
            for (let px = minX; px <= maxX; px++) {
                if (isSelected(px, y_val)) {
                    ctx.fillRect(px - offset, y_val - offset, drawSize, drawSize);
                }
            }
        }
    } else {
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

        const points = getCirclePoints(xc, yc, r);
        points.forEach(pt => {
            if (isSelected(pt[0], pt[1])) {
                ctx.fillRect(pt[0] - offset, pt[1] - offset, drawSize, drawSize);
            }
        });
    }
}

export function drawBresenhamEllipse(ctx, xc, yc, rx, ry, fill, isEraser) {
    xc = Math.floor(xc); yc = Math.floor(yc);
    rx = Math.floor(Math.max(1, Math.abs(rx))); ry = Math.floor(Math.max(1, Math.abs(ry)));
    
    if (isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,1)';
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = State.currentColor;
    }

    let offset = Math.floor(State.currentLineWidth / 2);
    let drawSize = State.currentLineWidth;

    let x = 0;
    let y = ry;
    let a2 = rx * rx;
    let b2 = ry * ry;
    let d = Math.round(b2 - a2 * ry + 0.25 * a2);

    if (fill) {
        let lines = {};
        const plot = (px, py) => {
            const updateLine = (yy, xx) => {
                if (!lines[yy]) lines[yy] = [xx, xx];
                else {
                    lines[yy][0] = Math.min(lines[yy][0], xx);
                    lines[yy][1] = Math.max(lines[yy][1], xx);
                }
            };
            updateLine(yc + py, xc - px); updateLine(yc + py, xc + px);
            updateLine(yc - py, xc - px); updateLine(yc - py, xc + px);
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

        for (let yy in lines) {
            let y_val = parseInt(yy);
            let [minX, maxX] = lines[yy];
            for (let px = minX; px <= maxX; px++) {
                if (isSelected(px, y_val)) {
                    ctx.fillRect(px - offset, y_val - offset, drawSize, drawSize);
                }
            }
        }
    } else {
        const plot = (px, py) => {
            if (isSelected(xc + px, yc + py)) ctx.fillRect(xc + px - offset, yc + py - offset, drawSize, drawSize);
            if (isSelected(xc - px, yc + py)) ctx.fillRect(xc - px - offset, yc + py - offset, drawSize, drawSize);
            if (isSelected(xc + px, yc - py)) ctx.fillRect(xc + px - offset, yc - py - offset, drawSize, drawSize);
            if (isSelected(xc - px, yc - py)) ctx.fillRect(xc - px - offset, yc - py - offset, drawSize, drawSize);
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

export function hexToRgba(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
        255
    ] : [0, 0, 0, 255];
}

export function executeFloodFill(startX, startY) {
    const ctx = getCurrentContext();
    if (!ctx) return;

    startX = Math.floor(startX);
    startY = Math.floor(startY);

    if (startX < 0 || startY < 0 || startX >= State.CANVAS_WIDTH || startY >= State.CANVAS_HEIGHT) return;

    if (!isSelected(startX, startY)) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = State.CANVAS_WIDTH;
    tempCanvas.height = State.CANVAS_HEIGHT;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    
    State.layers.forEach(layer => {
        if (layer.visible) {
            tempCtx.drawImage(layer.canvas, 0, 0);
        }
    });

    const compImageData = tempCtx.getImageData(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
    const compData32 = new Uint32Array(compImageData.data.buffer);
    const compData8 = new Uint8ClampedArray(compImageData.data.buffer);
    
    const startIdx = startY * State.CANVAS_WIDTH + startX;
    const startColor32 = compData32[startIdx];
    
    const sr = compData8[startIdx * 4];
    const sg = compData8[startIdx * 4 + 1];
    const sb = compData8[startIdx * 4 + 2];
    const sa = compData8[startIdx * 4 + 3];
    
    const fillRgba = hexToRgba(State.currentColor);
    const fillColor32 = (fillRgba[3] << 24) | (fillRgba[2] << 16) | (fillRgba[1] << 8) | fillRgba[0];

    const activeImageData = ctx.getImageData(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
    const activeData32 = new Uint32Array(activeImageData.data.buffer);

    if (startColor32 === fillColor32 && activeData32[startIdx] === fillColor32) return; 

    const tolerance = State.fillTolerance * 4; 

    function matchStartColor(idx) {
        if (State.selection.active && State.selectionMask && State.selectionMask[idx] === 0) return false;
        const r = compData8[idx * 4];
        const g = compData8[idx * 4 + 1];
        const b = compData8[idx * 4 + 2];
        const a = compData8[idx * 4 + 3];
        const diff = Math.abs(r - sr) + Math.abs(g - sg) + Math.abs(b - sb) + Math.abs(a - sa);
        return diff <= tolerance; 
    }

    const stack = [startIdx];
    const visited = new Uint8Array(State.CANVAS_WIDTH * State.CANVAS_HEIGHT);

    while (stack.length > 0) {
        let idx = stack.pop();
        if (visited[idx]) continue;

        let y = Math.floor(idx / State.CANVAS_WIDTH);
        let x = idx % State.CANVAS_WIDTH;

        let left = x;
        while (left > 0 && !visited[y * State.CANVAS_WIDTH + (left - 1)] && matchStartColor(y * State.CANVAS_WIDTH + (left - 1))) {
            left--;
        }

        let right = x;
        while (right < State.CANVAS_WIDTH - 1 && !visited[y * State.CANVAS_WIDTH + (right + 1)] && matchStartColor(y * State.CANVAS_WIDTH + (right + 1))) {
            right++;
        }

        for (let i = left; i <= right; i++) {
            let currentIdx = y * State.CANVAS_WIDTH + i;
            activeData32[currentIdx] = fillColor32; 
            visited[currentIdx] = 1;

            if (y > 0) {
                let upIdx = (y - 1) * State.CANVAS_WIDTH + i;
                if (!visited[upIdx] && matchStartColor(upIdx)) {
                    stack.push(upIdx);
                }
            }

            if (y < State.CANVAS_HEIGHT - 1) {
                let downIdx = (y + 1) * State.CANVAS_WIDTH + i;
                if (!visited[downIdx] && matchStartColor(downIdx)) {
                    stack.push(downIdx);
                }
            }
        }
    }

    ctx.putImageData(activeImageData, 0, 0);
}

export function executeWandSelection(startX, startY) {
    const ctx = getCurrentContext();
    if (!ctx) return null;

    startX = Math.floor(startX);
    startY = Math.floor(startY);

    if (startX < 0 || startY < 0 || startX >= State.CANVAS_WIDTH || startY >= State.CANVAS_HEIGHT) return null;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = State.CANVAS_WIDTH;
    tempCanvas.height = State.CANVAS_HEIGHT;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    
    State.layers.forEach(layer => {
        if (layer.visible) tempCtx.drawImage(layer.canvas, 0, 0);
    });

    const compImageData = tempCtx.getImageData(0, 0, State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
    const compData8 = new Uint8ClampedArray(compImageData.data.buffer);
    
    const startIdx = startY * State.CANVAS_WIDTH + startX;
    
    const sr = compData8[startIdx * 4];
    const sg = compData8[startIdx * 4 + 1];
    const sb = compData8[startIdx * 4 + 2];
    const sa = compData8[startIdx * 4 + 3];
    
    const tolerance = State.fillTolerance * 4; 

    function matchStartColor(idx) {
        const r = compData8[idx * 4];
        const g = compData8[idx * 4 + 1];
        const b = compData8[idx * 4 + 2];
        const a = compData8[idx * 4 + 3];
        const diff = Math.abs(r - sr) + Math.abs(g - sg) + Math.abs(b - sb) + Math.abs(a - sa);
        return diff <= tolerance; 
    }

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = State.CANVAS_WIDTH;
    maskCanvas.height = State.CANVAS_HEIGHT;
    const maskCtx = maskCanvas.getContext('2d');
    const maskImgData = maskCtx.createImageData(State.CANVAS_WIDTH, State.CANVAS_HEIGHT);
    const maskData32 = new Uint32Array(maskImgData.data.buffer);
    const fillC = 0xFFFFFFFF; 

    const stack = [startIdx];
    const visited = new Uint8Array(State.CANVAS_WIDTH * State.CANVAS_HEIGHT);
    
    let minX = State.CANVAS_WIDTH, minY = State.CANVAS_HEIGHT, maxX = 0, maxY = 0;

    while (stack.length > 0) {
        let idx = stack.pop();
        if (visited[idx]) continue;

        let y = Math.floor(idx / State.CANVAS_WIDTH);
        let x = idx % State.CANVAS_WIDTH;

        let left = x;
        while (left > 0 && !visited[y * State.CANVAS_WIDTH + (left - 1)] && matchStartColor(y * State.CANVAS_WIDTH + (left - 1))) {
            left--;
        }

        let right = x;
        while (right < State.CANVAS_WIDTH - 1 && !visited[y * State.CANVAS_WIDTH + (right + 1)] && matchStartColor(y * State.CANVAS_WIDTH + (right + 1))) {
            right++;
        }

        for (let i = left; i <= right; i++) {
            let currentIdx = y * State.CANVAS_WIDTH + i;
            maskData32[currentIdx] = fillC;
            visited[currentIdx] = 1;
            
            if (i < minX) minX = i;
            if (i > maxX) maxX = i;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;

            if (y > 0) {
                let upIdx = (y - 1) * State.CANVAS_WIDTH + i;
                if (!visited[upIdx] && matchStartColor(upIdx)) {
                    stack.push(upIdx);
                }
            }
            if (y < State.CANVAS_HEIGHT - 1) {
                let downIdx = (y + 1) * State.CANVAS_WIDTH + i;
                if (!visited[downIdx] && matchStartColor(downIdx)) {
                    stack.push(downIdx);
                }
            }
        }
    }

    if (minX > maxX) return null;

    maskCtx.putImageData(maskImgData, 0, 0);
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = w;
    cropCanvas.height = h;
    cropCanvas.getContext('2d').drawImage(maskCanvas, minX, minY, w, h, 0, 0, w, h);

    return { x: minX, y: minY, w, h, maskCanvas: cropCanvas };
}

export function applyColorAdjustment(ctx, w, h, b_val, c_val, h_val, s_val, grayscale, invert, sepia, edge, anime, mosaic) {
    let imgData = ctx.getImageData(0, 0, w, h);
    let data = imgData.data;

    if (mosaic > 1) {
        const mData = new Uint8ClampedArray(data);
        for (let y = 0; y < h; y += mosaic) {
            for (let x = 0; x < w; x += mosaic) {
                let r = 0, g = 0, b = 0, a = 0;
                
                for (let my = 0; my < mosaic && y + my < h; my++) {
                    for (let mx = 0; mx < mosaic && x + mx < w; mx++) {
                        const mi = ((y + my) * w + (x + mx)) * 4;
                        if (mData[mi+3] > 0) {
                            r = mData[mi]; g = mData[mi+1]; b = mData[mi+2]; a = mData[mi+3];
                            break;
                        }
                    }
                    if (a > 0) break;
                }
                
                for (let my = 0; my < mosaic && y + my < h; my++) {
                    for (let mx = 0; mx < mosaic && x + mx < w; mx++) {
                        const mi = ((y + my) * w + (x + mx)) * 4;
                        if (mData[mi+3] > 0) { 
                            data[mi] = r; data[mi+1] = g; data[mi+2] = b; data[mi+3] = mData[mi+3];
                        }
                    }
                }
            }
        }
    }

    if (edge) {
        const edgeData = new Uint8ClampedArray(data);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4;
                if (data[i+3] === 0) {
                    data[i] = 255; data[i+1] = 255; data[i+2] = 255; data[i+3] = 0;
                    continue;
                }
                const right = (x < w - 1) ? ((y * w + x + 1) * 4) : i;
                const bottom = (y < h - 1) ? (((y + 1) * w + x) * 4) : i;

                const diff = Math.abs(edgeData[i] - edgeData[right]) + Math.abs(edgeData[i] - edgeData[bottom]) +
                             Math.abs(edgeData[i+1] - edgeData[right+1]) + Math.abs(edgeData[i+1] - edgeData[bottom+1]) +
                             Math.abs(edgeData[i+2] - edgeData[right+2]) + Math.abs(edgeData[i+2] - edgeData[bottom+2]);

                const v = diff > 40 ? 0 : 255; 
                data[i] = v; data[i+1] = v; data[i+2] = v;
            }
        }
    }

    const factor = (259 * (c_val + 255)) / (255 * (259 - c_val));

    for (let i = 0; i < data.length; i += 4) {
        if (data[i+3] === 0) continue; 
        
        let r = data[i], g = data[i+1], b = data[i+2];

        if (invert && !edge) {
            r = 255 - r; g = 255 - g; b = 255 - b;
        }

        if (h_val !== 0 || s_val !== 0) {
            let [hh, ss, ll] = rgbToHsl(r, g, b);
            hh = (hh + h_val / 360) % 1;
            if (hh < 0) hh += 1;
            ss = Math.max(0, Math.min(1, ss + s_val / 100));
            let rgb = hslToRgb(hh, ss, ll);
            r = rgb[0]; g = rgb[1]; b = rgb[2];
        }

        r = factor * (r - 128) + 128 + b_val;
        g = factor * (g - 128) + 128 + b_val;
        b = factor * (b - 128) + 128 + b_val;

        if (grayscale) {
            let avg = 0.299 * r + 0.587 * g + 0.114 * b;
            r = g = b = avg;
        }

        if (sepia && !edge) {
            let sr = (r * 0.393) + (g * 0.769) + (b * 0.189);
            let sg = (r * 0.349) + (g * 0.686) + (b * 0.168);
            let sb = (r * 0.272) + (g * 0.534) + (b * 0.131);
            r = sr; g = sg; b = sb;
        }

        if (anime > 1) {
            const step = 255 / (anime - 1);
            r = Math.round(r / step) * step;
            g = Math.round(g / step) * step;
            b = Math.round(b / step) * step;
        }
        
        data[i] = Math.max(0, Math.min(255, r));
        data[i+1] = Math.max(0, Math.min(255, g));
        data[i+2] = Math.max(0, Math.min(255, b));
    }
    ctx.putImageData(imgData, 0, 0);
}

function rgbToHsl(r, g, b) {
    r /= 255, g /= 255, b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h, s, l];
}

function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
        let hue2rgb = function hue2rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }
        let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        let p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}