"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useTaxonomy } from "@/lib/i18n/taxonomy"
import {
  ArrowLeft,
  Plus,
  Copy,
  Trash2,
  Check,
  AlertCircle,
  MessageSquare,
  Gamepad2,
  KeyRound,
  ShieldCheck,
  Users,
} from "lucide-react"
import { DressIcon, PARENTAL, ParentalBackdrop, PixelHeart } from "./_components/parental-art"

type InviteStatus = "active" | "used" | "revoked" | "expired"
type SupervisedStatus = "active" | "suspended" | "revoked"

interface Invite {
  id_invite: string
  code: string
  status: InviteStatus
  expires_at: string
  used_at: string | null
  revoked_at: string | null
  created_at: string
}

interface Permissions {
  can_view_feed: boolean
  can_post_feed: boolean
  can_use_bees: boolean
  can_watch_courses: boolean
  can_sell_courses: boolean
  can_message: boolean
  can_receive_messages: boolean
  can_use_global_chat: boolean
  can_use_machine_chat: boolean
  can_request_service: boolean
  can_show_in_showcase: boolean
  can_show_in_ranking: boolean
  can_have_mural: boolean
}

interface MinorMachineAccess {
  id_machine: number
  machine_name: string
  machine_slug: string
  allowed: boolean
}

interface Minor {
  id_supervised: string
  minor_user_id: string
  minor_username: string | null
  minor_nome: string
  minor_email: string
  minor_avatar: string | null
  minor_birthdate: string | null
  status: SupervisedStatus
  relationship: string | null
  created_at: string
  permissions: Permissions | null
  machines: MinorMachineAccess[]
}

interface Machine {
  id_machine: number
  name: string
  slug: string
  color_ring?: string
}

const PERMISSION_GROUPS: Array<{
  titleKey: string
  title: string
  descKey: string
  description: string
  hard?: boolean
  items: Array<{
    key: keyof Permissions
    labelKey: string
    label: string
    hintKey?: string
    hint?: string
  }>
}> = [
  {
    titleKey: "permGroupContent",
    title: "Conteúdo",
    descKey: "permGroupContentDesc",
    description: "O que o menor pode ver e publicar",
    items: [
      { key: "can_view_feed", labelKey: "permViewFeed", label: "Ver o feed" },
      { key: "can_post_feed", labelKey: "permPostFeed", label: "Postar no feed" },
      { key: "can_use_bees", labelKey: "permUseBees", label: "Usar Bees" },
      { key: "can_watch_courses", labelKey: "permWatchCourses", label: "Assistir cursos" },
      { key: "can_sell_courses", labelKey: "permSellCourses", label: "Vender cursos", hintKey: "permSellCoursesHint", hint: "Publicação exige aprovação" },
    ],
  },
  {
    titleKey: "permGroupConversations",
    title: "Conversas",
    descKey: "permGroupConversationsDesc",
    description: "Mensagens e chats coletivos",
    items: [
      { key: "can_message", labelKey: "permSendMessages", label: "Enviar mensagens" },
      { key: "can_receive_messages", labelKey: "permReceiveMessages", label: "Receber mensagens" },
      { key: "can_use_global_chat", labelKey: "permGlobalChat", label: "Chat global" },
      { key: "can_use_machine_chat", labelKey: "permSwarmChat", label: "Chat de enxames" },
    ],
  },
  {
    titleKey: "permGroupHardBlocks",
    title: "Bloqueios duros (não desligáveis)",
    descKey: "permGroupHardBlocksDesc",
    description: "Mantidos sempre desligados para contas supervisionadas",
    hard: true,
    items: [
      { key: "can_request_service", labelKey: "permRequestService", label: "Pedir serviço" },
      { key: "can_show_in_showcase", labelKey: "permShowInShowcase", label: "Aparecer na vitrine" },
      { key: "can_show_in_ranking", labelKey: "permShowInRanking", label: "Aparecer no ranking" },
      { key: "can_have_mural", labelKey: "permPublicMural", label: "Mural público" },
    ],
  },
]

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

function authHeaders(): HeadersInit {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function ParentalPage() {
  const t = useTranslations("Account")
  const tx = useTaxonomy()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invites, setInvites] = useState<Invite[]>([])
  const [minors, setMinors] = useState<Minor[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [generating, setGenerating] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [expandedMinorId, setExpandedMinorId] = useState<string | null>(null)
  const [savingMinorId, setSavingMinorId] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [invitesRes, minorsRes, machinesRes] = await Promise.all([
        fetch("/api/supervision/codes", { headers: authHeaders(), cache: "no-store" }),
        fetch("/api/supervision/minors", { headers: authHeaders(), cache: "no-store" }),
        fetch("/api/enxames", { cache: "no-store" }),
      ])

      if (invitesRes.status === 401 || minorsRes.status === 401) {
        router.push("/login")
        return
      }
      const invitesData = await invitesRes.json()
      const minorsData = await minorsRes.json()
      const machinesData = await machinesRes.json()

      if (!invitesRes.ok) throw new Error(invitesData?.error || t("loadCodesError", "Falha ao listar códigos"))
      if (!minorsRes.ok) throw new Error(minorsData?.error || t("loadMinorsError", "Falha ao listar menores"))

      setInvites(invitesData.invites || [])
      setMinors(minorsData.minors || [])
      setMachines(
        Array.isArray(machinesData)
          ? machinesData
          : machinesData.enxames || machinesData.machines || []
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unexpectedError", "Erro inesperado"))
    } finally {
      setLoading(false)
    }
  }, [router, t])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const activeInvites = useMemo(
    () => invites.filter((i) => i.status === "active" && new Date(i.expires_at) > new Date()),
    [invites]
  )

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch("/api/supervision/codes", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || t("generateCodeError", "Falha ao gerar código"))
        return
      }
      setInvites((prev) => [data.invite, ...prev])
    } finally {
      setGenerating(false)
    }
  }

  const handleRevoke = async (id_invite: string) => {
    if (!confirm(t("revokeCodeConfirm", "Revogar este código? Quem tiver com ele em mãos não conseguirá mais usar."))) return
    const res = await fetch(`/api/supervision/codes/${id_invite}`, {
      method: "DELETE",
      headers: authHeaders(),
    })
    if (res.ok) {
      setInvites((prev) => prev.filter((i) => i.id_invite !== id_invite))
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data?.error || t("revokeFailed", "Falha ao revogar"))
    }
  }

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 1500)
  }

  const togglePermission = async (minor: Minor, key: keyof Permissions) => {
    if (!minor.permissions) return
    // Bloqueios duros: não permitem ativação (servidor também ignora).
    const hardBlocked = ["can_request_service", "can_show_in_showcase", "can_show_in_ranking", "can_have_mural"]
    if (hardBlocked.includes(key)) return

    const nextValue = !minor.permissions[key]
    setSavingMinorId(minor.minor_user_id)
    try {
      const res = await fetch(`/api/supervision/minors/${minor.minor_user_id}/permissions`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: nextValue }),
      })
      const data = await res.json()
      if (res.ok && data.permissions) {
        setMinors((prev) =>
          prev.map((m) =>
            m.minor_user_id === minor.minor_user_id ? { ...m, permissions: data.permissions } : m
          )
        )
      }
    } finally {
      setSavingMinorId(null)
    }
  }

  const toggleMachine = async (minor: Minor, machine: Machine, allowed: boolean) => {
    setSavingMinorId(minor.minor_user_id)
    try {
      const res = await fetch(
        `/api/supervision/minors/${minor.minor_user_id}/machines/${machine.id_machine}`,
        {
          method: "PUT",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ allowed }),
        }
      )
      if (res.ok) {
        setMinors((prev) =>
          prev.map((m) => {
            if (m.minor_user_id !== minor.minor_user_id) return m
            const others = m.machines.filter((x) => x.id_machine !== machine.id_machine)
            return {
              ...m,
              machines: [
                ...others,
                {
                  id_machine: machine.id_machine,
                  machine_name: machine.name,
                  machine_slug: machine.slug,
                  allowed,
                },
              ],
            }
          })
        )
      }
    } finally {
      setSavingMinorId(null)
    }
  }

  const setStatus = async (minor: Minor, status: SupervisedStatus) => {
    const label =
      status === "suspended"
        ? t("suspendLinkConfirm", "Suspender este vínculo? O menor mantém a conta, mas perde acesso supervisionado.")
        : status === "revoked"
          ? t("revokeLinkConfirm", "Revogar este vínculo? A conta do menor ficará sem responsável.")
          : null
    if (label && !confirm(label)) return

    setSavingMinorId(minor.minor_user_id)
    try {
      const res = await fetch(`/api/supervision/minors/${minor.minor_user_id}/status`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setMinors((prev) =>
          prev.map((m) => (m.minor_user_id === minor.minor_user_id ? { ...m, status } : m))
        )
      }
    } finally {
      setSavingMinorId(null)
    }
  }

  const P = PARENTAL
  const panelStyle = { boxShadow: `0 0 34px rgba(255, 150, 0, 0.16), 8px 8px 0 0 rgba(3, 26, 28, 0.95)` }
  const stickerShadow = { filter: `drop-shadow(3px 3px 0 ${P.ink})` }
  const btnPrimary =
    "inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#FFB300] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5 hover:bg-[#FFD166] disabled:opacity-60"
  const btnGhost =
    "inline-flex items-center gap-1.5 border border-[#3FE0C5]/25 bg-[#062224]/70 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#FFF6E0] transition hover:border-[#FFB300] disabled:opacity-50"
  const checkboxSkin =
    "border-[#FFB300] data-[state=checked]:bg-[#FFB300] data-[state=checked]:text-[#0B0B0D]"

  return (
    // ⚠️ A casca é PRÓPRIA (não o PageShell): o fundo amarelo-laranja é a pele
    // desta página, e o papel creme do kit o cobriria. `md:pl-[80px]` é a calha
    // da ProfileSidebar que o `rail` do PageShell reservava.
    <div className="fl-root fl-sharp relative min-h-[100dvh] overflow-x-clip pb-24 font-sans text-[#FFF6E0] md:pl-[80px]">
      <ParentalBackdrop />

      <div className="relative z-10">
        {/* Top bar — a saída à esquerda, como no Games. */}
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-3 pt-6 md:px-4">
          <button
            type="button"
            onClick={() => router.push("/account")}
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#FFB300]/80 transition hover:text-[#FFB300]"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("back", "Voltar")}
          </button>
          <span className="inline-flex items-center gap-2 border border-[#FFB300]/40 bg-[#062224]/80 px-3 py-1.5 text-[#FFF6E0]">
            <PixelHeart className="h-3.5 w-4" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">
              {t("parentalLinkedCount", "{n} vinculados").replace("{n}", String(minors.length))}
            </span>
          </span>
        </div>

        {/* HEADCARD — a silhueta do Games: banner largo, chip num canto, selo no outro, título gigante. */}
        <header className="relative mx-auto mt-4 max-w-3xl px-0 md:px-4">
          <div
            className="relative overflow-hidden border border-[#FFB300]/35"
            style={{
              boxShadow: `0 0 40px rgba(255, 150, 0, 0.25), 8px 8px 0 0 rgba(3, 26, 28, 0.95)`,
              background: `radial-gradient(70% 90% at 12% 0%, rgba(255, 170, 0, 0.42), transparent 65%), radial-gradient(60% 80% at 100% 100%, rgba(63, 224, 197, 0.22), transparent 70%), linear-gradient(135deg, ${P.teal} 0%, ${P.tealDeep} 55%, ${P.tealLine} 100%)`,
            }}
          >
            <div
              aria-hidden
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `linear-gradient(${P.sun}1f 1px, transparent 1px), linear-gradient(90deg, ${P.sun}1f 1px, transparent 1px)`,
                backgroundSize: "22px 22px",
              }}
            />
            <div className="relative flex min-h-[220px] flex-col justify-between gap-6 p-4 md:min-h-[250px] md:p-6">
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex -rotate-2 items-center gap-2 bg-[#FFB300] px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#0B0B0D] shadow-[0_0_18px_rgba(255,170,0,0.55)]">
                  <Gamepad2 className="h-4 w-4" />
                  {t("parentalEyebrow", "Supervisão")}
                </span>
                <span className="grid h-14 w-14 place-items-center border border-[#FFB300]/40 bg-[#062224]/80 shadow-[0_0_18px_rgba(255,79,154,0.35)]">
                  <ShieldCheck className="h-7 w-7 text-[#FF4F9A]" />
                </span>
              </div>

              {/* As figurinhas do banner: vestidinho, controle e vestidinho. */}
              <div aria-hidden className="pointer-events-none absolute bottom-3 right-3 flex items-end gap-1 opacity-90 md:right-8 md:gap-2">
                <DressIcon className="h-14 w-14 -rotate-6 md:h-24 md:w-24" style={stickerShadow} />
                <Gamepad2 className="h-10 w-10 rotate-12 text-[#FFB300] md:h-16 md:w-16" strokeWidth={2.2} style={stickerShadow} />
                <DressIcon className="h-10 w-10 rotate-6 md:h-16 md:w-16" color={P.mint} style={stickerShadow} />
              </div>

              <div className="relative max-w-[62%] md:max-w-[70%]">
                <h1
                  className="fl-display text-5xl leading-[0.85] text-[#FFB300] sm:text-6xl md:text-7xl"
                  style={{ textShadow: `0 0 28px rgba(255, 170, 0, 0.55), 0 0 2px rgba(255, 150, 0, 0.8)` }}
                >
                  PARENTAL
                </h1>
                <p className="mt-3 max-w-md text-sm font-bold text-[#FFF6E0]/90">
                  {t("parentalSubtitlePlay", "Os seus pequenos jogadores num lugar só: vincule, libere o que pode e acompanhe as conversas.")}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto mt-8 max-w-3xl space-y-6 px-0 md:px-4">
          {error && (
            <div className="flex items-start gap-2 border-2 border-[#0B0B0D] bg-[#FFF6E0] p-3 text-sm font-bold text-red-600 shadow-[4px_4px_0_0_#0B0B0D]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Gerar código */}
          <section className="relative border border-[#FFB300]/30 bg-[#0B3336]/70 p-5" style={panelStyle}>
            <PixelHeart className="absolute -right-2 -top-3 h-7 w-8 rotate-12" />
            <h2 className="fl-display flex items-center gap-2 text-2xl text-[#FFB300] [text-shadow:0_0_18px_rgba(255,170,0,0.45)]">
              <KeyRound className="h-5 w-5" />
              {t("guardianCodeTitle", "Código do responsável")}
            </h2>
            <p className="mt-2 text-sm font-semibold text-[#FFF6E0]/85">
              {t("guardianCodeDesc", "Gere um código e envie ao menor. Ele usa o código no cadastro para vincular a conta a você.")}
            </p>
            <p className="mt-1 text-xs font-bold text-[#3FE0C5]">
              {t("guardianCodeValidity", "Cada código vale 24h e pode ser usado uma única vez.")}
            </p>

            <div className="mt-4 space-y-3">
              <button type="button" onClick={handleGenerate} disabled={generating} className={btnPrimary}>
                <Plus className="h-4 w-4" />
                {generating ? t("generating", "Gerando...") : t("generateCode", "Gerar código")}
              </button>

              {activeInvites.length === 0 && !loading && (
                <p className="text-sm font-semibold text-[#FFF6E0]/60">{t("noActiveCodes", "Nenhum código ativo no momento.")}</p>
              )}

              {activeInvites.map((inv) => {
                const expiresIn = Math.max(
                  0,
                  Math.round((new Date(inv.expires_at).getTime() - Date.now()) / (60 * 60 * 1000))
                )
                return (
                  <div key={inv.id_invite} className="flex flex-wrap items-center gap-3 border-2 border-[#0B0B0D] bg-[#062224]/70 p-3">
                    <code className="border-2 border-[#0B0B0D] bg-[#FFB300] px-3 py-1 font-mono text-lg font-black tracking-[0.3em] text-[#0B0B0D]">
                      {inv.code}
                    </code>
                    <span className="text-xs font-bold text-[#3FE0C5]">
                      {t("expiresIn", "Expira em")} {expiresIn}h
                    </span>
                    <div className="ml-auto flex gap-2">
                      <button type="button" onClick={() => handleCopy(inv.code)} aria-label={t("copy", "Copiar")} className={btnGhost}>
                        {copiedCode === inv.code ? <Check className="h-4 w-4 text-[#3FE0C5]" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <button type="button" onClick={() => handleRevoke(inv.id_invite)} aria-label={t("revoke", "Revogar")} className={btnGhost}>
                        <Trash2 className="h-4 w-4 text-[#FF4F9A]" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Lista de menores */}
          <section className="relative border border-[#FFB300]/30 bg-[#0B3336]/70 p-5" style={panelStyle}>
            <DressIcon className="absolute -right-3 -top-5 h-12 w-12 rotate-12" style={stickerShadow} />
            <h2 className="fl-display flex items-center gap-2 text-2xl text-[#FFB300] [text-shadow:0_0_18px_rgba(255,170,0,0.45)]">
              <Users className="h-5 w-5" />
              {t("linkedChildrenTitle", "Filhos vinculados")}
            </h2>
            <p className="mt-2 text-sm font-semibold text-[#FFF6E0]/85">
              {minors.length === 0
                ? t("linkedChildrenEmptyDesc", "Quando o menor usar o seu código no cadastro, ele aparecerá aqui.")
                : t("linkedChildrenDesc", "Toque em um menor para abrir permissões e enxames liberados.")}
            </p>

            <div className="mt-4 space-y-3">
              {loading && <p className="text-sm font-semibold text-[#FFF6E0]/60">{t("loading", "Carregando...")}</p>}

              {!loading && minors.length === 0 && (
                <div className="flex flex-col items-center gap-3 border-2 border-dashed border-[#3FE0C5]/60 bg-[#062224]/70 p-8 text-center">
                  <div aria-hidden className="flex items-end gap-3">
                    <Gamepad2 className="h-10 w-10 -rotate-12 text-[#FFB300]" />
                    <DressIcon className="h-12 w-12" />
                    <PixelHeart className="h-7 w-8" color={P.mint} />
                  </div>
                  <p className="text-sm font-bold text-[#FFF6E0]/75">{t("noChildrenYet", "Nenhum filho vinculado ainda.")}</p>
                </div>
              )}

              {minors.map((minor) => {
                const expanded = expandedMinorId === minor.minor_user_id
                const saving = savingMinorId === minor.minor_user_id
                const allowedMachineIds = new Set(minor.machines.filter((m) => m.allowed).map((m) => m.id_machine))
                const statusClass =
                  minor.status === "active"
                    ? "bg-[#3FE0C5] text-[#0B0B0D]"
                    : minor.status === "suspended"
                      ? "bg-[#FFB300] text-[#0B0B0D]"
                      : "bg-[#FF4F9A] text-[#FFF6E0]"
                return (
                  <div key={minor.minor_user_id} className="border border-[#3FE0C5]/20 bg-[#062224]/70">
                    <button
                      type="button"
                      onClick={() => setExpandedMinorId(expanded ? null : minor.minor_user_id)}
                      className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-[#FFB300]/[0.06]"
                    >
                      <Avatar className="h-11 w-11 border-2 border-[#FFB300]">
                        {minor.minor_avatar && <AvatarImage src={minor.minor_avatar} />}
                        <AvatarFallback className="bg-[#FF4F9A] font-black text-[#FFF6E0]">
                          {(minor.minor_nome || "M").slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-[#FFF6E0]">{minor.minor_nome}</p>
                        <p className="truncate text-xs font-bold text-[#3FE0C5]">@{minor.minor_username || "—"}</p>
                      </div>
                      <span className={`border-2 border-[#0B0B0D] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${statusClass}`}>
                        {minor.status === "active"
                          ? t("supStatusActive", "ativo")
                          : minor.status === "suspended"
                            ? t("supStatusSuspended", "suspenso")
                            : t("supStatusRevoked", "revogado")}
                      </span>
                    </button>

                    {expanded && (
                      <div className="space-y-5 border-t border-[#3FE0C5]/20 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className={btnGhost}
                            disabled={saving || minor.status === "active"}
                            onClick={() => setStatus(minor, "active")}
                          >
                            {t("activate", "Ativar")}
                          </button>
                          <button
                            type="button"
                            className={btnGhost}
                            disabled={saving || minor.status === "suspended"}
                            onClick={() => setStatus(minor, "suspended")}
                          >
                            {t("suspend", "Suspender")}
                          </button>
                          <button
                            type="button"
                            className={`${btnGhost} text-[#FF4F9A]`}
                            disabled={saving || minor.status === "revoked"}
                            onClick={() => setStatus(minor, "revoked")}
                          >
                            {t("revoke", "Revogar")}
                          </button>
                          <Link
                            href={`/account/parental/${minor.minor_user_id}/messages`}
                            className="ml-auto inline-flex items-center gap-1.5 border-2 border-[#0B0B0D] bg-[#FFB300] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-[#0B0B0D] shadow-[2px_2px_0_0_#0B0B0D]"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            {t("messagesOf", "Mensagens de")} {minor.minor_nome.split(" ")[0]}
                          </Link>
                        </div>

                        {minor.permissions ? (
                          <div className="space-y-4">
                            {PERMISSION_GROUPS.map((group) => (
                              <div key={group.titleKey} className="space-y-2">
                                <div>
                                  <p className="text-sm font-black uppercase tracking-[0.08em] text-[#FFB300]">
                                    {t(group.titleKey, group.title)}
                                  </p>
                                  <p className="text-xs font-semibold text-[#FFF6E0]/65">{t(group.descKey, group.description)}</p>
                                </div>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  {group.items.map((item) => {
                                    const isHard = !!group.hard
                                    return (
                                      <label
                                        key={item.key}
                                        className={`flex items-center gap-2 border border-[#3FE0C5]/20 bg-[#0B3336]/60 p-2 text-sm ${
                                          isHard ? "opacity-55" : "cursor-pointer hover:border-[#FFB300]"
                                        }`}
                                      >
                                        <Checkbox
                                          checked={!!minor.permissions?.[item.key]}
                                          disabled={isHard || saving}
                                          onCheckedChange={() => togglePermission(minor, item.key)}
                                          className={checkboxSkin}
                                        />
                                        <div className="min-w-0 flex-1">
                                          <span className="font-semibold text-[#FFF6E0]">{t(item.labelKey, item.label)}</span>
                                          {item.hint && item.hintKey && (
                                            <span className="ml-1 text-[10px] text-[#3FE0C5]">({t(item.hintKey, item.hint)})</span>
                                          )}
                                        </div>
                                      </label>
                                    )
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-[#FFF6E0]/60">{t("permissionsUnavailable", "Permissões não disponíveis.")}</p>
                        )}

                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-black uppercase tracking-[0.08em] text-[#FFB300]">
                              {t("allowedSwarms", "Enxames liberados")}
                            </p>
                            <p className="text-xs font-semibold text-[#FFF6E0]/65">
                              {t("allowedSwarmsDesc", "Marque os enxames que o menor pode usar. Sem marcação = bloqueado.")}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {machines.map((m) => {
                              const allowed = allowedMachineIds.has(m.id_machine)
                              return (
                                <label
                                  key={m.id_machine}
                                  className="flex cursor-pointer items-center gap-2 border border-[#3FE0C5]/20 bg-[#0B3336]/60 p-2 text-sm hover:border-[#FFB300]"
                                >
                                  <Checkbox
                                    checked={allowed}
                                    disabled={saving}
                                    onCheckedChange={(v) => toggleMachine(minor, m, v === true)}
                                    className={checkboxSkin}
                                  />
                                  <span className="font-semibold text-[#FFF6E0]">{tx.enxame(m.slug, m.name)}</span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
