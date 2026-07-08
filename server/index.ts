import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import {
  analyzeDressroomImage,
  generateTryonImage,
  getGeminiModel,
  getGeminiImageModel,
  hasGeminiApiKey,
  imageAnalysisInputSchema,
  type ImageAnalysisToolResult
} from "./image-analysis-tool.js";
import { agentRouter } from "./agent/api.js";
import { inventoryRouter } from "./inventory/api.js";
import { getInventoryService, resolveBackend } from "./inventory/factory.js";

const app = express();
const port = Number(process.env.PORT ?? 8787);
type StoredAnalysis = Extract<ImageAnalysisToolResult, { ok: true }>["analysis"];
const analyses = new Map<string, StoredAnalysis>();

app.use(cors());
app.use(express.json({ limit: "12mb" }));
app.use("/api/agent", agentRouter);
app.use("/api/inventory", inventoryRouter);

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    analyzer: hasGeminiApiKey() ? "auto+gemini" : "auto+mock",
    agent: "adk_control_plane",
    gemini_model: getGeminiModel(),
    gemini_image_model: getGeminiImageModel(),
    inventory_backend: resolveBackend(),
    body_schema_version: "1.2",
    outfit_schema_version: "1.0"
  });
});

app.post("/api/sessions", (_request, response) => {
  response.status(201).json({
    session_id: `ses_${randomUUID().slice(0, 12)}`,
    image_retention: "session_only"
  });
});

app.post("/api/sessions/:sessionId/analyses", async (request, response) => {
  const parsedInput = imageAnalysisInputSchema.safeParse({
    session_id: request.params.sessionId,
    manual_profile: request.body?.manual_profile,
    capture_data_url: request.body?.capture_data_url,
    analysis_mode: request.body?.analysis_mode ?? "auto"
  });

  if (!parsedInput.success) {
    response.status(400).json({
      error: parsedInput.error.issues[0]?.message ?? "分析参数不完整或超出允许范围。"
    });
    return;
  }

  // Keep the demo delay while the HTTP route acts as a thin compatibility layer over the ADK tool.
  await new Promise((resolve) => setTimeout(resolve, 1450));
  const result = await analyzeDressroomImage(parsedInput.data);
  if (!result.ok) {
    response.status(501).json({
      error:
        result.error_code === "AI_ANALYZER_NOT_CONFIGURED"
          ? "Gemini API key 未配置。请设置 GEMINI_API_KEY 或 GOOGLE_API_KEY，重启服务后再使用 AI 分析，或使用 auto/mock 分析模式。"
          : "Gemini AI 分析失败。请检查 key、模型权限、图片大小和结构化输出 schema。",
      details: result
    });
    return;
  }

  analyses.set(result.analysis.analysis_id, result.analysis);
  response.status(201).json(result.analysis);
});

app.post("/api/analyses/:analysisId/confirm", (request, response) => {
  const analysis = analyses.get(request.params.analysisId);
  if (!analysis) {
    response.status(404).json({ error: "找不到该分析结果，可能会话已经结束。" });
    return;
  }

  const bodyProfile = request.body?.body_profile;
  if (!bodyProfile || bodyProfile.schema_version !== "1.2") {
    response.status(400).json({ error: "body_profile 必须符合 v1.2 契约。" });
    return;
  }

  const confirmed = {
    ...analysis,
    body_profile: {
      ...bodyProfile,
      notes: [bodyProfile.notes, "User confirmed."].filter(Boolean).join(" ")
    }
  };
  analyses.set(analysis.analysis_id, confirmed);
  response.json(confirmed);
});

// Background "high-quality try-on": compose the customer wearing an outfit from
// their capture photo + the set's garment images. Returns { image_data_url:
// null } when Gemini isn't configured or generation fails (client shows the
// live-mirror placeholder instead).
app.post("/api/tryon-image", async (request, response) => {
  const body = (request.body ?? {}) as {
    person_image?: unknown;
    product_ids?: unknown;
    look_label?: unknown;
  };
  if (typeof body.person_image !== "string" || !Array.isArray(body.product_ids)) {
    response.status(400).json({ error: "person_image and product_ids are required." });
    return;
  }
  const garments: Array<{ mimeType: string; base64Data: string }> = [];
  for (const id of body.product_ids) {
    if (typeof id !== "string") continue;
    const buffer = readProductImage(id);
    if (buffer) garments.push({ mimeType: "image/jpeg", base64Data: buffer.toString("base64") });
  }
  const imageDataUrl = await generateTryonImage({
    personImageDataUrl: body.person_image,
    garments,
    lookLabel: typeof body.look_label === "string" ? body.look_label : undefined
  });
  response.json({ image_data_url: imageDataUrl });
});

function readProductImage(productId: string): Buffer | null {
  for (const base of ["../dist/mock-products", "../public/mock-products"]) {
    try {
      return readFileSync(fileURLToPath(new URL(`${base}/${productId}.jpg`, import.meta.url)));
    } catch {
      /* try next location */
    }
  }
  return null;
}

app.delete("/api/sessions/:sessionId", (request, response) => {
  for (const [analysisId, analysis] of analyses.entries()) {
    if (analysis.session_id === request.params.sessionId) analyses.delete(analysisId);
  }
  response.status(204).end();
});

// Serve the built frontend (single Cloud Run service). In dev the SPA is served
// by Vite instead; this is a no-op until `dist/` exists.
const clientDir = fileURLToPath(new URL("../dist", import.meta.url));
const clientIndex = fileURLToPath(new URL("../dist/index.html", import.meta.url));
app.use(express.static(clientDir));
app.use((request, response, next) => {
  if (request.method !== "GET" || request.path.startsWith("/api")) return next();
  response.sendFile(clientIndex, (error) => {
    if (error) next();
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`AIDA capture API listening on http://localhost:${port}`);
});

// Release abandoned reservation holds back to available stock on a timer.
void getInventoryService().then((service) => service.startExpirySweeper());
