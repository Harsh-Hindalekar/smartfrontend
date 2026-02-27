import React from 'react';

export default function LeftTools({ tool, setTool }) {
  return (
    <div className="ai-sidebar-left">
      <div className="tool-group-label">Tools</div>

      {[
        ["pencil", "Pencil"],
        ["marker", "Marker"],
        ["highlighter", "Highlighter"],
        ["brush", "Brush"],
        ["eraser", "Eraser"],
        ["text", "Text"],
      ].map(([k, label]) => (
        <button key={k} onClick={() => setTool(k)} className={`tool-btn ${tool === k ? 'active' : ''}`}>{label}</button>
      ))}

      <div className="tool-group-label">Tip</div>
      <div style={{ fontSize: 12, color: "#777", lineHeight: 1.35 }}>
        Click object to select.
        <br />
        Drag to move.
        <br />
        Square = resize.
        <br />
        Circle = rotate.
      </div>
    </div>
  );
}
