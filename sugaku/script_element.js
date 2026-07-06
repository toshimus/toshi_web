/* ==========================================
   script_element.js (要素の生成とレンダリング、個別ドラッグ処理)
   ========================================== */

window.insertIntoFormula = function(text) {
    const input = document.getElementById('formula-prop-content');
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const val = input.value;
    input.value = val.substring(0, start) + text + val.substring(end);
    input.focus();
    input.selectionStart = input.selectionEnd = start + text.length;
};

window.insertVarIntoText = function() {
    const varName = prompt("追加する変数の名前を入力してください（例: x1）:");
    if (varName && varName.trim() !== "") {
        const textToInsert = `[${varName.trim()}]`;
        const input = document.getElementById('text-prop-content');
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const val = input.value;
        input.value = val.substring(0, start) + textToInsert + val.substring(end);
        input.focus();
        input.selectionStart = input.selectionEnd = start + textToInsert.length;
    }
};

window.insertFracIntoText = function() {
    const num = prompt("分子を入力してください（例: 2 または [x1]）:");
    if (num === null) return;
    const den = prompt("分母を入力してください（例: 3 または [x2]）:");
    if (den === null) return;
    
    if (num.trim() !== "" && den.trim() !== "") {
        const textToInsert = `{${den.trim()}分の${num.trim()}}`;
        const input = document.getElementById('text-prop-content');
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const val = input.value;
        input.value = val.substring(0, start) + textToInsert + val.substring(end);
        input.focus();
        input.selectionStart = input.selectionEnd = start + textToInsert.length;
    }
};

window.renderBox = function(wrapper) {
    const el = wrapper.querySelector('.rect');
    if (!el) return;
    
    let originalContent = wrapper.dataset.boxName || '';
    
    // ★追加: フォントサイズの反映
    const fontSize = parseFloat(wrapper.dataset.fontSize) || 1.0;
    el.style.fontSize = `calc(var(--grid-cell-h) * 1.2 * ${fontSize})`;
    
    if (isEditMode) {
        el.textContent = originalContent;
    } else {
        let replacedText = originalContent;
        const sortedVars = Object.keys(currentVarValues).sort((a, b) => b.length - a.length);
        for (const varName of sortedVars) {
            const val = currentVarValues[varName];
            if (val !== undefined) {
                replacedText = replacedText.split(varName).join(val);
            }
        }
        el.textContent = replacedText;
    }
};

function renderText(wrapper) {
    const el = wrapper.querySelector('.text-rect');
    if (!el) return;
    const digits = parseInt(wrapper.dataset.digits) || 0;
    const fontSize = parseFloat(wrapper.dataset.fontSize) || 1.0; 
    const originalContent = wrapper.dataset.originalContent || '';
    
    wrapper.style.setProperty('--text-scale', fontSize);
    
    el.innerHTML = '';
    
    const fracRegex = /\{(.*?)分の(.*?)\}/g;
    const fracReplacer = (match, den, num) => {
        return `<span class="inline-frac"><span class="inline-frac-num">${num}</span><span class="inline-frac-den">${den}</span></span>`;
    };
    
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
            label.innerHTML = originalContent.replace(fracRegex, fracReplacer); 
            el.appendChild(label);
        } else {
            el.innerHTML = originalContent.replace(fracRegex, fracReplacer);
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
        el.innerHTML = replacedText.replace(fracRegex, fracReplacer);
    }
}
window.renderText = renderText; 

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

function renderAnswer(wrapper) {
    const el = wrapper.querySelector('.ans-rect');
    if (!el) return;
    const digits = parseInt(wrapper.dataset.digits) || 0;
    const answerId = wrapper.dataset.answerId || '';
    const style = wrapper.dataset.ansStyle || 'normal'; 
    
    el.innerHTML = '';
    
    if (style !== 'normal') {
        el.classList.add('is-fraction');
        const fracContainer = document.createElement('div');
        fracContainer.className = 'fraction-container';
        
        const numDiv = document.createElement('div');
        numDiv.className = 'fraction-num';
        
        const denDiv = document.createElement('div');
        denDiv.className = 'fraction-den';
        
        const lineDiv = document.createElement('div');
        lineDiv.className = 'fraction-line';
        
        const createInput = (subId) => {
            const inp = document.createElement('div');
            inp.className = 'fraction-input';
            inp.dataset.subId = subId;
            if (isEditMode) {
                inp.textContent = `${answerId.replace(/[\[\]]/g, '')}_${subId}`;
                inp.style.fontSize = '0.4em';
                inp.style.color = '#999';
            }
            return inp;
        };

        if (style === 'frac-1') {
            numDiv.appendChild(createInput('num'));
        } else if (style === 'frac-add') {
            numDiv.appendChild(createInput('num1'));
            const op = document.createElement('span'); op.textContent = '+'; op.className = 'frac-op';
            numDiv.appendChild(op);
            numDiv.appendChild(createInput('num2'));
        } else if (style === 'frac-sub') {
            numDiv.appendChild(createInput('num1'));
            const op = document.createElement('span'); op.textContent = '-'; op.className = 'frac-op';
            numDiv.appendChild(op);
            numDiv.appendChild(createInput('num2'));
        }
        
        denDiv.appendChild(createInput('den'));
        
        fracContainer.appendChild(numDiv);
        fracContainer.appendChild(lineDiv);
        fracContainer.appendChild(denDiv);
        
        el.appendChild(fracContainer);
        return; 
    }

    el.classList.remove('is-fraction'); 
    if (digits > 0) {
        el.classList.add('is-split'); 
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
        
        if (isEditMode) {
            const label = document.createElement('div');
            label.className = 'id-label';
            label.textContent = answerId;
            el.appendChild(label);
        }
    } else {
        el.classList.remove('is-split'); 
        if (isEditMode) {
            el.textContent = answerId;
        } else {
            el.textContent = ''; 
        }
    }
}
window.renderAnswer = renderAnswer; 

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

    } else if (type === 'tool') {
        let wCells = itemData ? itemData.wCells : 10;
        let hCells = itemData ? itemData.hCells : 6;
        const gridX = itemData ? itemData.gridX : 2;
        const gridY = itemData ? itemData.gridY : 2;
        
        wrapper.dataset.wCells = wCells;
        wrapper.dataset.hCells = hCells;
        wrapper.dataset.gridX = gridX;
        wrapper.dataset.gridY = gridY;
        wrapper.dataset.toolId = itemData.toolId;
        wrapper.dataset.currentDivisions = itemData.currentDivisions || 1;

        const currentTools = container.querySelectorAll('.draggable[data-type="tool"]').length + 1;
        wrapper.dataset.objId = itemData.objId || ('t' + currentTools);
        
        wrapper.style.width = `calc(${wCells} * (100% / 32))`;
        wrapper.style.height = `calc(${hCells} * (100% / 24))`;
        wrapper.style.left = `calc(${gridX} * (100% / 32))`;
        wrapper.style.top = `calc(${gridY} * (100% / 24))`;

        el.style.width = '100%';
        el.style.height = '100%';
        el.style.pointerEvents = 'none'; 
        wrapper.appendChild(el);

        wrapper.addEventListener('dblclick', (e) => {
            if (!isEditMode) return;
            e.stopPropagation();
            activeToolWrapper = wrapper;
            document.getElementById('tool-prop-id').value = wrapper.dataset.objId;
            document.getElementById('tool-prop-divs').value = wrapper.dataset.currentDivisions;
            document.getElementById('tool-prop-container').style.display = 'flex';
            document.getElementById('overlay').style.display = 'block';
        });

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
        
    } else {
        let wCells = itemData ? itemData.wCells : 2;
        let hCells = itemData ? itemData.hCells : 2;
        const gridX = itemData ? itemData.gridX : 0;
        const gridY = itemData ? itemData.gridY : 0;

        let initialContent = null;

        if (!itemData) {
            const getCellsByText = (text, padding = 1) => {
                if (!text) return 2;
                let len = 0;
                for (let i = 0; i < text.length; i++) {
                    (text[i].match(/[ -~]/)) ? len += 1 : len += 2;
                }
                return Math.max(2, Math.ceil(len / 2) + padding);
            };

            if (type === 'text') {
                initialContent = prompt("追加する文字を入力してください\n(分数は {[x1]分の[x2]} のように { } で囲みます):");
                if (initialContent === null || initialContent.trim() === "") return;
                wCells = getCellsByText(initialContent, 1);
            } else if (type === 'formula') {
                initialContent = "[q1]=[x1]+[x2]";
                wCells = getCellsByText(initialContent, 1);
            } else if (type === 'check') {
                wCells = getCellsByText("次の問題へ", 1); 
            } else if (type === 'menu') {
                wCells = getCellsByText("メニューへ", 1); 
            } else if (type === 'progress') {
                wCells = getCellsByText("第10問 / 全10問", 1); 
            } else if (type === 'box') {
                count++;
                initialContent = count.toString();
                wCells = getCellsByText(initialContent, 2);
            }
        }

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
                wrapper.dataset.boxName = itemData.boxName || itemData.content || "";
                wrapper.dataset.boxId = itemData.boxId || "";
                wrapper.dataset.isLastPressed = itemData.isLastPressed || "false";
                wrapper.dataset.isShuffleable = itemData.isShuffleable || "false"; 
                // ★追加: フォントサイズの読み込み (デフォルトは 1.0)
                wrapper.dataset.fontSize = itemData.fontSize || "1.0"; 
                wrapper.dataset.bgColor = itemData.bgColor || "#44FFFF";
                wrapper.dataset.borderColor = itemData.borderColor || "#000000";
                wrapper.dataset.borderwidth = itemData.borderwidth !== undefined ? itemData.borderwidth : "0";
                const num = parseInt(itemData.content);
                if (!isNaN(num) && num > count) count = num;
            } else {
                wrapper.dataset.boxName = initialContent;
                wrapper.dataset.boxId = "box" + initialContent;
                wrapper.dataset.isLastPressed = "false";
                wrapper.dataset.fontSize = "1.0"; 
                wrapper.dataset.bgColor = "#44FFFF";
                wrapper.dataset.borderColor = "#000000";
                wrapper.dataset.borderwidth = "0";
            }
            el.classList.add('rect');

            el.style.backgroundColor = wrapper.dataset.bgColor;
            const bw = parseInt(wrapper.dataset.borderwidth) || 0;
            if (bw > 0) {
                el.style.border = `${bw}px solid ${wrapper.dataset.borderColor}`;
                el.style.boxSizing = "border-box";
            } else {
                el.style.border = "none";
            }

            if (wrapper.dataset.isLastPressed === "true") {
                el.style.outline = "6px solid #e74c3c";
                el.style.outlineOffset = "2px";
            }
            el.style.opacity = "1";

            el.addEventListener('dblclick', (e) => {
                if (!isEditMode) return;
                e.stopPropagation();
                activeBoxWrapper = wrapper;
                document.getElementById('box-prop-name').value = wrapper.dataset.boxName;
                document.getElementById('box-prop-id').value = wrapper.dataset.boxId;
                document.getElementById('box-prop-fontsize').value = wrapper.dataset.fontSize || "1.0"; // ★追加
                document.getElementById('box-prop-bgcolor').value = wrapper.dataset.bgColor;
                document.getElementById('box-prop-bordercolor').value = wrapper.dataset.borderColor;
                document.getElementById('box-prop-borderwidth').value = wrapper.dataset.borderwidth;
                document.getElementById('box-prop-last').checked = (wrapper.dataset.isLastPressed === "true");
                document.getElementById('box-prop-shuffle').checked = (wrapper.dataset.isShuffleable === "true");
                
                document.getElementById('box-prop-container').style.display = 'flex';
                document.getElementById('overlay').style.display = 'block';
            });

            el.addEventListener('click', (e) => {
                if (isEditMode) return;
                
                if (wrapper.dataset.isQuestion === "true") return; 

                const allBoxes = container.querySelectorAll('.draggable[data-type="box"]');
                allBoxes.forEach(w => {
                    if (w.dataset.isQuestion === "true") return; 
                    w.dataset.isLastPressed = "false";
                    const wEl = w.querySelector('.rect');
                    if (wEl) wEl.style.outline = "none";
                });
                
                wrapper.dataset.isLastPressed = "true";
                el.style.outline = "6px solid #e74c3c";
                el.style.outlineOffset = "2px";
            });

            wrapper.appendChild(el);
            if (typeof window.renderBox === 'function') window.renderBox(wrapper);

        } else if (type === 'answer') {
            el.classList.add('ans-rect');
            wrapper.dataset.answerId = itemData ? (itemData.answerId || itemData.content || '') : '[q1]';
            wrapper.dataset.calcMode = itemData ? (itemData.calcMode || '0-20') : '0-20';
            wrapper.dataset.formula = itemData ? (itemData.formula || '') : ''; 
            wrapper.dataset.digits = itemData ? (itemData.digits || 0) : 0;
            wrapper.dataset.ansStyle = itemData ? (itemData.ansStyle || 'normal') : 'normal'; 
            
            const ansHandler = (e) => {
                if (!isEditMode) return; 
                e.stopPropagation();
                activeAnsWrapper = wrapper;
                document.getElementById('ans-prop-id').value = wrapper.dataset.answerId;
                document.getElementById('ans-prop-mode').value = wrapper.dataset.calcMode;
                document.getElementById('ans-prop-digits').value = wrapper.dataset.digits;
                document.getElementById('ans-prop-style').value = wrapper.dataset.ansStyle || 'normal'; 
                document.getElementById('ans-prop-container').style.display = 'flex';
                document.getElementById('overlay').style.display = 'block';
            };
            bindDoubleTap(el, ansHandler);
            
            wrapper.appendChild(el);
            if (typeof window.renderAnswer === 'function') window.renderAnswer(wrapper);

        } else if (type === 'formula') {
            let txt = itemData ? itemData.content : initialContent;
            el.classList.add('formula-rect');
            el.textContent = txt;
            
            const formulaHandler = (e) => {
                if (!isEditMode) return; 
                if (e) e.stopPropagation();
                activeFormulaWrapper = wrapper;
                document.getElementById('formula-prop-content').value = el.textContent;
                
                const idContainer = document.getElementById('formula-id-btns');
                idContainer.innerHTML = '';
                
                const addInsertBtn = (label, insertText, bgColor) => {
                    const btn = document.createElement('button');
                    btn.className = 'insert-btn';
                    btn.style.backgroundColor = bgColor || '#ecf0f1';
                    btn.textContent = label;
                    btn.onclick = () => window.insertIntoFormula(insertText);
                    idContainer.appendChild(btn);
                };

                const textWrappers = container.querySelectorAll('.draggable[data-type="text"]');
                const vars = new Set();
                textWrappers.forEach(w => {
                    const content = w.dataset.originalContent || w.querySelector('.text-rect').textContent;
                    const matches = content.match(/\[[^\]]+\]/g);
                    if (matches) matches.forEach(m => vars.add(m));
                });
                vars.forEach(v => addInsertBtn(`変数: ${v}`, v, '#ffeaa7'));

                const ansWrappers = container.querySelectorAll('.draggable[data-type="answer"]');
                ansWrappers.forEach(w => {
                    let id = w.dataset.answerId;
                    const style = w.dataset.ansStyle || 'normal';
                    if (id) {
                        const cleanId = id.replace(/[\[\]]/g, '');
                        if (style === 'normal') {
                            addInsertBtn(`解答欄: ${id}`, id, '#81ecec');
                        } else if (style === 'frac-1') {
                            addInsertBtn(`解答欄: ${id} 分子`, `[${cleanId}_num]`, '#81ecec');
                            addInsertBtn(`解答欄: ${id} 分母`, `[${cleanId}_den]`, '#81ecec');
                        } else if (style === 'frac-add' || style === 'frac-sub') {
                            addInsertBtn(`解答欄: ${id} 分子1`, `[${cleanId}_num1]`, '#81ecec');
                            addInsertBtn(`解答欄: ${id} 分子2`, `[${cleanId}_num2]`, '#81ecec');
                            addInsertBtn(`解答欄: ${id} 分母`, `[${cleanId}_den]`, '#81ecec');
                        }
                    }
                });

                const boxWrappers = container.querySelectorAll('.draggable[data-type="box"]');
                boxWrappers.forEach(w => {
                    const id = w.dataset.boxId;
                    const name = w.dataset.boxName;
                    if (id) addInsertBtn(`選択肢: ${name}(${id})`, `[${id}]`, '#fab1a0');
                });

                const toolWrappers = container.querySelectorAll('.draggable[data-type="tool"]');
                toolWrappers.forEach(w => {
                    const objId = w.dataset.objId;
                    const toolId = w.dataset.toolId;
                    let toolName = "教具";
                    if(typeof ToolManager !== 'undefined' && ToolManager.tools[toolId]) {
                        toolName = ToolManager.tools[toolId].name;
                    }
                    if (objId) {
                        addInsertBtn(`${toolName}(${objId}) 分子(塗った数)`, `[${objId}_num]`, '#55efc4');
                        addInsertBtn(`${toolName}(${objId}) 分母(分割数)`, `[${objId}_den]`, '#55efc4');
                    }
                });

                if (idContainer.innerHTML === '') {
                    idContainer.innerHTML = '<span style="color:#7f8c8d; font-size:0.9rem;">設定されている変数・解答欄・選択肢・教具はありません。</span>';
                }

                document.getElementById('formula-prop-container').style.display = 'flex';
                document.getElementById('overlay').style.display = 'block';
            };
            bindDoubleTap(el, formulaHandler);
            
            wrapper.appendChild(el);
            
            if (!itemData) {
                setTimeout(() => {
                    formulaHandler(null);
                }, 10);
            }

        } else if (type === 'text') {
            let txt = itemData ? itemData.content : initialContent;
            el.classList.add('text-rect');
            wrapper.dataset.originalContent = txt; 
            wrapper.dataset.digits = itemData ? (itemData.digits || 0) : 0;
            wrapper.dataset.fontSize = itemData ? (itemData.fontSize || 1.0) : 1.0; 
            
            if (/^\s*\[[^\]]+\]\s*$/.test(txt)) {
                el.classList.add('single-var-text');
            }

            const textHandler = (e) => {
                if (!isEditMode) return; 
                e.stopPropagation();
                activeTextWrapper = wrapper;
                document.getElementById('text-prop-content').value = wrapper.dataset.originalContent;
                document.getElementById('text-prop-size').value = wrapper.dataset.fontSize || 1.0; 
                document.getElementById('text-prop-digits').value = wrapper.dataset.digits;
                document.getElementById('text-prop-container').style.display = 'flex';
                document.getElementById('overlay').style.display = 'block';
            };
            bindDoubleTap(el, textHandler);
            
            wrapper.appendChild(el);
            renderText(wrapper);

        } else if (type === 'check') {
            el.classList.add('check-rect');
            el.textContent = "できた";
            wrapper.appendChild(el);
        } else if (type === 'menu') {
            el.classList.add('check-rect');
            el.style.backgroundColor = '#95a5a6';
            el.textContent = "メニューへ";
            wrapper.appendChild(el);
        } else if (type === 'progress') {
            el.classList.add('progress-rect');
            el.textContent = typeof isEditMode !== 'undefined' && !isEditMode ? `第${window.currentQuestionNum || 1}問 / 全${window.MAX_QUESTIONS || 1}問` : "第?問 / 全?問";
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
        if (!isEditMode && type !== 'answer' && type !== 'check' && type !== 'menu') return; 
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
                    if (innerDiv && itemType !== 'check' && itemType !== 'menu') innerDiv.style.cursor = 'grabbing';
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
                } else if (dragData.type !== 'check' && dragData.type !== 'menu') {
                    const innerDiv = item.querySelector('div');
                    if (innerDiv) innerDiv.style.cursor = 'grab';
                }
            });
            window.activeDragItems = null;
        }

        if (!hasMoved) {
            if (type === 'answer' && !isEditMode) {
                const style = wrapper.dataset.ansStyle || 'normal';
                
                if (style !== 'normal') {
                    const cell = e.target.closest('.fraction-input');
                    if (cell && wrapper.contains(cell)) {
                        activeInputBox = cell;
                    } else {
                        return; 
                    }
                } else {
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
                }
                
                const mode = wrapper.dataset.calcMode || '0-20';
                calc0to20View.style.display = 'none';
                calcStandardView.style.display = 'none';
                document.getElementById('calc-quick-view').style.display = 'none';

                if (mode === 'standard') {
                    calcStandardView.style.display = 'block';
                    stdCalcValue = activeInputBox.textContent || "";
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
                
            } else if (type === 'check' || type === 'menu') {
                if (!isEditMode) {
                    if (type === 'menu') {
                        window.location.href = 'index.html';
                        return;
                    }

                    if (window.isToastShowing) return;

                    const now = Date.now();
                    if (window.lastCheckTime && now - window.lastCheckTime < 500) {
                        return; 
                    }
                    window.lastCheckTime = now;

                    if (isSolved) {
                        if (typeof window.loadNextProblem === 'function') {
                            window.loadNextProblem();
                        }
                    } else {
                        if (typeof window.runValidation === 'function') window.runValidation();
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