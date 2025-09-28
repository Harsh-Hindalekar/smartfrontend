// src/features/ai-drawing/AiDrawing.jsx
import { useState } from "react";
import { recognizeShape } from "../../utils/api";

export default function AiDrawing() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  async function handleProcess() {
    if (!input.trim()) {
      setOutput("⚠️ Please type a shape first.");
      return;
    }

    // Call backend
    const res = await recognizeShape([input]);
    if (res.shape) {
      setOutput(`✅ AI recognized your shape as: "${res.shape}" (confidence: ${res.confidence})`);
    } else {
      setOutput("❌ Failed to recognize shape.");
    }
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>🤖 AI Drawing</h2>
      <p>Type a shape name (placeholder → backend model will replace later).</p>
      <input
        type="text"
        placeholder="Enter shape"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        style={{ marginRight: "10px", padding: "5px" }}
      />
      <button onClick={handleProcess}>Send to AI</button>
      {output && <p style={{ marginTop: "15px" }}>{output}</p>}
    </div>
  );
}
