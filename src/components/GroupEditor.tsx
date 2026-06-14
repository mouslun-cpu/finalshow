'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GROUP_IDS, saveAllGroupConfigs, saveActiveGroupIds, syncInvestorsToActiveGroups } from '@/hooks/useGameState';
import type { GroupConfig } from '@/lib/types';

interface GroupEditorProps {
  sessionId: string;
  open: boolean;
  onClose: () => void;
  initialGroups: Record<string, GroupConfig>;
  initialActiveIds: string[];
}

export default function GroupEditor({
  sessionId,
  open,
  onClose,
  initialGroups,
  initialActiveIds,
}: GroupEditorProps) {
  const [activeIds, setActiveIds] = useState<string[]>([...GROUP_IDS]);
  const [configs, setConfigs]     = useState<Record<string, GroupConfig>>({});
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  useEffect(() => {
    if (!open) return;
    setActiveIds([...initialActiveIds]);
    const init: Record<string, GroupConfig> = {};
    GROUP_IDS.forEach((id) => {
      init[id] = {
        name:  initialGroups[id]?.name  ?? '',
        topic: initialGroups[id]?.topic ?? '',
      };
    });
    setConfigs(init);
    setSaved(false);
  }, [open, initialGroups, initialActiveIds]);

  const setField = (id: string, field: keyof GroupConfig, value: string) => {
    setConfigs((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const removeGroup = (id: string) => {
    if (activeIds.length <= 1) return;
    setActiveIds((prev) => prev.filter((i) => i !== id));
  };

  const addGroup = (id: string) => {
    setActiveIds((prev) =>
      [...prev, id].sort((a, b) => Number(a) - Number(b))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveActiveGroupIds(sessionId, activeIds);
      const filtered: Record<string, GroupConfig> = {};
      GROUP_IDS.forEach((id) => { filtered[id] = configs[id] ?? { name: '', topic: '' }; });
      await saveAllGroupConfigs(sessionId, filtered);
      await syncInvestorsToActiveGroups(sessionId, activeIds);
      setSaved(true);
      setTimeout(onClose, 700);
    } catch (_) {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const inactiveIds = GROUP_IDS.filter((id) => !activeIds.includes(id));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.85)' }} />

          <motion.div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
            style={{ background: '#111', border: '1px solid #252525' }}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="sticky top-0 flex items-center justify-between px-6 py-4 z-10"
              style={{ background: '#111', borderBottom: '1px solid #1e1e1e' }}
            >
              <div>
                <div className="font-mono font-bold text-sm" style={{ color: '#D4850C' }}>
                  組別設定
                </div>
                <div className="text-xs font-mono mt-0.5" style={{ color: '#555' }}>
                  目前啟用 {activeIds.length} 組
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full text-sm"
                style={{ background: '#1e1e1e', color: '#666' }}
              >
                ✕
              </button>
            </div>

            {/* Active groups */}
            <div className="p-4 space-y-2">
              <AnimatePresence>
                {activeIds.map((id) => (
                  <motion.div
                    key={id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: '#0e0e0e', border: '1px solid #1e1e1e' }}
                    >
                      {/* Group badge */}
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center font-display font-black text-lg shrink-0"
                        style={{ background: '#1a1a1a', color: '#D4850C', border: '1px solid #2a2a2a' }}
                      >
                        {id}
                      </div>

                      {/* Inputs */}
                      <div className="flex-1 flex gap-2">
                        <input
                          value={configs[id]?.name ?? ''}
                          onChange={(e) => setField(id, 'name', e.target.value)}
                          placeholder="組別名稱（選填）"
                          className="flex-[2] px-3 py-2 rounded-lg text-sm font-mono"
                          style={{
                            background: '#151515',
                            border: '1px solid #282828',
                            color: '#ccc',
                            outline: 'none',
                          }}
                        />
                        <input
                          value={configs[id]?.topic ?? ''}
                          onChange={(e) => setField(id, 'topic', e.target.value)}
                          placeholder="提案主題（可留空）"
                          className="flex-[3] px-3 py-2 rounded-lg text-sm font-mono"
                          style={{
                            background: '#151515',
                            border: '1px solid #282828',
                            color: '#ccc',
                            outline: 'none',
                          }}
                        />
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={() => removeGroup(id)}
                        disabled={activeIds.length <= 1}
                        className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0 text-sm"
                        style={{
                          background: '#1a0a0a',
                          border: '1px solid #2a1414',
                          color: activeIds.length <= 1 ? '#2a2a2a' : '#884444',
                          cursor: activeIds.length <= 1 ? 'not-allowed' : 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Add group section */}
              {inactiveIds.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs font-mono mb-2" style={{ color: '#444' }}>
                    新增組別
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {inactiveIds.map((id) => (
                      <button
                        key={id}
                        onClick={() => addGroup(id)}
                        className="px-3 py-1.5 rounded-lg text-sm font-display font-bold"
                        style={{
                          background: '#0a0a0a',
                          border: '1px solid #252525',
                          color: '#555',
                        }}
                      >
                        + 第{id}組
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="sticky bottom-0 px-6 py-4"
              style={{ background: '#111', borderTop: '1px solid #1e1e1e' }}
            >
              <motion.button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 rounded-xl font-mono font-bold text-sm"
                style={{
                  background: saved ? '#0d2a1a' : 'linear-gradient(90deg, #8B5A0A, #C08010)',
                  color: saved ? '#1A9952' : '#fff',
                  border: saved ? '1px solid #1A5530' : 'none',
                  opacity: saving ? 0.7 : 1,
                }}
                whileTap={{ scale: 0.98 }}
              >
                {saved ? '✓ 已儲存' : saving ? '儲存中...' : `儲存設定（${activeIds.length} 組）`}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
