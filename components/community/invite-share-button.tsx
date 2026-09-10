"use client"

// O "aviãozinho" de CONVITE das superfícies de comunidade — comunidade comum
// (o negócio), condomínio, bairro, pet, carro e academia. Compartilha o LINK
// da página para prospectar membros: apertar abre um menu curto com o
// compartilhar nativo do aparelho (quando existe), o WhatsApp e o copiar.
//
// Peça ÚNICA de propósito: botão de headcard escrito duas vezes diverge em
// silêncio (foi assim que a foto de perfil sumiu de uma das superfícies). O
// componente não sabe de onde é o link — quem monta entrega a URL e o nome; o
// que ele decide é a FORMA (o menu e o texto do convite).
//
// Aparece para TODO MUNDO, não só para o líder: quem prospecta membro é quem
// já está dentro e quer trazer um amigo, e o convite de uma comunidade
// privada é justamente como ela ganha assinante. Não há permissão a checar —
// o link é público por construção (a página já é o que ela mostra a quem
// chega por ele).

import { useEffect, useRef, useState } from "react"
import { Copy, MessageCircle, Send, Share2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { copyText } from "@/lib/clipboard"

/**
 * De que lado o menu cabe — a mesma medição do "+" de publicar: o botão mora
 * na ponta do headcard e, num celular estreito, um menu de 208px alinhado à
 * esquerda nasceria para fora da tela.
 */
function resolveSide(el: HTMLElement | null, preferred: "left" | "right"): "left" | "right" {
  if (!el || typeof window === "undefined") return preferred
  const MENU_W = 208 + 12
  const rect = el.getBoundingClientRect()
  const fitsLeftAligned = rect.left + MENU_W <= window.innerWidth
  const fitsRightAligned = rect.right - MENU_W >= 0
  if (preferred === "left" && !fitsLeftAligned && fitsRightAligned) return "right"
  if (preferred === "right" && !fitsRightAligned && fitsLeftAligned) return "left"
  return preferred
}

/** Caminho relativo vira URL absoluta na hora do clique (só existe no browser). */
function absoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  if (typeof window === "undefined") return url
  return `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`
}

type Item = { id: string; label: string; icon: LucideIcon; run: () => void }

export function InviteShareButton({
  url,
  name,
  accent = "#F2B705",
  size = "lg",
  align = "right",
  className = "",
}: {
  /** Link da página a convidar (caminho relativo ou URL absoluta). */
  url: string
  /** Nome da comunidade/academia — entra no texto do convite. */
  name: string
  /** Cor do ícone e dos ícones do menu (o accent editável da comunidade). */
  accent?: string
  /** `lg` casa com o "+" de publicar (56px); `sm` com os botões de 36px. */
  size?: "lg" | "sm"
  align?: "left" | "right"
  className?: string
}) {
  const t = useTranslations("Invite")
  const [open, setOpen] = useState(false)
  const [side, setSide] = useState<"left" | "right">(align)
  // Medido num efeito, nunca no render: `navigator` não existe no servidor e
  // o primeiro quadro tem que ser o mesmo dos dois lados.
  const [canNativeShare, setCanNativeShare] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function")
  }, [])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onEsc)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onEsc)
    }
  }, [open])

  // O provider de i18n não interpola: o `{name}` entra por `.replace`.
  const inviteText = t("message", "Vem fazer parte de {name} na Freelandoo!").replace("{name}", name)

  const notifyCopy = (ok: boolean) => {
    if (ok) toast.success(t("copied", "Link copiado!"))
    else toast.error(t("copyFailed", "Não deu pra copiar o link."))
  }

  const share = async () => {
    const link = absoluteUrl(url)
    try {
      await navigator.share({ title: name, text: inviteText, url: link })
    } catch (err) {
      // Fechar a folha do sistema é AbortError — não é erro, é desistência.
      if ((err as { name?: string })?.name === "AbortError") return
      notifyCopy(await copyText(link))
    }
  }

  const whatsapp = () => {
    const text = encodeURIComponent(`${inviteText}\n${absoluteUrl(url)}`)
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer")
  }

  const copy = async () => {
    notifyCopy(await copyText(absoluteUrl(url)))
  }

  const label = t("cta", "Convidar pessoas")
  const isLg = size === "lg"
  const buttonClass = `grid shrink-0 place-items-center border-2 border-[#0B0B0D] bg-[#15120E] text-[#F5F1E8] ${
    isLg ? "h-14 w-14" : "h-9 w-9"
  }`

  const items: Item[] = [
    ...(canNativeShare
      ? [{ id: "share", label: t("share", "Compartilhar"), icon: Share2, run: () => void share() }]
      : []),
    { id: "whatsapp", label: t("whatsapp", "WhatsApp"), icon: MessageCircle, run: whatsapp },
    { id: "copy", label: t("copy", "Copiar link"), icon: Copy, run: () => void copy() },
  ]

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => {
          // Mede ANTES de abrir, como o "+": o menu já nasce do lado certo.
          if (!open) setSide(resolveSide(wrapRef.current, align))
          setOpen((v) => !v)
        }}
        className={buttonClass}
        style={{ boxShadow: isLg ? "4px 4px 0 0 #0B0B0D" : "3px 3px 0 0 #0B0B0D" }}
      >
        <Send className={isLg ? "h-6 w-6" : "h-4 w-4"} style={{ color: accent }} />
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute top-full z-40 mt-2 flex w-52 max-w-[calc(100vw-1.5rem)] flex-col border-2 border-[#0B0B0D] bg-[#15120E] p-2 ${
            side === "right" ? "right-0" : "left-0"
          }`}
          style={{ boxShadow: "4px 4px 0 0 #0B0B0D" }}
        >
          <p className="mb-2 px-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9A938A]">
            {t("menuTitle", "Convidar para {name}").replace("{name}", name)}
          </p>
          {items.map((it) => {
            const Icon = it.icon
            return (
              <button
                key={it.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  it.run()
                }}
                className="mb-1 flex w-full items-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-left text-xs font-extrabold uppercase tracking-[0.1em] text-[#F5F1E8] last:mb-0 hover:bg-[#241d12]"
              >
                <Icon className="h-4 w-4 shrink-0" style={{ color: accent }} /> {it.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
