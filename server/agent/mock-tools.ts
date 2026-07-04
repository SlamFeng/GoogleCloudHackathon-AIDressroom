import type {
  AgentConstraints,
  BodyProfile,
  BodyTemplateResult,
  ConstraintDelta,
  OutfitPayload,
  OutfitSlotName,
  Product,
  RecommendationResponse,
  RecommendationSet,
  RecommendationType,
  Route,
  ToolCallRecord,
  TryonHandoffPayload
} from "./contracts.js";
import { createLucyPreviewToken } from "../providers/lucy.js";

export class ToolCallLog {
  readonly calls: ToolCallRecord[] = [];

  append(tool: string, input: Record<string, unknown>, output: Record<string, unknown>) {
    this.calls.push({
      tool,
      input,
      output,
      called_at: new Date().toISOString()
    });
  }
}

export class MockAgentTools {
  readonly log = new ToolCallLog();
  readonly feedbackStore: Array<Record<string, unknown>> = [];

  matchBodyTemplate(input: { session_id: string; body_profile: BodyProfile }): BodyTemplateResult {
    const shape = input.body_profile.body_shape ?? "unknown";
    const size = input.body_profile.body_size ?? "unknown";
    const templateId = `body_template_${shape}_${size}`.replace(/[^a-zA-Z0-9_]/g, "_");
    const output: BodyTemplateResult = {
      template_id: templateId,
      confidence: input.body_profile.extraction.overall_confidence,
      source: "match_body_template",
      notes: "mock deterministic body template mapping"
    };
    this.log.append("match_body_template", input as unknown as Record<string, unknown>, {
      ...output
    });
    return output;
  }

  getRecommendations(input: {
    session_id: string;
    route: Route;
    requested_types: RecommendationType[];
    matched_body_template_id: string;
    current_style: string[];
    constraints: AgentConstraints;
    round: number;
  }): RecommendationResponse {
    const sets = input.requested_types.map((type, index) =>
      this.buildRecommendationSet({
        type,
        round: input.round,
        index,
        constraints: input.constraints,
        currentStyle: input.current_style,
        matchedBodyTemplateId: input.matched_body_template_id
      })
    );
    const response: RecommendationResponse = {
      session_id: input.session_id,
      round: input.round,
      route: input.route,
      sets,
      warnings: []
    };
    this.log.append("get_recommendations", input as unknown as Record<string, unknown>, {
      round: response.round,
      set_ids: sets.map((set) => set.set_id)
    });
    return response;
  }

  refineRecommendations(input: {
    session_id: string;
    route: Route;
    previous_set_id: string;
    delta: ConstraintDelta;
    matched_body_template_id: string;
    current_style: string[];
    constraints: AgentConstraints;
    round: number;
  }): RecommendationResponse {
    const requestedTypes: RecommendationType[] = input.delta.avoid.some(
      (constraint) => constraint.dimension === "style"
    )
      ? ["style", "seasonal", "similar"]
      : ["similar", "style", "seasonal"];

    const response = this.getRecommendations({
      session_id: input.session_id,
      route: input.route,
      requested_types: requestedTypes,
      matched_body_template_id: input.matched_body_template_id,
      current_style: input.current_style,
      constraints: input.constraints,
      round: input.round
    });

    this.log.append("refine_recommendations", input as unknown as Record<string, unknown>, {
      round: response.round,
      set_ids: response.sets.map((set) => set.set_id)
    });
    return response;
  }

  recordFeedback(input: {
    session_id: string;
    set_id: string;
    feedback: Record<string, unknown>;
    constraint_delta: ConstraintDelta;
  }) {
    const output = {
      feedback_id: `feedback_${String(this.feedbackStore.length + 1).padStart(3, "0")}`,
      status: "recorded"
    };
    this.feedbackStore.push({ ...input, ...output });
    this.log.append("record_feedback", input, output);
    return output;
  }

  createRealFaceProfile(input: {
    session_id: string;
    image_ref: string;
    consent_given: boolean;
    expire_at: string;
  }) {
    const output = {
      consent_given: input.consent_given,
      face_mode: "real_face" as const,
      face_profile_id: `face_${input.session_id}`,
      expire_at: input.expire_at
    };
    this.log.append("create_real_face_profile", input, output);
    return output;
  }

  async buildRealtimeTryonPayload(input: {
    session_id: string;
    set: RecommendationSet;
    slot?: OutfitSlotName;
    duration_limit_sec: number;
    origin?: string;
  }) {
    const slot =
      input.slot ??
      input.set.outfit.slots.find((candidate) => candidate.slot === "outerwear")?.slot ??
      input.set.outfit.slots[0]?.slot;
    const selected = input.set.outfit.slots.find((candidate) => candidate.slot === slot);
    if (!selected) return null;

    const token = await createLucyPreviewToken({
      session_id: input.session_id,
      set_id: input.set.set_id,
      product_id: selected.product_id,
      duration_limit_sec: input.duration_limit_sec,
      origin: input.origin
    });
    const output = {
      provider: "decart_lucy_vton" as const,
      mode: "realtime" as const,
      configured: token.configured,
      model: token.model,
      session_id: input.session_id,
      set_id: input.set.set_id,
      slot: selected.slot,
      product_id: selected.product_id,
      garment_image_url: selected.vton_reference_image_url,
      prompt: selected.prompt,
      duration_limit_sec: token.duration_limit_sec,
      enhance: false,
      client_token: token.client_token,
      expires_at: token.expires_at,
      warnings: token.warnings
    };
    this.log.append("prepare_realtime_tryon_payload", input as unknown as Record<string, unknown>, {
      product_id: output.product_id,
      slot: output.slot,
      configured: output.configured
    });
    return output;
  }

  handoffTryonGeneration(input: TryonHandoffPayload) {
    const output = {
      status: "accepted",
      generation_id: `tryon_${input.session_id}_${input.set_id}`,
      ...input
    };
    this.log.append("handoff_tryon_generation", input as unknown as Record<string, unknown>, {
      status: output.status,
      generation_id: output.generation_id
    });
    return output;
  }

  private buildRecommendationSet(input: {
    type: RecommendationType;
    round: number;
    index: number;
    constraints: AgentConstraints;
    currentStyle: string[];
    matchedBodyTemplateId: string;
  }): RecommendationSet {
    const available = filterProducts(catalog, input.constraints);
    const anchorStyle = input.type === "similar" ? input.currentStyle[0] : styleForType(input.type);
    const sorted = [...available].sort((a, b) => scoreProduct(b, anchorStyle) - scoreProduct(a, anchorStyle));
    const products = chooseOutfitProducts(sorted, input.type, input.index);
    const setId = `set_r${input.round}_${input.type}_${input.index + 1}`;
    return {
      set_id: setId,
      round: input.round,
      rec_type: input.type,
      products,
      outfit: buildOutfitPayload(products),
      reason: reasonForType(input.type, input.matchedBodyTemplateId)
    };
  }
}

function filterProducts(products: Product[], constraints: AgentConstraints) {
  const avoidColors = constraints.avoid
    .filter((constraint) => constraint.dimension === "color")
    .map((constraint) => constraint.value);
  const avoidStyles = constraints.avoid
    .filter((constraint) => constraint.dimension === "style")
    .map((constraint) => constraint.value);

  return products.filter((product) => {
    if (constraints.budget_yen && product.price_yen > constraints.budget_yen) return false;
    if (avoidColors.some((color) => product.colors.includes(color))) return false;
    if (avoidStyles.some((style) => product.style_tags.includes(style))) return false;
    return Object.values(product.stock).some((quantity) => quantity > 0);
  });
}

function styleForType(type: RecommendationType) {
  if (type === "style") return "smart_casual";
  if (type === "seasonal") return "seasonal";
  if (type === "explicit_need") return "minimal";
  return "casual";
}

function scoreProduct(product: Product, style?: string) {
  return (
    (style && product.style_tags.includes(style) ? 10 : 0) +
    product.seasonal_rank +
    Object.values(product.stock).reduce((total, quantity) => total + quantity, 0) / 10
  );
}

function chooseOutfitProducts(products: Product[], type: RecommendationType, index: number) {
  const outerwear = products.filter((product) => product.category === "outerwear");
  const tops = products.filter((product) => product.category === "top");
  const bottoms = products.filter((product) => product.category === "bottom");
  const offset = type === "seasonal" ? 1 : index;
  return [
    outerwear[offset % Math.max(outerwear.length, 1)],
    tops[(offset + 1) % Math.max(tops.length, 1)],
    bottoms[(offset + 2) % Math.max(bottoms.length, 1)]
  ].filter(Boolean);
}

function buildOutfitPayload(products: Product[]): OutfitPayload {
  return {
    slots: products.map((product) => ({
      slot: product.category,
      product_id: product.product_id,
      image_url: product.image_url,
      vton_reference_image_url: product.vton_reference_image_url,
      prompt: product.vton_prompt
    }))
  };
}

function reasonForType(type: RecommendationType, templateId: string) {
  if (type === "similar") return `Keeps the customer's current style while fitting ${templateId}.`;
  if (type === "style") return `Uses the store's main styling direction for ${templateId}.`;
  if (type === "seasonal") return `Prioritizes seasonal and high-stock items for ${templateId}.`;
  return `Matches the explicit customer request and current stock for ${templateId}.`;
}

const catalog: Product[] = [
  {
    product_id: "p_outer_001",
    sku: "JK-001",
    name: "Navy cropped jacket",
    category: "outerwear",
    price_yen: 9800,
    colors: ["navy", "blue"],
    style_tags: ["casual", "minimal", "smart_casual"],
    body_template_tags: ["body_template_pear_average", "body_template_rectangle_average"],
    seasonal_rank: 8,
    stock: { M: 4, L: 2 },
    image_url: "/mock-products/navy-jacket.jpg",
    vton_reference_image_url: "/mock-products/navy-jacket-vton.png",
    vton_prompt:
      "Substitute the current outerwear with a navy cropped jacket. Keep face, body shape, pose, hands, and background unchanged."
  },
  {
    product_id: "p_outer_002",
    sku: "JK-002",
    name: "Light casual shirt jacket",
    category: "outerwear",
    price_yen: 7600,
    colors: ["white", "beige"],
    style_tags: ["casual", "smart_casual"],
    body_template_tags: ["body_template_pear_average", "body_template_unknown_unknown"],
    seasonal_rank: 7,
    stock: { M: 3, L: 3 },
    image_url: "/mock-products/light-shirt-jacket.jpg",
    vton_reference_image_url: "/mock-products/light-shirt-jacket-vton.png",
    vton_prompt:
      "Substitute the current outerwear with a light beige casual shirt jacket. Keep the original person and camera scene unchanged."
  },
  {
    product_id: "p_top_001",
    sku: "TP-001",
    name: "White fitted knit top",
    category: "top",
    price_yen: 5200,
    colors: ["white"],
    style_tags: ["minimal", "smart_casual"],
    body_template_tags: ["body_template_rectangle_average", "body_template_pear_average"],
    seasonal_rank: 6,
    stock: { S: 2, M: 7 },
    image_url: "/mock-products/white-knit.jpg",
    vton_reference_image_url: "/mock-products/white-knit-vton.png",
    vton_prompt:
      "Substitute the current top with a clean white fitted knit top. Preserve face, pose, hair, hands, and background."
  },
  {
    product_id: "p_top_002",
    sku: "TP-002",
    name: "Soft pink relaxed blouse",
    category: "top",
    price_yen: 5900,
    colors: ["pink"],
    style_tags: ["romantic", "casual"],
    body_template_tags: ["body_template_pear_average"],
    seasonal_rank: 9,
    stock: { M: 5 },
    image_url: "/mock-products/pink-blouse.jpg",
    vton_reference_image_url: "/mock-products/pink-blouse-vton.png",
    vton_prompt:
      "Substitute the current top with a soft pink relaxed blouse. Keep identity, body shape, and room lighting unchanged."
  },
  {
    product_id: "p_bottom_001",
    sku: "BT-001",
    name: "Dark straight-leg denim",
    category: "bottom",
    price_yen: 8800,
    colors: ["navy", "blue"],
    style_tags: ["casual", "classic"],
    body_template_tags: ["body_template_pear_average", "body_template_rectangle_average"],
    seasonal_rank: 7,
    stock: { M: 3, L: 2 },
    image_url: "/mock-products/dark-denim.jpg",
    vton_reference_image_url: "/mock-products/dark-denim-vton.png",
    vton_prompt:
      "Substitute the current bottoms with dark straight-leg denim pants. Keep upper body, face, pose, and background stable."
  },
  {
    product_id: "p_bottom_002",
    sku: "BT-002",
    name: "Black tapered trousers",
    category: "bottom",
    price_yen: 9200,
    colors: ["black"],
    style_tags: ["business", "minimal", "smart_casual"],
    body_template_tags: ["body_template_rectangle_average", "body_template_pear_average"],
    seasonal_rank: 5,
    stock: { S: 2, M: 2 },
    image_url: "/mock-products/black-trousers.jpg",
    vton_reference_image_url: "/mock-products/black-trousers-vton.png",
    vton_prompt:
      "Substitute the current bottoms with black tapered trousers. Keep the person and background unchanged."
  }
];
