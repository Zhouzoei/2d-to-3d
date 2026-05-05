import React, { useState, useRef, useEffect } from 'react';
import './CropModal.css';

const CropModal = ({ isOpen, onClose, sketchData, onConfirm }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [cropRect, setCropRect] = useState({ x: 0, y: 0, w: 0, h: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeCorner, setResizeCorner] = useState(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [selectedRatio, setSelectedRatio] = useState('free');
    const [originalImage, setOriginalImage] = useState(null);
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [canvasScale, setCanvasScale] = useState(1);

    const ratios = [
        { key: 'free', name: '自由', ratio: null, label: '自由裁剪' },
        { key: '1:1', name: '1:1', ratio: 1 / 1, label: '1:1 (方形)' },
        { key: '3:4', name: '3:4', ratio: 3 / 4, label: '3:4 (竖版)' },
        { key: '4:3', name: '4:3', ratio: 4 / 3, label: '4:3 (横版)' },
        { key: '9:16', name: '9:16', ratio: 9 / 16, label: '9:16 (手机竖屏)' },
        { key: '16:9', name: '16:9', ratio: 16 / 9, label: '16:9 (宽屏)' }
    ];

    useEffect(() => {
        if (isOpen && sketchData) {
            const img = new Image();
            img.onload = () => {
                setOriginalImage(img);
                setImageSize({ width: img.width, height: img.height });
                
                const initialW = img.width * 0.7;
                const initialH = img.height * 0.7;
                setCropRect({
                    x: (img.width - initialW) / 2,
                    y: (img.height - initialH) / 2,
                    w: initialW,
                    h: initialH
                });
            };
            img.src = sketchData;
        }
    }, [isOpen, sketchData]);

    useEffect(() => {
        if (!originalImage || !canvasRef.current || !containerRef.current) return;

        const canvas = canvasRef.current;
        const container = containerRef.current;
        
        canvas.width = imageSize.width;
        canvas.height = imageSize.height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(originalImage, 0, 0, imageSize.width, imageSize.height);

        const containerWidth = container.clientWidth;
        const newScale = containerWidth / imageSize.width;
        setCanvasScale(newScale);
        
        canvas.style.width = `${imageSize.width * newScale}px`;
        canvas.style.height = `${imageSize.height * newScale}px`;
        
    }, [originalImage, imageSize]);

    useEffect(() => {
        if (!originalImage || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(originalImage, 0, 0, imageSize.width, imageSize.height);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.clearRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
        
        ctx.drawImage(
            originalImage,
            cropRect.x, cropRect.y, cropRect.w, cropRect.h,
            cropRect.x, cropRect.y, cropRect.w, cropRect.h
        );
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
        
        ctx.fillStyle = '#fff';
        const cornerSize = 8;
        ctx.fillRect(cropRect.x - cornerSize/2, cropRect.y - cornerSize/2, cornerSize, cornerSize);
        ctx.fillRect(cropRect.x + cropRect.w - cornerSize/2, cropRect.y - cornerSize/2, cornerSize, cornerSize);
        ctx.fillRect(cropRect.x - cornerSize/2, cropRect.y + cropRect.h - cornerSize/2, cornerSize, cornerSize);
        ctx.fillRect(cropRect.x + cropRect.w - cornerSize/2, cropRect.y + cropRect.h - cornerSize/2, cornerSize, cornerSize);
        
        const midSize = 6;
        ctx.fillRect(cropRect.x + cropRect.w/2 - midSize/2, cropRect.y - midSize/2, midSize, midSize);
        ctx.fillRect(cropRect.x + cropRect.w/2 - midSize/2, cropRect.y + cropRect.h - midSize/2, midSize, midSize);
        ctx.fillRect(cropRect.x - midSize/2, cropRect.y + cropRect.h/2 - midSize/2, midSize, midSize);
        ctx.fillRect(cropRect.x + cropRect.w - midSize/2, cropRect.y + cropRect.h/2 - midSize/2, midSize, midSize);
        
    }, [originalImage, cropRect, imageSize]);

    const applyRatio = (ratioKey) => {
        setSelectedRatio(ratioKey);
        const ratioConfig = ratios.find(r => r.key === ratioKey);
        
        if (ratioConfig.ratio === null) {
            const initialW = imageSize.width * 0.7;
            const initialH = imageSize.height * 0.7;
            setCropRect({
                x: (imageSize.width - initialW) / 2,
                y: (imageSize.height - initialH) / 2,
                w: initialW,
                h: initialH
            });
            return;
        }

        const targetRatio = ratioConfig.ratio;
        let newW = imageSize.width * 0.7;
        let newH = newW / targetRatio;
        
        if (newH > imageSize.height) {
            newH = imageSize.height * 0.7;
            newW = newH * targetRatio;
        }
        
        setCropRect({
            x: (imageSize.width - newW) / 2,
            y: (imageSize.height - newH) / 2,
            w: newW,
            h: newH
        });
    };

    const getMousePos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) / canvasScale;
        const mouseY = (e.clientY - rect.top) / canvasScale;
        return { 
            x: Math.max(0, Math.min(mouseX, imageSize.width)), 
            y: Math.max(0, Math.min(mouseY, imageSize.height)) 
        };
    };

    const checkHitArea = (mouseX, mouseY) => {
        const { x, y, w, h } = cropRect;
        const cornerSize = 15;
        
        if (Math.abs(mouseX - x) < cornerSize && Math.abs(mouseY - y) < cornerSize) return 'top-left';
        if (Math.abs(mouseX - (x + w)) < cornerSize && Math.abs(mouseY - y) < cornerSize) return 'top-right';
        if (Math.abs(mouseX - x) < cornerSize && Math.abs(mouseY - (y + h)) < cornerSize) return 'bottom-left';
        if (Math.abs(mouseX - (x + w)) < cornerSize && Math.abs(mouseY - (y + h)) < cornerSize) return 'bottom-right';
        if (Math.abs(mouseY - y) < cornerSize && mouseX >= x && mouseX <= x + w) return 'top';
        if (Math.abs(mouseY - (y + h)) < cornerSize && mouseX >= x && mouseX <= x + w) return 'bottom';
        if (Math.abs(mouseX - x) < cornerSize && mouseY >= y && mouseY <= y + h) return 'left';
        if (Math.abs(mouseX - (x + w)) < cornerSize && mouseY >= y && mouseY <= y + h) return 'right';
        if (mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h) return 'move';
        
        return null;
    };

    const handleMouseDown = (e) => {
        e.preventDefault();
        const { x: mouseX, y: mouseY } = getMousePos(e);
        const hit = checkHitArea(mouseX, mouseY);
        
        if (!hit) return;
        
        if (hit === 'move') {
            setIsDragging(true);
            setDragStart({ x: mouseX - cropRect.x, y: mouseY - cropRect.y });
        } else {
            setIsResizing(true);
            setResizeCorner(hit);
            setDragStart({ 
                startX: mouseX, 
                startY: mouseY, 
                startW: cropRect.w, 
                startH: cropRect.h, 
                startRectX: cropRect.x, 
                startRectY: cropRect.y 
            });
        }
    };

    const handleMouseMove = (e) => {
        if (isDragging) {
            const { x: mouseX, y: mouseY } = getMousePos(e);
            let newX = mouseX - dragStart.x;
            let newY = mouseY - dragStart.y;
            
            newX = Math.max(0, Math.min(newX, imageSize.width - cropRect.w));
            newY = Math.max(0, Math.min(newY, imageSize.height - cropRect.h));
            
            setCropRect(prev => ({ ...prev, x: newX, y: newY }));
        } else if (isResizing && resizeCorner) {
            const { x: mouseX, y: mouseY } = getMousePos(e);
            
            const ratioConfig = ratios.find(r => r.key === selectedRatio);
            const isFixedRatio = ratioConfig && ratioConfig.ratio !== null;
            
            let newX = dragStart.startRectX;
            let newY = dragStart.startRectY;
            let newW = dragStart.startW;
            let newH = dragStart.startH;
            
            const deltaX = mouseX - dragStart.startX;
            const deltaY = mouseY - dragStart.startY;
            
            // 自由裁剪：无比例限制，直接用鼠标增量
            if (!isFixedRatio) {
                switch (resizeCorner) {
                    case 'bottom-right':
                        newW = dragStart.startW + deltaX;
                        newH = dragStart.startH + deltaY;
                        break;
                    case 'bottom-left':
                        newW = dragStart.startW - deltaX;
                        newH = dragStart.startH + deltaY;
                        newX = dragStart.startRectX + (dragStart.startW - newW);
                        break;
                    case 'top-right':
                        newW = dragStart.startW + deltaX;
                        newH = dragStart.startH - deltaY;
                        newY = dragStart.startRectY + (dragStart.startH - newH);
                        break;
                    case 'top-left':
                        newW = dragStart.startW - deltaX;
                        newH = dragStart.startH - deltaY;
                        newX = dragStart.startRectX + (dragStart.startW - newW);
                        newY = dragStart.startRectY + (dragStart.startH - newH);
                        break;
                    case 'right':
                        newW = dragStart.startW + deltaX;
                        newH = dragStart.startH;
                        break;
                    case 'left':
                        newW = dragStart.startW - deltaX;
                        newH = dragStart.startH;
                        newX = dragStart.startRectX + (dragStart.startW - newW);
                        break;
                    case 'bottom':
                        newW = dragStart.startW;
                        newH = dragStart.startH + deltaY;
                        break;
                    case 'top':
                        newW = dragStart.startW;
                        newH = dragStart.startH - deltaY;
                        newY = dragStart.startRectY + (dragStart.startH - newH);
                        break;
                    default:
                        break;
                }
            } else {
                // 固定比例模式
                const fixedRatio = ratioConfig.ratio;
                
                switch (resizeCorner) {
                    case 'bottom-right':
                        newW = dragStart.startW + deltaX;
                        newH = newW / fixedRatio;
                        break;
                    case 'bottom-left':
                        newW = dragStart.startW - deltaX;
                        newH = newW / fixedRatio;
                        newX = dragStart.startRectX + (dragStart.startW - newW);
                        break;
                    case 'top-right':
                        newW = dragStart.startW + deltaX;
                        newH = newW / fixedRatio;
                        newY = dragStart.startRectY + (dragStart.startH - newH);
                        break;
                    case 'top-left':
                        newW = dragStart.startW - deltaX;
                        newH = newW / fixedRatio;
                        newX = dragStart.startRectX + (dragStart.startW - newW);
                        newY = dragStart.startRectY + (dragStart.startH - newH);
                        break;
                    case 'right':
                        newW = dragStart.startW + deltaX;
                        newH = newW / fixedRatio;
                        break;
                    case 'left':
                        newW = dragStart.startW - deltaX;
                        newH = newW / fixedRatio;
                        newX = dragStart.startRectX + (dragStart.startW - newW);
                        break;
                    case 'bottom':
                        newH = dragStart.startH + deltaY;
                        newW = newH * fixedRatio;
                        break;
                    case 'top':
                        newH = dragStart.startH - deltaY;
                        newW = newH * fixedRatio;
                        newY = dragStart.startRectY + (dragStart.startH - newH);
                        break;
                    default:
                        break;
                }
            }
            
            // 最小尺寸限制
            if (newW < 30) newW = 30;
            if (newH < 30) newH = 30;
            
            // 边界限制
            if (newX < 0) { 
                if (isFixedRatio) {
                    newW += newX;
                    newH = newW / ratioConfig.ratio;
                } else {
                    newW += newX;
                }
                newX = 0;
            }
            if (newY < 0) { 
                if (isFixedRatio) {
                    newH += newY;
                    newW = newH * ratioConfig.ratio;
                } else {
                    newH += newY;
                }
                newY = 0;
            }
            if (newX + newW > imageSize.width) { 
                if (isFixedRatio) {
                    newW = imageSize.width - newX;
                    newH = newW / ratioConfig.ratio;
                } else {
                    newW = imageSize.width - newX;
                }
            }
            if (newY + newH > imageSize.height) { 
                if (isFixedRatio) {
                    newH = imageSize.height - newY;
                    newW = newH * ratioConfig.ratio;
                } else {
                    newH = imageSize.height - newY;
                }
            }
            
            setCropRect({ x: newX, y: newY, w: newW, h: newH });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setIsResizing(false);
        setResizeCorner(null);
    };

    const handleConfirm = () => {
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = cropRect.w;
        cropCanvas.height = cropRect.h;
        const ctx = cropCanvas.getContext('2d');
        ctx.drawImage(
            originalImage,
            cropRect.x, cropRect.y, cropRect.w, cropRect.h,
            0, 0, cropRect.w, cropRect.h
        );
        const croppedImageData = cropCanvas.toDataURL('image/png');
        onConfirm(croppedImageData);
    };

    if (!isOpen) return null;

    return (
        <div className="crop-modal-overlay" onClick={onClose}>
            <div className="crop-modal" onClick={(e) => e.stopPropagation()}>
                <div className="crop-modal-header">
                    <h2>选择画布区域</h2>
                    <button className="crop-modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="crop-ratios">
                    {ratios.map(ratio => (
                        <button
                            key={ratio.key}
                            className={`crop-ratio-btn ${selectedRatio === ratio.key ? 'active' : ''}`}
                            onClick={() => applyRatio(ratio.key)}
                        >
                            {ratio.label}
                        </button>
                    ))}
                </div>

                <div className="crop-canvas-container" ref={containerRef}>
                    <canvas
                        ref={canvasRef}
                        style={{
                            display: 'block',
                            borderRadius: '8px',
                            cursor: isDragging ? 'grabbing' : 'grab'
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    />
                </div>

                <div className="crop-info">
                    <span>当前选区: {Math.floor(cropRect.w)} × {Math.floor(cropRect.h)}</span>
                    <span>{(cropRect.w / cropRect.h).toFixed(2)} : 1</span>
                </div>

                <div className="crop-modal-footer">
                    <button className="crop-btn cancel" onClick={onClose}>取消</button>
                    <button className="crop-btn confirm" onClick={handleConfirm}>确认裁剪</button>
                </div>
            </div>
        </div>
    );
};

export default CropModal;