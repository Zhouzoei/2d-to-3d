import React, { useState } from 'react';
import './WelcomeScreen.css';

const WelcomeScreen = ({ onEnter }) => {
    const [isVisible, setIsVisible] = useState(true);
    const [isSliding, setIsSliding] = useState(false);

    const handleEnter = () => {
        setIsSliding(true);
        setTimeout(() => {
            setIsVisible(false);
            if (onEnter) onEnter();
        }, 600);
    };

    if (!isVisible) return null;

    return (
        <div className={`welcome-screen ${isSliding ? 'slide-up' : ''}`}>
            <div className="welcome-content">
                <div className="hero">
                    <div className="badge">绘影 · Spirit Brush</div>
                    <h1>绘灵造物</h1>
                    <div className="subtitle">手绘草图 + 文字描述 → 2D角色 → 3D模型</div>
                </div>

                <div className="features">
                    <div className="feature-card">
                        <h3>灵动画布</h3>
                        <p>画笔·橡皮·撤销·上传</p>
                    </div>
                    <div className="feature-card">
                        <h3>AI 生成</h3>
                        <p>风格预设·参数可调</p>
                    </div>
                    <div className="feature-card">
                        <h3>3D 重建</h3>
                        <p>2D角色 → 3D模型</p>
                    </div>
                </div>

                <div className="showcase">
                    <div className="showcase-img-wrapper">
                        <img 
                            className="showcase-img" 
                            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%23C5E8ED'/%3E%3Ctext x='400' y='220' font-size='22' text-anchor='middle' fill='%231A4A55' font-family='Noto Serif SC'%3E角色生成示例%3C/text%3E%3Ctext x='400' y='255' font-size='14' text-anchor='middle' fill='%232C5F6B'%3E2D角色 → 3D模型%3C/text%3E%3C/svg%3E" 
                            alt="作品展示"
                        />
                    </div>
                    <div className="showcase-caption">从草图到3D模型的完整创作流程</div>
                </div>

                <div className="intro-text">
                    <p><strong>绘灵造物</strong> 是一款基于深度学习的智能角色生成工具。只需简单绘制草图，配合文字描述，即可快速生成高质量的 2D 角色立绘，并进一步重建为可交互的 3D 模型。</p>
                    <div className="feature-tags">
                        <span className="tag">风格预设</span>
                        <span className="tag">可调参数</span>
                        <span className="tag">2D生成</span>
                        <span className="tag">3D重建</span>
                        <span className="tag">模型下载</span>
                    </div>
                </div>

                <div className="start-section">
                    <button className="start-btn" onClick={handleEnter}>
                        开始创作
                        <span className="arrow">→</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;