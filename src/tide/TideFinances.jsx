import { useEffect, useMemo, useState } from 'react'
import { Label, EmptyHint } from './widgets'

// Cash flow series colours: polarity pair validated (CVD + contrast) against
// both Tide surfaces. Money IN is blue, OUT is the Tide coral.
const IN_COLOR = '#5a8fd6'
const OUT_COLOR = '#d96d8f'

// minor units (pence) -> display. Big numbers drop the pence.
function gbp(minor, { pence } = {}) {
  if (minor == null) return '—'
  const pounds = minor / 100
  const showPence = pence ?? Math.abs(pounds) < 1000
  const s = Math.abs(pounds).toLocaleString('en-GB', {
    minimumFractionDigits: showPence ? 2 : 0,
    maximumFractionDigits: showPence ? 2 : 0,
  })
  return `${pounds < 0 ? '-' : ''}£${s}`
}

const monthLabel = (ym) =>
  new Date(ym + '-15').toLocaleDateString('en-GB', { month: 'short' })

function dateLabel(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const monthYear = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })

function StatTile({ label, value, tone }) {
  return (
    <div className="tide-card" style={{ padding: '14px 16px', flex: '1 1 150px', minWidth: 150 }}>
      <div className="tide-lbl">{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: tone || 'var(--tide-ink)' }}>
        {value}
      </div>
    </div>
  )
}

// Grouped monthly in/out bars. Two series, so: legend + per-bar tooltips,
// hairline baseline, thin rounded marks with a surface gap between the pair.
function CashflowChart({ months }) {
  const W = 640, H = 180, PAD_L = 8, PAD_B = 20, PAD_T = 12
  const max = Math.max(1, ...months.flatMap((m) => [m.inMinor, m.outMinor]))
  const slot = (W - PAD_L) / Math.max(months.length, 1)
  const barW = Math.min(14, slot / 2 - 3)
  const y = (v) => H - PAD_B - (v / max) * (H - PAD_B - PAD_T)
  return (
    <div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 6, fontSize: 12, color: 'var(--tide-muted)' }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: IN_COLOR, marginRight: 5, verticalAlign: -1 }} />in</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: OUT_COLOR, marginRight: 5, verticalAlign: -1 }} />out</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <line x1={PAD_L} y1={H - PAD_B} x2={W} y2={H - PAD_B} stroke="var(--tide-hair)" strokeWidth="1" />
        {months.map((m, i) => {
          const cx = PAD_L + slot * i + slot / 2
          return (
            <g key={m.month}>
              <rect
                x={cx - barW - 1} y={y(m.inMinor)} width={barW} rx="3"
                height={Math.max(2, H - PAD_B - y(m.inMinor))} fill={IN_COLOR}
              >
                <title>{`${monthLabel(m.month)}: in ${gbp(m.inMinor)}`}</title>
              </rect>
              <rect
                x={cx + 1} y={y(m.outMinor)} width={barW} rx="3"
                height={Math.max(2, H - PAD_B - y(m.outMinor))} fill={OUT_COLOR}
              >
                <title>{`${monthLabel(m.month)}: out ${gbp(m.outMinor)}`}</title>
              </rect>
              <text x={cx} y={H - 5} textAnchor="middle" fontSize="10" fill="var(--tide-muted)">
                {monthLabel(m.month)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// One collapsible P&L group: header row with the group total, tap to expand
// the per-payee rows. Columns: selected month, then the 6-full-month average.
function PnlGroup({ group, month, avgMonths, tone }) {
  const [open, setOpen] = useState(false)
  const avgOf = (byMonth) =>
    avgMonths.length ? Math.round(avgMonths.reduce((s, m) => s + (byMonth[m] || 0), 0) / avgMonths.length) : 0
  const cell = (v) => (v ? gbp(v) : '—')
  return (
    <>
      <div
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '8px 0', borderBottom: '1px solid var(--tide-hair)', cursor: 'pointer', fontSize: 14 }}
      >
        <span style={{ width: 14, fontSize: 10, color: 'var(--tide-muted)' }}>{open ? '▾' : '▸'}</span>
        <span style={{ flex: 1, fontWeight: 600 }}>{group.label}</span>
        <span style={{ width: 86, textAlign: 'right', fontWeight: 600, color: tone }}>{cell(group.byMonth[month])}</span>
        <span className="tide-sub" style={{ width: 86, textAlign: 'right', fontSize: 12 }}>{cell(avgOf(group.byMonth))}</span>
      </div>
      {open && group.rows.map((r) => (
        <div key={r.label} style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '5px 0 5px 22px', borderBottom: '1px solid var(--tide-hair)', fontSize: 13 }}>
          <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--tide-muted)' }}>{r.label}</span>
          <span style={{ width: 86, textAlign: 'right' }}>{cell(r.byMonth[month])}</span>
          <span className="tide-sub" style={{ width: 86, textAlign: 'right', fontSize: 12 }}>{cell(avgOf(r.byMonth))}</span>
        </div>
      ))}
    </>
  )
}

// One line of the typical-month statement. Rows (the regular payees behind a
// fixed group, or the biggest payees behind a variable one) expand on tap.
function TypicalLine({ line, tone, suffix }) {
  const [open, setOpen] = useState(false)
  const hasRows = line.rows && line.rows.length > 0
  return (
    <>
      <div
        onClick={hasRows ? () => setOpen(!open) : undefined}
        style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '7px 0', borderBottom: '1px solid var(--tide-hair)', fontSize: 14, cursor: hasRows ? 'pointer' : 'default' }}
      >
        <span style={{ width: 14, fontSize: 10, color: 'var(--tide-muted)' }}>{hasRows ? (open ? '▾' : '▸') : ''}</span>
        <span style={{ flex: 1, fontWeight: 600 }}>
          {line.label}
          {suffix && <span className="tide-sub" style={{ fontSize: 11, fontWeight: 400, marginLeft: 6 }}>{suffix}</span>}
        </span>
        <span style={{ width: 92, textAlign: 'right', fontWeight: 600, color: tone }}>{gbp(line.typicalMinor)}</span>
      </div>
      {open && line.rows.map((r) => (
        <div key={r.label} style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '4px 0 4px 22px', borderBottom: '1px solid var(--tide-hair)', fontSize: 13 }}>
          <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--tide-muted)' }}>{r.label}</span>
          <span style={{ width: 92, textAlign: 'right' }}>{gbp(r.typicalMinor ?? r.avgMinor)}</span>
        </div>
      ))}
    </>
  )
}

// The "standard month" statement: regular income, fixed outgoings, what's left,
// then the average variable spend and the typical bottom line. No month picker,
// by design: this is the shape of every month, not a ledger.
function TypicalMonthSection({ tm }) {
  const totalRow = (label, value, tone, big) => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '8px 0 8px 22px', fontSize: big ? 15 : 14, fontWeight: 700 }}>
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ width: 92, textAlign: 'right', color: tone }}>{gbp(value)}</span>
    </div>
  )
  const basis = `${monthLabel(tm.months[0])}–${monthLabel(tm.months[tm.months.length - 1])}`
  const s = tm.summary
  return (
    <section className="tide-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <Label>a typical month</Label>
        <span className="tide-sub" style={{ fontSize: 11 }}>based on {basis} · regular lines are medians, variable spend is the average</span>
      </div>

      <div className="tide-lbl" style={{ marginTop: 10 }}>comes in</div>
      {tm.income.map((l) => <TypicalLine key={l.key} line={l} tone={IN_COLOR} suffix={l.irregular ? 'avg, lumpy' : null} />)}
      {totalRow('Regular income', s.incomeMinor, IN_COLOR)}

      <div className="tide-lbl" style={{ marginTop: 10 }}>goes out, fixed</div>
      {tm.fixed.map((l) => <TypicalLine key={l.key} line={l} />)}
      {totalRow('Fixed costs', s.fixedMinor, OUT_COLOR)}
      <div style={{ borderTop: '1px solid var(--tide-hair)' }}>
        {totalRow('Left after the fixed stuff', s.afterFixedMinor, s.afterFixedMinor >= 0 ? IN_COLOR : 'var(--tide-accent-ink)')}
      </div>

      <div className="tide-lbl" style={{ marginTop: 10 }}>then we typically spend</div>
      {tm.variable.map((l) => <TypicalLine key={l.key} line={l} />)}
      {totalRow('Variable spend', s.variableMinor, OUT_COLOR)}

      <div style={{ borderTop: '2px solid var(--tide-hair)', marginTop: 4 }}>
        {totalRow(
          s.netMinor >= 0 ? 'Typical month: saved' : 'Typical month: overspent by',
          Math.abs(s.netMinor),
          s.netMinor >= 0 ? IN_COLOR : 'var(--tide-accent-ink)',
          true
        )}
      </div>
    </section>
  )
}

function PnlSection({ pnl }) {
  const [month, setMonth] = useState(pnl.months[pnl.months.length - 1])
  const avgMonths = pnl.summary.avgMonths
  const sumFor = (groups, m) => groups.reduce((s, g) => s + (g.byMonth[m] || 0), 0)
  const totalIn = sumFor(pnl.income, month)
  const totalOut = sumFor(pnl.spending, month)
  const net = totalIn - totalOut
  const longMonth = (ym) => new Date(ym + '-15').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const totalRow = (label, value, tone) => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '8px 0 8px 22px', fontSize: 14, fontWeight: 700 }}>
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ width: 86, textAlign: 'right', color: tone }}>{gbp(value)}</span>
      <span style={{ width: 86 }} />
    </div>
  )

  return (
    <section className="tide-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Label>profit &amp; loss</Label>
        <span style={{ flex: 1 }} />
        <select className="tide-input" value={month} onChange={(e) => setMonth(e.target.value)} style={{ fontSize: 13, padding: '4px 8px' }}>
          {[...pnl.months].reverse().map((m) => <option key={m} value={m}>{longMonth(m)}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '8px 0 2px', fontSize: 11, color: 'var(--tide-muted)' }}>
        <span style={{ flex: 1 }} />
        <span style={{ width: 86, textAlign: 'right' }}>{monthLabel(month)}</span>
        <span style={{ width: 86, textAlign: 'right' }}>6-mo avg</span>
      </div>
      <div className="tide-lbl" style={{ marginTop: 6 }}>income</div>
      {pnl.income.map((g) => <PnlGroup key={g.key} group={g} month={month} avgMonths={avgMonths} tone={IN_COLOR} />)}
      {totalRow('Total in', totalIn, IN_COLOR)}
      <div className="tide-lbl" style={{ marginTop: 10 }}>spending</div>
      {pnl.spending.map((g) => <PnlGroup key={g.key} group={g} month={month} avgMonths={avgMonths} />)}
      {totalRow('Total out', totalOut, OUT_COLOR)}
      <div style={{ borderTop: '1px solid var(--tide-hair)', marginTop: 4 }}>
        {totalRow(net >= 0 ? 'Net saved' : 'Net overspend', Math.abs(net), net >= 0 ? IN_COLOR : 'var(--tide-accent-ink)')}
      </div>
      <div className="tide-sub" style={{ fontSize: 11, marginTop: 6 }}>
        committed bills (mortgages + direct debits + subscriptions) average {gbp(pnl.summary.minMonthlyOutgoingsMinor)}/mo over the last 6 full months
      </div>
    </section>
  )
}

function AccountCard({ acct }) {
  const neg = (acct.balanceMinor || 0) < 0
  return (
    <div className="tide-card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'baseline', gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{acct.name}</div>
        <div className="tide-sub" style={{ fontSize: 11 }}>{acct.provider}{acct.kind === 'space' ? ' · space' : ''}</div>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: neg ? 'var(--tide-accent-ink)' : 'var(--tide-ink)' }}>
        {acct.balanceMinor != null ? gbp(acct.balanceMinor, { pence: true }) : '—'}
      </div>
    </div>
  )
}

function MortgageCard({ m }) {
  const cliffSoon = m.monthsToRateEnd != null && m.monthsToRateEnd <= 6
  return (
    <div className="tide-card" style={{ padding: 16, flex: '1 1 260px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700, flex: 1 }}>{m.name}</div>
        {m.rateEndsOn && (
          <span
            className="tide-pill"
            style={cliffSoon ? { color: 'var(--tide-accent-ink)', fontWeight: 600 } : {}}
            title={`Fixed rate ends ${m.rateEndsOn}`}
          >
            {m.ratePct}% · {m.monthsToRateEnd} mo left
          </span>
        )}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, margin: '8px 0 2px' }}>{gbp(m.currentBalanceMinor)}</div>
      <div className="tide-sub" style={{ fontSize: 12 }}>
        {gbp(m.paymentMinor, { pence: true })}/mo · paid off {new Date(m.payoffDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
      </div>
      {m.equityMinor != null && (
        <div className="tide-sub" style={{ fontSize: 12, marginTop: 4 }}>
          equity {gbp(m.equityMinor)}
        </div>
      )}
    </div>
  )
}

function AssetRow({ asset, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    const pounds = parseFloat(val.replace(/[£,\s]/g, ''))
    if (!Number.isFinite(pounds)) return
    setBusy(true)
    try {
      const res = await fetch('/api/finance/asset-value', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: asset.key, valuePounds: pounds }),
      })
      if (res.ok) { setEditing(false); setVal(''); onSaved() }
    } finally {
      setBusy(false)
    }
  }

  // Property rows carry their purchase price (the earliest value row), so show
  // what it has done since we bought it. Indexed estimates, not valuations.
  const bought = asset.kind === 'property' && asset.purchaseMinor != null
    && asset.valueMinor != null && asset.purchaseDate !== asset.valueDate
  const gainMinor = bought ? asset.valueMinor - asset.purchaseMinor : 0
  const gainPct = bought ? (gainMinor / asset.purchaseMinor) * 100 : 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--tide-hair)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{asset.name}</div>
        <div className="tide-sub" style={{ fontSize: 11 }} title={asset.valueNote || undefined}>
          {bought
            ? `bought ${gbp(asset.purchaseMinor)} · ${monthYear(asset.purchaseDate)} · est as of ${monthYear(asset.valueDate)}`
            : asset.valueDate ? `as of ${dateLabel(asset.valueDate)}` : 'value needed'}
        </div>
        {bought && (
          <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, color: gainMinor >= 0 ? IN_COLOR : 'var(--tide-accent-ink)' }}>
            {gainMinor >= 0 ? '+' : '-'}{gbp(Math.abs(gainMinor))} ({gainMinor >= 0 ? '+' : ''}{gainPct.toFixed(0)}%) since purchase
          </div>
        )}
      </div>
      {editing ? (
        <span style={{ display: 'flex', gap: 6 }}>
          <input
            className="tide-input" value={val} onChange={(e) => setVal(e.target.value)}
            placeholder="£" inputMode="decimal" autoFocus
            style={{ width: 90, fontSize: 14, padding: '4px 8px' }}
            onKeyDown={(e) => { if (e.key === 'Enter') save() }}
          />
          <button className="tide-btn" onClick={save} disabled={busy} style={{ fontSize: 12, padding: '4px 10px' }}>save</button>
        </span>
      ) : (
        <button
          className="tide-btn tide-btn-ghost"
          onClick={() => { setEditing(true); setVal(asset.valueMinor != null ? String(asset.valueMinor / 100) : '') }}
          style={{ fontSize: 15, fontWeight: 700, color: 'var(--tide-ink)', padding: '4px 10px' }}
          title="Tap to update the value"
        >
          {asset.valueMinor != null ? gbp(asset.valueMinor) : 'add'}
        </button>
      )}
    </div>
  )
}

// ---- pension forecast ----
// Everything is in TODAY'S money: growth rates are real (after inflation), and
// contributions are assumed to track wages, so the target line (also in today's
// money) is directly comparable. Central 3% real is the usual planner default
// for a mixed fund; the band is the cautious/optimistic spread.
const ROB_PENSION = {
  key: 'pension-rob',
  dobISO: '1983-12-14',
  contribMinor: 54075, // Standard Life salary sacrifice: Rob £300.42 + Superdry £240.33
}
const GROWTH = { cautious: 1, central: 3, optimistic: 5 } // % real
// Target: PLSA "moderate" single lifestyle minus the full state pension,
// funded by 4% drawdown (i.e. gap x 25).
const TARGET_INCOME_MINOR = 3150000
const STATE_PENSION_MINOR = 1253500
const TARGET_MINOR = Math.round((TARGET_INCOME_MINOR - STATE_PENSION_MINOR) * 25)

function projectMinor(startMinor, contribMinor, annualPct, months) {
  const r = Math.pow(1 + annualPct / 100, 1 / 12) - 1
  const g = Math.pow(1 + r, months)
  return Math.round(startMinor * g + contribMinor * ((g - 1) / r))
}

const kFmt = (minor) => `£${Math.round(minor / 100000)}k`

function PensionForecast({ assets }) {
  const [retireAge, setRetireAge] = useState(65)
  const asset = assets.find((a) => a.key === ROB_PENSION.key)

  const model = useMemo(() => {
    if (!asset || asset.valueMinor == null) return null
    const dob = new Date(ROB_PENSION.dobISO)
    const now = new Date()
    // He retires in his birthday month (December) of the year he turns retireAge.
    const monthsTo = (year, monthIdx) =>
      (year - now.getFullYear()) * 12 + (monthIdx - now.getMonth())
    const N = monthsTo(dob.getFullYear() + retireAge, dob.getMonth())
    const sample = []
    for (let m = 0; m <= N; m += 12) sample.push(m)
    if (sample[sample.length - 1] !== N) sample.push(N)
    const series = {}
    for (const [name, pct] of Object.entries(GROWTH)) {
      series[name] = sample.map((m) => ({
        m,
        v: projectMinor(asset.valueMinor, ROB_PENSION.contribMinor, pct, m),
      }))
    }
    const end = (name) => series[name][series[name].length - 1].v
    // Extra monthly contribution (at central growth) that would close the gap.
    const r = Math.pow(1 + GROWTH.central / 100, 1 / 12) - 1
    const annuity = (Math.pow(1 + r, N) - 1) / r
    const shortfall = TARGET_MINOR - end('central')
    const extraMonthly = shortfall > 0 ? Math.round(shortfall / annuity) : 0
    // Age ticks every 5 years, plus the retirement age itself.
    const ticks = []
    for (let age = 45; age <= retireAge; age += 5) {
      const m = monthsTo(dob.getFullYear() + age, dob.getMonth())
      if (m > 6 && m <= N - 6) ticks.push({ m, age })
    }
    ticks.push({ m: N, age: retireAge })
    const ageAt = (m) => Math.floor((monthsTo(now.getFullYear(), now.getMonth()) - monthsTo(dob.getFullYear(), dob.getMonth()) + m) / 12)
    return { N, series, ends: { cautious: end('cautious'), central: end('central'), optimistic: end('optimistic') }, extraMonthly, ticks, ageAt, now }
  }, [asset, retireAge])

  if (!model) return null
  const { N, series, ends, extraMonthly, ticks } = model

  const W = 680, H = 230, PAD_L = 44, PAD_R = 58, PAD_T = 16, PAD_B = 22
  const maxV = Math.max(TARGET_MINOR, ends.optimistic) * 1.06
  const xs = (m) => PAD_L + (m / N) * (W - PAD_L - PAD_R)
  const ys = (v) => H - PAD_B - (v / maxV) * (H - PAD_B - PAD_T)
  const linePath = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${xs(p.m).toFixed(1)},${ys(p.v).toFixed(1)}`).join(' ')
  const bandPath = `${linePath(series.optimistic)} ${[...series.cautious].reverse()
    .map((p) => `L${xs(p.m).toFixed(1)},${ys(p.v).toFixed(1)}`).join(' ')} Z`
  // Recessive gridlines at round £100k steps.
  const gridStep = 10000000
  const grid = []
  for (let v = gridStep; v < maxV; v += gridStep) grid.push(v)
  const yr = (m) => new Date(model.now.getFullYear(), model.now.getMonth() + m).getFullYear()
  const onTrack = ends.central >= TARGET_MINOR

  return (
    <section className="tide-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Label>pension forecast (Rob)</Label>
        <span style={{ flex: 1 }} />
        <select className="tide-input" value={retireAge} onChange={(e) => setRetireAge(Number(e.target.value))} style={{ fontSize: 13, padding: '4px 8px', width: 'auto', flex: '0 0 auto' }}>
          {[60, 65, 68].map((a) => <option key={a} value={a}>retire at {a}</option>)}
        </select>
      </div>
      <div style={{ margin: '8px 0 2px', fontSize: 22, fontWeight: 700 }}>
        ≈ {gbp(ends.central)} <span className="tide-sub" style={{ fontSize: 13, fontWeight: 400 }}>at {retireAge}, in today's money · likely range {kFmt(ends.cautious)}–{kFmt(ends.optimistic)}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: onTrack ? IN_COLOR : 'var(--tide-accent-ink)' }}>
        {onTrack
          ? `on track for the "moderate" target of ${kFmt(TARGET_MINOR)}`
          : `"moderate" target is ${kFmt(TARGET_MINOR)}: roughly +£${Math.round(extraMonthly / 100).toLocaleString('en-GB')}/mo more would close the gap`}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {grid.map((v) => (
          <g key={v}>
            <line x1={PAD_L} y1={ys(v)} x2={W - PAD_R} y2={ys(v)} stroke="var(--tide-hair)" strokeWidth="1" />
            <text x={PAD_L - 6} y={ys(v) + 3} textAnchor="end" fontSize="10" fill="var(--tide-muted)">{kFmt(v)}</text>
          </g>
        ))}
        <path d={bandPath} fill={IN_COLOR} opacity="0.14" />
        <path d={linePath(series.central)} fill="none" stroke={IN_COLOR} strokeWidth="2" />
        <line x1={PAD_L} y1={ys(TARGET_MINOR)} x2={W - PAD_R} y2={ys(TARGET_MINOR)} stroke="var(--tide-muted)" strokeWidth="1" strokeDasharray="5 4" />
        <text x={W - PAD_R} y={ys(TARGET_MINOR) - 5} textAnchor="end" fontSize="11" fill="var(--tide-muted)">
          moderate retirement ≈ {kFmt(TARGET_MINOR)}
        </text>
        <circle cx={xs(0)} cy={ys(series.central[0].v)} r="4" fill={IN_COLOR} stroke="var(--tide-card-bg, var(--tide-bg))" strokeWidth="2" />
        <text x={W - PAD_R + 5} y={ys(ends.central) + 4} fontSize="12" fontWeight="700" fill="var(--tide-ink)">{kFmt(ends.central)}</text>
        <text x={W - PAD_R + 5} y={ys(ends.optimistic) + 4} fontSize="10" fill="var(--tide-muted)">{kFmt(ends.optimistic)}</text>
        <text x={W - PAD_R + 5} y={ys(ends.cautious) + 4} fontSize="10" fill="var(--tide-muted)">{kFmt(ends.cautious)}</text>
        {ticks.map((t) => (
          <text key={t.age} x={xs(t.m)} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--tide-muted)">{t.age}</text>
        ))}
        {series.central.map((p, i) => {
          const halfSlot = (W - PAD_L - PAD_R) / N * 6
          return (
            <rect
              key={p.m} x={xs(p.m) - halfSlot} y={PAD_T} width={halfSlot * 2}
              height={H - PAD_T - PAD_B} fill="transparent"
            >
              <title>{`age ${model.ageAt(p.m)} (${yr(p.m)}): ${gbp(p.v)} · range ${kFmt(series.cautious[i].v)}–${kFmt(series.optimistic[i].v)}`}</title>
            </rect>
          )
        })}
      </svg>
      <div className="tide-sub" style={{ fontSize: 11, marginTop: 8 }}>
        assumes {gbp(ROB_PENSION.contribMinor, { pence: true })}/mo keeps going in (you + Superdry, tracking wages) and {GROWTH.central}% real growth after inflation (band {GROWTH.cautious}–{GROWTH.optimistic}%).
        target = PLSA "moderate" single lifestyle ({gbp(TARGET_INCOME_MINOR)}/yr) minus the full state pension ({gbp(STATE_PENSION_MINOR)}/yr, from age 68), drawn at 4%. x-axis is age.
      </div>
    </section>
  )
}

export default function TideFinances() {
  const [data, setData] = useState(null)
  const [pnl, setPnl] = useState(null)
  const [typical, setTypical] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [error, setError] = useState(null)

  const load = () => {
    fetch('/api/finance/overview')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch((e) => setError(e.message))
    fetch('/api/finance/typical-month')
      .then((r) => (r.ok ? r.json() : null))
      .then(setTypical)
      .catch(() => {})
    fetch('/api/finance/pnl?months=12')
      .then((r) => (r.ok ? r.json() : null))
      .then(setPnl)
      .catch(() => {})
  }
  useEffect(load, [])

  const groups = useMemo(() => {
    if (!data) return null
    const open = data.accounts.filter((a) => !a.closed)
    return {
      current: open.filter((a) => a.kind !== 'space'),
      spaces: open.filter((a) => a.kind === 'space'),
      savings: data.assets.filter((a) => a.kind === 'savings' || a.kind === 'investment'),
      property: data.assets.filter((a) => a.kind === 'property'),
      pensions: data.assets.filter((a) => a.kind === 'pension'),
    }
  }, [data])

  if (error) return <EmptyHint>finances failed to load: {error}</EmptyHint>
  if (!data) return <EmptyHint>loading…</EmptyHint>

  const { totals } = data
  const propertyEquity = data.mortgages.reduce((s, m) => s + (m.equityMinor || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatTile label="net worth" value={gbp(totals.netWorthMinor)} />
        <StatTile label="cash" value={gbp(totals.cashMinor)} tone={totals.cashMinor < 0 ? 'var(--tide-accent-ink)' : undefined} />
        <StatTile label="savings + assets" value={gbp(totals.assetsMinor)} />
        <StatTile label="property equity" value={gbp(propertyEquity)} />
        <StatTile label="mortgage debt" value={gbp(-totals.debtMinor)} tone="var(--tide-accent-ink)" />
        {pnl && <StatTile label="min monthly bills" value={gbp(pnl.summary.minMonthlyOutgoingsMinor)} />}
      </div>

      {typical && typical.months.length > 0 && <TypicalMonthSection tm={typical} />}

      {pnl && pnl.months.length > 0 && (
        showDetail ? (
          <div>
            <PnlSection pnl={pnl} />
            <button className="tide-btn tide-btn-ghost" onClick={() => setShowDetail(false)} style={{ fontSize: 12, marginTop: 6 }}>
              hide monthly detail
            </button>
          </div>
        ) : (
          <button className="tide-btn tide-btn-ghost" onClick={() => setShowDetail(true)} style={{ fontSize: 12, alignSelf: 'flex-start' }}>
            ▸ monthly detail (full P&amp;L, month by month)
          </button>
        )
      )}

      <section>
        <Label>accounts</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {groups.current.map((a) => <AccountCard key={a.id} acct={a} />)}
        </div>
        {groups.spaces.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginTop: 10 }}>
            {groups.spaces.map((a) => <AccountCard key={a.id} acct={a} />)}
          </div>
        )}
        {groups.current.length === 0 && <EmptyHint>no feed data yet: the first sync will fill this in</EmptyHint>}
      </section>

      {data.cashflow.length > 0 && (
        <section className="tide-card" style={{ padding: 16 }}>
          <Label>cash flow, last 12 months (moves between our own accounts excluded)</Label>
          <CashflowChart months={data.cashflow.slice(-12)} />
        </section>
      )}

      <section>
        <Label>mortgages</Label>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {data.mortgages.map((m) => <MortgageCard key={m.key} m={m} />)}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        <section className="tide-card" style={{ padding: 16 }}>
          <Label>savings + investments</Label>
          {groups.savings.map((a) => <AssetRow key={a.key} asset={a} onSaved={load} />)}
        </section>
        <section className="tide-card" style={{ padding: 16 }}>
          <Label>property</Label>
          {groups.property.map((a) => <AssetRow key={a.key} asset={a} onSaved={load} />)}
          <EmptyHint>house tracks the Cornwall HPI, the field tracks the English farmland index; tap to override with a real valuation</EmptyHint>
        </section>
        <section className="tide-card" style={{ padding: 16 }}>
          <Label>pensions</Label>
          {groups.pensions.map((a) => <AssetRow key={a.key} asset={a} onSaved={load} />)}
          <EmptyHint>tap a value to true it up; ledger-tracked ones update themselves</EmptyHint>
        </section>
      </div>

      <PensionForecast assets={data.assets} />

      {data.recent.length > 0 && (
        <section className="tide-card" style={{ padding: 16 }}>
          <Label>recent</Label>
          {data.recent.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '7px 0', borderBottom: '1px solid var(--tide-hair)', fontSize: 14 }}>
              <span className="tide-mono" style={{ fontSize: 11, color: 'var(--tide-muted)', minWidth: 48 }}>{dateLabel(t.ts)}</span>
              <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t.counterparty || t.description}
                <span className="tide-sub" style={{ fontSize: 11, marginLeft: 8 }}>{t.account}</span>
              </span>
              <span style={{ fontWeight: 600, color: t.amountMinor > 0 ? IN_COLOR : 'var(--tide-ink)' }}>
                {t.amountMinor > 0 ? '+' : ''}{gbp(t.amountMinor, { pence: true })}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
