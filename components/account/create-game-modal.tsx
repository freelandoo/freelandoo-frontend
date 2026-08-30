"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Gamepad2 } from "lucide-react"
import { TabloidDialog } from "@/components/tabloide"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"

// Espelha o CHECK chk_community_game_platform (mig 210): plataforma fora desta
// lista o backend recusa.
const PLATFORMS = [
  { key: "pc", fallback: "PC" },
  { key: "playstation", fallback: "PlayStation" },
  { key: "xbox", fallback: "Xbox" },
  { key: "nintendo", fallback: "Nintendo" },
  { key: "mobile", fallback: "Celular" },
  { key: "retro", fallback: "Retrô" },
  { key: "outra", fallback: "Outra" },
] as const

export function CreateGameModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated?: () => void
}) {
  const t = useTranslations("Spaces")
  const router = useRouter()

  const [platform, setPlatform] = useState<string>("pc")
  const [title, setTitle] = useState("")
  const [gamertag, setGamertag] = useState("")
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setMsg(null)
  }, [open])

  const submit = async () => {
    const token = getToken()
    if (!token) return
    if (!title.trim()) {
      setMsg(t("gameTitleRequired", "Informe o jogo."))
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          game_title: title.trim(),
          platform,
          gamertag: gamertag.trim() || null,
          display_name: name.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("createError", "Não foi possível criar."))
      onCreated?.()
      onClose()
      router.push(`/comunidades/${data.community.id_profile}`)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("createError", "Não foi possível criar."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <TabloidDialog
      open={open}
      onOpenChange={(v) => { if (!v) onClose() }}
      title={<span className="flex items-center gap-2"><Gamepad2 className="h-5 w-5" /> {t("newGameTitle", "Meus games")}</span>}
      description={t("newGameDesc", "Uma comunidade para o jogo que você joga — sua, com mural e seguidores.")}
      className="fl-root fl-sharp"
    >
      <div className="space-y-4">
        <div>
          <span className="fl-label">{t("platformLabel", "Plataforma")}</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPlatform(p.key)}
                className="border-2 px-3 py-1.5 text-sm font-bold transition"
                style={{
                  borderColor: platform === p.key ? "#0B0B0D" : "rgba(11,11,13,0.2)",
                  background: platform === p.key ? "#F2B705" : "transparent",
                  color: "#0B0B0D",
                }}
              >
                {t(`platform_${p.key}`, p.fallback)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="game-title" className="fl-label">
            {t("gameTitleLabel", "Jogo")} <span className="text-[#b91c1c]">*</span>
          </label>
          <input
            id="game-title"
            className="fl-input"
            placeholder={t("gameTitlePlaceholder", "Ex.: Minecraft")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="game-tag" className="fl-label">{t("gamertagLabel", "Seu nick (opcional)")}</label>
            <input
              id="game-tag"
              className="fl-input"
              value={gamertag}
              maxLength={60}
              onChange={(e) => setGamertag(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="game-name" className="fl-label">{t("communityNameOptional", "Nome da comunidade (opcional)")}</label>
            <input
              id="game-name"
              className="fl-input"
              value={name}
              maxLength={80}
              placeholder={title.trim() || t("gameTitlePlaceholder", "Ex.: Minecraft")}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        {msg && <p className="text-sm font-medium text-[#b91c1c]">{msg}</p>}

        <button
          type="button"
          disabled={saving}
          onClick={submit}
          className="fl-btn-gold inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold disabled:opacity-60"
        >
          <Gamepad2 className="h-4 w-4" />
          {saving ? t("creating", "Criando...") : t("createGameCta", "Criar comunidade do jogo")}
        </button>
      </div>
    </TabloidDialog>
  )
}
