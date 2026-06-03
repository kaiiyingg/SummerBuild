/**
 * PillyLogo.jsx — Animated Pilly mascot logo
 *
 * Usage:
 *   import PillyLogo from "../components/PillyLogo";
 *   <PillyLogo size={400} showName={true} />
 *
 * Props:
 *   size     (number)  – rendered width & height in px  (default 400)
 *   showName (bool)    – show "Pilly" wordmark below    (default true)
 */

const ANIM = `
  /* ─────────────────────────────────────────────────────────
     3D ORBIT
     Implemented via two nested CSS animations applied to two
     nested <g> elements. The outer group oscillates in X only;
     the inner group oscillates in Y and scales / fades to
     simulate depth (small + dim = far away at the top,
     large + bright = close at the bottom).

     Orbit ellipse parameters
       · Centre  : (200, 200) in SVG viewport
       · X radius: 120 px
       · Y radius: 42 px   (compressed → perspective feel)

     Both circles are the same size (r = 16).
     They stay 180° apart via a -3 s delay offset.

     Starting phases (so they sit at upper-left / lower-right
     at t = 0, matching the original illustration):
       · Circle A → delay -5.25 s  ≈ 315° → upper-left
       · Circle B → delay -2.25 s  ≈ 135° → lower-right
  ───────────────────────────────────────────────────────── */

  /* Horizontal sweep (applied to outer group, centred at 200,200) */
  @keyframes orbit3DX {
    0%   { transform: translateX(   0px); }
    25%  { transform: translateX( 120px); }
    50%  { transform: translateX(   0px); }
    75%  { transform: translateX(-120px); }
    100% { transform: translateX(   0px); }
  }

  /* Vertical sweep + scale + opacity (applied to inner group) */
  @keyframes orbit3DY {
    0%   { transform: translateY(-42px) scale(0.68); opacity: 0.55; }   /* top  – far  */
    25%  { transform: translateY(  0px) scale(1.00); opacity: 0.80; }
    50%  { transform: translateY( 42px) scale(1.40); opacity: 1.00; }   /* bottom – near */
    75%  { transform: translateY(  0px) scale(1.00); opacity: 0.80; }
    100% { transform: translateY(-42px) scale(0.68); opacity: 0.55; }
  }

  /* Circle A — starts upper-left */
  .pilly-ox-a { animation: orbit3DX 6s linear infinite; animation-delay: -5.25s; }
  .pilly-oy-a { animation: orbit3DY 6s linear infinite; animation-delay: -5.25s; }

  /* Circle B — starts lower-right (180° offset = −3 s) */
  .pilly-ox-b { animation: orbit3DX 6s linear infinite; animation-delay: -2.25s; }
  .pilly-oy-b { animation: orbit3DY 6s linear infinite; animation-delay: -2.25s; }

  /* ── PILL FLOAT ─────────────────────────────── */
  @keyframes pillyFloat {
    0%, 100% { transform: translateY(0px);   }
    50%       { transform: translateY(-13px); }
  }
  .pilly-float { animation: pillyFloat 3.5s ease-in-out infinite; }

  /* ── PILL WOBBLE ────────────────────────────── */
  /*  rotate(-135deg) → white cap upper-left, teal cap lower-right  */
  @keyframes pillyWobble {
    0%,  100% { transform: translate(200px, 200px) rotate(-135deg); }
    25%        { transform: translate(200px, 200px) rotate(-139deg); }
    75%        { transform: translate(200px, 200px) rotate(-131deg); }
  }
  .pilly-pivot { animation: pillyWobble 3.5s ease-in-out infinite; }

  /* ── SHADOW PULSE ───────────────────────────── */
  @keyframes pillyShadow {
    0%, 100% { opacity: 0.22; }
    50%       { opacity: 0.07; }
  }
  .pilly-shadow { animation: pillyShadow 3.5s ease-in-out infinite; }

  @media (prefers-reduced-motion: reduce) {
    .pilly-ox-a, .pilly-oy-a, .pilly-ox-b, .pilly-oy-b,
    .pilly-float, .pilly-pivot, .pilly-shadow { animation: none; }
  }
`;

export default function PillyLogo({ size = 400, showName = true }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>

      <style>{ANIM}</style>

      {/*
        ════════════════════════════════════════════
        SVG viewport: 400 × 400

        Pill local geometry (centred at 0, 0):
          • Capsule 206 × 84 px  |  end-cap r = 42
          • Rect spine x = −61 … +61
          • Teal cap (left local)  → lower-right on screen  (rotate −135°)
          • White cap (right local) → upper-left  on screen

        Orbit (3D ellipse):
          • Centre (200, 200)  •  Rx 120  •  Ry 42
          • Both circles r = 16
        ════════════════════════════════════════════
      */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 400 400"
        style={{ display: 'block', overflow: 'visible' }}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Pilly logo"
      >
        <defs>
          <linearGradient id="pilly-gTeal" gradientUnits="objectBoundingBox"
                          x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%"   stopColor="#1AA99E" />
            <stop offset="45%"  stopColor="#40E0D0" />
            <stop offset="100%" stopColor="#7BEDE7" />
          </linearGradient>

          <linearGradient id="pilly-gWhite" gradientUnits="objectBoundingBox"
                          x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%"   stopColor="#BCDEDD" />
            <stop offset="50%"  stopColor="#E7F6F5" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>

          <filter id="pilly-fSticker" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="4" dy="5" stdDeviation="5"
                          floodColor="#1a4040" floodOpacity="0.20" />
          </filter>

          <filter id="pilly-fBlur" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>

        {/* ════════ ORBIT LAYER — BACK (drawn before pill) ════════
            When the circle is at the TOP of the ellipse it is "behind"
            the pill. We draw one full orbit here; the scale/opacity
            animation naturally makes it look further away up top.     */}

        {/* Circle A — back layer */}
        <g className="pilly-ox-a" style={{ transform: 'translateX(0px)' }}>
          <g className="pilly-oy-a">
            <circle cx="200" cy="200" r="16" fill="#40E0D0" />
          </g>
        </g>

        {/* Circle B — back layer */}
        <g className="pilly-ox-b" style={{ transform: 'translateX(0px)' }}>
          <g className="pilly-oy-b">
            <circle cx="200" cy="200" r="16" fill="#40E0D0" />
          </g>
        </g>

        {/* ════════ PILL ════════ */}
        <g className="pilly-float">

          {/* Cast shadow (rotated to match −135° pill) */}
          <ellipse
            className="pilly-shadow"
            cx="206" cy="211"
            rx="90" ry="32"
            fill="#0b3232"
            filter="url(#pilly-fBlur)"
            transform="rotate(-135, 206, 211)"
          />

          <g className="pilly-pivot">

            {/* ① Sticker white border */}
            <path
              d="M -61,-50 L 61,-50 A 50,50 0 0,1 61,50 L -61,50 A 50,50 0 0,1 -61,-50 Z"
              fill="white"
              filter="url(#pilly-fSticker)"
            />

            {/* ② Teal half (left local → lower-right screen) */}
            <path
              d="M -61,-42 L 0,-42 L 0,42 L -61,42 A 42,42 0 0,1 -61,-42 Z"
              fill="url(#pilly-gTeal)"
            />

            {/* ③ White half (right local → upper-left screen) */}
            <path
              d="M 0,-42 L 61,-42 A 42,42 0 0,1 61,42 L 0,42 Z"
              fill="url(#pilly-gWhite)"
            />

            {/* ④ Centre divider */}
            <rect x="-3" y="-42" width="6" height="84" fill="#163636" />

            {/* ⑤ Outline */}
            <path
              d="M -61,-42 L 61,-42 A 42,42 0 0,1 61,42 L -61,42 A 42,42 0 0,1 -61,-42 Z"
              fill="none"
              stroke="#1a3c3c"
              strokeWidth="7"
              strokeLinejoin="round"
            />

            {/* ⑥ Teal gloss: C crescent + dot */}
            <path
              d="M -84,-8 Q -95,10 -81,27 Q -75,20 -76,9 Q -79,1 -79,-7 Z"
              fill="white"
              opacity="0.82"
            />
            <circle cx="-77" cy="7" r="4.5" fill="white" opacity="0.72" />

            {/* ⑦ White gloss oval */}
            <ellipse
              cx="32" cy="-23"
              rx="23" ry="10"
              fill="white"
              opacity="0.52"
              transform="rotate(-8, 32, -23)"
            />

          </g>
        </g>

      </svg>

      {showName && (
        <div style={{
          textAlign: 'center',
          fontFamily: "'Open Sans', sans-serif",
          letterSpacing: '0.04em'
        }}>
          <span style={{ fontSize: '28px', fontWeight: 700, color: '#40E0D0' }}>Pilly</span>
          <p style={{
            fontSize: '13px', color: '#888',
            marginTop: '4px', fontWeight: 400,
            letterSpacing: '0.08em'
          }}>
            PHARMACY MANAGEMENT SYSTEM
          </p>
        </div>
      )}

    </div>
  );
}
