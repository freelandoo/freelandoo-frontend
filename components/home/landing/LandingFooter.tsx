"use client"

/**
 * LandingFooter — rodapé dark com colunas, redes sociais e "Baixe o app".
 * Mantém links de navegação importantes + páginas legais existentes.
 * Client component (i18n via useTranslations, namespace "Home").
 */
import Image from "next/image"
import Link from "next/link"
import { Instagram, Smartphone, ArrowRight } from "lucide-react"
import { LINKS } from "./tokens"
import { HiveDoodle, GoldButton, YellowHighlight, DoodleArrow } from "./primitives"
import { useTranslations } from "@/components/i18n/I18nProvider"

// `k`/`tk` = chaves i18n no namespace "Home" (fallback = texto pt).
const COLS: { title: string; tk: string; links: { label: string; href: string; k: string }[] }[] = [
  {
    title: "Navegue",
    tk: "footerColNavegar",
    links: [
      { label: "Como funciona", href: LINKS.comoFunciona, k: "navComoFunciona" },
      { label: "Recursos", href: "#recursos", k: "navRecursos" },
      { label: "Preços", href: LINKS.precos, k: "navPrecos" },
      { label: "Marketplace", href: LINKS.marketplace, k: "navMarketplace" },
    ],
  },
  {
    title: "Suporte",
    tk: "footerColSuporte",
    links: [
      { label: "Central de ajuda", href: "/central-de-ajuda", k: "footerCentralAjuda" },
      { label: "Contato", href: "/central-de-ajuda", k: "footerContato" },
      { label: "Segurança", href: "/dicas-de-seguranca", k: "footerSeguranca" },
      { label: "Garantia", href: "/return-policy", k: "footerGarantia" },
    ],
  },
  {
    title: "Sobre",
    tk: "footerColSobre",
    links: [
      { label: "Quem somos", href: "/sobre-nos", k: "footerQuemSomos" },
      { label: "Blog", href: "/blog", k: "footerBlog" },
      { label: "Carreiras", href: "/carreiras", k: "footerCarreiras" },
      { label: "Imprensa", href: "/sobre-nos", k: "footerImprensa" },
    ],
  },
]

export function LandingFooter() {
  const t = useTranslations("Home")
  return (
    <footer className="relative overflow-hidden border-t border-[#F5F1E8]/8 bg-[#100E0A] text-[#F5F1E8]">
      <HiveDoodle className="absolute -right-10 -top-10 h-44 w-44 text-[#F2B705]/10" />
      <div className="relative mx-auto w-full max-w-[1180px] px-5 py-14 sm:px-8">
        {/* Band editorial estilo post */}
        <div className="mb-12 border-b border-[#F5F1E8]/10 pb-12">
          <div className="mb-2 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] text-[#F2B705]">
            <span>{t("footerBandVenda", "Venda")}</span><span className="text-[#F5F1E8]/30">•</span>
            <span>{t("footerBandEnsine", "Ensine")}</span><span className="text-[#F5F1E8]/30">•</span>
            <span>{t("footerBandAprenda", "Aprenda")}</span><span className="text-[#F5F1E8]/30">•</span>
            <span>{t("footerBandGanhe", "Ganhe")}</span>
          </div>
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div className="relative">
              <h2 className="fl-display text-5xl text-[#F5F1E8] sm:text-6xl md:text-7xl">
                {t("footerHeadlinePre", "Sua próxima ")}<YellowHighlight mark>{t("footerHeadlineHighlight", "renda")}</YellowHighlight>{t("footerHeadlinePost", " começa aqui.")}
              </h2>
              <DoodleArrow dir="down-right" className="absolute -right-6 top-1 hidden h-10 w-20 text-[#F2B705] lg:block" />
            </div>
            <GoldButton href={LINKS.cadastro} className="group shrink-0">
              {t("footerCta", "Começar agora")} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </GoldButton>
          </div>
        </div>

        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr_1.2fr]">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <Image src="/freelandoo-logo.png" alt="Freelandoo" width={200} height={56} className="h-8 w-auto" />
              <span className="text-xl font-black">freelandoo</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#9A938A]">
              {t("footerDescription", "A plataforma de negócios digitais completa para você vender, ensinar, aprender e ganhar mais todos os dias.")}
            </p>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#F2B705]">{t(col.tk, col.title)}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link href={l.href} className="text-sm text-[#C9C2B6] transition hover:text-[#F5F1E8]">{t(l.k, l.label)}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#F2B705]">{t("footerSigaFreelandoo", "Siga a Freelandoo")}</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="https://www.instagram.com/printtei_/" target="_blank" rel="noopener noreferrer" aria-label="Instagram @printtei_"
                className="inline-flex h-9 w-9 items-center justify-center border border-[#F5F1E8]/15 text-[#C9C2B6] transition hover:border-[#F2B705] hover:text-[#F2B705]"
              >
                <Instagram className="h-4 w-4" />
              </a>
            </div>
            <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-[#F2B705]">{t("footerContato", "Contato")}</h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a href="mailto:freelandoogroup@gmail.com" className="text-sm text-[#C9C2B6] transition hover:text-[#F5F1E8]">
                  freelandoogroup@gmail.com
                </a>
              </li>
              <li>
                <a href="https://wa.me/5511962757599" target="_blank" rel="noopener noreferrer" className="text-sm text-[#C9C2B6] transition hover:text-[#F5F1E8]">
                  WhatsApp (11) 96275-7599
                </a>
              </li>
            </ul>
            <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-[#F2B705]">{t("footerBaixeApp", "Baixe o app")}</h3>
            <div className="mt-3 inline-flex items-center gap-2 border border-[#F5F1E8]/15 px-3 py-2 text-sm text-[#C9C2B6]">
              <Smartphone className="h-4 w-4 text-[#F2B705]" /> {t("footerPwaNote", "Acesse pelo navegador ou instale como app (PWA)")}
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-[#F5F1E8]/10 pt-6 text-xs text-[#9A938A] sm:flex-row sm:items-center sm:justify-between">
          <p>© Freelandoo {new Date().getFullYear()}. {t("footerCopyright", "Todos os direitos reservados.")}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/terms" className="hover:text-[#F5F1E8]">{t("footerTermos", "Termos")}</Link>
            <Link href="/privacy-policy" className="hover:text-[#F5F1E8]">{t("footerPrivacidade", "Privacidade")}</Link>
            <Link href="/cookies-policy" className="hover:text-[#F5F1E8]">{t("footerCookies", "Cookies")}</Link>
            <Link href="/minors-policy" className="hover:text-[#F5F1E8]">{t("footerMenores", "Menores")}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
