/* ==========================================
   script_drag.js (グローバルリサイズ・矩形選択・全体操作)
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
        if (typeof window.updateLineVisuals === 'function') window.updateLineVisuals(wrapper);
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