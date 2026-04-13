import React, { useState } from 'react';
import SketchCanvasNative from './SketchCanvasNative';
import TextInput from './TextInput';
import ImagePreview from './ImagePreview';
import Model3DPreview from './Model3DPreview';
import './App.css';

function App() {
  const [sketchData, setSketchData] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('奇幻');
  const [creativity, setCreativity] = useState(0.7);
  const [geometryDetail, setGeometryDetail] = useState(0.8);
  const [textureQuality, setTextureQuality] = useState(0.9);
  const [generationStatus, setGenerationStatus] = useState({
    sketch: 'done',
    character: 'active',
    model: 'pending'
  });
  const [progress, setProgress] = useState(35);
  
  const testImageUrl = '/assets/2d-character.png';
  const testModelUrl = '/assets/3d-character.obj';

  const handleSketchChange = (dataURL) => {
    setSketchData(dataURL);
  };

  const handleGenerate = () => {
    if (!sketchData) {
      alert('请先绘制草图');
      return;
    }
    setLoading(true);
    setGenerationStatus({ sketch: 'done', character: 'active', model: 'pending' });
    setProgress(35);
    
    setTimeout(() => {
      setLoading(false);
      setGenerationStatus({ sketch: 'done', character: 'done', model: 'active' });
      setProgress(100);
      alert('演示模式：右侧预览区已展示示例图片和3D模型');
    }, 2000);
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

  const handleDownload2D = () => {
    const link = document.createElement('a');
    link.download = '2d-character.png';
    link.href = testImageUrl;
    link.click();
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
  };

  // 拆分标题字符用于动画
  const titleChars = '绘灵造物'.split('');
  const badgeChars = '✦ 绘影 · Spirit Brush ✦'.split('');
  const subtitleChars = '手绘草图 + 文字描述 → 2D角色 → 3D模型'.split('');

  return (
    <div className="app">
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

        {/* 上部双栏布局：左侧画布 + 右侧三个卡片 */}
        <div className="top-double-layout">
          {/* 左侧：灵动画布卡片（包含文字描述 + 生成按钮） */}
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
                
                {/* 文字描述 - 放在工具栏下方 */}
                <div className="prompt-wrapper">
                  <TextInput value={prompt} onChange={setPrompt} />
                </div>
                
                <button 
                  className="generate-button" 
                  onClick={handleGenerate} 
                  disabled={loading || !sketchData}
                >
                  {loading ? '生成中... ' : '开始生成'}
                </button>
              </div>
            </div>
          </div>

          {/* 右侧：三个参数卡片 */}
          <div className="params-col">
            {/* 风格预设卡片 */}
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

            {/* 高级参数卡片 */}
            <div className="card">
              <div className="card-header">
                高级参数
                <span>Fine-tune</span>
              </div>
              <div className="card-content">
                <div className="param-group">
                  <div className="param-row">
                    <span className="param-label">创意度</span>
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

            {/* 生成状态卡片 */}
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
                  <div className={`status-dot ${generationStatus.character === 'active' ? 'active' : generationStatus.character === 'done' ? 'done' : ''}`}></div>
                  <div className="status-text">
                    <span className="title">2D 角色生成</span>
                    <div>{generationStatus.character === 'active' ? 'Stable Diffusion 推理中...' : generationStatus.character === 'done' ? '生成完成' : '等待中'}</div>
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
              </div>
            </div>
          </div>
        </div>

        {/* 下部双栏布局：2D预览 + 3D预览 */}
        <div className="bottom-double-layout">
          {/* 左侧：2D预览 */}
          <div className="gallery-left">
            <div className="card preview-card-full">
              <div className="card-header">
                灵韵画卷
                <span>2D Artwork</span>
              </div>
              <div className="card-content preview-card-content">
                <div className="preview-area">
                  <ImagePreview imageUrl={testImageUrl} loading={loading} />
                </div>
                <div className="info-text">鼠标拖拽移动 | 按钮缩放</div>
                <button className="download-btn" onClick={handleDownload2D} disabled={loading}>
                  下载 2D 图片
                </button>
              </div>
            </div>
          </div>

          {/* 右侧：3D预览 */}
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
                  {isDownloading ? '下载中...' : '下载 3D 模型'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="footer-note">✦ 绘影 · 绘灵造物：基于草图的2D/3D角色生成工具 ✦</div>
      </div>
    </div>
  );
}

export default App;