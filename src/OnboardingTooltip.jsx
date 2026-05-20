import React, { useState, useEffect, useRef, useCallback } from 'react';
import './OnboardingTooltip.css';

const TIPS = [
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
        content: 'AI 生成的 2D 角色图像会显示在这里。\n支持鼠标拖拽移动和按钮缩放，可下载保存。',
        targetSelector: '.gallery-left .preview-card-full',
        placement: 'right',
        highlight: true
    },
    {
        title: '造物之形',
        content: '3D 模型预览区域，支持鼠标拖拽旋转视角、滚轮缩放，可下载 3D 模型文件。',
        targetSelector: '.gallery-right .preview-card-full',
        placement: 'left',
        highlight: true
    },
    {
        title: '生成记录',
        content: '点击顶部「生成记录」按钮或按 H 键，查看所有历史作品。\n支持按时间筛选、搜索、收藏和重命名。\n点击卡片可预览详情，确认后再加载到画布。',
        targetSelector: '.history-btn',
        placement: 'bottom',
        highlight: true
    },
    {
        title: '个人账户',
        content: '点击右上角头像登录/注册账户。\n在账户面板可查看生成次数、连续创作天数、常用风格统计和最近动态。\n支持编辑昵称、上传头像、修改密码。',
        targetSelector: '.user-btn',
        placement: 'bottom',
        highlight: true
    },
];

function findTarget(tip) {
    if (!tip) return null;
    let target = null;
    try {
        if (tip.targetSelector) {
            target = document.querySelector(tip.targetSelector);
        }
        if (!target) {
            const fallbackTitles = ['风格预设', '高级参数', '生成状态'];
            for (const title of fallbackTitles) {
                if (tip.title === title) {
                    const cards = document.querySelectorAll('.card');
                    for (const card of cards) {
                        const header = card.querySelector('.card-header');
                        if (header && header.textContent.includes(title)) {
                            target = card;
                            break;
                        }
                    }
                    break;
                }
            }
        }
        if (!target && tip.title === '生成记录') {
            const btns = document.querySelectorAll('.header-btn');
            for (const btn of btns) {
                if (btn.textContent.includes('生成记录')) {
                    target = btn;
                    break;
                }
            }
        }
        if (!target && tip.title === '个人账户') {
            const btns = document.querySelectorAll('.header-btn');
            for (const btn of btns) {
                if (btn.classList.contains('user-btn')) {
                    target = btn;
                    break;
                }
            }
        }
    } catch (e) {
        console.warn('查找目标元素失败:', e);
    }
    return target;
}

function calcPositions(tip, tooltipW, tooltipH) {
    const target = findTarget(tip);
    if (!target) return null;

    const rect = target.getBoundingClientRect();
    const gap = 14;

    const highlight = {
        top: rect.top - 8,
        left: rect.left - 8,
        width: rect.width + 16,
        height: rect.height + 16
    };

    let top, left;

    switch (tip.placement) {
        case 'right':
            top = rect.top + (rect.height / 2) - (tooltipH / 2);
            left = rect.right + gap;
            break;
        case 'left':
            top = rect.top + (rect.height / 2) - (tooltipH / 2);
            left = rect.left - tooltipW - gap;
            break;
        case 'bottom':
            top = rect.bottom + gap;
            left = rect.left + (rect.width / 2) - (tooltipW / 2);
            break;
        default:
            top = rect.top;
            left = rect.right + gap;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 10;

    if (left < pad) left = pad;
    if (left + tooltipW > vw - pad) left = vw - tooltipW - pad;
    if (top < pad) top = pad;
    if (top + tooltipH > vh - pad) top = vh - tooltipH - pad;

    return { tooltip: { top, left }, highlight };
}

const OnboardingTooltip = ({ onComplete, onSkip }) => {
    const [step, setStep] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
    const [highlightRect, setHighlightRect] = useState(null);
    const [tooltipSize, setTooltipSize] = useState({ width: 280, height: 200 });
    const [positionTick, setPositionTick] = useState(0);
    const tooltipRef = useRef(null);
    const stepRef = useRef(0);
    const tickRef = useRef(0);

    const refresh = useCallback(() => {
        const tip = TIPS[stepRef.current];
        const tw = tooltipRef.current ? tooltipRef.current.offsetWidth : tooltipSize.width;
        const th = tooltipRef.current ? tooltipRef.current.offsetHeight : tooltipSize.height;
        const result = calcPositions(tip, tw, th);
        if (!result) return;
        setTooltipPosition(result.tooltip);
        setHighlightRect(result.highlight);
    }, [tooltipSize]);

    const doStep = useCallback((nextStep) => {
        stepRef.current = nextStep;
        setStep(nextStep);
        const nextTip = TIPS[nextStep];
        if (!nextTip) return;

        const target = findTarget(nextTip);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        setTimeout(() => {
            if (tooltipRef.current) {
                setTooltipSize({
                    width: tooltipRef.current.offsetWidth,
                    height: tooltipRef.current.offsetHeight
                });
            }
            tickRef.current += 1;
            setPositionTick(tickRef.current);
        }, 100);

        setTimeout(() => {
            tickRef.current += 1;
            setPositionTick(tickRef.current);
        }, 500);

        setTimeout(() => {
            tickRef.current += 1;
            setPositionTick(tickRef.current);
        }, 900);
    }, []);

    useEffect(() => {
        if (!isVisible) return;
        stepRef.current = step;
        const timer = setTimeout(() => {
            if (tooltipRef.current) {
                setTooltipSize({
                    width: tooltipRef.current.offsetWidth,
                    height: tooltipRef.current.offsetHeight
                });
            }
            doStep(step);
        }, 200);
        return () => clearTimeout(timer);
    }, [isVisible, step, doStep]);

    useEffect(() => {
        if (!isVisible) return;
        refresh();
        window.addEventListener('scroll', refresh, true);
        window.addEventListener('resize', refresh);
        return () => {
            window.removeEventListener('scroll', refresh, true);
            window.removeEventListener('resize', refresh);
        };
    }, [isVisible, refresh, positionTick]);

    const handleNext = () => {
        if (step + 1 < TIPS.length) {
            doStep(step + 1);
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

    const currentTip = TIPS[step];

    return (
        <div className="onboarding-overlay">
            {highlightRect && currentTip.highlight && (
                <>
                    <div className="highlight-mask" style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0, 0, 0, 0.6)', zIndex: 3000, pointerEvents: 'none'
                    }} />
                    <div
                        className="highlight-area"
                        style={{
                            position: 'fixed', top: highlightRect.top, left: highlightRect.left,
                            width: highlightRect.width, height: highlightRect.height,
                            zIndex: 3002, pointerEvents: 'none',
                            borderRadius: '12px',
                            boxShadow: '0 0 0 4px rgba(255, 255, 255, 0.5), 0 0 0 8px rgba(26, 74, 85, 0.3)',
                            transition: 'all 0.3s ease'
                        }}
                    />
                </>
            )}

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
                    <span className="tooltip-step">{step + 1}/{TIPS.length}</span>
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
                    {step + 1 === TIPS.length ? '完成' : '下一步'}
                    <span className="tooltip-arrow">→</span>
                </button>
                <div className={`tooltip-arrow-pointer arrow-${currentTip.placement}`} />
            </div>
        </div>
    );
};

export default OnboardingTooltip;
