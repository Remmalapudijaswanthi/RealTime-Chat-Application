import { motion } from 'framer-motion';

export default function TypingIndicator({ username }) {
  const dotVariants = {
    initial: { y: 0 },
    animate: { y: -6 },
  };

  return (
    <motion.div
      className="typing-indicator"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
    >
      <div className="typing-bubble">
        <span className="typing-text">{username} is typing</span>
        <div className="typing-dots">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="typing-dot"
              variants={dotVariants}
              initial="initial"
              animate="animate"
              transition={{
                repeat: Infinity,
                repeatType: 'reverse',
                duration: 0.4,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
