import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

function VideoCard({ video, onPlay }) {
  return (
    <div 
      onClick={() => onPlay(video)}
      className="group cursor-pointer bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700 hover:border-teal-500/50 transition-all hover:scale-[1.02]"
    >
      <div className="aspect-video bg-slate-900 flex items-center justify-center relative">
        {video.thumbnail ? (
          <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
        ) : (
          <div className="text-6xl opacity-20 group-hover:opacity-40 transition-opacity">🪢</div>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
          <div className="w-14 h-14 rounded-full bg-teal-500/90 flex items-center justify-center">
            <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-slate-200 line-clamp-2 leading-tight">
          {video.title}
        </h3>
        {video.description && (
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{video.description}</p>
        )}
        {video.tutorialUrl && (
          <a 
            href={video.tutorialUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-xs text-teal-400 hover:text-teal-300 mt-1 inline-block"
          >
            View tutorial →
          </a>
        )}
      </div>
    </div>
  );
}

function VideoPlayer({ video, onClose }) {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
  
  const videoUrl = `${API_URL}/api/videos/stream/${video.category}/${encodeURIComponent(video.filename)}`;
  
  // Handle keyboard shortcuts
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
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={onClose}>
      <div className="relative w-full max-w-6xl mx-4" onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 text-slate-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <span className="text-sm">Close</span>
          <span className="text-2xl">×</span>
        </button>
        
        {/* Title */}
        <h2 className="absolute -top-12 left-0 text-white font-medium truncate max-w-[80%]">
          {video.title}
        </h2>
        
        {/* Video */}
        {error ? (
          <div className="aspect-video bg-slate-900 rounded-lg flex items-center justify-center text-red-400">
            <div className="text-center">
              <p>Failed to load video</p>
              <p className="text-sm text-slate-500 mt-2">{error}</p>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            autoPlay
            className="w-full rounded-lg shadow-2xl"
            onError={() => setError('Video could not be loaded')}
          >
            Your browser does not support video playback.
          </video>
        )}
        
        {/* Keyboard hints */}
        <div className="mt-4 text-center text-slate-500 text-sm">
          <kbd className="px-2 py-1 bg-slate-800 rounded text-xs mr-2">Space</kbd> Play/Pause
          <kbd className="px-2 py-1 bg-slate-800 rounded text-xs ml-4 mr-2">Esc</kbd> Close
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

  // Filter videos by search
  const filteredVideos = videos.filter(v => 
    v.title.toLowerCase().includes(search.toLowerCase())
  );

  // Sort: numbered videos first (by index), then unknown ones
  const sortedVideos = [...filteredVideos].sort((a, b) => {
    if (a.index < 900 && b.index >= 900) return -1;
    if (b.index < 900 && a.index >= 900) return 1;
    return a.index - b.index;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading video library...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/50 rounded-lg text-red-200">
        Error loading videos: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">🪢</span>
            TheDuchy Library
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {videos.length} rope bondage tutorials
          </p>
        </div>
        
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tutorials..."
            className="w-64 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 pl-10 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
          <svg 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Results count */}
      {search && (
        <p className="text-slate-500 text-sm">
          Found {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''} matching "{search}"
        </p>
      )}

      {/* Video Grid */}
      {sortedVideos.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No videos found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {sortedVideos.map(video => (
            <VideoCard 
              key={video.filename} 
              video={video} 
              onPlay={setPlaying}
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
