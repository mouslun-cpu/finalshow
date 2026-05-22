'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';

const LINKS = [
  {
    href: '/teacher',
    label: '老師大螢幕',
    sub: 'Teacher Screen · 含控制台',
    icon: '📺',
    color: '#D4850C',
  },
  {
    href: '/student?group=1',
    label: '學生端（示範）',
    sub: 'Student Investor · group=1',
    icon: '📱',
    color: '#1499AA',
  },
];

export default function Home() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center gap-8 px-6"
      style={{ background: '#080808' }}
    >
      {/* Title */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div
          className="text-5xl font-display font-black tracking-widest"
          style={{ color: '#D4850C' }}
        >
          🦈 SHARK TANK
        </div>
        <div
          className="text-xl font-display font-black tracking-[0.5em] mt-2"
          style={{ color: '#C09818' }}
        >
          ARENA
        </div>
        <div className="text-xs font-mono text-gray-700 mt-3 tracking-widest">
          創投競技場 · 募資模擬系統
        </div>
      </motion.div>

      {/* Navigation */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {LINKS.map(({ href, label, sub, icon, color }, i) => (
          <motion.div
            key={href}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.1 }}
          >
            <Link href={href}>
              <motion.div
                className="flex items-center gap-4 rounded-xl p-5 cursor-pointer"
                style={{
                  background: '#0e0e0e',
                  border: `1px solid #1e1e1e`,
                }}
                whileHover={{
                  borderColor: color,
                  background: '#111',
                }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-3xl">{icon}</span>
                <div>
                  <div className="font-display font-black text-lg" style={{ color }}>
                    {label}
                  </div>
                  <div className="text-xs font-mono text-gray-600 mt-0.5">{sub}</div>
                </div>
                <div className="ml-auto text-gray-700 text-xl">›</div>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* URL guide */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-xs font-mono max-w-sm"
        style={{ color: '#2a2a2a' }}
      >
        <div className="mb-1" style={{ color: '#444' }}>學生手機網址格式：</div>
        <div className="px-3 py-2 rounded" style={{ background: '#0e0e0e', color: '#666' }}>
          /student?group=<span style={{ color: '#1499AA' }}>1</span>
        </div>
        <div className="mt-1" style={{ color: '#333' }}>group 可填 1 ~ 9，每組各自獨立帳戶</div>
      </motion.div>
    </main>
  );
}
