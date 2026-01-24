// shapeFactory.js
export function makeShape(type, points) {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  switch (type) {
    case "circle": {
      const r = Math.min(maxX - minX, maxY - minY) / 2;
      return Array.from({ length: 64 }, (_, i) => {
        const a = (i / 64) * Math.PI * 2;
        return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
      });
    }

    case "ellipse": {
      const rx = (maxX - minX) / 2;
      const ry = (maxY - minY) / 2;
      return Array.from({ length: 64 }, (_, i) => {
        const a = (i / 64) * Math.PI * 2;
        return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
      });
    }

    case "square": {
      const size = Math.min(maxX - minX, maxY - minY);
      return [
        { x: minX, y: minY },
        { x: minX + size, y: minY },
        { x: minX + size, y: minY + size },
        { x: minX, y: minY + size },
        { x: minX, y: minY }
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
        { x: minX, y: maxY },
        { x: maxX, y: maxY },
        { x: cx, y: minY }
      ];

    case "diamond":
      return [
        { x: cx, y: minY },
        { x: maxX, y: cy },
        { x: cx, y: maxY },
        { x: minX, y: cy },
        { x: cx, y: minY }
      ];

    case "arrow":
      return [
        { x: minX, y: cy },
        { x: maxX - 20, y: cy },
        { x: maxX - 35, y: cy - 12 },
        { x: maxX, y: cy },
        { x: maxX - 35, y: cy + 12 },
        { x: maxX - 20, y: cy }
      ];

    case "line":
      return [
        { x: minX, y: minY },
        { x: maxX, y: maxY }
      ];

    default:
      return points;
  }
}
