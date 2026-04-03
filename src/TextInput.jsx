import React from 'react';

const TextInput = ({ value, onChange }) => {
  return (
    <div className="text-input-section">
      <h3>Text Description</h3>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe your character, e.g., a knight with red cloak, long sword, flowing hair"
        rows={3}
        className="text-input"
      />
    </div>
  );
};

export default TextInput;