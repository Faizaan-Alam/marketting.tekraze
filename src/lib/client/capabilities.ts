"use client";
import { useSyncExternalStore } from "react";

/**
 * Device capability tiers.
 *  high   — fine pointer, WebGL, enough cores/memory: full 3D, WebGL hovers, frame scrub
 *  medium — WebGL available but touch/small/low-ish power: lighter 3D, no WebGL hovers
 *  low    — no WebGL, Save-Data, reduced motion or weak device: 2D fallbacks everywhere
 */
export type Tier = "high" | "medium" | "low";

export type Capabilities = {
  ready: boolean;
  reducedMotion: boolean;
  finePointer: boolean;
  webgl: boolean;
  saveData: boolean;
  tier: Tier;
};

const SERVER: Capabilities = {
  ready: false,
  reducedMotion: true,
  finePointer: false,
  webgl: false,
  saveData: false,
  tier: "low",
};

let cached: Capabilities | null = null;

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

type NavigatorExtras = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

export function detectCapabilities(): Capabilities {
  if (cached) return cached;
  const nav = navigator as NavigatorExtras;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const saveData = nav.connection?.saveData === true;
  const webgl = hasWebGL();
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 8;
  const forced = new URLSearchParams(window.location.search).get("quality");
  let tier: Tier = "low";
  if (webgl && !reducedMotion && !saveData) {
    tier = finePointer && cores >= 4 && memory >= 4 && window.innerWidth >= 900 ? "high" : "medium";
    if (cores <= 2 || memory <= 2) tier = "low";
  }
  if (forced === "low" || forced === "medium" || forced === "high") tier = forced;
  cached = { ready: true, reducedMotion, finePointer, webgl, saveData, tier };
  return cached;
}

const noopSubscribe = () => () => undefined;

/** Capabilities are fixed for the page's lifetime; server render sees the "low" defaults. */
export function useCapabilities(): Capabilities {
  return useSyncExternalStore(noopSubscribe, detectCapabilities, () => SERVER);
}

/** Read-only browser value (sessionStorage, media query…) without a setState-in-effect. */
export function useBrowserValue<T>(read: () => T, serverValue: T, subscribe = noopSubscribe): T {
  return useSyncExternalStore(subscribe, read, () => serverValue);
}

export function readSession(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
