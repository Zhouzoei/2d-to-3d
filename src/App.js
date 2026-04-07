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
    setTimeout(() => {
      setLoading(false);
      alert('演示模式：右侧预览区已展示示例图片和3D模型');
    }, 1000);
  };

  // 下载文件辅助函数
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

  // 下载 2D 图片
  const handleDownload2D = () => {
    const link = document.createElement('a');
    link.download = '2d-character.png';
    link.href = testImageUrl;
    link.click();
  };

  // 下载整个模型
  const handleDownloadModel = async () => {
    setIsDownloading(true);
    
    try {
      const basePath = '/assets/';
      const objFileName = '3d-character.obj';
      const mtlFileName = '3d-character.mtl';
      const textureFileName = '3d-character.BMP';
      
      await downloadFile(basePath + objFileName, objFileName);
      await downloadFile(basePath + mtlFileName, mtlFileName);
      await downloadFile(basePath + textureFileName, textureFileName);
      
      alert('3D 模型下载完成！\n包含文件：\n- ' + objFileName + '\n- ' + mtlFileName + '\n- ' + textureFileName);
    } catch (error) {
      console.error('下载失败:', error);
      alert('下载失败，请检查控制台查看详细错误');
    } finally {
      setIsDownloading(false);
    }
  };

  // 只下载 OBJ
  const handleDownloadOBJOnly = async () => {
    setIsDownloading(true);
    
    try {
      await downloadFile('/assets/3d-character.obj', '3d-character.obj');
      alert('OBJ 文件下载完成！');
    } catch (error) {
      console.error('下载失败:', error);
      alert('下载失败');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Sketch to 3D</h1>
        <p>Draw + Describe → 2D Character → 3D Model</p>
      </header>
      
      <div className="main-container">
        {/* 左侧：输入区 */}
        <div className="input-card">
          <SketchCanvasNative onSketchChange={handleSketchChange} />
          <TextInput value={prompt} onChange={setPrompt} />
          <button 
            className="generate-btn" 
            onClick={handleGenerate} 
            disabled={loading || !sketchData}
          >
            {loading ? 'Generating...' : 'Generate'}
          </button>
        </div>

        {/* 右侧：输出区 */}
        <div className="output-card">
          {/* 2D 预览区域 */}
          <div className="preview-section">
            <div className="preview-header">
              <h3>2D Preview</h3>
              <button className="download-btn" onClick={handleDownload2D}>
                Download
              </button>
            </div>
            <ImagePreview imageUrl={testImageUrl} loading={false} />
          </div>
          
          {/* 3D 预览区域 */}
          <div className="preview-section" style={{ height: '340px' }}>
            <div className="preview-header">
              <h3>3D Preview</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="download-btn" 
                  onClick={handleDownloadOBJOnly}
                  disabled={isDownloading}
                >
                  {isDownloading ? '下载中...' : 'Download OBJ'}
                </button>
                <button 
                  className="download-btn" 
                  onClick={handleDownloadModel}
                  disabled={isDownloading}
                  style={{ background: isDownloading ? '#cbd5e1' : '#10b981', color: isDownloading ? '#6c7a89' : 'white' }}
                >
                  {isDownloading ? '下载中...' : 'Download All'}
                </button>
              </div>
            </div>
            <Model3DPreview modelUrl={testModelUrl} loading={false} />
          </div>
        </div>
      </div>

      <footer className="footer">
        <p>演示模式：右侧展示示例图片和3D模型 | 鼠标拖拽旋转/缩放模型 | 贴图/白膜/线框模式切换</p>
      </footer>
    </div>
  );
}

export default App;