"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Building2, Dumbbell, PlugZap, Plus, Ticket, Users } from "lucide-react"
import { PageShell } from "@/components/tabloide"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useTaxonomy } from "@/lib/i18n/taxonomy"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"
import { ESTADOS_BRASIL } from "@/lib/constants/estados-brasil"
import { getToken } from "@/lib/auth"

type Enxame = { id_machine: number; name: string; slug?: string }
type Eligibility = {
  eligible: boolean
  required_level: number
  current_level: number
  create_cap: number
  member_cap: number
  owned: number
  memberships: number
}
type Kind = "academy" | "condo"

const inputCls =
  "h-11 w-full border-2 border-[#F5F1E8]/10 bg-[#0B0B0D]/40 px-4 text-sm text-[#F5F1E8] placeholder:text-[#F5F1E8]/40 outline-none focus:border-[#F2B705]/60"

export default function CreateCommunityPage() {
  const t = useTranslations("Community")
  const tx = useTaxonomy()
  const router = useRouter()
  // Condomínio tem kill-switch próprio no Painel de Controle (mig 196).
  const condoEnabled = useFeature("condominio")
  // Academia é cadastrada aqui, mas continua vivendo em /academias (mig 176).
  const academyEnabled = useFeature("fitness_academias")

  // Começa em condomínio porque é a única das duas que chega aqui pelo menu
  // ("Meu condomínio" manda ?tipo=condo); a academia chega pela vitrine dela.
  const [kind, setKind] = useState<Kind>("condo")
  const [enxames, setEnxames] = useState<Enxame[]>([])
  const [name, setName] = useState("")
  const [idMachine, setIdMachine] = useState("")
  const [bio, setBio] = useState("")
  const [elig, setElig] = useState<Eligibility | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [buyingSlot, setBuyingSlot] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // Endereço (só condomínio) — é o que torna o prédio pesquisável.
  const [uf, setUf] = useState("")
  const [cidade, setCidade] = useState("")
  const [municipios, setMunicipios] = useState<{ id: number; nome: string }[]>([])
  const [loadingCities, setLoadingCities] = useState(false)
  const [street, setStreet] = useState("")
  const [number, setNumber] = useState("")
  const [neighborhood, setNeighborhood] = useState("")
  const [cep, setCep] = useState("")

  // Academia — Gym Provider API (a academia continua sendo entidade própria).
  const [apiUrl, setApiUrl] = useState("")
  const [apiToken, setApiToken] = useState("")

  const loadElig = useCallback(async () => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`/api/communities/eligibility`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) setElig(data)
    } catch {
      /* silencioso */
    }
  }, [])

  // `?tipo=condo` vem do menu da foto de perfil: quem apertou "Meu condomínio"
  // já disse o que quer cadastrar e não deveria escolher de novo.
  //
  // Lido do `window` e não por `useSearchParams`: o hook obriga um limite de
  // Suspense e tira a rota do pré-render estático — caro demais para uma
  // conveniência de um clique.
  useEffect(() => {
    const tipo = new URLSearchParams(window.location.search).get("tipo")
    if (tipo === "condo" || tipo === "academy") setKind(tipo)
  }, [])

  useEffect(() => {
    fetch("/api/enxames")
      .then((r) => r.json())
      .then((d) => setEnxames(d.enxames || d.machines || []))
      .catch(() => setEnxames([]))
    loadElig()
  }, [loadElig])

  useEffect(() => {
    const estado = ESTADOS_BRASIL.find((e) => e.uf === uf)
    if (!estado) {
      setMunicipios([])
      return
    }
    setLoadingCities(true)
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado.id}/municipios`)
      .then((r) => r.json())
      .then((d) => setMunicipios(Array.isArray(d) ? d.map((m: { id: number; nome: string }) => ({ id: m.id, nome: m.nome })) : []))
      .catch(() => setMunicipios([]))
      .finally(() => setLoadingCities(false))
  }, [uf])

  // Condomínio não consome o teto de comunidades nem exige nível 5 (mig 196).
  const capReached = kind !== "condo" && !!elig && elig.owned >= elig.create_cap
  const levelOk = kind === "condo" || !elig || elig.current_level >= elig.required_level

  const submit = async () => {
    const token = getToken()
    if (!token) {
      setMsg(t("loginToJoin", "Entre para participar"))
      return
    }
    if (!name.trim() || !idMachine) {
      setMsg(t("nameLabel", "Nome da comunidade"))
      return
    }
    if (kind === "condo" && (!uf || !cidade || !street.trim())) {
      setMsg(t("condoAddressRequired", "Informe estado, cidade e logradouro do condomínio."))
      return
    }
    setSubmitting(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/communities`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          display_name: name.trim(),
          id_machine: Number(idMachine),
          bio: bio.trim() || null,
          kind,
          ...(kind === "condo"
            ? {
                address: {
                  estado: uf,
                  municipio: cidade,
                  street: street.trim(),
                  number: number.trim() || null,
                  neighborhood: neighborhood.trim() || null,
                  cep: cep.trim() || null,
                },
              }
            : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("createError", "Não foi possível criar a comunidade."))
      router.push(`/comunidades/${data.id_profile}`)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("createError", "Não foi possível criar a comunidade."))
    } finally {
      setSubmitting(false)
    }
  }

  // Academia não é comunidade: cria a entidade própria e leva pra página dela.
  const submitAcademy = async () => {
    const token = getToken()
    if (!token) {
      setMsg(t("loginToJoin", "Entre para participar"))
      return
    }
    if (!name.trim() || !uf || !cidade || !apiUrl.trim() || !apiToken.trim()) {
      setMsg(t("academyMissing", "Preencha nome, estado, cidade, URL da API e token."))
      return
    }
    setSubmitting(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/academies`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nome: name.trim(),
          uf,
          cidade,
          descricao: bio.trim() || null,
          api_base_url: apiUrl.trim(),
          api_token: apiToken.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("academyCreateError", "Não foi possível cadastrar a academia."))
      router.push(data.academy?.slug ? `/academias/${data.academy.slug}` : "/academias")
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("academyCreateError", "Não foi possível cadastrar a academia."))
    } finally {
      setSubmitting(false)
    }
  }

  const buySlot = async () => {
    const token = getToken()
    if (!token) {
      setMsg(t("loginToJoin", "Entre para participar"))
      return
    }
    setBuyingSlot(true)
    setMsg(t("slotRedirect", "Redirecionando para o pagamento..."))
    try {
      const res = await fetch(`/api/communities/slots/checkout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || t("slotError", "Não foi possível iniciar o pagamento."))
      window.location.href = data.url
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("slotError", "Não foi possível iniciar o pagamento."))
      setBuyingSlot(false)
    }
  }

  // A comunidade COMUM saiu daqui (mig 219): ela nasce vazia pelo menu da foto
  // de perfil e o enxame é escolhido dentro da própria página, como pet, carro
  // e games desde a mig 211. Sobram as duas que têm mesmo o que perguntar antes
  // de existir: a academia (URL e token da API dela) e o condomínio (o endereço,
  // que é o que torna o prédio pesquisável).
  const kinds: { key: Kind; icon: typeof Users; label: string; hint: string }[] = [
    {
      key: "academy",
      icon: Dumbbell,
      label: t("kindAcademy", "Academia"),
      hint: t("kindAcademyHint", "Alunos, treinos e frequência."),
    },
    {
      key: "condo",
      icon: Building2,
      label: t("kindCondo", "Condomínio"),
      hint: t("kindCondoHint", "Moradores, blocos, apartamentos e vagas."),
    },
  ]

  return (
    <PageShell>
      <div className="fl-sharp mx-auto w-full max-w-xl px-5 py-10 sm:px-8">
        <Link href="/comunidades" className="inline-flex items-center gap-2 text-sm text-[#F5F1E8]/70 hover:text-[#F5F1E8]">
          <ArrowLeft className="h-4 w-4" /> {t("back", "Voltar")}
        </Link>

        <h1 className="mt-6 text-2xl font-extrabold text-[#F5F1E8]">{t("registerTitle", "Cadastrar")}</h1>
        <p className="mt-1 text-sm text-[#F5F1E8]/60">
          {t("registerSubtitle", "Academia e condomínio precisam de alguns dados antes de existir. Para uma comunidade comum, use “Criar comunidade” — ela nasce pronta para editar.")}
        </p>

        {/* Tipo */}
        <div className="mt-6">
          <label className="mb-2 block text-sm font-semibold text-[#F5F1E8]/80">{t("kindLabel", "Tipo")}</label>
          <div className="grid gap-2 sm:grid-cols-3">
            {kinds.map((k) => {
              const Icon = k.icon
              const disabled =
                (k.key === "condo" && !condoEnabled) || (k.key === "academy" && !academyEnabled)
              const active = kind === k.key
              if (disabled) return null
              return (
                <button
                  key={k.key}
                  type="button"
                  onClick={() => setKind(k.key)}
                  className="border-2 p-3 text-left transition"
                  style={{
                    borderColor: active ? "#F2B705" : "rgba(245,241,232,0.12)",
                    background: active ? "rgba(242,183,5,0.08)" : "transparent",
                  }}
                >
                  <span className="flex items-center gap-2 text-sm font-bold text-[#F5F1E8]">
                    <Icon className="h-4 w-4" style={{ color: active ? "#F2B705" : undefined }} /> {k.label}
                  </span>
                  <span className="mt-1 block text-[11px] leading-snug text-[#F5F1E8]/55">{k.hint}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Academia é entidade própria (mig 176): cadastra aqui e vive em /academias. */}
        {kind === "academy" ? (
          <div className="mt-6 space-y-4">
            <p className="border-2 border-[#F2B705]/30 bg-[#1D1810]/60 px-4 py-3 text-sm text-[#F5F1E8]/70">
              {t(
                "academyCreateIntro",
                "Grátis. Informe a URL e o token da API do software da sua academia (Gym Provider API) — é por ela que puxamos catraca e pagamentos."
              )}
            </p>

            <div>
              <label className="mb-1 block text-sm font-semibold text-[#F5F1E8]/80">
                {t("academyNameLabel", "Nome da academia")}
              </label>
              <input
                className={inputCls}
                placeholder={t("academyNamePlaceholder", "Ex.: Academia Coliseu")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#F5F1E8]/80">{t("stateLabel", "Estado")}</label>
                <select className={inputCls} value={uf} onChange={(e) => { setUf(e.target.value); setCidade("") }}>
                  <option value="">—</option>
                  {ESTADOS_BRASIL.map((e) => (
                    <option key={e.uf} value={e.uf}>{e.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#F5F1E8]/80">{t("cityLabel", "Cidade")}</label>
                <select className={inputCls} value={cidade} disabled={!uf || loadingCities} onChange={(e) => setCidade(e.target.value)}>
                  <option value="">
                    {!uf ? t("cityPickState", "Escolha o estado") : loadingCities ? t("loading", "Carregando...") : "—"}
                  </option>
                  {municipios.map((m) => (
                    <option key={m.id} value={m.nome}>{m.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-[#F5F1E8]/80">{t("bioLabel", "Descrição (opcional)")}</label>
              <textarea className={`${inputCls} h-24 py-2`} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-[#F5F1E8]/80">
                {t("academyApiUrlLabel", "URL da API (Gym Provider)")}
              </label>
              <input
                className={`${inputCls} font-mono`}
                placeholder="https://crm.suaacademia.com.br"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-[#F5F1E8]/80">
                {t("academyApiTokenLabel", "Token da API")}
              </label>
              <input
                className={`${inputCls} font-mono`}
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
              />
            </div>

            <p className="flex items-start gap-2 text-[11px] leading-snug text-[#F5F1E8]/55">
              <PlugZap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F2B705]" />
              {t(
                "academyProviderHint",
                "Seu software precisa expor a Gym Provider API. O Coliseu já é compatível; outros softwares podem implementar o contrato público."
              )}
            </p>

            {msg ? <p className="bg-[#F2B705]/15 px-3 py-2 text-sm text-[#F5F1E8]">{msg}</p> : null}

            <button
              type="button"
              disabled={submitting}
              onClick={submitAcademy}
              className="inline-flex items-center gap-2 bg-[#F2B705] px-6 py-2.5 text-sm font-bold text-[#1A1505] disabled:opacity-60"
            >
              <Dumbbell className="h-4 w-4" />
              {submitting ? t("creating", "Criando...") : t("academyCreateCta", "Cadastrar academia")}
            </button>
          </div>
        ) : (
          <>
            {!levelOk ? (
              <p className="mt-6 border-2 border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                {t("needLevel5", "Você precisa de pelo menos um perfil nível 5 para criar uma comunidade.")}
              </p>
            ) : null}

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#F5F1E8]/80">
                  {kind === "condo" ? t("condoNameLabel", "Nome do condomínio") : t("nameLabel", "Nome da comunidade")}
                </label>
                <input
                  className={inputCls}
                  placeholder={kind === "condo" ? t("condoNamePlaceholder", "Ex.: Residencial Jardins") : t("namePlaceholder", "Ex.: Confeiteiros de SP")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#F5F1E8]/80">{t("enxameLabel", "Enxame")}</label>
                <select className={inputCls} value={idMachine} onChange={(e) => setIdMachine(e.target.value)}>
                  <option value="">—</option>
                  {enxames.map((e) => (
                    <option key={e.id_machine} value={e.id_machine}>{tx.enxame(e.slug ?? null, e.name)}</option>
                  ))}
                </select>
              </div>

              {kind === "condo" && (
                <div className="space-y-4 border-2 border-[#F5F1E8]/10 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9A938A]">
                    {t("condoAddressTitle", "Endereço do condomínio")}
                  </p>
                  <p className="text-[11px] leading-snug text-[#F5F1E8]/55">
                    {t("condoAddressPrivacy", "Bairro e cidade aparecem na busca. Rua, número e CEP só aparecem para moradores confirmados e para a administração.")}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#F5F1E8]/70">{t("stateLabel", "Estado")}</label>
                      <select className={inputCls} value={uf} onChange={(e) => { setUf(e.target.value); setCidade("") }}>
                        <option value="">—</option>
                        {ESTADOS_BRASIL.map((e) => (
                          <option key={e.uf} value={e.uf}>{e.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#F5F1E8]/70">{t("cityLabel", "Cidade")}</label>
                      <select className={inputCls} value={cidade} disabled={!uf || loadingCities} onChange={(e) => setCidade(e.target.value)}>
                        <option value="">
                          {!uf ? t("cityPickState", "Escolha o estado") : loadingCities ? t("loading", "Carregando...") : "—"}
                        </option>
                        {municipios.map((m) => (
                          <option key={m.id} value={m.nome}>{m.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#F5F1E8]/70">{t("streetLabel", "Logradouro")}</label>
                      <input className={inputCls} value={street} onChange={(e) => setStreet(e.target.value)} placeholder={t("streetPlaceholder", "Rua, avenida...")} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#F5F1E8]/70">{t("numberLabel", "Número")}</label>
                      <input className={inputCls} value={number} onChange={(e) => setNumber(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#F5F1E8]/70">{t("neighborhoodLabel", "Bairro")}</label>
                      <input className={inputCls} value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#F5F1E8]/70">{t("cepLabel", "CEP")}</label>
                      <input className={inputCls} value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-semibold text-[#F5F1E8]/80">{t("bioLabel", "Descrição (opcional)")}</label>
                <textarea className={`${inputCls} h-24 py-2`} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} />
              </div>

              {msg ? <p className="bg-[#F2B705]/15 px-3 py-2 text-sm text-[#F5F1E8]">{msg}</p> : null}

              {capReached ? (
                <div className="border-2 border-[#F2B705]/30 bg-[#1D1810]/60 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-[#F2B705]"><Ticket className="h-4 w-4" /> {t("slotTitle", "Ingresso de Comunidade")}</p>
                  <p className="mt-1 text-sm text-[#F5F1E8]/70">{t("slotDesc", "Por R$100 você libera +1 comunidade para criar e +1 para participar (máximo de 3).")}</p>
                  <button type="button" disabled={buyingSlot} onClick={buySlot} className="mt-3 inline-flex items-center gap-2 bg-[#F2B705] px-5 py-2.5 text-sm font-bold text-[#1A1505] disabled:opacity-60">
                    <Ticket className="h-4 w-4" /> {t("slotBuy", "Comprar ingresso (R$100)")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={submitting || !levelOk}
                  onClick={submit}
                  className="inline-flex items-center gap-2 bg-[#F2B705] px-6 py-2.5 text-sm font-bold text-[#1A1505] disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" /> {submitting ? t("creating", "Criando...") : t("createButton", "Criar")}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </PageShell>
  )
}
