"use client"

// Prateleira de equipamento à venda (24/11/2026): a mesma carta de compra na Loja única, nos dois balcões do
// Arsenal (Davi = só cajados, Dora = só espadas, sem abas) e na Forja (o Forjador vende as proteções).
// `armory` = tudo com preço que não é de uma prateleira de armas (proteções e acessórios).

import { useMemo, useState } from "react"
import { buyGear, type GearBag, type GearCatalog, type GearItem } from "../../data"
import { AetherButton } from "../kit/aether-modal"
import type { CarouselItem } from "../kit/aether-carousel"
import { AE, rankOf } from "../kit/aether-tokens"
import type { ItemCategory } from "../kit/item-image"
import { gearLock, gearThumb, nameOf, type GearAction, type GearTr } from "../gear/gear-card"
import { ItemFacts } from "../gear/item-facts"
import { ShopCard } from "./shop-card"
import { uiSound } from "../../engine/audio"

export type GearShelf = "armory" | "weapons" | "staffs" | "hammers" | "bows" | "guns" | "shields"

/** Som da compra (áudio P1: `ui-compra` estava no manifesto sem chamada) ou do erro; devolve o resultado. */
export function buySound<R extends { ok: boolean }>(r: R): R {
  uiSound(r.ok ? "buy" : "error", r.ok ? 1 : 0.7)
  return r
}

export const onShelf = (item: GearItem, shelf: GearShelf) => item.price != null && (shelf === "armory" ? !item.shop : item.shop === shelf)

/** As cartas de compra de uma prateleira (ordem: preço, estável). `null` no catálogo = ainda carregando. */
export function useGearShelf({ catalog, bag, shelf, busy, act, t, on = true }: {
  catalog: GearCatalog | null
  bag: GearBag | null
  shelf: GearShelf
  busy: boolean
  act: GearAction
  t: GearTr
  /** false = a tela não está mostrando a prateleira (não monta as cartas). */
  on?: boolean
}): CarouselItem[] {
  const [confirm, setConfirm] = useState<string | null>(null)
  return useMemo(() => {
    if (!on || !catalog || !bag) return []
    return catalog.items
      .filter((item) => onShelf(item, shelf))
      // armas novas do Tripo (22/11/2026) entram no fim do catálogo: a prateleira ordena pelo preço (estável)
      .sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
      .map((item: GearItem) => {
        const lock = gearLock(item, bag, t)
        const owned = !item.stack && !!bag.owned[item.id]
        const price = item.price || 0
        const poor = bag.coins < price
        const rank = rankOf(item)
        return {
          key: item.id,
          label: nameOf(item, t),
          thumb: gearThumb(item),
          render: () => (
            <ShopCard
              img={gearThumb(item)}
              art
              category={(item.category === "shield" ? "armor" : item.category) as ItemCategory}
              rarity={rank}
              rank={rank}
              t={t}
              title={nameOf(item, t)}
              badge={t("gearPrice", "{p} moedas").replace("{p}", String(price))}
              subtitle={item.level > 1 ? t("shopFromLevel", "A partir do nível {n}").replace("{n}", String(item.level)) : undefined}
              details={<ItemFacts item={item} t={t} bag={bag} />}
            >
              {owned ? (
                <p className="text-[13px] font-semibold" style={{ color: AE.good }}>
                  {t("gearOwned", "Já é seu")}
                </p>
              ) : lock ? (
                // 25/11 (Alex: "cadê o botão de comprar?"): travada (classe ou nível) mostra o Comprar apagado com o motivo
                <>
                  <p className="text-[12px] font-semibold" style={{ color: AE.goldSoft }}>
                    {lock}
                  </p>
                  <AetherButton disabled>{t("gearBuy", "Comprar")}</AetherButton>
                </>
              ) : confirm === item.id ? (
                <>
                  <p className="text-[12px]" style={{ color: AE.goldSoft }}>
                    {t("forgeBuyConfirm", "Confirmar compra por {n} moedas?").replace("{n}", String(price))}
                  </p>
                  <AetherButton
                    disabled={poor}
                    busy={busy}
                    onClick={() => {
                      setConfirm(null)
                      void act("buy-" + item.id, (tk, key) => buyGear(tk, item.id, key).then(buySound), t("gearBought", "Comprado! Está na mochila."))
                    }}
                  >
                    {t("gearConfirm", "Confirmar")}
                  </AetherButton>
                  <AetherButton tone="secondary" disabled={busy} onClick={() => setConfirm(null)}>
                    {t("gearCancel", "Voltar")}
                  </AetherButton>
                </>
              ) : (
                <AetherButton disabled={busy || poor} onClick={() => setConfirm(item.id)}>
                  {poor ? t("gearPoor", "Moedas insuficientes") : t("gearBuy", "Comprar")}
                </AetherButton>
              )}
            </ShopCard>
          ),
        }
      })
  }, [on, catalog, bag, shelf, confirm, busy, act, t])
}
