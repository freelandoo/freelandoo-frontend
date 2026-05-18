"use client"

import Link from "next/link"
import { useTranslations } from "@/components/i18n/I18nProvider"

interface LegalSection {
  title: string
  paragraphs?: string[]
  items?: string[]
}

interface LegalLink {
  href: string
  label: string
}

interface LegalDocumentProps {
  namespace: string
  title: string
  updatedAt: string
  intro: string
  sections: LegalSection[]
  footerPrefix: string
  links?: LegalLink[]
}

export function LegalDocument({
  namespace,
  title,
  updatedAt,
  intro,
  sections,
  footerPrefix,
  links = [],
}: LegalDocumentProps) {
  const t = useTranslations(namespace)

  return (
    <main className="flex-1 bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">{t("title", title)}</h1>
        <p className="text-sm text-muted-foreground mb-10">{t("updatedAt", updatedAt)}</p>

        <p className="text-muted-foreground mb-8">{t("intro", intro)}</p>

        {sections.map((section, sectionIndex) => (
          <section key={section.title} className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-3">
              {t(`sections.${sectionIndex}.title`, section.title)}
            </h2>
            {section.paragraphs?.map((paragraph, paragraphIndex) => (
              <p key={paragraph} className="text-muted-foreground mb-2">
                {t(`sections.${sectionIndex}.paragraphs.${paragraphIndex}`, paragraph)}
              </p>
            ))}
            {section.items && (
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                {section.items.map((item, itemIndex) => (
                  <li key={item}>{t(`sections.${sectionIndex}.items.${itemIndex}`, item)}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <div className="mt-10 pt-8 border-t border-border text-sm text-muted-foreground">
          {t("footer.prefix", footerPrefix)}
          {links.map((link, index) => (
            <span key={link.href}>
              {index === 0 ? " " : index === links.length - 1 ? ` ${t("footer.and", "e")} ` : ", "}
              <Link href={link.href} className="text-primary hover:underline">
                {t(`footer.links.${index}`, link.label)}
              </Link>
              {index === links.length - 1 ? "." : ""}
            </span>
          ))}
        </div>
      </div>
    </main>
  )
}
