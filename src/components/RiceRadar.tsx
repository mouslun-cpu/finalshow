'use client';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import type { PitchData } from '@/lib/types';

interface RiceRadarProps {
  pitchData: PitchData | null;
}

const ACCENT = '#1499AA';

// Custom axis label: axis name in white + the score right on the chart,
// so we no longer need a separate row of numbers underneath.
function AxisTick(props: any) {
  const { x, y, payload, cx, cy } = props;
  const value: number = payload?.value?.score ?? 0;
  const label: string = payload?.value?.label ?? payload?.value ?? '';
  // nudge the label outward from the centre so it never overlaps the web
  const dx = x - cx > 6 ? 6 : x - cx < -6 ? -6 : 0;
  const anchor = x - cx > 6 ? 'start' : x - cx < -6 ? 'end' : 'middle';
  return (
    <text x={x + dx} y={y} textAnchor={anchor} dominantBaseline="middle">
      <tspan fill="#ffffff" fontSize={12} fontWeight={700} fontFamily="monospace">
        {label}
      </tspan>
      <tspan fill={ACCENT} fontSize={13} fontWeight={800} fontFamily="monospace" dx={6}>
        {value || '—'}
      </tspan>
    </text>
  );
}

export default function RiceRadar({ pitchData }: RiceRadarProps) {
  const s = pitchData?.riceScores;
  const n = s?.voteCount ?? 0;

  const data = [
    { axis: { label: 'R 目標性',   score: n ? +(s!.R_total / n).toFixed(1) : 0 }, value: n ? +(s!.R_total / n).toFixed(1) : 0, fullMark: 10 },
    { axis: { label: 'I 影響力',   score: n ? +(s!.I_total / n).toFixed(1) : 0 }, value: n ? +(s!.I_total / n).toFixed(1) : 0, fullMark: 10 },
    { axis: { label: 'C 自信心',   score: n ? +(s!.C_total / n).toFixed(1) : 0 }, value: n ? +(s!.C_total / n).toFixed(1) : 0, fullMark: 10 },
    { axis: { label: 'E 資源消耗', score: n ? +(s!.E_total / n).toFixed(1) : 0 }, value: n ? +(s!.E_total / n).toFixed(1) : 0, fullMark: 10 },
  ];

  return (
    <div className="flex flex-col">
      <div className="font-fr-mono mb-1" style={{ fontSize: '12px', letterSpacing: '2px', color: '#ffffff' }}>
        RICE 班級評估{' '}
        {n > 0 && <span style={{ color: 'rgba(255,255,255,0.55)' }}>({n} 票)</span>}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={data} margin={{ top: 18, right: 38, bottom: 18, left: 38 }}>
          <PolarGrid stroke="#2a2a2a" />
          <PolarAngleAxis dataKey="axis" tick={<AxisTick />} />
          <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
          <Radar
            dataKey="value"
            stroke={ACCENT}
            fill={ACCENT}
            fillOpacity={0.22}
            strokeWidth={1.8}
          />
          <Tooltip
            contentStyle={{
              background: '#111',
              border: '1px solid #252525',
              color: '#fff',
              fontFamily: 'monospace',
              fontSize: 11,
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
