"use client"

/**
 * Tela do bairro (migs 202-204).
 *
 * O fluxo inteiro do subsistema 4 numa página só, porque para o usuário ele é
 * um assunto só: "onde eu moro" → "meus vizinhos confirmam" → "a comunidade do
 * meu bairro".
 *
 * Duas coisas guiam o desenho:
 *   * o estado do vínculo é a informação principal — esperar reconhecimento
 *     NÃO é erro nem recusa, e a tela precisa dizer isso com todas as letras,
 *     senão a pessoa acha que foi barrada;
 *   * endereço não aparece para ninguém além do dono. A tela mostra o bairro,
 *     nunca a rua — nem a do próprio usuário, que o backend não devolve.
 */

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"
import { getToken } from "@/lib/auth"
import { toast } from "sonner"
import { Home, MapPin, ShieldCheck, Clock, AlertTriangle, Users } from "lucide-react"

type ResidenceStatus = "pending" | "recognized" | "unrecognized" | "contested"

type MyNeighborhood = {
  id_territory: number
  uf: string
  municipio_label: string
  bairro_label: string
  residence_status: ResidenceStatus
  id_profile: string | null
  display_name: string | null
  avatar_url: string | null
  is_member: boolean
  role: string | null
}

type PendingNeighbor = {
  id_residence: number
  username: string
  nome: string
  avatar: string | null
  unit_label: string | null
  bairro_label: string
  my_vote: "recognize" | "contest" | null
}

type MyResidence = {
  id_residence: number
  status: ResidenceStatus
  bairro_label: string
  municipio_label: string
  uf: string
  unit_label: string | null
}

function authHeaders(): HeadersInit {
  const token = getToken()
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" }
}

export function NeighborhoodView() {
  const t = useTranslations("Neighborhood")
  const router = useRouter()
  const enabled = useFeature("bairro")

  const [loading, setLoading] = useState(true)
  const [mine, setMine] = useState<MyNeighborhood[]>([])
  const [residences, setResidences] = useState<MyResidence[]>([])
  const [pending, setPending] = useState<PendingNeighbor[]>([])
  const [busy, setBusy] = useState<string | null>(null)

  const [cep, setCep] = useState("")
  const [numero, setNumero] = useState("")
  const [complemento, setComplemento] = useState("")

  const load = useCallback(async () => {
    try {
      const [n, r, p] = await Promise.all([
        fetch("/api/neighborhoods/mine", { headers: authHeaders() }),
        fetch("/api/residences/mine", { headers: authHeaders() }),
        fetch("/api/residences/pending", { headers: authHeaders() }),
      ])
      const nj = await n.json().catch(() => ({}))
      const rj = await r.json().catch(() => ({}))
      const pj = await p.json().catch(() => ({}))
      setMine(Array.isArray(nj?.neighborhoods) ? nj.neighborhoods : [])
      setResidences(Array.isArray(rj?.residences) ? rj.residences : [])
      setPending(Array.isArray(pj?.pending) ? pj.pending : [])
    } catch {
      toast.error(t("genericError", "Algo deu errado. Tente de novo."))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  async function declare(e: React.FormEvent) {
    e.preventDefault()
    const digits = cep.replace(/\D/g, "")
    if (digits.length !== 8) {
      toast.error(t("cepInvalid", "Informe um CEP com 8 dígitos."))
      return
    }
    if (!numero.trim()) {
      toast.error(t("numberRequired", "Informe o número."))
      return
    }
    setBusy("declare")
    try {
      const res = await fetch("/api/residences/claim", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          cep: digits,
          numero: numero.trim(),
          complemento: complemento.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error || t("declareFailed", "Não foi possível confirmar o endereço agora."))
        return
      }
      setCep("")
      setNumero("")
      setComplemento("")
      await load()
    } finally {
      setBusy(null)
    }
  }

  async function judge(id_residence: number, action: "recognize" | "contest") {
    let reason: string | null = null
    if (action === "contest") {
      reason = window.prompt(t("contestPrompt", "Por que você não reconhece esta pessoa? (opcional)")) || null
    }
    setBusy(`judge-${id_residence}`)
    try {
      const res = await fetch(`/api/residences/${id_residence}/${action}`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ reason }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error || t("genericError", "Algo deu errado. Tente de novo."))
        return
      }
      await load()
    } finally {
      setBusy(null)
    }
  }

  async function createCommunity(row: MyNeighborhood) {
    setBusy(`create-${row.id_territory}`)
    try {
      const res = await fetch("/api/neighborhoods", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({}),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error || t("genericError", "Algo deu errado. Tente de novo."))
        return
      }
      const id = data?.community?.id_profile
      if (id) router.push(`/comunidades/${id}`)
    } finally {
      setBusy(null)
    }
  }

  async function join(row: MyNeighborhood) {
    if (!row.id_profile) return
    setBusy(`join-${row.id_territory}`)
    try {
      const res = await fetch(`/api/neighborhoods/${row.id_profile}/join`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({}),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error || t("genericError", "Algo deu errado. Tente de novo."))
        return
      }
      router.push(`/comunidades/${row.id_profile}`)
    } finally {
      setBusy(null)
    }
  }

  async function leave(id_residence: number) {
    if (!window.confirm(t("leaveConfirm", "Encerrar seu vínculo com este endereço?"))) return
    setBusy(`leave-${id_residence}`)
    try {
      const res = await fetch(`/api/residences/${id_residence}`, {
        method: "DELETE",
        headers: authHeaders(),
      })
      if (!res.ok) {
        toast.error(t("genericError", "Algo deu errado. Tente de novo."))
        return
      }
      await load()
    } finally {
      setBusy(null)
    }
  }

  if (!enabled) return null

  const STATUS_META: Record<
    ResidenceStatus,
    { labelKey: string; fallback: string; helpKey: string; helpFallback: string; icon: typeof ShieldCheck; tone: string }
  > = {
    recognized: {
      labelKey: "statusRecognized",
      fallback: "Morador confirmado",
      helpKey: "privacyNote",
      helpFallback: "Seu endereço nunca aparece para outros moradores — eles veem só o bairro.",
      icon: ShieldCheck,
      tone: "text-[#22c55e]",
    },
    pending: {
      labelKey: "statusPending",
      fallback: "Aguardando seus vizinhos",
      helpKey: "pendingHelp",
      helpFallback: "Alguém já mora nesta unidade. Um vizinho precisa confirmar que você mora aí.",
      icon: Clock,
      tone: "text-[#F2B705]",
    },
    unrecognized: {
      labelKey: "statusUnrecognized",
      fallback: "Ainda não confirmado",
      helpKey: "unrecognizedHelp",
      helpFallback: "Ninguém respondeu a tempo. Você lê o mural, mas ainda não publica nem vota.",
      icon: Clock,
      tone: "text-[#F2B705]",
    },
    contested: {
      labelKey: "statusContested",
      fallback: "Em divergência",
      helpKey: "contestedHelp",
      helpFallback: "Um vizinho não reconheceu você. Ninguém foi removido.",
      icon: AlertTriangle,
      tone: "text-[#ec4899]",
    },
  }

  return (
    <div className="fl-sharp min-h-[100dvh] bg-[#0b0804] text-[#F5F1E8]">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 space-y-6">
        <header className="space-y-2">
          <h1 className="fl-display text-3xl font-black uppercase tracking-tight">
            {t("title", "Meu bairro")}
          </h1>
          <p className="text-sm text-[#F5F1E8]/70">
            {t("subtitle", "A comunidade de quem mora perto de você.")}
          </p>
        </header>

        {loading ? (
          <p className="text-sm text-[#F5F1E8]/60">{t("loading", "Carregando…")}</p>
        ) : (
          <>
            {/* ─── meus vínculos ─────────────────────────────────────────── */}
            {residences.map((r) => {
              const meta = STATUS_META[r.status]
              const Icon = meta.icon
              return (
                <section
                  key={r.id_residence}
                  className="border-2 border-[#0B0B0D] bg-[#15120E] p-4 shadow-[4px_4px_0_#F2B705]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-bold">
                        <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="truncate">
                          {r.bairro_label} · {r.municipio_label}/{r.uf}
                        </span>
                      </p>
                      <p className={`mt-1 flex items-center gap-1.5 text-xs font-semibold ${meta.tone}`}>
                        <Icon className="h-3.5 w-3.5" aria-hidden />
                        {t(meta.labelKey, meta.fallback)}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-[#F5F1E8]/60">
                        {t(meta.helpKey, meta.helpFallback)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => leave(r.id_residence)}
                      disabled={busy === `leave-${r.id_residence}`}
                      className="shrink-0 border border-[#0B0B0D] bg-[#1D1810] px-2 py-1 text-[11px] text-[#F5F1E8]/70 hover:text-[#F5F1E8] disabled:opacity-50"
                    >
                      {t("leaveCta", "Não moro mais aqui")}
                    </button>
                  </div>
                </section>
              )
            })}

            {/* ─── comunidade de cada bairro ─────────────────────────────── */}
            {mine.map((row) => (
              <section
                key={row.id_territory}
                className="border-2 border-[#0B0B0D] bg-[#1D1810] p-4"
              >
                {row.id_profile ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wide text-[#F5F1E8]/50">
                        {t("communityExists", "Comunidade do bairro")}
                      </p>
                      <p className="truncate text-sm font-bold">{row.display_name}</p>
                      {row.is_member ? (
                        <p className="mt-1 text-[11px] text-[#22c55e]">
                          {t("memberBadge", "Você participa")}
                        </p>
                      ) : null}
                    </div>
                    {row.is_member ? (
                      <a
                        href={`/comunidades/${row.id_profile}`}
                        className="shrink-0 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-1.5 text-xs font-black uppercase text-[#0b0804]"
                      >
                        {t("openCta", "Abrir")}
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => join(row)}
                        disabled={
                          busy === `join-${row.id_territory}` ||
                          row.residence_status !== "recognized"
                        }
                        className="shrink-0 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-1.5 text-xs font-black uppercase text-[#0b0804] disabled:opacity-40"
                      >
                        {busy === `join-${row.id_territory}`
                          ? t("joining", "Entrando…")
                          : t("joinCta", "Entrar")}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-bold">
                      {t("noCommunityTitle", "Seu bairro ainda não tem comunidade")}
                    </p>
                    <p className="text-xs text-[#F5F1E8]/60">
                      {t("noCommunityBody", "Cada bairro tem uma só. Crie a do seu.")}
                    </p>
                    {row.residence_status === "recognized" ? (
                      <button
                        type="button"
                        onClick={() => createCommunity(row)}
                        disabled={busy === `create-${row.id_territory}`}
                        className="border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-1.5 text-xs font-black uppercase text-[#0b0804] disabled:opacity-50"
                      >
                        {busy === `create-${row.id_territory}`
                          ? t("creating", "Criando…")
                          : t("createCta", "Criar a comunidade do bairro")}
                      </button>
                    ) : (
                      <p className="text-xs text-[#F2B705]">
                        {t(
                          "createNeedsRecognition",
                          "Só quem já foi confirmado pelos vizinhos pode criar a comunidade do bairro."
                        )}
                      </p>
                    )}
                  </div>
                )}
              </section>
            ))}

            {/* ─── declarar residência ───────────────────────────────────── */}
            <section className="border-2 border-[#0B0B0D] bg-[#15120E] p-4">
              <h2 className="flex items-center gap-2 text-sm font-black uppercase">
                <Home className="h-4 w-4" aria-hidden />
                {residences.length === 0
                  ? t("emptyTitle", "Você ainda não declarou onde mora")
                  : t("declareTitle", "Onde você mora")}
              </h2>
              <p className="mt-1 text-xs text-[#F5F1E8]/60">
                {t("declareHelp", "Guardamos só o CEP, o número e o complemento.")}
              </p>
              <form onSubmit={declare} className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="text-xs">
                  <span className="mb-1 block text-[#F5F1E8]/70">{t("cepLabel", "CEP")}</span>
                  <input
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    inputMode="numeric"
                    maxLength={9}
                    className="w-full border-2 border-[#0B0B0D] bg-[#0b0804] px-2 py-1.5 text-sm text-[#F5F1E8] outline-none focus:border-[#F2B705]"
                  />
                </label>
                <label className="text-xs">
                  <span className="mb-1 block text-[#F5F1E8]/70">{t("numberLabel", "Número")}</span>
                  <input
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    maxLength={20}
                    className="w-full border-2 border-[#0B0B0D] bg-[#0b0804] px-2 py-1.5 text-sm text-[#F5F1E8] outline-none focus:border-[#F2B705]"
                  />
                </label>
                <label className="text-xs">
                  <span className="mb-1 block text-[#F5F1E8]/70">
                    {t("complementLabel", "Complemento (apto, bloco) — opcional")}
                  </span>
                  <input
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    maxLength={40}
                    className="w-full border-2 border-[#0B0B0D] bg-[#0b0804] px-2 py-1.5 text-sm text-[#F5F1E8] outline-none focus:border-[#F2B705]"
                  />
                </label>
                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    disabled={busy === "declare"}
                    className="border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2 text-xs font-black uppercase text-[#0b0804] disabled:opacity-50"
                  >
                    {busy === "declare"
                      ? t("declaring", "Confirmando…")
                      : t("declareCta", "Declarar residência")}
                  </button>
                </div>
              </form>
            </section>

            {/* ─── julgar vizinho ────────────────────────────────────────── */}
            <section className="border-2 border-[#0B0B0D] bg-[#15120E] p-4">
              <h2 className="flex items-center gap-2 text-sm font-black uppercase">
                <Users className="h-4 w-4" aria-hidden />
                {t("judgeTitle", "Seus vizinhos")}
              </h2>
              <p className="mt-1 text-xs text-[#F5F1E8]/60">
                {t("judgeSubtitle", "Estas pessoas dizem morar com você.")}
              </p>
              {pending.length === 0 ? (
                <p className="mt-3 text-xs text-[#F5F1E8]/50">
                  {t("judgeEmpty", "Ninguém esperando por você.")}
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {pending.map((p) => (
                    <li
                      key={p.id_residence}
                      className="flex items-center justify-between gap-3 border border-[#0B0B0D] bg-[#1D1810] p-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{p.nome}</p>
                        <p className="truncate text-[11px] text-[#F5F1E8]/50">@{p.username}</p>
                        {p.my_vote ? (
                          <p className="mt-0.5 text-[11px] text-[#F2B705]">
                            {p.my_vote === "recognize"
                              ? t("myVoteRecognized", "Você confirmou")
                              : t("myVoteContested", "Você não reconheceu")}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => judge(p.id_residence, "recognize")}
                          disabled={busy === `judge-${p.id_residence}`}
                          className="border-2 border-[#0B0B0D] bg-[#22c55e] px-2 py-1 text-[11px] font-black uppercase text-[#0b0804] disabled:opacity-50"
                        >
                          {t("recognizeCta", "Confirmar")}
                        </button>
                        <button
                          type="button"
                          onClick={() => judge(p.id_residence, "contest")}
                          disabled={busy === `judge-${p.id_residence}`}
                          className="border-2 border-[#0B0B0D] bg-[#1D1810] px-2 py-1 text-[11px] font-black uppercase text-[#ec4899] disabled:opacity-50"
                        >
                          {t("contestCta", "Não reconheço")}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[11px] leading-relaxed text-[#F5F1E8]/50">
                {t("contestNote", "Não reconhecer não remove ninguém — abre uma divergência.")}
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
