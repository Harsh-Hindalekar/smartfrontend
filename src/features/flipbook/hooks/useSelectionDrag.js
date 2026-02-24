import { useRef } from "react";
import {
  clamp, getCssPos, getItemBounds, hitLineHandle,
  hitTestItem, rectHandles, hitHandle
} from "../utils/geometry";
import {
  getRasterImageData,
  putRasterImageData,
  pushUndo,
  saveRasterAndThumb,
  cutRasterToBitmapItem
} from "../utils/thumbs";

const MIN_SIZE = 14;

export function useSelectionDrag({
  stageRef,
  rasterRef,
  playing,
  toolMode,
  cutBox,
  setCutBox,
  activeFrame,
  activeIndex,
  setFrames,
  selectedId,
  setSelectedId,
  setToolMode,
  CSS_W,
  CSS_H,
  redraw,
}) {
  const dragRef = useRef({
    mode: null,
    handle: null,
    startX: 0,
    startY: 0,
    itemStart: null,
  });

  const onPointerDown = (e) => {
    if (playing) return;
    const canvas = stageRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const { x, y } = getCssPos(e, canvas);

    if (toolMode === "cut") {
      setCutBox({ x, y, w: 0, h: 0, dragging: true });
      return;
    }

    if (toolMode !== "select") return;

    const items = activeFrame?.items || [];
    const selected = items.find((it) => it.id === selectedId);

    if (selected) {
      if (selected.type === "line") {
        const lh = hitLineHandle(selected, x, y);
        if (lh) {
          dragRef.current = { mode: "lineEnd", handle: lh, startX: x, startY: y, itemStart: { ...selected } };
          return;
        }
      } else {
        const b = getItemBounds(selected);
        const handles = rectHandles(b.x, b.y, b.w, b.h);
        const h = hitHandle(handles, x, y);
        if (h) {
          dragRef.current = { mode: "resize", handle: h, startX: x, startY: y, itemStart: { ...selected } };
          return;
        }
      }
    }

    const id = hitTestItem(items, x, y);
    setSelectedId(id);

    if (id) {
      const it = items.find((a) => a.id === id);
      dragRef.current = { mode: "move", handle: null, startX: x, startY: y, itemStart: { ...it } };
    } else {
      dragRef.current = { mode: null, handle: null, startX: 0, startY: 0, itemStart: null };
    }
  };

  const onPointerMove = (e) => {
    if (playing) return;
    const canvas = stageRef.current;
    if (!canvas) return;

    const { x, y } = getCssPos(e, canvas);

    if (toolMode === "cut" && cutBox?.dragging) {
      const nx = Math.min(cutBox.x, x);
      const ny = Math.min(cutBox.y, y);
      const nw = Math.abs(x - cutBox.x);
      const nh = Math.abs(y - cutBox.y);
      setCutBox({ x: nx, y: ny, w: nw, h: nh, dragging: true });
      redraw?.();
      return;
    }

    if (toolMode !== "select") return;

    const d = dragRef.current;
    if (!d.mode || !d.itemStart || !selectedId) return;

    const dx = x - d.startX;
    const dy = y - d.startY;

    setFrames((prev) => {
      const copy = [...prev];
      const f = copy[activeIndex];

      f.items = (f.items || []).map((it) => {
        if (it.id !== selectedId) return it;

        if (d.mode === "move") {
          if (it.type === "rect" || it.type === "bitmap") return { ...it, x: d.itemStart.x + dx, y: d.itemStart.y + dy };
          if (it.type === "circle") return { ...it, cx: d.itemStart.cx + dx, cy: d.itemStart.cy + dy };
          if (it.type === "line") return { ...it, x1: d.itemStart.x1 + dx, y1: d.itemStart.y1 + dy, x2: d.itemStart.x2 + dx, y2: d.itemStart.y2 + dy };
        }

        if (d.mode === "resize") {
          const b0 = getItemBounds(d.itemStart);
          let sx = b0.x, sy = b0.y, sw = b0.w, sh = b0.h;

          if (d.handle === "se") { sw = Math.max(MIN_SIZE, sw + dx); sh = Math.max(MIN_SIZE, sh + dy); }
          else if (d.handle === "nw") {
            const nw = Math.max(MIN_SIZE, sw - dx);
            const nh = Math.max(MIN_SIZE, sh - dy);
            sx = sx + (sw - nw); sy = sy + (sh - nh); sw = nw; sh = nh;
          } else if (d.handle === "ne") {
            const nw = Math.max(MIN_SIZE, sw + dx);
            const nh = Math.max(MIN_SIZE, sh - dy);
            sy = sy + (sh - nh); sw = nw; sh = nh;
          } else if (d.handle === "sw") {
            const nw = Math.max(MIN_SIZE, sw - dx);
            const nh = Math.max(MIN_SIZE, sh + dy);
            sx = sx + (sw - nw); sw = nw; sh = nh;
          }

          if (it.type === "rect" || it.type === "bitmap") return { ...it, x: sx, y: sy, w: sw, h: sh };
          if (it.type === "circle") {
            const r = Math.max(MIN_SIZE / 2, Math.min(sw, sh) / 2);
            return { ...it, cx: sx + sw / 2, cy: sy + sh / 2, r };
          }
        }

        if (d.mode === "lineEnd" && it.type === "line") {
          if (d.handle === "p1") return { ...it, x1: d.itemStart.x1 + dx, y1: d.itemStart.y1 + dy };
          if (d.handle === "p2") return { ...it, x2: d.itemStart.x2 + dx, y2: d.itemStart.y2 + dy };
        }

        return it;
      });

      return copy;
    });

    redraw?.();
  };

  const onPointerUp = (e) => {
    const canvas = stageRef.current;
    if (canvas) {
      try { canvas.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    }

    // finalize CUT (uses frame.raster, not stage snapshot)
    if (toolMode === "cut" && cutBox?.dragging) {
      const box = { ...cutBox, dragging: false };
      setCutBox(box);

      if (box.w < 4 || box.h < 4) return;

      const raster = activeFrame?.raster || getRasterImageData(rasterRef, CSS_W, CSS_H);
      if (!raster) return;

      const sx = clamp(Math.floor(box.x), 0, raster.width - 1);
      const sy = clamp(Math.floor(box.y), 0, raster.height - 1);
      const sw = clamp(Math.floor(box.w), 1, raster.width - sx);
      const sh = clamp(Math.floor(box.h), 1, raster.height - sy);

      pushUndo(setFrames, activeIndex);

      const { newRaster, itemId } = cutRasterToBitmapItem(setFrames, activeIndex, raster, sx, sy, sw, sh);
      saveRasterAndThumb(setFrames, activeIndex, newRaster);

      // update raster canvas pixels too
      putRasterImageData(rasterRef, newRaster, CSS_W, CSS_H);

      setSelectedId(itemId);
      setToolMode("select");
      setCutBox(null);

      redraw?.();
    }

    dragRef.current = { mode: null, handle: null, startX: 0, startY: 0, itemStart: null };
  };

  return { onPointerDown, onPointerMove, onPointerUp };
}
