'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import {
  useGameState, usePitchData, usePresence, useGroups, useAllPitches,
  useActiveGroupIds, useAllInvestors,
  restartCurrentPitch, setGamePhase, startPitchForGroup, endPitch,
  initInvestors, resetEverything, GROUP_IDS, TEACHER_INVESTOR_ID,
} from '@/hooks/useGameState';
import { useAnimQueue } from '@/hooks/useAnimQueue';
import LedBar from '@/components/LedBar';
import NumberRoller from '@/components/NumberRoller';
import { groupColor, groupMeta, fade, SUCCESS } from '@/lib/groupColors';
import RiceRadar from '@/components/RiceRadar';
import VictoryEffect from '@/components/VictoryEffect';
import QRModal from '@/components/QRModal';
import GroupEditor from '@/components/GroupEditor';
import GroupPresence from '@/components/GroupPresence';
import Leaderboard from '@/components/Leaderboard';
import type { PitchData, GroupConfig, Presence } from '@/lib/types';

const TOTAL_SEGMENTS = 20;
const TARGET_SEGMENT = 15;
const TANK_MAX = 3_000_000; // 注金池滿刻度 300萬

const C = {
  amber: '#D4850C',
  gold:  '#C09818',
  green: '#1A9952',
  blue:  '#1499AA',
  red:   '#C42430',
};

// ── Teacher Page ─────────────────────────────────────────────────────────────
export default function TeacherPage() {
  const [sessionId, setSessionId] = useState('');
  const [hydrated, setHydrated] = useState(false);

  // Read session from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('session') ?? '';
    setSessionId(sid);
    setHydrated(true);
  }, []);

  const gameState      = useGameState(sessionId);
  const groups         = useGroups(sessionId);
  const presence       = usePresence(sessionId);
  const allPitches     = useAllPitches(sessionId);
  const activeGroupIds = useActiveGroupIds(sessionId);
  const allInvestors   = useAllInvestors(sessionId);
  const pitchData      = usePitchData(sessionId, gameState?.currentPitchGroupId ?? null);
  const targetAmount   = gameState?.targetAmount ?? 1_500_000;

  const { litSegments, displayedRaised, processingTx, reset } = useAnimQueue(
    sessionId,
    gameState?.currentPitchGroupId ?? null,
    targetAmount,
    TOTAL_SEGMENTS
  );

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Control state
  const [selectedGroupId, setSelectedGroupId] = useState('1');
  const [localTarget, setLocalTarget]         = useState(1_500_000);
  const [localRice, setLocalRice]             = useState(true);
  const [loading, setLoading]                 = useState(false);
  const [statusMsg, setStatusMsg]             = useState('');

  // Overlays
  const [showVictory, setShowVictory] = useState(false);
  const [celebrated, setCelebrated]   = useState(false);
  const [showQR, setShowQR]           = useState(false);
  const [showTeacherQR, setShowTeacherQR] = useState(false);
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
      await startPitchForGroup(sessionId, selectedGroupId, gName, localTarget, localRice);
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
      await endPitch(sessionId, gameState?.currentPitchGroupId ?? '');
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
    await restartCurrentPitch(sessionId, gameState.currentPitchGroupId);
    flash('🔄 已重新開始');
  }, [sessionId, gameState?.currentPitchGroupId, reset]);

  const handleInitInvestors = async () => {
    setLoading(true);
    try {
      await initInvestors(sessionId);
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
      await resetEverything(sessionId, activeGroupIds);
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
    await setGamePhase(sessionId, { riceEnabled: next });
  };

  // No session → redirect to home
  if (hydrated && !sessionId) {
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: '#080808' }}
      >
        <div className="text-sm font-mono" style={{ color: '#555' }}>未指定場次</div>
        <Link
          href="/"
          className="text-sm font-mono underline"
          style={{ color: '#D4850C' }}
        >
          ← 返回場次管理
        </Link>
      </main>
    );
  }

  if (!hydrated) return null;

  const isWaiting  = !gameState || gameState.phase === 'waiting';
  const isPitching = gameState?.phase === 'pitching';
  const isSuccess  = litSegments >= TARGET_SEGMENT;

  const activeId       = gameState?.currentPitchGroupId ?? '';
  const activeColor    = groupColor(activeId);
  const activeTag      = groupMeta(activeId).tag;
  const progressPct    = Math.min(999, Math.round((displayedRaised / targetAmount) * 100));
  const remaining      = Math.max(0, targetAmount - displayedRaised);
  const near           = progressPct >= 82 && !isSuccess;

  const currentGroupName =
    groups[gameState?.currentPitchGroupId ?? '']?.name ||
    gameState?.pitchGroupName ||
    gameState?.currentPitchGroupId || '—';

  return (
    <main
      className="h-screen flex overflow-hidden"
      style={{
        background:
          'radial-gradient(120% 100% at 50% 0%, #0d1020 0%, #06070d 60%, #04050a 100%)',
        color: '#eef2f7',
      }}
    >

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

              {/* Brand + back link */}
              <div className="pt-1">
                <div
                  className="text-base font-fr font-black tracking-widest"
                  style={{
                    background: 'linear-gradient(90deg,#ffe07a,#ff7a45)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  ▲ FUND RUSH
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="text-xs font-mono" style={{ color: '#444' }}>老師控制台</div>
                  <Link
                    href="/"
                    className="text-xs font-mono ml-auto"
                    style={{ color: '#333' }}
                  >
                    ← 場次
                  </Link>
                </div>
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
                  onClick={() => setShowTeacherQR(true)}
                  label="🎤 講師投資 QR（獨立一組）"
                  accent="green"
                />
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
          className="flex items-center gap-3 px-5 shrink-0"
          style={{
            height: '64px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            background: 'linear-gradient(180deg, rgba(10,14,26,0.85), rgba(10,14,26,0.2))',
            backdropFilter: 'blur(4px)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-base font-fr-mono shrink-0"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#9aa3b2' }}
          >
            ☰
          </button>
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, #ffd34e, #ff6a3d)',
              boxShadow: '0 0 24px rgba(255,150,60,0.5)',
            }}
          >
            <span style={{ color: '#1a1206', fontSize: '16px' }}>▲</span>
          </div>
          <div className="flex flex-col leading-none shrink-0">
            <span
              className="font-fr"
              style={{
                fontWeight: 900,
                fontSize: '20px',
                letterSpacing: '3px',
                whiteSpace: 'nowrap',
                background: 'linear-gradient(90deg,#ffe07a,#ff7a45)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              FUND RUSH
            </span>
            <span
              className="font-fr-mono"
              style={{ fontSize: '10px', letterSpacing: '5px', color: 'rgba(238,242,247,0.45)', marginTop: '3px' }}
            >
              資本擂台 ARENA
            </span>
          </div>

          {/* status */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] ml-2"
            style={{
              background: isPitching ? 'rgba(255,76,76,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${isPitching ? 'rgba(255,76,76,0.5)' : 'rgba(255,255,255,0.12)'}`,
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: isPitching ? '#ff4c4c' : 'rgba(238,242,247,0.5)',
                boxShadow: isPitching ? '0 0 12px #ff4c4c' : 'none',
                animation: isPitching ? 'fr-dot 1.1s infinite' : 'none',
              }}
            />
            <span className="font-fr-mono" style={{ fontWeight: 700, letterSpacing: '3px', fontSize: '12px' }}>
              {isWaiting ? 'STANDBY' : 'LIVE'}
            </span>
          </div>

          {isPitching && (
            <div
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-[10px]"
              style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}
            >
              <span className="font-fr-mono" style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(238,242,247,0.5)' }}>
                注金中
              </span>
              <span className="font-fr" style={{ fontWeight: 800, fontSize: '14px', color: activeColor }}>
                {currentGroupName}
              </span>
            </div>
          )}
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
          <div className="flex flex-col flex-1 overflow-hidden min-h-0 relative">

            {/* ambient grid + tinted glow behind the arena */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)',
                backgroundSize: '64px 64px',
                animation: 'fr-drift 16s linear infinite',
                opacity: 0.5,
              }}
            />
            <div
              className="absolute pointer-events-none"
              style={{
                top: '6%',
                left: '50%',
                width: '700px',
                height: '700px',
                transform: 'translateX(-50%)',
                background: `radial-gradient(circle, ${fade(activeColor, 12)}, transparent 70%)`,
                transition: 'background .6s',
              }}
            />

            {/* Leaderboard strip (standings) */}
            <div className="relative z-10">
              <Leaderboard
                allPitches={allPitches}
                groups={groups}
                activeGroupIds={activeGroupIds}
                currentPitchGroupId={gameState?.currentPitchGroupId}
              />
            </div>

            {/* ── Arena row ── */}
            <div className="relative z-10 flex flex-1 min-h-0 gap-6 px-8 py-6 overflow-hidden">

              {/* LEFT: pitch info + presence */}
              <div className="w-[264px] flex-none flex flex-col gap-4 overflow-y-auto">
                <div
                  className="rounded-2xl p-4"
                  style={{
                    background: `linear-gradient(180deg, ${fade(activeColor, 10)}, rgba(255,255,255,0.02))`,
                    border: `1px solid ${fade(activeColor, 40)}`,
                    borderLeft: `3px solid ${activeColor}`,
                  }}
                >
                  <div className="font-fr-mono" style={{ fontSize: '11px', letterSpacing: '3px', color: 'rgba(238,242,247,0.45)' }}>
                    當前注金組
                  </div>
                  <div className="font-fr mt-1" style={{ fontWeight: 900, fontSize: '26px', color: '#fff', lineHeight: 1.05 }}>
                    {currentGroupName}
                  </div>
                  <div className="font-fr-mono mt-1" style={{ fontSize: '11px', letterSpacing: '2px', color: activeColor }}>
                    {activeTag}
                  </div>
                  {groups[activeId]?.topic && (
                    <div className="font-fr-mono mt-2" style={{ fontSize: '11px', color: 'rgba(238,242,247,0.5)' }}>
                      {groups[activeId].topic}
                    </div>
                  )}
                  <div
                    className="font-fr-mono mt-3 pt-3"
                    style={{ fontSize: '12px', letterSpacing: '1px', color: 'rgba(238,242,247,0.55)', borderTop: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    募資目標 <span style={{ color: '#fff', fontWeight: 700 }}>${targetAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div
                  className="rounded-2xl px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.022)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <GroupPresence
                    presence={presence}
                    groups={groups}
                    investors={allInvestors}
                    activeGroupIds={activeGroupIds}
                  />
                </div>
              </div>

              {/* CENTER: giant number stack + money column (the centerpiece) */}
              <div className="flex-1 flex items-stretch justify-center gap-10 min-w-0">

                {/* number stack */}
                <div className="flex-1 flex flex-col justify-center gap-5 min-w-0" style={{ maxWidth: '760px' }}>
                  <div className="flex items-center gap-3">
                    <span
                      className="font-fr"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '5px 14px',
                        borderRadius: '9px',
                        fontWeight: 800,
                        fontSize: '18px',
                        color: '#0a0c14',
                        background: activeColor,
                        boxShadow: `0 0 20px ${fade(activeColor, 50)}`,
                      }}
                    >
                      {currentGroupName}
                    </span>
                    <span className="font-fr-mono" style={{ fontSize: '13px', letterSpacing: '4px', color: 'rgba(238,242,247,0.5)' }}>
                      {activeTag} · 即時募資金額
                    </span>
                  </div>

                  <div className="relative">
                    <NumberRoller
                      value={displayedRaised}
                      className="font-fr"
                      style={{
                        fontWeight: 900,
                        fontSize: 'clamp(48px, 5vw, 92px)',
                        lineHeight: 0.9,
                        letterSpacing: '-1px',
                        whiteSpace: 'nowrap',
                        color: isSuccess ? SUCCESS : '#fff',
                        fontVariantNumeric: 'tabular-nums',
                        textShadow: '0 0 40px rgba(255,255,255,0.12)',
                      }}
                    />
                    <AnimatePresence>
                      {processingTx && (
                        <motion.div
                          key={processingTx.id}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: -6 }}
                          exit={{ opacity: 0, y: -30 }}
                          className="font-fr"
                          style={{
                            position: 'absolute',
                            top: '-6px',
                            right: 0,
                            fontWeight: 800,
                            fontSize: '32px',
                            color: SUCCESS,
                            textShadow: `0 0 18px ${fade(SUCCESS, 60)}`,
                          }}
                        >
                          +{Math.round(processingTx.amount / 10_000)}萬
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex items-end gap-7">
                    <div className="flex flex-col leading-tight">
                      <span className="font-fr-mono" style={{ fontSize: '12px', letterSpacing: '3px', color: 'rgba(238,242,247,0.4)' }}>
                        募資目標
                      </span>
                      <span className="font-fr" style={{ fontWeight: 700, fontSize: '28px', color: 'rgba(238,242,247,0.7)', fontVariantNumeric: 'tabular-nums' }}>
                        ${targetAmount.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ width: '1px', height: '42px', background: 'rgba(255,255,255,0.12)' }} />
                    <div className="flex flex-col items-start leading-none">
                      <span className="font-fr-mono" style={{ fontSize: '12px', letterSpacing: '3px', color: 'rgba(238,242,247,0.4)' }}>
                        達標進度
                      </span>
                      <span
                        className="font-fr"
                        style={{
                          fontWeight: 900,
                          fontSize: '46px',
                          lineHeight: 1,
                          color: isSuccess ? SUCCESS : activeColor,
                          fontVariantNumeric: 'tabular-nums',
                          textShadow: `0 0 26px ${fade(isSuccess ? SUCCESS : activeColor, 45)}`,
                        }}
                      >
                        {progressPct}%
                      </span>
                    </div>
                  </div>

                  {/* progress rail */}
                  <div
                    className="relative"
                    style={{
                      height: '16px',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      overflow: 'hidden',
                      maxWidth: '560px',
                    }}
                  >
                    <motion.div
                      animate={{ width: `${Math.min(100, progressPct)}%` }}
                      transition={{ type: 'spring', stiffness: 90, damping: 20 }}
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: 0,
                        background: `linear-gradient(90deg, ${fade(isSuccess ? SUCCESS : activeColor, 55)}, ${isSuccess ? SUCCESS : activeColor})`,
                        borderRadius: '10px',
                        boxShadow: `0 0 16px ${fade(isSuccess ? SUCCESS : activeColor, 55)}`,
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-4" style={{ maxWidth: '560px' }}>
                    <span className="font-fr" style={{ fontWeight: 700, fontSize: '20px', color: 'rgba(238,242,247,0.65)' }}>
                      {remaining > 0 ? `還差 $${remaining.toLocaleString()}` : '已突破目標'}
                    </span>
                    {near && (
                      <span
                        className="font-fr-mono"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '5px 14px',
                          borderRadius: '999px',
                          background: 'rgba(255,107,107,0.16)',
                          border: '1px solid rgba(255,107,107,0.45)',
                          color: '#ff8a8a',
                          fontWeight: 700,
                          fontSize: '12px',
                          letterSpacing: '3px',
                          animation: 'fr-warn 1s ease-in-out infinite',
                        }}
                      >
                        即將達標 · CLUTCH
                      </span>
                    )}
                  </div>
                </div>

                {/* money column */}
                <div className="w-[220px] flex-none py-2 relative">
                  <LedBar
                    litSegments={litSegments}
                    targetSegment={TARGET_SEGMENT}
                    totalRaised={displayedRaised}
                    targetAmount={targetAmount}
                    maxAmount={TANK_MAX}
                    isSuccess={isSuccess}
                    color={activeColor}
                  />
                  <ScanLine />
                </div>
              </div>

              {/* RIGHT: RICE radar (if enabled) */}
              {localRice && (
                <div className="w-[300px] flex-none flex flex-col">
                  <div
                    className="flex-1 rounded-2xl p-3 min-h-0"
                    style={{ background: 'rgba(255,255,255,0.022)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <RiceRadar pitchData={pitchData} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Overlays */}
      <VictoryEffect show={showVictory} onComplete={() => setShowVictory(false)} />
      <QRModal sessionId={sessionId} open={showQR} onClose={() => setShowQR(false)} />
      <QRModal
        sessionId={sessionId}
        open={showTeacherQR}
        onClose={() => setShowTeacherQR(false)}
        groupId={TEACHER_INVESTOR_ID}
        title="🎤 講師投資端 · 獨立一組"
        urlLabel="講師投資端網址"
        hint="掃描後可自行設定資金，並投資當前注金組"
      />
      <GroupEditor
        sessionId={sessionId}
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
      <Leaderboard allPitches={allPitches} groups={groups} activeGroupIds={activeGroupIds} />

      <div className="flex flex-col items-center justify-center gap-8 p-6 flex-1">
      <motion.div
        animate={{ opacity: [0.25, 0.6, 0.25] }}
        transition={{ duration: 3.5, repeat: Infinity }}
        className="text-center"
      >
        <div
          className="font-fr font-black tracking-widest"
          style={{
            fontSize: '88px',
            lineHeight: 0.9,
            background: 'linear-gradient(90deg, rgba(255,224,122,.08), rgba(255,122,69,.05))',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          FUND RUSH
        </div>
        <div className="font-fr-mono mt-3 tracking-[0.3em]" style={{ fontSize: '13px', color: 'rgba(238,242,247,0.4)' }}>
          等待注金 · 請使用左側控制台選擇組別開始
        </div>
      </motion.div>

      <div className="grid grid-cols-3 gap-3.5 w-full max-w-xl">
        {activeGroupIds.map((id) => {
          const pitch   = allPitches[id];
          const raised  = pitch?.totalRaised ?? 0;
          const tgt     = pitch?.targetAmount ?? 0;
          const success = raised > 0 && tgt > 0 && raised >= tgt;
          const done    = raised > 0;
          const now = Date.now();
          const isOnline = presence[id] && now - presence[id].lastSeen < 120_000;
          const color = groupColor(id);
          const pct = tgt > 0 ? Math.min(100, (raised / tgt) * 100) : 0;

          return (
            <div
              key={id}
              className="relative rounded-2xl p-3.5 overflow-hidden"
              style={{
                background: done
                  ? `linear-gradient(180deg, ${fade(color, 10)}, rgba(255,255,255,0.02))`
                  : 'rgba(255,255,255,0.02)',
                border: `1px solid ${done ? fade(color, 38) : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <div className="absolute top-0 left-0 right-0" style={{ height: '3px', background: done ? color : 'rgba(255,255,255,0.06)' }} />
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-fr font-black" style={{ fontSize: '17px', color: done ? '#fff' : 'rgba(238,242,247,0.4)' }}>
                  第{id}組
                </span>
                <div className="flex items-center gap-1.5">
                  {isOnline && (
                    <span className="w-2 h-2 rounded-full" style={{ background: SUCCESS, boxShadow: `0 0 8px ${SUCCESS}` }} />
                  )}
                  {success && <span className="font-fr-mono" style={{ fontSize: '11px', color: SUCCESS }}>✓</span>}
                </div>
              </div>

              {done ? (
                <>
                  <div className="font-fr font-black" style={{ fontSize: '22px', color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                    ${(raised / 10_000).toFixed(0)}萬
                  </div>
                  {tgt > 0 && (
                    <div className="h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${fade(color, 50)}, ${color})`, borderRadius: '5px' }} />
                    </div>
                  )}
                  {tgt > 0 && (
                    <div className="font-fr-mono mt-1" style={{ fontSize: '10px', color: 'rgba(238,242,247,0.35)' }}>
                      / {(tgt / 10_000).toFixed(0)}萬{success && <span style={{ color: SUCCESS }}> · 募資成功</span>}
                    </div>
                  )}
                </>
              ) : (
                <div className="font-fr-mono" style={{ fontSize: '11px', color: 'rgba(238,242,247,0.3)' }}>未開始</div>
              )}

              {groups[id]?.name && (
                <div className="font-fr-mono mt-1 truncate" style={{ fontSize: '10px', color: 'rgba(238,242,247,0.4)' }}>
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
      className="absolute left-0 right-0 pointer-events-none"
      style={{ height: '120px', background: 'linear-gradient(180deg, rgba(120,160,255,.06), transparent)' }}
      animate={{ top: ['-10%', '100%', '-10%'] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
    />
  );
}
