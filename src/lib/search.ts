import { cleanSearchQuery } from "./sanitize";

/**
 * Client-side search over a static index. The query is treated strictly as data: it is cleaned
 * (NFKC, control characters removed, capped at 64 chars), folded to plain lowercase, and matched
 * with indexOf / a subsequence scan. It is never turned into a RegExp, HTML, URL or query.
 */

export type SearchKind = "service" | "bundle" | "category" | "webapp" | "member" | "faq";

export type SearchDoc = {
  id: string;
  kind: SearchKind;
  title: string;
  /** Secondary text (description, tags, answer…), searched with a lower weight. */
  body: string;
  /** Small label shown on the result, e.g. the category name. */
  meta: string;
  /** What happens when the result is chosen. */
  target: { type: "service"; slug: string } | { type: "anchor"; id: string };
};

export type Range = readonly [start: number, end: number];

export type SearchResult = {
  doc: SearchDoc;
  score: number;
  /** Ranges in doc.title to highlight (rendered with <mark> by React, never as HTML). */
  highlights: ReadonlyArray<Range>;
};

/** Fold a single character to a comparable form without changing string length. */
function foldChar(ch: string): string {
  const base = ch.normalize("NFKD").charAt(0).toLowerCase();
  return base.length === 1 ? base : ch.toLowerCase();
}

/** Length-preserving fold: index i in the output corresponds to index i in the input. */
export function fold(input: string): string {
  let out = "";
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    // keep surrogate pairs as-is so indices stay aligned
    if (code >= 0xd800 && code <= 0xdfff) {
      out += input.charAt(i);
      continue;
    }
    out += foldChar(input.charAt(i));
  }
  return out;
}

function tokenize(query: string): string[] {
  return fold(query)
    .split(/[\s,.;:!?/\\|()[\]{}"'`&+=<>-]+/)
    .filter((t) => t.length > 0)
    .slice(0, 8);
}

function allIndexes(haystack: string, needle: string): number[] {
  const found: number[] = [];
  let from = 0;
  while (from <= haystack.length - needle.length) {
    const i = haystack.indexOf(needle, from);
    if (i === -1) break;
    found.push(i);
    from = i + needle.length;
  }
  return found;
}

/** Characters of `needle` appear in order in `haystack` (typo-tolerant prefix-ish match). */
function subsequence(haystack: string, needle: string): boolean {
  let j = 0;
  for (let i = 0; i < haystack.length && j < needle.length; i += 1) {
    if (haystack[i] === needle[j]) j += 1;
  }
  return j === needle.length;
}

function mergeRanges(ranges: Range[]): Range[] {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const out: Range[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r[0] <= last[1]) out[out.length - 1] = [last[0], Math.max(last[1], r[1])];
    else out.push(r);
  }
  return out;
}

const KIND_BOOST: Record<SearchKind, number> = {
  service: 6,
  bundle: 6,
  category: 4,
  webapp: 3,
  member: 3,
  faq: 1,
};

export function search(
  docs: ReadonlyArray<SearchDoc>,
  rawQuery: unknown,
  limit = 24,
): SearchResult[] {
  const query = cleanSearchQuery(rawQuery);
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const results: SearchResult[] = [];
  for (const doc of docs) {
    const title = fold(doc.title);
    const body = fold(`${doc.body} ${doc.meta}`);
    let score = 0;
    const highlights: Range[] = [];
    let allTokensMatched = true;

    for (const token of tokens) {
      const inTitle = allIndexes(title, token);
      if (inTitle.length > 0) {
        const wordStart = inTitle.some((i) => i === 0 || title[i - 1] === " ");
        score += wordStart ? 30 : 18;
        for (const i of inTitle) highlights.push([i, i + token.length]);
        continue;
      }
      if (body.includes(token)) {
        score += 8;
        continue;
      }
      if (token.length >= 3 && subsequence(title, token)) {
        score += 4;
        continue;
      }
      allTokensMatched = false;
      break;
    }
    if (!allTokensMatched || score === 0) continue;
    results.push({ doc, score: score + KIND_BOOST[doc.kind], highlights: mergeRanges(highlights) });
  }
  return results
    .sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title))
    .slice(0, limit);
}

/** Split a title into plain/highlighted segments for React to render. */
export function segments(
  title: string,
  highlights: ReadonlyArray<Range>,
): Array<{ text: string; match: boolean }> {
  const out: Array<{ text: string; match: boolean }> = [];
  let cursor = 0;
  for (const [start, end] of highlights) {
    if (start > cursor) out.push({ text: title.slice(cursor, start), match: false });
    out.push({ text: title.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < title.length) out.push({ text: title.slice(cursor), match: false });
  return out;
}

/** Validate a ?q= value read from the URL. Returns "" for anything unusable. */
export function readQueryParam(value: string | null): string {
  if (value === null) return "";
  return cleanSearchQuery(value);
}
