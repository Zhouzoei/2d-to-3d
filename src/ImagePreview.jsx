// ImagePreview.jsx - 支持动态图片URL
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
            <div className="preview-placeholder">
                <div className="spinner"></div>
                <p>生成中...</p>
            </div>
        );
    }

    if (imageUrl) {
        return (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <div className="image-toolbar">
                    <button className="tool-btn-icon" onClick={handleZoomIn} title="放大">+</button>
                    <button className="tool-btn-icon" onClick={handleZoomOut} title="缩小">−</button>
                    <button className="tool-btn-icon" onClick={handleReset} title="重置">↺</button>
                    <span className="zoom-info">{Math.round(scale * 100)}%</span>
                </div>
                <div
                    className="image-wrapper"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{ cursor: isDragging ? 'grabbing' : 'grab', height: '100%', width: '100%' }}
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
            </div>
        );
    }

    return (
        <div className="preview-placeholder">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '8px', opacity: 0.6 }}>
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="#2C5F6B" strokeWidth="1.2" fill="none" />
                <circle cx="8.5" cy="8.5" r="1.5" fill="#2C5F6B" opacity="0.6" />
                <path d="M21 15L16 10L5 21" stroke="#2C5F6B" strokeWidth="1.2" fill="none" />
            </svg>
            <div style={{ fontSize: '13px', fontWeight: 500 }}>等待生成</div>
            <div style={{ fontSize: '11px', marginTop: '6px' }}>AI 将生成 4K 角色图像</div>
        </div>
    );
};

export default ImagePreview;