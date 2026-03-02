import { useEffect } from 'react'
import { useTimeAmbience } from '../hooks/useTimeAmbience'

/**
 * AmbienceProvider - Applies time-based ambient themes to the dashboard
 * Injects CSS custom properties that components can use for dynamic theming
 */

export function AmbienceProvider({ children }) {
  const { currentTheme, themeData, transitionProgress } = useTimeAmbience()
  
  useEffect(() => {
    if (!themeData) return
    
    // Apply theme CSS custom properties to document root
    const root = document.documentElement
    const style = root.style
    
    // Core theme colors
    style.setProperty('--ambience-primary', themeData.primary)
    style.setProperty('--ambience-secondary', themeData.secondary)
    style.setProperty('--ambience-accent', themeData.accent)
    style.setProperty('--ambience-glow', themeData.glow)
    
    // Status colors (maintain visibility but tint with theme)
    style.setProperty('--ambience-status-green', themeData.statusGreen)
    style.setProperty('--ambience-status-warning', themeData.statusWarning)
    style.setProperty('--ambience-status-alert', themeData.statusAlert)
    
    // Background gradient
    style.setProperty('--ambience-background', themeData.background)
    
    // Transition progress (0-1) for smooth animations
    style.setProperty('--ambience-progress', transitionProgress)
    
    // Theme name for conditional styling
    style.setProperty('--ambience-theme', `"${currentTheme}"`)
    
    // Add theme class to body for CSS targeting
    document.body.className = document.body.className.replace(/ambience-\w+/g, '')
    document.body.classList.add(`ambience-${currentTheme}`)
    
  }, [currentTheme, themeData, transitionProgress])
  
  return children
}

/**
 * AmbienceStyles - Global CSS for ambient theming
 * This should be included once in the app root
 */
export function AmbienceStyles() {
  const styles = `
    /* Ambient Theme CSS Custom Properties */
    :root {
      /* Default values (day theme) */
      --ambience-primary: rgba(34, 211, 238, 0.7);
      --ambience-secondary: rgba(56, 189, 248, 0.5);
      --ambience-accent: rgba(20, 184, 166, 0.6);
      --ambience-glow: rgba(34, 211, 238, 0.3);
      --ambience-status-green: rgba(34, 197, 94, 0.8);
      --ambience-status-warning: rgba(251, 191, 36, 0.8);
      --ambience-status-alert: rgba(239, 68, 68, 0.8);
      --ambience-background: from-slate-900 via-slate-800 to-blue-900;
      --ambience-progress: 0;
      --ambience-theme: "day";
      
      /* Transition duration for smooth theme changes */
      --ambience-transition: 2s ease-in-out;
    }
    
    /* Smooth transitions for all ambience-aware elements */
    .ambience-transition {
      transition: 
        color var(--ambience-transition),
        background-color var(--ambience-transition),
        border-color var(--ambience-transition),
        box-shadow var(--ambience-transition),
        text-shadow var(--ambience-transition);
    }
    
    /* Apply ambient background to main containers */
    .ambience-bg {
      background: linear-gradient(to bottom right, var(--ambience-background));
      transition: background var(--ambience-transition);
    }
    
    /* Ambient-aware text colors */
    .ambience-primary {
      color: var(--ambience-primary);
      transition: color var(--ambience-transition);
    }
    
    .ambience-secondary {
      color: var(--ambience-secondary);
      transition: color var(--ambience-transition);
    }
    
    .ambience-accent {
      color: var(--ambience-accent);
      transition: color var(--ambience-transition);
    }
    
    /* Ambient-aware borders */
    .ambience-border {
      border-color: var(--ambience-primary);
      transition: border-color var(--ambience-transition);
    }
    
    .ambience-border-secondary {
      border-color: var(--ambience-secondary);
      transition: border-color var(--ambience-transition);
    }
    
    /* Ambient-aware glows and shadows */
    .ambience-glow {
      text-shadow: 0 0 8px var(--ambience-glow);
      transition: text-shadow var(--ambience-transition);
    }
    
    .ambience-box-glow {
      box-shadow: 0 0 20px var(--ambience-glow), 0 0 40px var(--ambience-glow);
      transition: box-shadow var(--ambience-transition);
    }
    
    .ambience-subtle-glow {
      box-shadow: 0 0 10px var(--ambience-glow);
      transition: box-shadow var(--ambience-transition);
    }
    
    /* Ambient status indicators */
    .ambience-status-online {
      background-color: var(--ambience-status-green);
      box-shadow: 0 0 8px var(--ambience-status-green);
      transition: background-color var(--ambience-transition), box-shadow var(--ambience-transition);
    }
    
    .ambience-status-warning {
      background-color: var(--ambience-status-warning);
      box-shadow: 0 0 8px var(--ambience-status-warning);
      transition: background-color var(--ambience-transition), box-shadow var(--ambience-transition);
    }
    
    .ambience-status-alert {
      background-color: var(--ambience-status-alert);
      box-shadow: 0 0 8px var(--ambience-status-alert);
      transition: background-color var(--ambience-transition), box-shadow var(--ambience-transition);
    }
    
    /* Ambient-aware animations - modify existing ones */
    @keyframes ambience-pulse-primary {
      0%, 100% { 
        box-shadow: 0 0 5px var(--ambience-primary), 0 0 10px var(--ambience-glow);
      }
      50% { 
        box-shadow: 0 0 15px var(--ambience-primary), 0 0 30px var(--ambience-glow);
      }
    }
    
    @keyframes ambience-breathe {
      0%, 100% { 
        border-color: var(--ambience-secondary);
        box-shadow: 0 0 10px var(--ambience-glow);
      }
      50% { 
        border-color: var(--ambience-primary);
        box-shadow: 0 0 20px var(--ambience-glow);
      }
    }
    
    @keyframes ambience-text-glow {
      0%, 100% { 
        text-shadow: 0 0 4px var(--ambience-glow); 
      }
      50% { 
        text-shadow: 0 0 12px var(--ambience-primary), 0 0 8px var(--ambience-glow); 
      }
    }
    
    /* Apply ambient animations */
    .ambience-pulse { animation: ambience-pulse-primary 2s ease-in-out infinite; }
    .ambience-breathe { animation: ambience-breathe 4s ease-in-out infinite; }
    .ambience-text-glow { animation: ambience-text-glow 3s ease-in-out infinite; }
    
    /* Theme-specific overrides */
    
    /* Early morning - cooler, calmer */
    .ambience-early-morning .header-glow {
      animation: ambience-text-glow 4s ease-in-out infinite;
    }
    
    /* Morning - energetic */
    .ambience-morning .value-live {
      animation: value-pulse 1.5s ease-in-out infinite;
    }
    
    /* Evening - warmer, more active glows */
    .ambience-evening .card-alive {
      animation: ambience-breathe 3s ease-in-out infinite;
    }
    
    .ambience-evening .header-glow {
      animation: ambience-text-glow 2.5s ease-in-out infinite;
    }
    
    /* Night - deeper, slower animations */
    .ambience-night .card-alive {
      animation: ambience-breathe 5s ease-in-out infinite;
    }
    
    .ambience-night .data-stream {
      animation: data-flicker 8s ease-in-out infinite;
    }
    
    /* Late night - minimal animations */
    .ambience-late-night .header-glow,
    .ambience-late-night .value-live,
    .ambience-late-night .data-stream {
      animation: none;
    }
    
    .ambience-late-night .card-alive {
      animation: ambience-breathe 6s ease-in-out infinite;
    }
    
    /* Ambient SVG icon tinting */
    .ambience-icon svg {
      filter: brightness(1.1) contrast(1.1);
      transition: filter var(--ambience-transition);
    }
    
    .ambience-morning .ambience-icon svg {
      filter: brightness(1.2) contrast(1.2) hue-rotate(-10deg);
    }
    
    .ambience-evening .ambience-icon svg {
      filter: brightness(1.1) contrast(1.1) hue-rotate(15deg);
    }
    
    .ambience-night .ambience-icon svg {
      filter: brightness(0.9) contrast(1.0) hue-rotate(30deg);
    }
    
    .ambience-late-night .ambience-icon svg {
      filter: brightness(0.7) contrast(0.9);
    }
    
    /* Ambient particle effects for thinking circle */
    .ambience-evening .particle-wander,
    .ambience-evening .particle-erratic {
      animation-duration: calc(var(--duration) * 0.8);
    }
    
    .ambience-night .particle-wander,
    .ambience-night .particle-erratic {
      animation-duration: calc(var(--duration) * 1.2);
    }
    
    .ambience-late-night .particle-wander,
    .ambience-late-night .particle-erratic {
      animation-duration: calc(var(--duration) * 1.5);
      opacity: 0.5;
    }
  `
  
  return <style dangerouslySetInnerHTML={{ __html: styles }} />
}

export default AmbienceProvider