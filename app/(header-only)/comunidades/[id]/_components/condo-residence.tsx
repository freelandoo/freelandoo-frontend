"use client"

// Área de morador do condomínio (migs 205/206), desenhada para viver DENTRO da
// casca padrão de comunidade — não é mais uma tela própria.
//
// Quatro superfícies, na ordem em que a pessoa esbarra nelas:
//
//   1. PORTARIA — quem não confirmou apartamento vê a grade (torre → andar →
//      apto) e escolhe o seu. É a única porta: condomínio não tem visitante.
//   2. FAMÍLIA × DISPUTA — quem JÁ mora e recebeu alguém dizendo morar ali
//      decide num modal: aceita como família (um clique — é o caso comum) ou
//      rejeita e compete.
//   3. DISPUTA — quem competiu manda o comprovante FILMADO; as três partes
//      conversam num grupo criado automaticamente.
//   4. SÍNDICO — monta a planta e dá o veredito assistindo ao vídeo.
//
// O vídeo vai DIRETO pro Railway (getPublicBackendUrl), nunca pelo proxy
// /api/*: o limite de corpo de função serverless da Vercel é ~4,5 MB.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  Building2,
  Check,
  ChevronDown,
  Gavel,
  Loader2,
  MessageSquare,
  Play,
  Plus,
  ShieldQuestion,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import { getToken } from "@/lib/auth"
import { getPublicBackendUrl } from "@/lib/backend-public"
import { useTranslations } from "@/components/i18n/I18nProvider"

/* ------------------------------- estilo base ------------------------------ */

const GOLD = "#F2B705"
const PANEL = "border-2 border-[#0B0B0D] bg-[#15120E]"
const INNER = "border-2 border-[#0B0B0D] bg-[#1D1810]"
const BTN_GOLD =
  "inline-flex items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D] font-extrabold uppercase tracking-[0.12em] disabled:opacity-50"
const BTN_DARK =
  "inline-flex items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] text-[#F5F1E8] font-extrabold uppercase tracking-[0.12em] hover:bg-[#241d12] disabled:opacity-50"
const BTN_DANGER =
  "inline-flex items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#ff5a44] text-[#0B0B0D] font-extrabold uppercase tracking-[0.12em] disabled:opacity-50"
const H_SECTION =
  "flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#F5F1E8]"

/* ---------------------------------- tipos --------------------------------- */

type PlantUnit = {
  id_unit: number
  id_block: number | null
  block_name: string | null
  floor: number | null
  label: string
  source: "claimed" | "generated"
  occupied: boolean
  residents_count?: number
  pending_count?: number
}

type PlantBlock = {
  id_block: number
  name: string
  floors: number | null
  units_per_floor: number | null
  first_floor: number
  units_count: number
}

type PendingReview = {
  id_residence: number
  id_unit: number
  unit_label: string | null
  claimed_at: string
  pending_until: string | null
  status: string
  my_vote: string | null
  username: string | null
  nome: string | null
  avatar: string | null
}

type MyUnit = {
  id_residence: number
  id_unit: number
  status: string
  label: string | null
  floor: number | null
  block_name: string | null
}

type Plant = {
  needs_address?: boolean
  blocks: PlantBlock[]
  units: PlantUnit[]
  viewer: {
    is_admin: boolean
    is_resident: boolean
    is_pending: boolean
    is_unrecognized?: boolean
    pending_reviews?: PendingReview[]
    units: MyUnit[]
  }
}

type Dispute = {
  id_dispute: number
  id_residence: number
  id_unit: number
  id_conversation: string | null
  status: "open" | "approved" | "rejected" | "withdrawn"
  reason: string | null
  id_claimant: string
  id_contester: string
  unit_label: string | null
  block_name: string | null
  claimant_username?: string | null
  claimant_name?: string | null
  contester_username?: string | null
  contester_name?: string | null
  id_proof?: number | null
  proof_status?: string | null
  created_at: string
}

/* -------------------------------- utilidades ------------------------------ */

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function unitTitle(u: { block_name?: string | null; label: string | null }) {
  return u.block_name ? `${u.block_name} · ${u.label ?? ""}`.trim() : u.label ?? ""
}

/* ============================ componente principal ======================== */

export function CondoResidence({
  communityId,
  onResidencyChange,
}: {
  communityId: string
  /** Avisa a página-mãe: virar morador libera publicar, votar e ver vizinhos. */
  onResidencyChange?: () => void
}) {
  const t = useTranslations("Condo")

  const [plant, setPlant] = useState<Plant | null>(null)
  const [loading, setLoading] = useState(true)
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [pr, dr] = await Promise.all([
        fetch(`/api/condos/${communityId}/plant`, {
          headers: authHeaders(),
          cache: "no-store",
        }),
        fetch(`/api/condos/${communityId}/disputes`, {
          headers: authHeaders(),
          cache: "no-store",
        }),
      ])
      if (pr.ok) setPlant(await pr.json())
      if (dr.ok) {
        const d = await dr.json()
        setDisputes(Array.isArray(d.disputes) ? d.disputes : [])
      }
    } finally {
      setLoading(false)
    }
  }, [communityId])

  useEffect(() => {
    void load()
  }, [load])

  const refresh = useCallback(async () => {
    await load()
    onResidencyChange?.()
  }, [load, onResidencyChange])

  if (loading) {
    return (
      <section className={`${PANEL} p-4`}>
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-[#9A938A]" />
        </div>
      </section>
    )
  }
  if (!plant) return null

  const isAdmin = plant.viewer.is_admin
  const isResident = plant.viewer.is_resident
  const reviews = plant.viewer.pending_reviews ?? []
  const myOpenDisputes = disputes.filter(
    (d) => d.status === "open" && !isAdmin
  )

  return (
    <div className="space-y-6">
      {msg && (
        <p className="border-2 border-[#0B0B0D] bg-[#15120E] px-3 py-2 text-xs font-bold text-[#F5F1E8]">
          {msg}
        </p>
      )}

      {/* 2. A decisão de quem já mora: família ou disputa. Vem PRIMEIRO porque
             tem alguém esperando do outro lado. */}
      {reviews.map((r) => (
        <FamilyOrDisputeCard
          key={r.id_residence}
          communityId={communityId}
          review={r}
          onDone={refresh}
          onError={setMsg}
        />
      ))}

      {/* 3. Minha disputa aberta: mandar o comprovante e falar com o síndico. */}
      {myOpenDisputes.map((d) => (
        <MyDisputeCard key={d.id_dispute} communityId={communityId} dispute={d} onDone={refresh} />
      ))}

      {/* 1. Portaria — quem ainda não confirmou apartamento. */}
      {!isResident && (
        <ClaimGate
          communityId={communityId}
          plant={plant}
          onDone={refresh}
          onError={setMsg}
        />
      )}

      {/* Meu apartamento (morador confirmado). */}
      {isResident && plant.viewer.units.length > 0 && (
        <section className={`${PANEL} p-4`}>
          <h2 className={H_SECTION}>
            <Building2 className="h-4 w-4 text-[#F2B705]" />
            {t("myUnitTitle", "Meu apartamento")}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {plant.viewer.units.map((u) => (
              <li key={u.id_residence} className={`${INNER} px-3 py-2 text-xs font-bold`}>
                {unitTitle(u)}
                {u.floor !== null && (
                  <span className="ml-2 text-[#9A938A]">
                    {t("floorShort", "{n}º andar").replace("{n}", String(u.floor))}
                  </span>
                )}
                {u.status !== "recognized" && (
                  <span className="ml-2 text-[#F2B705]">
                    {u.status === "pending"
                      ? t("statusPending", "aguardando os vizinhos")
                      : u.status === "contested"
                        ? t("statusContested", "em disputa")
                        : t("statusUnrecognized", "não reconhecido")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 4. Síndico: planta e vereditos. */}
      {isAdmin && (
        <>
          <LeaderPlantEditor
            communityId={communityId}
            plant={plant}
            onDone={refresh}
            onError={setMsg}
          />
          <LeaderDisputes
            communityId={communityId}
            disputes={disputes}
            onDone={refresh}
          />
        </>
      )}
    </div>
  )
}

/* =============================== 1. Portaria ============================== */

function ClaimGate({
  communityId,
  plant,
  onDone,
  onError,
}: {
  communityId: string
  plant: Plant
  onDone: () => void
  onError: (m: string | null) => void
}) {
  const t = useTranslations("Condo")
  const [blockId, setBlockId] = useState<number | "none" | null>(null)
  const [floor, setFloor] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  // Torres na ordem em que o prédio é lido, e "sem torre" só aparece quando
  // existe unidade sem bloco (a cobertura, a loja).
  const blocks = plant.blocks
  const hasLooseUnits = plant.units.some((u) => u.id_block === null)

  const floors = useMemo(() => {
    const set = new Set<number>()
    for (const u of plant.units) {
      const matches =
        blockId === "none" ? u.id_block === null : u.id_block === blockId
      if (matches && u.floor !== null) set.add(u.floor)
    }
    return [...set].sort((a, b) => a - b)
  }, [plant.units, blockId])

  const visibleUnits = useMemo(() => {
    return plant.units.filter((u) => {
      const inBlock =
        blockId === "none" ? u.id_block === null : u.id_block === blockId
      if (!inBlock) return false
      if (floor === null) return u.floor === null || floors.length === 0
      return u.floor === floor
    })
  }, [plant.units, blockId, floor, floors.length])

  const claim = async (id_unit: number) => {
    setBusy(true)
    onError(null)
    try {
      const res = await fetch(`/api/condos/${communityId}/residence/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ id_unit }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t("claimError", "Não foi possível reivindicar."))
      onError(
        data.status === "recognized"
          ? t("claimApprovedNew", "Pronto! Você entrou no condomínio.")
          : t(
              "claimPendingNew",
              "Este apartamento já tem morador. Ele vai decidir se vocês são da mesma casa."
            )
      )
      onDone()
    } catch (err) {
      onError(err instanceof Error ? err.message : t("claimError", "Não foi possível reivindicar."))
    } finally {
      setBusy(false)
    }
  }

  if (plant.needs_address) {
    return (
      <section className={`${PANEL} p-6 text-center`}>
        <Building2 className="mx-auto h-8 w-8 text-[#9A938A]" />
        <p className="mt-3 text-sm text-[#9A938A]">
          {t(
            "needsAddress",
            "Este condomínio ainda não tem endereço cadastrado. Fale com a administração."
          )}
        </p>
      </section>
    )
  }

  if (plant.blocks.length === 0 && plant.units.length === 0) {
    return (
      <section className={`${PANEL} p-6 text-center`}>
        <Building2 className="mx-auto h-8 w-8 text-[#9A938A]" />
        <p className="mt-3 text-sm text-[#9A938A]">
          {t("plantEmpty", "A administração ainda não montou a planta do prédio.")}
        </p>
      </section>
    )
  }

  return (
    <section className={`${PANEL} p-4`}>
      <h2 className={H_SECTION}>
        <Building2 className="h-4 w-4 text-[#F2B705]" />
        {t("claimTitleNew", "Qual é o seu apartamento?")}
      </h2>
      <p className="mt-2 text-xs text-[#9A938A]">
        {t(
          "claimSubtitleNew",
          "Só morador entra. Escolha sua torre, o andar e o apartamento. Se já houver alguém, essa pessoa confirma se vocês moram juntos."
        )}
      </p>

      {/* Torre */}
      <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
        {t("blockLabel", "Torre / bloco")}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {blocks.map((b) => (
          <button
            key={b.id_block}
            type="button"
            onClick={() => {
              setBlockId(b.id_block)
              setFloor(null)
            }}
            className="border-2 border-[#0B0B0D] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.1em]"
            style={
              blockId === b.id_block
                ? { background: GOLD, color: "#0B0B0D" }
                : { background: "#1D1810", color: "#9A938A" }
            }
          >
            {b.name}
          </button>
        ))}
        {hasLooseUnits && (
          <button
            type="button"
            onClick={() => {
              setBlockId("none")
              setFloor(null)
            }}
            className="border-2 border-[#0B0B0D] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.1em]"
            style={
              blockId === "none"
                ? { background: GOLD, color: "#0B0B0D" }
                : { background: "#1D1810", color: "#9A938A" }
            }
          >
            {t("noBlock", "Sem torre")}
          </button>
        )}
      </div>

      {/* Andar */}
      {blockId !== null && floors.length > 0 && (
        <>
          <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
            {t("floorLabel", "Andar")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {floors.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFloor(f)}
                className="min-w-11 border-2 border-[#0B0B0D] px-3 py-2 text-xs font-extrabold"
                style={
                  floor === f
                    ? { background: GOLD, color: "#0B0B0D" }
                    : { background: "#1D1810", color: "#9A938A" }
                }
              >
                {f}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Apartamento */}
      {blockId !== null && (floor !== null || floors.length === 0) && (
        <>
          <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
            {t("unitLabel", "Apartamento")}
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
            {visibleUnits.map((u) => (
              <button
                key={u.id_unit}
                type="button"
                disabled={busy}
                onClick={() => claim(u.id_unit)}
                className={`${INNER} flex flex-col items-center px-2 py-3 text-xs font-extrabold text-[#F5F1E8] hover:bg-[#241d12] disabled:opacity-50`}
              >
                <span>{u.label}</span>
                {/* "Ocupado" é o que o não-morador precisa saber para não
                    escolher errado — e é tudo que ele recebe: a contagem por
                    porta só existe para quem já mora. */}
                <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">
                  {u.occupied ? t("occupied", "ocupado") : t("free", "livre")}
                </span>
              </button>
            ))}
          </div>
          {visibleUnits.length === 0 && (
            <p className="mt-2 text-xs text-[#9A938A]">
              {t("noUnitsHere", "Nenhum apartamento cadastrado aqui ainda.")}
            </p>
          )}
        </>
      )}
    </section>
  )
}

/* ====================== 2. Família × disputa (morador) ==================== */

function FamilyOrDisputeCard({
  communityId,
  review,
  onDone,
  onError,
}: {
  communityId: string
  review: PendingReview
  onDone: () => void
  onError: (m: string | null) => void
}) {
  const t = useTranslations("Condo")
  const [busy, setBusy] = useState(false)
  const [confirmContest, setConfirmContest] = useState(false)
  const [reason, setReason] = useState("")

  const who = review.nome || review.username || t("someone", "Alguém")

  const respond = async (action: "family" | "contest") => {
    setBusy(true)
    onError(null)
    try {
      const res = await fetch(
        `/api/condos/${communityId}/residence/${review.id_residence}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ action, reason: reason.trim() || null }),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t("respondError", "Não foi possível registrar."))
      onError(
        action === "family"
          ? t("familyDone", "Pronto — vocês moram juntos.")
          : t(
              "contestDone",
              "Disputa aberta. A administração foi avisada e a conversa dos três já está no seu chat."
            )
      )
      setConfirmContest(false)
      onDone()
    } catch (err) {
      onError(err instanceof Error ? err.message : t("respondError", "Não foi possível registrar."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={PANEL} style={{ boxShadow: `6px 6px 0 0 ${GOLD}` }}>
      <div className="p-4">
        <h2 className={H_SECTION}>
          <UserPlus className="h-4 w-4 text-[#F2B705]" />
          {t("familyTitle", "Alguém diz morar no seu apartamento")}
        </h2>

        <div className="mt-3 flex items-center gap-3">
          {review.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={review.avatar}
              alt=""
              loading="lazy"
              data-avatar
              className="h-12 w-12 rounded-full border-2 border-[#0B0B0D] object-cover"
            />
          ) : (
            <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#0B0B0D] bg-[#1D1810]">
              <Users className="h-5 w-5 text-[#9A938A]" />
            </span>
          )}
          <div>
            <p className="text-sm font-extrabold text-[#F5F1E8]">{who}</p>
            {review.username && (
              <p className="text-xs text-[#9A938A]">@{review.username}</p>
            )}
          </div>
        </div>

        {!confirmContest ? (
          <>
            <p className="mt-3 text-xs text-[#9A938A]">
              {t(
                "familyExplain",
                "Se essa pessoa é da sua casa — cônjuge, filho, irmão, quem divide o aluguel — aceite. Vocês dois passam a ser moradores, e ninguém perde nada."
              )}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => respond("family")}
                className={`${BTN_GOLD} px-4 py-2.5 text-xs`}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {t("acceptFamily", "Aceitar como família")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmContest(true)}
                className={`${BTN_DANGER} px-4 py-2.5 text-xs`}
              >
                <ShieldQuestion className="h-4 w-4" />
                {t("rejectCompete", "Rejeitar e competir")}
              </button>
            </div>
          </>
        ) : (
          <div className={`${INNER} mt-4 p-3`}>
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#F2B705]">
              {t("contestConfirmTitle", "Abrir disputa")}
            </p>
            <p className="mt-2 text-xs text-[#9A938A]">
              {t(
                "contestConfirmText",
                "A administração será avisada e uma conversa entre você, essa pessoa e o síndico será aberta automaticamente. Quem está reivindicando terá que enviar um vídeo do comprovante de residência, e o síndico decide. Você continua morador durante todo o processo."
              )}
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder={t("contestReasonPlaceholder", "Por que você está contestando? (opcional)")}
              className="mt-3 w-full border-2 border-[#0B0B0D] bg-[#15120E] px-3 py-2 text-sm text-[#F5F1E8] outline-none placeholder:text-[#9A938A]"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => respond("contest")}
                className={`${BTN_DANGER} px-4 py-2 text-xs`}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t("contestConfirmCta", "Abrir disputa")}
              </button>
              <button
                type="button"
                onClick={() => setConfirmContest(false)}
                className={`${BTN_DARK} px-4 py-2 text-xs`}
              >
                <X className="h-4 w-4" /> {t("cancel", "Cancelar")}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

/* ================== 3. Minha disputa (quem está competindo) =============== */

function MyDisputeCard({
  communityId,
  dispute,
  onDone,
}: {
  communityId: string
  dispute: Dispute
  onDone: () => void
}) {
  const t = useTranslations("Condo")
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const upload = async (file: File) => {
    setBusy(true)
    setErr(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      // DIRETO no Railway: o proxy /api/* da Vercel tem limite de ~4,5 MB de
      // corpo, e um vídeo estoura isso com folga.
      const res = await fetch(
        `${getPublicBackendUrl()}/condos/${communityId}/disputes/${dispute.id_dispute}/proof`,
        { method: "POST", headers: authHeaders(), body: fd }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t("proofError", "Não foi possível enviar o vídeo."))
      setSent(true)
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("proofError", "Não foi possível enviar o vídeo."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={PANEL} style={{ boxShadow: `6px 6px 0 0 #ff5a44` }}>
      <div className="p-4">
        <h2 className={H_SECTION}>
          <Gavel className="h-4 w-4 text-[#ff5a44]" />
          {t("myDisputeTitle", "Sua reivindicação está em disputa")}
        </h2>
        <p className="mt-2 text-xs text-[#9A938A]">
          {t(
            "myDisputeText",
            "Para reivindicar este apartamento você precisa enviar um vídeo do seu comprovante de residência. O síndico assiste e decide. A conversa com o síndico e com o morador atual já está aberta no seu chat."
          )}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void upload(f)
              e.target.value = ""
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className={`${BTN_GOLD} px-4 py-2.5 text-xs`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {sent
              ? t("proofResend", "Enviar outro vídeo")
              : t("proofSend", "Enviar vídeo do comprovante")}
          </button>
          {dispute.id_conversation && (
            <Link
              href={`/mensagens?conversation=${dispute.id_conversation}`}
              className={`${BTN_DARK} px-4 py-2.5 text-xs`}
            >
              <MessageSquare className="h-4 w-4 text-[#F2B705]" />
              {t("openDisputeChat", "Abrir a conversa")}
            </Link>
          )}
        </div>

        {sent && (
          <p className="mt-3 text-xs font-bold text-[#F2B705]">
            {t("proofSent", "Comprovante enviado. O síndico foi avisado.")}
          </p>
        )}
        {err && <p className="mt-3 text-xs font-bold text-[#ff5a44]">{err}</p>}
      </div>
    </section>
  )
}

/* ========================= 4a. Planta (síndico) =========================== */

function LeaderPlantEditor({
  communityId,
  plant,
  onDone,
  onError,
}: {
  communityId: string
  plant: Plant
  onDone: () => void
  onError: (m: string | null) => void
}) {
  const t = useTranslations("Condo")
  const [open, setOpen] = useState(plant.blocks.length === 0)
  const [name, setName] = useState("")
  const [floors, setFloors] = useState("")
  const [perFloor, setPerFloor] = useState("")
  const [firstFloor, setFirstFloor] = useState("1")
  const [busy, setBusy] = useState(false)

  const create = async () => {
    if (!name.trim()) {
      onError(t("blockNeedsName", "Dê um nome à torre."))
      return
    }
    setBusy(true)
    onError(null)
    try {
      const res = await fetch(`/api/condos/${communityId}/plant/blocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          name: name.trim(),
          floors: floors ? Number(floors) : null,
          units_per_floor: perFloor ? Number(perFloor) : null,
          first_floor: firstFloor ? Number(firstFloor) : 1,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t("blockError", "Não foi possível criar a torre."))
      onError(
        t("blockCreated", "Torre criada com {n} apartamentos.").replace(
          "{n}",
          String(data.generated ?? 0)
        )
      )
      setName("")
      setFloors("")
      setPerFloor("")
      onDone()
    } catch (err) {
      onError(err instanceof Error ? err.message : t("blockError", "Não foi possível criar a torre."))
    } finally {
      setBusy(false)
    }
  }

  const removeUnit = async (id_unit: number) => {
    setBusy(true)
    onError(null)
    try {
      const res = await fetch(`/api/condos/${communityId}/plant/units/${id_unit}`, {
        method: "DELETE",
        headers: authHeaders(),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t("unitDeleteError", "Não foi possível excluir."))
      onDone()
    } catch (err) {
      onError(err instanceof Error ? err.message : t("unitDeleteError", "Não foi possível excluir."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={`${PANEL} p-4`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between"
      >
        <span className={H_SECTION}>
          <Building2 className="h-4 w-4 text-[#F2B705]" />
          {t("plantTitle", "Planta do prédio")}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[#9A938A] transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          <p className="mt-3 text-xs text-[#9A938A]">
            {t(
              "plantHelp",
              "Informe a torre, quantos andares e quantos apartamentos por andar. A numeração sai como 101, 102… — é um ponto de partida: depois você acrescenta a cobertura e remove o que não existe."
            )}
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder={t("blockNamePlaceholder", "Torre A")}
              className="border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-sm text-[#F5F1E8] outline-none placeholder:text-[#9A938A]"
            />
            <input
              value={floors}
              onChange={(e) => setFloors(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder={t("floorsPlaceholder", "Andares")}
              className="border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-sm text-[#F5F1E8] outline-none placeholder:text-[#9A938A]"
            />
            <input
              value={perFloor}
              onChange={(e) => setPerFloor(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder={t("perFloorPlaceholder", "Aptos por andar")}
              className="border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-sm text-[#F5F1E8] outline-none placeholder:text-[#9A938A]"
            />
            <input
              value={firstFloor}
              onChange={(e) => setFirstFloor(e.target.value.replace(/[^\d-]/g, ""))}
              inputMode="numeric"
              placeholder={t("firstFloorPlaceholder", "1º andar")}
              className="border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-sm text-[#F5F1E8] outline-none placeholder:text-[#9A938A]"
            />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={create}
            className={`${BTN_GOLD} mt-3 px-4 py-2.5 text-xs`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t("blockCreateCta", "Criar torre e gerar apartamentos")}
          </button>

          {plant.units.length > 0 && (
            <div className="mt-5">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
                {t("plantUnitsTitle", "Apartamentos")} · {plant.units.length}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {plant.units.map((u) => (
                  <div key={u.id_unit} className={`${INNER} flex items-center justify-between px-2 py-2`}>
                    <span className="text-xs font-extrabold text-[#F5F1E8]">
                      {u.block_name ? `${u.block_name} ` : ""}
                      {u.label}
                    </span>
                    <span className="flex items-center gap-1">
                      {(u.residents_count ?? 0) > 0 && (
                        <span className="text-[10px] font-bold text-[#F2B705]">
                          {u.residents_count}
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => removeUnit(u.id_unit)}
                        aria-label={t("unitDelete", "Excluir apartamento")}
                        className="text-[#9A938A] hover:text-[#ff5a44] disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}

/* ======================= 4b. Disputas (síndico) =========================== */

function LeaderDisputes({
  communityId,
  disputes,
  onDone,
}: {
  communityId: string
  disputes: Dispute[]
  onDone: () => void
}) {
  const t = useTranslations("Condo")
  const [busy, setBusy] = useState<number | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const open = disputes.filter((d) => d.status === "open")

  const watch = async (d: Dispute) => {
    if (!d.id_proof) return
    setErr(null)
    try {
      const res = await fetch(
        `/api/condos/${communityId}/disputes/${d.id_dispute}/proof/${d.id_proof}/url`,
        { headers: authHeaders() }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t("proofUrlError", "Não foi possível abrir o vídeo."))
      window.open(data.url, "_blank", "noopener,noreferrer")
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("proofUrlError", "Não foi possível abrir o vídeo."))
    }
  }

  const decide = async (d: Dispute, action: "approve" | "reject") => {
    setBusy(d.id_dispute)
    setErr(null)
    try {
      const res = await fetch(
        `/api/condos/${communityId}/disputes/${d.id_dispute}/decide`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ action }),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t("decideError", "Não foi possível decidir."))
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("decideError", "Não foi possível decidir."))
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className={`${PANEL} p-4`}>
      <h2 className={H_SECTION}>
        <Gavel className="h-4 w-4 text-[#F2B705]" />
        {t("disputesTitle", "Reivindicações em disputa")}
        {open.length > 0 && (
          <span className="border-2 border-[#0B0B0D] bg-[#ff5a44] px-2 text-[10px] font-black text-[#0B0B0D]">
            {open.length}
          </span>
        )}
      </h2>

      {err && <p className="mt-2 text-xs font-bold text-[#ff5a44]">{err}</p>}

      {open.length === 0 ? (
        <p className="mt-2 text-xs text-[#9A938A]">
          {t("disputesEmpty", "Nenhuma disputa aberta.")}
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {open.map((d) => (
            <li key={d.id_dispute} className={`${INNER} p-3`}>
              <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#F5F1E8]">
                {d.block_name ? `${d.block_name} · ` : ""}
                {d.unit_label}
              </p>
              <p className="mt-1 text-xs text-[#9A938A]">
                {t("disputeParties", "{claimant} reivindica · {contester} contestou")
                  .replace("{claimant}", d.claimant_name || d.claimant_username || "—")
                  .replace("{contester}", d.contester_name || d.contester_username || "—")}
              </p>
              {d.reason && (
                <p className="mt-1 border-l-2 border-[#F2B705] pl-2 text-xs italic text-[#9A938A]">
                  {d.reason}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {d.id_proof ? (
                  <button
                    type="button"
                    onClick={() => watch(d)}
                    className={`${BTN_DARK} px-3 py-1.5 text-[11px]`}
                  >
                    <Play className="h-3.5 w-3.5 text-[#F2B705]" />
                    {t("watchProof", "Assistir ao comprovante")}
                  </button>
                ) : (
                  <span className="inline-flex items-center px-1 text-[11px] font-bold text-[#9A938A]">
                    {t("proofPending", "Comprovante ainda não enviado")}
                  </span>
                )}
                {d.id_conversation && (
                  <Link
                    href={`/mensagens?conversation=${d.id_conversation}`}
                    className={`${BTN_DARK} px-3 py-1.5 text-[11px]`}
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-[#F2B705]" />
                    {t("openDisputeChat", "Abrir a conversa")}
                  </Link>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy === d.id_dispute}
                  onClick={() => decide(d, "approve")}
                  className={`${BTN_GOLD} px-3 py-1.5 text-[11px]`}
                >
                  {busy === d.id_dispute ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  {t("disputeApprove", "Aceitar como morador")}
                </button>
                <button
                  type="button"
                  disabled={busy === d.id_dispute}
                  onClick={() => decide(d, "reject")}
                  className={`${BTN_DANGER} px-3 py-1.5 text-[11px]`}
                >
                  <X className="h-3.5 w-3.5" />
                  {t("disputeReject", "Recusar")}
                </button>
              </div>
              {/* Aprovar não expulsa ninguém (§7.1): dito na tela para o síndico
                  não achar que precisa escolher entre as duas pessoas. */}
              <p className="mt-2 text-[10px] text-[#9A938A]">
                {t(
                  "disputeApproveHint",
                  "Aceitar não remove o morador atual — os dois passam a morar no apartamento."
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
