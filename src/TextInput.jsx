import React from 'react';

const TextInput = ({ 
    positivePrompt, 
    negativePrompt, 
    onChangePositive, 
    onChangeNegative,
    selectedStyle, 
    getStyleLabel
}) => {
  return (
    <div className="prompt-input-wrapper">
      {/* 正向提示词 */}
      <div className="prompt-section">
        <label className="prompt-label">正向提示词</label>
        {selectedStyle && (
          <span className="prompt-style-badge">{getStyleLabel(selectedStyle)}</span>
        )}
        <textarea
          className="prompt-input positive"
          rows={2}
          placeholder="描述你想要的内容，例如：'持剑的精灵弓箭手，发光铠甲，赛博朋克风格，精致五官，动态姿势'"
          value={positivePrompt}
          onChange={(e) => onChangePositive(e.target.value)}
        />
      </div>
      
      {/* 负向提示词 */}
      <div className="prompt-section">
        <label className="prompt-label">负向提示词</label>
        <textarea
          className="prompt-input negative"
          rows={2}
          placeholder="描述你不想要的内容，例如：'模糊，低质量，变形，多余肢体，水印'"
          value={negativePrompt}
          onChange={(e) => onChangeNegative(e.target.value)}
        />
      </div>
    </div>
  );
};

export default TextInput;