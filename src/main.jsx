import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Amplify is configured in src/lib/data.js when first used

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
