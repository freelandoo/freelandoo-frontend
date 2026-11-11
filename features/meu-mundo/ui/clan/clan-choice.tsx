"use client"

// features/meu-mundo/ui/clan/clan-choice.tsx — o despertar na cápsula três.
//
// mm3d-58 abria aqui uma tela de "escolha sua classe". Lore v2 C1 (cap. 1, "A
// Cápsula Três"): a conta nova acorda no Laboratório de Criogenia e a classe sai
// da conversa com a Dra. Nívea — "Do sol ou da lua?" (historia/v2/07-falas-e-
// arquivo.md §2). A regra não muda: abre ANTES do jogo para quem ainda não tem
// classe (o GET /neighborhood responde 409 needs_clan), a escolha chama a mesma
// rota (POST /clan) e ninguém entra sem escolher. Leve de propósito — só
// retratos, sem Babylon. Cabe na tela do celular sem rolagem.
// Texto: ui/talk/npc-text.json (mesmas chaves da conversa da Nívea no jogo).

import { useState } from "react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { MM } from "../hud/tokens"
import { LanguageButton } from "../hud/language-item"
import { PORTRAIT } from "../portraits"
import { CLANS, YOUNG_BODY, type Clan, type Sex } from "../../classes"
import { postClanChoose } from "../../data"
import TEXT from "../talk/npc-text.json"

const ACCENT: Record<Clan, string> = { raposa: "#FF7A1F", vampiro: "#E0213B" }
const PT: Record<string, string[]> = TEXT
type T = (k: string, f: string) => string

/** Antes da pergunta: as falas da Nívea na ordem; depois da escolha: a resposta dela. */
const BEFORE = ["npc_nivea_despertar_1", "npc_nivea_despertar_2", "npc_nivea_despertar_3", "npc_nivea_despertar_4"]
const afterOf = (c: Clan) => [`npc_nivea_classe_1_${c}`, "npc_nivea_despertar_5"]

export default function ClanChoice({ onChosen }: { onChosen: () => void }) {
  const t = useTranslations("MeuMundo") as T
  const tx = (k: string) => t(k, PT[k]?.[0] ?? k)
  const [sex, setSex] = useState<Sex>("m")
  // página da conversa: 0..3 antes da pergunta; a pergunta fica aberta na 3
  const [i, setI] = useState(0)
  const [chosen, setChosen] = useState<Clan | null>(null)
  const [j, setJ] = useState(0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const asking = !chosen && i >= BEFORE.length - 1
  const line = chosen ? afterOf(chosen)[j] : BEFORE[Math.min(i, BEFORE.length - 1)]
  const lastAfter = !!chosen && j >= afterOf(chosen).length - 1

  const title: Record<Clan, string> = { raposa: t("clanFoxes", "Raposas"), vampiro: t("clanVampires", "Vampiros") }
  const what: Record<Clan, string> = {
    raposa: t("clanFoxLine", "Magia com o cajado: golpes de longe e em área."),
    vampiro: t("clanVampireLine", "Espada na mão: golpes rápidos de perto."),
  }
  const answer: Record<Clan, string> = { raposa: tx("capsuleSun"), vampiro: tx("capsuleMoon") }

  const choose = async (c: Clan) => {
    const token = getToken()
    if (!token || busy) return
    setBusy(true)
    setErr(null)
    const r = await postClanChoose(token, c, sex)
    setBusy(false)
    // "clan_chosen" = já tinha classe (outra aba): segue para o jogo do mesmo jeito
    if (r.ok || r.code === "clan_chosen") {
      setChosen(c)
      setJ(0)
      return
    }
    setErr(r.status === 0 ? t("levelNetError", "Sem conexão. Tente de novo.") : r.error)
  }

  const next = () => {
    if (chosen) return lastAfter ? onChosen() : setJ((n) => n + 1)
    if (!asking) setI((n) => n + 1)
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center overflow-hidden px-4"
      style={{
        // frio de laboratório: o gelo da cápsula ainda no ar
        background: "radial-gradient(ellipse at 50% 18%, #1C2B33 0%, #10161C 55%, #0A0C10 100%)",
        color: MM.text,
        paddingTop: "max(16px, env(safe-area-inset-top))",
        paddingBottom: "max(16px, env(safe-area-inset-bottom))",
      }}
    >
      <div className="flex h-full w-full max-w-[760px] min-h-0 flex-col gap-3">
        <div className="flex shrink-0 items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] sm:text-[11px]" style={{ color: MM.muted }}>
            {tx("capsuleEyebrow")}
          </p>
          <LanguageButton />
        </div>

        {/* a Dra. Nívea fala: retrato + nome + balão (como a conversa do jogo) */}
        <section className="flex shrink-0 items-start gap-3 p-3" style={{ borderRadius: MM.radius.panel, background: MM.surface, border: `1px solid ${MM.border}`, boxShadow: MM.shadowSoft }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- retrato estático do jogo, como o resto da HUD */}
          <img src={PORTRAIT.raposa_adulta} alt="" width={72} height={90} className="h-[90px] w-[72px] shrink-0 object-cover object-top" style={{ borderRadius: MM.radius.chip }} draggable={false} />
          <div className="min-h-[90px] min-w-0 flex-1" role="status" aria-live="polite">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: MM.muted }}>
              {tx("npc_nivea_name")}
            </p>
            <p key={line} className="text-[16px] leading-snug sm:text-[18px]">
              {tx(line)}
            </p>
          </div>
        </section>

        {asking ? (
          <>
            <div className="flex shrink-0 items-center justify-center gap-2" role="radiogroup" aria-label={tx("capsuleBody")}>
              <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: MM.muted }}>
                {tx("capsuleBody")}
              </span>
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

            {/* as duas respostas: tocar já responde (a escolha é a fala) */}
            <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
              {CLANS.map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={busy}
                  onClick={() => void choose(c)}
                  className="flex min-h-0 flex-col overflow-hidden text-left disabled:opacity-60"
                  style={{ borderRadius: MM.radius.panel, background: MM.surface, border: `1px solid ${MM.border}`, boxShadow: MM.shadowSoft }}
                >
                  <div className="relative min-h-0 flex-1 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element -- retrato estático do jogo, como o resto da HUD */}
                    <img src={PORTRAIT[YOUNG_BODY[c][sex]]} alt={title[c]} className="absolute inset-0 h-full w-full object-cover object-top" draggable={false} />
                  </div>
                  <div className="shrink-0 px-3 py-2.5">
                    <div className="text-[18px] font-black uppercase tracking-[0.08em] sm:text-[22px]" style={{ color: ACCENT[c] }}>
                      {answer[c]}
                    </div>
                    <div className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.1em] sm:text-[12px]" style={{ color: MM.text }}>
                      {title[c]}
                    </div>
                    <div className="mt-0.5 text-[11px] leading-snug sm:text-[13px]" style={{ color: MM.muted }}>
                      {what[c]}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <footer className="shrink-0 text-center">
              {err && (
                <p className="mb-2 text-[12px]" style={{ color: MM.danger }} role="alert">
                  {err}
                </p>
              )}
              <p className="text-[11px]" style={{ color: MM.muted }}>
                {busy ? t("clanBusy", "Preparando sua casa…") : t("clanForever", "A classe é para sempre — só um artefato raro troca.")}
              </p>
            </footer>
          </>
        ) : (
          <>
            {/* entre as falas: o retrato de quem acorda (depois da escolha, o do povo escolhido) */}
            <div className="relative min-h-0 flex-1 overflow-hidden" style={{
                borderRadius: MM.radius.panel,
                border: `1px solid ${MM.border}`,
                // antes da escolha: o vidro gelado da cápsula (sem arte nova)
                background: chosen ? MM.card : "linear-gradient(180deg, rgba(180,220,235,0.16) 0%, rgba(120,170,190,0.06) 55%, rgba(20,30,36,0.4) 100%)",
              }}>
              {chosen && (
                // eslint-disable-next-line @next/next/no-img-element -- retrato estático do jogo, como o resto da HUD
                <img src={PORTRAIT[YOUNG_BODY[chosen][sex]]} alt={title[chosen]} className="absolute inset-0 h-full w-full object-contain object-bottom" draggable={false} />
              )}
            </div>
            <footer className="shrink-0 text-center">
              <button
                type="button"
                onClick={next}
                className="h-12 w-full max-w-[420px] text-[14px] font-black uppercase tracking-[0.1em]"
                style={{ borderRadius: MM.radius.button, background: MM.rubyFill, border: `1px solid ${MM.rubyBorder}`, color: MM.text }}
              >
                {lastAfter ? tx("capsuleEnter") : tx("npcNext")}
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}
