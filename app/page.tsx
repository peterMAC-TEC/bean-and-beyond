import { Hero } from "@/components/Hero";
import { BeanStory } from "@/components/BeanStory";
import { Marble } from "@/components/Marble";
import { LineUp } from "@/components/LineUp";
import { FindUs } from "@/components/FindUs";
import { InstagramBand } from "@/components/InstagramBand";
import { Footer } from "@/components/Footer";
import { Buy } from "@/components/Buy";
import { DiwaliBand } from "@/components/DiwaliBand";

export default function Home() {
  return (
    <>
      <main>
        <Hero />
        <BeanStory />
        <Marble />
        <LineUp />
        <DiwaliBand />
        {/* The pack builder is the order panel (components/OrderDrawer.tsx). TODO (Phase 4): Bulk & corporate gifting form */}
        <FindUs />
        <InstagramBand />
        <Buy />
      </main>
      <Footer />
    </>
  );
}
