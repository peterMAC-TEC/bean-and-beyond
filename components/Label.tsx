import { useId } from "react";
import { site } from "@/content/site";

const INK = "#15110d"; // label background
const PARCH = "#e9d6ac"; // parchment panels
const SEPIA = "#5a3d22"; // engraving lines
const BAND = "#4a2420"; // maroon band behind the oval
const RED = "#c42b1c"; // WARNING heading

/** Engraved coffee bean, sepia on parchment, centred on (0,0). */
function Bean({ x, y, r = 0, s = 1, gid }: { x: number; y: number; r?: number; s?: number; gid: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <ellipse rx="15" ry="21" fill="#c9a46b" stroke={SEPIA} strokeWidth="1.6" />
      <ellipse rx="15" ry="21" fill={`url(#${gid}-bean)`} />
      <path d="M0 -20 C-7 -8 7 8 0 20" fill="none" stroke="#3a2412" strokeWidth="2" />
      <path d="M-10 -9 q3 1 4 4 M-11 1 q3 0 4 3 M10 -5 q-3 1 -4 4 M10 5 q-3 0 -4 3" fill="none" stroke={SEPIA} strokeWidth="0.7" />
    </g>
  );
}

function Leaf({ x, y, r = 0, s = 1 }: { x: number; y: number; r?: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <path d="M0 0 C16 -16 44 -14 62 0 C44 14 16 16 0 0Z" fill="#b8925a" stroke={SEPIA} strokeWidth="1.4" />
      <path d="M2 0 L58 0" stroke={SEPIA} strokeWidth="1" />
      <path d="M14 0 L24 -8 M14 0 L24 8 M28 0 L38 -7 M28 0 L38 7 M42 0 L50 -5 M42 0 L50 5" stroke={SEPIA} strokeWidth="0.7" />
    </g>
  );
}

/** Ornate frame with notched corners, like the printed label. */
function frame(i: number) {
  const L = 14 + i;
  const T = 14 + i;
  const R = 386 - i;
  const B = 546 - i;
  const n = 22 - i * 0.6; // notch size
  return `M${L + n} ${T} H${R - n} Q${R - n} ${T + n} ${R} ${T + n} V${B - n} Q${R - n} ${B - n} ${R - n} ${B} H${L + n} Q${L + n} ${B - n} ${L} ${B - n} V${T + n} Q${L + n} ${T + n} ${L + n} ${T} Z`;
}

/**
 * The Bean & Beyond label, rebuilt from the real printed label as SVG so it
 * can animate. Parts have classes (label-border, label-title, label-crest,
 * label-art, label-warning) for GSAP.
 */
export function Label({ className = "" }: { className?: string }) {
  const { name, established } = site.brand;
  const { heading, lines } = site.warning;
  const id = useId().replace(/:/g, "");
  const gold = `url(#${id}-gold)`;
  return (
    <svg
      viewBox="0 0 400 560"
      className={className}
      role="img"
      aria-label={`${name} label: hand-crafted coffee, est. ${established}. Contains 0% alcohol.`}
    >
      <defs>
        {/* gold foil: a bright band sweeps across every few seconds */}
        <linearGradient id={`${id}-gold`} gradientUnits="userSpaceOnUse" x1="-400" y1="0" x2="400" y2="560" spreadMethod="reflect">
          <stop offset="0" stopColor="#8a6a2e" />
          <stop offset="0.35" stopColor="#d9bd84" />
          <stop offset="0.48" stopColor="#fff3cf" />
          <stop offset="0.56" stopColor="#e2c27e" />
          <stop offset="1" stopColor="#9c7a3a" />
          <animateTransform attributeName="gradientTransform" type="translate" values="-400 0; 400 0; 400 0" keyTimes="0; 0.55; 1" dur="5s" repeatCount="indefinite" />
        </linearGradient>
        <radialGradient id={`${id}-bean`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#3a2412" stopOpacity="0.35" />
        </radialGradient>
        <radialGradient id={`${id}-oval`} cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#f2e2bd" />
          <stop offset="1" stopColor="#c9a874" />
        </radialGradient>
        <linearGradient id={`${id}-age`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.25" />
        </linearGradient>
      </defs>

      {/* label paper, cut to the notched shape */}
      <path d={frame(-8)} fill={INK} />

      <g className="label-border" fill="none" stroke={gold}>
        <path d={frame(0)} strokeWidth="2.5" />
        <path d={frame(6)} strokeWidth="0.8" />
      </g>

      {/* crest with crown and flourishes */}
      <g className="label-crest">
        <path d="M110 54 c20 -14 42 -14 58 -2 M290 54 c-20 -14 -42 -14 -58 -2 M118 62 c14 6 30 4 44 -6 M282 62 c-14 6 -30 4 -44 -6" fill="none" stroke={gold} strokeWidth="1.3" />
        <circle cx="200" cy="52" r="24" fill={INK} stroke={gold} strokeWidth="1.8" />
        <circle cx="200" cy="52" r="20" fill="none" stroke={gold} strokeWidth="0.6" />
        <path d="M191 38 l3 5 l6 -6 l6 6 l3 -5 l-1 8 h-16z" fill={gold} />
        <text x="200" y="56" textAnchor="middle" fontSize="8" fill={gold} letterSpacing="1" fontFamily="var(--font-display), serif">ESTD</text>
        <text x="200" y="66" textAnchor="middle" fontSize="9" fill={gold} fontFamily="var(--font-display), serif">{established}</text>
      </g>

      {/* title */}
      <g className="label-title" textAnchor="middle" fontFamily="var(--font-display), serif" fill={gold}>
        <text x="200" y="138" fontSize="48" letterSpacing="1" textLength="300" lengthAdjust="spacingAndGlyphs">
          BEAN &amp; BEYOND
        </text>
        <path d="M60 156 H186 M214 156 H340" stroke={gold} strokeWidth="1" />
        <path d="M193 156 l7 -5 l7 5 l-7 5z" fill={gold} />
        <text x="200" y="176" fontSize="9.5" letterSpacing="1.2" fontFamily="var(--font-display), serif">
          {site.brand.labelLine.toUpperCase()}
        </text>
      </g>

      {/* maroon band, parchment oval and the engraving */}
      <g className="label-art">
        <rect x="22" y="250" width="356" height="62" fill={BAND} />
        <rect x="22" y="250" width="356" height="62" fill={`url(#${id}-age)`} />
        <line x1="22" x2="378" y1="253" y2="253" stroke={gold} strokeOpacity="0.5" />
        <line x1="22" x2="378" y1="309" y2="309" stroke={gold} strokeOpacity="0.5" />
        <ellipse cx="200" cy="282" rx="112" ry="84" fill={INK} stroke={gold} strokeWidth="2" />
        <ellipse cx="200" cy="282" rx="104" ry="76" fill={`url(#${id}-oval)`} stroke={SEPIA} strokeWidth="1" />
        <Leaf x={112} y={300} r={-30} s={0.9} />
        <Leaf x={288} y={300} r={210} s={0.9} />
        <Leaf x={150} y={238} r={-62} s={0.85} />
        <Leaf x={250} y={238} r={242} s={0.85} />
        <Leaf x={200} y={232} r={-90} s={0.7} />
        {[188, 200, 212, 194, 206].map((cx, i) => (
          <circle key={i} cx={cx} cy={i < 3 ? 222 : 212} r="5" fill="#a9824c" stroke={SEPIA} strokeWidth="1" />
        ))}
        <Bean x={200} y={284} r={-18} s={1.25} gid={id} />
        <Bean x={166} y={306} r={24} s={1.05} gid={id} />
        <Bean x={236} y={308} r={-30} s={1.05} gid={id} />
      </g>

      {/* warning box */}
      <g className="label-warning">
        <rect x="44" y="384" width="312" height="116" rx="2" fill={PARCH} stroke={gold} strokeWidth="1.5" />
        <rect x="44" y="384" width="312" height="116" rx="2" fill={`url(#${id}-age)`} />
        <text x="200" y="408" textAnchor="middle" fontSize="15" fontWeight="800" fill={RED} fontFamily="var(--font-body), sans-serif">
          {heading}
        </text>
        {lines.map((line, i) => (
          <text key={line} x="58" y={428 + i * 15} fontSize="10.5" fill="#2a1d12" fontFamily="var(--font-body), sans-serif">
            {line}
          </text>
        ))}
      </g>

      {/* star medallion */}
      <g>
        <path d="M150 526 H186 M214 526 H250" stroke={gold} strokeWidth="1" />
        <circle cx="200" cy="526" r="10" fill={INK} stroke={gold} strokeWidth="1.2" />
        <path d="M200 519 l2 5 h5 l-4 3 l2 5 l-5 -3 l-5 3 l2 -5 l-4 -3 h5z" fill={gold} />
      </g>
    </svg>
  );
}
