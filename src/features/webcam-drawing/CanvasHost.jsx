// src/features/webcam-drawing/GestureCanvas.jsx
import { useRef, useEffect, useMemo, useState } from "react";
import { Hands, HAND_CONNECTIONS } from "@mediapipe/hands";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { Camera } from "@mediapipe/camera_utils";
import "./GestureCanvas.css";

function Icon({ children }) {
  return <span className="gc-icon">{children}</span>;
}

const Icons = {
  brush: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 20c4 0 6-2 6-6 0-1 0-2 1-3l8-8 3 3-8 8c-1 1-2 1-3 1-4 0-6 2-6 6Z" />
      <path d="M14 6l4 4" />
    </svg>
  ),
  eraser: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 20H8l-4-4 10-10 8 8-6 6Z" />
      <path d="M6 16l4 4" />
    </svg>
  ),
  save: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2Z" />
      <path d="M7 21v-8h10v8" />
      <path d="M7 3v5h8" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 16h10l1-16" />
    </svg>
  ),
  mirror: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 4v16" />
      <path d="M7 8l-3 4 3 4" />
      <path d="M17 8l3 4-3 4" />
    </svg>
  ),
};

export default function GestureCanvas() {
  const videoRef = useRef(null);
  const drawCanvasRef = useRef(null);     // permanent drawing
  const overlayCanvasRef = useRef(null);  // landmarks overlay
  const cameraRef = useRef(null);
  const handsRef = useRef(null);

  // ---- UI state (only updated when needed) ----
  const [statusText, setStatusText] = useState("Waiting for hand...");
  const [tool, setTool] = useState("brush"); // brush | eraser
  const [mirrorView, setMirrorView] = useState(true);

  const [colorUI, setColorUI] = useState("#111111");
  const [brushUI, setBrushUI] = useState(6);

  // ---- live refs (NO re-render spam) ----
  const toolRef = useRef("brush");
  const colorRef = useRef("#111111");
  const brushRef = useRef(6);
  const mirrorRef = useRef(true);

  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { colorRef.current = colorUI; }, [colorUI]);
  useEffect(() => { brushRef.current = brushUI; }, [brushUI]);
  useEffect(() => { mirrorRef.current = mirrorView; }, [mirrorView]);

  // drawing refs
  const prevPosRef = useRef(null);
  const smoothPosRef = useRef(null); // Added for exponential smoothing
  const fistStartRef = useRef(null);
  const lastSaveRef = useRef(0);

  // throttle status updates
  const lastStatusRef = useRef({ text: "", t: 0 });
  const setStatusSafe = (text, minGapMs = 180) => {
    const now = Date.now();
    const last = lastStatusRef.current;
    if (text !== last.text && now - last.t > minGapMs) {
      lastStatusRef.current = { text, t: now };
      setStatusText(text);
    }
  };

  const getCtx = (ref) => ref.current?.getContext("2d");

  function saveDrawing() {
    const c = drawCanvasRef.current;
    if (!c) return;
    const link = document.createElement("a");
    link.download = `gesture_drawing_${Date.now()}.png`;
    link.href = c.toDataURL("image/png");
    link.click();
  }

  function clearDrawing() {
    const c = drawCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    prevPosRef.current = null;
  }

  function isFingerExtended(landmarks, tipIdx, pipIdx) {
    try { return landmarks[tipIdx].y < landmarks[pipIdx].y; }
    catch { return false; }
  }

  // ---- main gesture handler (NO React state spam) ----
  function handleLandmarks(landmarks) {
    const drawC = drawCanvasRef.current;
    const overlayC = overlayCanvasRef.current;
    if (!drawC || !overlayC) return;

    const drawCtx = getCtx(drawCanvasRef);
    const overlayCtx = getCtx(overlayCanvasRef);
    if (!drawCtx || !overlayCtx) return;

    // clear overlay
    overlayCtx.clearRect(0, 0, overlayC.width, overlayC.height);

    // draw skeleton
    drawConnectors(overlayCtx, landmarks, HAND_CONNECTIONS, { color: "#22c55e", lineWidth: 2 });
    drawLandmarks(overlayCtx, landmarks, { color: "#ef4444", lineWidth: 1 });

    const tip = { index: 8, middle: 12, ring: 16, pinky: 20, thumb: 4 };
    const pip = { index: 6, middle: 10, ring: 14, pinky: 18 };

    const indexExtended = isFingerExtended(landmarks, tip.index, pip.index);
    const middleExtended = isFingerExtended(landmarks, tip.middle, pip.middle);
    const ringExtended = isFingerExtended(landmarks, tip.ring, pip.ring);
    const pinkyExtended = isFingerExtended(landmarks, tip.pinky, pip.pinky);

    const isOpenPalm = indexExtended && middleExtended && ringExtended && pinkyExtended;
    const isFist = !indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
    const isPeace = indexExtended && middleExtended && !ringExtended && !pinkyExtended;
    const isPointing = indexExtended && !middleExtended;

    // coords (normalized -> pixels)
    const w = drawC.width;
    const h = drawC.height;

    const index = landmarks[tip.index];
    const thumb = landmarks[tip.thumb];

    // Smoothing logic (Exponential Smoothing)
    const smoothing = 0.35; // lower = smoother but more lag
    const lastPos = smoothPosRef.current || { x: index.x, y: index.y };
    const sx = lastPos.x + (index.x - lastPos.x) * smoothing;
    const sy = lastPos.y + (index.y - lastPos.y) * smoothing;
    smoothPosRef.current = { x: sx, y: sy };

    // mirror view: if UI mirrored, invert x so drawing matches what user sees
    const mx = mirrorRef.current ? (1 - sx) : sx;
    const tx = mirrorRef.current ? (1 - thumb.x) : thumb.x;

    const ix = mx * w;
    const iy = sy * h;

    // fist hold -> clear
    if (isFist) {
      if (!fistStartRef.current) fistStartRef.current = Date.now();
      const held = Date.now() - fistStartRef.current;

      overlayCtx.save();
      overlayCtx.font = "14px system-ui";
      overlayCtx.fillStyle = "#ef4444";
      overlayCtx.fillText(`Fist hold: ${(held / 1000).toFixed(1)}s`, 10, 20);
      overlayCtx.restore();

      if (held > 1800) {
        clearDrawing();
        setStatusSafe("Cleared (fist hold)");
        fistStartRef.current = null;
        smoothPosRef.current = null;
        return;
      }
    } else {
      fistStartRef.current = null;
    }

    // peace -> save (cooldown)
    if (isPeace) {
      const now = Date.now();
      if (now - lastSaveRef.current > 2000) {
        saveDrawing();
        lastSaveRef.current = now;
        setStatusSafe("Saved (peace sign)");
      }
      prevPosRef.current = null;
      smoothPosRef.current = null;
      return;
    }

    // open palm -> pause
    if (isOpenPalm) {
      prevPosRef.current = null;
      smoothPosRef.current = null;
      setStatusSafe("Paused (open palm)");
      return;
    }

    // pinch -> adjust brush size (but don't spam state)
    const pinchDist = Math.hypot((mx - tx) * w, (index.y - thumb.y) * h);
    const newBrush = Math.max(2, Math.min(30, Math.round(pinchDist / 10)));
    if (Math.abs(brushRef.current - newBrush) >= 1) {
      brushRef.current = newBrush;
      // update UI occasionally (not every frame)
      setBrushUI((prev) => (Math.abs(prev - newBrush) >= 2 ? newBrush : prev));
    }

    // draw when pointing
    if (isPointing) {
      const t = toolRef.current;
      const c = colorRef.current;
      const b = brushRef.current;

      drawCtx.lineCap = "round";
      drawCtx.lineJoin = "round";
      drawCtx.lineWidth = b;

      if (t === "eraser") {
        drawCtx.globalCompositeOperation = "destination-out";
        drawCtx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        drawCtx.globalCompositeOperation = "source-over";
        drawCtx.strokeStyle = c;
      }

      const prev = prevPosRef.current;
      drawCtx.beginPath();
      if (prev) {
        drawCtx.moveTo(prev.x, prev.y);
        drawCtx.lineTo(ix, iy);
        drawCtx.stroke();
      } else {
        // Dot if just starting
        drawCtx.arc(ix, iy, b / 2, 0, Math.PI * 2);
        drawCtx.fill();
      }

      prevPosRef.current = { x: ix, y: iy };
      setStatusSafe(`Drawing — ${t === "eraser" ? "Eraser" : "Brush"} • ${b}px`);
    } else {
      prevPosRef.current = null;
      smoothPosRef.current = null;
      setStatusSafe("Hand detected — not drawing");
    }
  }

  // Setup MediaPipe hands + camera
  useEffect(() => {
    const video = videoRef.current;
    const drawC = drawCanvasRef.current;
    const overlayC = overlayCanvasRef.current;
    if (!video || !drawC || !overlayC) return;

    // responsive: fit container width, keep 4:3
    const baseW = 960;
    const baseH = 720;

    video.width = baseW;
    video.height = baseH;
    drawC.width = baseW;
    drawC.height = baseH;
    overlayC.width = baseW;
    overlayC.height = baseH;

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    hands.onResults((results) => {
      const overlayCtx = getCtx(overlayCanvasRef);
      if (!overlayCtx || !overlayC) return;

      overlayCtx.clearRect(0, 0, overlayC.width, overlayC.height);

      const lm = results.multiHandLandmarks?.[0];
      if (lm) {
        try {
          handleLandmarks(lm);
        } catch (err) {
          console.error("handleLandmarks error:", err);
          setStatusSafe("Gesture error (check console)");
        }
      } else {
        prevPosRef.current = null;
        setStatusSafe("No hand detected", 250);
      }
    });

    const camera = new Camera(video, {
      onFrame: async () => {
        await hands.send({ image: video });
      },
      width: baseW,
      height: baseH,
    });

    camera.start().catch((err) => {
      console.error("Camera start failed:", err);
      setStatusSafe("Camera start failed");
    });

    cameraRef.current = camera;
    handsRef.current = hands;

    return () => {
      try { camera.stop(); } catch { /* ignore */ }
      try { hands.close(); } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentColor = useMemo(() => colorUI, [colorUI]);

  return (
    <div className="gc-wrap">
      {/* TOP TOOLBAR (Paint-like) */}
      <div className="gc-topbar">
        <div className="gc-brand">SmartCanvas</div>

        <button className={`gc-btn ${tool === "brush" ? "isActive" : ""}`} onClick={() => setTool("brush")}>
          <Icon>{Icons.brush}</Icon> Brush
        </button>

        <button className={`gc-btn ${tool === "eraser" ? "isActive" : ""}`} onClick={() => setTool("eraser")}>
          <Icon>{Icons.eraser}</Icon> Eraser
        </button>

        <div className="gc-sep" />

        <label className="gc-color">
          <span className="gc-label">Color</span>
          <input
            type="color"
            value={currentColor}
            onChange={(e) => setColorUI(e.target.value)}
            aria-label="Color picker"
          />
        </label>

        <label className="gc-size">
          <span className="gc-label">Size</span>
          <input
            type="range"
            min="2"
            max="30"
            value={brushUI}
            onChange={(e) => setBrushUI(+e.target.value)}
            aria-label="Brush size"
          />
          <span className="gc-sizeval">{brushUI}px</span>
        </label>

        <div className="gc-sep" />

        <button className="gc-btn" onClick={() => setMirrorView((v) => !v)}>
          <Icon>{Icons.mirror}</Icon> {mirrorView ? "Mirror On" : "Mirror Off"}
        </button>

        <div className="gc-spacer" />

        <button className="gc-btn" onClick={saveDrawing}>
          <Icon>{Icons.save}</Icon> Save
        </button>
        <button className="gc-btn danger" onClick={clearDrawing}>
          <Icon>{Icons.trash}</Icon> Clear
        </button>
      </div>

      {/* CANVAS AREA */}
      <div className="gc-stage">
        {/* hidden video for MediaPipe */}
        <video ref={videoRef} className="gc-video" autoPlay playsInline muted />

        <div className={`gc-canvasBox ${mirrorView ? "mirrored" : ""}`}>
          <canvas ref={drawCanvasRef} className="gc-canvas draw" />
          <canvas ref={overlayCanvasRef} className="gc-canvas overlay" />
        </div>

        {/* STATUS + HELP */}
        <div className="gc-status">
          <div className="gc-pill">
            <b>Status:</b> {statusText}
          </div>

          <div className="gc-help">
            <b>Gestures:</b> Point = draw • Open palm = pause • ✌️ = save • Fist hold (1.8s) = clear
          </div>
        </div>
      </div>
    </div>
  );
}
