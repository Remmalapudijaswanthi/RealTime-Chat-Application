import { motion } from 'framer-motion';

export default function Logo({ size = 36, animate = false, showText = false }) {
  const s = size;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <motion.svg
        width={s}
        height={s}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        initial={animate ? { scale: 0.8, opacity: 0 } : false}
        animate={animate ? { scale: 1, opacity: 1 } : false}
        transition={{ duration: 0.5 }}
      >
        {/* Left bubble */}
        <circle
          cx="15"
          cy="20"
          r="12"
          fill="url(#grad1)"
          opacity="0.9"
        />
        {/* Right bubble overlapping */}
        <circle
          cx="25"
          cy="20"
          r="12"
          fill="url(#grad2)"
          opacity="0.85"
        />
        {/* Small ping dot in center */}
        <circle
          cx="20"
          cy="20"
          r="3"
          fill="white"
          opacity="0.9"
        />
        <defs>
          <linearGradient
            id="grad1"
            x1="0" y1="0"
            x2="1" y2="1"
          >
            <stop offset="0%" stopColor="#7C3AED"/>
            <stop offset="100%" stopColor="#C084FC"/>
          </linearGradient>
          <linearGradient
            id="grad2"
            x1="0" y1="0"
            x2="1" y2="1"
          >
            <stop offset="0%" stopColor="#818CF8"/>
            <stop offset="100%" stopColor="#C084FC"/>
          </linearGradient>
        </defs>
      </motion.svg>
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 style={{ margin: 0, fontWeight: 900, fontSize: s * 0.6, letterSpacing: -0.5, lineHeight: 1, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
            <span style={{ color: 'var(--logo-primary)' }}>Ping</span>
            <span style={{ color: 'var(--logo-secondary)' }}>Me</span>
          </h1>
        </div>
      )}
    </div>
  );
}
