// quickdraw.js
export function analyzeStroke(points) {
  if (!points || points.length < 5) return null;

  const start = points[0];
  const end = points[points.length - 1];

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.hypot(dx, dy);

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  points.forEach(p => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });

  const width = maxX - minX;
  const height = maxY - minY;

  const closed = Math.hypot(end.x - start.x, end.y - start.y) < 20;

  return {
    width,
    height,
    ratio: width / height,
    closed,
    length: dist,
    points
  };
}
