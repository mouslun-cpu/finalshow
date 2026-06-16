'use client';
import { useEffect, useState } from 'react';
import { ref, onValue, set, update, push, get, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { GameState, Investor, PitchData, Transaction, RiceScore, GroupConfig, Presence, Feedback } from '@/lib/types';

export const GROUP_IDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

// Special investor id for the teacher — an independent investor that can fund
// any group, with a self-configurable budget, but is never a "pitching group".
export const TEACHER_INVESTOR_ID = 'T';

export function sp(sessionId: string, path: string) {
  return `/sessions/${sessionId}/${path}`;
}

// ── Watch game state ──────────────────────────────────────────────────────
export function useGameState(sessionId: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  useEffect(() => {
    if (!sessionId) return;
    return onValue(ref(db, sp(sessionId, 'gameState')), (snap) => setGameState(snap.val()));
  }, [sessionId]);
  return gameState;
}

// ── Watch active group IDs ────────────────────────────────────────────────
export function useActiveGroupIds(sessionId: string) {
  const [ids, setIds] = useState<string[]>(GROUP_IDS);
  useEffect(() => {
    if (!sessionId) return;
    return onValue(ref(db, sp(sessionId, 'activeGroupIds')), (snap) => {
      setIds(snap.exists() ? (snap.val() as string[]) : GROUP_IDS);
    });
  }, [sessionId]);
  return ids;
}

export async function saveActiveGroupIds(sessionId: string, ids: string[]) {
  await set(ref(db, sp(sessionId, 'activeGroupIds')), ids);
}

// ── Watch all investors ───────────────────────────────────────────────────
export function useAllInvestors(sessionId: string) {
  const [investors, setInvestors] = useState<Record<string, Investor>>({});
  useEffect(() => {
    if (!sessionId) return;
    return onValue(ref(db, sp(sessionId, 'investors')), (snap) => {
      setInvestors(snap.val() ?? {});
    });
  }, [sessionId]);
  return investors;
}

// ── Watch all pitches ─────────────────────────────────────────────────────
export function useAllPitches(sessionId: string) {
  const [pitches, setPitches] = useState<Record<string, PitchData>>({});
  useEffect(() => {
    if (!sessionId) return;
    return onValue(ref(db, sp(sessionId, 'pitches')), (snap) => {
      setPitches(snap.val() ?? {});
    });
  }, [sessionId]);
  return pitches;
}

// ── Watch current pitch ───────────────────────────────────────────────────
export function usePitchData(sessionId: string, pitchGroupId: string | null) {
  const [pitch, setPitch] = useState<PitchData | null>(null);
  useEffect(() => {
    if (!sessionId || !pitchGroupId) return;
    return onValue(ref(db, sp(sessionId, `pitches/${pitchGroupId}`)), (snap) => setPitch(snap.val()));
  }, [sessionId, pitchGroupId]);
  return pitch;
}

// ── Watch all group configs ───────────────────────────────────────────────
export function useGroups(sessionId: string) {
  const [groups, setGroups] = useState<Record<string, GroupConfig>>({});
  useEffect(() => {
    if (!sessionId) return;
    return onValue(ref(db, sp(sessionId, 'groups')), (snap) => {
      setGroups(snap.val() ?? {});
    });
  }, [sessionId]);
  return groups;
}

// ── Watch presence ────────────────────────────────────────────────────────
export function usePresence(sessionId: string) {
  const [presence, setPresence] = useState<Record<string, Presence>>({});
  useEffect(() => {
    if (!sessionId) return;
    return onValue(ref(db, sp(sessionId, 'presence')), (snap) => {
      setPresence(snap.val() ?? {});
    });
  }, [sessionId]);
  return presence;
}

// ── Watch feedback (investor reasons / questions) ─────────────────────────
export function useFeedback(sessionId: string) {
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  useEffect(() => {
    if (!sessionId) return;
    return onValue(ref(db, sp(sessionId, 'feedback')), (snap) => {
      setFeedback(snap.val() ?? {});
    });
  }, [sessionId]);
  return feedback;
}

// ── Ping presence (student) ───────────────────────────────────────────────
export async function pingPresence(sessionId: string, groupId: string) {
  await set(ref(db, sp(sessionId, `presence/${groupId}`)), {
    lastSeen: Date.now(),
    groupId,
  });
}

// ── Watch investor ────────────────────────────────────────────────────────
export function useInvestor(sessionId: string, investorGroupId: string) {
  const [investor, setInvestor] = useState<Investor | null>(null);
  useEffect(() => {
    if (!sessionId || !investorGroupId) return;
    const r = ref(db, sp(sessionId, `investors/${investorGroupId}`));
    return onValue(r, async (snap) => {
      if (snap.exists()) {
        setInvestor(snap.val());
      } else {
        const defaultData: Investor = {
          remainingBudget: 3_000_000,
          groupName: investorGroupId,
          hasVotedCurrentPitch: false,
        };
        await set(r, defaultData);
        setInvestor(defaultData);
      }
    });
  }, [sessionId, investorGroupId]);
  return investor;
}

// ── Set an investor's budget (used by the teacher to self-set funds) ───────
export async function setInvestorBudget(
  sessionId: string,
  investorId: string,
  amount: number,
  groupName?: string
) {
  await update(ref(db, sp(sessionId, `investors/${investorId}`)), {
    remainingBudget: Math.max(0, Math.round(amount)),
    ...(groupName ? { groupName } : {}),
  });
}

// ── Submit investment ─────────────────────────────────────────────────────
export async function submitInvestment(
  sessionId: string,
  investorGroupId: string,
  pitchGroupId: string,
  amount: number,
  rice: RiceScore,
  reason = '',
  question = ''
) {
  const ts = Date.now();
  const txRef = push(ref(db, sp(sessionId, 'transactions')));
  await set(txRef, {
    investorGroupId,
    pitchGroupId,
    amount,
    riceR: rice.R,
    riceI: rice.I,
    riceC: rice.C,
    riceE: rice.E,
    timestamp: ts,
    animated: false,
    reason,
    question,
  });

  // Persist the written reason / question separately for the teacher view.
  if (reason || question) {
    await set(push(ref(db, sp(sessionId, 'feedback'))), {
      investorGroupId,
      pitchGroupId,
      reason,
      question,
      timestamp: ts,
    } satisfies Feedback);
  }

  const invSnap = await get(ref(db, sp(sessionId, `investors/${investorGroupId}`)));
  const invData = invSnap.val() as Investor;
  await update(ref(db, sp(sessionId, `investors/${investorGroupId}`)), {
    remainingBudget: invData.remainingBudget - amount,
    hasVotedCurrentPitch: true,
  });

  const pitchSnap = await get(ref(db, sp(sessionId, `pitches/${pitchGroupId}`)));
  const p = (pitchSnap.val() as PitchData) ?? {
    totalRaised: 0,
    riceScores: { R_total: 0, I_total: 0, C_total: 0, E_total: 0, voteCount: 0 },
  };
  await update(ref(db, sp(sessionId, `pitches/${pitchGroupId}`)), {
    totalRaised: (p.totalRaised ?? 0) + amount,
    riceScores: {
      R_total: (p.riceScores?.R_total ?? 0) + rice.R,
      I_total: (p.riceScores?.I_total ?? 0) + rice.I,
      C_total: (p.riceScores?.C_total ?? 0) + rice.C,
      E_total: (p.riceScores?.E_total ?? 0) + rice.E,
      voteCount: (p.riceScores?.voteCount ?? 0) + 1,
    },
  });
}

// ── Restart current pitch ─────────────────────────────────────────────────
export async function restartCurrentPitch(sessionId: string, pitchGroupId: string) {
  await update(ref(db, sp(sessionId, `pitches/${pitchGroupId}`)), {
    totalRaised: 0,
    riceScores: { R_total: 0, I_total: 0, C_total: 0, E_total: 0, voteCount: 0 },
  });

  const txSnap = await get(ref(db, sp(sessionId, 'transactions')));
  if (txSnap.exists()) {
    const all = txSnap.val() as Record<string, Transaction>;
    const updates: Record<string, boolean> = {};
    Object.entries(all).forEach(([id, tx]) => {
      if (tx.pitchGroupId === pitchGroupId) {
        updates[sp(sessionId, `transactions/${id}/animated`)] = true;
      }
    });
    if (Object.keys(updates).length > 0) await update(ref(db), updates);
  }

  await resetVotesForNewPitch(sessionId);
}

// ── Set game phase ────────────────────────────────────────────────────────
export async function setGamePhase(sessionId: string, state: Partial<GameState>) {
  await update(ref(db, sp(sessionId, 'gameState')), state);
}

// ── Reset investor votes ──────────────────────────────────────────────────
export async function resetVotesForNewPitch(sessionId: string) {
  const snap = await get(ref(db, sp(sessionId, 'investors')));
  if (!snap.exists()) return;
  const updates: Record<string, boolean> = {};
  Object.keys(snap.val()).forEach((id) => {
    updates[sp(sessionId, `investors/${id}/hasVotedCurrentPitch`)] = false;
  });
  await update(ref(db), updates);
}

// ── Initialize investors ──────────────────────────────────────────────────
export async function initInvestors(sessionId: string) {
  const updates: Record<string, unknown> = {};
  GROUP_IDS.forEach((g) => {
    updates[sp(sessionId, `investors/${g}`)] = {
      groupName: `第${g}組`,
      remainingBudget: 3_000_000,
      hasVotedCurrentPitch: false,
    };
  });
  await update(ref(db), updates);
}

// ── Start pitch ───────────────────────────────────────────────────────────
export async function startPitchForGroup(
  sessionId: string,
  groupId: string,
  groupName: string,
  targetAmount: number,
  riceEnabled: boolean
) {
  await set(ref(db, sp(sessionId, `pitches/${groupId}`)), {
    groupName,
    totalRaised: 0,
    riceScores: { R_total: 0, I_total: 0, C_total: 0, E_total: 0, voteCount: 0 },
    description: '',
    targetAmount,
    completed: false,
  });
  await update(ref(db, sp(sessionId, 'gameState')), {
    currentPitchGroupId: groupId,
    pitchGroupName: groupName,
    targetAmount,
    phase: 'pitching',
    riceEnabled,
  });
  await resetVotesForNewPitch(sessionId);
}

// ── End pitch ─────────────────────────────────────────────────────────────
export async function endPitch(sessionId: string, currentGroupId: string) {
  if (currentGroupId) {
    await update(ref(db, sp(sessionId, `pitches/${currentGroupId}`)), { completed: true });
  }
  await update(ref(db, sp(sessionId, 'gameState')), { phase: 'waiting', currentPitchGroupId: '' });
}

// ── Sync investors to active groups ──────────────────────────────────────
export async function syncInvestorsToActiveGroups(sessionId: string, activeIds: string[]) {
  const snap = await get(ref(db, sp(sessionId, 'investors')));
  const existing = (snap.val() ?? {}) as Record<string, unknown>;
  const updates: Record<string, unknown> = {};
  activeIds.forEach((g) => {
    if (!existing[g]) {
      updates[sp(sessionId, `investors/${g}`)] = {
        groupName: `第${g}組`,
        remainingBudget: 3_000_000,
        hasVotedCurrentPitch: false,
      };
    }
  });
  Object.keys(existing).forEach((g) => {
    if (g === TEACHER_INVESTOR_ID) return; // never remove the teacher investor
    if (!activeIds.includes(g)) updates[sp(sessionId, `investors/${g}`)] = null;
  });
  if (Object.keys(updates).length > 0) await update(ref(db), updates);
}

// ── Full reset ─────────────────────────────────────────────────────────────
export async function resetEverything(sessionId: string, activeGroupIds: string[]) {
  await remove(ref(db, sp(sessionId, 'transactions')));
  await remove(ref(db, sp(sessionId, 'pitches')));
  const updates: Record<string, unknown> = {
    [sp(sessionId, 'gameState')]: { phase: 'waiting', currentPitchGroupId: '', targetAmount: 1_500_000, riceEnabled: true },
  };
  activeGroupIds.forEach((g) => {
    updates[sp(sessionId, `investors/${g}`)] = {
      groupName: `第${g}組`,
      remainingBudget: 3_000_000,
      hasVotedCurrentPitch: false,
    };
  });
  await update(ref(db), updates);
}

// ── Save group config ─────────────────────────────────────────────────────
export async function saveGroupConfig(sessionId: string, groupId: string, config: GroupConfig) {
  await update(ref(db, sp(sessionId, `groups/${groupId}`)), config);
}

// ── Save all group configs ────────────────────────────────────────────────
export async function saveAllGroupConfigs(sessionId: string, configs: Record<string, GroupConfig>) {
  const updates: Record<string, string> = {};
  Object.entries(configs).forEach(([id, cfg]) => {
    updates[sp(sessionId, `groups/${id}/name`)] = cfg.name;
    updates[sp(sessionId, `groups/${id}/topic`)] = cfg.topic;
  });
  await update(ref(db), updates);
}
