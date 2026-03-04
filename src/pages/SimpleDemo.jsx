import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui'
import { TeslaWidget } from '../components/HomeAssistantWidget'
import { useApiCall } from '../lib/api'
import { LineChart, Line, ResponsiveContainer, AreaChart, Area } from 'recharts'
import * as data from '../lib/data'
import { useHAWebSocket } from '../hooks/useHAWebSocket'
import { ActivityFeed } from '../components/ActivityFeed'
import { JarvisStatusPanel } from '../components/JarvisStatusPanel'
import { PredictiveCards } from '../components/PredictiveCards'
import { ContextCards } from '../components/ContextCards'
import { TodayTimeline } from '../components/TodayTimeline'
import { AmbienceProvider, AmbienceStyles } from '../components/AmbienceProvider'
import { useTimeAmbience } from '../hooks/useTimeAmbience'

// API base URL - use relative paths in dev, absolute in production
const API_BASE = import.meta.env.PROD ? 'https://api.cracky.co.uk' : ''

// SVG Icons - blue, semi-transparent
const Icons = {
  thermometer: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.7)' }}>
      <path d="M12 9V3m0 6a3 3 0 100 6 3 3 0 000-6zm0 6v6m-4-6a4 4 0 108 0M8 3h8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  bolt: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.7)' }}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  sun: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.7)' }}>
      <circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" strokeLinecap="round"/>
    </svg>
  ),
  cloud: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.7)' }}>
      <path d="M6.5 19a4.5 4.5 0 01-.42-8.98 6 6 0 0111.84 0A4.5 4.5 0 0117.5 19h-11z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  cloudSun: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.7)' }}>
      <path d="M12 2v2m4.24.76l-1.42 1.42M20 12h2M17.66 17.66l1.42 1.42M4 12H2m3.76-5.24L4.34 5.34m12.9 12.9l1.42 1.42M6.34 6.34L4.93 4.93"/><circle cx="12" cy="12" r="3"/><path d="M6.5 19a4.5 4.5 0 01-.42-8.98 6 6 0 0111.84 0A4.5 4.5 0 0117.5 19h-11z"/>
    </svg>
  ),
  rain: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.7)' }}>
      <path d="M6.5 14a4.5 4.5 0 01-.42-8.98 6 6 0 0111.84 0A4.5 4.5 0 0117.5 14h-11zM8 19v2m4-4v4m4-2v2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  snow: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.7)' }}>
      <path d="M12 2v20m5-17l-5 3-5-3m10 14l-5-3-5 3M2 12h20m-3-5l-3 5 3 5M5 7l3 5-3 5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  calendar: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.7)' }}>
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round"/>
    </svg>
  ),
  wind: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.5)' }}>
      <path d="M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  droplet: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.5)' }}>
      <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0L12 2.69z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  car: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.7)' }}>
      <path d="M5 17a2 2 0 104 0 2 2 0 00-4 0zm10 0a2 2 0 104 0 2 2 0 00-4 0z"/><path d="M3 17h2m14 0h2M5 17H3v-4l2-5h10l4 5v4h-2m-10 0h6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  utensils: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.5)' }}>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20m14-18v4a2 2 0 01-2 2h-2v12" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  shoppingCart: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.5)' }}>
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  cpu: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.7)' }}>
      <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" strokeLinecap="round"/>
    </svg>
  ),
  network: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.7)' }}>
      <path d="M12 2a10 10 0 110 20 10 10 0 010-20z"/><path d="M2 12h20M12 2a15 15 0 014 10 15 15 0 01-4 10 15 15 0 01-4-10 15 15 0 014-10z" strokeLinecap="round"/>
    </svg>
  ),
  arrowUp: (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'rgba(34, 197, 94, 0.8)' }}>
      <path d="M12 19V5m-7 7l7-7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  arrowDown: (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'rgba(56, 189, 248, 0.8)' }}>
      <path d="M12 5v14m7-7l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  devices: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(56, 189, 248, 0.6)' }}>
      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4" strokeLinecap="round"/>
    </svg>
  ),
  externalLink: (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'rgba(56, 189, 248, 0.5)' }}>
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// Global animation styles - alive, alert, always watching
const globalAnimations = `
  /* Status glow animations */
  @keyframes status-pulse-green {
    0%, 100% { box-shadow: 0 0 3px rgba(74, 222, 128, 0.4), 0 0 6px rgba(74, 222, 128, 0.2); }
    50% { box-shadow: 0 0 8px rgba(74, 222, 128, 0.8), 0 0 16px rgba(74, 222, 128, 0.4); }
  }
  @keyframes status-pulse-red {
    0%, 100% { box-shadow: 0 0 3px rgba(248, 113, 113, 0.4), 0 0 6px rgba(248, 113, 113, 0.2); }
    50% { box-shadow: 0 0 8px rgba(248, 113, 113, 0.8), 0 0 16px rgba(248, 113, 113, 0.4); }
  }
  @keyframes status-pulse-yellow {
    0%, 100% { box-shadow: 0 0 3px rgba(250, 204, 21, 0.4), 0 0 6px rgba(250, 204, 21, 0.2); }
    50% { box-shadow: 0 0 8px rgba(250, 204, 21, 0.8), 0 0 16px rgba(250, 204, 21, 0.4); }
  }
  @keyframes card-breathe {
    0%, 100% { border-color: rgba(56, 189, 248, 0.15); }
    50% { border-color: rgba(56, 189, 248, 0.35); }
  }
  @keyframes text-glow {
    0%, 100% { text-shadow: 0 0 4px rgba(34, 211, 238, 0.3); }
    50% { text-shadow: 0 0 8px rgba(34, 211, 238, 0.6), 0 0 12px rgba(34, 211, 238, 0.3); }
  }
  @keyframes value-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.85; }
  }
  @keyframes border-flow {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes subtle-shift {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-1px); }
  }
  @keyframes data-flicker {
    0%, 100% { opacity: 1; }
    92% { opacity: 1; }
    93% { opacity: 0.7; }
    94% { opacity: 1; }
    96% { opacity: 0.8; }
    97% { opacity: 1; }
  }
  
  .status-online { animation: status-pulse-green 2s ease-in-out infinite; }
  .status-offline { animation: status-pulse-red 1.5s ease-in-out infinite; }
  .status-warning { animation: status-pulse-yellow 1.8s ease-in-out infinite; }
  .card-alive { animation: card-breathe 4s ease-in-out infinite; }
  .header-glow { animation: text-glow 3s ease-in-out infinite; }
  .value-live { animation: value-pulse 2s ease-in-out infinite; }
  .data-stream { animation: data-flicker 5s ease-in-out infinite; }
  .subtle-float { animation: subtle-shift 3s ease-in-out infinite; }
  
  /* Active system animations - more dramatic pulse for busy systems */
  @keyframes panel-pulse-active {
    0%, 100% { 
      border-color: rgba(34, 197, 94, 0.3);
      box-shadow: 0 0 0 rgba(34, 197, 94, 0), inset 0 0 20px rgba(34, 197, 94, 0.05);
    }
    50% { 
      border-color: rgba(34, 197, 94, 0.6);
      box-shadow: 0 0 20px rgba(34, 197, 94, 0.15), inset 0 0 30px rgba(34, 197, 94, 0.1);
    }
  }
  @keyframes panel-pulse-busy {
    0%, 100% { 
      border-color: rgba(251, 191, 36, 0.3);
      box-shadow: 0 0 0 rgba(251, 191, 36, 0), inset 0 0 20px rgba(251, 191, 36, 0.05);
    }
    50% { 
      border-color: rgba(251, 191, 36, 0.6);
      box-shadow: 0 0 25px rgba(251, 191, 36, 0.2), inset 0 0 35px rgba(251, 191, 36, 0.1);
    }
  }
  @keyframes panel-pulse-charging {
    0%, 100% { 
      border-color: rgba(56, 189, 248, 0.3);
      box-shadow: 0 0 0 rgba(56, 189, 248, 0), inset 0 0 20px rgba(56, 189, 248, 0.05);
    }
    50% { 
      border-color: rgba(56, 189, 248, 0.7);
      box-shadow: 0 0 30px rgba(56, 189, 248, 0.25), inset 0 0 40px rgba(56, 189, 248, 0.15);
    }
  }
  @keyframes panel-pulse-alert {
    0%, 100% { 
      border-color: rgba(239, 68, 68, 0.4);
      box-shadow: 0 0 5px rgba(239, 68, 68, 0.1);
    }
    50% { 
      border-color: rgba(239, 68, 68, 0.8);
      box-shadow: 0 0 20px rgba(239, 68, 68, 0.3), inset 0 0 30px rgba(239, 68, 68, 0.1);
    }
  }
  
  .panel-active { animation: panel-pulse-active 2s ease-in-out infinite !important; }
  .panel-busy { animation: panel-pulse-busy 1.5s ease-in-out infinite !important; }
  .panel-charging { animation: panel-pulse-charging 2.5s ease-in-out infinite !important; }
  .panel-alert { animation: panel-pulse-alert 1s ease-in-out infinite !important; }
`

// AI Thinking animation styles - alive, alert, always watching
const thinkingStyles = `
  /* Base rotations with organic timing */
  @keyframes spin-drift {
    0% { transform: rotate(0deg); }
    33% { transform: rotate(125deg); }
    66% { transform: rotate(240deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes spin-seek {
    0% { transform: rotate(0deg); }
    20% { transform: rotate(-15deg); }
    40% { transform: rotate(160deg); }
    60% { transform: rotate(145deg); }
    80% { transform: rotate(340deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes spin-hunt {
    0%, 100% { transform: rotate(0deg); }
    10% { transform: rotate(36deg); }
    25% { transform: rotate(80deg); }
    30% { transform: rotate(75deg); }
    50% { transform: rotate(190deg); }
    55% { transform: rotate(185deg); }
    75% { transform: rotate(280deg); }
    90% { transform: rotate(350deg); }
  }
  @keyframes breathe {
    0%, 100% { transform: scale(1); opacity: 0.3; }
    50% { transform: scale(1.03); opacity: 0.6; }
  }
  @keyframes pulse-alert {
    0%, 100% { opacity: 0.2; }
    50% { opacity: 0.8; }
  }
  @keyframes orbit-erratic {
    0% { transform: rotate(0deg) translateX(var(--radius)) rotate(0deg); }
    25% { transform: rotate(100deg) translateX(calc(var(--radius) * 1.1)) rotate(-100deg); }
    50% { transform: rotate(180deg) translateX(calc(var(--radius) * 0.95)) rotate(-180deg); }
    75% { transform: rotate(260deg) translateX(calc(var(--radius) * 1.05)) rotate(-260deg); }
    100% { transform: rotate(360deg) translateX(var(--radius)) rotate(-360deg); }
  }
  @keyframes orbit-wander {
    0% { transform: rotate(0deg) translateX(var(--radius)); opacity: var(--base-opacity); }
    33% { transform: rotate(140deg) translateX(calc(var(--radius) * 1.15)); opacity: calc(var(--base-opacity) * 1.5); }
    66% { transform: rotate(250deg) translateX(calc(var(--radius) * 0.9)); opacity: var(--base-opacity); }
    100% { transform: rotate(360deg) translateX(var(--radius)); opacity: var(--base-opacity); }
  }
  @keyframes flicker {
    0%, 100% { opacity: 0.6; }
    10% { opacity: 0.8; }
    20% { opacity: 0.4; }
    30% { opacity: 0.9; }
    50% { opacity: 0.5; }
    70% { opacity: 1; }
    80% { opacity: 0.3; }
    90% { opacity: 0.7; }
  }
  @keyframes core-pulse {
    0%, 100% { 
      box-shadow: 0 0 30px rgba(34, 211, 238, 0.15), 
                  0 0 60px rgba(34, 211, 238, 0.1),
                  inset 0 0 30px rgba(34, 211, 238, 0.05); 
    }
    25% { 
      box-shadow: 0 0 40px rgba(34, 211, 238, 0.25), 
                  0 0 80px rgba(34, 211, 238, 0.15),
                  inset 0 0 40px rgba(34, 211, 238, 0.1); 
    }
    50% { 
      box-shadow: 0 0 50px rgba(34, 211, 238, 0.3), 
                  0 0 100px rgba(34, 211, 238, 0.2),
                  inset 0 0 50px rgba(34, 211, 238, 0.15); 
    }
    75% { 
      box-shadow: 0 0 35px rgba(34, 211, 238, 0.2), 
                  0 0 70px rgba(34, 211, 238, 0.12),
                  inset 0 0 35px rgba(34, 211, 238, 0.08); 
    }
  }
  @keyframes node-pulse {
    0%, 100% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.5); opacity: 1; }
  }
  @keyframes data-stream {
    0% { transform: rotate(var(--start-angle)) translateX(var(--radius)); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: rotate(calc(var(--start-angle) + 90deg)) translateX(var(--radius)); opacity: 0; }
  }
  
  .ring-drift { animation: spin-drift 40s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
  .ring-seek { animation: spin-seek 25s cubic-bezier(0.4, 0, 0.6, 1) infinite reverse; }
  .ring-hunt { animation: spin-hunt 35s ease-in-out infinite; }
  .ring-breathe { animation: breathe 4s ease-in-out infinite; }
  .core-glow { animation: core-pulse 5s ease-in-out infinite; }
  .particle-wander { animation: orbit-wander var(--duration) cubic-bezier(0.4, 0, 0.6, 1) infinite; }
  .particle-erratic { animation: orbit-erratic var(--duration) ease-in-out infinite; }
  .node-blink { animation: node-pulse 2s ease-in-out infinite; }
  .flicker { animation: flicker 3s ease-in-out infinite; }
`

// Floating particles - now with more organic movement
function ThinkingParticles({ count = 20, radius = 170 }) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const isLarge = i < 4
      const isMedium = i >= 4 && i < 10
      return {
        id: i,
        size: isLarge ? 4 + Math.random() * 2 : isMedium ? 2.5 + Math.random() * 1.5 : 1.5 + Math.random(),
        duration: 12 + Math.random() * 25,
        delay: Math.random() * -30,
        radius: radius + (Math.random() - 0.5) * 50,
        opacity: isLarge ? 0.7 : isMedium ? 0.5 : 0.3,
        type: i % 3 === 0 ? 'erratic' : 'wander'
      }
    })
  }, [count, radius])

  return (
    <>
      {particles.map(p => (
        <div
          key={p.id}
          className={`absolute ${p.type === 'erratic' ? 'particle-erratic' : 'particle-wander'}`}
          style={{
            width: p.size,
            height: p.size,
            background: `rgba(34, 211, 238, ${p.opacity})`,
            borderRadius: '50%',
            left: '50%',
            top: '50%',
            marginLeft: -p.size / 2,
            marginTop: -p.size / 2,
            '--radius': `${p.radius}px`,
            '--duration': `${p.duration}s`,
            '--base-opacity': p.opacity,
            animationDelay: `${p.delay}s`,
            boxShadow: `0 0 ${p.size * 3}px rgba(34, 211, 238, ${p.opacity * 0.8})`
          }}
        />
      ))}
    </>
  )
}

// Scanning nodes on rings - like eyes watching
function ScanningNodes({ count = 6, radius = 140 }) {
  const nodes = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      angle: (360 / count) * i,
      size: 3 + Math.random() * 2,
      pulseDelay: Math.random() * 2
    }))
  }, [count])

  return (
    <>
      {nodes.map(n => (
        <div
          key={n.id}
          className="absolute node-blink"
          style={{
            width: n.size,
            height: n.size,
            background: 'rgba(34, 211, 238, 0.9)',
            borderRadius: '50%',
            left: '50%',
            top: '50%',
            transform: `rotate(${n.angle}deg) translateX(${radius}px)`,
            transformOrigin: '0 0',
            marginLeft: -n.size / 2,
            marginTop: -n.size / 2,
            animationDelay: `${n.pulseDelay}s`,
            boxShadow: '0 0 10px rgba(34, 211, 238, 0.8), 0 0 20px rgba(34, 211, 238, 0.4)'
          }}
        />
      ))}
    </>
  )
}

// Main thinking circle component
function ThinkingCircle({ children, status = 'normal' }) {
  const statusColors = {
    normal: { border: 'border-cyan-400/30', glow: 'cyan' },
    alert: { border: 'border-red-400/30', glow: 'red' },
    warning: { border: 'border-yellow-400/30', glow: 'yellow' }
  }
  const colors = statusColors[status] || statusColors.normal

  return (
    <div className="relative w-72 h-72 sm:w-96 sm:h-96">
      <style>{thinkingStyles}</style>
      
      {/* Deep ambient glow */}
      <div className="absolute inset-0 rounded-full bg-cyan-400/5 blur-3xl ring-breathe" />
      
      {/* Outermost ring - slow drift, breathing */}
      <div className="absolute inset-0 rounded-full border border-cyan-400/10 ring-drift ring-breathe" />
      
      {/* Ring 2 - seeking movement */}
      <div className="absolute inset-3 rounded-full ring-seek" style={{
        border: '1px dashed rgba(34, 211, 238, 0.2)'
      }} />
      
      {/* Ring 3 - hunting pattern */}
      <div className="absolute inset-6 rounded-full ring-hunt" style={{
        border: '2px solid transparent',
        borderTopColor: 'rgba(34, 211, 238, 0.4)',
        borderBottomColor: 'rgba(59, 130, 246, 0.3)'
      }} />
      
      {/* Ring 4 - counter rotation with dots */}
      <div className="absolute inset-9 rounded-full ring-drift" style={{
        border: '1px dotted rgba(56, 189, 248, 0.25)',
        animationDirection: 'reverse',
        animationDuration: '30s'
      }} />
      
      {/* Ring 5 - tight inner seeking */}
      <div className="absolute inset-12 rounded-full ring-seek flicker" style={{
        border: '1px solid rgba(34, 211, 238, 0.15)',
        animationDuration: '20s'
      }} />
      
      {/* Active scanning arc - like radar */}
      <div className="absolute inset-4 rounded-full ring-hunt" style={{
        border: '3px solid transparent',
        borderTopColor: 'rgba(34, 211, 238, 0.6)',
        filter: 'blur(1px)',
        animationDuration: '8s'
      }} />
      
      {/* Secondary scanning arc */}
      <div className="absolute inset-8 rounded-full ring-seek" style={{
        border: '2px solid transparent',
        borderRightColor: 'rgba(59, 130, 246, 0.5)',
        borderLeftColor: 'rgba(59, 130, 246, 0.2)',
        animationDuration: '12s'
      }} />
      
      {/* Scanning nodes - like watching eyes */}
      <div className="absolute inset-0 ring-drift" style={{ animationDuration: '50s' }}>
        <ScanningNodes count={6} radius={175} />
      </div>
      
      {/* Inner scanning nodes */}
      <div className="absolute inset-0 ring-seek" style={{ animationDuration: '35s' }}>
        <ScanningNodes count={4} radius={130} />
      </div>
      
      {/* Floating particles */}
      <ThinkingParticles count={24} radius={160} />
      
      {/* Core container with pulsing glow */}
      <div className={`absolute inset-14 sm:inset-16 rounded-full border-2 ${colors.border} bg-slate-900/90 backdrop-blur-sm flex items-center justify-center core-glow`}>
        {children}
      </div>
    </div>
  )
}

// Mini sparkline chart component
function Sparkline({ data, dataKey, color, type = 'line', height = 40 }) {
  if (!data || data.length === 0) return null
  
  if (type === 'area') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <Area 
            type="monotone" 
            dataKey={dataKey} 
            stroke={color} 
            fill={color}
            fillOpacity={0.3}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    )
  }
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <Line 
          type="monotone" 
          dataKey={dataKey} 
          stroke={color} 
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// Environment card with sparkline
function EnvironmentCard({ title, icon, value, unit, subtitle, sparkData, sparkKey, sparkColor, borderColor, isActive, activityType }) {
  // Use activity animation when active, otherwise subtle card-alive
  const animationClass = isActive ? (activityType || 'panel-active') : 'card-alive'
  
  return (
    <Card className={`bg-slate-800/50 ${borderColor} ${animationClass}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 subtle-float">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-slate-400 text-xs font-mono header-glow">{title}</div>
          <div className="text-white font-semibold text-lg value-live">
            {value}{unit}
            {isActive && <span className="ml-2 text-xs text-green-400 animate-pulse">●</span>}
          </div>
          {subtitle && <div className="text-slate-500 text-xs data-stream">{subtitle}</div>}
        </div>
      </div>
      {sparkData && sparkData.length > 0 && (
        <div className="mt-2 -mx-1">
          <Sparkline data={sparkData} dataKey={sparkKey} color={sparkColor} height={35} />
        </div>
      )}
    </Card>
  )
}

// Mission time counter
function MissionTimer() {
  const [time, setTime] = useState(new Date())
  
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])
  
  const dateStr = `${time.getMonth() + 1}.${String(time.getDate()).padStart(2, '0')}`
  const timeStr = time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  
  return (
    <div className="text-center font-mono">
      <div className="text-xs text-cyan-400 mb-1">// TIMESTAMP</div>
      <div className="text-2xl text-white">{dateStr}</div>
      <div className="text-sm text-slate-400">{timeStr}</div>
    </div>
  )
}

// Central status display
function CentralStatus() {
  const [notifications, setNotifications] = useState([])
  const [systemHealth, setSystemHealth] = useState({ status: 'loading', issues: [] })
  
  useEffect(() => {
    async function loadNotifications() {
      try {
        const response = await fetch(`${API_BASE}/api/system/notifications`)
        if (response.ok) {
          const result = await response.json()
          const unread = (result.data || [])
            .filter(n => !n.read && !n.dismissed)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          setNotifications(unread)
        }
      } catch (error) {
        console.warn('Failed to load notifications:', error)
      }
    }
    
    async function checkSystemHealth() {
      const issues = []
      try {
        // Check Home Assistant
        const haRes = await fetch(`${API_BASE}/api/ha/status`)
        if (haRes.ok) {
          const ha = await haRes.json()
          if (!ha.success || !ha.data?.connected) {
            issues.push('Home Assistant offline')
          }
        } else {
          issues.push('Home Assistant unreachable')
        }
        
        // Check system services
        const sysRes = await fetch(`${API_BASE}/api/system/status`)
        if (sysRes.ok) {
          const sys = await sysRes.json()
          if (sys.success && sys.data?.services) {
            Object.entries(sys.data.services).forEach(([key, svc]) => {
              if (svc.status === 'offline') {
                issues.push(`${svc.name} offline`)
              }
            })
          }
        }
        
        setSystemHealth({
          status: issues.length === 0 ? 'ok' : issues.length <= 2 ? 'warning' : 'alert',
          issues
        })
      } catch (error) {
        setSystemHealth({ status: 'warning', issues: ['Status check failed'] })
      }
    }
    
    loadNotifications()
    checkSystemHealth()
    const notifInterval = setInterval(loadNotifications, 15000)
    const healthInterval = setInterval(checkSystemHealth, 30000)
    return () => {
      clearInterval(notifInterval)
      clearInterval(healthInterval)
    }
  }, [])
  
  // Get the most recent notification to display
  const latestNotification = notifications[0]
  
  // Determine overall status
  const hasAlert = latestNotification?.type === 'alert' || systemHealth.status === 'alert'
  const hasWarning = latestNotification?.type === 'warning' || systemHealth.status === 'warning'
  const circleStatus = hasAlert ? 'alert' : hasWarning ? 'warning' : 'normal'
  
  // What to display in the circle
  const showNotification = latestNotification != null
  const showIssues = !showNotification && systemHealth.issues.length > 0

  return (
    <div className="flex flex-col items-center justify-start h-full pt-4">
      <ThinkingCircle status={circleStatus}>
        <div className="text-center p-4">
          {showNotification ? (
            <>
              <div className={`text-xs font-mono mb-2 ${latestNotification.type === 'alert' ? 'text-red-400' : latestNotification.type === 'warning' ? 'text-yellow-400' : 'text-cyan-400'}`}>
                // JARVIS
              </div>
              <div className="text-sm sm:text-base text-slate-200 font-mono leading-tight max-w-[180px]">
                {latestNotification.message}
              </div>
              {notifications.length > 1 && (
                <div className="text-xs text-slate-500 font-mono mt-3">
                  [{notifications.length - 1} more]
                </div>
              )}
            </>
          ) : showIssues ? (
            <>
              <div className="text-xs text-yellow-400 font-mono mb-2">// SYS_ALERT</div>
              <div className="text-sm text-yellow-300 font-mono leading-tight max-w-[180px]">
                {systemHealth.issues.slice(0, 2).join(', ')}
              </div>
              {systemHealth.issues.length > 2 && (
                <div className="text-xs text-slate-500 font-mono mt-2">
                  [{systemHealth.issues.length - 2} more]
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-xs text-cyan-400 font-mono mb-2">// STATUS</div>
              <div className="text-base sm:text-lg text-green-400 font-mono">ALL_SYSTEMS</div>
              <div className="text-base sm:text-lg text-green-400 font-mono">OPERATIONAL</div>
            </>
          )}
        </div>
      </ThinkingCircle>
    </div>
  )
}

// Left sidebar - Environment & Family
function EnvironmentPanel() {
  const [meals, setMeals] = useState([])
  const [shopping, setShopping] = useState([])
  const [stats, setStats] = useState(null)
  const [history, setHistory] = useState(null)
  const [weather, setWeather] = useState(null)
  const [nextEvent, setNextEvent] = useState(null)
  
  useEffect(() => {
    async function loadData() {
      try {
        const [mealsData, shoppingData] = await Promise.all([
          data.getMeals(),
          data.getShoppingItems()
        ])
        setMeals(mealsData)
        setShopping(shoppingData)
      } catch (error) {
        console.warn('Failed to load household data:', error)
      }
    }
    
    async function loadStats() {
      try {
        const response = await fetch(`${API_BASE}/api/ha/stats`)
        if (response.ok) {
          const result = await response.json()
          if (result.success) setStats(result.data)
        }
      } catch (error) {
        console.warn('Failed to load HA stats:', error)
      }
    }
    
    async function loadHistory() {
      try {
        const entities = [
          'climate.living_room',
          'sensor.shellyem_34945470ed50_channel_1_power',
          'sensor.solis_ac_output_total_power'
        ].join(',')
        const response = await fetch(`${API_BASE}/api/ha/history?period=1day&entities=${entities}`)
        if (response.ok) {
          const result = await response.json()
          if (result.success) setHistory(result.data.history)
        }
      } catch (error) {
        console.warn('Failed to load history:', error)
      }
    }
    
    async function loadWeather() {
      try {
        const response = await fetch('https://wttr.in/Crackington+Haven?format=j1')
        if (response.ok) {
          const data = await response.json()
          setWeather(data)
        }
      } catch (error) {
        console.warn('Failed to load weather:', error)
      }
    }
    
    async function loadNextEvent() {
      try {
        const response = await fetch(`${API_BASE}/api/calendar/events`)
        if (response.ok) {
          const result = await response.json()
          if (result.events && result.events.length > 0) {
            // Find next upcoming event
            const now = new Date()
            const upcoming = result.events
              .filter(e => new Date(e.start) > now)
              .sort((a, b) => new Date(a.start) - new Date(b.start))[0]
            setNextEvent(upcoming)
          }
        }
      } catch (error) {
        console.warn('Failed to load calendar:', error)
      }
    }
    
    loadData()
    loadStats()
    loadHistory()
    loadWeather()
    loadNextEvent()
    
    const statsInterval = setInterval(loadStats, 60000)
    const historyInterval = setInterval(loadHistory, 5 * 60000)
    const weatherInterval = setInterval(loadWeather, 30 * 60000) // Every 30 mins
    const calendarInterval = setInterval(loadNextEvent, 5 * 60000)
    return () => {
      clearInterval(statsInterval)
      clearInterval(historyInterval)
      clearInterval(weatherInterval)
      clearInterval(calendarInterval)
    }
  }, [])
  
  const todayMeals = meals.filter(m => m.date === data.getToday())
  const activeShoppingItems = shopping.filter(s => !s.checked).length
  
  // Process history data for sparklines (last 24 points for readability)
  const processHistory = (entityData) => {
    if (!entityData) return []
    return entityData
      .filter(p => p.value !== null && !isNaN(p.value))
      .slice(-24)
      .map(p => ({ value: p.value }))
  }
  
  const tempHistory = processHistory(history?.['climate.living_room'])
  const powerHistory = processHistory(history?.['sensor.shellyem_34945470ed50_channel_1_power'])
  const solarHistory = processHistory(history?.['sensor.solis_ac_output_total_power'])
  
  // Get current solar power
  const currentSolar = solarHistory.length > 0 ? solarHistory[solarHistory.length - 1]?.value : null
  
  // Weather icon helper
  const getWeatherIcon = (code) => {
    const c = parseInt(code)
    if (c === 113) return Icons.sun
    if (c === 116) return Icons.cloudSun
    if (c === 119 || c === 122) return Icons.cloud
    if (c >= 176 && c <= 356) return Icons.rain
    if (c >= 368 && c <= 395) return Icons.snow
    return Icons.cloudSun
  }
  
  // Format event time
  const formatEventTime = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 86400000).toDateString()
    
    const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    if (isToday) return `Today ${time}`
    if (isTomorrow) return `Tomorrow ${time}`
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }) + ` ${time}`
  }

  return (
    <div className="space-y-3">
      <div className="text-center">
        <div className="text-xs text-cyan-400 mb-2">// ENVIRONMENT</div>
      </div>
      
      {/* Weather */}
      {weather?.current_condition?.[0] && (
        <Card className="bg-slate-800/50 border-blue-500/20">
          <div className="flex items-center gap-3">
            <div>{getWeatherIcon(weather.current_condition[0].weatherCode)}</div>
            <div className="flex-1">
              <div className="text-white font-semibold">{weather.current_condition[0].temp_C}°C</div>
              <div className="text-slate-400 text-xs font-mono">{weather.current_condition[0].weatherDesc[0].value}</div>
            </div>
            <div className="text-right text-xs text-slate-500 space-y-1">
              <div className="flex items-center gap-1 justify-end">{Icons.wind} {weather.current_condition[0].windspeedMiles}mph</div>
              <div className="flex items-center gap-1 justify-end">{Icons.droplet} {weather.current_condition[0].humidity}%</div>
            </div>
          </div>
        </Card>
      )}
      
      {/* Next Calendar Event */}
      {nextEvent && (
        <Card className="bg-slate-800/50 border-purple-500/20">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{Icons.calendar}</div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm truncate">{nextEvent.summary}</div>
              <div className="text-purple-400 text-xs font-mono">{formatEventTime(nextEvent.start)}</div>
            </div>
          </div>
        </Card>
      )}
      
      {/* Living Room Temperature */}
      <EnvironmentCard
        title="// TEMP"
        icon={Icons.thermometer}
        value={stats?.climate?.current_temperature ?? '--'}
        unit="°C"
        subtitle={stats?.climate?.hvac_action ? `${stats.climate.hvac_action} · Target ${stats.climate.temperature}°C` : null}
        sparkData={tempHistory}
        sparkKey="value"
        sparkColor="#06b6d4"
        borderColor="border-cyan-500/20"
        isActive={stats?.climate?.hvac_action === 'heating' || stats?.climate?.hvac_action === 'cooling'}
        activityType="panel-busy"
      />
      
      {/* Power Usage */}
      <EnvironmentCard
        title="// POWER"
        icon={Icons.bolt}
        value={stats?.power?.current_usage_kw ?? '--'}
        unit=" kW"
        subtitle={stats?.power?.current_usage ? `${Math.round(stats.power.current_usage)} W` : null}
        sparkData={powerHistory}
        sparkKey="value"
        sparkColor="#f59e0b"
        borderColor="border-yellow-500/20"
        isActive={stats?.power?.current_usage > 500}
        activityType={stats?.power?.current_usage > 2000 ? 'panel-busy' : 'panel-active'}
      />
      
      {/* Solar Production */}
      <EnvironmentCard
        title="// SOLAR"
        icon={Icons.sun}
        value={currentSolar !== null ? (currentSolar / 1000).toFixed(2) : '--'}
        unit=" kW"
        subtitle={currentSolar !== null ? `${Math.round(currentSolar)} W` : null}
        sparkData={solarHistory}
        sparkKey="value"
        sparkColor="#22c55e"
        borderColor="border-green-500/20"
        isActive={currentSolar > 100}
        activityType="panel-active"
      />
      
      {/* Tesla */}
      <TeslaWidget />
      
      {/* Predictive Intelligence */}
      <PredictiveCards />
      
      {/* Family Status */}
      <Card className="bg-slate-800/50 border-slate-600/30">
        <div className="space-y-3">
          <div className="text-xs text-slate-400 font-mono">// FAMILY</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs flex items-center gap-2">{Icons.utensils} Meals</span>
              <span className="text-white text-sm">{todayMeals.length}/3</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs flex items-center gap-2">{Icons.shoppingCart} Shopping</span>
              <span className="text-yellow-400 text-sm">{activeShoppingItems}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

// Individual service status box
function ServiceBox({ name, status, detail, url, isActive, activityType }) {
  const statusColors = {
    online: { dot: 'bg-green-400 status-online', border: 'border-green-500/20' },
    offline: { dot: 'bg-red-400 status-offline', border: 'border-red-500/20' },
    unknown: { dot: 'bg-yellow-400 status-warning', border: 'border-yellow-500/20' }
  }
  const colors = statusColors[status] || statusColors.unknown
  
  // Activity pulse class based on type
  const activityClass = isActive ? (activityType || 'panel-active') : 'card-alive'
  
  const content = (
    <>
      <div className={`w-2 h-2 rounded-full ${colors.dot}`}></div>
      <div className="flex-1 min-w-0">
        <span className="text-white text-sm data-stream">{name}</span>
        {detail && <span className="text-slate-500 text-xs ml-2">{detail}</span>}
        {isActive && <span className="text-green-400 text-xs ml-2 animate-pulse">●</span>}
      </div>
      {url && <div className="opacity-50 hover:opacity-100 transition-opacity">{Icons.externalLink}</div>}
    </>
  )
  
  if (url) {
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className={`bg-slate-800/50 border ${colors.border} rounded-lg px-3 py-2 flex items-center gap-3 ${activityClass} hover:bg-slate-700/50 transition-colors cursor-pointer`}
      >
        {content}
      </a>
    )
  }
  
  return (
    <div className={`bg-slate-800/50 border ${colors.border} rounded-lg px-3 py-2 flex items-center gap-3 ${activityClass}`}>
      {content}
    </div>
  )
}

// Right sidebar - System Status
function CommunicationsPanel() {
  const [haStatus, setHaStatus] = useState(null)
  const [systemServices, setSystemServices] = useState(null)
  const [serverStats, setServerStats] = useState(null)
  const [networkStats, setNetworkStats] = useState(null)
  const [printerStatus, setPrinterStatus] = useState(null)
  
  useEffect(() => {
    async function loadStatus() {
      try {
        const [haRes, systemRes, serverRes, networkRes, printerRes] = await Promise.allSettled([
          fetch(`${API_BASE}/api/ha/status`),
          fetch(`${API_BASE}/api/system/status`),
          fetch(`${API_BASE}/api/system/server`),
          fetch(`${API_BASE}/api/network/stats`),
          fetch(`${API_BASE}/api/ha/printer`)
        ])
        
        if (haRes.status === 'fulfilled' && haRes.value.ok) {
          const data = await haRes.value.json()
          setHaStatus(data.success ? data.data : null)
        }
        
        if (systemRes.status === 'fulfilled' && systemRes.value.ok) {
          const data = await systemRes.value.json()
          setSystemServices(data.success ? data.data : null)
        }
        
        if (serverRes.status === 'fulfilled' && serverRes.value.ok) {
          const data = await serverRes.value.json()
          setServerStats(data.success ? data.data : null)
        }
        
        if (networkRes.status === 'fulfilled' && networkRes.value.ok) {
          const data = await networkRes.value.json()
          setNetworkStats(data.success ? data.data : null)
        }
        
        if (printerRes.status === 'fulfilled' && printerRes.value.ok) {
          const data = await printerRes.value.json()
          setPrinterStatus(data.success ? data.data : null)
        }
      } catch (error) {
        console.warn('Failed to load status:', error)
      }
    }
    
    loadStatus()
    const interval = setInterval(loadStatus, 30000)
    return () => clearInterval(interval)
  }, [])
  
  // Build HomeServer services list
  const homeServerServices = []
  
  // Add Home Assistant
  homeServerServices.push({
    name: 'Home Assistant',
    status: haStatus?.connected ? 'online' : 'unknown',
    detail: haStatus?.version ? `v${haStatus.version}` : null
  })
  
  // Add services from system status check
  if (systemServices?.services) {
    const serviceConfig = [
      { key: 'plex', name: 'Plex', url: 'http://192.168.1.2:32400/web' },
      { key: 'overseerr', name: 'Overseerr', url: 'http://192.168.1.2:5055' },
      { key: 'radarr', name: 'Radarr', url: 'http://192.168.1.2:7878' },
      { key: 'sonarr', name: 'Sonarr', url: 'http://192.168.1.2:8989' },
      { key: 'mission_control', name: 'Mission Control' },
      { key: 'haven', name: 'Haven' }
    ]
    
    serviceConfig.forEach(({ key, name, url }) => {
      const svc = systemServices.services[key]
      if (svc) {
        homeServerServices.push({
          name,
          status: svc.status,
          url,
          isActive: svc.status === 'online' && (key === 'sonarr' || key === 'radarr')
        })
      }
    })
  }
  
  // Format bytes to human readable
  const formatBytes = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }
  
  // Format uptime
  const formatUptime = (seconds) => {
    if (!seconds) return '--'
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    return `${days}d ${hours}h`
  }
  
  // Calculate total network traffic
  const totalRx = networkStats?.clients?.reduce((sum, c) => sum + (c.rx_bytes || 0), 0) || 0
  const totalTx = networkStats?.clients?.reduce((sum, c) => sum + (c.tx_bytes || 0), 0) || 0

  return (
    <div className="space-y-3">
      {/* Jarvis Section */}
      <JarvisStatusPanel />
      
      {/* Context Cards - Dynamic activity-based cards */}
      <ContextCards />
      
      {/* Network Section */}
      <Card className="bg-slate-800/50 border-blue-500/20 card-alive">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="subtle-float">{Icons.network}</div>
            <span className="text-xs text-blue-400 font-mono header-glow flex-1">// NETWORK</span>
            <a href="https://192.168.1.1" target="_blank" rel="noopener noreferrer" className="opacity-50 hover:opacity-100 transition-opacity">
              {Icons.externalLink}
            </a>
          </div>
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">{Icons.devices} Devices</span>
              <span className="text-white value-live">{networkStats?.summary?.total_clients || '--'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">{Icons.arrowDown} Down</span>
              <span className="text-cyan-400 value-live">{formatBytes(totalRx)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">{Icons.arrowUp} Up</span>
              <span className="text-green-400 value-live">{formatBytes(totalTx)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Uptime</span>
              <span className="text-white data-stream">{formatUptime(networkStats?.summary?.uptime)}</span>
            </div>
          </div>
        </div>
      </Card>
      
      {/* HomeServer - All services on this machine */}
      <Card className="bg-slate-800/50 border-slate-600/30 card-alive">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="subtle-float">{Icons.cpu}</div>
            <span className="text-xs text-slate-400 font-mono header-glow flex-1">// HOMESERVER</span>
            <div className={`w-2 h-2 rounded-full ${serverStats ? 'bg-green-400 status-online' : 'bg-gray-500'}`} />
          </div>
          {serverStats && (
            <div className="text-xs text-slate-500 font-mono">
              {serverStats.memory?.usage_percent}% mem · {serverStats.cpu?.usage_percent}% cpu
            </div>
          )}
          <div className="space-y-1 pt-1 border-t border-slate-700/50">
            {homeServerServices.map((svc, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className={`w-1.5 h-1.5 rounded-full ${svc.status === 'online' ? 'bg-green-400' : 'bg-gray-500'}`} />
                {svc.url ? (
                  <a href={svc.url} target="_blank" rel="noopener noreferrer" 
                     className="text-slate-300 hover:text-cyan-400 transition-colors flex-1 truncate">
                    {svc.name}
                  </a>
                ) : (
                  <span className="text-slate-300 flex-1 truncate">{svc.name}</span>
                )}
                {svc.detail && <span className="text-slate-500">{svc.detail}</span>}
              </div>
            ))}
          </div>
        </div>
      </Card>
      
      {/* 3D Printer - Separate device */}
      {printerStatus?.available && (
        <Card className={`bg-slate-800/50 ${printerStatus.printing ? 'border-orange-500/40 panel-busy' : 'border-slate-600/30'}`}>
          <div className="flex items-center gap-3">
            <div className="subtle-float">{Icons.cpu}</div>
            <div className="flex-1">
              <div className="text-white text-sm">3D Printer</div>
              <div className="text-xs text-slate-400">
                {printerStatus.printing 
                  ? `Printing: ${printerStatus.job_percentage?.toFixed(0)}%` 
                  : printerStatus.state || 'Idle'}
              </div>
            </div>
            <div className={`w-2 h-2 rounded-full ${printerStatus.printing ? 'bg-orange-400 animate-pulse' : 'bg-green-400'}`} />
          </div>
        </Card>
      )}
      
      {/* Navigation Menu */}
      <Card className="bg-slate-800/50 border-slate-600/20 mt-2">
        <div className="space-y-2">
          <div className="text-xs text-slate-500 font-mono">// NAV</div>
          <div className="space-y-1 font-mono text-xs">
            <Link to="/family/chores" className="block text-slate-400 hover:text-cyan-400 transition-colors">./chores</Link>
            <Link to="/family/meals" className="block text-slate-400 hover:text-cyan-400 transition-colors">./meals</Link>
            <Link to="/family/shopping" className="block text-slate-400 hover:text-cyan-400 transition-colors">./shopping</Link>
            <Link to="/timeline" className="block text-slate-400 hover:text-cyan-400 transition-colors">./timeline</Link>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default function SimpleDemo() {
  // Real-time WebSocket connection to Home Assistant
  const { connected, haConnected, recentEvents } = useHAWebSocket()
  
  return (
    <AmbienceProvider>
      <div className="min-h-screen ambience-bg ambience-transition">
        {/* Global animation styles */}
        <style>{globalAnimations}</style>
        {/* Ambient theme styles */}
        <AmbienceStyles />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `
          linear-gradient(rgba(34,197,241,0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(34,197,241,0.1) 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px'
      }}></div>
      
      {/* Header */}
      <header className="relative z-10 border-b border-slate-700/50 bg-slate-900/60 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          {/* Mobile Header */}
          <div className="flex items-center justify-between sm:hidden">
            <Link to="/" className="text-cyan-400 text-xs font-mono">← //HOME</Link>
            <h1 className="text-sm font-mono text-cyan-400 header-glow">// MISSION_CTRL</h1>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full status-online"></div>
              <span className="text-xs text-slate-500 font-mono data-stream">SYS_OK</span>
            </div>
          </div>
          
          {/* Desktop Header */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                to="/" 
                className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-mono"
              >
                ← //RETURN_TO_BASE
              </Link>
              <span className="text-slate-600 font-mono">|</span>
              <span className="text-slate-500 text-xs font-mono data-stream">v2.1</span>
            </div>
            
            <div className="text-center">
              <h1 className="text-xl font-mono text-cyan-400 header-glow">
                // MISSION_CONTROL
              </h1>
              <div className="text-xs text-slate-500 font-mono mt-1 data-stream">
                HOUSEHOLD_MGMT_SYS
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-400 rounded-full status-online"></div>
              <span className="text-xs text-slate-400 font-mono data-stream">//SYS_ONLINE</span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main dashboard */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[40vh] lg:min-h-[50vh]">
          {/* Center Panel - Main Status (first on mobile) */}
          <div className="order-1 lg:order-2 lg:col-span-6" data-panel="center">
            <div className="h-full flex flex-col">
              <div className="flex-1 py-8 lg:py-0">
                <CentralStatus />
              </div>
              <div className="mt-6">
                <MissionTimer />
              </div>
            </div>
          </div>
          
          {/* Left Panel - Environment + Activity */}
          <div className="order-2 lg:order-1 lg:col-span-3 space-y-3" data-panel="left">
            <EnvironmentPanel />
            {/* Activity Feed - Compact */}
            <ActivityFeed 
              events={recentEvents} 
              maxItems={5}
              compact={true}
              className="card-alive"
            />
            {/* Today Timeline - Compact */}
            <TodayTimeline 
              compact={true}
              className="card-alive"
            />
          </div>
          
          {/* Right Panel - Communications */}
          <div className="order-3 lg:col-span-3" data-panel="right">
            <CommunicationsPanel />
          </div>
        </div>
        
        {/* WebSocket connection status - subtle footer */}
        <div className="mt-4 flex justify-center">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600">
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? (haConnected ? 'bg-green-400' : 'bg-yellow-400') : 'bg-red-400'}`} />
            <span>{connected ? (haConnected ? 'LIVE' : 'SYNC') : 'OFFLINE'}</span>
          </div>
        </div>
      </main>
      
        {/* Subtle ambient effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 ambience-subtle-glow rounded-full blur-3xl ambience-transition"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 ambience-subtle-glow rounded-full blur-3xl ambience-transition"></div>
        </div>
      </div>
    </AmbienceProvider>
  )
}