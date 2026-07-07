// Agent quality smoke — feeds realistic natural-language messages through the
// live agent and prints its actual decisions (route, parsed need, sets,
// constraint delta after feedback) so quality is inspectable by eye.
//
//   BASE_URL=http://localhost:8787 node scripts/agent-quality.mjs
//
// With no GEMINI_API_KEY the agent uses the deterministic heuristic layer;
// set a key (in .env) and restart the API to exercise real Gemini reasoning —
// the cases marked ⚠ below are where heuristics are expected to be weak.

const baseUrl = process.env.BASE_URL ?? "http://localhost:8787";

const scenarios = [
  { text: "没什么想法，帮我推荐几套适合我的", expect: "recommendation" },
  { text: "我想要一件黑色外套，预算1万以内", expect: "explicit" },
  { text: "下周去海边度假，想要清爽一点的穿搭", expect: "explicit" },
  { text: "通勤穿的，简约一点", expect: "explicit", hard: true },
  { text: "想换个完全不一样的感觉", expect: "unclear" },
  { text: "有没有适合约会的裙子", expect: "explicit" }
];

async function req(path, init = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers }
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path} → ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

async function main() {
  const health = await req("/api/health");
  const tier = health.analyzer?.includes("gemini") ? "Gemini reasoning" : "heuristic fallback (no key)";
  console.log(`\n  Agent quality smoke · ${baseUrl}\n  reasoning tier: ${tier}\n  ${"─".repeat(58)}`);

  let routeHits = 0;
  for (const sc of scenarios) {
    const started = await req("/api/agent/sessions", {
      method: "POST",
      body: JSON.stringify({ scene_type: "mirror", store_id: "store_001" })
    });
    const sid = started.state.session_id;

    const chat = await req(`/api/agent/sessions/${sid}/chat`, {
      method: "POST",
      body: JSON.stringify({ text: sc.text })
    });
    const state = chat.state;
    const route = state.route;
    const need = state.user_need ?? {};
    const sets = chat.output.recommendation?.sets ?? [];
    const routeOk = route === sc.expect;
    if (routeOk) routeHits += 1;

    console.log(`\n  “${sc.text}”${sc.hard ? "  ⚠(heuristic-weak)" : ""}`);
    console.log(`    route      : ${route} ${routeOk ? "✓" : `✗ (expected ${sc.expect})`}`);
    console.log(`    need       : cat=[${(need.categories ?? []).join(",")}] color=[${(need.colors ?? []).join(",")}] style=[${(need.style_tags ?? []).join(",")}] budget=${need.budget_yen ?? "-"} occ=${need.occasion ?? "-"}`);
    if (sets.length) {
      console.log(`    sets       : ${sets.length} · e.g. "${sets[0].reason?.slice(0, 60) ?? ""}"`);
    } else if (chat.output.type === "clarification") {
      console.log(`    clarify    : "${chat.output.message?.slice(0, 60)}"`);
    }

    // Feedback round: dislike color red, expect avoid + refine
    if (sets.length) {
      const fb = await req(`/api/agent/sessions/${sid}/feedback`, {
        method: "POST",
        body: JSON.stringify({ set_id: sets[0].set_id, feedback_type: "partial_adjust", dimension: "color", dimension_value: "red", raw_voice_text: "颜色太亮了，换掉" })
      });
      const delta = fb.output.constraint_delta ?? {};
      const avoided = (delta.avoid ?? []).map((a) => `${a.dimension}:${a.value}`).join(",");
      console.log(`    feedback   : avoid=[${avoided}] refine=${fb.output.type === "recommendations_refined" ? "yes" : "no"} newSets=${fb.output.recommendation?.sets?.length ?? 0}`);
    }
  }

  console.log(`\n  ${"─".repeat(58)}\n  route accuracy: ${routeHits}/${scenarios.length}\n  (⚠ cases need a Gemini key to route correctly)\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
