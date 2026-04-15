import React from 'react';

const TextInput = ({ value, onChange }) => {
  return (
    <textarea
      className="prompt-input"
      rows={2}
      placeholder="描述你的角色，例如：'持剑的精灵弓箭手，发光铠甲，赛博朋克风格，精致五官，动态姿势'"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};

export default TextInput;