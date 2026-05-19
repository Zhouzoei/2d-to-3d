import React from 'react';

const TextInput = ({ value, onChange, selectedStyle, getStyleLabel }) => {
  return (
    <div className="prompt-input-wrapper">
      {selectedStyle && (
        <span className="prompt-style-badge">{getStyleLabel(selectedStyle)}</span>
      )}
      <textarea
        className="prompt-input"
        rows={2}
        placeholder="描述你的角色，例如：'持剑的精灵弓箭手，发光铠甲，赛博朋克风格，精致五官，动态姿势'"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

export default TextInput;
