"use client";

import { useEffect } from "react";
import { SoundIcon } from "@/components/ui/Icons";
import { playCue } from "@/lib/client/sound";
import { setUi, useUi } from "@/lib/client/store";

const KEY = "tz-sound";

/** UI sounds are off by default and never autoplay; this toggle is the only way to turn them on. */
export function SoundToggle() {
  const on = useUi((s) => s.soundOn);
  useEffect(() => {
    try {
      if (window.localStorage.getItem(KEY) === "on") setUi({ soundOn: true });
    } catch {
      /* ignore */
    }
  }, []);
  return (
    <button
      type="button"
      aria-pressed={on}
      className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 hover:border-paper hover:text-paper"
      onClick={() => {
        const next = !on;
        setUi({ soundOn: next });
        try {
          window.localStorage.setItem(KEY, next ? "on" : "off");
        } catch {
          /* ignore */
        }
        if (next) playCue("confirm");
      }}
    >
      <SoundIcon on={on} />
      {on ? "Interface sounds on" : "Interface sounds off"}
    </button>
  );
}
