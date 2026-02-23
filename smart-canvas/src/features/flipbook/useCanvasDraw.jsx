import { useEffect, useRef } from "react";

export function useCanvasDraw({
  inputRef,   // where pointer events happen (stage)
  targetRef,  // where we actually draw (raster)
  color,
  size,
  tool, // "pencil" | "eraser"
  enabled = true,
  onStrokeStart,
  onStrokeMove,
  onStrokeEnd,
}) {
  const downRef = useRef(false);
  const lastRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const inputCanvas = inputRef?.current;
    const targetCanvas = targetRef?.current;

    if (!inputCanvas || !targetCanvas || !enabled) return;

    const ctx = targetCanvas.getContext("2d");

    const getPos = (e) => {
      const rect = inputCanvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      // Map displayed CSS pixels into the canvas' internal CSS coordinate space.
      // This accounts for responsive scaling where rect.width may differ from the
      // logical CSS width used when the canvas backing store was created.
      const dpr = window.devicePixelRatio || 1;
      const cssWidth = inputCanvas.width / dpr;
      const cssHeight = inputCanvas.height / dpr;
      const x = (clientX - rect.left) * (cssWidth / rect.width);
      const y = (clientY - rect.top) * (cssHeight / rect.height);

      return { x, y };
    };

    const down = (e) => {
      if (!enabled) return;
      e.preventDefault();
      downRef.current = true;

      const p = getPos(e);
      lastRef.current = p;

      onStrokeStart?.(p);

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = color;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      onStrokeMove?.(p);
    };

    const move = (e) => {
      if (!downRef.current) return;
      e.preventDefault();

      const p = getPos(e);

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = size;

      if (tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = color;
      }

      ctx.beginPath();
      ctx.moveTo(lastRef.current.x, lastRef.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.restore();

      lastRef.current = p;
      onStrokeMove?.(p);
    };

    const up = (e) => {
      if (!downRef.current) return;
      e.preventDefault();
      downRef.current = false;
      onStrokeEnd?.();
    };

    // Mouse
    inputCanvas.addEventListener("mousedown", down);
    inputCanvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);

    // Touch
    inputCanvas.addEventListener("touchstart", down, { passive: false });
    inputCanvas.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up, { passive: false });

    return () => {
      inputCanvas.removeEventListener("mousedown", down);
      inputCanvas.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);

      inputCanvas.removeEventListener("touchstart", down);
      inputCanvas.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
  }, [inputRef, targetRef, color, size, tool, enabled, onStrokeStart, onStrokeMove, onStrokeEnd]);
}
