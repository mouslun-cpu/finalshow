'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { sp } from '@/hooks/useGameState';
import type { Transaction } from '@/lib/types';

const SEGMENT_ANIM_MS = 120;
const TX_GAP_MS = 400;

interface AnimState {
  displayedRaised: number;
  litSegments: number;
  processingTx: Transaction | null;
}

export function useAnimQueue(
  sessionId: string,
  pitchGroupId: string | null,
  targetAmount: number,
  totalSegments = 20
) {
  const [animState, setAnimState] = useState<AnimState>({
    displayedRaised: 0,
    litSegments: 0,
    processingTx: null,
  });

  const queueRef = useRef<Transaction[]>([]);
  const processingRef = useRef(false);
  const displayedRef = useRef(0);

  const processTx = useCallback(
    async (tx: Transaction) => {
      const prevRaised = displayedRef.current;
      const nextRaised = prevRaised + tx.amount;

      const prevSegments = Math.min(
        totalSegments,
        Math.floor((prevRaised / targetAmount) * totalSegments)
      );
      const nextSegments = Math.min(
        totalSegments,
        Math.ceil((nextRaised / targetAmount) * totalSegments)
      );

      setAnimState((s) => ({ ...s, processingTx: tx }));

      for (let seg = prevSegments + 1; seg <= nextSegments; seg++) {
        await new Promise<void>((r) => setTimeout(r, SEGMENT_ANIM_MS));
        const partialRaised =
          prevRaised + (tx.amount * (seg - prevSegments)) / (nextSegments - prevSegments);
        setAnimState({
          displayedRaised: Math.round(partialRaised),
          litSegments: seg,
          processingTx: tx,
        });
      }

      displayedRef.current = nextRaised;
      setAnimState({
        displayedRaised: nextRaised,
        litSegments: nextSegments,
        processingTx: null,
      });

      try {
        await update(ref(db, sp(sessionId, `transactions/${tx.id}`)), { animated: true });
      } catch (_) {}
    },
    [sessionId, targetAmount, totalSegments]
  );

  const runQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    while (queueRef.current.length > 0) {
      const tx = queueRef.current.shift()!;
      await processTx(tx);
      await new Promise<void>((r) => setTimeout(r, TX_GAP_MS));
    }

    processingRef.current = false;
  }, [processTx]);

  useEffect(() => {
    if (!sessionId || !pitchGroupId) return;

    const r = ref(db, sp(sessionId, 'transactions'));
    const unsub = onValue(r, (snap) => {
      if (!snap.exists()) return;
      const all = snap.val() as Record<string, Transaction>;
      const pending = Object.entries(all)
        .filter(([, tx]) => tx.pitchGroupId === pitchGroupId && !tx.animated)
        .map(([id, tx]) => ({ ...tx, id }))
        .sort((a, b) => a.timestamp - b.timestamp);

      const existingIds = new Set(queueRef.current.map((t) => t.id));
      const newOnes = pending.filter((tx) => !existingIds.has(tx.id));
      if (newOnes.length > 0) {
        queueRef.current.push(...newOnes);
        runQueue();
      }
    });

    return unsub;
  }, [sessionId, pitchGroupId, runQueue]);

  const reset = useCallback((initialRaised = 0) => {
    queueRef.current = [];
    processingRef.current = false;
    displayedRef.current = initialRaised;
    const segs = Math.min(totalSegments, Math.floor((initialRaised / targetAmount) * totalSegments));
    setAnimState({ displayedRaised: initialRaised, litSegments: segs, processingTx: null });
  }, [targetAmount, totalSegments]);

  return { ...animState, reset };
}
