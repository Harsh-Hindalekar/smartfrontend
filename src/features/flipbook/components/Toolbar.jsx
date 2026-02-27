import React, { useRef } from "react";
import { addCircle, addLine, addRect, addBitmapFromDataURL, redoFrame, undoFrame } from "../utils/thumbs";

export default function Toolbar(props) {
  const {
    playing, toolMode, setToolMode,
    brushTool, setBrushTool,
    color, setColor,
    size, setSize,
    onionSkin, setOnionSkin,
    onionOpacity, setOnionOpacity,
    fps, setFps, setPlaying,
    frames, activeIndex, setFrames, setSelectedId
  } = props;

  const fileInputRef = useRef(null);

  const pickImage = () => fileInputRef.current?.click();

  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataURL = reader.result;
      setToolMode("select");
      const id = addBitmapFromDataURL(setFrames, activeIndex, dataURL);
      setSelectedId(id);
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
      <button onClick={() => setToolMode("draw")} disabled={playing} style={{ fontWeight: toolMode==="draw" ? "bold" : "normal" }}>Draw</button>
      <button onClick={() => setToolMode("select")} disabled={playing} style={{ fontWeight: toolMode==="select" ? "bold" : "normal" }}>Select</button>
      <button onClick={() => setToolMode("cut")} disabled={playing} style={{ fontWeight: toolMode==="cut" ? "bold" : "normal" }}>Cut & Move</button>

      <label>
        Brush:&nbsp;
        <select value={brushTool} onChange={(e)=>setBrushTool(e.target.value)} disabled={playing || toolMode!=="draw"}>
          <option value="pencil">Pencil</option>
          <option value="eraser">Eraser</option>
        </select>
      </label>

      <label>
        Color:&nbsp;
        <input type="color" value={color} onChange={(e)=>setColor(e.target.value)} disabled={playing || toolMode!=="draw" || brushTool==="eraser"} />
      </label>

      <label>
        Size:&nbsp;
        <input type="range" min="1" max="30" value={size} onChange={(e)=>setSize(Number(e.target.value))} disabled={playing || toolMode!=="draw"} />
        &nbsp;{size}
      </label>

      <button onClick={() => undoFrame(setFrames, activeIndex)} disabled={playing || !(frames[activeIndex]?.undo?.length)}>Undo</button>
      <button onClick={() => redoFrame(setFrames, activeIndex)} disabled={playing || !(frames[activeIndex]?.redo?.length)}>Redo</button>

      <button onClick={() => { setToolMode("select"); setSelectedId(addRect(setFrames, activeIndex)); }} disabled={playing}>+ Rect</button>
      <button onClick={() => { setToolMode("select"); setSelectedId(addCircle(setFrames, activeIndex)); }} disabled={playing}>+ Circle</button>
      <button onClick={() => { setToolMode("select"); setSelectedId(addLine(setFrames, activeIndex)); }} disabled={playing}>+ Line</button>

      <button onClick={pickImage} disabled={playing}>+ Image</button>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickImage} style={{ display: "none" }} />

      <label style={{ display:"flex", gap:6, alignItems:"center" }}>
        <input type="checkbox" checked={onionSkin} onChange={(e)=>setOnionSkin(e.target.checked)} disabled={playing} />
        Onion
      </label>
      {onionSkin && (
        <label>
          Opacity:&nbsp;
          <input type="range" min="0" max="0.9" step="0.05" value={onionOpacity} onChange={(e)=>setOnionOpacity(Number(e.target.value))} disabled={playing} />
          &nbsp;{onionOpacity.toFixed(2)}
        </label>
      )}

      <div style={{ marginLeft:"auto", display:"flex", gap:10, alignItems:"center" }}>
        <label>
          FPS:&nbsp;
          <input type="number" min="1" max="24" value={fps} onChange={(e)=>setFps(Number(e.target.value))} style={{ width: 64 }} />
        </label>
        <button onClick={() => setPlaying(p => !p)}>{playing ? "Pause" : "Play"}</button>
      </div>
    </div>
  );
}
