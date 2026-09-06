"use client"

// Contato & localização: canais de um lado, mapa do outro.
//
// ═══ O MAPA É DERIVADO DO ENDEREÇO ═══
//
// Não existe um campo "link do mapa embutido": o embed é montado a partir do
// endereço que o líder já digitou. Um segundo campo seria uma segunda verdade —
// ele mudaria a rua e o mapa continuaria apontando para o lugar antigo, sem
// erro nenhum aparecer.
//
// O host `www.google.com` já está no `frame-src` da CSP do projeto (ver
// next.config.mjs); o formato `?q=...&output=embed` não pede chave de API.

import { useCallback } from "react"
import { Clock, Link2, Mail, MapPin, MessageCircle, Plus, Trash2 } from "lucide-react"
import type { ContactData, SiteColorTheme, SocialLink } from "@/types/community-site"
import { newLocalId } from "@/types/community-site"
import { BuilderButton, InlineText } from "../editable"
import { whatsappHref } from "../site-chrome"

/** Endereço escrito → mapa embutido. Sem endereço, não há mapa. */
function mapEmbedSrc(address: string): string {
  const query = (address || "").trim()
  if (query.length < 6) return ""
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`
}

/**
 * Card de um canal: quadrado do ícone, rótulo pequeno e o valor em destaque.
 *
 * É a mesma casca para endereço, horário, e-mail, WhatsApp e redes — canal
 * novo entra aqui dentro e nasce com o mesmo peso dos outros.
 */
function Channel({
  icon: Icon,
  theme,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  theme: SiteColorTheme
  label: string
  children: React.ReactNode
}) {
  return (
    <div
      className="flex items-start gap-4 border-2 p-4"
      style={{ background: `${theme.background}88`, borderColor: theme.background }}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center border-2"
        style={{ background: `${theme.primary}22`, borderColor: theme.primary }}
      >
        <Icon className="h-4 w-4" style={{ color: theme.primary }} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="mb-0.5 text-[10px] font-extrabold uppercase tracking-[0.14em]"
          style={{ color: theme.textSecondary }}
        >
          {label}
        </p>
        {children}
      </div>
    </div>
  )
}

export function ContactSection({
  data,
  onChange,
  editing,
  theme,
  labels,
}: {
  data: ContactData
  onChange: (next: ContactData) => void
  editing: boolean
  theme: SiteColorTheme
  labels: {
    address: string
    addressLabel: string
    mapsUrl: string
    whatsapp: string
    whatsappLabel: string
    email: string
    emailLabel: string
    hours: string
    hoursLabel: string
    socialLabel: string
    socialUrl: string
    addSocial: string
    removeSocial: string
    openMaps: string
    talkWhatsapp: string
    mapTitle: string
    empty: string
  }
}) {
  const patchSocial = useCallback(
    (socialId: string, next: Partial<SocialLink>) => {
      onChange({
        ...data,
        socials: data.socials.map((s) => (s.id === socialId ? { ...s, ...next } : s)),
      })
    },
    [data, onChange]
  )

  // Vazia, esta seção não chega até aqui em leitura: quem corta é o canvas,
  // pela regra única de `section-content.ts` — e ele corta a MOLDURA inteira,
  // com o cabeçalho que a casca desenha por fora. Cortar aqui dentro deixaria
  // na página um título anunciando o vazio.

  const wa = whatsappHref(data.whatsapp)
  const mapSrc = mapEmbedSrc(data.address)

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
      <div className="flex flex-col gap-4">
        {(editing || data.address) && (
          <Channel icon={MapPin} theme={theme} label={labels.addressLabel}>
            <InlineText
              editing={editing}
              value={data.address}
              onChange={(v) => onChange({ ...data, address: v })}
              styleKey="address"
              placeholder={labels.address}
              maxLength={160}
              multiline
              className="block whitespace-pre-line text-sm font-medium leading-relaxed"
              style={{ color: theme.textPrimary }}
            />
            {editing && (
              <InlineText
                editing
                value={data.mapsUrl}
                onChange={(v) => onChange({ ...data, mapsUrl: v })}
                placeholder={labels.mapsUrl}
                maxLength={600}
                className="mt-1 block text-[11px]"
                style={{ color: theme.textSecondary }}
              />
            )}
            {!editing && data.mapsUrl && (
              <a
                href={data.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-[11px] font-extrabold uppercase tracking-[0.12em] underline"
                style={{ color: theme.primary }}
              >
                {labels.openMaps}
              </a>
            )}
          </Channel>
        )}

        {(editing || data.whatsapp) && (
          <Channel icon={MessageCircle} theme={theme} label={labels.whatsappLabel}>
            {editing ? (
              <InlineText
                editing
                value={data.whatsapp}
                onChange={(v) => onChange({ ...data, whatsapp: v })}
                placeholder={labels.whatsapp}
                maxLength={40}
                className="block text-sm font-medium"
                style={{ color: theme.textPrimary }}
              />
            ) : (
              <a
                href={wa || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm font-medium"
                style={{ color: theme.textPrimary }}
              >
                {data.whatsapp}
              </a>
            )}
          </Channel>
        )}

        {(editing || data.hours) && (
          <Channel icon={Clock} theme={theme} label={labels.hoursLabel}>
            <InlineText
              editing={editing}
              value={data.hours}
              onChange={(v) => onChange({ ...data, hours: v })}
              styleKey="hours"
              placeholder={labels.hours}
              maxLength={320}
              multiline
              className="block whitespace-pre-line text-sm font-medium leading-relaxed"
              style={{ color: theme.textPrimary }}
            />
          </Channel>
        )}

        {(editing || data.email) && (
          <Channel icon={Mail} theme={theme} label={labels.emailLabel}>
            {editing ? (
              <InlineText
                editing
                value={data.email}
                onChange={(v) => onChange({ ...data, email: v })}
                placeholder={labels.email}
                maxLength={120}
                className="block text-sm font-medium"
                style={{ color: theme.textPrimary }}
              />
            ) : (
              <a
                href={`mailto:${data.email}`}
                className="block break-all text-sm font-medium"
                style={{ color: theme.textPrimary }}
              >
                {data.email}
              </a>
            )}
          </Channel>
        )}

        {data.socials.map((s) => (
          <Channel key={s.id} icon={Link2} theme={theme} label={s.label || labels.socialLabel}>
            {editing ? (
              <div className="flex items-center gap-2">
                <InlineText
                  editing
                  value={s.label}
                  onChange={(v) => patchSocial(s.id, { label: v })}
                  placeholder={labels.socialLabel}
                  maxLength={40}
                  className="min-w-[70px] text-xs font-extrabold uppercase tracking-[0.1em]"
                  style={{ color: theme.textPrimary }}
                />
                <InlineText
                  editing
                  value={s.url}
                  onChange={(v) => patchSocial(s.id, { url: v })}
                  placeholder={labels.socialUrl}
                  maxLength={600}
                  className="min-w-0 flex-1 text-[11px]"
                  style={{ color: theme.textSecondary }}
                />
                <BuilderButton
                  onClick={() =>
                    onChange({ ...data, socials: data.socials.filter((x) => x.id !== s.id) })
                  }
                  icon={Trash2}
                  tone="danger"
                  title={labels.removeSocial}
                />
              </div>
            ) : (
              s.url && (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block break-all text-sm font-medium"
                  style={{ color: theme.textPrimary }}
                >
                  {s.url}
                </a>
              )
            )}
          </Channel>
        ))}

        {editing && data.socials.length < 6 && (
          <div>
            <BuilderButton
              onClick={() =>
                onChange({
                  ...data,
                  socials: [...data.socials, { id: newLocalId(), label: "", url: "" }],
                })
              }
              icon={Plus}
            >
              {labels.addSocial}
            </BuilderButton>
          </div>
        )}

        {!editing && wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block border-2 border-[#0B0B0D] px-8 py-4 text-center text-sm font-extrabold uppercase tracking-[0.14em] sm:self-start"
            style={{
              background: theme.primary,
              color: theme.background,
              boxShadow: `4px 4px 0 0 ${theme.background}`,
            }}
          >
            {labels.talkWhatsapp}
          </a>
        )}
      </div>

      {mapSrc && (
        <div className="min-h-[320px] border-2 border-[#0B0B0D] lg:min-h-full">
          <iframe
            src={mapSrc}
            title={labels.mapTitle}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-full min-h-[320px] w-full"
            style={{
              border: 0,
              // Dessatura para o mapa não gritar mais alto que o site. Só
              // dessaturação, sem inverter: inverter só ficaria bom em paleta
              // escura, e a paleta é escolha de cada comunidade.
              filter: "grayscale(45%)",
              // No construtor o iframe engoliria o clique que seleciona a
              // seção — e o líder não conseguiria mais mexer no bloco.
              pointerEvents: editing ? "none" : undefined,
            }}
          />
        </div>
      )}
    </div>
  )
}
