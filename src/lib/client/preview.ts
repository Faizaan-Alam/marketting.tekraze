"use client";

/** Only one hover preview plays at a time across the whole page. */
let stopActive: (() => void) | null = null;

export function claimPreview(stop: () => void): void {
  if (stopActive && stopActive !== stop) stopActive();
  stopActive = stop;
}
