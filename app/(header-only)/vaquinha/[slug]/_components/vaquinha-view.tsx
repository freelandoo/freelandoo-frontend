"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { HeartHandshake, Loader2, Users, Clock, Target, Square, ImageIcon, Clapperboard, Type, Trash2, Plus, UploadCloud, Repeat, Award, XCircle, CreditCard } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { PageBackLink } from "@/components/tabloide/PageBackLink"
import { TechBackdrop } from "@/components/platform/tech-backdrop"
import { BTN_GHOST, BTN_PRIMARY, INNER, INPUT, LABEL, MODAL, MONEY, MUTED, PANEL, TITLE } from "./vaquinha-ui"

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
      <VaquinhaShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#BE185D]" aria-hidden />
        </div>
      </VaquinhaShell>
    )
  }

  if (state === "error" || !v) {
    return (
      <VaquinhaShell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
          <HeartHandshake className="h-10 w-10 text-[#BE185D]" />
          <h1 className={`${TITLE} text-3xl`}>{t("notFound", "Vaquinha não encontrada")}</h1>
          <Link href="/" className="text-sm font-bold text-[#BE185D] underline">
            {t("backHome", "Voltar ao início")}
          </Link>
        </div>
      </VaquinhaShell>
    )
  }

  const kindLabel = isBolsa ? t("kindBolsa", "Bolsa Patrocínio") : t("kindVaquinha", "Vaquinha")

  // O painel do contador: na coluna da direita no computador (preso ao rolar),
  // primeiro na pilha no celular — é ele que responde "quanto falta?".
  const counter = (
    <section className={`${PANEL} p-5`}>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className={LABEL}>{t("raised", "Arrecadado")}</p>
          <p className={`${TITLE} text-4xl leading-none md:text-5xl`}>{money(v.raised_cents)}</p>
        </div>
        <div className="text-right">
          <p className={LABEL}>{t("goal", "Meta")}</p>
          {isOwner && isActive ? (
            <div className="flex items-center justify-end gap-1">
              <span className="fl-display text-2xl leading-none text-[#D99AB9]">R$</span>
              <input
                inputMode="numeric"
                value={form.goalText}
                onChange={(e) => setForm((f) => ({ ...f, goalText: e.target.value.replace(/[^\d]/g, "") }))}
                onBlur={saveGoal}
                placeholder="1000"
                className="fl-display w-24 border-b-2 border-[#5A1530] bg-transparent text-right text-2xl leading-none text-[#FFE4F1] outline-none focus:border-[#9D174D]"
              />
            </div>
          ) : (
            <p className="fl-display text-2xl leading-none text-[#FFE4F1]">{money(v.goal_cents)}</p>
          )}
        </div>
      </div>

      {/* Editor de prazo (só dono; bolsa não tem prazo) */}
      {isOwner && isActive && !isBolsa && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-2 border-dashed border-[#5A1530] p-2.5">
          <label className={`inline-flex items-center gap-1.5 ${LABEL}`}>
            <Clock className="h-3.5 w-3.5" /> {t("deadlineLabel", "Prazo")}
          </label>
          <input
            type="date"
            min={minDeadline}
            max={maxDeadline}
            value={form.deadline}
            onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
            onBlur={saveDeadline}
            className={`${INPUT} px-2 py-1 text-sm [color-scheme:dark]`}
          />
          <span className={`text-[11px] ${MUTED}`}>{t("deadlineHint", "Máx. 90 dias")}</span>
        </div>
      )}

      {/* Barra — o preenchimento brilha como a luz do fundo. */}
      <div className="mt-4 h-3 w-full overflow-hidden border-2 border-[#5A1530] bg-[rgba(255,228,241,0.06)]">
        <div
          className="h-full transition-all"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #500724, #9D174D)",
            boxShadow: "0 0 14px rgba(157, 23, 77, 0.7)",
          }}
        />
      </div>
      <div className={`mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[12px] font-bold ${MUTED}`}>
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
            <div className={`${INNER} mt-5 p-3`}>
              <p className="inline-flex flex-wrap items-center gap-2 text-sm font-bold text-[#FFE4F1]">
                <Award className="h-4 w-4 text-[#BE185D]" />
                {t("youSponsor", "Você patrocina esta bolsa")} · {money(mySponsorship.monthly_cents)}/{t("perMonthShort", "mês")}
                {mySponsorship.status === "past_due" && (
                  <span className="border border-[#f87171] px-1.5 py-0.5 text-[10px] font-black uppercase text-[#f87171]">{t("pastDue", "Pagamento pendente")}</span>
                )}
              </p>
              <button
                type="button"
                disabled={cancelingSponsor}
                onClick={cancelMySponsorship}
                className={`${BTN_GHOST} mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold`}
              >
                {cancelingSponsor ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />} {t("sponsorCancel", "Cancelar patrocínio")}
              </button>
            </div>
          ) : !isOwner ? (
            <button
              type="button"
              onClick={() => { setAmount(2500); setSponsorOpen(true) }}
              className={`${BTN_PRIMARY} mt-5 inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-black uppercase tracking-wide`}
            >
              <Repeat className="h-4 w-4" /> {t("sponsorCta", "Patrocinar mensalmente")}
              <span className="inline-flex items-center gap-1 border border-[#FFE4F1]/40 px-1.5 py-0.5 text-[10px]"><CreditCard className="h-3 w-3" /> {t("sponsorCardChip", "Cartão")}</span>
            </button>
          ) : null
        ) : (
          <button
            type="button"
            onClick={() => { setAmount(2500); setDonateOpen(true) }}
            className={`${BTN_PRIMARY} mt-5 inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-black uppercase tracking-wide`}
          >
            <HeartHandshake className="h-4 w-4" /> {t("donate", "Doar")}
          </button>
        )
      ) : (
        <p className={`mt-5 border-2 border-dashed border-[#5A1530] py-3 text-center text-sm font-bold ${MUTED}`}>
          {isBolsa ? t("bolsaEndedHint", "Esta bolsa não está mais recebendo patrocínios.") : t("endedHint", "Esta vaquinha não está mais recebendo doações.")}
        </p>
      )}
    </section>
  )

  return (
    <VaquinhaShell>
      {/* Top bar — a saída e, para o dono, o aviso de que a página é o editor. */}
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-3 pt-6 md:px-10">
        <PageBackLink href={isOwner ? "/wallet/carteira" : "/feed"} />
        {isOwner && isActive && (
          <span className="inline-flex items-center gap-2 border-2 border-[#5A1530] bg-[rgba(48,9,26,0.78)] px-3 py-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#BE185D]" />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#FFE4F1]">
              {t("editHint", "Sua vaquinha está no ar · edite tudo aqui")}
            </span>
          </span>
        )}
      </div>

      {/* HEADCARD — o banner de games: capa (ou a grade desenhada), chip do
          tipo num canto, o percentual no outro e o título no pé. */}
      <header className="relative mx-auto mt-4 max-w-5xl px-0 md:px-10">
        <div
          className="relative overflow-hidden border-2 border-[#5A1530]"
          style={{ boxShadow: "0 0 30px rgba(157, 23, 77, 0.22), 8px 8px 0 0 rgba(90, 21, 48, 0.9)" }}
        >
          <div className="relative h-48 bg-[#1E0712] md:h-64">
            {v.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={v.cover_url} alt={v.title} className="h-full w-full object-cover" />
            ) : (
              <>
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    backgroundImage: [
                      "radial-gradient(70% 120% at 18% 0%, rgba(131, 24, 67, 0.45), transparent 65%)",
                      "radial-gradient(60% 120% at 88% 10%, rgba(157, 23, 77, 0.22), transparent 68%)",
                      "repeating-linear-gradient(to right, rgba(190, 24, 93, 0.10) 0 1px, transparent 1px 40px)",
                      "repeating-linear-gradient(to bottom, rgba(190, 24, 93, 0.07) 0 1px, transparent 1px 40px)",
                    ].join(","),
                  }}
                />
                <HeartHandshake
                  aria-hidden
                  className="pointer-events-none absolute -right-6 -top-6 h-64 w-64 select-none md:h-80 md:w-80"
                  strokeWidth={1}
                  style={{ color: "rgba(190, 24, 93, 0.12)" }}
                />
              </>
            )}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: "linear-gradient(180deg, transparent 35%, rgba(15, 3, 10, 0.92) 100%)" }}
            />
            <span className="absolute left-4 top-4 z-20 inline-flex items-center gap-1.5 border-2 border-[#BE185D] bg-[#831843] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#FFE4F1]">
              {isBolsa ? <Award className="h-3.5 w-3.5" /> : <HeartHandshake className="h-3.5 w-3.5" />} {kindLabel}
            </span>
            <span className="absolute right-4 top-4 z-20 flex h-14 min-w-14 flex-col items-center justify-center border-2 border-[#5A1530] bg-[rgba(20,5,12,0.85)] px-2">
              <span className="fl-display text-xl leading-none text-[#BE185D]">{progress}%</span>
              <span className="text-[8px] font-bold uppercase text-[#D99AB9]">{t("ofGoal", "da meta")}</span>
            </span>
            {!isActive && (
              <span className="absolute left-4 top-14 z-20 border-2 border-[#0B0B0D] bg-[#dc2626] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#FFE4F1]">
                {t("ended", "Encerrada")}
              </span>
            )}
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
                  className={`${BTN_GHOST} absolute bottom-3 right-3 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold`}
                >
                  {uploadingCover ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{v.cover_url ? t("changeCover", "Trocar capa") : t("addCover", "Adicionar capa")}</span>
                </button>
              </>
            )}
            {/* O título vive no PÉ do banner, como a sala nos headcards de games. */}
            <div className="absolute inset-x-4 bottom-3 z-10 pr-14 sm:pr-40">
              {isOwner && isActive ? (
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  onBlur={saveTitle}
                  maxLength={120}
                  placeholder={t("titlePlaceholder", "Nome da sua campanha")}
                  className={`${TITLE} w-full bg-transparent text-3xl leading-none outline-none placeholder:text-[#FFE4F1]/35 md:text-5xl`}
                />
              ) : (
                <h1 className={`${TITLE} text-3xl leading-none md:text-5xl`}>{v.title}</h1>
              )}
            </div>
          </div>
        </div>

        {/* Linha de controles do dono: tipo da campanha, salvando e encerrar. */}
        {isOwner && (
          <div className="mt-4 flex flex-wrap items-center gap-2 px-3 md:px-0">
            {isActive && (
              <>
                <span className={LABEL}>{t("kindLabel", "Tipo")}</span>
                <button
                  type="button"
                  disabled={switchingKind}
                  onClick={() => switchKind("vaquinha")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold ${!isBolsa ? BTN_PRIMARY : BTN_GHOST}`}
                >
                  <HeartHandshake className="h-3.5 w-3.5" /> {t("kindVaquinha", "Vaquinha")}
                </button>
                <button
                  type="button"
                  disabled={switchingKind}
                  onClick={() => switchKind("bolsa")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold ${isBolsa ? BTN_PRIMARY : BTN_GHOST}`}
                >
                  <Award className="h-3.5 w-3.5" /> {t("kindBolsa", "Bolsa Patrocínio")}
                </button>
                {switchingKind && <Loader2 className="h-4 w-4 animate-spin text-[#BE185D]" />}
              </>
            )}
            {savingField && (
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${MUTED}`}>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#BE185D]" /> {t("saving", "Salvando…")}
              </span>
            )}
            {isActive && (
              <button
                type="button"
                onClick={closeCampaign}
                className={`${BTN_GHOST} ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold`}
              >
                <Square className="h-3.5 w-3.5" /> {t("close", "Encerrar")}
              </button>
            )}
            {isActive && (
              <span className={`basis-full text-[11px] ${MUTED}`}>
                {isBolsa
                  ? t("kindBolsaHint", "Bolsa: sem prazo — patrocinadores apoiam com um valor mensal recorrente.")
                  : t("kindVaquinhaHint", "Vaquinha: doações únicas com meta e prazo.")}
              </span>
            )}
          </div>
        )}
      </header>

      {/* Duas colunas no computador: a história e as publicações à esquerda, o
          contador e quem apoia à direita (o contador fica preso ao rolar). No
          celular o `aside` vem primeiro no DOM, então o contador abre a página. */}
      <div className="mx-auto mt-6 grid max-w-5xl gap-6 px-3 md:grid-cols-[minmax(0,1fr)_340px] md:px-10">
        <aside className="space-y-6 md:sticky md:top-6 md:order-2 md:self-start">
          {counter}

          {/* Patrocinadores (bolsa) */}
          {isBolsa && (
            <section>
              <h2 className={`${TITLE} mb-3 inline-flex items-center gap-2 text-xl`}>
                <Award className="h-4 w-4 text-[#BE185D]" /> {t("sponsorsTitle", "Patrocinadores")}
              </h2>
              {sponsors.length === 0 ? (
                <p className={`border-2 border-dashed border-[#5A1530] py-6 text-center text-sm ${MUTED}`}>
                  {t("noSponsors", "Seja o primeiro a patrocinar.")}
                </p>
              ) : (
                <ul className="space-y-2">
                  {sponsors.map((s) => (
                    <li key={s.id_sponsorship} className={`${INNER} flex items-center justify-between gap-3 px-3 py-2.5`}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#FFE4F1]">{s.sponsor_name}</p>
                        {s.since && (
                          <p className={`mt-0.5 text-xs ${MUTED}`}>
                            {t("sponsorSince", "Apoia desde")} {new Date(s.since).toLocaleDateString(locale)}
                          </p>
                        )}
                      </div>
                      <span className={`shrink-0 ${MONEY}`}>{money(s.monthly_cents)}/{t("perMonthShort", "mês")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Doadores */}
          <section>
            <h2 className={`${TITLE} mb-3 text-xl`}>{isBolsa ? t("recentPayments", "Apoios recentes") : t("recentDonors", "Doações recentes")}</h2>
            {donors.length === 0 ? (
              <p className={`border-2 border-dashed border-[#5A1530] py-6 text-center text-sm ${MUTED}`}>
                {t("noDonors", "Seja o primeiro a doar.")}
              </p>
            ) : (
              <ul className="space-y-2">
                {donors.map((d) => (
                  <li key={d.id_donation} className={`${INNER} flex items-start justify-between gap-3 px-3 py-2.5`}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#FFE4F1]">{d.donor_name}</p>
                      {d.message && <p className={`mt-0.5 line-clamp-2 text-xs ${MUTED}`}>{d.message}</p>}
                    </div>
                    <span className={`shrink-0 ${MONEY}`}>{money(d.amount_cents)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>

        <div className="min-w-0 space-y-8 md:order-1">
          {/* Bio */}
          {(v.bio || (isOwner && isActive)) && (
            <section>
              <h2 className={`${TITLE} mb-3 inline-flex items-center gap-2 text-xl`}>
                <Target className="h-4 w-4 text-[#BE185D]" /> {t("about", "Sobre a campanha")}
              </h2>
              {isOwner && isActive ? (
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  onBlur={saveBio}
                  maxLength={3000}
                  rows={6}
                  placeholder={t("bioPlaceholder", "Conte a história: para que serve a arrecadação, quem é ajudado, como o dinheiro será usado…")}
                  className={`${INPUT} w-full resize-y px-3 py-2.5 text-sm leading-relaxed`}
                />
              ) : (
                <div className={`${PANEL} p-4`}>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#FFE4F1]/85">{v.bio}</p>
                </div>
              )}
            </section>
          )}

          {/* Publicações da vaquinha (só aqui, não entram no feed) */}
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className={`${TITLE} text-xl`}>{t("updates", "Publicações")}</h2>
              {isOwner && (
                <div className="flex gap-1.5">
                  <ComposerBtn icon={Type} label={t("kindText", "Recado")} onClick={() => openComposer("text")} />
                  <ComposerBtn icon={ImageIcon} label={t("kindPost", "Foto")} onClick={() => openComposer("post")} />
                  <ComposerBtn icon={Clapperboard} label={t("kindCurto", "Curto")} onClick={() => openComposer("bee")} />
                </div>
              )}
            </div>

            {/* Composer inline */}
            {isOwner && composerKind && (
              <div className={`${PANEL} mb-4 p-4`}>
                <p className={`${TITLE} text-lg`}>
                  {composerKind === "text" ? t("kindText", "Recado") : composerKind === "post" ? t("kindPost", "Foto") : t("kindCurto", "Curto")}
                </p>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={3000}
                  rows={3}
                  placeholder={composerKind === "text" ? t("writePh", "Escreva uma atualização…") : t("captionPh", "Legenda (opcional)…")}
                  className={`${INPUT} mt-2 w-full resize-none px-3 py-2 text-sm`}
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
                      className="inline-flex items-center gap-2 border-2 border-dashed border-[#5A1530] bg-[rgba(20,5,12,0.6)] px-3 py-2 text-sm font-bold text-[#FFE4F1] transition hover:border-[#BE185D]"
                    >
                      <Plus className="h-4 w-4" /> {file ? file.name.slice(0, 28) : composerKind === "bee" ? t("pickVideo", "Escolher vídeo") : t("pickPhoto", "Escolher foto")}
                    </button>
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setComposerKind(null)} disabled={posting} className={`${BTN_GHOST} flex-1 px-3 py-2 text-sm font-bold`}>
                    {t("cancel", "Cancelar")}
                  </button>
                  <button type="button" onClick={submitPost} disabled={posting} className={`${BTN_PRIMARY} flex-[2] inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-black uppercase tracking-wide`}>
                    {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {t("publish", "Publicar")}
                  </button>
                </div>
              </div>
            )}

            {posts.length === 0 ? (
              <p className={`border-2 border-dashed border-[#5A1530] py-8 text-center text-sm ${MUTED}`}>
                {t("noPosts", "Nenhuma publicação ainda.")}
              </p>
            ) : (
              <ul className="space-y-3">
                {posts.map((p) => (
                  <li key={p.id_post} className={`${PANEL} relative p-3`}>
                    {isOwner && (
                      <button type="button" onClick={() => deletePost(p.id_post)} aria-label={t("delete", "Apagar")} className="absolute right-2 top-2 z-10 border border-[#5A1530] bg-black/50 p-1 text-[#FFE4F1]/70 transition hover:text-red-300">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {p.kind !== "text" && p.media_url && (
                      /* Post aceita 4:5, 1:1 e 16:9 — a moldura não pode ser fixa.
                         O Curto (bee) continua vertical; o post deitado se
                         ajusta sozinho pela altura natural da mídia. */
                      p.media_type === "video" ? (
                        <video
                          src={p.media_url}
                          poster={p.thumbnail_url || undefined}
                          controls
                          className={`w-full bg-black object-contain ${p.kind === "bee" ? "aspect-[9/16]" : "max-h-[70vh]"}`}
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.media_url}
                          alt={p.caption || ""}
                          loading="lazy"
                          className="max-h-[70vh] w-full bg-black object-contain"
                        />
                      )
                    )}
                    {p.caption && <p className="mt-2 whitespace-pre-wrap text-sm text-[#FFE4F1]/90">{p.caption}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* Modal de patrocínio mensal (bolsa) */}
      {sponsorOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4" onClick={() => !submitting && setSponsorOpen(false)}>
          <div className={`${MODAL} w-full max-w-md p-5`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`${TITLE} text-2xl`}>{t("sponsorTo", "Patrocinar")} “{v.title}”</h3>
            <p className={`mt-1 text-xs ${MUTED}`}>
              {t("sponsorMonthlyNote", "Cobrança recorrente todo mês. Cancele quando quiser.")} · {t("minLabel", "Mínimo")}: {money(minCents)}
            </p>
            {/* O patrocínio é uma ASSINATURA no cartão (preapproval do gateway):
                Pix não se repete sozinho, então dizer o meio antes do clique
                evita a pessoa chegar no checkout procurando o Pix. */}
            <div className={`${INNER} mt-3 flex items-start gap-2 p-2.5 text-xs font-semibold text-[#FFE4F1]`}>
              <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-[#BE185D]" />
              <span>{t("sponsorCardNote", "Pagamento recorrente no cartão de crédito: o valor é cobrado automaticamente todo mês, até você cancelar.")}</span>
            </div>

            <AmountPresets amount={amount} onPick={setAmount} format={(p) => `${money(p)}/${t("perMonthShort", "mês")}`} />

            <label className={`mt-4 block ${LABEL}`}>{t("otherMonthlyAmount", "Outro valor mensal (R$)")}</label>
            <input
              type="number"
              min={minCents / 100}
              step="1"
              value={(amount / 100).toString()}
              onChange={(e) => setAmount(Math.round(Number(e.target.value) * 100) || 0)}
              className={`${INPUT} mt-1 w-full px-3 py-2 text-sm`}
            />

            <label className={`mt-3 block ${LABEL}`}>{t("yourName", "Seu nome (opcional)")}</label>
            <input
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              maxLength={80}
              placeholder={t("anon", "Anônimo")}
              className={`${INPUT} mt-1 w-full px-3 py-2 text-sm`}
            />

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setSponsorOpen(false)} disabled={submitting} className={`${BTN_GHOST} flex-1 px-3 py-2.5 text-sm font-bold`}>
                {t("cancel", "Cancelar")}
              </button>
              <button
                type="button"
                onClick={submitSponsorship}
                disabled={submitting}
                className={`${BTN_PRIMARY} flex-[2] inline-flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-black uppercase tracking-wide`}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {t("sponsorPayCard", "Assinar no cartão")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de doação */}
      {donateOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4" onClick={() => !submitting && setDonateOpen(false)}>
          <div className={`${MODAL} w-full max-w-md p-5`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`${TITLE} text-2xl`}>{t("donateTo", "Doar para")} “{v.title}”</h3>
            <p className={`mt-1 text-xs ${MUTED}`}>{t("minLabel", "Mínimo")}: {money(minCents)}</p>

            <AmountPresets amount={amount} onPick={setAmount} format={money} />

            <label className={`mt-4 block ${LABEL}`}>{t("otherAmount", "Outro valor (R$)")}</label>
            <input
              type="number"
              min={minCents / 100}
              step="1"
              value={(amount / 100).toString()}
              onChange={(e) => setAmount(Math.round(Number(e.target.value) * 100) || 0)}
              className={`${INPUT} mt-1 w-full px-3 py-2 text-sm`}
            />

            <label className={`mt-3 block ${LABEL}`}>{t("yourName", "Seu nome (opcional)")}</label>
            <input
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              maxLength={80}
              placeholder={t("anon", "Anônimo")}
              className={`${INPUT} mt-1 w-full px-3 py-2 text-sm`}
            />

            <label className={`mt-3 block ${LABEL}`}>{t("messageLabel", "Mensagem (opcional)")}</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={280}
              rows={2}
              className={`${INPUT} mt-1 w-full resize-none px-3 py-2 text-sm`}
            />

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setDonateOpen(false)} disabled={submitting} className={`${BTN_GHOST} flex-1 px-3 py-2.5 text-sm font-bold`}>
                {t("cancel", "Cancelar")}
              </button>
              <button
                type="button"
                onClick={submitDonation}
                disabled={submitting}
                className={`${BTN_PRIMARY} flex-[2] inline-flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-black uppercase tracking-wide`}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartHandshake className="h-4 w-4" />}
                {t("continueToPay", "Ir para o pagamento")}
              </button>
            </div>
          </div>
        </div>
      )}
    </VaquinhaShell>
  )
}

/**
 * A casca da página: canvas quase preto, o fundo `.fl-vaquinha-bg` (a grade de
 * games em rosa escuro) e cantos retos. O fundo é o PRIMEIRO filho e sem
 * z-index; o conteúdo entra com `relative z-10` por cima da camada `fixed`.
 */
function VaquinhaShell({ children }: { children: ReactNode }) {
  return (
    <main className="fl-root fl-sharp relative min-h-[100dvh] overflow-x-clip bg-[#0F030A] pb-24 text-[#FFE4F1]">
      <TechBackdrop variant="vaquinha" />
      <div className="relative z-10">{children}</div>
    </main>
  )
}

/** Os valores prontos, iguais nos dois modais (doação e patrocínio). */
function AmountPresets({ amount, onPick, format }: { amount: number; onPick: (v: number) => void; format: (cents: number) => string }) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      {PRESETS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPick(p)}
          className={`px-2 py-2 text-sm font-bold ${amount === p ? BTN_PRIMARY : BTN_GHOST}`}
        >
          {format(p)}
        </button>
      ))}
    </div>
  )
}

function ComposerBtn({ icon: Icon, label, onClick }: { icon: typeof Type; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`${BTN_GHOST} inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  )
}
