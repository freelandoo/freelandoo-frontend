"use client"

// Carteira do user — extrato de ganhos (Loja/Serviço/Curso/Afiliado) escopável
// por perfil + gráfico de barras (ganhos × dias) + painéis do cofrinho, do
// cupom e do mercado.
//
// A tela é um HUB: um headcard com a foto e três botões RETRÁTEIS atrás dela
// (mesma peça do headcard do perfil, `PillStack`), cada um abrindo um painel
// desta própria página em vez de navegar. Cofrinho → vaquinha; porcentagem →
// cupom, extrato e afiliado; gráfico → mercado. Antes, tudo isso vivia
// empilhado na mesma rolagem, com o mercado numa barra lateral que só existia
// no desktop.
//
// IDENTIDADE TABLOIDE (igual ranking/Casa Views/Mensagens): canvas warm escuro
// + textura, manchete condensada fl-display, eyebrow manuscrito fl-marker,
// cards de papel com cantos RETOS e sombra dura preta (hover vira sombra verde).
// Acento = teal-verde (no lugar do dourado do ranking).
//
// Custo Vercel: mercado vem do cache do backend (scheduler Railway) via
// /api/market/snapshot com ISR. Sem polling, sem fetch externo por request.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import {
  Wallet, ArrowLeft, ShoppingBag, Briefcase, GraduationCap, Percent,
  TrendingUp, TrendingDown, Newspaper, ChevronDown, X,
  Loader2, AlertCircle, Inbox, BarChart3, LineChart,
  Ticket, Copy, Check, PiggyBank,
} from "lucide-react"
import { useMeProfile } from "@/hooks/use-me-profile"
import { clientFetchWithTimeout } from "@/lib/fetch-with-timeout"
import { Halftone, Underline } from "@/components/home/landing/primitives"
import { PillStack, type PillSpec } from "@/components/profile/headcard-pills"
import { cn } from "@/lib/utils"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"
import { useUserFeature } from "@/components/feature-flags/UserFeaturesProvider"
import { VidaFinanceira } from "./_components/vida-financeira"
import { MeiCard } from "./_components/mei-card"
import { AfiliadoPanel } from "./_components/afiliado-panel"

/* ── paleta (verde teal no lugar do dourado) ──────────────────────────────── */
const GREEN = "#16B79A"
const GREEN_DEEP = "#00876B"
const INK = "#0B0B0D"
const PAPER = "#F1EDE2"

type TFn = (key: string, fallback?: string) => string

/* ── helpers ──────────────────────────────────────────────────────────────── */
function brl(cents?: number | null, locale = "pt-BR") {
  return ((Number(cents) || 0) / 100).toLocaleString(locale, { style: "currency", currency: "BRL" })
}
function pct(n?: number | null) {
  const v = Number(n)
  if (!Number.isFinite(v)) return "—"
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`
}
function shortDay(iso: string, locale = "pt-BR") {
  return new Date(iso + "T00:00:00").toLocaleDateString(locale, { day: "2-digit", month: "2-digit" })
}
function fmtDate(iso?: string | null, locale = "pt-BR") {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" })
}
function initialsOf(name?: string | null) {
  return (
    String(name || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] || "")
      .join("")
      .toUpperCase() || "?"
  )
}

const KIND_META: Record<string, { label: string; labelKey: string; Icon: typeof ShoppingBag }> = {
  product: { label: "Loja", labelKey: "kindStore", Icon: ShoppingBag },
  service: { label: "Serviço", labelKey: "kindService", Icon: Briefcase },
  course: { label: "Curso", labelKey: "kindCourse", Icon: GraduationCap },
  affiliate: { label: "Afiliado", labelKey: "kindAffiliate", Icon: Percent },
}
const STATUS_META: Record<string, { label: string; labelKey: string; cls: string }> = {
  paid: { label: "Recebido", labelKey: "statusReceived", cls: "bg-[#00876B] text-white" },
  available: { label: "Disponível", labelKey: "statusAvailable", cls: "bg-[#16B79A] text-[#06251F]" },
  pending: { label: "Aguardando", labelKey: "statusPending", cls: "bg-[#0B0B0D] text-[#F1EDE2]" },
  reversed: { label: "Revertido", labelKey: "statusReverted", cls: "bg-[#9A3412] text-white" },
}

/* ── tipos ────────────────────────────────────────────────────────────────── */
type Agg = { totals?: { received?: number; available?: number; pending?: number; reversed?: number; count?: number } }
type Earning = {
  kind: string; id: string; ref_id: string; title: string; status: string
  gross_cents: number; net_cents: number; created_at: string
  available_at: string | null; paid_at: string | null
}
type SeriesPoint = { day: string; net_cents: number; count: number }
/** Venda feita com o cupom do usuário — aba "Cupom" do extinto /account/afiliado. */
type CouponSale = {
  id: string
  created_at: string
  status: string
  coupon_code: string | null
  buyer: { id: string; name: string | null; email: string | null }
  item: { name: string | null; count: number }
  amounts: { discount_cents: number; final_cents: number; commission_cents: number }
}
type MarketItem = {
  symbol: string; kind: string; label: string; price: number | null
  change_pct: number | null; currency: string; logo_url: string | null
}
type NewsItem = { id: number; source?: string; category: string; title: string; url: string; thumb_url?: string | null; published_at?: string | null }

/** Qual dos três botões retráteis está com o painel no ar. */
type PanelKey = "vaquinha" | "coupon" | "market"

const RANGES = [
  { key: "7d", label: "7 dias", labelKey: "range7d" },
  { key: "30d", label: "30 dias", labelKey: "range30d" },
  { key: "90d", label: "90 dias", labelKey: "range90d" },
]
const KIND_FILTERS = [
  { key: "all", label: "Todos", labelKey: "filterAll" },
  { key: "product", label: "Loja", labelKey: "kindStore" },
  { key: "service", label: "Serviço", labelKey: "kindService" },
  { key: "course", label: "Curso", labelKey: "kindCourse" },
  { key: "affiliate", label: "Afiliado", labelKey: "kindAffiliate" },
  // "Cupom" não é um `kind` de ganho: é a lista de VENDAS feitas com o cupom do
  // usuário, que vive noutro endpoint. Fica no mesmo trilho de filtros porque,
  // para quem olha, é mais um recorte do mesmo extrato.
  { key: "coupon", label: "Cupom", labelKey: "filterCoupon" },
]

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function WalletPage() {
  const tr = useTranslations("Wallet")
  const locale = useLocale()
  const { perfil, setPerfil, isLoading: perfilLoading } = useMeProfile()
  const vaquinhaFlag = useFeature("vaquinha")
  const vaquinhaPref = useUserFeature("vaquinha")
  // Comunidade (pet/carro/games/bairro/condomínio) mora na MESMA tabela dos
  // perfis, então filtrar só `is_clan` fazia "Meu pet" e "Meu carro" aparecerem
  // aqui como se fossem perfis. Não existe hierarquia: a lista é a dos perfis
  // do dono — o primeiro e os abertos depois, todos no mesmo grau.
  const ownProfiles = useMemo(
    () => (perfil?.profiles || []).filter((p) => !p.is_clan && !p.is_community),
    [perfil]
  )

  const [profileId, setProfileId] = useState<string>("")
  const [range, setRange] = useState("30d")
  const [kind, setKind] = useState("all")
  const [panel, setPanel] = useState<PanelKey | null>(null)

  const [agg, setAgg] = useState<Agg | null>(null)
  const [items, setItems] = useState<Earning[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [series, setSeries] = useState<SeriesPoint[]>([])
  const [couponSales, setCouponSales] = useState<CouponSale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [couponCopied, setCouponCopied] = useState(false)
  const [generatingCoupon, setGeneratingCoupon] = useState(false)
  /** Entradas manuais da Vida Financeira, somadas desde sempre. */
  const [manualInCents, setManualInCents] = useState(0)

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null)

  const load = useCallback(
    async (pg: number, replace: boolean) => {
      const t = token()
      if (!t) return
      if (replace) setLoading(true)
      setError("")
      const pq = profileId ? `&profile=${encodeURIComponent(profileId)}` : ""
      const isCoupon = kind === "coupon"
      // No recorte "Cupom" os KPIs seguem sendo os da conta inteira: eles somam
      // GANHOS, e venda com cupom é outra coisa (o que entra dela já aparece
      // como comissão em "Afiliado"). Filtrar os dois juntos zeraria a tela.
      const kq = kind && kind !== "all" && !isCoupon ? `&kind=${kind}` : ""
      try {
        const [eRes, sRes, cRes] = await Promise.all([
          clientFetchWithTimeout(`/api/me/earnings?page=${isCoupon ? 1 : pg}&per_page=24${pq}${kq}`, { headers: { Authorization: `Bearer ${t}` } }, 9000),
          replace
            ? clientFetchWithTimeout(`/api/me/earnings/series?range=${range}${pq}`, { headers: { Authorization: `Bearer ${t}` } }, 9000)
            : Promise.resolve(null),
          isCoupon
            ? clientFetchWithTimeout(`/api/me/earnings/coupon-sales?page=${pg}&per_page=24`, { headers: { Authorization: `Bearer ${t}` } }, 9000)
            : Promise.resolve(null),
        ])
        if (!eRes.ok) throw new Error(tr("loadStatementError", "Falha ao carregar extrato"))
        const eData = await eRes.json()
        setAgg(eData.aggregates || null)
        if (isCoupon) {
          if (!cRes || !cRes.ok) throw new Error(tr("loadStatementError", "Falha ao carregar extrato"))
          const cData = await cRes.json()
          setTotalPages(cData.pagination?.total_pages || 1)
          setCouponSales((prev) => (replace ? cData.items || [] : [...prev, ...(cData.items || [])]))
        } else {
          setTotalPages(eData.pagination?.total_pages || 1)
          setItems((prev) => (replace ? eData.items || [] : [...prev, ...(eData.items || [])]))
        }
        if (sRes && sRes.ok) setSeries((await sRes.json()).series || [])
      } catch (e) {
        setError(e instanceof Error ? e.message : tr("loadError", "Erro ao carregar"))
      } finally {
        setLoading(false)
      }
    },
    [profileId, range, kind, tr]
  )

  useEffect(() => {
    setPage(1)
    void load(1, true)
  }, [load])

  /**
   * A metade "sua" do Total recebido. Fica FORA do `load` de propósito: não
   * depende de perfil nem de período, então trocar o filtro do extrato não
   * precisa buscá-la de novo. Só o que a Vida Financeira muda a invalida.
   */
  const loadManualIn = useCallback(async () => {
    const t = token()
    if (!t) return
    try {
      const r = await clientFetchWithTimeout(
        "/api/me/wallet/finance/received-in",
        { headers: { Authorization: `Bearer ${t}` } },
        9000
      )
      if (r.ok) setManualInCents(Number((await r.json())?.received_in_cents) || 0)
    } catch {
      /* silencioso: o KPI cai para só o lado da plataforma */
    }
  }, [])

  useEffect(() => {
    void loadManualIn()
  }, [loadManualIn])

  const totals = agg?.totals || {}
  const showingCoupon = kind === "coupon"
  const rowCount = showingCoupon ? couponSales.length : items.length

  const handleCopyCoupon = (code: string) => {
    void navigator.clipboard.writeText(code)
    setCouponCopied(true)
    setTimeout(() => setCouponCopied(false), 2000)
  }

  const handleGenerateCoupon = async () => {
    const t = token()
    if (!t || generatingCoupon) return
    setGeneratingCoupon(true)
    try {
      const res = await fetch("/api/users/me/coupon", {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
      })
      if (res.ok) {
        const data = await res.json()
        const code = data.coupon_code ?? data.code ?? data.coupon
        if (code) setPerfil((prev) => (prev ? { ...prev, coupon_code: code } : prev))
      }
    } catch {
      /* silencioso: o botão volta ao normal e a pessoa tenta de novo */
    } finally {
      setGeneratingCoupon(false)
    }
  }

  /**
   * Os três botões retráteis DESTA superfície.
   *
   * Mesma mecânica do headcard do perfil (um aberto por vez, o primeiro clique
   * só revela o rótulo e o segundo é que age), outro conteúdo: aqui nenhum
   * navega — cada um abre um painel logo abaixo. Apertar o que já está aberto
   * fecha, senão o único jeito de recolher seria o X do painel.
   *
   * O cofrinho é o único que pode faltar: a Vaquinha é função com flag do admin
   * E preferência da pessoa (mesma regra do menu lateral).
   */
  const pills = useMemo<PillSpec[]>(() => {
    const toggle = (key: PanelKey) => () => setPanel((prev) => (prev === key ? null : key))
    const list: PillSpec[] = []
    if (vaquinhaFlag && vaquinhaPref) {
      list.push({
        key: "vaquinha",
        icon: PiggyBank,
        label: tr("vaquinhaPill", "Vaquinha"),
        ariaLabel: tr("vaquinhaPillAria", "Abrir minha vaquinha"),
        bg: "#15803D",
        bgHover: "#0F5F2E",
        onOpen: toggle("vaquinha"),
        active: panel === "vaquinha",
      })
    }
    list.push({
      key: "coupon",
      icon: Percent,
      label: tr("couponPill", "Meu cupom"),
      ariaLabel: tr("couponPillAria", "Meu cupom, extrato e painel do afiliado"),
      bg: "#C2410C",
      bgHover: "#9A3412",
      onOpen: toggle("coupon"),
      active: panel === "coupon",
    })
    list.push({
      key: "market",
      icon: BarChart3,
      label: tr("marketPill", "Mercado"),
      ariaLabel: tr("marketPillAria", "Notícias de mercado, cotações e ações em alta"),
      bg: GREEN_DEEP,
      bgHover: "#046A55",
      onOpen: toggle("market"),
      active: panel === "market",
    })
    return list
  }, [vaquinhaFlag, vaquinhaPref, panel, tr])

  return (
    <main className="fl-root fl-paper-texture relative min-h-[100dvh] overflow-x-clip pb-24">
      <Halftone className="absolute left-3 top-40 h-24 w-24 opacity-[0.1]" />

      {/* HEADCARD — é a MANCHETE da página: a foto com os três botões
          retráteis atrás dela e, no lugar onde antes ficavam o nome e o @, o
          próprio título "Carteira". A hero solta que existia acima daqui
          morreu: eram dois blocos dizendo a mesma coisa, e o espaço entre eles
          empurrava o conteúdo de verdade para fora da primeira tela.

          A pilha é o PRIMEIRO filho da coluna do avatar e o card da foto vem
          depois no DOM: sem z-index, quem pinta por último cobre, então a foto
          esconde o corpo do botão e só o ícone escapa pela direita. É a mesma
          armadilha já paga no headcard do perfil — `-z-10` funcionaria aqui e
          quebraria lá, por isso a regra é a ordem do DOM. */}
      <section className="mx-auto w-full max-w-6xl px-3 pt-5 md:px-8 md:pt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/account"
            className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#C9C2B6] transition hover:text-[#F1EDE2]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {tr("back", "Voltar")}
          </Link>
          {perfil?.username && (
            <span className="inline-flex items-center gap-2 bg-[#0B0B0D] px-3 py-1.5 text-[#F1EDE2]">
              <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: GREEN }} />
              <span className="text-[11px] font-extrabold uppercase tracking-[0.2em]">@{perfil.username}</span>
            </span>
          )}
        </div>

        <div className="border-2 border-[#0B0B0D] bg-[#F1EDE2] p-4 shadow-[5px_5px_0_0_#0B0B0D] sm:p-5">
          <div className="flex items-center gap-3 md:gap-5">
            {/* TRÊS CAMADAS, de trás para a frente: título → botões → foto.
                O `z-10` desta coluna é o que põe os botões NA FRENTE da
                tipografia (sem ele o título, que vem depois no DOM, pintava por
                cima do rótulo aberto e cortava a palavra no meio). Como a
                coluna inteira sobe junto, a foto continua cobrindo o corpo do
                botão pela ordem do DOM lá dentro — nada de z-index na foto. */}
            <div className="relative z-10 flex shrink-0 flex-col items-center">
              <PillStack
                pills={pills}
                avatarPadClass="pl-28 md:pl-32"
                className="absolute left-0 top-1/2 -translate-y-1/2"
              />
              {/* Mesma geometria do headcard do perfil: a foto precisa cobrir a
                  pilha (`PILL_STACK_PX`, 120px), e a largura casa com o
                  `avatarPadClass` acima. Aqui a pilha é outra (cofrinho, cupom
                  e mercado), mas a mecânica e o tamanho são os mesmos. */}
              <div className="w-28 -rotate-3 md:w-32">
                <div className="flex aspect-[2/3] w-full items-center justify-center overflow-hidden border-4 border-[#F1EDE2] bg-[#0B0B0D]/[0.07] shadow-[6px_6px_0_0_#16B79A] ring-2 ring-[#0B0B0D]">
                  {perfil?.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={perfil.avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="fl-display text-3xl text-[#0B0B0D]">{initialsOf(perfil?.nome)}</span>
                  )}
                </div>
              </div>
            </div>

            {/* A folga tem que passar dos ÍCONES, não da foto: os botões
                nascem atrás dela e cada ícone escapa uns 42px para cá. Com
                folga só da largura da foto, o título começava debaixo deles.
                O título usa clamp porque divide a linha com a foto — em vw puro
                ele estouraria a caixa nos celulares estreitos. */}
            <div className="min-w-0 flex-1 pl-16 md:pl-24">
              <p className="fl-marker text-xl leading-none md:text-2xl" style={{ color: GREEN_DEEP }}>
                {tr("heroEyebrow", "a sua grana")}
              </p>
              <h1 className="relative mt-1 min-w-0">
                <span className="fl-display block text-[clamp(2.1rem,9vw,4.25rem)] leading-[0.84] text-[#0B0B0D]">
                  {tr("heroTitle", "Carteira")}<span style={{ color: GREEN_DEEP }}>.</span>
                </span>
                <Underline className="absolute -bottom-1 left-0.5 h-3 w-[52%] max-w-[220px]" style={{ color: GREEN }} />
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* PAINEL DO BOTÃO ABERTO — vem logo abaixo do headcard porque é o que a
          pessoa acabou de pedir; o painel financeiro fixo (KPIs, MEI, gráfico,
          Vida Financeira) continua embaixo, valendo para os três. */}
      {panel && (
        <section className="mx-auto mt-5 w-full max-w-6xl px-3 md:px-8">
          {panel === "vaquinha" && (
            <PanelShell
              title={tr("myVaquinhaTitle", "Minha vaquinha")}
              icon={<PiggyBank className="h-4 w-4" />}
              onClose={() => setPanel(null)}
              closeLabel={tr("close", "Fechar")}
            >
              <div className="border-2 border-[#0B0B0D] bg-[#F1EDE2] p-4 shadow-[5px_5px_0_0_#0B0B0D] sm:p-5">
                <Link
                  href="/vaquinha/nova"
                  className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5"
                  style={{ background: GREEN }}
                >
                  <PiggyBank className="h-4 w-4" />
                  {tr("myVaquinhaCta", "Abrir minha vaquinha")}
                </Link>
                <p className="mt-3 max-w-lg text-[12px] leading-relaxed text-[#6B6457]">
                  {tr("myVaquinhaHint", "Arrecade para um objetivo seu. Se você já tem uma, o botão abre a que existe.")}
                </p>
              </div>
            </PanelShell>
          )}

          {panel === "coupon" && (
            <PanelShell
              title={tr("myCouponTitle", "Meu cupom")}
              icon={<Percent className="h-4 w-4" />}
              onClose={() => setPanel(null)}
              closeLabel={tr("close", "Fechar")}
            >
              {/* O cupom, quem comprou com ele (extrato) e o painel do afiliado
                  vivem juntos de propósito: são as três metades da mesma
                  pergunta — "quanto o meu cupom rendeu, de quem, e para onde
                  esse dinheiro vai". */}
              <div className="border-2 border-[#0B0B0D] bg-[#F1EDE2] p-4 shadow-[5px_5px_0_0_#0B0B0D]">
                <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6B6457]">
                  <Ticket className="h-3.5 w-3.5" /> {tr("myCouponTitle", "Meu cupom")}
                </p>
                {perfil?.coupon_code ? (
                  <>
                    <button
                      type="button"
                      data-tour="account-coupon"
                      onClick={() => handleCopyCoupon(perfil.coupon_code!)}
                      className="mt-2 inline-flex items-center gap-2 border-2 border-dashed border-[#0B0B0D]/45 px-3 py-2 font-mono text-sm font-black tracking-[0.18em] text-[#0B0B0D] transition hover:border-solid"
                      style={{ background: couponCopied ? GREEN : "transparent" }}
                    >
                      {couponCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {perfil.coupon_code}
                    </button>
                    <p className="mt-2 text-[11px] leading-relaxed text-[#6B6457]">
                      {tr("myCouponHint", "Compartilhe: quem comprar na plataforma com ele fica vinculado a você e gera comissão.")}
                    </p>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      data-tour="account-coupon"
                      onClick={handleGenerateCoupon}
                      disabled={generatingCoupon}
                      className="mt-2 inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5 disabled:opacity-50"
                      style={{ background: GREEN }}
                    >
                      {generatingCoupon && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {generatingCoupon ? tr("generating", "Gerando...") : tr("generateCoupon", "Gerar cupom")}
                    </button>
                    <p className="mt-2 text-[11px] leading-relaxed text-[#6B6457]">
                      {tr("myCouponEmptyHint", "Você ainda não tem cupom. Gere o seu e comece a indicar.")}
                    </p>
                  </>
                )}
              </div>

              {/* Extrato — o recorte "Cupom" é a listagem de quem comprou com
                  ele; os outros recortes seguem sendo o extrato inteiro. */}
              <div className="mt-10">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                  <div className="relative">
                    <h3 className="fl-display text-4xl text-[#F1EDE2] md:text-5xl">{tr("statement", "Extrato")}</h3>
                    <Underline className="absolute -bottom-2 left-0 h-3.5 w-32" style={{ color: GREEN }} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {KIND_FILTERS.map((f) => {
                      const active = kind === f.key
                      return (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => setKind(f.key)}
                          className={cn(
                            "border-2 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] transition-transform hover:-translate-y-0.5",
                            active
                              ? "border-[#0B0B0D] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]"
                              : "border-[#F1EDE2]/25 bg-transparent text-[#F1EDE2] hover:border-[#F1EDE2]"
                          )}
                          style={active ? { background: GREEN } : undefined}
                        >
                          {tr(f.labelKey, f.label)}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {loading && rowCount === 0 ? (
                  <ExtratoSkeleton />
                ) : error ? (
                  <StateBox
                    icon={<AlertCircle className="h-6 w-6" />}
                    title={tr("loadFailedTitle", "Não deu pra carregar.")}
                    desc={error}
                    action={
                      <button
                        type="button"
                        onClick={() => load(1, true)}
                        className="border-2 border-[#0B0B0D] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5"
                        style={{ background: GREEN }}
                      >
                        {tr("tryAgain", "Tentar de novo")}
                      </button>
                    }
                  />
                ) : rowCount === 0 ? (
                  <StateBox
                    icon={showingCoupon ? <Ticket className="h-6 w-6" /> : <Inbox className="h-6 w-6" />}
                    title={
                      showingCoupon
                        ? tr("couponSalesEmptyTitle", "Nenhuma venda com seu cupom ainda")
                        : tr("emptyTitle", "Nenhum ganho ainda.")
                    }
                    desc={
                      showingCoupon
                        ? tr("couponSalesEmptyHint", "Compartilhe seu cupom de afiliado pra começar a ver vendas aqui.")
                        : tr("emptyDesc", "Quando você vender na Loja, fechar um agendamento, vender um curso ou receber comissão de afiliado, aparece aqui.")
                    }
                  />
                ) : (
                  <>
                    <div className="flex flex-col gap-3">
                      {showingCoupon
                        ? couponSales.map((sale) => <CouponSaleRow key={sale.id} sale={sale} />)
                        : items.map((it) => <ExtratoRow key={`${it.kind}-${it.id}`} it={it} />)}
                    </div>
                    {page < totalPages && (
                      <div className="mt-6 flex justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            const next = page + 1
                            setPage(next)
                            void load(next, false)
                          }}
                          className="inline-flex items-center gap-2 border-2 border-[#F1EDE2]/25 px-5 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#F1EDE2] transition hover:border-[#F1EDE2]"
                        >
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          {tr("loadMore", "Carregar mais")}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* AFILIADO — herdado do extinto /account/afiliado. */}
              <div className="mt-12">
                <div className="mb-6 relative">
                  <h3 className="fl-display text-4xl text-[#F1EDE2] md:text-5xl">
                    {tr("affiliateSection", "Afiliado")}
                  </h3>
                  <Underline className="absolute -bottom-2 left-0 h-3.5 w-28" style={{ color: GREEN }} />
                </div>
                <AfiliadoPanel />
              </div>
            </PanelShell>
          )}

          {panel === "market" && (
            <PanelShell
              title={tr("market", "Mercado")}
              icon={<BarChart3 className="h-4 w-4" />}
              onClose={() => setPanel(null)}
              closeLabel={tr("close", "Fechar")}
            >
              <MarketPanel />
            </PanelShell>
          )}
        </section>
      )}

      {/* VIDA FINANCEIRA — grudada no headcard (só a folga da sombra dura).
          É o que a pessoa vem fazer aqui todo dia: lançar o que entrou e o que
          saiu. Estava no fim da página, depois de KPIs, MEI e gráfico, e por
          isso só aparecia depois de duas telas de rolagem. */}
      <section className="mx-auto mt-3 w-full max-w-6xl px-3 md:px-8">
        <VidaFinanceira onEntriesChanged={loadManualIn} />
      </section>

      {/* GANHOS NA PLATAFORMA — escopo, KPIs, MEI e gráfico. Vem depois porque
          é retrato (o que a plataforma já te pagou), não lançamento. */}
      <section className="mx-auto mt-8 w-full max-w-6xl px-3 md:px-8">
        <div className="min-w-0">
          {/* CONTROLES DE ESCOPO — valem para os KPIs, o gráfico e o extrato. */}
          <div className="flex flex-col gap-3 border-y-2 border-[#F1EDE2]/12 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#C9C2B6]">{tr("period", "Período")}</span>
              <div className="flex gap-1.5">
                {RANGES.map((r) => {
                  const active = range === r.key
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setRange(r.key)}
                      className={cn(
                        "border-2 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] transition-transform hover:-translate-y-0.5",
                        active
                          ? "border-[#0B0B0D] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]"
                          : "border-[#F1EDE2]/25 bg-transparent text-[#F1EDE2] hover:border-[#F1EDE2]"
                      )}
                      style={active ? { background: GREEN } : undefined}
                    >
                      {tr(r.labelKey, r.label)}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Select de perfil */}
            <div className="relative">
              <select
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
                disabled={perfilLoading}
                className="h-11 w-full appearance-none border-2 border-[#F1EDE2]/25 bg-transparent px-4 pr-10 text-sm font-bold uppercase tracking-wide text-[#F1EDE2] outline-none transition focus:border-[#16B79A] sm:min-w-[240px]"
              >
                <option value="" className="bg-[#1D1810]">{tr("allProfiles", "Todos os perfis")}</option>
                {ownProfiles.map((p) => (
                  <option key={p.id_profile} value={p.id_profile} className="bg-[#1D1810]">
                    {p.display_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#F1EDE2]" />
            </div>
          </div>
          {profileId && (
            <p className="mt-2 text-[11px] text-[#C9C2B6]/70">
              {tr("courseAffiliateNote", "Curso e Afiliado são por conta — não filtram por perfil.")}{" "}
              {tr("manualInAccountNote", "Suas entradas da Vida Financeira também são da conta e seguem no Total recebido.")}
            </p>
          )}

          {/* KPIs */}
          {/* "Revertido" veio do Meus Faturamentos: sem ele, reembolso e
              cancelamento sumiam da conta e o extrato não fechava. */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Kpi label={tr("kpiReceived", "Recebido")} value={brl(totals.received, locale)} accent />
            <Kpi label={tr("kpiAvailable", "Disponível")} value={brl(totals.available, locale)} />
            <Kpi label={tr("kpiPending", "Aguardando")} value={brl(totals.pending, locale)} />
            <Kpi label={tr("kpiReversed", "Revertido")} value={brl(totals.reversed, locale)} />
            <Kpi label={tr("kpiEntries", "Lançamentos")} value={String(totals.count || 0)} />
            {/* TOTAL RECEBIDO = o que a plataforma pagou + o que a pessoa
                lançou como entrada na Vida Financeira.
                A conta é honesta porque as DUAS metades são vitalícias: os
                KPIs vizinhos não filtram por data (o seletor de período move só
                o gráfico) e a soma manual conta tudo que já venceu.
                Ressalva que a legenda precisa dizer: a Vida Financeira é da
                CONTA — não existe lançamento manual por perfil —, então com um
                perfil selecionado só a metade da plataforma encolhe. */}
            <Kpi
              label={tr("kpiTotalReceived", "Total recebido")}
              value={brl((totals.received || 0) + manualInCents, locale)}
              hint={tr("kpiTotalReceivedHint", "plataforma + suas entradas")}
              emphasis
            />
          </div>

          {/* MEI — termômetro do teto + recibo */}
          <div className="mt-3">
            <MeiCard />
          </div>

          {/* Gráfico */}
          <div className="mt-3 border-2 border-[#0B0B0D] bg-[#F1EDE2] p-4 shadow-[5px_5px_0_0_#0B0B0D] sm:p-5">
            <h2 className="mb-4 flex items-center gap-2 fl-display text-2xl text-[#0B0B0D]">
              <BarChart3 className="h-5 w-5" /> {tr("earningsPerDay", "Ganhos por dia")}
            </h2>
            <EarningsBars series={series} loading={loading} />
          </div>

        </div>
      </section>
    </main>
  )
}

/* ── Moldura do painel de um botão retrátil ───────────────────────────────── */
function PanelShell({
  title,
  icon,
  onClose,
  closeLabel,
  children,
}: {
  title: string
  icon: ReactNode
  onClose: () => void
  closeLabel: string
  children: ReactNode
}) {
  return (
    <div className="border-l-4 pl-4 md:pl-5" style={{ borderColor: GREEN }}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 fl-display text-3xl text-[#F1EDE2] md:text-4xl">
          <span
            className="inline-flex h-7 w-7 items-center justify-center border-2 border-[#0B0B0D] text-[#06251F]"
            style={{ background: GREEN }}
          >
            {icon}
          </span>
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          title={closeLabel}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[#F1EDE2]/25 text-[#F1EDE2] transition hover:border-[#F1EDE2]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  )
}

/* ── KPI ──────────────────────────────────────────────────────────────────── */
/**
 * `accent` = o verde do "Recebido". `emphasis` = o fundo preto do "Total
 * recebido": ele é a SOMA dos outros, e repetir o verde do Recebido faria os
 * dois parecerem o mesmo número.
 */
function Kpi({
  label,
  value,
  accent,
  emphasis,
  hint,
}: {
  label: string
  value: string
  accent?: boolean
  emphasis?: boolean
  hint?: string
}) {
  const bg = emphasis ? INK : accent ? GREEN : PAPER
  return (
    <div className="border-2 border-[#0B0B0D] p-3.5 shadow-[5px_5px_0_0_#0B0B0D]" style={{ background: bg }}>
      <p
        className={cn(
          "text-[10px] font-extrabold uppercase tracking-[0.14em]",
          emphasis ? "text-[#C9C2B6]" : accent ? "text-[#06251F]" : "text-[#6B6457]"
        )}
      >
        {label}
      </p>
      <p
        className="mt-1 fl-display text-2xl leading-none sm:text-[1.7rem]"
        style={{ color: emphasis ? GREEN : accent ? INK : GREEN_DEEP }}
      >
        {value}
      </p>
      {hint && (
        <p className={cn("mt-1 text-[9px] font-bold uppercase tracking-[0.1em]", emphasis ? "text-[#8A8378]" : "text-[#6B6457]")}>
          {hint}
        </p>
      )}
    </div>
  )
}

/* ── Gráfico de barras ────────────────────────────────────────────────────── */
function EarningsBars({ series, loading }: { series: SeriesPoint[]; loading: boolean }) {
  const tr = useTranslations("Wallet")
  const locale = useLocale()
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(false)
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [series])

  if (loading && series.length === 0) {
    return <div className="h-40 animate-pulse border-2 border-dashed border-[#0B0B0D]/20" />
  }
  const max = Math.max(1, ...series.map((p) => p.net_cents))
  const hasData = series.some((p) => p.net_cents > 0)
  const step = series.length > 31 ? 13 : series.length > 10 ? 5 : 2

  return (
    <div>
      <div className="flex h-40 items-end gap-[3px] sm:gap-1">
        {series.map((p, i) => {
          const h = hasData ? Math.max(2, Math.round((p.net_cents / max) * 100)) : 2
          return (
            <div key={p.day} className="flex flex-1 items-end justify-center">
              <div
                title={`${shortDay(p.day, locale)} · ${brl(p.net_cents, locale)}`}
                className="w-full origin-bottom border border-[#0B0B0D] transition-transform duration-500 ease-out"
                style={{
                  height: `${h}%`,
                  background: p.net_cents > 0 ? GREEN : "#0B0B0D14",
                  transform: mounted ? "scaleY(1)" : "scaleY(0)",
                  transitionDelay: `${Math.min(i * 12, 360)}ms`,
                }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-wide text-[#6B6457]">
        {series.map((p, i) => (
          <span key={p.day} className="flex-1 text-center">
            {i % step === 0 ? shortDay(p.day, locale) : ""}
          </span>
        ))}
      </div>
      {!hasData && <p className="mt-3 text-center text-xs font-semibold text-[#6B6457]">{tr("noMovement", "Sem movimento neste período.")}</p>}
    </div>
  )
}

/* ── Linha do extrato (card de papel reto, sombra dura) ───────────────────── */
function ExtratoRow({ it }: { it: Earning }) {
  const tr = useTranslations("Wallet")
  const locale = useLocale()
  const km = KIND_META[it.kind] || { label: it.kind, labelKey: "", Icon: Wallet }
  const sm = STATUS_META[it.status] || { label: it.status, labelKey: "", cls: "bg-[#0B0B0D] text-[#F1EDE2]" }
  const date = it.paid_at || it.available_at || it.created_at
  return (
    <div className="group flex items-center gap-3 border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-3 shadow-[5px_5px_0_0_#0B0B0D] transition-transform duration-200 hover:-translate-y-1 hover:-rotate-[0.4deg] hover:shadow-[8px_8px_0_0_#16B79A] md:px-4">
      <span className="inline-flex h-11 w-11 shrink-0 -rotate-2 items-center justify-center border-2 border-[#0B0B0D]" style={{ background: GREEN, outline: "2px solid #0B0B0D", outlineOffset: "1px" }}>
        <km.Icon className="h-5 w-5 text-[#06251F]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="fl-display truncate text-lg leading-none text-[#0B0B0D] md:text-xl">{it.title}</h4>
          <span className="-rotate-1 bg-[#0B0B0D] px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.12em] text-[#F1EDE2]">
            {km.labelKey ? tr(km.labelKey, km.label) : km.label}
          </span>
        </div>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">{fmtDate(date, locale)}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="fl-display text-xl leading-none md:text-2xl" style={{ color: GREEN_DEEP }}>{brl(it.net_cents, locale)}</span>
        <span className={cn("px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.12em]", sm.cls)}>{sm.labelKey ? tr(sm.labelKey, sm.label) : sm.label}</span>
      </div>
    </div>
  )
}

/**
 * Linha do recorte "Cupom": uma VENDA feita com o cupom do usuário (quem
 * comprou, o que levou, quanto pagou e quanto virou comissão). É a única lista
 * do extinto /account/afiliado que não sai de `/me/earnings`.
 */
function CouponSaleRow({ sale }: { sale: CouponSale }) {
  const tr = useTranslations("Wallet")
  const locale = useLocale()
  const sm = STATUS_META[sale.status] || { label: sale.status, labelKey: "", cls: "bg-[#0B0B0D] text-[#F1EDE2]" }
  const buyerLabel = sale.buyer?.name || sale.buyer?.email || tr("buyer", "Comprador")
  const itemLabel = sale.item?.name
    ? sale.item.count > 1
      ? `${sale.item.name} +${sale.item.count - 1}`
      : sale.item.name
    : `${sale.item?.count || 0} ${tr("itemsCount", "item(s)")}`
  return (
    <div className="group flex items-center gap-3 border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-3 shadow-[5px_5px_0_0_#0B0B0D] transition-transform duration-200 hover:-translate-y-1 hover:-rotate-[0.4deg] hover:shadow-[8px_8px_0_0_#16B79A] md:px-4">
      <span className="inline-flex h-11 w-11 shrink-0 -rotate-2 items-center justify-center border-2 border-[#0B0B0D]" style={{ background: GREEN, outline: "2px solid #0B0B0D", outlineOffset: "1px" }}>
        <Ticket className="h-5 w-5 text-[#06251F]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="fl-display truncate text-lg leading-none text-[#0B0B0D] md:text-xl">{buyerLabel}</h4>
          {sale.coupon_code && (
            <span className="-rotate-1 bg-[#0B0B0D] px-1.5 py-0.5 font-mono text-[8px] font-extrabold uppercase tracking-[0.12em] text-[#F1EDE2]">
              {sale.coupon_code}
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-[12px] font-semibold text-[#6B6457]">{itemLabel}</p>
        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">
          {fmtDate(sale.created_at, locale)}
          {sale.amounts?.discount_cents > 0 && (
            <> · {tr("discount", "desconto")} {brl(sale.amounts.discount_cents, locale)}</>
          )}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="fl-display text-xl leading-none md:text-2xl" style={{ color: GREEN_DEEP }}>
          +{brl(sale.amounts?.commission_cents, locale)}
        </span>
        <span className="text-[11px] font-bold tabular-nums text-[#6B6457]">
          {tr("saleOf", "venda de")} {brl(sale.amounts?.final_cents, locale)}
        </span>
        <span className={cn("px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.12em]", sm.cls)}>
          {sm.labelKey ? tr(sm.labelKey, sm.label) : sm.label}
        </span>
      </div>
    </div>
  )
}

/* ── Estados ──────────────────────────────────────────────────────────────── */
function StateBox({ icon, title, desc, action }: { icon: ReactNode; title: string; desc: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center border-2 border-dashed border-[#F1EDE2]/15 px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center text-[#06251F]" style={{ background: GREEN }}>{icon}</span>
      <p className="mt-4 fl-display text-2xl text-[#F1EDE2]">{title}</p>
      <p className="mt-1 max-w-md text-xs leading-5 text-[#C9C2B6]/70">{desc}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
function ExtratoSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-[72px] animate-pulse border-2 border-[#F1EDE2]/10 bg-[#1D1810]" />
      ))}
    </div>
  )
}

/* ═══ Painel de mercado ══════════════════════════════════════════════════════ */
/**
 * Era uma barra lateral fixa (e um slide-over no celular). Virou painel do
 * botão "Mercado": no desktop as três seções ficam lado a lado, porque agora
 * há a largura inteira da página em vez de uma coluna de 340px.
 *
 * O snapshot continua vindo do cache do backend numa requisição só, disparada
 * UMA vez por montagem (`fetched`): abrir e fechar o painel não refaz a busca.
 */
function MarketPanel() {
  const tr = useTranslations("Wallet")
  const [data, setData] = useState<{ stocks: MarketItem[]; quotes: MarketItem[]; news: NewsItem[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(false)
  const fetched = useRef(false)

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true
    clientFetchWithTimeout("/api/market/snapshot", { cache: "no-store" }, 9000)
      .then((r) => r.json())
      .then((d) => setData({ stocks: d.stocks || [], quotes: d.quotes || [], news: d.news || [] }))
      .catch(() => setErr(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="border-2 border-[#0B0B0D] bg-[#F1EDE2] p-4 shadow-[5px_5px_0_0_#0B0B0D]">
        <MarketSection title={tr("marketPolitics", "Mercado & política")} icon={<Newspaper className="h-4 w-4" />}>
          {loading ? <RowsSkeleton n={3} /> : data?.news?.length ? (
            data.news.map((n) => <NewsRow key={n.id} item={n} />)
          ) : (
            <Muted>{tr("noHeadlines", "Sem manchetes por enquanto.")}</Muted>
          )}
        </MarketSection>
      </div>
      <div className="border-2 border-[#0B0B0D] bg-[#F1EDE2] p-4 shadow-[5px_5px_0_0_#0B0B0D]">
        <MarketSection title={tr("quotes", "Cotações")} icon={<LineChart className="h-4 w-4" />}>
          {loading ? <RowsSkeleton n={4} /> : err || !data?.quotes.length ? (
            <Muted>{tr("noQuotes", "Cotações indisponíveis no momento.")}</Muted>
          ) : (
            data.quotes.map((q) => <QuoteRow key={q.symbol} item={q} />)
          )}
        </MarketSection>
      </div>
      <div className="border-2 border-[#0B0B0D] bg-[#F1EDE2] p-4 shadow-[5px_5px_0_0_#0B0B0D]">
        <MarketSection title={tr("stocksUp", "Ações em alta")} icon={<TrendingUp className="h-4 w-4" />}>
          {loading ? <RowsSkeleton n={4} /> : err || !data?.stocks.length ? (
            <Muted>{tr("noStocks", "Sem dados de ações no momento.")}</Muted>
          ) : (
            data.stocks.slice(0, 5).map((s) => <QuoteRow key={s.symbol} item={s} />)
          )}
        </MarketSection>
      </div>
    </div>
  )
}

function MarketSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#6B6457]">
        {icon} {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}
function QuoteRow({ item }: { item: MarketItem }) {
  const locale = useLocale()
  const up = (item.change_pct ?? 0) >= 0
  const isPts = item.currency === "pts"
  const small = item.price != null && item.price < 1
  const price = item.price == null
    ? "—"
    : isPts
      ? item.price.toLocaleString(locale, { maximumFractionDigits: 0 })
      : item.price.toLocaleString(locale, {
          style: "currency", currency: "BRL",
          minimumFractionDigits: small ? 4 : 2, maximumFractionDigits: small ? 4 : 2,
        })
  return (
    <div className="flex items-center justify-between gap-2 border border-[#0B0B0D]/20 bg-white/60 px-2.5 py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        {item.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.logo_url} alt="" className="h-5 w-5 shrink-0 object-contain" />
        ) : (
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center border border-[#0B0B0D]/40 text-[9px] font-black text-[#0B0B0D]">
            {item.symbol.replace(/[^A-Z]/g, "").slice(0, 2) || "$"}
          </span>
        )}
        <span className="truncate text-xs font-extrabold uppercase tracking-wide text-[#0B0B0D]">{item.label}</span>
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <span className="text-xs font-black tabular-nums text-[#0B0B0D]">{price}</span>
        <span className={cn("flex items-center gap-0.5 text-[10px] font-bold tabular-nums", up ? "text-[#00876B]" : "text-[#9A3412]")}>
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {pct(item.change_pct)}
        </span>
      </div>
    </div>
  )
}
function NewsRow({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 border border-[#0B0B0D]/20 bg-white/60 p-2 transition hover:border-[#0B0B0D]"
    >
      <span className="h-12 w-16 shrink-0 overflow-hidden border border-[#0B0B0D]/30 bg-[#0B0B0D]/[0.06]">
        {item.thumb_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumb_url} alt="" className="h-full w-full object-cover" />
        ) : null}
      </span>
      <div className="min-w-0">
        <p className="line-clamp-2 text-[11px] font-bold leading-snug text-[#0B0B0D]">{item.title}</p>
        {item.source && <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6B6457]">{item.source}</p>}
      </div>
    </a>
  )
}
function RowsSkeleton({ n }: { n: number }) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-9 animate-pulse border border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.05]" />
      ))}
    </div>
  )
}
function Muted({ children }: { children: ReactNode }) {
  return <p className="px-1 py-2 text-xs font-semibold text-[#6B6457]">{children}</p>
}
