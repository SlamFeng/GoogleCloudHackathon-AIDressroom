import "./design/screens/styling.css";
import { AgentRuntimePanel } from "./AgentRuntimePanel";
import type { AnalysisHandoff } from "./types";

// Staff-facing engineering console (landscape iPad). A light full-screen page
// wrapper around the unchanged AgentRuntimePanel — status badges, tool-call
// trace, ADK events, Lucy connection/model/token debug all live here.
//
// Staff starts fresh (no capture flow), so seed a valid sample handoff — the
// agent's match_body_template reads body_profile.body_shape, so an empty
// object would crash on Start Agent.
const SAMPLE_ANALYSIS: AnalysisHandoff = {
  session_id: "staff_demo",
  analysis_id: "ana_staff_demo",
  analysis_mode: "mock",
  status: "ready",
  captured_at: new Date().toISOString(),
  body_profile: {
    schema_version: "1.2",
    height_cm: 168,
    weight_kg: 58,
    gender_presentation: "neutral",
    age_range: "26-35",
    body_shape: "rectangle",
    body_size: "average",
    proportions: {
      shoulder_width: "average",
      waist_definition: "moderate",
      hip_width: "average",
      leg_to_torso: "balanced"
    },
    skin_tone: null,
    extraction: {
      source_capture_id: "cap_staff_demo",
      captured_views: ["front"],
      overall_confidence: 0.8,
      field_confidence: {},
      analysis_warnings: []
    },
    notes: "Staff console demo sample."
  },
  outfit_profile: {
    schema_version: "1.0",
    overall_style: ["smart_casual", "minimal"],
    dominant_colors: [{ name: "navy", hex: "#24324A", coverage: 0.42 }],
    items: [],
    styling_observations: {
      color_palette: "neutral",
      formality: "smart_casual",
      silhouette: "balanced",
      layering: "light"
    },
    extraction: {
      source_capture_id: "cap_staff_demo",
      captured_views: ["front"],
      overall_confidence: 0.85,
      analysis_warnings: []
    },
    notes: ""
  }
};

export function StaffConsole() {
  return (
    <div className="staff-shell">
      <div className="staff-shell-inner">
        <AgentRuntimePanel analysis={SAMPLE_ANALYSIS} />
      </div>
    </div>
  );
}
