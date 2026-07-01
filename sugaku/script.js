const container = document.getElementById('container');
let count = 0;
let isEditMode = true;
let currentVarValues = {}; 
let variableRanges = {};
let activeAnsWrapper = null;
let activeLineWrapper = null; // 直線プロパティ用

// グリッド背景の生成
for (let i = 0; i < 32 * 24; i++) {
    const cell = document.createElement('div');
    cell.classList.add('grid-cell');
    container.appendChild(cell);
}

/* ==========================================
   電卓パネル構築とロジック
   ========================================== */
const overlay = document.getElementById('overlay');
const calcContainer = document.getElementById('calc-container');
const calc0to20View = document.getElementById('calc-0-20-view');
const calcStandardView = document.getElementById('calc-standard-view');
const stdCalcDisplay = document.getElementById('std-calc-display');

let activeInputBox = null;
let stdCalcValue = "";

// 0〜20電卓パネル
const numPad = document.createElement('div');
numPad.className = 'num-pad';
for (let i = 0; i <= 20; i++) {
    const piece = document.createElement('div');
    piece.className = 'piece';
    piece.textContent = i;
    piece.addEventListener('click', () => {
        if (activeInputBox) {
            activeInputBox.textContent = i;
            calcContainer.style.display = 'none';
            overlay.style.display = 'none';
            activeInputBox = null;
        }
    });
    numPad.appendChild(piece);
}
calc0to20View.appendChild(numPad);

// 即決0-9電卓パネル
const quickPadInner = document.getElementById('quick-pad-inner');
for (let i = 0; i <= 9; i++) {
    const piece = document.createElement('div');
    piece.className = 'piece quick-btn';
    piece.textContent = i;
    piece.dataset.val = i;
    piece.addEventListener('click', (e) => {
        if (!activeInputBox) return;
        activeInputBox.textContent = e.target.dataset.val;
        calcContainer.style.display = 'none';
        overlay.style.display = 'none';
        activeInputBox = null;
    });
    quickPadInner.appendChild(piece);
}

// 通常電卓パネル
document.querySelectorAll('.std-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (!activeInputBox) return;
        const val = e.target.dataset.val;
        
        if (val === 'C') {
            stdCalcValue = "";
        } else if (val === 'BS') {
            stdCalcValue = stdCalcValue.slice(0, -1);
        } else if (val === 'OK') {
            activeInputBox.textContent = stdCalcValue;
            calcContainer.style.display = 'none';
            overlay.style.display = 'none';
            activeInputBox = null;
            return;
        } else if (val === '-') {
            if (stdCalcValue.startsWith('-')) {
                stdCalcValue = stdCalcValue.substring(1);
            } else {
                stdCalcValue = '-' + stdCalcValue;
            }
        } else if (val === '.') {
            if (!stdCalcValue.includes('.')) stdCalcValue += '.';
        } else {
            stdCalcValue += val;
        }
        
        stdCalcDisplay.textContent = stdCalcValue;
    });
});

// モーダル外部クリックによる非表示
overlay.addEventListener('click', () => {
    calcContainer.style.display = 'none';
    document.getElementById('var-settings-container').style.display = 'none';
    document.getElementById('ans-prop-container').style.display = 'none';
    document.getElementById('line-prop-container').style.display = 'none';
    overlay.style.display = 'none';
    activeInputBox = null;
    activeAnsWrapper = null;
    activeLineWrapper = null;
});

// モーダルドラッグ機能
let isCalcDragging = false;
let calcDragStartX, calcDragStartY, calcInitialLeft, calcInitialTop;
let currentDragTarget = null;

function startModalDrag(e) {
    if (e.target.classList.contains('piece') || e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'select') return;
    isCalcDragging = true;
    currentDragTarget = e.currentTarget;
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let clientY = e.touches ? e.touches[0].clientY : e.clientY;
    calcDragStartX = clientX;
    calcDragStartY = clientY;
    let style = window.getComputedStyle(currentDragTarget);
    calcInitialLeft = parseFloat(style.left);
    calcInitialTop = parseFloat(style.top);
}

function doModalDrag(e) {
    if (!isCalcDragging || !currentDragTarget) return;
    e.preventDefault();
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let clientY = e.touches ? e.touches[0].clientY : e.clientY;
    let dx = clientX - calcDragStartX;
    let dy = clientY - calcDragStartY;
    currentDragTarget.style.left = (calcInitialLeft + dx) + 'px';
    currentDragTarget.style.top = (calcInitialTop + dy) + 'px';
}

function stopModalDrag() {
    isCalcDragging = false;
    currentDragTarget = null;
}

const modals = [
    calcContainer, 
    document.getElementById('var-settings-container'), 
    document.getElementById('ans-prop-container'),
    document.getElementById('line-prop-container')
];
modals.forEach(modal => {
    modal.addEventListener('mousedown', startModalDrag);
    modal.addEventListener('touchstart', startModalDrag, { passive: false });
});
document.addEventListener('mousemove', doModalDrag, { passive: false });
document.addEventListener('mouseup', stopModalDrag);
document.addEventListener('touchmove', doModalDrag, { passive: false });
document.addEventListener('touchend', stopModalDrag);


/* ==========================================
   グローバルリサイズ・ハンドルドラッグ機能
   ========================================== */
let activeResizeWrapper = null;
let activeHandlePos = '';
let rStartX, rStartY;
let rStartWCells, rStartHCells, rStartGridX, rStartGridY;

let activeLineHandleData = null; // { wrapper: element, type: 'start'|'end' }

const handleGlobalMove = (e) => {
    if (!isEditMode) return;
    
    // 箱などのリサイズ処理
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
        if (activeHandlePos.includes('l')) {
            newW = rStartWCells - deltaGridX;
            newX = rStartGridX + deltaGridX;
        }
        if (activeHandlePos.includes('b')) newH = rStartHCells + deltaGridY;
        if (activeHandlePos.includes('t')) {
            newH = rStartHCells - deltaGridY;
            newY = rStartGridY + deltaGridY;
        }
        
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

    // 直線のハンドルドラッグ処理
    if (activeLineHandleData) {
        e.preventDefault();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        const cRect = container.getBoundingClientRect();
        let rawGridX = (clientX - cRect.left) / (cRect.width / 32);
        let rawGridY = (clientY - cRect.top) / (cRect.height / 24);
        
        // 0.5グリッド単位でスナップ
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

// 外部クリックによる選択解除
const deselectAll = (e) => {
    if (!e.target.closest('.draggable') && !e.target.closest('.resize-handle') && !e.target.closest('.line-handle') && !e.target.closest('.pieces-container') && !e.target.closest('.sidebar')) {
        document.querySelectorAll('.wrapper-selected').forEach(w => w.classList.remove('wrapper-selected'));
    }
};
document.addEventListener('mousedown', deselectAll);
document.addEventListener('touchstart', deselectAll);

// 選択中のアイテムを削除
document.getElementById('delete-item-btn').addEventListener('click', () => {
    const selected = document.querySelector('.wrapper-selected');
    if (selected) {
        if (confirm("選択中のアイテムを削除しますか？")) {
            selected.remove();
        }
    } else {
        alert("削除するアイテムを選択してください（クリックで選択）。");
    }
});

/* ==========================================
   直線のビジュアル更新関数 (グローバル)
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

/* ==========================================
   トースト判定演出と判定ロジック
   ========================================== */
const toast = document.createElement('div');
toast.className = 'toast-msg';
document.body.appendChild(toast);
let toastTimer = null;

function showToast(message) {
    if (toastTimer) clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

function runValidation() {
    const answers = Array.from(container.querySelectorAll('.draggable[data-type="answer"]'));
    const formulas = Array.from(container.querySelectorAll('.draggable[data-type="formula"]'));

    let allCorrect = true;
    let hasCheckable = false;

    // 解答欄の値をマップ化
    let ansValues = {};
    answers.forEach(wAns => {
        const id = wAns.dataset.answerId;
        const el = wAns.querySelector('.ans-rect');
        const normalizedId = id.replace(/[\[\]]/g, '');
        const val = parseFloat(el.textContent);
        ansValues[normalizedId] = isNaN(val) ? 0 : val;
    });

    // 桁数解析・合算関数（解答欄・変数 共通ロジック）
    const getCombinedValueForId = (id) => {
        const cleanId = id.replace(/[\[\]]/g, '');

        // 1. 解答欄の合算処理
        let totalAns = 0;
        let foundAns = false;
        for (const key in ansValues) {
            if (key.startsWith(cleanId + '-')) {
                const parts = key.split('-');
                const digit = parseInt(parts[parts.length - 1]);
                totalAns += ansValues[key] * Math.pow(10, digit - 1);
                foundAns = true;
            }
        }
        if (foundAns) return totalAns;
        if (ansValues.hasOwnProperty(cleanId)) return ansValues[cleanId];

        // 2. 変数の合算処理
        let totalVar = 0;
        let foundVar = false;
        for (const keyWithBracket in currentVarValues) {
            const k = keyWithBracket.replace(/[\[\]]/g, '');
            if (k.startsWith(cleanId + '-')) {
                const parts = k.split('-');
                const digit = parseInt(parts[parts.length - 1]);
                totalVar += currentVarValues[keyWithBracket] * Math.pow(10, digit - 1);
                foundVar = true;
            }
        }
        if (foundVar) return totalVar;
        const bracketId = '[' + cleanId + ']';
        if (currentVarValues.hasOwnProperty(bracketId)) return currentVarValues[bracketId];

        return 0; // 見つからない場合
    };

    formulas.forEach(wForm => {
        const formulaStr = wForm.querySelector('.formula-rect').textContent;
        const parts = formulaStr.split('=');
        
        if (parts.length === 2) {
            hasCheckable = true;
            const evaluateExpr = (expr) => {
                let e = expr.trim();
                // 変数と解答欄を区別なく合算して置換
                e = e.replace(/\[([^\]]+)\]/g, (match, id) => getCombinedValueForId(id));
                try {
                    return new Function(`return (${e})`)();
                } catch (err) {
                    return NaN;
                }
            };

            const left = evaluateExpr(parts[0]);
            const right = evaluateExpr(parts[1]);

            if (isNaN(left) || isNaN(right) || left !== right) {
                allCorrect = false;
            }
        }
    });

    if (!hasCheckable) {
        showToast("判定式がありません");
        return;
    }

    const anyEmpty = answers.some(w => w.querySelector('.ans-rect').textContent.trim() === "");
    if (anyEmpty) {
        showToast("まだ空欄があります");
    } else {
        showToast(allCorrect ? "正解！" : "おしい！");
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
        
        // 直線データの初期化
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
        line.style.pointerEvents = 'auto'; // ドラッグ・クリック可能に
        line.style.cursor = 'grab';
        
        // ダブルクリックでプロパティ表示
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
        
        // 始点・終点調整用ハンドル
        const hStart = document.createElement('div');
        hStart.classList.add('line-handle', 'line-handle-start', 'edit-only');
        const hEnd = document.createElement('div');
        hEnd.classList.add('line-handle', 'line-handle-end', 'edit-only');
        
        const startLineHandleDrag = (e, handleType) => {
            if (!isEditMode) return;
            e.stopPropagation(); // 線の本体ドラッグをキャンセル
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
        // 一般アイテム（箱・解答欄など）の構築
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

        } else if (type === 'answer') {
            el.classList.add('ans-rect');
            let defaultId = '';
            let calcMode = '0-20';
            if (itemData) {
                defaultId = itemData.answerId || itemData.content || '';
                calcMode = itemData.calcMode || '0-20';
                wrapper.dataset.formula = itemData.formula || ''; 
            } else {
                defaultId = '[q1]';
                wrapper.dataset.formula = '';
            }
            wrapper.dataset.answerId = defaultId;
            wrapper.dataset.calcMode = calcMode;
            el.textContent = defaultId; 

            el.addEventListener('dblclick', (e) => {
                if (!isEditMode) return; 
                e.stopPropagation();
                activeAnsWrapper = wrapper;
                document.getElementById('ans-prop-id').value = wrapper.dataset.answerId || "";
                document.getElementById('ans-prop-mode').value = wrapper.dataset.calcMode || "0-20";
                document.getElementById('ans-prop-container').style.display = 'flex';
                document.getElementById('overlay').style.display = 'block';
            });

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

        } else if (type === 'text') {
            let txt = itemData ? itemData.content : prompt("追加する文字を入力してください (例: [x1]＋[x2]＝):");
            if (!itemData && (txt === null || txt.trim() === "")) return;
            el.classList.add('text-rect');
            el.innerHTML = txt; 
            wrapper.dataset.originalContent = txt; 
            
            // 「変数のみ（例: [x1]）」かどうかの判定処理を追加
            if (/^\s*\[[^\]]+\]\s*$/.test(txt)) {
                el.classList.add('single-var-text');
            }

            el.addEventListener('dblclick', (e) => {
                if (!isEditMode) return; 
                e.stopPropagation();
                const currentTxt = wrapper.dataset.originalContent || el.innerHTML;
                const newTxt = prompt("文字を編集してください:", currentTxt);
                if (newTxt !== null && newTxt.trim() !== "") {
                    el.innerHTML = newTxt;
                    wrapper.dataset.originalContent = newTxt;
                    // 文字更新時にも判定を適用
                    if (/^\s*\[[^\]]+\]\s*$/.test(newTxt)) {
                        el.classList.add('single-var-text');
                    } else {
                        el.classList.remove('single-var-text');
                    }
                }
            });

        } else if (type === 'check') {
            el.classList.add('check-rect');
            el.textContent = "できた";
        }
        
        wrapper.appendChild(el);

        // 通常アイテムには四隅のリサイズハンドルを追加
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

    // アイテム本体のドラッグ移動ロジック
    let isDragging = false;
    let hasMoved = false;
    let startX, startY;
    
    // 直線移動用の変数
    let lineInitialStartX, lineInitialStartY, lineInitialEndX, lineInitialEndY;
    
    const dragStart = (e) => {
        if (!isEditMode && type !== 'answer' && type !== 'check') return; 
        // ハンドルをクリックした場合は本体ドラッグを無効化
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
            // 直線の平行移動（0.5グリッド単位）
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
            // 通常アイテムの移動
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
                activeInputBox = el;
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

// プロパティパネルの保存
document.getElementById('save-ans-prop-btn').addEventListener('click', () => {
    if (activeAnsWrapper) {
        const newId = document.getElementById('ans-prop-id').value.trim();
        const newMode = document.getElementById('ans-prop-mode').value;
        activeAnsWrapper.dataset.answerId = newId;
        activeAnsWrapper.dataset.calcMode = newMode;
        const el = activeAnsWrapper.querySelector('.ans-rect');
        if (el) el.textContent = newId;
    }
    document.getElementById('ans-prop-container').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    activeAnsWrapper = null;
});

document.getElementById('save-line-prop-btn').addEventListener('click', () => {
    if (activeLineWrapper) {
        activeLineWrapper.dataset.thickness = document.getElementById('line-prop-thickness').value;
        activeLineWrapper.dataset.lineColor = document.getElementById('line-prop-color').value;
        activeLineWrapper.dataset.lineStyle = document.getElementById('line-prop-style').value;
        window.updateLineVisuals(activeLineWrapper);
    }
    document.getElementById('line-prop-container').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    activeLineWrapper = null;
});

// 各種生成ボタンイベント
document.getElementById('add-box-btn').addEventListener('click', () => createDraggable('box'));
document.getElementById('add-ans-btn').addEventListener('click', () => createDraggable('answer'));
document.getElementById('add-formula-btn').addEventListener('click', () => createDraggable('formula'));
document.getElementById('add-text-btn').addEventListener('click', () => createDraggable('text'));
document.getElementById('add-line-btn').addEventListener('click', () => createDraggable('line')); // 直線追加
document.getElementById('add-check-btn').addEventListener('click', () => createDraggable('check'));

/* ==========================================
   変数設定機能
   ========================================== */
document.getElementById('var-settings-btn').addEventListener('click', () => {
    const answerWrappers = container.querySelectorAll('.draggable[data-type="answer"]');
    const knownAnswerIds = new Set();
    answerWrappers.forEach(w => {
        if (w.dataset.answerId) knownAnswerIds.add(w.dataset.answerId);
    });

    const textWrappers = container.querySelectorAll('.draggable[data-type="text"]');
    const foundVars = new Set();
    textWrappers.forEach(wrapper => {
        const content = wrapper.dataset.originalContent || wrapper.querySelector('.text-rect').textContent;
        const matches = content.match(/\[[^\]]+\]/g);
        if (matches) {
            matches.forEach(varName => {
                if (!knownAnswerIds.has(varName)) foundVars.add(varName);
            });
        }
    });

    const listContainer = document.getElementById('var-list-container');
    listContainer.innerHTML = ''; 

    if (foundVars.size === 0) {
        listContainer.innerHTML = '<p style="text-align:center; color:#555; font-weight:bold;">テキスト内に設定可能な変数が見つかりません。</p>';
    } else {
        foundVars.forEach(v => {
            const range = variableRanges[v] || { min: 1, max: 9, color: "#e74c3c", size: 1.0 };
            const row = document.createElement('div');
            row.className = 'prop-setting-row';
            row.style.flexWrap = 'wrap';
            row.innerHTML = `
                <strong style="font-size: 1.2rem; color:#333; width: 100%; margin-bottom: 8px; border-bottom: 1px solid #eee;">${v}</strong>
                <div style="display:flex; justify-content:space-between; width:100%; margin-bottom: 5px;">
                    <label style="font-weight:bold; color:#555; font-size:0.9rem;">Min: <input type="number" class="var-min-input prop-setting-input" data-var="${v}" value="${range.min}"></label>
                    <label style="font-weight:bold; color:#555; font-size:0.9rem;">Max: <input type="number" class="var-max-input prop-setting-input" data-var="${v}" value="${range.max}"></label>
                </div>
                <div style="display:flex; justify-content:space-between; width:100%;">
                    <label style="font-weight:bold; color:#555; font-size:0.9rem; display:flex; align-items:center;">色: <input type="color" class="var-color-input" data-var="${v}" value="${range.color}" style="margin-left:5px; border:none; width:30px; height:30px; cursor:pointer;"></label>
                    <label style="font-weight:bold; color:#555; font-size:0.9rem;">サイズ倍率: <input type="number" step="0.1" class="var-size-input prop-setting-input" data-var="${v}" value="${range.size}"></label>
                </div>
            `;
            listContainer.appendChild(row);
        });
    }
    document.getElementById('var-settings-container').style.display = 'flex';
    document.getElementById('overlay').style.display = 'block';
});

document.getElementById('save-var-settings-btn').addEventListener('click', () => {
    const listContainer = document.getElementById('var-list-container');
    const minInputs = listContainer.querySelectorAll('.var-min-input');
    const maxInputs = listContainer.querySelectorAll('.var-max-input');
    const colorInputs = listContainer.querySelectorAll('.var-color-input');
    const sizeInputs = listContainer.querySelectorAll('.var-size-input');
    
    minInputs.forEach((minInput, index) => {
        const v = minInput.dataset.var;
        variableRanges[v] = {
            min: parseInt(minInput.value) || 1,
            max: parseInt(maxInputs[index].value) || 9,
            color: colorInputs[index].value,
            size: parseFloat(sizeInputs[index].value) || 1.0
        };
    });
    document.getElementById('var-settings-container').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
});

// ==========================================
// レイアウトデータ生成関数（共通化）
// ==========================================
function generateLayoutData() {
    const data = [];
    data.push({ type: 'config', variableRanges: variableRanges });
    
    const wrappers = container.querySelectorAll('.draggable');
    wrappers.forEach(wrapper => {
        const type = wrapper.dataset.type;
        const el = wrapper.querySelector('div');
        
        let itemData = { type: type };
        
        if (type === 'line') {
            itemData.startX = parseFloat(wrapper.dataset.startX);
            itemData.startY = parseFloat(wrapper.dataset.startY);
            itemData.endX = parseFloat(wrapper.dataset.endX);
            itemData.endY = parseFloat(wrapper.dataset.endY);
            itemData.thickness = wrapper.dataset.thickness;
            itemData.lineColor = wrapper.dataset.lineColor;
            itemData.lineStyle = wrapper.dataset.lineStyle;
        } else {
            itemData.gridX = parseInt(wrapper.dataset.gridX) || 0;
            itemData.gridY = parseInt(wrapper.dataset.gridY) || 0;
            itemData.wCells = parseInt(wrapper.dataset.wCells) || 2;
            itemData.hCells = parseInt(wrapper.dataset.hCells) || 2;
            itemData.content = type === 'text' ? (wrapper.dataset.originalContent || (el ? el.innerHTML : '')) : (el ? el.textContent : '');
            
            if (type === 'answer') {
                itemData.answerId = wrapper.dataset.answerId || '';
                itemData.calcMode = wrapper.dataset.calcMode || '0-20';
                itemData.formula = wrapper.dataset.formula || ''; 
                itemData.content = ''; 
            }
        }
        data.push(itemData);
    });
    return data;
}

// モード切り替え
document.getElementById('run-btn').addEventListener('click', () => {
    const runBtn = document.getElementById('run-btn');
    isEditMode = !isEditMode;

    if (isEditMode) {
        document.body.classList.remove('run-mode');
        runBtn.textContent = '実行モードへ';
        runBtn.style.backgroundColor = '#2ecc71'; 

        const textWrappers = container.querySelectorAll('.draggable[data-type="text"]');
        textWrappers.forEach(wrapper => {
            const el = wrapper.querySelector('.text-rect');
            if (el && wrapper.dataset.originalContent) {
                el.innerHTML = wrapper.dataset.originalContent;
                // 編集モード復帰時にも「変数のみ」の判定を更新
                if (/^\s*\[[^\]]+\]\s*$/.test(wrapper.dataset.originalContent)) {
                    el.classList.add('single-var-text');
                } else {
                    el.classList.remove('single-var-text');
                }
            }
        });

        const answerWrappers = container.querySelectorAll('.draggable[data-type="answer"]');
        answerWrappers.forEach(wrapper => {
            const el = wrapper.querySelector('.ans-rect');
            if (el) el.textContent = wrapper.dataset.answerId || '';
        });
        currentVarValues = {};
    } else {
        document.body.classList.add('run-mode');
        runBtn.textContent = '編集モードへ戻る';
        runBtn.style.backgroundColor = '#e74c3c'; 
        
        document.querySelectorAll('.wrapper-selected').forEach(w => w.classList.remove('wrapper-selected'));
        currentVarValues = {};
        
        const answerWrappers = container.querySelectorAll('.draggable[data-type="answer"]');
        const knownAnswerIds = new Set();
        answerWrappers.forEach(w => {
            if (w.dataset.answerId) knownAnswerIds.add(w.dataset.answerId);
        });

        const textWrappers = container.querySelectorAll('.draggable[data-type="text"]');
        
        textWrappers.forEach(wrapper => {
            const el = wrapper.querySelector('.text-rect');
            if (el) {
                if (!wrapper.dataset.originalContent) wrapper.dataset.originalContent = el.innerHTML;
                const content = wrapper.dataset.originalContent;
                const matches = content.match(/\[[^\]]+\]/g);
                if (matches) {
                    matches.forEach(varName => {
                        if (!knownAnswerIds.has(varName) && !(varName in currentVarValues)) {
                            const range = variableRanges[varName] || { min: 1, max: 9 };
                            const min = range.min !== undefined ? range.min : 1;
                            const max = range.max !== undefined ? range.max : 9;
                            currentVarValues[varName] = Math.floor(Math.random() * (max - min + 1)) + min;
                        }
                    });
                }
            }
        });

        textWrappers.forEach(wrapper => {
            const el = wrapper.querySelector('.text-rect');
            if (el && wrapper.dataset.originalContent) {
                let replacedText = wrapper.dataset.originalContent;
                const sortedVars = Object.keys(currentVarValues).sort((a, b) => b.length - a.length);
                for (const varName of sortedVars) {
                    const val = currentVarValues[varName];
                    const range = variableRanges[varName] || { color: '#e74c3c', size: 1.0 };
                    const color = range.color || '#e74c3c';
                    const size = range.size || 1.0;
                    const styledHTML = `<span style="color:${color}; font-size:${size}em;">${val}</span>`;
                    replacedText = replacedText.split(varName).join(styledHTML);
                }
                el.innerHTML = replacedText;
            }
        });

        answerWrappers.forEach(wrapper => {
            const el = wrapper.querySelector('.ans-rect');
            if (el) el.textContent = ''; 
        });
    }
});

// JSON保存
document.getElementById('save-btn').addEventListener('click', () => {
    const data = generateLayoutData();
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'layout.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// 読込
document.getElementById('load-btn').addEventListener('click', () => {
    document.getElementById('load-file').click();
});

document.getElementById('load-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const data = JSON.parse(evt.target.result);
            container.querySelectorAll('.draggable').forEach(w => w.remove());
            count = 0; 
            variableRanges = {}; 
            
            data.forEach(item => {
                if (item.type === 'config') {
                    variableRanges = item.variableRanges || {};
                } else {
                    createDraggable(item.type, item);
                }
            });
        } catch (err) {
            alert("JSONファイルの読み込みに失敗しました。");
        }
        e.target.value = '';
    };
    reader.readAsText(file);
});

window.addEventListener('keydown', (e) => { if(e.key === 'F1') createDraggable('box'); });


/* ==========================================
   公開版書出 (HTMLエクスポート) 機能
   ========================================== */
document.getElementById('export-html-btn').addEventListener('click', () => {
    try {
        // 現在のレイアウトデータをJSON化
        const data = generateLayoutData();
        const jsonString = JSON.stringify(data);

        // 現在表示されているDOMをそのままメモリ上で複製（fetchを使わないのでCORSエラーを回避）
        const htmlClone = document.documentElement.cloneNode(true);

        // クローン側の不要な状態（現在のグリッドや配置アイテム）を一度空にする
        // ※読み込まれたときにscript.jsがデータを元に再生成するため
        const containerClone = htmlClone.querySelector('#container');
        if (containerClone) {
            containerClone.innerHTML = ''; 
        }
        
        // 既存のトーストメッセージがあれば削除（重複防止）
        const oldToast = htmlClone.querySelector('.toast-msg');
        if (oldToast) oldToast.remove(); 

        // 初期化用データ(__INIT_DATA__)を持ったスクリプトタグを作成し、<body>の先頭に埋め込む
        const initScript = document.createElement('script');
        initScript.textContent = `window.__INIT_DATA__ = ${jsonString};`;
        const bodyClone = htmlClone.querySelector('body');
        bodyClone.insertBefore(initScript, bodyClone.firstChild);

        // クローンから完全なHTML文字列を生成
        const htmlText = "<!DOCTYPE html>\n" + htmlClone.outerHTML;

        // ダウンロード処理
        const blob = new Blob([htmlText], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'published_grid.html'; // 公開用ファイル名
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (e) {
        console.error(e);
        alert("書き出しに失敗しました: " + e.message);
    }
});

/* ==========================================
   公開版HTMLとしての初期化処理
   ========================================== */
// エクスポートされたHTMLを開いた時にのみ実行されるブロック
if (window.__INIT_DATA__) {
    // 実行ボタンを先に取得しておく
    const runBtn = document.getElementById('run-btn');

    // 編集用サイドバーを非表示（ユーザーの誤操作を防止）
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.style.display = 'none';

    // 既存のアイテムを念のためクリア
    container.querySelectorAll('.draggable').forEach(w => w.remove());
    count = 0; 
    variableRanges = {}; 
    
    // 埋め込まれたレイアウトデータからアイテムを復元
    window.__INIT_DATA__.forEach(item => {
        if (item.type === 'config') {
            variableRanges = item.variableRanges || {};
        } else {
            createDraggable(item.type, item);
        }
    });

    // 自動的に実行モードへ移行
    if (runBtn) {
        runBtn.click(); // これにより内部でisEditMode = falseとなり、変数が展開される
    }
}