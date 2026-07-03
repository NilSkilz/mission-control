import React from 'react'
import ReactDOM from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import outputs from '../amplify_outputs.json'
import App from './App'
import './index.css'

// Configure Amplify at startup. A stub amplify_outputs.json ({}) is valid for
// self-hosted deployments without the AWS backend; family data falls back to mocks.
try {
  Amplify.configure(outputs)
} catch (e) {
  console.warn('Amplify not configured, family data disabled:', e.message)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
