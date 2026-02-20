import React, { useEffect,useMemo, useRef, useState } from "react";
import Toolbar from "./components/Toolbar";
import Timeline from "./components/Timeline";
import CanvasStage from "./components/CanvasStage";
import { blankFrame } from "./utils/thumbs";
import { Link } from "react-router-dom";
import "./Flipaclip.css";

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
    <div className="fb-page">
      <div className="fb-card">
        <div className="fb-header">
          <Link to="/dashboard" className="fb-back">← Back</Link>
          <div className="fb-ribbon">Flipaclip</div>
          <div className="fb-status">{playing ? `Playing • ${fps} FPS` : `Edit Mode`}</div>
        </div>

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

        <div className="fb-stage-container">
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
        </div>

        <div style={{ marginTop: 6 }}>
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
    </div>
  );
}
