/* ==========================================
   script_core.js (システム基盤・グローバルUI管理)
   ========================================== */
const container = document.getElementById('container');
let count = 0;
let isEditMode = true;
let currentVarValues = {}; 
let variableRanges = {};
let activeAnsWrapper = null;
let activeTextWrapper = null;
let activeLineWrapper = null; 
let activeBoxWrapper = null; 
let activeFormulaWrapper = null; 
let isSolved = false; 

window.currentQuestionNum = 1;
window.MAX_QUESTIONS = 10;
window.usedVarHistory = new Set();
window.lastCheckTime = 0;
window.transitionStyle = 'none'; 
window.playMode = 'pattern2'; 
window.orderStyle = 'random'; // ★追加: 出題順序の設定
window.csvLinesForRun = [];   

window.mistakeCount = 0;
window.isToastShowing = false;

window.judgeSettings = {
    correct: { text: "せいかい！", color: "#ff3333", stroke: "#000000", bg: "transparent" },
    incorrect: { text: "おしい！", color: "#3366ff", stroke: "#000000", bg: "transparent" }
};

const bindDoubleTap = (element, handler) => {
    element.addEventListener('dblclick', handler);
    let lastTap = 0;
    element.addEventListener('touchend', (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength > 0 && tapLength < 350) {
            handler(e);
            lastTap = 0; 
        } else {
            lastTap = currentTime;
        }
    });
};

for (let i = 0; i < 32 * 24; i++) {
    const cell = document.createElement('div');
    cell.classList.add('grid-cell');
    container.appendChild(cell);
}

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
if (quickPadInner) {
    quickPadInner.innerHTML = '';
    const quickLayout = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', 'C'];
    quickLayout.forEach(val => {
        const piece = document.createElement('div');
        piece.className = 'piece quick-btn';
        piece.textContent = val;
        piece.dataset.val = val;
        
        if (val === 'C') {
            piece.style.backgroundColor = '#e74c3c';
            piece.style.color = 'white';
            piece.style.borderColor = '#c0392b';
            piece.style.boxShadow = '0 4px 0 #c0392b';
        } else if (val === '0') {
            piece.style.gridColumn = 'span 2';
        }

        piece.addEventListener('click', (e) => {
            if (!activeInputBox) return;
            const clickedVal = e.target.dataset.val;
            if (clickedVal === 'C') {
                activeInputBox.textContent = ''; 
            } else {
                activeInputBox.textContent = clickedVal;
            }
            calcContainer.style.display = 'none';
            overlay.style.display = 'none';
            activeInputBox = null;
        });
        quickPadInner.appendChild(piece);
    });
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
    const boxProp = document.getElementById('box-prop-container');
    if (boxProp) boxProp.style.display = 'none';
    const formulaProp = document.getElementById('formula-prop-container');
    if (formulaProp) formulaProp.style.display = 'none';
    const judgeProp = document.getElementById('judge-prop-container');
    if (judgeProp) judgeProp.style.display = 'none';
    
    overlay.style.display = 'none';
    
    activeInputBox = null;
    activeAnsWrapper = null;
    activeTextWrapper = null;
    activeLineWrapper = null;
    activeBoxWrapper = null;
    activeFormulaWrapper = null;
});

let isCalcDragging = false;
let calcDragStartX, calcDragStartY, calcInitialLeft, calcInitialTop;
let currentDragTarget = null;

function startModalDrag(e) {
    if (e.target.classList.contains('piece') || e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'select' || e.target.tagName.toLowerCase() === 'textarea') return;
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
    document.getElementById('line-prop-container'),
    document.getElementById('box-prop-container'),
    document.getElementById('formula-prop-container'),
    document.getElementById('judge-prop-container')
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

const toast = document.createElement('div');
toast.className = 'toast-msg';
document.body.appendChild(toast);
let toastTimer = null;

function showToast(message, type = 'system') {
    if (toastTimer) clearTimeout(toastTimer);
    toast.textContent = message;
    
    toast.style.color = '';
    toast.style.backgroundColor = '';
    toast.style.webkitTextStroke = '';
    toast.className = 'toast-msg'; 
    
    if (type === 'correct' || type === 'incorrect') {
        const settings = window.judgeSettings[type];
        toast.style.color = settings.color;
        toast.style.backgroundColor = settings.bg;
        toast.style.webkitTextStroke = `3px ${settings.stroke}`;
        toast.classList.add('judge-toast'); 
    }
    
    toast.classList.add('show');
    window.isToastShowing = true; 

    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
        window.isToastShowing = false; 
    }, 2500);
}
window.showToast = showToast; 

const hideToast = (e) => {
    if (toast.classList.contains('show') && !e.target.closest('.check-rect')) {
        toast.classList.remove('show');
        if (toastTimer) clearTimeout(toastTimer);
        window.isToastShowing = false; 
    }
};
document.addEventListener('mousedown', hideToast);
document.addEventListener('touchstart', hideToast, { passive: true });