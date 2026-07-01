"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { HeartHandshake, Loader2, ArrowLeft } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default function NovaVaquinhaPage() {
  return (
    <Suspense fallback={<main className="flex min-h-[60vh] items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></main>}>
      <NovaVaquinhaForm />
    </Suspense>
  )
}

function NovaVaquinhaForm() {
  const t = useTranslations("Vaquinha")
  const router = useRouter()
  const searchParams = useSearchParams()
  const vaquinhaOn = useFeature("vaquinha")

  const editId = searchParams.get("edit")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [existingActive, setExistingActive] = useState<{ id_vaquinha: string; slug: string } | null>(null)

  const [title, setTitle] = useState("")
  const [bio, setBio] = useState("")
  const [goal, setGoal] = useState("")
  const maxDate = useMemo(() => toDateInput(new Date(Date.now() + 90 * 864e5)), [])
  const minDate = useMemo(() => toDateInput(new Date(Date.now() + 864e5)), [])
  const [deadline, setDeadline] = useState(toDateInput(new Date(Date.now() + 30 * 864e5)))

  useEffect(() => {
    if (!vaquinhaOn) router.replace("/")
  }, [vaquinhaOn, router])

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) {
      router.push("/login")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/me/vaquinha", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      const data = await res.json()
      const mine = data?.vaquinha
      if (mine) {
        setExistingActive({ id_vaquinha: mine.id_vaquinha, slug: mine.slug })
        if (editId && mine.id_vaquinha === editId) {
          setTitle(mine.title || "")
          setBio(mine.bio || "")
          setGoal(mine.goal_cents ? String(mine.goal_cents / 100) : "")
          setDeadline(toDateInput(new Date(mine.deadline)))
        }
      }
    } catch {
      /* segue com form vazio */
    } finally {
      setLoading(false)
    }
  }, [router, editId])

  useEffect(() => {
    void load()
  }, [load])

  const isEditing = !!editId && existingActive?.id_vaquinha === editId
  const blockedByExisting = !isEditing && !!existingActive

  async function save() {
    const token = getToken()
    const goalCents = Math.round(Number(goal) * 100)
    if (!title.trim()) return toast.error(t("titleRequired", "Dê um título à campanha."))
    if (!Number.isFinite(goalCents) || goalCents <= 0) return toast.error(t("goalRequired", "Defina uma meta válida."))
    if (!deadline) return toast.error(t("deadlineRequired", "Defina o prazo."))

    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        bio: bio.trim(),
        goal_cents: goalCents,
        deadline: new Date(`${deadline}T23:59:59`).toISOString(),
      }
      const url = isEditing ? `/api/me/vaquinha/${editId}` : "/api/me/vaquinha"
      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "save")
      toast.success(isEditing ? t("saved", "Alterações salvas.") : t("created", "Vaquinha criada!"))
      router.push(`/vaquinha/${data.vaquinha.slug}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveError", "Não foi possível salvar."))
      setSaving(false)
    }
  }

  if (!vaquinhaOn) return null

  return (
    <main className="min-h-screen bg-background pb-16">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link href="/account" className="mb-6 inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t("back", "Voltar")}
        </Link>

        <header className="mb-6 border-b-4 border-foreground/80 pb-2">
          <p className="fl-marker text-base text-primary inline-flex items-center gap-2">
            <HeartHandshake className="h-4 w-4" /> {t("crowdfunding", "vaquinha")}
          </p>
          <h1 className="fl-display text-4xl leading-[0.85] text-foreground md:text-5xl">
            {isEditing ? t("editTitle", "Editar vaquinha") : t("newTitle", "Nova vaquinha")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("intro", "Crie uma campanha de doação. Meta e prazo obrigatórios (máx. 90 dias). O que for doado cai no seu Saldo.")}
          </p>
        </header>

        {loading ? (
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {t("loading", "Carregando…")}</p>
        ) : blockedByExisting ? (
          <div className="border-2 border-[#0B0B0D] bg-[#1D1810] p-5 text-[#F1EDE2] shadow-[4px_4px_0_0_#0B0B0D]">
            <p className="fl-display text-xl">{t("alreadyHave", "Você já tem uma vaquinha ativa")}</p>
            <p className="mt-1 text-sm text-[#F1EDE2]/60">{t("alreadyHaveHint", "Só é possível ter uma por vez. Encerre a atual para criar outra.")}</p>
            <Link href={`/vaquinha/${existingActive!.slug}`} className="mt-4 inline-flex border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2 text-sm font-bold text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]">
              {t("openMine", "Abrir minha vaquinha")}
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            <Field label={t("fTitle", "Título da campanha")}>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className={inputCls} placeholder={t("fTitlePh", "Ex.: Ajuda para o tratamento da Ana")} />
            </Field>
            <Field label={t("fBio", "Sobre a campanha")}>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={3000} rows={5} className={`${inputCls} resize-none`} placeholder={t("fBioPh", "Conte a história, para que serve a arrecadação…")} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("fGoal", "Meta (R$)")}>
                <input type="number" min={1} step="1" value={goal} onChange={(e) => setGoal(e.target.value)} className={inputCls} placeholder="5000" />
              </Field>
              <Field label={t("fDeadline", "Prazo (máx. 90 dias)")}>
                <input type="date" min={minDate} max={maxDate} value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputCls} />
              </Field>
            </div>

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-3 text-sm font-black uppercase tracking-wide text-[#0B0B0D] shadow-[4px_4px_0_0_#0B0B0D] transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartHandshake className="h-4 w-4" />}
              {isEditing ? t("saveChanges", "Salvar alterações") : t("createCta", "Criar vaquinha")}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

const inputCls =
  "w-full border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-2.5 text-sm text-[#0B0B0D] outline-none transition focus:shadow-[3px_3px_0_0_#0B0B0D]"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
