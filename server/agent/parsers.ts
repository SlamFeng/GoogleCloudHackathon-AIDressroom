import type {
  ConstraintDelta,
  FeedbackDimension,
  ParsedNeed
} from "./contracts.js";
import { type FeedbackPayloadInput } from "./types.js";

const colorLexicon: Record<string, string> = {
  黑: "black",
  白: "white",
  红: "red",
  蓝: "blue",
  绿: "green",
  黄: "yellow",
  粉: "pink",
  紫: "purple",
  灰: "gray",
  米: "beige",
  navy: "navy",
  black: "black",
  white: "white",
  red: "red",
  blue: "blue",
  beige: "beige"
};

const categoryLexicon: Record<string, string> = {
  外套: "outerwear",
  夹克: "outerwear",
  上衣: "top",
  衬衫: "top",
  毛衣: "top",
  裤: "bottom",
  裙: "bottom",
  连衣裙: "dress",
  鞋: "shoes",
  jacket: "outerwear",
  coat: "outerwear",
  shirt: "top",
  top: "top",
  pants: "bottom",
  skirt: "bottom",
  dress: "dress"
};

const styleLexicon: Record<string, string> = {
  休闲: "casual",
  通勤: "business",
  正式: "formal",
  简约: "minimal",
  街头: "streetwear",
  运动: "sporty",
  可爱: "romantic",
  casual: "casual",
  business: "business",
  formal: "formal",
  minimal: "minimal",
  street: "streetwear"
};

export function routeIntent(text: string): "explicit" | "recommendation" | "unclear" {
  const normalized = text.toLowerCase();
  if (/没.*想法|不知道|推荐|随便|适合我|你来/.test(normalized)) return "recommendation";
  if (Object.keys(categoryLexicon).some((keyword) => normalized.includes(keyword))) return "explicit";
  if (/预算|以内|日元|yen|想要|找/.test(normalized)) return "explicit";
  return "unclear";
}

export function parseNeed(text: string): ParsedNeed {
  const colors = collectMatches(text, colorLexicon);
  const categories = collectMatches(text, categoryLexicon);
  const styleTags = collectMatches(text, styleLexicon);
  const budget = parseBudgetYen(text);
  return {
    raw_text: text,
    categories,
    colors,
    style_tags: styleTags,
    budget_yen: budget
  };
}

export function parseFeedback(feedback: FeedbackPayloadInput): ConstraintDelta {
  if (feedback.feedback_type === "confirm") {
    return {
      prefer: [],
      avoid: [],
      requires_new_recommendation: false,
      notes: "confirmed"
    };
  }

  if (feedback.feedback_type === "positive_keep") {
    const dimension = feedback.dimension ?? "overall";
    return {
      prefer: [
        {
          dimension,
          value: feedback.dimension_value ?? "current_selection",
          reason: "positive_feedback"
        }
      ],
      avoid: [],
      requires_new_recommendation: false,
      notes: "positive_feedback"
    };
  }

  if (feedback.feedback_type === "reject_all") {
    return {
      prefer: [],
      avoid: [
        {
          dimension: "overall",
          value: feedback.set_id,
          reason: "reject_all"
        }
      ],
      requires_new_recommendation: true,
      notes: "reject_all"
    };
  }

  const text = feedback.raw_voice_text ?? "";
  const dimension = feedback.dimension ?? inferFeedbackDimension(text);
  const value = feedback.dimension_value ?? inferFeedbackValue(dimension, text) ?? "unspecified";
  const budget = dimension === "price" ? parseBudgetYen(text) : undefined;

  return {
    prefer: buildPreference(dimension, value),
    avoid: [
      {
        dimension,
        value,
        reason: "negative_feedback"
      }
    ],
    budget_yen: budget,
    requires_new_recommendation: true,
    notes: `${dimension}_feedback`
  };
}

function buildPreference(dimension: FeedbackDimension, value: string) {
  if (dimension === "style" && /正式|formal|too_formal/.test(value)) {
    return [
      {
        dimension,
        value: "casual",
        reason: "style_counter_preference"
      }
    ];
  }
  if (dimension === "price") {
    return [
      {
        dimension,
        value: "lower_price",
        reason: "price_counter_preference"
      }
    ];
  }
  return [];
}

function collectMatches(text: string, lexicon: Record<string, string>) {
  const normalized = text.toLowerCase();
  return Array.from(
    new Set(
      Object.entries(lexicon)
        .filter(([keyword]) => normalized.includes(keyword.toLowerCase()))
        .map(([, value]) => value)
    )
  );
}

function parseBudgetYen(text: string) {
  const match = /(\d+(?:\.\d+)?)\s*(万|w|千|k|円|日元|yen)?/i.exec(text);
  if (!match) return undefined;

  const value = Number(match[1]);
  const unit = match[2]?.toLowerCase();
  if (Number.isNaN(value)) return undefined;
  if (unit === "万" || unit === "w") return Math.round(value * 10000);
  if (unit === "千" || unit === "k") return Math.round(value * 1000);
  return Math.round(value);
}

function inferFeedbackDimension(text: string): FeedbackDimension {
  if (/颜色|色|red|blue|black|white/.test(text)) return "color";
  if (/版型|剪裁|宽|紧|fit|size/.test(text)) return "fit";
  if (/风格|正式|休闲|style|formal|casual/.test(text)) return "style";
  if (/贵|便宜|预算|price|expensive/.test(text)) return "price";
  return "overall";
}

function inferFeedbackValue(dimension: FeedbackDimension, text: string) {
  if (dimension === "color") return collectMatches(text, colorLexicon)[0];
  if (dimension === "style") {
    if (/太正式|too formal|formal/.test(text)) return "too_formal";
    return collectMatches(text, styleLexicon)[0];
  }
  if (dimension === "price") return parseBudgetYen(text)?.toString();
  if (dimension === "fit") {
    if (/宽|loose|oversized/.test(text)) return "too_loose";
    if (/紧|tight/.test(text)) return "too_tight";
  }
  return undefined;
}
