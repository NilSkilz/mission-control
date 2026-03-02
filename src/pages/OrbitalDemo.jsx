import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '../components/ui'
import { HomeEnvironment, SystemStatus } from '../components/HomeAssistantWidget'
import { useNavigate } from 'react-router-dom'
import '../components/OrbitalStyles.css'

// Navigation ring configuration
const NAVIGATION_RINGS = [
  {
    id: 'family',
    label: 'Family',
    icon: '👨‍👩‍👧‍👦',
    color: 'from-teal-400 to-cyan-400',
    items: [
      { name: 'Chores', route: '/family/chores', icon: '📋' },
      { name: 'Meals', route: '/family/meals', icon: '🍽️' },
      { name: 'Shopping', route: '/family/shopping', icon: '🛒' },
      { name: 'Calendar', route: '/family/calendar', icon: '📅' }
    ],
    radius: 280,
    speed: 20
  },
  {
    id: 'monitoring',
    label: 'Monitoring',
    icon: '📊',
    color: 'from-blue-400 to-indigo-400',
    items: [
      { name: 'System Status', component: 'SystemStatus', icon: '⚡' },
      { name: 'Home Environment', component: 'HomeEnvironment', icon: '🏠' },
      { name: 'Weather', route: '/', icon: '🌤️' },
      { name: 'Network', route: '/', icon: '🌐' }
    ],
    radius: 220,
    speed: -15
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: '⚙️',
    color: 'from-amber-400 to-orange-400',
    items: [
      { name: 'System Admin', route: '/admin', icon: '🔧' },
      { name: 'Agents', route: '/agents', icon: '🤖' },
      { name: 'Documents', route: '/documents', icon: '📄' },
      { name: 'Settings', route: '/', icon: '⚙️' }
    ],
    radius: 160,
    speed: 25
  }
]

// Orbital ring component
function OrbitalRing({ ring, isActive, onRingClick }) {
  const [rotation, setRotation] = useState(0)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(prev => prev + ring.speed / 60)
    }, 16) // 60fps
    return () => clearInterval(interval)
  }, [ring.speed])

  return (
    <motion.div
      className="absolute"
      style={{
        width: ring.radius * 2,
        height: ring.radius * 2,
        left: '50%',
        top: '50%',
        marginLeft: -ring.radius,
        marginTop: -ring.radius,
      }}
      animate={{ rotate: rotation }}
      transition={{ duration: 0.1, ease: 'linear' }}
    >
      {/* Ring circle */}
      <div 
        className={`absolute inset-0 rounded-full border-2 border-dashed opacity-30 ${
          isActive ? 'border-white' : 'border-slate-600'
        }`} 
      />
      
      {/* Ring nodes */}
      {ring.items.map((item, index) => {
        const angle = (index / ring.items.length) * 2 * Math.PI
        const x = Math.cos(angle) * (ring.radius - 20)
        const y = Math.sin(angle) * (ring.radius - 20)
        
        return (
          <motion.div
            key={item.name}
            className="absolute w-12 h-12 cursor-pointer"
            style={{
              left: '50%',
              top: '50%',
              marginLeft: x - 24,
              marginTop: y - 24,
            }}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            animate={{ rotate: -rotation }} // Counter-rotate to keep items upright
            onClick={() => onRingClick(ring, item)}
          >
            <div className={`w-full h-full rounded-full bg-gradient-to-r ${ring.color} 
              flex items-center justify-center text-xl border-2 border-slate-600
              shadow-lg hover:shadow-xl transition-all duration-200
              ${isActive ? 'shadow-white/20' : ''}
            `}>
              {item.icon}
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

// Central command sphere
function CommandSphere({ selectedRing, onSphereClick }) {
  return (
    <motion.div
      className="absolute left-1/2 top-1/2 w-24 h-24 -ml-12 -mt-12 cursor-pointer z-10"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onSphereClick}
    >
      <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 
        border-4 border-cyan-400 shadow-2xl shadow-cyan-400/30 command-sphere
        flex items-center justify-center relative overflow-hidden"
      >
        {/* Pulsing glow effect */}
        <motion.div
          className="absolute inset-0 rounded-full bg-cyan-400/20"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
        
        {/* Center icon */}
        <div className="relative z-10">
          {selectedRing ? (
            <motion.div
              key={selectedRing.id}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              className="text-3xl"
            >
              {selectedRing.icon}
            </motion.div>
          ) : (
            <span className="text-3xl">🚀</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Particle field background
function ParticleField() {
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    speed: Math.random() * 2 + 0.5
  }))
  
  return (
    <div className="absolute inset-0 overflow-hidden">
      {particles.map(particle => (
        <motion.div
          key={particle.id}
          className="absolute bg-cyan-400/30 rounded-full"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: particle.speed * 2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: Math.random() * 2
          }}
        />
      ))}
    </div>
  )
}

// Info panel for selected ring
function InfoPanel({ selectedRing, selectedItem, onClose }) {
  const navigate = useNavigate()
  
  if (!selectedRing) return null
  
  const handleItemClick = (item) => {
    if (item.route) {
      navigate(item.route)
    } else if (item.component) {
      // Handle component display
      console.log(`Display component: ${item.component}`)
    }
  }
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        className="absolute right-6 top-1/2 -translate-y-1/2 w-80 z-20"
      >
        <Card className="bg-slate-900/90 border-slate-600 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedRing.icon}</span>
              <h3 className="text-xl font-bold text-white">{selectedRing.label}</h3>
            </div>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-2">
            {selectedRing.items.map(item => (
              <motion.div
                key={item.name}
                className="p-3 bg-slate-800/50 rounded-lg cursor-pointer border border-transparent
                  hover:border-cyan-400/50 transition-all duration-200"
                whileHover={{ scale: 1.02 }}
                onClick={() => handleItemClick(item)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-white font-medium">{item.name}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}

// Live data integration components
function LiveDataFeed() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="absolute bottom-6 left-6 right-6 z-10"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HomeEnvironment />
        <SystemStatus />
      </div>
    </motion.div>
  )
}

export default function OrbitalDemo() {
  const [selectedRing, setSelectedRing] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const navigate = useNavigate()
  
  const handleRingClick = (ring, item) => {
    setSelectedRing(ring)
    setSelectedItem(item)
    
    // If it's a direct navigation, go there immediately
    if (item.route) {
      setTimeout(() => navigate(item.route), 300)
    }
  }
  
  const handleSphereClick = () => {
    if (selectedRing) {
      setSelectedRing(null)
      setSelectedItem(null)
    } else {
      navigate('/')
    }
  }
  
  const handleClosePanel = () => {
    setSelectedRing(null)
    setSelectedItem(null)
  }
  
  return (
    <div className="min-h-screen space-bg scanlines relative overflow-hidden orbital-container">
      
      {/* Particle background */}
      <ParticleField />
      
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-30 p-6">
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <button 
              onClick={() => navigate('/')}
              className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-medium"
            >
              ← Back to Mission Control
            </button>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 
              bg-clip-text text-transparent glow-text">
              ORBITAL COMMAND INTERFACE
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Deep Space Navigation System
            </p>
          </motion.div>
          
          <div className="w-32"></div>
        </div>
      </header>
      
      {/* Main orbital interface */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Orbital rings */}
        {NAVIGATION_RINGS.map(ring => (
          <OrbitalRing
            key={ring.id}
            ring={ring}
            isActive={selectedRing?.id === ring.id}
            onRingClick={handleRingClick}
          />
        ))}
        
        {/* Central command sphere */}
        <CommandSphere 
          selectedRing={selectedRing}
          onSphereClick={handleSphereClick}
        />
      </div>
      
      {/* Info panel */}
      <InfoPanel 
        selectedRing={selectedRing}
        selectedItem={selectedItem}
        onClose={handleClosePanel}
      />
      
      {/* Live data feed */}
      <LiveDataFeed />
      
      {/* Ambient glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-cyan-400/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-blue-400/10 rounded-full blur-xl"></div>
        <div className="absolute top-3/4 left-1/3 w-24 h-24 bg-indigo-400/10 rounded-full blur-xl"></div>
      </div>
    </div>
  )
}