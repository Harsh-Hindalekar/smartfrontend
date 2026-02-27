import { extractRegionToDataURL, clearRegionInImageData } from "./rasterCut";
import { getItemBounds, rectHandles, HANDLE } from "./geometry";

/* ------------------ basics ------------------ */
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function blankFrame() {
  return {
    id: uid(),
    raster: null, // ImageData
    items: [], // shapes/images/cut pieces
    undo: [],
    redo: [],
    thumb: null, // png dataURL
  };
}

export function makeThumb(imageData) {
  if (!imageData) return null;

  const c = document.createElement("canvas");
  c.width = 160;
  c.height = 90;
  const ctx = c.getContext("2d");

  const temp = document.createElement("canvas");
  temp.width = imageData.width;
  temp.height = imageData.height;
  temp.getContext("2d").putImageData(imageData, 0, 0);

  ctx.drawImage(temp, 0, 0, 160, 90);
  return c.toDataURL("image/png");
}

/* ------------------ undo/redo for raster ------------------ */
export function pushUndo(setFrames, activeIndex) {
  setFrames((prev) => {
    const copy = [...prev];
    const f = copy[activeIndex];
    if (f.raster) f.undo = [...(f.undo || []), f.raster];
    f.redo = [];
    return copy;
  });
}

export function saveRasterAndThumb(setFrames, activeIndex, raster) {
  if (!raster) return;
  setFrames((prev) => {
    const copy = [...prev];
    const f = copy[activeIndex];
    f.raster = raster;
    f.thumb = makeThumb(raster);
    return copy;
  });
}

export function undoFrame(setFrames, activeIndex) {
  setFrames((prev) => {
    const copy = [...prev];
    const f = copy[activeIndex];

    if (!f.undo || f.undo.length === 0) return prev;

    const last = f.undo[f.undo.length - 1];
    f.undo = f.undo.slice(0, -1);

    if (f.raster) f.redo = [...(f.redo || []), f.raster];

    f.raster = last;
    f.thumb = makeThumb(last);
    return copy;
  });
}

export function redoFrame(setFrames, activeIndex) {
  setFrames((prev) => {
    const copy = [...prev];
    const f = copy[activeIndex];

    if (!f.redo || f.redo.length === 0) return prev;

    const last = f.redo[f.redo.length - 1];
    f.redo = f.redo.slice(0, -1);

    if (f.raster) f.undo = [...(f.undo || []), f.raster];

    f.raster = last;
    f.thumb = makeThumb(last);
    return copy;
  });
}

/* ------------------ add ready items ------------------ */
export function addRect(setFrames, activeIndex) {
  const id = uid();
  setFrames((prev) => {
    const copy = [...prev];
    copy[activeIndex].items.push({
      id,
      type: "rect",
      x: 140,
      y: 120,
      w: 180,
      h: 120,
      color: "#111",
      size: 2,
    });
    return copy;
  });
  return id;
}

export function addCircle(setFrames, activeIndex) {
  const id = uid();
  setFrames((prev) => {
    const copy = [...prev];
    copy[activeIndex].items.push({
      id,
      type: "circle",
      cx: 260,
      cy: 240,
      r: 70,
      color: "#111",
      size: 2,
    });
    return copy;
  });
  return id;
}

export function addLine(setFrames, activeIndex) {
  const id = uid();
  setFrames((prev) => {
    const copy = [...prev];
    copy[activeIndex].items.push({
      id,
      type: "line",
      x1: 180,
      y1: 180,
      x2: 420,
      y2: 320,
      color: "#111",
      size: 3,
    });
    return copy;
  });
  return id;
}

export function addBitmapFromDataURL(setFrames, activeIndex, dataURL) {
  const id = uid();
  setFrames((prev) => {
    const copy = [...prev];
    copy[activeIndex].items.push({
      id,
      type: "bitmap",
      x: 140,
      y: 90,
      w: 260,
      h: 180,
      dataURL,
    });
    return copy;
  });
  return id;
}

/* ------------------ raster read/write helpers ------------------ */
/** Get ImageData from the HIDDEN raster canvas (CSS sized because ctx is DPR-scaled) */
export function getRasterImageData(rasterRef, cssW, cssH) {
  const c = rasterRef.current;
  if (!c) return null;
  const ctx = c.getContext("2d");
  return ctx.getImageData(0, 0, cssW, cssH);
}

/** Put ImageData into hidden raster canvas */
export function putRasterImageData(rasterRef, imageData, cssW, cssH) {
  const c = rasterRef.current;
  if (!c) return;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, cssW, cssH);

  if (!imageData) return;

  const temp = document.createElement("canvas");
  temp.width = imageData.width;
  temp.height = imageData.height;
  temp.getContext("2d").putImageData(imageData, 0, 0);

  ctx.drawImage(temp, 0, 0, cssW, cssH);
}

/* ------------------ cut raster -> movable bitmap item ------------------ */
export function cutRasterToBitmapItem(setFrames, activeIndex, raster, sx, sy, sw, sh) {
  const pieceDataURL = extractRegionToDataURL(raster, sx, sy, sw, sh);
  const newRaster = clearRegionInImageData(raster, sx, sy, sw, sh);

  const itemId = uid();
  setFrames((prev) => {
    const copy = [...prev];
    copy[activeIndex].items.push({
      id: itemId,
      type: "bitmap",
      x: sx,
      y: sy,
      w: sw,
      h: sh,
      dataURL: pieceDataURL,
    });
    return copy;
  });

  return { newRaster, itemId };
}

/* ------------------ draw stage composite (visible canvas) ------------------ */
/**
 * Draws: onion(prev raster) + current raster + items + selection + cut box
 * stageRef: visible canvas ref
 * imgCacheRef: useRef(new Map()) holding dataURL => Image
 */
export function drawStageAll(
  stageRef,
  imgCacheRef,
  prevFrame,
  currFrame,
  onionSkin,
  onionOpacity,
  selectedId,
  toolMode,
  cutBox,
  CSS_W,
  CSS_H
) {
  const canvas = stageRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, CSS_W, CSS_H);

  const drawRaster = (imageData, alpha = 1) => {
    if (!imageData) return;
    const temp = document.createElement("canvas");
    temp.width = imageData.width;
    temp.height = imageData.height;
    temp.getContext("2d").putImageData(imageData, 0, 0);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(temp, 0, 0, CSS_W, CSS_H);
    ctx.restore();
  };

  // ✅ NEW: draw items (shapes/bitmaps) with alpha (no selection handles)
  const drawItems = (items, alpha) => {
    ctx.save();
    ctx.globalAlpha = alpha;

    for (const it of items || []) {
      // shapes
      if (it.type === "rect") {
        ctx.strokeStyle = it.color || "#111";
        ctx.lineWidth = it.size || 2;
        ctx.strokeRect(it.x, it.y, it.w, it.h);
      }

      if (it.type === "circle") {
        ctx.strokeStyle = it.color || "#111";
        ctx.lineWidth = it.size || 2;
        ctx.beginPath();
        ctx.arc(it.cx, it.cy, it.r, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (it.type === "line") {
        ctx.strokeStyle = it.color || "#111";
        ctx.lineWidth = it.size || 2;
        ctx.beginPath();
        ctx.moveTo(it.x1, it.y1);
        ctx.lineTo(it.x2, it.y2);
        ctx.stroke();
      }

      // bitmap
      if (it.type === "bitmap" && it.dataURL) {
        const cache = imgCacheRef.current;

        const drawImg = (img) => {
          ctx.drawImage(img, it.x, it.y, it.w, it.h);
        };

        if (cache.has(it.dataURL)) {
          const img = cache.get(it.dataURL);
          if (img.complete) drawImg(img);
          else img.onload = () => drawImg(img);
        } else {
          const img = new Image();
          img.onload = () => drawImg(img);
          img.src = it.dataURL;
          cache.set(it.dataURL, img);
        }
      }
    }

    ctx.restore();
  };

  // ✅ UPDATED: onion skin shows raster + items from previous frame
  if (onionSkin) {
    if (prevFrame?.raster) drawRaster(prevFrame.raster, onionOpacity);
    if (prevFrame?.items?.length) drawItems(prevFrame.items, onionOpacity * 0.85);
  }

  // current raster
  if (currFrame?.raster) drawRaster(currFrame.raster, 1);

  // items (current frame)
  for (const it of currFrame?.items || []) {
    if (it.type === "rect") {
      ctx.strokeStyle = it.color || "#111";
      ctx.lineWidth = it.size || 2;
      ctx.strokeRect(it.x, it.y, it.w, it.h);
    }

    if (it.type === "circle") {
      ctx.strokeStyle = it.color || "#111";
      ctx.lineWidth = it.size || 2;
      ctx.beginPath();
      ctx.arc(it.cx, it.cy, it.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (it.type === "line") {
      ctx.strokeStyle = it.color || "#111";
      ctx.lineWidth = it.size || 2;
      ctx.beginPath();
      ctx.moveTo(it.x1, it.y1);
      ctx.lineTo(it.x2, it.y2);
      ctx.stroke();
    }

    if (it.type === "bitmap" && it.dataURL) {
      const cache = imgCacheRef.current;

      const drawImg = (img) => {
        ctx.drawImage(img, it.x, it.y, it.w, it.h);
      };

      if (cache.has(it.dataURL)) {
        const img = cache.get(it.dataURL);
        if (img.complete) drawImg(img);
        else img.onload = () => drawImg(img);
      } else {
        const img = new Image();
        img.onload = () => drawImg(img);
        img.src = it.dataURL;
        cache.set(it.dataURL, img);
      }
    }

    // selection UI (only for current frame + select tool)
    if (it.id === selectedId && toolMode === "select") {
      const b = getItemBounds(it);

      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.setLineDash([]);

      if (it.type === "line") {
        const hs = HANDLE;
        const h1 = { x: it.x1 - hs / 2, y: it.y1 - hs / 2, w: hs, h: hs };
        const h2 = { x: it.x2 - hs / 2, y: it.y2 - hs / 2, w: hs, h: hs };
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#000";
        ctx.fillRect(h1.x, h1.y, h1.w, h1.h);
        ctx.strokeRect(h1.x, h1.y, h1.w, h1.h);
        ctx.fillRect(h2.x, h2.y, h2.w, h2.h);
        ctx.strokeRect(h2.x, h2.y, h2.w, h2.h);
      } else {
        const handles = rectHandles(b.x, b.y, b.w, b.h);
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#000";
        for (const k of Object.keys(handles)) {
          const hr = handles[k];
          ctx.fillRect(hr.x, hr.y, hr.w, hr.h);
          ctx.strokeRect(hr.x, hr.y, hr.w, hr.h);
        }
      }
      ctx.restore();
    }
  }

  // cut box overlay
  if (cutBox && toolMode === "cut") {
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.strokeRect(cutBox.x, cutBox.y, cutBox.w, cutBox.h);
    ctx.restore();
  }
}


