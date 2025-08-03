import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import AppDebug from './App-debug.tsx'
import './index.css'

// Use debug mode if URL contains ?debug=true or if no environment variables are set
const isDebugMode = window.location.search.includes('debug=true') || 
  (!import.meta.env.VITE_SUPABASE_URL && import.meta.env.PROD);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isDebugMode ? <AppDebug /> : <App />}
  </React.StrictMode>,
)