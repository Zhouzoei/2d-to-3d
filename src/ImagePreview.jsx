import React, { useState } from 'react';

const ImagePreview = ({ imageUrl, loading }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleZoomIn = () => {
    setScale(Math.min(scale + 0.2, 3));
  };

  const handleZoomOut = () => {
    setScale(Math.max(scale - 0.2, 0.5));
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (loading) {
    return (
      <div className="preview-placeholder loading">
        <div className="spinner"></div>
        <p>Generating 2D character...</p>
      </div>
    );
  }
  
  if (imageUrl) {
    return (
      <div className="preview-image-container">
        <div className="image-toolbar">
          <button className="tool-btn" onClick={handleZoomIn} title="放大">+</button>
          <button className="tool-btn" onClick={handleZoomOut} title="缩小">-</button>
          <button className="tool-btn" onClick={handleReset} title="重置">↺</button>
          <span className="zoom-info">{Math.round(scale * 100)}%</span>
        </div>
        <div 
          className="image-wrapper"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <img 
            src={imageUrl} 
            alt="Generated 2D character" 
            className="preview-image"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.1s ease'
            }}
          />
        </div>
        <div className="image-hint">
          <span>鼠标拖拽移动 | 按钮缩放</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="preview-placeholder">
      <p>Waiting for generation</p>
    </div>
  );
};

export default ImagePreview;