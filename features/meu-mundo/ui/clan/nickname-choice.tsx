"use client"

// features/meu-mundo/ui/clan/nickname-choice.tsx — apelidos (mm3d-72).
//
// Pedido do Alex: "quando a pessoa entra no jogo ela escolhe um apelido pro
// jogo, e também dá um apelido para os personagens". Abre ANTES do jogo para
// quem ainda não tem apelido (depois da classe), no mesmo visual da escolha de
// classe. O hóspede chama o dono pelo apelido dele até gostar muito (ou pouco)
// dele — aí o servidor troca pelo que ele mais gosta (ou mais odeia).

import { useState } from "react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { MM } from "../hud/tokens"
import { LanguageButton } from "../hud/language-item"
import { postLifeNickname, postLifePetName } from "../../data"
import { TEMPER_COLOR, temperLabel, temperLine, type LifeSoul } from "../../soul"

const ok = (v: string) => {
  const n = v.replace(/\s+/g, " ").trim().length
  return n >= 2 && n <= 20
}

export default function NicknameChoice({ soul, onDone }: { soul: LifeSoul | null; onDone: () => void }) {
  const t = useTranslations("MeuMundo")
  const [nick, setNick] = useState("")
  const [pet, setPet] = useState(soul?.petName ?? "")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const ready = ok(nick) && ok(pet)

  const confirm = async () => {
    const token = getToken()
    if (!ready || !token || busy) return
    setBusy(true)
    setErr(null)
    const a = await postLifeNickname(token, nick)
    const b = a.ok ? await postLifePetName(token, pet) : a
    if (a.ok && b.ok) return onDone()
    setBusy(false)
    const bad = !a.ok ? a : !b.ok ? b : null
    setErr(bad && bad.status === 0 ? t("levelNetError", "Sem conexão. Tente de novo.") : (bad?.error ?? null))
  }

  const field = (label: string, hint: string, value: string, set: (v: string) => void, id: string) => (
    <label htmlFor={id} className="block text-left">
      <span className="text-[12px] font-bold uppercase tracking-[0.12em]">{label}</span>
      <input
        id={id}
        value={value}
        maxLength={20}
        autoComplete="off"
        onChange={(e) => set(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && confirm()}
        className="mt-1 h-12 w-full px-3 text-[16px] font-semibold outline-none"
        style={{ borderRadius: MM.radius.button, background: MM.card, border: `1px solid ${ok(value) ? MM.rubyBorder : MM.border}`, color: MM.text }}
      />
      <span className="mt-1 block text-[11px]" style={{ color: MM.muted }}>
        {hint}
      </span>
    </label>
  )

  return (
    <div
      className="fixed inset-0 flex flex-col items-center overflow-y-auto px-4"
      style={{
        background: "radial-gradient(ellipse at 50% 20%, #2A1A22 0%, #12161C 55%, #0A0C10 100%)",
        color: MM.text,
        paddingTop: "max(16px, env(safe-area-inset-top))",
        paddingBottom: "max(16px, env(safe-area-inset-bottom))",
      }}
    >
      <div className="flex w-full max-w-[520px] flex-col gap-4">
        <div className="flex justify-end">
          <LanguageButton />
        </div>
        <header className="text-center">
          <h1 className="text-[22px] font-black uppercase tracking-[0.08em] sm:text-[28px]">{t("nickTitle", "Como vocês vão se chamar?")}</h1>
          <p className="mx-auto mt-1 max-w-[460px] text-[13px] leading-snug" style={{ color: MM.muted }}>
            {t("nickIntro", "Seu personagem vai te chamar pelo seu apelido. Cuide bem dele: se ele gostar muito de você, troca o apelido pelo que ele mais gosta. Se for maltratado, pelo que ele mais odeia.")}
          </p>
        </header>
        {soul && (
          <div className="px-3 py-2.5 text-left" style={{ borderRadius: MM.radius.panel, background: MM.surface, border: `1px solid ${MM.border}` }}>
            <div className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: MM.muted }}>
              {t("nickTemper", "A personalidade dele")}
            </div>
            <div className="text-[20px] font-black uppercase tracking-[0.08em]" style={{ color: TEMPER_COLOR[soul.temper] }}>
              {temperLabel(soul.temper, t)}
            </div>
            <div className="text-[12px] leading-snug" style={{ color: MM.muted }}>
              {temperLine(soul.temper, t)}
            </div>
          </div>
        )}
        {field(t("nickMine", "Seu apelido no jogo"), t("nickMineHint", "De 2 a 20 letras. Vale para todos os seus personagens."), nick, setNick, "mm-nick")}
        {field(t("nickPet", "Apelido do seu personagem"), t("nickPetHint", "De 2 a 20 letras."), pet, setPet, "mm-pet")}
        <footer className="text-center">
          {err && (
            <p className="mb-2 text-[12px]" style={{ color: MM.danger }} role="alert">
              {err}
            </p>
          )}
          <button
            type="button"
            onClick={confirm}
            disabled={!ready || busy}
            className="h-12 w-full text-[14px] font-black uppercase tracking-[0.1em]"
            style={{
              borderRadius: MM.radius.button,
              background: ready && !busy ? MM.rubyFill : MM.card,
              border: `1px solid ${ready && !busy ? MM.rubyBorder : MM.border}`,
              color: ready && !busy ? MM.text : MM.disabledText,
            }}
          >
            {busy ? t("nickBusy", "Guardando…") : t("nickConfirm", "Entrar no jogo")}
          </button>
        </footer>
      </div>
    </div>
  )
}
