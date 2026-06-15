/* PillyLogoSmall — 44 × 44 header logo.
   Renders the full 400px PillyLogo inside a CSS-scaled wrapper so all
   animation values stay exactly as designed. The outer div provides the
   44×44 layout footprint; the inner wrapper scales it down with
   transform: scale(0.11) from the top-left. */

import PillyLogo from "./PillyLogo";

export default function PillyLogoSmall() {
  return (
    <div
      role="img"
      aria-label="Pilly logo"
      style={{
        width: "44px",
        height: "44px",
        flexShrink: 0,
        position: "relative",
        overflow: "visible",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "400px",
          height: "400px",
          transformOrigin: "top left",
          transform: "scale(0.11)",
          pointerEvents: "none",
        }}
      >
        <PillyLogo size={400} showName={false} />
      </div>
    </div>
  );
}
