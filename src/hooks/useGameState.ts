'use client';
import { useEffect, useState, useCallback } from 'react';
import { ref, onValue, set, update, push, get, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { GameState, Investor, PitchData, Transaction, RiceScore, GroupConfig, Presence } from '@/lib/types';

export const GROUP_IDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

// ── Watch game state ──────────────────────────────────────────────────────
export function useGameState() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  useEffect(() => {
    return onValue(ref(db, '/gameState'), (snap) => setGameState(snap.val()));
  }, []);
  return gameState;
}

// ── Watch active group IDs ────────────────────────────────────────────────
export function useActiveGroupIds() {
  const [ids, setIds] = useState<string[]>(GROUP_IDS);
  useEffect(() => {
    return onValue(ref(db, '/activeGroupIds'), (snap) => {
      setIds(snap.exists() ? (snap.val() as string[]) : GROUP_IDS);
    });
  }, []);
  return ids;
}

export async function saveActiveGroupIds(ids: string[]) {
  await set(ref(db, '/activeGroupIds'), ids);
}

// ── Watch all investors ───────────────────────────────────────────────────
export function useAllInvestors() {
  const [investors, setInvestors] = useState<Record<string, Investor>>({});
  useEffect(() => {
    return onValue(ref(db, '/investors'), (snap) => {
      setInvestors(snap.val() ?? {});
    });
  }, []);
  return investors;
}

// ── Watch all pitches ─────────────────────────────────────────────────────
export function useAllPitches() {
  const [pitches, setPitches] = useState<Record<string, PitchData>>({});
  useEffect(() => {
    return onValue(ref(db, '/pitches'), (snap) => {
      setPitches(snap.val() ?? {});
    });
  }, []);
  return pitches;
}

// ── Watch current pitch ───────────────────────────────────────────────────
export function usePitchData(pitchGroupId: string | null) {
  const [pitch, setPitch] = useState<PitchData | null>(null);
  useEffect(() => {
    if (!pitchGroupId) return;
    return onValue(ref(db, `/pitches/${pitchGroupId}`), (snap) => setPitch(snap.val()));
  }, [pitchGroupId]);
  return pitch;
}

// ── Watch all group configs ───────────────────────────────────────────────
export function useGroups() {
  const [groups, setGroups] = useState<Record<string, GroupConfig>>({});
  useEffect(() => {
    return onValue(ref(db, '/groups'), (snap) => {
      setGroups(snap.val() ?? {});
    });
  }, []);
  return groups;
}

// ── Watch presence ────────────────────────────────────────────────────────
export function usePresence() {
  const [presence, setPresence] = useState<Record<string, Presence>>({});
  useEffect(() => {
    return onValue(ref(db, '/presence'), (snap) => {
      setPresence(snap.val() ?? {});
    });
  }, []);
  return presence;
}

// ── Ping presence (student) ───────────────────────────────────────────────
export async function pingPresence(groupId: string) {
  await set(ref(db, `/presence/${groupId}`), {
    lastSeen: Date.now(),
    groupId,
  });
}

// ── Watch investor ────────────────────────────────────────────────────────
export function useInvestor(investorGroupId: string) {
  const [investor, setInvestor] = useState<Investor | null>(null);
  useEffect(() => {
    if (!investorGroupId) return;
    const r = ref(db, `/investors/${investorGroupId}`);
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
  }, [investorGroupId]);
  return investor;
}

// ── Submit investment ─────────────────────────────────────────────────────
export async function submitInvestment(
  investorGroupId: string,
  pitchGroupId: string,
  amount: number,
  rice: RiceScore
) {
  const txRef = push(ref(db, '/transactions'));
  await set(txRef, {
    investorGroupId,
    pitchGroupId,
    amount,
    riceR: rice.R,
    riceI: rice.I,
    riceC: rice.C,
    riceE: rice.E,
    timestamp: Date.now(),
    animated: false,
  });

  const invSnap = await get(ref(db, `/investors/${investorGroupId}`));
  const invData = invSnap.val() as Investor;
  await update(ref(db, `/investors/${investorGroupId}`), {
    remainingBudget: invData.remainingBudget - amount,
    hasVotedCurrentPitch: true,
  });

  const pitchSnap = await get(ref(db, `/pitches/${pitchGroupId}`));
  const p = (pitchSnap.val() as PitchData) ?? {
    totalRaised: 0,
    riceScores: { R_total: 0, I_total: 0, C_total: 0, E_total: 0, voteCount: 0 },
  };
  await update(ref(db, `/pitches/${pitchGroupId}`), {
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
export async function restartCurrentPitch(pitchGroupId: string) {
  // Reset pitch totals
  await update(ref(db, `/pitches/${pitchGroupId}`), {
    totalRaised: 0,
    riceScores: { R_total: 0, I_total: 0, C_total: 0, E_total: 0, voteCount: 0 },
  });

  // Mark all transactions for this pitch as animated (skip replay)
  const txSnap = await get(ref(db, '/transactions'));
  if (txSnap.exists()) {
    const all = txSnap.val() as Record<string, Transaction>;
    const updates: Record<string, boolean> = {};
    Object.entries(all).forEach(([id, tx]) => {
      if (tx.pitchGroupId === pitchGroupId) {
        updates[`/transactions/${id}/animated`] = true;
      }
    });
    if (Object.keys(updates).length > 0) await update(ref(db), updates);
  }

  // Reset investors
  await resetVotesForNewPitch();
}

// ── Set game phase ────────────────────────────────────────────────────────
export async function setGamePhase(state: Partial<GameState>) {
  await update(ref(db, '/gameState'), state);
}

// ── Reset investor votes ──────────────────────────────────────────────────
export async function resetVotesForNewPitch() {
  const snap = await get(ref(db, '/investors'));
  if (!snap.exists()) return;
  const updates: Record<string, boolean> = {};
  Object.keys(snap.val()).forEach((id) => {
    updates[`/investors/${id}/hasVotedCurrentPitch`] = false;
  });
  await update(ref(db), updates);
}

// ── Initialize investors (1–9) ────────────────────────────────────────────
export async function initInvestors() {
  const updates: Record<string, unknown> = {};
  GROUP_IDS.forEach((g) => {
    updates[`/investors/${g}`] = {
      groupName: `第${g}組`,
      remainingBudget: 3_000_000,
      hasVotedCurrentPitch: false,
    };
  });
  await update(ref(db), updates);
}

// ── Start pitch ───────────────────────────────────────────────────────────
export async function startPitchForGroup(
  groupId: string,
  groupName: string,
  targetAmount: number,
  riceEnabled: boolean
) {
  await set(ref(db, `/pitches/${groupId}`), {
    groupName,
    totalRaised: 0,
    riceScores: { R_total: 0, I_total: 0, C_total: 0, E_total: 0, voteCount: 0 },
    description: '',
    targetAmount,
    completed: false,
  });
  await update(ref(db, '/gameState'), {
    currentPitchGroupId: groupId,
    pitchGroupName: groupName,
    targetAmount,
    phase: 'pitching',
    riceEnabled,
  });
  await resetVotesForNewPitch();
}

// ── End pitch ─────────────────────────────────────────────────────────────
export async function endPitch(currentGroupId: string) {
  if (currentGroupId) {
    await update(ref(db, `/pitches/${currentGroupId}`), { completed: true });
  }
  await update(ref(db, '/gameState'), { phase: 'waiting', currentPitchGroupId: '' });
}

// ── Sync investors to active groups ──────────────────────────────────────
export async function syncInvestorsToActiveGroups(activeIds: string[]) {
  const snap = await get(ref(db, '/investors'));
  const existing = (snap.val() ?? {}) as Record<string, unknown>;
  const updates: Record<string, unknown> = {};
  activeIds.forEach((g) => {
    if (!existing[g]) {
      updates[`/investors/${g}`] = {
        groupName: `第${g}組`,
        remainingBudget: 3_000_000,
        hasVotedCurrentPitch: false,
      };
    }
  });
  Object.keys(existing).forEach((g) => {
    if (!activeIds.includes(g)) updates[`/investors/${g}`] = null;
  });
  if (Object.keys(updates).length > 0) await update(ref(db), updates);
}

// ── Full reset (重新開始) ──────────────────────────────────────────────────
export async function resetEverything(activeGroupIds: string[]) {
  await remove(ref(db, '/transactions'));
  await remove(ref(db, '/pitches'));
  const updates: Record<string, unknown> = {
    '/gameState': { phase: 'waiting', currentPitchGroupId: '', targetAmount: 1_500_000, riceEnabled: true },
  };
  activeGroupIds.forEach((g) => {
    updates[`/investors/${g}`] = {
      groupName: `第${g}組`,
      remainingBudget: 3_000_000,
      hasVotedCurrentPitch: false,
    };
  });
  await update(ref(db), updates);
}

// ── Save group config ─────────────────────────────────────────────────────
export async function saveGroupConfig(groupId: string, config: GroupConfig) {
  await update(ref(db, `/groups/${groupId}`), config);
}

// ── Save all group configs ────────────────────────────────────────────────
export async function saveAllGroupConfigs(configs: Record<string, GroupConfig>) {
  const updates: Record<string, string> = {};
  Object.entries(configs).forEach(([id, cfg]) => {
    updates[`/groups/${id}/name`] = cfg.name;
    updates[`/groups/${id}/topic`] = cfg.topic;
  });
  await update(ref(db), updates);
}
