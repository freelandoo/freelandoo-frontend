"use client"

// Painel de endereços do site: o /c/<slug>, o subdomínio e os domínios próprios.
//
// A tela é organizada pelo que a PESSOA precisa fazer, não pelo que o sistema
// guarda. Por isso cada domínio mostra sempre uma frase de estado e, quando há
// algo a fazer, o registro de DNS pronto para copiar — o erro clássico deste
// tipo de fluxo é dizer "pendente" e deixar a pessoa adivinhar o que falta.

import { useCallback, useEffect, useState } from "react"
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react"
import { getToken } from "@/lib/auth"
import { copyText } from "@/lib/clipboard"

type DomainStatus = "pending" | "verified" | "active" | "error"

/**
 * Um registro de DNS pronto para colar no painel do registrador.
 *
 * ⚠️ VEM MONTADO DO BACKEND, e não é remontado aqui. O valor de rota é o que a
 * Vercel respondeu naquele momento (o IP do ápice e o CNAME já mudaram, e o
 * CNAME é específico da conta) — recalcular ou completar qualquer pedaço deste
 * objeto na tela é como o painel volta a mandar o cliente apontar o domínio
 * dele para o servidor de outra pessoa.
 */
type DnsRecord = {
  purpose: "verify" | "route" | "optional"
  type: string
  /** Relativo à zona — é o que o campo "Nome/Host" dos painéis espera. */
  name: string
  /** O nome completo, para os poucos painéis que pedem o FQDN. */
  host: string
  value: string
}

type SiteDomain = {
  id_domain: number
  domain: string
  status: DomainStatus
  verified_at: string | null
  provider: string
  last_error: string | null
  last_checked_at: string | null
  created_at: string
  verification: { host: string; type: string; value: string }
  /** Opcional: backend anterior a esta mudança não manda. */
  records?: DnsRecord[]
}

type ListResponse = {
  domains: SiteDomain[]
  slug: string | null
  provider: string
  max_domains: number
  error?: string
}

// O copiar (com o fallback fora de HTTPS) virou peça única em lib/clipboard —
// o aviãozinho de convite dos headcards usa o mesmo.
const copy = copyText

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="min-w-0">
      <span className="block text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
        {label}
      </span>
      <button
        type="button"
        onClick={async () => {
          if (await copy(value)) {
            setCopied(true)
            setTimeout(() => setCopied(false), 1600)
          }
        }}
        className="mt-0.5 flex w-full items-center gap-2 border-2 border-[#0B0B0D] bg-[#0B0B0D] px-2 py-1.5 text-left"
        title={value}
      >
        <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#F5F1E8]">
          {value}
        </code>
        {copied ? (
          <Check className="h-3.5 w-3.5 shrink-0 text-[#4fc95a]" />
        ) : (
          <Copy className="h-3.5 w-3.5 shrink-0 text-[#9A938A]" />
        )}
      </button>
    </div>
  )
}

/**
 * Uma linha de registro: o que ela SERVE em texto, e os dois campos que a
 * pessoa realmente copia.
 *
 * O propósito vem escrito porque a diferença entre os registros não é óbvia
 * para quem não mexe com DNS: um prova que o domínio é dela, o outro é o que
 * de fato coloca o site no ar. Sem essa linha, alguém cria só o primeiro,
 * verifica, e fica esperando um site que nunca vai responder.
 */
function DnsRecordRow({
  record,
  t,
}: {
  record: DnsRecord
  t: (key: string, fallback: string) => string
}) {
  const purpose =
    record.purpose === "verify"
      ? t("dnsPurposeVerify", "Confirma que o domínio é seu")
      : record.purpose === "optional"
        ? t("dnsPurposeOptional", "Opcional — faz o endereço com www funcionar também")
        : t("dnsPurposeRoute", "É este que coloca o site no ar")

  return (
    <div className="border-2 border-[#0B0B0D] bg-[#15120E] p-2.5">
      <div className="mb-2 flex items-center gap-2">
        <span className="shrink-0 border-2 border-[#0B0B0D] bg-[#0B0B0D] px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-[#F2B705]">
          {record.type}
        </span>
        <span className="min-w-0 flex-1 text-[10px] leading-tight text-[#9A938A]">
          {purpose}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <CopyField label={t("dnsHost", "Nome / Host")} value={record.name} />
        <CopyField label={t("dnsValue", "Valor")} value={record.value} />
      </div>
      {/* O relativo resolve em quase todo painel; o completo fica à mão para
          os que pedem o FQDN, sem competir com o campo que se copia. */}
      {record.name !== record.host && (
        <p className="mt-1.5 truncate font-mono text-[9px] text-[#6b655d]" title={record.host}>
          {t("dnsFullHost", "Nome completo:")} {record.host}
        </p>
      )}
    </div>
  )
}

/**
 * Os registros a mostrar, com degradação para o formato antigo.
 *
 * O front pode subir antes do backend: nesse intervalo `records` não vem, e
 * cair no `verification` mantém a tela útil (só o TXT, como era) em vez de
 * mostrar um quadro vazio onde antes havia instrução.
 */
function recordsOf(d: SiteDomain): DnsRecord[] {
  if (d.records?.length) return d.records
  return [
    {
      purpose: "verify",
      type: d.verification.type,
      name: d.verification.host,
      host: d.verification.host,
      value: d.verification.value,
    },
  ]
}

export function SiteDomainsPanel({
  idProfile,
  accent,
  onClose,
  t,
}: {
  idProfile: string
  accent: string
  onClose: () => void
  t: (key: string, fallback: string) => string
}) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ListResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | "new" | "slug" | null>(null)
  const [newDomain, setNewDomain] = useState("")
  const [editingSlug, setEditingSlug] = useState(false)
  const [slugDraft, setSlugDraft] = useState("")

  const authHeaders = useCallback((): Record<string, string> => {
    const token = getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/communities/${idProfile}/site/domains`, {
        headers: authHeaders(),
      })
      const json = (await res.json()) as ListResponse
      if (!res.ok || json.error) {
        setError(json.error || t("domainsLoadError", "Não foi possível carregar os domínios."))
        return
      }
      setData(json)
      setSlugDraft(json.slug || "")
      setError(null)
    } catch {
      setError(t("domainsLoadError", "Não foi possível carregar os domínios."))
    } finally {
      setLoading(false)
    }
  }, [idProfile, authHeaders, t])

  useEffect(() => {
    void load()
  }, [load])

  const act = useCallback(
    async (id: number | "new" | "slug", run: () => Promise<void>) => {
      setBusyId(id)
      try {
        await run()
      } finally {
        setBusyId(null)
      }
    },
    []
  )

  const addDomain = () =>
    act("new", async () => {
      const res = await fetch(`/api/communities/${idProfile}/site/domains`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ domain: newDomain }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error || t("domainAddError", "Não foi possível adicionar o domínio."))
        return
      }
      setNewDomain("")
      setError(null)
      await load()
    })

  const runOn = (id: number, path: string, method = "POST") =>
    act(id, async () => {
      const res = await fetch(
        `/api/communities/${idProfile}/site/domains/${id}${path}`,
        { method, headers: authHeaders() }
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json.error) {
        setError(json.error || t("domainActionError", "A ação não pôde ser concluída."))
      } else {
        setError(null)
      }
      await load()
    })

  const saveSlug = () =>
    act("slug", async () => {
      const res = await fetch(`/api/communities/${idProfile}/site/slug`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ slug: slugDraft }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error || t("slugError", "Não foi possível mudar o endereço."))
        return
      }
      setEditingSlug(false)
      setError(null)
      await load()
    })

  const STATUS: Record<DomainStatus, { label: string; color: string; hint: string }> = {
    pending: {
      label: t("domainPending", "Aguardando DNS"),
      color: "#ff8c2e",
      hint: t(
        "domainPendingHint",
        "Crie o registro TXT abaixo no painel do seu domínio e clique em Verificar."
      ),
    },
    verified: {
      label: t("domainVerified", "Verificado"),
      color: "#16c8e8",
      hint: t(
        "domainVerifiedHint",
        "Posse confirmada. O certificado de segurança está sendo emitido — isso pode levar alguns minutos."
      ),
    },
    active: {
      label: t("domainActive", "No ar"),
      color: "#4fc95a",
      hint: t("domainActiveHint", "O site já responde neste domínio."),
    },
    error: {
      label: t("domainError", "Com problema"),
      color: "#ff5a44",
      hint: t("domainErrorHint", "Algo falhou. Confira o DNS e tente de novo."),
    },
  }

  const publicOrigin =
    typeof window !== "undefined" ? window.location.origin : "https://freelandoo.com.br"

  return (
    <div
      className="absolute right-0 top-full z-50 mt-2 max-h-[70vh] w-[min(92vw,520px)] overflow-y-auto border-2 border-[#0B0B0D] bg-[#15120E] p-4"
      style={{ boxShadow: "6px 6px 0 0 #0B0B0D" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
          {t("domainsTitle", "Endereço do site")}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close", "Fechar")}
          className="grid h-6 w-6 place-items-center border-2 border-[#0B0B0D] bg-[#1D1810] text-[#F5F1E8]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {error && (
        <div className="mb-3 border-2 border-[#0B0B0D] bg-[#2a1410] px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#ff8c7a]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: accent }} />
        </div>
      ) : !data?.slug ? (
        <p className="py-6 text-center text-xs text-[#9A938A]">
          {t("publishFirst", "Publique o site para ele ganhar um endereço.")}
        </p>
      ) : (
        <>
          {/* ── Endereço na plataforma ── */}
          <section className="mb-5 border-2 border-[#0B0B0D] bg-[#1D1810] p-3">
            <span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
              {t("slugTitle", "Endereço na Freelandoo")}
            </span>

            {editingSlug ? (
              <div className="flex items-center gap-1.5">
                <span className="shrink-0 font-mono text-[11px] text-[#9A938A]">/c/</span>
                <input
                  value={slugDraft}
                  onChange={(e) => setSlugDraft(e.target.value)}
                  spellCheck={false}
                  className="min-w-0 flex-1 border-2 border-[#0B0B0D] bg-[#0B0B0D] px-2 py-1.5 font-mono text-[11px] text-[#F5F1E8] outline-none focus:border-[#F2B705]"
                />
                <button
                  type="button"
                  onClick={saveSlug}
                  disabled={busyId === "slug"}
                  className="grid h-8 w-8 place-items-center border-2 border-[#0B0B0D] disabled:opacity-60"
                  style={{ background: accent, color: "#0B0B0D" }}
                  aria-label={t("save", "Salvar")}
                >
                  {busyId === "slug" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSlug(false)
                    setSlugDraft(data.slug || "")
                  }}
                  className="grid h-8 w-8 place-items-center border-2 border-[#0B0B0D] bg-[#15120E] text-[#F5F1E8]"
                  aria-label={t("cancel", "Cancelar")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#F5F1E8]">
                  {publicOrigin}/c/{data.slug}
                </code>
                <a
                  href={`/c/${data.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-8 w-8 place-items-center border-2 border-[#0B0B0D] bg-[#15120E] text-[#F5F1E8]"
                  aria-label={t("open", "Abrir")}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setEditingSlug(true)}
                  className="grid h-8 w-8 place-items-center border-2 border-[#0B0B0D] bg-[#15120E] text-[#F5F1E8]"
                  aria-label={t("slugEdit", "Mudar endereço")}
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            )}

            {editingSlug && (
              <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-[#ff8c2e]">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                {t(
                  "slugWarning",
                  "Ao mudar o endereço, os links antigos param de funcionar."
                )}
              </p>
            )}
          </section>

          {/* ── Domínios próprios ── */}
          <section>
            <span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
              {t("customDomainsTitle", "Domínio próprio")}
            </span>

            {data.domains.length === 0 && (
              <p className="mb-3 text-[11px] leading-relaxed text-[#9A938A]">
                {t(
                  "customDomainsEmpty",
                  "Ligue um domínio que você já tem, como suacomunidade.com.br."
                )}
              </p>
            )}

            <div className="flex flex-col gap-3">
              {data.domains.map((d) => {
                const meta = STATUS[d.status]
                const busy = busyId === d.id_domain
                return (
                  <article key={d.id_domain} className="border-2 border-[#0B0B0D] bg-[#1D1810] p-3">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 shrink-0" style={{ color: meta.color }} />
                      <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-[#F5F1E8]">
                        {d.domain}
                      </code>
                      <span
                        className="shrink-0 border-2 border-[#0B0B0D] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.1em]"
                        style={{ color: meta.color }}
                      >
                        {meta.label}
                      </span>
                    </div>

                    <p className="mt-2 text-[10px] leading-relaxed text-[#9A938A]">
                      {d.last_error || meta.hint}
                    </p>

                    {/* Fica de pé até o domínio estar no ar: enquanto não
                        estiver, sempre há um registro faltando — e a pessoa
                        precisa dele na mão, não numa frase genérica. */}
                    {d.status !== "active" && (
                      <div className="mt-3 flex flex-col gap-2 border-t-2 border-[#0B0B0D] pt-3">
                        <p className="text-[10px] leading-relaxed text-[#9A938A]">
                          {t(
                            "dnsRecordsIntro",
                            "Crie estes registros no painel do seu domínio e clique em Verificar."
                          )}
                        </p>
                        {recordsOf(d).map((r) => (
                          <DnsRecordRow key={`${r.type}:${r.host}:${r.value}`} record={r} t={t} />
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {d.status !== "active" && (
                        <button
                          type="button"
                          onClick={() =>
                            runOn(
                              d.id_domain,
                              d.status === "pending" ? "/verify" : "/refresh"
                            )
                          }
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 border-2 border-[#0B0B0D] px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] disabled:opacity-60"
                          style={{ background: accent, color: "#0B0B0D" }}
                        >
                          {busy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          {d.status === "pending"
                            ? t("domainVerifyAction", "Verificar")
                            : t("domainRefreshAction", "Checar de novo")}
                        </button>
                      )}
                      {d.status === "active" && (
                        <a
                          href={`https://${d.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 border-2 border-[#0B0B0D] bg-[#15120E] px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#F5F1E8]"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {t("open", "Abrir")}
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => runOn(d.id_domain, "", "DELETE")}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 border-2 border-[#0B0B0D] bg-[#15120E] px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#ff5a44] disabled:opacity-60"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t("remove", "Remover")}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>

            {data.domains.length < data.max_domains && (
              <div className="mt-3 flex items-center gap-1.5">
                <input
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder={t("domainPlaceholder", "suacomunidade.com.br")}
                  spellCheck={false}
                  className="min-w-0 flex-1 border-2 border-[#0B0B0D] bg-[#0B0B0D] px-2 py-2 font-mono text-[11px] text-[#F5F1E8] outline-none focus:border-[#F2B705]"
                />
                <button
                  type="button"
                  onClick={addDomain}
                  disabled={busyId === "new" || !newDomain.trim()}
                  className="inline-flex shrink-0 items-center gap-1.5 border-2 border-[#0B0B0D] px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.1em] disabled:opacity-40"
                  style={{ background: accent, color: "#0B0B0D" }}
                >
                  {busyId === "new" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  {t("domainAdd", "Ligar")}
                </button>
              </div>
            )}

            {/* ⚠️ Esta frase só aparece quando NÃO temos o valor real para dar.
                Com o provedor automatizado ligado, os registros de rota vêm
                prontos acima — repetir a instrução genérica aqui faria a tela
                dizer duas vezes a mesma coisa, uma delas sem o valor. */}
            {data.provider === "manual" && (
              <p className="mt-3 text-[10px] leading-relaxed text-[#9A938A]">
                {t(
                  "domainDnsHelp",
                  "Depois de verificar, aponte o domínio para a Freelandoo no painel do seu registrador (registro A para o domínio raiz, ou CNAME para subdomínio)."
                )}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
