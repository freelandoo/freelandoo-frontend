"use client"

// features/meu-mundo/dominio/ui/domain-portal.tsx — lore v2 D1: a TELA DO PORTAL DOS DOMÍNIOS.
//
// Abre no "E" debaixo do anel do lado leste da praça. Os seis Domínios no
// carrossel do kit (AetherCarousel), na ordem da travessia; o card de partida é o
// primeiro ainda não atravessado (o portal "leva ao primeiro"); quem já atravessou
// volta ao começo de qualquer um aberto. Tudo vem do servidor (GET /domains): o
// aparelho não decide se está aberto, só desenha o cadeado com o que falta (nível
// do treinador ou a travessia). Sem identidade nova: modal e carrossel do kit.

import { useCallback, useEffect, useState } from "react"
import { Loader2, Lock, Swords } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getDomains, type DomainId, type DomainInfo, type DomainsState } from "../../data"
import { AetherModal, AetherButton } from "../../ui/kit/aether-modal"
import { AetherCarousel, type CarouselItem } from "../../ui/kit/aether-carousel"
import { AE } from "../../ui/kit/aether-tokens"
import { archivo, teko } from "../../ui/status/evo-skin"

type Tr = (key: string, fallback: string) => string

const NAME_PT: Record<DomainId, string> = {
  floresta: "Floresta da Lua",
  canion: "Cânion das Tempestades",
  gelo: "Mar de Gelo",
  fabrica: "Fábrica de Bronze",
  vulcao: "Vulcão de Kragor",
  orbital: "Cidade Orbital",
}
const GOD_PT: Record<string, string> = { noctis: "Noctis", zephyra: "Zéphyra", maru: "Marú", aeryn: "Aeryn", kragor: "Kragor", iris: "Íris" }
/** Cor do tema no card (só o filete; a superfície é a do kit). */
const TINT: Record<DomainId, string> = { floresta: "#3FF2C4", canion: "#FF7A59", gelo: "#8FD8FF", fabrica: "#E5BE70", vulcao: "#FF5A3A", orbital: "#B48CFF" }

export const domainName = (t: Tr, id: DomainId | string) => t(`domName_${id}`, NAME_PT[id as DomainId] ?? id)
export const godName = (t: Tr, god: string) => t(`domGod_${god}`, GOD_PT[god] ?? god)

/** D2: as criaturas da lore (historia/v2/04-mundo-exploravel.md). */
const FOE_PT: Record<string, string> = {
  mariposa: "Mariposas Cinzentas",
  cervo: "Cervo Oco",
  coruja: "Coruja de Mil Olhos",
  sonambulo: "Sonâmbulo",
  lobo: "Lobos de Ferrugem",
  selene: "Selene de Sombra",
  noctis: "Noctis",
}
export const foeName = (t: Tr, id: string) => t(`domFoe_${id}`, FOE_PT[id] ?? id)

/** Por que está fechado, em uma linha (null = aberto). */
export function lockText(t: Tr, d: DomainInfo): string | null {
  if (!d.lock) return null
  if (d.lock.code === "trainer") return t("domLockTrainer", "Abre no nível {n} do treinador").replace("{n}", String(d.lock.level))
  return t("domLockCrossing", "Atravesse antes: {name}").replace("{name}", domainName(t, d.lock.from))
}

export function DomainPortal({ onClose, onEnter }: { onClose: () => void; onEnter: (id: DomainId) => void }) {
  const t = useTranslations("MeuMundo") as Tr
  const [state, setState] = useState<DomainsState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    const token = getToken()
    if (!token) return
    setError(null)
    const r = await getDomains(token)
    if (r.ok) setState(r.data)
    else setError(r.error)
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  // o portal "leva ao primeiro": o card de partida é o primeiro aberto e não atravessado
  const start = state ? Math.max(0, state.domains.findIndex((d) => d.open && !d.crossed)) : 0
  const items: CarouselItem[] = (state?.domains ?? []).map((d) => ({
    key: d.id,
    label: domainName(t, d.id),
    render: (active) => <DomainCard d={d} t={t} active={active} onEnter={() => onEnter(d.id)} />,
  }))

  return (
    <AetherModal
      eyebrow={t("domPortalEyebrow", "A travessia")}
      title={t("centerDomains", "Portal dos Domínios")}
      onClose={onClose}
      width={620}
      z={90}
    >
      <p className="mb-2 text-[13px] leading-snug" style={{ color: AE.muted }}>
        {t("domPortalHow", "Os seis Domínios são uma travessia. Vencer o setor 10 abre a passagem para o próximo; quem já atravessou volta direto ao começo de qualquer um.")}
      </p>
      {state && (
        <div className={`${archivo.className} mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] font-semibold uppercase tracking-wide`} style={{ color: AE.goldSoft }}>
          <span>{t("domTrainer", "Treinador nv. {n}").replace("{n}", String(state.trainer))}</span>
          <span>{t("domYourPower", "Seu Poder: {n}").replace("{n}", String(state.power))}</span>
          {state.bypass && <span style={{ color: AE.aether }}>{t("domAdmin", "Admin: passa direto")}</span>}
        </div>
      )}
      {!state ? (
        <div className="grid min-h-48 place-items-center" style={{ color: AE.muted }}>
          {error ? <AetherButton onClick={() => void load()}>{error}</AetherButton> : <Loader2 className="h-6 w-6 animate-spin" aria-label={t("domEntering", "Entrando…")} />}
        </div>
      ) : (
        <AetherCarousel key={start} title={t("centerDomains", "Portal dos Domínios")} items={items} initial={start} cardWidth={340} cardHeight={420} />
      )}
    </AetherModal>
  )
}

function DomainCard({ d, t, active, onEnter }: { d: DomainInfo; t: Tr; active: boolean; onEnter: () => void }) {
  const lock = lockText(t, d)
  const first = d.sectors[0]
  const last = d.sectors[d.sectors.length - 1]
  const tint = TINT[d.id]
  return (
    <div className="flex h-full flex-col gap-3 p-4" style={{ background: active ? AE.steelHi : AE.steel, borderTop: `3px solid ${tint}` }}>
      <div>
        <p className={`${archivo.className} text-[11px] font-semibold uppercase tracking-wide`} style={{ color: tint }}>
          {t("domGodOf", "Domínio de {god}").replace("{god}", godName(t, d.god))}
        </p>
        <h3 className={`${teko.className} text-[34px] leading-none`} style={{ color: AE.text }}>
          {domainName(t, d.id)}
        </h3>
      </div>
      {/* os 10 setores: vencido (aceso), aberto (contorno) e fechado (apagado) */}
      <div className="grid grid-cols-10 gap-1" aria-hidden>
        {d.sectors.map((s) => (
          <span key={s.n} className="h-3" style={{ background: s.cleared ? tint : s.open ? AE.well : "#0a0b0e", border: `1px solid ${s.open ? tint : AE.brassLine}`, opacity: s.open || s.cleared ? 1 : 0.5 }} />
        ))}
      </div>
      <p className="text-[13px]" style={{ color: AE.text }}>
        {d.crossed ? t("domCrossed", "Atravessado") : d.best > 0 ? t("domProgress", "Setor {n} de 10 vencido").replace("{n}", String(d.best)) : t("domFresh", "Nenhum setor vencido")}
      </p>
      <p className="text-[13px]" style={{ color: AE.muted }}>
        {t("domRecommended", "Poder recomendado {a} → {b}").replace("{a}", String(first?.power ?? 0)).replace("{b}", String(last?.power ?? 0))}
      </p>
      <div className="mt-auto">
        {lock ? (
          <p className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: AE.goldSoft }}>
            <Lock className="h-4 w-4 shrink-0" aria-hidden />
            {lock}
          </p>
        ) : (
          <AetherButton onClick={onEnter}>
            <span className="inline-flex items-center gap-2">
              <Swords className="h-4 w-4" aria-hidden />
              {d.best > 0 ? t("domEnterAgain", "Voltar ao começo") : t("domEnter", "Entrar")}
            </span>
          </AetherButton>
        )}
      </div>
    </div>
  )
}
