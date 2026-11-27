import { footerLinks, mainSiteLinks, navSections, site, socialLinks } from "@/content/site";
import { SocialIcon } from "@/components/ui/Icons";
import { SoundToggle } from "./SoundToggle";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="gutter border-t border-line pb-28 pt-14 text-sm text-paper-dim md:pb-14">
      <div className="mx-auto max-w-6xl">
        <ul className="flex flex-wrap gap-2" role="list" aria-label="Tekraze on social media">
          {socialLinks.map((s) => (
            <li key={s.network}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="grid h-11 w-11 place-items-center rounded-full border border-line text-paper-dim transition-colors hover:border-paper hover:text-paper"
                aria-label={`Tekraze on ${s.label} (opens in a new tab)`}
              >
                <SocialIcon network={s.network} />
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-4">
          <nav aria-label="On this page">
            <h2 className="text-paper">On this page</h2>
            <ul className="mt-3 space-y-2" role="list">
              {navSections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="hover:text-paper">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Tekraze">
            <h2 className="text-paper">Tekraze</h2>
            <ul className="mt-3 space-y-2" role="list">
              {mainSiteLinks.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-paper"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Company" className="col-span-2 md:col-span-1">
            <h2 className="text-paper">Company</h2>
            <ul className="mt-3 space-y-2" role="list">
              {footerLinks.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-paper"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="col-span-2 md:col-span-1">
            <h2 className="text-paper">Settings</h2>
            <div className="mt-3">
              <SoundToggle />
            </div>
          </div>
        </div>
        <p className="mt-12 text-paper-faint">
          &copy; {year} Tekraze.com. {site.shortName} is the services site of{" "}
          <a
            href={site.mainSite}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-paper"
          >
            Tekraze
          </a>
          . Crypto analysis is informational only, not financial advice.
        </p>
      </div>
    </footer>
  );
}
