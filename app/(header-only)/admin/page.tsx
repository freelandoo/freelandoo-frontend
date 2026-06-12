"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Users, Receipt, Sparkles, Wallet, Trophy, HandCoins, ShieldAlert, Store, ShoppingBag, Newspaper, Boxes, Activity, Search, ChevronRight, type LucideIcon } from "lucide-react"
import { HoverHint } from "@/features/tour/HoverHint"
import type { HintId } from "@/features/tour/hints"

type AdminCard = {
  hint?: HintId
  href: string
  icon: LucideIcon
  iconClass?: string
  title: string
  body: string
  badge?: string
}

// Seções na ordem de exibição. Agrupa as 22 entradas por domínio para o painel
// não ser um muro plano de cards.
const SECTIONS = [
  "Pessoas & Acesso",
  "Receita",
  "Repasses",
  "Configurações de monetização",
  "Catálogo & Vitrine",
  "Conteúdo & Comunidade",
  "Moderação",
  "Sistema & Dados",
] as const
type Section = (typeof SECTIONS)[number]

const ADMIN_CARDS: (AdminCard & { section: Section })[] = [
  // Pessoas & Acesso
  { section: "Pessoas & Acesso", hint: "admin-users", href: "/admin/usuarios", icon: Users, title: "Usuários / Perfis", body: "Usuários cadastrados, com seus sub-perfis, premium e total recebido." },

  // Receita — tudo que a plataforma embolsa (será consolidado no extrato Entradas)
  { section: "Receita", hint: "admin-entries", href: "/admin/entradas", icon: Receipt, title: "Entradas", body: "Extrato de receita: ativações, taxas de agendamento, comissão da Loja, Poléns, Premium e Manifestação." },

  // Repasses — dinheiro de terceiros que a plataforma segura no holdback e paga via PIX
  { section: "Repasses", hint: "admin-store-payouts", href: "/administracao/repasses", icon: HandCoins, title: "Repasses", body: "Saldos a pagar via PIX: Loja, Agendamentos e Afiliados num só extrato, com filtro por origem e status." },

  // Configurações de monetização — definem preço/taxa (não são extrato financeiro)
  { section: "Configurações de monetização", hint: "admin-anuidade", href: "/administracao/monetizacao", icon: Wallet, title: "Configurações de monetização", body: "Ativação, Agendamento, Poléns, Premium, Manifestação e Cupons — preços, taxas e descontos em abas." },

  // Catálogo & Vitrine
  { section: "Catálogo & Vitrine", hint: "admin-enxames", href: "/administracao/enxames", icon: Sparkles, title: "Controle de Enxames", body: "Ativar/desativar enxames, cores e profissões." },
  { section: "Catálogo & Vitrine", href: "/administracao/loja", icon: Store, title: "Loja", body: "Moderação da Loja, categorias e produtos proibidos." },
  { section: "Catálogo & Vitrine", href: "/administracao/casa-loja", icon: ShoppingBag, title: "Conveniência Views", body: "Loja única da Casa (espelhada em cada participante): produtos, galeria e pedidos. Os participantes são editados na própria página (/acasaviews)." },

  // Conteúdo & Comunidade
  { section: "Conteúdo & Comunidade", hint: "admin-ranking", href: "/admin/ranking", icon: Trophy, title: "Ranking", body: "Configurar pesos, período e visualizar posições por enxame, cidade e geral." },
  { section: "Conteúdo & Comunidade", href: "/blog", icon: Newspaper, title: "Blog", body: "CMS do blog: criar, editar e publicar guias e conteúdo." },

  // Moderação
  { section: "Moderação", hint: "admin-chat-mod", href: "/administracao/moderacao", icon: ShieldAlert, title: "Moderação", body: "Chat (fila/mute/ban), termos bloqueados e posts denunciados — tudo em abas." },

  // Sistema & Dados
  { section: "Sistema & Dados", href: "/administracao/pagamentos", icon: Activity, title: "Pagamentos", body: "Saúde do webhook Stripe: eventos com falha (reprocessar), pagamentos pendentes presos por fluxo e reconciliação manual.", badge: "novo" },
  { section: "Sistema & Dados", href: "/administracao/arquitetura", icon: Boxes, title: "Arquitetura", body: "Mapa vivo das funções do app: órfãos, status de git e logs de rota.", badge: "novo" },
]

interface UserData {
  id_user: string
  nome: string
  email: string
  is_admin?: boolean
  roles?: { id_role: string; desc_role: string }[]
}

export default function AdminPage() {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    fetch("/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Não autorizado")
        return res.json()
      })
      .then((data) => {
        const isAdmin = data.is_admin || data.roles?.some((r: { desc_role: string }) => r.desc_role === "Administrator")
        if (!isAdmin) {
          router.push("/")
          return
        }
        setUser(data)
      })
      .catch(() => router.push("/"))
      .finally(() => setLoading(false))
  }, [router])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ADMIN_CARDS
    return ADMIN_CARDS.filter(
      (c) => c.title.toLowerCase().includes(q) || c.body.toLowerCase().includes(q) || c.section.toLowerCase().includes(q)
    )
  }, [query])

  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex h-[calc(100vh-64px)] items-center justify-center">
          <p className="fl-display text-2xl text-muted-foreground">Carregando…</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* halftone decorativo no canto */}
      <div className="fl-dots pointer-events-none absolute right-0 top-24 h-40 w-40 opacity-[0.08]" />

      <main className="container relative mx-auto max-w-6xl px-4 py-8">
        {/* ===== Masthead estilo jornal ===== */}
        <header className="mb-8">
          <div className="flex items-end justify-between gap-4 border-b-4 border-foreground/80 pb-2">
            <div>
              <p className="fl-marker text-base text-primary">edição interna · {today}</p>
              <h1 className="fl-display text-5xl leading-[0.85] text-foreground md:text-7xl">Administração</h1>
            </div>
            <p className="hidden text-right text-[10px] font-bold uppercase leading-tight tracking-[0.25em] text-muted-foreground md:block">
              Freelandoo<br />Painel<br />de controle
            </p>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            <span>Gerencie toda a plataforma</span>
            <span>{ADMIN_CARDS.length} seções · {SECTIONS.length} áreas</span>
          </div>
        </header>

        {/* ===== Busca ===== */}
        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar seção do admin…"
            className="w-full border-2 border-foreground/20 bg-card py-2.5 pl-10 pr-3 text-sm text-foreground shadow-[3px_3px_0_0_rgba(0,0,0,0.4)] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        {/* ===== Seções ===== */}
        {filtered.length === 0 ? (
          <div className="border-2 border-dashed border-foreground/20 py-20 text-center">
            <p className="fl-display text-2xl text-muted-foreground">Nada encontrado</p>
            <p className="mt-1 text-sm text-muted-foreground">Tente outro termo.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {SECTIONS.map((section) => {
              const cards = filtered.filter((c) => c.section === section)
              if (!cards.length) return null
              return (
                <section key={section}>
                  {/* etiqueta-adesivo rotacionada */}
                  <div className="mb-4 flex items-center gap-3">
                    <span className="fl-display inline-block -rotate-1 bg-primary px-3 py-1 text-lg text-[#1a1505] shadow-[3px_3px_0_0_rgba(0,0,0,0.45)]">
                      {section}
                    </span>
                    <span className="h-[2px] flex-1 bg-foreground/15" />
                    <span className="text-xs font-bold tabular-nums text-muted-foreground">{cards.length}</span>
                  </div>

                  <ul className="space-y-3">
                    {cards.map((card) => {
                      const Icon = card.icon
                      const row = (
                        <button
                          type="button"
                          onClick={() => router.push(card.href)}
                          className="group flex w-full items-center gap-3 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-3 text-left shadow-[4px_4px_0_0_#0B0B0D] transition-transform duration-200 hover:-translate-y-0.5 hover:-rotate-[0.3deg] hover:shadow-[7px_7px_0_0_#F2B705]"
                        >
                          {/* caixa do ícone rotacionada (igual avatar das conversas) */}
                          <div
                            className="relative shrink-0 rotate-[-2deg] overflow-hidden border-2 border-[#0B0B0D]"
                            style={{ outline: "2px solid #F2B705", outlineOffset: "1px" }}
                          >
                            <div className="flex h-11 w-11 items-center justify-center bg-[#0E0B06]">
                              <Icon className={`h-5 w-5 ${card.iconClass ?? "text-[#F2B705]"}`} />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="fl-display inline-flex items-center gap-1.5 truncate text-lg leading-none text-[#F1EDE2]">
                                {card.title}
                              </span>
                              {card.badge && (
                                <span className="shrink-0 border-2 border-[#0B0B0D] bg-[#F2B705] px-1.5 text-[10px] font-black uppercase tracking-wide text-[#0B0B0D]">
                                  {card.badge}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 truncate text-xs font-semibold text-[#F1EDE2]/55">{card.body}</p>
                          </div>
                          <ChevronRight className="h-5 w-5 shrink-0 text-[#F1EDE2]/30 transition-colors group-hover:text-[#F1EDE2]" />
                        </button>
                      )
                      return card.hint ? (
                        <li key={card.href}>
                          <HoverHint id={card.hint} side="top" className="block w-full">
                            {row}
                          </HoverHint>
                        </li>
                      ) : (
                        <li key={card.href}>{row}</li>
                      )
                    })}
                  </ul>
                </section>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
