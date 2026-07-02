const container = document.getElementById('container');
let count = 0;
let isEditMode = true;
let currentVarValues = {}; 
let variableRanges = {};
let activeAnsWrapper = null;
let activeTextWrapper = null;
let activeLineWrapper = null; 
let isSolved = false; // 正解状態を管理するフラグ

// ---- 新規追加: 10問対応用の状態管理 ----
window.currentQuestionNum = 1;
window.MAX_QUESTIONS = 10;
window.usedVarHistory = new Set();
// ----------------------------------------

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

// 画面クリックでトーストを即座にフェードアウト
const hideToast = (e) => {
    // できた/次の問題へボタンをクリックした際は、判定処理と被らないよう除外します
    if (toast.classList.contains('show') && !e.target.closest('.check-rect')) {
        toast.classList.remove('show');
        if (toastTimer) clearTimeout(toastTimer);
    }
};
document.addEventListener('mousedown', hideToast);
document.addEventListener('touchstart', hideToast, { passive: true });

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
            const vals = cells.map(c => c.textContent.trim());
            
            // 左から見て、最初に入力されているマスのインデックスを取得
            const firstFilled = vals.findIndex(v => v !== "");
            
            if (firstFilled === -1) {
                val = NaN; // すべて空欄
            } else {
                let isValid = true;
                // 最初に入力された桁より「下（右側）」の桁に空欄がないかチェック
                for (let i = firstFilled + 1; i < vals.length; i++) {
                    if (vals[i] === "") isValid = false; 
                }
                val = isValid ? parseFloat(vals.slice(firstFilled).join('')) : NaN;
            }
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

    // --- 空欄チェックロジック（新形式・旧形式の両対応） ---
    let hasEmpty = false;
    let groupStatus = {}; 

    answers.forEach(w => {
        const id = w.dataset.answerId;
        const el = w.querySelector('.ans-rect');
        const digits = parseInt(w.dataset.digits) || 0;
        
        if (digits > 0) {
            const cells = Array.from(el.querySelectorAll('.split-cell'));
            const vals = cells.map(c => c.textContent.trim());
            const firstFilled = vals.findIndex(v => v !== "");
            
            if (firstFilled === -1) {
                hasEmpty = true; 
            } else {
                for (let i = firstFilled + 1; i < vals.length; i++) {
                    if (vals[i] === "") hasEmpty = true; 
                }
            }
        } else {
            const cleanId = id.replace(/[\[\]]/g, '');
            const val = el.textContent.trim();
            const match = cleanId.match(/^(.+)-(\d+)$/);
            
            if (match) {
                const baseId = match[1];
                const digit = parseInt(match[2]);
                if (!groupStatus[baseId]) groupStatus[baseId] = [];
                groupStatus[baseId][digit] = val; 
            } else {
                if (val === "") hasEmpty = true;
            }
        }
    });

    for (const baseId in groupStatus) {
        const arr = groupStatus[baseId];
        let started = false;
        let allEmpty = true;
        
        const maxDigit = arr.length - 1;
        for (let i = maxDigit; i >= 1; i--) {
            const val = arr[i] === undefined ? "" : arr[i];
            
            if (val !== "") {
                started = true;
                allEmpty = false;
            } else {
                if (started) {
                    hasEmpty = true; 
                }
            }
        }
        if (allEmpty) hasEmpty = true; 
    }

    if (hasEmpty) {
        showToast("まだ空欄があります");
    } else {
        if (allCorrect) {
            showToast("正解！");
            isSolved = true;
            const checkRect = document.querySelector('.check-rect');
            if (checkRect) checkRect.textContent = "次の問題へ";
        } else {
            showToast("おしい！");
        }
    }
}

// ---- 追加: 重複しない変数の生成と10問制御・結果表示 ----
window.generateProblemVars = function() {
    const textWrappers = container.querySelectorAll('.draggable[data-type="text"]');
    const answerWrappers = container.querySelectorAll('.draggable[data-type="answer"]');
    const knownAnswerIds = new Set();
    answerWrappers.forEach(w => {
        if (w.dataset.answerId) knownAnswerIds.add(w.dataset.answerId);
    });

    let newVars = {};
    let attempts = 0;
    let signature = "";
    
    // 過去の出題と被らないよう最大100回試行
    do {
        newVars = {};
        textWrappers.forEach(wrapper => {
            const content = wrapper.dataset.originalContent;
            if (content) {
                const matches = content.match(/\[[^\]]+\]/g);
                if (matches) {
                    matches.forEach(varName => {
                        if (!knownAnswerIds.has(varName) && !(varName in newVars)) {
                            const range = variableRanges[varName] || { min: 1, max: 9 };
                            const min = range.min !== undefined ? range.min : 1;
                            const max = range.max !== undefined ? range.max : 9;
                            newVars[varName] = Math.floor(Math.random() * (max - min + 1)) + min;
                        }
                    });
                }
            }
        });
        
        signature = JSON.stringify(newVars, Object.keys(newVars).sort());
        attempts++;
    } while (window.usedVarHistory.has(signature) && Object.keys(newVars).length > 0 && attempts < 100);

    if (Object.keys(newVars).length > 0) {
        window.usedVarHistory.add(signature);
    }
    currentVarValues = newVars;
};

window.loadNextProblem = function() {
    if (window.currentQuestionNum >= window.MAX_QUESTIONS) {
        window.showResultScreen();
        return;
    }
    
    window.currentQuestionNum++;
    isSolved = false;
    const checkRect = document.querySelector('.check-rect');
    if (checkRect) checkRect.textContent = "できた";

    const toastMsg = document.querySelector('.toast-msg');
    if (toastMsg) toastMsg.classList.remove('show');

    // 次の問題の変数を生成してUI更新
    window.generateProblemVars();
    const textWrappers = container.querySelectorAll('.draggable[data-type="text"]');
    const answerWrappers = container.querySelectorAll('.draggable[data-type="answer"]');
    textWrappers.forEach(wrapper => window.renderText ? window.renderText(wrapper) : renderText(wrapper));
    answerWrappers.forEach(wrapper => window.renderAnswer ? window.renderAnswer(wrapper) : renderAnswer(wrapper));
};

window.showResultScreen = function() {
    const toastMsg = document.querySelector('.toast-msg');
    if (toastMsg) toastMsg.classList.remove('show');

    let resultOverlay = document.getElementById('result-overlay');
    if (!resultOverlay) {
        resultOverlay = document.createElement('div');
        resultOverlay.id = 'result-overlay';
        resultOverlay.style.position = 'fixed';
        resultOverlay.style.top = '0';
        resultOverlay.style.left = '0';
        resultOverlay.style.width = '100%';
        resultOverlay.style.height = '100%';
        resultOverlay.style.backgroundColor = 'rgba(0,0,0,0.85)';
        resultOverlay.style.color = '#fff';
        resultOverlay.style.display = 'flex';
        resultOverlay.style.flexDirection = 'column';
        resultOverlay.style.justifyContent = 'center';
        resultOverlay.style.alignItems = 'center';
        resultOverlay.style.zIndex = '3000';
        
        const title = document.createElement('h1');
        title.textContent = '全' + window.MAX_QUESTIONS + '問 クリア！';
        title.style.fontSize = '4rem';
        title.style.marginBottom = '20px';
        title.style.textShadow = '0 0 10px rgba(255,255,255,0.5)';
        
        const subText = document.createElement('p');
        subText.textContent = '素晴らしい結果です！お疲れ様でした。';
        subText.style.fontSize = '1.5rem';
        subText.style.marginBottom = '40px';

        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '20px';

        const replayBtn = document.createElement('button');
        replayBtn.textContent = 'もう一度プレイ';
        replayBtn.style.padding = '15px 30px';
        replayBtn.style.fontSize = '1.2rem';
        replayBtn.style.backgroundColor = '#3498db';
        replayBtn.style.color = '#fff';
        replayBtn.style.border = 'none';
        replayBtn.style.borderRadius = '8px';
        replayBtn.style.cursor = 'pointer';
        replayBtn.style.fontWeight = 'bold';
        replayBtn.onclick = () => {
            resultOverlay.style.display = 'none';
            if (typeof window.enterRunMode === 'function') window.enterRunMode();
        };

        const editBtn = document.createElement('button');
        editBtn.textContent = '編集に戻る';
        editBtn.style.padding = '15px 30px';
        editBtn.style.fontSize = '1.2rem';
        editBtn.style.backgroundColor = '#e74c3c';
        editBtn.style.color = '#fff';
        editBtn.style.border = 'none';
        editBtn.style.borderRadius = '8px';
        editBtn.style.cursor = 'pointer';
        editBtn.style.fontWeight = 'bold';
        editBtn.onclick = () => {
            resultOverlay.style.display = 'none';
            if (typeof window.enterEditMode === 'function') window.enterEditMode();
            const runBtn = document.getElementById('run-btn');
            if (runBtn) { runBtn.textContent = '実行モードへ'; runBtn.style.backgroundColor = '#2ecc71'; }
        };
        
        btnContainer.appendChild(replayBtn);
        btnContainer.appendChild(editBtn);
        resultOverlay.appendChild(title);
        resultOverlay.appendChild(subText);
        resultOverlay.appendChild(btnContainer);
        document.body.appendChild(resultOverlay);
    }
    resultOverlay.style.display = 'flex';
};