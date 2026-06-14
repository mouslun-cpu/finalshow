'use client';
import { useEffect, useState } from 'react';
import { ref, onValue, set, push, remove, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { SessionMeta } from '@/lib/types';

export function useSessions() {
  const [sessions, setSessions] = useState<Record<string, SessionMeta>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    return onValue(ref(db, '/sessionMeta'), (snap) => {
      setSessions(snap.val() ?? {});
      setLoading(false);
    });
  }, []);
  return { sessions, loading };
}

export async function createSession(name: string): Promise<string> {
  const newRef = push(ref(db, '/sessionMeta'));
  await set(newRef, {
    name,
    createdAt: Date.now(),
    status: 'active',
  } satisfies SessionMeta);
  return newRef.key!;
}

export async function deleteSession(sessionId: string) {
  await remove(ref(db, `/sessionMeta/${sessionId}`));
  await remove(ref(db, `/sessions/${sessionId}`));
}

export async function renameSession(sessionId: string, name: string) {
  await update(ref(db, `/sessionMeta/${sessionId}`), { name });
}
