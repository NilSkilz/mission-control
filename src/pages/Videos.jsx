import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

// SVG Icons matching sci-fi dashboard style
const Icons = {
  play: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  search: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.7)' }}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
    </svg>
  ),
  film: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.7)' }}>
      <rect x="2" y="2" width="20" height="20" rx="2" />
      <path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5" strokeLinecap="round" />
    </svg>
  ),
  externalLink: (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'rgba(56, 189, 248, 0.5)' }}>
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  close: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
};

// Terminal-style section header
function SectionHeader({ prefix, title, subtitle }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-3">
        <span className="text-sky-400/60 font-mono text-sm">// {prefix}</span>
        <div className="flex-1 h-px bg-gradient-to-r from-sky-400/30 to-transparent" />
      </div>
      <h2 className="text-xl font-medium text-slate-100 mt-1 tracking-wide">{title}</h2>
      {subtitle && <p className="text-slate-500 text-sm font-mono mt-1">{subtitle}</p>}
    </div>
  );
}

function VideoCard({ video, onPlay, index }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  return (
    <div 
      onClick={() => onPlay(video)}
      className="group cursor-pointer relative"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Card container with sci-fi styling */}
      <div className="bg-slate-900/60 backdrop-blur-sm rounded-lg overflow-hidden border border-sky-400/20 hover:border-sky-400/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(56,189,248,0.15)]">
        {/* Thumbnail area */}
        <div className="aspect-video bg-slate-950/80 flex items-center justify-center relative overflow-hidden">
          {video.thumbnailUrl ? (
            <>
              <img 
                src={video.thumbnailUrl} 
                alt={video.title} 
                className={`w-full h-full object-cover transition-all duration-500 ${imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'} group-hover:scale-110`}
                onLoad={() => setImageLoaded(true)}
              />
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
                </div>
              )}
            </>
          ) : (
            <div className="text-sky-400/20 group-hover:text-sky-400/40 transition-colors">
              {Icons.film}
            </div>
          )}
          
          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-slate-950/60 backdrop-blur-sm">
            <div className="w-14 h-14 rounded-full bg-sky-400/20 border border-sky-400/50 flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300 shadow-[0_0_20px_rgba(56,189,248,0.3)]">
              <div className="text-sky-400 ml-1">
                {Icons.play}
              </div>
            </div>
          </div>
          
          {/* Index badge */}
          {video.index < 900 && (
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-slate-950/80 backdrop-blur-sm rounded border border-sky-400/30 text-sky-400/80 text-xs font-mono">
              #{video.index.toString().padStart(2, '0')}
            </div>
          )}
        </div>
        
        {/* Info area */}
        <div className="p-3 border-t border-sky-400/10">
          <h3 className="text-sm font-medium text-slate-200 line-clamp-2 leading-tight group-hover:text-sky-300 transition-colors">
            {video.title}
          </h3>
          {video.description && (
            <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 font-mono">{video.description}</p>
          )}
          {video.tutorialUrl && (
            <a 
              href={video.tutorialUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-xs text-sky-400/70 hover:text-sky-400 mt-2 transition-colors font-mono"
            >
              <span>VIEW_TUTORIAL</span>
              {Icons.externalLink}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function VideoPlayer({ video, onClose }) {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
  
  const videoUrl = `${API_URL}/api/videos/stream/${video.category}/${encodeURIComponent(video.filename)}`;
  
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ' && videoRef.current) {
        e.preventDefault();
        videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center" onClick={onClose}>
      <div className="relative w-full max-w-6xl mx-4" onClick={e => e.stopPropagation()}>
        {/* Header bar */}
        <div className="absolute -top-14 left-0 right-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sky-400/60 font-mono text-xs">// NOW_PLAYING</span>
            <h2 className="text-white font-medium truncate max-w-[60vw]">{video.title}</h2>
          </div>
          <button 
            onClick={onClose}
            className="flex items-center gap-2 text-slate-400 hover:text-sky-400 transition-colors font-mono text-sm"
          >
            <span>[ESC]</span>
            <div className="p-1 rounded border border-slate-700 hover:border-sky-400/50 transition-colors">
              {Icons.close}
            </div>
          </button>
        </div>
        
        {/* Video container */}
        <div className="rounded-lg overflow-hidden border border-sky-400/30 shadow-[0_0_40px_rgba(56,189,248,0.1)]">
          {error ? (
            <div className="aspect-video bg-slate-900 flex items-center justify-center">
              <div className="text-center">
                <div className="text-red-400 font-mono text-sm">// ERROR</div>
                <p className="text-slate-400 mt-2">{error}</p>
              </div>
            </div>
          ) : (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              autoPlay
              className="w-full"
              onError={() => setError('Video stream unavailable')}
            >
              Your browser does not support video playback.
            </video>
          )}
        </div>
        
        {/* Controls hint */}
        <div className="mt-4 flex items-center justify-center gap-6 text-slate-600 text-xs font-mono">
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-slate-900/80 border border-slate-700 rounded text-slate-400">SPACE</kbd>
            <span>PLAY/PAUSE</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-slate-900/80 border border-slate-700 rounded text-slate-400">ESC</kbd>
            <span>CLOSE</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Videos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [playing, setPlaying] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/api/videos`)
      .then(res => {
        setVideos(res.data.videos || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const filteredVideos = videos.filter(v => 
    v.title.toLowerCase().includes(search.toLowerCase())
  );

  const sortedVideos = [...filteredVideos].sort((a, b) => {
    if (a.index < 900 && b.index >= 900) return -1;
    if (b.index < 900 && a.index >= 900) return 1;
    return a.index - b.index;
  });

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
          <p className="text-slate-500 font-mono text-sm">// LOADING_LIBRARY...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-950/30 backdrop-blur-sm rounded-lg border border-red-500/30">
        <div className="text-red-400 font-mono text-sm mb-2">// ERROR</div>
        <p className="text-red-200">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <SectionHeader 
            prefix="MEDIA" 
            title="TheDuchy Library" 
            subtitle={`${videos.length} tutorials indexed`}
          />
        </div>
        
        {/* Search */}
        <div className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors">
            {Icons.search}
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="SEARCH_QUERY..."
            className="w-64 bg-slate-900/60 backdrop-blur-sm border border-sky-400/20 rounded-lg px-4 py-2.5 pl-10 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-400/50 focus:shadow-[0_0_15px_rgba(56,189,248,0.1)] transition-all font-mono text-sm"
          />
        </div>
      </div>

      {/* Results count */}
      {search && (
        <div className="flex items-center gap-2 text-slate-500 text-sm font-mono">
          <span className="text-sky-400/60">//</span>
          <span>RESULTS: {filteredVideos.length} {filteredVideos.length === 1 ? 'match' : 'matches'} for "{search}"</span>
        </div>
      )}

      {/* Video Grid */}
      {sortedVideos.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-slate-600 font-mono">// NO_RESULTS</div>
          <p className="text-slate-500 mt-2">No videos matching query</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {sortedVideos.map((video, index) => (
            <VideoCard 
              key={video.filename} 
              video={video} 
              onPlay={setPlaying}
              index={index}
            />
          ))}
        </div>
      )}

      {/* Video Player Modal */}
      {playing && (
        <VideoPlayer 
          video={playing} 
          onClose={() => setPlaying(null)} 
        />
      )}
    </div>
  );
}
