import React, { useRef, useState, useEffect } from "react";
import { detectIntent } from "./intentAI";
import { makeShape } from "./shapeFactory";

export default function AICanvasHost() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState([]);
  const [shapes, setShapes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  /* ---------------- SETUP ---------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = 900;
    canvas.height = 550;

    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#000";

    ctxRef.current = ctx;
    redraw([]);
  }, []);

  /* ---------------- HELPERS ---------------- */
  const getCursor = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const redraw = (allShapes) => {
    const ctx = ctxRef.current;
    ctx.clearRect(0, 0, 900, 550);

    allShapes.forEach((s) => {
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      s.points.forEach((p, i) => i && ctx.lineTo(p.x, p.y));
      ctx.stroke();

      if (s.id === selectedId) {
        ctx.strokeStyle = "blue";
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(s.bounds.minX, s.bounds.minY, s.bounds.w, s.bounds.h);
        ctx.setLineDash([]);
        ctx.strokeStyle = "#000";
      }
    });
  };

  const getBounds = (pts) => {
    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return { minX, minY, w: maxX - minX, h: maxY - minY };
  };

  const hitTest = (x, y) => {
    for (let i = shapes.length - 1; i >= 0; i--) {
      const b = shapes[i].bounds;
      if (x >= b.minX && x <= b.minX + b.w && y >= b.minY && y <= b.minY + b.h)
        return shapes[i];
    }
    return null;
  };

  /* ---------------- DRAW EVENTS ---------------- */
  const onDown = (e) => {
    const p = getCursor(e);
    const hit = hitTest(p.x, p.y);

    if (hit) {
      setSelectedId(hit.id);
      dragOffset.current = { x: p.x - hit.bounds.minX, y: p.y - hit.bounds.minY };
      return;
    }

    setSelectedId(null);
    setDrawing(true);
    setPoints([p]);

    ctxRef.current.beginPath();
    ctxRef.current.moveTo(p.x, p.y);
  };

  const onMove = (e) => {
    const p = getCursor(e);

    // Dragging shape
    if (selectedId) {
      setShapes(prev =>
        prev.map(s => {
          if (s.id !== selectedId) return s;
          const dx = p.x - dragOffset.current.x - s.bounds.minX;
          const dy = p.y - dragOffset.current.y - s.bounds.minY;
          const movedPts = s.points.map(pt => ({ x: pt.x + dx, y: pt.y + dy }));
          return { ...s, points: movedPts, bounds: getBounds(movedPts) };
        })
      );
      return;
    }

    // Drawing new stroke
    if (!drawing) return;
    setPoints(prev => [...prev, p]);
    ctxRef.current.lineTo(p.x, p.y);
    ctxRef.current.stroke();
  };

  const onUp = () => {
    if (!drawing) return;
    setDrawing(false);

    const intent = detectIntent(points);
    const perfectPts = makeShape(intent, points);
    const bounds = getBounds(perfectPts);

    const newShape = {
      id: Date.now(),
      type: intent,
      points: perfectPts,
      bounds,
    };

    const updated = [...shapes, newShape];
    setShapes(updated);
    redraw(updated);
    setPoints([]);
  };

  useEffect(() => redraw(shapes), [shapes, selectedId]);

  /* ---------------- UI ---------------- */
  return (
    <div style={{ padding: 20 }}>
      <h2>AI Smart Canvas – Movable Shapes</h2>
      <canvas
        ref={canvasRef}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        style={{ border: "2px solid black", background: "#fff" }}
      />
      <p>Draw shape → AI perfects it → Click & drag to move</p>
    </div>
  );
}
