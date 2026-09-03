"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { DollarSign } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useUserFeature } from "@/components/feature-flags/UserFeaturesProvider"
import { cn } from "@/lib/utils"

/**
 * Botão RETRÁTIL da Carteira — PEÇA ÚNICA das duas superfícies de headcard.
 *
 * Fechado, ele fica ATRÁS do card da foto e só o cifrão escapa pela direita;
 * no hover ele espia um pouco mais para fora; no clique abre e mostra
 * "CARTEIRA $". O segundo clique é que leva para /wallet — abrir e navegar são
 * gestos diferentes, senão quem só quis ler o rótulo sai da página.
 *
 * COMO ELE FICA ATRÁS DA FOTO, sem z-index negativo: o pill é o PRIMEIRO filho
 * da coluna do avatar e o card da foto é `relative`. Dois elementos posicionados
 * sem z-index pintam na ordem do DOM, então a foto cobre o pill naturalmente.
 * Um `-z-10` funcionaria no /account (a linha é `relative z-10` e forma contexto
 * de empilhamento) mas SUMIRIA no ProfileHeadCard, onde o contexto mais próximo
 * é o `<article>` — o pill iria parar atrás do papel creme do card.
 *
 * `avatarPadClass` é o padding-esquerdo que empurra o conteúdo para além da
 * foto, e por isso tem que casar com a LARGURA DO AVATAR daquela superfície
 * (/account é w-24 md:w-28; ProfileHeadCard é w-24 md:w-32). É esse padding que
 * faz o corpo verde nascer debaixo da foto em vez de ao lado dela.
 *
 * A largura do avatar NÃO BASTA, porém: o card da foto é rotacionado -3deg
 * (o canto avança ~4px além da caixa) e tem sombra dura de 6px para a direita,
 * e a sombra é pintada DEPOIS do pill, logo por cima dele. Com o conteúdo
 * começando na largura nua, o cifrão nascia debaixo desses ~10px e aparecia
 * cortado pela metade. Daí o CLEARANCE fixo abaixo — ele é a folga entre a
 * caixa da foto e a borda VISÍVEL dela, igual nas duas superfícies, então mora
 * aqui e não na prop.
 *
 * O `top-[48%]` é da COLUNA (que inclui as estrelas), o que cai em ~57% da
 * altura da FOTO — a altura em que o pill aparece no layout pedido — e deixa
 * folga acima da fila "POSTS | ACOMP.", que é bottom-aligned com a base da
 * coluna e por isso subiria até encostar nele.
 *
 * A Carteira é NATIVA (saiu da Loja de Funções na mig 216): ninguém compra. O
 * que ainda pode escondê-la é só a preferência da seção "Funções" do menu
 * lateral — `useUserFeature` devolve `owned && pref`, e com a função fora da
 * venda `owned` é sempre true.
 */
export function WalletPill({
  avatarPadClass = "pl-24 md:pl-28",
  className,
}: {
  avatarPadClass?: string
  className?: string
}) {
  const t = useTranslations("Account")
  const walletOn = useUserFeature("wallet")
  const reduceMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("touchstart", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("touchstart", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  if (!walletOn) return null

  const spring = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 320, damping: 24 }

  return (
    <div
      ref={rootRef}
      className={cn("absolute left-0 top-[48%] -translate-y-1/2", className)}
    >
      <motion.div
        initial={false}
        animate={{ x: open ? 10 : 0 }}
        whileHover={reduceMotion ? undefined : { x: open ? 10 : 7 }}
        transition={spring}
      >
        <Link
          href="/wallet"
          aria-expanded={open}
          aria-label={t("openWallet", "Abrir minha Carteira")}
          title={t("openWallet", "Abrir minha Carteira")}
          onClick={(e) => {
            // Fechado, o clique só destrava o rótulo — quem quer a Carteira
            // clica de novo. Sem isso o cifrão minúsculo vira uma armadilha de
            // navegação, já que ele mal aparece de trás da foto.
            if (!open) {
              e.preventDefault()
              setOpen(true)
            }
          }}
          className={cn(
            "flex items-center border-2 border-[#0B0B0D] bg-[#15803D] py-1.5 pr-3",
            "text-[#F1EDE2] shadow-[3px_3px_0_0_#0B0B0D] transition-colors hover:bg-[#166F36]",
            avatarPadClass
          )}
        >
          {/* CLEARANCE da rotação + sombra dura da foto (~10px): sem ele o
              cifrão nasce debaixo da borda visível e sai cortado. */}
          <span className="flex items-center pl-3.5">
            <motion.span
              initial={false}
              animate={{
                maxWidth: open ? 200 : 0,
                opacity: open ? 1 : 0,
                marginRight: open ? 8 : 0,
              }}
              transition={spring}
              className="overflow-hidden whitespace-nowrap text-[11px] font-extrabold uppercase tracking-wider"
            >
              {t("walletPill", "Carteira")}
            </motion.span>
            <DollarSign className="h-4 w-4 shrink-0" strokeWidth={3} aria-hidden="true" />
          </span>
        </Link>
      </motion.div>
    </div>
  )
}
