/**
 * THE DIWALI HAMPERS IN 3D (the /unbox page).
 * Box prices, names and every item's copy live here. Photos are in public/unboxing/.
 * Festive Mug Duo is ₹850 (confirmed 2026-10-07).
 */

/** image key → path and aspect ratio (width / height); from public/unboxing/manifest.json */
export const UNBOX_IMAGES: Record<string, { src: string; ar: number }> = {
  p_kulhadTeal: { src: "/unboxing/p_kulhadTeal.jpg", ar: 0.871 },
  p_kulhadLav: { src: "/unboxing/p_kulhadLav.jpg", ar: 0.9032 },
  p_coffeeArtisan: { src: "/unboxing/p_coffeeArtisan.jpg", ar: 0.7619 },
  p_diya: { src: "/unboxing/p_diya.jpg", ar: 0.9516 },
  p_card700: { src: "/unboxing/p_card700.jpg", ar: 1.488 },
  p_mugCharcoal: { src: "/unboxing/p_mugCharcoal.jpg", ar: 1.0294 },
  p_mugCream: { src: "/unboxing/p_mugCream.jpg", ar: 1.0455 },
  p_coffeeFestive: { src: "/unboxing/p_coffeeFestive.jpg", ar: 0.7619 },
  p_choc: { src: "/unboxing/p_choc.jpg", ar: 0.9825 },
  p_card800: { src: "/unboxing/p_card800.jpg", ar: 1.2206 },
  p_press: { src: "/unboxing/p_press.jpg", ar: 0.698 },
  p_pressKnob: { src: "/unboxing/p_pressKnob.jpg", ar: 0.7598 },
  p_mugBlack: { src: "/unboxing/p_mugBlack.jpg", ar: 1.2247 },
  p_pouchPremium: { src: "/unboxing/p_pouchPremium.jpg", ar: 0.7619 },
  p_mithai: { src: "/unboxing/p_mithai.jpg", ar: 0.7314 },
  p_nuts: { src: "/unboxing/p_nuts.jpg", ar: 1.3333 },
  p_guide: { src: "/unboxing/p_guide.jpg", ar: 1.0481 },
  p_travel: { src: "/unboxing/p_travel.jpg", ar: 0.4894 },
  p_mugRed: { src: "/unboxing/p_mugRed.jpg", ar: 0.8432 },
  t_pouchArtisan: { src: "/unboxing/t_pouchArtisan.jpg", ar: 0.7619 },
  t_pouchFestive: { src: "/unboxing/t_pouchFestive.jpg", ar: 0.7619 },
  t_choc: { src: "/unboxing/t_choc.jpg", ar: 0.9825 },
  t_card700: { src: "/unboxing/t_card700.jpg", ar: 1.488 },
  t_card800: { src: "/unboxing/t_card800.jpg", ar: 1.2188 },
  t_pouchPremium: { src: "/unboxing/t_pouchPremium.jpg", ar: 0.7619 },
  t_mithai: { src: "/unboxing/t_mithai.jpg", ar: 0.7314 },
  t_guide: { src: "/unboxing/t_guide.jpg", ar: 1.0326 },
};

/** product shots on white, shown whole in the details card (the others are crops of the styled box photos) */
export const STUDIO_PHOTOS = new Set(["p_press", "p_pressKnob", "p_travel", "p_mugRed", "p_coffeeArtisan", "p_coffeeFestive", "p_pouchPremium", "p_card700", "p_choc", "p_mithai"]);

export interface UnboxItem {
  name: string;
  photo: string;
  desc: string;
  facts: string[];
  /** size in the scene (longest side, scene units) */
  size: number;
  /** resting turn, radians */
  rot: number;
}

export const UNBOX_ITEMS: Record<string, UnboxItem> = {
  kulhadTeal: { name: "Rice Husk Kulhad, Teal", photo: "p_kulhadTeal", desc: "A fluted kulhad made from rice husk, with the husk's natural flecks showing through a soft teal finish. Sized for cutting chai or a short black coffee.", facts: ["Rice husk", "Fluted kulhad shape", "Pairs with the lavender cup"], size: 0.85, rot: 0 },
  kulhadLav: { name: "Rice Husk Kulhad, Lavender", photo: "p_kulhadLav", desc: "The lavender half of the pair: the same fluted rice husk kulhad, flecked with husk.", facts: ["Rice husk", "Fluted kulhad shape", "Pairs with the teal cup"], size: 0.85, rot: 0 },
  coffeeArtisan: { name: "Artisan Coffee", photo: "p_coffeeArtisan", desc: "Small-batch ground coffee in our kraft stand-up bag, with a rich aroma and a smooth finish.", facts: ["100% Arabica", "Ground", "50 g bag"], size: 1.0, rot: 0 },
  diya: { name: "Hand-painted Terracotta Diya", photo: "p_diya", desc: "A clay diya painted sindoor red with gold leaf work. Light it on Diwali night.", facts: ["Terracotta", "Hand-painted", "Gold detailing"], size: 0.95, rot: -0.5 },
  card700: { name: "Thank You Card", photo: "p_card700", desc: "Our thank-you card: “Thank you, and a very happy Diwali.” Ivory, with gold mandala corners.", facts: ["Printed card", "Gold mandala corners"], size: 0.95, rot: 0 },
  mugCharcoal: { name: "Lidded Speckled Mug, Charcoal", photo: "p_mugCharcoal", desc: "A speckled ceramic mug with a matching lid that keeps coffee warm while you sit with family.", facts: ["Ceramic", "Matching lid", "Pairs with the cream mug"], size: 0.95, rot: -0.45 },
  mugCream: { name: "Lidded Speckled Mug, Cream", photo: "p_mugCream", desc: "The cream half of the mug duo, with the same textured glaze and matching lid.", facts: ["Ceramic", "Matching lid", "Pairs with the charcoal mug"], size: 0.95, rot: -0.45 },
  coffeeFestive: { name: "Festive Blend Coffee", photo: "p_coffeeFestive", desc: "Our Diwali-edition blend, ground and packed in the kraft stand-up bag.", facts: ["Ground", "50 g bag"], size: 1.0, rot: 0 },
  choc: { name: "Chocolate Box", photo: "p_choc", desc: "A box of fine chocolates in our dark, gold-framed box with a maroon ribbon.", facts: ["Chocolates", "Gift box"], size: 0.85, rot: 0 },
  card800: { name: "A Brighter Tomorrow Card", photo: "p_card800", desc: "A Happy Diwali card with gold mandala corners and room for your wishes.", facts: ["Printed greeting card", "Mandala artwork"], size: 0.95, rot: 0 },
  press: { name: "AGARO French Press", photo: "p_press", desc: "A borosilicate glass carafe with a 4-part stainless steel filter. Brews café-style coffee at home.", facts: ["600 ml", "14 × 19 cm", "4-part steel filter"], size: 1.35, rot: -0.5 },
  pressKnob: { name: "AGARO French Press, Ball Knob", photo: "p_pressKnob", desc: "The same 600 ml AGARO press in a black sleeve with two oval windows onto the brew, topped with a ball knob.", facts: ["600 ml", "Ball knob", "Windowed sleeve"], size: 1.35, rot: -0.5 },
  mugBlack: { name: "Brew Something Bright Mug", photo: "p_mugBlack", desc: "A matte black mug with gold lettering, made for the first cup of Diwali morning.", facts: ["Matte black", "Gold lettering"], size: 0.95, rot: -0.3 },
  pouchPremium: { name: "Premium Coffee Blend", photo: "p_pouchPremium", desc: "Premium ground coffee in our black-label kraft bag, made to brew in the French press.", facts: ["Ground coffee", "Kraft stand-up bag"], size: 1.0, rot: 0 },
  mithai: { name: "Premium Sweet Box", photo: "p_mithai", desc: "A box of premium Indian sweets in a maroon box with a gold jaali pattern, for the Diwali table.", facts: ["Mithai", "Gift box"], size: 1.0, rot: 0 },
  nuts: { name: "Roasted Nuts Jar", photo: "p_nuts", desc: "A glass jar of roasted cashews and almonds with a gold lid.", facts: ["Glass jar", "Cashews and almonds"], size: 0.8, rot: 0 },
  guide: { name: "Your Diwali Brew Guide", photo: "p_guide", desc: "A step-by-step card for brewing your first French press coffee.", facts: ["Brew guide card", "4 simple steps"], size: 0.95, rot: 0 },
  travel: { name: "Borosil Insulated Travel Mug", photo: "p_travel", desc: "A black insulated mug with a push-button flip lid that seals tight for the commute.", facts: ["Insulated", "Push-button flip lid", "Leak-proof seal"], size: 1.1, rot: 0.35 },
  mugRed: { name: "Speckled Mug, Sindoor Red", photo: "p_mugRed", desc: "A matte speckled stoneware mug in a deep festive red.", facts: ["Matte speckled finish", "Stoneware look"], size: 0.95, rot: -0.45 },
};

export interface UnboxBox {
  id: string;
  name: string;
  price: string;
  style: "kraft" | "noir";
  items: string[];
}

export const UNBOX_BOXES: UnboxBox[] = [
  { id: "kulhad", name: "Kulhad Coffee Sampler", price: "₹700", style: "kraft", items: ["kulhadTeal", "kulhadLav", "coffeeArtisan", "diya", "card700"] },
  { id: "mugs", name: "Festive Mug Duo", price: "₹850", style: "kraft", items: ["mugCharcoal", "mugCream", "coffeeFestive", "choc", "diya", "card700"] },
  { id: "premium", name: "Premium Brew Hamper", price: "₹1,000", style: "noir", items: ["press", "mugBlack", "pouchPremium", "mithai", "nuts", "card700", "diya"] },
  // the pieces sold on their own, to fill a box of your own (confirmed 2026-10-07)
  { id: "all", name: "Every Item", price: "Build your own", style: "noir", items: ["press", "pressKnob", "travel", "mugRed", "diya", "card700", "coffeeArtisan"] },
];
