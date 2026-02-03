import { analyzeStroke } from "./quickdraw";

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

    const angle = Math.acos((a*a + b*b - c*c) / (2*a*b)) * (180 / Math.PI);

    if (angle < 120) corners++; // sharp turn
  }

  return corners;
}

function isCircle(points) {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);

  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;

  const radii = points.map(p => Math.hypot(p.x - cx, p.y - cy));
  const avg = radii.reduce((a, b) => a + b, 0) / radii.length;

  const variance =
    radii.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / radii.length;

  return variance < 150;
}
//helper function for detectIntentAI
function isLine(points) {
  const start = points[0];
  const end = points[points.length - 1];

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);

  if (length < 40) return false;

  // measure how far points deviate from straight line
  let totalError = 0;

  for (let p of points) {
    const area = Math.abs(
      (end.x - start.x) * (start.y - p.y) -
      (start.x - p.x) * (end.y - start.y)
    );
    const dist = area / length;
    totalError += dist;
  }

  const avgError = totalError / points.length;

  return avgError < 6; // smaller = straighter
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

    if (diff > 1) sharpTurns++;
  }

  return sharpTurns >= 4 && sharpTurns <= 10;
}
//helper function for detectIntentAI square
function isSquare(points, bounds) {
  const { width, height } = bounds;
  const ratio = width / height;

  // Must be almost equal width & height
  if (ratio < 0.85 || ratio > 1.15) return false;

  // Check if shape has 4 strong corners
  let corners = 0;

  for (let i = 2; i < points.length; i++) {
    const p0 = points[i - 2];
    const p1 = points[i - 1];
    const p2 = points[i];

    const a1 = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    const a2 = Math.atan2(p2.y - p1.y, p2.x - p1.x);

    let diff = Math.abs(a2 - a1);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;

    // 90° corner ≈ 1.57 radians
    if (diff > 1.2 && diff < 2.2) corners++;
  }

  return corners >= 3 && corners <= 8;
}


//main function to detect intent
export function detectIntent(points) {
  const d = analyzeStroke(points);
  if (!d) return "free";

  const { ratio, closed, length, width, height } = d;

  if (!closed) {
    if (isLine(points)) return "line";
    return "free";
  }

  // 🔺 TRIANGLE
  const corners = countCorners(points);
  if (corners >= 2 && corners <= 5 && length < 500) {
    return "triangle";
  }

  // 💎 DIAMOND (tilted square)
  if (isDiamond(points) && ratio > 0.75 && ratio < 1.25) {
    return "diamond";
  }

  // ⬛ SQUARE (better detection)
  if (isSquare(points, { width, height })) {
    return "square";
  }

  // ⚪ CIRCLE
  if (isCircle(points) && length > 120) {
    return "circle";
  }

  // ▭ RECTANGLE
  if (ratio >= 1.2 || ratio <= 0.8) {
    return "rectangle";
  }

  return "free";
}


