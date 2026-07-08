import { GoogleGenAI } from "@google/genai";

// Gemini native text-to-speech, reusing GEMINI_API_KEY. Returns a playable
// data:audio/wav URL (Gemini returns raw PCM, so we wrap a WAV header). Results
// are cached in-memory by text+voice — the agent's spoken lines are a small
// fixed set, so after the first synth every replay is instant. Returns null
// when there's no key or the call fails, so the client can fall back to the
// browser's on-device speechSynthesis.

const cache = new Map<string, string>();

function apiKey() {
  return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
}
function ttsModel() {
  // The flash TTS preview intermittently 400s ("tried to generate text"); the
  // pro TTS model reliably returns audio for our short lines.
  return process.env.GEMINI_TTS_MODEL ?? "gemini-2.5-pro-preview-tts";
}
function ttsVoice() {
  return process.env.GEMINI_TTS_VOICE ?? "Kore";
}

export async function generateSpeech(text: string, voice?: string): Promise<string | null> {
  const key = apiKey();
  const trimmed = text.trim();
  if (!key || !trimmed) return null;
  const voiceName = voice ?? ttsVoice();
  const cacheKey = `${voiceName}|${trimmed}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: ttsModel(),
      contents: [{ parts: [{ text: trimmed }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
      } as never
    });
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const inline = parts
      .map((part) => (part as { inlineData?: { data?: string; mimeType?: string } }).inlineData)
      .find((data) => data?.data);
    if (!inline?.data) return null;

    const sampleRate = parseRate(inline.mimeType) ?? 24000;
    const wav = pcmToWav(Buffer.from(inline.data, "base64"), sampleRate);
    const dataUrl = `data:audio/wav;base64,${wav.toString("base64")}`;
    cache.set(cacheKey, dataUrl);
    return dataUrl;
  } catch {
    return null;
  }
}

function parseRate(mimeType?: string): number | null {
  if (!mimeType) return null;
  const match = /rate=(\d+)/.exec(mimeType);
  return match ? Number(match[1]) : null;
}

// Wrap 16-bit mono PCM in a minimal WAV container so browsers can play it.
function pcmToWav(pcm: Buffer, sampleRate: number): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
