/* ==========================================
   script_tools.js (補助アイテム・教具管理用のアドオン基盤)
   ========================================== */
const ToolManager = {
    tools: {
        'fraction-bar': { name: '分数のバー', icon: '■' },
        'fraction-circle': { name: '分数の円', icon: '●' }
    },

    speak: function(text) {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        window.speechSynthesis.speak(utterance);
    },

    addTool: function(toolId) {
        if (!this.tools[toolId]) return;
        
        const toolData = {
            type: 'tool',
            toolId: toolId,
            gridX: 2,
            gridY: 2,
            wCells: 12,
            hCells: 8,
            currentDivisions: 1
        };
        
        if (typeof createDraggable === 'function') {
            createDraggable('tool', toolData);
            const container = document.getElementById('container');
            const newWrapper = container.lastElementChild;
            if (newWrapper && newWrapper.dataset.type === 'tool') {
                newWrapper.dataset.toolId = toolId;
                newWrapper.dataset.currentDivisions = 1;
                this.renderTool(newWrapper);
            }
        }
    },

    renderTool: function(wrapper) {
        const toolId = wrapper.dataset.toolId;
        if (toolId === 'fraction-bar') this.renderFractionBar(wrapper);
        if (toolId === 'fraction-circle') this.renderFractionCircle(wrapper);
    },

    // ★修正: script_element.jsで追加される内部 div(el) の中に描画領域を構築する
    createContentDiv: function(wrapper) {
        let innerEl = wrapper.querySelector('div'); 
        if (!innerEl) {
            // 万が一 innerEl が無い場合のフォールバック
            innerEl = document.createElement('div');
            innerEl.style.width = '100%';
            innerEl.style.height = '100%';
            innerEl.style.pointerEvents = 'none';
            wrapper.appendChild(innerEl);
        }
        
        let contentDiv = innerEl.querySelector('.tool-content');
        if (!contentDiv) {
            contentDiv = document.createElement('div');
            contentDiv.className = 'tool-content';
            contentDiv.style.width = '100%';
            contentDiv.style.height = '100%';
            contentDiv.style.display = 'flex';
            contentDiv.style.flexDirection = 'column';
            contentDiv.style.alignItems = 'center';
            contentDiv.style.justifyContent = 'center';
            contentDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
            contentDiv.style.border = '3px solid #3498db';
            contentDiv.style.borderRadius = '12px';
            contentDiv.style.boxSizing = 'border-box';
            contentDiv.style.padding = '10px';
            contentDiv.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            contentDiv.style.pointerEvents = 'auto'; // ここでイベントを受け取る
            innerEl.appendChild(contentDiv);
        }
        contentDiv.innerHTML = '';
        return contentDiv;
    },

    renderFractionBar: function(wrapper) {
        const contentDiv = this.createContentDiv(wrapper);
        let currentDivisions = parseInt(wrapper.dataset.currentDivisions) || 1;

        const barArea = document.createElement('div');
        barArea.style.width = '95%';
        barArea.style.flex = '1';
        barArea.style.minHeight = '40px';
        barArea.style.display = 'flex';
        barArea.style.border = '2px solid #333';
        barArea.style.backgroundColor = '#fff';

        const controlsArea = document.createElement('div');
        controlsArea.style.display = 'flex';
        controlsArea.style.alignItems = 'center';
        controlsArea.style.justifyContent = 'center';
        controlsArea.style.marginTop = '10px';
        controlsArea.style.height = '40px';

        const divLabel = document.createElement('div');
        divLabel.style.margin = '0 15px';
        divLabel.style.fontSize = '1.2rem';
        divLabel.style.fontWeight = 'bold';
        divLabel.style.color = '#333';
        divLabel.textContent = currentDivisions + ' 分割';

        const updateBar = () => {
            barArea.innerHTML = '';
            for (let i = 0; i < currentDivisions; i++) {
                const segment = document.createElement('div');
                segment.style.flex = '1';
                segment.style.borderRight = (i < currentDivisions - 1) ? '1px dotted #333' : 'none';
                segment.dataset.filled = "false";
                segment.style.backgroundColor = 'transparent';
                segment.style.transition = 'background-color 0.2s';
                
                segment.addEventListener('click', (e) => {
                    if (typeof isEditMode !== 'undefined' && isEditMode) return;
                    e.stopPropagation();
                    
                    const isFilled = segment.dataset.filled === "true";
                    segment.dataset.filled = !isFilled ? "true" : "false";
                    segment.style.backgroundColor = segment.dataset.filled === "true" ? '#a0c4ff' : 'transparent';
                    
                    const filledCount = barArea.querySelectorAll('[data-filled="true"]').length;
                    const readings = ["ぜろ", "いち", "に", "さん", "よん", "ご", "ろく", "なな", "はち", "きゅう", "じゅう", "じゅういち", "じゅうに", "じゅうさん", "じゅうよん", "じゅうご", "じゅうろく", "じゅうなな", "じゅうはち", "じゅうきゅう", "にじゅう"];
                    if (filledCount <= 20) ToolManager.speak(readings[filledCount]);
                });
                barArea.appendChild(segment);
            }
            wrapper.dataset.currentDivisions = currentDivisions;
        };

        const minusBtn = document.createElement('button');
        minusBtn.textContent = 'ー';
        minusBtn.style.width = '35px';
        minusBtn.style.height = '35px';
        minusBtn.style.fontSize = '1.2rem';
        minusBtn.style.borderRadius = '5px';
        minusBtn.style.border = '1px solid #ccc';
        minusBtn.style.cursor = 'pointer';
        minusBtn.onclick = (e) => {
            e.stopPropagation();
            if (typeof isEditMode !== 'undefined' && isEditMode) return;
            if (currentDivisions > 1) {
                currentDivisions--;
                divLabel.textContent = currentDivisions + ' 分割';
                updateBar();
                ToolManager.speak(currentDivisions + "ぶんかつ");
            }
        };

        const plusBtn = document.createElement('button');
        plusBtn.textContent = '＋';
        plusBtn.style.width = '35px';
        plusBtn.style.height = '35px';
        plusBtn.style.fontSize = '1.2rem';
        plusBtn.style.borderRadius = '5px';
        plusBtn.style.border = '1px solid #ccc';
        plusBtn.style.cursor = 'pointer';
        plusBtn.onclick = (e) => {
            e.stopPropagation();
            if (typeof isEditMode !== 'undefined' && isEditMode) return;
            if (currentDivisions < 20) {
                currentDivisions++;
                divLabel.textContent = currentDivisions + ' 分割';
                updateBar();
                ToolManager.speak(currentDivisions + "ぶんかつ");
            }
        };

        updateBar();

        controlsArea.appendChild(minusBtn);
        controlsArea.appendChild(divLabel);
        controlsArea.appendChild(plusBtn);

        contentDiv.appendChild(barArea);
        contentDiv.appendChild(controlsArea);
    },

    renderFractionCircle: function(wrapper) {
        const contentDiv = this.createContentDiv(wrapper);
        let currentDivisions = parseInt(wrapper.dataset.currentDivisions) || 1;

        const circleArea = document.createElement('div');
        circleArea.style.width = '100%';
        circleArea.style.flex = '1';
        circleArea.style.display = 'flex';
        circleArea.style.alignItems = 'center';
        circleArea.style.justifyContent = 'center';
        circleArea.style.minHeight = '0'; 

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 200 200');
        svg.style.maxHeight = '100%';
        svg.style.maxWidth = '100%';

        const controlsArea = document.createElement('div');
        controlsArea.style.display = 'flex';
        controlsArea.style.alignItems = 'center';
        controlsArea.style.justifyContent = 'center';
        controlsArea.style.marginTop = '10px';
        controlsArea.style.height = '40px';

        const divLabel = document.createElement('div');
        divLabel.style.margin = '0 15px';
        divLabel.style.fontSize = '1.2rem';
        divLabel.style.fontWeight = 'bold';
        divLabel.style.color = '#333';
        divLabel.textContent = currentDivisions + ' 分割';

        const updateCircle = () => {
            svg.innerHTML = '';
            for (let i = 0; i < currentDivisions; i++) {
                let segment;
                if (currentDivisions === 1) {
                    segment = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    segment.setAttribute('cx', '100');
                    segment.setAttribute('cy', '100');
                    segment.setAttribute('r', '90');
                } else {
                    const startAngle = (i / currentDivisions) * Math.PI * 2 - Math.PI / 2;
                    const endAngle = ((i + 1) / currentDivisions) * Math.PI * 2 - Math.PI / 2;
                    const x1 = 100 + 90 * Math.cos(startAngle);
                    const y1 = 100 + 90 * Math.sin(startAngle);
                    const x2 = 100 + 90 * Math.cos(endAngle);
                    const y2 = 100 + 90 * Math.sin(endAngle);
                    const arcFlag = (currentDivisions === 2) ? 0 : ((1 / currentDivisions) < 0.5 ? 0 : 1);
                    const d = [
                        'M', 100, 100,
                        'L', x1, y1,
                        'A', 90, 90, 0, arcFlag, 1, x2, y2,
                        'Z'
                    ].join(' ');
                    segment = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    segment.setAttribute('d', d);
                }
                
                segment.setAttribute('fill', 'transparent');
                segment.setAttribute('stroke', '#333');
                segment.setAttribute('stroke-width', '2');
                segment.dataset.filled = "false";
                segment.style.transition = 'fill 0.2s';
                
                segment.addEventListener('click', (e) => {
                    if (typeof isEditMode !== 'undefined' && isEditMode) return;
                    e.stopPropagation();
                    
                    const isFilled = segment.dataset.filled === "true";
                    segment.dataset.filled = !isFilled ? "true" : "false";
                    segment.setAttribute('fill', segment.dataset.filled === "true" ? '#a0c4ff' : 'transparent');
                    
                    const filledCount = svg.querySelectorAll('[data-filled="true"]').length;
                    const readings = ["ぜろ", "いち", "に", "さん", "よん", "ご", "ろく", "なな", "はち", "きゅう", "じゅう", "じゅういち", "じゅうに", "じゅうさん", "じゅうよん", "じゅうご", "じゅうろく", "じゅうなな", "じゅうはち", "じゅうきゅう", "にじゅう"];
                    if (filledCount <= 20) ToolManager.speak(readings[filledCount]);
                });
                
                svg.appendChild(segment);
            }
            wrapper.dataset.currentDivisions = currentDivisions;
        };

        const minusBtn = document.createElement('button');
        minusBtn.textContent = 'ー';
        minusBtn.style.width = '35px';
        minusBtn.style.height = '35px';
        minusBtn.style.fontSize = '1.2rem';
        minusBtn.style.borderRadius = '5px';
        minusBtn.style.border = '1px solid #ccc';
        minusBtn.style.cursor = 'pointer';
        minusBtn.onclick = (e) => {
            e.stopPropagation();
            if (typeof isEditMode !== 'undefined' && isEditMode) return;
            if (currentDivisions > 1) {
                currentDivisions--;
                divLabel.textContent = currentDivisions + ' 分割';
                updateCircle();
                ToolManager.speak(currentDivisions + "ぶんかつ");
            }
        };

        const plusBtn = document.createElement('button');
        plusBtn.textContent = '＋';
        plusBtn.style.width = '35px';
        plusBtn.style.height = '35px';
        plusBtn.style.fontSize = '1.2rem';
        plusBtn.style.borderRadius = '5px';
        plusBtn.style.border = '1px solid #ccc';
        plusBtn.style.cursor = 'pointer';
        plusBtn.onclick = (e) => {
            e.stopPropagation();
            if (typeof isEditMode !== 'undefined' && isEditMode) return;
            if (currentDivisions < 20) {
                currentDivisions++;
                divLabel.textContent = currentDivisions + ' 分割';
                updateCircle();
                ToolManager.speak(currentDivisions + "ぶんかつ");
            }
        };

        updateCircle();

        controlsArea.appendChild(minusBtn);
        controlsArea.appendChild(divLabel);
        controlsArea.appendChild(plusBtn);

        circleArea.appendChild(svg);
        contentDiv.appendChild(circleArea);
        contentDiv.appendChild(controlsArea);
    }
};