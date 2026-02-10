import { analyzeStroke } from "./quickdraw";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function safeAcos(v) {
  return Math.acos(clamp(v, -1, 1));
}

function countCorners(points) {
  let corners = 0;

  for (let i = 2; i < points.length - 2; i++) {
    const p0 = points[i - 2];
    const p1 = points[i];
    const p2 = points[i + 2];

    const a = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const b = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const c = Math.hypot(p2.x - p0.x, p2.y - p0.y);

    if (a * b === 0) continue;

    const ang = safeAcos((a * a + b * b - c * c) / (2 * a * b)) * (180 / Math.PI);

    if (ang < 120) corners++;
  }

  return corners;
}

function isCircle(points) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const radii = points.map((p) => Math.hypot(p.x - cx, p.y - cy));
  const avg = radii.reduce((a, b) => a + b, 0) / radii.length;

  const variance = radii.reduce((sum, r) => sum + (r - avg) ** 2, 0) / radii.length;

  // tighter than before
  return variance < 120;
}

function isLine(points) {
  const start = points[0];
  const end = points[points.length - 1];

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length < 60) return false;

  // average distance from line
  let totalError = 0;
  for (const p of points) {
    const area = Math.abs((end.x - start.x) * (start.y - p.y) - (start.x - p.x) * (end.y - start.y));
    totalError += area / length;
  }
  const avgError = totalError / points.length;

  return avgError < 6;
}

function isSquare(points, bounds) {
  const { width, height } = bounds;
  const ratio = width / (height || 1);

  if (ratio < 0.85 || ratio > 1.15) return false;

  let rightishTurns = 0;
  for (let i = 2; i < points.length; i++) {
    const p0 = points[i - 2];
    const p1 = points[i - 1];
    const p2 = points[i];

    const a1 = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    const a2 = Math.atan2(p2.y - p1.y, p2.x - p1.x);

    let diff = Math.abs(a2 - a1);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;

    // around 90 degrees
    if (diff > 1.05 && diff < 2.2) rightishTurns++;
  }

  return rightishTurns >= 3;
}

function isDiamond(points) {
  let sharpTurns = 0;

  for (let i = 2; i < points.length; i++) {
    const p0 = points[i - 2];
    const p1 = points[i - 1];
    const p2 = points[i];

    const a1 = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    const a2 = Math.atan2(p2.y - p1.y, p2.x - p1.x);

    let diff = Math.abs(a2 - a1);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;

    if (diff > 0.95) sharpTurns++;
  }

  return sharpTurns >= 4;
}

export function detectIntent(points) {
  const d = analyzeStroke(points);
  if (!d) return "free";

  const { ratio, closed, length, width, height } = d;

  // OPEN SHAPES
  if (!closed) {
    if (isLine(points)) return "line";
    return "free";
  }

  // Triangle first (so it doesn't get eaten by circle)
  const corners = countCorners(points);
  if (corners >= 2 && corners <= 5 && length < 650) {
    return "triangle";
  }

  // Diamond
  if (isDiamond(points) && ratio > 0.75 && ratio < 1.25) {
    return "diamond";
  }

  // Square
  if (isSquare(points, { width, height })) {
    return "square";
  }

  // Circle
  if (isCircle(points) && length > 140 && ratio > 0.8 && ratio < 1.25) {
    return "circle";
  }

  // Rectangle
  if (ratio >= 1.2 || ratio <= 0.8) {
    return "rectangle";
  }

  return "free";
}
