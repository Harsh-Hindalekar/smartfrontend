import React, { useRef, useState, useEffect, useCallback } from "react";
import { detectIntent } from "./intentAI";
import { makeShape } from "./shapeFactory";

export default function AiDrawing() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const [elements, setElements] = useState([]);
  const elementsRef = useRef([]);
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const [tool, setTool] = useState("pencil"); // pencil | marker | highlighter | brush | eraser
  const [aiMode, setAiMode] = useState(true);
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(2);

  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState([]);

  const [selectedId, setSelectedId] = useState(null);

  // transform action snapshot
  const actionRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = 1000;
    canvas.height = 600;
    ctxRef.current = canvas.getContext("2d");
  }, []);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const getBoundsFromPoints = (pts) => {
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs),
      maxX = Math.max(...xs);
    const minY = Math.min(...ys),
      maxY = Math.max(...ys);
    const w = maxX - minX;
    const h = maxY - minY;
    return { minX, minY, w, h, cx: minX + w / 2, cy: minY + h / 2 };
  };

  const getBoundsForElement = (el) => {
    if (el.type === "image") {
      return {
        minX: el.cx - el.w / 2,
        minY: el.cy - el.h / 2,
        w: el.w,
        h: el.h,
        cx: el.cx,
        cy: el.cy,
      };
    }
    return getBoundsFromPoints(el.points);
  };

  const rotatePoint = (px, py, cx, cy, angle) => ({
    x: cx + (px - cx) * Math.cos(angle) - (py - cy) * Math.sin(angle),
    y: cy + (px - cx) * Math.sin(angle) + (py - cy) * Math.cos(angle),
  });

  const isInRotateHandle = (x, y, b) => Math.hypot(x - b.cx, y - (b.minY - 25)) < 10;
  const isInResizeHandle = (x, y, b) =>
    Math.abs(x - (b.minX + b.w)) < 10 && Math.abs(y - (b.minY + b.h)) < 10;

  const commit = useCallback((nextEls, snapshotForUndo) => {
    setHistory((h) => [...h, snapshotForUndo ?? elementsRef.current]);
    setRedoStack([]);
    setElements(nextEls);
  }, []);

  const undo = () => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setRedoStack((r) => [elementsRef.current, ...r]);
      setElements(prev);
      return h.slice(0, -1);
    });
  };

  const redo = () => {
    setRedoStack((r) => {
      if (!r.length) return r;
      const next = r[0];
      setHistory((h) => [...h, elementsRef.current]);
      setElements(next);
      return r.slice(1);
    });
  };

  const applyPen = (ctx, t, s) => {
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (t === "marker") {
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = s * 3;
    } else if (t === "highlighter") {
      ctx.globalAlpha = 0.2;
      ctx.lineWidth = s * 6;
    } else if (t === "brush") {
      ctx.shadowBlur = 4;
      ctx.lineWidth = s * 2.5;
    } else {
      ctx.lineWidth = s;
    }
  };

  const redraw = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.clearRect(0, 0, 1000, 600);

    elementsRef.current.forEach((el) => {
      ctx.save();

      if (el.type === "image") {
        ctx.translate(el.cx, el.cy);
        ctx.rotate(el.angle || 0);
        ctx.drawImage(el.img, -el.w / 2, -el.h / 2, el.w, el.h);
      } else {
        if (el.tool === "eraser") {
          ctx.globalCompositeOperation = "destination-out";
          ctx.lineWidth = el.size * 2;
        } else {
          ctx.globalCompositeOperation = "source-over";
          ctx.strokeStyle = el.color;
          applyPen(ctx, el.tool, el.size);
        }

        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) ctx.lineTo(el.points[i].x, el.points[i].y);
        ctx.stroke();
      }

      ctx.restore();

      // selection UI
      if (el.id === selectedId) {
        const b = getBoundsForElement(el);

        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = "blue";
        ctx.strokeRect(b.minX, b.minY, b.w, b.h);
        ctx.setLineDash([]);

        // resize handle
        ctx.fillStyle = "white";
        ctx.strokeStyle = "blue";
        ctx.fillRect(b.minX + b.w - 6, b.minY + b.h - 6, 12, 12);
        ctx.strokeRect(b.minX + b.w - 6, b.minY + b.h - 6, 12, 12);

        // rotate handle
        ctx.beginPath();
        ctx.moveTo(b.cx, b.minY);
        ctx.lineTo(b.cx, b.minY - 25);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(b.cx, b.minY - 25, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      }
    });
  }, [selectedId]);

  useEffect(() => {
    redraw();
  }, [elements, selectedId, redraw]);

  const hitTest = (x, y) => {
    for (let i = elementsRef.current.length - 1; i >= 0; i--) {
      const el = elementsRef.current[i];
      const b = getBoundsForElement(el);
      if (x >= b.minX && x <= b.minX + b.w && y >= b.minY && y <= b.minY + b.h) return el;
    }
    return null;
  };

  // click OR double click selects
  const selectAt = (x, y) => {
    const hit = hitTest(x, y);
    if (!hit) {
      setSelectedId(null);
      return null;
    }
    setSelectedId(hit.id);
    return hit;
  };

  const onDown = (e) => {
    const p = getPos(e);

    // if user is in drawing tools, we still allow selection by clicking when NOT currently drawing
    // if clicked on a selected thing -> start transform, else if clicked on any thing -> select it (and allow move)
    if (!drawing) {
      const hit = hitTest(p.x, p.y);

      // if clicked empty and not drawing: deselect
      if (!hit && tool !== "eraser" && tool !== "pencil" && tool !== "marker" && tool !== "highlighter" && tool !== "brush") {
        setSelectedId(null);
      }

      // Start transform only if something is selected or hit
      if (hit) {
        const willSelectId = hit.id;
        setSelectedId(willSelectId);

        const b = getBoundsForElement(hit);
        const snapshot = elementsRef.current;

        // rotate handle
        if (isInRotateHandle(p.x, p.y, b)) {
          actionRef.current = {
            kind: "rotate",
            snapshot,
            startPointer: p,
            cx: b.cx,
            cy: b.cy,
            startAngle: Math.atan2(p.y - b.cy, p.x - b.cx),
            originalPoints: hit.type === "stroke" ? hit.points.map((pt) => ({ ...pt })) : null,
            originalImage: hit.type === "image" ? { cx: hit.cx, cy: hit.cy, w: hit.w, h: hit.h, angle: hit.angle || 0 } : null,
          };
          return;
        }

        // resize handle
        if (isInResizeHandle(p.x, p.y, b)) {
          actionRef.current = {
            kind: "resize",
            snapshot,
            startPointer: p,
            baseBounds: { ...b },
            cx: b.cx,
            cy: b.cy,
            originalPoints: hit.type === "stroke" ? hit.points.map((pt) => ({ ...pt })) : null,
            originalImage: hit.type === "image" ? { cx: hit.cx, cy: hit.cy, w: hit.w, h: hit.h, angle: hit.angle || 0 } : null,
          };
          return;
        }

        // normal move (click and drag on element)
        actionRef.current = {
          kind: "move",
          snapshot,
          startPointer: p,
          originalPoints: hit.type === "stroke" ? hit.points.map((pt) => ({ ...pt })) : null,
          originalImage: hit.type === "image" ? { cx: hit.cx, cy: hit.cy, w: hit.w, h: hit.h, angle: hit.angle || 0 } : null,
        };
        return;
      }
    }

    // if we are on pen tools, start drawing
    setDrawing(true);
    setPoints([p]);

    const ctx = ctxRef.current;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const onMove = (e) => {
    const p = getPos(e);

    // Transform if dragging an element
    if (actionRef.current && selectedId) {
      const act = actionRef.current;

      setElements((prev) =>
        prev.map((el) => {
          if (el.id !== selectedId) return el;

          if (act.kind === "move") {
            const dx = p.x - act.startPointer.x;
            const dy = p.y - act.startPointer.y;

            if (el.type === "image") {
              return { ...el, cx: el.cx + dx, cy: el.cy + dy };
            }

            const moved = el.points.map((pt) => ({ x: pt.x + dx, y: pt.y + dy }));
            // update pointer continuously for smooth move
            act.startPointer = p;
            return { ...el, points: moved };
          }

          if (act.kind === "resize") {
            const bb = act.baseBounds;
            const safeW = Math.max(bb.w, 1);
            const safeH = Math.max(bb.h, 1);

            const scaleX = (p.x - bb.minX) / safeW;
            const scaleY = (p.y - bb.minY) / safeH;

            const sx = Math.max(0.05, Math.min(scaleX, 10));
            const sy = Math.max(0.05, Math.min(scaleY, 10));

            if (el.type === "image") {
              return { ...el, w: Math.max(10, bb.w * sx), h: Math.max(10, bb.h * sy) };
            }

            // IMPORTANT: use originalPoints so resize is stable (not cumulative)
            const orig = act.originalPoints;
            const scaled = orig.map((pt) => ({
              x: bb.minX + (pt.x - bb.minX) * sx,
              y: bb.minY + (pt.y - bb.minY) * sy,
            }));
            return { ...el, points: scaled };
          }

          if (act.kind === "rotate") {
            const angNow = Math.atan2(p.y - act.cy, p.x - act.cx);
            const delta = angNow - act.startAngle;

            if (el.type === "image") {
              // stable rotate (not cumulative drift)
              const base = act.originalImage;
              return { ...el, angle: (base.angle || 0) + (angNow - Math.atan2(act.startPointer.y - act.cy, act.startPointer.x - act.cx)) };
            }

            // IMPORTANT: use originalPoints so rotation is stable
            const orig = act.originalPoints;
            const rotated = orig.map((pt) => rotatePoint(pt.x, pt.y, act.cx, act.cy, delta));
            return { ...el, points: rotated };
          }

          return el;
        })
      );

      return;
    }

    // Draw stroke
    if (!drawing) return;

    const ctx = ctxRef.current;

    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = size * 2;
      ctx.lineCap = "round";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      applyPen(ctx, tool, size);
    }

    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setPoints((prev) => [...prev, p]);
  };

  const onUp = () => {
    // finish transform -> save history
    if (actionRef.current) {
      const snap = actionRef.current.snapshot;
      actionRef.current = null;
      commit(elementsRef.current, snap);
      return;
    }

    // finish stroke
    ctxRef.current.globalCompositeOperation = "source-over";
    if (!drawing) return;

    setDrawing(false);

    let finalPts = points;

    if (aiMode && tool !== "eraser") {
      const shape = detectIntent(points);
      finalPts = makeShape(shape, points);
    }

    const newEl = {
      id: Date.now(),
      type: "stroke",
      points: finalPts,
      color,
      tool,
      size,
    };

    commit([...elementsRef.current, newEl]);
    setPoints([]);
  };

  const onImportImage = (file) => {
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      const w = Math.min(500, img.width);
      const h = (img.height / img.width) * w;

      const newEl = {
        id: Date.now(),
        type: "image",
        img,
        cx: 500,
        cy: 300,
        w,
        h,
        angle: 0,
      };

      commit([...elementsRef.current, newEl]);
    };

    img.src = URL.createObjectURL(file);
  };

  const savePNG = () => {
    const canvas = canvasRef.current;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "canvas.png";
    a.click();
  };

  // click to select (without needing select tool)
  const onClick = (e) => {
    // don't interfere while drawing
    if (drawing) return;
    const p = getPos(e);
    selectAt(p.x, p.y);
  };

  // double click also selects (as you asked)
  const onDoubleClick = (e) => {
    const p = getPos(e);
    selectAt(p.x, p.y);
  };

  const cursor = drawing ? "crosshair" : selectedId ? "move" : "default";

  return (
    <div style={{ padding: 10 }}>
      <h2>AI Smart Drawing Canvas</h2>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
        <select value={tool} onChange={(e) => setTool(e.target.value)}>
          <option value="pencil">Pencil</option>
          <option value="marker">Marker</option>
          <option value="highlighter">Highlighter</option>
          <option value="brush">Brush</option>
          <option value="eraser">Eraser</option>
        </select>

        <button onClick={() => setAiMode((v) => !v)}>AI {aiMode ? "ON" : "OFF"}</button>
        <button onClick={undo}>Undo</button>
        <button onClick={redo}>Redo</button>
        <button
          onClick={() => {
            commit([]);
            setSelectedId(null);
          }}
        >
          Clear
        </button>

        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        <input type="range" min="1" max="30" value={size} onChange={(e) => setSize(+e.target.value)} />

        <label style={{ border: "1px solid #999", padding: "4px 8px", cursor: "pointer" }}>
          Import Image
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => onImportImage(e.target.files?.[0])}
          />
        </label>

        <button onClick={savePNG}>Save PNG</button>
      </div>

      <canvas
        ref={canvasRef}
        style={{ border: "2px solid black", cursor }}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      />

      <div style={{ marginTop: 8, fontSize: 13, color: "#333" }}>
        <b>Selection:</b> Click / Double-click an item to select → drag to move. Bottom-right square = resize. Top circle = rotate.
      </div>
    </div>
  );
}
