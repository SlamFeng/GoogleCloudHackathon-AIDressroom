import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";

// On-device hand-gesture recognizer (MediaPipe, same WASM fileset as the pose
// model). Runs in the browser — no network, no per-frame cost, video never
// leaves the device. Returns 21 hand landmarks + a labelled gesture per frame.

let recognizerPromise: Promise<GestureRecognizer> | null = null;

export function loadGestureRecognizer(): Promise<GestureRecognizer> {
  if (!recognizerPromise) {
    recognizerPromise = FilesetResolver.forVisionTasks("/mediapipe/wasm").then((vision) =>
      GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "/models/gesture_recognizer.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
      })
    );
  }
  return recognizerPromise;
}
