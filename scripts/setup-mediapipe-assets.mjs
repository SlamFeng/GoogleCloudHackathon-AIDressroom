import { createWriteStream } from "node:fs";
import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import https from "node:https";
import path from "node:path";

const root = process.cwd();
const wasmSource = path.join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const wasmTarget = path.join(root, "public", "mediapipe", "wasm");
const models = [
  {
    label: "Pose Landmarker Lite",
    target: path.join(root, "public", "models", "pose_landmarker_lite.task"),
    url: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
  },
  {
    label: "Gesture Recognizer",
    target: path.join(root, "public", "models", "gesture_recognizer.task"),
    url: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/latest/gesture_recognizer.task"
  }
];

await mkdir(wasmTarget, { recursive: true });
await mkdir(path.join(root, "public", "models"), { recursive: true });

const wasmFiles = await readdir(wasmSource);
await Promise.all(
  wasmFiles.map((file) => copyFile(path.join(wasmSource, file), path.join(wasmTarget, file)))
);
console.log(`Copied ${wasmFiles.length} MediaPipe wasm files.`);

for (const model of models) {
  let hasModel = false;
  try {
    hasModel = (await stat(model.target)).size > 0;
  } catch {
    hasModel = false;
  }
  if (hasModel) {
    console.log(`${model.label} model already exists.`);
  } else {
    await download(model.url, model.target);
    console.log(`Downloaded ${model.label} model.`);
  }
}

function download(url, target) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Download failed with HTTP ${response.statusCode}`));
        response.resume();
        return;
      }

      const file = createWriteStream(target);
      response.pipe(file);
      file.on("finish", () => {
        file.close(resolve);
      });
      file.on("error", reject);
    });

    request.on("error", reject);
  });
}
