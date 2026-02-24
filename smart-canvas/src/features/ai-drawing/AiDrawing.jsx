import React, { useRef, useState, useEffect } from "react";
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

  const [tool, setTool] = useState("pencil"); // pencil | marker | highlighter | brush | eraser | text
  const [aiMode, setAiMode] = useState(true);
  const [color, setColor] = useState("#000");
  const [size, setSize] = useState(2);

  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState([]);

  const [selectedId, setSelectedId] = useState(null);

  // For move/resize/rotate state
  const actionRef = useRef(null);

  // Text editor overlay (Canva-like)
  const [textEditor, setTextEditor] = useState(null);
  // { id, x, y, value, fontSize, fontFamily, color }

  const CANVAS_W = 1000;
  const CANVAS_H = 600;

  /* ---------------- SETUP ---------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    const ctx = canvas.getContext("2d");
    ctxRef.current = ctx;
    redraw(elementsRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- UTIL ---------------- */
  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const getBounds = (pts) => {
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
    if (el.type === "text") {
      // text bounds stored
      return el.bounds || { minX: el.x, minY: el.y, w: 120, h: 40, cx: el.x + 60, cy: el.y + 20 };
    }
    if (el.bounds) return el.bounds;
    if (el.points && el.points.length) return getBounds(el.points);
    return null;
  };

  const isPointInBounds = (x, y, b, pad = 6) => {
    if (!b) return false;
    return x >= b.minX - pad && x <= b.minX + b.w + pad && y >= b.minY - pad && y <= b.minY + b.h + pad;
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
  const commit = (newEls, snapshotBefore = elementsRef.current) => {
    setHistory((h) => [...h, snapshotBefore]);
    setRedoStack([]);
    setElements(newEls);
  };

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

  /* ---------------- PENS ---------------- */
  const applyPen = (ctx, t, s) => {
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (t === "marker") {
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = s * 3;
    } else if (t === "highlighter") {
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = s * 6;
    } else if (t === "brush") {
      ctx.shadowBlur = 4;
      ctx.lineWidth = s * 2.5;
    } else {
      ctx.lineWidth = s; // pencil
    }
  };

  /* ---------------- SELECTION HANDLES ---------------- */
  const getHandleRects = (b) => {
    const s = 10;
    const resize = {
      x: b.minX + b.w - s / 2,
      y: b.minY + b.h - s / 2,
      w: s,
      h: s,
    };
    // IMPORTANT FIX: rotate handle should be centered on cx (not cx-6)
    const rotate = {
      x: b.cx,
      y: b.minY - 28,
      r: 8,
    };
    return { resize, rotate };
  };

  const isInResizeHandle = (x, y, b) => {
    const { resize } = getHandleRects(b);
    return x >= resize.x && x <= resize.x + resize.w && y >= resize.y && y <= resize.y + resize.h;
  };

  const isInRotateHandle = (x, y, b) => {
    const { rotate } = getHandleRects(b);
    return Math.hypot(x - rotate.x, y - rotate.y) <= rotate.r;
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

  const selectAt = (x, y) => {
    const hit = hitTest(x, y);
    if (hit) setSelectedId(hit.id);
    else setSelectedId(null);
  };

  /* ---------------- TEXT HELPERS ---------------- */
  const measureTextBounds = (ctx, text, x, y, fontSize, fontFamily) => {
    ctx.save();
    ctx.font = `${fontSize}px ${fontFamily}`;
    const lines = (text || "").split("\n");
    let maxW = 40;
    for (const line of lines) {
      maxW = Math.max(maxW, ctx.measureText(line || " ").width);
    }
    const h = Math.max(24, lines.length * (fontSize + 6));
    ctx.restore();
    return {
      minX: x,
      minY: y - fontSize, // baseline-ish
      w: maxW + 10,
      h: h + 6,
      cx: x + (maxW + 10) / 2,
      cy: y - fontSize + (h + 6) / 2,
    };
  };

  const startTextAt = (x, y) => {
    const id = Date.now();
    setSelectedId(id);
    setTextEditor({
      id,
      x,
      y,
      value: "",
      fontSize: 28,
      fontFamily: "Arial",
      color,
    });
  };

  const openTextEditorFor = (el) => {
    setSelectedId(el.id);
    setTextEditor({
      id: el.id,
      x: el.x,
      y: el.y,
      value: el.text || "",
      fontSize: el.fontSize || 28,
      fontFamily: el.fontFamily || "Arial",
      color: el.color || "#000",
    });
  };

  const commitTextEditor = () => {
    if (!textEditor) return;
    const ctx = ctxRef.current;
    const { id, x, y, value, fontSize, fontFamily, color: tColor } = textEditor;

    // If empty, delete it
    if (!value || !value.trim()) {
      commit(elementsRef.current.filter((e) => e.id !== id));
      setTextEditor(null);
      return;
    }

    const bounds = measureTextBounds(ctx, value, x, y, fontSize, fontFamily);

    const existing = elementsRef.current.find((e) => e.id === id);
    const snapshot = elementsRef.current;

    if (existing) {
      const next = snapshot.map((e) =>
        e.id === id
          ? { ...e, type: "text", x, y, text: value, fontSize, fontFamily, color: tColor, bounds }
          : e
      );
      commit(next, snapshot);
    } else {
      const newEl = { id, type: "text", x, y, text: value, fontSize, fontFamily, color: tColor, bounds };
      commit([...snapshot, newEl], snapshot);
    }

    setTextEditor(null);
  };

  /* ---------------- DRAW ---------------- */
  const redraw = (all) => {
    const ctx = ctxRef.current;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    all.forEach((el) => {
      // IMAGE
      if (el.type === "image") {
        ctx.save();
        const a = el.angle || 0;
        ctx.translate(el.cx, el.cy);
        ctx.rotate(a);
        ctx.drawImage(el.img, -el.w / 2, -el.h / 2, el.w, el.h);
        ctx.restore();
      }

      // TEXT
      else if (el.type === "text") {
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = el.color || "#000";
        const fontSize = el.fontSize || 28;
        const fontFamily = el.fontFamily || "Arial";
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.textBaseline = "alphabetic";
        const lines = (el.text || "").split("\n");
        let yy = el.y;
        for (const line of lines) {
          ctx.fillText(line, el.x, yy);
          yy += fontSize + 6;
        }
        ctx.restore();
      }

      // STROKE
      else {
        if (!el.points || el.points.length < 2) return;

        ctx.save();
        if (el.tool === "eraser") {
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
        for (let i = 1; i < el.points.length; i++) ctx.lineTo(el.points[i].x, el.points[i].y);
        ctx.stroke();
        ctx.restore();
      }

      // SELECTION (box + handles)
      if (el.id === selectedId) {
        const b = getBoundsForElement(el);
        if (!b) return;

        ctx.save();
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(b.minX, b.minY, b.w, b.h);
        ctx.setLineDash([]);

        const { resize, rotate } = getHandleRects(b);
        ctx.fillStyle = "#2563eb";
        ctx.fillRect(resize.x, resize.y, resize.w, resize.h);

        ctx.beginPath();
        ctx.arc(rotate.x, rotate.y, rotate.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(b.cx, b.minY);
        ctx.lineTo(rotate.x, rotate.y);
        ctx.stroke();

        ctx.restore();
      }
    });
  };

  useEffect(() => redraw(elements), [elements, selectedId]);

  /* ---------------- MOUSE EVENTS ---------------- */
  const onDown = (e) => {
    // if text editor open, finish it first
    if (textEditor) commitTextEditor();

    const p = getPos(e);

    // TEXT TOOL: click to place text
    if (tool === "text") {
      startTextAt(p.x, p.y);
      return;
    }

    // If clicking on existing element -> select and start transform
    const hit = hitTest(p.x, p.y);
    if (hit) {
      setSelectedId(hit.id);
      const b = getBoundsForElement(hit);

      // rotate
      if (b && isInRotateHandle(p.x, p.y, b)) {
        actionRef.current = {
          id: hit.id,
          kind: "rotate",
          cx: b.cx,
          cy: b.cy,
          startAngle: Math.atan2(p.y - b.cy, p.x - b.cx),
          originalPoints: hit.type === "stroke" ? hit.points.map((pt) => ({ ...pt })) : null,
          originalImage:
            hit.type === "image" ? { cx: hit.cx, cy: hit.cy, w: hit.w, h: hit.h, angle: hit.angle || 0 } : null,
          originalText:
            hit.type === "text" ? { x: hit.x, y: hit.y, bounds: hit.bounds, fontSize: hit.fontSize, fontFamily: hit.fontFamily } : null,
          snapshot: elementsRef.current,
        };
        return;
      }

      // resize
      if (b && isInResizeHandle(p.x, p.y, b)) {
        actionRef.current = {
          id: hit.id,
          kind: "resize",
          baseBounds: { ...b },
          originalPoints: hit.type === "stroke" ? hit.points.map((pt) => ({ ...pt })) : null,
          originalImage:
            hit.type === "image" ? { cx: hit.cx, cy: hit.cy, w: hit.w, h: hit.h, angle: hit.angle || 0 } : null,
          originalText:
            hit.type === "text"
              ? { x: hit.x, y: hit.y, bounds: hit.bounds, fontSize: hit.fontSize || 28, fontFamily: hit.fontFamily || "Arial" }
              : null,
          snapshot: elementsRef.current,
        };
        return;
      }

      // move
      actionRef.current = {
        id: hit.id,
        kind: "move",
        lastPointer: p,
        snapshot: elementsRef.current,
      };
      return;
    }

    // empty click => deselect
    setSelectedId(null);

    // Start drawingraw stroke
    setDrawing(true);
    setPoints([p]);

    const ctx = ctxRef.current;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);

    // IMPORTANT: set correct drawing mode from the start
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = size * 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      applyPen(ctx, tool, size);
    }
  };

  const onMove = (e) => {
    const p = getPos(e);

    // Transform
    if (actionRef.current) {
      const act = actionRef.current;
      const id = act.id;

      // IMPORTANT FIX: keep ref synced during drag so commit gets latest
      setElements((prev) => {
        const next = prev.map((el) => {
          if (el.id !== id) return el;

          // MOVE
          if (act.kind === "move") {
            const dx = p.x - act.lastPointer.x;
            const dy = p.y - act.lastPointer.y;
            act.lastPointer = p;

            if (el.type === "image") {
              return { ...el, cx: el.cx + dx, cy: el.cy + dy };
            }
            if (el.type === "text") {
              const nx = el.x + dx;
              const ny = el.y + dy;
              const b = ctxRef.current ? measureTextBounds(ctxRef.current, el.text, nx, ny, el.fontSize || 28, el.fontFamily || "Arial") : el.bounds;
              return { ...el, x: nx, y: ny, bounds: b };
            }

            const moved = el.points.map((pt) => ({ x: pt.x + dx, y: pt.y + dy }));
            return { ...el, points: moved, bounds: getBounds(moved) };
          }

          // RESIZE
          if (act.kind === "resize") {
            const bb = act.baseBounds;
            const safeW = Math.max(bb.w, 1);
            const safeH = Math.max(bb.h, 1);

            const scaleX = (p.x - bb.minX) / safeW;
            const scaleY = (p.y - bb.minY) / safeH;

            const sx = Math.max(0.08, Math.min(scaleX, 12));
            const sy = Math.max(0.08, Math.min(scaleY, 12));

            if (el.type === "image") {
              const base = act.originalImage;
              return { ...el, w: Math.max(20, base.w * sx), h: Math.max(20, base.h * sy) };
            }

            if (el.type === "text") {
              // Canva-like: resizing text box changes font size a bit (simple)
              const base = act.originalText;
              const newFont = Math.max(10, Math.min(120, Math.round((base.fontSize || 28) * ((sx + sy) / 2))));
              const b = measureTextBounds(ctxRef.current, el.text, base.x, base.y, newFont, base.fontFamily || "Arial");
              return { ...el, fontSize: newFont, bounds: b };
            }

            const orig = act.originalPoints;
            const scaled = orig.map((pt) => ({
              x: bb.minX + (pt.x - bb.minX) * sx,
              y: bb.minY + (pt.y - bb.minY) * sy,
            }));
            return { ...el, points: scaled, bounds: getBounds(scaled) };
          }

          // ROTATE
          if (act.kind === "rotate") {
            const cx = act.cx;
            const cy = act.cy;

            const now = Math.atan2(p.y - cy, p.x - cx);
            const delta = now - act.startAngle;

            if (el.type === "image") {
              const base = act.originalImage;
              return { ...el, angle: (base.angle || 0) + delta };
            }

            if (el.type === "text") {
              // text rotation (store angle, redraw would need rotate; keep simple: just store angle for later)
              // If you want actual rotated text rendering, tell me; I’ll add it.
              return { ...el, angle: (el.angle || 0) + delta };
            }

            const orig = act.originalPoints;
            const rotated = orig.map((pt) => rotatePoint(pt.x, pt.y, cx, cy, delta));
            return { ...el, points: rotated, bounds: getBounds(rotated) };
          }

          return el;
        });

        elementsRef.current = next;
        return next;
      });

      return;
    }

    // Draw stroke
    if (!drawing) return;

    const ctx = ctxRef.current;

    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
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
    // Finish transform => commit history
    if (actionRef.current) {
      const snap = actionRef.current.snapshot;
      actionRef.current = null;
      // commit final state (ref is synced during drag)
      commit(elementsRef.current, snap);
      return;
    }

    // Finish stroke
    const ctx = ctxRef.current;
    ctx.globalCompositeOperation = "source-over";
    if (!drawing) return;

    setDrawing(false);

    let finalPts = points;

    // AI mode only for normal pens (not eraser)
    if (aiMode && tool !== "eraser" && tool !== "text") {
      const shape = detectIntent(points);
      finalPts = makeShape(shape, points);
    }

    const newEl = {
      id: Date.now(),
      type: "stroke",
      points: finalPts,
      bounds: getBounds(finalPts),
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
      const w = Math.min(500, img.width);
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
    if (!selectedId) return;
    const arr = [...elementsRef.current];
    const idx = arr.findIndex((e) => e.id === selectedId);
    if (idx < 0) return;
    const [it] = arr.splice(idx, 1);
    arr.push(it);
    commit(arr);
  };

  const sendBack = () => {
    if (!selectedId) return;
    const arr = [...elementsRef.current];
    const idx = arr.findIndex((e) => e.id === selectedId);
    if (idx < 0) return;
    const [it] = arr.splice(idx, 1);
    arr.unshift(it);
    commit(arr);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    commit(elementsRef.current.filter((e) => e.id !== selectedId));
    setSelectedId(null);
  };

  /* ---------------- EXPORT ---------------- */
  const savePNG = () => {
    if (textEditor) commitTextEditor();
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
      } else if ((ctrl && e.key.toLowerCase() === "y") || (ctrl && e.shiftKey && e.key.toLowerCase() === "z")) {
        e.preventDefault();
        redo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) {
          e.preventDefault();
          deleteSelected();
        }
      } else if (e.key === "Escape") {
        if (textEditor) {
          e.preventDefault();
          commitTextEditor();
        }
      } else if (e.key === "Enter" && textEditor && !e.shiftKey) {
        // Enter commits, Shift+Enter new line
        e.preventDefault();
        commitTextEditor();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, textEditor]);

  const cursor = actionRef.current
    ? "grabbing"
    : drawing
      ? tool === "eraser"
        ? "cell"
        : "crosshair"
      : selectedId
        ? "move"
        : tool === "text"
          ? "text"
          : "default";

  /* ---------------- UI (simple paint-like) ---------------- */
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      background: "#f1f5f9",
      boxSizing: "border-box"
    }}>
      <div style={{ width: "100%", maxWidth: "1200px" }}>
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            padding: "8px 10px",
            border: "1px solid #ddd",
            borderRadius: 8,
            marginBottom: 10,
            background: "#f8fafc",
          }}
        >
          <b style={{ marginRight: 10 }}>SmartCanvas</b>

          <button onClick={undo}>Undo</button>
          <button onClick={redo}>Redo</button>

          <div style={{ width: 1, height: 22, background: "#ddd" }} />

          <button onClick={() => setAiMode((v) => !v)}>AI {aiMode ? "ON" : "OFF"}</button>

          <div style={{ width: 1, height: 22, background: "#ddd" }} />

          <button onClick={bringFront} disabled={!selectedId}>
            Bring Front
          </button>
          <button onClick={sendBack} disabled={!selectedId}>
            Send Back
          </button>
          <button onClick={deleteSelected} disabled={!selectedId}>
            Delete
          </button>

          <div style={{ flex: 1 }} />

          <label style={{ border: "1px solid #999", padding: "4px 8px", cursor: "pointer", borderRadius: 6 }}>
            Import Image
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => onImportImage(e.target.files?.[0])}
            />
          </label>

          <button onClick={savePNG}>Save PNG</button>
          <button
            onClick={() => {
              if (textEditor) commitTextEditor();
              commit([]);
              setSelectedId(null);
            }}
          >
            Clear
          </button>
        </div>

        {/* Main area */}
        <div style={{ display: "flex", gap: 10 }}>
          {/* Left tool rail */}
          <div
            style={{
              width: 120,
              border: "1px solid #ddd",
              borderRadius: 8,
              background: "#fff",
              padding: 8,
              height: CANVAS_H + 2,
            }}
          >
            <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>Tools</div>

            {[
              ["pencil", "Pencil"],
              ["marker", "Marker"],
              ["highlighter", "Highlighter"],
              ["brush", "Brush"],
              ["eraser", "Eraser"],
              ["text", "Text"],
            ].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTool(k)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 10px",
                  marginBottom: 6,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  background: tool === k ? "#e0f2fe" : "#fff",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}

            <div style={{ marginTop: 10, fontSize: 12, color: "#555" }}>Tip</div>
            <div style={{ fontSize: 12, color: "#777", marginTop: 4, lineHeight: 1.35 }}>
              Click object to select.
              <br />
              Drag to move.
              <br />
              Square = resize.
              <br />
              Circle = rotate.
            </div>
          </div>

          {/* Canvas + overlay */}
          <div style={{ position: "relative" }}>
            <canvas
              ref={canvasRef}
              style={{ border: "2px solid black", cursor, background: "#fff" }}
              onMouseDown={onDown}
              onMouseMove={onMove}
              onMouseUp={onUp}
              onMouseLeave={onUp}
              onClick={(e) => {
                // select by click (not when drawing/dragging)
                if (drawing || actionRef.current || tool === "text") return;
                const p = getPos(e);
                selectAt(p.x, p.y);
              }}
              onDoubleClick={(e) => {
                const p = getPos(e);
                const hit = hitTest(p.x, p.y);
                if (hit && hit.type === "text") {
                  openTextEditorFor(hit);
                }
              }}
            />

            {/* Canva-like text editor overlay */}
            {textEditor && (
              <textarea
                autoFocus
                value={textEditor.value}
                onChange={(e) => setTextEditor((t) => ({ ...t, value: e.target.value }))}
                onBlur={commitTextEditor}
                style={{
                  position: "absolute",
                  left: textEditor.x,
                  top: textEditor.y - (textEditor.fontSize || 28),
                  minWidth: 180,
                  minHeight: 50,
                  padding: 6,
                  resize: "both",
                  border: "2px solid #2563eb",
                  outline: "none",
                  fontSize: textEditor.fontSize || 28,
                  fontFamily: textEditor.fontFamily || "Arial",
                  color: textEditor.color || "#000",
                  background: "rgba(255,255,255,0.95)",
                }}
                placeholder="Type here..."
              />
            )}
          </div>

          {/* Right panel */}
          <div
            style={{
              width: 220,
              border: "1px solid #ddd",
              borderRadius: 8,
              background: "#fff",
              padding: 10,
              height: CANVAS_H + 2,
            }}
          >
            <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>Settings</div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, marginBottom: 6 }}>Color</div>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, marginBottom: 6 }}>Size</div>
              <input type="range" min="1" max="30" value={size} onChange={(e) => setSize(+e.target.value)} />
              <div style={{ fontSize: 12, color: "#666" }}>{size}px</div>
            </div>

            <div style={{ marginBottom: 10 }}>
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
        </div>
      </div>
    </div>
  );
}
