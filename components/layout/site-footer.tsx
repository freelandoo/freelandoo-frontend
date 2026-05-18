"use client"

import Image from "next/image"
import Link from "next/link"
import { useTranslations } from "@/components/i18n/I18nProvider"

export function SiteFooter() {
  const tNav = useTranslations("Navigation")
  const tFooter = useTranslations("Footer")

  return (
    <footer className="border-t border-border bg-white text-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link href="/" className="mb-4 inline-flex items-center">
              <Image
                src="/freelandoo-logo.png"
                alt="Freelandoo"
                width={160}
                height={44}
                className="h-9 w-auto"
              />
            </Link>
            <p className="text-sm text-neutral-600">{tFooter("tagline", "Conectando profissionais e clientes.")}</p>
          </div>

          <div>
            <h3 className="mb-4 text-base font-semibold text-neutral-900">{tFooter("platform", "Plataforma")}</h3>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li>
                <Link href="/comofunciona" className="transition-colors hover:text-neutral-900">
                  {tNav("howItWorks", "Como funciona")}
                </Link>
              </li>
              <li>
                <Link href="/anunciar-servicos" className="transition-colors hover:text-neutral-900">
                  {tFooter("advertiseServices", "Anunciar serviços")}
                </Link>
              </li>
              <li>
                <Link href="/contratar-profissionais" className="transition-colors hover:text-neutral-900">
                  {tFooter("hireProfessionals", "Contratar profissionais")}
                </Link>
              </li>
              <li>
                <Link href="/precos" className="transition-colors hover:text-neutral-900">
                  {tFooter("pricing", "Preços")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-base font-semibold text-neutral-900">{tFooter("resources", "Recursos")}</h3>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li>
                <Link href="/central-de-ajuda" className="transition-colors hover:text-neutral-900">
                  {tFooter("helpCenter", "Central de ajuda")}
                </Link>
              </li>
              <li>
                <Link href="/comunidade" className="transition-colors hover:text-neutral-900">
                  {tFooter("community", "Comunidade")}
                </Link>
              </li>
              <li>
                <Link href="/dicas-de-seguranca" className="transition-colors hover:text-neutral-900">
                  {tFooter("safetyTips", "Dicas de segurança")}
                </Link>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/printtei_/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-neutral-900"
                >
                  Printtei_
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-base font-semibold text-neutral-900">{tFooter("company", "Empresa")}</h3>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li>
                <Link href="/sobre-nos" className="transition-colors hover:text-neutral-900">
                  {tFooter("about", "Sobre nós")}
                </Link>
              </li>
              <li>
                <Link href="/carreiras" className="transition-colors hover:text-neutral-900">
                  {tFooter("careers", "Carreiras")}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="transition-colors hover:text-neutral-900">
                  {tFooter("terms", "Termos de uso")}
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="transition-colors hover:text-neutral-900">
                  {tFooter("privacy", "Privacidade")}
                </Link>
              </li>
              <li>
                <Link href="/cookies-policy" className="transition-colors hover:text-neutral-900">
                  {tFooter("cookiesPolicy", "Política de cookies")}
                </Link>
              </li>
              <li>
                <Link href="/subscription-terms" className="transition-colors hover:text-neutral-900">
                  {tFooter("subscriptionTerms", "Termo de ativação")}
                </Link>
              </li>
              <li>
                <Link href="/affiliate-terms" className="transition-colors hover:text-neutral-900">
                  {tFooter("affiliateProgram", "Programa de afiliados")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8 text-center text-sm text-neutral-600">
          <p>&copy; {new Date().getFullYear()} Freelandoo. {tFooter("copyright", "Todos os direitos reservados.")}</p>
        </div>
      </div>
    </footer>
  )
}
