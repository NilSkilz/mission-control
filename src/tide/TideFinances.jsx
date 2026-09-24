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

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--tide-hair)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{asset.name}</div>
        <div className="tide-sub" style={{ fontSize: 11 }}>
          {asset.valueDate ? `as of ${dateLabel(asset.valueDate)}` : 'value needed'}
        </div>
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

export default function TideFinances() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = () => {
    fetch('/api/finance/overview')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch((e) => setError(e.message))
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
      </div>

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
        </section>
        <section className="tide-card" style={{ padding: 16 }}>
          <Label>pensions</Label>
          {groups.pensions.map((a) => <AssetRow key={a.key} asset={a} onSaved={load} />)}
          <EmptyHint>tap a value to true it up; ledger-tracked ones update themselves</EmptyHint>
        </section>
      </div>

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
