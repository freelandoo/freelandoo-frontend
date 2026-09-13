"use client"

// A PRÉ-VISUALIZAÇÃO DO SITE GERENCIADO.
//
// O construtor desenha o CANVAS de seções. Um site gerenciado não tem seções —
// ele tem um TEMA —, e até aqui o líder que aceitava o site pronto continuava
// vendo na prancheta o site ANTIGO dele, guardado. Ou seja: ele aceitava uma
// coisa e via outra, sem nada dizer que aquilo não era o que o público veria.
// Esta rota é o que o construtor mostra no lugar.
//
// ⚠️ É CLIENTE, E NÃO SERVIDOR, por causa da sessão. O site publicado é servido
// pelo servidor (é lá que o JSON-LD precisa estar), mas isto aqui é um RASCUNHO
// — só o líder pode ver — e a sessão da plataforma é um JWT no `localStorage`,
// que componente de servidor não alcança. Como a rota é da mesma origem do
// construtor, o `localStorage` é o mesmo e o fetch sai autenticado.
//
// Perder o SSR aqui não custa nada: ninguém indexa uma pré-visualização.
//
// ⚠️ E ELA É CARREGADA NUM <iframe> PELO CONSTRUTOR, não montada dentro dele.
// O tema tem barra `fixed`, botão flutuante e fundo de tela cheia; dentro da
// prancheta — que tem `transform` no zoom — um ancestral transformado deixa de
// ser a janela para um filho `fixed`, e as três peças iriam parar por cima da
// barra de ferramentas do construtor. No iframe cada uma delas tem uma janela
// de verdade, do tamanho do aparelho escolhido.

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

import { templateFor } from "@/components/site-templates/registry"
import { getToken } from "@/lib/auth"
import type { ShowcaseService } from "@/types/community-site"
import type { SiteTemplate, TemplateLinks } from "@/types/site-template"

type Resposta = {
  managed?: boolean
  template?: SiteTemplate | null
  services?: ShowcaseService[]
  error?: string
}

export default function SitePreview() {
  const params = useParams<{ id: string; slug?: string[] }>()
  const idProfile = String(params?.id || "")
  const partes = (params?.slug as string[] | undefined) || []

  // `/pagina/<slug>` é o prefixo de TODA página interna de TODO tema — o mesmo
  // do site publicado. Repetido aqui, o link que funciona no preview é o mesmo
  // que funciona no ar; um esquema próprio faria a navegação do preview provar
  // uma coisa e a do site outra.
  const pageSlug = partes[0] === "pagina" ? partes[1] || null : null

  const [dados, setDados] = useState<Resposta | null>(null)
  const [erro, setErro] = useState("")

  useEffect(() => {
    if (!idProfile) return
    let vivo = true
    const token = getToken()
    fetch(`/api/communities/${idProfile}/site`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json() as Promise<Resposta>)
      .then((d) => {
        if (!vivo) return
        if (d.error) return setErro(d.error)
        setDados(d)
      })
      .catch(() => vivo && setErro("Não foi possível carregar a pré-visualização."))
    return () => {
      vivo = false
    }
  }, [idProfile])

  if (erro) return <Aviso texto={erro} />
  if (!dados) return <Aviso texto="Carregando…" />
  if (!dados.managed || !dados.template) {
    return <Aviso texto="Este site não é um site pronto." />
  }

  const entry = templateFor(dados.template.slug)
  // Tema que o backend conhece e este deploy do front ainda não. Dizer isso em
  // voz alta é melhor que a tela em branco que um `null` daria.
  if (!entry) return <Aviso texto={`Tema não encontrado neste deploy: ${dados.template.slug}`} />

  const base = `/site-preview/${idProfile}`
  const links: TemplateLinks = {
    // ⚠️ VAZIO, e não `window.location.origin`: lido no render, ele vale ""
    // no servidor e o endereço no cliente, e o React reclama de hidratação —
    // "some attributes of the server rendered HTML didn't match". Aqui ele só
    // alimenta o `@id` e o canônico do JSON-LD, que numa pré-visualização não
    // é lido por buscador nenhum. O endereço de verdade é o do site publicado.
    origin: "",
    // ⚠️ VAZIO DE PROPÓSITO: é ele que `SiteAnalytics` exige para contar, e sem
    // isso cada tarde do líder olhando a própria pré-visualização viraria
    // visita no painel de Indicadores dele. Mesma lição que tirou o beacon do
    // canvas do construtor.
    communityId: "",
    home: base,
    pageBase: `${base}/pagina`,
    // Agendar leva para fora do preview; deixá-lo ligado abriria a plataforma
    // dentro do iframe. O botão existe no site de verdade.
    booking: null,
  }

  const page = pageSlug ? entry.resolvePage(dados.template.data, pageSlug) : null
  if (pageSlug && !page) return <Aviso texto={`Esta página não existe: /pagina/${pageSlug}`} />

  // ⚠️ O `as` AQUI É DELIBERADO E TEMPORÁRIO, e a cicatriz que o justifica é
  // cara: `TemplateProps` está mudando noutra frente (a vitrine de serviços do
  // tema `oficina-local`), e as duas versões do contrato são MUTUAMENTE
  // EXCLUSIVAS — a que está COMMITADA não conhece `services` e recusa a chave;
  // a que está no working tree a EXIGE. Sem o `as`, uma das duas árvores para
  // de compilar, e foi exatamente isso que deixou a produção parada em dois
  // deploys seguidos: o build local passava contra código não commitado.
  //
  // A lista vazia é o que torna o `as` seguro no runtime dos dois lados: o
  // contrato novo recebe um array de verdade em vez de `undefined`, e o antigo
  // simplesmente ignora a chave. Quando aquela frente entrar, isto vira
  // `services: dados.services || []` sem o `as`.
  const props = {
    data: dados.template.data,
    links,
    page,
    services: [],
  } as Parameters<typeof entry.Site>[0]

  return entry.Site(props)
}

function Aviso({ texto }: { texto: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-[#0B0B0D] p-8">
      <p className="text-center text-sm text-[#9A938A]">{texto}</p>
    </div>
  )
}
