"use client";

import { useSyncExternalStore } from "react";
import { site, type Stall } from "@/content/site";
import { TextReveal } from "./TextReveal";
import { Button } from "./Button";

// a one-second clock shared by the countdown
let clock = 0;
const subscribeClock = (cb: () => void) => {
  clock = Date.now();
  const t = window.setInterval(() => {
    clock = Date.now();
    cb();
  }, 1000);
  return () => window.clearInterval(t);
};
const getNow = () => clock || (clock = Date.now());

const SIX_HOURS = 6 * 60 * 60 * 1000;
const endOf = (s: Stall) => (s.end ? Date.parse(s.end) : Date.parse(s.start) + SIX_HOURS);

const fmtDate = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
const fmtTime = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

function Countdown({ to, now }: { to: number; now: number }) {
  const left = Math.max(0, to - now);
  const parts = [
    ["days", Math.floor(left / 86400000)],
    ["hrs", Math.floor(left / 3600000) % 24],
    ["min", Math.floor(left / 60000) % 60],
    ["sec", Math.floor(left / 1000) % 60],
  ] as const;
  return (
    <div className="flex gap-3 sm:gap-5" role="timer" aria-live="off">
      {parts.map(([label, n]) => (
        <div key={label} className="text-center">
          <p className="hud text-5xl font-extralight tabular-nums text-cream sm:text-7xl">{String(n).padStart(2, "0")}</p>
          <p className="mono text-muted">{label}</p>
        </div>
      ))}
    </div>
  );
}

/** Upcoming stalls with a live countdown to the next one. Past stalls hide themselves. */
export function FindUs() {
  // null on the server, so the list only renders in the browser with the real time
  const now = useSyncExternalStore(subscribeClock, getNow, () => null);

  const upcoming = now == null ? [] : site.stalls.filter((s) => endOf(s) > now).sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const next = upcoming[0];
  const live = next && now != null && Date.parse(next.start) <= now;
  const { findUs } = site;

  return (
    <section id="find-us" className="bg-ink px-5 py-28 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="border-b border-line pb-6">
          <p className="mono text-muted">
            Events <span className="text-glow">{"// "}{findUs.kicker}</span>
          </p>
          <TextReveal text={findUs.title} className="hud mt-3 text-[clamp(2.4rem,5vw,4.8rem)] font-extralight leading-none text-cream" />
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          {/* countdown panel */}
          <div className="brackets surface relative overflow-hidden rounded-lg border border-line bg-panel p-6 sm:p-10">
            <div aria-hidden className="absolute inset-0 opacity-60" style={{ background: "radial-gradient(ellipse 60% 70% at 80% 0%, rgba(233,196,106,.12), transparent 70%)" }} />
            <p className="mono relative text-muted">
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-brick bb-blink" aria-hidden />
              {next ? (live ? "Pouring right now" : "Next pour in") : "Status"}
            </p>
            {now != null && next && !live && (
              <div className="relative mt-5">
                <Countdown to={Date.parse(next.start)} now={now} />
              </div>
            )}
            {now != null && next && <p className="hud relative mt-5 text-2xl text-cream">{next.title} · {next.venue}</p>}
            {now != null && !next && (
              <div className="relative mt-5 max-w-md">
                <p className="hud text-5xl font-extralight text-cream">Off the clock.</p>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">{findUs.empty}</p>
                <div className="mt-6">
                  <Button href={site.contact.instagramUrl} external variant="outline">
                    Follow @{site.contact.instagram}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* list */}
          <div className="surface rounded-lg border border-line bg-panel-2 p-6">
            <p className="mono text-muted">Schedule · {upcoming.length} upcoming</p>
            {upcoming.length === 0 ? (
              <p className="mono mt-6 text-muted/70">— no stalls on the board yet —</p>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {upcoming.map((s) => (
                  <li key={s.start + s.title} className="flex items-center justify-between gap-4 py-4">
                    <div>
                      <p className="mono text-glow">
                        {fmtDate.format(Date.parse(s.start))} · {fmtTime.format(Date.parse(s.start))}
                        {s.end && `–${fmtTime.format(Date.parse(s.end))}`}
                      </p>
                      <p className="hud mt-1 text-xl text-cream">{s.title}</p>
                      <p className="text-sm text-muted">{s.venue}</p>
                    </div>
                    <a href={s.mapsUrl} target="_blank" rel="noopener noreferrer" className="hud shrink-0 rounded-sm border border-line px-3 py-2 text-sm text-gold transition hover:border-glow hover:text-glow">
                      Map ↗
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
