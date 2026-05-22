'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PitchData, GroupConfig } from '@/lib/types';

interface LeaderboardProps {
  allPitches: Record<string, PitchData>;
  groups: Record<string, GroupConfig>;
  activeGroupIds: string[];
  currentPitchGroupId?: string;
}

interface Entry {
  id: string;
  raised: number;
  target: number;
  name: string;
  success: boolean;
}

export default function Leaderboard({
  allPitches,
  groups,
  activeGroupIds,
  currentPitchGroupId,
}: LeaderboardProps) {
  const ranked: Entry[] = activeGroupIds
    .filter((id) => {
      if (id === currentPitchGroupId) return false; // exclude current live pitch
      const p = allPitches[id];
      return p && (p.totalRaised ?? 0) > 0;
    })
    .map((id) => {
      const p = allPitches[id]!;
      const raised  = p.totalRaised ?? 0;
      const target  = p.targetAmount ?? 0;
      return { id, raised, target, name: groups[id]?.name ?? '', success: target > 0 && raised >= target };
    })
    .sort((a, b) => b.raised - a.raised);

  // Track when champion changes to trigger special animation
  const prevChampRef = useRef<string | null>(null);
  const [flashChamp, setFlashChamp] = useState(false);

  useEffect(() => {
    const champ = ranked[0]?.id ?? null;
    if (champ && champ !== prevChampRef.current && prevChampRef.current !== null) {
      setFlashChamp(true);
      setTimeout(() => setFlashChamp(false), 1800);
    }
    prevChampRef.current = champ;
  }, [ranked[0]?.id]);   // eslint-disable-line

  if (ranked.length === 0) return null;

  return (
    <div
      className="px-4 py-2.5 shrink-0"
      style={{ borderBottom: '1px solid #141414' }}
    >
      <div className="text-xs font-mono mb-2 flex items-center gap-2" style={{ color: '#444' }}>
        🏆 龍虎榜
        <span style={{ color: '#2a2a2a' }}>— {ranked.length} 組完賽</span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        <AnimatePresence mode="popLayout">
          {ranked.map((entry, index) => {
            const isChamp = index === 0;
            const isFlashing = isChamp && flashChamp;

            return (
              <motion.div
                key={entry.id}
                layoutId={`lb-${entry.id}`}
                layout="position"
                initial={{ opacity: 0, x: 40, scale: 0.82 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  scale: 1,
                  boxShadow: isFlashing
                    ? ['0 0 0px transparent', '0 0 16px rgba(196,36,48,0.5)', '0 0 0px transparent']
                    : 'none',
                }}
                exit={{ opacity: 0, scale: 0.78, x: -20 }}
                transition={{
                  layout:    { type: 'spring', stiffness: 260, damping: 22 },
                  default:   { type: 'spring', stiffness: 280, damping: 24 },
                  boxShadow: { duration: 1.2 },
                }}
                className="relative flex-shrink-0 rounded-xl p-3"
                style={{
                  minWidth: '116px',
                  background: isChamp ? '#170906' : entry.success ? '#0f0808' : '#0c0c08',
                  border: `1px solid ${isChamp ? '#4a1410' : entry.success ? '#2a1010' : '#221e10'}`,
                }}
              >
                {/* Crown for champion */}
                {isChamp && (
                  <motion.div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-base leading-none"
                    animate={isFlashing ? { scale: [1, 1.4, 1], rotate: [-8, 8, 0] } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    👑
                  </motion.div>
                )}

                {/* Rank + success */}
                <div className="flex items-center gap-1 mb-1">
                  <span
                    className="text-xs font-mono font-bold"
                    style={{ color: isChamp ? '#C42430' : '#444' }}
                  >
                    #{index + 1}
                  </span>
                  {entry.success && (
                    <span className="text-xs font-mono" style={{ color: '#C42430' }}>✓</span>
                  )}
                </div>

                {/* Group info */}
                <div className="text-xs font-mono truncate" style={{ color: '#555' }}>
                  第{entry.id}組{entry.name ? ` · ${entry.name}` : ''}
                </div>

                {/* Amount */}
                <div
                  className="text-xl font-display font-black mt-1.5"
                  style={{ color: isChamp ? '#C42430' : entry.success ? '#C42430' : '#C09818' }}
                >
                  ${(entry.raised / 10_000).toFixed(0)}萬
                </div>

                {entry.target > 0 && (
                  <div className="text-xs font-mono mt-0.5" style={{ color: '#2a2a2a' }}>
                    /{(entry.target / 10_000).toFixed(0)}萬
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
