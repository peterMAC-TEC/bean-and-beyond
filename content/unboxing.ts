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
  // corporate gifts (from the supplier pack, digitalized in gift-box-builder/): product photos on white
  g_tempBottle: { src: "/unboxing/gifts/RC-101.jpg", ar: 1 },
  g_bambooFlask: { src: "/unboxing/gifts/RC-107.jpg", ar: 1 },
  g_vacuumFlask: { src: "/unboxing/gifts/RC-113.jpg", ar: 1 },
  g_corkDiary: { src: "/unboxing/gifts/RC-018.jpg", ar: 1 },
  g_juteDiary: { src: "/unboxing/gifts/RC-019.jpg", ar: 1 },
  g_planner: { src: "/unboxing/gifts/CX-04.jpg", ar: 1 },
  g_notebook: { src: "/unboxing/gifts/CX-03.jpg", ar: 1 },
  g_woodCalendar: { src: "/unboxing/gifts/CX-11.jpg", ar: 1 },
  g_wallet: { src: "/unboxing/gifts/RC-142.jpg", ar: 1 },
};

/** product shots on white, shown whole in the details card (the others are crops of the styled box photos) */
export const STUDIO_PHOTOS = new Set(["p_press", "p_travel", "p_mugRed", "p_coffeeArtisan", "p_coffeeFestive", "p_pouchPremium", "p_card700", "p_choc", "p_mithai", "g_tempBottle", "g_bambooFlask", "g_vacuumFlask", "g_corkDiary", "g_juteDiary", "g_planner", "g_notebook", "g_woodCalendar", "g_wallet"]);

export interface UnboxItem {
  name: string;
  photo: string;
  desc: string;
  facts: string[];
  /** size in the scene (longest side, scene units) */
  size: number;
  /** resting turn, radians */
  rot: number;
  /** price on its own, in rupees (kept for orders; never shown in the Build-your-own box) */
  price?: number;
  /** a 3D model file (glTF) instead of a model built in code: the corporate gifts */
  model?: string;
}

export const UNBOX_ITEMS: Record<string, UnboxItem> = {
  kulhadTeal: { name: "Rice Husk Kulhad, Brown", photo: "p_kulhadTeal", desc: "A fluted kulhad made from rice husk, with the husk's natural flecks showing through a warm brown finish. Sized for cutting chai or a short black coffee.", facts: ["Rice husk", "Fluted kulhad shape", "Pairs with the white cup"], size: 0.85, rot: 0 },
  kulhadLav: { name: "Rice Husk Kulhad, White", photo: "p_kulhadLav", desc: "The white half of the pair: the same fluted rice husk kulhad, flecked with husk.", facts: ["Rice husk", "Fluted kulhad shape", "Pairs with the brown cup"], size: 0.85, rot: 0 },
  coffeeArtisan: { name: "Artisan Coffee", photo: "p_coffeeArtisan", desc: "Small-batch ground coffee in our kraft stand-up bag, with a rich aroma and a smooth finish.", facts: ["100% Arabica", "Ground", "50 g bag"], size: 1.0, rot: 0 },
  diya: { name: "Hand-painted Terracotta Diya", photo: "p_diya", desc: "A clay diya painted sindoor red with gold leaf work. Light it on Diwali night.", facts: ["Terracotta", "Hand-painted", "Gold detailing"], size: 0.95, rot: -0.5 },
  card700: { name: "Thank You Card", photo: "p_card700", desc: "Our thank-you card: “Thank you, and a very happy Diwali.” Ivory, with gold mandala corners.", facts: ["Printed card", "Gold mandala corners"], size: 0.95, rot: 0 },
  mugCharcoal: { name: "Rice Husk Mug, Black", photo: "p_mugCharcoal", desc: "A mug made from rice husk, matte black with the husk's natural flecks, and a matching lid that keeps coffee warm while you sit with family.", facts: ["Rice husk", "Matching lid", "Pairs with the white mug"], size: 0.95, rot: -0.45 },
  mugCream: { name: "Rice Husk Mug, White", photo: "p_mugCream", desc: "The white half of the mug duo: the same rice husk mug, flecked with husk, with its matching lid.", facts: ["Rice husk", "Matching lid", "Pairs with the black mug"], size: 0.95, rot: -0.45 },
  coffeeFestive: { name: "Festive Blend Coffee", photo: "p_coffeeFestive", desc: "Our Diwali-edition blend, ground and packed in the kraft stand-up bag.", facts: ["Ground", "50 g bag"], size: 1.0, rot: 0 },
  choc: { name: "Chocolate Box", photo: "p_choc", desc: "A box of fine chocolates in our dark, gold-framed box with a maroon ribbon.", facts: ["Chocolates", "Gift box"], size: 0.85, rot: 0 },
  card800: { name: "A Brighter Tomorrow Card", photo: "p_card800", desc: "A Happy Diwali card with gold mandala corners and room for your wishes.", facts: ["Printed greeting card", "Mandala artwork"], size: 0.95, rot: 0 },
  press: { name: "French Press", photo: "p_press", desc: "A borosilicate glass carafe with a 4-part stainless steel filter. Brews café-style coffee at home.", facts: ["600 ml", "14 × 19 cm", "4-part steel filter"], size: 1.35, rot: -0.5 },
  mugBlack: { name: "Brew Something Bright Mug", photo: "p_mugBlack", desc: "A matte black mug with gold lettering, made for the first cup of Diwali morning.", facts: ["Matte black", "Gold lettering"], size: 0.95, rot: -0.3 },
  pouchPremium: { name: "Premium Coffee Blend", photo: "p_pouchPremium", desc: "Premium ground coffee in our black-label kraft bag, for a slow Diwali morning brew.", facts: ["Ground coffee", "Kraft stand-up bag"], size: 1.0, rot: 0 },
  mithai: { name: "Premium Sweet Box", photo: "p_mithai", desc: "A box of premium Indian sweets in a maroon box with a gold jaali pattern, for the Diwali table.", facts: ["Mithai", "Gift box"], size: 1.0, rot: 0 },
  nuts: { name: "Dry Fruits Jar", photo: "p_nuts", desc: "A glass jar packed with roasted cashews and whole almonds, under a gold lid tied with jute.", facts: ["Glass jar", "Cashews and almonds", "Gold lid"], size: 0.8, rot: 0 },
  guide: { name: "Your Diwali Brew Guide", photo: "p_guide", desc: "A step-by-step card for brewing your first French press coffee.", facts: ["Brew guide card", "4 simple steps"], size: 0.95, rot: 0 },
  travel: { name: "Insulated Thermos", photo: "p_travel", desc: "A black insulated thermos with a push-button flip lid that seals tight, so the coffee stays hot on the go.", facts: ["Insulated", "Push-button flip lid", "Leak-proof seal"], size: 1.1, rot: 0.35 },
  mugRed: { name: "Speckled Mug, Coffee Brown", photo: "p_mugRed", desc: "A matte speckled stoneware mug in a deep coffee brown.", facts: ["Matte speckled finish", "Stoneware look"], size: 0.95, rot: -0.45 },
};

/** corporate gifts for the Build-your-own box: chosen from the supplier's 267 products for how faithfully they
 * come out in 3D (round drinkware shot straight on, flat desk pieces); models from gift-box-builder/ */
export const GIFT_ITEMS: Record<string, UnboxItem> = {
  tempBottle: { name: "Temperature Display Bottle", photo: "g_tempBottle", desc: "An insulated bottle whose lid shows the temperature of what's inside.", facts: ["Insulated","Temperature on the lid","About 250 mm tall"], size: 1.30, rot: 0, model: "/unboxing/gifts/RC-101.glb" },
  bambooFlask: { name: "Bamboo Flask Bottle", photo: "g_bambooFlask", desc: "An insulated flask with a bamboo finish and a steel cap.", facts: ["Insulated","Bamboo finish","About 250 mm tall"], size: 1.30, rot: 0, model: "/unboxing/gifts/RC-107.glb" },
  vacuumFlask: { name: "Vacuum Flask Bottle", photo: "g_vacuumFlask", desc: "A slim vacuum flask in deep navy that keeps drinks hot or cold.", facts: ["Vacuum insulated","About 250 mm tall"], size: 1.30, rot: 0, model: "/unboxing/gifts/RC-113.glb" },
  corkDiary: { name: "Wood Finish Diary", photo: "g_corkDiary", desc: "A notebook with a wood-finish cover. A5 size.", facts: ["Wood / cork cover","A5"], size: 1.19, rot: 0, model: "/unboxing/gifts/RC-018.glb" },
  juteDiary: { name: "Jute Diary", photo: "g_juteDiary", desc: "A jute-covered diary with a leather-look spine and strap.", facts: ["Jute cover","Strap closure","A5"], size: 1.19, rot: 0, model: "/unboxing/gifts/RC-019.glb" },
  planner: { name: "Office Planner", photo: "g_planner", desc: "A black leather-look planner with a snap closure.", facts: ["Leather-look cover","Snap closure","A5"], size: 1.19, rot: 0, model: "/unboxing/gifts/CX-04.glb" },
  notebook: { name: "Office Notebook", photo: "g_notebook", desc: "A black hardbound notebook with an elastic band.", facts: ["Hardbound","Elastic band","A5"], size: 1.19, rot: 0, model: "/unboxing/gifts/CX-03.glb" },
  woodCalendar: { name: "Wooden Desk Calendar", photo: "g_woodCalendar", desc: "A perpetual desk calendar of wooden blocks: turn them to set the day and the month.", facts: ["Wooden blocks","Perpetual"], size: 1.02, rot: 0, model: "/unboxing/gifts/CX-11.glb" },
  wallet: { name: "Leather Wallet", photo: "g_wallet", desc: "A brown leather-look wallet for him.", facts: ["Leather-look","Bi-fold"], size: 0.91, rot: 0, model: "/unboxing/gifts/RC-142.glb" },
};
Object.assign(UNBOX_ITEMS, GIFT_ITEMS);

export interface UnboxBox {
  id: string;
  name: string;
  price: string;
  style: "kraft" | "noir";
  items: string[];
}

export const UNBOX_BOXES: UnboxBox[] = [
  // cheapest first; Build your own always last (user, 2026-10-07)
  { id: "kulhad", name: "Kulhad Coffee Box", price: "₹700", style: "kraft", items: ["kulhadTeal", "kulhadLav", "coffeeArtisan", "diya", "card700"] },
  { id: "mugs", name: "Festive Mug Duo", price: "₹850", style: "kraft", items: ["mugCharcoal", "mugCream", "coffeeFestive", "choc", "diya", "card700"] },
  // the Premium Brew Hamper without the mug, and a thermos in place of the French press (user, 2026-10-07; name to confirm)
  { id: "brew", name: "Brew Hamper", price: "₹900", style: "noir", items: ["travel", "pouchPremium", "mithai", "nuts", "card700", "diya"] },
  { id: "premium", name: "Premium Brew Hamper", price: "₹1,000", style: "noir", items: ["press", "mugBlack", "pouchPremium", "mithai", "nuts", "card700", "diya"] },
  // filled by the visitor from BUILD_ITEMS (components/Unboxing3D.tsx)
  { id: "build", name: "Build your own", price: "", style: "noir", items: [] },
];

/** every piece a visitor can put in a box of their own; set each one's price in UNBOX_ITEMS */
export const BUILD_ITEMS = [
  "press", "travel", "mugRed", "mugBlack", "mugCharcoal", "mugCream", "kulhadTeal", "kulhadLav",
  "coffeeArtisan", "coffeeFestive", "pouchPremium", "choc", "mithai", "nuts", "diya", "card700",
  ...Object.keys(GIFT_ITEMS),
];
/** the Build-your-own picker shows the pieces in these two groups */
export const BUILD_GROUPS: { label: string; items: string[] }[] = [
  { label: "Coffee & festive", items: BUILD_ITEMS.filter((k) => !(k in GIFT_ITEMS)) },
  { label: "Corporate gifts", items: Object.keys(GIFT_ITEMS) },
];
export const BUILD_MAX_PIECES = 9;
/** the store spec: nothing on the site costs more than ₹1,000 */
export const BUILD_BUDGET = 1000;
