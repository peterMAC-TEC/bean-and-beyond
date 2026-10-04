"use client";

import type { ReactNode } from "react";
import { Magnetic } from "./Magnetic";
import { play } from "@/lib/sound";

type Props = {
  href: string;
  children: ReactNode;
  variant?: "gold" | "outline" | "milk";
  external?: boolean;
  className?: string;
};

const styles = {
  gold: "bg-glow text-ink hover:bg-cream",
  milk: "bg-cream text-ink hover:bg-glow",
  outline: "border border-gold/50 text-gold hover:border-glow hover:text-glow",
};

/** Magnetic pill button used for every call to action. */
export function Button({ href, children, variant = "gold", external, className = "" }: Props) {
  return (
    <Magnetic>
      <a
        href={href}
        onClick={() => play("clink")}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className={`hud inline-block rounded-sm px-6 py-3 text-[15px] font-medium transition-colors ${styles[variant]} ${className}`}
      >
        {children}
      </a>
    </Magnetic>
  );
}
