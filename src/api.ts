import type { AnalysisHandoff, BodyProfile, ManualProfile } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `请求失败（${response.status}）`);
  }

  return response.json() as Promise<T>;
}

export async function createSession(): Promise<{ session_id: string }> {
  return request("/api/sessions", { method: "POST", body: "{}" });
}

export async function analyzeCapture(
  sessionId: string,
  manualProfile: ManualProfile,
  captureDataUrl: string
): Promise<AnalysisHandoff> {
  return request(`/api/sessions/${sessionId}/analyses`, {
    method: "POST",
    body: JSON.stringify({
      manual_profile: manualProfile,
      capture_data_url: captureDataUrl
    })
  });
}

export async function confirmAnalysis(
  analysisId: string,
  bodyProfile: BodyProfile
): Promise<AnalysisHandoff> {
  return request(`/api/analyses/${analysisId}/confirm`, {
    method: "POST",
    body: JSON.stringify({ body_profile: bodyProfile })
  });
}
