import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui'

// SVG Icons - blue, semi-transparent
const Icons = {
  cpu: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.7)' }}>
      <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" strokeLinecap="round"/>
    </svg>
  ),
  back: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.7)' }}>
      <path d="M19 12H5m0 0l7 7m-7-7l7-7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  refresh: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.7)' }}>
      <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  agent: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.7)' }}>
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round"/>
    </svg>
  ),
  code: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.6)' }}>
      <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  search: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.6)' }}>
      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
    </svg>
  ),
  write: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.6)' }}>
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  home: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.6)' }}>
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 22V12h6v10" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  folder: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.6)' }}>
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  clock: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.5)' }}>
      <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" strokeLinecap="round"/>
    </svg>
  ),
  token: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.5)' }}>
      <circle cx="12" cy="12" r="10"/><path d="M12 6v12M6 12h12" strokeLinecap="round"/>
    </svg>
  )
}

const AGENT_CONFIG = {
  dev: { name: 'Dev', icon: Icons.code, category: 'BUILDER', color: 'emerald' },
  scout: { name: 'Scout', icon: Icons.search, category: 'RESEARCH', color: 'blue' },
  scribe: { name: 'Scribe', icon: Icons.write, category: 'RESEARCH', color: 'blue' },
  house: { name: 'House', icon: Icons.home, category: 'AUTOMATION', color: 'purple' }
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Never'
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

function formatDuration(ageMs) {
  if (!ageMs) return 'N/A'
  const seconds = Math.floor(ageMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

function StatusDot({ status }) {
  const colors = {
    active: 'bg-green-400',
    idle: 'bg-slate-500',
    error: 'bg-red-400'
  }
  return (
    <div className={`w-1.5 h-1.5 rounded-full ${colors[status] || colors.idle} ${status === 'active' ? 'animate-pulse' : ''}`} />
  )
}

function AgentCard({ agent, sessions = [], isSelected, onClick }) {
  if (!agent) return null
  const config = AGENT_CONFIG[agent.id] || { name: agent.name || 'Unknown', icon: Icons.agent, category: 'OTHER', color: 'slate' }
  const agentSessions = sessions.filter(s => s.key?.includes('subagent'))
  const lastSession = agentSessions[0]
  const status = lastSession && lastSession.ageMs < 300000 ? 'active' : 'idle'
  
  const borderColor = isSelected ? 'border-cyan-500/50' : 'border-slate-700/50'
  const bgColor = isSelected ? 'bg-slate-800/80' : 'bg-slate-800/30'
  
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded border ${borderColor} ${bgColor} hover:bg-slate-800/60 transition-all font-mono`}
    >
      <div className="flex items-center gap-2 mb-2">
        {config.icon}
        <span className="text-white text-sm flex-1">{config.name}</span>
        <StatusDot status={status} />
      </div>
      <div className="text-xs text-slate-500 space-y-0.5">
        <div className="flex justify-between">
          <span>Model</span>
          <span className="text-slate-400">{agent.model}</span>
        </div>
        <div className="flex justify-between">
          <span>Last</span>
          <span className="text-slate-400">{formatTimeAgo(lastSession?.updatedAt)}</span>
        </div>
      </div>
    </button>
  )
}

function SessionRow({ session }) {
  if (!session) return null
  
  const getSessionType = (key) => {
    if (!key) return 'UNK'
    if (key.includes('subagent')) return 'SUB'
    if (key.includes('cron')) return 'CRON'
    if (key.includes('main')) return 'MAIN'
    return 'UNK'
  }

  const getStatus = (session) => {
    if (session?.abortedLastRun) return 'error'
    if (session?.ageMs < 300000) return 'active'
    return 'idle'
  }

  const type = getSessionType(session.key)
  const status = getStatus(session)
  
  return (
    <tr className="border-b border-slate-800/50 hover:bg-slate-800/30 font-mono text-xs">
      <td className="py-2 px-3">
        <div className="flex items-center gap-2">
          <StatusDot status={status} />
          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
            type === 'MAIN' ? 'bg-cyan-500/20 text-cyan-400' :
            type === 'SUB' ? 'bg-emerald-500/20 text-emerald-400' :
            type === 'CRON' ? 'bg-purple-500/20 text-purple-400' :
            'bg-slate-500/20 text-slate-400'
          }`}>{type}</span>
        </div>
      </td>
      <td className="py-2 px-3 text-slate-400">{formatTimeAgo(session.updatedAt)}</td>
      <td className="py-2 px-3 text-slate-400">{formatDuration(session.ageMs)}</td>
      <td className="py-2 px-3 text-slate-500">{session.model?.split('/').pop() || '--'}</td>
      <td className="py-2 px-3 text-slate-500">{session.totalTokens ? `${Math.round(session.totalTokens / 1000)}k` : '--'}</td>
    </tr>
  )
}

export default function AgentsPage() {
  const [agents, setAgents] = useState([])
  const [sessions, setSessions] = useState([])
  const [blackboard, setBlackboard] = useState({ files: [], totalFiles: 0 })
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    
    try {
      const [agentsRes, sessionsRes, blackboardRes] = await Promise.all([
        fetch('/api/agents/registry'),
        fetch('/api/agents/sessions'),
        fetch('/api/agents/blackboard')
      ])

      const [agentsData, sessionsData, blackboardData] = await Promise.all([
        agentsRes.json(),
        sessionsRes.json(), 
        blackboardRes.json()
      ])

      setAgents(Array.isArray(agentsData) ? agentsData : [])
      setSessions(Array.isArray(sessionsData?.sessions) ? sessionsData.sessions : [])
      setBlackboard(blackboardData || { files: [], totalFiles: 0 })
    } catch (error) {
      console.error('Error fetching agents data:', error)
      setAgents([])
      setSessions([])
    }
    
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => fetchData(true), 30000)
    return () => clearInterval(interval)
  }, [])

  const filteredSessions = selectedAgent
    ? sessions.filter(s => s.key.includes('subagent'))
    : sessions

  const sessionCounts = {
    total: sessions.length,
    main: sessions.filter(s => s.key.includes('main') && !s.key.includes('subagent')).length,
    sub: sessions.filter(s => s.key.includes('subagent')).length,
    cron: sessions.filter(s => s.key.includes('cron')).length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-cyan-400 font-mono animate-pulse">LOADING_AGENTS...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700/50 sticky top-0 z-30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/simple-demo" className="p-2 hover:bg-slate-700/50 rounded transition-colors">
                {Icons.back}
              </Link>
              <div className="flex items-center gap-2">
                {Icons.cpu}
                <span className="text-sm text-cyan-400 font-mono">// AGENT_CONTROL</span>
              </div>
            </div>
            <button 
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className={`p-2 hover:bg-slate-700/50 rounded transition-colors ${refreshing ? 'animate-spin' : ''}`}
            >
              {Icons.refresh}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel - Agents */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="bg-slate-800/30 border-slate-700/50">
              <div className="p-4 space-y-3">
                <div className="text-xs text-slate-400 font-mono">// SUB_AGENTS</div>
                
                {/* All Sessions */}
                <button
                  onClick={() => setSelectedAgent(null)}
                  className={`w-full text-left p-3 rounded border font-mono text-sm ${
                    !selectedAgent 
                      ? 'border-cyan-500/50 bg-slate-800/80' 
                      : 'border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/60'
                  } transition-all`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white">All Sessions</span>
                    <span className="text-xs text-slate-500">{sessions.length}</span>
                  </div>
                </button>

                <div className="border-t border-slate-700/50 pt-3 space-y-2">
                  {agents.map(agent => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      sessions={sessions}
                      isSelected={selectedAgent?.id === agent.id}
                      onClick={() => setSelectedAgent(agent)}
                    />
                  ))}
                </div>
              </div>
            </Card>

            {/* Blackboard */}
            <Card className="bg-slate-800/30 border-slate-700/50">
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  {Icons.folder}
                  <span>// BLACKBOARD</span>
                </div>
                <div className="text-sm text-slate-300 font-mono">{blackboard.totalFiles} shared files</div>
                {blackboard.files?.slice(0, 3).map((file, i) => (
                  <div key={i} className="text-xs text-slate-500 font-mono truncate">{file?.name || file}</div>
                ))}
              </div>
            </Card>
          </div>

          {/* Main Content - Sessions */}
          <div className="lg:col-span-6">
            <Card className="bg-slate-800/30 border-slate-700/50">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs text-slate-400 font-mono">
                    // {selectedAgent ? `${selectedAgent.name.toUpperCase()}_SESSIONS` : 'ALL_SESSIONS'}
                  </div>
                  <div className="flex gap-2 text-[10px] font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400">{sessionCounts.main} MAIN</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">{sessionCounts.sub} SUB</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">{sessionCounts.cron} CRON</span>
                  </div>
                </div>

                {filteredSessions.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 font-mono text-sm">
                    NO_SESSIONS_FOUND
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700/50 text-left">
                          <th className="py-2 px-3 text-slate-500 text-[10px] uppercase font-mono">Status</th>
                          <th className="py-2 px-3 text-slate-500 text-[10px] uppercase font-mono">Last</th>
                          <th className="py-2 px-3 text-slate-500 text-[10px] uppercase font-mono">Duration</th>
                          <th className="py-2 px-3 text-slate-500 text-[10px] uppercase font-mono">Model</th>
                          <th className="py-2 px-3 text-slate-500 text-[10px] uppercase font-mono">Tokens</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSessions.slice(0, 15).map(session => (
                          <SessionRow key={session.key} session={session} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right Panel - Details */}
          <div className="lg:col-span-3">
            <Card className="bg-slate-800/30 border-slate-700/50">
              <div className="p-4 space-y-4">
                {selectedAgent ? (
                  <>
                    <div className="flex items-center gap-2">
                      {AGENT_CONFIG[selectedAgent.id]?.icon || Icons.agent}
                      <span className="text-xs text-cyan-400 font-mono">// {(selectedAgent.name || 'AGENT').toUpperCase()}</span>
                    </div>
                    
                    <div className="space-y-3 text-xs font-mono">
                      <div>
                        <div className="text-slate-500 mb-1">Role</div>
                        <div className="text-slate-300">{selectedAgent.role}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 mb-1">Model</div>
                        <div className="text-slate-300">{selectedAgent.model}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 mb-1">Environment</div>
                        <div className="text-slate-300">{selectedAgent.sandbox}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 mb-1">Capabilities</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedAgent.capabilities?.map(cap => (
                            <span key={cap} className="px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 text-[10px]">
                              {cap}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs text-slate-400 font-mono">// OVERVIEW</div>
                    <div className="space-y-3 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Sessions</span>
                        <span className="text-white">{sessions.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Active Agents</span>
                        <span className="text-green-400">{agents.filter(a => sessions.some(s => s.key?.includes('subagent') && s.ageMs < 300000)).length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Blackboard Files</span>
                        <span className="text-slate-300">{blackboard.totalFiles}</span>
                      </div>
                    </div>
                    
                    <div className="border-t border-slate-700/50 pt-3">
                      <div className="text-slate-500 text-[10px] mb-2">REGISTERED_AGENTS</div>
                      {agents.map(agent => (
                        <div key={agent.id} className="flex items-center gap-2 py-1 text-xs">
                          {AGENT_CONFIG[agent.id]?.icon || Icons.agent}
                          <span className="text-slate-300">{agent.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
