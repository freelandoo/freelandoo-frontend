"use client"

/**
 * Base de conhecimento do Atendente com IA (mig 253) — a tela do DONO.
 *
 * ─── O QUE ELA RESOLVE ──────────────────────────────────────────────────────
 *
 * O atendente já sabe o que a plataforma sabe: perfis, serviços, produtos,
 * cursos e o site. O que ela NÃO sabe é o que só existe na cabeça do dono —
 * horário de atendimento, política de garantia, a tabela de preço que ele
 * manda por PDF, o que ele NÃO faz. É isso que entra aqui.
 *
 * ⚠️ DOIS NÚMEROS, NÃO UM: "tenho N documentos" e "a IA lê M" são coisas
 * diferentes. Documento desligado continua guardado e NÃO entra no dossiê —
 * mostrar só o total faria o dono achar que ela sabe o que não sabe.
 *
 * ⚠️ O PDF VAI DIRETO NO RAILWAY, sem passar pelo proxy da Vercel: o corpo que
 * atravessa a Vercel é limitado a ~4,5MB e o teto do arquivo aqui é 10MB. Um
 * PDF de 6MB pelo proxy falharia com um erro que não fala de tamanho nenhum, e
 * o dono acharia que o arquivo dele é que está quebrado. O resto (lista, texto,
 * edição, prévia) é JSON pequeno e vai pelo proxy, como de praxe.
 *
 * ⚠️ A PORTA DESTA TELA É ESPELHO, NÃO REGRA (ver `account-tools.ts`): quem
 * decide o direito é o backend (`requireAiAccess`). Errar aqui esconde um
 * botão; errar lá abriria a porta.
 */

import { useCallback, useEffect, useState } from "react"
import {
  AlertTriangle,
  BookOpen,
  Eye,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getPublicBackendUrl } from "@/lib/backend-public"
import { PageBackLink } from "@/components/tabloide/PageBackLink"

type Doc = {
  id_knowledge: string
  source: "text" | "pdf"
  title: string
  file_name: string | null
  char_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

type ListPayload = { docs: Doc[]; limit: number; active: number }

async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    data = { error: text }
  }
  if (!res.ok) throw new Error((data as { error?: string })?.error || `HTTP ${res.status}`)
  return data as T
}

export default function AtendenteKnowledgePage() {
  const t = useTranslations("AiAttendant")

  const [payload, setPayload] = useState<ListPayload | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)

  const [titulo, setTitulo] = useState("")
  const [conteudo, setConteudo] = useState("")
  const [previa, setPrevia] = useState<{ dossie: string; chars: number } | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      setPayload(await api<ListPayload>("/api/me/atendimento-ai/knowledge"))
    } catch (e) {
      setErro(e instanceof Error ? e.message : t("loadFail", "Não consegui carregar."))
    } finally {
      setCarregando(false)
    }
  }, [t])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function criarTexto() {
    if (!titulo.trim() || !conteudo.trim()) return
    setOcupado("create")
    setErro(null)
    setAviso(null)
    try {
      await api("/api/me/atendimento-ai/knowledge", {
        method: "POST",
        body: JSON.stringify({ title: titulo.trim(), content: conteudo.trim() }),
      })
      setTitulo("")
      setConteudo("")
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : t("saveFail", "Não consegui salvar."))
    } finally {
      setOcupado(null)
    }
  }

  async function enviarPdf(file: File) {
    setOcupado("pdf")
    setErro(null)
    setAviso(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const token = getToken()
      // ⚠️ Direto no Railway: ver o cabeçalho deste arquivo (limite de corpo).
      const res = await fetch(`${getPublicBackendUrl()}/me/atendimento-ai/knowledge/pdf`, {
        method: "POST",
        headers: { Authorization: token ? `Bearer ${token}` : "" },
        body: fd,
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        pages?: number
        truncated?: boolean
      }
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      if (data.truncated) {
        // Dito em voz alta: sem isso o dono acha que a IA leu o manual inteiro.
        setAviso(
          t(
            "pdfTruncated",
            "O PDF era grande e só uma parte dele entrou. Confira na prévia o que a IA está lendo."
          )
        )
      }
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : t("pdfFail", "Não consegui ler este PDF."))
    } finally {
      setOcupado(null)
    }
  }

  async function alternar(doc: Doc) {
    setOcupado(`toggle:${doc.id_knowledge}`)
    try {
      await api(`/api/me/atendimento-ai/knowledge/${doc.id_knowledge}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !doc.is_active }),
      })
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : t("saveFail", "Não consegui salvar."))
    } finally {
      setOcupado(null)
    }
  }

  async function apagar(doc: Doc) {
    if (!window.confirm(t("deleteConfirm", "Apagar este documento? Não dá para desfazer."))) return
    setOcupado(`del:${doc.id_knowledge}`)
    try {
      await api(`/api/me/atendimento-ai/knowledge/${doc.id_knowledge}`, { method: "DELETE" })
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : t("deleteFail", "Não consegui apagar."))
    } finally {
      setOcupado(null)
    }
  }

  async function verPrevia() {
    setOcupado("preview")
    setErro(null)
    try {
      const r = await api<{ dossie: string; chars: number }>("/api/me/atendimento-ai/preview")
      setPrevia(r)
    } catch (e) {
      setErro(e instanceof Error ? e.message : t("loadFail", "Não consegui carregar."))
    } finally {
      setOcupado(null)
    }
  }

  const docs = payload?.docs || []
  const cheio = payload ? docs.length >= payload.limit : false

  return (
    <div className="fl-sharp min-h-screen bg-[#0b0804] text-[#F5F1E8]">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <PageBackLink href="/account" className="mb-5" />

        <header className="mb-6">
          <h1 className="fl-display text-3xl">{t("title", "Atendente com IA")}</h1>
          <p className="mt-2 text-sm text-[#9A938A]">
            {t(
              "intro",
              "A plataforma responde pelo seu negócio usando o que já está cadastrado aqui (perfis, serviços, produtos, cursos e site). O que só você sabe — horário, garantia, tabela de preço, o que você não faz — entra abaixo."
            )}
          </p>
        </header>

        {erro && (
          <div className="mb-4 border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {erro}
          </div>
        )}
        {aviso && (
          <div className="mb-4 flex items-start gap-2 border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{aviso}</span>
          </div>
        )}

        {carregando ? (
          <div className="flex items-center gap-2 py-10 text-[#9A938A]">
            <Loader2 className="h-4 w-4 animate-spin" /> {t("loading", "Carregando…")}
          </div>
        ) : (
          <>
            <section className="mb-8 border border-[#0B0B0D] bg-[#15120E] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#9A938A]">
                  <BookOpen className="h-4 w-4" /> {t("docsTitle", "Base de conhecimento")}
                </h2>
                <span className="text-xs text-[#9A938A]">
                  {/* Os DOIS números: o total e o que a IA realmente lê. */}
                  {t("docsCount", "{n} documentos · a IA lê {m}")
                    .replace("{n}", String(docs.length))
                    .replace("{m}", String(payload?.active ?? 0))}
                </span>
              </div>

              {!docs.length ? (
                <p className="py-6 text-sm text-[#9A938A]">
                  {t(
                    "docsEmpty",
                    "Nada aqui ainda. O atendente já responde com o que está cadastrado na sua conta — o que você escrever abaixo entra junto."
                  )}
                </p>
              ) : (
                <ul className="divide-y divide-[#0B0B0D]">
                  {docs.map((d) => (
                    <li key={d.id_knowledge} className="flex flex-wrap items-center gap-3 py-3">
                      <span className="text-[#9A938A]">
                        {d.source === "pdf" ? (
                          <FileText className="h-4 w-4" />
                        ) : (
                          <BookOpen className="h-4 w-4" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{d.title}</span>
                        <span className="block text-xs text-[#9A938A]">
                          {d.file_name ? `${d.file_name} · ` : ""}
                          {t("chars", "{n} caracteres").replace(
                            "{n}",
                            new Intl.NumberFormat().format(d.char_count)
                          )}
                        </span>
                      </span>
                      <label className="flex items-center gap-2 text-xs text-[#9A938A]">
                        <input
                          type="checkbox"
                          checked={d.is_active}
                          disabled={ocupado === `toggle:${d.id_knowledge}`}
                          onChange={() => alternar(d)}
                        />
                        {t("active", "A IA lê")}
                      </label>
                      <button
                        onClick={() => apagar(d)}
                        disabled={ocupado === `del:${d.id_knowledge}`}
                        aria-label={t("delete", "Apagar")}
                        className="border border-red-600/50 px-2 py-1 text-red-200 hover:bg-red-500/10 disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {cheio && (
                <p className="mt-3 text-xs text-amber-300">
                  {t("limitReached", "Você chegou ao limite de documentos. Apague algum para acrescentar outro.")}
                </p>
              )}
            </section>

            <section className="mb-8 grid gap-4 md:grid-cols-2">
              <div className="border border-[#0B0B0D] bg-[#15120E] p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#9A938A]">
                  {t("newText", "Escrever um documento")}
                </h3>
                <input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder={t("titlePlaceholder", "Título (ex.: Horário e formas de pagamento)")}
                  className="mb-2 w-full border border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-sm"
                />
                <textarea
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  rows={6}
                  placeholder={t(
                    "contentPlaceholder",
                    "Escreva como você explicaria a um cliente no balcão."
                  )}
                  className="mb-3 w-full border border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-sm"
                />
                <button
                  onClick={criarTexto}
                  disabled={!titulo.trim() || !conteudo.trim() || cheio || ocupado === "create"}
                  className="inline-flex items-center gap-2 border border-[#F2B705] px-3 py-1.5 text-sm text-[#F2B705] hover:bg-[#F2B705]/10 disabled:opacity-40"
                >
                  {ocupado === "create" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  {t("add", "Acrescentar")}
                </button>
              </div>

              <div className="border border-[#0B0B0D] bg-[#15120E] p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#9A938A]">
                  {t("newPdf", "Mandar um PDF")}
                </h3>
                <p className="mb-3 text-xs text-[#9A938A]">
                  {t(
                    "pdfHint",
                    "Tabela de preço, catálogo, manual. A plataforma guarda o TEXTO do arquivo, não o arquivo."
                  )}
                </p>
                <label className="inline-flex cursor-pointer items-center gap-2 border border-[#0B0B0D] bg-[#1D1810] px-3 py-1.5 text-sm hover:bg-[#241d13]">
                  {ocupado === "pdf" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {t("choosePdf", "Escolher PDF")}
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    disabled={cheio || ocupado === "pdf"}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      e.target.value = ""
                      if (f) void enviarPdf(f)
                    }}
                  />
                </label>
              </div>
            </section>

            <section className="border border-[#0B0B0D] bg-[#15120E] p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[#9A938A]">
                  {t("previewTitle", "O que a IA lê")}
                </h3>
                <button
                  onClick={verPrevia}
                  disabled={ocupado === "preview"}
                  className="inline-flex items-center gap-2 border border-[#0B0B0D] bg-[#1D1810] px-3 py-1.5 text-sm hover:bg-[#241d13] disabled:opacity-40"
                >
                  {ocupado === "preview" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                  {t("preview", "Ver a prévia")}
                </button>
              </div>
              <p className="mb-3 text-xs text-[#9A938A]">
                {t(
                  "previewHint",
                  "É exatamente o texto que vai junto de cada resposta. Se algo estiver errado aqui, o atendente vai repetir o erro."
                )}
              </p>
              {previa && (
                <>
                  <div className="mb-2 text-xs text-[#9A938A]">
                    {t("chars", "{n} caracteres").replace(
                      "{n}",
                      new Intl.NumberFormat().format(previa.chars)
                    )}
                  </div>
                  <pre className="max-h-96 overflow-auto whitespace-pre-wrap border border-[#0B0B0D] bg-[#0b0804] p-3 text-xs text-[#C9C2B6]">
                    {previa.dossie}
                  </pre>
                </>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
