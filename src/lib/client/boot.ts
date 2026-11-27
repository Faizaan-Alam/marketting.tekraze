"use client";

/**
 * Boot progress registry. Components declare the assets the intro should wait for (fonts, the
 * hero poster and video, the 3D scene) and resolve them when they are really ready. The loader's
 * percentage is `resolved / declared`, so it reflects actual loading, not a timer.
 */
type Listener = () => void;
const tasks = new Map<string, boolean>();
const listeners = new Set<Listener>();

function emit(): void {
  for (const l of listeners) l();
}

/** Declare a task (idempotent). Call before the asset starts loading. */
export function expectBoot(name: string): void {
  if (!tasks.has(name)) {
    tasks.set(name, false);
    emit();
  }
}

export function resolveBoot(name: string): void {
  if (tasks.get(name) !== true) {
    tasks.set(name, true);
    emit();
  }
}

/** Declare + resolve when the promise settles (success or failure both count as "done"). */
export function trackBoot(name: string, promise: Promise<unknown>): void {
  expectBoot(name);
  promise.then(
    () => resolveBoot(name),
    () => resolveBoot(name),
  );
}

export function bootSnapshot(): { done: number; total: number } {
  let done = 0;
  for (const v of tasks.values()) if (v) done += 1;
  return { done, total: tasks.size };
}

export function onBootChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
