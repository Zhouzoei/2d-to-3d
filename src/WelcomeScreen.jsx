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

    const subtitleChars = '手绘草图 + 文字描述 → 2D角色 → 3D模型'.split('');
    const tagChars = ['风格预设', '可调参数', '2D生成', '3D重建'];

    if (!isVisible) return null;

    return (
        <div className={`welcome-screen ${isSliding ? 'slide-up' : ''}`}>
            {/* 添加包装器 */}
            <div className="welcome-wrapper">
                <div className="welcome-content">
                    {/* 左上角 logo 区域 */}
                    <div className="logo-area">
                        <h1 className="logo-title">绘灵造物</h1>
                        <div className="badge">绘影 · Spirit Brush</div>
                    </div>

                    {/* 中央主标题 */}
                    <div className="central-hero">
                        <p className="main-subtitle">
                            {subtitleChars.map((char, i) => (
                                <span key={i} className="sub-wave-char" style={{ animationDelay: `${i * 0.03}s` }}>
                                    {char}
                                </span>
                            ))}
                        </p>
                    </div>

                    {/* 介绍文字 */}
                    <div className="intro-text">
                        <p><strong>绘灵造物</strong> 是一款基于深度学习的智能角色生成工具。只需简单绘制草图，配合文字描述，即可快速生成高质量的 2D 角色立绘，并进一步重建为可交互的 3D 模型。</p>
                    </div>

                    {/* 开始按钮 */}
                    <div className="start-section">
                        <button className="start-btn" onClick={handleEnter}>
                            开始创作
                            <span className="arrow">›</span>
                        </button>
                    </div>

                    {/* 图片示例区域 */}
                    <div className="showcase-section">
                        <div className="showcase-img-wrapper">
                            <img 
                                className="showcase-img" 
                                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%23C5E8ED'/%3E%3Ctext x='400' y='220' font-size='22' text-anchor='middle' fill='%231A4A55' font-family='Noto Serif SC'%3E角色生成示例%3C/text%3E%3Ctext x='400' y='255' font-size='14' text-anchor='middle' fill='%232C5F6B'%3E2D角色 → 3D模型%3C/text%3E%3C/svg%3E" 
                                alt="作品展示"
                            />
                            <div className="showcase-tags">
                                {tagChars.map((tag, i) => (
                                    <span key={i} className="showcase-tag">{tag}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 底部留白 - 关键！确保背景完整 */}
                    <div className="bottom-spacer"></div>
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;