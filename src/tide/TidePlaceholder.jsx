import { useTideTheme } from './TideThemeProvider'

// Temporary Tide-native placeholder for screens that land in a later card.
export default function TidePlaceholder({ title, note }) {
  const { greeting } = useTideTheme()
  return (
    <div style={{ paddingTop: 8 }}>
      <div className="tide-greet" style={{ fontSize: 30 }}>
        <span className="tide-grad">{title}</span>
      </div>
      <p className="tide-sub" style={{ marginTop: 6 }}>{greeting}, stokes family</p>
      <div className="tide-card" style={{ marginTop: 20, padding: 20, maxWidth: 520 }}>
        <div className="tide-lbl">coming next</div>
        <p style={{ marginTop: 8, lineHeight: 1.6 }}>{note}</p>
      </div>
    </div>
  )
}
