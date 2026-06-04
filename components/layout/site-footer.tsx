"use client"

/**
 * SiteFooter — rodapé global do grupo (with-footer), no estilo tabloide
 * editorial (canvas escuro, dourado, fontes condensada/manuscrita). Espelha o
 * LandingFooter, mas preserva as traduções (i18n) e os 14 links legais.
 *
 * Envolto em `.fl-root` para resolver os tokens `--fl-*` (definidos só nesse
 * escopo), já que o footer pode ser montado fora do subtree da landing.
 */
import Image from "next/image"
import Link from "next/link"
import { Instagram, Smartphone, ArrowRight } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { HiveDoodle, GoldButton, YellowHighlight, DoodleArrow } from "@/components/home/landing/primitives"

const legalLinks = [
  { href: "/terms", key: "terms", label: "Termos de Uso" },
  { href: "/privacy-policy", key: "privacy", label: "Política de Privacidade" },
  { href: "/cookies-policy", key: "cookiesPolicy", label: "Política de Cookies" },
  { href: "/subscription-terms", key: "subscriptionTerms", label: "Termo de Ativação" },
  { href: "/affiliate-terms", key: "affiliateProgram", label: "Contrato de Afiliados" },
  { href: "/marketplace-terms", key: "marketplaceTerms", label: "Termos do Marketplace" },
  { href: "/return-policy", key: "returnPolicy", label: "Trocas e Devoluções" },
  { href: "/community-guidelines", key: "communityGuidelines", label: "Diretrizes da Comunidade" },
  { href: "/moderation-policy", key: "moderationPolicy", label: "Moderação e Denúncias" },
  { href: "/copyright-policy", key: "copyrightPolicy", label: "Direitos Autorais" },
  { href: "/polens-terms", key: "polensTerms", label: "Poléns e Itens Digitais" },
  { href: "/minors-policy", key: "minorsPolicy", label: "Privacidade de Menores" },
  { href: "/advertising-policy", key: "advertisingPolicy", label: "Política de Publicidade" },
  { href: "/casa-views-regulamento", key: "casaViewsRegulamento", label: "Regulamento da Casa Views" },
]

export function SiteFooter() {
  const tNav = useTranslations("Navigation")
  const tFooter = useTranslations("Footer")

  return (
    <footer className="fl-root relative overflow-hidden border-t border-[#F5F1E8]/8 bg-[#100E0A] text-[#F5F1E8]">
      <HiveDoodle className="absolute -right-10 -top-10 h-44 w-44 text-[#F2B705]/10" />
      <div className="relative mx-auto w-full max-w-[1180px] px-5 py-14 sm:px-8">
        {/* Band editorial */}
        <div className="mb-12 border-b border-[#F5F1E8]/10 pb-12">
          <div className="mb-2 flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] text-[#F2B705]">
            <span>{tFooter("sell", "Venda")}</span><span className="text-[#F5F1E8]/30">•</span>
            <span>{tFooter("teach", "Ensine")}</span><span className="text-[#F5F1E8]/30">•</span>
            <span>{tFooter("learn", "Aprenda")}</span><span className="text-[#F5F1E8]/30">•</span>
            <span>{tFooter("earn", "Ganhe")}</span>
          </div>
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div className="relative">
              <h2 className="fl-display text-5xl text-[#F5F1E8] sm:text-6xl md:text-7xl">
                {tFooter("ctaTitlePre", "Sua próxima")} <YellowHighlight mark>{tFooter("ctaTitleMark", "renda")}</YellowHighlight> {tFooter("ctaTitlePos", "começa aqui.")}
              </h2>
              <DoodleArrow dir="down-right" className="absolute -right-6 top-1 hidden h-10 w-20 text-[#F2B705] lg:block" />
            </div>
            <GoldButton href="/cadastro" className="group shrink-0">
              {tNav("getStarted", "Começar agora")} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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
              {tFooter("tagline", "Conectando profissionais e clientes.")}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#F2B705]">{tFooter("platform", "Plataforma")}</h3>
            <ul className="mt-4 space-y-2.5">
              <li><Link href="/comofunciona" className="text-sm text-[#C9C2B6] transition hover:text-[#F5F1E8]">{tNav("howItWorks", "Como funciona")}</Link></li>
              <li><Link href="/anunciar-servicos" className="text-sm text-[#C9C2B6] transition hover:text-[#F5F1E8]">{tFooter("advertiseServices", "Anunciar serviços")}</Link></li>
              <li><Link href="/contratar-profissionais" className="text-sm text-[#C9C2B6] transition hover:text-[#F5F1E8]">{tFooter("hireProfessionals", "Contratar profissionais")}</Link></li>
              <li><Link href="/precos" className="text-sm text-[#C9C2B6] transition hover:text-[#F5F1E8]">{tFooter("pricing", "Preços")}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#F2B705]">{tFooter("resources", "Recursos")}</h3>
            <ul className="mt-4 space-y-2.5">
              <li><Link href="/blog" className="text-sm text-[#C9C2B6] transition hover:text-[#F5F1E8]">{tFooter("blog", "Blog")}</Link></li>
              <li><Link href="/central-de-ajuda" className="text-sm text-[#C9C2B6] transition hover:text-[#F5F1E8]">{tFooter("helpCenter", "Central de ajuda")}</Link></li>
              <li><Link href="/comunidade" className="text-sm text-[#C9C2B6] transition hover:text-[#F5F1E8]">{tFooter("community", "Comunidade")}</Link></li>
              <li><Link href="/dicas-de-seguranca" className="text-sm text-[#C9C2B6] transition hover:text-[#F5F1E8]">{tFooter("safetyTips", "Dicas de segurança")}</Link></li>
              <li>
                <a href="https://www.instagram.com/printtei_/" target="_blank" rel="noopener noreferrer" className="text-sm text-[#C9C2B6] transition hover:text-[#F5F1E8]">
                  Printtei_
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#F2B705]">{tFooter("company", "Empresa")}</h3>
            <ul className="mt-4 space-y-2.5">
              <li><Link href="/sobre-nos" className="text-sm text-[#C9C2B6] transition hover:text-[#F5F1E8]">{tFooter("about", "Sobre nós")}</Link></li>
              <li><Link href="/carreiras" className="text-sm text-[#C9C2B6] transition hover:text-[#F5F1E8]">{tFooter("careers", "Carreiras")}</Link></li>
            </ul>
            <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-[#F2B705]">{tFooter("contact", "Contato")}</h3>
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
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#F2B705]">{tFooter("followUs", "Siga a Freelandoo")}</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="https://www.instagram.com/printtei_/" target="_blank" rel="noopener noreferrer" aria-label="Instagram @printtei_"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#F5F1E8]/15 text-[#C9C2B6] transition hover:border-[#F2B705] hover:text-[#F2B705]"
              >
                <Instagram className="h-4 w-4" />
              </a>
            </div>
            <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-[#F2B705]">{tFooter("downloadApp", "Baixe o app")}</h3>
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#F5F1E8]/15 px-3 py-2 text-sm text-[#C9C2B6]">
              <Smartphone className="h-4 w-4 text-[#F2B705]" /> {tFooter("appAvailability", "Acesse pelo navegador ou instale como app (PWA)")}
            </div>
          </div>
        </div>

        {/* Jurídico — todos os 14 links preservados */}
        <div className="mt-12 border-t border-[#F5F1E8]/10 pt-8">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#F2B705]">{tFooter("legal", "Jurídico")}</h3>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#9A938A]">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition hover:text-[#F5F1E8]">
                  {tFooter(link.key, link.label)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 border-t border-[#F5F1E8]/10 pt-6 text-center text-xs text-[#9A938A]">
          <p>&copy; {new Date().getFullYear()} Freelandoo. {tFooter("copyright", "Todos os direitos reservados.")}</p>
        </div>
      </div>
    </footer>
  )
}
