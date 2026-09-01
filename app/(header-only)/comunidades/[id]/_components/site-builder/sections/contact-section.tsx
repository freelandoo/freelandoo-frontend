"use client"

// Contato & localização: endereço, mapa, WhatsApp, e-mail, horários e redes.

import { useCallback } from "react"
import { Clock, Link2, Mail, MapPin, MessageCircle, Plus, Trash2 } from "lucide-react"
import type { ContactData, SiteColorTheme, SocialLink } from "@/types/community-site"
import { newLocalId } from "@/types/community-site"
import { BuilderButton, InlineText } from "../editable"

/**
 * Monta o link do WhatsApp a partir do que a pessoa digitou.
 * Só dígitos: "(11) 96275-7599" e "+55 11 96275 7599" têm que virar o mesmo
 * link, e wa.me não aceita pontuação.
 */
function whatsappHref(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (digits.length < 8) return ""
  return `https://wa.me/${digits}`
}

function Row({
  icon: Icon,
  theme,
  children,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  theme: SiteColorTheme
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: theme.primary }} />
      <div className="min-w-0 flex-1">{children}</div>
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
    mapsUrl: string
    whatsapp: string
    email: string
    hours: string
    socialLabel: string
    socialUrl: string
    addSocial: string
    removeSocial: string
    openMaps: string
    talkWhatsapp: string
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

  const hasAnything =
    data.address || data.mapsUrl || data.whatsapp || data.email || data.hours || data.socials.length > 0

  if (!editing && !hasAnything) return null

  const wa = whatsappHref(data.whatsapp)

  return (
    <div
      className="grid gap-6 border-2 border-[#0B0B0D] p-6 md:grid-cols-2 md:p-8"
      style={{ background: theme.surface, boxShadow: `6px 6px 0 0 ${theme.background}` }}
    >
      <div className="flex flex-col gap-4">
        {(editing || data.address) && (
          <Row icon={MapPin} theme={theme}>
            <InlineText
              editing={editing}
              value={data.address}
              onChange={(v) => onChange({ ...data, address: v })}
              placeholder={labels.address}
              maxLength={160}
              multiline
              className="block whitespace-pre-line text-sm leading-relaxed"
              style={{ color: theme.textSecondary }}
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
          </Row>
        )}

        {(editing || data.hours) && (
          <Row icon={Clock} theme={theme}>
            <InlineText
              editing={editing}
              value={data.hours}
              onChange={(v) => onChange({ ...data, hours: v })}
              placeholder={labels.hours}
              maxLength={320}
              multiline
              className="block whitespace-pre-line text-sm leading-relaxed"
              style={{ color: theme.textSecondary }}
            />
          </Row>
        )}

        {(editing || data.email) && (
          <Row icon={Mail} theme={theme}>
            {editing ? (
              <InlineText
                editing
                value={data.email}
                onChange={(v) => onChange({ ...data, email: v })}
                placeholder={labels.email}
                maxLength={120}
                className="block text-sm"
                style={{ color: theme.textSecondary }}
              />
            ) : (
              <a
                href={`mailto:${data.email}`}
                className="block break-all text-sm"
                style={{ color: theme.textSecondary }}
              >
                {data.email}
              </a>
            )}
          </Row>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {(editing || data.whatsapp) && (
          <Row icon={MessageCircle} theme={theme}>
            {editing ? (
              <InlineText
                editing
                value={data.whatsapp}
                onChange={(v) => onChange({ ...data, whatsapp: v })}
                placeholder={labels.whatsapp}
                maxLength={40}
                className="block text-sm"
                style={{ color: theme.textSecondary }}
              />
            ) : (
              wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block border-2 border-[#0B0B0D] px-5 py-2.5 text-xs font-extrabold uppercase tracking-[0.12em]"
                  style={{ background: theme.primary, color: theme.background }}
                >
                  {labels.talkWhatsapp}
                </a>
              )
            )}
          </Row>
        )}

        {(editing || data.socials.length > 0) && (
          <div className="flex flex-col gap-2">
            {data.socials.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <Link2 className="h-4 w-4 shrink-0" style={{ color: theme.primary }} />
                {editing ? (
                  <>
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
                  </>
                ) : (
                  s.url && (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-extrabold uppercase tracking-[0.1em] underline"
                      style={{ color: theme.textPrimary }}
                    >
                      {s.label || s.url}
                    </a>
                  )
                )}
              </div>
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
          </div>
        )}
      </div>
    </div>
  )
}
