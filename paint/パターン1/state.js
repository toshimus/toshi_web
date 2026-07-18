// --- システム定数・変数 ---
let CANVAS_WIDTH = 800;
let CANVAS_HEIGHT = 600; 

let currentTool = 'pen';
let currentColor = '#000000';
let currentLineWidth = 1; 
let currentZoom = 1;
let isAntiAlias = false; 
let isGridVisible = false;

let isDrawing = false;
let hasMoved = false; 
let startX = 0;
let startY = 0;

// 手のひら・ズーム（パンニング/ピンチ）用変数
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panScrollX = 0;
let panScrollY = 0;
let initialPinchDistance = null;

// 選択ツール用変数
let selection = {
    active: false,
    x: 0, y: 0, w: 0, h: 0,
    canvas: null,
    isFloating: false
};
let dragOffsetX = 0;
let dragOffsetY = 0;
let isDraggingSelection = false;

// レイヤー管理
let layers = [];
let currentLayerId = null;
let layerCounter = 0;

// 履歴管理 (Undo/Redo)
let historyStack = [];
let redoStack = [];
const MAX_HISTORY = 20;

// ファミコン（NES）標準カラーパレット
const famicomColors = [
    "#7C7C7C","#0000FC","#0000BC","#4428BC","#940084","#A80020","#A81000","#881400","#503000","#007800","#006800","#005800","#004058","#000000",
    "#BCBCBC","#0078F8","#0058F8","#6844FC","#D800CC","#E40058","#F83800","#E45C10","#AC7C00","#00B800","#00A800","#00A844","#008888","#000000",
    "#F8F8F8","#3CBCFC","#6888FC","#9878F8","#F878F8","#F85898","#F87858","#FCA044","#F8B800","#B8F818","#58D854","#58F898","#00E8D8","#787878",
    "#FCFCFC","#A4E4FC","#B8B8F8","#D8B8F8","#F8B8F8","#F8A4C0","#F0D0B0","#FCE0A8","#F8D878","#D8F878","#B8F8B8","#B8F8D8","#00FCFC","#000000"
];

// HTML要素の参照
const workspace = document.getElementById('workspace');
const canvasWrapper = document.getElementById('canvas-wrapper');
const previewCanvas = document.getElementById('preview-canvas');
const previewCtx = previewCanvas.getContext('2d');
const layerListEl = document.getElementById('layer-list');
const selectionPanel = document.getElementById('selection-panel');

// ブラシサイズプレビュー用DOM要素の生成と初期設定
const brushPreview = document.createElement('div');
brushPreview.style.position = 'fixed';
brushPreview.style.border = '1px solid #ff0000';
brushPreview.style.borderRadius = '50%';
brushPreview.style.pointerEvents = 'none';
brushPreview.style.zIndex = '20000';
brushPreview.style.transform = 'translate(-50%, -50%)'; 
brushPreview.style.display = 'none';
document.body.appendChild(brushPreview);