"use client"

// features/meu-mundo/ui/clan/clan-choice.tsx — escolha da classe (mm3d-58).
//
// Abre ANTES do jogo para quem ainda não tem classe (o GET /neighborhood
// responde 409 needs_clan): ninguém entra sem escolher. Leve de propósito —
// só retratos, sem Babylon. Cabe na tela do celular sem rolagem.

import { useState } from "react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { MM } from "../hud/tokens"
import { PORTRAIT } from "../portraits"
import { CLANS, YOUNG_BODY, type Clan, type Sex } from "../../classes"
import { postClanChoose } from "../../data"

const ACCENT: Record<Clan, string> = { raposa: "#FF7A1F", vampiro: "#E0213B" }

export default function ClanChoice({ onChosen }: { onChosen: () => void }) {
  const t = useTranslations("MeuMundo")
  const [sex, setSex] = useState<Sex>("m")
  const [clan, setClan] = useState<Clan | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const title: Record<Clan, string> = { raposa: t("clanFoxes", "Raposas"), vampiro: t("clanVampires", "Vampiros") }
  const line: Record<Clan, string> = {
    raposa: t("clanFoxLine", "Magia com o cajado: golpes de longe e em área."),
    vampiro: t("clanVampireLine", "Espada na mão: golpes rápidos de perto."),
  }

  const confirm = async () => {
    const token = getToken()
    if (!clan || !token || busy) return
    setBusy(true)
    setErr(null)
    const r = await postClanChoose(token, clan, sex)
    if (r.ok || r.code === "clan_chosen") return onChosen()
    setBusy(false)
    setErr(r.status === 0 ? t("levelNetError", "Sem conexão. Tente de novo.") : r.error)
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center overflow-hidden px-4"
      style={{
        background: "radial-gradient(ellipse at 50% 20%, #2A1A22 0%, #12161C 55%, #0A0C10 100%)",
        color: MM.text,
        paddingTop: "max(16px, env(safe-area-inset-top))",
        paddingBottom: "max(16px, env(safe-area-inset-bottom))",
      }}
    >
      <div className="flex h-full w-full max-w-[760px] min-h-0 flex-col gap-3">
        <header className="shrink-0 text-center">
          <h1 className="text-[22px] font-black uppercase tracking-[0.08em] sm:text-[30px]">{t("clanTitle", "Escolha sua classe")}</h1>
          <p className="mx-auto mt-1 max-w-[560px] text-[12px] leading-snug sm:text-[14px]" style={{ color: MM.muted }}>
            {t("clanIntro", "Raposas moram com raposas e vampiros com vampiros. No centro todos se encontram — e de noite as classes se enfrentam.")}
          </p>
        </header>

        <div className="flex shrink-0 justify-center gap-2" role="radiogroup" aria-label={t("clanSexLabel", "Personagem")}>
          {(["m", "f"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={sex === s}
              onClick={() => setSex(s)}
              className="h-9 px-4 text-[12px] font-bold uppercase tracking-[0.1em]"
              style={{
                borderRadius: MM.radius.chip,
                background: sex === s ? MM.rubySoft : MM.card,
                border: `1px solid ${sex === s ? MM.rubyBorder : MM.border}`,
                color: MM.text,
                transition: `background ${MM.dur.press}ms ${MM.ease}`,
              }}
            >
              {s === "m" ? t("clanBoy", "Menino") : t("clanGirl", "Menina")}
            </button>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-3" role="radiogroup" aria-label={t("clanTitle", "Escolha sua classe")}>
          {CLANS.map((c) => {
            const on = clan === c
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setClan(c)}
                className="flex min-h-0 flex-col overflow-hidden text-left"
                style={{
                  borderRadius: MM.radius.panel,
                  background: MM.surface,
                  border: `${on ? 2 : 1}px solid ${on ? ACCENT[c] : MM.border}`,
                  boxShadow: on ? `0 0 0 3px ${ACCENT[c]}33, ${MM.shadow}` : MM.shadowSoft,
                  transform: on ? "scale(1.015)" : "scale(1)",
                  transition: `transform ${MM.dur.press}ms ${MM.ease}, box-shadow ${MM.dur.press}ms ${MM.ease}`,
                }}
              >
                <div className="relative min-h-0 flex-1 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element -- retrato estático do jogo, como o resto da HUD */}
                  <img
                    src={PORTRAIT[YOUNG_BODY[c][sex]]}
                    alt={title[c]}
                    className="absolute inset-0 h-full w-full object-cover object-top"
                    draggable={false}
                  />
                </div>
                <div className="shrink-0 px-3 py-2.5">
                  <div className="text-[16px] font-black uppercase tracking-[0.08em] sm:text-[20px]" style={{ color: on ? ACCENT[c] : MM.text }}>
                    {title[c]}
                  </div>
                  <div className="mt-0.5 text-[11px] leading-snug sm:text-[13px]" style={{ color: MM.muted }}>
                    {line[c]}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <footer className="shrink-0 text-center">
          {err && (
            <p className="mb-2 text-[12px]" style={{ color: MM.danger }} role="alert">
              {err}
            </p>
          )}
          <button
            type="button"
            onClick={confirm}
            disabled={!clan || busy}
            className="h-12 w-full max-w-[420px] text-[14px] font-black uppercase tracking-[0.1em]"
            style={{
              borderRadius: MM.radius.button,
              background: clan && !busy ? MM.rubyFill : MM.card,
              border: `1px solid ${clan && !busy ? MM.rubyBorder : MM.border}`,
              color: clan && !busy ? MM.text : MM.disabledText,
            }}
          >
            {busy
              ? t("clanBusy", "Preparando sua casa…")
              : clan
                ? t("clanConfirm", "Entrar como {c}").replace("{c}", title[clan])
                : t("clanPick", "Escolha uma classe")}
          </button>
          <p className="mt-2 text-[11px]" style={{ color: MM.muted }}>
            {t("clanForever", "A classe é para sempre — só um artefato raro troca.")}
          </p>
        </footer>
      </div>
    </div>
  )
}
