import React, { useRef, useEffect, useState, useCallback } from 'react';

const SketchCanvasNative = ({ onSketchChange }) => {
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const containerRef = useRef(null);
    const isDrawingRef = useRef(false);
    const toolRef = useRef('brush');
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [activeTool, setActiveTool] = useState('brush');
    const [canvasSize, setCanvasSize] = useState({ width: 500, height: 500 });

    const historyRef = useRef([]);
    const historyIndexRef = useRef(-1);

    useEffect(() => {
        historyRef.current = history;
        historyIndexRef.current = historyIndex;
    }, [history, historyIndex]);

    const resizeCanvas = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;
        const containerWidth = container.clientWidth;
        const size = Math.min(containerWidth, 1024); // 限制最大尺寸
        if (size !== canvasSize.width) {
            setCanvasSize({ width: size, height: size });
        }
    }, [canvasSize.width]);

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

    const isInitializedRef = useRef(false);

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
        if (onSketchChange) onSketchChange(imageData);
    }, [onSketchChange]);

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
            ctx.strokeStyle = '#2C5F6B';
            ctx.lineWidth = 3;
        } else if (tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
            ctx.lineWidth = 20;
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

        const previousData = isInitializedRef.current ? canvas.toDataURL() : null;
        canvas.width = canvasSize.width;
        canvas.height = canvasSize.height;

        const ctx = canvas.getContext('2d');
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        applyTool(ctx, toolRef.current);
        ctxRef.current = ctx;

        if (!isInitializedRef.current) {
            const initialData = canvas.toDataURL();
            setHistory([initialData]);
            setHistoryIndex(0);
            if (onSketchChange) onSketchChange(initialData);
            isInitializedRef.current = true;
        } else if (previousData) {
            const img = new Image();
            img.onload = () => {
                ctx.globalCompositeOperation = 'source-over';
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                applyTool(ctx, toolRef.current);
            };
            img.src = previousData;
        }

        canvas.style.touchAction = 'none';
    }, [canvasSize, onSketchChange]);

    return (
        <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                onPointerDown={(e) => {
                    e.preventDefault();
                    startDrawing(e);
                }}
                onPointerMove={(e) => {
                    e.preventDefault();
                    draw(e);
                }}
                onPointerUp={(e) => {
                    e.preventDefault();
                    endDrawing(e);
                }}
                onPointerCancel={(e) => {
                    e.preventDefault();
                    endDrawing(e);
                }}
                onPointerLeave={(e) => {
                    if (isDrawingRef.current) {
                        e.preventDefault();
                        endDrawing(e);
                    }
                }}
                onLostPointerCapture={(e) => {
                    if (isDrawingRef.current) {
                        endDrawing(e);
                    }
                }}
                style={{
                    width: '100%',
                    height: 'auto',
                    aspectRatio: '1 / 1',
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    cursor: 'crosshair',
                    touchAction: 'none',
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
                    <button className="tool-btn" onClick={() => document.getElementById('upload-sketch-input').click()}>
                        上传图片
                    </button>
                    <input 
                        id="upload-sketch-input"
                        type="file" 
                        accept="image/png, image/jpeg, image/jpg" 
                        onChange={uploadImage} 
                        style={{ display: 'none' }} 
                    />
                    <button className="tool-btn" onClick={downloadSketch}>下载</button>
                    <button className="tool-btn" onClick={undo}>撤销</button>
                </div>
            </div>
        </div>
    );
};

export default SketchCanvasNative;