import { motion } from "framer-motion";

function AnimatedPillLogo() {
  return (
    <motion.div
      className="relative w-16 h-16"
      animate={{
        y: [0, -6, 0],
        rotate: [-8, 8, -8],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      whileHover={{
        scale: 1.15,
        rotate: 15,
      }}
    >
      <motion.div
        className="absolute inset-0 rounded-full bg-cyan-400 blur-xl opacity-50"
        animate={{
          scale: [1, 1.35, 1],
          opacity: [0.35, 0.7, 0.35],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
      />

      <svg
        viewBox="0 0 120 120"
        className="relative z-10 w-full h-full drop-shadow-[0_0_18px_rgba(34,211,238,0.9)]"
      >
        <defs>
          <linearGradient id="pillBlue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="45%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>

          <linearGradient id="pillWhite" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#dbeafe" />
          </linearGradient>
        </defs>

        <g transform="rotate(-35 60 60)">
          <rect
            x="25"
            y="15"
            width="70"
            height="90"
            rx="35"
            fill="white"
            opacity="0.18"
          />

          <clipPath id="pillClip">
            <rect x="30" y="20" width="60" height="80" rx="30" />
          </clipPath>

          <g clipPath="url(#pillClip)">
            <rect x="30" y="20" width="60" height="40" fill="url(#pillBlue)" />
            <rect x="30" y="60" width="60" height="40" fill="url(#pillWhite)" />

            <motion.rect
              x="-40"
              y="15"
              width="25"
              height="95"
              fill="white"
              opacity="0.45"
              animate={{ x: [-40, 120] }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                repeatDelay: 1.2,
              }}
            />
          </g>

          <rect
            x="30"
            y="20"
            width="60"
            height="80"
            rx="30"
            fill="none"
            stroke="#a5f3fc"
            strokeWidth="3"
          />

          <line
            x1="30"
            y1="60"
            x2="90"
            y2="60"
            stroke="white"
            strokeWidth="3"
            opacity="0.8"
          />
        </g>
      </svg>
    </motion.div>
  );
}

export default AnimatedPillLogo;