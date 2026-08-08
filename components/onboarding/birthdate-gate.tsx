"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ShieldCheck, AlertCircle, Loader2, ArrowLeft,
  Instagram, Youtube, Facebook, Twitter, Linkedin, Music2,
} from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useTaxonomy } from "@/lib/i18n/taxonomy"
import { isValidCPF, formatCPF, onlyDigits } from "@/lib/validation/signup"
import { ESTADOS_BRASIL } from "@/lib/constants/estados-brasil"

const PUBLIC_PATHS = new Set([
  "/login",
  "/cadastro",
  "/verify-email",
  "/activate",
  "/reset-password",
  "/forgot-password",
])

// Redes oferecidas no onboarding. `icon` casa com tb_social_media_type.icon no
// backend (OnboardingService). Placeholders são URLs (não traduzem).
const ONBOARDING_SOCIALS: { icon: string; label: string; Icon: React.ComponentType<{ className?: string }>; placeholder: string }[] = [
  { icon: "instagram", label: "Instagram", Icon: Instagram, placeholder: "instagram.com/voce" },
  { icon: "tiktok", label: "TikTok", Icon: Music2, placeholder: "tiktok.com/@voce" },
  { icon: "youtube", label: "YouTube", Icon: Youtube, placeholder: "youtube.com/@voce" },
  { icon: "twitter", label: "X", Icon: Twitter, placeholder: "x.com/voce" },
  { icon: "facebook", label: "Facebook", Icon: Facebook, placeholder: "facebook.com/voce" },
  { icon: "linkedin", label: "LinkedIn", Icon: Linkedin, placeholder: "linkedin.com/in/voce" },
]

// Select nativo dentro de modal escuro: a LISTA aberta é desenhada pelo
// sistema, que usa fundo branco próprio. Sem pintar as <option> explicitamente,
// elas herdam a cor clara do modal e ficam branco no branco (invisíveis).
// Por isso o fundo/cor aparecem duas vezes: no controle e nas opções.
const SELECT_CLASS =
  "h-9 w-full border border-white/15 bg-background px-2 text-sm text-foreground " +
  "disabled:opacity-60 [&>option]:bg-background [&>option]:text-foreground"

type Machine = { id_machine: number; name: string; slug: string }
type Profession = { id_category: number; desc_category: string }
type Municipio = { id: number; nome: string }

function authHeaders(): HeadersInit {
  if (typeof window === "undefined") return {}
  const token = localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function calculateAge(birthdate: string): number | null {
  if (!birthdate) return null
  const d = new Date(birthdate)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1
  return age
}

/**
 * Componente global: ao montar em uma página autenticada, verifica em
 * /api/users/me o que falta no cadastro e abre um modal NÃO-FECHÁVEL em até
 * dois passos:
 *
 *   passo 1 — identidade: data de nascimento + CPF (+ código do responsável
 *             quando a idade informada agora for menor de 18);
 *   passo 2 — atuação: enxame, profissão e cidade, gravados no perfil-conta
 *             (mig 200) — é o que tira a conta da "categoria fantasma" e a
 *             coloca na vitrine e no ranking por profissão/cidade.
 *
 * Cada passo só aparece se algo dele estiver faltando: signup pelo Google cai
 * nos dois; a base antiga (nascimento + CPF já preenchidos) cai só no passo 2
 * no primeiro login depois do deploy. A submissão é única — o backend grava
 * tudo na mesma transação.
 */
export function BirthdateGate() {
  const t = useTranslations("Onboarding")
  const tx = useTaxonomy()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [birthdate, setBirthdate] = useState("")
  const [needBirthdate, setNeedBirthdate] = useState(false)
  const [needCpf, setNeedCpf] = useState(false)
  const [needTaxonomy, setNeedTaxonomy] = useState(false)
  const [cpf, setCpf] = useState("")
  const [responsibleCode, setResponsibleCode] = useState("")
  const [socials, setSocials] = useState<Record<string, string>>({})
  const [codeStatus, setCodeStatus] = useState<
    "idle" | "checking" | "valid" | "invalid"
  >("idle")
  const [codeMsg, setCodeMsg] = useState("")
  const codeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Passo 2 — atuação do perfil-conta.
  const [stepIndex, setStepIndex] = useState(0)
  const [machines, setMachines] = useState<Machine[]>([])
  const [loadingMachines, setLoadingMachines] = useState(false)
  const [professions, setProfessions] = useState<Profession[]>([])
  const [loadingProfessions, setLoadingProfessions] = useState(false)
  const [idMachine, setIdMachine] = useState("")
  const [idCategory, setIdCategory] = useState("")
  const [estadoId, setEstadoId] = useState("")
  const [municipio, setMunicipio] = useState("")
  const [municipios, setMunicipios] = useState<Municipio[]>([])
  const [loadingMunicipios, setLoadingMunicipios] = useState(false)

  const age = calculateAge(birthdate)
  // Menoridade só é cobrada quando a data está sendo informada AGORA; quem já
  // tinha nascimento na conta não repassa pelo vínculo parental.
  const isMinor = needBirthdate && age !== null && age < 18
  const isAdult = !needBirthdate || (age !== null && age >= 18)
  const cpfDigits = onlyDigits(cpf)
  const cpfOk = isValidCPF(cpf)
  const cpfBlocked = cpfDigits.length === 11 && !cpfOk
  const uf = ESTADOS_BRASIL.find((e) => String(e.id) === estadoId)?.uf || ""

  const needIdentity = needBirthdate || needCpf
  // Ordem fixa: identidade antes de atuação. Quem só deve um dos dois vê um
  // passo só (e nenhuma barra de progresso).
  const steps = useMemo(
    () =>
      [needIdentity ? "identity" : null, needTaxonomy ? "taxonomy" : null].filter(
        Boolean,
      ) as ("identity" | "taxonomy")[],
    [needIdentity, needTaxonomy],
  )
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)]
  const isLastStep = stepIndex >= steps.length - 1

  const isPublic =
    !pathname ||
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/freelancer/") ||
    pathname.startsWith("/cursos/") ||
    pathname === "/"

  // Carrega /me e decide se abre o modal.
  const checkMe = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null
      if (!token) {
        setOpen(false)
        return
      }
      const res = await fetch("/api/users/me", {
        headers: authHeaders(),
        cache: "no-store",
      })
      if (!res.ok) {
        setOpen(false)
        return
      }
      const me = await res.json()
      // data_nascimento existe se for não nula. Idade também é fornecida.
      const hasBirthdate = !!me?.data_nascimento || !!me?.idade
      const hasCpf = !!me?.has_cpf
      // Sem perfil-conta no /me não dá pra pedir taxonomia — não travar o user.
      const acc = me?.account_profile
      const hasTaxonomy = !acc?.id_profile || !!acc?.has_taxonomy
      setNeedBirthdate(!hasBirthdate)
      setNeedCpf(!hasCpf)
      setNeedTaxonomy(!hasTaxonomy)
      setStepIndex(0)
      setOpen(!hasBirthdate || !hasCpf || !hasTaxonomy)
    } catch {
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isPublic) {
      setOpen(false)
      setLoading(false)
      return
    }
    checkMe()
  }, [pathname, isPublic, checkMe])

  // Refetch quando algum botão dispara "auth:changed" (login novo).
  useEffect(() => {
    const onAuth = () => checkMe()
    window.addEventListener("auth:changed", onAuth)
    return () => window.removeEventListener("auth:changed", onAuth)
  }, [checkMe])

  // Enxames só são buscados quando o passo de atuação entra em cena.
  useEffect(() => {
    if (!open || currentStep !== "taxonomy" || machines.length > 0) return
    let alive = true
    setLoadingMachines(true)
    fetch("/api/enxames")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!alive || !data) return
        setMachines(Array.isArray(data) ? data : (data.enxames ?? data.machines ?? []))
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoadingMachines(false)
      })
    return () => {
      alive = false
    }
  }, [open, currentStep, machines.length])

  const handleMachineChange = (val: string) => {
    setIdMachine(val)
    setIdCategory("")
    setProfessions([])
    if (!val) return
    setLoadingProfessions(true)
    fetch(`/api/enxames/${encodeURIComponent(val)}/categories`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return
        setProfessions(Array.isArray(data) ? data : (data.categories ?? []))
      })
      .catch(() => {})
      .finally(() => setLoadingProfessions(false))
  }

  const handleEstadoChange = (val: string) => {
    setEstadoId(val)
    setMunicipio("")
    setMunicipios([])
    if (!val) return
    setLoadingMunicipios(true)
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${val}/municipios`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data)) setMunicipios(data)
      })
      .catch(() => {})
      .finally(() => setLoadingMunicipios(false))
  }

  const validateCode = useCallback(async (raw: string) => {
    const code = raw.trim().toUpperCase()
    if (code.length < 6) {
      setCodeStatus("invalid")
      setCodeMsg("")
      return
    }
    setCodeStatus("checking")
    setCodeMsg(t("codeChecking", "Verificando..."))
    try {
      const res = await fetch("/api/supervision/codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (res.ok && data?.valid) {
        setCodeStatus("valid")
        setCodeMsg(t("codeValid", "Código válido — responsável encontrado."))
      } else {
        setCodeStatus("invalid")
        setCodeMsg(data?.error || t("codeInvalid", "Código inválido"))
      }
    } catch {
      setCodeStatus("invalid")
      setCodeMsg(t("codeFail", "Falha ao validar — tente novamente."))
    }
  }, [t])

  const handleCodeChange = (raw: string) => {
    const code = raw.toUpperCase().replace(/[^A-Z0-9-]/g, "")
    setResponsibleCode(code)
    setCodeStatus("idle")
    setCodeMsg("")
    if (codeTimer.current) clearTimeout(codeTimer.current)
    if (code.length >= 6) {
      codeTimer.current = setTimeout(() => validateCode(code), 400)
    }
  }

  const identityDone =
    (!needBirthdate || (!!birthdate && age !== null)) &&
    (!needCpf || cpfOk) &&
    (isAdult || codeStatus === "valid")
  const taxonomyDone =
    !needTaxonomy || (!!idMachine && !!idCategory && !!uf && !!municipio)
  const stepDone = currentStep === "identity" ? identityDone : taxonomyDone
  const canSubmit = identityDone && taxonomyDone && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const social_links = ONBOARDING_SOCIALS
        .map((s) => ({ icon: s.icon, url: (socials[s.icon] || "").trim() }))
        .filter((s) => s.url.length > 0)
      const res = await fetch("/api/me/onboarding/birthdate", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          data_nascimento: needBirthdate ? birthdate : undefined,
          cpf: needCpf ? cpfDigits : undefined,
          responsible_code: isMinor ? responsibleCode : undefined,
          id_machine: needTaxonomy ? Number(idMachine) : undefined,
          id_category: needTaxonomy ? Number(idCategory) : undefined,
          estado: needTaxonomy ? uf : undefined,
          municipio: needTaxonomy ? municipio : undefined,
          social_links: social_links.length > 0 ? social_links : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || t("saveFail", "Falha ao salvar"))
        setSubmitting(false)
        return
      }
      window.dispatchEvent(new Event("auth:changed"))
      setOpen(false)
      // Recarrega para atualizar /account e demais views com is_minor.
      window.location.reload()
    } catch {
      setError(t("connError", "Erro de conexão. Tente novamente."))
      setSubmitting(false)
    }
  }

  if (loading || !open || isPublic || steps.length === 0) return null

  const stepTitle =
    currentStep === "identity"
      ? t("title", "Falta completar seu cadastro")
      : t("stepTaxonomyTitle", "Como você atua")

  const stepDescription =
    currentStep === "identity"
      ? needBirthdate
        ? t("description", "Informe sua data de nascimento e seu CPF para usar a Freelandoo. Se você for menor de 18 anos, vai precisar de um código parental de um responsável adulto.")
        : t("descriptionCpfOnly", "Informe seu CPF para continuar usando a Freelandoo. É uma conta por CPF — dentro dela você cria quantos perfis quiser.")
      : t("stepTaxonomyDescription", "Escolha seu enxame, sua profissão e sua cidade. É assim que as pessoas encontram você na vitrine e no ranking.")

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        className="fl-sharp max-h-[88vh] max-w-md overflow-y-auto"
        // Bloqueia fechamento por ESC e click fora — onboarding obrigatório.
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-400" />
            {stepTitle}
          </DialogTitle>
          <DialogDescription>{stepDescription}</DialogDescription>
        </DialogHeader>

        {/* Barra de progresso — só quando existem os dois passos. */}
        {steps.length > 1 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("stepCounter", "Passo {current} de {total}")
                .replace("{current}", String(stepIndex + 1))
                .replace("{total}", String(steps.length))}
            </p>
            <div className="flex gap-1">
              {steps.map((s, i) => (
                <span
                  key={s}
                  className={`h-1 flex-1 ${i <= stepIndex ? "bg-amber-400" : "bg-white/15"}`}
                />
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {currentStep === "identity" && (
            <>
              {needBirthdate && (
                <div className="space-y-2">
                  <Label htmlFor="onboarding-birthdate">{t("birthdateLabel", "Data de nascimento")}</Label>
                  <Input
                    id="onboarding-birthdate"
                    type="date"
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    autoFocus
                  />
                  {age !== null && age >= 0 && age <= 120 && (
                    <p className="border border-amber-500/30 bg-amber-500/5 px-2 py-1.5 text-sm font-semibold text-amber-300">
                      {t("ageInfo", "Você tem {age} {unit}.")
                        .replace("{age}", String(age))
                        .replace("{unit}", age === 1 ? t("yearUnit", "ano") : t("yearsUnit", "anos"))}
                    </p>
                  )}
                </div>
              )}

              {needCpf && (
                <div className="space-y-2">
                  <Label htmlFor="onboarding-cpf">{t("cpfLabel", "CPF")}</Label>
                  <Input
                    id="onboarding-cpf"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="000.000.000-00"
                    maxLength={14}
                    value={cpf}
                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                    aria-invalid={cpfBlocked}
                    autoFocus={!needBirthdate}
                    className={
                      cpfBlocked
                        ? "border-red-500 focus-visible:ring-red-500"
                        : cpfOk
                          ? "border-green-500 focus-visible:ring-green-500"
                          : ""
                    }
                  />
                  <p className={`text-xs ${cpfBlocked ? "font-medium text-red-500" : "text-muted-foreground"}`}>
                    {cpfBlocked
                      ? t("cpfInvalid", "CPF inválido. Confira os números.")
                      : t("cpfHint", "Uma conta por CPF. Dentro dela você cria quantos perfis quiser.")}
                  </p>
                </div>
              )}

              {isMinor && (
                <div className="border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                  <p className="text-xs text-amber-300">
                    {t("minorNotice", "Conta supervisionada: peça ao seu responsável para gerar um código em Conta › Parental e cole abaixo.")}
                  </p>
                  <Label htmlFor="onboarding-code">{t("codeLabel", "Código do responsável")}</Label>
                  <Input
                    id="onboarding-code"
                    placeholder={t("codePlaceholder", "PAR-XXXXXXXX")}
                    value={responsibleCode}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    maxLength={16}
                    autoComplete="off"
                    className={
                      codeStatus === "invalid" && responsibleCode.length >= 6
                        ? "border-red-500 focus-visible:ring-red-500"
                        : codeStatus === "valid"
                          ? "border-green-500 focus-visible:ring-green-500"
                          : ""
                    }
                  />
                  {codeMsg && (
                    <p
                      className={`text-xs font-medium ${
                        codeStatus === "valid"
                          ? "text-green-500"
                          : codeStatus === "checking"
                            ? "text-muted-foreground"
                            : "text-red-500"
                      }`}
                    >
                      {codeMsg}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {currentStep === "taxonomy" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="onboarding-machine">{t("machineLabel", "Enxame")}</Label>
                <select
                  id="onboarding-machine"
                  value={idMachine}
                  onChange={(e) => handleMachineChange(e.target.value)}
                  disabled={loadingMachines}
                  className={SELECT_CLASS}
                >
                  <option value="">
                    {loadingMachines
                      ? t("loading", "Carregando...")
                      : t("selectMachine", "Selecione um enxame")}
                  </option>
                  {machines.map((m) => (
                    <option key={m.id_machine} value={String(m.id_machine)}>
                      {tx.enxame(m.slug, m.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="onboarding-profession">{t("professionLabel", "Profissão")}</Label>
                <select
                  id="onboarding-profession"
                  value={idCategory}
                  onChange={(e) => setIdCategory(e.target.value)}
                  disabled={!idMachine || loadingProfessions}
                  className={SELECT_CLASS}
                >
                  <option value="">
                    {!idMachine
                      ? t("selectMachineFirst", "Escolha o enxame primeiro")
                      : loadingProfessions
                        ? t("loading", "Carregando...")
                        : t("selectProfession", "Selecione uma profissão")}
                  </option>
                  {professions.map((p) => (
                    <option key={p.id_category} value={String(p.id_category)}>
                      {tx.profession(p.desc_category)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="onboarding-estado">{t("stateLabel", "Estado")}</Label>
                  <select
                    id="onboarding-estado"
                    value={estadoId}
                    onChange={(e) => handleEstadoChange(e.target.value)}
                    className={SELECT_CLASS}
                  >
                    <option value="">{t("selectState", "UF")}</option>
                    {ESTADOS_BRASIL.map((e) => (
                      <option key={e.id} value={String(e.id)}>
                        {e.uf}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onboarding-municipio">{t("cityLabel", "Cidade")}</Label>
                  <select
                    id="onboarding-municipio"
                    value={municipio}
                    onChange={(e) => setMunicipio(e.target.value)}
                    disabled={!estadoId || loadingMunicipios}
                    className={SELECT_CLASS}
                  >
                    <option value="">
                      {!estadoId
                        ? t("selectStateFirst", "Escolha a UF")
                        : loadingMunicipios
                          ? t("loading", "Carregando...")
                          : t("selectCity", "Selecione a cidade")}
                    </option>
                    {municipios.map((m) => (
                      <option key={m.id} value={m.nome}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Redes sociais (opcional) — para mais gente te encontrar. Só no
                  onboarding de verdade; quem só voltou aqui pelo CPF ou pela
                  atuação não é incomodado de novo com um formulário já visto. */}
              {needBirthdate && (
                <div className="space-y-2 border border-white/10 bg-white/[0.02] p-3">
                  <div>
                    <Label className="flex items-center gap-1.5">
                      {t("socialTitle", "Coloque suas redes sociais")}
                      <span className="text-[11px] font-normal text-muted-foreground">{t("optional", "(opcional)")}</span>
                    </Label>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t("socialSubtitle", "Para mais gente te encontrar.")}</p>
                  </div>
                  <div className="space-y-2">
                    {ONBOARDING_SOCIALS.map((s) => {
                      const Icon = s.Icon
                      return (
                        <div key={s.icon} className="flex items-center gap-2">
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center border border-white/10 bg-white/5 text-white/80"
                            title={s.label}
                            aria-label={s.label}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <Input
                            value={socials[s.icon] || ""}
                            onChange={(e) => setSocials((prev) => ({ ...prev, [s.icon]: e.target.value }))}
                            placeholder={s.placeholder}
                            inputMode="url"
                            autoComplete="off"
                            className="h-9"
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="flex items-start gap-2 border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-500">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                disabled={submitting}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("back", "Voltar")}
              </Button>
            )}
            {isLastStep ? (
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex-1"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("saving", "Salvando...")}
                  </>
                ) : (
                  t("continue", "Continuar")
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => setStepIndex((i) => i + 1)}
                disabled={!stepDone}
                className="flex-1"
                size="lg"
              >
                {t("next", "Próximo")}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
