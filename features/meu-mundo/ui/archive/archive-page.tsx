"use client"

// features/meu-mundo/ui/archive/archive-page.tsx — lore v2 F5: a página
// "Arquivo" do STATUS. Textos: o que a história já destravou (o servidor decide)
// e, trancado, em que capítulo abre. Abrir um texto pede ao servidor para gravar
// a leitura (é o que o passo archive:<id> confere). Vídeos: um por capítulo
// alcançado e um por personagem; sem arquivo enviado, imagem + texto.
// Textos: archive-text.json ([pt, en, es]; scripts/i18n-meu-mundo-arquivo-merge.js).

import { useCallback, useEffect, useState } from "react"
import { ArrowLeft, Loader2, Lock } from "lucide-react"
import { getToken } from "@/lib/auth"
import { QUEST_CHANGED, getArchive, readArchive, type ArchiveEntry, type ArchiveState } from "../../data"
import { PORTRAIT, WOLF_PORTRAIT } from "../portraits"
import { AE, chamfer } from "../kit/aether-tokens"
import { LoreVideo } from "./lore-video"
import TEXT from "./archive-text.json"
import CHAPTERS from "../quest/chapters-text.json"

type T = (k: string, f: string) => string
const PT: Record<string, string[] | string> = { ...CHAPTERS, ...TEXT }
/** Texto com o pt do JSON de fallback (a chave é a mesma do merge). */
export const arqTx = (t: T, key: string) => {
  const v = PT[key]
  return t(key, Array.isArray(v) ? v[0] : (v ?? key))
}

/** Personagens com vídeo (a lista do servidor: VIDEO_SLOTS.character) → retrato de reserva. */
export const VIDEO_CHARACTERS: { ref: string; image: string | null }[] = [
  ["raposa", "raposa"],
  ["vampiro", "vampiro"],
  ["aurion", "aurion"],
  ["morkhan", "morkhan"],
  ["maru", "maru"],
  ["kragor", "kragor"],
  ["iris", "iris"],
  ["zephyra", "zephyra"],
  ["noctis", "noctis"],
  ["aeryn", "aeryn"],
  ["bastor", null],
  ["ciborgue", "ciborgue"],
  ["garras", "garras"],
  ["stone", "golem"],
  ["cavaleiro", "cavaleiro"],
  ["wolf", "wolf"],
  ["brute", "brutamontes"],
].map(([ref, body]) => ({ ref: ref as string, image: body === "wolf" ? WOLF_PORTRAIT : body ? ((PORTRAIT as Record<string, string>)[body as string] ?? null) : null }))

export function ArchivePage({ t, compact }: { t: T; compact: boolean }) {
  const [state, setState] = useState<ArchiveState | null>(null)
  const [tab, setTab] = useState<"texts" | "videos">("texts")
  const [open, setOpen] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    const tk = getToken()
    if (!tk) return
    void getArchive(tk).then((r) => {
      if (!alive) return
      if (r.ok) setState(r.data)
      else setFailed(true)
    })
    return () => {
      alive = false
    }
  }, [])

  const openEntry = useCallback(async (e: ArchiveEntry) => {
    setOpen(e.id)
    if (e.readAt) return
    const tk = getToken()
    if (!tk) return
    const r = await readArchive(tk, e.id)
    if (r.ok) {
      setState(r.data)
      // o passo da missão pode ter sido este texto
      window.dispatchEvent(new CustomEvent(QUEST_CHANGED))
    }
  }, [])

  if (!state) return failed ? <p className="py-8 text-center text-[13px]" style={{ color: AE.muted }}>{t("pvFail", "Não deu certo agora. Tente de novo.")}</p> : <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin" style={{ color: AE.goldSoft }} />

  const entry = open ? state.entries.find((e) => e.id === open) : null
  const wrap = compact ? "pb-4" : "h-full overflow-y-auto pb-4 pr-1"

  if (entry && entry.unlocked) {
    const chapterVideo = state.videos.chapter[`cap${entry.chapter}`]
    return (
      <div className={wrap}>
        <button type="button" onClick={() => setOpen(null)} className="mb-2 inline-flex min-h-11 items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide" style={{ color: AE.goldSoft }}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> {arqTx(t, "arqBack")}
        </button>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: AE.dim }}>
          {arqTx(t, "questChapterN").replace("{n}", String(entry.chapter))} · {arqTx(t, `qc_cap${entry.chapter}_title`)}
        </p>
        <h3 className="mb-2 text-[20px] font-bold leading-tight" style={{ color: AE.text }}>
          {arqTx(t, `arq_${entry.id}_title`)}
        </h3>
        {(chapterVideo?.video || chapterVideo?.poster) && (
          <div className="mb-3">
            <LoreVideo data={chapterVideo} title={arqTx(t, `qc_cap${entry.chapter}_title`)} t={t} soon={arqTx(t, "arqVideoSoon")} />
          </div>
        )}
        <p className="whitespace-pre-line text-[15px] leading-relaxed" style={{ color: AE.text }}>
          {arqTx(t, `arq_${entry.id}_body`)}
        </p>
      </div>
    )
  }

  const reached = Math.max(1, ...state.entries.filter((e) => e.unlocked).map((e) => e.chapter))
  const tabBtn = (id: "texts" | "videos", label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      aria-pressed={tab === id}
      className="min-h-11 flex-1 px-3 text-[13px] font-bold uppercase tracking-wide"
      style={{ background: tab === id ? AE.brassPlate : "transparent", color: tab === id ? AE.gold : AE.muted, boxShadow: `inset 0 0 0 1px ${AE.brassLine}`, clipPath: chamfer(AE.cut.chip) }}
    >
      {label}
    </button>
  )

  return (
    <div className={wrap}>
      <div className="mb-3 flex gap-2">
        {tabBtn("texts", arqTx(t, "arqTexts"))}
        {tabBtn("videos", arqTx(t, "arqVideos"))}
      </div>
      {tab === "texts" ? (
        <ul className="grid gap-2">
          {!state.entries.some((e) => e.unlocked) && (
            <li className="text-[13px]" style={{ color: AE.muted }}>
              {arqTx(t, "arqEmpty")}
            </li>
          )}
          {state.entries.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                disabled={!e.unlocked}
                onClick={() => void openEntry(e)}
                className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left disabled:cursor-not-allowed"
                style={{ background: e.unlocked ? AE.steel : AE.iron, boxShadow: `inset 0 0 0 1px ${e.unlocked && !e.readAt ? AE.gold : AE.brassLine}`, clipPath: chamfer(AE.cut.chip) }}
              >
                <span className="w-7 shrink-0 text-center text-[18px] font-bold" style={{ color: e.unlocked ? AE.goldSoft : AE.dim }}>
                  {e.chapter}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-bold" style={{ color: e.unlocked ? AE.text : AE.dim }}>
                    {e.unlocked ? arqTx(t, `arq_${e.id}_title`) : "• • •"}
                  </span>
                  {!e.unlocked && (
                    <span className="block text-[11px]" style={{ color: AE.dim }}>
                      {arqTx(t, "arqLockedChapter").replace("{n}", String(e.chapter))}
                    </span>
                  )}
                </span>
                {!e.unlocked ? (
                  <Lock className="h-4 w-4 shrink-0" style={{ color: AE.dim }} aria-hidden />
                ) : (
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: e.readAt ? AE.dim : AE.gold }}>
                    {e.readAt ? arqTx(t, "arqRead") : arqTx(t, "arqNew")}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid gap-4">
          {Array.from({ length: reached }, (_, i) => `cap${i + 1}`).map((cap, i) => (
            <section key={cap}>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: AE.goldSoft }}>
                {arqTx(t, "questChapterN").replace("{n}", String(i + 1))} · {arqTx(t, `qc_${cap}_title`)}
              </p>
              <LoreVideo data={state.videos.chapter[cap]} title={arqTx(t, `qc_${cap}_title`)} t={t} soon={arqTx(t, "arqVideoSoon")} />
            </section>
          ))}
          <div className={`grid gap-3 ${compact ? "grid-cols-1" : "grid-cols-2"}`}>
            {VIDEO_CHARACTERS.map((c) => (
              <section key={c.ref}>
                <p className="mb-1 text-[12px] font-bold" style={{ color: AE.text }}>
                  {arqTx(t, `arqChar_${c.ref}`)}
                </p>
                <LoreVideo data={state.videos.character[c.ref]} image={c.image} title={arqTx(t, `arqChar_${c.ref}`)} t={t} soon={arqTx(t, "arqVideoSoon")} />
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
