import { useState } from 'react';
import { Card } from './ui';

const API_BASE = import.meta.env.PROD ? 'https://api.cracky.co.uk' : '';

// Scene icons
const Icons = {
  movie: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5"/>
    </svg>
  ),
  night: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>
  ),
  away: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  home: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path d="M9 22V12h6v10" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  sun: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" strokeLinecap="round"/>
    </svg>
  ),
  coffee: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  party: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5.8 11.3L2 22l10.7-3.8M15 3l1 1-3.75 3.75M15 3l6 6-6 6-6-6 6-6zM4.15 12.7L12 22" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  lightOff: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 21h6M12 3a6 6 0 00-6 6c0 2.22 1.21 4.16 3 5.19V17a1 1 0 001 1h4a1 1 0 001-1v-2.81c1.79-1.03 3-2.97 3-5.19a6 6 0 00-6-6zM1 1l22 22" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
};

// Quick action scenes - customize based on HA setup
const defaultScenes = [
  { id: 'movie', name: 'Movie', icon: 'movie', service: 'scene.movie_mode', color: 'purple' },
  { id: 'goodnight', name: 'Goodnight', icon: 'night', service: 'scene.goodnight', color: 'indigo' },
  { id: 'away', name: 'Away', icon: 'away', service: 'scene.away_mode', color: 'slate' },
  { id: 'home', name: 'Home', icon: 'home', service: 'scene.arrive_home', color: 'green' },
  { id: 'bright', name: 'Bright', icon: 'sun', service: 'scene.all_lights_on', color: 'yellow' },
  { id: 'off', name: 'Lights Off', icon: 'lightOff', service: 'scene.all_lights_off', color: 'gray' },
];

function ActionButton({ scene, onActivate, isLoading }) {
  const colorClasses = {
    purple: 'border-purple-500/30 hover:bg-purple-500/20 hover:border-purple-500/50',
    indigo: 'border-indigo-500/30 hover:bg-indigo-500/20 hover:border-indigo-500/50',
    slate: 'border-slate-500/30 hover:bg-slate-500/20 hover:border-slate-500/50',
    green: 'border-green-500/30 hover:bg-green-500/20 hover:border-green-500/50',
    yellow: 'border-yellow-500/30 hover:bg-yellow-500/20 hover:border-yellow-500/50',
    gray: 'border-gray-500/30 hover:bg-gray-500/20 hover:border-gray-500/50',
    blue: 'border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/50',
  };

  const iconColorClasses = {
    purple: 'text-purple-400',
    indigo: 'text-indigo-400',
    slate: 'text-slate-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    gray: 'text-gray-400',
    blue: 'text-blue-400',
  };

  return (
    <button
      onClick={() => onActivate(scene)}
      disabled={isLoading}
      className={`
        flex flex-col items-center justify-center p-2 rounded-lg border 
        bg-slate-800/30 transition-all duration-200
        ${colorClasses[scene.color] || colorClasses.slate}
        ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer active:scale-95'}
      `}
    >
      <div className={iconColorClasses[scene.color] || 'text-slate-400'}>
        {Icons[scene.icon] || Icons.home}
      </div>
      <span className="text-xs text-slate-300 mt-1 font-mono">{scene.name}</span>
    </button>
  );
}

export function QuickActions({ scenes = defaultScenes }) {
  const [loading, setLoading] = useState(null);
  const [lastActivated, setLastActivated] = useState(null);
  const [error, setError] = useState(null);

  async function activateScene(scene) {
    setLoading(scene.id);
    setError(null);

    try {
      // Call HA service to activate scene
      const response = await fetch(`${API_BASE}/api/ha/service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: 'scene',
          service: 'turn_on',
          entity_id: scene.service
        })
      });

      if (!response.ok) {
        throw new Error('Failed to activate scene');
      }

      setLastActivated(scene.id);
      setTimeout(() => setLastActivated(null), 3000);
    } catch (err) {
      console.error('Scene activation error:', err);
      setError(scene.id);
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card className="bg-slate-800/50 border-orange-500/20 card-alive">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-orange-400 font-mono header-glow">// QUICK_ACTIONS</span>
          {lastActivated && (
            <span className="text-xs text-green-400 animate-pulse">✓ Activated</span>
          )}
          {error && (
            <span className="text-xs text-red-400">✗ Failed</span>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {scenes.map((scene) => (
            <ActionButton
              key={scene.id}
              scene={scene}
              onActivate={activateScene}
              isLoading={loading === scene.id}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

export default QuickActions;
