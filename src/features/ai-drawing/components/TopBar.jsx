import React from 'react';

export default function TopBar({ undo, redo, aiMode, setAiMode, bringFront, sendBack, deleteSelected, onImportImage, savePNG, onClear, selectedId }) {
  return (
    <div className="ai-topbar">
      <div className="ai-brand">SmartCanvas</div>

      <button className={`ai-nav-btn`} onClick={undo} aria-label="Undo">Undo</button>
      <button className={`ai-nav-btn`} onClick={redo} aria-label="Redo">Redo</button>

      <div className="ai-divider" />

      <button className={`ai-nav-btn ${aiMode ? 'ai-active-pill' : ''}`} onClick={() => setAiMode((v) => !v)}>AI {aiMode ? "ON" : "OFF"}</button>

      <div className="ai-spacer" />

      <button className="ai-nav-btn" onClick={bringFront} disabled={!selectedId}>Bring Front</button>
      <button className="ai-nav-btn" onClick={sendBack} disabled={!selectedId}>Send Back</button>
      <button className="ai-nav-btn" onClick={deleteSelected} disabled={!selectedId}>Delete</button>

      <div style={{ width: 8 }} />

      <label className="ai-nav-btn" style={{ cursor: 'pointer' }}>
        Import Image
        <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => onImportImage(e.target.files?.[0])} />
      </label>

      <button className="ai-nav-btn ai-primary" onClick={savePNG}>Save PNG</button>
      <button className="ai-nav-btn ai-danger" onClick={onClear}>Clear</button>
    </div>
  );
}
