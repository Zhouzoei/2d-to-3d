import React, { useState } from 'react';
import './WelcomeScreen.css';

const WelcomeScreen = ({ onEnter }) => {
    const [isVisible, setIsVisible] = useState(true);
    const [isSliding, setIsSliding] = useState(false);
    const [activeTag, setActiveTag] = useState('风格预设');

    const handleEnter = () => {
        setIsSliding(true);
        setTimeout(() => {
            setIsVisible(false);
            if (onEnter) onEnter();
        }, 600);
    };

    const subtitleChars = '手绘草图 + 文字描述 → 2D角色 → 3D模型'.split('');
    const tagChars = ['风格预设', '可调参数', '2D生成', '3D重建'];

    // 不同标签对应的示例图片
    const exampleImages = {
        '风格预设': {
            src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%239B6FB0'/%3E%3Ctext x='400' y='220' font-size='22' text-anchor='middle' fill='white' font-family='Noto Serif SC'%3E🎨 风格预设示例%3C/text%3E%3Ctext x='400' y='255' font-size='14' text-anchor='middle' fill='rgba(255,255,255,0.8)'%3E奇幻 · 科幻 · 可爱 · 写实%3C/text%3E%3C/svg%3E",
            caption: '多种艺术风格一键切换，自动填充提示词'
        },
        '可调参数': {
            src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%232C8A9A'/%3E%3Ctext x='400' y='220' font-size='22' text-anchor='middle' fill='white' font-family='Noto Serif SC'%3E⚙️ 可调参数示例%3C/text%3E%3Ctext x='400' y='255' font-size='14' text-anchor='middle' fill='rgba(255,255,255,0.8)'%3E创意度 · 几何细节 · 纹理质量%3C/text%3E%3C/svg%3E",
            caption: '精细控制生成效果，参数可实时调节'
        },
        '2D生成': {
            src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%23E8A87C'/%3E%3Ctext x='400' y='220' font-size='22' text-anchor='middle' fill='white' font-family='Noto Serif SC'%3E🖼️ 2D角色生成示例%3C/text%3E%3Ctext x='400' y='255' font-size='14' text-anchor='middle' fill='rgba(255,255,255,0.8)'%3E从草图到精美立绘%3C/text%3E%3C/svg%3E",
            caption: 'AI生成高质量2D角色立绘'
        },
        '3D重建': {
            src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%236B5B95'/%3E%3Ctext x='400' y='220' font-size='22' text-anchor='middle' fill='white' font-family='Noto Serif SC'%3E🗿 3D模型重建示例%3C/text%3E%3Ctext x='400' y='255' font-size='14' text-anchor='middle' fill='rgba(255,255,255,0.8)'%3E2D角色 → 3D模型%3C/text%3E%3C/svg%3E",
            caption: '自动生成可交互的3D模型'
        }
    };

    const currentImage = exampleImages[activeTag];

    const handleTagClick = (tag) => {
        setActiveTag(tag);
    };

    if (!isVisible) return null;

    return (
        <div className={`welcome-screen ${isSliding ? 'slide-up' : ''}`}>
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
                                src={currentImage.src}
                                alt={activeTag}
                            />
                            <div className="showcase-tags">
                                {tagChars.map((tag, i) => (
                                    <span 
                                        key={i} 
                                        className={`showcase-tag ${activeTag === tag ? 'active' : ''}`}
                                        onClick={() => handleTagClick(tag)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="showcase-caption">{currentImage.caption}</div>
                    </div>

                    {/* 底部留白 */}
                    <div className="bottom-spacer"></div>
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;