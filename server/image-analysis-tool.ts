import { randomUUID } from "node:crypto";
import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { buildMockAnalysis } from "./mock-analysis.js";

export const imageAnalysisInputSchema = z.object({
  session_id: z
    .string()
    .min(1)
    .optional()
    .describe("Optional caller session id. A tool-scoped id is generated when omitted."),
  analysis_mode: z
    .enum(["mock", "ai"])
    .default("mock")
    .describe("Use mock for deterministic demo output. AI is reserved for a real multimodal analyzer."),
  capture_data_url: z
    .string()
    .refine((value) => value.startsWith("data:image/"), "Must be an image data URL.")
    .describe("Front-facing full-body image as a data:image/* base64 URL."),
  manual_profile: z
    .object({
      height_cm: z.number().min(100).max(230).describe("Customer height in centimeters."),
      weight_kg: z.number().min(25).max(250).describe("Customer weight in kilograms."),
      gender_presentation: z
        .enum(["female", "male", "neutral"])
        .describe("Customer-selected gender presentation; do not infer it from the image."),
      age_range: z
        .enum(["18-25", "26-35", "36-45", "46+"])
        .describe("Customer-selected age range; do not infer it from the image.")
    })
    .describe("Manual calibration inputs supplied by the customer.")
});

export type ImageAnalysisToolInput = z.infer<typeof imageAnalysisInputSchema>;
export type ImageAnalysis = ReturnType<typeof buildMockAnalysis>;

export type ImageAnalysisToolResult =
  | {
      ok: true;
      analysis: ImageAnalysis;
    }
  | {
      ok: false;
      error_code: "AI_ANALYZER_NOT_IMPLEMENTED";
      message: string;
      recommended_action: string;
    };

export async function analyzeDressroomImage(
  input: ImageAnalysisToolInput
): Promise<ImageAnalysisToolResult> {
  if (input.analysis_mode === "ai") {
    return {
      ok: false,
      error_code: "AI_ANALYZER_NOT_IMPLEMENTED",
      message:
        "AI analysis is reserved but no real multimodal model call has been wired yet.",
      recommended_action:
        "Use analysis_mode='mock' for the hackathon demo, or replace this branch with Gemini structured output."
    };
  }

  const sessionId = input.session_id ?? `tool_ses_${randomUUID().slice(0, 12)}`;
  const analysis = buildMockAnalysis(sessionId, input.manual_profile, input.analysis_mode);
  return { ok: true, analysis };
}

export const analyzeFullBodyDressroomImageTool = new FunctionTool({
  name: "analyze_full_body_dressroom_image",
  description:
    "Analyze one front-facing full-body outfit photo and customer-provided calibration profile. Returns body_profile and outfit_profile contracts for the downstream styling agent.",
  parameters: imageAnalysisInputSchema,
  execute: analyzeDressroomImage
});

export const dressroomImageAnalysisTools = [analyzeFullBodyDressroomImageTool];
