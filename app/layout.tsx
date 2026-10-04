import type { Metadata } from "next";
import { Playfair_Display, Barlow_Condensed, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { site } from "@/content/site";
import { Loader } from "@/components/Loader";
import { Cursor } from "@/components/Cursor";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Hud } from "@/components/Hud";

// Vintage serif from the label: the brand name and italic accents
const display = Playfair_Display({ variable: "--font-display", subsets: ["latin"], style: ["normal", "italic"] });

// Thin condensed sans: headings, specs, body ("spec sheet" voice)
const hud = Barlow_Condensed({ variable: "--font-hud", subsets: ["latin"], weight: ["200", "300", "400", "500", "600"] });

// Monospace micro labels: section numbers, timecode, readouts
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400"] });

export const metadata: Metadata = {
  title: `${site.brand.name}: ${site.brand.tagline}`,
  description: site.brand.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${hud.variable} ${mono.variable} antialiased`}>
      <body>
        <noscript>
          <style>{`#bb-loader{display:none}`}</style>
        </noscript>
        <Loader />
        <SmoothScroll />
        <Cursor />
        <Hud />
        <div aria-hidden className="bb-vignette" />
        <div aria-hidden className="bb-grain" />
        {children}
      </body>
    </html>
  );
}
