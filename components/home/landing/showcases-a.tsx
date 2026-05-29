/**
 * showcases-a (seções 3-11) — Cursos, Vários perfis, Serviços, Produtos,
 * Lojinha, Busca, Chamados, Oportunidades, Afiliados.
 *
 * Server components puros. Texto principal é HTML real/indexável. Entrada via
 * data-reveal/data-stagger (RevealMount). Mocks de UI são stylizados (cards
 * flutuantes), não screenshots falsos.
 */
import type { ReactNode } from "react"
import {
  GraduationCap, PlayCircle, CheckCircle2, Plus, Star, MapPin, ShoppingCart,
  Package, LayoutDashboard, Search as SearchIcon, SlidersHorizontal, Bell,
  Megaphone, Ticket, Wallet, TrendingUp, ArrowUpRight, Hammer, Camera, Wrench,
} from "lucide-react"
import { LINKS, ENXAME_COLORS } from "./tokens"
import {
  Section, GoldButton, GhostButton, Badge, YellowHighlight,
  DoodleArrow, TornPaperCard, Sticker,
} from "./primitives"
import { CouponCopy } from "./CouponCopy"

/* ── Layout split reutilizável ────────────────────────────────────────────── */
function Split({
  id, kicker, title, text, cta, visual, reverse, bg,
}: {
  id: string
  kicker: string
  title: ReactNode
  text: ReactNode
  cta?: { label: string; href: string; ghost?: { label: string; href: string } }
  visual: ReactNode
  reverse?: boolean
  bg?: string
}) {
  return (
    <Section id={id} className={bg}>
      <div className={`grid items-center gap-12 md:grid-cols-2 md:gap-16 ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}>
        <div data-reveal>
          <Badge tone="gold" className="mb-4">{kicker}</Badge>
          <h2 className="fl-display text-4xl font-black text-[#14110B] sm:text-5xl">{title}</h2>
          <div className="mt-5 max-w-md text-lg leading-relaxed text-[#2A2418]/75">{text}</div>
          {cta && (
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <GoldButton href={cta.href}>{cta.label}</GoldButton>
              {cta.ghost && <GhostButton href={cta.ghost.href}>{cta.ghost.label}</GhostButton>}
            </div>
          )}
        </div>
        <div data-reveal className="relative">{visual}</div>
      </div>
    </Section>
  )
}

function MockShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-3xl fl-card p-4 sm:p-5 ${className ?? ""}`}>{children}</div>
  )
}

/* ════════════════════════ 3 · CURSOS ════════════════════════ */
export function CourseShowcase() {
  const modules = [
    { t: "Módulo 1 · Fundamentos", lessons: 4, done: true },
    { t: "Módulo 2 · Na prática", lessons: 6, done: false },
    { t: "Módulo 3 · Projeto final", lessons: 3, done: false },
  ]
  return (
    <Split
      id="cursos"
      kicker="Cursos"
      title={<>Crie cursos de forma <YellowHighlight>fácil e gratuita.</YellowHighlight></>}
      text={<>Na Freelandoo, você consegue criar cursos de graça. Transforme seu conhecimento em aulas, cursos e materiais digitais sem precisar começar pagando.</>}
      cta={{ label: "Criar curso", href: LINKS.cursos, ghost: { label: "Ver cursos", href: LINKS.cursos } }}
      visual={
        <>
          <Sticker className="absolute -left-3 -top-3 z-10" rotate={-8}>grátis</Sticker>
          <MockShell>
            <div className="flex items-center gap-3 border-b border-[#14110B]/8 pb-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0EA5E9]/15 text-[#0EA5E9]">
                <GraduationCap className="h-5 w-5" />
              </span>
              <div>
                <div className="text-sm font-black text-[#14110B]">Marcenaria do zero</div>
                <div className="text-xs text-[#6B6457]">13 aulas · 2h40 · Certificado</div>
              </div>
            </div>
            <div className="mt-3 space-y-2.5">
              {modules.map((m) => (
                <div key={m.t} className="flex items-center gap-3 rounded-xl bg-[#FAF7F0] px-3 py-2.5">
                  {m.done ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <PlayCircle className="h-5 w-5 text-[#6B6457]" />}
                  <span className="flex-1 text-sm font-semibold text-[#14110B]">{m.t}</span>
                  <span className="text-xs text-[#6B6457]">{m.lessons} aulas</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-[#14110B] px-4 py-3 text-[#FAF7F0]">
              <span className="text-sm font-bold">Publicar curso</span>
              <Plus className="h-4 w-4 text-[#F2B705]" />
            </div>
          </MockShell>
        </>
      }
    />
  )
}

/* ════════════════════════ 4 · VÁRIOS PERFIS ════════════════════════ */
export function MultiProfileShowcase() {
  const profiles = [
    { name: "Marceneiro", icon: Hammer, ex: "servicos_residenciais" },
    { name: "Professor", icon: GraduationCap, ex: "educacao" },
    { name: "Fotógrafo", icon: Camera, ex: "artistas" },
    { name: "Mecânico", icon: Wrench, ex: "veiculos" },
  ]
  return (
    <Split
      id="perfis"
      reverse
      bg="bg-[#F2EDE1]"
      kicker="Vários perfis"
      title={<>Uma conta. <YellowHighlight>Vários perfis.</YellowHighlight></>}
      text={<>Na Freelandoo, você pode ter vários perfis na mesma conta: um de marceneiro, outro de mecânico, outro de professor, outro de vendedor e outro de influenciador.</>}
      cta={{ label: "Criar minha conta", href: LINKS.cadastro }}
      visual={
        <div className="relative">
          <DoodleArrow dir="left" className="absolute -right-4 -top-6 h-10 w-20 text-[#E6A800]" />
          <div data-stagger className="grid grid-cols-2 gap-4">
            {profiles.map((p, i) => {
              const color = ENXAME_COLORS[p.ex]
              const Icon = p.icon
              return (
                <TornPaperCard key={p.name} data-card variant="soft" rotate={i % 2 ? 1.5 : -1.5} className="flex flex-col items-start gap-3 p-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: `${color}1f`, color }}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-sm font-black text-[#14110B]">{p.name}</div>
                    <div className="text-xs text-[#6B6457]">@voce.{p.name.toLowerCase()}</div>
                  </div>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: `${color}22`, color }}>
                    Ativo
                  </span>
                </TornPaperCard>
              )
            })}
          </div>
        </div>
      }
    />
  )
}

/* ════════════════════════ 5 · SERVIÇOS ════════════════════════ */
export function ServiceShowcase() {
  return (
    <Split
      id="servicos"
      kicker="Serviços"
      title={<>Ofereça seus serviços e <YellowHighlight>seja encontrado.</YellowHighlight></>}
      text={<>Seu subperfil funciona como uma vitrine profissional para clientes encontrarem você por cidade, categoria ou profissão.</>}
      cta={{ label: "Oferecer serviço", href: LINKS.cadastro, ghost: { label: "Ver profissionais", href: LINKS.explorar } }}
      visual={
        <MockShell className="max-w-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F2B705]/20 text-2xl">🪵</span>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black text-[#14110B]">Ateliê do João</span>
                <CheckCircle2 className="h-4 w-4 text-[#0EA5E9]" />
              </div>
              <div className="flex items-center gap-1 text-xs text-[#6B6457]"><MapPin className="h-3 w-3" /> Santo André, SP</div>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-[#FAF7F0] px-2 py-1 text-sm font-bold text-[#14110B]">
              <Star className="h-4 w-4 fill-[#F2B705] text-[#F2B705]" /> 4,9
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-[#14110B]/8 p-3">
            <div className="text-xs font-bold uppercase tracking-wide text-[#6B6457]">Serviço</div>
            <div className="mt-1 text-sm font-bold text-[#14110B]">Móvel planejado sob medida</div>
            <div className="mt-1 text-sm text-[#6B6457]">a partir de <span className="font-black text-[#14110B]">R$ 450</span></div>
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-[#14110B] py-3 text-sm font-bold text-[#FAF7F0]">
            Contratar agora <ArrowUpRight className="h-4 w-4 text-[#F2B705]" />
          </div>
        </MockShell>
      }
    />
  )
}

/* ════════════════════════ 6 · PRODUTOS ════════════════════════ */
export function ProductStoreShowcase() {
  const products = [
    { name: "Caneca artesanal", price: "R$ 39", tag: "Artesanal", emoji: "☕" },
    { name: "Curso PDF de logo", price: "R$ 19", tag: "Digital", emoji: "🎨" },
    { name: "Bike usada", price: "R$ 480", tag: "Usado", emoji: "🚲" },
    { name: "Camiseta nova", price: "R$ 59", tag: "Novo", emoji: "👕" },
  ]
  return (
    <Split
      id="produtos"
      reverse
      bg="bg-[#F2EDE1]"
      kicker="Produtos"
      title={<>Venda o que você tem ou <YellowHighlight>o que você produz.</YellowHighlight></>}
      text={<>Na Freelandoo, você vende produtos novos, usados ou artesanais. Físicos ou digitais, tudo pode virar renda.</>}
      cta={{ label: "Vender produto", href: LINKS.cadastro }}
      visual={
        <div data-stagger className="grid grid-cols-2 gap-4">
          {products.map((p, i) => (
            <div key={p.name} data-card className="overflow-hidden rounded-2xl fl-card" style={{ transform: `rotate(${i % 2 ? 1 : -1}deg)` }}>
              <div className="flex aspect-square items-center justify-center bg-[#FAF7F0] text-5xl">{p.emoji}</div>
              <div className="p-3">
                <span className="rounded-full bg-[#F2B705]/20 px-2 py-0.5 text-[10px] font-bold uppercase text-[#9a7400]">{p.tag}</span>
                <div className="mt-1.5 text-sm font-bold text-[#14110B]">{p.name}</div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm font-black text-[#14110B]">{p.price}</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#14110B] text-[#FAF7F0]"><ShoppingCart className="h-3.5 w-3.5" /></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      }
    />
  )
}

/* ════════════════════════ 7 · LOJINHA ════════════════════════ */
export function LojinhaShowcase() {
  return (
    <Split
      id="lojinha"
      kicker="Lojinha"
      title={<>Monte sua lojinha <YellowHighlight>dentro da plataforma.</YellowHighlight></>}
      text={<>Cadastre produtos, organize sua vitrine e venda com mais facilidade. Acompanhe pedidos e faturamento em um só lugar.</>}
      cta={{ label: "Abrir minha loja", href: LINKS.cadastro }}
      visual={
        <MockShell>
          <div className="flex items-center justify-between border-b border-[#14110B]/8 pb-3">
            <div className="flex items-center gap-2 text-sm font-black text-[#14110B]"><LayoutDashboard className="h-4 w-4 text-[#E6A800]" /> Minha lojinha</div>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Aberta</span>
          </div>
          <div data-stagger className="mt-3 grid grid-cols-3 gap-3">
            {[
              { l: "Vendas no mês", v: "R$ 1.240", i: TrendingUp, c: "#10B981" },
              { l: "Pedidos", v: "18", i: Package, c: "#0EA5E9" },
              { l: "Produtos", v: "07", i: ShoppingCart, c: "#E6A800" },
            ].map((s) => {
              const Icon = s.i
              return (
                <div key={s.l} data-card className="rounded-xl bg-[#FAF7F0] p-3">
                  <Icon className="h-4 w-4" style={{ color: s.c }} />
                  <div className="mt-2 text-lg font-black text-[#14110B]">{s.v}</div>
                  <div className="text-[11px] text-[#6B6457]">{s.l}</div>
                </div>
              )
            })}
          </div>
          <div className="mt-3 space-y-2">
            {["Caneca artesanal · 3 vendidas", "Camiseta nova · 5 vendidas"].map((r) => (
              <div key={r} className="flex items-center justify-between rounded-xl border border-[#14110B]/8 px-3 py-2 text-sm">
                <span className="font-semibold text-[#14110B]">{r}</span>
                <ArrowUpRight className="h-4 w-4 text-[#6B6457]" />
              </div>
            ))}
          </div>
        </MockShell>
      }
    />
  )
}

/* ════════════════════════ 8 · BUSCA ════════════════════════ */
export function SearchShowcase() {
  const chips = ["Serviços", "Produtos", "Cursos", "Influenciadores"]
  const results = [
    { t: "Eletricista", s: "São Paulo · 4,9 ★", e: "⚡" },
    { t: "Curso de inglês", s: "Online · 230 alunos", e: "🗣️" },
    { t: "Bolo caseiro", s: "Guarulhos · R$ 60", e: "🎂" },
  ]
  return (
    <Split
      id="busca"
      reverse
      bg="bg-[#F2EDE1]"
      kicker="Busca"
      title={<>Encontre o que <YellowHighlight>você procura.</YellowHighlight></>}
      text={<>Busque por serviço, curso, produto ou influenciador, filtrando por cidade, categoria, nicho ou profissão.</>}
      cta={{ label: "Explorar agora", href: LINKS.explorar }}
      visual={
        <MockShell>
          <div className="flex items-center gap-2 rounded-2xl border border-[#14110B]/12 bg-[#FAF7F0] px-3 py-2.5">
            <SearchIcon className="h-4 w-4 text-[#6B6457]" />
            <span className="flex-1 text-sm font-semibold text-[#14110B]">marceneiro em Santo André</span>
            <SlidersHorizontal className="h-4 w-4 text-[#6B6457]" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map((c, i) => (
              <span key={c} className={`rounded-full px-3 py-1 text-xs font-bold ${i === 0 ? "bg-[#F2B705] text-[#1A1505]" : "bg-white text-[#6B6457] border border-[#14110B]/10"}`}>{c}</span>
            ))}
          </div>
          <div data-stagger className="mt-3 space-y-2">
            {results.map((r) => (
              <div key={r.t} data-card className="flex items-center gap-3 rounded-xl border border-[#14110B]/8 bg-white px-3 py-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FAF7F0] text-lg">{r.e}</span>
                <div className="flex-1">
                  <div className="text-sm font-bold text-[#14110B]">{r.t}</div>
                  <div className="text-xs text-[#6B6457]">{r.s}</div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-[#6B6457]" />
              </div>
            ))}
          </div>
        </MockShell>
      }
    />
  )
}

/* ════════════════════════ 9 · CHAMADOS ════════════════════════ */
export function RequestShowcase() {
  const examples = [
    "Preciso de um marceneiro em Santo André.",
    "Procuro influenciador de gastronomia.",
    "Quero curso de inglês básico.",
    "Preciso de produto artesanal personalizado.",
  ]
  return (
    <Section id="chamados">
      <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
        <div data-reveal>
          <Badge tone="gold" className="mb-4">Chamados</Badge>
          <h2 className="fl-display text-4xl font-black text-[#14110B] sm:text-5xl">
            Não achou? <YellowHighlight>Abra um chamado.</YellowHighlight>
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-[#2A2418]/75">
            Na Freelandoo, se não encontrar, você abre um chamado. Você publica o que precisa, e as pessoas certas recebem a oportunidade na sua cidade, região ou no Brasil inteiro.
          </p>
          <div className="mt-7"><GoldButton href={LINKS.cadastro}>Abrir um chamado</GoldButton></div>
        </div>
        <div data-stagger className="relative space-y-3">
          <DoodleArrow dir="down-right" className="absolute -left-6 -top-8 h-10 w-20 text-[#E6A800]" />
          {examples.map((ex, i) => (
            <TornPaperCard key={ex} data-card variant="soft" rotate={i % 2 ? 0.8 : -0.8} className="flex items-start gap-3 p-4">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F2B705]/25 text-[#9a7400]">
                <Megaphone className="h-4 w-4" />
              </span>
              <p className="text-base font-semibold text-[#14110B]">{ex}</p>
            </TornPaperCard>
          ))}
        </div>
      </div>
    </Section>
  )
}

/* ════════════════════════ 10 · OPORTUNIDADES ════════════════════════ */
export function OpportunityShowcase() {
  const notifs = [
    { t: "Novo chamado compatível", s: "Marcenaria · Santo André", c: "#F2B705" },
    { t: "Cliente perto de você", s: "Reforma · 2,3 km", c: "#10B981" },
    { t: "Pedido na sua categoria", s: "Aula de violão · online", c: "#0EA5E9" },
  ]
  return (
    <Split
      id="oportunidades"
      reverse
      bg="bg-[#F2EDE1]"
      kicker="Oportunidades"
      title={<>Oportunidades <YellowHighlight>chegam até você.</YellowHighlight></>}
      text={<>Profissionais, vendedores, criadores e influenciadores recebem notificações quando existe um chamado compatível com o que oferecem.</>}
      cta={{ label: "Receber oportunidades", href: LINKS.cadastro }}
      visual={
        <div data-stagger className="space-y-3">
          {notifs.map((n, i) => (
            <div key={n.t} data-card className="flex items-center gap-3 rounded-2xl fl-card px-4 py-3" style={{ transform: `rotate(${i % 2 ? 0.8 : -0.8}deg)` }}>
              <span className="relative flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${n.c}22`, color: n.c }}>
                <Bell className="h-5 w-5" />
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white" style={{ background: n.c }} />
              </span>
              <div className="flex-1">
                <div className="text-sm font-bold text-[#14110B]">{n.t}</div>
                <div className="flex items-center gap-1 text-xs text-[#6B6457]"><MapPin className="h-3 w-3" /> {n.s}</div>
              </div>
              <span className="text-[10px] font-bold uppercase text-[#6B6457]">agora</span>
            </div>
          ))}
        </div>
      }
    />
  )
}

/* ════════════════════════ 11 · AFILIADOS ════════════════════════ */
export function AffiliateCouponCard() {
  return (
    <Split
      id="afiliados"
      kicker="Afiliados"
      title={<>Indique e <YellowHighlight>ganhe dinheiro.</YellowHighlight></>}
      text={<>Use seu cupom ou link para divulgar a Freelandoo, serviços, cursos e produtos. Acompanhe indicações, conversões, comissões e saques no painel do afiliado.</>}
      cta={{ label: "Virar afiliado", href: LINKS.afiliados }}
      visual={
        <MockShell>
          <div className="flex items-center gap-2 text-sm font-black text-[#14110B]"><Ticket className="h-4 w-4 text-[#E6A800]" /> Painel do afiliado</div>
          <div className="mt-4 space-y-3">
            <div>
              <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[#6B6457]">Seu cupom</div>
              <CouponCopy value="ALEX10" label="cupom ALEX10" className="w-full justify-between" />
            </div>
            <div>
              <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[#6B6457]">Seu link</div>
              <CouponCopy value="freelandoo.com.br/?cupom=ALEX10" label="link de afiliado" className="w-full justify-between" />
            </div>
          </div>
          <div data-stagger className="mt-4 grid grid-cols-3 gap-3">
            {[
              { l: "Indicações", v: "42", i: TrendingUp, c: "#0EA5E9" },
              { l: "Comissão", v: "R$ 318", i: Wallet, c: "#10B981" },
              { l: "A sacar", v: "R$ 120", i: ArrowUpRight, c: "#E6A800" },
            ].map((s) => {
              const Icon = s.i
              return (
                <div key={s.l} data-card className="rounded-xl bg-[#FAF7F0] p-3">
                  <Icon className="h-4 w-4" style={{ color: s.c }} />
                  <div className="mt-2 text-base font-black text-[#14110B]">{s.v}</div>
                  <div className="text-[11px] text-[#6B6457]">{s.l}</div>
                </div>
              )
            })}
          </div>
        </MockShell>
      }
    />
  )
}
