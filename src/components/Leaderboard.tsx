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
    .sort((a, b) => b.raised - a.raised)
    .slice(0, 5); // 龍虎榜只顯示前 5 名

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
      className="flex items-center gap-3 px-5 py-2 shrink-0"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="font-fr-mono flex items-center gap-2 shrink-0" style={{ fontSize: '11px', letterSpacing: '2px', color: 'rgba(238,242,247,0.5)' }}>
        🏆 龍虎榜
        <span className="hidden xl:inline" style={{ color: 'rgba(238,242,247,0.3)' }}>· TOP {ranked.length}</span>
      </div>

      <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
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
                initial={{ opacity: 0, x: 30, scale: 0.85 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  scale: 1,
                  boxShadow: isFlashing
                    ? ['0 0 0px transparent', `0 0 18px ${fade(color, 55)}`, '0 0 0px transparent']
                    : isChamp
                    ? `0 0 16px ${fade(color, 26)}`
                    : 'none',
                }}
                exit={{ opacity: 0, scale: 0.8, x: -16 }}
                transition={{
                  layout:    { type: 'spring', stiffness: 260, damping: 22 },
                  default:   { type: 'spring', stiffness: 280, damping: 24 },
                  boxShadow: { duration: 1.2 },
                }}
                className="relative flex items-center gap-2 rounded-lg pl-2 pr-3 py-1 shrink-0"
                style={{
                  background: `linear-gradient(90deg, ${fade(color, isChamp ? 18 : 12)}, rgba(255,255,255,0.02))`,
                  border: `1px solid ${fade(color, isChamp ? 60 : 34)}`,
                  borderLeft: `3px solid ${color}`,
                }}
              >
                <span className="font-fr leading-none" style={{ fontSize: '13px', fontWeight: 900, color: rankColor }}>
                  {isChamp ? '👑' : `#${index + 1}`}
                </span>
                <span className="font-fr-mono leading-none whitespace-nowrap" style={{ fontSize: '11px', color: 'rgba(238,242,247,0.6)' }}>
                  第{entry.id}組{entry.name ? ` · ${entry.name}` : ''}
                </span>
                <span className="font-fr leading-none whitespace-nowrap" style={{ fontSize: '16px', fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                  ${(entry.raised / 10_000).toFixed(0)}萬
                </span>
                {entry.success && (
                  <span className="font-fr-mono leading-none" style={{ fontSize: '10px', color: SUCCESS }}>✓</span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
