"use client"

// features/meu-mundo/ui/polens/polens-sheet.tsx — as duas moedas e a compra
// de Poléns DENTRO do jogo (mm3d-30), pelo fluxo que já existe na Freelandoo:
// mesmos pacotes da Loja de Polén, mesmo checkout do Mercado Pago
// (POST /polens/products/:id/checkout, com volta para o jogo) e o mesmo
// confirmador no servidor (webhook). O retorno visual do checkout NÃO credita
// nada: a tela só pergunta ao servidor a situação da compra.
//
// Poléns não se convertem em moedas do jogo nem o contrário — são dois saldos.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CheckCircle2, Clock3, Coins, Loader2, RefreshCw, XCircle } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { useActionConsent } from "@/hooks/use-action-consent"
import { PolenIcon } from "@/components/polens/polen-icon"
import { getPolenProducts, getPolensPurchase, getWallets, postPolenCheckout } from "../../data"
import type { PolenProduct, Wallets } from "../../types"
import { MM } from "../hud/tokens"
import { EvoButton, EvoDialog } from "../hud/hud-kit"
import { archivo } from "../status/evo-skin"

type Tr = (key: string, fallback: string) => string

/** Os dois saldos lado a lado (Poléns indisponível = "—", nunca zero inventado). */
export function WalletPair({ wallet, t, onBuy }: { wallet: Wallets | null; t: Tr; onBuy?: () => void }) {
  const locale = useLocale()
  const fmt = (n: number) => n.toLocaleString(locale)
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="flex items-center gap-2.5 rounded-[14px] p-2.5" style={{ background: MM.card, border: `1px solid ${MM.border}` }}>
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(229,190,112,0.14)", color: MM.gold }} aria-hidden>
          <Coins className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: MM.muted }}>
            {t("plCoins", "Moedas do jogo")}
          </span>
          <span className="block text-[18px] font-bold tabular-nums leading-6" style={{ color: MM.text }}>
            {wallet ? fmt(wallet.coins) : "—"}
          </span>
        </span>
      </div>
      <div className="flex items-center gap-2.5 rounded-[14px] p-2.5" style={{ background: MM.card, border: `1px solid ${MM.goldBorder}` }}>
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-amber-300" style={{ background: "rgba(252,211,77,0.14)" }} aria-hidden>
          <PolenIcon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: MM.muted }}>
            {t("plPolens", "Poléns")}
          </span>
          <span className="block text-[18px] font-bold tabular-nums leading-6" style={{ color: MM.text }} title={wallet && wallet.polens === null ? t("plUnavailable", "Saldo indisponível agora") : undefined}>
            {wallet && wallet.polens !== null ? fmt(wallet.polens) : "—"}
          </span>
        </span>
        {onBuy && (
          <button type="button" onClick={onBuy} className="inline-flex h-9 shrink-0 items-center rounded-full px-3 text-[13px] font-semibold" style={{ background: MM.rubyFill, color: "#fff" }}>
            {t("plBuyShort", "+ Poléns")}
          </button>
        )}
      </div>
    </div>
  )
}

export default function PolensSheet({ onClose }: { onClose: () => void }) {
  const t = useTranslations("MeuMundo")
  const locale = useLocale()
  const { ensureConsent } = useActionConsent()
  const [wallet, setWallet] = useState<Wallets | null>(null)
  const [products, setProducts] = useState<PolenProduct[] | null>(null)
  const [error, setError] = useState(false)
  const [buying, setBuying] = useState<string | null>(null)
  const [buyError, setBuyError] = useState<string | null>(null)
  const money = useMemo(() => new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }), [locale])

  const load = useCallback(async () => {
    setError(false)
    const token = getToken()
    const [p, w] = await Promise.all([getPolenProducts(), token ? getWallets(token) : null])
    if (w?.ok) setWallet(w.data.wallet)
    if (p.ok) setProducts(p.data.products)
    else setError(true)
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const buy = async (p: PolenProduct) => {
    const token = getToken()
    if (!token || buying) return
    if (!(await ensureConsent("platform_purchase"))) return
    setBuying(p.id)
    setBuyError(null)
    const r = await postPolenCheckout(token, p.id)
    if (!r.ok) {
      setBuying(null)
      setBuyError(r.status === 0 ? t("levelNetError", "Sem conexão. Tente de novo.") : r.error)
      return
    }
    // O pagamento é na página do Mercado Pago; a volta cai no jogo com a sessão.
    window.location.assign(r.data.checkout_url)
  }

  return (
    <EvoDialog
      fixed
      // acima do STATUS (z-80), de onde ela também abre
      z="z-[86]"
      labelId="mm-polens"
      eyebrow={t("plEyebrow", "Carteira")}
      title={t("plTitle", "Adquirir Poléns")}
      onClose={onClose}
      width="max-w-md"
    >
      <WalletPair wallet={wallet} t={t} />
      <p className="mt-3 text-[12px] leading-[17px]" style={{ color: MM.muted }}>
        {t("plRule", "Poléns são a moeda paga da Freelandoo: valem aqui e no resto da plataforma. Não viram moedas do jogo, e moedas do jogo não viram Poléns.")}
      </p>
      <div className="mt-3">
        {error ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center text-[14px]" style={{ color: MM.muted }} role="alert">
            {t("plLoadFail", "Os pacotes não carregaram.")}
            <EvoButton variant="gold" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={() => void load()}>
              {t("ibRetry", "Tentar de novo")}
            </EvoButton>
          </div>
        ) : products === null ? (
          <div className="flex flex-col gap-2" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-[14px]" style={{ background: MM.card }} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="py-6 text-center text-[14px]" style={{ color: MM.muted }}>
            {t("plNoProducts", "Nenhum pacote à venda agora.")}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {products.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-[14px] p-2.5" style={{ background: MM.card, border: `1px solid ${MM.border}` }}>
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-amber-300" style={{ background: "rgba(252,211,77,0.12)" }} aria-hidden>
                  <PolenIcon className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  {/* nome do pacote vem do admin (conteúdo, não traduz) */}
                  <span className="block truncate text-[14px] font-semibold" style={{ color: MM.text }}>
                    {p.name}
                  </span>
                  <span className="block text-[12px] tabular-nums" style={{ color: MM.gold }}>
                    {t("plAmount", "{n} Poléns").replace("{n}", String(p.polens_amount))}
                    {p.bonus_polens > 0 && ` ${t("plBonus", "+ {n} de bônus").replace("{n}", String(p.bonus_polens))}`}
                  </span>
                </span>
                <EvoButton variant="primary" size="sm" loading={buying === p.id} disabled={!!buying && buying !== p.id} onClick={() => void buy(p)}>
                  {money.format(p.price_cents / 100)}
                </EvoButton>
              </li>
            ))}
          </ul>
        )}
        {buyError && (
          <p className="mt-2 text-[12px] font-semibold" style={{ color: MM.danger }} role="alert">
            {buyError}
          </p>
        )}
        <p className="mt-3 text-[11px] leading-4" style={{ color: MM.muted }}>
          {t("plMp", "Pagamento pelo Mercado Pago. Os Poléns entram na carteira quando o pagamento é confirmado — você recebe um aviso no sino.")}
        </p>
      </div>
    </EvoDialog>
  )
}

// ═══ a volta do checkout ═══════════════════════════════════════════════════
type ReturnState =
  | { kind: "checking" }
  | { kind: "paid"; polens: number }
  | { kind: "pending" }
  | { kind: "failed" }
  | { kind: "canceled" }
  | { kind: "unknown" }

// Pergunta ao servidor com espera crescente (~1 min no total): o webhook do
// Mercado Pago costuma chegar em segundos, mas pode atrasar.
const BACKOFF = [1500, 2500, 4000, 6000, 8000, 10000, 12000, 15000]

/**
 * Lê `?polens_checkout=` na volta do Mercado Pago (no efeito — a URL não é
 * relida pelo App Router), limpa a URL e acompanha a compra até o servidor
 * dizer pago, recusado/expirado, ou desistir de esperar ("pendente").
 */
export function PolensReturn({ onPaid }: { onPaid: () => void }) {
  const t = useTranslations("MeuMundo")
  // A volta é lida UMA vez, no estado inicial (a casca só monta no cliente);
  // o efeito abaixo pode rodar de novo (StrictMode) sem perder a sessão.
  const [ret] = useState<{ flag: string; session: string } | null>(() => {
    if (typeof window === "undefined") return null
    const params = new URLSearchParams(window.location.search)
    const flag = params.get("polens_checkout")
    return flag ? { flag, session: params.get("session_id") || "" } : null
  })
  const [state, setState] = useState<ReturnState | null>(() =>
    !ret ? null : ret.flag === "cancel" ? { kind: "canceled" } : !ret.session || ret.session.includes("{") ? { kind: "unknown" } : { kind: "checking" },
  )
  // A casca passa uma função nova a cada render: o acompanhamento não depende dela.
  const paid = useRef(onPaid)
  useEffect(() => {
    paid.current = onPaid
  }, [onPaid])

  useEffect(() => {
    if (!ret) return
    // Limpa a URL (recarregar a página não repete a conferência).
    const params = new URLSearchParams(window.location.search)
    params.delete("polens_checkout")
    params.delete("session_id")
    const qs = params.toString()
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`)
    if (ret.flag === "cancel" || !ret.session || ret.session.includes("{")) return
    let alive = true
    let i = 0
    let timer = 0
    const tick = async () => {
      if (!alive) return
      const token = getToken()
      const r = token ? await getPolensPurchase(token, ret.session) : null
      if (!alive) return
      if (r?.ok) {
        const st = r.data.purchase.status
        if (st === "paid") {
          setState({ kind: "paid", polens: r.data.purchase.polens })
          paid.current()
          return
        }
        if (st === "failed" || st === "expired" || st === "refunded") return setState({ kind: "failed" })
      }
      if (i >= BACKOFF.length) return setState({ kind: "pending" })
      timer = window.setTimeout(tick, BACKOFF[i++])
    }
    void tick()
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [ret])

  if (!state) return null
  const close = () => setState(null)
  const icon =
    state.kind === "paid" ? (
      <CheckCircle2 className="h-6 w-6" style={{ color: MM.online }} />
    ) : state.kind === "failed" || state.kind === "canceled" ? (
      <XCircle className="h-6 w-6" style={{ color: MM.danger }} />
    ) : state.kind === "checking" ? (
      <Loader2 className="h-6 w-6 animate-spin" style={{ color: MM.gold }} />
    ) : (
      <Clock3 className="h-6 w-6" style={{ color: MM.gold }} />
    )
  const text =
    state.kind === "paid"
      ? t("plPaid", "Pagamento confirmado: {n} Poléns na sua carteira.").replace("{n}", String(state.polens))
      : state.kind === "checking"
        ? t("plChecking", "Confirmando o pagamento com o Mercado Pago…")
        : state.kind === "pending"
          ? t("plPending", "O pagamento ainda está em análise. Quando for confirmado, os Poléns entram e você recebe um aviso no sino.")
          : state.kind === "failed"
            ? t("plFailed", "O pagamento não foi aprovado. Nenhum Polén foi cobrado nem creditado.")
            : state.kind === "canceled"
              ? t("plCanceled", "Compra cancelada. Nada foi cobrado.")
              : t("plUnknown", "Não deu para conferir esta compra. Se o pagamento for aprovado, o aviso chega no sino.")
  return (
    <EvoDialog
      fixed
      z="z-[79]"
      labelId="mm-polens-return"
      eyebrow={t("plEyebrow", "Carteira")}
      title={t("plReturnTitle", "Compra de Poléns")}
      onClose={state.kind === "checking" ? undefined : close}
      width="max-w-sm"
      footer={
        state.kind !== "checking" ? (
          <EvoButton variant="primary" className="w-full" autoFocus onClick={close}>
            {t("plOk", "Entendi")}
          </EvoButton>
        ) : undefined
      }
    >
      <div className={`${archivo.className} flex items-start gap-3`} role="status" aria-live="polite">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <p className="text-[14px] leading-5">{text}</p>
      </div>
    </EvoDialog>
  )
}
