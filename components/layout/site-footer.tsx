import Image from "next/image"
import Link from "next/link"

export function SiteFooter() {
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
            <p className="text-sm text-neutral-600">Conectando profissionais e clientes.</p>
          </div>

          <div>
            <h3 className="mb-4 text-base font-semibold text-neutral-900">Plataforma</h3>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li>
                <Link href="/comofunciona" className="transition-colors hover:text-neutral-900">
                  Como funciona
                </Link>
              </li>
              <li>
                <Link href="/anunciar-servicos" className="transition-colors hover:text-neutral-900">
                  Anunciar serviços
                </Link>
              </li>
              <li>
                <Link href="/contratar-profissionais" className="transition-colors hover:text-neutral-900">
                  Contratar profissionais
                </Link>
              </li>
              <li>
                <Link href="/precos" className="transition-colors hover:text-neutral-900">
                  Preços
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-base font-semibold text-neutral-900">Recursos</h3>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li>
                <Link href="/central-de-ajuda" className="transition-colors hover:text-neutral-900">
                  Central de ajuda
                </Link>
              </li>
              <li>
                <Link href="/comunidade" className="transition-colors hover:text-neutral-900">
                  Comunidade
                </Link>
              </li>
              <li>
                <Link href="/dicas-de-seguranca" className="transition-colors hover:text-neutral-900">
                  Dicas de segurança
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
            <h3 className="mb-4 text-base font-semibold text-neutral-900">Empresa</h3>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li>
                <Link href="/sobre-nos" className="transition-colors hover:text-neutral-900">
                  Sobre nós
                </Link>
              </li>
              <li>
                <Link href="/carreiras" className="transition-colors hover:text-neutral-900">
                  Carreiras
                </Link>
              </li>
              <li>
                <Link href="/terms" className="transition-colors hover:text-neutral-900">
                  Termos de uso
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="transition-colors hover:text-neutral-900">
                  Privacidade
                </Link>
              </li>
              <li>
                <Link href="/cookies-policy" className="transition-colors hover:text-neutral-900">
                  Política de cookies
                </Link>
              </li>
              <li>
                <Link href="/subscription-terms" className="transition-colors hover:text-neutral-900">
                  Termo de ativação
                </Link>
              </li>
              <li>
                <Link href="/affiliate-terms" className="transition-colors hover:text-neutral-900">
                  Programa de afiliados
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8 text-center text-sm text-neutral-600">
          <p>&copy; {new Date().getFullYear()} Freelandoo. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
