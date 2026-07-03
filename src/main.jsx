import React from 'react'
import ReactDOM from 'react-dom/client'
import './lib/fetchAuth' // patch fetch to attach the auth token before anything runs
import App from './App'
import './index.css'
import './tide/tide.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
