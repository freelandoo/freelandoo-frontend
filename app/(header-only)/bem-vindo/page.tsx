"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Home, Hexagon, Boxes, MessageCircle, Trophy, User, Wallet, GraduationCap,
  ShoppingBag, Users, ClipboardList, LayoutGrid, MessageSquare, Target,
  ArrowLeft, ArrowRight, type LucideIcon,
} from "lucide-react"
import { AuthShell } from "@/components/tabloide"
import { SiteTextsProvider } from "@/components/site-texts/SiteTextsProvider"
import { SiteAssetsProvider } from "@/components/site-assets/SiteAssetsProvider"
import { EditableText } from "@/components/site-texts/EditableText"
import { EditableImageCarousel } from "@/components/site-assets/EditableImageCarousel"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken, getStoredUser, setStoredUser } from "@/lib/auth"

// Cada item = um botão/recurso explicado. slot = chave do texto (admin-editável
// via site-texts + fallback i18n no ns "Tour"). icon = ícone fixo (não editável).
type Item = { icon: LucideIcon; slot: string; fallback: string }
type Step = {
  id: string
  bannerSlot: string
  titleSlot: string
  titleFallback: string
  items: Item[]
}

const STEPS: Step[] = [
  {
    id: "toolbar",
    bannerSlot: "tour_toolbar_banner",
    titleSlot: "tour_toolbar_title",
    titleFallback: "A barra de ferramentas",
    items: [
      { icon: Home, slot: "tour_toolbar_feed", fallback: "Feed — o que rola na sua rede: posts e bees de quem você segue." },
      { icon: Hexagon, slot: "tour_toolbar_bees", fallback: "Bees — vídeos curtos em tela cheia, no embalo dos reels." },
      { icon: Boxes, slot: "tour_toolbar_enxames", fallback: "Enxames — a vitrine: busque profissionais, produtos e cursos por região." },
      { icon: MessageCircle, slot: "tour_toolbar_mensagens", fallback: "Mensagens — suas conversas e pedidos (O.S.) num lugar só." },
      { icon: Trophy, slot: "tour_toolbar_ranking", fallback: "Ranking — sua posição na temporada; suba postando e engajando." },
      { icon: User, slot: "tour_toolbar_conta", fallback: "Conta — sua foto abre o menu: perfis, carteira e configurações." },
    ],
  },
  {
    id: "messages",
    bannerSlot: "tour_messages_banner",
    titleSlot: "tour_messages_title",
    titleFallback: "Mensagens",
    items: [
      { icon: MessageCircle, slot: "tour_messages_list", fallback: "Lista de conversas — toque para abrir e responder." },
      { icon: LayoutGrid, slot: "tour_messages_tabs", fallback: "Abas e filtros separam conversas diretas dos pedidos." },
      { icon: Trophy, slot: "tour_messages_unread", fallback: "As bolinhas mostram o que está sem ler em cada conversa." },
    ],
  },
  {
    id: "chats",
    bannerSlot: "tour_chats_banner",
    titleSlot: "tour_chats_title",
    titleFallback: "Chats e Ordens de Serviço (O.S.)",
    items: [
      { icon: ClipboardList, slot: "tour_chats_os", fallback: "Cada pedido de serviço vira uma O.S. com seu próprio chat." },
      { icon: Users, slot: "tour_chats_groups", fallback: "Chats em grupo de comunidades também ficam aqui." },
      { icon: MessageSquare, slot: "tour_chats_status", fallback: "Acompanhe o andamento do pedido direto na conversa." },
    ],
  },
  {
    id: "account",
    bannerSlot: "tour_account_banner",
    titleSlot: "tour_account_title",
    titleFallback: "Sua conta",
    items: [
      { icon: LayoutGrid, slot: "tour_account_tabs", fallback: "Abas do seu hub: Portfólio, Bees, Cursos, Salvos e Perfis." },
      { icon: User, slot: "tour_account_profiles", fallback: "Crie e alterne entre subperfis profissionais." },
      { icon: MessageCircle, slot: "tour_account_menu", fallback: "O menu lateral dá acesso rápido a tudo da conta." },
    ],
  },
  {
    id: "wallet",
    bannerSlot: "tour_wallet_banner",
    titleSlot: "tour_wallet_title",
    titleFallback: "Carteira",
    items: [
      { icon: Wallet, slot: "tour_wallet_extrato", fallback: "Seus ganhos reais por subperfil, com gráfico por período." },
      { icon: Trophy, slot: "tour_wallet_market", fallback: "Um resumo do mercado (ações e cripto) para acompanhar." },
      { icon: ArrowRight, slot: "tour_wallet_payouts", fallback: "Acompanhe saldos e repasses dos seus recebimentos." },
    ],
  },
  {
    id: "shop",
    bannerSlot: "tour_shop_banner",
    titleSlot: "tour_shop_title",
    titleFallback: "Cursos e Produtos",
    items: [
      { icon: GraduationCap, slot: "tour_shop_courses", fallback: "Crie e venda cursos com módulos, aulas e quizzes." },
      { icon: ShoppingBag, slot: "tour_shop_products", fallback: "Venda produtos físicos com frete e etiqueta automáticos." },
      { icon: LayoutGrid, slot: "tour_shop_manage", fallback: "Gerencie vendas, alunos e estoque pela sua conta." },
    ],
  },
  {
    id: "community",
    bannerSlot: "tour_community_banner",
    titleSlot: "tour_community_title",
    titleFallback: "Comunidades",
    items: [
      { icon: Users, slot: "tour_community_feed", fallback: "Um feed coletivo onde os membros postam juntos." },
      { icon: Trophy, slot: "tour_community_ranking", fallback: "Ranking interno e benchmark entre comunidades." },
      { icon: Target, slot: "tour_community_goal", fallback: "Metas e temporadas mobilizam o grupo." },
      { icon: MessageSquare, slot: "tour_community_recados", fallback: "Recados rápidos e o mural do líder." },
    ],
  },
]

function TourInner() {
  const router = useRouter()
  const t = useTranslations("Tour")
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  const [next, setNext] = useState("/search")

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("next")
    if (raw && raw.startsWith("/") && !raw.startsWith("//")) setNext(raw)
  }, [])

  const total = STEPS.length
  const current = STEPS[step]
  const isLast = step === total - 1

  const finish = async () => {
    if (done) return
    setDone(true)
    try {
      const token = getToken()
      await fetch("/api/users/me/onboarding/complete", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
    } catch {
      /* não-fatal: segue mesmo se a marcação falhar */
    }
    const u = getStoredUser()
    if (u) setStoredUser({ ...u, onboarding_tour_done: true })
    router.replace(next)
  }

  const goNext = () => (isLast ? finish() : setStep((s) => s + 1))
  const goBack = () => setStep((s) => Math.max(0, s - 1))

  return (
    <AuthShell
      eyebrow={t("eyebrow", "Bem-vindo à Freelandoo")}
      asideTitle={t("headlinePrefix", "Um tour")}
      asideHighlight={t("headlineHighlight", "rápido")}
    >
      <div className="fl-sharp relative z-10 mx-auto w-full max-w-xl">
        {/* Progresso */}
        <div className="mb-5 flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <span
              key={s.id}
              className={`h-2 transition-all ${i <= step ? "w-8 bg-[#F2B705]" : "w-2 bg-[#F5F1E8]/20"}`}
            />
          ))}
          <span className="ml-3 text-sm text-[#9A938A]">
            {t("uiStep", "Passo {step} de {total}")
              .replace("{step}", String(step + 1))
              .replace("{total}", String(total))}
          </span>
        </div>

        <div className="fl-card p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.85)] sm:p-8">
          {/* Banner(s) editável(is) pelo admin — carrossel de até 5 imagens por
              passo (admin adiciona via "+"; placeholder enquanto vazio). */}
          <EditableImageCarousel
            baseSlot={current.bannerSlot}
            slotConfig={{ aspectRatio: 16 / 6, outputWidth: 1280, outputHeight: 480, label: "Banner do tour" }}
            className="relative aspect-[16/6] w-full border-2 border-[#0B0B0D]/12"
            sizes="(min-width: 640px) 576px, 100vw"
            max={5}
          />

          <EditableText
            ns="Tour"
            as="h2"
            alwaysOn
            slot={current.titleSlot}
            fallback={current.titleFallback}
            className="fl-display mt-5 text-2xl text-[var(--fl-ink)]"
          />

          <ul className="mt-4 space-y-3">
            {current.items.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.slot} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center bg-[#0B0B0D] text-[#F2B705]">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <EditableText
                    ns="Tour"
                    as="p"
                    alwaysOn
                    slot={item.slot}
                    fallback={item.fallback}
                    className="text-sm leading-relaxed text-[#3a352d]"
                  />
                </li>
              )
            })}
          </ul>

          {/* Navegação */}
          <div className="mt-7 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-[#5b554b] transition hover:text-[#0B0B0D] disabled:invisible"
            >
              <ArrowLeft className="h-4 w-4" /> {t("uiBack", "Voltar")}
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={finish}
                disabled={done}
                className="text-sm font-semibold text-[#5b554b] underline-offset-2 transition hover:text-[#0B0B0D] hover:underline disabled:opacity-50"
              >
                {t("uiSkip", "Pular tour")}
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={done}
                className="fl-btn-gold inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold disabled:opacity-60"
              >
                {isLast ? t("uiFinish", "Começar a usar") : t("uiNext", "Avançar")}
                {!isLast && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AuthShell>
  )
}

export default function BemVindoPage() {
  // Providers locais: habilitam a edição (texto + banner) pelo admin nesta página.
  return (
    <SiteTextsProvider>
      <SiteAssetsProvider>
        <TourInner />
      </SiteAssetsProvider>
    </SiteTextsProvider>
  )
}
