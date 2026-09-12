"use client"

// A TROCA PELO SITE PRONTO (mig 242) — o modal que o cliente aceita.
//
// Ele existe porque trocar o site é irreversível do ponto de vista de quem
// visita: o endereço passa a mostrar outra coisa no mesmo instante. Um botão
// solto no painel faria isso acontecer por um clique de curiosidade.
//
// ⚠️ O QUE ELE PRECISA DIZER SÃO TRÊS COISAS, e nenhuma é opcional:
//
//   1. O QUE ENTRA  — o negócio, quantas páginas, quais endereços. Sem isso o
//      cliente aceita no escuro, e o que ele recebe é um site inteiro.
//   2. O QUE ELE PERDE — a edição sai das mãos dele enquanto o site pronto
//      estiver ligado. É a única coisa aqui que alguém pode se arrepender.
//   3. O QUE NÃO SE PERDE — o site do construtor fica guardado, e devolver
//      traz tudo de volta. É o que torna a decisão barata, e a frase precisa
//      estar ANTES do botão, não depois.
//
// ⚠️ VAI POR PORTAL PARA O BODY. A barra de ferramentas do construtor vive numa
// página com a prancheta escalada por `transform`, e ancestral com transform
// deixa de ser a janela para um filho `fixed` — preso no fluxo, o modal abriria
// dentro do painel de 25rem. Mesma armadilha já paga pela gaveta de números.
//
// ⚠️ E ELE É `z-[100]`, NÃO `z-50`: quem o abre é o painel do site pronto, que
// já é `z-50`. No mesmo nível, a ordem do DOM decidiria — e o modal nasceria
// atrás de quem o chamou, com a pessoa apertando um botão sem ver nada
// acontecer. Mesma conta do cortador de foto aberto de dentro de outro modal.

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { AlertTriangle, Check, Loader2, Sparkles, X } from "lucide-react"

export type OfferSummary = {
  label?: string
  business?: string
  city?: string
  state?: string
  phone?: string
  whatsapp?: boolean
  hasPhoto?: boolean
  counts?: {
    services?: number
    cities?: number
    faq?: number
    reviews?: number
    pages?: number
  }
  pages?: { slug: string; label: string; kind: string }[]
}

export type SiteOffer = {
  id_offer: string
  template: string
  note?: string
  created_at?: string
  summary?: OfferSummary | null
}

export function SiteSwapModal({
  offer,
  isPublished,
  slug,
  busy,
  error,
  accent,
  onConfirm,
  onClose,
  t,
}: {
  offer: SiteOffer
  isPublished: boolean
  slug: string | null
  busy: boolean
  error: string
  accent: string
  onConfirm: () => void
  onClose: () => void
  t: (key: string, fallback: string) => string
}) {
  // `createPortal` só existe depois da montagem no cliente — no servidor não há
  // `document`. O guard é o que mantém a página pré-renderizável.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const boxRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ⚠️ Esc NÃO pode fechar enquanto a troca está sendo gravada: a requisição
      // continuaria correndo e o cliente ficaria sem saber o que aconteceu com
      // o site dele.
      if (e.key === "Escape" && !busy) onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose, busy])

  if (!mounted) return null

  const s = offer.summary || {}
  const c = s.counts || {}
  const pages = s.pages || []

  return createPortal(
    <div
      className="fl-sharp fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      // O véu fecha; o conteúdo não. Sem o alvo === currentTarget, um clique que
      // começasse dentro e terminasse na borda fecharia a caixa no meio da
      // leitura.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div
        ref={boxRef}
        className="my-auto w-full max-w-lg border-2 border-[#0B0B0D] bg-[#15120E] p-5"
        style={{ boxShadow: `8px 8px 0 0 ${accent}` }}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.16em] text-[#9A938A] uppercase">
              {t("swapEyebrow", "Site pronto")}
            </p>
            <h2 className="fl-display text-2xl leading-tight text-[#F5F1E8]">
              {t("swapTitle", "Trocar pelo seu site pronto?")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={t("close", "Fechar")}
            className="shrink-0 disabled:opacity-40"
          >
            <X className="h-5 w-5 text-[#9A938A] hover:text-[#F5F1E8]" />
          </button>
        </div>

        {offer.note ? (
          <p className="mb-3 border-2 border-[#0B0B0D] bg-[#1D1810] p-3 text-xs leading-relaxed text-[#F5F1E8]">
            {offer.note}
          </p>
        ) : null}

        {/* ── o que entra ─────────────────────────────────────────────────── */}
        <p className="mb-2 text-[11px] font-extrabold tracking-[0.14em] text-[#9A938A] uppercase">
          {t("swapWhatLabel", "O que entra no lugar")}
        </p>
        <div className="border-2 border-[#0B0B0D] bg-[#1D1810] p-3">
          <p className="fl-display text-xl leading-none text-[#F5F1E8]">
            {s.business || t("swapNoName", "Seu negócio")}
          </p>
          <p className="mt-1 text-[11px] text-[#9A938A]">
            {[s.city, s.state].filter(Boolean).join(" · ")}
            {s.phone ? ` · ${s.phone}` : ""}
          </p>

          <p className="mt-3 text-xs text-[#F5F1E8]">
            {/* O provider de i18n não interpola: o número entra por replace. */}
            {t("swapPagesCount", "{n} páginas no total").replace(
              "{n}",
              String(c.pages ?? pages.length + 1)
            )}
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-1">
            {/* A home não está na lista do backend (ela não tem endereço
                próprio), e sem ela aqui a conta acima não fecharia na tela. */}
            <li className="border border-[#0B0B0D] bg-[#15120E] px-2 py-1 text-[10px] text-[#9A938A]">
              {t("swapHome", "Início")}
            </li>
            {pages.map((p) => (
              <li
                key={p.slug}
                className="border border-[#0B0B0D] bg-[#15120E] px-2 py-1 text-[10px] text-[#9A938A]"
              >
                {p.label}
              </li>
            ))}
          </ul>
        </div>

        {/* ── o que muda de verdade ───────────────────────────────────────── */}
        <ul className="mt-3 flex flex-col gap-2">
          <li className="flex gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] p-2.5 text-[11px] leading-snug text-[#9A938A]">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
            <span>
              {isPublished && slug
                ? t(
                    "swapLiveNow",
                    "O seu endereço passa a mostrar o site novo agora mesmo:"
                  ) + ` freelandoo.com.br/c/${slug}`
                : t(
                    "swapNotLive",
                    "O site ainda não está no ar. Depois da troca, o botão Publicar fica com você — é você quem coloca no ar e escolhe o endereço."
                  )}
            </span>
          </li>
          <li className="flex gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] p-2.5 text-[11px] leading-snug text-[#9A938A]">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F2B705]" />
            <span>
              {t(
                "swapEditWarn",
                "Enquanto o site pronto estiver ligado, quem edita é a Freelandoo. Você pede as alterações e a gente aplica."
              )}
            </span>
          </li>
          {/* ⚠️ O QUE ELE NÃO PERDE — e esta linha existe porque a anterior
              acabou de dizer que a edição sai das mãos dele. Sem dizer o que
              FICA, "a Freelandoo passa a cuidar do site" é lido como perder o
              site inteiro, e o botão de aceitar fica mais caro do que é. */}
          <li className="flex gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] p-2.5 text-[11px] leading-snug text-[#9A938A]">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
            <span>
              {t(
                "swapPublishKeep",
                "Publicar, tirar do ar e escolher o endereço continuam sendo seus. O que passa para a gente é escrever o conteúdo."
              )}
            </span>
          </li>
          <li className="flex gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] p-2.5 text-[11px] leading-snug text-[#9A938A]">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
            <span>
              {t(
                "swapKeepWarn",
                "O site que você montou aqui não é apagado: ele fica guardado, e dá para voltar a editá-lo quando quiser."
              )}
            </span>
          </li>
        </ul>

        {error ? (
          <p className="mt-3 border-2 border-[#0B0B0D] bg-[#2a1410] p-2.5 text-[11px] leading-snug text-[#F5F1E8]">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 border-2 border-[#0B0B0D] px-3 py-2.5 text-[11px] font-extrabold tracking-[0.12em] uppercase disabled:opacity-50"
            style={{ background: accent, color: "#0B0B0D" }}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {t("swapConfirm", "Trocar meu site")}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 border-2 border-[#0B0B0D] bg-transparent px-3 py-2.5 text-[11px] font-extrabold tracking-[0.12em] text-[#9A938A] uppercase hover:text-[#F5F1E8] disabled:opacity-50"
          >
            {t("swapCancel", "Agora não")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
