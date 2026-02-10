export function makeShape(type, points) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const w = maxX - minX;
  const h = maxY - minY;

  switch (type) {
    case "circle": {
      const r = Math.max(6, Math.min(w, h) / 2);
      const N = 64;
      return Array.from({ length: N + 1 }, (_, i) => {
        const a = (i / N) * Math.PI * 2;
        return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
      });
    }

    case "square": {
      const size = Math.max(10, Math.min(w, h));
      const x0 = cx - size / 2;
      const y0 = cy - size / 2;
      return [
        { x: x0, y: y0 },
        { x: x0 + size, y: y0 },
        { x: x0 + size, y: y0 + size },
        { x: x0, y: y0 + size },
        { x: x0, y: y0 },
      ];
    }

    case "rectangle": {
      return [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
        { x: minX, y: minY },
      ];
    }

    case "triangle": {
      return [
        { x: cx, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
        { x: cx, y: minY },
      ];
    }

    case "diamond": {
      return [
        { x: cx, y: minY },
        { x: maxX, y: cy },
        { x: cx, y: maxY },
        { x: minX, y: cy },
        { x: cx, y: minY },
      ];
    }

    case "line": {
      return [
        { x: minX, y: minY },
        { x: maxX, y: maxY },
      ];
    }

    default:
      return points;
  }
}
