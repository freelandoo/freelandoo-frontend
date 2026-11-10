"use client"

// features/meu-mundo/ui/shop/shop-panel.tsx — B5 (2026-11-08): a LOJA ÚNICA.
//
// Uma loja só, com abas: Equipamento, Monstros, Personagens e Comidas e itens. Todas
// desenham com o mesmo card (shop-card.tsx) e a mesma rolagem em arco do mercado
// (kit/aether-carousel → kit/shelf-arc). Preço em Esmeraldas, como hoje (A7); preço em
// R$ é o B4. Nenhuma regra nova: a compra de equipamento é a do Armeiro
// (POST /gear/buy, de qualquer lugar) e a de comida é a do supermercado (POST /life/buy,
// o servidor só aceita com a pessoa no supermercado do centro — fora dele a aba mostra).
//
// Monstros = o INVENTÁRIO do jogador (GET /monsters, mig 365): cada monstro da Arena e
// da rua com vitórias, derrotas e o maior nível vencido. Personagens = as espécies (B3)
// com quantas a pessoa tem e como se consegue; personagem não se compra (fusão, prêmio
// do topo ou o mercado do B4).

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { buyGear, getCharacters, getLife, getMonsters, postLifeBuy, type GearItem, type MonsterTrophy, type Receipt, type TrophyKind } from "../../data"
import type { BodyId, CharactersResult, LifeFull, LifeItem } from "../../types"
import { AetherButton, AetherModal } from "../kit/aether-modal"
import { AetherCarousel, AetherTabs, type CarouselItem } from "../kit/aether-carousel"
import { AE, RARITY } from "../kit/aether-tokens"
import type { ItemCategory } from "../kit/item-image"
import { bonusLines, gearLock, gearThumb, nameOf, type GearTr } from "../gear/gear-card"
import { useWorkshop } from "../gear/use-workshop"
import { effectText } from "../fridge/shelf"
import { effectsOf, thumbOf } from "../fridge/fridge-logic"
import { itemName } from "../status/status-pages"
import { PORTRAIT, WOLF_PORTRAIT } from "../portraits"
import { SPECIES, type SpeciesDef } from "../../characters/rules"
import { speciesName } from "../../characters/names"
import { ShopCard, type ShopLine } from "./shop-card"

export type ShopTab = "gear" | "monsters" | "characters" | "food"
export type GearShelf = "armory" | "weapons" | "hammers" | "bows" | "guns" | "shields"
type FoodGroup = "healthy" | "junk" | "supplement" | "medicine" | "stimulant" | "anabolic"

const MOB_PORTRAIT: Record<TrophyKind, string> = {
  cavaleiro: PORTRAIT.cavaleiro,
  stone: PORTRAIT.golem,
  wolf: WOLF_PORTRAIT,
  ciborgue: PORTRAIT.ciborgue,
  garras: PORTRAIT.garras,
  brute: PORTRAIT.brutamontes,
}

/** A espécie é o corpo, menos as classes (o retrato da classe sai do corpo jovem). */
function speciesBody(sp: SpeciesDef): BodyId {
  return (sp.id === "raposa" ? "raposa" : sp.id === "vampiro" ? "vampiro" : sp.id) as BodyId
}

/** Os nomes da Arena (mesmas chaves de laminas-view; sem importar a cena da luta). */
function mobName(k: TrophyKind, t: GearTr) {
  return {
    cavaleiro: t("laminasMobKnight", "Cavaleiro Dourado"),
    stone: t("laminasMobStoneGolem", "Golem de Pedra"),
    wolf: t("laminasMobWolf", "Lobos de Ferrugem"),
    ciborgue: t("laminasMobGolem", "Ciborgue"),
    garras: t("laminasMobHarpy", "Dama das Garras"),
    brute: t("laminasMobBrute", "Brutamontes"),
  }[k]
}

function foodGroup(it: LifeItem): FoodGroup {
  if (it.kind === "food" || it.kind === "drink") return it.nutri >= 4 ? "healthy" : "junk"
  return it.kind
}
function foodCategory(it: LifeItem): ItemCategory {
  return it.kind === "drink" ? "drink" : it.kind === "food" ? "food" : it.kind === "stimulant" ? "energy" : "health"
}

export default function ShopPanel({
  onClose,
  initialTab = "gear",
  initialShelf = "armory",
  atMarket = false,
  onReceipt,
  onChanged,
}: {
  onClose: () => void
  initialTab?: ShopTab
  initialShelf?: GearShelf
  /** Aberta pelo caixa do supermercado: a aba de comidas compra. */
  atMarket?: boolean
  onReceipt?: (receipt: Receipt) => void
  /** Comprou comida (a geladeira/carteira mudou). */
  onChanged?: () => void
}) {
  const t = useTranslations("MeuMundo") as GearTr
  const [tab, setTab] = useState<ShopTab>(initialTab)
  const [shelf, setShelf] = useState<GearShelf>(initialShelf)
  const [food, setFood] = useState<FoodGroup>("healthy")
  const [confirm, setConfirm] = useState<string | null>(null)
  const { catalog, bag, busy, message, setMessage, error, load: loadGear, act } = useWorkshop(t, onReceipt)
  const [monsters, setMonsters] = useState<MonsterTrophy[] | null>(null)
  const [chars, setChars] = useState<CharactersResult | null>(null)
  const [life, setLife] = useState<LifeFull | null>(null)
  const [foodBusy, setFoodBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const loadTab = useCallback(async (which: ShopTab) => {
    const token = getToken()
    if (!token) return
    setFailed(false)
    if (which === "monsters") {
      const r = await getMonsters(token)
      if (r.ok) setMonsters(r.data.monsters)
      else setFailed(true)
    } else if (which === "characters") {
      const r = await getCharacters(token)
      if (r.ok) setChars(r.data)
      else setFailed(true)
    } else if (which === "food") {
      const r = await getLife(token)
      if (r.ok) setLife(r.data)
      else setFailed(true)
    }
  }, [])
  useEffect(() => {
    if (tab !== "gear") void loadTab(tab)
  }, [tab, loadTab])
  // a carteira do cabeçalho: a da vida (Esmeraldas)
  useEffect(() => {
    void loadTab("food")
  }, [loadTab])

  const changeTab = (next: ShopTab) => {
    setTab(next)
    setConfirm(null)
    setMessage(null)
  }

  const buyFood = async (it: LifeItem) => {
    const token = getToken()
    if (!token || foodBusy) return
    setFoodBusy(true)
    const r = await postLifeBuy(token, it.id)
    setMessage(r.ok ? t("mkStored", "Guardado na geladeira") : r.error || t("stActionFail", "Não deu certo agora"))
    setConfirm(null)
    await loadTab("food")
    if (r.ok) onChanged?.()
    setFoodBusy(false)
  }

  const items: CarouselItem[] = useMemo(() => {
    if (tab === "gear") {
      if (!catalog || !bag) return []
      return catalog.items
        .filter((item) => item.price != null && (shelf === "armory" ? !item.shop : item.shop === shelf))
        .map((item: GearItem) => {
          const lock = gearLock(item, bag, t)
          const owned = !item.stack && !!bag.owned[item.id]
          const price = item.price || 0
          const poor = bag.coins < price
          const r = RARITY[item.rarity]
          return {
            key: item.id,
            label: nameOf(item, t),
            render: () => (
              <ShopCard
                img={gearThumb(item)}
                category={(item.category === "shield" ? "armor" : item.category) as ItemCategory}
                rarity={item.rarity}
                title={nameOf(item, t)}
                tag={t(r.labelKey, r.label)}
                badge={t("gearPrice", "{p} moedas").replace("{p}", String(price))}
                subtitle={item.level > 1 ? t("shopFromLevel", "A partir do nível {n}").replace("{n}", String(item.level)) : undefined}
                lines={bonusLines(item.bonus, t).map((text) => ({ text, tone: "good" as const }))}
                note={lock ?? undefined}
              >
                {owned ? (
                  <p className="text-[13px] font-semibold" style={{ color: AE.good }}>
                    {t("gearOwned", "Já é seu")}
                  </p>
                ) : lock ? null : confirm === item.id ? (
                  <>
                    <p className="text-[12px]" style={{ color: AE.goldSoft }}>
                      {t("forgeBuyConfirm", "Confirmar compra por {n} moedas?").replace("{n}", String(price))}
                    </p>
                    <AetherButton disabled={poor} busy={!!busy} onClick={() => void act("buy-" + item.id, (tk, key) => buyGear(tk, item.id, key), t("gearBought", "Comprado! Está na mochila."))}>
                      {t("gearConfirm", "Confirmar")}
                    </AetherButton>
                    <AetherButton tone="secondary" disabled={!!busy} onClick={() => setConfirm(null)}>
                      {t("gearCancel", "Voltar")}
                    </AetherButton>
                  </>
                ) : (
                  <AetherButton disabled={!!busy || poor} onClick={() => setConfirm(item.id)}>
                    {poor ? t("gearPoor", "Moedas insuficientes") : t("gearBuy", "Comprar")}
                  </AetherButton>
                )}
              </ShopCard>
            ),
          }
        })
    }
    if (tab === "monsters") {
      if (!monsters) return []
      return monsters.map((m) => {
        const name = mobName(m.kind, t)
        const won = m.wins > 0
        const lines: ShopLine[] = [
          { text: m.wins === 1 ? t("shopMobWin1", "1 vitória") : t("shopMobWins", "{n} vitórias").replace("{n}", String(m.wins)), tone: won ? "good" : "muted" },
          { text: m.losses === 1 ? t("shopMobLoss1", "1 derrota") : t("shopMobLosses", "{n} derrotas").replace("{n}", String(m.losses)), tone: m.losses ? "bad" : "muted" },
        ]
        if (won) lines.push({ text: t("shopMobBest", "Maior nível vencido: {n}").replace("{n}", String(m.bestLevel)), tone: "gold" })
        return {
          key: m.kind,
          label: name,
          render: () => (
            <ShopCard
              img={MOB_PORTRAIT[m.kind]}
              category="skin"
              rarity={m.kind === "brute" ? "legendary" : m.kind === "ciborgue" || m.kind === "garras" ? "epic" : "rare"}
              portrait
              dim={!won}
              title={name}
              tag={m.kind === "stone" ? t("shopMobStreet", "Rua") : t("shopMobArena", "Arena")}
              badge={won ? `×${m.wins}` : undefined}
              lines={lines}
              note={
                won
                  ? m.firstWinAt
                    ? t("shopMobFirst", "Primeira vitória em {d}").replace("{d}", new Date(m.firstWinAt).toLocaleDateString())
                    : undefined
                  : m.kind === "stone"
                    ? t("shopMobHowStone", "Ainda não derrotado. Aparece na rua, de noite (18h às 6h), e na Arena das Lâminas.")
                    : t("shopMobHowArena", "Ainda não derrotado. Enfrente na Arena das Lâminas.")
              }
            />
          ),
        }
      })
    }
    if (tab === "characters") {
      if (!chars) return []
      const have = new Map<string, number>()
      for (const c of chars.characters.list) if (c.species && (c.status === "alive" || c.status === "capsule")) have.set(c.species, (have.get(c.species) ?? 0) + 1)
      return [...SPECIES]
        .sort((a, b) => Number(!!have.get(b.id)) - Number(!!have.get(a.id)))
        .map((sp) => {
          const n = have.get(sp.id) ?? 0
          const name = speciesName(sp.id, t)
          const kind = sp.kind === "clan" ? t("shopSpClan", "Classe") : sp.kind === "god" ? t("shopSpGod", "Deus") : t("shopSpSpecial", "Especial")
          return {
            key: sp.id,
            label: name,
            render: () => (
              <ShopCard
                img={PORTRAIT[speciesBody(sp)]}
                category="skin"
                rarity={sp.kind === "god" ? "legendary" : sp.kind === "special" ? "epic" : "rare"}
                portrait
                dim={!n}
                title={name}
                tag={kind}
                badge={n ? `×${n}` : undefined}
                subtitle={n ? t("shopSpOwned", "Você tem {n}").replace("{n}", String(n)) : t("shopSpNone", "Você ainda não tem")}
                lines={[{ text: t("shopSpHeight", "Adulto com {m} m").replace("{m}", sp.adult.toLocaleString(undefined, { maximumFractionDigits: 2 })), tone: "muted" }]}
                note={sp.kind === "clan" ? t("shopSpHowClan", "Nasce com a sua classe.") : t("shopSpHow", "Não se compra: vem da fusão de dois adultos, de prêmio do topo ou do mercado entre jogadores (em breve).")}
              />
            ),
          }
        })
    }
    if (!life) return []
    const fridge = life.fridge ?? {}
    return life.catalog.items
      .filter((it) => foodGroup(it) === food)
      .map((it) => {
        const poor = life.wallet.coins < it.price
        const n = fridge[it.id] ?? 0
        return {
          key: it.id,
          label: itemName(it, t),
          render: () => (
            <ShopCard
              img={thumbOf(it.id)}
              category={foodCategory(it)}
              portrait
              title={itemName(it, t)}
              badge={t("gearPrice", "{p} moedas").replace("{p}", String(it.price))}
              subtitle={n ? t("shopInFridge", "Na geladeira: {n}").replace("{n}", String(n)) : undefined}
              lines={effectsOf(it).map((e) => ({ text: effectText(e, t) ?? "", tone: e.tone === "good" ? ("good" as const) : e.tone === "bad" ? ("bad" as const) : ("gold" as const) }))}
              note={atMarket ? undefined : t("mkHintGoMarket", "Para comprar, vá ao supermercado do centro e passe no caixa. Tudo vai para a geladeira da sua casa.")}
            >
              {atMarket &&
                (confirm === it.id ? (
                  <>
                    <AetherButton disabled={poor} busy={foodBusy} onClick={() => void buyFood(it)}>
                      {t("gearConfirm", "Confirmar")}
                    </AetherButton>
                    <AetherButton tone="secondary" disabled={foodBusy} onClick={() => setConfirm(null)}>
                      {t("gearCancel", "Voltar")}
                    </AetherButton>
                  </>
                ) : (
                  <AetherButton disabled={foodBusy || poor || life.character.status !== "alive"} onClick={() => setConfirm(it.id)}>
                    {poor ? t("mkNoCoins", "Moedas insuficientes") : t("mkBuyPrice", "Comprar · {n} moedas").replace("{n}", String(it.price))}
                  </AetherButton>
                ))}
            </ShopCard>
          ),
        }
      })
    // buyFood muda a cada render, mas só lê estado já listado aqui
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, catalog, bag, shelf, confirm, busy, monsters, chars, life, food, atMarket, foodBusy, t, act])

  const tabs = [
    { id: "gear" as const, label: t("shopTabGear", "Equipamento") },
    { id: "monsters" as const, label: t("shopTabMonsters", "Monstros") },
    { id: "characters" as const, label: t("shopTabCharacters", "Personagens") },
    { id: "food" as const, label: t("shopTabFood", "Comidas e itens") },
  ]
  const loading = tab === "gear" ? !catalog || !bag : tab === "monsters" ? !monsters : tab === "characters" ? !chars : !life
  const coins = life?.wallet.coins ?? bag?.coins
  const empty =
    tab === "monsters" ? t("shopMobEmpty", "Nenhum monstro por aqui.") : tab === "gear" ? t("gearNothing", "Nada por aqui ainda.") : t("gearNothing", "Nada por aqui ainda.")

  return (
    <AetherModal
      title={t("shopTitle", "Loja")}
      eyebrow={coins != null ? t("stCoins", "{n} moedas").replace("{n}", String(coins)) : undefined}
      onClose={onClose}
      width={720}
    >
      <AetherTabs label={t("shopTitle", "Loja")} tabs={tabs} value={tab} onChange={changeTab} />
      {tab === "gear" && (
        <AetherTabs<GearShelf>
          label={t("weaponsShopTitle", "Loja de Armas")}
          value={shelf}
          onChange={(s) => {
            setShelf(s)
            setConfirm(null)
          }}
          tabs={[
            { id: "armory", label: t("gearTabArmory", "Armeiro") },
            { id: "weapons", label: t("shopSwords", "Espadas") },
            { id: "hammers", label: t("shopHammers", "Hammers") },
            { id: "bows", label: t("shopBows", "Arcos") },
            { id: "guns", label: t("shopGuns", "Guns") },
            { id: "shields", label: t("shopShields", "Escudos") },
          ]}
        />
      )}
      {tab === "food" && (
        <AetherTabs<FoodGroup>
          label={t("shopTabFood", "Comidas e itens")}
          value={food}
          onChange={(g) => {
            setFood(g)
            setConfirm(null)
          }}
          tabs={[
            { id: "healthy", label: t("mkHealthy", "Comida saudável") },
            { id: "junk", label: t("mkJunk", "Lanches e porcarias") },
            { id: "supplement", label: t("mkSupplements", "Suplementos") },
            { id: "medicine", label: t("mkMedicine", "Remédios") },
            { id: "stimulant", label: t("mkStimulants", "Estimulantes") },
            { id: "anabolic", label: t("mkAnabolic", "Anabolizantes") },
          ]}
        />
      )}
      {tab === "monsters" && (
        <p className="mb-1 text-[12px]" style={{ color: AE.muted }}>
          {t("shopMobHint", "Os monstros que você já enfrentou na Arena e na rua. Os que viram personagem estão na aba Personagens.")}
        </p>
      )}
      {loading ? (
        <div className="grid min-h-48 place-items-center" style={{ color: AE.muted }}>
          {(tab === "gear" ? error : failed) ? (
            <AetherButton onClick={() => void (tab === "gear" ? loadGear() : loadTab(tab))}>{t("forgeReload", "Tentar abrir novamente")}</AetherButton>
          ) : (
            <Loader2 className="h-6 w-6 animate-spin" aria-label={t("gearLoading", "Carregando…")} />
          )}
        </div>
      ) : (
        <AetherCarousel key={tab + "-" + shelf + "-" + food} title={tabs.find((x) => x.id === tab)?.label} items={items} cardWidth={340} cardHeight={500} empty={empty} />
      )}
      {message && (
        <p role="status" className="mt-3 text-center text-[13px]" style={{ color: AE.goldSoft }}>
          {message}
        </p>
      )}
    </AetherModal>
  )
}
