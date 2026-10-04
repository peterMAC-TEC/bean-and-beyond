import { useId, type ReactNode, type SVGProps } from "react";

type Props = {
  /** 0 (empty) to 1 (full) */
  level?: number;
  liquid?: string;
  glass?: "clear" | "green";
  className?: string;
  /** Extra SVG drawn inside the glass, above the coffee (e.g. milk) */
  children?: ReactNode;
};

const FULL = 282; // how far the liquid travels from empty to full
export const BOTTLE_BODY =
  "M72 44 L72 96 C72 118 30 124 30 156 L30 384 Q30 402 48 402 L152 402 Q170 402 170 384 L170 156 C170 124 128 118 128 96 L128 44 Z";

/**
 * The flask bottle, drawn to read like real glass: thick dark edges,
 * backlit coffee, specular highlights, a brushed-metal cap and a curved label.
 * Hooks for animation:
 *   .bb-slosh  rotates the liquid (sloshing)
 *   .bb-liquid translateY sets the fill level (level 0 = translateY 0, full = translateY -282px)
 */
export function Bottle({ level = 1, liquid = "#2a160b", glass = "green", className = "", children, ...rest }: Props & Omit<SVGProps<SVGSVGElement>, keyof Props>) {
  const id = useId().replace(/:/g, "");
  const green = glass === "green";
  const tint = green ? "60,125,80" : "235,240,240";
  const u = (name: string) => `url(#${name}-${id})`;
  return (
    <svg viewBox="0 0 200 420" className={className} {...rest} role="img" aria-label="Bean & Beyond coffee bottle, 0% alcohol">
      <defs>
        <clipPath id={`body-${id}`}>
          <path d={BOTTLE_BODY} />
        </clipPath>
        {/* glass is denser at the edges, thin in the middle */}
        <linearGradient id={`glass-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor={`rgb(${tint})`} stopOpacity={green ? 0.55 : 0.22} />
          <stop offset="0.1" stopColor={`rgb(${tint})`} stopOpacity={green ? 0.28 : 0.05} />
          <stop offset="0.5" stopColor={`rgb(${tint})`} stopOpacity={green ? 0.22 : 0.03} />
          <stop offset="0.9" stopColor={`rgb(${tint})`} stopOpacity={green ? 0.3 : 0.06} />
          <stop offset="1" stopColor={`rgb(${tint})`} stopOpacity={green ? 0.6 : 0.25} />
        </linearGradient>
        {/* coffee: darker at the edges, glowing amber where light passes through */}
        <linearGradient id={`depth-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.7" />
          <stop offset="0.22" stopColor="#000" stopOpacity="0.15" />
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="0.85" stopColor="#000" stopOpacity="0.25" />
          <stop offset="1" stopColor="#000" stopOpacity="0.75" />
        </linearGradient>
        <radialGradient id={`glow-${id}`} cx="0.58" cy="0.3" r="0.55">
          <stop offset="0" stopColor="#d9862f" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#8a4a17" stopOpacity="0.25" />
          <stop offset="1" stopColor="#8a4a17" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`hl-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.25" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="0.75" stopColor="#fff" stopOpacity="0.6" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`cap-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#4d4d4d" />
          <stop offset="0.14" stopColor="#bdbdbd" />
          <stop offset="0.26" stopColor="#f7f7f7" />
          <stop offset="0.4" stopColor="#9c9c9c" />
          <stop offset="0.62" stopColor="#d0d0d0" />
          <stop offset="0.85" stopColor="#7a7a7a" />
          <stop offset="1" stopColor="#3d3d3d" />
        </linearGradient>
        <pattern id={`knurl-${id}`} width="3" height="40" patternUnits="userSpaceOnUse">
          <rect width="1.2" height="40" fill="#000" opacity="0.22" />
          <rect x="1.2" width="0.8" height="40" fill="#fff" opacity="0.18" />
        </pattern>
        {/* the label wraps round a curved surface */}
        <linearGradient id={`curve-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.38" />
          <stop offset="0.18" stopColor="#000" stopOpacity="0.06" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="0.8" stopColor="#000" stopOpacity="0.08" />
          <stop offset="1" stopColor="#000" stopOpacity="0.42" />
        </linearGradient>
        <filter id={`soft-${id}`} x="-50%" y="-10%" width="200%" height="120%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>

      {/* glass body */}
      <path d={BOTTLE_BODY} fill={u("glass")} />

      <g clipPath={u("body")}>
        <g className="bb-slosh" style={{ transformOrigin: "100px 260px" }}>
          <g className="bb-liquid" style={{ transform: `translateY(${-level * FULL}px)` }}>
            <path
              className="bb-wave bb-wave-back"
              d="M-100 402 q25 -6 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 V900 H-100 Z"
              fill={liquid}
              opacity="0.8"
            />
            <path
              className="bb-wave bb-wave-front"
              d="M-100 404 q25 6 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 V900 H-100 Z"
              fill={liquid}
              stroke="#e0a868"
              strokeOpacity="0.35"
              strokeWidth="1.4"
            />
            <rect x="0" y="404" width="200" height="320" fill={u("glow")} />
            <rect x="0" y="404" width="200" height="320" fill={u("depth")} />
            {/* a few clinging bubbles */}
            {[
              [44, 412, 1.6],
              [52, 418, 1],
              [150, 414, 1.3],
              [157, 422, 0.9],
            ].map(([cx, cy, r]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="none" stroke="#f1d6b0" strokeOpacity="0.45" strokeWidth="0.6" />
            ))}
          </g>
        </g>
        {children}
        {/* glass thickness: dark inner rim */}
        <path d={BOTTLE_BODY} fill="none" stroke="#000" strokeOpacity="0.45" strokeWidth="9" />
        <path d={BOTTLE_BODY} fill="none" stroke={`rgb(${tint})`} strokeOpacity="0.18" strokeWidth="3" />
        {/* thick glass base */}
        <path d="M30 388 Q30 402 48 402 L152 402 Q170 402 170 388 L170 394 Q100 384 30 394Z" fill={`rgb(${tint})`} opacity="0.16" />
      </g>

      {/* label, with a soft shadow where it meets the glass */}
      <rect x="45" y="197" width="110" height="125" rx="3" fill="#000" opacity="0.35" filter={u("soft")} />
      <g>
        {/* black label with gold lettering, like the printed one */}
        <rect x="46" y="196" width="108" height="124" rx="2" fill="#15110d" />
        <rect x="50" y="200" width="100" height="116" rx="1" fill="none" stroke="#dcc08a" strokeWidth="1" />
        <rect x="53" y="203" width="94" height="110" rx="1" fill="none" stroke="#dcc08a" strokeWidth="0.4" />
        <circle cx="100" cy="212" r="5" fill="none" stroke="#dcc08a" strokeWidth="0.6" />
        <text x="100" y="214" textAnchor="middle" fontSize="3" fill="#dcc08a" fontFamily="var(--font-display), serif">2026</text>
        <text x="100" y="236" textAnchor="middle" fontSize="13" fill="#dcc08a" fontFamily="var(--font-display), serif" textLength="86" lengthAdjust="spacingAndGlyphs">BEAN &amp; BEYOND</text>
        <line x1="60" x2="140" y1="241" y2="241" stroke="#dcc08a" strokeWidth="0.5" />
        <rect x="46" y="262" width="108" height="14" fill="#4a2420" />
        <ellipse cx="100" cy="269" rx="20" ry="15" fill="#15110d" stroke="#dcc08a" strokeWidth="0.7" />
        <ellipse cx="100" cy="269" rx="18" ry="13" fill="#d9bf8c" />
        <ellipse cx="96" cy="270" rx="4.5" ry="6.5" fill="#a07a45" stroke="#5a3d22" strokeWidth="0.6" transform="rotate(-18 96 270)" />
        <ellipse cx="105" cy="271" rx="4" ry="6" fill="#a07a45" stroke="#5a3d22" strokeWidth="0.6" transform="rotate(24 105 271)" />
        <rect x="58" y="290" width="84" height="20" fill="#e9d6ac" />
        <text x="100" y="298" textAnchor="middle" fontSize="5" fontWeight="800" fill="#c42b1c" fontFamily="var(--font-body), sans-serif">WARNING:</text>
        <text x="100" y="305.5" textAnchor="middle" fontSize="3.6" fill="#2a1d12" fontFamily="var(--font-body), sans-serif">Contains 0% alcohol. 100% pure focus.</text>
        <rect x="46" y="196" width="108" height="124" rx="2" fill={u("curve")} />
      </g>

      {/* specular highlights sit on top of everything, label included */}
      <path d="M43 172 C39 230 39 320 43 382" fill="none" stroke={u("hl")} strokeWidth="8" opacity="0.45" filter={u("soft")} />
      <path d="M41 176 C38 230 38 320 41 378" fill="none" stroke={u("hl")} strokeWidth="1.6" opacity="0.9" />
      <path d="M159 178 C161 240 161 320 159 372" fill="none" stroke={u("hl")} strokeWidth="2.5" opacity="0.35" />
      <path d="M48 146 C56 128 70 120 79 104" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.35" filter={u("soft")} />
      <path d="M79 56 L79 98" stroke={u("hl")} strokeWidth="3" opacity="0.5" />
      <path d="M122 58 L122 96" stroke={u("hl")} strokeWidth="1.2" opacity="0.3" />
      <path d={BOTTLE_BODY} fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="1" />

      {/* brushed-metal screw cap */}
      <rect x="70" y="47" width="60" height="8" fill="#000" opacity="0.4" filter={u("soft")} />
      <rect x="67" y="40" width="66" height="8" rx="1.5" fill={u("cap")} />
      <rect x="67" y="40" width="66" height="8" rx="1.5" fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="0.6" />
      <line x1="69" x2="131" y1="43.5" y2="43.5" stroke="#000" strokeOpacity="0.3" strokeDasharray="4 2" strokeWidth="0.8" />
      <rect x="66" y="6" width="68" height="35" rx="4" fill={u("cap")} />
      <rect x="66" y="9" width="68" height="31" fill={u("knurl")} />
      <rect x="66" y="6" width="68" height="4" rx="2" fill="#fff" opacity="0.45" />
      <rect x="66" y="6" width="68" height="35" rx="4" fill="none" stroke="#000" strokeOpacity="0.4" strokeWidth="0.8" />
    </svg>
  );
}
