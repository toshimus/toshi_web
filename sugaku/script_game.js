/* ==========================================
   script_game.js (ゲーム進行・判定・CSV動的生成・リザルト制御)
   ========================================== */

function runValidation() {
    if (isSolved || window.isToastShowing) return;

    const answers = Array.from(container.querySelectorAll('.draggable[data-type="answer"]'));
    const formulas = Array.from(container.querySelectorAll('.draggable[data-type="formula"]'));
    const boxes = Array.from(container.querySelectorAll('.draggable[data-type="box"]'));

    const hasSelection = boxes.length === 0 || boxes.some(b => b.dataset.isLastPressed === "true" && b.dataset.isQuestion !== "true");

    let allCorrect = true;
    let hasCheckable = false;
    let ansValues = {};
    let hasEmpty = false;

    answers.forEach(wAns => {
        const id = wAns.dataset.answerId;
        const el = wAns.querySelector('.ans-rect');
        const normalizedId = id.replace(/[\[\]]/g, '');
        const style = wAns.dataset.ansStyle || 'normal';
        
        if (style !== 'normal') {
            const inputs = Array.from(el.querySelectorAll('.fraction-input'));
            inputs.forEach(inp => {
                const subId = inp.dataset.subId;
                const txt = inp.textContent.trim();
                if (txt === "") hasEmpty = true;
                const val = parseFloat(txt);
                ansValues[`${normalizedId}_${subId}`] = isNaN(val) ? 0 : val;
            });
        } else {
            const digits = parseInt(wAns.dataset.digits) || 0;
            let val;
            if (digits > 0) {
                const cells = Array.from(el.querySelectorAll('.split-cell'));
                const vals = cells.map(c => c.textContent.trim());
                
                const firstFilled = vals.findIndex(v => v !== "");
                
                if (firstFilled === -1) {
                    val = NaN; 
                    hasEmpty = true;
                } else {
                    let isValid = true;
                    for (let i = firstFilled + 1; i < vals.length; i++) {
                        if (vals[i] === "") {
                            isValid = false; 
                            hasEmpty = true;
                        }
                    }
                    val = isValid ? parseFloat(vals.slice(firstFilled).join('')) : NaN;
                }
            } else {
                const txt = el.textContent.trim();
                if (txt === "") hasEmpty = true;
                val = parseFloat(txt);
            }
            ansValues[normalizedId] = isNaN(val) ? 0 : val;
        }
    });

    if (!hasSelection || hasEmpty) {
        window.showToast("解答を選択または入力してください", "system");
        return;
    }

    const getCombinedValueForId = (id) => {
        const cleanId = id.replace(/[\[\]]/g, '');

        if (cleanId.endsWith('_sel') || cleanId.endsWith('_num') || cleanId.endsWith('_div') || cleanId.endsWith('_den')) {
            const baseId = cleanId.replace(/_(sel|num|div|den)$/, '');
            const targetTool = container.querySelector(`.draggable[data-type="tool"][data-obj-id="${baseId}"]`);
            if (targetTool) {
                if (cleanId.endsWith('_sel') || cleanId.endsWith('_num')) {
                    return targetTool.querySelectorAll('[data-filled="true"]').length;
                } else if (cleanId.endsWith('_div') || cleanId.endsWith('_den')) {
                    return parseInt(targetTool.dataset.currentDivisions) || 1;
                }
            }
        }

        if (ansValues.hasOwnProperty(cleanId)) return ansValues[cleanId];

        const targetBox = container.querySelector(`.draggable[data-type="box"][data-box-id="${cleanId}"]`);
        if (targetBox) {
            return targetBox.dataset.isLastPressed === "true" ? 1 : 0;
        }

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
        const formulaStr = wForm.querySelector('.formula-rect') ? wForm.querySelector('.formula-rect').textContent : wForm.dataset.evalContent;
        if(!formulaStr) return;
        
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
        window.showToast("判定式がありません", "system");
        return;
    }

    if (window.enableEmptyCheck === true) {
        let groupStatus = {}; 
        answers.forEach(w => {
            const id = w.dataset.answerId;
            const el = w.querySelector('.ans-rect');
            const digits = parseInt(w.dataset.digits) || 0;
            const style = w.dataset.ansStyle || 'normal';
            
            if (style !== 'normal') {
                const inputs = Array.from(el.querySelectorAll('.fraction-input'));
                if (inputs.some(inp => inp.textContent.trim() === "")) hasEmpty = true;
            } else if (digits > 0) {
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
                    if (started) hasEmpty = true; 
                }
            }
            if (allEmpty) hasEmpty = true; 
        }
    }

    if (hasEmpty) {
        window.showToast("まだ空欄があります", "system");
    } else {
        const endTime = new Date();
        const formatTime = (date) => {
            if(!date) return "";
            return date.getHours().toString().padStart(2, '0') + ':' + 
                   date.getMinutes().toString().padStart(2, '0') + ':' + 
                   date.getSeconds().toString().padStart(2, '0');
        };
        const startTime = window.problemStartTime || new Date();
        const yyyy = startTime.getFullYear();
        const mm = String(startTime.getMonth() + 1).padStart(2, '0');
        const dd = String(startTime.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}/${mm}/${dd}`;

        let problemContentText = "Q" + window.currentQuestionNum;
        if (window.playMode === 'pattern3' && window.csvLinesForRun && window.csvLinesForRun[window.currentQuestionNum - 1]) {
            problemContentText = window.csvLinesForRun[window.currentQuestionNum - 1].split(',')[0] || problemContentText;
        } else {
            const formulasStr = formulas.map(f => {
                const rect = f.querySelector('.formula-rect');
                return rect ? rect.textContent : (f.dataset.evalContent || "");
            }).join(" | ");
            if(formulasStr) problemContentText = formulasStr;
        }

        let userAnswerStr = Object.keys(ansValues).map(k => `${k}:${ansValues[k]}`).join(" ");
        if (userAnswerStr === "") {
             const pressedBox = boxes.find(b => b.dataset.isLastPressed === "true");
             if (pressedBox) userAnswerStr = pressedBox.dataset.boxName || "";
        }

        const csvLine = `"${dateStr}","自作グリッド問題","${problemContentText}","${userAnswerStr}",${formatTime(startTime)},${formatTime(endTime)},"グリッド入力","${allCorrect ? '正解' : '不正解'}"\n`;

        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.appBridge) {
            window.webkit.messageHandlers.appBridge.postMessage({
                action: "saveCSV",
                csvLine: csvLine
            });
        } else {
            const storageKey = "grid_custom_history";
            let history = localStorage.getItem(storageKey) || "";
            history += csvLine;
            localStorage.setItem(storageKey, history);
        }

        if (allCorrect) {
            window.showToast(window.judgeSettings.correct.text, "correct");
            isSolved = true;
            const checkRect = container.querySelector('.check-rect');
            if (checkRect) checkRect.textContent = "次の問題へ";
        } else {
            window.showToast(window.judgeSettings.incorrect.text, "incorrect");
            window.mistakeCount++; 
        }
    }
}
window.runValidation = runValidation;

window.generateProblemVars = function() {
    const textWrappers = container.querySelectorAll('.draggable[data-type="text"]');
    const boxWrappers = container.querySelectorAll('.draggable[data-type="box"]');
    const answerWrappers = container.querySelectorAll('.draggable[data-type="answer"]');
    
    const knownAnswerIds = new Set();
    answerWrappers.forEach(w => {
        if (w.dataset.answerId) knownAnswerIds.add(w.dataset.answerId);
    });

    let newVars = {};
    let attempts = 0;
    let signature = "";
    
    do {
        newVars = {};
        
        const extractVars = (content) => {
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
        };

        textWrappers.forEach(w => extractVars(w.dataset.originalContent));
        boxWrappers.forEach(w => extractVars(w.dataset.boxName));

        signature = JSON.stringify(newVars, Object.keys(newVars).sort());
        attempts++;
    } while (window.usedVarHistory.has(signature) && Object.keys(newVars).length > 0 && attempts < 100);

    if (Object.keys(newVars).length > 0) {
        window.usedVarHistory.add(signature);
    }
    currentVarValues = newVars;
};

window.shuffleBoxes = function() {
    const boxes = Array.from(container.querySelectorAll('.draggable[data-type="box"]'));
    if (boxes.length < 2) return; 

    if (window.playMode === 'pattern3') return;

    const positions = boxes.map(b => ({ x: b.dataset.gridX, y: b.dataset.gridY }));
    
    for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    
    boxes.forEach((b, index) => {
        b.dataset.gridX = positions[index].x;
        b.dataset.gridY = positions[index].y;
        b.style.left = `calc(${positions[index].x} * (100% / 32))`;
        b.style.top = `calc(${positions[index].y} * (100% / 24))`;
        
        b.dataset.isLastPressed = "false";
        const el = b.querySelector('.rect');
        if (el) el.style.outline = "none";
    });
};

window.loadNextProblem = function() {
    if (window.currentQuestionNum >= window.MAX_QUESTIONS) {
        window.showResultScreen();
        return;
    }
    
    const tStyle = window.transitionStyle || 'none';
    
    if (tStyle === 'none') {
        processNextProblem();
    } else {
        container.classList.add(`anim-out-${tStyle}`);
        setTimeout(() => {
            processNextProblem();
            container.classList.remove(`anim-out-${tStyle}`);
            container.classList.add(`anim-in-${tStyle}`);
            setTimeout(() => {
                container.classList.remove(`anim-in-${tStyle}`);
            }, 300); 
        }, 300); 
    }
};

function processNextProblem() {
    const toastMsg = document.querySelector('.toast-msg');
    if (toastMsg) toastMsg.classList.remove('show');

    window.currentQuestionNum++;
    if (typeof window.loadRunPage === 'function') {
        window.loadRunPage(window.currentQuestionNum - 1);
    }
}

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
        subText.style.marginBottom = '20px';

        const statsContainer = document.createElement('div');
        statsContainer.id = 'result-stats';
        statsContainer.style.textAlign = 'center';
        statsContainer.style.marginBottom = '40px';

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
            if (typeof window.enterRunMode === 'function') window.enterRunMode(true); 
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

        const menuBtn = document.createElement('a');
        menuBtn.textContent = 'メニューへ戻る';
        menuBtn.href = 'index.html';
        menuBtn.style.padding = '15px 30px';
        menuBtn.style.fontSize = '1.2rem';
        menuBtn.style.backgroundColor = '#95a5a6';
        menuBtn.style.color = '#fff';
        menuBtn.style.border = 'none';
        menuBtn.style.borderRadius = '8px';
        menuBtn.style.textDecoration = 'none';
        menuBtn.style.fontWeight = 'bold';
        menuBtn.style.display = 'inline-block';
        
        btnContainer.appendChild(replayBtn);
        if (typeof window.__INIT_DATA__ === 'undefined') {
            btnContainer.appendChild(editBtn);
        }
        btnContainer.appendChild(menuBtn);

        resultOverlay.appendChild(title);
        resultOverlay.appendChild(subText);
        resultOverlay.appendChild(statsContainer);
        resultOverlay.appendChild(btnContainer);
        document.body.appendChild(resultOverlay);
    }
    
    const statsContainer = document.getElementById('result-stats');
    const totalQuestions = window.MAX_QUESTIONS;
    const mistakes = window.mistakeCount || 0;
    const totalAttempts = totalQuestions + mistakes;
    const accuracy = totalAttempts > 0 ? Math.round((totalQuestions / totalAttempts) * 100) : 100;

    statsContainer.innerHTML = `
        <div style="font-size: 1.8rem; margin-bottom: 10px;">正解: <span style="color:#2ecc71;">${totalQuestions} 回</span></div>
        <div style="font-size: 1.8rem; margin-bottom: 10px;">ミス: <span style="color:#e74c3c;">${mistakes} 回</span></div>
        <div style="font-size: 2.2rem; font-weight: bold; margin-bottom: 10px;">正答率: <span style="color:#f1c40f;">${accuracy} ％</span></div>
    `;

    resultOverlay.style.display = 'flex';
};