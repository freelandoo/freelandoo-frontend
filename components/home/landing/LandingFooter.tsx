/**
 * LandingFooter — rodapé light da homepage editorial.
 * Mantém links de navegação importantes + páginas legais já existentes.
 */
import Image from "next/image"
import Link from "next/link"
import { LINKS } from "./tokens"
import { HiveDoodle } from "./primitives"

const COLS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Ganhe dinheiro",
    links: [
      { label: "Oferecer serviços", href: LINKS.cadastro },
      { label: "Criar cursos", href: LINKS.cursos },
      { label: "Vender produtos", href: LINKS.cadastro },
      { label: "Ser afiliado", href: LINKS.afiliados },
      { label: "Virar influenciador", href: LINKS.influenciadores },
    ],
  },
  {
    title: "Explorar",
    links: [
      { label: "Buscar profissionais", href: LINKS.explorar },
      { label: "Feed", href: LINKS.feed },
      { label: "Como funciona", href: LINKS.comoFunciona },
      { label: "Preços", href: "/precos" },
      { label: "Central de ajuda", href: "/central-de-ajuda" },
    ],
  },
  {
    title: "Freelandoo",
    links: [
      { label: "Sobre nós", href: "/sobre-nos" },
      { label: "Carreiras", href: "/carreiras" },
      { label: "Segurança de menores", href: "/minors-policy" },
      { label: "Termos de uso", href: "/terms" },
      { label: "Privacidade", href: "/privacy-policy" },
    ],
  },
]

export function LandingFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-[#14110B]/8 bg-[#14110B] text-[#FAF7F0]">
      <HiveDoodle className="absolute -right-10 -top-10 h-48 w-48 text-[#F2B705]/15" />
      <div className="relative mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/freelandoo-logo.png"
                alt="Freelandoo"
                width={200}
                height={56}
                className="h-8 w-auto"
              />
              <span className="text-xl font-black">Freelandoo</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#FAF7F0]/65">
              A rede social de oportunidades comerciais. Venda serviços, cursos e produtos, e ganhe indicando.
            </p>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#F2B705]">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link href={l.href} className="text-sm text-[#FAF7F0]/70 transition hover:text-[#FAF7F0]">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-[#FAF7F0]/10 pt-6 text-xs text-[#FAF7F0]/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Freelandoo. Todos os direitos reservados.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/cookies-policy" className="hover:text-[#FAF7F0]">Cookies</Link>
            <Link href="/community-guidelines" className="hover:text-[#FAF7F0]">Diretrizes</Link>
            <Link href="/dicas-de-seguranca" className="hover:text-[#FAF7F0]">Segurança</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
