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
        creativity, geometryDetail, textureQuality, generatedImage, generatedImages,
        selectedVariantIndex, confirmedImage, show3DPreview,
        generatedModels, selectedModelIndex,
        generationStatus, progress, error, currentModelUrl,
        setShowAuthModal, setShowCropModal, setShowHistoryModal,
        prompt, setPrompt, setCreativity, setGeometryDetail, setTextureQuality,
        handleEnterApp, handleOnboardingComplete, handleOnboardingSkip,
        handleSketchChange, handleGenerate, handleCropConfirm,
        handleRegenerate, handleSelectVariant, handleConfirm2D,
        handleDeleteVariant,
        handleRegenerate3D, handleSelectModel,
        handleDeleteModel,
        handleDownload2D, handleDownload3D, getTextureQualityText,
        handleStyleClick, getStyleLabel,
        isEditMode, editingKey, editingLabel, editingPrompt, hasEdits,
        handleEditFieldChange, handleApplyEdit, handleCancelEdit,
        handleSavePresets, handleCancelEdits,
        handleLoadRecord,
        handleCancelGeneration,
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

            <div className="app">
                {!showWelcome && showOnboarding && (
                    <OnboardingTooltip
                        onComplete={handleOnboardingComplete}
                        onSkip={handleOnboardingSkip}
                    />
                )}
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
                                        <SketchCanvasNative onSketchChange={handleSketchChange} />
                                    </div>
                                    <div className="prompt-wrapper">
                                        <TextInput value={prompt} onChange={setPrompt} selectedStyle={selectedStyle} getStyleLabel={getStyleLabel} />
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
                                            <span className="param-label">创意度 (CFG)</span>
                                            <span className="param-value">{creativity.toFixed(2)}</span>
                                        </div>
                                        <div className="param-desc">数值越高，生成结果越多样化</div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            value={creativity}
                                            onChange={(e) => setCreativity(parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <div className="param-group">
                                        <div className="param-row">
                                            <span className="param-label">几何细节</span>
                                            <span className="param-value">{geometryDetail.toFixed(2)}</span>
                                        </div>
                                        <div className="param-desc">网格分辨率与结构复杂度</div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            value={geometryDetail}
                                            onChange={(e) => setGeometryDetail(parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <div className="param-group">
                                        <div className="param-row">
                                            <span className="param-label">纹理质量</span>
                                            <span className="param-value">{getTextureQualityText(textureQuality)}</span>
                                        </div>
                                        <div className="param-desc">UV 分辨率与纹理细节层级</div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            value={textureQuality}
                                            onChange={(e) => setTextureQuality(parseFloat(e.target.value))}
                                        />
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
                                                {generatedImages.map((img, i) => (
                                                    <div
                                                        key={i}
                                                        className={`variant-thumb ${selectedVariantIndex === i ? 'active' : ''}`}
                                                        onClick={() => handleSelectVariant(i)}
                                                    >
                                                        <img src={img} alt={`变体 ${i + 1}`} />
                                                        <span className="variant-num">{i + 1}</span>
                                                        <button
                                                            className="variant-thumb-del"
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteVariant(i); }}
                                                        >✕</button>
                                                    </div>
                                                ))}
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
