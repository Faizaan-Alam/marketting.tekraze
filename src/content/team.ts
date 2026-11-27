import { z } from "@/lib/zod";
import { memberSchema, type Member } from "./schema";

/**
 * TEAM — edit this file to change the "Who's watching?" profiles and the cast section.
 *
 * Photos: put `<slug>.jpg|jpeg|png|webp|avif` in `public/members/` (e.g. kamran-alam.jpg).
 * A missing photo shows a generated initials avatar instead.
 *
 * PLACEHOLDERS — fill these in yourself:
 *   role  ""  -> the UI shows "Tekraze team" until you add a real role
 *   bio   ""  -> no bio is shown until you add one
 *   socials [] -> only rendered when you add https:// links
 * Do not add credentials, achievements or numbers that are not true.
 */
export const team: ReadonlyArray<Member> = z.array(memberSchema).parse([
  {
    slug: "kamran-alam",
    name: "Kamran Alam",
    role: "", // PLACEHOLDER: role
    bio: "", // PLACEHOLDER: short bio
    hue: 352,
    socials: [],
  },
  {
    slug: "balwinder-singh",
    name: "Balwinder Singh",
    role: "", // PLACEHOLDER: role
    bio: "", // PLACEHOLDER: short bio
    photoFocus: "50% 30%",
    hue: 200,
    socials: [],
  },
  {
    slug: "faizaan-alam",
    name: "Faizaan Alam",
    role: "", // PLACEHOLDER: role
    bio: "", // PLACEHOLDER: short bio
    photoFocus: "42% 40%",
    hue: 40,
    socials: [],
  },
]);

export const ROLE_FALLBACK = "Tekraze team";

export function displayRole(member: Member): string {
  return member.role.length > 0 ? member.role : ROLE_FALLBACK;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
