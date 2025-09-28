// src/features/webcam-drawing/GestureCanvas.jsx
import { useRef, useEffect, useState } from "react";
import { Hands, HAND_CONNECTIONS } from "@mediapipe/hands";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { Camera } from "@mediapipe/camera_utils";

export default function GestureCanvas() {
  const videoRef = useRef(null);
  const drawCanvasRef = useRef(null);     // persistent drawing canvas
  const overlayCanvasRef = useRef(null);  // skeleton / feedback overlay
  const cameraRef = useRef(null);
  const handsRef = useRef(null);

  const prevPosRef = useRef(null);
  const fistStartRef = useRef(null);
  const lastSaveRef = useRef(0);

  // Tool states
  const [color, setColor] = useState("black");
  const [brushSize, setBrushSize] = useState(4);
  const [statusText, setStatusText] = useState("Waiting for hand...");

  // Helpers for drawing / overlay contexts
  function getDrawCtx() {
    return drawCanvasRef.current?.getContext("2d");
  }
  function getOverlayCtx() {
    return overlayCanvasRef.current?.getContext("2d");
  }

  // Save drawing (download)
  function saveDrawing() {
    if (!drawCanvasRef.current) return;
    const link = document.createElement("a");
    link.download = `gesture_drawing_${Date.now()}.png`;
    link.href = drawCanvasRef.current.toDataURL("image/png");
    link.click();
  }

  // Clear persistent drawing canvas
  function clearDrawing() {
    const c = drawCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
  }

  // Utility: are finger tips extended? tipIndex vs pipIndex (y smaller => extended for upright camera)
  function isFingerExtended(landmarks, tipIdx, pipIdx) {
    try {
      return landmarks[tipIdx].y < landmarks[pipIdx].y;
    } catch {
      return false;
    }
  }

  // Main gesture handler
  function handleLandmarks(landmarks) {
    const drawCtx = getDrawCtx();
    const overlayCtx = getOverlayCtx();
    const drawC = drawCanvasRef.current;
    const overlayC = overlayCanvasRef.current;
    if (!drawCtx || !overlayCtx || !drawC || !overlayC) return;

    // clear overlay for fresh skeleton
    overlayCtx.clearRect(0, 0, overlayC.width, overlayC.height);

    // draw skeleton (feedback)
    drawConnectors(overlayCtx, landmarks, HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 2 });
    drawLandmarks(overlayCtx, landmarks, { color: "#FF0000", lineWidth: 1 });

    // compute fingertip / pip indices
    const tipIndices = { index: 8, middle: 12, ring: 16, pinky: 20, thumb: 4 };
    const pipIndices = { index: 6, middle: 10, ring: 14, pinky: 18 };

    const indexExtended = isFingerExtended(landmarks, tipIndices.index, pipIndices.index);
    const middleExtended = isFingerExtended(landmarks, tipIndices.middle, pipIndices.middle);
    const ringExtended = isFingerExtended(landmarks, tipIndices.ring, pipIndices.ring);
    const pinkyExtended = isFingerExtended(landmarks, tipIndices.pinky, pipIndices.pinky);

    // Coordinates (normalized -> pixels)
    const w = drawC.width;
    const h = drawC.height;
    const index = landmarks[tipIndices.index];
    const thumb = landmarks[tipIndices.thumb];
    const ix = index.x * w;
    const iy = index.y * h;

    // Detect gestures
    const isOpenPalm = indexExtended && middleExtended && ringExtended && pinkyExtended;
    const isFist = !indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
    const isPeace = indexExtended && middleExtended && !ringExtended && !pinkyExtended; // V sign
    const isPointing = indexExtended && !middleExtended; // index up, middle down -> draw

    // Fist long-press -> clear (exit)
    if (isFist) {
      if (!fistStartRef.current) fistStartRef.current = Date.now();
      else {
        const held = Date.now() - fistStartRef.current;
        overlayCtx.font = "14px Arial";
        overlayCtx.fillStyle = "red";
        overlayCtx.fillText("Fist hold: " + Math.floor(held / 1000) + "s", 10, 20);
        if (held > 1800) {
          // treat as clear/exit action
          clearDrawing();
          setStatusText("Cleared (fist hold)");
          fistStartRef.current = null;
          prevPosRef.current = null;
          return;
        }
      }
    } else {
      fistStartRef.current = null;
    }

    // Peace sign -> save with cooldown
    if (isPeace) {
      const now = Date.now();
      if (now - lastSaveRef.current > 2000) {
        saveDrawing();
        lastSaveRef.current = now;
        setStatusText("Saved (peace sign)");
      }
      // do not draw while saving gesture is detected
      prevPosRef.current = null;
      return;
    }

    // Open palm -> stop drawing
    if (isOpenPalm) {
      prevPosRef.current = null;
      setStatusText("Open palm: paused");
      return;
    }

    // Pinch distance (thumb <-> index) -> scale brush size
    const pinchDist = Math.hypot((index.x - thumb.x) * w, (index.y - thumb.y) * h);
    const newBrush = Math.max(2, Math.min(30, Math.round(pinchDist / 8)));
    setBrushSize(prev => (Math.abs(prev - newBrush) > 0 ? newBrush : prev));

    // Color change by horizontal position (quick heuristic)
    if (index.x < 0.15) {
      setColor("red");
    } else if (index.x > 0.85) {
      setColor("blue");
    } else if (index.x > 0.45 && index.x < 0.55) {
      setColor("black");
    }

    // Drawing: when pointing (index extended, middle folded)
    if (isPointing) {
      setStatusText(`Drawing — color ${color}, brush ${brushSize}px`);
      const prev = prevPosRef.current;
      drawCtx.lineWidth = brushSize;
      drawCtx.lineCap = "round";
      drawCtx.strokeStyle = color;

      if (prev) {
        drawCtx.beginPath();
        drawCtx.moveTo(prev.x, prev.y);
        drawCtx.lineTo(ix, iy);
        drawCtx.stroke();
      } else {
        // start new stroke
        drawCtx.beginPath();
        drawCtx.moveTo(ix, iy);
        drawCtx.lineTo(ix + 0.01, iy + 0.01);
        drawCtx.stroke();
      }
      prevPosRef.current = { x: ix, y: iy };
    } else {
      // not drawing
      prevPosRef.current = null;
      setStatusText("Hand detected — not drawing");
    }
  }

  // Setup MediaPipe hands + camera
  useEffect(() => {
    const video = videoRef.current;
    const drawC = drawCanvasRef.current;
    const overlayC = overlayCanvasRef.current;

    if (!video || !drawC || !overlayC) return;

    // Ensure canvases match the video dimensions
    const width = 640;
    const height = 480;
    video.width = width;
    video.height = height;
    drawC.width = width;
    drawC.height = height;
    overlayC.width = width;
    overlayC.height = height;

    // Create Hands instance
    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    hands.onResults((results) => {
      if (!overlayC) return;
      const overlayCtx = overlayC.getContext("2d");
      // clear overlay each frame
      overlayCtx.clearRect(0, 0, overlayC.width, overlayC.height);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        try {
          handleLandmarks(results.multiHandLandmarks[0]);
        } catch (err) {
          console.error("Error in handleLandmarks:", err);
        }
      } else {
        // no hand
        setStatusText("No hand detected");
        prevPosRef.current = null;
      }
    });

    // start camera
    const camera = new Camera(video, {
      onFrame: async () => {
        await hands.send({ image: video });
      },
      width,
      height,
    });

    camera.start().catch((err) => {
      console.error("Camera start failed:", err);
      setStatusText("Camera start failed");
    });

    // store refs for cleanup
    cameraRef.current = camera;
    handsRef.current = hands;

    // cleanup on unmount
    return () => {
      try {
        camera.stop();
      } catch {}
      try {
        hands.close();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  return (
    <div style={{ textAlign: "center", position: "relative", width: 640, margin: "0 auto" }}>
      <h2>🎨 Gesture Drawing Canvas</h2>

      {/* video is hidden but used for detection */}
      <video ref={videoRef} style={{ display: "none" }} autoPlay playsInline muted />

      {/* layered canvases: drawing (bottom) + overlay (top) */}
      <div style={{ position: "relative", width: 640, height: 480 }}>
        <canvas
          ref={drawCanvasRef}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            zIndex: 1,
            border: "2px solid #333",
            background: "white",
          }}
        />
        <canvas
          ref={overlayCanvasRef}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            zIndex: 2,
            pointerEvents: "none",
          }}
        />
      </div>

      <div style={{ marginTop: 10 }}>
        <p style={{ margin: 4 }}>{statusText}</p>
        <p style={{ margin: 4 }}>
          Current: <strong style={{ color }}>{color}</strong> — Brush: <strong>{brushSize}px</strong>
        </p>
        <div style={{ marginTop: 8 }}>
          <button onClick={() => { saveDrawing(); setStatusText("Saved (button)"); }}>Save</button>
          <button onClick={() => { clearDrawing(); setStatusText("Cleared (button)"); }} style={{ marginLeft: 8 }}>Clear</button>
        </div>
        <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
          Gestures: Point = draw · Open palm = pause · ✌️ = save · Fist (hold 1.8s) = clear/exit · Move to edges to change color
        </p>
      </div>
    </div>
  );
}
