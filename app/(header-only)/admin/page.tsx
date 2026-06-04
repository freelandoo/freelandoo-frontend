"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Shield, Users, Receipt, BarChart2, Package, Sparkles, Ticket, Wallet, Trophy, Calendar, HandCoins, Hexagon, Crown, ShieldAlert, Store, ShieldX, ShoppingBag, Newspaper, Flag, Boxes, type LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { HoverHint } from "@/features/tour/HoverHint"
import type { HintId } from "@/features/tour/hints"

type AdminCard = {
  hint?: HintId
  href: string
  icon: LucideIcon
  iconClass?: string
  title: string
  body: string
}

const ADMIN_CARDS: AdminCard[] = [
  { hint: "admin-users", href: "/admin/usuarios", icon: Users, title: "Usuários / Perfis", body: "Usuários cadastrados, com seus sub-perfis, premium e total recebido." },
  { hint: "admin-entries", href: "/admin/entradas", icon: Receipt, title: "Entradas", body: "Histórico de ativações pagas e taxas de agendamento recebidas." },
  { hint: "admin-stats", href: "/admin/stats", icon: BarChart2, title: "Estatísticas", body: "Visualizar métricas e dados da plataforma." },
  { hint: "admin-items", href: "/admin/itens", icon: Package, title: "Itens", body: "Gerenciar itens e preços da plataforma." },
  { hint: "admin-enxames", href: "/administracao/enxames", icon: Sparkles, title: "Controle de Enxames", body: "Ativar/desativar enxames, cores e profissões." },
  { hint: "admin-coupons", href: "/administracao/cupons", icon: Ticket, title: "Cupons", body: "Desconto geral, comissão geral e regras específicas por cupom." },
  { hint: "admin-anuidade", href: "/administracao/anuidade", icon: Wallet, title: "Ativação do perfil", body: "Configurar valor e status da ativação única cobrada via Stripe." },
  { hint: "admin-booking-fees", href: "/administracao/taxas-agendamento", icon: Calendar, title: "Agendamento", body: "Configurar a taxa da maquininha (%) e a taxa de serviço fixa exibidas no modal de cadastro de serviço." },
  { hint: "admin-affiliates", href: "/admin/afiliados", icon: HandCoins, title: "Afiliados", body: "Comissões acumuladas, alertas de prazo e confirmação de pagamento." },
  { hint: "admin-ranking", href: "/admin/ranking", icon: Trophy, title: "Ranking", body: "Configurar pesos, período e visualizar posições por enxame, cidade e geral." },
  { hint: "admin-polens", href: "/admin/polens", icon: Hexagon, iconClass: "fill-amber-300 text-amber-300", title: "Poléns", body: "Configurar moeda interna, rewarded ads, preços e métricas." },
  { hint: "admin-manifestation", href: "/administracao/manifestacao", icon: Sparkles, title: "Manifestação", body: "Cadastro de banners, tags, preços e dashboard de uso." },
  { hint: "admin-premium", href: "/admin/premium", icon: Crown, iconClass: "fill-amber-300 text-amber-400", title: "Premium", body: "Destaque por perfil — preço, dias e vagas por cidade." },
  { hint: "admin-chat-mod", href: "/administracao/chat-moderation", icon: ShieldAlert, title: "Moderação do Chat", body: "Fila de revisão, mensagens denunciadas, mute e ban de usuários do chat público." },
  { hint: "admin-blocked-terms", href: "/administracao/blocked-terms", icon: ShieldX, title: "Termos bloqueados", body: "Lista própria de palavras/expressões proibidas no chat (categoria, severity, action)." },
  { hint: "admin-store-payouts", href: "/administracao/loja-payouts", icon: Store, title: "Loja — Payouts", body: "Saldo dos vendedores da Loja após holdback (PIX manual)." },
  { href: "/administracao/casa-loja", icon: ShoppingBag, title: "Conveniência Views", body: "Loja única da Casa (espelhada em cada participante): produtos, galeria e pedidos. Os participantes são editados na própria página (/acasaviews)." },
  { href: "/administracao/loja", icon: Store, title: "Loja", body: "Moderação da Loja, categorias e produtos proibidos." },
  { href: "/administracao/booking-payouts", icon: Calendar, title: "Agendamentos — Payouts", body: "Saldo de agendamentos liberado após holdback (PIX manual)." },
  { href: "/administracao/posts", icon: Flag, title: "Posts denunciados", body: "Fila de posts (portfólio/bees) denunciados pelos usuários." },
  { href: "/blog", icon: Newspaper, title: "Blog", body: "CMS do blog: criar, editar e publicar guias e conteúdo." },
  { href: "/administracao/arquitetura", icon: Boxes, title: "Arquitetura", body: "Mapa vivo das funções do app: órfãos, status de git e logs de rota." },
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Administração</h1>
            <p className="text-sm text-muted-foreground">Gerencie a plataforma</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ADMIN_CARDS.map((card) => {
            const Icon = card.icon
            const inner = (
              <Card
                className="hover:shadow-md transition-shadow cursor-pointer w-full"
                onClick={() => router.push(card.href)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${card.iconClass ?? "text-primary"}`} />
                    {card.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{card.body}</p>
                </CardContent>
              </Card>
            )
            return card.hint ? (
              <HoverHint key={card.hint} id={card.hint} side="top" className="block w-full">
                {inner}
              </HoverHint>
            ) : (
              <div key={card.href} className="block w-full">{inner}</div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
