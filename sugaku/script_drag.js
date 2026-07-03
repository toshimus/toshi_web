/* ==========================================
   グローバルリサイズ・ハンドルドラッグ機能
   ========================================== */
let activeResizeWrapper = null;
let activeHandlePos = '';
let rStartX, rStartY;
let rStartWCells, rStartHCells, rStartGridX, rStartGridY;
let activeLineHandleData = null; 

// ★追加: タッチデバイス向けダブルタップ検知ユーティリティ
const bindDoubleTap = (element, handler) => {
    element.addEventListener('dblclick', handler);
    let lastTap = 0;
    element.addEventListener('touchend', (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        // 350ms以内の連続タップをダブルタップとして判定
        if (tapLength > 0 && tapLength < 350) {
            handler(e);
            lastTap = 0; // リセット
        } else {
            lastTap = currentTime;
        }
    });
};

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


/* ==========================================
   矩形選択機能
   ========================================== */
let isSelecting = false;
let selectionStartX = 0;
let selectionStartY = 0;
let selectionBox = null;

function initSelectionBox() {
    selectionBox = document.createElement('div');
    selectionBox.className = 'selection-box';
    container.appendChild(selectionBox);
}
initSelectionBox();

const startSelection = (e) => {
    if (!isEditMode) return;
    if (e.target.closest('.draggable') || e.target.closest('.resize-handle') || e.target.closest('.line-handle') || e.target.closest('.pieces-container') || e.target.closest('.sidebar')) {
        return;
    }
    
    if (!e.shiftKey) {
        document.querySelectorAll('.wrapper-selected').forEach(w => w.classList.remove('wrapper-selected'));
    }

    isSelecting = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const cRect = container.getBoundingClientRect();
    
    selectionStartX = clientX - cRect.left;
    selectionStartY = clientY - cRect.top;
    
    selectionBox.style.left = selectionStartX + 'px';
    selectionBox.style.top = selectionStartY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    selectionBox.style.display = 'block';
};

const moveSelection = (e) => {
    if (!isSelecting) return;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const cRect = container.getBoundingClientRect();
    
    let currentX = clientX - cRect.left;
    let currentY = clientY - cRect.top;
    
    currentX = Math.max(0, Math.min(currentX, cRect.width));
    currentY = Math.max(0, Math.min(currentY, cRect.height));

    const left = Math.min(selectionStartX, currentX);
    const top = Math.min(selectionStartY, currentY);
    const width = Math.abs(currentX - selectionStartX);
    const height = Math.abs(currentY - selectionStartY);

    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';
    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
};

const endSelection = (e) => {
    if (!isSelecting) return;
    isSelecting = false;
    selectionBox.style.display = 'none';

    const sLeft = parseFloat(selectionBox.style.left);
    const sTop = parseFloat(selectionBox.style.top);
    const sRight = sLeft + parseFloat(selectionBox.style.width);
    const sBottom = sTop + parseFloat(selectionBox.style.height);

    if (parseFloat(selectionBox.style.width) < 5 && parseFloat(selectionBox.style.height) < 5) {
        return; 
    }

    const draggables = container.querySelectorAll('.draggable');
    draggables.forEach(wrapper => {
        const wLeft = wrapper.offsetLeft;
        const wTop = wrapper.offsetTop;
        const wRight = wLeft + wrapper.offsetWidth;
        const wBottom = wTop + wrapper.offsetHeight;

        const intersect = !(sRight < wLeft || sLeft > wRight || sBottom < wTop || sTop > wBottom);
        if (intersect) {
            wrapper.classList.add('wrapper-selected');
        }
    });
};

container.addEventListener('mousedown', startSelection);
container.addEventListener('touchstart', startSelection, { passive: true });
document.addEventListener('mousemove', moveSelection);
document.addEventListener('touchmove', moveSelection);
document.addEventListener('mouseup', endSelection);
document.addEventListener('touchend', endSelection);


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
        el.classList.add('is-split'); 
        const container = document.createElement('div');
        container.className = 'split-container';
        for (let i = 0; i < digits; i++) {
            const cellWrapper = document.createElement('div');
            cellWrapper.className = 'split-cell-wrapper';
            const cell = document.createElement('div');
            cell.className = 'split-cell';
            cellWrapper.appendChild(cell);
            container.appendChild(cellWrapper);
        }
        el.appendChild(container);
        
        if (isEditMode) {
            const label = document.createElement('div');
            label.className = 'id-label';
            label.textContent = answerId;
            el.appendChild(label);
        }
    } else {
        el.classList.remove('is-split'); 
        if (isEditMode) {
            el.textContent = answerId;
        } else {
            el.textContent = ''; 
        }
    }
}
window.renderAnswer = renderAnswer; 

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
        
        // ★変更: dblclickの代わりに独自のbindDoubleTapを使用
        const lineHandler = (e) => {
            if (!isEditMode) return;
            e.stopPropagation();
            activeLineWrapper = wrapper;
            document.getElementById('line-prop-thickness').value = wrapper.dataset.thickness;
            document.getElementById('line-prop-color').value = wrapper.dataset.lineColor;
            document.getElementById('line-prop-style').value = wrapper.dataset.lineStyle;
            
            document.getElementById('line-prop-container').style.display = 'flex';
            document.getElementById('overlay').style.display = 'block';
        };
        bindDoubleTap(line, lineHandler);
        
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
        if (typeof window.updateLineVisuals === 'function') window.updateLineVisuals(wrapper);

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
            
            // ★変更: bindDoubleTapを使用
            const ansHandler = (e) => {
                if (!isEditMode) return; 
                e.stopPropagation();
                activeAnsWrapper = wrapper;
                document.getElementById('ans-prop-id').value = wrapper.dataset.answerId;
                document.getElementById('ans-prop-mode').value = wrapper.dataset.calcMode;
                document.getElementById('ans-prop-digits').value = wrapper.dataset.digits;
                document.getElementById('ans-prop-container').style.display = 'flex';
                document.getElementById('overlay').style.display = 'block';
            };
            bindDoubleTap(el, ansHandler);
            
            wrapper.appendChild(el);
            if (typeof window.renderAnswer === 'function') window.renderAnswer(wrapper);

        } else if (type === 'formula') {
            let txt = itemData ? itemData.content : prompt("判定・表示用の計算式を入力してください (例: [q1]=[x1]+[x2]):");
            if (!itemData && (txt === null || txt.trim() === "")) return;
            el.classList.add('formula-rect');
            el.textContent = txt;
            
            // ★変更: bindDoubleTapを使用
            const formulaHandler = (e) => {
                if (!isEditMode) return; 
                e.stopPropagation();
                const newTxt = prompt("計算式を編集してください:", el.textContent);
                if (newTxt !== null && newTxt.trim() !== "") el.textContent = newTxt;
            };
            bindDoubleTap(el, formulaHandler);
            
            wrapper.appendChild(el);

        } else if (type === 'text') {
            let txt = itemData ? itemData.content : prompt("追加する文字を入力してください (例: [x1]＋[x2]＝):");
            if (!itemData && (txt === null || txt.trim() === "")) return;
            el.classList.add('text-rect');
            wrapper.dataset.originalContent = txt; 
            wrapper.dataset.digits = itemData ? (itemData.digits || 0) : 0;
            wrapper.dataset.fontSize = itemData ? (itemData.fontSize || 1.0) : 1.0; 
            
            if (/^\s*\[[^\]]+\]\s*$/.test(txt)) {
                el.classList.add('single-var-text');
            }

            // ★変更: bindDoubleTapを使用
            const textHandler = (e) => {
                if (!isEditMode) return; 
                e.stopPropagation();
                activeTextWrapper = wrapper;
                document.getElementById('text-prop-content').value = wrapper.dataset.originalContent;
                document.getElementById('text-prop-size').value = wrapper.dataset.fontSize || 1.0; 
                document.getElementById('text-prop-digits').value = wrapper.dataset.digits;
                document.getElementById('text-prop-container').style.display = 'flex';
                document.getElementById('overlay').style.display = 'block';
            };
            bindDoubleTap(el, textHandler);
            
            wrapper.appendChild(el);
            if (typeof window.renderText === 'function') window.renderText(wrapper);

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
    
    const dragStart = (e) => {
        if (!isEditMode && type !== 'answer' && type !== 'check') return; 
        if (e.target.classList.contains('resize-handle') || e.target.classList.contains('line-handle')) return; 

        isDragging = true;
        hasMoved = false;
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        startX = clientX;
        startY = clientY;

        if (isEditMode) {
            if (!wrapper.classList.contains('wrapper-selected')) {
                document.querySelectorAll('.wrapper-selected').forEach(w => w.classList.remove('wrapper-selected'));
                wrapper.classList.add('wrapper-selected');
            }

            window.activeDragItems = [];
            const selectedItems = document.querySelectorAll('.wrapper-selected');
            selectedItems.forEach(item => {
                const itemType = item.dataset.type;
                if (itemType === 'line') {
                    const lineEl = item.querySelector('line');
                    if (lineEl) lineEl.style.cursor = 'grabbing';
                    window.activeDragItems.push({
                        element: item,
                        type: 'line',
                        lineInitialStartX: parseFloat(item.dataset.startX),
                        lineInitialStartY: parseFloat(item.dataset.startY),
                        lineInitialEndX: parseFloat(item.dataset.endX),
                        lineInitialEndY: parseFloat(item.dataset.endY)
                    });
                } else {
                    const innerDiv = item.querySelector('div');
                    if (innerDiv && itemType !== 'check') innerDiv.style.cursor = 'grabbing';
                    window.activeDragItems.push({
                        element: item,
                        type: itemType,
                        initialGridX: parseInt(item.dataset.gridX) || 0,
                        initialGridY: parseInt(item.dataset.gridY) || 0,
                        wCells: parseInt(item.dataset.wCells) || 2,
                        hCells: parseInt(item.dataset.hCells) || 2
                    });
                }
            });
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

        const dxCells = (clientX - startX) / (cRect.width / 32);
        const dyCells = (clientY - startY) / (cRect.height / 24);
        
        let snapDx = Math.round(dxCells);
        let snapDy = Math.round(dyCells);
        
        let lineSnapDx = Math.round(dxCells * 2) / 2;
        let lineSnapDy = Math.round(dyCells * 2) / 2;

        if (window.activeDragItems) {
            window.activeDragItems.forEach(dragData => {
                const item = dragData.element;
                if (dragData.type === 'line') {
                    item.dataset.startX = dragData.lineInitialStartX + lineSnapDx;
                    item.dataset.startY = dragData.lineInitialStartY + lineSnapDy;
                    item.dataset.endX = dragData.lineInitialEndX + lineSnapDx;
                    item.dataset.endY = dragData.lineInitialEndY + lineSnapDy;
                    if (typeof window.updateLineVisuals === 'function') window.updateLineVisuals(item);
                } else {
                    let newGridX = dragData.initialGridX + snapDx;
                    let newGridY = dragData.initialGridY + snapDy;
                    
                    newGridX = Math.max(0, Math.min(newGridX, 32 - dragData.wCells));
                    newGridY = Math.max(0, Math.min(newGridY, 24 - dragData.hCells));
                    
                    item.dataset.gridX = newGridX;
                    item.dataset.gridY = newGridY;
                    item.style.left = `calc(${newGridX} * (100% / 32))`;
                    item.style.top = `calc(${newGridY} * (100% / 24))`;
                }
            });
        }
    };

    document.addEventListener('mousemove', handleItemMove, { passive: false });
    document.addEventListener('touchmove', handleItemMove, { passive: false });

    const dragEnd = (e) => {
        if (!isDragging) return;
        isDragging = false;
        
        if (isEditMode && window.activeDragItems) {
            window.activeDragItems.forEach(dragData => {
                const item = dragData.element;
                if (dragData.type === 'line') {
                    const lineEl = item.querySelector('line');
                    if (lineEl) lineEl.style.cursor = 'grab';
                } else if (dragData.type !== 'check') {
                    const innerDiv = item.querySelector('div');
                    if (innerDiv) innerDiv.style.cursor = 'grab';
                }
            });
            window.activeDragItems = null;
        }

        if (!hasMoved) {
            if (type === 'answer' && !isEditMode) {
                const digits = parseInt(wrapper.dataset.digits) || 0;
                if (digits > 0) {
                    const cell = e.target.closest('.split-cell');
                    if (cell && wrapper.contains(cell)) {
                        activeInputBox = cell;
                    } else {
                        return; 
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
                
                calcContainer.style.transform = 'none'; 
                const targetRect = activeInputBox.getBoundingClientRect();
                const calcRect = calcContainer.getBoundingClientRect();
                
                let left = targetRect.left;
                let top = targetRect.bottom + 10; 
                
                if (top + calcRect.height > window.innerHeight) {
                    top = targetRect.top - calcRect.height - 10;
                }
                if (left + calcRect.width > window.innerWidth) {
                    left = window.innerWidth - calcRect.width - 10;
                }
                if (top < 0) top = 10;
                if (left < 0) left = 10;
                
                calcContainer.style.left = left + 'px';
                calcContainer.style.top = top + 'px';
                
            } else if (type === 'check') {
                if (!isEditMode) {
                    if (isSolved) {
                        if (typeof window.loadNextProblem === 'function') {
                            window.loadNextProblem();
                        }
                    } else {
                        runValidation();
                    }
                } else {
                    if (!e.shiftKey) {
                        document.querySelectorAll('.wrapper-selected').forEach(w => w.classList.remove('wrapper-selected'));
                    }
                    wrapper.classList.add('wrapper-selected');
                }
            } else if (isEditMode) {
                if (!e.shiftKey) {
                    document.querySelectorAll('.wrapper-selected').forEach(w => w.classList.remove('wrapper-selected'));
                }
                wrapper.classList.add('wrapper-selected');
            }
        }
    };

    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('touchend', dragEnd);
}