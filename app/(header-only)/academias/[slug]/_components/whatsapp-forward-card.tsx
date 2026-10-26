"use client"

// WhatsApp oficial da academia (mig 307 do backend) — o dono liga o número
// dele da Cloud API ao sistema da academia (o Coliseu). Ligado, as mensagens
// que chegam nesse número vão para o sistema da academia pela API de parceiro,
// sem IA e sem cair na caixa de Mensagens da Freelandoo. O número precisa estar
// conectado antes em Mensagens → WhatsApp; desligar pede confirmação porque o
// atendimento do sistema da academia para na hora.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Loader2, MessageCircle } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { BTN_DARK, BTN_GOLD, H_SECTION, PANEL } from "./academy-ui"

type ForwardStatus = { meu_numero: string | null; ativo: boolean; webhook_configurado: boolean }

export function WhatsappForwardCard({ academyId }: { academyId: string }) {
  const t = useTranslations("Academies")
  const [status, setStatus] = useState<ForwardStatus | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)

  const authHeaders = useCallback((): Record<string, string> => {
    const token = getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  useEffect(() => {
    let alive = true
    fetch(`/api/academies/${academyId}/whatsapp-forward`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d)
          setStatus({ meu_numero: d.meu_numero || null, ativo: !!d.ativo, webhook_configurado: !!d.webhook_configurado })
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [academyId, authHeaders])

  const save = useCallback(
    async (ativo: boolean) => {
      setSaving(true)
      setConfirming(false)
      try {
        const res = await fetch(`/api/academies/${academyId}/whatsapp-forward`, {
          method: "PUT",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ ativo }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || "")
        setStatus({ meu_numero: data.meu_numero || null, ativo: !!data.ativo, webhook_configurado: !!data.webhook_configurado })
        toast.success(
          ativo
            ? t("waForwardOnToast", "Número ligado ao sistema da academia")
            : t("waForwardOffToast", "Número desligado do sistema da academia")
        )
      } catch (err) {
        toast.error(err instanceof Error && err.message ? err.message : t("waForwardError", "Falha ao salvar"))
      } finally {
        setSaving(false)
      }
    },
    [academyId, authHeaders, t]
  )

  return (
    <section className={`${PANEL} mt-4 p-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={H_SECTION}>
          <MessageCircle className="h-4 w-4 text-[#FB923C]" />
          {t("waForwardTitle", "WhatsApp oficial (Coliseu)")}
        </h2>
        {status && (
          <span
            className={`border-2 border-[#0B0B0D] px-2 py-0.5 text-[10px] font-extrabold uppercase ${
              status.ativo ? "bg-[#4fc95a] text-[#0B0B0D]" : "bg-[#1D1810] text-[#9A938A]"
            }`}
          >
            {status.ativo ? t("waForwardActive", "Ligado") : t("waForwardInactive", "Desligado")}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-xs text-[#9A938A]">
        {t(
          "waForwardIntro",
          "Liga o seu número oficial do WhatsApp ao sistema da academia: as mensagens dos alunos chegam lá e são respondidas por lá, sem IA e sem passar pela sua caixa de Mensagens."
        )}
      </p>

      {status && !status.meu_numero && (
        <p className="mt-3 text-[11px] text-[#FB923C]">
          {t("waForwardNoNumber", "Conecte primeiro o seu WhatsApp oficial em")}{" "}
          <Link href="/mensagens" className="font-extrabold underline hover:text-[#F5F1E8]">
            {t("waForwardNoNumberLink", "Mensagens → WhatsApp")}
          </Link>
          .
        </p>
      )}

      {status?.meu_numero && (
        <p className="mt-2 text-[11px] text-[#9A938A]">
          {t("waForwardNumber", "Número: {number}").replace("{number}", status.meu_numero)}
        </p>
      )}

      {status?.ativo && !status.webhook_configurado && (
        <p className="mt-1 text-[11px] text-[#FB923C]">
          {t(
            "waForwardNoWebhook",
            "O sistema da academia ainda não informou para onde mandar as mensagens. Até ele se conectar, cada mensagem é tentada de novo por algumas horas e depois fica só aqui."
          )}
        </p>
      )}

      {status?.meu_numero && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!status.ativo ? (
            <button type="button" onClick={() => void save(true)} disabled={saving} className={`${BTN_GOLD} px-4 py-2 text-xs`}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("waForwardOn", "Ligar ao sistema da academia")}
            </button>
          ) : !confirming ? (
            <button type="button" onClick={() => setConfirming(true)} className={`${BTN_DARK} px-4 py-2 text-xs`}>
              {t("waForwardOff", "Desligar")}
            </button>
          ) : (
            <>
              <button type="button" onClick={() => void save(false)} disabled={saving} className={`${BTN_GOLD} px-4 py-2 text-xs`}>
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t("waForwardOffConfirm", "Confirmar")}
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="px-2 py-2 text-xs text-[#9A938A] hover:text-[#F5F1E8]">
                {t("partnerKeyCancel", "Cancelar")}
              </button>
              <p className="basis-full text-[11px] text-[#FB923C]">
                {t(
                  "waForwardOffWarn",
                  "O sistema da academia para de receber e de responder por este número na hora — as mensagens voltam para a sua caixa de Mensagens."
                )}
              </p>
            </>
          )}
        </div>
      )}
    </section>
  )
}
