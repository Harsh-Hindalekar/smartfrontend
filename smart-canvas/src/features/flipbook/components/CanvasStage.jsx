import React, { useEffect, useRef, useState } from "react";
import { useCanvasDraw } from "../useCanvasDraw";
import { useDprCanvas } from "../hooks/useDprCanvas";
import { useSelectionDrag } from "../hooks/useSelectionDrag";
import {
  drawStageAll,
  getRasterImageData,
  putRasterImageData,
  pushUndo,
  saveRasterAndThumb,
} from "../utils/thumbs";

const CSS_W = 900;
const CSS_H = 520;

export default function CanvasStage({
  stageRef,          // visible canvas
  rasterRef,         // hidden raster canvas
  frames,
  setFrames,
  activeIndex,
  activeFrame,
  prevFrame,
  toolMode,
  brushTool,
  color,
  size,
  onionSkin,
  onionOpacity,
  playing,
  selectedId,
  setSelectedId,
  setToolMode,
}) {
  const [cutBox, setCutBox] = useState(null);
  const imgCacheRef = useRef(new Map());

  // DPR setup for BOTH canvases
  useDprCanvas(stageRef, CSS_W, CSS_H);
  useDprCanvas(rasterRef, CSS_W, CSS_H);

  // Whenever frame changes, load raster pixels into raster canvas
  useEffect(() => {
    // Clear raster canvas
    putRasterImageData(rasterRef, activeFrame?.raster || null, CSS_W, CSS_H);

    // Redraw stage canvas
    drawStageAll(
      stageRef,
      imgCacheRef,
      prevFrame,
      activeFrame,
      onionSkin,
      onionOpacity,
      selectedId,
      toolMode,
      cutBox,
      CSS_W,
      CSS_H
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  // Render stage whenever visuals change
  useEffect(() => {
    drawStageAll(
      stageRef,
      imgCacheRef,
      prevFrame,
      activeFrame,
      onionSkin,
      onionOpacity,
      selectedId,
      toolMode,
      cutBox,
      CSS_W,
      CSS_H
    );
  }, [frames, onionSkin, onionOpacity, selectedId, toolMode, cutBox, activeIndex, prevFrame, activeFrame, stageRef]);

  // ✅ Draw ONLY on raster canvas (not stage)
  useCanvasDraw({
    inputRef: stageRef,     // ✅ listen on the visible canvas
    targetRef: rasterRef,   // ✅ draw pixels on hidden raster
    color,
    size,
    tool: brushTool,
    enabled: !playing && toolMode === "draw",
    
    onStrokeStart: () => {
        pushUndo(setFrames, activeIndex);
    },

  // ✅ so you SEE drawing live (stage updates while drawing)
    onStrokeMove: () => {
        const liveRaster = getRasterImageData(rasterRef, CSS_W, CSS_H);
        drawStageAll(
            stageRef,
            imgCacheRef,
            prevFrame,
            { ...activeFrame, raster: liveRaster },
            onionSkin,
            onionOpacity,
            selectedId,
            toolMode,
            cutBox,
            CSS_W,
            CSS_H
        );
    },

    onStrokeEnd: () => {
        const raster = getRasterImageData(rasterRef, CSS_W, CSS_H);
        saveRasterAndThumb(setFrames, activeIndex, raster);

        drawStageAll(
            stageRef,
            imgCacheRef,
            prevFrame,
            { ...activeFrame, raster },
            onionSkin,
            onionOpacity,
            selectedId,
            toolMode,
            cutBox,
            CSS_W,
            CSS_H
        );
    },
});


  // ✅ Select/Move/Resize/Cut works on items + frame.raster
  const { onPointerDown, onPointerMove, onPointerUp } = useSelectionDrag({
    stageRef,
    rasterRef,
    playing,
    toolMode,
    cutBox,
    setCutBox,
    activeFrame,
    prevFrame,
    frames,
    activeIndex,
    setFrames,
    selectedId,
    setSelectedId,
    setToolMode,
    CSS_W,
    CSS_H,
    redraw: () =>
      drawStageAll(
        stageRef,
        imgCacheRef,
        prevFrame,
        frames[activeIndex],
        onionSkin,
        onionOpacity,
        selectedId,
        toolMode,
        cutBox,
        CSS_W,
        CSS_H
      ),
  });

  return (
    <div className="fb-stage-inner" style={{ width: "100%", height: "100%" }}>
      {/* Visible stage */}
      <canvas
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        className="fb-canvas"
        style={{ background: "white", touchAction: "none", display: "block" }}
      />

      {/* Hidden raster canvas */}
      <canvas ref={rasterRef} style={{ display: "none" }} />

      <div style={{ fontSize: 13, padding: 8, opacity: 0.85 }}>
        <b>Cut & Move:</b> Cut mode → drag box → release → it becomes movable.
      </div>
    </div>
  );
}
