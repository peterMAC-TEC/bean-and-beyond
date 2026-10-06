import type { Metadata } from "next";
import { UnboxStage } from "@/components/UnboxStage";

export const metadata: Metadata = {
  title: "Diwali gift hampers in 3D · Bean & Beyond",
  description: "Open a Bean & Beyond Diwali hamper in 3D: the Kulhad Coffee Sampler (₹700), the Festive Mug Duo (₹850) and the Premium Brew Hamper (₹1,000).",
};

export default function UnboxPage() {
  return <UnboxStage />;
}
