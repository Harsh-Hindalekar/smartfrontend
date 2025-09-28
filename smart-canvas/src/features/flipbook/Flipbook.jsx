// src/features/flipbook/Flipbook.jsx
import { useState } from "react";
import { smoothStroke } from "../../utils/api";

export default function Flipbook() {
  const [frames, setFrames] = useState([]);
  const [currentFrame, setCurrentFrame] = useState("");
  const [preview, setPreview] = useState(null);

  async function addFrame() {
    if (!currentFrame.trim()) return;

    // Call backend (simulate stroke smoothing)
    const res = await smoothStroke([currentFrame]);
    setFrames([...frames, res.points.join(", ")]);

    setCurrentFrame("");
  }

  function playAnimation() {
    if (frames.length === 0) return;
    let i = 0;
    const interval = setInterval(() => {
      setPreview(frames[i]);
      i++;
      if (i >= frames.length) clearInterval(interval);
    }, 700);
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>📖 Flipbook</h2>
      <p>Add text frames and preview them as animation.</p>

      <input
        type="text"
        placeholder="Enter frame content"
        value={currentFrame}
        onChange={(e) => setCurrentFrame(e.target.value)}
        style={{ marginRight: "10px", padding: "5px" }}
      />
      <button onClick={addFrame}>Add Frame</button>

      <h3 style={{ marginTop: "20px" }}>Frames:</h3>
      {frames.length > 0 ? (
        <ul>
          {frames.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      ) : (
        <p>No frames yet.</p>
      )}

      <button
        onClick={playAnimation}
        disabled={frames.length === 0}
        style={{ marginTop: "20px" }}
      >
        ▶️ Play
      </button>

      {preview && (
        <h3 style={{ marginTop: "20px", color: "blue" }}>
          Preview: {preview}
        </h3>
      )}
    </div>
  );
}
