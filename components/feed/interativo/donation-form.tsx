"use client"

// BAÚ DE DOAÇÃO (mig 460) — quem doa escolhe o valor e a região; o baú cai
// para alguém sorteado ali. A tela mostra, antes de pagar, quanto chega do
// outro lado (5% da doação + tarifa do pagamento + 5% do saque). Ao pagar o
// baú sacode, fecha e voa; na volta do checkout (?doacao=paga) há festa.

import { useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { EyeOff, Gift, Loader2, MapPin } from "lucide-react"
import { toast } from "sonner"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { ESTADOS_BRASIL } from "@/lib/constants/estados-brasil"
import { fx } from "@/lib/feed-fx"
import { fxApi } from "@/lib/feed-fx/api"
import { Burst, ChestArt } from "./fx-art"

interface BauSettings {
  min_cents: number
  max_cents: number
  donation_fee_bps: number
  withdraw_fee_bps: number
  holdback_days: number
}
interface MyBau {
  id_bau: string
  amount_cents: number
  uf: string
  region_name: string | null
  anonymous: boolean
  status: "pending_payment" | "paid" | "assigned" | "opened" | "refunded"
  created_at: string
}

const PRESETS = [500, 1000, 5000, 10000, 100000]

/** "1.234,56" / "1234.5" / "10" → centavos. */
function parseReais(raw: string): number {
  const s = raw.replace(/[^\d,.]/g, "")
  if (!s) return 0
  const norm = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s
  const v = Number(norm)
  return Number.isFinite(v) ? Math.round(v * 100) : 0
}

export function DonationForm() {
  const t = useTranslations("FeedFx")
  const locale = useLocale()
  const money = useMemo(() => new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }), [locale])
  const brl = useCallback((c: number) => money.format(c / 100), [money])
  const [cfg, setCfg] = useState<BauSettings | null>(null)
  const [amountText, setAmountText] = useState("10")
  const [uf, setUf] = useState("")
  const [regions, setRegions] = useState<{ id_region: number; name: string }[]>([])
  const [region, setRegion] = useState<string>("")
  const [message, setMessage] = useState("")
  const [anonymous, setAnonymous] = useState(false)
  const [busy, setBusy] = useState(false)
  const [flying, setFlying] = useState(false)
  const [mine, setMine] = useState<MyBau[]>([])
  const [paidBack, setPaidBack] = useState(false)

  const loadMine = useCallback(() => {
    fxApi<{ baus: MyBau[] }>("/baus")
      .then((r) => setMine(r.baus || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fxApi<BauSettings>("/baus/settings").then(setCfg).catch(() => {})
    loadMine()
    // Voltou do checkout.
    const q = new URLSearchParams(window.location.search)
    if (q.get("doacao") === "paga") {
      setPaidBack(true)
      fx("bau-premio", "premio")
      window.history.replaceState(null, "", window.location.pathname)
    } else if (q.get("doacao") === "cancelada") {
      window.history.replaceState(null, "", window.location.pathname)
    }
  }, [loadMine])

  useEffect(() => {
    setRegion("")
    setRegions([])
    if (!uf) return
    fetch(`/api/regions?uf=${uf}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { regions?: { id_region: number; name: string }[] } | null) => setRegions(Array.isArray(d?.regions) ? d!.regions : []))
      .catch(() => {})
  }, [uf])

  const cents = parseReais(amountText)
  const preview = useMemo(() => {
    if (!cfg || cents <= 0) return null
    const platform = Math.round((cents * cfg.donation_fee_bps) / 10000)
    const received = cents - platform
    const withdraw = Math.round((received * cfg.withdraw_fee_bps) / 10000)
    return { platform, withdraw, net: received - withdraw }
  }, [cfg, cents])
  const tooLow = !!cfg && cents < cfg.min_cents
  const tooHigh = !!cfg && cents > cfg.max_cents

  const pay = async () => {
    if (busy || !uf || tooLow || tooHigh) return
    setBusy(true)
    try {
      const r = await fxApi<{ checkout_url: string }>("/baus", {
        method: "POST",
        body: { amount_cents: cents, uf, id_region: region ? Number(region) : null, message: message.trim() || null, anonymous },
      })
      setFlying(true)
      fx("bau-enviar", "lancar")
      window.setTimeout(() => {
        window.location.href = r.checkout_url
      }, 650)
    } catch (e) {
      fx("erro", "erro")
      toast.error(e instanceof Error ? e.message : t("genericError", "Não deu certo"))
      setBusy(false)
    }
  }

  const statusLabel: Record<MyBau["status"], string> = {
    pending_payment: t("bauStPending", "esperando pagamento"),
    paid: t("bauStPaid", "no sorteio da região"),
    assigned: t("bauStAssigned", "caiu para alguém"),
    opened: t("bauStOpened", "aberto"),
    refunded: t("bauStRefunded", "estornado"),
  }
  const chip = (on: boolean) =>
    "inline-flex h-10 items-center gap-1.5 border-2 border-black px-3 text-xs font-black uppercase tracking-wider shadow-[3px_3px_0_#000] transition active:translate-x-px active:translate-y-px " +
    (on ? "bg-[#F2B705] text-black" : "bg-[#15120E] text-[#F5F1E8]")

  return (
    <div>
      <AnimatePresence>
        {paidBack && (
          <motion.div
            className="relative mt-6 overflow-hidden border-[3px] border-black bg-[#F2B705] p-4 text-black shadow-[6px_6px_0_#000]"
            initial={{ y: -20, opacity: 0, rotate: -2 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ opacity: 0 }}
          >
            <Burst seed="bau-pago" colors={["#0B0B0D", "#F5F1E8", "#FF3D6E"]} count={24} />
            <p className="fl-display text-2xl">{t("bauPaidTitle", "Baú solto!")}</p>
            <p className="text-sm font-bold">{t("bauPaidText", "Assim que o pagamento confirmar, ele entra no sorteio da região e cai no feed de alguém.")}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* prévia */}
      <div className="relative mt-8 flex h-[220px] items-center justify-center overflow-hidden border-2 border-[#F5F1E8]/12 bg-[#15120E]">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ background: "repeating-conic-gradient(from 0deg at 50% 50%, #F2B705 0deg 9deg, transparent 9deg 18deg)" }} />
        <AnimatePresence>
          {!flying && (
            <motion.div
              key="chest"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ y: -300, rotate: -16, scale: 0.5, opacity: 0, transition: { duration: 0.5, ease: [0.4, 0, 1, 1] } }}
              className="relative"
            >
              <ChestArt chest="ouro" open={false} shake />
              <motion.span
                key={cents}
                className="absolute -right-6 -top-4 rotate-6 border-2 border-black bg-[#F5F1E8] px-2 py-0.5 text-sm font-black text-black shadow-[3px_3px_0_#000]"
                initial={{ scale: 1.4 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 600, damping: 16 }}
              >
                {cents > 0 ? brl(cents) : "R$ —"}
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* valor */}
      <h2 className="mt-8 text-xs font-black uppercase tracking-[0.25em] text-[#9A938A]">{t("bauAmount", "Quanto vai no baú")}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => {
              setAmountText(String(p / 100))
              fx("mirar", "mirar")
            }}
            className={chip(cents === p)}
          >
            {brl(p)}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center border-2 border-[#F5F1E8]/15 bg-[#1D1810] focus-within:border-[#F2B705]">
        <span className="pl-3 font-black text-[#9A938A]">R$</span>
        <input
          inputMode="decimal"
          value={amountText}
          onChange={(e) => setAmountText(e.target.value.slice(0, 16))}
          className="h-12 min-w-0 flex-1 bg-transparent px-2 text-lg font-black text-[#F5F1E8] outline-none"
          aria-label={t("bauAmount", "Quanto vai no baú")}
        />
      </div>
      {cfg && (tooLow || tooHigh) && (
        <p className="mt-1 text-xs font-bold text-red-300">
          {tooLow
            ? t("bauMin", "Mínimo de {v}").replace("{v}", brl(cfg.min_cents))
            : t("bauMax", "Máximo de {v}").replace("{v}", brl(cfg.max_cents))}
        </p>
      )}
      {preview && !tooLow && !tooHigh && (
        <motion.div
          key={cents}
          initial={{ opacity: 0.4, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 border-2 border-[#F2B705]/40 bg-black/30 p-3 text-xs text-[#C9C2B6]"
        >
          <div className="flex justify-between font-bold">
            <span>{t("bauFeeDonation", "Freelandoo (doação)")}</span>
            <span>−{brl(preview.platform)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t("bauFeeProcessor", "Tarifa do pagamento")}</span>
            <span>{t("bauFeeProcessorValue", "a do Mercado Pago")}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>{t("bauFeeWithdraw", "Freelandoo (saque)")}</span>
            <span>−{brl(preview.withdraw)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-[#F5F1E8]/10 pt-1 text-sm font-black text-[#F2B705]">
            <span>{t("bauNet", "Quem receber fica com cerca de")}</span>
            <span>{brl(preview.net)}</span>
          </div>
        </motion.div>
      )}

      {/* região */}
      <h2 className="mt-8 flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.25em] text-[#9A938A]">
        <MapPin className="h-3.5 w-3.5" />
        {t("bauWhere", "Onde o baú vai cair")}
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <select
          value={uf}
          onChange={(e) => setUf(e.target.value)}
          className="h-12 border-2 border-[#F5F1E8]/15 bg-[#1D1810] px-3 font-bold text-[#F5F1E8] outline-none focus:border-[#F2B705]"
          aria-label={t("bauState", "Estado")}
        >
          <option value="">{t("bauPickState", "Escolha o estado")}</option>
          {ESTADOS_BRASIL.map((e) => (
            <option key={e.uf} value={e.uf}>
              {e.nome}
            </option>
          ))}
        </select>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          disabled={!uf || regions.length === 0}
          className="h-12 border-2 border-[#F5F1E8]/15 bg-[#1D1810] px-3 font-bold text-[#F5F1E8] outline-none focus:border-[#F2B705] disabled:opacity-50"
          aria-label={t("bauRegion", "Região")}
        >
          <option value="">{t("bauWholeState", "O estado inteiro")}</option>
          {regions.map((r) => (
            <option key={r.id_region} value={r.id_region}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-2 text-xs text-[#9A938A]">
        {t("bauWhereHint", "Ele cai para uma pessoa sorteada que abrir o feed ali. Se ninguém da região aparecer em uma semana, vale o estado todo.")}
      </p>

      {/* recado + anônimo */}
      <h2 className="mt-8 text-xs font-black uppercase tracking-[0.25em] text-[#9A938A]">{t("chestMessage", "Mensagem")}</h2>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value.slice(0, 140))}
        rows={2}
        placeholder={t("chestMessagePh", "Escreva algo curto (opcional)")}
        className="mt-3 w-full border-2 border-[#F5F1E8]/15 bg-[#1D1810] p-3 font-bold text-[#F5F1E8] outline-none focus:border-[#F2B705]"
      />
      <button onClick={() => setAnonymous((v) => !v)} className={`${chip(anonymous)} mt-3`}>
        <EyeOff className="h-4 w-4" />
        {anonymous ? t("bauAnonOn", "Doação anônima") : t("bauAnonOff", "Mostrar meu nome")}
      </button>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={pay}
        disabled={busy || !uf || tooLow || tooHigh || cents <= 0}
        className="mt-8 inline-flex h-14 w-full items-center justify-center gap-2 border-[3px] border-black bg-[#F2B705] text-base font-black uppercase tracking-wider text-black shadow-[6px_6px_0_#000] disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Gift className="h-5 w-5" />}
        {cents > 0 ? t("bauPay", "Pagar {v} e soltar o baú").replace("{v}", brl(cents)) : t("bauPayEmpty", "Pagar e soltar o baú")}
      </motion.button>
      <p className="mt-2 text-center text-[11px] text-[#9A938A]">{t("bauNotLootbox", "É uma doação: quem recebe não paga nada e não sabe que vai ganhar.")}</p>

      {mine.length > 0 && (
        <>
          <h2 className="mt-12 text-xs font-black uppercase tracking-[0.25em] text-[#9A938A]">{t("bauMine", "Seus baús de doação")}</h2>
          <ul className="mt-3 space-y-2">
            {mine.map((b, i) => (
              <motion.li
                key={b.id_bau}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 border-2 border-[#F5F1E8]/12 bg-[#1D1810] p-3"
              >
                <Gift className={"h-5 w-5 shrink-0 " + (b.status === "opened" ? "text-[#3DDC97]" : "text-[#F2B705]")} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-[#F5F1E8]">
                    {brl(b.amount_cents)} · {b.region_name || b.uf}
                  </div>
                  <div className="text-xs text-[#9A938A]">{statusLabel[b.status] || b.status}</div>
                </div>
              </motion.li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
