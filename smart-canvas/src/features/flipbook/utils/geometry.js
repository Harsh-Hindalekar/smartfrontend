export const HANDLE = 10;

export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function getCssPos(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.width / dpr;
  const cssHeight = canvas.height / dpr;

  return {
    x: (clientX - rect.left) * (cssWidth / rect.width),
    y: (clientY - rect.top) * (cssHeight / rect.height),
  };
}

export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

export function rectHandles(x, y, w, h) {
  const hs = HANDLE;
  return {
    nw: { x: x - hs / 2, y: y - hs / 2, w: hs, h: hs },
    ne: { x: x + w - hs / 2, y: y - hs / 2, w: hs, h: hs },
    sw: { x: x - hs / 2, y: y + h - hs / 2, w: hs, h: hs },
    se: { x: x + w - hs / 2, y: y + h - hs / 2, w: hs, h: hs },
  };
}

export function hitHandle(handles, x, y) {
  for (const k of Object.keys(handles)) {
    if (pointInRect(x, y, handles[k])) return k;
  }
  return null;
}

export function getItemBounds(it) {
  if (it.type === "rect" || it.type === "bitmap") return { x: it.x, y: it.y, w: it.w, h: it.h };
  if (it.type === "circle") return { x: it.cx - it.r, y: it.cy - it.r, w: it.r * 2, h: it.r * 2 };
  if (it.type === "line") {
    const minX = Math.min(it.x1, it.x2);
    const minY = Math.min(it.y1, it.y2);
    const maxX = Math.max(it.x1, it.x2);
    const maxY = Math.max(it.y1, it.y2);
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
  return { x: 0, y: 0, w: 0, h: 0 };
}

export function hitTestItem(items, x, y) {
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (it.type === "rect" || it.type === "bitmap") {
      const b = getItemBounds(it);
      if (pointInRect(x, y, b)) return it.id;
    }
    if (it.type === "circle") {
      const dx = x - it.cx, dy = y - it.cy;
      if (Math.sqrt(dx*dx + dy*dy) <= it.r) return it.id;
    }
    if (it.type === "line") {
      const b = getItemBounds(it);
      const pad = 6;
      if (pointInRect(x, y, { x: b.x - pad, y: b.y - pad, w: b.w + pad*2, h: b.h + pad*2 })) return it.id;
    }
  }
  return null;
}

export function hitLineHandle(it, x, y) {
  const hs = HANDLE;
  const h1 = { x: it.x1 - hs / 2, y: it.y1 - hs / 2, w: hs, h: hs };
  const h2 = { x: it.x2 - hs / 2, y: it.y2 - hs / 2, w: hs, h: hs };
  if (pointInRect(x, y, h1)) return "p1";
  if (pointInRect(x, y, h2)) return "p2";
  return null;
}
