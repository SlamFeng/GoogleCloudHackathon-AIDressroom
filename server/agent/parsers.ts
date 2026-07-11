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
  beige: "beige",
  green: "green",
  yellow: "yellow",
  pink: "pink",
  purple: "purple",
  gray: "gray",
  grey: "gray",
  brown: "brown",
  khaki: "khaki",
  cream: "cream"
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
  blazer: "outerwear",
  shirt: "top",
  top: "top",
  "t-shirt": "top",
  tshirt: "top",
  sweater: "top",
  blouse: "top",
  hoodie: "top",
  pants: "bottom",
  jeans: "bottom",
  trousers: "bottom",
  shorts: "bottom",
  skirt: "bottom",
  dress: "dress",
  shoes: "shoes",
  sneakers: "shoes",
  boots: "shoes",
  heels: "shoes"
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
  minimalist: "minimal",
  street: "streetwear",
  sporty: "sporty",
  athletic: "sporty",
  cute: "romantic",
  dressy: "formal",
  elegant: "classic"
};

// Coarse formality the customer asks for → the product `formality` facet.
const formalityLexicon: Record<string, string> = {
  正式: "formal",
  正装: "formal",
  商务: "formal",
  通勤: "formal",
  庄重: "formal",
  隆重: "formal",
  formal: "formal",
  dressy: "formal",
  商务休闲: "smart_casual",
  轻正式: "smart_casual",
  "smart casual": "smart_casual",
  "smart-casual": "smart_casual",
  休闲: "casual",
  随意: "casual",
  日常: "casual",
  居家: "casual",
  casual: "casual",
  everyday: "casual",
  relaxed: "casual"
};

// Colour tone the customer asks for → the product `color_tone` facet.
const toneLexicon: Record<string, string> = {
  深色: "dark",
  深: "dark",
  暗色: "dark",
  暗: "dark",
  "深色系": "dark",
  dark: "dark",
  darker: "dark",
  浅色: "light",
  浅: "light",
  淡色: "light",
  亮色: "light",
  "浅色系": "light",
  light: "light",
  lighter: "light",
  pale: "light",
  pastel: "light"
};

export function routeIntent(text: string): "explicit" | "recommendation" | "unclear" {
  const normalized = text.toLowerCase();
  // Concrete preference words → treat as an explicit styling request.
  if (Object.keys(categoryLexicon).some((keyword) => normalized.includes(keyword))) return "explicit";
  if (Object.keys(styleLexicon).some((keyword) => normalized.includes(keyword))) return "explicit";
  if (Object.keys(colorLexicon).some((keyword) => normalized.includes(keyword))) return "explicit";
  if (Object.keys(formalityLexicon).some((keyword) => normalized.includes(keyword))) return "explicit";
  if (Object.keys(toneLexicon).some((keyword) => normalized.includes(keyword))) return "explicit";
  // Occasion words imply a concrete need even when no garment is named.
  if (/约会|婚礼|婚宴|面试|上班|通勤|派对|聚会|宴会|旅行|旅游|度假|海边|运动|健身|约会|正式场合|商务|开会/.test(normalized))
    return "explicit";
  if (/\b(wedding|interview|date|party|work|office|trip|travel|vacation|beach|gym|dinner|meeting)\b/.test(normalized))
    return "explicit";
  if (/预算|以内|日元|yen|想要|找/.test(normalized)) return "explicit";
  if (/budget|under\s*[¥$]?\s*\d|within\s*[¥$]?\s*\d|\$|dollar|cheap/.test(normalized)) return "explicit";
  // "帮我挑几套 / 帮我搭 / 搭配 / 穿搭 / 来几套 / 推荐" → let the agent suggest.
  if (
    /没.*想法|不知道|推荐|随便|适合我|你来|帮我挑|挑[几一]套|挑套|帮我搭|搭[几一]套|搭配|穿搭|来[几一]套|看看有什么/.test(
      normalized
    )
  )
    return "recommendation";
  // "recommend something / pick for me / style me / an outfit / a look" → let the agent suggest.
  if (
    /recommend|suggest|no idea|not sure|don'?t know|whatever|surprise me|up to you|pick (?:for me|something|a few|some)|help me (?:pick|choose|find)|style me|put together|outfit|a look|some looks|match (?:my|what)/.test(
      normalized
    )
  )
    return "recommendation";
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
    budget_yen: budget,
    formality: collectMatches(text, formalityLexicon)[0],
    color_tone: collectMatches(text, toneLexicon)[0]
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
  if (/颜色|色|colou?r|red|blue|black|white/i.test(text)) return "color";
  if (/版型|剪裁|宽|紧|fit|size|loose|tight|baggy/i.test(text)) return "fit";
  if (/风格|正式|休闲|style|formal|casual|dressy/i.test(text)) return "style";
  if (/贵|便宜|预算|price|expensive|cheap|pricey|cost|budget/i.test(text)) return "price";
  return "overall";
}

function inferFeedbackValue(dimension: FeedbackDimension, text: string) {
  if (dimension === "color") return collectMatches(text, colorLexicon)[0];
  if (dimension === "style") {
    if (/太正式|too formal|formal/i.test(text)) return "too_formal";
    return collectMatches(text, styleLexicon)[0];
  }
  if (dimension === "price") return parseBudgetYen(text)?.toString();
  if (dimension === "fit") {
    if (/宽|loose|oversized|baggy/i.test(text)) return "too_loose";
    if (/紧|tight/i.test(text)) return "too_tight";
  }
  return undefined;
}
