"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { HeartHandshake, Loader2, Users, Clock, Target, Square, ArrowLeft, ImageIcon, Hexagon, Type, Trash2, Plus, UploadCloud, Repeat, Award, XCircle } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"

type Vaquinha = {
  id_vaquinha: string
  id_user: string
  kind: "vaquinha" | "bolsa"
  title: string
  slug: string
  bio: string | null
  cover_url: string | null
  goal_cents: number
  raised_cents: number
  donors_count: number
  deadline: string | null
  status: "active" | "ended" | "canceled"
}
type Donor = { id_donation: string; donor_name: string; message: string | null; amount_cents: number; paid_at: string }
type Sponsor = { id_sponsorship: string; sponsor_name: string; monthly_cents: number; since: string | null }
type MySponsorship = { id_sponsorship: string; monthly_cents: number; status: string }
type Post = {
  id_post: string
  kind: "post" | "bee" | "text"
  caption: string | null
  media_url: string | null
  thumbnail_url: string | null
  media_type: "image" | "video" | null
  created_at: string
}

const PRESETS = [1000, 2500, 5000, 10000, 20000]
const MAX_DEADLINE_DAYS = 90

function toDateInput(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10)
}

export function VaquinhaView({ slug }: { slug: string }) {
  const t = useTranslations("Vaquinha")
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [v, setV] = useState<Vaquinha | null>(null)
  const [donors, setDonors] = useState<Donor[]>([])
  const [minCents, setMinCents] = useState(500)
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")
  const [meId, setMeId] = useState<string | null>(null)

  const [donateOpen, setDonateOpen] = useState(false)
  const [amount, setAmount] = useState(2500)
  const [donorName, setDonorName] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Bolsa Patrocínio (assinatura mensal)
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [mySponsorship, setMySponsorship] = useState<MySponsorship | null>(null)
  const [sponsorOpen, setSponsorOpen] = useState(false)
  const [cancelingSponsor, setCancelingSponsor] = useState(false)
  const [switchingKind, setSwitchingKind] = useState(false)

  // Publicações da vaquinha
  const [posts, setPosts] = useState<Post[]>([])
  const [composerKind, setComposerKind] = useState<"text" | "post" | "bee" | null>(null)
  const [caption, setCaption] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [posting, setPosting] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  // Edição inline do dono ("na própria pele"): a página é o editor.
  const [form, setForm] = useState({ title: "", bio: "", goalText: "", deadline: "" })
  const [savingField, setSavingField] = useState<string | null>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const coverRef = useRef<HTMLInputElement | null>(null)

  const money = useCallback(
    (cents: number) => (cents / 100).toLocaleString(locale, { style: "currency", currency: "BRL" }),
    [locale],
  )

  const load = useCallback(async () => {
    setState("loading")
    try {
      const token = getToken()
      const res = await fetch(`/api/vaquinhas/${encodeURIComponent(slug)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setV(data.vaquinha)
      setDonors(Array.isArray(data.donors) ? data.donors : [])
      setSponsors(Array.isArray(data.sponsors) ? data.sponsors : [])
      setMySponsorship(data.my_sponsorship || null)
      setMinCents(Number(data.min_donation_cents) || 500)
      setState("loaded")
    } catch {
      setState("error")
    }
  }, [slug])

  const loadPosts = useCallback(async () => {
    try {
      const res = await fetch(`/api/vaquinhas/${encodeURIComponent(slug)}/posts`, { cache: "no-store" })
      const data = await res.json()
      setPosts(Array.isArray(data.posts) ? data.posts : [])
    } catch {
      setPosts([])
    }
  }, [slug])

  useEffect(() => {
    void load()
    void loadPosts()
  }, [load, loadPosts])

  // Descobre se o visitante é o dono (mostra controles).
  useEffect(() => {
    const token = getToken()
    if (!token) return
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMeId(d?.id_user || null))
      .catch(() => {})
  }, [])

  // Feedback pós-retorno do Stripe.
  useEffect(() => {
    const d = searchParams.get("doacao")
    if (d === "sucesso") {
      toast.success(t("thanksTitle", "Obrigado pela sua doação!"), {
        description: t("thanksBody", "Pode levar alguns segundos para aparecer no contador."),
      })
      setTimeout(() => void load(), 2500)
    } else if (d === "cancelada") {
      toast.info(t("canceled", "Doação cancelada."))
    }
    const p = searchParams.get("patrocinio")
    if (p === "sucesso") {
      toast.success(t("sponsorThanksTitle", "Patrocínio confirmado!"), {
        description: t("sponsorThanksBody", "Obrigado por apoiar todo mês. Pode levar alguns segundos para aparecer."),
      })
      setTimeout(() => void load(), 2500)
    } else if (p === "cancelado") {
      toast.info(t("sponsorCanceledCheckout", "Patrocínio cancelado — você não foi cobrado."))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const progress = useMemo(() => {
    if (!v || v.goal_cents <= 0) return 0
    return Math.min(100, Math.round((v.raised_cents / v.goal_cents) * 100))
  }, [v])

  const daysLeft = useMemo(() => {
    if (!v || !v.deadline) return 0
    const ms = new Date(v.deadline).getTime() - Date.now()
    return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)))
  }, [v])

  const isBolsa = v?.kind === "bolsa"
  const isOwner = !!v && !!meId && v.id_user === meId
  // Bolsa não tem prazo — ativa até ser encerrada manualmente.
  const isActive = !!v && v.status === "active" && (isBolsa || daysLeft > 0)
  const monthlyTotal = useMemo(() => sponsors.reduce((s, x) => s + (Number(x.monthly_cents) || 0), 0), [sponsors])

  // Sincroniza o form de edição só quando troca de vaquinha (não sobrescreve
  // edição em andamento quando o contador recarrega).
  const vId = v?.id_vaquinha
  useEffect(() => {
    if (!v) return
    setForm({
      title: v.title || "",
      bio: v.bio || "",
      goalText: v.goal_cents ? String(Math.round(v.goal_cents / 100)) : "",
      deadline: v.deadline ? toDateInput(v.deadline) : "",
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vId])

  const patchField = useCallback(
    async (field: "title" | "bio" | "goal_cents" | "deadline", value: unknown) => {
      if (!v) return
      setSavingField(field)
      try {
        const token = getToken()
        const res = await fetch(`/api/me/vaquinha/${v.id_vaquinha}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: value }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || "save")
        if (data?.vaquinha) setV((prev) => (prev ? { ...prev, ...data.vaquinha } : data.vaquinha))
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("saveError", "Não foi possível salvar."))
      } finally {
        setSavingField(null)
      }
    },
    [v, t],
  )

  const saveTitle = useCallback(() => {
    if (!v) return
    const val = form.title.trim()
    if (!val || val === (v.title || "")) return
    void patchField("title", val)
  }, [form.title, v, patchField])

  const saveBio = useCallback(() => {
    if (!v) return
    if (form.bio === (v.bio || "")) return
    void patchField("bio", form.bio)
  }, [form.bio, v, patchField])

  const saveGoal = useCallback(() => {
    if (!v) return
    const cents = Math.round(Number(form.goalText) * 100)
    if (!Number.isFinite(cents) || cents <= 0 || cents === v.goal_cents) return
    void patchField("goal_cents", cents)
  }, [form.goalText, v, patchField])

  const saveDeadline = useCallback(() => {
    if (!v || !form.deadline) return
    const iso = new Date(`${form.deadline}T23:59:59`).toISOString()
    if (v.deadline && toDateInput(iso) === toDateInput(v.deadline)) return
    void patchField("deadline", iso)
  }, [form.deadline, v, patchField])

  // Troca vaquinha ⇄ bolsa patrocínio. Voltar pra vaquinha exige um prazo novo
  // (mandamos +30 dias; o dono ajusta depois) e zero patrocínios ativos.
  const switchKind = useCallback(
    async (kind: "vaquinha" | "bolsa") => {
      if (!v || v.kind === kind) return
      setSwitchingKind(true)
      try {
        const token = getToken()
        const body: Record<string, unknown> = { kind }
        if (kind === "vaquinha") {
          body.deadline = new Date(Date.now() + 30 * 864e5).toISOString()
        }
        const res = await fetch(`/api/me/vaquinha/${v.id_vaquinha}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || "kind")
        if (data?.vaquinha) setV((prev) => (prev ? { ...prev, ...data.vaquinha } : data.vaquinha))
        toast.success(
          kind === "bolsa"
            ? t("kindSwitchedBolsa", "Agora é uma Bolsa Patrocínio — sem prazo, apoio mensal.")
            : t("kindSwitchedVaquinha", "Agora é uma Vaquinha — doações únicas com prazo.")
        )
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("saveError", "Não foi possível salvar."))
      } finally {
        setSwitchingKind(false)
      }
    },
    [v, t],
  )

  // Patrocínio mensal (bolsa): cria o checkout recorrente e redireciona.
  async function submitSponsorship() {
    const token = getToken()
    if (!token) {
      toast.error(t("sponsorLogin", "Entre na sua conta para patrocinar."))
      return
    }
    if (amount < minCents) {
      toast.error(t("minError", "Valor abaixo do mínimo."))
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/vaquinhas/${encodeURIComponent(slug)}/sponsor`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount_cents: amount, sponsor_name: donorName.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.checkout_url) throw new Error(data?.error || "sponsor")
      window.location.href = data.checkout_url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("sponsorError", "Não foi possível iniciar o patrocínio."))
      setSubmitting(false)
    }
  }

  async function cancelMySponsorship() {
    if (!mySponsorship) return
    if (!confirm(t("sponsorCancelConfirm", "Cancelar seu patrocínio mensal? O mês já pago não é estornado."))) return
    setCancelingSponsor(true)
    try {
      const token = getToken()
      const res = await fetch(`/api/vaquinhas/${encodeURIComponent(slug)}/sponsor/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "cancel")
      toast.success(t("sponsorCanceled", "Patrocínio cancelado."))
      void load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("sponsorCancelError", "Não foi possível cancelar."))
    } finally {
      setCancelingSponsor(false)
    }
  }

  async function uploadCover(f: File) {
    if (!v) return
    setUploadingCover(true)
    try {
      const token = getToken()
      const fd = new FormData()
      fd.append("cover", f)
      const res = await fetch(`/api/me/vaquinha/${v.id_vaquinha}/cover`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "cover")
      if (data?.vaquinha) setV((prev) => (prev ? { ...prev, ...data.vaquinha } : data.vaquinha))
      toast.success(t("coverUpdated", "Capa atualizada!"))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("coverError", "Não foi possível enviar a capa."))
    } finally {
      setUploadingCover(false)
    }
  }

  const maxDeadline = useMemo(() => toDateInput(new Date(Date.now() + MAX_DEADLINE_DAYS * 864e5).toISOString()), [])
  const minDeadline = useMemo(() => toDateInput(new Date(Date.now() + 864e5).toISOString()), [])

  async function submitDonation() {
    if (amount < minCents) {
      toast.error(t("minError", "Valor abaixo do mínimo."))
      return
    }
    setSubmitting(true)
    try {
      const token = getToken()
      const res = await fetch(`/api/vaquinhas/${encodeURIComponent(slug)}/donate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ amount_cents: amount, donor_name: donorName.trim() || undefined, message: message.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.checkout_url) throw new Error(data?.error || "donate")
      window.location.href = data.checkout_url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("donateError", "Não foi possível iniciar a doação."))
      setSubmitting(false)
    }
  }

  async function closeCampaign() {
    if (!v) return
    if (!confirm(t("confirmClose", "Encerrar esta vaquinha? Ela para de receber doações."))) return
    const token = getToken()
    const res = await fetch(`/api/me/vaquinha/${v.id_vaquinha}/close`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      toast.success(t("closed", "Vaquinha encerrada."))
      void load()
    } else {
      toast.error(t("closeError", "Falha ao encerrar."))
    }
  }

  function openComposer(kind: "text" | "post" | "bee") {
    setComposerKind(kind)
    setCaption("")
    setFile(null)
  }

  async function submitPost() {
    if (!v) return
    if (composerKind === "text" && !caption.trim()) return toast.error(t("writeSomething", "Escreva algo."))
    if (composerKind !== "text" && !file) return toast.error(t("pickMedia", "Selecione uma mídia."))
    setPosting(true)
    try {
      const token = getToken()
      const fd = new FormData()
      fd.append("kind", composerKind || "text")
      fd.append("caption", caption)
      if (file) fd.append("media", file)
      const res = await fetch(`/api/me/vaquinha/${v.id_vaquinha}/posts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "post")
      toast.success(t("posted", "Publicado!"))
      setComposerKind(null)
      setCaption("")
      setFile(null)
      void loadPosts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("postError", "Não foi possível publicar."))
    } finally {
      setPosting(false)
    }
  }

  async function deletePost(id: string) {
    if (!confirm(t("confirmDeletePost", "Apagar esta publicação?"))) return
    const token = getToken()
    const res = await fetch(`/api/me/vaquinha/posts/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) { setPosts((p) => p.filter((x) => x.id_post !== id)) } else toast.error(t("deleteError", "Falha ao apagar."))
  }

  if (state === "loading") {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </main>
    )
  }

  if (state === "error" || !v) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <HeartHandshake className="h-10 w-10 text-muted-foreground" />
        <h1 className="fl-display text-3xl text-foreground">{t("notFound", "Vaquinha não encontrada")}</h1>
        <Link href="/" className="text-sm font-bold text-primary underline">
          {t("backHome", "Voltar ao início")}
        </Link>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background pb-16">
      {/* Hero */}
      <div className="relative">
        <div className="h-44 w-full overflow-hidden border-b-2 border-[#0B0B0D] bg-[#1d1810] md:h-60">
          {v.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={v.cover_url} alt={v.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1d1810] to-[#0B0B0D]">
              <HeartHandshake className="h-16 w-16 text-[#F2B705]/40" />
            </div>
          )}
        </div>
        {isOwner && (
          <>
            <input
              ref={coverRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void uploadCover(f)
                e.target.value = ""
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => coverRef.current?.click()}
              disabled={uploadingCover}
              className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-1.5 text-[12px] font-bold text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {uploadingCover ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
              {v.cover_url ? t("changeCover", "Trocar capa") : t("addCover", "Adicionar capa")}
            </button>
          </>
        )}
      </div>

      <div className="mx-auto max-w-3xl px-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t("back", "Voltar")}
        </button>

        {/* Dica de edição (só dono) */}
        {isOwner && isActive && (
          <p className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            <HeartHandshake className="h-3.5 w-3.5" /> {t("editHint", "Sua vaquinha está no ar · edite tudo aqui")}
          </p>
        )}

        {/* Tipo da campanha (só dono): Vaquinha ⇄ Bolsa Patrocínio */}
        {isOwner && isActive && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{t("kindLabel", "Tipo")}</span>
            <button
              type="button"
              disabled={switchingKind}
              onClick={() => switchKind("vaquinha")}
              className={`inline-flex items-center gap-1.5 border-2 border-[#0B0B0D] px-3 py-1.5 text-[12px] font-bold transition disabled:opacity-60 ${!isBolsa ? "bg-[#F2B705] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]" : "bg-[#1D1810] text-[#F1EDE2]/70"}`}
            >
              <HeartHandshake className="h-3.5 w-3.5" /> {t("kindVaquinha", "Vaquinha")}
            </button>
            <button
              type="button"
              disabled={switchingKind}
              onClick={() => switchKind("bolsa")}
              className={`inline-flex items-center gap-1.5 border-2 border-[#0B0B0D] px-3 py-1.5 text-[12px] font-bold transition disabled:opacity-60 ${isBolsa ? "bg-[#F2B705] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]" : "bg-[#1D1810] text-[#F1EDE2]/70"}`}
            >
              <Award className="h-3.5 w-3.5" /> {t("kindBolsa", "Bolsa Patrocínio")}
            </button>
            {switchingKind && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <span className="basis-full text-[11px] text-muted-foreground">
              {isBolsa
                ? t("kindBolsaHint", "Bolsa: sem prazo — patrocinadores apoiam com um valor mensal recorrente.")
                : t("kindVaquinhaHint", "Vaquinha: doações únicas com meta e prazo.")}
            </span>
          </div>
        )}

        {/* Cabeçalho + status */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          {isOwner && isActive ? (
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              onBlur={saveTitle}
              maxLength={120}
              placeholder={t("titlePlaceholder", "Nome da sua campanha")}
              className="fl-display w-full flex-1 bg-transparent text-4xl leading-none text-foreground outline-none placeholder:text-muted-foreground/40 md:text-5xl"
            />
          ) : (
            <h1 className="fl-display text-4xl leading-none text-foreground md:text-5xl">{v.title}</h1>
          )}
          {isBolsa && (
            <span className="inline-flex items-center gap-1 border-2 border-[#0B0B0D] bg-[#F2B705] px-2 py-0.5 text-xs font-black uppercase tracking-wide text-[#0B0B0D]">
              <Award className="h-3.5 w-3.5" /> {t("kindBolsa", "Bolsa Patrocínio")}
            </span>
          )}
          {!isActive && (
            <span className="border-2 border-[#0B0B0D] bg-[#dc2626] px-2 py-0.5 text-xs font-black uppercase tracking-wide text-[#F1EDE2]">
              {t("ended", "Encerrada")}
            </span>
          )}
        </div>

        {isOwner && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {savingField && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> {t("saving", "Salvando…")}
              </span>
            )}
            {isActive && (
              <button
                type="button"
                onClick={closeCampaign}
                className="ml-auto inline-flex items-center gap-1.5 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-1.5 text-[12px] font-bold text-[#F1EDE2] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5"
              >
                <Square className="h-3.5 w-3.5" /> {t("close", "Encerrar")}
              </button>
            )}
          </div>
        )}

        {/* Painel do contador */}
        <section className="mt-5 border-2 border-[#0B0B0D] bg-[#F1EDE2] p-5 text-[#0B0B0D] shadow-[5px_5px_0_0_#0B0B0D]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0B0B0D]/60">{t("raised", "Arrecadado")}</p>
              <p className="fl-display text-4xl leading-none md:text-5xl">{money(v.raised_cents)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0B0B0D]/60">{t("goal", "Meta")}</p>
              {isOwner && isActive ? (
                <div className="flex items-center justify-end gap-1">
                  <span className="fl-display text-2xl leading-none text-[#0B0B0D]/70">R$</span>
                  <input
                    inputMode="numeric"
                    value={form.goalText}
                    onChange={(e) => setForm((f) => ({ ...f, goalText: e.target.value.replace(/[^\d]/g, "") }))}
                    onBlur={saveGoal}
                    placeholder="1000"
                    className="fl-display w-28 border-b-2 border-[#0B0B0D]/40 bg-transparent text-right text-2xl leading-none outline-none focus:border-[#0B0B0D]"
                  />
                </div>
              ) : (
                <p className="fl-display text-2xl leading-none">{money(v.goal_cents)}</p>
              )}
            </div>
          </div>

          {/* Editor de prazo (só dono; bolsa não tem prazo) */}
          {isOwner && isActive && !isBolsa && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-2 border-dashed border-[#0B0B0D]/30 p-2.5">
              <label className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#0B0B0D]/60">
                <Clock className="h-3.5 w-3.5" /> {t("deadlineLabel", "Prazo")}
              </label>
              <input
                type="date"
                min={minDeadline}
                max={maxDeadline}
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                onBlur={saveDeadline}
                className="border-2 border-[#0B0B0D] bg-white px-2 py-1 text-sm outline-none"
              />
              <span className="text-[11px] text-[#0B0B0D]/50">{t("deadlineHint", "Máx. 90 dias")}</span>
            </div>
          )}

          {/* Barra */}
          <div className="mt-4 h-4 w-full overflow-hidden border-2 border-[#0B0B0D] bg-[#0B0B0D]/10">
            <div className="h-full bg-[#16a34a] transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[12px] font-bold text-[#0B0B0D]/70">
            <span>{progress}% {t("ofGoal", "da meta")}</span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {v.donors_count} {isBolsa ? t("supporters", "apoiadores") : t("donors", "doadores")}
            </span>
            {isBolsa ? (
              <span className="inline-flex items-center gap-1">
                <Repeat className="h-3.5 w-3.5" /> {isActive ? `${money(monthlyTotal)}/${t("perMonthShort", "mês")} · ${t("noDeadline", "sem prazo")}` : t("finished", "finalizada")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {isActive ? `${daysLeft} ${t("daysLeft", "dias restantes")}` : t("finished", "finalizada")}
              </span>
            )}
          </div>

          {isActive ? (
            isBolsa ? (
              mySponsorship ? (
                <div className="mt-5 border-2 border-[#0B0B0D] bg-white p-3">
                  <p className="inline-flex items-center gap-2 text-sm font-bold text-[#0B0B0D]">
                    <Award className="h-4 w-4 text-[#16a34a]" />
                    {t("youSponsor", "Você patrocina esta bolsa")} · {money(mySponsorship.monthly_cents)}/{t("perMonthShort", "mês")}
                    {mySponsorship.status === "past_due" && (
                      <span className="border border-[#dc2626] px-1.5 py-0.5 text-[10px] font-black uppercase text-[#dc2626]">{t("pastDue", "Pagamento pendente")}</span>
                    )}
                  </p>
                  <button
                    type="button"
                    disabled={cancelingSponsor}
                    onClick={cancelMySponsorship}
                    className="mt-2 inline-flex items-center gap-1.5 border-2 border-[#0B0B0D] bg-white px-3 py-1.5 text-[12px] font-bold text-[#0B0B0D] transition hover:bg-[#0B0B0D]/5 disabled:opacity-60"
                  >
                    {cancelingSponsor ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />} {t("sponsorCancel", "Cancelar patrocínio")}
                  </button>
                </div>
              ) : !isOwner ? (
                <button
                  type="button"
                  onClick={() => { setAmount(2500); setSponsorOpen(true) }}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-3 text-sm font-black uppercase tracking-wide text-[#0B0B0D] shadow-[4px_4px_0_0_#0B0B0D] transition hover:-translate-y-0.5"
                >
                  <Repeat className="h-4 w-4" /> {t("sponsorCta", "Patrocinar mensalmente")}
                </button>
              ) : null
            ) : (
              <button
                type="button"
                onClick={() => { setAmount(2500); setDonateOpen(true) }}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-3 text-sm font-black uppercase tracking-wide text-[#0B0B0D] shadow-[4px_4px_0_0_#0B0B0D] transition hover:-translate-y-0.5"
              >
                <HeartHandshake className="h-4 w-4" /> {t("donate", "Doar")}
              </button>
            )
          ) : (
            <p className="mt-5 border-2 border-dashed border-[#0B0B0D]/30 py-3 text-center text-sm font-bold text-[#0B0B0D]/60">
              {isBolsa ? t("bolsaEndedHint", "Esta bolsa não está mais recebendo patrocínios.") : t("endedHint", "Esta vaquinha não está mais recebendo doações.")}
            </p>
          )}
        </section>

        {/* Bio */}
        {(v.bio || (isOwner && isActive)) && (
          <section className="mt-6">
            <h2 className="fl-display mb-2 inline-flex items-center gap-2 text-xl text-foreground">
              <Target className="h-4 w-4 text-primary" /> {t("about", "Sobre a campanha")}
            </h2>
            {isOwner && isActive ? (
              <textarea
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                onBlur={saveBio}
                maxLength={3000}
                rows={5}
                placeholder={t("bioPlaceholder", "Conte a história: para que serve a arrecadação, quem é ajudado, como o dinheiro será usado…")}
                className="w-full resize-y border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-2.5 text-sm leading-relaxed text-[#0B0B0D] outline-none placeholder:text-[#0B0B0D]/40 focus:shadow-[3px_3px_0_0_#0B0B0D]"
              />
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{v.bio}</p>
            )}
          </section>
        )}

        {/* Publicações da vaquinha (só aqui, não entram no feed) */}
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="fl-display text-xl text-foreground">{t("updates", "Publicações")}</h2>
            {isOwner && (
              <div className="flex gap-1.5">
                <ComposerBtn icon={Type} label={t("kindText", "Texto")} onClick={() => openComposer("text")} />
                <ComposerBtn icon={ImageIcon} label={t("kindPost", "Foto")} onClick={() => openComposer("post")} />
                <ComposerBtn icon={Hexagon} label={t("kindBee", "Bee")} onClick={() => openComposer("bee")} />
              </div>
            )}
          </div>

          {/* Composer inline */}
          {isOwner && composerKind && (
            <div className="mb-4 border-2 border-[#0B0B0D] bg-[#F1EDE2] p-4 text-[#0B0B0D] shadow-[4px_4px_0_0_#0B0B0D]">
              <p className="fl-display text-lg">
                {composerKind === "text" ? t("kindText", "Texto") : composerKind === "post" ? t("kindPost", "Foto") : t("kindBee", "Bee")}
              </p>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={3000}
                rows={3}
                placeholder={composerKind === "text" ? t("writePh", "Escreva uma atualização…") : t("captionPh", "Legenda (opcional)…")}
                className="mt-2 w-full resize-none border-2 border-[#0B0B0D] bg-white px-3 py-2 text-sm outline-none"
              />
              {composerKind !== "text" && (
                <div className="mt-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept={composerKind === "bee" ? "video/*" : "image/*"}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-2 border-2 border-dashed border-[#0B0B0D]/40 bg-white px-3 py-2 text-sm font-bold transition hover:border-[#0B0B0D]"
                  >
                    <Plus className="h-4 w-4" /> {file ? file.name.slice(0, 28) : composerKind === "bee" ? t("pickVideo", "Escolher vídeo") : t("pickPhoto", "Escolher foto")}
                  </button>
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setComposerKind(null)} disabled={posting} className="flex-1 border-2 border-[#0B0B0D] bg-white px-3 py-2 text-sm font-bold transition hover:bg-[#0B0B0D]/5 disabled:opacity-50">
                  {t("cancel", "Cancelar")}
                </button>
                <button type="button" onClick={submitPost} disabled={posting} className="flex-[2] inline-flex items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-2 text-sm font-black uppercase tracking-wide text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5 disabled:opacity-60">
                  {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {t("publish", "Publicar")}
                </button>
              </div>
            </div>
          )}

          {posts.length === 0 ? (
            <p className="border-2 border-dashed border-foreground/15 py-8 text-center text-sm text-muted-foreground">
              {t("noPosts", "Nenhuma publicação ainda.")}
            </p>
          ) : (
            <ul className="space-y-3">
              {posts.map((p) => (
                <li key={p.id_post} className="relative border-2 border-[#0B0B0D] bg-[#1D1810] p-3 text-[#F1EDE2]">
                  {isOwner && (
                    <button type="button" onClick={() => deletePost(p.id_post)} aria-label={t("delete", "Apagar")} className="absolute right-2 top-2 border border-[#F1EDE2]/20 bg-black/40 p-1 text-[#F1EDE2]/60 transition hover:text-red-300">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {p.kind !== "text" && p.media_url && (
                    p.media_type === "video" ? (
                      <video src={p.media_url} poster={p.thumbnail_url || undefined} controls className={`w-full ${p.kind === "bee" ? "aspect-[9/16]" : "aspect-[4/5]"} bg-black object-contain`} />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.media_url} alt={p.caption || ""} loading="lazy" className="w-full object-cover" />
                    )
                  )}
                  {p.caption && <p className="mt-2 whitespace-pre-wrap text-sm text-[#F1EDE2]/90">{p.caption}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Patrocinadores (bolsa) */}
        {isBolsa && (
          <section className="mt-8">
            <h2 className="fl-display mb-3 inline-flex items-center gap-2 text-xl text-foreground">
              <Award className="h-4 w-4 text-primary" /> {t("sponsorsTitle", "Patrocinadores")}
            </h2>
            {sponsors.length === 0 ? (
              <p className="border-2 border-dashed border-foreground/15 py-8 text-center text-sm text-muted-foreground">
                {t("noSponsors", "Seja o primeiro a patrocinar.")}
              </p>
            ) : (
              <ul className="space-y-2">
                {sponsors.map((s) => (
                  <li key={s.id_sponsorship} className="flex items-center justify-between gap-3 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#F1EDE2]">{s.sponsor_name}</p>
                      {s.since && (
                        <p className="mt-0.5 text-xs text-[#F1EDE2]/60">
                          {t("sponsorSince", "Apoia desde")} {new Date(s.since).toLocaleDateString(locale)}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 font-mono text-sm font-bold text-[#16a34a]">{money(s.monthly_cents)}/{t("perMonthShort", "mês")}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Doadores */}
        <section className="mt-8">
          <h2 className="fl-display mb-3 text-xl text-foreground">{isBolsa ? t("recentPayments", "Apoios recentes") : t("recentDonors", "Doações recentes")}</h2>
          {donors.length === 0 ? (
            <p className="border-2 border-dashed border-foreground/15 py-8 text-center text-sm text-muted-foreground">
              {t("noDonors", "Seja o primeiro a doar.")}
            </p>
          ) : (
            <ul className="space-y-2">
              {donors.map((d) => (
                <li key={d.id_donation} className="flex items-start justify-between gap-3 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#F1EDE2]">{d.donor_name}</p>
                    {d.message && <p className="mt-0.5 line-clamp-2 text-xs text-[#F1EDE2]/60">{d.message}</p>}
                  </div>
                  <span className="shrink-0 font-mono text-sm font-bold text-[#16a34a]">{money(d.amount_cents)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Modal de patrocínio mensal (bolsa) */}
      {sponsorOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={() => !submitting && setSponsorOpen(false)}>
          <div
            className="w-full max-w-md border-2 border-[#0B0B0D] bg-[#F1EDE2] p-5 text-[#0B0B0D] shadow-[6px_6px_0_0_#0B0B0D]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="fl-display text-2xl">{t("sponsorTo", "Patrocinar")} “{v.title}”</h3>
            <p className="mt-1 text-xs text-[#0B0B0D]/60">
              {t("sponsorMonthlyNote", "Cobrança recorrente todo mês. Cancele quando quiser.")} · {t("minLabel", "Mínimo")}: {money(minCents)}
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(p)}
                  className={`border-2 border-[#0B0B0D] px-2 py-2 text-sm font-bold transition ${amount === p ? "bg-[#F2B705]" : "bg-white hover:bg-[#F2B705]/20"}`}
                >
                  {money(p)}/{t("perMonthShort", "mês")}
                </button>
              ))}
            </div>

            <label className="mt-4 block text-[11px] font-bold uppercase tracking-wide text-[#0B0B0D]/60">{t("otherMonthlyAmount", "Outro valor mensal (R$)")}</label>
            <input
              type="number"
              min={minCents / 100}
              step="1"
              value={(amount / 100).toString()}
              onChange={(e) => setAmount(Math.round(Number(e.target.value) * 100) || 0)}
              className="mt-1 w-full border-2 border-[#0B0B0D] bg-white px-3 py-2 text-sm outline-none"
            />

            <label className="mt-3 block text-[11px] font-bold uppercase tracking-wide text-[#0B0B0D]/60">{t("yourName", "Seu nome (opcional)")}</label>
            <input
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              maxLength={80}
              placeholder={t("anon", "Anônimo")}
              className="mt-1 w-full border-2 border-[#0B0B0D] bg-white px-3 py-2 text-sm outline-none"
            />

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setSponsorOpen(false)}
                disabled={submitting}
                className="flex-1 border-2 border-[#0B0B0D] bg-white px-3 py-2.5 text-sm font-bold transition hover:bg-[#0B0B0D]/5 disabled:opacity-50"
              >
                {t("cancel", "Cancelar")}
              </button>
              <button
                type="button"
                onClick={submitSponsorship}
                disabled={submitting}
                className="flex-[2] inline-flex items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#16a34a] px-3 py-2.5 text-sm font-black uppercase tracking-wide text-white shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Repeat className="h-4 w-4" />}
                {t("continueToPay", "Ir para o pagamento")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de doação */}
      {donateOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={() => !submitting && setDonateOpen(false)}>
          <div
            className="w-full max-w-md border-2 border-[#0B0B0D] bg-[#F1EDE2] p-5 text-[#0B0B0D] shadow-[6px_6px_0_0_#0B0B0D]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="fl-display text-2xl">{t("donateTo", "Doar para")} “{v.title}”</h3>
            <p className="mt-1 text-xs text-[#0B0B0D]/60">{t("minLabel", "Mínimo")}: {money(minCents)}</p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(p)}
                  className={`border-2 border-[#0B0B0D] px-2 py-2 text-sm font-bold transition ${amount === p ? "bg-[#F2B705]" : "bg-white hover:bg-[#F2B705]/20"}`}
                >
                  {money(p)}
                </button>
              ))}
            </div>

            <label className="mt-4 block text-[11px] font-bold uppercase tracking-wide text-[#0B0B0D]/60">{t("otherAmount", "Outro valor (R$)")}</label>
            <input
              type="number"
              min={minCents / 100}
              step="1"
              value={(amount / 100).toString()}
              onChange={(e) => setAmount(Math.round(Number(e.target.value) * 100) || 0)}
              className="mt-1 w-full border-2 border-[#0B0B0D] bg-white px-3 py-2 text-sm outline-none"
            />

            <label className="mt-3 block text-[11px] font-bold uppercase tracking-wide text-[#0B0B0D]/60">{t("yourName", "Seu nome (opcional)")}</label>
            <input
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              maxLength={80}
              placeholder={t("anon", "Anônimo")}
              className="mt-1 w-full border-2 border-[#0B0B0D] bg-white px-3 py-2 text-sm outline-none"
            />

            <label className="mt-3 block text-[11px] font-bold uppercase tracking-wide text-[#0B0B0D]/60">{t("messageLabel", "Mensagem (opcional)")}</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={280}
              rows={2}
              className="mt-1 w-full resize-none border-2 border-[#0B0B0D] bg-white px-3 py-2 text-sm outline-none"
            />

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setDonateOpen(false)}
                disabled={submitting}
                className="flex-1 border-2 border-[#0B0B0D] bg-white px-3 py-2.5 text-sm font-bold transition hover:bg-[#0B0B0D]/5 disabled:opacity-50"
              >
                {t("cancel", "Cancelar")}
              </button>
              <button
                type="button"
                onClick={submitDonation}
                disabled={submitting}
                className="flex-[2] inline-flex items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#16a34a] px-3 py-2.5 text-sm font-black uppercase tracking-wide text-white shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartHandshake className="h-4 w-4" />}
                {t("continueToPay", "Ir para o pagamento")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function ComposerBtn({ icon: Icon, label, onClick }: { icon: typeof Type; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 border-2 border-[#0B0B0D] bg-[#F1EDE2] px-2 py-1 text-[11px] font-bold text-[#0B0B0D] shadow-[2px_2px_0_0_#0B0B0D] transition hover:-translate-y-0.5"
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  )
}
