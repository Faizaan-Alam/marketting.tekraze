import type { ReactNode } from "react";
import { isSafeHttpsUrl } from "@/lib/urls";

type Props = { href: string; children: ReactNode; className?: string; "aria-label"?: string };

/** The only way external links are rendered: https-only, new tab, no opener, no referrer. */
export function ExternalLink({ href, children, className, ...rest }: Props) {
  if (!isSafeHttpsUrl(href)) return <span className={className}>{children}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={rest["aria-label"]}
    >
      {children}
    </a>
  );
}
