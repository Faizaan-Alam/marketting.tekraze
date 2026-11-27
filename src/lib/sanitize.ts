/**
 * Text sanitisation for untrusted input. These helpers never produce HTML: React escapes all
 * output, and nothing in this project uses dangerouslySetInnerHTML. They exist to normalise,
 * bound and de-fang input before it is matched, validated, logged or put in an email.
 */

/** C0/C1 control characters except tab/newline/carriage return (kept for multi-line fields). */
function isDisallowedControl(code: number, allowNewlines: boolean): boolean {
  if (allowNewlines && (code === 0x09 || code === 0x0a || code === 0x0d)) return false;
  return code <= 0x1f || (code >= 0x7f && code <= 0x9f);
}

/** Bidi overrides and zero-width characters used for spoofing ("Trojan Source"). */
function isInvisibleFormatting(code: number): boolean {
  return (
    (code >= 0x200b && code <= 0x200f) ||
    (code >= 0x202a && code <= 0x202e) ||
    (code >= 0x2066 && code <= 0x2069) ||
    code === 0xfeff
  );
}

export function stripControlChars(input: string, allowNewlines = false): string {
  let out = "";
  for (const ch of input) {
    const code = ch.codePointAt(0) ?? 0;
    if (isDisallowedControl(code, allowNewlines) || isInvisibleFormatting(code)) continue;
    out += ch;
  }
  return out;
}

/** Normalise + strip + trim + cap. Caps by code points so surrogate pairs are never split. */
export function cleanText(input: unknown, maxLength: number, allowNewlines = false): string {
  if (typeof input !== "string") return "";
  const normalised = input.normalize("NFKC");
  const stripped = stripControlChars(normalised, allowNewlines);
  const collapsed = allowNewlines
    ? stripped.replace(/\r\n?/g, "\n").replace(/\n{4,}/g, "\n\n\n")
    : stripped.replace(/\s+/g, " ");
  return Array.from(collapsed.trim()).slice(0, maxLength).join("").trim();
}

export const SEARCH_MAX_LENGTH = 64;

export function cleanSearchQuery(input: unknown): string {
  return cleanText(input, SEARCH_MAX_LENGTH);
}

/** Remove CR/LF and other control characters from anything that goes into an email header. */
export function headerSafe(input: string, maxLength = 200): string {
  return cleanText(input.replace(/[\r\n]+/g, " "), maxLength);
}

/** Mask an email for logs: "jane.doe@example.com" -> "j***@example.com". */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at <= 0) return "***";
  return `${email[0]}***${email.slice(at)}`;
}
