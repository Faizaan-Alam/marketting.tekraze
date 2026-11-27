"use client";

import { useEffect, useRef, useState } from "react";
import { mainSiteLinks, navSections, site } from "@/content/site";
import { team } from "@/content/team";
import { ChevronIcon, CloseIcon, ExternalIcon, MenuIcon, SearchIcon } from "@/components/ui/Icons";
import { requestQuote, setUi, useUi } from "@/lib/client/store";
import { scrollToId } from "@/lib/client/motion";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-1.5 ${className}`}>
      <span className="display text-[1.85rem] leading-none tracking-wide text-tally">TEKRAZE</span>
      <span className="text-[0.8rem] font-semibold text-paper-dim">studio</span>
    </span>
  );
}

export function SiteHeader() {
  const [solid, setSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const searchOpen = useUi((s) => s.searchOpen);
  const profile = useUi((s) => s.profile);
  const member = team.find((m) => m.slug === profile);
  const moreRef = useRef<HTMLLIElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!moreOpen) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === "Escape"
          : !moreRef.current?.contains(e.target as Node)
      ) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [moreOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const go = (id: string) => {
    setMenuOpen(false);
    scrollToId(id);
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300 ${
        solid || menuOpen
          ? "bg-ink/92 shadow-[0_1px_0_rgb(238_232_225/0.08)] backdrop-blur-md"
          : "bg-gradient-to-b from-ink/80 to-transparent"
      }`}
    >
      <nav aria-label="Main" className="gutter flex h-[var(--nav-h)] items-center gap-6">
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            go("home");
          }}
          className="shrink-0 rounded"
          aria-label={`${site.name} home`}
        >
          <Wordmark />
        </a>

        <ul className="hidden items-center gap-5 text-sm lg:flex" role="list">
          {navSections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  go(s.id);
                }}
                className="text-paper-dim transition-colors hover:text-paper"
              >
                {s.label}
              </a>
            </li>
          ))}
          <li className="relative" ref={moreRef}>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-paper-dim transition-colors hover:text-paper"
              aria-expanded={moreOpen}
              aria-controls="more-menu"
              onClick={() => setMoreOpen((v) => !v)}
            >
              More from Tekraze <ChevronIcon dir="down" className="h-3.5 w-3.5" />
            </button>
            <ul
              id="more-menu"
              role="list"
              hidden={!moreOpen}
              className="absolute left-0 top-full mt-3 w-60 rounded-xl border border-line bg-ink-2/95 p-2 shadow-2xl backdrop-blur"
            >
              {mainSiteLinks.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-paper-dim hover:bg-ink-3 hover:text-paper"
                  >
                    {l.label} <ExternalIcon />
                    <span className="sr-only"> (opens tekraze.com in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </li>
        </ul>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setUi({ searchOpen: true })}
            className="grid h-11 w-11 place-items-center rounded-full text-paper hover:bg-ink-3"
            aria-label="Search services"
            aria-expanded={searchOpen}
            aria-controls="search-dialog"
            data-cursor="view"
          >
            <SearchIcon />
          </button>
          {member ? (
            <span
              className="hidden h-8 w-8 place-items-center rounded-md text-xs font-bold text-white sm:grid"
              style={{ background: `hsl(${member.hue} 70% 45%)` }}
              title={`Touring as ${member.name}`}
              aria-label={`Touring as ${member.name}`}
              role="img"
            >
              {member.name
                .split(" ")
                .map((p) => p[0])
                .join("")}
            </span>
          ) : null}
          <button
            type="button"
            className="btn btn-primary hidden min-h-10 py-2 text-sm md:inline-flex"
            onClick={() => {
              requestQuote(null);
            }}
          >
            {site.primaryCta}
          </button>
          <button
            ref={menuButton}
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full hover:bg-ink-3 lg:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon />}
          </button>
        </div>
      </nav>

      <div
        id="mobile-menu"
        hidden={!menuOpen}
        className="gutter border-t border-line bg-ink pb-8 pt-4 lg:hidden"
      >
        <ul role="list" className="grid gap-1">
          {navSections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  go(s.id);
                }}
                className="display block py-2 text-4xl text-paper"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-paper-faint">More from Tekraze</p>
        <ul role="list" className="mt-2 flex flex-wrap gap-2">
          {mainSiteLinks.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm text-paper-dim"
              >
                {l.label} <ExternalIcon />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
