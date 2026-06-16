import type { Metadata } from "next"
import { ShippingProtocolClient } from "./_components/protocolo-client"

export const metadata: Metadata = {
  title: "Protocolo de Envios | Freelandoo",
  description:
    "Como funciona a compra protegida da Freelandoo: O.S. de envio nas mensagens, provas em vídeo do vendedor, acompanhamento do rastreio e 7 dias para conferir. Seu dinheiro fica protegido até você receber.",
  openGraph: {
    title: "Protocolo de Envios Freelandoo",
    description:
      "Compra protegida de ponta a ponta: vídeo da embalagem, comprovante de postagem, rastreio narrado e 7 dias para conferir o produto.",
  },
}

export default function ShippingProtocolPage() {
  return <ShippingProtocolClient />
}
