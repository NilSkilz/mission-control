import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './ui';

const API_BASE = import.meta.env.PROD ? 'https://api.cracky.co.uk' : '';

// Icons
const Icons = {
  sun: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(250, 204, 21, 0.8)' }}>
      <circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" strokeLinecap="round"/>
    </svg>
  ),
  rain: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(96, 165, 250, 0.8)' }}>
      <path d="M6.5 14a4.5 4.5 0 01-.42-8.98 6 6 0 0111.84 0A4.5 4.5 0 0117.5 14h-11zM8 19v2m4-4v4m4-2v2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  bolt: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(251, 191, 36, 0.8)' }}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  car: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(59, 130, 246, 0.8)' }}>
      <path d="M5 17a2 2 0 104 0 2 2 0 00-4 0zm10 0a2 2 0 104 0 2 2 0 00-4 0z"/><path d="M3 17h2m14 0h2M5 17H3v-4l2-5h10l4 5v4h-2m-10 0h6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  thermometer: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(239, 68, 68, 0.8)' }}>
      <path d="M12 9V3m0 6a3 3 0 100 6 3 3 0 000-6zm0 6v6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  lightbulb: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(168, 85, 247, 0.8)' }}>
      <path d="M9 21h6m-6-3h6a3 3 0 003-3 7 7 0 10-12 0 3 3 0 003 3z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
};

// Animation variants for prediction cards
const predictionCardVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.98,
    transition: {
      duration: 0.15,
      ease: 'easeIn'
    }
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  },
  exit: {
    opacity: 0,
    y: -15,
    scale: 0.98,
    transition: {
      duration: 0.25,
      ease: 'easeOut'
    }
  }
}

// Individual prediction card
function PredictionCard({ icon, title, prediction, confidence, type = 'info', index = 0 }) {
  const typeColors = {
    info: 'border-blue-500/30 bg-blue-500/5',
    warning: 'border-yellow-500/30 bg-yellow-500/5',
    success: 'border-green-500/30 bg-green-500/5',
    alert: 'border-red-500/30 bg-red-500/5'
  };

  return (
    <motion.div 
      layout
      variants={predictionCardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{
        delay: index * 0.05, // Stagger animation slightly for each card
      }}
      className={`rounded-lg border px-3 py-2 ${typeColors[type]} transition-all hover:bg-opacity-10 overflow-hidden`}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-slate-400 font-mono">{title}</div>
          <div className="text-sm text-white">{prediction}</div>
          {confidence && (
            <div className="text-xs text-slate-500 mt-0.5">{confidence}</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function PredictiveCards() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function generatePredictions() {
      const newPredictions = [];

      try {
        // Fetch current data
        const [weatherRes, statsRes, teslaRes] = await Promise.allSettled([
          fetch('https://wttr.in/Crackington+Haven?format=j1'),
          fetch(`${API_BASE}/api/ha/stats`),
          fetch(`${API_BASE}/api/ha/tesla`)
        ]);

        const weather = weatherRes.status === 'fulfilled' && weatherRes.value.ok 
          ? await weatherRes.value.json() : null;
        const stats = statsRes.status === 'fulfilled' && statsRes.value.ok 
          ? await statsRes.value.json() : null;
        const tesla = teslaRes.status === 'fulfilled' && teslaRes.value.ok 
          ? await teslaRes.value.json() : null;

        const now = new Date();
        const hour = now.getHours();

        // Solar prediction based on time of day and weather
        if (weather) {
          const currentCondition = weather.current_condition?.[0];
          const cloudCover = parseInt(currentCondition?.cloudcover || 50);
          const hourlyForecast = weather.weather?.[0]?.hourly || [];
          
          // Find peak solar hour (usually around noon-2pm with low cloud)
          let peakHour = 13; // Default 1pm
          let peakCondition = 'clear';
          
          for (const h of hourlyForecast) {
            const hTime = parseInt(h.time) / 100;
            if (hTime >= 10 && hTime <= 16) {
              const hCloud = parseInt(h.cloudcover || 50);
              if (hCloud < 40) {
                peakHour = hTime;
                peakCondition = hCloud < 20 ? 'clear skies' : 'partial clouds';
                break;
              }
            }
          }

          if (hour < 17 && cloudCover < 70) {
            const peakTime = `${peakHour}:00`;
            newPredictions.push({
              icon: Icons.sun,
              title: '// SOLAR_FORECAST',
              prediction: hour < peakHour 
                ? `Peak production at ${peakTime}` 
                : 'Production declining - past peak',
              confidence: peakCondition,
              type: 'success'
            });
          }

          // Rain prediction
          const willRain = hourlyForecast.some(h => {
            const hTime = parseInt(h.time) / 100;
            return hTime > hour && hTime < hour + 6 && parseInt(h.chanceofrain || 0) > 50;
          });

          if (willRain) {
            const rainHour = hourlyForecast.find(h => {
              const hTime = parseInt(h.time) / 100;
              return hTime > hour && parseInt(h.chanceofrain || 0) > 50;
            });
            const rainTime = rainHour ? `${parseInt(rainHour.time) / 100}:00` : 'later';
            
            newPredictions.push({
              icon: Icons.rain,
              title: '// WEATHER_ALERT',
              prediction: `Rain expected around ${rainTime}`,
              confidence: `${rainHour?.chanceofrain || 60}% chance`,
              type: 'warning'
            });
          }

          // Temperature comfort prediction
          const tempC = parseInt(currentCondition?.temp_C || 15);
          if (tempC > 22 && hour >= 12 && hour <= 18) {
            newPredictions.push({
              icon: Icons.thermometer,
              title: '// COMFORT',
              prediction: 'Consider closing blinds - warm afternoon',
              confidence: `Currently ${tempC}°C`,
              type: 'info'
            });
          }
        }

        // Power usage prediction
        if (stats?.data?.power?.current_usage) {
          const watts = stats.data.power.current_usage;
          
          if (watts > 2000) {
            newPredictions.push({
              icon: Icons.bolt,
              title: '// POWER_ALERT',
              prediction: 'High power usage detected',
              confidence: `${(watts/1000).toFixed(1)}kW - check appliances`,
              type: 'warning'
            });
          } else if (hour >= 16 && hour <= 19) {
            newPredictions.push({
              icon: Icons.bolt,
              title: '// POWER_TIP',
              prediction: 'Peak rate hours - defer heavy loads',
              confidence: 'Off-peak starts at 11pm',
              type: 'info'
            });
          }
        }

        // Tesla/EV prediction
        if (tesla?.data?.available) {
          // If we had battery level, we could predict charging needs
          // For now, show charging status
          if (tesla.data.charging?.is_charging) {
            newPredictions.push({
              icon: Icons.car,
              title: '// TIMMY',
              prediction: 'Currently charging',
              confidence: 'Using off-peak rates',
              type: 'success'
            });
          } else if (hour >= 6 && hour <= 9) {
            newPredictions.push({
              icon: Icons.car,
              title: '// TIMMY',
              prediction: 'Morning - check range for commute',
              type: 'info'
            });
          }
        }

        // Sunset automation hint
        if (weather) {
          const astronomy = weather.weather?.[0]?.astronomy?.[0];
          if (astronomy?.sunset) {
            const sunsetParts = astronomy.sunset.match(/(\d+):(\d+)/);
            if (sunsetParts) {
              const sunsetHour = parseInt(sunsetParts[1]) + (astronomy.sunset.includes('PM') ? 12 : 0);
              const sunsetMin = parseInt(sunsetParts[2]);
              const minsToSunset = (sunsetHour * 60 + sunsetMin) - (hour * 60 + now.getMinutes());
              
              if (minsToSunset > 0 && minsToSunset < 60) {
                newPredictions.push({
                  icon: Icons.lightbulb,
                  title: '// LIGHTING',
                  prediction: `Sunset in ${minsToSunset} mins`,
                  confidence: 'Auto-lights will activate',
                  type: 'info'
                });
              }
            }
          }
        }

        // If no predictions, show a default
        if (newPredictions.length === 0) {
          newPredictions.push({
            icon: Icons.lightbulb,
            title: '// SYSTEMS',
            prediction: 'All systems nominal',
            confidence: 'No actions needed',
            type: 'success'
          });
        }

        setPredictions(newPredictions.slice(0, 4)); // Max 4 predictions
      } catch (error) {
        console.warn('Failed to generate predictions:', error);
        setPredictions([{
          icon: Icons.lightbulb,
          title: '// STATUS',
          prediction: 'Prediction engine offline',
          type: 'info'
        }]);
      } finally {
        setLoading(false);
      }
    }

    generatePredictions();
    const interval = setInterval(generatePredictions, 5 * 60 * 1000); // Refresh every 5 mins
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-purple-500/20">
        <div className="text-xs text-slate-500 font-mono text-center py-2">
          Analyzing patterns...
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-purple-500/20 card-alive">
      <div className="space-y-2">
        <div className="text-xs text-purple-400 font-mono header-glow">// PREDICTIONS</div>
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {predictions.map((pred, i) => (
              <PredictionCard 
                key={`${pred.title}-${pred.prediction}`} // Use content-based key for better animations
                {...pred} 
                index={i}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </Card>
  );
}

export default PredictiveCards;
