"use client"

// Carrossel de imagens editáveis pelo admin, reusando a infra de site-assets
// (1 imagem por slot). Um "carrossel" é só um conjunto de slots derivados de um
// slot-base: `base`, `base_2`, `base_3`, … até `max`. Cada slot é uma imagem
// independente (mesma validação `tour_*` no backend).
//
// Público: mostra só os slots preenchidos e rotaciona sozinho (com pontos de
// navegação). Admin: mostra o slide ativo como <EditableImage> (botão "Trocar
// imagem"), com pontos para navegar, um "+" para preencher o próximo slot vazio
// e um botão de remover por slide. Controles são admin-only (texto pt, igual ao
// "Trocar imagem" do EditableImage — não entra no i18n).

import { useEffect, useMemo, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { EditableImage } from "./EditableImage"
import { useSiteAssets } from "./SiteAssetsProvider"
import { getStoredUser } from "@/lib/auth"
import { type SiteAssetSlot } from "@/lib/site-asset-slots"
import { cn } from "@/lib/utils"

function checkAdmin(): boolean {
  const u = getStoredUser()
  return !!(u?.is_admin || u?.roles?.some((r) => r.desc_role === "Administrator"))
}

export function EditableImageCarousel({
  baseSlot,
  slotConfig,
  className,
  sizes = "100vw",
  max = 5,
  rotateMs = 4500,
}: {
  baseSlot: string
  slotConfig?: Partial<SiteAssetSlot>
  className?: string
  sizes?: string
  /** Número máximo de slides (slots) do carrossel. */
  max?: number
  /** Intervalo da rotação automática no público (ms). */
  rotateMs?: number
}) {
  const { assets, removeAsset } = useSiteAssets()
  const [admin, setAdmin] = useState(false)
  useEffect(() => { setAdmin(checkAdmin()) }, [])

  // Slots derivados do base: o primeiro é o próprio base (mantém compatibilidade
  // com quem já tinha 1 imagem), os demais ganham sufixo _2, _3, …
  const allSlots = useMemo(
    () => Array.from({ length: Math.max(1, max) }, (_, i) => (i === 0 ? baseSlot : `${baseSlot}_${i + 1}`)),
    [baseSlot, max],
  )

  const filled = allSlots.filter((s) => assets[s])
  const firstEmpty = allSlots.find((s) => !assets[s]) || null

  // Admin vê os preenchidos + o primeiro vazio (tile "+"); público só os cheios.
  const slotsToShow = admin ? (firstEmpty ? [...filled, firstEmpty] : filled) : filled

  const [active, setActive] = useState(0)
  useEffect(() => {
    if (active >= slotsToShow.length) setActive(0)
  }, [slotsToShow.length, active])

  const activeIdx = Math.min(active, Math.max(0, slotsToShow.length - 1))
  // Slot renderizado no quadro grande. Sem nada preenchido e não-admin, cai no
  // base (mostra o placeholder do EditableImage, como antes).
  const activeSlot = slotsToShow[activeIdx] ?? baseSlot

  // Rotação automática no público (só com 2+ imagens).
  useEffect(() => {
    if (admin || filled.length <= 1) return
    const id = setInterval(() => setActive((a) => (a + 1) % filled.length), rotateMs)
    return () => clearInterval(id)
  }, [admin, filled.length, rotateMs])

  async function handleRemove(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!assets[activeSlot]) return
    try {
      const token = localStorage.getItem("token")
      await fetch(`/api/admin/site-assets/${encodeURIComponent(activeSlot)}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      removeAsset(activeSlot)
      setActive((a) => Math.max(0, a - 1))
    } catch {
      /* não-fatal */
    }
  }

  const showDots = slotsToShow.length > 1

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div className="absolute inset-0">
        <EditableImage
          key={activeSlot}
          slot={activeSlot}
          slotConfig={slotConfig}
          sizes={sizes}
          className="h-full w-full"
        />
      </div>

      {/* Remover slide (admin, slot cheio) */}
      {admin && assets[activeSlot] && (
        <button
          type="button"
          onClick={handleRemove}
          className="absolute right-2 top-2 z-20 grid h-7 w-7 place-items-center border-2 border-[#0B0B0D] bg-[#c2371f] text-white shadow-[2px_2px_0_0_#0B0B0D] transition hover:-translate-y-0.5"
          title="Remover esta imagem (admin)"
          aria-label="Remover esta imagem"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Pontos de navegação */}
      {showDots && (
        <div className="absolute inset-x-0 bottom-2 z-20 flex items-center justify-center gap-1.5">
          {slotsToShow.map((s, i) => {
            const isAdd = admin && s === firstEmpty && !assets[s]
            return (
              <button
                key={s}
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActive(i) }}
                aria-label={isAdd ? "Adicionar imagem" : `Imagem ${i + 1}`}
                className={cn(
                  "grid place-items-center border border-[#0B0B0D] transition",
                  isAdd
                    ? "h-4 w-4 bg-[#F2B705] text-[#0B0B0D]"
                    : i === activeIdx
                      ? "h-2.5 w-5 bg-[#F2B705]"
                      : "h-2.5 w-2.5 bg-[#F1EDE2]/80",
                )}
              >
                {isAdd && <Plus className="h-3 w-3" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
