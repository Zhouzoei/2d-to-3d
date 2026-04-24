import React, { useState, useEffect, useRef, useCallback } from 'react';
import './OnboardingTooltip.css';

const OnboardingTooltip = ({ onComplete, onSkip }) => {
    const [step, setStep] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
    const [highlightRect, setHighlightRect] = useState(null);
    const tooltipRef = useRef(null);

    // 定义每个提示对应的目标元素选择器
    const tips = [
        {
            title: '灵动画布',
            content: '在这里绘制你的角色草图，支持画笔、橡皮、撤销、上传图片等多种工具。\n下方可以输入文字描述，详细描述角色的特征。',
            targetSelector: '.sketch-col',
            placement: 'right',
            highlight: true
        },
        {
            title: '风格预设',
            content: '快速选择奇幻、科幻、可爱、写实等艺术风格。\n点击即可切换，系统会自动填充对应的提示词。',
            targetSelector: '.params-col .card:first-child',
            placement: 'left',
            highlight: true
        },
        {
            title: '高级参数',
            content: '调整创意度、几何细节、纹理质量。\n数值越高效果越丰富，可以精细控制生成结果。',
            targetSelector: '.params-col .card:nth-child(2)',
            placement: 'left',
            highlight: true
        },
        {
            title: '生成状态',
            content: '实时查看草图处理、2D角色生成、3D模型重建的进度和状态，方便了解当前生成阶段。',
            targetSelector: '.params-col .card:last-child',
            placement: 'left',
            highlight: true
        },
        {
            title: '灵韵画卷',
            content: 'AI 生成的 2D 角色图像会显示在这里.\n支持鼠标拖拽移动和按钮缩放，可以下载保存。',
            targetSelector: '.gallery-left .preview-card-full',
            placement: 'right',
            highlight: true
        },
        {
            title: '造物之形',
            content: '3D 模型预览区域，支持鼠标拖拽旋转视角、滚轮缩放，可以下载 OBJ 格式的 3D 模型文件。',
            targetSelector: '.gallery-right .preview-card-full',
            placement: 'left',
            highlight: true
        }
    ];

    const currentTip = tips[step];

    // 获取目标元素
    const getTargetElement = useCallback(() => {
        let target = null;
        try {
            if (currentTip.targetSelector) {
                target = document.querySelector(currentTip.targetSelector);
            }
            // 如果没找到，根据文本内容查找
            if (!target && currentTip.title === '风格预设') {
                const cards = document.querySelectorAll('.card');
                for (const card of cards) {
                    const header = card.querySelector('.card-header');
                    if (header && header.textContent.includes('风格预设')) {
                        target = card;
                        break;
                    }
                }
            }
            if (!target && currentTip.title === '高级参数') {
                const cards = document.querySelectorAll('.card');
                for (const card of cards) {
                    const header = card.querySelector('.card-header');
                    if (header && header.textContent.includes('高级参数')) {
                        target = card;
                        break;
                    }
                }
            }
            if (!target && currentTip.title === '生成状态') {
                const cards = document.querySelectorAll('.card');
                for (const card of cards) {
                    const header = card.querySelector('.card-header');
                    if (header && header.textContent.includes('生成状态')) {
                        target = card;
                        break;
                    }
                }
            }
        } catch (e) {
            console.warn('查找目标元素失败:', e);
        }
        return target;
    }, [currentTip.targetSelector, currentTip.title]);

    // 计算提示框位置和高亮区域
    const updatePositions = useCallback(() => {
        const targetElement = getTargetElement();
        if (!targetElement) {
            console.warn('找不到目标元素:', currentTip.title);
            return;
        }

        const targetRect = targetElement.getBoundingClientRect();
        const tooltipWidth = 280;
        const tooltipHeight = 200;
        const gap = 15;

        // 更新高亮区域
        setHighlightRect({
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16
        });

        let top, left;

        switch (currentTip.placement) {
            case 'right':
                top = targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2);
                left = targetRect.right + gap;
                break;
            case 'left':
                top = targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2);
                left = targetRect.left - tooltipWidth - gap;
                break;
            default:
                top = targetRect.top;
                left = targetRect.right + gap;
        }

        // 边界检测
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (left < 10) left = 10;
        if (left + tooltipWidth > viewportWidth - 10) {
            left = viewportWidth - tooltipWidth - 10;
        }
        if (top < 10) top = 10;
        if (top + tooltipHeight > viewportHeight - 10) {
            top = viewportHeight - tooltipHeight - 10;
        }

        setTooltipPosition({ top, left });
    }, [getTargetElement, currentTip.title, currentTip.placement]);

    // 监听滚动和窗口大小变化
    useEffect(() => {
        if (!isVisible) return;

        // 延迟一点确保 DOM 渲染完成
        const timer = setTimeout(() => {
            updatePositions();
        }, 100);

        // 监听滚动事件
        window.addEventListener('scroll', updatePositions, true);
        window.addEventListener('resize', updatePositions);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('scroll', updatePositions, true);
            window.removeEventListener('resize', updatePositions);
        };
    }, [isVisible, updatePositions]);

    const handleNext = () => {
        if (step + 1 < tips.length) {
            setStep(step + 1);
            // 延迟滚动，等待 DOM 更新
            setTimeout(() => {
                const target = getTargetElement();
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                updatePositions();
            }, 100);
        } else {
            setIsVisible(false);
            if (onComplete) onComplete();
        }
    };

    const handleSkip = () => {
        setIsVisible(false);
        if (onSkip) onSkip();
    };

    if (!isVisible) return null;

    return (
        <div className="onboarding-overlay">
            {/* 高亮遮罩 */}
            {highlightRect && currentTip.highlight && (
                <>
                    <div className="highlight-mask" style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.6)',
                        zIndex: 3000,
                        pointerEvents: 'none'
                    }} />
                    <div 
                        className="highlight-area"
                        style={{
                            position: 'fixed',
                            top: highlightRect.top,
                            left: highlightRect.left,
                            width: highlightRect.width,
                            height: highlightRect.height,
                            zIndex: 3002,
                            pointerEvents: 'none',
                            borderRadius: '12px',
                            boxShadow: '0 0 0 4px rgba(255, 255, 255, 0.5), 0 0 0 8px rgba(26, 74, 85, 0.3)',
                            transition: 'all 0.3s ease'
                        }}
                    />
                </>
            )}
            
            {/* 提示气泡 */}
            <div 
                ref={tooltipRef}
                className="onboarding-tooltip"
                style={{
                    top: tooltipPosition.top,
                    left: tooltipPosition.left,
                    position: 'fixed',
                    zIndex: 3003
                }}
            >
                <div className="tooltip-header">
                    <span className="tooltip-step">{step + 1}/{tips.length}</span>
                    <button className="tooltip-skip" onClick={handleSkip}>跳过</button>
                </div>
                <h4>{currentTip.title}</h4>
                <p>
                    {currentTip.content.split('\n').map((line, i) => (
                        <React.Fragment key={i}>
                            {line}
                            {i < currentTip.content.split('\n').length - 1 && <br />}
                        </React.Fragment>
                    ))}
                </p>
                <button className="tooltip-next" onClick={handleNext}>
                    {step + 1 === tips.length ? '完成' : '下一步'}
                    <span className="tooltip-arrow">→</span>
                </button>
                <div className={`tooltip-arrow-pointer arrow-${currentTip.placement}`} />
            </div>
        </div>
    );
};

export default OnboardingTooltip;