"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Trophy, RefreshCw, Loader2, Save, Eye, Heart, Star, Clock,
  Globe, MapPin, Briefcase, ToggleLeft, ToggleRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
type RankingConfig = {
  id: number
  is_enabled: boolean
  period_days: number
  weight_visits: number
  weight_likes: number
  weight_ratings: number
  weight_online: number
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
  position_general: number | null
  position_machine: number | null
  position_city: number | null
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
function authHeader(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ──────────────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────────────
export default function AdminRankingPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  // Config state
  const [cfg, setCfg] = useState<RankingConfig | null>(null)
  const [cfgDraft, setCfgDraft] = useState<RankingConfig | null>(null)
  const [savingCfg, setSavingCfg] = useState(false)
  const [cfgMsg, setCfgMsg] = useState<string | null>(null)

  // Rankings state
  const [rows, setRows] = useState<RankingRow[]>([])
  const [loadingRows, setLoadingRows] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  const [recalcMsg, setRecalcMsg] = useState<string | null>(null)

  // Filters
  const [filterMachine, setFilterMachine] = useState("")
  const [filterCity, setFilterCity] = useState("")

  // ── Auth check ──────────────────────────────────────────────────────────────
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

  // ── Load config ─────────────────────────────────────────────────────────────
  const loadConfig = useCallback(async () => {
    const res = await fetch("/api/admin/ranking-config", { headers: authHeader() })
    if (res.ok) {
      const data: RankingConfig = await res.json()
      setCfg(data)
      setCfgDraft(data)
    }
  }, [])

  // ── Load rankings ────────────────────────────────────────────────────────────
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
    loadRankings()
  }, [isAdmin, loadConfig, loadRankings])

  // ── Save config ─────────────────────────────────────────────────────────────
  const saveConfig = async () => {
    if (!cfgDraft) return
    setSavingCfg(true)
    setCfgMsg(null)
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
      if (res.ok) {
        setCfg(data)
        setCfgDraft(data)
        setCfgMsg("✓ Configuração salva.")
      } else {
        setCfgMsg(data.error || "Erro ao salvar.")
      }
    } finally {
      setSavingCfg(false)
    }
  }

  // ── Recalculate ──────────────────────────────────────────────────────────────
  const recalculate = async () => {
    setRecalculating(true)
    setRecalcMsg(null)
    try {
      const res = await fetch("/api/admin/ranking/recalculate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
      })
      const data = await res.json()
      if (res.ok) {
        setRecalcMsg(`✓ ${data.updated} perfis atualizados.`)
        await loadRankings()
      } else {
        setRecalcMsg(data.error || "Erro ao recalcular.")
      }
    } finally {
      setRecalculating(false)
    }
  }

  // ── UI guards ────────────────────────────────────────────────────────────────
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
    { label: "1 ano", value: 365 },
  ]

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <button
          onClick={() => router.push("/admin")}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </button>

        <div className="mb-6 flex items-center gap-3">
          <Trophy className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Ranking</h1>
            <p className="text-sm text-muted-foreground">Configurar pesos, período e visualizar posições.</p>
          </div>
        </div>

        {/* ── Config Card ─────────────────────────────────────────────────────── */}
        {cfgDraft && (
          <Card className="mb-6">
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
                  {cfgDraft.is_enabled ? (
                    <><ToggleRight className="h-6 w-6 text-primary" /> Ativo</>
                  ) : (
                    <><ToggleLeft className="h-6 w-6 text-muted-foreground" /> Inativo</>
                  )}
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Período */}
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-3 block">
                  Período de contagem
                </Label>
                <div className="flex gap-2 flex-wrap">
                  {PERIOD_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setCfgDraft((d) => d ? { ...d, period_days: opt.value } : d)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
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
                      <Icon className="h-3 w-3" />
                      {label}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={key.startsWith("weight") ? 0.1 : 1}
                      value={cfgDraft[key]}
                      onChange={(e) =>
                        setCfgDraft((d) => d ? { ...d, [key]: parseFloat(e.target.value) || 0 } : d)
                      }
                    />
                  </div>
                ))}
              </div>

              {/* Fórmula preview */}
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

        {/* ── Rankings Table Card ──────────────────────────────────────────────── */}
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
                  {recalculating
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                  Recalcular
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Input
                placeholder="Filtrar por máquina (slug)"
                value={filterMachine}
                onChange={(e) => setFilterMachine(e.target.value)}
                className="h-8 text-sm max-w-[200px]"
              />
              <Input
                placeholder="Filtrar por cidade"
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                className="h-8 text-sm max-w-[200px]"
              />
              <Button variant="outline" size="sm" onClick={loadRankings}>
                Filtrar
              </Button>
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
                              {row.avatar_url ? (
                                <img src={row.avatar_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                                  {row.display_name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium leading-tight">{row.display_name}</p>
                              <p className="text-xs text-muted-foreground">{row.specialty}</p>
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
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">
                          {Number(row.total_points).toFixed(0)}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground tabular-nums hidden md:table-cell">
                          {row.visits_count}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground tabular-nums hidden md:table-cell">
                          {row.likes_count}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground tabular-nums hidden lg:table-cell">
                          {row.avg_rating > 0 ? `${Number(row.avg_rating).toFixed(1)} (${row.ratings_count})` : "—"}
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
      </main>
    </div>
  )
}
