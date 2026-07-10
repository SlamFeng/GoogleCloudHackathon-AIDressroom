import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// On-device facial-expression reader (MediaPipe Face Landmarker, same WASM
// fileset as the pose and gesture models). Runs in the browser — no network, no
// per-frame cost, video never leaves the device. With blendshapes enabled it
// returns 52 expression coefficients per frame (e.g. mouthSmile*, cheekSquint*).

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

export function loadFaceLandmarker(): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = FilesetResolver.forVisionTasks("/mediapipe/wasm").then((vision) =>
      FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "/models/face_landmarker.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: true
      })
    );
  }
  return landmarkerPromise;
}

export interface BlendshapeScores {
  [name: string]: number;
}

/** Flatten the model's blendshape categories into a name -> score lookup. */
export function readBlendshapes(
  result: { faceBlendshapes?: Array<{ categories: Array<{ categoryName: string; score: number }> }> }
): BlendshapeScores | null {
  const categories = result.faceBlendshapes?.[0]?.categories;
  if (!categories) return null;
  const scores: BlendshapeScores = {};
  for (const category of categories) scores[category.categoryName] = category.score;
  return scores;
}

/**
 * Satisfaction signal from blendshapes: the average smile activation, lifted
 * when the cheeks also raise (a genuine "Duchenne" smile squints the cheeks).
 * Returns 0..~1. Kept as a pure function so the threshold policy is easy to tune
 * and test independently of the camera loop.
 */
export function smileScore(scores: BlendshapeScores): number {
  const smile = ((scores.mouthSmileLeft ?? 0) + (scores.mouthSmileRight ?? 0)) / 2;
  const cheek = ((scores.cheekSquintLeft ?? 0) + (scores.cheekSquintRight ?? 0)) / 2;
  return Math.min(1, smile + 0.3 * cheek);
}
