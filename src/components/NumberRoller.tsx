'use client';
import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef } from 'react';

interface NumberRollerProps {
  value: number;
  className?: string;
  prefix?: string;
  style?: React.CSSProperties;
}

// Animated digit slot
function DigitSlot({ digit }: { digit: number }) {
  const spring = useSpring(digit, { stiffness: 200, damping: 30 });

  useEffect(() => {
    spring.set(digit);
  }, [digit, spring]);

  return (
    <div className="relative" style={{ height: '1.2em', width: '0.62em', overflowY: 'hidden' }}>
      <motion.div
        style={{ y: useTransform(spring, (v) => `-${v * 10}%`) }}
        className="absolute flex flex-col"
      >
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} style={{ height: '1.2em', display: 'flex', alignItems: 'center' }}>
            {i}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

function Comma() {
  return <span style={{ marginBottom: '0.05em' }}>,</span>;
}

export default function NumberRoller({ value, className = '', prefix = '$', style }: NumberRollerProps) {
  const str = Math.round(value).toString();
  // Insert commas: "3000000" → ["3", ",", "0", "0", "0", ",", "0", "0", "0"]
  const chars: Array<{ type: 'digit'; val: number } | { type: 'comma' }> = [];
  for (let i = 0; i < str.length; i++) {
    const fromRight = str.length - 1 - i;
    chars.push({ type: 'digit', val: parseInt(str[i]) });
    if (fromRight > 0 && fromRight % 3 === 0) {
      chars.push({ type: 'comma' });
    }
  }

  return (
    <div className={`flex items-end font-display ${className}`} style={style}>
      <span className="mr-1">{prefix}</span>
      {chars.map((c, i) =>
        c.type === 'comma' ? (
          <Comma key={i} />
        ) : (
          <DigitSlot key={i} digit={(c as { type: 'digit'; val: number }).val} />
        )
      )}
    </div>
  );
}
