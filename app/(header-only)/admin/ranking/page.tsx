"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Trophy, RefreshCw, Loader2, Save, Eye, Heart, Star, Clock,
  MapPin, ToggleLeft, ToggleRight, Zap, TrendingUp, Info, Crown, Calendar,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
// ranking_config agora guarda só temporada + agendamento; pesos vivem em xp_settings.
type RankingConfig = {
  id: number
  is_enabled: boolean
  period_days: number
  season_number: number
  season_started_at: string
  season_ends_at: string | null
  last_recalculated_at?: string | null
  next_recalculation_at?: string | null
  recalculation_interval_hours?: number
}

// Página única de pesos: controla XP (cumulativo, vira nível) E ranking
// (soma os mesmos pontos só da temporada corrente).
type XpSettings = {
  id: number
  is_active: boolean
  base_xp_level_1: number
  level_multiplier: number
  profile_activation_xp: number
  affiliate_sale_xp: number
  renewal_xp: number
  like_received_xp: number
  share_received_xp: number
  follow_received_xp: number
  whatsapp_click_xp: number
  approved_post_xp: number
  online_minute_xp: number
  profile_visit_xp: number
  review_received_xp: number
  content_retention_second_xp: number
  max_online_minutes: number
}

type RankingRow = {
  id_profile: string
  display_name: string
  avatar_url: string | null
  municipio: string | null
  estado: string | null
  specialty: string
  machine_name: string | null
  machine_slug: string | null
  total_points: number
  visits_count: number
  likes_count: number
  ratings_count: number
  avg_rating: number
  online_minutes: number
  content_retention_seconds: number
  position_general: number | null
  position_machine: number | null
  position_city: number | null
  xp_total?: number | null
  xp_level?: number | null
  level?: number | null
  xp_progress_percent?: number | null
}

type SeasonSummary = {
  season_number: number
  season_started_at: string | null
  season_ended_at: string | null
  entries: number
  top_points: number | null
}

type Champion = {
  season_number: number
  id_profile: string
  display_name: string | null
  avatar_url: string | null
  username: string | null
  is_clan: boolean
  total_points: number
  position_general: number | null
  position_machine: number | null
  position_city: number | null
  position_profession: number | null
  season_started_at: string | null
  season_ended_at: string | null
}

type Tab = "weights" | "ranking" | "halloffame" | "preview"

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function authHeader(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function xpForLevel(level: number, base: number, mult: number): number {
  if (level <= 0) return 0
  if (mult <= 1) return Math.round(base * level)
  return Math.round((base * (Math.pow(mult, level) - 1)) / (mult - 1))
}

function formatXp(n: number): string {
  return n.toLocaleString("pt-BR")
}

function formatDateTime(value?: string | null): string {
  if (!value) return "Aguardando"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Aguardando"
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDate(value?: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function daysUntil(value?: string | null): number | null {
  if (!value) return null
  const ms = new Date(value).getTime() - Date.now()
  if (Number.isNaN(ms)) return null
  return Math.max(0, Math.ceil(ms / 86_400_000))
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminRankingPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("weights")

  // ── Ranking state ────────────────────────────────────────────────────────
  const [cfg, setCfg] = useState<RankingConfig | null>(null)
  const [cfgDraft, setCfgDraft] = useState<RankingConfig | null>(null)
  const [savingCfg, setSavingCfg] = useState(false)
  const [cfgMsg, setCfgMsg] = useState<string | null>(null)
  const [rows, setRows] = useState<RankingRow[]>([])
  const [loadingRows, setLoadingRows] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  const [recalcMsg, setRecalcMsg] = useState<string | null>(null)
  const [filterMachine, setFilterMachine] = useState("")
  const [filterCity, setFilterCity] = useState("")

  // ── XP state (página única de pesos) ─────────────────────────────────────
  const [xp, setXp] = useState<XpSettings | null>(null)
  const [xpDraft, setXpDraft] = useState<XpSettings | null>(null)
  const [savingXp, setSavingXp] = useState(false)
  const [xpMsg, setXpMsg] = useState<string | null>(null)

  // ── Hall da Fama ─────────────────────────────────────────────────────────
  const [seasons, setSeasons] = useState<SeasonSummary[]>([])
  const [seasonsLoading, setSeasonsLoading] = useState(false)
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)
  const [champions, setChampions] = useState<Champion[]>([])
  const [championsLoading, setChampionsLoading] = useState(false)

  // ── Auth check ──────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) { router.push("/login"); return }
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const ok = data.is_admin || data.roles?.some((r: { desc_role: string }) => r.desc_role === "Administrator")
        if (!ok) { router.push("/"); return }
        setIsAdmin(true)
        setChecking(false)
      })
      .catch(() => router.push("/"))
  }, [router])

  // ── Load data ────────────────────────────────────────────────────────────
  const loadConfig = useCallback(async () => {
    const res = await fetch("/api/admin/ranking-config", { headers: authHeader() })
    if (res.ok) {
      const data: RankingConfig = await res.json()
      setCfg(data); setCfgDraft(data)
    }
  }, [])

  const loadXpSettings = useCallback(async () => {
    const res = await fetch("/api/admin/xp-settings", { headers: authHeader() })
    if (res.ok) {
      const data: XpSettings = await res.json()
      setXp(data); setXpDraft(data)
    }
  }, [])

  const loadRankings = useCallback(async () => {
    setLoadingRows(true)
    const qs = new URLSearchParams({ limit: "50" })
    if (filterMachine) qs.set("machine_slug", filterMachine)
    if (filterCity) qs.set("municipio", filterCity)
    const res = await fetch(`/api/admin/rankings?${qs}`, { headers: authHeader() })
    if (res.ok) setRows(await res.json())
    setLoadingRows(false)
  }, [filterMachine, filterCity])

  const loadSeasons = useCallback(async () => {
    setSeasonsLoading(true)
    try {
      const res = await fetch("/api/ranking/public/seasons", { headers: authHeader() })
      if (res.ok) {
        const data = await res.json()
        const list: SeasonSummary[] = data.seasons || []
        setSeasons(list)
        if (list.length > 0 && selectedSeason == null) setSelectedSeason(list[0].season_number)
      }
    } finally { setSeasonsLoading(false) }
  }, [selectedSeason])

  const loadChampions = useCallback(async (seasonNumber: number) => {
    setChampionsLoading(true)
    try {
      const res = await fetch(`/api/ranking/public/seasons/${seasonNumber}?limit=100`, { headers: authHeader() })
      if (res.ok) {
        const data = await res.json()
        setChampions(data.champions || [])
      }
    } finally { setChampionsLoading(false) }
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    loadConfig()
    loadXpSettings()
    loadRankings()
    loadSeasons()
  }, [isAdmin, loadConfig, loadXpSettings, loadRankings, loadSeasons])

  useEffect(() => {
    if (selectedSeason != null) loadChampions(selectedSeason)
  }, [selectedSeason, loadChampions])

  // ── Save ranking config (só temporada + agendamento) ─────────────────────
  const saveConfig = async () => {
    if (!cfgDraft) return
    setSavingCfg(true); setCfgMsg(null)
    try {
      const res = await fetch("/api/admin/ranking-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          is_enabled: cfgDraft.is_enabled,
          period_days: Number(cfgDraft.period_days),
        }),
      })
      const data = await res.json()
      if (res.ok) { setCfg(data); setCfgDraft(data); setCfgMsg("✓ Temporada atualizada.") }
      else setCfgMsg(data.error || "Erro ao salvar.")
    } finally { setSavingCfg(false) }
  }

  // ── Save XP settings (página única de pesos — XP e Ranking) ──────────────
  const saveXp = async () => {
    if (!xpDraft) return
    setSavingXp(true); setXpMsg(null)
    try {
      const res = await fetch("/api/admin/xp-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          is_active: xpDraft.is_active,
          base_xp_level_1: Number(xpDraft.base_xp_level_1),
          level_multiplier: Number(xpDraft.level_multiplier),
          profile_activation_xp: Number(xpDraft.profile_activation_xp),
          affiliate_sale_xp: Number(xpDraft.affiliate_sale_xp),
          renewal_xp: Number(xpDraft.renewal_xp),
          like_received_xp: Number(xpDraft.like_received_xp),
          share_received_xp: Number(xpDraft.share_received_xp),
          follow_received_xp: Number(xpDraft.follow_received_xp),
          whatsapp_click_xp: Number(xpDraft.whatsapp_click_xp),
          approved_post_xp: Number(xpDraft.approved_post_xp),
          online_minute_xp: Number(xpDraft.online_minute_xp),
          profile_visit_xp: Number(xpDraft.profile_visit_xp),
          review_received_xp: Number(xpDraft.review_received_xp),
          content_retention_second_xp: Number(xpDraft.content_retention_second_xp),
          max_online_minutes: Number(xpDraft.max_online_minutes),
        }),
      })
      const data = await res.json()
      if (res.ok) { setXp(data); setXpDraft(data); setXpMsg("✓ Pesos salvos. XP e ranking agora usam estes valores.") }
      else setXpMsg(data.error || "Erro ao salvar.")
    } finally { setSavingXp(false) }
  }

  // ── Recalculate ranking ──────────────────────────────────────────────────
  const recalculate = async () => {
    setRecalculating(true); setRecalcMsg(null)
    try {
      const res = await fetch("/api/admin/ranking/recalculate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
      })
      const data = await res.json()
      if (res.ok) {
        const rolled = data.seasons_rolled ? ` (${data.seasons_rolled} temporada${data.seasons_rolled > 1 ? "s" : ""} encerrada${data.seasons_rolled > 1 ? "s" : ""})` : ""
        setRecalcMsg(`✓ ${data.entities_processed ?? data.updated ?? 0} perfis atualizados${rolled}.`)
        await loadConfig()
        await loadRankings()
        await loadSeasons()
      }
      else setRecalcMsg(data.error || "Erro ao recalcular.")
    } finally { setRecalculating(false) }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  if (!isAdmin) return null

  const SEASON_PRESETS = [
    { label: "30 dias", value: 30 },
    { label: "60 dias", value: 60 },
    { label: "90 dias", value: 90 },
    { label: "180 dias", value: 180 },
    { label: "1 ano", value: 365 },
  ]

  const base = Number(xpDraft?.base_xp_level_1 ?? 5000)
  const mult = Number(xpDraft?.level_multiplier ?? 1.4)
  const PREVIEW_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30]
  const daysLeft = daysUntil(cfg?.season_ends_at)

  const TABS: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "weights", label: "Pesos", icon: Zap },
    { id: "ranking", label: "Ranking", icon: Trophy },
    { id: "halloffame", label: "Hall da Fama", icon: Crown },
    { id: "preview", label: "Preview da Curva", icon: TrendingUp },
  ]

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-5xl">

        {/* Back */}
        <button
          onClick={() => router.push("/admin")}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </button>

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Trophy className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Ranking e XP</h1>
            <p className="text-sm text-muted-foreground">Uma única pontuação alimenta XP e ranking. O ranking zera por temporada; o XP é permanente.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-0 border-b border-border overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px inline-flex items-center gap-1.5 whitespace-nowrap",
                activeTab === id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════ TAB: PESOS (única) ═════════════════════ */}
        {activeTab === "weights" && (
          <div className="space-y-6">

            {/* Info banner */}
            <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <div className="space-y-1">
                <p><strong className="text-foreground">Esta é a única página de pesos.</strong> Os mesmos valores alimentam o XP (cumulativo — vira nível) e o ranking (soma só a temporada atual).</p>
                <p>Alterar pesos afeta <em>novos</em> eventos. Eventos antigos preservam o XP registrado no momento em que aconteceram.</p>
                <p>Mensagens <strong className="text-foreground">não geram XP</strong>. Likes não têm limite diário — mesma curtida do mesmo usuário não duplica XP.</p>
              </div>
            </div>

            {xpDraft && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" /> Pesos da Pontuação
                      </CardTitle>
                      <CardDescription>
                        Aplica-se aos subperfis profissionais. Os mesmos pontos contam para XP/nível e para a posição no ranking.
                      </CardDescription>
                    </div>
                    <button
                      onClick={() => setXpDraft((d) => d ? { ...d, is_active: !d.is_active } : d)}
                      className="flex items-center gap-2 text-sm font-medium"
                    >
                      {xpDraft.is_active
                        ? <><ToggleRight className="h-6 w-6 text-primary" /> Ativo</>
                        : <><ToggleLeft className="h-6 w-6 text-muted-foreground" /> Inativo</>}
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8">

                  {/* Curva de nível */}
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Curva de nível
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">XP base para Nível 1</Label>
                        <Input
                          type="number" min={100} step={100}
                          value={xpDraft.base_xp_level_1}
                          onChange={(e) => setXpDraft((d) => d ? { ...d, base_xp_level_1: parseFloat(e.target.value) || 5000 } : d)}
                        />
                        <p className="text-[11px] text-muted-foreground">XP mínimo para sair do nível 0</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Multiplicador da curva</Label>
                        <Input
                          type="number" min={1.1} max={3} step={0.05}
                          value={xpDraft.level_multiplier}
                          onChange={(e) => setXpDraft((d) => d ? { ...d, level_multiplier: parseFloat(e.target.value) || 1.4 } : d)}
                        />
                        <p className="text-[11px] text-muted-foreground">{"Cada nível exige mult × XP a mais (> 1)"}</p>
                      </div>
                    </div>
                    <div className="mt-3 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground font-mono">
                      XP(nível N) = {xpDraft.base_xp_level_1.toLocaleString("pt-BR")} × ({xpDraft.level_multiplier}ᴺ − 1) / ({xpDraft.level_multiplier} − 1)
                    </div>
                  </section>

                  {/* Pesos por ação */}
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Pontos por ação
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {[
                        { key: "profile_activation_xp" as const, label: "Perfil ativado (pago)" },
                        { key: "renewal_xp" as const, label: "Renovação legacy" },
                        { key: "affiliate_sale_xp" as const, label: "Venda afiliada confirmada" },
                        { key: "review_received_xp" as const, label: "Avaliação recebida" },
                        { key: "whatsapp_click_xp" as const, label: "Clique no WhatsApp" },
                        { key: "share_received_xp" as const, label: "Compartilhamento" },
                        { key: "follow_received_xp" as const, label: "Acompanhamento recebido" },
                        { key: "like_received_xp" as const, label: "Like recebido" },
                        { key: "approved_post_xp" as const, label: "Post publicado/aprovado" },
                        { key: "profile_visit_xp" as const, label: "Visita ao perfil" },
                        { key: "online_minute_xp" as const, label: "Por minuto online" },
                        { key: "content_retention_second_xp" as const, label: "Retenção de conteúdo/seg" },
                      ].map(({ key, label }) => (
                        <div key={key} className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">{label}</Label>
                          <Input
                            type="number" min={0} step={key === "online_minute_xp" || key === "content_retention_second_xp" ? 0.05 : 1}
                            value={xpDraft[key]}
                            onChange={(e) => setXpDraft((d) => d ? { ...d, [key]: parseFloat(e.target.value) || 0 } : d)}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Mensagens não geram XP e não aparecem aqui por definição.
                    </p>
                  </section>

                  {/* Teto de tempo online (anti-farm) */}
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Limite de tempo online
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3 w-3" /> Máx. minutos online/dia
                        </Label>
                        <Input
                          type="number" min={0} step={1}
                          value={xpDraft.max_online_minutes}
                          onChange={(e) => setXpDraft((d) => d ? { ...d, max_online_minutes: Math.max(0, parseInt(e.target.value, 10) || 0) } : d)}
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Teto diário de minutos que geram XP (anti-farm de aba aberta).
                          A {Math.round((Number(xpDraft.online_minute_xp) || 0) * Number(xpDraft.max_online_minutes || 0)).toLocaleString("pt-BR")} XP/dia no máximo só de ficar logado.
                        </p>
                      </div>
                    </div>
                  </section>

                  {xpMsg && (
                    <p className={`text-sm ${xpMsg.startsWith("✓") ? "text-green-600" : "text-destructive"}`}>
                      {xpMsg}
                    </p>
                  )}
                  <Button onClick={saveXp} disabled={savingXp} className="w-full sm:w-auto">
                    {savingXp ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar pesos
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ═══════════════════════════ TAB: RANKING (temporada) ═══════════════ */}
        {activeTab === "ranking" && (
          <div className="space-y-6">

            {/* Info banner */}
            <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <span>
                O ranking soma a <strong className="text-foreground">mesma pontuação</strong> dos pesos (aba <em>Pesos</em>), só que conta apenas a <strong className="text-foreground">temporada corrente</strong> e zera no fim de cada uma. Os campeões vão para o <em>Hall da Fama</em>.
              </span>
            </div>

            {/* Season Card */}
            {cfgDraft && cfg && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" /> Temporada {cfg.season_number}
                      </CardTitle>
                      <CardDescription>Duração da temporada e status do recálculo automático.</CardDescription>
                    </div>
                    <button
                      onClick={() => setCfgDraft((d) => d ? { ...d, is_enabled: !d.is_enabled } : d)}
                      className="flex items-center gap-2 text-sm font-medium"
                    >
                      {cfgDraft.is_enabled
                        ? <><ToggleRight className="h-6 w-6 text-primary" /> Ativo</>
                        : <><ToggleLeft className="h-6 w-6 text-muted-foreground" /> Inativo</>}
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">

                  {/* Cards de status */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Temporada</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-primary">#{cfg.season_number}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Início</p>
                      <p className="mt-1 text-sm font-semibold">{formatDate(cfg.season_started_at)}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Zera em</p>
                      <p className="mt-1 text-sm font-semibold">{formatDate(cfg.season_ends_at)}</p>
                      {daysLeft != null && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {daysLeft === 0 ? "hoje" : daysLeft === 1 ? "amanhã" : `em ${daysLeft} dias`}
                        </p>
                      )}
                    </div>
                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Último recálculo</p>
                      <p className="mt-1 text-sm font-semibold">{formatDateTime(cfg.last_recalculated_at)}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">a cada 2h</p>
                    </div>
                  </div>

                  {/* Duração da temporada */}
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-3 block">
                      Duração da temporada (dias)
                    </Label>
                    <div className="flex gap-2 flex-wrap items-center">
                      <Input
                        type="number" min={1} step={1}
                        value={cfgDraft.period_days}
                        onChange={(e) => setCfgDraft((d) => d ? { ...d, period_days: Math.max(1, parseInt(e.target.value, 10) || 1) } : d)}
                        className="max-w-[140px]"
                      />
                      <span className="text-xs text-muted-foreground">dias</span>
                      <div className="flex gap-1.5 ml-2 flex-wrap">
                        {SEASON_PRESETS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setCfgDraft((d) => d ? { ...d, period_days: opt.value } : d)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                              cfgDraft.period_days === opt.value
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:border-primary/50"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      O ranking zera {cfgDraft.period_days} dias após o início da temporada. Alterar o valor não retroage — a próxima temporada já abre com a nova duração.
                    </p>
                  </div>

                  {cfgMsg && (
                    <p className={`text-sm ${cfgMsg.startsWith("✓") ? "text-green-600" : "text-destructive"}`}>
                      {cfgMsg}
                    </p>
                  )}
                  <Button onClick={saveConfig} disabled={savingCfg} className="w-full sm:w-auto">
                    {savingCfg ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Rankings Table (temporada atual) */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">Placar da Temporada {cfg?.season_number ?? ""}</CardTitle>
                    <CardDescription>Pontuação acumulada nesta temporada. Filtre por enxame ou cidade.</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={loadRankings} disabled={loadingRows}>
                      <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loadingRows ? "animate-spin" : ""}`} />
                      Atualizar
                    </Button>
                    <Button size="sm" onClick={recalculate} disabled={recalculating}>
                      {recalculating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                      Recalcular
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Input placeholder="Filtrar por enxame (slug)" value={filterMachine}
                    onChange={(e) => setFilterMachine(e.target.value)}
                    className="h-8 text-sm max-w-[200px]" />
                  <Input placeholder="Filtrar por cidade" value={filterCity}
                    onChange={(e) => setFilterCity(e.target.value)}
                    className="h-8 text-sm max-w-[200px]" />
                  <Button variant="outline" size="sm" onClick={loadRankings}>Filtrar</Button>
                </div>
                {recalcMsg && (
                  <p className={`text-sm ${recalcMsg.startsWith("✓") ? "text-green-600" : "text-destructive"}`}>
                    {recalcMsg}
                  </p>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {loadingRows ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : rows.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-12">
                    Nenhum dado de ranking. Clique em &quot;Recalcular&quot; para gerar.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-y border-border bg-muted/30">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">#</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Perfil</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">Enxame</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground hidden sm:table-cell">Nível/XP</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Pts</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground hidden md:table-cell">
                            <Eye className="h-3 w-3 inline" />
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground hidden md:table-cell">
                            <Heart className="h-3 w-3 inline" />
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground hidden lg:table-cell">
                            <Star className="h-3 w-3 inline" />
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground hidden lg:table-cell">
                            <Clock className="h-3 w-3 inline" />
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Geral</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground hidden sm:table-cell">Enx.</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground hidden md:table-cell">Cidade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {rows.map((row) => (
                          <tr key={row.id_profile} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                              {row.position_general ?? "—"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-full bg-muted overflow-hidden shrink-0">
                                  {row.avatar_url
                                    ? <Image src={row.avatar_url} alt="" width={32} height={32} unoptimized className="h-full w-full object-cover" />
                                    : <div className="h-full w-full flex items-center justify-center text-xs font-bold text-muted-foreground">{row.display_name.charAt(0)}</div>}
                                </div>
                                <div>
                                  <p className="font-medium leading-tight">{row.display_name}</p>
                                  <p className="text-xs text-muted-foreground">{row.specialty}</p>
                                  <p className="mt-0.5 text-[10px] font-semibold text-primary sm:hidden">
                                    Lv. {row.level ?? row.xp_level ?? 0} - {formatXp(Number(row.xp_total ?? 0))} XP
                                  </p>
                                  {(row.municipio || row.estado) && (
                                    <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                                      <MapPin className="h-2.5 w-2.5" />
                                      {[row.municipio, row.estado].filter(Boolean).join(", ")}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              {row.machine_name && (
                                <Badge variant="outline" className="text-xs">
                                  {row.machine_name.replace("Enxame de ", "")}
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right hidden sm:table-cell">
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-xs font-semibold text-primary">Lv. {row.level ?? row.xp_level ?? 0}</span>
                                <span className="text-[11px] text-muted-foreground">{formatXp(Number(row.xp_total ?? 0))} XP</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums">
                              {Number(row.total_points).toFixed(0)}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground tabular-nums hidden md:table-cell">{row.visits_count}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground tabular-nums hidden md:table-cell">{row.likes_count}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground tabular-nums hidden lg:table-cell">
                              {row.avg_rating > 0 ? `${Number(row.avg_rating).toFixed(1)} (${row.ratings_count})` : "—"}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground tabular-nums hidden lg:table-cell">
                              {Math.round((row.content_retention_seconds ?? 0) / 60)} min
                            </td>
                            <td className="px-4 py-3 text-center">
                              {row.position_general
                                ? <span className="font-semibold text-primary">#{row.position_general}</span>
                                : <span className="text-muted-foreground text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3 text-center hidden sm:table-cell">
                              {row.position_machine
                                ? <span className="text-xs font-medium">#{row.position_machine}</span>
                                : <span className="text-muted-foreground text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3 text-center hidden md:table-cell">
                              {row.position_city
                                ? <span className="text-xs font-medium">#{row.position_city}</span>
                                : <span className="text-muted-foreground text-xs">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══════════════════════════ TAB: HALL DA FAMA ══════════════════════ */}
        {activeTab === "halloffame" && (
          <div className="space-y-6">
            <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <span>Placar final de cada temporada encerrada. As temporadas viram automaticamente no recálculo de 2h quando passam de {cfg?.period_days ?? 90} dias.</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[260px,1fr] gap-4">
              {/* Lista de temporadas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Temporadas encerradas</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {seasonsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : seasons.length === 0 ? (
                    <p className="px-4 py-6 text-xs text-muted-foreground text-center">
                      Nenhuma temporada encerrada ainda. A primeira virada vai acontecer no fim da temporada atual.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {seasons.map((s) => (
                        <li key={s.season_number}>
                          <button
                            onClick={() => setSelectedSeason(s.season_number)}
                            className={cn(
                              "w-full text-left px-4 py-3 transition-colors hover:bg-muted/30",
                              selectedSeason === s.season_number && "bg-primary/10"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-sm">Temporada #{s.season_number}</span>
                              <Badge variant="outline" className="text-[10px]">{s.entries} perfis</Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {formatDate(s.season_started_at)} → {formatDate(s.season_ended_at)}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Campeões da temporada selecionada */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Crown className="h-4 w-4 text-primary" />
                    {selectedSeason ? `Campeões — Temporada #${selectedSeason}` : "Selecione uma temporada"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {championsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : !selectedSeason ? (
                    <p className="px-4 py-12 text-sm text-muted-foreground text-center">
                      Escolha uma temporada na coluna ao lado para ver os campeões.
                    </p>
                  ) : champions.length === 0 ? (
                    <p className="px-4 py-12 text-sm text-muted-foreground text-center">
                      Sem registros nesta temporada.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-y border-border bg-muted/30">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">#</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Perfil</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Pontos</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {champions.map((c) => (
                            <tr key={`${c.season_number}-${c.id_profile}`} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                {c.position_general ?? "—"}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-8 w-8 rounded-full bg-muted overflow-hidden shrink-0">
                                    {c.avatar_url
                                      ? <Image src={c.avatar_url} alt="" width={32} height={32} unoptimized className="h-full w-full object-cover" />
                                      : <div className="h-full w-full flex items-center justify-center text-xs font-bold text-muted-foreground">{(c.display_name ?? "?").charAt(0)}</div>}
                                  </div>
                                  <div>
                                    <p className="font-medium leading-tight">{c.display_name ?? "—"}</p>
                                    {c.username && <p className="text-[11px] text-muted-foreground">@{c.username}</p>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right font-semibold tabular-nums">
                                {Number(c.total_points).toFixed(0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ═══════════════════════════ TAB: PREVIEW DA CURVA ══════════════════ */}
        {activeTab === "preview" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Preview da Curva de Níveis
                </CardTitle>
                <CardDescription>
                  XP acumulado necessário para atingir cada nível, com base em{" "}
                  <strong>XP base = {formatXp(base)}</strong> e{" "}
                  <strong>multiplicador = {mult}</strong>.
                  Altere na aba Pesos para ver aqui em tempo real.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Nível</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">XP acumulado</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground hidden sm:table-cell">XP deste nível</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-5 w-5 rounded-full bg-muted/50 flex items-center justify-center text-[10px] font-bold text-muted-foreground">0</span>
                            <span className="text-muted-foreground text-xs">Sem nível</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground text-xs">{"< "}{formatXp(base)} XP</td>
                        <td className="px-4 py-3 text-right text-muted-foreground text-xs hidden sm:table-cell">—</td>
                      </tr>
                      {PREVIEW_LEVELS.map((lvl) => {
                        const required = xpForLevel(lvl, base, mult)
                        const prev = xpForLevel(lvl - 1, base, mult)
                        const delta = required - prev
                        const isMilestone = lvl >= 15
                        return (
                          <tr key={lvl} className={cn("hover:bg-muted/20 transition-colors", isMilestone && "bg-primary/[0.03]")}>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1.5">
                                <span className={cn(
                                  "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                                  lvl <= 5 ? "bg-primary/10 text-primary" :
                                  lvl <= 10 ? "bg-orange-400/10 text-orange-400" :
                                  "bg-purple-400/10 text-purple-400"
                                )}>
                                  {lvl}
                                </span>
                                <span className="font-medium">Nível {lvl}</span>
                                {isMilestone && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">marco</span>
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums">
                              {formatXp(required)} XP
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground tabular-nums text-xs hidden sm:table-cell">
                              +{formatXp(delta)} XP
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { title: "Alcançar Nível 10", xp: xpForLevel(10, base, mult), desc: "jogador ativo" },
                    { title: "Alcançar Nível 20", xp: xpForLevel(20, base, mult), desc: "veterano" },
                    { title: "Alcançar Nível 30", xp: xpForLevel(30, base, mult), desc: "lenda" },
                  ].map(({ title, xp: needed, desc }) => (
                    <div key={title} className="rounded-xl border border-border bg-muted/20 p-4 text-center">
                      <p className="text-xs text-muted-foreground">{title}</p>
                      <p className="text-xl font-semibold tabular-nums mt-1">{formatXp(needed)}</p>
                      <p className="text-[11px] text-primary mt-0.5">{desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </main>
    </div>
  )
}
