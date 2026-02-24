import React from "react";
import { blankFrame } from "../utils/thumbs";

export default function Timeline({ frames, activeIndex, setActiveIndex, setFrames, setPlaying, setSelectedId, setToolMode }) {
  const addFrame = () => {
    setPlaying(false);
    setSelectedId(null);
    setToolMode("draw");
    setFrames(prev => [...prev, blankFrame()]);
    setActiveIndex(frames.length);
  };

  const duplicateFrame = () => {
    setPlaying(false);
    const f = frames[activeIndex];
    const nf = blankFrame();
    nf.raster = f.raster;
    nf.thumb = f.thumb;
    nf.items = (f.items || []).map(it => ({ ...it, id: Math.random().toString(36).slice(2) + Date.now().toString(36) }));
    setFrames(prev => {
      const copy = [...prev];
      copy.splice(activeIndex + 1, 0, nf);
      return copy;
    });
    setSelectedId(null);
    setActiveIndex(activeIndex + 1);
  };

  const deleteFrame = () => {
    setPlaying(false);
    if (frames.length <= 1) return;
    setFrames(prev => prev.filter((_, i) => i !== activeIndex));
    setSelectedId(null);
    setActiveIndex(i => Math.max(0, i - 1));
  };

  const btnStyle = {
    background: "#fff",
    color: "#1e293b",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    padding: "4px 12px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    gap: "4px"
  };

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", color: "#1e293b" }}>
      <button style={btnStyle} onClick={addFrame}>+ Frame</button>
      <button style={btnStyle} onClick={duplicateFrame}>Duplicate</button>
      <button style={{ ...btnStyle, opacity: frames.length <= 1 ? 0.5 : 1 }} onClick={deleteFrame} disabled={frames.length <= 1}>Delete</button>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {frames.map((f, idx) => (
          <button
            key={f.id}
            onClick={() => { setPlaying(false); setSelectedId(null); setActiveIndex(idx); }}
            style={{
              ...btnStyle,
              padding: 4,
              width: 72,
              flexDirection: "column",
              height: "auto",
              border: idx === activeIndex ? "2px solid #2563eb" : "1px solid #d1d5db",
              background: idx === activeIndex ? "#eff6ff" : "#fff"
            }}
            title={`Frame ${idx + 1}`}
          >
            <div style={{ fontSize: 10, marginBottom: 2 }}>#{idx + 1}</div>
            <img alt="" src={f.thumb || ""} style={{ width: 62, height: 38, objectFit: "cover", background: "#f8fafc", borderRadius: 2 }} />
          </button>
        ))}
      </div>
    </div>
  );
}
