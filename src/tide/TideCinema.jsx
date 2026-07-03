import { useEffect, useState, useCallback } from 'react'
import { useUser } from '../context/UserContext'
import { firstName } from './people'
import { Label, EmptyHint } from './widgets'
import {
  getUsers, getContinueWatching, getRecentlyAdded, plexImage,
  getFilmRequests, addFilmRequest, updateFilmRequest, deleteFilmRequest,
} from '../lib/data'

const PLEX_LINK = 'https://plex.cracky.co.uk'
const SEERR_LINK = 'https://seerr.cracky.co.uk'

const POSTER_GRADIENTS = [
  'linear-gradient(160deg,#27496B,#0F1B2D)', 'linear-gradient(160deg,#8A3B2E,#2B1210)',
  'linear-gradient(160deg,#3E6B4F,#12241A)', 'linear-gradient(160deg,#6B4E8A,#1E1430)',
  'linear-gradient(160deg,#A0703A,#2E1D0D)', 'linear-gradient(160deg,#45707E,#101F26)',
]
function gradFor(title = '') {
  let h = 0
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0
  return POSTER_GRADIENTS[h % POSTER_GRADIENTS.length]
}

function Poster({ item, width = 108 }) {
  const src = plexImage(item.thumb)
  const [failed, setFailed] = useState(false)
  return (
    <div style={{ width, flex: 'none' }}>
      <div style={{ position: 'relative', width, aspectRatio: '2/3', borderRadius: 10, overflow: 'hidden', background: gradFor(item.title), boxShadow: '0 8px 20px -10px rgba(0,0,0,0.6)' }}>
        {src && !failed && (
          <img src={src} alt={item.title} onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        {item.media && (
          <span style={{ position: 'absolute', top: 6, left: 6, fontSize: 9, fontWeight: 800, letterSpacing: '0.04em', padding: '2px 6px', borderRadius: 999, background: 'rgba(10,11,15,0.72)', color: '#fff' }}>
            {item.media === 'tv' ? '📺 TV' : '🎬 FILM'}
          </span>
        )}
        {!src || failed ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', padding: 8, fontSize: 11, fontWeight: 700, color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}>{item.title}</div>
        ) : null}
        {item.progress > 0 && (
          <div style={{ position: 'absolute', left: 0, bottom: 0, height: 3, width: `${item.progress * 100}%`, background: 'var(--tide-grad)' }} />
        )}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
      {item.subtitle && <div className="tide-sub" style={{ fontSize: 10.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.subtitle}</div>}
    </div>
  )
}

export default function TideCinema() {
  const { user } = useUser()
  const isParent = user?.role === 'parent'
  const [onDeck, setOnDeck] = useState([])
  const [recent, setRecent] = useState([])
  const [requests, setRequests] = useState([])
  const [users, setUsers] = useState([])
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState('film')
  const [loading, setLoading] = useState(true)

  const reloadRequests = useCallback(async () => setRequests(await getFilmRequests()), [])
  const userById = Object.fromEntries(users.map((u) => [u.id, u]))

  useEffect(() => {
    let alive = true
    Promise.all([getContinueWatching(), getRecentlyAdded(), getFilmRequests(), getUsers()]).then(([d, r, q, u]) => {
      if (!alive) return
      setOnDeck(d); setRecent(r); setRequests(q); setUsers(u); setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const request = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    await addFilmRequest({ title: title.trim(), requestedBy: user.id, kind })
    setTitle('')
    reloadRequests()
  }
  const setStatus = async (r, status) => { await updateFilmRequest(r.id, { status }); reloadRequests() }
  const remove = async (r) => { await deleteFilmRequest(r.id); reloadRequests() }

  const pending = requests.filter((r) => r.status === 'pending')
  const decided = requests.filter((r) => r.status !== 'pending')
  const tonight = onDeck[0]
  const films = recent.filter((m) => m.media === 'film').slice(0, 12)
  const shows = recent.filter((m) => m.media === 'tv').slice(0, 12)
  const kindTag = (k) => (k === 'tv' ? '📺 tv' : '🎬 film')

  return (
    // Cinema lives in the night theme permanently — lamplight is always right here.
    <div data-tide-theme="night" style={{ background: 'var(--tide-ground)', borderRadius: 20, padding: 'clamp(16px,3vw,24px)', margin: '-2px', position: 'relative', overflow: 'hidden' }}>
      <div className="tide-glow" style={{ position: 'absolute' }} />
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <div className="tide-greet" style={{ fontSize: 'clamp(24px,5vw,30px)', color: 'var(--tide-ink)' }}><span className="tide-grad">cinema</span></div>
          <a href={PLEX_LINK} target="_blank" rel="noreferrer" className="tide-pill" style={{ marginLeft: 'auto', textDecoration: 'none' }}>open plex ↗</a>
        </div>
        <p className="tide-sub" style={{ marginTop: 6 }}>continue watching, new films &amp; tv, and requests</p>

        {loading ? (
          <p className="tide-sub" style={{ marginTop: 18 }}>loading…</p>
        ) : (
          <>
            {/* tonight */}
            {tonight && (
              <div className="tide-card" style={{ padding: 16, marginTop: 18, display: 'flex', gap: 16, alignItems: 'center' }}>
                <Poster item={tonight} width={92} />
                <div style={{ minWidth: 0 }}>
                  <div className="tide-lbl">pick up where you left off</div>
                  <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{tonight.title}</div>
                  {tonight.subtitle && <div className="tide-sub">{tonight.subtitle}</div>}
                  <a href={PLEX_LINK} target="_blank" rel="noreferrer" className="tide-btn tide-btn-primary" style={{ display: 'inline-block', marginTop: 12, padding: '8px 18px', textDecoration: 'none' }}>▶ play</a>
                </div>
              </div>
            )}

            {/* continue watching */}
            {onDeck.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <Label>continue watching</Label>
                <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 6, marginTop: 8 }}>
                  {onDeck.map((m) => <Poster key={m.ratingKey} item={m} />)}
                </div>
              </div>
            )}

            {/* recently added — films + tv */}
            {recent.length === 0 ? (
              <div style={{ marginTop: 24 }}>
                <Label>recently added</Label>
                <EmptyHint>nothing new right now (or Plex is offline).</EmptyHint>
              </div>
            ) : (
              <>
                {films.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <Label>new films</Label>
                    <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 6, marginTop: 8 }}>
                      {films.map((m) => <Poster key={m.ratingKey} item={m} />)}
                    </div>
                  </div>
                )}
                {shows.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <Label>new tv</Label>
                    <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 6, marginTop: 8 }}>
                      {shows.map((m) => <Poster key={m.ratingKey} item={m} />)}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* request a film or show */}
            <div style={{ marginTop: 24, maxWidth: 620 }}>
              <Label>request a film or show</Label>
              <form onSubmit={request} className="tide-card" style={{ padding: 12, display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 4, background: 'var(--tide-card)', border: '1px solid var(--tide-card-border)', borderRadius: 999, padding: 3 }}>
                  {[['film', '🎬 film'], ['tv', '📺 tv']].map(([k, lbl]) => (
                    <button type="button" key={k} onClick={() => setKind(k)} className="tide-btn" style={{ padding: '5px 12px', fontSize: 13, background: kind === k ? 'var(--tide-grad-135)' : 'transparent', color: kind === k ? '#fff' : 'var(--tide-muted)' }}>{lbl}</button>
                  ))}
                </div>
                <input className="tide-input" style={{ flex: '1 1 160px' }} placeholder={kind === 'tv' ? 'which show?' : 'which film?'} value={title} onChange={(e) => setTitle(e.target.value)} />
                <button className="tide-btn tide-btn-primary" style={{ padding: '9px 18px' }} disabled={!title.trim()}>ask</button>
              </form>
              <p className="tide-sub" style={{ fontSize: 12, marginTop: 6 }}>
                {isParent ? 'requests land here for you to approve, then add in Seerr.' : 'a grown-up approves it, then it gets added.'}
              </p>

              {pending.length > 0 && (
                <div className="tide-card" style={{ padding: 16, marginTop: 12 }}>
                  <Label>{isParent ? 'waiting for you' : 'waiting for approval'}</Label>
                  {pending.map((r) => (
                    <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', fontSize: 14 }}>
                      <span className="tide-sub" style={{ fontSize: 11 }}>{kindTag(r.kind)}</span>
                      <span>{r.title}</span>
                      {userById[r.requestedBy] && <span className="tide-sub" style={{ fontSize: 12 }}>· {firstName(userById[r.requestedBy]).toLowerCase()}</span>}
                      {isParent ? (
                        <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                          <button onClick={() => setStatus(r, 'approved')} className="tide-btn tide-btn-primary" style={{ padding: '5px 12px', fontSize: 13 }}>approve</button>
                          <button onClick={() => setStatus(r, 'declined')} className="tide-btn tide-btn-ghost" style={{ padding: '5px 10px', fontSize: 13 }}>no</button>
                        </span>
                      ) : (
                        <span style={{ marginLeft: 'auto', fontSize: 12 }}>⏳</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {decided.length > 0 && (
                <div className="tide-card" style={{ padding: 16, marginTop: 12 }}>
                  <Label>recent requests</Label>
                  {decided.map((r) => (
                    <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', fontSize: 14, opacity: r.status === 'declined' ? 0.5 : 1 }}>
                      <span className="tide-sub" style={{ fontSize: 11 }}>{kindTag(r.kind)}</span>
                      <span>{r.title}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: r.status === 'approved' ? 'var(--p-logan)' : 'var(--tide-faint)' }}>
                        {r.status === 'approved' ? 'approved ✓' : 'not this time'}
                      </span>
                      {isParent && r.status === 'approved' && (
                        <a href={`${SEERR_LINK}/search?query=${encodeURIComponent(r.title)}`} target="_blank" rel="noreferrer" className="tide-sub" style={{ fontSize: 12 }}>add in seerr ↗</a>
                      )}
                      {isParent && <button onClick={() => remove(r)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--tide-faint)', cursor: 'pointer' }}>×</button>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
