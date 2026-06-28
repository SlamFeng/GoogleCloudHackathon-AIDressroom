import { useCallback, useEffect, useRef, useState } from "react";
import { assessPose, loadPoseLandmarker, type PoseAssessment, type PoseMessages } from "./pose";

type ModelState = "loading" | "ready" | "error";

interface CameraCaptureOptions {
  messages: PoseMessages & {
    preparing: string;
    permissionDenied: string;
    cameraFallback: string;
  };
  onCaptured: (dataUrl: string) => void;
}

export function useCameraCapture({ messages, onCaptured }: CameraCaptureOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const stableSinceRef = useRef<number | null>(null);
  const lastCenterRef = useRef<{ x: number; y: number } | null>(null);
  const captureLockedRef = useRef(false);
  const [modelState, setModelState] = useState<ModelState>("loading");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<PoseAssessment>({
    detected: false,
    ready: false,
    message: messages.preparing
  });
  const [progress, setProgress] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || captureLockedRef.current) return;

    captureLockedRef.current = true;
    const canvas = document.createElement("canvas");
    const maxWidth = 1280;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    onCaptured(canvas.toDataURL("image/jpeg", 0.86));
  }, [onCaptured]);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const [stream, landmarker] = await Promise.all([
          navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          }),
          loadPoseLandmarker()
        ]);
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setModelState("ready");

        let lastInference = 0;
        const detect = () => {
          const video = videoRef.current;
          const now = performance.now();
          if (video && video.readyState >= 2 && now - lastInference > 120) {
            lastInference = now;
            const result = landmarker.detectForVideo(video, now);
            const next = assessPose(result.landmarks, messages);

            if (next.ready && next.center) {
              const last = lastCenterRef.current;
              const movement = last
                ? Math.hypot(next.center.x - last.x, next.center.y - last.y)
                : 0;
              lastCenterRef.current = next.center;

              if (movement < 0.018) {
                stableSinceRef.current ??= now;
                const nextProgress = Math.min(1, (now - stableSinceRef.current) / 1600);
                setProgress(nextProgress);
              } else {
                stableSinceRef.current = now;
                setProgress(0);
              }
            } else {
              stableSinceRef.current = null;
              lastCenterRef.current = next.center ?? null;
              setProgress(0);
            }

            setAssessment(next);
          }
          frameRef.current = requestAnimationFrame(detect);
        };
        frameRef.current = requestAnimationFrame(detect);
      } catch (error) {
        const message =
          error instanceof DOMException && error.name === "NotAllowedError"
            ? messages.permissionDenied
            : messages.cameraFallback;
        setCameraError(message);
        setModelState("error");

        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
          }
        } catch {
          // Keep the original actionable error.
        }
      }
    }

    void start();
    return () => {
      cancelled = true;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [messages]);

  useEffect(() => {
    if (progress < 1 || countdown !== null || captureLockedRef.current) return;
    setCountdown(3);
    const interval = window.setInterval(() => {
      setCountdown((current) => {
        if (current === null) return null;
        if (current <= 1) {
          window.clearInterval(interval);
          window.setTimeout(capture, 120);
          return 0;
        }
        return current - 1;
      });
    }, 700);
    return () => window.clearInterval(interval);
  }, [capture, countdown, progress]);

  return {
    videoRef,
    modelState,
    cameraError,
    assessment,
    progress,
    countdown,
    capture
  };
}
