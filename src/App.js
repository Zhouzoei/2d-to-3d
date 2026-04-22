import React, { useState } from 'react';
import SketchCanvasNative from './SketchCanvasNative';
import TextInput from './TextInput';
import ImagePreview from './ImagePreview';
import Model3DPreview from './Model3DPreview';
import WelcomeScreen from './WelcomeScreen';
import OnboardingTooltip from './OnboardingTooltip';
import './App.css';

// API 地址
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// 过期天数配置
const EXPIRE_DAYS = 7;

function App() {
    // ============================================
    // 欢迎页和引导提示的统一过期逻辑
    // ============================================
    const [showWelcome, setShowWelcome] = useState(() => {
        const lastVisit = localStorage.getItem('lastVisit');
        const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
        
        // 如果没有看过欢迎页，显示
        if (!hasSeenWelcome) {
            return true;
        }
        
        // 如果超过 EXPIRE_DAYS 天没有访问，重新显示欢迎页
        if (lastVisit) {
            const daysSinceLastVisit = (Date.now() - parseInt(lastVisit)) / (1000 * 60 * 60 * 24);
            if (daysSinceLastVisit >= EXPIRE_DAYS) {
                // 超过天数，清除所有记录，重新显示欢迎页
                localStorage.removeItem('hasSeenWelcome');
                localStorage.removeItem('hasSeenOnboarding');
                return true;
            }
        }
        
        return false;
    });

    const [showOnboarding, setShowOnboarding] = useState(() => {
        const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
        const lastVisit = localStorage.getItem('lastVisit');
        
        // 如果欢迎页正在显示，不显示引导提示
        if (showWelcome) return false;
        
        // 如果没有看过引导提示，显示
        if (!hasSeenOnboarding) {
            return true;
        }
        
        // 如果超过 EXPIRE_DAYS 天没有访问，重新显示引导提示
        if (lastVisit) {
            const daysSinceLastVisit = (Date.now() - parseInt(lastVisit)) / (1000 * 60 * 60 * 24);
            if (daysSinceLastVisit >= EXPIRE_DAYS) {
                localStorage.removeItem('hasSeenOnboarding');
                return true;
            }
        }
        
        return false;
    });

    // 进入主应用（欢迎页点击开始创作）
    const handleEnterApp = () => {
        setShowWelcome(false);
        localStorage.setItem('hasSeenWelcome', 'true');
        localStorage.setItem('lastVisit', Date.now().toString());
        
        // 检查是否需要显示引导提示
        const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
        if (!hasSeenOnboarding) {
            setShowOnboarding(true);
        }
    };

    // 引导提示完成
    const handleOnboardingComplete = () => {
        setShowOnboarding(false);
        localStorage.setItem('hasSeenOnboarding', 'true');
    };

    // 引导提示跳过
    const handleOnboardingSkip = () => {
        setShowOnboarding(false);
        localStorage.setItem('hasSeenOnboarding', 'true');
    };

    // ============================================
    // 原有的 state
    // ============================================
    const [sketchData, setSketchData] = useState(null);
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [selectedStyle, setSelectedStyle] = useState('奇幻');
    const [creativity, setCreativity] = useState(0.7);
    const [geometryDetail, setGeometryDetail] = useState(0.8);
    const [textureQuality, setTextureQuality] = useState(0.9);
    const [generatedImage, setGeneratedImage] = useState(null);
    const [generationStatus, setGenerationStatus] = useState({
        sketch: 'done',
        character: 'pending',
        model: 'pending'
    });
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);

    const testModelUrl = '/assets/3d-character.obj';

    // ============================================
    // 原有的函数
    // ============================================
    const handleSketchChange = (dataURL) => {
        setSketchData(dataURL);
        setGeneratedImage(null);
        setError(null);
        setGenerationStatus({
            sketch: 'done',
            character: 'pending',
            model: 'pending'
        });
        setProgress(0);
    };

    const handleGenerate = async () => {
        if (!sketchData) {
            alert('请先绘制草图');
            return;
        }
        if (!prompt.trim()) {
            alert('请输入文字描述');
            return;
        }

        setLoading(true);
        setError(null);
        setGenerationStatus({
            sketch: 'done',
            character: 'active',
            model: 'pending'
        });
        setProgress(20);

        try {
            const blob = await (await fetch(sketchData)).blob();
            const file = new File([blob], 'sketch.png', { type: 'image/png' });

            const formData = new FormData();
            formData.append('sketch', file);
            formData.append('prompt', prompt);
            formData.append('creativity', creativity.toString());
            formData.append('geometry_detail', geometryDetail.toString());
            formData.append('texture_quality', textureQuality.toString());

            setProgress(40);

            const response = await fetch(`${API_URL}/generate`, {
                method: 'POST',
                body: formData,
            });

            setProgress(70);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `服务器错误：${response.status}`);
            }

            const data = await response.json();
            if (data.image_base64) {
                const imageUrl = `data:image/png;base64,${data.image_base64}`;
                setGeneratedImage(imageUrl);
                setGenerationStatus({
                    sketch: 'done',
                    character: 'done',
                    model: 'pending'
                });
                setProgress(100);
                setTimeout(() => setProgress(0), 2000);
            } else {
                throw new Error('后端未返回图片数据');
            }
        } catch (err) {
            console.error('生成失败:', err);
            setError(err.message);
            setGenerationStatus({
                sketch: 'done',
                character: 'error',
                model: 'pending'
            });
            setProgress(0);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload2D = () => {
        if (!generatedImage) {
            alert('没有可下载的图片，请先生成');
            return;
        }
        const link = document.createElement('a');
        link.download = '2d-character.png';
        link.href = generatedImage;
        link.click();
    };

    const downloadFile = async (url, filename) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const link = document.createElement('a');
            const objectUrl = URL.createObjectURL(blob);
            link.href = objectUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(objectUrl);
            return true;
        } catch (error) {
            console.error(`下载 ${filename} 失败:`, error);
            return false;
        }
    };

    const handleDownload3D = async () => {
        setIsDownloading(true);
        try {
            await downloadFile('/assets/3d-character.obj', '3d-character.obj');
            await downloadFile('/assets/3d-character.mtl', '3d-character.mtl');
            await downloadFile('/assets/3d-character.BMP', '3d-character.BMP');
            alert('3D 模型下载完成！');
        } catch (error) {
            console.error('下载失败:', error);
            alert('下载失败');
        } finally {
            setIsDownloading(false);
        }
    };

    const getTextureQualityText = (val) => {
        if (val >= 0.7) return '高';
        if (val >= 0.4) return '中';
        return '低';
    };

    const handleStyleClick = (style) => {
        setSelectedStyle(style);
        const stylePrompts = {
            '奇幻': 'fantasy character, magical, glowing elements, detailed armor, epic fantasy art style',
            '科幻': 'sci-fi character, cyberpunk, neon lights, futuristic armor, mecha details',
            '可爱': 'cute character, chibi style, big eyes, adorable, soft colors, kawaii',
            '写实': 'realistic character, detailed texture, natural lighting, PBR, photorealistic'
        };
        if (stylePrompts[style]) setPrompt(stylePrompts[style]);
    };

    const titleChars = '绘灵造物'.split('');
    const badgeChars = '✦ 绘影 · Spirit Brush ✦'.split('');
    const subtitleChars = '手绘草图 + 文字描述 → 2D角色 → 3D模型'.split('');

    return (
        <>
            {/* 欢迎页 */}
            {showWelcome && <WelcomeScreen onEnter={handleEnterApp} />}
            
            {/* 主应用 */}
            <div className="app" style={{ display: showWelcome ? 'none' : 'block' }}>
                {/* 引导提示 */}
                {showOnboarding && (
                    <OnboardingTooltip 
                        onComplete={handleOnboardingComplete}
                        onSkip={handleOnboardingSkip}
                    />
                )}
                
                <div className="main-content">
                    {/* 头部 */}
                    <div className="hero-section">
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
                        <p className="hero-subtitle">
                            {subtitleChars.map((char, i) => (
                                <span key={i} className="sub-wave-char" style={{ '--delay': i }}>
                                    {char}
                                </span>
                            ))}
                        </p>
                    </div>

                    {/* 上部双栏布局 */}
                    <div className="top-double-layout">
                        {/* 左侧：灵动画布卡片 */}
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
                                        <TextInput value={prompt} onChange={setPrompt} />
                                    </div>
                                    <button
                                        className="generate-button"
                                        onClick={handleGenerate}
                                        disabled={loading || !sketchData}
                                    >
                                        {loading ? '生成中...' : '开始生成 →'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 右侧：三个参数卡片 */}
                        <div className="params-col">
                            {/* 风格预设 */}
                            <div className="card">
                                <div className="card-header">
                                    风格预设
                                    <span>Presets</span>
                                </div>
                                <div className="card-content">
                                    <div className="style-grid">
                                        {['奇幻', '科幻', '可爱', '写实'].map(style => (
                                            <div
                                                key={style}
                                                className={`style-chip ${selectedStyle === style ? 'active' : ''}`}
                                                onClick={() => handleStyleClick(style)}
                                            >
                                                {style}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 高级参数 */}
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
                                </div>
                            </div>

                            {/* 生成状态 */}
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

                    {/* 下部双栏布局 */}
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
                                    </div>
                                    <div className="info-text">鼠标拖拽移动 | 按钮缩放</div>
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
                                        <Model3DPreview modelUrl={testModelUrl} loading={loading} />
                                    </div>
                                    <div className="info-text">鼠标拖拽旋转 · 滚轮缩放 · PBR 材质</div>
                                    <button
                                        className="download-btn"
                                        onClick={handleDownload3D}
                                        disabled={isDownloading || loading}
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
}

export default App;