'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';

const TOTAL_SEGMENTS = 20;

// Muted color palette — visible but not burning-bright
const COLORS = {
  low:    { fill: '#C08010', glow: 'rgba(192,128,16,0.55)' },
  mid:    { fill: '#C05820', glow: 'rgba(192,88,32,0.55)'  },
  high:   { fill: '#B82830', glow: 'rgba(184,40,48,0.55)'  },
};

function getColors(index: number) {
  const progress = index / (TOTAL_SEGMENTS - 1);
  if (progress < 0.5) return COLORS.low;
  if (progress < 0.75) return COLORS.mid;
  return COLORS.high;
}

interface LedBarProps {
  litSegments: number;
  targetSegment?: number;
  totalRaised: number;
  targetAmount: number;
  isSuccess?: boolean;
}

export default function LedBar({
  litSegments,
  targetSegment = 15,
  totalRaised,
  targetAmount,
  isSuccess = false,
}: LedBarProps) {
  const segments = useMemo(
    () =>
      Array.from({ length: TOTAL_SEGMENTS }, (_, i) => {
        const displayIndex = TOTAL_SEGMENTS - 1 - i; // top-first
        return {
          displayIndex,
          isLit: displayIndex < litSegments,
          isTarget: displayIndex === targetSegment - 1,
          ...getColors(displayIndex),
        };
      }),
    [litSegments, targetSegment]
  );

  const pct = Math.min(100, Math.round((totalRaised / targetAmount) * 100));

  return (
    <div className="flex flex-col items-center gap-1 h-full justify-center select-none">
      <div className="text-xs font-mono mb-1 tracking-widest" style={{ color: '#444' }}>▲ MAX</div>

      <div className="flex flex-col gap-[3px] w-20">
        {segments.map(({ displayIndex, isLit, isTarget, fill, glow }) => (
          <div key={displayIndex} className="relative">
            {/* Target line */}
            {isTarget && (
              <>
                <div
                  className="absolute -left-6 -right-6 top-1/2 -translate-y-1/2 h-px z-10"
                  style={{ background: 'rgba(180,30,40,0.7)' }}
                />
                <div
                  className="absolute -right-12 top-1/2 -translate-y-1/2 text-xs font-mono whitespace-nowrap z-10"
                  style={{ color: '#A82030', fontSize: '10px' }}
                >
                  目標線
                </div>
              </>
            )}

            <motion.div
              className="w-full rounded-sm relative overflow-hidden"
              style={{ height: '22px', border: '1px solid' }}
              animate={{
                backgroundColor: isLit ? fill : '#181818',
                boxShadow: isLit
                  ? `0 0 5px ${fill}, 0 0 10px ${glow}`
                  : 'inset 0 0 3px rgba(0,0,0,0.6)',
                borderColor: isLit ? fill : '#242424',
              }}
              transition={{ duration: 0.07, ease: 'easeOut' }}
            >
              {isLit && (
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 55%)',
                  }}
                />
              )}
              {!isLit && (
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.03) 3px, rgba(255,255,255,0.03) 4px)',
                  }}
                />
              )}
            </motion.div>
          </div>
        ))}
      </div>

      <div className="text-xs font-mono mt-1 tracking-widest" style={{ color: '#444' }}>▼ 000</div>

      <motion.div
        className="mt-3 font-mono text-sm font-bold"
        animate={{
          color: isSuccess ? '#1A9952' : litSegments >= targetSegment ? '#B82830' : '#C08010',
        }}
        style={{ textShadow: 'none' }}
      >
        {pct}%
      </motion.div>

      <AnimatePresence>
        {isSuccess && (
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.15, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, repeat: 3 }}
            style={{ background: 'radial-gradient(circle, rgba(26,153,82,0.3), transparent 70%)' }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
