'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
import {
  useGameState, usePitchData, usePresence, useGroups, useAllPitches,
  useActiveGroupIds, useAllInvestors,
  restartCurrentPitch, setGamePhase, startPitchForGroup, endPitch,
  initInvestors, resetEverything, GROUP_IDS,
} from '@/hooks/useGameState';
import { useAnimQueue } from '@/hooks/useAnimQueue';
import LedBar from '@/components/LedBar';
import NumberRoller from '@/components/NumberRoller';
import RiceRadar from '@/components/RiceRadar';
import VictoryEffect from '@/components/VictoryEffect';
import QRModal from '@/components/QRModal';
import GroupEditor from '@/components/GroupEditor';
import GroupPresence from '@/components/GroupPresence';
import Leaderboard from '@/components/Leaderboard';
import type { PitchData, GroupConfig, Presence } from '@/lib/types';

const TOTAL_SEGMENTS = 20;
const TARGET_SEGMENT = 15;

const C = {
  amber: '#D4850C',
  gold:  '#C09818',
  green: '#1A9952',
  blue:  '#1499AA',
  red:   '#C42430',
};

// ── Teacher Page ─────────────────────────────────────────────────────────────
export default function TeacherPage() {
  const gameState      = useGameState();
  const groups         = useGroups();
  const presence       = usePresence();
  const allPitches     = useAllPitches();
  const activeGroupIds = useActiveGroupIds();
  const allInvestors   = useAllInvestors();
  const pitchData      = usePitchData(gameState?.currentPitchGroupId ?? null);
  const targetAmount   = gameState?.targetAmount ?? 1_500_000;

  const { litSegments, displayedRaised, reset } = useAnimQueue(
    gameState?.currentPitchGroupId ?? null,
    targetAmount,
    TOTAL_SEGMENTS
  );

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Control state (mirrors gameState, allows local edits before applying)
  const [selectedGroupId, setSelectedGroupId] = useState('1');
  const [localTarget, setLocalTarget]         = useState(1_500_000);
  const [localRice, setLocalRice]             = useState(true);
  const [loading, setLoading]                 = useState(false);
  const [statusMsg, setStatusMsg]             = useState('');

  // Overlays
  const [showVictory, setShowVictory] = useState(false);
  const [celebrated, setCelebrated]   = useState(false);
  const [showQR, setShowQR]           = useState(false);
  const [showEditor, setShowEditor]   = useState(false);

  // Sync from Firebase
  useEffect(() => {
    if (gameState?.targetAmount) setLocalTarget(gameState.targetAmount);
  }, [gameState?.targetAmount]);

  useEffect(() => {
    if (gameState?.riceEnabled !== undefined) setLocalRice(gameState.riceEnabled);
  }, [gameState?.riceEnabled]);

  // Victory
  useEffect(() => {
    if (litSegments >= TARGET_SEGMENT && !celebrated && displayedRaised > 0) {
      setShowVictory(true);
      setCelebrated(true);
    }
  }, [litSegments, celebrated, displayedRaised]);

  useEffect(() => {
    setShowVictory(false);
    setCelebrated(false);
  }, [gameState?.currentPitchGroupId]);

  const flash = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleStartPitch = async () => {
    setLoading(true);
    try {
      const gName = groups[selectedGroupId]?.name || `第${selectedGroupId}組`;
      reset(0);
      await startPitchForGroup(selectedGroupId, gName, localTarget, localRice);
      flash(`▶ 第${selectedGroupId}組 開始注金！`);
    } catch (_) {
      flash('❌ 操作失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleEndPitch = async () => {
    setLoading(true);
    try {
      await endPitch(gameState?.currentPitchGroupId ?? '');
      flash('⏹ 注金結束');
    } catch (_) {
      flash('❌ 操作失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleRestartPitch = useCallback(async () => {
    if (!gameState?.currentPitchGroupId) return;
    if (!confirm('確定重新開始？此組所有注金與 RICE 分數將歸零。')) return;
    reset(0);
    setCelebrated(false);
    setShowVictory(false);
    await restartCurrentPitch(gameState.currentPitchGroupId);
    flash('🔄 已重新開始');
  }, [gameState?.currentPitchGroupId, reset]);

  const handleInitInvestors = async () => {
    setLoading(true);
    try {
      await initInvestors();
      flash('✅ 已初始化 9 組投資人');
    } catch (_) {
      flash('❌ 初始化失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('確定重新開始？\n所有交易、注金紀錄、投資人資金將全部重置。')) return;
    setLoading(true);
    try {
      await resetEverything(activeGroupIds);
      reset(0);
      flash('🔄 已全部重置');
    } catch (_) {
      flash('❌ 操作失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRice = async () => {
    const next = !localRice;
    setLocalRice(next);
    await setGamePhase({ riceEnabled: next });
  };

  const isWaiting  = !gameState || gameState.phase === 'waiting';
  const isPitching = gameState?.phase === 'pitching';
  const isSuccess  = litSegments >= TARGET_SEGMENT;

  const currentGroupName =
    groups[gameState?.currentPitchGroupId ?? '']?.name ||
    gameState?.pitchGroupName ||
    gameState?.currentPitchGroupId || '—';

  return (
    <main className="h-screen flex overflow-hidden" style={{ background: '#080808', color: '#ccc' }}>

      {/* ── Collapsible Left Sidebar ── */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            key="sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 268, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="flex-shrink-0 overflow-hidden h-full"
            style={{ borderRight: '1px solid #161616', background: '#060606' }}
          >
            <div className="w-[268px] h-full flex flex-col overflow-y-auto p-4 gap-4">

              {/* Brand */}
              <div className="pt-1">
                <div className="text-sm font-display font-black tracking-widest" style={{ color: C.amber }}>
                  🦈 SHARK TANK
                </div>
                <div className="text-xs font-mono mt-0.5" style={{ color: '#444' }}>老師控制台</div>
              </div>

              {/* Status pill */}
              <div
                className="rounded-lg px-3 py-2"
                style={{ background: '#0e0e0e', border: '1px solid #1a1a1a' }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: isPitching ? C.green : '#333' }}
                  />
                  <span className="text-xs font-mono" style={{ color: isPitching ? C.green : '#555' }}>
                    {isPitching ? 'LIVE' : 'STANDBY'}
                  </span>
                  {isPitching && (
                    <span className="text-xs font-mono ml-auto" style={{ color: '#666' }}>
                      第{gameState?.currentPitchGroupId}組
                    </span>
                  )}
                </div>
              </div>

              {/* Group picker */}
              <div>
                <div className="text-xs font-mono mb-2" style={{ color: '#555' }}>選擇組別</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {activeGroupIds.map((id) => {
                    const pitch = allPitches[id];
                    const raised = pitch?.totalRaised ?? 0;
                    const tgt    = pitch?.targetAmount ?? 0;
                    const success = raised > 0 && tgt > 0 && raised >= tgt;
                    const done    = raised > 0;
                    const isCurrent  = isPitching && gameState?.currentPitchGroupId === id;
                    const isSelected = selectedGroupId === id;

                    return (
                      <button
                        key={id}
                        onClick={() => !isCurrent && setSelectedGroupId(id)}
                        className="relative py-2.5 rounded-lg text-sm font-display font-bold"
                        style={{
                          background: isCurrent ? '#0a1a08' : isSelected ? '#141008' : '#0a0a0a',
                          color: isCurrent ? C.green : isSelected ? C.amber : done ? '#555' : '#666',
                          border: `1px solid ${isCurrent ? '#1a3a10' : isSelected ? '#2a2008' : done ? '#1e1e1e' : '#161616'}`,
                          cursor: isCurrent ? 'default' : 'pointer',
                        }}
                      >
                        {id}
                        {/* Dot: success = red, current = amber, done = dim */}
                        {(done || isCurrent) && (
                          <span
                            className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                            style={{ background: success ? C.red : isCurrent ? C.amber : '#383838' }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
                {(groups[selectedGroupId]?.name || groups[selectedGroupId]?.topic) && (
                  <div className="mt-1.5 text-xs font-mono px-0.5" style={{ color: '#444' }}>
                    {groups[selectedGroupId]?.name}
                    {groups[selectedGroupId]?.topic && (
                      <span style={{ color: '#333' }}> · {groups[selectedGroupId].topic}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Target slider */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-mono" style={{ color: '#555' }}>募資目標</span>
                  <span className="text-xs font-mono" style={{ color: C.amber }}>
                    ${(localTarget / 10_000).toFixed(0)}萬
                  </span>
                </div>
                <input
                  type="range" min={500_000} max={3_000_000} step={100_000}
                  value={localTarget}
                  onChange={(e) => setLocalTarget(Number(e.target.value))}
                  className="w-full"
                  style={{ accentColor: C.amber }}
                />
                <div className="flex justify-between text-xs font-mono mt-0.5" style={{ color: '#333' }}>
                  <span>50萬</span><span>300萬</span>
                </div>
              </div>

              {/* RICE toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono" style={{ color: localRice ? '#aaa' : '#555' }}>
                  RICE 評分
                </span>
                <button
                  onClick={handleToggleRice}
                  className="w-10 h-5 rounded-full relative"
                  style={{
                    background: localRice ? '#0e2010' : '#141414',
                    border: `1px solid ${localRice ? '#1e3a1e' : '#222'}`,
                  }}
                >
                  <motion.div
                    className="absolute top-0.5 w-4 h-4 rounded-full"
                    style={{ background: localRice ? C.green : '#2a2a2a' }}
                    animate={{ left: localRice ? '46%' : '2px' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>

              {/* Start button */}
              <motion.button
                onClick={handleStartPitch}
                disabled={loading || isPitching}
                className="w-full py-3 rounded-xl font-display font-black text-base tracking-wider"
                style={{
                  background: isPitching
                    ? '#141414'
                    : 'linear-gradient(135deg, #9a5808, #C07010)',
                  color: isPitching ? '#333' : '#f0e0b0',
                  opacity: loading ? 0.6 : 1,
                }}
                whileTap={{ scale: 0.97 }}
              >
                {isPitching ? '● 注金進行中' : '▶ 開始注金'}
              </motion.button>

              {/* End / Restart buttons */}
              {isPitching && (
                <div className="flex gap-2">
                  <motion.button
                    onClick={handleEndPitch}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl font-mono text-sm font-bold"
                    style={{ background: '#140808', border: '1px solid #2a1010', color: '#C04040' }}
                    whileTap={{ scale: 0.96 }}
                  >
                    ⏹ 結束注金
                  </motion.button>
                  <motion.button
                    onClick={handleRestartPitch}
                    disabled={loading}
                    className="px-3 py-2.5 rounded-xl font-mono text-sm font-bold"
                    style={{ background: '#0a0a14', border: '1px solid #1a1a2a', color: '#666' }}
                    whileTap={{ scale: 0.96 }}
                  >
                    🔄
                  </motion.button>
                </div>
              )}

              {/* Divider */}
              <div style={{ borderTop: '1px solid #141414' }} />

              {/* Utility buttons */}
              <div className="space-y-1.5">
                <SideBtn onClick={() => setShowEditor(true)} label="✏️ 編輯組別名稱" />
                <SideBtn onClick={() => setShowQR(true)} label="📱 顯示 QR 碼" />
                <SideBtn
                  onClick={handleInitInvestors}
                  label="🎲 初始化投資人（各 $3M）"
                  accent="green"
                />
                <SideBtn
                  onClick={handleReset}
                  label="🔄 重新開始"
                  accent="red"
                />
              </div>

              {/* Status message */}
              {statusMsg && (
                <div className="text-xs font-mono text-center" style={{ color: C.amber }}>
                  {statusMsg}
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <header
          className="flex items-center gap-3 px-4 py-2.5 shrink-0"
          style={{ borderBottom: '1px solid #141414' }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-base font-mono shrink-0"
            style={{ background: '#111', border: '1px solid #1e1e1e', color: '#666' }}
          >
            ☰
          </button>
          <span className="text-sm font-display font-black tracking-widest" style={{ color: C.amber }}>
            SHARK TANK ARENA
          </span>
          <div
            className="text-xs font-mono px-2 py-0.5 rounded border ml-1"
            style={{
              color: isPitching ? C.green : '#444',
              borderColor: isPitching ? '#1a3a20' : '#1e1e1e',
              background: isPitching ? '#060e06' : 'transparent',
            }}
          >
            {isWaiting ? '● STANDBY' : '● LIVE'}
          </div>
        </header>

        {/* Body */}
        {isWaiting ? (
          <WaitingScreen
            allPitches={allPitches}
            groups={groups}
            presence={presence}
            activeGroupIds={activeGroupIds}
          />
        ) : (
          <div className="flex flex-1 overflow-hidden min-h-0">

            {/* ── Center: leaderboard + pitch detail ── */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">

              {/* Leaderboard strip (top) */}
              <Leaderboard
                allPitches={allPitches}
                groups={groups}
                activeGroupIds={activeGroupIds}
                currentPitchGroupId={gameState?.currentPitchGroupId}
              />

              {/* Lower content: info col + radar col */}
              <div className="flex flex-1 overflow-hidden min-h-0">

                {/* Left info column */}
                <div
                  className="flex flex-col gap-3 p-4 overflow-y-auto shrink-0"
                  style={{ width: '230px', borderRight: '1px solid #141414' }}
                >
                  {/* Pitch info */}
                  <div
                    className="rounded-xl p-3"
                    style={{ background: '#0e0e0e', border: '1px solid #1e1e1e' }}
                  >
                    <div className="text-xs font-mono mb-0.5" style={{ color: '#444' }}>當前注金組</div>
                    <div className="text-xl font-display font-black" style={{ color: C.amber }}>
                      第{gameState?.currentPitchGroupId}組
                      {groups[gameState?.currentPitchGroupId ?? '']?.name && (
                        <span> · {groups[gameState?.currentPitchGroupId ?? '']?.name}</span>
                      )}
                    </div>
                    {groups[gameState?.currentPitchGroupId ?? '']?.topic && (
                      <div className="text-xs font-mono mt-1" style={{ color: '#555' }}>
                        {groups[gameState?.currentPitchGroupId ?? '']?.topic}
                      </div>
                    )}
                    <div className="text-xs font-mono mt-1.5" style={{ color: C.red }}>
                      目標 ${targetAmount.toLocaleString()}
                    </div>
                  </div>

                  {/* Amount */}
                  <div
                    className="rounded-xl p-3"
                    style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}
                  >
                    <div className="text-xs font-mono mb-0.5" style={{ color: '#444' }}>總注金金額</div>
                    <NumberRoller
                      value={displayedRaised}
                      className="text-4xl"
                      style={{ color: isSuccess ? C.red : C.gold, letterSpacing: '0.02em' }}
                    />
                    <div className="mt-0.5 text-xs font-mono" style={{ color: '#555' }}>
                      / ${targetAmount.toLocaleString()}
                    </div>
                  </div>

                  {/* Group presence */}
                  <div
                    className="rounded-xl px-3 py-2.5"
                    style={{ background: '#0a0a0a', border: '1px solid #161616' }}
                  >
                    <GroupPresence
                      presence={presence}
                      groups={groups}
                      investors={allInvestors}
                      activeGroupIds={activeGroupIds}
                    />
                  </div>
                </div>

                {/* Right radar column */}
                {localRice ? (
                  <div className="flex-1 flex flex-col p-4 overflow-hidden min-w-0">
                    <div
                      className="flex-1 rounded-xl p-4 min-h-0"
                      style={{ background: '#0e0e0e', border: '1px solid #1e1e1e' }}
                    >
                      <RiceRadar pitchData={pitchData} />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1" />
                )}
              </div>
            </div>

            {/* ── Right: LED bar ── */}
            <div
              className="w-44 flex items-stretch shrink-0"
              style={{ borderLeft: '1px solid #141414', background: '#050505' }}
            >
              <div className="flex-1 flex items-center justify-center py-8 relative">
                <LedBar
                  litSegments={litSegments}
                  targetSegment={TARGET_SEGMENT}
                  totalRaised={displayedRaised}
                  targetAmount={targetAmount}
                  isSuccess={isSuccess}
                />
                <ScanLine />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overlays */}
      <VictoryEffect show={showVictory} onComplete={() => setShowVictory(false)} />
      <QRModal open={showQR} onClose={() => setShowQR(false)} />
      <GroupEditor
        open={showEditor}
        onClose={() => setShowEditor(false)}
        initialGroups={groups}
        initialActiveIds={activeGroupIds}
      />
    </main>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SideBtn({
  onClick,
  label,
  accent,
}: {
  onClick: () => void;
  label: string;
  accent?: 'green' | 'red';
}) {
  const styles = {
    green: { bg: '#060e06', border: '#142014', color: '#4a7a4a' },
    red:   { bg: '#0e0606', border: '#201414', color: '#7a4444' },
    base:  { bg: '#0a0a0a', border: '#181818', color: '#777' },
  };
  const s = accent ? styles[accent] : styles.base;
  return (
    <button
      onClick={onClick}
      className="w-full py-2 px-3 rounded-lg text-xs font-mono text-left"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
    >
      {label}
    </button>
  );
}

function WaitingScreen({
  allPitches,
  groups,
  presence,
  activeGroupIds,
}: {
  allPitches: Record<string, PitchData>;
  groups: Record<string, GroupConfig>;
  presence: Record<string, Presence>;
  activeGroupIds: string[];
}) {
  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Leaderboard (if any completed) */}
      <Leaderboard allPitches={allPitches} groups={groups} activeGroupIds={activeGroupIds} />

      <div className="flex flex-col items-center justify-center gap-8 p-6 flex-1">
      {/* Ambient title */}
      <motion.div
        animate={{ opacity: [0.25, 0.6, 0.25] }}
        transition={{ duration: 3.5, repeat: Infinity }}
        className="text-center"
      >
        <div className="text-5xl font-display font-black tracking-widest" style={{ color: '#1e1e1e' }}>
          SHARK TANK
        </div>
        <div className="text-xs font-mono mt-3 tracking-[0.25em]" style={{ color: '#333' }}>
          等待注金 · 請使用左側控制台選擇組別
        </div>
      </motion.div>

      {/* Group status grid */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-lg">
        {activeGroupIds.map((id) => {
          const pitch   = allPitches[id];
          const raised  = pitch?.totalRaised ?? 0;
          const tgt     = pitch?.targetAmount ?? 0;
          const success = raised > 0 && tgt > 0 && raised >= tgt;
          const done    = raised > 0;
          const now = Date.now();
          const isOnline = presence[id] && now - presence[id].lastSeen < 120_000;

          return (
            <div
              key={id}
              className="rounded-xl p-3"
              style={{
                background: success ? '#0f0808' : done ? '#0c0c08' : '#0a0a0a',
                border: `1px solid ${success ? '#3a1010' : done ? '#2a2810' : '#161616'}`,
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className="text-sm font-display font-black"
                  style={{ color: success ? C.red : done ? C.amber : '#444' }}
                >
                  第{id}組
                </span>
                <div className="flex items-center gap-1.5">
                  {isOnline && (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#1A5530' }} />
                  )}
                  {success && (
                    <span className="text-xs font-mono" style={{ color: C.red }}>✓</span>
                  )}
                </div>
              </div>

              {done ? (
                <>
                  <div
                    className="text-lg font-display font-black"
                    style={{ color: success ? C.red : C.gold }}
                  >
                    ${(raised / 10_000).toFixed(0)}萬
                  </div>
                  {tgt > 0 && (
                    <div className="text-xs font-mono mt-0.5" style={{ color: '#444' }}>
                      / {(tgt / 10_000).toFixed(0)}萬
                    </div>
                  )}
                  {success && (
                    <div className="text-xs font-mono mt-1" style={{ color: '#C42430' }}>
                      募資成功
                    </div>
                  )}
                </>
              ) : (
                <div className="text-xs font-mono" style={{ color: '#2a2a2a' }}>未開始</div>
              )}

              {groups[id]?.name && (
                <div className="text-xs font-mono mt-1 truncate" style={{ color: '#383838' }}>
                  {groups[id].name}
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

function ScanLine() {
  return (
    <motion.div
      className="absolute left-0 right-0 h-px pointer-events-none"
      style={{ background: 'rgba(20,100,130,0.1)' }}
      animate={{ top: ['8%', '92%', '8%'] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
    />
  );
}
