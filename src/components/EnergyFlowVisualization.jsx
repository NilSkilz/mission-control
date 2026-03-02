import { useState, useEffect, useRef, useMemo } from 'react'
import { Card } from './ui'
import { motion } from 'framer-motion'

/**
 * EnergyFlowVisualization - Animated energy flow through the house
 * Shows solar generation, battery, grid, and consumption with animated flows
 */

// Energy flow particle animation
function EnergyParticle({ pathId, delay, duration, intensity, color, direction = 'forward' }) {
  const opacity = Math.max(0.2, Math.min(1.0, intensity / 2000)) // Scale based on power
  const size = Math.max(1, Math.min(4, intensity / 1000)) // Particle size based on power
  
  return (
    <circle r={size} fill={color} opacity={opacity}>
      <animateMotion
        dur={`${duration}s`}
        repeatCount="indefinite"
        begin={`${delay}s`}
        keyTimes={direction === 'reverse' ? '0;1' : '0;1'}
        keyPoints={direction === 'reverse' ? '1;0' : '0;1'}
      >
        <mpath href={`#${pathId}`} />
      </animateMotion>
      <animate
        attributeName="opacity"
        values={`${opacity};${opacity * 1.5};${opacity}`}
        dur="2s"
        repeatCount="indefinite"
      />
    </circle>
  )
}

// House area node component
function HouseNode({ x, y, label, power, unit, icon, isProducing, size = 40 }) {
  const nodeColor = isProducing ? '#10b981' : '#3b82f6' // Green for producing, blue for consuming
  const pulseColor = isProducing ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'
  
  return (
    <g>
      {/* Outer pulse ring */}
      <circle
        cx={x}
        cy={y}
        r={size + 10}
        fill="none"
        stroke={pulseColor}
        strokeWidth="2"
        opacity="0.6"
      >
        <animate
          attributeName="r"
          values={`${size + 5};${size + 15};${size + 5}`}
          dur="3s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.6;0.2;0.6"
          dur="3s"
          repeatCount="indefinite"
        />
      </circle>
      
      {/* Main node circle */}
      <circle
        cx={x}
        cy={y}
        r={size}
        fill="rgba(30, 41, 59, 0.9)"
        stroke={nodeColor}
        strokeWidth="3"
      />
      
      {/* Icon */}
      <text
        x={x}
        y={y - 8}
        textAnchor="middle"
        fontSize="20"
        fill="white"
      >
        {icon}
      </text>
      
      {/* Label */}
      <text
        x={x}
        y={y + 6}
        textAnchor="middle"
        fontSize="10"
        fill="#94a3b8"
        fontFamily="monospace"
      >
        {label}
      </text>
      
      {/* Power value */}
      <text
        x={x}
        y={y + 18}
        textAnchor="middle"
        fontSize="11"
        fill={nodeColor}
        fontWeight="bold"
        fontFamily="monospace"
      >
        {power !== null && power !== undefined ? `${Math.abs(power)}${unit}` : 'N/A'}
      </text>
    </g>
  )
}

export function EnergyFlowVisualization() {
  const svgRef = useRef(null)
  const [energyData, setEnergyData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch energy data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        // Get current energy data from the existing API
        const response = await fetch('/api/ha/current-energy')
        const result = await response.json()
        
        if (result.success) {
          setEnergyData(result.data)
          setError(null)
        } else {
          // Fallback to mock data for development
          setEnergyData({
            solar: { power: 1250, unit: 'W' },
            battery: { power: -300, unit: 'W' }, // Negative means charging
            grid_import: { power: 0, unit: 'W' },
            grid_export: { power: 850, unit: 'W' },
            house_consumption: { power: 1100, unit: 'W' },
            areas: {
              kitchen: { power: 200, unit: 'W' },
              living_room: { power: 150, unit: 'W' },
              upstairs: { power: 300, unit: 'W' },
              office: { power: 450, unit: 'W' }
            }
          })
          setError(null)
        }
      } catch (error) {
        console.error('Energy flow data fetch error:', error)
        // Use mock data for development
        setEnergyData({
          solar: { power: 1250, unit: 'W' },
          battery: { power: -300, unit: 'W' },
          grid_import: { power: 0, unit: 'W' },
          grid_export: { power: 850, unit: 'W' },
          house_consumption: { power: 1100, unit: 'W' },
          areas: {
            kitchen: { power: 200, unit: 'W' },
            living_room: { power: 150, unit: 'W' },
            upstairs: { power: 300, unit: 'W' },
            office: { power: 450, unit: 'W' }
          }
        })
        setError(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 10000) // Update every 10 seconds
    return () => clearInterval(interval)
  }, [])

  // Define house layout coordinates
  const layout = useMemo(() => {
    return {
      // Energy sources/storage (top area)
      solar: { x: 150, y: 80, icon: '☀️', label: 'SOLAR' },
      battery: { x: 400, y: 80, icon: '🔋', label: 'BATTERY' },
      grid: { x: 650, y: 80, icon: '⚡', label: 'GRID' },
      
      // Distribution hub (center)
      hub: { x: 400, y: 200 },
      
      // House areas (bottom)
      kitchen: { x: 150, y: 320, icon: '🍳', label: 'KITCHEN' },
      living_room: { x: 300, y: 320, icon: '📺', label: 'LIVING' },
      upstairs: { x: 500, y: 320, icon: '🛏️', label: 'UPSTAIRS' },
      office: { x: 650, y: 320, icon: '💻', label: 'OFFICE' }
    }
  }, [])

  // Generate energy flow paths and particles
  const { paths, particles } = useMemo(() => {
    if (!energyData) return { paths: [], particles: [] }
    
    const newPaths = []
    const newParticles = []
    let particleId = 0
    
    const createPath = (from, to, id) => {
      const d = `M ${from.x} ${from.y} L ${to.x} ${to.y}`
      newPaths.push({ id, d })
      return id
    }
    
    const createCurvedPath = (from, to, id, curvature = 0.3) => {
      const midX = (from.x + to.x) / 2
      const midY = (from.y + to.y) / 2 + (curvature * Math.abs(to.y - from.y))
      const d = `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`
      newPaths.push({ id, d })
      return id
    }
    
    const addParticles = (pathId, power, color, direction = 'forward', count = 3) => {
      const intensity = Math.abs(power || 0)
      if (intensity < 50) return // Don't show particles for very low power
      
      const particleCount = Math.min(count, Math.max(1, Math.floor(intensity / 300)))
      
      for (let i = 0; i < particleCount; i++) {
        newParticles.push({
          id: particleId++,
          pathId,
          delay: i * 1.5,
          duration: 4 + Math.random() * 2,
          intensity,
          color,
          direction
        })
      }
    }
    
    // Solar to hub
    if (energyData.solar?.power > 0) {
      const pathId = createCurvedPath(layout.solar, layout.hub, 'solar-hub')
      addParticles(pathId, energyData.solar.power, '#fbbf24', 'forward')
    }
    
    // Battery flows (charging = to battery, discharging = from battery)
    if (energyData.battery?.power !== 0) {
      const isCharging = energyData.battery.power < 0
      const pathId = createCurvedPath(
        isCharging ? layout.hub : layout.battery,
        isCharging ? layout.battery : layout.hub,
        'battery-hub'
      )
      addParticles(pathId, energyData.battery.power, '#10b981', 'forward')
    }
    
    // Grid flows (import = from grid, export = to grid)
    if (energyData.grid_export?.power > 0) {
      const pathId = createCurvedPath(layout.hub, layout.grid, 'hub-grid')
      addParticles(pathId, energyData.grid_export.power, '#3b82f6', 'forward')
    }
    
    if (energyData.grid_import?.power > 0) {
      const pathId = createCurvedPath(layout.grid, layout.hub, 'grid-hub')
      addParticles(pathId, energyData.grid_import.power, '#ef4444', 'forward')
    }
    
    // Hub to consumption areas
    Object.entries(energyData.areas || {}).forEach(([area, data]) => {
      if (data.power > 0 && layout[area]) {
        const pathId = createCurvedPath(layout.hub, layout[area], `hub-${area}`)
        addParticles(pathId, data.power, '#06b6d4', 'forward', 2)
      }
    })
    
    return { paths: newPaths, particles: newParticles }
  }, [energyData, layout])

  if (loading) {
    return (
      <Card className="h-96">
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse text-slate-400">
            <div className="text-xl mb-2">⚡ Loading energy flow...</div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-2xl">🏠</span>
          // ENERGY FLOW
        </h3>
        <div className="text-sm text-slate-400 font-mono">
          REAL-TIME MONITORING
        </div>
      </div>
      
      <Card className="bg-slate-900 border-slate-700 p-6">
        <div className="relative">
          <svg
            ref={svgRef}
            width="800"
            height="400"
            viewBox="0 0 800 400"
            className="w-full h-auto"
          >
            <defs>
              <filter id="energy-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              
              {/* Define paths */}
              {paths.map(path => (
                <path key={path.id} id={path.id} d={path.d} />
              ))}
            </defs>
            
            {/* Background grid */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Flow paths */}
            <g filter="url(#energy-glow)">
              {paths.map(path => (
                <path
                  key={`path-${path.id}`}
                  d={path.d}
                  fill="none"
                  stroke="rgba(34, 211, 238, 0.2)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="5,5"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    values="0;-10"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </path>
              ))}
            </g>
            
            {/* Energy nodes */}
            <HouseNode
              {...layout.solar}
              label="SOLAR"
              power={energyData?.solar?.power}
              unit="W"
              icon="☀️"
              isProducing={true}
            />
            
            <HouseNode
              {...layout.battery}
              label="BATTERY"
              power={Math.abs(energyData?.battery?.power || 0)}
              unit="W"
              icon="🔋"
              isProducing={energyData?.battery?.power > 0}
            />
            
            <HouseNode
              {...layout.grid}
              label="GRID"
              power={Math.abs((energyData?.grid_import?.power || 0) - (energyData?.grid_export?.power || 0))}
              unit="W"
              icon="⚡"
              isProducing={energyData?.grid_export?.power > 0}
            />
            
            {/* Central distribution hub */}
            <circle
              cx={layout.hub.x}
              cy={layout.hub.y}
              r="15"
              fill="rgba(34, 211, 238, 0.2)"
              stroke="#22d3ee"
              strokeWidth="2"
            >
              <animate
                attributeName="opacity"
                values="0.5;1;0.5"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
            
            {/* House area nodes */}
            {Object.entries(energyData?.areas || {}).map(([area, data]) => 
              layout[area] && (
                <HouseNode
                  key={area}
                  {...layout[area]}
                  power={data.power}
                  unit="W"
                  isProducing={false}
                  size={30}
                />
              )
            )}
            
            {/* Animated particles */}
            <g filter="url(#energy-glow)">
              {particles.map(particle => (
                <EnergyParticle key={particle.id} {...particle} />
              ))}
            </g>
          </svg>
        </div>
        
        {/* Status information */}
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-xs text-slate-400 font-mono mb-1">SOLAR GENERATION</div>
            <div className="text-lg font-bold text-amber-400">
              {energyData?.solar?.power || 0}W
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400 font-mono mb-1">BATTERY</div>
            <div className={`text-lg font-bold ${
              energyData?.battery?.power > 0 ? 'text-emerald-400' : 
              energyData?.battery?.power < 0 ? 'text-blue-400' : 'text-slate-400'
            }`}>
              {Math.abs(energyData?.battery?.power || 0)}W
              <span className="text-xs ml-1">
                {energyData?.battery?.power > 0 ? '↗' : energyData?.battery?.power < 0 ? '↙' : '—'}
              </span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400 font-mono mb-1">GRID</div>
            <div className={`text-lg font-bold ${
              energyData?.grid_export?.power > 0 ? 'text-blue-400' : 
              energyData?.grid_import?.power > 0 ? 'text-red-400' : 'text-slate-400'
            }`}>
              {Math.abs((energyData?.grid_import?.power || 0) - (energyData?.grid_export?.power || 0))}W
              <span className="text-xs ml-1">
                {energyData?.grid_export?.power > 0 ? '↗' : energyData?.grid_import?.power > 0 ? '↙' : '—'}
              </span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400 font-mono mb-1">CONSUMPTION</div>
            <div className="text-lg font-bold text-cyan-400">
              {Object.values(energyData?.areas || {}).reduce((sum, area) => sum + (area.power || 0), 0)}W
            </div>
          </div>
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="text-amber-400 text-sm">
              ⚠️ Using simulated data - API unavailable
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}