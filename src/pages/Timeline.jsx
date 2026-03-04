import { TodayTimeline } from '../components/TodayTimeline';

export default function TimelinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900">
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `
          linear-gradient(rgba(34,197,241,0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(34,197,241,0.1) 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px'
      }}></div>
      
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-mono text-cyan-400 mb-2">
            // TODAY_TIMELINE
          </h1>
          <p className="text-slate-400 text-sm font-mono">
            Temporal view of today's events and system activity
          </p>
        </div>

        {/* Main Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Full Timeline */}
          <div className="lg:col-span-2">
            <TodayTimeline className="h-[80vh]" />
          </div>
          
          {/* Timeline Stats & Summary */}
          <div className="space-y-4">
            <div className="bg-slate-800/50 border border-slate-600/30 rounded-lg p-4">
              <h3 className="text-sm font-mono text-cyan-400 mb-3">// TIMELINE_STATS</h3>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Events</span>
                  <span className="text-white">--</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Calendar</span>
                  <span className="text-purple-400">--</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">System</span>
                  <span className="text-cyan-400">--</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Automations</span>
                  <span className="text-indigo-400">--</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-600/30 rounded-lg p-4">
              <h3 className="text-sm font-mono text-cyan-400 mb-3">// QUICK_ACTIONS</h3>
              <div className="space-y-2">
                <button className="w-full text-left text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors py-1">
                  ./refresh_timeline
                </button>
                <button className="w-full text-left text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors py-1">
                  ./export_today
                </button>
                <button className="w-full text-left text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors py-1">
                  ./view_history
                </button>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-600/30 rounded-lg p-4">
              <h3 className="text-sm font-mono text-cyan-400 mb-3">// FILTERS</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-mono">
                  <input type="checkbox" className="w-3 h-3" defaultChecked />
                  <span className="text-slate-400">Calendar Events</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-mono">
                  <input type="checkbox" className="w-3 h-3" defaultChecked />
                  <span className="text-slate-400">System Events</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-mono">
                  <input type="checkbox" className="w-3 h-3" defaultChecked />
                  <span className="text-slate-400">Automations</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-mono">
                  <input type="checkbox" className="w-3 h-3" defaultChecked />
                  <span className="text-slate-400">Weather</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}