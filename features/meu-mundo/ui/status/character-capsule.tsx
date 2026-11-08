"use client"

// features/meu-mundo/ui/status/character-capsule.tsx — B3 (mig 340): PERSONAGENS.
// Substitui o vestuário de skins (mm3d-16): as skins viraram ESPÉCIES de personagem.
//
//   • um personagem ATIVO por vez; os outros ficam na CÁPSULA (5 vagas), congelados:
//     não envelhecem, não perdem atributo, não têm fome. "Usar" guarda o ativo e tira
//     o outro de onde parou.
//   • FUSÃO de dois adultos vivos: os pais viram histórico; o filho nasce com 1 m e
//     20% do maior pico de cada atributo; a espécie é escolhida entre as dos pais.
//   • cada um tem CERTIFICADO público por link (número de série, genética, pais e avós).
//
// Só leitura da regra: quem decide tudo é o servidor (MeuMundoCharacterService).

import { useCallback, useEffect, useState } from "react"
import { Award, GitMerge, Loader2, Plus, Snowflake, X } from "lucide-react"
import { getToken } from "@/lib/auth"
import { getCharacters, postCharacterFuse, postCharacterTestGrant, postCharacterUse } from "../../data"
import type { CharacterSummary, CharactersResult } from "../../types"
import { speciesById } from "../../characters/rules"
import { speciesName } from "../../characters/names"
import { PORTRAIT } from "../portraits"
import { EvoButton, EvoToast } from "../hud/hud-kit"
import { Chamfer, EVO, archivo, teko } from "./evo-skin"
import { MM } from "../hud/tokens"

type Tr = (key: string, fallback: string) => string

export interface CharacterCapsuleProps {
  t: Tr
  /** Administrador vê o "ganhar personagem de teste". */
  admin?: boolean
  onClose: () => void
  /** Trocou o ativo (ou nasceu um filho): o STATUS atualiza retrato e vida. */
  onChanged: (r: CharactersResult) => void
}

export default function CharacterCapsule({ t, admin = false, onClose, onChanged }: CharacterCapsuleProps) {
  const [data, setData] = useState<CharactersResult | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [fusing, setFusing] = useState<string[] | null>(null)
  const [childSpecies, setChildSpecies] = useState<string | null>(null)
  const [childSex, setChildSex] = useState<"m" | "f">("m")
  const [grantSpecies, setGrantSpecies] = useState("aurion")

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

  const run = async (fn: (token: string) => Promise<{ ok: true; data: CharactersResult } | { ok: false; error: string }>, done?: string) => {
    const token = getToken()
    if (!token || busy) return
    setBusy(true)
    const r = await fn(token)
    setBusy(false)
    if (!r.ok) return say(r.error)
    setData(r.data)
    onChanged(r.data)
    if (done) say(done)
  }

  const list = data?.characters.list ?? []
  const active = list.find((c) => c.status === "alive" || c.status === "dead") ?? null
  const capsule = list.filter((c) => c.status === "capsule")
  const pickable = list.filter((c) => (c.status === "alive" || c.status === "capsule") && c.adult)
  const chosen = (fusing ?? []).map((id) => list.find((c) => c.id === id)).filter(Boolean) as CharacterSummary[]
  const speciesOptions: string[] = []
  for (const c of chosen) if (c.species && !speciesOptions.includes(c.species)) speciesOptions.push(c.species)
  const childDef = childSpecies ? speciesById(childSpecies) : null

  const toggleParent = (id: string) => {
    setFusing((cur) => {
      const v = cur ?? []
      if (v.includes(id)) return v.filter((x) => x !== id)
      return v.length >= 2 ? [v[1], id] : [...v, id]
    })
    setChildSpecies(null)
  }

  const certHref = (c: CharacterSummary) => `/meu-mundo/certificado/${c.certCode}`

  const card = (c: CharacterSummary, slot: "active" | "capsule") => {
    const picked = fusing?.includes(c.id)
    return (
      <Chamfer key={c.id} cut={12}>
        <div className="flex gap-3 p-3" style={picked ? { boxShadow: `inset 0 0 0 2px ${EVO.dourado}` } : undefined}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={PORTRAIT[c.body] ?? PORTRAIT.normal} alt="" className="h-24 w-16 shrink-0 object-cover" style={{ borderRadius: MM.radius.card }} />
          <div className="min-w-0 flex-1">
            <div className={`${teko.className} text-[22px] uppercase leading-none tracking-[0.06em]`} style={{ color: EVO.douradoClaro }}>
              {c.petName || speciesName(c.species, t)}
            </div>
            <div className={`${archivo.className} mt-1 text-[12px]`} style={{ color: EVO.mudo }}>
              {speciesName(c.species, t)} · {c.sex === "f" ? t("chFemale", "fêmea") : t("chMale", "macho")} · {c.serialText}
            </div>
            <div className={`${archivo.className} mt-1 text-[12px]`} style={{ color: EVO.branco }}>
              {(c.adult ? t("chAdult", "Adulto") : t("chYoung", "Jovem"))} · {c.height.toFixed(2).replace(".", ",")} m ·{" "}
              {t("chDays", "{n} dias de vida").replace("{n}", String(c.activeDays))}
              {c.power != null && ` · ${t("chPower", "Poder {n}").replace("{n}", String(c.power))}`}
            </div>
            {slot === "capsule" && (
              <div className={`${archivo.className} mt-1 flex items-center gap-1 text-[11px]`} style={{ color: "#8FD3FF" }}>
                <Snowflake className="h-3 w-3" /> {t("chFrozen", "Congelado na cápsula")}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {fusing ? (
                c.adult && (c.status === "alive" || c.status === "capsule") ? (
                  <EvoButton size="sm" variant={picked ? "gold" : "ghost"} onClick={() => toggleParent(c.id)}>
                    {picked ? t("chPicked", "Escolhido") : t("chPick", "Escolher")}
                  </EvoButton>
                ) : (
                  <span className={`${archivo.className} text-[11px]`} style={{ color: EVO.mudo }}>
                    {t("chOnlyAdults", "Só adultos fundem")}
                  </span>
                )
              ) : (
                <>
                  {slot === "capsule" && (
                    <EvoButton size="sm" disabled={busy} onClick={() => run((tk) => postCharacterUse(tk, c.id), t("chSwapped", "Trocado. O outro foi para a cápsula."))}>
                      {t("chUse", "Usar")}
                    </EvoButton>
                  )}
                  <a href={certHref(c)} target="_blank" rel="noopener" className={`${archivo.className} inline-flex min-h-9 items-center gap-1 px-2 text-[12px] font-semibold`} style={{ color: EVO.dourado }}>
                    <Award className="h-4 w-4" /> {t("chCertificate", "Certificado")}
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </Chamfer>
    )
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-3" onClick={onClose}>
      <div
        className={`${archivo.className} relative max-h-[92dvh] w-full max-w-[720px] overflow-y-auto p-4`}
        style={{ background: EVO.carvao, border: `1px solid ${MM.border}`, borderRadius: MM.radius.card }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className={`${teko.className} text-[30px] uppercase tracking-[0.08em]`} style={{ color: EVO.douradoClaro }}>
            {t("chTitle", "Personagens")}
          </h2>
          <button type="button" onClick={onClose} aria-label={t("chClose", "Fechar")} className="p-2" style={{ color: EVO.branco }}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-[13px]" style={{ color: EVO.mudo }}>
          {t("chIntro", "Um personagem ativo por vez. Os outros ficam na cápsula, congelados: não envelhecem, não perdem atributo e não sentem fome.")}
        </p>

        {!data && !failed && <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin" style={{ color: EVO.mudo }} />}
        {failed && <p className="my-6 text-center text-[14px]" style={{ color: EVO.perigo }}>{failed}</p>}

        {data && (
          <div className="mt-4 space-y-4">
            {active && (
              <section>
                <div className={`${teko.className} mb-2 text-[18px] uppercase tracking-[0.18em]`} style={{ color: EVO.mudo }}>
                  {t("chActive", "Ativo")}
                </div>
                {card(active, "active")}
              </section>
            )}
            <section>
              <div className={`${teko.className} mb-2 text-[18px] uppercase tracking-[0.18em]`} style={{ color: EVO.mudo }}>
                {t("chCapsule", "Cápsula {used}/{slots}").replace("{used}", String(data.characters.capsule.used)).replace("{slots}", String(data.characters.capsule.slots))}
              </div>
              {capsule.length === 0 ? (
                <p className="text-[13px]" style={{ color: EVO.mudo }}>{t("chCapsuleEmpty", "A cápsula está vazia. Personagens novos vêm de fusão, prêmios e do mercado.")}</p>
              ) : (
                <div className="space-y-2">{capsule.map((c) => card(c, "capsule"))}</div>
              )}
            </section>

            {/* FUSÃO */}
            <section>
              {!fusing ? (
                <EvoButton size="sm" variant="ghost" icon={<GitMerge className="h-4 w-4" />} disabled={pickable.length < 2} onClick={() => setFusing([])}>
                  {pickable.length < 2 ? t("chFuseNeed", "Fusão: precisa de dois adultos") : t("chFuse", "Fundir dois personagens")}
                </EvoButton>
              ) : (
                <Chamfer cut={12}>
                  <div className="space-y-3 p-3">
                    <p className="text-[13px]" style={{ color: EVO.branco }}>
                      {t("chFuseHow", "Escolha dois adultos acima. Os dois somem (ficam no histórico) e nasce um filho com 1 m e 20% do maior valor de cada atributo deles.")}
                    </p>
                    {chosen.length === 2 && (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {speciesOptions.map((sp) => (
                            <EvoButton key={sp} size="sm" variant={childSpecies === sp ? "gold" : "ghost"} onClick={() => setChildSpecies(sp)}>
                              {speciesName(sp, t)}
                            </EvoButton>
                          ))}
                        </div>
                        {childDef && !childDef.sex && (
                          <div className="flex gap-2">
                            {(["m", "f"] as const).map((sx) => (
                              <EvoButton key={sx} size="sm" variant={childSex === sx ? "gold" : "ghost"} onClick={() => setChildSex(sx)}>
                                {sx === "f" ? t("chFemale", "fêmea") : t("chMale", "macho")}
                              </EvoButton>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <EvoButton
                        size="sm"
                        disabled={busy || chosen.length !== 2 || !childSpecies}
                        loading={busy}
                        onClick={() =>
                          run(
                            (tk) => postCharacterFuse(tk, chosen[0].id, chosen[1].id, childSpecies!, childDef && !childDef.sex ? childSex : undefined),
                            t("chFused", "Nasceu um filho!")
                          ).then(() => setFusing(null))
                        }
                      >
                        {t("chFuseGo", "Fundir")}
                      </EvoButton>
                      <EvoButton size="sm" variant="ghost" onClick={() => setFusing(null)}>
                        {t("chCancel", "Cancelar")}
                      </EvoButton>
                    </div>
                  </div>
                </Chamfer>
              )}
            </section>

            {admin && (
              <section className="flex flex-wrap items-center gap-2">
                <select
                  value={grantSpecies}
                  onChange={(e) => setGrantSpecies(e.target.value)}
                  className="min-h-9 px-2 text-[13px]"
                  style={{ background: "#0d0b04", color: EVO.branco, border: `1px solid ${MM.border}`, borderRadius: MM.radius.card }}
                >
                  {data.characters.species.map((sp) => (
                    <option key={sp} value={sp}>
                      {speciesName(sp, t)}
                    </option>
                  ))}
                </select>
                <EvoButton size="sm" variant="ghost" icon={<Plus className="h-4 w-4" />} disabled={busy} onClick={() => run((tk) => postCharacterTestGrant(tk, grantSpecies), t("chGranted", "Personagem na cápsula."))}>
                  {t("chTestGrant", "Ganhar (teste de admin)")}
                </EvoButton>
              </section>
            )}
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
