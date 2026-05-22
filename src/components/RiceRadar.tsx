'use client';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import type { PitchData } from '@/lib/types';

interface RiceRadarProps {
  pitchData: PitchData | null;
}

export default function RiceRadar({ pitchData }: RiceRadarProps) {
  const s = pitchData?.riceScores;
  const n = s?.voteCount ?? 0;

  const data = [
    { axis: 'R 目標性', value: n ? +(s!.R_total / n).toFixed(1) : 0, fullMark: 10 },
    { axis: 'I 影響力', value: n ? +(s!.I_total / n).toFixed(1) : 0, fullMark: 10 },
    { axis: 'C 自信心', value: n ? +(s!.C_total / n).toFixed(1) : 0, fullMark: 10 },
    { axis: 'E 資源消耗', value: n ? +(s!.E_total / n).toFixed(1) : 0, fullMark: 10 },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="text-xs font-mono mb-1" style={{ color: '#555' }}>
        RICE 班級評估 {n > 0 && <span style={{ color: '#888' }}>({n} 票)</span>}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <RadarChart data={data} margin={{ top: 10, right: 32, bottom: 10, left: 32 }}>
          <PolarGrid stroke="#1e1e1e" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: '#666', fontSize: 10, fontFamily: 'monospace' }}
          />
          <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
          <Radar
            dataKey="value"
            stroke="#1499AA"
            fill="#1499AA"
            fillOpacity={0.18}
            strokeWidth={1.5}
          />
          <Tooltip
            contentStyle={{
              background: '#111',
              border: '1px solid #252525',
              color: '#aaa',
              fontFamily: 'monospace',
              fontSize: 11,
            }}
          />
        </RadarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-4 gap-2 w-full mt-1">
        {data.map((d) => (
          <div key={d.axis} className="text-center">
            <div className="text-lg font-bold font-mono" style={{ color: '#1499AA' }}>
              {d.value || '—'}
            </div>
            <div className="text-xs font-mono" style={{ color: '#444' }}>
              {d.axis.split(' ')[0]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
