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

      {textEditor && (() => {
        const canvas = canvasRef.current;
        let cssLeft = textEditor.x;
        let cssTop = textEditor.y - (textEditor.fontSize || 28);
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const scaleX = rect.width / canvas.width || 1;
          const scaleY = rect.height / canvas.height || 1;
          cssLeft = textEditor.x * scaleX;
          cssTop = textEditor.y * scaleY - ((textEditor.fontSize || 28) * scaleY);
        }

        return (
          <textarea
            className="canvas-text-editor"
            autoFocus
            value={textEditor.value}
            onChange={(e) => setTextEditor((t) => ({ ...t, value: e.target.value }))}
            onBlur={commitTextEditor}
            style={{ left: cssLeft, top: cssTop, fontSize: textEditor.fontSize || 28, fontFamily: textEditor.fontFamily || 'Arial', color: textEditor.color || '#000' }}
            placeholder="Type here..."
          />
        );
      })()}
    </div>
  );
}
