import { Hero } from "@/components/Hero";
import { BeanStory } from "@/components/BeanStory";
import { Marble } from "@/components/Marble";
import { LineUp } from "@/components/LineUp";
import { FindUs } from "@/components/FindUs";
import { InstagramBand } from "@/components/InstagramBand";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <main>
        <Hero />
        <BeanStory />
        <Marble />
        <LineUp />
        {/* TODO (Phase 3): Build your crate (pack builder). (Phase 4): Bulk & corporate gifting form */}
        <FindUs />
        <InstagramBand />
      </main>
      <Footer />
    </>
  );
}
