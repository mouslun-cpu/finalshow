'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PitchData, GroupConfig } from '@/lib/types';
import { groupColor, fade, SUCCESS } from '@/lib/groupColors';

const MEDAL = ['#ffd34e', '#cdd6e0', '#e0945a'];

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
      className="px-5 py-3 shrink-0"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="font-fr-mono mb-2 flex items-center gap-2" style={{ fontSize: '12px', letterSpacing: '3px', color: 'rgba(238,242,247,0.5)' }}>
        🏆 龍虎榜
        <span style={{ color: 'rgba(238,242,247,0.3)' }}>· LEADERBOARD — {ranked.length} 組完賽</span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        <AnimatePresence mode="popLayout">
          {ranked.map((entry, index) => {
            const isChamp = index === 0;
            const isFlashing = isChamp && flashChamp;
            const color = groupColor(entry.id);
            const rankColor = index < 3 ? MEDAL[index] : 'rgba(238,242,247,0.45)';

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
                    ? ['0 0 0px transparent', `0 0 22px ${fade(color, 55)}`, '0 0 0px transparent']
                    : isChamp
                    ? `0 0 24px ${fade(color, 28)}`
                    : 'none',
                }}
                exit={{ opacity: 0, scale: 0.78, x: -20 }}
                transition={{
                  layout:    { type: 'spring', stiffness: 260, damping: 22 },
                  default:   { type: 'spring', stiffness: 280, damping: 24 },
                  boxShadow: { duration: 1.2 },
                }}
                className="relative flex-shrink-0 rounded-xl p-3 overflow-hidden"
                style={{
                  minWidth: '120px',
                  background: `linear-gradient(180deg, ${fade(color, isChamp ? 16 : 10)}, rgba(255,255,255,0.02))`,
                  border: `1px solid ${fade(color, isChamp ? 70 : 38)}`,
                }}
              >
                {/* color top edge */}
                <div className="absolute top-0 left-0 right-0" style={{ height: '3px', background: color }} />

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
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="font-fr" style={{ fontSize: '15px', fontWeight: 900, color: rankColor }}>
                    #{index + 1}
                  </span>
                  <span className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${fade(color, 60)}` }} />
                  {entry.success && (
                    <span className="font-fr-mono ml-auto" style={{ fontSize: '10px', color: SUCCESS }}>✓</span>
                  )}
                </div>

                {/* Group info */}
                <div className="font-fr-mono truncate" style={{ fontSize: '11px', color: 'rgba(238,242,247,0.55)' }}>
                  第{entry.id}組{entry.name ? ` · ${entry.name}` : ''}
                </div>

                {/* Amount */}
                <div className="font-fr mt-1.5" style={{ fontSize: '22px', fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                  ${(entry.raised / 10_000).toFixed(0)}萬
                </div>

                {entry.target > 0 && (
                  <div className="font-fr-mono mt-0.5" style={{ fontSize: '10px', color: 'rgba(238,242,247,0.35)' }}>
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
