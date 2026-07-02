/* ==========================================
   UIイベント・保存・エクスポート
   ========================================== */
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

// ==========================================
// モード移行処理関数化（10問リザルト連携対応）
// ==========================================
window.enterRunMode = function() {
    isEditMode = false;
    const runBtn = document.getElementById('run-btn');
    document.body.classList.add('run-mode');
    if (runBtn) {
        runBtn.textContent = '編集モードへ戻る';
        runBtn.style.backgroundColor = '#e74c3c'; 
    }
    
    document.querySelectorAll('.wrapper-selected').forEach(w => w.classList.remove('wrapper-selected'));
    
    // 10問管理のリセット
    window.currentQuestionNum = 1;
    if (window.usedVarHistory) window.usedVarHistory.clear();
    
    // 正解状態のリセット
    isSolved = false;
    const checkRect = document.querySelector('.check-rect');
    if (checkRect) checkRect.textContent = "できた";

    const textWrappers = container.querySelectorAll('.draggable[data-type="text"]');
    
    // 確実なデータ退避
    textWrappers.forEach(wrapper => {
        const el = wrapper.querySelector('.text-rect');
        if (el && !wrapper.dataset.originalContent) {
            wrapper.dataset.originalContent = el.innerHTML;
        }
    });

    // 最初の問題の変数を生成 (script_core.js の generateProblemVars を使用)
    if (typeof window.generateProblemVars === 'function') {
        window.generateProblemVars();
    } else {
        currentVarValues = {};
    }

    // 文字の置換表示
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

    const answerWrappers = container.querySelectorAll('.draggable[data-type="answer"]');
    answerWrappers.forEach(wrapper => {
        const el = wrapper.querySelector('.ans-rect');
        if (el) el.textContent = ''; 
    });
};

window.enterEditMode = function() {
    isEditMode = true;
    const runBtn = document.getElementById('run-btn');
    document.body.classList.remove('run-mode');
    if (runBtn) {
        runBtn.textContent = '実行モードへ';
        runBtn.style.backgroundColor = '#2ecc71'; 
    }

    // 正解状態のリセット
    isSolved = false;
    const checkRect = document.querySelector('.check-rect');
    if (checkRect) checkRect.textContent = "できた";

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
};

// モード切り替え
document.getElementById('run-btn').addEventListener('click', () => {
    if (isEditMode) {
        window.enterRunMode();
    } else {
        window.enterEditMode();
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
    if (typeof window.enterRunMode === 'function') {
        window.enterRunMode();
    }
}