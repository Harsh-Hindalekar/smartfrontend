// intentAI.js
import { analyzeStroke } from "./quickdraw";

export function detectIntent(points) {
  const d = analyzeStroke(points);
  if (!d) return "free";

  const { ratio, closed, width, height, length } = d;

  // ---------- OPEN SHAPES ----------
  if (!closed && length > 80) {
    if (length > 120) return "arrow";
    return "line";
  }

  // ---------- CLOSED SHAPES ----------

  // CIRCLE (most strict, highest priority)
  if (closed && ratio > 0.9 && ratio < 1.1) {
    return "circle";
  }

  // ELLIPSE
  if (closed && (ratio <= 0.9 || ratio >= 1.1)) {
    return "ellipse";
  }

  // SQUARE
  if (closed && ratio > 0.85 && ratio < 1.15) {
    return "square";
  }

  // RECTANGLE
  if (closed && (ratio > 1.4 || ratio < 0.7)) {
    return "rectangle";
  }

  // TRIANGLE (short stroke + closed)
  if (closed && points.length < 60) {
    return "triangle";
  }

  // DIAMOND (fallback closed)
  if (closed) {
    return "diamond";
  }

  return "free";
}
