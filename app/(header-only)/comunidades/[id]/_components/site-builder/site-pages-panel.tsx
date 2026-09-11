"use client"

// As SUB-PÁGINAS do site (mig 238): criar, renomear, ligar/desligar, apagar e
// escolher qual delas a prancheta está editando.
//
// ═══ POR QUE A HOME É UMA LINHA DESTA LISTA ═══
//
// Ela não é uma página do array `pages` — é o `sections` do documento. Mas para
// quem edita, "a home" e "a página de Aguaí" são a mesma coisa: pilhas de seção
// com endereços diferentes. Deixá-la fora da lista obrigaria o líder a achar
// outro botão para voltar, e voltar é o que mais se faz.
//
// ═══ O ENDEREÇO É DERIVADO DO TÍTULO, E DEPOIS CONGELA ═══
//
// Digitar nome e endereço separados é trabalho dobrado no caso comum, então o
// slug sai do título na criação. Mas ele NÃO acompanha o título depois: uma vez
// publicado, o endereço é o que está no Google e no que as pessoas colaram por
// aí — renomear "Aguaí" para "Região de Aguaí" não pode quebrar o link.
//
// ═══ TÍTULO E DESCRIÇÃO SÃO SEO, NÃO ENFEITE ═══
//
// Os dois campos vão para a aba do navegador e para o resultado de busca (ver o
// `generateMetadata` das rotas de sub-página). Esconder a descrição aqui seria
// deixar de fora metade do motivo pelo qual esta feature existe.

import { useCallback, useEffect, useRef, useState } from "react"
import { Check, Home, Plus, Trash2, X } from "lucide-react"
import { newLocalId, type SitePage } from "@/types/community-site"

/** Título → endereço: sem acento, minúsculo, só letra, número e hífen. */
export function slugifyPage(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
}

/**
 * Espelho do `RESERVED_PAGE_SLUGS` do backend (utils/communitySite.js).
 *
 * Aqui ele serve para AVISAR antes de criar; quem recusa de verdade continua
 * sendo o backend, que descarta a página com slug reservado. Errar para mais
 * deste lado esconde um botão; errar para menos só adianta a recusa.
 */
const RESERVED = new Set([
  "agendar",
  "api",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
])

/** Teto do backend (LIMITS.PAGES). Passar disso faria o save descartar o resto. */
const MAX_PAGES = 12

export function SitePagesPanel({
  pages,
  activePageId,
  onSelect,
  onChange,
  onClose,
  accent,
  t,
}: {
  pages: SitePage[]
  /** `null` = a home está na prancheta. */
  activePageId: string | null
  onSelect: (pageId: string | null) => void
  onChange: (next: SitePage[]) => void
  onClose: () => void
  accent: string
  t: (key: string, fallback: string) => string
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [novo, setNovo] = useState("")
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onEsc)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onEsc)
    }
  }, [onClose])

  const criar = useCallback(() => {
    const title = novo.trim()
    if (!title) return
    if (pages.length >= MAX_PAGES) {
      setErro(t("pageLimit", "Este site já está no limite de páginas."))
      return
    }
    const slug = slugifyPage(title)
    if (!slug) {
      setErro(t("pageSlugInvalid", "Esse nome não vira um endereço. Use letras ou números."))
      return
    }
    if (RESERVED.has(slug)) {
      setErro(t("pageSlugReserved", "Esse endereço é usado pela plataforma. Escolha outro nome."))
      return
    }
    if (pages.some((p) => p.slug === slug)) {
      setErro(t("pageSlugTaken", "Já existe uma página nesse endereço."))
      return
    }
    const page: SitePage = {
      id: newLocalId(),
      slug,
      title,
      subtitle: "",
      enabled: true,
      // Nasce VAZIA de propósito: uma página semeada com seções que o líder não
      // pediu seria trabalho de apagar, e ele acabou de dizer o que quer com o
      // nome que deu. O canvas mostra o menu de adicionar seção.
      sections: [],
    }
    onChange([...pages, page])
    setNovo("")
    setErro(null)
    // Cai direto na página criada. Criar e ficar na home faria parecer que nada
    // aconteceu — a prancheta continuaria mostrando a mesma coisa.
    onSelect(page.id)
  }, [novo, pages, onChange, onSelect, t])

  const patch = useCallback(
    (id: string, next: Partial<SitePage>) =>
      onChange(pages.map((p) => (p.id === id ? { ...p, ...next } : p))),
    [pages, onChange]
  )

  const apagar = useCallback(
    (page: SitePage) => {
      const label = page.title || page.slug
      if (!window.confirm(t("pageDeleteConfirm", "Apagar a página") + ` "${label}"?`)) return
      onChange(pages.filter((p) => p.id !== page.id))
      // A prancheta não pode continuar apontando para o que deixou de existir.
      if (activePageId === page.id) onSelect(null)
    },
    [pages, onChange, activePageId, onSelect, t]
  )

  const field =
    "w-full border-2 border-[#0B0B0D] bg-[#0B0B0D] px-2 py-1.5 text-xs text-[#F5F1E8] outline-none focus:border-[#9A938A]"

  return (
    <div
      ref={ref}
      className="absolute top-full right-0 z-50 mt-2 max-h-[70vh] w-[23rem] overflow-y-auto border-2 border-[#0B0B0D] bg-[#15120E] p-4"
      style={{ boxShadow: `6px 6px 0 0 ${accent}` }}
    >
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[11px] font-extrabold tracking-[0.16em] text-[#9A938A] uppercase">
          {t("pagesTitle", "Páginas do site")}
        </p>
        <button type="button" onClick={onClose} aria-label={t("close", "Fechar")}>
          <X className="h-4 w-4 text-[#9A938A] hover:text-[#F5F1E8]" />
        </button>
      </div>
      <p className="mb-3 text-[11px] leading-snug text-[#9A938A]">
        {t(
          "pagesHint",
          "Uma página por serviço ou por cidade atendida. Cada uma tem endereço próprio e aparece no menu do site."
        )}
      </p>

      {/* A home, como primeira linha da mesma lista. */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        className="flex w-full items-center gap-2 border-2 px-3 py-2 text-left text-sm"
        style={{
          borderColor: activePageId === null ? accent : "#0B0B0D",
          background: activePageId === null ? "#1D1810" : "transparent",
          color: "#F5F1E8",
        }}
      >
        <Home className="h-4 w-4 shrink-0" style={{ color: accent }} />
        {t("pageHome", "Página inicial")}
      </button>

      {pages.map((page) => {
        const active = activePageId === page.id
        return (
          <div
            key={page.id}
            className="mt-1 border-2 px-3 py-2"
            style={{
              borderColor: active ? accent : "#0B0B0D",
              background: active ? "#1D1810" : "transparent",
            }}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelect(page.id)}
                className="min-w-0 flex-1 text-left"
              >
                <span
                  className="block truncate text-sm"
                  style={{ color: page.enabled ? "#F5F1E8" : "#9A938A" }}
                >
                  {page.title || page.slug}
                </span>
                <span className="block truncate text-[11px] text-[#9A938A]">
                  /pagina/{page.slug}
                </span>
              </button>

              {/* Ligar/desligar. Página desligada some do site publicado e do
                  menu, mas continua aqui para ser trabalhada — é o rascunho. */}
              <button
                type="button"
                onClick={() => patch(page.id, { enabled: !page.enabled })}
                aria-label={
                  page.enabled
                    ? t("pageDisable", "Tirar do ar")
                    : t("pageEnable", "Colocar no ar")
                }
                title={
                  page.enabled
                    ? t("pageDisable", "Tirar do ar")
                    : t("pageEnable", "Colocar no ar")
                }
                className="shrink-0 border-2 border-[#0B0B0D] p-1"
                style={{ background: page.enabled ? accent : "transparent" }}
              >
                <Check
                  className="h-3.5 w-3.5"
                  style={{ color: page.enabled ? "#0B0B0D" : "#9A938A" }}
                />
              </button>

              <button
                type="button"
                onClick={() => apagar(page)}
                aria-label={t("pageDelete", "Apagar página")}
                title={t("pageDelete", "Apagar página")}
                className="shrink-0 p-1 text-[#9A938A] hover:text-[#F5F1E8]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Título e descrição aparecem só na página SELECIONADA: abertos em
                todas, o painel viraria uma parede de campos. */}
            {active && (
              <div className="mt-2 space-y-1.5 border-t-2 border-[#0B0B0D] pt-2">
                <input
                  value={page.title}
                  onChange={(e) => patch(page.id, { title: e.target.value })}
                  placeholder={t("pageTitleLabel", "Título (aba e resultado de busca)")}
                  maxLength={120}
                  className={field}
                />
                <input
                  value={page.subtitle}
                  onChange={(e) => patch(page.id, { subtitle: e.target.value })}
                  placeholder={t("pageSubtitleLabel", "Descrição para o Google")}
                  maxLength={240}
                  className={field}
                />
                <p className="text-[10px] leading-snug text-[#9A938A]">
                  {t(
                    "pageSlugFrozen",
                    "O endereço não muda depois de criado: ele já pode estar publicado."
                  )}
                </p>
              </div>
            )}
          </div>
        )
      })}

      <div className="mt-4 border-t-2 border-[#0B0B0D] pt-3">
        <input
          value={novo}
          onChange={(e) => {
            setNovo(e.target.value)
            setErro(null)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              criar()
            }
          }}
          placeholder={t("pageNewPlaceholder", "Nome da página nova")}
          maxLength={120}
          className={field}
        />
        {/* O endereço aparece ANTES de criar: é o que o líder vai ter que viver
            com ele, já que depois ele congela. */}
        {novo.trim() && (
          <p className="mt-1 truncate text-[11px] text-[#9A938A]">
            /pagina/{slugifyPage(novo) || "…"}
          </p>
        )}
        {erro && <p className="mt-1 text-[11px] text-[#E5484D]">{erro}</p>}
        <button
          type="button"
          onClick={criar}
          disabled={!novo.trim()}
          className="mt-2 flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] px-3 py-2 text-xs font-extrabold tracking-[0.14em] uppercase disabled:opacity-40"
          style={{ background: accent, color: "#0B0B0D" }}
        >
          <Plus className="h-4 w-4" />
          {t("pageCreate", "Criar página")}
        </button>
      </div>
    </div>
  )
}
