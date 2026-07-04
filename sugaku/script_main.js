/* ==========================================
   script_main.js (UIイベント・保存・エクスポート・複数ページ管理・出題エンジン)
   ========================================== */
window.enableEmptyCheck = window.enableEmptyCheck || false; 
window.problemSet = [ [] ]; 
window.currentEditPage = 0;
window.runProblemSet = [];
window.playMode = window.playMode || 'pattern2';

function addClick(id, handler) {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', handler);
}

/* --- プロパティ保存 --- */
addClick('save-box-prop-btn', () => {
    if (activeBoxWrapper) {
        activeBoxWrapper.dataset.boxName = document.getElementById('box-prop-name').value.trim();
        activeBoxWrapper.dataset.boxId = document.getElementById('box-prop-id').value.trim();
        activeBoxWrapper.dataset.isLastPressed = document.getElementById('box-prop-last').checked ? "true" : "false";
        
        activeBoxWrapper.dataset.bgColor = document.getElementById('box-prop-bgcolor').value;
        activeBoxWrapper.dataset.borderColor = document.getElementById('box-prop-bordercolor').value;
        activeBoxWrapper.dataset.borderwidth = document.getElementById('box-prop-borderwidth').value;
        
        const el = activeBoxWrapper.querySelector('.rect');
        if (el) {
            el.textContent = activeBoxWrapper.dataset.boxName;
            el.style.backgroundColor = activeBoxWrapper.dataset.bgColor;
            
            const bw = parseInt(activeBoxWrapper.dataset.borderwidth) || 0;
            if (bw > 0) {
                el.style.border = `${bw}px solid ${activeBoxWrapper.dataset.borderColor}`;
                el.style.boxSizing = "border-box";
            } else {
                el.style.border = "none";
            }
            
            if (activeBoxWrapper.dataset.isLastPressed === "true") {
                el.style.outline = "6px solid #e74c3c";
                el.style.outlineOffset = "2px";
            } else {
                el.style.outline = "none";
            }
        }
    }
    document.getElementById('box-prop-container').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    activeBoxWrapper = null;
});

addClick('save-ans-prop-btn', () => {
    if (activeAnsWrapper) {
        activeAnsWrapper.dataset.answerId = document.getElementById('ans-prop-id').value.trim();
        activeAnsWrapper.dataset.calcMode = document.getElementById('ans-prop-mode').value;
        activeAnsWrapper.dataset.digits = document.getElementById('ans-prop-digits').value;
        if (typeof window.renderAnswer === 'function') window.renderAnswer(activeAnsWrapper);
    }
    document.getElementById('ans-prop-container').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    activeAnsWrapper = null;
});

addClick('save-text-prop-btn', () => {
    if (activeTextWrapper) {
        const newTxt = document.getElementById('text-prop-content').value.trim();
        if (newTxt !== "") {
            activeTextWrapper.dataset.originalContent = newTxt;
            activeTextWrapper.dataset.digits = document.getElementById('text-prop-digits').value;
            activeTextWrapper.dataset.fontSize = document.getElementById('text-prop-size').value; 
            const el = activeTextWrapper.querySelector('.text-rect');
            if (/^\s*\[[^\]]+\]\s*$/.test(newTxt)) {
                el.classList.add('single-var-text');
            } else {
                el.classList.remove('single-var-text');
            }
            if (typeof window.renderText === 'function') window.renderText(activeTextWrapper);
        }
    }
    document.getElementById('text-prop-container').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    activeTextWrapper = null;
});

addClick('save-line-prop-btn', () => {
    if (activeLineWrapper) {
        activeLineWrapper.dataset.thickness = document.getElementById('line-prop-thickness').value;
        activeLineWrapper.dataset.lineColor = document.getElementById('line-prop-color').value;
        activeLineWrapper.dataset.lineStyle = document.getElementById('line-prop-style').value;
        if (typeof window.updateLineVisuals === 'function') window.updateLineVisuals(activeLineWrapper);
    }
    document.getElementById('line-prop-container').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    activeLineWrapper = null;
});

addClick('save-formula-prop-btn', () => {
    if (activeFormulaWrapper) {
        const newTxt = document.getElementById('formula-prop-content').value.trim();
        if (newTxt !== "") {
            const el = activeFormulaWrapper.querySelector('.formula-rect');
            if (el) el.textContent = newTxt;
        }
    }
    document.getElementById('formula-prop-container').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    activeFormulaWrapper = null;
});

/* --- 要素追加・削除 --- */
addClick('add-box-btn', () => typeof createDraggable === 'function' && createDraggable('box'));
addClick('add-ans-btn', () => typeof createDraggable === 'function' && createDraggable('answer'));
addClick('add-formula-btn', () => typeof createDraggable === 'function' && createDraggable('formula'));
addClick('add-text-btn', () => typeof createDraggable === 'function' && createDraggable('text'));
addClick('add-line-btn', () => typeof createDraggable === 'function' && createDraggable('line'));
addClick('add-check-btn', () => typeof createDraggable === 'function' && createDraggable('check'));

addClick('delete-item-btn', () => {
    const selectedItems = document.querySelectorAll('.wrapper-selected');
    if (selectedItems.length > 0) {
        if (confirm(`選択中のアイテム（${selectedItems.length}個）を削除しますか？`)) {
            selectedItems.forEach(item => item.remove());
        }
    } else {
        alert("削除するアイテムを選択してください（クリックまたは矩形選択）。");
    }
});

/* ==========================================
   ★複数問題(ページ)の管理ロジック
   ========================================== */
window.saveCurrentPage = function() {
    const wrappers = container.querySelectorAll('.draggable');
    const items = [];
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
            
            if (type === 'box') {
                itemData.boxName = wrapper.dataset.boxName || itemData.content;
                itemData.boxId = wrapper.dataset.boxId || "";
                itemData.isLastPressed = wrapper.dataset.isLastPressed || "false";
                itemData.bgColor = wrapper.dataset.bgColor || "#44FFFF";
                itemData.borderColor = wrapper.dataset.borderColor || "#000000";
                itemData.borderwidth = wrapper.dataset.borderwidth || "0";
            }
            
            if (type === 'answer') {
                itemData.answerId = wrapper.dataset.answerId || '';
                itemData.calcMode = wrapper.dataset.calcMode || '0-20';
                itemData.formula = wrapper.dataset.formula || ''; 
                itemData.digits = parseInt(wrapper.dataset.digits) || 0;
                itemData.content = ''; 
            }
            if (type === 'text') {
                itemData.digits = parseInt(wrapper.dataset.digits) || 0;
                itemData.fontSize = parseFloat(wrapper.dataset.fontSize) || 1.0; 
            }
        }
        items.push(itemData);
    });
    window.problemSet[window.currentEditPage] = items;
};

window.loadPageToDOM = function(items) {
    container.querySelectorAll('.draggable').forEach(w => w.remove());
    count = 0; 
    if (items) {
        items.forEach(item => {
            if (typeof createDraggable === 'function') createDraggable(item.type, item);
        });
    }
    if (isEditMode) {
        const textWrappers = container.querySelectorAll('.draggable[data-type="text"]');
        const answerWrappers = container.querySelectorAll('.draggable[data-type="answer"]');
        const boxWrappers = container.querySelectorAll('.draggable[data-type="box"]');
        textWrappers.forEach(wrapper => window.renderText ? window.renderText(wrapper) : null);
        answerWrappers.forEach(wrapper => window.renderAnswer ? window.renderAnswer(wrapper) : null);
        boxWrappers.forEach(wrapper => window.renderBox ? window.renderBox(wrapper) : null);
    }
};

window.updatePageUI = function() {
    const indicator = document.getElementById('page-indicator');
    if (indicator) {
        indicator.textContent = `問題 ${window.currentEditPage + 1} / ${window.problemSet.length}`;
    }
};

addClick('prev-page-btn', () => {
    if (window.currentEditPage > 0) {
        window.saveCurrentPage();
        window.currentEditPage--;
        window.loadPageToDOM(window.problemSet[window.currentEditPage]);
        window.updatePageUI();
    }
});

addClick('next-page-btn', () => {
    if (window.currentEditPage < window.problemSet.length - 1) {
        window.saveCurrentPage();
        window.currentEditPage++;
        window.loadPageToDOM(window.problemSet[window.currentEditPage]);
        window.updatePageUI();
    }
});

addClick('add-page-btn', () => {
    window.saveCurrentPage();
    window.problemSet.push([]);
    window.currentEditPage = window.problemSet.length - 1;
    window.loadPageToDOM(window.problemSet[window.currentEditPage]);
    window.updatePageUI();
});

addClick('del-page-btn', () => {
    if (window.problemSet.length <= 1) {
        alert("最後の問題は削除できません。");
        return;
    }
    if (confirm(`問題 ${window.currentEditPage + 1} を削除しますか？`)) {
        window.problemSet.splice(window.currentEditPage, 1);
        if (window.currentEditPage >= window.problemSet.length) {
            window.currentEditPage = window.problemSet.length - 1;
        }
        window.loadPageToDOM(window.problemSet[window.currentEditPage]);
        window.updatePageUI();
    }
});

/* ==========================================
   動作・変数設定・判定設定
   ========================================== */
addClick('var-settings-btn', () => {
    const emptyCheckToggle = document.getElementById('empty-check-toggle');
    if (emptyCheckToggle) {
        emptyCheckToggle.checked = window.enableEmptyCheck === true;
    }
    
    const transitionSelect = document.getElementById('transition-style-select');
    if (transitionSelect) {
        transitionSelect.value = window.transitionStyle || 'none';
    }

    const playModeSelect = document.getElementById('play-mode-select');
    if (playModeSelect) {
        playModeSelect.value = window.playMode || 'pattern2';
    }

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
    if(listContainer) {
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
    }
    document.getElementById('var-settings-container').style.display = 'flex';
    document.getElementById('overlay').style.display = 'block';
});

addClick('save-var-settings-btn', () => {
    const emptyCheckToggle = document.getElementById('empty-check-toggle');
    if (emptyCheckToggle) {
        window.enableEmptyCheck = emptyCheckToggle.checked;
    }

    const transitionSelect = document.getElementById('transition-style-select');
    if (transitionSelect) {
        window.transitionStyle = transitionSelect.value;
    }

    const playModeSelect = document.getElementById('play-mode-select');
    if (playModeSelect) {
        window.playMode = playModeSelect.value;
    }

    const listContainer = document.getElementById('var-list-container');
    if(listContainer) {
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
    }
    document.getElementById('var-settings-container').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
});

addClick('judge-settings-btn', () => {
    document.getElementById('judge-correct-text').value = window.judgeSettings.correct.text;
    document.getElementById('judge-correct-color').value = window.judgeSettings.correct.color;
    document.getElementById('judge-correct-stroke').value = window.judgeSettings.correct.stroke;
    document.getElementById('judge-correct-bg').value = window.judgeSettings.correct.bg;

    document.getElementById('judge-incorrect-text').value = window.judgeSettings.incorrect.text;
    document.getElementById('judge-incorrect-color').value = window.judgeSettings.incorrect.color;
    document.getElementById('judge-incorrect-stroke').value = window.judgeSettings.incorrect.stroke;
    document.getElementById('judge-incorrect-bg').value = window.judgeSettings.incorrect.bg;

    document.getElementById('judge-prop-container').style.display = 'flex';
    document.getElementById('overlay').style.display = 'block';
});

addClick('save-judge-prop-btn', () => {
    window.judgeSettings.correct = {
        text: document.getElementById('judge-correct-text').value.trim() || "せいかい！",
        color: document.getElementById('judge-correct-color').value,
        stroke: document.getElementById('judge-correct-stroke').value,
        bg: document.getElementById('judge-correct-bg').value.trim() || "transparent"
    };
    window.judgeSettings.incorrect = {
        text: document.getElementById('judge-incorrect-text').value.trim() || "おしい！",
        color: document.getElementById('judge-incorrect-color').value,
        stroke: document.getElementById('judge-incorrect-stroke').value,
        bg: document.getElementById('judge-incorrect-bg').value.trim() || "transparent"
    };

    document.getElementById('judge-prop-container').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
});

// ==========================================
// レイアウトデータ生成関数 (保存用)
// ==========================================
function generateLayoutData() {
    window.saveCurrentPage(); 
    return { 
        config: {
            variableRanges: variableRanges,
            enableEmptyCheck: window.enableEmptyCheck === true,
            transitionStyle: window.transitionStyle, 
            playMode: window.playMode, 
            judgeSettings: window.judgeSettings 
        },
        pages: window.problemSet
    };
}

// ==========================================
// ★モード移行・出題エンジン (3パターンの統合)
// ==========================================
window.enterRunMode = function() {
    isEditMode = false;
    document.body.classList.add('run-mode');
    document.querySelectorAll('.wrapper-selected').forEach(w => w.classList.remove('wrapper-selected'));
    
    window.saveCurrentPage();

    window.playMode = window.playMode || 'pattern2';
    window.runProblemSet = [];
    window.csvLinesForRun = [];

    if (window.playMode === 'pattern1') {
        const page0 = window.problemSet[0] || [];
        for(let i = 0; i < 10; i++) window.runProblemSet.push(page0);
    } 
    else if (window.playMode === 'pattern2') {
        const validPages = [...window.problemSet].filter(p => p && p.length > 0);
        if (validPages.length === 0) {
            alert("問題が設定されていません。");
            window.enterEditMode();
            return;
        }
        for (let i = validPages.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [validPages[i], validPages[j]] = [validPages[j], validPages[i]];
        }
        window.runProblemSet = validPages;
    } 
    else if (window.playMode === 'pattern3') {
        const page0 = window.problemSet[0] || [];
        let csvLines = [];
        
        const formulaItem = page0.find(item => item.type === 'formula');
        if (formulaItem && formulaItem.content) {
            csvLines = formulaItem.content.split('\n').filter(l => l.trim() !== '');
        }
        
        if (csvLines.length === 0) {
            alert("パターン3を実行するには、計算式プロパティにCSVデータを入力してください。");
            window.enterEditMode();
            return;
        }
        
        for (let i = csvLines.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [csvLines[i], csvLines[j]] = [csvLines[j], csvLines[i]];
        }
        
        csvLines = csvLines.slice(0, 10);
        csvLines.forEach(line => {
            window.runProblemSet.push(page0); 
            window.csvLinesForRun.push(line);
        });
    }

    window.currentQuestionNum = 1;
    window.MAX_QUESTIONS = window.runProblemSet.length;
    window.mistakeCount = 0; 
    
    if (window.usedVarHistory) window.usedVarHistory.clear();
    
    window.loadRunPage(0);
};

window.loadRunPage = function(index) {
    isSolved = false;
    window.loadPageToDOM(window.runProblemSet[index]);

    // ★パターン3の動的データ割り当て処理
    if (window.playMode === 'pattern3' && window.csvLinesForRun[index]) {
        const csvLine = window.csvLinesForRun[index];
        const parts = csvLine.split(',').map(s => s.trim());
        const qText = parts[0] || "";
        const cCount = parseInt(parts[1]) || 2;
        const correctAns = parts[2] || "";
        const dummies = parts.slice(3); 
        
        const choiceBoxes = Array.from(container.querySelectorAll('.draggable[data-type="box"]'));
        
        if (choiceBoxes.length > 0) {
            const qItem = {
                type: 'text',
                content: qText,
                gridX: 2, gridY: 1, 
                wCells: 28, hCells: 4,
                fontSize: 1.5,
                digits: 0
            };
            if (typeof createDraggable === 'function') createDraggable('text', qItem);
            
            let choices = [{text: correctAns, isCorrect: true}];
            let availableDummies = [...dummies];
            
            for (let i = 0; i < choiceBoxes.length - 1; i++) {
                if (availableDummies.length > 0) {
                    const rIdx = Math.floor(Math.random() * availableDummies.length);
                    choices.push({text: availableDummies[rIdx], isCorrect: false});
                    availableDummies.splice(rIdx, 1);
                } else {
                    choices.push({text: "", isCorrect: false});
                }
            }
            
            choices.sort(() => Math.random() - 0.5); 
            
            let correctBoxId = "";
            choiceBoxes.forEach((b, i) => {
                const cObj = choices[i];
                if (cObj) {
                    b.dataset.boxName = cObj.text; 
                    b.dataset.originalContent = cObj.text; 
                    
                    const el = b.querySelector('.rect');
                    if (el) el.textContent = cObj.text;
                    
                    if (cObj.isCorrect) correctBoxId = b.dataset.boxId;
                    
                    if (cObj.text === "") {
                        b.style.display = 'none'; 
                        b.dataset.isLastPressed = "false";
                    }
                }
            });

            const formulas = container.querySelectorAll('.draggable[data-type="formula"]');
            formulas.forEach(f => {
                f.style.display = 'none';
                f.dataset.evalContent = `[${correctBoxId}]=1`; // 動的に判定式を上書き
                const rect = f.querySelector('.formula-rect');
                if(rect) rect.textContent = `[${correctBoxId}]=1`;
            });
        }
    }

    const checkRect = document.querySelector('.check-rect');
    if (checkRect) checkRect.textContent = "できた";

    if (typeof window.generateProblemVars === 'function') {
        window.generateProblemVars();
    } else {
        currentVarValues = {};
    }

    if (window.playMode !== 'pattern3' && typeof window.shuffleBoxes === 'function') {
        window.shuffleBoxes();
    }

    const textWrappers = container.querySelectorAll('.draggable[data-type="text"]');
    const answerWrappers = container.querySelectorAll('.draggable[data-type="answer"]');
    const boxWrappers = container.querySelectorAll('.draggable[data-type="box"]');
    textWrappers.forEach(wrapper => window.renderText ? window.renderText(wrapper) : null);
    answerWrappers.forEach(wrapper => window.renderAnswer ? window.renderAnswer(wrapper) : null);
    boxWrappers.forEach(wrapper => window.renderBox ? window.renderBox(wrapper) : null);
};

window.enterEditMode = function() {
    isEditMode = true;
    document.body.classList.remove('run-mode');
    isSolved = false;

    if (window.problemSet[window.currentEditPage]) {
        window.loadPageToDOM(window.problemSet[window.currentEditPage]);
    }
    window.updatePageUI();

    currentVarValues = {};
};

addClick('run-btn', () => {
    const runBtn = document.getElementById('run-btn');
    if (isEditMode) {
        window.enterRunMode();
        if (runBtn) { runBtn.textContent = '編集モードへ戻る'; runBtn.style.backgroundColor = '#e74c3c'; }
    } else {
        window.enterEditMode();
        if (runBtn) { runBtn.textContent = '実行モードへ'; runBtn.style.backgroundColor = '#2ecc71'; }
    }
});

/* ==========================================
   データ保存・読込処理
   ========================================== */
addClick('save-btn', () => {
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

addClick('load-btn', () => {
    const loadFile = document.getElementById('load-file');
    if(loadFile) loadFile.click();
});

const loadFileEl = document.getElementById('load-file');
if (loadFileEl) {
    loadFileEl.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const data = JSON.parse(evt.target.result);
                variableRanges = {}; 
                
                if (data.pages) {
                    const config = data.config || {};
                    variableRanges = config.variableRanges || {};
                    window.enableEmptyCheck = config.enableEmptyCheck === true; 
                    window.transitionStyle = config.transitionStyle || 'none'; 
                    window.playMode = config.playMode || 'pattern2'; 
                    if (config.judgeSettings) window.judgeSettings = config.judgeSettings; 
                    window.problemSet = data.pages;
                } else {
                    const items = [];
                    data.forEach(item => {
                        if (item.type === 'config') {
                            variableRanges = item.variableRanges || {};
                            window.enableEmptyCheck = item.enableEmptyCheck === true; 
                            window.transitionStyle = item.transitionStyle || 'none'; 
                            window.playMode = item.playMode || 'pattern1'; 
                            if (item.judgeSettings) window.judgeSettings = item.judgeSettings; 
                        } else {
                            items.push(item);
                        }
                    });
                    window.problemSet = [items];
                }

                window.currentEditPage = 0;
                window.loadPageToDOM(window.problemSet[0]);
                window.updatePageUI();

            } catch (err) {
                alert("JSONファイルの読み込みに失敗しました。");
            }
            e.target.value = ''; 
        };
        reader.readAsText(file);
    });
}

window.addEventListener('keydown', (e) => { if(e.key === 'F1') typeof createDraggable === 'function' && createDraggable('box'); });

/* ==========================================
   ★公開版書出 (単一HTMLへの全内包処理)
   ========================================== */
addClick('export-html-btn', async () => {
    try {
        const cssRes = await fetch('style.css');
        if (!cssRes.ok) throw new Error("style.css が取得できませんでした。");
        const cssText = await cssRes.text();

        const jsFiles = ['script_core.js', 'script_element.js', 'script_game.js', 'script_drag.js', 'script_main.js'];
        let combinedJsText = '';
        for (const file of jsFiles) {
            const res = await fetch(file);
            if (!res.ok) throw new Error(`${file} が取得できませんでした。`);
            combinedJsText += await res.text() + '\n\n';
        }

        const data = generateLayoutData();
        const jsonString = JSON.stringify(data);

        const htmlClone = document.documentElement.cloneNode(true);

        const containerClone = htmlClone.querySelector('#container');
        if (containerClone) containerClone.innerHTML = ''; 
        
        const oldToast = htmlClone.querySelector('.toast-msg');
        if (oldToast) oldToast.remove(); 

        const sidebarClone = htmlClone.querySelector('.sidebar');
        if (sidebarClone) sidebarClone.remove();

        htmlClone.querySelectorAll('link[rel="stylesheet"]').forEach(el => {
            if (el.href && el.href.includes('style.css')) el.remove();
        });
        htmlClone.querySelectorAll('script').forEach(el => {
            el.remove(); 
        });

        const styleTag = document.createElement('style');
        styleTag.textContent = cssText;
        htmlClone.querySelector('head').appendChild(styleTag);

        const scriptTag = document.createElement('script');
        scriptTag.textContent = `window.__INIT_DATA__ = ${jsonString};\n\n${combinedJsText}`;
        htmlClone.querySelector('body').appendChild(scriptTag);

        const htmlText = "<!DOCTYPE html>\n" + htmlClone.outerHTML;

        const blob = new Blob([htmlText], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'published_grid.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (e) {
        console.error(e);
        alert("書き出しに失敗しました。サーバー環境(http/https)で実行しているか確認してください。\n詳細: " + e.message);
    }
});

/* ==========================================
   公開版HTMLとしての初期化処理 (ロード時)
   ========================================== */
if (typeof window.__INIT_DATA__ !== 'undefined') {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.remove();

    const data = window.__INIT_DATA__;
    variableRanges = {}; 
    
    if (data.pages) {
        const config = data.config || {};
        variableRanges = config.variableRanges || {};
        window.enableEmptyCheck = config.enableEmptyCheck === true; 
        window.transitionStyle = config.transitionStyle || 'none'; 
        window.playMode = config.playMode || 'pattern2';
        if (config.judgeSettings) window.judgeSettings = config.judgeSettings; 
        window.problemSet = data.pages;
    } else {
        const items = [];
        data.forEach(item => {
            if (item.type === 'config') {
                variableRanges = item.variableRanges || {};
                window.enableEmptyCheck = item.enableEmptyCheck === true; 
                window.transitionStyle = item.transitionStyle || 'none'; 
                window.playMode = item.playMode || 'pattern1';
                if (item.judgeSettings) window.judgeSettings = item.judgeSettings; 
            } else {
                items.push(item);
            }
        });
        window.problemSet = [items];
    }

    setTimeout(() => {
        if (typeof window.enterRunMode === 'function') window.enterRunMode();
    }, 50);
}

// 初期起動時のUI更新
if (typeof window.updatePageUI === 'function') {
    window.updatePageUI();
}