import React, { useRef, useState, useEffect } from "react";
import { useDprCanvas } from "../flipbook/hooks/useDprCanvas";
import { detectIntent } from "./intentAI";
import { makeShape } from "./shapeFactory";
import "./AiDrawing.css";
import TopBar from "./components/TopBar";
import LeftTools from "./components/LeftTools";
import RightPanel from "./components/RightPanel";
import CanvasArea from "./components/CanvasArea";

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
  // use shared DPR helper (same approach as flipbook) so CSS size and backing store match
  useDprCanvas(canvasRef, CANVAS_W, CANVAS_H);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctxRef.current = ctx;
    redraw(elementsRef.current || []);
  }, [canvasRef]);

  /* ---------------- UTIL ---------------- */
  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    // Map event coordinates to the canvas' CSS coordinate space. This accounts
    // for device-pixel-ratio backing store and any responsive scaling of the
    // displayed canvas (rect.width/rect.height).
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;

    const x = (clientX - rect.left) * (cssW / rect.width);
    const y = (clientY - rect.top) * (cssH / rect.height);
    return { x, y };
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
    // capture pointer so moves outside canvas still route here
    const canvas = canvasRef.current;
    if (canvas && e?.pointerId !== undefined) {
      try { canvas.setPointerCapture(e.pointerId); } catch {}
    }
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

      // Update elementsRef directly and redraw immediately for smooth dragging
      const prev = elementsRef.current || [];
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
            return { ...el, angle: (el.angle || 0) + delta };
          }

          const orig = act.originalPoints;
          const rotated = orig.map((pt) => rotatePoint(pt.x, pt.y, cx, cy, delta));
          return { ...el, points: rotated, bounds: getBounds(rotated) };
        }

        return el;
      });

      // sync ref and immediate redraw for responsive UX
      elementsRef.current = next;
      try { redraw(next); } catch (err) { /* swallow during fast moves */ }

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

  const onUp = (e) => {
    // release pointer capture
    const canvas = canvasRef.current;
    if (canvas && e?.pointerId !== undefined) {
      try { canvas.releasePointerCapture(e.pointerId); } catch {}
    }

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

  /* ---------------- UI (split into components) ---------------- */
  return (
    <div className="ai-page">
      <TopBar
        undo={undo}
        redo={redo}
        aiMode={aiMode}
        setAiMode={setAiMode}
        bringFront={bringFront}
        sendBack={sendBack}
        deleteSelected={deleteSelected}
        onImportImage={onImportImage}
        savePNG={savePNG}
        onClear={() => { if (textEditor) commitTextEditor(); commit([]); setSelectedId(null); }}
        selectedId={selectedId}
      />

      <div className="ai-workspace">
        <LeftTools tool={tool} setTool={setTool} />

        <CanvasArea
          canvasRef={canvasRef}
          cursor={cursor}
          onDown={onDown}
          onMove={onMove}
          onUp={onUp}
          onClick={(e) => {
            if (drawing || actionRef.current || tool === "text") return;
            const p = getPos(e);
            selectAt(p.x, p.y);
          }}
          onDoubleClick={(e) => {
            const p = getPos(e);
            const hit = hitTest(p.x, p.y);
            if (hit && hit.type === "text") openTextEditorFor(hit);
          }}
          textEditor={textEditor}
          commitTextEditor={commitTextEditor}
          setTextEditor={setTextEditor}
        />

        <RightPanel color={color} setColor={setColor} size={size} setSize={setSize} />
      </div>
    </div>
  );
}
