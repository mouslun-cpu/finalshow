'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';
import { fade, SUCCESS } from '@/lib/groupColors';

const TOTAL_SEGMENTS = 20;

interface LedBarProps {
  litSegments: number;
  targetSegment?: number;
  totalRaised: number;
  targetAmount: number;
  isSuccess?: boolean;
  /** Signature neon color of the group currently raising. */
  color?: string;
}

/**
 * Fund Rush「注金金錢柱」— a tall, heavy neon money column that fills like a
 * tank as funding pours in. Replaces the old flat LED strip with a glowing
 * liquid tube: rising bubbles, a shimmering meniscus, a glowing goal line,
 * a warning flash as it nears the target, and a「募資成功」stamp on success.
 */
export default function LedBar({
  litSegments,
  targetSegment = 15,
  totalRaised,
  targetAmount,
  isSuccess = false,
  color = 'oklch(0.83 0.16 82)',
}: LedBarProps) {
  const fillPct = Math.min(100, (litSegments / TOTAL_SEGMENTS) * 100);
  const goalPct = (targetSegment / TOTAL_SEGMENTS) * 100; // goal line height (75%)
  const progress = Math.round((totalRaised / targetAmount) * 100); // 達標進度
  const near = progress >= 82 && !isSuccess;

  const maxWan = Math.round((targetAmount / targetSegment) * TOTAL_SEGMENTS / 10_000);
  const targetWan = Math.round(targetAmount / 10_000);

  const bubbles = useMemo(
    () =>
      Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            bottom: '4px',
            left: `${8 + i * 11}%`,
            width: `${4 + (i % 3) * 3}px`,
            height: `${4 + (i % 3) * 3}px`,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.7)',
            animation: `fr-bubble ${3 + (i % 4) * 0.7}s ease-in ${i * 0.45}s infinite`,
          }}
        />
      )),
    []
  );

  const ticks = useMemo(() => {
    const vals = [0, 25, 50, 75, 100];
    return vals.map((v) => (
      <div
        key={v}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: `${v}%`,
          height: '1px',
          background: 'rgba(255,255,255,0.10)',
        }}
      >
        <span
          className="font-fr-mono"
          style={{
            position: 'absolute',
            left: '6px',
            bottom: '2px',
            fontSize: '9px',
            color: 'rgba(238,242,247,0.35)',
          }}
        >
          {Math.round((maxWan * v) / 100)}
        </span>
      </div>
    ));
  }, [maxWan]);

  return (
    <div className="flex flex-col items-center gap-3 h-full justify-center select-none">
      {/* header: 注金量能 + 達標進度 */}
      <div className="flex flex-col items-center leading-none gap-1">
        <span
          className="font-fr-mono"
          style={{ fontSize: '11px', letterSpacing: '4px', color: 'rgba(238,242,247,0.4)' }}
        >
          注金量能
        </span>
        <motion.span
          className="font-fr"
          style={{ fontWeight: 900, fontSize: '34px', fontVariantNumeric: 'tabular-nums' }}
          animate={{ color: isSuccess ? SUCCESS : '#fff' }}
        >
          {Math.min(progress, 999)}%
        </motion.span>
      </div>

      {/* the tube */}
      <div
        className="relative flex-1"
        style={{
          width: '176px',
          borderRadius: '26px',
          overflow: 'hidden',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6)',
        }}
      >
        {/* warn glow near goal */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 5,
            opacity: near ? 1 : 0,
            transition: 'opacity 0.3s',
            background: 'linear-gradient(180deg, rgba(255,76,76,0.35), transparent 50%)',
            boxShadow: 'inset 0 0 50px rgba(255,76,76,0.5)',
            animation: near ? 'fr-warn 1s ease-in-out infinite' : 'none',
          }}
        />

        {/* colored edge */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '26px',
            pointerEvents: 'none',
            zIndex: 6,
            border: `1.5px solid ${fade(color, 55)}`,
            boxShadow: `inset 0 0 36px ${fade(color, 22)}`,
          }}
        />

        {/* liquid fill */}
        <motion.div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: `repeating-linear-gradient(0deg, rgba(0,0,0,0.16) 0 2px, transparent 2px 28px), linear-gradient(180deg, ${fade(
              color,
              92
            )} 0%, ${color} 24%, ${fade(color, 72)} 100%)`,
            boxShadow: `0 -8px 34px ${fade(color, 65)}`,
          }}
          animate={{ height: `${fillPct}%` }}
          transition={{ type: 'spring', stiffness: 90, damping: 20 }}
        >
          {/* meniscus shimmer */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '14px',
              background: 'rgba(255,255,255,0.85)',
              filter: 'blur(1px)',
              transformOrigin: 'center',
              animation: 'fr-menis 2.4s ease-in-out infinite',
            }}
          />
          {/* bubbles */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>{bubbles}</div>
        </motion.div>

        {/* goal line */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: `${goalPct}%`,
            height: 0,
            borderTop: '2px dashed rgba(255,255,255,0.85)',
            zIndex: 4,
          }}
        >
          <div
            className="font-fr-mono"
            style={{
              position: 'absolute',
              right: '8px',
              top: '-24px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: '6px',
              background: 'rgba(8,10,18,0.9)',
              border: '1px solid rgba(255,255,255,0.25)',
              fontSize: '10px',
              letterSpacing: '2px',
              color: '#fff',
              whiteSpace: 'nowrap',
            }}
          >
            目標 {targetWan}萬
          </div>
        </div>

        {/* scale ticks */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}>{ticks}</div>

        {/* success stamp */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 1.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 7,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                className="font-fr"
                style={{
                  transform: 'rotate(-9deg)',
                  padding: '10px 16px',
                  border: `3px solid ${SUCCESS}`,
                  borderRadius: '12px',
                  background: 'rgba(8,18,14,0.6)',
                  color: SUCCESS,
                  fontWeight: 900,
                  fontSize: '24px',
                  letterSpacing: '2px',
                  boxShadow: `0 0 30px ${fade(SUCCESS, 50)}`,
                }}
              >
                募資成功
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* footer scale */}
      <div
        className="flex justify-between font-fr-mono"
        style={{ width: '176px', fontSize: '10px', letterSpacing: '2px', color: 'rgba(238,242,247,0.4)' }}
      >
        <span>0</span>
        <span>MAX {maxWan}萬</span>
      </div>
    </div>
  );
}
