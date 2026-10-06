import Link from "next/link"
import { ArrowRight, BarChart3, Crown, Users, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type RankingKey = "audiencia" | "participantes" | "geral"

const ITEMS: { key: RankingKey; n: string; href: string; title: [string, string]; desc: string; icon: LucideIcon }[] = [
  {
    key: "audiencia",
    n: "01",
    href: "/acasaviews/ranking-audiencia",
    title: ["Ranking da", "Audiência"],
    desc: "O público que move o jogo: teorias, comentários e engajamento ao vivo.",
    icon: BarChart3,
  },
  {
    key: "participantes",
    n: "02",
    href: "/acasaviews/ranking-participantes",
    title: ["Ranking dos", "Participantes"],
    desc: "A pontuação crua do dia: views, likes, comentários e shares somados.",
    icon: Users,
  },
  {
    key: "geral",
    n: "03",
    href: "/acasaviews/ranking-geral",
    title: ["Ranking", "Geral"],
    desc: "Cada dia fecha valendo pontos por posição. Consistência vence o viral.",
    icon: Crown,
  },
]

/**
 * Os três rankings lado a lado, no topo de cada página interna — a fileira de
 * cartões da referência. O da página aberta acende em rosa e diz "você está
 * aqui" em vez de "ver ranking".
 *
 * ⚠️ A foto de cada cartão é de GENTE DE VERDADE e só entra quando a página a
 * tem na mão (o líder daquele placar). Sem foto, o cartão desenha o ícone —
 * a referência usa arte de banco, e um rosto inventado não entra aqui.
 */
export function RankingNav({ current, photos = {} }: { current: RankingKey; photos?: Partial<Record<RankingKey, string | null>> }) {
  return (
    <nav aria-label="Os rankings da Casa Views" className="relative z-[2] mx-auto max-w-[1600px] px-4 pb-8 md:px-8 md:pb-12">
      <div className="rv-rail-bare -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0">
        {ITEMS.map((it, i) => (
          <NavCard key={it.key} item={it} active={it.key === current} photo={photos[it.key] || null} delay={i * 70} />
        ))}
      </div>
    </nav>
  )
}

function NavCard({
  item,
  active,
  photo,
  delay,
}: {
  item: (typeof ITEMS)[number]
  active: boolean
  photo: string | null
  delay: number
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      data-rv
      style={{ ["--rv-delay" as string]: `${delay}ms` }}
      className={cn(
        "group block w-[80%] shrink-0 snap-start md:w-auto",
        // no celular o trilho rola: o cartão da página aberta vem primeiro,
        // senão quem está em "Geral" vê o próprio cartão cortado na borda
        active && "order-first drop-shadow-[0_0_18px_rgba(255,0,122,0.45)] md:order-none",
      )}
    >
      <div className={cn("rv-frame h-full [--c:22px]", active && "rv-frame-pink")}>
        <div className="rv-frame-in flex h-full flex-col">
          <div className="relative min-h-[150px] flex-1 overflow-hidden md:min-h-[170px]">
            {/* foto à direita (ou o ícone, sem foto) */}
            <div className="absolute inset-y-0 right-0 w-[55%]">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" loading="lazy" className="rv-photo absolute inset-0 h-full w-full object-cover object-[50%_30%]" />
              ) : (
                <span aria-hidden className="absolute inset-0 flex items-center justify-center bg-[var(--rv-surface-2)]">
                  <span className="rv-halftone absolute inset-0 opacity-25" />
                  <Icon className="relative h-16 w-16 text-[var(--rv-white)] opacity-15" strokeWidth={1} />
                </span>
              )}
              <span aria-hidden className="rv-photo-tint" />
              <span aria-hidden className="rv-glitch-stripes absolute bottom-0 right-0 h-10 w-[60%] opacity-70" />
            </div>

            {/* número e ícone */}
            <span className="rv-wide absolute left-0 top-0 z-[3] bg-[var(--rv-bg)] py-1 pl-3 pr-4 text-[20px] leading-none">{item.n}</span>
            <span className="rv-glow-box absolute right-3 top-3 z-[3] flex h-10 w-10 items-center justify-center bg-[var(--rv-pink)]">
              <Icon className="h-5 w-5 text-[var(--rv-bg)]" strokeWidth={2.5} />
            </span>

            {/* painel branco cortado */}
            <div className="rv-paper rv-cut-tr absolute bottom-3 left-3 z-[3] w-[72%] p-3 pr-9">
              <p className="rv-wide text-[15px] leading-[0.95] md:text-[17px]">
                {item.title[0]}
                <br />
                <span className="text-[var(--rv-pink-deep)]">{item.title[1]}</span>
              </p>
              <p className="rv-type mt-1.5 line-clamp-2 text-[8.5px] uppercase leading-[1.45] tracking-[0.06em] opacity-70">{item.desc}</p>
              <span className="absolute bottom-2.5 right-2.5 flex h-6 w-6 items-center justify-center border-[1.5px] border-[var(--rv-bg)] transition-colors group-hover:border-[var(--rv-pink)] group-hover:bg-[var(--rv-pink)] group-hover:text-[var(--rv-white)]" style={{ borderRadius: 9999 }} data-avatar>
                <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
              </span>
            </div>
          </div>

          <span
            className={cn(
              "rv-type flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em]",
              active ? "bg-[var(--rv-pink)] text-[var(--rv-bg)]" : "bg-[var(--rv-surface-2)] text-[var(--rv-white)] group-hover:bg-[var(--rv-pink)] group-hover:text-[var(--rv-bg)]",
            )}
          >
            {active ? "você está aqui" : "ver ranking"}
            <span aria-hidden>»</span>
          </span>
        </div>
      </div>
    </Link>
  )
}
