"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getMuted, setMuted, subscribeSound, play } from "@/lib/sound";
import { site } from "@/content/site";
import { openOrder } from "@/lib/order";

const RUNTIME = 180; // the page "plays" like a 3-minute film; the timecode shows where you are

function SoundToggle() {
  const muted = useSyncExternalStore(subscribeSound, getMuted, () => true);
  return (
    <button
      type="button"
      onClick={() => setMuted(!muted)}
      aria-pressed={!muted}
      aria-label={muted ? "Turn sound on" : "Turn sound off"}
      className="mono flex items-center gap-2 text-muted transition hover:text-cream"
    >
      <span aria-hidden className="flex h-3 items-end gap-[2px]">
        {[5, 9, 6, 11].map((h, i) => (
          <span key={i} className="w-[2px] bg-current transition-all" style={{ height: muted ? 2 : h }} />
        ))}
      </span>
      {muted ? "Sound off" : "Sound on"}
    </button>
  );
}

/**
 * The fixed "spec sheet" layer: logo, numbered section nav, timecode,
 * a tick-mark progress bar naming the current section, and the order button.
 */
export function Hud() {
  const bar = useRef<HTMLDivElement>(null);
  const tc = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(0);

  // progress bar + timecode follow the scroll (written straight to the DOM, no re-renders)
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      const p = max > 0 ? Math.min(1, scrollY / max) : 0;
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
      if (tc.current) {
        const t = p * RUNTIME;
        const ff = Math.floor((t % 1) * 24);
        const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
        tc.current.textContent = `00:${pad(t / 60)}:${pad(t % 60)}:${pad(ff)}`;
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // which section is in the middle of the screen
  useEffect(() => {
    const els = site.sections.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(site.sections.findIndex((s) => s.id === e.target.id));
        });
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const current = site.sections[Math.max(0, active)];

  return (
    <>
      {/* top bar */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-ink/90">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          <a href="#bottle" className="flex flex-col leading-none">
            <span className="serif text-lg tracking-wide text-cream">BEAN &amp; BEYOND</span>
            <span className="mono mt-1 !text-[8px] text-muted">{site.contact.city} · Est. {site.brand.established}</span>
          </a>
          <nav aria-label="Sections" className="hidden items-center gap-7 lg:flex">
            {site.sections.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`hud text-[13px] transition-colors ${i === active ? "text-glow" : "text-muted hover:text-cream"}`}
              >
                <span className="mr-1 font-mono text-[10px]">{String(i + 1).padStart(2, "0")}.</span>
                {s.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-5">
            <SoundToggle />
            <button
              type="button"
              onClick={() => {
                play("clink");
                openOrder();
              }}
              className="hud hidden rounded-sm border border-glow/60 px-4 py-1.5 text-[13px] text-glow transition hover:bg-glow hover:text-ink sm:block"
            >
              Order ↗
            </button>
          </div>
        </div>
      </header>

      {/* timecode */}
      <div className="mono pointer-events-none fixed left-4 top-[68px] z-40 hidden text-muted sm:left-6 md:block">
        <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-brick bb-blink" aria-hidden />
        <span ref={tc}>00:00:00:00</span>
      </div>

      {/* corner brackets on the viewport */}
      <div aria-hidden className="pointer-events-none fixed inset-3 z-40 hidden sm:block">
        <span className="absolute left-0 top-14 h-4 w-4 border-l border-t border-gold/40" />
        <span className="absolute right-0 top-14 h-4 w-4 border-r border-t border-gold/40" />
        <span className="absolute bottom-10 left-0 h-4 w-4 border-b border-l border-gold/40" />
        <span className="absolute bottom-10 right-0 h-4 w-4 border-b border-r border-gold/40" />
      </div>

      {/* bottom progress bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-ink/90">
        <div className="flex h-11 items-center gap-3 px-4 sm:h-9 sm:gap-4 sm:px-6">
          <span className="mono shrink-0 text-cream">
            {"// "}{String(Math.max(0, active) + 1).padStart(2, "0")} {current.label}
          </span>
          <div className="relative h-3 flex-1 overflow-hidden" aria-hidden>
            <div className="absolute inset-0" style={{ background: "repeating-linear-gradient(90deg, rgba(220,192,138,.35) 0 1px, transparent 1px 8px)" }} />
            <div ref={bar} className="absolute inset-0 origin-left" style={{ transform: "scaleX(0)", background: "repeating-linear-gradient(90deg, var(--glow) 0 1px, transparent 1px 8px)", boxShadow: "0 0 12px rgba(233,196,106,.25)" }} />
          </div>
          <span className="mono hidden shrink-0 text-muted md:block">BB-01 · 180 ml · 0% ABV</span>
          {/* phones: the order button sits in the bar, so it never covers the story text */}
          <button
            type="button"
            onClick={() => {
              play("clink");
              openOrder();
            }}
            className="hud shrink-0 rounded-sm bg-glow px-3.5 py-1.5 text-[13px] font-semibold text-ink sm:hidden"
          >
            Order ↗
          </button>
        </div>
      </div>
    </>
  );
}
