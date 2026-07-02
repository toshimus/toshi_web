/* ==========================================
   UIイベント・保存・エクスポート
   ========================================== */
function addClick(id, handler) {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', handler);
}

addClick('save-ans-prop-btn', () => {
    if (activeAnsWrapper) {
        activeAnsWrapper.dataset.answerId = document.getElementById('ans-prop-id').value.trim();
        activeAnsWrapper.dataset.calcMode = document.getElementById('ans-prop-mode').value;
        activeAnsWrapper.dataset.digits = document.getElementById('ans-prop-digits').value;
        renderAnswer(activeAnsWrapper);
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
            const el = activeTextWrapper.querySelector('.text-rect');
            if (/^\s*\[[^\]]+\]\s*$/.test(newTxt)) {
                el.classList.add('single-var-text');
            } else {
                el.classList.remove('single-var-text');
            }
            renderText(activeTextWrapper);
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
        window.updateLineVisuals(activeLineWrapper);
    }
    document.getElementById('line-prop-container').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    activeLineWrapper = null;
});

addClick('add-box-btn', () => createDraggable('box'));
addClick('add-ans-btn', () => createDraggable('answer'));
addClick('add-formula-btn', () => createDraggable('formula'));
addClick('add-text-btn', () => createDraggable('text'));
addClick('add-line-btn', () => createDraggable('line'));
addClick('add-check-btn', () => createDraggable('check'));

addClick('delete-item-btn', () => {
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
   変数設定機能
   ========================================== */
addClick('var-settings-btn', () => {
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

// ==========================================
// レイアウトデータ生成関数
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
                itemData.digits = parseInt(wrapper.dataset.digits) || 0;
                itemData.content = ''; 
            }
            if (type === 'text') {
                itemData.digits = parseInt(wrapper.dataset.digits) || 0;
            }
        }
        data.push(itemData);
    });
    return data;
}

// ==========================================
// モード移行処理関数化（10問対応リザルト連携）
// ==========================================
function enterRunMode() {
    isEditMode = false;
    document.body.classList.add('run-mode');
    document.querySelectorAll('.wrapper-selected').forEach(w => w.classList.remove('wrapper-selected'));
    
    // ==== 変更箇所: 10問管理の初期化と変数生成 ====
    window.currentQuestionNum = 1;
    if (window.usedVarHistory) window.usedVarHistory.clear();
    
    // 正解状態のリセット
    isSolved = false;
    const checkRect = document.querySelector('.check-rect');
    if (checkRect) checkRect.textContent = "できた";
    
    if (typeof window.generateProblemVars === 'function') {
        window.generateProblemVars();
    } else {
        currentVarValues = {};
    }
    // ==============================================

    const textWrappers = container.querySelectorAll('.draggable[data-type="text"]');
    const answerWrappers = container.querySelectorAll('.draggable[data-type="answer"]');
    textWrappers.forEach(wrapper => renderText(wrapper));
    answerWrappers.forEach(wrapper => renderAnswer(wrapper));
}
window.enterRunMode = enterRunMode; // リザルト画面の再プレイ用にグローバル化

function enterEditMode() {
    isEditMode = true;
    document.body.classList.remove('run-mode');

    // 正解状態のリセット
    isSolved = false;
    const checkRect = document.querySelector('.check-rect');
    if (checkRect) checkRect.textContent = "できた";

    const textWrappers = container.querySelectorAll('.draggable[data-type="text"]');
    const answerWrappers = container.querySelectorAll('.draggable[data-type="answer"]');
    
    textWrappers.forEach(wrapper => renderText(wrapper));
    answerWrappers.forEach(wrapper => renderAnswer(wrapper));
    
    currentVarValues = {};
}
window.enterEditMode = enterEditMode; // リザルト画面の編集遷移用にグローバル化

// 実行/編集切り替え
addClick('run-btn', () => {
    const runBtn = document.getElementById('run-btn');
    if (isEditMode) {
        enterRunMode();
        if (runBtn) { runBtn.textContent = '編集モードへ戻る'; runBtn.style.backgroundColor = '#e74c3c'; }
    } else {
        enterEditMode();
        if (runBtn) { runBtn.textContent = '実行モードへ'; runBtn.style.backgroundColor = '#2ecc71'; }
    }
});

// JSON保存
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

// 読込
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
}

window.addEventListener('keydown', (e) => { if(e.key === 'F1') createDraggable('box'); });


/* ==========================================
   公開版書出 (HTMLエクスポート) 機能 (サーバー・Fetch完全対応版)
   ========================================== */
addClick('export-html-btn', async () => {
    try {
        const cssRes = await fetch('style.css');
        if (!cssRes.ok) throw new Error("style.css が取得できませんでした。");
        const cssText = await cssRes.text();

        // 3つのJSファイルをすべて取得して結合
        const jsFiles = ['script_core.js', 'script_drag.js', 'script_main.js'];
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
   公開版HTMLとしての初期化処理
   ========================================== */
if (typeof window.__INIT_DATA__ !== 'undefined') {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.remove();

    container.querySelectorAll('.draggable').forEach(w => w.remove());
    count = 0; 
    variableRanges = {}; 
    
    window.__INIT_DATA__.forEach(item => {
        if (item.type === 'config') {
            variableRanges = item.variableRanges || {};
        } else {
            createDraggable(item.type, item);
        }
    });

    setTimeout(() => {
        enterRunMode();
    }, 50);
}