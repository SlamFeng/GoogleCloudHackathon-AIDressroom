import { createWriteStream } from "node:fs";
import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import https from "node:https";
import path from "node:path";

const root = process.cwd();
const wasmSource = path.join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const wasmTarget = path.join(root, "public", "mediapipe", "wasm");
const modelTarget = path.join(root, "public", "models", "pose_landmarker_lite.task");
const modelUrl =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";

await mkdir(wasmTarget, { recursive: true });
await mkdir(path.dirname(modelTarget), { recursive: true });

const wasmFiles = await readdir(wasmSource);
await Promise.all(
  wasmFiles.map((file) => copyFile(path.join(wasmSource, file), path.join(wasmTarget, file)))
);
console.log(`Copied ${wasmFiles.length} MediaPipe wasm files.`);

let hasModel = false;
try {
  const modelStats = await stat(modelTarget);
  hasModel = modelStats.size > 0;
} catch {
  hasModel = false;
}

if (hasModel) {
  console.log("Pose model already exists.");
} else {
  await download(modelUrl, modelTarget);
  console.log("Downloaded Pose Landmarker Lite model.");
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
