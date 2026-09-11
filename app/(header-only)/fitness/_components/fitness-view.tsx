"use client"

// /fitness — A RAIZ DA PLATAFORMA FITNESS: o "Meu dia".
//
// ⚠️ REDESENHADA NOS MOLDES DO GAMES E DO FINANCEIRO (pedido do Alex,
// 2026-09-10): a casca, o headcard com a foto 2/3 e os quatro pills atrás
// dela, seções de ponta a ponta no celular. O que morava aqui e saiu para as
// salas dos pills: academia (laranja), treino (rosa), peso/altura/histórico
// (turquesa) e indicadores (turquesa). O que FICA é o dia: calorias e água
// lado a lado, e o diário de refeições embaixo.
//
// A data navega (< >) e aceita deep-link `?dia=YYYY-MM-DD` — é assim que o
// Histórico abre um dia antigo. Lido do `window` num efeito, nunca por
// `useSearchParams` (obriga Suspense) nem no initializer (hidratação).

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
  AlertCircle,
  Apple,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Flame,
  Loader2,
  Minus,
  Plus,
  ScanBarcode,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react"
import { getToken } from "@/lib/auth"
import { useMeProfile } from "@/hooks/use-me-profile"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { FitnessShell } from "./fitness-shell"
import { FitnessHeadcard } from "./fitness-headcard"
import { FitnessProposalsGate } from "./proposals-modal"
import {
  BTN_DARK,
  BTN_GOLD,
  CYAN,
  EMBER,
  GOLD,
  H_SECTION,
  INPUT,
  PANEL,
  StateBox,
  shiftDate,
  todayIso,
} from "./fitness-ui"

// BarcodeDetector é nativo em Chrome/Edge/Android e não faz parte da lib TS.
// Declaração mínima do que usamos; quando ausente, caímos na entrada manual.
type DetectedBarcode = { rawValue: string }
interface BarcodeDetectorInstance {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>
}
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorInstance

type Food = {
  id_food?: string
  external_ref?: string
  source?: string
  nome: string
  kcal_100g: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

type FoodLog = {
  id_log: string
  meal: "cafe" | "almoco" | "jantar" | "lanche"
  food_nome: string
  quantity_g: number
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

type Summary = {
  date: string
  goals: { daily_kcal_goal: number; water_goal_ml: number }
  totals: { kcal: number; protein_g: number; carbs_g: number; fat_g: number }
  water_ml: number
  logs: FoodLog[]
}

const MEALS: Array<{ id: FoodLog["meal"]; key: string; fallback: string }> = [
  { id: "cafe", key: "mealCafe", fallback: "Café da manhã" },
  { id: "almoco", key: "mealAlmoco", fallback: "Almoço" },
  { id: "lanche", key: "mealLanche", fallback: "Lanche" },
  { id: "jantar", key: "mealJantar", fallback: "Jantar" },
]

export function FitnessView() {
  const t = useTranslations("Fitness")
  const locale = useLocale()
  const { perfil } = useMeProfile()

  const [summary, setSummary] = useState<Summary | null>(null)
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")
  const [date, setDate] = useState(() => todayIso())

  const [searchOpen, setSearchOpen] = useState<FoodLog["meal"] | null>(null)
  const [q, setQ] = useState("")
  // Busca unificada com typeahead: TACO/custom (rápida) e Open Food Facts
  // (lenta) alimentam a MESMA lista conforme cada uma responde.
  const [localResults, setLocalResults] = useState<Food[]>([])
  const [offResults, setOffResults] = useState<Food[]>([])
  const [searching, setSearching] = useState(false)
  const [searchingOff, setSearchingOff] = useState(false)
  const searchSeq = useRef(0)
  const [picked, setPicked] = useState<Food | null>(null)
  const [grams, setGrams] = useState("100")
  const [adding, setAdding] = useState(false)

  // Scanner de código de barras (câmera nativa BarcodeDetector + digitação)
  const [scanOpen, setScanOpen] = useState(false)
  const [barcode, setBarcode] = useState("")
  const [scanLookup, setScanLookup] = useState(false)
  const [scanErr, setScanErr] = useState<string | null>(null)
  const [camActive, setCamActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [goalsOpen, setGoalsOpen] = useState(false)
  const [kcalGoal, setKcalGoal] = useState("2000")
  const [waterGoal, setWaterGoal] = useState("2000")

  const authHeaders = useCallback((): Record<string, string> => {
    const token = getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  // Deep-link `?dia=` (o Histórico abre um dia antigo por aqui).
  useEffect(() => {
    if (typeof window === "undefined") return
    const dia = new URLSearchParams(window.location.search).get("dia")
    if (dia && /^\d{4}-\d{2}-\d{2}$/.test(dia)) setDate(dia)
  }, [])

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`/api/fitness/summary?date=${date}`, { headers: authHeaders() })
      if (!res.ok) throw new Error()
      const data = (await res.json()) as Summary
      setSummary(data)
      setKcalGoal(String(data.goals.daily_kcal_goal))
      setWaterGoal(String(data.goals.water_goal_ml))
      setState("loaded")
    } catch {
      setState("error")
    }
  }, [date, authHeaders])

  useEffect(() => {
    void load()
  }, [load])

  // Typeahead: debounce de 350ms, uma sequência por digitação — resposta de
  // busca antiga é descartada. TACO preenche na hora; produtos (OFF) chegam
  // depois e se somam à mesma lista.
  useEffect(() => {
    if (!searchOpen) return
    const query = q.trim()
    if (query.length < 2) {
      setLocalResults([])
      setOffResults([])
      setSearching(false)
      setSearchingOff(false)
      return
    }
    const seq = ++searchSeq.current
    const timer = setTimeout(() => {
      setSearching(true)
      fetch(`/api/fitness/foods?q=${encodeURIComponent(query)}`, { headers: authHeaders() })
        .then((r) => r.json())
        .then((d) => {
          if (seq !== searchSeq.current) return
          setLocalResults(Array.isArray(d.foods) ? d.foods : [])
        })
        .catch(() => {})
        .finally(() => {
          if (seq === searchSeq.current) setSearching(false)
        })

      if (query.length >= 3) {
        setSearchingOff(true)
        fetch(`/api/fitness/foods/off?q=${encodeURIComponent(query)}`, { headers: authHeaders() })
          .then((r) => r.json())
          .then((d) => {
            if (seq !== searchSeq.current) return
            setOffResults(Array.isArray(d.foods) ? d.foods : [])
          })
          .catch(() => {})
          .finally(() => {
            if (seq === searchSeq.current) setSearchingOff(false)
          })
      } else {
        setOffResults([])
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [q, searchOpen, authHeaders])

  const addLog = useCallback(async () => {
    if (!picked || !searchOpen) return
    const qty = Number(grams)
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error(t("invalidGrams", "Quantidade inválida"))
      return
    }
    setAdding(true)
    try {
      let idFood = picked.id_food
      if (!idFood && picked.external_ref) {
        // produto do Open Food Facts: cacheia primeiro
        const cres = await fetch("/api/fitness/foods/off/cache", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(picked),
        })
        const cdata = await cres.json()
        if (!cres.ok) throw new Error(cdata.error)
        idFood = cdata.food.id_food
      }
      const res = await fetch("/api/fitness/food-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ id_food: idFood, meal: searchOpen, log_date: date, quantity_g: qty }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(t("logAdded", "Adicionado ao diário!"))
      setPicked(null)
      setSearchOpen(null)
      setScanOpen(false)
      setBarcode("")
      setScanErr(null)
      setLocalResults([])
      setOffResults([])
      setQ("")
      void load()
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : t("logError", "Erro ao adicionar"))
    } finally {
      setAdding(false)
    }
  }, [picked, searchOpen, grams, date, authHeaders, load, t])

  // Busca o produto pelo código (EAN/UPC) direto no Open Food Facts. Sucesso
  // → vira o item selecionado (picked) e fecha o scanner; o resto do fluxo
  // (definir gramas + adicionar) é o mesmo da busca por nome.
  const lookupByBarcode = useCallback(
    async (code: string) => {
      const clean = String(code || "").replace(/\D/g, "")
      if (clean.length < 8) {
        setScanErr(t("scanInvalid", "Código inválido. Aponte a câmera ou digite ao menos 8 dígitos."))
        return
      }
      setScanLookup(true)
      setScanErr(null)
      try {
        const res = await fetch(`/api/fitness/foods/off/barcode?code=${encodeURIComponent(clean)}`, {
          headers: authHeaders(),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || t("scanNotFound", "Produto não encontrado para este código"))
        setPicked(data.food)
        setScanOpen(false)
        setBarcode("")
      } catch (err) {
        setScanErr(err instanceof Error && err.message ? err.message : t("scanNotFound", "Produto não encontrado para este código"))
      } finally {
        setScanLookup(false)
      }
    },
    [authHeaders, t]
  )

  // Refs para o loop da câmera não reiniciar a cada render (t/lookup mudam de
  // identidade), mantendo o stream estável enquanto o scanner está aberto.
  const lookupRef = useRef(lookupByBarcode)
  const tRef = useRef(t)
  useEffect(() => {
    lookupRef.current = lookupByBarcode
    tRef.current = t
  }, [lookupByBarcode, t])

  // Câmera: usa BarcodeDetector nativo quando disponível (Chrome/Edge/Android
  // + desktop) — leve e sem lib. Ausente (ex.: iOS Safari) → carrega o ZXing
  // sob demanda (dynamic import, só nesses browsers) como fallback. Sem câmera
  // de jeito nenhum → só entrada manual, sem erro.
  useEffect(() => {
    if (!scanOpen) return
    if (!navigator.mediaDevices?.getUserMedia) return
    const Ctor = (typeof window !== "undefined"
      ? (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
      : undefined)
    let cancelled = false
    let raf = 0
    let zxingControls: { stop: () => void } | null = null

    const onDetected = (value: string) => {
      if (cancelled) return
      cancelled = true
      void lookupRef.current(value)
    }
    const camError = () =>
      setScanErr(tRef.current("scanCamDenied", "Não foi possível abrir a câmera. Digite o código abaixo."))

    // Caminho 1: BarcodeDetector nativo.
    const startNative = async (Detector: BarcodeDetectorCtor) => {
      const detector = new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] })
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop())
          return
        }
        streamRef.current = stream
        setCamActive(true)
        const v = videoRef.current
        if (v) {
          v.srcObject = stream
          await v.play().catch(() => {})
        }
        const tick = async () => {
          if (cancelled) return
          const vid = videoRef.current
          if (vid && vid.readyState >= 2) {
            try {
              const codes = await detector.detect(vid)
              if (codes && codes.length && codes[0].rawValue) {
                onDetected(codes[0].rawValue)
                return
              }
            } catch {
              /* frame ignorado */
            }
          }
          raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      } catch {
        camError()
      }
    }

    // Caminho 2: fallback ZXing (iOS Safari, Windows Chrome etc.) — decodifica
    // em JS puro. Precisa de dicas (TRY_HARDER + formatos 1D) e resolução alta,
    // senão não lê código de barras ao vivo.
    const startZxing = async () => {
      try {
        const [{ BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ])
        if (cancelled) return
        const hints = new Map()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
        ])
        hints.set(DecodeHintType.TRY_HARDER, true)
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 })
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } },
          videoRef.current ?? undefined,
          (result) => {
            if (result) onDetected(result.getText())
          }
        )
        if (cancelled) {
          controls.stop()
          return
        }
        zxingControls = controls
        setCamActive(true)
      } catch {
        camError()
      }
    }

    if (Ctor) void startNative(Ctor)
    else void startZxing()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      if (zxingControls) {
        try {
          zxingControls.stop()
        } catch {
          /* já parado */
        }
        zxingControls = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((tr) => tr.stop())
        streamRef.current = null
      }
      setCamActive(false)
    }
  }, [scanOpen])

  const removeLog = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/fitness/food-logs/${id}`, { method: "DELETE", headers: authHeaders() })
        if (!res.ok) throw new Error()
        void load()
      } catch {
        toast.error(t("logError", "Erro ao adicionar"))
      }
    },
    [authHeaders, load, t]
  )

  const setWater = useCallback(
    async (deltaMl: number) => {
      if (!summary) return
      const next = Math.max(0, summary.water_ml + deltaMl)
      setSummary({ ...summary, water_ml: next })
      try {
        await fetch("/api/fitness/water", {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ log_date: date, total_ml: next }),
        })
      } catch {
        void load()
      }
    },
    [summary, date, authHeaders, load]
  )

  const saveGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/fitness/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ daily_kcal_goal: Number(kcalGoal), water_goal_ml: Number(waterGoal) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(t("goalsSaved", "Metas atualizadas!"))
      setGoalsOpen(false)
      void load()
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : t("goalsError", "Erro ao salvar metas"))
    }
  }, [kcalGoal, waterGoal, authHeaders, load, t])

  const fmtDay = useMemo(() => {
    const d = new Date(`${date}T12:00:00Z`)
    return d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })
  }, [date, locale])
  const isToday = date === todayIso()

  const kcalPct = summary ? Math.min(100, Math.round((summary.totals.kcal / summary.goals.daily_kcal_goal) * 100)) : 0
  const waterPct = summary ? Math.min(100, Math.round((summary.water_ml / summary.goals.water_goal_ml) * 100)) : 0

  return (
    <FitnessShell>
      {/* Propostas pendentes do professor (confirmar/recusar) */}
      <FitnessProposalsGate onApplied={() => void load()} />

      <FitnessHeadcard
        perfil={perfil}
        title={t("platformTitle", "Fitness")}
        backHref="/account"
        action={
          <button onClick={() => setGoalsOpen(true)} className={`${BTN_DARK} px-3 py-2 text-[11px]`} aria-label={t("goalsTitle", "Metas")}>
            <Settings2 className="h-4 w-4" />
            {t("goalsTitle", "Metas")}
          </button>
        }
      />

      <section className="mx-auto mt-8 w-full max-w-5xl px-0 md:px-10">
        {/* A DATA: o dia que a tela mostra. */}
        <div className={`${PANEL} flex items-center justify-between gap-2 px-2 py-2`}>
          <button onClick={() => setDate((d) => shiftDate(d, -1))} className={`${BTN_DARK} p-2`} aria-label={t("prevDay", "Dia anterior")}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 text-center">
            <p className="truncate text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#E0813F]">{fmtDay}</p>
            {!isToday && (
              <button onClick={() => setDate(todayIso())} className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9A938A] hover:text-[#F5F1E8]">
                {t("today", "Hoje")} →
              </button>
            )}
          </div>
          <button onClick={() => setDate((d) => shiftDate(d, 1))} className={`${BTN_DARK} p-2`} aria-label={t("nextDay", "Próximo dia")}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {state === "loading" || !summary ? (
          state === "error" ? (
            <div className="mt-4">
              <StateBox
                icon={<AlertCircle className="h-6 w-6" />}
                title={t("loadFailedTitle", "Não deu pra carregar.")}
                desc={t("loadError", "Erro ao carregar o painel. Tente novamente.")}
                accent={EMBER}
              />
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="h-36 animate-pulse border-2 border-[#F5F1E8]/10 bg-[#1D1810]" />
              <div className="h-36 animate-pulse border-2 border-[#F5F1E8]/10 bg-[#1D1810]" />
            </div>
          )
        ) : (
          <>
            {/* CALORIAS e ÁGUA lado a lado — duas colunas também no celular
                (pedido do Alex: "vai fazer duas colunas, deixar um do lado do
                outro"). */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className={`${PANEL} p-4`} style={{ boxShadow: `6px 6px 0 0 ${GOLD}` }}>
                <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
                  <Flame className="h-4 w-4 text-[#E0813F]" /> {t("kcalTitle", "Calorias")}
                </p>
                <p className="mt-2 fl-display text-4xl leading-none text-[#F5F1E8]">{Math.round(summary.totals.kcal)}</p>
                <p className="mt-1 text-xs font-bold text-[#9A938A]">/ {summary.goals.daily_kcal_goal} kcal</p>
                <div className="mt-2 h-3 border-2 border-[#0B0B0D] bg-[#1D1810]">
                  <div className="h-full" style={{ width: `${kcalPct}%`, background: GOLD }} />
                </div>
                <p className="mt-2 text-[11px] text-[#9A938A]">
                  P {Math.round(summary.totals.protein_g)}g · C {Math.round(summary.totals.carbs_g)}g · G {Math.round(summary.totals.fat_g)}g
                </p>
              </div>

              <div className={`${PANEL} p-4`} style={{ boxShadow: `6px 6px 0 0 ${CYAN}` }}>
                <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
                  <Droplets className="h-4 w-4" style={{ color: CYAN }} /> {t("waterTitle", "Água")}
                </p>
                <p className="mt-2 fl-display text-4xl leading-none text-[#F5F1E8]">{(summary.water_ml / 1000).toFixed(1)}</p>
                <p className="mt-1 text-xs font-bold text-[#9A938A]">/ {(summary.goals.water_goal_ml / 1000).toFixed(1)} L</p>
                <div className="mt-2 h-3 border-2 border-[#0B0B0D] bg-[#1D1810]">
                  <div className="h-full" style={{ width: `${waterPct}%`, background: CYAN }} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button onClick={() => void setWater(-250)} className={`${BTN_DARK} p-1.5`} aria-label={t("waterMinus", "Remover copo")}>
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => void setWater(250)}
                    className="flex items-center gap-1 border-2 border-[#0B0B0D] px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D]"
                    style={{ background: CYAN }}
                  >
                    <Plus className="h-3.5 w-3.5" /> {t("waterCup", "Copo 250ml")}
                  </button>
                </div>
              </div>
            </div>

            {/* Diário de refeições */}
            <section className="mt-8">
              <h2 className={`${H_SECTION} px-3 md:px-0`}>
                <Apple className="h-4 w-4 text-[#E0813F]" /> {t("diaryTitle", "Diário de refeições")}
              </h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {MEALS.map((meal) => {
                  const logs = summary.logs.filter((l) => l.meal === meal.id)
                  const mealKcal = logs.reduce((acc, l) => acc + l.kcal, 0)
                  return (
                    <div key={meal.id} className={PANEL}>
                      <div className="flex items-center justify-between border-b-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2">
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em]">{t(meal.key, meal.fallback)}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-[#9A938A]">{Math.round(mealKcal)} kcal</span>
                          <button
                            onClick={() => {
                              setSearchOpen(meal.id)
                              setQ("")
                              setLocalResults([])
                              setOffResults([])
                              setPicked(null)
                              setGrams("100")
                            }}
                            className="border-2 border-[#0B0B0D] bg-[#B4470F] p-1 text-[#F7F1EC]"
                            aria-label={t("addFood", "Adicionar alimento")}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {logs.length === 0 ? (
                        <p className="px-3 py-4 text-xs text-[#9A938A]">{t("mealEmpty", "Nada registrado.")}</p>
                      ) : (
                        <ul>
                          {logs.map((l) => (
                            <li key={l.id_log} className="flex items-center justify-between gap-2 border-b border-[#F5F1E8]/10 px-3 py-2 text-sm last:border-b-0">
                              <span className="min-w-0 flex-1 truncate">{l.food_nome}</span>
                              <span className="text-xs text-[#9A938A]">{Math.round(l.quantity_g)}g</span>
                              <span className="text-xs font-bold text-[#E0813F]">{Math.round(l.kcal)} kcal</span>
                              <button onClick={() => void removeLog(l.id_log)} aria-label={t("removeLog", "Remover")}>
                                <Trash2 className="h-3.5 w-3.5 text-[#9A938A] hover:text-[#ff5a44]" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          </>
        )}
      </section>

      {/* Modal busca de alimento */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => {
            setSearchOpen(null)
            setScanOpen(false)
          }}
        >
          <div
            className={`flex max-h-[90vh] w-full max-w-lg flex-col ${PANEL} text-[#F5F1E8]`}
            style={{ boxShadow: `8px 8px 0 0 ${GOLD}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b-2 border-[#0B0B0D] p-4">
              <h2 className="text-lg font-black uppercase">{t("searchTitle", "Adicionar alimento")}</h2>
              <button
                onClick={() => {
                  setSearchOpen(null)
                  setScanOpen(false)
                }}
                aria-label={t("close", "Fechar")}
              >
                <X className="h-5 w-5 text-[#9A938A] hover:text-[#F5F1E8]" />
              </button>
            </div>

            {!picked ? (
              <>
                <div className="flex items-center gap-2 border-b-2 border-[#0B0B0D] p-3">
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#E0813F]" />
                  ) : (
                    <Search className="h-4 w-4 text-[#9A938A]" />
                  )}
                  <input
                    autoFocus
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={t("searchUnifiedPh", "Digite: arroz, frango, whey, coca-cola...")}
                    className="w-full bg-transparent text-sm outline-none placeholder:text-[#9A938A]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setScanErr(null)
                    setBarcode("")
                    setScanOpen(true)
                  }}
                  className="flex w-full items-center gap-2 border-b-2 border-[#0B0B0D] px-3 py-2.5 text-left text-xs font-extrabold uppercase tracking-[0.1em] text-[#E0813F] hover:bg-[#1D1810]"
                >
                  <ScanBarcode className="h-4 w-4" />
                  {t("scanCta", "Escanear código de barras")}
                </button>
                <div className="min-h-40 flex-1 overflow-y-auto">
                  {q.trim().length < 2 ? (
                    <p className="p-4 text-xs text-[#9A938A]">
                      {t(
                        "searchUnifiedHint",
                        "Vai buscando enquanto você digita: alimentos brasileiros (TACO) e produtos industrializados juntos."
                      )}
                    </p>
                  ) : localResults.length === 0 && offResults.length === 0 && !searching && !searchingOff ? (
                    <p className="p-4 text-xs text-[#9A938A]">
                      {t("searchNoResultsScan", "Nada encontrado pelo nome. Tente escanear o código de barras da embalagem.")}
                    </p>
                  ) : (
                    <ul>
                      {[...localResults, ...offResults].map((f, i) => {
                        const isProduct = !f.id_food && !!f.external_ref
                        return (
                          <li key={f.id_food || f.external_ref || i}>
                            <button
                              onClick={() => setPicked(f)}
                              className="flex w-full items-center justify-between gap-2 border-b border-[#F5F1E8]/10 px-4 py-2.5 text-left text-sm hover:bg-[#1D1810]"
                            >
                              <span className="min-w-0 flex-1 truncate">{f.nome}</span>
                              {isProduct && (
                                <span className="shrink-0 border border-[#9A938A]/40 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#9A938A]">
                                  {t("srcProduct", "Produto")}
                                </span>
                              )}
                              <span className="shrink-0 text-xs font-bold text-[#9A938A]">{Math.round(f.kcal_100g)} kcal/100g</span>
                            </button>
                          </li>
                        )
                      })}
                      {searchingOff && (
                        <li className="flex items-center gap-2 px-4 py-2.5 text-xs text-[#9A938A]">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {t("searchingProducts", "Buscando produtos industrializados...")}
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </>
            ) : (
              <div className="p-4">
                <p className="text-sm font-black">{picked.nome}</p>
                <p className="mt-1 text-xs text-[#9A938A]">
                  {Math.round(picked.kcal_100g)} kcal · P {picked.protein_g}g · C {picked.carbs_g}g · G {picked.fat_g}g (100g)
                </p>
                <label className="mt-4 block">
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">{t("gramsLabel", "Quantidade (g)")}</span>
                  <input
                    autoFocus
                    value={grams}
                    onChange={(e) => setGrams(e.target.value)}
                    inputMode="numeric"
                    className={`${INPUT} mt-1 text-lg font-black`}
                  />
                </label>
                <p className="mt-2 text-sm font-bold text-[#E0813F]">
                  = {Math.round((picked.kcal_100g * (Number(grams) || 0)) / 100)} kcal
                </p>
                <div className="mt-4 flex justify-end gap-2 border-t-2 border-[#0B0B0D] pt-3">
                  <button onClick={() => setPicked(null)} className={`${BTN_DARK} px-4 py-2 text-xs`}>
                    {t("back", "Voltar")}
                  </button>
                  <button onClick={() => void addLog()} disabled={adding} className={`${BTN_GOLD} px-4 py-2 text-xs`}>
                    {adding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {t("addSubmit", "Adicionar")}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Overlay do scanner de código de barras (sobre o modal de busca) */}
          {scanOpen && (
            <div
              className="absolute inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
              onClick={() => setScanOpen(false)}
            >
              <div
                className={`flex w-full max-w-md flex-col ${PANEL} text-[#F5F1E8]`}
                style={{ boxShadow: `8px 8px 0 0 ${GOLD}` }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between border-b-2 border-[#0B0B0D] p-4">
                  <h2 className="text-lg font-black uppercase">{t("scanTitle", "Código de barras")}</h2>
                  <button onClick={() => setScanOpen(false)} aria-label={t("close", "Fechar")}>
                    <X className="h-5 w-5 text-[#9A938A] hover:text-[#F5F1E8]" />
                  </button>
                </div>
                <div className="p-4">
                  <div className="relative aspect-video w-full overflow-hidden border-2 border-[#0B0B0D] bg-black">
                    <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
                    {!camActive && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                        <ScanBarcode className="h-8 w-8 text-[#9A938A]" />
                        <p className="text-xs text-[#9A938A]">
                          {t("scanCamHint", "Aponte a câmera para o código de barras. Se a câmera não abrir, digite o código abaixo.")}
                        </p>
                      </div>
                    )}
                    {camActive && (
                      <div className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-3/4 -translate-x-1/2 -translate-y-1/2 border-2 border-[#B4470F]" />
                    )}
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      void lookupByBarcode(barcode)
                    }}
                    className="mt-4 flex gap-2"
                  >
                    <input
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      inputMode="numeric"
                      placeholder={t("scanManualPh", "Digite o código (ex: 7891000100103)")}
                      className={INPUT}
                    />
                    <button type="submit" disabled={scanLookup} className={`${BTN_GOLD} shrink-0 px-4 py-2 text-xs`}>
                      {scanLookup ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("scanLookupBtn", "Buscar")}
                    </button>
                  </form>
                  {scanErr && <p className="mt-2 text-xs font-bold text-red-400">{scanErr}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal metas */}
      {goalsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setGoalsOpen(false)}>
          <div
            className={`w-full max-w-sm ${PANEL} p-5 text-[#F5F1E8]`}
            style={{ boxShadow: `8px 8px 0 0 ${GOLD}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="border-b-2 border-[#0B0B0D] pb-2 text-lg font-black uppercase">{t("goalsTitle", "Metas")}</h2>
            <label className="mt-4 block">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">{t("goalKcalLabel", "Meta diária de calorias (kcal)")}</span>
              <input value={kcalGoal} onChange={(e) => setKcalGoal(e.target.value)} inputMode="numeric" className={`${INPUT} mt-1`} />
            </label>
            <label className="mt-3 block">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">{t("goalWaterLabel", "Meta diária de água (ml)")}</span>
              <input value={waterGoal} onChange={(e) => setWaterGoal(e.target.value)} inputMode="numeric" className={`${INPUT} mt-1`} />
            </label>
            <div className="mt-4 flex justify-end gap-2 border-t-2 border-[#0B0B0D] pt-3">
              <button onClick={() => setGoalsOpen(false)} className={`${BTN_DARK} px-4 py-2 text-xs`}>
                {t("cancel", "Cancelar")}
              </button>
              <button onClick={() => void saveGoals()} className={`${BTN_GOLD} px-4 py-2 text-xs`}>
                {t("goalsSubmit", "Salvar metas")}
              </button>
            </div>
          </div>
        </div>
      )}
    </FitnessShell>
  )
}
