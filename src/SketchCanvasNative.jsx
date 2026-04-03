import React, { useRef, useEffect, useState } from 'react';

const SketchCanvasNative = ({ onSketchChange }) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    const imageData = canvas.toDataURL();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    if (onSketchChange) {
      onSketchChange(imageData);
    }
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const prevImage = history[prevIndex];
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        if (onSketchChange) {
          onSketchChange(prevImage);
        }
      };
      img.src = prevImage;
      setHistoryIndex(prevIndex);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  };

  // 上传图片到画布
  const uploadImage = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // 检查文件类型
    if (!file.type.match('image.*')) {
      alert('请上传图片文件（png, jpg, jpeg）');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // 清空画布
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 计算缩放比例，使图片适应画布
        const scale = Math.min(
          canvas.width / img.width,
          canvas.height / img.height
        );
        
        const x = (canvas.width - img.width * scale) / 2;
        const y = (canvas.height - img.height * scale) / 2;
        
        // 绘制图片
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        
        // 保存到历史
        saveToHistory();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    // 清空input，允许重复上传同一文件
    event.target.value = '';
  };

  // 下载草图
  const downloadSketch = () => {
    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'sketch.png';
    link.href = dataURL;
    link.click();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#2c3e50';
    
    ctxRef.current = ctx;
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    saveToHistory();

    // 触摸事件支持
    const handleTouchStart = (e) => {
      e.preventDefault();
      startDrawing(e);
    };
    
    const handleTouchMove = (e) => {
      e.preventDefault();
      draw(e);
    };
    
    const handleTouchEnd = (e) => {
      e.preventDefault();
      endDrawing(e);
    };
    
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
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
    
    const boundedX = Math.max(0, Math.min(canvas.width, x));
    const boundedY = Math.max(0, Math.min(canvas.height, y));
    
    return { x: boundedX, y: boundedY };
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
  };

  const endDrawing = () => {
    setIsDrawing(false);
    ctxRef.current.beginPath();
    saveToHistory();
  };

  return (
    <div className="sketch-section">
      <h3>Draw Sketch</h3>
      <canvas
        ref={canvasRef}
        width={500}
        height={500}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
        style={{
          width: '100%',
          height: 'auto',
          aspectRatio: '1 / 1',
          border: '1.5px solid #e2e8f0',
          backgroundColor: 'white',
          borderRadius: '16px',
          cursor: 'crosshair',
          touchAction: 'none',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      />
      <div className="canvas-actions">
        <label className="action-btn upload-btn">
          Upload
          <input
            type="file"
            accept="image/png, image/jpeg, image/jpg"
            onChange={uploadImage}
            style={{ display: 'none' }}
          />
        </label>
        <button className="action-btn" onClick={downloadSketch}>
          Download
        </button>
        <button className="action-btn secondary" onClick={clearCanvas}>
          Clear
        </button>
        <button className="action-btn" onClick={undo}>
          Undo
        </button>
      </div>
    </div>
  );
};

export default SketchCanvasNative;