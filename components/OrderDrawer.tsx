"use client";

import { useEffect, useRef, useState } from "react";
import { site } from "@/content/site";
import { play } from "@/lib/sound";
import { ORDER_EVENT, type OpenOrder } from "@/lib/order";

const { flavours, packs, addOns, contact, delivery } = site;
const SINGLE = flavours[0].price;
const milk = addOns.find((a) => a.show);
const empty = () => Object.fromEntries(flavours.map((f) => [f.id, 0])) as Record<string, number>;
const sum = (c: Record<string, number>) => Object.values(c).reduce((a, b) => a + b, 0);
const fee = (text: string) => (text.startsWith("TODO") ? "+ delivery" : text);

/** Drop bottles from the end of the list until the order fits the pack. */
function fit(c: Record<string, number>, size: number) {
  const next = { ...c };
  for (let i = flavours.length - 1; i >= 0 && sum(next) > size; i--) {
    const id = flavours[i].id;
    next[id] = Math.max(0, next[id] - (sum(next) - size));
  }
  return next;
}

function Stepper({ value, label, onMinus, onPlus, full }: { value: number; label: string; onMinus: () => void; onPlus: () => void; full: boolean }) {
  const btn = "grid h-9 w-9 place-items-center rounded-sm border border-line text-lg text-cream transition hover:border-gold/60 disabled:opacity-25 disabled:hover:border-line";
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={btn} onClick={onMinus} disabled={value === 0} aria-label={`One less ${label}`}>
        −
      </button>
      <span className="mono w-6 text-center !text-[13px] text-cream" aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} onClick={onPlus} disabled={full} aria-label={`One more ${label}`}>
        +
      </button>
    </div>
  );
}

/**
 * The order panel: pick bottles one by one or build a mixed pack, add extra
 * milk, then send the order on WhatsApp. Opened by every Order / Add button.
 * TODO (Phase 4): replace the WhatsApp step with a real cart and checkout.
 */
export function OrderDrawer() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("bottles");
  const [counts, setCounts] = useState(empty);
  const [extra, setExtra] = useState(0);
  const closeBtn = useRef<HTMLButtonElement>(null);

  const pack = packs.find((p) => p.id === mode);
  const picked = sum(counts);
  const left = pack ? pack.size - picked : Infinity;
  const ready = pack ? left === 0 : picked > 0;
  const base = pack ? pack.price : picked * SINGLE;
  const total = base + extra * (milk?.price ?? 0);
  const deal = !pack && packs.find((p) => p.size === picked);

  const choose = (id: string) => {
    play("tick");
    setMode(id);
    const p = packs.find((x) => x.id === id);
    if (p) setCounts((c) => fit(c, p.size));
  };
  const bump = (id: string, d: number) => {
    play("tick", { gain: 0.7 });
    setCounts((c) => ({ ...c, [id]: Math.max(0, c[id] + d) }));
  };

  // opened from anywhere via openOrder()
  useEffect(() => {
    const onOpen = (e: Event) => {
      const { mode: m, add, qty = 1 } = (e as CustomEvent<OpenOrder>).detail ?? {};
      if (m) {
        setMode(m);
        const p = packs.find((x) => x.id === m);
        if (p) setCounts((c) => fit(c, p.size));
      }
      if (add) {
        setCounts((c) => {
          const p = packs.find((x) => x.id === (m ?? mode));
          if (!p) return { ...c, [add]: c[add] + qty };
          return { ...c, [add]: c[add] + Math.max(0, Math.min(qty, p.size - sum(c))) };
        });
      }
      setOpen(true);
    };
    window.addEventListener(ORDER_EVENT, onOpen);
    return () => window.removeEventListener(ORDER_EVENT, onOpen);
  }, [mode]);

  // while open: page scroll stops, Esc closes, focus moves into the panel
  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(new Event("bb:lock"));
    document.documentElement.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      window.dispatchEvent(new Event("bb:unlock"));
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const message = [
    "Hi! I'd like to order:",
    pack ? `The ${pack.size}-pack (₹${pack.price})` : `${picked} bottle${picked === 1 ? "" : "s"} (₹${base})`,
    ...flavours.filter((f) => counts[f.id]).map((f) => `• ${f.name} × ${counts[f.id]}`),
    ...(extra && milk ? [`+ ${milk.name} × ${extra} (₹${extra * milk.price})`] : []),
    `Total: ₹${total}`,
  ].join("\n");
  const waUrl = `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`;

  const options = [
    { id: "bottles", title: "Bottles", note: `₹${SINGLE} each` },
    ...packs.map((p) => ({ id: p.id, title: `${p.size}-pack`, note: `₹${p.price} · save ₹${p.size * SINGLE - p.price}` })),
  ];

  return (
    <div inert={!open} aria-hidden={!open} className="fixed inset-0 z-[60]">
      {/* backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`absolute inset-0 bg-ink/70 backdrop-blur-sm transition-opacity duration-500 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Your order"
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-line bg-panel shadow-2xl transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="flex items-center justify-between border-b border-line px-6 py-5">
          <div>
            <p className="mono text-muted">
              Order <span className="text-glow">{"// "}Build your pack</span>
            </p>
            <p className="hud mt-1 text-3xl font-extralight text-cream">Your order</p>
          </div>
          <button ref={closeBtn} type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-sm border border-line text-xl text-muted transition hover:border-gold/60 hover:text-cream">
            ×
          </button>
        </header>

        <div data-lenis-prevent className="flex-1 overflow-y-auto px-6 py-6">
          {/* how many */}
          <div role="radiogroup" aria-label="Order size" className="grid grid-cols-3 gap-2">
            {options.map((o) => {
              const on = o.id === mode;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => choose(o.id)}
                  className={`rounded-sm border px-3 py-3 text-left transition ${on ? "border-glow/70 bg-glow/10" : "border-line hover:border-gold/40"}`}
                >
                  <span className={`hud block text-xl ${on ? "text-glow" : "text-cream"}`}>{o.title}</span>
                  <span className="mono mt-1 block !text-[9px] text-muted">{o.note}</span>
                </button>
              );
            })}
          </div>

          {/* which flavours */}
          <div className="mt-8 flex items-baseline justify-between">
            <p className="mono text-muted">{pack ? `Mix & match ${pack.size}` : "Pick your bottles"}</p>
            {pack && (
              <p className={`mono ${left === 0 ? "text-glow" : "text-muted"}`}>{left === 0 ? "Pack full" : `${left} to go`}</p>
            )}
          </div>
          {pack && (
            <div aria-hidden className="mt-3 flex gap-1.5">
              {Array.from({ length: pack.size }, (_, i) => (
                <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < picked ? "bg-glow" : "bg-line"}`} />
              ))}
            </div>
          )}
          <ul className="mt-2">
            {flavours.map((f) => (
              <li key={f.id} className="flex items-center gap-4 border-b border-line py-4">
                <span aria-hidden className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: f.accent }} />
                <div className="min-w-0 flex-1">
                  <p className="hud text-2xl text-cream">{f.name}</p>
                  <p className="truncate text-[13px] text-muted">{f.oneLiner}</p>
                </div>
                <Stepper value={counts[f.id]} label={f.name} onMinus={() => bump(f.id, -1)} onPlus={() => bump(f.id, 1)} full={left <= 0} />
              </li>
            ))}
            {milk && (
              <li className="flex items-center gap-4 py-4">
                <span aria-hidden className="h-9 w-1.5 shrink-0 rounded-full bg-milk" />
                <div className="min-w-0 flex-1">
                  <p className="hud text-xl text-cream">{milk.name}</p>
                  <p className="text-[13px] text-muted">+₹{milk.price} · for the ones who like it sweeter</p>
                </div>
                <Stepper
                  value={extra}
                  label={milk.name}
                  onMinus={() => (play("tick", { gain: 0.7 }), setExtra((n) => Math.max(0, n - 1)))}
                  onPlus={() => (play("tick", { gain: 0.7 }), setExtra((n) => n + 1))}
                  full={false}
                />
              </li>
            )}
          </ul>

          {deal && (
            <button type="button" onClick={() => choose(deal.id)} className="mono mt-4 w-full rounded-sm border border-dashed border-gold/40 px-4 py-3 text-left text-glow transition hover:border-glow">
              {picked} bottles? Make it a {deal.size}-pack and save ₹{deal.size * SINGLE - deal.price} →
            </button>
          )}
        </div>

        <footer className="border-t border-line bg-panel-2 px-6 pb-6 pt-5">
          <div className="flex items-baseline justify-between">
            <p className="mono text-muted">Total · {pack ? fee(pack.delivery) : fee(delivery.singleFee)}</p>
            <p className="hud text-4xl text-glow">₹{total}</p>
          </div>
          {ready ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => play("clink")}
              className="hud mt-4 block rounded-sm bg-glow py-3.5 text-center text-[16px] font-semibold text-ink transition hover:bg-cream"
            >
              Send order on WhatsApp ↗
            </a>
          ) : (
            <button type="button" disabled className="hud mt-4 block w-full rounded-sm border border-line py-3.5 text-center text-[16px] text-muted">
              {pack ? `Pick ${left} more` : "Pick a bottle to start"}
            </button>
          )}
          <p className="mono mt-3 text-center !text-[9px] text-muted">Opens WhatsApp with your order written out, ready to send</p>
        </footer>
      </aside>
    </div>
  );
}
