"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  BadgeCheck,
  CheckCircle2,
  Coins,
  CreditCard,
  Loader2,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ShareIconButton } from "@/components/share/share-icon-button"
import {
  PageShell,
  TabloidPageIntro,
  EmptyState,
  ErrorState,
} from "@/components/tabloide"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { useActionConsent } from "@/hooks/use-action-consent"

type TFn = (key: string, fallback?: string) => string

type ManifestationType = "motivational" | "emotion" | null

type Product = {
  id: string
  slug: string | null
  name: string
  type: ManifestationType
  headline: string | null
  description: string | null
  banner_url: string
  price_polens: number
  price_cents: number
  tag_label?: string | null
  tag_color?: string | null
}

// Pills da tag combinam com o gradiente escuro do overlay inferior.
const TAG_COLOR_CLASSES: Record<string, string> = {
  emerald: "border-emerald-300/40 bg-emerald-500/15 text-emerald-100",
  amber:   "border-amber-300/40 bg-amber-500/15 text-amber-100",
  rose:    "border-rose-300/40 bg-rose-500/15 text-rose-100",
  sky:     "border-sky-300/40 bg-sky-500/15 text-sky-100",
  violet:  "border-violet-300/40 bg-violet-500/15 text-violet-100",
  primary: "border-amber-300/40 bg-amber-500/15 text-amber-100",
  zinc:    "border-zinc-200/40 bg-zinc-500/15 text-zinc-100",
  red:     "border-red-300/40 bg-red-500/15 text-red-100",
  blue:    "border-blue-300/40 bg-blue-500/15 text-blue-100",
  green:   "border-green-300/40 bg-green-500/15 text-green-100",
  yellow:  "border-yellow-300/40 bg-yellow-500/15 text-yellow-100",
  orange:  "border-orange-300/40 bg-orange-500/15 text-orange-100",
}

type OwnedRow = {
  id: string
  product_id: string
  is_active: boolean
  name: string
  type: ManifestationType
  headline: string | null
  banner_url: string
  slug: string | null
  amount_polens: number | null
  acquired_at: string
  payment_method: string
  tag_label?: string | null
  tag_color?: string | null
}
type Mine = {
  active?: { product_id?: string } | null
  owned?: OwnedRow[]
}

type Filter = "all" | "motivational" | "emotion" | "owned" | "not_owned"

const FILTERS: { id: Filter; label: string; labelKey: string }[] = [
  { id: "all", label: "Todos", labelKey: "filterAll" },
  { id: "motivational", label: "Motivacionais", labelKey: "filterMotivational" },
  { id: "emotion", label: "Emoções", labelKey: "filterEmotion" },
  { id: "owned", label: "Comprados", labelKey: "filterOwned" },
  { id: "not_owned", label: "Não comprados", labelKey: "filterNotOwned" },
]

function typeLabel(type: ManifestationType, t: TFn): string {
  if (type === "motivational") return t("typeMotivational", "Motivacional")
  if (type === "emotion") return t("typeEmotion", "Emoção")
  return t("typeDefault", "Manifestação")
}

function fmtBRL(cents: number, locale = "pt-BR"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(
    (cents || 0) / 100,
  )
}

/** Imagem do banner com fallback — se o arquivo não existir, não quebra a UI. */
function BannerImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  if (failed || !src) {
    return (
      <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(217,119,6,0.28),transparent_40%),linear-gradient(135deg,#18181b,#3f3f46)]">
        <Sparkles className="h-7 w-7 text-white/35" />
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="h-full w-full object-cover object-left transition duration-500 group-hover:scale-[1.03]"
    />
  )
}

export default function ManifestacaoPage() {
  const t = useTranslations("Manifestation")
  const locale = useLocale()
  const { ensureConsent } = useActionConsent()
  const [products, setProducts] = useState<Product[]>([])
  const [mine, setMine] = useState<Mine | null>(null)
  const [polens, setPolens] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [busy, setBusy] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ ok: boolean; title: string; message: string; insufficient?: boolean } | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  const loadMine = useCallback(async () => {
    if (!token) return
    try {
      const [meRes, walletRes] = await Promise.all([
        fetch("/api/manifestations/me", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/polens/wallet", { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (meRes.ok) setMine(await meRes.json())
      if (walletRes.ok) {
        const w = await walletRes.json()
        setPolens(Number(w?.wallet?.balance ?? w?.balance ?? 0))
      }
    } catch {
      /* best-effort — a loja funciona mesmo sem o /me */
    }
  }, [token])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError("")
      try {
        const res = await fetch("/api/manifestations/products", { cache: "no-store" })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || t("loadStoreError", "Não foi possível carregar a loja"))
        if (!cancelled) setProducts(Array.isArray(data?.products) ? data.products : [])
        await loadMine()
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t("loadError", "Erro ao carregar"))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [loadMine, t])

  // Retorno do checkout Stripe: o webhook desbloqueia; recarrega "owned".
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("checkout") === "success") {
      window.history.replaceState(null, "", "/manifestacao")
      setFeedback({
        ok: true,
        title: t("paymentConfirmed", "Pagamento confirmado"),
        message: t("paymentConfirmedMsg", 'Sua manifestação foi desbloqueada. Clique em "Usar no perfil" para aplicá-la.'),
      })
      void loadMine()
    }
  }, [loadMine, t])

  const ownedIds = useMemo(
    () => new Set((mine?.owned || []).map((o) => o.product_id)),
    [mine],
  )
  const activeId = mine?.active?.product_id ?? null

  const previewProduct = useMemo(
    () => products.find((p) => p.id === previewId) ?? null,
    [products, previewId],
  )

  useEffect(() => {
    if (!previewId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewId(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [previewId])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      const owned = ownedIds.has(p.id)
      if (filter === "motivational" && p.type !== "motivational") return false
      if (filter === "emotion" && p.type !== "emotion") return false
      if (filter === "owned" && !owned) return false
      if (filter === "not_owned" && owned) return false
      if (q) {
        const haystack = `${p.name} ${p.slug || ""} ${p.headline || ""}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [products, ownedIds, filter, query])

  // Lista de comprados (ativa primeiro, depois por aquisição mais recente).
  const ownedList = useMemo(() => {
    const rows = (mine?.owned || []).slice()
    rows.sort((a, b) => {
      const aActive = a.product_id === activeId ? 1 : 0
      const bActive = b.product_id === activeId ? 1 : 0
      if (aActive !== bActive) return bActive - aActive
      return new Date(b.acquired_at).getTime() - new Date(a.acquired_at).getTime()
    })
    return rows
  }, [mine, activeId])

  async function buy(product: Product) {
    if (!token) {
      window.location.href = "/login?next=/manifestacao"
      return
    }
    if (!(await ensureConsent("platform_purchase"))) return
    setBusy(`buy:${product.id}`)
    try {
      const res = await fetch("/api/manifestations/checkout/polens", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: product.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || t("purchaseNotCompleted", "Compra não concluída"))
      await loadMine()
      setPreviewId(null)
      setFeedback({
        ok: true,
        title: t("allSet", "Tudo certo!"),
        message: data?.message || t("unlockedSuccess", "Manifestação desbloqueada com sucesso."),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : t("purchaseError", "Erro na compra")
      const insufficient = message.toLowerCase().includes("pólens") || message.toLowerCase().includes("polens")
      setFeedback({
        ok: false,
        title: insufficient ? t("insufficientBalance", "Saldo insuficiente") : t("purchaseNotCompleted", "Compra não concluída"),
        message,
        insufficient,
      })
    } finally {
      setBusy(null)
    }
  }

  async function buyStripe(product: Product) {
    if (!token) {
      window.location.href = "/login?next=/manifestacao"
      return
    }
    if (!(await ensureConsent("platform_purchase"))) return
    setBusy(`stripe:${product.id}`)
    try {
      const res = await fetch("/api/manifestations/checkout/stripe", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: product.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || t("startPaymentError", "Não foi possível iniciar o pagamento"))
      if (data?.checkout_url) {
        window.location.href = data.checkout_url
        return
      }
      throw new Error(t("checkoutUnavailable", "Checkout indisponível"))
    } catch (err) {
      setFeedback({
        ok: false,
        title: t("paymentNotStarted", "Pagamento não iniciado"),
        message: err instanceof Error ? err.message : t("checkoutError", "Erro no checkout"),
      })
      setBusy(null)
    }
  }

  async function applyProductId(productId: string) {
    if (!token) {
      window.location.href = "/login?next=/manifestacao"
      return
    }
    setBusy(`apply:${productId}`)
    try {
      const res = await fetch("/api/manifestations/apply", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || t("applyError", "Não foi possível aplicar"))
      await loadMine()
      setPreviewId(null)
      setFeedback({
        ok: true,
        title: t("applied", "Manifestação aplicada"),
        message: data?.message || t("appliedMsg", "Pronto, ela já aparece no headcard do seu perfil."),
      })
    } catch (err) {
      setFeedback({
        ok: false,
        title: t("applyError", "Não foi possível aplicar"),
        message: err instanceof Error ? err.message : t("applyErrorShort", "Erro ao aplicar"),
      })
    } finally {
      setBusy(null)
    }
  }

  async function removeActive() {
    if (!token) {
      window.location.href = "/login?next=/manifestacao"
      return
    }
    setBusy("remove")
    try {
      const res = await fetch("/api/manifestations/remove", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || t("removeError", "Não foi possível remover"))
      await loadMine()
      setPreviewId(null)
      setFeedback({
        ok: true,
        title: t("removed", "Removida do perfil"),
        message: data?.message || t("removedMsg", "Sua manifestação saiu do headcard. Ela continua na sua lista de comprados."),
      })
    } catch (err) {
      setFeedback({
        ok: false,
        title: t("removeError", "Não foi possível remover"),
        message: err instanceof Error ? err.message : t("removeErrorShort", "Erro ao remover"),
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <PageShell>
      {/* Manchete tabloide */}
      <section className="mx-auto max-w-7xl px-4 pt-10 md:px-8 md:pt-14">
        <TabloidPageIntro
          size="compact"
          eyebrow={t("eyebrow", "Manifestação")}
          title={t("storeTitle", "Loja de Manifestações")}
          subtitle={t("subtitle", "Desbloqueie banners de manifestação com Poléns ou cartão e aplique um deles no headcard do seu perfil. Depois de desbloqueada, ela fica sua para sempre.")}
          actions={
            <>
              {token && (
                <span className="inline-flex items-center gap-1.5 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-1.5 text-xs font-black uppercase tracking-wider text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]">
                  <Coins className="h-3.5 w-3.5" />
                  {polens == null ? "—" : polens.toLocaleString(locale)} {t("polens", "Poléns")}
                  <Link href="/loja-polens" className="ml-1 underline underline-offset-2">
                    {t("buyLink", "comprar")}
                  </Link>
                </span>
              )}
              <ShareIconButton path="/manifestacao" title={t("shareTitle", "Loja de Manifestações no Freelandoo")} />
            </>
          }
        />
      </section>

      {/* Filtros + busca */}
      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-8">
        <div className="mt-8 flex flex-col gap-3 border-y border-[#F5F1E8]/10 py-4 md:flex-row md:items-center md:justify-between">
          <div className="relative md:w-[340px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A938A]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder", "Buscar por nome ou estado")}
              className="h-11 w-full rounded-none border-2 border-[#F5F1E8]/12 bg-[#1D1810] pl-10 pr-4 text-sm text-[#F5F1E8] placeholder:text-[#9A938A] shadow-[3px_3px_0_0_rgba(0,0,0,0.4)] outline-none transition focus:border-[#F2B705]"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "h-10 shrink-0 rounded-none border-2 px-4 text-xs font-black uppercase tracking-wider transition active:translate-x-[1px] active:translate-y-[1px]",
                  filter === f.id
                    ? "border-[#0B0B0D] bg-[#F2B705] text-[#1A1505] shadow-[3px_3px_0_0_#0B0B0D]"
                    : "border-[#F5F1E8]/12 bg-[#1D1810] text-[#C9C2B6] hover:border-[#F5F1E8]/30",
                )}
              >
                {t(f.labelKey, f.label)}
              </button>
            ))}
          </div>
        </div>

        {/* Comprados — aplicar / remover direto na loja */}
        {ownedList.length > 0 && (
          <div className="mt-8">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="fl-display text-2xl text-[#F5F1E8] md:text-3xl">{t("owned", "Comprados")}</h2>
              <span className="border-2 border-[#F5F1E8]/14 bg-[#1D1810] px-2 py-0.5 text-xs font-black uppercase tracking-wider text-[#C9C2B6]">
                {ownedList.length}
              </span>
              <span className="hidden text-xs font-medium text-[#9A938A] sm:inline">
                {t("ownedHint", "Aplique uma no headcard ou remova a que está em uso.")}
              </span>
            </div>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {ownedList.map((o) => {
                const isActive = o.product_id === activeId
                const applying = busy === `apply:${o.product_id}`
                const removing = busy === "remove"
                return (
                  <div
                    key={o.id}
                    className={cn(
                      "flex flex-col overflow-hidden border-2 bg-[#15100A] shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]",
                      isActive ? "border-[#F2B705]" : "border-[#F5F1E8]/14",
                    )}
                  >
                    <div className="relative aspect-[16/7] w-full overflow-hidden bg-[#141009]">
                      <BannerImage src={o.banner_url} alt={o.name} />
                      {isActive && (
                        <span className="absolute right-2 top-2 inline-flex items-center gap-1 border border-emerald-400/40 bg-emerald-950/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200 backdrop-blur">
                          <CheckCircle2 className="h-3 w-3" />
                          {t("onProfile", "No perfil")}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 border-t-2 border-[#F5F1E8]/10 p-3">
                      <span
                        className={cn(
                          "inline-flex w-fit items-center border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                          o.type === "motivational"
                            ? "border-amber-300/30 bg-amber-500/12 text-amber-200"
                            : "border-sky-300/30 bg-sky-500/12 text-sky-200",
                        )}
                      >
                        {typeLabel(o.type, t)}
                      </span>
                      <h3 className="fl-display text-base leading-none text-[#F5F1E8]">{o.name}</h3>
                      <div className="mt-auto pt-1">
                        {isActive ? (
                          <button
                            type="button"
                            onClick={() => removeActive()}
                            disabled={busy != null}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-none border-2 border-[#F5F1E8]/25 bg-transparent px-3 py-2 text-[11px] font-black uppercase tracking-wider text-[#F5F1E8] transition hover:border-rose-400 hover:bg-rose-500/10 hover:text-rose-200 disabled:opacity-55"
                          >
                            {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            {t("remove", "Remover")}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => applyProductId(o.product_id)}
                            disabled={busy != null}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-none border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-2 text-[11px] font-black uppercase tracking-wider text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#0B0B0D] disabled:opacity-55"
                          >
                            {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />}
                            {t("apply", "Aplicar")}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-8 h-0.5 w-full bg-[#F5F1E8]/10" />
          </div>
        )}

        {/* Estados */}
        {loading ? (
          <div className="grid gap-5 py-8 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="overflow-hidden rounded-none border-2 border-[#F5F1E8]/10 bg-[#1D1810]">
                <div className="aspect-[16/7] animate-pulse bg-[#F5F1E8]/8" />
                <div className="space-y-2 border-t-2 border-[#F5F1E8]/10 p-3">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-[#F5F1E8]/8" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-[#F5F1E8]/8" />
                  <div className="h-4 w-1/4 animate-pulse rounded bg-[#F5F1E8]/8" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-16">
            <ErrorState description={error} onRetry={() => window.location.reload()} />
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={<Sparkles className="h-6 w-6" />}
              title={products.length === 0 ? t("noManifestations", "Sem manifestações") : t("nothingFound", "Nada encontrado")}
              description={
                products.length === 0
                  ? t("noManifestationsDesc", "Nenhuma manifestação disponível no momento.")
                  : t("noMatchDesc", "Nenhuma manifestação encontrada para esse filtro.")
              }
            />
          </div>
        ) : (
          <div className="grid gap-5 py-8 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {visible.map((p, index) => {
              const owned = ownedIds.has(p.id)
              const isActive = activeId === p.id
              return (
                <article
                  key={p.id}
                  onClick={() => setPreviewId(p.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      setPreviewId(p.id)
                    }
                  }}
                  className="group relative flex cursor-pointer flex-col overflow-hidden rounded-none border-2 border-[#F5F1E8]/12 bg-[#1D1810] shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] transition-all duration-200 hover:-translate-x-[3px] hover:-translate-y-[3px] hover:border-[#F2B705] hover:shadow-[8px_8px_0_0_#F2B705]"
                  style={{
                    animation: `fade-in .42s cubic-bezier(.16,1,.3,1) both ${index * 45}ms`,
                  }}
                >
                  {/* Banner LIMPO no topo (a arte já traz o nome) */}
                  <div className="relative aspect-[16/7] w-full overflow-hidden bg-[#141009]">
                    <BannerImage src={p.banner_url} alt={p.name} />
                    {isActive && (
                      <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-950/85 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 backdrop-blur">
                        <CheckCircle2 className="h-3 w-3" />
                        {t("active", "Ativo")}
                      </span>
                    )}
                  </div>

                  {/* Faixa de dados embaixo (fundo escuro, separada do banner) */}
                  <div className="flex flex-1 flex-col gap-2 border-t-2 border-[#F5F1E8]/10 bg-[#15100A] p-3">
                    <span
                      className={cn(
                        "inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                        p.type === "motivational"
                          ? "border-amber-300/30 bg-amber-500/12 text-amber-200"
                          : "border-sky-300/30 bg-sky-500/12 text-sky-200",
                      )}
                    >
                      {typeLabel(p.type, t)}
                    </span>
                    <h3 className="fl-display text-lg leading-none text-[#F5F1E8]">{p.name}</h3>

                    {p.tag_label && (
                      <span
                        className={cn(
                          "inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                          TAG_COLOR_CLASSES[p.tag_color || "emerald"] ?? TAG_COLOR_CLASSES.emerald,
                        )}
                      >
                        <BadgeCheck className="h-2.5 w-2.5" />
                        {p.tag_label}
                      </span>
                    )}

                    {p.headline && (
                      <p className="line-clamp-1 text-xs font-medium text-[#9A938A]">{p.headline}</p>
                    )}

                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-[#F5F1E8]/8 pt-2">
                      <span className="fl-display text-base text-[#F2B705]">
                        {p.price_cents > 0
                          ? fmtBRL(p.price_cents, locale)
                          : p.price_polens > 0
                            ? `${p.price_polens.toLocaleString(locale)} P`
                            : t("free", "Grátis")}
                      </span>
                      {owned && !isActive && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#F5F1E8]/15 bg-[#F5F1E8]/8 px-2 py-0.5 text-[10px] font-medium text-[#C9C2B6]">
                          <BadgeCheck className="h-3 w-3" />
                          {t("ownedTag", "Comprado")}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* Modal de preview + compra */}
      {previewProduct && (() => {
        const p = previewProduct
        const owned = ownedIds.has(p.id)
        const isActive = activeId === p.id
        return (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6 backdrop-blur-sm"
            onClick={() => setPreviewId(null)}
            role="presentation"
          >
            <div
              className="fl-card relative flex w-full max-w-md flex-col overflow-hidden rounded-none shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={t("previewOf", "Preview de {name}").replace("{name}", p.name)}
            >
              <button
                type="button"
                onClick={() => setPreviewId(null)}
                className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-[#0b0804]/55 text-white backdrop-blur transition hover:bg-[#0b0804]/75"
                aria-label={t("close", "Fechar")}
              >
                <X className="h-4 w-4" />
              </button>

              {/* Preview do banner — proporcao 16:5 (formato real do headcard) */}
              <div className="group relative aspect-[16/5] w-full overflow-hidden bg-[#1D1810]">
                <BannerImage src={p.banner_url} alt={p.name} />
              </div>

              <div className="flex flex-col gap-3 p-5">
                <div>
                  <span
                    className={cn(
                      "mb-1.5 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      p.type === "motivational"
                        ? "border-amber-400/40 bg-amber-400/15 text-amber-700"
                        : "border-sky-400/40 bg-sky-400/15 text-sky-700",
                    )}
                  >
                    {typeLabel(p.type, t)}
                  </span>
                  <h3 className="fl-display text-2xl text-[var(--fl-ink)]">{p.name}</h3>
                  {p.headline && (
                    <p className="mt-1 text-sm font-bold text-[#3a352d]">{p.headline}</p>
                  )}
                  {p.description && (
                    <p className="mt-1.5 text-sm leading-relaxed text-[#5b554b]">{p.description}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-[#0B0B0D]/10 pt-3">
                  {p.price_cents > 0 && (
                    <span className="text-2xl font-black tracking-tight text-[#0B0B0D]">
                      {fmtBRL(p.price_cents, locale)}
                    </span>
                  )}
                  {p.price_polens > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#9c6e2a]">
                      <Coins className="h-4 w-4" />
                      {t("or", "ou")} {p.price_polens.toLocaleString(locale)} {t("polens", "Poléns")}
                    </span>
                  )}
                  {p.price_cents === 0 && p.price_polens === 0 && (
                    <span className="text-2xl font-black tracking-tight text-[#15803d]">{t("free", "Grátis")}</span>
                  )}
                </div>

                <div className="mt-1 space-y-2">
                  {isActive ? (
                    <>
                      <div className="inline-flex w-full items-center justify-center gap-2 rounded-none border-2 border-[#16a34a] bg-[#16a34a]/12 py-3 text-sm font-black uppercase tracking-wider text-[#15803d]">
                        <CheckCircle2 className="h-4 w-4" />
                        {t("appliedOnProfile", "Aplicada no seu perfil")}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeActive()}
                        disabled={busy != null}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-none border-2 border-[#0B0B0D]/25 bg-transparent py-3 text-sm font-black uppercase tracking-wider text-[#0B0B0D] transition hover:border-rose-500 hover:bg-rose-500/10 hover:text-rose-700 disabled:opacity-55"
                      >
                        {busy === "remove" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        {t("removeFromProfile", "Remover do perfil")}
                      </button>
                    </>
                  ) : owned ? (
                    <button
                      type="button"
                      onClick={() => applyProductId(p.id)}
                      disabled={busy != null}
                      className="fl-btn-ink inline-flex w-full items-center justify-center rounded-none py-3 text-sm font-bold disabled:opacity-60"
                    >
                      {busy === `apply:${p.id}` ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <BadgeCheck className="mr-2 h-4 w-4" />
                      )}
                      {t("useOnProfile", "Usar no perfil")}
                    </button>
                  ) : (
                    <>
                      {p.price_cents > 0 && (
                        <button
                          type="button"
                          onClick={() => buyStripe(p)}
                          disabled={busy != null}
                          className="fl-btn-gold inline-flex w-full items-center justify-center rounded-none py-3 text-sm font-bold disabled:opacity-60"
                        >
                          {busy === `stripe:${p.id}` ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CreditCard className="mr-2 h-4 w-4" />
                          )}
                          {t("buy", "Comprar")} · {fmtBRL(p.price_cents, locale)}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => buy(p)}
                        disabled={busy != null}
                        className="fl-btn-card inline-flex w-full items-center justify-center rounded-none py-3 text-sm font-bold uppercase tracking-wider disabled:opacity-60"
                      >
                        {busy === `buy:${p.id}` ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Coins className="mr-2 h-4 w-4" />
                        )}
                        {p.price_polens > 0
                          ? `${t("buy", "Comprar")} · ${p.price_polens.toLocaleString(locale)} ${t("polens", "Poléns")}`
                          : t("redeemFree", "Resgatar grátis")}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Feedback de compra/aplicação */}
      {feedback && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4"
          onClick={() => setFeedback(null)}
        >
          <div
            className="fl-card w-full max-w-sm rounded-none p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={cn(
                "grid h-11 w-11 place-items-center rounded-full text-white",
                feedback.ok ? "bg-[#16a34a]" : "bg-[#F2B705] !text-[#1A1505]",
              )}
            >
              {feedback.ok ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Coins className="h-5 w-5" />
              )}
            </div>
            <h3 className="fl-display mt-4 text-2xl text-[var(--fl-ink)]">{feedback.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#5b554b]">{feedback.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              {!feedback.ok && feedback.insufficient && (
                <Link
                  href="/loja-polens"
                  className="fl-btn-card inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider"
                >
                  {t("buyPolens", "Comprar Poléns")}
                </Link>
              )}
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="fl-btn-gold inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-bold"
              >
                {t("gotIt", "Entendi")}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
