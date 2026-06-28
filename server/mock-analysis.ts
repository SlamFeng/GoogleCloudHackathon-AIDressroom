import { randomUUID } from "node:crypto";

export interface ManualProfile {
  height_cm: number;
  weight_kg: number;
  gender_presentation: "female" | "male" | "neutral";
  age_range: "18-25" | "26-35" | "36-45" | "46+";
}

export type AnalysisMode = "mock" | "ai";

export function buildMockAnalysis(
  sessionId: string,
  profile: ManualProfile,
  analysisMode: AnalysisMode = "mock"
) {
  const analysisId = `ana_${randomUUID().slice(0, 12)}`;
  const captureId = `cap_${randomUUID().slice(0, 12)}`;
  const bmi = profile.weight_kg / Math.pow(profile.height_cm / 100, 2);
  const bodySize = bmi < 19 ? "slim" : bmi < 25 ? "average" : bmi < 30 ? "curvy" : "plus";

  return {
    session_id: sessionId,
    analysis_id: analysisId,
    analysis_mode: analysisMode,
    status: "ready" as const,
    captured_at: new Date().toISOString(),
    body_profile: {
      schema_version: "1.2" as const,
      ...profile,
      body_shape: "rectangle",
      body_size: bodySize,
      proportions: {
        shoulder_width: "average",
        waist_definition: "moderate",
        hip_width: "average",
        leg_to_torso: "balanced"
      },
      measurements: {
        bust_cm: null,
        waist_cm: null,
        hip_cm: null,
        shoulder_cm: Math.round(profile.height_cm * 0.235 * 10) / 10,
        inseam_cm: Math.round(profile.height_cm * 0.45 * 10) / 10,
        foot_length_cm: null
      },
      skin_tone: null,
      extraction: {
        source_capture_id: captureId,
        captured_views: ["front"] as ["front"],
        overall_confidence: 0.78,
        field_confidence: {
          body_shape: 0.72,
          body_size: 0.84,
          proportions: {
            shoulder_width: 0.78,
            waist_definition: 0.58,
            hip_width: 0.7,
            leg_to_torso: 0.82
          },
          measurements: {
            bust_cm: 0,
            waist_cm: 0,
            hip_cm: 0,
            shoulder_cm: 0.65,
            inseam_cm: 0.69,
            foot_length_cm: 0
          },
          skin_tone: 0
        },
        analysis_warnings: [
          {
            code: "SINGLE_VIEW_LIMITATION",
            affected_fields: [
              "measurements.bust_cm",
              "measurements.waist_cm",
              "measurements.hip_cm"
            ],
            message:
              "Circumference estimates were omitted because only a front view was captured."
          }
        ]
      },
      notes: "Mock analysis result. Replace buildMockAnalysis with Gemini structured output."
    },
    outfit_profile: {
      schema_version: "1.0" as const,
      overall_style: ["smart_casual", "minimal"],
      dominant_colors: [
        { name: "navy", hex: "#24324A", coverage: 0.42 },
        { name: "white", hex: "#F4F2EC", coverage: 0.25 }
      ],
      items: [
        {
          item_id: "detected_top_1",
          category: "top",
          subcategory: "shirt",
          layer: "inner",
          colors: [{ name: "white", hex: "#F4F2EC" }],
          pattern: "solid",
          fit: "regular",
          sleeve_length: "long",
          length: null,
          material_appearance: ["woven"],
          style_tags: ["minimal", "smart_casual"],
          visible: true,
          confidence: 0.91
        },
        {
          item_id: "detected_bottom_1",
          category: "bottom",
          subcategory: "trousers",
          layer: "base",
          colors: [{ name: "navy", hex: "#24324A" }],
          pattern: "solid",
          fit: "straight",
          sleeve_length: null,
          length: "full",
          material_appearance: ["woven"],
          style_tags: ["minimal"],
          visible: true,
          confidence: 0.88
        },
        {
          item_id: "detected_shoes_1",
          category: "shoes",
          subcategory: "sneakers",
          layer: "base",
          colors: [{ name: "white", hex: "#E9E8E2" }],
          pattern: "solid",
          fit: "regular",
          sleeve_length: null,
          length: null,
          material_appearance: ["leather_like"],
          style_tags: ["casual", "minimal"],
          visible: true,
          confidence: 0.8
        }
      ],
      styling_observations: {
        color_palette: "neutral",
        formality: "smart_casual",
        silhouette: "balanced",
        layering: "light"
      },
      extraction: {
        source_capture_id: captureId,
        captured_views: ["front"] as ["front"],
        overall_confidence: 0.86,
        analysis_warnings: []
      },
      notes: "Mock outfit result."
    }
  };
}
