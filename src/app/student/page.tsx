'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useGameState,
  useInvestor,
  useGroups,
  useActiveGroupIds,
  submitInvestment,
  pingPresence,
} from '@/hooks/useGameState';
import type { RiceScore } from '@/lib/types';

// Muted tech colors
const C = {
  amber:  '#D4850C',
  gold:   '#C09818',
  green:  '#1A9952',
  blue:   '#1499AA',
  red:    '#C42430',
  purple: '#8820C0',
};

// ── Slider ───────────────────────────────────────────────────────────────
function RiceSlider({
  label, sublabel, value, onChange, color,
}: {
  label: string; sublabel: string; value: number;
  onChange: (v: number) => void; color: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div>
          <span className="text-sm font-mono font-bold" style={{ color }}>
            [{label}]
          </span>{' '}
          <span className="text-xs" style={{ color: '#666' }}>{sublabel}</span>
        </div>
        <div className="text-xl font-display font-black w-8 text-right" style={{ color }}>
          {value}
        </div>
      </div>
      <input
        type="range" min={1} max={10} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: color }}
      />
      <div className="flex justify-between text-xs font-mono px-0.5" style={{ color: '#444' }}>
        <span>1</span><span>5</span><span>10</span>
      </div>
    </div>
  );
}

const CHIPS = [
  { label: '+10萬', amount: 100_000 },
  { label: '+50萬', amount: 500_000 },
  { label: '+100萬', amount: 1_000_000 },
];

// ── Group Picker ─────────────────────────────────────────────────────────
function GroupPicker({ onSelect }: { onSelect: (id: string) => void }) {
  const activeGroupIds = useActiveGroupIds();
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center gap-8 px-6"
      style={{ background: '#080808' }}
    >
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="text-4xl mb-3">🦈</div>
        <div className="text-2xl font-display font-black" style={{ color: C.amber }}>
          SHARK TANK ARENA
        </div>
        <div className="text-sm font-mono mt-2" style={{ color: '#555' }}>
          請選擇你的組別
        </div>
      </motion.div>

      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {activeGroupIds.map((id, i) => (
          <motion.button
            key={id}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => onSelect(id)}
            className="aspect-square rounded-2xl flex items-center justify-center text-3xl font-display font-black"
            style={{
              background: '#111',
              border: '1px solid #252525',
              color: '#888',
            }}
            whileHover={{
              background: '#161616',
              borderColor: C.amber,
              color: C.amber,
              scale: 1.05,
            }}
            whileTap={{ scale: 0.94 }}
          >
            {id}
          </motion.button>
        ))}
      </div>
    </main>
  );
}

// ── Main student page ────────────────────────────────────────────────────
export default function StudentPage() {
  const [groupId, setGroupId] = useState<string>('');
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from URL param or localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('group');
    const fromStorage = localStorage.getItem('shark_group');
    const resolved = fromUrl || fromStorage || '';
    setGroupId(resolved);
    setHydrated(true);
  }, []);

  const handleGroupSelect = (id: string) => {
    localStorage.setItem('shark_group', id);
    const url = new URL(window.location.href);
    url.searchParams.set('group', id);
    window.history.replaceState(null, '', url.toString());
    setGroupId(id);
  };

  // Presence ping
  useEffect(() => {
    if (!groupId) return;
    pingPresence(groupId).catch(() => {});
    const id = setInterval(() => pingPresence(groupId).catch(() => {}), 30_000);
    return () => clearInterval(id);
  }, [groupId]);

  const gameState = useGameState();
  const investor  = useInvestor(groupId);
  const groups    = useGroups();

  const riceEnabled = gameState?.riceEnabled ?? true;

  const [step, setStep]               = useState<'rice' | 'invest' | 'done'>('rice');
  const [rice, setRice]               = useState<RiceScore>({ R: 5, I: 5, C: 5, E: 5 });
  const [investAmount, setInvestAmount] = useState(0);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');

  // Reset step when pitch changes or riceEnabled toggles
  useEffect(() => {
    if (!investor) return;
    if (investor.hasVotedCurrentPitch) {
      setStep('done');
    } else {
      setStep(riceEnabled ? 'rice' : 'invest');
      setInvestAmount(0);
      setError('');
    }
  }, [gameState?.currentPitchGroupId, investor?.hasVotedCurrentPitch, riceEnabled]);

  const remaining = investor?.remainingBudget ?? 3_000_000;
  const isLow     = remaining < 100_000;

  const addChip = useCallback(
    (amt: number) => setInvestAmount((p) => Math.min(p + amt, remaining)),
    [remaining]
  );

  const handleSubmit = useCallback(async () => {
    if (!gameState?.currentPitchGroupId || !groupId) return;
    if (investAmount <= 0) { setError('請設定投資金額'); return; }
    if (investAmount > remaining) { setError('餘額不足！'); return; }
    setSubmitting(true);
    try {
      const effectiveRice = riceEnabled ? rice : { R: 0, I: 0, C: 0, E: 0 };
      await submitInvestment(groupId, gameState.currentPitchGroupId, investAmount, effectiveRice);
      setStep('done');
    } catch (_) {
      setError('送出失敗，請重試');
    } finally {
      setSubmitting(false);
    }
  }, [gameState, groupId, investAmount, remaining, rice, riceEnabled]);

  if (!hydrated) return null;
  if (!groupId) return <GroupPicker onSelect={handleGroupSelect} />;

  const isWaiting   = !gameState || gameState.phase === 'waiting';
  const isSelfPitch = !isWaiting && gameState?.currentPitchGroupId === groupId;

  if (isWaiting) return <WaitingScreen groupId={groupId} groups={groups} remaining={remaining} onChangeGroup={() => {
    localStorage.removeItem('shark_group');
    setGroupId('');
  }} />;

  if (isSelfPitch) return (
    <main
      className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 max-w-md mx-auto"
      style={{ background: '#080808' }}
    >
      <div className="text-center">
        <div className="text-5xl mb-4">🦈</div>
        <div className="text-2xl font-display font-black" style={{ color: '#C42430' }}>
          本組提案中
        </div>
        <div className="text-sm font-mono mt-2" style={{ color: '#555' }}>
          第{groupId}組不可投資自己
        </div>
      </div>
      <div
        className="w-full rounded-xl p-4"
        style={{ background: '#0e0e0e', border: '1px solid #1e1e1e' }}
      >
        <div className="text-xs font-mono mb-1" style={{ color: '#444' }}>剩餘資金</div>
        <div className="text-3xl font-display font-black" style={{ color: '#C09818' }}>
          ${remaining.toLocaleString()}
        </div>
      </div>
      <div className="text-xs font-mono" style={{ color: '#333' }}>
        請等待本組提案結束
      </div>
    </main>
  );

  const currentName = groups[groupId]?.name || `第${groupId}組`;  // footer display only

  return (
    <main
      className="min-h-screen flex flex-col max-w-md mx-auto"
      style={{ background: '#080808', color: '#ccc' }}
    >
      {/* Balance bar */}
      <div
        className="sticky top-0 z-20 flex items-center justify-between px-4 py-3"
        style={{
          background: isLow ? 'rgba(100,10,10,0.92)' : 'rgba(8,8,8,0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${isLow ? '#3a1010' : '#181818'}`,
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color: '#555' }}>剩餘資金</span>
          {isLow && (
            <motion.span
              className="text-xs font-mono"
              style={{ color: '#C04040' }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.7, repeat: Infinity }}
            >
              ⚠ 低額
            </motion.span>
          )}
        </div>
        <div
          className="text-xl font-display font-black"
          style={{ color: isLow ? '#C04040' : C.green }}
        >
          ${remaining.toLocaleString()}
        </div>
      </div>

      <div className="flex-1 px-4 py-5 space-y-4">
        {/* Current pitch */}
        <div
          className="rounded-xl p-4"
          style={{ background: '#0e0e0e', border: '1px solid #1e1e1e' }}
        >
          <div className="text-xs font-mono mb-1" style={{ color: '#444' }}>當前注金組</div>
          <div className="text-2xl font-display font-black" style={{ color: C.amber }}>
            {groups[gameState.currentPitchGroupId]?.name || gameState.pitchGroupName || gameState.currentPitchGroupId}
          </div>
          {groups[gameState.currentPitchGroupId]?.topic && (
            <div className="text-xs font-mono mt-1" style={{ color: '#666' }}>
              {groups[gameState.currentPitchGroupId].topic}
            </div>
          )}
          <div className="text-xs font-mono mt-1.5" style={{ color: '#C42430' }}>
            目標 ${gameState.targetAmount.toLocaleString()}
          </div>
        </div>

        {/* Step 1: RICE (only when enabled) */}
        {riceEnabled && (
          <StepCard
            step={1} title="盡職調查 Due Diligence" subtitle="滑動 4 個維度完成評估"
            active={step === 'rice'} done={step !== 'rice'} locked={false}
          >
            {step === 'rice' && (
              <div className="space-y-5 mt-4">
                <RiceSlider label="R" sublabel="目標性 Reach"       value={rice.R} onChange={(v) => setRice((r) => ({ ...r, R: v }))} color={C.gold}   />
                <RiceSlider label="I" sublabel="影響力 Impact"      value={rice.I} onChange={(v) => setRice((r) => ({ ...r, I: v }))} color={C.amber}  />
                <RiceSlider label="C" sublabel="自信心 Confidence"  value={rice.C} onChange={(v) => setRice((r) => ({ ...r, C: v }))} color={C.blue}   />
                <RiceSlider label="E" sublabel="資源消耗 Effort"    value={rice.E} onChange={(v) => setRice((r) => ({ ...r, E: v }))} color={C.purple} />

                <motion.button
                  onClick={() => setStep('invest')}
                  className="w-full py-4 rounded-xl font-mono font-bold text-base"
                  style={{
                    background: 'linear-gradient(90deg, #7A5008, #C08010)',
                    color: '#f0e0b0',
                    border: '1px solid #8B6010',
                  }}
                  whileTap={{ scale: 0.97 }}
                >
                  ✅ 完成評估，解鎖投資
                </motion.button>
              </div>
            )}
            {step !== 'rice' && (
              <div className="mt-2.5 flex gap-3 text-xs font-mono" style={{ color: '#555' }}>
                <span>R:{rice.R}</span><span>I:{rice.I}</span>
                <span>C:{rice.C}</span><span>E:{rice.E}</span>
                <span className="ml-auto" style={{ color: C.green }}>✓ 完成</span>
              </div>
            )}
          </StepCard>
        )}

        {/* Step 2: Invest */}
        <StepCard
          step={riceEnabled ? 2 : 1} title="注入資金 Investment" subtitle="選擇你的注金金額"
          active={step === 'invest'} done={step === 'done'} locked={riceEnabled && step === 'rice'}
        >
          {step === 'invest' && (
            <div className="space-y-3 mt-4">
              {/* Amount display */}
              <div
                className="text-center py-4 rounded-xl"
                style={{ background: '#0a0a0a', border: '1px solid #1e1e1e' }}
              >
                <div className="text-xs font-mono mb-1" style={{ color: '#444' }}>投資金額</div>
                <div
                  className="text-4xl font-display font-black"
                  style={{ color: investAmount > 0 ? C.gold : '#333' }}
                >
                  ${investAmount.toLocaleString()}
                </div>
              </div>

              {/* Chips */}
              <div className="grid grid-cols-3 gap-2">
                {CHIPS.map(({ label, amount }) => (
                  <motion.button
                    key={label}
                    onClick={() => addChip(amount)}
                    disabled={remaining < amount}
                    className="py-3 rounded-lg text-sm font-mono font-bold"
                    style={{
                      background: '#131313',
                      border: '1px solid #252525',
                      color: remaining >= amount ? C.gold : '#333',
                      opacity: remaining >= amount ? 1 : 0.4,
                    }}
                    whileTap={{ scale: 0.93 }}
                  >
                    {label}
                  </motion.button>
                ))}
              </div>

              {/* All-in */}
              <motion.button
                onClick={() => setInvestAmount(remaining)}
                className="w-full py-3 rounded-xl font-mono font-bold text-sm"
                style={{
                  background: '#150808',
                  border: '1px solid #3a1818',
                  color: '#C06050',
                }}
                whileTap={{ scale: 0.96 }}
              >
                🎰 ALL IN — ${remaining.toLocaleString()}
              </motion.button>

              {investAmount > 0 && (
                <button
                  onClick={() => setInvestAmount(0)}
                  className="w-full text-xs font-mono text-center"
                  style={{ color: '#444' }}
                >
                  清零
                </button>
              )}

              {error && (
                <div className="text-sm font-mono text-center" style={{ color: '#C04040' }}>
                  {error}
                </div>
              )}

              <motion.button
                onClick={handleSubmit}
                disabled={submitting || investAmount <= 0}
                className="w-full py-5 rounded-xl font-display font-black text-xl tracking-widest"
                style={{
                  background: investAmount > 0 ? 'linear-gradient(135deg, #8B1820, #C42430)' : '#111',
                  color: investAmount > 0 ? '#f8c0c0' : '#333',
                  border: investAmount > 0 ? '1px solid #6A1020' : '1px solid #1e1e1e',
                  opacity: submitting ? 0.7 : 1,
                }}
                whileTap={{ scale: 0.96 }}
              >
                {submitting ? '送出中...' : '💰 確認注金！'}
              </motion.button>
            </div>
          )}
          {step === 'done' && (
            <div className="mt-2 text-xs font-mono" style={{ color: C.green }}>✓ 已投資</div>
          )}
        </StepCard>

        {/* Done */}
        <AnimatePresence>
          {step === 'done' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl p-6 text-center"
              style={{
                background: '#081408',
                border: '1px solid #1A4428',
              }}
            >
              <div className="text-5xl font-display font-black" style={{ color: C.green }}>
                💰 已注金！
              </div>
              <div className="text-sm font-mono mt-3" style={{ color: '#666' }}>
                請看大螢幕觀看燈條
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div
        className="text-center py-3 text-xs font-mono flex items-center justify-center gap-2"
        style={{ color: '#333', borderTop: '1px solid #111' }}
      >
        <span>{currentName}</span>
        <button
          onClick={() => {
            localStorage.removeItem('shark_group');
            setGroupId('');
          }}
          className="underline"
          style={{ color: '#2a2a2a' }}
        >
          換組
        </button>
      </div>
    </main>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

function StepCard({
  step, title, subtitle, active, done, locked, children,
}: {
  step: number; title: string; subtitle: string;
  active: boolean; done: boolean; locked: boolean;
  children?: React.ReactNode;
}) {
  return (
    <motion.div
      className="rounded-xl overflow-hidden"
      animate={{ opacity: locked ? 0.35 : 1 }}
      style={{
        background: '#0e0e0e',
        border: `1px solid ${active ? '#3a2808' : done ? '#1A4428' : '#1e1e1e'}`,
      }}
    >
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-display font-black shrink-0"
            style={{
              background: done ? C.green : active ? C.amber : '#1a1a1a',
              color: done || active ? '#000' : '#444',
            }}
          >
            {done ? '✓' : step}
          </div>
          <div>
            <div className="text-sm font-mono font-bold" style={{ color: active ? C.amber : done ? C.green : '#555' }}>
              {title}
            </div>
            <div className="text-xs font-mono mt-0.5" style={{ color: '#444' }}>{subtitle}</div>
          </div>
          {locked && <span className="ml-auto text-sm" style={{ color: '#333' }}>🔒</span>}
        </div>
        {children}
      </div>
    </motion.div>
  );
}

function WaitingScreen({
  groupId, groups, remaining, onChangeGroup,
}: {
  groupId: string;
  groups: Record<string, { name: string; topic: string }>;
  remaining: number;
  onChangeGroup: () => void;
}) {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 max-w-md mx-auto"
      style={{ background: '#080808' }}
    >
      <motion.div
        animate={{ opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="text-center"
      >
        <div className="text-5xl mb-3">🦈</div>
        <div className="text-xl font-display font-black tracking-widest" style={{ color: '#444' }}>
          等待注金開始
        </div>
        <div className="text-xs font-mono mt-2" style={{ color: '#333' }}>
          Waiting for funding round . . .
        </div>
      </motion.div>

      <div
        className="w-full rounded-xl p-4"
        style={{ background: '#0e0e0e', border: '1px solid #1e1e1e' }}
      >
        <div className="text-xs font-mono mb-1" style={{ color: '#444' }}>你的創投基金</div>
        <div className="text-3xl font-display font-black" style={{ color: C.green }}>
          ${remaining.toLocaleString()}
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs font-mono" style={{ color: '#555' }}>
            第{groupId}組{groups[groupId]?.name ? ` · ${groups[groupId].name}` : ''}
          </div>
          <button onClick={onChangeGroup} className="text-xs font-mono underline" style={{ color: '#333' }}>
            換組
          </button>
        </div>
      </div>
    </main>
  );
}
