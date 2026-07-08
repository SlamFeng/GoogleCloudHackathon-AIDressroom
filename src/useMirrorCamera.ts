import { useEffect, useRef, useState } from "react";

export type MirrorCameraState = "idle" | "starting" | "live" | "denied" | "error";

/**
 * Keeps a front-facing camera stream running for the "magic mirror" reflection
 * while `active` is true, and releases the device the moment it isn't — so the
 * Lucy realtime try-on (which grabs its own getUserMedia) never fights this hook
 * for the camera. Display it mirrored (`transform: scaleX(-1)`).
 *
 * Pass a `deviceId` to use a specific camera — e.g. an iPhone via Continuity
 * Camera, or an external wide-angle webcam — instead of the built-in one. The
 * returned `devices` list (populated once permission is granted) powers a picker.
 */
export function useMirrorCamera(active: boolean, deviceId?: string) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<MirrorCameraState>("idle");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    let cancelled = false;

    function release() {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    }

    function videoConstraints(useDeviceId: boolean): MediaStreamConstraints {
      const common = { width: { ideal: 1920 }, height: { ideal: 1080 } };
      return {
        video:
          useDeviceId && deviceId
            ? { deviceId: { exact: deviceId }, ...common }
            : { facingMode: "user", ...common },
        audio: false
      };
    }

    async function open(): Promise<MediaStream> {
      try {
        return await navigator.mediaDevices.getUserMedia(videoConstraints(true));
      } catch (caught) {
        // A saved deviceId may no longer exist (unplugged / Continuity off) —
        // fall back to the default camera instead of failing outright.
        if (deviceId && caught instanceof DOMException && caught.name === "OverconstrainedError") {
          return navigator.mediaDevices.getUserMedia(videoConstraints(false));
        }
        throw caught;
      }
    }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState("error");
        return;
      }
      setState("starting");
      try {
        const stream = await open();
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setState("live");
        // Labels are only exposed after permission is granted.
        const all = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) setDevices(all.filter((device) => device.kind === "videoinput"));
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
  }, [active, deviceId]);

  return { videoRef, state, devices };
}
