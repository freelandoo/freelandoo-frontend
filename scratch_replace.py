import re

filepath = "c:/Users/Alex/Documents/Antigravity/freelandoo/freelandoo frontend/freelandoo-website-main/app/(header-only)/freelancer/[id]/_components/freelancer-profile-view.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# The block to replace starts at:
#   return (
#     <div className="bg-page-shell-dark">
#       <main className="container mx-auto px-4 py-8">
# and ends at:
#       </main>
# We replace it with the new layout block.

new_block = """  return (
    <div className="bg-background min-h-screen">
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Button
          onClick={() => router.back()}
          variant="ghost"
          className="mb-4 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        {/* HEADER SECTION */}
        <section className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12 mb-12">
          {/* Avatar Area */}
          <div className="shrink-0">
            <Avatar className="h-32 w-32 md:h-40 md:w-40 border border-border">
              {(profile.avatar_url || profile.user_avatar) && (
                <AvatarImage
                  src={profile.avatar_url ?? profile.user_avatar!}
                  alt={profile.display_name}
                  className="object-cover"
                />
              )}
              <AvatarFallback className="bg-primary text-4xl font-bold text-primary-foreground">
                {getInitials(profile.display_name)}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Info Area */}
          <div className="flex-1 space-y-5 text-center md:text-left w-full">
            {/* Name and Buttons Row */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
              <h1 className="text-2xl md:text-3xl font-semibold">{profile.display_name}</h1>
              
              <div className="flex items-center justify-center md:justify-start gap-2 w-full md:w-auto">
                {isOwnProfile ? (
                  <>
                    <Button 
                      asChild 
                      variant="secondary" 
                      className="font-semibold bg-secondary/80 hover:bg-secondary text-secondary-foreground flex-1 md:flex-none"
                    >
                      <Link href={`/account/profile/${profileId}/settings`}>
                        Editar perfil
                      </Link>
                    </Button>
                    <Button 
                      onClick={() => {
                        const agendaEl = document.getElementById("agenda-section")
                        if (agendaEl) agendaEl.scrollIntoView({ behavior: "smooth" })
                      }}
                      className="font-semibold flex-1 md:flex-none"
                    >
                      Agendar
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={() => {
                      const agendaEl = document.getElementById("agenda-section")
                      if (agendaEl) agendaEl.scrollIntoView({ behavior: "smooth" })
                    }}
                    className="font-semibold w-full md:w-auto px-8"
                  >
                    Agendar
                  </Button>
                )}
              </div>
            </div>

            {/* Badges and Location */}
            <div className="flex flex-col md:flex-row md:items-center gap-3 text-sm">
              <div className="flex items-center justify-center md:justify-start gap-2">
                {profile.machine_name && (
                  <Badge variant="outline" className="font-medium">
                    {profile.machine_name}
                  </Badge>
                )}
                {profile.desc_category && (
                  <Badge variant="secondary" className="font-medium bg-muted">
                    {profile.desc_category}
                  </Badge>
                )}
              </div>
              {(profile.municipio || profile.estado) && (
                <div className="flex items-center justify-center md:justify-start gap-1 text-muted-foreground font-medium">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{[profile.municipio, profile.estado].filter(Boolean).join(", ")}</span>
                </div>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm md:text-base leading-relaxed max-w-2xl break-words whitespace-pre-wrap mx-auto md:mx-0">
                {profile.bio}
              </p>
            )}

            {/* Social Links */}
            {profile.social_media && profile.social_media.filter(s => s.is_active).length > 0 && (
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                {profile.social_media.filter(s => s.is_active).map(social => (
                  <a
                    key={social.id_profile_social_media}
                    href={social.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center hover:scale-110 transition-transform"
                    title={social.desc_social_media_type}
                  >
                    <div className={`rounded-full p-2 ${getSocialBg(social.icon)}`}>
                      {getSocialIcon(social.icon)}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* DIVIDER */}
        <div className="border-t border-border mb-8"></div>

        {/* PORTFOLIO SECTION */}
        <section className="mb-16">
          <div className="flex items-center justify-center md:justify-between mb-8">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold tracking-wide uppercase text-muted-foreground">Portfólio</h2>
            </div>
            {isOwnProfile && (
              <Button
                size="sm"
                variant="ghost"
                className="hidden md:flex font-medium text-primary hover:bg-primary/10"
                onClick={handleAddPortfolioItem}
                disabled={isAddingPortfolioItem}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isAddingPortfolioItem ? "Criando..." : "Novo item"}
              </Button>
            )}
          </div>

          {/* Mobile Novo Item button */}
          {isOwnProfile && (
            <div className="flex md:hidden justify-center mb-6">
              <Button
                size="sm"
                variant="outline"
                className="w-full max-w-xs font-medium"
                onClick={handleAddPortfolioItem}
                disabled={isAddingPortfolioItem}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isAddingPortfolioItem ? "Criando..." : "Novo item"}
              </Button>
            </div>
          )}

          {portfolioError && (
            <p className="text-sm text-destructive mb-6 text-center">{portfolioError}</p>
          )}

          {portfolioItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1 md:gap-4 lg:gap-6">
              {portfolioItems.map((item) => {
                const activeMedias = item.media?.filter((m) => m.is_active !== false) ?? []
                const firstMedia = activeMedias[0]
                return (
                  <div key={item.id_portfolio_item} className="group relative flex flex-col">
                    {/* Media Container 4:5 aspect ratio */}
                    {firstMedia ? (
                      <div className="relative aspect-[4/5] bg-muted overflow-hidden md:rounded-lg border border-border/50">
                        {firstMedia.media_type === "video" ? (
                          <video
                            src={firstMedia.media_url}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            muted
                            playsInline
                            onMouseEnter={(e) => e.currentTarget.play()}
                            onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0 }}
                          />
                        ) : (
                          <img
                            src={firstMedia.media_url}
                            alt={item.title ?? "Mídia do portfólio"}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        )}
                        {/* Multiple media indicator */}
                        {activeMedias.length > 1 && (
                          <div className="absolute top-3 right-3">
                            <ImageIcon className="h-5 w-5 text-white drop-shadow-md opacity-90" />
                          </div>
                        )}
                        
                        {/* Owner Overlay Actions */}
                        {isOwnProfile && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                            <label
                              className="flex items-center justify-center h-10 w-10 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-sm cursor-pointer transition-colors"
                              title="Adicionar mídia"
                            >
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*,video/*"
                                onChange={(e) => handlePortfolioUpload(e, item.id_portfolio_item)}
                                disabled={isUploadingPortfolio === item.id_portfolio_item}
                              />
                              {isUploadingPortfolio === item.id_portfolio_item ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <Upload className="h-5 w-5" />
                              )}
                            </label>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleEditPortfolioItem(item)}
                                className="flex items-center justify-center h-10 w-10 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-sm transition-colors"
                                title="Editar item"
                              >
                                <Edit2 className="h-5 w-5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePortfolioDeleteItem(item.id_portfolio_item)}
                                className="flex items-center justify-center h-10 w-10 bg-destructive/80 hover:bg-destructive text-white rounded-full backdrop-blur-sm transition-colors"
                                title="Remover item"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="relative aspect-[4/5] bg-muted flex items-center justify-center md:rounded-lg border border-border/50">
                        <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                        {isOwnProfile && (
                          <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                             <label
                              className="flex items-center justify-center h-10 w-10 bg-background border shadow-sm hover:bg-accent text-foreground rounded-full cursor-pointer transition-colors"
                              title="Adicionar mídia"
                            >
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*,video/*"
                                onChange={(e) => handlePortfolioUpload(e, item.id_portfolio_item)}
                                disabled={isUploadingPortfolio === item.id_portfolio_item}
                              />
                              {isUploadingPortfolio === item.id_portfolio_item ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <Upload className="h-5 w-5" />
                              )}
                            </label>
                            <button
                              type="button"
                              onClick={() => handlePortfolioDeleteItem(item.id_portfolio_item)}
                              className="flex items-center justify-center h-10 w-10 bg-background border shadow-sm hover:bg-destructive hover:text-destructive-foreground text-foreground rounded-full transition-colors"
                              title="Remover item"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Content below image */}
                    <div className="pt-3 px-2 md:px-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm line-clamp-1">{item.title || "Sem título"}</h3>
                        {item.project_url && (
                          <a
                            href={item.project_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center shrink-0"
                            title="Ver projeto"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                      )}
                      
                      {/* Secondary Media Thumbnails (Only visible to owner to manage them) */}
                      {isOwnProfile && activeMedias.length > 1 && (
                        <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1 no-scrollbar">
                          {activeMedias.slice(1).map((media) => (
                            <div key={media.id_portfolio_media} className="relative group/thumb shrink-0 w-10 h-10 rounded overflow-hidden border border-border">
                              {media.media_type === "video" ? (
                                <video src={media.media_url} className="w-full h-full object-cover" muted playsInline />
                              ) : (
                                <img src={media.media_url} alt="Mídia" className="w-full h-full object-cover" />
                              )}
                              <button
                                type="button"
                                onClick={() => handlePortfolioDeleteMedia(item.id_portfolio_item, media.id_portfolio_media)}
                                className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                                aria-label="Remover mídia"
                              >
                                <X className="h-3 w-3 text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed rounded-xl">
              <div className="h-16 w-16 rounded-full border-2 flex items-center justify-center mb-4">
                <ImageIcon className="h-8 w-8 opacity-50" />
              </div>
              <p className="text-sm font-medium">Nenhum item no portfólio ainda.</p>
              {isOwnProfile && (
                <Button variant="link" onClick={handleAddPortfolioItem} className="mt-2 text-primary">
                  Adicionar o primeiro item
                </Button>
              )}
            </div>
          )}
        </section>

        {/* AGENDAR SECTION */}
        <section id="agenda-section" className="mb-20 max-w-2xl mx-auto scroll-mt-24">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold mb-2">Agendar horário</h2>
            <p className="text-muted-foreground text-sm">
              Selecione uma data para ver os horários disponíveis com {profile.display_name}.
            </p>
          </div>
          
          <div className="bg-card border rounded-2xl p-6 md:p-8 shadow-sm">
            <div className="space-y-8">
              {/* Date picker */}
              <div>
                <label className="block text-sm font-semibold mb-3">1. Escolha a data</label>
                <input
                  type="date"
                  min={new Date().toISOString().substring(0, 10)}
                  value={bookingDate}
                  onChange={async (e) => {
                    const d = e.target.value
                    setBookingDate(d)
                    setSelectedSlot(null)
                    setBookingError(null)
                    if (!d) { setBookingSlots([]); return }
                    setLoadingSlots(true)
                    try {
                      const res = await fetch(`/api/public/profile/${profileId}/available-slots?date=${d}`)
                      const data = await res.json()
                      setBookingSlots(data.slots || [])
                      if (data.message && (!data.slots || data.slots.length === 0)) {
                        setBookingError(data.message)
                      }
                    } catch { setBookingSlots([]) }
                    setLoadingSlots(false)
                  }}
                  className="w-full bg-background border rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                />
              </div>

              {/* Slots */}
              {bookingDate && (
                <div>
                  <label className="block text-sm font-semibold mb-3">2. Horários disponíveis</label>
                  {loadingSlots ? (
                    <div className="flex items-center gap-2 text-muted-foreground py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Buscando horários...
                    </div>
                  ) : bookingSlots.length === 0 ? (
                    <div className="bg-muted/50 border border-dashed rounded-xl p-6 text-center">
                      <p className="text-muted-foreground text-sm">
                        {bookingError || "Nenhum horário disponível nesta data."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {bookingSlots.map((slot) => (
                        <button
                          key={slot.start}
                          onClick={() => { setSelectedSlot(slot.start); setBookingError(null) }}
                          className={`py-3 rounded-xl border text-sm font-semibold transition-all ${
                            selectedSlot === slot.start
                              ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                              : "bg-background hover:bg-muted border-border hover:border-foreground/20"
                          }`}
                        >
                          {slot.start}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Client form */}
              {selectedSlot && (
                <div className="space-y-5 pt-6 border-t animate-in fade-in slide-in-from-bottom-4">
                  <label className="block text-sm font-semibold mb-1">3. Seus dados</label>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="booking-name" className="text-xs text-muted-foreground uppercase tracking-wider">Nome completo</Label>
                      <Input
                        id="booking-name"
                        placeholder="Seu nome"
                        className="mt-1 h-12 rounded-xl"
                        value={bookingForm.client_name}
                        onChange={(e) => setBookingForm(f => ({ ...f, client_name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="booking-email" className="text-xs text-muted-foreground uppercase tracking-wider">Email</Label>
                      <Input
                        id="booking-email"
                        type="email"
                        placeholder="seu@email.com"
                        className="mt-1 h-12 rounded-xl"
                        value={bookingForm.client_email}
                        onChange={(e) => setBookingForm(f => ({ ...f, client_email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="booking-whatsapp" className="text-xs text-muted-foreground uppercase tracking-wider">WhatsApp (opcional)</Label>
                      <Input
                        id="booking-whatsapp"
                        placeholder="(11) 99999-9999"
                        className="mt-1 h-12 rounded-xl"
                        value={bookingForm.client_whatsapp}
                        onChange={(e) => setBookingForm(f => ({ ...f, client_whatsapp: e.target.value }))}
                      />
                    </div>
                  </div>

                  {bookingError && (
                    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-center gap-2">
                      <X className="h-4 w-4 shrink-0" />
                      <p>{bookingError}</p>
                    </div>
                  )}

                  <Button
                    size="lg"
                    className="w-full h-14 text-base font-semibold rounded-xl"
                    disabled={isSubmittingBooking || !bookingForm.client_name.trim() || !bookingForm.client_email.trim()}
                    onClick={async () => {
                      setIsSubmittingBooking(true)
                      setBookingError(null)
                      try {
                        const res = await fetch(`/api/public/profile/${profileId}/bookings`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            client_name: bookingForm.client_name.trim(),
                            client_email: bookingForm.client_email.trim(),
                            client_whatsapp: bookingForm.client_whatsapp.trim() || null,
                            booking_date: bookingDate,
                            start_time: selectedSlot,
                          }),
                        })
                        const data = await res.json()
                        if (res.ok && data.checkout_url) {
                          window.location.href = data.checkout_url
                        } else {
                          setBookingError(data.error || "Erro ao agendar. Tente novamente.")
                        }
                      } catch {
                        setBookingError("Erro de conexão. Tente novamente.")
                      } finally {
                        setIsSubmittingBooking(false)
                      }
                    }}
                  >
                    {isSubmittingBooking ? (
                      <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Processando...</>
                    ) : (
                      <>Confirmar Agendamento</>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center px-4 leading-relaxed">
                    Você será redirecionado para o pagamento de um sinal via Stripe para confirmar este horário.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>"""

start_str = '  return (\n    <div className="bg-page-shell-dark">\n      <main className="container mx-auto px-4 py-8">'
end_str = '      </main>'

start_idx = content.find(start_str)
end_idx = content.find(end_str, start_idx)

if start_idx != -1 and end_idx != -1:
    end_idx += len(end_str)
    new_content = content[:start_idx] + new_block + content[end_idx:]
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully replaced content.")
else:
    print("Could not find start or end block.")
