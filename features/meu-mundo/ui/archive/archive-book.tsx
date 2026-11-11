"use client"

// features/meu-mundo/ui/archive/archive-book.tsx — lore v2 C3: um texto do Arquivo
// que mora num LUGAR (o livro do Ninho: na ruína das Matas e na Biblioteca).
//
// Abrir pede ao servidor para gravar a leitura (POST /archive/read). Ele só grava a
// primeira leitura se a última visita da pessoa foi ao lugar do livro (a sala grava
// a visita; o aparelho não diz onde está) e responde "far" se não foi. O que a tela
// mostra não decide nada: o passo `archive:<id>` lê o `read_at` do servidor.

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { QUEST_CHANGED, readArchive } from "../../data"
import { AetherModal } from "../kit/aether-modal"
import { AE } from "../kit/aether-tokens"
import { archivo } from "../status/evo-skin"
import { arqTx } from "./archive-page"
import NPC_TEXT from "../talk/npc-text.json"

type T = (k: string, f: string) => string
// rótulos do livro moram no npc-text.json (sem importar a conversa: ela importa este livro)
const PT: Record<string, string[]> = NPC_TEXT
const npcTx = (t: T, key: string) => t(key, PT[key]?.[0] ?? key)
type State = "loading" | "open" | "far" | "locked" | "fail"

export function ArchiveBook({ id, onClose }: { id: string; onClose: () => void }) {
  const t = useTranslations("MeuMundo") as T
  const [state, setState] = useState<State>("loading")

  useEffect(() => {
    let alive = true
    const tk = getToken()
    if (!tk) {
      setState("fail")
      return
    }
    void readArchive(tk, id).then((r) => {
      if (!alive) return
      if (r.ok) {
        setState("open")
        // o passo da missão pode ter sido esta leitura
        window.dispatchEvent(new CustomEvent(QUEST_CHANGED))
      } else setState(r.code === "far" ? "far" : r.code === "locked" ? "locked" : "fail")
    })
    return () => {
      alive = false
    }
  }, [id])

  return (
    <AetherModal eyebrow={npcTx(t, "bookOpen")} title={arqTx(t, `arq_${id}_title`)} onClose={onClose} width={520} z={91}>
      <div className={`${archivo.className} max-h-[60vh] overflow-y-auto pr-1`} role="status" aria-live="polite">
        {state === "loading" ? (
          <Loader2 className="mx-auto my-6 h-6 w-6 animate-spin" style={{ color: AE.goldSoft }} aria-label={npcTx(t, "bookOpen")} />
        ) : state === "open" ? (
          <p className="whitespace-pre-line text-[15px] leading-relaxed" style={{ color: AE.text }}>
            {arqTx(t, `arq_${id}_body`)}
          </p>
        ) : (
          <p className="text-[14px] font-semibold leading-snug" style={{ color: AE.goldSoft }}>
            {state === "far" ? npcTx(t, "bookFar") : state === "locked" ? npcTx(t, "bookLocked") : t("pvFail", "Não deu certo agora. Tente de novo.")}
          </p>
        )}
      </div>
    </AetherModal>
  )
}
