export type Emotion = "happy" | "sad" | "anxious" | "calm";

export type EmotionProfile = {
  emotion: Emotion;
  intensity: number;
  seed: string;
  poeticLine: string;
};

const emotionKeywords: Record<Emotion, string[]> = {
  happy: ["joy", "excited", "bright", "love", "grateful", "alive", "hope"],
  sad: ["hurt", "alone", "heavy", "lost", "cry", "empty", "grief"],
  anxious: ["worry", "panic", "afraid", "overthink", "pressure", "tense", "fear"],
  calm: ["peace", "still", "breathe", "soft", "balanced", "gentle", "quiet"]
};

const poetic: Record<Emotion, string[]> = {
  happy: ["There is warmth in your thoughts.", "Light ripples through your inner sky."],
  sad: ["A quiet rain gathers between your stars.", "Your heart drifts in deep blue gravity."],
  anxious: ["Your mind feels scattered.", "Electric winds move through your horizon."],
  calm: ["Silence blooms into constellations.", "Your breath aligns with distant moons."]
};

const hashString = (input: string) => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0).toString(16);
};

export function analyzeEmotion(input: string): EmotionProfile {
  const lower = input.toLowerCase();
  const scores = (Object.keys(emotionKeywords) as Emotion[]).map((emotion) => {
    const hits = emotionKeywords[emotion].reduce((acc, k) => (lower.includes(k) ? acc + 1 : acc), 0);
    return { emotion, score: hits };
  });
  scores.sort((a, b) => b.score - a.score);

  const dominant = scores[0].score > 0 ? scores[0].emotion : "calm";
  const intensity = Math.min(1, Math.max(0.2, input.length / 220 + scores[0].score * 0.12));
  const seed = hashString(`${input}:${dominant}:${intensity.toFixed(2)}`);
  const lines = poetic[dominant];
  const poeticLine = lines[parseInt(seed.slice(0, 2), 16) % lines.length];

  return { emotion: dominant, intensity, seed, poeticLine };
}
