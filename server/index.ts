import { randomUUID } from "node:crypto";
import cors from "cors";
import express from "express";
import {
  analyzeDressroomImage,
  imageAnalysisInputSchema,
  type ImageAnalysisToolResult
} from "./image-analysis-tool.js";

const app = express();
const port = Number(process.env.PORT ?? 8787);
type StoredAnalysis = Extract<ImageAnalysisToolResult, { ok: true }>["analysis"];
const analyses = new Map<string, StoredAnalysis>();

app.use(cors());
app.use(express.json({ limit: "12mb" }));

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    analyzer: "mock",
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
    analysis_mode: request.body?.analysis_mode ?? "mock"
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
      error: "AI 分析接口已预留，但真实模型调用尚未接入。请先使用 Mock 分析，或接入 Gemini 后再启用 AI 模式。",
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

app.delete("/api/sessions/:sessionId", (request, response) => {
  for (const [analysisId, analysis] of analyses.entries()) {
    if (analysis.session_id === request.params.sessionId) analyses.delete(analysisId);
  }
  response.status(204).end();
});

app.listen(port, "0.0.0.0", () => {
  console.log(`AIDA capture API listening on http://localhost:${port}`);
});
