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
    <main className="fl-root relative flex-1 bg-[#0b0804] text-[#C9C2B6]">
      <div className="container mx-auto max-w-3xl px-4 py-12 md:py-16">
        <header className="border-b-2 border-[#F1EDE2]/12 pb-7">
          <p className="fl-marker mb-1 text-2xl font-bold leading-none text-[#F2B705]">Documento</p>
          <h1 className="fl-display text-4xl leading-[0.92] text-[#F2B705] sm:text-5xl">{t("title", title)}</h1>
          <p className="mt-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#8a8275]">{t("updatedAt", updatedAt)}</p>
        </header>

        <p className="mt-8 mb-8 text-sm font-bold leading-relaxed text-[#C9C2B6] sm:text-base">{t("intro", intro)}</p>

        {sections.map((section, sectionIndex) => (
          <section key={section.title} className="mb-8">
            <h2 className="mb-3 text-lg font-black uppercase tracking-[0.02em] text-[#F5F1E8]">
              {t(`sections.${sectionIndex}.title`, section.title)}
            </h2>
            {section.paragraphs?.map((paragraph, paragraphIndex) => (
              <p key={paragraph} className="mb-2 leading-relaxed text-[#C9C2B6]">
                {t(`sections.${sectionIndex}.paragraphs.${paragraphIndex}`, paragraph)}
              </p>
            ))}
            {section.items && (
              <ul className="list-disc space-y-1 pl-5 leading-relaxed text-[#C9C2B6] marker:text-[#F2B705]">
                {section.items.map((item, itemIndex) => (
                  <li key={item}>{t(`sections.${sectionIndex}.items.${itemIndex}`, item)}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <div className="mt-10 border-t-2 border-[#F1EDE2]/12 pt-8 text-sm text-[#9A938A]">
          {t("footer.prefix", footerPrefix)}
          {links.map((link, index) => (
            <span key={link.href}>
              {index === 0 ? " " : index === links.length - 1 ? ` ${t("footer.and", "e")} ` : ", "}
              <Link href={link.href} className="font-bold text-[#F2B705] underline-offset-2 hover:underline">
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
