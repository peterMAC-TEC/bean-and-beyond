import { Label } from "@/components/Label";
import { site } from "@/content/site";

export default function ComingSoon() {
  const { brand, contact } = site;
  return (
    <main
      data-flavour="classic"
      className="relative flex flex-1 flex-col items-center justify-center gap-10 overflow-hidden px-6 py-16 text-center"
      style={{ background: "radial-gradient(ellipse at 50% 30%, #3a2416 0%, var(--espresso) 70%)" }}
    >
      <Label className="w-56 drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] sm:w-72" />

      <div className="max-w-xl">
        <h1 className="font-brush text-5xl leading-tight text-milk sm:text-7xl">
          {brand.tagline}
        </h1>
        <p className="mt-4 text-lg text-label/80">{brand.subline}</p>
        <p className="mt-6 inline-block rotate-[-2deg] border-2 border-brick px-4 py-1 font-display tracking-[0.2em] text-[#c9654a]">
          {brand.alcoholLine}
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <p className="font-display text-2xl tracking-widest text-gold">LAST CALL FOR THE LAUNCH</p>
        <p className="text-label/70">Coming soon to Bengaluru. Bottles pour very shortly.</p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <a
            href={`https://wa.me/${contact.whatsapp}`}
            className="rounded-full bg-gold px-6 py-3 font-semibold text-espresso transition hover:bg-milk"
          >
            Order on WhatsApp
          </a>
          <a
            href={contact.instagramUrl}
            className="rounded-full border border-gold px-6 py-3 text-gold transition hover:bg-gold hover:text-espresso"
          >
            @{contact.instagram}
          </a>
        </div>
      </div>
    </main>
  );
}
