"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, Smartphone } from "lucide-react"
import { TabloidDialog } from "@/components/tabloide/TabloidDialog"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { WhatsappNumberForm } from "./whatsapp-number-form"
import type { WhatsappStatusInfo } from "./use-whatsapp-inbox"

/**
 * O QR do pareamento (mig 223) — copiado do modal do Coliseu, com as duas
 * temporizações que ele já acertou:
 *
 *   • o QR do WhatsApp expira em ~20s, então é renovado a cada 18s enquanto
 *     ninguém pareou;
 *   • o estado é conferido a cada 3s, porque o evento que diz "conectou" vem
 *     do CELULAR da pessoa e pode não chegar — e ficar olhando um QR já lido
 *     parece defeito.
 *
 * ⚠️ Estes são os únicos temporizadores do módulo, e existem porque aqui há um
 * evento externo (o dedo da pessoa no celular) que não passa por nós. A caixa
 * de mensagens não tem nenhum: ela é empurrada por socket.
 */

const REFRESH_QR_MS = 18_000
const CHECK_STATUS_MS = 3_000

type QrResult =
  | { ok: true; connected: boolean; qr: string | null; pairing: string | null }
  | { ok: false; error: string }

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Pede um QR novo. Função de I/O PURA e fora do componente: não toca estado,
 * então pode ser chamada de dentro de um efeito sem provocar render em cascata.
 */
async function askQr(): Promise<QrResult> {
  try {
    const r = await fetch("/api/whatsapp/instance/qrcode", {
      headers: authHeaders(),
      cache: "no-store",
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) return { ok: false, error: d?.error || "" }
    return {
      ok: true,
      connected: !!d.connected,
      qr: d.qr_base64 || null,
      pairing: d.pairing_code || null,
    }
  } catch {
    return { ok: false, error: "" }
  }
}

export function WhatsappConnectModal({
  open,
  onOpenChange,
  connected,
  number,
  pairing,
  onStatus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  connected: boolean
  number: string
  /**
   * Como esta pessoa conecta. Vem do BACKEND (capability do provedor) — a tela
   * não adivinha, porque errar mostra QR para um provedor que não tem QR, e a
   * caixa fica vazia para sempre. Ausente = backend antigo, cai no QR.
   */
  pairing?: "qr" | "number" | null
  onStatus: (info: Partial<WhatsappStatusInfo>) => void
}) {
  const t = useTranslations("Whatsapp")
  const [qr, setQr] = useState<string | null>(null)
  // O código de pareamento alternativo da Evolution (quem não consegue ler o
  // QR digita este código no celular). NÃO confundir com a prop `pairing`, que
  // diz qual é o FLUXO de conexão.
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [paired, setPaired] = useState(connected)
  const alive = useRef(true)
  // ⚠️ O caminho do QR tem DOIS temporizadores (renovar o código, detectar o
  // pareamento). Eles existem porque lá há um evento externo — o dedo da pessoa
  // no celular — que não passa por nós. No cadastro de número não há nada
  // acontecendo fora da tela: quem avança é o clique. Deixá-los rodar seria
  // pedir QR a um provedor que não tem QR, a cada 18 segundos, para sempre.
  const usesQr = pairing !== "number"

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    if (open) setPaired(connected)
  }, [open, connected])

  /** Aplica no estado o que `askQr` trouxe. Sempre chamada depois de um await. */
  const apply = useCallback(
    (r: QrResult) => {
      if (!alive.current) return
      setBusy(false)
      if (!r.ok) {
        setError(r.error || t("qrError", "Não foi possível gerar o QR Code."))
        return
      }
      setError("")
      if (r.connected) {
        setPaired(true)
        onStatus({ status: "connected", exists: true })
        return
      }
      setQr(r.qr)
      setPairingCode(r.pairing)
    },
    [onStatus, t]
  )

  useEffect(() => {
    if (!open || paired || !usesQr) return
    let active = true
    setBusy(true)
    void (async () => {
      const r = await askQr()
      if (active) apply(r)
    })()
    return () => {
      active = false
    }
  }, [open, paired, apply, usesQr])

  // Renova o QR antes de ele expirar, enquanto ninguém pareou.
  useEffect(() => {
    if (!open || paired || error || !usesQr) return
    const timer = setInterval(async () => {
      apply(await askQr())
    }, REFRESH_QR_MS)
    return () => clearInterval(timer)
  }, [open, paired, error, apply, usesQr])

  // Detecta o pareamento sem depender de a pessoa clicar em nada.
  useEffect(() => {
    if (!open || paired || !usesQr) return
    const timer = setInterval(async () => {
      try {
        const r = await fetch("/api/whatsapp/instance", { headers: authHeaders(), cache: "no-store" })
        const d = (await r.json()) as WhatsappStatusInfo
        if (!alive.current) return
        onStatus(d)
        if (d.status === "connected") setPaired(true)
      } catch {
        /* rede instável: a próxima volta resolve */
      }
    }, CHECK_STATUS_MS)
    return () => clearInterval(timer)
  }, [open, paired, onStatus, usesQr])

  async function disconnect() {
    setBusy(true)
    try {
      await fetch("/api/whatsapp/instance", { method: "DELETE", headers: authHeaders() })
    } catch {
      /* o estado local abaixo é o que a tela precisa mostrar */
    }
    onStatus({ status: "disconnected", number: "" })
    if (alive.current) {
      setBusy(false)
      setPaired(false)
      setQr(null)
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
            <p className="mt-1 text-xs text-[#6B6457]">{t("connectedNumber", "Número")} {number}</p>
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
      ) : !usesQr ? (
        /*
         * Cadastro de número — a Cloud API não tem QR. O formulário é peça
         * própria porque não divide NADA com o caminho do QR: nem estado, nem
         * temporizador, nem o botão de atualizar. Misturar os dois num
         * componente só faria cada `if` novo ter que lembrar de dois mundos.
         */
        <WhatsappNumberForm
          onConnected={(connectedNumber) => {
            setPaired(true)
            onStatus({ status: "connected", exists: true, number: connectedNumber })
          }}
        />
      ) : (
        <div className="px-5 py-5 text-center">
          <p className="text-xs text-[#6B6457]">
            {t("scanHint", "Aponte a câmera do seu celular para o código")}
          </p>

          <div className="mx-auto mt-4 flex h-[248px] w-[248px] items-center justify-center border-2 border-[#0B0B0D] bg-white p-3">
            {qr ? (
              // O QR é um data URI que muda a cada 18s: `next/image` não teria o
              // que otimizar e ainda cobraria uma transformação por renovação —
              // é o caso que a política de imagem manda servir com <img>.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qr}
                alt={t("qrAlt", "QR Code para conectar o WhatsApp")}
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="flex items-center gap-2 text-sm text-neutral-500">
                {!error && <Loader2 className="h-4 w-4 animate-spin" />}
                {error ? t("qrUnavailable", "QR indisponível") : t("qrLoading", "Gerando QR Code…")}
              </span>
            )}
          </div>

          <ol className="mt-4 space-y-1 text-left text-sm text-[#0B0B0D]">
            <li>{t("step1", "1. Abra o WhatsApp no celular")}</li>
            <li>{t("step2", "2. Toque em ⋮ → Aparelhos conectados")}</li>
            <li>{t("step3", "3. Toque em Conectar um aparelho")}</li>
            <li>{t("step4", "4. Aponte a câmera para este código")}</li>
          </ol>

          <p className="mt-3 text-xs text-[#6B6457]">
            {t("qrRenew", "O código se renova sozinho a cada 20 segundos.")}
          </p>

          {pairingCode && (
            <p className="mt-3 break-all text-xs text-[#6B6457]">
              {t("pairingCode", "Código de pareamento")}: <span className="font-mono">{pairingCode}</span>
            </p>
          )}

          {error && <p className="mt-3 text-xs font-semibold text-[#B91C1C]">{error}</p>}

          <button
            type="button"
            onClick={async () => {
              setBusy(true)
              setError("")
              apply(await askQr())
            }}
            disabled={busy}
            className="mt-5 flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-3 text-sm font-black uppercase tracking-wider text-[#0B0B0D] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
            {t("refreshQr", "Atualizar código")}
          </button>
        </div>
      )}
    </TabloidDialog>
  )
}
