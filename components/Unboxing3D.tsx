"use client";

import { useEffect, useRef, useState } from "react";
import { createUnboxing, type UnboxApi, type UnboxView } from "@/lib/unboxing";
import { BUILD_GROUPS, BUILD_MAX_PIECES, STUDIO_PHOTOS, UNBOX_BOXES, UNBOX_IMAGES, UNBOX_ITEMS } from "@/content/unboxing";
import { site } from "@/content/site";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { play } from "@/lib/sound";

/** the box to start on: /unbox?box=brew */
function initialBox() {
  if (typeof window === "undefined") return 0;
  const i = UNBOX_BOXES.findIndex((b) => b.id === new URLSearchParams(window.location.search).get("box"));
  return i < 0 ? 0 : i;
}

/**
 * The /unbox page: a full-screen 3D gift box. Tap it (or the button) to untie the ribbon and lift the lid;
 * tap an item, or its chip, to bring it up close with its details. Drag to look around.
 * The scene is lib/unboxing.ts; every word and price is in content/unboxing.ts.
 */
export default function Unboxing3D() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const api = useRef<UnboxApi | null>(null);
  const reduced = useReducedMotion();
  const [start] = useState(initialBox);
  const [view, setView] = useState<UnboxView>({ phase: "closed", box: start, focused: null, items: UNBOX_BOXES[start].items });
  // Build your own: what's been picked (kept when switching tabs and back)
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    let made: UnboxApi | null = null;
    // the canvas labels use the site's display font, so wait for it before drawing them
    document.fonts.ready.then(() => {
      if (!alive || !canvas.current) return;
      made = api.current = createUnboxing(canvas.current, setView, { reduced, box: start });
    });
    return () => {
      alive = false;
      made?.dispose();
      api.current = null;
    };
  }, [reduced, start]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && api.current?.unfocus();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const box = UNBOX_BOXES[view.box];
  const building = box.id === "build";
  const busy = view.phase === "opening" || view.phase === "closing";
  const focusedKey = view.focused != null ? view.items[view.focused] : null;
  const item = focusedKey ? UNBOX_ITEMS[focusedKey] : null;
  // no prices in the Build-your-own box (user, 2026-10-07): it shows what's in it, and the order goes by WhatsApp
  const wa = `https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent(
    building
      ? `Hi Bean & Beyond! I'd like to build my own Diwali gift box with: ${picked.map((k) => UNBOX_ITEMS[k].name).join(", ") || "(still choosing)"}.`
      : `Hi Bean & Beyond! I'd like the ${box.name} (${box.price}) for Diwali.`,
  )}`;
  const toggle = (k: string) => {
    if (busy) return;
    const next = picked.includes(k) ? picked.filter((x) => x !== k) : [...picked, k];
    play("clink");
    setPicked(next);
    api.current?.setItems(next);
  };

  return (
    <main className="relative h-[100svh] overflow-hidden bg-ink" style={{ background: "radial-gradient(120% 80% at 50% 35%, #231b15 0%, var(--ink) 65%)" }}>
      <canvas
        ref={canvas}
        tabIndex={0}
        aria-label="3D gift box. Tap the box to open it, then tap an item to see it up close."
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && view.phase === "closed") {
            e.preventDefault();
            api.current?.open();
          }
        }}
        className="absolute inset-0 block h-full w-full touch-none outline-none"
      />

      {/* top: brand + box tabs */}
      <header className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8">
        {/* a full page load on purpose: the home page sets up its loader and scroll animations on load */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="pointer-events-auto flex flex-col leading-none">
          <span className="serif text-lg tracking-wide text-cream">BEAN &amp; BEYOND</span>
          <span className="mono mt-1 !text-[8px] text-muted">← Back to the bottle</span>
        </a>
        <div role="tablist" aria-label="Choose a gift box" className="pointer-events-auto flex w-full max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-ink/80 p-1 pr-10 [mask-image:linear-gradient(to_right,black_82%,transparent)] [scrollbar-width:none] sm:w-auto sm:flex-wrap sm:justify-end sm:overflow-visible sm:rounded-3xl sm:pr-1 sm:[mask-image:none]">
          {UNBOX_BOXES.map((b, i) => (
            <button
              key={b.id}
              role="tab"
              type="button"
              aria-selected={i === view.box}
              disabled={busy}
              onClick={() => {
                play("clink");
                api.current?.loadBox(i, b.id === "build" ? picked : undefined);
              }}
              className={`hud shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-[14px] transition-colors ${
                i === view.box ? "bg-gold text-ink" : b.id === "build" ? "border border-dashed border-glow/70 text-glow hover:bg-glow/10" : "text-muted hover:text-cream"
              }`}
            >
              {b.id === "build" && <span aria-hidden className="mr-1.5">+</span>}
              {b.name}
              {b.price && <span className={`ml-2 tabular-nums ${i === view.box ? "text-ink" : "text-glow"}`}>{b.price}</span>}
            </button>
          ))}
        </div>
      </header>

      {/* item details: a side card, a bottom sheet on phones */}
      {item && focusedKey && (
        <aside
          aria-live="polite"
          className="absolute inset-x-3 bottom-3 z-10 max-h-[46svh] overflow-auto rounded-xl border border-line bg-panel/95 p-4 sm:inset-x-auto sm:bottom-auto sm:right-8 sm:top-24 sm:max-h-[calc(100svh-230px)] sm:w-[340px]"
        >
          <button type="button" aria-label="Close details" onClick={() => api.current?.unfocus()} className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-ink/80 text-cream hover:text-glow">
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={UNBOX_IMAGES[item.photo].src} alt={`Photo of the ${item.name}`} className={`hidden aspect-[4/3] w-full rounded-md bg-white sm:block ${STUDIO_PHOTOS.has(item.photo) ? "object-contain p-2" : "object-cover"}`} />
          <p className="mono mt-3 text-gold">{building ? "In your box" : `In the ${box.name}`}</p>
          <h2 className="serif mt-1 text-2xl text-cream">{item.name}</h2>
          <p className="mt-2 text-[16px] leading-snug text-cream/75">{item.desc}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {item.facts.map((f) => (
              <li key={f} className="hud rounded-sm border border-line px-2 py-1 text-[13px] text-glow">
                {f}
              </li>
            ))}
          </ul>
        </aside>
      )}

      {/* bottom: caption + actions */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 px-4 pb-[calc(18px+env(safe-area-inset-bottom))] pt-4 sm:px-8">
        <div className="min-w-0">
          <p className="mono text-glow">Diwali gift box · 2026</p>
          <h1 className="serif mt-1 text-[clamp(28px,4.4vw,48px)] leading-none text-cream">{box.name}</h1>
          <p className="hud mt-2 text-[15px] text-muted">
            {building ? (picked.length ? "Your own box" : "Empty") : box.price} · {view.items.length} {view.items.length === 1 ? "piece" : "pieces"} ·{" "}
            <a href={wa} target="_blank" rel="noopener noreferrer" className="pointer-events-auto text-gold underline-offset-4 hover:text-glow hover:underline">
              Order on WhatsApp ↗
            </a>
          </p>
        </div>
        <div className="flex max-w-full flex-col items-end gap-3">
          {view.phase === "open" && (
            <div className="pointer-events-auto flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:max-w-[640px] sm:flex-wrap sm:justify-end sm:overflow-visible sm:pb-0">
              {view.items.map((k, i) => (
                <button
                  key={k + i}
                  type="button"
                  aria-pressed={view.focused === i}
                  onClick={() => (view.focused === i ? api.current?.unfocus() : api.current?.focus(i))}
                  className={`hud shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
                    view.focused === i ? "border-glow text-glow" : "border-line bg-ink/60 text-cream hover:border-gold"
                  }`}
                >
                  {UNBOX_ITEMS[k].name}
                </button>
              ))}
            </div>
          )}
          {building && (
            <div className="pointer-events-auto w-full max-w-[min(760px,calc(100vw-32px))]">
              <p className="hud mb-2 text-right text-[13px] text-muted">
                Tap a piece to put it in · tap again to take it out · up to {BUILD_MAX_PIECES}
              </p>
              {/* phones: one swipeable row with both groups; larger screens: a labelled block per group */}
              <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin] sm:block sm:overflow-visible">
              {BUILD_GROUPS.map((group, gi) => (
              <div key={group.label} className="flex shrink-0 items-center gap-2 sm:mt-1.5 sm:block sm:first:mt-0">
              {gi > 0 && <span aria-hidden className="mono shrink-0 self-stretch border-l border-line pl-2 pt-1 text-muted [writing-mode:vertical-rl] sm:hidden">{group.label}</span>}
              <p className="mono mb-1 hidden text-right text-muted sm:block">{group.label}</p>
              <ul className="flex justify-start gap-2 sm:flex-wrap sm:justify-end">
                {group.items.map((k) => {
                  const it = UNBOX_ITEMS[k];
                  const on = picked.includes(k);
                  const full = !on && picked.length >= BUILD_MAX_PIECES;
                  return (
                    <li key={k} className="shrink-0">
                      <button
                        type="button"
                        aria-pressed={on}
                        aria-label={`${it.name}${on ? ", in your box" : ""}`}
                        title={full ? `A box holds up to ${BUILD_MAX_PIECES} pieces.` : it.name}
                        disabled={busy || full}
                        onClick={() => toggle(k)}
                        className={`relative block h-[60px] w-[60px] overflow-hidden rounded-lg border-2 bg-white transition disabled:opacity-35 ${on ? "border-glow" : "border-transparent hover:border-gold"}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={UNBOX_IMAGES[it.photo].src} alt="" className={`h-full w-full ${STUDIO_PHOTOS.has(it.photo) ? "object-contain p-1" : "object-cover"}`} />
                        <span aria-hidden className={`absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full text-[12px] shadow ${on ? "bg-glow text-ink" : "bg-ink/85 text-gold"}`}>
                          {on ? "✓" : "+"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              </div>
              ))}
              </div>
            </div>
          )}
          <p className="hud text-[14px] text-muted">
            {view.phase === "closed"
              ? "Tap the box to untie the ribbon"
              : view.phase === "open"
                ? item
                  ? "Drag to turn it · tap outside to put it back"
                  : "Tap any item to see it up close · drag to look around"
                : " "}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              play("clink");
              if (view.phase === "closed") api.current?.open();
              else api.current?.close();
            }}
            className="hud pointer-events-auto rounded-full bg-glow px-6 py-3 text-[15px] font-medium text-ink transition-colors hover:bg-cream disabled:opacity-50"
          >
            {view.phase === "closed" || view.phase === "opening" ? "Open the box" : "Close the lid"}
          </button>
        </div>
      </div>
    </main>
  );
}
