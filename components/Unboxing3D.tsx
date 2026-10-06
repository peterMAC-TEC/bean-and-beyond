"use client";

import { useEffect, useRef, useState } from "react";
import { createUnboxing, type UnboxApi, type UnboxView } from "@/lib/unboxing";
import { STUDIO_PHOTOS, UNBOX_BOXES, UNBOX_IMAGES, UNBOX_ITEMS } from "@/content/unboxing";
import { site } from "@/content/site";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { play } from "@/lib/sound";

/**
 * The /unbox page: a full-screen 3D gift box. Tap it (or the button) to untie the ribbon and lift the lid;
 * tap an item, or its chip, to bring it up close with its details. Drag to look around.
 * The scene is lib/unboxing.ts; every word and price is in content/unboxing.ts.
 */
export default function Unboxing3D() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const api = useRef<UnboxApi | null>(null);
  const reduced = useReducedMotion();
  const [view, setView] = useState<UnboxView>({ phase: "closed", box: 0, focused: null });

  useEffect(() => {
    let alive = true;
    let made: UnboxApi | null = null;
    // the canvas labels use the site's display font, so wait for it before drawing them
    document.fonts.ready.then(() => {
      if (!alive || !canvas.current) return;
      made = api.current = createUnboxing(canvas.current, setView, { reduced });
    });
    return () => {
      alive = false;
      made?.dispose();
      api.current = null;
    };
  }, [reduced]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && api.current?.unfocus();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const box = UNBOX_BOXES[view.box];
  const busy = view.phase === "opening" || view.phase === "closing";
  const focusedKey = view.focused != null ? box.items[view.focused] : null;
  const item = focusedKey ? UNBOX_ITEMS[focusedKey] : null;
  const wa = `https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent(
    box.id === "all" ? "Hi Bean & Beyond! I'd like to build my own Diwali gift box." : `Hi Bean & Beyond! I'd like the ${box.name} (${box.price}) for Diwali.`,
  )}`;

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
        <div role="tablist" aria-label="Choose a gift box" className="pointer-events-auto flex max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-ink/60 p-1 backdrop-blur [scrollbar-width:none]">
          {UNBOX_BOXES.map((b, i) => (
            <button
              key={b.id}
              role="tab"
              type="button"
              aria-selected={i === view.box}
              disabled={busy}
              onClick={() => {
                play("clink");
                api.current?.loadBox(i);
              }}
              className={`hud shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-[14px] transition-colors ${
                i === view.box ? "bg-gold text-ink" : "text-muted hover:text-cream"
              }`}
            >
              {b.name}
              <span className={`ml-2 tabular-nums ${i === view.box ? "text-ink" : "text-glow"}`}>{b.price}</span>
            </button>
          ))}
        </div>
      </header>

      {/* item details: a side card, a bottom sheet on phones */}
      {item && focusedKey && (
        <aside
          aria-live="polite"
          className="absolute inset-x-3 bottom-3 z-10 max-h-[46svh] overflow-auto rounded-xl border border-line bg-panel/95 p-4 backdrop-blur sm:inset-x-auto sm:bottom-auto sm:right-8 sm:top-24 sm:max-h-[calc(100svh-230px)] sm:w-[340px]"
        >
          <button type="button" aria-label="Close details" onClick={() => api.current?.unfocus()} className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-ink/80 text-cream hover:text-glow">
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={UNBOX_IMAGES[item.photo].src} alt={`Photo of the ${item.name}`} className={`hidden aspect-[4/3] w-full rounded-md bg-white sm:block ${STUDIO_PHOTOS.has(item.photo) ? "object-contain p-2" : "object-cover"}`} />
          <p className="mono mt-3 text-gold">In the {box.id === "all" ? "Bean & Beyond range" : box.name}</p>
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
            {box.price} · {box.items.length} pieces ·{" "}
            <a href={wa} target="_blank" rel="noopener noreferrer" className="pointer-events-auto text-gold underline-offset-4 hover:text-glow hover:underline">
              Order on WhatsApp ↗
            </a>
          </p>
        </div>
        <div className="flex max-w-full flex-col items-end gap-3">
          {view.phase === "open" && (
            <div className="pointer-events-auto flex max-w-[640px] flex-wrap justify-end gap-2">
              {box.items.map((k, i) => (
                <button
                  key={k + i}
                  type="button"
                  aria-pressed={view.focused === i}
                  onClick={() => (view.focused === i ? api.current?.unfocus() : api.current?.focus(i))}
                  className={`hud rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
                    view.focused === i ? "border-glow text-glow" : "border-line bg-ink/60 text-cream hover:border-gold"
                  }`}
                >
                  {UNBOX_ITEMS[k].name}
                </button>
              ))}
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
