import React, { useRef, useState, useEffect } from "react";
import { detectIntent } from "./intentAI";
import { makeShape } from "./shapeFactory";

export default function AiDrawing() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const CANVAS_W = 1000;
  const CANVAS_H = 600;

  const [elements, setElements] = useState([]);
  const elementsRef = useRef([]);
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const [tool, setTool] = useState("pencil");
  // pencil | marker | highlighter | brush | eraser

  const [aiMode, setAiMode] = useState(true);
  const [color, setColor] = useState("#000");
  const [size, setSize] = useState(2);

  const [drawing, setDrawing] = useState(false);
  const drawingRef = useRef(false);
  useEffect(() => {
    drawingRef.current = drawing;
  }, [drawing]);

  const [points, setPoints] = useState([]);
  const pointsRef = useRef([]);
  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  const [selectedId, setSelectedId] = useState(null);
  const selectedIdRef = useRef(null);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // actionRef stores transform state (move/resize/rotate)
  const actionRef = useRef(null);

  /* ---------------- SETUP ---------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    const ctx = canvas.getContext("2d");
    ctxRef.current = ctx;

    redraw(elementsRef.current, selectedIdRef.current);
  }, []);

  /* ---------------- UTIL ---------------- */
  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const getBoundsFromPoints = (pts) => {
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return {
      minX,
      minY,
      w: maxX - minX,
      h: maxY - minY,
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
    };
  };

  const getBoundsForElement = (el) => {
    if (!el) return null;
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
    if (el.bounds) return el.bounds;
    if (el.points?.length) return getBoundsFromPoints(el.points);
    return null;
  };

  const isPointInBounds = (x, y, b, pad = 6) => {
    if (!b) return false;
    return (
      x >= b.minX - pad &&
      x <= b.minX + b.w + pad &&
      y >= b.minY - pad &&
      y <= b.minY + b.h + pad
    );
  };

  const rotatePoint = (x, y, cx, cy, a) => {
    const dx = x - cx;
    const dy = y - cy;
    return {
      x: cx + dx * Math.cos(a) - dy * Math.sin(a),
      y: cy + dx * Math.sin(a) + dy * Math.cos(a),
    };
  };

  /* ---------------- HISTORY ---------------- */
  // CHANGED: commit also updates ref immediately so transforms don't desync
  const commit = (newEls, snapshotBefore = elementsRef.current) => {
    elementsRef.current = newEls;
    setHistory((h) => [...h, snapshotBefore]);
    setRedoStack([]);
    setElements(newEls);
  };

  const undo = () => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setRedoStack((r) => [elementsRef.current, ...r]);
      elementsRef.current = prev;
      setElements(prev);
      return h.slice(0, -1);
    });
  };

  const redo = () => {
    setRedoStack((r) => {
      if (!r.length) return r;
      const next = r[0];
      setHistory((h) => [...h, elementsRef.current]);
      elementsRef.current = next;
      setElements(next);
      return r.slice(1);
    });
  };

  /* ---------------- PENS ---------------- */
  const applyPen = (ctx, t, s) => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    if (t === "marker") {
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = s * 3;
    } else if (t === "highlighter") {
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = s * 6;
    } else if (t === "brush") {
      ctx.shadowBlur = 6;
      ctx.lineWidth = s * 2.5;
    } else {
      ctx.lineWidth = s; // pencil
    }
  };

  /* ---------------- SELECTION HANDLES ---------------- */
  const getHandleRects = (b) => {
    const s = 10;
    return {
      resize: {
        x: b.minX + b.w - s / 2,
        y: b.minY + b.h - s / 2,
        w: s,
        h: s,
      },
      rotate: {
        x: b.cx,
        y: b.minY - 24,
        r: 8,
      },
    };
  };

  const isInResizeHandle = (x, y, b) => {
    const { resize } = getHandleRects(b);
    return (
      x >= resize.x &&
      x <= resize.x + resize.w &&
      y >= resize.y &&
      y <= resize.y + resize.h
    );
  };

  const isInRotateHandle = (x, y, b) => {
    const { rotate } = getHandleRects(b);
    return Math.hypot(x - rotate.x, y - rotate.y) <= rotate.r + 2;
  };

  /* ---------------- HIT TEST ---------------- */
  const hitTest = (x, y) => {
    const list = elementsRef.current;
    for (let i = list.length - 1; i >= 0; i--) {
      const el = list[i];
      const b = getBoundsForElement(el);
      if (b && isPointInBounds(x, y, b)) return el;
    }
    return null;
  };

  /* ---------------- DRAW ---------------- */
  const redraw = (all, selId) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    for (const el of all) {
      ctx.save();

      if (el.type === "image") {
        const a = el.angle || 0;
        ctx.translate(el.cx, el.cy);
        ctx.rotate(a);
        ctx.drawImage(el.img, -el.w / 2, -el.h / 2, el.w, el.h);
        ctx.restore();
      } else {
        if (!el.points || el.points.length < 2) {
          ctx.restore();
          continue;
        }

        if (el.tool === "eraser") {
          // CHANGED: always use destination-out on redraw so it really erases
          ctx.globalCompositeOperation = "destination-out";
          ctx.strokeStyle = "rgba(0,0,0,1)";
          ctx.lineWidth = (el.size || 2) * 2;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
        } else {
          ctx.globalCompositeOperation = "source-over";
          ctx.strokeStyle = el.color || "#000";
          applyPen(ctx, el.tool || "pencil", el.size || 2);
        }

        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // selection box + handles
      if (el.id === selId) {
        const b = getBoundsForElement(el);
        if (b) {
          ctx.save();
          ctx.setLineDash([6, 6]);
          ctx.strokeStyle = "#2563eb";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(b.minX, b.minY, b.w, b.h);
          ctx.setLineDash([]);

          const { resize, rotate } = getHandleRects(b);

          // resize handle
          ctx.fillStyle = "#2563eb";
          ctx.fillRect(resize.x, resize.y, resize.w, resize.h);

          // rotate handle
          ctx.beginPath();
          ctx.arc(rotate.x, rotate.y, rotate.r, 0, Math.PI * 2);
          ctx.fill();

          // connector line
          ctx.beginPath();
          ctx.moveTo(b.cx, b.minY);
          ctx.lineTo(rotate.x, rotate.y);
          ctx.strokeStyle = "#2563eb";
          ctx.stroke();

          ctx.restore();
        }
      }
    }
  };

  useEffect(() => {
    redraw(elements, selectedId);
  }, [elements, selectedId]);

  /* ---------------- MOUSE EVENTS ---------------- */
  const onDown = (e) => {
    const p = getPos(e);

    // Click on element = auto select + move/resize/rotate
    const hit = hitTest(p.x, p.y);
    if (hit) {
      setSelectedId(hit.id);

      const b = getBoundsForElement(hit);

      // ROTATE
      if (b && isInRotateHandle(p.x, p.y, b)) {
        actionRef.current = {
          id: hit.id,
          kind: "rotate",
          cx: b.cx,
          cy: b.cy,
          startAngle: Math.atan2(p.y - b.cy, p.x - b.cx),
          originalPoints:
            hit.type === "stroke" ? hit.points.map((pt) => ({ ...pt })) : null,
          originalImage:
            hit.type === "image"
              ? { cx: hit.cx, cy: hit.cy, w: hit.w, h: hit.h, angle: hit.angle || 0 }
              : null,
          snapshot: elementsRef.current,
        };
        return;
      }

      // RESIZE
      if (b && isInResizeHandle(p.x, p.y, b)) {
        actionRef.current = {
          id: hit.id,
          kind: "resize",
          baseBounds: { ...b },
          originalPoints:
            hit.type === "stroke" ? hit.points.map((pt) => ({ ...pt })) : null,
          originalImage:
            hit.type === "image"
              ? { cx: hit.cx, cy: hit.cy, w: hit.w, h: hit.h, angle: hit.angle || 0 }
              : null,
          snapshot: elementsRef.current,
        };
        return;
      }

      // MOVE
      actionRef.current = {
        id: hit.id,
        kind: "move",
        lastPointer: p,
        snapshot: elementsRef.current,
      };
      return;
    }

    // Empty click: deselect & start drawing
    setSelectedId(null);
    actionRef.current = null;

    setDrawing(true);
    setPoints([p]);

    const ctx = ctxRef.current;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const onMove = (e) => {
    const p = getPos(e);

    // TRANSFORM
    if (actionRef.current) {
      const act = actionRef.current;

      setElements((prev) => {
        const next = prev.map((el) => {
          if (el.id !== act.id) return el;

          // MOVE
          if (act.kind === "move") {
            const dx = p.x - act.lastPointer.x;
            const dy = p.y - act.lastPointer.y;
            act.lastPointer = p;

            if (el.type === "image") {
              return { ...el, cx: el.cx + dx, cy: el.cy + dy };
            }

            const moved = el.points.map((pt) => ({ x: pt.x + dx, y: pt.y + dy }));
            return { ...el, points: moved, bounds: getBoundsFromPoints(moved) };
          }

          // RESIZE (from original)
          if (act.kind === "resize") {
            const bb = act.baseBounds;
            const safeW = Math.max(bb.w, 1);
            const safeH = Math.max(bb.h, 1);

            const sxRaw = (p.x - bb.minX) / safeW;
            const syRaw = (p.y - bb.minY) / safeH;

            const sx = Math.max(0.08, Math.min(sxRaw, 12));
            const sy = Math.max(0.08, Math.min(syRaw, 12));

            if (el.type === "image") {
              const base = act.originalImage;
              return {
                ...el,
                w: Math.max(20, base.w * sx),
                h: Math.max(20, base.h * sy),
              };
            }

            const orig = act.originalPoints;
            const scaled = orig.map((pt) => ({
              x: bb.minX + (pt.x - bb.minX) * sx,
              y: bb.minY + (pt.y - bb.minY) * sy,
            }));
            return { ...el, points: scaled, bounds: getBoundsFromPoints(scaled) };
          }

          // ROTATE (from original)
          if (act.kind === "rotate") {
            const now = Math.atan2(p.y - act.cy, p.x - act.cx);
            const delta = now - act.startAngle;

            if (el.type === "image") {
              const base = act.originalImage;
              return { ...el, angle: base.angle + delta };
            }

            const orig = act.originalPoints;
            const rotated = orig.map((pt) => rotatePoint(pt.x, pt.y, act.cx, act.cy, delta));
            return { ...el, points: rotated, bounds: getBoundsFromPoints(rotated) };
          }

          return el;
        });

        // CHANGED: keep ref in sync during drag (so commit is correct)
        elementsRef.current = next;
        return next;
      });

      return;
    }

    // DRAW STROKE
    if (!drawingRef.current) return;

    const ctx = ctxRef.current;

    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = size * 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
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
    // Finish transform
    if (actionRef.current) {
      const snap = actionRef.current.snapshot;
      actionRef.current = null;
      commit(elementsRef.current, snap);
      return;
    }

    // Finish stroke
    ctxRef.current.globalCompositeOperation = "source-over";
    if (!drawingRef.current) return;

    setDrawing(false);

    const rawPts = pointsRef.current;
    if (!rawPts || rawPts.length < 2) {
      setPoints([]);
      return;
    }

    let finalPts = rawPts;

    // AI only for pen tools
    if (aiMode && tool !== "eraser") {
      const shape = detectIntent(rawPts);
      finalPts = makeShape(shape, rawPts);
    }

    const newEl = {
      id: Date.now(),
      type: "stroke",
      points: finalPts,
      bounds: getBoundsFromPoints(finalPts),
      color,
      tool,
      size,
    };

    commit([...elementsRef.current, newEl]);
    setPoints([]);
  };

  /* ---------------- IMAGE IMPORT ---------------- */
  const onImportImage = (file) => {
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const w = Math.min(520, img.width);
      const h = (img.height / img.width) * w;

      const newEl = {
        id: Date.now(),
        type: "image",
        img,
        cx: CANVAS_W / 2,
        cy: CANVAS_H / 2,
        w,
        h,
        angle: 0,
      };

      commit([...elementsRef.current, newEl]);
    };
    img.src = URL.createObjectURL(file);
  };

  /* ---------------- LAYERS ---------------- */
  const bringFront = () => {
    if (!selectedIdRef.current) return;
    const arr = [...elementsRef.current];
    const idx = arr.findIndex((e) => e.id === selectedIdRef.current);
    if (idx < 0) return;
    const [it] = arr.splice(idx, 1);
    arr.push(it);
    commit(arr);
  };

  const sendBack = () => {
    if (!selectedIdRef.current) return;
    const arr = [...elementsRef.current];
    const idx = arr.findIndex((e) => e.id === selectedIdRef.current);
    if (idx < 0) return;
    const [it] = arr.splice(idx, 1);
    arr.unshift(it);
    commit(arr);
  };

  const deleteSelected = () => {
    if (!selectedIdRef.current) return;
    commit(elementsRef.current.filter((e) => e.id !== selectedIdRef.current));
    setSelectedId(null);
  };

  /* ---------------- EXPORT ---------------- */
  const savePNG = () => {
    const url = canvasRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "canvas.png";
    a.click();
  };

  /* ---------------- SHORTCUTS ---------------- */
  useEffect(() => {
    const onKeyDown = (e) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const ctrl = isMac ? e.metaKey : e.ctrlKey;

      if (ctrl && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        (ctrl && e.key.toLowerCase() === "y") ||
        (ctrl && e.shiftKey && e.key.toLowerCase() === "z")
      ) {
        e.preventDefault();
        redo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIdRef.current) {
          e.preventDefault();
          deleteSelected();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const cursor =
    actionRef.current ? "grabbing" : tool === "eraser" ? "cell" : drawing ? "crosshair" : selectedId ? "move" : "default";

  return (
    <div style={{ padding: 10 }}>
      <h2>AI Smart Drawing Canvas</h2>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 10,
          alignItems: "center",
        }}
      >
        <select value={tool} onChange={(e) => setTool(e.target.value)}>
          <option value="pencil">Pencil</option>
          <option value="marker">Marker</option>
          <option value="highlighter">Highlighter</option>
          <option value="brush">Brush</option>
          <option value="eraser">Eraser</option>
        </select>

        <button onClick={() => setAiMode((v) => !v)}>AI {aiMode ? "ON" : "OFF"}</button>

        <button onClick={undo} disabled={!history.length}>
          Undo
        </button>
        <button onClick={redo} disabled={!redoStack.length}>
          Redo
        </button>

        <button onClick={bringFront} disabled={!selectedId}>
          Bring Front
        </button>
        <button onClick={sendBack} disabled={!selectedId}>
          Send Back
        </button>
        <button onClick={deleteSelected} disabled={!selectedId}>
          Delete
        </button>

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
        onClick={(e) => {
          // click to select (no dropdown)
          if (drawingRef.current || actionRef.current) return;
          const p = getPos(e);
          const hit = hitTest(p.x, p.y);
          setSelectedId(hit ? hit.id : null);
        }}
      />

      <div style={{ marginTop: 8, fontSize: 13, color: "#333" }}>
        <b>How to use:</b> Click item to select → drag to move. Bottom-right square = resize. Top circle = rotate.
        <br />
        <b>Shortcuts:</b> Ctrl+Z Undo, Ctrl+Y Redo, Delete removes selected.
      </div>
    </div>
  );
}
