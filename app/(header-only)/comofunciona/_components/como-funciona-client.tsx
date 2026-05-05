"use client"

import { useEffect, useLayoutEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import Link from "next/link"
import {
  Search, Megaphone, Users, Zap, Star, TrendingUp, Award,
  Briefcase, Camera, Calendar, MessageCircle, Share2,
  Gift, BarChart2, DollarSign, Eye, Heart, Clock, MapPin,
  ArrowRight, ChevronDown,
} from "lucide-react"

// ─── Types & Data ─────────────────────────────────────────────────────────────

type MachineCard = {
  id: string
  name: string
  description: string
  examples: string[]
  colors: { from: string; to: string; glow: string; accent: string }
}

const MACHINES: MachineCard[] = [
  {
    id: "views",
    name: "Máquina de Views",
    description: "Crescimento de conteúdo, edição, thumbnails, roteiros e performance digital.",
    examples: ["Editor de vídeo", "Thumbmaker", "Roteirista", "Estrategista de conteúdo"],
    colors: { from: "#6d28d9", to: "#2563eb", glow: "rgba(139,92,246,0.5)", accent: "#a78bfa" },
  },
  {
    id: "divulgacao",
    name: "Máquina de Divulgação",
    description: "Alcance para marcas, negócios e campanhas por meio de criadores e influencers.",
    examples: ["Influenciador", "Creator UGC", "Microinfluenciador", "Afiliado"],
    colors: { from: "#e11d48", to: "#db2777", glow: "rgba(244,63,94,0.5)", accent: "#fb7185" },
  },
  {
    id: "limpeza",
    name: "Máquina de Limpeza",
    description: "Limpeza, organização, faxina, pós-obra e apoio residencial e comercial.",
    examples: ["Diarista", "Faxineira", "Auxiliar de limpeza", "Organização residencial"],
    colors: { from: "#059669", to: "#10b981", glow: "rgba(16,185,129,0.5)", accent: "#34d399" },
  },
  {
    id: "construcao",
    name: "Máquina de Construção",
    description: "Reformas, obras, manutenção, instalações e acabamentos.",
    examples: ["Pedreiro", "Pintor", "Eletricista", "Encanador"],
    colors: { from: "#ea580c", to: "#f59e0b", glow: "rgba(249,115,22,0.5)", accent: "#fb923c" },
  },
  {
    id: "negocios",
    name: "Máquina de Negócios",
    description: "Marketing, design, vendas, atendimento e operação para empresas.",
    examples: ["Social media", "Designer", "Gestor de tráfego", "Copywriter"],
    colors: { from: "#0ea5e9", to: "#06b6d4", glow: "rgba(14,165,233,0.5)", accent: "#38bdf8" },
  },
  {
    id: "oportunidades",
    name: "Máquina de Oportunidades",
    description: "Profissionais generalistas, prestadores locais e divulgadores prontos para novas demandas.",
    examples: ["Freelancer geral", "Assistente geral", "Promotor", "Captador de leads"],
    colors: { from: "#e6b800", to: "#f59e0b", glow: "rgba(230,184,0,0.5)", accent: "#fbbf24" },
  },
  {
    id: "saude_beleza",
    name: "Máquina de Saúde e Beleza",
    description: "Cuidados pessoais, estética, bem-estar, beleza e serviços corporais.",
    examples: ["Massagista", "Esteticista", "Manicure", "Barbeiro"],
    colors: { from: "#d946ef", to: "#ec4899", glow: "rgba(217,70,239,0.5)", accent: "#e879f9" },
  },
  {
    id: "saude_pet",
    name: "Máquina de Saúde do Pet",
    description: "Cuidados, higiene, bem-estar, rotina e serviços para animais.",
    examples: ["Tosador", "Dog walker", "Pet sitter", "Adestrador"],
    colors: { from: "#0d9488", to: "#14b8a6", glow: "rgba(20,184,166,0.5)", accent: "#2dd4bf" },
  },
]

// ─── GSAP hook ────────────────────────────────────────────────────────────────

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect

// ─── Section wrapper ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block mb-4 px-3 py-1 text-xs font-bold tracking-widest uppercase rounded-full"
      style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}>
      {children}
    </span>
  )
}

function SectionTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl text-white ${className}`}>
      {children}
    </h2>
  )
}

function SectionSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 text-lg leading-relaxed max-w-2xl" style={{ color: "#9ca3af" }}>
      {children}
    </p>
  )
}

// ─── Animated Cards ───────────────────────────────────────────────────────────

function GlowCard({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-2xl p-6 transition-all duration-300 cursor-default group ${className}`}
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        ...style,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(251,191,36,0.3)"
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 30px rgba(251,191,36,0.08)"
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(255,255,255,0.08)"
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = "none"
      }}
    >
      {children}
    </div>
  )
}

function NumberBadge({ n }: { n: number }) {
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mb-4"
      style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }}>
      {n}
    </div>
  )
}

function IconBadge({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
      style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}>
      <Icon size={18} />
    </div>
  )
}

// ─── CTA Button ───────────────────────────────────────────────────────────────

function CTAButton({ href, children, primary = false }: { href: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200"
      style={
        primary
          ? { background: "#fbbf24", color: "#0a0a0a", boxShadow: "0 0 20px rgba(251,191,36,0.3)" }
          : { background: "transparent", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.4)" }
      }
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement
        if (primary) {
          el.style.boxShadow = "0 0 36px rgba(251,191,36,0.55)"
          el.style.transform = "translateY(-1px)"
        } else {
          el.style.background = "rgba(251,191,36,0.1)"
          el.style.transform = "translateY(-1px)"
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement
        el.style.boxShadow = primary ? "0 0 20px rgba(251,191,36,0.3)" : "none"
        el.style.background = primary ? "#fbbf24" : "transparent"
        el.style.transform = "translateY(0)"
      }}
    >
      {children}
      <ArrowRight size={15} />
    </Link>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ComoFuncionaClient() {
  const heroRef = useRef<HTMLDivElement>(null)
  const heroTitleRef = useRef<HTMLHeadingElement>(null)
  const heroSubRef = useRef<HTMLParagraphElement>(null)
  const heroBodyRef = useRef<HTMLParagraphElement>(null)
  const heroCtasRef = useRef<HTMLDivElement>(null)
  const heroMicroRef = useRef<HTMLParagraphElement>(null)
  const scrollHintRef = useRef<HTMLDivElement>(null)

  // Section refs for ScrollTrigger
  const section2Ref = useRef<HTMLElement>(null)
  const section3Ref = useRef<HTMLElement>(null)
  const section4Ref = useRef<HTMLElement>(null)
  const section5Ref = useRef<HTMLElement>(null)
  const section6Ref = useRef<HTMLElement>(null)
  const section7Ref = useRef<HTMLElement>(null)
  const section8Ref = useRef<HTMLElement>(null)
  const section9Ref = useRef<HTMLElement>(null)
  const section10Ref = useRef<HTMLElement>(null)
  const section11Ref = useRef<HTMLElement>(null)

  useIsomorphicLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const ctx = gsap.context(() => {
      // ── Hero intro ──
      const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } })
      heroTl
        .from(heroTitleRef.current, { y: 60, opacity: 0, duration: 1 })
        .from(heroSubRef.current, { y: 40, opacity: 0, duration: 0.8 }, "-=0.5")
        .from(heroBodyRef.current, { y: 30, opacity: 0, duration: 0.7 }, "-=0.4")
        .from(heroCtasRef.current, { y: 20, opacity: 0, duration: 0.6 }, "-=0.3")
        .from(heroMicroRef.current, { opacity: 0, duration: 0.5 }, "-=0.2")
        .from(scrollHintRef.current, { opacity: 0, y: -10, duration: 0.5 }, "-=0.1")

      // Floating scroll hint
      gsap.to(scrollHintRef.current, {
        y: 8,
        repeat: -1,
        yoyo: true,
        duration: 1.2,
        ease: "sine.inOut",
      })

      // ── Generic section reveal factory ──
      function revealSection(sectionEl: HTMLElement | null, delay = 0) {
        if (!sectionEl) return
        const header = sectionEl.querySelector(".section-header")
        const cards = sectionEl.querySelectorAll(".reveal-card")
        const items = sectionEl.querySelectorAll(".reveal-item")

        if (header) {
          gsap.from(header, {
            scrollTrigger: { trigger: header, start: "top 85%", toggleActions: "play none none none" },
            y: 40, opacity: 0, duration: 0.8, delay, ease: "power3.out",
          })
        }
        if (cards.length) {
          gsap.from(cards, {
            scrollTrigger: { trigger: cards[0], start: "top 90%", toggleActions: "play none none none" },
            y: 50, opacity: 0, duration: 0.6, stagger: 0.1, delay: delay + 0.15, ease: "power3.out",
          })
        }
        if (items.length) {
          gsap.from(items, {
            scrollTrigger: { trigger: items[0], start: "top 88%", toggleActions: "play none none none" },
            x: -30, opacity: 0, duration: 0.5, stagger: 0.08, delay: delay + 0.1, ease: "power2.out",
          })
        }
      }

      revealSection(section2Ref.current)
      revealSection(section3Ref.current)
      revealSection(section4Ref.current)
      revealSection(section5Ref.current)
      revealSection(section6Ref.current)
      revealSection(section7Ref.current)
      revealSection(section8Ref.current)
      revealSection(section9Ref.current)
      revealSection(section10Ref.current)
      revealSection(section11Ref.current)

      // Machine cards pop in with their own glow color
      const machineCards = document.querySelectorAll(".machine-card")
      if (machineCards.length) {
        gsap.from(machineCards, {
          scrollTrigger: { trigger: machineCards[0], start: "top 88%", toggleActions: "play none none none" },
          y: 60, opacity: 0, scale: 0.95,
          duration: 0.55, stagger: 0.07, ease: "back.out(1.4)",
        })
      }

      // Flow steps count-in
      const flowSteps = document.querySelectorAll(".flow-step")
      if (flowSteps.length) {
        gsap.from(flowSteps, {
          scrollTrigger: { trigger: flowSteps[0], start: "top 88%", toggleActions: "play none none none" },
          y: 30, opacity: 0, duration: 0.45, stagger: 0.09, ease: "power2.out",
        })
      }
    })

    return () => ctx.revert()
  }, [])

  // ─── Base styles ───────────────────────────────────────────────────────────
  const pageBg = { background: "#0a0a0a" }
  const sectionStyle = { borderTop: "1px solid rgba(255,255,255,0.06)" }
  const dimText = { color: "#9ca3af" }
  const yellow = "#fbbf24"

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={pageBg} className="min-h-screen overflow-x-hidden">

      {/* ════════════════════════════════════════════════════════════
          SEÇÃO 1 — HERO
      ════════════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative min-h-[68vh] flex flex-col items-center justify-center text-center px-4 pb-14 pt-16 overflow-hidden"
      >
        {/* Background grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "linear-gradient(rgba(251,191,36,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.04) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
        {/* Glow blob */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none" style={{
          background: "radial-gradient(ellipse, rgba(251,191,36,0.07) 0%, transparent 70%)",
        }} />

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full text-xs font-semibold tracking-widest uppercase"
            style={{ background: "rgba(251,191,36,0.1)", color: yellow, border: "1px solid rgba(251,191,36,0.2)" }}>
            <Zap size={12} />
            Como funciona
          </div>

          <h1
            ref={heroTitleRef}
            className="text-5xl font-black tracking-tight leading-none md:text-7xl lg:text-8xl text-white"
            style={{ textShadow: "0 0 80px rgba(251,191,36,0.15)" }}
          >
            Como funciona a{" "}
            <span style={{ color: yellow }}>Freelandoo</span>
          </h1>

          <p
            ref={heroSubRef}
            className="mt-6 text-xl leading-relaxed md:text-2xl"
            style={dimText}
          >
            Uma plataforma criada para conectar quem precisa resolver algo com
            profissionais prontos para aparecer, atender e crescer.
          </p>

          <p
            ref={heroBodyRef}
            className="mt-4 text-base max-w-2xl mx-auto leading-relaxed"
            style={{ color: "#6b7280" }}
          >
            Na Freelandoo, você não perde tempo navegando por categorias confusas. Você
            escolhe uma máquina, encontra profissionais reais, analisa perfis, vê
            portfólios e fala direto pelo WhatsApp.
          </p>

          <div ref={heroCtasRef} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <CTAButton href="/search" primary>Encontrar profissionais</CTAButton>
            <CTAButton href="/cadastro">Anunciar meus serviços</CTAButton>
          </div>

          <p ref={heroMicroRef} className="mt-5 text-sm" style={{ color: "#4b5563" }}>
            Sem burocracia. Sem intermediação. Contato direto.
          </p>
        </div>

        <div ref={scrollHintRef} className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-xs tracking-widest uppercase" style={{ color: "#4b5563" }}>scroll</span>
          <ChevronDown size={16} style={{ color: "#4b5563" }} />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          SEÇÃO 2 — O QUE É A FREELANDOO
      ════════════════════════════════════════════════════════════ */}
      <section ref={section2Ref} className="px-4 py-14 md:py-20" style={sectionStyle}>
        <div className="max-w-6xl mx-auto">
          <div className="section-header text-center mb-10">
            <SectionLabel>O ecossistema</SectionLabel>
            <SectionTitle>Uma vitrine inteligente para{" "}
              <span style={{ color: yellow }}>serviços, talentos e oportunidades</span>
            </SectionTitle>
            <div className="flex justify-center">
              <SectionSubtitle>
                A Freelandoo conecta clientes, empresas, criadores e prestadores de serviço de
                forma simples, direta e organizada. O contato, os combinados e as entregas
                acontecem diretamente entre as partes — sem intermediação da plataforma.
              </SectionSubtitle>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Users, title: "Profissionais aparecem", text: "Freelancers e prestadores criam perfis públicos para divulgar seus serviços." },
              { icon: Search, title: "Clientes encontram", text: "Quem precisa contratar pode buscar por localização, máquina e profissão." },
              { icon: MessageCircle, title: "Contato é direto", text: "A conversa acontece pelo WhatsApp, sem etapas desnecessárias." },
              { icon: Zap, title: "A plataforma organiza", text: "Máquinas, filtros, portfólios e métricas ajudam a tornar a busca mais inteligente." },
            ].map((card) => (
              <GlowCard key={card.title} className="reveal-card">
                <IconBadge icon={card.icon} />
                <h3 className="font-bold text-white mb-2">{card.title}</h3>
                <p className="text-sm leading-relaxed" style={dimText}>{card.text}</p>
              </GlowCard>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          SEÇÃO 3 — PARA QUEM PROCURA
      ════════════════════════════════════════════════════════════ */}
      <section ref={section3Ref} className="px-4 py-14 md:py-20" style={sectionStyle}>
        <div className="max-w-6xl mx-auto">
          <div className="section-header mb-10">
            <SectionLabel>Para quem contrata</SectionLabel>
            <SectionTitle>
              Encontre profissionais sem{" "}
              <span style={{ color: yellow }}>enrolação</span>
            </SectionTitle>
            <SectionSubtitle>
              Explore as máquinas, escolha a área da sua necessidade, filtre por estado,
              cidade e profissão, analise perfis e fale diretamente pelo WhatsApp.
            </SectionSubtitle>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
            {[
              { n: 1, title: "Escolha uma máquina", text: "Comece pelo tipo de solução que você procura: views, divulgação, limpeza, construção, negócios, saúde, beleza, pets ou oportunidades." },
              { n: 2, title: "Refine sua busca", text: "Use filtros por estado, cidade, máquina e profissão para encontrar profissionais mais próximos e compatíveis." },
              { n: 3, title: "Veja o perfil", text: "Analise descrição, portfólio, serviços, avaliações e informações públicas do profissional." },
              { n: 4, title: "Fale pelo WhatsApp", text: "Entre em contato direto, combine detalhes e avance sem intermediação da plataforma." },
            ].map((step) => (
              <GlowCard key={step.n} className="reveal-card">
                <NumberBadge n={step.n} />
                <h3 className="font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm leading-relaxed" style={dimText}>{step.text}</p>
              </GlowCard>
            ))}
          </div>

          <CTAButton href="/search" primary>Encontrar profissionais</CTAButton>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          SEÇÃO 4 — PARA QUEM ANUNCIA
      ════════════════════════════════════════════════════════════ */}
      <section ref={section4Ref} className="px-4 py-14 md:py-20" style={{ ...sectionStyle, background: "rgba(251,191,36,0.02)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="section-header mb-10">
            <SectionLabel>Para quem anuncia</SectionLabel>
            <SectionTitle>
              Crie seu perfil e{" "}
              <span style={{ color: yellow }}>transforme presença em oportunidade</span>
            </SectionTitle>
            <SectionSubtitle>
              Com a assinatura anual, o profissional mantém seu perfil ativo na plataforma,
              cadastra serviços, mostra portfólio, aparece nas buscas e recebe contatos diretos.
            </SectionSubtitle>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {[
              { n: 1, title: "Crie seu perfil", text: "Cadastre suas informações, localização, máquina principal e profissão." },
              { n: 2, title: "Ative sua assinatura", text: "Com a anuidade ativa, seu perfil pode aparecer na vitrine pública da Freelandoo." },
              { n: 3, title: "Mostre seu trabalho", text: "Use o portfólio para apresentar imagens, vídeos, projetos e provas do que você faz." },
              { n: 4, title: "Receba contatos", text: "Clientes interessados podem chamar você diretamente pelo WhatsApp." },
            ].map((step) => (
              <GlowCard key={step.n} className="reveal-card">
                <NumberBadge n={step.n} />
                <h3 className="font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm leading-relaxed" style={dimText}>{step.text}</p>
              </GlowCard>
            ))}
          </div>

          <div className="mb-10 p-4 rounded-xl text-sm max-w-2xl" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)", color: "#d1d5db" }}>
            <strong style={{ color: yellow }}>Importante:</strong> A assinatura aumenta sua exposição dentro da plataforma,
            mas não garante contratação. A negociação acontece diretamente entre cliente e profissional.
          </div>

          <CTAButton href="/cadastro" primary>Anunciar meus serviços</CTAButton>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          SEÇÃO 5 — MÁQUINAS
      ════════════════════════════════════════════════════════════ */}
      <section ref={section5Ref} className="px-4 py-14 md:py-20" style={sectionStyle}>
        <div className="max-w-6xl mx-auto">
          <div className="section-header text-center mb-10">
            <SectionLabel>As máquinas</SectionLabel>
            <SectionTitle className="text-center">
              Máquinas que organizam{" "}
              <span style={{ color: yellow }}>oportunidades</span>
            </SectionTitle>
            <div className="flex justify-center">
              <SectionSubtitle>
                Em vez de uma lista confusa de categorias, a Freelandoo organiza profissionais
                por intenção. Cada máquina tem profissões próprias, filtros e identidade visual.
              </SectionSubtitle>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {MACHINES.map((m) => (
              <div
                key={m.id}
                className="machine-card rounded-2xl p-6 cursor-default transition-all duration-300"
                style={{
                  background: `linear-gradient(135deg, ${m.colors.from}14, ${m.colors.to}0a)`,
                  border: `1px solid ${m.colors.from}30`,
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.boxShadow = `0 0 40px ${m.colors.glow}`
                  el.style.border = `1px solid ${m.colors.accent}60`
                  el.style.transform = "translateY(-4px) scale(1.01)"
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.boxShadow = "none"
                  el.style.border = `1px solid ${m.colors.from}30`
                  el.style.transform = "translateY(0) scale(1)"
                }}
              >
                <div className="w-8 h-8 rounded-lg mb-4 flex items-center justify-center"
                  style={{ background: `${m.colors.accent}25` }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: m.colors.accent }} />
                </div>
                <h3 className="font-bold text-white text-sm mb-2">{m.name}</h3>
                <p className="text-xs leading-relaxed mb-4" style={{ color: "#9ca3af" }}>{m.description}</p>
                <div className="flex flex-wrap gap-1">
                  {m.examples.map((ex) => (
                    <span key={ex} className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: `${m.colors.accent}15`, color: m.colors.accent }}>
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          SEÇÃO 6 — PERFIS, PORTFÓLIO E SERVIÇOS
      ════════════════════════════════════════════════════════════ */}
      <section ref={section6Ref} className="px-4 py-14 md:py-20" style={{ ...sectionStyle, background: "rgba(255,255,255,0.01)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="section-header mb-10">
            <SectionLabel>Perfis completos</SectionLabel>
            <SectionTitle>
              Perfis que mostram mais do{" "}
              <span style={{ color: yellow }}>que um nome</span>
            </SectionTitle>
            <SectionSubtitle>
              Na Freelandoo, o perfil é o centro da presença profissional. Ele reúne
              informações públicas, serviços, portfólio, agenda e formas de contato —
              tudo que o cliente precisa para decidir com clareza.
            </SectionSubtitle>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {[
              { icon: Users, title: "Perfil público", text: "Nome, bio, profissão, localização, máquina e informações relevantes." },
              { icon: Camera, title: "Portfólio", text: "Trabalhos, imagens, vídeos, resultados e exemplos reais." },
              { icon: Briefcase, title: "Serviços", text: "Serviços com descrição, valor e duração cadastrados pelo profissional." },
              { icon: Calendar, title: "Agenda", text: "Organiza horários, disponibilidade e solicitações quando disponível." },
              { icon: MessageCircle, title: "WhatsApp", text: "Contato direto entre cliente e profissional com um clique." },
            ].map((item) => (
              <GlowCard key={item.title} className="reveal-card text-center">
                <div className="flex justify-center">
                  <IconBadge icon={item.icon} />
                </div>
                <h3 className="font-bold text-white text-sm mb-2">{item.title}</h3>
                <p className="text-xs leading-relaxed" style={dimText}>{item.text}</p>
              </GlowCard>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          SEÇÃO 7 — CLANS
      ════════════════════════════════════════════════════════════ */}
      <section ref={section7Ref} className="px-4 py-14 md:py-20" style={sectionStyle}>
        <div className="max-w-6xl mx-auto">
          <div className="section-header mb-10">
            <SectionLabel>Clans</SectionLabel>
            <SectionTitle>
              Profissionais conectados{" "}
              <span style={{ color: yellow }}>em grupo</span>
            </SectionTitle>
            <SectionSubtitle>
              Os clans permitem organizar grupos, coletivos, redes de profissionais ou
              criadores dentro da Freelandoo. Um clan pode reunir pessoas de diferentes
              áreas, mostrando a soma de competências disponíveis.
            </SectionSubtitle>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Users, title: "Reúna participantes", text: "Organize profissionais, criadores ou prestadores em um grupo." },
              { icon: Star, title: "Mostre competências", text: "Veja a distribuição das máquinas dentro do clan." },
              { icon: TrendingUp, title: "Fortaleça presença", text: "Um grupo bem estruturado pode transmitir mais confiança e ampliar oportunidades." },
              { icon: MessageCircle, title: "Direcione contatos", text: "Quando aplicável, o clan pode ter agenda, botão ou fluxo próprio de atendimento." },
            ].map((card) => (
              <GlowCard key={card.title} className="reveal-card">
                <IconBadge icon={card.icon} />
                <h3 className="font-bold text-white mb-2">{card.title}</h3>
                <p className="text-sm leading-relaxed" style={dimText}>{card.text}</p>
              </GlowCard>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          SEÇÃO 8 — AFILIADOS E CUPONS
      ════════════════════════════════════════════════════════════ */}
      <section ref={section8Ref} className="px-4 py-14 md:py-20" style={{ ...sectionStyle, background: "rgba(251,191,36,0.015)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="section-header mb-10">
            <SectionLabel>Cupons e afiliados</SectionLabel>
            <SectionTitle>
              Cresça junto e{" "}
              <span style={{ color: yellow }}>seja recompensado</span>
            </SectionTitle>
            <SectionSubtitle>
              O sistema de cupons permite compartilhar códigos de desconto. Quando alguém
              assina usando um cupom válido, o comprador pode receber desconto e o dono do
              cupom pode gerar comissão conforme as regras ativas da plataforma.
            </SectionSubtitle>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {[
              { icon: Gift, title: "Gere ou receba seu cupom", text: "O cupom pode ser vinculado a um usuário ou criado manualmente pela administração." },
              { icon: Share2, title: "Compartilhe", text: "Divulgue seu cupom para pessoas interessadas em ativar perfil na Freelandoo." },
              { icon: BarChart2, title: "Acompanhe conversões", text: "O painel de afiliado mostra histórico, conversões e valores." },
              { icon: DollarSign, title: "Receba comissão", text: "As comissões seguem as regras vigentes e podem ser aprovadas e pagas pela administração." },
            ].map((card) => (
              <GlowCard key={card.title} className="reveal-card">
                <IconBadge icon={card.icon} />
                <h3 className="font-bold text-white mb-2">{card.title}</h3>
                <p className="text-sm leading-relaxed" style={dimText}>{card.text}</p>
              </GlowCard>
            ))}
          </div>

          <p className="text-xs" style={{ color: "#6b7280" }}>
            * O programa de afiliados pode ser alterado, pausado ou ajustado conforme a necessidade da plataforma.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          SEÇÃO 9 — RANKING E ENGAJAMENTO
      ════════════════════════════════════════════════════════════ */}
      <section ref={section9Ref} className="px-4 py-14 md:py-20" style={sectionStyle}>
        <div className="max-w-6xl mx-auto">
          <div className="section-header mb-10">
            <SectionLabel>Ranking e engajamento</SectionLabel>
            <SectionTitle>
              Engajamento que{" "}
              <span style={{ color: yellow }}>fortalece sua presença</span>
            </SectionTitle>
            <SectionSubtitle>
              A Freelandoo mede sinais reais de engajamento para criar rankings e
              indicadores que valorizam profissionais ativos. O objetivo é organizar
              destaque, atividade e reputação dentro da plataforma.
            </SectionSubtitle>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-10">
            {[
              { icon: Eye, title: "Visitas ao perfil", text: "Indicam quantas pessoas visualizaram o profissional." },
              { icon: Heart, title: "Likes no portfólio", text: "Mostram interesse pelos trabalhos publicados." },
              { icon: Star, title: "Avaliações", text: "Ajudam a construir confiança com base em experiências reais." },
              { icon: Clock, title: "Tempo online", text: "Valoriza profissionais ativos e presentes na plataforma." },
            ].map((card) => (
              <GlowCard key={card.title} className="reveal-card">
                <IconBadge icon={card.icon} />
                <h3 className="font-bold text-white mb-2">{card.title}</h3>
                <p className="text-sm leading-relaxed" style={dimText}>{card.text}</p>
              </GlowCard>
            ))}
          </div>

          {/* Ranking types */}
          <div className="rounded-2xl p-6 md:p-8" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-3 mb-4">
              <Award size={18} style={{ color: yellow }} />
              <h3 className="font-bold text-white">Tipos de ranking</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: TrendingUp, label: "Ranking geral" },
                { icon: Zap, label: "Ranking por máquina" },
                { icon: MapPin, label: "Ranking por cidade" },
                { icon: Briefcase, label: "Ranking por profissão" },
              ].map((r) => (
                <div key={r.label} className="reveal-item flex items-center gap-2">
                  <r.icon size={14} style={{ color: yellow }} />
                  <span className="text-sm" style={dimText}>{r.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          SEÇÃO 10 — RESUMO DO FLUXO
      ════════════════════════════════════════════════════════════ */}
      <section ref={section10Ref} className="px-4 py-14 md:py-20" style={{ ...sectionStyle, background: "rgba(255,255,255,0.01)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="section-header text-center mb-10">
            <SectionLabel>Resumo</SectionLabel>
            <SectionTitle className="text-center">
              Do problema à solução{" "}
              <span style={{ color: yellow }}>em poucos passos</span>
            </SectionTitle>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Coluna 1 */}
            <div className="rounded-2xl p-8" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-3 mb-6">
                <Search size={20} style={{ color: yellow }} />
                <h3 className="font-bold text-white text-lg">Preciso contratar</h3>
              </div>
              <div className="space-y-4">
                {[
                  "Escolho uma máquina",
                  "Filtro por cidade e profissão",
                  "Vejo perfis e portfólios",
                  "Chamo no WhatsApp",
                  "Combino direto com o profissional",
                ].map((step, i) => (
                  <div key={step} className="flow-step flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: "rgba(251,191,36,0.15)", color: yellow }}>
                      {i + 1}
                    </div>
                    <span className="text-sm" style={dimText}>{step}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <CTAButton href="/search" primary>Encontrar profissionais</CTAButton>
              </div>
            </div>

            {/* Coluna 2 */}
            <div className="rounded-2xl p-8" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-3 mb-6">
                <Megaphone size={20} style={{ color: yellow }} />
                <h3 className="font-bold text-white text-lg">Quero aparecer</h3>
              </div>
              <div className="space-y-4">
                {[
                  "Crio meu perfil",
                  "Ativo minha assinatura",
                  "Cadastro serviços e portfólio",
                  "Apareço na vitrine",
                  "Recebo contatos diretos",
                ].map((step, i) => (
                  <div key={step} className="flow-step flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: "rgba(251,191,36,0.15)", color: yellow }}>
                      {i + 1}
                    </div>
                    <span className="text-sm" style={dimText}>{step}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <CTAButton href="/cadastro">Anunciar meus serviços</CTAButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          SEÇÃO 11 — CTA FINAL
      ════════════════════════════════════════════════════════════ */}
      <section ref={section11Ref} className="px-4 py-16 md:py-24 text-center relative overflow-hidden" style={sectionStyle}>
        {/* Glow */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[800px] h-[400px] rounded-full" style={{
            background: "radial-gradient(ellipse, rgba(251,191,36,0.06) 0%, transparent 70%)",
          }} />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto section-header">
          <SectionLabel>Pronto para começar?</SectionLabel>
          <SectionTitle className="text-center">
            Simples para quem contrata.{" "}
            <span style={{ color: yellow }}>Poderoso para quem anuncia.</span>
          </SectionTitle>
          <div className="flex justify-center">
            <SectionSubtitle>
              A Freelandoo organiza profissionais, máquinas e oportunidades para que a
              conexão aconteça com menos fricção e mais clareza.
            </SectionSubtitle>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <CTAButton href="/search" primary>Encontrar profissionais</CTAButton>
            <CTAButton href="/cadastro">Anunciar meus serviços</CTAButton>
          </div>

          <p className="mt-6 text-sm" style={{ color: "#4b5563" }}>
            Você escolhe o caminho. A Freelandoo organiza a conexão.
          </p>
        </div>
      </section>

    </div>
  )
}
