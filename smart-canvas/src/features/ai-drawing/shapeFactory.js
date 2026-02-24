export function makeShape(type, points) {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);

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
      const r = Math.min(w, h) / 2;
      return Array.from({ length: 60 }, (_, i) => {
        const a = (i / 60) * Math.PI * 2;
        return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
      });
    }

    case "square": {
      const size = Math.min(w, h);
      return [
        { x: cx - size / 2, y: cy - size / 2 },
        { x: cx + size / 2, y: cy - size / 2 },
        { x: cx + size / 2, y: cy + size / 2 },
        { x: cx - size / 2, y: cy + size / 2 },
        { x: cx - size / 2, y: cy - size / 2 }
      ];
    }

    case "rectangle":
      return [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
        { x: minX, y: minY }
      ];

    case "triangle":
      return [
        { x: cx, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
        { x: cx, y: minY }
      ];

    case "line":
      return [
        { x: minX, y: minY },
        { x: maxX, y: maxY }
      ];

    case "diamond":
      return [
        { x: cx, y: minY },
        { x: maxX, y: cy },
        { x: cx, y: maxY },
        { x: minX, y: cy },
        { x: cx, y: minY }
      ];

    default:
      return points;
  }
}
