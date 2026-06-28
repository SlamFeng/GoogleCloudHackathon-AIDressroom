export type GenderPresentation = "female" | "male" | "neutral";
export type AgeRange = "18-25" | "26-35" | "36-45" | "46+";
export type AnalysisMode = "mock" | "ai";

export interface ManualProfile {
  height_cm: number;
  weight_kg: number;
  gender_presentation: GenderPresentation;
  age_range: AgeRange;
}

export type BodyShape =
  | "hourglass"
  | "pear"
  | "apple"
  | "rectangle"
  | "inverted_triangle"
  | "trapezoid"
  | "triangle"
  | "oval"
  | "unknown";

export interface AnalysisWarning {
  code: string;
  affected_fields?: string[];
  affected_items?: string[];
  message: string;
}

export interface BodyProfile extends ManualProfile {
  schema_version: "1.2";
  body_shape: BodyShape | null;
  body_size: "slim" | "average" | "curvy" | "plus" | "unknown" | null;
  proportions: {
    shoulder_width: "narrow" | "average" | "broad" | "unknown" | null;
    waist_definition: "defined" | "moderate" | "straight" | "unknown" | null;
    hip_width: "narrow" | "average" | "wide" | "unknown" | null;
    leg_to_torso: "short" | "balanced" | "long" | "unknown" | null;
  };
  measurements: {
    bust_cm: number | null;
    waist_cm: number | null;
    hip_cm: number | null;
    shoulder_cm: number | null;
    inseam_cm: number | null;
    foot_length_cm: number | null;
  };
  skin_tone: "fair" | "light" | "medium" | "tan" | "deep" | "unknown" | null;
  extraction: {
    source_capture_id: string;
    captured_views: ["front"];
    overall_confidence: number;
    field_confidence: Record<string, unknown>;
    analysis_warnings: AnalysisWarning[];
  };
  notes: string;
}

export interface OutfitItem {
  item_id: string;
  category: string;
  subcategory: string;
  layer: string;
  colors: Array<{ name: string; hex: string | null }>;
  pattern: string;
  fit: string;
  sleeve_length: string | null;
  length: string | null;
  material_appearance: string[];
  style_tags: string[];
  visible: boolean;
  confidence: number;
}

export interface OutfitProfile {
  schema_version: "1.0";
  overall_style: string[];
  dominant_colors: Array<{ name: string; hex: string | null; coverage: number }>;
  items: OutfitItem[];
  styling_observations: {
    color_palette: string;
    formality: string;
    silhouette: string;
    layering: string;
  };
  extraction: {
    source_capture_id: string;
    captured_views: ["front"];
    overall_confidence: number;
    analysis_warnings: AnalysisWarning[];
  };
  notes: string;
}

export interface AnalysisHandoff {
  session_id: string;
  analysis_id: string;
  analysis_mode: AnalysisMode;
  status: "ready";
  captured_at: string;
  body_profile: BodyProfile;
  outfit_profile: OutfitProfile;
}

export type AppStep =
  | "welcome"
  | "consent"
  | "profile"
  | "capture"
  | "analyzing"
  | "review"
  | "complete";
