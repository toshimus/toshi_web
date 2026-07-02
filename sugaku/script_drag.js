/* ==========================================
   グローバルリサイズ・ハンドルドラッグ機能
   ========================================== */
let activeResizeWrapper = null;
let activeHandlePos = '';
let rStartX, rStartY;
let rStartWCells, rStartHCells, rStartGridX, rStartGridY;
let activeLineHandleData = null; 

const handleGlobalMove = (e) => {
    if (!isEditMode) return;
    
    if (activeResizeWrapper) {
        e.preventDefault();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const cRect = container.getBoundingClientRect();
        const cellW = cRect.width / 32;
        const cellH = cRect.height / 24;
        const deltaGridX = Math.round((clientX - rStartX) / cellW);
        const deltaGridY = Math.round((clientY - rStartY) / cellH);
        
        let newW = rStartWCells;
        let newH = rStartHCells;
        let newX = rStartGridX;
        let newY = rStartGridY;
        
        if (activeHandlePos.includes('r')) newW = rStartWCells + deltaGridX;
        if (activeHandlePos.includes('l')) { newW = rStartWCells - deltaGridX; newX = rStartGridX + deltaGridX; }
        if (activeHandlePos.includes('b')) newH = rStartHCells + deltaGridY;
        if (activeHandlePos.includes('t')) { newH = rStartHCells - deltaGridY; newY = rStartGridY + deltaGridY; }
        
        if (newW < 1) { newX -= (1 - newW); newW = 1; }
        if (newH < 1) { newY -= (1 - newH); newH = 1; }
        if (newX < 0) { newW += newX; newX = 0; }
        if (newY < 0) { newH += newY; newY = 0; }
        if (newX + newW > 32) newW = 32 - newX;
        if (newY + newH > 24) newH = 24 - newY;
        
        activeResizeWrapper.dataset.wCells = newW;
        activeResizeWrapper.dataset.hCells = newH;
        activeResizeWrapper.dataset.gridX = newX;
        activeResizeWrapper.dataset.gridY = newY;
        
        activeResizeWrapper.style.width = `calc(${newW} * (100% / 32))`;
        activeResizeWrapper.style.height = `calc(${newH} * (100% / 24))`;
        activeResizeWrapper.style.left = `calc(${newX} * (100% / 32))`;
        activeResizeWrapper.style.top = `calc(${newY} * (100% / 24))`;
        return;
    }

    if (activeLineHandleData) {
        e.preventDefault();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const cRect = container.getBoundingClientRect();
        let rawGridX = (clientX - cRect.left) / (cRect.width / 32);
        let rawGridY = (clientY - cRect.top) / (cRect.height / 24);
        let snapX = Math.round(rawGridX * 2) / 2;
        let snapY = Math.round(rawGridY * 2) / 2;
        snapX = Math.max(0, Math.min(snapX, 32));
        snapY = Math.max(0, Math.min(snapY, 24));
        
        const wrapper = activeLineHandleData.wrapper;
        if (activeLineHandleData.type === 'start') {
            wrapper.dataset.startX = snapX;
            wrapper.dataset.startY = snapY;
        } else {
            wrapper.dataset.endX = snapX;
            wrapper.dataset.endY = snapY;
        }
        window.updateLineVisuals(wrapper);
        return;
    }
};

const handleGlobalEnd = () => {
    activeResizeWrapper = null;
    activeLineHandleData = null;
};

document.addEventListener('mousemove', handleGlobalMove, { passive: false });
document.addEventListener('touchmove', handleGlobalMove, { passive: false });
document.addEventListener('mouseup', handleGlobalEnd);
document.addEventListener('touchend', handleGlobalEnd);

const deselectAll = (e) => {
    if (!e.target.closest('.draggable') && !e.target.closest('.resize-handle') && !e.target.closest('.line-handle') && !e.target.closest('.pieces-container') && !e.target.closest('.sidebar')) {
        document.querySelectorAll('.wrapper-selected').forEach(w => w.classList.remove('wrapper-selected'));
    }
};
document.addEventListener('mousedown', deselectAll);
document.addEventListener('touchstart', deselectAll);


/* ==========================================
   レンダリング関数 (文字＆解答欄の分割対応)
   ========================================== */
window.updateLineVisuals = function(wrapper) {
    const startX = parseFloat(wrapper.dataset.startX) || 0;
    const startY = parseFloat(wrapper.dataset.startY) || 0;
    const endX = parseFloat(wrapper.dataset.endX) || 0;
    const endY = parseFloat(wrapper.dataset.endY) || 0;
    const thickness = wrapper.dataset.thickness || 2;
    const color = wrapper.dataset.lineColor || '#000000';
    const style = wrapper.dataset.lineStyle || 'solid';
    
    const line = wrapper.querySelector('line');
    if (line) {
        line.setAttribute('x1', `${(startX / 32) * 100}%`);
        line.setAttribute('y1', `${(startY / 24) * 100}%`);
        line.setAttribute('x2', `${(endX / 32) * 100}%`);
        line.setAttribute('y2', `${(endY / 24) * 100}%`);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', thickness);
        if (style === 'dashed') {
            line.setAttribute('stroke-dasharray', `${thickness * 3}, ${thickness * 3}`);
            line.setAttribute('stroke-linecap', 'butt');
        } else if (style === 'dotted') {
            line.setAttribute('stroke-dasharray', `1, ${thickness * 2}`);
            line.setAttribute('stroke-linecap', 'round');
        } else {
            line.setAttribute('stroke-dasharray', '');
            line.setAttribute('stroke-linecap', 'butt');
        }
    }
    const hStart = wrapper.querySelector('.line-handle-start');
    const hEnd = wrapper.querySelector('.line-handle-end');
    if (hStart && hEnd) {
        hStart.style.left = `calc(${startX} * (100% / 32))`;
        hStart.style.top = `calc(${startY} * (100% / 24))`;
        hEnd.style.left = `calc(${endX} * (100% / 32))`;
        hEnd.style.top = `calc(${endY} * (100% / 24))`;
    }
};

function renderAnswer(wrapper) {
    const el = wrapper.querySelector('.ans-rect');
    if (!el) return;
    const digits = parseInt(wrapper.dataset.digits) || 0;
    const answerId = wrapper.dataset.answerId || '';
    
    el.innerHTML = '';
    
    if (digits > 0) {
        const container = document.createElement('div');
        container.className = 'split-container';
        for (let i = 0; i < digits; i++) {
            const cell = document.createElement('div');
            cell.className = 'split-cell';
            container.appendChild(cell);
        }
        el.appendChild(container);
        
        if (isEditMode) {
            const label = document.createElement('div');
            label.className = 'id-label';
            label.textContent = answerId;
            el.appendChild(label);
        }
    } else {
        if (isEditMode) {
            el.textContent = answerId;
        } else {
            el.textContent = ''; 
        }
    }
}

function renderText(wrapper) {
    const el = wrapper.querySelector('.text-rect');
    if (!el) return;
    const digits = parseInt(wrapper.dataset.digits) || 0;
    const originalContent = wrapper.dataset.originalContent || '';
    
    el.innerHTML = '';
    
    if (isEditMode) {
        if (digits > 0) {
            const container = document.createElement('div');
            container.className = 'split-container';
            for (let i = 0; i < digits; i++) {
                const cell = document.createElement('div');
                cell.className = 'split-cell';
                container.appendChild(cell);
            }
            el.appendChild(container);
            const label = document.createElement('div');
            label.className = 'id-label';
            label.innerHTML = originalContent; 
            el.appendChild(label);
        } else {
            el.innerHTML = originalContent;
        }
    } else {
        if (digits > 0 && /^\s*\[[^\]]+\]\s*$/.test(originalContent)) {
            const varName = originalContent.trim();
            const val = currentVarValues[varName];
            if (val !== undefined) {
                const range = variableRanges[varName] || { color: '#e74c3c', size: 1.0 };
                let valStr = String(val).padStart(digits, ' ');
                const container = document.createElement('div');
                container.className = 'split-container';
                for (let i = 0; i < digits; i++) {
                    const cell = document.createElement('div');
                    cell.className = 'split-cell';
                    let char = valStr[i] === ' ' ? '' : valStr[i];
                    cell.innerHTML = char !== '' ? `<span style="color:${range.color}; font-size:${range.size}em;">${char}</span>` : '';
                    container.appendChild(cell);
                }
                el.appendChild(container);
                return;
            }
        }
        
        let replacedText = originalContent;
        const sortedVars = Object.keys(currentVarValues).sort((a, b) => b.length - a.length);
        for (const varName of sortedVars) {
            const val = currentVarValues[varName];
            if (val !== undefined) {
                const range = variableRanges[varName] || { color: '#e74c3c', size: 1.0 };
                const color = range.color || '#e74c3c';
                const size = range.size || 1.0;
                const styledHTML = `<span style="color:${color}; font-size:${size}em;">${val}</span>`;
                replacedText = replacedText.split(varName).join(styledHTML);
            }
        }
        el.innerHTML = replacedText;
    }
}

/* ==========================================
   ドラッグ可能要素の生成と制御
   ========================================== */
function createDraggable(type, itemData = null) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('draggable');
    wrapper.dataset.type = type;
    
    const el = document.createElement('div');

    if (type === 'line') {
        wrapper.classList.add('line-wrapper');
        wrapper.style.left = '0';
        wrapper.style.top = '0';
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        wrapper.style.pointerEvents = 'none';
        
        wrapper.dataset.startX = itemData ? itemData.startX : 2;
        wrapper.dataset.startY = itemData ? itemData.startY : 2;
        wrapper.dataset.endX = itemData ? itemData.endX : 10;
        wrapper.dataset.endY = itemData ? itemData.endY : 2;
        wrapper.dataset.thickness = itemData ? itemData.thickness : 4;
        wrapper.dataset.lineColor = itemData ? itemData.lineColor : "#000000";
        wrapper.dataset.lineStyle = itemData ? itemData.lineStyle : "solid";

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.position = 'absolute';
        svg.style.overflow = 'visible';
        
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.style.pointerEvents = 'auto'; 
        line.style.cursor = 'grab';
        
        line.addEventListener('dblclick', (e) => {
            if (!isEditMode) return;
            e.stopPropagation();
            activeLineWrapper = wrapper;
            document.getElementById('line-prop-thickness').value = wrapper.dataset.thickness;
            document.getElementById('line-prop-color').value = wrapper.dataset.lineColor;
            document.getElementById('line-prop-style').value = wrapper.dataset.lineStyle;
            
            document.getElementById('line-prop-container').style.display = 'flex';
            document.getElementById('overlay').style.display = 'block';
        });
        
        svg.appendChild(line);
        el.appendChild(svg);
        
        el.style.width = '100%';
        el.style.height = '100%';
        el.style.position = 'absolute';
        el.style.pointerEvents = 'none';
        wrapper.appendChild(el);
        
        const hStart = document.createElement('div');
        hStart.classList.add('line-handle', 'line-handle-start', 'edit-only');
        const hEnd = document.createElement('div');
        hEnd.classList.add('line-handle', 'line-handle-end', 'edit-only');
        
        const startLineHandleDrag = (e, handleType) => {
            if (!isEditMode) return;
            e.stopPropagation(); 
            activeLineHandleData = { wrapper, type: handleType };
        };
        hStart.addEventListener('mousedown', (e) => startLineHandleDrag(e, 'start'));
        hStart.addEventListener('touchstart', (e) => startLineHandleDrag(e, 'start'), {passive: false});
        hEnd.addEventListener('mousedown', (e) => startLineHandleDrag(e, 'end'));
        hEnd.addEventListener('touchstart', (e) => startLineHandleDrag(e, 'end'), {passive: false});
        
        wrapper.appendChild(hStart);
        wrapper.appendChild(hEnd);
        
        container.appendChild(wrapper);
        window.updateLineVisuals(wrapper);

    } else {
        const wCells = itemData ? itemData.wCells : 2;
        const hCells = itemData ? itemData.hCells : 2;
        const gridX = itemData ? itemData.gridX : 0;
        const gridY = itemData ? itemData.gridY : 0;

        wrapper.dataset.wCells = wCells;
        wrapper.dataset.hCells = hCells;
        wrapper.dataset.gridX = gridX;
        wrapper.dataset.gridY = gridY;
        
        wrapper.style.width = `calc(${wCells} * (100% / 32))`;
        wrapper.style.height = `calc(${hCells} * (100% / 24))`;
        wrapper.style.left = `calc(${gridX} * (100% / 32))`;
        wrapper.style.top = `calc(${gridY} * (100% / 24))`;

        if (type === 'box') {
            if (itemData) {
                el.textContent = itemData.content;
                const num = parseInt(itemData.content);
                if (!isNaN(num) && num > count) count = num;
            } else {
                count++;
                el.textContent = count;
            }
            el.classList.add('rect');
            wrapper.appendChild(el);

        } else if (type === 'answer') {
            el.classList.add('ans-rect');
            wrapper.dataset.answerId = itemData ? (itemData.answerId || itemData.content || '') : '[q1]';
            wrapper.dataset.calcMode = itemData ? (itemData.calcMode || '0-20') : '0-20';
            wrapper.dataset.formula = itemData ? (itemData.formula || '') : ''; 
            wrapper.dataset.digits = itemData ? (itemData.digits || 0) : 0;
            
            el.addEventListener('dblclick', (e) => {
                if (!isEditMode) return; 
                e.stopPropagation();
                activeAnsWrapper = wrapper;
                document.getElementById('ans-prop-id').value = wrapper.dataset.answerId;
                document.getElementById('ans-prop-mode').value = wrapper.dataset.calcMode;
                document.getElementById('ans-prop-digits').value = wrapper.dataset.digits;
                document.getElementById('ans-prop-container').style.display = 'flex';
                document.getElementById('overlay').style.display = 'block';
            });
            wrapper.appendChild(el);
            renderAnswer(wrapper);

        } else if (type === 'formula') {
            let txt = itemData ? itemData.content : prompt("判定・表示用の計算式を入力してください (例: [q1]=[x1]+[x2]):");
            if (!itemData && (txt === null || txt.trim() === "")) return;
            el.classList.add('formula-rect');
            el.textContent = txt;
            
            el.addEventListener('dblclick', (e) => {
                if (!isEditMode) return; 
                e.stopPropagation();
                const newTxt = prompt("計算式を編集してください:", el.textContent);
                if (newTxt !== null && newTxt.trim() !== "") el.textContent = newTxt;
            });
            wrapper.appendChild(el);

        } else if (type === 'text') {
            let txt = itemData ? itemData.content : prompt("追加する文字を入力してください (例: [x1]＋[x2]＝):");
            if (!itemData && (txt === null || txt.trim() === "")) return;
            el.classList.add('text-rect');
            wrapper.dataset.originalContent = txt; 
            wrapper.dataset.digits = itemData ? (itemData.digits || 0) : 0;
            
            if (/^\s*\[[^\]]+\]\s*$/.test(txt)) {
                el.classList.add('single-var-text');
            }

            el.addEventListener('dblclick', (e) => {
                if (!isEditMode) return; 
                e.stopPropagation();
                activeTextWrapper = wrapper;
                document.getElementById('text-prop-content').value = wrapper.dataset.originalContent;
                document.getElementById('text-prop-digits').value = wrapper.dataset.digits;
                document.getElementById('text-prop-container').style.display = 'flex';
                document.getElementById('overlay').style.display = 'block';
            });
            wrapper.appendChild(el);
            renderText(wrapper);

        } else if (type === 'check') {
            el.classList.add('check-rect');
            el.textContent = "できた";
            wrapper.appendChild(el);
        }
        
        const handles = ['tl', 'tr', 'bl', 'br'];
        handles.forEach(pos => {
            const h = document.createElement('div');
            h.classList.add('resize-handle', `handle-${pos}`);
            const startResize = (e) => {
                if (!isEditMode) return; 
                e.stopPropagation();
                activeResizeWrapper = wrapper;
                activeHandlePos = pos;
                rStartX = e.touches ? e.touches[0].clientX : e.clientX;
                rStartY = e.touches ? e.touches[0].clientY : e.clientY;
                rStartWCells = parseInt(wrapper.dataset.wCells) || 2;
                rStartHCells = parseInt(wrapper.dataset.hCells) || 2;
                rStartGridX = parseInt(wrapper.dataset.gridX) || 0;
                rStartGridY = parseInt(wrapper.dataset.gridY) || 0;
            };
            h.addEventListener('mousedown', startResize);
            h.addEventListener('touchstart', startResize, {passive: false});
            wrapper.appendChild(h);
        });

        container.appendChild(wrapper);
    }

    let isDragging = false;
    let hasMoved = false;
    let startX, startY;
    let lineInitialStartX, lineInitialStartY, lineInitialEndX, lineInitialEndY;
    
    const dragStart = (e) => {
        if (!isEditMode && type !== 'answer' && type !== 'check') return; 
        if (e.target.classList.contains('resize-handle') || e.target.classList.contains('line-handle')) return; 

        isDragging = true;
        hasMoved = false;
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        startX = clientX;
        startY = clientY;

        if (type === 'line' && isEditMode) {
            wrapper.querySelector('line').style.cursor = 'grabbing';
            lineInitialStartX = parseFloat(wrapper.dataset.startX);
            lineInitialStartY = parseFloat(wrapper.dataset.startY);
            lineInitialEndX = parseFloat(wrapper.dataset.endX);
            lineInitialEndY = parseFloat(wrapper.dataset.endY);
        } else if (type !== 'check' && isEditMode) {
            el.style.cursor = 'grabbing';
        }
    };

    wrapper.addEventListener('mousedown', dragStart);
    wrapper.addEventListener('touchstart', dragStart, { passive: false });

    const handleItemMove = (e) => {
        if (!isDragging) return;
        if (!isEditMode) return; 
        if (activeResizeWrapper || activeLineHandleData) return; 
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        if (Math.abs(clientX - startX) > 5 || Math.abs(clientY - startY) > 5) {
            hasMoved = true;
        }
        if (e.type === 'touchmove') e.preventDefault();
        
        const cRect = container.getBoundingClientRect();

        if (type === 'line') {
            const dxCells = (clientX - startX) / (cRect.width / 32);
            const dyCells = (clientY - startY) / (cRect.height / 24);
            let snapDx = Math.round(dxCells * 2) / 2;
            let snapDy = Math.round(dyCells * 2) / 2;
            wrapper.dataset.startX = lineInitialStartX + snapDx;
            wrapper.dataset.startY = lineInitialStartY + snapDy;
            wrapper.dataset.endX = lineInitialEndX + snapDx;
            wrapper.dataset.endY = lineInitialEndY + snapDy;
            window.updateLineVisuals(wrapper);
        } else {
            let x = clientX - cRect.left - (wrapper.offsetWidth / 2);
            let y = clientY - cRect.top - (wrapper.offsetHeight / 2);
            let gridX = Math.round(x / (cRect.width / 32));
            let gridY = Math.round(y / (cRect.height / 24));
            let wCells = parseInt(wrapper.dataset.wCells) || 2;
            let hCells = parseInt(wrapper.dataset.hCells) || 2;
            gridX = Math.max(0, Math.min(gridX, 32 - wCells));
            gridY = Math.max(0, Math.min(gridY, 24 - hCells));
            wrapper.dataset.gridX = gridX;
            wrapper.dataset.gridY = gridY;
            wrapper.style.left = `calc(${gridX} * (100% / 32))`;
            wrapper.style.top = `calc(${gridY} * (100% / 24))`;
        }
    };

    document.addEventListener('mousemove', handleItemMove, { passive: false });
    document.addEventListener('touchmove', handleItemMove, { passive: false });

    const dragEnd = (e) => {
        if (!isDragging) return;
        isDragging = false;
        
        if (type === 'line' && isEditMode) wrapper.querySelector('line').style.cursor = 'grab';
        else if (type !== 'check' && type !== 'line' && isEditMode) el.style.cursor = 'grab';

        if (!hasMoved) {
            if (type === 'answer' && !isEditMode) {
                const digits = parseInt(wrapper.dataset.digits) || 0;
                if (digits > 0) {
                    const cell = e.target.closest('.split-cell');
                    if (cell && wrapper.contains(cell)) {
                        activeInputBox = cell;
                    } else {
                        return; // セル以外がクリックされた場合は無視
                    }
                } else {
                    activeInputBox = el;
                }
                
                const mode = wrapper.dataset.calcMode || '0-20';
                calc0to20View.style.display = 'none';
                calcStandardView.style.display = 'none';
                document.getElementById('calc-quick-view').style.display = 'none';

                if (mode === 'standard') {
                    calcStandardView.style.display = 'block';
                    stdCalcValue = el.textContent || "";
                    stdCalcDisplay.textContent = stdCalcValue;
                } else if (mode === 'quick-0-9') {
                    document.getElementById('calc-quick-view').style.display = 'block';
                } else {
                    calc0to20View.style.display = 'block';
                }
                calcContainer.style.display = 'flex';
                overlay.style.display = 'block';
                
            } else if (type === 'check') {
                if (!isEditMode) {
                    runValidation();
                } else {
                    document.querySelectorAll('.wrapper-selected').forEach(w => w.classList.remove('wrapper-selected'));
                    wrapper.classList.add('wrapper-selected');
                }
            } else if (isEditMode) {
                document.querySelectorAll('.wrapper-selected').forEach(w => w.classList.remove('wrapper-selected'));
                wrapper.classList.add('wrapper-selected');
            }
        }
    };

    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('touchend', dragEnd);
}