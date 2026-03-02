import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * ActivityHeartbeat - Real-time ECG-style activity line
 * Shows system events as heartbeat pulses across the top of the dashboard
 */

// Event type to pulse characteristics
const EVENT_PULSE_STYLES = {
  // Home Assistant events
  state_changed: { height: 0.4, color: 'rgba(34, 211, 238, 0.8)', label: 'STATE' },
  automation_triggered: { height: 0.7, color: 'rgba(34, 197, 94, 0.9)', label: 'AUTO' },
  script_started: { height: 0.5, color: 'rgba(168, 85, 247, 0.8)', label: 'SCRIPT' },
  call_service: { height: 0.6, color: 'rgba(251, 191, 36, 0.8)', label: 'SVC' },
  
  // System events
  api_call: { height: 0.3, color: 'rgba(56, 189, 248, 0.6)', label: 'API' },
  websocket: { height: 0.25, color: 'rgba(34, 211, 238, 0.5)', label: 'WS' },
  notification: { height: 0.8, color: 'rgba(239, 68, 68, 0.9)', label: 'ALERT' },
  
  // Fallback
  default: { height: 0.35, color: 'rgba(34, 211, 238, 0.6)', label: 'EVT' }
}

export function ActivityHeartbeat({ 
  events = [], 
  className = '',
  height = 40,
  showLabels = true 
}) {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const dataRef = useRef({
    points: [],
    pulses: [],
    lastTime: 0
  })
  
  // Generate a heartbeat pulse shape
  const generatePulse = useCallback((baseY, pulseHeight, eventType) => {
    const style = EVENT_PULSE_STYLES[eventType] || EVENT_PULSE_STYLES.default
    const h = pulseHeight * style.height * (height * 0.4)
    
    // ECG-style pulse: small dip, sharp spike up, sharp spike down, recovery
    return [
      { y: baseY, type: 'line' },
      { y: baseY + h * 0.1, type: 'line' },  // small dip
      { y: baseY - h * 0.15, type: 'line' }, // pre-spike
      { y: baseY - h, type: 'line' },         // main spike up
      { y: baseY + h * 0.3, type: 'line' },   // spike down
      { y: baseY - h * 0.05, type: 'line' },  // small recovery bump
      { y: baseY, type: 'line' },
    ]
  }, [height])
  
  // Add event as a pulse
  const addPulse = useCallback((eventType, intensity = 1) => {
    const style = EVENT_PULSE_STYLES[eventType] || EVENT_PULSE_STYLES.default
    
    dataRef.current.pulses.push({
      startTime: performance.now(),
      eventType,
      intensity,
      style,
      processed: false
    })
  }, [])
  
  // Watch for new events
  useEffect(() => {
    if (events.length > 0) {
      const latestEvent = events[0]
      // Determine event type from the event object
      const eventType = latestEvent.event_type || 
                       (latestEvent.type === 'state_changed' ? 'state_changed' : 'default')
      addPulse(eventType, 1)
    }
  }, [events, addPulse])
  
  // Canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    
    // Set up canvas dimensions
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    
    const baseY = height / 2
    const scrollSpeed = 50 // pixels per second
    
    // Initialize flat line
    const initPoints = () => {
      const width = canvas.width / dpr
      dataRef.current.points = []
      for (let x = 0; x <= width; x += 2) {
        dataRef.current.points.push({ x, y: baseY, color: 'rgba(34, 211, 238, 0.3)' })
      }
    }
    initPoints()
    
    let lastPulseX = 0
    
    const animate = (timestamp) => {
      const width = canvas.width / dpr
      const delta = timestamp - (dataRef.current.lastTime || timestamp)
      dataRef.current.lastTime = timestamp
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height)
      
      // Draw subtle grid lines
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.05)'
      ctx.lineWidth = 1
      for (let y = 10; y < height; y += 10) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
      
      // Scroll points left
      const scrollAmount = (scrollSpeed * delta) / 1000
      dataRef.current.points = dataRef.current.points.map(p => ({
        ...p,
        x: p.x - scrollAmount
      })).filter(p => p.x > -10)
      
      // Add new points on the right
      const rightmost = dataRef.current.points[dataRef.current.points.length - 1]?.x || 0
      if (rightmost < width + 10) {
        // Check for pending pulses
        const pendingPulse = dataRef.current.pulses.find(p => !p.processed)
        
        if (pendingPulse && rightmost > lastPulseX + 30) {
          // Generate pulse points
          const pulsePoints = generatePulse(baseY, pendingPulse.intensity, pendingPulse.eventType)
          let x = rightmost + 2
          
          pulsePoints.forEach(pp => {
            dataRef.current.points.push({ 
              x, 
              y: pp.y, 
              color: pendingPulse.style.color,
              label: pendingPulse.style.label
            })
            x += 3
          })
          
          pendingPulse.processed = true
          lastPulseX = x
          
          // Clean old pulses
          dataRef.current.pulses = dataRef.current.pulses.filter(p => 
            !p.processed || (timestamp - p.startTime < 5000)
          )
        } else {
          // Normal baseline
          for (let x = rightmost + 2; x <= width + 10; x += 2) {
            // Add subtle noise to baseline
            const noise = (Math.random() - 0.5) * 1.5
            dataRef.current.points.push({ 
              x, 
              y: baseY + noise, 
              color: 'rgba(34, 211, 238, 0.3)' 
            })
          }
        }
      }
      
      // Draw the line
      if (dataRef.current.points.length > 1) {
        ctx.beginPath()
        ctx.lineWidth = 1.5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        
        // Draw segments with color transitions
        for (let i = 1; i < dataRef.current.points.length; i++) {
          const prev = dataRef.current.points[i - 1]
          const curr = dataRef.current.points[i]
          
          ctx.beginPath()
          ctx.strokeStyle = curr.color
          ctx.moveTo(prev.x, prev.y)
          ctx.lineTo(curr.x, curr.y)
          ctx.stroke()
          
          // Draw glow for brighter segments
          if (curr.color !== 'rgba(34, 211, 238, 0.3)') {
            ctx.beginPath()
            ctx.strokeStyle = curr.color.replace(/[\d.]+\)$/, '0.3)')
            ctx.lineWidth = 4
            ctx.moveTo(prev.x, prev.y)
            ctx.lineTo(curr.x, curr.y)
            ctx.stroke()
            ctx.lineWidth = 1.5
          }
        }
      }
      
      // Draw event labels
      if (showLabels) {
        ctx.font = '8px monospace'
        ctx.textAlign = 'center'
        
        const labeledPoints = dataRef.current.points.filter(p => p.label)
        const drawnLabels = new Set()
        
        labeledPoints.forEach(p => {
          const labelKey = `${Math.floor(p.x / 50)}-${p.label}`
          if (!drawnLabels.has(labelKey) && p.x > 20 && p.x < width - 20) {
            ctx.fillStyle = p.color
            ctx.fillText(p.label, p.x, height - 4)
            drawnLabels.add(labelKey)
          }
        })
      }
      
      animationRef.current = requestAnimationFrame(animate)
    }
    
    animationRef.current = requestAnimationFrame(animate)
    
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [height, generatePulse, showLabels])
  
  // Periodic heartbeat to show the system is alive
  useEffect(() => {
    const interval = setInterval(() => {
      // Random system activity pulse
      const types = ['websocket', 'api_call', 'state_changed']
      const randomType = types[Math.floor(Math.random() * types.length)]
      addPulse(randomType, 0.5 + Math.random() * 0.5)
    }, 3000 + Math.random() * 4000)
    
    return () => clearInterval(interval)
  }, [addPulse])

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {/* Gradient fade on edges */}
      <div 
        className="absolute inset-y-0 left-0 w-8 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, rgb(15 23 42), transparent)' }}
      />
      <div 
        className="absolute inset-y-0 right-0 w-8 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, rgb(15 23 42), transparent)' }}
      />
      
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
      
      {/* Corner decorations */}
      <div className="absolute top-0 left-2 text-[8px] font-mono text-cyan-400/40">
        // ACTIVITY_STREAM
      </div>
      <div className="absolute top-0 right-2 text-[8px] font-mono text-cyan-400/40">
        LIVE ●
      </div>
    </div>
  )
}

export default ActivityHeartbeat
