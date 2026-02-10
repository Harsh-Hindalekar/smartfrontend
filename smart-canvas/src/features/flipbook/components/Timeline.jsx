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

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <button onClick={addFrame}>+ Frame</button>
      <button onClick={duplicateFrame}>Duplicate</button>
      <button onClick={deleteFrame} disabled={frames.length <= 1}>Delete</button>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {frames.map((f, idx) => (
          <button
            key={f.id}
            onClick={() => { setPlaying(false); setSelectedId(null); setActiveIndex(idx); }}
            style={{ border: idx===activeIndex ? "2px solid black" : "1px solid #999", padding: 4, width: 72, background:"white" }}
            title={`Frame ${idx + 1}`}
          >
            <div style={{ fontSize: 12, marginBottom: 4 }}>#{idx + 1}</div>
            <img alt="" src={f.thumb || ""} style={{ width: 64, height: 40, objectFit: "cover", background: "#f2f2f2" }} />
          </button>
        ))}
      </div>
    </div>
  );
}
