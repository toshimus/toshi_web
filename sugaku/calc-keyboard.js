/* ==========================================
   共通計算機キーボード モジュール
   ========================================== */
const CalcKeyboard = {
    overlay: null,
    calcContainer: null,
    activeInputBox: null,
    baseValue: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    initialLeft: 0,
    initialTop: 0,

    numberReadings: [
        "ぜろ", "いち", "に", "さん", "よん", "ご", "ろく", "なな", "はち", "きゅう", "じゅう",
        "じゅういち", "じゅうに", "じゅうさん", "じゅうよん", "じゅうご", "じゅうろく", "じゅうなな", "じゅうはち", "じゅうきゅう", "にじゅう"
    ],

    // 初期化（HTML内に要素がなければ自動生成する）
    init: function() {
        if (!document.getElementById('overlay')) {
            this.overlay = document.createElement('div');
            this.overlay.className = 'overlay';
            this.overlay.id = 'overlay';
            document.body.appendChild(this.overlay);
        } else {
            this.overlay = document.getElementById('overlay');
        }

        if (!document.getElementById('calc-container')) {
            this.calcContainer = document.createElement('div');
            this.calcContainer.className = 'pieces-container';
            this.calcContainer.id = 'calc-container';
            document.body.appendChild(this.calcContainer);
        } else {
            this.calcContainer = document.getElementById('calc-container');
        }

        const calcKeys = [
            '7', '8', '9',
            '4', '5', '6',
            '1', '2', '3',
            '0', '削除', '+10'
        ];

        this.calcContainer.innerHTML = '';
        calcKeys.forEach(key => {
            const piece = document.createElement('div');
            piece.className = 'piece';
            piece.textContent = key;
            
            if (key === '削除') {
                piece.classList.add('delete-btn');
                piece.addEventListener('click', () => {
                    if (this.activeInputBox) {
                        this.activeInputBox.textContent = '';
                        this.baseValue = 0;
                    }
                });
            } else if (key === '+10') {
                piece.classList.add('enter-btn');
                piece.addEventListener('click', () => {
                    if (this.activeInputBox) {
                        this.baseValue += 10;
                        this.activeInputBox.textContent = this.baseValue;
                        if (typeof AppAudio !== 'undefined' && AppAudio.speak) {
                            AppAudio.speak("じゅう");
                        }
                    }
                });
            } else {
                piece.addEventListener('click', () => {
                    if (this.activeInputBox) {
                        const num = parseInt(key, 10);
                        const finalValue = this.baseValue + num;
                        this.activeInputBox.textContent = finalValue;
                        
                        if (typeof AppAudio !== 'undefined' && AppAudio.speak) {
                            if (finalValue >= 0 && finalValue <= 20) {
                                AppAudio.speak(this.numberReadings[finalValue]);
                            } else {
                                AppAudio.speak(finalValue.toString());
                            }
                        }

                        this.close();
                    }
                });
            }
            this.calcContainer.appendChild(piece);
        });

        this.overlay.addEventListener('click', () => this.close());
        this.initDrag();
    },

    open: function(targetElement) {
        this.activeInputBox = targetElement;
        this.activeInputBox.textContent = '';
        this.baseValue = 0;
        this.calcContainer.style.display = 'flex';
        this.overlay.style.display = 'block';
    },

    close: function() {
        if (this.calcContainer) this.calcContainer.style.display = 'none';
        if (this.overlay) this.overlay.style.display = 'none';
        this.activeInputBox = null;
        this.baseValue = 0;
    },

    initDrag: function() {
        const startDrag = (e) => {
            if (e.target.classList.contains('piece')) return;
            this.isDragging = true;
            let clientX = e.touches ? e.touches[0].clientX : e.clientX;
            let clientY = e.touches ? e.touches[0].clientY : e.clientY;
            this.dragStartX = clientX;
            this.dragStartY = clientY;
            let style = window.getComputedStyle(this.calcContainer);
            this.initialLeft = parseFloat(style.left);
            this.initialTop = parseFloat(style.top);
        };

        const doDrag = (e) => {
            if (!this.isDragging) return;
            e.preventDefault();
            let clientX = e.touches ? e.touches[0].clientX : e.clientX;
            let clientY = e.touches ? e.touches[0].clientY : e.clientY;
            let dx = clientX - this.dragStartX;
            let dy = clientY - this.dragStartY;
            this.calcContainer.style.left = (this.initialLeft + dx) + 'px';
            this.calcContainer.style.top = (this.initialTop + dy) + 'px';
        };

        const stopDrag = () => { this.isDragging = false; };

        this.calcContainer.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', doDrag, { passive: false });
        document.addEventListener('mouseup', stopDrag);
        this.calcContainer.addEventListener('touchstart', startDrag, { passive: false });
        document.addEventListener('touchmove', doDrag, { passive: false });
        document.addEventListener('touchend', stopDrag);
    }
};

document.addEventListener('DOMContentLoaded', () => CalcKeyboard.init());