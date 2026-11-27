"use client";

import { m, AnimatePresence } from "framer-motion";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { CloseIcon, SearchIcon } from "@/components/ui/Icons";
import { useModal } from "@/lib/client/focus";
import { scrollToId } from "@/lib/client/motion";
import { openService, setUi, useUi } from "@/lib/client/store";
import { readQueryParam, search, segments, type SearchResult } from "@/lib/search";
import { SEARCH_MAX_LENGTH, cleanSearchQuery } from "@/lib/sanitize";
import { searchIndex } from "@/lib/search-index";

const KIND_LABEL: Record<SearchResult["doc"]["kind"], string> = {
  service: "Service",
  bundle: "Tekraze Original",
  category: "Category",
  webapp: "Web app",
  member: "Team",
  faq: "FAQ",
};

/** Keep ?q= in sync, always from the cleaned value and through URLSearchParams (encoded). */
function syncQueryParam(value: string): void {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set("q", value);
  else url.searchParams.delete("q");
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
}

export function SearchOverlay() {
  const open = useUi((s) => s.searchOpen);
  const [raw, setRaw] = useState(() =>
    typeof window === "undefined"
      ? ""
      : readQueryParam(new URLSearchParams(window.location.search).get("q")),
  );
  const [debounced, setDebounced] = useState(raw);
  const [active, setActive] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const listId = useId();
  const deferred = useDeferredValue(debounced);

  const close = useCallback(() => {
    setUi({ searchOpen: false });
    syncQueryParam("");
  }, []);
  useModal(panel, open, close);

  // Open from ?q= on first load (validated + capped), or with "/".
  useEffect(() => {
    const q = readQueryParam(new URLSearchParams(window.location.search).get("q"));
    if (q) setUi({ searchOpen: true });
    const onKey = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setUi({ searchOpen: true });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const clean = cleanSearchQuery(raw);
      setDebounced(clean);
      setActive(0);
      if (open) syncQueryParam(clean);
    }, 140);
    return () => window.clearTimeout(t);
  }, [raw, open]);

  const results = useMemo(() => search(searchIndex, deferred), [deferred]);

  const choose = (r: SearchResult) => {
    close();
    const t = r.doc.target;
    if (t.type === "service") {
      window.setTimeout(() => openService(t.slug, null), 60);
    } else {
      window.setTimeout(() => scrollToId(t.id), 60);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      if (results.length === 0) return;
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      if (results.length === 0) return;
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      const r = results[active];
      if (r) {
        e.preventDefault();
        choose(r);
      }
    }
  };

  const activeId = results[active] ? `${listId}-${active}` : undefined;

  return (
    <AnimatePresence>
      {open ? (
        <m.div
          id="search-dialog"
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label="Search Tekraze services"
          className="fixed inset-0 z-[70] overflow-y-auto bg-ink/96 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          data-lenis-prevent
        >
          <div className="gutter mx-auto max-w-[110rem] pt-5">
            <div className="flex items-center gap-3">
              <m.label
                className="flex h-14 flex-1 items-center gap-3 rounded-full border border-line bg-ink-2 px-5 focus-within:border-paper"
                initial={{ scaleX: 0.3, originX: 1 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <SearchIcon className="h-5 w-5 shrink-0 text-paper-dim" />
                <span className="sr-only">Search services, web apps, team and FAQs</span>
                <input
                  data-autofocus
                  type="search"
                  inputMode="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={SEARCH_MAX_LENGTH}
                  value={raw}
                  onChange={(e) => setRaw(e.target.value.slice(0, SEARCH_MAX_LENGTH))}
                  onKeyDown={onKeyDown}
                  placeholder="Logos, SEO, websites, crypto…"
                  className="h-full w-full bg-transparent text-lg text-paper outline-none placeholder:text-paper-faint"
                  role="combobox"
                  aria-expanded={results.length > 0}
                  aria-controls={listId}
                  aria-activedescendant={activeId}
                  aria-autocomplete="list"
                />
              </m.label>
              <button
                type="button"
                onClick={close}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full hover:bg-ink-3"
                aria-label="Close search"
              >
                <CloseIcon className="h-6 w-6" />
              </button>
            </div>

            <p className="sr-only" role="status" aria-live="polite">
              {deferred ? `${results.length} result${results.length === 1 ? "" : "s"}` : ""}
            </p>

            {deferred && results.length === 0 ? (
              <div className="py-24 text-center">
                <p className="display text-4xl">Nothing on this channel.</p>
                <p className="mx-auto mt-3 max-w-[44ch] text-paper-dim">
                  No services match “{deferred}”. Try a broader word like “design”, “video” or
                  “research”, or tell us what you need in the enquiry form.
                </p>
              </div>
            ) : null}

            {!deferred ? (
              <p className="py-16 text-center text-paper-dim">
                Search all five categories, the Growth Bundle, web apps, the team and the FAQ.
              </p>
            ) : null}

            <ul
              id={listId}
              role="listbox"
              aria-label="Search results"
              className="grid grid-cols-1 gap-3 py-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {results.map((r, i) => (
                <li
                  key={r.doc.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onClick={() => choose(r)}
                  onMouseEnter={() => setActive(i)}
                  className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                    i === active
                      ? "border-paper bg-ink-3"
                      : "border-line bg-ink-2 hover:border-paper-faint"
                  }`}
                >
                  <span className="text-xs text-paper-faint">
                    {KIND_LABEL[r.doc.kind]} · {r.doc.meta}
                  </span>
                  <span className="mt-1 block text-lg font-semibold">
                    {segments(r.doc.title, r.highlights).map((s, k) =>
                      s.match ? (
                        <mark key={k} className="rounded-sm bg-tally/25 text-paper">
                          {s.text}
                        </mark>
                      ) : (
                        <span key={k}>{s.text}</span>
                      ),
                    )}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-sm text-paper-dim">
                    {r.doc.body}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
