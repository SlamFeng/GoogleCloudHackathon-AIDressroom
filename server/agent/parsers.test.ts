import { strict as assert } from "node:assert";
import { test } from "node:test";
import { parseFeedback, parseNeed, routeIntent } from "./parsers.js";

// Golden cases mirror docs/AGENT_WORKFLOW_SPEC.md §6. These exercise the
// deterministic heuristic layer (the offline fallback used when no Gemini key
// is configured), so CI stays fully reproducible.

test("routeIntent: recommendation when the customer has no idea", () => {
  assert.equal(routeIntent("没什么想法，请给我推荐几套"), "recommendation");
  assert.equal(routeIntent("随便，你来"), "recommendation");
});

test("routeIntent: explicit when a category or budget is stated", () => {
  assert.equal(routeIntent("我想要一件黑色外套"), "explicit");
  assert.equal(routeIntent("预算2万以内"), "explicit");
});

test("routeIntent: unclear on vague intent", () => {
  assert.equal(routeIntent("想换个感觉"), "unclear");
});

test("parseNeed: extracts colors, categories, and style", () => {
  const need = parseNeed("黑色简约外套");
  assert.ok(need.colors.includes("black"));
  assert.ok(need.categories.includes("outerwear"));
  assert.ok(need.style_tags.includes("minimal"));
});

test("parseNeed: parses a digit budget with 万 unit", () => {
  assert.equal(parseNeed("预算1万以内").budget_yen, 10000);
  assert.equal(parseNeed("预算2万日元").budget_yen, 20000);
});

test("parseFeedback: color dislike adds an avoid constraint and asks to refine", () => {
  const delta = parseFeedback({
    set_id: "set_1",
    feedback_type: "partial_adjust",
    dimension: "color",
    dimension_value: "red"
  });
  assert.ok(delta.avoid.some((c) => c.dimension === "color" && c.value === "red"));
  assert.equal(delta.requires_new_recommendation, true);
});

test("parseFeedback: confirm does not trigger a new recommendation", () => {
  const delta = parseFeedback({ set_id: "set_1", feedback_type: "confirm" });
  assert.equal(delta.requires_new_recommendation, false);
});

test("parseFeedback: reject_all broadens and refines", () => {
  const delta = parseFeedback({ set_id: "set_1", feedback_type: "reject_all" });
  assert.equal(delta.requires_new_recommendation, true);
  assert.ok(delta.avoid.some((c) => c.dimension === "overall"));
});

test("parseFeedback: positive_keep records a preference without refining", () => {
  const delta = parseFeedback({
    set_id: "set_1",
    feedback_type: "positive_keep",
    dimension: "style",
    dimension_value: "minimal"
  });
  assert.equal(delta.requires_new_recommendation, false);
  assert.ok(delta.prefer.some((c) => c.value === "minimal"));
});
