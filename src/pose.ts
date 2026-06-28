import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

export interface PoseAssessment {
  detected: boolean;
  ready: boolean;
  message: string;
  center?: { x: number; y: number };
}

export interface PoseMessages {
  noPerson: string;
  multiplePeople: string;
  notVisible: string;
  stepBack: string;
  stepCloser: string;
  moveRight: string;
  moveLeft: string;
  faceForward: string;
  holdStill: string;
}

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

export function loadPoseLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = FilesetResolver.forVisionTasks("/mediapipe/wasm").then((vision) =>
      PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "/models/pose_landmarker_lite.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numPoses: 2,
        minPoseDetectionConfidence: 0.55,
        minPosePresenceConfidence: 0.55,
        minTrackingConfidence: 0.55
      })
    );
  }
  return landmarkerPromise;
}

interface Landmark {
  x: number;
  y: number;
  visibility?: number;
}

const requiredIndices = [0, 11, 12, 23, 24, 25, 26, 27, 28];

export function assessPose(poses: Landmark[][], messages: PoseMessages): PoseAssessment {
  if (poses.length === 0) {
    return { detected: false, ready: false, message: messages.noPerson };
  }

  if (poses.length > 1) {
    return { detected: true, ready: false, message: messages.multiplePeople };
  }

  const pose = poses[0];
  const required = requiredIndices.map((index) => pose[index]);
  if (required.some((point) => !point || (point.visibility ?? 1) < 0.45)) {
    return { detected: true, ready: false, message: messages.notVisible };
  }

  const xs = required.map((point) => point.x);
  const ys = required.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  const bodyHeight = maxY - minY;

  if (minX < 0.13 || maxX > 0.87 || minY < 0.04 || maxY > 0.96) {
    return { detected: true, ready: false, message: messages.stepBack, center };
  }

  if (bodyHeight < 0.58) {
    return { detected: true, ready: false, message: messages.stepCloser, center };
  }

  if (Math.abs(center.x - 0.5) > 0.1) {
    return {
      detected: true,
      ready: false,
      message: center.x < 0.5 ? messages.moveRight : messages.moveLeft,
      center
    };
  }

  const shoulderSlope = Math.abs(pose[11].y - pose[12].y);
  if (shoulderSlope > 0.07) {
    return { detected: true, ready: false, message: messages.faceForward, center };
  }

  return { detected: true, ready: true, message: messages.holdStill, center };
}
