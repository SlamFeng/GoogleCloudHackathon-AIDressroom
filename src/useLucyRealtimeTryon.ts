import { useCallback, useEffect, useRef, useState } from "react";
import {
  createDecartClient,
  models,
  type ConnectionState,
  type RealTimeClient,
  type RealTimeModels
} from "@decartai/sdk";
import type { LucyPreviewStatus, LucyRealtimeTryonPayload } from "./api";

type LucyRuntimeStatus = "idle" | "mock" | "connecting" | "previewing" | "stopped" | "failed";

interface LucyStatusEvent {
  status: LucyPreviewStatus;
  reason?: string;
  lucy_session_id?: string;
}

interface StartLucyPreviewOptions {
  payload: LucyRealtimeTryonPayload;
  onStatusChange?: (event: LucyStatusEvent) => void | Promise<void>;
}

export function useLucyRealtimeTryon() {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const clientRef = useRef<RealTimeClient | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const [status, setStatus] = useState<LucyRuntimeStatus>("idle");
  const [connectionState, setConnectionState] = useState<ConnectionState | "mock" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activePayload, setActivePayload] = useState<LucyRealtimeTryonPayload | null>(null);

  const clearStopTimer = useCallback(() => {
    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }, []);

  const stop = useCallback(
    (reason = "client_stop") => {
      clearStopTimer();
      clientRef.current?.disconnect();
      clientRef.current = null;
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;

      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

      setStatus((current) => (current === "failed" ? current : "stopped"));
      setConnectionState("disconnected");
      return reason;
    },
    [clearStopTimer]
  );

  const start = useCallback(
    async ({ payload, onStatusChange }: StartLucyPreviewOptions) => {
      stop("restart");
      setActivePayload(payload);
      setError(null);

      if (!payload.configured || !payload.client_token) {
        setStatus("mock");
        setConnectionState("mock");
        await onStatusChange?.({
          status: "previewing",
          lucy_session_id: `mock_lucy_${payload.session_id}`
        });
        stopTimerRef.current = window.setTimeout(() => {
          const stoppedReason = stop("duration_limit_reached");
          void onStatusChange?.({
            status: "stopped",
            reason: stoppedReason,
            lucy_session_id: `mock_lucy_${payload.session_id}`
          });
        }, payload.duration_limit_sec * 1000);
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        const reason = "browser_camera_api_unavailable";
        setStatus("failed");
        setError(reason);
        await onStatusChange?.({ status: "failed", reason });
        return;
      }

      try {
        setStatus("connecting");
        setConnectionState("connecting");
        const model = models.realtime(payload.model as RealTimeModels);
        const localStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            frameRate: model.fps,
            width: model.width,
            height: model.height
          }
        });
        localStreamRef.current = localStream;
        if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

        const client = createDecartClient({ apiKey: payload.client_token });
        let lucySessionId: string | undefined;
        const realtimeClient = await client.realtime.connect(localStream, {
          model,
          mirror: "auto",
          initialState: {
            prompt: {
              text: payload.prompt,
              enhance: payload.enhance
            },
            image: payload.garment_image_url
          },
          onRemoteStream: (stream) => {
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
          },
          onConnectionChange: (nextState) => {
            setConnectionState(nextState);
            if (nextState === "connected" || nextState === "generating") {
              setStatus("previewing");
              void onStatusChange?.({
                status: "previewing",
                lucy_session_id: lucySessionId
              });
            }
            if (nextState === "disconnected") {
              setStatus((current) => (current === "failed" ? current : "stopped"));
              void onStatusChange?.({
                status: "stopped",
                lucy_session_id: lucySessionId
              });
            }
          }
        });

        clientRef.current = realtimeClient;
        lucySessionId = realtimeClient.sessionId ?? undefined;
        stopTimerRef.current = window.setTimeout(() => {
          const stoppedReason = stop("duration_limit_reached");
          void onStatusChange?.({
            status: "stopped",
            reason: stoppedReason,
            lucy_session_id: lucySessionId
          });
        }, payload.duration_limit_sec * 1000);
      } catch (caught) {
        stop("connect_failed");
        const reason = caught instanceof Error ? caught.message : "lucy_realtime_connect_failed";
        setStatus("failed");
        setError(reason);
        await onStatusChange?.({ status: "failed", reason });
      }
    },
    [stop]
  );

  useEffect(
    () => () => {
      stop("unmount");
    },
    [stop]
  );

  return {
    localVideoRef,
    remoteVideoRef,
    status,
    connectionState,
    error,
    activePayload,
    start,
    stop
  };
}
