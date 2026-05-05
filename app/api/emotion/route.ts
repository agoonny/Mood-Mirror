import { NextResponse } from "next/server";
import OpenAI from "openai";
import { analyzeEmotion } from "@/lib/emotion";

export async function POST(req: Request) {
  const { text } = (await req.json()) as { text?: string };

  if (!text?.trim()) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }

  const fallback = analyzeEmotion(text);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) return NextResponse.json(fallback);

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: `Analyze this text emotion and return strict JSON with keys emotion (happy|sad|anxious|calm) and intensity (0-1): ${text}`
    });

    const output = response.output_text || "";
    const parsed = JSON.parse(output.match(/\{[\s\S]*\}/)?.[0] || "{}");

    return NextResponse.json({
      ...fallback,
      emotion: ["happy", "sad", "anxious", "calm"].includes(parsed.emotion) ? parsed.emotion : fallback.emotion,
      intensity:
        typeof parsed.intensity === "number" && parsed.intensity >= 0 && parsed.intensity <= 1
          ? parsed.intensity
          : fallback.intensity
    });
  } catch {
    return NextResponse.json(fallback);
  }
}
