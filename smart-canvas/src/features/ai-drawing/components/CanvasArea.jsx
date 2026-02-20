import React from 'react';

export default function CanvasArea({ canvasRef, cursor, onDown, onMove, onUp, onClick, onDoubleClick, textEditor, commitTextEditor, setTextEditor }) {
  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        className="main-canvas"
        style={{ cursor }}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      />

      {textEditor && (
        <textarea
          className="canvas-text-editor"
          autoFocus
          value={textEditor.value}
          onChange={(e) => setTextEditor((t) => ({ ...t, value: e.target.value }))}
          onBlur={commitTextEditor}
          // textEditor.x/y are CSS coordinates; canvas uses DPR transform so keep CSS positions
          style={{ left: textEditor.x, top: textEditor.y - (textEditor.fontSize || 28), fontSize: textEditor.fontSize || 28, fontFamily: textEditor.fontFamily || 'Arial', color: textEditor.color || '#000' }}
          placeholder="Type here..."
        />
      )}
    </div>
  );
}
