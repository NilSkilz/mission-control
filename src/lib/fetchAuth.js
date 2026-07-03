// Global fetch interceptor: attaches the family auth token to same-origin /api
// requests so every caller (the Tide data layer, the legacy /system pages, the
// old lib/api client) is authenticated without each needing to know about auth.
// The Plex art proxy and the public auth endpoints are left alone.

const TOKEN_KEY = 'mission-control-token'
const PUBLIC = ['/api/auth/login', '/api/auth/users', '/api/media/cinema/image']

if (typeof window !== 'undefined' && !window.__mcFetchPatched) {
  window.__mcFetchPatched = true
  const nativeFetch = window.fetch.bind(window)

  window.fetch = (input, init = {}) => {
    let url = typeof input === 'string' ? input : input?.url || ''
    const isApi = url.includes('/api/') && PUBLIC.every((p) => !url.includes(p))
    const token = localStorage.getItem(TOKEN_KEY)

    if (isApi && token) {
      const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined) || {})
      if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
      init = { ...init, headers }
    }

    return nativeFetch(input, init).then((res) => {
      if (res.status === 401 && isApi && window.location.pathname !== '/login') {
        localStorage.removeItem(TOKEN_KEY)
        window.location.href = '/login'
      }
      return res
    })
  }
}
