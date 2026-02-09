import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import NodeCache from 'node-cache'
import { config } from 'dotenv'
import { homeAssistantRoutes } from './routes/homeAssistant.js'

// Load environment variables
config()

const app = express()
const PORT = process.env.API_PORT || 3001

// Cache instance with TTL
const cache = new NodeCache({ 
  stdTTL: parseInt(process.env.CACHE_TTL_SECONDS) || 45,
  checkperiod: 10
})

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow for development
  crossOriginEmbedderPolicy: false
}))

// CORS configuration for development
app.use(cors({
  origin: ['http://localhost:3002', 'http://127.0.0.1:3002'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    resetTime: new Date(Date.now() + (parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000))
  },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use(limiter)

// JSON parsing
app.use(express.json())

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    cache: {
      keys: cache.keys().length,
      stats: cache.getStats()
    }
  })
})

// Cache middleware
const cacheMiddleware = (duration = 45) => {
  return (req, res, next) => {
    const key = req.originalUrl || req.url
    const cachedResponse = cache.get(key)
    
    if (cachedResponse) {
      console.log(`Cache hit for ${key}`)
      return res.json({
        ...cachedResponse,
        _cached: true,
        _cachedAt: new Date(cache.getTtl(key) - (duration * 1000)).toISOString()
      })
    }
    
    // Override res.json to cache the response
    const originalJson = res.json
    res.json = function(body) {
      if (res.statusCode === 200 && body && !body.error) {
        cache.set(key, body, duration)
        console.log(`Cached response for ${key}`)
      }
      originalJson.call(this, body)
    }
    
    next()
  }
}

// Home Assistant API routes
app.use('/api/ha', cacheMiddleware(), homeAssistantRoutes)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err)
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  })
})

// Start server
app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Mission Control API server running on http://127.0.0.1:${PORT}`)
  console.log(`📊 Health check: http://127.0.0.1:${PORT}/health`)
  console.log(`🏠 Home Assistant endpoints: http://127.0.0.1:${PORT}/api/ha/*`)
  console.log(`⚡ Cache TTL: ${process.env.CACHE_TTL_SECONDS || 45}s`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...')
  cache.flushAll()
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...')
  cache.flushAll()
  process.exit(0)
})