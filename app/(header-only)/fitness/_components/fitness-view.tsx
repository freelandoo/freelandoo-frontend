"use client"

// Painel Fitness PESSOAL — identidade Freelandoo (tabloide escuro/dourado,
// mesma linguagem da página de comunidade): canvas #0b0804, painéis #15120E
// com borda #0B0B0D e sombra dura dourada, chips rotacionados. Header estilo
// perfil com a foto do usuário; academia é opcional (CTA "Conecte-se").

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  Apple,
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Dumbbell,
  Flame,
  Loader2,
  Lock,
  Minus,
  Plus,
  Ruler,
  ScanBarcode,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react"
import { getToken, getStoredUser } from "@/lib/auth"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"
import { WorkoutTodayCard } from "./workout-today-card"
import { FitnessProposalsGate } from "./proposals-modal"
import { IndicatorsTab } from "./indicators-tab"

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

type AcademySummary = {
  id_member: string
  academy: { nome: string; slug: string; avatar_url: string | null }
  membership_status: string
  plan_name: string | null
  expires_at: string | null
  month_days: string[]
  frequency_days_30d: number
  payments: { external_id: string; amount_cents: number; due_date: string | null; status: string; paid_at: string | null }[]
}

type Summary = {
  date: string
  goals: { daily_kcal_goal: number; water_goal_ml: number }
  totals: { kcal: number; protein_g: number; carbs_g: number; fat_g: number }
  water_ml: number
  logs: FoodLog[]
  latest_measurement: { weight_kg: number | null; height_cm: number | null; measured_at: string } | null
  academies: AcademySummary[]
}

type Me = { nome: string | null; username: string | null; avatar: string | null }

const MEALS: Array<{ id: FoodLog["meal"]; key: string; fallback: string }> = [
  { id: "cafe", key: "mealCafe", fallback: "Café da manhã" },
  { id: "almoco", key: "mealAlmoco", fallback: "Almoço" },
  { id: "lanche", key: "mealLanche", fallback: "Lanche" },
  { id: "jantar", key: "mealJantar", fallback: "Jantar" },
]

const PAY_STATUS: Record<string, [string, string]> = {
  paid: ["payPaid", "Pago"],
  pending: ["payPending", "Pendente"],
  overdue: ["payOverdue", "Atrasado"],
}

// Identidade (mesma da página de comunidade)
const GOLD = "#F2B705"
const CYAN = "#16c8e8"
const PANEL = "border-2 border-[#0B0B0D] bg-[#15120E]"
const INNER = "border-2 border-[#0B0B0D] bg-[#1D1810]"
const BTN_GOLD =
  "inline-flex items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D] font-extrabold uppercase tracking-[0.12em] disabled:opacity-50"
const BTN_DARK =
  "inline-flex items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] text-[#F5F1E8] font-extrabold uppercase tracking-[0.12em] hover:bg-[#241d12] disabled:opacity-50"
const H_SECTION = "flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#F5F1E8]"
const INPUT = "w-full border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-[#F5F1E8] outline-none placeholder:text-[#9A938A]"

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function FitnessView() {
  const t = useTranslations("Fitness")
  const locale = useLocale()
  const enabled = useFeature("fitness_academias")

  const [summary, setSummary] = useState<Summary | null>(null)
  const [state, setState] = useState<"loading" | "loaded" | "locked" | "error">("loading")
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [refreshKey, setRefreshKey] = useState(0)
  const [me, setMe] = useState<Me | null>(null)
  const [view, setView] = useState<"day" | "indicators">("day")

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

  const [measureOpen, setMeasureOpen] = useState(false)
  const [weight, setWeight] = useState("")
  const [height, setHeight] = useState("")
  const [savingMeasure, setSavingMeasure] = useState(false)

  const [goalsOpen, setGoalsOpen] = useState(false)
  const [kcalGoal, setKcalGoal] = useState("2000")
  const [waterGoal, setWaterGoal] = useState("2000")

  const authHeaders = useCallback((): Record<string, string> => {
    const token = getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setState("locked")
      return
    }
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
    if (enabled) void load()
  }, [enabled, load])

  // Foto/nome do usuário pro header de perfil (fallback: localStorage).
  useEffect(() => {
    const stored = getStoredUser()
    if (stored) setMe({ nome: stored.nome || null, username: null, avatar: stored.avatar || null })
    const token = getToken()
    if (!token) return
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setMe({ nome: d.nome || null, username: d.username || null, avatar: d.avatar || null })
      })
      .catch(() => {})
  }, [])

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

  const saveMeasurement = useCallback(async () => {
    const w = weight.trim() ? Number(weight.replace(",", ".")) : null
    const h = height.trim() ? Number(height.replace(",", ".")) : null
    if (w === null && h === null) {
      toast.error(t("measureMissing", "Informe peso e/ou altura"))
      return
    }
    setSavingMeasure(true)
    try {
      const res = await fetch("/api/fitness/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ weight_kg: w, height_cm: h }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(t("measureSaved", "Medição registrada!"))
      setMeasureOpen(false)
      setWeight("")
      setHeight("")
      void load()
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : t("measureError", "Erro ao registrar medição"))
    } finally {
      setSavingMeasure(false)
    }
  }, [weight, height, authHeaders, load, t])

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

  if (!enabled) {
    return (
      <div className="fl-sharp flex min-h-[100dvh] items-center justify-center bg-[#0b0804] px-4 text-center text-[#F5F1E8]">
        <div>
          <Dumbbell className="mx-auto h-10 w-10 text-[#9A938A]" />
          <p className="mt-4 text-sm text-[#9A938A]">{t("disabled", "Recurso indisponível no momento.")}</p>
        </div>
      </div>
    )
  }

  // Sem login: o painel fitness é pessoal — só precisa entrar na conta.
  if (state === "locked") {
    return (
      <div className="fl-sharp flex min-h-[100dvh] items-center justify-center bg-[#0b0804] px-4 text-[#F5F1E8]">
        <div className={`${PANEL} max-w-md px-8 py-12 text-center`} style={{ boxShadow: `8px 8px 0 0 ${GOLD}` }}>
          <span className="inline-flex h-16 w-16 items-center justify-center border-2 border-[#0B0B0D] bg-[#1D1810]">
            <Lock className="h-7 w-7 text-[#F2B705]" />
          </span>
          <h1 className="mt-5 text-3xl font-black uppercase leading-none">{t("lockedTitle", "Painel Fitness")}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-[#9A938A]">
            {t("loginText", "Entre na sua conta para acompanhar calorias, água, peso e treinos.")}
          </p>
          <Link href="/login" className={`${BTN_GOLD} mt-6 px-6 py-3 text-xs`}>
            {t("loginCta", "Entrar")}
          </Link>
        </div>
      </div>
    )
  }

  if (state === "loading" || !summary) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0b0804]">
        <Loader2 className="h-6 w-6 animate-spin text-[#9A938A]" />
      </div>
    )
  }

  if (state === "error") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0b0804] px-4 text-center text-sm text-[#9A938A]">
        {t("loadError", "Erro ao carregar o painel. Tente novamente.")}
      </div>
    )
  }

  const kcalPct = Math.min(100, Math.round((summary.totals.kcal / summary.goals.daily_kcal_goal) * 100))
  const waterPct = Math.min(100, Math.round((summary.water_ml / summary.goals.water_goal_ml) * 100))

  return (
    <div className="fl-sharp min-h-[100dvh] bg-[#0b0804] pb-24 text-[#F5F1E8]">
      <div className="mx-auto max-w-5xl px-4 pt-6 md:px-6">
        {/* Propostas pendentes do professor (confirmar/recusar) */}
        <FitnessProposalsGate
          onApplied={() => {
            setRefreshKey((k) => k + 1)
            void load()
          }}
        />

        {/* Header estilo perfil */}
        <header className={`relative ${PANEL}`} style={{ boxShadow: `8px 8px 0 0 ${GOLD}` }}>
          <span className="absolute -top-3 left-4 z-10 -rotate-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#0B0B0D]">
            {t("eyebrow", "Painel Fitness")}
          </span>
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 pt-7">
            <div className="flex items-center gap-4">
              <div
                className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-[#0B0B0D] bg-[#1D1810] md:h-24 md:w-24"
                style={{ outline: `2px solid ${GOLD}`, outlineOffset: "2px" }}
                data-avatar
              >
                {me?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={me.avatar} alt="" className="h-full w-full rounded-full object-cover" data-avatar />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">
                    <Dumbbell className="h-8 w-8 text-[#9A938A]" />
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-black uppercase leading-none tracking-tight md:text-3xl">
                  {me?.nome || t("title", "Meu dia")}
                </h1>
                {me?.username && <p className="mt-1 text-xs font-bold text-[#9A938A]">@{me.username}</p>}
                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#F2B705]">{fmtDay}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/academias?criar=1" className={`${BTN_GOLD} px-3 py-2 text-[11px]`} aria-label={t("createAcademyCta", "Criar academia")}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t("createAcademyCta", "Criar academia")}</span>
              </Link>
              <button onClick={() => setDate((d) => shiftDate(d, -1))} className={`${BTN_DARK} p-2`} aria-label={t("prevDay", "Dia anterior")}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setDate((d) => shiftDate(d, 1))} className={`${BTN_DARK} p-2`} aria-label={t("nextDay", "Próximo dia")}>
                <ChevronRight className="h-4 w-4" />
              </button>
              <button onClick={() => setGoalsOpen(true)} className={`${BTN_DARK} px-3 py-2 text-[11px]`} aria-label={t("goalsTitle", "Metas")}>
                <Settings2 className="h-4 w-4" />
                {t("goalsTitle", "Metas")}
              </button>
            </div>
          </div>
        </header>

        {/* Abas: Meu dia / Indicadores */}
        <div className="mt-6 flex gap-[2px] border-2 border-[#0B0B0D] bg-[#0B0B0D]">
          <button
            onClick={() => setView("day")}
            className={`flex-1 px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.14em] ${view === "day" ? "bg-[#F2B705] text-[#0B0B0D]" : "bg-[#15120E] text-[#9A938A] hover:bg-[#1D1810]"}`}
          >
            {t("tabDay", "Meu dia")}
          </button>
          <button
            onClick={() => setView("indicators")}
            className={`flex-1 px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.14em] ${view === "indicators" ? "bg-[#F2B705] text-[#0B0B0D]" : "bg-[#15120E] text-[#9A938A] hover:bg-[#1D1810]"}`}
          >
            {t("tabIndicators", "Indicadores")}
          </button>
        </div>

        {view === "indicators" && <IndicatorsTab />}

        {view === "day" && (
          <>
        {/* Cards do dia */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Calorias */}
          <div className={`${PANEL} p-4`}>
            <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
              <Flame className="h-4 w-4 text-[#F2B705]" /> {t("kcalTitle", "Calorias")}
            </p>
            <p className="mt-2 text-3xl font-black">
              {Math.round(summary.totals.kcal)}
              <span className="text-sm font-bold text-[#9A938A]"> / {summary.goals.daily_kcal_goal} kcal</span>
            </p>
            <div className="mt-2 h-3 border-2 border-[#0B0B0D] bg-[#1D1810]">
              <div className="h-full" style={{ width: `${kcalPct}%`, background: GOLD }} />
            </div>
            <p className="mt-2 text-[11px] text-[#9A938A]">
              P {Math.round(summary.totals.protein_g)}g · C {Math.round(summary.totals.carbs_g)}g · G {Math.round(summary.totals.fat_g)}g
            </p>
          </div>

          {/* Água */}
          <div className={`${PANEL} p-4`}>
            <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
              <Droplets className="h-4 w-4" style={{ color: CYAN }} /> {t("waterTitle", "Água")}
            </p>
            <p className="mt-2 text-3xl font-black">
              {(summary.water_ml / 1000).toFixed(1)}
              <span className="text-sm font-bold text-[#9A938A]"> / {(summary.goals.water_goal_ml / 1000).toFixed(1)} L</span>
            </p>
            <div className="mt-2 h-3 border-2 border-[#0B0B0D] bg-[#1D1810]">
              <div className="h-full" style={{ width: `${waterPct}%`, background: CYAN }} />
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => void setWater(-250)} className={`${BTN_DARK} p-1.5`} aria-label={t("waterMinus", "Remover copo")}>
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => void setWater(250)}
                className="flex items-center gap-1 border-2 border-[#0B0B0D] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D]"
                style={{ background: CYAN }}
              >
                <Plus className="h-3.5 w-3.5" /> {t("waterCup", "Copo 250ml")}
              </button>
            </div>
          </div>

          {/* Medidas */}
          <div className={`${PANEL} p-4`}>
            <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
              <Ruler className="h-4 w-4 text-[#F2B705]" /> {t("measureTitle", "Peso & altura")}
            </p>
            {summary.latest_measurement ? (
              <p className="mt-2 text-3xl font-black">
                {summary.latest_measurement.weight_kg ? `${Number(summary.latest_measurement.weight_kg).toFixed(1)}kg` : "—"}
                <span className="text-sm font-bold text-[#9A938A]">
                  {" "}
                  {summary.latest_measurement.height_cm ? `· ${Number(summary.latest_measurement.height_cm).toFixed(0)}cm` : ""}
                </span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-[#9A938A]">{t("measureEmpty", "Nenhuma medição ainda.")}</p>
            )}
            <button onClick={() => setMeasureOpen(true)} className={`${BTN_DARK} mt-3 px-3 py-1.5 text-[11px]`}>
              {t("measureCta", "Registrar")}
            </button>
          </div>

          {/* Treino de hoje (fase 3) */}
          <WorkoutTodayCard date={date} refreshKey={refreshKey} />
        </div>

        {/* Diário de refeições */}
        <section className="mt-10">
          <h2 className={H_SECTION}>
            <Apple className="h-4 w-4 text-[#F2B705]" /> {t("diaryTitle", "Diário de refeições")}
          </h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
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
                        className="border-2 border-[#0B0B0D] bg-[#F2B705] p-1 text-[#0B0B0D]"
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
                          <span className="text-xs font-bold text-[#F2B705]">{Math.round(l.kcal)} kcal</span>
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

        {/* Academia: frequência + matrícula */}
        <section className="mt-10">
          <h2 className={H_SECTION}>
            <CalendarDays className="h-4 w-4 text-[#F2B705]" /> {t("gymTitle", "Minha academia")}
          </h2>
          {summary.academies.length === 0 ? (
            <div className={`${PANEL} mt-3 px-6 py-12 text-center`} style={{ boxShadow: `8px 8px 0 0 ${GOLD}` }}>
              <span className="inline-flex h-14 w-14 items-center justify-center border-2 border-[#0B0B0D] bg-[#1D1810]">
                <Dumbbell className="h-6 w-6 text-[#F2B705]" />
              </span>
              <p className="mx-auto mt-4 max-w-md text-sm text-[#9A938A]">
                {t(
                  "connectText",
                  "Seu painel funciona sozinho. Conectando a uma academia parceira, você ganha frequência da catraca, mensalidades e um professor que monta seus treinos."
                )}
              </p>
              <Link href="/academias" className={`${BTN_GOLD} mt-5 px-6 py-3 text-xs`}>
                <Dumbbell className="h-4 w-4" />
                {t("connectCta", "Conecte-se a uma academia")}
              </Link>
            </div>
          ) : (
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              {summary.academies.map((a) => (
                <div key={a.id_member} className={`${PANEL} p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/academias/${a.academy.slug}`} className="text-lg font-black uppercase leading-tight hover:text-[#F2B705]">
                        {a.academy.nome}
                      </Link>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-[#9A938A]">
                        <BadgeCheck className="h-3.5 w-3.5 text-[#F2B705]" />
                        {a.plan_name || t("gymNoPlan", "Sem plano informado")} · {a.membership_status}
                      </p>
                    </div>
                    <div className={`${INNER} px-3 py-1 text-center`}>
                      <p className="text-2xl font-black text-[#F2B705]">{a.frequency_days_30d}</p>
                      <p className="text-[10px] font-bold uppercase text-[#9A938A]">{t("gymFreq30", "dias / 30d")}</p>
                    </div>
                  </div>

                  {/* Calendário do mês (dias com giro) */}
                  <MonthDots date={date} days={a.month_days} label={t("gymMonthLabel", "Presenças no mês")} />

                  {/* Mensalidades */}
                  {a.payments.length > 0 && (
                    <div className="mt-3 border-t-2 border-[#0B0B0D] pt-2">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">{t("gymPayments", "Mensalidades")}</p>
                      <ul className="mt-1 space-y-1">
                        {a.payments.slice(0, 4).map((p) => {
                          const meta = PAY_STATUS[p.status] || PAY_STATUS.pending
                          return (
                            <li key={p.external_id} className="flex items-center justify-between text-xs">
                              <span className="text-[#9A938A]">
                                {p.due_date ? new Date(p.due_date).toLocaleDateString(locale) : "—"}
                              </span>
                              <span className="font-bold">
                                {(p.amount_cents / 100).toLocaleString(locale, { style: "currency", currency: "BRL" })}
                              </span>
                              <span
                                className={`border-2 border-[#0B0B0D] px-1.5 py-0.5 text-[10px] font-extrabold uppercase ${p.status === "paid" ? "bg-[#4fc95a] text-[#0B0B0D]" : p.status === "overdue" ? "bg-[#ff5a44] text-[#0B0B0D]" : "bg-[#1D1810] text-[#9A938A]"}`}
                              >
                                {t(meta[0], meta[1])}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
          </>
        )}
      </div>

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
            className={`fl-sharp flex max-h-[90vh] w-full max-w-lg flex-col ${PANEL} text-[#F5F1E8]`}
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
                    <Loader2 className="h-4 w-4 animate-spin text-[#F2B705]" />
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
                  className="flex w-full items-center gap-2 border-b-2 border-[#0B0B0D] px-3 py-2.5 text-left text-xs font-extrabold uppercase tracking-[0.1em] text-[#F2B705] hover:bg-[#1D1810]"
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
                <p className="mt-2 text-sm font-bold text-[#F2B705]">
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
                className={`fl-sharp flex w-full max-w-md flex-col ${PANEL} text-[#F5F1E8]`}
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
                      <div className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-3/4 -translate-x-1/2 -translate-y-1/2 border-2 border-[#F2B705]" />
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

      {/* Modal medição */}
      {measureOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setMeasureOpen(false)}>
          <div
            className={`fl-sharp w-full max-w-sm ${PANEL} p-5 text-[#F5F1E8]`}
            style={{ boxShadow: `8px 8px 0 0 ${GOLD}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="border-b-2 border-[#0B0B0D] pb-2 text-lg font-black uppercase">{t("measureModalTitle", "Registrar medição")}</h2>
            <label className="mt-4 block">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">{t("weightLabel", "Peso (kg)")}</span>
              <input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" className={`${INPUT} mt-1`} />
            </label>
            <label className="mt-3 block">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">{t("heightLabel", "Altura (cm)")}</span>
              <input value={height} onChange={(e) => setHeight(e.target.value)} inputMode="decimal" className={`${INPUT} mt-1`} />
            </label>
            <div className="mt-4 flex justify-end gap-2 border-t-2 border-[#0B0B0D] pt-3">
              <button onClick={() => setMeasureOpen(false)} className={`${BTN_DARK} px-4 py-2 text-xs`}>
                {t("cancel", "Cancelar")}
              </button>
              <button onClick={() => void saveMeasurement()} disabled={savingMeasure} className={`${BTN_GOLD} px-4 py-2 text-xs`}>
                {savingMeasure && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t("measureSubmit", "Salvar")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal metas */}
      {goalsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setGoalsOpen(false)}>
          <div
            className={`fl-sharp w-full max-w-sm ${PANEL} p-5 text-[#F5F1E8]`}
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
    </div>
  )
}

/** Grade de dias do mês com presença (giro de catraca) marcada. */
function MonthDots({ date, days, label }: { date: string; days: string[]; label: string }) {
  const year = Number(date.slice(0, 4))
  const month = Number(date.slice(5, 7))
  const total = new Date(year, month, 0).getDate()
  const present = new Set(days.map((d) => String(d).slice(0, 10)))
  return (
    <div className="mt-3">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {Array.from({ length: total }, (_, i) => {
          const dayStr = `${date.slice(0, 7)}-${String(i + 1).padStart(2, "0")}`
          const hit = present.has(dayStr)
          return (
            <span
              key={dayStr}
              title={dayStr}
              className={`flex h-6 w-6 items-center justify-center border-2 text-[10px] font-bold ${hit ? "border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D]" : "border-[#0B0B0D] bg-[#1D1810] text-[#9A938A]"}`}
            >
              {i + 1}
            </span>
          )
        })}
      </div>
    </div>
  )
}
