"use client"

// O MODAL DO PLANO NEGÓCIO (mig 234) — a explicação com "prints" e o botão de
// assinar. Pedido do Alex (2026-09-10): "um modal com prints explicando: crie
// seu negócio, faça um site para você e ainda tenha um atendente de IA para
// atender seu WhatsApp e suas mensagens da Freelandoo, por 50 reais mensais".
//
// ─── OS "PRINTS" SÃO DESENHADOS, NÃO FOTOGRAFADOS ───────────────────────────
//
// Cada uma das três telas (o negócio, o site, o atendente) é uma MINIATURA em
// CSS da tela de verdade — o headcard com a foto 2/3 e os pills, a janela do
// navegador com o site, a conversa com a resposta da IA. Um PNG do site de hoje
// envelheceria na primeira mudança de layout e pesaria em toda abertura; a
// miniatura acompanha o tema e custa zero de rede. Ela é decorativa
// (`aria-hidden`): o texto ao lado é o que se lê.
//
// ─── QUEM ABRE, E POR QUÊ ───────────────────────────────────────────────────
//
// Três portas: o aviãozinho trancado e o "Entrar" que não existe (membros), o
// "Publicar site" do construtor (compartilhar) e o botão "Plano Negócio" do
// trilho de edição. Todas montam ESTE componente: a explicação do plano
// escrita duas vezes é como uma delas passa a prometer outra coisa.
//
// O que ele NÃO sabe é de onde foi aberto — recebe `returnTo`, o caminho para
// onde o Stripe devolve a pessoa depois de pagar.

import { useEffect, useState } from "react"
import { Bot, Check, Crown, Globe, Loader2, Lock, MessageCircle, Send, Store, X } from "lucide-react"
import { toast } from "sonner"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { useBusinessPlan } from "./use-business-plan"

const GOLD = "#F2B705"
const GREEN = "#22C55E"

function money(cents: number, locale: string) {
  return (cents / 100).toLocaleString(locale, { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
}

/* ─── As três miniaturas ──────────────────────────────────────────────────── */

function PrintBusiness({ t }: { t: (k: string, f: string) => string }) {
  return (
    <div aria-hidden className="relative h-40 w-full overflow-hidden border-2 border-[#0B0B0D] bg-[#0b0804]">
      {/* barra do topo */}
      <div className="flex items-center justify-between px-2 pt-1.5 text-[7px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
        <span>‹ {t("mockBack", "Voltar")}</span>
        <span className="border border-[#0B0B0D] bg-[#F2B705] px-1.5 py-0.5 text-[#0B0B0D]">{t("mockEdit", "Editar")}</span>
      </div>
      {/* banner */}
      <div
        className="relative mx-2 mt-1.5 h-14 border-2 border-[#0B0B0D]"
        style={{ background: "linear-gradient(120deg,#1D1810 0%,#3a2a08 55%,#F2B705 140%)", boxShadow: `3px 3px 0 0 ${GOLD}` }}
      >
        <span className="absolute right-1.5 top-1.5 border border-[#0B0B0D] bg-[#0b0804] px-1 text-[6px] font-black uppercase text-[#F2B705]">
          {t("mockLevel", "Nível 0")}
        </span>
      </div>
      {/* foto 2/3 mordendo o banner + pills atrás */}
      <div className="relative mx-2 -mt-6 flex items-end gap-1.5">
        <div className="relative z-10 h-16 w-11 border-2 border-[#F2B705] bg-[linear-gradient(160deg,#6d5c3a,#2b2114)]" style={{ boxShadow: "3px 3px 0 0 #0B0B0D" }} />
        <div className="mb-1 flex flex-col gap-0.5">
          <span className="h-3 w-5 border border-[#0B0B0D] bg-[#1D4ED8]" />
          <span className="h-3 w-5 border border-[#0B0B0D] bg-[#C2410C]" />
          <span className="h-3 w-5 border border-[#0B0B0D] bg-[#7E22CE]" />
        </div>
        <div className="mb-1 ml-auto flex gap-1">
          <span className="grid h-6 w-6 place-items-center border border-[#0B0B0D] bg-[#15120E]"><Send className="h-3 w-3 text-[#F2B705]" /></span>
          <span className="grid h-6 w-6 place-items-center border border-[#0B0B0D] bg-[#F2B705] text-[10px] font-black text-[#0B0B0D]">+</span>
        </div>
      </div>
      <p className="fl-display mx-2 mt-1 text-[15px] leading-none text-[#F5F1E8]">{t("mockBizName", "Meu negócio")}</p>
      <div className="mx-2 mt-1 flex gap-3 text-[7px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
        <span className="border-b-2 border-[#F2B705] text-[#F5F1E8]">{t("mockFeed", "Feed")}</span>
        <span>{t("mockMembers", "Membros")}</span>
        <span>{t("mockSite", "Site")}</span>
      </div>
    </div>
  )
}

function PrintSite({ t }: { t: (k: string, f: string) => string }) {
  return (
    <div aria-hidden className="relative h-40 w-full overflow-hidden border-2 border-[#0B0B0D] bg-[#F1EDE2]">
      {/* chrome do navegador */}
      <div className="flex items-center gap-1.5 border-b-2 border-[#0B0B0D] bg-[#15120E] px-2 py-1">
        <span className="h-1.5 w-1.5 bg-[#ff5f57]" /><span className="h-1.5 w-1.5 bg-[#febc2e]" /><span className="h-1.5 w-1.5 bg-[#28c840]" />
        <span className="ml-1 flex-1 truncate border border-[#0B0B0D] bg-[#0b0804] px-1.5 py-0.5 text-[6px] font-bold text-[#9A938A]">
          <Globe className="mr-1 inline h-2 w-2 text-[#22C55E]" />{t("mockUrl", "meunegocio.freelandoo.com.br")}
        </span>
      </div>
      {/* site */}
      <div className="flex items-center justify-between px-2 py-1 text-[6px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D]">
        <span className="fl-display text-[9px]">{t("mockBizName", "Meu negócio")}</span>
        <span className="border border-[#0B0B0D] bg-[#0B0B0D] px-1.5 py-0.5 text-[#F2B705]">{t("mockBook", "Agendar")}</span>
      </div>
      <div className="mx-2 border-2 border-[#0B0B0D] bg-[#0B0B0D] px-2 py-2">
        <p className="fl-display text-[16px] leading-[0.9] text-[#F1EDE2]">{t("mockHero", "Seu negócio,\nseu site.")}</p>
        <span className="mt-1 inline-block bg-[#F2B705] px-1.5 py-0.5 text-[6px] font-black uppercase text-[#0B0B0D]">{t("mockBookNow", "Agendar online")}</span>
      </div>
      <div className="mx-2 mt-1.5 grid grid-cols-3 gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="border-2 border-[#0B0B0D] bg-white p-1">
            <span className="block h-1.5 w-3/4 bg-[#0B0B0D]" />
            <span className="mt-1 block h-1 w-1/2 bg-[#9A938A]" />
            <span className="mt-1 block h-1 w-1/3 bg-[#F2B705]" />
          </div>
        ))}
      </div>
    </div>
  )
}

function PrintAi({ t }: { t: (k: string, f: string) => string }) {
  return (
    <div aria-hidden className="relative flex h-40 w-full flex-col overflow-hidden border-2 border-[#0B0B0D] bg-[#0b0804]">
      <div className="flex items-center gap-1.5 border-b-2 border-[#0B0B0D] bg-[#15120E] px-2 py-1 text-[7px] font-extrabold uppercase tracking-[0.12em] text-[#F5F1E8]">
        <MessageCircle className="h-3 w-3 text-[#22C55E]" /> {t("mockWhatsapp", "WhatsApp")}
        <span className="text-[#9A938A]">·</span>
        <span className="text-[#9A938A]">{t("mockFreelandoo", "Mensagens Freelandoo")}</span>
        <span className="ml-auto h-1.5 w-1.5 bg-[#22C55E]" />
      </div>
      <div className="flex flex-1 flex-col justify-end gap-1.5 p-2">
        <div className="max-w-[78%] self-start border-2 border-[#0B0B0D] bg-[#1D1810] px-2 py-1 text-[8px] font-semibold text-[#F5F1E8]">
          {t("mockChatIn", "Oi! Vocês têm horário hoje?")}
        </div>
        <div className="relative max-w-[82%] self-end border-2 border-[#0B0B0D] bg-[#22C55E] px-2 py-1 text-[8px] font-bold text-[#0B0B0D]" style={{ boxShadow: "2px 2px 0 0 #0B0B0D" }}>
          {t("mockChatOut", "Temos às 15h e às 17h. Quer que eu agende?")}
          <span className="absolute -left-2 -top-2 grid h-4 w-4 place-items-center border border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D]">
            <Bot className="h-2.5 w-2.5" />
          </span>
        </div>
        <div className="max-w-[60%] self-start border-2 border-[#0B0B0D] bg-[#1D1810] px-2 py-1 text-[8px] font-semibold text-[#F5F1E8]">
          {t("mockChatIn2", "15h, por favor!")}
        </div>
      </div>
    </div>
  )
}

/* ─── O modal ──────────────────────────────────────────────────────────────── */

export function BusinessPlanModal({
  open,
  onClose,
  returnTo,
  accent = GOLD,
}: {
  open: boolean
  onClose: () => void
  /** Caminho relativo desta tela — é para cá que o Stripe devolve a pessoa. */
  returnTo: string
  accent?: string
}) {
  const t = useTranslations("BusinessPlan")
  const locale = useLocale()
  const { plan, subscription, isActive, loading, subscribe, cancel } = useBusinessPlan()
  const [busy, setBusy] = useState<"subscribe" | "cancel" | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  const priceCents = plan?.price_cents ?? 5000
  const price = money(priceCents, locale)
  const perMonth = t("perMonth", "/mês")

  const onSubscribe = async () => {
    setBusy("subscribe")
    const r = await subscribe(returnTo)
    if (r.error === "login") {
      toast.error(t("loginFirst", "Entre na sua conta para assinar."))
    } else if (r.error) {
      toast.error(r.error === "checkout" || r.error === "no_plan" ? t("checkoutError", "Não foi possível abrir o pagamento.") : r.error)
    }
    // Sem erro, a página já está indo para o Stripe.
    setBusy(null)
  }

  const onCancel = async () => {
    if (!window.confirm(t("cancelConfirm", "Cancelar o Plano Negócio? Você continua com tudo até o fim do período já pago."))) return
    setBusy("cancel")
    const r = await cancel()
    setBusy(null)
    if (r.error) toast.error(t("cancelError", "Não foi possível cancelar agora."))
    else toast.success(t("canceled", "Plano cancelado. Vale até o fim do período pago."))
  }

  const steps: Array<{ key: string; icon: typeof Store; title: string; text: string; print: React.ReactNode; free: boolean }> = [
    {
      key: "biz",
      icon: Store,
      title: t("step1Title", "Crie seu negócio"),
      text: t("step1Text", "Sua página com feed, foto, cores e identidade — pronta em um clique. De graça."),
      print: <PrintBusiness t={t} />,
      free: true,
    },
    {
      key: "site",
      icon: Globe,
      title: t("step2Title", "Faça o seu site"),
      text: t("step2Text", "Monte o site do negócio no construtor visual. Com o plano, publique e compartilhe com endereço próprio."),
      print: <PrintSite t={t} />,
      free: false,
    },
    {
      key: "ai",
      icon: Bot,
      title: t("step3Title", "Atendente de IA"),
      text: t("step3Text", "Um atendente que responde o WhatsApp da sua empresa e as suas mensagens da Freelandoo, sabendo seus serviços e preços."),
      print: <PrintAi t={t} />,
      free: false,
    },
  ]

  const included = [
    t("inc1", "Aceitar membros no seu negócio"),
    t("inc2", "Publicar e compartilhar o site"),
    t("inc3", "Atendente de IA no WhatsApp e nas mensagens"),
    t("inc4", "WhatsApp da empresa dentro da Freelandoo"),
  ]

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/85 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("title", "Plano Negócio")}
    >
      <div
        className="fl-root fl-sharp flex max-h-[94vh] w-full max-w-3xl flex-col overflow-y-auto border-2 border-[#0B0B0D] bg-[#15120E] text-[#F5F1E8]"
        style={{ boxShadow: `8px 8px 0 0 ${accent}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* cabeçalho */}
        <div className="flex items-start justify-between gap-3 border-b-2 border-[#0B0B0D] px-5 py-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#9A938A]">
              <Crown className="h-3.5 w-3.5" style={{ color: accent }} /> {t("eyebrow", "Freelandoo · para o seu negócio")}
            </p>
            <h2 className="fl-display mt-1 text-3xl leading-none sm:text-4xl">{t("title", "Plano Negócio")}</h2>
            <p className="fl-display mt-2 text-2xl leading-none" style={{ color: accent }}>
              {price}
              <span className="ml-1 text-sm font-bold text-[#9A938A]">{perMonth}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close", "Fechar")}
            className="shrink-0 border-2 border-[#0B0B0D] bg-[#1D1810] p-1.5 text-[#F5F1E8] hover:bg-[#241d12]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5">
          <p className="text-sm font-semibold leading-relaxed text-[#F5F1E8]">
            {t("pitch", "Crie seu negócio, faça um site para você e ainda tenha um atendente de IA para atender seu WhatsApp e as suas mensagens da Freelandoo.")}
          </p>

          {/* os três prints */}
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => {
              const Icon = s.icon
              return (
                <div key={s.key} className="border-2 border-[#0B0B0D] bg-[#0b0804] p-2.5">
                  {s.print}
                  <p className="mt-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.12em]">
                    <span className="grid h-6 w-6 shrink-0 place-items-center border-2 border-[#0B0B0D] text-[10px] font-black text-[#0B0B0D]" style={{ background: accent }}>
                      {i + 1}
                    </span>
                    <Icon className="h-4 w-4 shrink-0" style={{ color: accent }} />
                    <span className="min-w-0 flex-1 truncate">{s.title}</span>
                    {s.free ? (
                      <span className="shrink-0 border border-[#0B0B0D] bg-[#22C55E] px-1.5 py-0.5 text-[8px] font-black uppercase text-[#0B0B0D]">{t("freeBadge", "Grátis")}</span>
                    ) : (
                      <Lock className="h-3.5 w-3.5 shrink-0 text-[#9A938A]" />
                    )}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#9A938A]">{s.text}</p>
                </div>
              )
            })}
          </div>

          {/* o que o plano libera */}
          <div className="mt-5 border-2 border-[#0B0B0D] bg-[#0b0804] p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9A938A]">
              {t("freeNote", "Criar o negócio e montar o site é de graça. O plano libera o que vem depois:")}
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {included.map((line) => (
                <li key={line} className="flex items-center gap-2 text-sm font-bold">
                  <span className="grid h-6 w-6 shrink-0 place-items-center border-2 border-[#0B0B0D]" style={{ background: GREEN }}>
                    <Check className="h-4 w-4 text-[#0B0B0D]" strokeWidth={3.5} />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* rodapé: assinar × plano ativo */}
        <div className="border-t-2 border-[#0B0B0D] px-5 py-4">
          {loading && !plan ? (
            <div className="flex justify-center py-2"><Loader2 className="h-5 w-5 animate-spin text-[#9A938A]" /></div>
          ) : isActive && subscription ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em]">
                  <span className="grid h-6 w-6 place-items-center border-2 border-[#0B0B0D]" style={{ background: GREEN }}>
                    <Check className="h-4 w-4 text-[#0B0B0D]" strokeWidth={3.5} />
                  </span>
                  {t("activeTitle", "Plano ativo")}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#9A938A]">
                  {subscription.status === "past_due"
                    ? t("pastDue", "Pagamento pendente — atualize o cartão para continuar.")
                    : subscription.current_period_end
                      ? t("activeUntil", "Renova em {date}").replace("{date}", new Date(subscription.current_period_end).toLocaleDateString(locale))
                      : t("activeNoDate", "Cobrança mensal ativa.")}
                </p>
              </div>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void onCancel()}
                className="border-2 border-[#0B0B0D] bg-[#1D1810] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#F5F1E8] disabled:opacity-60"
              >
                {busy === "cancel" ? t("canceling", "Cancelando…") : t("cancel", "Cancelar plano")}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold text-[#9A938A]">{t("cancelAnytime", "Cancele quando quiser. Sem fidelidade.")}</p>
              <button
                type="button"
                disabled={busy !== null || !plan}
                onClick={() => void onSubscribe()}
                className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-[#0B0B0D] disabled:opacity-60"
                style={{ background: accent, boxShadow: "4px 4px 0 0 #0B0B0D" }}
              >
                {busy === "subscribe" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                {busy === "subscribe"
                  ? t("ctaLoading", "Abrindo pagamento…")
                  : t("cta", "Assinar por {price}/mês").replace("{price}", price)}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
