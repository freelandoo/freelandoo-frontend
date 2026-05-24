"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Compass, Eye, EyeOff, Loader2, Lock, Pencil, Plus, Trash2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

interface Path {
  id: string
  path_key: string
  title: string
  description: string
  cta_label: string
  banner_image_url: string | null
  banner_object_key: string | null
  sort_order: number
  is_active: boolean
  is_seed: boolean
  version: number
}

interface Step {
  id: string
  path_id: string
  step_order: number
  route: string
  target_selector: string | null
  wait_for_selector: string | null
  placement: "top" | "bottom" | "left" | "right" | "center"
  title: string
  content: string
  on_enter_action: string | null
  on_leave_action: string | null
}

type Tab = "paths" | "steps" | "preview" | "rules"

function authHeader(): HeadersInit {
  if (typeof window === "undefined") return {}
  const token = window.localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function AdminToursPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("paths")
  const [paths, setPaths] = useState<Path[]>([])
  const [loading, setLoading] = useState(true)

  const loadPaths = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/tours/monetization-paths", {
        headers: authHeader(),
        cache: "no-store",
      })
      if (res.ok) {
        const data = await res.json()
        setPaths(data.items ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPaths()
  }, [loadPaths])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <button
          onClick={() => router.push("/administracao")}
          className="mb-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Administração
        </button>
        <h1 className="mb-1 flex items-center gap-3 text-2xl font-semibold">
          <Compass className="h-6 w-6 text-primary" /> Tours de monetização
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Edite os caminhos do modal pós-login e os passos dos tours guiados.
        </p>

        <div className="mb-6 flex flex-wrap gap-2 border-b border-border">
          {[
            { id: "paths" as Tab, label: "Caminhos" },
            { id: "steps" as Tab, label: "Passos" },
            { id: "preview" as Tab, label: "Preview" },
            { id: "rules" as Tab, label: "Regras" },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
                tab === id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {tab === "paths" && <PathsTab paths={paths} reload={loadPaths} />}
            {tab === "steps" && <StepsTab paths={paths} reload={loadPaths} />}
            {tab === "preview" && <PreviewTab paths={paths} />}
            {tab === "rules" && <RulesTab />}
          </>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// PathsTab
// ============================================================================

function PathsTab({ paths, reload }: { paths: Path[]; reload: () => Promise<void> }) {
  const [editing, setEditing] = useState<Path | null>(null)
  const [creating, setCreating] = useState(false)

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreating(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" /> Novo caminho
        </Button>
      </div>

      {paths.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Nenhum caminho cadastrado.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {paths.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div
                  className="h-16 w-12 shrink-0 overflow-hidden rounded-md bg-muted bg-cover bg-center"
                  style={p.banner_image_url ? { backgroundImage: `url(${p.banner_image_url})` } : undefined}
                >
                  {!p.banner_image_url && (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                      sem capa
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.title}</span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {p.path_key}
                    </Badge>
                    {p.is_seed && (
                      <Badge variant="secondary" className="text-[10px]">
                        <Lock className="mr-1 h-2.5 w-2.5" /> fixo
                      </Badge>
                    )}
                    {!p.is_active && <Badge variant="destructive" className="text-[10px]">Inativo</Badge>}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {p.description}
                  </p>
                  <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
                    <span>ordem: {p.sort_order}</span>
                    <span>versão: {p.version}</span>
                    <span>CTA: {p.cta_label}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(p)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {!p.is_seed && <DeletePathButton path={p} onDone={reload} />}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {creating && (
        <PathDialog
          path={null}
          onClose={() => setCreating(false)}
          onSaved={async () => { setCreating(false); await reload() }}
        />
      )}
      {editing && (
        <PathDialog
          path={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await reload() }}
        />
      )}
    </div>
  )
}

function DeletePathButton({ path, onDone }: { path: Path; onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const handle = async () => {
    if (!confirm(`Apagar caminho "${path.title}"?`)) return
    setBusy(true)
    try {
      await fetch(`/api/admin/tours/monetization-paths/${path.id}`, {
        method: "DELETE",
        headers: authHeader(),
      })
      await onDone()
    } finally {
      setBusy(false)
    }
  }
  return (
    <Button variant="ghost" size="sm" onClick={handle} disabled={busy}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
    </Button>
  )
}

function PathDialog({
  path, onClose, onSaved,
}: { path: Path | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({
    path_key: path?.path_key ?? "",
    title: path?.title ?? "",
    description: path?.description ?? "",
    cta_label: path?.cta_label ?? "Começar",
    sort_order: path?.sort_order ?? 0,
    is_active: path?.is_active ?? true,
  })
  const [banner, setBanner] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      const fd = new FormData()
      // Quando seed, path_key é imutável no backend — não envia.
      if (!path?.is_seed) fd.append("path_key", form.path_key)
      fd.append("title", form.title)
      fd.append("description", form.description)
      fd.append("cta_label", form.cta_label)
      fd.append("sort_order", String(form.sort_order))
      fd.append("is_active", String(form.is_active))
      if (banner) fd.append("banner", banner)

      const url = path
        ? `/api/admin/tours/monetization-paths/${path.id}`
        : `/api/admin/tours/monetization-paths`
      const res = await fetch(url, {
        method: path ? "PUT" : "POST",
        headers: authHeader(),
        body: fd,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "Falha ao salvar")
        setSaving(false)
        return
      }
      await onSaved()
    } catch {
      setError("Erro de conexão")
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{path ? "Editar caminho" : "Novo caminho"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>path_key</Label>
            <Input
              value={form.path_key}
              onChange={(e) => setForm({ ...form, path_key: e.target.value.toLowerCase() })}
              disabled={!!path?.is_seed}
              placeholder="ex: meu-caminho"
            />
            {path?.is_seed && (
              <p className="text-[11px] text-muted-foreground">
                Caminho fixo — path_key não pode ser alterado.
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Título</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>CTA</Label>
              <Input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Ordem</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Banner (9:16, JPG/PNG/WebP até 12MB)</Label>
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setBanner(e.target.files?.[0] ?? null)}
            />
            {path?.banner_image_url && !banner && (
              <p className="text-[11px] text-muted-foreground">Atual: {path.banner_image_url}</p>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Ativo (aparece no modal)
          </label>
          {error && (
            <p className="rounded border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={saving || !form.title.trim() || !form.description.trim()}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// StepsTab
// ============================================================================

function StepsTab({ paths, reload }: { paths: Path[]; reload: () => Promise<void> }) {
  const [selectedPathId, setSelectedPathId] = useState<string>(paths[0]?.id ?? "")
  const [steps, setSteps] = useState<Step[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Step | null>(null)
  const [creating, setCreating] = useState(false)

  const loadSteps = useCallback(async (pathId: string) => {
    if (!pathId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/tours/monetization-paths/${pathId}/steps`, {
        headers: authHeader(),
        cache: "no-store",
      })
      if (res.ok) {
        const data = await res.json()
        setSteps(data.items ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedPathId) void loadSteps(selectedPathId)
  }, [selectedPathId, loadSteps])

  const selectedPath = paths.find((p) => p.id === selectedPathId) ?? null

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="space-y-1">
          <Label>Caminho</Label>
          <Select value={selectedPathId} onValueChange={setSelectedPathId}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Selecione um caminho" />
            </SelectTrigger>
            <SelectContent>
              {paths.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}{p.is_active ? "" : " (inativo)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          size="sm"
          onClick={() => setCreating(true)}
          disabled={!selectedPathId}
          className="ml-auto"
        >
          <Plus className="mr-2 h-4 w-4" /> Novo passo
        </Button>
      </div>

      {!selectedPathId ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Crie um caminho primeiro.
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : steps.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Nenhum passo ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {steps.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-center gap-3 p-3">
                <Badge variant="outline" className="font-mono text-[10px]">
                  #{s.step_order}
                </Badge>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{s.title}</span>
                    <Badge variant="secondary" className="text-[10px]">{s.placement}</Badge>
                  </div>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{s.content}</p>
                  <div className="mt-1 flex gap-3 text-[11px] text-muted-foreground">
                    <span>route: <code>{s.route}</code></span>
                    {s.target_selector && <span>target: <code>{s.target_selector}</code></span>}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setEditing(s)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <DeleteStepButton
                  step={s}
                  onDone={async () => { await loadSteps(selectedPathId); await reload() }}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {creating && selectedPath && (
        <StepDialog
          step={null}
          pathId={selectedPath.id}
          onClose={() => setCreating(false)}
          onSaved={async () => { setCreating(false); await loadSteps(selectedPathId); await reload() }}
        />
      )}
      {editing && (
        <StepDialog
          step={editing}
          pathId={editing.path_id}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await loadSteps(selectedPathId); await reload() }}
        />
      )}
    </div>
  )
}

function DeleteStepButton({ step, onDone }: { step: Step; onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const handle = async () => {
    if (!confirm(`Apagar passo "${step.title}"?`)) return
    setBusy(true)
    try {
      await fetch(`/api/admin/tours/steps/${step.id}`, {
        method: "DELETE",
        headers: authHeader(),
      })
      await onDone()
    } finally {
      setBusy(false)
    }
  }
  return (
    <Button variant="ghost" size="sm" onClick={handle} disabled={busy}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
    </Button>
  )
}

function StepDialog({
  step, pathId, onClose, onSaved,
}: {
  step: Step | null
  pathId: string
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [form, setForm] = useState({
    step_order: step?.step_order ?? 1,
    route: step?.route ?? "/",
    target_selector: step?.target_selector ?? "",
    wait_for_selector: step?.wait_for_selector ?? "",
    placement: step?.placement ?? ("bottom" as Step["placement"]),
    title: step?.title ?? "",
    content: step?.content ?? "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      const body = {
        ...form,
        ...(step ? {} : { path_id: pathId }),
      }
      const url = step
        ? `/api/admin/tours/steps/${step.id}`
        : `/api/admin/tours/steps`
      const res = await fetch(url, {
        method: step ? "PUT" : "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "Falha ao salvar")
        setSaving(false)
        return
      }
      await onSaved()
    } catch {
      setError("Erro de conexão")
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{step ? "Editar passo" : "Novo passo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Ordem</Label>
              <Input
                type="number"
                value={form.step_order}
                onChange={(e) => setForm({ ...form, step_order: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label>Posição balão</Label>
              <Select
                value={form.placement}
                onValueChange={(v) => setForm({ ...form, placement: v as Step["placement"] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["top", "bottom", "left", "right", "center"] as const).map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Rota Next.js</Label>
            <Input
              value={form.route}
              onChange={(e) => setForm({ ...form, route: e.target.value })}
              placeholder="ex: /account/afiliado"
            />
          </div>
          <div className="space-y-1">
            <Label>Seletor alvo (CSS)</Label>
            <Input
              value={form.target_selector}
              onChange={(e) => setForm({ ...form, target_selector: e.target.value })}
              placeholder='ex: [data-tour-path="affiliate-link"]'
            />
          </div>
          <div className="space-y-1">
            <Label>Seletor de espera (opcional)</Label>
            <Input
              value={form.wait_for_selector}
              onChange={(e) => setForm({ ...form, wait_for_selector: e.target.value })}
              placeholder="Default: usa o seletor alvo"
            />
          </div>
          <div className="space-y-1">
            <Label>Título do balão</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Conteúdo</Label>
            <Textarea rows={3} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </div>
          {error && (
            <p className="rounded border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={saving || !form.title.trim() || !form.content.trim() || !form.route.trim()}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// PreviewTab
// ============================================================================

function PreviewTab({ paths }: { paths: Path[] }) {
  const activePaths = useMemo(() => paths.filter((p) => p.is_active), [paths])
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Modal de monetização (ao vivo, dados do banco)</CardTitle>
        </CardHeader>
        <CardContent>
          {activePaths.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum caminho ativo.</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {activePaths.map((p) => (
                <div key={p.id} className="w-[160px] shrink-0 overflow-hidden rounded-lg border border-border bg-muted/30">
                  <div
                    className="aspect-[9/14] bg-muted bg-cover bg-center"
                    style={p.banner_image_url ? { backgroundImage: `url(${p.banner_image_url})` } : undefined}
                  >
                    {!p.banner_image_url && (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                        sem capa
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="line-clamp-2 text-[11px] font-medium">{p.title}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">CTA: {p.cta_label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Inativos / ocultos do modal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm text-muted-foreground">
            {paths.filter((p) => !p.is_active).map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <EyeOff className="h-3 w-3" />
                <span>{p.title}</span>
                <Badge variant="outline" className="font-mono text-[10px]">{p.path_key}</Badge>
              </div>
            )) || <p>—</p>}
            {paths.filter((p) => !p.is_active).length === 0 && <p>Todos ativos.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// RulesTab
// ============================================================================

function RulesTab() {
  const rules: Array<{ title: string; body: string }> = [
    {
      title: "Quando o modal aparece",
      body: "Logo após o BirthdateGate (idade confirmada), em qualquer rota autenticada. Não aparece em /, /login, /cadastro, /freelancer/*, /cursos/*, /p/*.",
    },
    {
      title: "Quando NÃO aparece",
      body: "Se o usuário já clicou em 'Agora não', 'Não quero ver isso de novo', fechou ou escolheu um caminho. Também não aparece se ainda não preencheu data de nascimento.",
    },
    {
      title: "Caminhos fixos",
      body: "Os 5 caminhos do seed (affiliate, courses, products, services, explore) têm is_seed=TRUE. Você pode desativá-los, editar conteúdo e banner, mas não pode deletar nem mudar path_key.",
    },
    {
      title: "Versão do caminho",
      body: "Ao editar um caminho ou seus passos, version sobe automaticamente. Isso garante que usuários que estavam no meio do tour antigo sejam re-sincronizados.",
    },
    {
      title: "Seletores ausentes",
      body: "Se target_selector não casa com nenhum elemento na página em 6s, o balão mostra 'Não encontrei o elemento' e o usuário pode avançar ou pular. Use sempre [data-tour-path=\"...\"].",
    },
    {
      title: "Banners 9:16",
      body: "Ideal: 1080x1920 (vertical). Aceito: JPG, PNG, WebP até 12MB. Upload vai pro R2 prefixo tour-cards/.",
    },
  ]
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rules.map((r) => (
        <Card key={r.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{r.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs leading-relaxed text-muted-foreground">{r.body}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
