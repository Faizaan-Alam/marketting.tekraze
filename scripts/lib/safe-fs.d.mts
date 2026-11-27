/** Types for the plain-JS build helpers (used by the unit tests). */
export declare const ROOT: string;
export declare const SAFE_SLUG: RegExp;
export declare const VIDEO_EXT: Set<string>;
export declare const IMAGE_EXT: Set<string>;
export declare function slugify(name: string): string;
export declare function isSafeEntryName(name: unknown): boolean;
export declare function isInside(root: string, target: string): boolean;
export declare function isRegularFile(p: string): boolean;
export declare function isNewer(output: string, input: string): boolean;
export declare function sniffImage(buf: Uint8Array): "png" | "jpg" | "webp" | "avif" | null;
export declare function safeLiveUrl(input: unknown): string | null;
