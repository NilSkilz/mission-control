import { Card } from '../components/ui'

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white flex items-center gap-2">
        <span>📅</span> Calendar
      </h2>

      <Card className="text-center py-16">
        <span className="text-6xl mb-6 block">🚧</span>
        <h3 className="text-2xl font-bold text-white mb-2">Coming Soon</h3>
        <p className="text-slate-400 max-w-md mx-auto">
          We're working on a family calendar to help you track events, appointments, and activities.
        </p>
      </Card>
    </div>
  )
}
