import * as tf from "@tensorflow/tfjs";

let model = null;

export async function loadModel() {
  if (model) return model;
  model = await tf.loadLayersModel(
    "https://storage.googleapis.com/tfjs-models/tfjs/quickdraw/model.json"
  );
  return model;
}

export async function recognize(points) {
  const mdl = await loadModel();

  // Flatten + normalize
  const flat = points.flatMap(p => [p.x / 800, p.y / 500]);
  const input = new Array(784).fill(0);
  flat.slice(0, 784).forEach((v, i) => input[i] = v);

  const tensor = tf.tensor(input, [1, 784]);
  const prediction = mdl.predict(tensor);
  const data = await prediction.data();

  let max = 0, index = 0;
  data.forEach((v, i) => {
    if (v > max) {
      max = v;
      index = i;
    }
  });

  return { index, confidence: max };
}
