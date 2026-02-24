import React, { useEffect, useMemo, useRef, useState } from "react";
import Toolbar from "./components/Toolbar";
import Timeline from "./components/Timeline";
import CanvasStage from "./components/CanvasStage";
import { blankFrame } from "./utils/thumbs";

export default function Flipaclip() {
  const stageRef = useRef(null);   // visible canvas
  const rasterRef = useRef(null);  // hidden raster canvas

  const [frames, setFrames] = useState(() => [blankFrame()]);
  const [activeIndex, setActiveIndex] = useState(0);

  const [toolMode, setToolMode] = useState("draw");
  const [brushTool, setBrushTool] = useState("pencil");
  const [color, setColor] = useState("#111111");
  const [size, setSize] = useState(4);

  const [onionSkin, setOnionSkin] = useState(true);
  const [onionOpacity, setOnionOpacity] = useState(0.25);

  const [playing, setPlaying] = useState(false);
  const [fps, setFps] = useState(8);

  const [selectedId, setSelectedId] = useState(null);

  const activeFrame = frames[activeIndex];
  const prevFrame = useMemo(() => (activeIndex > 0 ? frames[activeIndex - 1] : null), [frames, activeIndex]);

  useEffect(() => {
    if (!playing) return;

    let i = activeIndex;
    const timer = setInterval(() => {
      i = (i + 1) % frames.length;
      setActiveIndex(i);
      setSelectedId(null);
    }, Math.max(20, Math.floor(1000 / fps)));
    return () => clearInterval(timer);
  }, [playing, fps, frames.length]); // ✅ do NOT include activeIndex here

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "12px",
      background: "#f1f5f9",
      boxSizing: "border-box",
      color: "#1e293b"
    }}>
      <div style={{ width: "100%", maxWidth: "1200px", display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Smart-Canvas • Flipaclip Mode</h2>

        <Toolbar
          playing={playing}
          toolMode={toolMode}
          setToolMode={setToolMode}
          brushTool={brushTool}
          setBrushTool={setBrushTool}
          color={color}
          setColor={setColor}
          size={size}
          setSize={setSize}
          onionSkin={onionSkin}
          setOnionSkin={setOnionSkin}
          onionOpacity={onionOpacity}
          setOnionOpacity={setOnionOpacity}
          fps={fps}
          setFps={setFps}
          setPlaying={setPlaying}
          frames={frames}
          activeIndex={activeIndex}
          setFrames={setFrames}
          setSelectedId={setSelectedId}
        />

        <CanvasStage
          stageRef={stageRef}
          rasterRef={rasterRef}
          frames={frames}
          setFrames={setFrames}
          activeIndex={activeIndex}
          activeFrame={activeFrame}
          prevFrame={prevFrame}
          toolMode={toolMode}
          brushTool={brushTool}
          color={color}
          size={size}
          onionSkin={onionSkin}
          onionOpacity={onionOpacity}
          playing={playing}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          setToolMode={setToolMode}
        />

        <Timeline
          frames={frames}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          setFrames={setFrames}
          setPlaying={setPlaying}
          setSelectedId={setSelectedId}
          setToolMode={setToolMode}
        />
      </div>
    </div>
  );
}
