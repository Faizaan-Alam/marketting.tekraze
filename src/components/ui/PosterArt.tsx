import type { CategoryId } from "@/content/schema";

/**
 * Generated poster art: an original, text-free SVG per service, built from the category motif
 * and a hash of the slug. Text stays in the DOM (crisp, accessible, searchable); this layer is
 * what the WebGL hover distorts. Drop an image in public/posters/<slug>.jpg to override it.
 */

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

type Props = {
  slug: string;
  category: CategoryId | "bundle";
  hue: number;
  /** Disambiguates gradient ids when the same poster renders more than once. */
  variant: string;
  className?: string;
};

export function PosterArt({ slug, category, hue, variant, className }: Props) {
  const r = rng(hash(slug));
  const id = `p-${slug}-${variant}`;
  const c1 = `hsl(${hue} 85% 56%)`;
  const c2 = `hsl(${(hue + 28) % 360} 70% 38%)`;
  const deep = `hsl(${hue} 45% 9%)`;
  const shift = Math.round(r() * 60);

  let motif: React.ReactNode;
  switch (category) {
    case "brand": {
      const n = 3 + Math.floor(r() * 3);
      motif = Array.from({ length: n }, (_, i) => (
        <circle
          key={i}
          cx={150 + i * 34 + shift * 0.4}
          cy={92 + (i % 2) * 16 - 8}
          r={44 - i * 6}
          fill={i % 2 ? "none" : `url(#${id}-g)`}
          stroke={c1}
          strokeWidth={i % 2 ? 2.5 : 0}
          opacity={0.92 - i * 0.12}
        />
      ));
      break;
    }
    case "content": {
      motif = Array.from({ length: 7 }, (_, i) => (
        <rect
          key={i}
          x={128 + (i === 0 ? 0 : 6)}
          y={36 + i * 17}
          width={i === 0 ? 150 : 70 + r() * 90}
          height={i === 0 ? 12 : 6}
          rx={3}
          fill={i === 0 ? c1 : "hsl(30 25% 88%)"}
          opacity={i === 0 ? 1 : 0.55 - i * 0.04}
        />
      ));
      break;
    }
    case "web": {
      motif = (
        <g>
          <rect
            x={118}
            y={34}
            width={176}
            height={116}
            rx={10}
            fill={deep}
            stroke={c1}
            strokeWidth={2}
          />
          <rect x={118} y={34} width={176} height={18} rx={10} fill={c2} opacity={0.8} />
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={130 + i * 10} cy={43} r={3} fill="hsl(30 25% 88%)" opacity={0.7} />
          ))}
          <rect x={132} y={64} width={80} height={44} rx={6} fill={`url(#${id}-g)`} />
          <rect x={222} y={64} width={58} height={8} rx={4} fill="hsl(30 25% 88%)" opacity={0.6} />
          <rect x={222} y={80} width={46} height={6} rx={3} fill="hsl(30 25% 88%)" opacity={0.35} />
          <rect x={222} y={96} width={34} height={12} rx={6} fill={c1} />
          <rect
            x={132}
            y={120}
            width={148}
            height={6}
            rx={3}
            fill="hsl(30 25% 88%)"
            opacity={0.25}
          />
        </g>
      );
      break;
    }
    case "video": {
      motif = (
        <g>
          {[0, 1, 2].map((i) => (
            <rect
              key={i}
              x={146 + i * 40}
              y={30 + i * 6}
              width={58}
              height={104}
              rx={10}
              fill={i === 1 ? `url(#${id}-g)` : deep}
              stroke={c1}
              strokeWidth={i === 1 ? 0 : 1.5}
              opacity={1 - Math.abs(i - 1) * 0.35}
            />
          ))}
          <path d="M198 74 L222 88 L198 102 Z" fill="hsl(30 25% 95%)" />
        </g>
      );
      break;
    }
    case "research": {
      const pts = Array.from({ length: 9 }, (_, i) => `${120 + i * 22},${130 - r() * 70 - i * 4}`);
      motif = (
        <g>
          {[0, 1, 2, 3].map((i) => (
            <line
              key={i}
              x1={116}
              x2={300}
              y1={50 + i * 28}
              y2={50 + i * 28}
              stroke="hsl(30 25% 88%)"
              opacity={0.12}
            />
          ))}
          {Array.from({ length: 8 }, (_, i) => {
            const h = 14 + r() * 40;
            return (
              <rect
                key={i}
                x={126 + i * 22}
                y={140 - h}
                width={9}
                height={h}
                rx={2}
                fill={c2}
                opacity={0.7}
              />
            );
          })}
          <polyline
            points={pts.join(" ")}
            fill="none"
            stroke={c1}
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </g>
      );
      break;
    }
    default: {
      motif = (
        <g>
          {[0, 1, 2, 3, 4].map((i) => (
            <rect
              key={i}
              x={128 + i * 18}
              y={30 + i * 10}
              width={120}
              height={80}
              rx={10}
              fill={`hsl(${[352, 36, 192, 318, 232][i]} 70% ${30 + i * 5}%)`}
              opacity={0.85}
              stroke="hsl(30 25% 92%)"
              strokeOpacity={0.2}
            />
          ))}
        </g>
      );
    }
  }

  return (
    <svg
      viewBox="0 0 320 180"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={deep} />
          <stop offset="1" stopColor="#050405" />
        </linearGradient>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.72" cy="0.45" r="0.6">
          <stop offset="0" stopColor={c1} stopOpacity="0.38" />
          <stop offset="1" stopColor={c1} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${id}-bg)`} />
      <rect width="320" height="180" fill={`url(#${id}-glow)`} />
      {motif}
    </svg>
  );
}
