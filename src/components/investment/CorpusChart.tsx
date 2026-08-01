'use client'

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, CartesianGrid,
} from 'recharts'
import type { CorpusPoint, CorpusMilestone } from '@/types/investment'
import { formatINRCompact } from '@/lib/finance'
import { ChartTooltip } from '@/components/ChartTooltip'

interface ChartEntry {
  month: number
  nominal?: number
  real?: number
  b1?: number
  b2?: number
  b3?: number
}

interface Props {
  data: CorpusPoint[]
  milestones: CorpusMilestone[]
  compareMode?: boolean
  compareData?: { 1: CorpusPoint[]; 2: CorpusPoint[]; 3: CorpusPoint[] }
  activeBracket?: 1 | 2 | 3
}

function sample(data: CorpusPoint[], every = 6): ChartEntry[] {
  return data
    .filter((_, i) => i % every === 0 || i === data.length - 1)
    .map(p => ({ month: p.month, nominal: p.nominal, real: p.real }))
}

function buildCompareEntries(
  compareData: { 1: CorpusPoint[]; 2: CorpusPoint[]; 3: CorpusPoint[] },
  every = 6,
): ChartEntry[] {
  return compareData[1]
    .filter((_, i) => i % every === 0 || i === compareData[1].length - 1)
    .map((_, i) => {
      const idx = i * every >= compareData[1].length ? compareData[1].length - 1 : i * every
      return {
        month: compareData[1][idx].month,
        b1: compareData[1][idx].nominal,
        b2: compareData[2][idx]?.nominal,
        b3: compareData[3][idx]?.nominal,
      }
    })
}

function corpusLabel(label: unknown) {
  const m = Number(label)
  if (!m) return ''
  const years = Math.floor(m / 12)
  const months = m % 12
  return [years > 0 ? `Year ${years}` : '', months > 0 ? `Month ${months}` : ''].filter(Boolean).join(' ')
}

export function CorpusChart({ data, milestones, compareMode, compareData, activeBracket }: Props) {
  const chartData = compareMode && compareData
    ? buildCompareEntries(compareData)
    : sample(data)

  return (
    <div className="w-full h-64 md:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={v => `Y${Math.floor(v / 12)}`}
            stroke="rgba(255,255,255,0.1)"
            tick={{ fill: '#475569', fontSize: 9 }}
            tickLine={false}
            interval={23}
          />
          <YAxis
            tickFormatter={v => formatINRCompact(v)}
            stroke="rgba(255,255,255,0.1)"
            tick={{ fill: '#475569', fontSize: 9 }}
            tickLine={false}
            width={55}
          />
          <Tooltip content={<ChartTooltip formatValue={formatINRCompact} formatLabel={corpusLabel} />} />
          <Legend
            iconType="plainline"
            formatter={value => <span className="text-[10px] text-slate-400">{value}</span>}
          />
          {milestones.map(m => (
            <ReferenceLine
              key={m.month}
              x={m.month}
              stroke="rgba(99,102,241,0.3)"
              strokeDasharray="4 3"
              label={{ value: m.label, fill: '#818cf8', fontSize: 8, position: 'insideTopRight' }}
            />
          ))}

          {compareMode ? (
            <>
              <Line
                type="monotone" dataKey="b1" name="Bracket 1 (12.25%)"
                stroke="#94a3b8" strokeWidth={activeBracket === 1 ? 2 : 1.5}
                dot={false} activeDot={{ r: 3 }}
                strokeOpacity={activeBracket && activeBracket !== 1 ? 0.4 : 1}
              />
              <Line
                type="monotone" dataKey="b2" name="Bracket 2 (12.50%)"
                stroke="#6366f1" strokeWidth={activeBracket === 2 ? 2 : 1.5}
                dot={false} activeDot={{ r: 3 }}
                strokeOpacity={activeBracket && activeBracket !== 2 ? 0.4 : 1}
              />
              <Line
                type="monotone" dataKey="b3" name="Bracket 3 (13.20%)"
                stroke="#10b981" strokeWidth={activeBracket === 3 ? 2 : 1.5}
                dot={false} activeDot={{ r: 3 }}
                strokeOpacity={activeBracket && activeBracket !== 3 ? 0.4 : 1}
              />
            </>
          ) : (
            <>
              <Line
                type="monotone" dataKey="nominal" name="Nominal"
                stroke="#6366f1" strokeWidth={2}
                dot={false} activeDot={{ r: 4, fill: '#6366f1' }}
              />
              <Line
                type="monotone" dataKey="real" name="Inflation-Adjusted"
                stroke="#f97316" strokeWidth={1.5} strokeDasharray="5 3"
                dot={false} activeDot={{ r: 4, fill: '#f97316' }}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
