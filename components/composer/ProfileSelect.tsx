"use client"

// Select hierárquico de perfil na pele tabloide. A CONTA do usuário (perfil-
// fantasma, is_user_account) aparece SEMPRE primeiro, em dourado e selecionável
// — o user pode publicar como a própria conta, não só pelos perfis. Abaixo
// vêm os perfis.
//
// ⚠️ AQUI SÓ ENTRA PERFIL ATIVADO. Perfil bloqueado não é desenhado esmaecido
// com o motivo: ele é filtrado ANTES, por `publishableProfiles` (decisão do
// Alex, 2026-09-06). Por isso não existe mais estado desabilitado nesta lista —
// e é também por isso que a prop `ineligible` saiu: prop que ninguém alimenta
// mas que ainda sabe desenhar o proibido é o convite para alguém voltar a
// oferecê-lo.
//
// Com UMA opção só não há escolha a fazer, e o seletor vira uma LINHA que
// apenas diz quem assina o post.

import { cn } from "@/lib/utils"
import { useTranslations } from "@/components/i18n/I18nProvider"

export interface ProfileLite {
  id_profile: string
  display_name: string
  avatar_url: string | null
  is_clan: boolean
  is_active: boolean
  is_user_account?: boolean
  /** Assinatura ativa daquele perfil (`/profile/user/:id` já devolve). */
  is_paid?: boolean
}

// ─── Paywall de publicação (espelho de utils/profilePaywall no backend) ──────
//
// A conta publica de graça — ela é a pessoa. Perfil ADICIONAL é produto: só
// publica com assinatura ativa. Clan tem regra própria (criar um já exige
// assinatura), então não é cobrado de novo aqui.
//
// ⚠️ Quem RECUSA é o backend. Isto aqui existe para não OFERECER o que ele vai
// negar: sem este espelho, a pessoa grava o vídeo, corta, escolhe destino e só
// no fim descobre que aquele perfil não publica — que foi exatamente o que
// aconteceu (o post saiu, sumiu do feed geral e ninguém avisou). Errar para
// mais deste lado esconde um perfil da lista; nunca abre uma porta.
export function canProfilePublish(p: ProfileLite): boolean {
  return p.is_user_account === true || p.is_clan === true || p.is_paid === true
}

/**
 * A lista que o fluxo de publicação enxerga: só perfil ATIVADO. Perfil não
 * ativado não é esmaecido com o motivo — ele NÃO APARECE (decisão do Alex,
 * 2026-09-06). Oferecer e negar em seguida é sugerir um caminho que não
 * existe; a lista curta é a barreira, e ela cala a escolha errada antes de a
 * pessoa cogitá-la.
 *
 * ⚠️ FILTRAR AQUI, uma vez, ao guardar o estado — não na hora de desenhar. Se
 * o perfil bloqueado continuasse no estado, cada tela que lê `profiles` teria
 * de lembrar de escondê-lo, e a que esquecesse voltaria a oferecê-lo calada.
 */
export function publishableProfiles(list: ProfileLite[]): ProfileLite[] {
  return list.filter(canProfilePublish)
}

/**
 * Qual perfil já vem escolhido. A preferência ANTIGA era "o primeiro que não é
 * a conta", e é ela que explica o caso relatado: o composer abria com o perfil
 * adicional e o autor publicava por ele sem reparar. Agora a preferência só
 * recai sobre quem PODE publicar — abrir já apontando para um perfil
 * bloqueado deixaria o botão morto sem dizer por quê.
 */
export function pickPublishableProfileId(
  list: ProfileLite[],
  { currentId, initialProfileId }: { currentId?: string | null; initialProfileId?: string | null } = {},
): string | null {
  const usable = list.filter(canProfilePublish)
  const keep = (id?: string | null) => (id && usable.some((p) => p.id_profile === id) ? id : null)
  return (
    keep(currentId) ??
    keep(initialProfileId) ??
    usable.find((p) => !p.is_user_account)?.id_profile ??
    usable[0]?.id_profile ??
    null
  )
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
}: {
  userName: string | null
  /** Já filtrada por `publishableProfiles` — aqui não entra perfil bloqueado. */
  profiles: ProfileLite[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const t = useTranslations("Composer")

  const account = profiles.find((p) => p.is_user_account) || null
  const subs = profiles.filter((p) => !p.is_user_account)

  // Uma opção só: não há o que escolher. O post vai direto por ela, e o que
  // sobra na tela é a linha que diz quem assina — botão de uma alternativa só
  // pede um clique que não decide nada.
  const only = profiles.length === 1 ? profiles[0] : null
  if (only) {
    return (
      <div className="flex items-center gap-2.5 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-2.5 shadow-[4px_4px_0_0_#0B0B0D]">
        <span className="grid h-8 w-8 shrink-0 -rotate-2 place-items-center overflow-hidden border-2 border-[#0B0B0D] bg-[#0B0B0D] font-[family-name:var(--font-anton)] text-sm text-[#F2B705]">
          {only.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={only.avatar_url} alt={only.display_name || userName || ""} className="h-full w-full object-cover" />
          ) : (
            initials(only.display_name || userName)
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-[family-name:var(--font-anton)] text-sm uppercase leading-none text-[#0B0B0D]">
            {only.display_name || userName || t("profile.yourAccount", "Sua conta")}
          </div>
          <div className="mt-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-[#0B0B0D]/70">
            {only.is_user_account
              ? t("profile.publishAsAccount", "Sua conta · publicar como")
              : t("details.publishAs", "Publicar como")}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Conta do usuário — SEMPRE primeiro, dourado e selecionável */}
      {account ? (
        <button
          type="button"
          onClick={() => onSelect(account.id_profile)}
          className={cn(
            "mb-2 flex w-full items-center gap-2.5 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-2.5 text-left transition-transform duration-200",
            selectedId === account.id_profile
              ? "-translate-x-0.5 -translate-y-0.5 shadow-[6px_6px_0_0_#0B0B0D]"
              : "shadow-[4px_4px_0_0_#0B0B0D] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:-rotate-[0.3deg]",
          )}
        >
          <span className="grid h-8 w-8 shrink-0 -rotate-2 place-items-center overflow-hidden border-2 border-[#0B0B0D] bg-[#0B0B0D] font-[family-name:var(--font-anton)] text-sm text-[#F2B705]">
            {account.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={account.avatar_url} alt={account.display_name || userName || "Conta"} className="h-full w-full object-cover" />
            ) : (
              initials(account.display_name || userName)
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-[family-name:var(--font-anton)] text-sm uppercase leading-none text-[#0B0B0D]">
              {account.display_name || userName || t("profile.yourAccount", "Sua conta")}
            </div>
            <div className="mt-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-[#0B0B0D]/70">
              {t("profile.publishAsAccount", "Sua conta · publicar como")}
            </div>
          </div>
          {selectedId === account.id_profile && (
            <span className="text-[10px] font-black uppercase tracking-[0.08em] text-[#0B0B0D]">✓</span>
          )}
        </button>
      ) : (
        // Fallback (conta-fantasma ainda não veio do backend): rótulo dourado.
        <div className="mb-2 flex items-center gap-2.5 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-2.5 shadow-[4px_4px_0_0_#0B0B0D]">
          <span className="grid h-8 w-8 -rotate-2 place-items-center border-2 border-[#0B0B0D] bg-[#0B0B0D] font-[family-name:var(--font-anton)] text-sm text-[#F2B705]">
            {initials(userName)}
          </span>
          <div className="min-w-0">
            <div className="truncate font-[family-name:var(--font-anton)] text-sm uppercase leading-none text-[#0B0B0D]">
              {userName || t("profile.yourAccount", "Sua conta")}
            </div>
            <div className="mt-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-[#0B0B0D]/70">
              {t("profile.publishAsAccount", "Sua conta · publicar como")}
            </div>
          </div>
        </div>
      )}

      {/* Perfis */}
      <div className="space-y-2">
        {subs.map((p) => {
          const on = selectedId === p.id_profile
          return (
            <button
              key={p.id_profile}
              type="button"
              onClick={() => onSelect(p.id_profile)}
              className={cn(
                "flex w-full items-center gap-2.5 border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-2.5 text-left transition-transform duration-200",
                on
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
              </span>
              {p.is_clan && (
                <span className="border-2 border-[#0B0B0D] bg-[#1D1810] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.06em] text-[#F2B705]">
                  {t("profile.clan", "Clan")}
                </span>
              )}
              {on && (
                <span className="text-[10px] font-black uppercase tracking-[0.08em] text-[#9a7400]">✓</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
