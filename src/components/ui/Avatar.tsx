import Image from "next/image";
import type { Member } from "@/content/schema";
import { initials } from "@/content/team";
import { memberPhoto } from "@/lib/media";

type Props = {
  member: Member;
  sizes: string;
  className?: string;
  priority?: boolean;
  /** Decorative when the name is printed next to it. */
  decorative?: boolean;
};

/** Member photo from public/members/<slug>.*, or a generated initials avatar if missing. */
export function Avatar({
  member,
  sizes,
  className = "",
  priority = false,
  decorative = false,
}: Props) {
  const position = /\b(absolute|fixed)\b/.test(className) ? "" : "relative";
  const src = memberPhoto(member.slug);
  const alt = decorative ? "" : `Portrait of ${member.name}`;
  if (src) {
    return (
      <div className={`${position} overflow-hidden ${className}`}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          style={{ objectPosition: member.photoFocus }}
        />
      </div>
    );
  }
  return (
    <div
      className={`${position} grid place-items-center overflow-hidden ${className}`}
      style={{
        background: `radial-gradient(120% 120% at 30% 20%, hsl(${member.hue} 80% 52%), hsl(${(member.hue + 40) % 360} 60% 18%) 70%)`,
      }}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : `${member.name} (initials avatar)`}
      aria-hidden={decorative ? true : undefined}
    >
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full opacity-30"
        aria-hidden="true"
      >
        <circle cx="50" cy="50" r="38" fill="none" stroke="white" strokeWidth="0.6" />
        <circle cx="50" cy="50" r="26" fill="none" stroke="white" strokeWidth="0.6" />
      </svg>
      <span className="display relative text-[clamp(2rem,9vw,5.5rem)] text-white">
        {initials(member.name)}
      </span>
    </div>
  );
}
