/* ==========================================
   script_tegaki.js (手書き認識・学習・フィードバック基盤)
   ========================================== */
window.Tegaki = (function() {
    const RAW_PATTERNS = [
      ["00000000", "00111100", "01100110", "01100110", "01100110", "01100110", "00111100", "00000000"], // 0
      ["00000000", "00011000", "00111000", "00011000", "00011000", "00011000", "00111100", "00000000"], // 1
      ["00000000", "00111100", "01100110", "00000110", "00011100", "01110000", "01111110", "00000000"], // 2
      ["00000000", "00111100", "01100110", "00011100", "00000110", "01100110", "00111100", "00000000"], // 3
      ["00000000", "00001100", "00011100", "00110100", "01100100", "01111111", "00000100", "00000000"], // 4
      ["00000000", "01111110", "01100000", "01111100", "00000110", "01100110", "00111100", "00000000"], // 5
      ["00000000", "00111100", "01100000", "01111100", "01100110", "01100110", "00111100", "00000000"], // 6
      ["00000000", "01111110", "00000110", "00001100", "00011000", "00110000", "01100000", "00000000"], // 7
      ["00000000", "00111100", "01100110", "00111100", "01100110", "01100110", "00111100", "00000000"], // 8
      ["00000000", "00111100", "01100110", "01100110", "00111110", "00000110", "00111100", "00000000"]  // 9
    ];

    let KNOWN_PATTERNS = [];
    for (let d = 0; d < 10; d++) {
      KNOWN_PATTERNS.push({ digit: d, pattern: RAW_PATTERNS[d].join('').split('').map(Number) });
    }

    const STORAGE_KEY = 'tegaki_patterns_grid_v1';

    function loadFromLocalStorage() {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) KNOWN_PATTERNS = parsed;
        } catch (e) { console.error("Data load failed", e); }
      }
    }

    function saveToLocalStorage() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(KNOWN_PATTERNS));
    }

    loadFromLocalStorage();

    function deskewCanvas(sourceCvs) {
      const ctx = sourceCvs.getContext('2d');
      const imgData = ctx.getImageData(0, 0, sourceCvs.width, sourceCvs.height);
      const data = imgData.data;
      const w = sourceCvs.width, h = sourceCvs.height;

      let m00 = 0, m10 = 0, m01 = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const alpha = data[(y * w + x) * 4 + 3];
          if (alpha > 30) { m00 += alpha; m10 += x * alpha; m01 += y * alpha; }
        }
      }
      if (m00 === 0) return sourceCvs;

      const cx = m10 / m00;
      const cy = m01 / m00;
      let mu11 = 0, mu02 = 0;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const alpha = data[(y * w + x) * 4 + 3];
          if (alpha > 30) {
            mu11 += (x - cx) * (y - cy) * alpha;
            mu02 += Math.pow(y - cy, 2) * alpha;
          }
        }
      }

      const k = mu02 !== 0 ? mu11 / mu02 : 0;
      const outCvs = document.createElement('canvas');
      outCvs.width = w; outCvs.height = h;
      const outCtx = outCvs.getContext('2d');

      outCtx.translate(cx, cy);
      outCtx.transform(1, 0, -k, 1, 0, 0); 
      outCtx.translate(-cx, -cy);
      outCtx.drawImage(sourceCvs, 0, 0);

      return outCvs;
    }

    function extractFeatures(context, cvs) {
      const deskewedCvs = deskewCanvas(cvs);
      const dCtx = deskewedCvs.getContext('2d');
      const imgData = dCtx.getImageData(0, 0, cvs.width, cvs.height);
      const data = imgData.data;

      let minX = cvs.width, minY = cvs.height, maxX = 0, maxY = 0;
      let totalAlpha = 0, sumX = 0, sumY = 0;

      for (let y = 0; y < cvs.height; y++) {
        for (let x = 0; x < cvs.width; x++) {
          const a = data[(y * cvs.width + x) * 4 + 3];
          if (a > 30) {
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
            totalAlpha += a; sumX += x * a; sumY += y * a;
          }
        }
      }

      if (totalAlpha === 0) return null;

      const cx = sumX / totalAlpha;
      const cy = sumY / totalAlpha;
      const boxW = maxX - minX + 1;
      const boxH = maxY - minY + 1;
      const maxDim = Math.max(boxW, boxH);

      const normCvs = document.createElement('canvas');
      normCvs.width = maxDim * 1.2; 
      normCvs.height = maxDim * 1.2;
      const normCtx = normCvs.getContext('2d');

      const destX = (normCvs.width / 2) - (cx - minX) - minX;
      const destY = (normCvs.height / 2) - (cy - minY) - minY;

      normCtx.drawImage(deskewedCvs, minX, minY, boxW, boxH, destX + minX, destY + minY, boxW, boxH);

      const gridCvs = document.createElement('canvas');
      gridCvs.width = 8; gridCvs.height = 8;
      const gridCtx = gridCvs.getContext('2d');
      gridCtx.drawImage(normCvs, 0, 0, normCvs.width, normCvs.height, 0, 0, 8, 8);

      const gridData = gridCtx.getImageData(0, 0, 8, 8).data;
      const X = [];
      for (let i = 0; i < 64; i++) X.push(gridData[i * 4 + 3] / 255.0);
      return X;
    }

    function doBoxesIntersect(a, b) {
      return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
    }

    function recalculateGroupBounds(strokes) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let st of strokes) {
        for (let p of st) {
          if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
        }
      }
      return { minX, maxX, minY, maxY, strokes };
    }

    function forceSplitWideGroups(groups) {
      let finalGroups = [];
      for (let g of groups) {
        let w = g.maxX - g.minX;
        let h = (g.maxY - g.minY) || 1;
        let aspectRatio = w / h;

        if (aspectRatio > 1.2 && g.strokes.length > 1) {
          let strokeInfos = g.strokes.map(st => {
            let xs = st.map(p => p.x), ys = st.map(p => p.y);
            return {
              stroke: st,
              minX: Math.min(...xs), maxX: Math.max(...xs),
              minY: Math.min(...ys), maxY: Math.max(...ys)
            };
          });

          strokeInfos.sort((a, b) => a.minX - b.minX);

          let bestSplitIndex = -1;
          let maxGap = -1;

          for (let i = 1; i < strokeInfos.length; i++) {
            let leftStrokes = strokeInfos.slice(0, i);
            let rightStrokes = strokeInfos.slice(i);
            let leftMaxX = Math.max(...leftStrokes.map(s => s.maxX));
            let rightMinX = Math.min(...rightStrokes.map(s => s.minX));

            if (rightMinX >= leftMaxX - 5) {
              let gap = rightMinX - leftMaxX;
              if (gap > maxGap) {
                maxGap = gap;
                bestSplitIndex = i;
              }
            }
          }

          if (bestSplitIndex !== -1) {
            let leftStrokes = strokeInfos.slice(0, bestSplitIndex).map(s => s.stroke);
            let rightStrokes = strokeInfos.slice(bestSplitIndex).map(s => s.stroke);
            if (leftStrokes.length > 0) finalGroups.push(recalculateGroupBounds(leftStrokes));
            if (rightStrokes.length > 0) finalGroups.push(recalculateGroupBounds(rightStrokes));
          } else {
            finalGroups.push(g);
          }
        } else {
          finalGroups.push(g);
        }
      }
      return finalGroups.sort((a, b) => a.minX - b.minX);
    }

    function predictSingleCharacter(strokesGroup) {
      let offCvs = document.createElement('canvas'); offCvs.width = 400; offCvs.height = 400;
      let offCtx = offCvs.getContext('2d'); 
      offCtx.lineWidth = 15; 
      offCtx.lineCap = 'round'; offCtx.lineJoin = 'round'; offCtx.strokeStyle = '#2d3748';
      
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let st of strokesGroup) {
        for (let p of st) {
          if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
        }
      }
      let w = maxX - minX, h = maxY - minY;
      let scale = Math.min(300 / (w || 1), 300 / (h || 1));
      
      offCtx.save();
      offCtx.translate(200, 200);
      offCtx.scale(scale, scale);
      offCtx.translate(-(minX + w/2), -(minY + h/2));
      offCtx.lineWidth = 15 / scale;

      for (let st of strokesGroup) {
        if(!st || st.length < 2) continue;
        offCtx.beginPath(); offCtx.moveTo(st[0].x, st[0].y);
        for (let i = 1; i < st.length; i++) offCtx.lineTo(st[i].x, st[i].y);
        offCtx.stroke();
      }
      offCtx.restore();

      let X = extractFeatures(offCtx, offCvs);
      if (!X) return null;
      let distances = [];
      for (let i = 0; i < KNOWN_PATTERNS.length; i++) {
        let dist = 0, p = KNOWN_PATTERNS[i].pattern;
        for (let j = 0; j < 64; j++) { let diff = X[j] - p[j]; dist += diff * diff; }
        distances.push({ digit: KNOWN_PATTERNS[i].digit, distance: dist });
      }
      distances.sort((a, b) => a.distance - b.distance);
      let uniqueCandidates = []; let seen = new Set();
      for(let c of distances) {
        if(!seen.has(c.digit)) { seen.add(c.digit); uniqueCandidates.push({ digit: c.digit, distance: c.distance }); if(uniqueCandidates.length >= 4) break; }
      }
      return { X: X, candidates: uniqueCandidates };
    }

    function processBoxesIntoBlocks(boxes, role) {
      if (boxes.length === 0) return [];
      boxes.sort((a, b) => a.minX - b.minX);
      let groups = [];

      for (let b of boxes) {
        let merged = false;
        let bHeight = b.maxY - b.minY;
        let dynamicGap = Math.max(12, bHeight * 0.3);

        for (let g of groups) {
          let intersects = doBoxesIntersect(b, g);
          let overlapX = Math.max(0, Math.min(b.maxX, g.maxX) - Math.max(b.minX, g.minX));
          let minW = Math.min(b.maxX - b.minX, g.maxX - g.minX);
          let xOverlapRatio = minW > 0 ? (overlapX / minW) : 0;
          let gapY = Math.max(0, Math.max(b.minY - g.maxY, g.minY - b.maxY));
          let avgH = ((b.maxY - b.minY) + (g.maxY - g.minY)) / 2;

          let verticalCloseAndAligned = (xOverlapRatio > 0.35) && (gapY < avgH * 0.8);
          let horizontalClose = !(b.minX > g.maxX + dynamicGap || b.maxX < g.minX - dynamicGap);
          let verticalOverlap = !(b.maxY < g.minY || b.minY > g.maxY);

          if (intersects || (horizontalClose && verticalOverlap) || verticalCloseAndAligned) {
            g.minX = Math.min(g.minX, b.minX); g.maxX = Math.max(g.maxX, b.maxX);
            g.minY = Math.min(g.minY, b.minY); g.maxY = Math.max(g.maxY, b.maxY);
            if (b.strokes) g.strokes.push(...b.strokes);
            else g.strokes.push(b.stroke);
            merged = true; 
            break;
          }
        }
        if (!merged) {
          groups.push({
            minX: b.minX, maxX: b.maxX, minY: b.minY, maxY: b.maxY,
            strokes: b.strokes ? [...b.strokes] : [b.stroke]
          });
        }
      }

      groups = forceSplitWideGroups(groups);
      let results = [];
      for (let g of groups) {
        let res = predictSingleCharacter(g.strokes);
        if (res && res.candidates.length > 0) {
          results.push({
            role: role,
            strokes: g.strokes,
            X: res.X,
            candidates: res.candidates,
            currentSelected: res.candidates[0].digit
          });
        }
      }
      return results;
    }

    function drawStrokesToCanvas(strokes, cvs) {
      const ctx = cvs.getContext('2d'); ctx.clearRect(0, 0, cvs.width, cvs.height);
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      strokes.forEach(st => st.forEach(p => { if(p.x < minX) minX = p.x; if(p.x > maxX) maxX = p.x; if(p.y < minY) minY = p.y; if(p.y > maxY) maxY = p.y; }));
      let w = maxX - minX, h = maxY - minY;
      let scale = Math.min((cvs.width - 16) / (w || 1), (cvs.height - 16) / (h || 1));
      ctx.save(); ctx.translate(cvs.width/2, cvs.height/2); ctx.scale(scale, scale); ctx.translate(-(minX + w/2), -(minY + h/2));
      ctx.lineWidth = 4 / (scale || 1); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#2d3748';
      strokes.forEach(st => {
        if(st.length < 2) return;
        ctx.beginPath(); ctx.moveTo(st[0].x, st[0].y);
        for(let i=1; i<st.length; i++) ctx.lineTo(st[i].x, st[i].y);
        ctx.stroke();
      });
      ctx.restore();
    }

    // ★修正: DOMのロード状態に関わらず、確実に1度だけUIを注入するロジック
    function initTegakiUI() {
        if (document.getElementById('tegaki-feedback-overlay')) return;
        const uiHtml = `
        <style>
            .other-select {
                background: #edf2f7; border: 2px solid #cbd5e0; border-radius: 8px; font-size: 1rem;
                font-weight: bold; color: #4a5568; padding: 6px; margin-top: 8px; width: 95px; text-align: center; cursor: pointer;
            }
            .other-select:focus { outline: none; border-color: #3182ce; }
        </style>
        <div id="tegaki-feedback-overlay" class="tegaki-feedback-overlay">
            <div class="feedback-msg wrong" style="font-size: 2.8rem; font-weight: bold; margin-bottom: 10px; color: #e53e3e;">うまくよみとれなかったかも💡</div>
            <div class="tegaki-correction-area">
                <p style="color: #2b6cb0; font-weight: bold; margin: 0 0 15px 0; font-size: 1.2rem;">よみまちがえた数字があれば、正しいものをえらんでね！</p>
                <div id="tegaki-correction-list" class="tegaki-correction-list"></div>
            </div>
            <div style="display: flex; gap: 20px;">
                <button id="tegaki-retry-btn" style="background-color: #a0aec0; color: white; font-size: 1.5rem; padding: 15px 40px; border: none; border-radius: 50px; cursor: pointer; box-shadow: 0 6px 0 #718096; font-weight:bold;">とじる (かきなおす)</button>
                <button id="tegaki-confirm-btn" style="background-color: #ff8e53; color: white; font-size: 1.5rem; padding: 15px 40px; border: none; border-radius: 50px; cursor: pointer; box-shadow: 0 6px 0 #e07038; font-weight:bold;">この数字でOK！</button>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', uiHtml);
        
        document.getElementById('tegaki-retry-btn').onclick = () => {
            document.getElementById('tegaki-feedback-overlay').style.display = 'none';
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTegakiUI);
    } else {
        initTegakiUI();
    }

    let pendingCallback = null;
    let currentContexts = [];

    function showCorrectionUI(contexts, onConfirm) {
        currentContexts = contexts;
        pendingCallback = onConfirm;
        const list = document.getElementById('tegaki-correction-list');
        list.innerHTML = '';

        contexts.forEach(ctx => {
            ctx.blocks.forEach((block, index) => {
                const div = document.createElement('div');
                div.className = 'digit-correction-block';
                
                const cvs = document.createElement('canvas');
                cvs.width = 64; cvs.height = 64;
                drawStrokesToCanvas(block.strokes, cvs);
                
                const btnGrid = document.createElement('div');
                btnGrid.className = 'cand-grid';
                
                block.candidates.forEach(cand => {
                    if(cand.digit === "?") return; // ダミーは表示しない
                    const btn = document.createElement('button');
                    btn.className = `btn-cand ${cand.digit === block.currentSelected ? 'active' : ''}`;
                    btn.innerText = cand.digit;
                    btn.onclick = () => {
                        block.currentSelected = cand.digit;
                        showCorrectionUI(contexts, onConfirm);
                    };
                    btnGrid.appendChild(btn);
                });

                const otherSelect = document.createElement('select');
                otherSelect.className = 'other-select';
                const isSelectedInCands = block.candidates.some(c => c.digit === block.currentSelected);
                otherSelect.innerHTML = `<option value="" disabled ${isSelectedInCands ? 'selected' : ''}>ほか ▼</option>`;
                
                for (let i = 0; i <= 9; i++) {
                    if (!block.candidates.some(c => c.digit === i)) {
                        const isSelected = (!isSelectedInCands && block.currentSelected === i) ? 'selected' : '';
                        otherSelect.innerHTML += `<option value="${i}" ${isSelected}>${i}</option>`;
                    }
                }
                otherSelect.onchange = (e) => {
                    block.currentSelected = parseInt(e.target.value, 10);
                    showCorrectionUI(contexts, onConfirm);
                };

                div.appendChild(cvs);
                div.appendChild(btnGrid);
                div.appendChild(otherSelect);
                list.appendChild(div);
            });
        });

        document.getElementById('tegaki-confirm-btn').onclick = () => {
            contexts.forEach(ctx => {
                ctx.blocks.forEach(b => {
                    if(b.currentSelected !== null) {
                        KNOWN_PATTERNS.push({ digit: b.currentSelected, pattern: b.X });
                    }
                });
            });
            saveToLocalStorage();
            document.getElementById('tegaki-feedback-overlay').style.display = 'none';
            if (pendingCallback) pendingCallback();
        };

        document.getElementById('tegaki-feedback-overlay').style.display = 'flex';
    }

    return {
        processStrokes: function(strokes) {
            let strokeBoxes = strokes.map(st => {
                let xs = st.map(p => p.x), ys = st.map(p => p.y);
                return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys), stroke: st };
            });
            return processBoxesIntoBlocks(strokeBoxes, 'number');
        },
        // ★追加: 解析失敗時に無理やり特徴量を抽出するための関数
        extractFeaturesFromStrokes: function(strokes, originalCanvas) {
            let offCvs = document.createElement('canvas'); 
            offCvs.width = originalCanvas ? originalCanvas.width : 400; 
            offCvs.height = originalCanvas ? originalCanvas.height : 400;
            let offCtx = offCvs.getContext('2d');
            offCtx.lineWidth = 4;
            offCtx.lineCap = 'round'; offCtx.lineJoin = 'round'; offCtx.strokeStyle = '#2d3748';
            for (let st of strokes) {
                if(!st || st.length < 2) continue;
                offCtx.beginPath(); offCtx.moveTo(st[0].x, st[0].y);
                for (let i = 1; i < st.length; i++) offCtx.lineTo(st[i].x, st[i].y);
                offCtx.stroke();
            }
            return extractFeatures(offCtx, offCvs) || Array(64).fill(0);
        },
        showCorrectionUI: showCorrectionUI
    };
})();