import { useEffect, useRef, useState } from "react";

export type MirrorCameraState = "idle" | "starting" | "live" | "denied" | "error";

/**
 * Keeps a front-facing camera stream running for the "magic mirror" reflection
 * while `active` is true, and releases the device the moment it isn't — so the
 * Lucy realtime try-on (which grabs its own getUserMedia) never fights this hook
 * for the camera. Display it mirrored (`transform: scaleX(-1)`) so it reads like
 * a real reflection.
 */
export function useMirrorCamera(active: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<MirrorCameraState>("idle");

  useEffect(() => {
    let cancelled = false;

    function release() {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState("error");
        return;
      }
      setState("starting");
      try {
        // Ask for the camera's WIDEST native (landscape) frame — laptop webcams
        // are 16:9 sensors, so forcing a portrait size just centre-crops away
        // the horizontal field of view. We fit it into the portrait frame in CSS.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setState("live");
      } catch (caught) {
        if (cancelled) return;
        const name = caught instanceof DOMException ? caught.name : "";
        setState(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error");
      }
    }

    if (active) {
      void start();
    } else {
      release();
      setState("idle");
    }

    return () => {
      cancelled = true;
      release();
    };
  }, [active]);

  return { videoRef, state };
}
