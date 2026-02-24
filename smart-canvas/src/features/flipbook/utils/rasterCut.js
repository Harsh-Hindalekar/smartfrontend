export function extractRegionToDataURL(imageData, sx, sy, sw, sh) {
  const temp = document.createElement("canvas");
  temp.width = sw;
  temp.height = sh;
  const ctx = temp.getContext("2d");
  const sub = ctx.createImageData(sw, sh);

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const src = ((sy + y) * imageData.width + (sx + x)) * 4;
      const dst = (y * sw + x) * 4;
      sub.data[dst + 0] = imageData.data[src + 0];
      sub.data[dst + 1] = imageData.data[src + 1];
      sub.data[dst + 2] = imageData.data[src + 2];
      sub.data[dst + 3] = imageData.data[src + 3];
    }
  }

  ctx.putImageData(sub, 0, 0);
  return temp.toDataURL("image/png");
}

export function clearRegionInImageData(imageData, sx, sy, sw, sh) {
  const copy = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const idx = ((sy + y) * copy.width + (sx + x)) * 4;
      copy.data[idx + 3] = 0;
    }
  }
  return copy;
}
