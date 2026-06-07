"use client"

/**
 * Governança de Enxames (admin) — estilo tabloide (canvas escuro/dourado).
 * - Profissões de cada enxame ficam num campo <select> + botão "+ Profissão".
 * - O quadrado de cor de cada enxame abre réguas RGB (estilo filtro de batom)
 *   para mudar a cor (gradiente início/fim) e salvar na hora.
 */
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Plus, Power, PowerOff, Sparkles, Pencil, Check, X, Trash2,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  PageShell, Section, TabloidBackLink, LoadingState, ErrorState,
  TABLOID_ACTION_CLASSES, TABLOID_OUTLINE_ACTION_CLASSES,
} from "@/components/tabloide"

type Category = {
  id_category: number
  desc_category: string
  is_active: boolean
}

// Enxame — a tabela física do backend ainda é tb_machine/id_machine (legado).
type Machine = {
  id_machine: number
  slug: string
  name: string
  display_order: number
  color_from: string | null
  color_to: string | null
  color_glow: string | null
  color_ring: string | null
  color_accent: string | null
  color_text: string | null
  description: string | null
  icon_name: string | null
  is_active: boolean
  categories: Category[]
}

const EMPTY_NEW_MACHINE = {
  slug: "",
  name: "",
  description: "",
  icon_name: "Sparkles",
  color_from: "#6d28d9",
  color_to: "#2563eb",
  color_accent: "#a78bfa",
  color_glow: "rgba(139,92,246,0.45)",
  color_ring: "rgba(139,92,246,0.7)",
  color_text: "#ddd6fe",
}

function autoSlug(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)
}

/* ── Cor: parse/serialize hex + rgba ───────────────────────────────────────── */
type Rgba = { r: number; g: number; b: number; a: number }

function parseColor(input: string | null | undefined): Rgba {
  const s = (input || "").trim()
  const hex = s.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    let h = hex[1]
    if (h.length === 3) h = h.split("").map((c) => c + c).join("")
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: 1,
    }
  }
  const rgba = s.match(/rgba?\(([^)]+)\)/i)
  if (rgba) {
    const p = rgba[1].split(",").map((x) => x.trim())
    return { r: +p[0] || 0, g: +p[1] || 0, b: +p[2] || 0, a: p[3] != null ? +p[3] : 1 }
  }
  return { r: 128, g: 128, b: 128, a: 1 }
}

function clamp255(n: number) { return Math.max(0, Math.min(255, Math.round(n))) }

function toColorString(c: Rgba): string {
  const r = clamp255(c.r), g = clamp255(c.g), b = clamp255(c.b)
  if (c.a >= 1) return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")
  return `rgba(${r}, ${g}, ${b}, ${Number(c.a.toFixed(2))})`
}

/* ── Réguas RGB (estilo filtro de batom) ───────────────────────────────────── */
function ChannelSlider({
  channel, value, rgb, onChange,
}: { channel: "r" | "g" | "b"; value: number; rgb: Rgba; onChange: (v: number) => void }) {
  const lo = toColorString({ ...rgb, [channel]: 0, a: 1 })
  const hi = toColorString({ ...rgb, [channel]: 255, a: 1 })
  const letter = channel.toUpperCase()
  return (
    <label className="flex items-center gap-3 text-[11px] font-bold text-[#C9C2B6]">
      <span className="w-3 shrink-0 text-[#F2B705]">{letter}</span>
      <input
        type="range"
        min={0}
        max={255}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 flex-1 cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-transparent"
        style={{ background: `linear-gradient(to right, ${lo}, ${hi})` }}
      />
      <span className="w-8 shrink-0 text-right tabular-nums text-[#9A938A]">{value}</span>
    </label>
  )
}

/** As 3 réguas R/G/B (presentacional). Preserva alpha do valor original. */
function RgbSliders({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const c = parseColor(value)
  const set = (patch: Partial<Rgba>) => onChange(toColorString({ ...c, ...patch }))
  return (
    <div className="space-y-2.5">
      <ChannelSlider channel="r" value={c.r} rgb={c} onChange={(v) => set({ r: v })} />
      <ChannelSlider channel="g" value={c.g} rgb={c} onChange={(v) => set({ g: v })} />
      <ChannelSlider channel="b" value={c.b} rgb={c} onChange={(v) => set({ b: v })} />
    </div>
  )
}

/** Swatch clicável que abre as réguas RGB num popover (para os modais). */
function RgbField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A938A]">{label}</p>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-md border-2 border-[#F5F1E8]/15 bg-[#1D1810] p-1.5 text-left transition hover:border-[#F2B705]/50"
      >
        <span className="h-7 w-7 shrink-0 rounded border border-white/30" style={{ background: value }} />
        <span className="truncate font-mono text-[11px] text-[#C9C2B6]">{value || "—"}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-lg border-2 border-[#F5F1E8]/15 bg-[#15100A] p-3 shadow-[6px_6px_0_0_rgba(0,0,0,0.6)]">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-8 w-8 rounded border border-white/30" style={{ background: value }} />
              <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-8 flex-1 rounded border border-[#F5F1E8]/15 bg-[#1D1810] px-2 font-mono text-[11px] text-[#F5F1E8] outline-none focus:border-[#F2B705]"
              />
            </div>
            <RgbSliders value={value} onChange={onChange} />
          </div>
        </>
      )}
    </div>
  )
}

export default function AdminEnxamesPage() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [machines, setMachines] = useState<Machine[]>([])
  const [error, setError] = useState<string | null>(null)

  // Profissões: seleção + adição inline (por enxame).
  const [selectedCat, setSelectedCat] = useState<Record<number, number>>({})
  const [addingCatFor, setAddingCatFor] = useState<number | null>(null)
  const [newCatName, setNewCatName] = useState("")
  const [savingCat, setSavingCat] = useState(false)
  const [editingCat, setEditingCat] = useState<{ id: number; value: string } | null>(null)

  // Quick color (réguas RGB no quadrado do card).
  const [colorEditFor, setColorEditFor] = useState<number | null>(null)
  const [quickColors, setQuickColors] = useState<{ from: string; to: string }>({ from: "", to: "" })
  const [savingQuick, setSavingQuick] = useState(false)

  const [editMachine, setEditMachine] = useState<Machine | null>(null)
  const [editForm, setEditForm] = useState({
    name: "", description: "", icon_name: "",
    color_from: "", color_to: "", color_accent: "", color_glow: "", color_ring: "", color_text: "",
  })
  const [savingEdit, setSavingEdit] = useState(false)

  const [creatingOpen, setCreatingOpen] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_NEW_MACHINE)
  const [savingCreate, setSavingCreate] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  useEffect(() => {
    if (!token) { router.push("/login"); return }
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const isAdminFlag = data.is_admin || data.roles?.some((r: { desc_role: string }) => r.desc_role === "Administrator")
        if (!isAdminFlag) { router.push("/"); return }
        setIsAdmin(true)
        setCheckingAuth(false)
      })
      .catch(() => router.push("/"))
  }, [router, token])

  const loadMachines = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/enxames", { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setMachines(Array.isArray(data.enxames) ? data.enxames : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { if (isAdmin) loadMachines() }, [isAdmin, loadMachines])

  async function toggleMachine(m: Machine) {
    if (!token) return
    const next = !m.is_active
    const confirmed = window.confirm(
      next
        ? `Reativar "${m.name}"? Volta a aparecer na home e nos filtros públicos.`
        : `Desativar "${m.name}"? Some da home, filtros e vitrine pública. Pode reativar depois.`,
    )
    if (!confirmed) return
    try {
      const res = await fetch(`/api/admin/enxames/${m.id_machine}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: next }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await loadMachines()
    } catch (e) { alert(e instanceof Error ? e.message : "Erro") }
  }

  async function handleAddCategory(id_machine: number) {
    if (!token || !newCatName.trim()) return
    setSavingCat(true)
    try {
      const res = await fetch(`/api/admin/enxames/${id_machine}/categories`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ desc_category: newCatName.trim() }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setNewCatName("")
      setAddingCatFor(null)
      await loadMachines()
    } catch (e) { alert(e instanceof Error ? e.message : "Erro") }
    finally { setSavingCat(false) }
  }

  async function toggleCategoryActive(cat: Category) {
    if (!token) return
    try {
      const res = await fetch(`/api/admin/categories/${cat.id_category}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !cat.is_active }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await loadMachines()
    } catch (e) { alert(e instanceof Error ? e.message : "Erro") }
  }

  async function saveCategoryRename() {
    if (!token || !editingCat) return
    const { id, value } = editingCat
    if (!value.trim()) { setEditingCat(null); return }
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ desc_category: value.trim() }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setEditingCat(null)
      await loadMachines()
    } catch (e) { alert(e instanceof Error ? e.message : "Erro") }
  }

  function openColorEdit(m: Machine) {
    setColorEditFor(m.id_machine)
    setQuickColors({ from: m.color_from || "#6d28d9", to: m.color_to || "#2563eb" })
  }

  async function saveQuickColor(id_machine: number) {
    if (!token) return
    setSavingQuick(true)
    try {
      const res = await fetch(`/api/admin/enxames/${id_machine}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ color_from: quickColors.from, color_to: quickColors.to }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setColorEditFor(null)
      await loadMachines()
    } catch (e) { alert(e instanceof Error ? e.message : "Erro") }
    finally { setSavingQuick(false) }
  }

  function openEdit(m: Machine) {
    setEditMachine(m)
    setEditForm({
      name: m.name,
      description: m.description || "",
      icon_name: m.icon_name || "",
      color_from: m.color_from || "",
      color_to: m.color_to || "",
      color_accent: m.color_accent || "",
      color_glow: m.color_glow || "",
      color_ring: m.color_ring || "",
      color_text: m.color_text || "",
    })
  }

  async function handleCreateMachine() {
    if (!token) return
    if (!createForm.name.trim()) { alert("Nome obrigatório"); return }
    setSavingCreate(true)
    try {
      const payload = { ...createForm, slug: createForm.slug.trim() || autoSlug(createForm.name) }
      const res = await fetch(`/api/admin/enxames`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      setCreatingOpen(false)
      setCreateForm(EMPTY_NEW_MACHINE)
      setSlugTouched(false)
      await loadMachines()
    } catch (e) { alert(e instanceof Error ? e.message : "Erro") }
    finally { setSavingCreate(false) }
  }

  async function handleDeleteMachine(m: Machine) {
    if (!token) return
    const confirmed = window.confirm(
      `Excluir "${m.name}" PERMANENTEMENTE? As profissões vinculadas serão desvinculadas (não excluídas) e o enxame some da home, filtros e vitrine. Não dá para desfazer.`,
    )
    if (!confirmed) return
    try {
      const res = await fetch(`/api/admin/enxames/${m.id_machine}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      await loadMachines()
    } catch (e) { alert(e instanceof Error ? e.message : "Erro ao excluir") }
  }

  async function saveEditMachine() {
    if (!token || !editMachine) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/admin/enxames/${editMachine.id_machine}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setEditMachine(null)
      await loadMachines()
    } catch (e) { alert(e instanceof Error ? e.message : "Erro") }
    finally { setSavingEdit(false) }
  }

  if (checkingAuth) {
    return (
      <PageShell>
        <Section className="py-24"><LoadingState label="Verificando acesso…" /></Section>
      </PageShell>
    )
  }
  if (!isAdmin) return null

  return (
    <PageShell>
      <Section className="pb-20 pt-10 sm:pt-14">
        <TabloidBackLink href="/admin" />

        {/* Masthead */}
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-[#F2B705]">
              <Sparkles className="h-3.5 w-3.5" />
              Governança
            </div>
            <h1 className="fl-display text-4xl leading-[0.95] text-[#F5F1E8] sm:text-5xl md:text-6xl">
              Enxames
            </h1>
            <p className="mt-4 text-base leading-relaxed text-[#C9C2B6]">
              Habilite ou desabilite enxames, gerencie as profissões em cada um e ajuste a
              identidade visual. Clique no quadrado de cor para abrir as réguas RGB.
            </p>
          </div>
          <button onClick={() => setCreatingOpen(true)} className={TABLOID_ACTION_CLASSES}>
            <Plus className="h-4 w-4" />
            Novo enxame
          </button>
        </div>

        {/* Conteúdo */}
        <div className="mt-10">
          {loading ? (
            <LoadingState label="Carregando enxames…" />
          ) : error ? (
            <ErrorState description={error} onRetry={loadMachines} />
          ) : (
            <div className="space-y-5">
              {machines.map((m) => {
                const selCatId = selectedCat[m.id_machine] ?? (m.categories[0]?.id_category ?? 0)
                const selCat = m.categories.find((c) => c.id_category === selCatId) || null
                return (
                  <div
                    key={m.id_machine}
                    className={`relative border-2 bg-[#15100A] p-5 shadow-[5px_5px_0_0_rgba(0,0,0,0.5)] ${
                      m.is_active ? "border-[#F5F1E8]/12" : "border-dashed border-[#F5F1E8]/12 opacity-70"
                    }`}
                  >
                    {/* Cabeçalho do enxame */}
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Quadrado de cor → réguas RGB */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => (colorEditFor === m.id_machine ? setColorEditFor(null) : openColorEdit(m))}
                          title="Mudar cor (réguas RGB)"
                          className="h-11 w-11 rounded-md border-2 border-[#0B0B0D] shadow-[2px_2px_0_0_rgba(0,0,0,0.5)] transition hover:scale-105"
                          style={{ background: `linear-gradient(135deg, ${m.color_from || "#666"}, ${m.color_to || "#444"})` }}
                        />
                        {colorEditFor === m.id_machine && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setColorEditFor(null)} />
                            <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-lg border-2 border-[#F5F1E8]/15 bg-[#15100A] p-3 shadow-[6px_6px_0_0_rgba(0,0,0,0.6)]">
                              <div
                                className="mb-3 h-10 w-full rounded border border-white/15"
                                style={{ background: `linear-gradient(135deg, ${quickColors.from}, ${quickColors.to})` }}
                              />
                              <p className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A938A]">
                                Cor inicial <span className="h-3 w-3 rounded-full border border-white/30" style={{ background: quickColors.from }} />
                              </p>
                              <RgbSliders value={quickColors.from} onChange={(v) => setQuickColors((p) => ({ ...p, from: v }))} />
                              <p className="mb-1 mt-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A938A]">
                                Cor final <span className="h-3 w-3 rounded-full border border-white/30" style={{ background: quickColors.to }} />
                              </p>
                              <RgbSliders value={quickColors.to} onChange={(v) => setQuickColors((p) => ({ ...p, to: v }))} />
                              <div className="mt-3 flex gap-2">
                                <button onClick={() => saveQuickColor(m.id_machine)} disabled={savingQuick} className={`${TABLOID_ACTION_CLASSES} flex-1 !px-3 !py-2`}>
                                  {savingQuick ? "Salvando…" : "Salvar cor"}
                                </button>
                                <button onClick={() => setColorEditFor(null)} className={`${TABLOID_OUTLINE_ACTION_CLASSES} !px-3 !py-2`}>
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h2 className="fl-display flex flex-wrap items-center gap-2 text-xl leading-none text-[#F5F1E8]">
                          {m.name}
                          <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            m.is_active ? "bg-[#F2B705] text-[#1A1505]" : "bg-[#F5F1E8]/15 text-[#C9C2B6]"
                          }`}>
                            {m.is_active ? "Ativo" : "Desativado"}
                          </span>
                          <span className="font-mono text-xs font-normal text-[#9A938A]">{m.slug}</span>
                        </h2>
                        <p className="mt-1 text-sm text-[#9A938A]">
                          {m.categories.length} profissão(ões) · ordem {m.display_order}
                        </p>
                      </div>

                      <button onClick={() => openEdit(m)} className={`${TABLOID_OUTLINE_ACTION_CLASSES} !px-3 !py-2`}>
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </button>
                      <button onClick={() => toggleMachine(m)} className={`${TABLOID_OUTLINE_ACTION_CLASSES} !px-3 !py-2`}>
                        {m.is_active ? <><PowerOff className="h-3.5 w-3.5" /> Desativar</> : <><Power className="h-3.5 w-3.5" /> Ativar</>}
                      </button>
                      <button
                        onClick={() => handleDeleteMachine(m)}
                        title="Excluir permanentemente"
                        className="inline-flex items-center justify-center gap-2 border-2 border-[#7f1d1d] bg-transparent px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#f87171] transition hover:bg-[#7f1d1d]/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Excluir
                      </button>
                    </div>

                    {/* Profissões: select + adicionar */}
                    <div className="mt-5 border-t border-[#F5F1E8]/10 pt-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={selCatId}
                          onChange={(e) => setSelectedCat((p) => ({ ...p, [m.id_machine]: Number(e.target.value) }))}
                          disabled={m.categories.length === 0}
                          className="h-10 min-w-[14rem] flex-1 rounded-md border-2 border-[#F5F1E8]/15 bg-[#1D1810] px-3 text-sm font-bold text-[#F5F1E8] outline-none transition focus:border-[#F2B705] disabled:opacity-50"
                        >
                          {m.categories.length === 0 ? (
                            <option value={0}>Nenhuma profissão ainda</option>
                          ) : (
                            m.categories.map((c) => (
                              <option key={c.id_category} value={c.id_category}>
                                {c.desc_category}{c.is_active ? "" : " (inativa)"}
                              </option>
                            ))
                          )}
                        </select>

                        {addingCatFor === m.id_machine ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              className="h-10 w-56 rounded-md border-2 border-[#F5F1E8]/15 bg-[#1D1810] px-3 text-sm text-[#F5F1E8] outline-none focus:border-[#F2B705]"
                              placeholder="Nome da profissão"
                              value={newCatName}
                              onChange={(e) => setNewCatName(e.target.value)}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleAddCategory(m.id_machine)
                                if (e.key === "Escape") { setAddingCatFor(null); setNewCatName("") }
                              }}
                            />
                            <button disabled={savingCat} onClick={() => handleAddCategory(m.id_machine)} className={`${TABLOID_ACTION_CLASSES} !px-3 !py-2`}>
                              {savingCat ? "…" : "Adicionar"}
                            </button>
                            <button onClick={() => { setAddingCatFor(null); setNewCatName("") }} className={`${TABLOID_OUTLINE_ACTION_CLASSES} !px-3 !py-2`}>
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => { setAddingCatFor(m.id_machine); setNewCatName("") }} className={`${TABLOID_ACTION_CLASSES} !px-3 !py-2`}>
                            <Plus className="h-3.5 w-3.5" /> Profissão
                          </button>
                        )}
                      </div>

                      {/* Ações da profissão selecionada */}
                      {selCat && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {editingCat?.id === selCat.id_category ? (
                            <>
                              <input
                                className="h-9 w-64 rounded-md border-2 border-[#F5F1E8]/15 bg-[#1D1810] px-3 text-sm text-[#F5F1E8] outline-none focus:border-[#F2B705]"
                                value={editingCat.value}
                                onChange={(e) => setEditingCat({ id: selCat.id_category, value: e.target.value })}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveCategoryRename()
                                  if (e.key === "Escape") setEditingCat(null)
                                }}
                              />
                              <button onClick={saveCategoryRename} className={`${TABLOID_ACTION_CLASSES} !px-3 !py-1.5`}>
                                <Check className="h-3.5 w-3.5" /> Salvar
                              </button>
                              <button onClick={() => setEditingCat(null)} className={`${TABLOID_OUTLINE_ACTION_CLASSES} !px-3 !py-1.5`}>
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-xs text-[#9A938A]">Profissão selecionada:</span>
                              <span className="font-bold text-[#F5F1E8]">{selCat.desc_category}</span>
                              <button onClick={() => setEditingCat({ id: selCat.id_category, value: selCat.desc_category })} className={`${TABLOID_OUTLINE_ACTION_CLASSES} !px-3 !py-1.5`}>
                                <Pencil className="h-3 w-3" /> Renomear
                              </button>
                              <button onClick={() => toggleCategoryActive(selCat)} className={`${TABLOID_OUTLINE_ACTION_CLASSES} !px-3 !py-1.5`}>
                                {selCat.is_active ? <><X className="h-3 w-3 text-rose-400" /> Desativar</> : <><Check className="h-3 w-3 text-emerald-400" /> Reativar</>}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Section>

      {/* ── Modal Editar ─────────────────────────────────────────────────── */}
      <Dialog open={!!editMachine} onOpenChange={(v) => !v && setEditMachine(null)}>
        <DialogContent className="border-2 border-[#F5F1E8]/15 bg-[#15100A] text-[#F5F1E8]">
          <DialogHeader>
            <DialogTitle className="fl-display text-2xl text-[#F5F1E8]">Editar enxame</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A938A]">Nome</p>
              <input className="h-10 w-full rounded-md border-2 border-[#F5F1E8]/15 bg-[#1D1810] px-3 text-sm text-[#F5F1E8] outline-none focus:border-[#F2B705]"
                value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A938A]">Ícone (Lucide)</p>
                <input className="h-10 w-full rounded-md border-2 border-[#F5F1E8]/15 bg-[#1D1810] px-3 text-sm text-[#F5F1E8] outline-none focus:border-[#F2B705]"
                  value={editForm.icon_name} onChange={(e) => setEditForm((p) => ({ ...p, icon_name: e.target.value }))} placeholder="Sparkles" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A938A]">Descrição curta</p>
                <input className="h-10 w-full rounded-md border-2 border-[#F5F1E8]/15 bg-[#1D1810] px-3 text-sm text-[#F5F1E8] outline-none focus:border-[#F2B705]"
                  value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} placeholder="Texto curto do card" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <RgbField label="Cor inicial" value={editForm.color_from} onChange={(v) => setEditForm((p) => ({ ...p, color_from: v }))} />
              <RgbField label="Cor final" value={editForm.color_to} onChange={(v) => setEditForm((p) => ({ ...p, color_to: v }))} />
              <RgbField label="Accent" value={editForm.color_accent} onChange={(v) => setEditForm((p) => ({ ...p, color_accent: v }))} />
              <RgbField label="Glow" value={editForm.color_glow} onChange={(v) => setEditForm((p) => ({ ...p, color_glow: v }))} />
              <RgbField label="Ring" value={editForm.color_ring} onChange={(v) => setEditForm((p) => ({ ...p, color_ring: v }))} />
              <RgbField label="Texto" value={editForm.color_text} onChange={(v) => setEditForm((p) => ({ ...p, color_text: v }))} />
            </div>
            <div className="h-12 rounded-md border border-white/15"
              style={{ background: `linear-gradient(135deg, ${editForm.color_from || "#666"}, ${editForm.color_to || "#444"})` }} />
          </div>
          <DialogFooter>
            <button onClick={() => setEditMachine(null)} className={`${TABLOID_OUTLINE_ACTION_CLASSES} !px-4 !py-2`}>Cancelar</button>
            <button onClick={saveEditMachine} disabled={savingEdit} className={`${TABLOID_ACTION_CLASSES} !px-4 !py-2`}>
              {savingEdit ? "Salvando…" : "Salvar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal Criar ──────────────────────────────────────────────────── */}
      <Dialog
        open={creatingOpen}
        onOpenChange={(v) => { if (!v) { setCreatingOpen(false); setCreateForm(EMPTY_NEW_MACHINE); setSlugTouched(false) } }}
      >
        <DialogContent className="border-2 border-[#F5F1E8]/15 bg-[#15100A] text-[#F5F1E8]">
          <DialogHeader>
            <DialogTitle className="fl-display text-2xl text-[#F5F1E8]">Novo enxame</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A938A]">Nome</p>
                <input className="h-10 w-full rounded-md border-2 border-[#F5F1E8]/15 bg-[#1D1810] px-3 text-sm text-[#F5F1E8] outline-none focus:border-[#F2B705]"
                  value={createForm.name}
                  onChange={(e) => {
                    const name = e.target.value
                    setCreateForm((p) => ({ ...p, name, slug: slugTouched ? p.slug : autoSlug(name) }))
                  }}
                  placeholder="Enxame de Eventos" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A938A]">Slug</p>
                <input className="h-10 w-full rounded-md border-2 border-[#F5F1E8]/15 bg-[#1D1810] px-3 font-mono text-sm text-[#F5F1E8] outline-none focus:border-[#F2B705]"
                  value={createForm.slug}
                  onChange={(e) => { setSlugTouched(true); setCreateForm((p) => ({ ...p, slug: e.target.value })) }}
                  placeholder="eventos" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A938A]">Ícone (Lucide)</p>
                <input className="h-10 w-full rounded-md border-2 border-[#F5F1E8]/15 bg-[#1D1810] px-3 text-sm text-[#F5F1E8] outline-none focus:border-[#F2B705]"
                  value={createForm.icon_name} onChange={(e) => setCreateForm((p) => ({ ...p, icon_name: e.target.value }))} placeholder="Sparkles" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A938A]">Descrição curta</p>
                <input className="h-10 w-full rounded-md border-2 border-[#F5F1E8]/15 bg-[#1D1810] px-3 text-sm text-[#F5F1E8] outline-none focus:border-[#F2B705]"
                  value={createForm.description} onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))} placeholder="Aparece no card da home" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <RgbField label="Cor inicial" value={createForm.color_from} onChange={(v) => setCreateForm((p) => ({ ...p, color_from: v }))} />
              <RgbField label="Cor final" value={createForm.color_to} onChange={(v) => setCreateForm((p) => ({ ...p, color_to: v }))} />
              <RgbField label="Accent" value={createForm.color_accent} onChange={(v) => setCreateForm((p) => ({ ...p, color_accent: v }))} />
              <RgbField label="Glow" value={createForm.color_glow} onChange={(v) => setCreateForm((p) => ({ ...p, color_glow: v }))} />
              <RgbField label="Ring" value={createForm.color_ring} onChange={(v) => setCreateForm((p) => ({ ...p, color_ring: v }))} />
              <RgbField label="Texto" value={createForm.color_text} onChange={(v) => setCreateForm((p) => ({ ...p, color_text: v }))} />
            </div>
            <div className="h-12 rounded-md border border-white/15"
              style={{ background: `linear-gradient(135deg, ${createForm.color_from}, ${createForm.color_to})` }} />
          </div>
          <DialogFooter>
            <button onClick={() => setCreatingOpen(false)} className={`${TABLOID_OUTLINE_ACTION_CLASSES} !px-4 !py-2`}>Cancelar</button>
            <button onClick={handleCreateMachine} disabled={savingCreate} className={`${TABLOID_ACTION_CLASSES} !px-4 !py-2`}>
              {savingCreate ? "Criando…" : "Criar enxame"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
