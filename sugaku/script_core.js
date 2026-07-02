const container = document.getElementById('container');
let count = 0;
let isEditMode = true;
let currentVarValues = {}; 
let variableRanges = {};
let activeAnsWrapper = null;
let activeTextWrapper = null;
let activeLineWrapper = null; 

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

if (calc0to20View) calc0to20View.innerHTML = '';
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

const quickPadInner = document.getElementById('quick-pad-inner');
if (quickPadInner) quickPadInner.innerHTML = '';
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

overlay.addEventListener('click', () => {
    if (calcContainer) calcContainer.style.display = 'none';
    const varSet = document.getElementById('var-settings-container');
    if (varSet) varSet.style.display = 'none';
    const ansProp = document.getElementById('ans-prop-container');
    if (ansProp) ansProp.style.display = 'none';
    const textProp = document.getElementById('text-prop-container');
    if (textProp) textProp.style.display = 'none';
    const lineProp = document.getElementById('line-prop-container');
    if (lineProp) lineProp.style.display = 'none';
    overlay.style.display = 'none';
    activeInputBox = null;
    activeAnsWrapper = null;
    activeTextWrapper = null;
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
    document.getElementById('text-prop-container'),
    document.getElementById('line-prop-container')
];
modals.forEach(modal => {
    if (modal) {
        modal.addEventListener('mousedown', startModalDrag);
        modal.addEventListener('touchstart', startModalDrag, { passive: false });
    }
});
document.addEventListener('mousemove', doModalDrag, { passive: false });
document.addEventListener('mouseup', stopModalDrag);
document.addEventListener('touchmove', doModalDrag, { passive: false });
document.addEventListener('touchend', stopModalDrag);

/* ==========================================
   トースト演出と判定ロジック
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

    let ansValues = {};
    answers.forEach(wAns => {
        const id = wAns.dataset.answerId;
        const el = wAns.querySelector('.ans-rect');
        const normalizedId = id.replace(/[\[\]]/g, '');
        const digits = parseInt(wAns.dataset.digits) || 0;
        
        let val;
        if (digits > 0) {
            const cells = Array.from(el.querySelectorAll('.split-cell'));
            const str = cells.map(c => c.textContent.trim()).join('');
            val = str === "" ? NaN : parseFloat(str);
        } else {
            val = parseFloat(el.textContent);
        }
        ansValues[normalizedId] = isNaN(val) ? 0 : val;
    });

    const getCombinedValueForId = (id) => {
        const cleanId = id.replace(/[\[\]]/g, '');

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

        return 0; 
    };

    formulas.forEach(wForm => {
        const formulaStr = wForm.querySelector('.formula-rect').textContent;
        const parts = formulaStr.split('=');
        if (parts.length === 2) {
            hasCheckable = true;
            const evaluateExpr = (expr) => {
                let e = expr.trim();
                e = e.replace(/\[([^\]]+)\]/g, (match, id) => getCombinedValueForId(id));
                try { return new Function(`return (${e})`)(); } catch (err) { return NaN; }
            };
            const left = evaluateExpr(parts[0]);
            const right = evaluateExpr(parts[1]);
            if (isNaN(left) || isNaN(right) || left !== right) allCorrect = false;
        }
    });

    if (!hasCheckable) {
        showToast("判定式がありません");
        return;
    }

    const anyEmpty = answers.some(w => {
        const el = w.querySelector('.ans-rect');
        const digits = parseInt(w.dataset.digits) || 0;
        if (digits > 0) {
            const cells = Array.from(el.querySelectorAll('.split-cell'));
            const str = cells.map(c => c.textContent.trim()).join('');
            return str === ""; 
        } else {
            return el.textContent.trim() === "";
        }
    });

    if (anyEmpty) {
        showToast("まだ空欄があります");
    } else {
        showToast(allCorrect ? "正解！" : "おしい！");
    }
}