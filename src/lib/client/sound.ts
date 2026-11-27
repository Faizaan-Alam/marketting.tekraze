"use client";
import { getUi } from "./store";

/**
 * Optional UI sounds, synthesised with Web Audio (no audio files, nothing autoplays).
 * Off by default; only plays after the visitor turns sound on with the visible toggle.
 */
let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function playCue(kind: "tick" | "open" | "confirm" = "tick"): void {
  if (!getUi().soundOn) return;
  const ac = context();
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const freq = kind === "tick" ? 880 : kind === "open" ? 330 : 523.25;
  osc.type = kind === "tick" ? "triangle" : "sine";
  osc.frequency.setValueAtTime(freq, t);
  if (kind === "open") osc.frequency.exponentialRampToValueAtTime(freq * 2, t + 0.18);
  if (kind === "confirm") osc.frequency.setValueAtTime(freq * 1.5, t + 0.09);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(kind === "tick" ? 0.03 : 0.06, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + (kind === "tick" ? 0.06 : 0.3));
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.32);
}
