"use client"

// /minha-cidade — MINHA CIDADE (pedido do Alex, 2026-11-24): a entrada comum de
// Meu bairro e Meu condomínio. Plano no backend:
// docs/superpowers/plans/2026-11-24-minha-cidade.md.
//
// É O PADRÃO DO ESPORTES (`/esportes`): a pessoa escolhe uma vez (aqui, se mora
// em CASA ou em CONDOMÍNIO) e ganha a aba correspondente. E, como a aba da
// academia de lá, a aba daqui É a comunidade que já existe — `CommunityDetail`
// embutida, com mural, pills, vitrines, delivery (inclusive mudança), planta,
// avisos, enquetes, vagas e administração. Nenhuma segunda máquina.
//
// ⚠️ A ABA NÃO AUTORIZA NADA. Ela só escolhe o que MOSTRAR; quem pode publicar,
// ver vizinhos, abrir chamado ou administrar continua decidido pelas rotas da
// comunidade, da residência e do delivery. `?c=` só é honrado se a comunidade
// está nos vínculos da pessoa (`GET /me/city`), e mesmo assim o servidor
// confere tudo de novo.
//
// A URL: `?lugar=bairro|condominio` (a aba) e `?c=<id_profile>` (qual, quando
// há mais de uma). `?aba=`/`?painel=` são da comunidade embutida e passam
// direto — é por isso que a aba daqui não se chama `aba`.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { AlertCircle, Building2, ChevronDown, Home, MapPin, Search } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"
import { PageBackLink } from "@/components/tabloide"
import { getToken } from "@/lib/auth"
import { getPublicBackendUrl } from "@/lib/backend-public"
import { CommunityDetail } from "@/app/(header-only)/comunidades/[id]/community-detail"
import { NeighborhoodView } from "@/app/(header-only)/bairro/_components/neighborhood-view"
import { HousingPicker } from "./housing-picker"
import { CondoFinder } from "./condo-finder"
import { TAB_OF_HOUSING, readCityUrl, type CityData, type CityTab, type HousingKind } from "./city-types"

const GOLD = "#F2B705"

function authHeaders(): HeadersInit {
  const token = getToken()
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" }
}

/** Troca a URL sem recarregar. `push` = entra no histórico (voltar/avançar). */
function writeCityUrl(lugar: CityTab | null, c: string | null, push: boolean) {
  const sp = new URLSearchParams()
  if (lugar) sp.set("lugar", lugar)
  if (c) sp.set("c", c)
  const qs = sp.toString()
  const next = `${window.location.pathname}${qs ? `?${qs}` : ""}`
  if (next === `${window.location.pathname}${window.location.search}`) return
  if (push) window.history.pushState(null, "", next)
  else window.history.replaceState(null, "", next)
}

export function CityView() {
  const t = useTranslations("City")
  const hoodFlag = useFeature("bairro")
  const condoFlag = useFeature("condominio")

  const [data, setData] = useState<CityData | null>(null)
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error" | "anon">("loading")
  const [url, setUrl] = useState<{ lugar: CityTab | null; c: string | null }>({ lugar: null, c: null })
  const [savingHousing, setSavingHousing] = useState<HousingKind | null>(null)
  const [switchOpen, setSwitchOpen] = useState(false)
  const [residenceOpen, setResidenceOpen] = useState(false)
  // O condomínio aberto pela BUSCA (quem ainda não está em nenhum). Fica só na
  // memória: não é vínculo, e a URL de Minha cidade só leva o que é da pessoa.
  const [preview, setPreview] = useState<string | null>(null)
  // Só a última leitura de `/me/city` vale — um "entrei no bairro" seguido de
  // outra ação não pode ser desfeito por uma resposta atrasada.
  const loadSeq = useRef(0)

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setLoadState("anon")
      return
    }
    const my = ++loadSeq.current
    try {
      const r = await fetch(`${getPublicBackendUrl()}/me/city`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      const d = await r.json().catch(() => null)
      if (my !== loadSeq.current) return
      if (!r.ok || !d?.preference) throw new Error("load")
      setData({
        preference: d.preference,
        bairros: Array.isArray(d.bairros) ? d.bairros : [],
        condos: Array.isArray(d.condos) ? d.condos : [],
      })
      setLoadState("ready")
    } catch {
      // ⚠️ Falha ao LER não é "não tenho moradia": a tela mostra o erro e o
      // "tentar de novo", nunca a escolha do zero.
      if (my === loadSeq.current) setLoadState((s) => (s === "ready" ? s : "error"))
    }
  }, [])

  useEffect(() => {
    setUrl(readCityUrl())
    void load()
  }, [load])

  // Voltar/avançar do navegador: a aba e a comunidade vêm da URL de novo.
  useEffect(() => {
    const onPop = () => {
      setUrl(readCityUrl())
      setPreview(null)
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  const savePref = useCallback(async (body: { housing_kind?: HousingKind; last_tab?: CityTab }) => {
    const r = await fetch(`${getPublicBackendUrl()}/me/city`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(body),
    })
    const d = await r.json().catch(() => null)
    if (!r.ok || !d?.preference) throw new Error(d?.error || "save")
    return d.preference as CityData["preference"]
  }, [])

  // ─── o que mostrar ─────────────────────────────────────────────────────────
  const housing = data?.preference.housing_kind ?? null
  const bairros = useMemo(() => data?.bairros ?? [], [data])
  const condos = useMemo(() => data?.condos ?? [], [data])
  const hoodMembers = useMemo(
    () => bairros.filter((b): b is typeof b & { id_profile: string } => !!b.id_profile && b.is_member),
    [bairros]
  )

  // A aba aparece se a modalidade está ligada OU se a pessoa já tem vínculo
  // lá (flag desligada não pode esconder o caminho até um pedido em aberto) —
  // e se é a moradia escolhida ou onde ela já está.
  const showHood = (hoodFlag || bairros.length > 0) && (housing === "house" || bairros.length > 0)
  const showCondo = (condoFlag || condos.length > 0) && (housing === "condo" || condos.length > 0)
  const tabs: CityTab[] = [...(showHood ? (["bairro"] as const) : []), ...(showCondo ? (["condominio"] as const) : [])]

  const active: CityTab | null = (() => {
    if (url.lugar && tabs.includes(url.lugar)) return url.lugar
    if (url.c && condos.some((c) => c.id_profile === url.c) && tabs.includes("condominio")) return "condominio"
    if (url.c && hoodMembers.some((b) => b.id_profile === url.c) && tabs.includes("bairro")) return "bairro"
    const last = data?.preference.last_tab
    if (last && tabs.includes(last)) return last
    if (housing && tabs.includes(TAB_OF_HOUSING[housing])) return TAB_OF_HOUSING[housing]
    return tabs[0] ?? null
  })()

  const activeHoodId =
    (url.c && hoodMembers.find((b) => b.id_profile === url.c)?.id_profile) || hoodMembers[0]?.id_profile || null
  const ownCondoId =
    (url.c && condos.find((c) => c.id_profile === url.c)?.id_profile) || condos[0]?.id_profile || null
  const activeCondoId = ownCondoId || preview

  // ─── ações ─────────────────────────────────────────────────────────────────
  const goTab = (next: CityTab) => {
    if (next === active) return
    setUrl({ lugar: next, c: null })
    setResidenceOpen(false)
    setSwitchOpen(false)
    writeCityUrl(next, null, true)
    // Preferência de INTERFACE: falhar aqui só faz a próxima visita abrir na
    // aba padrão — não vale um aviso.
    void savePref({ last_tab: next }).catch(() => {})
  }

  const goCommunity = (lugar: CityTab, id: string) => {
    setUrl({ lugar, c: id })
    writeCityUrl(lugar, id, true)
  }

  const pickHousing = async (kind: HousingKind) => {
    if (savingHousing) return
    setSavingHousing(kind)
    try {
      const preference = await savePref({ housing_kind: kind, last_tab: TAB_OF_HOUSING[kind] })
      setData((prev) => (prev ? { ...prev, preference } : prev))
      setUrl({ lugar: TAB_OF_HOUSING[kind], c: null })
      writeCityUrl(TAB_OF_HOUSING[kind], null, true)
      setSwitchOpen(false)
      setPreview(null)
    } catch {
      toast.error(t("saveError", "Não deu para salvar agora. Tente de novo."))
    } finally {
      setSavingHousing(null)
    }
  }

  // ─── o cabeçalho do ambiente (vai DENTRO da comunidade embutida) ──────────
  const housingLabel =
    housing === "house"
      ? t("livesInHouse", "Moro em casa")
      : housing === "condo"
        ? t("livesInCondo", "Moro em condomínio")
        : t("chooseHousing", "Escolher moradia")

  const tabMeta: Record<CityTab, { label: string; icon: typeof Home }> = {
    bairro: { label: t("tabHood", "Meu bairro"), icon: Home },
    condominio: { label: t("tabCondo", "Meu condomínio"), icon: Building2 },
  }

  // Mais de uma comunidade na aba (conta antiga com dois bairros, síndico de
  // dois prédios): uma fileira para escolher qual, sem tirar nenhuma.
  const chips =
    active === "bairro"
      ? hoodMembers.map((b) => ({ id: b.id_profile, label: b.display_name || b.bairro_label || "—" }))
      : active === "condominio"
        ? condos.map((c) => ({ id: c.id_profile, label: c.display_name || "—" }))
        : []
  const chipActive = active === "bairro" ? activeHoodId : ownCondoId
  const myHood = active === "bairro" ? bairros.find((b) => b.id_profile === activeHoodId) : null

  const header = (
    <div className="mx-auto w-full max-w-5xl px-3 pt-6 md:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageBackLink href="/account" />
        {loadState === "ready" && (housing || tabs.length > 0) && (
          <button
            type="button"
            onClick={() => setSwitchOpen((o) => !o)}
            aria-expanded={switchOpen}
            className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#15120E] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#F5F1E8] hover:bg-[#1D1810] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F2B705]"
            style={{ boxShadow: "3px 3px 0 0 #0B0B0D" }}
          >
            <MapPin className="h-3.5 w-3.5 text-[#F2B705]" aria-hidden />
            {housingLabel}
            <span className="text-[#9A938A]">· {t("switchCta", "Trocar")}</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${switchOpen ? "rotate-180" : ""}`} aria-hidden />
          </button>
        )}
      </div>

      <h1 className="fl-display mt-4 text-3xl font-black uppercase tracking-tight text-[#F5F1E8]">
        {t("title", "Minha cidade")}
      </h1>

      {switchOpen && (
        <div className="mt-3">
          <HousingPicker
            compact
            current={housing}
            saving={savingHousing}
            showHouse={hoodFlag || bairros.length > 0}
            showCondo={condoFlag || condos.length > 0}
            onPick={(k) => void pickHousing(k)}
          />
        </div>
      )}

      {tabs.length > 0 && (
        <nav className="mt-4" aria-label={t("tabsAria", "Seções de Minha cidade")}>
          <div
            className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] border-2 border-[#0B0B0D]"
            style={{ boxShadow: "3px 3px 0 0 #0B0B0D" }}
          >
            {tabs.map((key) => {
              const on = active === key
              const Icon = tabMeta[key].icon
              return (
                <motion.button
                  key={key}
                  type="button"
                  onClick={() => goTab(key)}
                  aria-current={on ? "page" : undefined}
                  whileTap={{ y: 2 }}
                  className={`relative flex min-w-0 items-center justify-center gap-2 px-3 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#0B0B0D] ${
                    on ? "text-[#0B0B0D]" : "bg-[#1D1810] text-[#F5F1E8]/80 hover:text-[#F5F1E8]"
                  }`}
                >
                  {on && (
                    <motion.span
                      layoutId="city-tab"
                      className="absolute inset-0"
                      style={{ background: GOLD }}
                      transition={{ type: "spring", stiffness: 520, damping: 40 }}
                    />
                  )}
                  <Icon className="relative h-4 w-4 shrink-0" aria-hidden />
                  <span className="relative truncate">{tabMeta[key].label}</span>
                </motion.button>
              )
            })}
          </div>
        </nav>
      )}

      {chips.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={t("chipsAria", "Qual comunidade abrir")}>
          {chips.map((c) => {
            const on = c.id === chipActive
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => active && goCommunity(active, c.id)}
                className={`max-w-[16rem] truncate border-2 border-[#0B0B0D] px-3 py-1 text-[11px] font-bold ${
                  on ? "bg-[#F2B705] text-[#0B0B0D]" : "bg-[#15120E] text-[#F5F1E8]/80 hover:text-[#F5F1E8]"
                }`}
              >
                {c.label}
              </button>
            )
          })}
        </div>
      )}

      {/* A residência do bairro (status, vizinhos para confirmar, mudar de
          endereço) é da PESSOA, não da comunidade: mora atrás deste botão para
          não competir com o mural. */}
      {active === "bairro" && activeHoodId && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setResidenceOpen((o) => !o)}
            aria-expanded={residenceOpen}
            className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#15120E] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#F5F1E8] hover:bg-[#1D1810]"
          >
            <Home className="h-3.5 w-3.5 text-[#F2B705]" aria-hidden />
            {t("myResidence", "Minha residência e vizinhos")}
            {myHood?.residence_status && myHood.residence_status !== "recognized" && (
              <span className="text-[#F2B705]">· {t("needsAttention", "pendente")}</span>
            )}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${residenceOpen ? "rotate-180" : ""}`} aria-hidden />
          </button>
          {residenceOpen && (
            <div className="mt-3">
              <NeighborhoodView
                embedded
                onChanged={() => void load()}
                onOpen={(id) => goCommunity("bairro", id)}
              />
            </div>
          )}
        </div>
      )}

      {active === "condominio" && !ownCondoId && preview && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-2 border-[#0B0B0D] bg-[#15120E] px-3 py-2 text-xs">
          <span className="text-[#F5F1E8]/80">
            {t("previewNote", "Você está vendo um condomínio da busca. Para entrar, escolha seu apartamento na planta.")}
          </span>
          <button
            type="button"
            onClick={() => {
              setPreview(null)
              void load()
            }}
            className="inline-flex items-center gap-1.5 font-extrabold uppercase tracking-[0.1em] text-[#F2B705]"
          >
            <Search className="h-3.5 w-3.5" aria-hidden />
            {t("backToSearch", "Voltar à busca")}
          </button>
        </div>
      )}
    </div>
  )

  // ─── corpo ────────────────────────────────────────────────────────────────
  const shell = (body: React.ReactNode) => (
    <div className="fl-root fl-sharp relative min-h-[100dvh] overflow-x-clip bg-[#0b0804] pb-24 text-[#F5F1E8]">
      {header}
      <section className="mx-auto mt-6 w-full max-w-5xl md:px-10">{body}</section>
    </div>
  )

  if (loadState === "anon") {
    return shell(
      <StateCard
        title={t("anonTitle", "Entre na sua conta")}
        desc={t("anonBody", "Minha cidade reúne seu bairro e seu condomínio. Entre para ver os seus.")}
        action={{ href: "/login?next=/minha-cidade", label: t("loginCta", "Entrar") }}
      />
    )
  }
  if (loadState === "loading") {
    return shell(
      <div className="flex flex-col gap-3 px-3 md:px-0" aria-busy="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse border-2 border-[#F5F1E8]/10 bg-[#1D1810]" />
        ))}
      </div>
    )
  }
  if (loadState === "error" || !data) {
    return shell(
      <StateCard
        title={t("loadErrorTitle", "Não deu para abrir Minha cidade agora.")}
        desc={t("loadErrorBody", "Seu bairro e seu condomínio continuam guardados. Confira a conexão e tente de novo.")}
        onRetry={() => {
          setLoadState("loading")
          void load()
        }}
        retryLabel={t("retryCta", "Tentar de novo")}
      />
    )
  }
  if (!hoodFlag && !condoFlag && tabs.length === 0) {
    return shell(<StateCard title={t("disabledTitle", "Recurso indisponível no momento.")} desc="" />)
  }
  if (tabs.length === 0 || !active) {
    return shell(
      <HousingPicker
        current={housing}
        saving={savingHousing}
        showHouse={hoodFlag}
        showCondo={condoFlag}
        onPick={(k) => void pickHousing(k)}
      />
    )
  }

  if (active === "bairro") {
    if (activeHoodId) return <CommunityDetail key={activeHoodId} id={activeHoodId} embed={{ header }} />
    return shell(
      <div className="w-full max-w-3xl px-3 md:px-0">
        <NeighborhoodView embedded onChanged={() => void load()} onOpen={(id) => goCommunity("bairro", id)} />
      </div>
    )
  }

  if (activeCondoId) return <CommunityDetail key={activeCondoId} id={activeCondoId} embed={{ header }} />
  return shell(<CondoFinder onOpen={(id) => setPreview(id)} />)
}

function StateCard({
  title,
  desc,
  action,
  onRetry,
  retryLabel,
}: {
  title: string
  desc: string
  action?: { href: string; label: string }
  onRetry?: () => void
  retryLabel?: string
}) {
  return (
    <div className="w-full max-w-3xl px-3 md:px-0">
      <div className="border-2 border-[#0B0B0D] bg-[#15120E] p-5" style={{ boxShadow: "4px 4px 0 0 #F2B705" }}>
        <p className="flex items-center gap-2 text-sm font-black uppercase">
          <AlertCircle className="h-4 w-4 text-[#F2B705]" aria-hidden />
          {title}
        </p>
        {desc && <p className="mt-2 text-xs leading-relaxed text-[#F5F1E8]/70">{desc}</p>}
        {action && (
          <a
            href={action.href}
            className="mt-3 inline-block border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-1.5 text-xs font-black uppercase text-[#0b0804]"
          >
            {action.label}
          </a>
        )}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-1.5 text-xs font-black uppercase text-[#0b0804]"
          >
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  )
}
