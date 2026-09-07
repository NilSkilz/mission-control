// Rope video library (TheDuchy), Tide-styled. Parents only — the route,
// the list API and the stream/thumb endpoints are all parent-gated.
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { EmptyHint } from '../tide/widgets'

const API_URL = import.meta.env.VITE_API_URL || ''
const token = () => localStorage.getItem('mission-control-token') || ''

const thumbSrc = (v) =>
  v.thumb
    ? `${API_URL}/api/videos/thumb/${encodeURIComponent(v.thumb)}?t=${encodeURIComponent(token())}`
    : v.thumbnailUrl || null

function PlayGlyph({ size = 46 }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%', background: 'var(--tide-grad-135)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 18px rgba(0,0,0,0.35)',
      }}
    >
      <svg width={size * 0.44} height={size * 0.44} viewBox="0 0 24 24" fill="#fff" style={{ marginLeft: 2 }}>
        <path d="M8 5v14l11-7z" />
      </svg>
    </div>
  )
}

function VideoCard({ video, onPlay }) {
  const [hover, setHover] = useState(false)
  const src = thumbSrc(video)
  return (
    <div
      className="tide-card tide-service"
      onClick={() => onPlay(video)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ aspectRatio: '16 / 9', position: 'relative', background: 'color-mix(in srgb, var(--tide-ink) 8%, transparent)' }}>
        {src ? (
          <img
            src={src}
            alt=""
            loading="lazy"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
              transform: hover ? 'scale(1.04)' : 'scale(1)', transition: 'transform 300ms ease',
            }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="tide-grad" style={{ fontWeight: 800, fontSize: 22 }}>▶</span>
          </div>
        )}
        <div
          style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.28)', opacity: hover ? 1 : 0, transition: 'opacity 200ms ease',
          }}
        >
          <PlayGlyph />
        </div>
        {video.index < 900 && (
          <span
            className="tide-mono"
            style={{
              position: 'absolute', top: 8, left: 8, fontSize: 10, fontWeight: 700, color: '#fff',
              background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', borderRadius: 6, padding: '2px 6px',
            }}
          >
            {String(video.index).padStart(2, '0')}
          </span>
        )}
      </div>
      <div style={{ padding: '10px 12px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div
          style={{
            fontWeight: 700, fontSize: 13.5, lineHeight: 1.3,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}
        >
          {video.title}
        </div>
        {video.description && (
          <div
            className="tide-sub"
            style={{
              fontSize: 12, lineHeight: 1.35,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}
          >
            {video.description}
          </div>
        )}
        {video.tutorialUrl && (
          <a
            href={video.tutorialUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--tide-accent-ink)', textDecoration: 'none', marginTop: 'auto' }}
          >
            written tutorial ↗
          </a>
        )}
      </div>
    </div>
  )
}

function VideoPlayer({ video, onClose }) {
  const videoRef = useRef(null)
  const [error, setError] = useState(null)

  const videoUrl = `${API_URL}/api/videos/stream/${video.category}/${encodeURIComponent(video.filename)}?t=${encodeURIComponent(token())}`

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === ' ' && videoRef.current) {
        e.preventDefault()
        videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(8,9,12,0.92)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 1080 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{ color: '#edeef2', fontWeight: 700, fontSize: 15, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {video.title}
          </div>
          <button
            onClick={onClose}
            className="tide-btn"
            style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', color: '#edeef2', padding: '6px 14px', fontSize: 13 }}
          >
            close ✕
          </button>
        </div>
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)', background: '#000' }}>
          {error ? (
            <div style={{ aspectRatio: '16 / 9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e06a6a', fontWeight: 600 }}>
              {error}
            </div>
          ) : (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              autoPlay
              style={{ width: '100%', display: 'block' }}
              onError={() => setError('video stream unavailable')}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default function Videos() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [playing, setPlaying] = useState(null)

  useEffect(() => {
    axios
      .get(`${API_URL}/api/videos`)
      .then((res) => {
        setVideos(res.data.videos || [])
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const filtered = videos.filter((v) => v.title.toLowerCase().includes(search.toLowerCase()))
  const sorted = [...filtered].sort((a, b) => {
    if (a.index < 900 && b.index >= 900) return -1
    if (b.index < 900 && a.index >= 900) return 1
    return a.index - b.index
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div className="tide-greet" style={{ fontSize: 'clamp(24px,5vw,30px)' }}>
            <span className="tide-grad">rope library</span>
          </div>
          <p className="tide-sub" style={{ marginTop: 6 }}>
            {videos.length ? `${videos.length} TheDuchy tutorials, streamed from the media drive` : 'TheDuchy tutorials'}
          </p>
        </div>
        <input
          className="tide-input"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="search ties, knots, harnesses…"
          style={{ marginLeft: 'auto', maxWidth: 280 }}
        />
      </div>

      {loading ? (
        <p className="tide-sub" style={{ marginTop: 18 }}>loading the library…</p>
      ) : error ? (
        <EmptyHint>couldn't load the library: {error}</EmptyHint>
      ) : sorted.length === 0 ? (
        <EmptyHint>nothing matches "{search}".</EmptyHint>
      ) : (
        <>
          {search && (
            <p className="tide-sub" style={{ fontSize: 13, marginTop: 14 }}>
              {sorted.length} {sorted.length === 1 ? 'match' : 'matches'}
            </p>
          )}
          <div
            style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
              gap: 12, marginTop: search ? 8 : 20,
            }}
          >
            {sorted.map((v) => (
              <VideoCard key={v.filename} video={v} onPlay={setPlaying} />
            ))}
          </div>
        </>
      )}

      {playing && <VideoPlayer video={playing} onClose={() => setPlaying(null)} />}
    </div>
  )
}
