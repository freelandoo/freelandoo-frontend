"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Users, Receipt, Package, Sparkles, Ticket, Wallet, Trophy, Calendar, HandCoins, Hexagon, Crown, ShieldAlert, Store, ShieldX, ShoppingBag, Newspaper, Flag, Boxes, Search, type LucideIcon } from "lucide-react"
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
  "Financeiro & Monetização",
  "Catálogo & Vitrine",
  "Conteúdo & Comunidade",
  "Moderação",
  "Sistema & Dados",
] as const
type Section = (typeof SECTIONS)[number]

const ADMIN_CARDS: (AdminCard & { section: Section })[] = [
  // Pessoas & Acesso
  { section: "Pessoas & Acesso", hint: "admin-users", href: "/admin/usuarios", icon: Users, title: "Usuários / Perfis", body: "Usuários cadastrados, com seus sub-perfis, premium e total recebido." },

  // Financeiro & Monetização
  { section: "Financeiro & Monetização", hint: "admin-entries", href: "/admin/entradas", icon: Receipt, title: "Entradas", body: "Histórico de ativações pagas e taxas de agendamento recebidas." },
  { section: "Financeiro & Monetização", hint: "admin-anuidade", href: "/administracao/anuidade", icon: Wallet, title: "Ativação do perfil", body: "Configurar valor e status da ativação única cobrada via Stripe." },
  { section: "Financeiro & Monetização", hint: "admin-booking-fees", href: "/administracao/taxas-agendamento", icon: Calendar, title: "Agendamento", body: "Configurar a taxa da maquininha (%) e a taxa de serviço fixa exibidas no modal de cadastro de serviço." },
  { section: "Financeiro & Monetização", hint: "admin-affiliates", href: "/admin/afiliados", icon: HandCoins, title: "Afiliados", body: "Comissões acumuladas, alertas de prazo e confirmação de pagamento." },
  { section: "Financeiro & Monetização", hint: "admin-polens", href: "/admin/polens", icon: Hexagon, iconClass: "fill-amber-300 text-amber-300", title: "Poléns", body: "Configurar moeda interna, rewarded ads, preços e métricas." },
  { section: "Financeiro & Monetização", hint: "admin-premium", href: "/admin/premium", icon: Crown, iconClass: "fill-amber-300 text-amber-400", title: "Premium", body: "Destaque por perfil — preço, dias e vagas por cidade." },
  { section: "Financeiro & Monetização", hint: "admin-manifestation", href: "/administracao/manifestacao", icon: Sparkles, title: "Manifestação", body: "Cadastro de banners, tags, preços e dashboard de uso." },
  { section: "Financeiro & Monetização", hint: "admin-store-payouts", href: "/administracao/loja-payouts", icon: Store, title: "Loja — Payouts", body: "Saldo dos vendedores da Loja após holdback (PIX manual)." },
  { section: "Financeiro & Monetização", href: "/administracao/booking-payouts", icon: Calendar, title: "Agendamentos — Payouts", body: "Saldo de agendamentos liberado após holdback (PIX manual)." },

  // Catálogo & Vitrine
  { section: "Catálogo & Vitrine", hint: "admin-items", href: "/admin/itens", icon: Package, title: "Itens", body: "Gerenciar itens e preços da plataforma." },
  { section: "Catálogo & Vitrine", hint: "admin-enxames", href: "/administracao/enxames", icon: Sparkles, title: "Controle de Enxames", body: "Ativar/desativar enxames, cores e profissões." },
  { section: "Catálogo & Vitrine", hint: "admin-coupons", href: "/administracao/cupons", icon: Ticket, title: "Cupons", body: "Desconto geral, comissão geral e regras específicas por cupom." },
  { section: "Catálogo & Vitrine", href: "/administracao/loja", icon: Store, title: "Loja", body: "Moderação da Loja, categorias e produtos proibidos." },
  { section: "Catálogo & Vitrine", href: "/administracao/casa-loja", icon: ShoppingBag, title: "Conveniência Views", body: "Loja única da Casa (espelhada em cada participante): produtos, galeria e pedidos. Os participantes são editados na própria página (/acasaviews)." },

  // Conteúdo & Comunidade
  { section: "Conteúdo & Comunidade", hint: "admin-ranking", href: "/admin/ranking", icon: Trophy, title: "Ranking", body: "Configurar pesos, período e visualizar posições por enxame, cidade e geral." },
  { section: "Conteúdo & Comunidade", href: "/blog", icon: Newspaper, title: "Blog", body: "CMS do blog: criar, editar e publicar guias e conteúdo." },

  // Moderação
  { section: "Moderação", hint: "admin-chat-mod", href: "/administracao/chat-moderation", icon: ShieldAlert, title: "Moderação do Chat", body: "Fila de revisão, mensagens denunciadas, mute e ban de usuários do chat público." },
  { section: "Moderação", hint: "admin-blocked-terms", href: "/administracao/blocked-terms", icon: ShieldX, title: "Termos bloqueados", body: "Lista própria de palavras/expressões proibidas no chat (categoria, severity, action)." },
  { section: "Moderação", href: "/administracao/posts", icon: Flag, title: "Posts denunciados", body: "Fila de posts (portfólio/bees) denunciados pelos usuários." },
  { section: "Moderação", href: "/administracao/disputas", icon: ShieldAlert, title: "Disputas", body: "Proteção de pagamento: devoluções, reembolsos e casos escalados (Loja + Agendamentos)." },

  // Sistema & Dados
  { section: "Sistema & Dados", href: "/administracao/arquitetura", icon: Boxes, title: "Arquitetura", body: "Mapa vivo das funções do app: órfãos, status de git e logs de rota.", badge: "novo" },
  { section: "Sistema & Dados", href: "/administracao/protecao-teste", icon: Boxes, title: "Proteção — Teste", body: "Painel temporário: simula compra/recebimento e percorre todo o fluxo de disputa/devolução.", badge: "teste" },
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

  // índice global 01..N para o número em contorno de cada card
  const indexed = useMemo(
    () => ADMIN_CARDS.map((c, i) => ({ ...c, n: String(i + 1).padStart(2, "0") })),
    []
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return indexed
    return indexed.filter(
      (c) => c.title.toLowerCase().includes(q) || c.body.toLowerCase().includes(q) || c.section.toLowerCase().includes(q)
    )
  }, [query, indexed])

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

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {cards.map((card) => {
                      const Icon = card.icon
                      const inner = (
                        <div
                          onClick={() => router.push(card.href)}
                          className="group relative flex h-full cursor-pointer flex-col border-2 border-foreground/15 bg-card p-5 shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] transition-all duration-200 hover:-translate-x-[3px] hover:-translate-y-[3px] hover:border-primary hover:shadow-[8px_8px_0_0_#f2b705]"
                        >
                          {/* número em contorno */}
                          <span
                            className="fl-display pointer-events-none absolute right-3 top-1 text-5xl text-transparent"
                            style={{ WebkitTextStroke: "2px rgba(242,183,5,0.22)" }}
                          >
                            {card.n}
                          </span>
                          {/* selo "novo" */}
                          {card.badge && (
                            <span className="fl-marker absolute -left-2 -top-3 rotate-[-8deg] bg-primary px-2 py-0.5 text-sm font-bold text-[#1a1505] shadow-[2px_2px_0_0_rgba(0,0,0,0.4)]">
                              {card.badge}
                            </span>
                          )}

                          <Icon className={`mb-3 h-6 w-6 ${card.iconClass ?? "text-primary"}`} />
                          <h3 className="fl-display text-xl leading-none text-foreground">{card.title}</h3>
                          <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">{card.body}</p>
                          <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-primary opacity-0 transition-opacity group-hover:opacity-100">
                            Abrir →
                          </span>
                        </div>
                      )
                      return card.hint ? (
                        <HoverHint key={card.href} id={card.hint} side="top" className="block h-full w-full">
                          {inner}
                        </HoverHint>
                      ) : (
                        <div key={card.href} className="block h-full w-full">{inner}</div>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
