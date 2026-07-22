/* ==========================================
   app-common.js
   全教材共通モジュール（音声・履歴・画面調整）
   ========================================== */

// --- 1. 音声・効果音管理 ---
const AppAudio = {
    okSound: new Audio('ok.mp3'),
    ngSound: new Audio('ng.mp3'),
    qSound: new Audio('q.mp3'),

    // 0〜20の読み上げ用配列
    numberReadings: [
        "ぜろ", "いち", "に", "さん", "よん", "ご", "ろく", "なな", "はち", "きゅう", "じゅう",
        "じゅういち", "じゅうに", "じゅうさん", "じゅうよん", "じゅうご", "じゅうろく", "じゅうなな", "じゅうはち", "じゅうきゅう", "にじゅう"
    ],

    // 音声読み上げ
    speak(text) {
        const speechCheckbox = document.getElementById('speech-checkbox');
        if (speechCheckbox && !speechCheckbox.checked) return; 
        window.speechSynthesis.cancel(); 
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    },

    // 正解音
    playOk() {
        const soundCheckbox = document.getElementById('sound-checkbox');
        if (soundCheckbox && soundCheckbox.checked) {
            this.okSound.currentTime = 0;
            this.okSound.play().catch(e => console.log(e));
        }
    },

    // 不正解音
    playNg() {
        const soundCheckbox = document.getElementById('sound-checkbox');
        if (soundCheckbox && soundCheckbox.checked) {
            this.ngSound.currentTime = 0;
            this.ngSound.play().catch(e => console.log(e));
        }
    },

    // 出題音
    playQ() {
        const soundCheckbox = document.getElementById('sound-checkbox');
        if (soundCheckbox && soundCheckbox.checked) {
            this.qSound.currentTime = 0;
            this.qSound.play().catch(e => console.log(e));
        }
    }
};

// --- 2. 履歴・CSV保存管理 ---
const AppLogger = {
    formatTime(date) {
        return date.getHours().toString().padStart(2, '0') + ':' + 
               date.getMinutes().toString().padStart(2, '0') + ':' + 
               date.getSeconds().toString().padStart(2, '0');
    },

    // CSV保存処理（iOSアプリ連携 & LocalStorage両対応）
    save({ storageKey, problemType, problemContent, userAnswer, startTime, endTime, inputMethod, isCorrect }) {
        const yyyy = startTime.getFullYear();
        const mm = String(startTime.getMonth() + 1).padStart(2, '0');
        const dd = String(startTime.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}/${mm}/${dd}`;
        const resultStr = isCorrect ? "正解" : "不正解";

        const csvLine = `"${dateStr}","${problemType}","${problemContent}","${userAnswer}",${this.formatTime(startTime)},${this.formatTime(endTime)},${inputMethod},${resultStr}\n`;

        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.appBridge) {
            window.webkit.messageHandlers.appBridge.postMessage({
                action: "saveCSV",
                csvLine: csvLine
            });
        } else {
            let history = localStorage.getItem(storageKey) || "";
            history += csvLine;
            localStorage.setItem(storageKey, history);
            console.log("LocalStorageに保存しました: " + csvLine);
        }
    }
};

// --- 3. 画面縮修・自動スケール（302方式） ---
const AppScaler = {
    scale: 1,
    init(wrapperId = 'canvas-wrapper', bodyClass = 'app-body', targetWidth = 1024, targetHeight = 768) {
        const resize = () => {
            const wrapper = document.getElementById(wrapperId);
            const appBody = document.querySelector('.' + bodyClass);
            if (!wrapper || !appBody) return;

            const scaleX = wrapper.clientWidth / targetWidth;
            const scaleY = wrapper.clientHeight / targetHeight;
            this.scale = Math.min(scaleX, scaleY);
            appBody.style.transform = `scale(${this.scale})`;
        };

        window.addEventListener('resize', resize);
        resize();
    }
};