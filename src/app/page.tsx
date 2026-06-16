'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useSessions, createSession, deleteSession, renameSession } from '@/hooks/useSessions';
import type { SessionMeta } from '@/lib/types';

const C = {
  amber: '#D4850C',
  gold:  '#C09818',
  green: '#1A9952',
  red:   '#C42430',
};

function fmtDate(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

// ── Session card ──────────────────────────────────────────────────────────
function SessionCard({
  id,
  meta,
  onDelete,
}: {
  id: string;
  meta: SessionMeta;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(meta.name);
  const [saving, setSaving] = useState(false);

  const handleRename = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    await renameSession(id, editName.trim());
    setSaving(false);
    setEditing(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-xl p-4"
      style={{ background: '#0e0e0e', border: '1px solid #1e1e1e' }}
    >
      <div className="flex items-start gap-3">
        {/* Status dot */}
        <div className="mt-1 flex-shrink-0">
          <span
            className="w-2 h-2 rounded-full block"
            style={{ background: meta.status === 'active' ? C.green : '#333' }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex gap-2 mb-1">
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(false); }}
                className="flex-1 px-2 py-1 rounded text-sm font-mono"
                style={{ background: '#151515', border: '1px solid #3a2808', color: '#ccc', outline: 'none' }}
              />
              <button
                onClick={handleRename}
                disabled={saving}
                className="px-3 py-1 rounded text-xs font-mono"
                style={{ background: '#0a1a08', border: '1px solid #1a3a10', color: C.green }}
              >
                {saving ? '...' : '儲存'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-2 py-1 rounded text-xs font-mono"
                style={{ background: '#141414', border: '1px solid #252525', color: '#555' }}
              >
                取消
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-display font-black text-base truncate" style={{ color: C.amber }}>
                {meta.name}
              </span>
              <button
                onClick={() => { setEditName(meta.name); setEditing(true); }}
                className="text-xs font-mono shrink-0"
                style={{ color: '#333' }}
              >
                ✎
              </button>
            </div>
          )}
          <div className="text-xs font-mono" style={{ color: '#444' }}>
            建立：{fmtDate(meta.createdAt)}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 shrink-0">
          <Link href={`/teacher?session=${id}`}>
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 rounded-lg text-sm font-mono font-bold cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #6a3808, #A06010)',
                color: '#f0e0b0',
              }}
            >
              進入
            </motion.div>
          </Link>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onDelete(id)}
            className="px-3 py-2 rounded-lg text-sm font-mono"
            style={{ background: '#0e0606', border: '1px solid #2a1010', color: '#7a3333' }}
          >
            ✕
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function Home() {
  const { sessions, loading } = useSessions();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [creatingLoading, setCreatingLoading] = useState(false);

  const sortedSessions = Object.entries(sessions).sort(
    ([, a], [, b]) => b.createdAt - a.createdAt
  );

  const handleCreate = async () => {
    const name = newName.trim() || `${todayStr()} 新場次`;
    setCreatingLoading(true);
    const id = await createSession(name);
    setCreatingLoading(false);
    setCreating(false);
    setNewName('');
    // Navigate to teacher page
    window.location.href = `/teacher?session=${id}`;
  };

  const handleDelete = async (id: string) => {
    const name = sessions[id]?.name ?? id;
    if (!confirm(`確定刪除場次「${name}」？\n此操作無法復原，所有注金紀錄將一併刪除。`)) return;
    await deleteSession(id);
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center px-4 py-12 gap-8"
      style={{ background: 'radial-gradient(120% 100% at 50% 0%, #0d1020 0%, #06070d 60%, #04050a 100%)' }}
    >
      {/* Title */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-center gap-3">
          <div
            className="rounded-xl flex items-center justify-center"
            style={{
              width: '46px',
              height: '46px',
              background: 'linear-gradient(135deg, #ffd34e, #ff6a3d)',
              boxShadow: '0 0 28px rgba(255,150,60,0.5)',
            }}
          >
            <span style={{ color: '#1a1206', fontSize: '24px' }}>▲</span>
          </div>
          <div
            className="font-fr font-black"
            style={{
              fontSize: '40px',
              letterSpacing: '5px',
              lineHeight: 1,
              background: 'linear-gradient(90deg,#ffe07a,#ff7a45)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            FUND RUSH
          </div>
        </div>
        <div className="font-fr-mono mt-2 tracking-[0.4em]" style={{ fontSize: '12px', color: 'rgba(238,242,247,0.45)' }}>
          資本擂台 ARENA
        </div>
        <div className="text-xs font-fr-mono mt-3 tracking-widest" style={{ color: '#444' }}>
          場次管理 · Session Manager
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        className="w-full max-w-lg flex flex-col gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {/* Create new session */}
        <AnimatePresence mode="wait">
          {creating ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div
                className="rounded-xl p-4 flex flex-col gap-3"
                style={{ background: '#0e0e0e', border: `1px solid #3a2808` }}
              >
                <div className="text-xs font-mono" style={{ color: '#666' }}>場次名稱</div>
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
                  placeholder={`${todayStr()} 新場次`}
                  className="w-full px-3 py-2.5 rounded-lg text-sm font-mono"
                  style={{
                    background: '#151515',
                    border: '1px solid #2a2808',
                    color: '#ccc',
                    outline: 'none',
                  }}
                />
                <div className="flex gap-2">
                  <motion.button
                    onClick={handleCreate}
                    disabled={creatingLoading}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 py-2.5 rounded-lg font-mono font-bold text-sm"
                    style={{
                      background: 'linear-gradient(135deg, #7a4808, #C07010)',
                      color: '#f0e0b0',
                      opacity: creatingLoading ? 0.7 : 1,
                    }}
                  >
                    {creatingLoading ? '建立中...' : '✓ 建立並進入'}
                  </motion.button>
                  <motion.button
                    onClick={() => setCreating(false)}
                    whileTap={{ scale: 0.97 }}
                    className="px-4 py-2.5 rounded-lg font-mono text-sm"
                    style={{ background: '#141414', border: '1px solid #252525', color: '#555' }}
                  >
                    取消
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="btn"
              onClick={() => setCreating(true)}
              whileHover={{ borderColor: C.amber }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 rounded-xl font-mono font-bold text-sm"
              style={{
                background: '#0a0a0a',
                border: '1px solid #252525',
                color: C.amber,
              }}
            >
              + 建立新場次
            </motion.button>
          )}
        </AnimatePresence>

        {/* Divider */}
        <div
          className="flex items-center gap-3"
          style={{ borderTop: '1px solid #141414' }}
        />

        {/* Session list */}
        {loading ? (
          <div className="text-center text-xs font-mono py-8" style={{ color: '#333' }}>
            載入中...
          </div>
        ) : sortedSessions.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-xs font-mono" style={{ color: '#2a2a2a' }}>尚無場次</div>
            <div className="text-xs font-mono mt-1" style={{ color: '#222' }}>
              點擊「建立新場次」開始
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="text-xs font-mono mb-1" style={{ color: '#444' }}>
              共 {sortedSessions.length} 個場次
            </div>
            <AnimatePresence>
              {sortedSessions.map(([id, meta]) => (
                <SessionCard key={id} id={id} meta={meta} onDelete={handleDelete} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </main>
  );
}
