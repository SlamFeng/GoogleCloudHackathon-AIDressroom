import { createDecartClient, type CreateTokenResponse } from "@decartai/sdk";

export interface LucyPreviewTokenRequest {
  session_id: string;
  set_id: string;
  product_id: string;
  duration_limit_sec: number;
  origin?: string;
}

export interface LucyPreviewTokenResult {
  configured: boolean;
  provider: "decart_lucy_vton";
  model: string;
  client_token: string | null;
  expires_at: string | null;
  duration_limit_sec: number;
  allowed_origin: string | null;
  warnings: string[];
}

const defaultModel = "lucy-vton-3";
const defaultTokenTtlSec = 60;
const defaultMaxPreviewSec = 12;

export async function createLucyPreviewToken(
  request: LucyPreviewTokenRequest
): Promise<LucyPreviewTokenResult> {
  const model = process.env.LUCY_MODEL ?? defaultModel;
  const maxPreviewSec = readPositiveInteger(process.env.LUCY_MAX_PREVIEW_SEC, defaultMaxPreviewSec);
  const tokenTtlSec = readPositiveInteger(process.env.LUCY_TOKEN_TTL_SEC, defaultTokenTtlSec);
  const durationLimitSec = Math.min(request.duration_limit_sec, maxPreviewSec);
  const apiKey = process.env.DECART_API_KEY;
  const warnings: string[] = [];

  if (!apiKey) {
    warnings.push("DECART_API_KEY is not configured; returning mock Lucy token metadata.");
    return {
      configured: false,
      provider: "decart_lucy_vton",
      model,
      client_token: null,
      expires_at: null,
      duration_limit_sec: durationLimitSec,
      allowed_origin: request.origin ?? null,
      warnings
    };
  }

  const client = createDecartClient({ apiKey });
  const tokenOptions = {
    expiresIn: tokenTtlSec,
    allowedModels: [model],
    allowedOrigins: request.origin ? [request.origin] : undefined,
    constraints: {
      realtime: {
        maxSessionDuration: durationLimitSec
      }
    },
    metadata: {
      session_id: request.session_id,
      set_id: request.set_id,
      product_id: request.product_id,
      purpose: "aida_realtime_tryon_preview"
    }
  };
  const token: CreateTokenResponse = await client.tokens.create(tokenOptions);
  return {
    configured: true,
    provider: "decart_lucy_vton",
    model,
    client_token: token.apiKey,
    expires_at: token.expiresAt,
    duration_limit_sec: durationLimitSec,
    allowed_origin: request.origin ?? null,
    warnings
  };
}

function readPositiveInteger(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
