import { categoryById, growthBundle, services } from "@/content/services";
import { faqs, site, socialLinks } from "@/content/site";

/** JSON-LD (Organization, WebSite, Service, FAQPage), built only from the content files. */
export function jsonLdGraph() {
  const orgId = `${site.mainSite}/#organization`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": orgId,
        name: "Tekraze",
        url: site.mainSite,
        sameAs: socialLinks.map((s) => s.url),
      },
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        url: site.url,
        name: site.name,
        publisher: { "@id": orgId },
      },
      ...services.map((s) => ({
        "@type": "Service",
        "@id": `${site.url}/#service-${s.slug}`,
        name: s.title,
        description: s.description,
        serviceType: categoryById(s.category).title,
        provider: { "@id": orgId },
        url: `${site.url}/?service=${s.slug}`,
      })),
      {
        "@type": "Service",
        "@id": `${site.url}/#service-${growthBundle.slug}`,
        name: growthBundle.title,
        description: `${growthBundle.audience} Includes: ${growthBundle.included.join(", ")}.`,
        provider: { "@id": orgId },
      },
      {
        "@type": "FAQPage",
        "@id": `${site.url}/#faq`,
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      },
    ],
  };
}
