"use client"

// O SITE PRONTO (mig 241) — o painel que fica ao lado de "Páginas".
//
// Dois públicos, um botão:
//
//   • LÍDER — lê o que é o produto. Ele não liga nem desliga nada: o site
//     pronto é desenhado por nós, e a brecha de escrita é só nossa (é a razão
//     de `template` ser COLUNA e não campo do documento).
//   • ADMINISTRADOR DA PLATAFORMA — vê o que a conversão extraiu do site do
//     construtor, com os avisos, e decide ligar, publicar ou devolver.
//
// ⚠️ CONVERTER E LIGAR SÃO DOIS PASSOS, e o painel existe por causa disso. A
// conversão lê a intenção de blocos de texto livre e pode cair trocada; o
// resumo com os avisos é o único momento em que esse erro ainda é barato. Um
// botão que convertesse e gravasse de uma vez suprimiria exatamente esse passo.
//
// ⚠️ E A TRAVA NÃO É DAQUI. `isAdmin` decide o que DESENHAR; quem recusa é o
// `roleMiddleware` de todas as rotas de `/admin/managed-sites`. Errar para mais
// deste lado mostra um botão que o backend recusa — nunca abre uma porta.

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertTriangle, Check, ExternalLink, Loader2, Sparkles, X } from "lucide-react"
import { getToken } from "@/lib/auth"

/** O tema que este painel sabe oferecer. Tema novo entra aqui e no backend. */
const TEMPLATE = "oficina-local"

type Warning = { code: string; detail: string }

type ManagedState = {
  exists: boolean
  managed: boolean
  template: string | null
  slug: string | null
  is_published: boolean
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

async function api(path: string, init?: RequestInit) {
  const token = getToken()
  const res = await fetch(`/api/admin/managed-sites${path}`, {
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
  t,
}: {
  idProfile: string
  accent: string
  isAdmin: boolean
  onClose: () => void
  t: (key: string, fallback: string) => string
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [state, setState] = useState<ManagedState | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [erro, setErro] = useState("")

  // Fecha com clique fora e com Esc — as duas saídas que todo painel da casa
  // tem, e a razão de o gatilho carregar `data-ready-trigger`: sem ignorá-lo,
  // o mousedown fecharia e o clique reabriria, e o botão nunca fecharia o que
  // abriu.
  useEffect(() => {
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
  }, [onClose])

  const load = useCallback(async () => {
    // ⚠️ Nada é buscado para quem não é administrador: o líder não tem acesso a
    // estas rotas, e pedi-las só renderia um 403 por trás de um painel que já
    // sabia a resposta. Mesma disciplina do `onOpen` da gaveta de números.
    if (!isAdmin) return
    setErro("")
    const st: ManagedState = await api(`/${idProfile}`)
    setState(st)
    if (st.error) {
      setErro(st.error)
      return
    }
    // A conversão só é pedida quando ainda não há tema: com o site já ligado, o
    // que vale é o conteúdo GRAVADO, e mostrar a conversão do canvas ao lado
    // dele sugeriria que ela é o que está no ar.
    if (!st.template) {
      const d: Draft = await api(`/${idProfile}/from-canvas?template=${TEMPLATE}`)
      setDraft(d.error ? { data: {}, warnings: [], error: d.error } : d)
    }
  }, [idProfile, isAdmin])

  useEffect(() => {
    void load()
  }, [load])

  async function ligar() {
    if (!draft) return
    setBusy("ligar")
    setErro("")
    const r = await api(`/${idProfile}`, {
      method: "PUT",
      body: JSON.stringify({ template: TEMPLATE, data: draft.data }),
    })
    setBusy(null)
    if (r.error) return setErro(r.error)
    setDraft(null)
    await load()
  }

  async function publicar(next: boolean) {
    setBusy("publicar")
    setErro("")
    const r = await api(`/${idProfile}/publish`, {
      method: "POST",
      body: JSON.stringify({ is_published: next }),
    })
    setBusy(null)
    if (r.error) return setErro(r.error)
    await load()
  }

  async function devolver() {
    setBusy("devolver")
    setErro("")
    const r = await api(`/${idProfile}`, { method: "DELETE" })
    setBusy(null)
    if (r.error) return setErro(r.error)
    await load()
  }

  const b = draft?.data?.business
  const n = (v: unknown[] | undefined) => (Array.isArray(v) ? v.length : 0)

  return (
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

      {/* ── o que é, para quem não administra ─────────────────────────────── */}
      {!isAdmin ? (
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
      ) : !state ? (
        <p className="flex items-center gap-2 py-6 text-xs text-[#9A938A]">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("readyLoading", "Lendo o site…")}
        </p>
      ) : state.template ? (
        /* ── já está ligado ──────────────────────────────────────────────── */
        <>
          <p className="mb-3 flex items-center gap-2 text-xs text-[#F5F1E8]">
            <Check className="h-4 w-4" style={{ color: accent }} />
            {t("readyOn", "Este site está no tema")} <strong>{state.template}</strong>
          </p>

          <div className="border-2 border-[#0B0B0D] bg-[#1D1810] p-3 text-[11px] leading-snug text-[#9A938A]">
            {state.is_published && state.slug ? (
              <a
                href={`/c/${state.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[#F5F1E8] hover:underline"
              >
                freelandoo.com.br/c/{state.slug}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              /* ⚠️ Sem publicar não há endereço NENHUM: o slug só é cunhado na
                 publicação ("quem publica, reserva", mig 213). Dizer isso aqui
                 evita a procura por um link que ainda não existe. */
              t("readyNoAddress", "Ainda não publicado — o endereço só é criado ao publicar.")
            )}
          </div>

          <div className="mt-3 flex flex-col gap-2">
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
              onClick={devolver}
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
      ) : (
        /* ── ainda não ligado: o que a conversão extraiu ──────────────────── */
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
                  <div key={String(label)} className="border-2 border-[#0B0B0D] bg-[#1D1810] p-2">
                    <p className="text-[10px] tracking-[0.14em] text-[#9A938A] uppercase">
                      {label}
                    </p>
                    <p className="fl-display text-xl leading-none text-[#F5F1E8]">{value}</p>
                  </div>
                ))}
              </div>

              <ul className="mt-2 border-2 border-[#0B0B0D] bg-[#1D1810] p-3 text-[11px] leading-relaxed text-[#9A938A]">
                <li>
                  {t("readyBusiness", "Negócio")}: <span className="text-[#F5F1E8]">{b?.name || "—"}</span>
                </li>
                <li>
                  {t("readyPhone", "Telefone")}:{" "}
                  <span className="text-[#F5F1E8]">{b?.phoneDisplay || "—"}</span>
                </li>
                <li>
                  {t("readyCity", "Cidade")}: <span className="text-[#F5F1E8]">{b?.city || "—"}</span>
                </li>
                <li>
                  {t("readyPhoto", "Foto do banner")}:{" "}
                  <span className="text-[#F5F1E8]">
                    {b?.heroPhoto ? t("readyYes", "sim") : t("readyNo", "não")}
                  </span>
                </li>
              </ul>

              {/* ⚠️ OS AVISOS SÃO O PONTO DESTE PAINEL. A conversão deduz — qual
                  bloco é qual, o telefone, o endereço — e é aqui que a dedução
                  fica visível antes de virar o site que o cliente mostra. */}
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

              <button
                type="button"
                onClick={ligar}
                disabled={!!busy}
                className="mt-3 flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] px-3 py-2.5 text-[11px] font-extrabold tracking-[0.12em] uppercase disabled:opacity-50"
                style={{ background: accent, color: "#0B0B0D" }}
              >
                {busy === "ligar" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {t("readyApply", "Ligar o site pronto")}
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

      {erro ? (
        <p className="mt-3 border-2 border-[#0B0B0D] bg-[#2a1410] p-2.5 text-[11px] leading-snug text-[#F5F1E8]">
          {erro}
        </p>
      ) : null}
    </div>
  )
}
