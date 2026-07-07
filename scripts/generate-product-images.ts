// Batch product-image generator. Generates one catalog image per inventory
// product with a SHARED style/photography anchor so the whole batch looks like
// a single consistent shoot. Saves to public/mock-products/{id}.jpg.
//
//   node --env-file-if-exists=.env node_modules/.bin/tsx scripts/generate-product-images.ts
//   LIMIT=3 FORCE=1 ... (LIMIT: only first N; FORCE: overwrite existing)
//
// Requires GEMINI_API_KEY. Model: GEMINI_IMAGE_MODEL (default gemini-3-pro-image).

import { GoogleGenAI } from "@google/genai";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { seedProducts } from "../server/inventory/seed-data.js";

const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
const model = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3-pro-image";
if (!apiKey) {
  console.error("Set GEMINI_API_KEY (or GOOGLE_API_KEY) to generate product images.");
  process.exit(1);
}

const outDir = fileURLToPath(new URL("../public/mock-products/", import.meta.url));
mkdirSync(outDir, { recursive: true });

// The shared anchor — identical for every product, so the batch is consistent.
const STYLE_ANCHOR = [
  "Studio e-commerce catalog product photograph of a single clothing item, ghost-mannequin / flat-lay style with no person.",
  "Seamless pure white background (#FFFFFF). Soft, even, diffuse studio lighting with a subtle soft contact shadow directly beneath.",
  "The entire garment is centered and fully visible, front-facing, natural drape, wrinkle-free.",
  "Minimal, premium, editorial. Neutral true-to-life colours. No model, no hands, no props, no hangers, no packaging, no text, no logos, no watermark.",
  "Square 1:1 framing, consistent scale and camera distance across the whole catalog."
].join(" ");

function promptFor(p: ReturnType<typeof seedProducts>[number]) {
  const colors = p.colors.join(" / ");
  const styles = p.style_tags.join(", ");
  return [
    `Item: ${p.name} (category: ${p.category}).`,
    `Colour: ${colors}. Style: ${styles}.`,
    STYLE_ANCHOR
  ].join("\n");
}

async function generateOne(ai: GoogleGenAI, prompt: string): Promise<Buffer | null> {
  const res = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { responseModalities: ["IMAGE"] as never, temperature: 0.35 }
  });
  const parts = res.candidates?.[0]?.content?.parts ?? [];
  const part = parts.find((x) => (x as { inlineData?: unknown }).inlineData) as
    | { inlineData?: { data?: string } }
    | undefined;
  const b64 = part?.inlineData?.data;
  if (!b64) return null;
  // Downscale + recompress so the repo/deploy stays light.
  return sharp(Buffer.from(b64, "base64"))
    .resize(768, 768, { fit: "cover" })
    .jpeg({ quality: 82 })
    .toBuffer();
}

async function main() {
  const ai = new GoogleGenAI({ apiKey });
  const all = seedProducts();
  const limit = process.env.LIMIT ? Number(process.env.LIMIT) : all.length;
  const force = process.env.FORCE === "1";
  const products = all.slice(0, limit);

  let ok = 0;
  let skipped = 0;
  let failed = 0;
  for (const p of products) {
    const dest = `${outDir}${p.product_id}.jpg`;
    if (!force && existsSync(dest)) {
      skipped += 1;
      continue;
    }
    try {
      const buf = await generateOne(ai, promptFor(p));
      if (!buf) {
        failed += 1;
        console.warn(`✗ ${p.product_id} (${p.name}) — no image in response`);
        continue;
      }
      writeFileSync(dest, buf);
      ok += 1;
      console.log(`✓ ${p.product_id} (${p.name}) → ${Math.round(buf.length / 1024)}KB`);
    } catch (error) {
      failed += 1;
      console.warn(`✗ ${p.product_id} (${p.name}) — ${error instanceof Error ? error.message : error}`);
    }
  }
  console.log(`\nDone: ${ok} generated, ${skipped} skipped (exist), ${failed} failed → ${outDir}`);
}

await main();
