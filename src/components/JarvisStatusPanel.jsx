import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from './ui';

// CPU icon
const CpuIcon = (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.7)' }}>
    <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" strokeLinecap="round"/>
  </svg>
);

const ExternalLinkIcon = (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'rgba(148, 163, 184, 0.5)' }}>
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const API_BASE = import.meta.env.PROD ? 'https://api.cracky.co.uk' : '';

export function JarvisStatusPanel() {
  const [status, setStatus] = useState(null);
  const [sessions, setSessions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentAction, setRecentAction] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statusRes, sessionsRes] = await Promise.allSettled([
          fetch(`${API_BASE}/api/openclaw/status`),
          fetch(`${API_BASE}/api/agents/sessions`)
        ]);

        if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
          const data = await statusRes.value.json();
          setStatus(data);
        }

        if (sessionsRes.status === 'fulfilled' && sessionsRes.value.ok) {
          const data = await sessionsRes.value.json();
          setSessions(data);
          
          // Find most recent activity
          if (data.sessions && data.sessions.length > 0) {
            const sortedSessions = [...data.sessions].sort((a, b) => 
              new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0)
            );
            const recent = sortedSessions[0];
            if (recent && recent.lastActivity) {
              const ago = getTimeAgo(new Date(recent.lastActivity));
              setRecentAction(`${recent.label || recent.key}: ${ago}`);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to fetch Jarvis status:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Format relative time
  function getTimeAgo(date) {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  // Determine if actively working (session activity in last 5 mins)
  const isActive = sessions?.sessions?.some(s => {
    if (!s.lastActivity) return false;
    const diff = Date.now() - new Date(s.lastActivity).getTime();
    return diff < 5 * 60 * 1000; // 5 minutes
  });

  // Get active sub-agent count
  const activeAgents = sessions?.sessions?.filter(s => {
    if (!s.lastActivity) return false;
    const diff = Date.now() - new Date(s.lastActivity).getTime();
    return diff < 60 * 60 * 1000; // Active in last hour
  }).length || 0;

  // Get next scheduled cron job (hardcoded for now, could fetch from API)
  const getNextScheduled = () => {
    const now = new Date();
    const hour = now.getHours();
    
    // Morning briefing at 8am
    if (hour < 8) return '08:00 briefing';
    // Next day
    return 'Tomorrow 08:00';
  };

  // Determine animation class based on activity
  const panelClass = isActive ? 'panel-active' : 'card-alive';
  const statusDotClass = status?.status === 'running' 
    ? (isActive ? 'bg-green-400 animate-pulse' : 'bg-green-400 status-online')
    : 'bg-red-400 status-offline';

  return (
    <Card className={`bg-slate-800/50 border-cyan-500/20 ${panelClass}`}>
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="subtle-float">{CpuIcon}</div>
          <span className="text-xs text-cyan-400 font-mono header-glow flex-1">// JARVIS</span>
          <Link to="/agents" className="opacity-50 hover:opacity-100 transition-opacity">
            {ExternalLinkIcon}
          </Link>
        </div>

        {/* Status Grid */}
        <div className="space-y-1.5 text-xs font-mono">
          {/* Status & Model */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${statusDotClass}`}></div>
              <span className="text-slate-300 data-stream">
                {loading ? 'Loading...' : (status?.status === 'running' ? (isActive ? 'Working' : 'Online') : 'Offline')}
              </span>
            </div>
            <span className="text-cyan-400 value-live">
              {status?.model?.split('/').pop() || 'Opus'}
            </span>
          </div>

          {/* Active Agents */}
          {activeAgents > 0 && (
            <div className="flex items-center justify-between text-yellow-400">
              <span>Sub-agents</span>
              <span className="value-live">{activeAgents} active</span>
            </div>
          )}

          {/* Recent Activity */}
          {recentAction && (
            <div className="text-slate-500 truncate" title={recentAction}>
              Last: {recentAction}
            </div>
          )}

          {/* Next Scheduled */}
          <div className="text-slate-400 data-stream">
            Next: {getNextScheduled()}
          </div>
        </div>

        {/* Activity Indicator Bar */}
        {isActive && (
          <div className="mt-2 h-0.5 bg-gradient-to-r from-cyan-500/0 via-cyan-500/50 to-cyan-500/0 rounded animate-pulse"></div>
        )}
      </div>
    </Card>
  );
}

export default JarvisStatusPanel;
