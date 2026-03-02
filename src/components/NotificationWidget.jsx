import { useState, useEffect } from 'react'
import { Card, Badge, Button } from './ui'

function NotificationItem({ notification, onMarkRead, onDismiss }) {
  const typeIcons = {
    info: 'ℹ️',
    warning: '⚠️',
    alert: '🚨',
    success: '✅'
  }

  const typeColors = {
    info: 'bg-blue-500/10 border-blue-500/20',
    warning: 'bg-amber-500/10 border-amber-500/20', 
    alert: 'bg-red-500/10 border-red-500/20',
    success: 'bg-green-500/10 border-green-500/20'
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
  }

  return (
    <div className={`p-3 rounded-lg border ${typeColors[notification.type]} ${!notification.read ? 'border-l-4' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-lg flex-shrink-0">{typeIcons[notification.type]}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h5 className="font-medium text-white text-sm">{notification.title}</h5>
              {!notification.read && <div className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0"></div>}
            </div>
            <p className="text-slate-300 text-sm leading-relaxed mb-2">{notification.message}</p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{formatTime(notification.timestamp)}</span>
              {notification.source && notification.source !== 'manual' && (
                <>
                  <span>•</span>
                  <span>{notification.source}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!notification.read && (
            <button
              onClick={() => onMarkRead(notification.id)}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Mark as read"
            >
              ✓
            </button>
          )}
          <button
            onClick={() => onDismiss(notification.id)}
            className="p-1 text-slate-400 hover:text-red-400 transition-colors"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

export function NotificationWidget() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    fetchNotifications()
    // Refresh notifications every 2 minutes
    const interval = setInterval(fetchNotifications, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications')
      const data = await response.json()
      
      if (data.success) {
        setNotifications(data.data)
        setError(null)
      } else {
        setError(data.error || 'Failed to fetch notifications')
      }
    } catch (error) {
      console.error('Notifications fetch error:', error)
      setError('Network error fetching notifications')
    } finally {
      setLoading(false)
    }
  }

  const updateNotification = async (id, updates) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      if (response.ok) {
        // Update local state
        setNotifications(prev => prev.map(n => 
          n.id === id ? { ...n, ...updates } : n
        ))
      }
    } catch (error) {
      console.error('Update notification error:', error)
    }
  }

  const handleMarkRead = (id) => {
    updateNotification(id, { read: true })
  }

  const handleDismiss = (id) => {
    updateNotification(id, { dismissed: true })
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const markAllRead = () => {
    notifications.forEach(n => {
      if (!n.read) {
        updateNotification(n.id, { read: true })
      }
    })
  }

  const unreadCount = notifications.filter(n => !n.read).length
  const displayNotifications = showAll ? notifications : notifications.slice(0, 5)

  if (loading) {
    return (
      <Card className="animate-pulse">
        <div className="h-32 bg-slate-700/20 rounded"></div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h4 className="text-lg font-semibold text-white">🔔 Notifications</h4>
          {unreadCount > 0 && (
            <Badge variant="teal" className="px-2 py-1">
              {unreadCount} new
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={markAllRead}
            className="text-xs"
          >
            Mark all read
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
          <div className="text-red-400 text-sm">
            ⚠️ Failed to load notifications: {error}
          </div>
          <Button variant="ghost" size="sm" onClick={fetchNotifications} className="mt-2">
            Retry
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {displayNotifications.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🎉</div>
            <div className="text-slate-400 text-sm">No notifications</div>
            <div className="text-slate-500 text-xs mt-1">All caught up!</div>
          </div>
        ) : (
          <>
            {displayNotifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={handleMarkRead}
                onDismiss={handleDismiss}
              />
            ))}
            
            {notifications.length > 5 && (
              <div className="text-center pt-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? 'Show less' : `Show all ${notifications.length} notifications`}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick notification creation for testing */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 pt-4 border-t border-slate-600">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={async () => {
              await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: 'Test Notification',
                  message: `Test notification created at ${new Date().toLocaleTimeString()}`,
                  type: 'info',
                  source: 'dev-test'
                })
              })
              fetchNotifications()
            }}
            className="text-xs"
          >
            + Test Notification
          </Button>
        </div>
      )}
    </Card>
  )
}