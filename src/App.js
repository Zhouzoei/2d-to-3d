import React from 'react';
import SketchCanvasNative from './SketchCanvasNative';
import TextInput from './TextInput';
import ImagePreview from './ImagePreview';
import Model3DPreview from './Model3DPreview';
import WelcomeScreen from './WelcomeScreen';
import OnboardingTooltip from './OnboardingTooltip';
import AuthModal from './AuthModal';
import { UserProvider, useUser } from './UserContext';
import useAppState from './hooks/useAppState';
import STYLE_PRESETS from './config/stylePresets';
import './App.css';
import CropModal from './CropModal';
import HistoryModal from './HistoryModal';

const AppContent = () => {
    const {
        showWelcome, showOnboarding, showAuthModal, showCropModal, showHistoryModal,
        tempSketchData, sketchData, loading, isDownloading, selectedStyle,
        adherenceToSketch, steps, sketchType, seed, seedLocked, generatedImage, generatedImages,
        selectedVariantIndex, confirmedImage, show3DPreview,
        generatedModels, selectedModelIndex,
        generationStatus, progress, error, currentModelUrl,
        setShowAuthModal, setShowCropModal, setShowHistoryModal,
        positivePrompt, negativePrompt, setPositivePrompt, setNegativePrompt, 
        setAdherenceToSketch, setSteps, setSketchType, setSeed, randomizeSeed, toggleSeedLock,
        handleEnterApp, handleOnboardingComplete, handleOnboardingSkip,
        handleSketchChange, handleGenerate, handleCropConfirm,
        handleRegenerate, handleSelectVariant, handleConfirm2D,
        handleDeleteVariant,
        handleRegenerate3D, handleSelectModel,
        handleDeleteModel,
        handleDownload2D, handleDownload3D,
        handleStyleClick, getStyleLabel,
        isEditMode, editingKey, editingLabel, editingPrompt, hasEdits,
        handleEditFieldChange, handleApplyEdit, handleCancelEdit,
        handleSavePresets, handleCancelEdits,
        handleLoadRecord,
        handleCancelGeneration,
        handleNewProject,
        resetKey,
        setShowWelcome,
        setShowOnboarding,
    } = useAppState();
    const { currentUser } = useUser();

    React.useEffect(() => {
        const handleKeyDown = (e) => {
            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            if (e.key === 'h' || e.key === 'H') {
                e.preventDefault();
                if (!showHistoryModal) setShowHistoryModal(true);
                return;
            }

            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                if (!loading && sketchData) handleGenerate();
                return;
            }

            if (e.key === 'Escape') {
                if (showHistoryModal) setShowHistoryModal(false);
                else if (showCropModal) setShowCropModal(false);
                else if (showAuthModal) setShowAuthModal(false);
                return;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showHistoryModal, showCropModal, showAuthModal, loading, sketchData, handleGenerate, setShowHistoryModal, setShowCropModal, setShowAuthModal]);

    const titleChars = '绘灵造物'.split('');
    const badgeChars = '✦ 绘影 · Spirit Brush ✦'.split('');
    const subtitleChars = '手绘草图 + 文字描述 → 2D角色 → 3D模型'.split('');

    return (
        <>
            {showWelcome && <WelcomeScreen onEnter={handleEnterApp} />}
            {!showWelcome && showOnboarding && (
                <OnboardingTooltip
                    onComplete={handleOnboardingComplete}
                    onSkip={handleOnboardingSkip}
                />
            )}

            <div className="app">
                <CropModal
                    isOpen={showCropModal}
                    onClose={() => setShowCropModal(false)}
                    sketchData={tempSketchData}
                    onConfirm={handleCropConfirm}
                />
                <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} setShowWelcome={setShowWelcome} setShowOnboarding={setShowOnboarding} />
                <HistoryModal
                    isOpen={showHistoryModal}
                    onClose={() => setShowHistoryModal(false)}
                    onLoadRecord={handleLoadRecord}
                />
                <div className="main-content">
                    <div className="hero-section">
                        <div className="hero-header-row">
                            <div className="hero-header-side">
                                <button
                                    className="header-btn new-btn"
                                    onClick={handleNewProject}
                                    title="清空画布和生成结果，开始新创作"
                                >
                                    <span>新创作</span>
                                </button>
                                <button
                                    className="header-btn history-btn"
                                    onClick={() => setShowHistoryModal(true)}
                                >
                                    <span>生成记录</span>
                                </button>
                                <button
                                    className="header-btn user-btn"
                                    onClick={() => setShowAuthModal(true)}
                                >
                                    <span className="user-avatar">
                                        {currentUser ? (currentUser.name?.charAt(0).toUpperCase() || '👤') : '👤'}
                                    </span>
                                    <span className="user-name">
                                        {currentUser ? (currentUser.name || currentUser.email?.split('@')[0]) : '登录'}
                                    </span>
                                </button>
                            </div>
                            <div className="hero-header-center">
                                <div className="badge">
                                    {badgeChars.map((char, i) => (
                                        <span key={i} className="wave-char" style={{ '--delay': i }}>
                                            {char}
                                        </span>
                                    ))}
                                </div>
                                <div className="hero-title">
                                    {titleChars.map((char, i) => (
                                        <span key={i} className="title-char">{char}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <p className="hero-subtitle">
                            {subtitleChars.map((char, i) => (
                                <span key={i} className="sub-wave-char" style={{ '--delay': i }}>
                                    {char}
                                </span>
                            ))}
                        </p>
                    </div>

                    <div className="top-double-layout">
                        <div className="sketch-col">
                            <div className="card sketch-card-full">
                                <div className="card-header">
                                    灵动画布
                                    <span>Sketch</span>
                                </div>
                                <div className="card-content sketch-card-content">
                                    <div className="sketch-area-wrapper">
                                        <SketchCanvasNative 
                                            key={resetKey}
                                            onSketchChange={handleSketchChange}
                                            sketchDataToLoad={sketchData}
                                        />
                                    </div>
                                    <div className="prompt-wrapper">
                                        <TextInput 
                                            positivePrompt={positivePrompt}
                                            negativePrompt={negativePrompt}
                                            onChangePositive={setPositivePrompt}
                                            onChangeNegative={setNegativePrompt}
                                            selectedStyle={selectedStyle}
                                            getStyleLabel={getStyleLabel}
                                        />
                                    </div>
                                    <div className="generate-row">
                                    <button
                                        className="generate-button"
                                        onClick={handleGenerate}
                                        disabled={loading || !sketchData}
                                    >
                                        {loading ? '生成中...' : '开始生成 →'}
                                    </button>
                                    {loading && (
                                        <button
                                            className="cancel-button"
                                            onClick={handleCancelGeneration}
                                        >
                                            取消
                                        </button>
                                    )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="params-col">
                            <div className="card">
                                <div className="card-header">
                                    风格预设
                                    <span>Presets</span>
                                </div>
                                <div className="card-content">
                                    <div className="style-grid">
                                        {STYLE_PRESETS.map(preset => (
                                            <div
                                                key={preset.key}
                                                className={`style-chip ${selectedStyle === preset.key ? 'active' : ''} ${preset.key === '自定义' ? 'preset-custom' : ''} ${isEditMode && preset.key !== '自定义' ? 'editable' : ''}`}
                                                onClick={() => handleStyleClick(preset.key)}
                                            >
                                                {preset.key === '自定义' ? (isEditMode ? '退出编辑' : '自定义') : (isEditMode ? (editingKey === preset.key ? '✎ 编辑中' : (getStyleLabel(preset.key) !== preset.label ? getStyleLabel(preset.key) : preset.label)) : preset.label)}
                                            </div>
                                        ))}
                                    </div>

                                    {isEditMode && !editingKey && (
                                        <div className="edit-mode-hint">点击上方风格进行编辑修改</div>
                                    )}

                                    {isEditMode && editingKey && (
                                        <div className="custom-preset-editor">
                                            <div className="custom-preset-field">
                                                <label>名称</label>
                                                <input
                                                    type="text"
                                                    placeholder="风格名称"
                                                    value={editingLabel}
                                                    onChange={(e) => handleEditFieldChange('label', e.target.value)}
                                                />
                                            </div>
                                            <div className="custom-preset-field">
                                                <label>描述词</label>
                                                <textarea
                                                    rows={2}
                                                    placeholder="英文提示词，如: steampunk, gears, brass"
                                                    value={editingPrompt}
                                                    onChange={(e) => handleEditFieldChange('prompt', e.target.value)}
                                                />
                                            </div>
                                            <div className="edit-actions">
                                                <button className="edit-btn apply-btn" onClick={handleApplyEdit}>应用</button>
                                                <button className="edit-btn cancel-btn" onClick={handleCancelEdit}>取消</button>
                                            </div>
                                        </div>
                                    )}

                                    {isEditMode && (
                                        <div className="edit-actions save-bar">
                                            <button className="edit-btn save-btn" onClick={handleSavePresets} disabled={!hasEdits}>保存修改</button>
                                            <button className="edit-btn cancel-btn" onClick={handleCancelEdits} disabled={!hasEdits}>撤销所有</button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="card">
                                <div className="card-header">
                                    高级参数
                                    <span>Fine-tune</span>
                                </div>
                                <div className="card-content">
                                    <div className="param-group">
                                        <div className="param-row">
                                            <span className="param-label">贴近草图程度</span>
                                            <span className="param-value">{adherenceToSketch.toFixed(2)}</span>
                                        </div>
                                        <div className="param-desc">低值=AI自由发挥，高值=严格遵循草图轮廓</div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            value={adherenceToSketch}
                                            onChange={(e) => setAdherenceToSketch(parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <div className="param-group">
                                        <div className="param-row">
                                            <span className="param-label">迭代步数</span>
                                            <span className="param-value">{steps}</span>
                                        </div>
                                        <div className="param-desc">生成质量与速度的平衡（10-30步）</div>
                                        <input
                                            type="range"
                                            min="10"
                                            max="30"
                                            step="1"
                                            value={steps}
                                            onChange={(e) => setSteps(parseInt(e.target.value))}
                                        />
                                    </div>
                                    <div className="param-group">
                                        <div className="param-row">
                                            <span className="param-label">草图类型</span>
                                        </div>
                                        <div className="param-desc">决定如何理解用户的草图输入</div>
                                        <select
                                            className="param-select"
                                            value={sketchType}
                                            onChange={(e) => setSketchType(e.target.value)}
                                        >
                                            <option value="scribble">涂鸦 - 适合粗糙草图</option>
                                            <option value="canny">边缘 - 适合清晰轮廓</option>
                                            <option value="lineart">线稿 - 适合精致线稿</option>
                                            <option value="mlsd">直线检测 - 适合建筑/几何</option>
                                        </select>
                                    </div>
                                    <div className="param-group">
                                        <div className="param-row">
                                            <span className="param-label">随机种子</span>
                                        </div>
                                        <div className="param-desc">锁定=每次生成相同结果；随机=尝试不同变体</div>
                                        <div className="seed-control">
                                            <input
                                                type="number"
                                                className="seed-input"
                                                value={seed}
                                                onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                                            />
                                            <button 
                                                className="seed-btn randomize"
                                                onClick={randomizeSeed}
                                                title="随机种子"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M4 4l17 17"/>
                                                </svg>
                                            </button>
                                            <button 
                                                className={`seed-btn lock ${seedLocked ? 'locked' : ''}`}
                                                onClick={toggleSeedLock}
                                                title={seedLocked ? '解锁种子' : '锁定种子'}
                                            >
                                                {seedLocked ? (
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M12 1C8.676 1 6 3.676 6 7v2H4v14h16V9h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v2H8V7c0-2.276 1.724-4 4-4z"/>
                                                    </svg>
                                                ) : (
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M12 1C8.676 1 6 3.676 6 7v2H4v14h16V9h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v2H8V7c0-2.276 1.724-4 4-4z"/>
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="param-divider"></div>
                                </div>
                            </div>

                            <div className="card">
                                <div className="card-header">
                                    生成状态
                                    <span>Live</span>
                                </div>
                                <div className="card-content">
                                    <div className="status-item">
                                        <div className={`status-dot ${generationStatus.sketch === 'done' ? 'done' : generationStatus.sketch === 'active' ? 'active' : ''}`}></div>
                                        <div className="status-text">
                                            <span className="title">草图处理</span>
                                            <div>{generationStatus.sketch === 'done' ? '线稿提取完成' : '处理中...'}</div>
                                        </div>
                                    </div>
                                    <div className="status-item">
                                        <div className={`status-dot ${generationStatus.character === 'active' ? 'active' : generationStatus.character === 'done' ? 'done' : generationStatus.character === 'error' ? 'active' : ''}`}></div>
                                        <div className="status-text">
                                            <span className="title">2D 角色生成</span>
                                            <div>{generationStatus.character === 'active' ? '推理中...' : generationStatus.character === 'done' ? '生成完成' : generationStatus.character === 'error' ? '失败' : '等待中'}</div>
                                        </div>
                                    </div>
                                    <div className="status-item">
                                        <div className={`status-dot ${generationStatus.model === 'active' ? 'active' : generationStatus.model === 'done' ? 'done' : ''}`}></div>
                                        <div className="status-text">
                                            <span className="title">3D 模型重建</span>
                                            <div>{generationStatus.model === 'active' ? '重建中...' : generationStatus.model === 'done' ? '完成' : '等待中'}</div>
                                        </div>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    {error && (
                                        <div style={{ color: '#e74c3c', fontSize: '12px', marginTop: '8px' }}>
                                            错误: {error}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bottom-double-layout">
                        <div className="gallery-left">
                            <div className="card preview-card-full">
                                <div className="card-header">
                                    灵韵画卷
                                    <span>2D Artwork</span>
                                </div>
                                <div className="card-content preview-card-content">
                                    <div className="preview-area">
                                        <ImagePreview imageUrl={generatedImage} loading={loading} />
                                        <div className="preview-hint">
                                            <span>鼠标拖拽移动 · 按钮缩放</span>
                                        </div>
                                    </div>
                                    {generatedImages.length > 0 && (
                                        <div className="variant-section">
                                            <div className="variant-strip">
                                                {generatedImages.map((img, i) => {
                                                    const batchNum = Math.floor(i / 3) + 1;
                                                    const isFirstInBatch = i % 3 === 0;
                                                    return (
                                                        <div
                                                            key={i}
                                                            className={`variant-thumb ${selectedVariantIndex === i ? 'active' : ''} ${isFirstInBatch ? 'batch-start' : ''}`}
                                                            onClick={() => handleSelectVariant(i)}
                                                        >
                                                            <img src={img} alt={`变体 ${i + 1}`} />
                                                            {isFirstInBatch && <span className="batch-badge">{batchNum}</span>}
                                                            <span className="variant-num">{i + 1}</span>
                                                            <button
                                                                className="variant-thumb-del"
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteVariant(i); }}
                                                            >✕</button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="variant-actions">
                                                <button
                                                    className="variant-btn regenerate-btn"
                                                    onClick={handleRegenerate}
                                                    disabled={loading}
                                                >
                                                    {loading ? '生成中...' : '重新生成'}
                                                </button>
                                                {!confirmedImage && (
                                                    <button
                                                        className="variant-btn proceed-btn"
                                                        onClick={handleConfirm2D}
                                                    >
                                                        继续生成3d
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <button
                                        className="download-btn"
                                        onClick={handleDownload2D}
                                        disabled={loading || !generatedImage}
                                    >
                                        下载 2D 图片 ↓
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="gallery-right">
                            <div className="card preview-card-full">
                                <div className="card-header">
                                    造物之形
                                    <span>3D Model</span>
                                </div>
                                <div className="card-content preview-card-content">
                                    <div className="preview-area model-preview-area">
                                        {show3DPreview ? (
                                            <Model3DPreview modelUrl={currentModelUrl} loading={loading} />
                                        ) : (
                                            <div className="preview-placeholder">
                                                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '8px', opacity: 0.6 }}>
                                                    <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" stroke="#2C5F6B" strokeWidth="1.2" fill="none" />
                                                    <path d="M2 7l10 5 10-5" stroke="#2C5F6B" strokeWidth="1.2" fill="none" />
                                                    <path d="M12 22V12" stroke="#2C5F6B" strokeWidth="1.2" fill="none" />
                                                </svg>
                                                <div style={{ fontSize: '13px', fontWeight: 500 }}>
                                                    {confirmedImage ? '3D 模型生成中...' : '等待 2D 角色确认'}
                                                </div>
                                                <div style={{ fontSize: '11px', marginTop: '6px' }}>
                                                    {confirmedImage ? '正在重建 3D 网格' : '选择 2D 结果后自动重建'}
                                                </div>
                                            </div>
                                        )}
                                        <div className="preview-hint">
                                            <span>鼠标拖拽旋转 · 滚轮缩放 · PBR 材质</span>
                                        </div>
                                    </div>
                                    {show3DPreview && generatedModels.length > 0 && (
                                        <div className="variant-section">
                                            <div className="variant-strip">
                                                {generatedModels.map((model, i) => (
                                                    <div
                                                        key={model.id}
                                                        className={`variant-thumb ${selectedModelIndex === i ? 'active' : ''}`}
                                                        onClick={() => handleSelectModel(i)}
                                                    >
                                                        <div className="variant-thumb-3d">
                                                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                                                <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" stroke="currentColor" strokeWidth="1.5" fill="none" />
                                                                <path d="M2 7l10 5 10-5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                                                                <path d="M12 22V12" stroke="currentColor" strokeWidth="1.5" fill="none" />
                                                            </svg>
                                                        </div>
                                                        <span className="variant-num">{i + 1}</span>
                                                        <button
                                                            className="variant-thumb-del"
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteModel(i); }}
                                                        >✕</button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="variant-actions">
                                                <button
                                                    className="variant-btn regenerate-btn"
                                                    onClick={handleRegenerate3D}
                                                    disabled={loading}
                                                >
                                                    {loading ? '生成中...' : '重新生成3d'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <button
                                        className="download-btn"
                                        onClick={handleDownload3D}
                                        disabled={isDownloading || loading || !show3DPreview}
                                    >
                                        {isDownloading ? '下载中...' : '下载 3D 模型 ↓'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="footer-note">✦ 绘影 · 绘灵造物：基于草图的2D/3D角色生成工具 ✦</div>
                </div>
            </div>
        </>
    );
};

function App() {
    return (
        <UserProvider>
            <AppContent />
        </UserProvider>
    );
}

export default App;
