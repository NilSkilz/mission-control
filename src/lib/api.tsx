// Mission Control API Client
// Handles communication with the backend Home Assistant API

import { useState, useEffect } from 'react'

const API_BASE = `${import.meta.env.VITE_API_URL || ''}/api/ha`

class APIClient {
  constructor() {
    this.baseURL = API_BASE
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }

      return data
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error)
      throw error
    }
  }

  // GET /api/ha/stats - Temperature, climate, power usage
  async getStats() {
    return this.request('/stats')
  }

  // GET /api/ha/tesla - Timmy status (charge, sentry, etc.)
  async getTesla() {
    return this.request('/tesla')
  }

  // GET /api/ha/devices - Device status (lights, switches, sensors)
  async getDevices() {
    return this.request('/devices')
  }

  // GET /api/ha/weather - Local weather from HA
  async getWeather() {
    return this.request('/weather')
  }

  // GET /api/ha/status - Overall HA connection status
  async getStatus() {
    return this.request('/status')
  }
}

// Create singleton instance
export const api = new APIClient()

// React hook for API calls with loading states
export function useApiCall(apiMethod, dependencies = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await apiMethod()
        if (mounted) {
          setData(result)
        }
      } catch (err) {
        if (mounted) {
          setError(err.message)
          console.error('API Hook Error:', err)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      mounted = false
    }
  }, dependencies)

  const refetch = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiMethod()
      setData(result)
    } catch (err) {
      setError(err.message)
      console.error('API Refetch Error:', err)
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, refetch }
}

// Helper function to check if backend is available
export async function checkBackendHealth() {
  try {
    const response = await fetch('/health')
    return response.ok
  } catch (error) {
    console.warn('Backend health check failed:', error)
    return false
  }
}

// Error boundary helper for API components
export function withApiErrorHandling(Component, fallback = null) {
  return function WrappedComponent(props) {
    try {
      return Component(props)
    } catch (error) {
      console.error('Component Error:', error)
      return fallback || null
    }
  }
}

export default api