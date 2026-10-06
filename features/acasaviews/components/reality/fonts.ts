import { Archivo, Space_Mono } from "next/font/google"

/**
 * Fontes PRÓPRIAS da pele "reality" — carregadas só na seção /acasaviews.
 *
 * - Archivo COM o eixo `wdth`: a manchete gigante ("RANKINGS", "QUEM ESTÁ
 *   JOGANDO") é Archivo expandido no peso máximo. A Archivo do layout raiz NÃO
 *   tem o eixo, e sem ele o `font-stretch` não tem o que variar: a manchete
 *   sairia na largura normal sem erro nenhum.
 * - Space Mono: a letra de máquina de escrever do cabeçalho, das legendas e dos
 *   textos técnicos (a Geist Mono do raiz é fina demais para isso).
 */
export const rvWide = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-rv-wide",
  display: "swap",
})

export const rvType = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-rv-type",
  display: "swap",
})

export const realityFontVars = `${rvWide.variable} ${rvType.variable}`
