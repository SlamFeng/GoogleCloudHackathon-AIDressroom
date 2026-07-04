const baseUrl = process.env.BASE_URL ?? "http://localhost:8787";

const tinyPng =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

async function main() {
  const health = await request("/api/health");
  assertEqual(health.agent, "adk_control_plane", "health exposes ADK control plane");

  const captureSession = await request("/api/sessions", { method: "POST", body: "{}" });
  assert(captureSession.session_id, "capture session id returned");

  const analysis = await request(`/api/sessions/${captureSession.session_id}/analyses`, {
    method: "POST",
    body: JSON.stringify({
      analysis_mode: "mock",
      capture_data_url: tinyPng,
      manual_profile: {
        height_cm: 168,
        weight_kg: 58,
        gender_presentation: "neutral",
        age_range: "26-35"
      }
    })
  });
  assertEqual(analysis.status, "ready", "mock analysis ready");

  const started = await request("/api/agent/sessions", {
    method: "POST",
    body: JSON.stringify({
      scene_type: "mirror",
      store_id: "store_001",
      analysis
    })
  });
  assertEqual(started.output.type, "agent_session_started", "agent session starts");
  assertEqual(started.adk_events.at(-1).author, "dressroom_workflow_agent", "ADK agent authored start");

  const agentSessionId = started.state.session_id;
  const recommended = await request(`/api/agent/sessions/${agentSessionId}/chat`, {
    method: "POST",
    body: JSON.stringify({
      text: "没什么想法，请根据我当前穿搭推荐三套适合我的衣服。"
    })
  });
  assertEqual(recommended.output.type, "recommendations", "recommendations generated");
  assert(
    recommended.output.recommendation.sets.length >= 3,
    "recommendation flow returns at least three sets"
  );
  assert(recommended.state.matched_body_template_id, "body template id is stored in Agent state");
  assert(
    recommended.state.tool_calls.every((call) => call.input.session_id === agentSessionId),
    "tool trace is scoped to this Agent session"
  );

  const setId = recommended.output.recommendation.sets[0].set_id;
  const preview = await request(`/api/agent/sessions/${agentSessionId}/preview`, {
    method: "POST",
    body: JSON.stringify({
      set_id: setId,
      duration_limit_sec: 10
    })
  });
  assertEqual(preview.output.type, "realtime_tryon_payload", "Lucy payload returned");
  assertEqual(preview.output.payload.provider, "decart_lucy_vton", "Lucy provider selected");
  assertEqual(preview.state.aha_demo.stage, "lucy_preview", "Aha state enters Lucy preview");
  assertNoClientTokenInEvents(preview.adk_events);

  const previewStatus = await request(`/api/agent/sessions/${agentSessionId}/preview/status`, {
    method: "POST",
    body: JSON.stringify({
      status: "stopped",
      reason: "duration_limit_reached",
      lucy_session_id: "smoke_lucy_session"
    })
  });
  assertEqual(previewStatus.output.type, "preview_status_recorded", "preview status recorded");
  assertEqual(previewStatus.state.lucy_session_status, "stopped", "Lucy status persisted");
  assert(
    ["google_generating", "google_ready"].includes(previewStatus.state.aha_demo.stage),
    "Aha state advances after Lucy stops"
  );

  const refined = await request(`/api/agent/sessions/${agentSessionId}/feedback`, {
    method: "POST",
    body: JSON.stringify({
      set_id: setId,
      feedback_type: "partial_adjust",
      dimension: "style",
      dimension_value: "too_formal",
      raw_voice_text: "这套太正式了，换休闲一点。"
    })
  });
  assertEqual(refined.output.type, "recommendations_refined", "feedback refines recommendations");
  assert(refined.state.feedback_history.length >= 1, "feedback history persisted in state");

  const confirmSetId = refined.output.recommendation.sets[0].set_id;
  const confirmed = await request(`/api/agent/sessions/${agentSessionId}/confirm`, {
    method: "POST",
    body: JSON.stringify({
      set_id: confirmSetId,
      camera_processing_consent: false,
      face_profile_consent: false
    })
  });
  assertEqual(confirmed.output.type, "tryon_handoff", "final try-on handoff generated");
  assertEqual(confirmed.state.aha_demo.stage, "handoff_ready", "Aha state reaches handoff");
  assertEqual(confirmed.output.handoff.use_own_face, false, "no consent uses default face path");
  assert(confirmed.output.reservation?.reservation_id, "confirm places an inventory hold on the selected outfit");
  assertNoClientTokenInEvents(confirmed.adk_events);

  const purchased = await request(`/api/agent/sessions/${agentSessionId}/purchase`, {
    method: "POST",
    body: "{}"
  });
  assertEqual(purchased.output.type, "purchase_completed", "purchase commits the reservation to a real stock decrement");
  assert(purchased.output.store_route?.stops?.length >= 1, "purchase returns an in-store pickup route");
  const toolNames = new Set(purchased.state.tool_calls.map((call) => call.tool));
  for (const tool of ["search_inventory", "reserve_items", "confirm_purchase", "create_store_route"]) {
    assert(toolNames.has(tool), `inventory tool ${tool} appears in the Agent tool trace`);
  }

  const restored = await request(`/api/agent/sessions/${agentSessionId}`);
  assertEqual(restored.state.status, "handoff_ready", "session can be read back after writes");

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        agentSessionId,
        recommendationRound: confirmed.state.recommendation_round,
        ahaStage: confirmed.state.aha_demo.stage,
        toolCalls: confirmed.state.tool_calls.length
      },
      null,
      2
    )
  );
}

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers
    }
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} failed (${response.status}): ${JSON.stringify(payload)}`);
  }
  return payload;
}

function assert(condition, message) {
  if (!condition) throw new Error(`Smoke assertion failed: ${message}`);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      `Smoke assertion failed: ${message}; expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

function assertNoClientTokenInEvents(events) {
  const leaked = events?.some((event) => /"client_token"\s*:\s*"(?!\[redacted\])/.test(event.text));
  assert(!leaked, "ADK event text must not expose raw Lucy client_token");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
