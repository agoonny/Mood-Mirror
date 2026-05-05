"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import { EmotionProfile, analyzeEmotion } from "@/lib/emotion";

const UniverseCanvas = dynamic(() => import("@/components/UniverseCanvas"), { ssr: false });

type SpeechRecognitionResultLike = {
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  results: Array<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export default function Home() {
  const [text, setText] = useState("");
  const [profile, setProfile] = useState<EmotionProfile>(analyzeEmotion("I feel calm and open."));
  const [phase, setPhase] = useState(0);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [listening, setListening] = useState(false);
  const synth = useRef<Tone.PolySynth | null>(null);

  useEffect(() => {
    synth.current = new Tone.PolySynth(Tone.Synth).toDestination();
    return () => {
      synth.current?.dispose();
      synth.current = null;
    };
  }, []);

  useEffect(() => {
    setPhase(0);
    const id = setInterval(() => setPhase((p) => (p < 3 ? p + 0.02 : 3)), 120);
    return () => clearInterval(id);
  }, [profile.seed]);

  useEffect(() => {
    if (!synth.current) return;
    void Tone.start();
    const map: Record<string, string[]> = {
      happy: ["C4", "E4", "G4", "B4"],
      sad: ["A3", "C4", "E4", "G4"],
      anxious: ["D4", "Eb4", "A4", "C5"],
      calm: ["F3", "A3", "C4", "E4"]
    };
    synth.current.volume.value = -12 + profile.intensity * 8;
    synth.current.triggerAttackRelease(map[profile.emotion], "2n");
  }, [profile]);

  const submitEmotion = async () => {
    setPhase(0);
    try {
      const res = await fetch("/api/emotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      if (!res.ok) throw new Error("Emotion request failed");
      const data = (await res.json()) as EmotionProfile;
      setProfile(data);
    } catch {
      setProfile(analyzeEmotion(text));
    }
  };

  const startVoice = () => {
    const w = window as Window & {
      webkitSpeechRecognition?: SpeechRecognitionCtor;
      SpeechRecognition?: SpeechRecognitionCtor;
    };

    const Rec = w.webkitSpeechRecognition ?? w.SpeechRecognition;
    if (!Rec) return;

    const recognition = new Rec();
    recognition.lang = "en-US";
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setText(transcript);
    };
    recognition.start();
  };

  const snapshot = useCallback(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `emotion-universe-${profile.seed}.png`;
    a.click();
  }, [profile.seed]);

  return (
    <main
      className="relative h-screen w-screen"
      onMouseMove={(e) =>
        setPointer({
          x: (e.clientX / window.innerWidth - 0.5) * 2,
          y: (e.clientY / window.innerHeight - 0.5) * -2
        })
      }
    >
      <UniverseCanvas profile={profile} phase={phase} pointer={pointer} />
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.4 }}
        className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 text-center text-3xl tracking-[0.2em] text-sky-100/90"
      >
        Your emotion shapes reality
      </motion.h1>
      <div className="glass shadow-neon absolute left-1/2 top-1/2 w-[min(92vw,680px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl p-5">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tell the universe how you feel..."
          className="w-full bg-transparent text-center text-lg outline-none placeholder:text-slate-300/40"
        />
        <div className="mt-4 flex items-center justify-center gap-3">
          <button onClick={submitEmotion} className="rounded-full border border-cyan-300/50 px-4 py-2 text-sm hover:bg-cyan-300/10">Generate Universe</button>
          <button onClick={startVoice} className="rounded-full border border-fuchsia-300/50 px-4 py-2 text-sm hover:bg-fuchsia-300/10">{listening ? "Listening..." : "Voice Input"}</button>
          <button onClick={snapshot} className="rounded-full border border-emerald-300/50 px-4 py-2 text-sm hover:bg-emerald-300/10">Export Snapshot</button>
        </div>
      </div>
      <motion.p key={profile.poeticLine} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="glass absolute bottom-12 left-1/2 -translate-x-1/2 rounded-full px-6 py-3 text-sm text-slate-100/90">
        {profile.poeticLine}
      </motion.p>
    </main>
  );
}
