"use client"

// features/meu-mundo/ui/lab/lab-panel.tsx — B12: LABORATÓRIO DE CRIOGENIA (pedido do Alex, 08/11).
//
// Três telas do mesmo painel, abertas pelos pontos do interior:
//   • "talk"       — a criogenista (Dra. Nívea) conversa e leva às outras telas;
//   • "embryo"     — o tanque dos embriões: compra o embrião de uma espécie (entra na
//                    cápsula com 1 m, congelado); preço em Esmeralda, admin não paga;
//   • "accelerate" — o acelerador: leva um personagem que ainda não chegou aos 15 anos
//                    direto para a fase de jovem completa.
// As cápsulas congeladas (a tela que era das skins) são o CharacterCapsule com `frozen`.
// Só apresentação: preço, vagas e quem aceita o acelerador vêm do servidor
// (MeuMundoCharacterService.buyEmbryo/accelerate, regra em characters/rules.ts LAB).

import { useCallback, useEffect, useRef, useState } from "react"
import { Egg, FastForward, Loader2, MessagesSquare, Snowflake, X } from "lucide-react"
import { useLocale } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { getCharacters, postCharacterAccelerate, postCharacterEmbryo } from "../../data"
import type { BodyId, CharactersResult } from "../../types"
import { speciesBody } from "../../characters/rules"
import { speciesName } from "../../characters/names"
import { PORTRAIT } from "../portraits"
import { EvoButton, EvoToast } from "../hud/hud-kit"
import { Chamfer, EVO, archivo, teko } from "../status/evo-skin"
import { MM } from "../hud/tokens"

type Tr = (key: string, fallback: string) => string
export type LabMode = "talk" | "embryo" | "accelerate"

/** O gelo do laboratório (mesmo ciano das cápsulas do prédio e do interior). */
export const ICE = { glow: "#73E0FF", deep: "#0B1E2C", panel: "#0F2636", frost: "#D6EEF6", line: "rgba(115,224,255,.45)" }

/** Falas da criogenista (uma por visita, sorteada ao abrir). */
const LINES: [string, string][] = [
  ["labLine1", "Bem-vindo ao Laboratório de Criogenia. Aqui ninguém envelhece: quem entra na cápsula para no tempo."],
  ["labLine2", "Seus personagens descansam congelados. Não sentem fome, não perdem força — só esperam você voltar."],
  ["labLine3", "Um embrião nasce com um metro. Descongelado, leva trinta dias de vida para chegar aos 15 anos… a não ser que você use o acelerador."],
  ["labLine4", "O acelerador é seguro. Quase sempre. Brincadeira — é seguro sempre."],
  ["labLine5", "Cuidado com a geada no chão. O último estagiário ainda está na cápsula três."],
  ["labLine6", "Cada embrião tem certificado, número de série e genética própria. Nenhum é igual ao outro."],
]

export interface LabPanelProps {
  t: Tr
  mode: LabMode
  onMode: (m: LabMode | "cryo") => void
  onClose: () => void
}

const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

export default function LabPanel({ t, mode, onMode, onClose }: LabPanelProps) {
  const locale = useLocale()
  const [data, setData] = useState<CharactersResult | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [sex, setSex] = useState<"m" | "f">("m")
  const [line] = useState(() => LINES[Math.floor(Math.random() * LINES.length)])
  // chave do pedido: a mesma para o reenvio da mesma compra (clique duplo não compra 2×)
  const keyRef = useRef<{ species: string; key: string } | null>(null)

  const say = useCallback((msg: string) => {
    setNotice(msg)
    window.setTimeout(() => setNotice(null), 2800)
  }, [])

  useEffect(() => {
    const token = getToken()
    if (!token) return
    let alive = true
    void getCharacters(token).then((r) => {
      if (!alive) return
      if (r.ok) setData(r.data)
      else setFailed(r.error)
    })
    return () => {
      alive = false
    }
  }, [])

  const money = (n: number) => (n === 0 ? t("labFree", "Grátis") : t("labPrice", "{n} Esmeralda").replace("{n}", n.toLocaleString(locale)))
  const lab = data?.characters.lab ?? null
  const coins = data?.wallet?.coins ?? null
  const capsule = data?.characters.capsule ?? null
  const full = !!capsule && capsule.used >= capsule.slots

  const buy = async (species: string, sx: "m" | "f" | null) => {
    const token = getToken()
    if (!token || busy) return
    if (!keyRef.current || keyRef.current.species !== `${species}:${sx ?? ""}`) keyRef.current = { species: `${species}:${sx ?? ""}`, key: newKey() }
    setBusy(true)
    const r = await postCharacterEmbryo(token, species, keyRef.current.key, sx ?? undefined)
    setBusy(false)
    if (!r.ok) return say(r.error)
    keyRef.current = null
    setData(r.data)
    say(t("labBought", "Embrião na cápsula. Ele nasce com 1 m."))
  }

  const accelerate = async (id: string) => {
    const token = getToken()
    if (!token || busy) return
    setBusy(true)
    const r = await postCharacterAccelerate(token, id)
    setBusy(false)
    if (!r.ok) return say(r.error)
    setData(r.data)
    say(t("labAccelerated", "Pronto: agora ele tem 15 anos."))
  }

  const portraitOf = (species: string, sx: "m" | "f" | null) => {
    const body = speciesBody(species, sx ?? sex, "young") as BodyId | null
    return (body && PORTRAIT[body]) || PORTRAIT.normal
  }

  const title = mode === "embryo" ? t("labEmbryoTitle", "Tanque de embriões") : mode === "accelerate" ? t("labAccelTitle", "Acelerador") : t("labTitle", "Laboratório de Criogenia")
  const accelList = (data?.characters.list ?? []).filter((c) => c.canAccel)

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-3" onClick={onClose}>
      <div
        className={`${archivo.className} relative max-h-[92dvh] w-full max-w-[720px] overflow-y-auto p-4`}
        style={{ background: `linear-gradient(180deg, ${ICE.panel}, ${ICE.deep})`, border: `1px solid ${ICE.line}`, borderRadius: MM.radius.card, boxShadow: `0 0 28px rgba(115,224,255,.18)` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className={`${teko.className} flex items-center gap-2 text-[30px] uppercase tracking-[0.08em]`} style={{ color: ICE.frost }}>
            <Snowflake className="h-6 w-6" style={{ color: ICE.glow }} />
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label={t("chClose", "Fechar")} className="p-2" style={{ color: EVO.branco }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {mode === "talk" && (
          <div className="mt-3">
            <div className={`${teko.className} text-[20px] uppercase tracking-[0.12em]`} style={{ color: ICE.glow }}>
              {t("labNpcName", "Dra. Nívea, a criogenista")}
            </div>
            <p className="mt-2 text-[15px] leading-relaxed" style={{ color: EVO.branco }}>
              “{t(line[0], line[1])}”
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <EvoButton size="sm" icon={<Snowflake className="h-4 w-4" />} onClick={() => onMode("cryo")}>
                {t("pvCryo", "Ver as cápsulas")}
              </EvoButton>
              <EvoButton size="sm" variant="ghost" icon={<Egg className="h-4 w-4" />} onClick={() => onMode("embryo")}>
                {t("pvEmbryo", "Comprar embrião")}
              </EvoButton>
              <EvoButton size="sm" variant="ghost" icon={<FastForward className="h-4 w-4" />} onClick={() => onMode("accelerate")}>
                {t("pvAccelerate", "Usar o acelerador")}
              </EvoButton>
            </div>
          </div>
        )}

        {mode !== "talk" && (
          <>
            {!data && !failed && <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin" style={{ color: EVO.mudo }} />}
            {failed && <p className="my-6 text-center text-[14px]" style={{ color: EVO.perigo }}>{failed}</p>}
            {data && (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[13px]" style={{ color: EVO.mudo }}>
                <span>{coins != null && t("labBalance", "Seu saldo: {n} Esmeralda").replace("{n}", coins.toLocaleString(locale))}</span>
                {capsule && <span>{t("chCapsule", "Cápsula {used}/{slots}").replace("{used}", String(capsule.used)).replace("{slots}", String(capsule.slots))}</span>}
              </div>
            )}
          </>
        )}

        {mode === "embryo" && lab && (
          <>
            <p className="mt-2 text-[13px]" style={{ color: EVO.mudo }}>
              {t("labEmbryoIntro", "O embrião vai para a cápsula, congelado, com 1 m. Descongelado, cresce até os 15 anos em 30 dias de vida — ou na hora, com o acelerador.")}
            </p>
            {full && <p className="mt-2 text-[13px]" style={{ color: EVO.perigo }}>{t("labFull", "A cápsula está cheia: libere uma vaga antes de comprar.")}</p>}
            <div className="mt-3 flex items-center gap-2 text-[13px]" style={{ color: EVO.branco }}>
              <span>{t("labSexFor", "Sexo (raposas e vampiros):")}</span>
              {(["m", "f"] as const).map((sx) => (
                <EvoButton key={sx} size="sm" variant={sex === sx ? "gold" : "ghost"} onClick={() => setSex(sx)}>
                  {sx === "f" ? t("chFemale", "fêmea") : t("chMale", "macho")}
                </EvoButton>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {lab.embryos.map((e) => {
                const sx = e.sex ?? sex
                return (
                  <Chamfer key={e.species} cut={12}>
                    <div className="flex gap-3 p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={portraitOf(e.species, e.sex)} alt="" className="h-20 w-14 shrink-0 object-cover" style={{ borderRadius: MM.radius.card, filter: "saturate(.45) hue-rotate(160deg) brightness(1.1)" }} />
                      <div className="min-w-0 flex-1">
                        <div className={`${teko.className} text-[20px] uppercase leading-none tracking-[0.06em]`} style={{ color: ICE.frost }}>
                          {speciesName(e.species, t)}
                        </div>
                        <div className="mt-1 text-[12px]" style={{ color: EVO.mudo }}>
                          {sx === "f" ? t("chFemale", "fêmea") : t("chMale", "macho")} · {money(e.price)}
                        </div>
                        <div className="mt-2">
                          <EvoButton size="sm" icon={<Egg className="h-4 w-4" />} disabled={busy || full || (coins != null && coins < e.price)} onClick={() => void buy(e.species, e.sex ? null : sex)}>
                            {t("labBuy", "Comprar")}
                          </EvoButton>
                        </div>
                      </div>
                    </div>
                  </Chamfer>
                )
              })}
            </div>
          </>
        )}

        {mode === "accelerate" && lab && (
          <>
            <p className="mt-2 text-[13px]" style={{ color: EVO.mudo }}>
              {t("labAccelIntro", "O acelerador leva o personagem aos {n} anos na hora: ele pula a fase de crescer e fica jovem completo.").replace("{n}", String(lab.accelYears))}
            </p>
            {accelList.length === 0 ? (
              <p className="mt-4 text-[14px]" style={{ color: EVO.branco }}>
                {t("labAccelNone", "Nenhum personagem precisa do acelerador: todos já têm 15 anos ou mais.")}
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {accelList.map((c) => (
                  <Chamfer key={c.id} cut={12}>
                    <div className="flex items-center gap-3 p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={PORTRAIT[c.body] ?? PORTRAIT.normal} alt="" className="h-16 w-11 shrink-0 object-cover" style={{ borderRadius: MM.radius.card }} />
                      <div className="min-w-0 flex-1">
                        <div className={`${teko.className} text-[20px] uppercase leading-none`} style={{ color: ICE.frost }}>
                          {c.petName || speciesName(c.species, t)}
                        </div>
                        <div className="mt-1 text-[12px]" style={{ color: EVO.mudo }}>
                          {c.serialText} · {c.height.toFixed(2).replace(".", ",")} m · {t("chDays", "{n} dias de vida").replace("{n}", String(c.activeDays))}
                          {c.status === "capsule" && ` · ${t("chFrozen", "Congelado na cápsula")}`}
                        </div>
                      </div>
                      <EvoButton size="sm" icon={<FastForward className="h-4 w-4" />} disabled={busy || (coins != null && coins < lab.accelPrice)} onClick={() => void accelerate(c.id)}>
                        {t("labAccelGo", "Acelerar")} · {money(lab.accelPrice)}
                      </EvoButton>
                    </div>
                  </Chamfer>
                ))}
              </div>
            )}
          </>
        )}

        {mode !== "talk" && (
          <div className="mt-4">
            <EvoButton size="sm" variant="ghost" icon={<MessagesSquare className="h-4 w-4" />} onClick={() => onMode("talk")}>
              {t("labBack", "Falar com a criogenista")}
            </EvoButton>
          </div>
        )}

        {notice && (
          <div className="pointer-events-none fixed inset-x-0 top-6 flex justify-center">
            <EvoToast>{notice}</EvoToast>
          </div>
        )}
      </div>
    </div>
  )
}
