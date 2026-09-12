"use client"

// O SITE PRONTO (mig 241 + 242) — o painel que fica ao lado de "Páginas".
//
// Dois públicos, um botão:
//
//   • LÍDER — pergunta "tem um site pronto esperando por mim?". Tendo, ele lê o
//     resumo e ACEITA a troca (mig 242). Não tendo, lê o que é o produto.
//   • ADMINISTRADOR DA PLATAFORMA — vê o que a conversão extraiu do site do
//     construtor, com os avisos, e decide RESERVAR para o cliente aceitar,
//     ligar na hora, publicar ou devolver.
//
// ⚠️ RESERVAR E LIGAR SÃO COISAS DIFERENTES, e é a diferença entre oferecer a
// troca e trocar o site de alguém. "Ligar agora" continua existindo — serve a
// entrega em que o cliente já disse sim por outro canal. O caminho normal é
// reservar: quem aperta o botão que troca o site é o dono dele.
//
// ⚠️ CONVERTER E GRAVAR SEGUEM SENDO DOIS PASSOS. A conversão lê a intenção de
// blocos de texto livre e pode cair trocada; o resumo com os avisos é o único
// momento em que esse erro ainda é barato.
//
// ⚠️ E A TRAVA NÃO É DAQUI. `isAdmin` decide o que DESENHAR; quem recusa é o
// `roleMiddleware` das rotas de `/admin/managed-sites`, e do lado do cliente o
// guard de líder do service. Errar para mais deste lado mostra um botão que o
// backend recusa — nunca abre uma porta.

import { useCallback, useEffect, useRef, useState } from "react"
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Loader2,
  Sparkles,
  Undo2,
  X,
} from "lucide-react"
import { getToken } from "@/lib/auth"
import { SiteSwapModal, type OfferSummary, type SiteOffer } from "./site-swap-modal"

/** O tema que este painel sabe oferecer. Tema novo entra aqui e no backend. */
const TEMPLATE = "oficina-local"

type Warning = { code: string; detail: string }

type OfferRow = {
  id_offer: string
  template: string
  note: string | null
  status: string
  created_at: string
  decided_at: string | null
  created_by_username: string | null
}

type ManagedState = {
  exists: boolean
  managed: boolean
  template: string | null
  slug: string | null
  is_published: boolean
  offer?: { id_offer: string; created_at: string } | null
  offers?: OfferRow[]
  error?: string
}

/** O que o LÍDER lê: o estado do site dele e o que está reservado. */
type ClientState = {
  managed: boolean
  template: string | null
  is_published: boolean
  slug: string | null
  current: OfferSummary | null
  offer: SiteOffer | null
  error?: string
}

type Draft = {
  data: {
    business?: { name?: string; heroPhoto?: string; phoneDisplay?: string; city?: string }
    services?: unknown[]
    cities?: unknown[]
    reviews?: unknown[]
    faq?: unknown[]
  }
  warnings: Warning[]
  error?: string
}

async function call(path: string, init?: RequestInit) {
  const token = getToken()
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  })
  const text = await res.text()
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    return { error: text || "Resposta inesperada do servidor." }
  }
}

export function SiteReadyPanel({
  idProfile,
  accent,
  isAdmin,
  onClose,
  onManagedChange,
  t,
}: {
  idProfile: string
  accent: string
  isAdmin: boolean
  onClose: () => void
  /**
   * O site trocou de natureza (virou gerenciado, ou voltou a ser do cliente).
   *
   * ⚠️ Quem avisa é o painel porque quem sabe é ele. Sem este aviso, o
   * construtor atrás continuaria oferecendo a edição de um documento que o
   * backend passou a recusar — e o sintoma seria o autosave falhando em
   * silêncio enquanto a pessoa digita.
   */
  onManagedChange?: () => void
  t: (key: string, fallback: string) => string
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [state, setState] = useState<ManagedState | null>(null)
  const [client, setClient] = useState<ClientState | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [erro, setErro] = useState("")
  const [swapOpen, setSwapOpen] = useState(false)

  const admin = (path: string, init?: RequestInit) =>
    call(`/api/admin/managed-sites${path}`, init)
  const mine = (path: string, init?: RequestInit) =>
    call(`/api/communities/${idProfile}/site${path}`, init)

  // Fecha com clique fora e com Esc — as duas saídas que todo painel da casa
  // tem, e a razão de o gatilho carregar `data-ready-trigger`: sem ignorá-lo, o
  // mousedown fecharia e o clique reabriria, e o botão nunca fecharia o que
  // abriu.
  //
  // ⚠️ COM O MODAL ABERTO, O PAINEL NÃO ESCUTA NADA. O modal vai por portal
  // para o `body`, então ele está FORA deste `ref` — clicar nele fecharia o
  // painel, e o painel levaria o modal junto no meio da decisão. Pelo mesmo
  // motivo o Esc ali é do modal.
  useEffect(() => {
    if (swapOpen) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.closest("[data-ready-trigger]")) return
      if (ref.current && !ref.current.contains(target)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [onClose, swapOpen])

  const load = useCallback(async () => {
    setErro("")

    // ⚠️ O LÍDER SEMPRE PERGUNTA PELA OFERTA — inclusive quando é administrador
    // da plataforma: é ele quem tem o site, e sem esta chamada um admin que
    // fosse cliente não veria o que está reservado para ele.
    const meu: ClientState = await mine("/offer")
    setClient(meu.error ? null : meu)

    // Nada mais é buscado para quem não administra: o líder não tem acesso às
    // rotas de admin, e pedi-las só renderia um 403 por trás de um painel que
    // já sabia a resposta. Mesma disciplina do `onOpen` da gaveta de números.
    if (!isAdmin) {
      if (meu.error) setErro(meu.error)
      return
    }

    const st: ManagedState = await admin(`/${idProfile}`)
    setState(st)
    if (st.error) {
      setErro(st.error)
      return
    }
    // A conversão só é pedida quando ainda não há tema: com o site já ligado, o
    // que vale é o conteúdo GRAVADO, e mostrar a conversão do canvas ao lado
    // dele sugeriria que ela é o que está no ar.
    if (!st.template) {
      const d: Draft = await admin(`/${idProfile}/from-canvas?template=${TEMPLATE}`)
      setDraft(d.error ? { data: {}, warnings: [], error: d.error } : d)
    } else {
      setDraft(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idProfile, isAdmin])

  useEffect(() => {
    void load()
  }, [load])

  // ─── o cliente decide ─────────────────────────────────────────────────────

  async function aceitar() {
    if (!client?.offer) return
    setBusy("aceitar")
    setErro("")
    // ⚠️ SÓ O ID VIAJA. O conteúdo está no banco desde que a gente o escreveu —
    // mandar `data` daqui seria pedir ao backend para gravar conteúdo do
    // cliente, que é exatamente a brecha que a mig 241 trancou.
    const r = await mine("/offer/accept", {
      method: "POST",
      body: JSON.stringify({ id_offer: client.offer.id_offer }),
    })
    setBusy(null)
    if (r.error) {
      setErro(r.error)
      setSwapOpen(false)
      await load()
      return
    }
    setSwapOpen(false)
    await load()
    onManagedChange?.()
  }

  async function devolver() {
    setBusy("devolver")
    setErro("")
    const r = await mine("/release", { method: "POST" })
    setBusy(null)
    if (r.error) return setErro(r.error)
    await load()
    onManagedChange?.()
  }

  // ─── a plataforma decide ──────────────────────────────────────────────────

  async function reservar() {
    if (!draft) return
    setBusy("reservar")
    setErro("")
    const r = await admin(`/${idProfile}/offer`, {
      method: "PUT",
      body: JSON.stringify({ template: TEMPLATE, data: draft.data }),
    })
    setBusy(null)
    if (r.error) return setErro(r.error)
    await load()
  }

  async function retirar() {
    setBusy("retirar")
    setErro("")
    const r = await admin(`/${idProfile}/offer`, { method: "DELETE" })
    setBusy(null)
    if (r.error) return setErro(r.error)
    await load()
  }

  async function ligar() {
    if (!draft) return
    setBusy("ligar")
    setErro("")
    const r = await admin(`/${idProfile}`, {
      method: "PUT",
      body: JSON.stringify({ template: TEMPLATE, data: draft.data }),
    })
    setBusy(null)
    if (r.error) return setErro(r.error)
    setDraft(null)
    await load()
    onManagedChange?.()
  }

  async function publicar(next: boolean) {
    setBusy("publicar")
    setErro("")
    const r = await admin(`/${idProfile}/publish`, {
      method: "POST",
      body: JSON.stringify({ is_published: next }),
    })
    setBusy(null)
    if (r.error) return setErro(r.error)
    await load()
  }

  async function devolverComoAdmin() {
    setBusy("devolver")
    setErro("")
    const r = await admin(`/${idProfile}`, { method: "DELETE" })
    setBusy(null)
    if (r.error) return setErro(r.error)
    await load()
    onManagedChange?.()
  }

  const b = draft?.data?.business
  const n = (v: unknown[] | undefined) => (Array.isArray(v) ? v.length : 0)
  const offer = client?.offer || null

  return (
    <>
      <div
        ref={ref}
        className="absolute top-full right-0 z-50 mt-2 max-h-[70vh] w-[25rem] overflow-y-auto border-2 border-[#0B0B0D] bg-[#15120E] p-4"
        style={{ boxShadow: `6px 6px 0 0 ${accent}` }}
      >
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[11px] font-extrabold tracking-[0.16em] text-[#9A938A] uppercase">
            {t("readyTitle", "Site pronto")}
          </p>
          <button type="button" onClick={onClose} aria-label={t("close", "Fechar")}>
            <X className="h-4 w-4 text-[#9A938A] hover:text-[#F5F1E8]" />
          </button>
        </div>

        {/* ── o lado do CLIENTE ─────────────────────────────────────────────
            Vem primeiro e vale também para o administrador que seja dono desta
            comunidade: a pergunta "tem um site esperando por mim?" é do dono do
            site, não do papel de quem olha. */}
        {!client ? (
          <p className="flex items-center gap-2 py-6 text-xs text-[#9A938A]">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("readyLoading", "Lendo o site…")}
          </p>
        ) : client.managed ? (
          /* ── o site já é feito por nós ──────────────────────────────────── */
          <>
            <p className="mb-3 flex items-center gap-2 text-xs text-[#F5F1E8]">
              <Check className="h-4 w-4" style={{ color: accent }} />
              {t("readyOnClient", "O seu site é feito pela Freelandoo.")}
            </p>

            <div className="border-2 border-[#0B0B0D] bg-[#1D1810] p-3 text-[11px] leading-snug text-[#9A938A]">
              {client.is_published && client.slug ? (
                <a
                  href={`/c/${client.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#F5F1E8] hover:underline"
                >
                  freelandoo.com.br/c/{client.slug}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                /* Sem publicar não há endereço NENHUM: o slug só é cunhado na
                   publicação ("quem publica, reserva", mig 213). */
                t("readyNoAddress", "Ainda não publicado — o endereço só é criado ao publicar.")
              )}
              {client.current?.counts?.pages ? (
                <p className="mt-1.5">
                  {t("readyPagesLive", "{n} páginas no ar").replace(
                    "{n}",
                    String(client.current.counts.pages)
                  )}
                </p>
              ) : null}
            </div>

            <p className="mt-3 text-[11px] leading-snug text-[#9A938A]">
              {t(
                "readyAskChanges",
                "Para mudar qualquer coisa, é só pedir pelo suporte que a gente aplica."
              )}
            </p>

            {/* ⚠️ A PORTA DE SAÍDA. Quem pôde aceitar tem que poder devolver —
                senão um clique de curiosidade tira da pessoa a edição do próprio
                site e a única saída vira o suporte. */}
            <button
              type="button"
              onClick={devolver}
              disabled={!!busy}
              className="mt-3 flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-transparent px-3 py-2 text-[11px] font-extrabold tracking-[0.12em] text-[#9A938A] uppercase hover:text-[#F5F1E8] disabled:opacity-50"
            >
              {busy === "devolver" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Undo2 className="h-4 w-4" />
              )}
              {t("readyBackToBuilder", "Voltar a editar eu mesmo")}
            </button>
            <p className="mt-1.5 text-[11px] leading-snug text-[#9A938A]">
              {t(
                "readyBackHint",
                "O seu site do construtor volta exatamente como estava, e o site pronto continua guardado — dá para ligá-lo de novo depois."
              )}
            </p>
          </>
        ) : offer ? (
          /* ── TEM UM SITE PRONTO ESPERANDO ───────────────────────────────── */
          <>
            <p className="mb-3 text-[11px] leading-snug text-[#9A938A]">
              {t(
                "readyWaitingLead",
                "A Freelandoo montou um site pronto para o seu negócio. Ele fica esperando até você aceitar — nada muda no seu site antes disso."
              )}
            </p>

            <div className="border-2 border-[#0B0B0D] bg-[#1D1810] p-3">
              <p className="fl-display text-xl leading-none text-[#F5F1E8]">
                {offer.summary?.business || t("swapNoName", "Seu negócio")}
              </p>
              <p className="mt-1 text-[11px] text-[#9A938A]">
                {t("readyPagesCount", "{n} páginas · uma por serviço e uma por cidade").replace(
                  "{n}",
                  String(offer.summary?.counts?.pages ?? 0)
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSwapOpen(true)}
              disabled={!!busy}
              className="mt-3 flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] px-3 py-2.5 text-[11px] font-extrabold tracking-[0.12em] uppercase disabled:opacity-50"
              style={{ background: accent, color: "#0B0B0D" }}
            >
              <Sparkles className="h-4 w-4" />
              {t("readySeeSwap", "Ver o site pronto")}
            </button>
          </>
        ) : !isAdmin ? (
          /* ── não há nada reservado: o que é o produto ───────────────────── */
          <>
            <p className="mb-3 text-[11px] leading-snug text-[#9A938A]">
              {t(
                "readyPitchLead",
                "Além do construtor, que é seu, existe o site pronto: desenhado pela Freelandoo, com uma página por serviço e uma por cidade atendida — que é o que responde em busca local."
              )}
            </p>
            <div className="border-2 border-[#0B0B0D] bg-[#1D1810] p-3">
              <p className="text-xs leading-relaxed text-[#F5F1E8]">
                {t(
                  "readyPitchBody",
                  "O site pronto é montado e mantido pela gente a partir do que você já escreveu aqui. Enquanto ele estiver ligado, a edição fica com a Freelandoo — e desligar devolve o seu site do construtor exatamente como ele estava."
                )}
              </p>
            </div>
            <p className="mt-3 text-[11px] leading-snug text-[#9A938A]">
              {t("readyPitchHow", "Fale com a gente pelo suporte para pedir o seu.")}
            </p>
          </>
        ) : null}

        {/* ── o lado da PLATAFORMA ──────────────────────────────────────────── */}
        {isAdmin ? (
          <div className="mt-4 border-t-2 border-[#0B0B0D] pt-3">
            <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[#9A938A] uppercase">
              {t("readyAdminSection", "Painel da plataforma")}
            </p>

            {!state ? (
              <p className="flex items-center gap-2 py-4 text-xs text-[#9A938A]">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("readyLoading", "Lendo o site…")}
              </p>
            ) : state.template ? (
              /* ── já está ligado ──────────────────────────────────────────── */
              <>
                <p className="mb-3 flex items-center gap-2 text-xs text-[#F5F1E8]">
                  <Check className="h-4 w-4" style={{ color: accent }} />
                  {t("readyOn", "Este site está no tema")} <strong>{state.template}</strong>
                </p>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => publicar(!state.is_published)}
                    disabled={!!busy}
                    className="flex items-center justify-center gap-2 border-2 border-[#0B0B0D] px-3 py-2 text-[11px] font-extrabold tracking-[0.12em] uppercase disabled:opacity-50"
                    style={
                      state.is_published
                        ? { background: "#1D1810", color: "#F5F1E8" }
                        : { background: accent, color: "#0B0B0D" }
                    }
                  >
                    {busy === "publicar" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {state.is_published
                      ? t("readyUnpublish", "Tirar do ar")
                      : t("readyPublish", "Publicar")}
                  </button>

                  <button
                    type="button"
                    onClick={devolverComoAdmin}
                    disabled={!!busy}
                    className="border-2 border-[#0B0B0D] bg-transparent px-3 py-2 text-[11px] font-extrabold tracking-[0.12em] text-[#9A938A] uppercase hover:text-[#F5F1E8] disabled:opacity-50"
                  >
                    {t("readyRelease", "Devolver ao construtor")}
                  </button>
                  <p className="text-[11px] leading-snug text-[#9A938A]">
                    {t(
                      "readyReleaseHint",
                      "Devolver não apaga nada: o site do construtor volta exatamente como estava, e a edição volta para o cliente."
                    )}
                  </p>
                </div>
              </>
            ) : state.offer ? (
              /* ── reservado, esperando o cliente ──────────────────────────── */
              <>
                <p className="mb-2 flex items-start gap-2 text-[11px] leading-snug text-[#F5F1E8]">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
                  {t(
                    "readyReservedLead",
                    "Reservado para o cliente aceitar. O site dele só troca quando ele apertar o botão."
                  )}
                </p>
                <button
                  type="button"
                  onClick={retirar}
                  disabled={!!busy}
                  className="w-full border-2 border-[#0B0B0D] bg-transparent px-3 py-2 text-[11px] font-extrabold tracking-[0.12em] text-[#9A938A] uppercase hover:text-[#F5F1E8] disabled:opacity-50"
                >
                  {busy === "retirar" ? (
                    <Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" />
                  ) : null}
                  {t("readyWithdraw", "Retirar a oferta")}
                </button>
              </>
            ) : (
              /* ── ainda não ligado: o que a conversão extraiu ─────────────── */
              <>
                <p className="mb-3 text-[11px] leading-snug text-[#9A938A]">
                  {t(
                    "readyDraftLead",
                    "Isto é o que o tema vai mostrar, lido do site que já está montado aqui. Nada é gravado até você ligar."
                  )}
                </p>

                {!draft ? (
                  <p className="flex items-center gap-2 py-4 text-xs text-[#9A938A]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("readyConverting", "Convertendo…")}
                  </p>
                ) : draft.error ? (
                  <p className="border-2 border-[#0B0B0D] bg-[#1D1810] p-3 text-xs text-[#F5F1E8]">
                    {draft.error}
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        [t("readyCountServices", "Serviços"), n(draft.data.services)],
                        [t("readyCountCities", "Cidades"), n(draft.data.cities)],
                        [t("readyCountFaq", "Perguntas"), n(draft.data.faq)],
                        [t("readyCountReviews", "Depoimentos"), n(draft.data.reviews)],
                      ].map(([label, value]) => (
                        <div
                          key={String(label)}
                          className="border-2 border-[#0B0B0D] bg-[#1D1810] p-2"
                        >
                          <p className="text-[10px] tracking-[0.14em] text-[#9A938A] uppercase">
                            {label}
                          </p>
                          <p className="fl-display text-xl leading-none text-[#F5F1E8]">{value}</p>
                        </div>
                      ))}
                    </div>

                    <ul className="mt-2 border-2 border-[#0B0B0D] bg-[#1D1810] p-3 text-[11px] leading-relaxed text-[#9A938A]">
                      <li>
                        {t("readyBusiness", "Negócio")}:{" "}
                        <span className="text-[#F5F1E8]">{b?.name || "—"}</span>
                      </li>
                      <li>
                        {t("readyPhone", "Telefone")}:{" "}
                        <span className="text-[#F5F1E8]">{b?.phoneDisplay || "—"}</span>
                      </li>
                      <li>
                        {t("readyCity", "Cidade")}:{" "}
                        <span className="text-[#F5F1E8]">{b?.city || "—"}</span>
                      </li>
                      <li>
                        {t("readyPhoto", "Foto do banner")}:{" "}
                        <span className="text-[#F5F1E8]">
                          {b?.heroPhoto ? t("readyYes", "sim") : t("readyNo", "não")}
                        </span>
                      </li>
                    </ul>

                    {/* ⚠️ OS AVISOS SÃO O PONTO DESTE PAINEL. A conversão deduz —
                        qual bloco é qual, o telefone, o endereço — e é aqui que a
                        dedução fica visível antes de virar o site que o cliente
                        mostra. */}
                    {draft.warnings.length > 0 && (
                      <ul className="mt-2 flex flex-col gap-2">
                        {draft.warnings.map((w, i) => (
                          <li
                            key={`${w.code}-${i}`}
                            className="flex gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] p-2.5 text-[11px] leading-snug text-[#9A938A]"
                          >
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F2B705]" />
                            <span>{w.detail}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* ⚠️ RESERVAR É O CAMINHO NORMAL, e por isso é o botão
                        cheio: quem aperta o que troca o site é o dono dele.
                        "Ligar agora" fica ao lado, apagado — ele serve o caso em
                        que o cliente já disse sim por outro canal. */}
                    <button
                      type="button"
                      onClick={reservar}
                      disabled={!!busy}
                      className="mt-3 flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] px-3 py-2.5 text-[11px] font-extrabold tracking-[0.12em] uppercase disabled:opacity-50"
                      style={{ background: accent, color: "#0B0B0D" }}
                    >
                      {busy === "reservar" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {t("readyReserve", "Reservar para o cliente aceitar")}
                    </button>

                    <button
                      type="button"
                      onClick={ligar}
                      disabled={!!busy}
                      className="mt-2 w-full border-2 border-[#0B0B0D] bg-transparent px-3 py-2 text-[11px] font-extrabold tracking-[0.12em] text-[#9A938A] uppercase hover:text-[#F5F1E8] disabled:opacity-50"
                    >
                      {busy === "ligar" ? (
                        <Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" />
                      ) : null}
                      {t("readyApply", "Ligar agora, sem perguntar")}
                    </button>
                    <p className="mt-2 text-[11px] leading-snug text-[#9A938A]">
                      {t(
                        "readyApplyHint",
                        "Ligar troca o que o endereço público vai desenhar e tira a edição do cliente. Não apaga o site do construtor, e dá para devolver a qualquer momento."
                      )}
                    </p>
                  </>
                )}
              </>
            )}
          </div>
        ) : null}

        {erro ? (
          <p className="mt-3 border-2 border-[#0B0B0D] bg-[#2a1410] p-2.5 text-[11px] leading-snug text-[#F5F1E8]">
            {erro}
          </p>
        ) : null}
      </div>

      {swapOpen && offer ? (
        <SiteSwapModal
          offer={offer}
          isPublished={!!client?.is_published}
          slug={client?.slug || null}
          busy={busy === "aceitar"}
          error={erro}
          accent={accent}
          onConfirm={aceitar}
          onClose={() => setSwapOpen(false)}
          t={t}
        />
      ) : null}
    </>
  )
}
