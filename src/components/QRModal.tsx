'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

interface QRModalProps {
  sessionId: string;
  open: boolean;
  onClose: () => void;
}

export default function QRModal({ sessionId, open, onClose }: QRModalProps) {
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(typeof window !== 'undefined' ? window.location.origin : '');
  }, []);

  const studentUrl = `${origin}/student?session=${sessionId}`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.82)' }} />

          {/* Card */}
          <motion.div
            className="relative flex flex-col items-center gap-6 rounded-2xl p-10"
            style={{
              background: '#141414',
              border: '1px solid #2a2a2a',
              boxShadow: '0 0 40px rgba(0,0,0,0.8)',
            }}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-mono" style={{ color: '#888' }}>
              掃描 QR Code 加入課堂
            </div>

            {/* QR Code */}
            <div
              className="p-5 rounded-xl"
              style={{ background: '#fff' }}
            >
              {origin && (
                <QRCodeSVG
                  value={studentUrl}
                  size={280}
                  bgColor="#ffffff"
                  fgColor="#111111"
                  level="M"
                />
              )}
            </div>

            {/* URL display */}
            <div className="text-center space-y-1">
              <div className="text-xs font-mono" style={{ color: '#555' }}>學生端網址</div>
              <div
                className="text-sm font-mono px-4 py-2 rounded-lg select-all"
                style={{ background: '#0e0e0e', color: '#aaa', border: '1px solid #222' }}
              >
                {studentUrl}
              </div>
              <div className="text-xs font-mono" style={{ color: '#444' }}>
                進入後選擇自己的組別
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-sm font-mono"
              style={{ background: '#222', color: '#666' }}
            >
              ✕
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
