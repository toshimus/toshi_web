export const State = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    currentTool: 'pen',
    currentColor: '#000000',
    currentLineWidth: 1,
    currentZoom: 1,
    isAntiAlias: false,
    
    isGridVisible: false,
    gridSize: 16,
    isSnapToGrid: false,
    isSnapToObject: false,
    snapIndicator: null,
    
    isDrawing: false,
    hasMoved: false,
    startX: 0,
    startY: 0,
    isPanning: false,
    panStartX: 0,
    panStartY: 0,
    panScrollX: 0,
    panScrollY: 0,
    initialPinchDistance: null,
    
    isShiftPressed: false,
    isTemporaryEyedropper: false,

    selection: {
        active: false,
        x: 0, y: 0, w: 0, h: 0,
        canvas: null,
        isFloating: false,
        type: 'rect',
        path: null,
        maskCanvas: null,
        originalCanvas: null,
        originalMaskCanvas: null,
        originalW: 0,
        originalH: 0,
        accumulatedAngle: 0
    },
    selectionMask: null,
    layerSnapshotBeforeDraw: null,
    
    dragOffsetX: 0,
    dragOffsetY: 0,
    isDraggingSelection: false,
    layers: [],
    currentLayerId: null,
    layerCounter: 0,
    historyStack: [],
    redoStack: [],

    editingShape: null,
    hoveredHandle: -1,
    isDraggingHandle: false,
    isDraggingBody: false,
    shapeDragOffsetX: 0,   
    shapeDragOffsetY: 0,   
    isFinalizing: false,
    
    isShapeFill: false,
    isPolygonClosed: true,
    
    fillTolerance: 30, 
    
    currentProjectHandle: null, 
    currentDirectoryHandle: null 
};

export const CONSTANTS = {
    MAX_HISTORY: 20,
    famicomColors: [
        "#7C7C7C","#0000FC","#0000BC","#4428BC","#940084","#A80020","#A81000","#881400","#503000","#007800","#006800","#005800","#004058","#000000",
        "#BCBCBC","#0078F8","#0058F8","#6844FC","#D800CC","#E40058","#F83800","#E45C10","#AC7C00","#00B800","#00A800","#00A844","#008888","#000000",
        "#F8F8F8","#3CBCFC","#6888FC","#9878F8","#F878F8","#F85898","#F87858","#FCA044","#F8B800","#B8F818","#58D854","#58F898","#00E8D8","#787878",
        "#FCFCFC","#A4E4FC","#B8B8F8","#D8B8F8","#F8B8F8","#F8A4C0","#F0D0B0","#FCE0A8","#F8D878","#D8F878","#B8F8B8","#B8F8D8","#00FCFC","#000000"
    ]
};

export const DOM = {
    workspace: document.getElementById('workspace'),
    canvasWrapper: document.getElementById('canvas-wrapper'),
    previewCanvas: document.getElementById('preview-canvas'),
    previewCtx: document.getElementById('preview-canvas') ? document.getElementById('preview-canvas').getContext('2d') : null,
    layerListEl: document.getElementById('layer-list'),
    selectionPanel: document.getElementById('selection-panel'),
    brushPreview: (() => {
        const el = document.createElement('div');
        el.style.position = 'fixed';
        el.style.border = '1px solid #ff0000';
        el.style.borderRadius = '50%';
        el.style.pointerEvents = 'none';
        el.style.zIndex = '20000';
        el.style.transform = 'translate(-50%, -50%)'; 
        el.style.display = 'none';
        document.body.appendChild(el);
        return el;
    })()
};