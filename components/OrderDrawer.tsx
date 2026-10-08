"use client";

import { useEffect, useRef, useState } from "react";
import { site } from "@/content/site";
import { play } from "@/lib/sound";
import { ORDER_EVENT, type OpenOrder } from "@/lib/order";
import { CrateStage } from "./CrateStage";

const { flavours, addOns, contact, delivery, instant } = site;
const SINGLE = flavours[0].price;
const FREE_FROM = delivery.freeFrom;
const milk = addOns.find((a) => a.show);
// the instant coffee powder sells here once it has a price (it doesn't go in the bottle crate)
const powder = instant.show && instant.price > 0 ? instant : null;
const empty = () => Object.fromEntries(flavours.map((f) => [f.id, 0])) as Record<string, number>;
const sum = (c: Record<string, number>) => Object.values(c).reduce((a, b) => a + b, 0);

function Stepper({ value, label, onMinus, onPlus }: { value: number; label: string; onMinus: () => void; onPlus: () => void }) {
  const btn = "grid h-8 w-8 place-items-center rounded-sm border border-line text-base text-cream transition hover:border-gold/60 disabled:opacity-25 disabled:hover:border-line";
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button type="button" className={btn} onClick={onMinus} disabled={value === 0} aria-label={`One less ${label}`}>
        −
      </button>
      <span className="mono w-6 text-center !text-[13px] text-cream" aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} onClick={onPlus} aria-label={`One more ${label}`}>
        +
      </button>
    </div>
  );
}

/**
 * The order panel: add as many bottles as you like (any mix of flavours); every one drops into the
 * wooden crate at the top. Free delivery from {FREE_FROM} bottles. Sending the order nails the crate
 * shut and ships it, and opens WhatsApp with the order written out. Opened by every Order / Add button.
 * TODO (Phase 4): replace the WhatsApp step with a real cart and checkout.
 */
export function OrderDrawer() {
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState(empty);
  const [extra, setExtra] = useState(0);
  // instant coffee, per flavour (keys are flavour ids)
  const [jarCounts, setJarCounts] = useState<Record<string, number>>({});
  const jars = sum(jarCounts);
  const bumpJar = (id: string, d: number) => {
    play("tick", { gain: 0.7 });
    setShipped(false);
    setJarCounts((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + d) }));
  };
  // the order has been sent: the crate is nailed shut and ships out of frame (reset by any change)
  const [shipped, setShipped] = useState(false);
  const closeBtn = useRef<HTMLButtonElement>(null);

  // in the order they were added, so new bottles join the end of the crate
  const [order, setOrder] = useState<string[]>([]);
  const picked = sum(counts);
  const free = picked >= FREE_FROM;
  const toFree = Math.max(0, FREE_FROM - picked);
  const total = picked * SINGLE + extra * (milk?.price ?? 0) + jars * (powder?.price ?? 0);
  const items = picked + jars;

  const bump = (id: string, d: number) => {
    play("tick", { gain: 0.7 });
    setShipped(false);
    setCounts((c) => ({ ...c, [id]: Math.max(0, c[id] + d) }));
    setOrder((o) => {
      if (d > 0) return [...o, id];
      const i = o.lastIndexOf(id);
      return i < 0 ? o : [...o.slice(0, i), ...o.slice(i + 1)];
    });
  };

  // opened from anywhere via openOrder()
  useEffect(() => {
    const onOpen = (e: Event) => {
      const { add, qty = 1 } = (e as CustomEvent<OpenOrder>).detail ?? {};
      // instant coffee arrives as "instant:<flavour>"
      if (add && powder && add.startsWith(`${powder.id}:`)) {
        const fl = add.slice(powder.id.length + 1);
        setJarCounts((c) => ({ ...c, [fl]: (c[fl] ?? 0) + qty }));
      } else if (add) {
        setCounts((c) => ({ ...c, [add]: c[add] + qty }));
        setOrder((o) => [...o, ...Array.from({ length: qty }, () => add)]);
      }
      setShipped(false);
      setOpen(true);
    };
    window.addEventListener(ORDER_EVENT, onOpen);
    return () => window.removeEventListener(ORDER_EVENT, onOpen);
  }, []);

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
    ...(picked ? [`${picked} bottle${picked === 1 ? "" : "s"} (₹${picked * SINGLE})`] : []),
    ...flavours.filter((f) => counts[f.id]).map((f) => `• ${f.name} × ${counts[f.id]}`),
    ...(extra && milk ? [`+ ${milk.name} × ${extra} (₹${extra * milk.price})`] : []),
    ...(powder ? powder.flavours.filter((fl) => jarCounts[fl.id]).map((fl) => `+ ${fl.name} ${powder.name.toLowerCase()} coffee${powder.size ? ` (${powder.size})` : ""} × ${jarCounts[fl.id]} (₹${jarCounts[fl.id] * powder.price})`) : []),
    `Total: ₹${total}${free ? " · free delivery" : ""}`,
  ].join("\n");
  const waUrl = `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`;

  return (
    <div inert={!open} aria-hidden={!open} className="fixed inset-0 z-[60]">
      {/* backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`absolute inset-0 bg-ink/75 transition-opacity duration-500 ${open ? "opacity-100 backdrop-blur-sm" : "pointer-events-none opacity-0"}`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Your order"
        data-lenis-prevent
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto border-l border-line bg-panel shadow-2xl transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-line px-6 py-3 [@media(max-height:640px)]:py-2">
          <div>
            <p className="mono text-muted">
              Order <span className="text-glow">{"// "}Into the crate</span>
            </p>
            <p className="hud mt-0.5 text-2xl font-extralight text-cream">Your order</p>
          </div>
          <button ref={closeBtn} type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-sm border border-line text-xl text-muted transition hover:border-gold/60 hover:text-cream">
            ×
          </button>
        </header>

        {/* every bottle you add drops into the crate; it ships when you send the order.
            The options and the button keep their size; the crate takes whatever height is left. */}
        <div className="relative min-h-[104px] flex-1 border-b border-line bg-[radial-gradient(90%_120%_at_50%_100%,rgba(233,196,106,.10),transparent_70%),radial-gradient(45%_85%_at_50%_0%,rgba(233,196,106,.07),transparent_75%)]">
          <CrateStage bottles={order} shipped={shipped} open={open} />
        </div>

        <div className="shrink-0 px-6 py-3 [@media(max-height:640px)]:py-2">
          {/* free delivery progress */}
          <div className="flex items-baseline justify-between">
            <p className="mono text-muted">₹{SINGLE} a bottle · any mix</p>
            <p className={`mono ${free ? "text-glow" : "text-muted"}`}>{free ? "Free delivery ✓" : `${toFree} more for free delivery`}</p>
          </div>
          <div aria-hidden className="mt-2 flex gap-1.5">
            {Array.from({ length: FREE_FROM }, (_, i) => (
              <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < picked ? "bg-glow" : "bg-line"}`} />
            ))}
          </div>

          <ul className="mt-1">
            {flavours.map((f) => (
              <li key={f.id} className="flex items-center gap-3 border-b border-line py-2 [@media(max-height:700px)]:py-1.5">
                <span aria-hidden className="h-7 w-1 shrink-0 rounded-full" style={{ background: f.accent }} />
                <div className="min-w-0 flex-1">
                  <p className="hud text-lg leading-tight text-cream">{f.name}</p>
                  <p className="truncate text-[12px] leading-tight text-muted">{f.oneLiner}</p>
                </div>
                <Stepper value={counts[f.id]} label={f.name} onMinus={() => bump(f.id, -1)} onPlus={() => bump(f.id, 1)} />
              </li>
            ))}
            {milk && (
              <li className="flex items-center gap-3 py-2 [@media(max-height:700px)]:py-1.5">
                <span aria-hidden className="h-7 w-1 shrink-0 rounded-full bg-milk" />
                <div className="min-w-0 flex-1">
                  <p className="hud text-lg leading-tight text-cream">{milk.name}</p>
                  <p className="truncate text-[12px] leading-tight text-muted">+₹{milk.price} · for the ones who like it sweeter</p>
                </div>
                <Stepper
                  value={extra}
                  label={milk.name}
                  onMinus={() => (play("tick", { gain: 0.7 }), setExtra((n) => Math.max(0, n - 1)))}
                  onPlus={() => (play("tick", { gain: 0.7 }), setExtra((n) => n + 1))}
                />
              </li>
            )}
            {powder?.flavours.map((fl, i) => (
              <li key={fl.id} className={`flex items-center gap-3 py-2 [@media(max-height:700px)]:py-1.5 ${i === 0 ? "border-t border-line" : ""}`}>
                <span aria-hidden className="h-7 w-1 shrink-0 rounded-full" style={{ background: fl.accent }} />
                <div className="min-w-0 flex-1">
                  <p className="hud text-lg leading-tight text-cream">
                    {fl.name} <span className="text-muted">· {powder.name.toLowerCase()}</span>
                  </p>
                  <p className="truncate text-[12px] leading-tight text-muted">
                    ₹{powder.price}
                    {powder.size && ` · ${powder.size}`} · {powder.tag}
                  </p>
                </div>
                <Stepper value={jarCounts[fl.id] ?? 0} label={`${fl.name} ${powder.name.toLowerCase()} coffee`} onMinus={() => bumpJar(fl.id, -1)} onPlus={() => bumpJar(fl.id, 1)} />
              </li>
            ))}
          </ul>
        </div>

        <footer className="shrink-0 border-t border-line bg-panel-2 px-6 pb-4 pt-3 [@media(max-height:640px)]:pb-3 [@media(max-height:640px)]:pt-2">
          <div className="flex items-baseline justify-between">
            <p className="mono text-muted">Total · {free ? "free delivery" : picked ? "+ delivery" : "—"}</p>
            <p className="hud text-3xl text-glow">₹{total}</p>
          </div>
          {items > 0 ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                play("clink");
                play("stamp");
                setShipped(true);
              }}
              className="hud mt-3 block rounded-sm bg-glow py-3 text-center text-[16px] font-semibold text-ink transition hover:bg-cream"
            >
              Send order on WhatsApp ↗
            </a>
          ) : (
            <button type="button" disabled className="hud mt-3 block w-full rounded-sm border border-line py-3 text-center text-[16px] text-muted">
              Add a bottle to start
            </button>
          )}
          <p className="mono mt-2 text-center !text-[9px] text-muted">Opens WhatsApp with your order written out, ready to send</p>
        </footer>
      </aside>
    </div>
  );
}
