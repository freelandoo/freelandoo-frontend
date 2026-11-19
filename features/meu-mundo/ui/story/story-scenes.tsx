"use client"

// features/meu-mundo/ui/story/story-scenes.tsx — as ilustrações da história no modal do
// capítulo (18/11): a cena grande em cima e a faixa das cenas liberadas embaixo (toque
// troca a grande). Sem o arquivo da imagem, a cena some (nada quebrado na tela).

import { useState } from "react"
import { AE, chamfer } from "../kit/aether-tokens"
import { archivo, teko } from "../status/evo-skin"
import { sceneSrc, type StoryScene } from "./story-art"

/** Uma cena 16:9 (imagem simples, solta pelo navegador quando sai da tela). */
export function SceneImage({ id, small, alt, onMissing }: { id: string; small?: boolean; alt: string; onMissing?: () => void }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- arte estática do jogo, várias por modal
    <img
      src={sceneSrc(id, small)}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={onMissing}
      className="block aspect-video w-full object-cover"
    />
  )
}

export function StoryScenes({ scenes, title, tx }: { scenes: StoryScene[]; title: string; tx: (k: string) => string }) {
  // a cena em foco abre na mais nova (a última liberada)
  const [pick, setPick] = useState<string | null>(null)
  const [missing, setMissing] = useState<Set<string>>(() => new Set())
  const shown = scenes.filter((s) => !missing.has(s.id))
  if (!shown.length) return null
  const cur = shown.find((s) => s.id === pick) ?? shown[shown.length - 1]
  const idx = shown.indexOf(cur)
  const drop = (id: string) => setMissing((m) => new Set(m).add(id))
  return (
    <section className="mb-3 grid gap-1.5" aria-label={tx("questScenes")}>
      <div className="flex items-baseline justify-between">
        <span className={`${teko.className} text-[16px] font-semibold uppercase leading-none tracking-wide`} style={{ color: AE.goldSoft }}>
          {tx("questScenes")}
        </span>
        <span className={`${archivo.className} text-[11px]`} style={{ color: AE.muted }}>
          {tx("questSceneN").replace("{i}", String(idx + 1)).replace("{n}", String(shown.length))}
        </span>
      </div>
      <div className="overflow-hidden" style={{ boxShadow: `inset 0 0 0 1px ${AE.brassLine}`, clipPath: chamfer(AE.cut.chip), background: AE.well }}>
        <SceneImage key={cur.id} id={cur.id} alt={`${title} · ${idx + 1}`} onMissing={() => drop(cur.id)} />
      </div>
      {shown.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}>
          {shown.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setPick(s.id)}
              aria-label={`${title} · ${i + 1}`}
              aria-pressed={s.id === cur.id}
              className="w-[84px] shrink-0 overflow-hidden"
              style={{ boxShadow: `inset 0 0 0 ${s.id === cur.id ? 2 : 1}px ${s.id === cur.id ? AE.gold : AE.brassLine}`, clipPath: chamfer(AE.cut.chip), opacity: s.id === cur.id ? 1 : 0.7 }}
            >
              <SceneImage id={s.id} small alt="" onMissing={() => drop(s.id)} />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
