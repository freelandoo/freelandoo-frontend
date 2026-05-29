/**
 * showcases-b (seções 12-20) — Vídeos, Posts, Stories, Trabalho+Lifestyle,
 * Influenciadores, Influenciadores locais, Mais que rede social,
 * Controle parental e CTA final.
 *
 * Server components puros. Texto principal HTML real. Entrada via
 * data-reveal/data-stagger (RevealMount).
 */
import type { ReactNode } from "react"
import {
  Play, Heart, MessageCircle, Bookmark, Share2, CalendarCheck,
  Tag, Rocket, Users, BarChart3, MapPin, ShieldCheck, KeyRound, Lock,
  Eye, X, Check, Search as SearchIcon, ArrowRight,
} from "lucide-react"
import { LINKS } from "./tokens"
import {
  Section, GoldButton, GhostButton, Badge, YellowHighlight, DoodleArrow,
  TornPaperCard, HiveDoodle, HoneycombField,
} from "./primitives"

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

/* Card vertical 9:16 reutilizável (vídeo/story) */
function VerticalCard({ children, tint, rotate = 0 }: { children: ReactNode; tint: string; rotate?: number }) {
  return (
    <div
      className="relative aspect-[9/16] overflow-hidden rounded-2xl fl-card"
      style={{ background: tint, transform: rotate ? `rotate(${rotate}deg)` : undefined }}
    >
      {children}
    </div>
  )
}

/* ════════════════════════ 12 · VÍDEOS CURTOS ════════════════════════ */
export function VideoShowcase() {
  return (
    <Split
      id="videos"
      kicker="Vídeos curtos"
      title={<>Grave vídeos para <YellowHighlight>promover seu trabalho.</YellowHighlight></>}
      text={<>Mostre seu serviço, curso, produto, rotina, bastidores ou resultado com vídeos curtos dentro da plataforma.</>}
      cta={{ label: "Gravar um vídeo", href: LINKS.feed }}
      visual={
        <div data-stagger className="flex justify-center gap-4">
          {[
            { e: "🔨", l: "Antes e depois", t: "linear-gradient(160deg,#0EA5E9,#0369a1)", r: -3 },
            { e: "🎂", l: "Apresentação", t: "linear-gradient(160deg,#EC4899,#9d174d)", r: 2 },
            { e: "✂️", l: "Resultado", t: "linear-gradient(160deg,#10B981,#065f46)", r: -2 },
          ].map((v, i) => (
            <div key={v.l} data-card className={i === 1 ? "mt-0" : "mt-8"} style={{ width: "30%", minWidth: 96 }}>
              <VerticalCard tint={v.t} rotate={v.r}>
                <div className="absolute inset-0 flex items-center justify-center text-4xl">{v.e}</div>
                <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-lg">
                  <Play className="h-5 w-5 translate-x-0.5 fill-[#14110B] text-[#14110B]" />
                </span>
                <span className="absolute bottom-2 left-2 right-2 truncate text-[11px] font-bold text-white drop-shadow">{v.l}</span>
              </VerticalCard>
            </div>
          ))}
        </div>
      }
    />
  )
}

/* ════════════════════════ 13 · POSTS ════════════════════════ */
export function PostsShowcase() {
  return (
    <Split
      id="posts"
      reverse
      bg="bg-[#F2EDE1]"
      kicker="Posts"
      title={<>Crie posts para <YellowHighlight>vender mais.</YellowHighlight></>}
      text={<>Use posts para mostrar portfólio, novidades, promoções, resultados e bastidores do seu trabalho.</>}
      cta={{ label: "Criar um post", href: LINKS.feed }}
      visual={
        <div className="mx-auto max-w-sm rounded-3xl fl-card p-4">
          <div className="flex items-center gap-2.5">
            <span className="h-9 w-9 rounded-full bg-[#F2B705]/30 text-center text-lg leading-9">🎨</span>
            <div className="flex-1">
              <div className="text-sm font-black text-[#14110B]">Studio Bea · Design</div>
              <div className="text-xs text-[#6B6457]">São Paulo, SP</div>
            </div>
            <Badge tone="paper">Portfólio</Badge>
          </div>
          <div className="mt-3 flex aspect-[4/5] items-center justify-center rounded-2xl bg-gradient-to-br from-[#F2B705]/30 to-[#EC4899]/20 text-6xl">🖼️</div>
          <div className="mt-3 flex items-center gap-5 text-[#14110B]">
            <span className="flex items-center gap-1.5 text-sm font-bold"><Heart className="h-5 w-5 fill-[#EC4899] text-[#EC4899]" /> 248</span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-[#6B6457]"><MessageCircle className="h-5 w-5" /> 31</span>
            <Share2 className="h-5 w-5 text-[#6B6457]" />
            <Bookmark className="ml-auto h-5 w-5 fill-[#14110B] text-[#14110B]" />
          </div>
          <p className="mt-2 text-sm text-[#2A2418]"><span className="font-bold">Studio Bea</span> Nova identidade pronta. Promoção de logo essa semana 🎉</p>
        </div>
      }
    />
  )
}

/* ════════════════════════ 14 · STORIES ════════════════════════ */
export function StoriesShowcase() {
  const items = [
    { e: "📅", l: "Agenda aberta", t: "linear-gradient(160deg,#F2B705,#b45309)", icon: CalendarCheck, r: -3 },
    { e: "🏷️", l: "Promoção", t: "linear-gradient(160deg,#EC4899,#9d174d)", icon: Tag, r: 2 },
    { e: "🚀", l: "Lançamento", t: "linear-gradient(160deg,#10B981,#065f46)", icon: Rocket, r: -2 },
  ]
  return (
    <Split
      id="stories"
      kicker="Stories"
      title={<>Stories também <YellowHighlight>vendem.</YellowHighlight></>}
      text={<>Divulgue agenda aberta, promoções, lançamentos, bastidores, produtos e novos serviços que aparecem por 24 horas.</>}
      cta={{ label: "Postar um story", href: LINKS.feed }}
      visual={
        <div data-stagger className="flex justify-center gap-3">
          {items.map((s, i) => {
            const Icon = s.icon
            return (
              <div key={s.l} data-card className={i === 1 ? "" : "mt-6"} style={{ width: "30%", minWidth: 92 }}>
                <div className="rounded-2xl p-[3px]" style={{ background: "linear-gradient(135deg,#F2B705,#E6A800)" }}>
                  <VerticalCard tint={s.t} rotate={s.r}>
                    <div className="absolute inset-0 flex items-center justify-center text-4xl">{s.e}</div>
                    <span className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90"><Icon className="h-4 w-4 text-[#14110B]" /></span>
                    <span className="absolute bottom-2 left-2 right-2 text-[11px] font-bold text-white drop-shadow">{s.l}</span>
                  </VerticalCard>
                </div>
              </div>
            )
          })}
        </div>
      }
    />
  )
}

/* ════════════════════════ 15 · TRABALHO + LIFESTYLE ════════════════════════ */
export function WorkLifestyleShowcase() {
  const cards = [
    { e: "🛠️", l: "Serviço entregue", k: "Trabalho" },
    { e: "☕", l: "Bastidores do dia", k: "Lifestyle" },
    { e: "📦", l: "Produto novo", k: "Loja" },
    { e: "🎓", l: "Aula publicada", k: "Curso" },
  ]
  return (
    <Section id="lifestyle" className="bg-[#F2EDE1]">
      <div className="mx-auto mb-12 max-w-2xl text-center" data-reveal>
        <Badge tone="gold" className="mb-4">Trabalho + lifestyle</Badge>
        <h2 className="fl-display text-4xl font-black text-[#14110B] sm:text-5xl">
          Venda e <YellowHighlight>construa presença.</YellowHighlight>
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-[#2A2418]/75">
          A Freelandoo mistura trabalho e lifestyle para aproximar pessoas, negócios e oportunidades.
        </p>
      </div>
      <div data-stagger className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((c, i) => (
          <TornPaperCard key={c.l} data-card variant="soft" rotate={i % 2 ? 1.5 : -1.5} className="flex flex-col items-center gap-2 p-5 text-center">
            <span className="text-4xl">{c.e}</span>
            <span className="rounded-full bg-[#F2B705]/25 px-2 py-0.5 text-[10px] font-bold uppercase text-[#9a7400]">{c.k}</span>
            <span className="text-sm font-bold text-[#14110B]">{c.l}</span>
          </TornPaperCard>
        ))}
      </div>
    </Section>
  )
}

/* ════════════════════════ 16 · INFLUENCIADORES (marketplace) ════════════════════════ */
export function InfluencerMarketplaceShowcase() {
  return (
    <Split
      id="influenciadores"
      kicker="Influenciadores"
      title={<>Influenciador também é <YellowHighlight>freelancer.</YellowHighlight></>}
      text={<>Na Freelandoo, influenciador também é freelancer. Pequenas empresas encontram criadores por nicho, cidade, público e tipo de conteúdo.</>}
      cta={{ label: "Ver creators", href: LINKS.influenciadores, ghost: { label: "Virar creator", href: LINKS.cadastro } }}
      visual={
        <div className="mx-auto max-w-sm rounded-3xl fl-card p-5">
          <div className="flex items-center gap-3">
            <span className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#EC4899] to-[#F2B705] text-center text-2xl leading-[3.5rem]">💄</span>
            <div className="flex-1">
              <div className="text-base font-black text-[#14110B]">@bia.makes</div>
              <div className="text-xs text-[#6B6457]">Beleza · São Paulo, SP</div>
            </div>
            <Badge tone="gold">Media kit</Badge>
          </div>
          <div data-stagger className="mt-4 grid grid-cols-3 gap-3">
            {[
              { l: "Seguidores", v: "48k", i: Users },
              { l: "Engajamento", v: "7,2%", i: BarChart3 },
              { l: "Nicho", v: "Beleza", i: Tag },
            ].map((s) => {
              const Icon = s.i
              return (
                <div key={s.l} data-card className="rounded-xl bg-[#FAF7F0] p-3 text-center">
                  <Icon className="mx-auto h-4 w-4 text-[#E6A800]" />
                  <div className="mt-1.5 text-base font-black text-[#14110B]">{s.v}</div>
                  <div className="text-[10px] text-[#6B6457]">{s.l}</div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-[#14110B]/8 px-3 py-2.5">
            <span className="text-sm font-semibold text-[#14110B]">Publi no story</span>
            <span className="text-sm font-black text-[#14110B]">a partir de R$ 250</span>
          </div>
        </div>
      }
    />
  )
}

/* ════════════════════════ 17 · INFLUENCIADORES LOCAIS ════════════════════════ */
export function InfluencerLocalShowcase() {
  const niches = ["Gastronomia", "Beleza", "Fitness", "Turismo", "Comércio local"]
  const creators = [
    { h: "@chef.local", n: "Gastronomia · Santo André", e: "🍝" },
    { h: "@fit.ana", n: "Fitness · São Paulo", e: "🏋️" },
    { h: "@rolezinho", n: "Turismo · Guarulhos", e: "📍" },
  ]
  return (
    <Split
      id="influenciadores-locais"
      reverse
      bg="bg-[#F2EDE1]"
      kicker="Influenciadores locais"
      title={<>Encontre influenciadores <YellowHighlight>locais.</YellowHighlight></>}
      text={<>Procure creators de gastronomia, beleza, fitness, turismo, comércio local e muito mais, filtrando por nicho e cidade.</>}
      cta={{ label: "Buscar creators", href: LINKS.influenciadores }}
      visual={
        <div className="rounded-3xl fl-card p-5">
          <div className="flex items-center gap-2 rounded-2xl border border-[#14110B]/12 bg-[#FAF7F0] px-3 py-2.5">
            <SearchIcon className="h-4 w-4 text-[#6B6457]" />
            <span className="flex-1 text-sm font-semibold text-[#14110B]">creator de gastronomia</span>
            <MapPin className="h-4 w-4 text-[#E6A800]" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {niches.map((n, i) => (
              <span key={n} className={`rounded-full px-3 py-1 text-xs font-bold ${i === 0 ? "bg-[#F2B705] text-[#1A1505]" : "bg-white text-[#6B6457] border border-[#14110B]/10"}`}>{n}</span>
            ))}
          </div>
          <div data-stagger className="mt-3 space-y-2">
            {creators.map((c) => (
              <div key={c.h} data-card className="flex items-center gap-3 rounded-xl border border-[#14110B]/8 bg-white px-3 py-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FAF7F0] text-xl">{c.e}</span>
                <div className="flex-1">
                  <div className="text-sm font-bold text-[#14110B]">{c.h}</div>
                  <div className="text-xs text-[#6B6457]">{c.n}</div>
                </div>
                <span className="rounded-full bg-[#14110B] px-3 py-1.5 text-xs font-bold text-[#FAF7F0]">Ver perfil</span>
              </div>
            ))}
          </div>
        </div>
      }
    />
  )
}

/* ════════════════════════ 18 · MAIS QUE REDE SOCIAL ════════════════════════ */
export function MoreThanSocialShowcase() {
  const common = ["Curtir", "Comentar", "Compartilhar"]
  const fl = ["Vender", "Contratar", "Aprender", "Ensinar", "Divulgar"]
  return (
    <Section id="mais-que-rede">
      <div className="mx-auto mb-12 max-w-2xl text-center" data-reveal>
        <Badge tone="gold" className="mb-4">Mais que rede social</Badge>
        <h2 className="fl-display text-4xl font-black text-[#14110B] sm:text-5xl">Mais que rede social.</h2>
        <p className="mt-5 text-lg leading-relaxed text-[#2A2418]/75">
          Aqui você não só posta: você vende, encontra, contrata, aprende, ensina e divulga.
        </p>
      </div>
      <div className="grid items-stretch gap-6 md:grid-cols-2">
        <div data-reveal className="rounded-3xl border border-[#14110B]/10 bg-white/60 p-7">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B6457]">Rede comum</div>
          <ul className="mt-5 space-y-3">
            {common.map((c) => (
              <li key={c} className="flex items-center gap-3 text-lg font-semibold text-[#6B6457]">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#14110B]/8"><X className="h-4 w-4" /></span>
                {c}
              </li>
            ))}
          </ul>
        </div>
        <div data-reveal className="relative overflow-hidden rounded-3xl bg-[#14110B] p-7 text-[#FAF7F0]">
          <HiveDoodle className="absolute -right-6 -top-6 h-32 w-32 text-[#F2B705]/15" />
          <div className="relative text-xs font-bold uppercase tracking-[0.16em] text-[#F2B705]">Na Freelandoo</div>
          <ul className="relative mt-5 space-y-3">
            {fl.map((c) => (
              <li key={c} className="flex items-center gap-3 text-lg font-black">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F2B705] text-[#1A1505]"><Check className="h-4 w-4" /></span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  )
}

/* ════════════════════════ 19 · CONTROLE PARENTAL ════════════════════════ */
export function ParentalControlShowcase() {
  return (
    <Split
      id="controle-parental"
      bg="bg-[#F2EDE1]"
      kicker="Controle parental"
      title={<>Segurança também <YellowHighlight>importa.</YellowHighlight></>}
      text={<>Na Freelandoo, menor só entra com autorização do responsável, que pode controlar acesso, mensagens e conteúdo.</>}
      cta={{ label: "Como funciona", href: LINKS.comoFunciona }}
      visual={
        <div className="rounded-3xl fl-card p-5">
          <div className="flex items-center gap-2 text-sm font-black text-[#14110B]"><ShieldCheck className="h-5 w-5 text-emerald-500" /> Conta supervisionada</div>
          <div className="mt-4 rounded-2xl bg-[#FAF7F0] p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-[#6B6457]">Código de autorização</div>
            <div className="mt-1.5 flex gap-2">
              {["F", "L", "2", "9", "X", "4"].map((d, i) => (
                <span key={i} className="flex h-10 w-9 items-center justify-center rounded-lg border border-[#14110B]/12 bg-white font-mono text-lg font-black text-[#14110B]">{d}</span>
              ))}
            </div>
          </div>
          <div data-stagger className="mt-3 space-y-2">
            {[
              { i: Lock, l: "Controle de mensagens", s: "Responsável aprova contatos" },
              { i: Eye, l: "Acesso supervisionado", s: "Conversas em modo leitura" },
              { i: KeyRound, l: "Conteúdo filtrado", s: "Feed e busca adaptados" },
            ].map((r) => {
              const Icon = r.i
              return (
                <div key={r.l} data-card className="flex items-center gap-3 rounded-xl border border-[#14110B]/8 bg-white px-3 py-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><Icon className="h-4 w-4" /></span>
                  <div>
                    <div className="text-sm font-bold text-[#14110B]">{r.l}</div>
                    <div className="text-xs text-[#6B6457]">{r.s}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      }
    />
  )
}

/* ════════════════════════ 20 · CTA FINAL ════════════════════════ */
export function FinalCTA() {
  return (
    <section className="relative overflow-hidden px-5 py-24 sm:px-8 md:py-32">
      <div className="mx-auto max-w-[1000px]">
        <div className="relative overflow-hidden rounded-[36px] bg-[#14110B] px-7 py-16 text-center text-[#FAF7F0] sm:px-14">
          <HoneycombField opacity={0.07} className="text-[#F2B705]" />
          <HiveDoodle className="absolute -left-8 -bottom-8 h-40 w-40 text-[#F2B705]/15" />
          <DoodleArrow dir="down" className="absolute right-10 top-8 hidden h-12 w-20 text-[#F2B705]/50 sm:block" />
          <div className="relative" data-reveal>
            <h2 className="fl-display mx-auto max-w-3xl text-4xl font-black sm:text-5xl md:text-6xl">
              Serviços, cursos, produtos, afiliados, influenciadores e oportunidades.{" "}
              <span className="text-[#F2B705]">Tudo em um só lugar.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[#FAF7F0]/75">
              A Freelandoo transforma habilidade, conhecimento, produtos, influência e indicação em renda.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <GoldButton href={LINKS.cadastro} className="group px-8 py-4 text-base">
                Entre na Freelandoo e comece agora
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </GoldButton>
              <GhostButton href={LINKS.explorar} className="border-[#FAF7F0]/25 bg-transparent text-[#FAF7F0] hover:border-[#FAF7F0]/50 hover:bg-white/5">
                Explorar oportunidades
              </GhostButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
