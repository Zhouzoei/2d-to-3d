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
  
  const testImageUrl = '/assets/2d-character.png';
  // 确保能加载的在线测试模型
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
      alert('演示模式：右侧预览区已展示示例图片和GLB模型');
    }, 1000);
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
          <div className="preview-section">
            <ImagePreview imageUrl={testImageUrl} loading={false} />
          </div>
          
          {/* 关键修复：外层强制给定 320px 高度，确保 Three.js 初始化时不会读取到 0 */}
          <div className="preview-section" style={{ height: '340px' }}>
            <Model3DPreview modelUrl={testModelUrl} loading={false} />
          </div>
        </div>
      </div>

      <footer className="footer">
        <p>演示模式：右侧展示示例图片和GLB 3D模型 | 鼠标拖拽旋转/缩放模型</p>
      </footer>
    </div>
  );
}

export default App;
