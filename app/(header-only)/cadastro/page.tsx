"use client"
import { useState, useEffect } from "react"
import type React from "react"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Category {
  id_category: number
  desc_category: string
  is_active: boolean
}

interface Machine {
  id_machine: number
  name: string
  slug: string
  color_glow: string
  color_ring: string
  color_accent: string
  color_text: string
  is_active: boolean
  categories: Category[]
}

export default function CadastroPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [machines, setMachines] = useState<Machine[]>([])
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    dataNascimento: "",
    sexo: "",
    senha: "",
    confirmarSenha: "",
  })

  const [openTermosModal, setOpenTermosModal] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  useEffect(() => {
    fetch("/api/machines")
      .then((r) => r.json())
      .then((data) => setMachines(data.machines || []))
      .catch(() => {})
  }, [])

  const selectedMachine = machines.find((m) => m.id_machine === selectedMachineId) ?? null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!acceptedTerms) {
      alert("Por favor, aceite os termos de uso para continuar.")
      return
    }

    if (!formData.nome || !formData.email || !formData.dataNascimento || !formData.sexo || !formData.senha || !formData.confirmarSenha) {
      alert("Por favor, preencha todos os campos obrigatórios.")
      return
    }

    if (!selectedCategoryId) {
      alert("Por favor, escolha sua máquina e profissão.")
      return
    }

    if (formData.senha !== formData.confirmarSenha) {
      alert("As senhas não coincidem. Tente novamente.")
      return
    }

    setIsSubmitting(true)

    const payload = {
      nome: formData.nome,
      email: formData.email,
      data_nascimento: formData.dataNascimento,
      sexo: formData.sexo,
      senha: formData.senha,
      id_category: selectedCategoryId,
      estado: "SP",
      municipio: "São Paulo",
    }

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok) {
        router.push("/confirmar-email")
      } else {
        alert(data.error || data.message || "Erro ao criar cadastro. Tente novamente.")
        setIsSubmitting(false)
      }
    } catch (error) {
      console.error(error)
      alert("Erro ao conectar com o servidor. Tente novamente.")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <h1 className="mb-3 text-4xl font-bold">Cadastro de Creator</h1>
            <p className="text-lg text-muted-foreground">Crie seu perfil profissional e conecte-se com marcas</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Dados do Creator</CardTitle>
              <CardDescription>Preencha as informações para criar sua conta</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo</Label>
                    <Input
                      id="nome"
                      placeholder="Ex: João Silva"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                    <Input
                      id="dataNascimento"
                      type="date"
                      value={formData.dataNascimento}
                      onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sexo">Sexo</Label>
                  <Select onValueChange={(value) => setFormData({ ...formData, sexo: value })} value={formData.sexo}>
                    <SelectTrigger id="sexo">
                      <SelectValue placeholder="Selecione seu sexo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Feminino</SelectItem>
                      <SelectItem value="O">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="senha">Senha</Label>
                    <Input
                      id="senha"
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      value={formData.senha}
                      onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                      required
                      minLength={8}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmarSenha">Confirmar Senha</Label>
                    <Input
                      id="confirmarSenha"
                      type="password"
                      placeholder="Repita sua senha"
                      value={formData.confirmarSenha}
                      onChange={(e) => setFormData({ ...formData, confirmarSenha: e.target.value })}
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                {/* Machine selection */}
                {machines.length > 0 && (
                  <div className="space-y-3">
                    <Label>Escolha sua Máquina</Label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {machines.map((m) => {
                        const isSelected = selectedMachineId === m.id_machine
                        return (
                          <button
                            key={m.id_machine}
                            type="button"
                            onClick={() => {
                              setSelectedMachineId(m.id_machine)
                              setSelectedCategoryId(null)
                            }}
                            style={
                              isSelected
                                ? {
                                    boxShadow: `0 0 18px ${m.color_glow}, 0 0 6px ${m.color_ring}`,
                                    borderColor: m.color_ring,
                                  }
                                : {}
                            }
                            className={`rounded-lg border-2 bg-black px-3 py-3 text-sm font-medium text-white transition-all duration-200 hover:brightness-110 ${
                              isSelected ? "" : "border-white/10 hover:border-white/30"
                            }`}
                          >
                            {m.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Category selection */}
                {selectedMachine && (
                  <div className="space-y-3">
                    <Label>Escolha sua Profissão</Label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {selectedMachine.categories.filter((c) => c.is_active).map((c) => {
                        const isSelected = selectedCategoryId === c.id_category
                        return (
                          <button
                            key={c.id_category}
                            type="button"
                            onClick={() => setSelectedCategoryId(c.id_category)}
                            style={
                              isSelected
                                ? {
                                    boxShadow: `0 0 14px ${selectedMachine.color_glow}`,
                                    borderColor: selectedMachine.color_ring,
                                    color: selectedMachine.color_text,
                                  }
                                : {}
                            }
                            className={`rounded-lg border-2 bg-black px-3 py-2 text-sm text-white transition-all duration-200 hover:brightness-110 ${
                              isSelected ? "" : "border-white/10 hover:border-white/30"
                            }`}
                          >
                            {c.desc_category}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                  <p className="text-sm text-muted-foreground">
                    Ao clicar em continuar, você aceita os nossos{" "}
                    <button
                      type="button"
                      onClick={() => setOpenTermosModal(true)}
                      className="font-medium text-blue-500 hover:underline"
                    >
                      termos de uso
                    </button>
                    .
                  </p>
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || !acceptedTerms}>
                  {isSubmitting ? "Enviando..." : "Continuar"}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Já tem uma conta?{" "}
                  <a href="/login" className="font-medium text-primary hover:underline">
                    Faça login
                  </a>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={openTermosModal} onOpenChange={setOpenTermosModal}>
        <DialogContent className="max-h-[80vh] w-full max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Termos de Uso - Freelandoo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h3 className="font-semibold text-foreground">Freelandoo</h3>
              <p className="mt-2">
                Ao acessar e utilizar a plataforma Freelandoo, você declara que leu, compreendeu e concorda
                integralmente com os termos abaixo.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground">1. NATUREZA DA PLATAFORMA</h4>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>A Freelandoo atua exclusivamente como plataforma de divulgação de influenciadores.</li>
                <li>A Freelandoo não entra em contato com usuários, empresas ou influenciadores.</li>
                <li>A Freelandoo não intermedia negociações, não participa de acordos e não recebe pagamentos.</li>
                <li>Todas as parcerias, negociações, valores, prazos, entregas e pagamentos são tratados diretamente entre empresas e influenciadores, fora da plataforma.</li>
                <li>Qualquer mensagem, contato ou proposta feita em nome da Freelandoo fora do site não é verdadeira.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground">2. RESPONSABILIDADE DAS PARTES</h4>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Cada influenciador é totalmente responsável pelas informações, dados e redes sociais divulgadas em seu perfil.</li>
                <li>Cada empresa é responsável por verificar a identidade, credibilidade e histórico do influenciador antes de firmar qualquer parceria.</li>
                <li className="mt-2 font-semibold text-foreground">A Freelandoo não se responsabiliza, em nenhuma hipótese, por:</li>
                <ul className="ml-4 space-y-1 list-disc list-inside">
                  <li>Descumprimento de acordos</li>
                  <li>Atrasos</li>
                  <li>Resultados esperados</li>
                  <li>Qualidade de entregas</li>
                  <li>Prejuízos financeiros ou de imagem</li>
                </ul>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground">3. CUIDADOS EM NEGOCIAÇÕES</h4>
              <p className="mt-2">Para sua segurança, a Freelandoo recomenda que:</p>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Nenhum pagamento seja feito sem um acordo claro entre as partes.</li>
                <li>Sempre que possível, o pagamento seja realizado somente após a apresentação do material de divulgação pronto ou conforme combinado entre empresa e influenciador.</li>
                <li>Se evite pressão, urgência excessiva ou pedidos fora do padrão profissional.</li>
                <li>Pagamentos sejam feitos por meios rastreáveis.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground">4. PERFIS E CONTATOS EXTERNOS</h4>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Os contatos (WhatsApp, Instagram, redes sociais) são fornecidos pelos próprios influenciadores.</li>
                <li>A Freelandoo não garante que contatos externos pertençam à pessoa anunciada.</li>
                <li>Cabe ao usuário confirmar se o perfil e os dados realmente pertencem ao influenciador antes de qualquer acordo.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground">5. CONDUTA NA PLATAFORMA</h4>
              <p className="mt-2">É proibido utilizar o Freelandoo para:</p>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Práticas ilegais</li>
                <li>Golpes ou tentativas de fraude</li>
                <li>Assédio</li>
                <li>Uso da plataforma para fins criminosos</li>
              </ul>
              <p className="mt-2">Perfis que violem essas regras podem ser removidos sem aviso prévio.</p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground">6. ACEITE FINAL</h4>
              <p className="mt-2">Ao clicar em «Li e concordo», você declara que:</p>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Está ciente de que a Freelandoo não participa de negociações</li>
                <li>Assume total responsabilidade por contatos e acordos feitos fora da plataforma</li>
                <li>Compreende que a Freelandoo atua apenas como meio de divulgação</li>
              </ul>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold text-foreground">Termos para Influenciadores</h3>
              <p className="mt-2">Ao se cadastrar e anunciar na plataforma Freelandoo, o influenciador declara que leu, compreendeu e concorda integralmente com os termos abaixo.</p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground">1. OBJETO DO CONTRATO</h4>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>O presente termo concede ao influenciador uma licença de uso da plataforma Freelandoo, exclusivamente para divulgação de seu perfil, redes sociais e contatos profissionais.</li>
                <li>A Freelandoo não representa, não agencia e não intermedia o influenciador, atuando apenas como plataforma de exposição publicitária.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground">2. LICENÇA, VALORES E PLANOS</h4>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Para anunciar seu perfil, o influenciador adquire uma licença de uso, cujo valor padrão é de R$ 49,00.</li>
                <li>A Freelandoo poderá disponibilizar cupons de desconto, licenças premium, promocionais ou especiais.</li>
                <li>A concessão de descontos ou gratuidade não altera as obrigações do influenciador previstas neste termo.</li>
                <li>O pagamento da licença não garante retorno financeiro, contratos, parcerias ou propostas comerciais.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground">3. RESPONSABILIDADE PELO CONTEÚDO ANUNCIADO</h4>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>O influenciador é único e exclusivo responsável por todas as informações publicadas em seu perfil.</li>
                <li>A Freelandoo não valida, não fiscaliza e não garante a veracidade, legalidade ou atualização das informações fornecidas.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground">9. ACEITE FINAL</h4>
              <p className="mt-2">Ao clicar em «Li e concordo», o influenciador declara que:</p>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Está ciente de todas as condições deste termo</li>
                <li>Assume total responsabilidade por seu anúncio e conduta</li>
                <li>Reconhece que a Freelandoo atua apenas como plataforma de divulgação</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setOpenTermosModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setAcceptedTerms(true)
                setOpenTermosModal(false)
              }}
            >
              Aceitar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
