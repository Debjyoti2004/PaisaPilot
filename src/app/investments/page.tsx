'use client'

import { useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { TrendingUp, Calculator, BarChart3, Zap, Target, CreditCard } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  sipFV, stepUpSipFV, lumpsumFV, emi as calcEMI,
  requiredMonthly, formatINR, formatINRCompact
} from '@/lib/finance'

type CalcTab = 'sip' | 'stepup' | 'lumpsum' | 'emi' | 'goal'

// InputField defined OUTSIDE component to prevent remount on state change
function InputField({
  label, value, onChange, prefix, suffix, hint
}: {
  label: string; value: string; onChange: (v: string) => void
  prefix?: string; suffix?: string; hint?: string
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <p className="text-[10px] uppercase tracking-widest text-slate-600">{label}</p>
        {hint && <p className="text-[10px] text-slate-700">{hint}</p>}
      </div>
      <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden focus-within:border-indigo-500/60 focus-within:bg-white/[0.06] transition-all">
        {prefix && (
          <span className="px-3 text-slate-500 text-[13px] border-r border-white/[0.08] py-3 select-none">{prefix}</span>
        )}
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 bg-transparent px-3 py-3 text-[14px] text-white focus:outline-none num"
        />
        {suffix && (
          <span className="px-3 text-slate-500 text-[11px] border-l border-white/[0.08] py-3 whitespace-nowrap select-none">{suffix}</span>
        )}
      </div>
    </div>
  )
}

// Stat row for sidebar
function StatRow({ label, value, accent, small }: { label: string; value: string; accent?: boolean; small?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className={`text-[11px] text-slate-600 leading-snug ${small ? 'text-[10px]' : ''}`}>{label}</p>
      <p className={`font-bold num text-right ${accent ? 'text-indigo-300 text-[15px]' : 'text-white text-[13px]'} ${small ? 'text-[12px]' : ''}`}>{value}</p>
    </div>
  )
}

// Donut arc SVG
function DonutChart({ ratio }: { ratio: number }) {
  const r = 42; const cx = 56; const cy = 56
  const circ = 2 * Math.PI * r
  const filled = Math.min(Math.max(ratio, 0), 1) * circ
  return (
    <svg width="112" height="112" className="rotate-[-90deg]">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="10" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#6366f1" strokeWidth="10"
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
        style={{ filter: 'drop-shadow(0 0 6px rgba(99,102,241,0.5))' }} />
    </svg>
  )
}

export default function InvestmentsPage() {
  const [tab, setTab] = useState<CalcTab>('sip')
  // SIP
  const [sipMonthly, setSipMonthly] = useState('5000')
  const [sipYears, setSipYears] = useState('10')
  const [sipReturn, setSipReturn] = useState('12')
  // Step-up
  const [suMonthly, setSuMonthly] = useState('5000')
  const [suYears, setSuYears] = useState('10')
  const [suReturn, setSuReturn] = useState('12')
  const [suStep, setSuStep] = useState('10')
  // Lumpsum
  const [lsAmount, setLsAmount] = useState('100000')
  const [lsYears, setLsYears] = useState('10')
  const [lsReturn, setLsReturn] = useState('12')
  // EMI
  const [emiPrincipal, setEmiPrincipal] = useState('500000')
  const [emiRate, setEmiRate] = useState('10')
  const [emiTenure, setEmiTenure] = useState('60')
  // Goal
  const [goalTarget, setGoalTarget] = useState('1000000')
  const [goalMonths, setGoalMonths] = useState('60')
  const [goalReturn, setGoalReturn] = useState('12')

  // Computed results — all reactive
  const sipResult = sipFV(parseFloat(sipMonthly) || 0, parseFloat(sipYears) || 0, parseFloat(sipReturn) || 0)
  const sipInvested = (parseFloat(sipMonthly) || 0) * (parseFloat(sipYears) || 0) * 12
  const sipReturns = sipResult - sipInvested
  const sipRatio = sipInvested > 0 ? sipInvested / sipResult : 0

  const suResult = stepUpSipFV(parseFloat(suMonthly) || 0, parseFloat(suYears) || 0, parseFloat(suReturn) || 0, parseFloat(suStep) || 0)
  const suStepVal = parseFloat(suStep) / 100
  const suInvested = suStepVal > 0
    ? (parseFloat(suMonthly) || 0) * 12 * ((Math.pow(1 + suStepVal, parseFloat(suYears) || 0) - 1) / suStepVal)
    : (parseFloat(suMonthly) || 0) * 12 * (parseFloat(suYears) || 0)
  const suReturns = suResult - suInvested
  const suWithout = sipFV(parseFloat(suMonthly) || 0, parseFloat(suYears) || 0, parseFloat(suReturn) || 0)

  const lsResult = lumpsumFV(parseFloat(lsAmount) || 0, parseFloat(lsYears) || 0, parseFloat(lsReturn) || 0)
  const lsReturns = lsResult - (parseFloat(lsAmount) || 0)
  const lsRatio = lsResult > 0 ? (parseFloat(lsAmount) || 0) / lsResult : 0

  const emiResult = calcEMI(parseFloat(emiPrincipal) || 0, parseFloat(emiRate) || 0, parseFloat(emiTenure) || 0)
  const emiTotal = emiResult * (parseFloat(emiTenure) || 0)
  const emiInterest = emiTotal - (parseFloat(emiPrincipal) || 0)
  const emiRatio = emiTotal > 0 ? (parseFloat(emiPrincipal) || 0) / emiTotal : 0

  const goalMonthly = requiredMonthly(parseFloat(goalTarget) || 0, parseFloat(goalMonths) || 0, parseFloat(goalReturn) || 0)
  const goalInvested = goalMonthly * (parseFloat(goalMonths) || 0)
  const goalReturns = (parseFloat(goalTarget) || 0) - goalInvested

  const TABS: { key: CalcTab; label: string; icon: LucideIcon }[] = [
    { key: 'sip', label: 'SIP', icon: TrendingUp },
    { key: 'stepup', label: 'Step-up', icon: Zap },
    { key: 'lumpsum', label: 'Lumpsum', icon: BarChart3 },
    { key: 'emi', label: 'EMI', icon: CreditCard },
    { key: 'goal', label: 'Goal', icon: Target },
  ]

  // ───── Mobile compact result (2-col grid) ─────
  function MobileResultSummary() {
    const items: { label: string; value: string; accent?: boolean }[] = []

    if (tab === 'sip') {
      const wealthRatio = sipInvested > 0 ? sipResult / sipInvested : 0
      items.push(
        { label: 'Maturity Value', value: formatINRCompact(sipResult), accent: true },
        { label: 'Total Invested', value: formatINRCompact(sipInvested) },
        { label: 'Est. Returns', value: formatINRCompact(sipReturns) },
        { label: 'Wealth', value: `${wealthRatio.toFixed(2)}x` },
      )
    } else if (tab === 'stepup') {
      const extraGain = suResult - suWithout
      items.push(
        { label: 'Maturity Value', value: formatINRCompact(suResult), accent: true },
        { label: 'Extra vs No Step-up', value: `+${formatINRCompact(Math.max(extraGain, 0))}` },
        { label: 'Total Invested', value: formatINRCompact(suInvested) },
        { label: 'Returns', value: formatINRCompact(Math.max(suReturns, 0)) },
      )
    } else if (tab === 'lumpsum') {
      items.push(
        { label: 'Maturity Value', value: formatINRCompact(lsResult), accent: true },
        { label: 'Returns', value: formatINRCompact(lsReturns) },
        { label: 'Growth', value: `${(parseFloat(lsAmount) || 0) > 0 ? (lsResult / (parseFloat(lsAmount) || 1)).toFixed(2) : 0}x` },
        { label: 'CAGR', value: `${lsReturn}%` },
      )
    } else if (tab === 'emi') {
      items.push(
        { label: 'Monthly EMI', value: formatINR(Math.round(emiResult)), accent: true },
        { label: 'Total Payment', value: formatINRCompact(emiTotal) },
        { label: 'Total Interest', value: formatINRCompact(emiInterest) },
        { label: 'Interest Ratio', value: `${emiTotal > 0 ? ((emiInterest / emiTotal) * 100).toFixed(1) : 0}%` },
      )
    } else {
      items.push(
        { label: 'Monthly SIP Needed', value: formatINR(Math.round(goalMonthly)), accent: true },
        { label: 'You Invest Total', value: formatINRCompact(goalInvested) },
        { label: 'Market Returns', value: formatINRCompact(Math.max(goalReturns, 0)) },
        { label: 'Time Frame', value: `${Math.floor((parseFloat(goalMonths)||0)/12)}y ${(parseFloat(goalMonths)||0)%12}m` },
      )
    }

    return (
      <div className="grid grid-cols-2 gap-2">
        {items.map(item => (
          <div key={item.label} className={`rounded-xl p-3 ${item.accent ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-white/[0.03] border border-white/[0.06]'}`}>
            <p className="text-[9px] uppercase tracking-widest text-slate-600 mb-1">{item.label}</p>
            <p className={`text-[15px] font-bold num ${item.accent ? 'text-indigo-300' : 'text-white'}`}>{item.value}</p>
          </div>
        ))}
      </div>
    )
  }

  // ───── Sidebar content per tab ─────
  function SidebarContent() {
    if (tab === 'sip') {
      const wealthRatio = sipInvested > 0 ? (sipResult / sipInvested) : 0
      return (
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-1">
            <div className="relative">
              <DonutChart ratio={sipRatio} />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                <p className="text-[9px] uppercase tracking-widest text-slate-600">Value</p>
                <p className="text-[16px] font-black text-white num leading-none">{formatINRCompact(sipResult)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Invested</span>
              <span className="flex items-center gap-1 text-slate-600"><span className="w-2 h-2 rounded-full bg-white/10 inline-block" /> Returns</span>
            </div>
          </div>
          <div className="space-y-3">
            <StatRow label="Maturity value" value={formatINRCompact(sipResult)} accent />
            <div className="h-px bg-white/[0.06]" />
            <StatRow label="Amount invested" value={formatINRCompact(sipInvested)} />
            <StatRow label="Returns earned" value={formatINRCompact(sipReturns)} />
            <div className="h-px bg-white/[0.06]" />
            <StatRow label="Wealth multiplier" value={`${wealthRatio.toFixed(2)}x`} />
            <div className="text-[10px] text-slate-700 text-center">
              ₹1 invested → ₹{wealthRatio.toFixed(2)}
            </div>
          </div>
        </div>
      )
    }

    if (tab === 'stepup') {
      const extraGain = suResult - suWithout
      return (
        <div className="space-y-5">
          <div className="text-center">
            <p className="text-[9px] uppercase tracking-widest text-slate-600 mb-1">Maturity Value</p>
            <p className="text-[32px] font-black text-white num leading-none">{formatINRCompact(suResult)}</p>
            <p className="text-[11px] text-slate-600 mt-1">vs ₹{formatINRCompact(suWithout)} without step-up</p>
          </div>
          <div className="bg-green-500/[0.06] border border-green-500/20 rounded-xl px-4 py-3 text-center">
            <p className="text-[9px] uppercase tracking-widest text-green-700 mb-0.5">Extra gains from step-up</p>
            <p className="text-[20px] font-bold text-green-400 num">+{formatINRCompact(Math.max(extraGain, 0))}</p>
          </div>
          <div className="space-y-3">
            <StatRow label="Amount invested" value={formatINRCompact(suInvested)} />
            <StatRow label="Returns earned" value={formatINRCompact(Math.max(suReturns, 0))} />
            <StatRow label="Wealth ratio" value={`${suInvested > 0 ? (suResult / suInvested).toFixed(2) : 0}x`} accent />
          </div>
        </div>
      )
    }

    if (tab === 'lumpsum') {
      return (
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-1">
            <div className="relative">
              <DonutChart ratio={lsRatio} />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                <p className="text-[9px] uppercase tracking-widest text-slate-600">Value</p>
                <p className="text-[16px] font-black text-white num leading-none">{formatINRCompact(lsResult)}</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <StatRow label="Maturity value" value={formatINRCompact(lsResult)} accent />
            <div className="h-px bg-white/[0.06]" />
            <StatRow label="Principal" value={formatINRCompact(parseFloat(lsAmount) || 0)} />
            <StatRow label="Returns earned" value={formatINRCompact(lsReturns)} />
            <div className="h-px bg-white/[0.06]" />
            <StatRow label="CAGR" value={`${lsReturn}%`} />
            <StatRow label="Growth multiple" value={`${(parseFloat(lsAmount) || 0) > 0 ? (lsResult / (parseFloat(lsAmount) || 1)).toFixed(2) : 0}x`} accent />
          </div>
        </div>
      )
    }

    if (tab === 'emi') {
      return (
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-1">
            <div className="relative">
              <DonutChart ratio={emiRatio} />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                <p className="text-[9px] uppercase tracking-widest text-slate-600">EMI</p>
                <p className="text-[16px] font-black text-white num leading-none">{formatINRCompact(emiResult)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Principal</span>
              <span className="flex items-center gap-1 text-slate-600"><span className="w-2 h-2 rounded-full bg-white/10 inline-block" /> Interest</span>
            </div>
          </div>
          <div className="space-y-3">
            <StatRow label="Monthly EMI" value={formatINR(Math.round(emiResult))} accent />
            <div className="h-px bg-white/[0.06]" />
            <StatRow label="Principal" value={formatINRCompact(parseFloat(emiPrincipal) || 0)} />
            <StatRow label="Total interest" value={formatINRCompact(emiInterest)} />
            <StatRow label="Total payment" value={formatINRCompact(emiTotal)} />
            <div className="h-px bg-white/[0.06]" />
            <StatRow label="Interest ratio"
              value={`${emiTotal > 0 ? ((emiInterest / emiTotal) * 100).toFixed(1) : 0}%`} />
          </div>
        </div>
      )
    }

    // Goal
    return (
      <div className="space-y-5">
        <div className="text-center">
          <p className="text-[9px] uppercase tracking-widest text-slate-600 mb-1">Required Monthly SIP</p>
          <p className="text-[32px] font-black text-indigo-300 num leading-none">{formatINR(Math.round(goalMonthly))}</p>
          <p className="text-[11px] text-slate-600 mt-1">per month for {goalMonths} months</p>
        </div>
        <div className="bg-indigo-500/[0.06] border border-indigo-500/15 rounded-xl px-4 py-3">
          <div className="flex justify-between items-center">
            <p className="text-[10px] text-slate-600">Target</p>
            <p className="text-[15px] font-bold text-white num">{formatINRCompact(parseFloat(goalTarget) || 0)}</p>
          </div>
        </div>
        <div className="space-y-3">
          <StatRow label="You invest (total)" value={formatINRCompact(goalInvested)} />
          <StatRow label="Market does the rest" value={formatINRCompact(Math.max(goalReturns, 0))} />
          <div className="h-px bg-white/[0.06]" />
          <StatRow label="Time frame" value={`${Math.floor((parseFloat(goalMonths) || 0) / 12)} yrs ${(parseFloat(goalMonths) || 0) % 12} mo`} accent />
        </div>
      </div>
    )
  }

  return (
    <>
      <TopBar title="Investments" subtitle="SIP tracker & calculators" />
      <div className="flex-1 p-4 md:p-6 pb-32 md:pb-6 max-w-5xl mx-auto w-full space-y-4">

        {/* Header summary cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Monthly SIP', value: '₹5,000', icon: TrendingUp, color: 'text-green-400' },
            { label: 'Invested', value: '₹0', icon: BarChart3, color: 'text-indigo-400' },
            { label: 'Returns', value: '+₹0', icon: Calculator, color: 'text-amber-400' },
          ].map((s) => (
            <div key={s.label} className="bg-[#13131f] border border-white/[0.07] rounded-2xl p-3 md:p-4 text-center">
              <s.icon size={16} className={`${s.color} mx-auto mb-2`} />
              <p className="text-[9px] md:text-[10px] text-slate-600 uppercase tracking-widest">{s.label}</p>
              <p className={`text-[15px] md:text-[17px] font-bold num mt-1 ${s.color === 'text-amber-400' ? 'text-green-400' : 'text-white'}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Two-panel calculator */}
        <div className="bg-[#13131f] border border-white/[0.07] rounded-2xl overflow-hidden">

          {/* Pill tab bar */}
          <div className="px-4 pt-4 border-b border-white/[0.05]">
            <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl overflow-x-auto scrollbar-none mb-4">
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 md:px-3 rounded-lg text-[11px] md:text-[12px] font-semibold whitespace-nowrap transition-all ${
                    tab === t.key
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]'
                  }`}>
                  <t.icon size={12} className={tab === t.key ? 'text-white' : 'text-slate-600'} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Split layout: inputs left, results right */}
          <div className="md:grid md:grid-cols-[1fr_260px] lg:grid-cols-[1fr_290px]">

            {/* LEFT — inputs */}
            <div className="p-4 md:p-5 space-y-3 md:space-y-4 border-b md:border-b-0 md:border-r border-white/[0.05]">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                <p className="text-[11px] uppercase tracking-widest text-slate-600">Inputs</p>
              </div>

              {tab === 'sip' && (<>
                <InputField label="Monthly Investment" value={sipMonthly} onChange={setSipMonthly} prefix="₹" hint="per month" />
                <InputField label="Investment Period" value={sipYears} onChange={setSipYears} suffix="years" />
                <InputField label="Expected Return" value={sipReturn} onChange={setSipReturn} suffix="% p.a." hint="Nifty avg ~12%" />
              </>)}

              {tab === 'stepup' && (<>
                <InputField label="Starting Monthly SIP" value={suMonthly} onChange={setSuMonthly} prefix="₹" />
                <InputField label="Annual Increase" value={suStep} onChange={setSuStep} suffix="% p.a." hint="try 10–15%" />
                <InputField label="Investment Period" value={suYears} onChange={setSuYears} suffix="years" />
                <InputField label="Expected Return" value={suReturn} onChange={setSuReturn} suffix="% p.a." />
              </>)}

              {tab === 'lumpsum' && (<>
                <InputField label="Investment Amount" value={lsAmount} onChange={setLsAmount} prefix="₹" />
                <InputField label="Investment Period" value={lsYears} onChange={setLsYears} suffix="years" />
                <InputField label="Expected Return" value={lsReturn} onChange={setLsReturn} suffix="% p.a." />
              </>)}

              {tab === 'emi' && (<>
                <InputField label="Loan Amount" value={emiPrincipal} onChange={setEmiPrincipal} prefix="₹" />
                <InputField label="Interest Rate" value={emiRate} onChange={setEmiRate} suffix="% p.a." />
                <InputField label="Tenure" value={emiTenure} onChange={setEmiTenure} suffix="months" hint={`${Math.floor((parseFloat(emiTenure) || 0) / 12)} yrs`} />
              </>)}

              {tab === 'goal' && (<>
                <InputField label="Target Amount" value={goalTarget} onChange={setGoalTarget} prefix="₹" hint="your goal" />
                <InputField label="Time Frame" value={goalMonths} onChange={setGoalMonths} suffix="months" hint={`${Math.floor((parseFloat(goalMonths) || 0) / 12)} yrs`} />
                <InputField label="Expected Return" value={goalReturn} onChange={setGoalReturn} suffix="% p.a." />
              </>)}

              {/* Tip */}
              <div className="flex items-start gap-2 bg-white/[0.02] rounded-xl p-3 mt-2">
                <div className="w-1 h-1 rounded-full bg-indigo-500/60 mt-1.5 flex-shrink-0" />
                <p className="text-[10px] text-slate-700 leading-relaxed">
                  {tab === 'sip' && 'SIP returns compound monthly. The longer you stay invested, the more powerful compounding becomes.'}
                  {tab === 'stepup' && 'Stepping up by 10% yearly closely tracks your annual salary hike and dramatically improves returns.'}
                  {tab === 'lumpsum' && 'Best for windfalls. Even a single large investment can compound significantly over time.'}
                  {tab === 'emi' && 'A lower rate or shorter tenure saves significant interest. Compare banks before choosing.'}
                  {tab === 'goal' && 'Start early — starting 5 years earlier can halve the required monthly investment.'}
                </p>
              </div>
            </div>

            {/* RIGHT — live results sidebar */}
            <div className="p-4 md:p-5 relative bg-white/[0.01] md:bg-transparent">
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <div className="w-1 h-4 bg-green-500 rounded-full" />
                <p className="text-[11px] uppercase tracking-widest text-slate-600">Live Result</p>
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              </div>
              {/* On mobile: show compact inline result; on desktop: full sidebar */}
              <div className="md:hidden">
                <MobileResultSummary />
              </div>
              <div className="hidden md:block">
                <SidebarContent />
              </div>
            </div>

          </div>
        </div>

      </div>
    </>
  )
}
