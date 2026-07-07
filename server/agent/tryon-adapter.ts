// HTTP adapter from the TS/ADK runtime to the image_tryon Python service
// (image_tryon/INTEGRATION.md §4). Fully optional: when TRYON_SERVICE_URL is
// unset — or the service is unreachable — every call returns null and the
// workflow keeps its mock handoff, so the offline demo and CI stay green.

import type { TryonHandoffPayload } from "./contracts.js";
import { logAgentTurn } from "./logger.js";

export interface TryonGenerationResult {
  status: string;
  generation_id: string | null;
  generation_status: "pending" | "processing" | "succeeded" | "failed" | string;
  result_url: string | null;
}

const TIMEOUT_MS = 4000;

function serviceBaseUrl() {
  return process.env.TRYON_SERVICE_URL?.replace(/\/$/, "");
}

/** Map the TS slot-structured outfit to image_tryon's `generate_tryon` body. */
function toGenerateBody(handoff: TryonHandoffPayload) {
  const items = Object.fromEntries(
    handoff.outfit.slots.map((slot) => [
      slot.slot,
      {
        product_id: slot.product_id,
        category: slot.slot,
        image_url: slot.vton_reference_image_url || slot.image_url
      }
    ])
  );
  return {
    session_id: handoff.session_id,
    set_id: handoff.set_id,
    template_id: handoff.template_id,
    use_own_face: handoff.use_own_face,
    user_face: handoff.user_face,
    idempotency_key: `${handoff.session_id}-${handoff.set_id}-tryon`,
    outfit: { items }
  };
}

async function fetchJson(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) return null;
    return (await response.json()) as Record<string, unknown>;
  } finally {
    clearTimeout(timer);
  }
}

function normalize(data: Record<string, unknown> | null): TryonGenerationResult | null {
  if (!data) return null;
  return {
    status: typeof data.status === "string" ? data.status : "unknown",
    generation_id: typeof data.generation_id === "string" ? data.generation_id : null,
    generation_status: typeof data.generation_status === "string" ? data.generation_status : "pending",
    result_url: typeof data.result_url === "string" ? data.result_url : null
  };
}

/** Start a try-on generation. Returns null when the service is not configured/reachable. */
export async function requestTryonGeneration(
  handoff: TryonHandoffPayload
): Promise<TryonGenerationResult | null> {
  const base = serviceBaseUrl();
  if (!base) return null;
  try {
    const data = await fetchJson(`${base}/tools/generate_tryon`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toGenerateBody(handoff))
    });
    return normalize(data);
  } catch (error) {
    logAgentTurn(
      { event: "tryon_adapter_unreachable", action: "generate_tryon", errors: [error instanceof Error ? error.message : "unknown"] },
      "WARNING"
    );
    return null;
  }
}

/** Poll a generation's status. Returns null when not configured/reachable. */
export async function pollTryonStatus(generationId: string): Promise<TryonGenerationResult | null> {
  const base = serviceBaseUrl();
  if (!base) return null;
  try {
    return normalize(await fetchJson(`${base}/tools/generation_status/${generationId}`));
  } catch {
    return null;
  }
}
