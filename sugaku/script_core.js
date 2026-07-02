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
                activeInputBox.textContent = ''; // クリア処理
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

/* ==========================================
   レンダリング関数 (文字＆解答欄の分割対応)
   ========================================== */
function renderText(wrapper) {
    const el = wrapper.querySelector('.text-rect');
    if (!el) return;
    const digits = parseInt(wrapper.dataset.digits) || 0;
    // ★追加: フォントサイズのプロパティを取得
    const fontSize = parseFloat(wrapper.dataset.fontSize) || 1.0; 
    const originalContent = wrapper.dataset.originalContent || '';
    
    // ★追加: CSSカスタムプロパティに倍率をセット
    wrapper.style.setProperty('--text-scale', fontSize);
    
    el.innerHTML = '';
    
    if (isEditMode) {
        if (digits > 0) {
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
                    const cellWrapper = document.createElement('div');
                    cellWrapper.className = 'split-cell-wrapper';
                    const cell = document.createElement('div');
                    cell.className = 'split-cell';
                    let char = valStr[i] === ' ' ? '' : valStr[i];
                    cell.innerHTML = char !== '' ? `<span style="color:${range.color}; font-size:${range.size}em;">${char}</span>` : '';
                    cellWrapper.appendChild(cell);
                    container.appendChild(cellWrapper);
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
window.renderText = renderText; // グローバルアクセス用

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
            if (typeof window.renderAnswer === 'function') window.renderAnswer(wrapper);

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
            // ★追加: フォントサイズのプロパティを読み込み設定
            wrapper.dataset.fontSize = itemData ? (itemData.fontSize || 1.0) : 1.0; 
            
            if (/^\s*\[[^\]]+\]\s*$/.test(txt)) {
                el.classList.add('single-var-text');
            }

            el.addEventListener('dblclick', (e) => {
                if (!isEditMode) return; 
                e.stopPropagation();
                activeTextWrapper = wrapper;
                document.getElementById('text-prop-content').value = wrapper.dataset.originalContent;
                // ★追加: プロパティパネルにフォントサイズを表示
                document.getElementById('text-prop-size').value = wrapper.dataset.fontSize || 1.0; 
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