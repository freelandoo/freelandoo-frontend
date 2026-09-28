"use client"

/**
 * RELATÓRIO DE MERCADO LOCAL (2026-09-28).
 *
 * "Quanto os barbeiros estão cobrando na minha região?" — a mediana, a faixa
 * do meio (p25–p75), o mínimo e o máximo, o preço por ITEM (corte, barba,
 * combo) e a comparação com o entorno (cidade × estado × Brasil).
 *
 * ⚠️ OS NÚMEROS SÃO DO BACKEND, e ele só conta preço de verdade (sem "sob
 * orçamento", zero, inativo). A tela não recalcula nada — só formata.
 *
 * ⚠️ ABRE PRÉ-PREENCHIDA com a profissão e a cidade do perfil-conta de quem
 * olha, porque a pergunta que traz a pessoa aqui é quase sempre sobre ela.
 *
 * O histograma é uma série só: cor única, sem legenda, 2px entre as barras,
 * texto na cor de texto (não na da barra), tooltip no hover e a tabela por
 * item logo abaixo fazendo o papel de tabela de dados. Cantos retos.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertTriangle, Loader2, TrendingUp } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { useTaxonomy } from "@/lib/i18n/taxonomy"
import { PageBackLink } from "@/components/tabloide/PageBackLink"
import { CityPicker } from "@/components/forms/city-picker"
import { ESTADOS_BRASIL } from "@/lib/constants/estados-brasil"

type Kind = "service" | "product" | "listing"
type Stats = {
  count: number
  providers: number
  min: number | null
  p25: number | null
  median: number | null
  avg: number | null
  p75: number | null
  max: number | null
  low_sample: boolean
}
type Item = Stats & { key: string; label: string }
type Report = {
  kind: Kind
  subject: string | null
  scope: {
    level: "community" | "city" | "region" | "state" | "country"
    uf: string | null
    municipio: string | null
    region: string | null
    community: { id_profile: string; name: string } | null
  }
  stats: Stats
  items: Item[]
  histogram: { from: number; to: number; count: number }[]
  compare: { level: string; uf: string | null; municipio: string | null; count: number; median: number | null }[]
}
type Machine = { id_machine: number; name: string; slug?: string }
type Profession = { id_category: number; desc_category: string }
type ProductCat = { id_product_category: number; name: string; slug?: string }
type Community = { id_profile: string; display_name: string }

function authHeaders(): HeadersInit {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const PANEL = "border-2 border-[#0B0B0D] bg-[#15120E] p-5 shadow-[6px_6px_0_0_#F2B705]"
const SELECT = "w-full border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-sm text-[#F5F1E8]"
const LABEL = "mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#9A938A]"

export default function MarketReportPage() {
  const t = useTranslations("MarketReport")
  const tx = useTaxonomy()
  const locale = useLocale()

  const [kind, setKind] = useState<Kind>("service")
  const [listingKind, setListingKind] = useState<"service" | "product">("service")
  const [machines, setMachines] = useState<Machine[]>([])
  const [idMachine, setIdMachine] = useState("")
  const [professions, setProfessions] = useState<Profession[]>([])
  const [idCategory, setIdCategory] = useState("")
  const [productCats, setProductCats] = useState<ProductCat[]>([])
  const [idProductCat, setIdProductCat] = useState("")
  const [uf, setUf] = useState("")
  const [city, setCity] = useState("")
  const [communities, setCommunities] = useState<Community[]>([])
  const [idCommunity, setIdCommunity] = useState("")
  const [q, setQ] = useState("")
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const money = useCallback(
    (cents: number | null) =>
      cents === null
        ? "—"
        : new Intl.NumberFormat(locale, { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(
            cents / 100
          ),
    [locale]
  )

  // Carga inicial: listas + o perfil-conta de quem olha, para pré-preencher.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [mRes, pcRes, meRes, cRes] = await Promise.allSettled([
        fetch("/api/enxames").then((r) => r.json()),
        fetch("/api/product-categories").then((r) => r.json()),
        fetch("/api/users/me", { headers: authHeaders() }).then((r) => r.json()),
        fetch("/api/local-market/my-communities", { headers: authHeaders() }).then((r) => r.json()),
      ])
      if (cancelled) return
      if (mRes.status === "fulfilled") {
        const d = mRes.value
        setMachines(Array.isArray(d) ? d : d?.enxames ?? d?.machines ?? [])
      }
      if (pcRes.status === "fulfilled") setProductCats(Array.isArray(pcRes.value?.categories) ? pcRes.value.categories : [])
      if (cRes.status === "fulfilled") setCommunities(Array.isArray(cRes.value?.communities) ? cRes.value.communities : [])
      if (meRes.status === "fulfilled") {
        const ap = meRes.value?.account_profile
        const me = meRes.value
        const meUf = ap?.estado || me?.estado || ""
        if (meUf && /^[A-Z]{2}$/.test(meUf)) setUf(meUf)
        if (meUf && (ap?.municipio || me?.municipio)) setCity(ap?.municipio || me?.municipio)
        if (ap?.has_taxonomy && ap?.id_machine) setIdMachine(String(ap.id_machine))
        if (ap?.has_taxonomy && ap?.id_category) setIdCategory(String(ap.id_category))
      }
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Profissões do enxame escolhido.
  useEffect(() => {
    if (!idMachine) {
      setProfessions([])
      return
    }
    let cancelled = false
    fetch(`/api/enxames/${encodeURIComponent(idMachine)}/categories`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setProfessions(Array.isArray(d) ? d : d?.categories ?? [])
      })
      .catch(() => {
        if (!cancelled) setProfessions([])
      })
    return () => {
      cancelled = true
    }
  }, [idMachine])

  const queryString = useMemo(() => {
    const p = new URLSearchParams({ kind })
    if (kind === "listing") p.set("listing_kind", listingKind)
    if (kind === "service" && idCategory) p.set("id_category", idCategory)
    if (kind === "product" && idProductCat) p.set("id_product_category", idProductCat)
    if (idCommunity) p.set("id_community", idCommunity)
    else {
      if (uf) p.set("uf", uf)
      if (uf && city) p.set("municipio", city)
    }
    if (q.trim()) p.set("q", q.trim())
    return p.toString()
  }, [kind, listingKind, idCategory, idProductCat, idCommunity, uf, city, q])

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`/api/local-market/report?${queryString}`, { headers: authHeaders(), cache: "no-store" })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.error || `HTTP ${r.status}`)
      setReport(d as Report)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadError", "Não foi possível montar o relatório."))
    } finally {
      setLoading(false)
    }
  }, [queryString, t])

  // Primeira leitura com o pré-preenchimento; depois, só no botão.
  useEffect(() => {
    if (ready) void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  const scopeLabel = (r: Report["scope"]) => {
    switch (r.level) {
      case "community":
        return r.community?.name || t("scopeCommunity", "Comunidade")
      case "city":
        return `${r.municipio} · ${r.uf}`
      case "region":
        return r.region || t("scopeRegion", "Região")
      case "state":
        return ESTADOS_BRASIL.find((e) => e.uf === r.uf)?.nome || r.uf || ""
      default:
        return t("scopeCountry", "Brasil")
    }
  }
  const compareLabel = (c: Report["compare"][number]) =>
    c.level === "city"
      ? `${c.municipio} · ${c.uf}`
      : c.level === "state"
        ? ESTADOS_BRASIL.find((e) => e.uf === c.uf)?.nome || c.uf || ""
        : t("scopeCountry", "Brasil")

  const s = report?.stats
  const maxBucket = Math.max(1, ...(report?.histogram || []).map((h) => h.count))
  // Posição de um preço na régua min→max (0..100), para a barra da faixa.
  const pos = (v: number | null) =>
    s && v !== null && s.max !== null && s.min !== null && s.max > s.min ? ((v - s.min) / (s.max - s.min)) * 100 : 50

  return (
    <div className="fl-sharp min-h-screen bg-[#0b0804] text-[#F5F1E8]">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <PageBackLink href="/account" className="mb-5" />

        <header className="mb-6">
          <h1 className="fl-display flex items-center gap-3 text-3xl">
            <TrendingUp className="h-7 w-7 text-[#F2B705]" /> {t("title", "Mercado local")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#9A938A]">
            {t(
              "intro",
              "Quanto se cobra na sua cidade, na sua região e na sua comunidade — a partir dos preços que profissionais e vizinhos cadastraram na Freelandoo."
            )}
          </p>
        </header>

        {/* Filtros: numa fileira acima do resultado. */}
        <section className={PANEL}>
          <div className="mb-4 flex flex-wrap gap-2" role="tablist">
            {(["service", "product", "listing"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={kind === k}
                onClick={() => setKind(k)}
                className={`border-2 border-[#0B0B0D] px-3 py-1.5 text-sm font-bold ${
                  kind === k ? "bg-[#F2B705] text-[#0B0B0D]" : "bg-[#1D1810] text-[#F5F1E8]"
                }`}
              >
                {k === "service"
                  ? t("kindService", "Serviços")
                  : k === "product"
                    ? t("kindProduct", "Produtos")
                    : t("kindListing", "Vitrine dos vizinhos")}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {kind === "service" && (
              <>
                <label>
                  <span className={LABEL}>{t("enxame", "Enxame")}</span>
                  <select
                    className={SELECT}
                    value={idMachine}
                    onChange={(e) => {
                      setIdMachine(e.target.value)
                      setIdCategory("")
                    }}
                  >
                    <option value="">{t("anyEnxame", "Todos")}</option>
                    {machines.map((m) => (
                      <option key={m.id_machine} value={String(m.id_machine)}>
                        {tx.enxame(m.slug ?? null, m.name)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className={LABEL}>{t("profession", "Profissão")}</span>
                  <select
                    className={SELECT}
                    value={idCategory}
                    onChange={(e) => setIdCategory(e.target.value)}
                    disabled={!idMachine}
                  >
                    <option value="">{t("anyProfession", "Todas")}</option>
                    {professions.map((p) => (
                      <option key={p.id_category} value={String(p.id_category)}>
                        {tx.profession(p.desc_category)}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {kind === "product" && (
              <label>
                <span className={LABEL}>{t("productCategory", "Categoria")}</span>
                <select className={SELECT} value={idProductCat} onChange={(e) => setIdProductCat(e.target.value)}>
                  <option value="">{t("anyProductCategory", "Todas")}</option>
                  {productCats.map((c) => (
                    <option key={c.id_product_category} value={String(c.id_product_category)}>
                      {tx.productCategory(c.slug ?? null, c.name)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {kind === "listing" && (
              <label>
                <span className={LABEL}>{t("listingKind", "Anúncios de")}</span>
                <select
                  className={SELECT}
                  value={listingKind}
                  onChange={(e) => setListingKind(e.target.value === "product" ? "product" : "service")}
                >
                  <option value="service">{t("kindService", "Serviços")}</option>
                  <option value="product">{t("kindProduct", "Produtos")}</option>
                </select>
              </label>
            )}

            <label>
              <span className={LABEL}>{t("filterName", "Nome (ex.: corte)")}</span>
              <input
                className={SELECT}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("filterNamePlaceholder", "Opcional")}
              />
            </label>

            {communities.length > 0 && (
              <label>
                <span className={LABEL}>{t("community", "Minha comunidade")}</span>
                <select className={SELECT} value={idCommunity} onChange={(e) => setIdCommunity(e.target.value)}>
                  <option value="">{t("noCommunity", "Não — usar o lugar")}</option>
                  {communities.map((c) => (
                    <option key={c.id_profile} value={c.id_profile}>
                      {c.display_name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {!idCommunity && (
              <>
                <label>
                  <span className={LABEL}>{t("state", "Estado")}</span>
                  <select
                    className={SELECT}
                    value={uf}
                    onChange={(e) => {
                      setUf(e.target.value)
                      setCity("")
                    }}
                  >
                    <option value="">{t("anyState", "Brasil inteiro")}</option>
                    {ESTADOS_BRASIL.map((e) => (
                      <option key={e.uf} value={e.uf}>
                        {e.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <div>
                  <span className={LABEL}>{t("city", "Cidade")}</span>
                  <CityPicker uf={uf} value={city} onChange={setCity} className={SELECT} />
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => void run()}
            disabled={loading}
            className="mt-4 inline-flex items-center gap-2 bg-[#F2B705] px-5 py-2.5 text-sm font-extrabold text-[#0B0B0D] disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("run", "Ver o mercado")}
          </button>
        </section>

        {error && (
          <p role="alert" className="mt-6 border-2 border-[#0B0B0D] bg-[#3B1D1D] px-3 py-2 text-sm text-[#F5C8C8]">
            {error}
          </p>
        )}

        {report && s && (
          <div className="mt-8 space-y-6">
            <p className="text-sm text-[#9A938A]">
              {(report.subject ? report.subject + " · " : "") + scopeLabel(report.scope)}
              {report.stats.count > 0 &&
                " · " +
                  t("sampleLine", "{n} preços de {p} vendedores")
                    .replace("{n}", String(s.count))
                    .replace("{p}", String(s.providers))}
            </p>

            {s.count === 0 ? (
              <section className={PANEL}>
                <p className="text-sm text-[#9A938A]">
                  {t(
                    "empty",
                    "Ainda não há preços cadastrados para esse recorte. Tente alargar: tire a cidade, ou escolha o estado inteiro."
                  )}
                </p>
              </section>
            ) : (
              <>
                {/* O número principal + a faixa do meio. */}
                <section className={PANEL}>
                  <p className={LABEL}>{t("median", "Preço mais comum (mediana)")}</p>
                  <p className="fl-display text-5xl text-[#F2B705]">{money(s.median)}</p>
                  <p className="mt-1 text-sm text-[#F5F1E8]/80">
                    {t("middleRange", "Metade cobra entre {a} e {b}")
                      .replace("{a}", money(s.p25))
                      .replace("{b}", money(s.p75))}
                  </p>

                  {/* Régua min → max com a faixa do meio e a mediana. */}
                  <div className="mt-5" aria-hidden>
                    <div className="relative h-3 bg-[#1D1810]">
                      <div
                        className="absolute inset-y-0 bg-[#F2B705]/35"
                        style={{ left: `${pos(s.p25)}%`, width: `${Math.max(1, pos(s.p75) - pos(s.p25))}%` }}
                      />
                      <div className="absolute -inset-y-1 w-[3px] bg-[#F2B705]" style={{ left: `calc(${pos(s.median)}% - 1px)` }} />
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] text-[#9A938A]">
                      <span>{t("min", "Menor")} {money(s.min)}</span>
                      <span>{t("avg", "Média")} {money(s.avg)}</span>
                      <span>{t("max", "Maior")} {money(s.max)}</span>
                    </div>
                  </div>

                  {s.low_sample && (
                    <p className="mt-4 flex items-start gap-2 text-xs text-[#F5C8C8]">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      {t(
                        "lowSample",
                        "Poucos preços neste recorte — o número pode ser o de uma pessoa só. Alargue o recorte para comparar."
                      )}
                    </p>
                  )}
                </section>

                {/* Comparação com o entorno. */}
                {report.compare.length > 0 && (
                  <section className={PANEL}>
                    <h2 className="fl-display text-xl">{t("compareTitle", "Comparado com o entorno")}</h2>
                    <ul className="mt-3 divide-y divide-[#0B0B0D]">
                      <li className="flex items-center justify-between py-2 text-sm">
                        <span className="font-bold">{scopeLabel(report.scope)}</span>
                        <span className="font-extrabold text-[#F2B705]">{money(s.median)}</span>
                      </li>
                      {report.compare.map((c) => (
                        <li key={c.level} className="flex items-center justify-between py-2 text-sm">
                          <span className="text-[#F5F1E8]/80">
                            {compareLabel(c)}{" "}
                            <span className="text-[11px] text-[#9A938A]">
                              ({t("pricesCount", "{n} preços").replace("{n}", String(c.count))})
                            </span>
                          </span>
                          <span className="font-bold">{money(c.median)}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Distribuição. */}
                {report.histogram.length > 1 && (
                  <section className={PANEL}>
                    <h2 className="fl-display text-xl">{t("distributionTitle", "Como os preços se espalham")}</h2>
                    <div className="mt-4 flex h-40 items-end gap-[2px]" role="img" aria-label={t("distributionAria", "Distribuição dos preços em faixas")}>
                      {report.histogram.map((h, i) => (
                        <div key={i} className="group relative flex h-full flex-1 items-end">
                          <div
                            className="w-full bg-[#F2B705] transition-opacity group-hover:opacity-80"
                            style={{ height: `${h.count ? Math.max(4, (h.count / maxBucket) * 100) : 0}%` }}
                          />
                          <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap border-2 border-[#0B0B0D] bg-[#F5F1E8] px-2 py-1 text-[11px] font-bold text-[#0B0B0D] group-hover:block">
                            {money(h.from)} – {money(h.to)}: {t("pricesCount", "{n} preços").replace("{n}", String(h.count))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] text-[#9A938A]">
                      <span>{money(report.histogram[0].from)}</span>
                      <span>{money(report.histogram[report.histogram.length - 1].to)}</span>
                    </div>
                  </section>
                )}

                {/* Por item. */}
                {report.items.length > 0 && (
                  <section className={PANEL}>
                    <h2 className="fl-display text-xl">{t("itemsTitle", "Por item")}</h2>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-[11px] uppercase text-[#9A938A]">
                            <th className="py-2 pr-3">{t("colItem", "Item")}</th>
                            <th className="py-2 pr-3 text-right">{t("colMedian", "Mediana")}</th>
                            <th className="py-2 pr-3 text-right">{t("colRange", "Faixa")}</th>
                            <th className="py-2 text-right">{t("colCount", "Preços")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#0B0B0D]">
                          {report.items.map((it) => (
                            <tr key={it.key}>
                              <td className="py-2 pr-3">{it.label}</td>
                              <td className="py-2 pr-3 text-right font-bold text-[#F5F1E8]">{money(it.median)}</td>
                              <td className="py-2 pr-3 text-right text-[#F5F1E8]/70">
                                {money(it.min)} – {money(it.max)}
                              </td>
                              <td className="py-2 text-right text-[#9A938A]">{it.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
              </>
            )}

            <p className="text-[11px] text-[#9A938A]">
              {t(
                "footnote",
                "Contam só preços fechados e ativos: serviço sob orçamento, preço zero e anúncio fora do ar ficam de fora."
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
