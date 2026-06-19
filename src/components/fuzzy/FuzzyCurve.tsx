'use client';

import React from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';

interface FuzzyCurveProps {
  data: {
    x: number[];
    lo: number[];
    md: number[];
    hi: number[];
  };
  title: string;
  dark?: boolean;
}

const FuzzyCurve = ({ data, title, dark = false }: FuzzyCurveProps) => {
  // Transform data for Recharts
  const chartData = data.x.map((val, idx) => ({
    x: val,
    'Rendah/Aman': data.lo[idx],
    'Sedang/Waspada': data.md[idx],
    'Tinggi/Bahaya': data.hi[idx],
  }));

  return (
    <div
      className={`rounded-lg border p-6 shadow-sm ${
        dark
          ? 'border-white/10 bg-white/5'
          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
      }`}
    >
      <h3
        className={`mb-4 text-sm font-bold uppercase tracking-wider ${
          dark ? 'text-white' : 'text-slate-800 dark:text-white'
        }`}
      >
        {title}
      </h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={dark ? '#334155' : '#f1f5f9'} />
            <XAxis 
              dataKey="x" 
              type="number" 
              domain={['auto', 'auto']} 
              fontSize={10}
              tick={{fill: dark ? '#cbd5e1' : '#94a3b8'}}
            />
            <YAxis fontSize={10} tick={{fill: dark ? '#cbd5e1' : '#94a3b8'}} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Legend
              iconType="circle"
              wrapperStyle={{
                color: dark ? '#e2e8f0' : '#334155',
                fontSize: '10px',
                paddingTop: '10px',
              }}
            />
            <Area 
              type="monotone" 
              dataKey="Rendah/Aman" 
              stroke="#3b82f6" 
              fill="#3b82f6" 
              fillOpacity={0.1} 
              strokeWidth={2}
            />
            <Area 
              type="monotone" 
              dataKey="Sedang/Waspada" 
              stroke="#22c55e" 
              fill="#22c55e" 
              fillOpacity={0.1} 
              strokeWidth={2}
            />
            <Area 
              type="monotone" 
              dataKey="Tinggi/Bahaya" 
              stroke="#ef4444" 
              fill="#ef4444" 
              fillOpacity={0.1} 
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default FuzzyCurve;
