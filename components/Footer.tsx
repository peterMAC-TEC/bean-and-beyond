import { site } from "@/content/site";

export function Footer() {
  const { contact, brand, warning } = site;
  const hasFssai = contact.fssai !== "";
  return (
    <footer className="relative overflow-hidden border-t border-line bg-ink px-5 pb-16 pt-20 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <p className="serif text-[clamp(3rem,11vw,10rem)] leading-[0.9] text-cream">
          Bean <span className="italic text-gold">&amp;</span> Beyond
        </p>
        <p className="hud mt-4 text-2xl font-extralight text-muted">{brand.tagline}</p>

        <div className="mt-14 grid gap-10 border-t border-line pt-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="mono text-muted">Order</p>
            <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noopener noreferrer" className="hud mt-3 inline-block rounded-sm bg-[#25d366] px-4 py-2.5 text-[15px] font-medium text-ink">
              WhatsApp ↗
            </a>
          </div>
          <div className="space-y-1.5">
            <p className="mono text-muted">Contact</p>
            <p className="pt-2">
              <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="hud text-lg text-cream hover:text-glow">{contact.phone}</a>
            </p>
            <p>
              <a href={`mailto:${contact.email}`} className="text-cream hover:text-glow">{contact.email}</a>
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="mono text-muted">Social</p>
            <p className="pt-2">
              <a href={contact.instagramUrl} target="_blank" rel="noopener noreferrer" className="hud text-lg text-cream hover:text-glow">@{contact.instagram} ↗</a>
            </p>
          </div>
          <div className="paper rounded-sm p-4 text-[#2a1d12]">
            <p className="text-sm font-extrabold text-brick">{warning.heading}</p>
            <p className="mt-1 text-xs leading-relaxed">{warning.lines.join(" ")}</p>
          </div>
        </div>

        <div className="mono mt-12 flex flex-col gap-2 border-t border-line pt-6 text-muted sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {brand.name} · {contact.city} · Contains 0% alcohol
            {hasFssai && ` · FSSAI ${contact.fssai}`}
          </p>
          {/* TODO (Phase 4): policy page links: Terms, Privacy, Refunds, Shipping, Contact */}
          <p>BB-01 · Batch No. 01</p>
        </div>
      </div>
    </footer>
  );
}
