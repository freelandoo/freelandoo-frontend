"use client"

// "BLOQUEAR HORÁRIO" — o botão vermelho da agenda (pedido do Alex,
// 2026-10-31: "dá a opção dele bloquear um horário hoje, aí bloqueia lá de
// agendar").
//
// Grava a exceção POR DATA que a agenda já tinha (`availability-overrides`,
// `blocked_slots_json`), a MESMA da tela de configuração — não um segundo
// jeito de bloquear. A grade mostra os horários LIVRES do dia exatamente como
// a página de agendar os oferece (`available-slots`), somados aos que já
// estão bloqueados (para poder liberar). Horário já reservado não aparece:
// esse se resolve cancelando o agendamento, não bloqueando.
//
// ⚠️ O que a exceção do dia já tinha (horário especial, horários extras,
// observação) é PRESERVADO: o salvar regrava a linha inteira, e mandar só o
// bloqueio apagaria o resto em silêncio.

import { useCallback, useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { format, addDays } from "date-fns"
import { Ban, Check, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"

type Override = {
  id: number
  override_date: string
  is_day_blocked: boolean
  custom_start_time: string | null
  custom_end_time: string | null
  extra_slots_json: string[] | null
  blocked_slots_json: string[] | null
  note: string | null
}

const RED = "#D7261E"

function headers(): HeadersInit {
  const token = getToken()
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

const ymd = (d: Date) => format(d, "yyyy-MM-dd")

export function BlockTimeModal({
  profileId,
  open,
  onClose,
}: {
  profileId: string
  open: boolean
  onClose: () => void
}) {
  const t = useTranslations("Agenda")
  const today = useMemo(() => ymd(new Date()), [])
  const tomorrow = useMemo(() => ymd(addDays(new Date(), 1)), [])

  const [date, setDate] = useState(today)
  const [free, setFree] = useState<string[]>([])
  const [existing, setExisting] = useState<Override | null>(null)
  const [blocked, setBlocked] = useState<Set<string>>(new Set())
  const [dayBlocked, setDayBlocked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (d: string) => {
    setLoading(true)
    try {
      const [slotsRes, ovRes] = await Promise.all([
        fetch(`/api/public/profile/${profileId}/available-slots?date=${d}`, { cache: "no-store" }),
        fetch(`/api/profile/${profileId}/availability-overrides`, { headers: headers(), cache: "no-store" }),
      ])
      const slots = slotsRes.ok ? ((await slotsRes.json()).slots || []) as { start: string }[] : []
      const ovs = ovRes.ok ? ((await ovRes.json()).overrides || []) as Override[] : []
      const ov = ovs.find((o) => String(o.override_date).slice(0, 10) === d) || null
      setFree(slots.map((s) => s.start.slice(0, 5)))
      setExisting(ov)
      setBlocked(new Set((ov?.blocked_slots_json || []).map((x) => String(x).slice(0, 5))))
      setDayBlocked(!!ov?.is_day_blocked)
    } catch {
      setFree([])
    } finally {
      setLoading(false)
    }
  }, [profileId])

  useEffect(() => {
    if (open) load(date)
  }, [open, date, load])

  // Livres + já bloqueados (para poder liberar), em ordem.
  const grid = useMemo(() => {
    const all = new Set([...free, ...blocked])
    let list = [...all].sort()
    // Hoje: horário que já passou não se bloqueia (nem se oferece).
    if (date === today) {
      const now = format(new Date(), "HH:mm")
      list = list.filter((h) => h > now || blocked.has(h))
    }
    return list
  }, [free, blocked, date, today])

  const toggle = (h: string) =>
    setBlocked((prev) => {
      const next = new Set(prev)
      if (next.has(h)) next.delete(h)
      else next.add(h)
      return next
    })

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/profile/${profileId}/availability-overrides`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          override_date: date,
          is_day_blocked: dayBlocked,
          custom_start_time: existing?.custom_start_time ?? null,
          custom_end_time: existing?.custom_end_time ?? null,
          extra_slots_json: existing?.extra_slots_json ?? null,
          blocked_slots_json: [...blocked].sort(),
          note: existing?.note ?? null,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || t("blockError", "Não foi possível bloquear agora."))
      toast.success(
        dayBlocked
          ? t("blockDaySaved", "Dia fechado para agendamento.")
          : t("blockSaved", "Pronto: esses horários saíram da página de agendar.")
      )
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("blockError", "Não foi possível bloquear agora."))
    } finally {
      setSaving(false)
    }
  }

  if (!open || typeof document === "undefined") return null

  const chip = (value: string, label: string) => (
    <button
      type="button"
      onClick={() => setDate(value)}
      aria-pressed={date === value}
      className="border-2 border-[#0B0B0D] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em]"
      style={date === value ? { background: "#F1EDE2", color: "#0B0B0D" } : { background: "#1D1810", color: "#F1EDE2" }}
    >
      {label}
    </button>
  )

  return createPortal(
    <div
      className="fl-sharp fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      onClick={() => !saving && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("blockTitle", "Bloquear horário")}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto border-2 border-[#0B0B0D] bg-[#15120E] p-5 text-[#F1EDE2]"
        style={{ boxShadow: `6px 6px 0 0 ${RED}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="fl-display flex items-center gap-2 text-2xl leading-none">
            <Ban className="h-5 w-5" style={{ color: RED }} /> {t("blockTitle", "Bloquear horário")}
          </p>
          <button
            type="button"
            className="shrink-0 border-2 border-[#0B0B0D] bg-[#1D1810] p-1.5"
            onClick={() => !saving && onClose()}
            aria-label={t("newBookingClose", "Fechar")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[#9A938A]">
          {t("blockIntro", "Toque nos horários que você não vai atender. Eles somem da página de agendar.")}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {chip(today, t("blockToday", "Hoje"))}
          {chip(tomorrow, t("blockTomorrow", "Amanhã"))}
          <input
            type="date"
            value={date}
            min={today}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            aria-label={t("blockPickDate", "Outra data")}
            className="border-2 border-[#0B0B0D] bg-[#1D1810] px-2 py-1 text-xs text-[#F1EDE2]"
          />
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={dayBlocked}
            onChange={(e) => setDayBlocked(e.target.checked)}
            className="h-4 w-4"
            style={{ accentColor: RED }}
          />
          {t("blockWholeDay", "Fechar o dia inteiro")}
        </label>

        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#9A938A]" />
            </div>
          ) : dayBlocked ? (
            <p className="border-2 border-dashed px-4 py-6 text-center text-sm font-bold" style={{ borderColor: RED, color: "#FCA5A5" }}>
              {t("blockDayNote", "Ninguém consegue agendar neste dia.")}
            </p>
          ) : grid.length === 0 ? (
            <p className="border-2 border-dashed border-[#F1EDE2]/15 px-4 py-6 text-center text-sm text-[#9A938A]">
              {t("blockNoSlots", "Não há horários livres neste dia.")}
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {grid.map((h) => {
                const on = blocked.has(h)
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => toggle(h)}
                    aria-pressed={on}
                    className="flex items-center justify-center gap-1 border-2 px-1 py-2 font-mono text-sm font-bold tabular-nums"
                    style={
                      on
                        ? { background: RED, borderColor: "#0B0B0D", color: "#fff", textDecoration: "line-through" }
                        : { background: "#1D1810", borderColor: "#F1EDE2", color: "#F1EDE2" }
                    }
                  >
                    {on ? <Ban className="h-3 w-3" /> : null}
                    {h}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={saving || loading}
          onClick={save}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] px-4 py-3.5 text-sm font-extrabold uppercase tracking-[0.12em] text-white disabled:opacity-50"
          style={{ background: RED, boxShadow: "4px 4px 0 0 #0B0B0D" }}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {t("blockSave", "Salvar bloqueio")}
        </button>
      </div>
    </div>,
    document.body
  )
}
