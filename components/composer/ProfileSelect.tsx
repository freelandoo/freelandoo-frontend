"use client"

// Select hierárquico de perfil (conta do user no topo + subperfis abaixo) na pele
// tabloide. Substitui os chips/botão antigos. Itens inelegíveis ficam esmaecidos
// com o motivo (ex.: clan não posta trampo).

import { cn } from "@/lib/utils"

export interface ProfileLite {
  id_profile: string
  display_name: string
  avatar_url: string | null
  is_clan: boolean
  is_active: boolean
}

function initials(name: string | null | undefined): string {
  if (!name) return "?"
  const p = name.trim().split(/\s+/)
  return ((p[0]?.[0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase() || "?"
}

export function ProfileSelect({
  userName,
  profiles,
  selectedId,
  onSelect,
  /** id que torna um perfil inelegível + motivo (ex.: trampo p/ clan). */
  ineligible,
}: {
  userName: string | null
  profiles: ProfileLite[]
  selectedId: string | null
  onSelect: (id: string) => void
  ineligible?: (p: ProfileLite) => string | null
}) {
  return (
    <div>
      {/* Conta — cabeçalho dourado (rótulo, não selecionável) */}
      <div className="mb-2 flex items-center gap-2.5 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-2.5 shadow-[4px_4px_0_0_#0B0B0D]">
        <span className="grid h-8 w-8 -rotate-2 place-items-center border-2 border-[#0B0B0D] bg-[#0B0B0D] font-[family-name:var(--font-anton)] text-sm text-[#F2B705]">
          {initials(userName)}
        </span>
        <div className="min-w-0">
          <div className="truncate font-[family-name:var(--font-anton)] text-sm uppercase leading-none text-[#0B0B0D]">
            {userName || "Sua conta"}
          </div>
          <div className="mt-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-[#0B0B0D]/70">
            Sua conta · publicar como
          </div>
        </div>
      </div>

      {/* Subperfis */}
      <div className="space-y-2">
        {profiles.map((p) => {
          const reason = ineligible?.(p) || null
          const disabled = !!reason
          const on = selectedId === p.id_profile
          return (
            <button
              key={p.id_profile}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(p.id_profile)}
              className={cn(
                "flex w-full items-center gap-2.5 border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-2.5 text-left transition-transform duration-200",
                disabled
                  ? "cursor-not-allowed opacity-45 shadow-[4px_4px_0_0_#0B0B0D]"
                  : on
                    ? "shadow-[6px_6px_0_0_#F2B705] -translate-x-0.5 -translate-y-0.5"
                    : "shadow-[4px_4px_0_0_#0B0B0D] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:-rotate-[0.3deg] hover:shadow-[6px_6px_0_0_#F2B705]",
              )}
            >
              <span className="relative grid h-7 w-7 shrink-0 -rotate-2 place-items-center overflow-hidden border-2 border-[#0B0B0D] bg-[#1D1810] font-[family-name:var(--font-anton)] text-xs text-[#F2B705]">
                {p.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.avatar_url} alt={p.display_name} className="h-full w-full object-cover" />
                ) : (
                  initials(p.display_name)
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-[family-name:var(--font-anton)] text-sm uppercase leading-none text-[#0B0B0D]">
                  {p.display_name}
                </span>
                {reason && (
                  <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.06em] text-[#8a4b2f]">
                    {reason}
                  </span>
                )}
              </span>
              {p.is_clan && (
                <span className="border-2 border-[#0B0B0D] bg-[#1D1810] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.06em] text-[#F2B705]">
                  Clan
                </span>
              )}
              {on && !disabled && (
                <span className="text-[10px] font-black uppercase tracking-[0.08em] text-[#9a7400]">✓</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
