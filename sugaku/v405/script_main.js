/* ==========================================
   script_main.js (UIイベント・保存・複数ページ管理・出題エンジン・Undo/Redo・矩形選択・Shift追加選択)
   ========================================== */
window.enableEmptyCheck = window.enableEmptyCheck || false; 
window.problemSet = [ [] ]; 
window.currentEditPage = 0;
window.runProblemSet = [];
window.playMode = window.playMode || 'pattern2';
window.orderStyle = window.orderStyle || 'random';

/* --- Undo / Redo 管理システム --- */
window.historyStack = [];
window.historyIndex = -1;

window.saveHistoryState = function() {
    if (typeof isEditMode !== 'undefined' && !isEditMode) return;
    
    window.saveCurrentPage(); 
    const currentState = JSON.stringify(window.problemSet);

    if (window.historyIndex < window.historyStack.length - 1) {
        window.historyStack = window.historyStack.slice(0, window.historyIndex + 1);
    }

    if (window.historyStack.length === 0 || window.historyStack[window.historyIndex] !== currentState) {
        window.historyStack.push(currentState);
        window.historyIndex++;
        
        if (window.historyStack.length > 50) {
            window.historyStack.shift();
            window.historyIndex--;
        }
    }
};

window.undo = function() {
    if (window.historyIndex > 0) {
        window.historyIndex--;
        window.problemSet = JSON.parse(window.historyStack[window.historyIndex]);
        window.loadPageToDOM(window.problemSet[window.currentEditPage]);
    }
};

window.redo = function() {
    if (window.historyIndex < window.historyStack.length - 1) {
        window.historyIndex++;
        window.problemSet = JSON.parse(window.historyStack[window.historyIndex]);
        window.loadPageToDOM(window.problemSet[window.currentEditPage]);
    }
};

window.addEventListener('mouseup', (e) => {
    // 汎用操作履歴の保存（ドラッグ終了時など）
    if (typeof isEditMode !== 'undefined' && isEditMode && e.target.closest('.draggable') && !window.isMarqueeSelecting) {
        setTimeout(() => {
            window.saveHistoryState();
        }, 100);
    }
});

/* ==========================================
   ★ 矩形選択（マーキー） ＆ Shift追加選択システム
   ========================================== */
window.isMarqueeSelecting = false;
window.marqueeStartX = 0;
window.marqueeStartY = 0;
window.selectionBox = null;

// 要素クリック時のShift追加選択
document.addEventListener('click', (e) => {
    if (typeof isEditMode !== 'undefined' && !isEditMode) return;
    const wrapper = e.target.closest('.draggable');
    if (wrapper) {
        if (e.shiftKey) {
            wrapper.classList.toggle('wrapper-selected');
        } else {
            // Shiftなしクリック時は、通常のドラッグ開始処理と干渉しないよう配慮しつつ
            // 他の選択を解除する（単一選択にする）
            document.querySelectorAll('.wrapper-selected').forEach(w => {
                if (w !== wrapper) w.classList.remove('wrapper-selected');
            });
            wrapper.classList.add('wrapper-selected');
        }
    }
});

// 背景ドラッグによる矩形選択の開始
document.addEventListener('mousedown', (e) => {
    if (typeof isEditMode !== 'undefined' && !isEditMode) return;
    if (e.button !== 0) return; // 左クリックのみ

    const draggable = e.target.closest('.draggable');
    const container = document.getElementById('container');
    
    // 背景をクリックした場合
    if (!draggable && container && (e.target === container || e.target === document.body)) {
        window.isMarqueeSelecting = true;
        
        const rect = container.getBoundingClientRect();
        // コンテナ内のスクロールも考慮した座標計算
        window.marqueeStartX = e.clientX - rect.left + container.scrollLeft;
        window.marqueeStartY = e.clientY - rect.top + container.scrollTop;

        window.selectionBox = document.createElement('div');
        window.selectionBox.id = 'marquee-selection-box';
        window.selectionBox.style.position = 'absolute';
        window.selectionBox.style.border = '1px dashed #3498db';
        window.selectionBox.style.backgroundColor = 'rgba(52, 152, 219, 0.2)';
        window.selectionBox.style.left = window.marqueeStartX + 'px';
        window.selectionBox.style.top = window.marqueeStartY + 'px';
        window.selectionBox.style.width = '0px';
        window.selectionBox.style.height = '0px';
        window.selectionBox.style.zIndex = '9999';
        window.selectionBox.style.pointerEvents = 'none'; 
        container.appendChild(window.selectionBox);

        // Shiftキーが押されていなければ、既存の選択をすべてクリア
        if (!e.shiftKey) {
            document.querySelectorAll('.wrapper-selected').forEach(w => w.classList.remove('wrapper-selected'));
        }
    }
});

// 矩形選択ボックスの描画更新
document.addEventListener('mousemove', (e) => {
    if (!window.isMarqueeSelecting || !window.selectionBox) return;

    const container = document.getElementById('container');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const currentX = e.clientX - rect.left + container.scrollLeft;
    const currentY = e.clientY - rect.top + container.scrollTop;

    const left = Math.min(window.marqueeStartX, currentX);
    const top = Math.min(window.marqueeStartY, currentY);
    const width = Math.abs(currentX - window.marqueeStartX);
    const height = Math.abs(currentY - window.marqueeStartY);

    window.selectionBox.style.left = left + 'px';
    window.selectionBox.style.top = top + 'px';
    window.selectionBox.style.width = width + 'px';
    window.selectionBox.style.height = height + 'px';
});

// 矩形選択の確定（当たり判定処理）
document.addEventListener('mouseup', (e) => {
    if (window.isMarqueeSelecting && window.selectionBox) {
        const container = document.getElementById('container');
        const boxRect = window.selectionBox.getBoundingClientRect();

        if (container) {
            const draggables = container.querySelectorAll('.draggable');
            draggables.forEach(item => {
                const itemRect = item.getBoundingClientRect();
                // 矩形同士の交差判定
                const isIntersecting = !(
                    boxRect.right < itemRect.left || 
                    boxRect.left > itemRect.right || 
                    boxRect.bottom < itemRect.top || 
                    boxRect.top > itemRect.bottom
                );

                if (isIntersecting) {
                    item.classList.add('wrapper-selected');
                }
            });
        }

        window.selectionBox.remove();
        window.selectionBox = null;
        window.isMarqueeSelecting = false;
    }
});


/* --- ヘルパー関数 --- */
function addClick(id, handler) {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', handler);
}

function withHistory(action) {
    action();
    window.saveHistoryState();
}

/* --- Undo / Redo ボタンの紐付け --- */
addClick('undo-btn', () => window.undo());
addClick('redo-btn', () => window.redo());

/* --- プロパティ保存 --- */
addClick('save-box-prop-btn', () => {
    if (activeBoxWrapper) {
        activeBoxWrapper.dataset.boxName = document.getElementById('box-prop-name').value.trim();
        activeBoxWrapper.dataset.boxId = document.getElementById('box-prop-id').value.trim();
        activeBoxWrapper.dataset.fontSize = document.getElementById('box-prop-fontsize').value; 
        activeBoxWrapper.dataset.isLastPressed = document.getElementById('box-prop-last').checked ? "true" : "false";
        
        activeBoxWrapper.dataset.bgColor = document.getElementById('box-prop-bgcolor').value;
        activeBoxWrapper.dataset.borderColor = document.getElementById('box-prop-bordercolor').value;
        activeBoxWrapper.dataset.borderwidth = document.getElementById('box-prop-borderwidth').value;
        
        const el = activeBoxWrapper.querySelector('.rect');
        if (el) {
            el.textContent = activeBoxWrapper.dataset.boxName;
            el.style.backgroundColor = activeBoxWrapper.dataset.bgColor;
            el.style.fontSize = `calc(var(--grid-cell-h) * 1.2 * ${activeBoxWrapper.dataset.fontSize})`; 
            
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
        window.saveHistoryState();
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
        activeAnsWrapper.dataset.ansStyle = document.getElementById('ans-prop-style').value; 
        activeAnsWrapper.dataset.thickness = document.getElementById('ans-prop-thickness').value;
        if (typeof window.renderAnswer === 'function') window.renderAnswer(activeAnsWrapper);
        window.saveHistoryState();
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
            window.saveHistoryState();
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
        window.saveHistoryState();
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
            window.saveHistoryState();
        }
    }
    document.getElementById('formula-prop-container').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    activeFormulaWrapper = null;
});

addClick('save-tool-prop-btn', () => {
    if (activeToolWrapper) {
        activeToolWrapper.dataset.objId = document.getElementById('tool-prop-id').value.trim();
        const newDivs = parseInt(document.getElementById('tool-prop-divs').value);
        if (newDivs >= 1 && newDivs <= 20) {
            activeToolWrapper.dataset.currentDivisions = newDivs;
            if (typeof ToolManager !== 'undefined') ToolManager.renderTool(activeToolWrapper);
            window.saveHistoryState();
        }
    }
    document.getElementById('tool-prop-container').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    activeToolWrapper = null;
});

/* --- 要素追加・削除 --- */
addClick('add-box-btn', () => withHistory(() => typeof createDraggable === 'function' && createDraggable('box')));
addClick('add-ans-btn', () => withHistory(() => typeof createDraggable === 'function' && createDraggable('answer')));
addClick('add-formula-btn', () => withHistory(() => typeof createDraggable === 'function' && createDraggable('formula')));
addClick('add-text-btn', () => withHistory(() => typeof createDraggable === 'function' && createDraggable('text')));
addClick('add-line-btn', () => withHistory(() => typeof createDraggable === 'function' && createDraggable('line')));
addClick('add-check-btn', () => withHistory(() => typeof createDraggable === 'function' && createDraggable('check')));
addClick('add-menu-btn', () => withHistory(() => typeof createDraggable === 'function' && createDraggable('menu')));
addClick('add-progress-btn', () => withHistory(() => typeof createDraggable === 'function' && createDraggable('progress')));

addClick('add-tool-bar-btn', () => {
    if (typeof ToolManager !== 'undefined') withHistory(() => ToolManager.addTool('fraction-bar'));
});

addClick('add-tool-circle-btn', () => {
    if (typeof ToolManager !== 'undefined') withHistory(() => ToolManager.addTool('fraction-circle'));
});

addClick('delete-item-btn', () => {
    const selectedItems = document.querySelectorAll('.wrapper-selected');
    if (selectedItems.length > 0) {
        if (confirm(`選択中のアイテム（${selectedItems.length}個）を削除しますか？`)) {
            window.saveHistoryState();
            selectedItems.forEach(item => item.remove());
            window.saveHistoryState();
        }
    } else {
        alert("削除するアイテムを選択してください（矩形選択、またはShift+クリック）。");
    }
});

/* ==========================================
   ★複数問題(ページ)の管理ロジック
   ========================================== */
window.saveCurrentPage = function() {
    const container = document.getElementById('container');
    if (!container) return;
    
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
        } else if (type === 'tool') {
            itemData.toolId = wrapper.dataset.toolId;
            itemData.objId = wrapper.dataset.objId;
            itemData.gridX = parseInt(wrapper.dataset.gridX) || 0;
            itemData.gridY = parseInt(wrapper.dataset.gridY) || 0;
            itemData.wCells = parseInt(wrapper.dataset.wCells) || 10;
            itemData.hCells = parseInt(wrapper.dataset.hCells) || 6;
            itemData.currentDivisions = parseInt(wrapper.dataset.currentDivisions) || 1;
        } else {
            itemData.gridX = parseInt(wrapper.dataset.gridX) || 0;
            itemData.gridY = parseInt(wrapper.dataset.gridY) || 0;
            itemData.wCells = parseInt(wrapper.dataset.wCells) || 2;
            itemData.hCells = parseInt(wrapper.dataset.hCells) || 2;
            itemData.content = type === 'text' ? (wrapper.dataset.originalContent || (el ? el.innerHTML : '')) : (el ? el.textContent : '');
            
            if (type === 'box') {
                itemData.boxName = wrapper.dataset.boxName || itemData.content;
                itemData.boxId = wrapper.dataset.boxId || "";
                itemData.fontSize = wrapper.dataset.fontSize || "1.0"; 
                itemData.isLastPressed = wrapper.dataset.isLastPressed || "false";
                itemData.isShuffleable = wrapper.dataset.isShuffleable || "false";
                itemData.bgColor = wrapper.dataset.bgColor || "#44FFFF";
                itemData.borderColor = wrapper.dataset.borderColor || "#000000";
                itemData.borderwidth = wrapper.dataset.borderwidth || "0";
            }
            
            if (type === 'answer') {
                itemData.answerId = wrapper.dataset.answerId || '';
                itemData.calcMode = wrapper.dataset.calcMode || '0-20';
                itemData.formula = wrapper.dataset.formula || ''; 
                itemData.digits = parseInt(wrapper.dataset.digits) || 0;
                itemData.ansStyle = wrapper.dataset.ansStyle || 'normal'; 
                itemData.thickness = parseInt(wrapper.dataset.thickness) || 4; 
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
    const container = document.getElementById('container');
    if (!container) return;
    
    container.querySelectorAll('.draggable').forEach(w => w.remove());
    if (typeof count !== 'undefined') count = 0; 
    
    if (items) {
        items.forEach(item => {
            if (typeof createDraggable === 'function') createDraggable(item.type, item);
        });
    }
    
    if (typeof isEditMode !== 'undefined' && isEditMode) {
        const textWrappers = container.querySelectorAll('.draggable[data-type="text"]');
        const answerWrappers = container.querySelectorAll('.draggable[data-type="answer"]');
        const boxWrappers = container.querySelectorAll('.draggable[data-type="box"]');
        const toolWrappers = container.querySelectorAll('.draggable[data-type="tool"]');
        
        textWrappers.forEach(wrapper => window.renderText ? window.renderText(wrapper) : null);
        answerWrappers.forEach(wrapper => window.renderAnswer ? window.renderAnswer(wrapper) : null);
        boxWrappers.forEach(wrapper => window.renderBox ? window.renderBox(wrapper) : null);
        toolWrappers.forEach(wrapper => {
            if (typeof ToolManager !== 'undefined') ToolManager.renderTool(wrapper);
        });
    }
};

window.updatePageUI = function() {
    const indicator = document.getElementById('page-indicator');
    if (indicator) {
        indicator.textContent = `問題 ${window.currentEditPage + 1} / ${window.problemSet.length}`;
    }
};

/* --- ページ遷移制御 --- */
addClick('prev-page-btn', () => {
    if (window.currentEditPage > 0) {
        window.saveCurrentPage();
        window.currentEditPage--;
        window.loadPageToDOM(window.problemSet[window.currentEditPage]);
        window.updatePageUI();
        window.saveHistoryState();
    }
});

addClick('next-page-btn', () => {
    if (window.currentEditPage < window.problemSet.length - 1) {
        window.saveCurrentPage();
        window.currentEditPage++;
        window.loadPageToDOM(window.problemSet[window.currentEditPage]);
        window.updatePageUI();
        window.saveHistoryState();
    }
});

addClick('add-page-btn', () => {
    window.saveCurrentPage();
    window.problemSet.push([]);
    window.currentEditPage = window.problemSet.length - 1;
    window.loadPageToDOM(window.problemSet[window.currentEditPage]);
    window.updatePageUI();
    window.saveHistoryState();
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
        window.saveHistoryState();
    }
});

/* ==========================================
   動作・変数設定・判定設定
   ========================================== */
addClick('action-settings-btn', () => {
    const quizTitleInput = document.getElementById('quiz-title-input');
    if (quizTitleInput) {
        quizTitleInput.value = window.quizTitle || '自作グリッド問題';
    }
    
    const bgColorInput = document.getElementById('bg-color-input');
    if (bgColorInput) {
        bgColorInput.value = window.bgColor || '#ffffff';
    }

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

    const orderSelect = document.getElementById('order-style-select');
    if (orderSelect) {
        orderSelect.value = window.orderStyle || 'random';
    }

    document.getElementById('action-settings-container').style.display = 'flex';
    document.getElementById('overlay').style.display = 'block';
});

addClick('save-action-settings-btn', async () => {
    const quizTitleInput = document.getElementById('quiz-title-input');
    if (quizTitleInput) {
        window.quizTitle = quizTitleInput.value.trim() || '自作グリッド問題';
    }

    const bgColorInput = document.getElementById('bg-color-input');
    if (bgColorInput) {
        window.bgColor = bgColorInput.value;
        const cont = document.getElementById('container');
        if (cont) cont.style.backgroundColor = window.bgColor;
    }

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

    const orderSelect = document.getElementById('order-style-select');
    if (orderSelect) {
        window.orderStyle = orderSelect.value;
    }
    
    const aSound = document.getElementById('var-action-sound').files[0];
    if (aSound) {
        window.actionSoundData = await new Promise(r => { const rd = new FileReader(); rd.onload = e => r(e.target.result); rd.readAsDataURL(aSound); });
    }

    document.getElementById('action-settings-container').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    window.saveHistoryState();
});

addClick('var-settings-btn', () => {
    const container = document.getElementById('container');
    if (!container) return;
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
            const note = document.createElement('div');
            note.style.fontSize = '0.9rem';
            note.style.color = '#e67e22';
            note.style.marginBottom = '10px';
            note.style.textAlign = 'center';
            note.textContent = '※Min/Maxには [x1]-1 のように他の変数を含めた数式も入力可能です。';
            listContainer.appendChild(note);

            foundVars.forEach(v => {
                const range = (typeof variableRanges !== 'undefined' ? variableRanges[v] : null) || { min: "1", max: "9", color: "#e74c3c", size: 1.0 };
                const minStr = range.min !== undefined ? String(range.min) : "1";
                const maxStr = range.max !== undefined ? String(range.max) : "9";

                const row = document.createElement('div');
                row.className = 'prop-setting-row';
                row.style.flexWrap = 'wrap';
                row.innerHTML = `
                    <strong style="font-size: 1.2rem; color:#333; width: 100%; margin-bottom: 8px; border-bottom: 1px solid #eee;">${v}</strong>
                    <div style="display:flex; justify-content:space-between; width:100%; margin-bottom: 5px;">
                        <label style="font-weight:bold; color:#555; font-size:0.9rem;">Min: <input type="text" class="var-min-input prop-setting-input" data-var="${v}" value="${minStr}"></label>
                        <label style="font-weight:bold; color:#555; font-size:0.9rem;">Max: <input type="text" class="var-max-input prop-setting-input" data-var="${v}" value="${maxStr}"></label>
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

addClick('save-var-settings-btn', async () => {
    const listContainer = document.getElementById('var-list-container');
    if(listContainer) {
        if (typeof variableRanges === 'undefined') window.variableRanges = {};
        const minInputs = listContainer.querySelectorAll('.var-min-input');
        const maxInputs = listContainer.querySelectorAll('.var-max-input');
        const colorInputs = listContainer.querySelectorAll('.var-color-input');
        const sizeInputs = listContainer.querySelectorAll('.var-size-input');
        
        minInputs.forEach((minInput, index) => {
            const v = minInput.dataset.var;
            window.variableRanges[v] = {
                min: minInput.value.trim(),
                max: maxInputs[index].value.trim(),
                color: colorInputs[index].value,
                size: parseFloat(sizeInputs[index].value) || 1.0
            };
        });
    }
    document.getElementById('var-settings-container').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    window.saveHistoryState();
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

addClick('save-judge-prop-btn', async () => {
    window.judgeSettings.correct.text = document.getElementById('judge-correct-text').value.trim() || "せいかい！";
    window.judgeSettings.correct.color = document.getElementById('judge-correct-color').value;
    window.judgeSettings.correct.stroke = document.getElementById('judge-correct-stroke').value;
    window.judgeSettings.correct.bg = document.getElementById('judge-correct-bg').value.trim() || "transparent";

    window.judgeSettings.incorrect.text = document.getElementById('judge-incorrect-text').value.trim() || "おしい！";
    window.judgeSettings.incorrect.color = document.getElementById('judge-incorrect-color').value;
    window.judgeSettings.incorrect.stroke = document.getElementById('judge-incorrect-stroke').value;
    window.judgeSettings.incorrect.bg = document.getElementById('judge-incorrect-bg').value.trim() || "transparent";

    const cSound = document.getElementById('judge-correct-sound').files[0];
    if (cSound) {
        window.judgeSettings.correct.soundData = await new Promise(r => { const rd = new FileReader(); rd.onload = e => r(e.target.result); rd.readAsDataURL(cSound); });
    }
    const iSound = document.getElementById('judge-incorrect-sound').files[0];
    if (iSound) {
        window.judgeSettings.incorrect.soundData = await new Promise(r => { const rd = new FileReader(); rd.onload = e => r(e.target.result); rd.readAsDataURL(iSound); });
    }

    document.getElementById('judge-prop-container').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    window.saveHistoryState();
});

/* ==========================================
   レイアウトデータ生成関数 (保存用)
   ========================================== */
function generateLayoutData() {
    window.saveCurrentPage(); 
    return { 
        config: {
            quizTitle: window.quizTitle, 
            bgColor: window.bgColor, 
            variableRanges: (typeof variableRanges !== 'undefined') ? variableRanges : {},
            enableEmptyCheck: window.enableEmptyCheck === true,
            transitionStyle: window.transitionStyle, 
            playMode: window.playMode, 
            orderStyle: window.orderStyle, 
            judgeSettings: window.judgeSettings,
            actionSoundData: window.actionSoundData
        },
        pages: window.problemSet
    };
}

/* ==========================================
   ★モード移行・出題エンジン
   ========================================== */
window.enterRunMode = function(isInit = false) {
    if (typeof isEditMode !== 'undefined') isEditMode = false;
    document.body.classList.add('run-mode');
    document.querySelectorAll('.wrapper-selected').forEach(w => w.classList.remove('wrapper-selected'));
    
    // 実行中はUndo / Redoボタンを非表示
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    if (undoBtn) undoBtn.style.display = 'none';
    if (redoBtn) redoBtn.style.display = 'none';

    if (!isInit) {
        window.saveCurrentPage();
    }

    window.playMode = window.playMode || 'pattern2';
    window.orderStyle = window.orderStyle || 'random';
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
        
        if (window.orderStyle === 'random') {
            for (let i = validPages.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [validPages[i], validPages[j]] = [validPages[j], validPages[i]];
            }
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
        
        if (window.orderStyle === 'random') {
            for (let i = csvLines.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [csvLines[i], csvLines[j]] = [csvLines[j], csvLines[i]];
            }
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
    if (typeof isSolved !== 'undefined') isSolved = false;
    window.loadPageToDOM(window.runProblemSet[index]);
    const container = document.getElementById('container');
    if (!container) return;

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
                f.dataset.evalContent = `[${correctBoxId}]=1`; 
                const rect = f.querySelector('.formula-rect');
                if(rect) rect.textContent = `[${correctBoxId}]=1`;
            });
        }
    }

    const checkRect = document.querySelector('.check-rect');
    if (checkRect && checkRect.textContent === 'できた') checkRect.textContent = "できた";

    if (typeof window.generateProblemVars === 'function') {
        window.generateProblemVars();
    } else {
        if (typeof currentVarValues !== 'undefined') currentVarValues = {};
    }

    if (window.playMode !== 'pattern3' && typeof window.shuffleBoxes === 'function') {
        window.shuffleBoxes();
    }

    const textWrappers = container.querySelectorAll('.draggable[data-type="text"]');
    const answerWrappers = container.querySelectorAll('.draggable[data-type="answer"]');
    const boxWrappers = container.querySelectorAll('.draggable[data-type="box"]');
    const toolWrappers = container.querySelectorAll('.draggable[data-type="tool"]');
    
    textWrappers.forEach(wrapper => window.renderText ? window.renderText(wrapper) : null);
    answerWrappers.forEach(wrapper => window.renderAnswer ? window.renderAnswer(wrapper) : null);
    boxWrappers.forEach(wrapper => window.renderBox ? window.renderBox(wrapper) : null);
    toolWrappers.forEach(wrapper => {
        if (typeof ToolManager !== 'undefined') ToolManager.renderTool(wrapper);
    });

    const startScreen = document.getElementById('start-screen');
    const isStartScreenVisible = startScreen && startScreen.style.display !== 'none';
    if (window.actionSoundData && !isStartScreenVisible && typeof window.playSound === 'function') {
        window.playSound(window.actionSoundData);
    }

    window.problemStartTime = new Date();
};

window.enterEditMode = function() {
    if (typeof isEditMode !== 'undefined') isEditMode = true;
    document.body.classList.remove('run-mode');
    if (typeof isSolved !== 'undefined') isSolved = false;

    // 編集モード復帰時はUndo / Redoボタンを再表示
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    if (undoBtn) undoBtn.style.display = '';
    if (redoBtn) redoBtn.style.display = '';

    if (window.problemSet[window.currentEditPage]) {
        window.loadPageToDOM(window.problemSet[window.currentEditPage]);
    }
    window.updatePageUI();
    if (typeof currentVarValues !== 'undefined') currentVarValues = {};
    
    window.saveHistoryState();
};

addClick('run-btn', () => {
    const runBtn = document.getElementById('run-btn');
    if (typeof isEditMode !== 'undefined' && isEditMode) {
        window.enterRunMode(false); 
        if (runBtn) { runBtn.textContent = '■編集に戻る'; runBtn.style.backgroundColor = '#e74c3c'; }
    } else {
        window.enterEditMode();
        if (runBtn) { runBtn.textContent = '▶実行'; runBtn.style.backgroundColor = '#2ecc71'; }
    }
});

/* ==========================================
   データ保存・読込処理 
   ========================================== */
addClick('save-btn', async () => {
    const data = generateLayoutData();
    const jsonString = JSON.stringify(data, null, 2);
    
    try {
        if (window.showSaveFilePicker) {
            const handle = await window.showSaveFilePicker({
                suggestedName: 'layout.json',
                types: [{
                    description: 'JSON File',
                    accept: {'application/json': ['.json']},
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(jsonString);
            await writable.close();
        } else {
            let fileName = prompt("保存するファイル名を入力してください", "layout.json");
            if (!fileName) return; 
            if (!fileName.endsWith('.json')) fileName += '.json';
            
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error(err);
            alert("保存に失敗しました。");
        }
    }
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
                window.variableRanges = {}; 
                
                if (data.pages) {
                    const config = data.config || {};
                    window.quizTitle = config.quizTitle || '自作グリッド問題'; 
                    window.bgColor = config.bgColor || '#ffffff'; 
                    window.variableRanges = config.variableRanges || {};
                    window.enableEmptyCheck = config.enableEmptyCheck === true; 
                    window.transitionStyle = config.transitionStyle || 'none'; 
                    window.playMode = config.playMode || 'pattern2'; 
                    window.orderStyle = config.orderStyle || 'random';
                    if (config.judgeSettings) window.judgeSettings = config.judgeSettings; 
                    window.actionSoundData = config.actionSoundData || null;
                    window.problemSet = data.pages;
                } else {
                    const items = [];
                    data.forEach(item => {
                        if (item.type === 'config') {
                            window.quizTitle = item.quizTitle || '自作グリッド問題';
                            window.bgColor = item.bgColor || '#ffffff'; 
                            window.variableRanges = item.variableRanges || {};
                            window.enableEmptyCheck = item.enableEmptyCheck === true; 
                            window.transitionStyle = item.transitionStyle || 'none'; 
                            window.playMode = item.playMode || 'pattern1'; 
                            window.orderStyle = item.orderStyle || 'random';
                            if (item.judgeSettings) window.judgeSettings = item.judgeSettings; 
                            window.actionSoundData = item.actionSoundData || null;
                        } else {
                            items.push(item);
                        }
                    });
                    window.problemSet = [items];
                }

                const cont = document.getElementById('container');
                if (cont) cont.style.backgroundColor = window.bgColor;

                window.currentEditPage = 0;
                window.loadPageToDOM(window.problemSet[0]);
                window.updatePageUI();
                
                window.historyStack = [];
                window.historyIndex = -1;
                window.saveHistoryState();

            } catch (err) {
                alert("JSONファイルの読み込みに失敗しました。");
            }
            e.target.value = ''; 
        };
        reader.readAsText(file);
    });
}

/* ==========================================
   ★公開版書出 
   ========================================== */
addClick('export-html-btn', async () => {
    window.saveCurrentPage(); 

    if (window.playMode === 'pattern2') {
        const validPages = [...window.problemSet].filter(p => p && p.length > 0);
        if (validPages.length === 0) {
            alert("書き出しエラー：問題が設定されていないため、書き出しを中止しました。画面に要素を配置してください。");
            return;
        }
    } else if (window.playMode === 'pattern3') {
        const page0 = window.problemSet[0] || [];
        let csvLines = [];
        const formulaItem = page0.find(item => item.type === 'formula');
        if (formulaItem && formulaItem.content) {
            csvLines = formulaItem.content.split('\n').filter(l => l.trim() !== '');
        }
        if (csvLines.length === 0) {
            alert("書き出しエラー：パターン3で書き出すするには、画面上に「計算式追加」からアイテムを配置し、プロパティにCSVデータを入力する必要があります。書き出しを中止しました。");
            return;
        }
    }

    try {
        const t = new Date().getTime();
        const cssRes = await fetch('style.css?t=' + t);
        if (!cssRes.ok && cssRes.status !== 0) throw new Error("style.css が取得できませんでした。");
        const cssText = await cssRes.text();

        const jsFiles = ['script_core.js', 'script_element.js', 'script_game.js', 'script_drag.js', 'script_tools.js', 'script_tegaki.js', 'script_main.js'];
        let combinedJsText = '';
        for (const file of jsFiles) {
            const res = await fetch(file + '?t=' + t);
            if (!res.ok && res.status !== 0) throw new Error(`${file} が取得できませんでした。`);
            combinedJsText += await res.text() + '\n\n';
        }

        const data = generateLayoutData();
        const jsonString = JSON.stringify(data).replace(/<\/(s)(cript)>/gi, '<\\/$1$2>');

        const htmlClone = document.documentElement.cloneNode(true);

        const containerClone = htmlClone.querySelector('#container');
        if (containerClone) containerClone.innerHTML = ''; 
        
        const oldToast = htmlClone.querySelector('.toast-msg');
        if (oldToast) oldToast.remove(); 

        const topMenuClone = htmlClone.querySelector('.top-menu-bar');
        if (topMenuClone) topMenuClone.remove();

        const sidebarClone = htmlClone.querySelector('.sidebar');
        if (sidebarClone) sidebarClone.remove();

        const oldOverlay = htmlClone.querySelector('#tegaki-feedback-overlay');
        if (oldOverlay) oldOverlay.remove();
        const oldStartScreen = htmlClone.querySelector('#start-screen');
        if (oldStartScreen) oldStartScreen.remove();

        htmlClone.querySelectorAll('link[rel="stylesheet"]').forEach(el => {
            if (el.href && el.href.includes('style.css')) el.remove();
        });
        htmlClone.querySelectorAll('script').forEach(el => {
            el.remove(); 
        });

        const styleTag = document.createElement('style');
        styleTag.textContent = cssText;
        htmlClone.querySelector('head').appendChild(styleTag);

        const startScreenHtml = `
        <div id="start-screen" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: #f0f8ff; display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 10000;">
            <h1 style="font-size: 3rem; color: #2c3e50; margin-bottom: 40px; text-shadow: 1px 1px 2px rgba(0,0,0,0.1);">問題スタート</h1>
            <button id="start-btn" style="padding: 20px 60px; font-size: 2.5rem; font-weight: bold; color: #fff; background-color: #3498db; border: none; border-radius: 15px; cursor: pointer; box-shadow: 0 8px 0 #2980b9; transition: transform 0.1s, box-shadow 0.1s;">スタート</button>
            <br><br><a href="index.html" style="margin-top: 20px; padding: 12px 30px; font-size: 1.2rem; cursor: pointer; border: none; border-radius: 8px; background-color: #95a5a6; color: #fff; text-decoration: none; font-weight: bold;">メニューへ戻る</a>
        </div>
        `;
        htmlClone.querySelector('body').insertAdjacentHTML('afterbegin', startScreenHtml);

        const mainContainer = htmlClone.querySelector('.main-container');
        if (mainContainer) mainContainer.style.display = 'none';

        const scriptTag = document.createElement('script');
        scriptTag.textContent = `
window.__INIT_DATA__ = ${jsonString};

${combinedJsText}

document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    if(startBtn) {
        startBtn.addEventListener('click', () => {
            document.getElementById('start-screen').style.display = 'none';
            const mc = document.querySelector('.main-container');
            if(mc) mc.style.display = 'flex';
            window.problemStartTime = new Date();
            if (window.actionSoundData && typeof window.playSound === 'function') {
                window.playSound(window.actionSoundData);
            }
        });
        
        startBtn.addEventListener('mousedown', function() {
            this.style.transform = 'translateY(8px)';
            this.style.boxShadow = 'none';
        });
        startBtn.addEventListener('mouseup', function() {
            this.style.transform = 'none';
            this.style.boxShadow = '0 8px 0 #2980b9';
        });
        startBtn.addEventListener('touchstart', function() {
            this.style.transform = 'translateY(8px)';
            this.style.boxShadow = 'none';
        });
        startBtn.addEventListener('touchend', function() {
            this.style.transform = 'none';
            this.style.boxShadow = '0 8px 0 #2980b9';
        });
    }
});
`;
        htmlClone.querySelector('body').appendChild(scriptTag);

        const htmlText = "<!DOCTYPE html>\n" + htmlClone.outerHTML;

        if (window.showSaveFilePicker) {
            const handle = await window.showSaveFilePicker({
                suggestedName: 'published_grid.html',
                types: [{
                    description: 'HTML File',
                    accept: {'text/html': ['.html']},
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(htmlText);
            await writable.close();
        } else {
            let fileName = prompt("書き出すファイル名を入力してください", "published_grid.html");
            if (!fileName) return; 
            if (!fileName.endsWith('.html')) fileName += '.html';

            const blob = new Blob([htmlText], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

    } catch (e) {
        if (e.name !== 'AbortError') {
            console.error(e);
            alert("書き出しに失敗しました。ローカル環境(file://)のセキュリティ制限によりファイルが読み込めない可能性があります。Webサーバー(http/https)上で実行しているか確認してください。\n詳細: " + e.message);
        }
    }
});

/* ==========================================
   ★ コピー＆ペースト・複製モジュール
   ========================================== */
window.copiedItemsData = [];

window.copySelectedItems = function() {
    if (typeof isEditMode !== 'undefined' && !isEditMode) return;
    const container = document.getElementById('container');
    if (!container) return;
    
    const selectedWrappers = container.querySelectorAll('.wrapper-selected');
    if (selectedWrappers.length === 0) return;

    window.copiedItemsData = [];
    selectedWrappers.forEach(wrapper => {
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
        } else if (type === 'tool') {
            itemData.toolId = wrapper.dataset.toolId;
            itemData.objId = wrapper.dataset.objId;
            itemData.gridX = parseInt(wrapper.dataset.gridX) || 0;
            itemData.gridY = parseInt(wrapper.dataset.gridY) || 0;
            itemData.wCells = parseInt(wrapper.dataset.wCells) || 10;
            itemData.hCells = parseInt(wrapper.dataset.hCells) || 6;
            itemData.currentDivisions = parseInt(wrapper.dataset.currentDivisions) || 1;
        } else {
            itemData.gridX = parseInt(wrapper.dataset.gridX) || 0;
            itemData.gridY = parseInt(wrapper.dataset.gridY) || 0;
            itemData.wCells = parseInt(wrapper.dataset.wCells) || 2;
            itemData.hCells = parseInt(wrapper.dataset.hCells) || 2;
            itemData.content = type === 'text' ? (wrapper.dataset.originalContent || (el ? el.innerHTML : '')) : (el ? el.textContent : '');

            if (type === 'box') {
                itemData.boxName = wrapper.dataset.boxName || itemData.content;
                itemData.boxId = wrapper.dataset.boxId || "";
                itemData.fontSize = wrapper.dataset.fontSize || "1.0";
                itemData.isLastPressed = wrapper.dataset.isLastPressed || "false";
                itemData.isShuffleable = wrapper.dataset.isShuffleable || "false";
                itemData.bgColor = wrapper.dataset.bgColor || "#44FFFF";
                itemData.borderColor = wrapper.dataset.borderColor || "#000000";
                itemData.borderwidth = wrapper.dataset.borderwidth || "0";
            }
            if (type === 'answer') {
                itemData.answerId = wrapper.dataset.answerId || '';
                itemData.calcMode = wrapper.dataset.calcMode || '0-20';
                itemData.formula = wrapper.dataset.formula || '';
                itemData.digits = parseInt(wrapper.dataset.digits) || 0;
                itemData.ansStyle = wrapper.dataset.ansStyle || 'normal';
                itemData.thickness = parseInt(wrapper.dataset.thickness) || 4;
                itemData.content = '';
            }
            if (type === 'text') {
                itemData.digits = parseInt(wrapper.dataset.digits) || 0;
                itemData.fontSize = parseFloat(wrapper.dataset.fontSize) || 1.0;
            }
        }
        window.copiedItemsData.push(itemData);
    });
};

window.pasteItems = function() {
    if (typeof isEditMode !== 'undefined' && !isEditMode) return;
    if (!window.copiedItemsData || window.copiedItemsData.length === 0) return;

    const container = document.getElementById('container');
    if (!container) return;

    container.querySelectorAll('.wrapper-selected').forEach(w => w.classList.remove('wrapper-selected'));

    const offset = 1; 
    const pastedCount = window.copiedItemsData.length;

    window.copiedItemsData.forEach(originalData => {
        let itemData = JSON.parse(JSON.stringify(originalData));

        if (itemData.type === 'line') {
            itemData.startX += offset;
            itemData.startY += offset;
            itemData.endX += offset;
            itemData.endY += offset;
        } else {
            itemData.gridX += offset;
            itemData.gridY += offset;
        }

        if (itemData.boxId) itemData.boxId += '_copy';
        if (itemData.answerId) itemData.answerId += '_copy';
        if (itemData.objId) itemData.objId += '_copy';

        if (typeof createDraggable === 'function') {
            createDraggable(itemData.type, itemData);
        }
    });

    const allDraggables = container.querySelectorAll('.draggable');
    for (let i = allDraggables.length - pastedCount; i < allDraggables.length; i++) {
        if (allDraggables[i]) allDraggables[i].classList.add('wrapper-selected');
    }
    
    window.saveHistoryState();
};

window.duplicateSelectedItems = function() {
    window.copySelectedItems();
    window.pasteItems();
};

/* ==========================================
   ★キーボード・ショートカット制御
   ========================================== */
window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'F1') typeof createDraggable === 'function' && withHistory(() => createDraggable('box'));

    // Undo / Redo
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        window.undo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        window.redo();
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        window.redo();
    }

    // 複製・コピー・ペースト・削除
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault(); 
        if (typeof window.duplicateSelectedItems === 'function') window.duplicateSelectedItems();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (typeof window.copySelectedItems === 'function') window.copySelectedItems();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (typeof window.pasteItems === 'function') window.pasteItems();
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedItems = document.querySelectorAll('.wrapper-selected');
        if (selectedItems.length > 0) {
            if (confirm(`選択中のアイテム（${selectedItems.length}個）を削除しますか？`)) {
                window.saveHistoryState(); 
                selectedItems.forEach(item => item.remove());
                window.saveHistoryState(); 
            }
        }
    }
});

/* ==========================================
   公開版HTMLとしての初期化処理 (ロード時)
   ========================================== */
if (typeof window.__INIT_DATA__ !== 'undefined') {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.remove();

    const data = window.__INIT_DATA__;
    window.variableRanges = {}; 
    
    if (data.pages) {
        const config = data.config || {};
        window.quizTitle = config.quizTitle || '自作グリッド問題'; 
        window.bgColor = config.bgColor || '#ffffff'; 
        const cont = document.getElementById('container');
        if (cont) cont.style.backgroundColor = window.bgColor;
        window.variableRanges = config.variableRanges || {};
        window.enableEmptyCheck = config.enableEmptyCheck === true; 
        window.transitionStyle = config.transitionStyle || 'none'; 
        window.playMode = config.playMode || 'pattern2';
        window.orderStyle = config.orderStyle || 'random';
        if (config.judgeSettings) window.judgeSettings = config.judgeSettings; 
        window.actionSoundData = config.actionSoundData || null;
        window.problemSet = data.pages;
    } else {
        const items = [];
        data.forEach(item => {
            if (item.type === 'config') {
                window.quizTitle = item.quizTitle || '自作グリッド問題';
                window.bgColor = item.bgColor || '#ffffff';
                const cont = document.getElementById('container');
                if (cont) cont.style.backgroundColor = window.bgColor;
                window.variableRanges = item.variableRanges || {};
                window.enableEmptyCheck = item.enableEmptyCheck === true; 
                window.transitionStyle = item.transitionStyle || 'none'; 
                window.playMode = item.playMode || 'pattern1';
                window.orderStyle = item.orderStyle || 'random';
                if (item.judgeSettings) window.judgeSettings = item.judgeSettings; 
                window.actionSoundData = item.actionSoundData || null;
            } else {
                items.push(item);
            }
        });
        window.problemSet = [items];
    }

    setTimeout(() => {
        if (typeof window.enterRunMode === 'function') window.enterRunMode(true);
    }, 50);
}

if (typeof window.updatePageUI === 'function') {
    window.updatePageUI();
}
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.saveHistoryState();
    }, 100);
});