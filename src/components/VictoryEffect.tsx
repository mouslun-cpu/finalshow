'use client';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VictoryEffectProps {
  show: boolean;
  onComplete?: () => void;
}

export default function VictoryEffect({ show, onComplete }: VictoryEffectProps) {
  useEffect(() => {
    if (!show) return;

    import('canvas-confetti').then(({ default: confetti }) => {
      const end = Date.now() + 3500;
      const frame = () => {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 50,
          origin: { x: 0 },
          colors: ['#C09818', '#D4850C', '#C42430', '#1499AA', '#1A9952'],
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 50,
          origin: { x: 1 },
          colors: ['#C09818', '#D4850C', '#C42430', '#1499AA', '#1A9952'],
        });
        if (Date.now() < end) requestAnimationFrame(frame);
        else onComplete?.();
      };
      frame();
    });

    try {
      const audio = new Audio('/sounds/victory.mp3');
      audio.volume = 0.6;
      audio.play().catch(() => {});
    } catch (_) {}
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Subtle radial flash */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.18, 0, 0.12, 0] }}
            transition={{ duration: 1.8 }}
            style={{
              background:
                'radial-gradient(circle at center, rgba(196,36,48,0.45) 0%, rgba(160,30,40,0.15) 55%, transparent 75%)',
            }}
          />

          {/* Victory text */}
          <motion.div
            className="text-center z-10"
            initial={{ scale: 0, rotate: -8 }}
            animate={{ scale: [0, 1.25, 1.05, 1.15] }}
            transition={{ duration: 0.7, ease: 'backOut' }}
          >
            <div
              className="text-7xl font-display font-black"
              style={{
                color: '#C42430',
                textShadow: '0 0 14px rgba(196,36,48,0.55)',
                WebkitTextStroke: '1px rgba(196,36,48,0.4)',
              }}
            >
              募資成功！
            </div>
            <motion.div
              className="text-3xl mt-3 font-display font-black"
              style={{ color: '#C09818' }}
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 0.6, repeat: 4 }}
            >
              🎉 FUNDED!
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
