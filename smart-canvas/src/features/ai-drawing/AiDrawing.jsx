import React, { useRef, useState, useEffect } from "react";
import { detectIntent } from "./intentAI";
import { makeShape } from "./shapeFactory";

export default function AiDrawing() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState([]);
  const [strokes, setStrokes] = useState([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = 900;
    canvas.height = 500;

    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctxRef.current = ctx;
  }, []);

  const getPos = e => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const down = e => {
    setDrawing(true);
    const p = getPos(e);
    setPoints([p]);
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(p.x, p.y);
  };

  const move = e => {
    if (!drawing) return;
    const p = getPos(e);
    setPoints(prev => [...prev, p]);
    ctxRef.current.lineTo(p.x, p.y);
    ctxRef.current.stroke();
  };

  const up = () => {
    if (!drawing) return;
    setDrawing(false);

    const intent = detectIntent(points);
    const finalShape = makeShape(intent, points);

    const newStrokes = [...strokes, finalShape];
    setStrokes(newStrokes);

    redraw(newStrokes);
    setPoints([]);
  };

  const redraw = all => {
    const ctx = ctxRef.current;
    ctx.clearRect(0, 0, 900, 500);

    all.forEach(s => {
      ctx.beginPath();
      ctx.moveTo(s[0].x, s[0].y);
      s.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    });
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={down}
      onMouseMove={move}
      onMouseUp={up}
      onMouseLeave={up}
      style={{ border: "2px solid black" }}
    />
  );
}
