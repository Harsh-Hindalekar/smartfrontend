export function analyzeStroke(points) {
  if (!points || points.length < 5) return null;

  const start = points[0];
  const end = points[points.length - 1];

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  let length = 0;

  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    length += Math.hypot(dx, dy);
  }

  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const ratio = width / (height || 1);

  // keep same threshold style
  const closed = Math.hypot(end.x - start.x, end.y - start.y) < 25;

  return { width, height, ratio, closed, length };
}
