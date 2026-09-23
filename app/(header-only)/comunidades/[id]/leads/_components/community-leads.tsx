"use client"

/**
 * LEADS — a prospecção do negócio (mig 254). A tela do pill "Leads".
 *
 * Pedido do Alex: dentro do Meu Negócio, "encontre clientes" — procurar
 * empresas por categoria e cidade, ver os canais de contato, salvar em listas
 * e exportar.
 *
 * ─── POR QUE UMA PÁGINA, E NÃO UM PAINEL DO HEADCARD ────────────────────────
 *
 * Mesma régua dos Indicadores: painel serve o que cabe embaixo do headcard
 * (poucos campos); aqui são busca, filtros, grade de resultados, listas salvas
 * e a ficha da empresa. Enfiar isso num painel empurraria o feed para longe —
 * que é exatamente o que os painéis vieram evitar.
 *
 * ─── ⚠️ A BUSCA LÊ A BASE LOCAL, SEMPRE ────────────────────────────────────
 *
 * Ela nunca chama o OpenStreetMap. Descoberta é trabalho de FILA (o
 * `CompanyWorker` no backend), e misturar as duas coisas faria uma tela de
 * busca depender de um serviço de terceiro respondendo em tempo real. Quando a
 * base tem pouco para aquela (categoria, cidade), o backend devolve
 * `suggest_discovery` e a tela oferece "procurar mais" — que enfileira e
 * responde depois.
 *
 * ⚠️ E É POR ISSO QUE EXISTE O BLOCO DE TRABALHOS EM CURSO. Sem ele, quem
 * apertasse "procurar mais" veria a mesma tela vazia e concluiria que o botão
 * não faz nada — o pior jeito de entregar uma operação assíncrona.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Bookmark, Building2, CheckCircle2, ChevronDown, Download, Globe, Instagram,
  Loader2, Mail, MapPin, Phone, Plus, RefreshCw, Search, ShieldAlert, Sparkles,
  Trash2, X,
} from "lucide-react"
import { toast } from "sonner"
import { PageBackLink } from "@/components/tabloide"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { getToken, getStoredUser } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { CommunityShellBeacon } from "@/components/layout/community-shell"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"
import { TechBackdrop } from "@/components/platform/tech-backdrop"
import {
  accentHex, backdropTint, canBuildCommunitySite, platformSkinVars,
} from "../../_components/community-ui"
import {
  buildCsv, downloadCsv, fmtCnpj, fmtPhone, UFS,
  type Catalog, type Company, type CompanySource, type Job, type LeadList,
} from "./leads-types"

type Community = {
  id_profile: string
  display_name: string
  kind?: string | null
  id_leader_user?: string | null
  has_site?: boolean
  community_theme: { accent?: string; background?: string } | null
}

const PANEL = "border-2 border-[#0B0B0D] bg-[#15120E]"
const INNER = "border-2 border-[#0B0B0D] bg-[#1D1810]"
const INPUT =
  "w-full border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-sm text-[#F5F1E8] outline-none placeholder:text-[#9A938A]"

/** Os filtros de CANAL — o que separa "cadastro" de "lead abordável". */
const CHANNEL_FILTERS = [
  { key: "has_whatsapp", labelKey: "fWhats", fallback: "Com WhatsApp" },
  { key: "has_phone", labelKey: "fPhone", fallback: "Com telefone" },
  { key: "has_email", labelKey: "fEmail", fallback: "Com e-mail" },
  { key: "has_website", labelKey: "fSite", fallback: "Com site" },
  { key: "has_instagram", labelKey: "fInsta", fallback: "Com Instagram" },
  { key: "has_cnpj", labelKey: "fCnpj", fallback: "Com CNPJ" },
  { key: "only_active", labelKey: "fActive", fallback: "Empresa ativa" },
  { key: "headquarters", labelKey: "fHq", fallback: "Só matriz" },
] as const

type ChannelKey = (typeof CHANNEL_FILTERS)[number]["key"]

export function CommunityLeads({ communityId }: { communityId: string }) {
  const t = useTranslations("Leads")
  const tc = useTranslations("Community")
  const locale = useLocale()

  const [community, setCommunity] = useState<Community | null>(null)
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Busca
  const [category, setCategory] = useState("")
  const [uf, setUf] = useState("")
  const [city, setCity] = useState("")
  const [term, setTerm] = useState("")
  const [channels, setChannels] = useState<Record<string, boolean>>({})
  const [minCapital, setMinCapital] = useState("")
  const [minYears, setMinYears] = useState("")
  const [rows, setRows] = useState<Company[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [suggestDiscovery, setSuggestDiscovery] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)

  // Listas
  const [lists, setLists] = useState<LeadList[]>([])
  const [openList, setOpenList] = useState<LeadList | null>(null)
  const [listRows, setListRows] = useState<Company[]>([])
  const [newListName, setNewListName] = useState("")
  const [saveMenuFor, setSaveMenuFor] = useState<string | null>(null)

  // Fila e ficha
  const [jobs, setJobs] = useState<Job[]>([])
  const [detail, setDetail] = useState<{ company: Company; sources: CompanySource[] } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const auth = useCallback(() => {
    const tk = getToken()
    return tk ? { Authorization: `Bearer ${tk}` } : undefined
  }, [])

  const api = useCallback(
    (path: string) => `/api/communities/${communityId}/leads${path}`,
    [communityId]
  )

  // ─── CARGA INICIAL ─────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const headers = auth()
      const [cRes, kRes] = await Promise.all([
        fetch(`/api/communities/${communityId}`, headers ? { headers } : undefined),
        fetch(api("/catalog"), headers ? { headers } : undefined),
      ])
      const cData = await cRes.json().catch(() => ({}))
      if (!cRes.ok) {
        setErrorMsg(cData?.error || tc("notFound", "Comunidade não encontrada."))
        setState("error")
        return
      }
      setCommunity(cData.community)

      const kData = await kRes.json().catch(() => ({}))
      if (!kRes.ok) {
        // ⚠️ A RECUSA É DITA. Esta tela é só do líder do negócio, e uma grade
        // vazia faria parecer que não há empresa nenhuma — que é outra coisa.
        setErrorMsg(kData?.error || t("loadError", "Não deu para abrir a prospecção agora."))
        setState("error")
        return
      }
      setCatalog(kData)
      setState("loaded")
    } catch {
      setErrorMsg(t("loadError", "Não deu para abrir a prospecção agora."))
      setState("error")
    }
  }, [api, auth, communityId, t, tc])

  useEffect(() => {
    void load()
  }, [load])

  const loadLists = useCallback(async () => {
    const headers = auth()
    const res = await fetch(api("/lists"), headers ? { headers } : undefined)
    const data = await res.json().catch(() => ({}))
    if (res.ok) setLists(data.lists || [])
  }, [api, auth])

  const loadJobs = useCallback(async () => {
    const headers = auth()
    const res = await fetch(api("/jobs"), headers ? { headers } : undefined)
    const data = await res.json().catch(() => ({}))
    if (res.ok) setJobs(data.jobs || [])
  }, [api, auth])

  useEffect(() => {
    if (state !== "loaded") return
    void loadLists()
    void loadJobs()
  }, [state, loadLists, loadJobs])

  // ⚠️ O POLL DOS TRABALHOS SÓ EXISTE ENQUANTO HÁ TRABALHO VIVO, e ele para
  // sozinho. Um intervalo permanente nesta tela seria uma requisição a cada 15s
  // por aba aberta, para sempre — o custo que a plataforma já pagou uma vez com
  // os relógios por card do feed.
  const hasLiveJob = useMemo(
    () => jobs.some((j) => j.status === "pending" || j.status === "running"),
    [jobs]
  )
  const searchRef = useRef<() => void>(() => {})
  useEffect(() => {
    if (!hasLiveJob) return
    const id = setInterval(() => {
      void loadJobs().then(() => searchRef.current())
    }, 15_000)
    return () => clearInterval(id)
  }, [hasLiveJob, loadJobs])

  // ─── BUSCA ─────────────────────────────────────────────────────────────────
  const runSearch = useCallback(
    async (goToPage = 1) => {
      setSearching(true)
      try {
        const qs = new URLSearchParams()
        if (category) qs.set("category", category)
        if (uf) qs.set("uf", uf)
        if (city.trim()) qs.set("city", city.trim())
        if (term.trim()) qs.set("q", term.trim())
        for (const [k, v] of Object.entries(channels)) if (v) qs.set(k, "1")
        if (minCapital) qs.set("min_capital_cents", String(Math.round(Number(minCapital) * 100)))
        if (minYears) {
          // "aberta há mais de N anos" vira uma data-limite: é o que a coluna
          // `opened_at` sabe comparar.
          const d = new Date()
          d.setFullYear(d.getFullYear() - Number(minYears))
          qs.set("opened_before", d.toISOString().slice(0, 10))
        }
        qs.set("page", String(goToPage))

        const headers = auth()
        const res = await fetch(`${api("/search")}?${qs}`, headers ? { headers } : undefined)
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(data?.error || t("searchError", "Não deu para buscar agora."))
          return
        }
        setRows(data.rows || [])
        setTotal(data.total || 0)
        setPage(data.page || 1)
        setSuggestDiscovery(!!data.suggest_discovery)
        setSearched(true)
        setOpenList(null)
      } finally {
        setSearching(false)
      }
    },
    [api, auth, category, channels, city, minCapital, minYears, t, term, uf]
  )

  // O poll relê a busca com os MESMOS filtros; guardá-la num ref evita que o
  // intervalo se recrie a cada tecla digitada num campo de filtro.
  useEffect(() => {
    searchRef.current = () => {
      if (searched && !openList) void runSearch(page)
    }
  }, [runSearch, searched, openList, page])

  const requestDiscovery = useCallback(async () => {
    if (!category || !uf || !city.trim()) {
      toast.error(t("discoverNeeds", "Escolha a categoria, o estado e a cidade."))
      return
    }
    setBusy("discover")
    try {
      const headers = { "Content-Type": "application/json", ...(auth() || {}) }
      const res = await fetch(api("/discover"), {
        method: "POST",
        headers,
        body: JSON.stringify({ category, uf, city: city.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error || t("discoverError", "Não deu para pedir a busca agora."))
        return
      }
      if (data.fresh) {
        // ⚠️ "JÁ BUSQUEI ISTO RECENTEMENTE" NÃO É ERRO, e dizer isso em voz
        // alta é o que impede a pessoa de apertar o botão dez vezes achando
        // que ele está quebrado.
        toast.success(t("discoverFresh", "Esta busca já foi feita há pouco — a lista está atual."))
      } else {
        toast.success(t("discoverQueued", "Estamos procurando. Isso leva alguns minutos."))
      }
      void loadJobs()
    } finally {
      setBusy(null)
    }
  }, [api, auth, category, city, loadJobs, t, uf])

  const enrich = useCallback(
    async (id_company: string) => {
      setBusy(id_company)
      try {
        const headers = { "Content-Type": "application/json", ...(auth() || {}) }
        const res = await fetch(api(`/companies/${id_company}/enrich`), {
          method: "POST",
          headers,
          body: JSON.stringify({ kind: "enrich_all" }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(data?.error || t("enrichError", "Não deu para enriquecer agora."))
          return
        }
        toast.success(
          data.fresh
            ? t("enrichFresh", "Os dados desta empresa já estão atualizados.")
            : t("enrichQueued", "Buscando mais dados desta empresa.")
        )
        void loadJobs()
      } finally {
        setBusy(null)
      }
    },
    [api, auth, loadJobs, t]
  )

  const openDetail = useCallback(
    async (id_company: string) => {
      const headers = auth()
      const res = await fetch(api(`/companies/${id_company}`), headers ? { headers } : undefined)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error || t("detailError", "Não deu para abrir a ficha."))
        return
      }
      setDetail({ company: data.company, sources: data.sources || [] })
    },
    [api, auth, t]
  )

  // ─── LISTAS ────────────────────────────────────────────────────────────────
  const createList = useCallback(async () => {
    const name = newListName.trim()
    if (name.length < 2) return
    const headers = { "Content-Type": "application/json", ...(auth() || {}) }
    const res = await fetch(api("/lists"), {
      method: "POST",
      headers,
      body: JSON.stringify({ name }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data?.error || t("listError", "Não deu para criar a lista."))
      return
    }
    setNewListName("")
    await loadLists()
    if (data.existed) toast.success(t("listExisted", "Você já tinha uma lista com esse nome."))
  }, [api, auth, loadLists, newListName, t])

  const addToList = useCallback(
    async (id_list: string, id_company: string) => {
      const headers = { "Content-Type": "application/json", ...(auth() || {}) }
      const res = await fetch(api(`/lists/${id_list}/companies`), {
        method: "POST",
        headers,
        body: JSON.stringify({ id_company }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error || t("saveError", "Não deu para salvar o lead."))
        return
      }
      setSaveMenuFor(null)
      // Marca o card na hora, sem refazer a busca: o backend já devolveu o
      // resultado e refazer a consulta por um clique de salvar piscaria a grade.
      setRows((rs) =>
        rs.map((r) =>
          r.id_company === id_company
            ? { ...r, in_lists: [...(r.in_lists || []), id_list] }
            : r
        )
      )
      void loadLists()
      toast.success(t("saved", "Salvo na lista."))
    },
    [api, auth, loadLists, t]
  )

  const openSavedList = useCallback(
    async (list: LeadList) => {
      const headers = auth()
      const res = await fetch(api(`/lists/${list.id_list}/companies`), headers ? { headers } : undefined)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error || t("listOpenError", "Não deu para abrir a lista."))
        return
      }
      setOpenList(list)
      setListRows(data.rows || [])
    },
    [api, auth, t]
  )

  const removeFromList = useCallback(
    async (id_list: string, id_company: string) => {
      const headers = auth()
      const res = await fetch(api(`/lists/${id_list}/companies/${id_company}`), {
        method: "DELETE",
        ...(headers ? { headers } : {}),
      })
      if (!res.ok) return
      setListRows((rs) => rs.filter((r) => r.id_company !== id_company))
      void loadLists()
    },
    [api, auth, loadLists]
  )

  const setStage = useCallback(
    async (id_list: string, id_company: string, stage: string) => {
      const headers = { "Content-Type": "application/json", ...(auth() || {}) }
      const res = await fetch(api(`/lists/${id_list}/companies/${id_company}`), {
        method: "PATCH",
        headers,
        body: JSON.stringify({ stage }),
      })
      if (!res.ok) return
      setListRows((rs) => rs.map((r) => (r.id_company === id_company ? { ...r, stage } : r)))
    },
    [api, auth]
  )

  const deleteList = useCallback(
    async (id_list: string) => {
      const headers = auth()
      const res = await fetch(api(`/lists/${id_list}`), {
        method: "DELETE",
        ...(headers ? { headers } : {}),
      })
      if (!res.ok) return
      setOpenList(null)
      setListRows([])
      void loadLists()
    },
    [api, auth, loadLists]
  )

  const exportCurrent = useCallback(() => {
    const data = openList ? listRows : rows
    if (!data.length) return
    const name = openList ? openList.name : `${category || "leads"}-${city || ""}`
    downloadCsv(
      `${name.replace(/[^\w-]+/g, "-").toLowerCase()}.csv`,
      buildCsv(data)
    )
  }, [category, city, listRows, openList, rows])

  // ─── CASCA ─────────────────────────────────────────────────────────────────
  const accent = accentHex(community?.community_theme?.accent)
  const isBusiness = (community?.kind ?? null) === "common"
  const bgKey = community?.community_theme?.background
  const skinVars = useMemo(
    () => (isBusiness ? platformSkinVars(bgKey) : undefined),
    [isBusiness, bgKey]
  )
  const bizTint = useMemo(() => backdropTint(bgKey), [bgKey])
  const siteEnabled = useFeature("comunidade_site")
  const viewerId = getStoredUser()?.id_user ?? null
  const isLeader = !!community?.id_leader_user && community.id_leader_user === viewerId
  const canBuildSite = canBuildCommunitySite({ kind: community?.kind, isLeader, siteEnabled })

  const catLabel = useCallback(
    (key: string | null) => {
      if (!key) return ""
      const item = catalog?.categories.find((c) => c.key === key)
      // O rótulo do dicionário vence; o do backend é o fallback em pt.
      return t(`cat_${key}`, item?.label || key)
    },
    [catalog, t]
  )

  const money = useCallback(
    (cents: number | null) =>
      cents === null || cents === undefined
        ? ""
        : (Number(cents) / 100).toLocaleString(locale, { style: "currency", currency: "BRL" }),
    [locale]
  )

  if (state === "loading") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0b0804]">
        <Loader2 className="h-6 w-6 animate-spin text-[#9A938A]" />
      </div>
    )
  }

  if (state === "error" || !community || !catalog) {
    return (
      <div className="fl-sharp flex min-h-[100dvh] items-center justify-center bg-[#0b0804] px-4 text-center text-[#F5F1E8]">
        <div>
          <ShieldAlert className="mx-auto h-10 w-10 text-[#9A938A]" />
          <p className="mt-4 text-sm text-[#9A938A]">
            {errorMsg || t("loadError", "Não deu para abrir a prospecção agora.")}
          </p>
          <div className="mt-4 flex justify-center">
            <PageBackLink href={`/comunidades/${communityId}`} />
          </div>
        </div>
      </div>
    )
  }

  const discoverOn = catalog.providers.some((p) => p.source === "osm" && p.configured)
  const shown = openList ? listRows : rows

  return (
    <div
      style={skinVars}
      className={cn(
        "fl-root relative min-h-[100dvh] overflow-x-clip bg-[#0b0804] pb-24 text-[#F1EDE2]",
        isBusiness && "fl-business"
      )}
    >
      {isBusiness && <TechBackdrop variant="business" tint={bizTint} />}
      {isBusiness && (
        <CommunityShellBeacon
          communityId={communityId}
          kind="business"
          canBuildSite={canBuildSite}
          canSeeIndicators={isLeader}
        />
      )}

      <div className="relative z-10 mx-auto w-full max-w-5xl px-0 pt-5 md:px-10">
        <div className="px-3">
          <PageBackLink href={`/comunidades/${communityId}`} />
        </div>

        <header className="mt-4 px-3">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#9A938A]">
            {community.display_name}
          </p>
          <h1 className="fl-display text-4xl leading-[0.85] text-[#F5F1E8] md:text-6xl">
            {t("title", "Encontre clientes")}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[#9A938A]">
            {t(
              "subtitle",
              "Empresas brasileiras por categoria e cidade, com os canais de contato de cada uma."
            )}
          </p>
        </header>

        {/* ─── BUSCA ──────────────────────────────────────────────────────── */}
        <section className={cn("mt-5", PANEL)}>
          <div className="grid gap-2 p-3 sm:grid-cols-2 md:grid-cols-4">
            <label className="block">
              <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
                {t("category", "O que você procura")}
              </span>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={INPUT}>
                <option value="">{t("anyCategory", "Qualquer categoria")}</option>
                {catalog.categories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {catLabel(c.key)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
                {t("uf", "Estado")}
              </span>
              <select value={uf} onChange={(e) => setUf(e.target.value)} className={INPUT}>
                <option value="">—</option>
                {UFS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
                {t("city", "Cidade")}
              </span>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t("cityPlaceholder", "São Bernardo do Campo")}
                className={INPUT}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
                {t("term", "Nome (opcional)")}
              </span>
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void runSearch(1)
                }}
                placeholder={t("termPlaceholder", "parte do nome")}
                className={INPUT}
              />
            </label>
          </div>

          {/* Filtros de canal */}
          <div className="flex flex-wrap gap-1.5 px-3 pb-3">
            {CHANNEL_FILTERS.map((f) => {
              const on = !!channels[f.key]
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() =>
                    setChannels((c) => ({ ...c, [f.key]: !c[f.key as ChannelKey] }))
                  }
                  className="border-2 border-[#0B0B0D] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.1em]"
                  style={{
                    background: on ? accent : "#1D1810",
                    color: on ? "#0B0B0D" : "#9A938A",
                  }}
                >
                  {t(f.labelKey, f.fallback)}
                </button>
              )
            })}
          </div>

          <div className="grid gap-2 px-3 pb-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
                {t("minCapital", "Capital social mínimo (R$)")}
              </span>
              <input
                value={minCapital}
                onChange={(e) => setMinCapital(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                placeholder="50000"
                className={INPUT}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
                {t("minYears", "Aberta há mais de (anos)")}
              </span>
              <input
                value={minYears}
                onChange={(e) => setMinYears(e.target.value.replace(/\D/g, "").slice(0, 2))}
                inputMode="numeric"
                placeholder="2"
                className={INPUT}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t-2 border-[#0B0B0D] p-3">
            <button
              type="button"
              disabled={searching}
              onClick={() => void runSearch(1)}
              className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-5 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] disabled:opacity-60"
              style={{ background: accent }}
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {t("search", "Buscar")}
            </button>

            {/* ⚠️ "PROCURAR MAIS" SÓ APARECE COM CATEGORIA, ESTADO E CIDADE:
                sem os três não há o que varrer, e o botão sempre voltaria
                "payload incompleto". */}
            {discoverOn && (
              <button
                type="button"
                disabled={busy === "discover" || !category || !uf || !city.trim()}
                onClick={() => void requestDiscovery()}
                className={cn(
                  "inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#F5F1E8] disabled:opacity-40",
                  INNER
                )}
                title={t("discoverHint", "Procura estabelecimentos novos no OpenStreetMap")}
              >
                {busy === "discover" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" style={{ color: accent }} />
                )}
                {t("discover", "Procurar mais")}
              </button>
            )}

            {shown.length > 0 && (
              <button
                type="button"
                onClick={exportCurrent}
                className={cn(
                  "inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#F5F1E8]",
                  INNER
                )}
              >
                <Download className="h-4 w-4" style={{ color: accent }} />
                {t("export", "Exportar CSV")}
              </button>
            )}
          </div>
        </section>

        {/* ─── TRABALHOS EM CURSO ──────────────────────────────────────────── */}
        {jobs.some((j) => j.status === "pending" || j.status === "running") && (
          <section className={cn("mt-3 p-3", PANEL)}>
            <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" style={{ color: accent }} />
              {t("working", "Procurando agora")}
            </p>
            <ul className="mt-2 space-y-1">
              {jobs
                .filter((j) => j.status === "pending" || j.status === "running")
                .map((j) => (
                  <li key={j.id_job} className="text-sm text-[#F5F1E8]">
                    {j.kind === "discover"
                      ? `${catLabel(j.payload?.category || null)} · ${j.payload?.city || ""} ${j.payload?.uf || ""}`
                      : t("workingEnrich", "Buscando dados de uma empresa")}
                  </li>
                ))}
            </ul>
            <p className="mt-2 text-xs text-[#9A938A]">
              {t("workingHint", "A lista se atualiza sozinha quando terminar.")}
            </p>
          </section>
        )}

        {/* ─── LISTAS ──────────────────────────────────────────────────────── */}
        <section className={cn("mt-3 p-3", PANEL)}>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
              {t("lists", "Minhas listas")}
            </p>
            {lists.map((l) => (
              <button
                key={l.id_list}
                type="button"
                onClick={() => void openSavedList(l)}
                className="border-2 border-[#0B0B0D] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.1em]"
                style={{
                  background: openList?.id_list === l.id_list ? accent : "#1D1810",
                  color: openList?.id_list === l.id_list ? "#0B0B0D" : "#F5F1E8",
                }}
              >
                {l.name} · {l.total ?? 0}
              </button>
            ))}
            <span className="flex items-center gap-1">
              <input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void createList()
                }}
                placeholder={t("newList", "Nova lista")}
                className="w-36 border-2 border-[#0B0B0D] bg-[#1D1810] px-2 py-1 text-xs text-[#F5F1E8] outline-none placeholder:text-[#9A938A]"
              />
              <button
                type="button"
                onClick={() => void createList()}
                aria-label={t("createList", "Criar lista")}
                className="border-2 border-[#0B0B0D] p-1.5"
                style={{ background: accent }}
              >
                <Plus className="h-3.5 w-3.5 text-[#0B0B0D]" />
              </button>
            </span>
            {openList && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setOpenList(null)
                    setListRows([])
                  }}
                  className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#9A938A] underline"
                >
                  {t("backToSearch", "Voltar à busca")}
                </button>
                <button
                  type="button"
                  onClick={() => void deleteList(openList.id_list)}
                  aria-label={t("deleteList", "Apagar lista")}
                  className="border-2 border-[#0B0B0D] bg-[#1D1810] p-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5 text-[#9A938A]" />
                </button>
              </>
            )}
          </div>
        </section>

        {/* ─── RESULTADOS ──────────────────────────────────────────────────── */}
        <section className="mt-3 px-0">
          {openList ? (
            <p className="px-3 text-xs font-bold uppercase tracking-[0.12em] text-[#9A938A]">
              {openList.name} · {listRows.length}
            </p>
          ) : searched ? (
            <p className="px-3 text-xs font-bold uppercase tracking-[0.12em] text-[#9A938A]">
              {t("resultCount", "{n} empresas").replace("{n}", String(total))}
            </p>
          ) : null}

          {!searched && !openList && (
            <div className={cn("mt-2 px-6 py-14 text-center", PANEL)}>
              <Building2 className="mx-auto h-10 w-10" style={{ color: accent }} />
              <p className="mt-4 fl-display text-2xl text-[#F5F1E8]">
                {t("emptyTitle", "Escolha o que procurar")}
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-[#9A938A]">
                {t(
                  "emptyText",
                  "Diga a categoria e a cidade. O que já estiver na base aparece na hora; o que faltar, a gente procura."
                )}
              </p>
            </div>
          )}

          {searched && !openList && rows.length === 0 && (
            <div className={cn("mt-2 px-6 py-12 text-center", PANEL)}>
              <p className="fl-display text-xl text-[#F5F1E8]">
                {t("noResults", "Nada por aqui ainda")}
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-[#9A938A]">
                {discoverOn
                  ? t("noResultsDiscover", "Aperte “Procurar mais” para varrer essa cidade.")
                  : t("noResultsOff", "A busca por empresas novas está indisponível no momento.")}
              </p>
            </div>
          )}

          {suggestDiscovery && rows.length > 0 && discoverOn && (
            <p className="mt-2 px-3 text-xs text-[#9A938A]">
              {t("thinHint", "Poucos resultados? Aperte “Procurar mais” para varrer essa cidade.")}
            </p>
          )}

          <div className="mt-2 grid gap-2">
            {shown.map((c) => (
              <article key={c.id_company} className={cn("p-3", PANEL)}>
                <div className="flex flex-wrap items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => void openDetail(c.id_company)}
                      className="text-left"
                    >
                      <h3 className="truncate fl-display text-lg leading-tight text-[#F5F1E8]">
                        {c.display_name}
                      </h3>
                    </button>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">
                      {c.category_key && <span style={{ color: accent }}>{catLabel(c.category_key)}</span>}
                      {c.city && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {c.city}
                          {c.uf ? `/${c.uf}` : ""}
                        </span>
                      )}
                      {typeof c.distance_m === "number" && (
                        <span>{(c.distance_m / 1000).toFixed(1)} km</span>
                      )}
                      {c.reg_status === "ativa" && (
                        <span className="inline-flex items-center gap-1 text-[#4fc95a]">
                          <CheckCircle2 className="h-3 w-3" /> {t("active", "Ativa")}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* A nota da LINHA — quanto se sabe sobre ela, não qualidade
                      do lead. O título diz isso, porque o número sozinho
                      seria lido como "nota da empresa". */}
                  <span
                    title={t("confidenceHint", "Quanto a plataforma já sabe sobre esta empresa")}
                    className="border-2 border-[#0B0B0D] px-2 py-0.5 text-[11px] font-extrabold"
                    style={{ background: "#1D1810", color: accent }}
                  >
                    {c.confidence}%
                  </span>
                </div>

                {/* Canais */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.whatsapp && (
                    <a
                      href={`https://wa.me/55${c.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn("inline-flex items-center gap-1 px-2 py-1 text-xs text-[#F5F1E8]", INNER)}
                    >
                      <Phone className="h-3 w-3 text-[#25d366]" /> {fmtPhone(c.whatsapp)}
                    </a>
                  )}
                  {c.phone && c.phone !== c.whatsapp && (
                    <a
                      href={`tel:+55${c.phone}`}
                      className={cn("inline-flex items-center gap-1 px-2 py-1 text-xs text-[#F5F1E8]", INNER)}
                    >
                      <Phone className="h-3 w-3" style={{ color: accent }} /> {fmtPhone(c.phone)}
                    </a>
                  )}
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      className={cn("inline-flex items-center gap-1 px-2 py-1 text-xs text-[#F5F1E8]", INNER)}
                    >
                      <Mail className="h-3 w-3" style={{ color: accent }} /> {c.email}
                    </a>
                  )}
                  {c.website && (
                    <a
                      href={c.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn("inline-flex items-center gap-1 px-2 py-1 text-xs text-[#F5F1E8]", INNER)}
                    >
                      <Globe className="h-3 w-3" style={{ color: accent }} /> {c.domain}
                    </a>
                  )}
                  {c.instagram && (
                    <a
                      href={`https://instagram.com/${c.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn("inline-flex items-center gap-1 px-2 py-1 text-xs text-[#F5F1E8]", INNER)}
                    >
                      <Instagram className="h-3 w-3" style={{ color: accent }} /> @{c.instagram}
                    </a>
                  )}
                  {c.cnpj && (
                    <span className={cn("inline-flex items-center gap-1 px-2 py-1 text-xs text-[#9A938A]", INNER)}>
                      {fmtCnpj(c.cnpj)}
                    </span>
                  )}
                </div>

                {/* Ações */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {openList ? (
                    <>
                      <select
                        value={c.stage || "new"}
                        onChange={(e) => void setStage(openList.id_list, c.id_company, e.target.value)}
                        className="border-2 border-[#0B0B0D] bg-[#1D1810] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#F5F1E8] outline-none"
                      >
                        {catalog.stages.map((s) => (
                          <option key={s} value={s}>
                            {t(`stage_${s}`, s)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => void removeFromList(openList.id_list, c.id_company)}
                        className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#9A938A] underline"
                      >
                        {t("removeFromList", "Tirar da lista")}
                      </button>
                    </>
                  ) : (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setSaveMenuFor((v) => (v === c.id_company ? null : c.id_company))
                        }
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#F5F1E8]",
                          INNER
                        )}
                      >
                        <Bookmark
                          className="h-3.5 w-3.5"
                          style={{ color: (c.in_lists || []).length ? accent : undefined }}
                        />
                        {(c.in_lists || []).length ? t("savedShort", "Salvo") : t("save", "Salvar")}
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      {saveMenuFor === c.id_company && (
                        <div className={cn("absolute z-20 mt-1 min-w-44 p-1", PANEL)}>
                          {lists.length === 0 ? (
                            <p className="px-2 py-1.5 text-xs text-[#9A938A]">
                              {t("noLists", "Crie uma lista primeiro.")}
                            </p>
                          ) : (
                            lists.map((l) => (
                              <button
                                key={l.id_list}
                                type="button"
                                onClick={() => void addToList(l.id_list, c.id_company)}
                                className="block w-full px-2 py-1.5 text-left text-xs text-[#F5F1E8] hover:bg-[#1D1810]"
                              >
                                {l.name}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={busy === c.id_company}
                    onClick={() => void enrich(c.id_company)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#F5F1E8] disabled:opacity-50",
                      INNER
                    )}
                    title={t("enrichHint", "Procura e-mail, WhatsApp e redes no site oficial e o CNPJ na Receita")}
                  >
                    {busy === c.id_company ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" style={{ color: accent }} />
                    )}
                    {t("enrich", "Buscar mais dados")}
                  </button>

                  <button
                    type="button"
                    onClick={() => void openDetail(c.id_company)}
                    className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#9A938A] underline"
                  >
                    {t("detail", "Ficha completa")}
                  </button>
                </div>
              </article>
            ))}
          </div>

          {/* Paginação — só na busca; a lista salva vem inteira. */}
          {!openList && searched && total > rows.length && (
            <div className="mt-3 flex justify-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || searching}
                onClick={() => void runSearch(page - 1)}
                className={cn("px-4 py-2 text-xs font-extrabold uppercase text-[#F5F1E8] disabled:opacity-40", INNER)}
              >
                {t("prev", "Anterior")}
              </button>
              <button
                type="button"
                disabled={page * 24 >= total || searching}
                onClick={() => void runSearch(page + 1)}
                className={cn("px-4 py-2 text-xs font-extrabold uppercase text-[#F5F1E8] disabled:opacity-40", INNER)}
              >
                {t("next", "Próxima")}
              </button>
            </div>
          )}
        </section>
      </div>

      {/* ─── FICHA ─────────────────────────────────────────────────────────── */}
      {detail && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className={cn("max-h-[85dvh] w-full max-w-2xl overflow-y-auto", PANEL)}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b-2 border-[#0B0B0D] p-4">
              <div className="min-w-0">
                <h2 className="fl-display text-2xl leading-tight text-[#F5F1E8]">
                  {detail.company.display_name}
                </h2>
                {detail.company.legal_name && (
                  <p className="mt-0.5 text-xs text-[#9A938A]">{detail.company.legal_name}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                aria-label={t("close", "Fechar")}
                className="border-2 border-[#0B0B0D] bg-[#1D1810] p-1.5"
              >
                <X className="h-4 w-4 text-[#9A938A]" />
              </button>
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <Field label={t("dCnpj", "CNPJ")} value={fmtCnpj(detail.company.cnpj)} />
              <Field label={t("dCnae", "CNAE principal")} value={detail.company.main_cnae} />
              <Field
                label={t("dSize", "Porte")}
                value={detail.company.company_size ? t(`size_${detail.company.company_size}`, detail.company.company_size) : ""}
              />
              <Field label={t("dCapital", "Capital social")} value={money(detail.company.share_capital_cents)} />
              <Field label={t("dOpened", "Abertura")} value={detail.company.opened_at || ""} />
              <Field
                label={t("dStatus", "Situação cadastral")}
                value={detail.company.reg_status ? t(`status_${detail.company.reg_status}`, detail.company.reg_status) : ""}
              />
              <Field
                label={t("dAddress", "Endereço")}
                value={[
                  detail.company.address,
                  detail.company.address_number,
                  detail.company.neighborhood,
                  detail.company.city,
                  detail.company.uf,
                ]
                  .filter(Boolean)
                  .join(", ")}
              />
              <Field label={t("dZip", "CEP")} value={detail.company.zip_code || ""} />
            </div>

            {detail.company.description && (
              <p className="px-4 pb-3 text-sm text-[#9A938A]">{detail.company.description}</p>
            )}

            {/* ⚠️ AS FONTES SÃO O QUE TORNA O NÚMERO CONFIÁVEL. Um telefone sem
                origem é um telefone que ninguém sabe de onde veio — e é por
                esta lista que um pedido de correção pode ser atendido. */}
            <div className="border-t-2 border-[#0B0B0D] p-4">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
                {t("sources", "De onde vieram os dados")}
              </p>
              <ul className="mt-2 space-y-1">
                {detail.sources.length === 0 && (
                  <li className="text-xs text-[#9A938A]">{t("noSources", "Sem registro de origem.")}</li>
                )}
                {detail.sources.map((s, i) => (
                  <li key={`${s.field}-${s.source}-${i}`} className="text-xs text-[#9A938A]">
                    <span className="font-bold text-[#F5F1E8]">{t(`f_${s.field}`, s.field)}</span>{" "}
                    · {t(`src_${s.source}`, s.source)} ·{" "}
                    {new Date(s.last_seen_at).toLocaleDateString(locale)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">{label}</p>
      <p className="text-sm text-[#F5F1E8]">{value}</p>
    </div>
  )
}
