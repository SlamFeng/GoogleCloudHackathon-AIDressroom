import { z } from "zod";
import type { ImageAnalysis } from "../image-analysis-tool.js";

export type AnalysisHandoff = ImageAnalysis;
export type BodyProfile = AnalysisHandoff["body_profile"];
export type OutfitProfile = AnalysisHandoff["outfit_profile"];

export const sceneTypeSchema = z.enum(["mirror", "entrance_screen", "staff_ipad"]);
export const routeSchema = z.enum(["explicit", "recommendation", "unclear"]);
export const sessionStatusSchema = z.enum([
  "communicating",
  "recommending",
  "previewing",
  "confirmed",
  "handoff_ready",
  "staff_takeover",
  "ended"
]);
export const recommendationTypeSchema = z.enum(["explicit_need", "similar", "style", "seasonal"]);
export const feedbackTypeSchema = z.enum([
  "reject_all",
  "partial_adjust",
  "positive_keep",
  "confirm"
]);
export const feedbackDimensionSchema = z.enum(["color", "fit", "style", "price", "overall"]);
export const faceModeSchema = z.enum(["real_face", "default_face"]);
export const outfitSlotSchema = z.enum(["outerwear", "top", "bottom", "dress", "shoes", "accessory"]);

export type SceneType = z.infer<typeof sceneTypeSchema>;
export type Route = z.infer<typeof routeSchema>;
export type SessionStatus = z.infer<typeof sessionStatusSchema>;
export type RecommendationType = z.infer<typeof recommendationTypeSchema>;
export type FeedbackType = z.infer<typeof feedbackTypeSchema>;
export type FeedbackDimension = z.infer<typeof feedbackDimensionSchema>;
export type FaceMode = z.infer<typeof faceModeSchema>;
export type OutfitSlotName = z.infer<typeof outfitSlotSchema>;

export interface BodyTemplateResult {
  template_id: string;
  confidence: number;
  source: "match_body_template";
  notes: string;
}

export interface AgentConstraint {
  dimension: FeedbackDimension | "category" | "body_template" | "occasion";
  value: string;
  reason: string;
}

export interface AgentConstraints {
  prefer: AgentConstraint[];
  avoid: AgentConstraint[];
  budget_yen?: number;
}

export interface ParsedNeed {
  raw_text: string;
  categories: string[];
  colors: string[];
  style_tags: string[];
  occasion?: string;
  budget_yen?: number;
}

export interface ConstraintDelta {
  prefer: AgentConstraint[];
  avoid: AgentConstraint[];
  budget_yen?: number;
  requires_new_recommendation: boolean;
  notes: string;
}

export interface Product {
  product_id: string;
  sku: string;
  name: string;
  category: OutfitSlotName;
  price_yen: number;
  colors: string[];
  style_tags: string[];
  body_template_tags: string[];
  seasonal_rank: number;
  stock: Record<string, number>;
  image_url: string;
  vton_reference_image_url: string;
  vton_prompt: string;
}

export interface OutfitSlot {
  slot: OutfitSlotName;
  product_id: string;
  image_url: string;
  vton_reference_image_url: string;
  prompt: string;
}

export interface OutfitPayload {
  slots: OutfitSlot[];
}

export interface RecommendationSet {
  set_id: string;
  round: number;
  rec_type: RecommendationType;
  products: Product[];
  outfit: OutfitPayload;
  reason: string;
}

export interface RecommendationResponse {
  session_id: string;
  round: number;
  route: Route;
  sets: RecommendationSet[];
  warnings: string[];
}

export interface FaceConsentState {
  consent_given: boolean;
  face_mode: FaceMode;
  face_profile_id?: string;
  expire_at?: string;
}

export interface AhaDemoState {
  stage: "idle" | "lucy_preview" | "google_generating" | "google_ready" | "handoff_ready";
  lucy_preview_started_at?: string;
  lucy_preview_limit_sec: number;
  google_generation_status: "idle" | "queued" | "generating" | "ready";
  google_generation_eta_sec?: number;
  narrative: string;
}

export interface LucyRealtimeTryonPayload {
  provider: "decart_lucy_vton";
  mode: "realtime";
  configured: boolean;
  model: string;
  session_id: string;
  set_id: string;
  slot: OutfitSlotName;
  product_id: string;
  garment_image_url: string;
  prompt: string;
  duration_limit_sec: number;
  enhance: boolean;
  client_token: string | null;
  expires_at: string | null;
  warnings: string[];
}

export interface GoogleTryonFallbackPayload {
  provider: "google_vertex_tryon";
  mode: "static_or_async_video";
  session_id: string;
  set_id: string;
  template_id: string;
  outfit: OutfitPayload;
}

export interface TryonHandoffPayload {
  session_id: string;
  set_id: string;
  template_id: string;
  outfit: OutfitPayload;
  use_own_face: boolean;
  user_face: { face_profile_id: string } | null;
  lucy_realtime_preview: LucyRealtimeTryonPayload | null;
  google_fallback: GoogleTryonFallbackPayload;
}

export interface ToolCallRecord {
  tool: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  called_at: string;
}

export const startAgentSessionSchema = z.object({
  scene_type: sceneTypeSchema.default("mirror"),
  store_id: z.string().min(1).default("store_001"),
  analysis: z.custom<AnalysisHandoff>().optional()
});

export const agentChatSchema = z.object({
  text: z.string().min(1)
});

export const previewTryonSchema = z.object({
  set_id: z.string().min(1),
  slot: outfitSlotSchema.optional(),
  duration_limit_sec: z.number().int().min(3).max(30).default(12)
});

export const feedbackPayloadSchema = z.object({
  set_id: z.string().min(1),
  feedback_type: feedbackTypeSchema.default("partial_adjust"),
  dimension: feedbackDimensionSchema.optional(),
  dimension_value: z.string().optional(),
  raw_voice_text: z.string().optional()
});

export const confirmPayloadSchema = z.object({
  set_id: z.string().min(1),
  camera_processing_consent: z.boolean().default(false),
  face_profile_consent: z.boolean().default(false),
  image_ref: z.string().optional()
});

export const previewStatusPayloadSchema = z.object({
  status: z.enum(["previewing", "stopped", "failed"]),
  reason: z.string().optional(),
  lucy_session_id: z.string().optional()
});

export const purchasePayloadSchema = z.object({
  set_id: z.string().optional()
});
