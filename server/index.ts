import { randomUUID } from "node:crypto";
import cors from "cors";
import express from "express";
import { buildMockAnalysis, type ManualProfile } from "./mock-analysis.js";

const app = express();
const port = Number(process.env.PORT ?? 8787);
const analyses = new Map<string, ReturnType<typeof buildMockAnalysis>>();

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
  const profile = request.body?.manual_profile as ManualProfile | undefined;
  const captureDataUrl = request.body?.capture_data_url as string | undefined;

  if (!isValidProfile(profile)) {
    response.status(400).json({ error: "manual_profile 不完整或超出允许范围。" });
    return;
  }
  if (!captureDataUrl?.startsWith("data:image/")) {
    response.status(400).json({ error: "capture_data_url 必须是一张图片。" });
    return;
  }

  // Simulate an external multimodal model call while preserving the HTTP boundary.
  await new Promise((resolve) => setTimeout(resolve, 1450));
  const analysis = buildMockAnalysis(request.params.sessionId, profile);
  analyses.set(analysis.analysis_id, analysis);
  response.status(201).json(analysis);
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

function isValidProfile(value: ManualProfile | undefined): value is ManualProfile {
  if (!value) return false;
  return (
    Number.isFinite(value.height_cm) &&
    value.height_cm >= 100 &&
    value.height_cm <= 230 &&
    Number.isFinite(value.weight_kg) &&
    value.weight_kg >= 25 &&
    value.weight_kg <= 250 &&
    ["female", "male", "neutral"].includes(value.gender_presentation) &&
    ["18-25", "26-35", "36-45", "46+"].includes(value.age_range)
  );
}
