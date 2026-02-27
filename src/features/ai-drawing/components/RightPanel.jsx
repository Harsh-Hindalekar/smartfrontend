import React from 'react';

export default function RightPanel({ color, setColor, size, setSize }) {
  return (
    <div className="ai-sidebar-right">
      <div className="tool-group-label">Settings</div>

      <div>
        <div style={{ fontSize: 12, marginBottom: 6 }}>Color</div>
        <input className="color-picker" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
      </div>

      <div>
        <div style={{ fontSize: 12, marginBottom: 6 }}>Size</div>
        <input type="range" min="1" max="30" value={size} onChange={(e) => setSize(+e.target.value)} />
        <div style={{ fontSize: 12, color: "#666" }}>{size}px</div>
      </div>

      <div>
        <div style={{ fontSize: 12, marginBottom: 6 }}>AI Mode</div>
        <div style={{ fontSize: 12, color: "#666", lineHeight: 1.35 }}>
          AI affects <b>shapes</b> when drawing with pen tools.
          <br />
          Eraser/Text are not AI.
        </div>
      </div>

      <div style={{ fontSize: 12, color: "#666", marginTop: 12 }}>
        Shortcuts:
        <br />
        Ctrl+Z / Ctrl+Y
        <br />
        Delete to remove
        <br />
        Enter to finish text
      </div>
    </div>
  );
}
