import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { FunctionTool } from "@google/adk";
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import { z } from "zod";
import { buildMockAnalysis } from "./mock-analysis.js";

export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";
export const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-3-pro-image";
const PRODUCT_IMAGE_CROP_PADDING = 0.08;

type ProductImageReference = {
  mimeType: string;
  base64Data: string;
  dataUrl: string;
};

export function getGeminiModel() {
  return process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
}

export function getGeminiImageModel() {
  return process.env.GEMINI_IMAGE_MODEL ?? DEFAULT_GEMINI_IMAGE_MODEL;
}

export function hasGeminiApiKey() {
  return Boolean(process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY);
}

export const imageAnalysisInputSchema = z.object({
  session_id: z
    .string()
    .min(1)
    .optional()
    .describe("Optional caller session id. A tool-scoped id is generated when omitted."),
  analysis_mode: z
    .enum(["auto", "mock", "ai"])
    .default("auto")
    .describe("Use auto for local/demo fallback, ai to require Gemini, or mock for deterministic contract tests."),
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
  const effectiveMode = input.analysis_mode === "auto" ? (hasGeminiApiKey() ? "ai" : "mock") : input.analysis_mode;

  if (effectiveMode === "ai") {
    const result = await analyzeWithGemini(input);
    // In auto mode, degrade to the deterministic mock if the AI path fails
    // outright, so the capture flow never dead-ends on a Gemini/model error.
    if (!result.ok && input.analysis_mode === "auto") {
      console.warn(
        `[image-analysis] auto: AI analysis failed (${result.message}); falling back to mock.`
      );
      const fallbackSession = input.session_id ?? `tool_ses_${randomUUID().slice(0, 12)}`;
      return { ok: true, analysis: buildMockAnalysis(fallbackSession, input.manual_profile, "mock") };
    }
    return result;
  }

  const sessionId = input.session_id ?? `tool_ses_${randomUUID().slice(0, 12)}`;
  const analysis = buildMockAnalysis(sessionId, input.manual_profile, "mock");
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
      model: getGeminiModel(),
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

    // Product-image generation is best-effort enrichment via a separate image
    // model; if it fails, keep the real OOTD analysis (downstream recommendation
    // uses inventory images, not these) rather than failing the whole capture.
    try {
      const enrichedAnalysis = await addProductImages(ai, image, analysis);
      return { ok: true, analysis: enrichedAnalysis };
    } catch (imageError) {
      console.warn(
        `[image-analysis] product-image generation failed; returning OOTD without product images: ${
          imageError instanceof Error ? imageError.message : String(imageError)
        }`
      );
      return { ok: true, analysis };
    }
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

async function addProductImages(
  ai: GoogleGenAI,
  sourceImage: ReturnType<typeof parseImageDataUrl>,
  analysis: ImageAnalysis
): Promise<ImageAnalysis> {
  const items = analysis.outfit_profile.items;
  const cropReferences = await Promise.all(items.map((item) => cropItemReference(sourceImage, item)));
  const segmentedReferences = await Promise.all(
    items.map((item, index) => {
      if (!item.visible) return Promise.resolve(null);
      return generateSegmentedItemReference(ai, sourceImage, cropReferences[index], item);
    })
  );
  const generatedImages = await Promise.all(
    items.map((item, index) => {
      if (!item.visible) return Promise.resolve(null);
      return generateProductImageDataUrl(ai, sourceImage, segmentedReferences[index], item);
    })
  );

  return {
    ...analysis,
    outfit_profile: {
      ...analysis.outfit_profile,
      items: items.map((item, index) => {
        return {
          ...item,
          product_image_data_url: generatedImages[index]
        };
      })
    }
  };
}

// Generate/edit an image from mixed text + reference-image parts, using the
// correct @google/genai API: generateContent with responseModalities IMAGE,
// reading the result from candidates[].content.parts[].inlineData.
async function generateImageFromParts(
  ai: GoogleGenAI,
  parts: Array<Record<string, unknown>>
): Promise<ProductImageReference | null> {
  const response = await ai.models.generateContent({
    model: getGeminiImageModel(),
    contents: [{ role: "user", parts }],
    config: { responseModalities: ["IMAGE"] as never }
  });
  const outParts = response.candidates?.[0]?.content?.parts ?? [];
  const image = outParts.find((part) => (part as { inlineData?: unknown }).inlineData) as
    | { inlineData?: { mimeType?: string; data?: string } }
    | undefined;
  const data = image?.inlineData?.data;
  if (!data) return null;
  const mimeType = image?.inlineData?.mimeType ?? "image/jpeg";
  return { mimeType, base64Data: data, dataUrl: `data:${mimeType};base64,${data}` };
}

function buildTryonPrompt(lookLabel?: string) {
  return [
    "Photorealistic virtual try-on.",
    "Reference image 1 is the customer. Keep their face, hair, body shape, pose, framing, and background exactly.",
    "Dress the SAME person in ALL the garment items shown in the following reference images, replacing their current clothes.",
    lookLabel ? `The intended look is: ${lookLabel}.` : "",
    "Natural fit and draping, realistic fabric, consistent lighting and shadows with the original photo.",
    "Full-body, portrait 3:4 framing. No text, no watermark, no extra people, no accessories that were not provided."
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Compose a "the customer wearing this outfit" image from their capture photo +
 * the outfit's garment images. Returns a data URL, or null when there's no key
 * or generation fails (so the caller can fall back to the placeholder).
 */
export async function generateTryonImage(input: {
  personImageDataUrl: string;
  garments: Array<{ mimeType: string; base64Data: string }>;
  lookLabel?: string;
}): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey || input.garments.length === 0) return null;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const person = parseImageDataUrl(input.personImageDataUrl);
    const parts: Array<Record<string, unknown>> = [
      { text: buildTryonPrompt(input.lookLabel) },
      { inlineData: { mimeType: person.mimeType, data: person.base64Data } },
      { text: "Reference image 1: the customer (keep them and the background)." },
      ...input.garments.flatMap((garment, index) => [
        { inlineData: { mimeType: garment.mimeType, data: garment.base64Data } },
        { text: `Reference image ${index + 2}: a garment to put on the customer.` }
      ])
    ];
    const result = await generateImageFromParts(ai, parts);
    return result?.dataUrl ?? null;
  } catch {
    return null;
  }
}

async function generateSegmentedItemReference(
  ai: GoogleGenAI,
  sourceImage: ReturnType<typeof parseImageDataUrl>,
  cropReference: ProductImageReference | null,
  item: ImageAnalysis["outfit_profile"]["items"][number]
): Promise<ProductImageReference> {
  const parts: Array<Record<string, unknown>> = [
    { text: buildSegmentedItemPrompt(item) },
    ...(cropReference
      ? [
          { inlineData: { mimeType: cropReference.mimeType, data: cropReference.base64Data } },
          {
            text:
              "Reference image 1 is a localized crop around the detected item. Extract the garment or accessory from this area."
          }
        ]
      : []),
    { inlineData: { mimeType: sourceImage.mimeType, data: sourceImage.base64Data } },
    {
      text:
        "Reference image 2 is the full outfit photo. Use it to verify which physical item is being extracted and to reconstruct hidden parts conservatively."
    }
  ];
  const result = await generateImageFromParts(ai, parts);
  if (!result) {
    throw new Error(`No segmented clothing reference for visible item ${item.item_id}.`);
  }
  return result;
}

async function generateProductImageDataUrl(
  ai: GoogleGenAI,
  sourceImage: ReturnType<typeof parseImageDataUrl>,
  itemReference: ProductImageReference | null,
  item: ImageAnalysis["outfit_profile"]["items"][number]
) {
  if (!itemReference) {
    throw new Error(`Missing segmented clothing reference for visible item ${item.item_id}.`);
  }

  const parts: Array<Record<string, unknown>> = [
    { text: buildProductImagePrompt(item) },
    { inlineData: { mimeType: itemReference.mimeType, data: itemReference.base64Data } },
    {
      text:
        "Reference image 1 is the segmented item reference. Use it as the primary visual source for shape, color, material, and details."
    },
    { inlineData: { mimeType: sourceImage.mimeType, data: sourceImage.base64Data } },
    {
      text:
        "Reference image 2 is the full outfit photo. Use it only for context and to reconstruct occluded parts; do not include the person or original background."
    }
  ];
  const result = await generateImageFromParts(ai, parts);
  if (!result) {
    throw new Error(`No generated standalone product image for visible item ${item.item_id}.`);
  }
  return result.dataUrl;
}

async function cropItemReference(
  sourceImage: ReturnType<typeof parseImageDataUrl>,
  item: ImageAnalysis["outfit_profile"]["items"][number]
): Promise<ProductImageReference | null> {
  const image = sharp(sourceImage.buffer);
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) return null;

  const padded = padRegion(item.region, PRODUCT_IMAGE_CROP_PADDING);
  const left = Math.min(metadata.width - 1, Math.floor(padded.x * metadata.width));
  const top = Math.min(metadata.height - 1, Math.floor(padded.y * metadata.height));
  const width = Math.max(1, Math.ceil(padded.width * metadata.width));
  const height = Math.max(1, Math.ceil(padded.height * metadata.height));
  const buffer = await image
    .extract({
      left,
      top,
      width: Math.max(1, Math.min(width, metadata.width - left)),
      height: Math.max(1, Math.min(height, metadata.height - top))
    })
    .resize({ width: 1024, height: 1024, fit: "contain", background: "#f7f5ef" })
    .jpeg({ quality: 92 })
    .toBuffer();
  const base64Data = buffer.toString("base64");

  return {
    mimeType: "image/jpeg",
    base64Data,
    dataUrl: `data:image/jpeg;base64,${base64Data}`
  };
}

function parseImageDataUrl(dataUrl: string) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("capture_data_url must be a base64 image data URL.");
  return {
    mimeType: match[1],
    base64Data: match[2],
    buffer: Buffer.from(match[2], "base64")
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
    "Primary task: extract the customer's OOTD as a structured outfit_profile.",
    "Separate every clearly visible outfit piece into its own item: outerwear, top, bottom, dress, one_piece, shoes, headwear, bag, and accessories.",
    "Do not duplicate the same physical clothing or accessory item. Each detected item should appear only once in outfit_profile.items.",
    "Only include items visible in the image. Do not invent hidden garments, brands, prices, sizes, or products.",
    "Do not identify or guess brands, logos, price, product names, store names, or SKU-like information.",
    "Safety: do not describe, generate, or single out underwear, lingerie, or intimate apparel. Use only visible outerwear and safe fashion categories; omit ambiguous intimate items and add an analysis warning if needed.",
    "Describe each item the way a stylist would label an outfit board: garment type, main color, silhouette or fit, visible pattern, and material appearance.",
    "For accessories, include only visually useful styling objects such as bag, hat, scarf, jewelry, belt, glasses, or visible wearable accessory.",
    "If a carried bag has clearly visible safe contents, include those contents as accessory items only when visually obvious. Do not guess hidden bag contents.",
    "For every item, return region as a tight normalized bounding box around that visible item in the original image: x, y, width, height from 0 to 1, plus the closest anchor.",
    "Use the region to support a visual OOTD breakdown board, so each item should crop cleanly without including too much body or background.",
    "For each visible item, choose the closest category, write a lower_snake_case subcategory, estimate color names and hex values from the image, and describe pattern, fit, sleeve_length, length, material_appearance, style_tags, and confidence.",
    "Use dominant_colors for the whole outfit and styling_observations for the overall look.",
    "Use low confidence plus analysis_warnings when lighting, crop, blur, occlusion, or ambiguity makes an item uncertain.",
    "Return only JSON that matches the response schema.",
    "Use enum values exactly as defined by the response schema. Use unknown or null when evidence is insufficient.",
    "Do not infer age range or gender presentation from the image; use the manual_profile values exactly.",
    "Do not perform face identity recognition.",
    "Do not estimate or output numeric body measurements or circumferences. Body handling is template-based only.",
    "Use null for skin tone when the image evidence is insufficient.",
    `session_id: ${sessionId}`,
    `analysis_id: ${analysisId}`,
    "analysis_mode: ai",
    `source_capture_id: ${captureId}`,
    `manual_profile: ${JSON.stringify(profile)}`
  ].join("\n");
}

function buildSegmentedItemPrompt(item: ImageAnalysis["outfit_profile"]["items"][number]) {
  const colors = item.colors.map((color) => color.name).join(", ") || "unknown";
  const materials = item.material_appearance.join(", ") || "unknown";
  const styles = item.style_tags.join(", ") || "unknown";

  return [
    "Extract exactly one clothing or accessory item from the outfit photo and create an isolated visual reference of that item.",
    "This is the extraction and reconstruction stage, not the final editorial product photo.",
    "Remove the model body, face, skin, hair, hands, shoes or garments that are not the detected item, and the original background.",
    "Place the isolated item on a plain white or light neutral background.",
    "Keep the detected item's exact color, silhouette, cut, pattern, fabric texture, seams, trim, buttons, hardware, and visible design details.",
    "Reconstruct hidden or occluded portions only when needed to complete the product shape, using the simplest plausible continuation.",
    "Do not invent a brand, price, label, tag, hanger, mannequin, packaging, decorative motif, or extra garment.",
    "Do not create underwear, lingerie, nude, transparent, or sexualized imagery. Keep the result safe and suitable for a fashion styling board.",
    "Center the isolated item and keep the entire product visible.",
    `Detected item: ${item.category} / ${item.subcategory}`,
    `Main colors: ${colors}`,
    `Pattern: ${item.pattern}`,
    `Fit: ${item.fit}`,
    `Material appearance: ${materials}`,
    `Style tags: ${styles}`,
    `Source region: x=${item.region.x}, y=${item.region.y}, width=${item.region.width}, height=${item.region.height}, anchor=${item.region.anchor}`
  ].join("\n");
}

function buildProductImagePrompt(item: ImageAnalysis["outfit_profile"]["items"][number]) {
  const colors = item.colors.map((color) => color.name).join(", ") || "unknown";
  const materials = item.material_appearance.join(", ") || "unknown";
  const styles = item.style_tags.join(", ") || "unknown";

  return [
    "Create a clean front-facing flat-lay or catalog-style product image of exactly one clothing or accessory item.",
    "Reference image 1 is the isolated item extraction. Use it as the primary source for fidelity.",
    "Reference image 2 is the full outfit photo. Use it only as secondary context for proportions and occluded details.",
    "Generate the item alone on a plain white or light neutral background.",
    "Do not include the person, body parts, mannequin, face, hair, hands, background scene, labels, prices, tags, hangers, or packaging.",
    "Do not show cropped torso, legs, feet, or the original photo background.",
    "Do not create underwear, lingerie, nude, transparent, or sexualized imagery. Keep the result safe and suitable for a fashion styling board.",
    "Preserve the visible garment design from the source photo: exact shape, main color, pattern, fit, fabric appearance, texture, seams, trim, buttons, hardware, and unique visible details.",
    "Preserve visible logos or graphic marks as design details when they are present, but do not invent or guess missing brand information.",
    "If the item is partly occluded in the source photo, infer only the simplest plausible continuation and avoid adding decorative details.",
    "Center the item, keep the entire product visible, and make it look like a polished e-commerce product photo.",
    `Detected item: ${item.category} / ${item.subcategory}`,
    `Main colors: ${colors}`,
    `Pattern: ${item.pattern}`,
    `Fit: ${item.fit}`,
    `Material appearance: ${materials}`,
    `Style tags: ${styles}`,
    `Source region: x=${item.region.x}, y=${item.region.y}, width=${item.region.width}, height=${item.region.height}, anchor=${item.region.anchor}`
  ].join("\n");
}

function padRegion(
  region: ImageAnalysis["outfit_profile"]["items"][number]["region"],
  padding: number
) {
  const x = Math.max(0, region.x - padding);
  const y = Math.max(0, region.y - padding);
  const right = Math.min(1, region.x + region.width + padding);
  const bottom = Math.min(1, region.y + region.height + padding);

  return {
    x,
    y,
    width: Math.max(0.01, right - x),
    height: Math.max(0.01, bottom - y)
  };
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
