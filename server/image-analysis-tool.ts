import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { FunctionTool } from "@google/adk";
import { GoogleGenAI } from "@google/genai";
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
      error_code: "AI_ANALYZER_NOT_CONFIGURED" | "AI_ANALYZER_FAILED";
      message: string;
      recommended_action: string;
    };

export async function analyzeDressroomImage(
  input: ImageAnalysisToolInput
): Promise<ImageAnalysisToolResult> {
  if (input.analysis_mode === "ai") {
    return analyzeWithGemini(input);
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

async function analyzeWithGemini(input: ImageAnalysisToolInput): Promise<ImageAnalysisToolResult> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error_code: "AI_ANALYZER_NOT_CONFIGURED",
      message: "Gemini API key is missing on the server.",
      recommended_action:
        "Set GEMINI_API_KEY or GOOGLE_API_KEY, restart the server, then use analysis_mode='ai'."
    };
  }

  const sessionId = input.session_id ?? `tool_ses_${randomUUID().slice(0, 12)}`;
  const analysisId = `ana_${randomUUID().slice(0, 12)}`;
  const captureId = `cap_${randomUUID().slice(0, 12)}`;
  const image = parseImageDataUrl(input.capture_data_url);
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildGeminiPrompt({
                sessionId,
                analysisId,
                captureId,
                profile: input.manual_profile
              })
            },
            {
              inlineData: {
                mimeType: image.mimeType,
                data: image.base64Data
              }
            }
          ]
        }
      ],
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseJsonSchema: getGeminiResponseSchema()
      }
    });

    const text = response.text;
    if (!text) throw new Error("Gemini returned an empty response.");

    const generated = JSON.parse(text) as ImageAnalysis;
    const analysis: ImageAnalysis = {
      ...generated,
      session_id: sessionId,
      analysis_id: analysisId,
      analysis_mode: "ai",
      status: "ready",
      captured_at: new Date().toISOString(),
      body_profile: {
        ...generated.body_profile,
        schema_version: "1.2",
        ...input.manual_profile,
        extraction: {
          ...generated.body_profile.extraction,
          source_capture_id: captureId,
          captured_views: ["front"]
        }
      },
      outfit_profile: {
        ...generated.outfit_profile,
        schema_version: "1.0",
        extraction: {
          ...generated.outfit_profile.extraction,
          source_capture_id: captureId,
          captured_views: ["front"]
        }
      }
    };

    return { ok: true, analysis };
  } catch (error) {
    return {
      ok: false,
      error_code: "AI_ANALYZER_FAILED",
      message: error instanceof Error ? error.message : "Gemini analysis failed.",
      recommended_action:
        "Check GEMINI_API_KEY, model access, image size, and the generated JSON schema contract."
    };
  }
}

function parseImageDataUrl(dataUrl: string) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("capture_data_url must be a base64 image data URL.");
  return {
    mimeType: match[1],
    base64Data: match[2]
  };
}

function buildGeminiPrompt({
  sessionId,
  analysisId,
  captureId,
  profile
}: {
  sessionId: string;
  analysisId: string;
  captureId: string;
  profile: ImageAnalysisToolInput["manual_profile"];
}) {
  return [
    "You are the image analysis tool for an AI dressroom ADK workflow.",
    "Analyze the attached front-facing full-body outfit photo.",
    "Return only JSON that matches the response schema.",
    "Do not infer age range or gender presentation from the image; use the manual_profile values exactly.",
    "Do not perform face identity recognition.",
    "Use null for measurements or skin tone when the image evidence is insufficient.",
    "For single front-view photos, avoid circumference measurements unless clearly justified.",
    `session_id: ${sessionId}`,
    `analysis_id: ${analysisId}`,
    "analysis_mode: ai",
    `source_capture_id: ${captureId}`,
    `manual_profile: ${JSON.stringify(profile)}`
  ].join("\n");
}

function getGeminiResponseSchema() {
  const bodySchema = readJsonSchema("body-profile.schema.json");
  const outfitSchema = readJsonSchema("outfit-profile.schema.json");
  const bodyProfile = rewriteSchemaRefs(bodySchema.properties.body_profile, "body");
  const outfitProfile = rewriteSchemaRefs(outfitSchema.properties.outfit_profile, "outfit");

  return replaceConstWithEnum({
    type: "object",
    additionalProperties: false,
    required: [
      "session_id",
      "analysis_id",
      "analysis_mode",
      "status",
      "captured_at",
      "body_profile",
      "outfit_profile"
    ],
    properties: {
      session_id: { type: "string", minLength: 1 },
      analysis_id: { type: "string", minLength: 1 },
      analysis_mode: { enum: ["ai"] },
      status: { enum: ["ready"] },
      captured_at: { type: "string", format: "date-time" },
      body_profile: bodyProfile,
      outfit_profile: outfitProfile
    },
    $defs: {
      ...prefixDefs(bodySchema.$defs, "body"),
      ...prefixDefs(outfitSchema.$defs, "outfit")
    }
  });
}

function readJsonSchema(filename: string) {
  const path = fileURLToPath(new URL(`../schemas/${filename}`, import.meta.url));
  return JSON.parse(readFileSync(path, "utf8"));
}

function prefixDefs(defs: Record<string, unknown>, prefix: string) {
  return Object.fromEntries(
    Object.entries(defs).map(([key, value]) => [`${prefix}_${key}`, rewriteSchemaRefs(value, prefix)])
  );
}

function rewriteSchemaRefs(value: unknown, prefix: string): unknown {
  if (Array.isArray(value)) return value.map((item) => rewriteSchemaRefs(item, prefix));
  if (!value || typeof value !== "object") return value;

  const rewritten: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === "$ref" && typeof child === "string" && child.startsWith("#/$defs/")) {
      rewritten[key] = child.replace("#/$defs/", `#/$defs/${prefix}_`);
    } else {
      rewritten[key] = rewriteSchemaRefs(child, prefix);
    }
  }
  return rewritten;
}

function replaceConstWithEnum(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(replaceConstWithEnum);
  if (!value || typeof value !== "object") return value;

  const converted: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === "const") {
      converted.enum = [child];
    } else {
      converted[key] = replaceConstWithEnum(child);
    }
  }
  return converted;
}
