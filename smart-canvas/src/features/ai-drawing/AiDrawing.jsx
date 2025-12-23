import React, { useRef, useState, useEffect } from "react";
import * as tf from "@tensorflow/tfjs";

let model = null;

// Load QuickDraw pretrained model
async function loadModel() {
  if (model) return model;
  model = await tf.loadLayersModel(
    "https://storage.googleapis.com/tfjs-models/tfjs/quickdraw/model.json"
  );
  return model;
}

// Simple label map (expand later)
const SHAPE_MAP = {
  0: "circle",
  1: "square",
  2: "triangle",
};

export default function AICanvasHost() {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const c = canvasRef.current;
    c.width = 800;
    c.height = 500;
    const ctx = c.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#000";
  }, []);

  const getCursor = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onDown = (e) => {
    setDrawing(true);
    const p = getCursor(e);
    setPoints([p]);

    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const onMove = (e) => {
    if (!drawing) return;
    const p = getCursor(e);
    setPoints((prev) => [...prev, p]);

    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const onUp = async () => {
    if (!drawing) return;
    setDrawing(false);

    if (points.length < 10) return;

    await recognizeDrawing();
  };

  const recognizeDrawing = async () => {
    setLoading(true);

    try {
      const mdl = await loadModel();

      // Flatten + normalize points
      const flat = points.flatMap((p) => [
        p.x / 800,
        p.y / 500,
      ]);

      const inputArr = new Array(784).fill(0);
      flat.slice(0, 784).forEach((v, i) => (inputArr[i] = v));

      const input = tf.tensor(inputArr, [1, 784]);
      const output = mdl.predict(input);
      const data = await output.data();

      let max = 0;
      let index = 0;
      data.forEach((v, i) => {
        if (v > max) {
          max = v;
          index = i;
        }
      });

      const label = SHAPE_MAP[index] || "unknown";
      setResult({ label, confidence: max });

      if (max > 0.6) {
        drawPerfectShape(label);
      }
    } catch (err) {
      console.error("Recognition error:", err);
    } finally {
      setLoading(false);
    }
  };

  const drawPerfectShape = (shape) => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, 800, 500);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 4;

    if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(400, 250, 120, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (shape === "square") {
      ctx.strokeRect(280, 130, 240, 240);
    }

    if (shape === "triangle") {
      ctx.beginPath();
      ctx.moveTo(400, 120);
      ctx.lineTo(260, 380);
      ctx.lineTo(540, 380);
      ctx.closePath();
      ctx.stroke();
    }
  };

  const clearCanvas = () => {
    const c = canvasRef.current;
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
    setPoints([]);
    setResult(null);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      <h1>AI Smart Canvas</h1>
      <p>Draw roughly. AI will recognize and redraw perfectly.</p>

      <canvas
        ref={canvasRef}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        style={{
          border: "2px solid black",
          cursor: "crosshair",
          background: "#fff",
          display: "block",
          marginBottom: "15px",
        }}
      />

      <div style={{ marginBottom: "15px" }}>
        <button
          onClick={clearCanvas}
          style={{ padding: "10px 20px", cursor: "pointer" }}
        >
          Clear
        </button>
      </div>

      {loading && <p>Recognizing...</p>}

      {result && (
        <div>
          <strong>Detected:</strong> {result.label} <br />
          <strong>Confidence:</strong>{" "}
          {(result.confidence * 100).toFixed(2)}%
        </div>
      )}
    </div>
  );
}
