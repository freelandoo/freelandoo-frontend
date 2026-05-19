"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Trophy, RefreshCw, Loader2, Save, Eye, Heart, Star, Clock,
  MapPin, ToggleLeft, ToggleRight, Zap, TrendingUp, Info,
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
type RankingConfig = {
  id: number
  is_enabled: boolean
  period_days: number
  weight_visits: number
  weight_likes: number
  weight_ratings: number
  weight_online: number
  max_online_minutes: number
  last_recalculated_at?: string | null
  next_recalculation_at?: string | null
  recalculation_interval_hours?: number
}

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

type Tab = "ranking" | "xp" | "preview"

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

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminRankingPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("ranking")

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

  // ── XP state ─────────────────────────────────────────────────────────────
  const [xp, setXp] = useState<XpSettings | null>(null)
  const [xpDraft, setXpDraft] = useState<XpSettings | null>(null)
  const [savingXp, setSavingXp] = useState(false)
  const [xpMsg, setXpMsg] = useState<string | null>(null)

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

  useEffect(() => {
    if (!isAdmin) return
    loadConfig()
    loadXpSettings()
    loadRankings()
  }, [isAdmin, loadConfig, loadXpSettings, loadRankings])

  // ── Save ranking config ─────────────────────────────────────────────────
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
          weight_visits: Number(cfgDraft.weight_visits),
          weight_likes: Number(cfgDraft.weight_likes),
          weight_ratings: Number(cfgDraft.weight_ratings),
          weight_online: Number(cfgDraft.weight_online),
          max_online_minutes: Number(cfgDraft.max_online_minutes),
        }),
      })
      const data = await res.json()
      if (res.ok) { setCfg(data); setCfgDraft(data); setCfgMsg("✓ Configuração de ranking salva.") }
      else setCfgMsg(data.error || "Erro ao salvar.")
    } finally { setSavingCfg(false) }
  }

  // ── Save XP settings ─────────────────────────────────────────────────────
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
        }),
      })
      const data = await res.json()
      if (res.ok) { setXp(data); setXpDraft(data); setXpMsg("✓ Configuração de XP salva.") }
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
        setRecalcMsg(`✓ ${data.entities_processed ?? data.updated ?? 0} perfis atualizados.`)
        await loadConfig()
        await loadRankings()
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

  const PERIOD_OPTIONS = [
    { label: "7 dias", value: 7 },
    { label: "30 dias", value: 30 },
    { label: "90 dias", value: 90 },
    { label: "1 ano", value: 365 },
  ]

  const base = Number(xpDraft?.base_xp_level_1 ?? 5000)
  const mult = Number(xpDraft?.level_multiplier ?? 1.4)
  const PREVIEW_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30]

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
            <p className="text-sm text-muted-foreground">Pesos, curva de nível e posições dos subperfis.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-0 border-b border-border">
          {(["ranking", "xp", "preview"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === "ranking" ? "Ranking" : tab === "xp" ? "XP e Níveis" : "Preview da Curva"}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════ TAB: RANKING ═══════════════════════════ */}
        {activeTab === "ranking" && (
          <div className="space-y-6">

            {/* Info banner */}
            <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <span>
                Esses pesos afetam a <strong className="text-foreground">posição no ranking</strong>. O ranking pode ser filtrado por período e reseta a cada ciclo. XP e nível são permanentes — configure na aba <em>XP e Níveis</em>.
              </span>
            </div>

            {/* Config Card */}
            {cfgDraft && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Configurações do Ranking</CardTitle>
                      <CardDescription>Pesos das métricas e período de contagem.</CardDescription>
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
                  {/* Período */}
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-3 block">
                      Período de contagem (dias)
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
                        {PERIOD_OPTIONS.map((opt) => (
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
                      A janela de pontuação considera {cfgDraft.period_days} dias. O recálculo automático roda a cada 2 horas.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Último recálculo</p>
                      <p className="mt-1 text-sm font-semibold">{formatDateTime(cfg?.last_recalculated_at)}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Próximo previsto</p>
                      <p className="mt-1 text-sm font-semibold">{formatDateTime(cfg?.next_recalculation_at)}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Intervalo</p>
                      <p className="mt-1 text-sm font-semibold">2 horas</p>
                    </div>
                  </div>

                  {/* Pesos */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                      { key: "weight_visits" as const, label: "Peso — Visitas", icon: Eye },
                      { key: "weight_likes" as const, label: "Peso — Likes", icon: Heart },
                      { key: "weight_ratings" as const, label: "Peso — Avaliações", icon: Star },
                      { key: "weight_online" as const, label: "Peso — Tempo online", icon: Clock },
                      { key: "max_online_minutes" as const, label: "Máx. min. online/dia", icon: Clock },
                    ].map(({ key, label, icon: Icon }) => (
                      <div key={key} className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                          <Icon className="h-3 w-3" />{label}
                        </Label>
                        <Input
                          type="number" min={0}
                          step={key.startsWith("weight") ? 0.1 : 1}
                          value={cfgDraft[key]}
                          onChange={(e) => setCfgDraft((d) => d ? { ...d, [key]: parseFloat(e.target.value) || 0 } : d)}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Fórmula */}
                  <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground font-mono">
                    pontos = (visitas × {cfgDraft.weight_visits}) + (likes × {cfgDraft.weight_likes}) + (média × nº_avaliações × {cfgDraft.weight_ratings}) + (min(online, {cfgDraft.max_online_minutes}) × {cfgDraft.weight_online})
                  </div>

                  {cfgMsg && (
                    <p className={`text-sm ${cfgMsg.startsWith("✓") ? "text-green-600" : "text-destructive"}`}>
                      {cfgMsg}
                    </p>
                  )}
                  <Button onClick={saveConfig} disabled={savingCfg} className="w-full sm:w-auto">
                    {savingCfg ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar configuração
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Rankings Table */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">Rankings por Perfil</CardTitle>
                    <CardDescription>Filtrar por máquina ou cidade.</CardDescription>
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
                  <Input placeholder="Filtrar por máquina (slug)" value={filterMachine}
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
                          <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">Máquina</th>
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
                          <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground hidden sm:table-cell">Máq.</th>
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
                                  {row.machine_name.replace("Máquina de ", "")}
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

        {/* ═══════════════════════════ TAB: XP E NÍVEIS ═══════════════════════ */}
        {activeTab === "xp" && (
          <div className="space-y-6">

            {/* Info banner */}
            <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <div className="space-y-1">
                <p><strong className="text-foreground">Ranking mede posição competitiva por período. XP e nível são permanentes</strong> e pertencem ao subperfil — não resetam.</p>
                <p>Alterar pesos afeta <em>novos</em> eventos de XP. Eventos antigos preservam o XP registrado no momento em que aconteceram.</p>
                <p>Mensagens <strong className="text-foreground">não geram XP</strong>. Likes não têm limite diário — mesma curtida do mesmo usuário não duplica XP.</p>
              </div>
            </div>

            {xpDraft && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" /> Configurações de XP e Níveis
                      </CardTitle>
                      <CardDescription>
                        Pesos por ação e parâmetros da curva de nível. Aplica-se somente a subperfis profissionais.
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

                  {/* Pesos de XP */}
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      XP por ação
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
                        { key: "content_retention_second_xp" as const, label: "Retencao de conteudo/seg" },
                      ].map(({ key, label }) => (
                        <div key={key} className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">{label}</Label>
                          <Input
                            type="number" min={0} step={key === "online_minute_xp" || key === "content_retention_second_xp" ? 0.05 : 1}
                            value={xpDraft[key]}
                            onChange={(e) => setXpDraft((d) => d ? { ...d, [key]: parseFloat(e.target.value) ?? 0 } : d)}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Mensagens não geram XP e não aparecem aqui por definição.
                    </p>
                  </section>

                  {xpMsg && (
                    <p className={`text-sm ${xpMsg.startsWith("✓") ? "text-green-600" : "text-destructive"}`}>
                      {xpMsg}
                    </p>
                  )}
                  <Button onClick={saveXp} disabled={savingXp} className="w-full sm:w-auto">
                    {savingXp ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar configuração de XP
                  </Button>
                </CardContent>
              </Card>
            )}
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
                  Altere na aba XP e Níveis para ver aqui em tempo real.
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
