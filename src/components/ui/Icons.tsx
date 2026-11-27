import type { SocialNetwork } from "@/content/schema";

type IconProps = { className?: string };
const base = {
  "aria-hidden": true,
  focusable: false,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export const SearchIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
export const CloseIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const PlayIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden focusable={false}>
    <path d="M7 4.5v15l13-7.5z" fill="currentColor" />
  </svg>
);
export const InfoIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);
export const ChevronIcon = ({
  className = "h-5 w-5",
  dir = "right",
}: IconProps & { dir?: "left" | "right" | "down" }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    {...base}
    style={{
      transform: dir === "left" ? "rotate(180deg)" : dir === "down" ? "rotate(90deg)" : undefined,
    }}
  >
    <path d="m9 6 6 6-6 6" />
  </svg>
);
export const ExternalIcon = ({ className = "h-3.5 w-3.5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" />
  </svg>
);
export const MenuIcon = ({ className = "h-6 w-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M4 7h16M4 12h16M4 17h10" />
  </svg>
);
export const SoundIcon = ({ className = "h-5 w-5", on }: IconProps & { on: boolean }) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M4 10v4h4l5 4V6L8 10z" />
    {on ? (
      <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />
    ) : (
      <path d="m17 10 4 4m0-4-4 4" />
    )}
  </svg>
);

const socialPaths: Record<SocialNetwork, string> = {
  facebook: "M14 8h3V4h-3a4 4 0 0 0-4 4v2H8v4h2v6h4v-6h3l1-4h-4V8z",
  x: "M4 4l16 16M20 4 4 20",
  instagram:
    "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm5.5-1.5h.01",
  linkedin:
    "M4 9h4v11H4zM6 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm5 5h4v1.6c.6-1 1.9-1.8 3.6-1.8C21 8.8 21 11 21 13v7h-4v-6c0-1.5-.3-2.6-1.8-2.6S13 12.6 13 14v6h-2z",
  pinterest:
    "M12 3a9 9 0 0 0-3.3 17.4c0-.8 0-1.8.2-2.6l1.3-5.5s-.3-.7-.3-1.6c0-1.5.9-2.7 2-2.7.9 0 1.4.7 1.4 1.6 0 1-.6 2.4-.9 3.7-.3 1.1.6 2 1.7 2 2 0 3.4-2.6 3.4-5.7 0-2.3-1.6-4.1-4.5-4.1A5 5 0 0 0 7.8 11c0 .8.3 1.4.6 1.8",
  youtube:
    "M3 8.5C3 6.6 4.6 5 6.5 5h11C19.4 5 21 6.6 21 8.5v7c0 1.9-1.6 3.5-3.5 3.5h-11A3.5 3.5 0 0 1 3 15.5zM10 9v6l5-3z",
  telegram: "M21 4 3 11l6 2 2 6 3-4 5 4z M9 13l8-6",
  medium: "M3 7h2l4 9 4-9h2v10M17 7h4M17 17h4M19 7v10",
  github:
    "M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21",
  website:
    "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.7 3.5 5.7 3.5 9s-1 6.3-3.5 9c-2.5-2.7-3.5-5.7-3.5-9s1-6.3 3.5-9z",
};

export const SocialIcon = ({
  network,
  className = "h-5 w-5",
}: IconProps & { network: SocialNetwork }) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d={socialPaths[network]} />
  </svg>
);
