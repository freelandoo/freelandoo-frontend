"use client"

import { useCallback, useState } from "react"
import { Loader2, MessageSquare, Phone } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"

/**
 * Cadastro de número da Cloud API — o caminho OFICIAL, que não tem QR (W3).
 *
 * ─── POR QUE DOIS PASSOS, E NÃO UM FORMULÁRIO SÓ ───────────────────────────
 *
 * Entre informar o número e digitar o código passa o SMS da operadora. Um
 * formulário único teria que segurar a tela esperando a pessoa ler o celular, e
 * qualquer atraso pareceria travamento.
 *
 * ─── SEM TEMPORIZADOR, AO CONTRÁRIO DO QR ──────────────────────────────────
 *
 * O modal do QR renova a cada 18s e consulta o estado a cada 3s porque o evento
 * que diz "conectou" vem do CELULAR da pessoa e pode não chegar. Aqui não há
 * nada externo acontecendo: quem avança é o clique dela no botão. Acrescentar
 * um poll seria bater no backend sem nada novo para descobrir.
 */

type Step = "phone" | "code"

function authHeaders(): Record<string, string> {
  const token = getToken()
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function WhatsappNumberForm({
  onConnected,
}: {
  onConnected: (number: string) => void
}) {
  const t = useTranslations("Whatsapp")
  const [step, setStep] = useState<Step>("phone")
  const [phone, setPhone] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  // O número normalizado que o BACKEND devolveu — é ele que a tela mostra, e
  // não o que foi digitado: o backend acrescenta o DDI, e exibir o texto cru
  // faria a confirmação dizer um número diferente do que foi cadastrado.
  //
  // ⚠️ ESTADO, e não `ref`: este valor é DESENHADO. Guardado num ref, a tela
  // não re-renderizaria ao recebê-lo, e o passo do código mostraria o número
  // vazio — o lint da casa (react-hooks/refs) pega exatamente isso.
  const [confirmed, setConfirmed] = useState("")

  const post = useCallback(async (path: string, body: unknown) => {
    const r = await fetch(`/api/whatsapp/instance/${path}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    })
    const d = await r.json().catch(() => ({}))
    return { ok: r.ok, data: d as Record<string, unknown> }
  }, [])

  async function submitPhone() {
    setBusy(true)
    setError("")
    setNotice("")
    const { ok, data } = await post("number", {
      phone,
      display_name: displayName,
    })
    setBusy(false)
    if (!ok) {
      setError(String(data.error || t("numberError", "Não foi possível cadastrar o número.")))
      return
    }
    setConfirmed(String(data.number || phone))
    setStep("code")
  }

  async function submitCode() {
    setBusy(true)
    setError("")
    const { ok, data } = await post("number/verify", { code })
    setBusy(false)
    if (!ok) {
      setError(String(data.error || t("codeError", "Código inválido.")))
      return
    }
    onConnected(String(data.number || confirmed))
  }

  async function resend() {
    setBusy(true)
    setError("")
    const { ok, data } = await post("number/resend", { method: "SMS" })
    setBusy(false)
    if (!ok) {
      setError(String(data.error || t("resendError", "Não foi possível reenviar o código.")))
      return
    }
    setNotice(t("resendSent", "Enviamos um código novo."))
  }

  const input =
    "mt-1 w-full border-2 border-[#0B0B0D] bg-white px-3 py-2.5 text-sm text-[#0B0B0D] outline-none focus:border-[#F2B705]"
  const label = "block text-left text-xs font-black uppercase tracking-wider text-[#6B6457]"
  const primary =
    "mt-5 flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-3 text-sm font-black uppercase tracking-wider text-[#0B0B0D] transition-transform hover:-translate-y-0.5 disabled:opacity-60"

  if (step === "code") {
    return (
      <div className="px-5 py-5">
        <p className="text-center text-sm text-[#0B0B0D]">
          {t("codeSentTo", "Enviamos um código por SMS para")}{" "}
          <span className="font-black">{confirmed}</span>
        </p>

        <div className="mt-4">
          <label className={label} htmlFor="wa-code">
            {t("codeLabel", "Código recebido")}
          </label>
          <input
            id="wa-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            className={`${input} text-center font-mono text-lg tracking-[0.3em]`}
          />
        </div>

        {notice && <p className="mt-3 text-center text-xs font-semibold text-[#15803D]">{notice}</p>}
        {error && <p className="mt-3 text-center text-xs font-semibold text-[#B91C1C]">{error}</p>}

        <button type="button" onClick={submitCode} disabled={busy || !code.trim()} className={primary}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
          {t("confirmCode", "Confirmar código")}
        </button>

        <button
          type="button"
          onClick={resend}
          disabled={busy}
          className="mt-3 w-full border-2 border-[#0B0B0D]/30 px-4 py-2.5 text-sm font-semibold text-[#6B6457] transition-colors hover:text-[#0B0B0D] disabled:opacity-50"
        >
          {t("resend", "Reenviar código")}
        </button>

        <button
          type="button"
          onClick={() => {
            setStep("phone")
            setError("")
            setNotice("")
          }}
          disabled={busy}
          className="mt-2 w-full px-4 py-2 text-xs font-semibold text-[#6B6457] underline disabled:opacity-50"
        >
          {t("changeNumber", "Usar outro número")}
        </button>
      </div>
    )
  }

  return (
    <div className="px-5 py-5">
      <p className="text-center text-xs text-[#6B6457]">
        {t("numberHint", "Informe o número comercial que vai atender pela Freelandoo.")}
      </p>

      <div className="mt-4">
        <label className={label} htmlFor="wa-phone">
          {t("phoneLabel", "Número com DDD")}
        </label>
        <input
          id="wa-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          autoComplete="tel"
          placeholder="11 98888-7777"
          className={input}
        />
      </div>

      <div className="mt-3">
        <label className={label} htmlFor="wa-name">
          {t("displayNameLabel", "Nome que o cliente vê")}
        </label>
        <input
          id="wa-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={60}
          placeholder={t("displayNamePlaceholder", "Barbearia do João")}
          className={input}
        />
        <p className="mt-1 text-left text-xs text-[#6B6457]">
          {t(
            "displayNameHelp",
            "Aparece no topo da conversa. A Meta analisa esse nome e recusa o que não corresponder ao negócio."
          )}
        </p>
      </div>

      {/*
        ⚠️ O aviso mais importante da tela. Número que já tem WhatsApp precisa
        de migração, e quem descobre isso só depois de tentar perde o passo
        inteiro — às vezes com a conta pessoal derrubada no meio.
      */}
      <p className="mt-4 border-2 border-[#0B0B0D] bg-[#FEF3C7] px-3 py-2 text-left text-xs text-[#0B0B0D]">
        {t(
          "numberWarning",
          "Use um número que ainda NÃO tenha WhatsApp. Depois de conectado, ele passa a funcionar apenas aqui — não volta para o aplicativo do celular."
        )}
      </p>

      {error && <p className="mt-3 text-center text-xs font-semibold text-[#B91C1C]">{error}</p>}

      <button
        type="button"
        onClick={submitPhone}
        disabled={busy || !phone.trim() || displayName.trim().length < 3}
        className={primary}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
        {t("sendCode", "Receber código por SMS")}
      </button>
    </div>
  )
}
