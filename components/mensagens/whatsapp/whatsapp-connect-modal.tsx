"use client"

import { useEffect, useRef, useState } from "react"
import { TabloidDialog } from "@/components/tabloide/TabloidDialog"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { WhatsappNumberForm } from "./whatsapp-number-form"
import type { WhatsappStatusInfo } from "./use-whatsapp-inbox"

/**
 * Conectar o WhatsApp.
 *
 * ─── NÃO EXISTE MAIS QR ─────────────────────────────────────────────────────
 *
 * Até 2026-09-16 este modal tinha dois caminhos: o QR da Evolution (Baileys) e
 * o cadastro de número da Cloud API. A Evolution foi removida — ela é cliente
 * não-oficial, e o número de quem a usasse podia ser banido pela Meta de forma
 * permanente e sem recurso.
 *
 * Com ela saíram os DOIS TEMPORIZADORES que este arquivo tinha (renovar o QR a
 * cada 18s, conferir o pareamento a cada 3s). Eles existiam porque lá havia um
 * evento externo — o dedo da pessoa no celular lendo o código — que não passava
 * por nós. No cadastro de número não há nada acontecendo fora da tela: quem
 * avança é o clique. **Este módulo voltou a ter zero temporizadores**, e a caixa
 * de mensagens continua sendo empurrada por socket.
 */

export function WhatsappConnectModal({
  open,
  onOpenChange,
  connected,
  number,
  onStatus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  connected: boolean
  number: string
  onStatus: (info: Partial<WhatsappStatusInfo>) => void
}) {
  const t = useTranslations("Whatsapp")
  const [busy, setBusy] = useState(false)
  const [paired, setPaired] = useState(connected)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    if (open) setPaired(connected)
  }, [open, connected])

  async function disconnect() {
    setBusy(true)
    try {
      const token = getToken()
      await fetch("/api/whatsapp/instance", {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
    } catch {
      /* o estado local abaixo é o que a tela precisa mostrar */
    }
    onStatus({ status: "disconnected", number: "" })
    if (alive.current) {
      setBusy(false)
      setPaired(false)
    }
    onOpenChange(false)
  }

  return (
    <TabloidDialog
      open={open}
      onOpenChange={onOpenChange}
      eyebrow={t("modalEyebrow", "WhatsApp")}
      title={paired ? t("modalTitleConnected", "WhatsApp conectado") : t("modalTitle", "Conectar WhatsApp")}
      closeLabel={t("close", "Fechar")}
      size="sm"
    >
      {paired ? (
        <div className="px-5 py-5 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center border-2 border-[#0B0B0D] bg-[#16A34A] text-2xl text-white">
            ✓
          </span>
          <p className="mt-3 text-sm text-[#0B0B0D]">
            {t("connectedHelp", "As conversas recebidas entram sozinhas nesta aba.")}
          </p>
          {number && (
            <p className="mt-1 text-xs text-[#6B6457]">
              {t("connectedNumber", "Número")} {number}
            </p>
          )}
          <p className="mt-3 text-xs text-[#6B6457]">
            {t(
              "noAutoReply",
              "Ninguém é respondido automaticamente — toda resposta sai daqui, escrita por você."
            )}
          </p>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="mt-5 w-full border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-3 text-sm font-black uppercase tracking-wider text-[#0B0B0D] transition-transform hover:-translate-y-0.5"
          >
            {t("done", "Concluir")}
          </button>
          <button
            type="button"
            onClick={disconnect}
            disabled={busy}
            className="mt-3 w-full border-2 border-[#0B0B0D]/30 px-4 py-2.5 text-sm font-semibold text-[#6B6457] transition-colors hover:text-[#0B0B0D] disabled:opacity-50"
          >
            {t("disconnect", "Desconectar aparelho")}
          </button>
        </div>
      ) : (
        <WhatsappNumberForm
          onConnected={(connectedNumber) => {
            setPaired(true)
            onStatus({ status: "connected", exists: true, number: connectedNumber })
          }}
        />
      )}
    </TabloidDialog>
  )
}
