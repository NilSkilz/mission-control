import { useEffect, useRef, useState, useMemo, useCallback } from 'react'

/**
 * CircuitTraces - Subtle data particles flowing between panels
 * Connects panel edges with circuit-style paths
 */

function DataParticle({ pathId, delay, duration, size, opacity }) {
  return (
    <circle r={size} fill={`rgba(34, 211, 238, ${opacity})`}>
      <animateMotion
        dur={`${duration}s`}
        repeatCount="indefinite"
        begin={`${delay}s`}
      >
        <mpath href={`#${pathId}`} />
      </animateMotion>
      <animate
        attributeName="opacity"
        values={`${opacity};${opacity * 1.5};${opacity}`}
        dur="1.5s"
        repeatCount="indefinite"
      />
    </circle>
  )
}

function CircuitNode({ x, y, size = 2.5 }) {
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={size * 1.5}
        fill="none"
        stroke="rgba(34, 211, 238, 0.15)"
        strokeWidth="1"
      >
        <animate
          attributeName="opacity"
          values="0.2;0.5;0.2"
          dur="3s"
          repeatCount="indefinite"
        />
      </circle>
      <circle
        cx={x}
        cy={y}
        r={size}
        fill="rgba(34, 211, 238, 0.4)"
      />
    </g>
  )
}

export function CircuitTraces({ className = '' }) {
  const svgRef = useRef(null)
  const [paths, setPaths] = useState([])
  const [nodes, setNodes] = useState([])

  const calculatePaths = useCallback(() => {
    if (!svgRef.current) return
    
    const svg = svgRef.current
    const svgRect = svg.getBoundingClientRect()
    
    const leftPanel = document.querySelector('[data-panel="left"]')
    const centerPanel = document.querySelector('[data-panel="center"]')
    const rightPanel = document.querySelector('[data-panel="right"]')
    
    if (!leftPanel || !centerPanel || !rightPanel) {
      console.log('CircuitTraces: Missing panels', { left: !!leftPanel, center: !!centerPanel, right: !!rightPanel })
      return
    }
    console.log('CircuitTraces: Found all panels, calculating paths...')
    
    const leftRect = leftPanel.getBoundingClientRect()
    const centerRect = centerPanel.getBoundingClientRect()
    const rightRect = rightPanel.getBoundingClientRect()
    
    // Convert to SVG coordinates
    const toSvg = (x, y) => ({
      x: x - svgRect.left,
      y: y - svgRect.top
    })
    
    const newPaths = []
    const newNodes = []
    
    // Create 3 horizontal traces from left panel to center
    const leftTraceYs = [0.25, 0.5, 0.75]
    leftTraceYs.forEach((ratio, i) => {
      const startY = leftRect.top + leftRect.height * ratio
      const start = toSvg(leftRect.right + 5, startY)
      const end = toSvg(centerRect.left - 5, startY + (i - 1) * 20)
      
      // Circuit-style path (horizontal, then jog, then horizontal)
      const midX = (start.x + end.x) / 2
      const d = `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`
      
      newPaths.push({ id: `left-${i}`, d, particles: 1 })
      newNodes.push({ x: start.x, y: start.y })
    })
    
    // Create 3 horizontal traces from center to right panel
    const rightTraceYs = [0.25, 0.5, 0.75]
    rightTraceYs.forEach((ratio, i) => {
      const startY = rightRect.top + rightRect.height * ratio
      const start = toSvg(centerRect.right + 5, startY + (i - 1) * 20)
      const end = toSvg(rightRect.left - 5, startY)
      
      const midX = (start.x + end.x) / 2
      const d = `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`
      
      newPaths.push({ id: `right-${i}`, d, particles: 1 })
      newNodes.push({ x: end.x, y: end.y })
    })
    
    // Vertical backbone on left side
    const leftTop = toSvg(leftRect.right - 20, leftRect.top + 30)
    const leftBottom = toSvg(leftRect.right - 20, leftRect.bottom - 30)
    newPaths.push({
      id: 'left-backbone',
      d: `M ${leftTop.x} ${leftTop.y} L ${leftBottom.x} ${leftBottom.y}`,
      particles: 1
    })
    
    // Vertical backbone on right side
    const rightTop = toSvg(rightRect.left + 20, rightRect.top + 30)
    const rightBottom = toSvg(rightRect.left + 20, rightRect.bottom - 30)
    newPaths.push({
      id: 'right-backbone',
      d: `M ${rightTop.x} ${rightTop.y} L ${rightBottom.x} ${rightBottom.y}`,
      particles: 1
    })
    
    console.log('CircuitTraces: Setting', newPaths.length, 'paths and', newNodes.length, 'nodes')
    setPaths(newPaths)
    setNodes(newNodes)
  }, [])

  useEffect(() => {
    const timer = setTimeout(calculatePaths, 300)
    
    const handleResize = () => setTimeout(calculatePaths, 100)
    window.addEventListener('resize', handleResize)
    
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', handleResize)
    }
  }, [calculatePaths])

  const particles = useMemo(() => {
    return paths.flatMap((path, pi) => 
      Array.from({ length: path.particles }, (_, i) => ({
        id: `${path.id}-p${i}`,
        pathId: path.id,
        delay: pi * 1.5 + i * 3,
        duration: 6 + Math.random() * 2,
        size: 2,
        opacity: 0.6
      }))
    )
  }, [paths])

  if (paths.length === 0) return null

  return (
    <svg 
      ref={svgRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ opacity: 0.5 }}
    >
      <defs>
        <filter id="circuit-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {paths.map(path => (
          <path key={path.id} id={path.id} d={path.d} />
        ))}
      </defs>
      
      <g filter="url(#circuit-glow)">
        {paths.map(path => (
          <path
            key={`trace-${path.id}`}
            d={path.d}
            fill="none"
            stroke="rgba(34, 211, 238, 0.1)"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </g>
      
      {nodes.map((node, i) => (
        <CircuitNode key={i} {...node} />
      ))}
      
      <g filter="url(#circuit-glow)">
        {particles.map(p => (
          <DataParticle key={p.id} {...p} />
        ))}
      </g>
    </svg>
  )
}

export default CircuitTraces
