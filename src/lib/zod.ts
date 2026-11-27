import { z } from "zod";

/**
 * The project's only entry point to zod. `jitless` stops zod from probing or using
 * `new Function` for its compiled parsers: the CSP forbids eval, and we want zero eval attempts.
 * Import `z` from "@/lib/zod", never from "zod" directly (enforced by ESLint).
 */
z.config({ jitless: true });

export { z };
