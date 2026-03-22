import { motion } from 'framer-motion';

export default function Logo({ size = 36, animate = false, showText = false }) {
  const s = size;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <motion.svg
        width={s}
        height={s}
        viewBox="0 0 48 48"
        fill="none"
        initial={animate ? { scale: 0.8, opacity: 0 } : false}
        animate={animate ? { scale: 1, opacity: 1 } : false}
        transition={{ duration: 0.5 }}
      >
        <circle cx="20" cy="24" r="14" fill="url(#logo-gradient)" opacity="0.85" />
        <circle cx="32" cy="24" r="14" fill="url(#logo-gradient)" opacity="0.85" style={{ mixBlendMode: 'screen' }} />
        <defs>
          <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'var(--logo-bubble-start)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--logo-bubble-end)' }} />
          </linearGradient>
        </defs>
      </motion.svg>
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 style={{ margin: 0, fontWeight: 900, fontSize: s * 0.6, letterSpacing: -1, lineHeight: 1 }}>
            <span style={{ color: 'var(--logo-primary)' }}>Ping</span>
            <span style={{ color: 'var(--logo-secondary)' }}>Me</span>
          </h1>
        </div>
      )}
    </div>
  );
}
