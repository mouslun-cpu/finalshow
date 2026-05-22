'use client';
import { motion } from 'framer-motion';
import type { Presence, GroupConfig, Investor } from '@/lib/types';

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

interface GroupPresenceProps {
  presence: Record<string, Presence>;
  groups: Record<string, GroupConfig>;
  investors?: Record<string, Investor>;
  activeGroupIds: string[];
}

export default function GroupPresence({
  presence,
  groups,
  investors,
  activeGroupIds,
}: GroupPresenceProps) {
  const now = Date.now();

  const items = activeGroupIds.map((id) => {
    const p = presence[id];
    const isOnline = !!(p && now - p.lastSeen < ONLINE_THRESHOLD_MS);
    const hasVoted = investors?.[id]?.hasVotedCurrentPitch ?? false;
    const name = groups[id]?.name || '';
    return { id, isOnline, hasVoted, name };
  });

  const onlineCount = items.filter((i) => i.isOnline).length;
  const votedCount  = items.filter((i) => i.hasVoted).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono" style={{ color: '#555' }}>到場組別</span>
        <span className="text-xs font-mono" style={{ color: '#555' }}>
          {onlineCount}/{activeGroupIds.length} 在線
          {investors && (
            <span style={{ color: '#C08010' }}> · {votedCount} 已注金</span>
          )}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {items.map(({ id, isOnline, hasVoted, name }) => {
          // Priority: voted > online > offline
          const dotColor  = hasVoted ? '#C08010' : isOnline ? '#1A9952' : '#2a2a2a';
          const bgColor   = hasVoted ? '#1a1408' : isOnline ? '#0a160a' : '#0a0a0a';
          const bdColor   = hasVoted ? '#2a2010' : isOnline ? '#1a2a1a' : '#161616';
          const textColor = hasVoted ? '#C08010' : isOnline ? '#aaa' : '#383838';

          return (
            <motion.div
              key={id}
              className="flex items-center gap-1 px-2 py-1 rounded-md"
              style={{ background: bgColor, border: `1px solid ${bdColor}` }}
              animate={{ opacity: isOnline || hasVoted ? 1 : 0.45 }}
            >
              <div className="relative flex items-center">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} />
                {isOnline && !hasVoted && (
                  <motion.div
                    className="absolute w-1.5 h-1.5 rounded-full"
                    style={{ background: '#1A9952' }}
                    animate={{ scale: [1, 2.5, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>
              <span className="text-xs font-mono font-bold" style={{ color: textColor }}>
                {name || id}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
