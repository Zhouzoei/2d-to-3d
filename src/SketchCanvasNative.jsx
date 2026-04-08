import React, { useRef, useEffect, useState, useCallback } from 'react';

const SketchCanvasNative = ({ onSketchChange }) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
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
    const size = Math.min(containerWidth, 350); // 限制最大尺寸
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

  const startDrawing = useCallback((e) => {
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [getCoordinates]);

  const draw = useCallback((e) => {
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, [isDrawing, getCoordinates]);

  const endDrawing = useCallback(() => {
    setIsDrawing(false);
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
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  };

  const setTool = (tool) => {
    setActiveTool(tool);
    const ctx = ctxRef.current;
    if (!ctx) return;
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
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#2C5F6B';
    ctxRef.current = ctx;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const initialData = canvas.toDataURL();
    setHistory([initialData]);
    setHistoryIndex(0);
    if (onSketchChange) onSketchChange(initialData);

    const handleTouchStart = (e) => { e.preventDefault(); startDrawing(e); };
    const handleTouchMove = (e) => { e.preventDefault(); draw(e); };
    const handleTouchEnd = (e) => { e.preventDefault(); endDrawing(e); };
    
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [canvasSize, startDrawing, draw, endDrawing, onSketchChange]);

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
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
          <label className="tool-btn" style={{ cursor: 'pointer' }}>
            上传图片
            <input type="file" accept="image/png, image/jpeg, image/jpg" onChange={uploadImage} style={{ display: 'none' }} />
          </label>
          <button className="tool-btn" onClick={downloadSketch}>下载</button>
          <button className="tool-btn" onClick={undo}>撤销</button>
        </div>
      </div>
    </div>
  );
};

export default SketchCanvasNative;