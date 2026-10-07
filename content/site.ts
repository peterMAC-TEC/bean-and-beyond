/**
 * ALL EDITABLE CONTENT FOR BEAN & BEYOND LIVES IN THIS FILE.
 * Flavours, prices, packs, stall dates, copy, promo codes, contact details.
 * Anything marked "TODO:" is a placeholder waiting for a real answer.
 */

export type Stall = {
  title: string;
  /** ISO date with the India offset, e.g. "2026-10-18T10:00:00+05:30" */
  start: string;
  /** Optional. If missing, the stall hides 6 hours after it starts. */
  end?: string;
  venue: string;
  mapsUrl: string;
};

export const site = {
  // ---------- Brand ----------
  brand: {
    name: "Bean & Beyond",
    tagline: "It's not what you think it is.",
    subline: "Looks like a nightcap. Works like a morning.",
    description:
      "Vietnamese-style coffee in vintage flask bottles. 180 ml of black coffee, 30 ml of condensed milk, 0% alcohol. Bengaluru.",
    established: 2026, // as printed on the real label (the brief said 2025)
    labelLine: "Hand-crafted · Batch No. 01", // small line under the name on the label
    alcoholLine: "0% ALCOHOL. 100% COFFEE.",
  },

  // ---------- Contact ----------
  contact: {
    phone: "+91 99725 69420",
    whatsapp: "919972569420", // digits only, used in wa.me links
    email: "adityapeter734@gmail.com",
    instagram: "beanandbeyond26",
    instagramUrl: "https://instagram.com/beanandbeyond26",
    city: "Bengaluru",
    fssai: "", // none yet; add the number here when you get one and it shows in the footer
  },

  // ---------- Flavours ----------
  // Each bottle: 180 ml black coffee + 30 ml condensed milk.
  // accent recolours the page, liquid is the coffee colour in the bottle.
  flavours: [
    {
      id: "classic",
      name: "Classic",
      price: 249,
      oneLiner: "The house special. Dark roast, bitter-sweet, no ID required.",
      accent: "#b8741f",
      liquid: "#2a160b",
      glass: "green",
    },
    {
      id: "vanilla",
      name: "Vanilla",
      price: 249,
      oneLiner: "Smooth, warm and suspiciously easy to finish. Still 0% alcohol.",
      accent: "#e8cf94",
      liquid: "#3d2614",
      glass: "green",
    },
    {
      id: "hazelnut",
      name: "Hazelnut",
      price: 249,
      oneLiner: "Toasted hazelnut over dark roast. Last call for sleepiness.",
      accent: "#b0653a",
      liquid: "#33190d",
      glass: "green",
    },
  ],

  // ---------- Packs ----------
  packs: [
    // (2026-10-07: packs retired. Any number of bottles at the single price; free delivery from delivery.freeFrom.)
  ],

  // ---------- Add-ons ----------
  // Only items with show: true appear. Ice and merch can be switched on later.
  addOns: [
    { id: "extra-milk", name: "Extra condensed milk", price: 50, show: true },
    { id: "ice", name: "Ice", price: 0, show: false }, // TODO: price when launched
    { id: "merch", name: "Merch", price: 0, show: false }, // TODO: items and prices
  ],

  // ---------- Serving instructions (TODO: confirm with owner) ----------
  serving: ["Chill", "Shake the bottle", "Pour in the condensed milk", "Cap and swirl", "Serve over ice"],
  servingNote: "TODO: confirm exact steps, shelf life and storage advice.",

  // ---------- Delivery ----------
  delivery: {
    area: "TODO: Bengaluru only, or all-India?",
    singleFee: "TODO: delivery fee for under 4 bottles",
    /** free delivery from this many bottles (any mix) */
    freeFrom: 4,
  },

  // ---------- Promo codes (live ones go in the database in Phase 4) ----------
  promoCodes: [] as { code: string; type: "percent" | "flat"; value: number; expires?: string; minOrder?: number }[],

  // ---------- Stalls and events ----------
  // Past stalls hide automatically. The countdown runs to the next one.
  // Example (copy, uncomment, edit):
  // { title: "Sunday Soul Sante", start: "2026-10-18T10:00:00+05:30", end: "2026-10-18T19:00:00+05:30",
  //   venue: "Jayamahal Palace, Bengaluru", mapsUrl: "https://maps.google.com/?q=Jayamahal+Palace" },
  stalls: [] as Stall[], // TODO: real dates and venues

  // ---------- Section copy ----------
  // Numbered sections, used by the top navigation and the progress bar.
  sections: [
    { id: "bottle", label: "The Bottle" },
    { id: "origin", label: "Origin" },
    { id: "ritual", label: "The Ritual" },
    { id: "lineup", label: "Line-up" },
    { id: "find-us", label: "Find us" },
    { id: "spotted", label: "Spotted" },
    { id: "buy", label: "Buy" },
  ],

  // Hero: the bottle turns as you scroll through these chapters.
  hero: {
    kicker: "Specifications",
    headline: "It's not what you think it is.",
    body: "Vintage flask. Silver cap. Looks like the top shelf. It's Vietnamese-style black coffee with a shot of condensed milk riding shotgun.",
    chapters: [
      { kicker: "01. The Bottle", title: "Looks like a nightcap.", text: "Works like a morning. 180 ml of black coffee, bottled in green glass." },
      { kicker: "02. The Label", title: "Read the fine print.", text: "We printed a warning on it. We meant every word." },
      { kicker: "03. The Proof", title: "Zero proof.", text: "No ID, no hangover, no designated driver. Just coffee." },
    ],
    // spec sheet: label, value. Keep to facts.
    specs: [
      ["Volume", "180 ml"],
      ["Milk shot", "30 ml"],
      ["Alcohol", "0%"],
      ["Batch", "No. 01"],
      ["Bottled in", "Bengaluru"],
      ["Price", "₹249"],
    ],
  },

  // The scroll story (the 3D bottle). "at" is where each chapter starts (0 = top, 1 = end).
  // "extra" adds a panel: specs | warning | proof | milk | cta
  story: [
    { at: 0, section: "bottle", kicker: "01. The Bottle", title: "It's not what you think it is.", text: "Vintage flask. Silver cap. Looks like the top shelf. It's Vietnamese-style black coffee.", extra: "specs" },
    { at: 0.12, section: "bottle", kicker: "02. The Label", title: "Read the fine print.", text: "We printed a warning on it. We meant every word.", extra: "warning" },
    { at: 0.25, section: "bottle", kicker: "03. The Proof", title: "Zero proof.", text: "No ID, no hangover, no designated driver. Just coffee.", extra: "proof" },
    { at: 0.36, section: "ritual", kicker: "04. Shake", title: "Wake it up.", text: "Give the bottle a good shake. It's been waiting for you.", extra: "" },
    { at: 0.46, section: "ritual", kicker: "05. Pour", title: "In goes the milk.", text: "The 30 ml shot of condensed milk sinks straight to the bottom.", extra: "milk" },
    { at: 0.72, section: "ritual", kicker: "06. Swirl", title: "Cap it. Swirl it.", text: "Watch black coffee turn Vietnamese.", extra: "" },
    { at: 0.88, section: "ritual", kicker: "07. Sip", title: "Serve over ice.", text: "Neat or with milk. Never shaken by guilt.", extra: "cta" },
  ],

  // "From bean to bottle" (the exploding-bean section). "at" = where each line appears (0..1 of the section).
  origin: [
    { at: 0, kicker: "01. One bean", title: "It starts with one bean.", text: "Roasted dark, oily and crackling with it. Drag to turn it." },
    { at: 0.13, kicker: "02. Crushed", title: "Then we crush it.", text: "All that flavour, locked in a shell. Not for long." },
    { at: 0.27, kicker: "03. Released", title: "Released.", text: "A slow-motion storm of fresh grounds. Move through it." },
    { at: 0.44, kicker: "04. Brewed", title: "Water meets grounds.", text: "Cold water falls through and takes everything the grounds have." },
    { at: 0.62, kicker: "05. Becoming coffee", title: "Black. Glossy. Ready.", text: "The grounds give up. What's left is pure coffee." },
    { at: 0.8, kicker: "06. Bottled", title: "Bottled with a straight face.", text: "180 ml, into green glass, capped. Drag the bottle and watch it slosh." },
  ],

  ritual: {
    kicker: "02. The Ritual",
    title: "Shake. Pour. Swirl. Sip.",
    steps: [
      { word: "Shake", text: "Wake the coffee up. It's been waiting for you." },
      { word: "Pour", text: "In goes the 30 ml shot of condensed milk." },
      { word: "Swirl", text: "Cap it, swirl it, watch it turn Vietnamese." },
      { word: "Sip", text: "Over ice. Neat or with milk, never shaken by guilt." },
    ],
  },

  lineup: {
    kicker: "03. The Line-up",
    title: "Pick your pour.",
    tags: ["House special", "Smooth operator", "Last call"], // one per flavour, in order
  },

  // The last section on the page: buy a bottle.
  buy: {
    kicker: "07. Yours",
    title: "Take one home.",
    text: "180 ml of black coffee and a 30 ml shot of condensed milk, in green glass. Pick a flavour, pour it yourself.",
  },

  findUs: {
    kicker: "04. Find the bar",
    title: "Where we're pouring next.",
    empty: "The next stall is being chalked up. Follow us on Instagram to hear it first.",
  },

  spotted: {
    kicker: "05. Spotted",
    title: "In the wild.",
  },


  // ---------- Parody warning on the label ----------
  warning: {
    // worded exactly as on the printed label
    heading: "WARNING:",
    lines: [
      "(1) Consuming this causes extreme alertness,",
      "sudden bursts of productivity, and an urge",
      "to conquer the day.",
      "(2) Contains 0% alcohol. 100% pure focus.",
    ],
  },
};

export type Flavour = (typeof site.flavours)[number];
