import React, { useRef, useEffect, useState, useCallback } from 'react';

function loadRecentColors() {
    try {
        const stored = localStorage.getItem('recentColors');
        if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
}

function saveRecentColors(colors) {
    localStorage.setItem('recentColors', JSON.stringify(colors));
}

const SketchCanvasNative = ({ onSketchChange, sketchDataToLoad }) => {
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const containerRef = useRef(null);
    const isDrawingRef = useRef(false);
    const toolRef = useRef('brush');
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [activeTool, setActiveTool] = useState('brush');
    const [canvasSize, setCanvasSize] = useState({ width: 500, height: 500 });
    const [brushSize, setBrushSize] = useState(3);
    const [brushColor, setBrushColor] = useState('#2C5F6B');
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [tempColor, setTempColor] = useState('#2C5F6B');
    const [recentColors, setRecentColors] = useState(() => loadRecentColors());

    const brushSizeRef = useRef(3);
    const brushColorRef = useRef('#2C5F6B');

    const historyRef = useRef([]);
    const historyIndexRef = useRef(-1);

    const isInitializedRef = useRef(false);
    const prevCanvasSizeRef = useRef({ width: 500, height: 500 });
    const canvasContentRef = useRef(null);
    const oldSizeForRestoreRef = useRef({ width: 500, height: 500 });
    const lastLoadedSketchRef = useRef(null);

    useEffect(() => {
        historyRef.current = history;
        historyIndexRef.current = historyIndex;
    }, [history, historyIndex]);

    useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);
    useEffect(() => { brushColorRef.current = brushColor; }, [brushColor]);

    useEffect(() => {
        if (sketchDataToLoad && sketchDataToLoad !== lastLoadedSketchRef.current && isInitializedRef.current) {
            const canvas = canvasRef.current;
            const ctx = ctxRef.current;
            if (!canvas || !ctx) return;

            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
                const x = (canvas.width - img.width * scale) / 2;
                const y = (canvas.height - img.height * scale) / 2;
                
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                
                const imageData = canvas.toDataURL();
                setHistory([imageData]);
                setHistoryIndex(0);
                lastLoadedSketchRef.current = sketchDataToLoad;
                
                console.log('✅ 草图已加载到画布');
            };
            img.src = sketchDataToLoad;
        }
    }, [sketchDataToLoad]);

    const resizeCanvas = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;
        const containerWidth = container.clientWidth;
        const size = Math.min(containerWidth, 1024);
        if (size !== prevCanvasSizeRef.current.width) {
            const canvas = canvasRef.current;
            if (canvas && isInitializedRef.current) {
                canvasContentRef.current = canvas.toDataURL();
                oldSizeForRestoreRef.current = { 
                    width: prevCanvasSizeRef.current.width, 
                    height: prevCanvasSizeRef.current.height 
                };
            }
            prevCanvasSizeRef.current = { width: size, height: size };
            setCanvasSize({ width: size, height: size });
        }
    }, []);

    useEffect(() => {
        resizeCanvas();
        const resizeObserver = new ResizeObserver(() => resizeCanvas());
        if (containerRef.current) resizeObserver.observe(containerRef.current);
        window.addEventListener('resize', resizeCanvas);
        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', resizeCanvas);
        };
    }, [resizeCanvas]);

    const saveToHistory = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const imageData = canvas.toDataURL();
        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndexRef.current + 1);
            newHistory.push(imageData);
            return newHistory;
        });
        setHistoryIndex(prev => prev + 1);
        const handler = onSketchChangeRef.current;
        if (handler) handler(imageData);
    }, []);

    const onSketchChangeRef = useRef(onSketchChange);
    useEffect(() => { onSketchChangeRef.current = onSketchChange; }, [onSketchChange]);

    const getCoordinates = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        let clientX, clientY;
        if (e.touches) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;
        return {
            x: Math.max(0, Math.min(canvas.width, x)),
            y: Math.max(0, Math.min(canvas.height, y))
        };
    }, []);

    const applyTool = (ctx, tool) => {
        if (tool === 'brush') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = brushColorRef.current;
            ctx.lineWidth = brushSizeRef.current;
        } else if (tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
            ctx.lineWidth = brushSizeRef.current * 4;
        }
    };

    const startDrawing = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        if (typeof e.pointerId === 'number') {
            canvas.setPointerCapture(e.pointerId);
        }
        const { x, y } = getCoordinates(e);
        const ctx = ctxRef.current;
        if (!ctx) return;
        isDrawingRef.current = true;
        toolRef.current = activeTool;
        applyTool(ctx, activeTool);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y);
        ctx.stroke();
    }, [activeTool, getCoordinates]);

    const draw = useCallback((e) => {
        if (!isDrawingRef.current) return;
        const { x, y } = getCoordinates(e);
        const ctx = ctxRef.current;
        if (!ctx) return;
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    }, [getCoordinates]);

    const endDrawing = useCallback((e) => {
        if (!isDrawingRef.current) return;
        const canvas = canvasRef.current;
        if (canvas && typeof e?.pointerId === 'number') {
            canvas.releasePointerCapture(e.pointerId);
        }
        isDrawingRef.current = false;
        const ctx = ctxRef.current;
        if (!ctx) return;
        ctx.beginPath();
        saveToHistory();
    }, [saveToHistory]);

    const undo = () => {
        if (historyIndexRef.current > 0) {
            const prevIndex = historyIndexRef.current - 1;
            const prevImage = historyRef.current[prevIndex];
            const img = new Image();
            img.onload = () => {
                const canvas = canvasRef.current;
                const ctx = canvas?.getContext('2d');
                if (!ctx || !canvas) return;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                if (onSketchChange) onSketchChange(prevImage);
            };
            img.src = prevImage;
            setHistoryIndex(prevIndex);
        }
    };

    const redo = () => {
        if (historyRef.current && historyIndexRef.current < historyRef.current.length - 1) {
            const nextIndex = historyIndexRef.current + 1;
            const nextImage = historyRef.current[nextIndex];
            const img = new Image();
            img.onload = () => {
                const canvas = canvasRef.current;
                const ctx = canvas?.getContext('2d');
                if (!ctx || !canvas) return;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                if (onSketchChange) onSketchChange(nextImage);
            };
            img.src = nextImage;
            setHistoryIndex(nextIndex);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
                e.preventDefault();
                redo();
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'Z') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
                return;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        saveToHistory();
    };

    const setTool = (tool) => {
        setActiveTool(tool);
        toolRef.current = tool;
        const ctx = ctxRef.current;
        if (!ctx) return;
        applyTool(ctx, tool);
    };

    const handleBrushSizeChange = (e) => {
        const val = parseInt(e.target.value);
        setBrushSize(val);
    };

    const handleColorSelect = (color) => {
        setBrushColor(color);
        if (activeTool === 'brush') {
            const ctx = ctxRef.current;
            if (ctx) {
                ctx.strokeStyle = color;
            }
        }
        setRecentColors(prev => {
            const filtered = prev.filter(c => c !== color);
            const updated = [color, ...filtered].slice(0, 8);
            saveRecentColors(updated);
            return updated;
        });
    };

    const openColorPicker = () => {
        setTempColor(brushColor);
        setShowColorPicker(true);
    };

    const handleTempColorChange = (e) => {
        const color = e.target.value;
        setTempColor(color);
        setBrushColor(color);
        if (activeTool === 'brush') {
            const ctx = ctxRef.current;
            if (ctx) {
                ctx.strokeStyle = color;
            }
        }
    };

    const cancelColor = () => {
        setShowColorPicker(false);
        setRecentColors(prev => {
            const filtered = prev.filter(c => c !== tempColor);
            const updated = [tempColor, ...filtered].slice(0, 8);
            saveRecentColors(updated);
            return updated;
        });
    };

    const uploadImage = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        if (!file.type.match('image.*')) {
            alert('请上传图片文件（png, jpg, jpeg）');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = canvasRef.current;
                const ctx = canvas?.getContext('2d');
                if (!ctx || !canvas) return;
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
                const x = (canvas.width - img.width * scale) / 2;
                const y = (canvas.height - img.height * scale) / 2;
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                saveToHistory();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    const downloadSketch = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = 'sketch.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = canvasSize.width;
        canvas.height = canvasSize.height;

        const ctx = canvas.getContext('2d');
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = brushSizeRef.current;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        applyTool(ctx, toolRef.current);
        ctxRef.current = ctx;

        if (!isInitializedRef.current) {
            const initialData = canvas.toDataURL();
            setHistory([initialData]);
            setHistoryIndex(0);
            const handler = onSketchChangeRef.current;
            if (handler) handler(initialData);
            isInitializedRef.current = true;
        } else if (canvasContentRef.current) {
            const oldWidth = oldSizeForRestoreRef.current.width;
            const oldHeight = oldSizeForRestoreRef.current.height;
            const img = new Image();
            img.onload = () => {
                ctx.globalCompositeOperation = 'source-over';
                ctx.drawImage(img, 0, 0, oldWidth, oldHeight, 0, 0, canvasSize.width, canvasSize.height);
                applyTool(ctx, toolRef.current);
                canvasContentRef.current = null;
            };
            img.src = canvasContentRef.current;
        }

        canvas.style.touchAction = 'none';
    }, [canvasSize]);

    return (
        <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', width: '100%', position: 'relative' }}>
            <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                onPointerDown={(e) => { e.preventDefault(); startDrawing(e); }}
                onPointerMove={(e) => { e.preventDefault(); draw(e); }}
                onPointerUp={(e) => { e.preventDefault(); endDrawing(e); }}
                onPointerCancel={(e) => { e.preventDefault(); endDrawing(e); }}
                onPointerLeave={(e) => { if (isDrawingRef.current) { e.preventDefault(); endDrawing(e); } }}
                onLostPointerCapture={(e) => { if (isDrawingRef.current) endDrawing(e); }}
                style={{
                    width: '100%', height: 'auto', aspectRatio: '1 / 1',
                    backgroundColor: 'white', borderRadius: '16px',
                    cursor: 'crosshair', touchAction: 'none',
                    border: '1px solid rgba(172, 229, 238, 0.6)'
                }}
            />
            <div className="toolbar" style={{ marginTop: '8px' }}>
                <div className="tool-group">
                    <button className={`tool-btn ${activeTool === 'brush' ? 'active' : ''}`} onClick={() => setTool('brush')}>画笔</button>
                    <button className={`tool-btn ${activeTool === 'eraser' ? 'active' : ''}`} onClick={() => setTool('eraser')}>橡皮</button>
                    <button className="tool-btn" onClick={clearCanvas}>清空</button>
                </div>
                <div className="tool-group">
                    <div className="brush-size-control" title={`笔刷大小: ${brushSize}`}>
                        <span className="brush-size-icon" style={{ width: Math.max(6, brushSize * 0.5 + 4), height: Math.max(6, brushSize * 0.5 + 4) }}></span>
                        <input
                            type="range"
                            min="1"
                            max="20"
                            value={brushSize}
                            onChange={handleBrushSizeChange}
                            className="brush-slider"
                        />
                    </div>
                    <div className="color-picker-trigger" onClick={openColorPicker}>
                        <span className="color-swatch" style={{ backgroundColor: brushColor }}></span>
                    </div>
                </div>
                <div className="tool-group">
                    <button className="tool-btn" onClick={() => document.getElementById('upload-sketch-input').click()}>上传</button>
                    <input id="upload-sketch-input" type="file" accept="image/png, image/jpeg, image/jpg" onChange={uploadImage} style={{ display: 'none' }} />
                    <button className="tool-btn" onClick={downloadSketch}>下载</button>
                    <button className="tool-btn" onClick={undo}>撤销</button>
                </div>
            </div>
            {showColorPicker && (
                <>
                    <div className="color-picker-overlay" onClick={cancelColor} />
                    <div className="color-picker-popup">
                        <div className="color-picker-native-wrap">
                            <div className="color-picker-current-swatch" style={{ backgroundColor: tempColor }} />
                            <input
                                type="color"
                                className="color-picker-native"
                                value={tempColor}
                                onChange={handleTempColorChange}
                            />
                            <div className="color-picker-current-label">{tempColor}</div>
                        </div>
                        {recentColors.length > 0 && (
                            <div className="color-picker-recents">
                                <span className="color-picker-recents-label">最近</span>
                                <div className="color-picker-recents-list">
                                    {recentColors.map(color => (
                                        <span
                                            key={color}
                                            className="color-picker-recent-dot"
                                            style={{ backgroundColor: color }}
                                            onClick={() => handleColorSelect(color)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default SketchCanvasNative;
