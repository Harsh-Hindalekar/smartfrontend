import { useRef, useEffect, useState } from "react";
import { Hands, HAND_CONNECTIONS } from "@mediapipe/hands";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { Camera } from "@mediapipe/camera_utils";
import { useNavigate, Link } from "react-router-dom";
import "./GestureCanvas.css";

export default function GestureCanvas() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const drawCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const cameraRef = useRef(null);
  const handsRef = useRef(null);

  const [statusText, setStatusText] = useState("Initializing Artist Mode...");
  const [tool, setTool] = useState("brush");
  const [colorUI, setColorUI] = useState("#357fe0"); // Default Artist Blue
  const [brushUI, setBrushUI] = useState(8);

  // Refs for logic (prevents laggy re-renders)
  const toolRef = useRef("brush");
  const colorRef = useRef("#357fe0");
  const brushRef = useRef(8);
  const prevPosRef = useRef(null);
  const fistStartRef = useRef(null);
  const lastSaveRef = useRef(0);

  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { colorRef.current = colorUI; }, [colorUI]);
  useEffect(() => { brushRef.current = brushUI; }, [brushUI]);

  const clearDrawing = () => {
    const ctx = drawCanvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height);
      prevPosRef.current = null;
      setStatusText("Canvas Cleared! 🎨");
    }
  };

  const saveDrawing = () => {
    const link = document.createElement("a");
    link.download = `my_artwork_${Date.now()}.png`;
    link.href = drawCanvasRef.current.toDataURL();
    link.click();
    setStatusText("Artwork Saved! ✨");
  };

  function handleLandmarks(landmarks) {
    const drawCtx = drawCanvasRef.current.getContext("2d");
    const overlayCtx = overlayCanvasRef.current.getContext("2d");
    const { width, height } = drawCanvasRef.current;

    overlayCtx.clearRect(0, 0, width, height);
    
    // Draw skeleton only on overlay
    drawConnectors(overlayCtx, landmarks, HAND_CONNECTIONS, { color: "#357fe0", lineWidth: 3 });
    drawLandmarks(overlayCtx, landmarks, { color: "#f7ce46", lineWidth: 1, radius: 4 });

    // Gesture Detection Logic
    const isFingerUp = (tip, pip) => landmarks[tip].y < landmarks[pip].y;
    
    const indexUp = isFingerUp(8, 6);
    const middleUp = isFingerUp(12, 10);
    const ringUp = isFingerUp(16, 14);
    const pinkyUp = isFingerUp(20, 18);

    const isPointing = indexUp && !middleUp && !ringUp;
    const isPeace = indexUp && middleUp && !ringUp && !pinkyUp;
    const isFist = !indexUp && !middleUp && !ringUp && !pinkyUp;
    const isOpen = indexUp && middleUp && ringUp && pinkyUp;

    // Coordinate mapping (Mirrored for natural feel)
    const ix = (1 - landmarks[8].x) * width;
    const iy = landmarks[8].y * height;

    if (isFist) {
      if (!fistStartRef.current) fistStartRef.current = Date.now();
      if (Date.now() - fistStartRef.current > 1500) clearDrawing();
    } else {
      fistStartRef.current = null;
    }

    if (isPeace) {
      if (Date.now() - lastSaveRef.current > 3000) {
        saveDrawing();
        lastSaveRef.current = Date.now();
      }
    }

    if (isPointing) {
      drawCtx.lineCap = "round";
      drawCtx.lineWidth = brushRef.current;
      drawCtx.strokeStyle = colorRef.current;
      drawCtx.globalCompositeOperation = toolRef.current === "eraser" ? "destination-out" : "source-over";

      drawCtx.beginPath();
      if (prevPosRef.current) drawCtx.moveTo(prevPosRef.current.x, prevPosRef.current.y);
      else drawCtx.moveTo(ix, iy);
      drawCtx.lineTo(ix, iy);
      drawCtx.stroke();
      prevPosRef.current = { x: ix, y: iy };
      setStatusText("Drawing... ✍️");
    } else {
      prevPosRef.current = null;
      if (isOpen) setStatusText("Hand detected (Paused) ✋");
    }
  }

  useEffect(() => {
    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });
    hands.onResults((res) => {
      const lm = res.multiHandLandmarks?.[0];
      if (lm) handleLandmarks(lm);
      else setStatusText("Show your hand to start! ✋");
    });

    const camera = new Camera(videoRef.current, {
      onFrame: async () => { await hands.send({ image: videoRef.current }); },
      width: 960, height: 720
    });
    camera.start();

    // Set canvas sizes
    drawCanvasRef.current.width = 960;
    drawCanvasRef.current.height = 720;
    overlayCanvasRef.current.width = 960;
    overlayCanvasRef.current.height = 720;

    return () => { camera.stop(); hands.close(); };
  }, []);

  return (
    <div className="gc-page">
      <div className="gc-card">
        {/* Top Header */}
        <div className="gc-header">
          <Link to="/dashboard" className="gc-back">← Back</Link>
          <div className="gc-ribbon-small">Air Drawing</div>
          <div className="gc-status-pill">{statusText}</div>
        </div>

        {/* The Artist Canvas Stage */}
        <div className="gc-stage-container">
          <video ref={videoRef} className="gc-video-hidden" />
          <canvas ref={drawCanvasRef} className="gc-main-canvas" />
          <canvas ref={overlayCanvasRef} className="gc-overlay-canvas" />
        </div>

        {/* Hand-Drawn Toolbar */}
        <div className="gc-toolbar">
          <div className="gc-tools-group">
            <button className={`gc-tool-btn ${tool === 'brush' ? 'active' : ''}`} onClick={() => setTool("brush")}>🖌️ Brush</button>
            <button className={`gc-tool-btn ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool("eraser")}>🧽 Eraser</button>
          </div>

          <div className="gc-tools-group">
            <input type="color" className="gc-color-picker" value={colorUI} onChange={(e) => setColorUI(e.target.value)} />
            <input type="range" min="2" max="40" value={brushUI} onChange={(e) => setBrushUI(e.target.value)} />
            <span className="gc-size-text">{brushUI}px</span>
          </div>

          <div className="gc-tools-group">
            <button className="gc-action-btn save" onClick={saveDrawing}>SAVE</button>
            <button className="gc-action-btn clear" onClick={clearDrawing}>CLEAR</button>
          </div>
        </div>
      </div>
    </div>
  );
}